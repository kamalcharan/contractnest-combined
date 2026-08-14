// ============================================================================
// utils/format.ts — the single home for money / date / payment-mode display.
// ----------------------------------------------------------------------------
// Created 2026-08-14 (Part 2/3 of the invoice consolidation). These functions
// previously existed TWICE: once inside pages/contracts/invoice/index.tsx and
// once inside pages/invoices/ui.tsx. Both call sites now import from here.
//
// ⚠ There are deliberately TWO money formats and TWO date formats, because the
// product genuinely has two registers and collapsing them would silently
// restyle an already-signed-off screen:
//
//   DOCUMENT  formatCurrency / formatDate  — the printed invoice. Full Intl
//             currency (₹1,500.00 when there are paise) and "Aug 14, 2026".
//             Used by the invoice viewer and anything that prints or PDFs.
//
//   BRIEFING  fmtMoney / fmtDate           — the money surfaces (Money In,
//             To Pay, chips, registers). Rounded to whole rupees and "14 Aug
//             2026", because those screens are scanned, not audited.
//
// Pick by surface, not by preference. Do not "unify" them without deciding
// which printed invoices should change.
// ============================================================================

// ─── DOCUMENT register ──────────────────────────────────────────────────────

/** Printed-document money. Keeps paise when present. Em-dash for absent. */
export const formatCurrency = (value?: number, currency?: string): string => {
  if (!value && value !== 0) return '—';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: currency || 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
};

/** Printed-document date — "Aug 14, 2026". Em-dash for absent. */
export const formatDate = (d?: string | null): string => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

/**
 * Payment mode as a person would say it. `emi` needs the month count to mean
 * anything; `defined` is the schedule-driven mode and has no number to show.
 */
export const formatPaymentMode = (mode?: string | null, emiMonths?: number): string => {
  if (!mode) return '';
  if (mode === 'emi') return `EMI (${emiMonths || 0} months)`;
  if (mode === 'defined') return 'As per billing schedule';
  return mode.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
};

/**
 * Block descriptions are authored in the template editor and stored as HTML.
 * A printed invoice line must be plain text, so tags are dropped rather than
 * rendered — never dangerouslySetInnerHTML on a document.
 */
export const stripHtml = (value?: string | null): string =>
  (value || '').replace(/<[^>]+>/g, '').trim();

// ─── BRIEFING register ──────────────────────────────────────────────────────

/** Scannable money — whole rupees, Indian grouping. "₹9,19,500". */
export const fmtMoney = (n: number, currency = 'INR'): string =>
  `${currency === 'INR' ? '₹' : currency + ' '}${Math.round(n).toLocaleString('en-IN')}`;

/** Scannable date — "14 Aug 2026". Em-dash for absent. */
export const fmtDate = (iso?: string | null): string =>
  iso
    ? new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : '—';

/** Even shorter — "14 Aug", for chips where the year is implied by context. */
export const fmtDateShort = (iso?: string | null): string =>
  iso ? new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '—';

/** "Aug 2026" — the month a due belongs to. */
export const fmtMonth = (iso?: string | null): string | null =>
  iso ? new Date(iso).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) : null;

// ─── Relative time ──────────────────────────────────────────────────────────

const DAY_MS = 86_400_000;

/** Whole days since an ISO date, never negative. 0 when absent. */
export const daysSince = (iso?: string | null): number =>
  iso ? Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / DAY_MS)) : 0;

/** Whole days until an ISO date; negative once past. Infinity when absent. */
export const daysUntil = (iso?: string | null): number =>
  iso ? Math.floor((new Date(iso).getTime() - Date.now()) / DAY_MS) : Infinity;
