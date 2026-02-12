// src/hooks/queries/useAssetRegistry.ts
// TanStack Query hooks for the Asset Registry module (Equipment & Entity)

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { vaniToast } from '@/components/common/toast';
import { captureException } from '@/utils/sentry';
import assetRegistryService from '@/services/assetRegistryService';
import type {
  TenantAsset,
  AssetRegistryFilters,
  AssetFormData,
  AssetListResponse,
  EquipmentCategory,
} from '@/types/assetRegistry';

// ════════════════════════════════════════════════════════════════════
// QUERY KEYS
// ════════════════════════════════════════════════════════════════════

export const assetRegistryKeys = {
  all: ['asset-registry'] as const,
  lists: () => [...assetRegistryKeys.all, 'list'] as const,
  list: (filters: AssetRegistryFilters) => [...assetRegistryKeys.lists(), { filters }] as const,
  details: () => [...assetRegistryKeys.all, 'detail'] as const,
  detail: (id: string) => [...assetRegistryKeys.details(), id] as const,
  children: (parentId: string) => [...assetRegistryKeys.all, 'children', parentId] as const,
  equipmentCategories: () => [...assetRegistryKeys.all, 'equipment-categories'] as const,
};

// ════════════════════════════════════════════════════════════════════
// QUERY HOOKS
// ════════════════════════════════════════════════════════════════════

/**
 * List assets with optional filters
 */
export const useAssets = (
  filters: AssetRegistryFilters = {},
  options?: { enabled?: boolean }
) => {
  const { currentTenant } = useAuth();

  return useQuery<AssetListResponse>({
    queryKey: assetRegistryKeys.list(filters),
    queryFn: () => assetRegistryService.listAssets(filters),
    enabled: !!currentTenant?.id && (options?.enabled !== false),
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    retry: 1,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10000),
  });
};

/**
 * Get a single asset by ID
 */
export const useAsset = (id: string, options?: { enabled?: boolean }) => {
  const { currentTenant } = useAuth();

  return useQuery<TenantAsset>({
    queryKey: assetRegistryKeys.detail(id),
    queryFn: () => assetRegistryService.getAsset(id),
    enabled: !!currentTenant?.id && !!id && (options?.enabled !== false),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
};

/**
 * Get child assets of a parent
 */
export const useAssetChildren = (parentAssetId: string, options?: { enabled?: boolean }) => {
  const { currentTenant } = useAuth();

  return useQuery<TenantAsset[]>({
    queryKey: assetRegistryKeys.children(parentAssetId),
    queryFn: () => assetRegistryService.getChildren(parentAssetId),
    enabled: !!currentTenant?.id && !!parentAssetId && (options?.enabled !== false),
    staleTime: 3 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
};

/**
 * Fetch equipment categories (resource types where parent_type_id = 'equipment')
 * Long staleTime because categories rarely change.
 */
export const useEquipmentCategories = () => {
  const { currentTenant } = useAuth();

  return useQuery<EquipmentCategory[]>({
    queryKey: assetRegistryKeys.equipmentCategories(),
    queryFn: () => assetRegistryService.getEquipmentCategories(),
    enabled: !!currentTenant?.id,
    staleTime: 10 * 60 * 1000,    // 10 minutes
    gcTime: 30 * 60 * 1000,       // 30 minutes
    refetchOnWindowFocus: false,
    retry: 2,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10000),
  });
};

// ════════════════════════════════════════════════════════════════════
// MUTATION HOOKS
// ════════════════════════════════════════════════════════════════════

/**
 * Create a new asset
 */
export const useCreateAsset = () => {
  const queryClient = useQueryClient();
  const { currentTenant } = useAuth();

  return useMutation({
    mutationFn: (data: AssetFormData) => assetRegistryService.createAsset(data),
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: assetRegistryKeys.lists() });

      vaniToast.success('Equipment Created', {
        message: `"${created.name}" has been added to your registry.`,
        duration: 4000,
      });
    },
    onError: (error: Error) => {
      captureException(error, {
        tags: { component: 'useAssetRegistry', action: 'createAsset' },
        extra: { tenantId: currentTenant?.id },
      });

      vaniToast.error('Create Failed', {
        message: error.message || 'Failed to create equipment.',
        duration: 5000,
      });
    },
  });
};

/**
 * Update an existing asset
 */
export const useUpdateAsset = () => {
  const queryClient = useQueryClient();
  const { currentTenant } = useAuth();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<AssetFormData> }) =>
      assetRegistryService.updateAsset(id, data),
    onSuccess: (updated) => {
      queryClient.setQueryData(assetRegistryKeys.detail(updated.id), updated);
      queryClient.invalidateQueries({ queryKey: assetRegistryKeys.lists() });

      vaniToast.success('Equipment Updated', {
        message: `"${updated.name}" has been updated.`,
        duration: 4000,
      });
    },
    onError: (error: Error) => {
      captureException(error, {
        tags: { component: 'useAssetRegistry', action: 'updateAsset' },
        extra: { tenantId: currentTenant?.id },
      });

      vaniToast.error('Update Failed', {
        message: error.message || 'Failed to update equipment.',
        duration: 5000,
      });
    },
  });
};

/**
 * Soft-delete an asset
 */
export const useDeleteAsset = () => {
  const queryClient = useQueryClient();
  const { currentTenant } = useAuth();

  return useMutation({
    mutationFn: (id: string) => assetRegistryService.deleteAsset(id),
    onSuccess: (_, deletedId) => {
      queryClient.removeQueries({ queryKey: assetRegistryKeys.detail(deletedId) });
      queryClient.invalidateQueries({ queryKey: assetRegistryKeys.lists() });

      vaniToast.success('Equipment Removed', {
        message: 'The equipment has been deactivated.',
        duration: 4000,
      });
    },
    onError: (error: Error) => {
      captureException(error, {
        tags: { component: 'useAssetRegistry', action: 'deleteAsset' },
        extra: { tenantId: currentTenant?.id },
      });

      vaniToast.error('Delete Failed', {
        message: error.message || 'Failed to remove equipment.',
        duration: 5000,
      });
    },
  });
};

// ════════════════════════════════════════════════════════════════════
// COMBINED MANAGER HOOK
// ════════════════════════════════════════════════════════════════════

export const useAssetRegistryManager = (filters: AssetRegistryFilters = {}) => {
  const assetsQuery = useAssets(filters);
  const createMutation = useCreateAsset();
  const updateMutation = useUpdateAsset();
  const deleteMutation = useDeleteAsset();

  return {
    // Data
    assets: assetsQuery.data?.data || [],
    pagination: assetsQuery.data?.pagination || null,
    isLoading: assetsQuery.isLoading,
    isError: assetsQuery.isError,
    error: assetsQuery.error,

    // Mutation states
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isMutating: createMutation.isPending || updateMutation.isPending || deleteMutation.isPending,

    // Operations
    createAsset: createMutation.mutateAsync,
    updateAsset: updateMutation.mutateAsync,
    deleteAsset: deleteMutation.mutateAsync,

    // Refetch
    refetch: assetsQuery.refetch,
  };
};

export default useAssetRegistryManager;
