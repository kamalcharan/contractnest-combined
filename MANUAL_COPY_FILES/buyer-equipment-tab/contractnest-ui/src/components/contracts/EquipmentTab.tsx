// src/components/contracts/EquipmentTab.tsx
// Equipment & Facility details tab for contract detail page
// Shows cards for each equipment/entity item from equipment_details JSONB
// Buyer can add their own equipment (from self-owned registry) and remove their own items

import React, { useState, useMemo, useCallback } from 'react';
import {
  Wrench, Building2, MapPin, Shield, AlertTriangle, Calendar, Hash,
  Plus, X, Check, Search, Package, Loader2,
} from 'lucide-react';
import type { ContractEquipmentDetail } from '@/types/contracts';
import { useAuth } from '@/context/AuthContext';
import { useAssetRegistryManager } from '@/hooks/queries/useAssetRegistry';
import { useBuyerAddEquipment, useBuyerRemoveEquipment } from '@/hooks/queries/useContractQueries';
import type { TenantAsset, AssetRegistryFilters } from '@/types/assetRegistry';
import { CONDITION_CONFIG as ASSET_CONDITION_CONFIG } from '@/types/assetRegistry';
import { VaNiLoader } from '@/components/common/loaders/UnifiedLoader';

// =================================================================
// CONSTANTS
// =================================================================

const CONDITION_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  good:     { label: 'Good',     color: '#16a34a', bg: '#f0fdf4' },
  fair:     { label: 'Fair',     color: '#d97706', bg: '#fffbeb' },
  poor:     { label: 'Poor',     color: '#ea580c', bg: '#fff7ed' },
  critical: { label: 'Critical', color: '#dc2626', bg: '#fef2f2' },
};

const CRITICALITY_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  low:      { label: 'Low',      color: '#6b7280', bg: '#f9fafb' },
  medium:   { label: 'Medium',   color: '#d97706', bg: '#fffbeb' },
  high:     { label: 'High',     color: '#ea580c', bg: '#fff7ed' },
  critical: { label: 'Critical', color: '#dc2626', bg: '#fef2f2' },
};

// =================================================================
// PROPS
// =================================================================

interface EquipmentTabProps {
  equipmentDetails: ContractEquipmentDetail[];
  allowBuyerToAdd?: boolean;
  colors: any;
  isBuyer?: boolean;
  contractId?: string;
}

// =================================================================
// HELPERS
// =================================================================

