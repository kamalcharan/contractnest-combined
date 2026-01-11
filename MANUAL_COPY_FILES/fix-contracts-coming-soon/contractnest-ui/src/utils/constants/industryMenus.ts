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
  // Contracts menu - only Create Contract visible (has Empty State)
  {
    id: 'contracts',
    label: 'Contracts',
    icon: 'FileText',
    path: '/contracts',
    hasSubmenu: true,
    submenuItems: [
      { id: 'contracts-create', label: 'My Contracts', icon: 'FilePlus', path: '/contracts/create' }
      // HIDDEN: All Contracts, Contract Preview, PDF View, Invite Sellers, Drafts, Pending, Active
      // { id: 'contracts-all', label: 'All Contracts', icon: 'FileText', path: '/service-contracts/contracts' },
      // { id: 'contracts-preview', label: 'Contract Preview', icon: 'Eye', path: '/contracts/preview' },
      // { id: 'contracts-pdf', label: 'PDF View', icon: 'FileSearch', path: '/contracts/pdf' },
      // { id: 'contracts-invite', label: 'Invite Sellers', icon: 'UserPlus', path: '/contracts/invite' },
      // { id: 'contracts-drafts', label: 'Drafts', icon: 'FileEdit', path: '/service-contracts/contracts?status=draft' },
      // { id: 'contracts-pending', label: 'Pending Acceptance', icon: 'Clock', path: '/service-contracts/contracts?status=pending' },
      // { id: 'contracts-active', label: 'Active Contracts', icon: 'CheckCircle', path: '/service-contracts/contracts?status=active' }
    ]
  },
  // HIDDEN: Templates, Appointments, Tasks, VaNi - commented out for now
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
    id: 'appointments',
    label: 'Appointments',
    icon: 'Calendar',
    path: '/appointments',
    hasSubmenu: false
  },
  {
    id: 'tasks',
    label: 'Tasks',
    icon: 'CheckSquare',
    path: '/tasks',
    hasSubmenu: false
  },
  {
    id: 'vani',
    label: 'VaNi',
    icon: 'MessageSquare',
    path: '/vani/events',
    hasSubmenu: true,
    submenuItems: [...]
  },
  */
  // Operations menu - only Ops Cockpit visible (has Empty State)
  {
    id: 'operations',
    label: 'Operations',
    icon: 'Activity',
    path: '/ops/cockpit',
    hasSubmenu: true,
    submenuItems: [
      { id: 'ops-cockpit', label: 'Ops Cockpit', icon: 'Gauge', path: '/ops/cockpit' }
      // HIDDEN: Activity Feed, Reports (no empty states yet)
      // { id: 'ops-activity', label: 'Activity Feed', icon: 'Activity', path: '/ops/activity' },
      // { id: 'ops-reports', label: 'Reports', icon: 'BarChart2', path: '/ops/reports' }
    ]
  },
  // Catalog Studio - Configure hidden (no empty state)
  {
    id: 'catalog-studio',
    label: 'Catalog Studio',
    icon: 'Layers',
    path: '/catalog-studio',
    hasSubmenu: true,
    submenuItems: [
      // HIDDEN: Configure (no empty state)
      // { id: 'catalog-studio-configure', label: 'Configure', icon: 'Settings', path: '/catalog-studio/configure' },
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
  {
    id: 'implementation-toolkit',
    label: 'Implementation Toolkit',
    icon: 'Tool',
    path: '/implementation',
    adminOnly: true,
    hasSubmenu: true,
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
        id: 'plan-detail',
        label: 'Plan Detail',
        icon: 'FileText',
        path: '/implementation/plan-detail'
      },
      {
        id: 'plan-versions',
        label: 'Plan Versions',
        icon: 'GitBranch',
        path: '/implementation/plan-versions'
      },
      {
        id: 'subscription-dashboard',
        label: 'Subscription Dashboard',
        icon: 'BarChart',
        path: '/implementation/subscription-dashboard'
      },
      {
        id: 'subscription-management',
        label: 'Subscription Management',
        icon: 'CreditCard',
        path: '/implementation/subscription-management'
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
      }
    ]
  },
  {
    id: 'user-management',
    label: 'User Management',
    icon: 'UserCog',
    path: '/user-management',
    adminOnly: true,
    hasSubmenu: false
  },
  {
    id: 'analytics',
    label: 'Analytics',
    icon: 'BarChart2',
    path: '/analytics',
    adminOnly: true,
    hasSubmenu: false
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
