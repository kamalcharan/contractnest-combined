// ============================================================================
// Operations → Group Sessions — chair dashboard (table-pattern redesign)
// ============================================================================
// A "group session" = a catalog block (config.audience='group'). Each block is
// the group; drill-down:
//   Overview (Groups | Payments tabs) → Group (KPIs · sessions table · series ·
//   QR) → Occurrence (attendance table) / Roster (members table, expandable
//   attendance history)
// Redesigned 2026-07-22 in the AR/AP design language (owner-approved
// playground): lists are tables on the page canvas — header row, aligned grid
// columns, one bordered row per record, filter chips, client-side paging —
// with the unified 10px bordered pill spec. Summary surfaces (KPIs, series,
// QR) keep their cards.
// The per-member detail view (profile · history · dues) lives on that
// member's own Contract page (Sessions tab) — the Roster links out to it via
// membership_contract_id. Shared schedule per block (not per member).
// Payment declarations are self-declared claims from member check-in; chair
// Confirm records the receipt against the invoice (bbb-foundation/046).
// Data via /api/group-sessions/*.
// ============================================================================

import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, RefreshCw, AlertTriangle, Inbox, ChevronRight, ChevronLeft, ChevronDown,
  CalendarClock, CheckCircle2, CircleDollarSign, UserRound, ArrowLeft, TrendingUp,
  Wallet, Repeat, Pencil, Ban, X, Check, CalendarPlus, Plus, RotateCcw, Mic,
  UserCog, Lock, Search,
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
  usePendingDeclarations,
  useConfirmDeclaration,
  useAssignChair,
  useAssignChairDefault,
  type GsSessionRow,
  type GsOccurrenceRow,
} from '@/hooks/queries/useGroupSessionsDashboard';
import QRCard from '@/components/group-sessions/QRCard';

const CHAIR_CLASSIFICATIONS = ['buyer', 'vendor', 'partner', 'team_member'];

type ViewLevel = 'overview' | 'group' | 'occurrence' | 'roster';
type OverviewTab = 'groups' | 'payments';
type OccFilter = 'upcoming' | 'past' | 'all';
type RosterFilter = 'all' | 'overcap' | 'dues';
type AttFilter = 'all' | 'present' | 'absent';

const PAGE_SIZE = 10;

