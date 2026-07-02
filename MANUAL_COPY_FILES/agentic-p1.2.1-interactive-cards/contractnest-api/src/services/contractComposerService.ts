// ============================================================================
// Contract Composer Service — VaNi Phase 1.2 (per-step pipeline)
// ============================================================================
// Purpose: intent text → reviewable contract draft, exposed as FIVE stateless
// steps so the VaNi Canvas can show each card the moment its work truly
// completes (no simulated progress — retro rule):
//
//   1. parseIntentOnly   LLM     free text → intent + nomenclature (closed list)
//   2. resolveBuyer      code    contacts lookup → resolved/ambiguous/not_found
//   3. buildShortlist    code    catalog scan → ≤24 ranked candidates
//   4. selectBlocks      LLM     candidates → selection + gap flags
//   5. assembleDraft     code    prices/totals, calendar, assets & coverage,
//                                evidence, readiness → wizard-compatible draft
//
// Stateless between steps: the client carries intent/buyer/candidates/
// selections forward; every step re-validates what it receives. The
// template-match tier (p1.3) will slot between steps 2 and 3.
//
// The composer NEVER writes a contract. Finalization goes through the same
// createContract path the wizard uses (useContractSubmission on the UI).
// ============================================================================

import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import { catBlocksService } from './catBlocksService';
import { catTemplatesService } from './catTemplatesService';
import ContactService from './contactService';
import ProductMasterdataService from './productMasterdataService';
import resourcesService from './resourcesService';
import { clientAssetRegistryService } from './clientAssetRegistryService';
import vaniInteractionLogger from './vaniInteractionLogger';
import vaniLLMClient from './vaniLLMClient';
import {
  deriveComputedEvents,
  DerivationBlock,
  durationToDays,
} from './contractEventsDerivationService';
import { RequestContext } from '../types/catalogStudioTypes';

// ─── Types ───

export interface ComposerCallContext {
  tenantId: string;
  userId: string;
  userJWT: string;
  environment: string; // 'live' | 'test'
}

export interface ParsedIntent {
  contract_kind: string;
  nomenclature: string;
  buyer_text: string;
  duration: { value: number; unit: 'days' | 'months' | 'years' };
  start_date: string;
  grace_period_days: number;
  acceptance: 'payment' | 'signoff' | 'auto' | '';
  billing: { mode: 'prepaid' | 'emi' | 'per_block'; emi_months: number; cycle: string };
  equipment_hint: string;
  activities: string[];
  special_asks: string[];
}

export interface NomenclatureItem {
  id: string;
  name: string;
  group: string;
}

export interface BuyerResolution {
  status: 'resolved' | 'ambiguous' | 'not_found';
  contact?: { id: string; name: string };
  candidates?: Array<{ id: string; name: string; company_name?: string }>;
}

/** Step 1 result */
export interface ParseStepResult {
  intent: ParsedIntent;
  nomenclatureMatch: NomenclatureItem | null;
  interactionId: string;
}

/** Compact candidate payload carried between steps 3 → 4 → 5 */
export interface CandidatePayload {
  key: string;             // 'B1'...
  block_id: string;
  name: string;
  description: string;
  activity: string;
  cycle_days: number;
  price: number;
  currency: string;
  tax_rate: number;
  form_template_id: string | null;
  equipment: string;
  icon: string;
}

/** Step 3 result */
export interface ShortlistStepResult {
  candidates: CandidatePayload[];
  scannedCount: number;
}

/** Step 4 result */
export interface SelectStepResult {
  selections: Array<{ block_id: string; quantity: number; reason: string }>;
  gaps: ComposedGap[];
  summary: string;
  interactionId: string;
}

export interface ComposedGap {
  severity: 'warning' | 'info';
  message: string;
}

export interface PrefillBlock {
  id: string;
  name: string;
  description: string;
  icon: string;
  quantity: number;
  cycle: string;
  customCycleDays?: number;
  serviceCycleDays?: number;
  unlimited: boolean;
  price: number;
  currency: string;
  totalPrice: number;
  categoryName: string;
  categoryColor: string;
  categoryId?: string;
  isFlyBy: boolean;
  taxRate?: number;
  taxInclusion?: 'inclusive' | 'exclusive';
  taxes: Array<{ id: string; name: string; rate: number }>;
  config: { showDescription?: boolean; notes?: string };
}

export interface PrefillEquipmentDetail {
  id: string;
  asset_registry_id: string | null;
  added_by_tenant_id: string;
  added_by_role: 'seller' | 'buyer';
  resource_type: 'equipment' | 'entity';
  category_id: string | null;
  category_name: string;
  item_name: string;
  quantity: number;
  make: string;
  model: string;
  serial_number: string;
  condition: string;
  criticality: string;
  location: string;
  purchase_date: string;
  warranty_expiry: string;
  area_sqft: string;
  dimensions: string;
  capacity: string;
  specifications: Record<string, any>;
  notes: string;
}

