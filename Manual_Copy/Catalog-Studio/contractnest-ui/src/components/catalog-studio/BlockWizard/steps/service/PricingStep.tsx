// src/components/catalog-studio/BlockWizard/steps/service/PricingStep.tsx
// ✅ Phase 8: Updated for resource_requirements structure
// Per-resource pricing: Each specific resource gets its own price
// Example: Consultation by Dr. Bhavana - 500 Rs, Consultation by Dr. Hema - 600 Rs

import React, { useState, useEffect, useCallback } from 'react';
import {
  DollarSign,
  Percent,
  Calculator,
  Plus,
  Trash2,
  Lightbulb,
  Users,
  Globe,
  User,
  Loader2,
} from 'lucide-react';
import { useTheme } from '../../../../../contexts/ThemeContext';
import { Block } from '../../../../../types/catalogStudio';
import { currencyOptions, getCurrencySymbol } from '../../../../../utils/constants/currencies';
import { useTaxRatesDropdown } from '../../../../../hooks/queries/useProductMasterdata';

// =================================================================
// TYPES
// =================================================================

// Resource requirement from ResourceDependencyStep
interface ResourceRequirement {
  resource_id: string;
  resource_type_id: string;
  resource_name?: string;
  quantity: number;
  is_required: boolean;
  select_all?: boolean;
}

// Pricing record for independent pricing
interface PricingRecord {
  id: string;
  currency: string;
  amount: number;
  price_type: 'fixed' | 'hourly' | 'per_unit' | 'price_range';
  tax_inclusion: 'inclusive' | 'exclusive';
  tax_rate_id?: string;
  tax_rate?: number;
  billing_cycle?: string;
  is_active: boolean;
}

// Pricing for a specific resource (e.g., Dr. Bhavana - 500 Rs)
interface ResourcePricingEntry {
  id: string;
  resource_id: string;           // The specific resource ID
  resource_name: string;         // Display name (e.g., "Dr. Bhavana")
  resource_type_id: string;      // Type (e.g., "team_staff")
  currency: string;
  amount: number;
  price_type: 'fixed' | 'hourly' | 'per_unit';
  tax_inclusion: 'inclusive' | 'exclusive';
  tax_rate_id?: string;
  tax_rate?: number;
  is_active: boolean;
}

interface PricingTier {
  id: string;
  name: string;
  price: number;
  currency: string;
  description?: string;
}

interface PricingStepProps {
  formData: Partial<Block>;
  onChange: (field: string, value: unknown) => void;
}

type PriceType = 'fixed' | 'hourly' | 'tiered' | 'custom';

// =================================================================
// COMPONENT
// =================================================================

