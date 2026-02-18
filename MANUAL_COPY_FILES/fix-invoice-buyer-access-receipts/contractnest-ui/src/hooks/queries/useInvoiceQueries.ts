// src/hooks/queries/useInvoiceQueries.ts
// Invoice & Receipt TanStack Query Hooks

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import api from '@/services/api';
import { API_ENDPOINTS } from '@/services/serviceURLs';
import { captureException } from '@/utils/sentry';
import type { Invoice, InvoiceSummary, RecordPaymentPayload, RecordPaymentResponse } from '@/types/contracts';

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
