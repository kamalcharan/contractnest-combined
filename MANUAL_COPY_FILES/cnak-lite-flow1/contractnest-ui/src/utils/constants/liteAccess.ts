// src/utils/constants/liteAccess.ts
//
// CNAK/RFQ-lite access map — THE single source of truth for what a lite
// tenant sees and can do. Everything lite reads from here:
//   * Sidebar        → LITE_MENUS (workspace items + ✦ "Grow with ContractNest")
//   * LiteRouteGate  → LITE_RESTRICTED_ROUTES (deep links land on the
//                      problem-led restricted page, not the real feature)
//   * Settings page  → LITE_RESTRICTED_SETTINGS (✦ TRIAL tiles open the modal)
//   * Cross-sell UI  → LITE_CROSS_SELL copy registry (one modal, N configs)
//   * Feature gates  → LITE_CAPABILITIES (create-contract / create-RFQ / etc.)
//
// COPY RULE (owner, 2026-08-02): never explain the feature — QUESTION the
// problem, then show the value OUTCOME. Feature names stay out of the pitch.
//
// The tier itself ('cnak' buyer-side, 'rfq' seller-side) is derived in
// AuthContext from t_tenant_onboarding (onboarding_type + is_completed) —
// see LiteTier there. Completing lite onboarding clears the tier and this
// entire file stops applying. Trial framing ("first 3 contracts are free")
// is COPY ONLY for now — metering is future billing work.

export type LiteFlavor = 'cnak' | 'rfq';

// ─────────────────────────────────────────────────────────────────────────
// Cross-sell copy registry — {icon, question, outcomes[3]} per surface.
// Keys are `${flavor}:${key}`; shared settings keys are flavor-agnostic.
// ─────────────────────────────────────────────────────────────────────────
export interface LiteCrossSellOutcome {
  title: string;
  detail: string;
}

export interface LiteCrossSellCopy {
  icon: string; // Lucide icon name
  question: string;
  context?: string; // optional supporting line under the question (page state)
  outcomes: [LiteCrossSellOutcome, LiteCrossSellOutcome, LiteCrossSellOutcome];
}

