// src/components/catalog-studio/BlockWizard/steps/ResourceDependencyStep.tsx
// Phase 5: Resource Dependency Configuration Step
// Allows blocks to be either independent or resource-dependent

import React, { useMemo } from 'react';
import { Users, Package, Wrench, Truck, Building, Monitor, Box, AlertCircle, Check, Info } from 'lucide-react';
import { useTheme } from '../../../../contexts/ThemeContext';
import { Block } from '../../../../types/catalogStudio';

// =================================================================
// TYPES
// =================================================================

interface ResourceDependencyStepProps {
  formData: Partial<Block>;
  onChange: (field: string, value: unknown) => void;
}

type PricingMode = 'independent' | 'resource_based' | 'variant_based' | 'multi_resource';

interface ResourceTypeOption {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  pricingModel: string;
  requiresHumanAssignment: boolean;
}

// =================================================================
// FALLBACK RESOURCE TYPES (when DB fetch fails)
// =================================================================

const RESOURCE_TYPE_OPTIONS: ResourceTypeOption[] = [
  {
    id: 'team_staff',
    name: 'Team Staff',
    description: 'Team members like technicians, trainers, doctors',
    icon: Users,
    pricingModel: 'hourly',
    requiresHumanAssignment: true,
  },
  {
    id: 'equipment',
    name: 'Equipment',
    description: 'Equipment, tools, and machinery',
    icon: Wrench,
    pricingModel: 'per_unit',
    requiresHumanAssignment: false,
  },
  {
    id: 'consumable',
    name: 'Consumables',
    description: 'Consumable materials and supplies',
    icon: Package,
    pricingModel: 'per_unit',
    requiresHumanAssignment: false,
  },
  {
    id: 'vehicle',
    name: 'Vehicle',
    description: 'Vehicles and transportation',
    icon: Truck,
    pricingModel: 'per_unit',
    requiresHumanAssignment: false,
  },
  {
    id: 'facility',
    name: 'Facility',
    description: 'Facilities, rooms, and locations',
    icon: Building,
    pricingModel: 'per_unit',
    requiresHumanAssignment: false,
  },
  {
    id: 'software',
    name: 'Software',
    description: 'Software and digital resources',
    icon: Monitor,
    pricingModel: 'fixed',
    requiresHumanAssignment: false,
  },
];

// =================================================================
// COMPONENT
// =================================================================

