// src/hooks/queries/usePlanTemplates.ts
//
// The plan catalogue a tenant can subscribe to — ContractNest's own commercial
// model, authored by the platform tenant as ordinary contract templates and
// served read-only across the tenant boundary by /templates/plans.
//
// Nothing here knows what a plan costs or what it grants: price, term, limits
// and credit grants all come from the template's metering blocks, authored by
// a human in catalog-studio. That is the whole point — no plan constant has a
// home in application code.

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import api from '@/services/api';
import { API_ENDPOINTS } from '@/services/serviceURLs';

export interface PlanTemplate {
  id: string;
  name: string;
  description: string | null;
  currency: string;
  /** 0 is a real price — the Free tier — not "unpriced". */
  price: number;
  term: { value: number | null; unit: string | null };
  /**
   * What the plan may CREATE, e.g. { contracts: 3, rfqs: 0 }.
   * 0 means zero. There is no unlimited plan.
   */
  limits: Record<string, number>;
  /** Notification credits granted per creation event, keyed by channel. */
  grants: Record<string, number>;
  /** Add-on flags the plan switches on, e.g. addon_vani_ai. */
  flags: string[];
  updated_at: string | null;
}

export interface PlanTemplatesResponse {
  success: boolean;
  data?: { plans: PlanTemplate[]; count: number };
}

export const planTemplateKeys = {
  all: ['plan-templates'] as const,
  // Keyed by tenant: the catalogue is environment-scoped server-side, so a
  // tenant switching test/live must not be served the other one's cache.
  list: (tenantId?: string) => [...planTemplateKeys.all, tenantId] as const,
};

export const usePlanTemplates = () => {
  const { currentTenant } = useAuth();

  return useQuery({
    queryKey: planTemplateKeys.list(currentTenant?.id),
    queryFn: async (): Promise<PlanTemplatesResponse> => {
      if (!currentTenant?.id) throw new Error('Missing tenant');
      const response = await api.get(API_ENDPOINTS.CATALOG_STUDIO.TEMPLATES.PLANS);
      return response.data;
    },
    enabled: !!currentTenant?.id,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
};

export default usePlanTemplates;
