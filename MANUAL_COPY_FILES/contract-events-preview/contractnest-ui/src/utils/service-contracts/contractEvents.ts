// src/utils/service-contracts/contractEvents.ts
// Computes Contract Events from wizard state — service delivery + billing schedule
// Phase 1: Frontend computation for Events Preview step

import type { ConfigurableBlock } from '@/components/catalog-studio/BlockCardConfigurable';
import { categoryHasPricing } from '@/utils/catalog-studio/categories';

// ─── Types ───

export type EventType = 'service' | 'billing';
export type BillingSubType = 'upfront' | 'emi' | 'on_completion' | 'recurring';

export interface ContractEvent {
  id: string;                    // Deterministic ID for React keys
  contract_id?: string;

  // Source
  block_id: string;
  block_name: string;
  category_id: string;

  // Type
  event_type: EventType;
  billing_sub_type?: BillingSubType;
  billing_cycle_label?: string;  // 'Monthly', 'EMI 3/5', 'Prepaid', etc.

  // Schedule
  sequence_number: number;       // 1-based: 1 of 5, 2 of 5...
  total_occurrences: number;
  scheduled_date: Date;          // Computed; user can adjust in preview
  original_date: Date;           // System-computed (never changes)

  // Financials (billing events only)
  amount?: number;
  currency?: string;

  // Status (default for preview)
  status: 'scheduled';

  // Allocation (empty in preview, populated later)
  assigned_to?: string;
  assigned_to_name?: string;
}

export interface ComputeEventsInput {
  startDate: Date;
  durationValue: number;
  durationUnit: string;          // 'days' | 'months' | 'years'
  selectedBlocks: ConfigurableBlock[];
  paymentMode: 'prepaid' | 'emi' | 'defined';
  emiMonths: number;
  perBlockPaymentType: Record<string, 'prepaid' | 'postpaid'>;
  billingCycleType: 'unified' | 'mixed' | null;
  grandTotal: number;
  currency: string;
}

// ─── Helpers ───

/** Convert duration to total days */
export function durationToDays(value: number, unit: string): number {
  switch (unit) {
    case 'days': return value;
    case 'months': return value * 30;
    case 'years': return value * 365;
    default: return value * 30;
  }
}

/** Add days to a date (returns new Date) */
function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/** Add months to a date */
function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

/** Deterministic event ID */
function makeEventId(blockId: string, eventType: EventType, seq: number): string {
  return `evt_${eventType}_${blockId.slice(0, 8)}_${seq}`;
}

/** How many recurring periods fit in the contract duration */
function countRecurringPeriods(durationDays: number, periodDays: number): number {
  if (periodDays <= 0) return 1;
  return Math.max(1, Math.ceil(durationDays / periodDays));
}

/** Billing cycle to period in days */
function cycleToPeriodDays(cycle: string, customDays?: number): number {
  switch (cycle) {
    case 'monthly': return 30;
    case 'fortnightly': return 14;
    case 'quarterly': return 90;
    case 'custom': return customDays || 30;
    default: return 0; // prepaid/postpaid are one-time, not recurring
  }
}

/** Human-readable cycle label */
function cycleLabel(cycle: string): string {
  switch (cycle) {
    case 'prepaid': return 'Prepaid';
    case 'postpaid': return 'Postpaid';
    case 'monthly': return 'Monthly';
    case 'fortnightly': return 'Fortnightly';
    case 'quarterly': return 'Quarterly';
    case 'custom': return 'Custom Cycle';
    default: return cycle;
  }
}

// ─── Main Computation ───

