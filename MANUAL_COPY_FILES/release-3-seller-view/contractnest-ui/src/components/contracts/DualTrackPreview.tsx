// src/components/contracts/DualTrackPreview.tsx
// Seller Overview — dual-column timeline preview
// Left: Service events · Right: Financial/billing events
// Shows first 3 each with "Full Timeline →" link

import React from 'react';
import { useContractEventsForContract } from '@/hooks/queries/useContractEventQueries';

// =================================================================
// PROPS
// =================================================================

export interface DualTrackPreviewProps {
  contractId: string;
  currency: string;
  colors: any;
  onViewFullTimeline?: () => void;
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
// TIMELINE NODE
// =================================================================

interface TimelineNodeProps {
  title: string;
  status: string;
  dueDate?: string;
  amount?: number;
  currency?: string;
  assignee?: string;
  isLast: boolean;
  type: 'service' | 'billing';
}

const TimelineNode: React.FC<TimelineNodeProps> = ({ title, status, dueDate, amount, currency, assignee, isLast, type }) => {
  const sc = STATUS_STYLES[status] || STATUS_STYLES.not_started;
  const sl = STATUS_LABELS[status] || STATUS_LABELS.not_started;

  const formatCurrency = (v: number, cur?: string) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: cur || 'INR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v);

  const formatDate = (d?: string) => {
    if (!d) return '';
    return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  };

  return (
    <div style={{ display: 'flex', gap: 0, minHeight: isLast ? 50 : 70 }}>
      {/* Dot + Line */}
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
          {status === 'completed' && <span style={{ color: '#fff', fontSize: 7, fontWeight: 900 }}>✓</span>}
        </div>
        {!isLast && (
          <div style={{ width: 2, flex: 1, background: `linear-gradient(to bottom, ${sc.line}, #e2e8f0)` }} />
        )}
      </div>

      {/* Content */}
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{title}</span>
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
          {dueDate && (
            <span style={{ fontSize: 11, color: '#94a3b8' }}>📅 {formatDate(dueDate)}</span>
          )}
          {type === 'service' && assignee && (
            <span style={{ fontSize: 11, color: assignee === 'Unassigned' ? '#f59e0b' : '#64748b' }}>
              {assignee === 'Unassigned' ? '⚠️ Unassigned' : `👤 ${assignee}`}
            </span>
          )}
          {type === 'billing' && amount != null && (
            <span style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 700, color: status === 'overdue' ? '#ef4444' : '#0f172a' }}>
              {formatCurrency(amount, currency)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

// =================================================================
// MAIN COMPONENT
// =================================================================

export const DualTrackPreview: React.FC<DualTrackPreviewProps> = ({
  contractId,
  currency,
  colors,
  onViewFullTimeline,
}) => {
  const { data: eventsData } = useContractEventsForContract(contractId);
  const allEvents = eventsData?.items || [];

  // Split into service (service + spare_part) and billing
  const serviceEvents = allEvents
    .filter((e: any) => e.event_type === 'service' || e.event_type === 'spare_part')
    .slice(0, 3);

  const billingEvents = allEvents
    .filter((e: any) => e.event_type === 'billing')
    .slice(0, 3);

  const completedServices = allEvents.filter(
    (e: any) => (e.event_type === 'service' || e.event_type === 'spare_part') && e.status === 'completed',
  ).length;
  const totalServices = allEvents.filter(
    (e: any) => e.event_type === 'service' || e.event_type === 'spare_part',
  ).length;

  const totalCollected = allEvents
    .filter((e: any) => e.event_type === 'billing' && e.status === 'completed')
    .reduce((sum: number, e: any) => sum + (e.amount || 0), 0);
  const totalBillingValue = allEvents
    .filter((e: any) => e.event_type === 'billing')
    .reduce((sum: number, e: any) => sum + (e.amount || 0), 0);

  const fmtCurrency = (v: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: currency || 'INR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v);

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
            Contract Timeline
          </span>
        </div>
        {onViewFullTimeline && (
          <span
            onClick={onViewFullTimeline}
            style={{ fontSize: 11, color: '#10b981', fontWeight: 600, cursor: 'pointer' }}
          >
            Full Timeline →
          </span>
        )}
      </div>

      {/* Dual columns */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        {/* Service column */}
        <div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              marginBottom: 12,
              padding: '6px 12px',
              background: '#eff6ff',
              borderRadius: 8,
            }}
          >
            <span style={{ fontSize: 14 }}>🔧</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#1e40af' }}>Service Tasks</span>
            <span style={{ fontSize: 10, color: '#3b82f6', marginLeft: 'auto', fontFamily: 'monospace' }}>
              {completedServices}/{totalServices}
            </span>
          </div>
          {serviceEvents.length > 0 ? (
            serviceEvents.map((e: any, i: number) => (
              <TimelineNode
                key={e.id}
                title={e.title || e.description || 'Service Event'}
                status={e.status}
                dueDate={e.scheduled_date}
                assignee={e.assigned_to}
                isLast={i === serviceEvents.length - 1}
                type="service"
              />
            ))
          ) : (
            <div style={{ textAlign: 'center', padding: 20, color: '#cbd5e1', fontSize: 12 }}>
              No service events yet
            </div>
          )}
        </div>

        {/* Billing column */}
        <div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              marginBottom: 12,
              padding: '6px 12px',
              background: '#f0fdf4',
              borderRadius: 8,
            }}
          >
            <span style={{ fontSize: 14 }}>💰</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#166534' }}>Financial Tasks</span>
            <span style={{ fontSize: 10, color: '#16a34a', marginLeft: 'auto', fontFamily: 'monospace' }}>
              {fmtCurrency(totalCollected)} / {fmtCurrency(totalBillingValue)}
            </span>
          </div>
          {billingEvents.length > 0 ? (
            billingEvents.map((e: any, i: number) => (
              <TimelineNode
                key={e.id}
                title={e.title || e.description || 'Billing Event'}
                status={e.status}
                dueDate={e.scheduled_date}
                amount={e.amount}
                currency={currency}
                isLast={i === billingEvents.length - 1}
                type="billing"
              />
            ))
          ) : (
            <div style={{ textAlign: 'center', padding: 20, color: '#cbd5e1', fontSize: 12 }}>
              No billing events yet
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DualTrackPreview;
