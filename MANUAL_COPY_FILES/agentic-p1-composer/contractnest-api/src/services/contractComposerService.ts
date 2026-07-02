// ============================================================================
// Contract Composer Service — VaNi Phase 1
// ============================================================================
// Purpose: intent text → reviewable contract draft (wizard-prefill payload).
//
// Pipeline (POA §Phase 1 — deterministic core, agentic edge):
//   1. PARSE      LLM: free text → structured intent            (logged)
//   2. RESOLVE    deterministic: buyer via contactService; ambiguity → candidates
//   3. SHORTLIST  deterministic: tenant's m_cat_blocks filtered by activity,
//                 ranked by equipment match — no LLM sees the full catalog
//   4. REASON     LLM: select blocks + flag gaps over ~24 candidates (logged)
//   5. ASSEMBLE   deterministic: prices, quantities, forward calendar
//                 (contractEventsDerivationService), wizard-prefill payload
//
// The composer NEVER writes a contract. It returns a draft the user reviews
// in the existing ContractWizard; the existing create path does the writing.
// Every LLM call is logged to vn_interaction_log; the UI reports
// was_edited / was_accepted feedback via /feedback.
// ============================================================================

import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import { catBlocksService } from './catBlocksService';
import { catTemplatesService } from './catTemplatesService';
import ContactService from './contactService';
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
  buyer_text: string;
  duration: { value: number; unit: 'days' | 'months' | 'years' };
  billing: { mode: 'prepaid' | 'emi' | 'per_block'; emi_months: number; cycle: string };
  equipment_hint: string;
  activities: string[];
  special_asks: string[];
}

export interface BuyerResolution {
  status: 'resolved' | 'ambiguous' | 'not_found';
  contact?: { id: string; name: string };
  candidates?: Array<{ id: string; name: string; company_name?: string }>;
}

export interface ParseIntentResult {
  intent: ParsedIntent;
  buyer: BuyerResolution;
  interactionId: string;
}

export interface ComposedGap {
  severity: 'warning' | 'info';
  message: string;
}

/** Mirrors the UI's ConfigurableBlock shape (BlockCardConfigurable.tsx) */
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

export interface ComposeResult {
  draft: {
    contractName: string;
    buyerId: string;
    buyerName: string;
    durationValue: number;
    durationUnit: string;
    currency: string;
    paymentMode: 'prepaid' | 'emi' | 'defined';
    emiMonths: number;
    billingCycleType: 'unified' | 'mixed';
    perBlockPaymentType: Record<string, 'prepaid' | 'postpaid'>;
    selectedBlocks: PrefillBlock[];
    description: string;
  };
  vani: {
    summary: string;
    gaps: ComposedGap[];
    blockReasons: Record<string, string>; // block_id → why VaNi picked it
  };
  eventsPreview: {
    serviceEvents: number;
    billingEvents: number;
    estimatedTotal: number;
  };
  interactionId: string;
}

const MAX_CANDIDATES = 24;
const MAX_SELECTED_BLOCKS = 8;
const MAX_BLOCK_PAGES = 10; // 10 × 100 = catalog scan cap
const VALID_ACTIVITIES = ['pm', 'inspection', 'repair', 'install', 'decommission', 'spare_part'];

// ─── Service ───

class ContractComposerService {
  private contactService = new ContactService();

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

  // ==========================================================================
  // STEP 1+2: parse intent (LLM) + resolve buyer (deterministic)
  // ==========================================================================

  async parseIntent(text: string, ctx: ComposerCallContext): Promise<ParseIntentResult> {
    if (!vaniLLMClient.isEnabled()) {
      throw new Error('VaNi LLM is not configured (VANI_LLM_URL)');
    }

    const systemPrompt = this.loadSkill('vani-intent-parser.md', {
      '{{USER_CONTEXT}}': `Today's date: ${new Date().toISOString().slice(0, 10)}.`,
    });

    const { parsed, interactionId } = await vaniInteractionLogger.loggedJSONCall<Partial<ParsedIntent>>(
      {
        tenantId: ctx.tenantId,
        userId: ctx.userId,
        skill: 'contract_composer:intent_parse',
        contextPayload: { input_chars: text.length },
      },
      systemPrompt,
      text,
      { maxTokens: 250 }
    );

    const intent = this.normalizeIntent(parsed);
    const buyer = await this.resolveBuyer(intent.buyer_text, ctx);

    return { intent, buyer, interactionId };
  }

