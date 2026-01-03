// src/components/catalog-studio/BlockWizard/steps/service/PricingStep.tsx
// ✅ Phase 8: Multi-currency pricing_records array, per-resource pricing, per-currency tax
// Pattern aligned with service-catalog ServicePricingForm

import React, { useState, useEffect } from 'react';
import {
  DollarSign,
  Percent,
  Calculator,
  Plus,
  Trash2,
  Lightbulb,
  ChevronDown,
  Users,
  Check,
  Globe,
  AlertCircle,
} from 'lucide-react';
import { useTheme } from '../../../../../contexts/ThemeContext';
import { Block } from '../../../../../types/catalogStudio';
import { currencyOptions, getCurrencySymbol } from '../../../../../utils/constants/currencies';
import { useTaxRatesDropdown } from '../../../../../hooks/queries/useProductMasterdata';

// =================================================================
// TYPES (Aligned with service-catalog ServicePricingForm)
// =================================================================

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

interface ResourcePricingRecord {
  id: string;
  resourceTypeId: string;
  resourceTypeName: string;
  currency: string;
  pricePerUnit: number;
  pricingModel: 'hourly' | 'per_unit' | 'fixed';
  tax_inclusion: 'inclusive' | 'exclusive';
  tax_rate_id?: string;
  tax_rate?: number;
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

  // Get resource types from formData (set in ResourceDependencyStep)
  const selectedResourceTypes = (formData.meta?.resourceTypes as string[]) || [];
  const resourceQuantities = (formData.meta?.resourceQuantities as Record<string, number>) || {};
  const pricingMode = (formData.meta?.pricingMode as string) || 'independent';

  // Default currency
  const defaultCurrency = 'INR';

  // =================================================================
  // STATE - Pricing Records (Array for multi-currency support)
  // =================================================================

