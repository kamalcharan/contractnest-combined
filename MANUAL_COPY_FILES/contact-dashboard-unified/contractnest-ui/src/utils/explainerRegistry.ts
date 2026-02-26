// src/utils/explainerRegistry.ts
// Central registry for page-level metric explanations
// Used by ExplainerDrawer — scoped per tab/page context
//
// Each entry provides:
//   title       — short metric name
//   what        — plain English explanation
//   formula     — how it's computed
//   interpret   — dynamic interpretation based on current value
//   improve     — actionable suggestion to improve the metric

import type { ContactCockpitData } from '@/types/contactCockpit';

// ═══════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════

export interface ExplainerEntry {
  key: string;
  title: string;
  what: string;
  formula: string;
  interpret: (value: number, data?: ContactCockpitData) => string;
  improve: string;
  /** Extract current value from cockpit data */
  getValue: (data: ContactCockpitData) => number;
}

export interface ExplainerSection {
  heading: string;
  entries: ExplainerEntry[];
}

export type ExplainerTab = 'overview' | 'contracts' | 'assets' | 'financials' | 'timeline';

// ═══════════════════════════════════════════════════
// INTERPRETATION HELPERS
// ═══════════════════════════════════════════════════

function pctInterpret(value: number, low: string, mid: string, high: string): string {
  if (value <= 30) return low;
  if (value <= 70) return mid;
  return high;
}

// ═══════════════════════════════════════════════════
// REGISTRY
// ═══════════════════════════════════════════════════

