// src/hooks/queries/usePackTemplates.ts
//
// The pack catalogue a tenant can buy from — same idea as usePlanTemplates,
// filtered server-side to category IN ('topup_pack', 'wallet_topup') so
// neither ever mixes with a plan. Price and grants come from the template's
// own metering block (or, for a wallet top-up, the template's own price),
// authored in catalog-studio — nothing here is a constant.
//
// Two different things ride this one type/hook on purpose — see
// handleGetPackTemplates in the cat-templates edge function for why reusing
// one endpoint beats building a parallel pipe for wallet top-ups.

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
  /** Credits granted once, on payment, keyed by channel. Empty for a wallet top-up. */
  grants: Record<string, number>;
  /** Addon flags this pack unlocks on payment (e.g. addon_extend_website). Empty for a plain credit/wallet pack. */
  flags: string[];
  /**
   * Set only for a wallet top-up template — the amount (in paise) credited
   * to t_tenant_context.wallet_balance_paise on payment. 0 for a credit pack.
   */
  wallet_paise: number;
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
