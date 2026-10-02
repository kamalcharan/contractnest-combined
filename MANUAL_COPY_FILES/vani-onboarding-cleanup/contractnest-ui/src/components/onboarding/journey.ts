// src/components/onboarding/journey.ts
//
// ONE step model for the express onboarding journey.
//
// WHY THIS EXISTS
// ---------------
// Before this file there were three independent, mutually contradictory step
// models running at the same time:
//
//   1. OnboardingLayout's header dots + counter, driven by
//      OnboardingUtils.getAllSteps() — the LEGACY 11-step list
//      (welcome, storage-setup, user-profile, theme-selection, business-basic,
//      business-branding, served-industries, business-preferences,
//      sequence-numbers, master-data, complete). Almost none of the VaNi
//      routes appear in it, so on vani-consent the lookup returns -1 and the
//      header counter renders "0 / 11" with no dot marked current.
//
//   2. Hardcoded "Step N of 9" strings inside six VaNi step components — a
//      different total, on a different scale, from the header above it.
//
//   3. The express rail in src/lite/onboarding/ExpressShell — its own
//      three-step model.
//
// A user walking the express path therefore saw a header claiming 0 of 11 and
// a body claiming Step 7 of 9, describing the same screen.
//
// This module is the single source of truth. It lives OUTSIDE src/lite
// deliberately: src/lite may import outward, but nothing outside it may
// import in (enforced by eslint no-restricted-imports), so a shared model
// has to sit here for OnboardingLayout to use it too.
//
// SCOPE — deliberately express-only.
// resolveJourney() returns null for any route that is not part of the express
// journey, and OnboardingLayout falls back to exactly its existing behaviour
// in that case. The long form, BBB and every existing chapter are therefore
// untouched.

export type JourneyPersona = 'seller' | 'buyer' | 'both' | null;

export interface JourneyStep {
  id: string;
  /** Rail label. Kept short — the rail collapses to dots on narrow screens. */
  label: string;
  path: string;
  /**
   * One line for the layout header. Without it the header falls back to
   * "Begin your setup journey" on every screen, because getStepDefinition has
   * no entry for these routes — which reads like the flow never progresses.
   */
  blurb?: string;
}

// /start is the VaNi intro splash and is deliberately NOT a journey step —
// the wizard starts counting on the first screen that asks for something.
const BUSINESS: JourneyStep = { id: 'business', label: 'Your business', path: '/start/business', blurb: 'Name and what you do' };
const SERVE: JourneyStep = { id: 'serve', label: 'What you service', path: '/start/serve', blurb: 'Pick your equipment — we work out the rest' };
const BUILD: JourneyStep = { id: 'build', label: 'Building', path: '/onboarding/vani-working', blurb: 'Building your catalog' };
const PRICES: JourneyStep = { id: 'prices', label: 'Your prices', path: '/onboarding/pricing-review', blurb: 'Market-reference prices — edit any of them, or change them later' };
const TERMS: JourneyStep = { id: 'terms', label: 'Your terms', path: '/onboarding/terms-conditions', blurb: 'The terms your contracts carry' };
const ASSETS: JourneyStep = { id: 'assets', label: 'Your assets', path: '/onboarding/equipment-confirm', blurb: 'What you own and maintain' };
const PAY: JourneyStep = { id: 'pay', label: 'How you get paid', path: '/onboarding/payment-setup', blurb: 'What your customers see when they pay you' };
const TEAM: JourneyStep = { id: 'team', label: 'Your team', path: '/onboarding/team-setup', blurb: 'Roles, and invite your team if you like' };
const TAGS: JourneyStep = { id: 'tags', label: 'Your tags', path: '/onboarding/lov-setup', blurb: 'Labels for the people you work with' };
// 'done' is no longer the end — onboarding now finishes with a real contract,
// so its label says what it is: the workspace is ready.
const DONE: JourneyStep = { id: 'done', label: 'Workspace ready', path: '/onboarding/done', blurb: 'Everything is set up' };
const CONTRACT: JourneyStep = { id: 'contract', label: 'First contract', path: '/start/contract', blurb: 'A rehearsal, in test mode' };
const PLAN: JourneyStep = { id: 'plan', label: 'Your plan', path: '/start/plan', blurb: 'Nothing is charged today' };

/**
 * The real branching, read off the existing components rather than assumed:
 *
 *   VaniWorkingStep:390    buyer  -> equipment-confirm, else -> pricing-review
 *   Screen8APricingStep    -> terms-conditions
 *   TermsConditionsStep    -> payment-setup
 *   PaymentSetupStep       both  -> equipment-confirm, else -> team-setup
 *   Screen8BEquipmentStep  -> team-setup
 *   TeamSetupStep          -> lov-setup ("Your tags")
 *   LovSetupStep           -> done
 *
 * so the tails are:
 *   seller  build -> prices -> terms -> pay -> team -> tags -> done
 *   buyer   build -> assets -> team -> tags -> done
 *   both    build -> prices -> terms -> pay -> assets -> team -> tags -> done
 */
