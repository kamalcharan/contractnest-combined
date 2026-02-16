// src/components/contracts/ContractWizard/steps/AssetSelectionStep.tsx
// Equipment / Entity selection for the Contract Wizard
// Reuses EquipmentCard (selectable mode) + EquipmentFormDialog (drawer) from /equipment-registry

import React, { useState, useMemo, useCallback } from 'react';
import { Plus, Search, X, Layers, Package, UserPlus, ShieldCheck, Trash2, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/input';
import { VaNiLoader } from '@/components/common/loaders/UnifiedLoader';
import { cn } from '@/lib/utils';
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
}

// ── Props ────────────────────────────────────────────────────────────

interface AssetSelectionStepProps {
  contactId: string;                                        // buyer's contact_id
  buyerName: string;                                        // buyer display name
  nomenclatureGroup: string | null;                         // e.g. 'equipment_maintenance' | 'facility_property'
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

  // ── Data: Client's assets ──────────────────────────────────────────
  const {
    data: assetsResponse,
    isLoading: assetsLoading,
  } = useClientAssets(
    { contact_id: contactId, limit: 500, offset: 0 },
    { enabled: !!contactId }
  );

  const allClientAssets: ClientAsset[] = useMemo(() => {
    const raw = assetsResponse?.data || [];
    // Filter by resource_type matching nomenclature
    return raw.filter((a) =>
      config.typeIds.includes((a.resource_type_id || '').toLowerCase())
    );
  }, [assetsResponse, config.typeIds]);

  // ── Data: Categories (for sidebar + form) ──────────────────────────
  const { data: allResources = [], isLoading: categoriesLoading } = useResources();

  const filteredResources = useMemo(() => {
    return allResources.filter(
      (r) => config.typeIds.includes((r.resource_type_id || '').toLowerCase()) && r.is_active
    );
  }, [allResources, config.typeIds]);

