// src/services/storageAdminService.ts
// ============================================================================
// Storage admin — what is actually in the bucket, and what may be deleted.
// ============================================================================
// GCS has no folders. A "folder" is a shared path prefix, so the only way to
// know what exists is to list objects and group them. Three namespaces:
//
//   contracts/**   contract evidence     METERED, governed by the registry
//   tenants/**     identity assets       unmetered (logos, avatars, icons, QRs)
//   tenant_*       LEGACY provisioned folders from the per-tenant model
//   anything else  unaccounted for
//
// Only the last two may be deleted here. contracts/ and tenants/ are refused
// outright: those are the live model, and retiring one of their objects is the
// registry's job (evidence_mark_deleted) so the sweep can reclaim it properly.
//
// ⚠️ LEGACY FOLDERS ARE NOT ALWAYS ONE PER TENANT. Four live tenants share
// 'tenant_c0000000_demo'. Deleting a prefix therefore deletes every tenant
// that points at it, which is why listPrefixes() returns the full tenant list
// per prefix and the UI must show it before anyone presses delete.

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  listObjects,
  listTopLevelPrefixes,
  deletePrefix,
  isConfigured,
  type PrefixListing,
} from '../utils/firebaseStorageAdmin';
import { captureException } from '../utils/sentry';

/** The two namespaces the live model owns. Never deletable from this screen. */
const PROTECTED_PREFIXES = ['contracts', 'tenants'];

export type PrefixKind = 'evidence' | 'identity' | 'legacy' | 'unknown';

export interface PrefixRow {
  prefix: string;
  kind: PrefixKind;
  count: number;
  bytes: number;
  deletable: boolean;
  /** Tenants whose storage_path points here. More than one is a real hazard. */
  tenants: Array<{ id: string; name: string | null }>;
  /** Set when a legacy folder is recorded on a tenant but absent from the bucket. */
  missingFromBucket?: boolean;
}

export interface StorageOverview {
  success: boolean;
  reason?: string;
  firebase_configured: boolean;
  prefixes: PrefixRow[];
  totals: { count: number; bytes: number };
  /** Registry totals, for comparison with what the bucket actually holds. */
  registry: { active: number; pending: number; deleted: number; active_bytes: number };
}

class StorageAdminService {
  private client(): SupabaseClient | null {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;
    if (!url || !key) return null;
    return createClient(url, key);
  }

  private classify(prefix: string): PrefixKind {
    if (prefix === 'contracts') return 'evidence';
    if (prefix === 'tenants') return 'identity';
    if (/^tenant_/.test(prefix)) return 'legacy';
    return 'unknown';
  }

  /**
   * A prefix may be deleted only if it is legacy or unaccounted for. Checked
   * here AND again in remove() — the UI's `deletable` flag is a hint, never
   * the thing that enforces it.
   */
  private isDeletable(prefix: string): boolean {
    const top = prefix.includes('/') ? prefix.slice(0, prefix.indexOf('/')) : prefix;
    if (PROTECTED_PREFIXES.includes(top)) return false;
    if (top === '(root)') return false;
    return top.length > 0;
  }

  /** Everything in the bucket, grouped, with the tenants attached to each prefix. */
  async overview(): Promise<StorageOverview> {
    const empty: StorageOverview = {
      success: false,
      firebase_configured: isConfigured(),
      prefixes: [],
      totals: { count: 0, bytes: 0 },
      registry: { active: 0, pending: 0, deleted: 0, active_bytes: 0 },
    };
    if (!isConfigured()) return { ...empty, reason: 'not_configured' };

    try {
      const [buckets, owners, registry] = await Promise.all([
        listTopLevelPrefixes(),
        this.legacyOwners(),
        this.registryTotals(),
      ]);

      const rows: PrefixRow[] = buckets.map(b => ({
        prefix: b.prefix,
        kind: this.classify(b.prefix),
        count: b.count,
        bytes: b.bytes,
        deletable: this.isDeletable(b.prefix),
        tenants: owners.get(b.prefix) ?? [],
      }));

      // A folder recorded on a tenant but absent from the bucket is worth
      // showing: it means the objects are already gone and only the
      // storage_path reference is left behind.
      const seen = new Set(buckets.map(b => b.prefix));
      for (const [prefix, tenants] of owners.entries()) {
        if (seen.has(prefix)) continue;
        rows.push({
          prefix, kind: 'legacy', count: 0, bytes: 0,
          deletable: false, tenants, missingFromBucket: true,
        });
      }

      return {
        success: true,
        firebase_configured: true,
        prefixes: rows,
        totals: {
          count: buckets.reduce((n, b) => n + b.count, 0),
          bytes: buckets.reduce((n, b) => n + b.bytes, 0),
        },
        registry,
      };
    } catch (error) {
      captureException(error instanceof Error ? error : new Error(String(error)), {
        tags: { source: 'storage_admin', action: 'overview' },
      });
      return { ...empty, reason: 'listing_failed' };
    }
  }

