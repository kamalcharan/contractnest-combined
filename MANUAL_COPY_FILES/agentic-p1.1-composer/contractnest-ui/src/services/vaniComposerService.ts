// src/services/vaniComposerService.ts
// VaNi Contract Composer — UI client for /api/vani-composer
// CPU LLM inference is slow (30–90s per call) — timeouts are per-request,
// far above the api instance default.

import api from './api';

const BASE = '/api/vani-composer';
const PARSE_TIMEOUT_MS = 180000;   // one LLM call
const COMPOSE_TIMEOUT_MS = 360000; // catalog scan + long LLM call

export interface VaniParsedIntent {
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

export interface VaniBuyerResolution {
  status: 'resolved' | 'ambiguous' | 'not_found';
  contact?: { id: string; name: string };
  candidates?: Array<{ id: string; name: string; company_name?: string }>;
}

export interface VaniNomenclatureMatch {
  id: string;
  name: string;
  group: string;
}

export interface VaniParseIntentResult {
  intent: VaniParsedIntent;
  buyer: VaniBuyerResolution;
  nomenclatureMatch: VaniNomenclatureMatch | null;
  interactionId: string;
}

export interface VaniStepReadiness {
  id: string;
  label: string;
  ready: boolean;
  note?: string;
}

export interface VaniComposeResult {
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
    selectedBlocks: any[]; // ConfigurableBlock-shaped
    equipmentDetails: any[];
    allowBuyerToAdd: boolean;
    coverageTypes: any[];
    evidencePolicyType: 'none' | 'upload' | 'smart_form';
    evidenceSelectedForms: any[];
    description: string;
  };
  vani: {
    summary: string;
    gaps: Array<{ severity: 'warning' | 'info'; message: string }>;
    blockReasons: Record<string, string>;
  };
  readiness: {
    steps: VaniStepReadiness[];
    readyCount: number;
    totalCount: number;
    needsYou: string[];
  };
  eventsPreview: {
    serviceEvents: number;
    billingEvents: number;
    estimatedTotal: number;
  };
  interactionId: string;
}

export interface VaniEntitlement {
  entitled: boolean;
  mode: 'open' | 'subscription';
  llm_enabled: boolean;
}

class VaniComposerService {
  /** Is VaNi visible/usable for this tenant? UI hides the entry point when not. */
  async checkEntitlement(): Promise<VaniEntitlement> {
    try {
      const response = await api.get(`${BASE}/entitlement`, { timeout: 15000 });
      if (response.data?.success) return response.data.data;
    } catch {
      /* fall through */
    }
    return { entitled: false, mode: 'open', llm_enabled: false };
  }

  async parseIntent(text: string): Promise<VaniParseIntentResult> {
    const response = await api.post(`${BASE}/parse-intent`, { text }, { timeout: PARSE_TIMEOUT_MS });
    if (!response.data?.success) {
      throw new Error(response.data?.error?.message || 'VaNi could not read your request');
    }
    return response.data.data;
  }

  /** buyer may be null — VaNi composes anyway; you pick/create the buyer in the wizard */
  async compose(
    intent: VaniParsedIntent,
    buyer: { id: string; name: string } | null
  ): Promise<VaniComposeResult> {
    const response = await api.post(
      `${BASE}/compose`,
      { intent, buyer_id: buyer?.id || '', buyer_name: buyer?.name || '' },
      { timeout: COMPOSE_TIMEOUT_MS }
    );
    if (!response.data?.success) {
      throw new Error(response.data?.error?.message || 'VaNi could not compose the draft');
    }
    return response.data.data;
  }

  /** Fire-and-forget quality signals — never blocks or throws */
  sendFeedback(
    interactionIds: string[],
    feedback: { was_accepted?: boolean; was_edited?: boolean; user_rating?: number }
  ): void {
    if (!interactionIds || interactionIds.length === 0) return;
    api
      .post(`${BASE}/feedback`, { interaction_ids: interactionIds, ...feedback })
      .catch(() => { /* logging must never disturb the user flow */ });
  }
}

export const vaniComposerService = new VaniComposerService();
export default vaniComposerService;
