// src/components/contracts/finance/InvoiceTaxChain.tsx
// Fleet Logbook Batch B (Financials) — the owner's locked tax chain for
// one invoice, per design mock 8: taxable value → tax components (from
// the Sprint 4 tax_breakdown snapshot) → total, with a collection
// progress bar and a receipts summary line beneath. Read-only — sits
// UNDER the existing InvoiceCard, replacing nothing.

import React from 'react';
import type { Invoice } from '@/types/contracts';

interface InvoiceTaxChainProps {
  invoice: Invoice;
  colors: any;
  formatCurrency: (amount: number, currency?: string) => string;
  /** Contract-level discount context (Sprint 1): shown as a note when set */
  discountTotal?: number | null;
  discountLabel?: string | null; // e.g. "10%" or "₹5,000 flat"
  /** Tenant is tax-registered → show the snapshot-locked note */
  showTaxNote?: boolean;
}

const InvoiceTaxChain: React.FC<InvoiceTaxChainProps> = ({
  invoice,
  colors,
  formatCurrency,
  discountTotal,
  discountLabel,
  showTaxNote = true,
}) => {
  const line = colors.utility.primaryText + '10';
  const dim = colors.utility.secondaryText;
  const cur = invoice.currency;

  const components = Array.isArray(invoice.tax_breakdown) ? invoice.tax_breakdown : [];
  const hasComponents = components.length > 0;
  const hasTax = (invoice.tax_amount || 0) > 0;

  const paid = invoice.amount_paid || 0;
  const total = invoice.total_amount || 0;
  const pct = total > 0 ? Math.min(100, Math.round((paid / total) * 100)) : 0;
  const receiptCount = invoice.receipts_count ?? invoice.receipts?.length ?? 0;

  const row = (label: React.ReactNode, value: React.ReactNode, opts?: { color?: string; bold?: boolean; noBorder?: boolean }) => (
    <div
      className="flex items-center justify-between px-1 py-1.5 text-xs"
      style={{
        color: opts?.color || colors.utility.primaryText,
        fontWeight: opts?.bold ? 800 : 500,
        borderBottom: opts?.noBorder ? 'none' : `1px solid ${line}`,
      }}
    >
      <span>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );

  return (
    <div
      className="rounded-lg border px-3 py-2 mt-2"
      style={{ backgroundColor: colors.utility.primaryBackground, borderColor: line }}
    >
      {/* Chain */}
      {discountTotal != null && discountTotal > 0 && (
        <div className="px-1 pb-1 text-[10.5px]" style={{ color: colors.semantic.success }}>
          Contract-level discount {discountLabel ? `(${discountLabel}) ` : ''}of{' '}
          {formatCurrency(discountTotal, cur)} already applied in these values
        </div>
      )}
      {row(hasTax ? 'Taxable value' : 'Invoice value', formatCurrency(invoice.amount || 0, cur))}
      {hasComponents
        ? components.map((c, i) => (
            <React.Fragment key={`${c.name || 'tax'}-${i}`}>
              {row(
                `${c.name || 'Tax'}${c.rate != null ? ` ${c.rate}%` : ''}`,
                formatCurrency(c.amount || 0, cur),
                { color: dim },
              )}
            </React.Fragment>
          ))
        : hasTax
          ? row('Tax', formatCurrency(invoice.tax_amount || 0, cur), { color: dim })
          : null}
      {row('Total to be paid', formatCurrency(total, cur), { bold: true, noBorder: true })}

      {/* Collection bar */}
      <div className="h-1.5 rounded-full mt-2 overflow-hidden" style={{ backgroundColor: colors.utility.primaryText + '10' }}>
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, backgroundColor: pct >= 100 ? colors.semantic.success : colors.brand.primary }}
        />
      </div>
      <div className="flex items-center justify-between mt-1.5 text-[10.5px]" style={{ color: dim }}>
        <span>
          {formatCurrency(paid, cur)} collected
          {receiptCount > 0 && ` via ${receiptCount} receipt${receiptCount === 1 ? '' : 's'}`}
          {` · ${pct}%`}
        </span>
        {showTaxNote && hasTax && <span>Tax snapshot locked at issue</span>}
      </div>
    </div>
  );
};

export default InvoiceTaxChain;
