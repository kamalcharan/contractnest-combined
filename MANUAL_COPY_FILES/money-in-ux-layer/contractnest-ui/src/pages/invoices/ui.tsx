// ============================================================================
// Invoices section — shared UI primitives
// ⚠ SCOPE (2026-08-14): InvoicePaper/DocTh here are the COMPOSER's editable
// document only. The read-only viewer is pages/contracts/invoice/index.tsx —
// one page for contract-linked AND ad-hoc invoices — which owns PDF, Print,
// Send and Add Payment. Do not re-create a viewer here.
// The document card reproduces the EXISTING contract-invoice page design
// (pages/contracts/invoice/index.tsx) so every invoice in the product looks
// identical: white print-faithful paper, brand accent bars, brand-tinted
// items table with a Description column, the same financial summary block.
// The paper is deliberately always-light (like the existing page) — it is a
// document, not a panel; the app chrome around it stays theme-aware.
// ============================================================================

import React from 'react';
import { Building2, Receipt, IndianRupee, BadgeCheck } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import type { InvoiceStatus } from './types';

export const useInvoiceTheme = () => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;
  return {
    colors,
    ink: { color: colors.utility.primaryText } as React.CSSProperties,
    sub: { color: colors.utility.secondaryText } as React.CSSProperties,
    card: {
      backgroundColor: colors.utility.secondaryBackground,
      border: `1px solid ${colors.utility.primaryText}15`,
    } as React.CSSProperties,
    hairline: { borderColor: `${colors.utility.primaryText}10` } as React.CSSProperties,
  };
};

// Formatters live in ONE place now (utils/format.ts) — they used to be
// implemented here AND inside pages/contracts/invoice/index.tsx. Re-exported
// rather than moved-and-rewired so every existing `from '../invoices/ui'`
// import keeps working untouched.
export { fmtMoney, fmtDate, fmtDateShort, fmtMonth, daysSince, daysUntil } from '@/utils/format';
import { fmtMoney } from '@/utils/format';

/** Derived status → semantic color + human label. Never a raw enum on screen. */
export const useStatusMeta = () => {
  const { colors } = useInvoiceTheme();
  return (status: InvoiceStatus, overdue: boolean): { label: string; color: string } => {
    if (status === 'paid') return { label: 'Paid in full', color: colors.semantic.success };
    if (status === 'cancelled') return { label: 'Cancelled', color: colors.utility.secondaryText };
    if (status === 'draft') return { label: 'Draft', color: colors.utility.secondaryText };
    if (overdue) return { label: 'Overdue', color: colors.semantic.error };
    if (status === 'partially_paid') return { label: 'Partially Paid', color: colors.semantic.warning };
    return { label: 'Awaiting payment', color: colors.semantic.warning };
  };
};

export const Pill: React.FC<{ label: string; color: string }> = ({ label, color }) => (
  <span
    className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold whitespace-nowrap"
    style={{ backgroundColor: `${color}1c`, color, border: `1px solid ${color}45` }}
  >
    {label}
  </span>
);

/** PLG badge — invoicing is included with the plan, not metered. */
export const IncludedBadge: React.FC = () => {
  const { colors } = useInvoiceTheme();
  const green = colors.semantic.success;
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold"
      style={{ backgroundColor: `${green}14`, color: green, border: `1px solid ${green}40` }}
      title="Invoicing is part of your plan — there is no per-invoice charge."
    >
      <BadgeCheck size={13} /> Invoicing — included · unlimited
    </span>
  );
};

/** PLG badge — receipts never cost anything, anywhere they appear. */
export const FreeReceiptsBadge: React.FC = () => {
  const { colors } = useInvoiceTheme();
  const green = colors.semantic.success;
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold"
      style={{ backgroundColor: `${green}14`, color: green, border: `1px solid ${green}40` }}
      title="Record as many receipts as you need — partial payments, TDS, all free."
    >
      <IndianRupee size={12} /> Receipts — unlimited · free
    </span>
  );
};

export const EmptyState: React.FC<{ title: string; hint?: string }> = ({ title, hint }) => {
  const { sub, hairline } = useInvoiceTheme();
  return (
    <div className="py-14 text-center rounded-xl border" style={hairline}>
      <Receipt size={26} className="mx-auto mb-2 opacity-40" style={sub} />
      <p className="text-sm font-semibold" style={sub}>{title}</p>
      {hint && <p className="text-xs mt-1" style={sub}>{hint}</p>}
    </div>
  );
};

