// src/hooks/queries/useClientAssetRegistry.ts
// TanStack Query hooks for the Client Asset Registry module

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { vaniToast } from '@/components/common/toast';
import { captureException } from '@/utils/sentry';
import clientAssetRegistryService from '@/services/clientAssetRegistryService';
import type {
  ClientAsset,
  ClientAssetFilters,
  ClientAssetFormData,
  ClientAssetListResponse,
  EquipmentCategory,
} from '@/types/clientAssetRegistry';

// ════════════════════════════════════════════════════════════════════
// QUERY KEYS
// ════════════════════════════════════════════════════════════════════

export const clientAssetKeys = {
  all: ['client-asset-registry'] as const,
  lists: () => [...clientAssetKeys.all, 'list'] as const,
  list: (filters: ClientAssetFilters) => [...clientAssetKeys.lists(), { filters }] as const,
  details: () => [...clientAssetKeys.all, 'detail'] as const,
  detail: (id: string) => [...clientAssetKeys.details(), id] as const,
  children: (parentId: string) => [...clientAssetKeys.all, 'children', parentId] as const,
  equipmentCategories: () => [...clientAssetKeys.all, 'equipment-categories'] as const,
  contractAssets: (contractId: string) => [...clientAssetKeys.all, 'contract-assets', contractId] as const,
};

// ════════════════════════════════════════════════════════════════════
// QUERY HOOKS
// ════════════════════════════════════════════════════════════════════

export const useClientAssets = (
  filters: ClientAssetFilters = {},
  options?: { enabled?: boolean }
) => {
  const { currentTenant } = useAuth();

  return useQuery<ClientAssetListResponse>({
    queryKey: clientAssetKeys.list(filters),
    queryFn: () => clientAssetRegistryService.listAssets(filters),
    enabled: !!currentTenant?.id && (options?.enabled !== false),
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10000),
  });
};

export const useClientAsset = (id: string, options?: { enabled?: boolean }) => {
  const { currentTenant } = useAuth();

  return useQuery<ClientAsset>({
    queryKey: clientAssetKeys.detail(id),
    queryFn: () => clientAssetRegistryService.getAsset(id),
    enabled: !!currentTenant?.id && !!id && (options?.enabled !== false),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
};

export const useClientAssetChildren = (parentAssetId: string, options?: { enabled?: boolean }) => {
  const { currentTenant } = useAuth();

  return useQuery<ClientAsset[]>({
    queryKey: clientAssetKeys.children(parentAssetId),
    queryFn: () => clientAssetRegistryService.getChildren(parentAssetId),
    enabled: !!currentTenant?.id && !!parentAssetId && (options?.enabled !== false),
    staleTime: 3 * 60 * 1000,
  });
};

export const useEquipmentCategories = () => {
  const { currentTenant } = useAuth();

  return useQuery<EquipmentCategory[]>({
    queryKey: clientAssetKeys.equipmentCategories(),
    queryFn: () => clientAssetRegistryService.getEquipmentCategories(),
    enabled: !!currentTenant?.id,
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 2,
  });
};

export const useContractAssets = (contractId: string, options?: { enabled?: boolean }) => {
  const { currentTenant } = useAuth();

  return useQuery({
    queryKey: clientAssetKeys.contractAssets(contractId),
    queryFn: () => clientAssetRegistryService.getContractAssets(contractId),
    enabled: !!currentTenant?.id && !!contractId && (options?.enabled !== false),
    staleTime: 2 * 60 * 1000,
  });
};

// ════════════════════════════════════════════════════════════════════
// MUTATION HOOKS
// ════════════════════════════════════════════════════════════════════

export const useCreateClientAsset = () => {
  const queryClient = useQueryClient();
  const { currentTenant } = useAuth();

  return useMutation({
    mutationFn: (data: ClientAssetFormData) => clientAssetRegistryService.createAsset(data),
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: clientAssetKeys.lists() });

      vaniToast.success('Asset Created', {
        message: `"${created.name}" has been added.`,
        duration: 4000,
      });
    },
    onError: (error: Error) => {
      captureException(error, {
        tags: { component: 'useClientAssetRegistry', action: 'createAsset' },
        extra: { tenantId: currentTenant?.id },
      });

      vaniToast.error('Create Failed', {
        message: error.message || 'Failed to create asset.',
        duration: 5000,
      });
    },
  });
};

