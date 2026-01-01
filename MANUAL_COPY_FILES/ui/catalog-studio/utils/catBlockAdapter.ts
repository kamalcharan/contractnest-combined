// src/utils/catalog-studio/catBlockAdapter.ts
// Adapter to convert between API CatBlock and UI Block types

import { CatBlock } from '@/hooks/queries/useCatBlocks';
import { Block } from '@/types/catalogStudio';

/**
 * Block type ID to category ID mapping
 * Maps database block_type_id UUIDs to UI categoryId strings
 */
const BLOCK_TYPE_MAP: Record<string, string> = {
  // These UUIDs should match the m_category_details for cat_block_type
  // You'll need to update these with actual UUIDs from your database
  'service': 'service',
  'spare': 'spare',
  'billing': 'billing',
  'text': 'text',
  'video': 'video',
  'image': 'image',
  'checklist': 'checklist',
  'document': 'document',
};

/**
 * Get default icon for a block type
 */
const getDefaultIcon = (blockTypeId: string): string => {
  const iconMap: Record<string, string> = {
    'service': 'Wrench',
    'spare': 'Package',
    'billing': 'CreditCard',
    'text': 'FileText',
    'video': 'Video',
    'image': 'Image',
    'checklist': 'CheckSquare',
    'document': 'FileCheck',
  };
  return iconMap[blockTypeId] || 'Circle';
};

/**
 * Convert API CatBlock to UI Block format
 */
export const catBlockToBlock = (catBlock: CatBlock): Block => {
  const config = catBlock.config || {};

  return {
    id: catBlock.id,
    categoryId: catBlock.block_type_id,
    name: catBlock.name,
    icon: config.icon || getDefaultIcon(catBlock.block_type_id),
    description: catBlock.description || '',
    price: config.base_price,
    currency: config.currency_id || 'INR',
    duration: config.duration,
    durationUnit: config.duration_unit || 'minutes',
    tags: catBlock.tags || [],
    evidenceTags: config.evidence_types || [],
    usage: {
      templates: 0, // Not available from API yet
      contracts: 0,
    },
    meta: {
      is_admin: catBlock.is_admin ? 'true' : 'false',
      is_active: catBlock.is_active ? 'true' : 'false',
      visible: catBlock.visible ? 'true' : 'false',
      pricing_mode_id: catBlock.pricing_mode_id,
      created_at: catBlock.created_at,
      updated_at: catBlock.updated_at,
    },
  };
};

/**
 * Convert multiple CatBlocks to Blocks
 */
export const catBlocksToBlocks = (catBlocks: CatBlock[]): Block[] => {
  return catBlocks.map(catBlockToBlock);
};

/**
 * Convert UI Block data to API CreateBlockData format
 */
export const blockToCreateData = (block: Partial<Block> & { name: string }) => {
  return {
    name: block.name,
    description: block.description,
    block_type_id: block.categoryId || 'service',
    pricing_mode_id: 'fixed', // Default, should be configurable
    is_admin: false,
    visible: true,
    config: {
      icon: block.icon,
      base_price: block.price,
      currency_id: block.currency || 'INR',
      duration: block.duration,
      duration_unit: block.durationUnit || 'minutes',
      evidence_types: block.evidenceTags,
    },
    tags: block.tags || [],
  };
};

/**
 * Convert UI Block updates to API UpdateBlockData format
 */
export const blockToUpdateData = (updates: Partial<Block>) => {
  const data: Record<string, any> = {};

  if (updates.name !== undefined) data.name = updates.name;
  if (updates.description !== undefined) data.description = updates.description;
  if (updates.categoryId !== undefined) data.block_type_id = updates.categoryId;
  if (updates.tags !== undefined) data.tags = updates.tags;

  // Config updates
  const config: Record<string, any> = {};
  if (updates.icon !== undefined) config.icon = updates.icon;
  if (updates.price !== undefined) config.base_price = updates.price;
  if (updates.currency !== undefined) config.currency_id = updates.currency;
  if (updates.duration !== undefined) config.duration = updates.duration;
  if (updates.durationUnit !== undefined) config.duration_unit = updates.durationUnit;
  if (updates.evidenceTags !== undefined) config.evidence_types = updates.evidenceTags;

  if (Object.keys(config).length > 0) {
    data.config = config;
  }

  return data;
};

export default {
  catBlockToBlock,
  catBlocksToBlocks,
  blockToCreateData,
  blockToUpdateData,
};
