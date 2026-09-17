// src/components/ops/JobCard.tsx
//
// THE card of the Ops cockpit (Collections lane). One component renders every
// row of the board in both views — the list (full width) and the lanes
// (compact) — so the content, the evidence line and the ACTIONS are identical
// wherever a job appears. `compact` changes layout density only.
//
// Actions are derived from the row's `kind` in ONE place (actionsFor), and
// every action is a tool with an actor (spec §4). A payment that is not yet
// due can be nudged early: the tool records it as an off-ladder heads-up
// (rung 0) and the ladder still fires on schedule.
//
// The card owns its two inline panels (Assign call, Pause) so lanes get them
// too; the Log-a-call sheet is a modal the page owns (one at a time).

import React, { useState } from 'react';
import { ArrowUpRight, Check, Mail, MessageCircle, PhoneCall, UserPlus, PauseCircle, PlayCircle, RefreshCw, X, IndianRupee, CalendarClock } from 'lucide-react';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { useInvoiceTheme } from '@/pages/invoices/ui';
import { fmtMoney, fmtDate } from '@/utils/format';
import type { BoardCard, BoardKind, WlChannel, WlTeamMember } from '@/hooks/queries/useCollectionsQueries';

export type PauseReason = 'promise' | 'dispute' | 'manual';

export interface JobCardActions {
  onNudge: (card: BoardCard, channel: 'email' | 'whatsapp') => void;
  onCall: (card: BoardCard) => void;
  /** Assign a call to `userId`; with `dueAt` (YYYY-MM-DD) it is dated. Self + date = Follow up. */
  onAssign: (card: BoardCard, userId: string, dueAt?: string | null) => Promise<unknown> | void;
  onPause: (card: BoardCard, reason: PauseReason, until: string | null) => Promise<unknown> | void;
  onResume: (card: BoardCard) => void;
  onConfirm: (card: BoardCard) => void;
  onReview: (card: BoardCard) => void;
  onOpen: (card: BoardCard) => void;
}

export interface LadderInfo {
  rule_enabled: boolean;
  vani_enabled: boolean;
  rungs: Array<{ step: number; after_days: number; channel: WlChannel }>;
}

export interface JobCardProps {
  card: BoardCard;
  compact?: boolean;
  busy?: boolean;
  /** Any other card is busy — buttons stay enabled visually but ignore clicks. */
  locked?: boolean;
  team: WlTeamMember[];
  ladder?: LadderInfo;
  meId?: string;
  actions: JobCardActions;
}

// ── copy helpers (exported so the page's headline can share the vocabulary) ──
export const clean = (s: string | null | undefined) => (s || '').replace(/\s+/g, ' ').trim();
export const channelLabel = (c: string | null | undefined) =>
  c === 'whatsapp' ? 'WhatsApp' : c === 'email' ? 'email' : c === 'call' ? 'call' : c || '';
