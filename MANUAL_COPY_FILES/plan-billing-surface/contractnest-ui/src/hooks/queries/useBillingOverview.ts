// src/hooks/queries/useBillingOverview.ts
//
// The single read behind /businessmodel/tenants/subscription and
// /businessmodel/tenants/billing.
//
// One query for both pages on purpose: the two disagreeing about whether you
// owe money would be worse than either being marginally slower, and every
// field here comes off the same server-side snapshot.
//
// NOT environment-scoped. ContractNest's own commercial model is always live
// — a tenant working in its test environment is still on the same real plan
// and owes the same real money.

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import api from '@/services/api';
import { API_ENDPOINTS } from '@/services/serviceURLs';

/** Whether the seller behind the catalogue can actually be paid. */
export interface SellerCapability {
  name: string | null;
  can_collect: boolean;
  online: boolean;
  offline_upi: boolean;
}

export interface OverviewPlan {
  contract_id: string;
  contract_number: string | null;
  name: string | null;
  status: string;
  template_id: string | null;
  amount: number | null;
  currency: string;
  period_start: string | null;
  period_end: string | null;
  /** Paid and live. */
  is_running: boolean;
  /**
   * Reserved but never paid for. The most important flag on this payload —
   * an unpaid plan is not a running plan, whatever its term dates say, and
   * it must never be given a term countdown.
   */
  awaiting_payment: boolean;
  days_remaining: number | null;
}

export interface OverviewRhythm {
  source: 'events' | 'computed' | 'none';
  cycle: string | null;
  total_installments: number;
  paid_installments: number;
  next_due_date?: string | null;
  next_due_amount?: number | null;
  days_to_next?: number | null;
  is_overdue?: boolean;
  awaiting_first_payment?: boolean;
  schedule?: Array<{ sequence: number; date: string; amount: number; status: string }>;
}

export interface OutstandingInvoice {
  invoice_id: string;
  invoice_number: string | null;
  contract_id: string | null;
  contract_number: string | null;
  label: string;
  total: number;
  balance: number;
  currency: string;
  due_date: string | null;
  issued_at: string | null;
  is_overdue: boolean;
}

export interface PaymentAttempt {
  request_id: string;
  invoice_id: string | null;
  at: string;
  amount: number;
  currency: string;
  provider: string | null;
  mode: string | null;
  status: string;
  paid_at: string | null;
}

export interface HistoryEntry {
  kind: string;
  at: string;
  invoice_id: string;
  reference: string | null;
  contract_id: string | null;
  contract_number: string | null;
  label: string;
  sublabel: string;
  amount: number;
  balance: number;
  currency: string;
  status: 'paid' | 'unpaid' | 'cancelled' | 'activated';
  paid_at: string | null;
}

export interface ContinuityLink {
  contract_id: string;
  contract_number: string | null;
  name: string | null;
  status: string;
  amount: number | null;
  start_date: string | null;
  end_date: string | null;
  succeeds: string | null;
  succeeded_by: string | null;
  reason: string | null;
  is_current: boolean;
}

export interface NextPlan {
  contract_id: string;
  contract_number: string | null;
  name: string | null;
  status: string;
  amount: number | null;
  starts_on: string | null;
  ends_on: string | null;
}

export interface BillingOverview {
  success: boolean;
  has_account: boolean;
  today: string;
  plan: OverviewPlan | null;
  rhythm: OverviewRhythm;
  next_plan: NextPlan | null;
  outstanding: { total: number; invoices: OutstandingInvoice[] };
  attempts: PaymentAttempt[];
  history: HistoryEntry[];
  continuity: ContinuityLink[];
  seller: SellerCapability;
}

export const billingOverviewKeys = {
  all: ['billing-overview'] as const,
  for: (tenantId?: string) => [...billingOverviewKeys.all, tenantId] as const,
};

export const useBillingOverview = () => {
  const { currentTenant } = useAuth();

  return useQuery<BillingOverview>({
    queryKey: billingOverviewKeys.for(currentTenant?.id),
    queryFn: async () => {
      const response = await api.get(API_ENDPOINTS.BILLING.OVERVIEW);
      return response.data as BillingOverview;
    },
    enabled: !!currentTenant?.id,
    // Money owed is the kind of fact a stale cache makes a liar of — a
    // tenant who just paid must not still be told to pay.
    staleTime: 15_000,
    refetchOnWindowFocus: true,
  });
};

export default useBillingOverview;
