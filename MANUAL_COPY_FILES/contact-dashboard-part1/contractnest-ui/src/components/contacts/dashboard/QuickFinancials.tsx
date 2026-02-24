// src/components/contacts/dashboard/QuickFinancials.tsx
// Quick financial summary for Overview tab
// Shows: Collected vs Outstanding, Collection Rate, On-time Rate

import React from 'react';
import {
  DollarSign,
  TrendingUp,
  Clock,
} from 'lucide-react';
import type { ContactCockpitData } from '@/types/contactCockpit';

interface QuickFinancialsProps {
  cockpitData: ContactCockpitData;
  colors: any;
  formatCurrency: (value: number, currency?: string) => string;
}

const QuickFinancials: React.FC<QuickFinancialsProps> = ({
  cockpitData,
  colors,
  formatCurrency,
}) => {
  const collected = (cockpitData.ltv || 0) - (cockpitData.outstanding || 0);
  const collectionRate = cockpitData.payment_pattern?.collection_rate || 0;
  const onTimeRate = cockpitData.payment_pattern?.on_time_rate || 0;
  const invoiceCount = cockpitData.payment_pattern?.invoice_count || 0;

  return (
    <div
      className="rounded-2xl border overflow-hidden"
      style={{
        backgroundColor: colors.utility.secondaryBackground,
        borderColor: colors.utility.primaryText + '10',
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-3 border-b" style={{ borderColor: colors.utility.primaryText + '10' }}>
        <DollarSign className="h-4 w-4" style={{ color: '#06b6d4' }} />
        <span className="text-sm font-bold" style={{ color: colors.utility.primaryText }}>
          Financial Health
        </span>
        {invoiceCount > 0 && (
          <span className="text-xs ml-auto" style={{ color: colors.utility.secondaryText }}>
            {invoiceCount} invoices
          </span>
        )}
      </div>

      {/* Content */}
      <div className="p-5">
        {/* Collected vs Outstanding */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="p-3 rounded-xl" style={{ backgroundColor: '#22c55e10' }}>
            <div className="text-lg font-bold" style={{ color: '#22c55e' }}>
              {formatCurrency(collected)}
            </div>
            <div className="text-xs" style={{ color: colors.utility.secondaryText }}>Collected</div>
          </div>
          <div className="p-3 rounded-xl" style={{ backgroundColor: '#f59e0b10' }}>
            <div className="text-lg font-bold" style={{ color: '#f59e0b' }}>
              {formatCurrency(cockpitData.outstanding || 0)}
            </div>
            <div className="text-xs" style={{ color: colors.utility.secondaryText }}>Outstanding</div>
          </div>
        </div>

        {/* Collection Rate */}
        <div className="mb-3">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="flex items-center gap-1.5" style={{ color: colors.utility.secondaryText }}>
              <TrendingUp className="h-3 w-3" />
              Collection Rate
            </span>
            <span className="font-bold" style={{ color: '#22c55e' }}>{collectionRate}%</span>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: colors.utility.primaryText + '10' }}>
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${collectionRate}%`,
                background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
              }}
            />
          </div>
        </div>

        {/* On-time Rate */}
        <div>
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="flex items-center gap-1.5" style={{ color: colors.utility.secondaryText }}>
              <Clock className="h-3 w-3" />
              On-time Payment
            </span>
            <span className="font-bold" style={{ color: '#3b82f6' }}>{onTimeRate}%</span>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: colors.utility.primaryText + '10' }}>
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${onTimeRate}%`,
                background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuickFinancials;
