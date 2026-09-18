// src/components/ops/PlanView.tsx
//
// Commitments Register · PLAN tab (migration jtd-nucleus/023).
//
// Owner (2026-09-18): "as per JTD, Wed 16 Sep has a few events — can't those
// be shown as commitments lined up, and the user reviews and confirms or
// proposes?" — and the cross-selling rule agreed the same day: the plan is
// for EVERYONE; the LEVERAGE is VaNi's.
//
// Every day of the window, with its commitments lined up: service visits
// (slotted or not), payments due, follow-ups, reminders due. The rows are the
// board's own cards (jtd_ops_board regrouped by day), so this renders the same
// JobCard with the same verbs — Propose, Ask, Confirm slot, Assign, Start,
// Mark done, Follow up, Log a call — nothing re-implemented.
//
// Per day, one VaNi line:
//   VaNi ON  → "Plan this day · N" (propose a slot for every unslotted service)
//              and "Ask everyone on WhatsApp/email · M" (every proposed slot not
//              yet asked, on a channel with a registered template).
//   VaNi OFF → the same numbers, greyed: "VaNi would place N, ask M and send R
//              reminders" with "Open VaNi →". The counterfactual is the pitch;
//              nothing manual is withheld.
// Rows anchored before the window come first as "carried over"; rows with no
// anchor sit at the end as "parked". Never a balance or a total of money.

import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, Sparkles, ChevronDown, ChevronRight, CalendarRange, Mail, MessageCircle, ArrowUpRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { useConfirmDeclaration } from '@/hooks/queries/useGroupSessionsDashboard';
import { useConfirmPaymentDeclaration } from '@/hooks/queries/usePaymentDeclarations';
import {
  useOpsPlan, usePlanDay, useAskDay,
  useNudgePayment, useLogPaymentCall, useEscalatePaymentCall, usePauseDunning, useResumeDunning,
  useAssignVisit, useScheduleVisit, useConfirmVisitSlot, useStartVisit, useCompleteVisit, useAskVisitSlot,
  collectionsKeys,
  type BoardCard, type BoardLane, type PlanCounts, type PlanDay, type PlanFilters,
} from '@/hooks/queries/useCollectionsQueries';
import JobCard, { clean, type JobCardActions, type PauseReason } from '@/components/ops/JobCard';
import LogCallSheet from '@/components/ops/LogCallSheet';
import HistoryDrawer from '@/components/ops/HistoryDrawer';
import { useInvoiceTheme } from '../../pages/invoices/ui';
import { useSendInvoice, sendRefusal } from '../../pages/invoices/useInvoiceDetail';
import { fmtMoney, fmtDate } from '@/utils/format';

type Preset = '7' | '14' | '30' | 'custom';
type Lane = 'all' | BoardLane;
type Who = 'team' | 'mine' | 'unassigned';
const SHOW_FIRST = 6;
const PRESET_KEY = 'ops.plan.preset';

