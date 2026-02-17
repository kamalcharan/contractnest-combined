// src/components/contracts/BuyerTimelineNode.tsx
// Buyer-focused timeline node — SLA-focused, read-only
// Shows: title, status badge, due date, amount (if billing)
// No assignee details, no internal action buttons

import React from 'react';

// =================================================================
// TYPES
// =================================================================

export interface BuyerTimelineNodeProps {
  title: string;
  status: string;
  dueDate?: string;
  amount?: number;
  currency?: string;
  isLast: boolean;
  type: 'service' | 'billing';
  /** Optional action for billing nodes (e.g. Pay Now) */
  onAction?: () => void;
  actionLabel?: string;
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
  paid:        { line: '#10b981', dot: '#10b981', bg: '#f0fdf4' },
  unpaid:      { line: '#f59e0b', dot: '#f59e0b', bg: '#fffbeb' },
};

const STATUS_LABELS: Record<string, { label: string; bg: string; color: string; dot: string }> = {
  completed:   { label: 'Completed',   bg: '#d1fae5', color: '#059669', dot: '#10b981' },
  in_progress: { label: 'In Progress', bg: '#dbeafe', color: '#2563eb', dot: '#3b82f6' },
  pending:     { label: 'Pending',     bg: '#fef3c7', color: '#d97706', dot: '#f59e0b' },
  overdue:     { label: 'Overdue',     bg: '#fee2e2', color: '#dc2626', dot: '#ef4444' },
  not_started: { label: 'Scheduled',   bg: '#f1f5f9', color: '#94a3b8', dot: '#cbd5e1' },
  cancelled:   { label: 'Cancelled',   bg: '#f1f5f9', color: '#94a3b8', dot: '#cbd5e1' },
  paid:        { label: 'Paid',        bg: '#d1fae5', color: '#059669', dot: '#10b981' },
  unpaid:      { label: 'Unpaid',      bg: '#fef3c7', color: '#d97706', dot: '#f59e0b' },
};

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

const formatDate = (d?: string) => {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
};

// =================================================================
// COMPONENT
// =================================================================

export const BuyerTimelineNode: React.FC<BuyerTimelineNodeProps> = ({
  title,
  status,
  dueDate,
  amount,
  currency,
  isLast,
  type,
  onAction,
  actionLabel,
}) => {
  const sc = STATUS_STYLES[status] || STATUS_STYLES.not_started;
  const sl = STATUS_LABELS[status] || STATUS_LABELS.not_started;

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
          {(status === 'completed' || status === 'paid') && (
            <span style={{ color: '#fff', fontSize: 7, fontWeight: 900 }}>{'\u2713'}</span>
          )}
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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ flex: 1 }}>
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
                <span style={{ fontSize: 11, color: '#94a3b8' }}>
                  {'\uD83D\uDCC5'} {formatDate(dueDate)}
                </span>
              )}
              {type === 'billing' && amount != null && (
                <span
                  style={{
                    fontFamily: 'monospace',
                    fontSize: 13,
                    fontWeight: 700,
                    color: status === 'overdue' ? '#ef4444' : '#0f172a',
                  }}
                >
                  {formatCurrency(amount, currency)}
                </span>
              )}
            </div>
          </div>

          {/* Optional action button (e.g. Pay Now) */}
          {onAction && actionLabel && (
            <button
              onClick={onAction}
              style={{
                padding: '5px 12px',
                borderRadius: 8,
                border: status === 'overdue' ? 'none' : '1px solid #e2e8f0',
                background: status === 'overdue' ? '#ef4444' : '#fff',
                color: status === 'overdue' ? '#fff' : '#0f172a',
                fontSize: 11,
                fontWeight: 600,
                cursor: 'pointer',
                flexShrink: 0,
                marginLeft: 8,
              }}
            >
              {actionLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default BuyerTimelineNode;
