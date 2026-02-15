// src/pages/equipment-registry/index.tsx
// Equipment Registry — standalone page (Operations > Equipment Registry)
// Sidebar groups equipment by sub_category from t_category_resources_master

import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Plus, Search, X, Download, Package, Layers,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/input';
import { vaniToast } from '@/components/common/toast';
import { VaNiLoader } from '@/components/common/loaders/UnifiedLoader';
import { cn } from '@/lib/utils';
import { analyticsService } from '@/services/analytics.service';
import { getSubCategoryConfig } from '@/constants/subCategoryConfig';

// Hooks
import {
  useAssetRegistryManager,
  useCreateAsset,
  useUpdateAsset,
  useDeleteAsset,
} from '@/hooks/queries/useAssetRegistry';
import { useResources, type Resource } from '@/hooks/queries/useResources';

// Types
import type { TenantAsset, AssetRegistryFilters, AssetFormData } from '@/types/assetRegistry';

// Components
import EquipmentCard from './EquipmentCard';
import EquipmentFormDialog from './EquipmentFormDialog';
import EquipmentEmptyState from './EmptyState';

// ── Types ───────────────────────────────────────────────────────
export type RegistryMode = 'equipment' | 'entity';

interface EquipmentPageProps {
  registryMode?: RegistryMode;
}

// ── Mode-specific labels ────────────────────────────────────────
const MODE_CONFIG: Record<RegistryMode, {
  typeIds: string[];
  pageTitle: string;
  pageDescription: string;
  breadcrumb: string;
  sidebarTitle: string;
  allLabel: string;
  itemLabel: string;
  searchPlaceholder: string;
  addLabel: string;
}> = {
  equipment: {
    typeIds: ['equipment'],
    pageTitle: 'Equipment Registry',
    pageDescription: 'Register and manage the equipment you service. This data powers contract creation, scheduling, and evidence tracking.',
    breadcrumb: 'Equipment Registry',
    sidebarTitle: 'Equipment Categories',
    allLabel: 'All Equipment',
    itemLabel: 'equipment',
    searchPlaceholder: 'Search equipment...',
    addLabel: 'Add Equipment',
  },
  entity: {
    typeIds: ['asset'],
    pageTitle: 'Entity Registry',
    pageDescription: 'Register and manage entities such as facilities, properties, and spaces. Link them to contracts and track service schedules.',
    breadcrumb: 'Entity Registry',
    sidebarTitle: 'Entity Categories',
    allLabel: 'All Entities',
    itemLabel: 'entity',
    searchPlaceholder: 'Search entities...',
    addLabel: 'Add Entity',
  },
};

