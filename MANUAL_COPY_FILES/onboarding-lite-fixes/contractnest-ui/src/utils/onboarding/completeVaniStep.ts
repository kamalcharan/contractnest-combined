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

/**
 * Explicitly flip t_tenant_onboarding.is_completed via the dedicated
 * POST /api/onboarding/complete endpoint (API → edge → unconditional update).
 *
 * WHY THIS EXISTS: completion used to depend on the edge function's
 * step-counting rule firing off a fire-and-forget 'done' write that a hard
 * navigation cancelled ~250ms later — so most tenants were never marked
 * complete and got forced back into onboarding on every login. Callers at
 * the end of the flow AWAIT this (bounded), so the flag actually lands.
 * Idempotent: re-completing an already-complete record is a no-op update.
 */
export async function markOnboardingComplete(): Promise<boolean> {
  try {
    await api.post('/api/onboarding/complete');
    return true;
  } catch (err: any) {
    console.error('[onboarding] Failed to mark onboarding complete:', err?.response?.data?.error || err?.message);
    return false;
  }
}
