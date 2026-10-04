// src/components/payments/CustomerPaymentPreview.tsx
// A phone-sized preview of the bottom of the contract review page, as the
// tenant's customer would see it with the payment methods switched on.
//
// The Razorpay part is illustrative (the real section needs a live contract
// and grant); the UPI part IS the real card — OfflineUpiPay in preview mode. The
// outcome comes from describePaymentOutcome, which mirrors the server rule.
// Used by the onboarding "How you get paid" step and Settings → Integrations.

import React from 'react';
import { describePaymentOutcome } from '@/utils/payments/paymentOutcome';
import OfflineUpiPay from '@/components/payments/OfflineUpiPay';

interface CustomerPaymentPreviewProps {
  businessName: string;
  razorpay: boolean;
  upi: boolean;
  upiId?: string;
  payeeName?: string;
  /** The tenant's uploaded bank QR; a placeholder pattern is drawn without it */
  qrImageUrl?: string;
  /** Example amount shown on the contract */
  amount?: number;
}

const C = {
  ink: '#1a1816', dim: '#6f695f', muted: '#a39d91', line: '#e5e1db', surface: '#faf9f7', white: '#ffffff',
  pay: '#2563eb', ok: '#15803d', font: "'Outfit', sans-serif", mono: "'IBM Plex Mono', monospace",
};

const inr = (n: number) => `₹${n.toLocaleString('en-IN')}`;

const CustomerPaymentPreview: React.FC<CustomerPaymentPreviewProps> = ({
  businessName, razorpay, upi, upiId, payeeName, qrImageUrl, amount = 18000,
}) => {
  const outcome = describePaymentOutcome({ razorpay, upi });
  const initials = businessName.split(/\s+/).filter(Boolean).map((w) => w[0]).join('').slice(0, 2).toUpperCase() || 'CN';
  const btn = (bg: string, fg: string, border?: string): React.CSSProperties => ({
    border: border ? `1px solid ${border}` : 'none', borderRadius: 9, padding: 9, fontWeight: 700, fontSize: 12.5,
    width: '100%', background: bg, color: fg, fontFamily: C.font, cursor: 'default',
  });
  const note: React.CSSProperties = { fontSize: 11.5, color: C.dim, textAlign: 'center', margin: 0 };

  return (
    <div aria-label="Preview of what your customer sees" style={{
      border: `9px solid ${C.ink}`, borderRadius: 30, background: C.white, overflow: 'hidden',
      maxWidth: 300, width: '100%', margin: '0 auto', boxShadow: '0 10px 30px rgba(0,0,0,.12)', fontFamily: C.font,
    }}>
      <div style={{ background: C.surface, borderBottom: `1px solid ${C.line}`, padding: '10px 12px', fontSize: 11, color: C.muted, textAlign: 'center' }}>
        contractnest.com/contract-review
      </div>
      <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 10, fontSize: 12.5, color: C.ink }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{ width: 28, height: 28, borderRadius: 7, background: '#0f172a', color: '#fff', display: 'grid', placeItems: 'center', fontSize: 11, fontWeight: 800 }}>
            {initials}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 700, overflowWrap: 'anywhere' }}>{businessName}</div>
            <div style={{ fontSize: 11, color: C.dim }}>Example contract</div>
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: `1px dashed ${C.line}`, borderBottom: `1px dashed ${C.line}`, padding: '8px 0', fontWeight: 700 }}>
          <span>Total</span>
          <span style={{ fontVariantNumeric: 'tabular-nums' }}>{inr(amount)}</span>
        </div>

        {outcome.mode === 'pay' ? (
          <>
            <div style={{ border: `1px solid ${C.line}`, borderRadius: 10, padding: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ fontSize: 12, fontWeight: 800 }}>Pay to accept</div>
              {razorpay && (
                <>
                  <div style={btn(C.pay, '#fff')}>Pay {inr(amount)} online</div>
                  <p style={note}>Cards · UPI · Netbanking via Razorpay</p>
                </>
              )}
              {razorpay && upi && <p style={{ ...note, color: C.muted }}>or pay by UPI</p>}
              {upi && (
                <OfflineUpiPay
                  preview
                  upiId={upiId?.trim() || 'yourname@okhdfcbank'}
                  payeeName={payeeName?.trim() || businessName}
                  qrImageUrl={qrImageUrl || null}
                  amount={amount}
                  currency="INR"
                  amountLabel={inr(amount)}
                  sellerName={businessName}
                  theme={{ primary: C.pay, ink: C.ink, sub: C.dim, border: C.line }}
                  onSubmitReference={async () => { /* preview */ }}
                />
              )}
            </div>
            <p style={note}>The contract is accepted once {businessName} confirms your payment.</p>
          </>
        ) : (
          <>
            <div style={btn(C.ok, '#fff')}>Accept contract</div>
            <p style={note}>{businessName} will connect with you to close up your request.</p>
          </>
        )}
      </div>
    </div>
  );
};

export default CustomerPaymentPreview;
