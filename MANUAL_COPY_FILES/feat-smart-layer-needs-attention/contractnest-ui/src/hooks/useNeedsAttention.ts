// src/hooks/useNeedsAttention.ts
// Smart Layer Engine — evaluates contract state against workflow rules
// Combines: contract events, invoices, payment requests, and JTD context
// to produce actionable steps for NeedsAttentionPanel / WhatsHappeningPanel

import { useMemo } from 'react';
import { useContractEventsForContract } from '@/hooks/queries/useContractEventQueries';
import { useContractInvoices } from '@/hooks/queries/useInvoiceQueries';
import { usePaymentRequests } from '@/hooks/queries/usePaymentGatewayQueries';
import type { PaymentRequest } from '@/hooks/queries/usePaymentGatewayQueries';
import type { Contract, InvoiceSummary, Invoice } from '@/types/contracts';

// =================================================================
// TYPES
// =================================================================

export type StepState = 'done' | 'action_needed' | 'locked' | 'info';
export type StepPriority = 'critical' | 'high' | 'medium' | 'info';

export interface SmartAction {
  type: 'send_invoice' | 'record_payment' | 'resend' | 'pay_now' | 'resend_signoff'
    | 'assign_team' | 'review_tasks' | 'follow_up' | 'view_tasks' | 'view_timeline';
  label: string;
  channel?: 'email' | 'whatsapp';
}

export interface AgingInfo {
  lastSentAt: string | null;
  channel: string | null;
  status: string | null;
  daysSinceSent: number | null;
  label: string;
}

export interface SmartStep {
  id: string;
  state: StepState;
  priority: StepPriority;
  icon: string;
  title: string;
  description: string;
  actions: SmartAction[];
  aging: AgingInfo | null;
  sortOrder: number;
  /** Extra context — invoice, count, etc. */
  meta?: Record<string, any>;
}

export interface NeedsAttentionResult {
  /** Items requiring immediate action */
  now: SmartStep[];
  /** Items that are locked / waiting on a dependency */
  locked: SmartStep[];
  /** Completed items (for progress display) */
  completed: SmartStep[];
  /** True while any underlying query is loading */
  isLoading: boolean;
}

// =================================================================
// HELPERS
// =================================================================

