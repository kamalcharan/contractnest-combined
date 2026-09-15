import type { Contract, ContractListResponse } from '@/types/contracts';

export type Relationship = 'all' | 'client' | 'partner';
export type Perspective = 'revenue' | 'expense';
export const PAGE_SIZE = 20;
export const statuses = [
  ['', 'All contracts'], ['draft', 'Draft'], ['pending_review', 'In review'],
  ['pending_acceptance', 'Awaiting acceptance'], ['active', 'Active'],
  ['completed', 'Completed'], ['expired', 'Expired'], ['cancelled', 'Cancelled'],
] as const;
export const statusLabel = (status: string) => statuses.find(([key]) => key === status)?.[1] || status.replace(/_/g, ' ');
export const relationshipScope = (perspective: Perspective, relationship: Relationship) =>
  perspective === 'expense' ? 'vendor' : relationship === 'all' ? 'client,partner' : relationship;
export const listScopeKey = (tenant: string, live: boolean, perspective: Perspective) =>
  ['contracts-experience', tenant, live, perspective] as const;

// Never present a failed/changed response as an empty workspace.
export function parseList(payload: unknown): ContractListResponse {
  const data = ((payload as { data?: unknown })?.data ?? payload) as ContractListResponse;
  if (!data || !Array.isArray(data.items) || !Number.isInteger(data.total_count) ||
      data.total_count < data.items.length || !data.items.every(c => c && typeof c.id === 'string' && typeof c.status === 'string') ||
      !data.page_info || !Number.isInteger(data.page_info.current_page) || data.page_info.current_page < 1 ||
      !Number.isInteger(data.page_info.total_pages) || data.page_info.total_pages < 0) {
    throw new Error('Contract list is unavailable. Please try again.');
  }
  return data;
}

export function counterparty(c: Contract, tenantId: string): string {
  // On a claimed agreement buyer_name is OUR name, not the supplier's.
  // The list API may not resolve the seller yet; do not mislabel the buyer.
  if (c.tenant_id !== tenantId) return c.seller_company || c.seller_name || 'Provider details in contract';
  return c.buyer_company || c.buyer_name || 'Contact not added yet';
}
export function money(value: unknown, currency?: string): string {
  if (value === null || value === undefined || value === '' || !Number.isFinite(Number(value))) return 'Not priced yet';
  if (!currency) return `${Number(value).toLocaleString('en-IN')} · currency not set`;
  try { return new Intl.NumberFormat('en-IN', { style: 'currency', currency, maximumFractionDigits: 2 }).format(Number(value)); }
  catch { return `${Number(value).toLocaleString('en-IN')} ${currency}`; }
}
export function nextStep(c: Contract, owned: boolean) {
  if (c.status === 'draft') return owned ? 'Continue where you left off' : 'Draft agreement';
  if (c.status === 'pending_review') return 'Ready for review';
  if (c.status === 'pending_acceptance') return owned ? 'Waiting for the other party' : 'Your acceptance is requested';
  if (['cancelled', 'completed', 'expired'].includes(c.status)) return 'Agreement history available';
  if ((c.events_overdue ?? 0) > 0) return `${c.events_overdue} overdue event${c.events_overdue === 1 ? '' : 's'}`;
  if (c.events_total === 0) return 'No events scheduled yet';
  if (c.events_total == null) return 'Open to check the event schedule';
  return `${c.events_completed ?? 0} of ${c.events_total} events complete`;
}
