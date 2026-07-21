// src/pages/contacts/import/contactsAdapter.ts
// Contacts adapter for the Import wizard — pure logic only (parsing, column
// mapping suggestions, row validation, payload building). The wizard shell in
// index.tsx is entity-agnostic; future imports (blocks, contracts, …) supply
// their own adapter with the same shape.

import type { Industry } from '@/services/serviceURLs';
import { getChannelByCode, formatChannelValue } from '@/utils/constants/channels';

// ============================================================================
// TYPES
// ============================================================================

export interface ParsedSheet {
  headers: string[];
  rows: string[][]; // data rows (header row excluded), all values stringified
}

export type TargetFieldKey =
  | 'name'
  | 'mobile'
  | 'email'
  | 'company_name'
  | 'designation'
  | 'category'
  | 'tags'
  | 'member_id'
  | 'reference'
  | 'ignore';

export interface TargetField {
  key: TargetFieldKey;
  label: string;
  required?: boolean;
  hint: string;
}

export const TARGET_FIELDS: TargetField[] = [
  { key: 'name', label: 'Name', required: true, hint: 'Contact full name' },
  { key: 'mobile', label: 'Mobile', hint: 'Phone number(s) — multiple separated by / or ,' },
  { key: 'email', label: 'Email', hint: 'Email address' },
  { key: 'company_name', label: 'Business Name', hint: 'Company / business name' },
  { key: 'designation', label: 'Designation', hint: 'Role or title (e.g. President, Member)' },
  { key: 'category', label: 'Category → Industry', hint: 'Business category, mapped to industries' },
  { key: 'tags', label: 'Tags', hint: 'Tag name(s) — multiple separated by / or ,' },
  { key: 'member_id', label: 'Member ID', hint: 'External member ID from the source system — stored on the contact, shown on the profile' },
  { key: 'reference', label: 'Reference Id', hint: 'External id, stored in notes' },
  { key: 'ignore', label: 'Ignore', hint: 'Skip this column' },
];

export interface ImportRow {
  index: number;
  raw: string[];
  name: string;
  mobiles: string[];
  email: string;
  companyName: string;
  designation: string;
  category: string;
  tags: string[];
  memberId: string;
  reference: string;
  errors: string[];
  include: boolean;
}

export interface BatchSettings {
  classifications: string[];
  tags: { tag_value: string; tag_label: string; tag_color?: string }[];
  skipDuplicates: boolean;
}

// ============================================================================
// SPREADSHEET PARSING (xlsx handles both .xlsx and .csv)
// ============================================================================

export async function parseSpreadsheet(file: File): Promise<ParsedSheet> {
  const XLSX = await import('xlsx');
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) throw new Error('The file contains no sheets.');

  const grid: any[][] = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
    header: 1,
    defval: '',
    blankrows: false,
  });
  if (grid.length === 0) throw new Error('The sheet is empty.');

  // Header detection: within the first 10 rows, pick the row with the most
  // non-empty text cells (handles title rows above the real header, e.g. the
  // BBB sheet where row 1 is a banner and row 2 is the header).
  let headerIdx = 0;
  let bestScore = -1;
  const scanLimit = Math.min(grid.length, 10);
  for (let i = 0; i < scanLimit; i++) {
    const score = grid[i].filter(
      (c) => typeof c === 'string' ? c.trim().length > 0 : c !== null && c !== ''
    ).length;
    if (score > bestScore) {
      bestScore = score;
      headerIdx = i;
    }
  }

  const headers = grid[headerIdx].map((h) => String(h ?? '').trim());
  const rows = grid
    .slice(headerIdx + 1)
    .map((r) => headers.map((_, ci) => String(r[ci] ?? '').trim()))
    .filter((r) => r.some((c) => c.length > 0));

  return { headers, rows };
}

// ============================================================================
// COLUMN MAPPING SUGGESTIONS
// ============================================================================

