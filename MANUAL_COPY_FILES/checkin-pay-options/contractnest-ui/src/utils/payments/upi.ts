// src/utils/payments/upi.ts
//
// THE offline-UPI helpers (POA step 3 — one place, reused): the pay page
// (PublicPaymentSection → OfflineUpiPay), the buyer's Pay sheet, the
// onboarding preview, the integrations QR download and — in the BBB step —
// group-session check-in.
//
// Lessons baked in (CLAUDE.md, 2026-09-16): GPay refuses a hand-built
// upi:// INTENT to a merchant VPA but pays the same payload scanned as a QR.
// So: the intent is offered only for personal VPAs (isMerchant false), and
// launching it is never proof that money moved — the buyer still enters the
// transaction ID, and the seller confirms.

const VPA_RE = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+$/;

export function isValidUpiId(value: string | null | undefined): boolean {
  return !!value && VPA_RE.test(value.trim());
}

/** upi://pay intent. Merchant fields only when BOTH come from the tenant's own QR. */
export function buildUpiIntent(input: {
  upiId: string;
  payeeName: string;
  amount: number;
  currency: string;
  /** Alphanumeric, ≤35 — the transaction reference shown in the payer's app */
  reference?: string;
  note?: string;
  orgId?: string | null;
  mcc?: string | null;
}): string {
  const upiId = input.upiId.trim();
  const name = input.payeeName.trim();
  if (!VPA_RE.test(upiId)) throw new Error('The UPI ID on file is not valid.');
  if (!name) throw new Error('The UPI payee name is missing.');
  if (input.currency !== 'INR') throw new Error('UPI supports INR payments only.');
  if (!Number.isFinite(input.amount) || Math.round(input.amount * 100) <= 0) {
    throw new Error('The payment amount must be greater than zero.');
  }
  const ref = (input.reference || '').replace(/[^A-Za-z0-9]/g, '').slice(0, 35);
  const merchant = input.orgId && input.mcc && input.mcc !== '0000';
  const fields: Record<string, string> = {
    ...(merchant ? { ver: '01', orgid: input.orgId!, mode: '01' } : {}),
    pa: upiId,
    pn: name,
    ...(merchant ? { mc: input.mcc! } : {}),
    ...(ref ? { tr: ref } : {}),
    ...(input.note ? { tn: input.note.slice(0, 60) } : {}),
    am: input.amount.toFixed(2),
    cu: 'INR',
  };
  return 'upi://pay?' + Object.entries(fields).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&');
}

/** Copy text; false when the clipboard is unavailable (old browsers, iframes). */
export async function copyText(value: string): Promise<boolean> {
  try {
    if (!navigator?.clipboard) return false;
    await navigator.clipboard.writeText(value.trim());
    return true;
  } catch {
    return false;
  }
}

/**
 * Save an image that lives on another origin (Firebase Storage) to the device.
 * A plain <a download> is ignored cross-origin, so fetch it as a blob first;
 * if the bucket refuses the read, open it in a new tab to save from there.
 * → 'saved' | 'opened' | 'failed'
 */
export async function saveImageFromUrl(url: string, baseName = 'upi-qr'): Promise<'saved' | 'shared' | 'opened' | 'failed'> {
  if (!url) return 'failed';
  try {
    const resp = await fetch(url, { mode: 'cors' });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const blob = await resp.blob();
    const ext = blob.type === 'image/png' ? 'png' : blob.type === 'image/webp' ? 'webp' : 'jpg';

    // Phones: a download link does nothing inside WhatsApp's (or any app's)
    // in-app browser, so hand the image to the share sheet instead — the
    // buyer can "Save image" or send it straight to GPay / PhonePe, which
    // read the QR from it.
    const nav: any = typeof navigator !== 'undefined' ? navigator : null;
    if (isLikelyMobile() && nav?.share && nav?.canShare) {
      const file = new File([blob], `${baseName}.${ext}`, { type: blob.type || 'image/jpeg' });
      if (nav.canShare({ files: [file] })) {
        try {
          await nav.share({ files: [file], title: 'UPI QR' });
          return 'shared';
        } catch (e: any) {
          // The buyer closed the sheet — not a failure, nothing to fall back to.
          if (e?.name === 'AbortError') return 'shared';
        }
      }
    }

    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = objectUrl;
    a.download = `${baseName}.${ext}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    return 'saved';
  } catch {
    const opened = window.open(url, '_blank', 'noopener');
    return opened ? 'opened' : 'failed';
  }
}

/** Phones/tablets — where a upi:// link can open a UPI app at all. */
export function isLikelyMobile(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent || '');
}
