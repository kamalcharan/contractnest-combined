// ============================================================================
// TaxSummarySection — Sprint 4 (tax records)
// Month-wise Tax NAV for /ops/finance: taxable value, tax invoiced (accrual,
// by issue date), tax collected (approximate), CGST/SGST/IGST component
// split, + CSV export. Read-only — no writes, no toasts/loaders beyond the
// query's own loading state (matches the page's existing pattern).
// ============================================================================

import React from 'react';
import { Receipt, Download } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { useTheme } from '@/contexts/ThemeContext';
import { useTaxSummary, type TaxMonth } from '@/hooks/queries/useFinanceQueries';

const formatMoney = (value: number | null | undefined): string => {
  const amount = Number(value || 0);
  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: amount % 1 === 0 ? 0 : 2
    }).format(amount);
  } catch {
    return `₹${amount.toLocaleString('en-IN')}`;
  }
};

const formatMonthLabel = (month: string): string => {
  const [year, m] = month.split('-');
  const d = new Date(Number(year), Number(m) - 1, 1);
  if (isNaN(d.getTime())) return month;
  return d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
};

const monthsToCsv = (months: TaxMonth[]): string => {
  const componentNames = Array.from(
    new Set(months.flatMap((m) => m.components.map((c) => c.name)))
  ).sort();

  const header = [
    'Month',
    'Invoices',
    'Taxable Value',
    'Tax Invoiced',
    'Total Invoiced',
    'Collected Value',
    'Tax Collected (approx)',
    ...componentNames
  ];

  const rows = months.map((m) => {
    const byName = new Map(m.components.map((c) => [c.name, c.amount]));
    return [
      m.month,
      m.invoice_count,
      m.taxable_value,
      m.tax_invoiced,
      m.total_invoiced,
      m.collected_value,
      m.tax_collected_approx,
      ...componentNames.map((name) => byName.get(name) ?? 0)
    ];
  });

  return [header, ...rows].map((row) => row.join(',')).join('\n');
};

const downloadCsv = (csv: string, filename: string) => {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const TaxSummarySection: React.FC = () => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  const { data, isLoading, isError } = useTaxSummary();
  const months = data?.months || [];

  const handleExport = () => {
    if (!months.length) return;
    const csv = monthsToCsv(months);
    downloadCsv(csv, `tax-records-${new Date().toISOString().slice(0, 10)}.csv`);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="text-base flex items-center gap-2" style={{ color: colors.utility.primaryText }}>
            <Receipt className="h-4 w-4" style={{ color: colors.brand.primary }} />
            Taxes — tax records
          </CardTitle>
          <p className="text-xs mt-1" style={{ color: colors.utility.secondaryText }}>
            Month-wise, by invoice issue date. "Collected" is an approximate split of tax within amounts received.
          </p>
        </div>
        <button
          onClick={handleExport}
          disabled={!months.length}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ borderColor: colors.utility.secondaryText + '30', color: colors.utility.secondaryText }}
        >
          <Download className="h-4 w-4" />
          Export CSV
        </button>
      </CardHeader>
      <CardContent>
        {isLoading && (
          <div className="flex justify-center py-8">
            <LoadingSpinner />
          </div>
        )}

        {isError && (
          <p className="text-sm py-4 text-center" style={{ color: colors.semantic.error }}>
            Couldn't load tax records. Try refreshing.
          </p>
        )}

        {!isLoading && !isError && months.length === 0 && (
          <p className="text-sm py-4 text-center" style={{ color: colors.utility.secondaryText }}>
            No issued invoices yet — tax records appear here once invoices are generated.
          </p>
        )}

        {!isLoading && !isError && months.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b" style={{ borderColor: colors.utility.secondaryText + '20' }}>
                  <th className="text-left py-2 pr-4 font-semibold" style={{ color: colors.utility.secondaryText }}>Month</th>
                  <th className="text-right py-2 px-4 font-semibold" style={{ color: colors.utility.secondaryText }}>Taxable Value</th>
                  <th className="text-right py-2 px-4 font-semibold" style={{ color: colors.utility.secondaryText }}>Tax Invoiced</th>
                  <th className="text-right py-2 px-4 font-semibold" style={{ color: colors.utility.secondaryText }}>Tax Collected (approx)</th>
                  <th className="text-right py-2 pl-4 font-semibold" style={{ color: colors.utility.secondaryText }}>Invoices</th>
                </tr>
              </thead>
              <tbody>
                {months.map((m) => (
                  <tr key={m.month} className="border-b last:border-b-0" style={{ borderColor: colors.utility.secondaryText + '10' }}>
                    <td className="py-2 pr-4 font-medium" style={{ color: colors.utility.primaryText }}>
                      {formatMonthLabel(m.month)}
                    </td>
                    <td className="text-right py-2 px-4" style={{ color: colors.utility.primaryText }}>
                      {formatMoney(m.taxable_value)}
                    </td>
                    <td className="text-right py-2 px-4 font-semibold" style={{ color: colors.utility.primaryText }}>
                      {formatMoney(m.tax_invoiced)}
                      {m.components.length > 0 && (
                        <div className="text-xs font-normal mt-0.5" style={{ color: colors.utility.secondaryText }}>
                          {m.components.map((c) => `${c.name}: ${formatMoney(c.amount)}`).join(' · ')}
                        </div>
                      )}
                    </td>
                    <td className="text-right py-2 px-4" style={{ color: colors.utility.secondaryText }}>
                      {formatMoney(m.tax_collected_approx)}
                    </td>
                    <td className="text-right py-2 pl-4" style={{ color: colors.utility.secondaryText }}>
                      {m.invoice_count}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TaxSummarySection;
