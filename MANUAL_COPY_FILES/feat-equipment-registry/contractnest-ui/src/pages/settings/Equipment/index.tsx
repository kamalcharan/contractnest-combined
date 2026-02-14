// src/pages/settings/Equipment/index.tsx
// Equipment Registry main page — sidebar categories + grid of equipment cards
// Follows Resources page pattern with VaNiLoader + vaniToast

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Plus, Search, X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/input';
import { vaniToast } from '@/components/common/toast';
import { VaNiLoader } from '@/components/common/loaders/UnifiedLoader';
import { cn } from '@/lib/utils';
import { analyticsService } from '@/services/analytics.service';
import { captureException } from '@/utils/sentry';

// Hooks
import { useAssetRegistryManager, useCreateAsset, useUpdateAsset, useDeleteAsset } from '@/hooks/queries/useAssetRegistry';

// Types
import type { TenantAsset, AssetRegistryFilters, AssetFormData } from '@/types/assetRegistry';

// Components
import EquipmentCard from './EquipmentCard';
import EquipmentFormDialog from './EquipmentFormDialog';
import EquipmentEmptyState from './EmptyState';

// Tenant's saved resources — sidebar restricted to what they service
import { useResources } from '@/hooks/queries/useResources';

const EquipmentPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { currentTenant } = useAuth();
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  // ── Local State ─────────────────────────────────────────────────

  const [selectedTypeId, setSelectedTypeId] = useState<string | null>(
    searchParams.get('type') || null
  );
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<TenantAsset | null>(null);

  // ── Data: Tenant's saved resources → derive equipment categories ─
  //    Only resource types the tenant added in step 3 (Resources page)
  //    are shown in the sidebar. Equipment types: equipment, asset, consumable.

  const EQUIPMENT_TYPE_IDS = ['equipment', 'asset', 'consumable'];

  const {
    data: savedResources = [],
    isLoading: typesLoading,
  } = useResources();

  const resourceTypes = useMemo(() => {
    const allSaved = Array.isArray(savedResources) ? savedResources : [];
    // Keep only equipment-class resources
    const equipmentResources = allSaved.filter((r) =>
      EQUIPMENT_TYPE_IDS.includes((r.resource_type_id || '').toLowerCase())
    );
    // De-duplicate by resource_type_id + name to create sidebar categories
    const seen = new Map<string, { id: string; name: string; is_active: boolean }>();
    for (const r of equipmentResources) {
      if (!seen.has(r.name)) {
        seen.set(r.name, {
          id: r.id,
          name: r.display_name || r.name,
          is_active: r.is_active,
        });
      }
    }
    return Array.from(seen.values());
  }, [savedResources]);

  // ── Data: Assets (filtered) ─────────────────────────────────────

  const filters: AssetRegistryFilters = useMemo(() => ({
    resource_type_id: selectedTypeId || undefined,
    search: searchQuery.trim() || undefined,
    limit: 100,
    offset: 0,
  }), [selectedTypeId, searchQuery]);

  const {
    assets,
    isLoading: assetsLoading,
    isError,
    error,
    isMutating,
    refetch,
  } = useAssetRegistryManager(filters);

  // Mutations
  const createMutation = useCreateAsset();
  const updateMutation = useUpdateAsset();
  const deleteMutation = useDeleteAsset();

  // ── Analytics ───────────────────────────────────────────────────

  useEffect(() => {
    try {
      analyticsService.trackPageView('settings/configure/equipment', 'Equipment Registry');
    } catch (e) {
      // Silently ignore analytics errors
    }
  }, []);

  // ── URL Sync ────────────────────────────────────────────────────

  useEffect(() => {
    const newParams = new URLSearchParams();
    if (selectedTypeId) newParams.set('type', selectedTypeId);
    if (searchQuery.trim()) newParams.set('search', searchQuery.trim());

    const newSearch = newParams.toString();
    if (newSearch !== searchParams.toString()) {
      setSearchParams(newParams, { replace: true });
    }
  }, [selectedTypeId, searchQuery, setSearchParams, searchParams]);

  // Auto-select first resource type
  useEffect(() => {
    if (!selectedTypeId && resourceTypes.length > 0 && !typesLoading) {
      setSelectedTypeId(resourceTypes[0].id);
    }
  }, [selectedTypeId, resourceTypes, typesLoading]);

  // ── Handlers ────────────────────────────────────────────────────

  const handleTypeSelect = (typeId: string) => {
    setSelectedTypeId(typeId);
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
    } catch (err: any) {
      // Error handled by mutation hook toast
    }
  };

  const handleCreateSubmit = async (data: AssetFormData) => {
    try {
      await createMutation.mutateAsync(data);
      setIsCreateOpen(false);
    } catch (err: any) {
      // Error handled by mutation hook toast
    }
  };

  const handleEditSubmit = async (data: AssetFormData) => {
    if (!editingAsset) return;
    try {
      await updateMutation.mutateAsync({ id: editingAsset.id, data });
      setIsEditOpen(false);
      setEditingAsset(null);
    } catch (err: any) {
      // Error handled by mutation hook toast
    }
  };

  const handleAddSuggestions = async (names: string[]) => {
    // Create assets from suggestion chips (minimal data)
    for (const name of names) {
      try {
        await createMutation.mutateAsync({
          name,
          resource_type_id: selectedTypeId || '',
          status: 'active',
          condition: 'good',
          criticality: 'medium',
          specifications: {},
          tags: [],
        });
      } catch (err: any) {
        // Continue with remaining — individual errors shown by toast
      }
    }
  };

  // ── Selected type info ──────────────────────────────────────────

  const selectedType = resourceTypes.find((rt) => rt.id === selectedTypeId);

  // ── Loading state (initial) ─────────────────────────────────────

  if (typesLoading && resourceTypes.length === 0) {
    return (
      <div
        className="flex items-center justify-center min-h-[400px] transition-colors"
        style={{ backgroundColor: colors.utility.primaryBackground }}
      >
        <VaNiLoader size="md" message="LOADING EQUIPMENT REGISTRY" />
      </div>
    );
  }

  // ── Render ──────────────────────────────────────────────────────

  return (
    <div
      className="p-6 transition-colors duration-200 min-h-screen"
      style={{
        background: isDarkMode
          ? `linear-gradient(to bottom right, ${colors.utility.primaryBackground}, ${colors.utility.secondaryBackground})`
          : `linear-gradient(to bottom right, ${colors.utility.primaryBackground}, ${colors.utility.secondaryBackground})`,
      }}
    >
      {/* Header */}
      <div className="flex items-center mb-8">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate('/settings/configure')}
          className="mr-4 transition-colors hover:opacity-80"
          style={{
            borderColor: colors.utility.secondaryText + '40',
            backgroundColor: colors.utility.secondaryBackground,
            color: colors.utility.primaryText,
          }}
        >
          <ArrowLeft className="h-5 w-5" style={{ color: colors.utility.secondaryText }} />
        </Button>
        <div>
          <h1
            className="text-2xl font-bold transition-colors"
            style={{ color: colors.utility.primaryText }}
          >
            Equipment Registry
          </h1>
          <p className="transition-colors" style={{ color: colors.utility.secondaryText }}>
            {selectedType
              ? `Manage your ${selectedType.name.replace(/_/g, ' ')} equipment`
              : 'Register and manage the equipment you service'}
          </p>
        </div>
      </div>

      <div className="flex gap-6">
        {/* ── Left Sidebar: Resource Types ────────────────────────── */}
        <div className="w-64 shrink-0">
          <div
            className="rounded-lg shadow-sm border overflow-hidden transition-colors"
            style={{
              backgroundColor: colors.utility.secondaryBackground,
              borderColor: colors.utility.primaryText + '20',
            }}
          >
            {typesLoading ? (
              <div className="p-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-12 rounded mb-2 animate-pulse"
                    style={{ backgroundColor: colors.utility.primaryText + '15' }}
                  />
                ))}
              </div>
            ) : resourceTypes.length > 0 ? (
              resourceTypes.map((rt) => {
                const isSelected = selectedTypeId === rt.id;
                return (
                  <button
                    key={rt.id}
                    onClick={() => handleTypeSelect(rt.id)}
                    className={cn(
                      'w-full px-4 py-3 text-left border-b last:border-0 transition-colors flex items-center justify-between',
                      isSelected ? 'font-medium' : 'hover:opacity-80'
                    )}
                    style={{
                      borderColor: colors.utility.primaryText + '15',
                      backgroundColor: isSelected ? colors.brand.primary : 'transparent',
                      color: isSelected ? '#FFFFFF' : colors.utility.primaryText,
                    }}
                  >
                    <span className="truncate">{rt.name}</span>
                  </button>
                );
              })
            ) : (
              <div className="p-4 text-center text-sm" style={{ color: colors.utility.secondaryText }}>
                No resource types found.
              </div>
            )}
          </div>
        </div>

        {/* ── Right Content Area ─────────────────────────────────── */}
        <div className="flex-1">
          {/* Error State */}
          {isError && (
            <div
              className="rounded-lg shadow-sm border p-8 text-center transition-colors"
              style={{
                backgroundColor: colors.utility.secondaryBackground,
                borderColor: colors.semantic.error + '40',
              }}
            >
              <div className="text-lg font-semibold mb-2" style={{ color: colors.semantic.error }}>
                Failed to Load Equipment
              </div>
              <p className="mb-4" style={{ color: colors.utility.secondaryText }}>
                {error?.message || 'An error occurred while loading equipment data.'}
              </p>
              <Button
                onClick={() => refetch()}
                className="transition-colors hover:opacity-90"
                style={{
                  background: `linear-gradient(to right, ${colors.brand.primary}, ${colors.brand.secondary})`,
                  color: '#FFFFFF',
                }}
              >
                Try Again
              </Button>
            </div>
          )}

          {/* Content (non-error) */}
          {!isError && selectedTypeId && (
            <div>
              {/* Toolbar */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <div>
                  <h2 className="text-xl font-semibold" style={{ color: colors.utility.primaryText }}>
                    {selectedType?.name || 'Equipment'}
                  </h2>
                  <p className="text-sm" style={{ color: colors.utility.secondaryText }}>
                    {assetsLoading ? 'Loading...' : `${assets.length} equipment item${assets.length !== 1 ? 's' : ''}`}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  {/* Search */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search equipment..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 pr-9 w-64"
                      style={{
                        borderColor: colors.utility.secondaryText + '40',
                        backgroundColor: colors.utility.primaryBackground,
                        color: colors.utility.primaryText,
                      }}
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2"
                      >
                        <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                      </button>
                    )}
                  </div>

                  {/* Add Button */}
                  <Button
                    onClick={handleCreateNew}
                    disabled={isMutating}
                    className="transition-colors hover:opacity-90"
                    style={{
                      background: `linear-gradient(to right, ${colors.brand.primary}, ${colors.brand.secondary})`,
                      color: '#FFFFFF',
                    }}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Equipment
                  </Button>
                </div>
              </div>

              {/* Content Grid or Empty/Loading States */}
              {assetsLoading ? (
                <div className="flex items-center justify-center py-20">
                  <VaNiLoader size="sm" message="Loading equipment..." />
                </div>
              ) : assets.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {assets.map((asset) => (
                    <EquipmentCard
                      key={asset.id}
                      asset={asset}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                      disabled={isMutating}
                    />
                  ))}
                </div>
              ) : searchQuery ? (
                /* No search results */
                <div
                  className="rounded-lg border p-12 text-center"
                  style={{
                    backgroundColor: colors.utility.secondaryBackground,
                    borderColor: colors.utility.primaryText + '15',
                  }}
                >
                  <p className="text-sm mb-3" style={{ color: colors.utility.secondaryText }}>
                    No equipment matching "{searchQuery}"
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
                /* True empty: show suggestions */
                <EquipmentEmptyState
                  onAddCustom={handleCreateNew}
                  onAddSuggestions={handleAddSuggestions}
                />
              )}
            </div>
          )}

          {/* No type selected */}
          {!isError && !selectedTypeId && !typesLoading && (
            <div
              className="rounded-lg border p-12 text-center"
              style={{
                backgroundColor: colors.utility.secondaryBackground,
                borderColor: colors.utility.primaryText + '15',
              }}
            >
              <p style={{ color: colors.utility.secondaryText }}>
                Select a resource type from the sidebar to view equipment.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── Dialogs ──────────────────────────────────────────────── */}
      <EquipmentFormDialog
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        mode="create"
        resourceTypeId={selectedTypeId || undefined}
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
