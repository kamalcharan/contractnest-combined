// ============================================================================
// useStorefronts — the tenant's Extend storefronts (package-first)
// ============================================================================
// GET /api/extend/storefronts → list_storefronts RPC (migration
// business-model-v2/038). A storefront holds one or more packages (template
// families), a card style, an FAQ and counters; website / WhatsApp are
// channel entitlements on the tenant, returned alongside.
// Mutations: create (packages + card style), update (name / packages / card
// style / FAQ / pause).
// ============================================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import api from '@/services/api';
import { API_ENDPOINTS } from '@/services/serviceURLs';
import type { CardStyle, FaqRow, StorefrontPackage } from '@/pages/storefront/api';

export interface StorefrontCounters { views: number; chats: number; leads: number; starts: number; purchases: number }

export interface Storefront {
  id: string;
  storefront_key: string;
  name: string;
  is_active: boolean;
  template_ids: string[];
  packages: StorefrontPackage[];
  card_style: CardStyle;
  faq: FaqRow[];
  counters: StorefrontCounters;
  created_at: string;
  updated_at: string;
}

export interface StorefrontsPayload {
  storefronts: Storefront[];
  channels: { website: boolean; whatsapp: boolean };
  vani_enabled: boolean;
}

export interface StorefrontPatch {
  name?: string;
  template_ids?: string[];
  card_style?: Partial<CardStyle>;
  faq?: FaqRow[];
  is_active?: boolean;
}

export const storefrontKeys = {
  all: ['extend-storefronts'] as const,
};

const EMPTY: StorefrontsPayload = { storefronts: [], channels: { website: false, whatsapp: false }, vani_enabled: false };

export function useStorefronts() {
  const { currentTenant } = useAuth();
  return useQuery({
    queryKey: [...storefrontKeys.all, currentTenant?.id],
    enabled: !!currentTenant?.id,
    staleTime: 30_000,
    queryFn: async (): Promise<StorefrontsPayload> => {
      const res = await api.get(API_ENDPOINTS.EXTEND.STOREFRONTS);
      const data = res?.data?.data ?? res?.data;
      return {
        storefronts: (data?.storefronts ?? []) as Storefront[],
        channels: { website: !!data?.channels?.website, whatsapp: !!data?.channels?.whatsapp },
        vani_enabled: !!data?.vani_enabled,
      };
    },
    placeholderData: EMPTY,
  });
}

export function useCreateStorefront() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { template_ids: string[]; name?: string; card_style?: Partial<CardStyle> }) => {
      const res = await api.post(API_ENDPOINTS.EXTEND.STOREFRONTS, input);
      return (res?.data?.data ?? res?.data)?.storefront as Storefront;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: storefrontKeys.all }); },
  });
}

export function useUpdateStorefront() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; patch: StorefrontPatch }) => {
      const res = await api.patch(API_ENDPOINTS.EXTEND.STOREFRONT(input.id), input.patch);
      return (res?.data?.data ?? res?.data)?.storefront as Storefront;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: storefrontKeys.all }); },
  });
}
