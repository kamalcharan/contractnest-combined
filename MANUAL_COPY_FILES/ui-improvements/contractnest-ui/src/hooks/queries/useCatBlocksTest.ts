// src/hooks/queries/useCatBlocksTest.ts
// v2.0: Added pagination support and version tracking

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import api from '@/services/api';
import { useState, useCallback } from 'react';

// =================================================================
// TYPES
// =================================================================

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  has_more: boolean;
}

export interface CatBlockWithVersion {
  id: string;
  name: string;
  description?: string;
  block_type_id: string;
  pricing_mode_id: string;
  config: any;
  resource_pricing?: any;
  variant_pricing?: any;
  tags?: string[];
  is_active: boolean;
  visible: boolean;
  tenant_id: string | null;
  is_seed: boolean;
  version: number;  // Track version for optimistic locking
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
}

export interface BlocksResponse {
  success: boolean;
  data: {
    blocks: CatBlockWithVersion[];
    total?: number;
    pagination?: PaginationMeta;
  };
}

export interface BlocksQueryParams {
  page?: number;
  limit?: number;
  block_type_id?: string;
  pricing_mode_id?: string;
  is_active?: boolean;
  tags?: string[];
  search?: string;
}

// =================================================================
// QUERY KEY FACTORY
// =================================================================

export const catBlocksTestKeys = {
  all: ['cat-blocks-test'] as const,
  lists: () => [...catBlocksTestKeys.all, 'list'] as const,
  list: (params: BlocksQueryParams) => [...catBlocksTestKeys.lists(), params] as const,
  details: () => [...catBlocksTestKeys.all, 'detail'] as const,
  detail: (id: string) => [...catBlocksTestKeys.details(), id] as const,
};

// =================================================================
// MAIN QUERY HOOK
// =================================================================

/**
 * Fetch blocks with optional pagination support
 * v2.0: Supports both paginated and non-paginated responses (backward-compatible)
 */
export const useCatBlocksTest = (params?: BlocksQueryParams) => {
  const { currentTenant } = useAuth();

  return useQuery({
    queryKey: params ? catBlocksTestKeys.list(params) : catBlocksTestKeys.all,
    queryFn: async (): Promise<BlocksResponse> => {
      try {
        // Build query string
        const queryParams = new URLSearchParams();

        if (params?.page) queryParams.set('page', params.page.toString());
        if (params?.limit) queryParams.set('limit', params.limit.toString());
        if (params?.block_type_id) queryParams.set('block_type_id', params.block_type_id);
        if (params?.pricing_mode_id) queryParams.set('pricing_mode_id', params.pricing_mode_id);
        if (params?.is_active !== undefined) queryParams.set('is_active', params.is_active.toString());
        if (params?.tags?.length) queryParams.set('tags', params.tags.join(','));
        if (params?.search) queryParams.set('search', params.search);

        const queryString = queryParams.toString();
        const url = `/api/catalog-studio/blocks${queryString ? `?${queryString}` : ''}`;

        const response = await api.get(url);
        return response.data;
      } catch (error) {
        console.error('API error:', error);
        return { success: true, data: { blocks: [], total: 0 } };
      }
    },
    enabled: !!currentTenant,
    staleTime: 30000, // Consider data stale after 30 seconds
  });
};

// =================================================================
// PAGINATED QUERY HOOK
// =================================================================

/**
 * Hook for paginated block fetching with state management
 */
export const useCatBlocksPaginated = (initialLimit: number = 50) => {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(initialLimit);
  const [filters, setFilters] = useState<Omit<BlocksQueryParams, 'page' | 'limit'>>({});

  const queryClient = useQueryClient();

  const query = useCatBlocksTest({
    page,
    limit,
    ...filters
  });

  // Extract pagination meta (handle both new and old response formats)
  const pagination: PaginationMeta | null = query.data?.data?.pagination || null;
  const total = pagination?.total || query.data?.data?.total || 0;
  const hasMore = pagination?.has_more || (page * limit < total);
  const totalPages = Math.ceil(total / limit);

  // Navigation helpers
  const goToPage = useCallback((newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPage(newPage);
    }
  }, [totalPages]);

  const nextPage = useCallback(() => {
    if (hasMore) {
      setPage(p => p + 1);
    }
  }, [hasMore]);

  const prevPage = useCallback(() => {
    if (page > 1) {
      setPage(p => p - 1);
    }
  }, [page]);

  const setPageSize = useCallback((newLimit: number) => {
    setLimit(newLimit);
    setPage(1); // Reset to first page when changing page size
  }, []);

  const updateFilters = useCallback((newFilters: Omit<BlocksQueryParams, 'page' | 'limit'>) => {
    setFilters(newFilters);
    setPage(1); // Reset to first page when filters change
  }, []);

  // Prefetch next page for smoother UX
  const prefetchNextPage = useCallback(() => {
    if (hasMore) {
      queryClient.prefetchQuery({
        queryKey: catBlocksTestKeys.list({ page: page + 1, limit, ...filters }),
        queryFn: async () => {
          const queryParams = new URLSearchParams();
          queryParams.set('page', (page + 1).toString());
          queryParams.set('limit', limit.toString());

          Object.entries(filters).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
              queryParams.set(key, Array.isArray(value) ? value.join(',') : String(value));
            }
          });

          const response = await api.get(`/api/catalog-studio/blocks?${queryParams.toString()}`);
          return response.data;
        },
      });
    }
  }, [queryClient, page, limit, filters, hasMore]);

  return {
    ...query,
    // Pagination state
    page,
    limit,
    total,
    totalPages,
    hasMore,
    hasPrevious: page > 1,
    pagination,
    // Navigation
    goToPage,
    nextPage,
    prevPage,
    setPageSize,
    // Filters
    filters,
    updateFilters,
    // Prefetch
    prefetchNextPage,
  };
};

// =================================================================
// VERSION TRACKING HELPERS
// =================================================================

/**
 * Get the version of a specific block from the cached data
 */
export const useBlockVersion = (blockId: string): number | null => {
  const { data } = useCatBlocksTest();

  const block = data?.data?.blocks?.find(b => b.id === blockId);
  return block?.version ?? null;
};

/**
 * Hook to track block versions for optimistic locking
 */
export const useBlockVersionTracker = () => {
  const [versionMap, setVersionMap] = useState<Map<string, number>>(new Map());

  // Update version for a block
  const updateVersion = useCallback((blockId: string, version: number) => {
    setVersionMap(prev => {
      const next = new Map(prev);
      next.set(blockId, version);
      return next;
    });
  }, []);

  // Get version for a block
  const getVersion = useCallback((blockId: string): number | undefined => {
    return versionMap.get(blockId);
  }, [versionMap]);

  // Initialize versions from blocks data
  const initializeFromBlocks = useCallback((blocks: CatBlockWithVersion[]) => {
    setVersionMap(new Map(blocks.map(b => [b.id, b.version])));
  }, []);

  // Clear all tracked versions
  const clearVersions = useCallback(() => {
    setVersionMap(new Map());
  }, []);

  return {
    versionMap,
    updateVersion,
    getVersion,
    initializeFromBlocks,
    clearVersions,
  };
};
