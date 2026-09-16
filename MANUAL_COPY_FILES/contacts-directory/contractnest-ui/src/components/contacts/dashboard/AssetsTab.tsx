// src/components/contacts/dashboard/AssetsTab.tsx
// Full asset management: search + grid + create/edit/deactivate dialogs.
// Renders the SAME card the Equipment Registry grid renders — MachineCard
// (owner call, 2026-09-16: one card family across surfaces). The registry
// itself moved from EquipmentCard to MachineCard; EquipmentCard survives
// only as the contract-wizard picker card. Full details (contract chips,
// visits/proof state, category name) require the with_contracts=true fetch
// + the registry's detail/state mapping — both replicated here verbatim.

import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Wrench,
  Plus,
  Search,
  X,
  Loader2,
} from 'lucide-react';
import MachineCard from '@/components/contracts/fleet/MachineCard';
import ClientAssetFormDialog from '@/components/assets/ClientAssetFormDialog';
import ConfirmationDialog from '@/components/ui/ConfirmationDialog';
import {
  useAssetRegistryManager,
  useCreateAsset,
  useUpdateAsset,
  useDeleteAsset,
} from '@/hooks/queries/useAssetRegistry';
import { useResources } from '@/hooks/queries/useResources';
import { useResourceTemplatesBrowser } from '@/hooks/queries/useResourceTemplates';
import type { TenantAsset, AssetRegistryFilters } from '@/types/assetRegistry';
import { STATUS_CONFIG } from '@/types/assetRegistry';
import type { ContractEquipmentDetail } from '@/types/contracts';
import type { MachineServiceState } from '@/components/contracts/fleet/fleetTypes';
import type { ClientAsset, ClientAssetFormData } from '@/types/clientAssetRegistry';

interface AssetsTabProps {
  contactId: string;
  colors: any;
}

