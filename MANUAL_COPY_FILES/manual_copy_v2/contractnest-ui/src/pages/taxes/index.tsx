// src/pages/taxes/index.tsx
//
// /taxes — the GST records page, un-hidden.
//
// TaxSummarySection (Sprint 4) already computed month-wise taxable value /
// tax invoiced / tax collected with the CGST-SGST-IGST split and CSV export,
// but the only surface rendering it was the Group Sessions operations page —
// effectively invisible. This gives it a home of its own, reachable from the
// GST cards on Money In and To Pay.
//
// Three lenses over get_tenant_tax_summary_v2:
//   Money In → invoice_type='receivable' (output GST you charge on sales)
//   To Pay   → invoice_type='payable'    (input GST on bills you receive)
//   Everything → no filter (both sides together — the original V1 view)

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Settings2 } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { analyticsService } from '@/services/analytics.service';
import TaxSummarySection from '@/components/operations/finance/TaxSummarySection';

type Lens = 'receivable' | 'payable' | 'all';

const LENSES: Array<{ key: Lens; label: string; blurb: string }> = [
  { key: 'receivable', label: 'Money In', blurb: 'output GST you charged on sales' },
  { key: 'payable', label: 'To Pay', blurb: 'input GST on bills you received' },
  { key: 'all', label: 'Everything', blurb: 'both sides together' },
];

const TaxesPage: React.FC = () => {
  const navigate = useNavigate();
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;
  const [lens, setLens] = useState<Lens>('receivable');

  useEffect(() => {
    analyticsService.trackPageView('taxes', 'Tax Records');
  }, []);

  const ink = { color: colors.utility.primaryText };
  const dim = { color: colors.utility.secondaryText };
  const brand = colors.brand.primary;
  const active = LENSES.find((l) => l.key === lens)!;

  return (
    <div className="px-6 py-8 max-w-4xl mx-auto">
      <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
        <div>
          <button onClick={() => navigate(-1)}
                  className="inline-flex items-center gap-1.5 text-xs font-bold mb-3"
                  style={dim}>
            <ArrowLeft size={13} /> Back
          </button>
          <h1 className="text-2xl font-extrabold" style={ink}>Tax records</h1>
          <p className="text-sm mt-1" style={dim}>
            Month-wise GST, by invoice issue date — {active.blurb}.
          </p>
        </div>
        <button onClick={() => navigate('/tax-settings')}
                className="flex-none inline-flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 rounded-full border mt-1"
                style={{ color: brand, borderColor: `${brand}45` }}>
          <Settings2 size={13} /> Tax settings
        </button>
      </div>

      {/* lens toggle */}
      <div className="inline-flex rounded-full border p-1 mb-5"
           style={{ borderColor: `${colors.utility.primaryText}18` }}>
        {LENSES.map((l) => (
          <button key={l.key} onClick={() => setLens(l.key)}
                  className="px-4 py-1.5 rounded-full text-xs font-bold transition-colors"
                  style={lens === l.key
                    ? { backgroundColor: brand, color: '#fff' }
                    : { color: colors.utility.secondaryText }}>
            {l.label}
          </button>
        ))}
      </div>

      <TaxSummarySection
        key={lens}
        invoiceType={lens === 'all' ? undefined : lens}
        title={lens === 'receivable' ? 'GST on sales — Money In'
             : lens === 'payable' ? 'GST on bills — To Pay'
             : 'Taxes — tax records'}
      />
    </div>
  );
};

export default TaxesPage;
