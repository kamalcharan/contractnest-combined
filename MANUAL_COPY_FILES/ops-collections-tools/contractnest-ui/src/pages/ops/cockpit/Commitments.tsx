// src/pages/ops/cockpit/Commitments.tsx
//
// Ops on JTD — the future body of /ops/cockpit, staged at /ops/cockpit/next.
// Collections lane, read from ONE reader (jtd_collections_worklist) over the
// JTD spine and acted on with the ladder TOOLS (spec §4). Three sections:
//
//   Needs you     one card per decision — a rung due (nudge by email /
//                 WhatsApp, log a call, assign a call, pause), a declared
//                 payment to confirm, a call assigned and open, a paused
//                 ladder to resume, a contract waiting for its activation
//                 payment, a failed send to retry
//   What happened the tool feed — who nudged / called / assigned, when, status
//   Coming up     what falls due inside the horizon: payments and next rungs
//
// Owner rules: never repeat Money In (no balances, totals, ageing — Money In
// is the ledger); every action is a tool with an actor; nothing automatic.
// Money In's design idiom: situation sentence with tappable numbers, signal
// bullets as lenses, story rows, theme tokens, 44px targets.

import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowUpRight, Search, RefreshCw, Check, Mail, MessageCircle, PhoneCall, UserPlus, PauseCircle, PlayCircle, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/context/AuthContext';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { useConfirmDeclaration } from '@/hooks/queries/useGroupSessionsDashboard';
import { useConfirmPaymentDeclaration } from '@/hooks/queries/usePaymentDeclarations';
import {
  useCollectionsWorklist,
  useNudgePayment,
  useLogPaymentCall,
  useEscalatePaymentCall,
  usePauseDunning,
  useResumeDunning,
  collectionsKeys,
  type WlCard,
  type WlHappened,
  type CallOutcome,
} from '@/hooks/queries/useCollectionsQueries';
import { useQueryClient } from '@tanstack/react-query';
import { useInvoiceTheme } from '../../invoices/ui';
import { fmtMoney, fmtDate } from '@/utils/format';

type Lens = 'all' | 'rungs' | 'declared' | 'calls' | 'paused' | 'ahead';

