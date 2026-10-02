// src/utils/payments/paymentOutcome.ts
// What a customer sees when they open a contract from this tenant, given the
// payment methods the tenant has switched on.
//
// Mirrors the one server-side rule, fn_tenant_payment_options (migration
// business-model-v2/041), which the contract review page and the storefront
// checkout both read: Razorpay active in the environment, or Offline UPI with
// a UPI id, means "pay to accept"; neither means "accept, and the seller will
// connect". Keep the two in step — this file only describes the outcome, the
// server decides it.

export interface PaymentMethodsOn {
  razorpay: boolean;
  upi: boolean;
}

export interface PaymentOutcome {
  /** pay = a payment section on the review page; accept = Accept only */
  mode: 'pay' | 'accept';
  headline: string;
  detail: string;
}

export function describePaymentOutcome({ razorpay, upi }: PaymentMethodsOn): PaymentOutcome {
  if (razorpay && upi) {
    return {
      mode: 'pay',
      headline: 'Customers pay online or by UPI',
      detail: 'Razorpay checkout, plus your UPI QR and an "I\'ve paid" button you confirm in Money In.',
    };
  }
  if (razorpay) {
    return {
      mode: 'pay',
      headline: 'Customers pay online',
      detail: 'A Razorpay checkout on every contract that needs payment. Payments are matched to the invoice automatically.',
    };
  }
  if (upi) {
    return {
      mode: 'pay',
      headline: 'Customers pay by UPI',
      detail: 'Your UPI ID and QR, plus an "I\'ve paid" button. You confirm each payment in Money In.',
    };
  }
  return {
    mode: 'accept',
    headline: 'Customers accept, you collect',
    detail: 'No payment options yet. Customers accept the contract and you collect by bank transfer, cash or cheque.',
  };
}

/** A UPI id is handle@psp, e.g. sunrise@okhdfcbank. */
export const isValidUpiId = (v: string): boolean => /^[a-zA-Z0-9._-]{2,256}@[a-zA-Z]{2,64}$/.test(v.trim());
