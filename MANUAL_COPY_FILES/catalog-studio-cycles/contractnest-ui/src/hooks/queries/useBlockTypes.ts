// src/hooks/queries/useBlockTypes.ts
// Hook to fetch block types from m_category_details (cat_block_type)
// Following CLAUDE_CODE_GUIDELINES.md patterns

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import api from '@/services/api';
import { BlockCategory } from '@/types/catalogStudio';

// =================================================================
// TYPES
// =================================================================

// Raw data from m_category_details table
export interface BlockTypeDetail {
  id: string;
  category_id: string;
  sub_cat_name: string;      // e.g., 'service', 'spare', 'billing'
  display_name: string;      // e.g., 'Service', 'Spare Part', 'Billing'
  description: string | null;
  icon_name: string | null;  // Lucide icon name e.g., 'Briefcase'
  hexcolor: string | null;   // e.g., '#4F46E5'
  sequence_no: number;
  is_active: boolean;
  is_deletable: boolean;
  tags?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface BlockTypesResponse {
  success: boolean;
  data?: BlockTypeDetail[];
  category_info?: {
    id: string;
    name: string;
    description: string | null;
  };
  error?: string;
  message?: string;
}

// =================================================================
// CONSTANTS
// =================================================================

// Category name for block types in m_category_master
export const BLOCK_TYPES_CATEGORY = 'cat_block_type';
export const PRICING_MODES_CATEGORY = 'cat_pricing_mode';

// Default colors for block types (used when hexcolor is null)
const DEFAULT_COLORS: Record<string, { color: string; bgColor: string }> = {
  service: { color: '#4F46E5', bgColor: '#EEF2FF' },
  spare: { color: '#059669', bgColor: '#ECFDF5' },
  billing: { color: '#D97706', bgColor: '#FFFBEB' },
  text: { color: '#6B7280', bgColor: '#F9FAFB' },
  video: { color: '#DC2626', bgColor: '#FEF2F2' },
  image: { color: '#7C3AED', bgColor: '#F5F3FF' },
  checklist: { color: '#0891B2', bgColor: '#ECFEFF' },
  document: { color: '#64748B', bgColor: '#F8FAFC' },
};

// Default icon mapping (when icon_name is null)
const DEFAULT_ICONS: Record<string, string> = {
  service: 'Briefcase',
  spare: 'Package',
  billing: 'CreditCard',
  text: 'FileText',
  video: 'Video',
  image: 'Image',
  checklist: 'CheckSquare',
  document: 'Paperclip',
};

// =================================================================
// QUERY KEYS
// =================================================================

export const blockTypeKeys = {
  all: ['catalog-studio', 'block-types'] as const,
  list: () => [...blockTypeKeys.all, 'list'] as const,
  detail: (id: string) => [...blockTypeKeys.all, 'detail', id] as const,
};

// =================================================================
// HELPER FUNCTIONS
// =================================================================

/**
 * Generate a lighter background color from hex color
 */
const generateBgColor = (hexColor: string): string => {
  // Remove # if present
  const hex = hexColor.replace('#', '');

  // Convert to RGB
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  // Lighten by mixing with white (90% white)
  const lightR = Math.round(r + (255 - r) * 0.9);
  const lightG = Math.round(g + (255 - g) * 0.9);
  const lightB = Math.round(b + (255 - b) * 0.9);

  // Convert back to hex
  return `#${lightR.toString(16).padStart(2, '0')}${lightG.toString(16).padStart(2, '0')}${lightB.toString(16).padStart(2, '0')}`;
};

/**
 * Map m_category_details to BlockCategory format
 */
export const mapDetailToBlockCategory = (detail: BlockTypeDetail): BlockCategory => {
  const defaultColors = DEFAULT_COLORS[detail.sub_cat_name] || { color: '#6B7280', bgColor: '#F9FAFB' };
  const color = detail.hexcolor || defaultColors.color;

  return {
    id: detail.sub_cat_name,
    dbId: detail.id, // Actual UUID for database operations
    name: detail.display_name,
    icon: detail.icon_name || DEFAULT_ICONS[detail.sub_cat_name] || 'Box',
    count: 0, // Will be updated with actual block count if needed
    color: color,
    bgColor: detail.hexcolor ? generateBgColor(detail.hexcolor) : defaultColors.bgColor,
    description: detail.description || `${detail.display_name} blocks`,
  };
};

// =================================================================
// HOOKS
// =================================================================

/**
 * Hook to fetch block types from database
 * Uses useTenantMasterData pattern but with direct API call
 * Following CLAUDE_CODE_GUIDELINES.md: No throw in queryFn, return empty on error
 */
export const useBlockTypes = () => {
  const { currentTenant } = useAuth();

  return useQuery({
    queryKey: blockTypeKeys.list(),
    queryFn: async (): Promise<BlockTypesResponse> => {
      console.log('🚀 Fetching block types from database...');

      try {
        // Use the product-masterdata endpoint pattern
        // ✅ FIX: category_name is a query parameter, not a path parameter
        const url = `/api/product-masterdata/global?category_name=${BLOCK_TYPES_CATEGORY}&is_active=true`;

        const response = await api.get(url);

        if (response.data?.success && response.data?.data) {
          console.log('✅ Block types fetched:', response.data.data.length);
          return {
            success: true,
            data: response.data.data,
            category_info: response.data.category_info,
          };
        }

        // If no data, return empty
        return {
          success: true,
          data: [],
        };

      } catch (error: any) {
        // ✅ FIXED: Return empty data instead of throwing (per CLAUDE_CODE_GUIDELINES.md)
        console.error('❌ Block types fetch failed:', error);
        return {
          success: false,
          data: [],
          error: error.message || 'Failed to fetch block types',
        };
      }
    },
    enabled: !!currentTenant,
    staleTime: 30 * 60 * 1000, // 30 minutes - block types rarely change
    gcTime: 60 * 60 * 1000,    // 1 hour cache
    refetchOnWindowFocus: false,
    retry: 2,
  });
};

/**
 * Hook to get block types formatted as BlockCategory[]
 * Combines DB data with fallback to hardcoded categories
 */
export const useBlockCategories = () => {
  const { data, isLoading, error, isSuccess } = useBlockTypes();

  // Map database results to BlockCategory format
  const categories: BlockCategory[] = data?.data?.map(mapDetailToBlockCategory) || [];

  return {
    categories,
    isLoading,
    error,
    isSuccess,
    isEmpty: categories.length === 0,
    // Helper to get category by ID (string like 'service')
    getCategoryById: (id: string) => categories.find(c => c.id === id),
    // Helper to get category by name
    getCategoryByName: (name: string) => categories.find(c => c.name.toLowerCase() === name.toLowerCase()),
    // Helper to get the database UUID for a block type (for API calls)
    getDbIdByType: (typeId: string) => categories.find(c => c.id === typeId)?.dbId,
  };
};

/**
 * Hook for dropdown/select components
 */
export const useBlockTypesDropdown = () => {
  const { categories, isLoading, error } = useBlockCategories();

  const options = categories.map(cat => ({
    value: cat.id,
    label: cat.name,
    icon: cat.icon,
    color: cat.color,
    description: cat.description,
  }));

  return {
    options,
    isLoading,
    error,
  };
};

// =================================================================
// PRICING MODES HOOK
// =================================================================

export interface PricingMode {
  id: string;      // e.g., 'independent', 'resource_based'
  dbId: string;    // Actual UUID for database operations
  name: string;
  description?: string;
}

/**
 * Hook to fetch pricing modes from database
 */
export const usePricingModes = () => {
  const { currentTenant } = useAuth();

  const query = useQuery({
    queryKey: ['catalog-studio', 'pricing-modes'],
    queryFn: async (): Promise<BlockTypesResponse> => {
      console.log('🚀 Fetching pricing modes from database...');

      try {
        const url = `/api/product-masterdata/global?category_name=${PRICING_MODES_CATEGORY}&is_active=true`;
        const response = await api.get(url);

        if (response.data?.success && response.data?.data) {
          console.log('✅ Pricing modes fetched:', response.data.data.length);
          return {
            success: true,
            data: response.data.data,
          };
        }

        return { success: true, data: [] };
      } catch (error: any) {
        console.error('❌ Pricing modes fetch failed:', error);
        return { success: false, data: [], error: error.message };
      }
    },
    enabled: !!currentTenant,
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 2,
  });

  // Map to PricingMode format
  const pricingModes: PricingMode[] = query.data?.data?.map(detail => ({
    id: detail.sub_cat_name,
    dbId: detail.id,
    name: detail.display_name,
    description: detail.description || undefined,
  })) || [];

  return {
    pricingModes,
    isLoading: query.isLoading,
    error: query.error,
    // Helper to get the database UUID for a pricing mode (for API calls)
    getDbIdByMode: (modeId: string) => pricingModes.find(m => m.id === modeId)?.dbId,
  };
};

// =================================================================
// EXPORTS
// =================================================================

export default {
  useBlockTypes,
  useBlockCategories,
  useBlockTypesDropdown,
  usePricingModes,
  blockTypeKeys,
  mapDetailToBlockCategory,
  BLOCK_TYPES_CATEGORY,
  PRICING_MODES_CATEGORY,
};
