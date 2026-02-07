// src/seeds/compliance.seed.ts
// Compliance Numbers seed data - Single source of truth

import { SeedDefinition, SeedItem } from './types';

// Default compliance number configurations
export const COMPLIANCE_SEED_DATA: SeedItem[] = [
  {
    code: 'GST',
    name: 'GST',
    description: 'Goods and Services Tax identification number',
    hexcolor: '#10B981',  // Green
    icon_name: 'FileCheck',
    is_deletable: true,
    sequence_order: 1
  },
  {
    code: 'PAN',
    name: 'PAN',
    description: 'Permanent Account Number',
    hexcolor: '#3B82F6',  // Blue
    icon_name: 'CreditCard',
    is_deletable: true,
    sequence_order: 2
  }
];

// Transform seed data to t_category_details structure
export const transformComplianceForDB = (
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
export const complianceSeedDefinition: SeedDefinition = {
  category: 'compliance',
  displayName: 'Compliance Numbers',
  targetTable: 't_category_details',
  dependsOn: [],
  data: COMPLIANCE_SEED_DATA,
  transform: transformComplianceForDB,
  order: 4,
  isRequired: true,
  description: 'Tax and regulatory compliance identifiers (GST, PAN)'
};