const CROSS_SELL: Record<string, LiteCrossSellCopy> = {
  // ── Buyer (cnak) page surfaces ──────────────────────────────────────
  'cnak:rfq': {
    icon: 'Send',
    question: 'Still collecting vendor quotes over three phone calls and a WhatsApp group?',
    context: 'When you ask vendors for a price — who keeps the quotes comparable, the scope identical, and the decision on record?',
    outcomes: [
      { title: 'One link, every vendor', detail: 'the same scope goes to all of them — no retyping per vendor' },
      { title: 'Quotes side by side', detail: 'compare like-for-like, not screenshot vs. PDF' },
      { title: 'Award becomes a contract', detail: "the winner's quote turns into a tracked contract" }
    ]
  },
  'cnak:finance': {
    icon: 'Wallet',
    question: "Do you know exactly what you'll owe next month?",
    context: 'AMCs, rentals, installments — every one has a due date and a vendor. Right now they live in files and reminders that never fire.',
    outcomes: [
      { title: 'Every due date, one screen', detail: 'nothing surprises you on the 1st' },
      { title: 'No accidental renewals', detail: 'expiring contracts flagged weeks ahead — renegotiate on your terms' },
      { title: 'Pay with proof', detail: 'every payment sits against its contract and its completed service visit' }
    ]
  },
  'cnak:appointments': {
    icon: 'CalendarCheck',
    question: 'Vendor visits happening whenever someone remembers to call?',
    outcomes: [
      { title: 'Booked slots, not phone tag', detail: 'visits land on a calendar both sides can see' },
      { title: 'Reminders go both ways', detail: 'you and the vendor both know who is coming, and when' },
      { title: 'No-shows become visible', detail: 'missed visits are on record, not in memory' }
    ]
  },
  'cnak:group-sessions': {
    icon: 'Users',
    question: 'Managing group schedules on a paper register?',
    outcomes: [
      { title: 'Sessions & rosters in one place', detail: 'who attends what, without the register' },
      { title: 'Check-ins tracked', detail: 'attendance recorded as it happens' },
      { title: 'Dues chase themselves', detail: 'pending payments surface automatically' }
    ]
  },
  'cnak:contract-create': {
    icon: 'FileText',
    question: 'Ready to run your own contracts — not just receive them?',
    context: 'This contract came to you through ContractNest. Your own customers could be receiving yours the same way.',
    outcomes: [
      { title: 'Create and send in minutes', detail: 'structured contracts with your services and terms' },
      { title: 'Your catalog, your pricing', detail: 'price once, reuse on every contract' },
      { title: 'Get paid on time', detail: 'billing schedules and reminders generated from day one' }
    ]
  },

  // ── Seller (rfq) page surfaces ──────────────────────────────────────
  'rfq:finance': {
    icon: 'Wallet',
    question: 'Still chasing payments on WhatsApp and a notebook?',
    context: 'When a quote turns into work — who tracks what they owe you, when it is due, and what is already paid?',
    outcomes: [
      { title: 'Every rupee visible', detail: 'who owes what, due when — one screen' },
      { title: 'Reminders send themselves', detail: "dues chase themselves, you don't" },
      { title: 'Receipts in seconds', detail: 'numbered, recorded, done' }
    ]
  },
  'rfq:events': {
    icon: 'CalendarClock',
    question: "Do your service visits live in someone's head?",
    outcomes: [
      { title: 'Every visit on the calendar', detail: 'generated automatically from each contract you win' },
      { title: 'Nothing slips', detail: 'due today, overdue, upcoming — one glance' },
      { title: 'Proof for every job', detail: 'completed visits recorded against the contract, ready for billing' }
    ]
  },
  'rfq:catalog': {
    icon: 'LayoutGrid',
    question: 'Quoting from memory, every single time?',
    outcomes: [
      { title: 'Price once, reuse forever', detail: 'your services with market-reference rates, ready for any quote' },
      { title: 'Quotes in minutes, not evenings', detail: 'the next RFQ answered before your competitor opens Excel' },
      { title: 'Nothing forgotten', detail: 'checkpoints and service cycles built into every line' }
    ]
  },
  'rfq:registry': {
    icon: 'Wrench',
    question: "Your customers' equipment — tracked where?",
    outcomes: [
      { title: 'Every asset, per customer', detail: 'what you maintain, where it sits, what it needs' },
      { title: 'History follows the asset', detail: 'every visit and part changed — on the asset, not in a file' },
      { title: 'Renewals surface themselves', detail: 'expiring AMCs become next quarter’s pipeline' }
    ]
  },
  'rfq:appointments': {
    icon: 'CalendarCheck',
    question: 'Bookings still bouncing between phone calls?',
    outcomes: [
      { title: 'Slots customers book themselves', detail: 'no back-and-forth to find a time' },
      { title: 'Reminders cut no-shows', detail: 'both sides know who is coming, and when' },
      { title: 'One day view for the team', detail: 'everyone sees the same schedule' }
    ]
  },
  'rfq:group-sessions': {
    icon: 'Users',
    question: 'Running group sessions from a paper register?',
    outcomes: [
      { title: 'Rosters & schedules in one place', detail: 'who attends what, without the register' },
      { title: 'Check-ins via QR', detail: 'members check themselves in as they arrive' },
      { title: 'Dues chase themselves', detail: 'pending payments surface automatically' }
    ]
  },

  // ── Settings tiles (shared across flavors) ─────────────────────────
  'settings:resources': {
    icon: 'Users',
    question: 'Who does what — still decided in the morning huddle?',
    outcomes: [
      { title: 'Team & equipment mapped to jobs', detail: 'the right resource on the right visit' },
      { title: 'Assignments suggest themselves', detail: 'availability and skill considered for you' },
      { title: 'Utilization becomes visible', detail: 'see who is stretched and what sits idle' }
    ]
  },
  'settings:automation': {
    icon: 'Zap',
    question: 'Still remembering to remind people?',
    outcomes: [
      { title: 'Reminders send themselves', detail: 'dues, visits and renewals — on schedule, every time' },
      { title: 'Invoice drafts appear on time', detail: 'billing events become drafts without you typing' },
      { title: 'Rules run while you sleep', detail: 'standing instructions VaNi executes for you' }
    ]
  },
  'settings:integrations': {
    icon: 'Plug',
    question: 'Updates typed out one WhatsApp at a time?',
    outcomes: [
      { title: 'Email, WhatsApp & SMS built in', detail: 'messages go from the platform, not your thumb' },
      { title: 'Every message on record', detail: 'what was sent, to whom, and when' },
      { title: 'Templates, not typing', detail: 'consistent, professional, instant' }
    ]
  },
  'settings:storage': {
    icon: 'Database',
    question: 'Contracts in one drive, photos in another?',
    outcomes: [
      { title: 'Documents live on the contract', detail: 'agreements, annexures and proofs in context' },
      { title: 'Visit photos attach to visits', detail: 'proof of work exactly where you look for it' },
      { title: 'One search finds it', detail: 'no more "which folder was that in?"' }
    ]
  },
  'settings:sequence': {
    icon: 'Hash',
    question: 'Invoice numbers from a diary page?',
    outcomes: [
      { title: 'Clean numbered series', detail: 'contracts, invoices and receipts — no gaps, no repeats' },
      { title: 'Documents look professional', detail: 'your formats, your prefixes' },
      { title: 'Audit-ready by default', detail: 'a trail your accountant will thank you for' }
    ]
  },
  'settings:smart-profile': {
    icon: 'Brain',
    question: 'Does your business story live only in your head?',
    outcomes: [
      { title: 'A profile built by AI', detail: 'your services, strengths and story — structured' },
      { title: 'Better suggestions everywhere', detail: 'the platform quotes and drafts the way you would' },
      { title: 'Ready for every proposal', detail: 'introduce your business without rewriting it each time' }
    ]
  }
};

