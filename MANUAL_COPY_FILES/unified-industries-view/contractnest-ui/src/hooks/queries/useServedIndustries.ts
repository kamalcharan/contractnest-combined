// src/hooks/queries/useServedIndustries.ts
// TanStack Query hooks for the Served Industries feature
// Production-ready: validation, optimistic updates, race-condition guards

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { vaniToast } from '@/components/common/toast';
import { captureException } from '@/utils/sentry';
import api from '@/services/api';
import { API_ENDPOINTS } from '@/services/serviceURLs';
import { useRef, useCallback } from 'react';

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
// VALIDATION
// ════════════════════════════════════════════════════════════════════

const MAX_SERVED_INDUSTRIES = 20;

function validateIndustryIds(ids: string[]): { valid: boolean; cleaned: string[]; error?: string } {
  if (!Array.isArray(ids) || ids.length === 0) {
    return { valid: false, cleaned: [], error: 'No industries selected.' };
  }

  // Deduplicate and filter empty/whitespace strings
  const cleaned = [...new Set(ids.filter((id) => typeof id === 'string' && id.trim().length > 0))];

  if (cleaned.length === 0) {
    return { valid: false, cleaned: [], error: 'No valid industry IDs provided.' };
  }

  if (cleaned.length > MAX_SERVED_INDUSTRIES) {
    return { valid: false, cleaned: [], error: `You can add at most ${MAX_SERVED_INDUSTRIES} industries at once.` };
  }

  return { valid: true, cleaned };
}

function validateSingleIndustryId(id: string): boolean {
  return typeof id === 'string' && id.trim().length > 0;
}

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
// MUTATION HOOKS (with optimistic updates + race-condition guards)
// ════════════════════════════════════════════════════════════════════

/**
 * Add served industries (bulk upsert)
 * - Validates input before sending
 * - Optimistic cache update for instant UI feedback
 * - Rolls back on error
 */
export const useAddServedIndustries = () => {
  const queryClient = useQueryClient();
  const { currentTenant } = useAuth();

  return useMutation({
    mutationKey: ['served-industries', 'add'],
    mutationFn: async (industryIds: string[]) => {
      // Validate before sending
      const { valid, cleaned, error } = validateIndustryIds(industryIds);
      if (!valid) throw new Error(error);

      const response = await api.post(
        API_ENDPOINTS.TENANTS.SERVED_INDUSTRIES.ADD,
        { industry_ids: cleaned }
      );
      return response.data;
    },
    onMutate: async (industryIds) => {
      // Cancel in-flight queries to avoid overwriting our optimistic update
      await queryClient.cancelQueries({ queryKey: servedIndustriesKeys.lists() });

      // Snapshot current data for rollback
      const previousData = queryClient.getQueryData<ServedIndustriesResponse>(
        servedIndustriesKeys.lists()
      );

      // Optimistic update: append placeholder entries
      if (previousData) {
        const now = new Date().toISOString();
        const newEntries: ServedIndustry[] = industryIds
          .filter((id) => !previousData.data.some((si) => si.industry_id === id))
          .map((id) => ({
            id: `optimistic-${id}`,
            tenant_id: currentTenant?.id || '',
            industry_id: id,
            created_at: now,
          }));

        queryClient.setQueryData<ServedIndustriesResponse>(
          servedIndustriesKeys.lists(),
          {
            ...previousData,
            data: [...previousData.data, ...newEntries],
            count: previousData.count + newEntries.length,
          }
        );
      }

      return { previousData };
    },
    onSuccess: (_data, industryIds) => {
      // Refetch to get real server data (replaces optimistic placeholders)
      queryClient.invalidateQueries({ queryKey: servedIndustriesKeys.lists() });
      queryClient.invalidateQueries({ queryKey: servedIndustriesKeys.unlockPreview() });

      const count = industryIds.length;
      vaniToast.success('Industries Added', {
        message: `${count} ${count === 1 ? 'industry' : 'industries'} added to your served list.`,
        duration: 4000,
      });
    },
    onError: (error: Error, _industryIds, context) => {
      // Rollback to previous data
      if (context?.previousData) {
        queryClient.setQueryData(
          servedIndustriesKeys.lists(),
          context.previousData
        );
      }

      captureException(error, {
        tags: { component: 'useServedIndustries', action: 'addServedIndustries' },
        extra: { tenantId: currentTenant?.id },
      });

      vaniToast.error('Add Failed', {
        message: error.message || 'Failed to add industries. Please try again.',
        duration: 5000,
      });
    },
  });
};

