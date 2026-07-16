// src/utils/catalog-studio/cadencePricing.ts
// Cadence (cyclical) pricing — shared types, constants and math.
// Owner-approved model (see SPRINT_REFERENCES/6-cadence-pricing.html):
//   - A block's price is anchored to an explicit, CAPTURED base:
//     "Total price X for Y months" (never an assumed 1-year timeline).
//   - Per-cadence rates (monthly / quarterly / 6-months / annual) are defined
//     against that anchor; one enabled cadence is the tenant-defined default.
//   - Sellers propose a cadence in the contract wizard; the buyer may pick any
//     offered cadence at review and sign (wizard/buyer support lands in later
//     steps — this module is the single source of truth for all of them).
// Storage: these fields ride inside each PricingRecord in block meta (JSONB) —
// no DB migration required on the catalog side.

export type CadenceCycleId = 'monthly' | 'quarterly' | 'halfyearly' | 'annual';

export interface CadenceRate {
  cycle: CadenceCycleId;
  /** Per-period rate for this cadence (e.g. 4500 per quarter). */
  amount: number;
  /** Only enabled cadences are offered to sellers / buyers. */
  enabled: boolean;
}

export interface CadenceCycleDef {
  id: CadenceCycleId;
  label: string;
  per: string;
  monthsPerPeriod: number;
}

export const CADENCE_CYCLES: CadenceCycleDef[] = [
  { id: 'monthly',    label: 'Monthly',   per: 'per month',    monthsPerPeriod: 1 },
  { id: 'quarterly',  label: 'Quarterly', per: 'per quarter',  monthsPerPeriod: 3 },
  { id: 'halfyearly', label: '6 Months',  per: 'per 6 months', monthsPerPeriod: 6 },
  { id: 'annual',     label: 'Annual',    per: 'per year',     monthsPerPeriod: 12 },
];

export const getCadenceCycle = (id: string): CadenceCycleDef | undefined =>
  CADENCE_CYCLES.find((c) => c.id === id);

/** Fresh rate rows for a record that just switched to cadence pricing. */
export const createDefaultCadenceRates = (): CadenceRate[] =>
  CADENCE_CYCLES.map((c) => ({ cycle: c.id, amount: 0, enabled: false }));

/**
 * The pro-rata "fair" per-period rate implied by the captured anchor.
 * fair = baseAmount × (monthsPerPeriod / baseMonths). Null when the anchor
 * is incomplete — callers show "set a base price first" style hints.
 */
export const fairCadenceRate = (
  baseAmount: number | undefined,
  baseMonths: number | undefined,
  monthsPerPeriod: number
): number | null => {
  if (!baseAmount || !baseMonths || baseAmount <= 0 || baseMonths <= 0) return null;
  return (baseAmount * monthsPerPeriod) / baseMonths;
};

/** Percentage deviation of a rate vs the anchor-fair value (±0.5% counts as par). */
export const cadenceDeltaPct = (rate: number, fair: number): number =>
  ((rate - fair) / fair) * 100;

/** Fields a cadence-priced PricingRecord carries (all optional — absent = single price). */
export interface CadencePricingFields {
  /** 'single' (default, today's behavior) or 'cadence'. */
  pricing_scheme?: 'single' | 'cadence';
  /** Y in "Total price X for Y months" — X is the record's existing `amount`. */
  base_term_months?: number;
  cadence_rates?: CadenceRate[];
  /** Pre-selected cadence when the block is added to a contract. Must be enabled. */
  default_cadence?: CadenceCycleId;
}

/** Validation for a cadence-priced record — returns human-readable problems. */
export const validateCadencePricing = (rec: {
  amount: number;
  pricing_scheme?: string;
  base_term_months?: number;
  cadence_rates?: CadenceRate[];
  default_cadence?: string;
}): string[] => {
  if (rec.pricing_scheme !== 'cadence') return [];
  const errors: string[] = [];
  if (!rec.amount || rec.amount <= 0) errors.push('Cadence pricing needs a base total price');
  if (!rec.base_term_months || rec.base_term_months <= 0) errors.push('Cadence pricing needs a base term (months)');
  const enabled = (rec.cadence_rates || []).filter((r) => r.enabled && r.amount > 0);
  if (enabled.length === 0) errors.push('Enable at least one cadence with a rate');
  if (enabled.length > 0 && (!rec.default_cadence || !enabled.some((r) => r.cycle === rec.default_cadence))) {
    errors.push('Pick a default cadence (it must be an enabled one)');
  }
  return errors;
};