// Fallback for a restricted surface with no specific copy (should not
// happen, but a gate must never crash on a missing key).
const GENERIC_COPY: LiteCrossSellCopy = {
  icon: 'Sparkles',
  question: 'Running this part of your business by memory?',
  outcomes: [
    { title: 'Everything in one place', detail: 'contracts, visits, payments — connected' },
    { title: 'Nothing slips', detail: 'due dates and follow-ups surface themselves' },
    { title: 'Set up in ~6 minutes', detail: 'VaNi walks you through it' }
  ]
};

export function getLiteCrossSellCopy(flavor: LiteFlavor, key: string): LiteCrossSellCopy {
  return CROSS_SELL[`${flavor}:${key}`] || CROSS_SELL[`settings:${key}`] || GENERIC_COPY;
}

// ─────────────────────────────────────────────────────────────────────────
// Lite sidebar menus — flat "Your workspace" + ✦ "Grow with ContractNest".
// Restricted entries NAVIGATE normally; LiteRouteGate intercepts the route
// and renders the problem-led restricted page (so deep links behave
// identically to menu clicks).
// ─────────────────────────────────────────────────────────────────────────
export interface LiteMenuEntry {
  id: string;
  label: string;
  icon: string; // Lucide icon name
  path: string;
  copyKey?: string; // for grow items — which cross-sell copy the page shows
}

export interface LiteMenuConfig {
  workspace: LiteMenuEntry[];
  grow: LiteMenuEntry[];
}

export const LITE_MENUS: Record<LiteFlavor, LiteMenuConfig> = {
  // Lite BUYER (came in via a CNAK contract) — expense world
  cnak: {
    workspace: [
      { id: 'lite-dashboard', label: 'Dashboard', icon: 'Gauge', path: '/ops/cockpit' },
      { id: 'lite-contracts', label: 'Contracts', icon: 'FileText', path: '/contracts' },
      { id: 'lite-claim', label: 'Claim a Contract', icon: 'KeyRound', path: '/contracts/claim' },
      { id: 'lite-service-events', label: 'Service Events', icon: 'CalendarClock', path: '/ops/services' },
      { id: 'lite-contacts', label: 'Contacts', icon: 'Building2', path: '/contacts' },
      { id: 'lite-equipment-registry', label: 'Equipment Registry', icon: 'Wrench', path: '/equipment-registry' },
      { id: 'lite-facility-registry', label: 'Facility Registry', icon: 'Landmark', path: '/facility-registry' }
    ],
    grow: [
      { id: 'lite-rfq', label: 'RFQs to Vendors', icon: 'Send', path: '/contracts/rfq/new', copyKey: 'rfq' },
      { id: 'lite-finance', label: 'Finance · Payables', icon: 'Wallet', path: '/ops/finance', copyKey: 'finance' },
      { id: 'lite-appointments', label: 'Appointments', icon: 'CalendarCheck', path: '/ops/appointments', copyKey: 'appointments' },
      { id: 'lite-group-sessions', label: 'Group Sessions', icon: 'Users', path: '/group-sessions', copyKey: 'group-sessions' }
    ]
  },
  // Lite SELLER (came in via an RFQ hand-off) — revenue world
  rfq: {
    workspace: [
      { id: 'lite-dashboard', label: 'Dashboard', icon: 'Gauge', path: '/ops/cockpit' },
      { id: 'lite-contracts', label: 'Contracts', icon: 'FileText', path: '/contracts' },
      { id: 'lite-contacts', label: 'Contacts', icon: 'Building2', path: '/contacts' }
    ],
    grow: [
      { id: 'lite-finance', label: 'Finance · AR/AP', icon: 'Wallet', path: '/ops/finance', copyKey: 'finance' },
      { id: 'lite-events', label: 'Event Schedule', icon: 'CalendarClock', path: '/ops/services', copyKey: 'events' },
      { id: 'lite-catalog', label: 'Catalog Studio', icon: 'LayoutGrid', path: '/catalog-studio/configure', copyKey: 'catalog' },
      { id: 'lite-equipment-registry', label: 'Equipment Registry', icon: 'Wrench', path: '/equipment-registry', copyKey: 'registry' },
      { id: 'lite-facility-registry', label: 'Facility Registry', icon: 'Landmark', path: '/facility-registry', copyKey: 'registry' },
      { id: 'lite-appointments', label: 'Appointments', icon: 'CalendarCheck', path: '/ops/appointments', copyKey: 'appointments' },
      { id: 'lite-group-sessions', label: 'Group Sessions', icon: 'Users', path: '/group-sessions', copyKey: 'group-sessions' }
    ]
  }
};

