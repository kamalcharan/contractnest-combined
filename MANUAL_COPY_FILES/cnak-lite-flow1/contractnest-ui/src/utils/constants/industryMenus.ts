// src/utils/constants/industryMenus.ts
import { industries } from '../../lib/constants/industries';

// Menu item interface
export type MenuSection = 'workspace' | 'grow' | 'configure';

/** Capabilities a menu item can require. A tenant that lacks one sees the
    item LOCKED (✦ + cross-sell), never missing — the upsell IS the menu. */
export type FeatureKey =
  | 'rfq' | 'events' | 'registry' | 'finance'
  | 'appointments' | 'groupSessions' | 'catalog' | 'vani';

export type MenuAccess = 'open' | 'locked' | 'hidden';

// Menu item interface
export interface MenuItem {
  id: string;
  label: string;
  icon: string; // Lucide icon name
  path: string;
  adminOnly?: boolean;
  hasSubmenu?: boolean;
  submenuItems?: MenuItem[];
  defaultOpen?: boolean;
  // ── single-menu model (replaces LITE_MENUS) ──
  /** Which group header this sits under. Absent = 'workspace'. */
  section?: MenuSection;
  /** Capability needed to USE it. Absent = always open. */
  requires?: FeatureKey;
  /** Only show on these perspectives. Absent = both. */
  perspectives?: Array<'revenue' | 'expense'>;
  /** Tier wins over the perspective rule (e.g. an RFQ-lite vendor lives on
      revenue but Requests is their entire job). */
  tierOverrides?: Partial<Record<'cnak' | 'rfq', 'open' | 'hidden'>>;
  /** Which LITE_CROSS_SELL entry the ✦ modal shows when locked. */
  copyKey?: string;
  /** Visual emphasis, like VaNi's purple treatment. */
  highlight?: 'vani' | 'brand';
}

