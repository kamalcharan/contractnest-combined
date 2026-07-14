// ============================================================================
// Operations → Group Sessions — chair-side dashboard (generic per tenant)
// ============================================================================
// A "group session" = a contract that OWNS a shared audience='group' schedule
// (flagged metadata.group_session_owner='true'). Members attend the shared
// occurrences; their per-member contracts carry billing/dues only.
//
// Drill-down: Overview (session cards) → Session (Occurrences | Roster tabs)
// → Member (attendance history + dues). Data via /api/group-sessions/* (the
// gs_dash_* RPCs). Mirrors the operations/services page shell: useTheme colors,
// Card/CardContent, LoadingSpinner, error-card + empty-state trio.
// ============================================================================

import React, { useMemo, useState } from 'react';
import {
  Users,
  RefreshCw,
  AlertTriangle,
  Inbox,
  ChevronRight,
  ChevronLeft,
  CalendarClock,
  QrCode,
  CheckCircle2,
  Clock,
  CircleDollarSign,
  UserRound,
  ArrowLeft,
  Pencil,
  Ban,
  RotateCcw,
  Plus,
  X,
  Check,
  CalendarPlus,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { useTheme } from '@/contexts/ThemeContext';
import {
  useGroupSessions,
  useGroupSessionOccurrences,
  useGroupSessionRoster,
  useGroupSessionMember,
  useGenerateSchedule,
  useMoveOccurrence,
  useSetOccurrenceStatus,
  useAddOccurrence,
  useEnsureBlockToken,
  type GsSessionRow,
  type GsRosterRow,
} from '@/hooks/queries/useGroupSessionsDashboard';
import toast from 'react-hot-toast';

type ViewLevel = 'overview' | 'session' | 'member';
type SessionTab = 'occurrences' | 'roster';

// yyyy-mm-dd for <input type="date">
const toInputDate = (d?: string | null): string => {
  if (!d) return '';
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return '';
  return dt.toISOString().slice(0, 10);
};

const fmtDate = (d?: string | null): string => {
  if (!d) return '—';
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return String(d);
  return dt.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
};

const GroupSessionsPage: React.FC = () => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  const [view, setView] = useState<ViewLevel>('overview');
  const [selectedSession, setSelectedSession] = useState<GsSessionRow | null>(null);
  const [selectedMember, setSelectedMember] = useState<GsRosterRow | null>(null);
  const [sessionTab, setSessionTab] = useState<SessionTab>('occurrences');

  const sessionsQuery = useGroupSessions();
  const occurrencesQuery = useGroupSessionOccurrences(selectedSession?.block_id, {
    enabled: view === 'session' && sessionTab === 'occurrences',
  });
  const rosterQuery = useGroupSessionRoster(selectedSession?.block_id, {
    enabled: view === 'session' && sessionTab === 'roster',
  });
  const memberQuery = useGroupSessionMember(selectedMember?.membership_contract_id, {
    enabled: view === 'member' && !!selectedMember?.membership_contract_id,
  });

  // schedule mutations + inline-edit state (kept at parent so nested tab
  // re-renders don't drop it)
  const generateSchedule = useGenerateSchedule();
  const moveOccurrence = useMoveOccurrence();
  const setOccurrenceStatus = useSetOccurrenceStatus();
  const addOccurrence = useAddOccurrence();
  const ensureToken = useEnsureBlockToken();

  // mint the block's static check-in token and open the member QR link
  const openCheckin = async (blockId?: string | null) => {
    if (!blockId) return;
    try {
      const res = await ensureToken.mutateAsync({ blockId });
      if (res?.token) {
        const url = `${window.location.origin}/checkin/${res.token}`;
        window.open(url, '_blank', 'noopener');
        try { await navigator.clipboard.writeText(url); toast.success('Check-in link opened and copied'); } catch { /* clipboard optional */ }
      }
    } catch { /* mutation surfaces its own error toast */ }
  };
  const [editOccId, setEditOccId] = useState<string | null>(null);
  const [editDate, setEditDate] = useState('');
  const [addDate, setAddDate] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const scheduleBusy =
    generateSchedule.isPending || moveOccurrence.isPending ||
    setOccurrenceStatus.isPending || addOccurrence.isPending;

  const sessions = sessionsQuery.data?.sessions ?? [];
  const rosterSize = sessionsQuery.data?.roster_size ?? 0;

  const overviewStats = useMemo(() => {
    const totalSessions = sessions.length;
    const upcoming = sessions.filter((s) => !!s.next_occurrence).length;
    const withQr = sessions.filter((s) => s.qr_ready).length;
    return { totalSessions, upcoming, withQr };
  }, [sessions]);

  const openSession = (s: GsSessionRow) => {
    setSelectedSession(s);
    setSessionTab('occurrences');
    setView('session');
  };
  const openMember = (m: GsRosterRow) => {
    if (!m.membership_contract_id) return;
    setSelectedMember(m);
    setView('member');
  };
  const backToOverview = () => {
    setView('overview');
    setSelectedSession(null);
    setSelectedMember(null);
  };
  const backToSession = () => {
    setView('session');
    setSelectedMember(null);
  };

  // ── shared style helpers ──────────────────────────────────────────────────
  const cardStyle: React.CSSProperties = {
    backgroundColor: colors.utility.secondaryBackground,
    borderColor: colors.utility.primaryText + '14',
  };
  const subText = { color: colors.utility.secondaryText };
  const primaryText = { color: colors.utility.primaryText };

  const pctColor = (pct: number | null): string => {
    if (pct === null || pct === undefined) return colors.utility.secondaryText;
    if (pct >= 75) return colors.semantic.success;
    if (pct >= 40) return colors.semantic.warning;
    return colors.semantic.error;
  };

  // ── loading / error trio (overview level) ─────────────────────────────────
  if (view === 'overview' && sessionsQuery.isLoading && !sessionsQuery.data) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <LoadingSpinner size="lg" />
        <span style={subText}>Loading group sessions…</span>
      </div>
    );
  }

  if (view === 'overview' && sessionsQuery.isError) {
    return (
      <div className="p-6">
        <Card style={cardStyle}>
          <CardContent className="flex flex-col items-center gap-3 py-12">
            <AlertTriangle size={32} style={{ color: colors.semantic.error }} />
            <span style={primaryText}>Could not load group sessions.</span>
            <button
              onClick={() => sessionsQuery.refetch()}
              className="px-4 py-2 rounded-md text-sm font-medium"
              style={{ backgroundColor: colors.brand.primary, color: '#fff' }}
            >
              Try again
            </button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── header ────────────────────────────────────────────────────────────────
  const Header = () => (
    <div className="flex items-start justify-between gap-4 flex-wrap">
      <div>
        <div className="flex items-center gap-2">
          <Users size={22} style={{ color: colors.brand.primary }} />
          <h1 className="text-xl font-semibold" style={primaryText}>
            Group Sessions
          </h1>
        </div>
        <p className="text-sm mt-1" style={subText}>
          Shared sessions, roster attendance and member dues — one place per cohort.
        </p>
      </div>
      <button
        onClick={() => {
          sessionsQuery.refetch();
          occurrencesQuery.refetch();
          rosterQuery.refetch();
          memberQuery.refetch();
        }}
        className="inline-flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium border"
        style={{ ...primaryText, borderColor: colors.utility.primaryText + '22' }}
      >
        <RefreshCw size={15} />
        Refresh
      </button>
    </div>
  );

  // ── breadcrumb ──────────────────────────────────────────────────────────
  const Breadcrumb = () => (
    <div className="flex items-center gap-1 text-sm flex-wrap">
      <button onClick={backToOverview} style={subText} className="hover:underline">
        All sessions
      </button>
      {(view === 'session' || view === 'member') && selectedSession && (
        <>
          <ChevronRight size={14} style={subText} />
          <button
            onClick={backToSession}
            style={view === 'session' ? primaryText : subText}
            className="hover:underline"
          >
            {selectedSession.name}
          </button>
        </>
      )}
      {view === 'member' && selectedMember && (
        <>
          <ChevronRight size={14} style={subText} />
          <span style={primaryText}>{selectedMember.name || 'Member'}</span>
        </>
      )}
    </div>
  );

  // ── overview view ─────────────────────────────────────────────────────────
  const OverviewView = () => (
    <>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Group sessions" value={overviewStats.totalSessions} icon={<Users size={16} />} />
        <StatCard label="Members on roster" value={rosterSize} icon={<UserRound size={16} />} />
        <StatCard label="With upcoming" value={overviewStats.upcoming} icon={<CalendarClock size={16} />} />
        <StatCard label="QR ready" value={overviewStats.withQr} icon={<QrCode size={16} />} />
      </div>

      {sessions.length === 0 ? (
        <Card style={cardStyle}>
          <CardContent className="flex flex-col items-center gap-3 py-12">
            <Inbox size={32} style={subText} />
            <span style={primaryText}>No group sessions yet.</span>
            <span className="text-sm text-center max-w-md" style={subText}>
              A group session appears here once a group-session block is assigned (via a template) to at
              least one active contract. Members are the contacts on those contracts.
            </span>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {sessions.map((s) => (
            <Card
              key={s.block_id}
              style={{ ...cardStyle, cursor: 'pointer' }}
              className="transition-shadow hover:shadow-md"
            >
              <CardContent className="p-4 flex flex-col gap-3" onClick={() => openSession(s)}>
                <div className="flex items-start justify-between gap-2">
                  <div className="font-semibold" style={primaryText}>
                    {s.name}
                  </div>
                  {s.qr_ready ? (
                    <span
                      className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: colors.semantic.success + '22', color: colors.semantic.success }}
                    >
                      <QrCode size={12} /> QR
                    </span>
                  ) : (
                    <span
                      className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: colors.utility.primaryText + '11', ...subText }}
                    >
                      <QrCode size={12} /> No QR
                    </span>
                  )}
                </div>

                <div className="flex items-end justify-between">
                  <div>
                    <div className="text-2xl font-bold" style={{ color: pctColor(s.attendance_pct) }}>
                      {s.attendance_pct === null ? '—' : `${s.attendance_pct}%`}
                    </div>
                    <div className="text-xs" style={subText}>
                      attendance
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium" style={primaryText}>
                      {s.occurrences_done}/{s.occurrences_total}
                    </div>
                    <div className="text-xs" style={subText}>
                      sessions held
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs pt-1" style={subText}>
                  <span className="inline-flex items-center gap-1">
                    <UserRound size={12} /> {s.roster_size} members
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <CalendarClock size={12} /> Next: {fmtDate(s.next_occurrence)}
                  </span>
                </div>
              </CardContent>

              <div
                className="flex items-center justify-between px-4 py-2 border-t"
                style={{ borderColor: colors.utility.primaryText + '11' }}
              >
                <button
                  onClick={() => openSession(s)}
                  className="text-xs font-medium inline-flex items-center gap-1"
                  style={{ color: colors.brand.primary }}
                >
                  Open <ChevronRight size={13} />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    void openCheckin(s.block_id);
                  }}
                  className="text-xs font-medium inline-flex items-center gap-1"
                  style={{ color: colors.brand.primary }}
                >
                  <QrCode size={13} /> Check-in
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </>
  );

  const StatCard = ({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) => (
    <Card style={cardStyle}>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-xs" style={subText}>
          {icon}
          {label}
        </div>
        <div className="text-2xl font-bold mt-1" style={primaryText}>
          {value}
        </div>
      </CardContent>
    </Card>
  );

  // ── session view (occurrences | roster) ───────────────────────────────────
  const SessionView = () => (
    <>
      <div className="flex items-center gap-3 flex-wrap">
        <button
          onClick={backToOverview}
          className="inline-flex items-center gap-1 text-sm"
          style={subText}
        >
          <ArrowLeft size={15} /> Back
        </button>
        <h2 className="text-lg font-semibold" style={primaryText}>
          {selectedSession?.name}
        </h2>
        <button
          onClick={() => void openCheckin(selectedSession?.block_id)}
          disabled={ensureToken.isPending}
          className="ml-auto inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium"
          style={{ backgroundColor: colors.brand.primary, color: '#fff', opacity: ensureToken.isPending ? 0.6 : 1 }}
        >
          <QrCode size={15} /> {ensureToken.isPending ? 'Opening…' : 'Open check-in'}
        </button>
      </div>

      <div className="flex items-center gap-1 border-b" style={{ borderColor: colors.utility.primaryText + '18' }}>
        {(['occurrences', 'roster'] as SessionTab[]).map((t) => (
          <button
            key={t}
            onClick={() => setSessionTab(t)}
            className="px-4 py-2 text-sm font-medium capitalize -mb-px border-b-2"
            style={{
              color: sessionTab === t ? colors.brand.primary : colors.utility.secondaryText,
              borderColor: sessionTab === t ? colors.brand.primary : 'transparent',
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {sessionTab === 'occurrences' ? <OccurrencesTab /> : <RosterTab />}
    </>
  );

  const OccurrencesTab = () => {
    const rows = occurrencesQuery.data ?? [];
    const blockId = selectedSession?.block_id;
    if (occurrencesQuery.isLoading) return <TableLoading />;
    if (occurrencesQuery.isError) return <TableError onRetry={() => occurrencesQuery.refetch()} />;

    // empty → offer to generate the shared schedule from the block cadence
    if (rows.length === 0) {
      return (
        <Card style={cardStyle}>
          <CardContent className="flex flex-col items-center gap-3 py-12">
            <CalendarClock size={30} style={subText} />
            <span style={primaryText}>No schedule yet for this group session.</span>
            <span className="text-sm text-center max-w-md" style={subText}>
              Generate the shared schedule from the block's cadence. Every member attends these same dates.
            </span>
            <button
              disabled={!blockId || scheduleBusy}
              onClick={() => blockId && generateSchedule.mutate({ blockId })}
              className="px-4 py-2 rounded-md text-sm font-medium inline-flex items-center gap-2"
              style={{ backgroundColor: colors.brand.primary, color: '#fff', opacity: scheduleBusy ? 0.6 : 1 }}
            >
              <CalendarPlus size={15} /> {generateSchedule.isPending ? 'Generating…' : 'Generate schedule'}
            </button>
          </CardContent>
        </Card>
      );
    }

    const statusBadge = (o: typeof rows[number]) => {
      const map: Record<string, { c: string; icon: React.ReactNode; label: string }> = {
        skipped: { c: colors.semantic.warning, icon: <Ban size={13} />, label: 'Skipped' },
        cancelled: { c: colors.semantic.error, icon: <X size={13} />, label: 'Cancelled' },
        held: { c: colors.semantic.success, icon: <CheckCircle2 size={13} />, label: 'Held' },
        scheduled: o.is_past
          ? { c: colors.utility.secondaryText, icon: <CheckCircle2 size={13} />, label: 'Past' }
          : { c: colors.semantic.warning, icon: <Clock size={13} />, label: 'Upcoming' },
      };
      const b = map[o.status] || map.scheduled;
      return (
        <span className="inline-flex items-center gap-1" style={{ color: b.c }}>
          {b.icon} {b.label}
        </span>
      );
    };

    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs" style={subText}>
            {rows.filter((o) => o.status !== 'cancelled').length} occurrences
          </span>
          {showAdd ? (
            <span className="inline-flex items-center gap-2">
              <input
                type="date"
                value={addDate}
                onChange={(e) => setAddDate(e.target.value)}
                className="px-2 py-1 rounded-md text-sm border"
                style={{ ...primaryText, borderColor: colors.utility.primaryText + '33', backgroundColor: colors.utility.primaryBackground }}
              />
              <button
                disabled={!addDate || !blockId || scheduleBusy}
                onClick={() => { if (blockId && addDate) { addOccurrence.mutate({ blockId, date: addDate }); setShowAdd(false); setAddDate(''); } }}
                className="p-1.5 rounded-md" style={{ backgroundColor: colors.brand.primary, color: '#fff' }}
              >
                <Check size={14} />
              </button>
              <button onClick={() => { setShowAdd(false); setAddDate(''); }} className="p-1.5 rounded-md" style={{ ...subText }}>
                <X size={14} />
              </button>
            </span>
          ) : (
            <button
              onClick={() => setShowAdd(true)}
              className="inline-flex items-center gap-1 text-xs font-medium"
              style={{ color: colors.brand.primary }}
            >
              <Plus size={14} /> Add date
            </button>
          )}
        </div>

        <Card style={cardStyle}>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: `1px solid ${colors.utility.primaryText}14` }}>
                  <Th>#</Th>
                  <Th>Date</Th>
                  <Th>Status</Th>
                  <Th align="right">Actions</Th>
                </tr>
              </thead>
              <tbody>
                {rows.map((o) => (
                  <tr key={o.event_id} style={{ borderBottom: `1px solid ${colors.utility.primaryText}0d` }}>
                    <Td>{o.seq ?? '—'}{o.total ? ` / ${o.total}` : ''}</Td>
                    <Td>
                      {editOccId === o.event_id ? (
                        <span className="inline-flex items-center gap-2">
                          <input
                            type="date"
                            value={editDate}
                            onChange={(e) => setEditDate(e.target.value)}
                            className="px-2 py-1 rounded-md text-sm border"
                            style={{ ...primaryText, borderColor: colors.utility.primaryText + '33', backgroundColor: colors.utility.primaryBackground }}
                          />
                          <button
                            disabled={!editDate || scheduleBusy}
                            onClick={() => { moveOccurrence.mutate({ id: o.event_id, date: editDate, note: 'Rescheduled' }); setEditOccId(null); }}
                            className="p-1.5 rounded-md" style={{ backgroundColor: colors.brand.primary, color: '#fff' }}
                          >
                            <Check size={14} />
                          </button>
                          <button onClick={() => setEditOccId(null)} className="p-1.5 rounded-md" style={subText}>
                            <X size={14} />
                          </button>
                        </span>
                      ) : (
                        <span style={primaryText}>
                          {fmtDate(o.date)}
                          {o.note && <span className="block text-xs" style={subText}>{o.note}</span>}
                        </span>
                      )}
                    </Td>
                    <Td>
                      {statusBadge(o)}
                      {(o.is_past || o.status === 'held') && (
                        <span className="ml-2 text-xs" style={subText}>· {o.present} present</span>
                      )}
                    </Td>
                    <Td align="right">
                      {editOccId !== o.event_id && (
                        <span className="inline-flex items-center gap-1 justify-end">
                          <button
                            title="Move date"
                            onClick={() => { setEditOccId(o.event_id); setEditDate(toInputDate(o.date)); }}
                            className="p-1.5 rounded-md hover:bg-black/5" style={subText}
                          >
                            <Pencil size={14} />
                          </button>
                          {o.status === 'skipped' || o.status === 'cancelled' ? (
                            <button
                              title="Restore" disabled={scheduleBusy}
                              onClick={() => setOccurrenceStatus.mutate({ id: o.event_id, status: 'scheduled' })}
                              className="p-1.5 rounded-md hover:bg-black/5" style={{ color: colors.semantic.success }}
                            >
                              <RotateCcw size={14} />
                            </button>
                          ) : (
                            <button
                              title="Skip" disabled={scheduleBusy}
                              onClick={() => setOccurrenceStatus.mutate({ id: o.event_id, status: 'skipped', note: 'Skipped' })}
                              className="p-1.5 rounded-md hover:bg-black/5" style={{ color: colors.semantic.warning }}
                            >
                              <Ban size={14} />
                            </button>
                          )}
                          {o.status !== 'cancelled' && (
                            <button
                              title="Cancel" disabled={scheduleBusy}
                              onClick={() => setOccurrenceStatus.mutate({ id: o.event_id, status: 'cancelled', note: 'Cancelled' })}
                              className="p-1.5 rounded-md hover:bg-black/5" style={{ color: colors.semantic.error }}
                            >
                              <X size={14} />
                            </button>
                          )}
                        </span>
                      )}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    );
  };

  const RosterTab = () => {
    const rows = rosterQuery.data ?? [];
    if (rosterQuery.isLoading) return <TableLoading />;
    if (rosterQuery.isError) return <TableError onRetry={() => rosterQuery.refetch()} />;
    if (rows.length === 0) return <EmptyRow label="No members on this roster yet." />;
    return (
      <Card style={cardStyle}>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: `1px solid ${colors.utility.primaryText}14` }}>
                <Th>Member</Th>
                <Th>Contract</Th>
                <Th align="right">Attended</Th>
                <Th>Dues</Th>
                <Th align="right"></Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((m) => (
                <tr
                  key={m.contact_id}
                  onClick={() => openMember(m)}
                  style={{
                    borderBottom: `1px solid ${colors.utility.primaryText}0d`,
                    cursor: m.membership_contract_id ? 'pointer' : 'default',
                  }}
                  className="hover:bg-black/5"
                >
                  <Td>
                    <span className="inline-flex items-center gap-2" style={primaryText}>
                      <UserRound size={14} style={subText} />
                      {m.name || '—'}
                    </span>
                  </Td>
                  <Td>
                    <span style={primaryText}>{m.contract_name || '—'}</span>
                    {(m.start_date || m.end_date) && (
                      <span className="block text-xs" style={subText}>
                        {fmtDate(m.start_date)} → {fmtDate(m.end_date)}
                      </span>
                    )}
                  </Td>
                  <Td align="right">
                    <span style={primaryText}>{m.attended}</span>
                  </Td>
                  <Td>
                    {m.dues_pending ? (
                      <span
                        className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: colors.semantic.error + '1e', color: colors.semantic.error }}
                      >
                        <CircleDollarSign size={12} /> Pending
                      </span>
                    ) : (
                      <span
                        className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: colors.semantic.success + '1e', color: colors.semantic.success }}
                      >
                        <CheckCircle2 size={12} /> Clear
                      </span>
                    )}
                  </Td>
                  <Td align="right">
                    {m.membership_contract_id ? <ChevronRight size={15} style={subText} /> : null}
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    );
  };

  // ── member view ───────────────────────────────────────────────────────────
  const MemberView = () => {
    const data = memberQuery.data;
    return (
      <>
        <div className="flex items-center gap-3 flex-wrap">
          <button onClick={backToSession} className="inline-flex items-center gap-1 text-sm" style={subText}>
            <ChevronLeft size={15} /> Back to roster
          </button>
          <h2 className="text-lg font-semibold" style={primaryText}>
            {selectedMember?.name || 'Member'}
          </h2>
        </div>

        {memberQuery.isLoading ? (
          <TableLoading />
        ) : memberQuery.isError ? (
          <TableError onRetry={() => memberQuery.refetch()} />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* attendance */}
            <Card style={cardStyle}>
              <CardContent className="p-4">
                <div className="font-semibold mb-3 inline-flex items-center gap-2" style={primaryText}>
                  <CalendarClock size={16} style={{ color: colors.brand.primary }} /> Attendance history
                </div>
                {(data?.attendance?.length ?? 0) === 0 ? (
                  <div className="text-sm" style={subText}>
                    No attendance recorded yet.
                  </div>
                ) : (
                  <ul className="flex flex-col gap-2">
                    {data!.attendance.map((a, i) => (
                      <li key={i} className="flex items-center justify-between text-sm">
                        <span style={primaryText}>{fmtDate(a.date)}</span>
                        <span
                          className="text-xs px-2 py-0.5 rounded-full capitalize"
                          style={{
                            backgroundColor:
                              a.status === 'present'
                                ? colors.semantic.success + '1e'
                                : colors.utility.primaryText + '11',
                            color:
                              a.status === 'present' ? colors.semantic.success : colors.utility.secondaryText,
                          }}
                        >
                          {a.status || 'unknown'}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            {/* billing / dues */}
            <Card style={cardStyle}>
              <CardContent className="p-4">
                <div className="font-semibold mb-3 inline-flex items-center gap-2" style={primaryText}>
                  <CircleDollarSign size={16} style={{ color: colors.brand.primary }} /> Billing &amp; dues
                </div>
                {(data?.billing?.length ?? 0) === 0 ? (
                  <div className="text-sm" style={subText}>
                    No billing schedule found.
                  </div>
                ) : (
                  <ul className="flex flex-col gap-2">
                    {data!.billing.map((b, i) => (
                      <li key={i} className="flex items-center justify-between text-sm">
                        <span>
                          <span style={primaryText}>{b.label || fmtDate(b.date)}</span>
                          <span className="ml-2 text-xs" style={subText}>
                            {fmtDate(b.date)}
                          </span>
                        </span>
                        <span className="flex items-center gap-2">
                          <span style={primaryText}>
                            {b.amount != null ? `${b.currency || ''} ${b.amount}`.trim() : '—'}
                          </span>
                          <span
                            className="text-xs px-2 py-0.5 rounded-full capitalize"
                            style={{
                              backgroundColor:
                                b.status === 'paid'
                                  ? colors.semantic.success + '1e'
                                  : colors.semantic.warning + '1e',
                              color: b.status === 'paid' ? colors.semantic.success : colors.semantic.warning,
                            }}
                          >
                            {b.status || 'due'}
                          </span>
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </>
    );
  };

  // ── tiny table primitives ─────────────────────────────────────────────────
  const Th = ({ children, align }: { children?: React.ReactNode; align?: 'right' }) => (
    <th
      className={`px-4 py-2.5 text-xs font-semibold ${align === 'right' ? 'text-right' : 'text-left'}`}
      style={subText}
    >
      {children}
    </th>
  );
  const Td = ({ children, align }: { children?: React.ReactNode; align?: 'right' }) => (
    <td className={`px-4 py-2.5 ${align === 'right' ? 'text-right' : 'text-left'}`}>{children}</td>
  );
  const TableLoading = () => (
    <div className="flex items-center justify-center py-12 gap-3">
      <LoadingSpinner size="md" />
      <span style={subText}>Loading…</span>
    </div>
  );
  const TableError = ({ onRetry }: { onRetry: () => void }) => (
    <Card style={cardStyle}>
      <CardContent className="flex flex-col items-center gap-3 py-10">
        <AlertTriangle size={26} style={{ color: colors.semantic.error }} />
        <span style={primaryText}>Could not load this data.</span>
        <button
          onClick={onRetry}
          className="px-3 py-1.5 rounded-md text-sm font-medium"
          style={{ backgroundColor: colors.brand.primary, color: '#fff' }}
        >
          Try again
        </button>
      </CardContent>
    </Card>
  );
  const EmptyRow = ({ label }: { label: string }) => (
    <Card style={cardStyle}>
      <CardContent className="flex flex-col items-center gap-2 py-10">
        <Inbox size={26} style={subText} />
        <span className="text-sm" style={subText}>
          {label}
        </span>
      </CardContent>
    </Card>
  );

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <div className="p-6 space-y-5">
      <Header />
      <Breadcrumb />
      {view === 'overview' && <OverviewView />}
      {view === 'session' && <SessionView />}
      {view === 'member' && <MemberView />}
    </div>
  );
};

export default GroupSessionsPage;
