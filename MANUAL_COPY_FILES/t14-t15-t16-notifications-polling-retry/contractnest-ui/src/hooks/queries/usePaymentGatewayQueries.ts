// src/hooks/queries/usePaymentGatewayQueries.ts
// TanStack Query hooks for payment gateway operations.

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import api from '@/services/api';
import { API_ENDPOINTS } from '@/services/serviceURLs';
import { captureException } from '@/utils/sentry';
import { invoiceKeys } from './useInvoiceQueries';

// =================================================================
// TYPES
// =================================================================

export interface CreateOrderPayload {
  invoice_id: string;
  amount: number;
  currency?: string;
  notes?: Record<string, string>;
}

export interface CreateOrderResponse {
  request_id: string;
  gateway_provider: string;
  gateway_order_id: string;
  gateway_key_id: string;    // needed for Razorpay Checkout SDK
  amount: number;
  currency: string;
  attempt_number: number;
}

export interface CreateLinkPayload {
  invoice_id: string;
  amount: number;
  currency?: string;
  collection_mode: 'email_link' | 'whatsapp_link';
  customer?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  description?: string;
  expire_hours?: number;
  notes?: Record<string, string>;
}

export interface CreateLinkResponse {
  request_id: string;
  gateway_provider: string;
  gateway_link_id: string;
  gateway_short_url: string;
  amount: number;
  currency: string;
  collection_mode: string;
  expires_at: string | null;
  attempt_number: number;
}

export interface VerifyPaymentPayload {
  request_id: string;
  gateway_order_id: string;
  gateway_payment_id: string;
  gateway_signature: string;
}

export interface VerifyPaymentResponse {
  request_id: string;
  gateway_payment_id: string;
  receipt: {
    receipt_id: string;
    receipt_number: string;
    amount: number;
    invoice_status: string;
    balance: number;
  };
  status: string;
}

export interface PaymentStatusPayload {
  invoice_id?: string;
  contract_id?: string;
}

export interface PaymentRequest {
  id: string;
  invoice_id: string;
  amount: number;
  currency: string;
  collection_mode: 'terminal' | 'email_link' | 'whatsapp_link';
  gateway_provider: string;
  gateway_order_id: string | null;
  gateway_payment_id: string | null;
  gateway_short_url: string | null;
  status: 'created' | 'sent' | 'viewed' | 'paid' | 'expired' | 'failed';
  attempt_number: number;
  paid_at: string | null;
  expires_at: string | null;
  created_by: string | null;
  created_at: string;
  events_count: number;
}

export interface PaymentRequestsSummary {
  total_requests: number;
  total_paid: number;
  total_amount_paid: number;
  total_pending: number;
}

export interface PaymentRequestsResponse {
  requests: PaymentRequest[];
  summary: PaymentRequestsSummary;
}

// =================================================================
// QUERY KEYS
// =================================================================

export const paymentGatewayKeys = {
  all: ['payment-gateway'] as const,
  status: (invoiceId?: string, contractId?: string) =>
    [...paymentGatewayKeys.all, 'status', invoiceId || '', contractId || ''] as const,
};

// =================================================================
// MUTATIONS
// =================================================================

/**
 * Create a gateway order for terminal checkout (Razorpay Standard Checkout popup).
 * Returns order_id + key_id needed by frontend SDK.
 */
export const useCreateOrder = (contractId?: string) => {
  const { currentTenant } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateOrderPayload): Promise<CreateOrderResponse> => {
      if (!currentTenant?.id) {
        throw new Error('Missing tenant');
      }

      const response = await api.post(API_ENDPOINTS.PAYMENTS.CREATE_ORDER, payload);
      const result = response.data?.data || response.data;

      if (response.data?.success === false) {
        throw new Error(response.data.error || 'Failed to create payment order');
      }

      return result;
    },
    onSuccess: () => {
      // Invalidate both invoice + payment request queries
      queryClient.invalidateQueries({ queryKey: paymentGatewayKeys.all });
      if (contractId) {
        queryClient.invalidateQueries({ queryKey: invoiceKeys.byContract(contractId) });
      }
    },
    meta: {
      onError: (error: any) => {
        captureException(error, {
          tags: { component: 'useCreateOrder' },
          extra: { tenantId: currentTenant?.id },
        });
      },
    },
  });
};

