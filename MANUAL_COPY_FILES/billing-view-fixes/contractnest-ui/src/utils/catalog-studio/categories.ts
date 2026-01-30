// src/utils/catalog-studio/categories.ts
// Block categories utility with database fallback
// Phase 3: Block types now come from m_category_details (cat_block_type)

import { BlockCategory } from '../../types/catalogStudio';

// =================================================================
// FALLBACK DATA
// These are used when database fetch fails or during initial load
// =================================================================

export const BLOCK_CATEGORIES: BlockCategory[] = [
  {
    id: 'service',
    name: 'Service',
    icon: 'Briefcase',
    count: 0,
    color: '#4F46E5',
    bgColor: '#EEF2FF',
    description: 'Deliverable work items with SLA',
  },
  {
    id: 'spare',
    name: 'Spare Part',
    icon: 'Package',
    count: 0,
    color: '#059669',
    bgColor: '#ECFDF5',
    description: 'Physical products with inventory',
  },
  {
    id: 'billing',
    name: 'Billing',
    icon: 'CreditCard',
    count: 0,
    color: '#D97706',
    bgColor: '#FFFBEB',
    description: 'Payment structures',
  },
  {
    id: 'text',
    name: 'Text',
    icon: 'FileText',
    count: 0,
    color: '#6B7280',
    bgColor: '#F9FAFB',
    description: 'Terms, conditions, policies',
  },
  {
    id: 'video',
    name: 'Video',
    icon: 'Video',
    count: 0,
    color: '#DC2626',
    bgColor: '#FEF2F2',
    description: 'Embedded video content',
  },
  {
    id: 'image',
    name: 'Image',
    icon: 'Image',
    count: 0,
    color: '#7C3AED',
    bgColor: '#F5F3FF',
    description: 'Photos and diagrams',
  },
  {
    id: 'checklist',
    name: 'Checklist',
    icon: 'CheckSquare',
    count: 0,
    color: '#0891B2',
    bgColor: '#ECFEFF',
    description: 'Task verification lists',
  },
  {
    id: 'document',
    name: 'Document',
    icon: 'Paperclip',
    count: 0,
    color: '#64748B',
    bgColor: '#F8FAFC',
    description: 'File attachments',
  },
];

// =================================================================
// HELPER FUNCTIONS
// =================================================================

/**
 * Get category by ID (from fallback data)
 * For dynamic data, use useBlockCategories().getCategoryById() instead
 */
export const getCategoryById = (id: string): BlockCategory | undefined => {
  return BLOCK_CATEGORIES.find((c) => c.id === id);
};

/**
 * Get category by name (from fallback data)
 */
export const getCategoryByName = (name: string): BlockCategory | undefined => {
  return BLOCK_CATEGORIES.find((c) => c.name.toLowerCase() === name.toLowerCase());
};

/**
 * Merge database categories with fallback
 * Ensures all expected categories exist even if DB is incomplete
 */
export const mergeWithFallback = (dbCategories: BlockCategory[]): BlockCategory[] => {
  if (!dbCategories || dbCategories.length === 0) {
    return BLOCK_CATEGORIES;
  }

  // Create a map of DB categories by ID
  const dbMap = new Map(dbCategories.map(c => [c.id, c]));

  // Merge: use DB data if available, fallback otherwise
  const merged = BLOCK_CATEGORIES.map(fallback => {
    const dbCategory = dbMap.get(fallback.id);
    if (dbCategory) {
      // DB category exists - use it but ensure all fields are present
      return {
        ...fallback,
        ...dbCategory,
        // Ensure these fields are never undefined
        count: dbCategory.count ?? fallback.count,
        bgColor: dbCategory.bgColor || fallback.bgColor,
      };
    }
    return fallback;
  });

  // Add any DB categories that aren't in fallback
  dbCategories.forEach(dbCat => {
    if (!BLOCK_CATEGORIES.find(f => f.id === dbCat.id)) {
      merged.push(dbCat);
    }
  });

  return merged;
};

/**
 * Generate lighter background color from hex
 */
export const generateBgColorFromHex = (hexColor: string): string => {
  const hex = hexColor.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  // Lighten by mixing with white (90% white)
  const lightR = Math.round(r + (255 - r) * 0.9);
  const lightG = Math.round(g + (255 - g) * 0.9);
  const lightB = Math.round(b + (255 - b) * 0.9);

  return `#${lightR.toString(16).padStart(2, '0')}${lightG.toString(16).padStart(2, '0')}${lightB.toString(16).padStart(2, '0')}`;
};

// =================================================================
// CATEGORY METADATA
// Additional metadata that may not be in DB
// =================================================================

export const CATEGORY_METADATA: Record<string, {
  wizardSteps: string[];
  defaultPricingMode: string;
  supportsResources: boolean;
  supportsVariants: boolean;
}> = {
  service: {
    wizardSteps: ['basic', 'pricing', 'resources', 'rules', 'review'],
    defaultPricingMode: 'independent',
    supportsResources: true,
    supportsVariants: false,
  },
  spare: {
    wizardSteps: ['basic', 'pricing', 'inventory', 'review'],
    defaultPricingMode: 'variant_based',
    supportsResources: false,
    supportsVariants: true,
  },
  billing: {
    wizardSteps: ['basic', 'payment', 'review'],
    defaultPricingMode: 'independent',
    supportsResources: false,
    supportsVariants: false,
  },
  text: {
    wizardSteps: ['basic', 'content', 'review'],
    defaultPricingMode: 'independent',
    supportsResources: false,
    supportsVariants: false,
  },
  video: {
    wizardSteps: ['basic', 'media', 'review'],
    defaultPricingMode: 'independent',
    supportsResources: false,
    supportsVariants: false,
  },
  image: {
    wizardSteps: ['basic', 'media', 'review'],
    defaultPricingMode: 'independent',
    supportsResources: false,
    supportsVariants: false,
  },
  checklist: {
    wizardSteps: ['basic', 'items', 'review'],
    defaultPricingMode: 'independent',
    supportsResources: false,
    supportsVariants: false,
  },
  document: {
    wizardSteps: ['basic', 'upload', 'review'],
    defaultPricingMode: 'independent',
    supportsResources: false,
    supportsVariants: false,
  },
};

/**
 * Get wizard steps for a category
 */
export const getWizardSteps = (categoryId: string): string[] => {
  return CATEGORY_METADATA[categoryId]?.wizardSteps || ['basic', 'review'];
};

/**
 * Get default pricing mode for a category
 */
export const getDefaultPricingMode = (categoryId: string): string => {
  return CATEGORY_METADATA[categoryId]?.defaultPricingMode || 'independent';
};

/**
 * Check if category supports resources
 */
export const supportsResources = (categoryId: string): boolean => {
  return CATEGORY_METADATA[categoryId]?.supportsResources ?? false;
};

/**
 * Check if category supports variants
 */
export const supportsVariants = (categoryId: string): boolean => {
  return CATEGORY_METADATA[categoryId]?.supportsVariants ?? false;
};

/**
 * Check if category supports pricing
 * Determined by whether 'pricing' is in the wizard steps for that category
 */
export const categoryHasPricing = (categoryId: string): boolean => {
  return getWizardSteps(categoryId).includes('pricing');
};
