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
// Express replaces the first TEN of those with TWO screens and hands off
// into the existing chain at vani-working — the seeding screen — which carries
// the tenant through pricing → terms → equipment → lists → done unchanged.
//
//   /start        business name + persona
//   /start/serve  what you service  (equipment/facilities/services)
//   → /onboarding/vani-working  (existing, untouched, and everything after it)
//
// WHY THE SECOND SCREEN ASKS FOR EQUIPMENT, NOT INDUSTRY
// -----------------------------------------------------
// The catalog is modelled industry → templates, and the long flow asks in
// that direction. On the real data that misleads: `lifts_elevators` and
// `hvac` own equipment templates that have no industry-link rows at all, so
// they never appear in v_resource_templates_by_industry, while the template
// that actually carries the lift Knowledge Tree ("Elevator / Lift") sits
// under facility_management. Picking the industry a lift company would name
// therefore returns everything except lifts.
//
// Asking for the equipment and deriving the industry backwards from it
// removes the guess: the tenant picks a template that exists by
// construction, and its `is_primary` industry link is saved as the served
// industry. See useGlobalTemplates.ts for the mechanics.
//
// WHY vani-working AND NOT resource-pick OR vani-consent
// ------------------------------------------------------
// resource-pick is where the long flow chooses templates, and VaniWorkingStep
// feeds those straight into the seeding POST as equipmentTemplateIds /
// facilityTemplateIds / serviceTemplateIds. An earlier version of express
// skipped it, the arrays arrived empty and the seeder produced nothing —
// which surfaced as "no service blocks found". Express now asks the same
// question itself and emits the identical route-state payload
// ResourcePickStep emits, so resource-pick is redundant rather than skipped.
//
// vani-consent and vani-intelligence sit between resource-pick and the
// seeding, and both are pure display: each reads
// routeState.selectedEquipmentTemplates / selectedFacilityTemplates and hands
// them straight back out unchanged (VaniIntelligenceStep:80-81 → 168-170).
// Neither writes anything the seeder reads. vani-consent's only side effect
// is setTheme('vani'), and nothing downstream of it reads the theme — every
// screen from vani-working on carries its own hardcoded palette. So both are
// skippable with no behavioural loss, and skipping them removes the
// "Step 7 of 9 · VaNi Consent" screen from the express path entirely.
//
// Nothing in the existing flow is modified. It stays reachable at /onboarding
// for anyone who needs the long form.

/** Where express hands control back to the existing onboarding chain. */
export const EXPRESS_HANDOFF_PATH = '/onboarding/vani-working';

// The step model for the whole journey — express screens AND the VaNi tail —
// lives in components/onboarding/journey.ts, because OnboardingLayout needs it
// too and nothing outside src/lite may import from inside it.

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

/** Persona strings the rest of the app may already hold, normalised. */
export function normalisePersona(raw: unknown): PersonaId | null {
  const v = typeof raw === 'string' ? raw.trim().toLowerCase() : '';
  if (v === 'service_provider') return 'seller';
  if (v === 'merchant') return 'buyer';
  if (v === 'seller' || v === 'buyer' || v === 'both') return v;
  return null;
}

/**
 * Trade chosen on the public landing page, if any. Written by
 * src/lite/landing/LandingPage.tsx so onboarding never asks for it twice.
 */
export const TRADE_HANDOFF_KEY = 'cn_landing_trade';

/**
 * Landing trade → words matched against TEMPLATE names, to pre-tick the
 * obvious picks on the second screen. Purely a head start: matching nothing
 * simply means the visitor ticks boxes themselves, which is the normal case
 * for anyone who did not come through the landing page.
 */
export const TRADE_TO_TEMPLATE_HINTS: Record<string, string[]> = {
  equipment_amc: ['hvac', 'dg set', 'generator', 'elevator', 'lift', 'ups', 'transformer'],
  pest_control: ['washroom', 'restroom', 'kitchen', 'parking'],
  housekeeping: ['washroom', 'restroom', 'parking', 'laundry'],
  manufacturing_support: ['compressor', 'conveyor', 'boiler', 'cnc', 'transformer', 'dg set'],
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
 * Best-effort pre-tick of templates from the landing trade. Never throws, and
 * returning [] simply means nothing is pre-ticked.
 */
export function suggestTemplateIds(
  trade: string | null,
  templates: Array<{ id?: string; name?: string }>
): string[] {
  if (!trade || !Array.isArray(templates)) return [];
  const hints = TRADE_TO_TEMPLATE_HINTS[trade];
  if (!hints) return [];

  return templates
    .filter((t) => {
      const name = (t?.name || '').toLowerCase();
      return !!t?.id && hints.some((h) => name.includes(h));
    })
    .map((t) => t.id as string);
}

/**
 * THE REVERSE QUERY, applied.
 *
 * Given the templates the tenant says they service, return the industries to
 * save as served industries — each template's home (`is_primary`) industry.
 *
 * Cross-industry templates deliberately do NOT contribute their full link
 * list: an HVAC System is linked to sixteen industries, and saving all of
 * them would seed a catalog for hospitals, banks and airlines because someone
 * services air conditioners. The home industry is the one that owns the
 * template's Knowledge Tree, which is the one worth serving.
 *
 * Falls back to the first linked industry of any non-universal pick when no
 * home industry is present, and to [] when every pick is universal — a
 * legitimate outcome, since seeding runs off the template ids, not off the
 * industries.
 */
export function deriveServedIndustries(
  templates: Array<{ industries?: string[]; primaryIndustryId?: string | null; scope?: string | null }>
): string[] {
  const primary = new Set<string>();
  for (const t of templates) {
    if (t?.primaryIndustryId) primary.add(t.primaryIndustryId);
  }
  if (primary.size > 0) return Array.from(primary);

  const fallback = new Set<string>();
  for (const t of templates) {
    if (t?.scope === 'universal') continue;
    const first = t?.industries?.[0];
    if (first) fallback.add(first);
  }
  return Array.from(fallback);
}
