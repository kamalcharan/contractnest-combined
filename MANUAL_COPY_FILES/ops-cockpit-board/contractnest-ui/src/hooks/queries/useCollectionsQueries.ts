// src/hooks/queries/useCollectionsQueries.ts
//
// Ops on JTD — the Collections lane. One reader (jtd_collections_board) and
// five tools (jtd_nudge_payment, jtd_log_payment_call,
// jtd_escalate_payment_call, jtd_pause_dunning, jtd_resume_dunning) over
// /api/jtd/collections. Spec: specs/OPS-JTD-TOOLS-SPEC.md §4, §5.
//
// The board is ONE row model: every open payment job is exactly one card with
// a `kind` (its state), an `anchor_at` (when it wants attention) and a
// `bucket` (overdue · today · b1 · b2 · b3 · parked). Filters, facet counts
// and per-bucket paging are computed server-side so the numbers always agree.
//
// Every tool is invoked with the signed-in user as the actor; VaNi will call
// the same RPCs with its own id later. Nothing here computes balances or
// totals — the cockpit lists decisions and commitments, Money In is the ledger.

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '@/services/api';
import { useAuth } from '@/context/AuthContext';

const BASE = '/api/jtd/collections';

export type WlChannel = 'email' | 'whatsapp' | 'call';

/** Card kinds, in the reader's precedence order. */
export type BoardKind =
  | 'declaration_pending'
  | 'send_failed'
  | 'call_open'
  | 'paused'
  | 'rung_due'
  | 'payment_ahead'
  | 'rung_ahead'
  | 'ladder_exhausted'
  | 'overdue_no_ladder'
  | 'awaiting_activation';

export type BucketKey = 'overdue' | 'today' | 'b1' | 'b2' | 'b3' | 'parked';

export interface WlRung {
  step: number;
  after_days: number;
  channel: WlChannel;
  due_at: string;
}

/** One row of the board. Optional fields are absent (jsonb_strip_nulls) rather than null. */
export interface BoardCard {
  id: string;
  kind: BoardKind;
  bucket: BucketKey;
  /** anchor date − today (IST). Negative = overdue attention. Absent for parked rows. */
  days?: number;
  anchor_at?: string;
  job_id?: string;
  contract_id: string;
  contract_number: string;
  buyer_id?: string;
  buyer_name?: string;
  invoice_id?: string;
  invoice_number?: string;
  block_name?: string;
  cycle_label?: string;
  sequence?: number;
  of?: number;
  amount: number;
  currency: string;
  due_date?: string;
  status: string;
  days_overdue: number;
  days_until?: number;
  dunning_step: number;
  nudge_count: number;
  last_nudge_at?: string;
  last_channel?: string;
  last_kind?: string;
  last_status?: string;
  rung?: WlRung;
  paused_reason?: string;
  promise_date?: string;
  declaration?: { id: string; kind: 'session' | 'public'; amount: number; reference?: string; at: string };
  /** An open call task. `kind` is 'follow_up' when the actor assigned themself, else 'escalation'; `due_at` is when it is due. */
  call_task?: { id: string; assigned_to?: string; assigned_to_name?: string; due_at?: string; kind?: 'follow_up' | 'escalation' | string };
  failed?: { reminder_id?: string; channel?: string; error?: string; at?: string };
  awaiting?: { status: string; since: string; start_date?: string };
}

export interface BoardBucket {
  key: BucketKey;
  from_days: number | null;
  to_days: number | null;
  /** Total rows in this bucket after filters — cards holds the first `limit` of them. */
  count: number;
  cards: BoardCard[];
}

export interface WlHappened {
  id: string;
  kind: 'payment_nudge_email' | 'payment_nudge_whatsapp' | 'payment_call_due' | 'payment_call_logged' | string;
  job_id: string;
  contract_id: string | null;
  contract_number: string | null;
  buyer_name: string | null;
  channel: string | null;
  status: string;
  amount: number | null;
  currency: string;
  rung: number;
  outcome: string | null;
  notes: string | null;
  assigned_to: string | null;
  assigned_to_name: string | null;
  task_kind?: 'follow_up' | 'escalation' | string | null;
  due_at?: string | null;
  actor_type: string;
  actor_name: string | null;
  at: string;
  error: string | null;
}