// ─── Document paper (mirrors pages/contracts/invoice/index.tsx) ─────────────
// Fixed light palette on purpose: the document prints/PDFs as-is and must
// look identical to the contract-invoice page in both app themes.

export const paperInk = '#1f2937';
export const paperSub = '#6b7280';   // gray-500
export const paperFaint = '#9ca3af'; // gray-400

/** Table header cell — same classes as the existing invoice page. */
export const DocTh: React.FC<{ right?: boolean; brand: string; children: React.ReactNode }> = ({ right, brand, children }) => (
  <th
    className={`${right ? 'text-right' : 'text-left'} py-3 px-4 text-[0.65rem] font-bold uppercase tracking-wider`}
    style={{ color: brand }}
  >
    {children}
  </th>
);

export interface InvoicePaperProps {
  brand: string;
  brandSecondary?: string;
  businessName: string;
  businessLines?: (string | null | undefined)[]; // address / phone / email / GSTIN
  invoiceNumber: React.ReactNode;
  issuedDate: React.ReactNode;
  dueDate: React.ReactNode;
  dueDateColor?: string;
  invoiceToName: React.ReactNode;
  invoiceToLines?: React.ReactNode[];
  billToRows: { label: string; value: React.ReactNode }[];
  /** Fully-formed <thead>+<tbody> content for the items table. */
  table: React.ReactNode;
  subtotal: number;
  taxRows?: { label: string; amount: number }[];
  grandTotal: number;
  amountPaid?: number;
  balanceDue?: number;
  currency?: string;
  notes?: string | null;
}

