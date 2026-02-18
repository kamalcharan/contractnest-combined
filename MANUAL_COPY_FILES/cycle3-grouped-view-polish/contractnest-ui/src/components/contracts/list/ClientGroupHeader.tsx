// src/components/contracts/list/ClientGroupHeader.tsx
// Collapsible header for a client group in the grouped portfolio view.
// Shows: initials avatar, client name, contract count, avg health, total value, collected, overdue badge

import React from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import type { ContractGroupTotals } from '@/types/contracts';

interface ClientGroupHeaderProps {
  buyerName: string;
  buyerCompany: string;
  totals: ContractGroupTotals;
  isExpanded: boolean;
  onToggle: () => void;
  currency?: string;
  colors: {
    brand: { primary: string };
    utility: { primaryText: string; secondaryText: string; secondaryBackground: string };
    semantic: { success: string; error: string; warning: string };
  };
}

const fmt = (n: number, currency?: string) => {
  if (currency === 'USD') return '$' + n.toLocaleString('en-US', { maximumFractionDigits: 0 });
  return '\u20B9' + n.toLocaleString('en-IN', { maximumFractionDigits: 0 });
};

const ClientGroupHeader: React.FC<ClientGroupHeaderProps> = ({
  buyerName,
  buyerCompany,
  totals,
  isExpanded,
  onToggle,
  currency,
  colors,
}) => {
  const healthColor =
    totals.avg_health >= 70
      ? colors.semantic.success
      : totals.avg_health >= 40
        ? colors.semantic.warning
        : colors.semantic.error;

  const initials = (buyerCompany || buyerName || '??')
    .split(' ')
    .slice(0, 2)
    .map((w: string) => w[0])
    .join('')
    .toUpperCase();

  return (
    <div
      onClick={onToggle}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: '10px 20px',
        background: colors.utility.primaryText + '04',
        borderBottom: `1px solid ${colors.utility.primaryText}08`,
        cursor: 'pointer',
        transition: 'background 0.15s',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = colors.utility.primaryText + '08';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = colors.utility.primaryText + '04';
      }}
    >
      {/* Expand/Collapse chevron */}
      <div style={{ width: 16, flexShrink: 0, color: colors.utility.secondaryText }}>
        {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
      </div>

      {/* Client initials avatar */}
      <div
        style={{
          width: 28,
          height: 28,
          borderRadius: 8,
          background: colors.brand.primary + '18',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 10,
          fontWeight: 800,
          color: colors.brand.primary,
          flexShrink: 0,
        }}
      >
        {initials}
      </div>

      {/* Client name + count */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: colors.utility.primaryText,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {buyerCompany || buyerName}
          </span>
          <span
            style={{
              fontSize: 10,
              fontWeight: 600,
              color: colors.utility.secondaryText,
              padding: '1px 6px',
              borderRadius: 4,
              background: colors.utility.primaryText + '08',
            }}
          >
            {totals.contract_count} contract{totals.contract_count !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Avg health */}
      <div style={{ width: 60, textAlign: 'center', flexShrink: 0 }}>
        <div
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 12,
            fontWeight: 700,
            color: healthColor,
          }}
        >
          {totals.avg_health}
        </div>
        <div
          style={{
            fontSize: 8,
            color: colors.utility.secondaryText,
            textTransform: 'uppercase',
            letterSpacing: 0.5,
          }}
        >
          Health
        </div>
      </div>

      {/* Total value */}
      <div style={{ width: 90, textAlign: 'right', flexShrink: 0 }}>
        <div
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 12,
            fontWeight: 700,
            color: colors.utility.primaryText,
          }}
        >
          {fmt(totals.total_value, currency)}
        </div>
        <div
          style={{
            fontSize: 8,
            color: colors.utility.secondaryText,
            textTransform: 'uppercase',
            letterSpacing: 0.5,
          }}
        >
          Value
        </div>
      </div>

      {/* Collected */}
      <div style={{ width: 80, textAlign: 'right', flexShrink: 0 }}>
        <div
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 12,
            fontWeight: 600,
            color: colors.semantic.success,
          }}
        >
          {fmt(totals.total_collected, currency)}
        </div>
        <div
          style={{
            fontSize: 8,
            color: colors.utility.secondaryText,
            textTransform: 'uppercase',
            letterSpacing: 0.5,
          }}
        >
          Collected
        </div>
      </div>

      {/* Overdue badge */}
      {totals.total_overdue > 0 && (
        <div
          style={{
            padding: '3px 8px',
            borderRadius: 6,
            background: colors.semantic.error + '12',
            color: colors.semantic.error,
            fontSize: 10,
            fontWeight: 700,
            flexShrink: 0,
            whiteSpace: 'nowrap',
          }}
        >
          {totals.total_overdue} overdue
        </div>
      )}
    </div>
  );
};

export default ClientGroupHeader;
