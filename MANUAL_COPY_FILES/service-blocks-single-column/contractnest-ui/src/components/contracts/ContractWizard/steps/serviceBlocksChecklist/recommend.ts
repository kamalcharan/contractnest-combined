// src/components/contracts/ContractWizard/steps/serviceBlocksChecklist/recommend.ts
// VaNi recommendation heuristic, extracted VERBATIM from
// VaNiBlockRecommender.tsx so the inline banner (mock 9) and the drawer
// share one implementation. Deterministic and local — it only picks from
// blocks the tenant already has. A later batch can swap this for an
// API/edge call without changing either caller.

import { Block } from '@/types/catalogStudio';

export const resourceNamesOf = (b: Block): string[] => {
  const rs = ((b.meta as any)?.selectedResources || (b.config as any)?.selectedResources || []) as Array<{ resource_name?: string }>;
  return rs.map((r) => (r.resource_name || '').toLowerCase()).filter(Boolean);
};

export const cadenceOf = (b: Block): number | null => {
  const c = (b.meta as any)?.serviceCycles || (b.config as any)?.serviceCycles;
  return c?.enabled && c?.days ? c.days : null;
};

export interface RecommendResult {
  services: Block[];
  spares: Block[];
}

export function recommendBlocks(
  allBlocks: Block[],
  assetNames: string[],
  addedBaseIds: string[],
): RecommendResult {
  const added = new Set(addedBaseIds);
  const assetLc = assetNames.map((a) => a.toLowerCase()).filter(Boolean);

  const relevant = (b: Block) => {
    if (added.has(b.id)) return false;
    if (assetLc.length === 0) return true; // no asset context → offer all
    const rn = resourceNamesOf(b);
    if (rn.length === 0) return true; // unscoped block → generally applicable
    return rn.some((n) => assetLc.some((a) => n.includes(a) || a.includes(n)));
  };

  const pool = allBlocks.filter(relevant);
  const svc = pool.filter((b) => b.categoryId === 'service');
  const spr = pool.filter((b) => b.categoryId === 'spare');

  // Order services: scheduled (has cadence) first, then name
  const rank = (b: Block) => (cadenceOf(b) != null ? 0 : 1);
  svc.sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name));
  spr.sort((a, b) => a.name.localeCompare(b.name));
  return { services: svc, spares: spr };
}
