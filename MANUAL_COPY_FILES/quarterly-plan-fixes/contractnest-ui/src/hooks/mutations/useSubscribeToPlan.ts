// src/hooks/mutations/useSubscribeToPlan.ts
//
// Tenant self-service subscription.
//
// The tenant clicks a plan and ONE server-side transaction does everything:
// creates this tenant's contact in the platform tenant's book (stamped with
// source_tenant_id, which is what ties the subscription back to the tenant
// account), raises the plan contract under the platform tenant, and applies
// the plan's metering to this tenant's t_tenant_context.
//
// The subscriber is never sent from here — it is resolved from the request
// context server-side, so a tenant cannot subscribe another by tampering
// with the payload. Only the plan id travels.
//
// Mid-term plan changes are admin-intervention only, not self-service: if
// the tenant already has ANY active/pending plan contract, subscribe_
// tenant_to_plan refuses with ALREADY_SUBSCRIBED regardless of which
// template is requested. This same call also covers renewal — once the
// prior plan has expired, calling it again raises the new contract with
// its start_date chained onto the prior plan's end_date rather than now(),
// so the term boundary doesn't slide just because the tenant renewed late.

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import api from '@/services/api';
import { API_ENDPOINTS } from '@/services/serviceURLs';
import { planTemplateKeys } from '@/hooks/queries/usePlanTemplates';

export interface PlanSubscriptionResult {
  contract_id: string;
  contract_number: string;
  contact_id: string;
  plan_name: string;
  limits: Record<string, number>;
  grants: Record<string, number>;
  flags: string[];
}

export interface SubscribeError {
  code: string;
  message: string;
}

export const useSubscribeToPlan = () => {
  const queryClient = useQueryClient();
  const { currentTenant } = useAuth();

  return useMutation<PlanSubscriptionResult, Error, { templateId: string }>({
    mutationFn: async ({ templateId }) => {
      try {
        const response = await api.post(API_ENDPOINTS.CATALOG_STUDIO.TEMPLATES.SUBSCRIBE, {
          template_id: templateId,
        });
        if (!response.data?.success) {
          throw new Error(response.data?.error?.message || 'Subscription failed');
        }
        return response.data.data as PlanSubscriptionResult;
      } catch (err: any) {
        // axios REJECTS on 4xx, so the success check above never runs for a
        // refusal — without this the user sees "Request failed with status
        // code 400" instead of the reason the server actually gave
        // (already subscribed, platform tenant, plan not listed…).
        const payload = err?.response?.data;
        if (payload?.error?.message) {
          const e = new Error(payload.error.message) as Error & { code?: string };
          e.code = payload.error.code;
          throw e;
        }
        throw err;
      }
    },
    onSuccess: () => {
      // The plan list shows which plan is current, and the whole point of
      // subscribing is that entitlements changed — so both must refetch.
      queryClient.invalidateQueries({ queryKey: planTemplateKeys.list(currentTenant?.id) });
      queryClient.invalidateQueries({ queryKey: ['tenant-context'] });
      queryClient.invalidateQueries({ queryKey: ['business-model'] });
    },
  });
};

export default useSubscribeToPlan;