const ResourceDependencyStep: React.FC<ResourceDependencyStepProps> = ({
  formData,
  onChange,
}) => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  // Get current pricing mode from formData
  const pricingMode = (formData.meta?.pricingMode as PricingMode) || 'independent';
  const selectedResourceTypes = (formData.meta?.resourceTypes as string[]) || [];
  const resourceQuantities = (formData.meta?.resourceQuantities as Record<string, number>) || {};

  // Handle pricing mode change
  const handlePricingModeChange = (mode: PricingMode) => {
    onChange('meta', {
      ...formData.meta,
      pricingMode: mode,
      // Clear resource types if switching to independent
      ...(mode === 'independent' ? { resourceTypes: [], resourceQuantities: {} } : {}),
    });
  };

  // Handle resource type selection
  const handleResourceTypeToggle = (typeId: string) => {
    const isSelected = selectedResourceTypes.includes(typeId);
    const newTypes = isSelected
      ? selectedResourceTypes.filter(t => t !== typeId)
      : [...selectedResourceTypes, typeId];

    // Update quantities
    const newQuantities = { ...resourceQuantities };
    if (isSelected) {
      delete newQuantities[typeId];
    } else {
      newQuantities[typeId] = 1; // Default quantity
    }

    onChange('meta', {
      ...formData.meta,
      resourceTypes: newTypes,
      resourceQuantities: newQuantities,
    });
  };

  // Handle quantity change
  const handleQuantityChange = (typeId: string, quantity: number) => {
    onChange('meta', {
      ...formData.meta,
      resourceQuantities: {
        ...resourceQuantities,
        [typeId]: Math.max(1, quantity),
      },
    });
  };

  // Input styles
  const cardStyle = (isSelected: boolean) => ({
    backgroundColor: isSelected
      ? `${colors.brand.primary}08`
      : colors.utility.primaryBackground,
    borderColor: isSelected
      ? colors.brand.primary
      : isDarkMode ? colors.utility.secondaryBackground : '#E5E7EB',
    cursor: 'pointer',
  });

  return (
    <div className="animate-in fade-in slide-in-from-right-4 duration-200">
      {/* Header */}
      <h2 className="text-lg font-bold mb-1" style={{ color: colors.utility.primaryText }}>
        Resource Dependency
      </h2>
      <p className="text-sm mb-6" style={{ color: colors.utility.secondaryText }}>
        Configure how this block's pricing is determined - independently or based on resources.
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
                    Block has a fixed price regardless of who performs the service or what resources are used.
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
                    Price varies based on which resources (team members, equipment) are assigned.
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

        {/* Resource Type Selection (shown when resource_based is selected) */}
        {pricingMode === 'resource_based' && (
          <div className="animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex items-center justify-between mb-3">
              <label
                className="text-sm font-medium"
                style={{ color: colors.utility.primaryText }}
              >
                Select Resource Types
              </label>
              <span
                className="text-xs px-2 py-1 rounded-full"
                style={{
                  backgroundColor: `${colors.brand.primary}15`,
                  color: colors.brand.primary,
                }}
              >
                {selectedResourceTypes.length} selected
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
                Select which types of resources are required for this block. Each resource type
                can have different pricing configurations in the Pricing step.
              </p>
            </div>

            {/* Resource Type Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {RESOURCE_TYPE_OPTIONS.map((type) => {
                const isSelected = selectedResourceTypes.includes(type.id);
                const TypeIcon = type.icon;

                return (
                  <div
                    key={type.id}
                    className={`relative p-3 border rounded-lg transition-all ${
                      isSelected ? 'ring-2' : 'hover:shadow-sm'
                    }`}
                    style={{
                      backgroundColor: isSelected
                        ? `${colors.brand.primary}05`
                        : colors.utility.primaryBackground,
                      borderColor: isSelected
                        ? colors.brand.primary
                        : isDarkMode ? colors.utility.secondaryBackground : '#E5E7EB',
                      '--tw-ring-color': colors.brand.primary,
                    } as React.CSSProperties}
                    onClick={() => handleResourceTypeToggle(type.id)}
                  >
                    <div className="flex items-start gap-2.5">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{
                          backgroundColor: isSelected
                            ? `${colors.brand.primary}20`
                            : isDarkMode ? colors.utility.secondaryBackground : '#F3F4F6',
                        }}
                      >
                        <TypeIcon
                          className="w-4 h-4"
                          style={{
                            color: isSelected
                              ? colors.brand.primary
                              : colors.utility.secondaryText,
                          }}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h5
                          className="text-sm font-medium truncate"
                          style={{ color: colors.utility.primaryText }}
                        >
                          {type.name}
                        </h5>
                        <p
                          className="text-xs mt-0.5 line-clamp-2"
                          style={{ color: colors.utility.secondaryText }}
                        >
                          {type.description}
                        </p>
                      </div>
                      <div
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
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

                    {/* Quantity Input (shown when selected) */}
                    {isSelected && (
                      <div
                        className="mt-3 pt-3 border-t"
                        style={{ borderColor: isDarkMode ? colors.utility.secondaryBackground : '#E5E7EB' }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-between">
                          <label
                            className="text-xs font-medium"
                            style={{ color: colors.utility.secondaryText }}
                          >
                            Quantity Required
                          </label>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleQuantityChange(type.id, (resourceQuantities[type.id] || 1) - 1)}
                              className="w-6 h-6 rounded flex items-center justify-center transition-colors"
                              style={{
                                backgroundColor: isDarkMode ? colors.utility.secondaryBackground : '#F3F4F6',
                                color: colors.utility.primaryText,
                              }}
                              disabled={(resourceQuantities[type.id] || 1) <= 1}
                            >
                              -
                            </button>
                            <input
                              type="number"
                              value={resourceQuantities[type.id] || 1}
                              onChange={(e) => handleQuantityChange(type.id, parseInt(e.target.value) || 1)}
                              min={1}
                              className="w-12 text-center text-sm border rounded py-1"
                              style={{
                                backgroundColor: colors.utility.primaryBackground,
                                borderColor: isDarkMode ? colors.utility.secondaryBackground : '#D1D5DB',
                                color: colors.utility.primaryText,
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => handleQuantityChange(type.id, (resourceQuantities[type.id] || 1) + 1)}
                              className="w-6 h-6 rounded flex items-center justify-center transition-colors"
                              style={{
                                backgroundColor: isDarkMode ? colors.utility.secondaryBackground : '#F3F4F6',
                                color: colors.utility.primaryText,
                              }}
                            >
                              +
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Warning if no resources selected */}
            {selectedResourceTypes.length === 0 && (
              <div
                className="flex items-center gap-2 p-3 rounded-lg mt-4"
                style={{
                  backgroundColor: `${colors.semantic.warning}10`,
                  border: `1px solid ${colors.semantic.warning}30`,
                }}
              >
                <AlertCircle className="w-4 h-4 flex-shrink-0" style={{ color: colors.semantic.warning }} />
                <p className="text-xs" style={{ color: colors.utility.primaryText }}>
                  Please select at least one resource type to continue with resource-based pricing.
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
            {pricingMode === 'resource_based' && selectedResourceTypes.length > 0 && (
              <p>
                <strong>Resource Types:</strong>{' '}
                {selectedResourceTypes
                  .map(id => RESOURCE_TYPE_OPTIONS.find(t => t.id === id)?.name)
                  .join(', ')}
              </p>
            )}
            {pricingMode === 'resource_based' && Object.keys(resourceQuantities).length > 0 && (
              <p>
                <strong>Quantities:</strong>{' '}
                {Object.entries(resourceQuantities)
                  .map(([id, qty]) => `${RESOURCE_TYPE_OPTIONS.find(t => t.id === id)?.name}: ${qty}`)
                  .join(', ')}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResourceDependencyStep;
