// src/components/contracts/ContractWizard/steps/AssetSelectionStep.tsx
// Equipment / Entity selection for the Contract Wizard — Guided Coverage-First UX
// Phase 1: "What does this contract cover?" — pick coverage types (mandatory)
// Phase 2: "Attach specific equipment" — optional, 4 choices

import React, { useState, useMemo, useCallback } from 'react';
import {
  Plus, Search, X, Layers, Package, UserPlus,
  Trash2, CheckCircle2, ChevronDown, ChevronRight,
  Clock, ListChecks, PackagePlus,
} from 'lucide-react';
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

// Attachment mode
type AttachmentMode = 'existing' | 'buyer' | 'later' | null;

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
  const [expandedSubCategory, setExpandedSubCategory] = useState<string | null>(null);
  const [attachmentMode, setAttachmentMode] = useState<AttachmentMode>(
    // Auto-detect initial mode from existing state
    allowBuyerToAdd ? 'buyer' : (equipmentDetails.length > 0 ? 'existing' : null)
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [gridFilterSubCat, setGridFilterSubCat] = useState<string | null>(null);

  // Create mutation
  const createMutation = useCreateClientAsset();

  // ── Derived lookups ────────────────────────────────────────────────
  const selectedRegistryIds = useMemo(() => {
    return new Set(equipmentDetails.map((d) => d.asset_registry_id).filter(Boolean) as string[]);
  }, [equipmentDetails]);

  const coveredResourceIds = useMemo(() => {
    return new Set(coverageTypes.map((c) => c.resource_id));
  }, [coverageTypes]);

  // Coverage counts per sub-category
  const coverageCountBySubCat = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const ct of coverageTypes) {
      counts[ct.sub_category] = (counts[ct.sub_category] || 0) + 1;
    }
    return counts;
  }, [coverageTypes]);

  // ── Filtered assets for grid ───────────────────────────────────────
  const displayAssets = useMemo(() => {
    let filtered = allClientAssets;

    if (gridFilterSubCat) {
      const resourceIdsInSubCat = new Set(
        (resourcesBySubCategory.get(gridFilterSubCat) || []).map((r) => r.id)
      );
      filtered = filtered.filter((a) => resourceIdsInSubCat.has(a.asset_type_id || ''));
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
  }, [allClientAssets, gridFilterSubCat, resourcesBySubCategory, searchQuery]);

  // Sub-category asset counts (for grid sidebar)
  const subCategoryAssetCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const asset of allClientAssets) {
      const subCat = resourceIdToSubCategory.get(asset.asset_type_id || '') || 'Other';
      counts[subCat] = (counts[subCat] || 0) + 1;
    }
    return counts;
  }, [allClientAssets, resourceIdToSubCategory]);

  // ── Coverage type toggle ───────────────────────────────────────────
  const toggleCoverageType = useCallback(
    (resource: Resource) => {
      const subCat = resource.sub_category || 'Other';
      if (coveredResourceIds.has(resource.id)) {
        // Remove
        onCoverageTypesChange(coverageTypes.filter((c) => c.resource_id !== resource.id));
      } else {
        // Add
        const newCoverage: CoverageTypeItem = {
          id: crypto.randomUUID(),
          sub_category: subCat,
          resource_id: resource.id,
          resource_name: resource.display_name || resource.name,
        };
        onCoverageTypesChange([...coverageTypes, newCoverage]);
      }
    },
    [coveredResourceIds, coverageTypes, onCoverageTypesChange]
  );

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

        // Auto-add to coverage types
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
        // Auto-switch to existing mode after creating
        setAttachmentMode('existing');
      } catch {
        // Toast handled by mutation hook
      }
    },
    [contactId, config, createMutation, filteredResources, currentTenant?.id, equipmentDetails, onEquipmentDetailsChange, coveredResourceIds, coverageTypes, onCoverageTypesChange]
  );

  // ── Attachment mode handlers ───────────────────────────────────────
  const handleAttachmentModeChange = useCallback((mode: AttachmentMode) => {
    setAttachmentMode(mode);
    if (mode === 'buyer') {
      onAllowBuyerToAddChange(true);
    } else if (attachmentMode === 'buyer' && mode !== 'buyer') {
      onAllowBuyerToAddChange(false);
    }
  }, [attachmentMode, onAllowBuyerToAddChange]);

  // ── Render ─────────────────────────────────────────────────────────

  const totalCoverageCount = coverageTypes.length;
  const hasCoverage = totalCoverageCount > 0;

  // ── Glassmorphic style (matches /contacts pattern) ─────────────────
  const glassStyle: React.CSSProperties = {
    background: isDarkMode ? 'rgba(30, 41, 59, 0.8)' : 'rgba(255, 255, 255, 0.8)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.5)',
    boxShadow: '0 4px 20px -5px rgba(0,0,0,0.1)',
  };

  const glassCardStyle = (hasAccent: boolean, accentColor: string): React.CSSProperties => ({
    ...glassStyle,
    borderColor: hasAccent
      ? (isDarkMode ? accentColor + '40' : accentColor + '30')
      : (isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.5)'),
    boxShadow: hasAccent
      ? `0 4px 20px -5px ${accentColor}15`
      : '0 4px 20px -5px rgba(0,0,0,0.1)',
  });

  return (
    <div className="flex flex-col h-full overflow-y-auto">

      {/* ═══════════════════════════════════════════════════════════════
          PHASE 1: "What does this contract cover?"
          ═══════════════════════════════════════════════════════════════ */}
      <div className="px-6 pt-5 pb-4">
        <div className="flex items-center gap-3 mb-1">
          <h2 className="text-base font-bold" style={{ color: colors.utility.primaryText }}>
            What does this contract cover?
          </h2>
          {hasCoverage && (
            <span
              className="text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={{ backgroundColor: '#10b98115', color: '#10b981' }}
            >
              {totalCoverageCount} type{totalCoverageCount > 1 ? 's' : ''} selected
            </span>
          )}
        </div>
        <p className="text-xs mb-5" style={{ color: colors.utility.secondaryText }}>
          Select the {config.label.toLowerCase()} types this contract will service. Specific {config.label.toLowerCase()} can be attached later.
        </p>

        {/* Loading state */}
        {categoriesLoading ? (
          <div className="flex items-center justify-center py-8">
            <VaNiLoader size="sm" message="Loading categories..." />
          </div>
        ) : subCategories.length === 0 ? (
          <div
            className="rounded-lg border p-6 text-center"
            style={{ borderColor: colors.utility.primaryText + '15', backgroundColor: colors.utility.secondaryBackground }}
          >
            <p className="text-sm" style={{ color: colors.utility.secondaryText }}>
              No {config.label.toLowerCase()} categories configured. Add them in Settings &rarr; Resources.
            </p>
          </div>
        ) : (
          /* Sub-category cards grid */
          <div className="space-y-2">
            {subCategories.map((subCat) => {
              const scConfig = getSubCategoryConfig(subCat);
              const SubCatIcon = scConfig?.icon || Package;
              const iconColor = scConfig?.color || '#6B7280';
              const isExpanded = expandedSubCategory === subCat;
              const resourcesInCat = resourcesBySubCategory.get(subCat) || [];
              const selectedInCat = coverageCountBySubCat[subCat] || 0;
              const totalInCat = resourcesInCat.length;

              return (
                <div
                  key={subCat}
                  className="rounded-2xl border overflow-hidden transition-all shadow-sm"
                  style={glassCardStyle(selectedInCat > 0, iconColor)}
                >
                  {/* Card header — clickable */}
                  <button
                    type="button"
                    onClick={() => setExpandedSubCategory(isExpanded ? null : subCat)}
                    className="w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors hover:opacity-90"
                  >
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: iconColor + '15' }}
                    >
                      <SubCatIcon size={18} style={{ color: iconColor }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-semibold block" style={{ color: colors.utility.primaryText }}>
                        {subCat}
                      </span>
                      <span className="text-[11px]" style={{ color: colors.utility.secondaryText }}>
                        {totalInCat} type{totalInCat > 1 ? 's' : ''} available
                      </span>
                    </div>
                    {selectedInCat > 0 && (
                      <span
                        className="text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1"
                        style={{ backgroundColor: iconColor + '15', color: iconColor }}
                      >
                        <CheckCircle2 size={11} />
                        {selectedInCat}
                      </span>
                    )}
                    {isExpanded
                      ? <ChevronDown size={16} style={{ color: colors.utility.secondaryText }} />
                      : <ChevronRight size={16} style={{ color: colors.utility.secondaryText }} />
                    }
                  </button>

                  {/* Expanded: equipment type chips */}
                  {isExpanded && (
                    <div
                      className="px-4 pb-4 pt-1 border-t"
                      style={{ borderColor: colors.utility.primaryText + '08' }}
                    >
                      <p className="text-[11px] mb-3" style={{ color: colors.utility.secondaryText }}>
                        Select the types you&apos;ll service under {subCat}:
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {resourcesInCat.map((resource) => {
                          const isSelected = coveredResourceIds.has(resource.id);
                          return (
                            <button
                              key={resource.id}
                              type="button"
                              onClick={() => toggleCoverageType(resource)}
                              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all border"
                              style={{
                                borderColor: isSelected ? iconColor + '50' : colors.utility.primaryText + '15',
                                backgroundColor: isSelected ? iconColor + '12' : 'transparent',
                                color: isSelected ? iconColor : colors.utility.secondaryText,
                              }}
                            >
                              {isSelected && <CheckCircle2 size={13} />}
                              {resource.display_name || resource.name}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          PHASE 2: "Attach specific equipment" — only shows after types picked
          ═══════════════════════════════════════════════════════════════ */}
      {hasCoverage && (
        <div className="px-6 pb-5">
          <div
            className="border-t pt-5 mt-1"
            style={{ borderColor: colors.utility.primaryText + '10' }}
          >
            <h2 className="text-base font-bold mb-1" style={{ color: colors.utility.primaryText }}>
              Attach specific {config.label.toLowerCase()}?
            </h2>
            <p className="text-xs mb-4" style={{ color: colors.utility.secondaryText }}>
              Coverage types are captured. Now choose how to handle specific {config.label.toLowerCase()} details.
            </p>

            {/* Option cards — 2x2 grid */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              {/* Option 1: Select from existing */}
              <OptionCard
                icon={<ListChecks size={20} />}
                title="Select Existing"
                description={`Pick from ${allClientAssets.length} registered ${config.label.toLowerCase()}`}
                isSelected={attachmentMode === 'existing'}
                onClick={() => handleAttachmentModeChange('existing')}
                colors={colors}
                accentColor={colors.brand.primary}
                badge={equipmentDetails.length > 0 ? `${equipmentDetails.length} selected` : undefined}
                isDarkMode={isDarkMode}
              />

              {/* Option 2: Add new equipment */}
              <OptionCard
                icon={<PackagePlus size={20} />}
                title={config.addLabel}
                description={`Register and attach new ${config.label.toLowerCase()}`}
                isSelected={false}
                onClick={() => setIsDrawerOpen(true)}
                colors={colors}
                accentColor="#8B5CF6"
                isDarkMode={isDarkMode}
              />

              {/* Option 3: Let buyer add */}
              <OptionCard
                icon={<UserPlus size={20} />}
                title="Buyer Will Add"
                description="Buyer adds after CNAK claim or review"
                isSelected={attachmentMode === 'buyer'}
                onClick={() => handleAttachmentModeChange(attachmentMode === 'buyer' ? null : 'buyer')}
                colors={colors}
                accentColor="#0EA5E9"
                badge={allowBuyerToAdd ? 'Active' : undefined}
                isDarkMode={isDarkMode}
              />

              {/* Option 4: Attach later */}
              <OptionCard
                icon={<Clock size={20} />}
                title="Attach Later"
                description="Skip for now, add details after creation"
                isSelected={attachmentMode === 'later'}
                onClick={() => handleAttachmentModeChange(attachmentMode === 'later' ? null : 'later')}
                colors={colors}
                accentColor="#6B7280"
                isDarkMode={isDarkMode}
              />
            </div>

            {/* ── Expanded content based on selected mode ──────────── */}

            {/* MODE: Buyer will add — info card */}
            {attachmentMode === 'buyer' && (
              <div
                className="rounded-2xl border p-4 mb-4 shadow-sm"
                style={glassCardStyle(true, '#0EA5E9')}
              >
                <div className="flex items-start gap-3">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: '#0EA5E9' + '12' }}
                  >
                    <UserPlus size={20} style={{ color: '#0EA5E9' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-bold mb-1" style={{ color: colors.utility.primaryText }}>
                      Buyer Will Add {config.label}
                    </h4>
                    <p className="text-xs leading-relaxed" style={{ color: colors.utility.secondaryText }}>
                      <strong>{buyerName || 'The buyer'}</strong> will be able to add their {config.label.toLowerCase()} once
                      the CNAK (Contract Acknowledgement) is claimed, or during the contract review stage.
                      They can attach specific {config.label.toLowerCase()} details at that time.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleAttachmentModeChange(null)}
                    className="p-1.5 rounded-lg transition-colors hover:opacity-70 flex-shrink-0"
                    style={{ color: colors.utility.secondaryText }}
                    title="Remove this option"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            )}

            {/* MODE: Attach later — info card */}
            {attachmentMode === 'later' && (
              <div
                className="rounded-2xl border p-4 mb-4 shadow-sm"
                style={glassCardStyle(true, '#6B7280')}
              >
                <div className="flex items-start gap-3">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: '#6B7280' + '12' }}
                  >
                    <Clock size={20} style={{ color: '#6B7280' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-bold mb-1" style={{ color: colors.utility.primaryText }}>
                      Attach {config.label} Later
                    </h4>
                    <p className="text-xs leading-relaxed" style={{ color: colors.utility.secondaryText }}>
                      Coverage types have been captured. You can attach specific {config.label.toLowerCase()} details
                      after the contract is created — either from the contract detail page or during the review stage.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleAttachmentModeChange(null)}
                    className="p-1.5 rounded-lg transition-colors hover:opacity-70 flex-shrink-0"
                    style={{ color: colors.utility.secondaryText }}
                    title="Dismiss"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>
            )}

            {/* MODE: Select existing — sidebar + grid */}
            {attachmentMode === 'existing' && (
              <div
                className="rounded-2xl border overflow-hidden shadow-sm"
                style={{ ...glassStyle, minHeight: 360 }}
              >
                <div className="flex" style={{ height: 400 }}>
                  {/* Sidebar */}
                  <div
                    className="w-[200px] min-w-[200px] border-r flex flex-col overflow-hidden"
                    style={{
                      backgroundColor: colors.utility.secondaryBackground,
                      borderColor: colors.utility.primaryText + '10',
                    }}
                  >
                    <div className="flex-1 overflow-y-auto p-2">
                      {/* All items */}
                      <button
                        onClick={() => setGridFilterSubCat(null)}
                        className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg mb-0.5 transition-all text-left"
                        style={{
                          backgroundColor: gridFilterSubCat === null ? colors.brand.primary + '12' : 'transparent',
                        }}
                      >
                        <Layers size={13} style={{
                          color: gridFilterSubCat === null ? colors.brand.primary : colors.utility.secondaryText,
                        }} />
                        <span
                          className="text-xs font-semibold truncate flex-1"
                          style={{
                            color: gridFilterSubCat === null ? colors.brand.primary : colors.utility.primaryText,
                          }}
                        >
                          All
                        </span>
                        <span className="text-[10px]" style={{ color: colors.utility.secondaryText }}>
                          {allClientAssets.length}
                        </span>
                      </button>

                      {subCategories.map((subCat) => {
                        const isActive = gridFilterSubCat === subCat;
                        const scConfig = getSubCategoryConfig(subCat);
                        const SubCatIcon = scConfig?.icon || Package;
                        const iconColor = scConfig?.color || '#6B7280';
                        const count = subCategoryAssetCounts[subCat] || 0;
                        if (count === 0) return null;

                        return (
                          <button
                            key={subCat}
                            onClick={() => setGridFilterSubCat(subCat)}
                            className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg mb-0.5 transition-all text-left"
                            style={{
                              backgroundColor: isActive ? colors.brand.primary + '12' : 'transparent',
                            }}
                          >
                            <SubCatIcon size={13} style={{ color: isActive ? colors.brand.primary : iconColor }} />
                            <span
                              className="text-xs font-semibold truncate flex-1"
                              style={{ color: isActive ? colors.brand.primary : colors.utility.primaryText }}
                            >
                              {subCat}
                            </span>
                            <span className="text-[10px]" style={{ color: colors.utility.secondaryText }}>
                              {count}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Grid area */}
                  <div className="flex-1 overflow-y-auto px-4 py-3">
                    {/* Search + count */}
                    <div className="flex items-center gap-2 mb-3">
                      <div className="relative flex-1 max-w-xs">
                        <Search
                          className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5"
                          style={{ color: colors.utility.secondaryText }}
                        />
                        <Input
                          placeholder={`Search...`}
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-8 pr-8 text-xs h-8"
                          style={{
                            borderColor: colors.utility.primaryText + '20',
                            backgroundColor: colors.utility.primaryBackground,
                            color: colors.utility.primaryText,
                          }}
                        />
                        {searchQuery && (
                          <button onClick={() => setSearchQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2">
                            <X className="h-3 w-3" style={{ color: colors.utility.secondaryText }} />
                          </button>
                        )}
                      </div>
                      <span className="text-[11px] ml-auto" style={{ color: colors.utility.secondaryText }}>
                        <strong>{equipmentDetails.length}</strong> selected of <strong>{displayAssets.length}</strong>
                      </span>
                    </div>

                    {/* Asset grid */}
                    {assetsLoading ? (
                      <div className="flex items-center justify-center py-12">
                        <VaNiLoader size="sm" message="Loading..." />
                      </div>
                    ) : displayAssets.length > 0 ? (
                      <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
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
                    ) : (
                      <div className="text-center py-12">
                        <Package size={28} style={{ color: colors.utility.secondaryText, opacity: 0.4, margin: '0 auto 8px' }} />
                        <p className="text-xs" style={{ color: colors.utility.secondaryText }}>
                          {searchQuery
                            ? `No ${config.label.toLowerCase()} matching "${searchQuery}"`
                            : `No ${config.label.toLowerCase()} registered for this client`
                          }
                        </p>
                        {!searchQuery && (
                          <Button
                            onClick={() => setIsDrawerOpen(true)}
                            size="sm"
                            className="mt-3 text-xs"
                            style={{
                              background: `linear-gradient(135deg, ${colors.brand.primary}, ${colors.brand.secondary || colors.brand.primary})`,
                              color: '#FFFFFF',
                            }}
                          >
                            <Plus className="mr-1 h-3.5 w-3.5" />
                            {config.addLabel}
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Empty state when no coverage yet — gentle prompt */}
      {!hasCoverage && !categoriesLoading && subCategories.length > 0 && (
        <div className="px-6 pb-6">
          <div
            className="rounded-lg border-2 border-dashed p-5 text-center"
            style={{ borderColor: '#f59e0b40' }}
          >
            <p className="text-xs font-medium" style={{ color: '#f59e0b' }}>
              Select at least one {config.label.toLowerCase()} type above to continue
            </p>
          </div>
        </div>
      )}

      {/* ── EquipmentFormDialog Drawer ──────────────────────────── */}
      <EquipmentFormDialog
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        mode="create"
        defaultSubCategory={gridFilterSubCat}
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

// ── Option Card sub-component ────────────────────────────────────────

interface OptionCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  isSelected: boolean;
  onClick: () => void;
  colors: any;
  accentColor: string;
  badge?: string;
  isDarkMode?: boolean;
}

const OptionCard: React.FC<OptionCardProps> = ({
  icon, title, description, isSelected, onClick, colors, accentColor, badge, isDarkMode = false,
}) => (
  <button
    type="button"
    onClick={onClick}
    className="flex items-start gap-3 p-3.5 rounded-2xl border text-left transition-all hover:shadow-lg shadow-sm"
    style={{
      background: isDarkMode ? 'rgba(30, 41, 59, 0.8)' : 'rgba(255, 255, 255, 0.8)',
      backdropFilter: 'blur(10px)',
      WebkitBackdropFilter: 'blur(10px)',
      borderColor: isSelected
        ? (isDarkMode ? accentColor + '50' : accentColor + '40')
        : (isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.5)'),
      boxShadow: isSelected
        ? `0 4px 20px -5px ${accentColor}20`
        : '0 4px 20px -5px rgba(0,0,0,0.08)',
    } as React.CSSProperties}
  >
    <div
      className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
      style={{
        backgroundColor: accentColor + '12',
        color: accentColor,
      }}
    >
      {icon}
    </div>
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2">
        <span className="text-xs font-bold" style={{ color: colors.utility.primaryText }}>
          {title}
        </span>
        {badge && (
          <span
            className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
            style={{ backgroundColor: accentColor + '15', color: accentColor }}
          >
            {badge}
          </span>
        )}
      </div>
      <p className="text-[11px] mt-0.5 leading-snug" style={{ color: colors.utility.secondaryText }}>
        {description}
      </p>
    </div>
  </button>
);

export default AssetSelectionStep;
