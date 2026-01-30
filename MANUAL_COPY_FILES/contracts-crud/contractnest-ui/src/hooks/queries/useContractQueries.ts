// src/hooks/queries/useContractQueries.ts
// Contract CRUD TanStack Query Hooks — follows useServiceCatalogQueries pattern

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import toast from 'react-hot-toast';
import api from '@/services/api';
import { API_ENDPOINTS } from '@/services/serviceURLs';
import { captureException } from '@/utils/sentry';
import type {
  Contract,
  ContractDetail,
  ContractListResponse,
  ContractStatsResponse,
  ContractListFilters,
  CreateContractRequest,
  UpdateContractRequest,
  UpdateContractStatusRequest,
} from '@/types/contracts';

// =================================================================
// QUERY KEYS
// =================================================================

export const contractKeys = {
  all: ['contracts'] as const,
  lists: () => [...contractKeys.all, 'list'] as const,
  list: (filters: ContractListFilters) => [...contractKeys.lists(), { filters }] as const,
  details: () => [...contractKeys.all, 'detail'] as const,
  detail: (id: string) => [...contractKeys.details(), id] as const,
  stats: () => [...contractKeys.all, 'stats'] as const,
};

// =================================================================
// QUERY HOOKS
// =================================================================

/**
 * Hook to fetch paginated, filtered list of contracts
 */
export const useContracts = (
  filters: ContractListFilters = {},
  options?: {
    enabled?: boolean;
    refetchOnWindowFocus?: boolean;
  }
) => {
  const { currentTenant } = useAuth();

  return useQuery({
    queryKey: contractKeys.list(filters),
    queryFn: async (): Promise<ContractListResponse> => {
      if (!currentTenant?.id) {
        throw new Error('No tenant selected');
      }

      const url = API_ENDPOINTS.CONTRACTS.LIST_WITH_FILTERS(filters);
      const response = await api.get(url);

      const data = response.data?.data || response.data;

      if (!data) {
        return {
          items: [],
          total_count: 0,
          page_info: {
            has_next_page: false,
            has_prev_page: false,
            current_page: 1,
            total_pages: 0,
          },
          filters_applied: filters,
        };
      }

      return data;
    },
    enabled: !!currentTenant?.id && (options?.enabled !== false),
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: options?.refetchOnWindowFocus ?? false,
    refetchOnReconnect: true,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    networkMode: 'online',
    structuralSharing: true,
  });
};

/**
 * Hook to fetch a single contract by ID (with blocks, vendors, attachments, history)
 */
export const useContract = (contractId: string | null) => {
  const { currentTenant } = useAuth();

  return useQuery({
    queryKey: contractKeys.detail(contractId || ''),
    queryFn: async (): Promise<ContractDetail> => {
      if (!contractId || !currentTenant?.id) {
        throw new Error('Contract ID and tenant are required');
      }

      const response = await api.get(API_ENDPOINTS.CONTRACTS.GET(contractId));
      const data = response.data?.data || response.data;

      if (!data) {
        throw new Error('Contract not found');
      }

      return data;
    },
    enabled: !!contractId && !!currentTenant?.id,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 3,
  });
};

/**
 * Hook to fetch contract dashboard stats (counts by status, by type, totals)
 */
export const useContractStats = (options?: { enabled?: boolean }) => {
  const { currentTenant } = useAuth();

  return useQuery({
    queryKey: contractKeys.stats(),
    queryFn: async (): Promise<ContractStatsResponse> => {
      if (!currentTenant?.id) {
        throw new Error('No tenant selected');
      }

      const response = await api.get(API_ENDPOINTS.CONTRACTS.STATS);
      const data = response.data?.data || response.data;

      return data || {
        total: 0,
        by_status: {},
        by_record_type: {},
        by_contract_type: {},
        total_value: 0,
        currency_breakdown: [],
      };
    },
    enabled: !!currentTenant?.id && (options?.enabled !== false),
    staleTime: 3 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    networkMode: 'online',
    structuralSharing: true,
  });
};

// =================================================================
// MUTATION HOOKS
// =================================================================

/**
 * Hook for contract CRUD operations (create, update, delete, status change)
 */
