// src/lite/reveal/revealRules.ts
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

export type RevealId =
  | 'env-badge'
  | 'perspective'
  | 'payables'
  | 'group-sessions'
  | 'catalog-studio'
  | 'sla-metrics'
  | 'charts'
  | 'discount'
  | 'contact-tabs';

/** Signals the rules are evaluated against. All optional — undefined means "unknown". */
export interface RevealSignals {
  /** Total contracts owned by this tenant (any status). */
  contractCount?: number;
  /** Contracts where this tenant is the buyer, i.e. the expense side exists. */
  vendorContractCount?: number;
  /** Completed service visits across all contracts. */
  completedVisitCount?: number;
  /** Whole months of billing history available. */
  billingMonths?: number;
  /** Tenant explicitly uses group sessions (batches, rosters, chapters). */
  usesGroupSessions?: boolean;
  /** True while a first-contract create flow is open — hides the discount control there only. */
  inFirstContractCreate?: boolean;
  /** Tenant has logged at least one portal open from a client. */
  hasPortalActivity?: boolean;
}

export interface RevealRule {
  id: RevealId;
  /** Human-readable unlock condition, shown in dev tooling and docs. */
  unlocksWhen: string;
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
  'env-badge': {
    id: 'env-badge',
    unlocksWhen: 'Never by default — every tenant runs on Live.',
    // Deliberately always hidden. A wrong Test/Live choice silently breaks CNAK
    // claims across environments; new tenants have no basis to choose.
    show: () => false,
  },

  perspective: {
    id: 'perspective',
    unlocksWhen: 'First vendor contract exists (the expense side becomes real).',
    show: (s) => atLeast(s.vendorContractCount, 1),
  },

  payables: {
    id: 'payables',
    unlocksWhen: 'First vendor contract exists.',
    show: (s) => atLeast(s.vendorContractCount, 1),
  },

  'group-sessions': {
    id: 'group-sessions',
    unlocksWhen: 'Tenant runs batches/rosters (BBB chapters keep this on).',
    show: (s) => (s.usesGroupSessions === undefined ? true : s.usesGroupSessions),
  },

  'catalog-studio': {
    id: 'catalog-studio',
    unlocksWhen: '5+ contracts — before that the seeded catalog is enough.',
    show: (s) => atLeast(s.contractCount, 5),
  },

  'sla-metrics': {
    id: 'sla-metrics',
    unlocksWhen: '3+ completed visits — below that the number is not yet true.',
    // With zero visits an SLA tile reads "100%" or "—", which teaches distrust
    // of every other number on the page.
    show: (s) => atLeast(s.completedVisitCount, 3),
  },

  charts: {
    id: 'charts',
    unlocksWhen: '2+ months of billing history.',
    show: (s) => atLeast(s.billingMonths, 2),
  },

  discount: {
    id: 'discount',
    unlocksWhen: 'Always available when editing; hidden only during first-contract create.',
    show: (s) => s.inFirstContractCreate !== true,
  },

  'contact-tabs': {
    id: 'contact-tabs',
    unlocksWhen: 'First visit logged or first client portal open.',
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
