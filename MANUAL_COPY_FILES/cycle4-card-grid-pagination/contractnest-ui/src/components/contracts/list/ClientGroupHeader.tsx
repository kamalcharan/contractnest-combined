// src/components/contracts/list/ClientGroupHeader.tsx
// Collapsible header for a client group in the grouped portfolio view.
// Cycle 4: Improved expand/collapse visibility with larger chevron, colored indicator
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
        padding: '14px 20px',
        background: isExpanded
          ? colors.brand.primary + '08'
          : colors.utility.primaryText + '04',
        borderBottom: `1px solid ${colors.utility.primaryText}08`,
        borderLeft: `3px solid ${isExpanded ? colors.brand.primary : 'transparent'}`,
        borderRadius: '10px',
        marginBottom: isExpanded ? 4 : 0,
        cursor: 'pointer',
        transition: 'all 0.2s',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = colors.brand.primary + '10';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = isExpanded
          ? colors.brand.primary + '08'
          : colors.utility.primaryText + '04';
      }}
    >
      {/* Expand/Collapse chevron — larger, colored when expanded */}
      <div
        style={{
          width: 28,
          height: 28,
          borderRadius: 8,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          background: isExpanded ? colors.brand.primary + '15' : colors.utility.primaryText + '08',
          color: isExpanded ? colors.brand.primary : colors.utility.secondaryText,
          transition: 'all 0.2s',
        }}
      >
        {isExpanded ? <ChevronDown size={16} strokeWidth={2.5} /> : <ChevronRight size={16} strokeWidth={2.5} />}
      </div>

      {/* Client initials avatar */}
      <div
        style={{
          width: 34,
          height: 34,
          borderRadius: 10,
          background: colors.brand.primary + '18',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 12,
          fontWeight: 800,
          color: colors.brand.primary,
          flexShrink: 0,
          border: `1px solid ${colors.brand.primary}30`,
        }}
      >
        {initials}
      </div>

      {/* Client name + count */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span
            style={{
              fontSize: 15,
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
              fontSize: 11,
              fontWeight: 600,
              color: colors.utility.secondaryText,
              padding: '2px 8px',
              borderRadius: 6,
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
            fontSize: 14,
            fontWeight: 700,
            color: healthColor,
          }}
        >
          {totals.avg_health}
        </div>
        <div
          style={{
            fontSize: 9,
            color: colors.utility.secondaryText,
            textTransform: 'uppercase',
            letterSpacing: 0.5,
            fontWeight: 600,
          }}
        >
          Health
        </div>
      </div>

      {/* Total value */}
      <div style={{ width: 100, textAlign: 'right', flexShrink: 0 }}>
        <div
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 14,
            fontWeight: 700,
            color: colors.utility.primaryText,
          }}
        >
          {fmt(totals.total_value, currency)}
        </div>
        <div
          style={{
            fontSize: 9,
            color: colors.utility.secondaryText,
            textTransform: 'uppercase',
            letterSpacing: 0.5,
            fontWeight: 600,
          }}
        >
          Value
        </div>
      </div>

      {/* Collected */}
      <div style={{ width: 90, textAlign: 'right', flexShrink: 0 }}>
        <div
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 13,
            fontWeight: 600,
            color: colors.semantic.success,
          }}
        >
          {fmt(totals.total_collected, currency)}
        </div>
        <div
          style={{
            fontSize: 9,
            color: colors.utility.secondaryText,
            textTransform: 'uppercase',
            letterSpacing: 0.5,
            fontWeight: 600,
          }}
        >
          Collected
        </div>
      </div>

      {/* Overdue badge */}
      {totals.total_overdue > 0 && (
        <div
          style={{
            padding: '4px 10px',
            borderRadius: 8,
            background: colors.semantic.error + '12',
            color: colors.semantic.error,
            fontSize: 11,
            fontWeight: 700,
            flexShrink: 0,
            whiteSpace: 'nowrap',
            border: `1px solid ${colors.semantic.error}20`,
          }}
        >
          {totals.total_overdue} overdue
        </div>
      )}
    </div>
  );
};

export default ClientGroupHeader;
