// src/hooks/queries/useKnowledgeTree.ts
// TanStack Query hooks for Knowledge Tree edge function endpoints

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/utils/supabase';
import type {
  KnowledgeTreeCoverageMap,
  KnowledgeTreeCoverageItem,
  KnowledgeTreeSummary,
} from '@/pages/service-contracts/templates/admin/knowledge-tree/types';

// ── Query Key Factory ──────────────────────────────────────────────
export const knowledgeTreeKeys = {
  all: ['knowledge-tree'] as const,
  coverage: () => [...knowledgeTreeKeys.all, 'coverage'] as const,
  summaries: () => [...knowledgeTreeKeys.all, 'summary'] as const,
  summary: (id: string) => [...knowledgeTreeKeys.summaries(), id] as const,
  variants: (id: string) => [...knowledgeTreeKeys.all, 'variants', id] as const,
  spareParts: (id: string) => [...knowledgeTreeKeys.all, 'spare-parts', id] as const,
  checkpoints: (id: string) => [...knowledgeTreeKeys.all, 'checkpoints', id] as const,
  cycles: (id: string) => [...knowledgeTreeKeys.all, 'cycles', id] as const,
  overlays: (id: string) => [...knowledgeTreeKeys.all, 'overlays', id] as const,
};

// ── Helper: Call Knowledge Tree Edge Function ──────────────────────
async function callKnowledgeTreeEdge<T>(
  path: string,
  params?: Record<string, string>,
): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession();
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://uwyqhzotluikawcboldr.supabase.co';
  const anonKey = import.meta.env.VITE_SUPABASE_KEY;

  const url = new URL(`${supabaseUrl}/functions/v1/knowledge-tree/${path}`);
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-is-admin': 'true',
  };

  if (session?.access_token) {
    headers['Authorization'] = `Bearer ${session.access_token}`;
  }
  if (anonKey) {
    headers['apikey'] = anonKey;
  }

  const response = await fetch(url.toString(), { headers });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Knowledge Tree API error (${response.status}): ${errorBody}`);
  }

  return response.json();
}

// ── Hook: Coverage Map ─────────────────────────────────────────────
// Lightweight query: checks which resource_template_ids have KT data
// by counting variants, parts, checkpoints from the master tables.
export const useKnowledgeTreeCoverage = () => {
  return useQuery({
    queryKey: knowledgeTreeKeys.coverage(),
    queryFn: async (): Promise<KnowledgeTreeCoverageMap> => {
      // Parallel fetch counts from 3 master tables
      const [variantsRes, partsRes, checkpointsRes] = await Promise.all([
        supabase
          .from('m_equipment_variants')
          .select('resource_template_id')
          .eq('is_active', true),
        supabase
          .from('m_equipment_spare_parts')
          .select('resource_template_id')
          .eq('is_active', true),
        supabase
          .from('m_equipment_checkpoints')
          .select('resource_template_id')
          .eq('is_active', true),
      ]);

      const coverageMap: KnowledgeTreeCoverageMap = {};

      const countBy = (rows: { resource_template_id: string }[] | null) => {
        if (!rows) return;
        for (const row of rows) {
          const id = row.resource_template_id;
          if (!coverageMap[id]) {
            coverageMap[id] = {
              resource_template_id: id,
              variants_count: 0,
              spare_parts_count: 0,
              checkpoints_count: 0,
            };
          }
        }
      };

      // Initialize entries
      countBy(variantsRes.data);
      countBy(partsRes.data);
      countBy(checkpointsRes.data);

      // Count variants
      if (variantsRes.data) {
        for (const row of variantsRes.data) {
          if (coverageMap[row.resource_template_id]) {
            coverageMap[row.resource_template_id].variants_count++;
          }
        }
      }

      // Count spare parts
      if (partsRes.data) {
        for (const row of partsRes.data) {
          if (coverageMap[row.resource_template_id]) {
            coverageMap[row.resource_template_id].spare_parts_count++;
          }
        }
      }

      // Count checkpoints
      if (checkpointsRes.data) {
        for (const row of checkpointsRes.data) {
          if (coverageMap[row.resource_template_id]) {
            coverageMap[row.resource_template_id].checkpoints_count++;
          }
        }
      }

      return coverageMap;
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
};

// ── Hook: Full Summary for a Single Resource Template ──────────────
export const useKnowledgeTreeSummary = (resourceTemplateId: string | undefined) => {
  return useQuery({
    queryKey: knowledgeTreeKeys.summary(resourceTemplateId || ''),
    queryFn: () =>
      callKnowledgeTreeEdge<KnowledgeTreeSummary>('summary', {
        resource_template_id: resourceTemplateId!,
      }),
    enabled: !!resourceTemplateId,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
};

// ── Hook: Variants for a Resource Template ─────────────────────────
export const useKnowledgeTreeVariants = (resourceTemplateId: string | undefined) => {
  return useQuery({
    queryKey: knowledgeTreeKeys.variants(resourceTemplateId || ''),
    queryFn: () =>
      callKnowledgeTreeEdge<{ count: number; variants: any[] }>('variants', {
        resource_template_id: resourceTemplateId!,
      }),
    enabled: !!resourceTemplateId,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
};
