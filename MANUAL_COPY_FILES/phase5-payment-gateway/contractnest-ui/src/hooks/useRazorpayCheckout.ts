// src/hooks/useRazorpayCheckout.ts
// Custom hook for Razorpay Standard Checkout popup integration.
// Handles: SDK script loading → open checkout → verify payment → callbacks.

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  useVerifyPayment,
  type CreateOrderResponse,
  type VerifyPaymentResponse,
} from '@/hooks/queries/usePaymentGatewayQueries';
import { useVaNiToast } from '@/components/common/toast/VaNiToast';

// ─── Razorpay SDK type declaration ───────────────────────────
declare global {
  interface Window {
    Razorpay: new (options: Record<string, any>) => {
      open: () => void;
      close: () => void;
      on: (event: string, handler: (response: any) => void) => void;
    };
  }
}

const RAZORPAY_SCRIPT_URL = 'https://checkout.razorpay.com/v1/checkout.js';

// ─── Hook Options ────────────────────────────────────────────

export interface RazorpayCheckoutOptions {
  contractId?: string;
  /** Called after successful payment verification on backend */
  onPaymentVerified?: (data: VerifyPaymentResponse) => void;
  /** Called when payment fails or user cancels */
  onPaymentFailed?: (error: { code?: string; description?: string; reason?: string }) => void;
  /** Called when user closes the checkout popup without paying */
  onDismiss?: () => void;
  /** Pre-fill customer details in checkout popup */
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  /** Brand name shown in Razorpay checkout */
  businessName?: string;
  /** Logo URL shown in Razorpay checkout */
  logoUrl?: string;
  /** Primary theme color for checkout popup */
  themeColor?: string;
}

// ─── Hook ────────────────────────────────────────────────────

export function useRazorpayCheckout(options: RazorpayCheckoutOptions = {}) {
  const {
    contractId,
    onPaymentVerified,
    onPaymentFailed,
    onDismiss,
    prefill,
    businessName,
    logoUrl,
    themeColor = '#4F46E5',
  } = options;

  const [isScriptLoaded, setIsScriptLoaded] = useState(false);
  const [isScriptError, setIsScriptError] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

  const razorpayInstanceRef = useRef<ReturnType<typeof window.Razorpay> | null>(null);
  const { addToast } = useVaNiToast();
  const verifyPayment = useVerifyPayment(contractId);

  // ─── Dynamically load Razorpay SDK ─────────────────────────
  useEffect(() => {
    // Already loaded
    if (typeof window !== 'undefined' && window.Razorpay) {
      setIsScriptLoaded(true);
      return;
    }

    // Check if script tag already exists (from another hook instance)
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${RAZORPAY_SCRIPT_URL}"]`
    );

    if (existing) {
      const handleLoad = () => setIsScriptLoaded(true);
      const handleError = () => setIsScriptError(true);

      if (window.Razorpay) {
        setIsScriptLoaded(true);
        return;
      }
      existing.addEventListener('load', handleLoad);
      existing.addEventListener('error', handleError);
      return () => {
        existing.removeEventListener('load', handleLoad);
        existing.removeEventListener('error', handleError);
      };
    }

    // Create new script element
    const script = document.createElement('script');
    script.src = RAZORPAY_SCRIPT_URL;
    script.async = true;

    script.onload = () => setIsScriptLoaded(true);
    script.onerror = () => {
      setIsScriptError(true);
      console.error('[RazorpayCheckout] Failed to load SDK script');
    };

    document.body.appendChild(script);
    // Don't remove on cleanup — other instances may need it
  }, []);

  // ─── Open Checkout Popup ───────────────────────────────────
  const openCheckout = useCallback(
    (orderData: CreateOrderResponse) => {
      if (!isScriptLoaded || !window.Razorpay) {
        addToast({
          type: 'error',
          title: 'Payment SDK not ready',
          message: 'Razorpay SDK failed to load. Please refresh the page and try again.',
        });
        onPaymentFailed?.({ description: 'Razorpay SDK not loaded' });
        return;
      }

      setIsCheckoutOpen(true);

      const rzpOptions: Record<string, any> = {
        key: orderData.gateway_key_id,
        amount: orderData.amount * 100, // rupees → paise for Razorpay SDK
        currency: orderData.currency,
        order_id: orderData.gateway_order_id,
        name: businessName || 'ContractNest',
        description: `Payment #${orderData.attempt_number}`,
        prefill: prefill || {},
        theme: { color: themeColor },
        modal: {
          ondismiss: () => {
            setIsCheckoutOpen(false);
            onDismiss?.();
          },
          escape: true,
          confirm_close: true,
        },

        // ─── Payment Success Handler ──────────────────
        handler: async (response: {
          razorpay_order_id: string;
          razorpay_payment_id: string;
          razorpay_signature: string;
        }) => {
          setIsCheckoutOpen(false);

          addToast({
            type: 'info',
            title: 'Verifying payment',
            message: 'Confirming payment with gateway...',
          });

          try {
            const result = await verifyPayment.mutateAsync({
              request_id: orderData.request_id,
              gateway_order_id: response.razorpay_order_id,
              gateway_payment_id: response.razorpay_payment_id,
              gateway_signature: response.razorpay_signature,
            });

            addToast({
              type: 'success',
              title: 'Payment successful',
              message: `Receipt ${result.receipt?.receipt_number || ''} created`,
            });

            onPaymentVerified?.(result);
          } catch (err: any) {
            addToast({
              type: 'error',
              title: 'Payment verification failed',
              message: err.message || 'Please contact support if amount was deducted.',
            });

            onPaymentFailed?.({
              description: err.message || 'Verification failed',
              reason: 'verification_error',
            });
          }
        },
      };

      if (logoUrl) {
        rzpOptions.image = logoUrl;
      }

      const rzp = new window.Razorpay(rzpOptions);

      // ─── Payment Failure Handler ──────────────────
      rzp.on('payment.failed', (failedResponse: any) => {
        setIsCheckoutOpen(false);

        const errorInfo = {
          code: failedResponse?.error?.code || 'UNKNOWN',
          description: failedResponse?.error?.description || 'Payment failed',
          reason: failedResponse?.error?.reason || 'unknown',
        };

        addToast({
          type: 'error',
          title: 'Payment failed',
          message: errorInfo.description,
        });

        onPaymentFailed?.(errorInfo);
      });

      razorpayInstanceRef.current = rzp;
      rzp.open();
    },
    [
      isScriptLoaded,
      verifyPayment,
      addToast,
      onPaymentVerified,
      onPaymentFailed,
      onDismiss,
      prefill,
      businessName,
      logoUrl,
      themeColor,
    ]
  );

  // ─── Cleanup on unmount ────────────────────────────────────
  useEffect(() => {
    return () => {
      if (razorpayInstanceRef.current) {
        try {
          razorpayInstanceRef.current.close();
        } catch {
          // Razorpay may throw if already closed
        }
      }
    };
  }, []);

  return {
    /** Open Razorpay Standard Checkout popup with order data from createOrder mutation */
    openCheckout,
    /** Whether the Razorpay SDK script has been loaded */
    isScriptLoaded,
    /** Whether the SDK script failed to load */
    isScriptError,
    /** Whether the checkout popup is currently open */
    isCheckoutOpen,
    /** Whether payment verification is in progress */
    isVerifying: verifyPayment.isPending,
  };
}
