// src/lite/onboarding/useGlobalTemplates.ts
//
// The reverse map: equipment → the industries it belongs to.
//
// WHY THIS EXISTS
// ---------------
// The catalog is modelled forwards: an industry owns a set of resource
// templates. Onboarding asked for the industry first and then showed its
// templates. That reads backwards to a real business — a lift AMC company
// knows it services lifts, it does not think of itself as "Facility
// Management" — and on this data it actively misleads:
//
//   * The two equipment templates whose home industry is `lifts_elevators`
//     have NO rows in m_catalog_resource_template_industries, and
//     v_resource_templates_by_industry is built from that link table (plus a
//     cross join of `universal` templates onto every root industry). So
//     picking "Lifts & Elevators" returns only the universal templates —
//     Air Conditioner, Electrical Panel, CCTV, Fire Extinguisher, Laptop —
//     and no lift. `hvac` has exactly the same hole.
//   * The template that DOES carry the lift Knowledge Tree, "Elevator /
//     Lift", has facility_management as its home industry.
//
// So the industry a business would name and the industry that actually
// carries its catalog are different rows. Asking for the equipment and
// deriving the industry from it removes the guess entirely: whatever the
// tenant picks is, by construction, a template that exists.
//
// FETCHING WITHOUT A TENANT INDUSTRY
// ----------------------------------
// /api/resources/resource-templates is scoped server-side by the tenant's
// served industries — which, at this point in onboarding, is empty. The same
// endpoint accepts an `industry_ids` override (the admin global designer uses
// it), so passing every industry id gives the unscoped list with no API,
// edge or table change. The edge caps `limit` at 100 and slices the view
// BEFORE de-duplicating, so a single page returns roughly 84 distinct
// templates out of ~199 and silently drops 5 of the 16 Knowledge-Tree-ready
// ones. Pages therefore have to be walked, and merged client-side.
//
// Merging is also what produces the reverse map for free: the view emits one
// row per (template, industry), so collecting rows by template id yields
// every industry a template is linked to, and `is_primary` marks its home —
// the single value we save as the served industry.

import { useQuery } from '@tanstack/react-query';
import resourcesService from '@/services/resourcesService';

/** The edge clamps `limit` to 100; asking for more silently returns 100. */
const PAGE_SIZE = 100;

/**
 * Safety stop. The view currently holds ~610 equipment/asset/service rows, so
 * 7 pages covers it with room to spare. A runaway `total` can never turn this
 * into an unbounded fan-out.
 */
const MAX_PAGES = 8;

export interface GlobalTemplate {
  id: string;
  name: string;
  description: string | null;
  resource_type_id: string;
  sub_category: string | null;
  scope: string | null;
  popularity_score: number;
  is_recommended: boolean;
  /** Every industry this template is linked to. The raw reverse map. */
  industries: string[];
  /** Its home industry — the reverse answer we actually save. */
  primaryIndustryId: string | null;
}

export const globalTemplateKeys = {
  all: ['lite', 'global-templates'] as const,
  list: (scopeKey: string) => [...globalTemplateKeys.all, scopeKey] as const,
};

type Row = Record<string, unknown>;

const str = (v: unknown): string | null =>
  typeof v === 'string' && v.trim().length > 0 ? v : null;

/**
 * Folds one page of view rows into the accumulator. One row per
 * (template, industry), so a template seen again only contributes its
 * industry — never a second card.
 */
function mergeRows(rows: Row[], into: Map<string, GlobalTemplate>): void {
  for (const row of rows) {
    const id = str(row.id);
    if (!id) continue;

    // The edge remaps linked_industry_id → industry_id on the way out; accept
    // either so this keeps working if that remap is ever dropped.
    const linked = str(row.linked_industry_id) || str(row.industry_id);
    const isPrimary = row.is_primary === true;

    const existing = into.get(id);
    if (!existing) {
      into.set(id, {
        id,
        name: str(row.name) || 'Untitled',
        description: str(row.description),
        resource_type_id: (str(row.resource_type_id) || '').toLowerCase(),
        sub_category: str(row.sub_category),
        scope: str(row.scope),
        popularity_score: Number(row.popularity_score) || 0,
        is_recommended: row.is_recommended === true,
        industries: linked ? [linked] : [],
        primaryIndustryId: isPrimary ? linked : null,
      });
      continue;
    }

    if (linked && !existing.industries.includes(linked)) existing.industries.push(linked);
    if (!existing.primaryIndustryId && isPrimary && linked) existing.primaryIndustryId = linked;
  }
}

/**
 * Every resource template on the platform, keyed by template rather than by
 * (template, industry), with its industries attached.
 *
 * Pass every industry id. Returns [] rather than throwing on a partial
 * failure of any page after the first — a short list is a recoverable
 * onboarding experience, a crash is not.
 */
export function useGlobalResourceTemplates(industryIds: string[]) {
  const scopeKey = [...industryIds].sort().join(',');

  return useQuery<GlobalTemplate[]>({
    queryKey: globalTemplateKeys.list(scopeKey),
    enabled: industryIds.length > 0,
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
    queryFn: async () => {
      const merged = new Map<string, GlobalTemplate>();

      const first = await resourcesService.getResourceTemplates({
        industry_ids: industryIds,
        limit: PAGE_SIZE,
        offset: 0,
      });
      mergeRows((first?.data as unknown as Row[]) || [], merged);

      const total = Number(first?.pagination?.total) || 0;
      const pageCount = Math.min(Math.ceil(total / PAGE_SIZE), MAX_PAGES);

      if (pageCount > 1) {
        // Page 1 already told us the total, so the rest go out together
        // instead of in a chain — one round trip instead of six.
        const rest = await Promise.all(
          Array.from({ length: pageCount - 1 }, (_, i) =>
            resourcesService
              .getResourceTemplates({
                industry_ids: industryIds,
                limit: PAGE_SIZE,
                offset: (i + 1) * PAGE_SIZE,
              })
              .catch(() => null)
          )
        );
        for (const page of rest) {
          if (page) mergeRows((page.data as unknown as Row[]) || [], merged);
        }
      }

      return Array.from(merged.values());
    },
  });
}

export default useGlobalResourceTemplates;