const PricingStep: React.FC<PricingStepProps> = ({ formData, onChange }) => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  // Tax rates from API
  const { options: taxRateOptions, isLoading: taxLoading } = useTaxRatesDropdown();

  // Get service type and resource requirements from formData (set in ResourceDependencyStep)
  const serviceType = (formData.service_type as string) || 'independent';
  const resourceRequirements = (formData.resource_requirements as ResourceRequirement[]) || [];

  // Default currency
  const defaultCurrency = 'INR';

  // =================================================================
  // STATE - Independent Pricing Records
  // =================================================================

  const [pricingRecords, setPricingRecords] = useState<PricingRecord[]>(() => {
    const existing = formData.pricing_records as PricingRecord[];
    if (existing && existing.length > 0) return existing;
    return [
      {
        id: '1',
        currency: defaultCurrency,
        amount: 0,
        price_type: 'fixed',
        tax_inclusion: 'exclusive',
        is_active: true,
      },
    ];
  });

  // =================================================================
  // STATE - Resource-Based Pricing (per specific resource)
  // =================================================================

  const [resourcePricing, setResourcePricing] = useState<ResourcePricingEntry[]>(() => {
    const existing = formData.resource_pricing as ResourcePricingEntry[];
    if (existing && existing.length > 0) return existing;

    // Initialize from resource requirements
    return resourceRequirements.map((req, idx) => ({
      id: `rp-${idx}-${Date.now()}`,
      resource_id: req.resource_id,
      resource_name: req.resource_name || 'Unknown Resource',
      resource_type_id: req.resource_type_id,
      currency: defaultCurrency,
      amount: 0,
      price_type: 'fixed' as const,
      tax_inclusion: 'exclusive' as const,
      is_active: true,
    }));
  });

  // Tiered pricing
  const [tiers, setTiers] = useState<PricingTier[]>(
    (formData.pricing_tiers as PricingTier[]) || []
  );

  const [priceType, setPriceType] = useState<PriceType>(
    (formData.price_type as PriceType) || 'fixed'
  );

  // Dropdown states
  const [addCurrencyDropdown, setAddCurrencyDropdown] = useState(false);
  const [expandedResource, setExpandedResource] = useState<string | null>(null);

  // "Apply to All" pricing mode
  const [useUniformPricing, setUseUniformPricing] = useState<boolean>(
    (formData.use_uniform_pricing as boolean) || false
  );
  const [uniformPrice, setUniformPrice] = useState<number>(
    (formData.uniform_price as number) || 0
  );
  const [uniformCurrency, setUniformCurrency] = useState<string>(
    (formData.uniform_currency as string) || defaultCurrency
  );
  const [uniformPriceType, setUniformPriceType] = useState<'fixed' | 'hourly' | 'per_unit'>(
    (formData.uniform_price_type as 'fixed' | 'hourly' | 'per_unit') || 'fixed'
  );
  const [uniformTaxRateId, setUniformTaxRateId] = useState<string>(
    (formData.uniform_tax_rate_id as string) || ''
  );
  const [uniformTaxInclusion, setUniformTaxInclusion] = useState<'inclusive' | 'exclusive'>(
    (formData.uniform_tax_inclusion as 'inclusive' | 'exclusive') || 'exclusive'
  );

  // =================================================================
  // SYNC STATE TO FORM DATA
  // =================================================================

  useEffect(() => {
    if (serviceType === 'independent') {
      onChange('pricing_records', pricingRecords);
      onChange('price_type', priceType);
      onChange('pricing_tiers', tiers);
    }
  }, [pricingRecords, priceType, tiers, serviceType]);

  useEffect(() => {
    if (serviceType === 'resource_based') {
      onChange('resource_pricing', resourcePricing);
      onChange('use_uniform_pricing', useUniformPricing);
      if (useUniformPricing) {
        onChange('uniform_price', uniformPrice);
        onChange('uniform_currency', uniformCurrency);
        onChange('uniform_price_type', uniformPriceType);
        onChange('uniform_tax_rate_id', uniformTaxRateId);
        onChange('uniform_tax_inclusion', uniformTaxInclusion);
      }
    }
  }, [resourcePricing, serviceType, useUniformPricing, uniformPrice, uniformCurrency, uniformPriceType, uniformTaxRateId, uniformTaxInclusion]);

  // Update resource pricing when requirements change
  useEffect(() => {
    if (serviceType === 'resource_based' && resourceRequirements.length > 0) {
      // Add pricing entries for new resources
      const existingResourceIds = resourcePricing.map(rp => rp.resource_id);
      const newRequirements = resourceRequirements.filter(
        req => !existingResourceIds.includes(req.resource_id)
      );

      if (newRequirements.length > 0) {
        const newEntries: ResourcePricingEntry[] = newRequirements.map((req, idx) => ({
          id: `rp-new-${idx}-${Date.now()}`,
          resource_id: req.resource_id,
          resource_name: req.resource_name || 'Unknown Resource',
          resource_type_id: req.resource_type_id,
          currency: defaultCurrency,
          amount: 0,
          price_type: 'fixed' as const,
          tax_inclusion: 'exclusive' as const,
          is_active: true,
        }));
        setResourcePricing(prev => [...prev, ...newEntries]);
      }

      // Remove pricing for resources no longer in requirements
      const currentResourceIds = resourceRequirements.map(req => req.resource_id);
      setResourcePricing(prev => prev.filter(rp => currentResourceIds.includes(rp.resource_id)));
    }
  }, [resourceRequirements, serviceType]);

  // =================================================================
  // STYLES
  // =================================================================

  const inputStyle = {
    backgroundColor: colors.utility.primaryBackground,
    borderColor: isDarkMode ? colors.utility.secondaryBackground : '#D1D5DB',
    color: colors.utility.primaryText,
  };

  const labelStyle = { color: colors.utility.primaryText };

  // =================================================================
  // INDEPENDENT PRICING HANDLERS
  // =================================================================

  const addPricingRecord = useCallback((currency: string) => {
    if (pricingRecords.some((r) => r.currency === currency)) return;
    const newRecord: PricingRecord = {
      id: Date.now().toString(),
      currency,
      amount: 0,
      price_type: priceType === 'tiered' ? 'fixed' : (priceType as 'fixed' | 'hourly'),
      tax_inclusion: 'exclusive',
      is_active: true,
    };
    setPricingRecords([...pricingRecords, newRecord]);
    setAddCurrencyDropdown(false);
  }, [pricingRecords, priceType]);

  const removePricingRecord = useCallback((id: string) => {
    if (pricingRecords.length <= 1) return;
    setPricingRecords(pricingRecords.filter((r) => r.id !== id));
  }, [pricingRecords]);

  const updatePricingRecord = useCallback((id: string, field: keyof PricingRecord, value: unknown) => {
    setPricingRecords(prev =>
      prev.map((r) => (r.id === id ? { ...r, [field]: value } : r))
    );
  }, []);

  // =================================================================
  // RESOURCE PRICING HANDLERS
  // =================================================================

  const addResourcePricingCurrency = useCallback((resourceId: string, currency: string) => {
    // Check if this resource+currency combo already exists
    if (resourcePricing.some(r => r.resource_id === resourceId && r.currency === currency)) {
      return;
    }

    const existingForResource = resourcePricing.find(r => r.resource_id === resourceId);
    if (!existingForResource) return;

    const newEntry: ResourcePricingEntry = {
      id: `rp-${Date.now()}`,
      resource_id: resourceId,
      resource_name: existingForResource.resource_name,
      resource_type_id: existingForResource.resource_type_id,
      currency,
      amount: 0,
      price_type: existingForResource.price_type,
      tax_inclusion: 'exclusive',
      is_active: true,
    };
    setResourcePricing(prev => [...prev, newEntry]);
    setExpandedResource(null);
  }, [resourcePricing]);

  const removeResourcePricingEntry = useCallback((id: string) => {
    setResourcePricing(prev => prev.filter(r => r.id !== id));
  }, []);

  const updateResourcePricing = useCallback((id: string, field: keyof ResourcePricingEntry, value: unknown) => {
    setResourcePricing(prev =>
      prev.map((r) => (r.id === id ? { ...r, [field]: value } : r))
    );
  }, []);

  // =================================================================
  // TIERED PRICING HANDLERS
  // =================================================================

  const addTier = useCallback((currency: string) => {
    const newTier: PricingTier = {
      id: Date.now().toString(),
      name: `Tier ${tiers.filter((t) => t.currency === currency).length + 1}`,
      price: 0,
      currency,
    };
    setTiers([...tiers, newTier]);
  }, [tiers]);

  const removeTier = useCallback((id: string) => {
    setTiers(tiers.filter((t) => t.id !== id));
  }, [tiers]);

  const updateTier = useCallback((id: string, field: keyof PricingTier, value: string | number) => {
    setTiers(tiers.map((t) => (t.id === id ? { ...t, [field]: value } : t)));
  }, [tiers]);

  // =================================================================
  // GET AVAILABLE CURRENCIES
  // =================================================================

  const getAvailableCurrencies = useCallback(() => {
    const usedCurrencies = pricingRecords.map((r) => r.currency);
    return currencyOptions.filter((c) => !usedCurrencies.includes(c.code));
  }, [pricingRecords]);

  const getAvailableCurrenciesForResource = useCallback((resourceId: string) => {
    const usedCurrencies = resourcePricing
      .filter((r) => r.resource_id === resourceId)
      .map((r) => r.currency);
    return currencyOptions.filter((c) => !usedCurrencies.includes(c.code));
  }, [resourcePricing]);

  // Group resource pricing by resource
  const groupedResourcePricing = resourceRequirements.map(req => ({
    requirement: req,
    pricingEntries: resourcePricing.filter(rp => rp.resource_id === req.resource_id),
  }));

  // =================================================================
  // PRICING MODEL OPTIONS
  // =================================================================

  const pricingOptions = [
    { id: 'fixed', icon: DollarSign, label: 'Fixed', description: 'One price' },
    { id: 'hourly', icon: Calculator, label: 'Hourly', description: 'Per hour' },
    { id: 'tiered', icon: Percent, label: 'Tiered', description: 'Multiple tiers' },
    { id: 'custom', icon: Lightbulb, label: 'Quote', description: 'Custom quote' },
  ];

  // =================================================================
  // RENDER
  // =================================================================

  return (
    <div className="animate-in fade-in slide-in-from-right-4 duration-200">
      <h2 className="text-lg font-bold mb-1" style={{ color: colors.utility.primaryText }}>
        Pricing Configuration
      </h2>
      <p className="text-sm mb-6" style={{ color: colors.utility.secondaryText }}>
        {serviceType === 'resource_based'
          ? 'Set prices for each resource. Each resource can have different rates per currency.'
          : 'Set different prices for each currency. Each currency can have its own tax settings.'}
      </p>

      <div className="space-y-6">
        {/* ============================================================= */}
        {/* RESOURCE-BASED PRICING - Per specific resource */}
        {/* ============================================================= */}
        {serviceType === 'resource_based' && resourceRequirements.length > 0 && (
          <div className="space-y-4">
            {/* Pricing Mode Toggle: Uniform vs Per-Resource */}
            <div
              className="p-4 rounded-xl border"
              style={{
                backgroundColor: colors.utility.primaryBackground,
                borderColor: isDarkMode ? colors.utility.secondaryBackground : '#E5E7EB',
              }}
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h4 className="font-semibold text-sm" style={{ color: colors.utility.primaryText }}>
                    Pricing Mode
                  </h4>
                  <p className="text-xs mt-0.5" style={{ color: colors.utility.secondaryText }}>
                    Choose how to configure prices for resources
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Same Price for All */}
                <div
                  onClick={() => setUseUniformPricing(true)}
                  className="p-3 border-2 rounded-xl cursor-pointer transition-all"
                  style={{
                    backgroundColor: useUniformPricing
                      ? `${colors.brand.primary}10`
                      : colors.utility.primaryBackground,
                    borderColor: useUniformPricing
                      ? colors.brand.primary
                      : isDarkMode ? colors.utility.secondaryBackground : '#E5E7EB',
                  }}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Globe className="w-4 h-4" style={{ color: colors.brand.primary }} />
                    <span className="font-semibold text-sm" style={{ color: colors.utility.primaryText }}>
                      Same Price for All
                    </span>
                  </div>
                  <p className="text-xs" style={{ color: colors.utility.secondaryText }}>
                    All resources have the same rate
                  </p>
                </div>

                {/* Different Prices */}
                <div
                  onClick={() => setUseUniformPricing(false)}
                  className="p-3 border-2 rounded-xl cursor-pointer transition-all"
                  style={{
                    backgroundColor: !useUniformPricing
                      ? `${colors.brand.primary}10`
                      : colors.utility.primaryBackground,
                    borderColor: !useUniformPricing
                      ? colors.brand.primary
                      : isDarkMode ? colors.utility.secondaryBackground : '#E5E7EB',
                  }}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <User className="w-4 h-4" style={{ color: colors.brand.primary }} />
                    <span className="font-semibold text-sm" style={{ color: colors.utility.primaryText }}>
                      Per-Resource Pricing
                    </span>
                  </div>
                  <p className="text-xs" style={{ color: colors.utility.secondaryText }}>
                    Each resource has a different rate
                  </p>
                </div>
              </div>
            </div>

            {/* Uniform Pricing Form */}
            {useUniformPricing && (
              <div
                className="p-4 rounded-xl border"
                style={{
                  backgroundColor: isDarkMode ? colors.utility.secondaryBackground : '#F9FAFB',
                  borderColor: isDarkMode ? colors.utility.secondaryBackground : '#E5E7EB',
                }}
              >
                <h4 className="font-semibold text-sm mb-4" style={{ color: colors.utility.primaryText }}>
                  Uniform Price (applies to all {resourceRequirements.length} resources)
                </h4>

                <div className="grid grid-cols-4 gap-3">
                  {/* Currency */}
                  <div>
                    <label className="block text-xs font-medium mb-1" style={{ color: colors.utility.secondaryText }}>
                      Currency
                    </label>
                    <select
                      value={uniformCurrency}
                      onChange={(e) => setUniformCurrency(e.target.value)}
                      className="w-full px-2 py-2 border rounded-lg text-sm"
                      style={inputStyle}
                    >
                      {currencyOptions.map((c) => (
                        <option key={c.code} value={c.code}>{c.symbol} {c.code}</option>
                      ))}
                    </select>
                  </div>

                  {/* Price Type */}
                  <div>
                    <label className="block text-xs font-medium mb-1" style={{ color: colors.utility.secondaryText }}>
                      Type
                    </label>
                    <select
                      value={uniformPriceType}
                      onChange={(e) => setUniformPriceType(e.target.value as 'fixed' | 'hourly' | 'per_unit')}
                      className="w-full px-2 py-2 border rounded-lg text-sm"
                      style={inputStyle}
                    >
                      <option value="fixed">Fixed</option>
                      <option value="hourly">Per Hour</option>
                      <option value="per_unit">Per Unit</option>
                    </select>
                  </div>

                  {/* Amount */}
                  <div>
                    <label className="block text-xs font-medium mb-1" style={{ color: colors.utility.secondaryText }}>
                      Amount <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <span
                        className="absolute left-2.5 top-1/2 -translate-y-1/2 text-sm font-medium"
                        style={{ color: colors.utility.secondaryText }}
                      >
                        {currencyOptions.find(c => c.code === uniformCurrency)?.symbol || uniformCurrency}
                      </span>
                      <input
                        type="number"
                        value={uniformPrice || ''}
                        onChange={(e) => setUniformPrice(parseFloat(e.target.value) || 0)}
                        className="w-full pl-8 pr-2 py-2 border rounded-lg text-sm"
                        style={inputStyle}
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  {/* Tax Rate */}
                  <div>
                    <label className="block text-xs font-medium mb-1" style={{ color: colors.utility.secondaryText }}>
                      Tax Rate
                    </label>
                    {taxRateOptions.length > 0 ? (
                      <select
                        value={uniformTaxRateId}
                        onChange={(e) => setUniformTaxRateId(e.target.value)}
                        className="w-full px-2 py-2 border rounded-lg text-sm"
                        style={inputStyle}
                      >
                        <option value="">No Tax</option>
                        {taxRateOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        className="w-full px-2 py-2 border rounded-lg text-sm"
                        style={inputStyle}
                        placeholder="N/A"
                        disabled
                      />
                    )}
                  </div>
                </div>

                {/* Tax Inclusion */}
                <div className="mt-3 flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={uniformTaxInclusion === 'inclusive'}
                      onChange={() => setUniformTaxInclusion('inclusive')}
                      style={{ accentColor: colors.brand.primary }}
                    />
                    <span className="text-xs" style={{ color: colors.utility.primaryText }}>
                      Tax Inclusive
                    </span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={uniformTaxInclusion === 'exclusive'}
                      onChange={() => setUniformTaxInclusion('exclusive')}
                      style={{ accentColor: colors.brand.primary }}
                    />
                    <span className="text-xs" style={{ color: colors.utility.primaryText }}>
                      Tax Exclusive
                    </span>
                  </label>
                </div>

                {/* Resources Summary */}
                <div className="mt-4 pt-3 border-t" style={{ borderColor: isDarkMode ? '#374151' : '#E5E7EB' }}>
                  <p className="text-xs font-medium mb-2" style={{ color: colors.utility.secondaryText }}>
                    This price applies to:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {resourceRequirements.map((req) => (
                      <span
                        key={req.resource_id}
                        className="text-xs px-2 py-1 rounded-full"
                        style={{
                          backgroundColor: `${colors.brand.primary}10`,
                          color: colors.brand.primary,
                        }}
                      >
                        {req.resource_name || 'Unknown'}
                        {req.select_all && ' (Any)'}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Per-Resource Pricing Cards (only shown when not using uniform pricing) */}
            {!useUniformPricing && (
              <>
                {/* Info Banner */}
                <div
                  className="flex items-start gap-3 p-4 rounded-xl border"
                  style={{
                    backgroundColor: `${colors.brand.primary}08`,
                    borderColor: `${colors.brand.primary}30`,
                  }}
                >
                  <Users className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: colors.brand.primary }} />
                  <div>
                    <h4 className="font-semibold text-sm" style={{ color: colors.utility.primaryText }}>
                      Per-Resource Pricing
                    </h4>
                    <p className="text-xs mt-1" style={{ color: colors.utility.secondaryText }}>
                      Each resource has its own price. For example: "Consultation by Dr. Bhavana - ₹500" and "Consultation by Dr. Hema - ₹600"
                    </p>
                  </div>
                </div>

            {/* Per-Resource Pricing Cards */}
            {groupedResourcePricing.map(({ requirement, pricingEntries }) => {
              const availableCurrencies = getAvailableCurrenciesForResource(requirement.resource_id);
              const isAnyResource = requirement.select_all;

              return (
                <div
                  key={requirement.resource_id}
                  className="p-4 rounded-xl border"
                  style={{
                    backgroundColor: colors.utility.primaryBackground,
                    borderColor: isDarkMode ? colors.utility.secondaryBackground : '#E5E7EB',
                  }}
                >
                  {/* Resource Header */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: `${colors.brand.primary}15` }}
                      >
                        <User className="w-5 h-5" style={{ color: colors.brand.primary }} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold" style={{ color: colors.utility.primaryText }}>
                            {requirement.resource_name || 'Unknown Resource'}
                          </span>
                          {isAnyResource && (
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
                          {requirement.quantity > 1 && (
                            <span
                              className="text-xs px-2 py-0.5 rounded-full"
                              style={{
                                backgroundColor: `${colors.brand.primary}15`,
                                color: colors.brand.primary,
                              }}
                            >
                              ×{requirement.quantity}
                            </span>
                          )}
                        </div>
                        <span className="text-xs" style={{ color: colors.utility.secondaryText }}>
                          {requirement.is_required ? 'Required' : 'Optional'}
                        </span>
                      </div>
                    </div>

                    {/* Add Currency Button */}
                    {availableCurrencies.length > 0 && (
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setExpandedResource(
                            expandedResource === requirement.resource_id ? null : requirement.resource_id
                          )}
                          className="text-xs flex items-center gap-1 px-3 py-1.5 rounded-lg border"
                          style={{ color: colors.brand.primary, borderColor: colors.brand.primary }}
                        >
                          <Plus className="w-3 h-3" /> Add Currency
                        </button>
                        {expandedResource === requirement.resource_id && (
                          <>
                            <div className="fixed inset-0 z-40" onClick={() => setExpandedResource(null)} />
                            <div
                              className="absolute right-0 z-50 mt-1 w-48 max-h-48 overflow-y-auto rounded-lg border shadow-lg"
                              style={{
                                backgroundColor: colors.utility.primaryBackground,
                                borderColor: isDarkMode ? colors.utility.secondaryBackground : '#E5E7EB',
                              }}
                            >
                              {availableCurrencies.map((currency) => (
                                <button
                                  key={currency.code}
                                  type="button"
                                  onClick={() => addResourcePricingCurrency(requirement.resource_id, currency.code)}
                                  className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-800 text-sm"
                                >
                                  <span className="font-semibold w-6">{currency.symbol}</span>
                                  <span>{currency.name} ({currency.code})</span>
                                </button>
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Pricing Entries for this resource */}
                  <div className="space-y-3">
                    {pricingEntries.length > 0 ? (
                      pricingEntries.map((entry) => {
                        const currencyInfo = currencyOptions.find((c) => c.code === entry.currency);
                        const currencySymbol = currencyInfo?.symbol || entry.currency;

                        return (
                          <div
                            key={entry.id}
                            className="p-3 rounded-lg border"
                            style={{
                              backgroundColor: isDarkMode ? colors.utility.secondaryBackground : '#F9FAFB',
                              borderColor: isDarkMode ? '#374151' : '#E5E7EB',
                            }}
                          >
                            {/* Currency Header */}
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <span
                                  className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
                                  style={{ backgroundColor: `${colors.brand.primary}20`, color: colors.brand.primary }}
                                >
                                  {currencySymbol}
                                </span>
                                <span className="font-medium text-sm" style={{ color: colors.utility.primaryText }}>
                                  {currencyInfo?.name || entry.currency}
                                </span>
                              </div>
                              {pricingEntries.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => removeResourcePricingEntry(entry.id)}
                                  className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20"
                                >
                                  <Trash2 className="w-4 h-4" style={{ color: colors.semantic.error }} />
                                </button>
                              )}
                            </div>

                            {/* Pricing Fields */}
                            <div className="grid grid-cols-3 gap-3">
                              {/* Price Type */}
                              <div>
                                <label className="block text-xs font-medium mb-1" style={{ color: colors.utility.secondaryText }}>
                                  Type
                                </label>
                                <select
                                  value={entry.price_type}
                                  onChange={(e) => updateResourcePricing(entry.id, 'price_type', e.target.value)}
                                  className="w-full px-2 py-2 border rounded-lg text-sm"
                                  style={inputStyle}
                                >
                                  <option value="fixed">Fixed</option>
                                  <option value="hourly">Per Hour</option>
                                  <option value="per_unit">Per Unit</option>
                                </select>
                              </div>

                              {/* Amount */}
                              <div>
                                <label className="block text-xs font-medium mb-1" style={{ color: colors.utility.secondaryText }}>
                                  Amount <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                  <span
                                    className="absolute left-2.5 top-1/2 -translate-y-1/2 text-sm font-medium"
                                    style={{ color: colors.utility.secondaryText }}
                                  >
                                    {currencySymbol}
                                  </span>
                                  <input
                                    type="number"
                                    value={entry.amount || ''}
                                    onChange={(e) => updateResourcePricing(entry.id, 'amount', parseFloat(e.target.value) || 0)}
                                    className="w-full pl-8 pr-2 py-2 border rounded-lg text-sm"
                                    style={inputStyle}
                                    placeholder="0.00"
                                  />
                                </div>
                              </div>

                              {/* Tax Rate */}
                              <div>
                                <label className="block text-xs font-medium mb-1" style={{ color: colors.utility.secondaryText }}>
                                  Tax Rate
                                </label>
                                {taxLoading ? (
                                  <div className="flex items-center justify-center py-2">
                                    <Loader2 className="w-4 h-4 animate-spin" style={{ color: colors.brand.primary }} />
                                  </div>
                                ) : taxRateOptions.length > 0 ? (
                                  <select
                                    value={entry.tax_rate_id || ''}
                                    onChange={(e) => {
                                      const selectedRate = taxRateOptions.find((r) => r.value === e.target.value);
                                      updateResourcePricing(entry.id, 'tax_rate_id', e.target.value);
                                      updateResourcePricing(entry.id, 'tax_rate', selectedRate?.rate || 0);
                                    }}
                                    className="w-full px-2 py-2 border rounded-lg text-sm"
                                    style={inputStyle}
                                  >
                                    <option value="">No Tax</option>
                                    {taxRateOptions.map((option) => (
                                      <option key={option.value} value={option.value}>
                                        {option.label}
                                      </option>
                                    ))}
                                  </select>
                                ) : (
                                  <div className="flex items-center gap-1">
                                    <input
                                      type="number"
                                      value={entry.tax_rate || ''}
                                      onChange={(e) => updateResourcePricing(entry.id, 'tax_rate', parseFloat(e.target.value) || 0)}
                                      className="w-full px-2 py-2 border rounded-lg text-sm"
                                      style={inputStyle}
                                      placeholder="0"
                                    />
                                    <span className="text-sm" style={{ color: colors.utility.secondaryText }}>%</span>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Tax Inclusion Toggle */}
                            <div className="mt-3 flex items-center gap-4">
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="radio"
                                  name={`tax-${entry.id}`}
                                  checked={entry.tax_inclusion === 'inclusive'}
                                  onChange={() => updateResourcePricing(entry.id, 'tax_inclusion', 'inclusive')}
                                  style={{ accentColor: colors.brand.primary }}
                                />
                                <span className="text-xs" style={{ color: colors.utility.primaryText }}>
                                  Tax Inclusive
                                </span>
                              </label>
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="radio"
                                  name={`tax-${entry.id}`}
                                  checked={entry.tax_inclusion === 'exclusive'}
                                  onChange={() => updateResourcePricing(entry.id, 'tax_inclusion', 'exclusive')}
                                  style={{ accentColor: colors.brand.primary }}
                                />
                                <span className="text-xs" style={{ color: colors.utility.primaryText }}>
                                  Tax Exclusive
                                </span>
                              </label>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div
                        className="p-4 rounded-lg border-2 border-dashed text-center"
                        style={{ borderColor: isDarkMode ? '#374151' : '#E5E7EB' }}
                      >
                        <p className="text-sm" style={{ color: colors.utility.secondaryText }}>
                          No pricing configured. Click "Add Currency" to set prices.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
              </>
            )}

            {resourceRequirements.length === 0 && (
              <div
                className="p-6 rounded-xl border text-center"
                style={{
                  backgroundColor: `${colors.semantic.warning}10`,
                  borderColor: `${colors.semantic.warning}30`,
                }}
              >
                <p className="text-sm" style={{ color: colors.utility.primaryText }}>
                  No resources selected. Please go back to the Resource Dependency step and add resources.
                </p>
              </div>
            )}
          </div>
        )}

        {/* ============================================================= */}
        {/* INDEPENDENT PRICING (Original behavior) */}
        {/* ============================================================= */}
        {serviceType === 'independent' && (
          <>
            {/* Pricing Model Selection */}
            <div>
              <label className="block text-sm font-medium mb-3" style={labelStyle}>
                Pricing Model <span style={{ color: colors.semantic.error }}>*</span>
              </label>
              <div className="grid grid-cols-4 gap-3">
                {pricingOptions.map((option) => {
                  const IconComp = option.icon;
                  const isSelected = priceType === option.id;
                  return (
                    <div
                      key={option.id}
                      onClick={() => setPriceType(option.id as PriceType)}
                      className="p-3 border-2 rounded-xl cursor-pointer text-center transition-all"
                      style={{
                        backgroundColor: isSelected
                          ? `${colors.brand.primary}10`
                          : colors.utility.primaryBackground,
                        borderColor: isSelected
                          ? colors.brand.primary
                          : isDarkMode
                          ? colors.utility.secondaryBackground
                          : '#E5E7EB',
                      }}
                    >
                      <IconComp className="w-6 h-6 mx-auto mb-1" style={{ color: colors.brand.primary }} />
                      <div className="text-sm font-bold" style={{ color: colors.utility.primaryText }}>
                        {option.label}
                      </div>
                      <div className="text-xs" style={{ color: colors.utility.secondaryText }}>
                        {option.description}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Multi-Currency Pricing Records */}
            {priceType !== 'custom' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold flex items-center gap-2" style={{ color: colors.utility.primaryText }}>
                    <Globe className="w-4 h-4" />
                    Currency-Specific Pricing
                  </h4>

                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setAddCurrencyDropdown(!addCurrencyDropdown)}
                      className="flex items-center gap-1 text-sm px-3 py-1.5 rounded-lg border"
                      style={{
                        color: colors.brand.primary,
                        borderColor: colors.brand.primary,
                      }}
                      disabled={getAvailableCurrencies().length === 0}
                    >
                      <Plus className="w-4 h-4" />
                      Add Currency
                    </button>

                    {addCurrencyDropdown && getAvailableCurrencies().length > 0 && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setAddCurrencyDropdown(false)} />
                        <div
                          className="absolute right-0 z-50 mt-1 w-56 max-h-60 overflow-y-auto rounded-lg border shadow-lg"
                          style={{
                            backgroundColor: colors.utility.primaryBackground,
                            borderColor: isDarkMode ? colors.utility.secondaryBackground : '#E5E7EB',
                          }}
                        >
                          {getAvailableCurrencies().map((currency) => (
                            <button
                              key={currency.code}
                              type="button"
                              onClick={() => addPricingRecord(currency.code)}
                              className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-800"
                            >
                              <span className="w-8 font-semibold">{currency.symbol}</span>
                              <span className="text-sm">{currency.name} ({currency.code})</span>
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Pricing Records List */}
                <div className="space-y-4">
                  {pricingRecords.map((record) => {
                    const currencyInfo = currencyOptions.find((c) => c.code === record.currency);
                    const currencySymbol = currencyInfo?.symbol || record.currency;

                    return (
                      <div
                        key={record.id}
                        className="p-4 rounded-xl border"
                        style={{
                          backgroundColor: isDarkMode ? colors.utility.secondaryBackground : '#F9FAFB',
                          borderColor: isDarkMode ? colors.utility.secondaryBackground : '#E5E7EB',
                        }}
                      >
                        {/* Currency Header */}
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-2">
                            <span
                              className="w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold"
                              style={{ backgroundColor: `${colors.brand.primary}20`, color: colors.brand.primary }}
                            >
                              {currencySymbol}
                            </span>
                            <div>
                              <div className="font-semibold" style={{ color: colors.utility.primaryText }}>
                                {currencyInfo?.name || record.currency}
                              </div>
                              <div className="text-xs" style={{ color: colors.utility.secondaryText }}>
                                {record.currency}
                              </div>
                            </div>
                          </div>
                          {pricingRecords.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removePricingRecord(record.id)}
                              className="p-2 rounded-lg hover:bg-red-50 transition-colors"
                              title="Remove this currency"
                            >
                              <Trash2 className="w-4 h-4" style={{ color: colors.semantic.error }} />
                            </button>
                          )}
                        </div>

                        {/* Price & Settings */}
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-medium mb-1" style={{ color: colors.utility.secondaryText }}>
                              {priceType === 'hourly' ? 'Hourly Rate' : 'Price'} <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                              <span
                                className="absolute left-3 top-1/2 -translate-y-1/2 font-semibold"
                                style={{ color: colors.utility.secondaryText }}
                              >
                                {currencySymbol}
                              </span>
                              <input
                                type="number"
                                value={record.amount || ''}
                                onChange={(e) => updatePricingRecord(record.id, 'amount', parseFloat(e.target.value) || 0)}
                                className="w-full pl-10 pr-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2"
                                style={inputStyle}
                                placeholder="0.00"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-xs font-medium mb-1" style={{ color: colors.utility.secondaryText }}>
                              Tax Rate
                            </label>
                            {taxLoading ? (
                              <div className="px-3 py-2.5 border rounded-lg text-sm" style={inputStyle}>
                                Loading...
                              </div>
                            ) : taxRateOptions.length > 0 ? (
                              <select
                                value={record.tax_rate_id || ''}
                                onChange={(e) => {
                                  const selectedRate = taxRateOptions.find((r) => r.value === e.target.value);
                                  updatePricingRecord(record.id, 'tax_rate_id', e.target.value);
                                  updatePricingRecord(record.id, 'tax_rate', selectedRate?.rate || 0);
                                }}
                                className="w-full px-3 py-2.5 border rounded-lg text-sm"
                                style={inputStyle}
                              >
                                <option value="">No Tax</option>
                                {taxRateOptions.map((option) => (
                                  <option key={option.value} value={option.value}>
                                    {option.label}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <div className="flex items-center gap-1">
                                <input
                                  type="number"
                                  value={record.tax_rate || ''}
                                  onChange={(e) => updatePricingRecord(record.id, 'tax_rate', parseFloat(e.target.value) || 0)}
                                  className="w-full px-3 py-2.5 border rounded-lg text-sm"
                                  style={inputStyle}
                                  placeholder="0"
                                />
                                <span className="text-sm" style={{ color: colors.utility.secondaryText }}>%</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Tax Inclusion Toggle */}
                        <div className="mt-3 flex items-center gap-4">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              name={`tax-${record.id}`}
                              checked={record.tax_inclusion === 'inclusive'}
                              onChange={() => updatePricingRecord(record.id, 'tax_inclusion', 'inclusive')}
                              style={{ accentColor: colors.brand.primary }}
                            />
                            <span className="text-sm" style={{ color: colors.utility.primaryText }}>
                              Tax Inclusive
                            </span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              name={`tax-${record.id}`}
                              checked={record.tax_inclusion === 'exclusive'}
                              onChange={() => updatePricingRecord(record.id, 'tax_inclusion', 'exclusive')}
                              style={{ accentColor: colors.brand.primary }}
                            />
                            <span className="text-sm" style={{ color: colors.utility.primaryText }}>
                              Tax Exclusive
                            </span>
                          </label>
                        </div>

                        {/* Tiered Pricing for this currency */}
                        {priceType === 'tiered' && (
                          <div className="mt-4 pt-4 border-t" style={{ borderColor: isDarkMode ? '#374151' : '#E5E7EB' }}>
                            <div className="flex items-center justify-between mb-3">
                              <span className="text-xs font-medium" style={{ color: colors.utility.secondaryText }}>
                                Pricing Tiers ({currencySymbol})
                              </span>
                              <button
                                type="button"
                                onClick={() => addTier(record.currency)}
                                className="text-xs flex items-center gap-1"
                                style={{ color: colors.brand.primary }}
                              >
                                <Plus className="w-3 h-3" /> Add Tier
                              </button>
                            </div>
                            <div className="space-y-2">
                              {tiers
                                .filter((t) => t.currency === record.currency)
                                .map((tier, idx) => (
                                  <div key={tier.id} className="flex items-center gap-2">
                                    <span
                                      className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                                      style={{ backgroundColor: `${colors.brand.primary}15`, color: colors.brand.primary }}
                                    >
                                      {idx + 1}
                                    </span>
                                    <input
                                      type="text"
                                      value={tier.name}
                                      onChange={(e) => updateTier(tier.id, 'name', e.target.value)}
                                      className="flex-1 px-2 py-1.5 border rounded-lg text-sm"
                                      style={inputStyle}
                                      placeholder="Tier name"
                                    />
                                    <div className="relative w-28">
                                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs" style={{ color: colors.utility.secondaryText }}>
                                        {currencySymbol}
                                      </span>
                                      <input
                                        type="number"
                                        value={tier.price || ''}
                                        onChange={(e) => updateTier(tier.id, 'price', parseFloat(e.target.value) || 0)}
                                        className="w-full pl-6 pr-2 py-1.5 border rounded-lg text-sm"
                                        style={inputStyle}
                                      />
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => removeTier(tier.id)}
                                      className="p-1"
                                    >
                                      <Trash2 className="w-3 h-3" style={{ color: colors.utility.secondaryText }} />
                                    </button>
                                  </div>
                                ))}
                              {tiers.filter((t) => t.currency === record.currency).length === 0 && (
                                <p className="text-xs italic" style={{ color: colors.utility.secondaryText }}>
                                  No tiers added. Click "Add Tier" to create pricing tiers.
                                </p>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Custom Quote Mode */}
            {priceType === 'custom' && (
              <div
                className="p-4 rounded-lg border"
                style={{
                  backgroundColor: `${colors.semantic.warning}10`,
                  borderColor: `${colors.semantic.warning}40`,
                }}
              >
                <div className="flex gap-3">
                  <Lightbulb className="w-5 h-5 flex-shrink-0" style={{ color: colors.semantic.warning }} />
                  <div>
                    <div className="font-semibold" style={{ color: colors.utility.primaryText }}>
                      Custom Quote Mode
                    </div>
                    <p className="text-sm mt-1" style={{ color: colors.utility.secondaryText }}>
                      Price will be determined per contract. A quote request form will be shown to customers.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* Discount Options */}
        <div
          className="border-t pt-6"
          style={{ borderColor: isDarkMode ? colors.utility.secondaryBackground : '#E5E7EB' }}
        >
          <h4 className="text-sm font-semibold mb-4" style={{ color: colors.utility.primaryText }}>
            Discount Options
          </h4>
          <div className="space-y-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={(formData.allow_coupons as boolean) || false}
                onChange={(e) => onChange('allow_coupons', e.target.checked)}
                className="w-4 h-4 rounded"
                style={{ accentColor: colors.brand.primary }}
              />
              <span className="text-sm" style={{ color: colors.utility.primaryText }}>
                Allow coupon codes
              </span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={(formData.allow_bulk_discount as boolean) || false}
                onChange={(e) => onChange('allow_bulk_discount', e.target.checked)}
                className="w-4 h-4 rounded"
                style={{ accentColor: colors.brand.primary }}
              />
              <span className="text-sm" style={{ color: colors.utility.primaryText }}>
                Allow bulk/quantity discounts
              </span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={(formData.allow_negotiated_pricing as boolean) || false}
                onChange={(e) => onChange('allow_negotiated_pricing', e.target.checked)}
                className="w-4 h-4 rounded"
                style={{ accentColor: colors.brand.primary }}
              />
              <span className="text-sm" style={{ color: colors.utility.primaryText }}>
                Enable negotiated pricing
              </span>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PricingStep;
