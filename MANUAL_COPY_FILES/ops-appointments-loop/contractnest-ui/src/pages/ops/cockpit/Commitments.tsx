// src/pages/ops/cockpit/Commitments.tsx
//
// Ops on JTD — the body of /ops/cockpit for the revenue side (mounted through
// ./Home.tsx since 2026-09-17; staged at /ops/cockpit/next before that).
// Collections + Services lanes, read from ONE reader (jtd_ops_board) and acted
// on with TOOLS that carry an actor (spec §4, §11): the ladder tools for
// payments, the visit tools (assign · schedule · confirm slot · start · done)
// for service visits.
//
// ONE row model. Every open payment job and every open service visit is
// exactly one card with a lane (what), a kind (its state), an anchor (when it
// wants attention) and a bucket by WHEN:
//   overdue · today · next few days · next weeks · later · parked
// The same JobCard renders every row in both views — List stacks the buckets
// with full-width cards, Lanes puts them side by side with compact cards —
// so the evidence and the ACTIONS never differ between views.
//
// Filters, facet counts and per-bucket paging run in the reader so the
// numbers always agree. Owner rules: never repeat Money In (no balances,
// totals, ageing sums — Money In is the ledger); every action is a tool with
// an actor; nothing automatic. Money In's idiom: situation sentence with
// tappable numbers, story cards, theme tokens, 44px targets.

import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowUpRight, Search, RefreshCw, Mail, MessageCircle, PhoneCall, UserPlus, List, LayoutGrid, Sparkles, X, CalendarRange, Wrench, CalendarCheck, CalendarClock, Play, CheckCircle2, Share2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { useConfirmDeclaration } from '@/hooks/queries/useGroupSessionsDashboard';
import { useConfirmPaymentDeclaration } from '@/hooks/queries/usePaymentDeclarations';
import {
  useCollectionsBoard,
  useNudgePayment,
  useLogPaymentCall,
  useEscalatePaymentCall,
  usePauseDunning,
  useResumeDunning,
  useAssignVisit,
  useScheduleVisit,
  useConfirmVisitSlot,
  useStartVisit,
  useCompleteVisit,
  useAskVisitSlot,
  collectionsKeys,
  type BoardCard,
  type BoardBucket,
  type BoardFilters,
  type BoardKind,
  type BoardLane,
  type SlotState,
  type BucketKey,
  type WlChannel,
  type WlHappened,
} from '@/hooks/queries/useCollectionsQueries';
import JobCard, { clean, fmtTime, type JobCardActions, type PauseReason } from '@/components/ops/JobCard';
import LogCallSheet from '@/components/ops/LogCallSheet';
import HistoryDrawer from '@/components/ops/HistoryDrawer';
import { useInvoiceTheme } from '../../invoices/ui';
import { fmtMoney, fmtDate } from '@/utils/format';

// ── kinds grouped the way a person thinks about them ─────────────────────────
type Group = 'reminders' | 'confirm' | 'calls' | 'failed' | 'paused' | 'awaiting' | 'ahead'
  | 'visits_overdue' | 'visits_today' | 'in_progress' | 'slots_to_confirm' | 'visits_scheduled';
const GROUPS: Array<{ key: Group; lane: BoardLane; label: string; kinds: BoardKind[] }> = [
  { key: 'reminders', lane: 'collections', label: 'Reminders due', kinds: ['rung_due', 'overdue_no_ladder', 'ladder_exhausted'] },
  { key: 'confirm', lane: 'collections', label: 'To confirm', kinds: ['declaration_pending'] },
  { key: 'calls', lane: 'collections', label: 'Calls open', kinds: ['call_open'] },
  { key: 'failed', lane: 'collections', label: 'Send failed', kinds: ['send_failed'] },
  { key: 'visits_overdue', lane: 'services', label: 'Visits overdue', kinds: ['visit_overdue'] },
  { key: 'visits_today', lane: 'services', label: 'Visits today', kinds: ['visit_today'] },
  { key: 'in_progress', lane: 'services', label: 'In progress', kinds: ['visit_in_progress'] },
  { key: 'slots_to_confirm', lane: 'services', label: 'Slots to confirm', kinds: ['slot_to_confirm'] },
  { key: 'paused', lane: 'collections', label: 'Paused', kinds: ['paused'] },
  { key: 'awaiting', lane: 'collections', label: 'Awaiting activation', kinds: ['awaiting_activation'] },
  { key: 'ahead', lane: 'collections', label: 'Coming due', kinds: ['payment_ahead', 'rung_ahead'] },
  { key: 'visits_scheduled', lane: 'services', label: 'Visits scheduled', kinds: ['visit_scheduled'] },
];
const NEEDS_KINDS: BoardKind[] = ['declaration_pending', 'send_failed', 'call_open', 'rung_due', 'overdue_no_ladder', 'ladder_exhausted', 'awaiting_activation',
  'visit_overdue', 'visit_today', 'visit_in_progress', 'slot_to_confirm'];
const LANES: Array<{ key: BoardLane | null; label: string }> = [
  { key: null, label: 'All' }, { key: 'collections', label: 'Collections' }, { key: 'services', label: 'Services' },
];

type View = 'list' | 'lanes';
type Horizon = 7 | 14 | 30 | 90;
const HORIZONS: Horizon[] = [7, 14, 30, 90];
const BANDS: Record<Horizon, [number, number]> = { 7: [1, 3], 14: [3, 7], 30: [3, 14], 90: [7, 30] };
const PAGE = 20;