export const defaultMenuItems: MenuItem[] = [
  {
    id: 'getting-started',
    label: 'Getting Started',
    icon: 'Compass',
    path: '/onboarding/welcome',
    section: 'workspace'
  },
  // ── YOUR WORKSPACE ──────────────────────────────────────────────
  { id: 'ops-cockpit', label: 'Dashboard', icon: 'Gauge', path: '/ops/cockpit', section: 'workspace' },
  { id: 'contracts', label: 'Contracts', icon: 'FileText', path: '/contracts', section: 'workspace' },
  {
    // Highlighted like VaNi — claiming a CNAK is how a contract ARRIVES,
    // and it is the one action a brand-new tenant most often needs.
    id: 'contracts-claim',
    label: 'Claim Contract',
    icon: 'Download',
    path: '/contracts/claim',
    section: 'workspace',
    highlight: 'brand'
  },
  {
    // Sending an RFQ is a buyer action → expense side. An RFQ-lite vendor
    // lives on revenue but RECEIVES requests, so the tier overrides that.
    id: 'requests',
    label: 'Requests',
    icon: 'Inbox',
    path: '/requests',
    section: 'workspace',
    perspectives: ['expense'],
    tierOverrides: { rfq: 'open' },
    requires: 'rfq',
    copyKey: 'rfq'
  },
  { id: 'ops-services', label: 'Service Events', icon: 'CalendarClock', path: '/ops/services', section: 'workspace', requires: 'events', copyKey: 'events' },
  { id: 'ops-appointments', label: 'Appointments', icon: 'CalendarCheck', path: '/ops/appointments', section: 'workspace', requires: 'appointments', copyKey: 'appointments' },
  { id: 'ops-group-sessions', label: 'Group Sessions', icon: 'Users', path: '/group-sessions', section: 'workspace', requires: 'groupSessions', copyKey: 'group-sessions' },
  { id: 'entities', label: 'Contacts', icon: 'Building2', path: '/contacts', section: 'workspace' },
  { id: 'equipment-registry', label: 'Equipment Registry', icon: 'Wrench', path: '/equipment-registry', section: 'workspace', requires: 'registry', copyKey: 'registry' },
  { id: 'facility-registry', label: 'Facility Registry', icon: 'Landmark', path: '/facility-registry', section: 'workspace', requires: 'registry', copyKey: 'registry' },
  { id: 'ops-finance', label: 'Finance (AR/AP)', icon: 'Wallet', path: '/ops/finance', section: 'workspace', requires: 'finance', copyKey: 'finance' },

  // ── GROW WITH CONTRACTNEST ──────────────────────────────────────
  { id: 'catalog-studio', label: 'Catalog Studio', icon: 'Layers', path: '/catalog-studio/configure', section: 'grow', requires: 'catalog', copyKey: 'catalog' },
  { id: 'vani', label: 'VaNi', icon: 'Sparkles', path: '/vani/landing', section: 'grow', requires: 'vani', highlight: 'vani' },
  // HIDDEN (owner call 2026-08-03): "VaNi (old)" — 12 reference/mock pages.
  // Routes and files untouched; simply no longer in the menu.

  // ── CONFIGURE ───────────────────────────────────────────────────
  { id: 'settings', label: 'Settings', icon: 'Settings', path: '/settings', section: 'configure' },

  // ── ADMIN (unchanged — rendered by the Sidebar's separate admin block) ──
  // UPDATED: Implementation Toolkit - updated paths for service-contracts structure
  // REMOVED: plan-detail, plan-versions, subscription-management submenus
  // REMOVED: user-management and analytics menu items (moved under toolkit or removed)
  {
    id: 'implementation-toolkit',
    label: 'Implementation Toolkit',
    icon: 'Tool',
    path: '/implementation',
    adminOnly: true,
    hasSubmenu: true,
    defaultOpen: true, // Implementation Toolkit should be open by default
    submenuItems: [
      {
        id: 'global-templates',
        label: 'Global Templates',
        icon: 'FileText',
        path: '/service-contracts/templates/admin/global-templates'
      },
      {
        id: 'global-template-designer',
        label: 'Global Template Designer',
        icon: 'Edit',
        path: '/service-contracts/templates/admin/global-designer'
      },
      {
        id: 'template-analytics',
        label: 'Template Analytics',
        icon: 'BarChart',
        path: '/service-contracts/templates/admin/analytics'
      },
      {
        id: 'configure-plan',
        label: 'Configure Plan',
        icon: 'Settings',
        path: '/settings/businessmodel/admin/pricing-plans'
      },
      {
        id: 'subscription-dashboard',
        label: 'Subscription Dashboard',
        icon: 'BarChart',
        path: '/admin/subscription-management'
      },
      {
        id: 'billing-dashboard',
        label: 'Billing Dashboard',
        icon: 'CreditCard',
        path: '/settings/businessmodel/admin/billing'
      },
      {
        id: 'tenant-profiles',
        label: 'Group Member Profiles',
        icon: 'Users',
        path: '/vani/tenant-profiles'
      },
      {
        id: 'bbb-admin',
        label: 'BBB Admin',
        icon: 'Shield',
        path: '/vani/channels/bbb/admin'
      },
      {
        id: 'product-masters',
        label: 'Product Masters',
        icon: 'Package',
        path: '/vani/toolkit/product-masters'
      }
    ]
  },
  // JTD Admin — Release 1 (Observability)
  {
    id: 'jtd-admin',
    label: 'JTD Admin',
    icon: 'Activity',
    path: '/admin/jtd',
    adminOnly: true,
    hasSubmenu: true,
    defaultOpen: false,
    submenuItems: [
      {
        id: 'jtd-queue',
        label: 'Queue Monitor',
        icon: 'ListOrdered',
        path: '/admin/jtd/queue'
      },
      {
        id: 'jtd-tenants',
        label: 'Tenant Operations',
        icon: 'Building2',
        path: '/admin/jtd/tenants'
      },
      {
        id: 'jtd-events',
        label: 'Event Explorer',
        icon: 'Search',
        path: '/admin/jtd/events'
      },
      {
        id: 'jtd-worker',
        label: 'Worker Health',
        icon: 'HeartPulse',
        path: '/admin/jtd/worker'
      },
      {
        id: 'jtd-templates',
        label: 'Template Mapping',
        icon: 'FileText',
        path: '/admin/jtd/templates'
      }
    ]
  },
  // Smart Forms Admin — Form Template Management
  {
    id: 'smart-forms-admin',
    label: 'Smart Forms',
    icon: 'FileText',
    path: '/admin/smart-forms',
    adminOnly: true,
    hasSubmenu: false,
    defaultOpen: false,
  }
];

