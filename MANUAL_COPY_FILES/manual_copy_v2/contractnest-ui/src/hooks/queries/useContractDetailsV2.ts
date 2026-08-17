// src/hooks/queries/useContractDetailsV2.ts
// JTD Nucleus Step 3 — ONE network call for the whole contract view.
//
// GET /api/v2/contracts/:id/details → get_contract_details_v2 returns
// { contract, events: { items, total_count, source }, cnak, invoices, as_of }
// in a single round-trip (replaces 4: contract, events, dates, invoices).
// events.source tells you where the rows came from: 'jtd' (n_jtd JOB rows —
// the nucleus) or 'legacy' (t_contract_events fallback for pre-nucleus
// contracts) — both eras render through the same endpoint.
//
// INTEGRATION STRATEGY — cache seeding, zero component changes:
// every existing component keeps its existing hook (useContract,
// useContractEventsForContract, useContractInvoices); this hook fetches
// the aggregate once and SEEDS those hooks' cache keys via setQueryData,
// so their queries resolve instantly from fresh cache instead of firing
// their own requests. No screen component is touched.
//
// FRESHNESS (owner-approved design):
//   L1 — mutations invalidate detailsV2Keys → refetch → re-seed
//   L2 — refetch on window focus
//   L3 — state-aware polling: 15s while pending (someone else can act any
//        second: CNAK claim, payment, auto-activation), 60s while active
//        (cron flips, payments), OFF on terminal states, paused when the
//        tab is hidden. Structural sharing means an unchanged poll
//        re-renders nothing.
//
// Escape hatch: ?useV1=1 disables this hook entirely — the page's
// existing per-query hooks then fetch exactly as before this change.

import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import api from '@/services/api';
import { captureException } from '@/utils/sentry';
import { contractKeys } from '@/hooks/queries/useContractQueries';
import { contractEventKeys } from '@/hooks/queries/useContractEventQueries';
import { invoiceKeys } from '@/hooks/queries/useInvoiceQueries';
import type { ContractEvent, ContractEventFilters } from '@/types/contractEvents';

export interface ContractDetailsV2Cnak {
  global_access_id: string;
  status: string;
  accessor_name: string | null;
  accessor_contact_id: string | null;
  accessor_tenant_id: string | null;
  accessor_role: string | null;
  claimed_at: string | null;
  link_clicked_at: string | null;
  expires_at: string | null;
  is_active: boolean;
  has_secret: boolean;
  created_at: string;
}

export interface ContractDetailsV2 {
  contract: Record<string, any>;
  events: {
    items: ContractEvent[];
    total_count: number;
    /** 'jtd' = n_jtd job rows (the nucleus) · 'legacy' = t_contract_events fallback */
    source: 'jtd' | 'legacy';
  };
  cnak: ContractDetailsV2Cnak | null;
  invoices: { invoices: any[]; summary: any } | null;
  as_of: string;
}

export const detailsV2Keys = {
  all: ['contract-details-v2'] as const,
  detail: (contractId: string) => [...detailsV2Keys.all, contractId] as const,
};

/** Poll rate by contract state — hot while someone else can act, quiet
 *  when nothing can move, silent on terminal states. */
function pollIntervalFor(status: string | undefined): number | false {
  switch (status) {
    case 'pending_acceptance':
    case 'pending_review':
    case 'sent':
      return 15_000;
    case 'active':
      return 60_000;
    case 'completed':
    case 'cancelled':
    case 'expired':
      return false;
    default:
      return 60_000; // draft / unknown — modest default
  }
}

/** The exact filter objects useContractEventsForContract builds — these ARE
 *  the cache keys its consumers read, so seeding must match them verbatim.
 *  (Two variants exist in the codebase: default per_page 50, EquipmentTab 100.) */
function eventFilterVariants(contractId: string): ContractEventFilters[] {
  return [50, 100].map((per_page) => ({
    contract_id: contractId,
    page: 1,
    per_page,
    sort_by: 'scheduled_date',
    sort_order: 'asc',
  })) as ContractEventFilters[];
}

export const useContractDetailsV2 = (
  contractId: string | null,
  options?: { enabled?: boolean }
) => {
  const { currentTenant } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: detailsV2Keys.detail(contractId || ''),
    queryFn: async (): Promise<ContractDetailsV2> => {
      if (!contractId || !currentTenant?.id) {
        throw new Error('Contract ID and tenant are required');
      }
      const response = await api.get(`/api/v2/contracts/${contractId}/details`);
      const data = response.data?.data || response.data;
      if (!data?.contract) {
        throw new Error('Contract not found');
      }
      return data as ContractDetailsV2;
    },
    enabled: !!contractId && !!currentTenant?.id && (options?.enabled !== false),
    staleTime: 10_000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
    refetchIntervalInBackground: false, // paused when tab hidden
    refetchInterval: (q) =>
      pollIntervalFor((q.state.data as ContractDetailsV2 | undefined)?.contract?.status),
    structuralSharing: true,
    retry: 2,
    meta: {
      onError: (error: any) => {
        captureException(error, {
          tags: { component: 'useContractDetailsV2' },
          extra: { contractId, tenantId: currentTenant?.id },
        });
      },
    },
  });

  // ── Seed the existing hooks' cache keys from the aggregate, so every
  //    component renders from this ONE response without its own fetch. ──
  const data = query.data;
  useEffect(() => {
    if (!data || !contractId) return;

    // 1. Contract detail (useContract)
    queryClient.setQueryData(contractKeys.detail(contractId), data.contract);

    // 2. Events list (useContractEventsForContract) — both filter variants
    for (const filters of eventFilterVariants(contractId)) {
      queryClient.setQueryData(contractEventKeys.list(filters), {
        items: data.events.items,
        total_count: data.events.total_count,
        page_info: {
          has_next_page: false,
          has_prev_page: false,
          current_page: 1,
          total_pages: 1,
        },
        filters_applied: filters,
      });
    }

    // 3. Invoices (useContractInvoices)
    if (data.invoices) {
      queryClient.setQueryData(invoiceKeys.byContract(contractId), {
        invoices: data.invoices.invoices || [],
        summary: data.invoices.summary || {},
      });
    }
  }, [data, contractId, queryClient]);

  return query;
};

export default useContractDetailsV2;
