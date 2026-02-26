// src/components/contracts/list/ContractSubRow.tsx
// Nested contract row under a Relationship parent.
// Shows: contract title, CN#, status pill, type badge, value, overdue, arrow-nav.

import React from 'react';
import { ArrowRight, FileText } from 'lucide-react';
import type { Contract } from '@/types/contracts';
import { CONTRACT_STATUS_COLORS } from '@/types/contracts';

interface ContractSubRowProps {
  contract: Contract;
  isLast: boolean;
  onNavigateContract: (contractId: string) => void;
  colors: any;
  isDarkMode: boolean;
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

const ContractSubRow: React.FC<ContractSubRowProps> = ({
  contract: c,
  isLast,
  onNavigateContract,
  colors,
  isDarkMode,
}) => {
  const statusConfig = CONTRACT_STATUS_COLORS[c.status] || CONTRACT_STATUS_COLORS.draft;
  const statusColor = getSemanticColor(statusConfig.bg, colors);
  const eventsOverdue = c.events_overdue ?? 0;

  return (
    <div
      onClick={() => onNavigateContract(c.id)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: '10px 20px 10px 76px', // Indented to align under parent content
        borderRadius: 0,
        borderBottom: isLast ? 'none' : `1px solid ${isDarkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)'}`,
        background: isDarkMode ? 'rgba(30, 41, 59, 0.3)' : 'rgba(248, 250, 252, 0.6)',
        cursor: 'pointer',
        transition: 'all 0.15s ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = isDarkMode ? 'rgba(30, 41, 59, 0.5)' : 'rgba(241, 245, 249, 0.9)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = isDarkMode ? 'rgba(30, 41, 59, 0.3)' : 'rgba(248, 250, 252, 0.6)';
      }}
    >
      {/* Tree connector */}
      <div
        style={{
          width: 16,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <div
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: statusColor + '60',
            border: `1.5px solid ${statusColor}`,
          }}
        />
      </div>

      {/* Contract icon */}
      <FileText size={14} style={{ color: colors.utility.secondaryText, flexShrink: 0 }} />

      {/* Title + CN# */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 13,
            fontWeight: 500,
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
            fontSize: 10,
            color: colors.utility.secondaryText,
            marginTop: 1,
          }}
        >
          {c.contract_number}
        </div>
      </div>

      {/* Status badge */}
      <span
        style={{
          padding: '3px 9px',
          borderRadius: 20,
          background: statusColor + '15',
          color: statusColor,
          fontSize: 10,
          fontWeight: 600,
          letterSpacing: 0.3,
          border: `1px solid ${statusColor}25`,
          whiteSpace: 'nowrap',
          flexShrink: 0,
        }}
      >
        {statusConfig.label}
      </span>

      {/* Contract type */}
      <span
        style={{
          padding: '2px 7px',
          borderRadius: 5,
          background: colors.utility.primaryText + '08',
          color: colors.utility.secondaryText,
          fontSize: 10,
          fontWeight: 500,
          flexShrink: 0,
          textTransform: 'capitalize' as const,
        }}
      >
        {c.contract_type || c.record_type || '—'}
      </span>

      {/* Value */}
      <div
        style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 13,
          fontWeight: 600,
          color: colors.utility.primaryText,
          textAlign: 'right',
          width: 100,
          flexShrink: 0,
        }}
      >
        {fmt(c.grand_total || c.total_value || 0, c.currency)}
      </div>

      {/* Overdue indicator */}
      {eventsOverdue > 0 ? (
        <span
          style={{
            fontSize: 9,
            padding: '2px 6px',
            borderRadius: 4,
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
        <span style={{ width: 55, flexShrink: 0 }} />
      )}

      {/* Navigate to Contract Detail */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onNavigateContract(c.id);
        }}
        title="Open Contract Detail"
        style={{
          width: 28,
          height: 28,
          borderRadius: 6,
          border: `1px solid ${colors.utility.primaryText}10`,
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
          e.currentTarget.style.borderColor = colors.utility.primaryText + '10';
          e.currentTarget.style.color = colors.utility.secondaryText;
          e.currentTarget.style.background = 'transparent';
        }}
      >
        <ArrowRight size={12} />
      </button>
    </div>
  );
};

export default ContractSubRow;
