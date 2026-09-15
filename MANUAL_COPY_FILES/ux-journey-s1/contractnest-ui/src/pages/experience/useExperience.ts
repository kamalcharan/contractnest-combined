import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import api from '@/services/api';
import { API_ENDPOINTS } from '@/services/serviceURLs';
import { experienceKey, parseContractSnapshot, relationshipFilter } from './model';

export function useExperience(enabled: boolean) {
  const { currentTenant, isLive, perspective } = useAuth();
  const tenantId = currentTenant?.id ?? '';
  return useQuery({
    queryKey: experienceKey(tenantId, isLive, perspective),
    enabled: enabled && !!tenantId,
    queryFn: async ({ signal }) => {
      const response = await api.get(API_ENDPOINTS.CONTRACTS.LIST, {
        signal,
        params: { record_type: 'contract', contract_type: relationshipFilter(perspective),
          page: 1, limit: 6, sort_by: 'updated_at', sort_direction: 'desc' },
      });
      // The shared interceptor owns headers. Reject a response dispatched
      // under a changed context instead of caching it under the old key.
      const headers = response.config.headers;
      if (String(headers['x-tenant-id']) !== tenantId ||
          headers['x-environment'] !== (isLive ? 'live' : 'test')) {
        throw new Error('Workspace changed. Refresh to continue.');
      }
      return parseContractSnapshot(response.data);
    },
    staleTime: 0, refetchOnWindowFocus: true, retry: 1,
  });
}
