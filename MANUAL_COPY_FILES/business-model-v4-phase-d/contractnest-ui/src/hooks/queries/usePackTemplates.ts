// src/hooks/queries/usePackTemplates.ts
//
// The credit-pack catalogue a tenant can buy from — same idea as
// usePlanTemplates, filtered server-side to category='topup_pack' so a pack
// never mixes with a plan. Price and grants come from the template's own
// metering block, authored in catalog-studio — nothing here is a constant.

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import api from '@/services/api';
import { API_ENDPOINTS } from '@/services/serviceURLs';

export interface PackTemplate {
  id: string;
  name: string;
  description: string | null;
  currency: string;
  price: number;
  /** Credits granted once, on payment, keyed by channel. */
  grants: Record<string, number>;
  updated_at: string | null;
}

export interface PackTemplatesResponse {
  success: boolean;
  data?: {
    packs: PackTemplate[];
    count: number;
  };
}

export const packTemplateKeys = {
  all: ['pack-templates'] as const,
  list: (tenantId?: string) => [...packTemplateKeys.all, tenantId] as const,
};

export const usePackTemplates = () => {
  const { currentTenant } = useAuth();

  return useQuery({
    queryKey: packTemplateKeys.list(currentTenant?.id),
    queryFn: async (): Promise<PackTemplatesResponse> => {
      if (!currentTenant?.id) throw new Error('Missing tenant');
      const response = await api.get(API_ENDPOINTS.CATALOG_STUDIO.TEMPLATES.PACKS);
      return response.data;
    },
    enabled: !!currentTenant?.id,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
};

export default usePackTemplates;
