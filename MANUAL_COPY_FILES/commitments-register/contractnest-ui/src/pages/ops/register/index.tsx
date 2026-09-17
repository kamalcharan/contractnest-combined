// src/pages/ops/register/index.tsx
//
// Commitments Register — /ops/services (was "Event Schedule").
// Ops (/ops/cockpit) is WHAT NEEDS YOU NOW: open commitments only, no raw
// status. This page is EVERYTHING THAT WAS AND IS COMMITTED — the record.
//   Events   every service visit and billing instalment in every status,
//            closed ones included (that is the point of a register), grouped
//            by customer or flat; the one legitimate action here is moving a
//            visit or instalment through the status machine.
//   Activity the tenant-wide timeline — appointments asked/confirmed/moved/
//            declined, follow-ups, calls, reminders with delivery status,
//            visits assigned/started/done, declarations — by Who, kind and
//            date, with the message as sent. Reader: jtd_activity (016).
// Same idiom as the board (theme tokens, controls card, chips, 44px targets).
// Never a balance, a total or an ageing sum — Money In is the ledger.

import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowUpRight, Search, RefreshCw, X, Users, List as ListIcon, ChevronDown, ChevronRight, Sparkles, Wrench, IndianRupee, CalendarCheck } from 'lucide-react';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { useAuth } from '@/context/AuthContext';
import { useInvoiceTheme } from '../../invoices/ui';
import { fmtMoney, fmtDate } from '@/utils/format';
import { useContractEvents, useContractEventOperations } from '@/hooks/queries/useContractEventQueries';
import { useStatusMap, useTransitionMap } from '@/hooks/queries/useEventStatusConfigQueries';
import { useActivityRegister, type ActivityGroup, type RegisterActivityRow } from '@/hooks/queries/useCollectionsQueries';
import { rowVisual, statusColor, MessageToggle } from '@/components/ops/HistoryDrawer';
import { clean, fmtTime } from '@/components/ops/JobCard';

// ── the row the events API returns: the event + contract/contact context ────
interface EventRow {
  id: string;
  contract_id: string;
  contract_number?: string | null;
  contract_name?: string | null;
  contract_type?: string | null;          // client / partner / vendor
  event_type: 'service' | 'billing' | string;
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
}

type Tab = 'events' | 'activity';
type Lane = 'all' | 'service' | 'billing';
type When = 'all' | 'past' | 'today' | 'next7' | 'next30' | 'custom';
const PER_PAGE = 100;
const ACT_PAGE = 50;

// The service status machine the backend actually enforces (update_contract_event). The tenant
// config also lists assigned / on_hold / reopened, which the RPC refuses — never offer them.
const SERVICE_STATUSES = ['scheduled', 'due', 'overdue', 'in_progress', 'completed', 'cancelled'];
const SERVICE_TRANSITIONS: Record<string, string[]> = {
  scheduled: ['in_progress', 'cancelled'], due: ['in_progress', 'cancelled'],
  in_progress: ['completed', 'cancelled'], overdue: ['in_progress', 'completed', 'cancelled'],
};
const CLOSED = new Set(['completed', 'cancelled', 'paid', 'waived', 'adjustment', 'bad_debt']);

const GROUPS: Array<{ key: ActivityGroup; label: string }> = [
  { key: 'appointments', label: 'Appointments' }, { key: 'followups', label: 'Follow-ups' }, { key: 'calls', label: 'Calls' },
  { key: 'reminders', label: 'Reminders' }, { key: 'visits', label: 'Visits' }, { key: 'payments', label: 'Payments' }, { key: 'other', label: 'Other' },
];

