// ============================================================================
// useTouchpoints — the tenant's Extend touchpoints (storefront publications)
// ============================================================================
// GET /api/extend/touchpoints → list_touchpoints RPC. One row per
// (template, route): storefront key, active state, views/purchases counters.
// Mutations: publish a template to a route, pause/resume a touchpoint.
// ============================================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import api from '@/services/api';
import { API_ENDPOINTS } from '@/services/serviceURLs';

export type TouchpointType = 'website' | 'whatsapp' | 'email';

export interface Touchpoint {
  id: string;
  template_id: string;
  template_name: string;
  touchpoint_type: TouchpointType;
  storefront_key: string;
  is_active: boolean;
  views_count: number;
  purchases_count: number;
  created_at: string;
}

export const touchpointKeys = {
  all: ['extend-touchpoints'] as const,
};

export function useTouchpoints() {
  const { currentTenant } = useAuth();
  return useQuery({
    queryKey: [...touchpointKeys.all, currentTenant?.id],
    enabled: !!currentTenant?.id,
    staleTime: 30_000,
    queryFn: async (): Promise<Touchpoint[]> => {
      const res = await api.get(API_ENDPOINTS.EXTEND.TOUCHPOINTS);
      const data = res?.data?.data ?? res?.data;
      return (data?.touchpoints ?? []) as Touchpoint[];
    },
  });
}

export function useCreateTouchpoint() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { template_id: string; touchpoint_type: TouchpointType }) => {
      const res = await api.post(API_ENDPOINTS.EXTEND.TOUCHPOINTS, input);
      return (res?.data?.data ?? res?.data)?.touchpoint as Touchpoint;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: touchpointKeys.all });
    },
  });
}

export function useSetTouchpointActive() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; is_active: boolean }) => {
      const res = await api.patch(API_ENDPOINTS.EXTEND.TOUCHPOINT(input.id), { is_active: input.is_active });
      return res?.data?.data ?? res?.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: touchpointKeys.all });
    },
  });
}
