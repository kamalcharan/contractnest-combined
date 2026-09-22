// src/hooks/queries/useStorageAdminQueries.ts
// ============================================================================
// Storage admin queries — /api/admin/storage (platform admin only).
// ============================================================================
// Read-only except for two deliberate actions: run a sweep, and delete a
// legacy prefix. The delete echoes the prefix back as `confirm`, so a
// mis-click cannot remove a folder — the server rejects a mismatch.

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/services/api';
import { vaniToast } from '@/components/common/toast/VaNiToast';

export type PrefixKind = 'evidence' | 'identity' | 'legacy' | 'unknown';

export interface PrefixRow {
  prefix: string;
  kind: PrefixKind;
  count: number;
  bytes: number;
  deletable: boolean;
  tenants: Array<{ id: string; name: string | null }>;
  missingFromBucket?: boolean;
  /** Live rows still pointing into this prefix. Non-empty means not deletable. */
  references: Array<{ kind: string; label: string | null }>;
}

export interface StorageOverview {
  success: boolean;
  reason?: string;
  firebase_configured: boolean;
  prefixes: PrefixRow[];
  totals: { count: number; bytes: number };
  registry: { active: number; pending: number; deleted: number; active_bytes: number };
}

export interface SweepStatus {
  success: boolean;
  firebase_configured?: boolean;
  running?: boolean;
  due?: boolean;
  last_run?: string | null;
  orphans_waiting?: number;
  retired_waiting?: number;
}

export interface StoredObject {
  path: string;
  sizeBytes: number;
  updated: string | null;
  contentType: string | null;
}

export const storageAdminKeys = {
  all: ['storage-admin'] as const,
  overview: () => [...storageAdminKeys.all, 'overview'] as const,
  sweep: () => [...storageAdminKeys.all, 'sweep'] as const,
  browse: (prefix: string) => [...storageAdminKeys.all, 'browse', prefix] as const,
};

const unwrap = (response: any) => response?.data?.data ?? response?.data;

export const useStorageOverview = () =>
  useQuery({
    queryKey: storageAdminKeys.overview(),
    queryFn: async (): Promise<StorageOverview> => unwrap(await api.get('/api/admin/storage/overview')),
    // Listing a bucket is not free, so this is not refetched on every focus.
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
  });

export const useSweepStatus = () =>
  useQuery({
    queryKey: storageAdminKeys.sweep(),
    queryFn: async (): Promise<SweepStatus> => unwrap(await api.get('/api/admin/storage/sweep/status')),
    staleTime: 30 * 1000,
  });

export const usePrefixContents = (prefix: string | null) =>
  useQuery({
    queryKey: storageAdminKeys.browse(prefix ?? ''),
    queryFn: async () => unwrap(await api.get('/api/admin/storage/browse', { params: { prefix } })),
    enabled: !!prefix,
    staleTime: 60 * 1000,
  });

export const useRunSweep = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => unwrap(await api.post('/api/admin/storage/sweep', {})),
    onSuccess: (data: any) => {
      // claimed: 0 is success, not failure — it means nothing was waiting.
      if (data?.skipped) {
        vaniToast.info('Sweep skipped', { message: `Nothing to do (${data.skipped}).` });
      } else if ((data?.deleted ?? 0) === 0) {
        vaniToast.info('Sweep ran', { message: 'Nothing was waiting to be reclaimed.' });
      } else {
        vaniToast.success('Storage reclaimed', {
          message: `${data.deleted} object${data.deleted === 1 ? '' : 's'} removed${data.failed ? `, ${data.failed} failed and will retry` : ''}.`,
        });
      }
      queryClient.invalidateQueries({ queryKey: storageAdminKeys.all });
    },
    onError: () => vaniToast.error('Sweep failed', { message: 'Could not run the cleanup sweep.' }),
  });
};

export const useDeletePrefix = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (prefix: string) =>
      unwrap(await api.post('/api/admin/storage/prefix/delete', { prefix, confirm: prefix })),
    onSuccess: (data: any) => {
      vaniToast.success('Folder deleted', {
        message: `${data?.deleted ?? 0} object${data?.deleted === 1 ? '' : 's'} removed`
          + (data?.failed ? `, ${data.failed} failed` : '')
          + (data?.tenantsCleared ? ` · ${data.tenantsCleared} tenant reference${data.tenantsCleared === 1 ? '' : 's'} cleared` : ''),
      });
      queryClient.invalidateQueries({ queryKey: storageAdminKeys.all });
    },
    onError: (error: any) => {
      const code = error?.response?.data?.error?.code;
      vaniToast.error('Delete failed', {
        message: code === 'protected_prefix'
          ? 'That namespace belongs to the live model and cannot be deleted here.'
          : code === 'prefix_in_use'
          ? 'Something in the product still points at that folder. Refresh to see what.'
          : 'Could not delete that folder.',
      });
    },
  });
};
