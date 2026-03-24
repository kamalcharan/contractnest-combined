// src/pages/service-contracts/templates/admin/global-designer/steps/AssetNamesStep.tsx
// Step 4: Equipment / Facility Name Selection
// Queries m_catalog_resource_templates filtered by:
//   - Selected industries from Step 3 (targetIndustries)
//   - resource_type_id derived from nomenclature group (equipment vs asset)
// Skipped for service_delivery / flexible_hybrid groups

import React, { useMemo } from 'react';
import {
  Wrench,
  Building2,
  Check,
  Loader2,
  AlertCircle,
  Info,
  Search,
} from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import {
  useResourceTemplatesBrowser,
  type ResourceTemplateFilters,
} from '@/hooks/queries/useResourceTemplates';
import type { GlobalDesignerWizardState } from '../types';
import { ASSET_STEP_GROUPS, NOMENCLATURE_RESOURCE_TYPE_MAP } from '../types';

// ─── Props ──────────────────────────────────────────────────────────

interface AssetNamesStepProps {
  state: GlobalDesignerWizardState;
  onUpdate: (updates: Partial<GlobalDesignerWizardState>) => void;
}

// ─── Nomenclature group → UI config ─────────────────────────────────

const GROUP_CONFIG: Record<string, {
  label: string;
  icon: React.ElementType;
  description: string;
}> = {
  equipment_maintenance: {
    label: 'Equipment Types',
    icon: Wrench,
    description: 'Select which equipment types this template covers. Only names — tenants will add specific details when creating contracts.',
  },
  facility_property: {
    label: 'Facility / Entity Types',
    icon: Building2,
    description: 'Select which facility or entity types this template covers. Only names — tenants will add specific details when creating contracts.',
  },
};

// ─── Component ──────────────────────────────────────────────────────

