// src/components/reveal/revealRules.ts
//
// MVP reveal schedule — what a new tenant does NOT see on day one, and what
// unlocks each surface. Source of truth is ClaudeDocumentation/mvp/mvp-reveal-schedule.md
//
// Design rules:
//  1. This file is DATA, not logic. Changing a rule must never require touching a screen.
//  2. Every rule fails OPEN on unknown signals — if we can't tell, we show the surface.
//     A new tenant seeing one extra control is a small cost; an existing tenant
//     (BBB) losing a control they use every day is not.
//  3. Nothing here is tenant-destructive. It is presentation only.
//
// WHY THIS LIVES IN components/ AND NOT src/lite/
// It was written under src/lite, but the eslint isolation rule says nothing
// outside src/lite may import from inside it — and gating means Header.tsx and
// Sidebar.tsx have to import RevealGate. Shared infrastructure belongs outside
// the lite boundary, same reasoning as components/onboarding/journey.ts.
//
// ─────────────────────────────────────────────────────────────────────────────
// WHAT IS WIRED, AND WHY THE REST IS NOT
//
// The schedule had nine rules. Each was checked against production data before
// wiring, and that check disqualified four:
//
//   env-badge   DELETED. It hid the Test/Live switch on the theory that a wrong
//               environment choice would break CNAK claims across environments.
//               Both halves were wrong: 33 tables carry is_live (contacts,
//               contracts, events, invoices, tickets, catalog, sequences, group
//               sessions, integrations) so the sandbox is complete; tenants are
//               already using it (100 test contacts, 7 test contracts, 7 test
//               invoices in production); and claim_contract_by_cnak ALREADY
//               filters on is_live, so the environments cannot cross. Nothing
//               to protect against, and tenants expect a sandbox.
//
//   payables    DELETED as redundant. operations/finance/index.tsx:107 derives
//               its view purely from the global perspective —
//               perspective === 'expense' ? 'payables' : 'receivables' — so
//               gating the perspective switcher already makes payables
//               unreachable. Two locks on one door.
//
//   sla-metrics NOT WIRED. Both need completed service visits, and every
//   contact-tabs tenant in production has ZERO — BBB included, because BBB's
//               work is check-ins and group sessions rather than field-service
//               events. Wiring them would not be progressive disclosure, it
//               would be "hidden for everyone, forever". The underlying point
//               stands — a 100% SLA computed from no visits teaches distrust of
//               every other number on the page — but that argues for a better
//               empty state, not a reveal rule.
//
//   charts      NOT WIRED. The signal is months of billing history, and the
//               only column available is t_invoices.created_at, which clusters
//               by when invoices were generated rather than the period they
//               bill. BBB reads as 1 month despite holding April-July
//               schedules. A rule that fires on a number we know is wrong is
//               worse than no rule.
//
// The survivors are wired, and every threshold was verified against BBB's real
// numbers (56 contracts, 44 partner contracts, 86 group-session schedule rows)
// so the only production tenant loses nothing.

export type RevealId =
  | 'perspective'
  | 'group-sessions'
  | 'catalog-studio'
  | 'discount'
  | 'sla-metrics'
  | 'charts'
  | 'contact-tabs';

/** Signals the rules are evaluated against. All optional — undefined means "unknown". */
export interface RevealSignals {
  /** Total contracts owned by this tenant (any status, any type). */
  contractCount?: number;
  /**
   * Contracts of a non-client type, i.e. the expense side exists. Production
   * carries exactly two contract_type values — 'client' and 'partner' — so this
   * is the count of 'partner'.
   *
   * Deliberately MEASURED, not inferred from persona: BBB's persona is
   * 'seller' yet it holds 44 partner contracts, so a persona-based shortcut
   * would have hidden the switcher from the one tenant that demonstrably
   * uses it.
   */
  vendorContractCount?: number;
  /** Completed service visits. NOT WIRED — see header. */
  completedVisitCount?: number;
  /** Whole months of billing history. NOT WIRED — see header. */
  billingMonths?: number;
  /** Tenant explicitly uses group sessions (batches, rosters, chapters). */
  usesGroupSessions?: boolean;
  /**
   * The tenant's persona. Needed because for a BUYER the expense side is not
   * a later unlock — it is the whole product.
   */
  persona?: 'seller' | 'buyer' | 'both' | null;
  /** True while a first-contract create flow is open — hides the discount control there only. */
  inFirstContractCreate?: boolean;
  /** Tenant has logged at least one client portal open. NOT WIRED. */
  hasPortalActivity?: boolean;
}