// ─────────────────────────────────────────────────────────────────────────
// Restricted ROUTES per flavor — ordered [prefix, copyKey]; first match
// wins, so keep more-specific prefixes above shorter ones.
// ─────────────────────────────────────────────────────────────────────────
type RestrictedRoute = [prefix: string, copyKey: string];

// Settings routes restricted for BOTH flavors (owner's access list).
const RESTRICTED_SETTINGS_ROUTES: RestrictedRoute[] = [
  ['/settings/configure/resources', 'resources'],
  ['/settings/configure/automation-rules', 'automation'],
  ['/settings/integrations', 'integrations'],
  ['/settings/configure/channels', 'integrations'],
  ['/settings/storage', 'storage'],
  ['/settings/sequencing', 'sequence'],
  ['/settings/business-profile/smart-profile', 'smart-profile']
];

export const LITE_RESTRICTED_ROUTES: Record<LiteFlavor, RestrictedRoute[]> = {
  cnak: [
    // creation surfaces a lite buyer does not get (view/accept stays open)
    ['/contracts/rfq', 'rfq'],
    ['/contracts/create', 'contract-create'],
    ['/contracts/invite', 'contract-create'],
    ['/ops/finance', 'finance'],
    ['/ops/appointments', 'appointments'],
    ['/appointments', 'appointments'],
    ['/group-sessions', 'group-sessions'],
    ['/session-checkin', 'group-sessions'],
    ['/catalog-studio', 'catalog'],
    ['/catalog', 'catalog'],
    ...RESTRICTED_SETTINGS_ROUTES
  ],
  rfq: [
    // a lite seller's whole purpose is raising the contract — creation open
    ['/contracts/rfq', 'rfq'],
    ['/ops/finance', 'finance'],
    ['/ops/services', 'events'],
    ['/ops/appointments', 'appointments'],
    ['/appointments', 'appointments'],
    ['/group-sessions', 'group-sessions'],
    ['/session-checkin', 'group-sessions'],
    ['/catalog-studio', 'catalog'],
    ['/catalog', 'catalog'],
    ['/equipment-registry', 'registry'],
    ['/facility-registry', 'registry'],
    ...RESTRICTED_SETTINGS_ROUTES
  ]
};

// Returns the copy key when the path is restricted for this flavor, else null.
export function getLiteRestriction(flavor: LiteFlavor, pathname: string): string | null {
  const match = LITE_RESTRICTED_ROUTES[flavor].find(([prefix]) => pathname.startsWith(prefix));
  return match ? match[1] : null;
}

// ─────────────────────────────────────────────────────────────────────────
// Settings tiles — ids from settingsMenus.ts. Restricted tiles show a
// ✦ TRIAL badge and open the cross-sell modal instead of navigating.
// Same map for both flavors (owner specified one list).
// ─────────────────────────────────────────────────────────────────────────
export const LITE_RESTRICTED_SETTINGS: Record<string, string> = {
  'resources': 'resources',
  'vani-group': 'automation',
  'vani-automation-rules': 'automation',
  'api-integrations': 'integrations',
  'storage-space': 'storage',
  'storage-management': 'storage',
  'customer-channels': 'integrations',
  'sms': 'integrations',
  'email': 'integrations',
  'whatsapp': 'integrations',
  'sequence-numbers': 'sequence',
  'smart-profile': 'smart-profile'
};

