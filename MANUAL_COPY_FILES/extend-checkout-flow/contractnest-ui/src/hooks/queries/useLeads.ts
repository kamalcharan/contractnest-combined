// ============================================================================
// useLeads — contacts tagged 'lead' + their interests (migration 039)
// ============================================================================
// GET /api/leads → get_leads: 'reach' (one row per contact with interests)
// and 'asked' (RFQs another tenant sent us) come back together with counts.
// Mutations: capture a lead by hand, set an interest's stage / add a note.

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import api from '@/services/api';
import { API_ENDPOINTS } from '@/services/serviceURLs';

export type LeadStage = 'new' | 'contacted' | 'converted' | 'lost';

export interface LeadInterest {
  id: string;
  kind: 'storefront' | 'vani' | 'manual';
  channel: string | null;
  storefront_key: string | null;
  template_family: string | null;
  template_name: string | null;
  stage: LeadStage;
  question: string | null;
  note: string | null;
  contract_id: string | null;
  contract_number: string | null;
  created_at: string;
  last_activity_at: string;
  converted_at: string | null;
}

export interface LeadRow {
  contact: {
    id: string; name: string; person: string | null; type: string; classifications: string[] | null;
    contact_number: string | null; mobile: string | null; email: string | null;
  };
  stage: LeadStage;
  last_activity_at: string;
  interests: LeadInterest[];
}

export interface AskedRow {
  rfq_id: string; rfq_number: string | null; title: string; buyer_name: string; buyer_tenant_id: string;
  state: 'open' | 'quoted' | 'awarded' | 'declined' | 'closed';
  response_status: string | null; rfq_status: string;
  deadline: string | null; deadline_time: string | null; blocks_count: number; location: string | null;
  quoted_amount: number | null; quote_currency: string | null; responded_at: string | null; viewed_at: string | null;
  asked_at: string; quote_path: string | null;
}

export interface LeadsPayload {
  reach: { rows: LeadRow[]; counts: Record<'all' | LeadStage, number> };
  asked: { rows: AskedRow[]; counts: Record<'all' | 'open' | 'quoted' | 'awarded' | 'closed', number> };
}

export interface LeadsFilters { tab: 'reach' | 'asked'; stage?: LeadStage | 'all'; q?: string }

export const leadKeys = { all: ['leads'] as const };

export function useLeads(filters: LeadsFilters) {
  const { currentTenant } = useAuth();
  return useQuery({
    queryKey: [...leadKeys.all, currentTenant?.id, filters.tab, filters.stage || 'all', filters.q || ''],
    enabled: !!currentTenant?.id,
    staleTime: 15_000,
    queryFn: async (): Promise<LeadsPayload> => {
      const params = new URLSearchParams({ tab: filters.tab });
      if (filters.stage && filters.stage !== 'all') params.set('stage', filters.stage);
      if (filters.q) params.set('q', filters.q);
      const res = await api.get(`${API_ENDPOINTS.LEADS.LIST}?${params.toString()}`);
      const data = res?.data?.data ?? res?.data;
      return {
        reach: { rows: data?.reach?.rows ?? [], counts: data?.reach?.counts ?? { all: 0, new: 0, contacted: 0, converted: 0, lost: 0 } },
        asked: { rows: data?.asked?.rows ?? [], counts: data?.asked?.counts ?? { all: 0, open: 0, quoted: 0, awarded: 0, closed: 0 } },
      };
    },
  });
}

export function useSetLeadStage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { interestId: string; stage?: LeadStage; note?: string }) => {
      const res = await api.patch(API_ENDPOINTS.LEADS.INTEREST(input.interestId), { stage: input.stage, note: input.note });
      return res?.data?.data ?? res?.data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: leadKeys.all }); },
  });
}

export function useCaptureLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { name: string; company?: string; phone?: string; country_code?: string; email?: string; template_family?: string; note?: string }) => {
      const res = await api.post(API_ENDPOINTS.LEADS.CAPTURE, input);
      return res?.data?.data ?? res?.data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: leadKeys.all }); },
  });
}
