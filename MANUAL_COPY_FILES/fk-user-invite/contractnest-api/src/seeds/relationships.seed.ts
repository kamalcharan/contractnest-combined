// src/seeds/relationships.seed.ts
// FamilyKnows Relationship Types seed data - Single source of truth

import { SeedDefinition, SeedItem } from './types';

// Default FamilyKnows relationship configurations
export const FK_RELATIONSHIP_SEED_DATA: SeedItem[] = [
  {
    code: 'OWNER',
    name: 'Family Head',
    description: 'Primary owner/head of the family space',
    hexcolor: '#32e275',  // Green
    icon_name: 'Crown',
    is_deletable: false,
    sequence_order: 1,
    permissions: ['all']
  },
  {
    code: 'PARENT',
    name: 'Parent',
    description: 'Parent in the family (Mother/Father)',
    hexcolor: '#3B82F6',  // Blue
    icon_name: 'Users',
    is_deletable: false,
    sequence_order: 2,
    permissions: ['read', 'write', 'invite']
  },
  {
    code: 'SPOUSE',
    name: 'Spouse',
    description: 'Spouse/Partner in the family',
    hexcolor: '#EC4899',  // Pink
    icon_name: 'Heart',
    is_deletable: false,
    sequence_order: 3,
    permissions: ['read', 'write', 'invite']
  },
  {
    code: 'CHILD',
    name: 'Child',
    description: 'Child in the family (Son/Daughter)',
    hexcolor: '#F59E0B',  // Amber
    icon_name: 'Baby',
    is_deletable: false,
    sequence_order: 4,
    permissions: ['read', 'write']
  },
  {
    code: 'GRANDPARENT',
    name: 'Grandparent',
    description: 'Grandparent in the family',
    hexcolor: '#8B5CF6',  // Purple
    icon_name: 'UserCircle',
    is_deletable: false,
    sequence_order: 5,
    permissions: ['read', 'write']
  },
  {
    code: 'SIBLING',
    name: 'Sibling',
    description: 'Sibling in the family (Brother/Sister)',
    hexcolor: '#06B6D4',  // Cyan
    icon_name: 'Users2',
    is_deletable: false,
    sequence_order: 6,
    permissions: ['read', 'write']
  },
  {
    code: 'OTHER',
    name: 'Other',
    description: 'Other family member or relative',
    hexcolor: '#64748B',  // Slate
    icon_name: 'User',
    is_deletable: true,
    sequence_order: 7,
    permissions: ['read']
  }
];

// Transform seed data to t_category_details structure
export const transformRelationshipForDB = (
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
    form_settings: {
      permissions: item.permissions
    }
  };
};

// Seed definition for registry
export const relationshipsSeedDefinition: SeedDefinition = {
  category: 'relationships',
  displayName: 'Family Relationships',
  targetTable: 't_category_details',
  dependsOn: [],  // No dependencies
  data: FK_RELATIONSHIP_SEED_DATA,
  transform: transformRelationshipForDB,
  order: 2,
  isRequired: true,
  description: 'Relationship types for FamilyKnows family members (Parent, Spouse, Child, etc.)'
};

// Relationship display names mapping
export const FK_RELATIONSHIP_DISPLAY_NAMES: Record<string, string> = {
  OWNER: 'Family Head',
  PARENT: 'Parent',
  SPOUSE: 'Spouse',
  CHILD: 'Child',
  GRANDPARENT: 'Grandparent',
  SIBLING: 'Sibling',
  OTHER: 'Other',
};

// Category master data for FamilyKnows relationships
export const FK_RELATIONSHIPS_CATEGORY = {
  category_name: 'Relationships',
  display_name: 'Family Relationships',
  description: 'Relationship types in the family space',
  is_active: true
};
