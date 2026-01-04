// src/components/catalog-studio/BlockWizard/steps/ResourceDependencyStep.tsx
// Phase 5: Resource Dependency Configuration Step
// Uses API data to select actual resources (e.g., Dr. Bhavana, Dr. Hema)

import React, { useState, useEffect, useMemo } from 'react';
import { Users, Package, Wrench, Truck, Building, Monitor, Box, AlertCircle, Check, Info, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { useTheme } from '../../../../contexts/ThemeContext';
import { Block } from '../../../../types/catalogStudio';
import { useResourceTypes, useResources, ResourceType, Resource } from '../../../../hooks/useResources';

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
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResourceDependencyStep;
