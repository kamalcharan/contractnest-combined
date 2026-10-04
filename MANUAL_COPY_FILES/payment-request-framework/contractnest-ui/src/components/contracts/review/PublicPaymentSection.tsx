// src/components/contracts/review/PublicPaymentSection.tsx
// Payment step for the PUBLIC contract-review page (/contract-review).
// Two modes (business-model-v2/042, context.mode):
//   'acceptance'  — a contract awaiting "accept on payment": paying accepts it.
//   'balance_due' — an agreed contract with an open invoice: the page a
//                   payment request (WhatsApp/email) links to. Self-contained on the public
// CNAK endpoints — the authenticated payment hooks/queries can't be used here
// (no JWT on this page).
//
// Three mutually-aware surfaces, driven by /public/payment-context:
//   • gateway_configured      → Razorpay Standard Checkout popup
//   • offline_upi_configured  → VPA + QR + "declare reference" form
//   • neither                 → "[Tenant] has been notified and will connect
//                                with you for further steps" — NO payment
//                                attempt of any kind (owner rule).
//
// UPI lesson from group-session check-in: never build a upi://pay deep link
// (GPay rejects hand-built intents). Show the VPA as copyable text + the
// tenant's own uploaded QR image; the buyer pays in their UPI app and
// declares the reference here for the tenant to confirm.

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  CreditCard,
  ShieldCheck,
  Loader2,
  Info,
  CheckCircle,
} from 'lucide-react';
import api from '@/services/api';
import OfflineUpiPay from '@/components/payments/OfflineUpiPay';
import { API_ENDPOINTS } from '@/services/serviceURLs';
import { getCurrencySymbol } from '@/utils/constants/currencies';

const RAZORPAY_SCRIPT_URL = 'https://checkout.razorpay.com/v1/checkout.js';

declare global {
  interface Window {
    Razorpay: new (options: Record<string, any>) => {
      open: () => void;
      close: () => void;
      on: (event: string, handler: (response: any) => void) => void;
    };
  }
}

interface PaymentContext {
  success: boolean;
  error?: string;
  error_code?: string;
  mode?: 'acceptance' | 'balance_due';
  invoice_number?: string;
  invoice_id?: string;
  amount?: number;
  currency?: string;
  gateway_configured?: boolean;
  offline_upi_configured?: boolean;
  can_collect_payment?: boolean;
}

interface UpiConfig {
  configured: boolean;
  upi_id?: string;
  payee_name?: string;
  qr_image_url?: string | null;
  is_merchant?: boolean;
  org_id?: string | null;
  mcc?: string | null;
}

interface PublicPaymentSectionProps {
  cnak: string;
  secret: string;
  tenantName: string;
  buyerName?: string | null;
  buyerEmail?: string | null;
  buyerPhone?: string | null;
  brandPrimary: string;
  logoUrl?: string | null;
  paperBg: string;
  borderColor: string;
  inkText: string;
  inkSub: string;
  paperShadow: string;
  /** Fires after a Razorpay payment verifies server-side (contract auto-activates) */
  onPaid: () => void;
  /** Reports whether the seller can take a payment here at all (gateway or
      offline UPI). false → the page words its action bar as "the seller will
      connect with you" instead of "accepted on payment". */
  onAvailability?: (canCollect: boolean) => void;
  /** Render nothing (instead of a notice) when nothing is due / not payable —
      used on an already-accepted contract, where a pay box is optional. */
  quietWhenNothingDue?: boolean;
}

