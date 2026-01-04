// src/components/catalog-studio/BlockWizard/steps/ResourceDependencyStep.tsx
// Phase 8: Resource Dependency Configuration Step - FIXED VERSION
// Uses real API data for resource types and actual resources

import React, { useState, useCallback, useMemo } from 'react';
import {
  Users,
  Package,
  Box,
  AlertCircle,
  Check,
  Info,
  Plus,
  Trash2,
  Loader2,
  CheckCircle,
  Search
} from 'lucide-react';
import { useTheme } from '../../../../contexts/ThemeContext';
import { Block } from '../../../../types/catalogStudio';

// Import real hooks for API data
import { useResourceTypes, useResources, Resource, ResourceType } from '../../../../hooks/useResources';

// =================================================================
// TYPES
// =================================================================

interface ResourceDependencyStepProps {
  formData: Partial<Block>;
  onChange: (field: string, value: unknown) => void;
}

type ServiceType = 'independent' | 'resource_based';

// Proper resource requirement structure matching Catalog Services
interface ResourceRequirement {
  resource_id: string;
  resource_type_id: string;
  resource_name?: string;
  quantity: number;
  is_required: boolean;
  select_all?: boolean; // When true, means "any resource of this type"
}

// =================================================================
// COMPONENT
// =================================================================

