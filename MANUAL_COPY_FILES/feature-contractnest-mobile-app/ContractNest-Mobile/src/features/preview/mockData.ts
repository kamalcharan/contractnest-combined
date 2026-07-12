// src/features/preview/mockData.ts
// Representative sample data for the UI-preview modules (Contract Hub, AR/AP, Ops, Cadence).
// Status vocabulary, colors and shapes mirror the web app exactly, so swapping in the
// live endpoints later is a data-source change, not a redesign.

/* ------------------------------ Contracts ------------------------------ */

export type ContractStatus =
  | 'draft'
  | 'pending_review'
  | 'pending_acceptance'
  | 'active'
  | 'completed'
  | 'cancelled'
  | 'expired';

export const CONTRACT_STATUS_META: Record<ContractStatus, { label: string; colorKey: 'secondaryText' | 'info' | 'warning' | 'success' | 'tertiary' | 'error' }> = {
  draft: { label: 'Draft', colorKey: 'secondaryText' },
  pending_review: { label: 'In Review', colorKey: 'info' },
  pending_acceptance: { label: 'Pending', colorKey: 'warning' },
  active: { label: 'Active', colorKey: 'success' },
  completed: { label: 'Completed', colorKey: 'tertiary' },
  cancelled: { label: 'Cancelled', colorKey: 'error' },
  expired: { label: 'Expired', colorKey: 'error' },
};

export interface MockContract {
  id: string;
  title: string;
  contract_number: string;
  status: ContractStatus;
  buyer_name: string;
  contract_type: 'service' | 'subscription' | 'purchase_order' | 'nda' | 'lease';
  grand_total: number;
  health_score: number;
  events_overdue: number;
}

export const MOCK_CONTRACTS: MockContract[] = [
  { id: 'c1', title: 'Annual HVAC Maintenance', contract_number: 'CN-2026-0142', status: 'active', buyer_name: 'Meridian Facilities', contract_type: 'service', grand_total: 1840000, health_score: 86, events_overdue: 0 },
  { id: 'c2', title: 'Fire Safety AMC — Tower B', contract_number: 'CN-2026-0139', status: 'active', buyer_name: 'Skyline Estates', contract_type: 'service', grand_total: 960000, health_score: 74, events_overdue: 1 },
  { id: 'c3', title: 'Lift Modernisation Phase 2', contract_number: 'CN-2026-0135', status: 'pending_acceptance', buyer_name: 'Orbit Residency', contract_type: 'purchase_order', grand_total: 5250000, health_score: 0, events_overdue: 0 },
  { id: 'c4', title: 'Housekeeping Services FY27', contract_number: 'CN-2026-0131', status: 'pending_review', buyer_name: 'Nexus Business Park', contract_type: 'service', grand_total: 2280000, health_score: 0, events_overdue: 0 },
  { id: 'c5', title: 'Diesel Generator AMC', contract_number: 'CN-2026-0128', status: 'active', buyer_name: 'Vertex IT Campus', contract_type: 'service', grand_total: 1420000, health_score: 41, events_overdue: 3 },
  { id: 'c6', title: 'Landscaping — Draft Proposal', contract_number: 'CN-2026-0127', status: 'draft', buyer_name: 'Palm Grove Villas', contract_type: 'service', grand_total: 380000, health_score: 0, events_overdue: 0 },
  { id: 'c7', title: 'STP Operations 2025', contract_number: 'CN-2025-0098', status: 'completed', buyer_name: 'Meridian Facilities', contract_type: 'service', grand_total: 1150000, health_score: 92, events_overdue: 0 },
  { id: 'c8', title: 'CCTV AMC 2025', contract_number: 'CN-2025-0074', status: 'expired', buyer_name: 'Skyline Estates', contract_type: 'service', grand_total: 540000, health_score: 55, events_overdue: 0 },
];

export const MOCK_PORTFOLIO = {
  portfolioValue: 13820000,
  collected: 7960000,
  outstanding: 2140000,
  avgHealth: 71,
  needsAttention: 2,
  overdueTasks: 4,
};

/* ------------------------------ Invoices ------------------------------- */

export type InvoiceStatus = 'draft' | 'unpaid' | 'partially_paid' | 'paid' | 'overdue';

export interface MockInvoice {
  id: string;
  invoice_number: string;
  status: InvoiceStatus;
  total_amount: number;
  balance: number;
  due_date: string;
  counterparty: string;
  contract_number: string;
  days_overdue: number;
  billing_cycle?: string;
}

