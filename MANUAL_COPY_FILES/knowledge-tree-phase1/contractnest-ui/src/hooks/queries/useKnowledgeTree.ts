// src/hooks/queries/useKnowledgeTree.ts
// TanStack Query hooks for Knowledge Tree edge function endpoints

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/utils/supabase';
import type {
  KnowledgeTreeCoverageMap,
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
// Calls GET /knowledge-tree/coverage (uses service_role key, bypasses RLS)
export const useKnowledgeTreeCoverage = () => {
  return useQuery({
    queryKey: knowledgeTreeKeys.coverage(),
    queryFn: async (): Promise<KnowledgeTreeCoverageMap> => {
      const response = await callKnowledgeTreeEdge<{
        count: number;
        coverage: KnowledgeTreeCoverageMap;
      }>('coverage');
      return response.coverage;
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