const ResourceDependencyStep: React.FC<ResourceDependencyStepProps> = ({
  formData,
  onChange,
}) => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  // Local state for resource type selection
  const [selectedResourceTypeId, setSelectedResourceTypeId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Fetch resource types from API
  const {
    data: resourceTypes,
    loading: loadingResourceTypes,
  } = useResourceTypes();

  // Fetch actual resources based on selected resource type
  const {
    data: availableResources,
    loading: loadingResources,
  } = useResources(selectedResourceTypeId || undefined, {
    enabled: !!selectedResourceTypeId
  });

  // Get current service type and resource requirements from formData
  const serviceType = (formData.service_type as ServiceType) || 'independent';
  const resourceRequirements = (formData.resource_requirements as ResourceRequirement[]) || [];

  // Filter resources by search query
  const filteredResources = useMemo(() => {
    if (!searchQuery.trim()) return availableResources;
    const query = searchQuery.toLowerCase();
    return availableResources.filter(r =>
      r.name?.toLowerCase().includes(query) ||
      r.display_name?.toLowerCase().includes(query) ||
      r.description?.toLowerCase().includes(query)
    );
  }, [availableResources, searchQuery]);

  // Handle service type change
  const handleServiceTypeChange = useCallback((newType: ServiceType) => {
    onChange('service_type', newType);
    if (newType === 'independent') {
      onChange('resource_requirements', []);
    }
  }, [onChange]);

  // Add a specific resource to requirements
  const addResourceRequirement = useCallback((resource: Resource) => {
    const isAlreadyAdded = resourceRequirements.some(r => r.resource_id === resource.id);
    if (isAlreadyAdded) return;

    const newRequirement: ResourceRequirement = {
      resource_id: resource.id,
      resource_type_id: resource.resource_type_id,
      resource_name: resource.display_name || resource.name,
      quantity: 1,
      is_required: true,
      select_all: false
    };

    onChange('resource_requirements', [...resourceRequirements, newRequirement]);
  }, [resourceRequirements, onChange]);

  // Add "ALL" resources of a type
  const addAllResourcesOfType = useCallback((resourceTypeId: string, resourceTypeName: string) => {
    // Check if already added
    const isAlreadyAdded = resourceRequirements.some(
      r => r.resource_type_id === resourceTypeId && r.select_all
    );
    if (isAlreadyAdded) return;

    const newRequirement: ResourceRequirement = {
      resource_id: `all_${resourceTypeId}`, // Special ID for "all"
      resource_type_id: resourceTypeId,
      resource_name: `Any ${resourceTypeName}`,
      quantity: 1,
      is_required: true,
      select_all: true
    };

    onChange('resource_requirements', [...resourceRequirements, newRequirement]);
  }, [resourceRequirements, onChange]);

  // Update a resource requirement
  const updateResourceRequirement = useCallback((index: number, updates: Partial<ResourceRequirement>) => {
    const updated = resourceRequirements.map((req, i) =>
      i === index ? { ...req, ...updates } : req
    );
    onChange('resource_requirements', updated);
  }, [resourceRequirements, onChange]);

  // Remove a resource requirement
  const removeResourceRequirement = useCallback((index: number) => {
    const updated = resourceRequirements.filter((_, i) => i !== index);
    onChange('resource_requirements', updated);
  }, [resourceRequirements, onChange]);

  // Check if a resource is already added
  const isResourceAdded = useCallback((resourceId: string) => {
    return resourceRequirements.some(r => r.resource_id === resourceId);
  }, [resourceRequirements]);

  // Get resource type name by ID
  const getResourceTypeName = useCallback((typeId: string) => {
    return resourceTypes.find(t => t.id === typeId)?.name || 'Unknown Type';
  }, [resourceTypes]);

  // Card styles
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
        Configure whether this block requires specific resources (team members, equipment, etc.)
      </p>

      <div className="space-y-6">
        {/* Service Type Selection */}
        <div>
          <label
            className="block text-sm font-medium mb-3"
            style={{ color: colors.utility.primaryText }}
          >
            Service Type
          </label>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Independent Option */}
            <div
              className="relative p-4 border-2 rounded-xl transition-all"
              style={cardStyle(serviceType === 'independent')}
              onClick={() => handleServiceTypeChange('independent')}
            >
              <div className="flex items-start gap-3">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{
                    backgroundColor: serviceType === 'independent'
                      ? `${colors.brand.primary}20`
                      : isDarkMode ? colors.utility.secondaryBackground : '#F3F4F6',
                  }}
                >
                  <Package
                    className="w-5 h-5"
                    style={{
                      color: serviceType === 'independent'
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
                    Independent Service
                  </h4>
                  <p className="text-xs mt-1" style={{ color: colors.utility.secondaryText }}>
                    A standalone service with fixed pricing. No specific resources required.
                  </p>
                </div>
                {serviceType === 'independent' && (
                  <div
                    className="w-5 h-5 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: colors.brand.primary }}
                  >
                    <Check className="w-3 h-3 text-white" />
                  </div>
                )}
              </div>
            </div>

            {/* Resource-Based Option */}
            <div
              className="relative p-4 border-2 rounded-xl transition-all"
              style={cardStyle(serviceType === 'resource_based')}
              onClick={() => handleServiceTypeChange('resource_based')}
            >
              <div className="flex items-start gap-3">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{
                    backgroundColor: serviceType === 'resource_based'
                      ? `${colors.brand.primary}20`
                      : isDarkMode ? colors.utility.secondaryBackground : '#F3F4F6',
                  }}
                >
                  <Users
                    className="w-5 h-5"
                    style={{
                      color: serviceType === 'resource_based'
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
                    Resource-Based Service
                  </h4>
                  <p className="text-xs mt-1" style={{ color: colors.utility.secondaryText }}>
                    Requires specific resources (team members, equipment, etc.)
                  </p>
                </div>
                {serviceType === 'resource_based' && (
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
        {serviceType === 'resource_based' && (
          <div className="animate-in fade-in slide-in-from-top-2 duration-200 space-y-4">
            {/* Resource Type Selector */}
            <div>
              <label
                className="block text-sm font-medium mb-2"
                style={{ color: colors.utility.primaryText }}
              >
                Select Resource Type
              </label>
              {loadingResourceTypes ? (
                <div className="flex items-center gap-2 py-3">
                  <Loader2 className="w-4 h-4 animate-spin" style={{ color: colors.brand.primary }} />
                  <span className="text-sm" style={{ color: colors.utility.secondaryText }}>
                    Loading resource types...
                  </span>
                </div>
              ) : resourceTypes.length > 0 ? (
                <select
                  value={selectedResourceTypeId}
                  onChange={(e) => {
                    setSelectedResourceTypeId(e.target.value);
                    setSearchQuery('');
                  }}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                  style={{
                    backgroundColor: colors.utility.primaryBackground,
                    borderColor: isDarkMode ? colors.utility.secondaryBackground : '#D1D5DB',
                    color: colors.utility.primaryText,
                  }}
                >
                  <option value="">Select a resource type...</option>
                  {resourceTypes.map(type => (
                    <option key={type.id} value={type.id}>
                      {type.name}
                    </option>
                  ))}
                </select>
              ) : (
                <div
                  className="p-3 rounded-lg flex items-center gap-2"
                  style={{
                    backgroundColor: `${colors.semantic.warning}10`,
                    border: `1px solid ${colors.semantic.warning}30`,
                  }}
                >
                  <AlertCircle className="w-4 h-4" style={{ color: colors.semantic.warning }} />
                  <span className="text-sm" style={{ color: colors.utility.primaryText }}>
                    No resource types available. Please configure resource types first.
                  </span>
                </div>
              )}
            </div>

            {/* Available Resources */}
            {selectedResourceTypeId && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label
                    className="text-sm font-medium"
                    style={{ color: colors.utility.primaryText }}
                  >
                    Available Resources
                  </label>
                  {/* Add All Button */}
                  <button
                    onClick={() => {
                      const typeName = getResourceTypeName(selectedResourceTypeId);
                      addAllResourcesOfType(selectedResourceTypeId, typeName);
                    }}
                    disabled={resourceRequirements.some(
                      r => r.resource_type_id === selectedResourceTypeId && r.select_all
                    )}
                    className="text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors disabled:opacity-50"
                    style={{
                      backgroundColor: `${colors.brand.primary}10`,
                      color: colors.brand.primary,
                    }}
                  >
                    <Plus className="w-3 h-3" />
                    Add "Any {getResourceTypeName(selectedResourceTypeId)}"
                  </button>
                </div>

                {/* Search */}
                <div className="relative mb-3">
                  <Search
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
                    style={{ color: colors.utility.secondaryText }}
                  />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search resources..."
                    className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm"
                    style={{
                      backgroundColor: colors.utility.primaryBackground,
                      borderColor: isDarkMode ? colors.utility.secondaryBackground : '#D1D5DB',
                      color: colors.utility.primaryText,
                    }}
                  />
                </div>

                {loadingResources ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin" style={{ color: colors.brand.primary }} />
                  </div>
                ) : filteredResources.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-64 overflow-y-auto p-1">
                    {filteredResources.map(resource => {
                      const isAdded = isResourceAdded(resource.id);
                      return (
                        <div
                          key={resource.id}
                          onClick={() => !isAdded && addResourceRequirement(resource)}
                          className={`p-3 border rounded-lg transition-all ${
                            isAdded ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:shadow-sm'
                          }`}
                          style={{
                            backgroundColor: colors.utility.primaryBackground,
                            borderColor: isAdded
                              ? colors.semantic.success
                              : isDarkMode ? colors.utility.secondaryBackground : '#E5E7EB',
                          }}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1 min-w-0">
                              <h5
                                className="text-sm font-medium truncate"
                                style={{ color: colors.utility.primaryText }}
                              >
                                {resource.display_name || resource.name}
                              </h5>
                              {resource.description && (
                                <p
                                  className="text-xs truncate mt-0.5"
                                  style={{ color: colors.utility.secondaryText }}
                                >
                                  {resource.description}
                                </p>
                              )}
                            </div>
                            {isAdded ? (
                              <CheckCircle
                                className="w-4 h-4 flex-shrink-0 ml-2"
                                style={{ color: colors.semantic.success }}
                              />
                            ) : (
                              <Plus
                                className="w-4 h-4 flex-shrink-0 ml-2"
                                style={{ color: colors.brand.primary }}
                              />
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div
                    className="p-6 rounded-lg text-center"
                    style={{
                      backgroundColor: isDarkMode ? colors.utility.secondaryBackground : '#F9FAFB',
                    }}
                  >
                    <Box className="w-8 h-8 mx-auto mb-2" style={{ color: colors.utility.secondaryText }} />
                    <p className="text-sm" style={{ color: colors.utility.secondaryText }}>
                      {searchQuery
                        ? 'No resources match your search'
                        : 'No resources available for this type'}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Selected Resources */}
            {resourceRequirements.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label
                    className="text-sm font-medium"
                    style={{ color: colors.utility.primaryText }}
                  >
                    Selected Resources ({resourceRequirements.length})
                  </label>
                </div>

                <div className="space-y-2">
                  {resourceRequirements.map((requirement, index) => (
                    <div
                      key={`${requirement.resource_id}-${index}`}
                      className="flex items-center gap-3 p-3 border rounded-lg"
                      style={{
                        backgroundColor: colors.utility.primaryBackground,
                        borderColor: isDarkMode ? colors.utility.secondaryBackground : '#E5E7EB',
                      }}
                    >
                      {/* Resource Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h5
                            className="text-sm font-medium truncate"
                            style={{ color: colors.utility.primaryText }}
                          >
                            {requirement.resource_name || 'Unknown Resource'}
                          </h5>
                          {requirement.select_all && (
                            <span
                              className="text-xs px-2 py-0.5 rounded-full"
                              style={{
                                backgroundColor: `${colors.semantic.info}15`,
                                color: colors.semantic.info,
                              }}
                            >
                              ANY
                            </span>
                          )}
                        </div>
                        <p
                          className="text-xs"
                          style={{ color: colors.utility.secondaryText }}
                        >
                          {getResourceTypeName(requirement.resource_type_id)}
                        </p>
                      </div>

                      {/* Quantity */}
                      <div className="flex items-center gap-2">
                        <label
                          className="text-xs"
                          style={{ color: colors.utility.secondaryText }}
                        >
                          Qty:
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="99"
                          value={requirement.quantity}
                          onChange={(e) => updateResourceRequirement(index, {
                            quantity: parseInt(e.target.value) || 1
                          })}
                          className="w-14 px-2 py-1 text-sm text-center border rounded"
                          style={{
                            backgroundColor: colors.utility.primaryBackground,
                            borderColor: isDarkMode ? colors.utility.secondaryBackground : '#D1D5DB',
                            color: colors.utility.primaryText,
                          }}
                        />
                      </div>

                      {/* Required Toggle */}
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={requirement.is_required}
                          onChange={(e) => updateResourceRequirement(index, {
                            is_required: e.target.checked
                          })}
                          style={{ accentColor: colors.brand.primary }}
                        />
                        <span
                          className="text-xs"
                          style={{ color: colors.utility.primaryText }}
                        >
                          Required
                        </span>
                      </label>

                      {/* Remove Button */}
                      <button
                        onClick={() => removeResourceRequirement(index)}
                        className="p-1.5 rounded hover:opacity-80 transition-colors"
                        style={{ color: colors.semantic.error }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Warning if resource-based but no resources selected */}
            {resourceRequirements.length === 0 && (
              <div
                className="flex items-start gap-2 p-3 rounded-lg"
                style={{
                  backgroundColor: `${colors.semantic.warning}10`,
                  border: `1px solid ${colors.semantic.warning}30`,
                }}
              >
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: colors.semantic.warning }} />
                <p className="text-xs" style={{ color: colors.utility.primaryText }}>
                  Please select at least one resource. You can select specific resources or choose
                  "Any [Resource Type]" to allow any resource of that type.
                </p>
              </div>
            )}

            {/* Info Box */}
            <div
              className="flex items-start gap-2 p-3 rounded-lg"
              style={{
                backgroundColor: `${colors.semantic.info}10`,
                border: `1px solid ${colors.semantic.info}30`,
              }}
            >
              <Info className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: colors.semantic.info }} />
              <div className="text-xs" style={{ color: colors.utility.primaryText }}>
                <p className="font-medium mb-1">How resource selection works:</p>
                <ul className="list-disc list-inside space-y-0.5">
                  <li><strong>Specific resource:</strong> Only that exact resource can fulfill the requirement</li>
                  <li><strong>Any [Type]:</strong> Any available resource of that type can be assigned</li>
                </ul>
              </div>
            </div>
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
              <strong>Service Type:</strong>{' '}
              {serviceType === 'independent' ? 'Independent (No resources required)' : 'Resource-Based'}
            </p>
            {serviceType === 'resource_based' && resourceRequirements.length > 0 && (
              <>
                <p>
                  <strong>Resources:</strong>{' '}
                  {resourceRequirements.length} resource(s) configured
                </p>
                <ul className="list-disc list-inside ml-2 mt-1">
                  {resourceRequirements.map((req, i) => (
                    <li key={i}>
                      {req.resource_name} × {req.quantity}
                      {req.is_required ? ' (Required)' : ' (Optional)'}
                      {req.select_all ? ' [Any]' : ''}
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
