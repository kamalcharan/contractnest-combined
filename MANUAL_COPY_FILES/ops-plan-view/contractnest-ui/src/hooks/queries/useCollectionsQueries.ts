// src/hooks/queries/useCollectionsQueries.ts
//
// Ops on JTD — the Collections lane. One reader (jtd_collections_board) and
// five tools (jtd_nudge_payment, jtd_log_payment_call,
// jtd_escalate_payment_call, jtd_pause_dunning, jtd_resume_dunning) over
// /api/jtd/collections. Spec: specs/OPS-JTD-TOOLS-SPEC.md §4, §5.
//
// The board is ONE row model: every open payment due — an instalment under an
// invoice, an invoice that is one instalment, or a whole invoice with no
// schedule (017) — and every open service is exactly one card with a `kind`
// (its state), an `anchor_at` (when it wants attention) and a `bucket`
// (overdue · today · b1 · b2 · b3 · parked). Filters, facet counts and
// per-bucket paging are computed server-side so the numbers always agree.
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
  | 'awaiting_activation'
  /**
   * A WHOLE-INVOICE due (migration 017): an open invoice with no billing
   * schedule under it — Money In's rule. No payment job, so no ladder: its
   * tools are View invoice and Send invoice (the existing per-invoice send).
   */
  | 'invoice_overdue'
  | 'invoice_ahead'
  // services lane (migration 014)
  | 'visit_in_progress'
  | 'visit_overdue'
  | 'visit_today'
  | 'visit_scheduled'
  /** the customer suggested another time on /slot/:token — the team confirms (migration 015) */
  | 'slot_to_confirm';

export type BoardLane = 'collections' | 'services';
export type SlotState = 'confirmed' | 'proposed' | 'none';

/** The services block on a visit row. The row's `id`/`job_id` is the service event id. */
export interface VisitInfo {
  block_name?: string;
  sequence?: number;
  of?: number;
  scheduled_at?: string;
  notes?: string;
  assigned_to?: string;
  assigned_to_name?: string;
  /** The appointment = the agreed (or proposed) slot with the customer. */
  slot?: { id: string; status: 'requested' | 'accepted' | 'rescheduled' | 'no_response' | string; at?: string; confirmed: boolean };
  /** An open service ticket linked to this visit. */
  ticket?: { id: string; number?: string; status: 'created' | 'assigned' | 'in_progress' | string };
  /** The customer loop (migration 015): when we asked, how often, and what the customer answered on /slot/:token. */
  ask?: {
    asked_at?: string;
    count?: number;
    response?: CustomerSlotResponse;
    /** the customer's last "not needed" on a now-retired appointment */
    declined?: CustomerSlotResponse;
  };
}

export interface CustomerSlotResponse {
  action: 'accept' | 'propose' | 'decline';
  at: string;
  proposed_at?: string;
  note?: string;
}

