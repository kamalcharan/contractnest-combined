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
  buyer_text: string;
  duration: { value: number; unit: 'days' | 'months' | 'years' };
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

export interface VaniParseIntentResult {
  intent: VaniParsedIntent;
  buyer: VaniBuyerResolution;
  interactionId: string;
}

export interface VaniComposeResult {
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
    selectedBlocks: any[]; // ConfigurableBlock-shaped
    description: string;
  };
  vani: {
    summary: string;
    gaps: Array<{ severity: 'warning' | 'info'; message: string }>;
    blockReasons: Record<string, string>;
  };
  eventsPreview: {
    serviceEvents: number;
    billingEvents: number;
    estimatedTotal: number;
  };
  interactionId: string;
}

class VaniComposerService {
  async parseIntent(text: string): Promise<VaniParseIntentResult> {
    const response = await api.post(`${BASE}/parse-intent`, { text }, { timeout: PARSE_TIMEOUT_MS });
    if (!response.data?.success) {
      throw new Error(response.data?.error?.message || 'VaNi could not read your request');
    }
    return response.data.data;
  }

  async compose(
    intent: VaniParsedIntent,
    buyerId: string,
    buyerName: string
  ): Promise<VaniComposeResult> {
    const response = await api.post(
      `${BASE}/compose`,
      { intent, buyer_id: buyerId, buyer_name: buyerName },
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
