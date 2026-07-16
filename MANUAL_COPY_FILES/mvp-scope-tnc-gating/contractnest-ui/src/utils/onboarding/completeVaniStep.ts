// src/utils/onboarding/completeVaniStep.ts
// Sprint 1 / S13 — VaNi steps report completion (with their payload) to the
// backend so t_tenant_onboarding.step_data accumulates the real 13-step flow.
// Fire-and-forget by design: step persistence must never block navigation,
// but failures are logged loudly for observability.

import api from '@/services/api';

export type VaniStepId =
  | 'vani-intro'
  | 'user-profile'
  | 'business-details'
  | 'persona-selection'
  | 'theme-selection'
  | 'industry-selection'
  | 'resource-pick'
  | 'vani-consent'
  | 'vani-working'
  | 'pricing-review'
  | 'terms-conditions'
  | 'equipment-confirm'
  | 'lov-setup'
  | 'vani-intelligence'
  | 'done';

export async function completeVaniStep(
  stepId: VaniStepId,
  data: Record<string, any> = {},
): Promise<boolean> {
  try {
    await api.post('/api/onboarding/step/complete', { stepId, data });
    return true;
  } catch (err: any) {
    console.error(`[onboarding] Failed to persist step "${stepId}":`, err?.response?.data?.error || err?.message);
    return false;
  }
}
