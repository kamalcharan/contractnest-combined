// src/components/contracts/ContractWizard/steps/EquipmentStep.tsx
// Wizard step: select existing equipment from registry + add new ones for the contract
// Reuses EquipmentCard visual style with multi-select checkboxes
// Uses EquipmentFormDialog from equipment-registry for the "+ Add" drawer

import React, { useState, useCallback, useMemo } from 'react';
import {
  Plus, Search, X, Check, Package, Users,
  Shield, AlertTriangle, XCircle, MapPin,
} from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { VaNiLoader } from '@/components/common/loaders/UnifiedLoader';

// Registry hooks & components
import {
  useAssetRegistryManager,
  useCreateAsset,
} from '@/hooks/queries/useAssetRegistry';
import { useResources, type Resource } from '@/hooks/queries/useResources';
import EquipmentFormDialog from '@/pages/equipment-registry/EquipmentFormDialog';

// Types
import type { TenantAsset, AssetFormData, AssetRegistryFilters } from '@/types/assetRegistry';
import { CONDITION_CONFIG, getWarrantyStatus } from '@/types/assetRegistry';
import type { ContractEquipmentDetail } from '@/types/contracts';
import { getSubCategoryConfig } from '@/constants/subCategoryConfig';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// ─── Props ──────────────────────────────────────────────────────────

interface EquipmentStepProps {
  equipmentDetails: ContractEquipmentDetail[];
  onEquipmentDetailsChange: (details: ContractEquipmentDetail[]) => void;
  contractType?: 'client' | 'vendor' | 'partner';
  buyerId?: string | null;
}

// ─── Helpers ────────────────────────────────────────────────────────

