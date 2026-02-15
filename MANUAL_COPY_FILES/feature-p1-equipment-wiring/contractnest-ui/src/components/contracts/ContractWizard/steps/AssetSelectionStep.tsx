// src/components/contracts/ContractWizard/steps/AssetSelectionStep.tsx
// Wizard step: select which client assets this contract covers
// Reuses Equipment Registry layout — sidebar + grid + EquipmentCard in selectable mode

import React, { useMemo, useState } from 'react';
import { Search, X, Wrench, Package, Layers } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { VaNiLoader } from '@/components/common/loaders/UnifiedLoader';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useClientAssets } from '@/hooks/queries/useClientAssetRegistry';
import { useResources, type Resource } from '@/hooks/queries/useResources';
import { getSubCategoryConfig } from '@/constants/subCategoryConfig';
import EquipmentCard from '@/pages/equipment-registry/EquipmentCard';
import type { ClientAsset } from '@/types/clientAssetRegistry';

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

  const [selectedSubCategory, setSelectedSubCategory] = useState<string | null>(null);
  const [sidebarSearch, setSidebarSearch] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // ── Fetch client assets ────────────────────────────────────────
  const { data: assetResponse, isLoading: assetsLoading } = useClientAssets(
    { contact_id: contactId, limit: 200 },
    { enabled: !!contactId }
  );
  const assets = assetResponse?.data || [];

  // ── Fetch resources for sub-category grouping ──────────────────
  const { data: allResources = [], isLoading: resourcesLoading } = useResources();

  const equipmentResources = useMemo(() => {
    return allResources.filter(
      (r) =>
        ['equipment', 'asset'].includes((r.resource_type_id || '').toLowerCase()) &&
        r.is_active
    );
  }, [allResources]);

  // ── Sub-category grouping (mirrors Equipment Registry sidebar) ─
  const { subCategories, resourcesBySubCategory, resourceIdToSubCategory } =
    useMemo(() => {
      const bySubCat = new Map<string, Resource[]>();
      const idToSubCat = new Map<string, string>();

      for (const r of equipmentResources) {
        const subCat = r.sub_category || 'Other';
        if (!bySubCat.has(subCat)) bySubCat.set(subCat, []);
        bySubCat.get(subCat)!.push(r);
        idToSubCat.set(r.id, subCat);
      }

      const sorted = [...bySubCat.keys()].sort((a, b) => {
        if (a === 'Other') return 1;
        if (b === 'Other') return -1;
        return a.localeCompare(b);
      });

      return {
        subCategories: sorted,
        resourcesBySubCategory: bySubCat,
        resourceIdToSubCategory: idToSubCat,
      };
    }, [equipmentResources]);

  // ── Filtered sidebar sub-categories ────────────────────────────
  const filteredSubCategories = useMemo(() => {
    if (!sidebarSearch.trim()) return subCategories;
    const q = sidebarSearch.toLowerCase();
    return subCategories.filter((sc) => sc.toLowerCase().includes(q));
  }, [sidebarSearch, subCategories]);

  // ── Asset counts per sub-category ──────────────────────────────
  const subCategoryAssetCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const asset of assets) {
      const subCat =
        resourceIdToSubCategory.get(asset.asset_type_id || '') || 'Other';
      counts[subCat] = (counts[subCat] || 0) + 1;
    }
    return counts;
  }, [assets, resourceIdToSubCategory]);

  // ── Client-side filtered assets ────────────────────────────────
  const displayAssets = useMemo(() => {
    let filtered = assets;

    // Filter by sub_category
    if (selectedSubCategory) {
      const resourceIdsInSubCat = new Set(
        (resourcesBySubCategory.get(selectedSubCategory) || []).map((r) => r.id)
      );
      filtered = filtered.filter((a) =>
        resourceIdsInSubCat.has(a.asset_type_id || '')
      );
    }

    // Filter by search query
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
  }, [assets, selectedSubCategory, resourcesBySubCategory, searchQuery]);

  // ── Selection helpers ──────────────────────────────────────────
  const toggleAsset = (asset: ClientAsset) => {
    if (selectedAssetIds.includes(asset.id)) {
      onSelectedAssetIdsChange(selectedAssetIds.filter((id) => id !== asset.id));
    } else {
      onSelectedAssetIdsChange([...selectedAssetIds, asset.id]);
    }
  };

  const toggleAll = () => {
    if (selectedAssetIds.length === displayAssets.length && displayAssets.length > 0) {
      onSelectedAssetIdsChange([]);
    } else {
      onSelectedAssetIdsChange(displayAssets.map((a) => a.id));
    }
  };

  // ── No contact selected ────────────────────────────────────────
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

  const isLoading = assetsLoading || resourcesLoading;

  // ── Render — Equipment Registry layout ─────────────────────────
  return (
    <div className="flex h-full overflow-hidden" style={{ minHeight: '60vh' }}>
      {/* ── Left Sidebar: Sub-Category Navigation ──────────────── */}
      <div
        className="w-[240px] min-w-[240px] border-r flex flex-col overflow-hidden"
        style={{
          backgroundColor: colors.utility.secondaryBackground,
          borderColor: colors.utility.primaryText + '15',
        }}
      >
        {/* Sidebar Header */}
        <div
          className="px-4 pt-4 pb-3 border-b"
          style={{ borderColor: colors.utility.primaryText + '10' }}
        >
          <h3
            className="text-[11px] font-bold uppercase tracking-widest mb-2"
            style={{ color: colors.utility.secondaryText }}
          >
            Asset Categories
          </h3>
          <Input
            placeholder="Search categories..."
            value={sidebarSearch}
            onChange={(e) => setSidebarSearch(e.target.value)}
            className="text-xs"
            style={{
              borderColor: colors.utility.primaryText + '20',
              backgroundColor: colors.utility.primaryBackground,
              color: colors.utility.primaryText,
            }}
          />
        </div>

        {/* Sub-Category List */}
        <div className="flex-1 overflow-y-auto p-2">
          {resourcesLoading ? (
            <div className="flex items-center justify-center py-8">
              <VaNiLoader size="sm" message="Loading..." />
            </div>
          ) : subCategories.length === 0 ? (
            <div
              className="p-4 text-center text-xs"
              style={{ color: colors.utility.secondaryText }}
            >
              No categories found
            </div>
          ) : (
            <>
              {/* "All Assets" button */}
              {!sidebarSearch.trim() && (
                <button
                  onClick={() => setSelectedSubCategory(null)}
                  className={cn(
                    'w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg mb-0.5 transition-all text-left',
                    selectedSubCategory === null ? '' : 'hover:opacity-80'
                  )}
                  style={{
                    backgroundColor:
                      selectedSubCategory === null
                        ? colors.brand.primary + '12'
                        : 'transparent',
                  }}
                >
                  <div
                    className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0"
                    style={{
                      backgroundColor:
                        selectedSubCategory === null
                          ? colors.brand.primary + '18'
                          : colors.utility.primaryText + '08',
                    }}
                  >
                    <Layers
                      size={14}
                      style={{
                        color:
                          selectedSubCategory === null
                            ? colors.brand.primary
                            : colors.utility.secondaryText,
                      }}
                    />
                  </div>
                  <span
                    className="text-xs font-semibold truncate flex-1"
                    style={{
                      color:
                        selectedSubCategory === null
                          ? colors.brand.primary
                          : colors.utility.primaryText,
                    }}
                  >
                    All Assets
                  </span>
                  <span
                    className="text-xs font-medium px-1.5 py-0.5 rounded-full"
                    style={{
                      backgroundColor: colors.utility.primaryText + '08',
                      color: colors.utility.secondaryText,
                    }}
                  >
                    {assets.length}
                  </span>
                </button>
              )}

              {/* Sub-category items */}
              {filteredSubCategories.map((subCat) => {
                const isActive = selectedSubCategory === subCat;
                const config = getSubCategoryConfig(subCat);
                const SubCatIcon = config?.icon || Package;
                const iconColor = config?.color || '#6B7280';
                const count = subCategoryAssetCounts[subCat] || 0;

                return (
                  <button
                    key={subCat}
                    onClick={() => setSelectedSubCategory(subCat)}
                    className={cn(
                      'w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg mb-0.5 transition-all text-left',
                      isActive ? '' : 'hover:opacity-80'
                    )}
                    style={{
                      backgroundColor: isActive
                        ? colors.brand.primary + '12'
                        : 'transparent',
                    }}
                  >
                    <div
                      className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: iconColor + '15' }}
                    >
                      <SubCatIcon
                        size={14}
                        style={{ color: iconColor }}
                      />
                    </div>
                    <span
                      className="text-xs font-semibold truncate flex-1"
                      style={{
                        color: isActive
                          ? colors.brand.primary
                          : colors.utility.primaryText,
                      }}
                    >
                      {subCat}
                    </span>
                    {count > 0 && (
                      <span
                        className="text-xs font-medium px-1.5 py-0.5 rounded-full"
                        style={{
                          backgroundColor: iconColor + '12',
                          color: iconColor,
                        }}
                      >
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}

              {filteredSubCategories.length === 0 && (
                <div
                  className="p-4 text-center text-xs"
                  style={{ color: colors.utility.secondaryText }}
                >
                  No matching categories
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── Main Content Area ────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {/* Toolbar */}
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <span
              className="text-sm"
              style={{ color: colors.utility.secondaryText }}
            >
              <strong style={{ color: colors.utility.primaryText, fontWeight: 700 }}>
                {selectedAssetIds.length}
              </strong>{' '}
              of {assets.length} selected
              {selectedSubCategory && (
                <>
                  {' '}in{' '}
                  <strong style={{ color: colors.utility.primaryText, fontWeight: 700 }}>
                    {selectedSubCategory}
                  </strong>
                </>
              )}
            </span>
            {displayAssets.length > 0 && (
              <button
                onClick={toggleAll}
                className="text-xs font-semibold px-2 py-1 rounded"
                style={{ color: colors.brand.primary }}
              >
                {selectedAssetIds.length === displayAssets.length
                  ? 'Deselect All'
                  : 'Select All'}
              </button>
            )}
          </div>

          {/* Search */}
          <div className="relative w-52">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5"
              style={{ color: colors.utility.secondaryText }}
            />
            <input
              placeholder="Search assets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-8 py-2 rounded-lg border text-xs"
              style={{
                borderColor: colors.utility.primaryText + '15',
                backgroundColor: colors.utility.secondaryBackground,
                color: colors.utility.primaryText,
              }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2"
              >
                <X className="h-3 w-3" style={{ color: colors.utility.secondaryText }} />
              </button>
            )}
          </div>
        </div>

        {/* Content */}
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
        ) : displayAssets.length > 0 ? (
          /* Equipment Grid — same layout as Equipment Registry */
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {displayAssets.map((asset) => (
              <EquipmentCard
                key={asset.id}
                asset={asset}
                mode="selectable"
                selected={selectedAssetIds.includes(asset.id)}
                onSelect={() => toggleAsset(asset)}
              />
            ))}
          </div>
        ) : searchQuery ? (
          <div
            className="rounded-lg border p-12 text-center"
            style={{
              backgroundColor: colors.utility.secondaryBackground,
              borderColor: colors.utility.primaryText + '15',
            }}
          >
            <p className="text-sm mb-1" style={{ color: colors.utility.secondaryText }}>
              No assets matching &ldquo;{searchQuery}&rdquo;
            </p>
            <button
              onClick={() => setSearchQuery('')}
              className="text-xs font-semibold mt-2"
              style={{ color: colors.brand.primary }}
            >
              Clear Search
            </button>
          </div>
        ) : (
          <div className="text-center py-16">
            <Package className="h-12 w-12 mx-auto mb-3" style={{ color: colors.utility.secondaryText + '40' }} />
            <p className="text-sm" style={{ color: colors.utility.secondaryText }}>
              No assets in this category
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AssetSelectionStep;
