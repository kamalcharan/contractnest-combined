// src/pages/ops/register/index.tsx
//
// Commitments Register — /ops/services (was "Event Schedule").
// Ops (/ops/cockpit) is WHAT NEEDS YOU NOW: open commitments only, no raw
// status. This page is EVERYTHING THAT WAS AND IS COMMITTED — the record.
//
// The same vocabulary as the board (owner, 2026-09-17):
//   Collections   every PAYMENT DUE — an instalment under an invoice, an
//                 invoice that is one instalment, or a whole invoice with no
//                 schedule (open ones, Money In's rule) — with its invoice
//                 number, and the number opens the invoice.
//   Services      every SERVICE, on site or virtual — never "a visit".
//   Appointments  the slots agreed or asked for with the customer
//                 (get_appointments_list — the record the old kanban was).
//   Follow-ups    every call task, open or closed — follow-ups you set
//                 yourself and calls assigned to teammates (jtd_tasks, 017).
//   Activity      the tenant-wide timeline — appointments asked/confirmed/
//                 moved/declined, follow-ups, calls, reminders with delivery
//                 status, services assigned/started/done, declarations — by
//                 Who, kind and date, with the message as sent (jtd_activity).
// Same idiom as the board (theme tokens, controls card, chips, 44px targets).
// Never a balance, a total or an ageing sum — Money In is the ledger.

import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowUpRight, Search, RefreshCw, X, Users, List as ListIcon, ChevronDown, ChevronRight, Sparkles, Wrench, IndianRupee, CalendarCheck, CalendarClock, PhoneCall, FileText } from 'lucide-react';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { useAuth } from '@/context/AuthContext';
import { useInvoiceTheme, useStatusMeta } from '../../invoices/ui';
import { fmtMoney, fmtDate } from '@/utils/format';
import { useContractEvents, useContractEventOperations } from '@/hooks/queries/useContractEventQueries';
import { useStatusMap, useTransitionMap } from '@/hooks/queries/useEventStatusConfigQueries';
import { useReceivables, type FinanceInvoice } from '@/hooks/queries/useFinanceQueries';
import { useAppointments, type Appointment } from '@/hooks/queries/useAppointmentQueries';
import { useActivityRegister, useOpsTasks, type ActivityGroup, type RegisterActivityRow, type OpsTask, type TaskKind } from '@/hooks/queries/useCollectionsQueries';
import { rowVisual, statusColor, MessageToggle } from '@/components/ops/HistoryDrawer';
import { clean, fmtTime } from '@/components/ops/JobCard';

// ── the row the events API returns: the event + contract/contact context ────
interface EventRow {
  id: string;
  contract_id: string;
  contract_number?: string | null;
  contract_name?: string | null;
  contract_type?: string | null;          // client / partner / vendor
  /** 'invoice' is synthesised here for a whole-invoice due (no billing event under it) */
  event_type: 'service' | 'billing' | 'invoice' | string;
  block_name: string;
  billing_cycle_label: string | null;
  sequence_number: number;
  total_occurrences: number;
  scheduled_date: string;
  amount: number | null;
  currency: string | null;
  status: string;
  assigned_to: string | null;
  assigned_to_name: string | null;
  version: number;
  buyer_id?: string | null;
  buyer_name?: string | null;
  appointment_id?: string | null;
  appointment_status?: string | null;
  appointment_scheduled_at?: string | null;
  audience?: string | null;
  /** the invoice this instalment belongs to (billing rows), or the invoice itself ('invoice' rows) */
  invoice_id?: string | null;
  days_overdue?: number;
}

type Tab = 'events' | 'activity';
type Lane = 'all' | 'collections' | 'services' | 'appointments' | 'followups';
type When = 'all' | 'past' | 'today' | 'next7' | 'next30' | 'custom';
const PER_PAGE = 100;
const ACT_PAGE = 50;
const ACT_DEFAULT_DAYS = 90;

// The service status machine the backend actually enforces (update_contract_event). The tenant
// config also lists assigned / on_hold / reopened, which the RPC refuses — never offer them.
const SERVICE_STATUSES = ['scheduled', 'due', 'overdue', 'in_progress', 'completed', 'cancelled'];
const SERVICE_TRANSITIONS: Record<string, string[]> = {
  scheduled: ['in_progress', 'cancelled'], due: ['in_progress', 'cancelled'],
  in_progress: ['completed', 'cancelled'], overdue: ['in_progress', 'completed', 'cancelled'],
};
const CLOSED = new Set(['completed', 'cancelled', 'paid', 'waived', 'adjustment', 'bad_debt']);
const APPT_STATUSES: Array<{ code: string; label: string }> = [
  { code: 'requested', label: 'Slot proposed' }, { code: 'accepted', label: 'Confirmed' }, { code: 'rescheduled', label: 'Customer proposed' },
  { code: 'no_response', label: 'No response' }, { code: 'declined', label: 'Not needed' }, { code: 'completed', label: 'Completed' }, { code: 'cancelled', label: 'Cancelled' },
];
const APPT_CLOSED = new Set(['completed', 'declined', 'cancelled', 'no_response']);

const GROUPS: Array<{ key: ActivityGroup; label: string }> = [
  { key: 'appointments', label: 'Appointments' }, { key: 'followups', label: 'Follow-ups' }, { key: 'calls', label: 'Calls' },
  { key: 'reminders', label: 'Reminders' }, { key: 'visits', label: 'Services' }, { key: 'payments', label: 'Payments' }, { key: 'other', label: 'Other' },
];