export type AskChannel = 'share' | 'email' | 'whatsapp';

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
  lane: BoardLane;
  kind: BoardKind;
  bucket: BucketKey;
  /** Who owns the row: the call task's assignee (collections) or the technician (services). */
  owner_id?: string;
  owner_name?: string;
  /** services only */
  slot_state?: SlotState;
  visit?: VisitInfo;
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
  lanes?: BoardLane[];
  slot?: SlotState;
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
    lanes: Partial<Record<BoardLane, number>>;
    slots: Partial<Record<SlotState, number>>;
    channels: Partial<Record<WlChannel, number>>;
    ages: Record<'0-7' | '8-30' | '31-90' | '90+', number>;
    cycles: Record<string, number>;
    /** `unassigned_visits` ignores the lane and kind filters — the headline's "no technician yet" signal. */
    who: Record<'team' | 'mine' | 'unassigned', number> & { unassigned_visits?: number };
    /** "N need you" per lane over the window only (no other filter) — the focus strip. */
    needs_by_lane: Partial<Record<BoardLane, number>>;
  };
  counts: { in_window: number; matched: number };
  happened: WlHappened[];
  team: WlTeamMember[];
  ladder: { rule_enabled: boolean; vani_enabled: boolean; rungs: Array<{ step: number; after_days: number; channel: WlChannel }> };
  /** Channels with a REGISTERED provider template for slot requests (email · whatsapp). Share always works. */
  ask_channels?: Array<'email' | 'whatsapp'>;
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
  /** The message as sent — our template copy rendered with the row's stored variables (jtd_render_message). */
  message?: RenderedMessage;
}
export interface RenderedMessage {
  subject?: string;
  body: string;
  template_key?: string;
  provider_template_id?: string;
  /** 'template_copy': the provider formats the final message; this is the faithful preview. */
  source: 'template_copy' | string;
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
  // services lane
  visit_not_found: 'That visit could not be found.',
  visit_closed: 'That visit is already completed or cancelled.',
  visit_in_progress: 'That visit is in progress — finish it before moving it.',
  visit_already_started: 'That visit has already been started.',
  no_customer: 'This contract has no customer to ask.',
  group_contract: 'Group contracts have no single customer to ask.',
  already_assigned: 'That technician is already on this visit.',
  already_confirmed: 'The slot is already confirmed with the customer.',
  no_slot_to_confirm: 'Propose a slot first, then confirm it.',
  scheduled_at_required: 'Pick a date and time.',
  slot_in_past: 'Pick a slot from today onwards.',
  downstream_refused: 'The visit could not be updated — it may have changed under you. Refresh and retry.',
  invalid_reason: 'Pick a reason for pausing.',
  actor_required: 'Sign in again and retry.',
  // plan view (023)
  vani_off: 'VaNi is not on for this business — place and ask one by one, or open VaNi.',
  day_passed: 'That day has passed — reschedule those services one by one.',
  day_required: 'Pick a day.',
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
  if (f.lanes?.length) p.lanes = f.lanes.join(',');
  if (f.slot) p.slot = f.slot;
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
// ── Commitments Register · Activity (migration 016): tenant-wide timeline ──
export type ActivityGroup = 'appointments' | 'followups' | 'calls' | 'reminders' | 'visits' | 'payments' | 'other';
export interface RegisterActivityRow extends ActivityRow {
  group: ActivityGroup;
  contract_id: string;
  contract_number?: string;
  buyer_name?: string;
  who_id?: string;
}
export interface RegisterActivityFilters {
  from?: string;   // YYYY-MM-DD (IST day) — the RPC defaults to the last 30 days
  to?: string;
  groups?: ActivityGroup[];
  who?: string;    // user id: the actor, or the assignee of a task
  q?: string;
  contract_id?: string;
  limit?: number;
  offset?: number;
}
export interface RegisterActivity {
  success: boolean;
  today: string;
  window: { from: string; to: string };
  rows: RegisterActivityRow[];
  total: number;
  /** over the window and Who/q, ignoring the group filter — the chips stay a stable map */
  counts: Record<ActivityGroup | 'all', number>;
  team: WlTeamMember[];
  generated_at: string;
}

export const useActivityRegister = (filters: RegisterActivityFilters, opts?: { enabled?: boolean }) => {
  const { currentTenant } = useAuth();
  const key = JSON.stringify(filters);
  return useQuery({
    queryKey: [...collectionsKeys.all, 'register-activity', currentTenant?.id || '', key],
    queryFn: async (): Promise<RegisterActivity> => {
      if (!currentTenant?.id) throw new Error('No tenant selected');
      const params: Record<string, string> = {};
      if (filters.from) params.from = filters.from;
      if (filters.to) params.to = filters.to;
      if (filters.groups?.length) params.groups = filters.groups.join(',');
      if (filters.who) params.who = filters.who;
      if (filters.q) params.q = filters.q;
      if (filters.contract_id) params.contract_id = filters.contract_id;
      params.limit = String(filters.limit ?? 50);
      params.offset = String(filters.offset ?? 0);
      const response = await api.get(`${BASE}/activity`, { params });
      return unwrap<RegisterActivity>(response);
    },
    enabled: !!currentTenant?.id && opts?.enabled !== false,
    placeholderData: keepPreviousData,
    staleTime: 20 * 1000,
  });
};

// ── Commitments Register · Follow-ups (migration 017): call tasks, open or closed ──
export type TaskKind = 'follow_up' | 'escalation';
export interface OpsTask {
  id: string;
  kind: TaskKind | string;
  state: 'open' | 'closed';
  status: string;
  due_on: string;
  due_at?: string;
  overdue: boolean;
  /** due_on − today (IST) */
  days: number;
  assigned_to?: string;
  assigned_to_name?: string;
  set_by_type?: string;
  set_by_name?: string;
  set_at: string;
  notes?: string;
  job_id?: string;
  contract_id?: string;
  contract_number?: string;
  buyer_id?: string;
  buyer_name?: string;
  invoice_id?: string;
  invoice_number?: string;
  amount?: number;
  currency?: string;
  cycle_label?: string;
  payment_status?: string;
  payment_due?: string;
  closed_at?: string;
  outcome?: string;
  outcome_notes?: string;
  closed_by?: string;
}
export interface OpsTasksFilters {
  from?: string;
  to?: string;
  who?: string;
  kind?: TaskKind;
  state?: 'open' | 'closed' | 'all';
  q?: string;
  limit?: number;
  offset?: number;
}
export interface OpsTasks {
  success: boolean;
  today: string;
  rows: OpsTask[];
  total: number;
  /** over from/to, who, kind, q — ignoring the state filter */
  counts: { all: number; open: number; closed: number; overdue: number; follow_up: number; escalation: number };
  team: WlTeamMember[];
  generated_at: string;
}

export const useOpsTasks = (filters: OpsTasksFilters, opts?: { enabled?: boolean }) => {
  const { currentTenant } = useAuth();
  const key = JSON.stringify(filters);
  return useQuery({
    queryKey: [...collectionsKeys.all, 'tasks', currentTenant?.id || '', key],
    queryFn: async (): Promise<OpsTasks> => {
      if (!currentTenant?.id) throw new Error('No tenant selected');
      const params: Record<string, string> = {};
      if (filters.from) params.from = filters.from;
      if (filters.to) params.to = filters.to;
      if (filters.who) params.who = filters.who;
      if (filters.kind) params.kind = filters.kind;
      if (filters.state) params.state = filters.state;
      if (filters.q) params.q = filters.q;
      params.limit = String(filters.limit ?? 100);
      params.offset = String(filters.offset ?? 0);
      const response = await api.get(`${BASE}/tasks`, { params });
      return unwrap<OpsTasks>(response);
    },
    enabled: !!currentTenant?.id && opts?.enabled !== false,
    placeholderData: keepPreviousData,
    staleTime: 20 * 1000,
  });
};

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
  /** What went out, rendered (migration 013). Absent when no template copy exists. */
  message?: RenderedMessage;
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

// ── Services lane: visit tools (migration 014). eventId = the board row id. ──
const fmtSlot = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true }) : '';

