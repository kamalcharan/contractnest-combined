// ============================================================================
// Finance queries — Stage 1 Finance AR/AP (Operations → Finance)
// Tenant-level receivables/payables + invoice actions + tax summary (Sprint 4).
// Conventions per useInvoiceQueries: shared axios `api`, query-key factory,
// currentTenant guard, response unwrap, vaniToast on mutations.
// ============================================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { vaniToast } from '@/components/common/toast';

// ─────────────────────────────────────────────
// Endpoints (new /api/finance surface)
// ─────────────────────────────────────────────
export const FINANCE_ENDPOINTS = {
  RECEIVABLES: '/api/finance/receivables',
  PAYABLES: '/api/finance/payables',
  TAX_SUMMARY: '/api/finance/tax-summary',
  APPROVE: (invoiceId: string) => `/api/finance/invoices/${invoiceId}/approve`,
  REMIND: (invoiceId: string) => `/api/finance/invoices/${invoiceId}/remind`,
  CANCEL: (invoiceId: string) => `/api/finance/invoices/${invoiceId}/cancel`
};

// ─────────────────────────────────────────────
// Types (mirror get_tenant_receivables / get_tenant_payables RPC shapes)
// ─────────────────────────────────────────────
export interface AgeingBucket {
  total: number;
  count: number;
}

export interface ReceivablesSummary {
  total_outstanding: number;
  outstanding_count: number;
  overdue_total: number;
  overdue_count: number;
  upcoming_7_total: number;
  upcoming_7_count: number;
  upcoming_15_total: number;
  upcoming_15_count: number;
  upcoming_30_total: number;
  upcoming_30_count: number;
  draft_total: number;
  draft_count: number;
  collected_total: number;
  collected_this_month: number;
  ageing: {
    b_1_7: AgeingBucket;
    b_8_15: AgeingBucket;
    b_16_30: AgeingBucket;
    b_30_plus: AgeingBucket;
  };
}

export interface PayablesSummary {
  total_payable: number;
  payable_count: number;
  overdue_total: number;
  overdue_count: number;
  upcoming_7_total: number;
  upcoming_7_count: number;
  upcoming_15_total: number;
  upcoming_15_count: number;
  upcoming_30_total: number;
  upcoming_30_count: number;
  paid_total: number;
}

export interface FinanceInvoice {
  id: string;
  invoice_number: string;
  status: 'draft' | 'unpaid' | 'partially_paid' | 'paid' | 'overdue' | 'cancelled' | 'bad_debt';
  amount: number;
  tax_amount: number;
  total_amount: number;
  amount_paid: number;
  balance: number;
  currency: string;
  due_date: string | null;
  issued_at: string | null;
  paid_at: string | null;
  emi_sequence: number | null;
  emi_total: number | null;
  billing_cycle: string | null;
  payment_mode: string | null;
  contract_event_id: string | null;
  last_reminder_at?: string | null;
  created_at: string;
  contract_id: string;
  contract_number: string;
  contract_name: string;
  buyer_id?: string | null;
  buyer_name?: string | null;
  buyer_company?: string | null;
  counterparty_name?: string;
  source?: 'own_vendor_contract' | 'claimed_contract';
  days_overdue: number;
}

export interface BuyerGroup {
  buyer_id: string | null;
  buyer_name: string;
  outstanding: number;
  overdue_total: number | null;
  invoice_count: number;
  oldest_due_date: string | null;
  max_days_overdue: number;
}

export interface VendorGroup {
  counterparty_name: string;
  outstanding: number;
  overdue_total: number;
  invoice_count: number;
  oldest_due_date: string | null;
}

export interface ReceivablesResponse {
  success: boolean;
  as_of: string;
  summary: ReceivablesSummary;
  by_buyer: BuyerGroup[];
  invoices: FinanceInvoice[];
}

export interface PayablesResponse {
  success: boolean;
  as_of: string;
  summary: PayablesSummary;
  by_vendor: VendorGroup[];
  invoices: FinanceInvoice[];
}

// ─────────────────────────────────────────────
// Types — tax summary (Sprint 4, mirrors get_tenant_tax_summary RPC shape)
// ─────────────────────────────────────────────
export interface TaxComponent {
  name: string;
  amount: number;
}

export interface TaxMonth {
  month: string; // 'YYYY-MM'
  invoice_count: number;
  taxable_value: number;
  tax_invoiced: number;
  total_invoiced: number;
  collected_value: number;
  tax_collected_approx: number;
  components: TaxComponent[];
}

export interface TaxSummaryResponse {
  success: boolean;
  months: TaxMonth[];
  basis: string;
  note?: string;
  retrieved_at: string;
}

