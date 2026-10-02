// src/utils/constants/lovDefaults.ts
// Default LOV (List of Values) seed shown in the onboarding lov-setup step.
// The step renders whatever is defined here, so adding a category or value
// below extends the onboarding screen without any UI changes.
// Keep in sync with the seeding config in
// contractnest-edge/supabase/functions/tenants/index.ts (DEFAULT_LOV_SEED).

export interface LovSeedValue {
  sub_cat_name: string;
  display_name: string;
  hexcolor: string;
  is_deletable: boolean;
}

export interface LovSeedCategory {
  /** Matches t_category_master.category_name */
  category_name: string;
  display_name: string;
  /** Plain-language purpose shown to the user during onboarding */
  purpose: string;
  /** Example of how the values get used, shown as helper text */
  example: string;
  /** Onboarding "What / Why / Where" tiles — plain language, nothing promised that the app does not do */
  explain: { what: string; why: string; where: string };
  /** One-tap suggestions on the onboarding step, by journey persona */
  suggestions: Record<'seller' | 'buyer' | 'both', string[]>;
  values: LovSeedValue[];
}

export const DEFAULT_LOV_SEED: LovSeedCategory[] = [
  {
    category_name: 'Roles',
    display_name: 'Roles',
    // A role is a designation today: it is stored on the invitation and shown
    // on the team list. Nothing in the app checks it for access, so the copy
    // must not promise permissions.
    purpose:
      'Roles are the titles your teammates carry. When you invite someone, you pick one of these.',
    example:
      'e.g. invite your field staff as "Technician", or add titles like "President" or "Secretary".',
    explain: {
      what: 'The title a teammate carries, e.g. Technician.',
      why: 'You pick one when you invite someone to your workspace.',
      where: 'The invite form and your team list in Settings → Users.',
    },
    suggestions: {
      seller: ['Technician', 'Supervisor', 'Accounts', 'Sales'],
      buyer: ['Facility manager', 'Accounts', 'Committee member', 'Security lead'],
      both: ['Technician', 'Facility manager', 'Accounts', 'Supervisor'],
    },
    values: [
      { sub_cat_name: 'Owner', display_name: 'Owner', hexcolor: '#32e275', is_deletable: false },
      { sub_cat_name: 'Admin', display_name: 'Admin', hexcolor: '#40E0D0', is_deletable: true },
      { sub_cat_name: 'Member', display_name: 'Member', hexcolor: '#3B82F6', is_deletable: true },
    ],
  },
  {
    category_name: 'Tags',
    display_name: 'Tags',
    purpose:
      'Tags are labels for your contacts. Use them to group and filter people — referrals, event guests, priority customers.',
    example:
      'e.g. tag a walk-in visitor as "Guest", or your best customers as "VIP".',
    explain: {
      what: 'A label you put on a contact. A contact can carry several.',
      why: 'Find and filter people fast, and reach a group later.',
      where: 'Contacts list filters, the contact page and contact import.',
    },
    suggestions: {
      seller: ['AMC customer', 'Gated community', 'Commercial', 'Residential'],
      buyer: ['Preferred vendor', 'Electrical', 'Housekeeping', 'Security'],
      both: ['AMC customer', 'Vendor', 'Priority', 'Commercial'],
    },
    // "Lead" is a built-in contact CLASSIFICATION (the Leads page reads it),
    // so a starter TAG with the same name would be a second, unrelated "Lead".
    values: [
      { sub_cat_name: 'Referral', display_name: 'Referral', hexcolor: '#F59E0B', is_deletable: true },
      { sub_cat_name: 'Guest', display_name: 'Guest', hexcolor: '#8B5CF6', is_deletable: true },
      { sub_cat_name: 'VIP', display_name: 'VIP', hexcolor: '#EC4899', is_deletable: true },
    ],
  },
];

/** Palette offered when adding a new value during onboarding */
export const LOV_COLOR_PALETTE = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444',
  '#8B5CF6', '#EC4899', '#06B6D4', '#64748B',
];
