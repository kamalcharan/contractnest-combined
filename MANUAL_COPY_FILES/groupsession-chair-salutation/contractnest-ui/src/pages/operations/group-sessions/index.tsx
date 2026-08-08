// ============================================================================
// Operations → Group Sessions — chair dashboard (table-pattern redesign)
// ============================================================================
// A "group session" = a catalog block (config.audience='group'). Each block is
// the group; drill-down:
//   Overview (Groups | Payments | Dues tabs) → Group (KPIs · sessions table · series ·
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
// The Dues tab is the whole year's collection position in one grid — every
// member × every month of the April–March financial year, read from the
// billing-event ledger (bbb-foundation/060_gs_dues_matrix), with CSV export.
// Data via /api/group-sessions/*.
// ============================================================================

import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, RefreshCw, AlertTriangle, Inbox, ChevronRight, ChevronLeft, ChevronDown,
  CalendarClock, CheckCircle2, CircleDollarSign, UserRound, ArrowLeft, TrendingUp,
  Wallet, Repeat, Pencil, Ban, X, Check, CalendarPlus, Plus, RotateCcw, Mic,
  UserCog, Lock, Search, Download, Table2,
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
  useGroupSessionDues,
  type GsSessionRow,
  type GsOccurrenceRow,
  type GsDuesRow,
  type GsDuesCellEvent,
} from '@/hooks/queries/useGroupSessionsDashboard';
import { useStatusMap, useTransitionMap } from '@/hooks/queries/useEventStatusConfigQueries';
import { useContractEventOperations } from '@/hooks/queries/useContractEventQueries';
import QRCard from '@/components/group-sessions/QRCard';
import { formatContactDisplayName } from '@/utils/constants/contacts';

// Every screen in this file shows an individual (never corporate), so this
// is just formatContactDisplayName with the type branch pre-filled — same
// canonical formatter Contacts uses, not a private reimplementation.
const displayName = (person: { name: string | null; salutation?: string | null }): string =>
  formatContactDisplayName({ type: 'individual', name: person.name, salutation: person.salutation });

const CHAIR_CLASSIFICATIONS = ['buyer', 'vendor', 'partner', 'team_member'];

type ViewLevel = 'overview' | 'group' | 'occurrence' | 'roster';
type OverviewTab = 'groups' | 'payments' | 'dues';
type DuesPlan = 'all' | 'monthly' | 'quarterly' | 'halfyearly' | 'yearly' | 'none';
type DuesStanding = 'all' | 'owing' | 'clear';
type OccFilter = 'upcoming' | 'past' | 'all';
type RosterFilter = 'all' | 'overcap' | 'dues';
type AttFilter = 'all' | 'present' | 'absent';

const PAGE_SIZE = 10;
// Dues pages deeper than the other tables on purpose. It is the one view read
// as a whole — a chair scans the year's collection position across the roster,
// so 10 rows at a time turns one question into five page turns. The other
// tables stay at 10; this is not a page-wide change.
const DUES_PAGE_SIZE = 50;

// Table column templates (product-wide list pattern)
const GROUPS_COLS = 'minmax(200px,1.6fr) 90px 110px 90px minmax(120px,1fr) 100px 32px';
const OCC_COLS = '110px 44px minmax(160px,1.3fr) minmax(120px,1fr) 130px 32px';
const ROSTER_COLS = 'minmax(180px,1.5fr) minmax(140px,1.1fr) 90px 150px 70px 120px 32px';
const ATT_COLS = 'minmax(180px,1.4fr) 70px 90px 100px 120px';
const PAY_COLS = 'minmax(180px,1.4fr) minmax(130px,1fr) minmax(130px,1fr) minmax(120px,.9fr) 190px';
// Dues grid: fixed member/summary block, then one column per month. The month
// count comes from the server (always 12), so the template is built at render
// time rather than declared as a constant like the tables above.
//
// There is no Plan column — the plan pill sits under the member's name beside
// the contract number, which buys a whole column of width back for the money.
// Cells show the full figure with its currency symbol ("₹18,000", not "18k"),
// so every column has to be wide enough for the largest instalment a yearly
// payer can carry.
const DUES_FIXED_COLS = 'minmax(230px,1.6fr) 96px 92px 100px 100px 100px';
const DUES_MONTH_COL = '84px';
const DUES_FIXED_PX = 230 + 96 + 92 + 100 + 100 + 100;
// Three states have to stay distinguishable at a glance: paid / not-paid /
// not-yet-due. The theme has one amber (`semantic.warning`, #F59E0B) and no
// separate yellow, so the future tint is a local constant. Deliberately NOT
// reusing semantic.warning for both — that is exactly the pair a chair scanning
// the grid needs to tell apart.
const DUES_FUTURE_COLOR = '#CA8A04';

