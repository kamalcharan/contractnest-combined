// src/hooks/queries/usePlanTemplates.ts
//
// The plan catalogue a tenant can subscribe to — ContractNest's own commercial
// model, authored by the platform tenant as ordinary contract templates and
// served read-only across the tenant boundary by /templates/plans.
//
// Nothing here knows what a plan costs or what it grants: price, term, limits
// and credit grants all come from the template's metering blocks, authored by
// a human in catalog-studio. That is the whole point — no plan constant has a
// home in application code.

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import api from '@/services/api';
import { API_ENDPOINTS } from '@/services/serviceURLs';

export interface PlanTemplate {
  id: string;
  name: string;
  description: string | null;
  /**
   * The template's category — 'service_delivery' for the three capped plans,
   * 'per_contract' for the one pay-as-you-go template. Only 'per_contract' is
   * acted on by the UI today, but this is returned generically rather than a
   * one-off boolean so a future distinct category doesn't need another field.
   */
  category: string;
  currency: string;
  /** 0 is a real price — the Free tier — not "unpriced". Also 0, differently,
   *  for the 'per_contract' template: nothing is paid upfront there either.
   *  This is the TERM TOTAL, not what is charged per payment — see `billing`. */
  price: number;
  term: { value: number | null; unit: string | null };
  /**
   * How `price` is actually collected, derived server-side from the priced
   * billing block's own cadence. Quarterly's ₹23,996 is 4 × ₹5,999 billed
   * quarterly — showing only the term total made the card read as if that
   * were the amount due today. null when the plan has no priced block (Free).
   */
  billing: {
    /** 'prepaid' = one upfront payment; otherwise monthly/quarterly/etc. */
    cycle: string;
    /** What is charged per payment. Equals `price` when cycle is 'prepaid'. */
    installment_amount: number;
    /** How many payments across the term. 1 when 'prepaid'. */
    installments: number;
  } | null;
  /**
   * What the plan may CREATE, e.g. { contracts: 3, rfqs: 0 }.
   * 0 means zero. There is no unlimited plan. Empty for 'per_contract' — it
   * has no cap, that is the point of the mode.
   */
  limits: Record<string, number>;
  /** Notification credits granted per creation event, keyed by channel. */
  grants: Record<string, number>;
  /**
   * Paise charged per creation, keyed the same as limits — only populated on
   * the 'per_contract' template. trg_fn_wallet_charge (DB) reads the SAME
   * template row live, so this is never a stale copy of the real rate.
   */
  rates: Record<string, number>;
  /** Add-on flags the plan switches on, e.g. addon_vani_ai. */
  flags: string[];
  updated_at: string | null;
}

/**
 * Whether the seller behind this catalogue can actually be paid — returned
 * alongside the plans so the page can refuse to start a purchase it knows
 * cannot finish, rather than discovering it at the checkout step after a
 * contract and invoice already exist.
 *
 * `online` and `offline_upi` are separate on purpose: offline UPI collects
 * money but cannot run a card checkout, so a tenant with only offline UPI is
 * `can_collect: true, online: false` and must not be offered Razorpay.
 */
export interface SellerCapability {
  name: string | null;
  can_collect: boolean;
  online: boolean;
  offline_upi: boolean;
}

export interface PlanTemplatesResponse {
  success: boolean;
  data?: {
    plans: PlanTemplate[];
    count: number;
    /** Absent on older API responses — treat undefined as "unknown", not "cannot". */
    seller?: SellerCapability;
    /**
     * The plan this tenant is already on, or null. Resolved server-side from
     * the active plan contract, so the page and the subscribe guard can never
     * disagree about who is subscribed to what.
     */
    current_plan_id: string | null;
    current_contract_number: string | null;
  };
}

export const planTemplateKeys = {
  all: ['plan-templates'] as const,
  // Keyed by tenant only — NOT by environment. ContractNest's own commercial
  // model is always live: a tenant switching to its test environment is on the
  // same real plan and must see the same catalogue, so there is nothing to
  // partition the cache by.
  list: (tenantId?: string) => [...planTemplateKeys.all, tenantId] as const,
};

export const usePlanTemplates = () => {
  const { currentTenant } = useAuth();

  return useQuery({
    queryKey: planTemplateKeys.list(currentTenant?.id),
    queryFn: async (): Promise<PlanTemplatesResponse> => {
      if (!currentTenant?.id) throw new Error('Missing tenant');
      const response = await api.get(API_ENDPOINTS.CATALOG_STUDIO.TEMPLATES.PLANS);
      return response.data;
    },
    enabled: !!currentTenant?.id,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
};

export default usePlanTemplates;