export interface RevealRule {
  id: RevealId;
  /** Human-readable unlock condition, shown in dev tooling and docs. */
  unlocksWhen: string;
  /** True once this rule is applied to a real surface. */
  wired: boolean;
  /**
   * Return true to SHOW the surface.
   * Must return true when the deciding signal is undefined (fail open).
   */
  show: (s: RevealSignals) => boolean;
}

/** Helper: fail open when the signal is unknown. */
const atLeast = (value: number | undefined, threshold: number) =>
  value === undefined ? true : value >= threshold;

export const REVEAL_RULES: Record<RevealId, RevealRule> = {
  // A BUYER ALWAYS SEES THIS. Reported the day after it shipped: a new buyer
  // tenant had no Revenue/Expense switcher and therefore no way to reach the
  // vendor side at all — where their RFQs live. The rule was circular: the
  // switcher unlocked on having a non-client contract, and creating one
  // required the switcher.
  //
  // Gating on the count alone assumed every tenant starts on the revenue side
  // and grows into the expense side. That is true of a seller and false of a
  // buyer, for whom the expense side IS the product. Persona decides; the
  // count is only the fallback for a seller who has grown into it.
  perspective: {
    id: 'perspective',
    unlocksWhen:
      'Always for a buyer or both; for a seller, once a non-client contract exists.',
    wired: true,
    // Gating this also gates Payables — the finance view is derived from it.
    show: (s) =>
      s.persona === 'buyer' || s.persona === 'both'
        ? true
        : atLeast(s.vendorContractCount, 1),
  },

  'group-sessions': {
    id: 'group-sessions',
    unlocksWhen: 'Tenant runs batches/rosters (BBB chapters keep this on).',
    wired: true,
    show: (s) => (s.usesGroupSessions === undefined ? true : s.usesGroupSessions),
  },

  // UNWIRED after one day in use — the reasoning was wrong, not the threshold.
  // "Before 5 contracts the seeded catalog is enough" only holds if the studio
  // is for power editing later. It is not: /catalog-studio is the ONLY route to
  //   /catalog-studio/blocks          the 83-499 blocks onboarding just built
  //   /catalog-studio/templates-list  the ONLY place templates are managed
  //   /catalog-studio/configure       catalog configuration
  //   /catalog-studio/equipment       VaNi seeding
  // Nothing else in the app links to templates-list. So the gate hid a tenant's
  // own catalog immediately after onboarding counted it at them, and — with
  // template seeding parked pending usage patterns — guaranteed that no tenant
  // could ever produce a pattern to review. Owner call: it must stay visible or
  // it blocks operations.
  'catalog-studio': {
    id: 'catalog-studio',
    unlocksWhen: 'Always — it is the only route to blocks, templates and configuration.',
    wired: false,
    show: () => true,
  },

  // `wired` means "applied to a real surface". This one is not: the contract
  // wizard would have to push inFirstContractCreate, which belongs with the
  // express-contract work. Claiming otherwise would make this table lie.
  discount: {
    id: 'discount',
    unlocksWhen: 'Always available when editing; hidden only during first-contract create.',
    wired: false,
    show: (s) => s.inFirstContractCreate !== true,
  },

  // ── Kept as data, applied to no surface. See the header comment. ───────────
  'sla-metrics': {
    id: 'sla-metrics',
    unlocksWhen: '3+ completed visits — below that the number is not yet true.',
    wired: false,
    show: (s) => atLeast(s.completedVisitCount, 3),
  },

  charts: {
    id: 'charts',
    unlocksWhen: '2+ months of billing history.',
    wired: false,
    show: (s) => atLeast(s.billingMonths, 2),
  },

  'contact-tabs': {
    id: 'contact-tabs',
    unlocksWhen: 'First visit logged or first client portal open.',
    wired: false,
    show: (s) =>
      (s.completedVisitCount === undefined ? true : s.completedVisitCount >= 1) ||
      (s.hasPortalActivity === undefined ? true : s.hasPortalActivity),
  },
};

/** Evaluate one rule. Unknown id fails open. */
export function evaluateReveal(id: RevealId, signals: RevealSignals): boolean {
  const rule = REVEAL_RULES[id];
  if (!rule) return true;
  try {
    return rule.show(signals);
  } catch {
    // A broken rule must never blank out a working screen.
    return true;
  }
}
