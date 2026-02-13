// src/hooks/queries/useResourceTemplates.ts
// TanStack Query hook for browsing resource templates by served industries

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import resourcesService from '@/services/resourcesService';
import type { ResourceTemplatesResponse } from '@/services/resourcesService';

// ════════════════════════════════════════════════════════════════════
// QUERY KEYS
// ════════════════════════════════════════════════════════════════════

export const resourceTemplateKeys = {
  all: ['resource-templates'] as const,
  lists: () => [...resourceTemplateKeys.all, 'list'] as const,
  list: (filters: ResourceTemplateFilters) => [...resourceTemplateKeys.lists(), { filters }] as const,
};

// ════════════════════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════════════════════

export interface ResourceTemplateFilters {
  search?: string;
  limit?: number;
  offset?: number;
  resource_type_id?: string;
}

// ════════════════════════════════════════════════════════════════════
// QUERY HOOKS
// ════════════════════════════════════════════════════════════════════

/**
 * Fetch resource templates with pagination + search + type filter
 */
export const useResourceTemplates = (
  filters: ResourceTemplateFilters = {},
  options?: { enabled?: boolean }
) => {
  const { currentTenant } = useAuth();

  return useQuery<ResourceTemplatesResponse>({
    queryKey: resourceTemplateKeys.list(filters),
    queryFn: () => resourcesService.getResourceTemplates(filters),
    enabled: !!currentTenant?.id && (options?.enabled !== false),
    staleTime: 2 * 60 * 1000,     // 2 minutes (templates don't change often)
    gcTime: 10 * 60 * 1000,       // 10 minutes
    refetchOnWindowFocus: false,
    retry: 1,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10000),
  });
};

/**
 * Convenience hook that bundles commonly needed data
 */
export const useResourceTemplatesBrowser = (filters: ResourceTemplateFilters = {}) => {
  const query = useResourceTemplates(filters);
  const queryClient = useQueryClient();

  return {
    templates: query.data?.data || [],
    pagination: query.data?.pagination || { total: 0, limit: 25, offset: 0, has_more: false },
    servedIndustries: query.data?.served_industries || [],
    noIndustriesMessage: query.data?.message || null,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    invalidate: () => queryClient.invalidateQueries({ queryKey: resourceTemplateKeys.lists() }),
  };
};

export default useResourceTemplatesBrowser;
