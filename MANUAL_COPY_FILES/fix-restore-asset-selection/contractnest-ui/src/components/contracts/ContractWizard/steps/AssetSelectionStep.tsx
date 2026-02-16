// src/components/contracts/ContractWizard/steps/AssetSelectionStep.tsx
// Wizard step: select which client assets this contract covers
// Features: select existing assets, add new equipment/entity, let buyer add details

import React, { useMemo, useState, useCallback } from 'react';
import { Search, X, Wrench, Check, Package, Plus, UserPlus, ChevronDown } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { VaNiLoader } from '@/components/common/loaders/UnifiedLoader';
import { useClientAssets, useCreateClientAsset, useEquipmentCategories } from '@/hooks/queries/useClientAssetRegistry';
import type { ClientAsset, ClientAssetFormData, EquipmentCategory } from '@/types/clientAssetRegistry';
import { STATUS_CONFIG, CONDITION_CONFIG, DEFAULT_CLIENT_ASSET_FORM_DATA } from '@/types/clientAssetRegistry';
import ClientAssetFormDialog from '@/components/assets/ClientAssetFormDialog';

interface AssetSelectionStepProps {
  contactId: string;
  selectedAssetIds: string[];
  onSelectedAssetIdsChange: (ids: string[]) => void;
}

