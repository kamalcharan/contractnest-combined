// src/utils/storageFormat.ts
//
// Byte formatting and tone for evidence storage figures coming out of
// get_tenant_context's usage.storage block (migration evidence-storage/005).
//
// (The per-tenant storage components that used to live under
// components/storage/ were deleted with the provisioned-folder model.)

import type { TenantContextStorage } from '@/hooks/queries/useTenantContext';

/**
 * Human-readable size. Deliberately binary (1 KB = 1024 B) to match the quota,
 * which is set in binary megabytes (40 MB = 41943040 bytes).
 */
export function formatStorageBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '—';
  if (bytes < 1024) return `${Math.round(bytes)} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb < 10 ? kb.toFixed(1) : Math.round(kb)} KB`;
  const mb = kb / 1024;
  if (mb < 1024) return `${mb < 10 ? mb.toFixed(1) : Math.round(mb)} MB`;
  return `${(mb / 1024).toFixed(1)} GB`;
}

/** Only trust a payload the RPC itself reported success on. */
export function readStorage(value: TenantContextStorage | undefined | null): TenantContextStorage | null {
  if (!value || value.success !== true) return null;
  if (!Number.isFinite(value.used_bytes) || !Number.isFinite(value.quota_bytes)) return null;
  if (value.quota_bytes <= 0) return null;
  return value;
}

/** Percentage clamped for display; the bar must never render wider than full. */
export function storagePct(value: TenantContextStorage): number {
  return Math.min(100, Math.max(0, Math.round((value.used_bytes / value.quota_bytes) * 100)));
}
