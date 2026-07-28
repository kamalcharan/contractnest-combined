// src/lite/onboarding/expressFlow.ts
//
// The express onboarding path.
//
// The existing /onboarding chain is ~16 screens:
//   vani-intro → user-profile → business-details → persona-selection →
//   engagement-model → theme-selection → industry-selection → resource-pick →
//   vani-consent → vani-intelligence → vani-working → pricing-review →
//   terms-conditions → equipment → lov-setup → done
//
// Express replaces the first NINE of those with TWO screens and then hands off
// into the existing chain at vani-working, which already runs the seeding and
// carries the tenant through pricing → terms → equipment → done unchanged.
//
//   /start        business name + persona
//   /start/trade  served industries (pre-selected from the landing page)
//   → /onboarding/vani-working  (existing, untouched, and everything after it)
//
// Nothing in the existing flow is modified. It stays reachable at /onboarding
// for anyone who needs the long form.

/** Where express hands control back to the existing onboarding chain. */
export const EXPRESS_HANDOFF_PATH = '/onboarding/vani-working';

/** Screens express owns, in order. Used by the progress rail. */
export const EXPRESS_STEPS = [
  { id: 'business', label: 'Your business', path: '/start' },
  { id: 'trade', label: 'Your line of work', path: '/start/trade' },
  { id: 'workspace', label: 'Building your workspace', path: EXPRESS_HANDOFF_PATH },
] as const;

export type ExpressStepId = (typeof EXPRESS_STEPS)[number]['id'];

/**
 * Personas, matching the values the existing PersonaSelectionStep writes.
 * `persona` is the constrained agent-readable column; `business_type_id` is
 * the legacy column the rest of the app still reads, so we write both — the
 * same dual-write the existing step performs.
 */
export const PERSONAS = [
  {
    id: 'seller',
    title: 'I provide services',
    detail: 'AMCs and maintenance for customers — the revenue side',
  },
  {
    id: 'buyer',
    title: 'I own equipment',
    detail: 'I hire providers to maintain my assets — the expense side',
  },
  {
    id: 'both',
    title: 'Both',
    detail: 'I service others and maintain my own facilities',
  },
] as const;

export type PersonaId = (typeof PERSONAS)[number]['id'];

/**
 * Trade chosen on the public landing page, if any. Written by
 * src/lite/landing/LandingPage.tsx so onboarding never asks for it twice.
 */
export const TRADE_HANDOFF_KEY = 'cn_landing_trade';

/** Landing trade → words we can match against the industry master list. */
export const TRADE_TO_INDUSTRY_HINTS: Record<string, string[]> = {
  equipment_amc: ['hvac', 'amc', 'equipment', 'elevator', 'lift', 'facility'],
  pest_control: ['pest'],
  housekeeping: ['housekeeping', 'facility', 'cleaning'],
  manufacturing_support: ['manufactur', 'industrial', 'plant', 'machine'],
};

export function readLandingTrade(): string | null {
  try {
    return window.localStorage.getItem(TRADE_HANDOFF_KEY);
  } catch {
    return null;
  }
}

export function clearLandingTrade(): void {
  try {
    window.localStorage.removeItem(TRADE_HANDOFF_KEY);
  } catch {
    /* storage unavailable — nothing to clear */
  }
}

/**
 * Best-effort match of the landing trade onto the tenant-visible industry list.
 * Returns ids to pre-select. Never throws, and returning [] simply means the
 * visitor picks manually.
 */
export function suggestIndustryIds(
  trade: string | null,
  industries: Array<{ id?: string; name?: string }>
): string[] {
  if (!trade) return [];
  const hints = TRADE_TO_INDUSTRY_HINTS[trade];
  if (!hints || !Array.isArray(industries)) return [];

  return industries
    .filter((i) => {
      const name = (i?.name || '').toLowerCase();
      return !!i?.id && hints.some((h) => name.includes(h));
    })
    .map((i) => i.id as string);
}
