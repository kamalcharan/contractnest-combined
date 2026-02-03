// src/hooks/queries/usePaymentGatewayQueries.ts
// TanStack Query hooks for payment gateway operations.

import { useMutation, useQueryClient } from '@tanstack/react-query';
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
