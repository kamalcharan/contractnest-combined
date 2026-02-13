// src/components/contracts/ContractWizard/steps/AssetSelectionStep.tsx
// Wizard step: select which client assets this contract covers

import React, { useMemo, useState } from 'react';
import { Search, X, Wrench, Check, Package } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { VaNiLoader } from '@/components/common/loaders/UnifiedLoader';
import { useClientAssets } from '@/hooks/queries/useClientAssetRegistry';
import type { ClientAsset } from '@/types/clientAssetRegistry';
import { STATUS_CONFIG, CONDITION_CONFIG } from '@/types/clientAssetRegistry';

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
          <p className="text-xs" style={{ color: colors.utility.secondaryText + '80' }}>
            Assets can be added from the Contact 360 view.
          </p>
        </div>
      ) : (
        <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
          {filteredAssets.map((asset) => {
            const isSelected = selectedAssetIds.includes(asset.id);
            const statusCfg = STATUS_CONFIG[asset.status];
            const conditionCfg = CONDITION_CONFIG[asset.condition];

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
    </div>
  );
};

export default AssetSelectionStep;
