import type { Resource } from '@/hooks/queries/useResources';
import type { ClientAsset } from '@/types/clientAssetRegistry';
import type { CoverageTypeItem, EquipmentDetailItem } from '../steps/AssetSelectionStep';

// Same JSONB representation used by the live AssetSelectionStep. Never count
// deferred placeholders as identified assets, and keep their IDs on edits.
export const deferred = (d: EquipmentDetailItem) => d.asset_registry_id === null && d.specifications?.placeholder === true;
export const identified = (details: EquipmentDetailItem[]) => details.filter(d => !deferred(d));

export function reconcileCoverage(coverage: CoverageTypeItem[], details: EquipmentDetailItem[], resources: Resource[], tenant: string, role: 'seller' | 'buyer'): EquipmentDetailItem[] {
  const real = identified(details);
  const next = [...real];
  for (const c of coverage) {
    const resource = resources.find(r => r.id === c.resource_id);
    if (!resource || !Number.isInteger(c.unit_count) || c.unit_count! < 1 || c.unit_count! > 999) throw new Error('Coverage type or unit count is unavailable. Review it before saving.');
    const previous = details.filter(d => deferred(d) && d.specifications.coverage_resource_id === c.resource_id);
    const remaining = c.unit_count! - real.filter(d => d.category_id === c.resource_id).length;
    if (remaining < 0) throw new Error('Detach extra units before reducing coverage.');
    for (let i = 0; i < remaining; i++) next.push(previous[i] || {
      id: crypto.randomUUID(), asset_registry_id: null, added_by_tenant_id: tenant, added_by_role: role,
      resource_type: resource.resource_type_id === 'asset' ? 'entity' : 'equipment',
      category_id: c.resource_id, category_name: c.resource_name, item_name: `${c.resource_name} — to be attached`, quantity: 1,
      make: null, model: null, serial_number: null, condition: null, criticality: null, location: null,
      purchase_date: null, warranty_expiry: null, area_sqft: null, dimensions: null, capacity: null,
      specifications: { placeholder: true, coverage_resource_id: c.resource_id }, notes: null,
    });
  }
  if (real.some(d => !coverage.some(c => c.resource_id === d.category_id))) throw new Error('An attached unit has no coverage type. Review attached units first.');
  return next;
}

export function assetDetail(asset: ClientAsset, resource: Resource, tenant: string, role: 'seller' | 'buyer'): EquipmentDetailItem {
  return {
    id: crypto.randomUUID(), asset_registry_id: asset.id, added_by_tenant_id: tenant, added_by_role: role,
    resource_type: resource.resource_type_id === 'asset' ? 'entity' : 'equipment', category_id: resource.id,
    category_name: resource.display_name || resource.name, item_name: asset.name, quantity: 1,
    make: asset.make, model: asset.model, serial_number: asset.serial_number, condition: asset.condition,
    criticality: asset.criticality, location: asset.location, purchase_date: asset.purchase_date,
    warranty_expiry: asset.warranty_expiry, area_sqft: asset.area_sqft, dimensions: asset.dimensions,
    capacity: asset.capacity, specifications: asset.specifications, notes: null,
  };
}
