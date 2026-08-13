// ============================================================================
// Invoices section — shared UI primitives
// Product-led idiom: job language, derived status, document-first chrome.
// All colors come from the theme context — no hardcoded palette.
// ============================================================================

import React from 'react';
import { Receipt, IndianRupee, BadgeCheck } from 'lucide-react';
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
      border: `1px solid ${colors.utility.primaryText}14`,
    } as React.CSSProperties,
    hairline: { borderColor: `${colors.utility.primaryText}12` } as React.CSSProperties,
  };
};

export const fmtMoney = (n: number, currency = 'INR'): string =>
  `${currency === 'INR' ? '₹' : currency + ' '}${Math.round(n).toLocaleString('en-IN')}`;

export const fmtDate = (iso: string | null): string =>
  iso ? new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

/** Derived status → semantic color + human label. Never a raw enum on screen. */
export const useStatusMeta = () => {
  const { colors } = useInvoiceTheme();
  return (status: InvoiceStatus, overdue: boolean): { label: string; color: string } => {
    if (status === 'paid') return { label: 'Paid in full', color: colors.semantic.success };
    if (status === 'cancelled') return { label: 'Cancelled', color: colors.utility.secondaryText };
    if (status === 'draft') return { label: 'Draft', color: colors.utility.secondaryText };
    if (overdue) return { label: 'Overdue', color: colors.semantic.error };
    if (status === 'partially_paid') return { label: 'Partly paid', color: colors.semantic.warning };
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

// ─── Document chrome ─────────────────────────────────────────────────────────
// The branded frame shared by viewer and composer: brand accent bar, business
// identity, INVOICE title + meta, then whatever children the page provides.
// App chrome (back button, actions) lives OUTSIDE this card, on the page.

export interface DocumentMetaRow {
  label: string;
  value: React.ReactNode;
}

export const InvoiceDocumentFrame: React.FC<{
  businessName: string;
  businessSub?: string | null;
  metaRows: DocumentMetaRow[];
  billToName: React.ReactNode;
  billToSub?: React.ReactNode;
  children: React.ReactNode;
}> = ({ businessName, businessSub, metaRows, billToName, billToSub, children }) => {
  const { colors, ink, sub, hairline } = useInvoiceTheme();
  const brand = colors.brand.primary;
  const initials = businessName.split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div
      className="rounded-2xl overflow-hidden border"
      style={{ backgroundColor: colors.utility.primaryBackground, borderColor: `${colors.utility.primaryText}14` }}
    >
      {/* brand accent bar */}
      <div style={{ height: 5, background: `linear-gradient(90deg, ${brand}, ${brand}66)` }} />

      <div className="p-6 sm:p-8">
        {/* identity row */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3 min-w-0">
            <span
              className="h-12 w-12 rounded-xl inline-flex items-center justify-center text-base font-extrabold flex-none"
              style={{ backgroundColor: `${brand}1a`, color: brand, border: `1px solid ${brand}40` }}
            >
              {initials}
            </span>
            <div className="min-w-0">
              <p className="text-lg font-extrabold leading-tight truncate" style={ink}>{businessName}</p>
              {businessSub && <p className="text-xs truncate" style={sub}>{businessSub}</p>}
            </div>
          </div>

          <div className="text-right">
            <p className="text-2xl font-extrabold tracking-wide" style={{ color: brand }}>INVOICE</p>
            <div className="mt-1 space-y-0.5">
              {metaRows.map((m) => (
                <p key={m.label} className="text-xs" style={sub}>
                  <span className="font-semibold">{m.label}:</span>{' '}
                  <span style={ink}>{m.value}</span>
                </p>
              ))}
            </div>
          </div>
        </div>

        {/* bill-to strip */}
        <div className="mt-6 pt-4 border-t" style={hairline}>
          <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={sub}>Bill To</p>
          <div className="text-sm font-bold" style={ink}>{billToName}</div>
          {billToSub && <div className="text-xs mt-0.5" style={sub}>{billToSub}</div>}
        </div>

        <div className="mt-6">{children}</div>
      </div>
    </div>
  );
};