// Industry-specific menu overrides - UPDATED template paths
export const industryMenuOverrides: Record<string, Partial<Record<string, { label: string, icon?: string }>>> = {
  healthcare: {
    // HIDDEN: Contacts menu overrides - contacts menu hidden
    // contacts: { label: 'Patients & Staff', icon: 'Users' },
    // 'contacts-buyers': { label: 'Patients', icon: 'Users' },
    // 'contacts-partners': { label: 'Medical Partners', icon: 'Stethoscope' },
    // 'contacts-service-providers': { label: 'Healthcare Providers', icon: 'UserCheck' },
    contracts: { label: 'Care Packages', icon: 'Stethoscope' },
    'contracts-create': { label: 'Create Care Package', icon: 'FilePlus' },
    templates: { label: 'Care Templates', icon: 'FileTemplate' },
    'my-templates': { label: 'My Care Templates', icon: 'FolderOpen' },
    'template-designer': { label: 'Care Template Designer', icon: 'Edit' },
    appointments: { label: 'Patient Appointments', icon: 'Stethoscope' },
    'implementation-toolkit': { label: 'Clinical Implementation Tools', icon: 'Stethoscope' }
  },
  financial_services: {
    // HIDDEN: Contacts menu overrides - contacts menu hidden
    // contacts: { label: 'Clients & Partners', icon: 'Users' },
    // 'contacts-buyers': { label: 'Clients', icon: 'DollarSign' },
    // 'contacts-partners': { label: 'Financial Partners', icon: 'Handshake' },
    // 'contacts-service-providers': { label: 'Service Providers', icon: 'Building2' },
    contracts: { label: 'Financial Agreements', icon: 'DollarSign' },
    'contracts-create': { label: 'Create Agreement', icon: 'FilePlus' },
    templates: { label: 'Agreement Templates', icon: 'FileTemplate' },
    'my-templates': { label: 'My Agreement Templates', icon: 'FolderOpen' },
    'template-designer': { label: 'Agreement Designer', icon: 'Edit' },
    appointments: { label: 'Client Meetings', icon: 'Calendar' },
    'implementation-toolkit': { label: 'Financial Implementation Suite', icon: 'DollarSign' }
  },
  education: {
    // HIDDEN: Contacts menu overrides - contacts menu hidden
    // contacts: { label: 'Students & Faculty', icon: 'Users' },
    // 'contacts-buyers': { label: 'Students', icon: 'GraduationCap' },
    // 'contacts-partners': { label: 'Education Partners', icon: 'Handshake' },
    // 'contacts-service-providers': { label: 'Faculty & Staff', icon: 'UserCheck' },
    contracts: { label: 'Learning Programs', icon: 'GraduationCap' },
    'contracts-create': { label: 'Create Program', icon: 'FilePlus' },
    templates: { label: 'Program Templates', icon: 'FileTemplate' },
    'my-templates': { label: 'My Program Templates', icon: 'FolderOpen' },
    'template-designer': { label: 'Program Designer', icon: 'Edit' },
    appointments: { label: 'Sessions', icon: 'Calendar' },
    'implementation-toolkit': { label: 'Education Implementation Tools', icon: 'GraduationCap' }
  },
  construction: {
    // HIDDEN: Contacts menu overrides - contacts menu hidden
    // contacts: { label: 'Contractors & Clients', icon: 'Users' },
    // 'contacts-buyers': { label: 'Clients', icon: 'Building2' },
    // 'contacts-partners': { label: 'Construction Partners', icon: 'Handshake' },
    // 'contacts-service-providers': { label: 'Contractors', icon: 'Hammer' },
    contracts: { label: 'Project Contracts', icon: 'Hammer' },
    'contracts-create': { label: 'Create Project Contract', icon: 'FilePlus' },
    templates: { label: 'Project Templates', icon: 'FileTemplate' },
    'my-templates': { label: 'My Project Templates', icon: 'FolderOpen' },
    'template-designer': { label: 'Project Designer', icon: 'Edit' },
    appointments: { label: 'Site Visits', icon: 'MapPin' },
    'implementation-toolkit': { label: 'Construction Implementation Kit', icon: 'Hammer' }
  }
};