const isoDay = (d: Date) => { const p = (n: number) => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`; };
const addDays = (d: Date, n: number) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const today0 = () => { const t = new Date(); t.setHours(0, 0, 0, 0); return t; };
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** "3 services (2 to place · 1 asked) · 2 payments due · 1 reminder due · 1 follow-up" — never money. */
export const planSentence = (c: PlanCounts): string => {
  const parts: string[] = [];
  if (c.services) {
    const sub = [
      c.to_place ? `${c.to_place} to place` : '', c.proposed ? `${c.proposed} proposed` : '', c.asked ? `${c.asked} asked` : '',
      c.to_confirm ? `${c.to_confirm} to confirm` : '', c.confirmed ? `${c.confirmed} confirmed` : '', c.in_progress ? `${c.in_progress} in progress` : '',
    ].filter(Boolean).join(' · ');
    parts.push(`${plural(c.services, 'service')}${sub ? ` (${sub})` : ''}`);
  }
  if (c.payments) parts.push(`${plural(c.payments, 'payment')} due${c.declarations ? ` · ${c.declarations} declared` : ''}`);
  if (c.reminders_due) parts.push(`${plural(c.reminders_due, 'reminder')} due`);
  if (c.followups) parts.push(plural(c.followups, 'follow-up'));
  return parts.join(' · ');
};

const PlanView: React.FC<{
  /** the page header's progress bar follows the plan query */
  onFetching?: (fetching: boolean) => void;
  /** the page header's Refresh button calls this */
  refreshRef?: React.MutableRefObject<(() => void) | null>;
}> = ({ onFetching, refreshRef }) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, perspective } = useAuth() as any;
  const { colors, ink, sub } = useInvoiceTheme();
  const brand = colors.brand.primary;
  const green = colors.semantic.success;
  const red = colors.semantic.error;
  const amber = colors.semantic.warning;
  const mono: React.CSSProperties = { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' };
  const hairline = `${colors.utility.primaryText}14`;
  const selectStyle: React.CSSProperties = {
    border: `1px solid ${colors.utility.primaryText}30`, borderRadius: 999, padding: '0 12px', fontSize: 12, fontWeight: 700,
    backgroundColor: colors.utility.primaryBackground, color: colors.utility.primaryText, minHeight: 36,
  };

  // ── window · lane · who · search ──────────────────────────────────────────
  const [preset, setPresetState] = useState<Preset>(() => { try { const v = window.localStorage.getItem(PRESET_KEY); return v === '7' || v === '30' || v === 'custom' ? v : '14'; } catch { return '14'; } });
  const setPreset = (p: Preset) => { setPresetState(p); try { window.localStorage.setItem(PRESET_KEY, p); } catch { /* ignore */ } };
  const [from, setFrom] = useState(() => isoDay(today0()));
  const [to, setTo] = useState(() => isoDay(addDays(today0(), 13)));
  const [lane, setLane] = useState<Lane>('all');
  const [who, setWho] = useState<Who>('team');
  const [search, setSearch] = useState('');
  const [q, setQ] = useState('');
  useEffect(() => { const t = setTimeout(() => setQ(search.trim()), 250); return () => clearTimeout(t); }, [search]);

  const filters = useMemo<PlanFilters>(() => {
    const f: PlanFilters = {};
    const t = today0();
    if (preset === 'custom') { if (from) f.from = from; if (to) f.to = to; }
    else { f.from = isoDay(t); f.to = isoDay(addDays(t, Number(preset) - 1)); }
    if (lane !== 'all') f.lanes = [lane];
    if (who !== 'team') f.who = who;
    if (q) f.q = q;
    return f;
  }, [preset, from, to, lane, who, q]);

  const enabled = perspective !== 'expense';
  const plan = useOpsPlan(filters, { enabled });
  useEffect(() => { onFetching?.(plan.isFetching); }, [plan.isFetching, onFetching]);
  useEffect(() => { if (refreshRef) refreshRef.current = () => plan.refetch(); return () => { if (refreshRef) refreshRef.current = null; }; }, [refreshRef, plan]);
  const refresh = () => queryClient.invalidateQueries({ queryKey: collectionsKeys.all });

  // ── tools: the same wiring as the board, the card decides the buttons ─────
  const nudge = useNudgePayment();
  const logCall = useLogPaymentCall();
  const escalate = useEscalatePaymentCall();
  const pause = usePauseDunning();
  const resume = useResumeDunning();
  const assignVisit = useAssignVisit();
  const scheduleVisit = useScheduleVisit();
  const confirmSlot = useConfirmVisitSlot();
  const startVisit = useStartVisit();
  const completeVisit = useCompleteVisit();
  const askVisit = useAskVisitSlot();
  const sendInvoice = useSendInvoice();
  const confirmGs = useConfirmDeclaration();
  const confirmPay = useConfirmPaymentDeclaration();
  const planDay = usePlanDay();
  const askDay = useAskDay();

  const [busyId, setBusyId] = useState<string | null>(null);
  const [busyDay, setBusyDay] = useState<string | null>(null);
  const [callFor, setCallFor] = useState<BoardCard | null>(null);
  const [historyFor, setHistoryFor] = useState<BoardCard | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [carriedOpen, setCarriedOpen] = useState(false);
  const [parkedOpen, setParkedOpen] = useState(false);

  // One action in flight at a time; the hooks toast and refetch.
  const run = async (id: string, fn: () => Promise<unknown>) => {
    if (busyId || busyDay) return;
    setBusyId(id);
    try { await fn(); } catch { /* toasted by the hook */ } finally { setBusyId(null); }
  };
  const runDay = async (day: string, fn: () => Promise<unknown>) => {
    if (busyId || busyDay) return;
    setBusyDay(day);
    try { await fn(); } catch { /* toasted by the hook */ } finally { setBusyDay(null); }
  };
  const actions: JobCardActions = {
    onNudge: (c, ch) => { if (c.job_id) run(c.id, () => nudge.mutateAsync({ jobId: c.job_id!, channel: ch })); },
    onCall: (c) => { if (c.job_id) setCallFor(c); },
    onAssign: (c, userId, dueAt) => {
      if (!c.job_id) return;
      if (!userId) { toast.error('Pick a teammate first'); return; }
      return run(c.id, () => escalate.mutateAsync({ jobId: c.job_id!, assignTo: userId, dueAt: dueAt || null }));
    },
    onPause: (c, reason: PauseReason, until) => {
      if (!c.job_id) return;
      if (reason === 'promise' && !until) { toast.error('A promise needs a date'); return; }
      return run(c.id, () => pause.mutateAsync({ jobId: c.job_id!, reason, until }));
    },
    onResume: (c) => { if (c.job_id) run(c.id, () => resume.mutateAsync({ jobId: c.job_id! })); },
    onConfirm: (c) => {
      const d = c.declaration;
      if (!d) return;
      run(c.id, async () => {
        if (d.kind === 'session') await confirmGs.mutateAsync({ id: d.id, confirm: true });
        else await confirmPay.mutateAsync({ id: d.id, confirm: true } as any);
        toast.success(`Payment confirmed — ${fmtMoney(d.amount, c.currency)} from ${clean(c.buyer_name) || c.contract_number}`);
        refresh();
      });
    },
    onReview: (c) => navigate(c.declaration?.kind === 'session' ? '/group-sessions' : `/contracts/${c.contract_id}`),
    onOpen: (c) => navigate(`/contracts/${c.contract_id}`),
    onHistory: (c) => setHistoryFor(c),
    onViewInvoice: (c) => { if (c.invoice_id) navigate(c.contract_id ? `/contracts/${c.contract_id}/invoice/${c.invoice_id}` : `/invoices/${c.invoice_id}`); },
    onSendInvoice: (c, channel) => {
      if (!c.invoice_id) return;
      run(c.id, async () => {
        try { await sendInvoice.mutateAsync({ invoiceId: c.invoice_id!, channel }); refresh(); }
        catch (e) {
          const r = sendRefusal(e);
          if (r?.reason === 'rule_disabled') {
            toast.error((t) => (
              <span>Payment reminders are switched off under Automation Rules — the invoice was not sent.{' '}
                <button onClick={() => { toast.dismiss(t.id); navigate('/settings/configure/automation-rules'); }} className="font-bold underline">Open Automation Rules</button>
              </span>), { duration: 7000 });
          } else toast.error(r?.message || 'Could not send the invoice', { duration: 5000 });
        }
      });
    },
    onAssignVisit: (c, userId) => {
      if (!userId) { toast.error('Pick a technician first'); return; }
      return run(c.id, () => assignVisit.mutateAsync({ eventId: c.id, assignTo: userId }));
    },
    onSchedule: (c, scheduledAt, confirmed) => {
      if (!scheduledAt) { toast.error('Pick a date and time first'); return; }
      return run(c.id, () => scheduleVisit.mutateAsync({ eventId: c.id, scheduledAt, confirmed }));
    },
    onConfirmSlot: (c) => { run(c.id, () => confirmSlot.mutateAsync({ eventId: c.id })); },
    onStartVisit: (c) => { run(c.id, () => startVisit.mutateAsync({ eventId: c.id })); },
    onCompleteVisit: (c, notes) => run(c.id, () => completeVisit.mutateAsync({ eventId: c.id, notes: notes || undefined })),
    onAskCustomer: async (c, channel) => {
      if (busyId || busyDay) return;
      setBusyId(c.id);
      try { return await askVisit.mutateAsync({ eventId: c.id, channel }); }
      catch { return; }
      finally { setBusyId(null); }
    },
  };

  // ── chrome ────────────────────────────────────────────────────────────────
  const Seg: React.FC<{ on: boolean; onClick: () => void; title?: string; children: React.ReactNode }> = ({ on, onClick, title, children }) => (
    <button onClick={onClick} title={title} aria-pressed={on}
      className="inline-flex items-center gap-1 px-3 min-h-[36px] rounded-full text-[11px] font-bold whitespace-nowrap"
      style={on ? { backgroundColor: brand, color: '#fff' } : { color: brand, backgroundColor: 'transparent' }}>
      {children}
    </button>
  );
  const Pill: React.FC<{ color: string; children: React.ReactNode; title?: string }> = ({ color, children, title }) => (
    <span title={title} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-bold border whitespace-nowrap" style={{ color, borderColor: `${color}55`, backgroundColor: `${color}14` }}>{children}</span>
  );

  const data = plan.data;
  const vaniOn = !!data?.vani_enabled;
  const askChannels = data?.ask_channels || [];
  const ruleOn = !!data?.ladder?.rule_enabled;

  /** The VaNi line under a day: buttons when VaNi is on, the greyed counterfactual when it is off. */
  const VaniLine: React.FC<{ day: string; c: PlanCounts; past: boolean }> = ({ day, c, past }) => {
    const would = [c.to_place ? `place ${c.to_place}` : '', c.proposed ? `ask ${c.proposed}` : '', c.reminders_due ? `send ${plural(c.reminders_due, 'reminder')}` : ''].filter(Boolean);
    if (!would.length) return null;
    if (!vaniOn) {
      return (
        <p className="mt-2 text-[11.5px] flex items-center gap-1.5 flex-wrap" style={sub}>
          <Sparkles size={12} style={{ color: colors.utility.secondaryText }} />
          <span>VaNi would {would.join(', ')} for this day.</span>
          <button onClick={() => navigate('/vani/landing')} className="font-bold inline-flex items-center gap-0.5" style={{ color: brand }}>Open VaNi <ArrowUpRight size={11} /></button>
        </p>
      );
    }
    const busy = busyDay === day;
    const locked = !!busyId || (!!busyDay && busyDay !== day);
    return (
      <div className="mt-2 flex items-center gap-2 flex-wrap">
        <Sparkles size={12} style={{ color: brand }} />
        {c.to_place > 0 && !past && (
          <button disabled={busy || locked} onClick={() => runDay(day, () => planDay.mutateAsync({ day }))}
            className="inline-flex items-center gap-1 px-3 min-h-[34px] rounded-full text-[11px] font-bold disabled:opacity-60" style={{ backgroundColor: brand, color: '#fff' }}
            title="Propose a slot for every service on this day that has none — 10:00 first, then every 2 hours per technician. Nobody is assigned; the customer is not asked yet.">
            {busy ? <LoadingSpinner size="sm" /> : <CalendarRange size={12} />} Plan this day · {c.to_place}
          </button>
        )}
        {c.proposed > 0 && askChannels.map((ch) => (
          <button key={ch} disabled={busy || locked} onClick={() => runDay(day, () => askDay.mutateAsync({ day, channel: ch }))}
            className="inline-flex items-center gap-1 px-3 min-h-[34px] rounded-full text-[11px] font-bold border disabled:opacity-60" style={{ color: brand, borderColor: `${brand}55` }}
            title={`Ask every customer with a proposed slot on this day to confirm it ${ch === 'whatsapp' ? 'on WhatsApp' : 'by email'}`}>
            {ch === 'whatsapp' ? <MessageCircle size={12} /> : <Mail size={12} />} Ask everyone {ch === 'whatsapp' ? 'on WhatsApp' : 'by email'} · {c.proposed}
          </button>
        ))}
        {c.proposed > 0 && askChannels.length === 0 && (
          <span className="text-[11px]" style={sub} title="Register the slot-request template with the provider to ask everyone at once — Share on each card works today">
            {c.proposed} proposed · ask each from its card (no send template registered yet)
          </span>
        )}
        {c.reminders_due > 0 && (
          <span className="text-[11px]" style={sub}>
            {ruleOn ? `${plural(c.reminders_due, 'reminder')} run by the ladder` : <>{plural(c.reminders_due, 'reminder')} due · <button onClick={() => navigate('/settings/configure/automation-rules')} className="font-bold" style={{ color: brand }}>turn on Payment reminders</button></>}
          </span>
        )}
        {c.to_place > 0 && past && <span className="text-[11px]" style={sub}>{c.to_place} to place — the day has passed, reschedule from each card</span>}
      </div>
    );
  };

  const Cards: React.FC<{ keyName: string; cards: BoardCard[] }> = ({ keyName, cards }) => {
    if (!data) return null;
    const all = expanded.has(keyName);
    const shown = all ? cards : cards.slice(0, SHOW_FIRST);
    return (
      <div className="mt-3 space-y-2">
        {shown.map((c) => (
          <JobCard key={c.id} card={c} compact busy={busyId === c.id} locked={(!!busyId && busyId !== c.id) || !!busyDay}
            team={data.team} ladder={data.ladder} meId={user?.id} actions={actions} askChannels={data.ask_channels} />
        ))}
        {cards.length > SHOW_FIRST && (
          <button onClick={() => setExpanded((s) => { const n = new Set(s); all ? n.delete(keyName) : n.add(keyName); return n; })}
            className="w-full min-h-[38px] rounded-xl text-xs font-bold border border-dashed" style={{ color: brand, borderColor: `${brand}45` }}>
            {all ? 'Show fewer' : `Show all ${cards.length}`}
          </button>
        )}
      </div>
    );
  };

  const DaySection: React.FC<{ d: PlanDay }> = ({ d }) => {
    const c = d.counts;
    const past = !!data && d.day < data.today;
    const dt = new Date(`${d.day}T00:00:00`);
    return (
      <section className="rounded-2xl border px-4 py-3.5" style={{ borderColor: d.is_today ? `${brand}70` : hairline, backgroundColor: colors.utility.secondaryBackground }}>
        <div className="flex items-start gap-4 flex-wrap">
          <div className="flex items-baseline gap-2 min-w-[150px]">
            <span className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ ...mono, color: d.is_today ? brand : colors.utility.secondaryText }}>{d.dow}</span>
            <span className="text-[17px] font-extrabold" style={ink}>{dt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
            {d.is_today && <Pill color={brand}>Today</Pill>}
          </div>
          <p className="text-[12.5px] flex-1 min-w-[200px]" style={c.total ? ink : sub}>{c.total ? planSentence(c) : 'Nothing committed.'}</p>
          <div className="flex items-center gap-1.5">
            {c.needs_you > 0 && <Pill color={amber}>{c.needs_you} need you</Pill>}
            {c.unassigned_services > 0 && <Pill color={colors.utility.secondaryText} title="Services with no technician yet">{c.unassigned_services} unassigned</Pill>}
          </div>
        </div>
        <VaniLine day={d.day} c={c} past={past} />
        {c.total > 0 && <Cards keyName={d.day} cards={d.cards} />}
      </section>
    );
  };

  // ── layout ────────────────────────────────────────────────────────────────
  return (
    <>
      <div className="mt-4 rounded-2xl border px-4 py-3.5" style={{ backgroundColor: colors.utility.secondaryBackground, borderColor: hairline }}>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="inline-flex rounded-full border p-0.5" style={{ borderColor: `${brand}45`, backgroundColor: colors.utility.primaryBackground }} role="group" aria-label="Window">
            {(['7', '14', '30', 'custom'] as Preset[]).map((p) => (
              <Seg key={p} on={preset === p} onClick={() => setPreset(p)}>{p === 'custom' ? 'Dates' : `Next ${p} d`}</Seg>
            ))}
          </div>
          {preset === 'custom' && (
            <>
              <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} style={{ ...selectStyle, borderRadius: 10 }} aria-label="From" />
              <input type="date" value={to} onChange={(e) => setTo(e.target.value)} style={{ ...selectStyle, borderRadius: 10 }} aria-label="To" />
            </>
          )}
          <div className="inline-flex rounded-full border p-0.5" style={{ borderColor: `${brand}45`, backgroundColor: colors.utility.primaryBackground }} role="group" aria-label="Lane">
            <Seg on={lane === 'all'} onClick={() => setLane('all')}>All</Seg>
            <Seg on={lane === 'collections'} onClick={() => setLane('collections')}>Collections</Seg>
            <Seg on={lane === 'services'} onClick={() => setLane('services')}>Services</Seg>
          </div>
          <select value={who} onChange={(e) => setWho(e.target.value as Who)} style={selectStyle} aria-label="Who">
            <option value="team">Whole team</option>
            <option value="mine">Mine</option>
            <option value="unassigned">Unassigned</option>
          </select>
          <label className="inline-flex items-center gap-2 rounded-full border px-3 min-h-[36px] w-56" style={{ borderColor: `${colors.utility.primaryText}30`, backgroundColor: colors.utility.primaryBackground }}>
            <Search size={13} style={sub} />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="customer · contract" aria-label="Search" className="bg-transparent outline-none text-xs w-full" style={ink} />
            {search && <button onClick={() => setSearch('')} aria-label="Clear search" style={sub}><X size={12} /></button>}
          </label>
        </div>
        {data && (
          <p className="mt-3 pt-3 border-t text-[12px] flex items-center gap-2 flex-wrap" style={{ ...sub, borderColor: hairline }}>
            <span style={ink}>{fmtDate(data.window.from)} – {fmtDate(data.window.to)}</span>
            <span>·</span>
            <span>{data.totals.total ? planSentence(data.totals) : 'nothing committed in this window'}</span>
            {data.carried.counts.total > 0 && <><span>·</span><span style={{ color: red }}>{data.carried.counts.total} carried over</span></>}
            {data.truncated && <><span>·</span><span style={{ color: amber }}>some rows were left out — narrow the window</span></>}
            <span className="ml-auto inline-flex items-center gap-1" style={{ color: vaniOn ? green : colors.utility.secondaryText }}>
              <Sparkles size={11} /> {vaniOn ? 'VaNi is on' : 'VaNi is off'}
            </span>
          </p>
        )}
      </div>

      <div className="mt-3 h-[3px] rounded-full overflow-hidden" role="progressbar" aria-busy={plan.isFetching} style={{ backgroundColor: plan.isFetching ? `${brand}22` : 'transparent' }}>
        {plan.isFetching && <div className="h-full w-1/3 rounded-full animate-pulse" style={{ backgroundColor: brand }} />}
      </div>

      {!enabled ? (
        <p className="py-12 text-center text-[13px]" style={sub}>The plan is a revenue-side view for now. Switch to Revenue to see the days ahead.</p>
      ) : plan.isPending && !data ? (
        <div className="py-16 flex justify-center"><LoadingSpinner size="md" /></div>
      ) : plan.isError ? (
        <div className="py-12 text-center">
          <p className="text-sm mb-3" style={sub}>Couldn't load the plan.</p>
          <button onClick={() => plan.refetch()} className="text-xs font-bold px-4 py-2 rounded-full border" style={{ color: brand, borderColor: `${brand}45` }}>Retry</button>
        </div>
      ) : data ? (
        <div className="mt-3 space-y-3" style={{ opacity: plan.isFetching ? 0.7 : 1, transition: 'opacity .2s' }}>
          {data.carried.counts.total > 0 && (
            <section className="rounded-2xl border px-4 py-3.5" style={{ borderColor: `${red}55`, backgroundColor: colors.utility.secondaryBackground }}>
              <button onClick={() => setCarriedOpen((v) => !v)} className="w-full flex items-center gap-2 text-left">
                {carriedOpen ? <ChevronDown size={14} style={sub} /> : <ChevronRight size={14} style={sub} />}
                <span className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ ...mono, color: red }}>Carried over</span>
                <span className="text-[12.5px]" style={ink}>{planSentence(data.carried.counts)}</span>
                <span className="ml-auto"><Pill color={red}>{data.carried.counts.needs_you} need you</Pill></span>
              </button>
              {carriedOpen && <p className="mt-1 text-[11px]" style={sub}>Anchored before {fmtDate(data.window.from)} and still open. Reschedule, chase or close them from the card.</p>}
              {carriedOpen && <Cards keyName="carried" cards={data.carried.cards} />}
            </section>
          )}
          {data.days.map((d) => <DaySection key={d.day} d={d} />)}
          {data.parked.counts.total > 0 && (
            <section className="rounded-2xl border px-4 py-3.5" style={{ borderColor: hairline, backgroundColor: colors.utility.secondaryBackground }}>
              <button onClick={() => setParkedOpen((v) => !v)} className="w-full flex items-center gap-2 text-left">
                {parkedOpen ? <ChevronDown size={14} style={sub} /> : <ChevronRight size={14} style={sub} />}
                <span className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ ...mono, ...sub }}>Parked</span>
                <span className="text-[12.5px]" style={ink}>{planSentence(data.parked.counts)} · no date yet</span>
              </button>
              {parkedOpen && <Cards keyName="parked" cards={data.parked.cards} />}
            </section>
          )}
          <p className="mt-6 text-[11px] text-center" style={sub}>
            Every card here is the same card as on <button onClick={() => navigate('/ops/cockpit')} className="font-bold" style={{ color: brand }}>Ops</button>, lined up by day. "Plan this day" proposes slots; nothing is confirmed until the customer or you confirm it.
          </p>
        </div>
      ) : null}

      {historyFor && (
        <HistoryDrawer
          contractId={historyFor.contract_id}
          title={clean(historyFor.buyer_name) || historyFor.contract_number}
          subtitle={historyFor.lane === 'services'
            ? `${historyFor.contract_number} · Service${historyFor.visit?.sequence ? ` ${historyFor.visit.sequence}${historyFor.visit.of ? `/${historyFor.visit.of}` : ''}` : ''}${historyFor.visit?.block_name ? ` · ${historyFor.visit.block_name}` : ''}${historyFor.due_date ? ` · ${fmtDate(historyFor.due_date)}` : ''}`
            : `${historyFor.contract_number}${historyFor.invoice_number ? ` · ${historyFor.invoice_number}` : ''}${historyFor.cycle_label ? ` · ${historyFor.cycle_label}` : ''}${historyFor.due_date ? ` · due ${fmtDate(historyFor.due_date)}` : ''}`}
          onClose={() => setHistoryFor(null)}
          onOpenContract={() => navigate(`/contracts/${historyFor.contract_id}`)}
        />
      )}
      {callFor && callFor.job_id && (
        <LogCallSheet
          card={callFor}
          busy={busyId === callFor.id}
          onClose={() => setCallFor(null)}
          onSubmit={(v) => run(callFor.id, async () => {
            await logCall.mutateAsync({ jobId: callFor.job_id!, calledAt: v.calledAt, outcome: v.outcome, notes: v.notes, promiseDate: v.promiseDate });
            setCallFor(null);
          })}
        />
      )}
    </>
  );
};

export default PlanView;
