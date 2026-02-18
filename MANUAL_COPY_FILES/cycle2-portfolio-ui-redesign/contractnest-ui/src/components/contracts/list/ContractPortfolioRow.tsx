// src/components/contracts/list/ContractPortfolioRow.tsx
// Enriched contract row for the portfolio list view
// Shows: health ring, title/status, tasks, progress, value/collected, action

import React from 'react';
import { Eye } from 'lucide-react';
import type { Contract } from '@/types/contracts';
import { CONTRACT_STATUS_COLORS } from '@/types/contracts';
import MiniHealthRing from './MiniHealthRing';
import ProgressMini from './ProgressMini';

interface ContractPortfolioRowProps {
  contract: Contract;
  colors: any;
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

const ContractPortfolioRow: React.FC<ContractPortfolioRowProps> = ({
  contract: c,
  colors,
  onRowClick,
}) => {
  const health = c.health_score ?? 100;
  const eventsTotal = c.events_total ?? 0;
  const eventsCompleted = c.events_completed ?? 0;
  const eventsOverdue = c.events_overdue ?? 0;
  const completionPct = c.completion_pct ?? 0;
  const collected = c.total_collected ?? 0;

  const hasOverdue = eventsOverdue > 0;
  const isLowHealth = health > 0 && health < 50;
  const needsAttention = hasOverdue || isLowHealth;

  const statusConfig = CONTRACT_STATUS_COLORS[c.status] || CONTRACT_STATUS_COLORS.draft;
  const statusColor = getSemanticColor(statusConfig.bg, colors);

  return (
    <div
      onClick={() => onRowClick(c.id)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        padding: '12px 20px',
        background: needsAttention ? colors.semantic.error + '06' : colors.utility.secondaryBackground,
        borderLeft: needsAttention
          ? `3px solid ${colors.semantic.error}`
          : '3px solid transparent',
        cursor: 'pointer',
        transition: 'all 0.15s',
        borderBottom: `1px solid ${colors.utility.primaryText}08`,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = colors.utility.primaryText + '06';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = needsAttention
          ? colors.semantic.error + '06'
          : colors.utility.secondaryBackground;
      }}
    >
      {/* Health Ring */}
      <MiniHealthRing score={health} colors={colors} />

      {/* Identity: title + status + id + client */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: colors.utility.primaryText,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {c.title || c.name}
          </span>
          {/* Status badge */}
          <span
            style={{
              padding: '2px 8px',
              borderRadius: 6,
              background: statusColor + '18',
              color: statusColor,
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: 0.3,
              whiteSpace: 'nowrap',
            }}
          >
            {statusConfig.label}
          </span>
          {/* Overdue badge */}
          {hasOverdue && (
            <span
              style={{
                fontSize: 10,
                padding: '2px 6px',
                borderRadius: 4,
                background: colors.semantic.error + '12',
                color: colors.semantic.error,
                fontWeight: 700,
                whiteSpace: 'nowrap',
              }}
            >
              {eventsOverdue} overdue
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3 }}>
          <span
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 11,
              color: colors.utility.secondaryText,
            }}
          >
            {c.contract_number}
          </span>
          <span
            style={{
              width: 3,
              height: 3,
              borderRadius: '50%',
              background: colors.utility.secondaryText + '40',
              flexShrink: 0,
            }}
          />
          <span
            style={{
              fontSize: 11,
              color: colors.utility.secondaryText,
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              overflow: 'hidden',
            }}
          >
            {/* Client initials avatar */}
            <span
              style={{
                width: 18,
                height: 18,
                borderRadius: 5,
                background: colors.brand.primary + '18',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 8,
                fontWeight: 800,
                color: colors.brand.primary,
                flexShrink: 0,
              }}
            >
              {(c.buyer_company || c.buyer_name || '??')
                .split(' ')
                .slice(0, 2)
                .map((w: string) => w[0])
                .join('')
                .toUpperCase()}
            </span>
            <span
              style={{
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {c.buyer_company || c.buyer_name || '—'}
            </span>
          </span>
        </div>
      </div>

      {/* Tasks column */}
      <div style={{ width: 70, textAlign: 'center', flexShrink: 0 }}>
        {eventsTotal > 0 ? (
          <>
            <div
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 13,
                fontWeight: 600,
                color: colors.utility.primaryText,
              }}
            >
              {eventsCompleted}
              <span style={{ color: colors.utility.secondaryText + '60' }}>
                /{eventsTotal}
              </span>
            </div>
            <div
              style={{
                fontSize: 9,
                color: colors.utility.secondaryText,
                textTransform: 'uppercase',
                letterSpacing: 0.5,
                marginTop: 1,
              }}
            >
              Tasks
            </div>
          </>
        ) : (
          <span style={{ fontSize: 11, color: colors.utility.secondaryText + '60' }}>—</span>
        )}
      </div>

      {/* Progress column */}
      <div style={{ width: 110, flexShrink: 0 }}>
        <ProgressMini value={completionPct} colors={colors} />
      </div>

      {/* Value column */}
      <div style={{ width: 100, textAlign: 'right', flexShrink: 0 }}>
        <div
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 13,
            fontWeight: 700,
            color: colors.utility.primaryText,
          }}
        >
          {fmt(c.grand_total || c.total_value || 0, c.currency)}
        </div>
        {collected > 0 && c.status !== 'completed' && (
          <div
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 10,
              color: colors.semantic.success,
              marginTop: 1,
            }}
          >
            {fmt(collected, c.currency)} in
          </div>
        )}
      </div>

      {/* Action button */}
      <div style={{ width: 36, flexShrink: 0 }}>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRowClick(c.id);
          }}
          style={{
            width: 30,
            height: 30,
            borderRadius: 8,
            border: `1px solid ${colors.utility.primaryText}15`,
            background: colors.utility.secondaryBackground,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: colors.utility.secondaryText,
            transition: 'all 0.15s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = colors.brand.primary;
            e.currentTarget.style.color = colors.brand.primary;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = colors.utility.primaryText + '15';
            e.currentTarget.style.color = colors.utility.secondaryText;
          }}
        >
          <Eye size={14} />
        </button>
      </div>
    </div>
  );
};

export default ContractPortfolioRow;