function generateId(): string {
  return crypto.randomUUID?.() ?? `eq-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function assetToEquipmentItem(asset: TenantAsset, tenantId: string): ContractEquipmentDetail {
  return {
    id: generateId(),
    asset_registry_id: asset.id,
    added_by_tenant_id: tenantId,
    added_by_role: 'buyer',
    resource_type: (asset.resource_type_id || '').toLowerCase() === 'asset' ? 'entity' : 'equipment',
    category_id: asset.asset_type_id || null,
    category_name: asset.description || 'Equipment',
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

// =================================================================
// SINGLE EQUIPMENT CARD
// =================================================================

const EquipmentCard: React.FC<{
  item: ContractEquipmentDetail;
  colors: any;
  canRemove?: boolean;
  onRemove?: () => void;
  isRemoving?: boolean;
}> = ({ item, colors, canRemove, onRemove, isRemoving }) => {
  const isEntity = item.resource_type === 'entity';
  const Icon = isEntity ? Building2 : Wrench;
  const condition = item.condition ? CONDITION_CONFIG[item.condition] : null;
  const criticality = item.criticality ? CRITICALITY_CONFIG[item.criticality] : null;

  const fmtDate = (d?: string | null) => {
    if (!d) return null;
    return new Date(d).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  return (
    <div
      className="rounded-xl border overflow-hidden"
      style={{
        backgroundColor: colors.utility.secondaryBackground,
        borderColor: colors.utility.primaryText + '12',
      }}
    >
      {/* Header */}
      <div
        className="px-5 py-3.5 flex items-center justify-between"
        style={{ borderBottom: `1px solid ${colors.utility.primaryText}08` }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: colors.brand.primary + '12' }}
          >
            <Icon className="h-4 w-4" style={{ color: colors.brand.primary }} />
          </div>
          <div>
            <div className="text-sm font-semibold" style={{ color: colors.utility.primaryText }}>
              {item.item_name}
            </div>
            <div className="text-xs" style={{ color: colors.utility.secondaryText }}>
              {item.category_name}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Qty badge */}
          <span
            className="text-xs font-semibold px-2 py-0.5 rounded-full"
            style={{ backgroundColor: colors.utility.primaryText + '08', color: colors.utility.secondaryText }}
          >
            Qty: {item.quantity}
          </span>
          {/* Remove button (buyer can only remove their own) */}
          {canRemove && (
            <button
              onClick={onRemove}
              disabled={isRemoving}
              className="p-1 rounded-md hover:opacity-70 transition-opacity disabled:opacity-40"
              style={{ color: '#ef4444' }}
              title="Remove from contract"
            >
              {isRemoving ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
            </button>
          )}
        </div>
      </div>

      {/* Details grid */}
      <div className="px-5 py-4">
        <div className="grid grid-cols-2 gap-x-6 gap-y-3">
          {condition && (
            <div>
              <div className="text-[0.65rem] uppercase tracking-wide mb-1" style={{ color: colors.utility.secondaryText }}>
                Condition
              </div>
              <span
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold"
                style={{ backgroundColor: condition.bg, color: condition.color }}
              >
                <Shield className="h-3 w-3" />
                {condition.label}
              </span>
            </div>
          )}

          {criticality && (
            <div>
              <div className="text-[0.65rem] uppercase tracking-wide mb-1" style={{ color: colors.utility.secondaryText }}>
                Criticality
              </div>
              <span
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold"
                style={{ backgroundColor: criticality.bg, color: criticality.color }}
              >
                <AlertTriangle className="h-3 w-3" />
                {criticality.label}
              </span>
            </div>
          )}

          {(item.make || item.model) && (
            <div>
              <div className="text-[0.65rem] uppercase tracking-wide mb-1" style={{ color: colors.utility.secondaryText }}>
                Make / Model
              </div>
              <div className="text-xs font-medium" style={{ color: colors.utility.primaryText }}>
                {[item.make, item.model].filter(Boolean).join(' / ') || '\u2014'}
              </div>
            </div>
          )}

          {item.serial_number && (
            <div>
              <div className="text-[0.65rem] uppercase tracking-wide mb-1" style={{ color: colors.utility.secondaryText }}>
                Serial Number
              </div>
              <div className="text-xs font-mono font-medium flex items-center gap-1" style={{ color: colors.utility.primaryText }}>
                <Hash className="h-3 w-3" style={{ color: colors.utility.secondaryText }} />
                {item.serial_number}
              </div>
            </div>
          )}

          {item.location && (
            <div>
              <div className="text-[0.65rem] uppercase tracking-wide mb-1" style={{ color: colors.utility.secondaryText }}>
                Location
              </div>
              <div className="text-xs font-medium flex items-center gap-1" style={{ color: colors.utility.primaryText }}>
                <MapPin className="h-3 w-3" style={{ color: colors.utility.secondaryText }} />
                {item.location}
              </div>
            </div>
          )}

          {item.purchase_date && (
            <div>
              <div className="text-[0.65rem] uppercase tracking-wide mb-1" style={{ color: colors.utility.secondaryText }}>
                Purchase Date
              </div>
              <div className="text-xs font-medium flex items-center gap-1" style={{ color: colors.utility.primaryText }}>
                <Calendar className="h-3 w-3" style={{ color: colors.utility.secondaryText }} />
                {fmtDate(item.purchase_date)}
              </div>
            </div>
          )}

          {item.warranty_expiry && (
            <div>
              <div className="text-[0.65rem] uppercase tracking-wide mb-1" style={{ color: colors.utility.secondaryText }}>
                Warranty Expiry
              </div>
              <div className="text-xs font-medium" style={{ color: colors.utility.primaryText }}>
                {fmtDate(item.warranty_expiry)}
              </div>
            </div>
          )}

          {item.area_sqft != null && item.area_sqft > 0 && (
            <div>
              <div className="text-[0.65rem] uppercase tracking-wide mb-1" style={{ color: colors.utility.secondaryText }}>
                Area
              </div>
              <div className="text-xs font-medium" style={{ color: colors.utility.primaryText }}>
                {item.area_sqft.toLocaleString()} sq ft
              </div>
            </div>
          )}

          {item.capacity != null && item.capacity > 0 && (
            <div>
              <div className="text-[0.65rem] uppercase tracking-wide mb-1" style={{ color: colors.utility.secondaryText }}>
                Capacity
              </div>
              <div className="text-xs font-medium" style={{ color: colors.utility.primaryText }}>
                {item.capacity.toLocaleString()}
              </div>
            </div>
          )}
        </div>

        {item.notes && (
          <div className="mt-3 pt-3" style={{ borderTop: `1px solid ${colors.utility.primaryText}08` }}>
            <div className="text-[0.65rem] uppercase tracking-wide mb-1" style={{ color: colors.utility.secondaryText }}>
              Notes
            </div>
            <div className="text-xs" style={{ color: colors.utility.primaryText }}>
              {item.notes}
            </div>
          </div>
        )}
      </div>

      {/* Footer — who added */}
      <div
        className="px-5 py-2 text-[0.6rem]"
        style={{
          backgroundColor: colors.utility.primaryText + '04',
          color: colors.utility.secondaryText,
          borderTop: `1px solid ${colors.utility.primaryText}06`,
        }}
      >
        Added by {item.added_by_role === 'buyer' ? 'Buyer' : 'Seller'}
      </div>
    </div>
  );
};

// =================================================================
// BUYER ASSET PICKER (inline panel)
// =================================================================

const BuyerAssetPicker: React.FC<{
  contractId: string;
  existingAssetIds: Set<string>;
  colors: any;
  onClose: () => void;
}> = ({ contractId, existingAssetIds, colors, onClose }) => {
  const { currentTenant } = useAuth();
  const tenantId = currentTenant?.id || '';

  const [searchQuery, setSearchQuery] = useState('');

  // Fetch buyer's self-owned equipment
  const filters: AssetRegistryFilters = useMemo(() => ({
    limit: 500,
    offset: 0,
    ownership_type: 'self' as const,
  }), []);

  const { assets, isLoading } = useAssetRegistryManager(filters);

  const addMutation = useBuyerAddEquipment();

  // Filter display assets
  const displayAssets = useMemo(() => {
    let filtered = assets.filter(
      (a) =>
        ['equipment', 'asset'].includes((a.resource_type_id || '').toLowerCase()) &&
        a.is_active &&
        !existingAssetIds.has(a.id)
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
  }, [assets, searchQuery, existingAssetIds]);

  const handleAdd = useCallback(async (asset: TenantAsset) => {
    const item = assetToEquipmentItem(asset, tenantId);
    try {
      await addMutation.mutateAsync({ contractId, equipmentItem: item });
    } catch {
      // Error toast handled by mutation hook
    }
  }, [contractId, tenantId, addMutation]);

  return (
    <div
      className="rounded-xl border overflow-hidden"
      style={{
        backgroundColor: colors.utility.secondaryBackground,
        borderColor: colors.brand.primary + '30',
      }}
    >
      {/* Header */}
      <div
        className="px-5 py-3.5 flex items-center justify-between"
        style={{
          backgroundColor: colors.brand.primary + '08',
          borderBottom: `1px solid ${colors.brand.primary}20`,
        }}
      >
        <div className="flex items-center gap-2">
          <Plus className="h-4 w-4" style={{ color: colors.brand.primary }} />
          <span className="text-sm font-bold" style={{ color: colors.utility.primaryText }}>
            Add Your Equipment
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-md hover:opacity-70"
          style={{ color: colors.utility.secondaryText }}
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Search */}
      <div className="px-5 py-3">
        <div className="relative">
          <Search
            className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5"
            style={{ color: colors.utility.secondaryText }}
          />
          <input
            placeholder="Search your equipment..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-2 rounded-lg border text-xs"
            style={{
              borderColor: colors.utility.primaryText + '20',
              backgroundColor: colors.utility.primaryBackground,
              color: colors.utility.primaryText,
            }}
          />
        </div>
      </div>

      {/* Asset list */}
      <div className="px-5 pb-4 max-h-[40vh] overflow-y-auto space-y-2">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <VaNiLoader size="sm" message="Loading your equipment..." />
          </div>
        ) : displayAssets.length === 0 ? (
          <div className="text-center py-8">
            <Package
              className="h-10 w-10 mx-auto mb-2"
              style={{ color: colors.utility.secondaryText + '40' }}
            />
            <p className="text-xs" style={{ color: colors.utility.secondaryText }}>
              {searchQuery
                ? `No equipment matching "${searchQuery}"`
                : existingAssetIds.size > 0
                  ? 'All your equipment has already been added'
                  : 'No equipment in your registry yet'}
            </p>
          </div>
        ) : (
          displayAssets.map((asset) => {
            const condCfg = ASSET_CONDITION_CONFIG[asset.condition] || ASSET_CONDITION_CONFIG.good;
            return (
              <div
                key={asset.id}
                className="flex items-center gap-3 p-3 rounded-lg border transition-all hover:shadow-sm"
                style={{
                  backgroundColor: colors.utility.primaryBackground,
                  borderColor: colors.utility.primaryText + '12',
                }}
              >
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 text-sm"
                  style={{ backgroundColor: condCfg.bg }}
                >
                  {(asset.resource_type_id || '').toLowerCase() === 'equipment' ? '🔧' : '🏢'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold truncate" style={{ color: colors.utility.primaryText }}>
                    {asset.name}
                  </div>
                  <div className="text-xs truncate" style={{ color: colors.utility.secondaryText }}>
                    {[asset.make, asset.model].filter(Boolean).join(' · ') || 'No make/model'}
                    {asset.serial_number ? ` · SN: ${asset.serial_number}` : ''}
                  </div>
                </div>
                <button
                  onClick={() => handleAdd(asset)}
                  disabled={addMutation.isPending}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors hover:opacity-90 disabled:opacity-40 flex-shrink-0"
                  style={{
                    backgroundColor: colors.brand.primary,
                    color: '#fff',
                  }}
                >
                  {addMutation.isPending ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Plus className="h-3 w-3" />
                  )}
                  Add
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

// =================================================================
// MAIN COMPONENT
// =================================================================

const EquipmentTab: React.FC<EquipmentTabProps> = ({
  equipmentDetails,
  allowBuyerToAdd,
  colors,
  isBuyer = false,
  contractId,
}) => {
  const { currentTenant } = useAuth();
  const tenantId = currentTenant?.id || '';

  const [showPicker, setShowPicker] = useState(false);
  const [removingItemId, setRemovingItemId] = useState<string | null>(null);

  const removeMutation = useBuyerRemoveEquipment();

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

  const canBuyerAdd = isBuyer && allowBuyerToAdd && contractId;

  const handleRemove = useCallback(async (itemId: string) => {
    if (!contractId) return;
    setRemovingItemId(itemId);
    try {
      await removeMutation.mutateAsync({ contractId, itemId });
    } catch {
      // Error toast handled by mutation hook
    } finally {
      setRemovingItemId(null);
    }
  }, [contractId, removeMutation]);

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
          {!isBuyer && allowBuyerToAdd && (
            <span
              className="text-xs px-2.5 py-1 rounded-full font-medium"
              style={{ backgroundColor: '#f59e0b18', color: '#d97706', border: '1px solid #f59e0b30' }}
            >
              Buyer can add
            </span>
          )}
          {canBuyerAdd && (
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
                  Add My Equipment
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Buyer asset picker */}
      {showPicker && contractId && (
        <BuyerAssetPicker
          contractId={contractId}
          existingAssetIds={existingAssetIds}
          colors={colors}
          onClose={() => setShowPicker(false)}
        />
      )}

      {/* Equipment cards */}
      {hasEquipment ? (
        <div className="grid gap-4" style={{ gridTemplateColumns: equipmentDetails.length === 1 ? '1fr' : 'repeat(auto-fill, minmax(380px, 1fr))' }}>
          {equipmentDetails.map((item) => {
            const isBuyerItem = item.added_by_role === 'buyer' && item.added_by_tenant_id === tenantId;
            return (
              <EquipmentCard
                key={item.id}
                item={item}
                colors={colors}
                canRemove={isBuyer && isBuyerItem && !!contractId}
                onRemove={() => handleRemove(item.id)}
                isRemoving={removingItemId === item.id}
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
            {canBuyerAdd
              ? 'Add your equipment to this contract using the button above.'
              : allowBuyerToAdd
                ? 'The buyer has been invited to add their equipment to this contract.'
                : 'Equipment can be added during contract editing.'}
          </p>
        </div>
      )}
    </div>
  );
};

export default EquipmentTab;