export const MOCK_RECEIVABLES: MockInvoice[] = [
  { id: 'i1', invoice_number: 'INV-2026-0871', status: 'overdue', total_amount: 460000, balance: 460000, due_date: '2026-06-28', counterparty: 'Vertex IT Campus', contract_number: 'CN-2026-0128', days_overdue: 14 },
  { id: 'i2', invoice_number: 'INV-2026-0879', status: 'overdue', total_amount: 240000, balance: 140000, due_date: '2026-07-04', counterparty: 'Skyline Estates', contract_number: 'CN-2026-0139', days_overdue: 8 },
  { id: 'i3', invoice_number: 'INV-2026-0885', status: 'unpaid', total_amount: 460000, balance: 460000, due_date: '2026-07-20', counterparty: 'Meridian Facilities', contract_number: 'CN-2026-0142', billing_cycle: 'Quarterly · 2 of 4', days_overdue: 0 },
  { id: 'i4', invoice_number: 'INV-2026-0886', status: 'draft', total_amount: 190000, balance: 190000, due_date: '2026-07-25', counterparty: 'Nexus Business Park', contract_number: 'CN-2026-0131', days_overdue: 0 },
  { id: 'i5', invoice_number: 'INV-2026-0869', status: 'partially_paid', total_amount: 380000, balance: 120000, due_date: '2026-07-15', counterparty: 'Orbit Residency', contract_number: 'CN-2026-0135', days_overdue: 0 },
  { id: 'i6', invoice_number: 'INV-2026-0851', status: 'paid', total_amount: 460000, balance: 0, due_date: '2026-06-15', counterparty: 'Meridian Facilities', contract_number: 'CN-2026-0142', days_overdue: 0 },
];

export const MOCK_PAYABLES: MockInvoice[] = [
  { id: 'p1', invoice_number: 'VND-2026-0421', status: 'unpaid', total_amount: 185000, balance: 185000, due_date: '2026-07-18', counterparty: 'CleanPro Supplies', contract_number: 'CN-2026-0107', days_overdue: 0 },
  { id: 'p2', invoice_number: 'VND-2026-0418', status: 'overdue', total_amount: 96000, balance: 96000, due_date: '2026-07-02', counterparty: 'SafeGuard Security', contract_number: 'CN-2026-0093', days_overdue: 10 },
  { id: 'p3', invoice_number: 'VND-2026-0412', status: 'paid', total_amount: 145000, balance: 0, due_date: '2026-06-25', counterparty: 'GreenLeaf Landscapes', contract_number: 'CN-2026-0088', days_overdue: 0 },
];

export const MOCK_AR_SUMMARY = {
  totalOutstanding: 1370000,
  openInvoices: 5,
  overdueTotal: 600000,
  overdueCount: 2,
  dueNext30: 770000,
  collectedThisMonth: 920000,
  ageing: [
    { label: '1–7 days', amount: 140000, count: 1, color: '#F59E0B' },
    { label: '8–15 days', amount: 460000, count: 1, color: '#F97316' },
    { label: '16–30 days', amount: 0, count: 0, color: '#EF4444' },
    { label: '30+ days', amount: 0, count: 0, color: '#B91C1C' },
  ],
  topDebtors: [
    { name: 'Vertex IT Campus', outstanding: 460000, invoices: 1, oldest: 14 },
    { name: 'Meridian Facilities', outstanding: 460000, invoices: 1, oldest: 0 },
    { name: 'Skyline Estates', outstanding: 140000, invoices: 1, oldest: 8 },
    { name: 'Orbit Residency', outstanding: 120000, invoices: 1, oldest: 0 },
  ],
};

export const MOCK_AP_SUMMARY = {
  totalOutstanding: 281000,
  openInvoices: 2,
  overdueTotal: 96000,
  overdueCount: 1,
  dueNext30: 185000,
  paidToDate: 1240000,
};

/* ------------------------------- Events -------------------------------- */

export type EventType = 'service' | 'billing' | 'spare_part';

// Seed colors from m_event_status_config (web/API source of truth)
export const EVENT_STATUS_META: Record<string, { label: string; color: string }> = {
  scheduled: { label: 'Scheduled', color: '#6B7280' },
  assigned: { label: 'Assigned', color: '#3B82F6' },
  in_progress: { label: 'In Progress', color: '#F59E0B' },
  on_hold: { label: 'On Hold', color: '#EF4444' },
  pending_review: { label: 'Pending Review', color: '#8B5CF6' },
  completed: { label: 'Completed', color: '#10B981' },
  invoiced: { label: 'Invoiced', color: '#3B82F6' },
  sent: { label: 'Sent', color: '#8B5CF6' },
  partially_paid: { label: 'Partially Paid', color: '#F59E0B' },
  paid: { label: 'Paid', color: '#10B981' },
  overdue: { label: 'Overdue', color: '#EF4444' },
};

