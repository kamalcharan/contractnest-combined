// src/components/contracts/ContractWizard/steps/AssetSelectionStep.tsx
// Equipment / Entity selection for the Contract Wizard.
// Sprint 1 (v2): staged, one-decision-at-a-time UX — matches
// SPRINT_REFERENCES/asset-step-redesign-v2.html exactly:
//   Stage "types"  — every equipment type visible as a flat card immediately
//                    (no accordion to open first); unit-count stepper inline
//                    on selection.
//   Stage "attach" — how the real units get attached: THREE stacked cards in
//                    priority order, "client lists them after signing" is the
//                    elevated default (merges the old separate Buyer-Will-Add
//                    / Attach-Later options — see owner decision, Sprint 1).
//   Registry picker — focused search + flat list, collapses to a one-line
//                    summary once assets are picked.
// All data is tenant/buyer-scoped and DB-backed (useResources, useClientAssets,
// EquipmentFormDialog/useCreateClientAsset) — nothing here is hardcoded.

import React, { useState, useMemo, useCallback } from 'react';
import {
  Search, X, Package, UserPlus,
  CheckCircle2, PencilLine,
  Clock, ListChecks, PackagePlus, ArrowRight,
} from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { Input } from '@/components/ui/Input';
import { VaNiLoader } from '@/components/common/loaders/UnifiedLoader';
import { getSubCategoryConfig } from '@/constants/subCategoryConfig';

// Reused components from equipment-registry
import EquipmentCard from '@/pages/equipment-registry/EquipmentCard';
import EquipmentFormDialog from '@/pages/equipment-registry/EquipmentFormDialog';

// Hooks
import { useClientAssets, useCreateClientAsset } from '@/hooks/queries/useClientAssetRegistry';
import { useResources, type Resource } from '@/hooks/queries/useResources';

// Types
import type { ClientAsset } from '@/types/clientAssetRegistry';
import type { AssetFormData } from '@/types/assetRegistry';

// ── Equipment Detail Item (matches migration 040 JSONB schema) ──────

export interface EquipmentDetailItem {
  id: string;
  asset_registry_id: string | null;
  added_by_tenant_id: string;
  added_by_role: 'seller' | 'buyer';
  resource_type: 'equipment' | 'entity';
  category_id: string | null;
  category_name: string;
  item_name: string;
  quantity: number;
  make: string | null;
  model: string | null;
  serial_number: string | null;
  condition: string | null;
  criticality: string | null;
  location: string | null;
  purchase_date: string | null;
  warranty_expiry: string | null;
  area_sqft: number | null;
  dimensions: object | null;
  capacity: number | null;
  specifications: Record<string, any>;
  notes: string | null;
}

// ── Coverage Type Item — mandatory even without specific assets ──────

export interface CoverageTypeItem {
  id: string;
  sub_category: string;
  resource_id: string;
  resource_name: string;
  // Sprint 1: declared fleet size for this asset type. Unattached remainder
  // (unit_count − attached instances) is represented as placeholder
  // equipment_details entries; at activation these drive the per-asset event
  // fan-out. Optional for back-compat with pre-Sprint-1 drafts (treated as 1).
  unit_count?: number;
}

// Placeholder marker inside EquipmentDetailItem.specifications
export const PLACEHOLDER_SPEC_KEY = 'placeholder';
export const isPlaceholderDetail = (d: EquipmentDetailItem): boolean =>
  d.asset_registry_id === null && !!(d.specifications as any)?.[PLACEHOLDER_SPEC_KEY];

// ── Props ────────────────────────────────────────────────────────────

interface AssetSelectionStepProps {
  contactId: string;
  buyerName: string;
  nomenclatureGroup: string | null;
  equipmentDetails: EquipmentDetailItem[];
  onEquipmentDetailsChange: (items: EquipmentDetailItem[]) => void;
  allowBuyerToAdd: boolean;
  onAllowBuyerToAddChange: (allow: boolean) => void;
  coverageTypes: CoverageTypeItem[];
  onCoverageTypesChange: (types: CoverageTypeItem[]) => void;
}

// ── Nomenclature → resource_type mapping ─────────────────────────────

const NOMENCLATURE_TO_RESOURCE: Record<string, { resourceType: 'equipment' | 'entity'; typeIds: string[]; label: string; addLabel: string }> = {
  equipment_maintenance: { resourceType: 'equipment', typeIds: ['equipment'], label: 'Equipment', addLabel: 'Add Equipment' },
  facility_property:     { resourceType: 'entity',    typeIds: ['asset'],     label: 'Entity',    addLabel: 'Add Entity' },
};

const DEFAULT_RESOURCE_CONFIG = { resourceType: 'equipment' as const, typeIds: ['equipment'], label: 'Equipment', addLabel: 'Add Equipment' };

// Attachment mode — merged per owner decision (Sprint 1): the old separate
// "Buyer Will Add" and "Attach Later" options are now ONE mode ('later').
type AttachmentMode = 'existing' | 'later' | null;

