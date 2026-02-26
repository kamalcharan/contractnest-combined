// src/components/contracts/list/RelationshipRow.tsx
// Parent row in the unified Relationships list.
// Shows: avatar, contact name, classification badges, contract count,
// total value, avg health ring, expand chevron, arrow-nav to Contact Dashboard.

import React from 'react';
import { ChevronDown, ChevronRight, ArrowRight, Building2, User } from 'lucide-react';
import type { Relationship } from '@/types/relationships';
import MiniHealthRing from './MiniHealthRing';

interface RelationshipRowProps {
  relationship: Relationship;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onNavigateContact: (contactId: string) => void;
  colors: any;
  isDarkMode: boolean;
}

const fmt = (n: number, currency?: string) => {
  if (currency === 'USD') return '$' + n.toLocaleString('en-US', { maximumFractionDigits: 0 });
  return '\u20B9' + n.toLocaleString('en-IN', { maximumFractionDigits: 0 });
};

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

const RelationshipRow: React.FC<RelationshipRowProps> = ({
  relationship: r,
  isExpanded,
  onToggleExpand,
  onNavigateContact,
  colors,
  isDarkMode,
}) => {
  const contact = r.contact;
  const summary = r.contractSummary;

  const displayName = contact.company_name || contact.name || contact.displayName || '—';
  const isCorporate = contact.type === 'corporate';
  const initials = displayName
    .split(' ')
    .slice(0, 2)
    .map((w: string) => w[0])
    .join('')
    .toUpperCase();
  const avatarBg = stringToColor(displayName);

  const hasContracts = summary.contract_count > 0;
  const hasOverdue = summary.overdue_events > 0;
  const isLowHealth = summary.avg_health > 0 && summary.avg_health < 50;
  const needsAttention = hasOverdue || isLowHealth;

  const cardBorder = isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';

  return (
    <div
      onClick={onToggleExpand}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: '14px 20px',
        borderRadius: 12,
        border: `1px solid ${cardBorder}`,
        borderLeft: needsAttention
          ? `3px solid ${colors.semantic.error}`
          : `1px solid ${cardBorder}`,
        background: isDarkMode ? 'rgba(30, 41, 59, 0.6)' : 'rgba(255, 255, 255, 0.85)',
        cursor: hasContracts ? 'pointer' : 'default',
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
      {/* Expand chevron */}
      <div style={{ width: 20, flexShrink: 0, display: 'flex', justifyContent: 'center' }}>
        {hasContracts ? (
          isExpanded ? (
            <ChevronDown size={16} style={{ color: colors.brand.primary }} />
          ) : (
            <ChevronRight size={16} style={{ color: colors.utility.secondaryText }} />
          )
        ) : (
          <span style={{ width: 16 }} />
        )}
      </div>

      {/* Circle Avatar */}
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

      {/* Name + type */}
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
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
          title={displayName}
        >
          {isCorporate ? (
            <Building2 size={13} style={{ color: colors.utility.secondaryText, flexShrink: 0 }} />
          ) : (
            <User size={13} style={{ color: colors.utility.secondaryText, flexShrink: 0 }} />
          )}
          {displayName}
        </div>
        {/* Classification badges */}
        <div style={{ display: 'flex', gap: 4, marginTop: 3 }}>
          {(contact.classifications || []).slice(0, 3).map((cls: string) => (
            <span
              key={cls}
              style={{
                fontSize: 9,
                fontWeight: 600,
                padding: '1px 6px',
                borderRadius: 4,
                background: colors.utility.primaryText + '08',
                color: colors.utility.secondaryText,
                textTransform: 'capitalize',
                letterSpacing: 0.3,
              }}
            >
              {cls}
            </span>
          ))}
        </div>
      </div>

      {/* Contract count badge */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          padding: '4px 10px',
          borderRadius: 20,
          background: hasContracts ? colors.brand.primary + '12' : colors.utility.primaryText + '08',
          flexShrink: 0,
        }}
      >
        <span
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 12,
            fontWeight: 700,
            color: hasContracts ? colors.brand.primary : colors.utility.secondaryText,
          }}
        >
          {summary.contract_count}
        </span>
        <span
          style={{
            fontSize: 10,
            color: hasContracts ? colors.brand.primary : colors.utility.secondaryText,
            fontWeight: 500,
          }}
        >
          {summary.contract_count === 1 ? 'contract' : 'contracts'}
        </span>
      </div>

      {/* Total value */}
      <div
        style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 14,
          fontWeight: 700,
          color: colors.utility.primaryText,
          textAlign: 'right',
          width: 120,
          flexShrink: 0,
        }}
      >
        {summary.total_value > 0 ? fmt(summary.total_value) : '—'}
      </div>

      {/* Avg health ring */}
      {hasContracts && (
        <MiniHealthRing score={summary.avg_health} size={32} colors={colors} />
      )}

      {/* Overdue indicator */}
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
          {summary.overdue_events} overdue
        </span>
      ) : (
        <span style={{ width: 60, flexShrink: 0 }} />
      )}

      {/* Navigate to Contact Dashboard */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onNavigateContact(contact.id);
        }}
        title="Open Contact Dashboard"
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
        <ArrowRight size={14} />
      </button>
    </div>
  );
};

export default RelationshipRow;