export interface WlTeamMember {
  user_id: string;
  name: string | null;
}

export interface BoardFilters {
  horizon?: number;
  from?: string;
  to?: string;
  bands?: [number, number];
  kinds?: BoardKind[];
  channel?: WlChannel;
  age?: '0-7' | '8-30' | '31-90' | '90+';
  cycle?: string;
  who?: 'team' | 'mine' | 'unassigned';
  q?: string;
  limit?: number;
  limits?: Partial<Record<BucketKey, number>>;
}

export interface CollectionsBoard {
  success: boolean;
  today: string;
  is_live: boolean;
  window: { from: string | null; to: string; horizon_days: number | null; bands: [number, number] };
  filters: Record<string, unknown>;
  buckets: BoardBucket[];
  facets: {
    kinds: Partial<Record<BoardKind, number>>;
    channels: Partial<Record<WlChannel, number>>;
    ages: Record<'0-7' | '8-30' | '31-90' | '90+', number>;
    cycles: Record<string, number>;
    who: Record<'team' | 'mine' | 'unassigned', number>;
  };
  counts: { in_window: number; matched: number };
  happened: WlHappened[];
  team: WlTeamMember[];
  ladder: { rule_enabled: boolean; vani_enabled: boolean; rungs: Array<{ step: number; after_days: number; channel: WlChannel }> };
  generated_at: string;
}

/** One row of a contract's activity timeline (jtd_contract_activity). */
export type ActivitySource = 'service' | 'billing' | 'collections';
export interface ActivityRow {
  id: string;
  source: ActivitySource;
  kind: string;
  at: string;
  actor_type: 'user' | 'vani' | 'system' | 'customer' | string;
  actor_name: string;
  title: string;
  detail?: string;
  from?: string;
  to?: string;
  channel?: string;
  status?: string;
  amount?: number;
  currency?: string;
  job_id?: string;
  event_id?: string;
  ref_id?: string;
  category?: string;
}
export interface ContractActivity {
  success: boolean;
  contract_id: string;
  contract_number: string;
  buyer_id: string | null;
  buyer_name: string | null;
  limit: number;
  offset: number;
  sources: ActivitySource[] | null;
  rows: ActivityRow[];
  total: number;
  counts: { service: number; billing: number; collections: number; all: number };
  generated_at: string;
}

export const collectionsKeys = {
  all: ['collections'] as const,
  board: (tenantId: string, filters: BoardFilters) => [...collectionsKeys.all, 'board', tenantId, filters] as const,
  activity: (tenantId: string, contractId: string, sources: string, limit: number, offset: number) =>
    [...collectionsKeys.all, 'activity', tenantId, contractId, sources, limit, offset] as const,
};

/** Human copy for the tools' machine-readable refusals. */
export const REASON_COPY: Record<string, string> = {
  job_not_found: 'That payment could not be found.',
  job_not_open: 'That payment is no longer open.',
  already_paid: 'That payment is already settled.',
  nothing_owed: 'Nothing is owed on that payment.',
  paused: 'Reminders are paused for this payment. Resume them first.',
  declaration_pending: 'The customer has declared a payment for this — confirm or reject that first.',
  no_recipient: 'There is no contact on file to send this to.',
  no_address: 'That contact has no address for this channel.',
  no_template: 'No message template is set up for this channel yet.',
  incomplete: 'The contact or business name is missing — refusing to send a blank.',
  already_sent_just_now: 'That reminder went out moments ago.',
  duplicate_rung: 'This rung has already been sent for this payment.',
  unsupported_channel: 'Only email and WhatsApp are supported.',
  invalid_outcome: 'Pick an outcome for the call.',
  promise_date_required: 'A promise needs a date.',
  assignee_not_in_tenant: 'That person is not in your team.',
  call_already_open: 'A call or follow-up is already open for this payment — log it first.',
  due_in_past: 'Pick a date from today onwards.',
  invalid_reason: 'Pick a reason for pausing.',
  actor_required: 'Sign in again and retry.',
};