  const [pricingRecords, setPricingRecords] = useState<PricingRecord[]>(() => {
    const existing = formData.meta?.pricingRecords as PricingRecord[];
    if (existing && existing.length > 0) return existing;
    // Default with one INR record
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

  // Resource pricing records (per resource, per currency)
  const [resourcePricingRecords, setResourcePricingRecords] = useState<ResourcePricingRecord[]>(() => {
    const existing = formData.meta?.resourcePricingRecords as ResourcePricingRecord[];
    if (existing && existing.length > 0) return existing;
    // Initialize from selected resource types
    return selectedResourceTypes.map((typeId, idx) => ({
      id: `rp-${idx}`,
      resourceTypeId: typeId,
      resourceTypeName: typeId.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
      currency: defaultCurrency,
      pricePerUnit: 0,
      pricingModel: 'hourly' as const,
      tax_inclusion: 'exclusive' as const,
    }));
  });

  // Tiered pricing
  const [tiers, setTiers] = useState<PricingTier[]>(
    (formData.meta?.pricingTiers as PricingTier[]) || []
  );

  const [priceType, setPriceType] = useState<PriceType>(
    (formData.meta?.priceType as PriceType) || 'fixed'
  );

  // Dropdown states
  const [addCurrencyDropdown, setAddCurrencyDropdown] = useState(false);
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);

  // Sync state changes to formData
  useEffect(() => {
    onChange('meta', {
      ...formData.meta,
      pricingRecords,
      priceType,
      pricingTiers: tiers,
    });
  }, [pricingRecords, priceType, tiers]);

  useEffect(() => {
    if (pricingMode === 'resource_based') {
      onChange('meta', {
        ...formData.meta,
        resourcePricingRecords,
      });
    }
  }, [resourcePricingRecords, pricingMode]);

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
  // PRICING RECORD HANDLERS
  // =================================================================

  const addPricingRecord = (currency: string) => {
    // Check if currency already exists
    if (pricingRecords.some((r) => r.currency === currency)) {
      return;
    }
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
  };

  const removePricingRecord = (id: string) => {
    if (pricingRecords.length <= 1) return; // Keep at least one
    setPricingRecords(pricingRecords.filter((r) => r.id !== id));
  };

  const updatePricingRecord = (id: string, field: keyof PricingRecord, value: unknown) => {
    setPricingRecords(
      pricingRecords.map((r) => (r.id === id ? { ...r, [field]: value } : r))
    );
  };

  // =================================================================
  // RESOURCE PRICING HANDLERS
  // =================================================================

  const addResourcePricingCurrency = (resourceTypeId: string, currency: string) => {
    // Check if this resource+currency combo already exists
    if (
      resourcePricingRecords.some(
        (r) => r.resourceTypeId === resourceTypeId && r.currency === currency
      )
    ) {
      return;
    }
    const existingForResource = resourcePricingRecords.find(
      (r) => r.resourceTypeId === resourceTypeId
    );
    const newRecord: ResourcePricingRecord = {
      id: `rp-${Date.now()}`,
      resourceTypeId,
      resourceTypeName: existingForResource?.resourceTypeName || resourceTypeId,
      currency,
      pricePerUnit: 0,
      pricingModel: existingForResource?.pricingModel || 'hourly',
      tax_inclusion: 'exclusive',
    };
    setResourcePricingRecords([...resourcePricingRecords, newRecord]);
  };

  const removeResourcePricingRecord = (id: string) => {
    setResourcePricingRecords(resourcePricingRecords.filter((r) => r.id !== id));
  };

  const updateResourcePricing = (id: string, field: keyof ResourcePricingRecord, value: unknown) => {
    setResourcePricingRecords(
      resourcePricingRecords.map((r) => (r.id === id ? { ...r, [field]: value } : r))
    );
  };

  // =================================================================
  // TIERED PRICING HANDLERS
  // =================================================================

  const addTier = (currency: string) => {
    const newTier: PricingTier = {
      id: Date.now().toString(),
      name: `Tier ${tiers.filter((t) => t.currency === currency).length + 1}`,
      price: 0,
      currency,
    };
    setTiers([...tiers, newTier]);
  };

  const removeTier = (id: string) => {
    setTiers(tiers.filter((t) => t.id !== id));
  };

  const updateTier = (id: string, field: keyof PricingTier, value: string | number) => {
    setTiers(tiers.map((t) => (t.id === id ? { ...t, [field]: value } : t)));
  };

  // =================================================================
  // GET AVAILABLE CURRENCIES (not yet added)
  // =================================================================

  const getAvailableCurrencies = () => {
    const usedCurrencies = pricingRecords.map((r) => r.currency);
    return currencyOptions.filter((c) => !usedCurrencies.includes(c.code));
  };

  const getAvailableCurrenciesForResource = (resourceTypeId: string) => {
    const usedCurrencies = resourcePricingRecords
      .filter((r) => r.resourceTypeId === resourceTypeId)
      .map((r) => r.currency);
    return currencyOptions.filter((c) => !usedCurrencies.includes(c.code));
  };

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
        Set different prices for each currency. Each currency can have its own tax settings.
      </p>

      <div className="space-y-6">
        {/* Resource-based Pricing Notice */}
        {pricingMode === 'resource_based' && selectedResourceTypes.length > 0 && (
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
                Resource-Based Pricing Active
              </h4>
              <p className="text-xs mt-1" style={{ color: colors.utility.secondaryText }}>
                Configure pricing for each resource type. You can set different rates for each currency.
              </p>
            </div>
          </div>
        )}

        {/* Pricing Model Selection (only for independent mode) */}
        {pricingMode !== 'resource_based' && (
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
        )}

        {/* ============================================================= */}
        {/* MULTI-CURRENCY PRICING RECORDS (Independent Mode) */}
        {/* ============================================================= */}
        {pricingMode !== 'resource_based' && priceType !== 'custom' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold flex items-center gap-2" style={{ color: colors.utility.primaryText }}>
                <Globe className="w-4 h-4" />
                Currency-Specific Pricing
              </h4>

              {/* Add Currency Button */}
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
                      {/* Amount */}
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

                      {/* Tax Rate */}
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

        {/* ============================================================= */}
        {/* RESOURCE-BASED PRICING (Per resource, per currency) */}
        {/* ============================================================= */}
        {pricingMode === 'resource_based' && selectedResourceTypes.length > 0 && (
          <div className="space-y-6">
            {selectedResourceTypes.map((resourceTypeId) => {
              const resourceName = resourceTypeId.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
              const recordsForResource = resourcePricingRecords.filter((r) => r.resourceTypeId === resourceTypeId);
              const availableCurrencies = getAvailableCurrenciesForResource(resourceTypeId);

              return (
                <div
                  key={resourceTypeId}
                  className="p-4 rounded-xl border"
                  style={{
                    backgroundColor: colors.utility.primaryBackground,
                    borderColor: isDarkMode ? colors.utility.secondaryBackground : '#E5E7EB',
                  }}
                >
                  {/* Resource Header */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <Users className="w-5 h-5" style={{ color: colors.brand.primary }} />
                      <div>
                        <span className="font-semibold" style={{ color: colors.utility.primaryText }}>
                          {resourceName}
                        </span>
                        {resourceQuantities[resourceTypeId] > 1 && (
                          <span
                            className="ml-2 text-xs px-2 py-0.5 rounded-full"
                            style={{ backgroundColor: `${colors.brand.primary}15`, color: colors.brand.primary }}
                          >
                            x{resourceQuantities[resourceTypeId]}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Add Currency for Resource */}
                    {availableCurrencies.length > 0 && (
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setEditingRecordId(editingRecordId === resourceTypeId ? null : resourceTypeId)}
                          className="text-xs flex items-center gap-1 px-2 py-1 rounded border"
                          style={{ color: colors.brand.primary, borderColor: colors.brand.primary }}
                        >
                          <Plus className="w-3 h-3" /> Currency
                        </button>
                        {editingRecordId === resourceTypeId && (
                          <>
                            <div className="fixed inset-0 z-40" onClick={() => setEditingRecordId(null)} />
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
                                  onClick={() => {
                                    addResourcePricingCurrency(resourceTypeId, currency.code);
                                    setEditingRecordId(null);
                                  }}
                                  className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-800 text-sm"
                                >
                                  <span className="font-semibold">{currency.symbol}</span>
                                  <span>{currency.code}</span>
                                </button>
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Currency-specific pricing for this resource */}
                  <div className="space-y-3">
                    {recordsForResource.map((record) => {
                      const currencyInfo = currencyOptions.find((c) => c.code === record.currency);
                      const currencySymbol = currencyInfo?.symbol || record.currency;

                      return (
                        <div
                          key={record.id}
                          className="p-3 rounded-lg border"
                          style={{
                            backgroundColor: isDarkMode ? colors.utility.secondaryBackground : '#F9FAFB',
                            borderColor: isDarkMode ? '#374151' : '#E5E7EB',
                          }}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium" style={{ color: colors.utility.primaryText }}>
                              {currencySymbol} {record.currency}
                            </span>
                            {recordsForResource.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeResourcePricingRecord(record.id)}
                                className="p-1"
                              >
                                <Trash2 className="w-3 h-3" style={{ color: colors.semantic.error }} />
                              </button>
                            )}
                          </div>

                          <div className="grid grid-cols-3 gap-3">
                            <div>
                              <label className="block text-xs mb-1" style={{ color: colors.utility.secondaryText }}>
                                Model
                              </label>
                              <select
                                value={record.pricingModel}
                                onChange={(e) => updateResourcePricing(record.id, 'pricingModel', e.target.value)}
                                className="w-full px-2 py-1.5 border rounded text-sm"
                                style={inputStyle}
                              >
                                <option value="hourly">Per Hour</option>
                                <option value="per_unit">Per Unit</option>
                                <option value="fixed">Fixed</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs mb-1" style={{ color: colors.utility.secondaryText }}>
                                Rate
                              </label>
                              <div className="relative">
                                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs" style={{ color: colors.utility.secondaryText }}>
                                  {currencySymbol}
                                </span>
                                <input
                                  type="number"
                                  value={record.pricePerUnit || ''}
                                  onChange={(e) => updateResourcePricing(record.id, 'pricePerUnit', parseFloat(e.target.value) || 0)}
                                  className="w-full pl-6 pr-2 py-1.5 border rounded text-sm"
                                  style={inputStyle}
                                  placeholder="0"
                                />
                              </div>
                            </div>
                            <div>
                              <label className="block text-xs mb-1" style={{ color: colors.utility.secondaryText }}>
                                Tax
                              </label>
                              {taxRateOptions.length > 0 ? (
                                <select
                                  value={record.tax_rate_id || ''}
                                  onChange={(e) => {
                                    const selectedRate = taxRateOptions.find((r) => r.value === e.target.value);
                                    updateResourcePricing(record.id, 'tax_rate_id', e.target.value);
                                    updateResourcePricing(record.id, 'tax_rate', selectedRate?.rate || 0);
                                  }}
                                  className="w-full px-2 py-1.5 border rounded text-sm"
                                  style={inputStyle}
                                >
                                  <option value="">None</option>
                                  {taxRateOptions.map((opt) => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                  ))}
                                </select>
                              ) : (
                                <input
                                  type="number"
                                  value={record.tax_rate || ''}
                                  onChange={(e) => updateResourcePricing(record.id, 'tax_rate', parseFloat(e.target.value) || 0)}
                                  className="w-full px-2 py-1.5 border rounded text-sm"
                                  style={inputStyle}
                                  placeholder="%"
                                />
                              )}
                            </div>
                          </div>

                          {/* Tax Inclusion */}
                          <div className="mt-2 flex items-center gap-4">
                            <label className="flex items-center gap-1 cursor-pointer">
                              <input
                                type="radio"
                                name={`resource-tax-${record.id}`}
                                checked={record.tax_inclusion === 'inclusive'}
                                onChange={() => updateResourcePricing(record.id, 'tax_inclusion', 'inclusive')}
                                style={{ accentColor: colors.brand.primary }}
                              />
                              <span className="text-xs" style={{ color: colors.utility.primaryText }}>Inclusive</span>
                            </label>
                            <label className="flex items-center gap-1 cursor-pointer">
                              <input
                                type="radio"
                                name={`resource-tax-${record.id}`}
                                checked={record.tax_inclusion === 'exclusive'}
                                onChange={() => updateResourcePricing(record.id, 'tax_inclusion', 'exclusive')}
                                style={{ accentColor: colors.brand.primary }}
                              />
                              <span className="text-xs" style={{ color: colors.utility.primaryText }}>Exclusive</span>
                            </label>
                          </div>
                        </div>
                      );
                    })}

                    {recordsForResource.length === 0 && (
                      <div
                        className="p-3 rounded-lg border-2 border-dashed text-center"
                        style={{ borderColor: isDarkMode ? '#374151' : '#E5E7EB' }}
                      >
                        <p className="text-sm" style={{ color: colors.utility.secondaryText }}>
                          No pricing configured. Click "+ Currency" to add pricing.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Custom Quote Mode */}
        {priceType === 'custom' && pricingMode !== 'resource_based' && (
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
                checked={(formData.meta?.allowCoupons as boolean) || false}
                onChange={(e) => onChange('meta', { ...formData.meta, allowCoupons: e.target.checked })}
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
                checked={(formData.meta?.allowBulkDiscount as boolean) || false}
                onChange={(e) => onChange('meta', { ...formData.meta, allowBulkDiscount: e.target.checked })}
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
                checked={(formData.meta?.allowNegotiatedPricing as boolean) || false}
                onChange={(e) => onChange('meta', { ...formData.meta, allowNegotiatedPricing: e.target.checked })}
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
