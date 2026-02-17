// src/components/contracts/SellerTasksTab.tsx
// Seller Tasks tab — Block-grouped dual-column timeline
// Groups events by block, shows service tasks (left) + financial tasks (right) per block

import React from 'react';
import { useContractEventsForContract } from '@/hooks/queries/useContractEventQueries';

// =================================================================
// PROPS
// =================================================================

export interface SellerTasksTabProps {
  contractId: string;
  currency: string;
  colors: any;
}

// =================================================================
// STATUS COLORS
// =================================================================

const STATUS_STYLES: Record<string, { line: string; dot: string; bg: string }> = {
  completed:   { line: '#10b981', dot: '#10b981', bg: '#f0fdf4' },
  in_progress: { line: '#3b82f6', dot: '#3b82f6', bg: '#eff6ff' },
  pending:     { line: '#f59e0b', dot: '#f59e0b', bg: '#fffbeb' },
  overdue:     { line: '#ef4444', dot: '#ef4444', bg: '#fef2f2' },
  not_started: { line: '#e2e8f0', dot: '#cbd5e1', bg: '#f8fafc' },
  cancelled:   { line: '#e2e8f0', dot: '#cbd5e1', bg: '#f8fafc' },
};

const STATUS_LABELS: Record<string, { label: string; bg: string; color: string; dot: string }> = {
  completed:   { label: 'Completed',   bg: '#d1fae5', color: '#059669', dot: '#10b981' },
  in_progress: { label: 'In Progress', bg: '#dbeafe', color: '#2563eb', dot: '#3b82f6' },
  pending:     { label: 'Pending',     bg: '#fef3c7', color: '#d97706', dot: '#f59e0b' },
  overdue:     { label: 'Overdue',     bg: '#fee2e2', color: '#dc2626', dot: '#ef4444' },
  not_started: { label: 'Not Started', bg: '#f1f5f9', color: '#94a3b8', dot: '#cbd5e1' },
  cancelled:   { label: 'Cancelled',   bg: '#f1f5f9', color: '#94a3b8', dot: '#cbd5e1' },
};

// =================================================================
// TIMELINE NODE (Seller variant — with assignee, internal actions)
// =================================================================

interface NodeProps {
  event: any;
  isLast: boolean;
  type: 'service' | 'billing';
  currency: string;
}

