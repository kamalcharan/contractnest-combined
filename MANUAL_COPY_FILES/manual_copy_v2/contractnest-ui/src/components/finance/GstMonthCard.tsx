// src/components/finance/GstMonthCard.tsx
//
// The month's GST at a glance, one card per money direction:
//   side='receivable' → output GST on sales   (Money In)
//   side='payable'    → input GST on bills    (To Pay)
//
// Numbers come from get_tenant_tax_summary_v2 via useTaxSummary({invoiceType})
// — the same figures the /taxes page reports, so the card can never disagree
// with the page it opens. Clicking navigates to /taxes.
//
// Renders nothing when Tax Settings say "no tax" (a tenant that isn't
// tax-registered shouldn't see a zero GST card asking to be clicked), and
// nothing while loading (the page's own content shouldn't wait on this).

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Receipt, ArrowUpRight } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { useTaxSummary } from '@/hooks/queries/useFinanceQueries';
import { useTaxDisplay } from '@/hooks/useTaxDisplay';

const fmtMoney = (value: number): string => {
  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency', currency: 'INR',
      maximumFractionDigits: value % 1 === 0 ? 0 : 2,
    }).format(value);
  } catch {
    return `₹${value.toLocaleString('en-IN')}`;
  }
};

interface GstMonthCardProps {
  side: 'receivable' | 'payable';
}

const GstMonthCard: React.FC<GstMonthCardProps> = ({ side }) => {
  const navigate = useNavigate();
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  const { state: taxDisplayState } = useTaxDisplay();
  const isNoTax = taxDisplayState.data?.display_mode === 'no_tax';

  const { data, isLoading, isError } = useTaxSummary({
    invoiceType: side,
    enabled: !isNoTax,
  });

  if (isNoTax || isLoading || isError) return null;

  const currentMonth = new Date().toISOString().slice(0, 7); // 'YYYY-MM'
  const row = (data?.months || []).find((m) => m.month === currentMonth);
  const taxMoved = row?.tax_collected_approx ?? 0;
  const taxInvoiced = row?.tax_invoiced ?? 0;

  const ink = colors.utility.primaryText;
  const dim = colors.utility.secondaryText;
  const brand = colors.brand.primary;

  const monthLabel = new Date().toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
  const movedLabel = side === 'receivable' ? 'GST collected (approx)' : 'GST paid (approx)';
  const invoicedLabel = side === 'receivable' ? 'invoiced this month' : 'in this month’s bills';

  return (
    <button
      type="button"
      onClick={() => navigate('/taxes')}
      className="w-full text-left rounded-2xl border px-5 py-4 mt-5 flex items-center justify-between gap-4 transition-opacity hover:opacity-90"
      style={{
        backgroundColor: colors.utility.secondaryBackground,
        borderColor: `${ink}14`,
      }}
    >
      <div className="flex items-center gap-3 min-w-0">
        <span className="w-9 h-9 rounded-xl flex items-center justify-center flex-none"
              style={{ backgroundColor: `${brand}14` }}>
          <Receipt size={16} style={{ color: brand }} />
        </span>
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: dim }}>
            GST · {monthLabel}
          </p>
          <p className="text-sm mt-0.5" style={{ color: ink }}>
            <span className="font-extrabold tabular-nums">{fmtMoney(taxMoved)}</span>
            <span style={{ color: dim }}> {movedLabel}</span>
            {taxInvoiced > 0 && (
              <span style={{ color: dim }}>
                {' '}· <span className="font-semibold tabular-nums" style={{ color: ink }}>{fmtMoney(taxInvoiced)}</span> {invoicedLabel}
              </span>
            )}
          </p>
        </div>
      </div>
      <span className="flex-none inline-flex items-center gap-1 text-xs font-bold" style={{ color: brand }}>
        Tax records <ArrowUpRight size={13} />
      </span>
    </button>
  );
};

export default GstMonthCard;
