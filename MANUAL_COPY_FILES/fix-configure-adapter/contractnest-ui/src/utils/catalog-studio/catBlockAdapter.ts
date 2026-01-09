// src/utils/catalog-studio/catBlockAdapter.ts
// Adapter to convert between API CatBlock and UI Block types

import { CatBlock } from '@/hooks/queries/useCatBlocks';
import { Block } from '@/types/catalogStudio';

/**
 * Get default icon for a block type
 */
const getDefaultIcon = (blockTypeName: string | null): string => {
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
  return iconMap[blockTypeName || ''] || 'Circle';
};

/**
 * Convert API CatBlock to UI Block format
 *
 * ✅ FIX: Uses block_type_name (from edge function enrichment) instead of block_type_id UUID
 * This allows proper matching with BLOCK_CATEGORIES which uses string IDs like 'service', 'spare'
 */
export const catBlockToBlock = (catBlock: CatBlock): Block => {
  const config = catBlock.config || {};

  // ✅ FIX: Use block_type_name if available, fall back to block_type_id for backwards compatibility
  const categoryId = (catBlock as any).block_type_name || catBlock.block_type_id;

  return {
    id: catBlock.id,
    categoryId: categoryId, // ✅ Now uses 'service', 'spare', etc. instead of UUID
    name: catBlock.name,
    icon: config.icon || catBlock.icon || getDefaultIcon((catBlock as any).block_type_name),
    description: catBlock.description || '',
    price: catBlock.base_price || config.base_price,
    currency: catBlock.currency || config.currency_id || 'INR',
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
      pricing_mode_name: (catBlock as any).pricing_mode_name, // ✅ Also include pricing mode name
      created_at: catBlock.created_at,
      updated_at: catBlock.updated_at,
      // Store original UUIDs for API calls
      block_type_id_uuid: catBlock.block_type_id,
    },
    // ✅ Store config for edit/duplicate operations
    config: config,
    // ✅ Store pricing mode for operations
    pricingMode: (catBlock as any).pricing_mode_name || catBlock.pricing_mode_id,
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
 *
 * ✅ Sends string block_type_id like 'service' - edge function will resolve to UUID
 */
export const blockToCreateData = (block: Partial<Block> & { name: string }) => {
  return {
    name: block.name,
    description: block.description,
    block_type_id: block.categoryId || 'service', // ✅ Send string, edge function resolves to UUID
    pricing_mode_id: block.pricingMode || 'independent', // ✅ Send string, edge function resolves to UUID
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

/**
 * Create a template block from a Block
 * Used when adding blocks to templates
 */
export const createTemplateBlock = (block: Block, order: number) => {
  return {
    block_id: block.id,
    order: order,
    config: {
      visible: true,
      price: block.price,
      duration: block.duration,
    },
  };
};

export default {
  catBlockToBlock,
  catBlocksToBlocks,
  blockToCreateData,
  blockToUpdateData,
  createTemplateBlock,
};