export const useUpdateClientAsset = () => {
  const queryClient = useQueryClient();
  const { currentTenant } = useAuth();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ClientAssetFormData> }) =>
      clientAssetRegistryService.updateAsset(id, data),
    onSuccess: (updated) => {
      queryClient.setQueryData(clientAssetKeys.detail(updated.id), updated);
      queryClient.invalidateQueries({ queryKey: clientAssetKeys.lists() });

      vaniToast.success('Asset Updated', {
        message: `"${updated.name}" has been updated.`,
        duration: 4000,
      });
    },
    onError: (error: Error) => {
      captureException(error, {
        tags: { component: 'useClientAssetRegistry', action: 'updateAsset' },
        extra: { tenantId: currentTenant?.id },
      });

      vaniToast.error('Update Failed', {
        message: error.message || 'Failed to update asset.',
        duration: 5000,
      });
    },
  });
};

export const useDeleteClientAsset = () => {
  const queryClient = useQueryClient();
  const { currentTenant } = useAuth();

  return useMutation({
    mutationFn: (id: string) => clientAssetRegistryService.deleteAsset(id),
    onSuccess: (_, deletedId) => {
      queryClient.removeQueries({ queryKey: clientAssetKeys.detail(deletedId) });
      queryClient.invalidateQueries({ queryKey: clientAssetKeys.lists() });

      vaniToast.success('Asset Removed', {
        message: 'The asset has been deactivated.',
        duration: 4000,
      });
    },
    onError: (error: Error) => {
      captureException(error, {
        tags: { component: 'useClientAssetRegistry', action: 'deleteAsset' },
        extra: { tenantId: currentTenant?.id },
      });

      vaniToast.error('Delete Failed', {
        message: error.message || 'Failed to remove asset.',
        duration: 5000,
      });
    },
  });
};

export const useLinkContractAssets = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ contractId, assets }: { contractId: string; assets: Array<{ asset_id: string; coverage_type?: string }> }) =>
      clientAssetRegistryService.linkContractAssets(contractId, assets),
    onSuccess: (_, { contractId }) => {
      queryClient.invalidateQueries({ queryKey: clientAssetKeys.contractAssets(contractId) });
      vaniToast.success('Assets Linked', { message: 'Assets linked to contract.', duration: 3000 });
    },
    onError: (error: Error) => {
      vaniToast.error('Link Failed', { message: error.message || 'Failed to link assets.', duration: 5000 });
    },
  });
};

export const useUnlinkContractAsset = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ contractId, assetId }: { contractId: string; assetId: string }) =>
      clientAssetRegistryService.unlinkContractAsset(contractId, assetId),
    onSuccess: (_, { contractId }) => {
      queryClient.invalidateQueries({ queryKey: clientAssetKeys.contractAssets(contractId) });
      vaniToast.success('Asset Unlinked', { message: 'Asset removed from contract.', duration: 3000 });
    },
    onError: (error: Error) => {
      vaniToast.error('Unlink Failed', { message: error.message || 'Failed to unlink asset.', duration: 5000 });
    },
  });
};

// ════════════════════════════════════════════════════════════════════
// COMBINED MANAGER HOOK
// ════════════════════════════════════════════════════════════════════

export const useClientAssetRegistryManager = (filters: ClientAssetFilters = {}) => {
  const assetsQuery = useClientAssets(filters);
  const createMutation = useCreateClientAsset();
  const updateMutation = useUpdateClientAsset();
  const deleteMutation = useDeleteClientAsset();

  return {
    assets: assetsQuery.data?.data || [],
    pagination: assetsQuery.data?.pagination || null,
    isLoading: assetsQuery.isLoading,
    isError: assetsQuery.isError,
    error: assetsQuery.error,

    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isMutating: createMutation.isPending || updateMutation.isPending || deleteMutation.isPending,

    createAsset: createMutation.mutateAsync,
    updateAsset: updateMutation.mutateAsync,
    deleteAsset: deleteMutation.mutateAsync,

    refetch: assetsQuery.refetch,
  };
};

export default useClientAssetRegistryManager;
