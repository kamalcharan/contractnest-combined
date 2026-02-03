// src/hooks/useGatewayStatus.ts
// Hook to check if the current tenant has an active payment gateway configured.
// Returns hasActiveGateway boolean for use as a prop to RecordPaymentDialog.

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import api from '@/services/api';
import { API_ENDPOINTS } from '@/services/serviceURLs';

// ─── Query Key ───────────────────────────────────────────────

export const gatewayStatusKeys = {
  all: ['gateway-status'] as const,
  byTenant: (tenantId: string) => [...gatewayStatusKeys.all, tenantId] as const,
};

// ─── Response Shape ──────────────────────────────────────────

interface GatewayStatusResult {
  hasActiveGateway: boolean;
  gatewayProvider: string | null;
  providerDisplayName: string | null;
}

// ─── Hook ────────────────────────────────────────────────────

export function useGatewayStatus() {
  const { currentTenant } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: gatewayStatusKeys.byTenant(currentTenant?.id || ''),
    queryFn: async (): Promise<GatewayStatusResult> => {
      if (!currentTenant?.id) {
        return { hasActiveGateway: false, gatewayProvider: null, providerDisplayName: null };
      }

      try {
        const response = await api.get(API_ENDPOINTS.INTEGRATIONS.LIST, {
          params: { type: 'payment_gateway', isLive: true },
        });

        const integrations = response.data?.data || response.data || [];

        // Find first active + configured payment gateway
        const active = Array.isArray(integrations)
          ? integrations.find(
              (i: any) =>
                i.is_active === true &&
                i.connection_status !== 'Not Configured' &&
                i.connection_status !== 'not_configured'
            )
          : null;

        return {
          hasActiveGateway: !!active,
          gatewayProvider: active?.provider?.name || null,
          providerDisplayName: active?.provider?.display_name || null,
        };
      } catch {
        // Non-critical — default to no gateway
        return { hasActiveGateway: false, gatewayProvider: null, providerDisplayName: null };
      }
    },
    enabled: !!currentTenant?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes — gateway config rarely changes
    refetchOnWindowFocus: false,
  });

  return {
    /** Whether tenant has an active, configured payment gateway */
    hasActiveGateway: data?.hasActiveGateway ?? false,
    /** Gateway provider key (e.g. 'razorpay') */
    gatewayProvider: data?.gatewayProvider ?? null,
    /** Human-readable provider name (e.g. 'Razorpay') */
    providerDisplayName: data?.providerDisplayName ?? null,
    /** Whether the status check is still loading */
    isLoading,
  };
}
