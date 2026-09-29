// ============================================================================
// useVaniSite — VaNi on the tenant's own website (migration 040)
// ============================================================================
// GET/PATCH /api/extend/vani-site → vani_site_get_config / _update_config.

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import api from '@/services/api';
import { API_ENDPOINTS } from '@/services/serviceURLs';

export interface VaniSiteConfig {
  site_key: string; enabled: boolean; greeting: string | null;
  handoff_mode: 'capture' | 'whatsapp'; handoff_phone: string | null;
  capture_mode: 'interest' | 'first' | 'never';
  allowed_domains: string[]; storefront_ids: string[];
  counters: { chats: number; answered: number; leads: number; handoffs: number };
  updated_at: string;
}
export interface VaniSitePayload {
  config: VaniSiteConfig;
  vani_enabled: boolean;
  seller: { name: string; logo_url: string | null; primary_color: string | null; city: string | null; whatsapp: string | null };
  month: { chats: number; answered: number; leads: number };
  storefronts: Array<{ id: string; name: string; storefront_key: string; is_active: boolean }>;
}
export type VaniSitePatch = Partial<Pick<VaniSiteConfig, 'greeting' | 'handoff_mode' | 'handoff_phone' | 'capture_mode' | 'allowed_domains' | 'storefront_ids' | 'enabled'>>;

export const vaniSiteKeys = { all: ['vani-site'] as const };

export function useVaniSite(enabled = true) {
  const { currentTenant } = useAuth();
  return useQuery({
    queryKey: [...vaniSiteKeys.all, currentTenant?.id],
    enabled: enabled && !!currentTenant?.id,
    staleTime: 30_000,
    queryFn: async (): Promise<VaniSitePayload> => {
      const res = await api.get(API_ENDPOINTS.EXTEND.VANI_SITE);
      return (res?.data?.data ?? res?.data) as VaniSitePayload;
    },
  });
}

export function useUpdateVaniSite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: VaniSitePatch) => {
      const res = await api.patch(API_ENDPOINTS.EXTEND.VANI_SITE, patch);
      return (res?.data?.data ?? res?.data)?.config as VaniSiteConfig;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: vaniSiteKeys.all }); },
  });
}
