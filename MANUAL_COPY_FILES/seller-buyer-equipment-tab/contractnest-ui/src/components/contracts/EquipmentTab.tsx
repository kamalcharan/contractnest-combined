// src/components/contracts/EquipmentTab.tsx
// Equipment & Facility details tab for contract detail page
// Both seller and buyer can add/remove equipment using the same
// EquipmentCard (selectable) + EquipmentFormDialog from equipment-registry

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Wrench, Plus, X, Search, Package } from 'lucide-react';
import type { ContractEquipmentDetail } from '@/types/contracts';
import { useAuth } from '@/context/AuthContext';
import {
  useAssetRegistryManager,
  useCreateAsset,
} from '@/hooks/queries/useAssetRegistry';
import { useResources, type Resource } from '@/hooks/queries/useResources';
import {
  useBuyerAddEquipment,
  useBuyerRemoveEquipment,
  useSellerAddEquipment,
  useSellerRemoveEquipment,
} from '@/hooks/queries/useContractQueries';
import type { TenantAsset, AssetFormData, AssetRegistryFilters } from '@/types/assetRegistry';
import EquipmentCard, { type CardAsset } from '@/pages/equipment-registry/EquipmentCard';
import EquipmentFormDialog from '@/pages/equipment-registry/EquipmentFormDialog';
import { VaNiLoader } from '@/components/common/loaders/UnifiedLoader';
import { useContactList } from '@/hooks/useContacts';

// =================================================================
// PROPS
// =================================================================

interface EquipmentTabProps {
  equipmentDetails: ContractEquipmentDetail[];
  allowBuyerToAdd?: boolean;
  colors: any;
  isBuyer?: boolean;
  contractId?: string;
  /** The buyer/contact on this contract — used to filter registry on Revenue side */
  buyerId?: string;
}

// =================================================================
// HELPERS
// =================================================================

