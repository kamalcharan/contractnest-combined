// src/hooks/queries/useServedIndustries.ts
// TanStack Query hooks for the Served Industries feature

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { vaniToast } from '@/components/common/toast';
import { captureException } from '@/utils/sentry';
import api from '@/services/api';
import { API_ENDPOINTS } from '@/services/serviceURLs';

// ════════════════════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════════════════════

export interface ServedIndustry {
  id: string;
  tenant_id: string;
  industry_id: string;
  created_at: string;
  industry?: {
    id: string;
    name: string;
    description: string | null;
    icon?: string;
    parent_id?: string | null;
    level?: number;
  };
}

export interface ServedIndustriesResponse {
  success: boolean;
  data: ServedIndustry[];
  count: number;
}

export interface AddServedIndustriesRequest {
  industry_ids: string[];
}

export interface UnlockPreviewItem {
  industry_id: string;
  industry_name: string;
  template_count: number;
  resource_type_counts?: Record<string, number>;
}

export interface UnlockPreviewResponse {
  success: boolean;
  data: UnlockPreviewItem[];
}

// ════════════════════════════════════════════════════════════════════
// QUERY KEYS
// ════════════════════════════════════════════════════════════════════

export const servedIndustriesKeys = {
  all: ['served-industries'] as const,
  lists: () => [...servedIndustriesKeys.all, 'list'] as const,
  unlockPreview: () => [...servedIndustriesKeys.all, 'unlock-preview'] as const,
};

// ════════════════════════════════════════════════════════════════════
// QUERY HOOKS
// ════════════════════════════════════════════════════════════════════

/**
 * Fetch the tenant's served industries list
 */
export const useServedIndustries = () => {
  const { currentTenant } = useAuth();

  return useQuery<ServedIndustriesResponse>({
    queryKey: servedIndustriesKeys.lists(),
    queryFn: async () => {
      const response = await api.get(API_ENDPOINTS.TENANTS.SERVED_INDUSTRIES.LIST);
      return response.data;
    },
    enabled: !!currentTenant?.id,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10000),
  });
};

/**
 * Fetch unlock preview (template counts per industry)
 */
export const useUnlockPreview = (options?: { enabled?: boolean }) => {
  const { currentTenant } = useAuth();

  return useQuery<UnlockPreviewResponse>({
    queryKey: servedIndustriesKeys.unlockPreview(),
    queryFn: async () => {
      const response = await api.get(API_ENDPOINTS.TENANTS.SERVED_INDUSTRIES.UNLOCK_PREVIEW);
      return response.data;
    },
    enabled: !!currentTenant?.id && (options?.enabled !== false),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
  });
};

// ════════════════════════════════════════════════════════════════════
// MUTATION HOOKS
// ════════════════════════════════════════════════════════════════════

/**
 * Add served industries (bulk upsert)
 */
export const useAddServedIndustries = () => {
  const queryClient = useQueryClient();
  const { currentTenant } = useAuth();

  return useMutation({
    mutationFn: async (industryIds: string[]) => {
      const response = await api.post(
        API_ENDPOINTS.TENANTS.SERVED_INDUSTRIES.ADD,
        { industry_ids: industryIds }
      );
      return response.data;
    },
    onSuccess: (_data, industryIds) => {
      queryClient.invalidateQueries({ queryKey: servedIndustriesKeys.lists() });
      queryClient.invalidateQueries({ queryKey: servedIndustriesKeys.unlockPreview() });

      const count = industryIds.length;
      vaniToast.success('Industries Added', {
        message: `${count} ${count === 1 ? 'industry' : 'industries'} added to your served list.`,
        duration: 4000,
      });
    },
    onError: (error: Error) => {
      captureException(error, {
        tags: { component: 'useServedIndustries', action: 'addServedIndustries' },
        extra: { tenantId: currentTenant?.id },
      });

      vaniToast.error('Add Failed', {
        message: error.message || 'Failed to add industries.',
        duration: 5000,
      });
    },
  });
};

/**
 * Remove a single served industry
 */
export const useRemoveServedIndustry = () => {
  const queryClient = useQueryClient();
  const { currentTenant } = useAuth();

  return useMutation({
    mutationFn: async (industryId: string) => {
      const response = await api.delete(
        API_ENDPOINTS.TENANTS.SERVED_INDUSTRIES.REMOVE(industryId)
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: servedIndustriesKeys.lists() });
      queryClient.invalidateQueries({ queryKey: servedIndustriesKeys.unlockPreview() });

      vaniToast.success('Industry Removed', {
        message: 'Industry has been removed from your served list.',
        duration: 4000,
      });
    },
    onError: (error: Error) => {
      captureException(error, {
        tags: { component: 'useServedIndustries', action: 'removeServedIndustry' },
        extra: { tenantId: currentTenant?.id },
      });

      vaniToast.error('Remove Failed', {
        message: error.message || 'Failed to remove industry.',
        duration: 5000,
      });
    },
  });
};

// ════════════════════════════════════════════════════════════════════
// COMBINED MANAGER HOOK
// ════════════════════════════════════════════════════════════════════

export const useServedIndustriesManager = () => {
  const listQuery = useServedIndustries();
  const addMutation = useAddServedIndustries();
  const removeMutation = useRemoveServedIndustry();

  return {
    // Data
    servedIndustries: listQuery.data?.data || [],
    count: listQuery.data?.count || 0,
    isLoading: listQuery.isLoading,
    isError: listQuery.isError,
    error: listQuery.error,

    // Mutation states
    isAdding: addMutation.isPending,
    isRemoving: removeMutation.isPending,
    isMutating: addMutation.isPending || removeMutation.isPending,

    // Operations
    addIndustries: addMutation.mutateAsync,
    removeIndustry: removeMutation.mutateAsync,

    // Refetch
    refetch: listQuery.refetch,
  };
};

export default useServedIndustriesManager;