export function journeyFor(persona: JourneyPersona): JourneyStep[] {
  // Buyer ends at DONE. In this product the VENDOR authors contracts — a
  // buyer's first act is an RFQ or claiming a CNAK, both offered on the done
  // screen (VaniDoneStep 9B), which routes them OUT of onboarding. The rail
  // used to promise "First contract" and "Your plan" steps a buyer never
  // reached (and /start/contract cannot work for them: it authors from the
  // tenant's own catalog, and a buyer has none).
  if (persona === 'buyer') return [BUSINESS, SERVE, BUILD, ASSETS, TEAM, TAGS, DONE];
  if (persona === 'both')
    return [BUSINESS, SERVE, BUILD, PRICES, TERMS, PAY, ASSETS, TEAM, TAGS, DONE, CONTRACT, PLAN];
  // seller, and the unknown case: persona has not resolved yet on the very
  // first screen, and the seller shape is the one that path leads to.
  return [BUSINESS, SERVE, BUILD, PRICES, TERMS, PAY, TEAM, TAGS, DONE, CONTRACT, PLAN];
}

/** Persona strings the app stores, normalised to the three the journey knows. */
export function normaliseJourneyPersona(raw: unknown): JourneyPersona {
  const v = typeof raw === 'string' ? raw.trim().toLowerCase() : '';
  if (v === 'service_provider') return 'seller';
  if (v === 'merchant') return 'buyer';
  if (v === 'seller' || v === 'buyer' || v === 'both') return v;
  return null;
}

export interface ResolvedJourney {
  steps: JourneyStep[];
  currentIndex: number;
}

/**
 * Where the given route sits in the journey, or null if it is not part of it.
 *
 * Null is the important case: it is what keeps the long form working exactly
 * as it does today. Callers must treat it as "I have nothing to say about
 * this screen" and fall back, never as an error.
 */
export function resolveJourney(
  pathname: string,
  persona: JourneyPersona
): ResolvedJourney | null {
  const steps = journeyFor(persona);
  const path = (pathname || '').replace(/\/+$/, '') || '/';
  const currentIndex = steps.findIndex((s) => s.path === path);
  if (currentIndex === -1) return null;
  return { steps, currentIndex };
}

// ── Resume ──────────────────────────────────────────────────────────────────
//
// Where a returning tenant picks up. Decided from the step ids the server has
// recorded (t_tenant_onboarding.completed_steps — every VaNi step records
// itself on Continue AND on Skip through completeVaniStep), never from the
// numeric current_step counter, which only counts completions.
//
// The order below is the same tail journeyFor() draws; keep them together.

/** Recorded step id for each resumable screen, in journey order per persona. */
const TAIL_STEPS: Record<'seller' | 'buyer' | 'both', Array<[string, string]>> = {
  seller: [
    ['pricing-review', PRICES.path],
    ['terms-conditions', TERMS.path],
    ['payment-setup', PAY.path],
    ['team-setup', TEAM.path],
    ['lov-setup', TAGS.path],
    ['done', DONE.path],
  ],
  both: [
    ['pricing-review', PRICES.path],
    ['terms-conditions', TERMS.path],
    ['payment-setup', PAY.path],
    ['equipment-confirm', ASSETS.path],
    ['team-setup', TEAM.path],
    ['lov-setup', TAGS.path],
    ['done', DONE.path],
  ],
  buyer: [
    ['equipment-confirm', ASSETS.path],
    ['team-setup', TEAM.path],
    ['lov-setup', TAGS.path],
    ['done', DONE.path],
  ],
};

export interface ResumeTarget {
  path: string;
  /**
   * Route state for the target: the business type the later steps read, and
   * what Building seeded (from its saved step data) for Workspace ready. The
   * steps pass route state along, so this reaches the done screen too.
   */
  state: {
    persona: 'seller' | 'buyer' | 'both';
    catalogBlocksSeeded?: number;
    facilityNodesSeeded?: number;
    sampleContactsSeeded?: number;
  };
}

/**
 * The first screen of the VaNi journey this tenant has not finished.
 *
 *   nothing recorded              → /start
 *   business not chosen           → /start/business
 *   catalog not built yet         → /start/serve  (building needs the picks,
 *                                   which only live in memory — re-picking
 *                                   is quick; restarting the build blind
 *                                   would seed an empty catalog)
 *   after building                → first unfinished tail step for the persona
 *
 * A tenant whose picks were all "awaiting activation" skips building and goes
 * straight to the team page, so any recorded tail step also counts as past
 * building.
 */
export function resumePathFor(
  doneSteps: string[],
  stepData: Record<string, any> = {}
): ResumeTarget {
  const done = new Set(doneSteps);
  const persona =
    normaliseJourneyPersona(stepData['persona-selection']?.persona) ||
    normaliseJourneyPersona(stepData['vani-working']?.persona) ||
    'seller';
  const built = stepData['vani-working'] || {};
  const state: ResumeTarget['state'] = {
    persona,
    catalogBlocksSeeded: Number(built.catalog_blocks_seeded) || 0,
    facilityNodesSeeded: Number(built.registry_assets_seeded) || 0,
    sampleContactsSeeded: Number(built.sample_contacts_seeded) || 0,
  };

  if (done.size === 0) return { path: '/start', state };
  if (!done.has('persona-selection')) return { path: BUSINESS.path, state };

  const tail = TAIL_STEPS[persona];
  const pastBuilding = done.has('vani-working') || tail.some(([id]) => done.has(id));
  if (!pastBuilding) return { path: SERVE.path, state };

  // Continue after the FURTHEST step reached, not at the first gap: a tenant
  // with nothing to build jumps from "What you service" straight to the team
  // page and never sees prices or terms, and must not be sent back to them.
  let furthest = -1;
  tail.forEach(([id], i) => { if (done.has(id)) furthest = i; });
  const next = tail.slice(furthest + 1).find(([id]) => !done.has(id));
  return { path: next ? next[1] : DONE.path, state };
}
