// src/components/contacts/dashboard/NeedsAttentionCard.tsx
// Surfaces overdue events + urgent items that need immediate action

import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  Clock,
  Zap,
  ChevronRight,
  Wrench,
  DollarSign,
  Receipt,
} from 'lucide-react';
import type { ContactCockpitData, OverdueEvent, UpcomingEvent, CockpitInvoice } from '@/types/contactCockpit';

interface NeedsAttentionCardProps {
  cockpitData: ContactCockpitData;
  colors: any;
  formatCurrency: (value: number, currency?: string) => string;
}

interface AttentionItem {
  id: string;
  type: 'overdue_event' | 'today_event' | 'overdue_invoice';
  eventType?: 'service' | 'billing';
  label: string;
  detail: string;
  contractNumber?: string;
  severity: 'critical' | 'warning';
  color: string;
  contractId?: string;
  amount?: number;
}

const NeedsAttentionCard: React.FC<NeedsAttentionCardProps> = ({
  cockpitData,
  colors,
  formatCurrency,
}) => {
  const navigate = useNavigate();

  // Build attention items from cockpit data
  const items: AttentionItem[] = [];

  // Overdue events
  cockpitData.overdue_events?.forEach((event: OverdueEvent) => {
    items.push({
      id: `overdue-${event.id}`,
      type: 'overdue_event',
      eventType: event.event_type as 'service' | 'billing',
      label: event.block_name || event.event_type,
      detail: `${event.contract_name} - ${event.days_overdue}d overdue`,
      contractNumber: event.contract_number,
      severity: event.days_overdue > 7 ? 'critical' : 'warning',
      color: '#ef4444',
      contractId: event.contract_id,
      amount: event.amount,
    });
  });

  // Today's events
  cockpitData.upcoming_events
    ?.filter((e: UpcomingEvent) => e.is_today)
    .forEach((event: UpcomingEvent) => {
      items.push({
        id: `today-${event.id}`,
        type: 'today_event',
        eventType: event.event_type as 'service' | 'billing',
        label: event.block_name || event.event_type,
        detail: `${event.contract_name} - Due today`,
        contractNumber: event.contract_number,
        severity: 'warning',
        color: '#f59e0b',
        contractId: event.contract_id,
        amount: event.amount,
      });
    });

  // Overdue invoices
  cockpitData.invoices
    ?.filter((inv: CockpitInvoice) => inv.status === 'overdue')
    .forEach((inv: CockpitInvoice) => {
      items.push({
        id: `inv-${inv.id}`,
        type: 'overdue_invoice',
        eventType: 'billing',
        label: `Invoice ${inv.invoice_number}`,
        detail: `${inv.contract_name} - ${formatCurrency(inv.balance)} due`,
        contractNumber: inv.contract_number,
        severity: 'critical',
        color: '#ef4444',
        contractId: inv.contract_id,
        amount: inv.balance,
      });
    });

  // Sort: critical first, then by type
  items.sort((a, b) => {
    if (a.severity !== b.severity) return a.severity === 'critical' ? -1 : 1;
    return 0;
  });

  if (items.length === 0) {
    return (
      <div
        className="p-5 rounded-2xl border"
        style={{
          backgroundColor: '#22c55e08',
          borderColor: '#22c55e30',
        }}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#22c55e20' }}>
            <Zap className="h-5 w-5" style={{ color: '#22c55e' }} />
          </div>
          <div>
            <div className="text-sm font-semibold" style={{ color: '#22c55e' }}>All Clear</div>
            <div className="text-xs" style={{ color: colors.utility.secondaryText }}>
              No urgent items need your attention
            </div>
          </div>
        </div>
      </div>
    );
  }

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
        <AlertTriangle className="h-4 w-4" style={{ color: '#ef4444' }} />
        <span className="text-sm font-bold" style={{ color: colors.utility.primaryText }}>
          Needs Attention
        </span>
        <span
          className="px-2 py-0.5 rounded-full text-xs font-bold"
          style={{ backgroundColor: '#ef444420', color: '#ef4444' }}
        >
          {items.length}
        </span>
      </div>

      {/* Items */}
      <div className="divide-y" style={{ borderColor: colors.utility.primaryText + '08' }}>
        {items.slice(0, 5).map((item) => {
          const TypeIcon = item.eventType === 'service' ? Wrench
            : item.type === 'overdue_invoice' ? Receipt
            : DollarSign;
          const typeColor = item.eventType === 'service' ? '#8b5cf6' : '#3b82f6';

          return (
            <div
              key={item.id}
              className="flex items-center gap-3 px-5 py-3 cursor-pointer transition-colors hover:opacity-80"
              onClick={() => item.contractId && navigate(`/contracts/${item.contractId}`)}
            >
              {/* Event type icon */}
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: typeColor + '15' }}
              >
                <TypeIcon className="h-3.5 w-3.5" style={{ color: typeColor }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium truncate" style={{ color: colors.utility.primaryText }}>
                    {item.label}
                  </span>
                  {item.contractNumber && (
                    <span
                      className="text-[10px] px-1.5 py-0.5 rounded font-mono flex-shrink-0"
                      style={{ backgroundColor: colors.utility.primaryText + '08', color: colors.utility.secondaryText }}
                    >
                      {item.contractNumber}
                    </span>
                  )}
                </div>
                <div className="text-xs truncate" style={{ color: colors.utility.secondaryText }}>
                  {item.detail}
                </div>
              </div>
              {item.amount != null && item.amount > 0 && (
                <span className="text-sm font-semibold flex-shrink-0" style={{ color: item.color }}>
                  {formatCurrency(item.amount)}
                </span>
              )}
              <ChevronRight className="h-4 w-4 flex-shrink-0" style={{ color: colors.utility.secondaryText + '60' }} />
            </div>
          );
        })}
      </div>

      {/* Show more */}
      {items.length > 5 && (
        <div className="px-5 py-2 text-center border-t" style={{ borderColor: colors.utility.primaryText + '10' }}>
          <span className="text-xs font-semibold" style={{ color: colors.brand.primary }}>
            +{items.length - 5} more items
          </span>
        </div>
      )}
    </div>
  );
};

export default NeedsAttentionCard;
