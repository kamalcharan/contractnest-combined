// src/components/catalog-studio/BlockWizard/steps/ResourceDependencyStep.tsx
// Phase 5: Resource Dependency Configuration Step
// Uses API data to select actual resources (e.g., Dr. Bhavana, Dr. Hema)

import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Users, Package, Wrench, Truck, Building, Monitor, Box, AlertCircle, Check, Info, ChevronDown, ChevronUp, Loader2, TreePine, Search, X } from 'lucide-react';
import { useTheme } from '../../../../contexts/ThemeContext';
import { Block, SelectedVariant } from '../../../../types/catalogStudio';
import { useResourceTypes, useResources, ResourceType, Resource } from '../../../../hooks/useResources';
import { useResourceTemplatesBrowser } from '../../../../hooks/queries/useResourceTemplates';
import { useKnowledgeTreeVariants } from '../../../../hooks/queries/useKnowledgeTree';

// =================================================================
// TYPES
// =================================================================

interface ResourceDependencyStepProps {
  formData: Partial<Block>;
  onChange: (field: string, value: unknown) => void;
}

type PricingMode = 'independent' | 'resource_based';

interface SelectedResource {
  resource_id: string;
  resource_type_id: string;
  resource_name: string;
  quantity: number;
  is_required: boolean;
}

// Icon mapping for resource types
const RESOURCE_TYPE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  team_staff: Users,
  team: Users,
  staff: Users,
  equipment: Wrench,
  consumable: Package,
  vehicle: Truck,
  facility: Building,
  software: Monitor,
  default: Box,
};

const getIconForResourceType = (resourceType: ResourceType) => {
  const name = resourceType.name.toLowerCase().replace(/\s+/g, '_');
  return RESOURCE_TYPE_ICONS[name] || RESOURCE_TYPE_ICONS[resourceType.id] || RESOURCE_TYPE_ICONS.default;
};

// =================================================================
// KNOWLEDGE TREE VARIANT PICKER — Slide-out Panel
// =================================================================

interface KTVariantPickerProps {
  formData: Partial<Block>;
  onChange: (field: string, value: unknown) => void;
  colors: any;
  isDarkMode: boolean;
}

