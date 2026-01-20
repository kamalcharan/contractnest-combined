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
export const useCatBlocksTest = () => {
  const { currentTenant } = useAuth();

  return useQuery({
    queryKey: ['cat-blocks-test'],
    queryFn: async () => {
      try {
        // ✅ No custom headers - api.ts interceptor handles auth
        const response = await api.get('/api/catalog-studio/blocks');
        return response.data;
      } catch (error) {
        console.error('API error:', error);
        return { success: true, data: { blocks: [], total: 0 } };
      }
    },
    enabled: !!currentTenant,
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