function generateId(): string {
  return crypto.randomUUID?.() ?? `eq-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/** Convert a TenantAsset from registry into a ContractEquipmentDetail */
function assetToDetail(
  asset: TenantAsset,
  tenantId: string,
  role: 'seller' | 'buyer',
  resourceIdToSubCategory: Map<string, string>,
): ContractEquipmentDetail {
  return {
    id: generateId(),
    asset_registry_id: asset.id,
    added_by_tenant_id: tenantId,
    added_by_role: role,
    resource_type: (asset.resource_type_id || '').toLowerCase() === 'asset' ? 'entity' : 'equipment',
    category_id: asset.asset_type_id || null,
    category_name: resourceIdToSubCategory.get(asset.asset_type_id || '') || 'Other',
    item_name: asset.name,
    quantity: 1,
    make: asset.make,
    model: asset.model,
    serial_number: asset.serial_number,
    condition: asset.condition || null,
    criticality: asset.criticality || null,
    location: asset.location,
    purchase_date: asset.purchase_date,
    warranty_expiry: asset.warranty_expiry,
    area_sqft: asset.area_sqft,
    capacity: asset.capacity,
    specifications: asset.specifications || {},
    notes: asset.description,
  };
}

/** Convert a ContractEquipmentDetail into a CardAsset so EquipmentCard can render it */
function detailToCardAsset(detail: ContractEquipmentDetail): CardAsset {
  return {
    id: detail.asset_registry_id || detail.id,
    tenant_id: detail.added_by_tenant_id || '',
    resource_type_id: detail.resource_type === 'entity' ? 'asset' : 'equipment',
    asset_type_id: detail.category_id || null,
    parent_asset_id: null,
    template_id: null,
    industry_id: null,
    name: detail.item_name,
    code: null,
    description: detail.notes || null,
    status: 'active' as const,
    condition: (detail.condition || 'good') as any,
    criticality: (detail.criticality || 'low') as any,
    ownership_type: 'client' as any,
    owner_contact_id: null,
    location: detail.location || null,
    make: detail.make || null,
    model: detail.model || null,
    serial_number: detail.serial_number || null,
    purchase_date: detail.purchase_date || null,
    warranty_expiry: detail.warranty_expiry || null,
    last_service_date: null,
    area_sqft: detail.area_sqft || null,
    dimensions: detail.dimensions || null,
    capacity: detail.capacity || null,
    specifications: detail.specifications || {},
    tags: [],
    image_url: null,
    is_active: true,
    is_live: true,
    created_at: '',
    updated_at: '',
    created_by: null,
    updated_by: null,
  } as CardAsset;
}

// =================================================================
// MAIN COMPONENT
// =================================================================

const EquipmentTab: React.FC<EquipmentTabProps> = ({
  equipmentDetails,
  allowBuyerToAdd,
  colors,
  isBuyer = false,
  contractId,
  buyerId,
}) => {
  const { currentTenant } = useAuth();
  const tenantId = currentTenant?.id || '';
  const isSeller = !isBuyer;
  const role: 'seller' | 'buyer' = isBuyer ? 'buyer' : 'seller';

  // ── DEBUG: log buyerId so we can verify the filter value ──────
  useEffect(() => {
    console.log('[EquipmentTab] Filter debug:', {
      buyerId,
      isBuyer,
      isSeller,
      contractId,
      willFilterByContact: isSeller && !!buyerId,
    });
  }, [buyerId, isBuyer, isSeller, contractId]);

  // ── State ──────────────────────────────────────────────────────

  const [showPicker, setShowPicker] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddFormOpen, setIsAddFormOpen] = useState(false);

  // ── Mutations ──────────────────────────────────────────────────

  const sellerAddMutation = useSellerAddEquipment();
  const sellerRemoveMutation = useSellerRemoveEquipment();
  const buyerAddMutation = useBuyerAddEquipment();
  const buyerRemoveMutation = useBuyerRemoveEquipment();

  const addMutation = isBuyer ? buyerAddMutation : sellerAddMutation;
  const removeMutation = isBuyer ? buyerRemoveMutation : sellerRemoveMutation;

  // ── Contacts (resolve owner_contact_id → display name, same as equipment-registry) ──
  const { data: contactsList = [] } = useContactList({ page: 1, limit: 500, status: 'active' });
  const contactNameMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of contactsList) {
      map.set(c.id, c.displayName || c.company_name || c.name || 'Unknown');
    }
    return map;
  }, [contactsList]);

  // ── Registry data (only loaded when picker is open) ────────────
  // Revenue side (seller): show client-owned equipment filtered by buyer contact
  // Expense side (buyer): show self-owned equipment (no contact filter)

  const filters: AssetRegistryFilters = useMemo(() => {
    if (isBuyer) {
      // Expense side — buyer adds from their own (self) equipment
      return { limit: 500, offset: 0, ownership_type: 'self' as const };
    }
    // Revenue side — seller picks from equipment registered under the buyer/client contact
    const f: AssetRegistryFilters = {
      limit: 500,
      offset: 0,
      ownership_type: 'client' as const,
      contact_id: buyerId || undefined,
    };
    console.log('[EquipmentTab] Registry filters:', f);
    return f;
  }, [isBuyer, buyerId]);

  const { assets, isLoading: assetsLoading } = useAssetRegistryManager(
    showPicker ? filters : { limit: 0, offset: 0 }
  );

  // ── DEBUG: log assets returned from registry ──────────────────
  useEffect(() => {
    if (showPicker && !assetsLoading) {
      console.log('[EquipmentTab] Registry returned', assets.length, 'assets:', assets.map(a => ({
        id: a.id,
        name: a.name,
        owner_contact_id: a.owner_contact_id,
        ownership_type: a.ownership_type,
      })));
    }
  }, [showPicker, assetsLoading, assets]);

  const createMutation = useCreateAsset();

  const { data: allResources = [], isLoading: resourcesLoading } = useResources();

  // Build lookup maps for resources
  const { resourceIdToSubCategory, allFormCategories } = useMemo(() => {
    const idToSubCat = new Map<string, string>();
    const eqResources: Resource[] = [];

    for (const r of allResources) {
      if (r.is_active && ['equipment', 'asset'].includes((r.resource_type_id || '').toLowerCase())) {
        eqResources.push(r);
        idToSubCat.set(r.id, r.sub_category || 'Other');
      }
    }

    const formCats = eqResources.map((r) => ({
      id: r.id,
      name: r.display_name || r.name,
      sub_category: r.sub_category || null,
      resource_type_id: r.resource_type_id,
    }));

    return { resourceIdToSubCategory: idToSubCat, allFormCategories: formCats };
  }, [allResources]);

  // ── Derived data ──────────────────────────────────────────────

  const hasEquipment = equipmentDetails.length > 0;
  const equipmentCount = equipmentDetails.filter(e => e.resource_type === 'equipment').length;
  const entityCount = equipmentDetails.filter(e => e.resource_type === 'entity').length;

  // Track which asset_registry_ids are already in the contract
  const existingAssetIds = useMemo(() => {
    const set = new Set<string>();
    for (const d of equipmentDetails) {
      if (d.asset_registry_id) set.add(d.asset_registry_id);
    }
    return set;
  }, [equipmentDetails]);

  const canAdd = contractId && (isSeller || (isBuyer && allowBuyerToAdd));

  // Filter registry assets for picker — Equipment tab only shows equipment, not facilities
  // For seller view, also filter by buyer contact so only this contract's client equipment shows
  const displayAssets = useMemo(() => {
    if (!showPicker) return [];
    let filtered = assets.filter(
      (a) =>
        (a.resource_type_id || '').toLowerCase() === 'equipment' &&
        a.is_active
    );

    // Seller view: filter by buyer contact (client-side safety net in case API didn't filter)
    if (isSeller && buyerId) {
      filtered = filtered.filter((a) => a.owner_contact_id === buyerId);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (a) =>
          a.name.toLowerCase().includes(q) ||
          (a.make || '').toLowerCase().includes(q) ||
          (a.model || '').toLowerCase().includes(q) ||
          (a.serial_number || '').toLowerCase().includes(q) ||
          (a.location || '').toLowerCase().includes(q)
      );
    }

    return filtered;
  }, [assets, searchQuery, showPicker, isSeller, buyerId]);

  // ── Handlers ──────────────────────────────────────────────────

  const handleToggleAsset = useCallback(async (asset: TenantAsset) => {
    if (!contractId) return;

    if (existingAssetIds.has(asset.id)) {
      // Find the equipment detail with this asset_registry_id and remove it
      const detail = equipmentDetails.find((d) => d.asset_registry_id === asset.id);
      if (detail) {
        try {
          await removeMutation.mutateAsync({ contractId, itemId: detail.id });
        } catch {
          // Error toast handled by mutation hook
        }
      }
    } else {
      // Add the asset
      const item = assetToDetail(asset, tenantId, role, resourceIdToSubCategory);
      try {
        await addMutation.mutateAsync({ contractId, equipmentItem: item });
      } catch {
        // Error toast handled by mutation hook
      }
    }
  }, [contractId, existingAssetIds, equipmentDetails, tenantId, role, resourceIdToSubCategory, addMutation, removeMutation]);

  const handleRemoveCard = useCallback(async (detail: ContractEquipmentDetail) => {
    if (!contractId) return;
    try {
      await removeMutation.mutateAsync({ contractId, itemId: detail.id });
    } catch {
      // Error toast handled by mutation hook
    }
  }, [contractId, removeMutation]);

  // "+ Add Equipment" — create in registry via form dialog and auto-add to contract
  const handleCreateSubmit = useCallback(
    async (data: AssetFormData) => {
      if (!contractId) return;
      try {
        const created = await createMutation.mutateAsync(data);
        // Auto-add the newly created asset to the contract
        const item = assetToDetail(created, tenantId, role, resourceIdToSubCategory);
        await addMutation.mutateAsync({ contractId, equipmentItem: item });
        setIsAddFormOpen(false);
      } catch {
        /* toast handled by hooks */
      }
    },
    [createMutation, tenantId, role, resourceIdToSubCategory, contractId, addMutation]
  );

  const isLoading = assetsLoading || resourcesLoading;

  // ── Render ────────────────────────────────────────────────────

  return (
    <div className="space-y-5">
      {/* Summary bar */}
      <div
        className="rounded-xl border px-5 py-3.5 flex items-center justify-between"
        style={{
          backgroundColor: colors.utility.secondaryBackground,
          borderColor: colors.utility.primaryText + '12',
        }}
      >
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Wrench className="h-4 w-4" style={{ color: colors.brand.primary }} />
            <span className="text-sm font-bold" style={{ color: colors.utility.primaryText }}>
              Covered Assets
            </span>
          </div>
          <div className="flex items-center gap-3">
            {equipmentCount > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: colors.brand.primary + '12', color: colors.brand.primary }}>
                {equipmentCount} Equipment
              </span>
            )}
            {entityCount > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: '#8B5CF615', color: '#8B5CF6' }}>
                {entityCount} Facilit{entityCount === 1 ? 'y' : 'ies'}
              </span>
            )}
            {!hasEquipment && (
              <span className="text-xs" style={{ color: colors.utility.secondaryText }}>
                No equipment attached
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isSeller && allowBuyerToAdd && (
            <span
              className="text-xs px-2.5 py-1 rounded-full font-medium"
              style={{ backgroundColor: '#f59e0b18', color: '#d97706', border: '1px solid #f59e0b30' }}
            >
              Buyer can add
            </span>
          )}
          {canAdd && (
            <button
              onClick={() => setShowPicker(!showPicker)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors hover:opacity-90"
              style={{
                backgroundColor: showPicker ? colors.utility.secondaryBackground : colors.brand.primary,
                color: showPicker ? colors.utility.primaryText : '#fff',
                border: showPicker ? `1px solid ${colors.utility.primaryText}20` : 'none',
              }}
            >
              {showPicker ? (
                <>
                  <X className="h-3.5 w-3.5" />
                  Close
                </>
              ) : (
                <>
                  <Plus className="h-3.5 w-3.5" />
                  {isBuyer ? 'Add My Equipment' : 'Add Equipment'}
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* ── Equipment Picker (registry-based, reuses EquipmentCard) ── */}
      {showPicker && contractId && canAdd && (
        <div
          className="rounded-xl border overflow-hidden"
          style={{
            backgroundColor: colors.utility.secondaryBackground,
            borderColor: colors.brand.primary + '30',
          }}
        >
          {/* Picker header */}
          <div
            className="px-5 py-3.5 flex items-center justify-between"
            style={{
              backgroundColor: colors.brand.primary + '08',
              borderBottom: `1px solid ${colors.brand.primary}20`,
            }}
          >
            <div className="flex items-center gap-3">
              <span className="text-sm font-bold" style={{ color: colors.utility.primaryText }}>
                Select from Registry
              </span>
              {displayAssets.length > 0 && (
                <span className="text-xs" style={{ color: colors.utility.secondaryText }}>
                  {existingAssetIds.size} of {displayAssets.length} added
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {/* + Add Equipment (opens form dialog) */}
              <button
                onClick={() => setIsAddFormOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors hover:opacity-90"
                style={{ backgroundColor: colors.brand.primary, color: '#fff' }}
              >
                <Plus className="h-3.5 w-3.5" />
                Add Equipment
              </button>

              {/* Search */}
              <div className="relative">
                <Search
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5"
                  style={{ color: colors.utility.secondaryText }}
                />
                <input
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 pr-7 py-1.5 w-44 rounded-lg border text-xs"
                  style={{
                    borderColor: colors.utility.primaryText + '20',
                    backgroundColor: colors.utility.primaryBackground,
                    color: colors.utility.primaryText,
                  }}
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2"
                  >
                    <X className="h-3 w-3" style={{ color: colors.utility.secondaryText }} />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Picker body — equipment card grid */}
          <div className="px-5 py-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <VaNiLoader size="sm" message="Loading equipment..." />
              </div>
            ) : displayAssets.length === 0 ? (
              <div className="text-center py-12">
                <Package
                  className="h-12 w-12 mx-auto mb-3"
                  style={{ color: colors.utility.secondaryText + '40' }}
                />
                <p className="text-sm mb-1" style={{ color: colors.utility.secondaryText }}>
                  {searchQuery
                    ? `No equipment matching "${searchQuery}"`
                    : 'No equipment in registry yet'}
                </p>
                <p className="text-xs" style={{ color: colors.utility.secondaryText + '80' }}>
                  {searchQuery
                    ? 'Try a different search term'
                    : 'Click "+ Add Equipment" to register equipment first.'}
                </p>
              </div>
            ) : (
              <div
                className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 max-h-[50vh] overflow-y-auto pr-1"
              >
                {displayAssets.map((asset) => (
                  <EquipmentCard
                    key={asset.id}
                    asset={asset}
                    clientName={asset.owner_contact_id ? contactNameMap.get(asset.owner_contact_id) : undefined}
                    selectable
                    isSelected={existingAssetIds.has(asset.id)}
                    onToggle={() => handleToggleAsset(asset)}
                    disabled={addMutation.isPending || removeMutation.isPending}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Attached equipment — reuses EquipmentCard from registry ── */}
      {hasEquipment ? (
        <div className="grid gap-4" style={{ gridTemplateColumns: equipmentDetails.length === 1 ? '1fr' : 'repeat(auto-fill, minmax(380px, 1fr))' }}>
          {equipmentDetails.map((item) => {
            const isOwnItem = item.added_by_tenant_id === tenantId;
            const canRemove = isOwnItem && !!contractId;
            const cardAsset = detailToCardAsset(item);
            // Resolve client name: use asset_registry_id to find in registry,
            // or fall back to the buyer contact on this contract
            const clientName = buyerId ? contactNameMap.get(buyerId) : undefined;

            return (
              <EquipmentCard
                key={item.id}
                asset={cardAsset}
                clientName={clientName}
                onDelete={canRemove ? () => handleRemoveCard(item) : undefined}
                onEdit={undefined}
                disabled={removeMutation.isPending}
              />
            );
          })}
        </div>
      ) : (
        <div
          className="rounded-xl border p-10 flex flex-col items-center justify-center text-center"
          style={{
            backgroundColor: colors.utility.secondaryBackground,
            borderColor: colors.utility.primaryText + '10',
          }}
        >
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center mb-4"
            style={{ backgroundColor: colors.utility.primaryText + '08' }}
          >
            <Wrench className="h-6 w-6" style={{ color: colors.utility.secondaryText }} />
          </div>
          <h3 className="text-sm font-semibold mb-1" style={{ color: colors.utility.primaryText }}>
            No Equipment Attached
          </h3>
          <p className="text-xs max-w-xs" style={{ color: colors.utility.secondaryText }}>
            {canAdd
              ? 'Add equipment to this contract using the button above.'
              : isBuyer
                ? 'Equipment additions are not enabled for this contract.'
                : 'No equipment has been added to this contract yet.'}
          </p>
        </div>
      )}

      {/* ── EquipmentFormDialog (reused from equipment-registry) ── */}
      <EquipmentFormDialog
        isOpen={isAddFormOpen}
        onClose={() => setIsAddFormOpen(false)}
        mode="create"
        categories={allFormCategories}
        onSubmit={handleCreateSubmit}
        isSubmitting={createMutation.isPending}
        defaultOwnershipType={isBuyer ? 'self' : 'client'}
        lockedContactId={isBuyer ? undefined : buyerId}
      />
    </div>
  );
};

export default EquipmentTab;
