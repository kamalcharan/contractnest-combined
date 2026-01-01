// src/utils/catalog-studio/catTemplateAdapter.ts
// Adapter to convert between API CatTemplate and UI Template types

import { CatTemplate, TemplateBlock } from '@/hooks/queries/useCatTemplates';

/**
 * UI Template interface (matches existing templates-list.tsx)
 */
export interface UITemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  industry: string;
  tags: string[];
  blocksCount: number;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  isGlobal: boolean; // tenant_id is null = global/system template
  isFavorite: boolean;
  usageCount: number;
  rating: number;
  status: 'draft' | 'published' | 'archived';
  currentVersion: string;
  versions: UITemplateVersion[];
  thumbnailIcon: string;
  estimatedDuration: string;
}

export interface UITemplateVersion {
  version: string;
  createdAt: string;
  createdBy: string;
  notes: string;
  blocksCount: number;
}

/**
 * Map API status_id to UI status string
 * Note: You'll need to update these with actual status UUIDs from m_category_details
 */
const statusIdToString = (statusId: string): 'draft' | 'published' | 'archived' => {
  // Map based on status name or code from master data
  const statusMap: Record<string, 'draft' | 'published' | 'archived'> = {
    'draft': 'draft',
    'active': 'published',
    'inactive': 'archived',
  };
  return statusMap[statusId] || 'draft';
};

/**
 * Convert API CatTemplate to UI Template format
 */
export const catTemplateToUITemplate = (template: CatTemplate): UITemplate => {
  const blocks = template.blocks || [];

  // Calculate estimated duration from blocks
  const totalDuration = blocks.reduce((sum, block) => {
    const duration = block.config?.duration || 0;
    return sum + duration;
  }, 0);

  const formatDuration = (minutes: number): string => {
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  return {
    id: template.id,
    name: template.name,
    description: template.description || '',
    category: 'General', // Could be derived from blocks or added to API
    industry: 'General', // Could be added to API
    tags: [], // Could be added to API
    blocksCount: blocks.length,
    createdAt: template.created_at,
    updatedAt: template.updated_at,
    createdBy: template.created_by || 'Unknown',
    isGlobal: template.tenant_id === null,
    isFavorite: false, // Could be stored in user preferences
    usageCount: 0, // Could be tracked in API
    rating: 0, // Could be added to API
    status: statusIdToString(template.status_id),
    currentVersion: '1.0.0', // Could be added to API
    versions: [
      {
        version: '1.0.0',
        createdAt: template.created_at,
        createdBy: template.created_by || 'Unknown',
        notes: 'Current version',
        blocksCount: blocks.length,
      },
    ],
    thumbnailIcon: 'LayoutTemplate',
    estimatedDuration: formatDuration(totalDuration),
  };
};

/**
 * Convert multiple CatTemplates to UITemplates
 */
export const catTemplatesToUITemplates = (templates: CatTemplate[]): UITemplate[] => {
  return templates.map(catTemplateToUITemplate);
};

/**
 * Convert UI template data to API CreateTemplateData format
 */
export const uiTemplateToCreateData = (template: Partial<UITemplate> & { name: string }, blocks: TemplateBlock[]) => {
  return {
    name: template.name,
    description: template.description,
    blocks: blocks,
    is_public: !template.isGlobal ? false : true,
    // status_id would need to be the actual UUID from master data
  };
};

/**
 * Convert UI template updates to API UpdateTemplateData format
 */
export const uiTemplateToUpdateData = (updates: Partial<UITemplate>, blocks?: TemplateBlock[]) => {
  const data: Record<string, any> = {};

  if (updates.name !== undefined) data.name = updates.name;
  if (updates.description !== undefined) data.description = updates.description;
  if (blocks !== undefined) data.blocks = blocks;
  if (updates.isGlobal !== undefined) data.is_public = updates.isGlobal;

  return data;
};

/**
 * Convert block order from UI to API TemplateBlock format
 */
export const createTemplateBlock = (
  blockId: string,
  order: number,
  config: Record<string, any> = {}
): TemplateBlock => {
  return {
    block_id: blockId,
    order,
    config: {
      visible: true,
      ...config,
    },
  };
};

export default {
  catTemplateToUITemplate,
  catTemplatesToUITemplates,
  uiTemplateToCreateData,
  uiTemplateToUpdateData,
  createTemplateBlock,
};