export interface PrefillCoverageType {
  id: string;
  sub_category: string;
  resource_id: string;
  resource_name: string;
}

export interface StepReadiness {
  id: string;
  label: string;
  ready: boolean;
  note?: string;
}

export interface ComposeResult {
  draft: {
    contractName: string;
    buyerId: string;
    buyerName: string;
    nomenclatureId: string | null;
    nomenclatureName: string | null;
    nomenclatureGroup: string | null;
    acceptanceMethod: 'payment' | 'signoff' | 'auto';
    startDate?: string;
    durationValue: number;
    durationUnit: string;
    gracePeriodValue: number;
    gracePeriodUnit: string;
    currency: string;
    paymentMode: 'prepaid' | 'emi' | 'defined';
    emiMonths: number;
    billingCycleType: 'unified' | 'mixed';
    perBlockPaymentType: Record<string, 'prepaid' | 'postpaid'>;
    selectedBlocks: PrefillBlock[];
    equipmentDetails: PrefillEquipmentDetail[];
    allowBuyerToAdd: boolean;
    coverageTypes: PrefillCoverageType[];
    evidencePolicyType: 'none' | 'upload' | 'smart_form';
    evidenceSelectedForms: Array<{ form_template_id: string; name: string; version: number; category: string; sort_order: number }>;
    description: string;
    // Totals (server-computed so the canvas can finalize without the billing step)
    totalValue: number;
    baseSubtotal: number;
    taxTotal: number;
    grandTotal: number;
    selectedTaxRateIds: string[];
    taxBreakdown: Array<{ tax_rate_id: string; name: string; rate: number; amount: number }>;
  };
  vani: {
    summary: string;
    gaps: ComposedGap[];
    blockReasons: Record<string, string>;
  };
  readiness: {
    steps: StepReadiness[];
    readyCount: number;
    totalCount: number;
    needsYou: string[];
  };
  eventsPreview: {
    serviceEvents: number;
    billingEvents: number;
    estimatedTotal: number;
  };
}

const MAX_CANDIDATES = 24;
const MAX_SELECTED_BLOCKS = 8;
const MAX_BLOCK_PAGES = 10;
const VALID_ACTIVITIES = ['pm', 'inspection', 'repair', 'install', 'decommission', 'spare_part'];
const ASSET_GROUPS = new Set(['equipment_maintenance', 'facility_property']);

// ─── Service ───

class ContractComposerService {
  private contactService = new ContactService();
  private masterdataService = new ProductMasterdataService();

  private loadSkill(fileName: string, replacements: Record<string, string>): string {
    const skillPath = path.join(process.cwd(), 'src', 'skills', fileName);
    if (!fs.existsSync(skillPath)) {
      throw new Error(`Skill file not found at: ${skillPath}`);
    }
    let content = fs.readFileSync(skillPath, 'utf-8');
    for (const [token, value] of Object.entries(replacements)) {
      content = content.split(token).join(value);
    }
    return content;
  }

  private toCatalogContext(ctx: ComposerCallContext): RequestContext {
    return {
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      product: 'contractnest',
      isAdmin: false,
      environment: (ctx.environment === 'test' ? 'test' : 'live'),
      accessToken: ctx.userJWT,
    };
  }

  private supabaseRead() {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_KEY;
    if (!url || !key) return null;
    return createClient(url, key);
  }

  // ==========================================================================
  // Nomenclature helpers
  // ==========================================================================

  async fetchNomenclatures(ctx: ComposerCallContext): Promise<NomenclatureItem[]> {
    try {
      const res = await this.masterdataService.getGlobalMasterData(
        'cat_contract_nomenclature',
        true,
        ctx.userJWT
      );
      const items: any[] = Array.isArray(res?.data) ? res.data : [];
      return items
        .map((it) => ({
          id: it.id,
          name: it.form_settings?.short_name || it.display_name || it.sub_cat_name || '',
          group: it.form_settings?.group || '',
        }))
        .filter((n) => n.id && n.name);
    } catch (e: any) {
      console.warn('⚠️ Composer: nomenclature fetch failed:', e.message);
      return [];
    }
  }

  matchNomenclature(text: string, list: NomenclatureItem[]): NomenclatureItem | null {
    if (!text || list.length === 0) return null;
    const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
    const needle = norm(text);
    if (!needle) return null;

    const exact = list.find((n) => norm(n.name) === needle);
    if (exact) return exact;

    const contains = list.find((n) => needle.includes(norm(n.name)) || norm(n.name).includes(needle));
    return contains || null;
  }

  // ==========================================================================
  // STEP 1 — parse intent (LLM)
  // ==========================================================================

