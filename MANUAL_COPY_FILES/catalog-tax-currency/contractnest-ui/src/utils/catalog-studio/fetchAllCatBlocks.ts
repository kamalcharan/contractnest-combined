// src/utils/catalog-studio/fetchAllCatBlocks.ts
//
// Every catalog block of the current environment, page by page.
// The cat-blocks edge function caps a page at 100 rows (edgeUtils
// MAX_PAGE_SIZE) whatever `limit` asks for, so a single `limit: 500` call
// silently returned the first 100 — one seeded HVAC alone is 68 blocks, so
// the second equipment a tenant seeded went missing from VaNi Seeding and
// the onboarding pricing review.

import api from '@/services/api';

const PAGE = 100;
const MAX_PAGES = 50; // 5,000 blocks — a guard against a looping response

export async function fetchAllCatBlocks<T = any>(params: Record<string, unknown> = {}): Promise<T[]> {
  const all: T[] = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    const resp = await api.get('/api/catalog-studio/blocks', { params: { ...params, page, limit: PAGE } });
    const payload = resp.data?.data || resp.data || {};
    const rows: T[] = payload.blocks || [];
    all.push(...rows);
    const hasMore = payload.pagination?.has_more;
    if (hasMore === false || rows.length < PAGE || (hasMore === undefined && rows.length === 0)) break;
  }
  return all;
}
