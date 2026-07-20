// ============================================================================
// Operations → Group Sessions — chair dashboard (reference-matching drill-down)
// ============================================================================
// A "group session" = a catalog block (config.audience='group'). Each block is
// the group; drill-down mirrors the agreed reference mock:
//   Overview (block cards) → Group (KPIs · sessions · roster · series · QR)
//     → Occurrence (attendance marking · QR) → Member (profile · history · dues)
// Shared schedule per block (not per member). Data via /api/group-sessions/*.
// ============================================================================

import React, { useMemo, useState } from 'react';
import {
  Users, RefreshCw, AlertTriangle, Inbox, ChevronRight, CalendarClock, QrCode,
  CheckCircle2, Clock, CircleDollarSign, UserRound, ArrowLeft, TrendingUp, Wallet,
  Repeat, Pencil, Ban, X, Check, CalendarPlus, Plus, RotateCcw, Mic, UserCog,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { useTheme } from '@/contexts/ThemeContext';
import ContactPicker from '@/components/common/ContactPicker';
import { useContact } from '@/hooks/useContacts';
import {
  useGroupSessions,
  useGroupSessionOccurrences,
  useGroupSessionRoster,
  useGenerateSchedule,
  useMoveOccurrence,
  useSetOccurrenceStatus,
  useAddOccurrence,
  useOccurrenceAttendance,
  useMarkAttendance,
  useMemberBlock,
  usePendingDeclarations,
  useConfirmDeclaration,
  useAssignChair,
  useAssignChairDefault,
  type GsSessionRow,
  type GsRosterRow,
  type GsOccurrenceRow,
} from '@/hooks/queries/useGroupSessionsDashboard';
import QRCard from '@/components/group-sessions/QRCard';

const CHAIR_CLASSIFICATIONS = ['buyer', 'vendor', 'partner', 'team_member'];

type ViewLevel = 'overview' | 'group' | 'occurrence' | 'member';

const fmtDate = (d?: string | null): string => {
  if (!d) return '—';
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return String(d);
  return dt.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
};
const fmtShort = (d?: string | null): string => {
  if (!d) return '—';
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return String(d);
  return dt.toLocaleDateString(undefined, { day: '2-digit', month: 'short' });
};
const toInputDate = (d?: string | null): string => {
  if (!d) return '';
  const dt = new Date(d);
  return isNaN(dt.getTime()) ? '' : dt.toISOString().slice(0, 10);
};
const initials = (n?: string | null) =>
  (n || '?').split(' ').map((x) => x[0]).slice(0, 2).join('').toUpperCase();
const WEEKDAYS = ['Sundays', 'Mondays', 'Tuesdays', 'Wednesdays', 'Thursdays', 'Fridays', 'Saturdays'];

const GroupSessionsPage: React.FC = () => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  const [view, setView] = useState<ViewLevel>('overview');
  const [selectedSession, setSelectedSession] = useState<GsSessionRow | null>(null);
  const [selectedOcc, setSelectedOcc] = useState<GsOccurrenceRow | null>(null);
  const [selectedMember, setSelectedMember] = useState<GsRosterRow | null>(null);

  const sessionsQuery = useGroupSessions();
  const occurrencesQuery = useGroupSessionOccurrences(selectedSession?.block_id, { enabled: view === 'group' });
  const rosterQuery = useGroupSessionRoster(selectedSession?.block_id, { enabled: view === 'group' });
  const occAttQuery = useOccurrenceAttendance(selectedOcc?.event_id, { enabled: view === 'occurrence' });
  const memberQuery = useMemberBlock(selectedMember?.contact_id, selectedSession?.block_id, { enabled: view === 'member' });
  const declarationsQuery = usePendingDeclarations({ enabled: view === 'overview' });

  const generateSchedule = useGenerateSchedule();
  const moveOccurrence = useMoveOccurrence();
  const setOccurrenceStatus = useSetOccurrenceStatus();
  const addOccurrence = useAddOccurrence();
  const markAttendance = useMarkAttendance();
  const confirmDeclaration = useConfirmDeclaration();
  const assignChair = useAssignChair();
  const assignChairDefault = useAssignChairDefault();
  const scheduleBusy = generateSchedule.isPending || moveOccurrence.isPending || setOccurrenceStatus.isPending || addOccurrence.isPending;

  const [editOccId, setEditOccId] = useState<string | null>(null);
  const [editDate, setEditDate] = useState('');
  const [addDate, setAddDate] = useState('');
  const [showAdd, setShowAdd] = useState(false);

  const sessions = sessionsQuery.data?.sessions ?? [];
  const occurrences = occurrencesQuery.data ?? [];
  const roster = rosterQuery.data ?? [];

  const cadence = useMemo(() => {
    if (occurrences.length < 1) return 'Recurring';
    const first = new Date(occurrences[0].date);
    const wd = isNaN(first.getTime()) ? '' : WEEKDAYS[first.getDay()];
    if (occurrences.length >= 2) {
      const a = new Date(occurrences[0].date).getTime();
      const b = new Date(occurrences[1].date).getTime();
      const days = Math.round(Math.abs(b - a) / 86400000);
      return `Every ${days} days${wd ? ` · ${wd}` : ''}`;
    }
    return wd ? `Weekly · ${wd}` : 'Recurring';
  }, [occurrences]);

  // Derived from the occurrences already fetched — not a separately stored
  // field. Reflects reality even after a refresh: whoever chairs the
  // nearest upcoming (non-past, non-cancelled) occurrence is shown as the
  // series' current default; count = how many future occurrences share it.
  const seriesChair = useMemo(() => {
    const upcoming = occurrences.filter((o) => !o.is_past && o.status !== 'cancelled');
    const next = upcoming.find((o) => o.assigned_to_name);
    if (!next) return null;
    const matching = upcoming.filter((o) => o.assigned_to_name === next.assigned_to_name).length;
    return { name: next.assigned_to_name as string, count: matching, total: upcoming.length };
  }, [occurrences]);

  const overview = useMemo(() => {
    const totalSessions = sessions.length;
    const members = sessionsQuery.data?.roster_size ?? 0;
    const withPct = sessions.filter((s) => s.attendance_pct != null);
    const avg = withPct.length ? Math.round(withPct.reduce((a, s) => a + (s.attendance_pct || 0), 0) / withPct.length) : null;
    const nexts = sessions.map((s) => s.next_occurrence).filter(Boolean).sort() as string[];
    return { totalSessions, members, avg, next: nexts[0] || null };
  }, [sessions, sessionsQuery.data]);

  const openGroup = (s: GsSessionRow) => { setSelectedSession(s); setView('group'); setShowAdd(false); setEditOccId(null); };
  const openOccurrence = (o: GsOccurrenceRow) => { setSelectedOcc(o); setEditOccId(null); setView('occurrence'); };
  const openMember = (m: GsRosterRow) => { if (m.membership_contract_id) { setSelectedMember(m); setView('member'); } };

  const cardStyle: React.CSSProperties = { backgroundColor: colors.utility.secondaryBackground, borderColor: colors.utility.primaryText + '14' };
  const sub = { color: colors.utility.secondaryText };
  const ink = { color: colors.utility.primaryText };
  const line = colors.utility.primaryText + '12';
  const money = (n?: number | null, c?: string | null) => (n == null ? '—' : `${!c || c === 'INR' ? '₹' : c + ' '}${Number(n).toLocaleString()}`);
  const pctColor = (p?: number | null) => (p == null ? colors.utility.secondaryText : p >= 75 ? colors.semantic.success : p >= 40 ? colors.semantic.warning : colors.semantic.error);

  const Kpi = ({ icon, label, value, sub: s2, tone }: { icon: React.ReactNode; label: string; value: React.ReactNode; sub?: string; tone?: 'good' | 'warn' }) => (
    <Card style={cardStyle}>
      <CardContent className="p-4">
        <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide" style={sub}>{icon}{label}</div>
        <div className="text-2xl font-bold mt-1 tabular-nums" style={ink}>{value}</div>
        {s2 && <div className="text-[11px] mt-0.5" style={{ color: tone === 'good' ? colors.semantic.success : tone === 'warn' ? colors.semantic.warning : colors.utility.secondaryText }}>{s2}</div>}
      </CardContent>
    </Card>
  );
  const Crumb = ({ items }: { items: { label: string; onClick?: () => void }[] }) => (
    <div className="flex items-center gap-1.5 text-[12.5px] flex-wrap mb-2">
      {items.map((it, i) => (
        <React.Fragment key={i}>
          {i > 0 && <ChevronRight size={13} style={sub} />}
          {it.onClick ? (
            <button onClick={it.onClick} style={{ color: colors.brand.primary }} className="font-semibold">{it.label}</button>
          ) : (
            <span style={sub}>{it.label}</span>
          )}
        </React.Fragment>
      ))}
    </div>
  );
  const SectionHd = ({ icon, title, right }: { icon: React.ReactNode; title: string; right?: React.ReactNode }) => (
    <div className="flex items-center gap-2 px-4 py-3 border-b" style={{ borderColor: line }}>
      <span style={{ color: colors.brand.primary }}>{icon}</span>
      <span className="font-semibold text-[13.5px]" style={ink}>{title}</span>
      <span className="ml-auto text-[11.5px]" style={sub}>{right}</span>
    </div>
  );
  // ── Chair assignment (single occurrence, or default for the whole series) ──
  // Picking a contact only yields an id (ContactPicker), so we resolve its
  // display name via useContact before firing the mutation — same lookup
  // ContactPicker itself uses for its trigger label.
  const AssignChairControl = ({
    currentName,
    onAssign,
    onRemove,
    busy,
    buttonLabel = 'Assign chair',
    changeLabel = 'Change',
  }: {
    currentName?: string | null;
    onAssign: (contactId: string, contactName: string) => void;
    onRemove?: () => void;
    busy?: boolean;
    buttonLabel?: string;
    changeLabel?: string;
  }) => {
    const [editing, setEditing] = useState(false);
    const [pickedId, setPickedId] = useState<string | undefined>(undefined);
    const { data: pickedContact } = useContact(pickedId || '');

    const confirm = () => {
      if (!pickedId || !pickedContact) return;
      const name = pickedContact.company_name || pickedContact.name || pickedContact.displayName || 'Unnamed';
      onAssign(pickedId, name);
      setEditing(false);
      setPickedId(undefined);
    };

    if (editing) {
      return (
        <div className="flex items-center gap-2 flex-wrap">
          <div className="min-w-[220px]">
            <ContactPicker value={pickedId} onChange={setPickedId} classifications={CHAIR_CLASSIFICATIONS} placeholder="Search clients, vendors, partners, team…" />
          </div>
          <button disabled={!pickedId || busy} onClick={confirm} className="p-2 rounded-md" style={{ backgroundColor: colors.brand.primary, color: '#fff' }}><Check size={14} /></button>
          <button onClick={() => { setEditing(false); setPickedId(undefined); }} className="p-2 rounded-md" style={sub}><X size={14} /></button>
        </div>
      );
    }

    if (currentName) {
      return (
        <span className="inline-flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold rounded-full px-2.5 py-1" style={{ backgroundColor: colors.brand.primary + '15', color: colors.brand.primary }}>
            <Mic size={12} /> Chaired by {currentName}
          </span>
          <button onClick={() => setEditing(true)} disabled={busy} className="text-[12px] font-medium" style={{ color: colors.brand.primary }}>{changeLabel}</button>
          {onRemove && <button onClick={onRemove} disabled={busy} className="text-[12px] font-medium" style={{ color: colors.semantic.error }}>Remove</button>}
        </span>
      );
    }

    return (
      <button onClick={() => setEditing(true)} disabled={busy} className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold px-2.5 py-1.5 rounded-md border" style={{ color: colors.brand.primary, borderColor: colors.brand.primary + '40' }}>
        <UserCog size={13} /> {buttonLabel}
      </button>
    );
  };

  const StatusPill = ({ o, rosterSize }: { o: GsOccurrenceRow; rosterSize: number }) => {
    let bg = colors.brand.primary, txt = 'Scheduled';
    if (o.status === 'cancelled') { bg = colors.semantic.error; txt = 'Cancelled'; }
    else if (o.status === 'skipped') { bg = colors.semantic.warning; txt = 'Skipped'; }
    else if (o.status === 'held' || o.is_past) { bg = colors.semantic.success; txt = `${o.present}/${rosterSize} present`; }
    return <span className="text-[10.5px] font-bold rounded-full px-2 py-1" style={{ backgroundColor: bg + '1e', color: bg }}>{txt}</span>;
  };

  if (view === 'overview' && sessionsQuery.isLoading && !sessionsQuery.data) {
    return <div className="p-6 flex flex-col items-center justify-center min-h-[60vh] gap-3"><LoadingSpinner size="lg" /><span style={sub}>Loading group sessions…</span></div>;
  }
  if (view === 'overview' && sessionsQuery.isError) {
    return (
      <div className="p-6"><Card style={cardStyle}><CardContent className="flex flex-col items-center gap-3 py-12">
        <AlertTriangle size={30} style={{ color: colors.semantic.error }} /><span style={ink}>Could not load group sessions.</span>
        <button onClick={() => sessionsQuery.refetch()} className="px-4 py-2 rounded-md text-sm font-medium" style={{ backgroundColor: colors.brand.primary, color: '#fff' }}>Try again</button>
      </CardContent></Card></div>
    );
  }

  const PaymentsToConfirm = () => {
    const rows = declarationsQuery.data ?? [];
    if (rows.length === 0) return null;
    return (
      <Card style={cardStyle} className="mt-3">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <CircleDollarSign size={16} style={{ color: colors.brand.primary }} />
            <span className="font-semibold" style={ink}>Payments to confirm</span>
            <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: colors.semantic.warning + '1e', color: colors.semantic.warning }}>{rows.length} pending</span>
          </div>
          {rows.map((d) => (
            <div key={d.id} className="flex items-center justify-between gap-3 py-2.5 border-t" style={{ borderColor: line }}>
              <div><div style={ink}>{d.member_name || '—'}</div><div className="text-xs" style={sub}>{d.label || 'Due'} · {money(d.amount, d.currency)}{d.upi_reference ? ` · UPI ${d.upi_reference}` : ''}</div></div>
              <div className="flex items-center gap-2 flex-none">
                <button disabled={confirmDeclaration.isPending} onClick={() => confirmDeclaration.mutate({ id: d.id, confirm: true })} className="px-3 py-1.5 rounded-md text-sm font-medium inline-flex items-center gap-1" style={{ backgroundColor: colors.semantic.success, color: '#fff' }}><Check size={14} /> Confirm</button>
                <button disabled={confirmDeclaration.isPending} onClick={() => confirmDeclaration.mutate({ id: d.id, confirm: false })} className="px-3 py-1.5 rounded-md text-sm font-medium border" style={{ ...sub, borderColor: colors.utility.primaryText + '22' }}>Reject</button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  };

  const renderOverview = () => (
    <>
      <h1 className="text-xl font-semibold" style={ink}>Group Sessions</h1>
      <p className="text-sm mt-1 mb-4" style={sub}>Every group you run — its recurring sessions, attendance and dues. Drill into any of it.</p>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi icon={<Users size={12} />} label="Group sessions" value={overview.totalSessions} sub="active" />
        <Kpi icon={<UserRound size={12} />} label="Members" value={overview.members} sub="total" />
        <Kpi icon={<CalendarClock size={12} />} label="Next session" value={overview.next ? fmtShort(overview.next) : '—'} />
        <Kpi icon={<TrendingUp size={12} />} label="Avg attendance" value={overview.avg == null ? '—' : `${overview.avg}%`} tone="good" />
      </div>

      <PaymentsToConfirm />

      {sessions.length === 0 ? (
        <Card style={cardStyle} className="mt-4"><CardContent className="flex flex-col items-center gap-3 py-12">
          <Inbox size={30} style={sub} /><span style={ink}>No group sessions yet.</span>
          <span className="text-sm text-center max-w-md" style={sub}>A group session appears once a group-session block is assigned (via a template) to at least one active contract.</span>
        </CardContent></Card>
      ) : (
        <>
          <div className="text-[13.5px] font-semibold mt-6 mb-3 flex items-center gap-2" style={ink}><Users size={15} /> Groups <span className="text-xs font-normal" style={sub}>{sessions.length}</span></div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
            {sessions.map((s) => (
              <button key={s.block_id} onClick={() => openGroup(s)} className="text-left rounded-2xl border p-4 transition-shadow hover:shadow-md" style={cardStyle}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 rounded-xl grid place-items-center flex-none" style={{ backgroundColor: colors.brand.primary + '1e', color: colors.brand.primary }}><Users size={18} /></div>
                  <div><div className="font-semibold" style={ink}>{s.name}</div><div className="text-xs" style={sub}>{s.occurrences_total} sessions</div></div>
                </div>
                <div className="flex gap-5 mb-3">
                  <div><div className="text-lg font-bold tabular-nums" style={ink}>{s.roster_size}</div><div className="text-[10px] uppercase tracking-wide" style={sub}>Members</div></div>
                  <div><div className="text-lg font-bold tabular-nums" style={{ color: pctColor(s.attendance_pct) }}>{s.attendance_pct == null ? '—' : `${s.attendance_pct}%`}</div><div className="text-[10px] uppercase tracking-wide" style={sub}>Attendance</div></div>
                  <div><div className="text-lg font-bold tabular-nums" style={ink}>{s.occurrences_done}/{s.occurrences_total}</div><div className="text-[10px] uppercase tracking-wide" style={sub}>Held</div></div>
                </div>
                <div className="flex items-center gap-1.5 text-xs pt-2.5 border-t" style={{ ...sub, borderColor: line }}>
                  <CalendarClock size={13} /> Next <b style={ink}>{s.next_occurrence ? fmtShort(s.next_occurrence) : '—'}</b>
                  <span className="ml-auto text-[10px] font-bold rounded-full px-2 py-0.5" style={{ backgroundColor: (s.qr_ready ? colors.semantic.success : colors.semantic.warning) + '1e', color: s.qr_ready ? colors.semantic.success : colors.semantic.warning }}>{s.qr_ready ? 'QR ready' : 'QR needed'}</span>
                </div>
              </button>
            ))}
          </div>
        </>
      )}
    </>
  );

  const renderGroup = () => {
    const s = selectedSession!;
    const duesDue = roster.filter((m) => m.dues_pending).length;
    return (
      <>
        <Crumb items={[{ label: 'Group Sessions', onClick: () => setView('overview') }, { label: s.name }]} />
        <h1 className="text-xl font-semibold" style={ink}>{s.name}</h1>
        <p className="text-sm mt-1 mb-4" style={sub}>{s.roster_size} members · {cadence} · shared schedule (not per member).</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
          <Kpi icon={<UserRound size={12} />} label="Members" value={s.roster_size} sub="enrolled" />
          <Kpi icon={<TrendingUp size={12} />} label="Attendance" value={s.attendance_pct == null ? '—' : `${s.attendance_pct}%`} sub="avg" tone="good" />
          <Kpi icon={<CalendarClock size={12} />} label="Next" value={s.next_occurrence ? fmtShort(s.next_occurrence) : '—'} sub={cadence} />
          <Kpi icon={<Wallet size={12} />} label="Dues due" value={duesDue} sub="members" tone={duesDue > 0 ? 'warn' : undefined} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-5 items-start">
          <div>
            <Card style={cardStyle} className="mb-4">
              <SectionHd icon={<CalendarClock size={15} />} title="Upcoming & past sessions" right={
                <span className="inline-flex items-center gap-2">
                  {showAdd ? (
                    <>
                      <input type="date" value={addDate} onChange={(e) => setAddDate(e.target.value)} className="px-2 py-1 rounded-md text-xs border" style={{ ...ink, borderColor: colors.utility.primaryText + '33', backgroundColor: colors.utility.primaryBackground }} />
                      <button disabled={!addDate || scheduleBusy} onClick={() => { addOccurrence.mutate({ blockId: s.block_id, date: addDate }); setShowAdd(false); setAddDate(''); }} className="p-1 rounded" style={{ backgroundColor: colors.brand.primary, color: '#fff' }}><Check size={13} /></button>
                      <button onClick={() => { setShowAdd(false); setAddDate(''); }} className="p-1 rounded" style={sub}><X size={13} /></button>
                    </>
                  ) : (
                    <button onClick={() => setShowAdd(true)} className="inline-flex items-center gap-1 font-medium" style={{ color: colors.brand.primary }}><Plus size={13} /> Add</button>
                  )}
                </span>
              } />
              {occurrencesQuery.isLoading ? (
                <div className="py-10 flex justify-center"><LoadingSpinner size="md" /></div>
              ) : occurrences.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-10">
                  <CalendarClock size={26} style={sub} /><span className="text-sm" style={sub}>No schedule yet.</span>
                  <button disabled={scheduleBusy} onClick={() => generateSchedule.mutate({ blockId: s.block_id })} className="px-4 py-2 rounded-md text-sm font-medium inline-flex items-center gap-2" style={{ backgroundColor: colors.brand.primary, color: '#fff' }}><CalendarPlus size={15} /> {generateSchedule.isPending ? 'Generating…' : 'Generate schedule'}</button>
                </div>
              ) : occurrences.map((o) => (
                <div key={o.event_id} className="flex items-center gap-3 px-4 py-2.5 border-b cursor-pointer hover:bg-black/5" style={{ borderColor: line }} onClick={() => openOccurrence(o)}>
                  <div className="w-14 flex-none"><div className="font-bold text-[13.5px] tabular-nums" style={ink}>{fmtShort(o.date)}</div><div className="text-[10px]" style={sub}>#{o.seq ?? '—'}</div></div>
                  <div className="flex-1 min-w-0"><div className="text-[13px] font-semibold" style={ink}>{s.name}</div><div className="text-[11.5px]" style={sub}>{cadence}{o.note ? ` · ${o.note}` : ''}</div></div>
                  <StatusPill o={o} rosterSize={s.roster_size} />
                  <ChevronRight size={15} style={sub} className="flex-none" />
                </div>
              ))}
            </Card>

            <Card style={cardStyle}>
              <SectionHd icon={<Users size={15} />} title="Roster" right={`${roster.length} members`} />
              {rosterQuery.isLoading ? (
                <div className="py-10 flex justify-center"><LoadingSpinner size="md" /></div>
              ) : roster.length === 0 ? (
                <div className="py-10 text-center text-sm" style={sub}>No members yet.</div>
              ) : roster.map((m) => (
                <div key={m.contact_id} className="flex items-center gap-3 px-4 py-2.5 border-b cursor-pointer hover:bg-black/5" style={{ borderColor: line }} onClick={() => openMember(m)}>
                  <div className="w-7 h-7 rounded-full grid place-items-center text-[11px] font-bold flex-none" style={{ backgroundColor: colors.brand.primary + '1e', color: colors.brand.primary }}>{initials(m.name)}</div>
                  <div className="flex-1 min-w-0"><div className="text-[13px] font-semibold truncate" style={ink}>{m.name || '—'}</div><div className="text-[11px] truncate" style={sub}>{m.contract_name || ''}</div></div>
                  <span className="text-[9.5px] font-bold rounded px-1.5 py-0.5" style={{ backgroundColor: (m.dues_pending ? colors.semantic.warning : colors.semantic.success) + '1e', color: m.dues_pending ? colors.semantic.warning : colors.semantic.success }}>{m.dues_pending ? 'Due' : 'Paid'}</span>
                  <span className="text-[11.5px] tabular-nums" style={sub}>{m.attended}/{s.occurrences_done}</span>
                  <ChevronRight size={15} style={sub} className="flex-none" />
                </div>
              ))}
            </Card>
          </div>

          <div>
            <Card style={cardStyle} className="mb-4">
              <SectionHd icon={<Repeat size={15} />} title="Session series" />
              <div className="flex items-center gap-3 px-4 py-3">
                <div className="w-8 h-8 rounded-lg grid place-items-center flex-none" style={{ backgroundColor: colors.brand.primary + '1e', color: colors.brand.primary }}><Repeat size={16} /></div>
                <div className="flex-1"><div className="text-[13px] font-semibold" style={ink}>{s.name}</div><div className="text-[11.5px]" style={sub}>{cadence}</div></div>
                <span className="text-[10.5px] font-bold rounded-full px-2 py-1" style={{ backgroundColor: (s.qr_ready ? colors.semantic.success : colors.semantic.warning) + '1e', color: s.qr_ready ? colors.semantic.success : colors.semantic.warning }}>{s.qr_ready ? 'QR ready' : 'No QR'}</span>
              </div>
              <div className="px-4 pb-3.5 pt-1 border-t" style={{ borderColor: line }}>
                <div className="text-[11px] mb-2" style={sub}>
                  {occurrencesQuery.isLoading
                    ? 'Loading…'
                    : seriesChair
                      ? `Default chair — applied to ${seriesChair.count} of ${seriesChair.total} upcoming sessions.`
                      : 'Default chair — applies to every upcoming session; override any single date from that session.'}
                </div>
                <AssignChairControl
                  currentName={seriesChair?.name}
                  busy={assignChairDefault.isPending}
                  buttonLabel="Assign default chair"
                  changeLabel="Change default"
                  onAssign={(id, name) => assignChairDefault.mutate({ blockId: s.block_id, contactId: id, contactName: name })}
                />
              </div>
            </Card>
            <QRCard blockId={s.block_id} title={s.name} />
          </div>
        </div>
      </>
    );
  };

  const renderOccurrence = () => {
    const o = selectedOcc!;
    const s = selectedSession!;
    const data = occAttQuery.data;
    const att = data?.roster ?? [];
    const canEdit = editOccId === o.event_id;
    return (
      <>
        <Crumb items={[{ label: 'Group Sessions', onClick: () => setView('overview') }, { label: s.name, onClick: () => setView('group') }, { label: fmtShort(o.date) }]} />
        <div className="flex items-center gap-3 flex-wrap">
          <button onClick={() => setView('group')} className="inline-flex items-center gap-1 text-sm" style={sub}><ArrowLeft size={15} /> Back</button>
          <h1 className="text-lg font-semibold" style={ink}>{s.name}</h1>
        </div>
        <p className="text-sm mt-1 mb-4" style={sub}>{fmtDate(o.date)} · one session occurrence · {data?.present_count ?? 0} present</p>

        <div className="flex items-center gap-2 mb-4 flex-wrap">
          {canEdit ? (
            <span className="inline-flex items-center gap-2">
              <input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} className="px-2 py-1 rounded-md text-sm border" style={{ ...ink, borderColor: colors.utility.primaryText + '33', backgroundColor: colors.utility.primaryBackground }} />
              <button disabled={!editDate || scheduleBusy} onClick={() => { moveOccurrence.mutate({ id: o.event_id, date: editDate, note: 'Rescheduled' }); setEditOccId(null); setSelectedOcc({ ...o, date: editDate }); }} className="px-2 py-1.5 rounded-md text-sm" style={{ backgroundColor: colors.brand.primary, color: '#fff' }}><Check size={14} /></button>
              <button onClick={() => setEditOccId(null)} className="px-2 py-1.5 rounded-md text-sm" style={sub}><X size={14} /></button>
            </span>
          ) : (
            <>
              <button onClick={() => { setEditOccId(o.event_id); setEditDate(toInputDate(o.date)); }} className="px-3 py-1.5 rounded-md text-sm font-medium border inline-flex items-center gap-1" style={{ ...ink, borderColor: colors.utility.primaryText + '22' }}><Pencil size={14} /> Move date</button>
              {o.status === 'skipped' || o.status === 'cancelled' ? (
                <button disabled={scheduleBusy} onClick={() => setOccurrenceStatus.mutate({ id: o.event_id, status: 'scheduled' })} className="px-3 py-1.5 rounded-md text-sm font-medium border inline-flex items-center gap-1" style={{ color: colors.semantic.success, borderColor: colors.utility.primaryText + '22' }}><RotateCcw size={14} /> Restore</button>
              ) : (
                <button disabled={scheduleBusy} onClick={() => setOccurrenceStatus.mutate({ id: o.event_id, status: 'skipped', note: 'Skipped' })} className="px-3 py-1.5 rounded-md text-sm font-medium border inline-flex items-center gap-1" style={{ color: colors.semantic.warning, borderColor: colors.utility.primaryText + '22' }}><Ban size={14} /> Skip</button>
              )}
            </>
          )}
          <span className="w-px h-5" style={{ backgroundColor: line }} />
          <AssignChairControl
            currentName={o.assigned_to_name}
            busy={assignChair.isPending}
            buttonLabel="Assign chair"
            changeLabel="Change"
            onAssign={(id, name) => { assignChair.mutate({ id: o.event_id, contactId: id, contactName: name }); setSelectedOcc({ ...o, assigned_to: id, assigned_to_name: name }); }}
            onRemove={() => { assignChair.mutate({ id: o.event_id, contactId: undefined, contactName: undefined }); setSelectedOcc({ ...o, assigned_to: null, assigned_to_name: null }); }}
          />
        </div>

        {o.assigned_to_name && (
          <Card style={cardStyle} className="mb-4">
            <div className="flex items-center gap-3 px-4 py-3">
              <div className="w-9 h-9 rounded-lg grid place-items-center flex-none" style={{ backgroundColor: colors.semantic.success + '18', color: colors.semantic.success }}><CalendarClock size={17} /></div>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-semibold" style={ink}>Appointment · {o.assigned_to_name}</div>
                <div className="text-[11.5px]" style={sub}>{fmtDate(o.date)} · chairs this session</div>
              </div>
              <span className="text-[10.5px] font-bold rounded-full px-2.5 py-1" style={{ backgroundColor: colors.semantic.success + '1e', color: colors.semantic.success }}>Accepted</span>
            </div>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-5 items-start">
          <Card style={cardStyle}>
            <SectionHd icon={<Users size={15} />} title="Attendance" right={`${data?.present_count ?? 0} present`} />
            {occAttQuery.isLoading ? (
              <div className="py-10 flex justify-center"><LoadingSpinner size="md" /></div>
            ) : att.length === 0 ? (
              <div className="py-10 text-center text-sm" style={sub}>No members on this roster.</div>
            ) : att.map((m) => (
              <div key={m.contact_id} className="flex items-center gap-3 px-4 py-2.5 border-b" style={{ borderColor: line }}>
                <div className="w-7 h-7 rounded-full grid place-items-center text-[11px] font-bold flex-none" style={{ backgroundColor: colors.brand.primary + '1e', color: colors.brand.primary }}>{initials(m.name)}</div>
                <div className="flex-1 min-w-0"><div className="text-[13px] font-semibold truncate" style={ink}>{m.name || '—'}</div></div>
                <span className="text-[9.5px] font-bold rounded px-1.5 py-0.5" style={{ backgroundColor: (m.dues_pending ? colors.semantic.warning : colors.semantic.success) + '1e', color: m.dues_pending ? colors.semantic.warning : colors.semantic.success }}>{m.dues_pending ? 'Due' : 'Paid'}</span>
                <button
                  disabled={markAttendance.isPending}
                  onClick={() => markAttendance.mutate({ occurrenceId: o.event_id, memberId: m.contact_id, present: !m.present, memberName: m.name || undefined })}
                  className="px-3 py-1.5 rounded-md text-xs font-semibold border inline-flex items-center gap-1"
                  style={m.present ? { backgroundColor: colors.semantic.success + '1e', color: colors.semantic.success, borderColor: colors.semantic.success + '55' } : { ...sub, borderColor: colors.utility.primaryText + '22' }}
                >
                  {m.present ? <><CheckCircle2 size={13} /> Present</> : 'Mark'}
                </button>
              </div>
            ))}
          </Card>
        </div>
      </>
    );
  };

  const renderMember = () => {
    const s = selectedSession!;
    const m = selectedMember!;
    const d = memberQuery.data;
    const attPct = d && d.occurrences_done > 0 ? Math.round((d.attended / d.occurrences_done) * 100) : null;
    const duesPending = d?.dues_pending ?? m.dues_pending;
    return (
      <>
        <Crumb items={[{ label: 'Group Sessions', onClick: () => setView('overview') }, { label: s.name, onClick: () => setView('group') }, { label: m.name || 'Member' }]} />
        <div className="flex items-center gap-4 rounded-2xl border p-4 mb-4" style={cardStyle}>
          <div className="rounded-full grid place-items-center text-lg font-bold flex-none" style={{ width: 52, height: 52, backgroundColor: colors.brand.primary + '1e', color: colors.brand.primary }}>{initials(m.name)}</div>
          <div className="flex-1"><div className="text-lg font-bold" style={ink}>{m.name || 'Member'}</div><div className="text-[12.5px]" style={sub}>{s.name}{m.contract_name ? ` · ${m.contract_name}` : ''}</div></div>
          <span className="text-[12px] font-semibold rounded-full px-3 py-1.5" style={{ backgroundColor: (duesPending ? colors.semantic.warning : colors.semantic.success) + '1e', color: duesPending ? colors.semantic.warning : colors.semantic.success }}>{duesPending ? 'Dues due' : 'Dues clear'}</span>
        </div>

        {memberQuery.isLoading ? (
          <div className="py-10 flex justify-center"><LoadingSpinner size="md" /></div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
              <Kpi icon={<TrendingUp size={12} />} label="Attendance" value={attPct == null ? '—' : `${attPct}%`} sub="of held" tone="good" />
              <Kpi icon={<CalendarClock size={12} />} label="Attended" value={`${d?.attended ?? 0} / ${d?.occurrences_done ?? 0}`} sub="sessions" />
              <Kpi icon={<Wallet size={12} />} label="Dues" value={duesPending ? 'Pending' : 'Clear'} tone={duesPending ? 'warn' : 'good'} />
              <Kpi icon={<Clock size={12} />} label="Last seen" value={d?.last_seen ? fmtShort(d.last_seen) : '—'} />
            </div>

            <Card style={cardStyle} className="mb-4">
              <SectionHd icon={<CalendarClock size={15} />} title="Attendance history" />
              <div className="flex flex-wrap gap-1.5 p-4">
                {(d?.attendance ?? []).map((a, i) => (
                  <div key={i} title={`${fmtDate(a.date)}${a.present ? ' · present' : a.is_past ? ' · absent' : ' · upcoming'}`}
                    className="w-7 h-7 rounded-md grid place-items-center text-[11px] font-bold"
                    style={a.present ? { backgroundColor: colors.semantic.success + '1e', color: colors.semantic.success } : a.is_past ? { backgroundColor: colors.semantic.warning + '1e', color: colors.semantic.warning } : { backgroundColor: colors.utility.primaryText + '0d', color: colors.utility.secondaryText }}>
                    {a.present ? '✓' : a.is_past ? '✕' : '·'}
                  </div>
                ))}
                {(d?.attendance?.length ?? 0) === 0 && <span className="text-sm" style={sub}>No sessions yet.</span>}
              </div>
            </Card>

            <Card style={cardStyle}>
              <SectionHd icon={<Wallet size={15} />} title="Payments (BAU dues)" />
              {(d?.billing?.length ?? 0) === 0 ? (
                <div className="py-8 text-center text-sm" style={sub}>No billing schedule.</div>
              ) : (d?.billing ?? []).map((b, i) => (
                <div key={i} className="flex items-center justify-between px-4 py-2.5 border-b" style={{ borderColor: line }}>
                  <div><div className="text-[13px]" style={ink}>{b.label || fmtDate(b.date)}</div><div className="text-[11.5px]" style={sub}>{fmtDate(b.date)}</div></div>
                  <span className="text-[11px] font-semibold rounded px-2 py-0.5" style={{ backgroundColor: (b.status === 'paid' ? colors.semantic.success : colors.semantic.warning) + '1e', color: b.status === 'paid' ? colors.semantic.success : colors.semantic.warning }}>{b.status === 'paid' ? `Paid ${money(b.amount, b.currency)}` : `${money(b.amount, b.currency)} · ${b.status || 'due'}`}</span>
                </div>
              ))}
            </Card>
          </>
        )}
      </>
    );
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-end mb-1">
        <button
          onClick={() => { sessionsQuery.refetch(); occurrencesQuery.refetch(); rosterQuery.refetch(); occAttQuery.refetch(); memberQuery.refetch(); declarationsQuery.refetch(); }}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium border" style={{ ...ink, borderColor: colors.utility.primaryText + '22' }}
        >
          <RefreshCw size={14} /> Refresh
        </button>
      </div>
      {view === 'overview' && renderOverview()}
      {view === 'group' && selectedSession && renderGroup()}
      {view === 'occurrence' && selectedOcc && selectedSession && renderOccurrence()}
      {view === 'member' && selectedMember && selectedSession && renderMember()}
    </div>
  );
};

export default GroupSessionsPage;
