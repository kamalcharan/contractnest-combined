// src/hooks/queries/useKnowledgeTree.ts
// TanStack Query hooks for Knowledge Tree edge function endpoints

import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/utils/supabase';
import type {
  KnowledgeTreeCoverageMap,
  KnowledgeTreeSummary,
  KTEquipmentMeta,
  KTComplianceDefault,
} from '@/pages/service-contracts/templates/admin/knowledge-tree/types';

// ── Query Key Factory ─────────────────────────────────────────────────────
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
  snapshots: (id: string) => [...knowledgeTreeKeys.all, 'snapshots', id] as const,
  equipmentMeta: (id: string) => [...knowledgeTreeKeys.all, 'equipment-meta', id] as const,
  complianceDefaults: (subCategory: string) => [...knowledgeTreeKeys.all, 'compliance-defaults', subCategory] as const,
};

// ── Helper: GET from edge function ────────────────────────────────────────
async function callKnowledgeTreeEdge<T>(path: string, params?: Record<string, string>): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession();
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://uwyqhzotluikawcboldr.supabase.co';
  const anonKey = import.meta.env.VITE_SUPABASE_KEY;
  const url = new URL(`${supabaseUrl}/functions/v1/knowledge-tree/${path}`);
  if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const headers: Record<string, string> = { 'Content-Type': 'application/json', 'x-is-admin': 'true' };
  if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`;
  if (anonKey) headers['apikey'] = anonKey;
  const response = await fetch(url.toString(), { headers });
  if (!response.ok) { const errorBody = await response.text(); throw new Error(`Knowledge Tree API error (${response.status}): ${errorBody}`); }
  return response.json();
}

// ── Helper: POST to edge function ─────────────────────────────────────────
async function postKnowledgeTreeEdge<T>(path: string, body: unknown): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession();
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://uwyqhzotluikawcboldr.supabase.co';
  const anonKey = import.meta.env.VITE_SUPABASE_KEY;
  const url = `${supabaseUrl}/functions/v1/knowledge-tree/${path}`;
  const headers: Record<string, string> = { 'Content-Type': 'application/json', 'x-is-admin': 'true' };
  if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`;
  if (anonKey) headers['apikey'] = anonKey;
  const response = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
  if (!response.ok) { const errorBody = await response.text(); throw new Error(`Knowledge Tree save error (${response.status}): ${errorBody}`); }
  return response.json();
}

// ── Queries ───────────────────────────────────────────────────────────────
export const useKnowledgeTreeCoverage = () => useQuery({
  queryKey: knowledgeTreeKeys.coverage(),
  queryFn: async (): Promise<KnowledgeTreeCoverageMap> => {
    const response = await callKnowledgeTreeEdge<{ count: number; coverage: KnowledgeTreeCoverageMap }>('coverage');
    return response.coverage;
  },
  staleTime: 5 * 60 * 1000, gcTime: 10 * 60 * 1000, refetchOnWindowFocus: false,
});

export const useKnowledgeTreeSummary = (resourceTemplateId: string | undefined) => useQuery({
  queryKey: knowledgeTreeKeys.summary(resourceTemplateId || ''),
  queryFn: () => callKnowledgeTreeEdge<KnowledgeTreeSummary>('summary', { resource_template_id: resourceTemplateId! }),
  enabled: !!resourceTemplateId,
  staleTime: 5 * 60 * 1000, gcTime: 10 * 60 * 1000, refetchOnWindowFocus: false,
});

export const useKnowledgeTreeVariants = (resourceTemplateId: string | undefined) => useQuery({
  queryKey: knowledgeTreeKeys.variants(resourceTemplateId || ''),
  queryFn: () => callKnowledgeTreeEdge<{ count: number; variants: any[] }>('variants', { resource_template_id: resourceTemplateId! }),
  enabled: !!resourceTemplateId, staleTime: 5 * 60 * 1000, refetchOnWindowFocus: false,
});