export const InvoicePaper: React.FC<InvoicePaperProps> = (p) => {
  const currency = p.currency ?? 'INR';
  const showPaid = (p.amountPaid ?? 0) > 0;
  const balance = p.balanceDue ?? Math.max(0, p.grandTotal - (p.amountPaid ?? 0));
  return (
    <div className="rounded-xl shadow-lg overflow-hidden" style={{ backgroundColor: '#ffffff', color: paperInk }}>
      {/* Top accent bar */}
      <div className="h-1.5" style={{ background: `linear-gradient(90deg, ${p.brand}, ${p.brandSecondary || p.brand}80)` }} />

      <div className="p-8">
        {/* Header: company + invoice meta */}
        <div className="flex justify-between items-start mb-8 gap-6 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Building2 className="h-8 w-8" style={{ color: p.brand }} />
              <span className="text-xl font-bold" style={{ color: p.brand }}>{p.businessName}</span>
            </div>
            {(p.businessLines ?? []).filter(Boolean).map((l, i) => (
              <div key={i} className="text-sm max-w-xs leading-relaxed" style={{ color: paperSub }}>{l}</div>
            ))}
          </div>
          <div className="text-right">
            <h2 className="text-2xl font-extrabold tracking-tight mb-4" style={{ color: p.brand }}>INVOICE</h2>
            <div className="space-y-2">
              {([['Invoice #', p.invoiceNumber, undefined], ['Date Issued', p.issuedDate, undefined], ['Due Date', p.dueDate, p.dueDateColor]] as const).map(([label, value, color]) => (
                <div key={label as string} className="flex justify-end gap-4 text-sm">
                  <span className="min-w-[80px] text-right" style={{ color: paperFaint }}>{label}</span>
                  <span className="font-semibold min-w-[120px] text-right" style={{ color: color || paperInk }}>{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <hr className="mb-8" style={{ borderColor: '#e5e7eb' }} />

        {/* Invoice To / Bill To */}
        <div className="grid grid-cols-2 gap-8 mb-8">
          <div>
            <h3 className="text-[0.65rem] font-bold uppercase tracking-widest mb-3" style={{ color: paperFaint }}>Invoice To</h3>
            <div className="space-y-1">
              <div className="text-sm font-bold" style={{ color: paperInk }}>{p.invoiceToName}</div>
              {(p.invoiceToLines ?? []).map((l, i) => (
                <div key={i} className="text-sm" style={{ color: paperSub }}>{l}</div>
              ))}
            </div>
          </div>
          <div>
            <h3 className="text-[0.65rem] font-bold uppercase tracking-widest mb-3" style={{ color: paperFaint }}>Bill To</h3>
            <div className="space-y-2">
              {p.billToRows.map((r) => (
                <div key={r.label} className="flex justify-between text-sm">
                  <span style={{ color: paperSub }}>{r.label}</span>
                  <span className="font-medium" style={{ color: '#374151' }}>{r.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Items table */}
        <div className="mb-8 rounded-lg overflow-x-auto border" style={{ borderColor: '#f3f4f6' }}>
          <table className="w-full min-w-[560px]">{p.table}</table>
        </div>

        {/* Financial summary */}
        <div className="flex justify-end mb-8">
          <div className="w-80">
            <div className="flex justify-between py-2 text-sm">
              <span style={{ color: paperSub }}>Subtotal</span>
              <span className="font-semibold" style={{ color: paperInk }}>{fmtMoney(p.subtotal, currency)}</span>
            </div>
            {(p.taxRows ?? []).map((t) => (
              <div key={t.label} className="flex justify-between py-1.5 text-sm">
                <span style={{ color: paperSub }}>{t.label}</span>
                <span className="font-medium" style={{ color: '#374151' }}>{fmtMoney(t.amount, currency)}</span>
              </div>
            ))}
            <div className="my-2 border-t-2" style={{ borderColor: '#d1d5db' }} />
            <div className="flex justify-between py-2">
              <span className="text-base font-bold" style={{ color: paperInk }}>Grand Total</span>
              <span className="text-lg font-extrabold" style={{ color: p.brand }}>{fmtMoney(p.grandTotal, currency)}</span>
            </div>
            {showPaid && (
              <>
                <div className="flex justify-between py-1.5 text-sm">
                  <span className="font-medium" style={{ color: '#059669' }}>Amount Paid</span>
                  <span className="font-semibold" style={{ color: '#059669' }}>- {fmtMoney(p.amountPaid!, currency)}</span>
                </div>
                <div className="my-1 border-t" style={{ borderColor: '#e5e7eb' }} />
                <div className="flex justify-between py-2">
                  <span className="text-sm font-bold" style={{ color: paperInk }}>Balance Due</span>
                  <span className="text-base font-extrabold" style={{ color: balance > 0 ? '#F59E0B' : '#10B981' }}>
                    {fmtMoney(balance, currency)}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>

        {p.notes && (
          <div className="pt-6 border-t" style={{ borderColor: '#e5e7eb' }}>
            <h3 className="text-[0.65rem] font-bold uppercase tracking-widest mb-2" style={{ color: paperFaint }}>Note</h3>
            <p className="text-sm leading-relaxed" style={{ color: paperSub }}>{p.notes}</p>
          </div>
        )}

        <div className="mt-8 pt-4 border-t text-center" style={{ borderColor: '#f3f4f6' }}>
          <p className="text-[0.6rem]" style={{ color: '#d1d5db' }}>This is a computer-generated invoice. No signature required.</p>
        </div>
      </div>

      {/* Bottom accent bar */}
      <div className="h-1" style={{ backgroundColor: `${p.brand}30` }} />
    </div>
  );
};

// ─── Sidecar cards (mirror the existing page's right column) ────────────────

/**
 * The right-column card used by BOTH the composer and the read-only invoice
 * viewer (pages/contracts/invoice/index.tsx) — its three sidecars were
 * hand-rolled copies of this exact chrome until Part 2.
 *
 * `clip` opts into overflow-hidden. It is OFF by default on purpose: it
 * silently clipped absolutely-positioned children (the contact picker's
 * dropdown) and read to the user as "search won't work". The viewer passes
 * `clip` because it has no popovers and its cards were drawn that way.
 */
export const SideCard: React.FC<{
  title: string;
  children: React.ReactNode;
  trailing?: React.ReactNode;
  clip?: boolean;
}> = ({ title, children, trailing, clip }) => {
  const { colors } = useInvoiceTheme();
  return (
    <div className={`rounded-xl border${clip ? ' overflow-hidden' : ''}`} style={{ backgroundColor: colors.utility.secondaryBackground, borderColor: `${colors.utility.primaryText}15` }}>
      <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: `${colors.utility.primaryText}10` }}>
        <h3 className="text-[0.65rem] font-bold uppercase tracking-wider" style={{ color: colors.utility.secondaryText }}>{title}</h3>
        {trailing}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
};