export function computeContractEvents(input: ComputeEventsInput): ContractEvent[] {
  const {
    startDate,
    durationValue,
    durationUnit,
    selectedBlocks,
    paymentMode,
    emiMonths,
    perBlockPaymentType,
    grandTotal,
    currency,
  } = input;

  const events: ContractEvent[] = [];
  const totalDays = durationToDays(durationValue, durationUnit);
  const endDate = addDays(startDate, totalDays);

  // ─── SERVICE EVENTS ───
  // For each priced, non-unlimited block
  for (const block of selectedBlocks) {
    const hasPricing = categoryHasPricing(block.categoryId || '');
    if (!hasPricing || block.unlimited) continue;

    const qty = block.quantity || 1;

    if (block.serviceCycleDays && block.serviceCycleDays > 0 && qty > 1) {
      // Recurring service: qty events, each serviceCycleDays apart
      for (let i = 0; i < qty; i++) {
        const dayOffset = i * block.serviceCycleDays;
        const date = addDays(startDate, dayOffset);

        events.push({
          id: makeEventId(block.id, 'service', i + 1),
          block_id: block.id,
          block_name: block.name,
          category_id: block.categoryId || '',
          event_type: 'service',
          sequence_number: i + 1,
          total_occurrences: qty,
          scheduled_date: date,
          original_date: new Date(date),
          status: 'scheduled',
        });
      }
    } else {
      // One-time service delivery on Day 1
      events.push({
        id: makeEventId(block.id, 'service', 1),
        block_id: block.id,
        block_name: block.name,
        category_id: block.categoryId || '',
        event_type: 'service',
        sequence_number: 1,
        total_occurrences: 1,
        scheduled_date: new Date(startDate),
        original_date: new Date(startDate),
        status: 'scheduled',
      });
    }
  }

  // ─── BILLING EVENTS ───

  if (paymentMode === 'prepaid') {
    // Upfront: 1 billing event on Day 1 for full amount
    events.push({
      id: makeEventId('contract', 'billing', 1),
      block_id: '_contract',
      block_name: 'Full Payment (Upfront)',
      category_id: '',
      event_type: 'billing',
      billing_sub_type: 'upfront',
      billing_cycle_label: 'Upfront',
      sequence_number: 1,
      total_occurrences: 1,
      scheduled_date: new Date(startDate),
      original_date: new Date(startDate),
      amount: grandTotal,
      currency,
      status: 'scheduled',
    });
  } else if (paymentMode === 'emi') {
    // EMI: N monthly installments
    const installment = Math.round((grandTotal / emiMonths) * 100) / 100;
    for (let i = 0; i < emiMonths; i++) {
      const date = i === 0 ? new Date(startDate) : addMonths(startDate, i);
      events.push({
        id: makeEventId('emi', 'billing', i + 1),
        block_id: '_emi',
        block_name: `EMI Installment`,
        category_id: '',
        event_type: 'billing',
        billing_sub_type: 'emi',
        billing_cycle_label: `EMI ${i + 1}/${emiMonths}`,
        sequence_number: i + 1,
        total_occurrences: emiMonths,
        scheduled_date: date,
        original_date: new Date(date),
        amount: installment,
        currency,
        status: 'scheduled',
      });
    }
  } else if (paymentMode === 'defined') {
    // Per-block billing: each block generates its own billing events
    for (const block of selectedBlocks) {
      const hasPricing = categoryHasPricing(block.categoryId || '');
      if (!hasPricing || block.unlimited) continue;

      const blockCycle = block.cycle || 'prepaid';
      const blockPayType = perBlockPaymentType[block.id] || 'prepaid';
      const blockTotal = block.totalPrice || 0;

      if (blockCycle === 'prepaid' || blockPayType === 'prepaid') {
        // On acceptance — 1 event
        events.push({
          id: makeEventId(block.id, 'billing', 1),
          block_id: block.id,
          block_name: block.name,
          category_id: block.categoryId || '',
          event_type: 'billing',
          billing_sub_type: 'upfront',
          billing_cycle_label: 'Prepaid',
          sequence_number: 1,
          total_occurrences: 1,
          scheduled_date: new Date(startDate),
          original_date: new Date(startDate),
          amount: blockTotal,
          currency: block.currency || currency,
          status: 'scheduled',
        });
      } else if (blockCycle === 'postpaid') {
        // On completion — 1 event at end
        events.push({
          id: makeEventId(block.id, 'billing', 1),
          block_id: block.id,
          block_name: block.name,
          category_id: block.categoryId || '',
          event_type: 'billing',
          billing_sub_type: 'on_completion',
          billing_cycle_label: 'Postpaid',
          sequence_number: 1,
          total_occurrences: 1,
          scheduled_date: new Date(endDate),
          original_date: new Date(endDate),
          amount: blockTotal,
          currency: block.currency || currency,
          status: 'scheduled',
        });
      } else {
        // Recurring: monthly, fortnightly, quarterly, custom
        const periodDays = cycleToPeriodDays(blockCycle, block.customCycleDays);
        const count = countRecurringPeriods(totalDays, periodDays);
        const perPeriodAmount = Math.round((blockTotal / count) * 100) / 100;

        for (let i = 0; i < count; i++) {
          const date = addDays(startDate, i * periodDays);
          // Don't generate events past the contract end
          if (date > endDate) break;

          events.push({
            id: makeEventId(block.id, 'billing', i + 1),
            block_id: block.id,
            block_name: block.name,
            category_id: block.categoryId || '',
            event_type: 'billing',
            billing_sub_type: 'recurring',
            billing_cycle_label: `${cycleLabel(blockCycle)} ${i + 1}/${count}`,
            sequence_number: i + 1,
            total_occurrences: count,
            scheduled_date: date,
            original_date: new Date(date),
            amount: perPeriodAmount,
            currency: block.currency || currency,
            status: 'scheduled',
          });
        }
      }
    }
  }

  // Sort all events by scheduled_date, then by type (service before billing on same day)
  events.sort((a, b) => {
    const dateDiff = a.scheduled_date.getTime() - b.scheduled_date.getTime();
    if (dateDiff !== 0) return dateDiff;
    // Service events before billing events on the same day
    if (a.event_type === 'service' && b.event_type === 'billing') return -1;
    if (a.event_type === 'billing' && b.event_type === 'service') return 1;
    return 0;
  });

  return events;
}

