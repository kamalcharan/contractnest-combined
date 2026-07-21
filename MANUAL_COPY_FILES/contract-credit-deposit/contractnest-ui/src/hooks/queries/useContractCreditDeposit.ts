// src/hooks/queries/useContractCreditDeposit.ts
// Contract-level Credit & Deposit TanStack Query Hooks
// Mirrors useInvoiceQueries.ts's useCancelInvoice pattern.

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import api from '@/services/api';
import { API_ENDPOINTS } from '@/services/serviceURLs';
import { captureException } from '@/utils/sentry';
import { contractKeys } from './useContractQueries';
import type {
  SetContractCreditPayload,
  SetContractDepositPayload,
  BuyerPendingCredit,
  ApplyBuyerCreditResponse,
} from '@/types/contracts';

// =================================================================
// MUTATION: Set Credit
// =================================================================

export const useSetContractCredit = (contractId: string | undefined) => {
  const { currentTenant } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: SetContractCreditPayload) => {
      if (!currentTenant?.id || !contractId) {
        throw new Error('Missing tenant or contract ID');
      }
      const response = await api.post(API_ENDPOINTS.CONTRACTS.SET_CREDIT(contractId), payload);
      const result = response.data?.data || response.data;
      if (result?.success === false) {
        throw new Error(result.error || 'Failed to set credit');
      }
      return result;
    },
    onSuccess: () => {
      if (contractId) {
        queryClient.invalidateQueries({ queryKey: contractKeys.detail(contractId) });
      }
    },
    meta: {
      onError: (error: any) => {
        captureException(error, {
          tags: { component: 'useSetContractCredit' },
          extra: { contractId, tenantId: currentTenant?.id },
        });
      },
    },
  });
};

// =================================================================
// QUERY: Find Buyer Pending Credits
// =================================================================

export const useBuyerPendingCredits = (
  buyerId: string | undefined,
  excludeContractId: string | undefined,
  options?: { enabled?: boolean }
) => {
  const { currentTenant } = useAuth();

  return useQuery({
    queryKey: ['contracts', 'credit-pending', buyerId, excludeContractId],
    queryFn: async (): Promise<BuyerPendingCredit[]> => {
      if (!currentTenant?.id || !buyerId) {
        throw new Error('Missing tenant or buyer ID');
      }
      const response = await api.get(
        API_ENDPOINTS.CONTRACTS.FIND_BUYER_PENDING_CREDITS(buyerId, excludeContractId)
      );
      const result = response.data?.data || response.data;
      if (result?.success === false) {
        throw new Error(result.error || 'Failed to fetch pending credits');
      }
      return result?.data || [];
    },
    enabled: !!currentTenant?.id && !!buyerId && (options?.enabled !== false),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
    meta: {
      onError: (error: any) => {
        captureException(error, {
          tags: { component: 'useBuyerPendingCredits' },
          extra: { buyerId, tenantId: currentTenant?.id },
        });
      },
    },
  });
};

// =================================================================
// MUTATION: Apply Buyer Credit
// =================================================================

export const useApplyBuyerCredit = (targetContractId: string | undefined) => {
  const { currentTenant } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (sourceContractId: string): Promise<ApplyBuyerCreditResponse> => {
      if (!currentTenant?.id || !targetContractId) {
        throw new Error('Missing tenant or contract ID');
      }
      const response = await api.post(API_ENDPOINTS.CONTRACTS.APPLY_CREDIT(targetContractId), {
        source_contract_id: sourceContractId,
      });
      const result = response.data?.data || response.data;
      if (result?.success === false) {
        throw new Error(result.error || 'Failed to apply credit');
      }
      return result;
    },
    onSuccess: (_data, sourceContractId) => {
      if (targetContractId) {
        queryClient.invalidateQueries({ queryKey: contractKeys.detail(targetContractId) });
      }
      queryClient.invalidateQueries({ queryKey: contractKeys.detail(sourceContractId) });
    },
    meta: {
      onError: (error: any) => {
        captureException(error, {
          tags: { component: 'useApplyBuyerCredit' },
          extra: { targetContractId, tenantId: currentTenant?.id },
        });
      },
    },
  });
};

// =================================================================
// MUTATION: Set Deposit
// =================================================================

export const useSetContractDeposit = (contractId: string | undefined) => {
  const { currentTenant } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: SetContractDepositPayload) => {
      if (!currentTenant?.id || !contractId) {
        throw new Error('Missing tenant or contract ID');
      }
      const response = await api.post(API_ENDPOINTS.CONTRACTS.SET_DEPOSIT(contractId), payload);
      const result = response.data?.data || response.data;
      if (result?.success === false) {
        throw new Error(result.error || 'Failed to set deposit');
      }
      return result;
    },
    onSuccess: () => {
      if (contractId) {
        queryClient.invalidateQueries({ queryKey: contractKeys.detail(contractId) });
      }
    },
    meta: {
      onError: (error: any) => {
        captureException(error, {
          tags: { component: 'useSetContractDeposit' },
          extra: { contractId, tenantId: currentTenant?.id },
        });
      },
    },
  });
};

// =================================================================
// MUTATION: Reclaim Deposit
// =================================================================

export const useReclaimContractDeposit = (contractId: string | undefined) => {
  const { currentTenant } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!currentTenant?.id || !contractId) {
        throw new Error('Missing tenant or contract ID');
      }
      const response = await api.post(API_ENDPOINTS.CONTRACTS.RECLAIM_DEPOSIT(contractId), {});
      const result = response.data?.data || response.data;
      if (result?.success === false) {
        throw new Error(result.error || 'Failed to reclaim deposit');
      }
      return result;
    },
    onSuccess: () => {
      if (contractId) {
        queryClient.invalidateQueries({ queryKey: contractKeys.detail(contractId) });
      }
    },
    meta: {
      onError: (error: any) => {
        captureException(error, {
          tags: { component: 'useReclaimContractDeposit' },
          extra: { contractId, tenantId: currentTenant?.id },
        });
      },
    },
  });
};
