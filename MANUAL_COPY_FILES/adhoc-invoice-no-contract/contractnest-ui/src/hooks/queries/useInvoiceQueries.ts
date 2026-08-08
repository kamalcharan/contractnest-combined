// src/hooks/queries/useInvoiceQueries.ts
// Invoice & Receipt TanStack Query Hooks

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import api from '@/services/api';
import { API_ENDPOINTS } from '@/services/serviceURLs';
import { captureException } from '@/utils/sentry';
import { financeKeys } from '@/hooks/queries/useFinanceQueries';
import { useInvalidateContactCockpit } from '@/hooks/queries/useContactCockpit';
import type { Invoice, InvoiceSummary, RecordPaymentPayload, RecordPaymentResponse, CancelInvoicePayload, CancelInvoiceResponse, CancelReceiptPayload, CancelReceiptResponse } from '@/types/contracts';

// =================================================================
// QUERY KEYS
// =================================================================

export const invoiceKeys = {
  all: ['invoices'] as const,
  byContract: (contractId: string) => [...invoiceKeys.all, 'contract', contractId] as const,
};

// =================================================================
// RESPONSE TYPE
// =================================================================

interface ContractInvoicesResponse {
  invoices: Invoice[];
  summary: InvoiceSummary;
}

// =================================================================
// QUERY HOOKS
// =================================================================

/**
 * Fetch all invoices for a contract with collection summary.
 * Returns invoices array + summary (totals, percentages, counts).
 */
export const useContractInvoices = (
  contractId: string | undefined,
  options?: { enabled?: boolean }
) => {
  const { currentTenant } = useAuth();

  return useQuery({
    queryKey: invoiceKeys.byContract(contractId || ''),
    queryFn: async (): Promise<ContractInvoicesResponse> => {
      if (!currentTenant?.id || !contractId) {
        throw new Error('Missing tenant or contract ID');
      }

      const response = await api.get(API_ENDPOINTS.CONTRACTS.INVOICES(contractId));
      const result = response.data?.data || response.data;

      return {
        invoices: result?.invoices || [],
        summary: result?.summary || {
          total_invoiced: 0,
          total_paid: 0,
          total_balance: 0,
          invoice_count: 0,
          paid_count: 0,
          unpaid_count: 0,
          partial_count: 0,
          overdue_count: 0,
          cancelled_count: 0,
          bad_debt_count: 0,
          collection_percentage: 0,
        },
      };
    },
    enabled: !!currentTenant?.id && !!contractId && (options?.enabled !== false),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
    meta: {
      onError: (error: any) => {
        captureException(error, {
          tags: { component: 'useContractInvoices' },
          extra: { contractId, tenantId: currentTenant?.id },
        });
      },
    },
  });
};

// =================================================================
// MUTATION: Record Payment
// =================================================================

/**
 * Record a payment receipt against a contract invoice.
 * Invalidates invoice queries on success so UI refreshes.
 */
export const useRecordPayment = (contractId: string | undefined) => {
  const { currentTenant } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: RecordPaymentPayload): Promise<RecordPaymentResponse> => {
      if (!currentTenant?.id || !contractId) {
        throw new Error('Missing tenant or contract ID');
      }

      const response = await api.post(
        API_ENDPOINTS.CONTRACTS.RECORD_PAYMENT(contractId),
        payload
      );

      const result = response.data?.data || response.data;

      if (result?.success === false) {
        throw new Error(result.error || 'Failed to record payment');
      }

      return result;
    },
    onSuccess: () => {
      if (contractId) {
        queryClient.invalidateQueries({ queryKey: invoiceKeys.byContract(contractId) });
      }
    },
    meta: {
      onError: (error: any) => {
        captureException(error, {
          tags: { component: 'useRecordPayment' },
          extra: { contractId, tenantId: currentTenant?.id },
        });
      },
    },
  });
};

// =================================================================
// MUTATION: Create Adhoc Invoice (no contract — settled at creation)
// =================================================================

export interface AdhocLineItemPayload {
  block_id?: string | null;
  name: string;
  qty: number;
  unit_price: number;
  amount: number;
}

