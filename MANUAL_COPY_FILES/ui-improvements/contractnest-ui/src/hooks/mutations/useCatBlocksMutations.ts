// src/hooks/mutations/useCatBlocksMutations.ts
// TanStack Query mutations for Catalog Studio Blocks
// v2.0: Added idempotency key support and version conflict handling

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import api, {
  postWithIdempotency,
  patchWithIdempotency,
  generateIdempotencyKey,
  isVersionConflictError,
  getVersionConflictDetails
} from '@/services/api';
import { API_ENDPOINTS } from '@/services/serviceURLs';
import toast from 'react-hot-toast';
import { catBlockKeys, CatBlock, BlockConfig, ResourcePricingConfig, VariantPricingConfig } from '../queries/useCatBlocks';

// =================================================================
// TYPES
// =================================================================

export interface CreateBlockData {
  name: string;
  description?: string;
  block_type_id: string;
  pricing_mode_id: string;
  is_admin?: boolean;
  visible?: boolean;
  config: BlockConfig;
  resource_pricing?: ResourcePricingConfig;
  variant_pricing?: VariantPricingConfig;
  tags?: string[];
  tenant_id?: string | null;
  is_seed?: boolean;
}

export interface UpdateBlockData {
  name?: string;
  description?: string;
  block_type_id?: string;
  pricing_mode_id?: string;
  is_admin?: boolean;
  visible?: boolean;
  is_active?: boolean;
  config?: BlockConfig;
  resource_pricing?: ResourcePricingConfig;
  variant_pricing?: VariantPricingConfig;
  tags?: string[];
  tenant_id?: string | null;
  is_seed?: boolean;
  // NEW: For optimistic locking
  expected_version?: number;
}

export interface MutationResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

// NEW: Version conflict callback type
export type VersionConflictCallback = (blockId: string, message: string) => void;

// =================================================================
// HELPER FUNCTIONS
// =================================================================

/**
 * Handle mutation errors and show appropriate messages
 * v2.0: Added VERSION_CONFLICT handling
 */
const handleMutationError = (
  error: any,
  operation: string,
  onVersionConflict?: VersionConflictCallback,
  blockId?: string
) => {
  console.error(`Failed to ${operation}:`, error);

  // Check for version conflict first
  if (isVersionConflictError(error)) {
    const details = getVersionConflictDetails(error);
    const message = details?.message || 'This block was modified by another user.';

    toast.error(message, {
      duration: 5000,
      icon: '🔄'
    });

    // Call the version conflict callback if provided
    if (onVersionConflict && blockId) {
      onVersionConflict(blockId, message);
    }
    return;
  }

  const errorMessage = error.response?.data?.error?.message || error.message;

  if (errorMessage?.includes('authentication') || errorMessage?.includes('unauthorized')) {
    toast.error('Authentication required. Please log in again.');
  } else if (errorMessage?.includes('permission') || errorMessage?.includes('forbidden')) {
    toast.error('You do not have permission for this action.');
  } else if (errorMessage?.includes('validation')) {
    toast.error('Please check your input and try again.');
  } else if (errorMessage?.includes('idempotency')) {
    toast.error('Request already processed. Please refresh the page.');
  } else {
    toast.error(errorMessage || `Failed to ${operation}. Please try again.`);
  }
};

// =================================================================
// CREATE MUTATION
// =================================================================

/**
 * Create new block
 * v2.0: Uses postWithIdempotency for safe retries
 */
export const useCreateCatBlock = () => {
  const { currentTenant } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (blockData: CreateBlockData): Promise<MutationResponse<CatBlock>> => {
      if (!currentTenant?.id) {
        throw new Error('No tenant selected');
      }

      console.log('🔄 Creating block:', blockData.name);

      // Generate idempotency key for safe retries
      const idempotencyKey = generateIdempotencyKey();
      console.log('📌 Idempotency key:', idempotencyKey);

      // Use postWithIdempotency for automatic retry safety
      const response = await postWithIdempotency(
        API_ENDPOINTS.CATALOG_STUDIO.BLOCKS.CREATE,
        blockData,
        idempotencyKey
      );

      if (!response?.success) {
        throw new Error(response?.error?.message || 'Failed to create block');
      }

      return response;
    },
    onSuccess: (data, variables) => {
      toast.success(`Block "${variables.name}" created successfully!`);

      // Invalidate and refetch blocks list
      queryClient.invalidateQueries({ queryKey: catBlockKeys.lists() });
      queryClient.invalidateQueries({ queryKey: catBlockKeys.all });

      console.log('✅ Block created successfully:', data.data?.id);
    },
    onError: (error: Error) => {
      handleMutationError(error, 'create block');
    },
  });
};

// =================================================================
// UPDATE MUTATION
// =================================================================

/**
 * Update existing block
 * v2.0: Uses patchWithIdempotency + supports expected_version for optimistic locking
 */
