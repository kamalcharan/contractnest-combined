// src/utils/perspective/sideReadiness.ts
//
// Side-readiness for the Revenue/Expense perspective toggle.
//
// A side is "set up" when the tenant's PERSONA covers it — nothing else.
//
//   seller → Revenue on,  Expense needs activation
//   buyer  → Expense on,  Revenue needs activation
//   both   → both on
//
// It used to be decided by counting rows (≥1 catalog block for Revenue,
// ≥1 own registry asset for Expense). That was the wrong signal. An Expense
// tenant is one who RECEIVES contracts and can legitimately hold zero assets
// of its own; and the onboarding seeder writes own assets into the test
// environment only, so a Live-mode tenant that had just completed the
// Expense activation was offered it again on every toggle (signia,
// 2026-09-22). Persona is the declaration the tenant made, and the one the
// activation flow updates; what the side then shows, empty or not, is the
// side's own job.
//
// FAIL-OPEN: an unknown persona (profile not loaded yet, lite tiers with no
// business profile) never blocks a switch.

export type Side = 'revenue' | 'expense';
export type SidePersona = 'seller' | 'buyer' | 'both' | null;

/** Persona strings the app stores, normalised to the three the toggle knows. */
export function normaliseSidePersona(raw: unknown): SidePersona {
  const v = typeof raw === 'string' ? raw.trim().toLowerCase() : '';
  if (v === 'service_provider') return 'seller';
  if (v === 'merchant') return 'buyer';
  if (v === 'seller' || v === 'buyer' || v === 'both') return v;
  return null;
}

/** True when the persona covers the side — or is unknown (fail open). */
export function isSideReady(side: Side, persona: SidePersona): boolean {
  if (!persona || persona === 'both') return true;
  return side === 'revenue' ? persona === 'seller' : persona === 'buyer';
}
