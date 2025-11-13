// src/components/catalog/ServiceForm/ServiceConfigStep.tsx
import React, { useState, useCallback, useEffect } from 'react';
import { useTheme } from '../../../contexts/ThemeContext';
import { 
  Settings,
  DollarSign,
  Plus,
  Trash2,
  AlertTriangle,
  CheckCircle,
  Package,
  Users,
  Info
} from 'lucide-react';

// Import master data hooks - FIXED: Use real hooks
import {
  useTenantMasterData,
  useMasterDataDropdown
} from '../../../hooks/queries/useProductMasterdata';
import { useTenantContextMaster } from '../../../hooks/queries/useTenantContextMaster';

// PRODUCTION FIX: Import resource hooks for proper data fetching
import { useResources } from '../../../hooks/useResources';
import { useContactList } from '../../../hooks/useContacts';

// Import the TaxRateTagSelector component
import TaxRateTagSelector from '../shared/TaxRateTagSelector';

// Import types
import { 
  ServiceValidationErrors
} from '../../../types/catalog/service';

// Updated types to support multiple tax rates
interface ServicePricingForm {
  currency: string;
  amount: number;
  price_type: string;
  tax_inclusion: 'inclusive' | 'exclusive';
  tax_rate_ids?: string[]; // Changed to array for multiple selection
}

interface ServiceResourceForm {
  resource_id: string;
  resource_type_id: string;
  quantity: number;
  is_required: boolean;
}

interface ServiceConfigStepProps {
  serviceType: 'independent' | 'resource_based';
  pricingRecords: ServicePricingForm[];
  resourceRequirements: ServiceResourceForm[];
  errors: ServiceValidationErrors;
  isValidating: boolean;
  onChange: (updates: {
    service_type?: 'independent' | 'resource_based';
    pricing_records?: ServicePricingForm[];
    resource_requirements?: ServiceResourceForm[];
  }) => void;
}

