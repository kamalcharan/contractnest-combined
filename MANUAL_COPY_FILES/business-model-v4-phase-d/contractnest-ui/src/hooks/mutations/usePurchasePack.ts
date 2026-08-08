// src/hooks/mutations/usePurchasePack.ts
//
// Buy a credit pack. Mirrors useSubscribeToPlan: one server-side transaction
// raises the pack as a contract under the platform tenant and snapshots its
// grants; credits land when the invoice is paid (fn_apply_topup_grants),
// not on this call, so a paid pack's response comes back with
// credits_pending: true rather than an updated balance.
//
// The buyer is never sent from here — resolved from the request context
// server-side, same as subscribe, so a tenant cannot buy a pack for another.

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import api from '@/services/api';
import { API_ENDPOINTS } from '@/services/serviceURLs';
import { packTemplateKeys } from '@/hooks/queries/usePackTemplates';

export interface PackPurchaseResult {
  contract_id: string;
  contract_number: string;
  contact_id: string;
  pack_name: string;
  amount: number;
  currency: string;
  grants: Record<string, number>;
  credits_pending: boolean;
}

export interface PurchaseError {
  code: string;
  message: string;
}

export const usePurchasePack = () => {
  const queryClient = useQueryClient();
  const { currentTenant } = useAuth();

  return useMutation<PackPurchaseResult, Error, { templateId: string }>({
    mutationFn: async ({ templateId }) => {
      try {
        const response = await api.post(API_ENDPOINTS.CATALOG_STUDIO.TEMPLATES.PACKS_PURCHASE, {
          template_id: templateId,
        });
        if (!response.data?.success) {
          throw new Error(response.data?.error?.message || 'Purchase failed');
        }
        return response.data.data as PackPurchaseResult;
      } catch (err: any) {
        // axios REJECTS on 4xx — same unwrap as useSubscribeToPlan, so the
        // user sees the server's reason (pack not available, not a topup
        // pack…) instead of "Request failed with status code 400".
        const payload = err?.response?.data;
        if (payload?.error?.message) {
          const e = new Error(payload.error.message) as Error & { code?: string };
          e.code = payload.error.code;
          throw e;
        }
        throw err;
      }
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: packTemplateKeys.list(currentTenant?.id) });
      // A free pack (amount 0) grants immediately server-side; a paid one
      // grants only on payment, but the balance shown here is stale either
      // way until the invoice clears, so refetching now is cheap and correct
      // for the free case and harmless for the pending one.
      if (!result.credits_pending) {
        queryClient.invalidateQueries({ queryKey: ['tenant-context'] });
        queryClient.invalidateQueries({ queryKey: ['business-model'] });
      }
    },
  });
};

export default usePurchasePack;