const AssetsTab: React.FC<AssetsTabProps> = ({
  contactId,
  colors,
}) => {
  const navigate = useNavigate();

  // ── Data: this contact's assets, enriched exactly like the registry ──
  // with_contracts=true is what brings back contracts[] + service_state
  // (contract chips, visits/proof/due) — without it the cards go sparse.
  const filters: AssetRegistryFilters = useMemo(
    () => ({
      limit: 500,
      offset: 0,
      with_contracts: true,
      contact_id: contactId,
      include_inactive: true,
    }),
    [contactId]
  );

  const {
    assets,
    isLoading: assetsLoading,
    isMutating,
  } = useAssetRegistryManager(filters);

  const createMutation = useCreateAsset();
  const updateMutation = useUpdateAsset();
  const deleteMutation = useDeleteAsset();

  // ── Category display names (same three-way resolution as the registry:
  // tenant resource id first, then master-template id) ──────────────────
  const { data: allResources = [] } = useResources();
  const { templates } = useResourceTemplatesBrowser({ limit: 500 });

  const categoryIdToName = useMemo(() => {
    const m = new Map<string, string>();
    for (const r of allResources) m.set(r.id, r.display_name || r.name);
    for (const t of templates) if (!m.has(t.id)) m.set(t.id, t.name);
    return m;
  }, [allResources, templates]);

  const assetCategoryName = (a: TenantAsset): string | undefined =>
    categoryIdToName.get(a.asset_type_id || '') ||
    categoryIdToName.get(a.template_id || '') ||
    undefined;

  // ── Local state ───────────────────────────────────────────────────
  const [assetSearch, setAssetSearch] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<TenantAsset | null>(null);
  const [deactivateTarget, setDeactivateTarget] = useState<TenantAsset | null>(null);

  // Filter assets by search
  const filteredAssets = assetSearch.trim()
    ? assets.filter(a => a.name.toLowerCase().includes(assetSearch.toLowerCase()))
    : assets;

  // Stats
  const activeCount = assets.filter(a => a.is_active && a.status === 'active').length;
  const repairCount = assets.filter(a => a.is_active && a.status === 'under_repair').length;
  const inactiveCount = assets.filter(a => !a.is_active).length;

  // ── Deactivate flow (registry pattern: blocked while in a contract) ──
  const targetContracts = deactivateTarget?.contracts || [];
  const targetBlocked = targetContracts.length > 0;

  const confirmDeactivate = async () => {
    if (!deactivateTarget) return;
    if (targetBlocked) {
      // Informational variant — just dismiss
      setDeactivateTarget(null);
      return;
    }
    try {
      await deleteMutation.mutateAsync(deactivateTarget.id);
    } catch {
      /* toast handled by hook */
    } finally {
      setDeactivateTarget(null);
    }
  };

  const handleReactivate = async (asset: TenantAsset) => {
    try {
      await updateMutation.mutateAsync({ id: asset.id, data: { is_active: true } });
    } catch {
      /* toast handled by hook */
    }
  };

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
            <span>{assets.length} total</span>
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
            {inactiveCount > 0 && (
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#94a3b8' }} />
                {inactiveCount} inactive
              </span>
            )}
          </div>
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

      {/* Asset Grid — same MachineCard mapping as the Equipment Registry */}
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
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredAssets.map((asset) => {
            // Adapt the registry asset to the card's contract-detail shape
            const detail: ContractEquipmentDetail = {
              id: asset.id,
              asset_registry_id: asset.id,
              resource_type: (asset.resource_type_id || '').toLowerCase() === 'asset' ? 'entity' : 'equipment',
              category_id: asset.asset_type_id,
              category_name: assetCategoryName(asset) || '',
              item_name: asset.name,
              quantity: 1,
              make: asset.make,
              model: asset.model,
              serial_number: asset.serial_number,
              condition: asset.condition,
              criticality: asset.criticality,
              location: asset.location,
            };

            // Aggregated visits state from the edge (with_contracts=true);
            // one synthesized overdue visit carries the "Due: <date> (missed)" text
            const svc = asset.service_state;
            const state: MachineServiceState | null = svc && svc.total_visits > 0 ? {
              machineId: asset.id,
              visits: svc.first_overdue_date
                ? [{ key: 'overdue', row: null, event: null, dateKey: svc.first_overdue_date, isProven: false, isOverdue: true, isLocked: false }]
                : [],
              provenCount: svc.proven_count,
              totalVisits: svc.total_visits,
              overdueCount: svc.overdue_count,
              nextDueDate: svc.next_due_date,
              lastProven: svc.last_proven_date ? { dateKey: svc.last_proven_date, assignee: null } : null,
            } : null;

            const firstContract = asset.contracts?.[0];

            return (
              <MachineCard
                key={asset.id}
                colors={colors}
                detail={detail}
                isPlaceholder={false}
                state={state}
                hasServiceData={!!state}
                canRemove={false}
                canAttach={false}
                removing={false}
                pillLabel={!asset.is_active ? 'Inactive' : (STATUS_CONFIG[asset.status]?.label || 'Active')}
                pillTone={!asset.is_active ? 'muted' : 'success'}
                dimmed={!asset.is_active}
                contractRefs={asset.contracts}
                onOpenContract={(cid) => navigate(`/contracts/${cid}`)}
                noVisitsNote={(asset.contracts?.length || 0) > 0 ? 'No visits scheduled yet' : 'Not in any contract yet'}
                onOpenLogbook={state && firstContract ? () => navigate(`/contracts/${firstContract.id}`) : undefined}
                onEdit={asset.is_active && !isMutating ? () => { setEditingAsset(asset); setIsEditOpen(true); } : undefined}
                onDeactivate={asset.is_active && !isMutating ? () => setDeactivateTarget(asset) : undefined}
                onReactivate={!asset.is_active && !isMutating ? () => handleReactivate(asset) : undefined}
              />
            );
          })}
        </div>
      )}

      {/* Deactivate confirm (registry pattern — blocked while attached to a contract) */}
      <ConfirmationDialog
        isOpen={!!deactivateTarget}
        onClose={() => setDeactivateTarget(null)}
        onConfirm={confirmDeactivate}
        title={
          targetBlocked
            ? 'Cannot deactivate yet'
            : `Deactivate "${deactivateTarget?.name}"?`
        }
        description={
          targetBlocked
            ? `"${deactivateTarget?.name}" is attached to ${targetContracts
                .map((c) => c.contract_number)
                .join(', ')}. Remove it from the contract first, then deactivate it here.`
            : 'It will be hidden from pickers, wizards and lists. Nothing is deleted — you can reactivate it any time.'
        }
        confirmText={targetBlocked ? 'Got it' : 'Deactivate'}
        type={targetBlocked ? 'info' : 'danger'}
        isLoading={deleteMutation.isPending}
      />

      {/* Create Dialog — contact-scoped form; submits through the registry
          mutation so the with_contracts list refreshes (one query cache) */}
      <ClientAssetFormDialog
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        mode="create"
        contactId={contactId}
        onSubmit={async (data: ClientAssetFormData) => {
          await createMutation.mutateAsync({ ...data, ownership_type: 'client' });
          setIsCreateOpen(false);
        }}
        isSubmitting={createMutation.isPending}
      />

      {/* Edit Dialog */}
      <ClientAssetFormDialog
        isOpen={isEditOpen}
        onClose={() => { setIsEditOpen(false); setEditingAsset(null); }}
        mode="edit"
        contactId={contactId}
        asset={(editingAsset as unknown as ClientAsset) || undefined}
        onSubmit={async (data: ClientAssetFormData) => {
          if (editingAsset) {
            await updateMutation.mutateAsync({ id: editingAsset.id, data: { ...data, ownership_type: 'client' } });
            setIsEditOpen(false);
            setEditingAsset(null);
          }
        }}
        isSubmitting={updateMutation.isPending}
      />
    </div>
  );
};

export default AssetsTab;
