// src/hooks/mutations/useCatTemplatesMutations.ts
// TanStack Query mutations for Catalog Studio Templates

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import api from '@/services/api';
import { API_ENDPOINTS } from '@/services/serviceURLs';
import toast from 'react-hot-toast';
import { catTemplateKeys, CatTemplate, TemplateBlock } from '../queries/useCatTemplates';

// =================================================================
// TYPES
// =================================================================

export interface CreateTemplateData {
  name: string;
  description?: string;
  blocks: TemplateBlock[];
  is_public?: boolean;
  status_id?: string;
}

export interface UpdateTemplateData {
  name?: string;
  description?: string;
  blocks?: TemplateBlock[];
  is_public?: boolean;
  status_id?: string;
}

export interface CopyTemplateData {
  name?: string;
  description?: string;
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
  } else if (errorMessage?.includes('permission') || errorMessage?.includes('forbidden')) {
    toast.error('You do not have permission to perform this action.');
  } else if (errorMessage?.includes('validation')) {
    toast.error('Please check your input and try again.');
  } else if (errorMessage?.includes('not found')) {
    toast.error('Template not found.');
  } else {
    toast.error(errorMessage || `Failed to ${operation}. Please try again.`);
  }
};

// =================================================================
// CREATE MUTATION
// =================================================================

/**
 * Create new template
 */
export const useCreateCatTemplate = () => {
  const { currentTenant, isAdmin } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (templateData: CreateTemplateData): Promise<MutationResponse<CatTemplate>> => {
      if (!currentTenant?.id) {
        throw new Error('No tenant selected');
      }

      console.log('🔄 Creating template:', templateData.name);

      const response = await api.post(
        API_ENDPOINTS.CATALOG_STUDIO.TEMPLATES.CREATE,
        templateData,
        {
          headers: {
            'x-is-admin': String(isAdmin || false),
          },
        }
      );

      if (!response.data?.success) {
        throw new Error(response.data?.error?.message || 'Failed to create template');
      }

      return response.data;
    },
    onSuccess: (data, variables) => {
      toast.success(`Template "${variables.name}" created successfully!`);

      // Invalidate and refetch templates list
      queryClient.invalidateQueries({ queryKey: catTemplateKeys.lists() });
      queryClient.invalidateQueries({ queryKey: catTemplateKeys.all });

      console.log('✅ Template created successfully:', data.data?.id);
    },
    onError: (error: Error) => {
      handleMutationError(error, 'create template');
    },
  });
};

// =================================================================
// UPDATE MUTATION
// =================================================================

/**
 * Update existing template
 */
export const useUpdateCatTemplate = () => {
  const { currentTenant, isAdmin } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateTemplateData }): Promise<MutationResponse<CatTemplate>> => {
      if (!currentTenant?.id) {
        throw new Error('No tenant selected');
      }

      if (!id) {
        throw new Error('Template ID is required');
      }

      console.log('🔄 Updating template:', id);

      const response = await api.patch(
        API_ENDPOINTS.CATALOG_STUDIO.TEMPLATES.UPDATE(id),
        data,
        {
          headers: {
            'x-is-admin': String(isAdmin || false),
          },
        }
      );

      if (!response.data?.success) {
        throw new Error(response.data?.error?.message || 'Failed to update template');
      }

      return response.data;
    },
    onSuccess: (data, variables) => {
      toast.success('Template updated successfully!');

      // Update specific template in cache
      queryClient.invalidateQueries({ queryKey: catTemplateKeys.detail(variables.id) });

      // Invalidate list queries
      queryClient.invalidateQueries({ queryKey: catTemplateKeys.lists() });

      console.log('✅ Template updated successfully:', variables.id);
    },
    onError: (error: Error) => {
      handleMutationError(error, 'update template');
    },
  });
};

// =================================================================
// DELETE MUTATION
// =================================================================

/**
 * Delete template - soft delete
 */
export const useDeleteCatTemplate = () => {
  const { currentTenant, isAdmin } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (templateId: string): Promise<MutationResponse<{ deleted: boolean }>> => {
      if (!currentTenant?.id) {
        throw new Error('No tenant selected');
      }

      if (!templateId) {
        throw new Error('Template ID is required');
      }

      console.log('🗑️ Deleting template:', templateId);

      const response = await api.delete(
        API_ENDPOINTS.CATALOG_STUDIO.TEMPLATES.DELETE(templateId),
        {
          headers: {
            'x-is-admin': String(isAdmin || false),
          },
        }
      );

      if (!response.data?.success) {
        throw new Error(response.data?.error?.message || 'Failed to delete template');
      }

      return response.data;
    },
    onSuccess: (data, templateId) => {
      toast.success('Template deleted successfully!');

      // Remove from cache
      queryClient.removeQueries({ queryKey: catTemplateKeys.detail(templateId) });

      // Invalidate list queries
      queryClient.invalidateQueries({ queryKey: catTemplateKeys.lists() });

      console.log('✅ Template deleted successfully:', templateId);
    },
    onError: (error: Error) => {
      handleMutationError(error, 'delete template');
    },
  });
};