  // Sub-category grouping
  const { subCategories, resourcesBySubCategory, resourceIdToSubCategory } = useMemo(() => {
    const bySubCat = new Map<string, Resource[]>();
    const idToSubCat = new Map<string, string>();

    for (const r of filteredResources) {
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

    return { subCategories: sorted, resourcesBySubCategory: bySubCat, resourceIdToSubCategory: idToSubCat };
  }, [filteredResources]);

  // Form categories for the drawer
  const allFormCategories = useMemo(() => {
    return filteredResources.map((r) => ({
      id: r.id,
      name: r.display_name || r.name,
      sub_category: r.sub_category || null,
      resource_type_id: r.resource_type_id,
    }));
  }, [filteredResources]);

  // ── Local state ────────────────────────────────────────────────────
  const [selectedSubCategory, setSelectedSubCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sidebarSearch, setSidebarSearch] = useState('');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Coverage type add form state
  const [coverageSubCat, setCoverageSubCat] = useState<string>('');
  const [coverageResourceId, setCoverageResourceId] = useState<string>('');

  // Create mutation
  const createMutation = useCreateClientAsset();

  // ── Selected IDs set (for quick lookup) ────────────────────────────
  const selectedRegistryIds = useMemo(() => {
    return new Set(equipmentDetails.map((d) => d.asset_registry_id).filter(Boolean) as string[]);
  }, [equipmentDetails]);

  // ── Coverage types derived from selected assets ────────────────────
  // Track which resource_ids are already covered (from assets + manual)
  const coveredResourceIds = useMemo(() => {
    return new Set(coverageTypes.map((c) => c.resource_id));
  }, [coverageTypes]);

  // Resources available for coverage add (filtered by selected sub_cat)
  const coverageFilteredResources = useMemo(() => {
    if (!coverageSubCat) return [];
    return (resourcesBySubCategory.get(coverageSubCat) || []).filter(
      (r) => !coveredResourceIds.has(r.id)
    );
  }, [coverageSubCat, resourcesBySubCategory, coveredResourceIds]);

  // ── Filtered assets for grid ───────────────────────────────────────
  const displayAssets = useMemo(() => {
    let filtered = allClientAssets;

    // Filter by sub_category
    if (selectedSubCategory) {
      const resourceIdsInSubCat = new Set(
        (resourcesBySubCategory.get(selectedSubCategory) || []).map((r) => r.id)
      );
      filtered = filtered.filter((a) => resourceIdsInSubCat.has(a.asset_type_id || ''));
    }

    // Filter by search
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
  }, [allClientAssets, selectedSubCategory, resourcesBySubCategory, searchQuery]);

  // ── Sub-category asset counts ──────────────────────────────────────
  const subCategoryAssetCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const asset of allClientAssets) {
      const subCat = resourceIdToSubCategory.get(asset.asset_type_id || '') || 'Other';
      counts[subCat] = (counts[subCat] || 0) + 1;
    }
    return counts;
  }, [allClientAssets, resourceIdToSubCategory]);

  // Filtered sidebar
  const filteredSubCategories = useMemo(() => {
    if (!sidebarSearch.trim()) return subCategories;
    const q = sidebarSearch.toLowerCase();
    return subCategories.filter((sc) => sc.toLowerCase().includes(q));
  }, [sidebarSearch, subCategories]);

  // ── Build EquipmentDetailItem from ClientAsset ─────────────────────
  const buildDetailFromAsset = useCallback(
    (asset: ClientAsset): EquipmentDetailItem => {
      // Resolve category_name from resource_id
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

  // ── Toggle selection ───────────────────────────────────────────────
  const handleToggle = useCallback(
    (asset: ClientAsset | any) => {
      const clientAsset = asset as ClientAsset;
      const isCurrentlySelected = selectedRegistryIds.has(clientAsset.id);

      if (isCurrentlySelected) {
        // Remove
        onEquipmentDetailsChange(
          equipmentDetails.filter((d) => d.asset_registry_id !== clientAsset.id)
        );
      } else {
        // Add to equipment details
        const detail = buildDetailFromAsset(clientAsset);
        onEquipmentDetailsChange([...equipmentDetails, detail]);

        // Auto-add to coverage types if not already there
        if (clientAsset.asset_type_id && !coveredResourceIds.has(clientAsset.asset_type_id)) {
          const matchedResource = filteredResources.find((r) => r.id === clientAsset.asset_type_id);
          if (matchedResource) {
            const subCat = matchedResource.sub_category || 'Other';
            const newCoverage: CoverageTypeItem = {
              id: crypto.randomUUID(),
              sub_category: subCat,
              resource_id: matchedResource.id,
              resource_name: matchedResource.display_name || matchedResource.name,
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
        // Force owner_contact_id to the buyer
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

        // Add to equipmentDetails
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

        // Auto-add to coverage types if not already there
        if (data.asset_type_id && !coveredResourceIds.has(data.asset_type_id) && matchedResource) {
          const subCat = matchedResource.sub_category || 'Other';
          const newCoverage: CoverageTypeItem = {
            id: crypto.randomUUID(),
            sub_category: subCat,
            resource_id: matchedResource.id,
            resource_name: matchedResource.display_name || matchedResource.name,
          };
          onCoverageTypesChange([...coverageTypes, newCoverage]);
        }

        setIsDrawerOpen(false);
      } catch {
        // Toast handled by mutation hook
      }
    },
    [contactId, config, createMutation, filteredResources, currentTenant?.id, equipmentDetails, onEquipmentDetailsChange, coveredResourceIds, coverageTypes, onCoverageTypesChange]
  );

  // ── Add coverage type manually ─────────────────────────────────────
  const handleAddCoverageType = useCallback(() => {
    if (!coverageSubCat || !coverageResourceId) return;
    const resource = filteredResources.find((r) => r.id === coverageResourceId);
    if (!resource) return;

    const newCoverage: CoverageTypeItem = {
      id: crypto.randomUUID(),
      sub_category: coverageSubCat,
      resource_id: resource.id,
      resource_name: resource.display_name || resource.name,
    };
    onCoverageTypesChange([...coverageTypes, newCoverage]);
    setCoverageResourceId('');
    // Keep sub_category selected for easy batch adding
  }, [coverageSubCat, coverageResourceId, filteredResources, coverageTypes, onCoverageTypesChange]);

  const handleRemoveCoverageType = useCallback(
    (id: string) => {
      onCoverageTypesChange(coverageTypes.filter((c) => c.id !== id));
    },
    [coverageTypes, onCoverageTypesChange]
  );

  // ── Render ─────────────────────────────────────────────────────────

  const totalAssetCount = allClientAssets.length;
  const selectedCount = equipmentDetails.length;

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ minHeight: 480 }}>

      {/* ── SECTION 1: Mandatory Coverage Types ───────────────────── */}
      <div
        className="px-6 py-4 border-b"
        style={{ borderColor: colors.utility.primaryText + '12' }}
      >
        <div className="flex items-center gap-2 mb-3">
          <div
            className="w-6 h-6 rounded-md flex items-center justify-center"
            style={{ backgroundColor: coverageTypes.length > 0 ? '#10b98112' : '#f59e0b12' }}
          >
            {coverageTypes.length > 0
              ? <CheckCircle2 size={14} style={{ color: '#10b981' }} />
              : <AlertTriangle size={14} style={{ color: '#f59e0b' }} />
            }
          </div>
          <h3 className="text-sm font-bold" style={{ color: colors.utility.primaryText }}>
            Coverage Types
            <span className="text-red-500 ml-1">*</span>
          </h3>
          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full ml-auto" style={{
            backgroundColor: coverageTypes.length > 0 ? '#10b98112' : '#f59e0b12',
            color: coverageTypes.length > 0 ? '#10b981' : '#f59e0b',
          }}>
            {coverageTypes.length > 0 ? `${coverageTypes.length} type${coverageTypes.length > 1 ? 's' : ''} selected` : 'Required'}
          </span>
        </div>
        <p className="text-xs mb-3" style={{ color: colors.utility.secondaryText }}>
          Define the {config.label.toLowerCase()} types this contract will cover. Specific {config.label.toLowerCase()} can be attached later, but coverage types are required.
        </p>

        {/* Coverage type chips */}
        {coverageTypes.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {coverageTypes.map((ct) => {
              const scConfig = getSubCategoryConfig(ct.sub_category);
              const chipColor = scConfig?.color || colors.brand.primary;
              return (
                <div
                  key={ct.id}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border"
                  style={{
                    borderColor: chipColor + '30',
                    backgroundColor: chipColor + '08',
                    color: chipColor,
                  }}
                >
                  <span>{ct.sub_category}</span>
                  <span style={{ opacity: 0.4 }}>&rsaquo;</span>
                  <span style={{ color: colors.utility.primaryText }}>{ct.resource_name}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveCoverageType(ct.id)}
                    className="ml-1 p-0.5 rounded-full transition-colors hover:opacity-70"
                    style={{ color: chipColor }}
                  >
                    <X size={12} />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Add coverage type inline form */}
        <div className="flex items-end gap-2">
          <div className="flex-1 min-w-0">
            <label className="text-[10px] font-semibold uppercase tracking-wider mb-1 block" style={{ color: colors.utility.secondaryText }}>
              Category
            </label>
            <select
              value={coverageSubCat}
              onChange={(e) => { setCoverageSubCat(e.target.value); setCoverageResourceId(''); }}
              className="w-full rounded-md border px-2.5 py-2 text-xs"
              style={{
                borderColor: colors.utility.primaryText + '20',
                backgroundColor: colors.utility.primaryBackground,
                color: colors.utility.primaryText,
              }}
            >
              <option value="">Select category...</option>
              {subCategories.map((sc) => (
                <option key={sc} value={sc}>{sc}</option>
              ))}
            </select>
          </div>
          <div className="flex-1 min-w-0">
            <label className="text-[10px] font-semibold uppercase tracking-wider mb-1 block" style={{ color: colors.utility.secondaryText }}>
              {config.label} Type
            </label>
            <select
              value={coverageResourceId}
              onChange={(e) => setCoverageResourceId(e.target.value)}
              disabled={!coverageSubCat}
              className="w-full rounded-md border px-2.5 py-2 text-xs disabled:opacity-50"
              style={{
                borderColor: colors.utility.primaryText + '20',
                backgroundColor: colors.utility.primaryBackground,
                color: colors.utility.primaryText,
              }}
            >
              <option value="">Select type...</option>
              {coverageFilteredResources.map((r) => (
                <option key={r.id} value={r.id}>{r.display_name || r.name}</option>
              ))}
            </select>
          </div>
          <Button
            onClick={handleAddCoverageType}
            disabled={!coverageSubCat || !coverageResourceId}
            size="sm"
            className="text-xs transition-colors hover:opacity-90 flex-shrink-0"
            style={{
              background: (!coverageSubCat || !coverageResourceId)
                ? colors.utility.primaryText + '15'
                : `linear-gradient(135deg, ${colors.brand.primary}, ${colors.brand.secondary || colors.brand.primary})`,
              color: (!coverageSubCat || !coverageResourceId) ? colors.utility.secondaryText : '#FFFFFF',
            }}
          >
            <Plus className="mr-1 h-3.5 w-3.5" />
            Add
          </Button>
        </div>
      </div>

      {/* ── "Let Buyer Add" info card (when toggled on) ───────────── */}
      {allowBuyerToAdd && (
        <div
          className="mx-6 mt-4 rounded-xl border p-4"
          style={{
            borderColor: colors.brand.primary + '25',
            backgroundColor: colors.brand.primary + '04',
          }}
        >
          <div className="flex items-start gap-3">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: colors.brand.primary + '12' }}
            >
              <UserPlus size={20} style={{ color: colors.brand.primary }} />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-bold mb-1" style={{ color: colors.utility.primaryText }}>
                Buyer Will Add {config.label}
              </h4>
              <p className="text-xs leading-relaxed" style={{ color: colors.utility.secondaryText }}>
                {buyerName || 'The buyer'} will be able to add their {config.label.toLowerCase()} once the CNAK (Contract Acknowledgement) is claimed, or during the contract review stage. They can attach specific {config.label.toLowerCase()} details at that time.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onAllowBuyerToAddChange(false)}
              className="p-1.5 rounded-lg transition-colors hover:opacity-70 flex-shrink-0"
              style={{ color: colors.utility.secondaryText }}
              title="Remove this option"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>
      )}

      {/* ── Toolbar ───────────────────────────────────────────────── */}
      <div
        className="flex items-center justify-between px-6 py-3 border-b flex-wrap gap-3"
        style={{ borderColor: colors.utility.primaryText + '12' }}
      >
        <div className="flex items-center gap-3">
          <span className="text-sm" style={{ color: colors.utility.secondaryText }}>
            <strong style={{ color: colors.utility.primaryText, fontWeight: 700 }}>
              {selectedCount}
            </strong>
            {' '}selected
          </span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Let Buyer Add toggle (only show button when NOT already active) */}
          {!allowBuyerToAdd && (
            <button
              type="button"
              onClick={() => onAllowBuyerToAddChange(true)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-all border"
              style={{
                borderColor: colors.utility.primaryText + '20',
                backgroundColor: 'transparent',
                color: colors.utility.secondaryText,
              }}
            >
              <UserPlus size={14} />
              Let Buyer Add {config.label}
            </button>
          )}

          {/* Add Equipment button */}
          <Button
            onClick={() => setIsDrawerOpen(true)}
            size="sm"
            className="text-sm transition-colors hover:opacity-90"
            style={{
              background: `linear-gradient(135deg, ${colors.brand.primary}, ${colors.brand.secondary || colors.brand.primary})`,
              color: '#FFFFFF',
            }}
          >
            <Plus className="mr-1.5 h-4 w-4" />
            {config.addLabel}
          </Button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* ── Left Sidebar: Sub-Category Navigation ─────────────── */}
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
              className="text-[10px] font-bold uppercase tracking-widest mb-2"
              style={{ color: colors.utility.secondaryText }}
            >
              {config.label} Categories
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

          {/* Category List */}
          <div className="flex-1 overflow-y-auto p-2">
            {categoriesLoading ? (
              <div className="flex items-center justify-center py-8">
                <VaNiLoader size="sm" message="Loading..." />
              </div>
            ) : (
              <>
                {/* All items */}
                {!sidebarSearch.trim() && (
                  <button
                    onClick={() => setSelectedSubCategory(null)}
                    className={cn(
                      'w-full flex items-center gap-2 px-3 py-2 rounded-lg mb-0.5 transition-all text-left'
                    )}
                    style={{
                      backgroundColor: selectedSubCategory === null ? colors.brand.primary + '12' : 'transparent',
                    }}
                  >
                    <div
                      className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0"
                      style={{
                        backgroundColor: selectedSubCategory === null
                          ? colors.brand.primary + '18'
                          : colors.utility.primaryText + '08',
                      }}
                    >
                      <Layers
                        size={14}
                        style={{
                          color: selectedSubCategory === null
                            ? colors.brand.primary
                            : colors.utility.secondaryText,
                        }}
                      />
                    </div>
                    <span
                      className="text-xs font-semibold truncate flex-1"
                      style={{
                        color: selectedSubCategory === null
                          ? colors.brand.primary
                          : colors.utility.primaryText,
                      }}
                    >
                      All {config.label}
                    </span>
                    <span
                      className="text-[10px] font-medium px-1.5 py-0.5 rounded-full"
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
                  const scConfig = getSubCategoryConfig(subCat);
                  const SubCatIcon = scConfig?.icon || Package;
                  const iconColor = scConfig?.color || '#6B7280';
                  const count = subCategoryAssetCounts[subCat] || 0;

                  return (
                    <button
                      key={subCat}
                      onClick={() => setSelectedSubCategory(subCat)}
                      className={cn(
                        'w-full flex items-center gap-2 px-3 py-2 rounded-lg mb-0.5 transition-all text-left'
                      )}
                      style={{
                        backgroundColor: isActive ? colors.brand.primary + '12' : 'transparent',
                      }}
                    >
                      <div
                        className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: iconColor + '15' }}
                      >
                        <SubCatIcon size={14} style={{ color: iconColor }} />
                      </div>
                      <span
                        className="text-xs font-semibold truncate flex-1"
                        style={{
                          color: isActive ? colors.brand.primary : colors.utility.primaryText,
                        }}
                      >
                        {subCat}
                      </span>
                      {count > 0 && (
                        <span
                          className="text-[10px] font-medium px-1.5 py-0.5 rounded-full"
                          style={{ backgroundColor: iconColor + '12', color: iconColor }}
                        >
                          {count}
                        </span>
                      )}
                    </button>
                  );
                })}

                {filteredSubCategories.length === 0 && subCategories.length > 0 && (
                  <div className="p-3 text-center text-xs" style={{ color: colors.utility.secondaryText }}>
                    No matching categories
                  </div>
                )}
                {subCategories.length === 0 && !categoriesLoading && (
                  <div className="p-3 text-center text-xs" style={{ color: colors.utility.secondaryText }}>
                    No categories configured
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* ── Main Content: Search + Grid ──────────────────────── */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {/* Search bar */}
          <div className="flex items-center gap-3 mb-4">
            <div className="relative flex-1 max-w-sm">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5"
                style={{ color: colors.utility.secondaryText }}
              />
              <Input
                placeholder={`Search ${config.label.toLowerCase()}...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-9 text-sm"
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
                  <X className="h-3.5 w-3.5" style={{ color: colors.utility.secondaryText }} />
                </button>
              )}
            </div>
            <span className="text-xs" style={{ color: colors.utility.secondaryText }}>
              <strong style={{ color: colors.utility.primaryText }}>{displayAssets.length}</strong> items
              {selectedSubCategory && (
                <> in <strong style={{ color: colors.utility.primaryText }}>{selectedSubCategory}</strong></>
              )}
            </span>
          </div>

          {/* Grid */}
          {assetsLoading ? (
            <div className="flex items-center justify-center py-16">
              <VaNiLoader size="sm" message={`Loading ${config.label.toLowerCase()}...`} />
            </div>
          ) : !contactId ? (
            <div className="text-center py-16">
              <p className="text-sm" style={{ color: colors.utility.secondaryText }}>
                Select a counterparty first to see their {config.label.toLowerCase()}.
              </p>
            </div>
          ) : displayAssets.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {displayAssets.map((asset) => (
                <EquipmentCard
                  key={asset.id}
                  asset={asset}
                  selectable
                  isSelected={selectedRegistryIds.has(asset.id)}
                  onToggle={handleToggle}
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
              <p className="text-sm mb-3" style={{ color: colors.utility.secondaryText }}>
                No {config.label.toLowerCase()} matching &ldquo;{searchQuery}&rdquo;
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
            /* Empty state — no assets registered for this client */
            <div className="text-center py-16 px-6">
              <div className="flex justify-center mb-6">
                <div
                  className="w-20 h-20 rounded-2xl flex items-center justify-center"
                  style={{ backgroundColor: colors.brand.primary + '12' }}
                >
                  <Package size={36} style={{ color: colors.brand.primary, opacity: 0.7 }} />
                </div>
              </div>
              <h2 className="text-xl font-bold mb-2" style={{ color: colors.utility.primaryText }}>
                No {config.label.toLowerCase()} registered for this client
              </h2>
              <p className="text-sm max-w-md mx-auto mb-7 leading-relaxed" style={{ color: colors.utility.secondaryText }}>
                Add {config.label.toLowerCase()} to track what this contract covers, or let the buyer add their own.
                You can still proceed as long as coverage types are defined above.
              </p>
              <Button
                onClick={() => setIsDrawerOpen(true)}
                className="transition-colors hover:opacity-90"
                style={{
                  background: `linear-gradient(to right, ${colors.brand.primary}, ${colors.brand.secondary || colors.brand.primary})`,
                  color: '#FFFFFF',
                }}
              >
                <Plus className="mr-1.5 h-4 w-4" />
                {config.addLabel}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* ── EquipmentFormDialog Drawer ──────────────────────────── */}
      <EquipmentFormDialog
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        mode="create"
        defaultSubCategory={selectedSubCategory}
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