const TAB_KEY = 'ops.register.tab';
const readTab = (): Tab => { try { const v = window.localStorage.getItem(TAB_KEY); return v === 'activity' ? 'activity' : 'events'; } catch { return 'events'; } };
const isoDay = (d: Date) => { const p = (n: number) => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`; };
const addDays = (d: Date, n: number) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const whenRange = (w: When, from: string, to: string): { date_from?: string; date_to?: string } => {
  const t = new Date(); t.setHours(0, 0, 0, 0);
  switch (w) {
    case 'past': return { date_to: isoDay(addDays(t, -1)) };
    case 'today': return { date_from: isoDay(t), date_to: isoDay(t) };
    case 'next7': return { date_from: isoDay(t), date_to: isoDay(addDays(t, 7)) };
    case 'next30': return { date_from: isoDay(t), date_to: isoDay(addDays(t, 30)) };
    case 'custom': return { date_from: from || undefined, date_to: to || undefined };
    default: return {};
  }
};

const CommitmentsRegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentTenant } = useAuth() as any;
  const { colors, ink, sub } = useInvoiceTheme();
  const brand = colors.brand.primary;
  const green = colors.semantic.success;
  const red = colors.semantic.error;
  const amber = colors.semantic.warning;
  const mono: React.CSSProperties = { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' };
  const hairline = `${colors.utility.primaryText}14`;

  const [tab, setTabState] = useState<Tab>(readTab);
  const setTab = (t: Tab) => { setTabState(t); try { window.localStorage.setItem(TAB_KEY, t); } catch { /* ignore */ } };

  // ── Events tab state ──
  const [lane, setLane] = useState<Lane>('all');
  const [status, setStatus] = useState('');
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

  const eventsQuery = useContractEvents({
    event_type: lane === 'all' ? undefined : (lane as any),
    status: status ? (status as any) : undefined,
    assigned_to: who || undefined,
    ...whenRange(when, from, to),
    page, per_page: PER_PAGE, sort_by: 'scheduled_date', sort_order: when === 'past' ? 'desc' : 'asc',
  }, { enabled: tab === 'events' });
  const rows = ((eventsQuery.data?.items as unknown as EventRow[]) || []);
  const total = eventsQuery.data?.total_count || 0;
  const { updateStatus, changingStatusEventId } = useContractEventOperations();
  const serviceStatusMap = useStatusMap('service');
  const billingStatusMap = useStatusMap('billing');
  const billingTransitions = useTransitionMap('billing');

  const statusLabel = (e: EventRow) => {
    const def: any = (e.event_type === 'billing' ? billingStatusMap : serviceStatusMap)?.[e.status];
    return { label: def?.display_name || e.status.replace(/_/g, ' '), color: def?.hex_color || (CLOSED.has(e.status) ? colors.utility.secondaryText : e.status === 'overdue' ? red : brand) };
  };
  const transitionsFor = (e: EventRow): string[] =>
    e.event_type === 'billing' ? (((billingTransitions as any)?.[e.status] as string[]) || []) : (SERVICE_TRANSITIONS[e.status] || []);
  const statusOptions = useMemo(() => {
    const toList = (m: any, allow?: string[]) => Object.entries(m || {})
      .filter(([code]) => !allow || allow.includes(code))
      .map(([code, def]: any) => ({ code, label: def?.display_name || code.replace(/_/g, ' '), order: def?.display_order ?? 999 }))
      .sort((a, b) => a.order - b.order);
    if (lane === 'service') return toList(serviceStatusMap, SERVICE_STATUSES);
    if (lane === 'billing') return toList(billingStatusMap);
    return [];
  }, [lane, serviceStatusMap, billingStatusMap]);

  const visible = useMemo(() => rows.filter((e) => {
    if (!showClosed && CLOSED.has(e.status)) return false;
    if (!q) return true;
    return [e.block_name, e.contract_name, e.contract_number, e.buyer_name, e.assigned_to_name].filter(Boolean).some((v) => String(v).toLowerCase().includes(q));
  }), [rows, showClosed, q]);
  const groups = useMemo(() => {
    const m = new Map<string, { key: string; name: string; rows: EventRow[]; open: number }>();
    for (const e of visible) {
      const key = e.buyer_id || e.buyer_name || 'unknown';
      if (!m.has(key)) m.set(key, { key, name: clean(e.buyer_name) || 'Unknown customer', rows: [], open: 0 });
      const g = m.get(key)!; g.rows.push(e); if (!CLOSED.has(e.status)) g.open += 1;
    }
    return Array.from(m.values()).sort((a, b) => b.open - a.open || b.rows.length - a.rows.length);
  }, [visible]);
  useEffect(() => { setOpen(new Set(groups.map((g) => g.key))); }, [groups.length]); // eslint-disable-line react-hooks/exhaustive-deps

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
  // The activity query also carries the team list, which the Events tab's Who select uses too.
  const activity = useActivityRegister({ from: aFrom || undefined, to: aTo || undefined, groups: aGroup ? [aGroup] : undefined, who: aWho || undefined, q: aQ || undefined, limit: aLimit });
  const team = activity.data?.team || [];

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
  const openBoard = (e: EventRow) => navigate(`/ops/cockpit?focus=services&q=${encodeURIComponent(e.contract_number || '')}`);

  // ── Events row ──
  const GRID = 'minmax(180px,1.4fr) minmax(200px,1.6fr) 120px 150px 140px 130px 40px';
  const EventLine: React.FC<{ e: EventRow; indent?: boolean }> = ({ e, indent }) => {
    const isBilling = e.event_type === 'billing';
    const s = statusLabel(e);
    const next = transitionsFor(e);
    const busy = changingStatusEventId === e.id;
    const slot = !isBilling ? (e.appointment_status === 'accepted' ? { t: 'Slot confirmed', c: green } : e.appointment_status && e.appointment_scheduled_at ? { t: 'Slot proposed', c: amber } : CLOSED.has(e.status) ? null : { t: 'No slot', c: colors.utility.secondaryText }) : null;
    return (
      <div className="grid items-center gap-3 px-4 py-2.5 border-t" style={{ gridTemplateColumns: GRID, borderColor: hairline }}>
        <div className={`min-w-0 ${indent ? 'pl-4' : ''}`}>
          <p className="text-[13px] font-bold truncate" style={ink}>{grouped ? (e.contract_name || e.contract_number) : (clean(e.buyer_name) || e.contract_number)}</p>
          <button onClick={() => navigate(`/contracts/${e.contract_id}`)} className="text-[10px] font-bold" style={{ ...mono, color: brand }}>{e.contract_number}</button>
        </div>
        <div className="min-w-0">
          <p className="text-[12.5px] truncate flex items-center gap-1.5" style={ink}>
            {isBilling ? <IndianRupee size={12} style={{ color: green, flexShrink: 0 }} /> : <Wrench size={12} style={{ color: brand, flexShrink: 0 }} />}
            <span className="truncate">{e.block_name}</span>
          </p>
          <p className="text-[11px]" style={sub}>
            {isBilling ? `${e.billing_cycle_label || 'instalment'} ${e.sequence_number}/${e.total_occurrences}${e.amount != null ? ` · ${fmtMoney(e.amount, e.currency || 'INR')}` : ''}` : `visit ${e.sequence_number} of ${e.total_occurrences}`}
          </p>
        </div>
        <p className="text-[12px] tabular-nums" style={{ color: e.status === 'overdue' ? red : colors.utility.primaryText }}>{fmtDate(e.scheduled_date)}</p>
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
        <p className="text-[12px] truncate" style={e.assigned_to_name ? ink : sub}>{e.assigned_to_name || (isBilling ? '—' : 'no technician')}</p>
        <div>
          {slot ? <Pill color={slot.c} onClick={CLOSED.has(e.status) ? undefined : () => openBoard(e)} title="Open on the Ops board">{slot.t}{e.appointment_status === 'accepted' && e.appointment_scheduled_at ? ` · ${fmtDate(e.appointment_scheduled_at)}` : ''}</Pill>
            : e.audience === 'group' ? <Pill color={green} onClick={() => navigate('/group-sessions')}>Group session</Pill> : <span className="text-[11px]" style={sub}>—</span>}
        </div>
        <button onClick={() => navigate(`/contracts/${e.contract_id}`)} title="Open contract" className="inline-flex items-center justify-center min-h-[36px]" style={{ color: brand }}><ArrowUpRight size={14} /></button>
      </div>
    );
  };

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

  const fetching = tab === 'events' ? eventsQuery.isFetching : activity.isFetching;
  const refresh = () => (tab === 'events' ? eventsQuery.refetch() : activity.refetch());

  return (
    <div className="px-6 py-8 mx-auto max-w-6xl">
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] mb-3" style={{ ...sub, ...mono }}>
        ops · {currentTenant?.name || 'your business'} · commitments register
      </p>
      <div className="flex items-start justify-between gap-6 flex-wrap">
        <div>
          <h1 className="text-[26px] sm:text-[30px] leading-snug font-medium" style={ink}>Everything committed, past and present.</h1>
          <p className="text-[13px] mt-1" style={sub}>Ops shows what needs you now. This is the record: every visit and instalment in every status, and everything that happened around them.</p>
        </div>
        <button onClick={refresh} title="Refresh" className="flex-none inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full text-xs font-bold border mt-1" style={{ color: brand, borderColor: `${brand}45` }}>
          <RefreshCw size={13} className={fetching ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {/* tabs */}
      <div className="mt-5 inline-flex rounded-full border p-0.5" style={{ borderColor: `${brand}45`, backgroundColor: colors.utility.primaryBackground }} role="tablist">
        <Seg on={tab === 'events'} onClick={() => setTab('events')}>Events{total && tab === 'events' ? <span className="tabular-nums opacity-80">{total}</span> : null}</Seg>
        <Seg on={tab === 'activity'} onClick={() => setTab('activity')}>Activity{activity.data ? <span className="tabular-nums opacity-80">{activity.data.counts.all}</span> : null}</Seg>
      </div>

      {tab === 'events' ? (
        <>
          <div className="mt-4 rounded-2xl border px-4 py-3.5" style={{ backgroundColor: colors.utility.secondaryBackground, borderColor: hairline }}>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="inline-flex rounded-full border p-0.5" style={{ borderColor: `${brand}45`, backgroundColor: colors.utility.primaryBackground }} role="group" aria-label="Kind">
                <Seg on={lane === 'all'} onClick={() => { setLane('all'); setStatus(''); }}>All</Seg>
                <Seg on={lane === 'service'} onClick={() => { setLane('service'); setStatus(''); }}><Wrench size={12} /> Visits</Seg>
                <Seg on={lane === 'billing'} onClick={() => { setLane('billing'); setStatus(''); }}><IndianRupee size={12} /> Instalments</Seg>
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
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="customer · contract · block" aria-label="Search" className="bg-transparent outline-none text-xs w-full" style={ink} />
                {search && <button onClick={() => setSearch('')} aria-label="Clear search" style={sub}><X size={12} /></button>}
              </label>
            </div>
            <div className="mt-3 pt-3 flex items-center gap-2 flex-wrap border-t" style={{ borderColor: hairline }}>
              <select value={status} onChange={(e) => setStatus(e.target.value)} style={selectStyle} aria-label="Status" disabled={lane === 'all'} title={lane === 'all' ? 'Pick Visits or Instalments to filter by status' : undefined}>
                <option value="">{lane === 'all' ? 'Any status (pick a kind)' : 'Any status'}</option>
                {statusOptions.map((s) => <option key={s.code} value={s.code}>{s.label}</option>)}
              </select>
              <select value={who} onChange={(e) => setWho(e.target.value)} style={selectStyle} aria-label="Technician">
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

          <div className="mt-3 h-[3px] rounded-full overflow-hidden" role="progressbar" aria-busy={eventsQuery.isFetching} style={{ backgroundColor: eventsQuery.isFetching ? `${brand}22` : 'transparent' }}>
            {eventsQuery.isFetching && <div className="h-full w-1/3 rounded-full animate-pulse" style={{ backgroundColor: brand }} />}
          </div>

          <div className="mt-2 rounded-2xl border overflow-x-auto" style={{ borderColor: hairline, backgroundColor: colors.utility.secondaryBackground, opacity: eventsQuery.isFetching ? 0.6 : 1, transition: 'opacity .2s' }}>
            <div className="min-w-[980px]">
              <div className="grid gap-3 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.16em]" style={{ gridTemplateColumns: GRID, ...sub, ...mono }}>
                <span>{grouped ? 'Contract' : 'Customer · contract'}</span><span>What</span><span>When</span><span>Status</span><span>Who</span><span>Slot</span><span />
              </div>
              {eventsQuery.isPending && !eventsQuery.data ? (
                <div className="py-16 flex justify-center border-t" style={{ borderColor: hairline }}><LoadingSpinner size="md" /></div>
              ) : eventsQuery.isError ? (
                <div className="py-12 text-center border-t" style={{ borderColor: hairline }}>
                  <p className="text-sm mb-3" style={sub}>Couldn't load the register.</p>
                  <button onClick={() => eventsQuery.refetch()} className="text-xs font-bold px-4 py-2 rounded-full border" style={{ color: brand, borderColor: `${brand}45` }}>Retry</button>
                </div>
              ) : visible.length === 0 ? (
                <p className="py-12 text-center text-[13px] border-t" style={{ ...sub, borderColor: hairline }}>Nothing matches. {!showClosed ? 'Closed items are hidden — tick "Show closed".' : 'Widen the dates or clear the filters.'}</p>
              ) : grouped ? (
                groups.map((g) => (
                  <div key={g.key}>
                    <button onClick={() => setOpen((s) => { const n = new Set(s); n.has(g.key) ? n.delete(g.key) : n.add(g.key); return n; })}
                      className="w-full flex items-center gap-2 px-4 py-2.5 border-t text-left" style={{ borderColor: hairline, backgroundColor: colors.utility.primaryBackground }}>
                      {open.has(g.key) ? <ChevronDown size={14} style={sub} /> : <ChevronRight size={14} style={sub} />}
                      <span className="text-[13px] font-extrabold" style={ink}>{g.name}</span>
                      <span className="text-[10.5px] font-bold" style={{ ...mono, ...sub }}>{g.rows.length} {g.rows.length === 1 ? 'item' : 'items'}{g.open ? ` · ${g.open} open` : ''}</span>
                    </button>
                    {open.has(g.key) && g.rows.map((e) => <EventLine key={e.id} e={e} indent />)}
                  </div>
                ))
              ) : visible.map((e) => <EventLine key={e.id} e={e} />)}
            </div>
          </div>
          {total > PER_PAGE && (
            <div className="mt-3 flex items-center justify-between text-[11.5px] font-bold" style={sub}>
              <span>Page {page} of {Math.ceil(total / PER_PAGE)} · {total} events</span>
              <span className="inline-flex gap-2">
                <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="px-3 min-h-[36px] rounded-full border disabled:opacity-40" style={{ color: brand, borderColor: `${brand}45` }}>Previous</button>
                <button disabled={page >= Math.ceil(total / PER_PAGE)} onClick={() => setPage((p) => p + 1)} className="px-3 min-h-[36px] rounded-full border disabled:opacity-40" style={{ color: brand, borderColor: `${brand}45` }}>Next</button>
              </span>
            </div>
          )}
          <p className="mt-6 text-[11px] text-center" style={sub}>
            Changing a status here is the register's one action. Assigning, scheduling, asking the customer, starting and finishing visits happen on{' '}
            <button onClick={() => navigate('/ops/cockpit?focus=services')} className="font-bold" style={{ color: brand }}>Ops</button>. Balances live in{' '}
            <button onClick={() => navigate('/money-in')} className="font-bold" style={{ color: brand }}>Money In</button>.
          </p>
        </>
      ) : (
        <>
          <div className="mt-4 rounded-2xl border px-4 py-3.5" style={{ backgroundColor: colors.utility.secondaryBackground, borderColor: hairline }}>
            <div className="flex items-center gap-2 flex-wrap">
              <Chip on={aGroup === null} onClick={() => setAGroup(null)}>All <span className="tabular-nums opacity-80">{activity.data?.counts.all ?? ''}</span></Chip>
              {GROUPS.map((g) => {
                const n = activity.data?.counts[g.key] ?? 0;
                if (!n && aGroup !== g.key) return null;
                const color = g.key === 'appointments' ? amber : g.key === 'payments' ? green : g.key === 'visits' ? brand : g.key === 'other' ? colors.utility.secondaryText : colors.utility.primaryText;
                return <Chip key={g.key} on={aGroup === g.key} onClick={() => setAGroup(aGroup === g.key ? null : g.key)} color={color}>{g.label} <span className="tabular-nums opacity-80">{n}</span></Chip>;
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