// =================================================================
// COPY MUTATION
// =================================================================

/**
 * Copy system template to tenant space
 */
export const useCopyCatTemplate = () => {
  const { currentTenant, isAdmin } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data?: CopyTemplateData }): Promise<MutationResponse<CatTemplate>> => {
      if (!currentTenant?.id) {
        throw new Error('No tenant selected');
      }

      if (!id) {
        throw new Error('Template ID is required');
      }

      console.log('📋 Copying template:', id);

      const response = await api.post(
        API_ENDPOINTS.CATALOG_STUDIO.TEMPLATES.COPY(id),
        data || {},
        {
          headers: {
            'x-is-admin': String(isAdmin || false),
          },
        }
      );

      if (!response.data?.success) {
        throw new Error(response.data?.error?.message || 'Failed to copy template');
      }

      return response.data;
    },
    onSuccess: (data, variables) => {
      const templateName = variables.data?.name || 'Template';
      toast.success(`"${templateName}" copied to your templates!`);

      // Invalidate tenant templates list (the copied template will appear there)
      queryClient.invalidateQueries({ queryKey: catTemplateKeys.lists() });

      console.log('✅ Template copied successfully:', data.data?.id);
    },
    onError: (error: Error) => {
      handleMutationError(error, 'copy template');
    },
  });
};

// =================================================================
// TOGGLE PUBLIC STATUS MUTATION
// =================================================================

/**
 * Toggle template public status
 */
export const useToggleCatTemplatePublic = () => {
  const updateTemplateMutation = useUpdateCatTemplate();

  return useMutation({
    mutationFn: async ({ id, isPublic }: { id: string; isPublic: boolean }) => {
      return updateTemplateMutation.mutateAsync({
        id,
        data: { is_public: isPublic },
      });
    },
    onSuccess: (data, variables) => {
      const status = variables.isPublic ? 'public' : 'private';
      toast.success(`Template is now ${status}!`);
    },
    onError: (error: Error) => {
      handleMutationError(error, 'toggle template visibility');
    },
  });
};

// =================================================================
// HELPER HOOKS
// =================================================================

/**
 * Template mutation operations helper
 */
export const useCatTemplateMutationOperations = () => {
  const createMutation = useCreateCatTemplate();
  const updateMutation = useUpdateCatTemplate();
  const deleteMutation = useDeleteCatTemplate();
  const copyMutation = useCopyCatTemplate();
  const togglePublicMutation = useToggleCatTemplatePublic();

  const createTemplate = async (data: CreateTemplateData) => {
    return createMutation.mutateAsync(data);
  };

  const updateTemplate = async (id: string, data: UpdateTemplateData) => {
    return updateMutation.mutateAsync({ id, data });
  };

  const deleteTemplate = async (id: string) => {
    return deleteMutation.mutateAsync(id);
  };

  const copyTemplate = async (id: string, data?: CopyTemplateData) => {
    return copyMutation.mutateAsync({ id, data });
  };

  const toggleTemplatePublic = async (id: string, isPublic: boolean) => {
    return togglePublicMutation.mutateAsync({ id, isPublic });
  };

  const isLoading =
    createMutation.isPending ||
    updateMutation.isPending ||
    deleteMutation.isPending ||
    copyMutation.isPending ||
    togglePublicMutation.isPending;

  return {
    createTemplate,
    updateTemplate,
    deleteTemplate,
    copyTemplate,
    toggleTemplatePublic,
    isLoading,
    createError: createMutation.error,
    updateError: updateMutation.error,
    deleteError: deleteMutation.error,
    copyError: copyMutation.error,
    toggleError: togglePublicMutation.error,
  };
};

/**
 * Hook for saving template from BlockWizard/Template Builder
 * Handles both create and update based on whether templateId exists
 */
export const useSaveTemplate = () => {
  const createMutation = useCreateCatTemplate();
  const updateMutation = useUpdateCatTemplate();

  return useMutation({
    mutationFn: async ({
      templateId,
      data,
    }: {
      templateId?: string;
      data: CreateTemplateData | UpdateTemplateData;
    }) => {
      if (templateId) {
        // Update existing template
        return updateMutation.mutateAsync({
          id: templateId,
          data: data as UpdateTemplateData,
        });
      } else {
        // Create new template
        return createMutation.mutateAsync(data as CreateTemplateData);
      }
    },
    onSuccess: (data, variables) => {
      const action = variables.templateId ? 'updated' : 'created';
      toast.success(`Template ${action} successfully!`);
    },
    onError: (error: Error) => {
      handleMutationError(error, 'save template');
    },
  });
};

// =================================================================
// EXPORTS
// =================================================================

export default {
  useCreateCatTemplate,
  useUpdateCatTemplate,
  useDeleteCatTemplate,
  useCopyCatTemplate,
  useToggleCatTemplatePublic,
  useCatTemplateMutationOperations,
  useSaveTemplate,
};
