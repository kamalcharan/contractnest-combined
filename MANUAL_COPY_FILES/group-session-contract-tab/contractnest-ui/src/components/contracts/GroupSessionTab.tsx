// src/components/contracts/GroupSessionTab.tsx
// ============================================================================
// Contract detail → "Sessions" tab — a buyer's own attendance record within
// ONE Group Session block on THIS contract. This is the canonical home for
// the per-member view (moved here from the Group Sessions dashboard, which
// now shows a consolidated roster sheet instead of a per-member drill-down —
// see /operations/group-sessions). Same data (gs_member_block via
// useMemberBlock), same shared hook, single-view layout (one card, not a
// grid of separate KPI cards).
// ============================================================================

import React from 'react';
import { Users, CalendarClock, Clock, Wallet, AlertTriangle, UserCog, CheckCircle2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { useMemberBlock } from '@/hooks/queries/useGroupSessionsDashboard';

const fmtDate = (d?: string | null): string => {
  if (!d) return '—';
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return String(d);
  return dt.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
};

interface GroupSessionTabProps {
  colors: any;
  memberId: string;
  blockId: string;
  blockName?: string;
}

const GroupSessionTab: React.FC<GroupSessionTabProps> = ({ colors, memberId, blockId, blockName }) => {
  const memberQuery = useMemberBlock(memberId, blockId);
  const d = memberQuery.data;

  const cardStyle = {
    backgroundColor: colors.utility.secondaryBackground,
    borderColor: colors.utility.primaryText + '14',
  };
  const ink = { color: colors.utility.primaryText };
  const sub = { color: colors.utility.secondaryText };
  const line = colors.utility.primaryText + '14';

  const attPct = d && d.overall > 0 ? Math.round((d.attended / d.overall) * 100) : null;

  if (memberQuery.isLoading) {
    return <div className="py-16 flex justify-center"><LoadingSpinner size="md" /></div>;
  }
  if (!d || d.ok === false) {
    return (
      <Card style={cardStyle}>
        <div className="py-12 text-center text-sm" style={sub}>No attendance record found for this session yet.</div>
      </Card>
    );
  }

  return (
    <Card style={cardStyle}>
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b" style={{ borderColor: line }}>
        <div className="w-9 h-9 rounded-xl grid place-items-center flex-none" style={{ backgroundColor: colors.brand.primary + '1e', color: colors.brand.primary }}>
          <Users size={17} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[14px] font-semibold" style={ink}>{blockName || 'Group Session'}</div>
          <div className="text-[11.5px]" style={sub}>{d.name || 'Member'}</div>
        </div>
        <span className="text-[11px] font-bold rounded-full px-2.5 py-1" style={{ backgroundColor: (d.dues_pending ? colors.semantic.warning : colors.semantic.success) + '1e', color: d.dues_pending ? colors.semantic.warning : colors.semantic.success }}>
          {d.dues_pending ? 'Dues due' : 'Dues clear'}
        </span>
      </div>

      {/* Consolidated stat strip — one row, not separate cards */}
      <div className="flex flex-wrap items-center gap-x-8 gap-y-3 px-5 py-4 border-b" style={{ borderColor: line }}>
        <div>
          <div className="text-[10px] uppercase tracking-wide flex items-center gap-1" style={sub}><CheckCircle2 size={11} /> Attendance</div>
          <div className="text-xl font-bold tabular-nums mt-0.5" style={{ color: colors.semantic.success }}>{attPct == null ? '—' : `${attPct}%`}</div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wide flex items-center gap-1" style={sub}><CalendarClock size={11} /> Attended</div>
          <div className="text-xl font-bold tabular-nums mt-0.5" style={ink}>{d.attended} / {d.overall}</div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wide flex items-center gap-1" style={sub}><AlertTriangle size={11} /> Missed</div>
          <div className="text-xl font-bold tabular-nums mt-0.5" style={{ color: d.over_no_show_cap ? colors.semantic.error : colors.utility.primaryText }}>{d.missed}</div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wide flex items-center gap-1" style={sub}><UserCog size={11} /> Substituted</div>
          <div className="text-xl font-bold tabular-nums mt-0.5" style={{ color: d.over_substitute_cap ? colors.semantic.error : colors.utility.primaryText }}>{d.substituted}</div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wide flex items-center gap-1" style={sub}><Clock size={11} /> Last seen</div>
          <div className="text-xl font-bold tabular-nums mt-0.5" style={ink}>{d.last_seen ? fmtDate(d.last_seen) : '—'}</div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wide flex items-center gap-1" style={sub}><Wallet size={11} /> Dues</div>
          <div className="text-xl font-bold tabular-nums mt-0.5" style={{ color: d.dues_pending ? colors.semantic.warning : colors.semantic.success }}>{d.dues_pending ? 'Pending' : 'Clear'}</div>
        </div>
      </div>

      {/* Policy comparison — from THIS member's own signed contract, inline not a separate card */}
      {(d.max_no_shows != null || d.max_substitutes != null) && (
        <div className="flex items-center gap-3 flex-wrap px-5 py-3 border-b" style={{ borderColor: line }}>
          <span className="text-[11.5px] font-semibold" style={sub}>Attendance policy (this contract)</span>
          {d.max_no_shows != null && (
            <span className="text-[11px] font-bold rounded-full px-2.5 py-1" style={{ backgroundColor: (d.over_no_show_cap ? colors.semantic.error : colors.semantic.success) + '1e', color: d.over_no_show_cap ? colors.semantic.error : colors.semantic.success }}>
              No-shows: {d.missed} of {d.max_no_shows}
            </span>
          )}
          {d.max_substitutes != null && (
            <span className="text-[11px] font-bold rounded-full px-2.5 py-1" style={{ backgroundColor: (d.over_substitute_cap ? colors.semantic.error : colors.semantic.success) + '1e', color: d.over_substitute_cap ? colors.semantic.error : colors.semantic.success }}>
              Substitutes: {d.substituted} of {d.max_substitutes}
            </span>
          )}
        </div>
      )}

      {/* Attendance history */}
      <div className="px-5 py-4">
        <div className="text-[11px] font-semibold uppercase tracking-wide mb-3" style={sub}>Attendance history</div>
        <div className="flex flex-wrap gap-1.5">
          {(d.attendance ?? []).map((a, i) => (
            <div key={i} title={`${fmtDate(a.date)}${a.present && a.is_substitute ? ' · attended via substitute' : a.present ? ' · present' : a.is_past ? ' · absent' : ' · upcoming'}`}
              className="w-7 h-7 rounded-md grid place-items-center text-[11px] font-bold"
              style={a.present && a.is_substitute ? { backgroundColor: '#8B5CF61e', color: '#8B5CF6' } : a.present ? { backgroundColor: colors.semantic.success + '1e', color: colors.semantic.success } : a.is_past ? { backgroundColor: colors.semantic.warning + '1e', color: colors.semantic.warning } : { backgroundColor: colors.utility.primaryText + '0d', color: colors.utility.secondaryText }}>
              {a.present && a.is_substitute ? 'S' : a.present ? '✓' : a.is_past ? '✕' : '·'}
            </div>
          ))}
          {(d.attendance?.length ?? 0) === 0 && <span className="text-sm" style={sub}>No sessions yet.</span>}
        </div>
      </div>

      {/* Payments (BAU dues) */}
      <div className="px-5 pb-4">
        <div className="text-[11px] font-semibold uppercase tracking-wide mb-2" style={sub}>Payments</div>
        {(d.billing?.length ?? 0) === 0 ? (
          <div className="py-4 text-center text-sm" style={sub}>No billing schedule.</div>
        ) : (d.billing ?? []).map((b, i) => (
          <div key={i} className="flex items-center justify-between py-2 border-t" style={{ borderColor: line }}>
            <div><div className="text-[13px]" style={ink}>{b.label || fmtDate(b.date)}</div><div className="text-[11.5px]" style={sub}>{fmtDate(b.date)}</div></div>
            <span className="text-[11px] font-semibold rounded px-2 py-0.5" style={{ backgroundColor: (b.status === 'paid' ? colors.semantic.success : colors.semantic.warning) + '1e', color: b.status === 'paid' ? colors.semantic.success : colors.semantic.warning }}>
              {b.status === 'paid' ? `Paid ${b.currency || ''} ${b.amount ?? ''}` : `${b.currency || ''} ${b.amount ?? ''} · ${b.status || 'due'}`}
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
};

export default GroupSessionTab;
