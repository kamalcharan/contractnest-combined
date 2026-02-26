// src/components/contacts/dashboard/AssetsTab.tsx
// Full asset management: search + grid + create/edit/delete dialogs
// Reuses existing ClientAssetCard and ClientAssetFormDialog

import React, { useState } from 'react';
import {
  Wrench,
  Plus,
  Search,
  X,
  Loader2,
  LayoutGrid,
  List,
} from 'lucide-react';
import ClientAssetCard from '@/components/assets/ClientAssetCard';
import ClientAssetFormDialog from '@/components/assets/ClientAssetFormDialog';
import { useClientAssetRegistryManager, useCreateClientAsset, useUpdateClientAsset, useDeleteClientAsset } from '@/hooks/queries/useClientAssetRegistry';
import type { ClientAsset, ClientAssetFormData } from '@/types/clientAssetRegistry';

interface AssetsTabProps {
  contactId: string;
  colors: any;
}

const AssetsTab: React.FC<AssetsTabProps> = ({
  contactId,
  colors,
}) => {
  // Asset hooks
  const {
    assets: clientAssets,
    isLoading: assetsLoading,
    isMutating: assetsMutating,
  } = useClientAssetRegistryManager({ contact_id: contactId });
  const createAssetMutation = useCreateClientAsset();
  const updateAssetMutation = useUpdateClientAsset();
  const deleteAssetMutation = useDeleteClientAsset();

  // Local state
  const [assetSearch, setAssetSearch] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<ClientAsset | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Filter assets by search
  const filteredAssets = assetSearch.trim()
    ? clientAssets.filter(a => a.name.toLowerCase().includes(assetSearch.toLowerCase()))
    : clientAssets;

  // Stats
  const activeCount = clientAssets.filter(a => a.status === 'active').length;
  const repairCount = clientAssets.filter(a => a.status === 'under_repair').length;

  if (assetsLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin" style={{ color: colors.brand.primary }} />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: colors.utility.secondaryText }} />
            <input
              placeholder="Search assets..."
              value={assetSearch}
              onChange={(e) => setAssetSearch(e.target.value)}
              className="pl-10 pr-9 py-2 rounded-lg border text-sm w-64"
              style={{
                borderColor: colors.utility.primaryText + '15',
                backgroundColor: colors.utility.secondaryBackground,
                color: colors.utility.primaryText,
              }}
            />
            {assetSearch && (
              <button onClick={() => setAssetSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                <X className="h-3.5 w-3.5" style={{ color: colors.utility.secondaryText }} />
              </button>
            )}
          </div>

          {/* Quick stats */}
          <div className="flex items-center gap-3 text-xs" style={{ color: colors.utility.secondaryText }}>
            <span>{clientAssets.length} total</span>
            {activeCount > 0 && (
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#22c55e' }} />
                {activeCount} active
              </span>
            )}
            {repairCount > 0 && (
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#f59e0b' }} />
                {repairCount} under repair
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* View toggle */}
          <div className="flex gap-1 p-1 rounded-lg" style={{ backgroundColor: colors.utility.secondaryBackground }}>
            <button
              onClick={() => setViewMode('grid')}
              className="p-1.5 rounded"
              style={{
                backgroundColor: viewMode === 'grid' ? colors.utility.primaryBackground : 'transparent',
                color: viewMode === 'grid' ? colors.utility.primaryText : colors.utility.secondaryText,
              }}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className="p-1.5 rounded"
              style={{
                backgroundColor: viewMode === 'list' ? colors.utility.primaryBackground : 'transparent',
                color: viewMode === 'list' ? colors.utility.primaryText : colors.utility.secondaryText,
              }}
            >
              <List className="h-4 w-4" />
            </button>
          </div>

          {/* Add button */}
          <button
            onClick={() => setIsCreateOpen(true)}
            className="px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2"
            style={{ backgroundColor: '#f59e0b', color: '#fff' }}
          >
            <Plus className="h-4 w-4" /> Add Asset
          </button>
        </div>
      </div>

      {/* Asset Grid/List */}
      {filteredAssets.length === 0 ? (
        <div className="text-center py-16">
          <Wrench className="h-16 w-16 mx-auto mb-4 opacity-30" style={{ color: colors.utility.secondaryText }} />
          <h3 className="text-lg font-semibold mb-2" style={{ color: colors.utility.primaryText }}>
            {assetSearch ? `No assets matching "${assetSearch}"` : 'No assets registered'}
          </h3>
          <p className="text-sm mb-4" style={{ color: colors.utility.secondaryText }}>
            {assetSearch ? 'Try a different search term' : 'Register client assets like equipment, vehicles, or software'}
          </p>
          {!assetSearch && (
            <button
              onClick={() => setIsCreateOpen(true)}
              className="px-6 py-2.5 rounded-lg text-sm font-semibold"
              style={{ backgroundColor: '#f59e0b', color: '#fff' }}
            >
              Add First Asset
            </button>
          )}
        </div>
      ) : (
        <div className={viewMode === 'grid' ? 'grid grid-cols-3 gap-4' : 'space-y-3'}>
          {filteredAssets.map((asset) => (
            <ClientAssetCard
              key={asset.id}
              asset={asset}
              onEdit={(a) => { setEditingAsset(a); setIsEditOpen(true); }}
              onDelete={async (a) => {
                if (window.confirm(`Remove "${a.name}"?`)) {
                  try { await deleteAssetMutation.mutateAsync(a.id); } catch {}
                }
              }}
              disabled={assetsMutating}
            />
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <ClientAssetFormDialog
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        mode="create"
        contactId={contactId}
        onSubmit={async (data) => {
          await createAssetMutation.mutateAsync(data);
          setIsCreateOpen(false);
        }}
        isSubmitting={createAssetMutation.isPending}
      />

      {/* Edit Dialog */}
      <ClientAssetFormDialog
        isOpen={isEditOpen}
        onClose={() => { setIsEditOpen(false); setEditingAsset(null); }}
        mode="edit"
        contactId={contactId}
        asset={editingAsset || undefined}
        onSubmit={async (data) => {
          if (editingAsset) {
            await updateAssetMutation.mutateAsync({ id: editingAsset.id, data });
            setIsEditOpen(false);
            setEditingAsset(null);
          }
        }}
        isSubmitting={updateAssetMutation.isPending}
      />
    </div>
  );
};

export default AssetsTab;
