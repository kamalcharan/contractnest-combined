// src/pages/ops/cockpit/Commitments.tsx
//
// Ops on JTD — the future body of /ops/cockpit, staged at /ops/cockpit/next.
// Collections lane, read from ONE reader (jtd_collections_board) over the JTD
// spine and acted on with the ladder TOOLS (spec §4).
//
// ONE row model. Every open payment job is exactly one card with a kind (its
// state), an anchor (when it wants attention) and a bucket by WHEN:
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
import { useNavigate } from 'react-router-dom';
import { ArrowUpRight, Search, RefreshCw, Mail, MessageCircle, PhoneCall, UserPlus, List, LayoutGrid, Sparkles, X, CalendarRange } from 'lucide-react';
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
  collectionsKeys,
  type BoardCard,
  type BoardBucket,
  type BoardFilters,
  type BoardKind,
  type BucketKey,
  type WlChannel,
  type WlHappened,
} from '@/hooks/queries/useCollectionsQueries';
import JobCard, { clean, fmtTime, type JobCardActions, type PauseReason } from '@/components/ops/JobCard';
import LogCallSheet from '@/components/ops/LogCallSheet';
import { useInvoiceTheme } from '../../invoices/ui';
import { fmtMoney, fmtDate } from '@/utils/format';

// ── kinds grouped the way a person thinks about them ─────────────────────────
type Group = 'reminders' | 'confirm' | 'calls' | 'failed' | 'paused' | 'awaiting' | 'ahead';
const GROUPS: Array<{ key: Group; label: string; kinds: BoardKind[] }> = [
  { key: 'reminders', label: 'Reminders due', kinds: ['rung_due', 'overdue_no_ladder', 'ladder_exhausted'] },
  { key: 'confirm', label: 'To confirm', kinds: ['declaration_pending'] },
  { key: 'calls', label: 'Calls open', kinds: ['call_open'] },
  { key: 'failed', label: 'Send failed', kinds: ['send_failed'] },
  { key: 'paused', label: 'Paused', kinds: ['paused'] },
  { key: 'awaiting', label: 'Awaiting activation', kinds: ['awaiting_activation'] },
  { key: 'ahead', label: 'Coming due', kinds: ['payment_ahead', 'rung_ahead'] },
];
const NEEDS_KINDS: BoardKind[] = ['declaration_pending', 'send_failed', 'call_open', 'rung_due', 'overdue_no_ladder', 'ladder_exhausted', 'awaiting_activation'];

type View = 'list' | 'lanes';
type Horizon = 7 | 14 | 30 | 90;
const HORIZONS: Horizon[] = [7, 14, 30, 90];
const BANDS: Record<Horizon, [number, number]> = { 7: [1, 3], 14: [3, 7], 30: [3, 14], 90: [7, 30] };
const PAGE = 20;