const TAB_KEY = 'ops.register.tab';
const readTab = (): Tab => { try { const v = window.localStorage.getItem(TAB_KEY); return v === 'activity' ? 'activity' : 'events'; } catch { return 'events'; } };
const isoDay = (d: Date) => { const p = (n: number) => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`; };
const addDays = (d: Date, n: number) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const today0 = () => { const t = new Date(); t.setHours(0, 0, 0, 0); return t; };
const whenRange = (w: When, from: string, to: string): { date_from?: string; date_to?: string } => {
  const t = today0();
  switch (w) {
    case 'past': return { date_to: isoDay(addDays(t, -1)) };
    case 'today': return { date_from: isoDay(t), date_to: isoDay(t) };
    case 'next7': return { date_from: isoDay(t), date_to: isoDay(addDays(t, 7)) };
    case 'next30': return { date_from: isoDay(t), date_to: isoDay(addDays(t, 30)) };
    case 'custom': return { date_from: from || undefined, date_to: to || undefined };
    default: return {};
  }
};
/** Client-side twin of whenRange for rows that do not come from the events API (whole invoices, appointments). */
const inWhen = (day: string | null | undefined, r: { date_from?: string; date_to?: string }) => {
  if (!r.date_from && !r.date_to) return true;
  if (!day) return false;
  const d = day.slice(0, 10);
  return (!r.date_from || d >= r.date_from) && (!r.date_to || d <= r.date_to);
};
/** "quarterly 3/4" — and never "Custom Cycle 1/13 1/13" when the label already carries the count. */
const cycleText = (label: string | null | undefined, seq: number | null | undefined, total: number | null | undefined) => {
  const l = (label || 'instalment').trim();
  if (!seq || !total) return l;
  const suffix = `${seq}/${total}`;
  return l.includes(suffix) ? l : `${l} ${suffix}`;
};

const CommitmentsRegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentTenant, perspective } = useAuth() as any;
  const { colors, ink, sub } = useInvoiceTheme();
  const invoiceMeta = useStatusMeta();
  const brand = colors.brand.primary;
  const green = colors.semantic.success;
  const red = colors.semantic.error;
  const amber = colors.semantic.warning;
  const mono: React.CSSProperties = { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' };
  const hairline = `${colors.utility.primaryText}14`;

  const [tab, setTabState] = useState<Tab>(readTab);
  const setTab = (t: Tab) => { setTabState(t); try { window.localStorage.setItem(TAB_KEY, t); } catch { /* ignore */ } };

  // ── Events tab state ──
  const [lane, setLaneState] = useState<Lane>('all');
  const [status, setStatus] = useState('');
  const [taskKind, setTaskKind] = useState<TaskKind | ''>('');
  const [when, setWhen] = useState<When>('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [who, setWho] = useState('');
  const [showClosed, setShowClosed] = useState(true);
  const [grouped, setGrouped] = useState(true);
  const [search, setSearch] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [statusMenu, setStatusMenu] = useState<string | null>(null);
  useEffect(() => { const t = setTimeout(() => setQ(search.trim().toLowerCase()), 250); return () => clearTimeout(t); }, [search]);
  useEffect(() => { setPage(1); }, [lane, status, when, from, to, who]);
  const setLane = (l: Lane) => { setLaneState(l); setStatus(''); setTaskKind(''); };
  const range = whenRange(when, from, to);
  const eventsLane = lane === 'all' || lane === 'collections' || lane === 'services';

  // events (services + instalments) — the events API, server-side filters
  const eventsQuery = useContractEvents({
    event_type: lane === 'services' ? 'service' as any : lane === 'collections' ? 'billing' as any : undefined,
    status: status ? (status as any) : undefined,
    assigned_to: who || undefined,
    ...range,
    page, per_page: PER_PAGE, sort_by: 'scheduled_date', sort_order: when === 'past' ? 'desc' : 'asc',
  }, { enabled: tab === 'events' && eventsLane });
  const eventRows = ((eventsQuery.data?.items as unknown as EventRow[]) || []);
  const total = eventsQuery.data?.total_count || 0;
  const { updateStatus, changingStatusEventId } = useContractEventOperations();
  const serviceStatusMap = useStatusMap('service');
  const billingStatusMap = useStatusMap('billing');
  const billingTransitions = useTransitionMap('billing');

  // invoices — the same receivables payload Money In and /invoices read (no new backend): invoice numbers for
  // instalment rows, and the OPEN whole-invoice dues (events rows with id null = no billing event under them)
  const receivables = useReceivables({ enabled: tab === 'events' && eventsLane && lane !== 'services' && perspective !== 'expense' });
  const invById = useMemo(() => {
    const m = new Map<string, FinanceInvoice>();
    for (const i of receivables.data?.invoices || []) m.set(i.id, i);
    return m;
  }, [receivables.data]);
  const wholeInvoiceRows = useMemo<EventRow[]>(() => {
    if (lane === 'services') return [];
    const out: EventRow[] = [];
    for (const ev of receivables.data?.events || []) {
      if (ev.id !== null) continue;
      const inv = invById.get(ev.invoice_id);
      out.push({
        id: `inv:${ev.invoice_id}`, contract_id: ev.contract_id, contract_number: ev.contract_number, contract_name: ev.contract_name,
        event_type: 'invoice', block_name: 'Whole invoice', billing_cycle_label: null, sequence_number: 1, total_occurrences: 1,
        scheduled_date: ev.due_on || inv?.issued_at || inv?.created_at || '', amount: ev.open_amount, currency: inv?.currency || 'INR',
        status: inv?.status || 'unpaid', assigned_to: null, assigned_to_name: null, version: 0,
        buyer_id: ev.buyer_id, buyer_name: ev.buyer_name, invoice_id: ev.invoice_id, days_overdue: ev.days_overdue, audience: ev.is_group_session ? 'group' : null,
      });
    }
    return out;
  }, [receivables.data, invById, lane]);

  // appointments — the existing list RPC; filters applied here (small list, one fetch)
  const appointments = useAppointments({ enabled: tab === 'events' && lane === 'appointments' });
  // follow-ups — jtd_tasks (017); server-side filters
  const tasks = useOpsTasks({
    from: range.date_from, to: range.date_to, who: who || undefined, kind: taskKind || undefined,
    state: showClosed ? 'all' : 'open', q: q || undefined, limit: 200,
  }, { enabled: tab === 'events' && lane === 'followups' });

  const statusLabel = (e: EventRow) => {
    if (e.event_type === 'invoice') {
      const m = invoiceMeta((e.status === 'overdue' ? 'unpaid' : e.status) as any, (e.days_overdue || 0) > 0);
      return { label: m.label, color: m.color };
    }
    const def: any = (e.event_type === 'billing' ? billingStatusMap : serviceStatusMap)?.[e.status];
    return { label: def?.display_name || e.status.replace(/_/g, ' '), color: def?.hex_color || (CLOSED.has(e.status) ? colors.utility.secondaryText : e.status === 'overdue' ? red : brand) };
  };
  const transitionsFor = (e: EventRow): string[] =>
    e.event_type === 'invoice' ? [] : e.event_type === 'billing' ? (((billingTransitions as any)?.[e.status] as string[]) || []) : (SERVICE_TRANSITIONS[e.status] || []);
  const statusOptions = useMemo(() => {
    const toList = (m: any, allow?: string[]) => Object.entries(m || {})
      .filter(([code]) => !allow || allow.includes(code))
      .map(([code, def]: any) => ({ code, label: def?.display_name || code.replace(/_/g, ' '), order: def?.display_order ?? 999 }))
      .sort((a, b) => a.order - b.order);
    if (lane === 'services') return toList(serviceStatusMap, SERVICE_STATUSES);
    if (lane === 'collections') return toList(billingStatusMap);
    if (lane === 'appointments') return APPT_STATUSES.map((s) => ({ code: s.code, label: s.label, order: 0 }));
    return [];
  }, [lane, serviceStatusMap, billingStatusMap]);

  const matchesQ = (...vals: Array<string | null | undefined>) => !q || vals.filter(Boolean).some((v) => String(v).toLowerCase().includes(q));

  // ── the rows of the current lane, normalised for grouping ──
  interface Item { id: string; buyerKey: string; buyerName: string; open: boolean; day: string; node: React.ReactNode }

  const visibleEvents = useMemo(() => {
    const base = eventRows.filter((e) => (showClosed || !CLOSED.has(e.status)) &&
      matchesQ(e.block_name, e.contract_name, e.contract_number, e.buyer_name, e.assigned_to_name, e.invoice_id ? invById.get(e.invoice_id)?.invoice_number : null));
    // whole invoices are open by definition; they take the same When / search filters, and drop out under a status or Who filter that cannot apply to them
    const whole = (page === 1 && !status && !who) ? wholeInvoiceRows.filter((e) => inWhen(e.scheduled_date, range) && matchesQ(e.block_name, e.contract_name, e.contract_number, e.buyer_name, invById.get(e.invoice_id!)?.invoice_number)) : [];
    const all = [...base, ...whole];
    if (whole.length) all.sort((a, b) => when === 'past' ? b.scheduled_date.localeCompare(a.scheduled_date) : a.scheduled_date.localeCompare(b.scheduled_date));
    return all;
  }, [eventRows, wholeInvoiceRows, showClosed, q, invById, page, status, who, when, from, to]); // eslint-disable-line react-hooks/exhaustive-deps

  const visibleAppts = useMemo(() => (appointments.data || []).filter((a) =>
    (showClosed || !APPT_CLOSED.has(a.status)) && (!status || a.status === status) && (!who || a.assigned_to === who) &&
    inWhen(a.scheduled_at || a.event_date, range) && matchesQ(a.block_name, a.contract_name, a.contract_number, a.buyer_name, a.assigned_to_name)
  ).sort((a, b) => (when === 'past' ? -1 : 1) * String(a.scheduled_at || a.event_date).localeCompare(String(b.scheduled_at || b.event_date))),
  [appointments.data, showClosed, status, who, when, from, to, q]); // eslint-disable-line react-hooks/exhaustive-deps

  const changeStatus = async (e: EventRow, next: string) => {
    setStatusMenu(null);
    try { await updateStatus({ eventId: e.id, newStatus: next as any, version: e.version as any }); } catch { /* toasted by the hook */ }
  };

  // ── Activity tab state ──
  const [aGroup, setAGroup] = useState<ActivityGroup | null>(null);
  const [aWho, setAWho] = useState('');
  const [aFrom, setAFrom] = useState('');
  const [aTo, setATo] = useState('');
  const [aSearch, setASearch] = useState('');
  const [aQ, setAQ] = useState('');
  const [aLimit, setALimit] = useState(ACT_PAGE);
  useEffect(() => { const t = setTimeout(() => setAQ(aSearch.trim()), 300); return () => clearTimeout(t); }, [aSearch]);
  useEffect(() => { setALimit(ACT_PAGE); }, [aGroup, aWho, aFrom, aTo, aQ]);
  // Default window: the last 90 days (the RPC's own default of 30 hid a whole quarter of appointments). The team list rides on this query.
  const activity = useActivityRegister({
    from: aFrom || isoDay(addDays(today0(), -ACT_DEFAULT_DAYS)), to: aTo || undefined,
    groups: aGroup ? [aGroup] : undefined, who: aWho || undefined, q: aQ || undefined, limit: aLimit,
  });
  const team = activity.data?.team || tasks.data?.team || [];

  // ── chrome ──
  const Seg: React.FC<{ on: boolean; onClick: () => void; title?: string; children: React.ReactNode }> = ({ on, onClick, title, children }) => (
    <button onClick={onClick} title={title} aria-pressed={on}
      className="inline-flex items-center gap-1 px-3 min-h-[36px] rounded-full text-[11px] font-bold whitespace-nowrap"
      style={on ? { backgroundColor: brand, color: '#fff' } : { color: brand, backgroundColor: 'transparent' }}>{children}</button>
  );
  const Chip: React.FC<{ on: boolean; onClick: () => void; color?: string; children: React.ReactNode }> = ({ on, onClick, color, children }) => (
    <button onClick={onClick} aria-pressed={on}
      className="inline-flex items-center gap-1.5 px-3 min-h-[36px] rounded-full text-[11.5px] font-bold border whitespace-nowrap"
      style={on ? { backgroundColor: color || brand, color: '#fff', borderColor: color || brand }
                : { color: color || colors.utility.primaryText, borderColor: `${color || colors.utility.primaryText}35`, backgroundColor: colors.utility.primaryBackground }}>{children}</button>
  );
  const selectStyle: React.CSSProperties = {
    border: `1px solid ${colors.utility.primaryText}30`, borderRadius: 999, padding: '0 12px', fontSize: 11.5, fontWeight: 700,
    backgroundColor: colors.utility.primaryBackground, color: colors.utility.primaryText, minHeight: 36,
  };
  const Pill: React.FC<{ color: string; children: React.ReactNode; onClick?: () => void; title?: string }> = ({ color, children, onClick, title }) => (
    <button onClick={onClick} disabled={!onClick} title={title}
      className="text-[10px] font-bold px-2.5 py-1 rounded-full border whitespace-nowrap disabled:cursor-default"
      style={{ color, borderColor: `${color}55`, backgroundColor: `${color}14` }}>{children}</button>
  );
  const openBoard = (contractNumber: string | null | undefined, focus: 'services' | 'collections') =>
    navigate(`/ops/cockpit?focus=${focus}&q=${encodeURIComponent(contractNumber || '')}`);
  const openInvoice = (contractId: string | null | undefined, invoiceId: string) =>
    navigate(contractId ? `/contracts/${contractId}/invoice/${invoiceId}` : `/invoices/${invoiceId}`);
  const InvoiceLink: React.FC<{ contractId?: string | null; invoiceId?: string | null; number?: string | null }> = ({ contractId, invoiceId, number }) =>
    invoiceId ? (
      <button onClick={() => openInvoice(contractId, invoiceId)} className="inline-flex items-center gap-1 text-[11px] font-bold" style={{ ...mono, color: brand }} title="View the invoice">
        <FileText size={11} /> {number || 'Invoice'}
      </button>
    ) : <span className="text-[11px]" style={sub}>—</span>;

  const GRID = 'minmax(180px,1.4fr) minmax(200px,1.6fr) 120px 150px 140px 150px 40px';
  const contractCell = (contractId: string, contractNumber: string | null | undefined, title: string, indent?: boolean) => (
    <div className={`min-w-0 ${indent ? 'pl-4' : ''}`}>
      <p className="text-[13px] font-bold truncate" style={ink}>{title}</p>
      <button onClick={() => navigate(`/contracts/${contractId}`)} className="text-[10px] font-bold" style={{ ...mono, color: brand }}>{contractNumber}</button>
    </div>
  );
  const rowClass = 'grid items-center gap-3 px-4 py-2.5 border-t';

  // ── Events row (services · instalments · whole invoices) ──
  const EventLine: React.FC<{ e: EventRow; indent?: boolean }> = ({ e, indent }) => {
    const isBilling = e.event_type === 'billing';
    const isWhole = e.event_type === 'invoice';
    const s = statusLabel(e);
    const next = transitionsFor(e);
    const busy = changingStatusEventId === e.id;
    const inv = e.invoice_id ? invById.get(e.invoice_id) : undefined;
    const slot = e.event_type === 'service' ? (e.appointment_status === 'accepted' ? { t: 'Slot confirmed', c: green } : e.appointment_status && e.appointment_scheduled_at ? { t: 'Slot proposed', c: amber } : CLOSED.has(e.status) ? null : { t: 'No slot', c: colors.utility.secondaryText }) : null;
    return (
      <div className={rowClass} style={{ gridTemplateColumns: GRID, borderColor: hairline }}>
        {contractCell(e.contract_id, e.contract_number, grouped ? (e.contract_name || e.contract_number || '') : (clean(e.buyer_name) || e.contract_number || ''), indent)}
        <div className="min-w-0">
          <p className="text-[12.5px] truncate flex items-center gap-1.5" style={ink}>
            {isWhole ? <FileText size={12} style={{ color: amber, flexShrink: 0 }} /> : isBilling ? <IndianRupee size={12} style={{ color: green, flexShrink: 0 }} /> : <Wrench size={12} style={{ color: brand, flexShrink: 0 }} />}
            <span className="truncate">{isWhole ? `Invoice ${inv?.invoice_number || ''}` : e.block_name}</span>
          </p>
          <p className="text-[11px]" style={sub}>
            {isWhole ? `whole invoice · no instalment schedule${e.amount != null ? ` · ${fmtMoney(e.amount, e.currency || 'INR')} open` : ''}`
              : isBilling ? `${cycleText(e.billing_cycle_label, e.sequence_number, e.total_occurrences)}${e.amount != null ? ` · ${fmtMoney(e.amount, e.currency || 'INR')}` : ''}`
              : `service ${e.sequence_number} of ${e.total_occurrences}`}
          </p>
        </div>
        <p className="text-[12px] tabular-nums" style={{ color: e.status === 'overdue' || (isWhole && (e.days_overdue || 0) > 0) ? red : colors.utility.primaryText }}>{e.scheduled_date ? fmtDate(e.scheduled_date) : '—'}</p>
        <div className="relative">
          <Pill color={s.color} onClick={next.length ? () => setStatusMenu(statusMenu === e.id ? null : e.id) : undefined} title={next.length ? 'Change status' : undefined}>
            {busy ? '…' : s.label}{next.length ? <ChevronDown size={10} style={{ display: 'inline', marginLeft: 4 }} /> : null}
          </Pill>
          {statusMenu === e.id && (
            <div className="absolute z-20 mt-1 rounded-xl border p-1 min-w-[160px]" style={{ backgroundColor: colors.utility.primaryBackground, borderColor: hairline, boxShadow: '0 8px 24px rgba(0,0,0,.12)' }}>
              {next.map((n) => (
                <button key={n} onClick={() => changeStatus(e, n)} className="block w-full text-left px-3 py-2 rounded-lg text-[12px] font-bold hover:opacity-80" style={ink}>
                  → {((isBilling ? billingStatusMap : serviceStatusMap) as any)?.[n]?.display_name || n.replace(/_/g, ' ')}
                </button>
              ))}
            </div>
          )}
        </div>
        <p className="text-[12px] truncate" style={e.assigned_to_name ? ink : sub}>{e.assigned_to_name || (e.event_type === 'service' ? 'no technician' : '—')}</p>
        <div className="min-w-0">
          {slot ? <Pill color={slot.c} onClick={CLOSED.has(e.status) ? undefined : () => openBoard(e.contract_number, 'services')} title="Open on the Ops board">{slot.t}{e.appointment_status === 'accepted' && e.appointment_scheduled_at ? ` · ${fmtDate(e.appointment_scheduled_at)}` : ''}</Pill>
            : e.invoice_id ? <InvoiceLink contractId={e.contract_id} invoiceId={e.invoice_id} number={inv?.invoice_number} />
            : e.audience === 'group' ? <Pill color={green} onClick={() => navigate('/group-sessions')}>Group session</Pill>
            : isBilling ? <span className="text-[11px]" style={sub} title="No invoice raised yet for this instalment">no invoice yet</span>
            : <span className="text-[11px]" style={sub}>—</span>}
        </div>
        <button onClick={() => navigate(`/contracts/${e.contract_id}`)} title="Open contract" className="inline-flex items-center justify-center min-h-[36px]" style={{ color: brand }}><ArrowUpRight size={14} /></button>
      </div>
    );
  };

  // ── Appointments row ──
  const ApptLine: React.FC<{ a: Appointment; indent?: boolean }> = ({ a, indent }) => {
    // 022: "Asked" only when the customer actually got the link (asked_at); a bare row is a slot we proposed
    const st = a.status === 'requested' && a.asked_at ? { code: 'requested', label: `Asked${a.ask_count && a.ask_count > 1 ? ` ×${a.ask_count}` : ''}` } : APPT_STATUSES.find((s) => s.code === a.status);
    const c = a.status === 'accepted' ? green : a.status === 'requested' || a.status === 'rescheduled' ? amber : APPT_CLOSED.has(a.status) ? colors.utility.secondaryText : brand;
    const closed = APPT_CLOSED.has(a.status);
    return (
      <div className={rowClass} style={{ gridTemplateColumns: GRID, borderColor: hairline }}>
        {contractCell(a.contract_id, a.contract_number, grouped ? (a.contract_name || a.contract_number || '') : (clean(a.buyer_name) || a.contract_number || ''), indent)}
        <div className="min-w-0">
          <p className="text-[12.5px] truncate flex items-center gap-1.5" style={ink}><Wrench size={12} style={{ color: brand, flexShrink: 0 }} /><span className="truncate">{a.block_name || 'Service'}</span></p>
          <p className="text-[11px]" style={sub}>service planned {a.event_date ? fmtDate(a.event_date) : '—'} · {(a.event_status || '').replace(/_/g, ' ')}</p>
        </div>
        <p className="text-[12px] tabular-nums" style={ink}>{a.scheduled_at ? fmtTime(a.scheduled_at) : a.proposed_slots?.length ? `${a.proposed_slots.length} proposed` : '—'}</p>
        <div><Pill color={c}>{st?.label || a.status.replace(/_/g, ' ')}</Pill></div>
        <p className="text-[12px] truncate" style={a.assigned_to_name ? ink : sub}>{a.assigned_to_name || 'no technician'}</p>
        <div>
          {!closed
            ? <Pill color={brand} onClick={() => openBoard(a.contract_number, 'services')} title="Confirm, reschedule or ask the customer on the Ops board">On the board <ArrowUpRight size={10} style={{ display: 'inline' }} /></Pill>
            : <span className="text-[11px]" style={{ ...sub, ...mono }}>{fmtDate(a.updated_at)}</span>}
        </div>
        <button onClick={() => navigate(`/contracts/${a.contract_id}`)} title="Open contract" className="inline-flex items-center justify-center min-h-[36px]" style={{ color: brand }}><ArrowUpRight size={14} /></button>
      </div>
    );
  };

  // ── Follow-ups row ──
  const TaskLine: React.FC<{ t: OpsTask; indent?: boolean }> = ({ t, indent }) => {
    const isFollowUp = t.kind === 'follow_up';
    const c = t.state === 'closed' ? colors.utility.secondaryText : t.overdue ? red : isFollowUp ? brand : amber;
    const label = t.state === 'closed' ? `Done${t.outcome ? ` · ${t.outcome === 'no_answer' ? 'no answer' : t.outcome}` : ''}` : t.overdue ? 'Overdue' : t.days === 0 ? 'Due today' : 'Open';
    return (
      <div className={rowClass} style={{ gridTemplateColumns: GRID, borderColor: hairline }}>
        {t.contract_id
          ? contractCell(t.contract_id, t.contract_number, grouped ? (t.contract_number || '') : (clean(t.buyer_name) || t.contract_number || ''), indent)
          : <p className={`text-[13px] font-bold truncate ${indent ? 'pl-4' : ''}`} style={ink}>{clean(t.buyer_name) || 'Unknown'}</p>}
        <div className="min-w-0">
          <p className="text-[12.5px] truncate flex items-center gap-1.5" style={ink}>
            {isFollowUp ? <CalendarClock size={12} style={{ color: brand, flexShrink: 0 }} /> : <PhoneCall size={12} style={{ color: amber, flexShrink: 0 }} />}
            <span className="truncate">{isFollowUp ? 'Follow-up' : 'Call assigned'}{t.amount != null ? ` · ${fmtMoney(t.amount, t.currency || 'INR')}` : ''}{t.cycle_label ? ` · ${t.cycle_label}` : ''}</span>
          </p>
          <p className="text-[11px] truncate" style={sub}>{t.notes || (t.payment_due ? `payment due ${fmtDate(t.payment_due)}` : '')}</p>
        </div>
        <p className="text-[12px] tabular-nums" style={{ color: t.overdue ? red : colors.utility.primaryText }}>{fmtDate(t.due_on)}</p>
        <div><Pill color={c}>{label}</Pill></div>
        <p className="text-[12px] truncate" style={t.assigned_to_name ? ink : sub}>{t.assigned_to_name || 'unassigned'}</p>
        <div className="min-w-0">
          {t.invoice_id
            ? <InvoiceLink contractId={t.contract_id} invoiceId={t.invoice_id} number={t.invoice_number} />
            : <span className="text-[11px] truncate block" style={{ ...sub, ...mono }} title={t.set_at ? `set ${fmtTime(t.set_at)}` : undefined}>set by {t.set_by_type === 'vani' ? 'VaNi' : clean(t.set_by_name) || 'someone'}</span>}
        </div>
        <button onClick={() => t.state === 'open' ? openBoard(t.contract_number, 'collections') : t.contract_id && navigate(`/contracts/${t.contract_id}`)} title={t.state === 'open' ? 'Log the call on the Ops board' : 'Open contract'} className="inline-flex items-center justify-center min-h-[36px]" style={{ color: brand }}><ArrowUpRight size={14} /></button>
      </div>
    );
  };

  // ── the current lane as items (grouping is shared) ──
  const items = useMemo<Item[]>(() => {
    if (lane === 'appointments') return visibleAppts.map((a) => ({ id: a.id, buyerKey: a.buyer_id || a.buyer_name || 'unknown', buyerName: clean(a.buyer_name) || 'Unknown customer', open: !APPT_CLOSED.has(a.status), day: String(a.scheduled_at || a.event_date), node: null }));
    if (lane === 'followups') return (tasks.data?.rows || []).map((t) => ({ id: t.id, buyerKey: t.buyer_id || t.buyer_name || 'unknown', buyerName: clean(t.buyer_name) || 'Unknown customer', open: t.state === 'open', day: t.due_on, node: null }));
    return visibleEvents.map((e) => ({ id: e.id, buyerKey: e.buyer_id || e.buyer_name || 'unknown', buyerName: clean(e.buyer_name) || 'Unknown customer', open: e.event_type === 'invoice' || !CLOSED.has(e.status), day: e.scheduled_date, node: null }));
  }, [lane, visibleAppts, tasks.data, visibleEvents]);
  const renderItem = (id: string, indent?: boolean): React.ReactNode => {
    if (lane === 'appointments') { const a = visibleAppts.find((x) => x.id === id); return a ? <ApptLine key={id} a={a} indent={indent} /> : null; }
    if (lane === 'followups') { const t = tasks.data?.rows.find((x) => x.id === id); return t ? <TaskLine key={id} t={t} indent={indent} /> : null; }
    const e = visibleEvents.find((x) => x.id === id); return e ? <EventLine key={id} e={e} indent={indent} /> : null;
  };
  const groups = useMemo(() => {
    const m = new Map<string, { key: string; name: string; ids: string[]; open: number }>();
    for (const it of items) {
      if (!m.has(it.buyerKey)) m.set(it.buyerKey, { key: it.buyerKey, name: it.buyerName, ids: [], open: 0 });
      const g = m.get(it.buyerKey)!; g.ids.push(it.id); if (it.open) g.open += 1;
    }
    return Array.from(m.values()).sort((a, b) => b.open - a.open || b.ids.length - a.ids.length);
  }, [items]);
  useEffect(() => { setOpen(new Set(groups.map((g) => g.key))); }, [groups.length, lane]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Activity row (the History drawer's row, plus the contract) ──
  const ActivityLine: React.FC<{ r: RegisterActivityRow }> = ({ r }) => {
    const { Icon, color } = rowVisual(r, colors);
    const whoName = r.actor_type === 'vani' ? 'VaNi' : clean(r.actor_name) || (r.actor_type === 'system' ? 'System' : r.actor_type === 'customer' ? 'Customer' : 'Someone');
    return (
      <div className="relative pl-10 py-2.5 border-t" style={{ borderColor: hairline }}>
        <span className="absolute left-0 top-3 w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${color}14` }}>
          {r.actor_type === 'vani' ? <Sparkles size={14} style={{ color }} /> : <Icon size={14} style={{ color }} />}
        </span>
        <div className="flex items-start justify-between gap-3">
          <p className="text-[13px] font-semibold leading-snug" style={ink}>{r.title}</p>
          <button onClick={() => navigate(`/contracts/${r.contract_id}`)} className="flex-none text-[11px] font-bold inline-flex items-center gap-1" style={{ color: brand }}>
            {clean(r.buyer_name) || r.contract_number}{r.buyer_name && r.contract_number ? <span style={{ ...mono, opacity: .7 }}> · {r.contract_number}</span> : null} <ArrowUpRight size={11} />
          </button>
        </div>
        {(r.from || r.to) && <p className="text-[11px] mt-0.5" style={sub}>{(r.from || '—').replace(/_/g, ' ')} → <b style={{ color }}>{(r.to || '—').replace(/_/g, ' ')}</b></p>}
        {r.detail && <p className="text-[11.5px] mt-0.5" style={sub}>{r.detail}</p>}
        <MessageToggle message={r.message} channel={r.channel} colors={colors} />
        <p className="text-[10.5px] mt-1 flex items-center gap-2 flex-wrap" style={{ ...sub, ...mono }}>
          <span>{whoName}</span><span>·</span><span>{fmtTime(r.at)}</span>
          {r.status && <><span>·</span><span className="font-bold" style={{ color: statusColor(r.status, colors) }}>{r.status}</span></>}
          {r.amount != null && r.group === 'payments' && <><span>·</span><span>{fmtMoney(r.amount, r.currency || 'INR')}</span></>}
        </p>
      </div>
    );
  };

  const laneQuery = lane === 'appointments' ? appointments : lane === 'followups' ? tasks : eventsQuery;
  const fetching = tab === 'events' ? (laneQuery.isFetching || (eventsLane && receivables.isFetching)) : activity.isFetching;
  const refresh = () => (tab === 'events' ? (laneQuery.refetch(), eventsLane && receivables.refetch()) : activity.refetch());
  const headers: string[] =
    lane === 'appointments' ? [grouped ? 'Contract' : 'Customer · contract', 'Service', 'Slot', 'Status', 'Who', 'Where', '']
    : lane === 'followups' ? [grouped ? 'Contract' : 'Customer · contract', 'About', 'Due', 'State', 'Who', 'Invoice · set by', '']
    : [grouped ? 'Contract' : 'Customer · contract', 'What', 'When', 'Status', 'Who', 'Slot · invoice', ''];
  const laneCount = lane === 'appointments' ? visibleAppts.length : lane === 'followups' ? (tasks.data?.total ?? 0) : total + (page === 1 ? wholeInvoiceRows.length : 0);
  const emptyHint = !showClosed ? 'Closed items are hidden — tick "Show closed".' : 'Widen the dates or clear the filters.';

  return (
    <div className="px-6 py-8 mx-auto max-w-6xl">
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] mb-3" style={{ ...sub, ...mono }}>
        ops · {currentTenant?.name || 'your business'} · commitments register
      </p>
      <div className="flex items-start justify-between gap-6 flex-wrap">
        <div>
          <h1 className="text-[26px] sm:text-[30px] leading-snug font-medium" style={ink}>Everything committed, past and present.</h1>
          <p className="text-[13px] mt-1" style={sub}>Ops shows what needs you now. This is the record: every payment due, every service, every appointment and follow-up, in every status — and everything that happened around them.</p>
        </div>
        <button onClick={refresh} title="Refresh" className="flex-none inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full text-xs font-bold border mt-1" style={{ color: brand, borderColor: `${brand}45` }}>
          <RefreshCw size={13} className={fetching ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {/* tabs */}
      <div className="mt-5 inline-flex rounded-full border p-0.5" style={{ borderColor: `${brand}45`, backgroundColor: colors.utility.primaryBackground }} role="tablist">
        <Seg on={tab === 'events'} onClick={() => setTab('events')}>Commitments{laneCount && tab === 'events' ? <span className="tabular-nums opacity-80">{laneCount}</span> : null}</Seg>
        <Seg on={tab === 'activity'} onClick={() => setTab('activity')}>Activity{activity.data ? <span className="tabular-nums opacity-80">{activity.data.counts.all}</span> : null}</Seg>
      </div>

      {tab === 'events' ? (
        <>
          <div className="mt-4 rounded-2xl border px-4 py-3.5" style={{ backgroundColor: colors.utility.secondaryBackground, borderColor: hairline }}>
            <div className="flex items-center gap-2 flex-wrap">
              {/* the same words as the board's focus strip, plus the two records only this page keeps */}
              <div className="inline-flex rounded-full border p-0.5" style={{ borderColor: `${brand}45`, backgroundColor: colors.utility.primaryBackground }} role="group" aria-label="Lane">
                <Seg on={lane === 'all'} onClick={() => setLane('all')}>All</Seg>
                <Seg on={lane === 'collections'} onClick={() => setLane('collections')}><IndianRupee size={12} /> Collections</Seg>
                <Seg on={lane === 'services'} onClick={() => setLane('services')}><Wrench size={12} /> Services</Seg>
                <Seg on={lane === 'appointments'} onClick={() => setLane('appointments')}><CalendarCheck size={12} /> Appointments</Seg>
                <Seg on={lane === 'followups'} onClick={() => setLane('followups')}><CalendarClock size={12} /> Follow-ups</Seg>
              </div>
              <div className="inline-flex rounded-full border p-0.5" style={{ borderColor: `${brand}45`, backgroundColor: colors.utility.primaryBackground }} role="group" aria-label="When">
                {(['all', 'past', 'today', 'next7', 'next30', 'custom'] as When[]).map((w) => (
                  <Seg key={w} on={when === w} onClick={() => setWhen(w)}>{w === 'all' ? 'Any date' : w === 'past' ? 'Past' : w === 'today' ? 'Today' : w === 'next7' ? 'Next 7 d' : w === 'next30' ? 'Next 30 d' : 'Dates'}</Seg>
                ))}
              </div>
              {when === 'custom' && (
                <>
                  <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} style={{ ...selectStyle, borderRadius: 10 }} aria-label="From" />
                  <input type="date" value={to} onChange={(e) => setTo(e.target.value)} style={{ ...selectStyle, borderRadius: 10 }} aria-label="To" />
                </>
              )}
              <label className="inline-flex items-center gap-2 rounded-full border px-3 min-h-[36px] w-56" style={{ borderColor: `${colors.utility.primaryText}30`, backgroundColor: colors.utility.primaryBackground }}>
                <Search size={13} style={sub} />
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="customer · contract · INV-…" aria-label="Search" className="bg-transparent outline-none text-xs w-full" style={ink} />
                {search && <button onClick={() => setSearch('')} aria-label="Clear search" style={sub}><X size={12} /></button>}
              </label>
            </div>
            <div className="mt-3 pt-3 flex items-center gap-2 flex-wrap border-t" style={{ borderColor: hairline }}>
              {lane === 'followups' ? (
                <select value={taskKind} onChange={(e) => setTaskKind(e.target.value as TaskKind | '')} style={selectStyle} aria-label="Kind">
                  <option value="">Follow-ups and calls</option>
                  <option value="follow_up">Follow-ups (set for yourself){tasks.data ? ` · ${tasks.data.counts.follow_up}` : ''}</option>
                  <option value="escalation">Calls assigned to a teammate{tasks.data ? ` · ${tasks.data.counts.escalation}` : ''}</option>
                </select>
              ) : (
                <select value={status} onChange={(e) => setStatus(e.target.value)} style={selectStyle} aria-label="Status" disabled={lane === 'all'} title={lane === 'all' ? 'Pick a lane to filter by status' : undefined}>
                  <option value="">{lane === 'all' ? 'Any status (pick a lane)' : 'Any status'}</option>
                  {statusOptions.map((s) => <option key={s.code} value={s.code}>{s.label}</option>)}
                </select>
              )}
              <select value={who} onChange={(e) => setWho(e.target.value)} style={selectStyle} aria-label="Who">
                <option value="">Anyone</option>
                {team.map((m) => <option key={m.user_id} value={m.user_id}>{m.name || m.user_id}</option>)}
              </select>
              <label className="inline-flex items-center gap-1.5 text-[11.5px] font-bold px-2" style={sub}>
                <input type="checkbox" checked={showClosed} onChange={(e) => setShowClosed(e.target.checked)} /> Show closed
              </label>
              <div className="inline-flex rounded-full border p-0.5 ml-auto" style={{ borderColor: `${brand}45`, backgroundColor: colors.utility.primaryBackground }} role="group" aria-label="View">
                <Seg on={grouped} onClick={() => setGrouped(true)}><Users size={12} /> By customer</Seg>
                <Seg on={!grouped} onClick={() => setGrouped(false)}><ListIcon size={12} /> Flat</Seg>
              </div>
            </div>
          </div>

          <div className="mt-3 h-[3px] rounded-full overflow-hidden" role="progressbar" aria-busy={fetching} style={{ backgroundColor: fetching ? `${brand}22` : 'transparent' }}>
            {fetching && <div className="h-full w-1/3 rounded-full animate-pulse" style={{ backgroundColor: brand }} />}
          </div>

          <div className="mt-2 rounded-2xl border overflow-x-auto" style={{ borderColor: hairline, backgroundColor: colors.utility.secondaryBackground, opacity: fetching ? 0.6 : 1, transition: 'opacity .2s' }}>
            <div className="min-w-[1000px]">
              <div className="grid gap-3 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.16em]" style={{ gridTemplateColumns: GRID, ...sub, ...mono }}>
                {headers.map((h, i) => <span key={i}>{h}</span>)}
              </div>
              {laneQuery.isPending && !laneQuery.data ? (
                <div className="py-16 flex justify-center border-t" style={{ borderColor: hairline }}><LoadingSpinner size="md" /></div>
              ) : laneQuery.isError ? (
                <div className="py-12 text-center border-t" style={{ borderColor: hairline }}>
                  <p className="text-sm mb-3" style={sub}>Couldn't load the register.</p>
                  <button onClick={() => laneQuery.refetch()} className="text-xs font-bold px-4 py-2 rounded-full border" style={{ color: brand, borderColor: `${brand}45` }}>Retry</button>
                </div>
              ) : items.length === 0 ? (
                <p className="py-12 text-center text-[13px] border-t" style={{ ...sub, borderColor: hairline }}>
                  {lane === 'appointments' ? <>No appointments match. Slots are asked for and confirmed on <button onClick={() => navigate('/ops/cockpit?focus=services')} className="font-bold" style={{ color: brand }}>Ops → Services</button>. {emptyHint}</>
                    : lane === 'followups' ? <>No follow-ups or calls match. "Follow up" and "Assign call" on a payment card create them. {emptyHint}</>
                    : <>Nothing matches. {emptyHint}</>}
                </p>
              ) : grouped ? (
                groups.map((g) => (
                  <div key={g.key}>
                    <button onClick={() => setOpen((s) => { const n = new Set(s); n.has(g.key) ? n.delete(g.key) : n.add(g.key); return n; })}
                      className="w-full flex items-center gap-2 px-4 py-2.5 border-t text-left" style={{ borderColor: hairline, backgroundColor: colors.utility.primaryBackground }}>
                      {open.has(g.key) ? <ChevronDown size={14} style={sub} /> : <ChevronRight size={14} style={sub} />}
                      <span className="text-[13px] font-extrabold" style={ink}>{g.name}</span>
                      <span className="text-[10.5px] font-bold" style={{ ...mono, ...sub }}>{g.ids.length} {g.ids.length === 1 ? 'item' : 'items'}{g.open ? ` · ${g.open} open` : ''}</span>
                    </button>
                    {open.has(g.key) && g.ids.map((id) => renderItem(id, true))}
                  </div>
                ))
              ) : items.map((it) => renderItem(it.id))}
            </div>
          </div>
          {eventsLane && total > PER_PAGE && (
            <div className="mt-3 flex items-center justify-between text-[11.5px] font-bold" style={sub}>
              <span>Page {page} of {Math.ceil(total / PER_PAGE)} · {total} events</span>
              <span className="inline-flex gap-2">
                <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="px-3 min-h-[36px] rounded-full border disabled:opacity-40" style={{ color: brand, borderColor: `${brand}45` }}>Previous</button>
                <button disabled={page >= Math.ceil(total / PER_PAGE)} onClick={() => setPage((p) => p + 1)} className="px-3 min-h-[36px] rounded-full border disabled:opacity-40" style={{ color: brand, borderColor: `${brand}45` }}>Next</button>
              </span>
            </div>
          )}
          <p className="mt-6 text-[11px] text-center" style={sub}>
            Changing a status here is the register's one action. Assigning, scheduling, asking the customer, starting and finishing services, sending and chasing payments happen on{' '}
            <button onClick={() => navigate('/ops/cockpit')} className="font-bold" style={{ color: brand }}>Ops</button>. Balances live in{' '}
            <button onClick={() => navigate('/money-in')} className="font-bold" style={{ color: brand }}>Money In</button>; every invoice, paid or not, is in the{' '}
            <button onClick={() => navigate('/invoices')} className="font-bold" style={{ color: brand }}>invoice register</button>.
          </p>
        </>
      ) : (
        <>
          <div className="mt-4 rounded-2xl border px-4 py-3.5" style={{ backgroundColor: colors.utility.secondaryBackground, borderColor: hairline }}>
            <div className="flex items-center gap-2 flex-wrap">
              {/* every kind stays visible, zero or not — a missing chip read as "no appointments" */}
              <Chip on={aGroup === null} onClick={() => setAGroup(null)}>All <span className="tabular-nums opacity-80">{activity.data?.counts.all ?? ''}</span></Chip>
              {GROUPS.map((g) => {
                const n = activity.data?.counts[g.key] ?? 0;
                const color = g.key === 'appointments' ? amber : g.key === 'payments' ? green : g.key === 'visits' ? brand : g.key === 'other' ? colors.utility.secondaryText : colors.utility.primaryText;
                return <Chip key={g.key} on={aGroup === g.key} onClick={() => setAGroup(aGroup === g.key ? null : g.key)} color={n || aGroup === g.key ? color : colors.utility.secondaryText}>{g.label} <span className="tabular-nums opacity-80">{n}</span></Chip>;
              })}
            </div>
            <div className="mt-3 pt-3 flex items-center gap-2 flex-wrap border-t" style={{ borderColor: hairline }}>
              <select value={aWho} onChange={(e) => setAWho(e.target.value)} style={selectStyle} aria-label="Who">
                <option value="">Anyone</option>
                {team.map((m) => <option key={m.user_id} value={m.user_id}>{m.name || m.user_id}</option>)}
              </select>
              <span className="text-[11px] font-bold" style={sub}>From</span>
              <input type="date" value={aFrom || activity.data?.window.from || ''} onChange={(e) => setAFrom(e.target.value)} style={{ ...selectStyle, borderRadius: 10 }} aria-label="From" />
              <span className="text-[11px] font-bold" style={sub}>to</span>
              <input type="date" value={aTo || activity.data?.window.to || ''} onChange={(e) => setATo(e.target.value)} style={{ ...selectStyle, borderRadius: 10 }} aria-label="To" />
              <label className="inline-flex items-center gap-2 rounded-full border px-3 min-h-[36px] w-56" style={{ borderColor: `${colors.utility.primaryText}30`, backgroundColor: colors.utility.primaryBackground }}>
                <Search size={13} style={sub} />
                <input value={aSearch} onChange={(e) => setASearch(e.target.value)} placeholder="customer · contract · what" aria-label="Search activity" className="bg-transparent outline-none text-xs w-full" style={ink} />
                {aSearch && <button onClick={() => setASearch('')} aria-label="Clear search" style={sub}><X size={12} /></button>}
              </label>
              {(aGroup || aWho || aFrom || aTo || aQ) && (
                <button onClick={() => { setAGroup(null); setAWho(''); setAFrom(''); setATo(''); setASearch(''); setAQ(''); }} className="inline-flex items-center gap-1 px-3 min-h-[36px] rounded-full text-[11px] font-bold uppercase tracking-wider" style={{ ...mono, color: brand, backgroundColor: `${brand}14` }}>
                  clear <X size={12} />
                </button>
              )}
            </div>
          </div>

          <div className="mt-3 h-[3px] rounded-full overflow-hidden" role="progressbar" aria-busy={activity.isFetching} style={{ backgroundColor: activity.isFetching ? `${brand}22` : 'transparent' }}>
            {activity.isFetching && <div className="h-full w-1/3 rounded-full animate-pulse" style={{ backgroundColor: brand }} />}
          </div>

          <div className="mt-2 rounded-2xl border px-4 pb-2" style={{ borderColor: hairline, backgroundColor: colors.utility.secondaryBackground, opacity: activity.isFetching ? 0.6 : 1, transition: 'opacity .2s' }}>
            {activity.isPending && !activity.data ? (
              <div className="py-16 flex justify-center"><LoadingSpinner size="md" /></div>
            ) : activity.isError || !activity.data ? (
              <div className="py-12 text-center">
                <p className="text-sm mb-3" style={sub}>Couldn't load the activity.</p>
                <button onClick={() => activity.refetch()} className="text-xs font-bold px-4 py-2 rounded-full border" style={{ color: brand, borderColor: `${brand}45` }}>Retry</button>
              </div>
            ) : activity.data.rows.length === 0 ? (
              <div className="py-12 text-center">
                <CalendarCheck size={28} style={{ color: `${brand}88`, margin: '0 auto 8px' }} />
                <p className="text-[14px] font-extrabold" style={ink}>Nothing recorded {aGroup ? `under ${GROUPS.find((g) => g.key === aGroup)?.label}` : ''} between {fmtDate(activity.data.window.from)} and {fmtDate(activity.data.window.to)}</p>
                <p className="text-[12px] mt-1" style={sub}>Widen the dates, or pick another kind or person.</p>
              </div>
            ) : (
              <div className="relative">
                <span className="absolute left-[15px] top-3 bottom-3 w-px" style={{ backgroundColor: hairline }} />
                <p className="pt-3 pb-1 text-[10px] font-bold uppercase tracking-[0.16em]" style={{ ...sub, ...mono }}>
                  {fmtDate(activity.data.window.from)} – {fmtDate(activity.data.window.to)} · newest first · {activity.data.total} {activity.data.total === 1 ? 'entry' : 'entries'}
                </p>
                {activity.data.rows.map((r) => <ActivityLine key={r.id} r={r} />)}
                {activity.data.total > activity.data.rows.length && (
                  <button onClick={() => setALimit((l) => l + ACT_PAGE)} className="mt-3 mb-2 w-full min-h-[40px] rounded-xl text-xs font-bold border border-dashed" style={{ color: brand, borderColor: `${brand}45` }}>
                    Show {Math.min(ACT_PAGE, activity.data.total - activity.data.rows.length)} more · {activity.data.total - activity.data.rows.length} left
                  </button>
                )}
              </div>
            )}
          </div>
          <p className="mt-6 text-[11px] text-center" style={sub}>The same rows a contract's History drawer and Audit tab show, across every contract. Messages are our copy of the template with the values sent.</p>
        </>
      )}
    </div>
  );
};

export default CommitmentsRegisterPage;
