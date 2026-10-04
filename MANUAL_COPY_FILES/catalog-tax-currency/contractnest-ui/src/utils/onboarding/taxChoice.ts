// src/utils/onboarding/taxChoice.ts
//
// The taxes the tenant chose on the onboarding Tax screen (/start/tax), handed
// to the seeding step (VaniWorkingStep → POST /api/seeds/tenant/templates
// { taxRateIds }). It is a choice FOR THIS SEEDING, not a property of the tax
// master, so it is not stored on the rates: route state carries it, and this
// per-tenant sessionStorage copy survives a refresh in between.
//
// undefined (never chosen) → the server uses the tax master's default rate.

const KEY = (tenantId: string) => `cn_onboarding_tax_choice:${tenantId}`;

export function saveOnboardingTaxChoice(tenantId: string | undefined, rateIds: string[]): void {
  if (!tenantId) return;
  try {
    window.sessionStorage.setItem(KEY(tenantId), JSON.stringify(rateIds));
  } catch {
    /* storage unavailable — route state still carries the choice */
  }
}

export function readOnboardingTaxChoice(tenantId: string | undefined): string[] | undefined {
  if (!tenantId) return undefined;
  try {
    const raw = window.sessionStorage.getItem(KEY(tenantId));
    if (!raw) return undefined;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === 'string') : undefined;
  } catch {
    return undefined;
  }
}