const errorMessage = (error: any, fallback: string): string => {
  const code = error?.response?.data?.error?.code;
  const msg = error?.response?.data?.error?.message;
  return (code && REASON_COPY[code]) || msg || error?.message || fallback;
};

const unwrap = <T,>(response: any): T => (response.data?.data ?? response.data) as T;

/** BoardFilters → the GET query string the controller expects. */
const toParams = (f: BoardFilters): Record<string, string> => {
  const p: Record<string, string> = {};
  if (f.horizon) p.horizon = String(f.horizon);
  if (f.from) p.from = f.from;
  if (f.to) p.to = f.to;
  if (f.bands) p.bands = f.bands.join(',');
  if (f.kinds?.length) p.kinds = f.kinds.join(',');
  if (f.channel) p.channel = f.channel;
  if (f.age) p.age = f.age;
  if (f.cycle) p.cycle = f.cycle;
  if (f.who && f.who !== 'team') p.who = f.who;
  if (f.q?.trim()) p.q = f.q.trim();
  if (f.limit) p.limit = String(f.limit);
  if (f.limits && Object.keys(f.limits).length) {
    p.limits = Object.entries(f.limits).filter(([, v]) => v).map(([k, v]) => `${k}:${v}`).join(',');
  }
  return p;
};

export const useCollectionsBoard = (filters: BoardFilters, options?: { enabled?: boolean }) => {
  const { currentTenant } = useAuth();
  return useQuery({
    queryKey: collectionsKeys.board(currentTenant?.id || '', filters),
    queryFn: async (): Promise<CollectionsBoard> => {
      if (!currentTenant?.id) throw new Error('Missing tenant');
      const response = await api.get(`${BASE}/board`, { params: toParams(filters) });
      return unwrap<CollectionsBoard>(response);
    },
    enabled: !!currentTenant?.id && options?.enabled !== false,
    // Filter and "show more" changes keep the last board on screen while the
    // next one loads — no flash to a spinner.
    placeholderData: keepPreviousData,
    staleTime: 20 * 1000,
    refetchOnWindowFocus: true,
  });
};

/** A contract's activity timeline — read by the Audit tab and the card's History drawer. */
export const useContractActivity = (
  contractId: string | null | undefined,
  opts?: { sources?: ActivitySource[]; limit?: number; offset?: number; enabled?: boolean }
) => {
  const { currentTenant } = useAuth();
  const sources = (opts?.sources ?? []).join(',');
  const limit = opts?.limit ?? 50;
  const offset = opts?.offset ?? 0;
  return useQuery({
    queryKey: collectionsKeys.activity(currentTenant?.id || '', contractId || '', sources, limit, offset),
    queryFn: async (): Promise<ContractActivity> => {
      if (!currentTenant?.id || !contractId) throw new Error('Missing contract');
      const params: Record<string, string> = { limit: String(limit), offset: String(offset) };
      if (sources) params.sources = sources;
      const response = await api.get(`${BASE}/contracts/${contractId}/activity`, { params });
      return unwrap<ContractActivity>(response);
    },
    enabled: !!currentTenant?.id && !!contractId && opts?.enabled !== false,
    placeholderData: keepPreviousData,
    staleTime: 20 * 1000,
  });
};

const useToolMutation = <TVars, TResult = any>(
  path: (vars: TVars) => string,
  body: (vars: TVars) => Record<string, unknown>,
  successText: (result: TResult, vars: TVars) => string,
  fallback: string
) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (vars: TVars): Promise<TResult> => {
      const response = await api.post(path(vars), body(vars));
      return unwrap<TResult>(response);
    },
    onSuccess: (result, vars) => {
      toast.success(successText(result, vars), { duration: 3500 });
      queryClient.invalidateQueries({ queryKey: collectionsKeys.all });
    },
    onError: (error: any) => {
      toast.error(errorMessage(error, fallback), { duration: 5000 });
      queryClient.invalidateQueries({ queryKey: collectionsKeys.all });
    },
  });
};