// Per-viewer conveniences only (view, horizon). Browser storage can be empty
// or throw in private windows — every read/write is guarded.
const VIEW_KEY = 'ops.board.view';
const HORIZON_KEY = 'ops.board.horizon';
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
  const [group, setGroup] = useState<Group | null>(null);
  const [channel, setChannel] = useState<WlChannel | ''>('');
  const [age, setAge] = useState<BoardFilters['age'] | ''>('');
  const [cycle, setCycle] = useState('');
  const [who, setWho] = useState<'team' | 'mine' | 'unassigned'>('team');
  const [search, setSearch] = useState('');
  const [q, setQ] = useState('');
  const [limits, setLimits] = useState<Partial<Record<BucketKey, number>>>({});
  useEffect(() => { const t = setTimeout(() => setQ(search.trim()), 300); return () => clearTimeout(t); }, [search]);
  // Any filter change resets paging — the buckets are different rows now.
  useEffect(() => { setLimits({}); }, [group, channel, age, cycle, who, q, range]);

  const filters = useMemo<BoardFilters>(() => {
    const f: BoardFilters = { limit: PAGE };
    if (range) { f.from = range.from; f.to = range.to; f.bands = bandsForSpan(Math.max(daysBetween(range.from, range.to), 1)); }
    else { f.horizon = horizon; f.bands = BANDS[horizon]; }
    if (group) f.kinds = GROUPS.find((g) => g.key === group)!.kinds;
    if (channel) f.channel = channel;
    if (age) f.age = age;
    if (cycle) f.cycle = cycle;
    if (who !== 'team') f.who = who;
    if (q) f.q = q;
    if (Object.keys(limits).length) f.limits = limits;
    return f;
  }, [range, horizon, group, channel, age, cycle, who, q, limits]);
  const anyFilter = !!(group || channel || age || cycle || who !== 'team' || q);
  const clearFilters = () => { setGroup(null); setChannel(''); setAge(''); setCycle(''); setWho('team'); setSearch(''); setQ(''); };

  // ── data + tools ───────────────────────────────────────────────────────────
  const enabled = perspective === 'revenue';
  const board = useCollectionsBoard(filters, { enabled });
  const nudge = useNudgePayment();
  const logCall = useLogPaymentCall();
  const escalate = useEscalatePaymentCall();
  const pause = usePauseDunning();
  const resume = useResumeDunning();
  const confirmGs = useConfirmDeclaration();
  const confirmPay = useConfirmPaymentDeclaration();

  const [busyId, setBusyId] = useState<string | null>(null);
  const [callFor, setCallFor] = useState<BoardCard | null>(null);
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
    onAssign: (c, userId) => {
      if (!c.job_id) return;
      if (!userId) { toast.error('Pick a teammate first'); return; }
      return run(c.id, () => escalate.mutateAsync({ jobId: c.job_id!, assignTo: userId }));
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
                : { color: color || colors.utility.primaryText, borderColor: `${color || colors.utility.primaryText}35`, backgroundColor: colors.utility.secondaryBackground }}>
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
    backgroundColor: colors.utility.secondaryBackground, color: colors.utility.primaryText, minHeight: 36,
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
  };
  const windowText = range ? `between ${fmtDate(range.from)} and ${fmtDate(range.to)}` : `in the next ${horizon} days`;
  const ladder = data.ladder;
  const buckets = data.buckets.filter((b) => b.count > 0 || b.key === 'overdue' || b.key === 'today');
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
          <p className={`text-[12px] text-center rounded-xl border border-dashed ${lanes ? 'py-6' : 'py-6'}`} style={{ ...sub, borderColor: hairline }}>
            {b.key === 'overdue' ? 'Nothing overdue.' : b.key === 'today' ? 'Nothing lands today.' : 'Nothing here.'}
          </p>
        ) : (
          <div className={lanes ? 'space-y-2' : 'space-y-2.5'}>
            {b.cards.map((c) => (
              <JobCard key={c.id} card={c} compact={lanes} busy={busyId === c.id} locked={!!busyId && busyId !== c.id}
                team={data.team} ladder={ladder} meId={user?.id} actions={actions} />
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
      {/* ── headline ── */}
      <div className="flex items-start justify-between gap-6 flex-wrap">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] mb-4" style={{ ...sub, ...mono }}>
            ops · {currentTenant?.name || 'your business'} · {fmtDate(data.today)}
          </p>
          <h1 className="text-[26px] sm:text-[30px] leading-snug font-medium max-w-2xl" style={ink}>
            {n.needs === 0 ? <>Nothing needs you right now. </> : <>
              <Num v={n.needs} color={red} g={null} /> need you —{' '}
              {n.reminders > 0 && <><Num v={n.reminders} color={red} g="reminders" /> {n.reminders === 1 ? 'reminder' : 'reminders'} due, </>}
              {n.confirm > 0 && <><Num v={n.confirm} color={amber} g="confirm" /> declared {n.confirm === 1 ? 'payment' : 'payments'} to confirm, </>}
              {n.failed > 0 && <><Num v={n.failed} color={red} g="failed" /> {n.failed === 1 ? 'send' : 'sends'} failed, </>}
              {n.calls > 0 && <><Num v={n.calls} color={brand} g="calls" /> {n.calls === 1 ? 'call' : 'calls'} open, </>}
              {n.awaiting > 0 && <><Num v={n.awaiting} color={amber} g="awaiting" /> awaiting activation, </>}
              {n.paused > 0 && <><Num v={n.paused} g="paused" /> paused. </>}
            </>}
            {n.payments + n.rungsAhead > 0
              ? <>
                  <Num v={n.payments} color={green} g="ahead" /> {n.payments === 1 ? 'payment' : 'payments'}
                  {n.rungsAhead > 0 && <> and <Num v={n.rungsAhead} color={green} g="ahead" /> {n.rungsAhead === 1 ? 'reminder' : 'reminders'}</>}
                  {' '}fall due {windowText}.
                </>
              : <>Nothing falls due {windowText}.</>}
          </h1>
        </div>
        <button onClick={refresh} title="Refresh"
          className="flex-none inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full text-xs font-bold border mt-1"
          style={{ color: brand, borderColor: `${brand}45` }}>
          <RefreshCw size={13} className={board.isFetching ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {/* ── controls: VaNi · window · view · search ── */}
      <div className="mt-6 flex items-center justify-between gap-3 flex-wrap">
        <button onClick={() => navigate(vaniChip.to)} title={vaniChip.title}
          className="inline-flex items-center gap-1.5 px-3 min-h-[36px] rounded-full text-[11.5px] font-bold border"
          style={{ color: vaniChip.color, borderColor: `${vaniChip.color}55`, backgroundColor: `${vaniChip.color}12` }}>
          <Sparkles size={12} /> {vaniChip.text} <ArrowUpRight size={12} />
        </button>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="inline-flex rounded-full border p-0.5" style={{ borderColor: `${brand}45` }} role="group" aria-label="Horizon">
            {HORIZONS.map((h) => <Seg key={h} on={!range && horizon === h} onClick={() => setHorizon(h)} title={`Next ${h} days`}>{h} d</Seg>)}
            <Seg on={!!range} onClick={() => { setRangeOpen((o) => !o); if (!draftFrom) { setDraftFrom(data.today); setDraftTo(data.window.to); } }} title="Pick dates">
              <CalendarRange size={12} /> {range ? `${fmtDate(range.from)} – ${fmtDate(range.to)}` : 'Dates'}
            </Seg>
          </div>
          <div className="inline-flex rounded-full border p-0.5" style={{ borderColor: `${brand}45` }} role="group" aria-label="View">
            <Seg on={view === 'list'} onClick={() => setView('list')} title="List"><List size={12} /> List</Seg>
            <Seg on={view === 'lanes'} onClick={() => setView('lanes')} title="Lanes by when"><LayoutGrid size={12} /> Lanes</Seg>
          </div>
          <label className="inline-flex items-center gap-2 rounded-full border px-3 min-h-[36px] w-52" style={{ borderColor: hairline, backgroundColor: colors.utility.secondaryBackground }}>
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

      {/* ── filters ── */}
      <div className="mt-3 flex items-center gap-2 flex-wrap">
        {GROUPS.map((g) => {
          const c = sum(k, g.kinds);
          if (!c && group !== g.key) return null;
          const color = g.key === 'ahead' ? green : g.key === 'confirm' || g.key === 'awaiting' ? amber : g.key === 'calls' ? brand : g.key === 'paused' ? colors.utility.secondaryText : red;
          return <Chip key={g.key} on={group === g.key} onClick={() => setGroup(group === g.key ? null : g.key)} color={color}>{g.label} <span className="tabular-nums opacity-80">{c}</span></Chip>;
        })}
        <select value={channel} onChange={(e) => setChannel(e.target.value as WlChannel | '')} style={selectStyle} aria-label="Next rung channel">
          <option value="">Any channel</option>
          {(['email', 'whatsapp', 'call'] as WlChannel[]).map((ch) => <option key={ch} value={ch}>{ch === 'whatsapp' ? 'WhatsApp' : ch === 'email' ? 'Email' : 'Call'} next · {data.facets.channels[ch] ?? 0}</option>)}
        </select>
        <select value={age} onChange={(e) => setAge(e.target.value as BoardFilters['age'] | '')} style={selectStyle} aria-label="Overdue by">
          <option value="">Any age</option>
          {(['0-7', '8-30', '31-90', '90+'] as const).map((a) => <option key={a} value={a}>Overdue {a === '90+' ? '90+' : a} days · {data.facets.ages[a] ?? 0}</option>)}
        </select>
        {Object.keys(data.facets.cycles).length > 0 && (
          <select value={cycle} onChange={(e) => setCycle(e.target.value)} style={selectStyle} aria-label="Billing cycle">
            <option value="">Any cycle</option>
            {Object.entries(data.facets.cycles).sort(([a], [b]) => a.localeCompare(b)).map(([label, c]) => <option key={label} value={label}>{label} · {c}</option>)}
          </select>
        )}
        <div className="inline-flex rounded-full border p-0.5" style={{ borderColor: `${colors.utility.primaryText}30` }} role="group" aria-label="Who">
          {(['team', 'mine', 'unassigned'] as const).map((w) => (
            <Seg key={w} on={who === w} onClick={() => setWho(w)} title={w === 'mine' ? 'Calls assigned to me' : w === 'unassigned' ? 'No call assigned' : 'Everyone'}>
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

      {/* ── the board ── */}
      {view === 'lanes' ? (
        <div className="mt-6 overflow-x-auto -mx-2 px-2 pb-2">
          <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${buckets.length}, minmax(250px, 1fr))`, minWidth: buckets.length * 250 + (buckets.length - 1) * 12 }}>
            {buckets.map(renderBucket)}
          </div>
        </div>
      ) : (
        <div className="mt-1">{buckets.map(renderBucket)}</div>
      )}

      {/* ── WHAT HAPPENED ── */}
      <div className="flex items-baseline gap-3 mb-2.5 mt-10">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ ...mono, color: colors.utility.primaryText }}>what happened</p>
        <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ ...sub, ...mono }}>{data.happened.length ? `last ${data.happened.length}` : 'nothing yet'}</p>
      </div>
      {data.happened.length > 0 && (
        <div className="rounded-2xl border divide-y max-w-4xl" style={{ borderColor: hairline, backgroundColor: colors.utility.secondaryBackground }}>
          {data.happened.slice(0, 12).map((h) => <HappenedRow key={h.id} h={h} />)}
        </div>
      )}

      <p className="mt-10 text-[11px] leading-relaxed text-center" style={sub}>
        Collections are the first lane. Sessions, services and appointments join next. Balances and ageing live in{' '}
        <button onClick={() => navigate('/money-in')} className="font-bold" style={{ color: brand }}>Money In</button>; the ladder is set under{' '}
        <button onClick={() => navigate('/settings/configure/automation-rules')} className="font-bold" style={{ color: brand }}>Automation Rules</button>.
      </p>

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

// ── feed row ────────────────────────────────────────────────────────────────
const HappenedRow: React.FC<{ h: WlHappened }> = ({ h }) => {
  const { colors, ink, sub } = useInvoiceTheme();
  const mono: React.CSSProperties = { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' };
  const who = h.actor_type === 'vani' ? 'VaNi' : (h.actor_name || 'Someone');
  const buyer = clean(h.buyer_name) || h.contract_number || 'the customer';
  const text =
    h.kind === 'payment_nudge_email' ? `${who} reminded ${buyer} by email${h.rung ? ` · rung ${h.rung}` : ' · heads-up'}`
    : h.kind === 'payment_nudge_whatsapp' ? `${who} reminded ${buyer} on WhatsApp${h.rung ? ` · rung ${h.rung}` : ' · heads-up'}`
    : h.kind === 'payment_call_due' ? `${who} assigned a call about ${buyer} to ${h.assigned_to_name || 'a teammate'}`
    : h.kind === 'payment_call_logged' ? `${who} called ${buyer} — ${h.outcome === 'no_answer' ? 'no answer' : h.outcome || 'logged'}${h.notes ? `: ${h.notes}` : ''}`
    : `${who} · ${h.kind}`;
  const statusColor = h.status === 'failed' ? colors.semantic.error : h.status === 'delivered' || h.status === 'read' || h.status === 'completed' ? colors.semantic.success : colors.utility.secondaryText;
  const Icon = h.kind === 'payment_nudge_email' ? Mail : h.kind === 'payment_nudge_whatsapp' ? MessageCircle : h.kind === 'payment_call_due' ? UserPlus : PhoneCall;
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
