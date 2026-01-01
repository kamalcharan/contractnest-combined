// src/hooks/mutations/useCatBlocksMutations.ts
// TanStack Query mutations for Catalog Studio Blocks (Admin only)

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import api from '@/services/api';
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

// =================================================================
// HELPER FUNCTIONS
// =================================================================

/**
 * Handle mutation errors and show appropriate messages
 */
const handleMutationError = (error: any, operation: string) => {
  console.error(`Failed to ${operation}:`, error);

  const errorMessage = error.response?.data?.error?.message || error.message;

  if (errorMessage?.includes('authentication') || errorMessage?.includes('unauthorized')) {
    toast.error('Authentication required. Please log in again.');
  } else if (errorMessage?.includes('permission') || errorMessage?.includes('forbidden') || errorMessage?.includes('admin')) {
    toast.error('Admin access required for this action.');
  } else if (errorMessage?.includes('validation')) {
    toast.error('Please check your input and try again.');
  } else {
    toast.error(errorMessage || `Failed to ${operation}. Please try again.`);
  }
};

// =================================================================
// CREATE MUTATION
// =================================================================

/**
 * Create new block (Admin only)
 */
export const useCreateCatBlock = () => {
  const { currentTenant, isAdmin } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (blockData: CreateBlockData): Promise<MutationResponse<CatBlock>> => {
      if (!currentTenant?.id) {
        throw new Error('No tenant selected');
      }

      if (!isAdmin) {
        throw new Error('Admin access required to create blocks');
      }

      console.log('🔄 Creating block:', blockData.name);

      const response = await api.post(
        API_ENDPOINTS.CATALOG_STUDIO.BLOCKS.CREATE,
        blockData,
        {
          headers: {
            'x-is-admin': 'true',
          },
        }
      );

      if (!response.data?.success) {
        throw new Error(response.data?.error?.message || 'Failed to create block');
      }

      return response.data;
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
 * Update existing block (Admin only)
 */
export const useUpdateCatBlock = () => {
  const { currentTenant, isAdmin } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateBlockData }): Promise<MutationResponse<CatBlock>> => {
      if (!currentTenant?.id) {
        throw new Error('No tenant selected');
      }

      if (!isAdmin) {
        throw new Error('Admin access required to update blocks');
      }

      if (!id) {
        throw new Error('Block ID is required');
      }

      console.log('🔄 Updating block:', id);

      const response = await api.patch(
        API_ENDPOINTS.CATALOG_STUDIO.BLOCKS.UPDATE(id),
        data,
        {
          headers: {
            'x-is-admin': 'true',
          },
        }
      );

      if (!response.data?.success) {
        throw new Error(response.data?.error?.message || 'Failed to update block');
      }

      return response.data;
    },
    onSuccess: (data, variables) => {
      toast.success('Block updated successfully!');

      // Update specific block in cache
      queryClient.invalidateQueries({ queryKey: catBlockKeys.detail(variables.id) });

      // Invalidate list queries
      queryClient.invalidateQueries({ queryKey: catBlockKeys.lists() });

      console.log('✅ Block updated successfully:', variables.id);
    },
    onError: (error: Error) => {
      handleMutationError(error, 'update block');
    },
  });
};

// =================================================================
// DELETE MUTATION
// =================================================================

/**
 * Delete block - soft delete (Admin only)
 */
export const useDeleteCatBlock = () => {
  const { currentTenant, isAdmin } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (blockId: string): Promise<MutationResponse<{ deleted: boolean }>> => {
      if (!currentTenant?.id) {
        throw new Error('No tenant selected');
      }

      if (!isAdmin) {
        throw new Error('Admin access required to delete blocks');
      }

      if (!blockId) {
        throw new Error('Block ID is required');
      }

      console.log('🗑️ Deleting block:', blockId);

      const response = await api.delete(
        API_ENDPOINTS.CATALOG_STUDIO.BLOCKS.DELETE(blockId),
        {
          headers: {
            'x-is-admin': 'true',
          },
        }
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
 * Toggle block active status (Admin only)
 */
export const useToggleCatBlockStatus = () => {
  const updateBlockMutation = useUpdateCatBlock();

  return useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      return updateBlockMutation.mutateAsync({
        id,
        data: { is_active: isActive },
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
 */
export const useCatBlockMutationOperations = () => {
  const createMutation = useCreateCatBlock();
  const updateMutation = useUpdateCatBlock();
  const deleteMutation = useDeleteCatBlock();
  const toggleStatusMutation = useToggleCatBlockStatus();

  const createBlock = async (data: CreateBlockData) => {
    return createMutation.mutateAsync(data);
  };

  const updateBlock = async (id: string, data: UpdateBlockData) => {
    return updateMutation.mutateAsync({ id, data });
  };

  const deleteBlock = async (id: string) => {
    return deleteMutation.mutateAsync(id);
  };

  const toggleBlockStatus = async (id: string, isActive: boolean) => {
    return toggleStatusMutation.mutateAsync({ id, isActive });
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
