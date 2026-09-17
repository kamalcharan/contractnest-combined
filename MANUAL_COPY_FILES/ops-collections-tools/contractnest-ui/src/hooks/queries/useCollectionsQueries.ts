// src/hooks/queries/useCollectionsQueries.ts
//
// Ops on JTD — the Collections lane. One reader (jtd_collections_worklist)
// and five tools (jtd_nudge_payment, jtd_log_payment_call,
// jtd_escalate_payment_call, jtd_pause_dunning, jtd_resume_dunning) over
// /api/jtd/collections. Spec: specs/OPS-JTD-TOOLS-SPEC.md §4, §5.
//
// Every tool is invoked with the signed-in user as the actor; VaNi will call
// the same RPCs with its own id later. Nothing here computes balances or
// totals — the cockpit lists decisions and commitments, Money In is the ledger.

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '@/services/api';
import { useAuth } from '@/context/AuthContext';

const BASE = '/api/jtd/collections';

export type WlChannel = 'email' | 'whatsapp' | 'call';
export type WlCardKind =
  | 'declaration_pending'
  | 'rung_due'
  | 'call_open'
  | 'paused'
  | 'overdue_no_ladder'
  | 'ladder_exhausted';

export interface WlRung {
  step: number;
  after_days: number;
  channel: WlChannel;
  due_at: string;
}

export interface WlCard {
  kind: WlCardKind;
  job_id: string;
  contract_id: string;
  contract_number: string;
  buyer_id: string | null;
  buyer_name: string | null;
  invoice_id: string | null;
  invoice_number: string | null;
  block_name: string | null;
  cycle_label: string | null;
  sequence: number | null;
  of: number | null;
  amount: number;
  currency: string;
  due_date: string;
  status: string;
  days_overdue: number;
  dunning_step: number;
  nudge_count: number;
  last_nudge_at: string | null;
  last_channel: string | null;
  last_kind: string | null;
  last_status: string | null;
  rung: WlRung | null;
  paused_reason: string | null;
  promise_date: string | null;
  declaration: { id: string; kind: 'session' | 'public'; amount: number; reference: string | null; at: string } | null;
  call_task: { id: string; assigned_to: string | null; assigned_to_name: string | null } | null;
}

export interface WlAwaiting {
  contract_id: string;
  contract_number: string;
  buyer_id: string | null;
  buyer_name: string | null;
  status: string;
  amount: number | null;
  currency: string;
  since: string;
  start_date: string | null;
}

export interface WlFailed {
  reminder_id: string;
  job_id: string;
  channel: string;
  error: string | null;
  at: string;
  recipient_name: string | null;
  recipient_contact: string | null;
  contract_id: string | null;
  contract_number: string | null;
}

export interface WlDue {
  job_id: string;
  contract_id: string;
  contract_number: string;
  buyer_id: string | null;
  buyer_name: string | null;
  invoice_id: string | null;
  invoice_number: string | null;
  block_name: string | null;
  cycle_label: string | null;
  sequence: number | null;
  of: number | null;
  amount: number;
  currency: string;
  due_date: string;
  days_until: number;
  status: string;
}

export interface WlRungAhead {
  job_id: string;
  contract_id: string;
  contract_number: string;
  buyer_id: string | null;
  buyer_name: string | null;
  amount: number;
  currency: string;
  due_date: string;
  rung: WlRung;
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
  actor_type: string;
  actor_name: string | null;
  at: string;
  error: string | null;
}

export interface WlTeamMember {
  user_id: string;
  name: string | null;
}

export interface CollectionsWorklist {
  success: boolean;
  today: string;
  horizon_until: string;
  is_live: boolean;
  needs_you: {
    cards: WlCard[];
    awaiting_payment_to_activate: WlAwaiting[];
    send_failed: WlFailed[];
    counts: Record<string, number>;
  };
  coming_up: { due: WlDue[]; rungs: WlRungAhead[] };
  happened: WlHappened[];
  team: WlTeamMember[];
  ladder: { rule_enabled: boolean; rungs: Array<{ step: number; after_days: number; channel: WlChannel }> };
  generated_at: string;
}

export const collectionsKeys = {
  all: ['collections'] as const,
  worklist: (tenantId: string, horizon: number) => [...collectionsKeys.all, 'worklist', tenantId, horizon] as const,
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
  call_already_open: 'A call is already assigned for this payment.',
  invalid_reason: 'Pick a reason for pausing.',
  actor_required: 'Sign in again and retry.',
};

const errorMessage = (error: any, fallback: string): string => {
  const code = error?.response?.data?.error?.code;
  const msg = error?.response?.data?.error?.message;
  return (code && REASON_COPY[code]) || msg || error?.message || fallback;
};

const unwrap = <T,>(response: any): T => (response.data?.data ?? response.data) as T;

export const useCollectionsWorklist = (horizon = 30, options?: { enabled?: boolean }) => {
  const { currentTenant } = useAuth();
  return useQuery({
    queryKey: collectionsKeys.worklist(currentTenant?.id || '', horizon),
    queryFn: async (): Promise<CollectionsWorklist> => {
      if (!currentTenant?.id) throw new Error('Missing tenant');
      const response = await api.get(`${BASE}/worklist`, { params: { horizon } });
      return unwrap<CollectionsWorklist>(response);
    },
    enabled: !!currentTenant?.id && options?.enabled !== false,
    staleTime: 20 * 1000,
    refetchOnWindowFocus: true,
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
    (r) => `Reminder queued ${r.channel === 'whatsapp' ? 'on WhatsApp' : 'by email'} to ${r.recipient_contact}${r.rung ? ` · rung ${r.rung}` : ''}`,
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

export const useEscalatePaymentCall = () =>
  useToolMutation<{ jobId: string; assignTo: string; note?: string }, { success: boolean; assigned_to_name: string | null }>(
    (v) => `${BASE}/payments/${v.jobId}/escalate`,
    (v) => ({ assign_to: v.assignTo, note: v.note ?? null }),
    (r) => `Call assigned to ${r.assigned_to_name || 'a teammate'}`,
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