function generateId(): string {
  return crypto.randomUUID?.() ?? `eq-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/** Convert a TenantAsset from the registry into a ContractEquipmentDetail */
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

// ─── Main Component ─────────────────────────────────────────────────

const EquipmentStep: React.FC<EquipmentStepProps> = ({
  equipmentDetails,
  onEquipmentDetailsChange,
  contractType = 'client',
  buyerId,
}) => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;
  const { currentTenant } = useAuth();

  // The role of the person operating the wizard
  const addedByRole: 'seller' | 'buyer' = contractType === 'vendor' ? 'buyer' : 'seller';
  const tenantId = currentTenant?.id || '';

  // ── Fetch registry equipment ────────────────────────────────────

  const filters: AssetRegistryFilters = useMemo(() => ({ limit: 500, offset: 0 }), []);

  const {
    assets,
    isLoading: assetsLoading,
    isError: assetsError,
  } = useAssetRegistryManager(filters);

  const createMutation = useCreateAsset();

  // ── Fetch resources for category/type data ──────────────────────

  const { data: allResources = [], isLoading: resourcesLoading } = useResources();

  // Build lookup maps
  const { resourceIdToSubCategory, equipmentResources, allFormCategories, subCategories } =
    useMemo(() => {
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

      const subCatSet = new Set<string>();
      for (const r of eqResources) {
        subCatSet.add(r.sub_category || 'Other');
      }
      const sortedSubCats = [...subCatSet].sort((a, b) => {
        if (a === 'Other') return 1;
        if (b === 'Other') return -1;
        return a.localeCompare(b);
      });

      return {
        resourceIdToSubCategory: idToSubCat,
        equipmentResources: eqResources,
        allFormCategories: formCats,
        subCategories: sortedSubCats,
      };
    }, [allResources]);

  // ── Derive selected asset IDs from equipmentDetails ─────────────

  const selectedAssetIds = useMemo(() => {
    const set = new Set<string>();
    for (const d of equipmentDetails) {
      if (d.asset_registry_id) set.add(d.asset_registry_id);
    }
    return set;
  }, [equipmentDetails]);

  // Buyer placeholders (entries without asset_registry_id)
  const buyerPlaceholders = useMemo(
    () => equipmentDetails.filter((d) => !d.asset_registry_id),
    [equipmentDetails]
  );

  // ── Local state ─────────────────────────────────────────────────

  const [searchQuery, setSearchQuery] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [showBuyerAdd, setShowBuyerAdd] = useState(false);
  const [buyerCategory, setBuyerCategory] = useState('');
  const [buyerType, setBuyerType] = useState('');
  const [buyerQuantity, setBuyerQuantity] = useState(1);

  // ── Filtered assets for display ────────────────────────────────

  const displayAssets = useMemo(() => {
    let filtered = assets.filter(
      (a) =>
        ['equipment', 'asset'].includes((a.resource_type_id || '').toLowerCase()) &&
        a.is_active
    );

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
  }, [assets, searchQuery]);

  // ── Buyer-add: filtered types by selected category ─────────────

  const buyerFilteredTypes = useMemo(() => {
    if (!buyerCategory) return [];
    return equipmentResources.filter((r) => (r.sub_category || 'Other') === buyerCategory);
  }, [buyerCategory, equipmentResources]);

  // ── Handlers ────────────────────────────────────────────────────

  const toggleAssetSelection = useCallback(
    (asset: TenantAsset) => {
      if (selectedAssetIds.has(asset.id)) {
        // Deselect
        onEquipmentDetailsChange(
          equipmentDetails.filter((d) => d.asset_registry_id !== asset.id)
        );
      } else {
        // Select
        const detail = assetToDetail(asset, tenantId, addedByRole, resourceIdToSubCategory);
        onEquipmentDetailsChange([...equipmentDetails, detail]);
      }
    },
    [selectedAssetIds, equipmentDetails, onEquipmentDetailsChange, tenantId, addedByRole, resourceIdToSubCategory]
  );

  const handleSelectAll = useCallback(() => {
    const allIds = new Set(displayAssets.map((a) => a.id));
    const allSelected = displayAssets.every((a) => selectedAssetIds.has(a.id));

    if (allSelected) {
      // Deselect all visible
      onEquipmentDetailsChange(
        equipmentDetails.filter((d) => !d.asset_registry_id || !allIds.has(d.asset_registry_id))
      );
    } else {
      // Select all visible (add missing ones)
      const newDetails = [...equipmentDetails];
      for (const asset of displayAssets) {
        if (!selectedAssetIds.has(asset.id)) {
          newDetails.push(assetToDetail(asset, tenantId, addedByRole, resourceIdToSubCategory));
        }
      }
      onEquipmentDetailsChange(newDetails);
    }
  }, [displayAssets, selectedAssetIds, equipmentDetails, onEquipmentDetailsChange, tenantId, addedByRole, resourceIdToSubCategory]);

  const allVisibleSelected =
    displayAssets.length > 0 && displayAssets.every((a) => selectedAssetIds.has(a.id));

  // "+ Add Equipment" — create in registry and auto-select
  const handleCreateSubmit = useCallback(
    async (data: AssetFormData) => {
      try {
        const created = await createMutation.mutateAsync(data);
        // Auto-select the newly created asset
        const detail = assetToDetail(created, tenantId, addedByRole, resourceIdToSubCategory);
        onEquipmentDetailsChange([...equipmentDetails, detail]);
        setIsAddOpen(false);
      } catch {
        /* toast handled by useCreateAsset hook */
      }
    },
    [createMutation, tenantId, addedByRole, resourceIdToSubCategory, equipmentDetails, onEquipmentDetailsChange]
  );

  // "Let Buyer Add" — create placeholder
  const handleBuyerPlaceholder = useCallback(() => {
    if (!buyerCategory || !buyerType) return;

    const resource = equipmentResources.find((r) => r.id === buyerType);
    const placeholder: ContractEquipmentDetail = {
      id: generateId(),
      asset_registry_id: null,
      added_by_tenant_id: tenantId,
      added_by_role: 'buyer',
      resource_type: (resource?.resource_type_id || '').toLowerCase() === 'asset' ? 'entity' : 'equipment',
      category_id: buyerType,
      category_name: buyerCategory,
      item_name: resource?.display_name || resource?.name || buyerCategory,
      quantity: buyerQuantity,
      notes: 'Buyer to fill details',
    };

    onEquipmentDetailsChange([...equipmentDetails, placeholder]);
    setBuyerCategory('');
    setBuyerType('');
    setBuyerQuantity(1);
    setShowBuyerAdd(false);
  }, [buyerCategory, buyerType, buyerQuantity, equipmentResources, tenantId, equipmentDetails, onEquipmentDetailsChange]);

  const removeBuyerPlaceholder = useCallback(
    (id: string) => {
      onEquipmentDetailsChange(equipmentDetails.filter((d) => d.id !== id));
    },
    [equipmentDetails, onEquipmentDetailsChange]
  );

  // ── Counts ─────────────────────────────────────────────────────

  const totalSelected = selectedAssetIds.size + buyerPlaceholders.length;
  const totalItems = displayAssets.length + buyerPlaceholders.length;

  // ── Loading ────────────────────────────────────────────────────

  const isLoading = assetsLoading || resourcesLoading;

  // ── Render ──────────────────────────────────────────────────────

  return (
    <div className="px-6 py-4">
      {/* ── Header Bar ──────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        {/* Left: Selection count */}
        <div className="flex items-center gap-3">
          <span
            className="text-sm font-semibold"
            style={{ color: colors.utility.primaryText }}
          >
            {totalSelected} of {totalItems} selected
          </span>
          {displayAssets.length > 0 && (
            <button
              onClick={handleSelectAll}
              className="text-xs font-semibold px-2.5 py-1 rounded-md border transition-all hover:opacity-80"
              style={{
                borderColor: allVisibleSelected
                  ? colors.brand.primary
                  : colors.utility.primaryText + '20',
                color: allVisibleSelected
                  ? colors.brand.primary
                  : colors.utility.secondaryText,
                backgroundColor: allVisibleSelected
                  ? colors.brand.primary + '08'
                  : 'transparent',
              }}
            >
              {allVisibleSelected ? 'Deselect All' : 'Select All'}
            </button>
          )}
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          {/* + Add Equipment */}
          <button
            onClick={() => setIsAddOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors hover:opacity-90"
            style={{
              backgroundColor: colors.brand.primary,
              color: '#fff',
            }}
          >
            <Plus className="h-3.5 w-3.5" />
            Add Equipment
          </button>

          {/* Let Buyer Add */}
          <button
            onClick={() => setShowBuyerAdd(!showBuyerAdd)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border transition-colors hover:opacity-80"
            style={{
              borderColor: showBuyerAdd ? '#f59e0b' : colors.utility.primaryText + '20',
              color: showBuyerAdd ? '#f59e0b' : colors.utility.secondaryText,
              backgroundColor: showBuyerAdd ? '#f59e0b08' : 'transparent',
            }}
          >
            <Users className="h-3.5 w-3.5" />
            Let Buyer Add
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
              className="pl-8 pr-7 py-2 w-44 rounded-lg border text-xs"
              style={{
                borderColor: colors.utility.primaryText + '20',
                backgroundColor: colors.utility.secondaryBackground,
                color: colors.utility.primaryText,
              }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2"
              >
                <X
                  className="h-3 w-3"
                  style={{ color: colors.utility.secondaryText }}
                />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Buyer Add Inline Panel ──────────────────────────────── */}
      {showBuyerAdd && (
        <div
          className="mb-4 p-4 rounded-xl border"
          style={{
            backgroundColor: '#f59e0b08',
            borderColor: '#f59e0b30',
          }}
        >
          <div className="flex items-center gap-2 mb-3">
            <Users className="h-4 w-4" style={{ color: '#f59e0b' }} />
            <span
              className="text-xs font-bold uppercase tracking-wider"
              style={{ color: '#f59e0b' }}
            >
              Buyer to Fill
            </span>
          </div>
          <p className="text-xs mb-3" style={{ color: colors.utility.secondaryText }}>
            Select category and type — the buyer will fill in the remaining equipment details.
          </p>
          <div className="flex items-end gap-3 flex-wrap">
            {/* Category */}
            <div className="flex-1 min-w-[160px]">
              <label
                className="text-[10px] font-bold uppercase tracking-wider mb-1 block"
                style={{ color: colors.utility.secondaryText }}
              >
                Category
              </label>
              <Select
                value={buyerCategory}
                onValueChange={(v) => {
                  setBuyerCategory(v);
                  setBuyerType('');
                }}
              >
                <SelectTrigger
                  style={{
                    borderColor: colors.utility.primaryText + '20',
                    backgroundColor: colors.utility.primaryBackground,
                    color: colors.utility.primaryText,
                    height: '36px',
                    fontSize: '13px',
                  }}
                >
                  <SelectValue placeholder="Select category..." />
                </SelectTrigger>
                <SelectContent>
                  {subCategories.map((subCat) => {
                    const cfg = getSubCategoryConfig(subCat);
                    const Icon = cfg?.icon || Package;
                    return (
                      <SelectItem key={subCat} value={subCat}>
                        <span className="flex items-center gap-2">
                          <Icon size={14} style={{ color: cfg?.color || '#6B7280' }} />
                          {subCat}
                        </span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            {/* Equipment Type */}
            <div className="flex-1 min-w-[160px]">
              <label
                className="text-[10px] font-bold uppercase tracking-wider mb-1 block"
                style={{ color: colors.utility.secondaryText }}
              >
                Equipment Type
              </label>
              <Select
                value={buyerType}
                onValueChange={setBuyerType}
                disabled={!buyerCategory}
              >
                <SelectTrigger
                  style={{
                    borderColor: colors.utility.primaryText + '20',
                    backgroundColor: colors.utility.primaryBackground,
                    color: colors.utility.primaryText,
                    height: '36px',
                    fontSize: '13px',
                  }}
                >
                  <SelectValue
                    placeholder={buyerCategory ? 'Select type...' : 'Pick category first'}
                  />
                </SelectTrigger>
                <SelectContent>
                  {buyerFilteredTypes.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.display_name || r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Quantity */}
            <div className="w-20">
              <label
                className="text-[10px] font-bold uppercase tracking-wider mb-1 block"
                style={{ color: colors.utility.secondaryText }}
              >
                Qty
              </label>
              <input
                type="number"
                min={1}
                value={buyerQuantity}
                onChange={(e) =>
                  setBuyerQuantity(Math.max(1, parseInt(e.target.value) || 1))
                }
                className="w-full px-2 py-2 rounded-md border text-xs text-center"
                style={{
                  borderColor: colors.utility.primaryText + '20',
                  backgroundColor: colors.utility.primaryBackground,
                  color: colors.utility.primaryText,
                  height: '36px',
                }}
              />
            </div>

            {/* Create Placeholder */}
            <button
              onClick={handleBuyerPlaceholder}
              disabled={!buyerCategory || !buyerType}
              className="px-4 py-2 rounded-lg text-xs font-semibold transition-colors hover:opacity-90 disabled:opacity-40"
              style={{
                backgroundColor: '#f59e0b',
                color: '#fff',
                height: '36px',
              }}
            >
              Add Placeholder
            </button>
          </div>
        </div>
      )}

      {/* ── Buyer Placeholders ──────────────────────────────────── */}
      {buyerPlaceholders.length > 0 && (
        <div className="mb-4 space-y-2">
          {buyerPlaceholders.map((p) => (
            <div
              key={p.id}
              className="flex items-center gap-3 p-3 rounded-lg border"
              style={{
                backgroundColor: '#f59e0b08',
                borderColor: '#f59e0b30',
              }}
            >
              <span
                className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: '#f59e0b20', color: '#f59e0b' }}
              >
                Buyer to fill
              </span>
              <span
                className="text-sm font-medium flex-1"
                style={{ color: colors.utility.primaryText }}
              >
                {p.item_name}
              </span>
              <span className="text-xs" style={{ color: colors.utility.secondaryText }}>
                {p.category_name} · Qty {p.quantity}
              </span>
              <button
                onClick={() => removeBuyerPlaceholder(p.id)}
                className="p-1 rounded hover:opacity-70"
                style={{ color: colors.semantic?.error || '#ef4444' }}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ── Equipment Grid ──────────────────────────────────────── */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <VaNiLoader size="sm" message="Loading equipment..." />
        </div>
      ) : displayAssets.length === 0 ? (
        <div className="text-center py-16">
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
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 max-h-[50vh] overflow-y-auto pr-1">
          {displayAssets.map((asset) => {
            const isSelected = selectedAssetIds.has(asset.id);
            const conditionCfg =
              CONDITION_CONFIG[asset.condition] || CONDITION_CONFIG.good;
            const warranty = getWarrantyStatus(asset.warranty_expiry);
            const WarrantyIcon =
              warranty.variant === 'active'
                ? Shield
                : warranty.variant === 'expiring'
                  ? AlertTriangle
                  : warranty.variant === 'expired'
                    ? XCircle
                    : null;
            const warrantyColor =
              warranty.variant === 'active'
                ? '#10b981'
                : warranty.variant === 'expiring'
                  ? '#f59e0b'
                  : warranty.variant === 'expired'
                    ? '#ef4444'
                    : colors.utility.secondaryText;

            return (
              <div
                key={asset.id}
                onClick={() => toggleAssetSelection(asset)}
                className="rounded-lg border transition-all duration-200 cursor-pointer relative"
                style={{
                  backgroundColor: colors.utility.secondaryBackground,
                  borderColor: isSelected
                    ? colors.brand.primary
                    : colors.utility.primaryText + '15',
                  borderWidth: isSelected ? '2px' : '1px',
                  boxShadow: isSelected
                    ? `0 0 0 1px ${colors.brand.primary}30`
                    : 'none',
                }}
              >
                <div className="p-5">
                  {/* Top Row: Checkbox + Condition Badge */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      {/* Checkbox */}
                      <div
                        className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0 transition-colors"
                        style={{
                          backgroundColor: isSelected
                            ? colors.brand.primary
                            : 'transparent',
                          border: isSelected
                            ? 'none'
                            : `2px solid ${colors.utility.primaryText}30`,
                        }}
                      >
                        {isSelected && (
                          <Check className="h-3 w-3 text-white" />
                        )}
                      </div>
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center text-lg"
                        style={{ backgroundColor: conditionCfg.bg }}
                      >
                        {(asset.resource_type_id || '').toLowerCase() ===
                        'equipment'
                          ? '🔧'
                          : '🏢'}
                      </div>
                    </div>
                    <span
                      className="text-xs font-semibold px-2.5 py-1 rounded-full"
                      style={{
                        backgroundColor: conditionCfg.bg,
                        color: conditionCfg.color,
                      }}
                    >
                      {conditionCfg.label}
                    </span>
                  </div>

                  {/* Name + Model */}
                  <h3
                    className="text-sm font-bold mb-0.5 truncate"
                    style={{ color: colors.utility.primaryText }}
                  >
                    {asset.name}
                  </h3>
                  <p
                    className="text-xs mb-3 truncate"
                    style={{ color: colors.utility.secondaryText }}
                  >
                    {[asset.make, asset.model].filter(Boolean).join(' \u00B7 ') ||
                      'No make/model'}
                  </p>

                  {/* Details Grid */}
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    {asset.serial_number && (
                      <div>
                        <div
                          className="text-[10px] font-semibold uppercase tracking-wide"
                          style={{ color: colors.utility.secondaryText }}
                        >
                          Serial
                        </div>
                        <div
                          className="text-xs font-medium truncate"
                          style={{ color: colors.utility.primaryText }}
                        >
                          {asset.serial_number}
                        </div>
                      </div>
                    )}
                    {asset.location && (
                      <div>
                        <div
                          className="text-[10px] font-semibold uppercase tracking-wide"
                          style={{ color: colors.utility.secondaryText }}
                        >
                          Location
                        </div>
                        <div
                          className="text-xs font-medium truncate flex items-center gap-1"
                          style={{ color: colors.utility.primaryText }}
                        >
                          <MapPin className="h-3 w-3 flex-shrink-0" />
                          {asset.location}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Warranty Badge */}
                  {warranty.variant !== 'none' && (
                    <div
                      className="flex items-center gap-1.5 text-xs font-semibold px-2 py-1 rounded-md w-fit"
                      style={{
                        backgroundColor: warrantyColor + '15',
                        color: warrantyColor,
                      }}
                    >
                      {WarrantyIcon && <WarrantyIcon className="h-3 w-3" />}
                      {warranty.label}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Add Equipment Drawer (from registry) ───────────────── */}
      <EquipmentFormDialog
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        mode="create"
        categories={allFormCategories}
        onSubmit={handleCreateSubmit}
        isSubmitting={createMutation.isPending}
      />
    </div>
  );
};

export default EquipmentStep;
