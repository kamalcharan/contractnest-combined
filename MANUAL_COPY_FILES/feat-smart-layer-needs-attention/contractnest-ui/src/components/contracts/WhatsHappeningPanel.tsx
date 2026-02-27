// src/components/contracts/WhatsHappeningPanel.tsx
// Buyer Overview — Smart Layer for buyer perspective
// Shows guided steps for pending_acceptance, activity timeline for active contracts
// Powered by useNeedsAttention engine in buyer mode

import React from 'react';
import { useContractEventsForContract } from '@/hooks/queries/useContractEventQueries';
import { useNeedsAttention } from '@/hooks/useNeedsAttention';
import type { SmartStep, SmartAction } from '@/hooks/useNeedsAttention';
import type { Contract, InvoiceSummary } from '@/types/contracts';

// =================================================================
// PROPS
// =================================================================

export interface WhatsHappeningPanelProps {
  contractId: string;
  contract?: Contract | null;
  pageSummary?: InvoiceSummary | null;
  colors: any;
  /** Buyer action callbacks */
  onMakePayment?: () => void;
}

// =================================================================
// HELPERS
// =================================================================

const timeAgo = (dateStr: string): string => {
  const now = new Date();
  const then = new Date(dateStr);
  const diffMs = now.getTime() - then.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHrs = Math.floor(diffMins / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  const diffDays = Math.floor(diffHrs / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

// =================================================================
// STYLE CONSTANTS
// =================================================================

const STEP_STYLES: Record<string, { bg: string; border: string; accent: string }> = {
  done:          { bg: '#f0fdf4', border: '#bbf7d0', accent: '#16a34a' },
  action_needed: { bg: '#fef2f2', border: '#fecaca', accent: '#ef4444' },
  locked:        { bg: '#f8fafc', border: '#e2e8f0', accent: '#94a3b8' },
  info:          { bg: '#eff6ff', border: '#bfdbfe', accent: '#3b82f6' },
};

const TYPE_COLORS: Record<string, { bg: string; border: string }> = {
  service: { bg: '#eff6ff', border: '#bfdbfe' },
  billing: { bg: '#f0fdf4', border: '#bbf7d0' },
  status: { bg: '#faf5ff', border: '#e9d5ff' },
  info: { bg: '#f8fafc', border: '#e2e8f0' },
};

// =================================================================
// TYPES (legacy activity items for active contracts)
// =================================================================

interface ActivityItem {
  icon: string;
  title: string;
  description: string;
  time: string;
  type: 'service' | 'billing' | 'status' | 'info';
}

// =================================================================
// SUB-COMPONENTS
// =================================================================

const SmartStepCard: React.FC<{
  step: SmartStep;
  colors: any;
  onAction?: (action: SmartAction) => void;
}> = ({ step, colors, onAction }) => {
  const style = STEP_STYLES[step.state] || STEP_STYLES.info;
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column' as const,
        gap: 8,
        padding: '12px 14px',
        borderRadius: 12,
        background: style.bg,
        border: `1px solid ${style.border}`,
        opacity: step.state === 'locked' ? 0.7 : 1,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 20, flexShrink: 0 }}>{step.icon}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: colors.utility.primaryText }}>
            {step.title}
          </div>
          <div
            style={{
              fontSize: 11,
              color: colors.utility.secondaryText,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap' as const,
            }}
          >
            {step.description}
          </div>
        </div>
      </div>
      {/* Action buttons */}
      {step.actions.length > 0 && onAction && (
        <div style={{ display: 'flex', gap: 8, paddingLeft: 30 }}>
          {step.actions.map((action) => (
            <button
              key={action.type}
              onClick={() => onAction(action)}
              style={{
                padding: '6px 16px',
                borderRadius: 8,
                border: 'none',
                background: style.accent,
                color: '#fff',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// =================================================================
// MAIN COMPONENT
// =================================================================

export const WhatsHappeningPanel: React.FC<WhatsHappeningPanelProps> = ({
  contractId,
  contract,
  pageSummary,
  colors,
  onMakePayment,
}) => {
  const isPendingAcceptance = contract?.status === 'pending_acceptance';
  const { now, locked, completed, isLoading: smartLoading } = useNeedsAttention(
    isPendingAcceptance ? contract : null,
    'buyer',
  );

  // For active contracts, fall back to existing activity timeline
  const { data: eventsData } = useContractEventsForContract(contractId);
  const events = eventsData?.items || [];

  // ── Smart layer for pending_acceptance ──
  if (isPendingAcceptance) {
    const totalItems = now.length + locked.length + completed.length;

    const handleAction = (action: SmartAction) => {
      if (action.type === 'pay_now') {
        onMakePayment?.();
      }
    };

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
            <span style={{ fontSize: 15 }}>{'\uD83D\uDCCB'}</span>
            <span
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: colors.utility.primaryText,
                letterSpacing: 0.5,
                textTransform: 'uppercase' as const,
              }}
            >
              Action Required
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 10 }}>
          {/* NOW items */}
          {now.map((step) => (
            <SmartStepCard key={step.id} step={step} colors={colors} onAction={handleAction} />
          ))}

          {/* COMPLETED items */}
          {completed.map((step) => (
            <SmartStepCard key={step.id} step={step} colors={colors} />
          ))}

          {/* LOCKED items */}
          {locked.map((step) => (
            <SmartStepCard key={step.id} step={step} colors={colors} />
          ))}

          {/* Empty state */}
          {!smartLoading && totalItems === 0 && (
            <div style={{ textAlign: 'center' as const, padding: '24px 0', color: colors.utility.secondaryText }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>{'\uD83D\uDCCB'}</div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>Nothing to do</div>
              <div style={{ fontSize: 11, marginTop: 4 }}>
                Updates will appear here as the contract progresses.
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ─── EXISTING ACTIVE CONTRACT LOGIC (activity timeline) ───
  const activityItems: ActivityItem[] = [];

  // Recent completed service events
  const recentCompleted = events
    .filter((e: any) => e.status === 'completed' && e.event_type === 'service')
    .sort((a: any, b: any) => new Date(b.updated_at || b.completed_at || b.created_at).getTime() - new Date(a.updated_at || a.completed_at || a.created_at).getTime())
    .slice(0, 2);

  recentCompleted.forEach((e: any) => {
    activityItems.push({
      icon: '\u2705',
      title: 'Service Completed',
      description: e.title || e.description || 'A service task was completed',
      time: timeAgo(e.updated_at || e.completed_at || e.created_at),
      type: 'service',
    });
  });

  // Upcoming events
  const upcoming = events
    .filter((e: any) => e.status === 'pending' || e.status === 'not_started')
    .sort((a: any, b: any) => new Date(a.scheduled_date || a.created_at).getTime() - new Date(b.scheduled_date || b.created_at).getTime())
    .slice(0, 2);

  upcoming.forEach((e: any) => {
    const isService = e.event_type === 'service' || e.event_type === 'spare_part';
    activityItems.push({
      icon: isService ? '\uD83D\uDD27' : '\uD83D\uDCB3',
      title: isService ? 'Upcoming Service' : 'Payment Due',
      description: e.title || e.description || (isService ? 'A service is scheduled' : 'A payment is upcoming'),
      time: e.scheduled_date
        ? new Date(e.scheduled_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        : 'Soon',
      type: isService ? 'service' : 'billing',
    });
  });

  // Payment status
  if (pageSummary && pageSummary.invoice_count > 0) {
    if (pageSummary.collection_percentage >= 100) {
      activityItems.push({
        icon: '\uD83C\uDF89',
        title: 'Fully Paid',
        description: 'All invoices have been paid in full',
        time: '',
        type: 'billing',
      });
    } else if (pageSummary.overdue_count > 0) {
      activityItems.push({
        icon: '\u26A0\uFE0F',
        title: 'Payment Overdue',
        description: `${pageSummary.overdue_count} invoice${pageSummary.overdue_count > 1 ? 's' : ''} past due date`,
        time: '',
        type: 'billing',
      });
    }
  }

  // In-progress events
  const inProgress = events.filter((e: any) => e.status === 'in_progress').slice(0, 1);
  inProgress.forEach((e: any) => {
    activityItems.push({
      icon: '\u23F3',
      title: 'In Progress',
      description: e.title || e.description || 'A task is currently being worked on',
      time: timeAgo(e.updated_at || e.created_at),
      type: 'service',
    });
  });

  const displayItems = activityItems.slice(0, 5);

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
          <span style={{ fontSize: 15 }}>{'\uD83D\uDCE1'}</span>
          <span
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: colors.utility.primaryText,
              letterSpacing: 0.5,
              textTransform: 'uppercase' as const,
            }}
          >
            What's Happening
          </span>
          {displayItems.length > 0 && (
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
              {displayItems.length}
            </span>
          )}
        </div>
      </div>

      {/* Activity items */}
      <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 8 }}>
        {displayItems.map((item, i) => {
          const typeStyle = TYPE_COLORS[item.type] || TYPE_COLORS.info;
          return (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '10px 14px',
                borderRadius: 12,
                background: typeStyle.bg,
                border: `1px solid ${typeStyle.border}`,
              }}
            >
              <span style={{ fontSize: 20, flexShrink: 0 }}>{item.icon}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: colors.utility.primaryText }}>
                  {item.title}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: colors.utility.secondaryText,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap' as const,
                  }}
                >
                  {item.description}
                </div>
              </div>
              {item.time && (
                <span
                  style={{
                    fontSize: 10,
                    color: colors.utility.secondaryText,
                    flexShrink: 0,
                    whiteSpace: 'nowrap' as const,
                  }}
                >
                  {item.time}
                </span>
              )}
            </div>
          );
        })}

        {displayItems.length === 0 && (
          <div style={{ textAlign: 'center' as const, padding: '24px 0', color: colors.utility.secondaryText }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>{'\uD83D\uDCCB'}</div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>No recent activity</div>
            <div style={{ fontSize: 11, marginTop: 4 }}>
              Updates will appear here as the contract progresses.
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WhatsHappeningPanel;