const EquipmentPage: React.FC<EquipmentPageProps> = ({ registryMode = 'equipment' }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { currentTenant } = useAuth();
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;
  const modeConfig = MODE_CONFIG[registryMode];

  // ── Resources (filtered by registry mode) ─────────────────────────
  const {
    data: allResources = [],
    isLoading: categoriesLoading,
    isError: categoriesError,
  } = useResources();

  // Filter to only the resource types for this registry mode
  const equipmentResources = useMemo(() => {
    return allResources.filter(
      (r) =>
        modeConfig.typeIds.includes((r.resource_type_id || '').toLowerCase()) &&
        r.is_active
    );
  }, [allResources, modeConfig.typeIds]);

  // ── Sub-category grouping ───────────────────────────────────────
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

      // Sort alphabetically, "Other" last
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

  // ── Local State ─────────────────────────────────────────────────
  const [selectedSubCategory, setSelectedSubCategory] = useState<string | null>(
    searchParams.get('sub_category') || null
  );
  const [sidebarSearch, setSidebarSearch] = useState('');
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<TenantAsset | null>(null);

  // ── Data: Assets (fetch ALL — filter client-side) ───────────────
  const filters: AssetRegistryFilters = useMemo(
    () => ({ limit: 500, offset: 0 }),
    []
  );

  const {
    assets,
    isLoading: assetsLoading,
    isError,
    isMutating,
  } = useAssetRegistryManager(filters);

  // Mutations
  const createMutation = useCreateAsset();
  const updateMutation = useUpdateAsset();
  const deleteMutation = useDeleteAsset();

  // ── Analytics ───────────────────────────────────────────────────
  useEffect(() => {
    try {
      analyticsService.trackPageView(`${registryMode}-registry`, modeConfig.pageTitle);
    } catch (e) {
      /* ignore */
    }
  }, [registryMode, modeConfig.pageTitle]);

  // ── URL Sync ────────────────────────────────────────────────────
  useEffect(() => {
    const newParams = new URLSearchParams();
    if (selectedSubCategory) newParams.set('sub_category', selectedSubCategory);
    if (searchQuery.trim()) newParams.set('search', searchQuery.trim());
    const qs = newParams.toString();
    if (qs !== searchParams.toString()) {
      setSearchParams(newParams, { replace: true });
    }
  }, [selectedSubCategory, searchQuery, setSearchParams, searchParams]);

  // ── Assets scoped to this registry mode ─────────────────────────
  const modeAssets = useMemo(() => {
    if (isError) return [];
    // Only keep assets whose resource_type_id matches the current mode
    // (e.g. 'equipment' for Equipment Registry, 'asset' for Entity Registry)
    return assets.filter((a) =>
      modeConfig.typeIds.includes((a.resource_type_id || '').toLowerCase())
    );
  }, [assets, isError, modeConfig.typeIds]);

  // ── Client-side filtered assets ─────────────────────────────────
  const displayAssets = useMemo(() => {
    let filtered = modeAssets;

    // Filter by sub_category (asset_type_id holds the specific resource UUID)
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
  }, [modeAssets, selectedSubCategory, resourcesBySubCategory, searchQuery]);

  // ── Sub-category asset counts (for sidebar badges) ──────────────
  const subCategoryAssetCounts = useMemo(() => {
    const counts: Record<string, number> = {};

    for (const asset of modeAssets) {
      const subCat =
        resourceIdToSubCategory.get(asset.asset_type_id || '') || 'Other';
      counts[subCat] = (counts[subCat] || 0) + 1;
    }

    return counts;
  }, [modeAssets, resourceIdToSubCategory]);

  const totalAssetCount = modeAssets.length;

  // ── Filtered sidebar sub-categories ─────────────────────────────
  const filteredSubCategories = useMemo(() => {
    if (!sidebarSearch.trim()) return subCategories;
    const q = sidebarSearch.toLowerCase();
    return subCategories.filter((sc) => sc.toLowerCase().includes(q));
  }, [sidebarSearch, subCategories]);

  // ── All categories for form dialog (always pass full list) ───────
  const allFormCategories = useMemo(() => {
    return equipmentResources.map((r) => ({
      id: r.id,
      name: r.display_name || r.name,
      sub_category: r.sub_category || null,
      resource_type_id: r.resource_type_id,
    }));
  }, [equipmentResources]);

  // ── Handlers ────────────────────────────────────────────────────

  const handleSubCategorySelect = (subCat: string | null) => {
    setSelectedSubCategory(subCat);
    setSearchQuery('');
  };

  const handleCreateNew = () => {
    setIsCreateOpen(true);
  };

  const handleEdit = (asset: TenantAsset) => {
    setEditingAsset(asset);
    setIsEditOpen(true);
  };

  const handleDelete = async (asset: TenantAsset) => {
    if (!window.confirm(`Are you sure you want to remove "${asset.name}"?`))
      return;
    try {
      await deleteMutation.mutateAsync(asset.id);
    } catch (err: any) {
      /* toast handled by hook */
    }
  };

  const handleCreateSubmit = async (data: AssetFormData) => {
    try {
      await createMutation.mutateAsync(data);
      setIsCreateOpen(false);
    } catch (err: any) {
      /* toast handled by hook */
    }
  };

  const handleEditSubmit = async (data: AssetFormData) => {
    if (!editingAsset) return;
    try {
      await updateMutation.mutateAsync({ id: editingAsset.id, data });
      setIsEditOpen(false);
      setEditingAsset(null);
    } catch (err: any) {
      /* toast handled by hook */
    }
  };

  // ── Render ──────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* ── Page Header ─────────────────────────────────────────── */}
      <div
        className="px-8 pt-6 pb-5 border-b"
        style={{
          backgroundColor: colors.utility.secondaryBackground,
          borderColor: colors.utility.primaryText + '15',
        }}
      >
        <div
          className="text-xs mb-2 flex items-center gap-1.5"
          style={{ color: colors.utility.secondaryText }}
        >
          <span>Operations</span>
          <span>&rsaquo;</span>
          <span
            style={{ color: colors.utility.primaryText, fontWeight: 600 }}
          >
            {modeConfig.breadcrumb}
          </span>
        </div>
        <h1
          className="text-xl font-extrabold tracking-tight"
          style={{ color: colors.utility.primaryText }}
        >
          {modeConfig.pageTitle}
        </h1>
        <p
          className="text-sm mt-1"
          style={{ color: colors.utility.secondaryText }}
        >
          {modeConfig.pageDescription}
        </p>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* ── Left Sidebar: Sub-Category Navigation ──────────────── */}
        <div
          className="w-[280px] min-w-[280px] border-r flex flex-col overflow-hidden"
          style={{
            backgroundColor: colors.utility.secondaryBackground,
            borderColor: colors.utility.primaryText + '15',
          }}
        >
          {/* Sidebar Header */}
          <div
            className="px-5 pt-5 pb-4 border-b"
            style={{ borderColor: colors.utility.primaryText + '10' }}
          >
            <h3
              className="text-[11px] font-bold uppercase tracking-widest mb-3"
              style={{ color: colors.utility.secondaryText }}
            >
              {modeConfig.sidebarTitle}
            </h3>
            <Input
              placeholder="Search categories..."
              value={sidebarSearch}
              onChange={(e) => setSidebarSearch(e.target.value)}
              className="text-sm"
              style={{
                borderColor: colors.utility.primaryText + '20',
                backgroundColor: colors.utility.primaryBackground,
                color: colors.utility.primaryText,
              }}
            />
          </div>

          {/* Sub-Category List */}
          <div className="flex-1 overflow-y-auto p-2">
            {categoriesLoading ? (
              <div className="flex items-center justify-center py-8">
                <VaNiLoader size="sm" message="Loading categories..." />
              </div>
            ) : categoriesError || subCategories.length === 0 ? (
              <div
                className="p-4 text-center text-xs"
                style={{ color: colors.utility.secondaryText }}
              >
                {categoriesError
                  ? 'Failed to load categories'
                  : `No ${modeConfig.itemLabel} categories configured`}
              </div>
            ) : (
              <>
                {/* "All Equipment" button */}
                {!sidebarSearch.trim() && (
                  <button
                    onClick={() => handleSubCategorySelect(null)}
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
                      className="w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0"
                      style={{
                        backgroundColor:
                          selectedSubCategory === null
                            ? colors.brand.primary + '18'
                            : colors.utility.primaryText + '08',
                      }}
                    >
                      <Layers
                        size={16}
                        style={{
                          color:
                            selectedSubCategory === null
                              ? colors.brand.primary
                              : colors.utility.secondaryText,
                        }}
                      />
                    </div>
                    <span
                      className="text-sm font-semibold truncate flex-1"
                      style={{
                        color:
                          selectedSubCategory === null
                            ? colors.brand.primary
                            : colors.utility.primaryText,
                      }}
                    >
                      {modeConfig.allLabel}
                    </span>
                    <span
                      className="text-xs font-medium px-2 py-0.5 rounded-full"
                      style={{
                        backgroundColor: colors.utility.primaryText + '08',
                        color: colors.utility.secondaryText,
                      }}
                    >
                      {totalAssetCount}
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
                      onClick={() => handleSubCategorySelect(subCat)}
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
                        className="w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0"
                        style={{
                          backgroundColor: iconColor + '15',
                        }}
                      >
                        <SubCatIcon
                          size={16}
                          style={{ color: iconColor }}
                        />
                      </div>
                      <span
                        className="text-sm font-semibold truncate flex-1"
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
                          className="text-xs font-medium px-2 py-0.5 rounded-full"
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
        <div className="flex-1 overflow-y-auto px-8 py-6">
          {/* Toolbar */}
          <div className="flex items-center justify-between mb-5 flex-wrap gap-4">
            <div>
              <span
                className="text-sm"
                style={{ color: colors.utility.secondaryText }}
              >
                {assetsLoading && !isError ? (
                  'Loading...'
                ) : (
                  <>
                    <strong
                      style={{
                        color: colors.utility.primaryText,
                        fontWeight: 700,
                      }}
                    >
                      {displayAssets.length}
                    </strong>
                    {' '}{modeConfig.itemLabel} items
                    {selectedSubCategory && (
                      <>
                        {' '}in{' '}
                        <strong
                          style={{
                            color: colors.utility.primaryText,
                            fontWeight: 700,
                          }}
                        >
                          {selectedSubCategory}
                        </strong>
                      </>
                    )}
                  </>
                )}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {/* Search */}
              <div className="relative">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4"
                  style={{ color: colors.utility.secondaryText }}
                />
                <Input
                  placeholder={modeConfig.searchPlaceholder}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-9 w-56 text-sm"
                  style={{
                    borderColor: colors.utility.primaryText + '20',
                    backgroundColor: colors.utility.primaryBackground,
                    color: colors.utility.primaryText,
                  }}
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                  >
                    <X
                      className="h-3.5 w-3.5"
                      style={{ color: colors.utility.secondaryText }}
                    />
                  </button>
                )}
              </div>

              {/* Import Button (mockup style) */}
              <Button
                variant="outline"
                size="sm"
                disabled
                className="text-sm"
                style={{
                  borderColor: colors.utility.primaryText + '20',
                  color: colors.utility.secondaryText,
                }}
              >
                <Download className="mr-1.5 h-4 w-4" />
                Import
              </Button>

              {/* Add Button */}
              <Button
                onClick={handleCreateNew}
                disabled={isMutating}
                size="sm"
                className="text-sm transition-colors hover:opacity-90"
                style={{
                  background: `linear-gradient(135deg, ${colors.brand.primary}, ${colors.brand.secondary || colors.brand.primary})`,
                  color: '#FFFFFF',
                }}
              >
                <Plus className="mr-1.5 h-4 w-4" />
                {modeConfig.addLabel}
              </Button>
            </div>
          </div>

          {/* Content */}
          {assetsLoading && !isError ? (
            <div className="flex items-center justify-center py-24">
              <VaNiLoader size="sm" message={`Loading ${modeConfig.itemLabel}...`} />
            </div>
          ) : displayAssets.length > 0 ? (
            /* Equipment Grid */
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {displayAssets.map((asset) => (
                <EquipmentCard
                  key={asset.id}
                  asset={asset}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  disabled={isMutating}
                />
              ))}
            </div>
          ) : searchQuery && !isError ? (
            /* No search results */
            <div
              className="rounded-lg border p-12 text-center"
              style={{
                backgroundColor: colors.utility.secondaryBackground,
                borderColor: colors.utility.primaryText + '15',
              }}
            >
              <p
                className="text-sm mb-3"
                style={{ color: colors.utility.secondaryText }}
              >
                No {modeConfig.itemLabel} matching &ldquo;{searchQuery}&rdquo;
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSearchQuery('')}
                style={{
                  borderColor: colors.utility.primaryText + '20',
                  color: colors.utility.primaryText,
                }}
              >
                Clear Search
              </Button>
            </div>
          ) : (
            /* Empty state */
            <EquipmentEmptyState
              selectedSubCategory={selectedSubCategory}
              onAddEquipment={handleCreateNew}
              registryMode={registryMode}
            />
          )}
        </div>
      </div>

      {/* ── Dialogs ──────────────────────────────────────────── */}
      <EquipmentFormDialog
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        mode="create"
        defaultSubCategory={selectedSubCategory}
        categories={allFormCategories}
        onSubmit={handleCreateSubmit}
        isSubmitting={createMutation.isPending}
      />

      <EquipmentFormDialog
        isOpen={isEditOpen}
        onClose={() => {
          setIsEditOpen(false);
          setEditingAsset(null);
        }}
        mode="edit"
        asset={editingAsset || undefined}
        categories={allFormCategories}
        onSubmit={handleEditSubmit}
        isSubmitting={updateMutation.isPending}
      />
    </div>
  );
};

export default EquipmentPage;