export const useKnowledgeTreeOverlays = (resourceTemplateId: string | undefined) => useQuery({
  queryKey: knowledgeTreeKeys.overlays(resourceTemplateId || ''),
  queryFn: () => callKnowledgeTreeEdge<{ count: number; overlays: any[] }>('overlays', { resource_template_id: resourceTemplateId! }),
  enabled: !!resourceTemplateId, staleTime: 2 * 60 * 1000, refetchOnWindowFocus: false,
});

export const useKTEquipmentMeta = (resourceTemplateId: string | undefined) => useQuery({
  queryKey: knowledgeTreeKeys.equipmentMeta(resourceTemplateId || ''),
  queryFn: async (): Promise<KTEquipmentMeta | null> => {
    const res = await callKnowledgeTreeEdge<{ equipment_meta: KTEquipmentMeta | null }>('equipment-meta', { resource_template_id: resourceTemplateId! });
    return res.equipment_meta;
  },
  enabled: !!resourceTemplateId, staleTime: 5 * 60 * 1000, refetchOnWindowFocus: false,
});

// ── Mutations ─────────────────────────────────────────────────────────────
export const useUpsertEquipmentMeta = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { resource_template_id: string; equipment_criticality: 'life_critical' | 'mission_critical' | 'standard'; calibration_interval_days?: number | null; notes?: string | null }) =>
      postKnowledgeTreeEdge<{ status: string; equipment_meta: KTEquipmentMeta }>('equipment-meta', payload),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: knowledgeTreeKeys.equipmentMeta(variables.resource_template_id) });
      queryClient.invalidateQueries({ queryKey: knowledgeTreeKeys.summary(variables.resource_template_id) });
    },
  });
};

export const useKTComplianceDefaults = (subCategory: string | undefined) => useQuery({
  queryKey: knowledgeTreeKeys.complianceDefaults(subCategory || ''),
  queryFn: async (): Promise<KTComplianceDefault[]> => {
    const res = await callKnowledgeTreeEdge<{ count: number; defaults: KTComplianceDefault[]; by_sub_category: Record<string, KTComplianceDefault[]> }>('compliance-defaults', subCategory ? { sub_category: subCategory } : undefined);
    return res.defaults;
  },
  enabled: true, staleTime: 30 * 60 * 1000, refetchOnWindowFocus: false,
});

export interface ComplianceTag { checkpoint_id: string; compliance_standard: string | null; is_mandatory: boolean; }

export const useTagCompliance = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { resource_template_id: string; tags: ComplianceTag[] }) =>
      postKnowledgeTreeEdge<{ status: string; updated: number; resource_template_id: string }>('tag-compliance', payload),
    onSuccess: (_data, variables) => { queryClient.invalidateQueries({ queryKey: knowledgeTreeKeys.summary(variables.resource_template_id) }); },
  });
};

export const useSaveContextOverlays = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { resource_template_id: string; context_overlays: any[] }) =>
      postKnowledgeTreeEdge<{ status: string; inserted: Record<string, number> }>('save', { ...payload, save_mode: 'overlays' }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: knowledgeTreeKeys.overlays(variables.resource_template_id) });
      queryClient.invalidateQueries({ queryKey: knowledgeTreeKeys.summary(variables.resource_template_id) });
    },
  });
};

export const useKnowledgeTreeDelete = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (resource_template_id: string) => postKnowledgeTreeEdge<{ status: string }>('delete', { resource_template_id }),
    onSuccess: (_data, resource_template_id) => {
      queryClient.invalidateQueries({ queryKey: knowledgeTreeKeys.coverage() });
      queryClient.invalidateQueries({ queryKey: knowledgeTreeKeys.summary(resource_template_id) });
      queryClient.invalidateQueries({ queryKey: knowledgeTreeKeys.snapshots(resource_template_id) });
      queryClient.invalidateQueries({ queryKey: knowledgeTreeKeys.equipmentMeta(resource_template_id) });
    },
  });
};

