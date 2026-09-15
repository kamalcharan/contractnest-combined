// src/hooks/queries/useCatBlocksTest.ts
// v2.0: Added pagination support and version tracking
// FIXED: Maintained backward compatibility with original implementation

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import api from '@/services/api';

// =================================================================
// MAIN QUERY HOOK - BACKWARD COMPATIBLE
// =================================================================

/**
 * Fetch blocks - maintains original behavior
 * The version field is now included in block responses from Edge v2.0
 */
export const useCatBlocksTest = (options?: { strict?: boolean; enabled?: boolean }) => {
  const { currentTenant, isLive } = useAuth();

  return useQuery({
    // Tenant MUST be part of the key. Without it the block list is cached
    // tenant-agnostically, so switching tenant serves the previous tenant's
    // blocks and deletions appear not to have taken effect until a hard refresh.
    queryKey: options?.strict ? ['cat-blocks-experience', currentTenant?.id, isLive] : ['cat-blocks-test', currentTenant?.id],
    queryFn: async () => {
      try {
        if (options?.strict) {
          const blocks: any[] = [];
          for (let page = 1; page <= 100; page++) {
            const response = await api.get(`/api/catalog-studio/blocks?page=${page}&limit=100`, { headers: { 'x-environment': isLive ? 'live' : 'test' } });
            const data = response.data?.data;
            const pagination = data?.pagination;
            if (response.data?.success !== true || !Array.isArray(data?.blocks) || !Number.isInteger(pagination?.total) || pagination.total < 0 || pagination.page !== page || typeof pagination.has_more !== 'boolean') throw new Error('Catalogue pagination response is incomplete.');
            const seen = new Set(blocks.map(b => b.id));
            for (const b of data.blocks) {
              if (!b?.id || seen.has(b.id)) throw new Error('Catalogue pagination returned duplicate or missing IDs.');
              if (b.is_live !== isLive || (b.tenant_id !== null && b.tenant_id !== currentTenant?.id)) throw new Error('Catalogue workspace or environment does not match.');
              seen.add(b.id);
            }
            blocks.push(...data.blocks);
            if (!pagination.has_more) {
              if (blocks.length !== pagination.total) throw new Error('Catalogue count changed while loading. Retry catalogue.');
              return { success: true, data: { blocks, total: pagination.total } };
            }
            if (!data.blocks.length) throw new Error('Catalogue pagination did not advance.');
          }
          throw new Error('Catalogue could not be loaded completely.');
        }
        // ✅ No custom headers - api.ts interceptor handles auth
        const response = await api.get('/api/catalog-studio/blocks');
        return response.data;
      } catch (error) {
        if (options?.strict) throw error;
        console.error('API error:', error);
        return { success: true, data: { blocks: [], total: 0 } };
      }
    },
    enabled: !!currentTenant && options?.enabled !== false,
    retry: options?.strict ? false : undefined,
  });
};

// =================================================================
// VERSION TRACKING HELPER
// =================================================================

/**
 * Get the version of a specific block from the response data
 * Blocks now include 'version' field from Edge v2.0
 */
export const getBlockVersion = (blocks: any[], blockId: string): number | undefined => {
  const block = blocks?.find((b: any) => b.id === blockId);
  return block?.version;
};