export const useAssignVisit = () =>
  useToolMutation<{ eventId: string; assignTo: string; note?: string }, { success: boolean; assigned_to_name: string | null }>(
    (v) => `${BASE}/visits/${v.eventId}/assign`,
    (v) => ({ assign_to: v.assignTo, note: v.note ?? null }),
    (r) => `Visit assigned to ${r.assigned_to_name || 'a technician'}`,
    'Could not assign the visit'
  );

export const useScheduleVisit = () =>
  useToolMutation<
    { eventId: string; scheduledAt: string; confirmed: boolean; note?: string },
    { success: boolean; scheduled_at: string; confirmed: boolean; appointment_status: string }
  >(
    (v) => `${BASE}/visits/${v.eventId}/schedule`,
    (v) => ({ scheduled_at: v.scheduledAt, confirmed: v.confirmed, note: v.note ?? null }),
    (r) => (r.confirmed ? `Slot confirmed for ${fmtSlot(r.scheduled_at)} — the customer is notified` : `Slot proposed for ${fmtSlot(r.scheduled_at)} — awaiting the customer`),
    'Could not schedule the visit'
  );

export const useConfirmVisitSlot = () =>
  useToolMutation<{ eventId: string; note?: string }, { success: boolean; scheduled_at: string }>(
    (v) => `${BASE}/visits/${v.eventId}/confirm-slot`,
    (v) => ({ note: v.note ?? null }),
    (r) => `Slot confirmed for ${fmtSlot(r.scheduled_at)} — the customer is notified`,
    'Could not confirm the slot'
  );

