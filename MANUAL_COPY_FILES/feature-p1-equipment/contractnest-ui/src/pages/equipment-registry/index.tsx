// src/pages/equipment-registry/index.tsx
// Equipment Registry — standalone page (Operations > Equipment Registry)
// Design: 02-equipment-registry.html mockup (sidebar categories + card grid)

import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Plus, Search, X, Download, Package,
  Scan, HeartPulse, FlaskConical, Thermometer, ArrowUpDown,
  Zap, Microscope, Flame, Wifi, Wrench,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/input';
import { vaniToast } from '@/components/common/toast';
import { VaNiLoader } from '@/components/common/loaders/UnifiedLoader';
import { cn } from '@/lib/utils';
import { analyticsService } from '@/services/analytics.service';

// Hooks
import {
  useAssetRegistryManager,
  useCreateAsset,
  useUpdateAsset,
  useDeleteAsset,
  useEquipmentCategories,
} from '@/hooks/queries/useAssetRegistry';

// Types
import type { TenantAsset, AssetRegistryFilters, AssetFormData, EquipmentCategory } from '@/types/assetRegistry';

// Components
import EquipmentCard from './EquipmentCard';
import EquipmentFormDialog from './EquipmentFormDialog';
import EquipmentEmptyState from './EmptyState';

// ── Lucide icon mapping for DB-stored icon names ──────────────────────
const ICON_MAP: Record<string, React.ComponentType<any>> = {
  Scan, HeartPulse, FlaskConical, Thermometer, ArrowUpDown,
  Zap, Microscope, Flame, Wifi, Wrench, Package,
};

function CategoryIcon({ name, className, size = 16 }: { name: string | null; className?: string; size?: number }) {
  const Icon = (name && ICON_MAP[name]) || Package;
  return <Icon className={className} size={size} />;
}

const EquipmentPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { currentTenant } = useAuth();
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  // ── Equipment Categories (from DB) ────────────────────────────────
  const {
    data: categories = [],
    isLoading: categoriesLoading,
    isError: categoriesError,
  } = useEquipmentCategories();

  // ── Local State ─────────────────────────────────────────────────
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(
    searchParams.get('category') || ''
  );
  const [sidebarSearch, setSidebarSearch] = useState('');
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<TenantAsset | null>(null);

  // Auto-select first category once loaded (if none selected from URL)
  useEffect(() => {
    if (categories.length > 0 && !selectedCategoryId) {
      setSelectedCategoryId(categories[0].id);
    }
  }, [categories, selectedCategoryId]);

  // ── Data: Assets (filtered) ─────────────────────────────────────

  const filters: AssetRegistryFilters = useMemo(() => ({
    resource_type_id: selectedCategoryId || undefined,
    search: searchQuery.trim() || undefined,
    limit: 100,
    offset: 0,
  }), [selectedCategoryId, searchQuery]);

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
      analyticsService.trackPageView('equipment-registry', 'Equipment Registry');
    } catch (e) { /* ignore */ }
  }, []);

  // ── URL Sync ────────────────────────────────────────────────────

  useEffect(() => {
    const newParams = new URLSearchParams();
    if (selectedCategoryId) newParams.set('category', selectedCategoryId);
    if (searchQuery.trim()) newParams.set('search', searchQuery.trim());
    const qs = newParams.toString();
    if (qs !== searchParams.toString()) {
      setSearchParams(newParams, { replace: true });
    }
  }, [selectedCategoryId, searchQuery, setSearchParams, searchParams]);

  // ── Filtered sidebar categories ─────────────────────────────────

  const filteredCategories = useMemo(() => {
    if (!sidebarSearch.trim()) return categories;
    const q = sidebarSearch.toLowerCase();
    return categories.filter((c) => c.name.toLowerCase().includes(q));
  }, [sidebarSearch, categories]);

  // ── Selected category info ──────────────────────────────────────

  const selectedCategory = categories.find((c) => c.id === selectedCategoryId);

  // ── Handlers ────────────────────────────────────────────────────

  const handleCategorySelect = (catId: string) => {
    setSelectedCategoryId(catId);
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
    if (!window.confirm(`Are you sure you want to remove "${asset.name}"?`)) return;
    try {
      await deleteMutation.mutateAsync(asset.id);
    } catch (err: any) { /* toast handled by hook */ }
  };

  const handleCreateSubmit = async (data: AssetFormData) => {
    try {
      await createMutation.mutateAsync({
        ...data,
        resource_type_id: data.resource_type_id || selectedCategoryId,
      });
      setIsCreateOpen(false);
    } catch (err: any) { /* toast handled by hook */ }
  };

  const handleEditSubmit = async (data: AssetFormData) => {
    if (!editingAsset) return;
    try {
      await updateMutation.mutateAsync({ id: editingAsset.id, data });
      setIsEditOpen(false);
      setEditingAsset(null);
    } catch (err: any) { /* toast handled by hook */ }
  };

  const handleAddSuggestions = async (names: string[]) => {
    for (const name of names) {
      try {
        await createMutation.mutateAsync({
          name,
          resource_type_id: selectedCategoryId,
          status: 'active',
          condition: 'good',
          criticality: 'medium',
          specifications: {},
          tags: [],
        });
      } catch (err: any) { /* continue */ }
    }
  };

  // If API errors (e.g. edge not deployed), treat as empty — no assets yet
  const displayAssets = isError ? [] : assets;

  // ── Render ──────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* ── Page Header (mockup style) ─────────────────────────────── */}
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
          <span style={{ color: colors.utility.primaryText, fontWeight: 600 }}>Equipment Registry</span>
        </div>
        <h1
          className="text-xl font-extrabold tracking-tight"
          style={{ color: colors.utility.primaryText }}
        >
          Equipment Registry
        </h1>
        <p className="text-sm mt-1" style={{ color: colors.utility.secondaryText }}>
          Register and manage the equipment you service. This data powers contract creation, scheduling, and evidence tracking.
        </p>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* ── Left Sidebar: Categories ──────────────────────────────── */}
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
              Equipment Categories
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

          {/* Category List */}
          <div className="flex-1 overflow-y-auto p-2">
            {categoriesLoading ? (
              <div className="flex items-center justify-center py-8">
                <VaNiLoader size="sm" message="Loading categories..." />
              </div>
            ) : categoriesError || categories.length === 0 ? (
              <div className="p-4 text-center text-xs" style={{ color: colors.utility.secondaryText }}>
                {categoriesError ? 'Failed to load categories' : 'No equipment categories configured'}
              </div>
            ) : (
              <>
                {filteredCategories.map((cat) => {
                  const isActive = selectedCategoryId === cat.id;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => handleCategorySelect(cat.id)}
                      className={cn(
                        'w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg mb-0.5 transition-all text-left',
                        isActive ? '' : 'hover:opacity-80'
                      )}
                      style={{
                        backgroundColor: isActive ? (colors.brand.primary + '12') : 'transparent',
                      }}
                    >
                      <div
                        className="w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: '#fffbeb' }}
                      >
                        <CategoryIcon name={cat.icon} size={16} />
                      </div>
                      <span
                        className="text-sm font-semibold truncate flex-1"
                        style={{
                          color: isActive ? colors.brand.primary : colors.utility.primaryText,
                        }}
                      >
                        {cat.name}
                      </span>
                    </button>
                  );
                })}

                {filteredCategories.length === 0 && (
                  <div className="p-4 text-center text-xs" style={{ color: colors.utility.secondaryText }}>
                    No matching categories
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* ── Main Content Area ────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-8 py-6">
          {/* Toolbar (mockup style) */}
          <div className="flex items-center justify-between mb-5 flex-wrap gap-4">
            <div>
              <span className="text-sm" style={{ color: colors.utility.secondaryText }}>
                {assetsLoading && !isError ? (
                  'Loading...'
                ) : (
                  <>
                    <strong style={{ color: colors.utility.primaryText, fontWeight: 700 }}>
                      {displayAssets.length}
                    </strong>
                    {' '}equipment items in{' '}
                    <strong style={{ color: colors.utility.primaryText, fontWeight: 700 }}>
                      {selectedCategory?.name || ''}
                    </strong>
                  </>
                )}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: colors.utility.secondaryText }} />
                <Input
                  placeholder="Search equipment..."
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
                  <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                    <X className="h-3.5 w-3.5" style={{ color: colors.utility.secondaryText }} />
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
                disabled={isMutating || !selectedCategoryId}
                size="sm"
                className="text-sm transition-colors hover:opacity-90"
                style={{
                  background: `linear-gradient(135deg, ${colors.brand.primary}, ${colors.brand.secondary || colors.brand.primary})`,
                  color: '#FFFFFF',
                }}
              >
                <Plus className="mr-1.5 h-4 w-4" />
                Add Equipment
              </Button>
            </div>
          </div>

          {/* Content */}
          {assetsLoading && !isError ? (
            <div className="flex items-center justify-center py-24">
              <VaNiLoader size="sm" message="Loading equipment..." />
            </div>
          ) : displayAssets.length > 0 ? (
            /* Equipment Grid (mockup: auto-fill minmax 280px) */
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
              <p className="text-sm mb-3" style={{ color: colors.utility.secondaryText }}>
                No equipment matching &ldquo;{searchQuery}&rdquo;
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
            /* Empty state — suggestion chips (mockup style) */
            <EquipmentEmptyState
              onAddCustom={handleCreateNew}
              onAddSuggestions={handleAddSuggestions}
            />
          )}
        </div>
      </div>

      {/* ── Dialogs ──────────────────────────────────────────────── */}
      <EquipmentFormDialog
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        mode="create"
        resourceTypeId={selectedCategoryId}
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
        onSubmit={handleEditSubmit}
        isSubmitting={updateMutation.isPending}
      />
    </div>
  );
};

export default EquipmentPage;
