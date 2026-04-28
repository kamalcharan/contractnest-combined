// src/components/catalog-studio/BlockWizard/steps/ResourceDependencyStep.tsx
// Phase 5: Resource Dependency Configuration Step
// Updated: Equipment slider opens immediately, radio button single-select

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
// KNOWLEDGE TREE EQUIPMENT SLIDER
// Full slide-out panel: Equipment (radio select) → Variants (checkbox)
// =================================================================

interface KTEquipmentSliderProps {
  isOpen: boolean;
  onClose: () => void;
  formData: Partial<Block>;
  onChange: (field: string, value: unknown) => void;
  colors: any;
  isDarkMode: boolean;
}

const KnowledgeTreeEquipmentSlider: React.FC<KTEquipmentSliderProps> = ({
  isOpen,
  onClose,
  formData,
  onChange,
  colors,
  isDarkMode,
}) => {
  const [equipmentSearch, setEquipmentSearch] = useState('');
  const [selectedEquipmentId, setSelectedEquipmentId] = useState<string | null>(
    (formData.meta?.knowledge_tree_ref as any)?.resource_template_id || null
  );

  const {
    templates: equipmentTemplates,
    isLoading: loadingTemplates,
  } = useResourceTemplatesBrowser({ limit: 100 });

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

  if (!isOpen) return null;

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 transition-opacity duration-300"
        style={{ backgroundColor: 'rgba(0,0,0,0.3)' }}
        onClick={onClose}
      />

      {/* Slider Panel */}
      <div
        className="fixed top-0 right-0 h-full w-[520px] max-w-[90vw] z-50 flex flex-col shadow-2xl transform transition-transform duration-300 ease-out"
        style={{
          backgroundColor: isDarkMode ? colors.utility.primaryBackground : '#FFFFFF',
          transform: 'translateX(0)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: colors.utility.primaryText + '15' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: colors.brand.primary + '20' }}>
              <TreePine className="w-5 h-5" style={{ color: colors.brand.primary }} />
            </div>
            <div>
              <h3 className="text-base font-semibold" style={{ color: colors.utility.primaryText }}>
                Equipment &amp; Variants
              </h3>
              <p className="text-xs" style={{ color: colors.utility.secondaryText }}>
                Select equipment, then choose applicable variants
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:opacity-80 transition-colors"
            style={{ backgroundColor: colors.utility.secondaryBackground }}
          >
            <X className="w-4 h-4" style={{ color: colors.utility.secondaryText }} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {/* ── Step 1: Equipment Selection (Radio) ── */}
          <div className="mb-6">
            <label className="text-sm font-medium mb-2 block" style={{ color: colors.utility.primaryText }}>
              1. Select Equipment
            </label>

            {/* Search */}
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: colors.utility.secondaryText }} />
              <input
                type="text"
                placeholder="Search equipment..."
                value={equipmentSearch}
                onChange={(e) => setEquipmentSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-lg border text-sm"
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
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {filteredEquipment.map((template) => {
                  const isSelected = selectedEquipmentId === template.id;
                  return (
                    <div
                      key={template.id}
                      className="p-3 rounded-lg border cursor-pointer transition-all hover:shadow-sm"
                      onClick={() => handleEquipmentSelect(template.id)}
                      style={{
                        backgroundColor: isSelected ? colors.brand.primary + '08' : isDarkMode ? colors.utility.secondaryBackground : '#FAFAFA',
                        borderColor: isSelected ? colors.brand.primary : isDarkMode ? colors.utility.secondaryBackground : '#E5E7EB',
                      }}
                    >
                      <div className="flex items-center gap-3">
                        {/* Radio Button */}
                        <div
                          className="w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0"
                          style={{
                            borderColor: isSelected ? colors.brand.primary : isDarkMode ? colors.utility.secondaryText : '#D1D5DB',
                            backgroundColor: 'transparent',
                          }}
                        >
                          {isSelected && (
                            <div
                              className="w-2.5 h-2.5 rounded-full"
                              style={{ backgroundColor: colors.brand.primary }}
                            />
                          )}
                        </div>

                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{
                            backgroundColor: isSelected ? colors.brand.primary + '20' : isDarkMode ? colors.utility.secondaryBackground : '#F3F4F6',
                          }}
                        >
                          <Wrench className="w-4 h-4" style={{ color: isSelected ? colors.brand.primary : colors.utility.secondaryText }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate" style={{ color: colors.utility.primaryText }}>{template.name}</p>
                          {template.sub_category && (
                            <p className="text-xs truncate" style={{ color: colors.utility.secondaryText }}>{template.sub_category}</p>
                          )}
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

          {/* ── Step 2: Variant Selection (Checkboxes) ── */}
          {selectedEquipmentId && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-200">
              <div
                className="h-px mb-4"
                style={{ backgroundColor: colors.utility.primaryText + '10' }}
              />
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-medium" style={{ color: colors.utility.primaryText }}>
                  2. Select Variants for <span style={{ color: colors.brand.primary }}>{selectedEquipment?.name}</span>
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
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-5 h-5 animate-spin" style={{ color: colors.brand.primary }} />
                  <span className="ml-2 text-sm" style={{ color: colors.utility.secondaryText }}>Loading variants...</span>
                </div>
              ) : variants.length === 0 ? (
                <div
                  className="flex items-center gap-3 p-4 rounded-lg"
                  style={{ backgroundColor: colors.semantic.warning + '10', border: `1px solid ${colors.semantic.warning}30` }}
                >
                  <AlertCircle className="w-5 h-5 flex-shrink-0" style={{ color: colors.semantic.warning }} />
                  <div>
                    <p className="text-sm font-medium" style={{ color: colors.utility.primaryText }}>No variants found</p>
                    <p className="text-xs mt-1" style={{ color: colors.utility.secondaryText }}>
                      Add variants for {selectedEquipment?.name} in the Knowledge Tree Builder first.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
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
                            <p className="text-sm font-medium" style={{ color: colors.utility.primaryText }}>{variant.name}</p>
                            {variant.capacity_range && (
                              <p className="text-xs mt-0.5" style={{ color: colors.utility.secondaryText }}>{variant.capacity_range}</p>
                            )}
                            {variant.description && (
                              <p className="text-xs mt-0.5" style={{ color: colors.utility.secondaryText }}>{variant.description}</p>
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

        {/* Footer */}
        <div className="px-6 py-4 border-t flex items-center justify-between" style={{ borderColor: colors.utility.primaryText + '15' }}>
          <div className="text-sm" style={{ color: colors.utility.secondaryText }}>
            {selectedEquipmentId
              ? `${selectedVariants.length} variant${selectedVariants.length !== 1 ? 's' : ''} selected`
              : 'No equipment selected'}
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2.5 text-sm font-semibold text-white rounded-xl transition-all hover:shadow-lg"
            style={{ backgroundColor: colors.brand.primary }}
          >
            Done
          </button>
        </div>
      </div>
    </>,
    document.body
  );
};

// =================================================================
// PART 2 & 3: ResourceDependencyStep component follows below
// =================================================================
