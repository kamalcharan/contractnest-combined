// src/components/contracts/list/ContractPortfolioRow.tsx
// Contract list row — horizontal card for single-column portfolio view.
// Cycle 4 v2: List row style (not grid card) matching the contacts list pattern.
// Shows: avatar, title+CN#, status badge, client name, value, overdue, view button

import React from 'react';
import { Eye, User } from 'lucide-react';
import type { Contract } from '@/types/contracts';
import { CONTRACT_STATUS_COLORS } from '@/types/contracts';

interface ContractPortfolioRowProps {
  contract: Contract;
  colors: any;
  isDarkMode?: boolean;
  onRowClick: (id: string) => void;
}

const fmt = (n: number, currency?: string) => {
  if (currency === 'USD') return '$' + n.toLocaleString('en-US', { maximumFractionDigits: 0 });
  return '\u20B9' + n.toLocaleString('en-IN', { maximumFractionDigits: 0 });
};

const getSemanticColor = (colorKey: string, colors: any): string => {
  switch (colorKey) {
    case 'success': return colors.semantic.success;
    case 'warning': return colors.semantic.warning;
    case 'error': return colors.semantic.error;
    case 'info': return colors.brand.secondary || colors.brand.primary;
    case 'brand.tertiary': return colors.brand.tertiary || colors.brand.primary;
    default: return colors.utility.secondaryText;
  }
};

// Generate a consistent color from a string (for avatar backgrounds)
const stringToColor = (str: string): string => {
  const palette = [
    '#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899',
    '#f43f5e', '#ef4444', '#f97316', '#eab308', '#84cc16',
    '#22c55e', '#14b8a6', '#06b6d4', '#0ea5e9', '#3b82f6',
  ];
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return palette[Math.abs(hash) % palette.length];
};

const ContractPortfolioRow: React.FC<ContractPortfolioRowProps> = ({
  contract: c,
  colors,
  isDarkMode = false,
  onRowClick,
}) => {
  const eventsOverdue = c.events_overdue ?? 0;
  const health = c.health_score ?? 100;
  const hasOverdue = eventsOverdue > 0;
  const isLowHealth = health > 0 && health < 50;
  const needsAttention = hasOverdue || isLowHealth;

  const statusConfig = CONTRACT_STATUS_COLORS[c.status] || CONTRACT_STATUS_COLORS.draft;
  const statusColor = getSemanticColor(statusConfig.bg, colors);

  const clientName = c.buyer_company || c.buyer_name || '—';
  const initials = clientName
    .split(' ')
    .slice(0, 2)
    .map((w: string) => w[0])
    .join('')
    .toUpperCase();
  const avatarBg = stringToColor(clientName);

  const cardBorder = isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';

  return (
    <div
      onClick={() => onRowClick(c.id)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        padding: '14px 20px',
        borderRadius: 12,
        border: `1px solid ${cardBorder}`,
        borderLeft: needsAttention
          ? `3px solid ${colors.semantic.error}`
          : `1px solid ${cardBorder}`,
        background: isDarkMode ? 'rgba(30, 41, 59, 0.6)' : 'rgba(255, 255, 255, 0.85)',
        cursor: 'pointer',
        transition: 'all 0.15s ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = '0 4px 16px -4px rgba(0,0,0,0.1)';
        e.currentTarget.style.transform = 'translateY(-1px)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = 'none';
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      {/* ── Circle Avatar ── */}
      <div
        style={{
          width: 42,
          height: 42,
          borderRadius: '50%',
          background: avatarBg + '20',
          border: `2px solid ${avatarBg}40`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 13,
          fontWeight: 800,
          color: avatarBg,
          flexShrink: 0,
          letterSpacing: 0.5,
        }}
      >
        {initials || '??'}
      </div>

      {/* ── Title + Contract Number ── */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: colors.utility.primaryText,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            lineHeight: 1.3,
          }}
          title={c.title || c.name}
        >
          {c.title || c.name}
        </div>
        <div
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 11,
            color: colors.utility.secondaryText,
            marginTop: 2,
          }}
        >
          {c.contract_number}
        </div>
      </div>

      {/* ── Status Badge ── */}
      <span
        style={{
          padding: '4px 10px',
          borderRadius: 20,
          background: statusColor + '15',
          color: statusColor,
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: 0.3,
          border: `1px solid ${statusColor}25`,
          whiteSpace: 'nowrap',
          flexShrink: 0,
        }}
      >
        {statusConfig.label}
      </span>

      {/* ── Client Name ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          width: 180,
          flexShrink: 0,
        }}
      >
        <User size={13} style={{ color: colors.utility.secondaryText, flexShrink: 0 }} />
        <span
          style={{
            fontSize: 13,
            color: colors.utility.secondaryText,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {clientName}
        </span>
      </div>

      {/* ── Contract Type ── */}
      <span
        style={{
          padding: '3px 8px',
          borderRadius: 6,
          background: colors.utility.primaryText + '08',
          color: colors.utility.secondaryText,
          fontSize: 11,
          fontWeight: 500,
          flexShrink: 0,
          textTransform: 'capitalize' as const,
        }}
      >
        {c.contract_type || c.record_type || 'Client'}
      </span>

      {/* ── Value ── */}
      <div
        style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 14,
          fontWeight: 700,
          color: colors.utility.primaryText,
          textAlign: 'right',
          width: 110,
          flexShrink: 0,
        }}
      >
        {fmt(c.grand_total || c.total_value || 0, c.currency)}
      </div>

      {/* ── Overdue indicator ── */}
      {hasOverdue ? (
        <span
          style={{
            fontSize: 10,
            padding: '2px 7px',
            borderRadius: 5,
            background: colors.semantic.error + '12',
            color: colors.semantic.error,
            fontWeight: 700,
            flexShrink: 0,
            whiteSpace: 'nowrap',
          }}
        >
          {eventsOverdue} overdue
        </span>
      ) : (
        <span style={{ width: 20, flexShrink: 0 }}>—</span>
      )}

      {/* ── View Button ── */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onRowClick(c.id);
        }}
        style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          border: `1px solid ${colors.utility.primaryText}12`,
          background: 'transparent',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: colors.utility.secondaryText,
          transition: 'all 0.15s',
          flexShrink: 0,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = colors.brand.primary;
          e.currentTarget.style.color = colors.brand.primary;
          e.currentTarget.style.background = colors.brand.primary + '08';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = colors.utility.primaryText + '12';
          e.currentTarget.style.color = colors.utility.secondaryText;
          e.currentTarget.style.background = 'transparent';
        }}
      >
        <Eye size={14} />
      </button>
    </div>
  );
};

export default ContractPortfolioRow;