const ServiceConfigStep: React.FC<ServiceConfigStepProps> = ({
  serviceType,
  pricingRecords,
  resourceRequirements,
  errors,
  isValidating,
  onChange
}) => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  // FIXED: Master data hooks - Use real data from tenant context
  const {
    currencies,
    taxRates,
    taxSettings,
    defaultTaxRate,
    resourceTypes,
    isLoading: loadingTenantContext
  } = useTenantContextMaster({
    includeResources: true,
    includeTax: true,
    includeConstants: true
  });

  const { options: priceTypeOptions, isLoading: loadingPriceTypes } = useMasterDataDropdown('pricing_types', 'tenant');
  const { data: serviceCategoriesData, isLoading: loadingServiceCategories } = useTenantMasterData('service_categories');

  // Local state for resource management
  const [selectedResourceType, setSelectedResourceType] = useState<string>('');

  // PRODUCTION FIX: Fetch actual resources based on selected type
  const {
    data: manualResources,
    loading: isLoadingManualResources
  } = useResources(selectedResourceType || undefined);

  // PRODUCTION FIX: Fetch contacts for contact-based resource types
  const selectedResourceTypeData = resourceTypes?.find(rt => rt.id === selectedResourceType);
  const isContactBased = selectedResourceTypeData?.requires_human_assignment || false;

  const {
    data: contactsData,
    loading: isLoadingContacts
  } = useContactList({
    classifications: [selectedResourceTypeData?.name?.toLowerCase().includes('partner')
      ? 'partner'
      : 'team_member'],
    status: 'active',
    enabled: isContactBased && !!selectedResourceType
  });

  // FIXED: Process service categories for resource-based services
  const serviceCategories = serviceCategoriesData?.data?.map(item => ({
    id: item.id,
    name: item.description || `Category ${item.id}`,
    description: item.description,
    value: item.id
  })) || [];

  // FIXED: Process currencies with default selection
  const currencyOptions = currencies?.map(currency => ({
    value: currency.code,
    label: `${currency.name} (${currency.symbol})`,
    symbol: currency.symbol,
    isDefault: currency.is_default || currency.code === 'INR' // Add default logic
  })) || [];

  // FIXED: Get default currency
  const getDefaultCurrency = useCallback(() => {
    // First try to find default from API
    const defaultFromAPI = currencyOptions.find(c => c.isDefault);
    if (defaultFromAPI) return defaultFromAPI.value;
    
    // Fallback to INR
    const inr = currencyOptions.find(c => c.value === 'INR');
    if (inr) return inr.value;
    
    // Last fallback to first available
    return currencyOptions[0]?.value || 'INR';
  }, [currencyOptions]);

  // Process tax rates for the tag selector
  const processedTaxRates = taxRates?.map(rate => ({
    id: rate.id,
    name: rate.name,
    rate: rate.rate,
    isDefault: rate.is_default
  })) || [];

  // PRODUCTION FIX: Transform contacts to resource format (reuse logic from ResourcesPanel)
  const transformContactsToResources = useCallback((contacts: any[]) => {
    if (!contacts || contacts.length === 0) return [];

    return contacts.map(contact => ({
      id: contact.id,
      name: contact.name || contact.company_name || 'Unnamed Contact',
      display_name: contact.displayName || contact.name || contact.company_name || 'Unnamed Contact',
      description: contact.notes || contact.email || contact.phone || 'Contact resource',
      resource_type_id: selectedResourceType,
      contact_id: contact.id,
      is_active: contact.status === 'active',
      created_at: contact.created_at,
      updated_at: contact.updated_at,
      _source: 'contact'
    }));
  }, [selectedResourceType]);

  // PRODUCTION FIX: Get actual resources based on type
  const actualResources = useCallback(() => {
    if (!selectedResourceType) return [];

    if (isContactBased) {
      return transformContactsToResources(contactsData || []);
    } else {
      return manualResources || [];
    }
  }, [selectedResourceType, isContactBased, contactsData, manualResources, transformContactsToResources]);

  // PRODUCTION FIX: Helper to get resources by category using real data
  const getResourcesByCategory = useCallback((categoryId: string) => {
    const resources = actualResources();
    return resources.filter(resource =>
      resource.resource_type_id === categoryId ||
      resource.category_id === categoryId
    );
  }, [actualResources]);

  // PRODUCTION FIX: Check if resources are loading
  const isLoadingResources = isLoadingManualResources || isLoadingContacts;

  // Update service type
  const handleServiceTypeChange = useCallback((newType: 'independent' | 'resource_based') => {
    onChange({ 
      service_type: newType,
      ...(newType === 'independent' && { resource_requirements: [] })
    });
  }, [onChange]);

  // FIXED: Add new pricing record with proper defaults and tax rates
  const addPricingRecord = useCallback(() => {
    const defaultCurrency = getDefaultCurrency();
    let defaultTaxRateIds: string[] = [];
    
    // Set default tax rates
    if (defaultTaxRate) {
      defaultTaxRateIds = [defaultTaxRate.id];
    } else if (processedTaxRates.length > 0) {
      // If no default, use the first available tax rate
      defaultTaxRateIds = [processedTaxRates[0].id];
    }
    
    const newPricing: ServicePricingForm = {
      currency: defaultCurrency,
      amount: 0,
      price_type: priceTypeOptions[0]?.value || 'fixed',
      tax_inclusion: taxSettings?.display_mode === 'including_tax' ? 'inclusive' : 'exclusive',
      tax_rate_ids: defaultTaxRateIds
    };
    
    onChange({
      pricing_records: [...pricingRecords, newPricing]
    });
  }, [
    pricingRecords, 
    getDefaultCurrency, 
    priceTypeOptions, 
    taxSettings, 
    defaultTaxRate,
    processedTaxRates,
    onChange
  ]);

  // Update pricing record
  const updatePricingRecord = useCallback((index: number, updates: Partial<ServicePricingForm>) => {
    const updatedRecords = pricingRecords.map((record, i) => 
      i === index ? { ...record, ...updates } : record
    );
    onChange({ pricing_records: updatedRecords });
  }, [pricingRecords, onChange]);

  // Remove pricing record
  const removePricingRecord = useCallback((index: number) => {
    const updatedRecords = pricingRecords.filter((_, i) => i !== index);
    onChange({ pricing_records: updatedRecords });
  }, [pricingRecords, onChange]);

  // FIXED: Add resource requirement using real resource data
  const addResourceRequirement = useCallback((resourceId: string, resourceTypeId: string) => {
    const newRequirement: ServiceResourceForm = {
      resource_id: resourceId,
      resource_type_id: resourceTypeId,
      quantity: 1,
      is_required: true
    };
    
    onChange({
      resource_requirements: [...resourceRequirements, newRequirement]
    });
  }, [resourceRequirements, onChange]);

  // Update resource requirement
  const updateResourceRequirement = useCallback((index: number, updates: Partial<ServiceResourceForm>) => {
    const updatedRequirements = resourceRequirements.map((req, i) => 
      i === index ? { ...req, ...updates } : req
    );
    onChange({ resource_requirements: updatedRequirements });
  }, [resourceRequirements, onChange]);

  // Remove resource requirement
  const removeResourceRequirement = useCallback((index: number) => {
    const updatedRequirements = resourceRequirements.filter((_, i) => i !== index);
    onChange({ resource_requirements: updatedRequirements });
  }, [resourceRequirements, onChange]);

  // FIXED: Auto-add first pricing record with proper default currency
  useEffect(() => {
    if (pricingRecords.length === 0 && !loadingTenantContext && currencyOptions.length > 0) {
      addPricingRecord();
    }
  }, [pricingRecords.length, loadingTenantContext, currencyOptions.length, addPricingRecord]);

  // UPDATED: Calculate pricing totals with multiple tax rates
  const calculateTotal = (pricing: ServicePricingForm) => {
    const selectedTaxRates = processedTaxRates.filter(rate => 
      pricing.tax_rate_ids?.includes(rate.id)
    );
    const totalTaxRate = selectedTaxRates.reduce((sum, rate) => sum + rate.rate, 0);
    const taxAmount = pricing.amount * totalTaxRate / 100;
    
    if (pricing.tax_inclusion === 'inclusive') {
      return pricing.amount;
    } else {
      return pricing.amount + taxAmount;
    }
  };

  // UPDATED: Get tax breakdown for display
  const getTaxBreakdown = (pricing: ServicePricingForm) => {
    const selectedTaxRates = processedTaxRates.filter(rate => 
      pricing.tax_rate_ids?.includes(rate.id)
    );
    const totalTaxRate = selectedTaxRates.reduce((sum, rate) => sum + rate.rate, 0);
    const taxAmount = pricing.amount * totalTaxRate / 100;
    
    return {
      selectedTaxRates,
      totalTaxRate,
      taxAmount,
      baseAmount: pricing.amount,
      totalAmount: calculateTotal(pricing)
    };
  };

  const formatCurrency = (amount: number, currency: string) => {
    const currencyData = currencies?.find(c => c.code === currency);
    const symbol = currencyData?.symbol || currency;
    return `${symbol} ${amount.toFixed(2)}`;
  };

  // Show loading state
  if (loadingTenantContext) {
    return (
      <div className="text-center py-8">
        <div 
          className="animate-spin rounded-full h-8 w-8 border-b-2 mx-auto mb-4" 
          style={{ borderColor: colors.brand.primary }}
        />
        <p style={{ color: colors.utility.secondaryText }}>Loading configuration data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Step Header */}
      <div className="text-center mb-8">
        <h2 
          className="text-xl font-semibold mb-2 transition-colors"
          style={{ color: colors.utility.primaryText }}
        >
          Service Configuration & Pricing
        </h2>
        <p 
          className="transition-colors"
          style={{ color: colors.utility.secondaryText }}
        >
          Configure your service type and pricing details
        </p>
      </div>

      {/* Service Type Selection */}
      <div 
        className="border rounded-lg p-6"
        style={{
          backgroundColor: colors.utility.secondaryBackground,
          borderColor: colors.utility.primaryText + '20'
        }}
      >
        <h3 
          className="text-lg font-semibold mb-4 flex items-center gap-2 transition-colors"
          style={{ color: colors.utility.primaryText }}
        >
          <Settings className="h-5 w-5" />
          Service Type
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Independent Service */}
          <div 
            className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
              serviceType === 'independent' ? 'ring-2' : ''
            }`}
            style={{
              borderColor: serviceType === 'independent' 
                ? colors.brand.primary 
                : colors.utility.primaryText + '20',
              backgroundColor: serviceType === 'independent' 
                ? colors.brand.primary + '10' 
                : colors.utility.primaryBackground,
              '--tw-ring-color': colors.brand.primary
            } as React.CSSProperties}
            onClick={() => handleServiceTypeChange('independent')}
          >
            <div className="flex items-center gap-3 mb-3">
              <div 
                className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{ 
                  backgroundColor: serviceType === 'independent' 
                    ? colors.brand.primary 
                    : colors.utility.secondaryBackground 
                }}
              >
                <Package 
                  className="h-4 w-4"
                  style={{ 
                    color: serviceType === 'independent' 
                      ? '#ffffff' 
                      : colors.utility.primaryText 
                  }}
                />
              </div>
              <h4 
                className="font-medium transition-colors"
                style={{ color: colors.utility.primaryText }}
              >
                Independent Service
              </h4>
              {serviceType === 'independent' && (
                <CheckCircle 
                  className="h-5 w-5 ml-auto"
                  style={{ color: colors.brand.primary }}
                />
              )}
            </div>
            <p 
              className="text-sm transition-colors"
              style={{ color: colors.utility.secondaryText }}
            >
              A standalone service with simple pricing. No resource dependencies.
            </p>
          </div>

          {/* Resource-Based Service */}
          <div 
            className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
              serviceType === 'resource_based' ? 'ring-2' : ''
            }`}
            style={{
              borderColor: serviceType === 'resource_based' 
                ? colors.brand.primary 
                : colors.utility.primaryText + '20',
              backgroundColor: serviceType === 'resource_based' 
                ? colors.brand.primary + '10' 
                : colors.utility.primaryBackground,
              '--tw-ring-color': colors.brand.primary
            } as React.CSSProperties}
            onClick={() => handleServiceTypeChange('resource_based')}
          >
            <div className="flex items-center gap-3 mb-3">
              <div 
                className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{ 
                  backgroundColor: serviceType === 'resource_based' 
                    ? colors.brand.primary 
                    : colors.utility.secondaryBackground 
                }}
              >
                <Users 
                  className="h-4 w-4"
                  style={{ 
                    color: serviceType === 'resource_based' 
                      ? '#ffffff' 
                      : colors.utility.primaryText 
                  }}
                />
              </div>
              <h4 
                className="font-medium transition-colors"
                style={{ color: colors.utility.primaryText }}
              >
                Resource-Based Service
              </h4>
              {serviceType === 'resource_based' && (
                <CheckCircle 
                  className="h-5 w-5 ml-auto"
                  style={{ color: colors.brand.primary }}
                />
              )}
            </div>
            <p 
              className="text-sm transition-colors"
              style={{ color: colors.utility.secondaryText }}
            >
              A service that requires specific resources (team members, equipment, etc.)
            </p>
          </div>
        </div>
      </div>

      {/* FIXED: Resource Requirements (for resource-based services) */}
      {serviceType === 'resource_based' && (
        <div 
          className="border rounded-lg p-6"
          style={{
            backgroundColor: colors.utility.secondaryBackground,
            borderColor: colors.utility.primaryText + '20'
          }}
        >
          <h3 
            className="text-lg font-semibold mb-4 flex items-center gap-2 transition-colors"
            style={{ color: colors.utility.primaryText }}
          >
            <Users className="h-5 w-5" />
            Resource Requirements
          </h3>

          {loadingServiceCategories ? (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 mx-auto mb-2" 
                   style={{ borderColor: colors.brand.primary }}></div>
              <p style={{ color: colors.utility.secondaryText }}>Loading service categories...</p>
            </div>
          ) : (
            <>
              {/* PRODUCTION FIX: Resource Type Selector - use resourceTypes not serviceCategories */}
              {resourceTypes && resourceTypes.length > 0 ? (
                <div className="mb-6">
                  <label
                    className="block text-sm font-medium mb-2 transition-colors"
                    style={{ color: colors.utility.primaryText }}
                  >
                    Select Resource Type
                  </label>
                  <select
                    value={selectedResourceType}
                    onChange={(e) => setSelectedResourceType(e.target.value)}
                    className="w-full px-3 py-2 border rounded-md transition-colors"
                    style={{
                      backgroundColor: colors.utility.primaryBackground,
                      borderColor: colors.utility.primaryText + '40',
                      color: colors.utility.primaryText
                    }}
                  >
                    <option value="">Select resource type...</option>
                    {resourceTypes.map(type => (
                      <option key={type.id} value={type.id}>
                        {type.name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div 
                  className="mb-6 p-4 rounded-lg flex items-center gap-2"
                  style={{
                    backgroundColor: colors.semantic.warning + '10',
                    borderColor: colors.semantic.warning + '40'
                  }}
                >
                  <AlertTriangle 
                    className="h-4 w-4"
                    style={{ color: colors.semantic.warning }}
                  />
                  <span
                    className="text-sm"
                    style={{ color: colors.semantic.warning }}
                  >
                    No resource types available. Please contact support.
                  </span>
                </div>
              )}

              {/* FIXED: Available Resources using real data */}
              {selectedResourceType && (
                <div className="mb-6">
                  <h4 
                    className="text-sm font-medium mb-3 transition-colors"
                    style={{ color: colors.utility.primaryText }}
                  >
                    Available Resources ({getResourcesByCategory(selectedResourceType).length})
                  </h4>
                  
                  {getResourcesByCategory(selectedResourceType).length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {getResourcesByCategory(selectedResourceType).map(resource => {
                        const isAdded = resourceRequirements.some(req => req.resource_id === resource.id);
                        
                        return (
                          <div 
                            key={resource.id}
                            className={`border rounded-lg p-3 cursor-pointer transition-all ${
                              isAdded ? 'opacity-50' : 'hover:shadow-md'
                            }`}
                            style={{
                              backgroundColor: colors.utility.primaryBackground,
                              borderColor: isAdded 
                                ? colors.semantic.success + '40'
                                : colors.utility.primaryText + '20'
                            }}
                            onClick={() => {
                              if (!isAdded) {
                                addResourceRequirement(resource.id, resource.resource_type_id || selectedResourceType);
                              }
                            }}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <h5 
                                  className="font-medium text-sm transition-colors"
                                  style={{ color: colors.utility.primaryText }}
                                >
                                  {resource.display_name || resource.name || 'Unnamed Resource'}
                                </h5>
                                <p 
                                  className="text-xs transition-colors"
                                  style={{ color: colors.utility.secondaryText }}
                                >
                                  {resource.description || 'No description available'}
                                </p>
                              </div>
                              {isAdded ? (
                                <CheckCircle 
                                  className="h-4 w-4"
                                  style={{ color: colors.semantic.success }}
                                />
                              ) : (
                                <Plus 
                                  className="h-4 w-4"
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
                      className="p-4 rounded-lg text-center"
                      style={{
                        backgroundColor: colors.utility.primaryBackground,
                        borderColor: colors.utility.primaryText + '20'
                      }}
                    >
                      <p 
                        className="text-sm"
                        style={{ color: colors.utility.secondaryText }}
                      >
                        No resources available for this category.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Selected Resources */}
              {resourceRequirements.length > 0 && (
                <div>
                  <h4 
                    className="text-sm font-medium mb-3 transition-colors"
                    style={{ color: colors.utility.primaryText }}
                  >
                    Selected Resources ({resourceRequirements.length})
                  </h4>
                  <div className="space-y-3">
                    {resourceRequirements.map((requirement, index) => {
                      const resource = actualResources().find(r => r.id === requirement.resource_id);
                      
                      return (
                        <div 
                          key={index}
                          className="flex items-center gap-4 p-3 border rounded-lg"
                          style={{
                            backgroundColor: colors.utility.primaryBackground,
                            borderColor: colors.utility.primaryText + '20'
                          }}
                        >
                          <div className="flex-1">
                            <h5 
                              className="font-medium text-sm transition-colors"
                              style={{ color: colors.utility.primaryText }}
                            >
                              {resource?.display_name || resource?.name || 'Unknown Resource'}
                            </h5>
                            <p 
                              className="text-xs transition-colors"
                              style={{ color: colors.utility.secondaryText }}
                            >
                              {resource?.description || 'No description available'}
                            </p>
                          </div>
                          
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2">
                              <label 
                                className="text-xs transition-colors"
                                style={{ color: colors.utility.primaryText }}
                              >
                                Qty:
                              </label>
                              <input
                                type="number"
                                min="1"
                                max="999"
                                value={requirement.quantity}
                                onChange={(e) => updateResourceRequirement(index, { 
                                  quantity: parseInt(e.target.value) || 1 
                                })}
                                className="w-16 px-2 py-1 border rounded text-sm"
                                style={{
                                  backgroundColor: colors.utility.primaryBackground,
                                  borderColor: colors.utility.primaryText + '40',
                                  color: colors.utility.primaryText
                                }}
                              />
                            </div>
                            
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={requirement.is_required}
                                onChange={(e) => updateResourceRequirement(index, { 
                                  is_required: e.target.checked 
                                })}
                                style={{ accentColor: colors.brand.primary }}
                              />
                              <span 
                                className="text-xs transition-colors"
                                style={{ color: colors.utility.primaryText }}
                              >
                                Required
                              </span>
                            </label>
                            
                            <button
                              onClick={() => removeResourceRequirement(index)}
                              className="p-1 hover:opacity-80 transition-colors"
                              style={{ color: colors.semantic.error }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Pricing Configuration */}
      <div 
        className="border rounded-lg p-6"
        style={{
          backgroundColor: colors.utility.secondaryBackground,
          borderColor: colors.utility.primaryText + '20'
        }}
      >
        <div className="flex items-center justify-between mb-6">
          <h3 
            className="text-lg font-semibold flex items-center gap-2 transition-colors"
            style={{ color: colors.utility.primaryText }}
          >
            <DollarSign className="h-5 w-5" />
            Pricing Configuration
          </h3>
          <button
            onClick={addPricingRecord}
            className="flex items-center gap-2 px-3 py-2 border rounded-md hover:opacity-80 transition-colors"
            style={{
              borderColor: colors.brand.primary,
              color: colors.brand.primary,
              backgroundColor: colors.brand.primary + '10'
            }}
          >
            <Plus className="h-4 w-4" />
            Add Pricing
          </button>
        </div>

        {/* Tax Display Info */}
        {taxSettings && (
          <div 
            className="mb-6 p-3 rounded-lg flex items-center gap-2"
            style={{
              backgroundColor: colors.brand.primary + '10',
              borderColor: colors.brand.primary + '40'
            }}
          >
            <Info 
              className="h-4 w-4"
              style={{ color: colors.brand.primary }}
            />
            <span 
              className="text-sm transition-colors"
              style={{ color: colors.brand.primary }}
            >
              Default tax display: {taxSettings.display_mode === 'including_tax' ? 'Including tax' : 'Excluding tax'}
            </span>
          </div>
        )}

        {/* Pricing Records */}
        <div className="space-y-6">
          {pricingRecords.map((pricing, index) => {
            const taxBreakdown = getTaxBreakdown(pricing);

            return (
              <div 
                key={index}
                className="border rounded-lg p-6"
                style={{
                  backgroundColor: colors.utility.primaryBackground,
                  borderColor: colors.utility.primaryText + '20'
                }}
              >
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                  {/* Currency */}
                  <div>
                    <label 
                      className="block text-sm font-medium mb-2 transition-colors"
                      style={{ color: colors.utility.primaryText }}
                    >
                      Currency *
                    </label>
                    <select
                      value={pricing.currency}
                      onChange={(e) => updatePricingRecord(index, { currency: e.target.value })}
                      className="w-full px-3 py-2 border rounded-md transition-colors"
                      style={{
                        backgroundColor: colors.utility.primaryBackground,
                        borderColor: colors.utility.primaryText + '40',
                        color: colors.utility.primaryText
                      }}
                    >
                      {currencyOptions.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Amount */}
                  <div>
                    <label 
                      className="block text-sm font-medium mb-2 transition-colors"
                      style={{ color: colors.utility.primaryText }}
                    >
                      Amount *
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={pricing.amount}
                      onChange={(e) => updatePricingRecord(index, { 
                        amount: parseFloat(e.target.value) || 0 
                      })}
                      placeholder="0.00"
                      className="w-full px-3 py-2 border rounded-md transition-colors"
                      style={{
                        backgroundColor: colors.utility.primaryBackground,
                        borderColor: colors.utility.primaryText + '40',
                        color: colors.utility.primaryText
                      }}
                    />
                  </div>

                  {/* Price Type */}
                  <div>
                    <label 
                      className="block text-sm font-medium mb-2 transition-colors"
                      style={{ color: colors.utility.primaryText }}
                    >
                      Price Type *
                    </label>
                    <select
                      value={pricing.price_type}
                      onChange={(e) => updatePricingRecord(index, { price_type: e.target.value })}
                      disabled={loadingPriceTypes}
                      className="w-full px-3 py-2 border rounded-md transition-colors"
                      style={{
                        backgroundColor: colors.utility.primaryBackground,
                        borderColor: colors.utility.primaryText + '40',
                        color: colors.utility.primaryText
                      }}
                    >
                      <option value="">
                        {loadingPriceTypes ? 'Loading...' : 'Select price type'}
                      </option>
                      {priceTypeOptions.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Tax Configuration Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  {/* Tax Inclusion */}
                  <div>
                    <label 
                      className="block text-sm font-medium mb-3 transition-colors"
                      style={{ color: colors.utility.primaryText }}
                    >
                      Tax Display
                    </label>
                    <div className="space-y-2">
                      <label 
                        className="flex items-center gap-2 p-3 border rounded cursor-pointer hover:bg-opacity-50 transition-colors"
                        style={{
                          borderColor: colors.utility.primaryText + '20',
                          backgroundColor: pricing.tax_inclusion === 'exclusive' 
                            ? colors.brand.primary + '10' 
                            : 'transparent'
                        }}
                      >
                        <input
                          type="radio"
                          name={`tax-inclusion-${index}`}
                          checked={pricing.tax_inclusion === 'exclusive'}
                          onChange={() => updatePricingRecord(index, { tax_inclusion: 'exclusive' })}
                          style={{ accentColor: colors.brand.primary }}
                        />
                        <div>
                          <span 
                            className="text-sm font-medium transition-colors"
                            style={{ color: colors.utility.primaryText }}
                          >
                            Excluding tax
                          </span>
                          <p 
                            className="text-xs transition-colors"
                            style={{ color: colors.utility.secondaryText }}
                          >
                            Show prices without tax
                          </p>
                        </div>
                      </label>

                      <label 
                        className="flex items-center gap-2 p-3 border rounded cursor-pointer hover:bg-opacity-50 transition-colors"
                        style={{
                          borderColor: colors.utility.primaryText + '20',
                          backgroundColor: pricing.tax_inclusion === 'inclusive' 
                            ? colors.brand.primary + '10' 
                            : 'transparent'
                        }}
                      >
                        <input
                          type="radio"
                          name={`tax-inclusion-${index}`}
                          checked={pricing.tax_inclusion === 'inclusive'}
                          onChange={() => updatePricingRecord(index, { tax_inclusion: 'inclusive' })}
                          style={{ accentColor: colors.brand.primary }}
                        />
                        <div>
                          <span 
                            className="text-sm font-medium transition-colors"
                            style={{ color: colors.utility.primaryText }}
                          >
                            Including tax
                          </span>
                          <p 
                            className="text-xs transition-colors"
                            style={{ color: colors.utility.secondaryText }}
                          >
                            Show prices with tax
                          </p>
                        </div>
                      </label>
                    </div>
                  </div>

                  {/* Tax Rate Tag Selector */}
                  <div>
                    <label 
                      className="block text-sm font-medium mb-2 transition-colors"
                      style={{ color: colors.utility.primaryText }}
                    >
                      Applicable Tax Rates
                    </label>
                    <TaxRateTagSelector
                      availableTaxRates={processedTaxRates}
                      selectedTaxRateIds={pricing.tax_rate_ids || []}
                      onChange={(selectedIds) => updatePricingRecord(index, { tax_rate_ids: selectedIds })}
                      placeholder="Select applicable tax rates..."
                      maxTags={5}
                      error={errors[`pricing_${index}_tax_rates`]}
                    />
                  </div>
                </div>

                {/* Enhanced Pricing Summary */}
                <div 
                  className="border rounded-lg p-4"
                  style={{
                    backgroundColor: colors.utility.secondaryBackground,
                    borderColor: colors.utility.primaryText + '20'
                  }}
                >
                  <h5 
                    className="font-medium mb-3"
                    style={{ color: colors.utility.primaryText }}
                  >
                    Pricing Breakdown
                  </h5>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span style={{ color: colors.utility.secondaryText }}>Base Amount:</span>
                      <span style={{ color: colors.utility.primaryText }}>
                        {formatCurrency(taxBreakdown.baseAmount, pricing.currency)}
                      </span>
                    </div>
                    
                    {taxBreakdown.selectedTaxRates.length > 0 && (
                      <>
                        {taxBreakdown.selectedTaxRates.map(rate => (
                          <div key={rate.id} className="flex justify-between text-xs">
                            <span style={{ color: colors.utility.secondaryText }}>
                              {rate.name} ({rate.rate}%):
                            </span>
                            <span style={{ color: colors.utility.primaryText }}>
                              {formatCurrency(pricing.amount * rate.rate / 100, pricing.currency)}
                            </span>
                          </div>
                        ))}
                        
                        <div className="flex justify-between font-medium pt-2 border-t" 
                             style={{ borderColor: colors.utility.primaryText + '20' }}>
                          <span style={{ color: colors.utility.primaryText }}>
                            Total Tax ({taxBreakdown.totalTaxRate.toFixed(1)}%):
                          </span>
                          <span style={{ color: colors.semantic.warning }}>
                            {formatCurrency(taxBreakdown.taxAmount, pricing.currency)}
                          </span>
                        </div>
                      </>
                    )}
                    
                    <div 
                      className="flex justify-between font-bold text-lg pt-2 border-t"
                      style={{ borderColor: colors.utility.primaryText + '20' }}
                    >
                      <span style={{ color: colors.utility.primaryText }}>Final Total:</span>
                      <span style={{ color: colors.brand.primary }}>
                        {formatCurrency(taxBreakdown.totalAmount, pricing.currency)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Remove Button */}
                {pricingRecords.length > 1 && (
                  <div className="flex justify-end mt-4">
                    <button
                      onClick={() => removePricingRecord(index)}
                      className="flex items-center gap-2 px-3 py-2 text-sm hover:opacity-80 transition-colors"
                      style={{ color: colors.semantic.error }}
                    >
                      <Trash2 className="h-4 w-4" />
                      Remove Pricing
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Validation Summary */}
      {isValidating && Object.keys(errors).length > 0 && (
        <div 
          className="border rounded-lg p-4"
          style={{
            backgroundColor: colors.semantic.error + '10',
            borderColor: colors.semantic.error + '40'
          }}
        >
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle 
              className="h-5 w-5"
              style={{ color: colors.semantic.error }}
            />
            <h3 
              className="font-medium"
              style={{ color: colors.semantic.error }}
            >
              Please fix the following errors:
            </h3>
          </div>
          <ul className="list-disc list-inside space-y-1">
            {Object.entries(errors).map(([field, message]) => (
              <li 
                key={field}
                className="text-sm"
                style={{ color: colors.semantic.error }}
              >
                {message}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default ServiceConfigStep;