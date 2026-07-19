// src/components/contracts/EquipmentTab.tsx
// Equipment & Facility details tab for contract detail page
// Both seller and buyer can add/remove equipment using the same
// EquipmentCard (selectable) + EquipmentFormDialog from equipment-registry
//
// Batch B "Fleet Logbook" redesign (includes Batch A picker fixes):
// - Fleet summary strip (machines / awaiting / visits proven / next / behind)
// - Category-grouped machine grid with per-machine service-state footers
// - Lens toggle: machine cards | service matrix
// - Machine logbook drawer (click a card)
// - Stay-open placeholder attach flow
// - "Show only awaiting" filter

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Wrench, Plus, X, Search, Package, Building2, LayoutGrid, TableIcon, CheckCircle2 } from 'lucide-react';
import type { ContractEquipmentDetail } from '@/types/contracts';
import { isPlaceholderDetail } from '@/components/contracts/ContractWizard/steps/AssetSelectionStep';
import { useAuth } from '@/context/AuthContext';
import {
  useAssetRegistryManager,
  useCreateAsset,
} from '@/hooks/queries/useAssetRegistry';
import { useResources, type Resource } from '@/hooks/queries/useResources';
import {
  useBuyerAddEquipment,
  useBuyerRemoveEquipment,
  useSellerAddEquipment,
  useSellerRemoveEquipment,
} from '@/hooks/queries/useContractQueries';
import {
  useContractEventsForContract,
  useContractEventAssets,
} from '@/hooks/queries/useContractEventQueries';
import type { TenantAsset, AssetFormData, AssetRegistryFilters } from '@/types/assetRegistry';
import EquipmentCard from '@/pages/equipment-registry/EquipmentCard';
import EquipmentFormDialog from '@/pages/equipment-registry/EquipmentFormDialog';
import { VaNiLoader } from '@/components/common/loaders/UnifiedLoader';
import { useContactList } from '@/hooks/useContacts';
import FleetSummaryStrip from '@/components/contracts/fleet/FleetSummaryStrip';
import FleetMatrix, { type FleetMatrixGroup } from '@/components/contracts/fleet/FleetMatrix';
import MachineLogbookDrawer from '@/components/contracts/fleet/MachineLogbookDrawer';
import MachineCard from '@/components/contracts/fleet/MachineCard';
import {
  buildFleetServiceMap,
  localTodayKey,
} from '@/components/contracts/fleet/fleetTypes';

// =================================================================
// PROPS
// =================================================================

/** Controls which "Add" buttons appear and what the picker filters */
export type EquipmentTabMode = 'equipment' | 'facility' | 'both';

interface EquipmentTabProps {
  equipmentDetails: ContractEquipmentDetail[];
  allowBuyerToAdd?: boolean;
  colors: any;
  isBuyer?: boolean;
  contractId?: string;
  /** The buyer/contact on this contract — used to filter registry on Revenue side */
  buyerId?: string;
  /** Determines which add buttons to show: equipment, facility, or both */
  mode?: EquipmentTabMode;
}

// =================================================================
// HELPERS
// =================================================================

