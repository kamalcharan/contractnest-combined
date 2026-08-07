// src/hooks/queries/useTenantContext.ts
//
// The tenant's own balance sheet: which plan, what it may create, what it has
// used, what credits are in the pools, which add-ons are on.
//
// Backed by get_tenant_context. Its `subscription` block is resolved from the
// plan CONTRACT under the platform tenant — the same source_tenant_id link
// /plans and subscribe_tenant_to_plan use — so the plan page, the subscribe
// guard and this page can never disagree about what a tenant is on.
//
// NOT environment-scoped. ContractNest's commercial model is always live: a
// tenant working in its test environment is still on the same real plan.

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import api from '@/services/api';
import { API_ENDPOINTS } from '@/services/serviceURLs';

export interface TenantContextSubscription {
  id: string | null;
  contract_id: string | null;
  contract_number: string | null;
  plan_template_id: string | null;
  plan_name: string | null;
  status: string | null;
  period_start: string | null;
  period_end: string | null;
  amount: number | null;
  currency: string | null;
  next_billing_date: string | null;
}

export interface TenantContext {
  success: boolean;
  tenant_id: string;
  /** 'plan' | 'wallet' | 'freemium' | 'exempt' */
  billing_mode: string | null;
  subscription: TenantContextSubscription;
  /**
   * What the plan may CREATE. A number is a cap and 0 means zero — a seller
   * plan leaves rfqs at 0 deliberately. null means unlimited, which in
   * practice only the exempt platform tenant ever sees.
   */
  limits: {
    users: number | null;
    contracts: number | null;
    rfqs: number | null;
    contacts: number | null;
    templates: number | null;
    storage_mb: number | null;
  };
  usage: {
    users: number;
    contracts: number;
    rfqs: number;
    contacts: number;
    templates: number;
    storage_mb: number;
  };
  credits: {
    whatsapp: number;
    sms: number;
    email: number;
    inapp: number;
    pooled: number;
  };
  /** Credits granted per creation event, keyed by channel. Config, not balance. */
  credit_grant_rates: Record<string, number>;
  addons: { vani_ai: boolean; rfp: boolean };
  flags: {
    can_access: boolean;
    can_send_whatsapp: boolean;
    can_send_sms: boolean;
    can_send_email: boolean;
    can_send_inapp: boolean;
    credits_low: boolean;
    /** Within 80% of a metered allowance. Mutually exclusive with over_limit. */
    near_limit: boolean;
    /**
     * At or past a metered allowance. ADVISORY ONLY — nothing blocks on it.
     * The owner's ruling is soft enforcement: a tenant who goes over is told
     * clearly, with the upgrade one click away, but is never stopped
     * mid-work. Do not turn this into a disabled button.
     */
    over_limit: boolean;
  };
}

export const tenantContextKeys = {
  all: ['tenant-context'] as const,
  detail: (tenantId?: string) => [...tenantContextKeys.all, tenantId] as const,
};

export const useTenantContext = () => {
  const { currentTenant } = useAuth();

  return useQuery({
    queryKey: tenantContextKeys.detail(currentTenant?.id),
    queryFn: async (): Promise<TenantContext> => {
      if (!currentTenant?.id) throw new Error('Missing tenant');
      const response = await api.get(API_ENDPOINTS.TENANT_CONTEXT.BASE);
      // The edge returns the RPC payload directly; the API may wrap it in
      // { success, data }. Accept both rather than guessing.
      return (response.data?.data ?? response.data) as TenantContext;
    },
    enabled: !!currentTenant?.id,
    // Entitlements change the moment a contract is created, so this is kept
    // short-lived rather than the usual 5 minutes.
    staleTime: 30 * 1000,
  });
};

export default useTenantContext;
