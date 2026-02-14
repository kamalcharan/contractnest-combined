// src/utils/constants/settingsMenus.ts

export interface SettingsItem {
  id: string;
  settings_type: string;
  parent_type: string | null;
  description_short: string;
  description_long: string;
  route_path: string;
  card_icon_name: string;
  adminOnly?: boolean;
}

export interface GroupedSettingsItem {
  items: SettingsItem[];
}

export interface GroupedSettingsMetadata {
  [key: string]: GroupedSettingsItem;
}

// Group category constants
export const GROUP_LIST_OF_VALUE = 'List of Value (LOVs)';
export const GROUP_INTEGRATIONS = 'Integrations';
export const GROUP_STORAGE_SPACE = 'Storage Space';
export const GROUP_PAYMENT_GATEWAY = 'Payment Gateway';
export const GROUP_CUSTOMER_CHANNELS = 'Customer Channels';
export const GROUP_BUSINESS_PROFILE = 'Business Profile';
export const GROUP_SUBSCRIPTION = 'Subscription';
export const GROUP_TEAM = 'Team'; // Renamed from User Management

// Constants for Settings menu structure - grouped by categories from the images
export const settingsMenuItems: SettingsItem[] = [
  // Team - Renamed Section (keeping same routes)
  {
    id: 'team',
    settings_type: GROUP_TEAM,
    parent_type: null,
    description_short: 'Manage team members',
    description_long: 'Manage team members, send invitations, and control access to your workspace',
    route_path: '/settings/users',
    card_icon_name: 'Users',
    adminOnly: false
  },
  {
    id: 'team-members',
    settings_type: 'Team Members',
    parent_type: GROUP_TEAM,
    description_short: 'View and manage team',
    description_long: 'View all team members, their status, roles, and manage their access',
    route_path: '/settings/users',
    card_icon_name: 'Users',
    adminOnly: false
  },
{
  id: 'resources',
  settings_type: 'Resources',
  parent_type: GROUP_TEAM,
  description_short: 'Manage resources',
  description_long: 'Configure team, equipment, and service resources',
  route_path: '/settings/configure/resources',
  card_icon_name: 'Users',
  adminOnly: false
},
{
  id: 'equipment-registry',
  settings_type: 'Equipment Registry',
  parent_type: GROUP_TEAM,
  description_short: 'Client equipment',
  description_long: 'Register and manage your client\'s equipment — MRI scanners, ventilators, and more',
  route_path: '/settings/configure/equipment',
  card_icon_name: 'Wrench',
  adminOnly: false
},


  // List of Value (LOVs)
  {
    id: 'list-of-value',
    settings_type: GROUP_LIST_OF_VALUE,
    parent_type: null,
    description_short: 'Configure List of Values',
    description_long: 'configure List of Values of the product. These are usually accessible from the dropdowns',
    route_path: '/settings/configure/lovs',
    card_icon_name: 'List',
    adminOnly: false
  },
  {
    id: 'list-of-value-items',
    settings_type: 'List of Value (LOVs)',
    parent_type: GROUP_LIST_OF_VALUE,
    description_short: 'Configure List of Values',
    description_long: 'Configure List of Values of the product. These are usually accessible from the dropdowns',
    route_path: '/settings/configure/lovs',
    card_icon_name: 'List',
    adminOnly: false
  },
  {
    id: 'smart-forms',
    settings_type: 'Smart Forms',
    parent_type: GROUP_LIST_OF_VALUE,
    description_short: 'Configure Smart Forms',
    description_long: 'Select and manage dynamic form templates available to your team for service events',
    route_path: '/settings/configure/smart-forms',
    card_icon_name: 'FileText',
    adminOnly: false
  },

  // Integrations
  {
     id: 'integrations-main',
    settings_type: GROUP_INTEGRATIONS,
    parent_type: null,
    description_short: 'Third-party services - cherry',
    description_long: 'Configure integrations with external services and providers',
    route_path: '/settings/integrations',
    card_icon_name: 'Link',
    adminOnly: false
  },
  {
    id: 'api-integrations',
    settings_type: 'Integrations',
    parent_type: GROUP_INTEGRATIONS,
    description_short: 'API connections',
    description_long: 'Configure your integrations',
    route_path: '/settings/integrations',
    card_icon_name: 'Link',
    adminOnly: false
  },

  // Storage Space
  {
    id: 'storage-space',
    settings_type: GROUP_STORAGE_SPACE,
    parent_type: null,
    description_short: 'Manage your storage',
    description_long: 'Configure and manage cloud storage for your files',
    route_path: '/settings/storage/storagemanagement',
    card_icon_name: 'Database',
    adminOnly: false
  },
  {
    id: 'storage-management',
    settings_type: 'Storage Management',
    parent_type: GROUP_STORAGE_SPACE,
    description_short: 'File storage management',
    description_long: 'Manage files, upload documents, and monitor storage usage',
    route_path: '/settings/storage/storagemanagement',
    card_icon_name: 'HardDrive',
    adminOnly: false
  },




  // Customer Channels
  {
    id: 'customer-channels',
    settings_type: GROUP_CUSTOMER_CHANNELS,
    parent_type: null,
    description_short: 'Communication channels',
    description_long: 'Manage your Customer communication channels here',
    route_path: '/settings/configure/channels',
    card_icon_name: 'MessageSquare',
    adminOnly: false
  },
  // HIDDEN: SMS, Email, WhatsApp - commented out for now
  /*
  {
    id: 'sms',
    settings_type: 'SMS',
    parent_type: GROUP_CUSTOMER_CHANNELS,
    description_short: 'SMS settings',
    description_long: 'configure your SMS',
    route_path: '/settings/configure/channels/sms',
    card_icon_name: 'MessageCircle',
    adminOnly: false
  },
  {
    id: 'email',
    settings_type: 'Email',
    parent_type: GROUP_CUSTOMER_CHANNELS,
    description_short: 'Email settings',
    description_long: 'Configure your Email',
    route_path: '/settings/configure/channels/email',
    card_icon_name: 'Mail',
    adminOnly: false
  },
  {
    id: 'whatsapp',
    settings_type: 'WhatsApp',
    parent_type: GROUP_CUSTOMER_CHANNELS,
    description_short: 'WhatsApp settings',
    description_long: 'configure your WhatsApp providr',
    route_path: '/settings/configure/channels/whatsapp',
    card_icon_name: 'MessageCircle',
    adminOnly: false
  },
  */
  {
    id: 'groups',
    settings_type: 'Groups',
    parent_type: GROUP_CUSTOMER_CHANNELS,
    description_short: 'Business Groups',
    description_long: 'Join business groups, create your profile, and connect with other members',
    route_path: '/settings/configure/customer-channels/groups',
    card_icon_name: 'Users',
    adminOnly: false
  },

  // Business Profile
  {
    id: 'business-profile',
    settings_type: GROUP_BUSINESS_PROFILE,
    parent_type: null,
    description_short: 'Company profile',
    description_long: 'Setup your business profile here',
    route_path: '/settings/configure/business',
    card_icon_name: 'Briefcase',
    adminOnly: false
  },
  {
    id: 'tax',
    settings_type: 'Tax',
    parent_type: GROUP_BUSINESS_PROFILE,
    description_short: 'Tax settings',
    description_long: 'Configure tax display and manage tax rates',
    route_path: '/settings/tax-settings',
    card_icon_name: 'Percent',
    adminOnly: false
  },
  {
    id: 'business-profile-details',
    settings_type: 'Business Profile',
    parent_type: GROUP_BUSINESS_PROFILE,
    description_short: 'Business details',
    description_long: 'Have your business data configured',
    route_path: '/settings/business-profile',
    card_icon_name: 'Building',
    adminOnly: false
  },
  {
    id: 'sequence-numbers',
    settings_type: 'Sequence Numbers',
    parent_type: GROUP_BUSINESS_PROFILE,
    description_short: 'Configure sequences',
    description_long: 'Configure auto-generated number formats for contacts, invoices, and more',
    route_path: '/settings/sequencing',
    card_icon_name: 'Hash',
    adminOnly: false
  },
  // HIDDEN: Smart Profile - commented out for now
  /*
  {
    id: 'smart-profile',
    settings_type: 'Smart Profile',
    parent_type: GROUP_BUSINESS_PROFILE,
    description_short: 'AI-enhanced profile',
    description_long: 'Generate AI-powered business profile with semantic keywords for better discoverability',
    route_path: '/settings/business-profile/smart-profile',
    card_icon_name: 'Sparkles',
    adminOnly: false
  },
  */


  // Subscription section - Unified Dashboard (Credits merged into My Subscription)
  {
    id: 'subscription',
    settings_type: GROUP_SUBSCRIPTION,
    parent_type: null,
    description_short: 'Subscription management',
    description_long: 'Manage your subscription, view usage, and buy credits',
    route_path: '/businessmodel/tenants/subscription',
    card_icon_name: 'Repeat',
    adminOnly: false
  },
  {
    id: 'my-subscription',
    settings_type: 'My Subscription',
    parent_type: GROUP_SUBSCRIPTION,
    description_short: 'Current subscription',
    description_long: 'View your current plan, usage metrics, credits balance, and billing details',
    route_path: '/businessmodel/tenants/subscription',
    card_icon_name: 'CreditCard',
    adminOnly: false
  },
  {
    id: 'pricing-plans',
    settings_type: 'Pricing Plans',
    parent_type: GROUP_SUBSCRIPTION,
    description_short: 'Available plans',
    description_long: 'Explore and compare available pricing plans',
    route_path: '/businessmodel/tenants/pricing-plans',
    card_icon_name: 'BarChart',
    adminOnly: false
  }
  // REMOVED: Credits menu item - now integrated into My Subscription unified dashboard
];

// Function to get grouped settings metadata
export const getGroupedSettingsMetadata = (isProfile: boolean = false): GroupedSettingsMetadata => {
  const grouped: GroupedSettingsMetadata = {};

  // Define the groups we want to include
  // GROUP_SUBSCRIPTION enabled for Business Model Phase 4
  const groupNames = isProfile
    ? [] // For profile page - Subscription not shown
    : [GROUP_TEAM, GROUP_LIST_OF_VALUE, GROUP_INTEGRATIONS, GROUP_STORAGE_SPACE, GROUP_PAYMENT_GATEWAY, GROUP_CUSTOMER_CHANNELS, GROUP_BUSINESS_PROFILE, GROUP_SUBSCRIPTION]; // For settings page - includes Subscription

  // Create group entries for each category
  groupNames.forEach(groupName => {
    const groupItems = settingsMenuItems.filter(item =>
      item.settings_type === groupName ||
      item.parent_type === groupName
    );

    if (groupItems.length > 0) {
      grouped[groupName] = { items: groupItems };
    }
  });

  return grouped;
};
