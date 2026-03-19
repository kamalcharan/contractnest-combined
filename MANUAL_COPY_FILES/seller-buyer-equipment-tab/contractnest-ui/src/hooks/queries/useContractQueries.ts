// src/hooks/queries/useContractQueries.ts
// Contract CRUD TanStack Query Hooks — follows useServiceCatalogQueries pattern

import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import api from '@/services/api';
import { API_ENDPOINTS } from '@/services/serviceURLs';
import { captureException } from '@/utils/sentry';
import { vaniToast } from '@/components/common/toast';
import type {
  Contract,
  ContractDetail,
  ContractListResponse,
  ContractGroupedResponse,
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
  grouped: (filters: ContractListFilters) => [...contractKeys.all, 'grouped', { filters }] as const,
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
    retry: 1,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
    networkMode: 'online',
    structuralSharing: true,
  });
};

/**
 * Hook to fetch contracts grouped by buyer (Cycle 3 — grouped portfolio view)
 * Sends group_by=buyer filter; API returns { groups: [...], total_count, page_info }
 */
export const useGroupedContracts = (
  filters: ContractListFilters = {},
  options?: {
    enabled?: boolean;
    refetchOnWindowFocus?: boolean;
  }
) => {
  const { currentTenant } = useAuth();

  // Force group_by=buyer in the filters
  const groupedFilters: ContractListFilters = { ...filters, group_by: 'buyer' };

  return useQuery({
    queryKey: contractKeys.grouped(groupedFilters),
    queryFn: async (): Promise<ContractGroupedResponse> => {
      if (!currentTenant?.id) {
        throw new Error('No tenant selected');
      }

      const url = API_ENDPOINTS.CONTRACTS.LIST_WITH_FILTERS(groupedFilters);
      const response = await api.get(url);

      const data = response.data?.data || response.data;

      if (!data || !data.groups) {
        return {
          groups: [],
          total_count: 0,
          page_info: {
            has_next_page: false,
            has_prev_page: false,
            current_page: 1,
            total_pages: 0,
          },
          filters_applied: groupedFilters,
        };
      }

      return data;
    },
    enabled: !!currentTenant?.id && (options?.enabled !== false),
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: options?.refetchOnWindowFocus ?? false,
    refetchOnReconnect: true,
    retry: 1,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
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
 * @param contractType - Optional perspective filter ('client' for revenue, 'vendor' for expense).
 *                       When provided, stats are scoped to that perspective (including claimed contracts for expense).
 */
export const useContractStats = (contractType?: string, options?: { enabled?: boolean }) => {
  const { currentTenant } = useAuth();

  return useQuery({
    queryKey: [...contractKeys.stats(), contractType || 'all'],
    queryFn: async (): Promise<ContractStatsResponse> => {
      if (!currentTenant?.id) {
        throw new Error('No tenant selected');
      }

      const baseUrl = API_ENDPOINTS.CONTRACTS.STATS;
      const url = contractType
        ? `${baseUrl}?contract_type=${encodeURIComponent(contractType)}`
        : baseUrl;
      const response = await api.get(url);
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
    retry: 1,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
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
  const { toast } = useToast();

  // When true, onSuccess/onError callbacks skip toasts.
  // Used by the wizard's auto-save to avoid noisy "Contract updated" toasts.
  const silentModeRef = React.useRef(false);

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
      // Invalidate detail query so navigating to detail page fetches full data
      // (create response is minimal — missing blocks, vendors, attachments, history)
      queryClient.invalidateQueries({ queryKey: contractKeys.detail(createdContract.id) });

      if (!silentModeRef.current) {
        toast({
          title: 'Success',
          description: `Contract "${createdContract.title}" has been created`,
        });
      }
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.error || error.message || 'Failed to create contract';

      captureException(error, {
        tags: { component: 'useContractOperations', action: 'createContract' },
        extra: { tenantId: currentTenant?.id, errorMessage },
      });

      if (!silentModeRef.current) {
        toast({
          variant: 'destructive',
          title: 'Create Failed',
          description: errorMessage,
        });
      }
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

      if (!silentModeRef.current) {
        toast({
          title: 'Success',
          description: `Contract "${updatedContract.title}" has been updated`,
        });
      }
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

      if (!silentModeRef.current) {
        toast({
          variant: 'destructive',
          title: status === 409 ? 'Version Conflict' : 'Update Failed',
          description: errorMessage,
        });
      }
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
      queryClient.invalidateQueries({ queryKey: contractKeys.lists() });
      queryClient.invalidateQueries({ queryKey: contractKeys.stats() });
      if (updatedContract.id) {
        queryClient.invalidateQueries({ queryKey: contractKeys.detail(updatedContract.id) });
      }

      const displayStatus = (updatedContract.to_status || updatedContract.status || 'updated')
        .replace(/_/g, ' ');
      toast({
        title: 'Status Updated',
        description: `Status changed to ${displayStatus}`,
      });
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.error || error.message || 'Failed to update status';

      captureException(error, {
        tags: { component: 'useContractOperations', action: 'updateStatus' },
        extra: { tenantId: currentTenant?.id, errorMessage },
      });

      toast({
        variant: 'destructive',
        title: 'Status Update Failed',
        description: errorMessage,
      });
    },
  });

  // ── Send Notification (email/WhatsApp sign-off) ──
  const sendNotificationMutation = useMutation({
    mutationFn: async ({
      contractId,
      notifyData,
    }: {
      contractId: string;
      notifyData?: {
        recipient_name?: string;
        recipient_email?: string;
        recipient_mobile?: string;
        recipient_country_code?: string;
      };
    }): Promise<any> => {
      if (!currentTenant?.id) {
        throw new Error('No tenant selected');
      }

      const response = await api.post(
        API_ENDPOINTS.CONTRACTS.NOTIFY(contractId),
        notifyData || {}
      );

      return response.data?.data || response.data;
    },
    onSuccess: () => {
      toast({
        title: 'Notification Sent',
        description: 'Sign-off notification has been sent to the buyer',
      });
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.error || error.message || 'Failed to send notification';

      captureException(error, {
        tags: { component: 'useContractOperations', action: 'sendNotification' },
        extra: { tenantId: currentTenant?.id, errorMessage },
      });

      // Non-fatal: don't show destructive toast, just a warning
      toast({
        title: 'Notification Not Sent',
        description: errorMessage,
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

      toast({
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

      toast({
        variant: 'destructive',
        title: 'Delete Failed',
        description: errorMessage,
      });
    },
  });

  return {
    createContract: createContractMutation.mutateAsync,
    updateContract: updateContractMutation.mutateAsync,
    updateStatus: updateStatusMutation.mutateAsync,
    sendNotification: sendNotificationMutation.mutateAsync,
    deleteContract: deleteContractMutation.mutateAsync,
    isCreating: createContractMutation.isPending,
    isUpdating: updateContractMutation.isPending,
    isChangingStatus: updateStatusMutation.isPending,
    isSendingNotification: sendNotificationMutation.isPending,
    isDeleting: deleteContractMutation.isPending,
    /** Set true before silent draft saves to suppress success/error toasts */
    setSilentMode: (silent: boolean) => { silentModeRef.current = silent; },
  };
};

// ═══════════════════════════════════════════════════════════════════
// BUYER EQUIPMENT HOOKS
// ═══════════════════════════════════════════════════════════════════

/**
 * Mutation: buyer adds equipment to contract
 */
export const useBuyerAddEquipment = () => {
  const queryClient = useQueryClient();
  const { currentTenant } = useAuth();

  return useMutation({
    mutationFn: async ({ contractId, equipmentItem }: { contractId: string; equipmentItem: any }) => {
      const response = await api.post(
        API_ENDPOINTS.CONTRACTS.BUYER_ADD_EQUIPMENT(contractId),
        { equipment_item: equipmentItem }
      );
      return response.data;
    },
    onSuccess: (result, { contractId }) => {
      queryClient.invalidateQueries({ queryKey: contractKeys.detail(contractId) });
      vaniToast.success('Equipment Added', {
        message: 'Your equipment has been added to this contract.',
        duration: 4000,
      });
    },
    onError: (error: any) => {
      const msg = error.response?.data?.error || error.message || 'Failed to add equipment';
      captureException(error, {
        tags: { component: 'useBuyerAddEquipment' },
        extra: { tenantId: currentTenant?.id },
      });
      vaniToast.error('Add Failed', { message: msg, duration: 5000 });
    },
  });
};

/**
 * Mutation: buyer removes their own equipment from contract
 */
export const useBuyerRemoveEquipment = () => {
  const queryClient = useQueryClient();
  const { currentTenant } = useAuth();

  return useMutation({
    mutationFn: async ({ contractId, itemId }: { contractId: string; itemId: string }) => {
      const response = await api.delete(
        API_ENDPOINTS.CONTRACTS.BUYER_REMOVE_EQUIPMENT(contractId),
        { data: { item_id: itemId } }
      );
      return response.data;
    },
    onSuccess: (result, { contractId }) => {
      queryClient.invalidateQueries({ queryKey: contractKeys.detail(contractId) });
      vaniToast.success('Equipment Removed', {
        message: 'Equipment has been removed from this contract.',
        duration: 4000,
      });
    },
    onError: (error: any) => {
      const msg = error.response?.data?.error || error.message || 'Failed to remove equipment';
      captureException(error, {
        tags: { component: 'useBuyerRemoveEquipment' },
        extra: { tenantId: currentTenant?.id },
      });
      vaniToast.error('Remove Failed', { message: msg, duration: 5000 });
    },
  });
};

// ═══════════════════════════════════════════════════════════════════
// SELLER EQUIPMENT HOOKS
// ═══════════════════════════════════════════════════════════════════

/**
 * Mutation: seller adds equipment to contract from detail page
 */
export const useSellerAddEquipment = () => {
  const queryClient = useQueryClient();
  const { currentTenant } = useAuth();

  return useMutation({
    mutationFn: async ({ contractId, equipmentItem }: { contractId: string; equipmentItem: any }) => {
      const response = await api.post(
        API_ENDPOINTS.CONTRACTS.SELLER_ADD_EQUIPMENT(contractId),
        { equipment_item: equipmentItem }
      );
      return response.data;
    },
    onSuccess: (result, { contractId }) => {
      queryClient.invalidateQueries({ queryKey: contractKeys.detail(contractId) });
      vaniToast.success('Equipment Added', {
        message: 'Equipment has been added to this contract.',
        duration: 4000,
      });
    },
    onError: (error: any) => {
      const msg = error.response?.data?.error || error.message || 'Failed to add equipment';
      captureException(error, {
        tags: { component: 'useSellerAddEquipment' },
        extra: { tenantId: currentTenant?.id },
      });
      vaniToast.error('Add Failed', { message: msg, duration: 5000 });
    },
  });
};

/**
 * Mutation: seller removes their own equipment from contract
 */
export const useSellerRemoveEquipment = () => {
  const queryClient = useQueryClient();
  const { currentTenant } = useAuth();

  return useMutation({
    mutationFn: async ({ contractId, itemId }: { contractId: string; itemId: string }) => {
      const response = await api.delete(
        API_ENDPOINTS.CONTRACTS.SELLER_REMOVE_EQUIPMENT(contractId),
        { data: { item_id: itemId } }
      );
      return response.data;
    },
    onSuccess: (result, { contractId }) => {
      queryClient.invalidateQueries({ queryKey: contractKeys.detail(contractId) });
      vaniToast.success('Equipment Removed', {
        message: 'Equipment has been removed from this contract.',
        duration: 4000,
      });
    },
    onError: (error: any) => {
      const msg = error.response?.data?.error || error.message || 'Failed to remove equipment';
      captureException(error, {
        tags: { component: 'useSellerRemoveEquipment' },
        extra: { tenantId: currentTenant?.id },
      });
      vaniToast.error('Remove Failed', { message: msg, duration: 5000 });
    },
  });
};