// ─── Summary helpers (for preview UI) ───

export interface EventSummary {
  totalEvents: number;
  serviceEvents: number;
  billingEvents: number;
  totalBillingAmount: number;
  firstEventDate: Date | null;
  lastEventDate: Date | null;
  spanDays: number;
}

export function summarizeEvents(events: ContractEvent[]): EventSummary {
  const serviceEvents = events.filter(e => e.event_type === 'service');
  const billingEvents = events.filter(e => e.event_type === 'billing');
  const totalBillingAmount = billingEvents.reduce((sum, e) => sum + (e.amount || 0), 0);

  const sorted = [...events].sort(
    (a, b) => a.scheduled_date.getTime() - b.scheduled_date.getTime()
  );
  const first = sorted[0]?.scheduled_date || null;
  const last = sorted[sorted.length - 1]?.scheduled_date || null;
  const spanDays = first && last
    ? Math.round((last.getTime() - first.getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  return {
    totalEvents: events.length,
    serviceEvents: serviceEvents.length,
    billingEvents: billingEvents.length,
    totalBillingAmount: Math.round(totalBillingAmount * 100) / 100,
    firstEventDate: first,
    lastEventDate: last,
    spanDays,
  };
}

/** Group events by block for display */
export function groupEventsByBlock(
  events: ContractEvent[]
): Record<string, { block_name: string; events: ContractEvent[] }> {
  const groups: Record<string, { block_name: string; events: ContractEvent[] }> = {};

  for (const event of events) {
    const key = event.block_id;
    if (!groups[key]) {
      groups[key] = { block_name: event.block_name, events: [] };
    }
    groups[key].events.push(event);
  }

  return groups;
}

/** Group events by date for timeline display */
export function groupEventsByDate(
  events: ContractEvent[]
): Array<{ date: Date; dateLabel: string; events: ContractEvent[] }> {
  const map = new Map<string, { date: Date; events: ContractEvent[] }>();

  for (const event of events) {
    const key = event.scheduled_date.toISOString().split('T')[0];
    if (!map.has(key)) {
      map.set(key, { date: event.scheduled_date, events: [] });
    }
    map.get(key)!.events.push(event);
  }

  return Array.from(map.values())
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .map(({ date, events: evts }) => ({
      date,
      dateLabel: date.toLocaleDateString('en-IN', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }),
      events: evts,
    }));
}