  /** Clamp the LLM's output into a safe, complete ParsedIntent */
  private normalizeIntent(raw: Partial<ParsedIntent>): ParsedIntent {
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

    return {
      contract_kind: (raw.contract_kind || 'Service Contract').slice(0, 60),
      buyer_text: (raw.buyer_text || '').slice(0, 120),
      duration: { value: durValue, unit: durUnit },
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

  private async resolveBuyer(buyerText: string, ctx: ComposerCallContext): Promise<BuyerResolution> {
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
  // STEP 3–5: shortlist (deterministic) → reason (LLM) → assemble (deterministic)
  // ==========================================================================

  async compose(
    intent: ParsedIntent,
    buyer: { id: string; name: string },
    ctx: ComposerCallContext
  ): Promise<ComposeResult> {
    if (!vaniLLMClient.isEnabled()) {
      throw new Error('VaNi LLM is not configured (VANI_LLM_URL)');
    }

    // ── 3. Shortlist: scan the tenant catalog, filter + rank deterministically ──
    const allBlocks = await this.fetchTenantBlocks(ctx);
    const equipmentNames = await this.fetchResourceTemplateNames(allBlocks);
    const candidates = this.shortlistBlocks(allBlocks, intent, equipmentNames);

    if (candidates.length === 0) {
      throw new Error(
        'No matching service blocks found in your catalog for this request. ' +
        'Add blocks in Catalog Studio or re-seed from VaNi Seeding first.'
      );
    }

    // ── Template context (cold-start tolerant: hubb has none today) ──
    const templateContext = await this.buildTemplateContext(ctx);

    // ── 4. Reason: LLM selects from the shortlist + flags gaps ──
    const durationDays = durationToDays(intent.duration.value, intent.duration.unit);
    const candidateLines = candidates
      .map((c, i) =>
        `B${i + 1} | ${c.block.name} | activity:${c.activity} | cycle_days:${c.cycleDays || 'one-time'} | ` +
        `price:${c.price} ${c.currency}${c.equipment ? ` | equipment:${c.equipment}` : ''}`
      )
      .join('\n');

    const systemPrompt = this.loadSkill('vani-block-composer.md', {
      '{{CONTRACT_KIND}}': intent.contract_kind,
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
          equipment: intent.equipment_hint,
          activities: intent.activities,
          candidate_count: candidates.length,
          buyer_id: buyer.id,
        },
      },
      systemPrompt,
      userMessage,
      { maxTokens: 500, timeoutMs: 240000 }
    );

    // ── 5. Assemble: validate the LLM selection, build the wizard prefill ──
    const selections = (parsed.selected || [])
      .map((s) => {
        const idx = parseInt(String(s.key).replace(/^B/i, ''), 10) - 1;
        if (isNaN(idx) || idx < 0 || idx >= candidates.length) return null;
        return { candidate: candidates[idx], quantity: s.quantity, reason: s.reason || '' };
      })
      .filter((s): s is NonNullable<typeof s> => s !== null)
      .slice(0, MAX_SELECTED_BLOCKS);

    if (selections.length === 0) {
      throw new Error('VaNi could not compose a block selection for this request — try rephrasing.');
    }

    const perBlock = intent.billing.mode === 'per_block';
    const blockCycle = perBlock ? intent.billing.cycle : 'prepaid';
    const perBlockPaymentType: Record<string, 'prepaid' | 'postpaid'> = {};
    const blockReasons: Record<string, string> = {};

    const selectedBlocks: PrefillBlock[] = selections.map(({ candidate, quantity, reason }) => {
      const b = candidate.block;
      // Deterministic quantity guard: LLM proposes, the cycle math decides bounds
      const cycleQty = candidate.cycleDays
        ? Math.max(1, Math.floor(durationDays / candidate.cycleDays))
        : 1;
      const qty = Math.max(1, Math.min(Number(quantity) || cycleQty, Math.max(cycleQty, 1)));

      const price = Number(b.base_price) || 0;
      if (perBlock) perBlockPaymentType[b.id] = 'postpaid';
      blockReasons[b.id] = reason;

      return {
        id: b.id,
        name: b.name,
        description: b.description || '',
        icon: b.icon || 'wrench',
        quantity: qty,
        cycle: blockCycle,
        serviceCycleDays: candidate.cycleDays || undefined,
        unlimited: false,
        price,
        currency: b.currency || 'INR',
        totalPrice: Math.round(price * qty * 100) / 100,
        categoryName: 'Service',
        categoryColor: '#3B82F6',
        categoryId: 'service',
        isFlyBy: false,
        taxRate: Number(b.tax_rate) || 0,
        taxInclusion: 'exclusive' as const,
        taxes: [],
        config: { showDescription: false, notes: reason || undefined },
      };
    });

    const currency = selectedBlocks[0]?.currency || 'INR';
    const grandTotal = Math.round(selectedBlocks.reduce((s, blk) => s + blk.totalPrice, 0) * 100) / 100;

    // Forward calendar preview via the Phase-0 derivation service (parity with wizard)
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
      startDate: new Date(),
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

    const durText = `${intent.duration.value} ${intent.duration.unit === 'years' && intent.duration.value === 1 ? 'Year' : intent.duration.unit}`;
    const gaps: ComposedGap[] = (parsed.gaps || [])
      .filter((g) => g && g.message)
      .slice(0, 6)
      .map((g) => ({
        severity: g.severity === 'warning' ? 'warning' : 'info',
        message: String(g.message).slice(0, 200),
      }));

    return {
      draft: {
        contractName: `${intent.contract_kind} — ${buyer.name} — ${durText}`,
        buyerId: buyer.id,
        buyerName: buyer.name,
        durationValue: intent.duration.value,
        durationUnit: intent.duration.unit,
        currency,
        paymentMode: intent.billing.mode === 'per_block' ? 'defined' : intent.billing.mode,
        emiMonths: intent.billing.emi_months,
        billingCycleType: perBlock ? 'mixed' : 'unified',
        perBlockPaymentType,
        selectedBlocks,
        description: parsed.summary || '',
      },
      vani: {
        summary: parsed.summary || 'Draft composed from your catalog.',
        gaps,
        blockReasons,
      },
      eventsPreview: {
        serviceEvents: events.filter((e) => e.event_type === 'service').length,
        billingEvents: events.filter((e) => e.event_type === 'billing').length,
        estimatedTotal: grandTotal,
      },
      interactionId,
    };
  }

  // ==========================================================================
  // Feedback passthrough (was_edited / was_accepted / rating from the UI)
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

  /** Page through the tenant's active blocks (100/page, capped) */
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

  /** id → equipment name map for the blocks' resource templates (graceful on failure) */
  private async fetchResourceTemplateNames(blocks: any[]): Promise<Map<string, string>> {
    const map = new Map<string, string>();
    const ids = Array.from(
      new Set(blocks.map((b) => b.resource_template_id).filter(Boolean))
    );
    if (ids.length === 0) return map;

    try {
      const url = process.env.SUPABASE_URL;
      const key = process.env.SUPABASE_KEY;
      if (!url || !key) return map;
      const supabase = createClient(url, key);
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

  /**
   * Deterministic shortlist: keep service blocks whose activity matches the
   * intent, rank by equipment-hint relevance, cap at MAX_CANDIDATES.
   * The LLM never sees the full catalog.
   */
  private shortlistBlocks(
    blocks: any[],
    intent: ParsedIntent,
    equipmentNames: Map<string, string>
  ): Array<{ block: any; activity: string; cycleDays: number; price: number; currency: string; equipment: string; score: number }> {
    const hintTokens = intent.equipment_hint
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((t) => t.length > 1);

    const activityRank: Record<string, number> = {};
    intent.activities.forEach((a, i) => { activityRank[a] = intent.activities.length - i; });

    const scored = blocks
      .map((b) => {
        const activity = b.config?.kt_service_activity || '';
        if (!activity || !intent.activities.includes(activity)) return null;
        // Exclude spare-part noise unless spares were explicitly asked for
        if (activity === 'spare_part' && !intent.activities.includes('spare_part')) return null;

        const equipment = equipmentNames.get(b.resource_template_id) || '';
        const haystack = `${b.name} ${equipment}`.toLowerCase();

        let score = (activityRank[activity] || 0) * 10;
        if (hintTokens.length > 0) {
          const hits = hintTokens.filter((t) => haystack.includes(t)).length;
          if (hits === 0 && equipment) score -= 15; // wrong equipment → sink
          score += hits * 20;
        }
        if (Number(b.base_price) > 0) score += 5; // priced blocks preferred

        return {
          block: b,
          activity,
          cycleDays: Number(b.config?.serviceCycles?.days) || 0,
          price: Number(b.base_price) || 0,
          currency: b.currency || 'INR',
          equipment,
          score,
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null)
      .sort((a, b) => b.score - a.score);

    return scored.slice(0, MAX_CANDIDATES);
  }

  /** Names of the tenant's saved templates as LLM context (cold-start: empty note) */
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
