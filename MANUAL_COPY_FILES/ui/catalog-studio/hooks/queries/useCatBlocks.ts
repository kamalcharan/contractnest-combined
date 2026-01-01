// src/hooks/queries/useCatBlocks.ts
// TanStack Query hooks for Catalog Studio Blocks

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import api from '@/services/api';
import { API_ENDPOINTS, CatBlockFilters } from '@/services/serviceURLs';

// =================================================================
// TYPES
// =================================================================

export interface BlockConfig {
  title?: string;
  subtitle?: string;
  service_name?: string;
  base_price?: number;
  currency_id?: string;
  payment_terms?: string;
  payment_type_id?: string;
  due_days?: number;
  content?: string;
  rich_text?: boolean;
  media_url?: string;
  thumbnail_url?: string;
  alt_text?: string;
  items?: Array<{
    id: string;
    text: string;
    required: boolean;
    evidence_type_id?: string;
  }>;
  document_url?: string;
  document_name?: string;
  requires_signature?: boolean;
  [key: string]: any;
}

export interface ResourcePricingConfig {
  resource_type_id: string;
  unit_price: number;
  min_quantity?: number;
  max_quantity?: number;
  price_type_id?: string;
}

export interface VariantPricingConfig {
  variants: Array<{
    id: string;
    name: string;
    price: number;
    attributes?: Record<string, any>;
  }>;
}

export interface CatBlock {
  id: string;
  name: string;
  description?: string;
  block_type_id: string;
  pricing_mode_id: string;
  is_admin: boolean;
  visible: boolean;
  is_active: boolean;
  config: BlockConfig;
  resource_pricing?: ResourcePricingConfig;
  variant_pricing?: VariantPricingConfig;
  tags?: string[];
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface CatBlocksResponse {
  success: boolean;
  data?: {
    blocks: CatBlock[];
    total: number;
  };
  error?: {
    code: string;
    message: string;
  };
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
  };
}

export interface CatBlockResponse {
  success: boolean;
  data?: CatBlock;
  error?: {
    code: string;
    message: string;
  };
}

// =================================================================
// QUERY KEYS
// =================================================================

export const catBlockKeys = {
  all: ['catalog-studio', 'blocks'] as const,
  lists: () => [...catBlockKeys.all, 'list'] as const,
  list: (filters: CatBlockFilters) => [...catBlockKeys.lists(), { filters }] as const,
  details: () => [...catBlockKeys.all, 'detail'] as const,
  detail: (id: string) => [...catBlockKeys.details(), id] as const,
};

// =================================================================
// HOOKS
// =================================================================

/**
 * Hook to fetch all blocks (filtered by admin status automatically)
 */
export const useCatBlocks = (filters?: CatBlockFilters) => {
  const { currentTenant, isAdmin } = useAuth();

  return useQuery({
    queryKey: catBlockKeys.list(filters || {}),
    queryFn: async (): Promise<CatBlocksResponse> => {
      if (!currentTenant?.id) {
        throw new Error('Missing tenant');
      }

      const url = API_ENDPOINTS.CATALOG_STUDIO.BLOCKS.LIST_WITH_FILTERS(filters || {});

      const response = await api.get(url, {
        headers: {
          'x-is-admin': String(isAdmin || false),
        },
      });

      return response.data;
    },
    enabled: !!currentTenant?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
};

/**
 * Hook to fetch a single block by ID
 */
export const useCatBlock = (blockId: string | undefined) => {
  const { currentTenant, isAdmin } = useAuth();

  return useQuery({
    queryKey: catBlockKeys.detail(blockId || ''),
    queryFn: async (): Promise<CatBlockResponse> => {
      if (!currentTenant?.id || !blockId) {
        throw new Error('Missing tenant or block ID');
      }

      const url = API_ENDPOINTS.CATALOG_STUDIO.BLOCKS.GET(blockId);

      const response = await api.get(url, {
        headers: {
          'x-is-admin': String(isAdmin || false),
        },
      });

      return response.data;
    },
    enabled: !!currentTenant?.id && !!blockId,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
};

/**
 * Hook to get blocks formatted for dropdown/select components
 */
export const useCatBlocksForDropdown = (filters?: CatBlockFilters) => {
  const { data, isLoading, error } = useCatBlocks(filters);

  const options = data?.data?.blocks?.map((block) => ({
    value: block.id,
    label: block.name,
    description: block.description,
    blockType: block.block_type_id,
    pricingMode: block.pricing_mode_id,
    isAdmin: block.is_admin,
  })) || [];

  return {
    options,
    isLoading,
    error,
    total: data?.data?.total || 0,
  };
};

/**
 * Hook to search blocks
 */
export const useSearchCatBlocks = (searchQuery: string, additionalFilters?: Omit<CatBlockFilters, 'search'>) => {
  return useCatBlocks({
    ...additionalFilters,
    search: searchQuery,
    is_active: true,
  });
};

/**
 * Hook to get blocks by type
 */
export const useCatBlocksByType = (blockTypeId: string) => {
  return useCatBlocks({
    block_type_id: blockTypeId,
    is_active: true,
  });
};

/**
 * Hook to get blocks by pricing mode
 */
export const useCatBlocksByPricingMode = (pricingModeId: string) => {
  return useCatBlocks({
    pricing_mode_id: pricingModeId,
    is_active: true,
  });
};

// =================================================================
// EXPORTS
// =================================================================

export default {
  useCatBlocks,
  useCatBlock,
  useCatBlocksForDropdown,
  useSearchCatBlocks,
  useCatBlocksByType,
  useCatBlocksByPricingMode,
  catBlockKeys,
};