// Per-viewer conveniences only (view, horizon). Browser storage can be empty
// or throw in private windows — every read/write is guarded.
const VIEW_KEY = 'ops.board.view';
const HORIZON_KEY = 'ops.board.horizon';
const LANE_KEY = 'ops.board.lane';
const readPref = <T,>(key: string, ok: (v: unknown) => v is T, fallback: T): T => {
  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null) return fallback;
    const v = JSON.parse(raw);
    return ok(v) ? v : fallback;
  } catch { return fallback; }
};
const writePref = (key: string, v: unknown) => { try { window.localStorage.setItem(key, JSON.stringify(v)); } catch { /* ignore */ } };
const isView = (v: unknown): v is View => v === 'list' || v === 'lanes';
const isHorizon = (v: unknown): v is Horizon => (HORIZONS as number[]).includes(v as number);
const isLane = (v: unknown): v is BoardLane | null => v === null || v === 'collections' || v === 'services';
const laneName = (l: BoardLane | null) => (l === 'collections' ? 'Collections' : l === 'services' ? 'Services' : 'All');

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const sum = (o: Partial<Record<string, number>> | undefined, keys: string[]) => keys.reduce((a, k) => a + (o?.[k] ?? 0), 0);
const bandsForSpan = (days: number): [number, number] => (days <= 7 ? [1, 3] : days <= 14 ? [3, 7] : days <= 30 ? [3, 14] : [7, 30]);
const daysBetween = (a: string, b: string) => Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86_400_000);

const bucketLabel = (b: BoardBucket): string => {
  switch (b.key) {
    case 'overdue': return 'overdue';
    case 'today': return 'today';
    case 'parked': return 'parked';
    case 'b1': return b.to_days === 1 ? 'tomorrow' : `next ${b.to_days} days`;
    case 'b2': return b.from_days === 4 && b.to_days === 14 ? 'next 2 weeks' : `${b.from_days}–${b.to_days} days`;
    case 'b3': return b.to_days != null && b.from_days != null && b.to_days < b.from_days ? 'later' : `${b.from_days}–${b.to_days} days`;
    default: return b.key;
  }
};

const OpsCommitmentsPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { currentTenant, perspective, user } = useAuth() as any;
  const { colors, ink, sub } = useInvoiceTheme();
  const brand = colors.brand.primary;
  const green = colors.semantic.success;
  const red = colors.semantic.error;
  const amber = colors.semantic.warning;
  const mono: React.CSSProperties = { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' };
  const hairline = `${colors.utility.primaryText}14`;

  // ── view + window ──────────────────────────────────────────────────────────
  const [view, setViewState] = useState<View>(() => readPref(VIEW_KEY, isView, 'list'));
  const [horizon, setHorizonState] = useState<Horizon>(() => readPref(HORIZON_KEY, isHorizon, 30));
  const [range, setRange] = useState<{ from: string; to: string } | null>(null);
  const [rangeOpen, setRangeOpen] = useState(false);
  const [draftFrom, setDraftFrom] = useState('');
  const [draftTo, setDraftTo] = useState('');
  const setView = (v: View) => { setViewState(v); writePref(VIEW_KEY, v); };
  const setHorizon = (h: Horizon) => { setHorizonState(h); writePref(HORIZON_KEY, h); setRange(null); setRangeOpen(false); setLimits({}); };

  // ── filters ────────────────────────────────────────────────────────────────
  // The lane is the FOCUS (the strip above the headline), not a filter: it persists and survives "clear".
  const [lane, setLaneState] = useState<BoardLane | null>(() => readPref(LANE_KEY, isLane, null));
  const [group, setGroup] = useState<Group | null>(null);
  const [slot, setSlot] = useState<SlotState | ''>('');
  const [channel, setChannel] = useState<WlChannel | ''>('');
  const [age, setAge] = useState<BoardFilters['age'] | ''>('');
  const [cycle, setCycle] = useState('');
  const [who, setWho] = useState<'team' | 'mine' | 'unassigned'>('team');
  const [search, setSearch] = useState('');
  const [q, setQ] = useState('');
  const [limits, setLimits] = useState<Partial<Record<BucketKey, number>>>({});
  useEffect(() => { const t = setTimeout(() => setQ(search.trim()), 300); return () => clearTimeout(t); }, [search]);
  // Any filter change resets paging — the buckets are different rows now.
  useEffect(() => { setLimits({}); }, [lane, group, slot, channel, age, cycle, who, q, range]);
  // Switching lane drops a kind filter that belongs to the other lane (it would empty the board) and lane-specific selects.
  const setLane = (l: BoardLane | null) => {
    setLaneState(l);
    writePref(LANE_KEY, l);
    if (l && group && GROUPS.find((g) => g.key === group)?.lane !== l) setGroup(null);
    if (l === 'collections') setSlot('');
    if (l === 'services') { setChannel(''); setCycle(''); }
  };
  // Deep link: /ops/cockpit?focus=services (the retired Appointments routes land here).
  const [params, setParams] = useSearchParams();
  useEffect(() => {
    const f = params.get('focus');
    if (f === 'collections' || f === 'services' || f === 'all') {
      setLane(f === 'all' ? null : f);
      params.delete('focus'); setParams(params, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filters = useMemo<BoardFilters>(() => {
    const f: BoardFilters = { limit: PAGE };
    if (range) { f.from = range.from; f.to = range.to; f.bands = bandsForSpan(Math.max(daysBetween(range.from, range.to), 1)); }
    else { f.horizon = horizon; f.bands = BANDS[horizon]; }
    if (lane) f.lanes = [lane];
    if (group) f.kinds = GROUPS.find((g) => g.key === group)!.kinds;
    if (slot) f.slot = slot;
    if (channel) f.channel = channel;
    if (age) f.age = age;
    if (cycle) f.cycle = cycle;
    if (who !== 'team') f.who = who;
    if (q) f.q = q;
    if (Object.keys(limits).length) f.limits = limits;
    return f;
  }, [range, horizon, lane, group, slot, channel, age, cycle, who, q, limits]);
  const anyFilter = !!(group || slot || channel || age || cycle || who !== 'team' || q);
  const clearFilters = () => { setGroup(null); setSlot(''); setChannel(''); setAge(''); setCycle(''); setWho('team'); setSearch(''); setQ(''); };

  // ── data + tools ───────────────────────────────────────────────────────────
  const enabled = perspective === 'revenue';
  const board = useCollectionsBoard(filters, { enabled });
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
  const confirmGs = useConfirmDeclaration();
  const confirmPay = useConfirmPaymentDeclaration();

  const [busyId, setBusyId] = useState<string | null>(null);
  const [callFor, setCallFor] = useState<BoardCard | null>(null);
  const [historyFor, setHistoryFor] = useState<BoardCard | null>(null);
  const refresh = () => queryClient.invalidateQueries({ queryKey: collectionsKeys.all });

  // One action in flight at a time; the hooks toast and refetch.
  const run = async (id: string, fn: () => Promise<unknown>) => {
    if (busyId) return;
    setBusyId(id);
    try { await fn(); } catch { /* toasted by the hook */ } finally { setBusyId(null); }
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
    // ── services: the card id IS the service event id ──
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
    // the card needs the result (message + link) to open WhatsApp / copy, so this one returns it
    onAskCustomer: async (c, channel) => {
      if (busyId) return;
      setBusyId(c.id);
      try { return await askVisit.mutateAsync({ eventId: c.id, channel }); }
      catch { return; /* toasted by the hook */ }
      finally { setBusyId(null); }
    },
  };

  // ── chrome ─────────────────────────────────────────────────────────────────
  const Seg: React.FC<{ on: boolean; onClick: () => void; title?: string; children: React.ReactNode }> = ({ on, onClick, title, children }) => (
    <button onClick={onClick} title={title} aria-pressed={on}
      className="inline-flex items-center gap-1 px-3 min-h-[36px] rounded-full text-[11px] font-bold whitespace-nowrap"
      style={on ? { backgroundColor: brand, color: '#fff' } : { color: brand, backgroundColor: 'transparent' }}>
      {children}
    </button>
  );
  const Chip: React.FC<{ on: boolean; onClick: () => void; color?: string; children: React.ReactNode }> = ({ on, onClick, color, children }) => (
    <button onClick={onClick} aria-pressed={on}
      className="inline-flex items-center gap-1.5 px-3 min-h-[36px] rounded-full text-[11.5px] font-bold border whitespace-nowrap"
      style={on ? { backgroundColor: color || brand, color: '#fff', borderColor: color || brand }
                : { color: color || colors.utility.primaryText, borderColor: `${color || colors.utility.primaryText}35`, backgroundColor: colors.utility.primaryBackground }}>
      {children}
    </button>
  );
  const Num: React.FC<{ v: number; color?: string; g: Group | null }> = ({ v, color, g }) => (
    <button onClick={() => setGroup(group === g ? null : g)} className="font-extrabold tabular-nums align-baseline"
      style={{ color: color || colors.utility.primaryText, borderBottom: `2px ${group === g ? 'solid' : 'dotted'} ${color || brand}`, fontSize: '1.15em' }}>
      {v}
    </button>
  );
  const selectStyle: React.CSSProperties = {
    border: `1px solid ${colors.utility.primaryText}30`, borderRadius: 999, padding: '0 12px', fontSize: 11.5, fontWeight: 700,
    backgroundColor: colors.utility.primaryBackground, color: colors.utility.primaryText, minHeight: 36,
  };

  // ── guards ─────────────────────────────────────────────────────────────────
  if (perspective === 'expense') {
    return (
      <div className="p-8 max-w-2xl mx-auto">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] mb-3" style={{ ...sub, ...mono }}>ops · revenue side</p>
        <h1 className="text-xl font-extrabold mb-2" style={ink}>You're on the expense side right now</h1>
        <p className="text-sm mb-5" style={sub}>Ops lists what needs your action on money owed <i>to you</i>. What you owe others lives in To Pay.</p>
        <button onClick={() => navigate('/to-pay')} className="text-sm font-bold inline-flex items-center gap-1.5" style={{ color: brand }}>
          Go to To Pay <ArrowUpRight size={14} />
        </button>
      </div>
    );
  }
  const data = board.data;
  if (board.isPending && !data) return <div className="py-24 flex justify-center"><LoadingSpinner size="lg" /></div>;
  if (!data) {
    return (
      <div className="py-24 text-center">
        <p className="text-sm mb-3" style={sub}>Couldn't load your board.</p>
        <button onClick={() => board.refetch()} className="inline-flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-full border" style={{ color: brand, borderColor: `${brand}45` }}>
          <RefreshCw size={13} /> Retry
        </button>
      </div>
    );
  }

  // ── numbers (facets ignore the kind filter, so the sentence stays stable) ──
  const k = data.facets.kinds;
  const n = {
    needs: sum(k, NEEDS_KINDS),
    reminders: sum(k, ['rung_due', 'overdue_no_ladder', 'ladder_exhausted']),
    confirm: k.declaration_pending ?? 0,
    calls: k.call_open ?? 0,
    failed: k.send_failed ?? 0,
    paused: k.paused ?? 0,
    awaiting: k.awaiting_activation ?? 0,
    payments: k.payment_ahead ?? 0,
    rungsAhead: k.rung_ahead ?? 0,
    visitsOverdue: k.visit_overdue ?? 0,
    visitsToday: k.visit_today ?? 0,
    inProgress: k.visit_in_progress ?? 0,
    slotsToConfirm: k.slot_to_confirm ?? 0,
    visitsAhead: k.visit_scheduled ?? 0,
    unassignedVisits: data.facets.who.unassigned_visits ?? 0,
  };
  const windowText = range ? `between ${fmtDate(range.from)} and ${fmtDate(range.to)}` : `in the next ${horizon} days`;
  // "3 visits, 2 payments and 1 reminder fall due …" — one verb, agreeing with the whole subject.
  const ahead = ([
    { v: n.visitsAhead, one: 'visit', g: 'visits_scheduled' },
    { v: n.payments, one: 'payment', g: 'ahead' },
    { v: n.rungsAhead, one: 'reminder', g: 'ahead' },
  ] as Array<{ v: number; one: string; g: Group }>).filter((p) => p.v > 0);
  const aheadTotal = ahead.reduce((a, p) => a + p.v, 0);
  const ladder = data.ladder;
  const buckets = data.buckets.filter((b) => b.count > 0 || b.key === 'overdue' || b.key === 'today');
  // Focus strip numbers: window only, never moved by filters (the reader computes them that way).
  const needsByLane = { collections: data.facets.needs_by_lane?.collections ?? 0, services: data.facets.needs_by_lane?.services ?? 0 };
  const needsFor = (l: BoardLane | null) => (l ? needsByLane[l] : needsByLane.collections + needsByLane.services);
  // The feed follows the focus: payment rows for Collections, visit rows for Services, both on All — one timeline, newest first.
  const feed = [...data.happened]
    .filter((h) => !lane || (lane === 'services') === h.kind.startsWith('visit_'))
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  const bucketColor = (key: BucketKey) => (key === 'overdue' ? red : key === 'today' ? green : key === 'parked' ? colors.utility.secondaryText : colors.utility.primaryText);
  const showMore = (key: BucketKey, shown: number) => setLimits((l) => ({ ...l, [key]: shown + PAGE }));

  // VaNi chip — truth from the reader: is VaNi on for this tenant, is the rule on.
  const vaniChip = (() => {
    const N = n.reminders;
    if (ladder.rule_enabled) {
      return { text: 'VaNi · payment reminders on', color: green, to: '/settings/configure/automation-rules', title: 'Automation Rules → Payment reminders' };
    }
    if (ladder.vani_enabled) {
      return { text: N ? `VaNi could send these ${N} reminders · turn on Payment reminders` : 'VaNi is on · Payment reminders are off', color: amber, to: '/settings/configure/automation-rules', title: 'VaNi is on for you; the Payment reminders rule is off' };
    }
    return { text: N ? `Let VaNi send these ${N} reminders` : 'Let VaNi run your reminders', color: brand, to: '/vani/landing', title: 'See what VaNi does' };
  })();

  const renderBucket = (b: BoardBucket) => {
    const shown = b.cards.length;
    const more = b.count - shown;
    const lanes = view === 'lanes';
    return (
      <div key={b.key} className={lanes ? 'rounded-2xl border p-2.5 min-h-[140px]' : 'mt-7'}
        style={lanes ? { borderColor: hairline, backgroundColor: colors.utility.secondaryBackground } : undefined}>
        <div className={`flex items-baseline justify-between gap-3 ${lanes ? 'px-1 mb-2' : 'mb-2.5'}`}>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ ...mono, color: bucketColor(b.key) }}>{bucketLabel(b)}</p>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ ...sub, ...mono }}>{b.count ? (shown < b.count ? `${shown} of ${b.count}` : String(b.count)) : '—'}</p>
        </div>
        {b.cards.length === 0 ? (
          <EmptyBucket bucket={b} compact={lanes} lane={lane} filtered={anyFilter} onClear={clearFilters} today={data.today} />
        ) : (
          <div className={lanes ? 'space-y-2' : 'space-y-2.5'}>
            {b.cards.map((c) => (
              <JobCard key={c.id} card={c} compact={lanes} busy={busyId === c.id} locked={!!busyId && busyId !== c.id}
                team={data.team} ladder={ladder} meId={user?.id} actions={actions} askChannels={data.ask_channels} />
            ))}
          </div>
        )}
        {more > 0 && (
          <button onClick={() => showMore(b.key, shown)} className="mt-2.5 w-full min-h-[40px] rounded-xl text-xs font-bold border border-dashed" style={{ color: brand, borderColor: `${brand}45` }}>
            Show {Math.min(more, PAGE)} more · {more} left
          </button>
        )}
      </div>
    );
  };

  return (
    <div className={`px-6 py-8 mx-auto ${view === 'lanes' ? 'max-w-[1400px]' : 'max-w-4xl'}`}>
      {/* ── focus strip: WHERE to look first. Sets the lane; headline, board, filters and feed follow. ── */}
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] mb-3" style={{ ...sub, ...mono }}>
        ops · {currentTenant?.name || 'your business'} · {fmtDate(data.today)} · where to focus
      </p>
      <div className="grid gap-2 mb-6" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }} role="tablist" aria-label="Focus">
        {LANES.map((l) => {
          const on = lane === l.key;
          const c = needsFor(l.key);
          return (
            <button key={l.label} role="tab" aria-selected={on} onClick={() => setLane(l.key)}
              className="text-left rounded-2xl border px-4 py-3 min-h-[64px] transition-colors"
              style={on ? { backgroundColor: brand, borderColor: brand, color: '#fff' }
                        : { backgroundColor: colors.utility.secondaryBackground, borderColor: hairline, color: colors.utility.primaryText }}>
              <span className="flex items-center gap-1.5 text-[12px] font-extrabold uppercase tracking-[0.12em]" style={mono}>
                {l.key === 'services' && <Wrench size={12} />}{l.label}
              </span>
              <span className="block mt-1 text-[15px] font-bold tabular-nums" style={{ opacity: c ? 1 : 0.6 }}>
                {c ? `${c} need you` : 'nothing needs you'}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── headline ── */}
      <div className="flex items-start justify-between gap-6 flex-wrap">
        <div className="min-w-0">
          <h1 className="text-[26px] sm:text-[30px] leading-snug font-medium max-w-2xl" style={ink}>
            {n.needs === 0 ? <>Nothing needs you{lane ? ` in ${laneName(lane)}` : ''} right now. </> : <>
              <Num v={n.needs} color={red} g={null} /> need you —{' '}
              {n.reminders > 0 && <><Num v={n.reminders} color={red} g="reminders" /> {n.reminders === 1 ? 'reminder' : 'reminders'} due, </>}
              {n.confirm > 0 && <><Num v={n.confirm} color={amber} g="confirm" /> declared {n.confirm === 1 ? 'payment' : 'payments'} to confirm, </>}
              {n.failed > 0 && <><Num v={n.failed} color={red} g="failed" /> {n.failed === 1 ? 'send' : 'sends'} failed, </>}
              {n.visitsOverdue > 0 && <><Num v={n.visitsOverdue} color={red} g="visits_overdue" /> {n.visitsOverdue === 1 ? 'visit' : 'visits'} overdue, </>}
              {n.visitsToday > 0 && <><Num v={n.visitsToday} color={green} g="visits_today" /> {n.visitsToday === 1 ? 'visit' : 'visits'} today, </>}
              {n.inProgress > 0 && <><Num v={n.inProgress} color={brand} g="in_progress" /> {n.inProgress === 1 ? 'visit' : 'visits'} in progress, </>}
              {n.slotsToConfirm > 0 && <><Num v={n.slotsToConfirm} color={amber} g="slots_to_confirm" /> customer {n.slotsToConfirm === 1 ? 'slot' : 'slots'} to confirm, </>}
              {n.calls > 0 && <><Num v={n.calls} color={brand} g="calls" /> {n.calls === 1 ? 'call' : 'calls'} open, </>}
              {n.awaiting > 0 && <><Num v={n.awaiting} color={amber} g="awaiting" /> awaiting activation, </>}
              {n.paused > 0 && <><Num v={n.paused} g="paused" /> paused. </>}
            </>}
            {aheadTotal > 0
              ? <>
                  {ahead.map((p, i) => (
                    <React.Fragment key={p.one}>
                      {i > 0 && (i === ahead.length - 1 ? ' and ' : ', ')}
                      <Num v={p.v} color={green} g={p.g} /> {p.v === 1 ? p.one : `${p.one}s`}
                    </React.Fragment>
                  ))}
                  {' '}{aheadTotal === 1 ? 'falls' : 'fall'} due {windowText}.
                </>
              : <>Nothing falls due {windowText}.</>}
          </h1>
          {lane !== 'collections' && n.unassignedVisits > 0 && (
            <button onClick={() => { setLane('services'); setWho('unassigned'); }}
              className="mt-3 inline-flex items-center gap-1.5 text-[12.5px] font-bold" style={{ color: amber }}>
              <Wrench size={13} /> {plural(n.unassignedVisits, 'visit')} {n.unassignedVisits === 1 ? 'has' : 'have'} no technician yet <ArrowUpRight size={12} />
            </button>
          )}
        </div>
        <button onClick={refresh} title="Refresh"
          className="flex-none inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full text-xs font-bold border mt-1"
          style={{ color: brand, borderColor: `${brand}45` }}>
          <RefreshCw size={13} className={board.isFetching ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {/* ── controls card: VaNi · window · view · search · filters ── */}
      <div className="mt-6 rounded-2xl border px-4 py-3.5" style={{ backgroundColor: colors.utility.secondaryBackground, borderColor: hairline }}>
      <div className="flex items-center justify-between gap-3 flex-wrap">
        {lane === 'services' ? (
          // VaNi speaks about payment reminders; on Services it has nothing to say yet.
          <span className="inline-flex items-center gap-1.5 px-3 min-h-[36px] text-[11.5px] font-bold" style={sub}>
            <Wrench size={12} /> Service visits · run by your team
          </span>
        ) : (
          <button onClick={() => navigate(vaniChip.to)} title={vaniChip.title}
            className="inline-flex items-center gap-1.5 px-3 min-h-[36px] rounded-full text-[11.5px] font-bold border"
            style={{ color: vaniChip.color, borderColor: `${vaniChip.color}55`, backgroundColor: `${vaniChip.color}12` }}>
            <Sparkles size={12} /> {vaniChip.text} <ArrowUpRight size={12} />
          </button>
        )}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="inline-flex rounded-full border p-0.5" style={{ borderColor: `${brand}45`, backgroundColor: colors.utility.primaryBackground }} role="group" aria-label="Horizon">
            {HORIZONS.map((h) => <Seg key={h} on={!range && horizon === h} onClick={() => setHorizon(h)} title={`Next ${h} days`}>{h} d</Seg>)}
            <Seg on={!!range} onClick={() => { setRangeOpen((o) => !o); if (!draftFrom) { setDraftFrom(data.today); setDraftTo(data.window.to); } }} title="Pick dates">
              <CalendarRange size={12} /> {range ? `${fmtDate(range.from)} – ${fmtDate(range.to)}` : 'Dates'}
            </Seg>
          </div>
          <div className="inline-flex rounded-full border p-0.5" style={{ borderColor: `${brand}45`, backgroundColor: colors.utility.primaryBackground }} role="group" aria-label="View">
            <Seg on={view === 'list'} onClick={() => setView('list')} title="List"><List size={12} /> List</Seg>
            <Seg on={view === 'lanes'} onClick={() => setView('lanes')} title="Lanes by when"><LayoutGrid size={12} /> Lanes</Seg>
          </div>
          <label className="inline-flex items-center gap-2 rounded-full border px-3 min-h-[36px] w-52" style={{ borderColor: `${colors.utility.primaryText}30`, backgroundColor: colors.utility.primaryBackground }}>
            <Search size={13} style={sub} />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="name · contract · ref" aria-label="Search"
              className="bg-transparent outline-none text-xs w-full" style={ink} />
            {search && <button onClick={() => setSearch('')} aria-label="Clear search" style={sub}><X size={12} /></button>}
          </label>
        </div>
      </div>
      {rangeOpen && (
        <div className="mt-2 flex items-center gap-2 flex-wrap justify-end">
          <span className="text-[11px] font-bold" style={sub}>From</span>
          <input type="date" value={draftFrom} onChange={(e) => setDraftFrom(e.target.value)} style={{ ...selectStyle, borderRadius: 10 }} aria-label="From date" />
          <span className="text-[11px] font-bold" style={sub}>to</span>
          <input type="date" value={draftTo} onChange={(e) => setDraftTo(e.target.value)} style={{ ...selectStyle, borderRadius: 10 }} aria-label="To date" />
          <button onClick={() => { if (draftFrom && draftTo) { setRange(draftFrom <= draftTo ? { from: draftFrom, to: draftTo } : { from: draftTo, to: draftFrom }); setRangeOpen(false); } }}
            disabled={!draftFrom || !draftTo} className="px-4 min-h-[36px] rounded-full text-[11.5px] font-bold disabled:opacity-60" style={{ backgroundColor: brand, color: '#fff' }}>
            Apply
          </button>
          {range && <button onClick={() => { setRange(null); setRangeOpen(false); }} className="text-[11.5px] font-bold" style={{ color: brand }}>Back to {horizon} d</button>}
        </div>
      )}

      {/* ── lane filters: never mixed. On All, one labelled row per lane; on a lane, only its own row. ── */}
      {(lane ? [lane] : (['collections', 'services'] as BoardLane[])).map((l) => {
        const chips = GROUPS.filter((g) => g.lane === l).map((g) => {
          const c = sum(k, g.kinds);
          if (!c && group !== g.key) return null;
          const color = g.key === 'ahead' || g.key === 'visits_scheduled' || g.key === 'visits_today' ? green
            : g.key === 'confirm' || g.key === 'awaiting' || g.key === 'slots_to_confirm' ? amber
            : g.key === 'calls' || g.key === 'in_progress' ? brand
            : g.key === 'paused' ? colors.utility.secondaryText : red;
          return <Chip key={g.key} on={group === g.key} onClick={() => setGroup(group === g.key ? null : g.key)} color={color}>{g.label} <span className="tabular-nums opacity-80">{c}</span></Chip>;
        }).filter(Boolean);
        const selects = l === 'collections' ? (
          <>
            <select value={channel} onChange={(e) => setChannel(e.target.value as WlChannel | '')} style={selectStyle} aria-label="Next rung channel">
              <option value="">Any channel</option>
              {(['email', 'whatsapp', 'call'] as WlChannel[]).map((ch) => <option key={ch} value={ch}>{ch === 'whatsapp' ? 'WhatsApp' : ch === 'email' ? 'Email' : 'Call'} next · {data.facets.channels[ch] ?? 0}</option>)}
            </select>
            {Object.keys(data.facets.cycles).length > 0 && (
              <select value={cycle} onChange={(e) => setCycle(e.target.value)} style={selectStyle} aria-label="Billing cycle">
                <option value="">Any cycle</option>
                {Object.entries(data.facets.cycles).sort(([a], [b]) => a.localeCompare(b)).map(([label, c]) => <option key={label} value={label}>{label} · {c}</option>)}
              </select>
            )}
          </>
        ) : (
          Object.keys(data.facets.slots).length > 0 && (
            <select value={slot} onChange={(e) => setSlot(e.target.value as SlotState | '')} style={selectStyle} aria-label="Customer slot">
              <option value="">Any slot</option>
              {(['confirmed', 'proposed', 'none'] as SlotState[]).map((s) => (
                <option key={s} value={s}>{s === 'confirmed' ? 'Slot confirmed' : s === 'proposed' ? 'Slot proposed' : 'No slot yet'} · {data.facets.slots[s] ?? 0}</option>
              ))}
            </select>
          )
        );
        if (chips.length === 0 && !selects) return null;
        return (
          <div key={l} className="mt-3 flex items-center gap-2 flex-wrap">
            {!lane && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.18em] w-24" style={{ ...sub, ...mono }}>
                {l === 'services' && <Wrench size={11} />}{laneName(l)}
              </span>
            )}
            {chips}
            {selects}
          </div>
        );
      })}

      {/* ── shared filters: apply to every lane ── */}
      <div className="mt-3 pt-3 flex items-center gap-2 flex-wrap border-t" style={{ borderColor: hairline }}>
        <select value={age} onChange={(e) => setAge(e.target.value as BoardFilters['age'] | '')} style={selectStyle} aria-label="Overdue by">
          <option value="">Any age</option>
          {(['0-7', '8-30', '31-90', '90+'] as const).map((a) => <option key={a} value={a}>Overdue {a === '90+' ? '90+' : a} days · {data.facets.ages[a] ?? 0}</option>)}
        </select>
        <div className="inline-flex rounded-full border p-0.5" style={{ borderColor: `${colors.utility.primaryText}30`, backgroundColor: colors.utility.primaryBackground }} role="group" aria-label="Who">
          {(['team', 'mine', 'unassigned'] as const).map((w) => (
            <Seg key={w} on={who === w} onClick={() => setWho(w)} title={w === 'mine' ? 'Calls and visits assigned to me' : w === 'unassigned' ? 'No call assigned · no technician yet' : 'Everyone'}>
              {w === 'team' ? 'Team' : w === 'mine' ? 'Mine' : 'Unassigned'} <span className="tabular-nums opacity-80">{data.facets.who[w] ?? 0}</span>
            </Seg>
          ))}
        </div>
        {anyFilter && (
          <button onClick={clearFilters} className="inline-flex items-center gap-1 px-3 min-h-[36px] rounded-full text-[11px] font-bold uppercase tracking-wider" style={{ ...mono, color: brand, backgroundColor: `${brand}14` }}>
            showing {data.counts.matched} of {data.counts.in_window} · clear <X size={12} />
          </button>
        )}
      </div>
      </div>

      {/* ── loader: the board keeps the last answer on screen while a new one is fetched (focus, filter, action) ── */}
      <div className="mt-3 h-[3px] rounded-full overflow-hidden" role="progressbar" aria-busy={board.isFetching} aria-label={board.isFetching ? 'Updating the board' : undefined}
        style={{ backgroundColor: board.isFetching ? `${brand}22` : 'transparent' }}>
        {board.isFetching && <div className="h-full w-1/3 rounded-full animate-pulse" style={{ backgroundColor: brand }} />}
      </div>

      {/* ── the board ── */}
      <div style={{ opacity: board.isFetching ? 0.55 : 1, transition: 'opacity .2s ease' }} aria-live="polite">
      {view === 'lanes' ? (
        <div className="mt-3 overflow-x-auto -mx-2 px-2 pb-2">
          <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${buckets.length}, minmax(250px, 1fr))`, minWidth: buckets.length * 250 + (buckets.length - 1) * 12 }}>
            {buckets.map(renderBucket)}
          </div>
        </div>
      ) : (
        <div className="-mt-2">{buckets.map(renderBucket)}</div>
      )}
      </div>

      {/* ── WHAT HAPPENED ── */}
      <div className="flex items-baseline gap-3 mb-2.5 mt-10">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ ...mono, color: colors.utility.primaryText }}>what happened</p>
        <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ ...sub, ...mono }}>{feed.length ? `${lane ? `${laneName(lane).toLowerCase()} · ` : ''}last ${Math.min(feed.length, 12)}` : `nothing yet${lane ? ` in ${laneName(lane)}` : ''}`}</p>
      </div>
      {feed.length > 0 && (
        <div className="rounded-2xl border divide-y max-w-4xl" style={{ borderColor: hairline, backgroundColor: colors.utility.secondaryBackground }}>
          {feed.slice(0, 12).map((h) => <HappenedRow key={h.id} h={h} />)}
        </div>
      )}

      <p className="mt-10 text-[11px] leading-relaxed text-center" style={sub}>
        Collections and Services are live lanes; Sessions join next. Balances and ageing live in{' '}
        <button onClick={() => navigate('/money-in')} className="font-bold" style={{ color: brand }}>Money In</button>; the ladder is set under{' '}
        <button onClick={() => navigate('/settings/configure/automation-rules')} className="font-bold" style={{ color: brand }}>Automation Rules</button>.
      </p>

      {historyFor && (
        <HistoryDrawer
          contractId={historyFor.contract_id}
          title={clean(historyFor.buyer_name) || historyFor.contract_number}
          subtitle={historyFor.lane === 'services'
            ? `${historyFor.contract_number} · Visit${historyFor.visit?.sequence ? ` ${historyFor.visit.sequence}${historyFor.visit.of ? `/${historyFor.visit.of}` : ''}` : ''}${historyFor.visit?.block_name ? ` · ${historyFor.visit.block_name}` : ''}${historyFor.due_date ? ` · ${fmtDate(historyFor.due_date)}` : ''}`
            : `${historyFor.contract_number}${historyFor.cycle_label ? ` · ${historyFor.cycle_label}` : ''}${historyFor.due_date ? ` · due ${fmtDate(historyFor.due_date)}` : ''}`}
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
    </div>
  );
};

// ── empty column ────────────────────────────────────────────────────────────
// An empty Overdue or Today column is GOOD news and should read like it: a small
// theme-aware illustration, a title and one sentence that says what would sit
// here, worded for the focus (All · Collections · Services). With filters on it
// says "nothing matches" instead and offers the clear button — an empty column
// behind a filter is not the same as a clear one.
const EmptyBucket: React.FC<{ bucket: BoardBucket; compact: boolean; lane: BoardLane | null; filtered: boolean; onClear: () => void; today: string }> =
  ({ bucket, compact, lane, filtered, onClear, today }) => {
  const { colors, ink, sub } = useInvoiceTheme();
  const brand = colors.brand.primary;
  const green = colors.semantic.success;
  const hairline = `${colors.utility.primaryText}14`;
  const things = lane === 'collections' ? 'payments' : lane === 'services' ? 'visits' : 'payments or visits';
  const dayNum = new Date(`${today}T00:00:00`).getDate() || new Date().getDate();

  let title: string; let body: string; let art: 'clear' | 'today' | 'window';
  if (filtered) {
    title = 'Nothing matches here';
    body = `No ${things} in this column match the filters you picked.`;
    art = 'window';
  } else if (bucket.key === 'overdue') {
    title = 'All clear';
    body = lane === 'services' ? 'No visit is behind schedule. A visit whose planned day has passed without being started or marked done would sit here.'
      : lane === 'collections' ? 'No payment is past its due date. An overdue instalment would sit here with its next reminder rung.'
      : 'Nothing is past due — no late payment, no visit behind schedule.';
    art = 'clear';
  } else if (bucket.key === 'today') {
    title = 'A quiet today';
    body = lane === 'services' ? 'No visit is planned for today. What is coming next is just below.'
      : lane === 'collections' ? 'No payment falls due today. What is coming next is just below.'
      : 'No payment falls due and no visit is planned for today. What is coming next is just below.';
    art = 'today';
  } else if (bucket.key === 'parked') {
    title = 'Nothing parked';
    body = 'A payment paused without a date would wait here until you resume it.';
    art = 'window';
  } else {
    title = 'Nothing in this stretch';
    body = `No ${things} fall due ${bucketLabel(bucket)}. Widen the horizon or pick dates to look further ahead.`;
    art = 'window';
  }

  const size = compact ? 56 : 88;
  const Art = () => (
    <svg width={size} height={size} viewBox="0 0 88 88" role="img" aria-label={title} style={{ flexShrink: 0 }}>
      <circle cx="44" cy="44" r="40" fill={`${art === 'clear' ? green : brand}12`} />
      {art === 'clear' && (
        <>
          <rect x="24" y="22" width="40" height="46" rx="8" fill={colors.utility.primaryBackground} stroke={`${green}66`} strokeWidth="2" />
          <path d="M33 45 l8 8 l15 -17" fill="none" stroke={green} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="20" cy="24" r="2.5" fill={`${green}99`} /><circle cx="70" cy="20" r="2" fill={`${green}66`} /><circle cx="68" cy="66" r="2.5" fill={`${green}80`} />
        </>
      )}
      {art === 'today' && (
        <>
          <rect x="22" y="26" width="44" height="40" rx="8" fill={colors.utility.primaryBackground} stroke={`${brand}66`} strokeWidth="2" />
          <rect x="22" y="26" width="44" height="12" rx="6" fill={`${brand}33`} />
          <rect x="22" y="34" width="44" height="4" fill={`${brand}33`} />
          <line x1="33" y1="20" x2="33" y2="30" stroke={brand} strokeWidth="3" strokeLinecap="round" />
          <line x1="55" y1="20" x2="55" y2="30" stroke={brand} strokeWidth="3" strokeLinecap="round" />
          <text x="44" y="60" textAnchor="middle" fontSize="20" fontWeight="800" fill={colors.utility.primaryText} fontFamily="ui-sans-serif, system-ui">{dayNum}</text>
          <circle cx="68" cy="24" r="6" fill={`${colors.semantic.warning}55`} />
        </>
      )}
      {art === 'window' && (
        <>
          <rect x="18" y="30" width="52" height="34" rx="8" fill={colors.utility.primaryBackground} stroke={`${brand}55`} strokeWidth="2" strokeDasharray="4 3" />
          <circle cx="32" cy="47" r="3" fill={`${brand}55`} /><circle cx="44" cy="47" r="3" fill={`${brand}88`} /><circle cx="56" cy="47" r="3" fill={`${brand}bb`} />
          <path d="M62 22 l6 6 l-6 6" fill="none" stroke={brand} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </>
      )}
    </svg>
  );

  return (
    <div className={`rounded-2xl border border-dashed ${compact ? 'px-3 py-4 text-center' : 'px-6 py-6'}`}
      style={{ borderColor: hairline, backgroundColor: compact ? 'transparent' : colors.utility.primaryBackground }}>
      <div className={compact ? 'flex flex-col items-center gap-2' : 'flex items-center gap-5'}>
        <Art />
        <div className="min-w-0">
          <p className={`font-extrabold ${compact ? 'text-[12.5px]' : 'text-[15px]'}`} style={ink}>{title}</p>
          <p className={`mt-0.5 leading-snug ${compact ? 'text-[11px]' : 'text-[12.5px] max-w-md'}`} style={sub}>{body}</p>
          {filtered && (
            <button onClick={onClear} className={`mt-2 inline-flex items-center gap-1 font-bold ${compact ? 'text-[11px]' : 'text-xs'}`} style={{ color: brand }}>
              Clear filters <X size={12} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// ── feed row ────────────────────────────────────────────────────────────────
const HappenedRow: React.FC<{ h: WlHappened }> = ({ h }) => {
  const { colors, ink, sub } = useInvoiceTheme();
  const mono: React.CSSProperties = { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' };
  const who = h.actor_type === 'vani' ? 'VaNi' : (h.actor_name || 'Someone');
  const buyer = clean(h.buyer_name) || h.contract_number || 'the customer';
  const text =
    h.kind === 'payment_nudge_email' ? `${who} reminded ${buyer} by email${h.rung ? ` · rung ${h.rung}` : ' · heads-up'}`
    : h.kind === 'payment_nudge_whatsapp' ? `${who} reminded ${buyer} on WhatsApp${h.rung ? ` · rung ${h.rung}` : ' · heads-up'}`
    : h.kind === 'payment_call_due' && h.task_kind === 'follow_up' ? `${who} set a follow-up on ${buyer}${h.due_at ? ` for ${fmtDate(h.due_at)}` : ''}`
    : h.kind === 'payment_call_due' ? `${who} assigned a call about ${buyer} to ${h.assigned_to_name || 'a teammate'}${h.due_at ? ` · due ${fmtDate(h.due_at)}` : ''}`
    : h.kind === 'payment_call_logged' ? `${who} called ${buyer} — ${h.outcome === 'no_answer' ? 'no answer' : h.outcome || 'logged'}${h.notes ? `: ${h.notes}` : ''}`
    // services lane — visit_* rows come from n_jtd_history; due_at carries the slot when there is one
    : h.kind === 'visit_assigned' ? `${who} assigned ${buyer}'s visit to ${h.assigned_to_name || 'a technician'}`
    : h.kind === 'visit_scheduled' ? `${who} proposed ${buyer} a slot${h.due_at ? ` for ${fmtTime(h.due_at)}` : ''}`
    : h.kind === 'visit_slot_confirmed' ? `${who} confirmed ${buyer}'s slot${h.due_at ? ` for ${fmtTime(h.due_at)}` : ''}`
    : h.kind === 'visit_started' ? `${who} started ${buyer}'s visit`
    : h.kind === 'visit_completed' ? `${who} marked ${buyer}'s visit done${h.notes ? `: ${h.notes}` : ''}`
    // the customer loop (migration 015): the customer's own answers arrive with actor_type 'customer'
    : h.kind === 'visit_slot_asked' ? `${who} asked ${buyer} to confirm${h.due_at ? ` ${fmtTime(h.due_at)}` : ' a slot'}`
    : h.kind === 'visit_slot_accepted' ? `${buyer} confirmed the visit${h.due_at ? ` for ${fmtTime(h.due_at)}` : ''} via the link`
    : h.kind === 'visit_slot_proposed' ? `${buyer} suggested another time${h.notes ? `: “${h.notes}”` : ''} — confirm it on the board`
    : h.kind === 'visit_slot_declined' ? `${buyer} said the visit is not needed${h.notes ? `: “${h.notes}”` : ''}`
    : `${who} · ${h.kind}`;
  const isVisit = h.kind.startsWith('visit_');
  const statusColor = h.status === 'failed' ? colors.semantic.error : h.status === 'delivered' || h.status === 'read' || h.status === 'completed' ? colors.semantic.success : colors.utility.secondaryText;
  const Icon = h.kind === 'payment_nudge_email' ? Mail : h.kind === 'payment_nudge_whatsapp' ? MessageCircle : h.kind === 'payment_call_due' ? UserPlus
    : h.kind === 'visit_assigned' ? UserPlus : h.kind === 'visit_scheduled' || h.kind === 'visit_slot_confirmed' || h.kind === 'visit_slot_accepted' ? CalendarCheck
    : h.kind === 'visit_slot_asked' ? Share2 : h.kind === 'visit_slot_proposed' ? CalendarClock : h.kind === 'visit_slot_declined' ? X
    : h.kind === 'visit_started' ? Play : h.kind === 'visit_completed' ? CheckCircle2 : isVisit ? Wrench : PhoneCall;
  return (
    <div className="px-4 py-3 flex items-center gap-3">
      <Icon size={14} style={{ color: colors.brand.primary, flexShrink: 0 }} />
      <p className="text-[13px] flex-1 min-w-0 truncate" style={ink}>{text}</p>
      <span className="text-[10px] font-bold flex-none" style={{ ...mono, color: statusColor }}>{h.status}{h.error ? ` · ${h.error}` : ''}</span>
      <span className="text-[10px] flex-none" style={{ ...sub, ...mono }}>{fmtTime(h.at)}</span>
    </div>
  );
};

export default OpsCommitmentsPage;