const timeAgo = (dateStr: string): string => {
  const now = new Date();
  const then = new Date(dateStr);
  const diffMs = now.getTime() - then.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHrs = Math.floor(diffMins / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  const diffDays = Math.floor(diffHrs / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const daysBetween = (dateStr: string): number => {
  const now = new Date();
  const then = new Date(dateStr);
  return Math.floor((now.getTime() - then.getTime()) / 86400000);
};

const formatCurrency = (amount: number | null | undefined, currency: string): string => {
  if (amount == null) return '\u2014';
  const sym = currency === 'INR' ? '\u20B9' : currency === 'USD' ? '$' : currency;
  return `${sym}${Number(amount).toLocaleString('en-IN')}`;
};

/**
 * Extract aging info from the most recent payment request.
 */
const deriveAging = (requests: PaymentRequest[]): AgingInfo | null => {
  if (!requests || requests.length === 0) return null;
  // Find most recent non-terminal request
  const sorted = [...requests].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
  const latest = sorted[0];
  if (!latest) return null;
  const days = daysBetween(latest.created_at);
  const channelLabel =
    latest.collection_mode === 'email_link' ? 'Email' :
    latest.collection_mode === 'whatsapp_link' ? 'WhatsApp' :
    latest.collection_mode === 'terminal' ? 'Terminal' : 'Online';

  let label = `Sent via ${channelLabel}`;
  if (days === 0) label += ' \u00B7 Today';
  else if (days === 1) label += ' \u00B7 Yesterday';
  else label += ` \u00B7 ${days}d ago`;

  if (latest.status === 'paid') label = `Paid via ${channelLabel} \u00B7 ${timeAgo(latest.paid_at || latest.created_at)}`;
  else if (latest.status === 'expired') label = `Expired \u00B7 Sent ${days}d ago via ${channelLabel}`;
  else if (latest.status === 'failed') label = `Failed \u00B7 ${channelLabel}`;

  return {
    lastSentAt: latest.created_at,
    channel: latest.collection_mode,
    status: latest.status,
    daysSinceSent: days,
    label,
  };
};

// =================================================================
// WORKFLOW EVALUATORS — one per contract state
// =================================================================

/**
 * Pending acceptance + manual (payment acceptance) — seller sees guided stepper
 */
function evaluatePaymentAcceptance(
  contract: Contract,
  invoices: Invoice[],
  summary: InvoiceSummary | null | undefined,
  paymentRequests: PaymentRequest[],
  computedEventCount: number,
): { now: SmartStep[]; locked: SmartStep[]; completed: SmartStep[] } {
  const now: SmartStep[] = [];
  const locked: SmartStep[] = [];
  const completed: SmartStep[] = [];
  const currency = contract.currency || 'INR';

  // ── STEP 1: Invoice Created? ──
  const hasInvoice = invoices.length > 0;
  const firstInvoice = invoices[0];
  if (hasInvoice) {
    completed.push({
      id: 'invoice_created',
      state: 'done',
      priority: 'info',
      icon: '\uD83E\uDDFE',
      title: 'Invoice Created',
      description: `${firstInvoice.invoice_number} \u00B7 ${formatCurrency(firstInvoice.total_amount, currency)}`,
      actions: [],
      aging: null,
      sortOrder: 1,
      meta: { invoice: firstInvoice },
    });
  } else {
    now.push({
      id: 'invoice_pending',
      state: 'action_needed',
      priority: 'critical',
      icon: '\uD83E\uDDFE',
      title: 'Invoice Pending',
      description: 'Invoice needs to be generated for this contract',
      actions: [],
      aging: null,
      sortOrder: 1,
    });
  }

  // ── STEP 2: Collect Payment ──
  const allPaid = hasInvoice && invoices.every(i => i.status === 'paid' || i.status === 'cancelled');
  const aging = deriveAging(paymentRequests);

  if (allPaid) {
    completed.push({
      id: 'payment_collected',
      state: 'done',
      priority: 'info',
      icon: '\u2705',
      title: 'Payment Received',
      description: `${formatCurrency(summary?.total_paid, currency)} collected`,
      actions: [],
      aging,
      sortOrder: 2,
      meta: { summary },
    });
  } else if (hasInvoice) {
    const balance = firstInvoice.balance ?? (firstInvoice.total_amount - (firstInvoice.amount_paid || 0));
    const actions: SmartAction[] = [
      { type: 'send_invoice', label: 'Send Invoice', channel: 'email' },
      { type: 'record_payment', label: 'Record Payment' },
    ];
    // If already sent, add resend
    if (aging && aging.daysSinceSent != null && aging.daysSinceSent >= 2 && aging.status !== 'paid') {
      actions.push({ type: 'resend', label: 'Resend' });
    }

    now.push({
      id: 'collect_payment',
      state: 'action_needed',
      priority: 'critical',
      icon: '\uD83D\uDCB0',
      title: 'Collect Payment',
      description: `${formatCurrency(balance, currency)} remaining`,
      actions,
      aging,
      sortOrder: 2,
      meta: { invoice: firstInvoice, balance },
    });
  }

  // ── STEP 3: Tasks will activate ──
  const taskCount = computedEventCount || contract.events_total || 0;
  if (allPaid) {
    // If all paid but still pending_acceptance, something is stuck
    now.push({
      id: 'tasks_activation',
      state: 'action_needed',
      priority: 'high',
      icon: '\uD83D\uDCCB',
      title: 'Activating Contract',
      description: `Payment received — contract should activate shortly`,
      actions: [],
      aging: null,
      sortOrder: 3,
    });
  } else {
    locked.push({
      id: 'tasks_locked',
      state: 'locked',
      priority: 'info',
      icon: '\uD83D\uDD12',
      title: 'Tasks & Services',
      description: taskCount > 0
        ? `${taskCount} task${taskCount > 1 ? 's' : ''} will activate after payment`
        : 'Tasks will activate after payment is received',
      actions: [],
      aging: null,
      sortOrder: 3,
      meta: { taskCount },
    });
  }

  return { now, locked, completed };
}

/**
 * Pending acceptance + digital_signature — seller sees signoff stepper
 */
function evaluateSignatureAcceptance(
  contract: Contract,
  paymentRequests: PaymentRequest[],
  computedEventCount: number,
): { now: SmartStep[]; locked: SmartStep[]; completed: SmartStep[] } {
  const now: SmartStep[] = [];
  const locked: SmartStep[] = [];
  const completed: SmartStep[] = [];

  // ── STEP 1: Awaiting Signature ──
  const sentAt = contract.sent_at;
  const daysSinceSent = sentAt ? daysBetween(sentAt) : null;

  let agingLabel = 'Awaiting buyer signature';
  if (daysSinceSent != null) {
    if (daysSinceSent === 0) agingLabel = 'Sent today \u00B7 Awaiting signature';
    else if (daysSinceSent === 1) agingLabel = 'Sent yesterday \u00B7 Awaiting signature';
    else agingLabel = `Sent ${daysSinceSent}d ago \u00B7 No response yet`;
  }

  const actions: SmartAction[] = [];
  if (daysSinceSent != null && daysSinceSent >= 2) {
    actions.push({ type: 'resend_signoff', label: 'Resend' });
  }

  now.push({
    id: 'awaiting_signature',
    state: 'action_needed',
    priority: 'critical',
    icon: '\u270D\uFE0F',
    title: 'Awaiting Buyer Signature',
    description: agingLabel,
    actions,
    aging: sentAt ? {
      lastSentAt: sentAt,
      channel: 'email',
      status: 'sent',
      daysSinceSent,
      label: agingLabel,
    } : null,
    sortOrder: 1,
  });

  // ── STEP 2: Tasks locked ──
  const taskCount = computedEventCount || contract.events_total || 0;
  locked.push({
    id: 'tasks_locked',
    state: 'locked',
    priority: 'info',
    icon: '\uD83D\uDD12',
    title: 'Tasks & Services',
    description: taskCount > 0
      ? `${taskCount} task${taskCount > 1 ? 's' : ''} will activate after sign-off`
      : 'Tasks will activate after buyer signs off',
    actions: [],
    aging: null,
    sortOrder: 2,
    meta: { taskCount },
  });

  return { now, locked, completed };
}

/**
 * Active contract — seller sees operational alerts (existing logic, now with actions)
 */
function evaluateActiveContract(
  events: any[],
  summary: InvoiceSummary | null | undefined,
): { now: SmartStep[]; locked: SmartStep[]; completed: SmartStep[] } {
  const now: SmartStep[] = [];
  const completed: SmartStep[] = [];

  // 1. Overdue tasks
  const overdue = events.filter((e: any) => e.status === 'overdue');
  if (overdue.length > 0) {
    now.push({
      id: 'overdue_tasks',
      state: 'action_needed',
      priority: 'critical',
      icon: '\u23F0',
      title: 'Overdue Tasks',
      description: `${overdue.length} task${overdue.length > 1 ? 's' : ''} past due date`,
      actions: [{ type: 'review_tasks', label: 'Review' }],
      aging: null,
      sortOrder: 0,
    });
  }

  // 2. Unassigned service events
  const unassigned = events.filter(
    (e: any) => e.event_type === 'service' && (!e.assigned_to || e.assigned_to === 'Unassigned'),
  );
  if (unassigned.length > 0) {
    now.push({
      id: 'unassigned_tasks',
      state: 'action_needed',
      priority: 'high',
      icon: '\uD83D\uDC64',
      title: 'Assign Team Members',
      description: `${unassigned.length} task${unassigned.length > 1 ? 's' : ''} unassigned`,
      actions: [{ type: 'assign_team', label: 'Assign' }],
      aging: null,
      sortOrder: 1,
    });
  }

  // 3. Pending billing events
  const pendingBilling = events.filter(
    (e: any) => e.event_type === 'billing' && e.status !== 'completed' && e.status !== 'cancelled',
  );
  if (pendingBilling.length > 0) {
    now.push({
      id: 'pending_billing',
      state: 'action_needed',
      priority: 'medium',
      icon: '\uD83E\uDDFE',
      title: 'Raise Invoice',
      description: `${pendingBilling.length} billing event${pendingBilling.length > 1 ? 's' : ''} pending`,
      actions: [{ type: 'follow_up', label: 'Invoice' }],
      aging: null,
      sortOrder: 2,
    });
  }

  // 4. Low collection
  if (summary && summary.collection_percentage < 30 && summary.invoice_count > 0) {
    now.push({
      id: 'low_collection',
      state: 'action_needed',
      priority: 'medium',
      icon: '\uD83D\uDCB3',
      title: 'Low Collection',
      description: `Only ${Math.round(summary.collection_percentage)}% collected`,
      actions: [{ type: 'follow_up', label: 'Follow Up' }],
      aging: null,
      sortOrder: 3,
    });
  }

  // 5. Upcoming events summary (always show for active — replaces DualTrackPreview)
  const upcoming = events.filter(
    (e: any) => e.status !== 'completed' && e.status !== 'cancelled' && e.status !== 'overdue',
  );
  const completedEvents = events.filter((e: any) => e.status === 'completed');
  const serviceEvents = events.filter((e: any) => e.event_type === 'service' || e.event_type === 'spare_part');
  const billingEvents = events.filter((e: any) => e.event_type === 'billing');

  if (events.length > 0) {
    // Service track summary
    const serviceCompleted = serviceEvents.filter((e: any) => e.status === 'completed').length;
    if (serviceEvents.length > 0) {
      completed.push({
        id: 'service_track',
        state: 'info' as StepState,
        priority: 'info',
        icon: '\uD83D\uDD27',
        title: 'Service Track',
        description: `${serviceCompleted}/${serviceEvents.length} completed`,
        actions: serviceEvents.length > 0 ? [{ type: 'view_tasks' as const, label: 'View Tasks' }] : [],
        aging: null,
        sortOrder: 10,
      });
    }

    // Billing track summary
    const billingCompleted = billingEvents.filter((e: any) => e.status === 'completed').length;
    if (billingEvents.length > 0) {
      completed.push({
        id: 'billing_track',
        state: 'info' as StepState,
        priority: 'info',
        icon: '\uD83D\uDCB0',
        title: 'Financial Track',
        description: summary
          ? `${Math.round(summary.collection_percentage)}% collected \u00B7 ${billingCompleted}/${billingEvents.length} billing events`
          : `${billingCompleted}/${billingEvents.length} completed`,
        actions: [],
        aging: null,
        sortOrder: 11,
      });
    }
  }

  // If no alerts AND no events at all
  if (now.length === 0 && events.length === 0) {
    completed.push({
      id: 'no_events',
      state: 'done',
      priority: 'info',
      icon: '\uD83D\uDCCB',
      title: 'No Tasks Yet',
      description: 'Events will appear once tasks are created for this contract.',
      actions: [],
      aging: null,
      sortOrder: 0,
    });
  }

  return { now, locked: [], completed };
}

/**
 * Buyer-side evaluation for pending_acceptance + manual (payment)
 */
function evaluateBuyerPaymentView(
  contract: Contract,
  invoices: Invoice[],
  summary: InvoiceSummary | null | undefined,
  computedEventCount: number,
): { now: SmartStep[]; locked: SmartStep[]; completed: SmartStep[] } {
  const now: SmartStep[] = [];
  const locked: SmartStep[] = [];
  const completed: SmartStep[] = [];
  const currency = contract.currency || 'INR';
  const firstInvoice = invoices[0];
  const allPaid = invoices.length > 0 && invoices.every(i => i.status === 'paid' || i.status === 'cancelled');

  if (allPaid) {
    completed.push({
      id: 'payment_done',
      state: 'done',
      priority: 'info',
      icon: '\u2705',
      title: 'Payment Complete',
      description: `${formatCurrency(summary?.total_paid, currency)} paid`,
      actions: [],
      aging: null,
      sortOrder: 1,
    });
    now.push({
      id: 'activating',
      state: 'info' as StepState,
      priority: 'info',
      icon: '\u23F3',
      title: 'Contract Activating',
      description: 'Your services will begin shortly',
      actions: [],
      aging: null,
      sortOrder: 2,
    });
  } else if (firstInvoice) {
    const balance = firstInvoice.balance ?? (firstInvoice.total_amount - (firstInvoice.amount_paid || 0));
    now.push({
      id: 'payment_required',
      state: 'action_needed',
      priority: 'critical',
      icon: '\uD83D\uDCB0',
      title: 'Payment Required',
      description: `${firstInvoice.invoice_number} \u00B7 ${formatCurrency(balance, currency)} due`,
      actions: [{ type: 'pay_now', label: 'Pay Now' }],
      aging: null,
      sortOrder: 1,
      meta: { invoice: firstInvoice },
    });
  } else {
    now.push({
      id: 'awaiting_invoice',
      state: 'info' as StepState,
      priority: 'info',
      icon: '\uD83E\uDDFE',
      title: 'Invoice Pending',
      description: 'Your seller is preparing the invoice',
      actions: [],
      aging: null,
      sortOrder: 1,
    });
  }

  // Tasks preview
  const taskCount = computedEventCount || contract.events_total || 0;
  if (taskCount > 0 && !allPaid) {
    locked.push({
      id: 'services_locked',
      state: 'locked',
      priority: 'info',
      icon: '\uD83D\uDD27',
      title: 'Services & Deliverables',
      description: `${taskCount} scheduled task${taskCount > 1 ? 's' : ''} \u00B7 Begins after payment`,
      actions: [],
      aging: null,
      sortOrder: 3,
    });
  }

  return { now, locked, completed };
}

/**
 * Buyer-side for digital signature acceptance
 */
function evaluateBuyerSignatureView(
  contract: Contract,
  computedEventCount: number,
): { now: SmartStep[]; locked: SmartStep[]; completed: SmartStep[] } {
  const now: SmartStep[] = [];
  const locked: SmartStep[] = [];

  now.push({
    id: 'signature_required',
    state: 'action_needed',
    priority: 'critical',
    icon: '\u270D\uFE0F',
    title: 'Signature Required',
    description: 'Please review and sign this contract',
    actions: [],  // handled by review page, not in-app action
    aging: null,
    sortOrder: 1,
  });

  const taskCount = computedEventCount || contract.events_total || 0;
  if (taskCount > 0) {
    locked.push({
      id: 'services_locked',
      state: 'locked',
      priority: 'info',
      icon: '\uD83D\uDD27',
      title: 'Services & Deliverables',
      description: `${taskCount} scheduled task${taskCount > 1 ? 's' : ''} \u00B7 Begins after sign-off`,
      actions: [],
      aging: null,
      sortOrder: 2,
    });
  }

  return { now, locked, completed: [] };
}

// =================================================================
// MAIN HOOK
// =================================================================

export function useNeedsAttention(
  contract: Contract | null | undefined,
  perspective: 'seller' | 'buyer' = 'seller',
): NeedsAttentionResult {
  const contractId = contract?.id || '';

  // ── Data sources (all existing hooks) ──
  const { data: eventsData, isLoading: eventsLoading } = useContractEventsForContract(contractId);
  const { data: invoiceData, isLoading: invoicesLoading } = useContractInvoices(contractId);
  const { data: paymentData, isLoading: paymentsLoading } = usePaymentRequests(
    { contract_id: contractId },
    {
      enabled: !!contractId,
      refetchInterval: contract?.status === 'pending_acceptance' ? 15000 : false,
    },
  );

  const events = eventsData?.items || [];
  const invoices = invoiceData?.invoices || [];
  const summary = invoiceData?.summary;
  const paymentRequests = paymentData?.requests || [];
  const isLoading = eventsLoading || invoicesLoading || paymentsLoading;

  // ── Computed event count (tasks pending activation) ──
  // We check events_total on the contract; if contract is pending_acceptance
  // and events array is empty, events_total from the list query gives us the count
  const computedEventCount = events.length === 0 ? (contract?.events_total || 0) : 0;

  return useMemo(() => {
    if (!contract) {
      return { now: [], locked: [], completed: [], isLoading };
    }

    const status = contract.status;
    const acceptance = contract.acceptance_method;

    // ── Route to evaluator based on state + perspective ──

    // PENDING ACCEPTANCE — Payment (manual)
    if (status === 'pending_acceptance' && acceptance === 'manual') {
      if (perspective === 'buyer') {
        return { ...evaluateBuyerPaymentView(contract, invoices, summary, computedEventCount), isLoading };
      }
      return { ...evaluatePaymentAcceptance(contract, invoices, summary, paymentRequests, computedEventCount), isLoading };
    }

    // PENDING ACCEPTANCE — Digital Signature
    if (status === 'pending_acceptance' && acceptance === 'digital_signature') {
      if (perspective === 'buyer') {
        return { ...evaluateBuyerSignatureView(contract, computedEventCount), isLoading };
      }
      return { ...evaluateSignatureAcceptance(contract, paymentRequests, computedEventCount), isLoading };
    }

    // PENDING ACCEPTANCE — other methods (generic)
    if (status === 'pending_acceptance') {
      return {
        now: [{
          id: 'pending_generic',
          state: 'action_needed' as StepState,
          priority: 'high' as StepPriority,
          icon: '\u23F3',
          title: 'Awaiting Acceptance',
          description: 'Contract has been sent and is awaiting acceptance',
          actions: [],
          aging: null,
          sortOrder: 1,
        }],
        locked: [],
        completed: [],
        isLoading,
      };
    }

    // ACTIVE contract
    if (status === 'active') {
      if (perspective === 'buyer') {
        // Buyer on active contract — existing WhatsHappening logic
        return { now: [], locked: [], completed: [], isLoading };
      }
      return { ...evaluateActiveContract(events, summary), isLoading };
    }

    // DRAFT, COMPLETED, CANCELLED, EXPIRED — no smart layer
    return { now: [], locked: [], completed: [], isLoading };

  }, [contract, perspective, events, invoices, summary, paymentRequests, computedEventCount, isLoading]);
}

export default useNeedsAttention;