const AssetNamesStep: React.FC<AssetNamesStepProps> = ({ state, onUpdate }) => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  const { nomenclatureGroup, targetIndustries } = state;
  const config = nomenclatureGroup ? GROUP_CONFIG[nomenclatureGroup] : null;
  const isAssetGroup = nomenclatureGroup ? ASSET_STEP_GROUPS.has(nomenclatureGroup) : false;

  // Derive resource_type_id from nomenclature group
  const resourceTypeId = nomenclatureGroup
    ? NOMENCLATURE_RESOURCE_TYPE_MAP[nomenclatureGroup] || 'equipment'
    : 'equipment';

  // Fetch resource templates filtered by resource_type_id
  // The API already filters by tenant's served industries server-side
  const templateFilters: ResourceTemplateFilters = useMemo(
    () => ({ limit: 500, resource_type_id: resourceTypeId }),
    [resourceTypeId]
  );
  const { templates, isLoading } = useResourceTemplatesBrowser(templateFilters);

  // Further filter by selected industries from Step 3
  const filteredTemplates = useMemo(() => {
    if (!templates || templates.length === 0) return [];
    if (targetIndustries.length === 0) return templates;
    return templates.filter((t) => targetIndustries.includes(t.industry_id));
  }, [templates, targetIndustries]);

  // Search state
  const [search, setSearch] = React.useState('');

  const displayTemplates = useMemo(() => {
    if (!search.trim()) return filteredTemplates;
    const q = search.toLowerCase();
    return filteredTemplates.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        (t.description && t.description.toLowerCase().includes(q))
    );
  }, [filteredTemplates, search]);

  // Toggle a resource template
  const toggleTemplate = (templateItem: typeof templates[0]) => {
    const idx = state.selectedAssetTypeIds.indexOf(templateItem.id);
    if (idx > -1) {
      onUpdate({
        selectedAssetTypeIds: state.selectedAssetTypeIds.filter((id) => id !== templateItem.id),
        selectedAssetTypeNames: state.selectedAssetTypeNames.filter((_, i) => i !== idx),
      });
    } else {
      onUpdate({
        selectedAssetTypeIds: [...state.selectedAssetTypeIds, templateItem.id],
        selectedAssetTypeNames: [...state.selectedAssetTypeNames, templateItem.name],
      });
    }
  };

  // Select / deselect all
  const selectAll = () => {
    onUpdate({
      selectedAssetTypeIds: filteredTemplates.map((t) => t.id),
      selectedAssetTypeNames: filteredTemplates.map((t) => t.name),
    });
  };
  const deselectAll = () => {
    onUpdate({ selectedAssetTypeIds: [], selectedAssetTypeNames: [] });
  };

  // ─── No nomenclature or non-asset group ──────────────────────
  if (!isAssetGroup) {
    return (
      <div
        className="min-h-[60vh] px-4 py-8 flex items-center justify-center"
        style={{ backgroundColor: colors.utility.primaryBackground }}
      >
        <div className="max-w-md text-center">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5"
            style={{ backgroundColor: `${colors.semantic.info || '#3B82F6'}10` }}
          >
            <Info className="w-8 h-8" style={{ color: colors.semantic.info || '#3B82F6' }} />
          </div>
          <h3 className="text-lg font-bold mb-2" style={{ color: colors.utility.primaryText }}>
            Service-Only Template
          </h3>
          <p className="text-sm mb-4" style={{ color: colors.utility.secondaryText }}>
            {!nomenclatureGroup
              ? 'No nomenclature was selected in Step 1. This template won\'t include equipment or facility selection.'
              : `The selected nomenclature group "${nomenclatureGroup.replace(/_/g, ' ')}" does not require equipment or facility selection.`
            }
          </p>
          <p className="text-xs" style={{ color: colors.utility.secondaryText }}>
            You can skip this step — it's only relevant for Equipment Maintenance and Facility/Property templates.
          </p>
        </div>
      </div>
    );
  }

  const Icon = config!.icon;
  const selectedCount = state.selectedAssetTypeIds.length;

  return (
    <div
      className="min-h-[60vh] px-4 py-8"
      style={{ backgroundColor: colors.utility.primaryBackground }}
    >
      <div className="max-w-4xl mx-auto space-y-8">

        {/* Header */}
        <div className="text-center mb-2">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ backgroundColor: `${colors.brand.primary}12` }}
          >
            <Icon className="w-7 h-7" style={{ color: colors.brand.primary }} />
          </div>
          <h2 className="text-2xl font-bold mb-3" style={{ color: colors.utility.primaryText }}>
            {config!.label}
          </h2>
          <p className="text-sm max-w-lg mx-auto" style={{ color: colors.utility.secondaryText }}>
            {config!.description}
          </p>
          {targetIndustries.length > 0 && (
            <p className="text-xs mt-2" style={{ color: colors.utility.secondaryText }}>
              Showing {resourceTypeId === 'equipment' ? 'equipment' : 'facility'} types for {targetIndustries.length} selected industr{targetIndustries.length !== 1 ? 'ies' : 'y'}
            </p>
          )}
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="flex items-center gap-2 py-10 justify-center">
            <Loader2 className="w-6 h-6 animate-spin" style={{ color: colors.brand.primary }} />
            <span className="text-sm" style={{ color: colors.utility.secondaryText }}>
              Loading {config!.label.toLowerCase()}...
            </span>
          </div>
        )}

        {/* Content */}
        {!isLoading && filteredTemplates.length > 0 && (
          <>
            {/* Toolbar: Search + Select All */}
            <div className="flex items-center justify-between gap-4">
              <div
                className="flex items-center gap-2 flex-1 max-w-sm px-3 py-2 rounded-xl border"
                style={{
                  backgroundColor: colors.utility.secondaryBackground,
                  borderColor: `${colors.utility.primaryText}12`,
                }}
              >
                <Search className="w-4 h-4" style={{ color: colors.utility.secondaryText }} />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={`Search ${config!.label.toLowerCase()}...`}
                  className="flex-1 bg-transparent text-sm outline-none"
                  style={{ color: colors.utility.primaryText }}
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-medium" style={{ color: colors.utility.secondaryText }}>
                  {selectedCount} of {filteredTemplates.length} selected
                </span>
                <button
                  onClick={selectedCount === filteredTemplates.length ? deselectAll : selectAll}
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors hover:opacity-80"
                  style={{ color: colors.brand.primary, backgroundColor: `${colors.brand.primary}08` }}
                >
                  {selectedCount === filteredTemplates.length ? 'Deselect All' : 'Select All'}
                </button>
              </div>
            </div>

            {/* Card Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {displayTemplates.map((t) => {
                const isSelected = state.selectedAssetTypeIds.includes(t.id);
                return (
                  <button
                    key={t.id}
                    onClick={() => toggleTemplate(t)}
                    className="relative flex flex-col p-4 rounded-xl border-2 text-left transition-all duration-200 hover:shadow-md group"
                    style={{
                      backgroundColor: isSelected
                        ? `${colors.brand.primary}08`
                        : colors.utility.secondaryBackground,
                      borderColor: isSelected
                        ? colors.brand.primary
                        : `${colors.utility.primaryText}10`,
                      transform: isSelected ? 'scale(1.02)' : 'scale(1)',
                    }}
                  >
                    {/* Selection check */}
                    <div
                      className="absolute top-3 right-3 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all"
                      style={{
                        borderColor: isSelected ? colors.brand.primary : `${colors.utility.primaryText}25`,
                        backgroundColor: isSelected ? colors.brand.primary : 'transparent',
                      }}
                    >
                      {isSelected && <Check className="w-3 h-3 text-white" />}
                    </div>

                    {/* Icon */}
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center mb-3"
                      style={{
                        backgroundColor: isSelected ? `${colors.brand.primary}15` : `${colors.utility.primaryText}06`,
                      }}
                    >
                      <Icon
                        className="w-5 h-5"
                        style={{ color: isSelected ? colors.brand.primary : colors.utility.secondaryText }}
                      />
                    </div>

                    {/* Name */}
                    <span
                      className="text-sm font-semibold mb-0.5"
                      style={{ color: isSelected ? colors.brand.primary : colors.utility.primaryText }}
                    >
                      {t.name}
                    </span>

                    {/* Description */}
                    {t.description && (
                      <span
                        className="text-[10px] leading-tight line-clamp-2"
                        style={{ color: colors.utility.secondaryText }}
                      >
                        {t.description}
                      </span>
                    )}

                    {/* Recommended badge */}
                    {t.is_recommended && (
                      <span
                        className="mt-2 text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded"
                        style={{
                          backgroundColor: `${colors.semantic.success}12`,
                          color: colors.semantic.success,
                        }}
                      >
                        Recommended
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* No search results */}
            {displayTemplates.length === 0 && search.trim() && (
              <div className="text-center py-8">
                <p className="text-sm" style={{ color: colors.utility.secondaryText }}>
                  No {config!.label.toLowerCase()} match "{search}"
                </p>
              </div>
            )}
          </>
        )}

        {/* No templates available */}
        {!isLoading && filteredTemplates.length === 0 && (
          <div className="flex flex-col items-center gap-3 py-8">
            <AlertCircle className="w-6 h-6" style={{ color: colors.utility.secondaryText }} />
            <span className="text-sm text-center" style={{ color: colors.utility.secondaryText }}>
              {targetIndustries.length === 0
                ? 'No industries selected. Go back to Step 3 to select industries first.'
                : `No ${config!.label.toLowerCase()} found for the selected industries. This is normal if the catalog hasn't been configured yet.`
              }
            </span>
          </div>
        )}

        <p className="text-center text-xs" style={{ color: colors.utility.secondaryText }}>
          This step is optional — tenants can always customize {config!.label.toLowerCase()} when creating contracts
        </p>
      </div>
    </div>
  );
};

export default AssetNamesStep;
