// src/hooks/queries/useResourceRanking.ts
// TanStack Query hook for the tenant's ICP relevance ranking of resource
// templates (onboarding seeding — Piece 2). Purely additive: the seeding step
// uses this only to reorder + badge; if it's empty/unavailable the step keeps
// its existing static order.

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import resourcesService from '@/services/resourcesService';
import type { TemplateRank } from '@/services/resourcesService';

export const resourceRankingKeys = {
  all: ['resource-ranking'] as const,
  tenant: (tenantId?: string) => [...resourceRankingKeys.all, tenantId || 'none'] as const,
};

/**
 * Fetch the ICP ranking map: { [template_id]: { score, forYou } }.
 * The service call never throws (degrades to {}), so this query is safe to
 * consume without error handling — an empty map means "keep static order".
 */
export const useResourceRanking = (options?: { enabled?: boolean }) => {
  const { currentTenant } = useAuth();

  const query = useQuery<Record<string, TemplateRank>>({
    queryKey: resourceRankingKeys.tenant(currentTenant?.id),
    queryFn: async () => {
      const resp = await resourcesService.getResourceRanking();
      return resp.data || {};
    },
    enabled: !!currentTenant?.id && (options?.enabled !== false),
    staleTime: 5 * 60 * 1000,   // ICP changes rarely within an onboarding session
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  return {
    ranking: query.data || {},
    isLoading: query.isLoading,
    isFetched: query.isFetched,
  };
};

export default useResourceRanking;