export interface CreateAdhocInvoicePayload {
  contact_id: string;
  currency: string;
  line_items: AdhocLineItemPayload[];
  tax_amount?: number;
  payment_method: string;
  payment_date?: string | null;
  reference_number?: string | null;
  notes?: string | null;
}

export interface CreateAdhocInvoiceResponse {
  invoice_id: string;
  invoice_number: string;
  receipt_id: string;
  receipt_number: string;
  contact_id: string;
  amount: number;
  tax_amount: number;
  total_amount: number;
  currency: string;
  status: string;
}

/**
 * Create a contact-less invoice (Group Sessions Payments-to-confirm / Contact
 * Financials "Adhoc Service" entry points). Invoice + settling receipt are
 * created together server-side (create_adhoc_invoice) — always fully paid,
 * no separate record-payment step. Invalidates the receivables/cockpit
 * queries that surface it so Finance updates immediately.
 */
export const useCreateAdhocInvoice = () => {
  const { currentTenant } = useAuth();
  const queryClient = useQueryClient();
  const { invalidateForContact } = useInvalidateContactCockpit();

  return useMutation({
    mutationFn: async (payload: CreateAdhocInvoicePayload): Promise<CreateAdhocInvoiceResponse> => {
      if (!currentTenant?.id) {
        throw new Error('Missing tenant');
      }

      const response = await api.post(API_ENDPOINTS.INVOICES.ADHOC, payload);
      const result = response.data?.data || response.data;

      if (result?.success === false) {
        throw new Error(result.error || 'Failed to create invoice');
      }

      return result;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: financeKeys.all });
      invalidateForContact(variables.contact_id);
    },
    meta: {
      onError: (error: any) => {
        captureException(error, {
          tags: { component: 'useCreateAdhocInvoice' },
          extra: { tenantId: currentTenant?.id },
        });
      },
    },
  });
};

// =================================================================
// MUTATION: Cancel / Write-off Invoice
// =================================================================

/**
 * Cancel an invoice or mark it as bad debt.
 * Seller-only action. Invalidates invoice queries on success.
 */
export const useCancelInvoice = (contractId: string | undefined) => {
  const { currentTenant } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CancelInvoicePayload): Promise<CancelInvoiceResponse> => {
      if (!currentTenant?.id || !contractId) {
        throw new Error('Missing tenant or contract ID');
      }

      const response = await api.post(
        API_ENDPOINTS.CONTRACTS.CANCEL_INVOICE(contractId),
        payload
      );

      const result = response.data?.data || response.data;

      if (result?.success === false) {
        throw new Error(result.error || 'Failed to process invoice action');
      }

      return result;
    },
    onSuccess: () => {
      if (contractId) {
        queryClient.invalidateQueries({ queryKey: invoiceKeys.byContract(contractId) });
      }
    },
    meta: {
      onError: (error: any) => {
        captureException(error, {
          tags: { component: 'useCancelInvoice' },
          extra: { contractId, tenantId: currentTenant?.id },
        });
      },
    },
  });
};

// =================================================================
// MUTATION: Cancel Receipt
// =================================================================

/**
 * Cancel a single receipt (payment record) with a reason.
 * Seller-only action. Reverses whatever it settled on the invoice/events.
 * Invalidates invoice queries on success.
 */
export const useCancelReceipt = (contractId: string | undefined) => {
  const { currentTenant } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CancelReceiptPayload): Promise<CancelReceiptResponse> => {
      if (!currentTenant?.id || !contractId) {
        throw new Error('Missing tenant or contract ID');
      }

      const response = await api.post(
        API_ENDPOINTS.CONTRACTS.CANCEL_RECEIPT(contractId),
        payload
      );

      const result = response.data?.data || response.data;

      if (result?.success === false) {
        throw new Error(result.error || 'Failed to cancel receipt');
      }

      return result;
    },
    onSuccess: () => {
      if (contractId) {
        queryClient.invalidateQueries({ queryKey: invoiceKeys.byContract(contractId) });
      }
    },
    meta: {
      onError: (error: any) => {
        captureException(error, {
          tags: { component: 'useCancelReceipt' },
          extra: { contractId, tenantId: currentTenant?.id },
        });
      },
    },
  });
};
