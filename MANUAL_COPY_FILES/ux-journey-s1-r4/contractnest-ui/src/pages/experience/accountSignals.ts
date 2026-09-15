import type { TenantContext } from '@/hooks/queries/useTenantContext';

export interface AccountSignal { id: string; title: string; detail: string; to: string; action: string }
const subscription = '/businessmodel/tenants/subscription';
const billing = '/businessmodel/tenants/billing';
const dayMs = 86400000;
// Subscription billing days are IST-based, matching the existing account API.
function dateValue(value: string | null | undefined): number | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}(?:T|$)/.test(value)) return null;
  const key = value.slice(0, 10);
  const time = Date.parse(key + 'T00:00:00Z');
  return Number.isFinite(time) && new Date(time).toISOString().slice(0, 10) === key ? time : null;
}
function label(time: number) { return new Intl.DateTimeFormat('en-GB', {day:'numeric', month:'short', year:'numeric', timeZone:'UTC'}).format(time); }

/** Advisory only: never gate creation or imply credits expire without an expiry source. */
export function accountSignals(account: TenantContext, now = new Date()): AccountSignal[] {
  if (!account.success || account.billing_mode === 'exempt') return [];
  const signals: AccountSignal[] = [];
  const today = dateValue(new Date(now.getTime() + 19800000).toISOString().slice(0, 10))!;
  const plan = account.subscription;
  if (plan && !['cancelled', 'canceled', 'terminated'].includes(plan.status || '')) {
    const rhythm = plan.rhythm?.success ? plan.rhythm : null;
    const due = dateValue(rhythm?.next_due_date ?? plan.next_billing_date);
    if (rhythm?.awaiting_first_payment) {
      signals.push({id:'payment', title:'First plan payment pending', detail:'Review your bill to complete plan activation.', to:billing, action:'Review billing'});
    } else if (due !== null && due - today <= 14 * dayMs) {
      signals.push({id:'payment', title:due < today ? 'Plan payment overdue' : 'Plan payment coming up', detail:`Payment date: ${label(due)}. This is a billing date, not the end of your plan.`, to:billing, action:'Review billing'});
    }
    const end = dateValue(plan.period_end);
    if (end !== null && end - today <= 14 * dayMs) {
      signals.push({id:'term', title:end < today ? 'Plan term has ended' : 'Plan term ending soon', detail:`Term end: ${label(end)}. Check your subscription for renewal details.`, to:subscription, action:'Review plan'});
    }
  }
  if (account.flags?.credits_low) signals.push({id:'credits', title:'Messaging credits running low', detail:'Review channel balances before your next reminders.', to:subscription, action:'Review credits'});
  if (account.flags?.over_limit || account.flags?.near_limit) signals.push({id:'allowance', title:account.flags.over_limit ? 'Plan allowance reached' : 'Approaching a plan allowance', detail:'Review your usage and available options. You can continue working.', to:subscription, action:'Review allowance'});
  return signals;
}