const KnowledgeTreeVariantPicker: React.FC<KTVariantPickerProps> = ({
  formData,
  onChange,
  colors,
  isDarkMode,
}) => {
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [equipmentSearch, setEquipmentSearch] = useState('');
  const [selectedEquipmentId, setSelectedEquipmentId] = useState<string | null>(
    (formData.meta?.knowledge_tree_ref as any)?.resource_template_id || null
  );

  // Fetch equipment templates
  const {
    templates: equipmentTemplates,
    isLoading: loadingTemplates,
  } = useResourceTemplatesBrowser({ limit: 100 });

  // Filter equipment (only equipment + asset types)
  const filteredEquipment = useMemo(() => {
    let items = equipmentTemplates.filter(t =>
      ['equipment', 'asset', 'consumable'].includes((t.resource_type_id || '').toLowerCase())
    );
    if (equipmentSearch.trim()) {
      const lower = equipmentSearch.toLowerCase();
      items = items.filter(t =>
        t.name.toLowerCase().includes(lower) ||
        (t.sub_category && t.sub_category.toLowerCase().includes(lower))
      );
    }
    return items;
  }, [equipmentTemplates, equipmentSearch]);

  // Fetch KT variants for selected equipment
  const {
    data: variantsData,
    isLoading: loadingVariants,
  } = useKnowledgeTreeVariants(selectedEquipmentId || undefined);

  const variants = variantsData?.variants || [];
  const selectedVariants = (formData.meta?.selectedVariants as SelectedVariant[]) || [];
  const selectedEquipment = equipmentTemplates.find(t => t.id === selectedEquipmentId);

  const handleEquipmentSelect = (templateId: string) => {
    setSelectedEquipmentId(templateId);
    onChange('meta', {
      ...formData.meta,
      knowledge_tree_ref: { resource_template_id: templateId },
      selectedVariants: [],
    });
  };

  const handleVariantToggle = (variant: any) => {
    const exists = selectedVariants.some(v => v.variant_id === variant.id);
    const newVariants = exists
      ? selectedVariants.filter(v => v.variant_id !== variant.id)
      : [...selectedVariants, { variant_id: variant.id, variant_name: variant.name, capacity_range: variant.capacity_range || null }];
    onChange('meta', { ...formData.meta, selectedVariants: newVariants });
  };

  const handleSelectAll = () => {
    const newVariants = selectedVariants.length === variants.length
      ? []
      : variants.map((v: any) => ({ variant_id: v.id, variant_name: v.name, capacity_range: v.capacity_range || null }));
    onChange('meta', { ...formData.meta, selectedVariants: newVariants });
  };

  const isVariantSelected = (variantId: string) => selectedVariants.some(v => v.variant_id === variantId);

  return (
    <>
      {/* ── Trigger Card ── */}
      <div
        className="rounded-xl border p-4 cursor-pointer transition-all hover:shadow-sm"
        onClick={() => setIsPanelOpen(true)}
        style={{
          backgroundColor: selectedEquipment
            ? colors.brand.primary + '05'
            : isDarkMode ? colors.utility.secondaryBackground : '#FFFFFF',
          borderColor: selectedEquipment
            ? colors.brand.primary + '40'
            : isDarkMode ? colors.utility.secondaryBackground : '#E5E7EB',
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{
                backgroundColor: selectedEquipment ? colors.brand.primary + '20' : isDarkMode ? colors.utility.secondaryBackground : '#F3F4F6',
              }}
            >
              <TreePine className="w-5 h-5" style={{ color: selectedEquipment ? colors.brand.primary : colors.utility.secondaryText }} />
            </div>
            <div>
              <h4 className="font-semibold text-sm" style={{ color: colors.utility.primaryText }}>
                Equipment & Variants
              </h4>
              <p className="text-xs" style={{ color: colors.utility.secondaryText }}>
                {selectedEquipment
                  ? `${selectedEquipment.name} — ${selectedVariants.length} variant${selectedVariants.length !== 1 ? 's' : ''} selected`
                  : 'Link this block to equipment from Knowledge Tree'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {selectedVariants.length > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: colors.brand.primary, color: '#fff' }}>
                {selectedVariants.length}
              </span>
            )}
            <ChevronDown className="w-5 h-5" style={{ color: colors.utility.secondaryText }} />
          </div>
        </div>

        {/* Selected variants preview chips */}
        {selectedVariants.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t" style={{ borderColor: colors.utility.primaryText + '10' }}>
            {selectedVariants.slice(0, 5).map(v => (
              <span
                key={v.variant_id}
                className="text-[10px] px-2 py-0.5 rounded-full"
                style={{ backgroundColor: colors.brand.primary + '12', color: colors.brand.primary }}
              >
                {v.variant_name}
              </span>
            ))}
            {selectedVariants.length > 5 && (
              <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ backgroundColor: colors.utility.secondaryBackground, color: colors.utility.secondaryText }}>
                +{selectedVariants.length - 5} more
              </span>
            )}
          </div>
        )}
      </div>

      {/* ── Slide-out Panel via Portal (matches QuickAddContactDrawer pattern) ── */}
      {isPanelOpen && createPortal(
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 transition-opacity duration-300"
            style={{ backgroundColor: 'rgba(0,0,0,0.3)' }}
            onClick={() => setIsPanelOpen(false)}
          />

          {/* Panel */}
          <div
            className="fixed top-0 right-0 h-full w-[480px] max-w-[90vw] z-50 flex flex-col shadow-2xl transform transition-transform duration-300 ease-out"
            style={{
              backgroundColor: isDarkMode ? colors.utility.primaryBackground : '#FFFFFF',
              transform: 'translateX(0)',
            }}
          >
            {/* Panel Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: colors.utility.primaryText + '15' }}>
              <div className="flex items-center gap-3">
                <TreePine className="w-5 h-5" style={{ color: colors.brand.primary }} />
                <div>
                  <h3 className="text-base font-semibold" style={{ color: colors.utility.primaryText }}>Equipment & Variants</h3>
                  <p className="text-xs" style={{ color: colors.utility.secondaryText }}>Select equipment and applicable variants from Knowledge Tree</p>
                </div>
              </div>
              <button
                onClick={() => setIsPanelOpen(false)}
                className="p-2 rounded-lg hover:opacity-80 transition-colors"
                style={{ backgroundColor: colors.utility.secondaryBackground }}
              >
                <X className="w-4 h-4" style={{ color: colors.utility.secondaryText }} />
              </button>
            </div>

            {/* Panel Body — scrollable */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">

              {/* ── Step 1: Select Equipment ── */}
              <div>
                <label className="text-sm font-medium mb-2 block" style={{ color: colors.utility.primaryText }}>
                  1. Select Equipment
                </label>

                <div className="relative mb-3">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: colors.utility.secondaryText }} />
                  <input
                    type="text"
                    placeholder="Search equipment..."
                    value={equipmentSearch}
                    onChange={(e) => setEquipmentSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 rounded-lg border text-sm"
                    style={{
                      backgroundColor: isDarkMode ? colors.utility.secondaryBackground : '#FFFFFF',
                      borderColor: isDarkMode ? colors.utility.secondaryBackground : '#D1D5DB',
                      color: colors.utility.primaryText,
                    }}
                  />
                </div>

                {loadingTemplates ? (
                  <div className="flex items-center justify-center py-6">
                    <Loader2 className="w-5 h-5 animate-spin" style={{ color: colors.brand.primary }} />
                    <span className="ml-2 text-sm" style={{ color: colors.utility.secondaryText }}>Loading equipment...</span>
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-56 overflow-y-auto">
                    {filteredEquipment.map((template) => {
                      const isSelected = selectedEquipmentId === template.id;
                      return (
                        <div
                          key={template.id}
                          className="p-3 rounded-lg border cursor-pointer transition-all"
                          onClick={() => handleEquipmentSelect(template.id)}
                          style={{
                            backgroundColor: isSelected ? colors.brand.primary + '08' : isDarkMode ? colors.utility.secondaryBackground : '#FAFAFA',
                            borderColor: isSelected ? colors.brand.primary : isDarkMode ? colors.utility.secondaryBackground : '#E5E7EB',
                          }}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate" style={{ color: colors.utility.primaryText }}>{template.name}</p>
                              {template.sub_category && (
                                <p className="text-xs truncate" style={{ color: colors.utility.secondaryText }}>{template.sub_category}</p>
                              )}
                            </div>
                            <div
                              className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ml-2 ${isSelected ? 'border-0' : ''}`}
                              style={{
                                backgroundColor: isSelected ? colors.brand.primary : 'transparent',
                                borderColor: isSelected ? colors.brand.primary : isDarkMode ? colors.utility.secondaryText : '#D1D5DB',
                              }}
                            >
                              {isSelected && <Check className="w-3 h-3 text-white" />}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    {filteredEquipment.length === 0 && (
                      <p className="text-sm py-4 text-center" style={{ color: colors.utility.secondaryText }}>
                        {equipmentSearch ? 'No equipment matches search' : 'No equipment available'}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* ── Step 2: Select Variants ── */}
              {selectedEquipmentId && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium" style={{ color: colors.utility.primaryText }}>
                      2. Select Applicable Variants
                    </label>
                    {variants.length > 0 && (
                      <button
                        type="button"
                        onClick={handleSelectAll}
                        className="text-xs font-medium px-3 py-1 rounded-md"
                        style={{ color: colors.brand.primary, backgroundColor: colors.brand.primary + '10' }}
                      >
                        {selectedVariants.length === variants.length ? 'Deselect All' : 'Select All'}
                      </button>
                    )}
                  </div>

                  {loadingVariants ? (
                    <div className="flex items-center justify-center py-6">
                      <Loader2 className="w-5 h-5 animate-spin" style={{ color: colors.brand.primary }} />
                      <span className="ml-2 text-sm" style={{ color: colors.utility.secondaryText }}>Loading variants...</span>
                    </div>
                  ) : variants.length === 0 ? (
                    <div
                      className="flex items-center gap-2 p-4 rounded-lg"
                      style={{ backgroundColor: colors.semantic.warning + '10', border: `1px solid ${colors.semantic.warning}30` }}
                    >
                      <AlertCircle className="w-4 h-4 flex-shrink-0" style={{ color: colors.semantic.warning }} />
                      <p className="text-sm" style={{ color: colors.utility.primaryText }}>
                        No Knowledge Tree data for {selectedEquipment?.name || 'this equipment'}. Add variants in the KT Builder first.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {variants.map((variant: any) => {
                        const isSelected = isVariantSelected(variant.id);
                        return (
                          <div
                            key={variant.id}
                            className="p-3 rounded-lg border cursor-pointer transition-all"
                            onClick={() => handleVariantToggle(variant)}
                            style={{
                              backgroundColor: isSelected ? colors.brand.primary + '08' : isDarkMode ? colors.utility.secondaryBackground : '#FAFAFA',
                              borderColor: isSelected ? colors.brand.primary : isDarkMode ? colors.utility.secondaryBackground : '#E5E7EB',
                            }}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate" style={{ color: colors.utility.primaryText }}>{variant.name}</p>
                                {variant.capacity_range && (
                                  <p className="text-xs truncate" style={{ color: colors.utility.secondaryText }}>{variant.capacity_range}</p>
                                )}
                                {variant.description && (
                                  <p className="text-xs truncate mt-0.5" style={{ color: colors.utility.secondaryText }}>{variant.description}</p>
                                )}
                              </div>
                              <div
                                className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ml-3 ${isSelected ? 'border-0' : ''}`}
                                style={{
                                  backgroundColor: isSelected ? colors.brand.primary : 'transparent',
                                  borderColor: isSelected ? colors.brand.primary : isDarkMode ? colors.utility.secondaryText : '#D1D5DB',
                                }}
                              >
                                {isSelected && <Check className="w-3 h-3 text-white" />}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Panel Footer */}
            <div className="px-6 py-4 border-t flex items-center justify-between" style={{ borderColor: colors.utility.primaryText + '15' }}>
              <div className="text-sm" style={{ color: colors.utility.secondaryText }}>
                {selectedEquipment
                  ? `${selectedEquipment.name} · ${selectedVariants.length} variant${selectedVariants.length !== 1 ? 's' : ''}`
                  : 'No equipment selected'}
              </div>
              <button
                onClick={() => setIsPanelOpen(false)}
                className="px-5 py-2.5 text-sm font-semibold text-white rounded-xl transition-all hover:shadow-lg"
                style={{ backgroundColor: colors.brand.primary }}
              >
                Done
              </button>
            </div>
          </div>
        </>,
        document.body
      )}
    </>
  );
};

// =================================================================
// COMPONENT
// =================================================================

const ResourceDependencyStep: React.FC<ResourceDependencyStepProps> = ({
  formData,
  onChange,
}) => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  // Fetch resource types from API
  const { data: resourceTypes, loading: loadingTypes, error: typesError } = useResourceTypes();

  // Track which resource type is expanded to show its resources
  const [expandedTypeId, setExpandedTypeId] = useState<string | null>(null);

  // Fetch resources for the expanded type
  const { data: resources, loading: loadingResources } = useResources(expandedTypeId || undefined, {
    enabled: !!expandedTypeId,
  });

  // Get current values from formData
  const pricingMode = (formData.meta?.pricingMode as PricingMode) || 'independent';
  const selectedResources = (formData.meta?.selectedResources as SelectedResource[]) || [];
  const selectedResourceTypeIds = (formData.meta?.resourceTypes as string[]) || [];

  // Handle pricing mode change
  const handlePricingModeChange = (mode: PricingMode) => {
    onChange('meta', {
      ...formData.meta,
      pricingMode: mode,
      // Clear selections if switching to independent
      ...(mode === 'independent' ? { resourceTypes: [], selectedResources: [] } : {}),
    });
  };

  // Handle resource type toggle (expand/collapse)
  const handleResourceTypeToggle = (typeId: string) => {
    if (expandedTypeId === typeId) {
      setExpandedTypeId(null);
    } else {
      setExpandedTypeId(typeId);
    }
  };

  // Handle resource type selection (add to list)
  const handleResourceTypeSelect = (typeId: string, isSelected: boolean) => {
    let newTypes: string[];
    let newSelectedResources = [...selectedResources];

    if (isSelected) {
      // Remove type and its resources
      newTypes = selectedResourceTypeIds.filter(id => id !== typeId);
      newSelectedResources = newSelectedResources.filter(r => r.resource_type_id !== typeId);
    } else {
      // Add type
      newTypes = [...selectedResourceTypeIds, typeId];
    }

    onChange('meta', {
      ...formData.meta,
      resourceTypes: newTypes,
      selectedResources: newSelectedResources,
    });
  };

  // Handle individual resource selection
  const handleResourceSelect = (resource: Resource, resourceType: ResourceType) => {
    const existingIndex = selectedResources.findIndex(r => r.resource_id === resource.id);
    let newSelectedResources: SelectedResource[];

    if (existingIndex >= 0) {
      // Remove resource
      newSelectedResources = selectedResources.filter(r => r.resource_id !== resource.id);
    } else {
      // Add resource
      newSelectedResources = [
        ...selectedResources,
        {
          resource_id: resource.id,
          resource_type_id: resourceType.id,
          resource_name: resource.display_name || resource.name,
          quantity: 1,
          is_required: true,
        },
      ];
    }

    // Ensure the resource type is in the selected types
    let newTypes = [...selectedResourceTypeIds];
    if (!newTypes.includes(resourceType.id) && newSelectedResources.some(r => r.resource_type_id === resourceType.id)) {
      newTypes.push(resourceType.id);
    }

    onChange('meta', {
      ...formData.meta,
      resourceTypes: newTypes,
      selectedResources: newSelectedResources,
    });
  };

  // Handle quantity change for a resource
  const handleQuantityChange = (resourceId: string, quantity: number) => {
    const newSelectedResources = selectedResources.map(r =>
      r.resource_id === resourceId ? { ...r, quantity: Math.max(1, quantity) } : r
    );
    onChange('meta', {
      ...formData.meta,
      selectedResources: newSelectedResources,
    });
  };

  // Check if a resource is selected
  const isResourceSelected = (resourceId: string) => {
    return selectedResources.some(r => r.resource_id === resourceId);
  };

  // Get count of selected resources for a type
  const getSelectedCountForType = (typeId: string) => {
    return selectedResources.filter(r => r.resource_type_id === typeId).length;
  };

  // Input styles - white background for light mode
  const cardStyle = (isSelected: boolean) => ({
    backgroundColor: isSelected
      ? `${colors.brand.primary}08`
      : (isDarkMode ? colors.utility.secondaryBackground : '#FFFFFF'),
    borderColor: isSelected
      ? colors.brand.primary
      : isDarkMode ? colors.utility.secondaryBackground : '#E5E7EB',
    cursor: 'pointer',
  });

  const inputStyle = {
    backgroundColor: isDarkMode ? colors.utility.secondaryBackground : '#FFFFFF',
    borderColor: isDarkMode ? colors.utility.secondaryBackground : '#D1D5DB',
    color: colors.utility.primaryText,
  };

  return (
    <div className="animate-in fade-in slide-in-from-right-4 duration-200">
      {/* Header */}
      <h2 className="text-lg font-bold mb-1" style={{ color: colors.utility.primaryText }}>
        Resource Dependency
      </h2>
      <p className="text-sm mb-6" style={{ color: colors.utility.secondaryText }}>
        Configure how this block's pricing is determined - independently or based on specific resources.
      </p>

      <div className="space-y-6">
        {/* Pricing Mode Selection */}
        <div>
          <label
            className="block text-sm font-medium mb-3"
            style={{ color: colors.utility.primaryText }}
          >
            Pricing Mode
          </label>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Independent Option */}
            <div
              className="relative p-4 border-2 rounded-xl transition-all"
              style={cardStyle(pricingMode === 'independent')}
              onClick={() => handlePricingModeChange('independent')}
            >
              <div className="flex items-start gap-3">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{
                    backgroundColor: pricingMode === 'independent'
                      ? `${colors.brand.primary}20`
                      : isDarkMode ? colors.utility.secondaryBackground : '#F3F4F6',
                  }}
                >
                  <Box
                    className="w-5 h-5"
                    style={{
                      color: pricingMode === 'independent'
                        ? colors.brand.primary
                        : colors.utility.secondaryText,
                    }}
                  />
                </div>
                <div className="flex-1">
                  <h4
                    className="font-semibold text-sm"
                    style={{ color: colors.utility.primaryText }}
                  >
                    Independent Pricing
                  </h4>
                  <p className="text-xs mt-1" style={{ color: colors.utility.secondaryText }}>
                    Block has a fixed price regardless of who performs the service.
                  </p>
                </div>
                {pricingMode === 'independent' && (
                  <div
                    className="w-5 h-5 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: colors.brand.primary }}
                  >
                    <Check className="w-3 h-3 text-white" />
                  </div>
                )}
              </div>
            </div>

            {/* Resource Dependent Option */}
            <div
              className="relative p-4 border-2 rounded-xl transition-all"
              style={cardStyle(pricingMode === 'resource_based')}
              onClick={() => handlePricingModeChange('resource_based')}
            >
              <div className="flex items-start gap-3">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{
                    backgroundColor: pricingMode === 'resource_based'
                      ? `${colors.brand.primary}20`
                      : isDarkMode ? colors.utility.secondaryBackground : '#F3F4F6',
                  }}
                >
                  <Users
                    className="w-5 h-5"
                    style={{
                      color: pricingMode === 'resource_based'
                        ? colors.brand.primary
                        : colors.utility.secondaryText,
                    }}
                  />
                </div>
                <div className="flex-1">
                  <h4
                    className="font-semibold text-sm"
                    style={{ color: colors.utility.primaryText }}
                  >
                    Resource Dependent
                  </h4>
                  <p className="text-xs mt-1" style={{ color: colors.utility.secondaryText }}>
                    Price varies based on which team members or resources are assigned.
                  </p>
                </div>
                {pricingMode === 'resource_based' && (
                  <div
                    className="w-5 h-5 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: colors.brand.primary }}
                  >
                    <Check className="w-3 h-3 text-white" />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Resource Selection (shown when resource_based is selected) */}
        {pricingMode === 'resource_based' && (
          <div className="animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex items-center justify-between mb-3">
              <label
                className="text-sm font-medium"
                style={{ color: colors.utility.primaryText }}
              >
                Select Resources
              </label>
              <span
                className="text-xs px-2 py-1 rounded-full"
                style={{
                  backgroundColor: `${colors.brand.primary}15`,
                  color: colors.brand.primary,
                }}
              >
                {selectedResources.length} selected
              </span>
            </div>

            {/* Info Box */}
            <div
              className="flex items-start gap-2 p-3 rounded-lg mb-4"
              style={{
                backgroundColor: `${colors.semantic.info}10`,
                border: `1px solid ${colors.semantic.info}30`,
              }}
            >
              <Info className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: colors.semantic.info }} />
              <p className="text-xs" style={{ color: colors.utility.primaryText }}>
                Expand a resource type to select specific team members or resources.
                Each selected resource can have individual pricing in the Pricing step.
              </p>
            </div>

            {/* Loading State */}
            {loadingTypes && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin" style={{ color: colors.brand.primary }} />
                <span className="ml-2 text-sm" style={{ color: colors.utility.secondaryText }}>
                  Loading resource types...
                </span>
              </div>
            )}

            {/* Error State */}
            {typesError && (
              <div
                className="flex items-center gap-2 p-3 rounded-lg"
                style={{
                  backgroundColor: `${colors.semantic.error}10`,
                  border: `1px solid ${colors.semantic.error}30`,
                }}
              >
                <AlertCircle className="w-4 h-4 flex-shrink-0" style={{ color: colors.semantic.error }} />
                <p className="text-xs" style={{ color: colors.utility.primaryText }}>
                  Failed to load resource types. Please try again.
                </p>
              </div>
            )}

            {/* Resource Types List */}
            {!loadingTypes && resourceTypes && resourceTypes.length > 0 && (
              <div className="space-y-3">
                {resourceTypes.map((type) => {
                  const TypeIcon = getIconForResourceType(type);
                  const isExpanded = expandedTypeId === type.id;
                  const selectedCount = getSelectedCountForType(type.id);
                  const hasSelections = selectedCount > 0;

                  return (
                    <div
                      key={type.id}
                      className="border rounded-xl overflow-hidden transition-all"
                      style={{
                        backgroundColor: isDarkMode ? colors.utility.secondaryBackground : '#FFFFFF',
                        borderColor: hasSelections ? colors.brand.primary : (isDarkMode ? colors.utility.secondaryBackground : '#E5E7EB'),
                      }}
                    >
                      {/* Resource Type Header */}
                      <div
                        className="p-4 flex items-center justify-between cursor-pointer transition-colors"
                        onClick={() => handleResourceTypeToggle(type.id)}
                        style={{
                          backgroundColor: hasSelections ? `${colors.brand.primary}05` : 'transparent',
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="w-10 h-10 rounded-lg flex items-center justify-center"
                            style={{
                              backgroundColor: hasSelections
                                ? `${colors.brand.primary}20`
                                : isDarkMode ? colors.utility.secondaryBackground : '#F3F4F6',
                            }}
                          >
                            <TypeIcon
                              className="w-5 h-5"
                              style={{
                                color: hasSelections
                                  ? colors.brand.primary
                                  : colors.utility.secondaryText,
                              }}
                            />
                          </div>
                          <div>
                            <h4
                              className="font-semibold text-sm"
                              style={{ color: colors.utility.primaryText }}
                            >
                              {type.name}
                            </h4>
                            {type.description && (
                              <p className="text-xs" style={{ color: colors.utility.secondaryText }}>
                                {type.description}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {selectedCount > 0 && (
                            <span
                              className="text-xs px-2 py-0.5 rounded-full"
                              style={{
                                backgroundColor: colors.brand.primary,
                                color: '#FFFFFF',
                              }}
                            >
                              {selectedCount}
                            </span>
                          )}
                          {isExpanded ? (
                            <ChevronUp className="w-5 h-5" style={{ color: colors.utility.secondaryText }} />
                          ) : (
                            <ChevronDown className="w-5 h-5" style={{ color: colors.utility.secondaryText }} />
                          )}
                        </div>
                      </div>

                      {/* Expanded Resources List */}
                      {isExpanded && (
                        <div
                          className="p-4 pt-0 border-t"
                          style={{ borderColor: isDarkMode ? colors.utility.secondaryBackground : '#E5E7EB' }}
                        >
                          {loadingResources ? (
                            <div className="flex items-center justify-center py-4">
                              <Loader2 className="w-5 h-5 animate-spin" style={{ color: colors.brand.primary }} />
                              <span className="ml-2 text-sm" style={{ color: colors.utility.secondaryText }}>
                                Loading resources...
                              </span>
                            </div>
                          ) : resources && resources.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-3">
                              {resources.map((resource) => {
                                const isSelected = isResourceSelected(resource.id);
                                const selectedResource = selectedResources.find(r => r.resource_id === resource.id);

                                return (
                                  <div
                                    key={resource.id}
                                    className="p-3 rounded-lg border transition-all"
                                    style={{
                                      backgroundColor: isSelected
                                        ? `${colors.brand.primary}08`
                                        : (isDarkMode ? colors.utility.primaryBackground : '#FAFAFA'),
                                      borderColor: isSelected
                                        ? colors.brand.primary
                                        : isDarkMode ? colors.utility.secondaryBackground : '#E5E7EB',
                                    }}
                                  >
                                    <div className="flex items-center justify-between">
                                      <div
                                        className="flex items-center gap-2 flex-1 cursor-pointer"
                                        onClick={() => handleResourceSelect(resource, type)}
                                      >
                                        <div
                                          className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                                          style={{
                                            backgroundColor: resource.hexcolor || colors.brand.primary,
                                            color: '#FFFFFF',
                                          }}
                                        >
                                          {(resource.display_name || resource.name).charAt(0).toUpperCase()}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <p
                                            className="text-sm font-medium truncate"
                                            style={{ color: colors.utility.primaryText }}
                                          >
                                            {resource.display_name || resource.name}
                                          </p>
                                          {resource.contact && (
                                            <p className="text-xs truncate" style={{ color: colors.utility.secondaryText }}>
                                              {resource.contact.email}
                                            </p>
                                          )}
                                        </div>
                                        <div
                                          className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                                            isSelected ? 'border-0' : ''
                                          }`}
                                          style={{
                                            backgroundColor: isSelected ? colors.brand.primary : 'transparent',
                                            borderColor: isSelected
                                              ? colors.brand.primary
                                              : isDarkMode ? colors.utility.secondaryText : '#D1D5DB',
                                          }}
                                        >
                                          {isSelected && <Check className="w-3 h-3 text-white" />}
                                        </div>
                                      </div>
                                    </div>

                                    {/* Quantity selector for selected resources */}
                                    {isSelected && selectedResource && (
                                      <div
                                        className="mt-2 pt-2 border-t flex items-center justify-between"
                                        style={{ borderColor: isDarkMode ? colors.utility.secondaryBackground : '#E5E7EB' }}
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        <span className="text-xs" style={{ color: colors.utility.secondaryText }}>
                                          Quantity
                                        </span>
                                        <div className="flex items-center gap-1">
                                          <button
                                            type="button"
                                            onClick={() => handleQuantityChange(resource.id, selectedResource.quantity - 1)}
                                            className="w-6 h-6 rounded flex items-center justify-center"
                                            style={{
                                              backgroundColor: isDarkMode ? colors.utility.secondaryBackground : '#F3F4F6',
                                              color: colors.utility.primaryText,
                                            }}
                                            disabled={selectedResource.quantity <= 1}
                                          >
                                            -
                                          </button>
                                          <input
                                            type="number"
                                            value={selectedResource.quantity}
                                            onChange={(e) => handleQuantityChange(resource.id, parseInt(e.target.value) || 1)}
                                            min={1}
                                            className="w-10 text-center text-sm border rounded py-0.5"
                                            style={inputStyle}
                                          />
                                          <button
                                            type="button"
                                            onClick={() => handleQuantityChange(resource.id, selectedResource.quantity + 1)}
                                            className="w-6 h-6 rounded flex items-center justify-center"
                                            style={{
                                              backgroundColor: isDarkMode ? colors.utility.secondaryBackground : '#F3F4F6',
                                              color: colors.utility.primaryText,
                                            }}
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
                          ) : (
                            <p className="text-sm py-4 text-center" style={{ color: colors.utility.secondaryText }}>
                              No resources found for this type.
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Warning if no resources selected */}
            {selectedResources.length === 0 && !loadingTypes && (
              <div
                className="flex items-center gap-2 p-3 rounded-lg mt-4"
                style={{
                  backgroundColor: `${colors.semantic.warning}10`,
                  border: `1px solid ${colors.semantic.warning}30`,
                }}
              >
                <AlertCircle className="w-4 h-4 flex-shrink-0" style={{ color: colors.semantic.warning }} />
                <p className="text-xs" style={{ color: colors.utility.primaryText }}>
                  Please select at least one resource to continue with resource-based pricing.
                </p>
              </div>
            )}
          </div>
        )}

        {/* ═══ KNOWLEDGE TREE: Equipment & Variant Picker ═══ */}
        <KnowledgeTreeVariantPicker
          formData={formData}
          onChange={onChange}
          colors={colors}
          isDarkMode={isDarkMode}
        />

        {/* Summary Card */}
        <div
          className="p-4 rounded-xl border"
          style={{
            backgroundColor: isDarkMode ? colors.utility.secondaryBackground : '#F9FAFB',
            borderColor: isDarkMode ? colors.utility.secondaryBackground : '#E5E7EB',
          }}
        >
          <h4
            className="text-sm font-semibold mb-2"
            style={{ color: colors.utility.primaryText }}
          >
            Configuration Summary
          </h4>
          <div className="text-xs space-y-1" style={{ color: colors.utility.secondaryText }}>
            <p>
              <strong>Pricing Mode:</strong>{' '}
              {pricingMode === 'independent' ? 'Independent (Fixed Price)' : 'Resource Dependent'}
            </p>
            {pricingMode === 'resource_based' && selectedResources.length > 0 && (
              <>
                <p>
                  <strong>Selected Resources ({selectedResources.length}):</strong>
                </p>
                <ul className="ml-4 list-disc">
                  {selectedResources.map(r => (
                    <li key={r.resource_id}>
                      {r.resource_name} (x{r.quantity})
                    </li>
                  ))}
                </ul>
              </>
            )}
            {/* KT summary */}
            {(formData.meta?.selectedVariants as SelectedVariant[] || []).length > 0 && (
              <>
                <p>
                  <strong>Equipment Variants ({(formData.meta?.selectedVariants as SelectedVariant[]).length}):</strong>
                </p>
                <ul className="ml-4 list-disc">
                  {(formData.meta?.selectedVariants as SelectedVariant[]).map(v => (
                    <li key={v.variant_id}>
                      {v.variant_name}{v.capacity_range ? ` (${v.capacity_range})` : ''}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResourceDependencyStep;