// CSV export — same client-side Blob/anchor pattern as TaxSummarySection,
// no server round-trip, no new dependency.
const csvCell = (v: unknown): string => {
  const s = v == null ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const downloadCsv = (csv: string, filename: string) => {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

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
  // Dues tab. The matrix is per block, so it needs its own group selection —
  // it cannot ride `selectedSession`, which is only set once you drill in.
  const [duesBlock, setDuesBlock] = useState<string | null>(null);
  const [duesSearch, setDuesSearch] = useState('');
  const [duesPlan, setDuesPlan] = useState<DuesPlan>('all');
  const [duesStanding, setDuesStanding] = useState<DuesStanding>('all');
  const [duesPage, setDuesPage] = useState(1);
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

  // Dues: default to the first group so the tab has content on first open
  // instead of an empty "pick a group" state. Only fetched while the tab is
  // showing — this is the heaviest read on the page.
  const activeDuesBlock = duesBlock ?? sessions[0]?.block_id ?? null;
  const duesQuery = useGroupSessionDues(activeDuesBlock, null, {
    enabled: view === 'overview' && overviewTab === 'dues' && !!activeDuesBlock,
  });
  const duesMonths = duesQuery.data?.months ?? [];
  const duesRows = duesQuery.data?.rows ?? [];

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
    // Compare on the raw stored name, not the formatted one — two
    // occurrences assigned to the same person always share the same
    // assigned_to_name regardless of salutation formatting.
    const matching = upcoming.filter((o) => o.assigned_to_name === next.assigned_to_name).length;
    return {
      name: displayName({ name: next.assigned_to_name, salutation: next.assigned_to_salutation }),
      count: matching, total: upcoming.length,
    };
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

  // A contract with nothing in this financial year is a renewal for the next
  // one — active, but not part of this year's collection position. Excluded
  // from the grid and counted separately, never silently dropped.
  const duesOutOfWindow = useMemo(() => duesRows.filter((r) => !r.in_window), [duesRows]);

  // Contacts holding more than one contract IN THIS WINDOW. Normal at renewal
  // and around a mid-year re-signing, so those rows get their contract period
  // shown to tell them apart.
  const duesRepeatContacts = useMemo(() => {
    const seen = new Map<string, number>();
    duesRows.filter((r) => r.in_window).forEach((r) => seen.set(r.contact_id, (seen.get(r.contact_id) || 0) + 1));
    return new Set(Array.from(seen.entries()).filter(([, n]) => n > 1).map(([id]) => id));
  }, [duesRows]);

  const filteredDues = useMemo(() => {
    const term = duesSearch.trim().toLowerCase();
    return duesRows.filter((r) => {
      if (!r.in_window) return false;
      if (duesPlan !== 'all' && r.plan !== duesPlan) return false;
      // "Owing" is money already past its due date — NOT the whole unpaid
      // balance. A member paying quarterly is not in arrears just because
      // January is still ahead of them.
      if (duesStanding === 'owing' && Number(r.due_total || 0) <= 0) return false;
      if (duesStanding === 'clear' && Number(r.due_total || 0) > 0) return false;
      if (term && !(r.name || '').toLowerCase().includes(term) && !(r.contract_number || '').toLowerCase().includes(term)) return false;
      return true;
    });
  }, [duesRows, duesPlan, duesStanding, duesSearch]);

  const duesTotals = useMemo(() => {
    const t = { scheduled: 0, paid: 0, due: 0, future: 0, beyond: 0, beyondMembers: 0, discount: 0 };
    filteredDues.forEach((r) => {
      t.scheduled += Number(r.scheduled_total || 0);
      t.paid += Number(r.paid_total || 0);
      t.due += Number(r.due_total || 0);
      t.future += Number(r.future_total || 0);
      t.discount += Number(r.discount || 0);
      if (Number(r.beyond_count || 0) > 0) { t.beyond += Number(r.beyond_total || 0); t.beyondMembers += 1; }
    });
    return t;
  }, [filteredDues]);

  const duesPlanCounts = useMemo(() => {
    const m = new Map<string, number>();
    duesRows.forEach((r) => m.set(r.plan, (m.get(r.plan) || 0) + 1));
    return m;
  }, [duesRows]);

  // Currency for the SUMMARY figures only. Each row prints its own contract's
  // currency; the KPIs and column totals add rows together, so they are only
  // meaningful when every row in view agrees. If a group ever mixes
  // currencies, null suppresses the symbol rather than stamping ₹ on a total
  // that is not rupees.
  // ── Marking an instalment from the grid ─────────────────────────────────
  // Colours and allowed transitions both come from the tenant's own
  // m_event_status_config / m_event_status_transitions — the same source the
  // contract timeline uses. Nothing about waived/cancelled/bad_debt/adjustment
  // is hardcoded here, so a tenant that renames or recolours a status, or
  // forbids a transition, is honoured on this screen for free.
  const billingStatusMap = useStatusMap('billing');
  const billingTransitions = useTransitionMap('billing');
  const { updateEvent, isUpdating } = useContractEventOperations();
  // Which cell's menu is open, and which instalment inside it is being confirmed.
  const [markCell, setMarkCell] = useState<null | {
    row: GsDuesRow; monthLabel: string; events: GsDuesCellEvent[];
  }>(null);
  const [markConfirm, setMarkConfirm] = useState<null | {
    row: GsDuesRow; monthLabel: string; event: GsDuesCellEvent; to: string;
  }>(null);

  const statusColor = (code: string) =>
    billingStatusMap[code]?.hex_color || colors.utility.secondaryText;
  const statusLabel = (code: string) =>
    billingStatusMap[code]?.display_name || code.replace(/_/g, ' ');

  const applyMark = async () => {
    if (!markConfirm) return;
    const { event, to } = markConfirm;
    try {
      // version travels with the write — the contract page can be changing the
      // same instalment, and losing that race silently would be worse than an
      // error the user can see.
      await updateEvent({ eventId: event.id, updateData: { status: to, version: event.version } as any });
      setMarkConfirm(null);
      setMarkCell(null);
      duesQuery.refetch();
    } catch {
      // useContractEventOperations already surfaces a toast on failure.
      setMarkConfirm(null);
    }
  };

  const duesCurrency = useMemo(() => {
    const set = new Set(filteredDues.map((r) => r.currency || 'INR'));
    return set.size === 1 ? Array.from(set)[0] : null;
  }, [filteredDues]);

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
  // `size` is optional and defaults to PAGE_SIZE, so every existing caller
  // keeps its current behaviour untouched.
  const Pager = ({ page, total, onPage, noun, size = PAGE_SIZE }: { page: number; total: number; onPage: (p: number) => void; noun: string; size?: number }) => {
    const pages = Math.max(1, Math.ceil(total / size));
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
  const pageSlice = <T,>(rows: T[], page: number, size: number = PAGE_SIZE): T[] => {
    const pages = Math.max(1, Math.ceil(rows.length / size));
    const cur = Math.min(page, pages);
    return rows.slice((cur - 1) * size, cur * size);
  };

  // NOTE: the shared ui/Card accepts ONLY className/children — it silently
  // drops style and onClick. A clickable/brand-filled tile must therefore be
  // a real <button>, never a Card (that's how the pre-redesign Roster tile
  // worked, and losing this made it render blank white-on-white).
  const Kpi = ({ icon, label, value, sub: s2, tone, onClick }: { icon: React.ReactNode; label: string; value: React.ReactNode; sub?: string; tone?: 'good' | 'warn'; onClick?: () => void }) => {
    if (onClick) {
      return (
        <button
          onClick={onClick}
          className="text-left rounded-lg p-4 transition-shadow hover:shadow-md"
          style={{ backgroundColor: colors.brand.primary, color: '#fff' }}
        >
          <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide" style={{ color: '#ffffffd9' }}>{icon}{label}</div>
          <div className="text-2xl font-bold mt-1 tabular-nums">{value}</div>
          {s2 && <div className="text-[11px] mt-0.5 inline-flex items-center" style={{ color: '#ffffffd9' }}>{s2}</div>}
        </button>
      );
    }
    return (
      <Card style={cardStyle}>
        <CardContent className="p-4">
          <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide" style={sub}>{icon}{label}</div>
          <div className="text-2xl font-bold mt-1 tabular-nums" style={ink}>{value}</div>
          {s2 && <div className="text-[11px] mt-0.5" style={{ color: tone === 'good' ? colors.semantic.success : tone === 'warn' ? colors.semantic.warning : colors.utility.secondaryText }}>{s2}</div>}
        </CardContent>
      </Card>
    );
  };
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
      // Deliberately the BARE name, unchanged — assigned_to_name is a stored
      // snapshot, same convention as buyer_name/member_name elsewhere in this
      // file. Salutation is added at render time only, via the live join in
      // gs_dash_occurrences — baking it in here would go stale exactly like a
      // frozen name would, plus double up with the separately-tracked
      // assigned_to_salutation on next render.
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
        <button
          onClick={() => setOverviewTab('dues')}
          className="px-4 py-1.5 rounded-lg text-[13px] font-bold inline-flex items-center gap-2"
          style={overviewTab === 'dues' ? { backgroundColor: colors.utility.primaryText, color: colors.utility.primaryBackground } : sub}
        >
          <Table2 size={13} /> Dues
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
            <button
              onClick={() => {
                const header = ['Member', 'Group', 'Amount', 'Currency', 'Reference', 'Declared At'];
                const rows = filteredDeclarations.map((d) => [
                  d.member_name ? displayName({ name: d.member_name, salutation: d.member_salutation }) : d.member_name,
                  d.block_name, d.amount, d.currency, d.upi_reference, d.created_at,
                ]);
                downloadCsv([header, ...rows].map((r) => r.map(csvCell).join(',')).join('\n'), `payments-to-confirm-${new Date().toISOString().slice(0, 10)}.csv`);
              }}
              disabled={!filteredDeclarations.length}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ borderColor: colors.utility.secondaryText + '30', ...sub }}
            >
              <Download size={13} /> Export CSV
            </button>
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
                        <p className="text-xs font-bold truncate" style={ink}>{d.member_name ? displayName({ name: d.member_name, salutation: d.member_salutation }) : '—'}</p>
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

      {overviewTab === 'dues' && renderDues()}
    </>
  );

  // ─────────────────────────────────────────────
  // Overview → Dues — member × month collection grid
  // ─────────────────────────────────────────────
  // Reads the billing-event ledger (gs_dues_matrix), which is the per-instalment
  // record of truth. It is NOT the invoice: a member has one contract-level
  // invoice whose amount_paid accumulates, so the invoice cannot say WHICH
  // month a payment covered — the events can.
  const renderDues = () => {
    const nMonths = Math.max(duesMonths.length, 1);
    const duesCols = `${DUES_FIXED_COLS} repeat(${nMonths}, ${DUES_MONTH_COL})`;
    // fixed block + month columns + the 8px gap between every pair
    const gridMinWidth = DUES_FIXED_PX + nMonths * 84 + (5 + nMonths) * 8 + 28;

    // Summary figures span rows, so they use duesCurrency — null (mixed
    // currencies) prints the bare number rather than a wrong symbol.
    const sumMoney = (n: number) =>
      duesCurrency ? money(n, duesCurrency) : Number(n).toLocaleString();

    // Rows are contracts. Usually one per member, but not at renewal — say
    // both counts when they diverge so the row count is never mistaken for a
    // head count.
    const memberCount = new Set(filteredDues.map((r) => r.contact_id)).size;
    const duesScope = memberCount === filteredDues.length
      ? `${filteredDues.length} member${filteredDues.length === 1 ? '' : 's'}`
      : `${filteredDues.length} contracts · ${memberCount} members`;

    const planLabel = (p: GsDuesRow['plan']) =>
      p === 'monthly' ? 'Monthly'
        : p === 'quarterly' ? 'Quarterly'
        : p === 'halfyearly' ? 'Half-yearly'
        : p === 'yearly' ? 'Yearly'
        : 'No schedule';

    // Plan is derived from instalment spacing server-side, so it stays right
    // even while every contract's billing_cycle_type still reads 'mixed'.
    const planColor = (p: GsDuesRow['plan']) =>
      p === 'none' ? colors.semantic.error : colors.brand.primary;

    // Colour comes from the tenant's status config, so waived / cancelled /
    // bad_debt / adjustment each read as themselves instead of being lumped in
    // with "due". The one derived case is an instalment still sitting on
    // 'scheduled' whose date has not arrived — the config has no separate
    // colour for "not yet due", so it keeps the softer yellow.
    const cellColor = (cell: { status: string; is_open: boolean; is_past: boolean }) =>
      cell.is_open && !cell.is_past ? DUES_FUTURE_COLOR : statusColor(cell.status);

    // The legend swatch is rendered with the SAME tint/border/ink recipe as a
    // real cell, not a solid block of the accent. A solid swatch reads far more
    // saturated than the cells it is meant to key, so the legend and the grid
    // look like different colours even though the hue is identical.
    const swatchStyle = (accent: string): React.CSSProperties => ({
      backgroundColor: accent + '22',
      borderColor: accent + '45',
      borderWidth: 1,
      borderStyle: 'solid',
    });

    const exportCsv = () => {
      const header = [
        'Member', 'Contract', 'Start', 'End', 'Plan', 'Plan source', 'Instalments', 'Currency', 'Contract value', 'Discount', 'Net payable',
        'Scheduled', 'Paid', 'Due now', 'Not yet due', 'Beyond window',
        ...duesMonths.map((m) => `${m.label} ${m.year}`),
      ];
      // Every month cell exports as "amount (status)" so the CSV carries the
      // same information the colours carry on screen — a CSV of bare numbers
      // would lose exactly the thing this grid exists to show.
      // Numbers stay unformatted in the CSV — a spreadsheet must be able to
      // sum them. The currency travels in its own column instead.
      const body = filteredDues.map((r) => [
        r.name ? displayName(r) : r.name, r.contract_number, r.start_date?.slice(0, 10) || '', r.end_date?.slice(0, 10) || '',
        planLabel(r.plan), r.plan_source, r.instalments, r.currency,
        r.contract_value, r.discount, r.net,
        r.scheduled_total, r.paid_total, r.due_total, r.future_total, r.beyond_total,
        ...duesMonths.map((m) => {
          const c = r.cells?.[m.key];
          return c ? `${c.amount} (${c.status})` : '';
        }),
      ]);
      const totalRow = [
        `TOTAL (${duesScope})`, '', '', '', '', '', '', duesCurrency || 'mixed', '', duesTotals.discount, '',
        duesTotals.scheduled, duesTotals.paid, duesTotals.due, duesTotals.future, duesTotals.beyond,
        ...duesMonths.map(() => ''),
      ];
      const name = sessions.find((s) => s.block_id === activeDuesBlock)?.name || 'group';
      downloadCsv(
        [header, ...body, totalRow].map((r) => r.map(csvCell).join(',')).join('\n'),
        `dues-${name.toLowerCase().replace(/\s+/g, '-')}-${duesQuery.data?.fy_start || ''}.csv`
      );
    };

    if (!activeDuesBlock) {
      return (
        <div className="flex flex-col items-center py-12 gap-2">
          <Inbox size={28} style={sub} />
          <p className="text-sm" style={sub}>No group to show dues for yet.</p>
        </div>
      );
    }

    return (
      <>
        {/* Group chips + plan / standing filters + search + export */}
        <div className="flex flex-wrap items-center gap-2 mb-3">
          {sessions.length > 1 && sessions.map((s) => (
            <button
              key={s.block_id}
              onClick={() => { setDuesBlock(s.block_id); setDuesPage(1); }}
              className="px-3 py-1.5 rounded-full border text-xs font-semibold"
              style={chipStyle(activeDuesBlock === s.block_id)}
            >
              {s.name}
            </button>
          ))}
          {(['all', 'monthly', 'quarterly', 'halfyearly', 'yearly', 'none'] as DuesPlan[]).map((p) => {
            const n = p === 'all' ? duesRows.length : (duesPlanCounts.get(p) || 0);
            if (p !== 'all' && n === 0) return null;
            return (
              <button
                key={p}
                onClick={() => { setDuesPlan(p); setDuesPage(1); }}
                className="px-3 py-1.5 rounded-full border text-xs font-semibold"
                style={chipStyle(duesPlan === p)}
              >
                {p === 'all' ? 'All plans' : planLabel(p as GsDuesRow['plan'])} · {n}
              </button>
            );
          })}
          <button
            onClick={() => { setDuesStanding(duesStanding === 'owing' ? 'all' : 'owing'); setDuesPage(1); }}
            className="px-3 py-1.5 rounded-full border text-xs font-semibold"
            style={chipStyle(duesStanding === 'owing')}
          >
            In arrears · {duesRows.filter((r) => Number(r.due_total || 0) > 0).length}
          </button>
          <div className="relative flex-1 min-w-[180px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={sub} />
            <input
              value={duesSearch}
              onChange={(e) => { setDuesSearch(e.target.value); setDuesPage(1); }}
              placeholder="Search member or contract…"
              className="w-full pl-9 pr-3 py-1.5 rounded-full border text-xs bg-transparent"
              style={{ borderColor: colors.utility.secondaryText + '30', ...ink }}
            />
          </div>
          <button
            onClick={exportCsv}
            disabled={!filteredDues.length}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ borderColor: colors.utility.secondaryText + '30', ...sub }}
          >
            <Download size={13} /> Export CSV
          </button>
        </div>

        {duesQuery.isLoading ? (
          <div className="flex justify-center py-12"><LoadingSpinner /></div>
        ) : duesQuery.isError ? (
          <div className="flex flex-col items-center py-12 gap-2">
            <AlertTriangle size={28} style={{ color: colors.semantic.error }} />
            <p className="text-sm" style={sub}>Couldn't load dues.</p>
            <button onClick={() => duesQuery.refetch()} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold" style={{ borderColor: colors.utility.secondaryText + '30', ...ink }}>
              <RefreshCw size={13} /> Retry
            </button>
          </div>
        ) : filteredDues.length === 0 ? (
          <div className="flex flex-col items-center py-12 gap-2">
            <Inbox size={28} style={sub} />
            <p className="text-sm" style={sub}>{duesRows.length === 0 ? 'No members with a billing schedule in this group.' : 'Nothing matches these filters'}</p>
          </div>
        ) : (
          <>
            {/* Year summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              <Kpi icon={<Wallet size={12} />} label="Scheduled" value={sumMoney(duesTotals.scheduled)} sub={`${duesScope}${duesCurrency ? '' : ' · mixed currencies'}`} />
              <Kpi icon={<CheckCircle2 size={12} />} label="Collected" value={sumMoney(duesTotals.paid)} tone="good" sub={duesTotals.scheduled ? `${Math.round((duesTotals.paid / duesTotals.scheduled) * 100)}% of scheduled` : undefined} />
              <Kpi icon={<AlertTriangle size={12} />} label="In arrears" value={sumMoney(duesTotals.due)} tone="warn" sub="past due date" />
              <Kpi icon={<CalendarClock size={12} />} label="Not yet due" value={sumMoney(duesTotals.future)} sub="future instalments" />
            </div>

            <div className="flex flex-wrap items-center gap-3 mb-2 text-[11px]" style={sub}>
              <span>
                {duesQuery.data?.fy_start ? `${fmtDate(duesQuery.data.fy_start)} — ${fmtDate(duesQuery.data.fy_end)}` : ''}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-md" style={swatchStyle(colors.semantic.success)} /> Paid
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-md" style={swatchStyle(colors.semantic.warning)} /> Due / part-paid
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-md" style={swatchStyle(DUES_FUTURE_COLOR)} /> Not yet due
              </span>
            </div>

            <div className="overflow-x-auto">
              <div className="space-y-1.5" style={{ minWidth: gridMinWidth }}>
                <div className="grid items-center gap-2 px-3 py-2 text-[10px] font-bold uppercase tracking-wider" style={headStyle(duesCols)}>
                  <span>Member</span>
                  <span className="text-right">Value</span>
                  <span className="text-right">Discount</span>
                  <span className="text-right">Net</span>
                  <span className="text-right">Paid</span>
                  <span className="text-right">Arrears</span>
                  {duesMonths.map((m) => (
                    <span key={m.key} className="text-center">{m.label}</span>
                  ))}
                </div>

                {pageSlice(filteredDues, duesPage, DUES_PAGE_SIZE).map((r) => (
                  <div
                    /* keyed by CONTRACT — a contact can hold two at renewal,
                       and keying by contact would collide and drop a row */
                    key={r.contract_id}
                    onClick={() => r.contract_id && navigate(`/contracts/${r.contract_id}`)}
                    className="grid items-center gap-2 px-3 py-2.5 rounded-lg border cursor-pointer transition-colors"
                    style={rowStyle(duesCols)}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="h-8 w-8 rounded-lg flex-none inline-flex items-center justify-center text-[10px] font-bold border" style={{ backgroundColor: colors.brand.primary + '20', borderColor: colors.brand.primary + '40', color: colors.brand.primary }}>
                        {initials(r.name)}
                      </span>
                      <div className="min-w-0">
                        <p className="text-xs font-bold truncate" style={ink}>{r.name ? displayName(r) : '—'}</p>
                        {/* Plan pill lives here rather than in its own column —
                            it belongs to the member's identity, and folding it
                            in returns that width to the money columns. */}
                        <div className="flex items-center gap-1.5 mt-0.5 min-w-0">
                          <span title={r.plan_source === 'derived' ? 'Plan inferred from instalment spacing — not recorded on the contract' : undefined}>
                            <Pill
                              label={`${planLabel(r.plan)}${r.instalments ? ` ×${r.instalments}` : ''}${r.plan_source === 'derived' ? '?' : ''}`}
                              accent={planColor(r.plan)}
                            />
                          </span>
                          <span className="text-[10px] truncate" style={sub}>
                            {r.contract_number || '—'}
                            {/* Only shown when this contact holds more than one
                                contract in the window — otherwise it is noise. */}
                            {duesRepeatContacts.has(r.contact_id) && ` · ${fmtShort(r.start_date)}–${fmtShort(r.end_date)}`}
                            {r.beyond_count > 0 && ` · ${money(r.beyond_total, r.currency)} after Mar`}
                          </span>
                        </div>
                      </div>
                    </div>
                    <span className="text-xs font-semibold tabular-nums text-right" style={ink}>{money(r.contract_value, r.currency)}</span>
                    <span className="text-xs tabular-nums text-right" style={Number(r.discount) > 0 ? { color: colors.semantic.success } : sub}>
                      {Number(r.discount) > 0 ? `−${money(r.discount, r.currency)}` : '—'}
                    </span>
                    <span className="text-xs font-bold tabular-nums text-right" style={ink}>{money(r.net, r.currency)}</span>
                    <span className="text-xs font-bold tabular-nums text-right" style={{ color: colors.semantic.success }}>{money(r.paid_total, r.currency)}</span>
                    <span className="text-xs font-bold tabular-nums text-right" style={Number(r.due_total) > 0 ? { color: colors.semantic.warning } : sub}>
                      {Number(r.due_total) > 0 ? money(r.due_total, r.currency) : '—'}
                    </span>

                    {duesMonths.map((m) => {
                      const c = r.cells?.[m.key];
                      if (!c) return <span key={m.key} className="text-center text-[11px]" style={{ color: colors.utility.secondaryText + '55' }}>·</span>;
                      const accent = cellColor(c);
                      // A cell is markable only if at least one instalment in it
                      // has somewhere to go. `paid` is terminal in the config, so
                      // settled months simply have no menu — the state machine
                      // decides that, not this component.
                      const markable = (c.events || []).some(
                        (ev) => (billingTransitions[ev.status] || []).length > 0
                      );
                      return (
                        <span
                          key={m.key}
                          onClick={markable ? (e) => {
                            e.stopPropagation();   // the row itself opens the contract
                            setMarkCell({ row: r, monthLabel: `${m.label} ${m.year}`, events: c.events || [] });
                          } : undefined}
                          title={`${m.label} ${m.year} · ${money(c.amount, r.currency)} · ${statusLabel(c.status)}`
                            + (c.count > 1 ? ` · ${c.count} instalments` : '')
                            + (Number(c.paid) > 0 && c.is_open ? ` · ${money(c.paid, r.currency)} received` : '')
                            + (markable ? ' — click to change status' : '')}
                          className={`text-center text-[11px] font-bold tabular-nums rounded-md border py-1${markable ? ' cursor-pointer hover:brightness-95' : ''}`}
                          style={{ backgroundColor: accent + '22', borderColor: accent + '45', color: accent }}
                        >
                          {money(c.amount, r.currency)}
                        </span>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>

            {/* Status picker. A month can hold more than one instalment, so it
                lists them rather than assuming — and each offers only the
                transitions the tenant's own state machine allows from where it
                currently is. */}
            {markCell && (
              <div
                role="dialog" aria-modal="true" aria-label="Change instalment status"
                className="fixed inset-0 z-50 flex items-center justify-center p-4"
                style={{ backgroundColor: 'rgba(15,15,20,0.55)' }}
                onClick={() => setMarkCell(null)}
              >
                <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-2xl border p-5"
                  style={{ backgroundColor: colors.utility.primaryBackground, borderColor: colors.utility.primaryText + '18' }}>
                  <p className="text-sm font-bold" style={ink}>{displayName(markCell.row)}</p>
                  <p className="text-xs mb-4" style={sub}>
                    {markCell.monthLabel} · {markCell.row.contract_number}
                  </p>

                  {markCell.events.map((ev) => {
                    const allowed = billingTransitions[ev.status] || [];
                    return (
                      <div key={ev.id} className="mb-3 pb-3 border-b last:border-b-0 last:mb-0 last:pb-0"
                        style={{ borderColor: colors.utility.primaryText + '10' }}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold tabular-nums" style={ink}>
                            {money(ev.amount, markCell.row.currency)}
                            <span className="font-normal" style={sub}> · {fmtShort(ev.date)}</span>
                          </span>
                          <Pill label={statusLabel(ev.status)} accent={statusColor(ev.status)} />
                        </div>
                        {allowed.length === 0 ? (
                          <p className="text-[11px]" style={sub}>
                            {statusLabel(ev.status)} is final — this instalment cannot be changed from here.
                          </p>
                        ) : (
                          <div className="flex flex-wrap gap-1.5">
                            {allowed.map((to) => (
                              <button key={to}
                                onClick={() => setMarkConfirm({ row: markCell.row, monthLabel: markCell.monthLabel, event: ev, to })}
                                className="px-2.5 py-1 rounded-lg text-[11px] font-bold border"
                                style={{ backgroundColor: statusColor(to) + '18', borderColor: statusColor(to) + '45', color: statusColor(to) }}
                              >
                                {statusLabel(to)}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  <button onClick={() => setMarkCell(null)}
                    className="w-full mt-4 py-2 rounded-lg border text-xs font-semibold"
                    style={{ borderColor: colors.utility.secondaryText + '30', ...ink }}>
                    Close
                  </button>
                </div>
              </div>
            )}

            {/* Confirm. This moves money out of what a member is told they owe —
                on this grid, in Finance, and on their own check-in page — so it
                names the member, month and amount rather than acting on a tap. */}
            {markConfirm && (
              <div
                role="dialog" aria-modal="true" aria-label="Confirm status change"
                className="fixed inset-0 z-[60] flex items-center justify-center p-4"
                style={{ backgroundColor: 'rgba(15,15,20,0.65)' }}
                onClick={() => !isUpdating && setMarkConfirm(null)}
              >
                <div onClick={(e) => e.stopPropagation()} className="w-full max-w-sm rounded-2xl border p-5"
                  style={{ backgroundColor: colors.utility.primaryBackground, borderColor: colors.utility.primaryText + '18' }}>
                  <p className="text-sm font-bold mb-2" style={ink}>
                    Mark as {statusLabel(markConfirm.to)}?
                  </p>
                  <p className="text-xs mb-1" style={sub}>
                    <b style={ink}>{displayName(markConfirm.row)}</b> · {markConfirm.monthLabel} ·{' '}
                    <b style={ink}>{money(markConfirm.event.amount, markConfirm.row.currency)}</b>
                  </p>
                  <p className="text-xs mb-4" style={sub}>
                    {(billingStatusMap[markConfirm.to]?.is_terminal && markConfirm.to !== 'paid')
                      ? 'This writes the amount off. It stops counting as arrears here, in Finance, and on the member\u2019s check-in page.'
                      : 'This changes what the member is shown as owing.'}
                  </p>
                  <div className="flex gap-2">
                    <button onClick={() => setMarkConfirm(null)} disabled={isUpdating}
                      className="flex-1 py-2 rounded-lg border text-xs font-semibold disabled:opacity-40"
                      style={{ borderColor: colors.utility.secondaryText + '30', ...ink }}>
                      Cancel
                    </button>
                    <button onClick={applyMark} disabled={isUpdating}
                      className="flex-1 py-2 rounded-lg text-xs font-bold text-white disabled:opacity-60"
                      style={{ backgroundColor: statusColor(markConfirm.to) }}>
                      {isUpdating ? 'Saving\u2026' : `Mark ${statusLabel(markConfirm.to)}`}
                    </button>
                  </div>
                </div>
              </div>
            )}

            <Pager page={duesPage} total={filteredDues.length} onPage={setDuesPage} noun={memberCount === filteredDues.length ? 'members' : 'contracts'} size={DUES_PAGE_SIZE} />

            <p className="text-[11px] mt-3" style={sub}>
              Read from each member's billing schedule, so a cell shows which month a payment actually covered —
              the contract-level invoice only carries a running total and cannot.
              {duesTotals.beyondMembers > 0 && ` ${duesTotals.beyondMembers} contract${duesTotals.beyondMembers > 1 ? 's carry' : ' carries'} ${sumMoney(duesTotals.beyond)} of instalments falling after ${fmtDate(duesQuery.data?.fy_end)} — shown under the member's name, not in the grid.`}
              {duesOutOfWindow.length > 0 && ` ${duesOutOfWindow.length} further active contract${duesOutOfWindow.length > 1 ? 's belong' : ' belongs'} to another financial year and ${duesOutOfWindow.length > 1 ? 'are' : 'is'} not counted here.`}
              {' '}One row per contract, not per member — a member holds two during a renewal, and both are shown.
            </p>
          </>
        )}
      </>
    );
  };

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
                          <p className="text-xs font-semibold truncate" style={ink}>{displayName({ name: o.assigned_to_name, salutation: o.assigned_to_salutation })}</p>
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
                        <p className="text-xs font-bold truncate" style={ink}>{m.name ? displayName(m) : '—'}</p>
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
            onAssign={(id, name) => {
              assignChair.mutate({ id: o.event_id, contactId: id, contactName: name });
              // assigned_to_salutation reset to null, not carried over — it's
              // the PREVIOUS chair's value until the invalidateQueries above
              // lands; showing no prefix briefly is safe, showing the wrong
              // one is not.
              setSelectedOcc({ ...o, assigned_to: id, assigned_to_name: name, assigned_to_salutation: null });
            }}
            onRemove={() => {
              assignChair.mutate({ id: o.event_id, contactId: undefined, contactName: undefined });
              setSelectedOcc({ ...o, assigned_to: null, assigned_to_name: null, assigned_to_salutation: null });
            }}
          />
        </div>
        )}

        {o.assigned_to_name && (
          <Card style={cardStyle} className="mb-4">
            <div className="flex items-center gap-3 px-4 py-3">
              <div className="w-9 h-9 rounded-lg grid place-items-center flex-none" style={{ backgroundColor: colors.semantic.success + '18', color: colors.semantic.success }}><CalendarClock size={17} /></div>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-semibold" style={ink}>Appointment · {displayName({ name: o.assigned_to_name, salutation: o.assigned_to_salutation })}</div>
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
          <button
            onClick={() => {
              const header = ['Name', 'Type', 'Status', 'Dues'];
              const rows = filteredAtt.map((m) => [
                m.name, m.type === 'guest' ? 'Guest' : 'Member', m.present ? 'Present' : 'Not marked',
                m.type === 'guest' ? '—' : (m.dues_pending ? 'Due' : 'Paid'),
              ]);
              downloadCsv([header, ...rows].map((r) => r.map(csvCell).join(',')).join('\n'), `attendance-${toInputDate(o.date) || o.date}.csv`);
            }}
            disabled={!filteredAtt.length}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ borderColor: colors.utility.secondaryText + '30', ...sub }}
          >
            <Download size={13} /> Export CSV
          </button>
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
                <span>Member</span><span>Type</span><span>Dues</span><span>Status</span><span className="text-right">Mark</span>
              </div>
              {filteredAtt.map((m) => (
                <div key={m.contact_id} className="grid items-center gap-2 px-3 py-2.5 rounded-lg border" style={rowStyle(ATT_COLS)}>
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="h-8 w-8 rounded-lg flex-none inline-flex items-center justify-center text-xs font-bold border" style={{ backgroundColor: colors.brand.primary + '20', borderColor: colors.brand.primary + '40', color: colors.brand.primary }}>
                      {initials(m.name)}
                    </span>
                    <p className="text-xs font-bold truncate" style={ink}>{m.name ? displayName(m) : '—'}</p>
                  </div>
                  <div><Pill label={m.type === 'guest' ? 'Guest' : 'Member'} accent={m.type === 'guest' ? colors.brand.primary : colors.utility.secondaryText} /></div>
                  <div>{m.type === 'guest' ? <span style={sub}>—</span> : <Pill label={m.dues_pending ? 'Due' : 'Paid'} accent={m.dues_pending ? colors.semantic.warning : colors.semantic.success} />}</div>
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