// Get industry-specific menu items (keeping original function signature)
export const getMenuItemsForIndustry = (industryId: string | undefined): MenuItem[] => {
  if (!industryId) return defaultMenuItems;

  // Start with the default menu items
  const menuItems = [...defaultMenuItems];

  // Apply industry-specific overrides if they exist
  const overrides = industryMenuOverrides[industryId];
  if (overrides) {
    menuItems.forEach(item => {
      const override = overrides[item.id];
      if (override) {
        item.label = override.label || item.label;
        item.icon = override.icon || item.icon;
      }

      // Also check submenu items
      if (item.hasSubmenu && item.submenuItems) {
        item.submenuItems.forEach(subItem => {
          const subOverride = overrides[subItem.id];
          if (subOverride) {
            subItem.label = subOverride.label || subItem.label;
            subItem.icon = subOverride.icon || subItem.icon;
          }
        });
      }
    });
  }

  return menuItems;
};


// ═══════════════════════════════════════════════════════════════════
// ACCESS — the ONE place that decides whether a menu item is usable,
// locked (✦ upsell) or hidden. Replaces the four mechanisms that used
// to be spread across Sidebar + liteAccess (lite branch, reveal rules,
// perspective checks, adminOnly).
// ═══════════════════════════════════════════════════════════════════

export type LiteTier = 'cnak' | 'rfq' | null;

/** Capabilities each lite tier has OPEN. Everything else renders locked.
    A full tenant (tier === null) has every capability. */
const LITE_OPEN_FEATURES: Record<'cnak' | 'rfq', FeatureKey[]> = {
  // Lite BUYER: a contract arrived via CNAK. They can run it and track the
  // assets it covers — but not raise RFQs, run finance, or book sessions.
  cnak: ['events', 'registry'],
  // Lite SELLER: quoting the request they received is the whole job.
  rfq: ['rfq'],
};

export interface MenuAccessContext {
  tier: LiteTier;
  perspective: 'revenue' | 'expense';
  /** Progressive-disclosure result for this item id (existing reveal rules). */
  revealed?: boolean;
}

export function getMenuAccess(item: MenuItem, ctx: MenuAccessContext): MenuAccess {
  // 1. Progressive disclosure still wins — not yet earned means not shown.
  if (ctx.revealed === false) return 'hidden';

  // 2. Tier override beats the perspective rule (RFQ-lite vendor lives on
  //    revenue, but Requests is precisely what they are here for).
  const override = item.tierOverrides && ctx.tier ? item.tierOverrides[ctx.tier] : undefined;
  if (override === 'hidden') return 'hidden';

  // 3. Perspective gate (unless a tier override already said 'open').
  if (override !== 'open' && item.perspectives && !item.perspectives.includes(ctx.perspective)) {
    return 'hidden';
  }

  // 4. Capability → open or locked. No requirement means always open.
  if (!item.requires) return 'open';
  if (!ctx.tier) return 'open'; // full tenant
  return LITE_OPEN_FEATURES[ctx.tier].includes(item.requires) ? 'open' : 'locked';
}