function generateId(): string {
  return crypto.randomUUID?.() ?? `eq-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/** Convert a TenantAsset from registry into a ContractEquipmentDetail */
function assetToDetail(
  asset: TenantAsset,
  tenantId: string,
  role: 'seller' | 'buyer',
  resourceIdToSubCategory: Map<string, string>,
): ContractEquipmentDetail {
  return {
    id: generateId(),
    asset_registry_id: asset.id,
    added_by_tenant_id: tenantId,
    added_by_role: role,
    resource_type: (asset.resource_type_id || '').toLowerCase() === 'asset' ? 'entity' : 'equipment',
    category_id: asset.asset_type_id || null,
    category_name: resourceIdToSubCategory.get(asset.asset_type_id || '') || 'Other',
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

/** Category group of machines (cards lens) */
interface FleetGroup {
  key: string;
  name: string;
  items: ContractEquipmentDetail[];
  attached: number;
  awaiting: number;
  proven: number;
  totalVisits: number;
}

// =================================================================
// MAIN COMPONENT
// =================================================================

const EquipmentTab: React.FC<EquipmentTabProps> = ({
  equipmentDetails,
  allowBuyerToAdd,
  colors,
  isBuyer = false,
  contractId,
  buyerId,
  mode = 'equipment',
}) => {
  const { currentTenant } = useAuth();
  const tenantId = currentTenant?.id || '';
  const isSeller = !isBuyer;
  const role: 'seller' | 'buyer' = isBuyer ? 'buyer' : 'seller';

  // ── State ──────────────────────────────────────────────────────

  const [showPicker, setShowPicker] = useState(false);
  /** Which resource type the picker is currently filtering for */
  const [pickerResourceType, setPickerResourceType] = useState<'equipment' | 'entity'>(mode === 'facility' ? 'entity' : 'equipment');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddFormOpen, setIsAddFormOpen] = useState(false);
  /** Which registryMode the form dialog should use */
  const [addFormMode, setAddFormMode] = useState<'equipment' | 'entity'>('equipment');
  /** Track which asset ID is currently being added/removed */
  const [mutatingAssetId, setMutatingAssetId] = useState<string | null>(null);
  /** Set when "Attach Asset" was clicked on a placeholder — the picker then
   * replaces this specific placeholder instead of appending a new item. */
  const [attachingPlaceholder, setAttachingPlaceholder] = useState<ContractEquipmentDetail | null>(null);
  /** Stay-open attach flow: note shown after a successful attach when more
   * placeholders remain ("Attached ✓ — now attaching: <category>") */
  const [attachedNote, setAttachedNote] = useState<string | null>(null);
  /** Fleet lens: category-grouped machine cards or read-only service matrix */
  const [lens, setLens] = useState<'cards' | 'matrix'>('cards');
  /** "Show only awaiting" filter — placeholder cards only */
  const [showOnlyAwaiting, setShowOnlyAwaiting] = useState(false);
  /** Machine whose logbook drawer is open (equipment detail id) */
  const [logbookMachineId, setLogbookMachineId] = useState<string | null>(null);

  const showEquipmentBtn = mode === 'equipment' || mode === 'both';
  const showFacilityBtn = mode === 'facility' || mode === 'both';

  // ── Mutations ──────────────────────────────────────────────────

  const sellerAddMutation = useSellerAddEquipment();
  const sellerRemoveMutation = useSellerRemoveEquipment();
  const buyerAddMutation = useBuyerAddEquipment();
  const buyerRemoveMutation = useBuyerRemoveEquipment();

  const addMutation = isBuyer ? buyerAddMutation : sellerAddMutation;
  const removeMutation = isBuyer ? buyerRemoveMutation : sellerRemoveMutation;

  // ── Contacts (resolve owner_contact_id → display name, same as equipment-registry) ──
  const { data: contactsList = [] } = useContactList({ page: 1, limit: 500, status: 'active' });
  const contactNameMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of contactsList) {
      map.set(c.id, c.displayName || c.company_name || c.name || 'Unknown');
    }
    return map;
  }, [contactsList]);

  // ── Registry data (only loaded when picker is open) ────────────
  // Revenue side (seller): show client-owned equipment filtered by buyer contact
  // Expense side (buyer): show self-owned equipment (no contact filter)

  const filters: AssetRegistryFilters = useMemo(() => {
    if (isBuyer) {
      // Expense side — buyer adds from their own (self) equipment
      return { limit: 500, offset: 0, ownership_type: 'self' as const };
    }
    // Revenue side — seller picks from equipment registered under the buyer/client contact
    return {
      limit: 500,
      offset: 0,
      ownership_type: 'client' as const,
      contact_id: buyerId || undefined,
    };
  }, [isBuyer, buyerId]);

  const { assets, isLoading: assetsLoading } = useAssetRegistryManager(
    showPicker ? filters : { limit: 0, offset: 0 }
  );

  const createMutation = useCreateAsset();

  const { data: allResources = [], isLoading: resourcesLoading } = useResources();

  // Build lookup maps for resources
  const { resourceIdToSubCategory, allFormCategories } = useMemo(() => {
    const idToSubCat = new Map<string, string>();
    const eqResources: Resource[] = [];

    for (const r of allResources) {
      if (r.is_active && ['equipment', 'asset'].includes((r.resource_type_id || '').toLowerCase())) {
        eqResources.push(r);
        idToSubCat.set(r.id, r.sub_category || 'Other');
      }
    }

    const formCats = eqResources.map((r) => ({
      id: r.id,
      name: r.display_name || r.name,
      sub_category: r.sub_category || null,
      resource_type_id: r.resource_type_id,
    }));

    return { resourceIdToSubCategory: idToSubCat, allFormCategories: formCats };
  }, [allResources]);

  // ── Fleet service data (client-side join, no backend change) ───
  // Events + per-asset rows for this contract. Works for both personas;
  // if either query errors or returns nothing, cards render without the
  // service footer and the matrix lens stays hidden.

  // per_page MAX is 100 — the API validator (contractEventValidators.ts)
  // rejects anything above with a 400, which silently emptied this tab.
  const { data: eventsData, isLoading: eventsLoading } = useContractEventsForContract(
    contractId || null,
    { per_page: 100 },
  );
  const { data: eventAssetsByEvent = {}, isLoading: eventAssetsLoading } = useContractEventAssets(
    contractId || null,
  );

  const allEvents = eventsData?.items || [];
  const serviceDataLoading = !!contractId && (eventsLoading || eventAssetsLoading);

  /** Per-machine service state, keyed by equipment detail id */
  const fleetMap = useMemo(
    () => buildFleetServiceMap(equipmentDetails, allEvents, eventAssetsByEvent),
    [equipmentDetails, allEvents, eventAssetsByEvent],
  );

  /** Distinct ISO dates of the contract's service visits (matrix columns).
   * Derived from the service events themselves — per-asset rows refine the
   * per-machine detail when they exist, but are NOT required for the fleet
   * view to render. */
  const dateColumns = useMemo(() => {
    const set = new Set<string>();
    for (const e of allEvents) {
      if (e.event_type === 'service' && e.scheduled_date) {
        set.add(e.scheduled_date.split('T')[0]);
      }
    }
    return Array.from(set).sort();
  }, [allEvents]);

  const hasServiceData = !serviceDataLoading && dateColumns.length > 0;

  /** Fleet-wide aggregates for the summary strip */
  const fleetStats = useMemo(() => {
    let proven = 0;
    let total = 0;
    let behind = 0;
    let next: string | null = null;
    for (const s of fleetMap.values()) {
      proven += s.provenCount;
      total += s.totalVisits;
      if (s.overdueCount > 0) behind += 1;
      if (s.nextDueDate && (!next || s.nextDueDate < next)) next = s.nextDueDate;
    }
    if (!next) {
      const todayKey = localTodayKey();
      next = dateColumns.find((d) => d >= todayKey) || null;
    }
    return { proven, total, behind, next };
  }, [fleetMap, dateColumns]);

  // ── Derived data ──────────────────────────────────────────────

  const hasEquipment = equipmentDetails.length > 0;
  const equipmentCount = equipmentDetails.filter(e => e.resource_type === 'equipment').length;
  const entityCount = equipmentDetails.filter(e => e.resource_type === 'entity').length;
  const awaitingCount = useMemo(
    () => equipmentDetails.filter((d) => isPlaceholderDetail(d as any)).length,
    [equipmentDetails],
  );
  const awaitingFilterActive = showOnlyAwaiting && awaitingCount > 0;

  // Track which asset_registry_ids are already in the contract
  const existingAssetIds = useMemo(() => {
    const set = new Set<string>();
    for (const d of equipmentDetails) {
      if (d.asset_registry_id) set.add(d.asset_registry_id);
    }
    return set;
  }, [equipmentDetails]);

  const canAdd = contractId && (isSeller || (isBuyer && allowBuyerToAdd));

  // Display index among same-category items ("2 of 3") — only meaningful once
  // a category has more than one instance (real or placeholder).
  const displayIndexById = useMemo(() => {
    const byCategory = new Map<string, ContractEquipmentDetail[]>();
    for (const d of equipmentDetails) {
      const key = d.category_id || d.category_name || 'uncategorized';
      if (!byCategory.has(key)) byCategory.set(key, []);
      byCategory.get(key)!.push(d);
    }
    const map = new Map<string, { index: number; total: number }>();
    for (const items of byCategory.values()) {
      if (items.length <= 1) continue;
      items.forEach((d, i) => map.set(d.id, { index: i + 1, total: items.length }));
    }
    return map;
  }, [equipmentDetails]);

  // Category-grouped machines (same bucketing key as displayIndexById)
  const fleetGroups = useMemo((): FleetGroup[] => {
    const order: string[] = [];
    const byKey = new Map<string, ContractEquipmentDetail[]>();
    for (const d of equipmentDetails) {
      const key = d.category_id || d.category_name || 'uncategorized';
      if (!byKey.has(key)) {
        byKey.set(key, []);
        order.push(key);
      }
      byKey.get(key)!.push(d);
    }
    return order.map((key) => {
      const items = byKey.get(key)!;
      let attached = 0;
      let awaiting = 0;
      let proven = 0;
      let totalVisits = 0;
      for (const d of items) {
        if (isPlaceholderDetail(d as any)) awaiting += 1;
        else attached += 1;
        const s = fleetMap.get(d.id);
        if (s) {
          proven += s.provenCount;
          totalVisits += s.totalVisits;
        }
      }
      return {
        key,
        name: items[0].category_name || 'Other',
        items,
        attached,
        awaiting,
        proven,
        totalVisits,
      };
    });
  }, [equipmentDetails, fleetMap]);

  /** Groups shown in the cards lens (honours the "show only awaiting" filter) */
  const visibleGroups = useMemo(() => {
    if (!awaitingFilterActive) return fleetGroups;
    return fleetGroups
      .map((g) => ({ ...g, items: g.items.filter((d) => isPlaceholderDetail(d as any)) }))
      .filter((g) => g.items.length > 0);
  }, [fleetGroups, awaitingFilterActive]);

  /** Matrix always shows the full fleet (read-only overview) */
  const matrixGroups = useMemo(
    (): FleetMatrixGroup[] =>
      fleetGroups.map((g) => ({
        key: g.key,
        name: g.name,
        machines: g.items.map((d) => ({
          detail: d,
          state: fleetMap.get(d.id),
          isPlaceholder: isPlaceholderDetail(d as any),
        })),
      })),
    [fleetGroups, fleetMap],
  );

  const logbookMachine = useMemo(
    () => (logbookMachineId ? equipmentDetails.find((d) => d.id === logbookMachineId) || null : null),
    [logbookMachineId, equipmentDetails],
  );
  const logbookState = logbookMachineId ? fleetMap.get(logbookMachineId) || null : null;

  // Filter registry assets for picker based on pickerResourceType
  // For seller view, also filter by buyer contact so only this contract's client equipment shows
  const displayAssets = useMemo(() => {
    if (!showPicker) return [];
    const matchType = pickerResourceType === 'entity' ? 'asset' : 'equipment';
    let filtered = assets.filter(
      (a) =>
        (a.resource_type_id || '').toLowerCase() === matchType &&
        a.is_active
    );

    // Attaching a specific placeholder — narrow to its exact category so
    // only relevant units show (e.g. only HVAC units, not all equipment).
    // Also hide assets already attached to this contract: clicking one in
    // attach mode would run the REMOVE branch and silently detach it from
    // the slot it already fills.
    if (attachingPlaceholder) {
      if (attachingPlaceholder.category_id) {
        filtered = filtered.filter((a) => a.asset_type_id === attachingPlaceholder.category_id);
      }
      filtered = filtered.filter((a) => !existingAssetIds.has(a.id));
    }

    // Seller view: filter by buyer contact (client-side safety net in case API didn't filter)
    if (isSeller && buyerId) {
      filtered = filtered.filter((a) => a.owner_contact_id === buyerId);
    }

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
  }, [assets, searchQuery, showPicker, isSeller, buyerId, pickerResourceType, attachingPlaceholder, existingAssetIds]);

  // ── Handlers ──────────────────────────────────────────────────

  const handleToggleAsset = useCallback(async (asset: TenantAsset) => {
    if (!contractId) return;
    setMutatingAssetId(asset.id);

    try {
      if (existingAssetIds.has(asset.id)) {
        // Find the equipment detail with this asset_registry_id and remove it
        const detail = equipmentDetails.find((d) => d.asset_registry_id === asset.id);
        if (detail) {
          await removeMutation.mutateAsync({ contractId, itemId: detail.id });
        }
      } else {
        // Add the asset — replacing a specific placeholder if we're in attach mode
        const item = assetToDetail(asset, tenantId, role, resourceIdToSubCategory);
        await addMutation.mutateAsync({
          contractId,
          equipmentItem: item,
          replacesItemId: attachingPlaceholder?.id,
        });
        if (attachingPlaceholder) {
          // Stay-open attach: if other placeholders remain, advance to the
          // next one instead of closing the picker.
          const remaining = equipmentDetails.filter(
            (d) => d.id !== attachingPlaceholder.id && isPlaceholderDetail(d as any),
          );
          if (remaining.length > 0) {
            // Prefer another slot of the same category, then any other slot
            const next =
              (attachingPlaceholder.category_id &&
                remaining.find((d) => d.category_id === attachingPlaceholder.category_id)) ||
              remaining[0];
            setAttachedNote(`Attached "${asset.name}" — now attaching: ${next.category_name}`);
            setAttachingPlaceholder(next);
            setPickerResourceType(next.resource_type === 'entity' ? 'entity' : 'equipment');
            setSearchQuery('');
          } else {
            setAttachedNote(null);
            setAttachingPlaceholder(null);
            setShowPicker(false);
          }
        }
      }
    } catch {
      // Error toast handled by mutation hook
    } finally {
      setMutatingAssetId(null);
    }
  }, [contractId, existingAssetIds, equipmentDetails, tenantId, role, resourceIdToSubCategory, addMutation, removeMutation, attachingPlaceholder]);

  const handleStartAttach = useCallback((placeholder: ContractEquipmentDetail) => {
    setAttachingPlaceholder(placeholder);
    setPickerResourceType(placeholder.resource_type === 'entity' ? 'entity' : 'equipment');
    setSearchQuery('');
    setAttachedNote(null);
    setShowPicker(true);
  }, []);

  const handleClosePicker = useCallback(() => {
    setShowPicker(false);
    setSearchQuery('');
    setAttachingPlaceholder(null);
    setAttachedNote(null);
  }, []);

  const handleRemoveCard = useCallback(async (detail: ContractEquipmentDetail) => {
    if (!contractId) return;
    try {
      await removeMutation.mutateAsync({ contractId, itemId: detail.id });
    } catch {
      // Error toast handled by mutation hook
    }
  }, [contractId, removeMutation]);

  // "+ Add Equipment" — create in registry via form dialog and auto-add to contract
  const handleCreateSubmit = useCallback(
    async (data: AssetFormData) => {
      if (!contractId) return;
      try {
        const created = await createMutation.mutateAsync(data);
        // Auto-add the newly created asset to the contract
        const item = assetToDetail(created, tenantId, role, resourceIdToSubCategory);
        await addMutation.mutateAsync({ contractId, equipmentItem: item });
        setIsAddFormOpen(false);
      } catch {
        /* toast handled by hooks */
      }
    },
    [createMutation, tenantId, role, resourceIdToSubCategory, contractId, addMutation]
  );

  /** Card click → open the machine logbook drawer (buttons keep their own actions) */
  const handleCardClick = useCallback(
    (e: React.MouseEvent, detail: ContractEquipmentDetail) => {
      if ((e.target as HTMLElement).closest('button')) return;
      const s = fleetMap.get(detail.id);
      if (!s || s.totalVisits === 0) return; // no service history to show
      setLogbookMachineId(detail.id);
    },
    [fleetMap],
  );

  const handleCloseLogbook = useCallback(() => setLogbookMachineId(null), []);

  const isLoading = assetsLoading || resourcesLoading;

  // ── Render helpers ────────────────────────────────────────────

  const renderMachineCard = (item: ContractEquipmentDetail) => {
    const isOwnItem = item.added_by_tenant_id === tenantId;
    const canRemove = isOwnItem && !!contractId;
    // Resolve client name: use asset_registry_id to find in registry,
    // or fall back to the buyer contact on this contract
    const clientName = buyerId ? contactNameMap.get(buyerId) : undefined;
    const isPlaceholder = isPlaceholderDetail(item as any);
    const displayIndex = displayIndexById.get(item.id);
    const state = fleetMap.get(item.id);
    const clickable = !isPlaceholder && !!state && state.totalVisits > 0;

    return (
      <div
        key={item.id}
        className={`relative h-full ${clickable ? 'cursor-pointer' : ''}`}
        onClick={(e) => handleCardClick(e, item)}
      >
        <MachineCard
          colors={colors}
          detail={item}
          isPlaceholder={isPlaceholder}
          displayIndex={displayIndex}
          state={state}
          hasServiceData={hasServiceData && !serviceDataLoading}
          clientName={clientName}
          canRemove={canRemove}
          canAttach={canAdd}
          removing={removeMutation.isPending}
          onRemove={canRemove ? () => handleRemoveCard(item) : undefined}
          onAttach={isPlaceholder && canAdd ? () => handleStartAttach(item) : undefined}
          onOpenLogbook={clickable ? () => setLogbookMachineId(item.id) : undefined}
        />
      </div>
    );
  };

  // ── Render ────────────────────────────────────────────────────

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
          {isSeller && allowBuyerToAdd && (
            <span
              className="text-xs px-2.5 py-1 rounded-full font-medium"
              style={{ backgroundColor: '#f59e0b18', color: '#d97706', border: '1px solid #f59e0b30' }}
            >
              Buyer can add
            </span>
          )}
          {canAdd && showPicker && (
            <button
              onClick={handleClosePicker}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors hover:opacity-90"
              style={{
                backgroundColor: colors.utility.secondaryBackground,
                color: colors.utility.primaryText,
                border: `1px solid ${colors.utility.primaryText}20`,
              }}
            >
              <X className="h-3.5 w-3.5" />
              Close
            </button>
          )}
          {canAdd && !showPicker && showEquipmentBtn && (
            <button
              onClick={() => { setPickerResourceType('equipment'); setSearchQuery(''); setShowPicker(true); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors hover:opacity-90"
              style={{ backgroundColor: colors.brand.primary, color: '#fff' }}
            >
              <Plus className="h-3.5 w-3.5" />
              {isBuyer ? 'Add My Equipment' : 'Add Equipment'}
            </button>
          )}
          {canAdd && !showPicker && showFacilityBtn && (
            <button
              onClick={() => { setPickerResourceType('entity'); setSearchQuery(''); setShowPicker(true); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors hover:opacity-90"
              style={{ backgroundColor: '#8B5CF6', color: '#fff' }}
            >
              <Building2 className="h-3.5 w-3.5" />
              {isBuyer ? 'Add My Facility' : 'Add Facility'}
            </button>
          )}
        </div>
      </div>

      {/* ── Fleet summary strip ── */}
      {hasEquipment && (
        <FleetSummaryStrip
          colors={colors}
          machinesTotal={equipmentDetails.length}
          equipmentCount={equipmentCount}
          entityCount={entityCount}
          awaitingCount={awaitingCount}
          provenTotal={fleetStats.proven}
          visitsTotal={fleetStats.total}
          nextVisitDate={fleetStats.next}
          machinesBehind={fleetStats.behind}
          hasServiceData={hasServiceData}
          serviceDataLoading={serviceDataLoading}
          showOnlyAwaiting={awaitingFilterActive}
          onToggleAwaiting={() => setShowOnlyAwaiting((v) => !v)}
        />
      )}

      {/* ── Equipment Picker (registry-based, reuses EquipmentCard) ── */}
      {showPicker && contractId && canAdd && (
        <div
          className="rounded-xl border overflow-hidden"
          style={{
            backgroundColor: colors.utility.secondaryBackground,
            borderColor: colors.brand.primary + '30',
          }}
        >
          {/* Picker header */}
          <div
            className="px-5 py-3.5 flex items-center justify-between"
            style={{
              backgroundColor: colors.brand.primary + '08',
              borderBottom: `1px solid ${colors.brand.primary}20`,
            }}
          >
            <div className="flex items-center gap-3">
              <span className="text-sm font-bold" style={{ color: colors.utility.primaryText }}>
                {attachingPlaceholder
                  ? `Attach real asset for "${attachingPlaceholder.category_name}"`
                  : `Select ${pickerResourceType === 'entity' ? 'Facility' : 'Equipment'} from Registry`}
              </span>
              {displayAssets.length > 0 && (
                <span className="text-xs" style={{ color: colors.utility.secondaryText }}>
                  {/* Count only assets visible in THIS filtered view — the global
                      attached count can exceed the narrowed list (e.g. "9 of 3"). */}
                  {displayAssets.filter((a) => existingAssetIds.has(a.id)).length} of {displayAssets.length} added
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {/* + Add Equipment/Facility (opens form dialog) */}
              <button
                onClick={() => { setAddFormMode(pickerResourceType); setIsAddFormOpen(true); }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors hover:opacity-90"
                style={{ backgroundColor: pickerResourceType === 'entity' ? '#8B5CF6' : colors.brand.primary, color: '#fff' }}
              >
                <Plus className="h-3.5 w-3.5" />
                {pickerResourceType === 'entity' ? 'Add Facility' : 'Add Equipment'}
              </button>

              {/* Search */}
              <div className="relative">
                <Search
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5"
                  style={{ color: colors.utility.secondaryText }}
                />
                <input
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 pr-7 py-1.5 w-44 rounded-lg border text-xs"
                  style={{
                    borderColor: colors.utility.primaryText + '20',
                    backgroundColor: colors.utility.primaryBackground,
                    color: colors.utility.primaryText,
                  }}
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2"
                  >
                    <X className="h-3 w-3" style={{ color: colors.utility.secondaryText }} />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Stay-open attach note — shown after a successful attach when the
              picker advanced to the next remaining placeholder */}
          {attachedNote && attachingPlaceholder && (
            <div
              className="px-5 py-2 flex items-center gap-2 text-xs font-medium"
              style={{
                backgroundColor: colors.semantic.success + '10',
                color: colors.semantic.success,
                borderBottom: `1px solid ${colors.semantic.success}20`,
              }}
            >
              <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0" />
              {attachedNote}
            </div>
          )}

          {/* Picker body — equipment card grid */}
          <div className="px-5 py-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <VaNiLoader size="sm" message="Loading equipment..." />
              </div>
            ) : displayAssets.length === 0 ? (
              <div className="text-center py-12">
                <Package
                  className="h-12 w-12 mx-auto mb-3"
                  style={{ color: colors.utility.secondaryText + '40' }}
                />
                <p className="text-sm mb-1" style={{ color: colors.utility.secondaryText }}>
                  {searchQuery
                    ? `No ${pickerResourceType === 'entity' ? 'facilities' : 'equipment'} matching "${searchQuery}"`
                    : `No ${pickerResourceType === 'entity' ? 'facilities' : 'equipment'} in registry yet`}
                </p>
                <p className="text-xs" style={{ color: colors.utility.secondaryText + '80' }}>
                  {searchQuery
                    ? 'Try a different search term'
                    : `Click "+ ${pickerResourceType === 'entity' ? 'Add Facility' : 'Add Equipment'}" to register first.`}
                </p>
              </div>
            ) : (
              <div
                className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 max-h-[50vh] overflow-y-auto pr-1"
              >
                {displayAssets.map((asset) => (
                  <EquipmentCard
                    key={asset.id}
                    asset={asset}
                    clientName={asset.owner_contact_id ? contactNameMap.get(asset.owner_contact_id) : undefined}
                    selectable
                    isSelected={existingAssetIds.has(asset.id)}
                    onToggle={() => handleToggleAsset(asset)}
                    disabled={!!mutatingAssetId && mutatingAssetId !== asset.id}
                    isMutating={mutatingAssetId === asset.id}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Lens toggle + awaiting filter ── */}
      {hasEquipment && (hasServiceData || awaitingCount > 0) && (
        <div className="flex items-center gap-3 flex-wrap">
          {hasServiceData && (
            <div
              className="flex items-center rounded-lg border overflow-hidden"
              style={{
                borderColor: colors.utility.primaryText + '15',
                backgroundColor: colors.utility.secondaryBackground,
              }}
            >
              <button
                onClick={() => setLens('cards')}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition-colors"
                style={
                  lens === 'cards'
                    ? { backgroundColor: colors.brand.primary, color: '#fff' }
                    : { color: colors.utility.secondaryText }
                }
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                Machine cards
              </button>
              <button
                onClick={() => setLens('matrix')}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition-colors"
                style={
                  lens === 'matrix'
                    ? { backgroundColor: colors.brand.primary, color: '#fff' }
                    : { color: colors.utility.secondaryText }
                }
              >
                <TableIcon className="h-3.5 w-3.5" />
                Service matrix
              </button>
            </div>
          )}
          {awaitingCount > 0 && (
            <button
              onClick={() => setShowOnlyAwaiting((v) => !v)}
              aria-pressed={awaitingFilterActive}
              className="text-xs px-2.5 py-1 rounded-full font-medium transition-colors hover:opacity-90"
              style={
                awaitingFilterActive
                  ? { backgroundColor: '#d97706', color: '#fff', border: '1px solid #d97706' }
                  : { backgroundColor: '#f59e0b18', color: '#d97706', border: '1px solid #f59e0b30' }
              }
            >
              Show only awaiting · {awaitingCount}
            </button>
          )}
          {hasServiceData && lens === 'matrix' && (
            <span className="text-[11px]" style={{ color: colors.utility.secondaryText }}>
              Cards for working a machine, matrix for spotting who's behind
            </span>
          )}
        </div>
      )}

      {/* ── Zero-visits note: equipment exists but no service visits yet ── */}
      {hasEquipment && !serviceDataLoading && !hasServiceData && (
        <div
          className="rounded-xl border border-dashed px-4 py-3 text-xs"
          style={{ borderColor: colors.utility.primaryText + '15', color: colors.utility.secondaryText }}
        >
          No service visits scheduled on this contract yet — per-machine service
          tracking and the service matrix light up once visits exist.
        </div>
      )}

      {/* ── Attached equipment — category-grouped fleet (cards | matrix) ── */}
      {hasEquipment ? (
        lens === 'matrix' && hasServiceData ? (
          <FleetMatrix
            colors={colors}
            groups={matrixGroups}
            dateColumns={dateColumns}
            isLoading={serviceDataLoading}
          />
        ) : visibleGroups.length === 0 ? (
          <div
            className="rounded-xl border border-dashed px-5 py-8 text-center text-xs"
            style={{ borderColor: colors.utility.primaryText + '15', color: colors.utility.secondaryText }}
          >
            No machines awaiting attachment.
          </div>
        ) : (
          <div className="space-y-5">
            {visibleGroups.map((group) => (
              <div key={group.key}>
                <div className="flex items-baseline gap-2.5 mb-2 flex-wrap">
                  <h3 className="text-[13px] font-bold" style={{ color: colors.utility.primaryText }}>
                    {group.name}
                  </h3>
                  <span className="text-[11px]" style={{ color: colors.utility.secondaryText }}>
                    {group.items.length} unit{group.items.length === 1 ? '' : 's'}
                    {group.awaiting > 0 && ` · ${group.attached} attached · ${group.awaiting} awaiting`}
                    {hasServiceData && group.totalVisits > 0 && ` · ${group.proven}/${group.totalVisits} visits proven`}
                  </span>
                </div>
                <div
                  className="grid gap-3"
                  style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(310px, 1fr))' }}
                >
                  {group.items.map((item) => renderMachineCard(item))}
                </div>
              </div>
            ))}
          </div>
        )
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
            {canAdd
              ? `Add ${mode === 'facility' ? 'facilities' : mode === 'both' ? 'equipment or facilities' : 'equipment'} to this contract using the button${mode === 'both' ? 's' : ''} above.`
              : isBuyer
                ? 'Equipment additions are not enabled for this contract.'
                : 'No equipment has been added to this contract yet.'}
          </p>
        </div>
      )}

      {/* ── Machine logbook drawer (read-only) ── */}
      <MachineLogbookDrawer
        isOpen={!!logbookMachine}
        onClose={handleCloseLogbook}
        colors={colors}
        machine={logbookMachine}
        state={logbookState}
      />

      {/* ── EquipmentFormDialog (reused from equipment-registry) ── */}
      <EquipmentFormDialog
        isOpen={isAddFormOpen}
        onClose={() => setIsAddFormOpen(false)}
        mode="create"
        categories={allFormCategories}
        onSubmit={handleCreateSubmit}
        isSubmitting={createMutation.isPending}
        defaultOwnershipType={isBuyer ? 'self' : 'client'}
        lockedContactId={isBuyer ? undefined : buyerId}
        registryMode={addFormMode}
      />
    </div>
  );
};

export default EquipmentTab;
