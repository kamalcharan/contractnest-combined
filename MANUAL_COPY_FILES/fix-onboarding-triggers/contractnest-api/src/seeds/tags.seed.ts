// src/seeds/tags.seed.ts
// Tags seed data - Single source of truth

import { SeedDefinition, SeedItem } from './types';

// Default tag configurations
export const TAG_SEED_DATA: SeedItem[] = [
  {
    code: 'VIP',
    name: 'VIP',
    description: 'Very Important Person / Priority contact',
    hexcolor: '#F59E0B',  // Amber
    icon_name: 'Star',
    is_deletable: true,
    sequence_order: 1
  }
];

// Transform seed data to t_category_details structure
export const transformTagForDB = (
  item: SeedItem,
  tenantId: string,
  isLive: boolean,
  categoryId?: string
): any => {
  return {
    tenant_id: tenantId,
    category_id: categoryId || '',
    sub_cat_name: item.code,
    display_name: item.name,
    description: item.description,
    hexcolor: item.hexcolor,
    icon_name: item.icon_name,
    sequence_no: item.sequence_order,
    is_active: true,
    is_deletable: item.is_deletable,
    is_live: isLive,
    form_settings: null
  };
};

// Seed definition for registry
export const tagsSeedDefinition: SeedDefinition = {
  category: 'tags',
  displayName: 'Tags',
  targetTable: 't_category_details',
  dependsOn: [],
  data: TAG_SEED_DATA,
  transform: transformTagForDB,
  order: 3,
  isRequired: true,
  description: 'Default tags for contacts and entities (VIP)'
};