// ─────────────────────────────────────────────────────────────────────────
// Capability flags — for in-page gates (buttons, actions).
// ─────────────────────────────────────────────────────────────────────────
export interface LiteCapabilities {
  canCreateContract: boolean;
  canCreateRfq: boolean;
  canCreateInvoice: boolean;
  canCreateContact: boolean;
  canActionServiceEvents: boolean;
}

export const LITE_CAPABILITIES: Record<LiteFlavor, LiteCapabilities> = {
  cnak: {
    canCreateContract: false,
    canCreateRfq: false,
    canCreateInvoice: false,
    canCreateContact: true,
    canActionServiceEvents: true
  },
  rfq: {
    canCreateContract: true, // raising the contract IS the lite seller's job
    canCreateRfq: false,
    canCreateInvoice: false,
    canCreateContact: true,
    canActionServiceEvents: true
  }
};

// Trial copy shown on the sidebar bar, restricted pages and the modal.
export const LITE_TRIAL = {
  strip: 'Your first 3 contracts are free — full workspace, no card.',
  cta: 'Start free trial',
  fine: '~6-minute setup with VaNi · no card required',
  // Where every trial CTA goes: the express (lite) onboarding. Completing it
  // flips is_completed=true, which clears the tier — that IS the upgrade.
  route: '/start'
};

// ─────────────────────────────────────────────────────────────────────────
// Walkover (first-visit guided tour) — steps per flavor. Each step targets
// a [data-walkover="<target>"] element; LiteWalkover skips any step whose
// target isn't in the DOM (collapsed sidebar, empty registry card, etc.),
// so this list is the superset. Same copy rule as everything lite: talk
// about THEIR world, not our features.
// ─────────────────────────────────────────────────────────────────────────
export interface LiteWalkoverStep {
  target: string; // data-walkover attribute value
  title: string;
  body: string;
}

export const LITE_WALKOVER_VERSION = 1; // bump to re-show the tour after big changes

export const LITE_WALKOVER: Record<LiteFlavor, LiteWalkoverStep[]> = {
  cnak: [
    {
      target: 'stats',
      title: 'Your contract, at a glance',
      body: 'Everything from the contract you claimed — next service visit, dues this month, total value — stays current here without you chasing anyone.'
    },
    {
      target: 'needs-you',
      title: 'What needs you',
      body: 'Upcoming service visits and payments from your contracts, in date order. When something is due or overdue, it shows up here first.'
    },
    {
      target: 'registry',
      title: 'The assets behind this contract',
      body: 'Your vendor listed the equipment this contract covers. Add them to your own registry in one tap — service history and expiry tracking start from there.'
    },
    {
      target: 'nav-workspace',
      title: 'Your workspace',
      body: 'Contracts, service events, contacts and your registries — everything unlocked for you lives here.'
    },
    {
      target: 'claim',
      title: 'Got another contract code?',
      body: 'Any vendor on ContractNest can hand you a CNAK code. Claim it here and it joins this same dashboard.'
    },
    {
      target: 'nav-grow',
      title: 'When you want more',
      body: 'The ✦ items — vendor RFQs, payables, appointments — show you what they solve before you switch anything on.'
    },
    {
      target: 'trial',
      title: 'Your first 3 contracts are free',
      body: 'When you are ready to run your own contracts, a ~6-minute setup with VaNi opens the full workspace. No card needed.'
    }
  ],
  rfq: [
    {
      target: 'stats',
      title: 'Your work, at a glance',
      body: 'The contracts you have won — next visits, billing due, total value — tracked here without a notebook.'
    },
    {
      target: 'needs-you',
      title: 'What needs you',
      body: 'Service visits and payments from your contracts, in date order. Due or overdue — it surfaces here first.'
    },
    {
      target: 'nav-workspace',
      title: 'Your workspace',
      body: 'Your contracts and contacts live here — everything already unlocked for you.'
    },
    {
      target: 'nav-grow',
      title: 'When you want more',
      body: 'The ✦ items — finance, catalog, registries — show you what they solve before you switch anything on.'
    },
    {
      target: 'trial',
      title: 'Your first 3 contracts are free',
      body: 'A ~6-minute setup with VaNi opens the full workspace. No card needed.'
    }
  ]
};