/**
 * Create a payment link for email/WhatsApp delivery.
 * Returns short_url for sending to buyer via JTD.
 */
export const useCreateLink = (contractId?: string) => {
  const { currentTenant } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateLinkPayload): Promise<CreateLinkResponse> => {
      if (!currentTenant?.id) {
        throw new Error('Missing tenant');
      }

      const response = await api.post(API_ENDPOINTS.PAYMENTS.CREATE_LINK, payload);
      const result = response.data?.data || response.data;

      if (response.data?.success === false) {
        throw new Error(response.data.error || 'Failed to create payment link');
      }

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: paymentGatewayKeys.all });
      if (contractId) {
        queryClient.invalidateQueries({ queryKey: invoiceKeys.byContract(contractId) });
      }
    },
    meta: {
      onError: (error: any) => {
        captureException(error, {
          tags: { component: 'useCreateLink' },
          extra: { tenantId: currentTenant?.id },
        });
      },
    },
  });
};

/**
 * Verify payment after Razorpay Standard Checkout callback.
 * Validates signature and creates receipt.
 */
export const useVerifyPayment = (contractId?: string) => {
  const { currentTenant } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: VerifyPaymentPayload): Promise<VerifyPaymentResponse> => {
      if (!currentTenant?.id) {
        throw new Error('Missing tenant');
      }

      const response = await api.post(API_ENDPOINTS.PAYMENTS.VERIFY_PAYMENT, payload);
      const result = response.data?.data || response.data;

      if (response.data?.success === false) {
        throw new Error(response.data.error || 'Payment verification failed');
      }

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: paymentGatewayKeys.all });
      if (contractId) {
        queryClient.invalidateQueries({ queryKey: invoiceKeys.byContract(contractId) });
      }
    },
    meta: {
      onError: (error: any) => {
        captureException(error, {
          tags: { component: 'useVerifyPayment' },
          extra: { tenantId: currentTenant?.id },
        });
      },
    },
  });
};

// =================================================================
// QUERIES
// =================================================================

/**
 * Fetch payment request history for an invoice or contract.
 * Returns requests list + summary (total paid, pending, etc.).
 */
export const usePaymentRequests = (
  payload: PaymentStatusPayload,
  options?: {
    enabled?: boolean;
    /** Poll interval in ms — set > 0 to auto-refresh (e.g. 10000 for 10s) */
    refetchInterval?: number | false;
  }
) => {
  const { currentTenant } = useAuth();

  return useQuery({
    queryKey: paymentGatewayKeys.status(payload.invoice_id, payload.contract_id),
    queryFn: async (): Promise<PaymentRequestsResponse> => {
      if (!currentTenant?.id) {
        throw new Error('Missing tenant');
      }

      const response = await api.post(API_ENDPOINTS.PAYMENTS.STATUS, payload);
      const result = response.data?.data || response.data;

      if (response.data?.success === false) {
        throw new Error(response.data.error || 'Failed to fetch payment requests');
      }

      return {
        requests: result.requests || [],
        summary: result.summary || {
          total_requests: 0,
          total_paid: 0,
          total_amount_paid: 0,
          total_pending: 0,
        },
      };
    },
    enabled: !!currentTenant?.id
      && !!(payload.invoice_id || payload.contract_id)
      && (options?.enabled !== false),
    staleTime: 15_000,
    refetchOnWindowFocus: true,
    refetchInterval: options?.refetchInterval ?? false,
    meta: {
      onError: (error: any) => {
        captureException(error, {
          tags: { component: 'usePaymentRequests' },
          extra: { tenantId: currentTenant?.id },
        });
      },
    },
  });
};