// ─────────────────────────────────────────────
// Query keys
// ─────────────────────────────────────────────
export const financeKeys = {
  all: ['finance'] as const,
  receivables: (tenantId: string) => [...financeKeys.all, 'receivables', tenantId] as const,
  payables: (tenantId: string) => [...financeKeys.all, 'payables', tenantId] as const,
  taxSummary: (tenantId: string) => [...financeKeys.all, 'tax-summary', tenantId] as const
};

// ─────────────────────────────────────────────
// Queries
// ─────────────────────────────────────────────
export const useReceivables = (options?: { enabled?: boolean }) => {
  const { currentTenant } = useAuth();

  return useQuery({
    queryKey: financeKeys.receivables(currentTenant?.id || ''),
    queryFn: async (): Promise<ReceivablesResponse> => {
      if (!currentTenant?.id) {
        throw new Error('Missing tenant');
      }
      const response = await api.get(FINANCE_ENDPOINTS.RECEIVABLES);
      return response.data?.data || response.data;
    },
    enabled: !!currentTenant?.id && (options?.enabled !== false),
    staleTime: 30_000,
    refetchOnWindowFocus: false
  });
};

export const usePayables = (options?: { enabled?: boolean }) => {
  const { currentTenant } = useAuth();

  return useQuery({
    queryKey: financeKeys.payables(currentTenant?.id || ''),
    queryFn: async (): Promise<PayablesResponse> => {
      if (!currentTenant?.id) {
        throw new Error('Missing tenant');
      }
      const response = await api.get(FINANCE_ENDPOINTS.PAYABLES);
      return response.data?.data || response.data;
    },
    enabled: !!currentTenant?.id && (options?.enabled !== false),
    staleTime: 30_000,
    refetchOnWindowFocus: false
  });
};

/**
 * Sprint 4 — month-wise tax records for the current tenant (own tax data,
 * same for both revenue/expense perspective since it reads t_invoices
 * scoped to tenant_id, not by_buyer/by_vendor).
 */
export const useTaxSummary = (options?: { enabled?: boolean }) => {
  const { currentTenant } = useAuth();

  return useQuery({
    queryKey: financeKeys.taxSummary(currentTenant?.id || ''),
    queryFn: async (): Promise<TaxSummaryResponse> => {
      if (!currentTenant?.id) {
        throw new Error('Missing tenant');
      }
      const response = await api.get(FINANCE_ENDPOINTS.TAX_SUMMARY);
      return response.data?.data || response.data;
    },
    enabled: !!currentTenant?.id && (options?.enabled !== false),
    staleTime: 60_000,
    refetchOnWindowFocus: false
  });
};

// ─────────────────────────────────────────────
// Mutations
// ─────────────────────────────────────────────
const extractErrorMessage = (error: any): string =>
  error?.response?.data?.error?.message ||
  error?.response?.data?.error ||
  error?.message ||
  'Something went wrong';

export const useApproveDraftInvoice = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (invoiceId: string) => {
      const response = await api.post(FINANCE_ENDPOINTS.APPROVE(invoiceId), {});
      return response.data;
    },
    onSuccess: (data) => {
      const invoiceNumber = data?.data?.invoice_number || 'Invoice';
      vaniToast.success(`${invoiceNumber} approved — it is now live AR`, { duration: 3000 });
      queryClient.invalidateQueries({ queryKey: financeKeys.all });
    },
    onError: (error: any) => {
      vaniToast.error(`Approve failed: ${extractErrorMessage(error)}`, { duration: 5000 });
    }
  });
};

export const useSendInvoiceReminder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (invoiceId: string) => {
      const response = await api.post(FINANCE_ENDPOINTS.REMIND(invoiceId), {});
      return response.data;
    },
    onSuccess: (data) => {
      const recipient = data?.data?.recipient || 'the buyer';
      vaniToast.success(`Payment reminder queued to ${recipient}`, { duration: 3000 });
      queryClient.invalidateQueries({ queryKey: financeKeys.all });
    },
    onError: (error: any) => {
      vaniToast.error(`Reminder failed: ${extractErrorMessage(error)}`, { duration: 5000 });
    }
  });
};

export const useCancelDraftInvoice = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { invoiceId: string; contractId: string; reason?: string }) => {
      const response = await api.post(FINANCE_ENDPOINTS.CANCEL(params.invoiceId), {
        contract_id: params.contractId,
        reason: params.reason
      });
      return response.data;
    },
    onSuccess: () => {
      vaniToast.success('Invoice cancelled', { duration: 3000 });
      queryClient.invalidateQueries({ queryKey: financeKeys.all });
    },
    onError: (error: any) => {
      vaniToast.error(`Cancel failed: ${extractErrorMessage(error)}`, { duration: 5000 });
    }
  });
};