export interface MockEvent {
  id: string;
  event_type: EventType;
  block_name: string;
  contract_number: string;
  buyer_name: string;
  scheduled_date: string;
  bucket: 'overdue' | 'today' | 'this_week' | 'upcoming';
  status: string;
  amount?: number;
}

export const MOCK_EVENTS: MockEvent[] = [
  { id: 'e1', event_type: 'service', block_name: 'DG quarterly service — load test', contract_number: 'CN-2026-0128', buyer_name: 'Vertex IT Campus', scheduled_date: '2026-07-06', bucket: 'overdue', status: 'scheduled' },
  { id: 'e2', event_type: 'billing', block_name: 'Q2 AMC instalment', contract_number: 'CN-2026-0128', buyer_name: 'Vertex IT Campus', scheduled_date: '2026-06-28', bucket: 'overdue', status: 'overdue', amount: 460000 },
  { id: 'e3', event_type: 'service', block_name: 'Fire panel inspection — Tower B', contract_number: 'CN-2026-0139', buyer_name: 'Skyline Estates', scheduled_date: '2026-07-08', bucket: 'overdue', status: 'assigned' },
  { id: 'e4', event_type: 'service', block_name: 'HVAC filter replacement', contract_number: 'CN-2026-0142', buyer_name: 'Meridian Facilities', scheduled_date: '2026-07-12', bucket: 'today', status: 'in_progress' },
  { id: 'e5', event_type: 'billing', block_name: 'Monthly housekeeping invoice', contract_number: 'CN-2026-0131', buyer_name: 'Nexus Business Park', scheduled_date: '2026-07-12', bucket: 'today', status: 'invoiced', amount: 190000 },
  { id: 'e6', event_type: 'service', block_name: 'Chiller descaling', contract_number: 'CN-2026-0142', buyer_name: 'Meridian Facilities', scheduled_date: '2026-07-15', bucket: 'this_week', status: 'scheduled' },
  { id: 'e7', event_type: 'spare_part', block_name: 'Lift door sensor set', contract_number: 'CN-2026-0135', buyer_name: 'Orbit Residency', scheduled_date: '2026-07-17', bucket: 'this_week', status: 'scheduled' },
  { id: 'e8', event_type: 'billing', block_name: 'Q3 AMC instalment', contract_number: 'CN-2026-0142', buyer_name: 'Meridian Facilities', scheduled_date: '2026-07-20', bucket: 'this_week', status: 'scheduled', amount: 460000 },
  { id: 'e9', event_type: 'service', block_name: 'STP quarterly audit', contract_number: 'CN-2026-0098', buyer_name: 'Meridian Facilities', scheduled_date: '2026-07-28', bucket: 'upcoming', status: 'scheduled' },
  { id: 'e10', event_type: 'service', block_name: 'CCTV camera health check', contract_number: 'CN-2026-0139', buyer_name: 'Skyline Estates', scheduled_date: '2026-08-02', bucket: 'upcoming', status: 'scheduled' },
];

export const MOCK_AWAITING_ACCEPTANCE = [
  { id: 'a1', title: 'Lift Modernisation Phase 2', contract_number: 'CN-2026-0135', buyer: 'Orbit Residency', sentDaysAgo: 3, seen: 'Opened' as const },
  { id: 'a2', title: 'Housekeeping Services FY27', contract_number: 'CN-2026-0131', buyer: 'Nexus Business Park', sentDaysAgo: 6, seen: 'Not Seen' as const },
];

export const MOCK_ACTION_QUEUE = [
  { id: 'q1', kind: 'urgent' as const, title: 'DG service overdue by 6 days', subtitle: 'Vertex IT Campus · CN-2026-0128' },
  { id: 'q2', kind: 'urgent' as const, title: 'Invoice INV-2026-0871 overdue ₹4.6L', subtitle: 'Vertex IT Campus · 14 days' },
  { id: 'q3', kind: 'pending' as const, title: 'Contract awaiting acceptance', subtitle: 'Nexus Business Park · sent 6 days ago' },
  { id: 'q4', kind: 'draft' as const, title: 'Landscaping proposal draft', subtitle: 'Palm Grove Villas · not sent' },
];
