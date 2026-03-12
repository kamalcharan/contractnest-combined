// src/pages/entity-registry/index.tsx
// Facility Registry — Two-panel layout with hierarchy tree (left) and detail view (right)
// Perspective-aware: Revenue = client's facilities, Expense = self-owned facilities

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth, type Perspective } from '@/context/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { vaniToast } from '@/components/common/toast';
import { analyticsService } from '@/services/analytics.service';
import {
  useAssetRegistryManager,
  useCreateAsset,
  useUpdateAsset,
  useDeleteAsset,
} from '@/hooks/queries/useAssetRegistry';
import { useContactList } from '@/hooks/useContacts';
import type { TenantAsset, AssetRegistryFilters, AssetFormData } from '@/types/assetRegistry';
import { ENTITY_TYPE_SPEC_KEY } from '@/constants/entityTypeConfig';

// Components
import EntityTree from './components/EntityTree';
import EntityDetailPanel from './components/EntityDetailPanel';
import EntityFormDialog from './components/EntityFormDialog';

const EntityRegistryPage: React.FC = () => {
  const { currentTenant, perspective } = useAuth();
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  const isExpense = perspective === 'expense';

  // ── Ownership type driven by perspective ──
  const ownershipType = isExpense ? ('self' as const) : ('client' as const);

  // ── Data: All entities (resource_type_id = 'asset') filtered by ownership ──
  const filters: AssetRegistryFilters = useMemo(
    () => ({
      limit: 500,
      offset: 0,
      ownership_type: ownershipType,
    }),
    [ownershipType]
  );

  const {
    assets,
    isLoading,
    isError,
    isMutating,
  } = useAssetRegistryManager(filters);

  // Mutations
  const createMutation = useCreateAsset();
  const updateMutation = useUpdateAsset();
  const deleteMutation = useDeleteAsset();

  // ── Contacts (for client name display in Revenue mode) ──
  const { data: contactsList = [] } = useContactList({
    page: 1,
    limit: 500,
    status: 'active',
  });

  const contactNameMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of contactsList) {
      map.set(c.id, c.displayName || c.company_name || c.name || 'Unknown');
    }
    return map;
  }, [contactsList]);

  // ── Filter to entity-type assets only + enforce ownership_type client-side ──
  const allEntities = useMemo(
    () => assets.filter((a) =>
      (a.resource_type_id || '').toLowerCase() === 'asset' &&
      (a.ownership_type || '') === ownershipType
    ),
    [assets, ownershipType]
  );

  // ── Root entities (no parent) for the tree ──
  const rootEntities = useMemo(
    () => allEntities.filter((a) => !a.parent_asset_id && a.is_active),
    [allEntities]
  );

  // ── Entity map for breadcrumb path resolution ──
  // This map includes all loaded entities (roots + any that the detail panel has seen)
  const entityMap = useMemo(() => {
    const map = new Map<string, TenantAsset>();
    for (const e of allEntities) {
      map.set(e.id, e);
    }
    return map;
  }, [allEntities]);

  // ── Local State ──
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<TenantAsset | null>(null);
  const [addChildParent, setAddChildParent] = useState<TenantAsset | null>(null);

  const selectedEntity = selectedId ? entityMap.get(selectedId) || null : null;

  // ── Reset selection when perspective changes ──
  useEffect(() => {
    setSelectedId(null);
  }, [ownershipType]);

  // ── Analytics ──
  useEffect(() => {
    try {
      analyticsService.trackPageView('facility-registry', 'Facility Registry');
    } catch { /* ignore */ }
  }, []);

  // ── Handlers ──
  const handleSelect = useCallback((asset: TenantAsset) => {
    setSelectedId(asset.id);
    // Add to entityMap so breadcrumb can resolve it
    // (children loaded lazily might not be in allEntities yet)
  }, []);

  const handleAddEntity = useCallback(() => {
    setAddChildParent(null);
    setIsCreateOpen(true);
  }, []);

  const handleAddChild = useCallback((parentAsset: TenantAsset) => {
    setAddChildParent(parentAsset);
    setIsCreateOpen(true);
  }, []);

  const handleEdit = useCallback((asset: TenantAsset) => {
    setEditingAsset(asset);
    setIsEditOpen(true);
  }, []);

  const handleDelete = useCallback(async (asset: TenantAsset) => {
    if (!window.confirm(`Are you sure you want to remove "${asset.name}"?`)) return;
    try {
      await deleteMutation.mutateAsync(asset.id);
      if (selectedId === asset.id) setSelectedId(null);
    } catch { /* toast handled by hook */ }
  }, [deleteMutation, selectedId]);

  const handleCreateSubmit = useCallback(async (data: AssetFormData) => {
    try {
      const created = await createMutation.mutateAsync({
        ...data,
        resource_type_id: 'asset',
        ownership_type: ownershipType,
      });
      setIsCreateOpen(false);
      setAddChildParent(null);
      // Select the newly created entity
      if (created?.id) setSelectedId(created.id);
    } catch { /* toast handled by hook */ }
  }, [createMutation, ownershipType]);

  const handleEditSubmit = useCallback(async (data: AssetFormData) => {
    if (!editingAsset) return;
    try {
      await updateMutation.mutateAsync({
        id: editingAsset.id,
        data: { ...data, resource_type_id: 'asset' },
      });
      setIsEditOpen(false);
      setEditingAsset(null);
    } catch { /* toast handled by hook */ }
  }, [editingAsset, updateMutation]);

  // ── Perspective label ──
  const perspectiveLabel = isExpense
    ? 'My Facilities (Expense)'
    : 'Client Facilities (Revenue)';

  // ── Render ──
  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Page Header */}
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
          <span style={{ color: colors.utility.primaryText, fontWeight: 600 }}>
            Facility Registry
          </span>
        </div>
        <h1
          className="text-xl font-extrabold tracking-tight"
          style={{ color: colors.utility.primaryText }}
        >
          Facility Registry
        </h1>
        <p
          className="text-sm mt-1"
          style={{ color: colors.utility.secondaryText }}
        >
          {isExpense
            ? 'Manage your own facilities, buildings, and spaces. Track conditions and link to vendor contracts.'
            : 'Register and manage client facilities. Build hierarchies from campuses down to individual rooms.'}
        </p>
      </div>

      {/* Two-panel layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Hierarchy Tree */}
        <EntityTree
          rootEntities={rootEntities}
          isLoading={isLoading}
          isError={isError}
          selectedId={selectedId}
          onSelect={handleSelect}
          onAddEntity={handleAddEntity}
          perspectiveLabel={perspectiveLabel}
        />

        {/* Right: Detail Panel */}
        <EntityDetailPanel
          entity={selectedEntity}
          entityMap={entityMap}
          onNavigate={handleSelect}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onAddChild={handleAddChild}
          isMutating={isMutating}
          clientName={
            selectedEntity?.owner_contact_id
              ? contactNameMap.get(selectedEntity.owner_contact_id)
              : undefined
          }
        />
      </div>

      {/* Create Dialog */}
      <EntityFormDialog
        isOpen={isCreateOpen}
        onClose={() => {
          setIsCreateOpen(false);
          setAddChildParent(null);
        }}
        mode="create"
        onSubmit={handleCreateSubmit}
        isSubmitting={createMutation.isPending}
        defaultParent={addChildParent}
        rootEntities={allEntities.filter((e) => e.is_active)}
        defaultOwnershipType={ownershipType}
      />

      {/* Edit Dialog */}
      <EntityFormDialog
        isOpen={isEditOpen}
        onClose={() => {
          setIsEditOpen(false);
          setEditingAsset(null);
        }}
        mode="edit"
        asset={editingAsset || undefined}
        onSubmit={handleEditSubmit}
        isSubmitting={updateMutation.isPending}
        rootEntities={allEntities.filter((e) => e.is_active)}
        defaultOwnershipType={ownershipType}
      />
    </div>
  );
};

export default EntityRegistryPage;
