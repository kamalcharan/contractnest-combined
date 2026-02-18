// src/components/contracts/list/ContractPortfolioRow.tsx
// Contract card for the portfolio grid view
// Cycle 4: Redesigned from table-row to card layout (contacts-style)
// Shows: health ring, title/status, client, tasks, progress, value, collected

import React from 'react';
import { Eye } from 'lucide-react';
import type { Contract } from '@/types/contracts';
import { CONTRACT_STATUS_COLORS } from '@/types/contracts';
import MiniHealthRing from './MiniHealthRing';
import ProgressMini from './ProgressMini';

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

const ContractPortfolioRow: React.FC<ContractPortfolioRowProps> = ({
  contract: c,
  colors,
  isDarkMode = false,
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

  const cardBg = isDarkMode ? 'rgba(30, 41, 59, 0.8)' : 'rgba(255, 255, 255, 0.8)';
  const cardBorder = isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)';

  return (
    <div
      onClick={() => onRowClick(c.id)}
      style={{
        borderRadius: 14,
        border: `1px solid ${cardBorder}`,
        borderLeft: needsAttention
          ? `3px solid ${colors.semantic.error}`
          : `1px solid ${cardBorder}`,
        background: cardBg,
        backdropFilter: 'blur(10px)',
        boxShadow: '0 2px 12px -4px rgba(0,0,0,0.06)',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        display: 'flex',
        flexDirection: 'column' as const,
        overflow: 'hidden',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = '0 8px 28px -6px rgba(0,0,0,0.12)';
        e.currentTarget.style.transform = 'translateY(-2px)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = '0 2px 12px -4px rgba(0,0,0,0.06)';
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      {/* ── Header: Status badge (top-right) ── */}
      <div style={{ padding: '14px 16px 0 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', marginBottom: 10 }}>
          <span
            style={{
              padding: '3px 10px',
              borderRadius: 20,
              background: statusColor + '18',
              color: statusColor,
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: 0.3,
              border: `1px solid ${statusColor}30`,
            }}
          >
            {statusConfig.label}
          </span>
        </div>

        {/* ── Title row: Health Ring + Title + Contract# ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
          <MiniHealthRing score={health} size={40} colors={colors} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: 15,
                fontWeight: 700,
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
        </div>

        {/* ── Client / Buyer ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <span
            style={{
              width: 22,
              height: 22,
              borderRadius: 6,
              background: colors.brand.primary + '18',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 9,
              fontWeight: 800,
              color: colors.brand.primary,
              flexShrink: 0,
              border: `1px solid ${colors.brand.primary}30`,
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
              fontSize: 13,
              color: colors.utility.secondaryText,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {c.buyer_company || c.buyer_name || '—'}
          </span>
        </div>
      </div>

      {/* ── Stats: Tasks / Progress / Value ── */}
      <div style={{ padding: '0 16px 12px 16px' }}>
        <div style={{ display: 'flex', gap: 8 }}>
          {/* Tasks */}
          <div
            style={{
              flex: 1,
              padding: '8px 6px',
              borderRadius: 8,
              background: colors.utility.primaryText + '05',
              textAlign: 'center',
            }}
          >
            {eventsTotal > 0 ? (
              <div
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 14,
                  fontWeight: 700,
                  color: colors.utility.primaryText,
                }}
              >
                {eventsCompleted}
                <span style={{ color: colors.utility.secondaryText + '80' }}>/{eventsTotal}</span>
              </div>
            ) : (
              <div style={{ fontSize: 14, color: colors.utility.secondaryText + '50' }}>—</div>
            )}
            <div
              style={{
                fontSize: 9,
                color: colors.utility.secondaryText,
                fontWeight: 600,
                textTransform: 'uppercase' as const,
                letterSpacing: 0.5,
                marginTop: 2,
              }}
            >
              Tasks
            </div>
          </div>

          {/* Progress */}
          <div
            style={{
              flex: 1,
              padding: '8px 6px',
              borderRadius: 8,
              background: colors.utility.primaryText + '05',
              display: 'flex',
              flexDirection: 'column' as const,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ProgressMini value={completionPct} width={70} colors={colors} />
            <div
              style={{
                fontSize: 9,
                color: colors.utility.secondaryText,
                fontWeight: 600,
                textTransform: 'uppercase' as const,
                letterSpacing: 0.5,
                marginTop: 4,
              }}
            >
              Progress
            </div>
          </div>

          {/* Value */}
          <div
            style={{
              flex: 1,
              padding: '8px 6px',
              borderRadius: 8,
              background: colors.utility.primaryText + '05',
              textAlign: 'center',
            }}
          >
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
            <div
              style={{
                fontSize: 9,
                color: colors.utility.secondaryText,
                fontWeight: 600,
                textTransform: 'uppercase' as const,
                letterSpacing: 0.5,
                marginTop: 2,
              }}
            >
              Value
            </div>
          </div>
        </div>
      </div>

      {/* ── Footer: Collected + Overdue + View ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 16px',
          borderTop: `1px solid ${colors.utility.primaryText}08`,
          marginTop: 'auto',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' as const }}>
          {collected > 0 && (
            <span
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 11,
                fontWeight: 600,
                color: colors.semantic.success,
              }}
            >
              {fmt(collected, c.currency)} collected
            </span>
          )}
          {hasOverdue && (
            <span
              style={{
                fontSize: 10,
                padding: '2px 7px',
                borderRadius: 5,
                background: colors.semantic.error + '12',
                color: colors.semantic.error,
                fontWeight: 700,
              }}
            >
              {eventsOverdue} overdue
            </span>
          )}
          {!collected && !hasOverdue && (
            <span style={{ fontSize: 11, color: colors.utility.secondaryText + '60' }}>—</span>
          )}
        </div>
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
