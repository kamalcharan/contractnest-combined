// src/components/contracts/NeedsAttentionPanel.tsx
// Seller Overview — right panel showing urgent action items
// Derives alerts from contract events and invoice summary

import React from 'react';
import { useContractEventsForContract } from '@/hooks/queries/useContractEventQueries';
import type { InvoiceSummary } from '@/types/contracts';

// =================================================================
// PROPS
// =================================================================

export interface NeedsAttentionPanelProps {
  contractId: string;
  pageSummary?: InvoiceSummary | null;
  colors: any;
}

// =================================================================
// TYPES
// =================================================================

interface UrgentAction {
  icon: string;
  title: string;
  description: string;
  priority: 'high' | 'medium';
  actionLabel: string;
}

// =================================================================
// COMPONENT
// =================================================================

export const NeedsAttentionPanel: React.FC<NeedsAttentionPanelProps> = ({
  contractId,
  pageSummary,
  colors,
}) => {
  const { data: eventsData } = useContractEventsForContract(contractId);
  const events = eventsData?.items || [];

  // ─── Derive urgent actions ───
  const urgentActions: UrgentAction[] = [];

  // 1. Unassigned service events
  const unassigned = events.filter(
    (e: any) => e.event_type === 'service' && (!e.assigned_to || e.assigned_to === 'Unassigned'),
  );
  if (unassigned.length > 0) {
    urgentActions.push({
      icon: '👤',
      title: 'Assign Team Members',
      description: `${unassigned.length} task${unassigned.length > 1 ? 's' : ''} unassigned`,
      priority: 'high',
      actionLabel: 'Assign',
    });
  }

  // 2. Pending invoices to raise
  const pendingBilling = events.filter(
    (e: any) => e.event_type === 'billing' && e.status !== 'completed' && e.status !== 'cancelled',
  );
  if (pendingBilling.length > 0) {
    urgentActions.push({
      icon: '🧾',
      title: 'Raise Invoice',
      description: `${pendingBilling.length} billing event${pendingBilling.length > 1 ? 's' : ''} pending`,
      priority: 'medium',
      actionLabel: 'Invoice',
    });
  }

  // 3. Overdue events
  const overdue = events.filter((e: any) => e.status === 'overdue');
  if (overdue.length > 0) {
    urgentActions.push({
      icon: '⏰',
      title: 'Overdue Tasks',
      description: `${overdue.length} task${overdue.length > 1 ? 's' : ''} past due date`,
      priority: 'high',
      actionLabel: 'Review',
    });
  }

  // 4. Low collection
  if (pageSummary && pageSummary.collection_percentage < 30 && pageSummary.invoice_count > 0) {
    urgentActions.push({
      icon: '💳',
      title: 'Low Collection',
      description: `Only ${Math.round(pageSummary.collection_percentage)}% collected`,
      priority: 'medium',
      actionLabel: 'Follow Up',
    });
  }

  return (
    <div
      style={{
        background: colors.utility.secondaryBackground,
        borderRadius: 16,
        border: `1px solid ${colors.utility.primaryText}15`,
        padding: 24,
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 15 }}>⚡</span>
          <span
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: colors.utility.primaryText,
              letterSpacing: 0.5,
              textTransform: 'uppercase' as const,
            }}
          >
            Needs Attention
          </span>
          {urgentActions.length > 0 && (
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
              {urgentActions.length}
            </span>
          )}
        </div>
      </div>

      {/* Action items */}
      <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 10 }}>
        {urgentActions.map((a, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              padding: '12px 14px',
              borderRadius: 12,
              background: a.priority === 'high' ? '#fef2f2' : '#fffbeb',
              border: `1px solid ${a.priority === 'high' ? '#fecaca' : '#fde68a'}`,
            }}
          >
            <span style={{ fontSize: 22 }}>{a.icon}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: colors.utility.primaryText }}>{a.title}</div>
              <div style={{ fontSize: 11, color: colors.utility.secondaryText }}>{a.description}</div>
            </div>
            <button
              style={{
                padding: '6px 14px',
                borderRadius: 8,
                border: 'none',
                background: a.priority === 'high' ? '#ef4444' : '#f59e0b',
                color: '#fff',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {a.actionLabel}
            </button>
          </div>
        ))}

        {urgentActions.length === 0 && (
          <div style={{ textAlign: 'center' as const, padding: '24px 0', color: '#10b981' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>✨</div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>All caught up!</div>
            <div style={{ fontSize: 11, color: colors.utility.secondaryText, marginTop: 4 }}>
              No urgent actions needed right now.
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default NeedsAttentionPanel;
