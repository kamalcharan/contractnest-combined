// src/components/contracts/BuyerPaymentsView.tsx
// Buyer "Payments" tab — payment schedule timeline
// Shows paid/pending/upcoming invoices with "Pay Now" action on unpaid ones
// Uses BuyerTimelineNode for consistent timeline styling

import React from 'react';
import { useContractInvoices } from '@/hooks/queries/useInvoiceQueries';
import BuyerTimelineNode from './BuyerTimelineNode';

// =================================================================
// PROPS
// =================================================================

export interface BuyerPaymentsViewProps {
  contractId: string;
  currency: string;
  colors: any;
  onPayInvoice?: (invoiceId: string) => void;
}

// =================================================================
// HELPERS
// =================================================================

const formatCurrency = (v: number, cur?: string) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: cur || 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(v);

// =================================================================
// COMPONENT
// =================================================================

export const BuyerPaymentsView: React.FC<BuyerPaymentsViewProps> = ({
  contractId,
  currency,
  colors,
  onPayInvoice,
}) => {
  const { data, isLoading } = useContractInvoices(contractId);
  const invoices = data?.invoices || [];
  const summary = data?.summary;

  // Map invoices to timeline-compatible items
  const mapStatus = (invStatus: string): string => {
    switch (invStatus) {
      case 'paid': return 'paid';
      case 'partially_paid': return 'pending';
      case 'overdue': return 'overdue';
      case 'cancelled': return 'cancelled';
      default: return 'unpaid';
    }
  };

  // Sort: overdue first, then unpaid, then partial, then paid
  const sortPriority: Record<string, number> = {
    overdue: 0,
    unpaid: 1,
    pending: 2,
    paid: 3,
    cancelled: 4,
  };

  const sortedInvoices = [...invoices].sort((a, b) => {
    const pa = sortPriority[mapStatus(a.status)] ?? 5;
    const pb = sortPriority[mapStatus(b.status)] ?? 5;
    if (pa !== pb) return pa - pb;
    return new Date(a.due_date || a.created_at).getTime() - new Date(b.due_date || b.created_at).getTime();
  });

  if (isLoading) {
    return (
      <div
        style={{
          background: colors.utility.secondaryBackground,
          borderRadius: 16,
          border: `1px solid ${colors.utility.primaryText}15`,
          padding: 24,
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              style={{
                height: 60,
                borderRadius: 12,
                background: colors.utility.primaryText + '08',
                animation: 'pulse 2s infinite',
              }}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Summary cards */}
      {summary && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
          {/* Total */}
          <div
            style={{
              padding: 20,
              borderRadius: 14,
              background: colors.utility.secondaryBackground,
              border: `1px solid ${colors.utility.primaryText}15`,
              textAlign: 'center' as const,
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 600, color: colors.utility.secondaryText, textTransform: 'uppercase' as const, letterSpacing: 0.5, marginBottom: 4 }}>
              Total Invoiced
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, color: colors.utility.primaryText }}>
              {formatCurrency(summary.total_invoiced, currency)}
            </div>
            <div style={{ fontSize: 10, color: colors.utility.secondaryText, marginTop: 2 }}>
              {summary.invoice_count} invoice{summary.invoice_count !== 1 ? 's' : ''}
            </div>
          </div>

          {/* Paid */}
          <div
            style={{
              padding: 20,
              borderRadius: 14,
              background: '#f0fdf4',
              border: '1px solid #bbf7d0',
              textAlign: 'center' as const,
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 600, color: '#059669', textTransform: 'uppercase' as const, letterSpacing: 0.5, marginBottom: 4 }}>
              Paid
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#10b981' }}>
              {formatCurrency(summary.total_paid, currency)}
            </div>
            <div style={{ fontSize: 10, color: '#059669', marginTop: 2 }}>
              {summary.paid_count} paid
            </div>
          </div>

          {/* Remaining */}
          <div
            style={{
              padding: 20,
              borderRadius: 14,
              background: summary.total_balance > 0 ? '#fffbeb' : '#f0fdf4',
              border: `1px solid ${summary.total_balance > 0 ? '#fde68a' : '#bbf7d0'}`,
              textAlign: 'center' as const,
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: summary.total_balance > 0 ? '#d97706' : '#059669',
                textTransform: 'uppercase' as const,
                letterSpacing: 0.5,
                marginBottom: 4,
              }}
            >
              Remaining
            </div>
            <div
              style={{
                fontSize: 22,
                fontWeight: 800,
                color: summary.total_balance > 0 ? '#f59e0b' : '#10b981',
              }}
            >
              {formatCurrency(summary.total_balance, currency)}
            </div>
            <div style={{ fontSize: 10, color: colors.utility.secondaryText, marginTop: 2 }}>
              {summary.overdue_count > 0 && (
                <span style={{ color: '#ef4444', fontWeight: 600 }}>
                  {summary.overdue_count} overdue
                </span>
              )}
              {summary.overdue_count > 0 && summary.unpaid_count > 0 && ' \u00B7 '}
              {summary.unpaid_count > 0 && `${summary.unpaid_count} unpaid`}
              {summary.overdue_count === 0 && summary.unpaid_count === 0 && 'All clear'}
            </div>
          </div>
        </div>
      )}

      {/* Payment timeline */}
      <div
        style={{
          background: colors.utility.secondaryBackground,
          borderRadius: 16,
          border: `1px solid ${colors.utility.primaryText}15`,
          padding: 24,
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <span style={{ fontSize: 15 }}>{'\uD83D\uDCB3'}</span>
          <span
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: colors.utility.primaryText,
              letterSpacing: 0.5,
              textTransform: 'uppercase' as const,
            }}
          >
            Payment Schedule
          </span>
          <span
            style={{
              background: colors.utility.primaryText + '10',
              color: colors.utility.secondaryText,
              fontSize: 11,
              fontWeight: 600,
              padding: '2px 8px',
              borderRadius: 10,
            }}
          >
            {invoices.length}
          </span>
        </div>

        {sortedInvoices.length > 0 ? (
          sortedInvoices.map((inv, i) => {
            const nodeStatus = mapStatus(inv.status);
            const isPaid = inv.status === 'paid';
            const canPay = !isPaid && inv.status !== 'cancelled';
            return (
              <BuyerTimelineNode
                key={inv.id}
                title={inv.invoice_number || `Invoice #${i + 1}`}
                status={nodeStatus}
                dueDate={inv.due_date}
                amount={inv.total_amount}
                currency={inv.currency || currency}
                isLast={i === sortedInvoices.length - 1}
                type="billing"
                onAction={canPay && onPayInvoice ? () => onPayInvoice(inv.id) : undefined}
                actionLabel={canPay ? (inv.status === 'overdue' ? 'Pay Now' : 'Pay') : undefined}
              />
            );
          })
        ) : (
          <div style={{ textAlign: 'center' as const, padding: '32px 0', color: colors.utility.secondaryText }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>{'\uD83D\uDCB3'}</div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>No payments yet</div>
            <div style={{ fontSize: 12, marginTop: 4 }}>
              Invoices will appear here when the seller generates them.
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BuyerPaymentsView;