// ── Component ────────────────────────────────────────────────────────

const AssetSelectionStep: React.FC<AssetSelectionStepProps> = ({
  contactId,
  buyerName,
  nomenclatureGroup,
  equipmentDetails,
  onEquipmentDetailsChange,
  allowBuyerToAdd,
  onAllowBuyerToAddChange,
  coverageTypes,
  onCoverageTypesChange,
}) => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;
  const { currentTenant } = useAuth();

  const config = NOMENCLATURE_TO_RESOURCE[nomenclatureGroup || ''] || DEFAULT_RESOURCE_CONFIG;

  // ── Data: Client's assets (tenant + buyer scoped) ───────────────────
  const {
    data: assetsResponse,
    isLoading: assetsLoading,
  } = useClientAssets(
    { contact_id: contactId, limit: 500, offset: 0 },
    { enabled: !!contactId }
  );

  const allClientAssets: ClientAsset[] = useMemo(() => {
    const raw = assetsResponse?.data || [];
    return raw.filter((a) =>
      config.typeIds.includes((a.resource_type_id || '').toLowerCase())
    );
  }, [assetsResponse, config.typeIds]);

  // ── Data: tenant's equipment-type catalog ───────────────────────────
  const { data: allResources = [], isLoading: categoriesLoading } = useResources();

  const filteredResources = useMemo(() => {
    return allResources.filter(
      (r) => config.typeIds.includes((r.resource_type_id || '').toLowerCase()) && r.is_active
    );
  }, [allResources, config.typeIds]);

  // Sub-category grouping — used only as a plain (non-collapsible) section
  // label when the tenant's catalog spans more than one sub-category. Nothing
  // is ever hidden behind a click-to-expand accordion.
  const { subCategories, resourcesBySubCategory } = useMemo(() => {
    const bySubCat = new Map<string, Resource[]>();
    for (const r of filteredResources) {
      const subCat = r.sub_category || 'Other';
      if (!bySubCat.has(subCat)) bySubCat.set(subCat, []);
      bySubCat.get(subCat)!.push(r);
    }
    const sorted = [...bySubCat.keys()].sort((a, b) => {
      if (a === 'Other') return 1;
      if (b === 'Other') return -1;
      return a.localeCompare(b);
    });
    return { subCategories: sorted, resourcesBySubCategory: bySubCat };
  }, [filteredResources]);

  // Form categories for the "register new" drawer
  const allFormCategories = useMemo(() => {
    return filteredResources.map((r) => ({
      id: r.id,
      name: r.display_name || r.name,
      sub_category: r.sub_category || null,
      resource_type_id: r.resource_type_id,
    }));
  }, [filteredResources]);

  // ── Local state ────────────────────────────────────────────────────
  const [attachmentMode, setAttachmentMode] = useState<AttachmentMode>(
    // Auto-detect initial mode from existing state (placeholders don't count as attached)
    allowBuyerToAdd ? 'later' : (equipmentDetails.filter((d) => !isPlaceholderDetail(d)).length > 0 ? 'existing' : null)
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Which decision is in focus. Starts on "attach" when resuming a draft that
  // already has coverage picked; otherwise starts on "types". This is a pure
  // UI concern — it never gates wizard Continue (that still just needs
  // coverageTypes.length > 0, unchanged from today).
  const [uiStage, setUiStage] = useState<'types' | 'attach'>(
    coverageTypes.length > 0 ? 'attach' : 'types'
  );
  // Registry picker collapses to a one-line summary once the user is done —
  // matches the approved mock's Stage 3 behavior.
  const [pickerExpanded, setPickerExpanded] = useState(true);

  // Create mutation
  const createMutation = useCreateClientAsset();

  // ── Derived lookups ────────────────────────────────────────────────
  // Split real (attached) instances from generated placeholders
  const realDetails = useMemo(
    () => equipmentDetails.filter((d) => !isPlaceholderDetail(d)),
    [equipmentDetails]
  );
  const placeholderDetails = useMemo(
    () => equipmentDetails.filter(isPlaceholderDetail),
    [equipmentDetails]
  );

  const selectedRegistryIds = useMemo(() => {
    return new Set(equipmentDetails.map((d) => d.asset_registry_id).filter(Boolean) as string[]);
  }, [equipmentDetails]);

  const coveredResourceIds = useMemo(() => {
    return new Set(coverageTypes.map((c) => c.resource_id));
  }, [coverageTypes]);

  // ── Registry assets scoped to the CHOSEN coverage types only ────────
  // (the picker only ever needs to offer units of what was actually picked
  // in Stage 1 — no separate category sidebar needed to narrow it further)
  const displayAssets = useMemo(() => {
    let filtered = allClientAssets.filter((a) => coveredResourceIds.has(a.asset_type_id || ''));
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
  }, [allClientAssets, coveredResourceIds, searchQuery]);

  // ── Coverage type toggle ───────────────────────────────────────────
  const toggleCoverageType = useCallback(
    (resource: Resource) => {
      const subCat = resource.sub_category || 'Other';
      if (coveredResourceIds.has(resource.id)) {
        onCoverageTypesChange(coverageTypes.filter((c) => c.resource_id !== resource.id));
      } else {
        const newCoverage: CoverageTypeItem = {
          id: crypto.randomUUID(),
          sub_category: subCat,
          resource_id: resource.id,
          resource_name: resource.display_name || resource.name,
          unit_count: 1,
        };
        onCoverageTypesChange([...coverageTypes, newCoverage]);
      }
    },
    [coveredResourceIds, coverageTypes, onCoverageTypesChange]
  );

  // ── Unit count per coverage type (declared fleet size) ─────────────
  const setCoverageUnitCount = useCallback(
    (resourceId: string, count: number) => {
      const clamped = Math.max(1, Math.min(999, Math.round(count) || 1));
      onCoverageTypesChange(
        coverageTypes.map((c) => (c.resource_id === resourceId ? { ...c, unit_count: clamped } : c))
      );
    },
    [coverageTypes, onCoverageTypesChange]
  );

  // ── Placeholder reconciliation ──────────────────────────────────────
  // Locked model: for every coverage type, (unit_count − attached real
  // instances) placeholders exist in equipment_details. Placeholders are
  // serviceable-but-not-closable downstream (assign/status OK, no form, no
  // ticket closure) and become the per-asset fan-out at activation.
  React.useEffect(() => {
    const reals = equipmentDetails.filter((d) => !isPlaceholderDetail(d));
    const existingPh = equipmentDetails.filter(isPlaceholderDetail);

    const nextPlaceholders: EquipmentDetailItem[] = [];
    for (const ct of coverageTypes) {
      const declared = Math.max(1, ct.unit_count ?? 1);
      const attached = reals.filter((d) => d.category_id === ct.resource_id).length;
      const needed = Math.max(0, declared - attached);
      const mine = existingPh.filter(
        (d) => (d.specifications as any)?.coverage_resource_id === ct.resource_id
      );
      for (let i = 0; i < needed; i++) {
        if (mine[i]) {
          nextPlaceholders.push(mine[i]);
        } else {
          nextPlaceholders.push({
            id: crypto.randomUUID(),
            asset_registry_id: null,
            added_by_tenant_id: currentTenant?.id || '',
            added_by_role: 'seller',
            resource_type: config.resourceType,
            category_id: ct.resource_id,
            category_name: ct.resource_name,
            item_name: `${ct.resource_name} — to be attached`,
            quantity: 1,
            make: null, model: null, serial_number: null,
            condition: null, criticality: null, location: null,
            purchase_date: null, warranty_expiry: null,
            area_sqft: null, dimensions: null, capacity: null,
            specifications: { [PLACEHOLDER_SPEC_KEY]: true, coverage_resource_id: ct.resource_id },
            notes: null,
          });
        }
      }
    }

    const sig = (arr: EquipmentDetailItem[]) => arr.map((d) => d.id).sort().join('|');
    if (sig(existingPh) !== sig(nextPlaceholders)) {
      onEquipmentDetailsChange([...reals, ...nextPlaceholders]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coverageTypes, equipmentDetails]);

  // ── Build EquipmentDetailItem from ClientAsset ─────────────────────
  const buildDetailFromAsset = useCallback(
    (asset: ClientAsset): EquipmentDetailItem => {
      const matchedResource = filteredResources.find((r) => r.id === asset.asset_type_id);
      return {
        id: crypto.randomUUID(),
        asset_registry_id: asset.id,
        added_by_tenant_id: currentTenant?.id || '',
        added_by_role: 'seller',
        resource_type: config.resourceType,
        category_id: asset.asset_type_id || null,
        category_name: matchedResource?.display_name || matchedResource?.name || '',
        item_name: asset.name,
        quantity: 1,
        make: asset.make || null,
        model: asset.model || null,
        serial_number: asset.serial_number || null,
        condition: asset.condition || null,
        criticality: asset.criticality || null,
        location: asset.location || null,
        purchase_date: asset.purchase_date || null,
        warranty_expiry: asset.warranty_expiry || null,
        area_sqft: asset.area_sqft || null,
        dimensions: asset.dimensions || null,
        capacity: asset.capacity || null,
        specifications: asset.specifications || {},
        notes: null,
      };
    },
    [filteredResources, currentTenant?.id, config.resourceType]
  );

  // ── Toggle equipment selection ─────────────────────────────────────
  const handleToggle = useCallback(
    (asset: ClientAsset | any) => {
      const clientAsset = asset as ClientAsset;
      const isCurrentlySelected = selectedRegistryIds.has(clientAsset.id);

      if (isCurrentlySelected) {
        onEquipmentDetailsChange(
          equipmentDetails.filter((d) => d.asset_registry_id !== clientAsset.id)
        );
      } else {
        const detail = buildDetailFromAsset(clientAsset);
        onEquipmentDetailsChange([...equipmentDetails, detail]);

        if (clientAsset.asset_type_id && !coveredResourceIds.has(clientAsset.asset_type_id)) {
          const matchedResource = filteredResources.find((r) => r.id === clientAsset.asset_type_id);
          if (matchedResource) {
            const subCat = matchedResource.sub_category || 'Other';
            const newCoverage: CoverageTypeItem = {
              id: crypto.randomUUID(),
              sub_category: subCat,
              resource_id: matchedResource.id,
              resource_name: matchedResource.display_name || matchedResource.name,
              unit_count: 1,
            };
            onCoverageTypesChange([...coverageTypes, newCoverage]);
          }
        }
      }
    },
    [selectedRegistryIds, equipmentDetails, onEquipmentDetailsChange, buildDetailFromAsset, coveredResourceIds, filteredResources, coverageTypes, onCoverageTypesChange]
  );

  // ── Handle create via drawer ───────────────────────────────────────
  const handleCreateSubmit = useCallback(
    async (data: AssetFormData) => {
      try {
        const payload = {
          ...data,
          owner_contact_id: contactId,
          name: data.name,
          resource_type_id: data.resource_type_id || config.typeIds[0],
          status: data.status || 'active',
          condition: data.condition || 'good',
          criticality: data.criticality || 'medium',
          specifications: data.specifications || {},
          tags: data.tags || [],
        };

        const created = await createMutation.mutateAsync(payload as any);

        const matchedResource = filteredResources.find((r) => r.id === data.asset_type_id);
        const detail: EquipmentDetailItem = {
          id: crypto.randomUUID(),
          asset_registry_id: created?.id || null,
          added_by_tenant_id: currentTenant?.id || '',
          added_by_role: 'seller',
          resource_type: config.resourceType,
          category_id: data.asset_type_id || null,
          category_name: matchedResource?.display_name || matchedResource?.name || '',
          item_name: data.name,
          quantity: 1,
          make: data.make || null,
          model: data.model || null,
          serial_number: data.serial_number || null,
          condition: data.condition || null,
          criticality: data.criticality || null,
          location: data.location || null,
          purchase_date: data.purchase_date || null,
          warranty_expiry: data.warranty_expiry || null,
          area_sqft: data.area_sqft || null,
          dimensions: null,
          capacity: data.capacity || null,
          specifications: data.specifications || {},
          notes: null,
        };

        onEquipmentDetailsChange([...equipmentDetails, detail]);

        if (data.asset_type_id && !coveredResourceIds.has(data.asset_type_id) && matchedResource) {
          const subCat = matchedResource.sub_category || 'Other';
          const newCoverage: CoverageTypeItem = {
            id: crypto.randomUUID(),
            sub_category: subCat,
            resource_id: matchedResource.id,
            resource_name: matchedResource.display_name || matchedResource.name,
            unit_count: 1,
          };
          onCoverageTypesChange([...coverageTypes, newCoverage]);
        }

        setIsDrawerOpen(false);
        // Registering a new asset is functionally the same as attaching an
        // existing one from here on — fold into the 'existing' summary.
        setAttachmentMode('existing');
      } catch {
        // Toast handled by mutation hook
      }
    },
    [contactId, config, createMutation, filteredResources, currentTenant?.id, equipmentDetails, onEquipmentDetailsChange, coveredResourceIds, coverageTypes, onCoverageTypesChange]
  );

  // ── Attachment mode handler ─────────────────────────────────────────
  const chooseAttachmentMode = useCallback((mode: AttachmentMode) => {
    setAttachmentMode(mode);
    setPickerExpanded(true);
    onAllowBuyerToAddChange(mode === 'later');
  }, [onAllowBuyerToAddChange]);

  const totalCoverageCount = coverageTypes.length;
  const hasCoverage = totalCoverageCount > 0;
  const totalUnits = useMemo(
    () => coverageTypes.reduce((sum, c) => sum + Math.max(1, c.unit_count ?? 1), 0),
    [coverageTypes]
  );
  const attachedAssetsInScope = useMemo(
    () => realDetails.filter((d) => coveredResourceIds.has(d.category_id || '')),
    [realDetails, coveredResourceIds]
  );
  const attachedRegistryCount = attachedAssetsInScope.length;

  // Per-type registry intelligence: how many of the declared units already
  // exist in the client's registry vs. how many will remain placeholders no
  // matter what gets picked here ("3 requested, only 1 exists" case).
  const registryStatsByType = useMemo(() => {
    return coverageTypes.map((ct) => {
      const declared = Math.max(1, ct.unit_count ?? 1);
      const total = allClientAssets.filter((a) => a.asset_type_id === ct.resource_id).length;
      const items = displayAssets.filter((a) => a.asset_type_id === ct.resource_id);
      return { ct, declared, total, shortfall: Math.max(0, declared - total), items };
    });
  }, [coverageTypes, allClientAssets, displayAssets]);

  // Registry picker moves into a middle column (between the option cards and
  // the Coverage sidebar) whenever it's open — otherwise stays single-column.
  const showSplitLayout = uiStage === 'attach' && attachmentMode === 'existing' && pickerExpanded;

  // ── Card visuals helper — reuse the sub-category's icon/color ──────
  const cardVisual = (subCat: string) => {
    const scConfig = getSubCategoryConfig(subCat);
    return { Icon: scConfig?.icon || Package, color: scConfig?.color || '#6B7280' };
  };

  return (
    <div className="flex h-full overflow-hidden">
      {/* ═══ MAIN COLUMN ═══ */}
      <div className="flex-1 min-w-0 overflow-y-auto">
        <div className={`px-6 pt-6 pb-6 mx-auto ${showSplitLayout ? 'max-w-5xl' : 'max-w-3xl'}`}>

          {/* ═══════════════════ STAGE: TYPES ═══════════════════ */}
          {uiStage === 'types' && (
            <>
              <h1 className="text-xl font-bold mb-1.5" style={{ color: colors.utility.primaryText }}>
                Which {config.label.toLowerCase()} does this contract cover?
              </h1>
              <p className="text-sm mb-1.5" style={{ color: colors.utility.secondaryText }}>
                Select every {config.label.toLowerCase()} type this contract will service, and how many units of each.
              </p>
              <div
                className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full mb-5"
                style={{ backgroundColor: `${colors.brand.primary}12`, color: colors.brand.primary }}
              >
                <ArrowRight size={11} />
                Service blocks in the next step attach to the coverage you pick here
              </div>

              {hasCoverage && (
                <div className="flex flex-wrap gap-2 mb-5">
                  <span
                    className="text-xs font-bold px-3 py-1 rounded-full"
                    style={{ backgroundColor: colors.utility.secondaryBackground, color: colors.utility.primaryText, border: `1px solid ${colors.utility.primaryText}12` }}
                  >
                    {totalCoverageCount} type{totalCoverageCount > 1 ? 's' : ''} selected
                  </span>
                  <span
                    className="text-xs font-bold px-3 py-1 rounded-full"
                    style={{ backgroundColor: colors.utility.secondaryBackground, color: colors.utility.primaryText, border: `1px solid ${colors.utility.primaryText}12` }}
                  >
                    {totalUnits} unit{totalUnits > 1 ? 's' : ''} total
                  </span>
                </div>
              )}

              {categoriesLoading ? (
                <div className="flex items-center justify-center py-10">
                  <VaNiLoader size="sm" message="Loading categories..." />
                </div>
              ) : filteredResources.length === 0 ? (
                <div
                  className="rounded-xl border p-5 text-center"
                  style={{ borderColor: colors.utility.primaryText + '15', backgroundColor: colors.utility.secondaryBackground }}
                >
                  <p className="text-sm" style={{ color: colors.utility.secondaryText }}>
                    No {config.label.toLowerCase()} categories configured yet. Add them in Settings &rarr; Resources.
                  </p>
                </div>
              ) : (
                subCategories.map((subCat) => {
                  const resourcesInCat = resourcesBySubCategory.get(subCat) || [];
                  const { Icon, color } = cardVisual(subCat);
                  return (
                    <div key={subCat} className="mb-5">
                      {subCategories.length > 1 && (
                        <div className="flex items-center gap-2 mb-2.5">
                          <Icon size={13} style={{ color }} />
                          <span className="text-xs font-bold uppercase tracking-wide" style={{ color: colors.utility.secondaryText }}>
                            {subCat}
                          </span>
                        </div>
                      )}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {resourcesInCat.map((resource) => {
                          const sel = coveredResourceIds.has(resource.id);
                          const ct = coverageTypes.find((c) => c.resource_id === resource.id);
                          const units = Math.max(1, ct?.unit_count ?? 1);
                          return (
                            <div
                              key={resource.id}
                              role="button"
                              tabIndex={0}
                              onClick={() => toggleCoverageType(resource)}
                              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleCoverageType(resource); } }}
                              className="rounded-xl border-2 p-4 cursor-pointer transition-colors"
                              style={{
                                borderColor: sel ? color : `${colors.utility.primaryText}15`,
                                backgroundColor: sel ? `${color}0C` : colors.utility.primaryBackground,
                              }}
                            >
                              <div className="flex items-center gap-3">
                                <div
                                  className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                                  style={{ backgroundColor: sel ? color : `${colors.utility.primaryText}08`, color: sel ? '#FFFFFF' : color }}
                                >
                                  <Icon size={16} />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="text-sm font-bold truncate" style={{ color: colors.utility.primaryText }}>
                                    {resource.display_name || resource.name}
                                  </div>
                                </div>
                                <div
                                  className="w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center"
                                  style={{ borderColor: sel ? color : `${colors.utility.primaryText}25`, backgroundColor: sel ? color : 'transparent' }}
                                >
                                  {sel && <CheckCircle2 size={12} style={{ color: '#FFFFFF' }} />}
                                </div>
                              </div>
                              {sel && (
                                <div
                                  className="flex items-center justify-between gap-2 mt-3 pt-3"
                                  style={{ borderTop: `1px dashed ${color}50` }}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <span className="text-xs font-medium" style={{ color: colors.utility.secondaryText }}>
                                    Units covered
                                  </span>
                                  <div className="flex items-center rounded-lg border overflow-hidden" style={{ borderColor: color }}>
                                    <button
                                      type="button"
                                      onClick={() => setCoverageUnitCount(resource.id, units - 1)}
                                      className="w-7 h-7 flex items-center justify-center font-bold text-sm"
                                      style={{ color }}
                                    >
                                      −
                                    </button>
                                    <span
                                      className="w-9 h-7 flex items-center justify-center text-sm font-bold tabular-nums"
                                      style={{ backgroundColor: `${color}15`, color }}
                                    >
                                      {units}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => setCoverageUnitCount(resource.id, units + 1)}
                                      className="w-7 h-7 flex items-center justify-center font-bold text-sm"
                                      style={{ color }}
                                    >
                                      +
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })
              )}

              {!hasCoverage && !categoriesLoading && filteredResources.length > 0 && (
                <div className="rounded-lg border-2 border-dashed p-4 text-center mt-2" style={{ borderColor: '#f59e0b40' }}>
                  <p className="text-sm font-medium" style={{ color: '#f59e0b' }}>
                    Select at least one {config.label.toLowerCase()} type above to continue
                  </p>
                </div>
              )}

              {hasCoverage && (
                <button
                  type="button"
                  onClick={() => setUiStage('attach')}
                  className="w-full mt-5 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2"
                  style={{ backgroundColor: colors.brand.primary, color: '#FFFFFF' }}
                >
                  Continue to attachment options
                  <ArrowRight size={15} />
                </button>
              )}
            </>
          )}

          {/* ═══════════════════ STAGE: ATTACH ═══════════════════ */}
          {uiStage === 'attach' && (
            <>
              <button
                type="button"
                onClick={() => setUiStage('types')}
                className="inline-flex items-center gap-1.5 text-xs font-semibold mb-4"
                style={{ color: colors.brand.primary }}
              >
                <PencilLine size={12} />
                Edit equipment types
              </button>

              <h1 className="text-xl font-bold mb-1.5" style={{ color: colors.utility.primaryText }}>
                How should these get attached?
              </h1>
              <p className="text-sm mb-6" style={{ color: colors.utility.secondaryText }}>
                {coverageTypes.map((c) => `${c.resource_name} ×${Math.max(1, c.unit_count ?? 1)}`).join(' · ')}
              </p>

              <div
                className={showSplitLayout ? 'grid grid-cols-1 md:grid-cols-[340px_1fr] gap-5 items-start mb-5' : 'flex flex-col gap-3 mb-5'}
              >
                <div className="flex flex-col gap-3">
                  {/* Recommended — merged "buyer/later" path */}
                  <div
                    role="button" tabIndex={0}
                    onClick={() => chooseAttachmentMode('later')}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') chooseAttachmentMode('later'); }}
                    className="rounded-2xl border-2 p-5 cursor-pointer flex items-center gap-4"
                    style={{
                      borderColor: attachmentMode === 'later' ? colors.brand.primary : `${colors.brand.primary}50`,
                      backgroundColor: attachmentMode === 'later' ? `${colors.brand.primary}0C` : colors.utility.primaryBackground,
                      boxShadow: `0 0 0 1px ${colors.brand.primary}20`,
                    }}
                  >
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: colors.brand.primary, color: '#FFFFFF' }}>
                      <UserPlus size={22} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span
                        className="inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full mb-1.5"
                        style={{ backgroundColor: colors.brand.primary, color: '#FFFFFF' }}
                      >
                        Recommended
                      </span>
                      <div className="text-base font-bold" style={{ color: colors.utility.primaryText }}>
                        {buyerName || 'The client'} lists them after signing
                      </div>
                      <p className="text-xs mt-0.5" style={{ color: colors.utility.secondaryText }}>
                        They fill an asset form once the contract is accepted.
                      </p>
                      <div className="flex items-center gap-1 mt-1.5 text-xs font-bold" style={{ color: colors.brand.primary }}>
                        <CheckCircle2 size={12} /> You can still send the contract today
                      </div>
                    </div>
                    <div
                      className="w-6 h-6 rounded-full border-2 flex-shrink-0 flex items-center justify-center"
                      style={{ borderColor: colors.brand.primary, backgroundColor: attachmentMode === 'later' ? colors.brand.primary : 'transparent' }}
                    >
                      {attachmentMode === 'later' && <CheckCircle2 size={14} style={{ color: '#FFFFFF' }} />}
                    </div>
                  </div>

                  {/* Pick from registry */}
                  <div
                    role="button" tabIndex={0}
                    onClick={() => chooseAttachmentMode('existing')}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') chooseAttachmentMode('existing'); }}
                    className="rounded-2xl border-2 p-4 cursor-pointer flex items-center gap-4"
                    style={{
                      borderColor: attachmentMode === 'existing' ? colors.brand.primary : `${colors.utility.primaryText}15`,
                      backgroundColor: attachmentMode === 'existing' ? `${colors.brand.primary}0C` : colors.utility.primaryBackground,
                    }}
                  >
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${colors.utility.primaryText}08`, color: colors.utility.secondaryText }}>
                      <ListChecks size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold" style={{ color: colors.utility.primaryText }}>
                        Pick from their registered {config.label.toLowerCase()}
                      </div>
                      <p className="text-xs mt-0.5" style={{ color: colors.utility.secondaryText }}>
                        Serials and locations come along automatically.
                      </p>
                    </div>
                    <div
                      className="w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center"
                      style={{ borderColor: attachmentMode === 'existing' ? colors.brand.primary : `${colors.utility.primaryText}25`, backgroundColor: attachmentMode === 'existing' ? colors.brand.primary : 'transparent' }}
                    >
                      {attachmentMode === 'existing' && <CheckCircle2 size={12} style={{ color: '#FFFFFF' }} />}
                    </div>
                  </div>

                  {/* Register new */}
                  <div
                    role="button" tabIndex={0}
                    onClick={() => setIsDrawerOpen(true)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setIsDrawerOpen(true); }}
                    className="rounded-2xl border-2 p-3.5 cursor-pointer flex items-center gap-3"
                    style={{ borderColor: `${colors.utility.primaryText}12`, backgroundColor: colors.utility.primaryBackground }}
                  >
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${colors.utility.primaryText}06`, color: colors.utility.secondaryText }}>
                      <PackagePlus size={15} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold" style={{ color: colors.utility.primaryText }}>
                        {config.addLabel} now
                      </div>
                      <p className="text-xs" style={{ color: colors.utility.secondaryText }}>
                        Type make, model and serial yourself.
                      </p>
                    </div>
                  </div>

                  {/* Collapsed one-line registry summary — shown under the
                      cards once the picker itself has been collapsed */}
                  {attachmentMode === 'existing' && !pickerExpanded && (
                    <div
                      className="rounded-xl border flex items-center justify-between gap-3 px-4 py-3"
                      style={{ borderColor: colors.brand.primary, backgroundColor: `${colors.brand.primary}0C` }}
                    >
                      <span className="text-sm font-semibold" style={{ color: colors.brand.primary }}>
                        {attachedRegistryCount} attached from the registry
                      </span>
                      <button type="button" onClick={() => setPickerExpanded(true)} className="text-xs font-bold" style={{ color: colors.brand.primary }}>
                        Edit selection
                      </button>
                    </div>
                  )}
                </div>

                {/* ── Registry picker — sits to the RIGHT of the option cards,
                    between them and the Coverage sidebar ── */}
                {showSplitLayout && (
                  <div className="rounded-xl border p-4" style={{ borderColor: `${colors.utility.primaryText}12`, backgroundColor: colors.utility.secondaryBackground }}>
                    <div className="relative mb-3">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: colors.utility.secondaryText }} />
                      <Input
                        placeholder="Search equipment…"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 pr-8 text-sm"
                        style={{ borderColor: `${colors.utility.primaryText}20`, backgroundColor: colors.utility.primaryBackground, color: colors.utility.primaryText }}
                      />
                      {searchQuery && (
                        <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                          <X className="h-3.5 w-3.5" style={{ color: colors.utility.secondaryText }} />
                        </button>
                      )}
                    </div>
                    {assetsLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <VaNiLoader size="sm" message="Loading..." />
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {registryStatsByType.map(({ ct, declared, total, shortfall, items }) => {
                          const { color } = cardVisual(ct.sub_category);
                          return (
                            <div key={ct.id}>
                              <div className="flex items-center justify-between gap-2 mb-2">
                                <span className="text-xs font-bold" style={{ color: colors.utility.primaryText }}>
                                  {ct.resource_name}
                                </span>
                                <span
                                  className="text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0"
                                  style={{
                                    backgroundColor: shortfall > 0 ? '#F59E0B15' : `${color}15`,
                                    color: shortfall > 0 ? '#B45309' : color,
                                  }}
                                >
                                  {total} of {declared} in registry
                                </span>
                              </div>
                              {items.length > 0 ? (
                                <div className="grid grid-cols-1 gap-2">
                                  {items.map((asset) => (
                                    <EquipmentCard
                                      key={asset.id}
                                      asset={asset}
                                      selectable
                                      isSelected={selectedRegistryIds.has(asset.id)}
                                      onToggle={handleToggle}
                                    />
                                  ))}
                                </div>
                              ) : (
                                <p className="text-xs py-2" style={{ color: colors.utility.secondaryText }}>
                                  {searchQuery ? `No matches for "${searchQuery}"` : 'None registered yet for this type'}
                                </p>
                              )}
                              {shortfall > 0 && (
                                <div className="flex items-center gap-1.5 mt-1.5 text-[11px] font-medium" style={{ color: '#B45309' }}>
                                  <Clock size={11} className="flex-shrink-0" />
                                  {shortfall} more unit{shortfall > 1 ? 's' : ''} will need to be added later (as placeholder{shortfall > 1 ? 's' : ''})
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                    {attachedRegistryCount > 0 && (
                      <div className="text-right mt-3">
                        <button
                          type="button"
                          onClick={() => setPickerExpanded(false)}
                          className="text-xs font-bold"
                          style={{ color: colors.brand.primary }}
                        >
                          Done — collapse list
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* ── Placeholder note ───────────────────────────────────── */}
              {placeholderDetails.length > 0 && (
                <div
                  className="flex items-center gap-2 rounded-lg px-3.5 py-2.5 mt-3 text-xs font-medium"
                  style={{ backgroundColor: '#F59E0B0F', border: '1px solid #F59E0B40', color: '#B45309' }}
                >
                  <Clock size={13} className="flex-shrink-0" />
                  {placeholderDetails.length} unit{placeholderDetails.length > 1 ? 's' : ''} still to attach — assignment and status can proceed, but the mandatory form (and closing the visit) needs the real asset attached first.
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ═══ RIGHT — running summary ═══ */}
      <div
        className="w-[220px] flex-shrink-0 border-l overflow-y-auto hidden lg:block"
        style={{ borderColor: `${colors.utility.primaryText}10`, backgroundColor: isDarkMode ? colors.utility.primaryBackground : '#F7F8F9' }}
      >
        <div className="p-4">
          <h3 className="text-[10px] font-bold uppercase tracking-wider mb-3" style={{ color: colors.utility.secondaryText }}>
            Coverage
          </h3>
          {hasCoverage ? (
            <div className="space-y-2 mb-4">
              {coverageTypes.map((ct) => {
                const { color } = cardVisual(ct.sub_category);
                return (
                  <div
                    key={ct.id}
                    className="rounded-lg border px-2.5 py-2"
                    style={{ borderColor: `${color}30`, backgroundColor: `${color}0A` }}
                  >
                    <div className="text-xs font-bold" style={{ color }}>{ct.resource_name}</div>
                    <div className="text-[10px]" style={{ color: colors.utility.secondaryText }}>
                      ×{Math.max(1, ct.unit_count ?? 1)} unit{(ct.unit_count ?? 1) > 1 ? 's' : ''}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-xs mb-4" style={{ color: colors.utility.secondaryText }}>No equipment types yet</p>
          )}

          {uiStage === 'attach' && (
            <>
              <h3 className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: colors.utility.secondaryText }}>
                Attachment
              </h3>
              <div className="rounded-lg border px-2.5 py-2 mb-3" style={{ borderColor: `${colors.utility.primaryText}12` }}>
                <div className="text-xs font-bold" style={{ color: colors.utility.primaryText }}>
                  {attachmentMode === 'later' ? `${buyerName || 'Client'} lists later` : attachmentMode === 'existing' ? 'Registry' : '—'}
                </div>
                <div className="text-[10px]" style={{ color: colors.utility.secondaryText }}>
                  {placeholderDetails.length > 0 ? `${placeholderDetails.length} to attach` : 'fully attached'}
                </div>
              </div>

              {attachmentMode === 'existing' && attachedAssetsInScope.length > 0 && (
                <div className="mb-4">
                  <h3 className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: colors.utility.secondaryText }}>
                    Attached ({attachedAssetsInScope.length})
                  </h3>
                  <div className="space-y-1.5">
                    {attachedAssetsInScope.map((d) => (
                      <div key={d.id} className="flex items-center gap-1.5 text-[11px] font-medium" style={{ color: colors.utility.primaryText }}>
                        <CheckCircle2 size={10} style={{ color: colors.brand.primary }} className="flex-shrink-0" />
                        <span className="truncate">{d.item_name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── EquipmentFormDialog Drawer ──────────────────────────── */}
      <EquipmentFormDialog
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        mode="create"
        defaultSubCategory={null}
        resourceTypeId={config.typeIds[0]}
        categories={allFormCategories}
        onSubmit={handleCreateSubmit}
        isSubmitting={createMutation.isPending}
        lockedContactId={contactId}
        lockedContactName={buyerName}
      />
    </div>
  );
};

export default AssetSelectionStep;