// Table column templates (product-wide list pattern)
const GROUPS_COLS = 'minmax(200px,1.6fr) 90px 110px 90px minmax(120px,1fr) 100px 32px';
const OCC_COLS = '110px 44px minmax(160px,1.3fr) minmax(120px,1fr) 130px 32px';
const ROSTER_COLS = 'minmax(180px,1.5fr) minmax(140px,1.1fr) 90px 150px 70px 120px 32px';
const ATT_COLS = 'minmax(200px,1.6fr) 90px 100px 120px';
const PAY_COLS = 'minmax(180px,1.4fr) minmax(130px,1fr) minmax(130px,1fr) minmax(120px,.9fr) 190px';

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
  const navigate = useNavigate();
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  const [view, setView] = useState<ViewLevel>('overview');
  const [selectedSession, setSelectedSession] = useState<GsSessionRow | null>(null);
  const [selectedOcc, setSelectedOcc] = useState<GsOccurrenceRow | null>(null);

  const sessionsQuery = useGroupSessions();
  const occurrencesQuery = useGroupSessionOccurrences(selectedSession?.block_id, { enabled: view === 'group' });
  const rosterQuery = useGroupSessionRoster(selectedSession?.block_id, { enabled: view === 'group' || view === 'roster' });
  const occAttQuery = useOccurrenceAttendance(selectedOcc?.event_id, { enabled: view === 'occurrence' });
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

  // ── Redesign state: tabs, filters, paging, expansion ──
  const [overviewTab, setOverviewTab] = useState<OverviewTab>('groups');
  const [declGroup, setDeclGroup] = useState<string>('all');
  const [declSearch, setDeclSearch] = useState('');
  const [declPage, setDeclPage] = useState(1);
  const [occFilter, setOccFilter] = useState<OccFilter>('upcoming');
  const [occPage, setOccPage] = useState(1);
  const [rosterFilter, setRosterFilter] = useState<RosterFilter>('all');
  const [rosterSearch, setRosterSearch] = useState('');
  const [rosterPage, setRosterPage] = useState(1);
  const [expandedMembers, setExpandedMembers] = useState<Set<string>>(new Set());
  const [attFilter, setAttFilter] = useState<AttFilter>('all');
  const [attSearch, setAttSearch] = useState('');

  const sessions = sessionsQuery.data?.sessions ?? [];
  const occurrences = occurrencesQuery.data ?? [];
  const roster = rosterQuery.data ?? [];
  const declarations = declarationsQuery.data ?? [];

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

  // NOTE: every hook must live above the early loading/error returns below —
  // conditional hook counts crash React ("Rendered more hooks…").
  const declGroups = useMemo(() => {
    const map = new Map<string, { name: string; count: number }>();
    declarations.forEach((d) => {
      const key = d.block_id || 'unknown';
      const cur = map.get(key) || { name: d.block_name || 'Unknown group', count: 0 };
      cur.count += 1;
      map.set(key, cur);
    });
    return Array.from(map.entries());
  }, [declarations]);

  const filteredDeclarations = useMemo(() => {
    const term = declSearch.trim().toLowerCase();
    return declarations.filter((d) => {
      if (declGroup !== 'all' && (d.block_id || 'unknown') !== declGroup) return false;
      if (term && !(d.member_name || '').toLowerCase().includes(term)) return false;
      return true;
    });
  }, [declarations, declGroup, declSearch]);

  const openGroup = (s: GsSessionRow) => { setSelectedSession(s); setView('group'); setShowAdd(false); setEditOccId(null); setOccFilter('upcoming'); setOccPage(1); };
  const openOccurrence = (o: GsOccurrenceRow) => { setSelectedOcc(o); setEditOccId(null); setAttFilter('all'); setAttSearch(''); setView('occurrence'); };

  const cardStyle: React.CSSProperties = { backgroundColor: colors.utility.secondaryBackground, borderColor: colors.utility.primaryText + '14' };
  const sub = { color: colors.utility.secondaryText };
  const ink = { color: colors.utility.primaryText };
  const line = colors.utility.primaryText + '12';
  const money = (n?: number | null, c?: string | null) => (n == null ? '—' : `${!c || c === 'INR' ? '₹' : c + ' '}${Number(n).toLocaleString()}`);
  const pctColor = (p?: number | null) => (p == null ? colors.utility.secondaryText : p >= 75 ? colors.semantic.success : p >= 40 ? colors.semantic.warning : colors.semantic.error);

  // ── Shared table building blocks (mirror /ops/finance + /contacts) ──
  const rowStyle = (gridCols: string, extra?: React.CSSProperties): React.CSSProperties => ({
    gridTemplateColumns: gridCols,
    borderColor: colors.utility.primaryText + '15',
    backgroundColor: colors.utility.secondaryBackground,
    ...extra,
  });
  const headStyle = (gridCols: string): React.CSSProperties => ({
    gridTemplateColumns: gridCols,
    color: colors.utility.secondaryText,
  });
  // Unified pill spec: 10px semibold, tinted fill, thin matching border
  const Pill = ({ label, accent }: { label: React.ReactNode; accent: string }) => (
    <span
      className="px-2 py-0.5 rounded-full text-[10px] font-semibold border whitespace-nowrap inline-flex items-center gap-1"
      style={{ backgroundColor: accent + '20', borderColor: accent + '40', color: accent }}
    >
      {label}
    </span>
  );
  const chipStyle = (active: boolean): React.CSSProperties => ({
    borderColor: active ? colors.brand.primary + '66' : colors.utility.secondaryText + '35',
    borderStyle: active ? 'solid' : 'dashed',
    backgroundColor: active ? colors.brand.primary + '14' : 'transparent',
    color: active ? colors.utility.primaryText : colors.utility.secondaryText,
  });
  const Pager = ({ page, total, onPage, noun }: { page: number; total: number; onPage: (p: number) => void; noun: string }) => {
    const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    if (pages <= 1) return null;
    const cur = Math.min(page, pages);
    return (
      <div className="flex items-center justify-between gap-2 pt-3">
        <span className="text-xs" style={sub}>
          Page {cur} of {pages} · {total} {noun}
        </span>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onPage(Math.max(1, cur - 1))}
            disabled={cur <= 1}
            className="inline-flex items-center justify-center h-7 w-7 rounded-lg border disabled:opacity-40"
            style={{ borderColor: colors.utility.secondaryText + '30', ...ink }}
          >
            <ChevronLeft size={14} />
          </button>
          <button
            onClick={() => onPage(Math.min(pages, cur + 1))}
            disabled={cur >= pages}
            className="inline-flex items-center justify-center h-7 w-7 rounded-lg border disabled:opacity-40"
            style={{ borderColor: colors.utility.secondaryText + '30', ...ink }}
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
    );
  };
  const pageSlice = <T,>(rows: T[], page: number): T[] => {
    const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
    const cur = Math.min(page, pages);
    return rows.slice((cur - 1) * PAGE_SIZE, cur * PAGE_SIZE);
  };

  const Kpi = ({ icon, label, value, sub: s2, tone, onClick }: { icon: React.ReactNode; label: string; value: React.ReactNode; sub?: string; tone?: 'good' | 'warn'; onClick?: () => void }) => (
    <Card style={onClick ? { backgroundColor: colors.brand.primary, borderColor: colors.brand.primary, cursor: 'pointer' } : cardStyle} onClick={onClick}>
      <CardContent className="p-4">
        <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide" style={onClick ? { color: '#ffffffd9' } : sub}>{icon}{label}</div>
        <div className="text-2xl font-bold mt-1 tabular-nums" style={onClick ? { color: '#fff' } : ink}>{value}</div>
        {s2 && <div className="text-[11px] mt-0.5" style={{ color: onClick ? '#ffffffd9' : tone === 'good' ? colors.semantic.success : tone === 'warn' ? colors.semantic.warning : colors.utility.secondaryText }}>{s2}</div>}
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
    let accent = colors.brand.primary, txt = 'Scheduled';
    if (o.status === 'cancelled') { accent = colors.semantic.error; txt = 'Cancelled'; }
    else if (o.status === 'skipped') { accent = colors.semantic.warning; txt = 'Skipped'; }
    else if (o.status === 'held' || o.is_past) { accent = colors.semantic.success; txt = `${o.present}/${rosterSize} present`; }
    return <Pill label={txt} accent={accent} />;
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

  // ─────────────────────────────────────────────
  // Overview — Groups | Payments tabs
  // ─────────────────────────────────────────────
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

      {/* Groups | Payments segmented switcher */}
      <div className="flex items-center gap-1 mt-6 mb-3 p-1 rounded-xl border w-fit" style={{ borderColor: colors.utility.primaryText + '15', backgroundColor: colors.utility.secondaryBackground }}>
        <button
          onClick={() => setOverviewTab('groups')}
          className="px-4 py-1.5 rounded-lg text-[13px] font-bold inline-flex items-center gap-2"
          style={overviewTab === 'groups' ? { backgroundColor: colors.utility.primaryText, color: colors.utility.primaryBackground } : sub}
        >
          <Users size={13} /> Groups <span className="font-semibold opacity-70">{sessions.length}</span>
        </button>
        <button
          onClick={() => setOverviewTab('payments')}
          className="px-4 py-1.5 rounded-lg text-[13px] font-bold inline-flex items-center gap-2"
          style={overviewTab === 'payments' ? { backgroundColor: colors.utility.primaryText, color: colors.utility.primaryBackground } : sub}
        >
          <CircleDollarSign size={13} /> Payments to confirm
          {declarations.length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-extrabold" style={{ backgroundColor: colors.semantic.warning, color: '#fff' }}>
              {declarations.length}
            </span>
          )}
        </button>
      </div>

      {overviewTab === 'groups' && (
        sessions.length === 0 ? (
          <Card style={cardStyle} className="mt-1"><CardContent className="flex flex-col items-center gap-3 py-12">
            <Inbox size={30} style={sub} /><span style={ink}>No group sessions yet.</span>
            <span className="text-sm text-center max-w-md" style={sub}>A group session appears once a group-session block is assigned (via a template) to at least one active contract.</span>
          </CardContent></Card>
        ) : (
          <div className="overflow-x-auto">
            <div className="space-y-1.5 min-w-[840px]">
              <div className="grid items-center gap-2 px-3 py-2 text-[10px] font-bold uppercase tracking-wider" style={headStyle(GROUPS_COLS)}>
                <span>Group</span><span>Members</span><span>Attendance</span><span>Held</span><span>Next session</span><span>QR</span><span />
              </div>
              {sessions.map((s) => (
                <div
                  key={s.block_id}
                  onClick={() => openGroup(s)}
                  className="grid items-center gap-2 px-3 py-2.5 rounded-lg border cursor-pointer transition-colors"
                  style={rowStyle(GROUPS_COLS)}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="h-8 w-8 rounded-lg flex-none inline-flex items-center justify-center text-xs font-bold border" style={{ backgroundColor: colors.brand.primary + '20', borderColor: colors.brand.primary + '40', color: colors.brand.primary }}>
                      <Users size={14} />
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-bold truncate" style={ink}>{s.name}</p>
                      <p className="text-[10px]" style={sub}>{s.occurrences_total} sessions</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold tabular-nums" style={ink}>{s.roster_size}</span>
                  <span className="text-xs font-bold tabular-nums" style={{ color: pctColor(s.attendance_pct) }}>{s.attendance_pct == null ? '—' : `${s.attendance_pct}%`}</span>
                  <span className="text-xs font-bold tabular-nums" style={ink}>{s.occurrences_done}/{s.occurrences_total}</span>
                  <div>
                    <p className="text-xs font-semibold" style={ink}>{s.next_occurrence ? fmtShort(s.next_occurrence) : '—'}</p>
                  </div>
                  <div><Pill label={s.qr_ready ? 'QR ready' : 'QR needed'} accent={s.qr_ready ? colors.semantic.success : colors.semantic.warning} /></div>
                  <ChevronRight size={14} style={sub} />
                </div>
              ))}
            </div>
          </div>
        )
      )}

      {overviewTab === 'payments' && (
        <>
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <button onClick={() => { setDeclGroup('all'); setDeclPage(1); }} className="px-3 py-1.5 rounded-full border text-xs font-semibold" style={chipStyle(declGroup === 'all')}>
              All groups · {declarations.length}
            </button>
            {declGroups.map(([key, g]) => (
              <button key={key} onClick={() => { setDeclGroup(key); setDeclPage(1); }} className="px-3 py-1.5 rounded-full border text-xs font-semibold" style={chipStyle(declGroup === key)}>
                {g.name} · {g.count}
              </button>
            ))}
            <div className="relative flex-1 min-w-[180px]">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={sub} />
              <input
                value={declSearch}
                onChange={(e) => { setDeclSearch(e.target.value); setDeclPage(1); }}
                placeholder="Search member…"
                className="w-full pl-9 pr-3 py-1.5 rounded-full border text-xs bg-transparent"
                style={{ borderColor: colors.utility.secondaryText + '30', ...ink }}
              />
            </div>
          </div>

          {filteredDeclarations.length === 0 ? (
            <div className="flex flex-col items-center py-12 gap-2">
              <CheckCircle2 size={28} style={{ color: colors.semantic.success }} />
              <p className="text-sm" style={sub}>{declarations.length === 0 ? 'No payments waiting for confirmation' : 'Nothing matches these filters'}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <div className="space-y-1.5 min-w-[860px]">
                <div className="grid items-center gap-2 px-3 py-2 text-[10px] font-bold uppercase tracking-wider" style={headStyle(PAY_COLS)}>
                  <span>Member</span><span>Group</span><span>Declared</span><span>Reference</span><span />
                </div>
                {pageSlice(filteredDeclarations, declPage).map((d) => (
                  <div key={d.id} className="grid items-center gap-2 px-3 py-2.5 rounded-lg border" style={rowStyle(PAY_COLS)}>
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="h-8 w-8 rounded-lg flex-none inline-flex items-center justify-center text-xs font-bold border" style={{ backgroundColor: colors.brand.primary + '20', borderColor: colors.brand.primary + '40', color: colors.brand.primary }}>
                        {initials(d.member_name)}
                      </span>
                      <div className="min-w-0">
                        <p className="text-xs font-bold truncate" style={ink}>{d.member_name || '—'}</p>
                        <p className="text-[10px]" style={sub}>declared {fmtShort(d.created_at)} · self-declared</p>
                      </div>
                    </div>
                    <div><Pill label={d.block_name || 'Unknown group'} accent={colors.brand.primary} /></div>
                    <div>
                      <p className="text-xs font-bold tabular-nums" style={ink}>{money(d.amount, d.currency)}</p>
                      <p className="text-[10px]" style={sub}>{d.label || 'Due'}{d.due_date ? ` · due ${fmtShort(d.due_date)}` : ''}</p>
                    </div>
                    <div>
                      {d.upi_reference ? (
                        <span className="text-[11px] font-mono font-semibold" style={ink}>{d.upi_reference}</span>
                      ) : (
                        <Pill label="no reference" accent={colors.semantic.warning} />
                      )}
                    </div>
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        disabled={confirmDeclaration.isPending}
                        onClick={() => confirmDeclaration.mutate({ id: d.id, confirm: true })}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1 disabled:opacity-50"
                        style={{ backgroundColor: colors.semantic.success, color: '#fff' }}
                      >
                        <Check size={13} /> Confirm
                      </button>
                      <button
                        disabled={confirmDeclaration.isPending}
                        onClick={() => confirmDeclaration.mutate({ id: d.id, confirm: false })}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold border disabled:opacity-50"
                        style={{ ...sub, borderColor: colors.utility.primaryText + '22' }}
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          <Pager page={declPage} total={filteredDeclarations.length} onPage={setDeclPage} noun="pending" />
          <p className="text-[11px] mt-3" style={sub}>
            These are member self-declarations from check-in (the UPI payment itself is not verified automatically).
            Confirming records a receipt against the member's invoice — dues, invoice balance and Finance all update together.
          </p>
        </>
      )}
    </>
  );

  // ─────────────────────────────────────────────
  // Group detail — sessions table + series/QR panels
  // ─────────────────────────────────────────────
  const renderGroup = () => {
    const s = selectedSession!;
    const filteredOccs = occurrences.filter((o) =>
      occFilter === 'all' ? true : occFilter === 'past' ? o.is_past : !o.is_past
    );
    const upcomingCount = occurrences.filter((o) => !o.is_past).length;
    return (
      <>
        <Crumb items={[{ label: 'Group Sessions', onClick: () => setView('overview') }, { label: s.name }]} />
        <h1 className="text-xl font-semibold" style={ink}>{s.name}</h1>
        <p className="text-sm mt-1 mb-4" style={sub}>{s.roster_size} members · {cadence} · shared schedule (not per member).</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
          <Kpi icon={<UserRound size={12} />} label="Members" value={s.roster_size} sub="enrolled" />
          <Kpi icon={<TrendingUp size={12} />} label="Attendance" value={s.attendance_pct == null ? '—' : `${s.attendance_pct}%`} sub="avg" tone="good" />
          <Kpi icon={<CalendarClock size={12} />} label="Next" value={s.next_occurrence ? fmtShort(s.next_occurrence) : '—'} sub={cadence} />
          <Kpi icon={<Users size={12} />} label="Roster view" value={`${s.roster_size} members`} sub="Open sheet ›" onClick={() => { setView('roster'); setRosterFilter('all'); setRosterSearch(''); setRosterPage(1); setExpandedMembers(new Set()); }} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-5 items-start">
          <div>
            <div className="flex flex-wrap items-center gap-3 mb-3">
              <h2 className="text-[15px] font-bold" style={ink}>
                Sessions
                <span className="ml-2 text-xs font-normal" style={sub}>{occurrences.length} scheduled</span>
              </h2>
              <div className="flex-1" />
              {showAdd ? (
                <span className="inline-flex items-center gap-2">
                  <input type="date" value={addDate} onChange={(e) => setAddDate(e.target.value)} className="px-2 py-1 rounded-md text-xs border" style={{ ...ink, borderColor: colors.utility.primaryText + '33', backgroundColor: colors.utility.primaryBackground }} />
                  <button disabled={!addDate || scheduleBusy} onClick={() => { addOccurrence.mutate({ blockId: s.block_id, date: addDate }); setShowAdd(false); setAddDate(''); }} className="p-1 rounded" style={{ backgroundColor: colors.brand.primary, color: '#fff' }}><Check size={13} /></button>
                  <button onClick={() => { setShowAdd(false); setAddDate(''); }} className="p-1 rounded" style={sub}><X size={13} /></button>
                </span>
              ) : (
                <button onClick={() => setShowAdd(true)} className="inline-flex items-center gap-1 text-[12.5px] font-semibold" style={{ color: colors.brand.primary }}><Plus size={13} /> Add date</button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 mb-3">
              {([['upcoming', `Upcoming · ${upcomingCount}`], ['past', `Past · ${occurrences.length - upcomingCount}`], ['all', 'All']] as [OccFilter, string][]).map(([key, label]) => (
                <button key={key} onClick={() => { setOccFilter(key); setOccPage(1); }} className="px-3 py-1.5 rounded-full border text-xs font-semibold" style={chipStyle(occFilter === key)}>
                  {label}
                </button>
              ))}
            </div>

            {occurrencesQuery.isLoading ? (
              <div className="py-10 flex justify-center"><LoadingSpinner size="md" /></div>
            ) : occurrences.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-10 rounded-lg border" style={{ borderColor: colors.utility.primaryText + '15' }}>
                <CalendarClock size={26} style={sub} /><span className="text-sm" style={sub}>No schedule yet.</span>
                <button disabled={scheduleBusy} onClick={() => generateSchedule.mutate({ blockId: s.block_id })} className="px-4 py-2 rounded-md text-sm font-medium inline-flex items-center gap-2" style={{ backgroundColor: colors.brand.primary, color: '#fff' }}><CalendarPlus size={15} /> {generateSchedule.isPending ? 'Generating…' : 'Generate schedule'}</button>
              </div>
            ) : filteredOccs.length === 0 ? (
              <div className="flex flex-col items-center py-10 gap-2 rounded-lg border" style={{ borderColor: colors.utility.primaryText + '15' }}>
                <Inbox size={24} style={sub} />
                <span className="text-sm" style={sub}>No {occFilter} sessions</span>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <div className="space-y-1.5 min-w-[600px]">
                  <div className="grid items-center gap-2 px-3 py-2 text-[10px] font-bold uppercase tracking-wider" style={headStyle(OCC_COLS)}>
                    <span>Date</span><span>#</span><span>Chair</span><span>Status</span><span>Note</span><span />
                  </div>
                  {pageSlice(filteredOccs, occPage).map((o) => (
                    <div
                      key={o.event_id}
                      onClick={() => openOccurrence(o)}
                      className="grid items-center gap-2 px-3 py-2.5 rounded-lg border cursor-pointer transition-colors"
                      style={rowStyle(OCC_COLS)}
                    >
                      <div>
                        <p className="text-xs font-bold tabular-nums" style={ink}>{fmtShort(o.date)}</p>
                        <p className="text-[10px]" style={sub}>{WEEKDAYS[new Date(o.date).getDay()] || ''}</p>
                      </div>
                      <span className="text-[11px] tabular-nums" style={sub}>{o.seq ?? '—'}</span>
                      <div className="min-w-0">
                        {o.assigned_to_name ? (
                          <p className="text-xs font-semibold truncate" style={ink}>{o.assigned_to_name}</p>
                        ) : (
                          <p className="text-[11px]" style={sub}>unassigned</p>
                        )}
                      </div>
                      <div><StatusPill o={o} rosterSize={s.roster_size} /></div>
                      <span className="text-[11px] truncate" style={sub}>{o.note || '—'}</span>
                      <ChevronRight size={14} style={sub} />
                    </div>
                  ))}
                </div>
              </div>
            )}
            <Pager page={occPage} total={filteredOccs.length} onPage={setOccPage} noun="sessions" />
          </div>

          <div>
            <Card style={cardStyle} className="mb-4">
              <SectionHd icon={<Repeat size={15} />} title="Session series" />
              <div className="flex items-center gap-3 px-4 py-3">
                <div className="w-8 h-8 rounded-lg grid place-items-center flex-none" style={{ backgroundColor: colors.brand.primary + '1e', color: colors.brand.primary }}><Repeat size={16} /></div>
                <div className="flex-1"><div className="text-[13px] font-semibold" style={ink}>{s.name}</div><div className="text-[11.5px]" style={sub}>{cadence}</div></div>
                <Pill label={s.qr_ready ? 'QR ready' : 'No QR'} accent={s.qr_ready ? colors.semantic.success : colors.semantic.warning} />
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
            <QRCard blockId={s.block_id} title={s.name} cadence={cadence} />
          </div>
        </div>
      </>
    );
  };

  // ─────────────────────────────────────────────
  // Roster — members table with expandable attendance history
  // ─────────────────────────────────────────────
  const renderRoster = () => {
    const s = selectedSession!;
    const avgAttendance = roster.length === 0 ? null : Math.round(
      roster.reduce((sum, m) => sum + (m.overall > 0 ? (m.attended / m.overall) * 100 : 0), 0) / roster.length
    );
    const overCapCount = roster.filter((m) => m.over_no_show_cap || m.over_substitute_cap).length;
    const duesCount = roster.filter((m) => m.dues_pending).length;
    const term = rosterSearch.trim().toLowerCase();
    const filteredRoster = roster.filter((m) => {
      if (rosterFilter === 'overcap' && !(m.over_no_show_cap || m.over_substitute_cap)) return false;
      if (rosterFilter === 'dues' && !m.dues_pending) return false;
      if (term && !(m.name || '').toLowerCase().includes(term)) return false;
      return true;
    });

    const toggleMember = (id: string) => {
      setExpandedMembers((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id); else next.add(id);
        return next;
      });
    };

    return (
      <>
        <Crumb items={[{ label: 'Group Sessions', onClick: () => setView('overview') }, { label: s.name, onClick: () => setView('group') }, { label: 'Roster' }]} />
        <div className="flex items-center gap-3 flex-wrap">
          <button onClick={() => setView('group')} className="inline-flex items-center gap-1 text-sm" style={sub}><ArrowLeft size={15} /> Back</button>
          <h1 className="text-lg font-semibold" style={ink}>{s.name} · Roster</h1>
        </div>
        <p className="text-sm mt-1 mb-4" style={sub}>{roster.length} members enrolled — click a member to unfold their session history.</p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
          <Kpi icon={<UserRound size={12} />} label="Members" value={roster.length} sub="enrolled" />
          <Kpi icon={<TrendingUp size={12} />} label="Average attendance" value={avgAttendance == null ? '—' : `${avgAttendance}%`} sub="till now" tone="good" />
          <Kpi icon={<AlertTriangle size={12} />} label="Over cap" value={overCapCount} sub="members" tone={overCapCount > 0 ? 'warn' : undefined} />
          <Kpi icon={<Wallet size={12} />} label="Dues due" value={duesCount} sub="members" />
        </div>

        <div className="flex flex-wrap items-center gap-2 mb-3">
          {([['all', `All · ${roster.length}`], ['overcap', `Over cap · ${overCapCount}`], ['dues', `Dues pending · ${duesCount}`]] as [RosterFilter, string][]).map(([key, label]) => (
            <button key={key} onClick={() => { setRosterFilter(key); setRosterPage(1); }} className="px-3 py-1.5 rounded-full border text-xs font-semibold" style={chipStyle(rosterFilter === key)}>
              {label}
            </button>
          ))}
          <div className="relative flex-1 min-w-[200px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={sub} />
            <input
              type="text"
              value={rosterSearch}
              onChange={(e) => { setRosterSearch(e.target.value); setRosterPage(1); }}
              placeholder="Search member…"
              className="w-full pl-9 pr-3 py-1.5 rounded-full border text-xs bg-transparent"
              style={{ ...ink, borderColor: colors.utility.secondaryText + '30' }}
            />
          </div>
        </div>

        {rosterQuery.isLoading ? (
          <div className="py-16 flex justify-center"><LoadingSpinner size="md" /></div>
        ) : filteredRoster.length === 0 ? (
          <div className="py-16 text-center text-sm" style={sub}>{roster.length === 0 ? 'No members yet.' : 'No members match these filters.'}</div>
        ) : (
          <div className="overflow-x-auto">
            <div className="space-y-1.5 min-w-[880px]">
              <div className="grid items-center gap-2 px-3 py-2 text-[10px] font-bold uppercase tracking-wider" style={headStyle(ROSTER_COLS)}>
                <span>Member</span><span>Contract</span><span>Attended</span><span>Caps</span><span>Dues</span><span /><span />
              </div>
              {pageSlice(filteredRoster, rosterPage).map((m) => {
                const overCap = m.over_no_show_cap || m.over_substitute_cap;
                const isExpanded = expandedMembers.has(m.contact_id);
                return (
                  <React.Fragment key={m.contact_id}>
                    <div
                      onClick={() => toggleMember(m.contact_id)}
                      className="grid items-center gap-2 px-3 py-2.5 rounded-lg border cursor-pointer transition-colors"
                      style={rowStyle(ROSTER_COLS, isExpanded ? { borderColor: colors.brand.primary + '60', backgroundColor: colors.brand.primary + '08' } : undefined)}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="h-8 w-8 rounded-lg flex-none inline-flex items-center justify-center text-xs font-bold border" style={{ backgroundColor: colors.brand.primary + '20', borderColor: colors.brand.primary + '40', color: colors.brand.primary }}>
                          {initials(m.name)}
                        </span>
                        <p className="text-xs font-bold truncate" style={ink}>{m.name || '—'}</p>
                      </div>
                      <span className="text-[11px] truncate" style={sub}>{m.contract_name || '—'}</span>
                      <span className="text-xs font-bold tabular-nums" style={{ color: overCap ? colors.semantic.error : colors.utility.primaryText }}>{m.attended}/{m.overall}</span>
                      <div>
                        {overCap ? (
                          <Pill
                            label={m.over_no_show_cap ? `⚠ ${m.missed}/${m.max_no_shows} no-shows` : `⚠ ${m.substituted}/${m.max_substitutes} subs`}
                            accent={colors.semantic.error}
                          />
                        ) : (
                          <Pill label="OK" accent={colors.semantic.success} />
                        )}
                      </div>
                      <div><Pill label={m.dues_pending ? 'Due' : 'Paid'} accent={m.dues_pending ? colors.semantic.warning : colors.semantic.success} /></div>
                      <div onClick={(e) => e.stopPropagation()}>
                        {m.membership_contract_id && (
                          <button
                            onClick={() => navigate(`/contracts/${m.membership_contract_id}?tab=sessions`)}
                            className="inline-flex items-center gap-1 text-[11.5px] font-semibold whitespace-nowrap"
                            style={{ color: colors.brand.primary }}
                          >
                            View contract <ChevronRight size={13} />
                          </button>
                        )}
                      </div>
                      <ChevronDown size={14} style={{ ...sub, transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform .15s ease' }} />
                    </div>

                    {isExpanded && (
                      <div className="rounded-lg border px-4 py-3" style={{ borderColor: colors.brand.primary + '30', backgroundColor: colors.brand.primary + '06' }}>
                        <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={sub}>
                          Session history — ✓ present · ✕ absent · S substitute · · upcoming
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {(m.attendance ?? []).map((a, i) => (
                            <div key={i} title={`${fmtDate(a.date)}${a.present && a.is_substitute ? ' · attended via substitute' : a.present ? ' · present' : a.is_past ? ' · absent' : ' · upcoming'}`}
                              className="w-6 h-6 rounded grid place-items-center text-[10px] font-bold"
                              style={a.present && a.is_substitute ? { backgroundColor: '#8B5CF61e', color: '#8B5CF6' } : a.present ? { backgroundColor: colors.semantic.success + '1e', color: colors.semantic.success } : a.is_past ? { backgroundColor: colors.semantic.warning + '1e', color: colors.semantic.warning } : { backgroundColor: colors.utility.primaryText + '0d', color: colors.utility.secondaryText }}>
                              {a.present && a.is_substitute ? 'S' : a.present ? '✓' : a.is_past ? '✕' : '·'}
                            </div>
                          ))}
                          {(m.attendance ?? []).length === 0 && <span className="text-[11px]" style={sub}>No sessions recorded yet.</span>}
                        </div>
                      </div>
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        )}
        <Pager page={rosterPage} total={filteredRoster.length} onPage={setRosterPage} noun="members" />
      </>
    );
  };

  // ─────────────────────────────────────────────
  // Occurrence — edit controls + attendance table
  // ─────────────────────────────────────────────
  const renderOccurrence = () => {
    const o = selectedOcc!;
    const s = selectedSession!;
    const data = occAttQuery.data;
    const att = data?.roster ?? [];
    const canEdit = editOccId === o.event_id;
    const isHeld = o.status === 'held';
    const term = attSearch.trim().toLowerCase();
    const filteredAtt = att.filter((m) => {
      if (attFilter === 'present' && !m.present) return false;
      if (attFilter === 'absent' && m.present) return false;
      if (term && !(m.name || '').toLowerCase().includes(term)) return false;
      return true;
    });
    const presentCount = att.filter((m) => m.present).length;
    return (
      <>
        <Crumb items={[{ label: 'Group Sessions', onClick: () => setView('overview') }, { label: s.name, onClick: () => setView('group') }, { label: fmtShort(o.date) }]} />
        <div className="flex items-center gap-3 flex-wrap">
          <button onClick={() => setView('group')} className="inline-flex items-center gap-1 text-sm" style={sub}><ArrowLeft size={15} /> Back</button>
          <h1 className="text-lg font-semibold" style={ink}>{s.name}</h1>
          {isHeld && (
            <Pill label={<><Lock size={11} /> Completed — locked</>} accent={colors.semantic.success} />
          )}
        </div>
        <p className="text-sm mt-1 mb-4" style={sub}>{fmtDate(o.date)} · one session occurrence · {data?.present_count ?? 0} present</p>

        {isHeld && (
          <p className="text-[11.5px] mb-4" style={sub}>This session has already been held — the date and chair are locked. Attendance can still be corrected below.</p>
        )}

        {!isHeld && (
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
        )}

        {o.assigned_to_name && (
          <Card style={cardStyle} className="mb-4">
            <div className="flex items-center gap-3 px-4 py-3">
              <div className="w-9 h-9 rounded-lg grid place-items-center flex-none" style={{ backgroundColor: colors.semantic.success + '18', color: colors.semantic.success }}><CalendarClock size={17} /></div>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-semibold" style={ink}>Appointment · {o.assigned_to_name}</div>
                <div className="text-[11.5px]" style={sub}>{fmtDate(o.date)} · chairs this session</div>
              </div>
              <Pill label="Accepted" accent={colors.semantic.success} />
            </div>
          </Card>
        )}

        <div className="flex flex-wrap items-center gap-2 mb-3">
          {([['all', `All · ${att.length}`], ['present', `Present · ${presentCount}`], ['absent', `Absent · ${att.length - presentCount}`]] as [AttFilter, string][]).map(([key, label]) => (
            <button key={key} onClick={() => setAttFilter(key)} className="px-3 py-1.5 rounded-full border text-xs font-semibold" style={chipStyle(attFilter === key)}>
              {label}
            </button>
          ))}
          <div className="relative flex-1 min-w-[180px] max-w-sm">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={sub} />
            <input
              value={attSearch}
              onChange={(e) => setAttSearch(e.target.value)}
              placeholder="Search member…"
              className="w-full pl-9 pr-3 py-1.5 rounded-full border text-xs bg-transparent"
              style={{ ...ink, borderColor: colors.utility.secondaryText + '30' }}
            />
          </div>
        </div>

        {occAttQuery.isLoading ? (
          <div className="py-10 flex justify-center"><LoadingSpinner size="md" /></div>
        ) : filteredAtt.length === 0 ? (
          <div className="py-10 text-center text-sm rounded-lg border" style={{ ...sub, borderColor: colors.utility.primaryText + '15' }}>
            {att.length === 0 ? 'No members on this roster.' : 'No members match these filters.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div className="space-y-1.5 min-w-[620px]">
              <div className="grid items-center gap-2 px-3 py-2 text-[10px] font-bold uppercase tracking-wider" style={headStyle(ATT_COLS)}>
                <span>Member</span><span>Dues</span><span>Status</span><span className="text-right">Mark</span>
              </div>
              {filteredAtt.map((m) => (
                <div key={m.contact_id} className="grid items-center gap-2 px-3 py-2.5 rounded-lg border" style={rowStyle(ATT_COLS)}>
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="h-8 w-8 rounded-lg flex-none inline-flex items-center justify-center text-xs font-bold border" style={{ backgroundColor: colors.brand.primary + '20', borderColor: colors.brand.primary + '40', color: colors.brand.primary }}>
                      {initials(m.name)}
                    </span>
                    <p className="text-xs font-bold truncate" style={ink}>{m.name || '—'}</p>
                  </div>
                  <div><Pill label={m.dues_pending ? 'Due' : 'Paid'} accent={m.dues_pending ? colors.semantic.warning : colors.semantic.success} /></div>
                  <div><Pill label={m.present ? 'Present' : 'Not marked'} accent={m.present ? colors.semantic.success : colors.utility.secondaryText} /></div>
                  <div className="flex justify-end">
                    <button
                      disabled={markAttendance.isPending}
                      onClick={() => markAttendance.mutate({ occurrenceId: o.event_id, memberId: m.contact_id, present: !m.present, memberName: m.name || undefined })}
                      className="px-3 py-1.5 rounded-md text-xs font-semibold border inline-flex items-center gap-1 min-w-[92px] justify-center disabled:opacity-50"
                      style={m.present ? { backgroundColor: colors.semantic.success + '1e', color: colors.semantic.success, borderColor: colors.semantic.success + '55' } : { ...sub, borderColor: colors.utility.primaryText + '22' }}
                    >
                      {m.present ? <><CheckCircle2 size={13} /> Present</> : 'Mark'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </>
    );
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-end mb-1">
        <button
          onClick={() => { sessionsQuery.refetch(); occurrencesQuery.refetch(); rosterQuery.refetch(); occAttQuery.refetch(); declarationsQuery.refetch(); }}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium border" style={{ ...ink, borderColor: colors.utility.primaryText + '22' }}
        >
          <RefreshCw size={14} /> Refresh
        </button>
      </div>
      {view === 'overview' && renderOverview()}
      {view === 'group' && selectedSession && renderGroup()}
      {view === 'roster' && selectedSession && renderRoster()}
      {view === 'occurrence' && selectedOcc && selectedSession && renderOccurrence()}
    </div>
  );
};

export default GroupSessionsPage;
