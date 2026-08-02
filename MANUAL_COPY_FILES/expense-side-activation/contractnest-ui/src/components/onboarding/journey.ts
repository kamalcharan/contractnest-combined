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
const LISTS: JourneyStep = { id: 'lists', label: 'Your lists', path: '/onboarding/lov-setup', blurb: 'Roles and tags for your team' };
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
 *   TermsConditionsStep:147 both  -> equipment-confirm, else -> lov-setup
 *   Screen8BEquipmentStep  -> lov-setup
 *   LovSetupStep           -> done
 *
 * so the tails are:
 *   seller  build -> prices -> terms -> lists -> done
 *   buyer   build -> assets -> lists -> done
 *   both    build -> prices -> terms -> assets -> lists -> done
 */
export function journeyFor(persona: JourneyPersona): JourneyStep[] {
  // Buyer ends at DONE. In this product the VENDOR authors contracts — a
  // buyer's first act is an RFQ or claiming a CNAK, both offered on the done
  // screen (VaniDoneStep 9B), which routes them OUT of onboarding. The rail
  // used to promise "First contract" and "Your plan" steps a buyer never
  // reached (and /start/contract cannot work for them: it authors from the
  // tenant's own catalog, and a buyer has none).
  if (persona === 'buyer') return [BUSINESS, SERVE, BUILD, ASSETS, LISTS, DONE];
  if (persona === 'both')
    return [BUSINESS, SERVE, BUILD, PRICES, TERMS, ASSETS, LISTS, DONE, CONTRACT, PLAN];
  // seller, and the unknown case: persona has not resolved yet on the very
  // first screen, and the seller shape is the one that path leads to.
  return [BUSINESS, SERVE, BUILD, PRICES, TERMS, LISTS, DONE, CONTRACT, PLAN];
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
