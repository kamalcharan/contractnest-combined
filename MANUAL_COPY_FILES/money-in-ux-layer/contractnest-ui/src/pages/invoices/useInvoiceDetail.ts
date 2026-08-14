// ============================================================================
// useInvoiceDetail — one invoice as a document, contract-optional.
// Backed by GET /api/invoices/:id → get_invoice_detail (bbb-foundation/069).
// Kept beside the invoices pages rather than added to the shared
// useInvoiceQueries so the standalone viewer owns its own read.
// ============================================================================

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import api from '@/services/api';
import { API_ENDPOINTS } from '@/services/serviceURLs';

export interface InvoiceDocLine {
  name: string; qty: number; unit_price: number; amount: number; block_id?: string | null;
}
export interface InvoiceDocReceipt {
  id: string; receipt_number: string; amount: number; currency: string;
  payment_date: string; payment_method: string; reference_number: string | null;
  notes: string | null; is_offline: boolean; cancelled_at: string | null;
}
export interface InvoiceDoc {
  id: string; invoice_number: string; invoice_type: string; status: string;
  is_adhoc: boolean;
  contract_id: string | null; contract_number: string | null; contract_title: string | null;
  contact_id: string | null; contact_name: string | null;
  amount: number; tax_amount: number; total_amount: number; amount_paid: number; balance: number;
  currency: string;
  issued_at: string | null; due_date: string | null; paid_at: string | null;
  notes: string | null;
  line_items: InvoiceDocLine[];
  receipts: InvoiceDocReceipt[];
}

export const useInvoiceDetail = (invoiceId: string | undefined) => {
  const { currentTenant } = useAuth();
  return useQuery({
    queryKey: ['invoice-detail', currentTenant?.id || '', invoiceId || ''],
    queryFn: async (): Promise<InvoiceDoc> => {
      if (!currentTenant?.id) throw new Error('Missing tenant');
      if (!invoiceId) throw new Error('Missing invoice');
      const res = await api.get(API_ENDPOINTS.INVOICES.DETAIL(invoiceId));
      return res.data?.data || res.data;
    },
    enabled: !!currentTenant?.id && !!invoiceId,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });
};
