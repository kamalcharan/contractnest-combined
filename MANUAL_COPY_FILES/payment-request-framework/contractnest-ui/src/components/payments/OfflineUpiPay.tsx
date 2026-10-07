// src/components/payments/OfflineUpiPay.tsx
//
// THE "pay by UPI" card (POA step 3 — one component, reused): the buyer's pay
// page and in-app Pay sheet (via PublicPaymentSection) and the onboarding
// customer preview today; group-session check-in in the BBB step.
//
//   · Offline payment note — money goes straight to the seller; nothing is
//     collected by ContractNest, so the buyer enters the transaction ID after.
//   · Option 1 — UPI ID + Copy (pay to it from any UPI app).
//   · Option 2 — the seller's own bank QR + Save QR (scan from the gallery,
//     or from a second phone).
//   · "Open UPI app" — ONLY for a personal VPA on a phone: GPay refuses a
//     hand-built intent to a merchant VPA (CLAUDE.md, 2026-09-16).
//   · "I've paid" → transaction ID → onSubmitReference. Launching an app is
//     never proof of payment; only the entered reference is.
//
// Presentational + self-contained loaders; the caller owns the API call
// (self-submit on the pay page, hand-the-reference-to-the-parent at check-in).

import React, { useState } from 'react';
import { Copy, Check, Download, Smartphone, Loader2, Info, ExternalLink } from 'lucide-react';
import { buildUpiIntent, copyText, isLikelyMobile, saveImageFromUrl } from '@/utils/payments/upi';

export interface OfflineUpiTheme {
  primary: string;
  ink: string;
  sub: string;
  border: string;
  surface?: string;
}

interface OfflineUpiPayProps {
  upiId: string;
  payeeName?: string | null;
  qrImageUrl?: string | null;
  isMerchant?: boolean;
  orgId?: string | null;
  mcc?: string | null;
  /** What the buyer owes here, in `currency` */
  amount: number;
  currency: string;
  amountLabel: string;
  /** Who receives the money (the seller's business name) */
  sellerName: string;
  /** Shown in the payer's UPI app when the intent is used */
  note?: string;
  /** Transaction reference for the intent (alphanumeric) */
  reference?: string;
  theme: OfflineUpiTheme;
  /** Called with the trimmed transaction ID; reject/throw to show an error */
  onSubmitReference: (reference: string) => Promise<void>;
  submitLabel?: string;
  /** Preview mode (onboarding): everything shown, nothing submits */
  preview?: boolean;
}

