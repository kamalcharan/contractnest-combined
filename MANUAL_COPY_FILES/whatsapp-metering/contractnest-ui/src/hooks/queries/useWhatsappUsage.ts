// src/hooks/queries/useWhatsappUsage.ts
//
// WhatsApp credits left and this IST month's usage, split into notifications,
// team assistant and customer chat (get_whatsapp_usage, batch
// whatsapp-metering). Not environment-scoped: credits are always live.

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import api from '@/services/api';
import { API_ENDPOINTS } from '@/services/serviceURLs';

export interface WhatsappUsage {
  success: boolean;
  metered: boolean;
  available: number;
  balance: number;
  reserved: number;
  /** ok · low (under 20 % of the last purchase, or 10) · out · not_metered */
  state: 'ok' | 'low' | 'out' | 'not_metered';
  low_threshold: number;
  last_purchase: { quantity: number; at: string } | null;
  month: {
    from: string;
    notifications: number;
    team: number;
    customer: number;
    total: number;
    inbound: number;
    free_closing: number;
  };
  generated_at: string;
}

export const whatsappUsageKeys = {
  detail: (tenantId?: string) => ['whatsapp-usage', tenantId] as const,
};

export const useWhatsappUsage = () => {
  const { currentTenant } = useAuth();
  return useQuery({
    queryKey: whatsappUsageKeys.detail(currentTenant?.id),
    queryFn: async (): Promise<WhatsappUsage> => {
      const response = await api.get(API_ENDPOINTS.TENANT_CONTEXT.WHATSAPP_USAGE);
      return (response.data?.data ?? response.data) as WhatsappUsage;
    },
    enabled: !!currentTenant?.id,
    staleTime: 60 * 1000,
    retry: 1,
  });
};

export default useWhatsappUsage;