const fmt = (amount: number, currency: string) =>
  `${getCurrencySymbol(currency)}${(amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const PublicPaymentSection: React.FC<PublicPaymentSectionProps> = ({
  cnak, secret, tenantName, buyerName, buyerEmail, buyerPhone,
  brandPrimary, logoUrl, paperBg, borderColor, inkText, inkSub, paperShadow,
  onPaid, onAvailability, quietWhenNothingDue = false,
}) => {
  const [loading, setLoading] = useState(true);
  const [context, setContext] = useState<PaymentContext | null>(null);
  const [upiConfig, setUpiConfig] = useState<UpiConfig | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Razorpay flow
  const [sdkReady, setSdkReady] = useState(false);
  const [paying, setPaying] = useState(false);
  const [verifying, setVerifying] = useState(false);

  // Offline UPI declare flow
  const [declared, setDeclared] = useState(false);

  const rzpRef = useRef<InstanceType<typeof window.Razorpay> | null>(null);

  // ── Load payment context (+ UPI config when relevant) ──
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const resp = await api.post(API_ENDPOINTS.CONTRACTS.PUBLIC_PAYMENT_CONTEXT, {
          cnak, secret_code: secret,
        });
        if (cancelled) return;
        const ctx: PaymentContext = resp.data;
        setContext(ctx);
        onAvailability?.(!!ctx.success && !!ctx.can_collect_payment);
        if (ctx.success && ctx.offline_upi_configured) {
          try {
            const upiResp = await api.post(API_ENDPOINTS.CONTRACTS.PUBLIC_OFFLINE_UPI_CONFIG, {
              cnak, secret_code: secret,
            });
            if (!cancelled) setUpiConfig(upiResp.data);
          } catch { /* offline card just won't render */ }
        }
      } catch (err: any) {
        if (!cancelled) {
          const data = err.response?.data;
          if (data && typeof data === 'object' && 'success' in data) {
            setContext(data as PaymentContext);
            onAvailability?.(false);
          } else {
            setError(data?.error || 'Could not load payment details');
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cnak, secret]);

  // ── Razorpay SDK loader (same dedupe pattern as useRazorpayCheckout) ──
  useEffect(() => {
    if (typeof window !== 'undefined' && window.Razorpay) { setSdkReady(true); return; }
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${RAZORPAY_SCRIPT_URL}"]`);
    if (existing) {
      if (window.Razorpay) { setSdkReady(true); return; }
      const onLoad = () => setSdkReady(true);
      existing.addEventListener('load', onLoad);
      return () => existing.removeEventListener('load', onLoad);
    }
    const script = document.createElement('script');
    script.src = RAZORPAY_SCRIPT_URL;
    script.async = true;
    script.onload = () => setSdkReady(true);
    document.body.appendChild(script);
    // Deliberately not removed on cleanup — other components may need it
  }, []);

  useEffect(() => () => {
    try { rzpRef.current?.close(); } catch { /* already closed */ }
  }, []);

  // ── Razorpay: create order → popup → verify ──
  const handlePayOnline = useCallback(async () => {
    if (!context?.success || paying || verifying) return;
    setError(null);
    setPaying(true);
    try {
      const orderResp = await api.post(API_ENDPOINTS.CONTRACTS.PUBLIC_CREATE_ORDER, {
        cnak, secret_code: secret,
      });
      const order = orderResp.data?.data;
      if (!orderResp.data?.success || !order?.gateway_order_id) {
        throw new Error(orderResp.data?.error || 'Could not start the payment');
      }
      if (!window.Razorpay) {
        throw new Error('Payment SDK failed to load — please refresh and try again');
      }

      const rzp = new window.Razorpay({
        key: order.gateway_key_id,
        amount: Math.round(order.amount * 100), // rupees → paise
        currency: order.currency,
        order_id: order.gateway_order_id,
        name: tenantName,
        description: 'Contract payment',
        image: logoUrl || undefined,
        prefill: {
          name: buyerName || undefined,
          email: buyerEmail || undefined,
          contact: buyerPhone || undefined,
        },
        theme: { color: brandPrimary },
        modal: {
          ondismiss: () => setPaying(false),
          escape: true,
          confirm_close: true,
        },
        handler: async (response: {
          razorpay_order_id: string;
          razorpay_payment_id: string;
          razorpay_signature: string;
        }) => {
          setVerifying(true);
          try {
            const verifyResp = await api.post(API_ENDPOINTS.CONTRACTS.PUBLIC_VERIFY_PAYMENT, {
              cnak,
              secret_code: secret,
              request_id: order.request_id,
              gateway_order_id: response.razorpay_order_id,
              gateway_payment_id: response.razorpay_payment_id,
              gateway_signature: response.razorpay_signature,
            });
            if (!verifyResp.data?.success) {
              throw new Error(verifyResp.data?.error || 'Payment verification failed');
            }
            onPaid();
          } catch (err: any) {
            setError(
              (err.response?.data?.error || err.message || 'Payment verification failed') +
              ' — if the amount was deducted, contact ' + tenantName + ' with your payment reference.'
            );
          } finally {
            setVerifying(false);
            setPaying(false);
          }
        },
      });
      rzp.on('payment.failed', (failed: any) => {
        setPaying(false);
        setError(failed?.error?.description || 'Payment failed — no amount was captured. You can try again.');
      });
      rzpRef.current = rzp;
      rzp.open();
    } catch (err: any) {
      setPaying(false);
      setError(err.response?.data?.error || err.message || 'Could not start the payment');
    }
  }, [context, paying, verifying, cnak, secret, tenantName, logoUrl, buyerName, buyerEmail, buyerPhone, brandPrimary, onPaid]);

  // ── Offline UPI: copy VPA / declare reference ──
  // Offline UPI "I've paid" — OfflineUpiPay shows the thrown message.
  const handleDeclare = useCallback(async (ref: string) => {
    let data: any;
    try {
      const resp = await api.post(API_ENDPOINTS.CONTRACTS.PUBLIC_DECLARE_PAYMENT, {
        cnak,
        secret_code: secret,
        reference: ref,
        declarer_name: buyerName || undefined,
        declarer_contact: buyerEmail || buyerPhone || undefined,
      });
      data = resp.data;
    } catch (err: any) {
      data = err.response?.data;
    }
    // A declaration already awaiting confirmation is the same terminal state.
    if (data?.success || data?.error_code === 'ALREADY_PENDING') {
      setDeclared(true);
      return;
    }
    throw new Error(data?.error || 'Could not record your payment reference');
  }, [cnak, secret, buyerName, buyerEmail, buyerPhone]);

  // ═══ RENDER ═══

  const cardStyle: React.CSSProperties = {
    backgroundColor: paperBg,
    borderRadius: 12,
    boxShadow: paperShadow,
    border: `1px solid ${borderColor}`,
    padding: '20px 24px',
  };

  if (loading) {
    return (
      <div style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: inkSub, fontSize: 13 }}>
          <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
          Loading payment details...
        </div>
      </div>
    );
  }

  if (!context?.success) {
    if (quietWhenNothingDue && (context?.error_code === 'NOTHING_DUE' || context?.error_code === 'NOT_PAYABLE')) {
      return null;
    }
    return (
      <div style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 13, color: inkText }}>
          <Info size={16} style={{ color: brandPrimary, flexShrink: 0, marginTop: 1 }} />
          <span>{context?.error || error || 'Payment details are not available right now. Please try again later.'}</span>
        </div>
      </div>
    );
  }

  const amountLabel = fmt(context.amount || 0, context.currency || 'INR');
  const balanceDue = context.mode === 'balance_due';

  // ── Fallback: no payment surface configured — never attempt collection ──
  if (!context.can_collect_payment) {
    return (
      <div style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <div style={{ width: 34, height: 34, borderRadius: 9, backgroundColor: `${brandPrimary}12`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Info size={17} style={{ color: brandPrimary }} />
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: inkText }}>Payment of {amountLabel} is due on this contract</div>
            <div style={{ fontSize: 12.5, color: inkSub, marginTop: 4, lineHeight: 1.6 }}>
              <strong>{tenantName}</strong> has been notified and will connect with you for the further steps
              to complete this payment. No action is needed here right now.
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Declared (offline UPI) terminal state ──
  if (declared) {
    return (
      <div style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <CheckCircle size={22} style={{ color: '#22c55e', flexShrink: 0, marginTop: 2 }} />
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: inkText }}>Thank you — payment reference submitted</div>
            <div style={{ fontSize: 12.5, color: inkSub, marginTop: 4, lineHeight: 1.6 }}>
              {balanceDue
                ? `${tenantName} will check the payment and confirm it. You can close this page — your access code keeps working.`
                : `${tenantName} will check the payment and connect with you. The contract activates as soon as they confirm it. You can close this page — your access code keeps working.`}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={cardStyle}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <div style={{ width: 34, height: 34, borderRadius: 9, backgroundColor: `${brandPrimary}12`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <CreditCard size={17} style={{ color: brandPrimary }} />
        </div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: inkText }}>
            {balanceDue
              ? `Pay ${amountLabel}${context.invoice_number ? ` · ${context.invoice_number}` : ''}`
              : `Pay ${amountLabel} to accept this contract`}
          </div>
          <div style={{ fontSize: 11, color: inkSub }}>
            {balanceDue
              ? `Payment due to ${tenantName} on this contract.`
              : 'The contract activates automatically as soon as your payment is confirmed.'}
          </div>
        </div>
      </div>

      {error && (
        <div style={{ marginBottom: 12, padding: '10px 14px', borderRadius: 8, backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', fontSize: 12.5 }}>
          {error}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: context.gateway_configured && upiConfig?.configured ? 'repeat(auto-fit, minmax(260px, 1fr))' : '1fr', gap: 14 }}>

        {/* ── Razorpay card ── */}
        {context.gateway_configured && (
          <div style={{ border: `1px solid ${borderColor}`, borderRadius: 10, padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <ShieldCheck size={15} style={{ color: brandPrimary }} />
              <span style={{ fontSize: 12.5, fontWeight: 700, color: inkText }}>Pay online</span>
            </div>
            <p style={{ fontSize: 11.5, color: inkSub, marginBottom: 14, lineHeight: 1.5 }}>
              Card, UPI or netbanking via secure Razorpay checkout. Instant confirmation.
            </p>
            <button
              onClick={handlePayOnline}
              disabled={paying || verifying || !sdkReady}
              style={{
                width: '100%', padding: '11px 20px', borderRadius: 9, border: 'none',
                backgroundColor: brandPrimary, color: '#FFFFFF', fontSize: 13.5, fontWeight: 600,
                cursor: (paying || verifying || !sdkReady) ? 'not-allowed' : 'pointer',
                opacity: (paying || verifying || !sdkReady) ? 0.7 : 1,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
            >
              {(paying || verifying) ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <CreditCard size={15} />}
              {verifying ? 'Verifying payment...' : paying ? 'Opening checkout...' : `Pay ${amountLabel} now`}
            </button>
          </div>
        )}

        {/* ── Offline UPI card — the shared component ── */}
        {upiConfig?.configured && upiConfig.upi_id && (
          <OfflineUpiPay
            upiId={upiConfig.upi_id}
            payeeName={upiConfig.payee_name}
            qrImageUrl={upiConfig.qr_image_url}
            isMerchant={!!upiConfig.is_merchant}
            orgId={upiConfig.org_id}
            mcc={upiConfig.mcc}
            amount={Number(context.amount || 0)}
            currency={context.currency || 'INR'}
            amountLabel={amountLabel}
            sellerName={tenantName}
            note={context.invoice_number ? `Payment ${context.invoice_number}` : 'Contract payment'}
            reference={(context.invoice_number || '').replace(/[^A-Za-z0-9]/g, '')}
            theme={{ primary: brandPrimary, ink: inkText, sub: inkSub, border: borderColor }}
            onSubmitReference={handleDeclare}
          />
        )}
      </div>
    </div>
  );
};

export default PublicPaymentSection;