export const useUpdateCatBlock = (onVersionConflict?: VersionConflictCallback) => {
  const { currentTenant } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
      expectedVersion
    }: {
      id: string;
      data: UpdateBlockData;
      expectedVersion?: number;
    }): Promise<MutationResponse<CatBlock>> => {
      if (!currentTenant?.id) {
        throw new Error('No tenant selected');
      }

      if (!id) {
        throw new Error('Block ID is required');
      }

      console.log('🔄 Updating block:', id);

      // Generate idempotency key for safe retries
      const idempotencyKey = generateIdempotencyKey();
      console.log('📌 Idempotency key:', idempotencyKey);

      // Include expected_version for optimistic locking if provided
      const requestData = expectedVersion !== undefined
        ? { ...data, expected_version: expectedVersion }
        : data;

      // Use patchWithIdempotency for automatic retry safety
      const response = await patchWithIdempotency(
        API_ENDPOINTS.CATALOG_STUDIO.BLOCKS.UPDATE(id),
        requestData,
        idempotencyKey
      );

      if (!response?.success) {
        throw new Error(response?.error?.message || 'Failed to update block');
      }

      return response;
    },
    onSuccess: (data, variables) => {
      toast.success('Block updated successfully!');

      // Update specific block in cache
      queryClient.invalidateQueries({ queryKey: catBlockKeys.detail(variables.id) });

      // Invalidate list queries
      queryClient.invalidateQueries({ queryKey: catBlockKeys.lists() });

      console.log('✅ Block updated successfully:', variables.id);
    },
    onError: (error: any, variables) => {
      handleMutationError(error, 'update block', onVersionConflict, variables.id);
    },
  });
};

// =================================================================
// DELETE MUTATION
// =================================================================

/**
 * Delete block - soft delete
 */
export const useDeleteCatBlock = () => {
  const { currentTenant } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (blockId: string): Promise<MutationResponse<{ deleted: boolean }>> => {
      if (!currentTenant?.id) {
        throw new Error('No tenant selected');
      }

      if (!blockId) {
        throw new Error('Block ID is required');
      }

      console.log('🗑️ Deleting block:', blockId);

      const response = await api.delete(
        API_ENDPOINTS.CATALOG_STUDIO.BLOCKS.DELETE(blockId)
      );

      if (!response.data?.success) {
        throw new Error(response.data?.error?.message || 'Failed to delete block');
      }

      return response.data;
    },
    onSuccess: (data, blockId) => {
      toast.success('Block deleted successfully!');

      // Remove from cache
      queryClient.removeQueries({ queryKey: catBlockKeys.detail(blockId) });

      // Invalidate list queries
      queryClient.invalidateQueries({ queryKey: catBlockKeys.lists() });

      console.log('✅ Block deleted successfully:', blockId);
    },
    onError: (error: Error) => {
      handleMutationError(error, 'delete block');
    },
  });
};

// =================================================================
// TOGGLE STATUS MUTATION
// =================================================================

/**
 * Toggle block active status
 * v2.0: Supports expected_version for optimistic locking
 */
export const useToggleCatBlockStatus = (onVersionConflict?: VersionConflictCallback) => {
  const updateBlockMutation = useUpdateCatBlock(onVersionConflict);

  return useMutation({
    mutationFn: async ({
      id,
      isActive,
      expectedVersion
    }: {
      id: string;
      isActive: boolean;
      expectedVersion?: number;
    }) => {
      return updateBlockMutation.mutateAsync({
        id,
        data: { is_active: isActive },
        expectedVersion,
      });
    },
    onSuccess: (data, variables) => {
      const status = variables.isActive ? 'activated' : 'deactivated';
      toast.success(`Block ${status} successfully!`);
    },
    onError: (error: Error) => {
      handleMutationError(error, 'toggle block status');
    },
  });
};

// =================================================================
// HELPER HOOKS
// =================================================================

/**
 * Block mutation operations helper
 * v2.0: Added version conflict callback support
 */
export const useCatBlockMutationOperations = (onVersionConflict?: VersionConflictCallback) => {
  const createMutation = useCreateCatBlock();
  const updateMutation = useUpdateCatBlock(onVersionConflict);
  const deleteMutation = useDeleteCatBlock();
  const toggleStatusMutation = useToggleCatBlockStatus(onVersionConflict);

  const createBlock = async (data: CreateBlockData) => {
    return createMutation.mutateAsync(data);
  };

  const updateBlock = async (id: string, data: UpdateBlockData, expectedVersion?: number) => {
    return updateMutation.mutateAsync({ id, data, expectedVersion });
  };

  const deleteBlock = async (id: string) => {
    return deleteMutation.mutateAsync(id);
  };

  const toggleBlockStatus = async (id: string, isActive: boolean, expectedVersion?: number) => {
    return toggleStatusMutation.mutateAsync({ id, isActive, expectedVersion });
  };

  const isLoading =
    createMutation.isPending ||
    updateMutation.isPending ||
    deleteMutation.isPending ||
    toggleStatusMutation.isPending;

  return {
    createBlock,
    updateBlock,
    deleteBlock,
    toggleBlockStatus,
    isLoading,
    createError: createMutation.error,
    updateError: updateMutation.error,
    deleteError: deleteMutation.error,
    toggleError: toggleStatusMutation.error,
  };
};

// =================================================================
// EXPORTS
// =================================================================

export default {
  useCreateCatBlock,
  useUpdateCatBlock,
  useDeleteCatBlock,
  useToggleCatBlockStatus,
  useCatBlockMutationOperations,
};