export const useStartVisit = () =>
  useToolMutation<{ eventId: string; note?: string }, { success: boolean; ticket_number: string | null; assigned_to_name: string | null }>(
    (v) => `${BASE}/visits/${v.eventId}/start`,
    (v) => ({ note: v.note ?? null }),
    (r) => `Visit started${r.ticket_number ? ` · ${r.ticket_number}` : ''}`,
    'Could not start the visit'
  );

export const useCompleteVisit = () =>
  useToolMutation<{ eventId: string; notes?: string }, { success: boolean; ticket_number: string | null }>(
    (v) => `${BASE}/visits/${v.eventId}/complete`,
    (v) => ({ notes: v.notes ?? null }),
    (r) => `Visit marked done${r.ticket_number ? ` · ${r.ticket_number}` : ''}`,
    'Could not complete the visit'
  );

export interface AskVisitSlotResult {
  success: boolean;
  appointment_id: string;
  channel: AskChannel;
  scheduled_at: string;
  slot_text: string;
  link: string;
  message?: { subject?: string | null; body?: string | null } | null;
  recipient_name?: string | null;
  phone?: string | null;
  email?: string | null;
  communication_id?: string | null;
}

/**
 * Ask the customer to confirm the slot (migration 015). `share` sends nothing —
 * it returns the message + /slot/:token link so the card can open wa.me or copy;
 * email/whatsapp queue a real send (needs a registered template — see ask_channels).
 */
export const useAskVisitSlot = () =>
  useToolMutation<{ eventId: string; channel: AskChannel; note?: string }, AskVisitSlotResult>(
    (v) => `${BASE}/visits/${v.eventId}/ask`,
    (v) => ({ channel: v.channel, note: v.note ?? null }),
    (r) => (r.channel === 'share'
      ? `Slot ${fmtSlot(r.scheduled_at)} proposed — share the link with ${r.recipient_name || 'the customer'}`
      : `Asked ${r.recipient_name || 'the customer'} ${r.channel === 'whatsapp' ? 'on WhatsApp' : 'by email'} to confirm ${fmtSlot(r.scheduled_at)}`),
    'Could not ask the customer'
  );

export const useResumeDunning = () =>
  useToolMutation<{ jobId: string; note?: string }, { success: boolean; next_dunning_at: string | null }>(
    (v) => `${BASE}/payments/${v.jobId}/resume`,
    (v) => ({ note: v.note ?? null }),
    () => 'Reminders resumed',
    'Could not resume reminders'
  );

// ── Commitments Register · Plan tab (migration jtd-nucleus/023) ─────────────
/** What a list of cards needs — jtd__plan_counts. `to_place` / `proposed` / `reminders_due` are also what VaNi would place / ask / send. */
export interface PlanCounts {
  total: number;
  needs_you: number;
  services: number;
  to_place: number;
  proposed: number;
  asked: number;
  to_confirm: number;
  confirmed: number;
  in_progress: number;
  unassigned_services: number;
  payments: number;
  followups: number;
  reminders_due: number;
  declarations: number;
}
export interface PlanDay {
  day: string;        // YYYY-MM-DD (IST)
  dow: string;        // Mon … Sun
  is_today: boolean;
  counts: PlanCounts;
  cards: BoardCard[]; // the same rows the board renders — JobCard, same verbs
}
export interface PlanFilters {
  from?: string;      // YYYY-MM-DD; defaults to today
  to?: string;        // defaults to from + 13; at most 120 days
  lanes?: BoardLane[];
  who?: 'team' | 'mine' | 'unassigned';
  q?: string;
}
export interface OpsPlan {
  success: boolean;
  today: string;
  is_live: boolean;
  window: { from: string; to: string; days: number };
  filters: Record<string, unknown>;
  days: PlanDay[];
  /** anchored before the window — overdue, carried over */
  carried: { counts: PlanCounts; cards: BoardCard[] };
  /** no anchor at all (the board's parked bucket) */
  parked: { counts: PlanCounts; cards: BoardCard[] };
  totals: PlanCounts;
  /** a bucket held more rows than the reader could carry (500) — narrow the window */
  truncated: boolean;
  team: WlTeamMember[];
  ladder: CollectionsBoard['ladder'];
  ask_channels?: Array<'email' | 'whatsapp'>;
  /** vani_is_enabled(tenant): the leverage buttons show only when true */
  vani_enabled: boolean;
  generated_at: string;
}

