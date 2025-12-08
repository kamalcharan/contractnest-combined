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
  // UPDATED: Contracts menu now points to service-contracts structure
  {
    id: 'contracts',
    label: 'Contracts',
    icon: 'FileText',
    path: '/service-contracts/contracts',
    hasSubmenu: false
  },
  // UPDATED: Templates menu now points to service-contracts structure
  {
    id: 'templates',
    label: 'Templates',
    icon: 'FileTemplate',
    path: '/service-contracts/templates',
    hasSubmenu: true,
    submenuItems: [
      {
        id: 'my-templates',
        label: 'My Templates',
        icon: 'FolderOpen',
        path: '/service-contracts/templates'
      },
      {
        id: 'template-designer',
        label: 'Template Designer',
        icon: 'Edit',
        path: '/service-contracts/templates/designer'
      }
    ]
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
    path: '/vani/events', // Changed default to events dashboard
    hasSubmenu: true,
    submenuItems: [
      // Core Business Operations (NEW)
      {
        id: 'vani-events',
        label: 'Business Events',
        icon: 'Activity',
        path: '/vani/events'
      },
      {
        id: 'vani-dashboard',
        label: 'Dashboard',
        icon: 'LayoutDashboard',
        path: '/vani/dashboard'
      },
      
      // Process Management
      {
        id: 'vani-jobs',
        label: 'Communication Jobs',
        icon: 'Send',
        path: '/vani/jobs'
      },
      {
        id: 'vani-rules',
        label: 'Event Rules',
        icon: 'Settings',
        path: '/vani/rules'
      },
      {
        id: 'vani-chat',
        label: 'VaNi Chat',
        icon: 'Search',
        path: '/vani/channels/chat'
      },
      {
        id: 'vani-webhooks',
        label: 'Module Integration',
        icon: 'Zap',
        path: '/vani/webhooks'
      },
      
      // Business Views
      {
        id: 'vani-receivables',
        label: 'Accounts Receivable',
        icon: 'DollarSign',
        path: '/vani/finance/receivables'
      },
      {
        id: 'vani-services',
        label: 'Service Schedule',
        icon: 'Calendar',
        path: '/vani/operations/services'
      },
      
      // Configuration
      {
        id: 'vani-templates',
        label: 'Templates',
        icon: 'FileText',
        path: '/vani/templates'
      },
      {
        id: 'vani-channels',
        label: 'Channels',
        icon: 'Radio',
        path: '/vani/channels',
        hasSubmenu: true,
        submenuItems: [
          {
            id: 'vani-channels-whatsapp',
            label: 'WhatsApp',
            icon: 'MessageCircle',
            path: '/vani/channels/whatsapp'
          },
          {
            id: 'vani-channels-bot',
            label: 'Bot',
            icon: 'Bot',
            path: '/vani/channels/chatbot'
          },
          {
            id: 'vani-channels-website',
            label: 'Website',
            icon: 'Globe',
            path: '/vani/channels/website'
          }
        ]
      },
      {
        id: 'vani-analytics',
        label: 'Cross-Module Analytics',
        icon: 'BarChart3',
        path: '/vani/analytics'
      }
    ]
  },
  {
    id: 'catalog',
    label: 'Service Catalog',
    icon: 'Package',
    path: '/catalog',
    hasSubmenu: true,
    submenuItems: [
      {
        id: 'all-services',
        label: 'All Services',
        icon: 'List',
        path: '/catalog'
      },
      {
        id: 'create-service',
        label: 'Create Service',
        icon: 'Plus',
        path: '/catalog/create'
      },
      {
        id: 'active-services',
        label: 'Active Services',
        icon: 'CheckCircle',
        path: '/catalog?status=active'
      },
      {
        id: 'draft-services',
        label: 'Draft Services',
        icon: 'Clock',
        path: '/catalog?status=draft'
      },
      {
        id: 'marketplace',
        label: 'Marketplace',
        icon: 'ShoppingBag',
        path: '/marketplace'
      }
    ]
  },
  // Settings menu - unchanged
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
      },
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