// src/utils/perspective/sideReadiness.ts
//
// Side-readiness for the Revenue/Expense perspective toggle.
//
// A perspective is only worth switching into if there is real data behind
// it. For the REVENUE side that means at least one catalog block — an
// expense-onboarded (buyer) tenant has none, so switching them into Revenue
// today lands on empty catalog/contract screens with no explanation. The
// toggle now checks this lazily (only when a switch is attempted) and, when
// the side is empty, offers activation instead of a blind switch.
//
// Both directions are gated:
//   Expense→Revenue: ready = ≥1 catalog block.
//   Revenue→Expense: ready = ≥1 OWN registry asset (ownership_type='self').
//     The filter matters: t_client_asset_registry also holds the tenant's
//     CLIENTS' assets (ownership_type='client'), which a seller accumulates
//     through contracts — those must not make the Expense side look set up.
//
// FAIL-OPEN by design: if the readiness probe errors (network blip, API
// down), we return "ready" and let the normal switch happen. A wrongly
// blocked tenant is a worse failure than a wrongly allowed empty screen.

import api from '@/services/api';
import { API_ENDPOINTS } from '@/services/serviceURLs';

// Positive results are cached per tenant+environment for the tab's lifetime
// (module-level; a hard reload clears it). Negative results are deliberately
// NOT cached: the moment the tenant finishes activation, the next toggle
// attempt must see the fresh catalog without waiting for a reload.
const readyCache = new Set<string>();

const cacheKey = (side: 'revenue' | 'expense', tenantId: string, isLive: boolean) =>
  `${side}:${tenantId}:${isLive ? 'live' : 'test'}`;

/** ≥1 catalog block exists for the current tenant+environment. */
export async function isRevenueSideReady(tenantId: string, isLive: boolean): Promise<boolean> {
  const key = cacheKey('revenue', tenantId, isLive);
  if (readyCache.has(key)) return true;

  try {
    const url = API_ENDPOINTS.CATALOG_STUDIO.BLOCKS.LIST_WITH_FILTERS({ page: 1, limit: 1 });
    const resp = await api.get(url);

    // The blocks list is parsed differently by different callers; accept the
    // known shapes ({data:{blocks,total}}, {blocks,total}, bare array).
    const d: any = resp.data;
    const blocks =
      d?.data?.blocks ?? d?.blocks ?? (Array.isArray(d?.data) ? d.data : Array.isArray(d) ? d : []);
    const total = Number(d?.data?.total ?? d?.total ?? (Array.isArray(blocks) ? blocks.length : 0));

    const ready = (Array.isArray(blocks) && blocks.length > 0) || total > 0;
    if (ready) readyCache.add(key);
    return ready;
  } catch (err: any) {
    console.warn('[sideReadiness] Revenue readiness probe failed — failing open:', err?.message);
    return true;
  }
}

/** ≥1 OWN registry asset (ownership_type='self') for the current tenant+environment. */
export async function isExpenseSideReady(tenantId: string, isLive: boolean): Promise<boolean> {
  const key = cacheKey('expense', tenantId, isLive);
  if (readyCache.has(key)) return true;

  try {
    const url = API_ENDPOINTS.CLIENT_ASSET_REGISTRY.LIST_WITH_FILTERS({
      ownership_type: 'self',
      limit: 1,
    });
    const resp = await api.get(url);

    // Accept the known list shapes ({data:{assets,total}}, {assets,total},
    // {data:[...]}, bare array) — same defensive parse as the revenue probe.
    const d: any = resp.data;
    const assets =
      d?.data?.assets ?? d?.assets ?? (Array.isArray(d?.data) ? d.data : Array.isArray(d) ? d : []);
    const total = Number(d?.data?.total ?? d?.total ?? (Array.isArray(assets) ? assets.length : 0));

    const ready = (Array.isArray(assets) && assets.length > 0) || total > 0;
    if (ready) readyCache.add(key);
    return ready;
  } catch (err: any) {
    console.warn('[sideReadiness] Expense readiness probe failed — failing open:', err?.message);
    return true;
  }
}
