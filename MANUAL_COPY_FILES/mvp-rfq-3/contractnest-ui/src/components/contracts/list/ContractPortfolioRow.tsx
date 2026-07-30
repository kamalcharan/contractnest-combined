// src/components/contracts/list/ContractPortfolioRow.tsx
// Contract list row — horizontal card for single-column portfolio view.
// Cycle 4 v2: List row style (not grid card) matching the contacts list pattern.
// Shows: avatar, title+CN#, status badge, client name, value, overdue, view button

import React from 'react';
import { FileText, User, Play, CalendarDays, Users, Clock } from 'lucide-react';
import type { Contract } from '@/types/contracts';
import { CONTRACT_STATUS_COLORS } from '@/types/contracts';

interface ContractPortfolioRowProps {
  contract: Contract;
  colors: any;
  isDarkMode?: boolean;
  onRowClick: (id: string) => void;
  onContactClick?: (contactId: string) => void;
  onResumeDraft?: (contractId: string) => void;
}

const fmt = (n: number, currency?: string) => {
  if (currency === 'USD') return '$' + n.toLocaleString('en-US', { maximumFractionDigits: 0 });
  return '\u20B9' + n.toLocaleString('en-IN', { maximumFractionDigits: 0 });
};

// Short date, e.g. "4 Aug 2026". Accepts date-only or timestamp strings.
const fmtDate = (iso?: string | null): string => {
  if (!iso) return '—';
  const d = new Date(iso.length === 10 ? `${iso}T00:00:00` : iso);
  return isNaN(d.getTime())
    ? '—'
    : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

// Aging of an RFQ against its submission deadline, from *today*. Returns a
// label + a semantic tone key. Whole-day math on the date part only, so it
// doesn't flip on the hour. Terminal RFQ states don't age — the status tells
// the story instead.
const rfqAging = (
  deadline?: string | null,
  status?: string
): { label: string; tone: 'muted' | 'info' | 'warning' | 'error' } | null => {
  if (['awarded', 'converted_to_contract', 'cancelled'].includes(status || '')) return null;
  if (!deadline) return { label: 'No deadline', tone: 'muted' };
  const d = new Date(`${deadline.slice(0, 10)}T00:00:00`);
  if (isNaN(d.getTime())) return { label: 'No deadline', tone: 'muted' };
  const today = new Date();
  const t0 = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const days = Math.round((d.getTime() - t0.getTime()) / 86400000);
  if (days < 0) return { label: `Closed ${Math.abs(days)}d ago`, tone: 'error' };
  if (days === 0) return { label: 'Closes today', tone: 'warning' };
  if (days <= 3) return { label: `${days}d left`, tone: 'warning' };
  return { label: `${days}d left`, tone: 'info' };
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
  onContactClick,
  onResumeDraft,
}) => {
  const eventsOverdue = c.events_overdue ?? 0;
  const health = c.health_score ?? 100;
  const hasOverdue = eventsOverdue > 0;
  const isLowHealth = health > 0 && health < 50;
  const needsAttention = hasOverdue || isLowHealth;

  const statusConfig = CONTRACT_STATUS_COLORS[c.status] || CONTRACT_STATUS_COLORS.draft;
  const statusColor = getSemanticColor(statusConfig.bg, colors);

  // ── RFQ rows speak a different language: not a party + value + health, but
  // start date, how many vendors were asked, and how long until quotes close.
  const isRfq = c.record_type === 'rfq';
  const vendorsSent = (c as any).vendors_count ?? 0;
  const aging = isRfq ? rfqAging((c as any).response_deadline, c.status) : null;
  const agingColor = aging
    ? getSemanticColor(aging.tone === 'info' ? 'info' : aging.tone, colors)
    : colors.utility.secondaryText;

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
      {/* ── Circle Avatar ── (a request has no counterparty yet, so it wears
           a document mark rather than someone's initials) */}
      <div
        style={{
          width: 42,
          height: 42,
          borderRadius: '50%',
          background: isRfq ? colors.brand.primary + '18' : avatarBg + '20',
          border: `2px solid ${isRfq ? colors.brand.primary + '40' : avatarBg + '40'}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 13,
          fontWeight: 800,
          color: isRfq ? colors.brand.primary : avatarBg,
          flexShrink: 0,
          letterSpacing: 0.5,
        }}
      >
        {isRfq ? <FileText size={18} /> : (initials || '??')}
      </div>

      {/* ── Title + Contract Number ── */}
      <div style={{ flex: 1, minWidth: 0, maxWidth: 280 }}>
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
          {c.record_type === 'rfq' ? (c.rfq_number || c.contract_number) : c.contract_number}
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

      {isRfq ? (
        <>
          {/* ── Project start date ── */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, width: 150, flexShrink: 0 }}>
            <CalendarDays size={13} style={{ color: colors.utility.secondaryText, flexShrink: 0 }} />
            <span style={{ fontSize: 13, color: colors.utility.secondaryText, whiteSpace: 'nowrap' }}>
              Starts {fmtDate(c.start_date)}
            </span>
          </div>

          {/* ── Vendors sent ── */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, width: 120, flexShrink: 0 }}>
            <Users size={13} style={{ color: colors.utility.secondaryText, flexShrink: 0 }} />
            <span style={{ fontSize: 13, color: colors.utility.secondaryText, whiteSpace: 'nowrap' }}>
              {vendorsSent} vendor{vendorsSent === 1 ? '' : 's'}
            </span>
          </div>

          {/* ── Last date to submit ── */}
          <div
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 13,
              color: colors.utility.primaryText,
              textAlign: 'right',
              width: 120,
              flexShrink: 0,
              whiteSpace: 'nowrap',
            }}
            title="Last date to submit a quote"
          >
            {fmtDate((c as any).response_deadline)}
          </div>

          {/* ── Aging vs last date ── */}
          {aging ? (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                fontSize: 10,
                padding: '3px 8px',
                borderRadius: 5,
                background: agingColor + '15',
                color: agingColor,
                fontWeight: 700,
                flexShrink: 0,
                whiteSpace: 'nowrap',
                width: 104,
                justifyContent: 'center',
              }}
            >
              <Clock size={11} />
              {aging.label}
            </span>
          ) : (
            <span style={{ width: 104, flexShrink: 0 }} />
          )}
        </>
      ) : (
        <>
          {/* ── Client Name (plain text, no click) ── */}
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
              title={clientName}
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
        </>
      )}

      {/* ── Resume Button (draft contracts) ── */}
      {c.status === 'draft' && onResumeDraft && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onResumeDraft(c.id);
          }}
          title="Resume editing this draft"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            padding: '5px 12px',
            borderRadius: 8,
            border: `1px solid ${colors.brand.primary}30`,
            background: colors.brand.primary + '08',
            cursor: 'pointer',
            color: colors.brand.primary,
            fontSize: 11,
            fontWeight: 600,
            transition: 'all 0.15s',
            flexShrink: 0,
            whiteSpace: 'nowrap' as const,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = colors.brand.primary + '15';
            e.currentTarget.style.borderColor = colors.brand.primary + '50';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = colors.brand.primary + '08';
            e.currentTarget.style.borderColor = colors.brand.primary + '30';
          }}
        >
          <Play size={11} />
          Resume
        </button>
      )}

      {/* ── Action Icons: Contract View + Contact View ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
        {/* Contract View */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRowClick(c.id);
          }}
          title="View contract"
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
          <FileText size={14} />
        </button>

        {/* Contact View */}
        {c.buyer_id && onContactClick && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onContactClick(c.buyer_id!);
            }}
            title={`View ${clientName}`}
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
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = colors.semantic.success;
              e.currentTarget.style.color = colors.semantic.success;
              e.currentTarget.style.background = colors.semantic.success + '08';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = colors.utility.primaryText + '12';
              e.currentTarget.style.color = colors.utility.secondaryText;
              e.currentTarget.style.background = 'transparent';
            }}
          >
            <User size={14} />
          </button>
        )}
      </div>
    </div>
  );
};

export default ContractPortfolioRow;
