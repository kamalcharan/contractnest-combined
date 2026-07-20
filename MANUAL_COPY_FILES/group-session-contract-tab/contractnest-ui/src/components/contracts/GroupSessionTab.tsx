// src/components/contracts/GroupSessionTab.tsx
// ============================================================================
// Contract detail → "Sessions" tab — a buyer's own attendance record within
// ONE Group Session block on THIS contract. This is the canonical home for
// the per-member view (moved here from the Group Sessions dashboard, which
// now shows a consolidated roster sheet instead of a per-member drill-down —
// see /operations/group-sessions). Same data (gs_member_block via
// useMemberBlock), same shared hook. Layout is a direct port of the original
// per-member screen (stat cards + a present/absent grid) — not redesigned,
// just relocated.
// ============================================================================

import React from 'react';
import { Users, CalendarClock, Clock, Wallet, AlertTriangle, UserCog, TrendingUp } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { useMemberBlock } from '@/hooks/queries/useGroupSessionsDashboard';

const fmtDate = (d?: string | null): string => {
  if (!d) return '—';
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return String(d);
  return dt.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
};
const initials = (n?: string | null) =>
  (n || '?').split(' ').map((x) => x[0]).slice(0, 2).join('').toUpperCase();

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
  const duesPending = d?.dues_pending ?? false;

  const Kpi = ({ icon, label, value, sub: s2, tone }: { icon: React.ReactNode; label: string; value: React.ReactNode; sub?: string; tone?: 'good' | 'warn' }) => (
    <Card style={cardStyle}>
      <CardContent className="p-4">
        <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide" style={sub}>{icon}{label}</div>
        <div className="text-2xl font-bold mt-1 tabular-nums" style={ink}>{value}</div>
        {s2 && <div className="text-[11px] mt-0.5" style={{ color: tone === 'good' ? colors.semantic.success : tone === 'warn' ? colors.semantic.warning : colors.utility.secondaryText }}>{s2}</div>}
      </CardContent>
    </Card>
  );
  const SectionHd = ({ icon, title, right }: { icon: React.ReactNode; title: string; right?: React.ReactNode }) => (
    <div className="flex items-center gap-2 px-4 py-3 border-b" style={{ borderColor: line }}>
      <span style={{ color: colors.brand.primary }}>{icon}</span>
      <span className="font-semibold text-[13.5px]" style={ink}>{title}</span>
      <span className="ml-auto text-[11.5px]" style={sub}>{right}</span>
    </div>
  );

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
    <>
      <div className="flex items-center gap-4 rounded-2xl border p-4 mb-4" style={cardStyle}>
        <div className="rounded-full grid place-items-center text-lg font-bold flex-none" style={{ width: 52, height: 52, backgroundColor: colors.brand.primary + '1e', color: colors.brand.primary }}>{initials(d.name)}</div>
        <div className="flex-1">
          <div className="text-lg font-bold" style={ink}>{d.name || 'Member'}</div>
          <div className="text-[12.5px] flex items-center gap-1" style={sub}><Users size={12} /> {blockName || 'Group Session'}</div>
        </div>
        <span className="text-[12px] font-semibold rounded-full px-3 py-1.5" style={{ backgroundColor: (duesPending ? colors.semantic.warning : colors.semantic.success) + '1e', color: duesPending ? colors.semantic.warning : colors.semantic.success }}>{duesPending ? 'Dues due' : 'Dues clear'}</span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-3">
        <Kpi icon={<TrendingUp size={12} />} label="Attendance" value={attPct == null ? '—' : `${attPct}%`} sub="of eligible" tone="good" />
        <Kpi icon={<CalendarClock size={12} />} label="Attended" value={`${d.attended} / ${d.overall}`} sub="sessions" />
        <Kpi icon={<Clock size={12} />} label="Last seen" value={d.last_seen ? fmtDate(d.last_seen) : '—'} />
        <Kpi icon={<AlertTriangle size={12} />} label="Missed" value={d.missed} sub="sessions" tone={d.over_no_show_cap ? 'warn' : undefined} />
        <Kpi icon={<UserCog size={12} />} label="Substituted" value={d.substituted} sub="sessions" tone={d.over_substitute_cap ? 'warn' : undefined} />
        <Kpi icon={<Wallet size={12} />} label="Dues" value={duesPending ? 'Pending' : 'Clear'} tone={duesPending ? 'warn' : 'good'} />
      </div>

      {(d.max_no_shows != null || d.max_substitutes != null) && (
        <div className="flex items-center gap-3 flex-wrap mb-5 px-4 py-3 rounded-xl border" style={cardStyle}>
          <span className="text-[11.5px] font-semibold" style={sub}>Attendance policy (from this member&apos;s contract)</span>
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

      <Card style={cardStyle} className="mb-4">
        <SectionHd icon={<CalendarClock size={15} />} title="Attendance history" />
        <div className="flex flex-wrap gap-1.5 p-4">
          {(d.attendance ?? []).map((a, i) => (
            <div key={i} title={`${fmtDate(a.date)}${a.present && a.is_substitute ? ' · attended via substitute' : a.present ? ' · present' : a.is_past ? ' · absent' : ' · upcoming'}`}
              className="w-7 h-7 rounded-md grid place-items-center text-[11px] font-bold"
              style={a.present && a.is_substitute ? { backgroundColor: '#8B5CF61e', color: '#8B5CF6' } : a.present ? { backgroundColor: colors.semantic.success + '1e', color: colors.semantic.success } : a.is_past ? { backgroundColor: colors.semantic.warning + '1e', color: colors.semantic.warning } : { backgroundColor: colors.utility.primaryText + '0d', color: colors.utility.secondaryText }}>
              {a.present && a.is_substitute ? 'S' : a.present ? '✓' : a.is_past ? '✕' : '·'}
            </div>
          ))}
          {(d.attendance?.length ?? 0) === 0 && <span className="text-sm" style={sub}>No sessions yet.</span>}
        </div>
      </Card>
    </>
  );
};

export default GroupSessionTab;
