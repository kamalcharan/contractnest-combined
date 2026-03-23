// src/pages/service-contracts/templates/admin/global-designer/steps/AssetNamesStep.tsx
// Step 4: Equipment / Facility Name Selection
// Auto-determined by nomenclature group from Step 1 — names only, no details

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
import { useResourceTypes, type ResourceType as DBResourceType } from '@/hooks/queries/useResources';
import type { GlobalDesignerWizardState } from '../types';
import { ASSET_STEP_GROUPS } from '../types';

// ─── Props ──────────────────────────────────────────────────────────

interface AssetNamesStepProps {
  state: GlobalDesignerWizardState;
  onUpdate: (updates: Partial<GlobalDesignerWizardState>) => void;
}

// ─── Nomenclature group → resource category mapping ─────────────────

const GROUP_CONFIG: Record<string, {
  category: string;
  label: string;
  icon: React.ElementType;
  description: string;
}> = {
  equipment_maintenance: {
    category: 'equipment',
    label: 'Equipment Types',
    icon: Wrench,
    description: 'Select which equipment types this template covers. Only names — tenants will add specific details when creating contracts.',
  },
  facility_property: {
    category: 'entity',
    label: 'Facility / Entity Types',
    icon: Building2,
    description: 'Select which facility or entity types this template covers. Only names — tenants will add specific details when creating contracts.',
  },
};

// ─── Component ──────────────────────────────────────────────────────

const AssetNamesStep: React.FC<AssetNamesStepProps> = ({ state, onUpdate }) => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  const { nomenclatureGroup } = state;
  const config = nomenclatureGroup ? GROUP_CONFIG[nomenclatureGroup] : null;
  const isAssetGroup = nomenclatureGroup ? ASSET_STEP_GROUPS.has(nomenclatureGroup) : false;

  // Fetch resource types
  const { data: resourceTypes, isLoading } = useResourceTypes();

  // Filter by the appropriate category
  const filteredTypes = useMemo(() => {
    if (!config || !resourceTypes) return [];
    return (resourceTypes as any[]).filter(
      (rt) => rt.resource_category === config.category && rt.is_active
    );
  }, [resourceTypes, config]);

  // Search state
  const [search, setSearch] = React.useState('');

  const displayTypes = useMemo(() => {
    if (!search.trim()) return filteredTypes;
    const q = search.toLowerCase();
    return filteredTypes.filter(
      (rt) =>
        rt.name.toLowerCase().includes(q) ||
        (rt.description && rt.description.toLowerCase().includes(q))
    );
  }, [filteredTypes, search]);

  // Toggle a resource type name
  const toggleType = (rt: DBResourceType) => {
    const idx = state.selectedAssetTypeIds.indexOf(rt.id);
    if (idx > -1) {
      onUpdate({
        selectedAssetTypeIds: state.selectedAssetTypeIds.filter((id) => id !== rt.id),
        selectedAssetTypeNames: state.selectedAssetTypeNames.filter((_, i) => i !== idx),
      });
    } else {
      onUpdate({
        selectedAssetTypeIds: [...state.selectedAssetTypeIds, rt.id],
        selectedAssetTypeNames: [...state.selectedAssetTypeNames, rt.name],
      });
    }
  };

  // Select / deselect all
  const selectAll = () => {
    onUpdate({
      selectedAssetTypeIds: filteredTypes.map((rt) => rt.id),
      selectedAssetTypeNames: filteredTypes.map((rt) => rt.name),
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
        {!isLoading && filteredTypes.length > 0 && (
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
                  {selectedCount} of {filteredTypes.length} selected
                </span>
                <button
                  onClick={selectedCount === filteredTypes.length ? deselectAll : selectAll}
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors hover:opacity-80"
                  style={{ color: colors.brand.primary, backgroundColor: `${colors.brand.primary}08` }}
                >
                  {selectedCount === filteredTypes.length ? 'Deselect All' : 'Select All'}
                </button>
              </div>
            </div>

            {/* Card Grid — Names Only */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {displayTypes.map((rt) => {
                const isSelected = state.selectedAssetTypeIds.includes(rt.id);
                return (
                  <button
                    key={rt.id}
                    onClick={() => toggleType(rt)}
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
                      {rt.name}
                    </span>

                    {/* Description (short) */}
                    {rt.description && (
                      <span
                        className="text-[10px] leading-tight line-clamp-2"
                        style={{ color: colors.utility.secondaryText }}
                      >
                        {rt.description}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* No search results */}
            {displayTypes.length === 0 && search.trim() && (
              <div className="text-center py-8">
                <p className="text-sm" style={{ color: colors.utility.secondaryText }}>
                  No {config!.label.toLowerCase()} match "{search}"
                </p>
              </div>
            )}
          </>
        )}

        {/* No types available */}
        {!isLoading && filteredTypes.length === 0 && (
          <div className="flex items-center gap-3 py-8 justify-center">
            <AlertCircle className="w-5 h-5" style={{ color: colors.utility.secondaryText }} />
            <span className="text-sm" style={{ color: colors.utility.secondaryText }}>
              No {config!.label.toLowerCase()} found in the system. Configure them in Settings → Resources.
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