  /** What is actually inside a prefix, so nobody deletes blind. */
  async browse(prefix: string, limit = 200): Promise<{ success: boolean; reason?: string; data?: PrefixListing }> {
    if (!isConfigured()) return { success: false, reason: 'not_configured' };
    if (!prefix || prefix.includes('..')) return { success: false, reason: 'invalid_prefix' };
    try {
      return { success: true, data: await listObjects(prefix, limit) };
    } catch (error) {
      captureException(error instanceof Error ? error : new Error(String(error)), {
        tags: { source: 'storage_admin', action: 'browse' }, extra: { prefix },
      });
      return { success: false, reason: 'listing_failed' };
    }
  }

  /**
   * Delete a legacy or unaccounted-for prefix. Refuses the live namespaces
   * whatever the caller claims, and clears storage_path on any tenant that
   * pointed at it so the old model stops believing it has a folder.
   */
  async remove(prefix: string): Promise<{ success: boolean; reason?: string; deleted?: number; failed?: number; bytes?: number; tenantsCleared?: number }> {
    if (!isConfigured()) return { success: false, reason: 'not_configured' };
    if (!prefix || prefix.includes('..')) return { success: false, reason: 'invalid_prefix' };
    if (!this.isDeletable(prefix)) return { success: false, reason: 'protected_prefix' };

    try {
      const result = await deletePrefix(prefix.endsWith('/') ? prefix : `${prefix}/`);

      // Clear the reference too, otherwise the legacy pages keep pointing at a
      // folder that no longer exists — which is exactly how that surface
      // starts throwing.
      let tenantsCleared = 0;
      const supabase = this.client();
      if (supabase) {
        const { data, error } = await supabase
          .from('t_tenants')
          .update({ storage_path: null, storage_setup_complete: false })
          .eq('storage_path', prefix)
          .select('id');
        if (error) {
          captureException(new Error(error.message), {
            tags: { source: 'storage_admin', action: 'clear_storage_path' }, extra: { prefix },
          });
        } else {
          tenantsCleared = data?.length ?? 0;
        }
      }

      return { success: true, ...result, tenantsCleared };
    } catch (error) {
      captureException(error instanceof Error ? error : new Error(String(error)), {
        tags: { source: 'storage_admin', action: 'remove' }, extra: { prefix },
      });
      return { success: false, reason: 'delete_failed' };
    }
  }

  /** prefix -> the tenants whose storage_path points at it. */
  private async legacyOwners(): Promise<Map<string, Array<{ id: string; name: string | null }>>> {
    const map = new Map<string, Array<{ id: string; name: string | null }>>();
    const supabase = this.client();
    if (!supabase) return map;
    const { data, error } = await supabase
      .from('t_tenants')
      .select('id, name, storage_path')
      .not('storage_path', 'is', null);
    if (error || !data) return map;
    for (const row of data as any[]) {
      const list = map.get(row.storage_path) ?? [];
      list.push({ id: row.id, name: row.name ?? null });
      map.set(row.storage_path, list);
    }
    return map;
  }

  private async registryTotals(): Promise<{ active: number; pending: number; deleted: number; active_bytes: number }> {
    const zero = { active: 0, pending: 0, deleted: 0, active_bytes: 0 };
    const supabase = this.client();
    if (!supabase) return zero;
    const { data, error } = await supabase
      .from('t_contract_evidence')
      .select('status, size_bytes');
    if (error || !data) return zero;
    const totals = { ...zero };
    for (const row of data as any[]) {
      if (row.status === 'active') {
        totals.active += 1;
        totals.active_bytes += Number(row.size_bytes ?? 0);
      } else if (row.status === 'pending') totals.pending += 1;
      else if (row.status === 'deleted') totals.deleted += 1;
    }
    return totals;
  }
}

export const storageAdminService = new StorageAdminService();
export default storageAdminService;
