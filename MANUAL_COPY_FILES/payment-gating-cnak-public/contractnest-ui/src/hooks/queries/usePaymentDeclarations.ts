// src/hooks/queries/usePaymentDeclarations.ts
// Offline-UPI payment declarations from the PUBLIC contract-review page:
// a buyer paid the tenant's VPA/QR directly and declared the transaction
// reference; the money is invisible to the system until someone here checks
// their bank/UPI app and confirms it. Confirming records the payment
// (record_invoice_payment) and — for payment-gated contracts — activates the
// contract automatically once fully paid.

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import api from '@/services/api';
import { API_ENDPOINTS } from '@/services/serviceURLs';

export interface PaymentDeclaration {
  id: string;
  contract_id: string;
  contract_number: string;
  contract_name: string;
  invoice_id: string;
  invoice_number: string | null;
  reference: string;
  amount: number | null;
  currency: string;
  declarer_name: string | null;
  declarer_contact: string | null;
  status: 'pending' | 'confirmed' | 'rejected';
  confirmed_by: string | null;
  confirmed_at: string | null;
  created_at: string;
}

export const paymentDeclarationKeys = {
  all: ['payment-declarations'] as const,
  list: (tenantId?: string, status?: string) =>
    [...paymentDeclarationKeys.all, tenantId, status] as const,
};

export const usePaymentDeclarations = (status: string = 'pending') => {
  const { currentTenant } = useAuth();

  return useQuery({
    queryKey: paymentDeclarationKeys.list(currentTenant?.id, status),
    queryFn: async (): Promise<PaymentDeclaration[]> => {
      const response = await api.get(
        `${API_ENDPOINTS.PAYMENTS.DECLARATIONS}?status=${encodeURIComponent(status)}`
      );
      if (!response.data?.success) {
        throw new Error(response.data?.error || 'Failed to load payment declarations');
      }
      return (response.data.data || []) as PaymentDeclaration[];
    },
    enabled: !!currentTenant?.id,
    staleTime: 60 * 1000,
  });
};

export const useConfirmPaymentDeclaration = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, confirm }: { id: string; confirm: boolean }) => {
      const response = await api.post(API_ENDPOINTS.PAYMENTS.CONFIRM_DECLARATION(id), { confirm });
      if (!response.data?.success) {
        throw new Error(response.data?.error || 'Failed to update declaration');
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: paymentDeclarationKeys.all });
      // Confirming records a real payment — receivables and invoice views
      // must refetch or Finance keeps showing the money as open.
      queryClient.invalidateQueries({ queryKey: ['finance'] });
      queryClient.invalidateQueries({ queryKey: ['receivables'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
    },
  });
};

export default usePaymentDeclarations;