const OfflineUpiPay: React.FC<OfflineUpiPayProps> = ({
  upiId, payeeName, qrImageUrl, isMerchant, orgId, mcc,
  amount, currency, amountLabel, sellerName, note, reference,
  theme, onSubmitReference, submitLabel = "I've paid", preview = false,
}) => {
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveNote, setSaveNote] = useState<string | null>(null);
  const [ref, setRef] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const surface = theme.surface || 'transparent';
  const canOpenApp = !isMerchant && currency === 'INR' && !preview && isLikelyMobile();

  const handleCopy = async () => {
    const ok = await copyText(upiId);
    setCopied(ok);
    setCopyFailed(!ok);
    if (ok) setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = async () => {
    if (!qrImageUrl || saving) return;
    setSaving(true);
    setSaveNote(null);
    const r = await saveImageFromUrl(qrImageUrl, 'upi-qr');
    setSaving(false);
    setSaveNote(
      r === 'saved' ? 'Saved — open your UPI app, choose "scan from gallery" and pick this image.'
      : r === 'shared' ? 'Choose "Save image", or send it to your UPI app — it reads the QR from the image.'
      : r === 'opened' ? 'Opened the QR in a new tab — save it from there.'
      : 'Could not save the QR. Press and hold the image to save it.'
    );
  };

  const handleOpenApp = () => {
    try {
      const uri = buildUpiIntent({
        upiId, payeeName: payeeName || sellerName, amount, currency,
        reference, note, orgId, mcc,
      });
      window.location.href = uri;
    } catch (e: any) {
      setError(e?.message || 'Could not open a UPI app — use the UPI ID or QR instead.');
    }
  };

  const handleSubmit = async () => {
    const value = ref.trim();
    if (!value || submitting || preview) return;
    setSubmitting(true);
    setError(null);
    try {
      await onSubmitReference(value);
    } catch (e: any) {
      setError(e?.message || 'Could not record your transaction ID. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const label: React.CSSProperties = { fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: theme.sub, marginBottom: 6 };

  return (
    <div style={{ border: `1px solid ${theme.border}`, borderRadius: 10, padding: 16, background: surface }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <Smartphone size={15} style={{ color: theme.primary }} />
        <span style={{ fontSize: 12.5, fontWeight: 700, color: theme.ink }}>Pay {amountLabel} by UPI</span>
      </div>

      {/* Offline note */}
      <div style={{ display: 'flex', gap: 8, padding: '8px 10px', borderRadius: 8, background: `${theme.primary}0d`, marginBottom: 12 }}>
        <Info size={14} style={{ color: theme.primary, flexShrink: 0, marginTop: 1 }} />
        <span style={{ fontSize: 11.5, color: theme.ink, lineHeight: 1.5 }}>
          This payment goes straight to <strong>{sellerName}</strong> from your UPI app. After paying, enter the
          transaction ID (UTR) below — {sellerName} checks it and confirms.
        </span>
      </div>

      {/* Option 1 — UPI ID */}
      <div style={label}>Option 1 · Pay to UPI ID</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 8, border: `1px dashed ${theme.border}`, marginBottom: 4 }}>
        <span style={{ fontSize: 13, fontFamily: 'monospace', fontWeight: 600, color: theme.ink, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {upiId}
        </span>
        <button
          type="button"
          onClick={handleCopy}
          title="Copy UPI ID"
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: theme.sub, display: 'flex', alignItems: 'center', gap: 4, fontSize: 11.5 }}
        >
          {copied ? <Check size={14} style={{ color: '#22c55e' }} /> : <Copy size={14} />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      {payeeName && <div style={{ fontSize: 10.5, color: theme.sub, marginBottom: 4 }}>Payee: {payeeName}</div>}
      {copyFailed && <div style={{ fontSize: 10.5, color: theme.sub, marginBottom: 4 }}>Press and hold the UPI ID to copy it.</div>}

      {canOpenApp && (
        <button
          type="button"
          onClick={handleOpenApp}
          style={{ width: '100%', margin: '6px 0 2px', padding: '9px 14px', borderRadius: 8, border: `1px solid ${theme.primary}`, background: 'transparent', color: theme.primary, fontSize: 12.5, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
        >
          <ExternalLink size={14} /> Open UPI app · {amountLabel}
        </button>
      )}

      {/* Option 2 — bank QR */}
      {qrImageUrl && (
        <>
          <div style={{ ...label, marginTop: 14 }}>Option 2 · Scan the QR</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <img
              src={qrImageUrl}
              alt={`UPI QR for ${sellerName}`}
              style={{ width: 132, height: 132, objectFit: 'contain', borderRadius: 8, border: `1px solid ${theme.border}`, backgroundColor: '#FFFFFF' }}
            />
            <div style={{ fontSize: 11.5, color: theme.sub, lineHeight: 1.5 }}>
              Scan it from another phone, or save it and choose "scan from gallery" in your UPI app.
              Enter <strong style={{ color: theme.ink }}>{amountLabel}</strong> when asked.
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                style={{ marginTop: 8, padding: '6px 12px', borderRadius: 7, border: `1px solid ${theme.border}`, background: 'transparent', color: theme.ink, fontSize: 11.5, fontWeight: 600, cursor: saving ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
              >
                {saving ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Download size={13} />}
                Save QR
              </button>
            </div>
          </div>
          {saveNote && <div style={{ fontSize: 10.5, color: theme.sub, marginTop: 6 }}>{saveNote}</div>}
        </>
      )}

      {/* I've paid */}
      <div style={{ ...label, marginTop: 14 }}>After paying</div>
      {error && (
        <div style={{ marginBottom: 8, padding: '8px 12px', borderRadius: 8, backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', fontSize: 12 }}>
          {error}
        </div>
      )}
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          value={ref}
          onChange={(e) => setRef(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); }}
          placeholder="UPI transaction ID / UTR"
          disabled={preview}
          style={{ flex: 1, minWidth: 0, padding: '9px 12px', borderRadius: 8, border: `1px solid ${theme.border}`, backgroundColor: 'transparent', color: theme.ink, fontSize: 12.5, outline: 'none' }}
        />
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!ref.trim() || submitting || preview}
          style={{ padding: '9px 16px', borderRadius: 8, border: 'none', backgroundColor: theme.primary, color: '#FFFFFF', fontSize: 12.5, fontWeight: 600, cursor: (!ref.trim() || submitting || preview) ? 'not-allowed' : 'pointer', opacity: (!ref.trim() || submitting || preview) ? 0.6 : 1, display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}
        >
          {submitting && <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} />}
          {submitLabel}
        </button>
      </div>
    </div>
  );
};

export default OfflineUpiPay;
