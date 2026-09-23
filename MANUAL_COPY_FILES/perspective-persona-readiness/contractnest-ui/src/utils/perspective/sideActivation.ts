// src/utils/perspective/sideActivation.ts
//
// Hand-off between the perspective toggle's activation offer and the lite
// onboarding flow it triggers.
//
// When an existing tenant activates their missing side (Expense-side tenant
// adding Revenue, or Revenue-side tenant adding Expense), they are sent back
// through the lite flow — but that run must differ from a fresh signup in
// two ways:
//   1. /start/serve asks the question for the side being ACTIVATED
//      ("what do you own?" for expense, "what do you service?" for revenue),
//      not the persona-default question.
//   2. The seeder runs ONLY the target side's leg (businessType 'buyer' or
//      'seller'), NOT the persona. Persona becomes 'both', and 'both' would
//      trigger the dual-intent rule — seeding everything they SERVICE into
//      what they OWN, which is wrong data for an activation. Fresh 'both'
//      signups keep the dual-intent rule untouched.
//
// sessionStorage (not route state) so the intent survives the multi-step
// walk and a mid-flow refresh; tab-scoped so it can't leak across sessions.
// Written by AuthContext.activatePendingPerspective, read by the lite steps,
// cleared when the flow reaches the done screen.

export type ActivationSide = 'revenue' | 'expense';

const KEY = 'cn_activate_side';

export function setPendingSideActivation(side: ActivationSide): void {
  try {
    sessionStorage.setItem(KEY, side);
  } catch {
    /* storage unavailable — flow still works, just with persona-default wording */
  }
}

export function readPendingSideActivation(): ActivationSide | null {
  try {
    const v = sessionStorage.getItem(KEY);
    return v === 'revenue' || v === 'expense' ? v : null;
  } catch {
    return null;
  }
}

export function clearPendingSideActivation(): void {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    /* nothing to clear */
  }
}

// ── Landing perspective ──────────────────────────────────────────────────────
// The activation walk ends with a hard reload (caches must go), and
// perspective is React state that a reload re-derives from persona — which
// after an activation is 'both', i.e. Revenue. So the done screen's CTA
// writes the side the tenant chose here, and AuthContext.initializePerspective
// takes it exactly once on the next load. Tab-scoped, like the hand-off above.

const LANDING_KEY = 'cn_landing_perspective';

export function setLandingPerspective(side: ActivationSide): void {
  try {
    sessionStorage.setItem(LANDING_KEY, side);
  } catch {
    /* storage unavailable — the reload lands on the persona default */
  }
}

/** Read AND clear: a landing side applies to one load only. */
export function takeLandingPerspective(): ActivationSide | null {
  try {
    const v = sessionStorage.getItem(LANDING_KEY);
    if (v !== null) sessionStorage.removeItem(LANDING_KEY);
    return v === 'revenue' || v === 'expense' ? v : null;
  } catch {
    return null;
  }
}
