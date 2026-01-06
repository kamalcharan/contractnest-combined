// src/hooks/queries/useCatBlocks.ts
// TanStack Query hook for fetching Catalog Studio blocks

import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { API_ENDPOINTS } from '../../services/serviceURLs';

// Types matching the API response
export interface CatBlock {
  id: string;
  tenant_id: string | null;
  name: string;
  description: string | null;
  block_type_id: string;
  block_type?: {
    id: string;
    code: string;
    name: string;
    icon: string;
    color: string;
  };
  pricing_mode_id: string;
  pricing_mode?: {
    id: string;
    code: string;
    name: string;
  };
  base_price: number | null;
  currency: string;
  duration_minutes: number | null;
  is_active: boolean;
  is_system: boolean;
  metadata: Record<string, any> | null;
  created_at: string;
  updated_at: string;
}

export interface CatBlocksResponse {
  success: boolean;
  data: {
    blocks: CatBlock[];
    total: number;
  };
  error?: string;
}

export interface CatBlockResponse {
  success: boolean;
  data: CatBlock;
  error?: string;
}

// Query keys
export const catBlocksKeys = {
  all: ['cat-blocks'] as const,
  lists: () => [...catBlocksKeys.all, 'list'] as const,
  list: (filters: Record<string, any>) => [...catBlocksKeys.lists(), filters] as const,
  details: () => [...catBlocksKeys.all, 'detail'] as const,
  detail: (id: string) => [...catBlocksKeys.details(), id] as const,
};

// Fetch all blocks
const fetchCatBlocks = async (): Promise<CatBlocksResponse> => {
  const response = await fetch(API_ENDPOINTS.CATALOG_STUDIO.BLOCKS.LIST, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      // Add auth header if needed
      // 'Authorization': `Bearer ${token}`,
    },
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to fetch blocks' }));
    throw new Error(error.error || 'Failed to fetch blocks');
  }

  return response.json();
};

// Fetch single block by ID
const fetchCatBlock = async (id: string): Promise<CatBlockResponse> => {
  const response = await fetch(API_ENDPOINTS.CATALOG_STUDIO.BLOCKS.GET(id), {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to fetch block' }));
    throw new Error(error.error || 'Failed to fetch block');
  }

  return response.json();
};

// Hook to fetch all blocks
export const useCatBlocks = (
  options?: Omit<UseQueryOptions<CatBlocksResponse, Error>, 'queryKey' | 'queryFn'>
) => {
  return useQuery<CatBlocksResponse, Error>({
    queryKey: catBlocksKeys.lists(),
    queryFn: fetchCatBlocks,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
    ...options,
  });
};

// Hook to fetch single block
export const useCatBlock = (
  id: string | undefined,
  options?: Omit<UseQueryOptions<CatBlockResponse, Error>, 'queryKey' | 'queryFn'>
) => {
  return useQuery<CatBlockResponse, Error>({
    queryKey: catBlocksKeys.detail(id!),
    queryFn: () => fetchCatBlock(id!),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    ...options,
  });
};

export default useCatBlocks;