/**
 * Remove a single served industry
 * - Validates the industry ID
 * - Optimistic cache removal for instant feedback
 * - Rolls back on error
 */
export const useRemoveServedIndustry = () => {
  const queryClient = useQueryClient();
  const { currentTenant } = useAuth();

  return useMutation({
    mutationKey: ['served-industries', 'remove'],
    mutationFn: async (industryId: string) => {
      if (!validateSingleIndustryId(industryId)) {
        throw new Error('Invalid industry ID.');
      }

      const response = await api.delete(
        API_ENDPOINTS.TENANTS.SERVED_INDUSTRIES.REMOVE(industryId)
      );
      return response.data;
    },
    onMutate: async (industryId) => {
      await queryClient.cancelQueries({ queryKey: servedIndustriesKeys.lists() });

      const previousData = queryClient.getQueryData<ServedIndustriesResponse>(
        servedIndustriesKeys.lists()
      );

      // Optimistic removal
      if (previousData) {
        queryClient.setQueryData<ServedIndustriesResponse>(
          servedIndustriesKeys.lists(),
          {
            ...previousData,
            data: previousData.data.filter((si) => si.industry_id !== industryId),
            count: Math.max(0, previousData.count - 1),
          }
        );
      }

      return { previousData };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: servedIndustriesKeys.lists() });
      queryClient.invalidateQueries({ queryKey: servedIndustriesKeys.unlockPreview() });

      vaniToast.success('Industry Removed', {
        message: 'Industry has been removed from your served list.',
        duration: 4000,
      });
    },
    onError: (error: Error, _industryId, context) => {
      // Rollback
      if (context?.previousData) {
        queryClient.setQueryData(
          servedIndustriesKeys.lists(),
          context.previousData
        );
      }

      captureException(error, {
        tags: { component: 'useServedIndustries', action: 'removeServedIndustry' },
        extra: { tenantId: currentTenant?.id },
      });

      vaniToast.error('Remove Failed', {
        message: error.message || 'Failed to remove industry. Please try again.',
        duration: 5000,
      });
    },
  });
};

// ════════════════════════════════════════════════════════════════════
// COMBINED MANAGER HOOK (with double-click guards)
// ════════════════════════════════════════════════════════════════════

export const useServedIndustriesManager = () => {
  const listQuery = useServedIndustries();
  const addMutation = useAddServedIndustries();
  const removeMutation = useRemoveServedIndustry();

  // Refs to guard against rapid duplicate calls
  const addInflightRef = useRef(false);
  const removeInflightRef = useRef<string | null>(null);

  const addIndustries = useCallback(async (industryIds: string[]) => {
    // Guard: block if an add is already in-flight
    if (addInflightRef.current) return;
    addInflightRef.current = true;
    try {
      await addMutation.mutateAsync(industryIds);
    } finally {
      addInflightRef.current = false;
    }
  }, [addMutation]);

  const removeIndustry = useCallback(async (industryId: string) => {
    // Guard: block if this specific industry is already being removed
    if (removeInflightRef.current === industryId) return;
    removeInflightRef.current = industryId;
    try {
      await removeMutation.mutateAsync(industryId);
    } finally {
      removeInflightRef.current = null;
    }
  }, [removeMutation]);

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
    removingIndustryId: removeInflightRef.current,

    // Operations (guarded)
    addIndustries,
    removeIndustry,

    // Refetch
    refetch: listQuery.refetch,
  };
};

export default useServedIndustriesManager;