export interface NudgeResult {
  success: boolean;
  reminder_jtd_id: string;
  channel: 'email' | 'whatsapp';
  rung: number;
  recipient_name: string | null;
  recipient_contact: string | null;
  amount: string;
  nudge_count: number;
  next_dunning_at: string | null;
}

export const useNudgePayment = () =>
  useToolMutation<{ jobId: string; channel: 'email' | 'whatsapp'; note?: string }, NudgeResult>(
    (v) => `${BASE}/payments/${v.jobId}/nudge`,
    (v) => ({ channel: v.channel, note: v.note ?? null }),
    (r) => `Reminder queued ${r.channel === 'whatsapp' ? 'on WhatsApp' : 'by email'} to ${r.recipient_contact}${r.rung ? ` · rung ${r.rung}` : ' · heads-up'}`,
    'Could not send the reminder'
  );

export type CallOutcome = 'reached' | 'no_answer' | 'promised' | 'disputed' | 'other';

export const useLogPaymentCall = () =>
  useToolMutation<
    { jobId: string; calledAt?: string; outcome: CallOutcome; notes?: string; promiseDate?: string | null },
    { success: boolean; outcome: CallOutcome; paused_reason: string | null; closed_call_tasks: number }
  >(
    (v) => `${BASE}/payments/${v.jobId}/call`,
    (v) => ({ called_at: v.calledAt ?? new Date().toISOString(), outcome: v.outcome, notes: v.notes ?? null, promise_date: v.promiseDate ?? null }),
    (r) =>
      r.outcome === 'promised' ? 'Call logged — reminders paused until the promised date'
      : r.outcome === 'disputed' ? 'Call logged — reminders paused while the dispute is open'
      : r.closed_call_tasks ? 'Call logged — the assigned call is closed'
      : 'Call logged',
    'Could not log the call'
  );

/** Assign a call to a teammate, or — assigned to yourself with a date — set a Follow up. */
export const useEscalatePaymentCall = () =>
  useToolMutation<
    { jobId: string; assignTo: string; note?: string; dueAt?: string | null },
    { success: boolean; assigned_to_name: string | null; task_kind?: string; due_at?: string }
  >(
    (v) => `${BASE}/payments/${v.jobId}/escalate`,
    (v) => ({ assign_to: v.assignTo, note: v.note ?? null, due_at: v.dueAt ?? null }),
    (r, v) =>
      r.task_kind === 'follow_up'
        ? `Follow-up set${v.dueAt ? ` for ${new Date(r.due_at || v.dueAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}` : ''}`
        : `Call assigned to ${r.assigned_to_name || 'a teammate'}${v.dueAt ? ` · due ${new Date(r.due_at || v.dueAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}` : ''}`,
    'Could not assign the call'
  );

export const usePauseDunning = () =>
  useToolMutation<{ jobId: string; reason: 'promise' | 'dispute' | 'manual'; until?: string | null; note?: string }, { success: boolean }>(
    (v) => `${BASE}/payments/${v.jobId}/pause`,
    (v) => ({ reason: v.reason, until: v.until ?? null, note: v.note ?? null }),
    (_r, v) => (v.reason === 'promise' ? `Reminders paused until ${v.until}` : 'Reminders paused'),
    'Could not pause reminders'
  );

export const useResumeDunning = () =>
  useToolMutation<{ jobId: string; note?: string }, { success: boolean; next_dunning_at: string | null }>(
    (v) => `${BASE}/payments/${v.jobId}/resume`,
    (v) => ({ note: v.note ?? null }),
    () => 'Reminders resumed',
    'Could not resume reminders'
  );