const HEADER_PATTERNS: Array<{ field: TargetFieldKey; patterns: RegExp[] }> = [
  { field: 'name', patterns: [/member\s*name/i, /full\s*name/i, /^name$/i, /contact\s*name/i] },
  { field: 'mobile', patterns: [/mobile/i, /phone/i, /^contact$/i, /whatsapp/i, /cell/i] },
  { field: 'email', patterns: [/e-?mail/i] },
  { field: 'company_name', patterns: [/company/i, /business\s*name/i, /firm/i, /organi[sz]ation/i] },
  { field: 'designation', patterns: [/designation/i, /^role$/i, /title/i, /position/i] },
  { field: 'category', patterns: [/category/i, /industry/i, /business\s*type/i, /segment/i] },
  { field: 'tags', patterns: [/^tags?$/i, /labels?/i] },
  { field: 'member_id', patterns: [/member\s*id/i] },
  { field: 'reference', patterns: [/\bid\b/i, /reference/i, /reg\s*no/i, /code/i] },
];

/** Suggest a target field per column header; unmatched columns -> 'ignore'. */
export function suggestMapping(headers: string[]): TargetFieldKey[] {
  const used = new Set<TargetFieldKey>();
  return headers.map((header) => {
    const h = header.trim();
    if (!h) return 'ignore';
    for (const { field, patterns } of HEADER_PATTERNS) {
      // mobile/email/tags allow multiple columns; single-value fields map once
      const reusable = field === 'mobile' || field === 'email' || field === 'tags';
      if (!reusable && used.has(field)) continue;
      if (patterns.some((p) => p.test(h))) {
        used.add(field);
        return field;
      }
    }
    return 'ignore';
  });
}

// ============================================================================
// PHONE PARSING
// ============================================================================

/**
 * Split a raw phone cell into clean 10-digit Indian mobile numbers.
 * Handles "8639392699 / 9949700611", newlines, +91 prefixes, leading zeros.
 */
export function splitPhones(raw: string): string[] {
  if (!raw) return [];
  return raw
    .split(/[\/,;|\n]+/)
    .map((part) => {
      let digits = part.replace(/\D/g, '');
      if (digits.length === 12 && digits.startsWith('91')) digits = digits.slice(2);
      if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1);
      return digits;
    })
    .filter((d) => d.length > 0);
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Split a multi-value cell (tags, …) on the common separators. */
export function splitList(raw: string): string[] {
  if (!raw) return [];
  return raw
    .split(/[\/,;|\n]+/)
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}

// ============================================================================
// ROW EXTRACTION + VALIDATION
// ============================================================================

export function extractRows(sheet: ParsedSheet, mapping: TargetFieldKey[]): ImportRow[] {
  const col = (field: TargetFieldKey): number[] =>
    mapping.reduce<number[]>((acc, m, i) => (m === field ? [...acc, i] : acc), []);

  const nameCols = col('name');
  const mobileCols = col('mobile');
  const emailCols = col('email');
  const companyCols = col('company_name');
  const designationCols = col('designation');
  const categoryCols = col('category');
  const tagCols = col('tags');
  const memberIdCols = col('member_id');
  const referenceCols = col('reference');

  const firstValue = (row: string[], cols: number[]): string => {
    for (const c of cols) if (row[c]) return row[c];
    return '';
  };

  return sheet.rows.map((raw, index) => {
    const name = firstValue(raw, nameCols);
    const mobiles = mobileCols.flatMap((c) => splitPhones(raw[c] || ''));
    const email = firstValue(raw, emailCols);
    const companyName = firstValue(raw, companyCols);
    const designation = firstValue(raw, designationCols);
    const category = firstValue(raw, categoryCols);
    const tags = Array.from(new Set(
      tagCols.flatMap((c) => splitList(raw[c] || ''))
    ));
    const memberId = firstValue(raw, memberIdCols);
    const reference = firstValue(raw, referenceCols);

    const errors: string[] = [];
    if (!name) errors.push('Name is missing');
    const invalidPhones = mobiles.filter((m) => m.length !== 10);
    if (invalidPhones.length > 0) errors.push(`Invalid phone: ${invalidPhones.join(', ')}`);
    if (mobiles.length === 0 && !email) errors.push('Needs at least a mobile or email');
    if (email && !EMAIL_REGEX.test(email)) errors.push(`Invalid email: ${email}`);

    return {
      index,
      raw,
      name,
      mobiles: mobiles.filter((m) => m.length === 10),
      email: email && EMAIL_REGEX.test(email) ? email : '',
      companyName,
      designation,
      category,
      tags,
      memberId,
      reference,
      errors,
      include: errors.length === 0,
    };
  });
}

