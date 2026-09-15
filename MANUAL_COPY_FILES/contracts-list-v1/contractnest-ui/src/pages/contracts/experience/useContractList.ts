import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import api from '@/services/api';
import { API_ENDPOINTS } from '@/services/serviceURLs';
import type { ContractDetail } from '@/types/contracts';
import { listScopeKey, parseList } from './model';

export interface ListParams {
  contract_type: string;
  status?: string;
  search?: string;
  sort_by?: string;
  sort_direction?: 'asc' | 'desc';
  page: number;
  limit: number;
}

// Deliberately separate from shared legacy query keys. Switching context
// cancels an in-flight read; no previous workspace's rows are retained.
export function useContractList(params: ListParams) {
  const { currentTenant, isLive, perspective } = useAuth();
  const tenantId = currentTenant?.id || '';
  return useQuery({
    queryKey: [...listScopeKey(tenantId, isLive, perspective), 'list', params],
    enabled: !!tenantId,
    queryFn: async ({ signal }) => {
      const response = await api.get(API_ENDPOINTS.CONTRACTS.LIST, {
        signal, params: {
          record_type: 'contract', contract_type: params.contract_type,
          status: params.status || undefined, search: params.search || undefined,
          page: params.page, per_page: params.limit,
          sort_by: params.sort_by || 'created_at', sort_order: params.sort_direction || 'desc',
        },
      });
      if (String(response.config.headers['x-tenant-id']) !== tenantId ||
          response.config.headers['x-environment'] !== (isLive ? 'live' : 'test')) {
        throw new Error('Workspace changed. Please refresh.');
      }
      return parseList(response.data);
    },
    staleTime: 0,
    refetchOnWindowFocus: true,
    retry: 1,
  });
}

export function useDraftForList(id: string | null) {
  const { currentTenant, isLive, perspective } = useAuth();
  const tenantId = currentTenant?.id || '';
  return useQuery({
    queryKey: [...listScopeKey(tenantId, isLive, perspective), 'resume', id],
    enabled: !!tenantId && !!id,
    queryFn: async ({ signal }) => {
      const response = await api.get(API_ENDPOINTS.CONTRACTS.GET(id!), { signal });
      const data = (response.data?.data ?? response.data) as ContractDetail;
      if (String(response.config.headers['x-tenant-id']) !== tenantId ||
          response.config.headers['x-environment'] !== (isLive ? 'live' : 'test') ||
          data?.id !== id || data.tenant_id !== tenantId || data.status !== 'draft') {
        throw new Error('This draft may have changed. Refresh the list before continuing.');
      }
      return data;
    },
    staleTime: 0,
    gcTime: 0,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: false,
  });
}