const AssetSelectionStep: React.FC<AssetSelectionStepProps> = ({
  contactId,
  selectedAssetIds,
  onSelectedAssetIdsChange,
}) => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;
  const [search, setSearch] = useState('');

  // Add Equipment dialog state
  const [showAddDialog, setShowAddDialog] = useState(false);
  const createMutation = useCreateClientAsset();

  // "Let Buyer Add" inline state
  const [showBuyerAddPanel, setShowBuyerAddPanel] = useState(false);
  const [buyerAddTypeId, setBuyerAddTypeId] = useState('');
  const [isBuyerAddSubmitting, setIsBuyerAddSubmitting] = useState(false);
  const { data: categories = [] } = useEquipmentCategories();

  const { data: assetResponse, isLoading } = useClientAssets(
    { contact_id: contactId, limit: 200 },
    { enabled: !!contactId }
  );

  const assets = assetResponse?.data || [];

  const filteredAssets = useMemo(() => {
    if (!search.trim()) return assets;
    const q = search.toLowerCase();
    return assets.filter(a =>
      a.name.toLowerCase().includes(q) ||
      a.code?.toLowerCase().includes(q) ||
      a.make?.toLowerCase().includes(q) ||
      a.model?.toLowerCase().includes(q)
    );
  }, [assets, search]);

  const toggleAsset = (assetId: string) => {
    if (selectedAssetIds.includes(assetId)) {
      onSelectedAssetIdsChange(selectedAssetIds.filter(id => id !== assetId));
    } else {
      onSelectedAssetIdsChange([...selectedAssetIds, assetId]);
    }
  };

  const toggleAll = () => {
    if (selectedAssetIds.length === filteredAssets.length) {
      onSelectedAssetIdsChange([]);
    } else {
      onSelectedAssetIdsChange(filteredAssets.map(a => a.id));
    }
  };

  // Handle Add Equipment form submit
  const handleAddEquipmentSubmit = useCallback(async (data: ClientAssetFormData) => {
    try {
      const created = await createMutation.mutateAsync(data);
      // Auto-select the newly created asset
      if (created?.id) {
        onSelectedAssetIdsChange([...selectedAssetIds, created.id]);
      }
      setShowAddDialog(false);
    } catch {
      // Error toast handled by mutation hook
    }
  }, [createMutation, selectedAssetIds, onSelectedAssetIdsChange]);

  // Handle "Let Buyer Add Details" submit
  const handleBuyerAddSubmit = useCallback(async () => {
    if (!buyerAddTypeId || !contactId) return;
    setIsBuyerAddSubmitting(true);
    try {
      const selectedCat = categories.find(c => c.id === buyerAddTypeId);
      const placeholderName = `TBD — ${selectedCat?.name || 'Equipment'}`;
      const data: ClientAssetFormData = {
        ...DEFAULT_CLIENT_ASSET_FORM_DATA,
        name: placeholderName,
        owner_contact_id: contactId,
        resource_type_id: buyerAddTypeId,
        specifications: { buyer_to_fill: 'true' },
      };
      const created = await createMutation.mutateAsync(data);
      if (created?.id) {
        onSelectedAssetIdsChange([...selectedAssetIds, created.id]);
      }
      setBuyerAddTypeId('');
      setShowBuyerAddPanel(false);
    } catch {
      // Error toast handled by mutation hook
    } finally {
      setIsBuyerAddSubmitting(false);
    }
  }, [buyerAddTypeId, contactId, categories, createMutation, selectedAssetIds, onSelectedAssetIdsChange]);

  if (!contactId) {
    return (
      <div className="px-6 py-12 text-center">
        <Package className="h-12 w-12 mx-auto mb-3" style={{ color: colors.utility.secondaryText + '40' }} />
        <p className="text-sm" style={{ color: colors.utility.secondaryText }}>
          Select a counterparty first to see their assets.
        </p>
      </div>
    );
  }

  return (
    <div className="px-6 py-4">
      {/* Header bar */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold" style={{ color: colors.utility.primaryText }}>
            {selectedAssetIds.length} of {assets.length} selected
          </span>
          {assets.length > 0 && (
            <button
              onClick={toggleAll}
              className="text-xs font-semibold px-2 py-1 rounded"
              style={{ color: colors.brand.primary }}
            >
              {selectedAssetIds.length === filteredAssets.length ? 'Deselect All' : 'Select All'}
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Add Equipment button */}
          <button
            onClick={() => setShowAddDialog(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:opacity-90"
            style={{
              backgroundColor: colors.brand.primary,
              color: '#fff',
            }}
          >
            <Plus className="h-3.5 w-3.5" />
            Add Equipment
          </button>

          {/* Let Buyer Add button */}
          <button
            onClick={() => setShowBuyerAddPanel(!showBuyerAddPanel)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:opacity-90 border"
            style={{
              backgroundColor: colors.utility.primaryBackground,
              borderColor: colors.utility.primaryText + '20',
              color: colors.utility.primaryText,
            }}
          >
            <UserPlus className="h-3.5 w-3.5" />
            Let Buyer Add
            <ChevronDown className={`h-3 w-3 transition-transform ${showBuyerAddPanel ? 'rotate-180' : ''}`} />
          </button>

          {/* Search */}
          <div className="relative w-56">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5" style={{ color: colors.utility.secondaryText }} />
            <input
              placeholder="Search assets..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-8 py-2 rounded-lg border text-xs"
              style={{
                borderColor: colors.utility.primaryText + '15',
                backgroundColor: colors.utility.secondaryBackground,
                color: colors.utility.primaryText,
              }}
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                <X className="h-3 w-3" style={{ color: colors.utility.secondaryText }} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* "Let Buyer Add Details" inline panel */}
      {showBuyerAddPanel && (
        <div
          className="mb-4 p-4 rounded-xl border"
          style={{
            backgroundColor: colors.utility.secondaryBackground,
            borderColor: colors.utility.primaryText + '15',
          }}
        >
          <div className="flex items-center gap-2 mb-3">
            <UserPlus className="h-4 w-4" style={{ color: colors.brand.primary }} />
            <span className="text-xs font-semibold" style={{ color: colors.utility.primaryText }}>
              Let Buyer Add Details
            </span>
            <span className="text-[10px]" style={{ color: colors.utility.secondaryText }}>
              — Select the equipment type, buyer will fill in specifics later
            </span>
          </div>
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <label className="block text-[10px] font-semibold mb-1" style={{ color: colors.utility.secondaryText }}>
                Equipment Type *
              </label>
              <select
                value={buyerAddTypeId}
                onChange={(e) => setBuyerAddTypeId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border text-xs"
                style={{
                  borderColor: colors.utility.primaryText + '20',
                  backgroundColor: colors.utility.primaryBackground,
                  color: colors.utility.primaryText,
                }}
              >
                <option value="">Select equipment type...</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
            <button
              onClick={handleBuyerAddSubmit}
              disabled={!buyerAddTypeId || isBuyerAddSubmitting}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all hover:opacity-90"
              style={{
                backgroundColor: buyerAddTypeId ? colors.brand.primary : colors.utility.primaryText + '20',
                color: buyerAddTypeId ? '#fff' : colors.utility.secondaryText,
                opacity: isBuyerAddSubmitting ? 0.6 : 1,
              }}
            >
              {isBuyerAddSubmitting ? (
                <VaNiLoader size="sm" />
              ) : (
                <>
                  <Plus className="h-3.5 w-3.5" />
                  Add Placeholder
                </>
              )}
            </button>
          </div>
          <p className="text-[10px] mt-2" style={{ color: colors.utility.secondaryText + 'AA' }}>
            A placeholder asset will be created as "TBD — [Type]". The buyer can update name, serial number and other details after contract is shared.
          </p>
        </div>
      )}

      {/* Asset list */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <VaNiLoader size="sm" message="Loading client assets..." />
        </div>
      ) : assets.length === 0 ? (
        <div className="text-center py-16">
          <Wrench className="h-12 w-12 mx-auto mb-3" style={{ color: colors.utility.secondaryText + '40' }} />
          <p className="text-sm mb-1" style={{ color: colors.utility.secondaryText }}>
            No assets registered for this client
          </p>
          <p className="text-xs mb-4" style={{ color: colors.utility.secondaryText + '80' }}>
            Add equipment now or let the buyer add details later.
          </p>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => setShowAddDialog(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold"
              style={{ backgroundColor: colors.brand.primary, color: '#fff' }}
            >
              <Plus className="h-3.5 w-3.5" />
              Add Equipment
            </button>
            <button
              onClick={() => setShowBuyerAddPanel(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold border"
              style={{
                borderColor: colors.utility.primaryText + '20',
                color: colors.utility.primaryText,
              }}
            >
              <UserPlus className="h-3.5 w-3.5" />
              Let Buyer Add
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
          {filteredAssets.map((asset) => {
            const isSelected = selectedAssetIds.includes(asset.id);
            const statusCfg = STATUS_CONFIG[asset.status];
            const conditionCfg = CONDITION_CONFIG[asset.condition];
            const isBuyerPlaceholder = asset.specifications?.buyer_to_fill === 'true';

            return (
              <button
                key={asset.id}
                onClick={() => toggleAsset(asset.id)}
                className="w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left"
                style={{
                  backgroundColor: isSelected ? colors.brand.primary + '08' : colors.utility.primaryBackground,
                  borderColor: isSelected ? colors.brand.primary + '40' : colors.utility.primaryText + '10',
                }}
              >
                {/* Checkbox */}
                <div
                  className="w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors"
                  style={{
                    borderColor: isSelected ? colors.brand.primary : colors.utility.primaryText + '30',
                    backgroundColor: isSelected ? colors.brand.primary : 'transparent',
                  }}
                >
                  {isSelected && <Check className="h-3 w-3 text-white" />}
                </div>

                {/* Icon */}
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: '#f59e0b15' }}
                >
                  <Wrench className="h-4 w-4" style={{ color: '#f59e0b' }} />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold truncate" style={{ color: colors.utility.primaryText }}>
                      {asset.name}
                    </span>
                    {asset.code && (
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded" style={{ backgroundColor: colors.utility.secondaryBackground, color: colors.utility.secondaryText }}>
                        {asset.code}
                      </span>
                    )}
                    {isBuyerPlaceholder && (
                      <span
                        className="text-[9px] px-1.5 py-0.5 rounded-md font-semibold"
                        style={{ backgroundColor: '#f59e0b18', color: '#f59e0b' }}
                      >
                        Buyer to fill
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    {asset.make && (
                      <span className="text-xs" style={{ color: colors.utility.secondaryText }}>
                        {asset.make}{asset.model ? ` ${asset.model}` : ''}
                      </span>
                    )}
                    {asset.location && (
                      <span className="text-xs" style={{ color: colors.utility.secondaryText }}>
                        | {asset.location}
                      </span>
                    )}
                  </div>
                </div>

                {/* Badges */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <span
                    className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase"
                    style={{ backgroundColor: statusCfg.color + '15', color: statusCfg.color }}
                  >
                    {statusCfg.label}
                  </span>
                  <span
                    className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase"
                    style={{ backgroundColor: conditionCfg.bg, color: conditionCfg.color }}
                  >
                    {conditionCfg.label}
                  </span>
                </div>
              </button>
            );
          })}

          {filteredAssets.length === 0 && search && (
            <div className="text-center py-8">
              <p className="text-xs" style={{ color: colors.utility.secondaryText }}>
                No assets matching "{search}"
              </p>
            </div>
          )}
        </div>
      )}

      {/* Add Equipment Dialog (reuses existing ClientAssetFormDialog) */}
      <ClientAssetFormDialog
        isOpen={showAddDialog}
        onClose={() => setShowAddDialog(false)}
        mode="create"
        contactId={contactId}
        onSubmit={handleAddEquipmentSubmit}
        isSubmitting={createMutation.isPending}
      />
    </div>
  );
};

export default AssetSelectionStep;