// ============================================================================
// CATEGORY -> INDUSTRY SUGGESTION
// ============================================================================

const STOP_WORDS = new Set(['and', 'the', 'of', 'for', 'with', 'services', 'service', 'products', 'other']);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 2 && !STOP_WORDS.has(t));
}

/**
 * Suggest the best-matching sub-industry (level 1, or childless parent) for a
 * free-text category. Returns the industry id or null when nothing scores.
 */
export function suggestIndustry(category: string, industries: Industry[]): string | null {
  const catTokens = tokenize(category);
  if (catTokens.length === 0) return null;

  // Candidates: sub-industries plus parents that have no children
  const parentIds = new Set(industries.filter((i) => i.parent_id).map((i) => i.parent_id));
  const candidates = industries.filter(
    (i) => (i.level === 1 || (i.level === 0 && !parentIds.has(i.id)))
  );

  let best: { id: string; score: number } | null = null;
  for (const industry of candidates) {
    const nameTokens = new Set([
      ...tokenize(industry.name),
      ...tokenize(industry.description || ''),
    ]);
    const score = catTokens.filter((t) =>
      Array.from(nameTokens).some((n) => n.includes(t) || t.includes(n))
    ).length;
    if (score > 0 && (!best || score > best.score)) {
      best = { id: industry.id, score };
    }
  }
  return best?.id || null;
}

// ============================================================================
// PAYLOAD BUILDING
// ============================================================================

export interface TagCatalogEntry {
  value: string;
  label: string;
  color?: string;
}

/**
 * Resolve row-level tag names against the tenant's Tags LOV (case-insensitive
 * on value or label). Unmatched names still import as free-text tags. Merged
 * with the batch-level tags, deduped by tag_value.
 */
export function resolveRowTags(
  rowTags: string[],
  batchTags: BatchSettings['tags'],
  catalog: TagCatalogEntry[]
): BatchSettings['tags'] {
  const merged = [...batchTags];
  const seen = new Set(batchTags.map((t) => t.tag_value.toLowerCase()));
  for (const raw of rowTags) {
    const match = catalog.find(
      (c) =>
        c.value.toLowerCase() === raw.toLowerCase() ||
        c.label.toLowerCase() === raw.toLowerCase()
    );
    const tag = match
      ? { tag_value: match.value, tag_label: match.label, tag_color: match.color || undefined }
      : { tag_value: raw, tag_label: raw };
    if (!seen.has(tag.tag_value.toLowerCase())) {
      seen.add(tag.tag_value.toLowerCase());
      merged.push(tag);
    }
  }
  return merged;
}

/** Build the create-contact API payload for one validated row. */
export function buildContactPayload(
  row: ImportRow,
  batch: BatchSettings,
  categoryIndustryMap: Record<string, string | null>,
  tagCatalog: TagCatalogEntry[] = []
) {
  const industryId = row.category ? categoryIndustryMap[row.category] : null;

  const mobileChannel = getChannelByCode('mobile');
  const channels: any[] = row.mobiles.map((m, idx) => ({
    channel_type: 'mobile',
    value: mobileChannel ? formatChannelValue(mobileChannel, m, 'IN') : m,
    country_code: 'IN',
    is_primary: idx === 0,
  }));
  if (row.email) {
    channels.push({
      channel_type: 'email',
      value: row.email,
      country_code: undefined,
      is_primary: channels.length === 0,
    });
  }

  const noteParts: string[] = [];
  if (row.reference) noteParts.push(`Reference Id: ${row.reference}`);
  if (row.category && !industryId) noteParts.push(`Category (unmapped): ${row.category}`);

  return {
    type: 'individual' as const,
    status: 'active' as const,
    classifications: batch.classifications,
    name: row.name,
    company_name: row.companyName || undefined,
    designation: row.designation || undefined,
    contact_channels: channels,
    addresses: [],
    compliance_numbers: [],
    contact_persons: [],
    tags: resolveRowTags(row.tags, batch.tags, tagCatalog),
    industries: industryId ? [industryId] : [],
    notes: noteParts.length > 0 ? noteParts.join('\n') : undefined,
    external_data: row.memberId ? { member_id: row.memberId } : undefined,
  };
}

/** Chunk an array for batched API calls (import endpoint caps at 25/request). */
export function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}