export const useKnowledgeTreeSave = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { resource_template_id: string; variants?: any[]; spare_parts?: any[]; spare_part_variant_map?: any[]; checkpoints?: any[]; checkpoint_values?: any[]; checkpoint_variant_map?: any[]; service_cycles?: any[]; context_overlays?: any[] }) =>
      postKnowledgeTreeEdge<{ status: string; inserted: Record<string, number> }>('save', payload),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: knowledgeTreeKeys.summary(variables.resource_template_id) });
      queryClient.invalidateQueries({ queryKey: knowledgeTreeKeys.coverage() });
    },
  });
};

// ── Stepwise Generation Mutations ─────────────────────────────────────────
// Each step: generate via API → save to DB via edge function → invalidate queries.
// UI reads real UUIDs from DB (via summary) and passes them to the next step.

// Step 1: Variants only
export const useKTGenerateVariants = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { equipmentName: string; subCategory: string; resourceTemplateId: string }) => {
      const { default: api } = await import('@/services/api');
      const response = await api.post('/api/knowledge-tree/generate-variants', payload, { timeout: 60000 });
      if (!response.data?.success) throw new Error(response.data?.error?.message || 'Variant generation failed');
      await postKnowledgeTreeEdge('save', { ...response.data.data, save_mode: 'variants' });
      return response.data.data as { resource_template_id: string; variants: any[] };
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: knowledgeTreeKeys.summary(variables.resourceTemplateId) });
      queryClient.invalidateQueries({ queryKey: knowledgeTreeKeys.variants(variables.resourceTemplateId) });
      queryClient.invalidateQueries({ queryKey: knowledgeTreeKeys.coverage() });
    },
  });
};

// Step 2: Spare parts — UI passes variants[] read from DB
export const useKTGenerateSpareParts = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { equipmentName: string; subCategory: string; resourceTemplateId: string; layer?: string; variants: Array<{ id: string; name: string; capacity_range?: string | null }> }) => {
      const { default: api } = await import('@/services/api');
      const response = await api.post('/api/knowledge-tree/generate-spare-parts', payload, { timeout: 120000 });
      if (!response.data?.success) throw new Error(response.data?.error?.message || 'Spare parts generation failed');
      await postKnowledgeTreeEdge('save', { ...response.data.data, save_mode: 'spare_parts' });
      return response.data.data as { resource_template_id: string; spare_parts: any[]; spare_part_variant_map: any[] };
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: knowledgeTreeKeys.summary(variables.resourceTemplateId) });
      queryClient.invalidateQueries({ queryKey: knowledgeTreeKeys.spareParts(variables.resourceTemplateId) });
    },
  });
};

// Step 3: Checkpoints + values only (no service_cycles) — UI passes variants[] from DB
export const useKTGenerateCheckpoints = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { equipmentName: string; subCategory: string; resourceTemplateId: string; serviceActivity?: string; layer?: string; variants: Array<{ id: string; name: string; capacity_range?: string | null }> }) => {
      const { default: api } = await import('@/services/api');
      const response = await api.post('/api/knowledge-tree/generate-checkpoints', payload, { timeout: 120000 });
      if (!response.data?.success) throw new Error(response.data?.error?.message || 'Checkpoint generation failed');
      await postKnowledgeTreeEdge('save', { ...response.data.data, save_mode: 'checkpoints' });
      return response.data.data as { resource_template_id: string; checkpoints: any[]; checkpoint_values: any[] };
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: knowledgeTreeKeys.summary(variables.resourceTemplateId) });
      queryClient.invalidateQueries({ queryKey: knowledgeTreeKeys.checkpoints(variables.resourceTemplateId) });
    },
  });
};