export const EXPLAINER_REGISTRY: Record<ExplainerTab, ExplainerSection[]> = {

  // ─── OVERVIEW TAB ───
  overview: [
    {
      heading: 'Health Score',
      entries: [
        {
          key: 'health_score',
          title: 'Health Score',
          what: 'Overall relationship health based on event completion and overdue events.',
          formula: '(Completed Events ÷ Total Events × 100) − (Overdue Count × 10)',
          interpret: (v) => pctInterpret(v,
            'Critical — too many overdue events are dragging the score down. Immediate attention needed.',
            'Fair — some events are overdue. Clearing the backlog will improve this.',
            'Healthy — events are being completed on time with minimal overdue items.'
          ),
          improve: 'Complete or reschedule overdue events. Each resolved overdue event adds ~10 points.',
          getValue: (d) => d.health_score || 0,
        },
      ],
    },
    {
      heading: 'Health Pillars',
      entries: [
        {
          key: 'pillar_revenue',
          title: 'Revenue Health',
          what: 'Measures how reliably payments are being collected from this contact.',
          formula: '(Collection Rate × 60%) + (On-time Payment Rate × 40%)',
          interpret: (v, d) => {
            const cr = d?.payment_pattern?.collection_rate || 0;
            const otr = d?.payment_pattern?.on_time_rate || 0;
            return `Collection is at ${cr}% and on-time payment is at ${otr}%. ${pctInterpret(v,
              'Significant payment issues — most invoices are unpaid or late.',
              'Moderate — some invoices are outstanding or paid late.',
              'Strong — payments are being collected on time.'
            )}`;
          },
          improve: 'Follow up on overdue invoices. Consider early payment discounts or automated reminders.',
          getValue: (d) => {
            const { collection_rate = 0, on_time_rate = 0 } = d.payment_pattern || {};
            return Math.round(collection_rate * 0.6 + on_time_rate * 0.4);
          },
        },
        {
          key: 'pillar_delivery',
          title: 'Delivery',
          what: 'Percentage of service/billing events that are NOT overdue.',
          formula: '(Total Events − Overdue Events) ÷ Total Events × 100',
          interpret: (v, d) => {
            const overdue = d?.events?.overdue || 0;
            const total = d?.events?.total || 0;
            return `${overdue} of ${total} events are overdue. ${pctInterpret(v,
              'Many events are past due — service delivery is at risk.',
              'Some events are overdue — room for improvement.',
              'On track — most events are being fulfilled on schedule.'
            )}`;
          },
          improve: 'Address overdue service events first. Reassign if team capacity is the bottleneck.',
          getValue: (d) => {
            const total = d.events?.total || 0;
            const overdue = d.events?.overdue || 0;
            if (total === 0) return 100;
            return Math.round(((total - overdue) / total) * 100);
          },
        },
        {
          key: 'pillar_engagement',
          title: 'Engagement',
          what: 'How actively this contact relationship is being managed (events scheduled vs overdue).',
          formula: 'Base 40 + (Upcoming Events × 15, max 60) − (Overdue Events × 20, max 60)',
          interpret: (v) => pctInterpret(v,
            'Low engagement — overdue events outweigh upcoming activity.',
            'Moderate — some activity scheduled but overdue items are pulling the score down.',
            'Active — regular upcoming events with few overdue items.'
          ),
          improve: 'Schedule regular service touchpoints. Clear overdue backlog to boost engagement.',
          getValue: (d) => {
            const upcoming = d.upcoming_events?.length || 0;
            const overdue = d.overdue_events?.length || 0;
            if (upcoming === 0 && overdue === 0) return 50;
            const activityScore = Math.min(upcoming * 15, 60);
            const penaltyScore = Math.min(overdue * 20, 60);
            return Math.max(0, Math.min(100, 40 + activityScore - penaltyScore));
          },
        },
        {
          key: 'pillar_growth',
          title: 'Growth',
          what: 'Contract portfolio health — ratio of active contracts and overall volume.',
          formula: '(Active Contracts ÷ Total Contracts × 70) + (Volume Bonus, max 30)',
          interpret: (v, d) => {
            const byStatus = d?.contracts?.by_status || {};
            const total = Object.values(byStatus).reduce((s: number, c) => s + (c as number), 0);
            const active = (byStatus['active'] || 0) + (byStatus['in_progress'] || 0);
            return `${active} of ${total} contracts are active. ${pctInterpret(v,
              'Low — few active contracts relative to total. Consider renewals or new engagements.',
              'Moderate — a fair proportion of contracts are active.',
              'Strong — most contracts are active with good volume.'
            )}`;
          },
          improve: 'Renew expiring contracts. Convert pending acceptances into active contracts.',
          getValue: (d) => {
            const byStatus = d.contracts?.by_status || {};
            const total = Object.values(byStatus).reduce((s: number, c) => s + (c as number), 0);
            const active = (byStatus['active'] || 0) + (byStatus['in_progress'] || 0);
            if (total === 0) return 0;
            const ratioScore = (active / total) * 70;
            const volumeBonus = Math.min(total * 5, 30);
            return Math.round(Math.min(100, ratioScore + volumeBonus));
          },
        },
      ],
    },
    {
      heading: 'Header Metrics',
      entries: [
        {
          key: 'ltv',
          title: 'Lifetime Value (LTV)',
          what: 'Total monetary value of all contracts associated with this contact across all roles (client, vendor, partner).',
          formula: 'Sum of grand_total from all linked contracts',
          interpret: (v) => v === 0
            ? 'No contract value recorded yet.'
            : `Total contract value of ₹${v.toLocaleString()}.`,
          improve: 'Create new contracts or increase scope of existing ones to grow LTV.',
          getValue: (d) => d.ltv || 0,
        },
        {
          key: 'outstanding',
          title: 'Outstanding Amount',
          what: 'Total unpaid balance across all invoices for this contact.',
          formula: 'Sum of (total_amount − amount_paid) for unpaid/overdue invoices',
          interpret: (v) => v === 0
            ? 'All invoices are fully paid — no outstanding balance.'
            : `₹${v.toLocaleString()} is pending collection.`,
          improve: 'Send payment reminders for overdue invoices. Check the Financials tab for details.',
          getValue: (d) => d.outstanding || 0,
        },
      ],
    },
  ],

  // ─── CONTRACTS TAB ───
  contracts: [
    {
      heading: 'Contract Pipeline',
      entries: [
        {
          key: 'contracts_total',
          title: 'Total Contracts',
          what: 'Count of all contracts where this contact appears as buyer, vendor (via CNAK), or partner.',
          formula: 'UNION of buyer contracts + CNAK accessor contracts (deduplicated)',
          interpret: (v) => v === 0
            ? 'No contracts linked to this contact yet.'
            : `${v} contract${v > 1 ? 's' : ''} linked across all roles.`,
          improve: 'Create new contracts from the "New Contract" button above.',
          getValue: (d) => {
            const byStatus = d.contracts?.by_status || {};
            return Object.values(byStatus).reduce((s: number, c) => s + (c as number), 0);
          },
        },
        {
          key: 'contracts_by_role',
          title: 'Role Breakdown',
          what: 'How many contracts this contact has in each role — as Client (buyer), Vendor (seller via CNAK), or Partner.',
          formula: 'Grouped count from buyer_id match + contract_access records',
          interpret: (_v, d) => {
            const byRole = d?.contracts?.by_role || {};
            const parts: string[] = [];
            if (byRole['as_client']) parts.push(`${byRole['as_client']} as Client`);
            if (byRole['as_vendor']) parts.push(`${byRole['as_vendor']} as Vendor`);
            if (byRole['as_partner']) parts.push(`${byRole['as_partner']} as Partner`);
            return parts.length ? parts.join(', ') + '.' : 'No role breakdown available.';
          },
          improve: 'The role filter pills above let you view contracts by role.',
          getValue: (d) => Object.values(d.contracts?.by_role || {}).reduce((s: number, c) => s + (c as number), 0),
        },
      ],
    },
    {
      heading: 'Pipeline Stages',
      entries: [
        {
          key: 'pipeline_status',
          title: 'Status Distribution',
          what: 'Contracts move through stages: Draft → In Review → Pending Acceptance → Active → Completed/Expired.',
          formula: 'Count of contracts grouped by current status',
          interpret: (_v, d) => {
            const bs = d?.contracts?.by_status || {};
            const active = bs['active'] || 0;
            const pending = bs['pending_acceptance'] || 0;
            const draft = bs['draft'] || 0;
            if (pending > 0) return `${pending} contract${pending > 1 ? 's' : ''} awaiting acceptance — follow up to convert.`;
            if (draft > 0) return `${draft} contract${draft > 1 ? 's' : ''} still in draft — review and submit.`;
            if (active > 0) return `${active} active contract${active > 1 ? 's' : ''} running.`;
            return 'No active pipeline. Consider creating new contracts.';
          },
          improve: 'Click pipeline segments to filter. Move drafts to review and pending to active.',
          getValue: (d) => {
            const byStatus = d.contracts?.by_status || {};
            return Object.values(byStatus).reduce((s: number, c) => s + (c as number), 0);
          },
        },
      ],
    },
  ],

  // ─── ASSETS TAB ───
  assets: [
    {
      heading: 'Client Asset Registry',
      entries: [
        {
          key: 'assets_overview',
          title: 'Asset Registry',
          what: 'Equipment, vehicles, software, and other client-owned assets registered for service tracking.',
          formula: 'Assets linked to this contact via contact_id',
          interpret: () => 'Assets are tracked to schedule maintenance, monitor warranty, and assign to service contracts.',
          improve: 'Register client assets using "Add Asset" to enable service event tracking against specific equipment.',
          getValue: () => 0, // Assets loaded separately, not in cockpit
        },
        {
          key: 'asset_criticality',
          title: 'Criticality Levels',
          what: 'Assets are rated Low / Medium / High / Critical based on business impact if they fail.',
          formula: 'Manually assigned during asset registration',
          interpret: () => 'Critical assets should be prioritized for preventive maintenance scheduling.',
          improve: 'Review asset criticality regularly. High-criticality assets should have active service contracts.',
          getValue: () => 0,
        },
      ],
    },
  ],

  // ─── FINANCIALS TAB ───
  financials: [
    {
      heading: 'Payment Health',
      entries: [
        {
          key: 'fin_collection_rate',
          title: 'Collection Rate',
          what: 'Percentage of total invoiced amount that has been actually collected (paid).',
          formula: 'Total Paid ÷ Total Invoiced × 100',
          interpret: (v) => pctInterpret(v,
            'Most invoice value remains uncollected — significant cash flow risk.',
            'Partial collection — some invoices still outstanding.',
            'Strong collection — most invoiced value has been received.'
          ),
          improve: 'Prioritize high-value overdue invoices. Consider partial payment plans for large balances.',
          getValue: (d) => d.payment_pattern?.collection_rate || 0,
        },
        {
          key: 'fin_ontime_rate',
          title: 'On-time Payment Rate',
          what: 'Percentage of invoices that were paid before or on their due date.',
          formula: 'Invoices Paid On Time ÷ Total Invoices × 100',
          interpret: (v) => pctInterpret(v,
            'Most payments are late — consider stricter payment terms or early payment incentives.',
            'Mixed — some payments on time, some late.',
            'Excellent — this contact pays reliably on time.'
          ),
          improve: 'Offer early payment discounts. Send reminder emails 3-5 days before due date.',
          getValue: (d) => d.payment_pattern?.on_time_rate || 0,
        },
      ],
    },
    {
      heading: 'Aging Analysis',
      entries: [
        {
          key: 'fin_aging',
          title: 'Aging Buckets',
          what: 'Groups unpaid invoice balances by how long they\'ve been overdue: Current, 1-30d, 31-60d, 61-90d, 90+d.',
          formula: 'Balance of each unpaid invoice categorized by (today − due_date) in days',
          interpret: (_v, d) => {
            const overdueInvs = d?.invoices?.filter(i => i.status === 'overdue') || [];
            if (overdueInvs.length === 0) return 'No overdue invoices — aging is clean.';
            return `${overdueInvs.length} invoice${overdueInvs.length > 1 ? 's' : ''} are overdue. Older buckets (60d+) need urgent attention.`;
          },
          improve: 'Focus collection efforts on the oldest buckets first (90+d). Escalate if needed.',
          getValue: (d) => d.invoices?.filter(i => i.status === 'overdue').length || 0,
        },
      ],
    },
    {
      heading: 'Revenue Split',
      entries: [
        {
          key: 'fin_receivable_payable',
          title: 'Receivable vs Payable',
          what: 'Receivable = money owed TO you by this contact. Payable = money you OWE to this contact (when they\'re a vendor).',
          formula: 'Sum of invoice totals grouped by invoice_type (receivable/payable)',
          interpret: (_v, d) => {
            const recv = d?.invoices?.filter(i => i.invoice_type === 'receivable').reduce((s, i) => s + i.total_amount, 0) || 0;
            const pay = d?.invoices?.filter(i => i.invoice_type === 'payable').reduce((s, i) => s + i.total_amount, 0) || 0;
            if (recv > pay) return `Net positive — this contact owes you more than you owe them.`;
            if (pay > recv) return `Net negative — you owe this contact more than they owe you.`;
            return 'Balanced — receivables and payables are roughly equal.';
          },
          improve: 'Review the invoice table below for line-by-line details.',
          getValue: () => 0,
        },
      ],
    },
  ],

  // ─── TIMELINE TAB ───
  timeline: [
    {
      heading: 'Event Overview',
      entries: [
        {
          key: 'tl_overdue',
          title: 'Overdue Events',
          what: 'Events that were scheduled in the past but haven\'t been completed or cancelled.',
          formula: 'Events where scheduled_date < today AND status NOT IN (completed, cancelled)',
          interpret: (v) => v === 0
            ? 'All clear — no overdue events.'
            : `${v} event${v > 1 ? 's' : ''} are past due and need action.`,
          improve: 'Complete, reschedule, or cancel overdue events. Each overdue event penalizes the Health Score by 10 points.',
          getValue: (d) => d.events?.overdue || 0,
        },
        {
          key: 'tl_upcoming',
          title: 'Upcoming Events',
          what: 'Events scheduled within the selected look-ahead window (7d / 14d / 30d).',
          formula: 'Events where scheduled_date BETWEEN today AND today + days_ahead',
          interpret: (v) => v === 0
            ? 'No upcoming events in this window. Consider extending the look-ahead.'
            : `${v} event${v > 1 ? 's' : ''} coming up — stay prepared.`,
          improve: 'Use the days-ahead selector (7d/14d/30d) to adjust your planning horizon.',
          getValue: (d) => d.upcoming_events?.length || 0,
        },
      ],
    },
    {
      heading: 'Event Types',
      entries: [
        {
          key: 'tl_service_vs_billing',
          title: 'Service vs Billing Events',
          what: 'Service events = physical work, visits, maintenance. Billing events = invoice milestones, payment due dates.',
          formula: 'Events grouped by event_type field',
          interpret: (_v, d) => {
            const byType = d?.events?.by_type || {};
            const svc = byType['service'] || 0;
            const bill = byType['billing'] || 0;
            return `${svc} service event${svc !== 1 ? 's' : ''} and ${bill} billing event${bill !== 1 ? 's' : ''} across all contracts.`;
          },
          improve: 'Use the type filter pills (Service/Billing) to focus on one category.',
          getValue: (d) => d.events?.total || 0,
        },
      ],
    },
  ],
};