  async parseIntentOnly(text: string, ctx: ComposerCallContext): Promise<ParseStepResult> {
    if (!vaniLLMClient.isEnabled()) {
      throw new Error('VaNi LLM is not configured (VANI_LLM_URL)');
    }

    const nomenclatures = await this.fetchNomenclatures(ctx);
    const nomenclatureLines = nomenclatures.length > 0
      ? nomenclatures.map((n) => `- ${n.name} (${n.group})`).join('\n')
      : '- (none available)';

    const systemPrompt = this.loadSkill('vani-intent-parser.md', {
      '{{NOMENCLATURES}}': nomenclatureLines,
      '{{USER_CONTEXT}}': `Today's date: ${new Date().toISOString().slice(0, 10)}.`,
    });

    const { parsed, interactionId } = await vaniInteractionLogger.loggedJSONCall<Partial<ParsedIntent>>(
      {
        tenantId: ctx.tenantId,
        userId: ctx.userId,
        skill: 'contract_composer:intent_parse',
        contextPayload: { input_chars: text.length, nomenclature_options: nomenclatures.length },
      },
      systemPrompt,
      text,
      { maxTokens: 320 }
    );

    const intent = this.normalizeIntent(parsed);
    const nomenclatureMatch =
      this.matchNomenclature(intent.nomenclature, nomenclatures) ||
      this.matchNomenclature(intent.contract_kind, nomenclatures);

    return { intent, nomenclatureMatch, interactionId };
  }

  /** Clamp the LLM's output into a safe, complete ParsedIntent */
  normalizeIntent(raw: Partial<ParsedIntent>): ParsedIntent {
    const durUnit = ['days', 'months', 'years'].includes(raw.duration?.unit as string)
      ? (raw.duration!.unit as 'days' | 'months' | 'years')
      : 'years';
    const durValue = Math.max(1, Math.min(3650, Number(raw.duration?.value) || 1));

    const mode = ['prepaid', 'emi', 'per_block'].includes(raw.billing?.mode as string)
      ? raw.billing!.mode
      : 'prepaid';
    const cycle = ['monthly', 'fortnightly', 'quarterly'].includes(raw.billing?.cycle as string)
      ? raw.billing!.cycle
      : '';

    let activities = (Array.isArray(raw.activities) ? raw.activities : [])
      .filter((a) => VALID_ACTIVITIES.includes(a));
    if (activities.length === 0) activities = ['pm', 'inspection'];

    const startDate = /^\d{4}-\d{2}-\d{2}$/.test(raw.start_date || '') ? raw.start_date! : '';
    const acceptance = ['payment', 'signoff', 'auto'].includes(raw.acceptance as string)
      ? (raw.acceptance as ParsedIntent['acceptance'])
      : '';

    return {
      contract_kind: (raw.contract_kind || 'Service Contract').slice(0, 60),
      nomenclature: (raw.nomenclature || '').slice(0, 60),
      buyer_text: (raw.buyer_text || '').slice(0, 120),
      duration: { value: durValue, unit: durUnit },
      start_date: startDate,
      grace_period_days: Math.max(0, Math.min(365, Number(raw.grace_period_days) || 0)),
      acceptance,
      billing: {
        mode: mode as ParsedIntent['billing']['mode'],
        emi_months: mode === 'emi' ? Math.max(2, Math.min(60, Number(raw.billing?.emi_months) || 12)) : 0,
        cycle: mode === 'per_block' ? (cycle || 'quarterly') : '',
      },
      equipment_hint: (raw.equipment_hint || '').slice(0, 60),
      activities,
      special_asks: (Array.isArray(raw.special_asks) ? raw.special_asks : []).slice(0, 5).map(String),
    };
  }

  // ==========================================================================
  // STEP 2 — resolve buyer (deterministic)
  // ==========================================================================

  async resolveBuyer(buyerText: string, ctx: ComposerCallContext): Promise<BuyerResolution> {
    if (!buyerText.trim()) return { status: 'not_found' };

    const result = await this.contactService.listContacts(
      { search: buyerText.trim(), per_page: 10, status: 'active' },
      ctx.userJWT,
      ctx.tenantId,
      ctx.environment
    );

    const items: any[] = Array.isArray(result?.data) ? result.data : (result?.data?.items || []);
    if (!result?.success || items.length === 0) return { status: 'not_found' };

    const norm = (s: string) => (s || '').toLowerCase().trim();
    const needle = norm(buyerText);
    const exact = items.filter(
      (c) => norm(c.name) === needle || norm(c.company_name) === needle
    );

    const pick = (c: any) => ({ id: c.id, name: c.name || c.company_name || 'Unnamed' });

    if (exact.length === 1) return { status: 'resolved', contact: pick(exact[0]) };
    if (items.length === 1) return { status: 'resolved', contact: pick(items[0]) };

    return {
      status: 'ambiguous',
      candidates: items.slice(0, 5).map((c) => ({
        id: c.id,
        name: c.name || 'Unnamed',
        company_name: c.company_name || undefined,
      })),
    };
  }

  // ==========================================================================
  // STEP 3 — shortlist (deterministic catalog scan + rank)
  // ==========================================================================