// Step 4: Service cycles only — UI passes checkpoints[] read from DB (real UUIDs)
export const useKTGenerateServiceCycles = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { equipmentName: string; subCategory: string; resourceTemplateId: string; serviceActivity?: string; checkpoints: Array<{ id: string; name: string; section_name: string; service_activity: string }> }) => {
      const { default: api } = await import('@/services/api');
      const response = await api.post('/api/knowledge-tree/generate-service-cycles', payload, { timeout: 60000 });
      if (!response.data?.success) throw new Error(response.data?.error?.message || 'Service cycles generation failed');
      await postKnowledgeTreeEdge('save', { ...response.data.data, save_mode: 'service_cycles' });
      return response.data.data as { resource_template_id: string; service_cycles: any[] };
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: knowledgeTreeKeys.summary(variables.resourceTemplateId) });
      queryClient.invalidateQueries({ queryKey: knowledgeTreeKeys.cycles(variables.resourceTemplateId) });
    },
  });
};

// ── Legacy: full generation hook (+ Install / + Decomm activity mode) ─────
export type KTGenerationPhase = 'idle' | 'generating' | 'saving' | 'done' | 'error';

export interface KTGenerateInput { resourceTemplateId: string; equipmentName: string; subCategory: string; serviceActivity?: string; existingKT?: boolean; }

export const useKnowledgeTreeGenerate = () => {
  const [phase, setPhase] = React.useState<KTGenerationPhase>('idle');
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const queryClient = useQueryClient();

  const generate = async (input: KTGenerateInput): Promise<string | null> => {
    const { resourceTemplateId, equipmentName, subCategory, serviceActivity = 'pm', existingKT = false } = input;
    setPhase('generating'); setErrorMessage(null);
    try {
      const { default: api } = await import('@/services/api');
      const response = await api.post('/api/knowledge-tree/generate', { equipmentName, subCategory, resourceTemplateId, serviceActivity, existingKT }, { timeout: 300000 });
      if (!response.data?.success) throw new Error(response.data?.error?.message || 'Generation failed');
      setPhase('saving');
      await postKnowledgeTreeEdge('save', response.data.data);
      queryClient.invalidateQueries({ queryKey: knowledgeTreeKeys.coverage() });
      queryClient.invalidateQueries({ queryKey: knowledgeTreeKeys.summary(resourceTemplateId) });
      setPhase('done');
      return resourceTemplateId;
    } catch (err: any) {
      const message = err.response?.data?.error?.message || err.response?.data?.message || err.message || 'Failed to generate Knowledge Tree';
      setErrorMessage(message); setPhase('error'); return null;
    }
  };

  const reset = () => { setPhase('idle'); setErrorMessage(null); };
  return { generate, phase, isActive: phase === 'generating' || phase === 'saving', errorMessage, reset };
};

// ── Snapshot Hooks ────────────────────────────────────────────────────────
export interface SnapshotListItem { id: string; version: number; snapshot_type: string; notes: string | null; created_by: string | null; created_at: string; counts: Record<string, number>; }

export const useKnowledgeTreeSnapshots = (resourceTemplateId: string | undefined) => useQuery({
  queryKey: knowledgeTreeKeys.snapshots(resourceTemplateId || ''),
  queryFn: () => callKnowledgeTreeEdge<{ count: number; snapshots: SnapshotListItem[] }>('snapshots', { resource_template_id: resourceTemplateId! }),
  enabled: !!resourceTemplateId, staleTime: 2 * 60 * 1000, refetchOnWindowFocus: false,
});

export const useCreateSnapshot = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { resource_template_id: string; snapshot_type: string; notes?: string }) =>
      postKnowledgeTreeEdge<{ status: string; snapshot: any }>('snapshot', payload),
    onSuccess: (_data, variables) => { queryClient.invalidateQueries({ queryKey: knowledgeTreeKeys.snapshots(variables.resource_template_id) }); },
  });
};

export const useRestoreSnapshot = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { snapshot_id: string; resource_template_id: string }) =>
      postKnowledgeTreeEdge<{ status: string; restored_from: string; inserted: Record<string, number> }>('restore', payload),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: knowledgeTreeKeys.summary(variables.resource_template_id) });
      queryClient.invalidateQueries({ queryKey: knowledgeTreeKeys.snapshots(variables.resource_template_id) });
      queryClient.invalidateQueries({ queryKey: knowledgeTreeKeys.coverage() });
    },
  });
};