export const fmtTime = (iso: string | null | undefined) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}, ${d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true })}`;
};
const todayISO = () => new Date().toISOString().slice(0, 10);
const tomorrowISO = () => { const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString().slice(0, 10); };
const isFollowUp = (c: BoardCard, meId?: string) => c.kind === 'call_open' && (c.call_task?.kind === 'follow_up' || (!!meId && c.call_task?.assigned_to === meId));

export const kindLabel = (c: BoardCard, meId?: string): string => {
  switch (c.kind) {
    case 'declaration_pending': return 'To confirm';
    case 'send_failed': return 'Send failed';
    case 'call_open': return isFollowUp(c, meId) ? (c.call_task?.assigned_to === meId ? 'Your follow-up' : 'Follow-up') : 'Call assigned';
    case 'paused': return c.paused_reason === 'promise' ? 'Promised' : c.paused_reason === 'dispute' ? 'Disputed' : 'Paused';
    case 'rung_due': return `Rung ${c.rung?.step ?? ''} due`;
    case 'payment_ahead': return c.days === 0 ? 'Due today' : 'Coming due';
    case 'rung_ahead': return `Rung ${c.rung?.step ?? ''} ahead`;
    case 'ladder_exhausted': return 'Ladder done';
    case 'overdue_no_ladder': return 'Overdue';
    case 'awaiting_activation': return 'Awaiting payment';
    default: return c.kind;
  }
};

/** The ladder as a sentence — the rung pill's tooltip. */
export const ladderText = (ladder?: LadderInfo): string => {
  if (!ladder || ladder.rungs.length === 0) return 'No ladder set under Automation Rules.';
  return `Ladder: ${ladder.rungs.map((r) => `${channelLabel(r.channel)} day ${r.after_days}`).join(' · ')}. Rungs count from the due date; the switch under Automation Rules governs VaNi only — these buttons always work.`;
};

/** What the row wants you to know, as one line. Same text in both views. */
export const evidence = (c: BoardCard, ladder?: LadderInfo, meId?: string): string => {
  const bits: string[] = [];
  if (c.kind === 'awaiting_activation') {
    bits.push(`awaiting the activation payment · sent ${fmtDate(c.awaiting?.since)}`);
    if (c.awaiting?.start_date) bits.push(`starts ${fmtDate(c.awaiting.start_date)}`);
    return bits.join(' · ');
  }
  if (c.cycle_label) bits.push(c.cycle_label);
  if (c.due_date) {
    if (c.kind === 'payment_ahead') {
      bits.push(c.days === 0 ? 'due today' : c.days === 1 ? 'due tomorrow' : `due ${fmtDate(c.due_date)} · in ${c.days} days`);
    } else {
      bits.push(`due ${fmtDate(c.due_date)}`);
    }
  }
  if (c.days_overdue > 0) bits.push(`${c.days_overdue} days overdue`);
  bits.push(c.nudge_count ? `reminded ${c.nudge_count}×` : 'never reminded');
  if (c.last_nudge_at) bits.push(`last ${c.last_kind === 'payment_call_logged' ? 'call' : channelLabel(c.last_channel)} ${fmtDate(c.last_nudge_at)}`);
  switch (c.kind) {
    case 'rung_due':
      if (c.rung) bits.push(`${channelLabel(c.rung.channel)} rung since ${fmtDate(c.rung.due_at)}`);
      break;
    case 'rung_ahead':
      if (c.rung) bits.push(`${channelLabel(c.rung.channel)} rung ${c.rung.step} on ${fmtTime(c.rung.due_at)} · day ${c.rung.after_days} after due`);
      break;
    case 'payment_ahead':
      if (c.rung) bits.push(`first reminder by ${channelLabel(c.rung.channel)} on day ${c.rung.after_days}`);
      break;
    case 'paused':
      if (c.paused_reason === 'promise' && c.promise_date) bits.push(`promised for ${fmtDate(c.promise_date)}`);
      break;
    case 'call_open': {
      const who = c.call_task?.assigned_to === meId ? 'you' : (c.call_task?.assigned_to_name || 'a teammate');
      const when = c.call_task?.due_at ? ` · ${c.days != null && c.days < 0 ? 'was due' : 'due'} ${fmtDate(c.call_task.due_at)}` : '';
      bits.push(`${isFollowUp(c, meId) ? 'follow-up by' : 'call with'} ${who}${when}`);
      break;
    }
    case 'declaration_pending':
      if (c.declaration) bits.push(`declared ${fmtMoney(c.declaration.amount, c.currency)}${c.declaration.reference ? ` · ref ${c.declaration.reference}` : ' · no reference'} · ${fmtDate(c.declaration.at)}`);
      break;
    case 'send_failed':
      bits.push(`${channelLabel(c.failed?.channel)} failed ${fmtTime(c.failed?.at)}${c.failed?.error ? ` · ${c.failed.error}` : ''}`);
      break;
    case 'overdue_no_ladder':
      bits.push(ladder && ladder.rungs.length === 0 ? 'no ladder set' : 'no rung scheduled');
      break;
    case 'ladder_exhausted':
      bits.push('all rungs used');
      break;
  }
  return bits.join(' · ');
};

type ActionKey = 'confirm' | 'review' | 'retry' | 'email' | 'whatsapp' | 'call' | 'assign' | 'followup' | 'pause' | 'resume';

/**
 * The single source of truth for which buttons a kind gets, and which is primary.
 * "Follow up" = a dated task assigned to yourself (same tool as Assign call);
 * it is offered wherever a call could be assigned, and never twice — a job
 * with an open call/follow-up shows Log a call instead, which closes it.
 */
export const actionsFor = (c: BoardCard): { actions: ActionKey[]; primary: ActionKey | null } => {
  const rungCh = c.rung?.channel;
  const nudgePrimary: ActionKey | null = rungCh === 'email' ? 'email' : rungCh === 'whatsapp' ? 'whatsapp' : rungCh === 'call' ? 'assign' : null;
  switch (c.kind) {
    case 'declaration_pending': return { actions: ['confirm', 'review'], primary: 'confirm' };
    case 'send_failed': return { actions: ['retry', c.failed?.channel === 'whatsapp' ? 'email' : 'whatsapp', 'call', 'followup', 'pause'], primary: 'retry' };
    case 'call_open': return { actions: ['call', 'email', 'whatsapp', 'pause'], primary: 'call' };
    case 'paused': return { actions: ['resume', 'call', 'followup'], primary: 'resume' };
    case 'rung_due': return { actions: ['email', 'whatsapp', 'call', 'assign', 'followup', 'pause'], primary: nudgePrimary };
    case 'rung_ahead': return { actions: ['email', 'whatsapp', 'call', 'assign', 'followup', 'pause'], primary: nudgePrimary };
    case 'payment_ahead': return { actions: ['email', 'whatsapp', 'call', 'assign', 'followup', 'pause'], primary: null };
    case 'ladder_exhausted':
    case 'overdue_no_ladder': return { actions: ['email', 'whatsapp', 'call', 'assign', 'followup', 'pause'], primary: null };
    case 'awaiting_activation': return { actions: [], primary: null };
    default: return { actions: [], primary: null };
  }
};

const JobCard: React.FC<JobCardProps> = ({ card: c, compact, busy, locked, team, ladder, meId, actions }) => {
  const { colors, ink, sub } = useInvoiceTheme();
  const brand = colors.brand.primary;
  const green = colors.semantic.success;
  const red = colors.semantic.error;
  const amber = colors.semantic.warning;
  const mono: React.CSSProperties = { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' };
  const hairline = `${colors.utility.primaryText}14`;

  const [panel, setPanel] = useState<'assign' | 'pause' | 'followup' | null>(null);
  const [assignTo, setAssignTo] = useState<string>(meId || '');
  const [assignDue, setAssignDue] = useState<string>('');
  const [followUpDue, setFollowUpDue] = useState<string>(() => tomorrowISO());
  const [pauseReason, setPauseReason] = useState<PauseReason>('manual');
  const [pauseUntil, setPauseUntil] = useState<string>('');
  const [panelBusy, setPanelBusy] = useState(false);

  const kc: string =
    c.kind === 'declaration_pending' || c.kind === 'awaiting_activation' ? amber
    : c.kind === 'paused' ? colors.utility.secondaryText
    : c.kind === 'call_open' ? brand
    : c.kind === 'payment_ahead' || c.kind === 'rung_ahead' ? green
    : red;
  const isRungPill = c.kind === 'rung_due' || c.kind === 'rung_ahead';
  const { actions: keys, primary } = actionsFor(c);
  const disabled = !!busy || !!locked || panelBusy;

  const Btn: React.FC<{ onClick: () => void; primary?: boolean; icon?: React.ReactNode; label: string; title?: string }> =
    ({ onClick, primary: isPrimary, icon, label, title }) => (
      <button onClick={onClick} disabled={disabled} title={title || label}
        className={`flex-none inline-flex items-center justify-center gap-1.5 rounded-full font-bold disabled:opacity-60 disabled:cursor-not-allowed ${compact ? 'px-2.5 min-h-[32px] text-[11px]' : 'px-3.5 min-h-[40px] text-xs'}`}
        style={isPrimary ? { backgroundColor: brand, color: '#fff' } : { border: `1px solid ${brand}45`, color: brand, backgroundColor: colors.utility.secondaryBackground }}>
        {busy && isPrimary ? <LoadingSpinner size="sm" /> : <>{icon}{label}</>}
      </button>
    );

  const submitAssign = async () => {
    if (!assignTo) return;
    setPanelBusy(true);
    try { await actions.onAssign(c, assignTo, assignDue || null); setPanel(null); setAssignDue(''); } finally { setPanelBusy(false); }
  };
  const submitFollowUp = async () => {
    if (!meId || !followUpDue) return;
    setPanelBusy(true);
    try { await actions.onAssign(c, meId, followUpDue); setPanel(null); } finally { setPanelBusy(false); }
  };
  const submitPause = async () => {
    if (pauseReason === 'promise' && !pauseUntil) return;
    setPanelBusy(true);
    try {
      await actions.onPause(c, pauseReason, pauseReason === 'promise' ? pauseUntil : null);
      setPanel(null); setPauseUntil(''); setPauseReason('manual');
    } finally { setPanelBusy(false); }
  };

  const inputStyle: React.CSSProperties = {
    border: `1px solid ${brand}60`, borderRadius: 10, padding: '6px 10px', fontSize: 12.5,
    backgroundColor: colors.utility.primaryBackground, color: colors.utility.primaryText, minHeight: compact ? 34 : 40,
  };

  const button = (k: ActionKey) => {
    const p = primary === k;
    const s = compact ? 12 : 13;
    switch (k) {
      case 'confirm': return <Btn key={k} primary={p} onClick={() => actions.onConfirm(c)} icon={<Check size={s} />} label="Confirm" />;
      case 'review': return <Btn key={k} onClick={() => actions.onReview(c)} label="Review" />;
      case 'retry': return <Btn key={k} primary={p} onClick={() => actions.onNudge(c, c.failed?.channel === 'whatsapp' ? 'whatsapp' : 'email')} icon={<RefreshCw size={s} />} label="Retry" />;
      case 'email': return <Btn key={k} primary={p} onClick={() => actions.onNudge(c, 'email')} icon={<Mail size={s} />} label="Email" title={c.kind === 'payment_ahead' ? 'Send an early heads-up by email' : 'Send the reminder by email'} />;
      case 'whatsapp': return <Btn key={k} primary={p} onClick={() => actions.onNudge(c, 'whatsapp')} icon={<MessageCircle size={s} />} label="WhatsApp" title={c.kind === 'payment_ahead' ? 'Send an early heads-up on WhatsApp' : 'Send the reminder on WhatsApp'} />;
      case 'call': return <Btn key={k} primary={p} onClick={() => actions.onCall(c)} icon={<PhoneCall size={s} />} label="Log a call" />;
      case 'assign': return <Btn key={k} primary={p} onClick={() => { setPanel(panel === 'assign' ? null : 'assign'); setAssignTo(meId || ''); }} icon={<UserPlus size={s} />} label="Assign call" />;
      case 'followup': return meId ? <Btn key={k} onClick={() => setPanel(panel === 'followup' ? null : 'followup')} icon={<CalendarClock size={s} />} label="Follow up" title="Set a dated follow-up for yourself" /> : null;
      case 'pause': return <Btn key={k} onClick={() => setPanel(panel === 'pause' ? null : 'pause')} icon={<PauseCircle size={s} />} label="Pause" />;
      case 'resume': return <Btn key={k} primary={p} onClick={() => actions.onResume(c)} icon={<PlayCircle size={s} />} label="Resume" />;
      default: return null;
    }
  };

  const pill = (
    <span className="flex-none text-[10px] font-bold px-2.5 py-1 rounded-full border whitespace-nowrap"
      title={isRungPill ? ladderText(ladder) : undefined}
      style={{ color: kc, borderColor: `${kc}55`, backgroundColor: c.kind === 'paused' ? 'transparent' : `${kc}14`, cursor: isRungPill ? 'help' : 'default' }}>
      {kindLabel(c, meId)}
    </span>
  );

  const name = clean(c.buyer_name) || c.contract_number;
  const openBtn = (
    <button onClick={() => actions.onOpen(c)} className={`inline-flex items-center gap-1 font-bold ${compact ? 'text-[11px]' : 'text-xs ml-auto'}`} style={{ color: brand }}>
      Open <ArrowUpRight size={compact ? 12 : 13} />
    </button>
  );

  const panels = (
    <>
      {panel === 'assign' && (
        <div className={`mt-2.5 flex items-center gap-2 flex-wrap ${compact ? '' : 'pl-5'}`}>
          <select value={assignTo} onChange={(e) => setAssignTo(e.target.value)} style={{ ...inputStyle, minWidth: compact ? 140 : 200, flex: compact ? 1 : undefined }} aria-label="Assign the call to">
            <option value="">Assign the call to…</option>
            {team.map((m) => <option key={m.user_id} value={m.user_id}>{m.name || m.user_id}</option>)}
          </select>
          <input type="date" value={assignDue} min={todayISO()} onChange={(e) => setAssignDue(e.target.value)} style={inputStyle} aria-label="Due by (optional)" title="Due by (optional)" />
          <Btn primary onClick={submitAssign} label={panelBusy ? '…' : 'Assign'} />
          <Btn onClick={() => setPanel(null)} icon={<X size={12} />} label="" title="Cancel" />
        </div>
      )}
      {panel === 'followup' && (
        <div className={`mt-2.5 flex items-center gap-2 flex-wrap ${compact ? '' : 'pl-5'}`}>
          <span className="text-[11.5px] font-bold" style={sub}>Remind me on</span>
          <input type="date" value={followUpDue} min={todayISO()} onChange={(e) => setFollowUpDue(e.target.value)} style={inputStyle} aria-label="Follow up on" />
          <Btn primary onClick={submitFollowUp} label={panelBusy ? '…' : 'Set follow-up'} />
          <Btn onClick={() => setPanel(null)} icon={<X size={12} />} label="" title="Cancel" />
        </div>
      )}
      {panel === 'pause' && (
        <div className={`mt-2.5 flex items-center gap-2 flex-wrap ${compact ? '' : 'pl-5'}`}>
          <select value={pauseReason} onChange={(e) => setPauseReason(e.target.value as PauseReason)} style={{ ...inputStyle, flex: compact ? 1 : undefined }} aria-label="Why pause">
            <option value="manual">Pause reminders (by hand)</option>
            <option value="promise">Customer promised to pay by…</option>
            <option value="dispute">Amount is disputed</option>
          </select>
          {pauseReason === 'promise' && (
            <input type="date" value={pauseUntil} min={todayISO()} onChange={(e) => setPauseUntil(e.target.value)} style={inputStyle} aria-label="Promised date" />
          )}
          <Btn primary onClick={submitPause} label={panelBusy ? '…' : 'Pause'} />
          <Btn onClick={() => setPanel(null)} icon={<X size={12} />} label="" title="Cancel" />
        </div>
      )}
    </>
  );

  // ── compact (lanes) ────────────────────────────────────────────────────────
  if (compact) {
    return (
      <div className="rounded-xl border px-3 py-2.5" style={{ borderColor: hairline, backgroundColor: colors.utility.primaryBackground, borderLeft: `3px solid ${kc}66` }}>
        <div className="flex items-start justify-between gap-2">
          <p className="text-[13px] font-bold leading-snug min-w-0" style={ink}>
            {(c.kind === 'payment_ahead') && <IndianRupee size={11} style={{ display: 'inline', verticalAlign: '-1px', marginRight: 3, color: green }} />}
            <span className="break-words">{name}</span>
          </p>
          {pill}
        </div>
        <div className="flex items-baseline justify-between gap-2 mt-0.5">
          <button onClick={() => actions.onOpen(c)} className="text-[10px] font-bold" style={{ ...mono, color: brand }}>{c.contract_number}</button>
          <p className="text-[14px] font-extrabold tabular-nums" style={ink}>{c.amount != null ? fmtMoney(c.amount, c.currency) : ''}</p>
        </div>
        <p className="text-[11px] mt-1 leading-snug" style={{ color: c.days_overdue > 0 && c.kind !== 'declaration_pending' ? red : colors.utility.secondaryText }}>{evidence(c, ladder, meId)}</p>
        <div className="mt-2 flex items-center gap-1.5 flex-wrap">
          {keys.map(button)}
          {openBtn}
        </div>
        {panels}
      </div>
    );
  }

  // ── full (list) ────────────────────────────────────────────────────────────
  return (
    <div className="rounded-2xl border px-4 py-3.5" style={{ backgroundColor: colors.utility.secondaryBackground, borderColor: hairline }}>
      <div className="flex items-center gap-4">
        <span className="w-1 self-stretch rounded-full flex-none" style={{ backgroundColor: `${kc}66` }} />
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-bold truncate" style={ink}>
            {name}
            <button onClick={() => actions.onOpen(c)} className="ml-2 text-[10px] font-bold align-middle" style={{ ...mono, color: brand }}>{c.contract_number}</button>
          </p>
          <p className="text-[12.5px] mt-0.5" style={{ color: c.days_overdue > 0 && c.kind !== 'declaration_pending' ? red : colors.utility.secondaryText }}>{evidence(c, ladder, meId)}</p>
        </div>
        <div className="text-right flex-none">
          <p className="text-lg font-extrabold tabular-nums" style={ink}>{c.amount != null ? fmtMoney(c.amount, c.currency) : ''}</p>
          <p className="text-[10px] truncate max-w-[140px]" style={{ ...sub, ...mono }}>{c.invoice_number || c.block_name || ''}</p>
        </div>
        {pill}
      </div>
      <div className="mt-3 pl-5 flex items-center gap-2 flex-wrap">
        {keys.map(button)}
        {openBtn}
      </div>
      {panels}
    </div>
  );
};

export default JobCard;