export const useContractOperations = () => {
  const { currentTenant } = useAuth();
  const queryClient = useQueryClient();
  const { toast: shadcnToast } = useToast();

  // ── Create ──
  const createContractMutation = useMutation({
    mutationFn: async (contractData: CreateContractRequest): Promise<Contract> => {
      if (!currentTenant?.id) {
        throw new Error('No tenant selected');
      }

      const response = await api.post(API_ENDPOINTS.CONTRACTS.CREATE, contractData, {
        headers: {
          'x-idempotency-key': `create-contract-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        },
      });

      return response.data?.data || response.data;
    },
    onSuccess: (createdContract) => {
      queryClient.invalidateQueries({ queryKey: contractKeys.lists() });
      queryClient.invalidateQueries({ queryKey: contractKeys.stats() });
      queryClient.setQueryData(contractKeys.detail(createdContract.id), createdContract);

      toast.success('Contract created successfully', {
        duration: 3000,
        style: { background: '#10B981', color: '#FFF' },
      });

      shadcnToast({
        title: 'Success',
        description: `Contract "${createdContract.title}" has been created`,
      });
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.error || error.message || 'Failed to create contract';

      captureException(error, {
        tags: { component: 'useContractOperations', action: 'createContract' },
        extra: { tenantId: currentTenant?.id, errorMessage },
      });

      toast.error(`Create Error: ${errorMessage}`, {
        duration: 4000,
        style: { background: '#EF4444', color: '#FFF' },
      });

      shadcnToast({
        variant: 'destructive',
        title: 'Create Failed',
        description: errorMessage,
      });
    },
  });

  // ── Update (optimistic concurrency via version) ──
  const updateContractMutation = useMutation({
    mutationFn: async ({
      contractId,
      contractData,
    }: {
      contractId: string;
      contractData: UpdateContractRequest;
    }): Promise<Contract> => {
      if (!currentTenant?.id) {
        throw new Error('No tenant selected');
      }

      const response = await api.put(
        API_ENDPOINTS.CONTRACTS.UPDATE(contractId),
        contractData,
        {
          headers: {
            'x-idempotency-key': `update-contract-${contractId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          },
        }
      );

      return response.data?.data || response.data;
    },
    onSuccess: (updatedContract) => {
      queryClient.setQueryData(contractKeys.detail(updatedContract.id), updatedContract);
      queryClient.invalidateQueries({ queryKey: contractKeys.lists() });
      queryClient.invalidateQueries({ queryKey: contractKeys.stats() });

      toast.success('Contract updated successfully', {
        duration: 3000,
        style: { background: '#10B981', color: '#FFF' },
      });

      shadcnToast({
        title: 'Success',
        description: `Contract "${updatedContract.title}" has been updated`,
      });
    },
    onError: (error: any) => {
      const status = error.response?.status;
      const errorMessage =
        status === 409
          ? 'This contract was modified by someone else. Please refresh and try again.'
          : error.response?.data?.error || error.message || 'Failed to update contract';

      captureException(error, {
        tags: { component: 'useContractOperations', action: 'updateContract' },
        extra: { tenantId: currentTenant?.id, errorMessage, httpStatus: status },
      });

      toast.error(status === 409 ? 'Version conflict — refresh and retry' : `Update Error: ${errorMessage}`, {
        duration: 5000,
        style: { background: '#EF4444', color: '#FFF' },
      });

      shadcnToast({
        variant: 'destructive',
        title: status === 409 ? 'Version Conflict' : 'Update Failed',
        description: errorMessage,
      });
    },
  });

  // ── Status Change ──
  const updateStatusMutation = useMutation({
    mutationFn: async ({
      contractId,
      statusData,
    }: {
      contractId: string;
      statusData: UpdateContractStatusRequest;
    }): Promise<Contract> => {
      if (!currentTenant?.id) {
        throw new Error('No tenant selected');
      }

      const response = await api.patch(
        API_ENDPOINTS.CONTRACTS.UPDATE_STATUS(contractId),
        statusData
      );

      return response.data?.data || response.data;
    },
    onSuccess: (updatedContract) => {
      queryClient.setQueryData(contractKeys.detail(updatedContract.id), updatedContract);
      queryClient.invalidateQueries({ queryKey: contractKeys.lists() });
      queryClient.invalidateQueries({ queryKey: contractKeys.stats() });

      toast.success(`Status changed to ${updatedContract.status.replace(/_/g, ' ')}`, {
        duration: 3000,
        style: { background: '#10B981', color: '#FFF' },
      });
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.error || error.message || 'Failed to update status';

      captureException(error, {
        tags: { component: 'useContractOperations', action: 'updateStatus' },
        extra: { tenantId: currentTenant?.id, errorMessage },
      });

      toast.error(`Status Error: ${errorMessage}`, {
        duration: 4000,
        style: { background: '#EF4444', color: '#FFF' },
      });
    },
  });

  // ── Soft Delete (draft/cancelled only) ──
  const deleteContractMutation = useMutation({
    mutationFn: async (contractId: string): Promise<void> => {
      if (!currentTenant?.id) {
        throw new Error('No tenant selected');
      }

      await api.delete(API_ENDPOINTS.CONTRACTS.DELETE(contractId), {
        headers: {
          'x-idempotency-key': `delete-contract-${contractId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        },
      });
    },
    onSuccess: (_, contractId) => {
      queryClient.removeQueries({ queryKey: contractKeys.detail(contractId) });
      queryClient.invalidateQueries({ queryKey: contractKeys.lists() });
      queryClient.invalidateQueries({ queryKey: contractKeys.stats() });

      toast.success('Contract deleted', {
        duration: 3000,
        style: { background: '#10B981', color: '#FFF' },
      });

      shadcnToast({
        title: 'Deleted',
        description: 'Contract has been removed',
      });
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.error || error.message || 'Failed to delete contract';

      captureException(error, {
        tags: { component: 'useContractOperations', action: 'deleteContract' },
        extra: { tenantId: currentTenant?.id, errorMessage },
      });

      toast.error(`Delete Error: ${errorMessage}`, {
        duration: 4000,
        style: { background: '#EF4444', color: '#FFF' },
      });
    },
  });

  return {
    createContract: createContractMutation.mutateAsync,
    updateContract: updateContractMutation.mutateAsync,
    updateStatus: updateStatusMutation.mutateAsync,
    deleteContract: deleteContractMutation.mutateAsync,
    isCreating: createContractMutation.isPending,
    isUpdating: updateContractMutation.isPending,
    isChangingStatus: updateStatusMutation.isPending,
    isDeleting: deleteContractMutation.isPending,
  };
};
