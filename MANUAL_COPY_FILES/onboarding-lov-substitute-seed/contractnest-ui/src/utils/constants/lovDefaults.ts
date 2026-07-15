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
  values: LovSeedValue[];
}

export const DEFAULT_LOV_SEED: LovSeedCategory[] = [
  {
    category_name: 'Roles',
    display_name: 'Roles',
    purpose:
      'Roles control what your team members can do. When you invite someone, you pick their role — the role name is also their designation.',
    example:
      'e.g. invite your accountant as "Admin", or add custom roles like "President" or "Secretary".',
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
      'Tags are labels for your contacts. Use them to group and filter people — prospects, event guests, priority customers.',
    example:
      'e.g. tag a walk-in visitor as "Guest" + "Lead", or your best customers as "VIP".',
    values: [
      { sub_cat_name: 'Lead', display_name: 'Lead', hexcolor: '#F59E0B', is_deletable: true },
      { sub_cat_name: 'Guest', display_name: 'Guest', hexcolor: '#8B5CF6', is_deletable: true },
      { sub_cat_name: 'VIP', display_name: 'VIP', hexcolor: '#EC4899', is_deletable: true },
      { sub_cat_name: 'Substitute', display_name: 'Substitute', hexcolor: '#14B8A6', is_deletable: true },
    ],
  },
];

/** Palette offered when adding a new value during onboarding */
export const LOV_COLOR_PALETTE = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444',
  '#8B5CF6', '#EC4899', '#06B6D4', '#64748B',
];
