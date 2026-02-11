// src/utils/constants/industryMenus.ts
import { industries } from '../../lib/constants/industries';

// Menu item interface
export interface MenuItem {
  id: string;
  label: string;
  icon: string; // Lucide icon name
  path: string;
  adminOnly?: boolean;
  hasSubmenu?: boolean;
  submenuItems?: MenuItem[];
  defaultOpen?: boolean; // For submenus that should be open by default
}

// Default menu structure
export const defaultMenuItems: MenuItem[] = [
{
  id: 'getting-started',
  label: 'Getting Started',
  icon: 'Compass',
  path: '/onboarding/welcome',
  hasSubmenu: false
},
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: 'Home',
    path: '/dashboard',
    hasSubmenu: false
  },
  // Operations menu - moved after Dashboard for better UX
  {
    id: 'operations',
    label: 'Operations',
    icon: 'Activity',
    path: '/ops/cockpit',
    hasSubmenu: true,
    submenuItems: [
      { id: 'ops-cockpit', label: 'Ops Cockpit', icon: 'Gauge', path: '/ops/cockpit' },
      { id: 'entities', label: 'Contacts', icon: 'Building2', path: '/contacts' },
      { id: 'equipment-registry', label: 'Equipment Registry', icon: 'Wrench', path: '/settings/configure/equipment' },
      { id: 'ops-activity', label: 'Activity Feed', icon: 'Activity', path: '/ops/activity' }
      // HIDDEN: Reports - commented out
      // { id: 'ops-reports', label: 'Reports', icon: 'BarChart2', path: '/ops/reports' }
    ]
  },
  // REMOVED: Contacts menu - now available under Operations > Entities
  /*
  {
    id: 'contacts',
    label: 'Contacts',
    icon: 'Users',
    path: '/contacts',
    hasSubmenu: true,
    submenuItems: [
      {
        id: 'contacts-all',
        label: 'All Contacts',
        icon: 'Users',
        path: '/contacts'
      },
      {
        id: 'contacts-buyers',
        label: 'Buyers',
        icon: 'ShoppingCart',
        path: '/contacts?filter=buyers'
      },
      {
        id: 'contacts-partners',
        label: 'Partners',
        icon: 'Handshake',
        path: '/contacts?filter=partners'
      },
      {
        id: 'contacts-service-providers',
        label: 'Service Providers',
        icon: 'Wrench',
        path: '/contacts?filter=service_providers'
      }
    ]
  },
  */
  // Contracts menu
  {
    id: 'contracts',
    label: 'Contracts',
    icon: 'FileText',
    path: '/contracts',
    hasSubmenu: true,
    submenuItems: [
      { id: 'contracts-all', label: 'All Contracts', icon: 'FileText', path: '/contracts' },
      { id: 'contracts-preview', label: 'Contract Preview', icon: 'Eye', path: '/contracts/preview' },
      { id: 'contracts-invite', label: 'Invite Sellers', icon: 'UserPlus', path: '/contracts/invite' },
      { id: 'contracts-claim', label: 'Claim Contract', icon: 'Download', path: '/contracts/claim' }
    ]
  },
  {
    id: 'vani',
    label: 'VaNi',
    icon: 'MessageSquare',
    path: '/vani/dashboard',
    hasSubmenu: true,
    submenuItems: [
      { id: 'vani-dashboard', label: 'Dashboard', icon: 'LayoutDashboard', path: '/vani/dashboard' },
      { id: 'vani-events', label: 'Business Events', icon: 'Zap', path: '/vani/events' },
      { id: 'vani-jobs', label: 'Jobs', icon: 'Briefcase', path: '/vani/jobs' },
      { id: 'vani-templates', label: 'Templates', icon: 'FileTemplate', path: '/vani/templates' },
      { id: 'vani-channels', label: 'Channels', icon: 'Radio', path: '/vani/channels' },
      { id: 'vani-analytics', label: 'Analytics', icon: 'BarChart2', path: '/vani/analytics' },
      { id: 'vani-rules', label: 'Process Rules', icon: 'GitBranch', path: '/vani/rules' },
      { id: 'vani-chat', label: 'Chat', icon: 'MessageCircle', path: '/vani/chat' }
    ]
  },
  // HIDDEN: Templates, Tasks - commented out for now
  /*
  {
    id: 'templates',
    label: 'Templates',
    icon: 'FileTemplate',
    path: '/service-contracts/templates',
    hasSubmenu: true,
    submenuItems: [...]
  },
  {
    id: 'tasks',
    label: 'Tasks',
    icon: 'CheckSquare',
    path: '/tasks',
    hasSubmenu: false
  },
  */
  // HIDDEN: Appointments — commented out
  /*
  {
    id: 'appointments',
    label: 'Appointments',
    icon: 'Calendar',
    path: '/appointments',
    hasSubmenu: false
  },
  */
  // Catalog Studio - all submenus visible
  {
    id: 'catalog-studio',
    label: 'Catalog Studio',
    icon: 'Layers',
    path: '/catalog-studio',
    hasSubmenu: true,
    submenuItems: [
      { id: 'catalog-studio-configure', label: 'Configure', icon: 'Settings', path: '/catalog-studio/configure' },
      { id: 'catalog-studio-template', label: 'Template Builder', icon: 'FileTemplate', path: '/catalog-studio/template' },
      { id: 'catalog-studio-templates-list', label: 'Templates List', icon: 'List', path: '/catalog-studio/templates-list' }
    ]
  },

  // HIDDEN: Service Catalog - commented out for now
  /*
  {
    id: 'catalog',
    label: 'Service Catalog',
    icon: 'Package',
    path: '/catalog',
    hasSubmenu: true,
    submenuItems: [...]
  },
  */
  // Settings menu - simplified (removed Pricing Plans, My Subscription)
  {
    id: 'settings',
    label: 'Settings',
    icon: 'Settings',
    path: '/settings',
    hasSubmenu: true,
    submenuItems: [
      {
        id: 'settings-configure',
        label: 'Configure',
        icon: 'Sliders',
        path: '/settings/configure'
      }
      // HIDDEN: Pricing Plans, My Subscription - commented out
      /*
      {
        id: 'pricing-plans',
        label: 'Pricing Plans',
        icon: 'CreditCard',
        path: '/businessmodel/tenants/pricing-plans'
      },
      {
        id: 'my-subscription',
        label: 'My Subscription',
        icon: 'Package',
        path: '/businessmodel/tenants/subscription'
      }
      */
    ]
  },
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
    contacts: { label: 'Patients & Staff', icon: 'Users' },
    'contacts-buyers': { label: 'Patients', icon: 'Users' },
    'contacts-partners': { label: 'Medical Partners', icon: 'Stethoscope' },
    'contacts-service-providers': { label: 'Healthcare Providers', icon: 'UserCheck' },
    contracts: { label: 'Care Packages', icon: 'Stethoscope' },
    'contracts-create': { label: 'Create Care Package', icon: 'FilePlus' },
    templates: { label: 'Care Templates', icon: 'FileTemplate' },
    'my-templates': { label: 'My Care Templates', icon: 'FolderOpen' },
    'template-designer': { label: 'Care Template Designer', icon: 'Edit' },
    appointments: { label: 'Patient Appointments', icon: 'Stethoscope' },
    'implementation-toolkit': { label: 'Clinical Implementation Tools', icon: 'Stethoscope' }
  },
  financial_services: {
    contacts: { label: 'Clients & Partners', icon: 'Users' },
    'contacts-buyers': { label: 'Clients', icon: 'DollarSign' },
    'contacts-partners': { label: 'Financial Partners', icon: 'Handshake' },
    'contacts-service-providers': { label: 'Service Providers', icon: 'Building2' },
    contracts: { label: 'Financial Agreements', icon: 'DollarSign' },
    'contracts-create': { label: 'Create Agreement', icon: 'FilePlus' },
    templates: { label: 'Agreement Templates', icon: 'FileTemplate' },
    'my-templates': { label: 'My Agreement Templates', icon: 'FolderOpen' },
    'template-designer': { label: 'Agreement Designer', icon: 'Edit' },
    appointments: { label: 'Client Meetings', icon: 'Calendar' },
    'implementation-toolkit': { label: 'Financial Implementation Suite', icon: 'DollarSign' }
  },
  education: {
    contacts: { label: 'Students & Faculty', icon: 'Users' },
    'contacts-buyers': { label: 'Students', icon: 'GraduationCap' },
    'contacts-partners': { label: 'Education Partners', icon: 'Handshake' },
    'contacts-service-providers': { label: 'Faculty & Staff', icon: 'UserCheck' },
    contracts: { label: 'Learning Programs', icon: 'GraduationCap' },
    'contracts-create': { label: 'Create Program', icon: 'FilePlus' },
    templates: { label: 'Program Templates', icon: 'FileTemplate' },
    'my-templates': { label: 'My Program Templates', icon: 'FolderOpen' },
    'template-designer': { label: 'Program Designer', icon: 'Edit' },
    appointments: { label: 'Sessions', icon: 'Calendar' },
    'implementation-toolkit': { label: 'Education Implementation Tools', icon: 'GraduationCap' }
  },
  construction: {
    contacts: { label: 'Contractors & Clients', icon: 'Users' },
    'contacts-buyers': { label: 'Clients', icon: 'Building2' },
    'contacts-partners': { label: 'Construction Partners', icon: 'Handshake' },
    'contacts-service-providers': { label: 'Contractors', icon: 'Hammer' },
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