const SellerNode: React.FC<NodeProps> = ({ event, isLast, type, currency }) => {
  const sc = STATUS_STYLES[event.status] || STATUS_STYLES.not_started;
  const sl = STATUS_LABELS[event.status] || STATUS_LABELS.not_started;
  const isService = type === 'service';

  const fmtCurrency = (v: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: currency || 'INR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v);

  const fmtDate = (d?: string) => {
    if (!d) return '';
    return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  };

  return (
    <div style={{ display: 'flex', gap: 0, minHeight: isLast ? 50 : 70 }}>
      {/* Dot + line */}
      <div style={{ width: 36, display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
        <div
          style={{
            width: 14,
            height: 14,
            borderRadius: '50%',
            background: sc.dot,
            border: '3px solid #fff',
            boxShadow: `0 0 0 2px ${sc.dot}30`,
            flexShrink: 0,
            zIndex: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {event.status === 'completed' && <span style={{ color: '#fff', fontSize: 7, fontWeight: 900 }}>✓</span>}
        </div>
        {!isLast && (
          <div style={{ width: 2, flex: 1, background: `linear-gradient(to bottom, ${sc.line}, #e2e8f0)` }} />
        )}
      </div>

      {/* Content card */}
      <div
        style={{
          flex: 1,
          marginLeft: 8,
          padding: '10px 14px',
          borderRadius: 12,
          background: sc.bg,
          border: `1px solid ${sc.dot}15`,
          marginBottom: isLast ? 0 : 6,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>
                {event.title || event.description || (isService ? 'Service Event' : 'Billing Event')}
              </span>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '2px 8px',
                  borderRadius: 20,
                  background: sl.bg,
                  color: sl.color,
                  fontSize: 10,
                  fontWeight: 600,
                }}
              >
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: sl.dot }} />
                {sl.label}
              </span>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
              {event.scheduled_date && (
                <span style={{ fontSize: 11, color: '#94a3b8' }}>📅 {fmtDate(event.scheduled_date)}</span>
              )}
              {isService && event.assigned_to && (
                <span style={{ fontSize: 11, color: event.assigned_to === 'Unassigned' ? '#f59e0b' : '#64748b' }}>
                  {event.assigned_to === 'Unassigned' ? '⚠️ Unassigned' : `👤 ${event.assigned_to}`}
                </span>
              )}
              {isService && event.evidence_type && (
                <span
                  style={{
                    fontSize: 10,
                    padding: '1px 6px',
                    borderRadius: 4,
                    background: '#f1f5f9',
                    color: '#64748b',
                  }}
                >
                  {event.evidence_type === 'upload' ? '📤 Upload' : '📋 Form'}
                </span>
              )}
              {!isService && event.amount != null && (
                <span
                  style={{
                    fontFamily: 'monospace',
                    fontSize: 13,
                    fontWeight: 700,
                    color: event.status === 'overdue' ? '#ef4444' : '#0f172a',
                  }}
                >
                  {fmtCurrency(event.amount)}
                </span>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: 4, flexShrink: 0, marginLeft: 8 }}>
            {isService && (event.status === 'pending' || event.status === 'in_progress') && (
              <button
                style={{
                  padding: '4px 10px',
                  borderRadius: 6,
                  border: '1px solid #e2e8f0',
                  background: '#fff',
                  color: '#0f172a',
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Execute
              </button>
            )}
            {!isService && event.status !== 'completed' && event.status !== 'cancelled' && (
              <button
                style={{
                  padding: '4px 10px',
                  borderRadius: 6,
                  border: event.status === 'overdue' ? 'none' : '1px solid #e2e8f0',
                  background: event.status === 'overdue' ? '#ef4444' : '#fff',
                  color: event.status === 'overdue' ? '#fff' : '#0f172a',
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {event.status === 'overdue' ? 'Collect Now' : 'Invoice'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// =================================================================
// MAIN COMPONENT
// =================================================================

export const SellerTasksTab: React.FC<SellerTasksTabProps> = ({
  contractId,
  currency,
  colors,
}) => {
  const { data: eventsData } = useContractEventsForContract(contractId);
  const allEvents = eventsData?.items || [];

  // Group by block_name (or "General" if no block)
  const blockMap = new Map<string, { service: any[]; billing: any[] }>();

  allEvents.forEach((e: any) => {
    const blockName = e.block_name || e.block || 'General';
    if (!blockMap.has(blockName)) {
      blockMap.set(blockName, { service: [], billing: [] });
    }
    const group = blockMap.get(blockName)!;
    if (e.event_type === 'billing') {
      group.billing.push(e);
    } else {
      group.service.push(e);
    }
  });

  const blocks = Array.from(blockMap.entries());
  const totalTasks = allEvents.length;

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
          <span style={{ fontSize: 15 }}>⏱</span>
          <span
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: colors.utility.primaryText,
              letterSpacing: 0.5,
              textTransform: 'uppercase' as const,
            }}
          >
            Full Timeline
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
            {totalTasks} tasks
          </span>
        </div>
      </div>

      {/* Block groups */}
      {blocks.map(([blockName, group], bi) => (
        <div key={blockName} style={{ marginBottom: bi < blocks.length - 1 ? 24 : 0 }}>
          {/* Block header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '8px 14px',
              background: '#0f172a',
              borderRadius: 8,
              color: '#fff',
              marginBottom: 12,
            }}
          >
            <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: 0.5 }}>{blockName}</span>
            <span
              style={{
                fontSize: 10,
                padding: '2px 8px',
                borderRadius: 6,
                background: 'rgba(255,255,255,0.15)',
              }}
            >
              {group.service.length} services
            </span>
            <span
              style={{
                fontSize: 10,
                padding: '2px 8px',
                borderRadius: 6,
                background: 'rgba(255,255,255,0.15)',
              }}
            >
              {group.billing.length} payments
            </span>
          </div>

          {/* Dual columns */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <div>
              {group.service.length > 0 ? (
                group.service.map((e: any, i: number) => (
                  <SellerNode
                    key={e.id}
                    event={e}
                    isLast={i === group.service.length - 1}
                    type="service"
                    currency={currency}
                  />
                ))
              ) : (
                <div style={{ textAlign: 'center', padding: 20, color: '#cbd5e1', fontSize: 12 }}>
                  No service tasks
                </div>
              )}
            </div>
            <div>
              {group.billing.length > 0 ? (
                group.billing.map((e: any, i: number) => (
                  <SellerNode
                    key={e.id}
                    event={e}
                    isLast={i === group.billing.length - 1}
                    type="billing"
                    currency={currency}
                  />
                ))
              ) : (
                <div style={{ textAlign: 'center', padding: 20, color: '#cbd5e1', fontSize: 12 }}>
                  No payment milestones
                </div>
              )}
            </div>
          </div>
        </div>
      ))}

      {/* Empty state */}
      {blocks.length === 0 && (
        <div style={{ textAlign: 'center', padding: '32px 0', color: colors.utility.secondaryText }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>📋</div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>No tasks yet</div>
          <div style={{ fontSize: 12, marginTop: 4 }}>Events will appear here as the contract progresses.</div>
        </div>
      )}
    </div>
  );
};

export default SellerTasksTab;