const fmtDay = (day: string) => new Date(`${day}T00:00:00`).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });

const planParams = (f: PlanFilters): Record<string, string> => {
  const p: Record<string, string> = {};
  if (f.from) p.from = f.from;
  if (f.to) p.to = f.to;
  if (f.lanes?.length) p.lanes = f.lanes.join(',');
  if (f.who && f.who !== 'team') p.who = f.who;
  if (f.q?.trim()) p.q = f.q.trim();
  return p;
};

export const useOpsPlan = (filters: PlanFilters, options?: { enabled?: boolean }) => {
  const { currentTenant } = useAuth();
  return useQuery({
    queryKey: [...collectionsKeys.all, 'plan', currentTenant?.id || '', filters],
    queryFn: async (): Promise<OpsPlan> => {
      if (!currentTenant?.id) throw new Error('Missing tenant');
      const response = await api.get(`${BASE}/plan`, { params: planParams(filters) });
      return unwrap<OpsPlan>(response);
    },
    enabled: !!currentTenant?.id && options?.enabled !== false,
    placeholderData: keepPreviousData,
    staleTime: 20 * 1000,
    refetchOnWindowFocus: true,
  });
};

export interface PlanDayResult {
  success: boolean;
  day: string;
  placed_count: number;
  refused_count: number;
  unassigned_count: number;
  placed: Array<{ event_id: string; contract_number: string | null; block_name: string | null; scheduled_at: string; technician: string | null; appointment_id: string }>;
  refused: Array<{ event_id: string; contract_number: string | null; block_name: string | null; reason: string; detail?: string | null }>;
}
/** "Plan this day" (023): proposes a slot for every unslotted service on the day. VaNi leverage — the RPC refuses vani_off. */
export const usePlanDay = () =>
  useToolMutation<{ day: string }, PlanDayResult>(
    (v) => `${BASE}/plan/${v.day}/place`,
    () => ({}),
    (r) => (r.placed_count
      ? `Placed ${r.placed_count} service${r.placed_count === 1 ? '' : 's'} for ${fmtDay(r.day)}${r.unassigned_count ? ` · ${r.unassigned_count} still need a technician` : ''}${r.refused_count ? ` · ${r.refused_count} could not be placed` : ''}`
      : r.refused_count ? `Nothing placed — ${r.refused_count} could not be placed` : 'Nothing to place on that day'),
    'Could not plan the day'
  );

export interface AskDayResult {
  success: boolean;
  day: string;
  channel: 'email' | 'whatsapp';
  asked_count: number;
  refused_count: number;
  asked: Array<{ event_id: string; contract_number: string | null; block_name: string | null; recipient_name: string | null; scheduled_at: string; communication_id: string | null }>;
  refused: Array<{ event_id: string; contract_number: string | null; block_name: string | null; reason: string; detail?: string | null }>;
}
/** "Ask everyone" (023): asks every proposed-not-asked slot of the day on email or WhatsApp. VaNi leverage — refuses vani_off. */
export const useAskDay = () =>
  useToolMutation<{ day: string; channel: 'email' | 'whatsapp' }, AskDayResult>(
    (v) => `${BASE}/plan/${v.day}/ask`,
    (v) => ({ channel: v.channel }),
    (r) => (r.asked_count
      ? `Asked ${r.asked_count} customer${r.asked_count === 1 ? '' : 's'} ${r.channel === 'whatsapp' ? 'on WhatsApp' : 'by email'}${r.refused_count ? ` · ${r.refused_count} could not be asked` : ''}`
      : r.refused_count ? `Nobody asked — ${r.refused_count} could not be sent (${r.refused[0]?.reason === 'no_template' ? 'template not registered' : r.refused[0]?.reason || 'refused'})` : 'Nothing to ask on that day'),
    'Could not ask the customers'
  );