const clean = (s: string | null | undefined) => (s || '').replace(/\s+/g, ' ').trim();
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const fmtTime = (iso: string | null | undefined) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}, ${d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true })}`;
};
const channelLabel = (c: string | null | undefined) => (c === 'whatsapp' ? 'WhatsApp' : c === 'email' ? 'email' : c === 'call' ? 'call' : c || '');
const todayISO = () => new Date().toISOString().slice(0, 10);

const KIND_ORDER: WlCard['kind'][] = ['declaration_pending', 'rung_due', 'call_open', 'overdue_no_ladder', 'ladder_exhausted', 'paused'];

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

  const [lens, setLens] = useState<Lens>('all');
  const [search, setSearch] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [callFor, setCallFor] = useState<WlCard | null>(null);
  const [assignFor, setAssignFor] = useState<string | null>(null);
  const [assignTo, setAssignTo] = useState<string>('');
  const [pauseFor, setPauseFor] = useState<string | null>(null);
  const [pauseReason, setPauseReason] = useState<'promise' | 'dispute' | 'manual'>('manual');
  const [pauseUntil, setPauseUntil] = useState<string>('');

  const enabled = perspective === 'revenue';
  const wl = useCollectionsWorklist(30, { enabled });
  const nudge = useNudgePayment();
  const logCall = useLogPaymentCall();
  const escalate = useEscalatePaymentCall();
  const pause = usePauseDunning();
  const resume = useResumeDunning();
  const confirmGs = useConfirmDeclaration();
  const confirmPay = useConfirmPaymentDeclaration();

  const data = wl.data;
  const cards = data?.needs_you.cards ?? [];
  const awaiting = data?.needs_you.awaiting_payment_to_activate ?? [];
  const failed = data?.needs_you.send_failed ?? [];
  const due = data?.coming_up.due ?? [];
  const rungsAhead = data?.coming_up.rungs ?? [];
  const happened = data?.happened ?? [];
  const team = data?.team ?? [];
  const ladder = data?.ladder;

  const counts = {
    rungs: cards.filter((c) => c.kind === 'rung_due' || c.kind === 'overdue_no_ladder' || c.kind === 'ladder_exhausted').length,
    declared: cards.filter((c) => c.kind === 'declaration_pending').length,
    calls: cards.filter((c) => c.kind === 'call_open').length,
    paused: cards.filter((c) => c.kind === 'paused').length,
  };
  const needsTotal = cards.length + awaiting.length + failed.length;
  const dueToday = due.filter((d) => d.days_until <= 0).length;
  const dueSoon = due.filter((d) => d.days_until > 0 && d.days_until <= 3).length;

  const refresh = () => queryClient.invalidateQueries({ queryKey: collectionsKeys.all });

  // ── actions (one in flight at a time; the hooks toast + refetch) ──────────
  const run = async (id: string, fn: () => Promise<unknown>) => {
    if (busyId) return;
    setBusyId(id);
    try { await fn(); } catch { /* toasted by the hook */ } finally { setBusyId(null); }
  };
  const doNudge = (c: WlCard, channel: 'email' | 'whatsapp') => run(c.job_id, () => nudge.mutateAsync({ jobId: c.job_id, channel }));
  const doRetry = (jobId: string, channel: string) =>
    run(jobId, () => nudge.mutateAsync({ jobId, channel: channel === 'whatsapp' ? 'whatsapp' : 'email' }));
  const doResume = (c: WlCard) => run(c.job_id, () => resume.mutateAsync({ jobId: c.job_id }));
  const doConfirm = (c: WlCard) => {
    if (!c.declaration) return;
    const d = c.declaration;
    return run(c.job_id, async () => {
      if (d.kind === 'session') await confirmGs.mutateAsync({ id: d.id, confirm: true });
      else await confirmPay.mutateAsync({ id: d.id, confirm: true } as any);
      toast.success(`Payment confirmed — ${fmtMoney(d.amount, c.currency)} from ${clean(c.buyer_name) || c.contract_number}`);
      refresh();
    });
  };
  const doAssign = (c: WlCard) => {
    if (!assignTo) { toast.error('Pick a teammate first'); return; }
    return run(c.job_id, async () => {
      await escalate.mutateAsync({ jobId: c.job_id, assignTo });
      setAssignFor(null); setAssignTo('');
    });
  };
  const doPause = (c: WlCard) => {
    if (pauseReason === 'promise' && !pauseUntil) { toast.error('A promise needs a date'); return; }
    return run(c.job_id, async () => {
      await pause.mutateAsync({ jobId: c.job_id, reason: pauseReason, until: pauseReason === 'promise' ? pauseUntil : null });
      setPauseFor(null); setPauseUntil(''); setPauseReason('manual');
    });
  };

  // ── filtering ──────────────────────────────────────────────────────────────
  const q = search.trim().toLowerCase();
  const matches = (c: WlCard) =>
    !q || [c.buyer_name, c.contract_number, c.invoice_number, c.declaration?.reference, c.block_name].some((s) => (s || '').toLowerCase().includes(q));
  const visibleCards = useMemo(() => {
    let r = cards;
    if (lens === 'rungs') r = r.filter((c) => c.kind === 'rung_due' || c.kind === 'overdue_no_ladder' || c.kind === 'ladder_exhausted');
    if (lens === 'declared') r = r.filter((c) => c.kind === 'declaration_pending');
    if (lens === 'calls') r = r.filter((c) => c.kind === 'call_open');
    if (lens === 'paused') r = r.filter((c) => c.kind === 'paused');
    if (lens === 'ahead') r = [];
    return r.filter(matches).slice().sort((a, b) => KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind) || b.days_overdue - a.days_overdue);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cards, lens, q]);
  const showAwaiting = lens === 'all' && awaiting.length > 0;
  const showFailed = lens === 'all' && failed.length > 0;
  const showAhead = lens === 'all' || lens === 'ahead';
  const toggle = (l: Lens) => setLens((cur) => (cur === l ? 'all' : l));

  // ── chrome ─────────────────────────────────────────────────────────────────
  const Num: React.FC<{ v: string | number; color?: string; l: Lens }> = ({ v, color, l }) => (
    <button onClick={() => toggle(l)} className="font-extrabold tabular-nums align-baseline"
      style={{ color: color || colors.utility.primaryText, borderBottom: `2px ${lens === l ? 'solid' : 'dotted'} ${color || brand}`, fontSize: '1.15em' }}>
      {v}
    </button>
  );
  const Signal: React.FC<{ color: string; l: Lens; children: React.ReactNode }> = ({ color, l, children }) => (
    <button onClick={() => toggle(l)} className="text-left text-[13.5px] leading-relaxed min-h-[44px] flex items-center"
      style={{ color: colors.utility.primaryText, opacity: lens === l ? 1 : 0.85 }}>
      <span className="inline-block w-1.5 h-1.5 rounded-full mr-2 align-middle flex-none" style={{ backgroundColor: color }} />
      <span>{children}
        <span className="ml-1 font-bold" style={{ color, borderBottom: `2px ${lens === l ? 'solid' : 'dotted'} ${color}` }}>{lens === l ? 'showing' : 'look'}</span>
      </span>
    </button>
  );
  const Pill: React.FC<{ color: string; children: React.ReactNode; filled?: boolean }> = ({ color, children, filled }) => (
    <span className="flex-none text-[10px] font-bold px-2.5 py-1 rounded-full border whitespace-nowrap"
      style={{ color, borderColor: `${color}55`, backgroundColor: filled ? `${color}14` : 'transparent' }}>{children}</span>
  );
  const Btn: React.FC<{ onClick: () => void; primary?: boolean; busy?: boolean; disabled?: boolean; title?: string; children: React.ReactNode }> =
    ({ onClick, primary, busy, disabled, title, children }) => (
      <button onClick={onClick} disabled={disabled || busy} title={title}
        className="flex-none inline-flex items-center justify-center gap-1.5 px-3.5 min-h-[40px] rounded-full text-xs font-bold disabled:opacity-60 disabled:cursor-not-allowed"
        style={primary ? { backgroundColor: brand, color: '#fff' } : { border: `1px solid ${brand}45`, color: brand, backgroundColor: colors.utility.secondaryBackground }}>
        {busy ? <LoadingSpinner size="sm" /> : children}
      </button>
    );
  const SectionHead: React.FC<{ label: string; note?: React.ReactNode; color?: string }> = ({ label, note, color }) => (
    <div className="flex items-baseline gap-3 mb-2.5 mt-8">
      <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ ...mono, color: color || colors.utility.primaryText }}>{label}</p>
      {note && <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ ...sub, ...mono }}>{note}</p>}
    </div>
  );
  const inputStyle: React.CSSProperties = {
    border: `1px solid ${brand}60`, borderRadius: 10, padding: '8px 10px', fontSize: 13,
    backgroundColor: colors.utility.primaryBackground, color: colors.utility.primaryText, minHeight: 40,
  };

  // ── card copy ─────────────────────────────────────────────────────────────
  const kindColor = (k: WlCard['kind']) =>
    k === 'declaration_pending' ? amber : k === 'paused' ? colors.utility.secondaryText : k === 'call_open' ? brand : red;
  const kindLabel = (c: WlCard) =>
    c.kind === 'declaration_pending' ? 'To confirm'
    : c.kind === 'call_open' ? 'Call assigned'
    : c.kind === 'paused' ? (c.paused_reason === 'promise' ? 'Promised' : c.paused_reason === 'dispute' ? 'Disputed' : 'Paused')
    : c.kind === 'rung_due' ? `Rung ${c.rung?.step} due`
    : c.kind === 'ladder_exhausted' ? 'Ladder done'
    : 'Overdue';
  const evidence = (c: WlCard) => {
    const bits: string[] = [];
    if (c.cycle_label) bits.push(c.cycle_label);
    bits.push(`due ${fmtDate(c.due_date)}`);
    if (c.days_overdue > 0) bits.push(`${c.days_overdue} days overdue`);
    bits.push(c.nudge_count ? `reminded ${c.nudge_count}×` : 'never reminded');
    if (c.last_nudge_at) bits.push(`last ${c.last_kind === 'payment_call_logged' ? 'call' : channelLabel(c.last_channel)} ${fmtDate(c.last_nudge_at)}`);
    if (c.kind === 'rung_due' && c.rung) bits.push(`${channelLabel(c.rung.channel)} rung since ${fmtDate(c.rung.due_at)}`);
    if (c.kind === 'paused' && c.paused_reason === 'promise' && c.promise_date) bits.push(`promised for ${fmtDate(c.promise_date)}`);
    if (c.kind === 'call_open' && c.call_task) bits.push(`with ${c.call_task.assigned_to_name || 'a teammate'}`);
    if (c.kind === 'declaration_pending' && c.declaration) bits.push(`declared ${fmtMoney(c.declaration.amount, c.currency)}${c.declaration.reference ? ` · ref ${c.declaration.reference}` : ' · no reference'} · ${fmtDate(c.declaration.at)}`);
    if (c.kind === 'overdue_no_ladder') bits.push(ladder && ladder.rungs.length === 0 ? 'no ladder set' : 'no rung scheduled');
    if (c.kind === 'ladder_exhausted') bits.push('all rungs used');
    return bits.join(' · ');
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
  if (wl.isLoading) return <div className="py-24 flex justify-center"><LoadingSpinner size="lg" /></div>;
  if (wl.isError || !data) {
    return (
      <div className="py-24 text-center">
        <p className="text-sm mb-3" style={sub}>Couldn't load your worklist.</p>
        <button onClick={() => wl.refetch()} className="inline-flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-full border" style={{ color: brand, borderColor: `${brand}45` }}>
          <RefreshCw size={13} /> Retry
        </button>
      </div>
    );
  }

  const showing = lens === 'rungs' ? 'reminders due' : lens === 'declared' ? 'to confirm' : lens === 'calls' ? 'calls open' : lens === 'paused' ? 'paused' : lens === 'ahead' ? 'coming up' : null;

  return (
    <div className="px-6 py-8 max-w-4xl mx-auto">
      {/* ── headline ── */}
      <div className="flex items-start justify-between gap-6 flex-wrap">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] mb-4" style={{ ...sub, ...mono }}>
            ops · {currentTenant?.name || 'your business'} · {fmtDate(data.today)}
          </p>
          <h1 className="text-[26px] sm:text-[30px] leading-snug font-medium max-w-2xl" style={ink}>
            {needsTotal === 0 ? <>Nothing needs you right now. </> : <>
              <Num v={needsTotal} color={red} l="all" /> need you —{' '}
              {counts.rungs > 0 && <><Num v={counts.rungs} color={red} l="rungs" /> {counts.rungs === 1 ? 'reminder' : 'reminders'} due, </>}
              {counts.declared > 0 && <><Num v={counts.declared} color={amber} l="declared" /> declared {counts.declared === 1 ? 'payment' : 'payments'} to confirm, </>}
              {counts.calls > 0 && <><Num v={counts.calls} color={brand} l="calls" /> {counts.calls === 1 ? 'call' : 'calls'} open, </>}
              {counts.paused > 0 && <><Num v={counts.paused} l="paused" /> paused. </>}
            </>}
            {due.length > 0
              ? <><Num v={due.length} l="ahead" /> {due.length === 1 ? 'payment falls' : 'payments fall'} due in the next 30 days{dueToday ? <>, {dueToday} today</> : null}.</>
              : <>Nothing falls due in the next 30 days.</>}
          </h1>
        </div>
        <button onClick={refresh} title="Refresh"
          className="flex-none inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full text-xs font-bold border mt-1"
          style={{ color: brand, borderColor: `${brand}45` }}>
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      {/* ── signals ── */}
      <div className="mt-6 space-y-1">
        {counts.rungs > 0 && <Signal color={red} l="rungs"><b>{plural(counts.rungs, 'payment')}</b> waiting for a reminder — the ladder says a rung is due.{' '}</Signal>}
        {counts.declared > 0 && <Signal color={amber} l="declared"><b>{plural(counts.declared, 'declared payment')}</b> waiting for your confirmation.{' '}</Signal>}
        {counts.calls > 0 && <Signal color={brand} l="calls"><b>{plural(counts.calls, 'call')}</b> assigned and still open.{' '}</Signal>}
        {counts.paused > 0 && <Signal color={colors.utility.secondaryText} l="paused"><b>{plural(counts.paused, 'ladder')}</b> paused — a promise, a dispute or by hand.{' '}</Signal>}
        {(dueToday > 0 || dueSoon > 0) && <Signal color={green} l="ahead"><b>{dueToday ? `${dueToday} today` : ''}{dueToday && dueSoon ? ' · ' : ''}{dueSoon ? `${dueSoon} in the next 3 days` : ''}</b> — payments coming due.{' '}</Signal>}
      </div>

      {/* ── list header ── */}
      <div className="mt-8 mb-1 flex items-center justify-between gap-4 flex-wrap">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] flex-none" style={{ ...sub, ...mono }}>
          collections · {ladder ? `ladder ${ladder.rungs.map((r) => `${r.after_days}${r.channel[0]}`).join(' · ') || 'none'}` : ''}
          {ladder && !ladder.rule_enabled ? ' · automation off' : ''}
        </p>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          {showing && (
            <button onClick={() => setLens('all')}
              className="flex-none inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider"
              style={{ ...mono, color: brand, backgroundColor: `${brand}14` }}>
              showing: {showing} ✕
            </button>
          )}
          <label className="inline-flex items-center gap-2 rounded-full border px-3 min-h-[40px] w-56" style={{ borderColor: hairline, backgroundColor: colors.utility.secondaryBackground }}>
            <Search size={13} style={sub} />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="name · contract · ref" aria-label="Search"
              className="bg-transparent outline-none text-xs w-full" style={ink} />
          </label>
        </div>
      </div>

      {/* ── NEEDS YOU ── */}
      {lens !== 'ahead' && (
        <>
          <SectionHead label="needs you" note={`${visibleCards.length + (showAwaiting ? awaiting.length : 0) + (showFailed ? failed.length : 0)} decisions`} color={red} />
          {visibleCards.length === 0 && !showAwaiting && !showFailed ? (
            <p className="text-[13px] py-10 text-center rounded-2xl border border-dashed" style={{ ...sub, borderColor: hairline }}>
              {cards.length === 0 ? 'Nothing is waiting on you.' : 'Nothing matches — clear the search or the filter above.'}
            </p>
          ) : (
            <div className="space-y-2.5">
              {visibleCards.map((c) => {
                const busy = busyId === c.job_id;
                const kc = kindColor(c.kind);
                const canNudge = c.kind === 'rung_due' || c.kind === 'overdue_no_ladder' || c.kind === 'ladder_exhausted' || c.kind === 'call_open';
                const rungChannel = c.kind === 'rung_due' ? c.rung?.channel : null;
                return (
                  <div key={c.job_id} className="rounded-2xl border px-4 py-3.5"
                    style={{ backgroundColor: colors.utility.secondaryBackground, borderColor: hairline }}>
                    <div className="flex items-center gap-4">
                      <span className="w-1 self-stretch rounded-full flex-none" style={{ backgroundColor: `${kc}66` }} />
                      <div className="min-w-0 flex-1">
                        <p className="text-[15px] font-bold truncate" style={ink}>
                          {clean(c.buyer_name) || c.contract_number}
                          <button onClick={() => navigate(`/contracts/${c.contract_id}`)} className="ml-2 text-[10px] font-bold align-middle" style={{ ...mono, color: brand }}>{c.contract_number}</button>
                        </p>
                        <p className="text-[12.5px] mt-0.5" style={{ color: c.days_overdue > 0 && c.kind !== 'declaration_pending' ? red : colors.utility.secondaryText }}>{evidence(c)}</p>
                      </div>
                      <div className="text-right flex-none">
                        <p className="text-lg font-extrabold tabular-nums" style={ink}>{fmtMoney(c.amount, c.currency)}</p>
                        <p className="text-[10px] truncate max-w-[140px]" style={{ ...sub, ...mono }}>{c.invoice_number || c.block_name || ''}</p>
                      </div>
                      <Pill color={kc} filled={c.kind !== 'paused'}>{kindLabel(c)}</Pill>
                    </div>

                    {/* actions */}
                    <div className="mt-3 pl-5 flex items-center gap-2 flex-wrap">
                      {c.kind === 'declaration_pending' && (
                        <>
                          <Btn primary busy={busy} onClick={() => doConfirm(c)}><Check size={13} /> Confirm</Btn>
                          <Btn onClick={() => navigate(c.declaration?.kind === 'session' ? '/group-sessions' : `/contracts/${c.contract_id}`)}>Review</Btn>
                        </>
                      )}
                      {canNudge && (
                        <>
                          <Btn primary={rungChannel === 'email'} busy={busy} onClick={() => doNudge(c, 'email')}><Mail size={13} /> Email</Btn>
                          <Btn primary={rungChannel === 'whatsapp'} busy={busy} onClick={() => doNudge(c, 'whatsapp')}><MessageCircle size={13} /> WhatsApp</Btn>
                          <Btn onClick={() => setCallFor(c)} disabled={busy}><PhoneCall size={13} /> Log a call</Btn>
                          {c.kind !== 'call_open' && (
                            <Btn primary={rungChannel === 'call'} onClick={() => { setAssignFor(assignFor === c.job_id ? null : c.job_id); setAssignTo(user?.id || ''); }} disabled={busy}>
                              <UserPlus size={13} /> Assign call
                            </Btn>
                          )}
                          <Btn onClick={() => { setPauseFor(pauseFor === c.job_id ? null : c.job_id); }} disabled={busy}><PauseCircle size={13} /> Pause</Btn>
                        </>
                      )}
                      {c.kind === 'paused' && (
                        <>
                          <Btn primary busy={busy} onClick={() => doResume(c)}><PlayCircle size={13} /> Resume</Btn>
                          <Btn onClick={() => setCallFor(c)} disabled={busy}><PhoneCall size={13} /> Log a call</Btn>
                        </>
                      )}
                      <button onClick={() => navigate(`/contracts/${c.contract_id}`)} className="ml-auto text-xs font-bold inline-flex items-center gap-1" style={{ color: brand }}>
                        Open <ArrowUpRight size={13} />
                      </button>
                    </div>

                    {/* inline: assign */}
                    {assignFor === c.job_id && (
                      <div className="mt-3 pl-5 flex items-center gap-2 flex-wrap">
                        <select value={assignTo} onChange={(e) => setAssignTo(e.target.value)} style={{ ...inputStyle, minWidth: 200 }} aria-label="Assign the call to">
                          <option value="">Assign the call to…</option>
                          {team.map((m) => <option key={m.user_id} value={m.user_id}>{m.name || m.user_id}</option>)}
                        </select>
                        <Btn primary busy={busy} onClick={() => doAssign(c)}>Assign</Btn>
                        <Btn onClick={() => setAssignFor(null)}><X size={13} /></Btn>
                      </div>
                    )}
                    {/* inline: pause */}
                    {pauseFor === c.job_id && (
                      <div className="mt-3 pl-5 flex items-center gap-2 flex-wrap">
                        <select value={pauseReason} onChange={(e) => setPauseReason(e.target.value as any)} style={inputStyle} aria-label="Why pause">
                          <option value="manual">Pause reminders (by hand)</option>
                          <option value="promise">Customer promised to pay by…</option>
                          <option value="dispute">Amount is disputed</option>
                        </select>
                        {pauseReason === 'promise' && (
                          <input type="date" value={pauseUntil} min={todayISO()} onChange={(e) => setPauseUntil(e.target.value)} style={inputStyle} aria-label="Promised date" />
                        )}
                        <Btn primary busy={busy} onClick={() => doPause(c)}>Pause</Btn>
                        <Btn onClick={() => setPauseFor(null)}><X size={13} /></Btn>
                      </div>
                    )}
                  </div>
                );
              })}

              {showAwaiting && awaiting.map((a) => (
                <div key={a.contract_id} className="rounded-2xl border px-4 py-3.5 flex items-center gap-4"
                  style={{ backgroundColor: colors.utility.secondaryBackground, borderColor: hairline }}>
                  <span className="w-1 self-stretch rounded-full flex-none" style={{ backgroundColor: `${amber}66` }} />
                  <div className="min-w-0 flex-1">
                    <p className="text-[15px] font-bold truncate" style={ink}>{clean(a.buyer_name) || a.contract_number}
                      <span className="ml-2 text-[10px] font-bold align-middle" style={{ ...mono, color: brand }}>{a.contract_number}</span></p>
                    <p className="text-[12.5px] mt-0.5" style={sub}>awaiting the activation payment · sent {fmtDate(a.since)}{a.start_date ? ` · starts ${fmtDate(a.start_date)}` : ''}</p>
                  </div>
                  <div className="text-right flex-none"><p className="text-lg font-extrabold tabular-nums" style={ink}>{a.amount != null ? fmtMoney(a.amount, a.currency) : ''}</p></div>
                  <Pill color={amber} filled>Awaiting payment</Pill>
                  <Btn onClick={() => navigate(`/contracts/${a.contract_id}`)}>Open</Btn>
                </div>
              ))}

              {showFailed && failed.map((f) => (
                <div key={f.reminder_id} className="rounded-2xl border px-4 py-3.5 flex items-center gap-4"
                  style={{ backgroundColor: colors.utility.secondaryBackground, borderColor: hairline }}>
                  <span className="w-1 self-stretch rounded-full flex-none" style={{ backgroundColor: `${red}66` }} />
                  <div className="min-w-0 flex-1">
                    <p className="text-[15px] font-bold truncate" style={ink}>{clean(f.recipient_name) || f.contract_number}
                      <span className="ml-2 text-[10px] font-bold align-middle" style={{ ...mono, color: brand }}>{f.contract_number}</span></p>
                    <p className="text-[12.5px] mt-0.5" style={{ color: red }}>{channelLabel(f.channel)} to {f.recipient_contact} failed {fmtTime(f.at)}{f.error ? ` · ${f.error}` : ''}</p>
                  </div>
                  <Pill color={red} filled>Send failed</Pill>
                  <Btn primary busy={busyId === f.job_id} onClick={() => doRetry(f.job_id, f.channel)}><RefreshCw size={13} /> Retry</Btn>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── WHAT HAPPENED ── */}
      {lens === 'all' && (
        <>
          <SectionHead label="what happened" note={happened.length ? `last ${happened.length}` : 'nothing yet'} />
          {happened.length > 0 && (
            <div className="rounded-2xl border divide-y" style={{ borderColor: hairline, backgroundColor: colors.utility.secondaryBackground }}>
              {happened.slice(0, 12).map((h) => <HappenedRow key={h.id} h={h} />)}
            </div>
          )}
        </>
      )}

      {/* ── COMING UP ── */}
      {showAhead && (
        <>
          <SectionHead label="coming up" note={`next 30 days · ${plural(due.length, 'payment')} · ${plural(rungsAhead.length, 'rung')}`} color={green} />
          {due.length === 0 && rungsAhead.length === 0 ? (
            <p className="text-[13px] py-8 text-center rounded-2xl border border-dashed" style={{ ...sub, borderColor: hairline }}>Nothing falls due inside the horizon.</p>
          ) : (
            <div className="rounded-2xl border divide-y" style={{ borderColor: hairline, backgroundColor: colors.utility.secondaryBackground }}>
              {due.filter((d) => !q || [d.buyer_name, d.contract_number].some((s) => (s || '').toLowerCase().includes(q))).slice(0, 60).map((d) => (
                <div key={d.job_id} className="px-4 py-3 flex items-center gap-4">
                  <p className="text-[11px] font-bold w-24 flex-none" style={{ ...mono, color: d.days_until <= 0 ? green : colors.utility.secondaryText }}>
                    {d.days_until <= 0 ? 'today' : d.days_until <= 3 ? `in ${d.days_until} d` : fmtDate(d.due_date)}
                  </p>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13.5px] font-bold truncate" style={ink}>{clean(d.buyer_name) || d.contract_number}
                      <span className="ml-2 text-[10px] font-bold align-middle" style={{ ...mono, color: brand }}>{d.contract_number}</span></p>
                    <p className="text-[12px] truncate" style={sub}>{d.cycle_label || d.block_name || ''}</p>
                  </div>
                  <p className="text-[15px] font-extrabold tabular-nums flex-none" style={ink}>{fmtMoney(d.amount, d.currency)}</p>
                </div>
              ))}
              {rungsAhead.slice(0, 20).map((r) => (
                <div key={`${r.job_id}-${r.rung.step}`} className="px-4 py-3 flex items-center gap-4">
                  <p className="text-[11px] font-bold w-24 flex-none" style={{ ...mono, color: colors.utility.secondaryText }}>{fmtDate(r.rung.due_at)}</p>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13.5px] truncate" style={ink}>{channelLabel(r.rung.channel)} rung {r.rung.step} for <b>{clean(r.buyer_name) || r.contract_number}</b></p>
                    <p className="text-[12px] truncate" style={sub}>day {r.rung.after_days} after {fmtDate(r.due_date)}</p>
                  </div>
                  <p className="text-[13px] font-bold tabular-nums flex-none" style={sub}>{fmtMoney(r.amount, r.currency)}</p>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      <p className="mt-10 text-[11px] leading-relaxed text-center" style={sub}>
        Collections are the first lane. Sessions, services and appointments join next. Balances and ageing live in{' '}
        <button onClick={() => navigate('/money-in')} className="font-bold" style={{ color: brand }}>Money In</button>; the ladder is set under{' '}
        <button onClick={() => navigate('/settings/configure/automation-rules')} className="font-bold" style={{ color: brand }}>Automation Rules</button>.
      </p>

      {/* ── Log a call sheet ── */}
      {callFor && (
        <LogCallSheet
          card={callFor}
          busy={busyId === callFor.job_id}
          onClose={() => setCallFor(null)}
          onSubmit={(v) => run(callFor.job_id, async () => {
            await logCall.mutateAsync({ jobId: callFor.job_id, calledAt: v.calledAt, outcome: v.outcome, notes: v.notes, promiseDate: v.promiseDate });
            setCallFor(null);
          })}
          colors={colors} ink={ink} sub={sub} brand={brand} inputStyle={inputStyle}
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
    h.kind === 'payment_nudge_email' ? `${who} reminded ${buyer} by email${h.rung ? ` · rung ${h.rung}` : ''}`
    : h.kind === 'payment_nudge_whatsapp' ? `${who} reminded ${buyer} on WhatsApp${h.rung ? ` · rung ${h.rung}` : ''}`
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

// ── Log a call sheet ─────────────────────────────────────────────────────────
const LogCallSheet: React.FC<{
  card: WlCard;
  busy: boolean;
  onClose: () => void;
  onSubmit: (v: { calledAt: string; outcome: CallOutcome; notes?: string; promiseDate?: string | null }) => void;
  colors: any; ink: React.CSSProperties; sub: React.CSSProperties; brand: string; inputStyle: React.CSSProperties;
}> = ({ card, busy, onClose, onSubmit, colors, ink, sub, brand, inputStyle }) => {
  const [outcome, setOutcome] = useState<CallOutcome>('reached');
  const [notes, setNotes] = useState('');
  const [promiseDate, setPromiseDate] = useState('');
  const [calledAt, setCalledAt] = useState(() => {
    const d = new Date(); d.setSeconds(0, 0);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  });
  const canSubmit = outcome !== 'promised' || !!promiseDate;
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.45)' }} onClick={onClose}>
      <div className="w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-5" style={{ backgroundColor: colors.utility.primaryBackground }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={sub}>log a call</p>
            <h2 className="text-lg font-extrabold" style={ink}>{clean(card.buyer_name) || card.contract_number}</h2>
            <p className="text-xs" style={sub}>{fmtMoney(card.amount, card.currency)} · {card.contract_number} · due {fmtDate(card.due_date)}</p>
          </div>
          <button onClick={onClose} aria-label="Close" style={{ color: colors.utility.secondaryText }}><X size={18} /></button>
        </div>
        <div className="space-y-3">
          <label className="block text-xs font-bold" style={sub}>When
            <input type="datetime-local" value={calledAt} onChange={(e) => setCalledAt(e.target.value)} style={{ ...inputStyle, width: '100%', marginTop: 4 }} />
          </label>
          <div>
            <p className="text-xs font-bold mb-1.5" style={sub}>Outcome</p>
            <div className="flex flex-wrap gap-2">
              {([['reached', 'Reached'], ['no_answer', 'No answer'], ['promised', 'Promised to pay'], ['disputed', 'Disputed'], ['other', 'Other']] as Array<[CallOutcome, string]>).map(([k, label]) => (
                <button key={k} onClick={() => setOutcome(k)} className="px-3 min-h-[40px] rounded-full text-xs font-bold border"
                  style={outcome === k ? { backgroundColor: brand, color: '#fff', borderColor: brand } : { color: brand, borderColor: `${brand}45`, backgroundColor: 'transparent' }}>
                  {label}
                </button>
              ))}
            </div>
          </div>
          {outcome === 'promised' && (
            <label className="block text-xs font-bold" style={sub}>Promised by
              <input type="date" value={promiseDate} min={todayISO()} onChange={(e) => setPromiseDate(e.target.value)} style={{ ...inputStyle, width: '100%', marginTop: 4 }} />
              <span className="block font-normal mt-1" style={sub}>Reminders pause until this date.</span>
            </label>
          )}
          {outcome === 'disputed' && <p className="text-xs" style={sub}>Reminders pause until someone resumes them.</p>}
          <label className="block text-xs font-bold" style={sub}>Notes
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="What was said, what was agreed" style={{ ...inputStyle, width: '100%', marginTop: 4, resize: 'vertical' }} />
          </label>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 min-h-[44px] rounded-full text-xs font-bold border" style={{ color: colors.utility.primaryText, borderColor: `${colors.utility.secondaryText}45` }}>Cancel</button>
          <button onClick={() => onSubmit({ calledAt: new Date(calledAt).toISOString(), outcome, notes: notes.trim() || undefined, promiseDate: outcome === 'promised' ? promiseDate : null })}
            disabled={busy || !canSubmit} className="px-5 min-h-[44px] rounded-full text-xs font-bold inline-flex items-center gap-2 disabled:opacity-60"
            style={{ backgroundColor: brand, color: '#fff' }}>
            {busy ? <LoadingSpinner size="sm" /> : <PhoneCall size={13} />} Save call
          </button>
        </div>
      </div>
    </div>
  );
};

export default OpsCommitmentsPage;
