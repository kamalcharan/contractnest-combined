import type { Block } from '@/types/catalogStudio';
import { catBlocksToBlocks } from '@/utils/catalog-studio/catBlockAdapter';
import type { ConfigurableBlock } from '@/components/catalog-studio';
import type { CoverageTypeItem } from '../steps/AssetSelectionStep';

export const isAgreementTerms = (b: ConfigurableBlock) => b.categoryId === 'text' && (b.config as {autoIncluded?:boolean})?.autoIncluded === true;
export interface ResourceIdentity { id: string; name: string; resource_type_id: string }
const key = (r: ResourceIdentity) => `${r.resource_type_id.toLowerCase()}|${r.name.toLowerCase()}`;

/** Reuse the dependency picker's exact type/name bridge from tenant resources
 * to KT template IDs. Never fuzzy-match a block title or substitute another rate. */
export function catalogForCoverage(raw: any[], scope: CoverageTypeItem | null, resources: ResourceIdentity[], templates: ResourceIdentity[], currency: string): Block[] {
  const resource = scope ? resources.find(r => r.id === scope.resource_id) : undefined;
  if (scope && !resource) throw new Error('Selected coverage is missing from the workspace resource catalogue.');
  const templateIds = new Set(resource ? templates.filter(t => key(t) === key(resource)).map(t => t.id) : []);
  const result: Block[] = [];
  for (const row of raw) {
    if (row.is_active === false || row.visible === false) continue;
    const cfg = row.config || {};
    const block = catBlocksToBlocks([row])[0];
    const refs = [row.knowledge_tree_ref, cfg.knowledge_tree_ref, row.facility_knowledge_tree_ref, cfg.facility_knowledge_tree_ref]
      .map(r => r?.resource_template_id).filter(Boolean);
    const selected = Array.isArray(cfg.selectedResources) ? cfg.selectedResources : [];
    const coverageDependencies = selected.filter((r: any) => ['equipment','asset'].includes(r.resource_type_id) || resources.some(t => t.id === r.resource_id && ['equipment','asset'].includes(t.resource_type_id)));
    if ((refs.length || coverageDependencies.length) && (!scope || !(refs.some(id => templateIds.has(id)) || coverageDependencies.some((r: any) => r.resource_id === scope.resource_id)))) continue;
    if ((row.pricing_mode || cfg.pricingMode || row.pricing_mode_name) === 'resource_based') {
      const options = row.resource_pricing?.options;
      const records = Array.isArray(cfg.resourcePricingRecords) ? cfg.resourcePricingRecords : [];
      const candidates = Array.isArray(options) && options.length ? options : selected.map((r: any) => ({ resource_id:r.resource_id, name:r.resource_name }));
      for (const option of candidates) {
        const dependency = selected.find((r: any) => r.resource_id === option.resource_id);
        const type = dependency?.resource_type_id || resources.find(r => r.id === option.resource_id)?.resource_type_id || row.resource_pricing?.resource_type_id;
        if (!type || (scope && ['equipment','asset'].includes(type) && option.resource_id !== scope.resource_id)) continue;
        const rate = records.find((r: any) => r.resourceTypeId === type && r.currency === currency && r.is_active !== false);
        // Typed records are authoritative for currency and taxes; a single JSONB
        // option must not override a different-currency rate silently.
        const amount = rate ? rate.pricePerUnit : records.length ? undefined : option.currency === currency ? option.price : undefined;
        if (!Number.isFinite(amount) || amount < 0) continue;
        result.push({ ...block, id:`${block.id}__res__${option.resource_id}`, price:amount, currency,
          meta:{...block.meta, resourceId:option.resource_id, resourceTag:option.name, originalBlockId:block.id,
            pricingRecords:[{currency, amount, is_active:true, tax_inclusion:rate?.tax_inclusion || 'exclusive', taxes:rate?.taxes || []}] } });
      }
      continue;
    }
    if (['service','spare','billing'].includes(block.categoryId)) {
      const records = cfg.pricingRecords;
      if (Array.isArray(records) && records.length) {
        if (!records.some((r: any) => r.currency === currency && r.is_active !== false && Number.isFinite(r.amount))) continue;
      } else if (row.currency !== currency || !Number.isFinite(row.base_price)) continue;
    }
    result.push(block);
  }
  return result;
}
