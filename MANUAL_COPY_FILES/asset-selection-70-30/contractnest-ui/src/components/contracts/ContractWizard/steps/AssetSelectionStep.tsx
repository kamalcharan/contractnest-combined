// src/components/contracts/ContractWizard/steps/AssetSelectionStep.tsx
// Equipment / Entity selection for the Contract Wizard — Guided Coverage-First UX
// Two-column layout: 70% main content | 30% live status card
// Phase 1: "What does this contract cover?" — pick coverage types (mandatory)
// Phase 2: "Attach specific equipment" — optional, 4 choices

import React, { useState, useMemo, useCallback } from 'react';
import {
  Plus, Search, X, Layers, Package, UserPlus,
  CheckCircle2, ChevronDown, ChevronRight,
  Clock, ListChecks, PackagePlus, Shield, AlertCircle,
  CircleDot, ArrowRight,
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

  // ── Glassmorphic style ─────────────────────────────────────────────
  const glassStyle: React.CSSProperties = {
    background: isDarkMode ? 'rgba(30, 41, 59, 0.8)' : 'rgba(255, 255, 255, 0.8)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.5)',
    boxShadow: '0 4px 20px -5px rgba(0,0,0,0.1)',
  };

  // ── Determine overall status for the right column ──────────────────
  const stepStatus: 'empty' | 'coverage_only' | 'complete' = useMemo(() => {
    if (!hasCoverage) return 'empty';
    if (attachmentMode === 'existing' && equipmentDetails.length > 0) return 'complete';
    if (attachmentMode === 'buyer' || attachmentMode === 'later') return 'complete';
    return 'coverage_only';
  }, [hasCoverage, attachmentMode, equipmentDetails.length]);

  // Group coverage types by sub-category for the status panel
  const coverageBySubCat = useMemo(() => {
    const map = new Map<string, CoverageTypeItem[]>();
    for (const ct of coverageTypes) {
      if (!map.has(ct.sub_category)) map.set(ct.sub_category, []);
      map.get(ct.sub_category)!.push(ct);
    }
    return map;
  }, [coverageTypes]);

  return (
    <div className="flex h-full overflow-hidden">

      {/* ═══════════════════════════════════════════════════════════════
          LEFT COLUMN — 70% — Main content
          ═══════════════════════════════════════════════════════════════ */}
      <div className="flex-1 min-w-0 overflow-y-auto">
        <div className="px-5 pt-5 pb-4">

          {/* ── PHASE 1: Coverage Types ────────────────────────────── */}
          <div className="mb-1">
            <div className="flex items-center gap-2.5 mb-1">
              <div
                className="w-5 h-5 rounded-md flex items-center justify-center"
                style={{ backgroundColor: hasCoverage ? '#10b98115' : `${colors.utility.primaryText}08` }}
              >
                {hasCoverage
                  ? <CheckCircle2 size={12} style={{ color: '#10b981' }} />
                  : <CircleDot size={12} style={{ color: colors.utility.secondaryText }} />
                }
              </div>
              <h2 className="text-sm font-bold" style={{ color: colors.utility.primaryText }}>
                What does this contract cover?
              </h2>
              {hasCoverage && (
                <span
                  className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                  style={{ backgroundColor: '#10b98115', color: '#10b981' }}
                >
                  {totalCoverageCount} selected
                </span>
              )}
            </div>
            <p className="text-[11px] mb-3 ml-7.5" style={{ color: colors.utility.secondaryText, marginLeft: 30 }}>
              Select {config.label.toLowerCase()} types this contract will service
            </p>
          </div>

          {/* Loading state */}
          {categoriesLoading ? (
            <div className="flex items-center justify-center py-6">
              <VaNiLoader size="sm" message="Loading categories..." />
            </div>
          ) : subCategories.length === 0 ? (
            <div
              className="rounded-lg border p-4 text-center"
              style={{ borderColor: colors.utility.primaryText + '15', backgroundColor: colors.utility.secondaryBackground }}
            >
              <p className="text-xs" style={{ color: colors.utility.secondaryText }}>
                No {config.label.toLowerCase()} categories configured. Add them in Settings &rarr; Resources.
              </p>
            </div>
          ) : (
            /* ── Compact sub-category sections with inline chips ── */
            <div className="space-y-1.5 mb-4">
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
                    className="rounded-xl border overflow-hidden transition-all"
                    style={{
                      borderColor: selectedInCat > 0
                        ? (isDarkMode ? iconColor + '40' : iconColor + '30')
                        : (isDarkMode ? `${colors.utility.primaryText}15` : '#E5E7EB'),
                      backgroundColor: selectedInCat > 0
                        ? (isDarkMode ? iconColor + '08' : iconColor + '04')
                        : 'transparent',
                    }}
                  >
                    {/* Compact header */}
                    <button
                      type="button"
                      onClick={() => setExpandedSubCategory(isExpanded ? null : subCat)}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left transition-colors hover:opacity-90"
                    >
                      <div
                        className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: iconColor + '15' }}
                      >
                        <SubCatIcon size={14} style={{ color: iconColor }} />
                      </div>
                      <span className="text-xs font-semibold flex-1 truncate" style={{ color: colors.utility.primaryText }}>
                        {subCat}
                      </span>
                      <span className="text-[10px]" style={{ color: colors.utility.secondaryText }}>
                        {totalInCat}
                      </span>
                      {selectedInCat > 0 && (
                        <span
                          className="text-[9px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5"
                          style={{ backgroundColor: iconColor + '15', color: iconColor }}
                        >
                          <CheckCircle2 size={9} />
                          {selectedInCat}
                        </span>
                      )}
                      {isExpanded
                        ? <ChevronDown size={14} style={{ color: colors.utility.secondaryText }} />
                        : <ChevronRight size={14} style={{ color: colors.utility.secondaryText }} />
                      }
                    </button>

                    {/* Expanded: resource type chips */}
                    {isExpanded && (
                      <div
                        className="px-3 pb-3 pt-1 border-t"
                        style={{ borderColor: colors.utility.primaryText + '06' }}
                      >
                        <div className="flex flex-wrap gap-1.5">
                          {resourcesInCat.map((resource) => {
                            const isSelected = coveredResourceIds.has(resource.id);
                            return (
                              <button
                                key={resource.id}
                                type="button"
                                onClick={() => toggleCoverageType(resource)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all border"
                                style={{
                                  borderColor: isSelected ? iconColor + '50' : colors.utility.primaryText + '12',
                                  backgroundColor: isSelected ? iconColor + '12' : 'transparent',
                                  color: isSelected ? iconColor : colors.utility.secondaryText,
                                }}
                              >
                                {isSelected && <CheckCircle2 size={11} />}
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

          {/* ── PHASE 2: Attach specific equipment ─────────────────── */}
          {hasCoverage && (
            <div className="mt-1">
              <div
                className="border-t pt-4"
                style={{ borderColor: colors.utility.primaryText + '08' }}
              >
                <div className="flex items-center gap-2.5 mb-1">
                  <div
                    className="w-5 h-5 rounded-md flex items-center justify-center"
                    style={{
                      backgroundColor: (attachmentMode && (attachmentMode !== 'existing' || equipmentDetails.length > 0))
                        ? '#10b98115'
                        : `${colors.utility.primaryText}08`,
                    }}
                  >
                    {(attachmentMode && (attachmentMode !== 'existing' || equipmentDetails.length > 0))
                      ? <CheckCircle2 size={12} style={{ color: '#10b981' }} />
                      : <CircleDot size={12} style={{ color: colors.utility.secondaryText }} />
                    }
                  </div>
                  <h2 className="text-sm font-bold" style={{ color: colors.utility.primaryText }}>
                    Attach specific {config.label.toLowerCase()}?
                  </h2>
                </div>
                <p className="text-[11px] mb-3" style={{ color: colors.utility.secondaryText, marginLeft: 30 }}>
                  Choose how to handle specific {config.label.toLowerCase()} details
                </p>

                {/* ── Option pills — horizontal strip ──────────────── */}
                <div className="flex flex-wrap gap-2 mb-4">
                  <OptionPill
                    icon={<ListChecks size={14} />}
                    label="Select Existing"
                    isSelected={attachmentMode === 'existing'}
                    onClick={() => handleAttachmentModeChange('existing')}
                    accentColor={colors.brand.primary}
                    colors={colors}
                    isDarkMode={isDarkMode}
                    badge={equipmentDetails.length > 0 ? `${equipmentDetails.length}` : undefined}
                  />
                  <OptionPill
                    icon={<PackagePlus size={14} />}
                    label={config.addLabel}
                    isSelected={false}
                    onClick={() => setIsDrawerOpen(true)}
                    accentColor="#8B5CF6"
                    colors={colors}
                    isDarkMode={isDarkMode}
                  />
                  <OptionPill
                    icon={<UserPlus size={14} />}
                    label="Buyer Will Add"
                    isSelected={attachmentMode === 'buyer'}
                    onClick={() => handleAttachmentModeChange(attachmentMode === 'buyer' ? null : 'buyer')}
                    accentColor="#0EA5E9"
                    colors={colors}
                    isDarkMode={isDarkMode}
                  />
                  <OptionPill
                    icon={<Clock size={14} />}
                    label="Attach Later"
                    isSelected={attachmentMode === 'later'}
                    onClick={() => handleAttachmentModeChange(attachmentMode === 'later' ? null : 'later')}
                    accentColor="#6B7280"
                    colors={colors}
                    isDarkMode={isDarkMode}
                  />
                </div>

                {/* ── MODE: Select existing — sidebar + grid ───────── */}
                {attachmentMode === 'existing' && (
                  <div
                    className="rounded-xl border overflow-hidden"
                    style={{ ...glassStyle, minHeight: 320 }}
                  >
                    <div className="flex" style={{ height: 380 }}>
                      {/* Sidebar */}
                      <div
                        className="w-[180px] min-w-[180px] border-r flex flex-col overflow-hidden"
                        style={{
                          backgroundColor: colors.utility.secondaryBackground,
                          borderColor: colors.utility.primaryText + '10',
                        }}
                      >
                        <div className="flex-1 overflow-y-auto p-1.5">
                          <button
                            onClick={() => setGridFilterSubCat(null)}
                            className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg mb-0.5 transition-all text-left"
                            style={{
                              backgroundColor: gridFilterSubCat === null ? colors.brand.primary + '12' : 'transparent',
                            }}
                          >
                            <Layers size={12} style={{
                              color: gridFilterSubCat === null ? colors.brand.primary : colors.utility.secondaryText,
                            }} />
                            <span
                              className="text-[11px] font-semibold truncate flex-1"
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
                                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg mb-0.5 transition-all text-left"
                                style={{
                                  backgroundColor: isActive ? colors.brand.primary + '12' : 'transparent',
                                }}
                              >
                                <SubCatIcon size={12} style={{ color: isActive ? colors.brand.primary : iconColor }} />
                                <span
                                  className="text-[11px] font-semibold truncate flex-1"
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
                      <div className="flex-1 overflow-y-auto px-3 py-2.5">
                        {/* Search + count */}
                        <div className="flex items-center gap-2 mb-2.5">
                          <div className="relative flex-1 max-w-xs">
                            <Search
                              className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5"
                              style={{ color: colors.utility.secondaryText }}
                            />
                            <Input
                              placeholder={`Search...`}
                              value={searchQuery}
                              onChange={(e) => setSearchQuery(e.target.value)}
                              className="pl-8 pr-8 text-xs h-7"
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
                          <span className="text-[10px] ml-auto" style={{ color: colors.utility.secondaryText }}>
                            <strong>{equipmentDetails.length}</strong> / <strong>{displayAssets.length}</strong>
                          </span>
                        </div>

                        {/* Asset grid */}
                        {assetsLoading ? (
                          <div className="flex items-center justify-center py-10">
                            <VaNiLoader size="sm" message="Loading..." />
                          </div>
                        ) : displayAssets.length > 0 ? (
                          <div className="grid grid-cols-1 xl:grid-cols-2 gap-2.5">
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
                          <div className="text-center py-10">
                            <Package size={24} style={{ color: colors.utility.secondaryText, opacity: 0.4, margin: '0 auto 8px' }} />
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
                                className="mt-2.5 text-xs"
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

          {/* Empty state when no coverage yet */}
          {!hasCoverage && !categoriesLoading && subCategories.length > 0 && (
            <div
              className="rounded-lg border-2 border-dashed p-4 text-center"
              style={{ borderColor: '#f59e0b40' }}
            >
              <p className="text-xs font-medium" style={{ color: '#f59e0b' }}>
                Select at least one {config.label.toLowerCase()} type above to continue
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          RIGHT COLUMN — 30% — Live Status Panel (sticky)
          ═══════════════════════════════════════════════════════════════ */}
      <div
        className="w-[30%] min-w-[240px] max-w-[320px] border-l overflow-y-auto"
        style={{
          borderColor: isDarkMode ? `${colors.utility.primaryText}10` : '#E5E7EB',
          backgroundColor: isDarkMode ? colors.utility.primaryBackground : '#F3F4F6',
        }}
      >
        <div className="p-4 sticky top-0">
          {/* ── Status header card — glassmorphic ─────────────────── */}
          <div
            className="rounded-xl border p-3 mb-4"
            style={{
              background: isDarkMode
                ? stepStatus === 'complete'
                  ? 'linear-gradient(135deg, rgba(16,185,129,0.15) 0%, rgba(16,185,129,0.06) 100%)'
                  : stepStatus === 'coverage_only'
                  ? `linear-gradient(135deg, ${colors.brand.primary}20 0%, ${colors.brand.primary}08 100%)`
                  : 'rgba(30, 41, 59, 0.8)'
                : stepStatus === 'complete'
                  ? 'linear-gradient(135deg, rgba(16,185,129,0.08) 0%, rgba(255,255,255,0.9) 100%)'
                  : stepStatus === 'coverage_only'
                  ? `linear-gradient(135deg, ${colors.brand.primary}10 0%, rgba(255,255,255,0.9) 100%)`
                  : 'rgba(255, 255, 255, 0.9)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              borderColor: stepStatus === 'complete'
                ? (isDarkMode ? '#10b98140' : '#10b98130')
                : stepStatus === 'coverage_only'
                ? (isDarkMode ? `${colors.brand.primary}40` : `${colors.brand.primary}25`)
                : (isDarkMode ? 'rgba(255,255,255,0.1)' : '#E5E7EB'),
              boxShadow: stepStatus !== 'empty'
                ? '0 4px 16px -4px rgba(0,0,0,0.08)'
                : '0 1px 3px rgba(0,0,0,0.04)',
            }}
          >
            <div className="flex items-center gap-2.5">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{
                  backgroundColor: stepStatus === 'complete'
                    ? '#10b98118'
                    : stepStatus === 'coverage_only'
                    ? `${colors.brand.primary}15`
                    : `${colors.utility.primaryText}08`,
                }}
              >
                {stepStatus === 'complete'
                  ? <CheckCircle2 size={16} style={{ color: '#10b981' }} />
                  : stepStatus === 'coverage_only'
                  ? <Shield size={16} style={{ color: colors.brand.primary }} />
                  : <AlertCircle size={16} style={{ color: colors.utility.secondaryText }} />
                }
              </div>
              <div>
                <h3
                  className="text-xs font-bold"
                  style={{
                    color: stepStatus === 'complete'
                      ? '#10b981'
                      : stepStatus === 'coverage_only'
                      ? colors.brand.primary
                      : colors.utility.secondaryText,
                  }}
                >
                  {stepStatus === 'complete'
                    ? 'Step Complete'
                    : stepStatus === 'coverage_only'
                    ? 'Coverage Selected'
                    : 'Pending Selection'
                  }
                </h3>
                <p className="text-[10px]" style={{ color: colors.utility.secondaryText }}>
                  {stepStatus === 'complete'
                    ? 'Ready to proceed'
                    : stepStatus === 'coverage_only'
                    ? 'Choose equipment option'
                    : 'Select coverage types'
                  }
                </p>
              </div>
            </div>
          </div>

          {/* ── Coverage summary ──────────────────────────────────── */}
          {hasCoverage ? (
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: colors.utility.secondaryText }}>
                  Coverage
                </span>
                <span
                  className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                  style={{ backgroundColor: '#10b98118', color: '#10b981' }}
                >
                  {totalCoverageCount} type{totalCoverageCount > 1 ? 's' : ''}
                </span>
              </div>
              <div className="space-y-2">
                {[...coverageBySubCat.entries()].map(([subCat, items]) => {
                  const scConfig = getSubCategoryConfig(subCat);
                  const iconColor = scConfig?.color || '#6B7280';
                  const SubCatIcon = scConfig?.icon || Package;

                  return (
                    <div
                      key={subCat}
                      className="rounded-xl border overflow-hidden"
                      style={{
                        background: isDarkMode
                          ? `linear-gradient(135deg, ${iconColor}12 0%, rgba(30,41,59,0.8) 100%)`
                          : `linear-gradient(135deg, ${iconColor}08 0%, rgba(255,255,255,0.95) 100%)`,
                        backdropFilter: 'blur(12px)',
                        WebkitBackdropFilter: 'blur(12px)',
                        borderColor: isDarkMode ? `${iconColor}35` : `${iconColor}25`,
                        boxShadow: `0 2px 8px -2px ${iconColor}15`,
                      }}
                    >
                      {/* Colored header bar */}
                      <div
                        className="flex items-center gap-1.5 px-2.5 py-1.5"
                        style={{
                          backgroundColor: isDarkMode ? `${iconColor}15` : `${iconColor}10`,
                          borderBottom: `1px solid ${isDarkMode ? `${iconColor}20` : `${iconColor}12`}`,
                        }}
                      >
                        <SubCatIcon size={11} style={{ color: iconColor }} />
                        <span className="text-[10px] font-bold" style={{ color: iconColor }}>
                          {subCat}
                        </span>
                        <span
                          className="text-[9px] font-bold px-1 py-0.5 rounded ml-auto"
                          style={{ backgroundColor: isDarkMode ? `${iconColor}20` : `${iconColor}12`, color: iconColor }}
                        >
                          {items.length}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1 p-2.5">
                        {items.map((ct) => (
                          <span
                            key={ct.id}
                            className="text-[10px] px-1.5 py-0.5 rounded-md font-medium"
                            style={{
                              backgroundColor: isDarkMode ? `${iconColor}18` : `${iconColor}12`,
                              color: iconColor,
                            }}
                          >
                            {ct.resource_name}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* Empty coverage placeholder */
            <div
              className="rounded-xl border-2 border-dashed p-4 text-center mb-4"
              style={{
                borderColor: `${colors.utility.primaryText}15`,
                backgroundColor: isDarkMode ? 'rgba(30,41,59,0.5)' : 'rgba(255,255,255,0.6)',
              }}
            >
              <Shield size={20} style={{ color: colors.utility.secondaryText, opacity: 0.3, margin: '0 auto 6px' }} />
              <p className="text-[10px] font-medium" style={{ color: colors.utility.secondaryText }}>
                No coverage types selected yet
              </p>
              <p className="text-[10px] mt-0.5" style={{ color: colors.utility.secondaryText, opacity: 0.7 }}>
                Select types from the left panel
              </p>
            </div>
          )}

          {/* ── Equipment status card ─────────────────────────────── */}
          {hasCoverage && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: colors.utility.secondaryText }}>
                  {config.label} Details
                </span>
              </div>

              {/* No mode selected yet */}
              {!attachmentMode && (
                <div
                  className="rounded-xl border-2 border-dashed p-3 text-center"
                  style={{
                    borderColor: `${colors.utility.primaryText}15`,
                    backgroundColor: isDarkMode ? 'rgba(30,41,59,0.5)' : 'rgba(255,255,255,0.6)',
                  }}
                >
                  <Package size={18} style={{ color: colors.utility.secondaryText, opacity: 0.3, margin: '0 auto 4px' }} />
                  <p className="text-[10px]" style={{ color: colors.utility.secondaryText }}>
                    Choose how to attach {config.label.toLowerCase()}
                  </p>
                </div>
              )}

              {/* Mode: existing — show selected equipment */}
              {attachmentMode === 'existing' && (
                <div
                  className="rounded-xl border overflow-hidden"
                  style={{
                    background: isDarkMode
                      ? `linear-gradient(135deg, ${colors.brand.primary}12 0%, rgba(30,41,59,0.8) 100%)`
                      : `linear-gradient(135deg, ${colors.brand.primary}06 0%, rgba(255,255,255,0.95) 100%)`,
                    backdropFilter: 'blur(12px)',
                    WebkitBackdropFilter: 'blur(12px)',
                    borderColor: isDarkMode ? `${colors.brand.primary}35` : `${colors.brand.primary}25`,
                    boxShadow: `0 4px 12px -3px ${colors.brand.primary}12`,
                  }}
                >
                  <div
                    className="flex items-center gap-1.5 px-3 py-2"
                    style={{
                      backgroundColor: isDarkMode ? `${colors.brand.primary}15` : `${colors.brand.primary}08`,
                      borderBottom: `1px solid ${isDarkMode ? `${colors.brand.primary}20` : `${colors.brand.primary}12`}`,
                    }}
                  >
                    <ListChecks size={12} style={{ color: colors.brand.primary }} />
                    <span className="text-[10px] font-bold" style={{ color: colors.brand.primary }}>
                      From Registry
                    </span>
                    {equipmentDetails.length > 0 && (
                      <span
                        className="text-[9px] font-bold px-1.5 py-0.5 rounded-full ml-auto"
                        style={{ backgroundColor: `${colors.brand.primary}15`, color: colors.brand.primary }}
                      >
                        {equipmentDetails.length}
                      </span>
                    )}
                  </div>
                  <div className="p-2.5">
                    {equipmentDetails.length > 0 ? (
                      <div className="space-y-1">
                        {equipmentDetails.slice(0, 5).map((d) => (
                          <div
                            key={d.id}
                            className="flex items-center gap-1.5 text-[10px] py-1.5 px-2 rounded-lg"
                            style={{
                              backgroundColor: isDarkMode ? `${colors.utility.primaryText}08` : '#FFFFFF',
                              border: `1px solid ${isDarkMode ? `${colors.utility.primaryText}10` : '#E5E7EB'}`,
                              color: colors.utility.primaryText,
                            }}
                          >
                            <CheckCircle2 size={10} style={{ color: '#10b981' }} className="flex-shrink-0" />
                            <span className="truncate font-medium">{d.item_name}</span>
                          </div>
                        ))}
                        {equipmentDetails.length > 5 && (
                          <p className="text-[10px] text-center pt-0.5" style={{ color: colors.utility.secondaryText }}>
                            +{equipmentDetails.length - 5} more
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="text-[10px] text-center py-2" style={{ color: colors.utility.secondaryText }}>
                        Select items from the grid
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Mode: buyer will add */}
              {attachmentMode === 'buyer' && (
                <div
                  className="rounded-xl border overflow-hidden"
                  style={{
                    background: isDarkMode
                      ? 'linear-gradient(135deg, rgba(14,165,233,0.12) 0%, rgba(30,41,59,0.8) 100%)'
                      : 'linear-gradient(135deg, rgba(14,165,233,0.06) 0%, rgba(255,255,255,0.95) 100%)',
                    backdropFilter: 'blur(12px)',
                    WebkitBackdropFilter: 'blur(12px)',
                    borderColor: isDarkMode ? '#0EA5E940' : '#0EA5E930',
                    boxShadow: '0 4px 12px -3px rgba(14,165,233,0.12)',
                  }}
                >
                  <div
                    className="flex items-center gap-1.5 px-3 py-2"
                    style={{
                      backgroundColor: isDarkMode ? 'rgba(14,165,233,0.15)' : 'rgba(14,165,233,0.08)',
                      borderBottom: `1px solid ${isDarkMode ? 'rgba(14,165,233,0.2)' : 'rgba(14,165,233,0.12)'}`,
                    }}
                  >
                    <UserPlus size={12} style={{ color: '#0EA5E9' }} />
                    <span className="text-[10px] font-bold" style={{ color: '#0EA5E9' }}>
                      Buyer Will Add
                    </span>
                  </div>
                  <div className="p-3">
                    <p className="text-[10px] leading-relaxed mb-2" style={{ color: colors.utility.secondaryText }}>
                      <strong style={{ color: colors.utility.primaryText }}>{buyerName || 'The buyer'}</strong> can add {config.label.toLowerCase()} during review or after claiming CNAK.
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {[...coverageBySubCat.keys()].map((subCat) => {
                        const scConfig = getSubCategoryConfig(subCat);
                        const iconClr = scConfig?.color || '#6B7280';
                        return (
                          <span
                            key={subCat}
                            className="text-[9px] px-1.5 py-0.5 rounded-md font-medium"
                            style={{ backgroundColor: `${iconClr}15`, color: iconClr }}
                          >
                            {subCat}
                          </span>
                        );
                      })}
                    </div>
                    <div
                      className="flex items-center gap-1 mt-2.5 pt-2 border-t"
                      style={{ borderColor: isDarkMode ? 'rgba(14,165,233,0.15)' : 'rgba(14,165,233,0.1)' }}
                    >
                      <ArrowRight size={10} style={{ color: '#0EA5E9' }} />
                      <span className="text-[9px] font-medium" style={{ color: '#0EA5E9' }}>
                        Buyer can add at any time
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Mode: attach later */}
              {attachmentMode === 'later' && (
                <div
                  className="rounded-xl border overflow-hidden"
                  style={{
                    background: isDarkMode
                      ? 'linear-gradient(135deg, rgba(245,158,11,0.12) 0%, rgba(30,41,59,0.8) 100%)'
                      : 'linear-gradient(135deg, rgba(245,158,11,0.06) 0%, rgba(255,255,255,0.95) 100%)',
                    backdropFilter: 'blur(12px)',
                    WebkitBackdropFilter: 'blur(12px)',
                    borderColor: isDarkMode ? '#F59E0B40' : '#F59E0B30',
                    boxShadow: '0 4px 12px -3px rgba(245,158,11,0.12)',
                  }}
                >
                  <div
                    className="flex items-center gap-1.5 px-3 py-2"
                    style={{
                      backgroundColor: isDarkMode ? 'rgba(245,158,11,0.15)' : 'rgba(245,158,11,0.08)',
                      borderBottom: `1px solid ${isDarkMode ? 'rgba(245,158,11,0.2)' : 'rgba(245,158,11,0.12)'}`,
                    }}
                  >
                    <Clock size={12} style={{ color: '#F59E0B' }} />
                    <span className="text-[10px] font-bold" style={{ color: '#F59E0B' }}>
                      Attach Later
                    </span>
                  </div>
                  <div className="p-3">
                    <p className="text-[10px] leading-relaxed mb-2" style={{ color: colors.utility.secondaryText }}>
                      {config.label} categories are captured. Specific details can be added any time after contract creation.
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {[...coverageBySubCat.keys()].map((subCat) => {
                        const scConfig = getSubCategoryConfig(subCat);
                        const iconClr = scConfig?.color || '#6B7280';
                        return (
                          <span
                            key={subCat}
                            className="text-[9px] px-1.5 py-0.5 rounded-md font-medium"
                            style={{ backgroundColor: `${iconClr}15`, color: iconClr }}
                          >
                            {subCat}
                          </span>
                        );
                      })}
                    </div>
                    <div
                      className="flex items-center gap-1 mt-2.5 pt-2 border-t"
                      style={{ borderColor: isDarkMode ? 'rgba(245,158,11,0.15)' : 'rgba(245,158,11,0.1)' }}
                    >
                      <ArrowRight size={10} style={{ color: '#F59E0B' }} />
                      <span className="text-[9px] font-medium" style={{ color: '#F59E0B' }}>
                        Add from contract detail page
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

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

// ── Option Pill sub-component ─────────────────────────────────────────

interface OptionPillProps {
  icon: React.ReactNode;
  label: string;
  isSelected: boolean;
  onClick: () => void;
  accentColor: string;
  colors: any;
  isDarkMode?: boolean;
  badge?: string;
}

const OptionPill: React.FC<OptionPillProps> = ({
  icon, label, isSelected, onClick, accentColor, colors, isDarkMode = false, badge,
}) => (
  <button
    type="button"
    onClick={onClick}
    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-semibold transition-all border"
    style={{
      borderColor: isSelected
        ? (isDarkMode ? accentColor + '50' : accentColor + '40')
        : (isDarkMode ? `${colors.utility.primaryText}15` : '#E5E7EB'),
      backgroundColor: isSelected
        ? (isDarkMode ? accentColor + '15' : accentColor + '08')
        : 'transparent',
      color: isSelected ? accentColor : colors.utility.secondaryText,
    }}
  >
    <span style={{ color: isSelected ? accentColor : colors.utility.secondaryText }}>
      {icon}
    </span>
    {label}
    {badge && (
      <span
        className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
        style={{ backgroundColor: accentColor + '15', color: accentColor }}
      >
        {badge}
      </span>
    )}
  </button>
);

export default AssetSelectionStep;