  async buildShortlist(intent: ParsedIntent, ctx: ComposerCallContext): Promise<ShortlistStepResult> {
    const allBlocks = await this.fetchTenantBlocks(ctx);
    const equipmentNames = await this.fetchResourceTemplateNames(allBlocks);

    const hintTokens = intent.equipment_hint
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((t) => t.length > 1);

    const activityRank: Record<string, number> = {};
    intent.activities.forEach((a, i) => { activityRank[a] = intent.activities.length - i; });

    const scored = allBlocks
      .map((b) => {
        const activity = b.config?.kt_service_activity || '';
        if (!activity || !intent.activities.includes(activity)) return null;
        if (activity === 'spare_part' && !intent.activities.includes('spare_part')) return null;

        const equipment = equipmentNames.get(b.resource_template_id) || '';
        const haystack = `${b.name} ${equipment}`.toLowerCase();

        let score = (activityRank[activity] || 0) * 10;
        if (hintTokens.length > 0) {
          const hits = hintTokens.filter((t) => haystack.includes(t)).length;
          if (hits === 0 && equipment) score -= 15;
          score += hits * 20;
        }
        if (Number(b.base_price) > 0) score += 5;

        return { block: b, activity, equipment, score };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null)
      .sort((a, b) => b.score - a.score)
      .slice(0, MAX_CANDIDATES);

    if (scored.length === 0) {
      throw new Error(
        'No matching service blocks found in your catalog for this request. ' +
        'Add blocks in Catalog Studio or re-seed from VaNi Seeding first.'
      );
    }

    const candidates: CandidatePayload[] = scored.map((s, i) => ({
      key: `B${i + 1}`,
      block_id: s.block.id,
      name: s.block.name,
      description: s.block.description || '',
      activity: s.activity,
      cycle_days: Number(s.block.config?.serviceCycles?.days) || 0,
      price: Number(s.block.base_price) || 0,
      currency: s.block.currency || 'INR',
      tax_rate: Number(s.block.tax_rate) || 0,
      form_template_id: s.block.form_template_id || null,
      equipment: s.equipment,
      icon: s.block.icon || 'wrench',
    }));

    return { candidates, scannedCount: allBlocks.length };
  }

  // ==========================================================================
  // STEP 4 — select blocks + gaps (LLM over the shortlist)
  // ==========================================================================

  async selectBlocks(
    intent: ParsedIntent,
    nomenclature: NomenclatureItem | null,
    candidates: CandidatePayload[],
    ctx: ComposerCallContext
  ): Promise<SelectStepResult> {
    if (!vaniLLMClient.isEnabled()) {
      throw new Error('VaNi LLM is not configured (VANI_LLM_URL)');
    }
    if (!Array.isArray(candidates) || candidates.length === 0) {
      throw new Error('candidates (from the shortlist step) are required');
    }

    const durationDays = durationToDays(intent.duration.value, intent.duration.unit);
    const candidateLines = candidates
      .map((c) =>
        `${c.key} | ${c.name} | activity:${c.activity} | cycle_days:${c.cycle_days || 'one-time'} | ` +
        `price:${c.price} ${c.currency}${c.equipment ? ` | equipment:${c.equipment}` : ''}`
      )
      .join('\n');

    const templateContext = await this.buildTemplateContext(ctx);

    const systemPrompt = this.loadSkill('vani-block-composer.md', {
      '{{CONTRACT_KIND}}': nomenclature ? `${nomenclature.name} (${nomenclature.group})` : intent.contract_kind,
      '{{DURATION}}': `${intent.duration.value} ${intent.duration.unit}`,
      '{{DURATION_DAYS}}': String(durationDays),
      '{{EQUIPMENT}}': intent.equipment_hint || 'not specified',
      '{{MAX_BLOCKS}}': String(MAX_SELECTED_BLOCKS),
      '{{TEMPLATE_CONTEXT}}': templateContext,
      '{{CANDIDATES}}': candidateLines,
    });

    const userMessage =
      `Compose the contract. Special asks: ${intent.special_asks.join('; ') || 'none'}.`;

    const { parsed, interactionId } = await vaniInteractionLogger.loggedJSONCall<{
      selected?: Array<{ key: string; quantity: number; reason?: string }>;
      gaps?: Array<{ severity?: string; message?: string }>;
      summary?: string;
    }>(
      {
        tenantId: ctx.tenantId,
        userId: ctx.userId,
        skill: 'contract_composer:block_select',
        contextPayload: {
          contract_kind: intent.contract_kind,
          nomenclature: nomenclature?.name || null,
          equipment: intent.equipment_hint,
          activities: intent.activities,
          candidate_count: candidates.length,
        },
      },
      systemPrompt,
      userMessage,
      { maxTokens: 500, timeoutMs: 240000 }
    );

    const byKey = new Map(candidates.map((c) => [c.key.toUpperCase(), c]));
    const selections = (parsed.selected || [])
      .map((s) => {
        const cand = byKey.get(String(s.key).toUpperCase());
        if (!cand) return null;
        const cycleQty = cand.cycle_days
          ? Math.max(1, Math.floor(durationDays / cand.cycle_days))
          : 1;
        const qty = Math.max(1, Math.min(Number(s.quantity) || cycleQty, Math.max(cycleQty, 1)));
        return { block_id: cand.block_id, quantity: qty, reason: (s.reason || '').slice(0, 120) };
      })
      .filter((s): s is NonNullable<typeof s> => s !== null)
      .slice(0, MAX_SELECTED_BLOCKS);

    if (selections.length === 0) {
      throw new Error('VaNi could not compose a block selection for this request — try rephrasing.');
    }

    const gaps: ComposedGap[] = (parsed.gaps || [])
      .filter((g) => g && g.message)
      .slice(0, 6)
      .map((g) => ({
        severity: g.severity === 'warning' ? 'warning' : 'info',
        message: String(g.message).slice(0, 200),
      }));

    return {
      selections,
      gaps,
      summary: (parsed.summary || 'Draft composed from your catalog.').slice(0, 400),
      interactionId,
    };
  }

  // ==========================================================================
  // STEP 5 — assemble the wizard-compatible draft (deterministic)
  // ==========================================================================

  async assembleDraft(
    intent: ParsedIntent,
    buyer: { id: string; name: string } | null,
    candidates: CandidatePayload[],
    selection: Pick<SelectStepResult, 'selections' | 'gaps' | 'summary'>,
    ctx: ComposerCallContext,
    /** Tenant default currency (UI-supplied); contract currency unless blocks force otherwise */
    defaultCurrency?: string
  ): Promise<ComposeResult> {
    // Nomenclature: re-resolve server-side (source of truth)
    const nomenclatures = await this.fetchNomenclatures(ctx);
    const nomenclature =
      this.matchNomenclature(intent.nomenclature, nomenclatures) ||
      this.matchNomenclature(intent.contract_kind, nomenclatures);
    const isAssetGroup = !!nomenclature && ASSET_GROUPS.has(nomenclature.group);

    const durationDays = durationToDays(intent.duration.value, intent.duration.unit);
    const byId = new Map(candidates.map((c) => [c.block_id, c]));

    const perBlock = intent.billing.mode === 'per_block';
    const blockCycle = perBlock ? intent.billing.cycle : 'prepaid';
    const perBlockPaymentType: Record<string, 'prepaid' | 'postpaid'> = {};
    const blockReasons: Record<string, string> = {};

    const selectedBlocks: PrefillBlock[] = selection.selections
      .map((s) => {
        const cand = byId.get(s.block_id);
        if (!cand) return null;
        const cycleQty = cand.cycle_days
          ? Math.max(1, Math.floor(durationDays / cand.cycle_days))
          : 1;
        const qty = Math.max(1, Math.min(Number(s.quantity) || cycleQty, Math.max(cycleQty, 1)));

        if (perBlock) perBlockPaymentType[cand.block_id] = 'postpaid';
        blockReasons[cand.block_id] = s.reason;

        return {
          id: cand.block_id,
          name: cand.name,
          description: cand.description,
          icon: cand.icon,
          quantity: qty,
          cycle: blockCycle,
          serviceCycleDays: cand.cycle_days || undefined,
          unlimited: false,
          price: cand.price,
          currency: cand.currency,
          totalPrice: Math.round(cand.price * qty * 100) / 100,
          categoryName: 'Service',
          categoryColor: '#3B82F6',
          categoryId: 'service',
          isFlyBy: false,
          taxRate: cand.tax_rate,
          taxInclusion: 'exclusive' as const,
          taxes: [],
          config: { showDescription: false, notes: s.reason || undefined },
        };
      })
      .filter((b): b is NonNullable<typeof b> => b !== null);

    if (selectedBlocks.length === 0) {
      throw new Error('Selections did not match the shortlist — rerun the shortlist step.');
    }

    // Contract currency: tenant default wins; block-price currency mismatches
    // are flagged, never silently converted.
    const blockCurrency = selectedBlocks[0]?.currency || 'INR';
    const currency = (defaultCurrency || '').trim().toUpperCase() || blockCurrency;
    const mismatched = Array.from(new Set(
      selectedBlocks.map((b) => b.currency).filter((c) => c && c !== currency)
    ));

    // Totals (server-side, so the canvas review can finalize without the
    // wizard's billing step; taxInclusion is 'exclusive' for catalog prices)
    const baseSubtotal = Math.round(selectedBlocks.reduce((s, b) => s + b.price * b.quantity, 0) * 100) / 100;
    const taxTotal = Math.round(selectedBlocks.reduce(
      (s, b) => s + (b.price * b.quantity * (b.taxRate || 0)) / 100, 0
    ) * 100) / 100;
    const grandTotal = Math.round((baseSubtotal + taxTotal) * 100) / 100;

    // Assets & coverage
    const gaps: ComposedGap[] = [];
    if (mismatched.length > 0) {
      gaps.push({
        severity: 'warning',
        message: `Some blocks are priced in ${mismatched.join('/')} but the contract currency is ${currency} — prices are not converted; review pricing.`,
      });
    }
    let equipmentDetails: PrefillEquipmentDetail[] = [];
    let coverageTypes: PrefillCoverageType[] = [];
    let allowBuyerToAdd = false;

    if (isAssetGroup) {
      const assetInfo = await this.buildAssetPrefill(buyer, nomenclature!, candidates, selection.selections, ctx);
      equipmentDetails = assetInfo.equipmentDetails;
      coverageTypes = assetInfo.coverageTypes;
      allowBuyerToAdd = assetInfo.allowBuyerToAdd;
      gaps.push(...assetInfo.gaps);
    }

    // Evidence proposal
    const selectedCandidates = selection.selections
      .map((s) => byId.get(s.block_id))
      .filter((c): c is CandidatePayload => !!c);
    const evidence = await this.buildEvidenceProposal(selectedCandidates, isAssetGroup);

    // Acceptance
    const acceptanceMethod = intent.acceptance || 'signoff';
    if (!intent.acceptance) {
      gaps.push({
        severity: 'info',
        message: 'Acceptance defaulted to Sign-off (buyer approves) — change it if needed.',
      });
    }

    gaps.push(...selection.gaps);

    // Forward calendar (Phase-0 derivation — parity with wizard)
    const derivationBlocks: DerivationBlock[] = selectedBlocks.map((blk) => ({
      id: blk.id,
      name: blk.name,
      categoryId: 'service',
      quantity: blk.quantity,
      cycle: blk.cycle,
      serviceCycleDays: blk.serviceCycleDays,
      unlimited: false,
      currency: blk.currency,
      totalPrice: blk.totalPrice,
    }));

    const events = deriveComputedEvents({
      startDate: intent.start_date ? new Date(intent.start_date) : new Date(),
      durationValue: intent.duration.value,
      durationUnit: intent.duration.unit,
      selectedBlocks: derivationBlocks,
      paymentMode: intent.billing.mode === 'per_block' ? 'defined' : intent.billing.mode,
      emiMonths: intent.billing.emi_months,
      perBlockPaymentType,
      billingCycleType: perBlock ? 'mixed' : 'unified',
      grandTotal,
      currency,
    }) || [];

    const readiness = this.buildReadiness({
      nomenclature,
      buyerResolved: !!buyer,
      isAssetGroup,
      coverageCount: coverageTypes.length,
      blocksCount: selectedBlocks.length,
      acceptanceDefaulted: !intent.acceptance,
      evidenceType: evidence.evidencePolicyType,
    });

    const durText = `${intent.duration.value} ${intent.duration.unit === 'years' && intent.duration.value === 1 ? 'Year' : intent.duration.unit}`;
    const kindLabel = nomenclature?.name || intent.contract_kind;
    const buyerLabel = buyer?.name || intent.buyer_text || 'New Client';

    return {
      draft: {
        contractName: `${kindLabel} — ${buyerLabel} — ${durText}`,
        buyerId: buyer?.id || '',
        buyerName: buyer?.name || '',
        nomenclatureId: nomenclature?.id || null,
        nomenclatureName: nomenclature?.name || null,
        nomenclatureGroup: nomenclature?.group || null,
        acceptanceMethod,
        startDate: intent.start_date || undefined,
        durationValue: intent.duration.value,
        durationUnit: intent.duration.unit,
        gracePeriodValue: intent.grace_period_days,
        gracePeriodUnit: 'days',
        currency,
        paymentMode: intent.billing.mode === 'per_block' ? 'defined' : intent.billing.mode,
        emiMonths: intent.billing.emi_months,
        billingCycleType: perBlock ? 'mixed' : 'unified',
        perBlockPaymentType,
        selectedBlocks,
        equipmentDetails,
        allowBuyerToAdd,
        coverageTypes,
        evidencePolicyType: evidence.evidencePolicyType,
        evidenceSelectedForms: evidence.forms,
        description: selection.summary,
        totalValue: baseSubtotal,
        baseSubtotal,
        taxTotal,
        grandTotal,
        selectedTaxRateIds: [],
        taxBreakdown: [],
      },
      vani: {
        summary: selection.summary,
        gaps,
        blockReasons,
      },
      readiness,
      eventsPreview: {
        serviceEvents: events.filter((e) => e.event_type === 'service').length,
        billingEvents: events.filter((e) => e.event_type === 'billing').length,
        estimatedTotal: grandTotal,
      },
    };
  }

  // ==========================================================================
  // Feedback passthrough
  // ==========================================================================

  recordFeedback(
    interactionIds: string[],
    feedback: { wasAccepted?: boolean; wasEdited?: boolean; userRating?: number }
  ): void {
    for (const id of interactionIds) {
      if (id) vaniInteractionLogger.recordFeedback(id, feedback);
    }
  }

  // ==========================================================================
  // Internals
  // ==========================================================================

  private async buildAssetPrefill(
    buyer: { id: string; name: string } | null,
    nomenclature: NomenclatureItem,
    candidates: CandidatePayload[],
    selections: Array<{ block_id: string }>,
    ctx: ComposerCallContext
  ): Promise<{
    equipmentDetails: PrefillEquipmentDetail[];
    coverageTypes: PrefillCoverageType[];
    allowBuyerToAdd: boolean;
    gaps: ComposedGap[];
  }> {
    const gaps: ComposedGap[] = [];
    const isFacility = nomenclature.group === 'facility_property';
    const resourceTypeId = isFacility ? 'asset' : 'equipment';
    const authHeader = `Bearer ${ctx.userJWT}`;

    let resources: any[] = [];
    try {
      resources = await resourcesService.getAllResources(authHeader, ctx.tenantId);
      resources = resources.filter((r: any) => r.resource_type_id === resourceTypeId && r.is_active !== false);
    } catch (e: any) {
      console.warn('⚠️ Composer: resources fetch failed:', e.message);
    }

    let assets: any[] = [];
    if (buyer) {
      try {
        const res = await clientAssetRegistryService.listAssets(authHeader, ctx.tenantId, {
          contact_id: buyer.id,
          resource_type_id: resourceTypeId,
          limit: 200,
        });
        assets = Array.isArray(res?.data) ? res.data : (res?.data?.items || []);
      } catch (e: any) {
        console.warn('⚠️ Composer: client assets fetch failed:', e.message);
      }
    }

    const coverageMap = new Map<string, PrefillCoverageType>();
    const addCoverage = (r: any) => {
      if (r && !coverageMap.has(r.id)) {
        coverageMap.set(r.id, {
          id: r.id,
          sub_category: r.sub_category || '',
          resource_id: r.id,
          resource_name: r.display_name || r.name || 'Resource',
        });
      }
    };
    for (const asset of assets) {
      addCoverage(resources.find((r: any) => r.id === asset.asset_type_id));
    }

    const norm = (s: string) => (s || '').toLowerCase();
    const selectedIds = new Set(selections.map((s) => s.block_id));
    const equipmentNames = Array.from(new Set(
      candidates.filter((c) => selectedIds.has(c.block_id)).map((c) => c.equipment).filter(Boolean)
    ));
    for (const eq of equipmentNames) {
      const eqTokens = norm(eq).split(/[^a-z0-9]+/).filter((t) => t.length > 2);
      const match = resources.find((r: any) => {
        const hay = norm(`${r.name} ${r.display_name}`);
        return eqTokens.some((t) => hay.includes(t));
      });
      addCoverage(match);
    }

    const equipmentDetails: PrefillEquipmentDetail[] = assets.slice(0, 50).map((a: any) => ({
      id: a.id,
      asset_registry_id: a.id,
      added_by_tenant_id: ctx.tenantId,
      added_by_role: 'seller' as const,
      resource_type: isFacility ? ('entity' as const) : ('equipment' as const),
      category_id: a.asset_type_id || null,
      category_name: resources.find((r: any) => r.id === a.asset_type_id)?.display_name || '',
      item_name: a.name || 'Asset',
      quantity: 1,
      make: a.make || '',
      model: a.model || '',
      serial_number: a.serial_number || '',
      condition: a.condition || '',
      criticality: a.criticality || '',
      location: typeof a.location === 'string' ? a.location : '',
      purchase_date: a.purchase_date || '',
      warranty_expiry: a.warranty_expiry || '',
      area_sqft: a.area_sqft ? String(a.area_sqft) : '',
      dimensions: a.dimensions ? String(a.dimensions) : '',
      capacity: a.capacity ? String(a.capacity) : '',
      specifications: a.specifications || {},
      notes: '',
    }));

    let allowBuyerToAdd = false;
    if (buyer && assets.length === 0) {
      allowBuyerToAdd = true;
      gaps.push({
        severity: 'warning',
        message: `${buyer.name} has no registered ${isFacility ? 'facility assets' : 'equipment'} — 'buyer can add equipment' was enabled. Register their assets for precise coverage.`,
      });
    }
    if (coverageMap.size === 0) {
      gaps.push({
        severity: 'warning',
        message: 'No coverage types could be derived — pick at least one in the Assets step (it is required).',
      });
    }

    return {
      equipmentDetails,
      coverageTypes: Array.from(coverageMap.values()),
      allowBuyerToAdd,
      gaps,
    };
  }

  private async buildEvidenceProposal(
    selectedCandidates: CandidatePayload[],
    isAssetGroup: boolean
  ): Promise<{
    evidencePolicyType: 'none' | 'upload' | 'smart_form';
    forms: Array<{ form_template_id: string; name: string; version: number; category: string; sort_order: number }>;
  }> {
    const formIds = Array.from(new Set(
      selectedCandidates.map((c) => c.form_template_id).filter((id): id is string => !!id)
    ));

    if (formIds.length > 0) {
      try {
        const supabase = this.supabaseRead();
        if (supabase) {
          const { data, error } = await supabase
            .from('m_form_templates')
            .select('id, name, category, version')
            .in('id', formIds);
          if (!error && data && data.length > 0) {
            return {
              evidencePolicyType: 'smart_form',
              forms: data.map((f: any, i: number) => ({
                form_template_id: f.id,
                name: f.name || 'Checklist',
                version: Number(f.version) || 1,
                category: f.category || '',
                sort_order: i,
              })),
            };
          }
        }
      } catch (e: any) {
        console.warn('⚠️ Composer: form template lookup failed:', e.message);
      }
    }

    return { evidencePolicyType: isAssetGroup ? 'upload' : 'none', forms: [] };
  }

  private buildReadiness(input: {
    nomenclature: NomenclatureItem | null;
    buyerResolved: boolean;
    isAssetGroup: boolean;
    coverageCount: number;
    blocksCount: number;
    acceptanceDefaulted: boolean;
    evidenceType: string;
  }): ComposeResult['readiness'] {
    const steps: StepReadiness[] = [
      { id: 'path', label: 'Path', ready: true },
      {
        id: 'nomenclature', label: 'Contract Type',
        ready: !!input.nomenclature,
        note: input.nomenclature ? input.nomenclature.name : 'Pick the contract type',
      },
      {
        id: 'acceptance', label: 'Acceptance',
        ready: true,
        note: input.acceptanceDefaulted ? 'Defaulted to Sign-off' : undefined,
      },
      {
        id: 'counterparty', label: 'Buyer',
        ready: input.buyerResolved,
        note: input.buyerResolved ? undefined : 'Select or create the buyer',
      },
      { id: 'details', label: 'Details', ready: true },
      ...(input.isAssetGroup
        ? [{
            id: 'assetSelection', label: 'Assets & Coverage',
            ready: input.coverageCount > 0,
            note: input.coverageCount > 0
              ? `${input.coverageCount} coverage type(s)`
              : 'Pick at least one coverage type (required)',
          }]
        : []),
      { id: 'billingCycle', label: 'Billing Cycle', ready: true },
      { id: 'blocks', label: 'Service Blocks', ready: input.blocksCount > 0 },
      { id: 'billingView', label: 'Billing View', ready: true },
      {
        id: 'evidencePolicy', label: 'Evidence',
        ready: true,
        note: input.evidenceType === 'smart_form' ? 'Smart forms proposed' : undefined,
      },
      { id: 'events', label: 'Events Preview', ready: true },
      { id: 'review', label: 'Review & Send', ready: true },
    ];

    const needsYou = steps.filter((s) => !s.ready).map((s) => s.note || s.label);
    return {
      steps,
      readyCount: steps.filter((s) => s.ready).length,
      totalCount: steps.length,
      needsYou,
    };
  }

  private async fetchTenantBlocks(ctx: ComposerCallContext): Promise<any[]> {
    const catalogCtx = this.toCatalogContext(ctx);
    const blocks: any[] = [];

    for (let page = 1; page <= MAX_BLOCK_PAGES; page++) {
      const res = await catBlocksService.listBlocks(catalogCtx, {
        is_active: true,
        page,
        limit: 100,
      } as any);
      if (!res.success || !res.data) break;

      const pageBlocks: any[] = (res.data as any).blocks || [];
      blocks.push(...pageBlocks);

      const total = (res.data as any).total ?? blocks.length;
      if (blocks.length >= total || pageBlocks.length === 0) break;
    }
    return blocks;
  }

  private async fetchResourceTemplateNames(blocks: any[]): Promise<Map<string, string>> {
    const map = new Map<string, string>();
    const ids = Array.from(
      new Set(blocks.map((b) => b.resource_template_id).filter(Boolean))
    );
    if (ids.length === 0) return map;

    try {
      const supabase = this.supabaseRead();
      if (!supabase) return map;
      const { data, error } = await supabase
        .from('m_catalog_resource_templates')
        .select('id, name')
        .in('id', ids);
      if (!error && data) {
        for (const row of data) map.set(row.id, row.name);
      }
    } catch (e: any) {
      console.warn('⚠️ Composer: resource template lookup failed (ranking degrades):', e.message);
    }
    return map;
  }

  private async buildTemplateContext(ctx: ComposerCallContext): Promise<string> {
    try {
      const res = await catTemplatesService.listTemplates(this.toCatalogContext(ctx), {
        is_active: true,
        limit: 10,
      } as any);
      const templates: any[] = (res.data as any)?.templates || [];
      if (templates.length === 0) {
        return 'Seller templates: none saved yet (cold start — compose from candidates alone).';
      }
      return (
        'Seller templates (names only, for context):\n' +
        templates.map((t) => `- ${t.name}`).join('\n')
      );
    } catch {
      return 'Seller templates: unavailable.';
    }
  }
}

export const contractComposerService = new ContractComposerService();
export default contractComposerService;
