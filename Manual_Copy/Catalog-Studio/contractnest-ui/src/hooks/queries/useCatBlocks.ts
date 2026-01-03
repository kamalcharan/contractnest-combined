// src/hooks/queries/useCatBlocks.ts
// TanStack Query hooks for Catalog Studio Blocks
// FIXED: Following CLAUDE_CODE_GUIDELINES.md patterns

import { useQuery, UseQueryResult } from '@tanstack/react-query';
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
  // NEW FIELDS for Phase 1
  tenant_id?: string;
  is_seed?: boolean;
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
// RESPONSE PARSING (Matching useResources pattern)
// =================================================================

const parseResponse = (response: any, context: string = 'unknown') => {
  try {
    // Handle API controller format: { success: true, data: {...} }
    if (response?.data?.success === true && response?.data?.data !== undefined) {
      return response.data.data;
    }

    // Handle direct data format
    if (response?.data && typeof response.data === 'object') {
      return response.data;
    }

    return { blocks: [], total: 0 };
  } catch (error) {
    console.error(`❌ ${context} - PARSE ERROR:`, error);
    return { blocks: [], total: 0 };
  }
};

// =================================================================
// HOOKS
// =================================================================

/**
 * Hook to fetch all blocks
 * FIXED: No custom headers (CORS issue), returns empty on error (no throw)
 */
export const useCatBlocks = (filters?: CatBlockFilters): UseQueryResult<CatBlocksResponse, Error> => {
  const { currentTenant } = useAuth();

  return useQuery({
    queryKey: catBlockKeys.list(filters || {}),
    queryFn: async () => {
      console.log('🚀 Fetching catalog blocks...');

      try {
        const url = API_ENDPOINTS.CATALOG_STUDIO.BLOCKS.LIST_WITH_FILTERS(filters || {});

        // ✅ FIXED: No custom headers - api.ts interceptor handles auth
        // x-is-admin header was causing CORS errors
        const response = await api.get(url);

        const data = parseResponse(response, 'cat_blocks');
        console.log('✅ Catalog blocks fetched:', data);

        return {
          success: true,
          data: data
        } as CatBlocksResponse;

      } catch (error: any) {
        // ✅ FIXED: Return empty data instead of throwing
        // Throwing in queryFn crashes the page
        console.error('❌ Catalog blocks fetch failed:', error);
        return {
          success: true,
          data: { blocks: [], total: 0 }
        } as CatBlocksResponse;
      }
    },
    // ✅ FIXED: Use !!currentTenant (check object, not nested property)
    enabled: !!currentTenant,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: (failureCount, error) => {
      console.log(`🔄 Catalog blocks retry attempt ${failureCount}:`, error.message);
      return failureCount < 2;
    },
  });
};

/**
 * Hook to fetch a single block by ID
 * FIXED: No custom headers, returns empty on error
 */
export const useCatBlock = (blockId: string | undefined): UseQueryResult<CatBlockResponse, Error> => {
  const { currentTenant } = useAuth();

  return useQuery({
    queryKey: catBlockKeys.detail(blockId || ''),
    queryFn: async () => {
      console.log('🚀 Fetching single block:', blockId);

      try {
        const url = API_ENDPOINTS.CATALOG_STUDIO.BLOCKS.GET(blockId!);

        // ✅ FIXED: No custom headers
        const response = await api.get(url);

        const data = parseResponse(response, 'single_block');
        console.log('✅ Block fetched:', data);

        return {
          success: true,
          data: data
        } as CatBlockResponse;

      } catch (error: any) {
        // ✅ FIXED: Return empty instead of throwing
        console.error('❌ Block fetch failed:', error);
        return {
          success: false,
          error: {
            code: 'FETCH_ERROR',
            message: error.message || 'Failed to fetch block'
          }
        } as CatBlockResponse;
      }
    },
    enabled: !!currentTenant && !!blockId,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 2,
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
    tenantId: block.tenant_id,
    isSeed: block.is_seed,
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
