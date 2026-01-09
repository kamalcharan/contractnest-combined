// src/components/catalog-studio/BlockWizard/steps/service/PricingStep.tsx
// ✅ Phase 8: Multi-currency, multi-tax (tag style), price breakdown
// Updated UI: Two-column layout, Fixed/Hourly only, hidden discounts

import React, { useState, useEffect, useCallback } from 'react';
import {
  DollarSign,
  Calculator,
  Plus,
  Trash2,
  Lightbulb,
  Users,
  Globe,
  X,
  Receipt,
  CheckCircle2,
  Info,
  TrendingUp,
} from 'lucide-react';
import { useTheme } from '../../../../../contexts/ThemeContext';
import { Block } from '../../../../../types/catalogStudio';
import { currencyOptions } from '../../../../../utils/constants/currencies';
import { useTaxRatesDropdown } from '../../../../../hooks/queries/useProductMasterdata';

// =================================================================
// TYPES
// =================================================================

interface TaxEntry {
  id: string;
  name: string;
  rate: number;
}

interface PricingRecord {
  id: string;
  currency: string;
  amount: number;
  price_type: 'fixed' | 'hourly' | 'per_unit' | 'price_range';
  tax_inclusion: 'inclusive' | 'exclusive';
  taxes: TaxEntry[];
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
  taxes: TaxEntry[];
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

  // Get resource types from formData
  const selectedResourceTypes = (formData.meta?.resourceTypes as string[]) || [];
  const resourceQuantities = (formData.meta?.resourceQuantities as Record<string, number>) || {};
  const pricingMode = (formData.meta?.pricingMode as string) || 'independent';

  const defaultCurrency = 'INR';

  // =================================================================
  // STATE
  // =================================================================

  const [pricingRecords, setPricingRecords] = useState<PricingRecord[]>(() => {
    const existing = formData.meta?.pricingRecords as PricingRecord[];
    if (existing && existing.length > 0) return existing;
    return [{
      id: '1',
      currency: defaultCurrency,
      amount: 0,
      price_type: 'fixed',
      tax_inclusion: 'exclusive',
      taxes: [],
      is_active: true,
    }];
  });

  const [resourcePricingRecords, setResourcePricingRecords] = useState<ResourcePricingRecord[]>(() => {
    const existing = formData.meta?.resourcePricingRecords as ResourcePricingRecord[];
    if (existing && existing.length > 0) return existing;
    return selectedResourceTypes.map((typeId, idx) => ({
      id: `rp-${idx}`,
      resourceTypeId: typeId,
      resourceTypeName: typeId.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
      currency: defaultCurrency,
      pricePerUnit: 0,
      pricingModel: 'hourly' as const,
      tax_inclusion: 'exclusive' as const,
      taxes: [],
    }));
  });

  const [tiers, setTiers] = useState<PricingTier[]>(
    (formData.meta?.pricingTiers as PricingTier[]) || []
  );

  const [priceType, setPriceType] = useState<PriceType>(
    (formData.meta?.priceType as PriceType) || 'fixed'
  );

  const [addCurrencyDropdown, setAddCurrencyDropdown] = useState(false);
  const [taxDropdownOpen, setTaxDropdownOpen] = useState<string | null>(null);
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);

  // Sync to formData
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
  // STYLES - White background for inputs
  // =================================================================

  const cardStyle = {
    backgroundColor: isDarkMode ? colors.utility.secondaryBackground : '#FFFFFF',
    borderColor: isDarkMode ? colors.utility.secondaryBackground : '#E5E7EB',
    boxShadow: isDarkMode ? 'none' : '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)'
  };

  const inputStyle = {
    backgroundColor: isDarkMode ? colors.utility.primaryBackground : '#F9FAFB',
    borderColor: isDarkMode ? colors.utility.secondaryBackground : '#D1D5DB',
    color: colors.utility.primaryText,
  };

  // =================================================================
  // PRICE BREAKDOWN CALCULATION
  // =================================================================

  const calculateBreakdown = useCallback((amount: number, taxes: TaxEntry[], taxInclusion: 'inclusive' | 'exclusive') => {
    const totalTaxRate = taxes.reduce((sum, t) => sum + t.rate, 0);
    if (taxInclusion === 'inclusive') {
      const baseAmount = amount / (1 + totalTaxRate / 100);
      const taxAmount = amount - baseAmount;
      return { subtotal: baseAmount, taxAmount, total: amount, taxRate: totalTaxRate };
    } else {
      const taxAmount = (amount * totalTaxRate) / 100;
      return { subtotal: amount, taxAmount, total: amount + taxAmount, taxRate: totalTaxRate };
    }
  }, []);

  // =================================================================
  // HANDLERS
  // =================================================================

  const addPricingRecord = useCallback((currency: string) => {
    if (pricingRecords.some((r) => r.currency === currency)) return;
    setPricingRecords([...pricingRecords, {
      id: Date.now().toString(),
      currency,
      amount: 0,
      price_type: priceType === 'tiered' ? 'fixed' : (priceType as 'fixed' | 'hourly'),
      tax_inclusion: 'exclusive',
      taxes: [],
      is_active: true,
    }]);
    setAddCurrencyDropdown(false);
  }, [pricingRecords, priceType]);

  const removePricingRecord = useCallback((id: string) => {
    if (pricingRecords.length <= 1) return;
    setPricingRecords(pricingRecords.filter((r) => r.id !== id));
  }, [pricingRecords]);

  const updatePricingRecord = useCallback((id: string, field: keyof PricingRecord, value: unknown) => {
    setPricingRecords(prev => prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
  }, []);

  const addTaxToRecord = useCallback((recordId: string, taxOption: { value: string; label: string; rate?: number }) => {
    setPricingRecords(prev => prev.map((r) => {
      if (r.id !== recordId) return r;
      if (r.taxes.some(t => t.id === taxOption.value)) return r;
      return { ...r, taxes: [...r.taxes, { id: taxOption.value, name: taxOption.label, rate: taxOption.rate || 0 }] };
    }));
    setTaxDropdownOpen(null);
  }, []);

  const removeTaxFromRecord = useCallback((recordId: string, taxId: string) => {
    setPricingRecords(prev => prev.map((r) => {
      if (r.id !== recordId) return r;
      return { ...r, taxes: r.taxes.filter(t => t.id !== taxId) };
    }));
  }, []);

  // Resource pricing handlers
  const addResourcePricingCurrency = useCallback((resourceTypeId: string, currency: string) => {
    if (resourcePricingRecords.some(r => r.resourceTypeId === resourceTypeId && r.currency === currency)) return;
    const existing = resourcePricingRecords.find(r => r.resourceTypeId === resourceTypeId);
    setResourcePricingRecords([...resourcePricingRecords, {
      id: `rp-${Date.now()}`,
      resourceTypeId,
      resourceTypeName: existing?.resourceTypeName || resourceTypeId,
      currency,
      pricePerUnit: 0,
      pricingModel: existing?.pricingModel || 'hourly',
      tax_inclusion: 'exclusive',
      taxes: [],
    }]);
  }, [resourcePricingRecords]);

  const updateResourcePricing = useCallback((id: string, field: keyof ResourcePricingRecord, value: unknown) => {
    setResourcePricingRecords(prev => prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
  }, []);

  const addTaxToResourceRecord = useCallback((recordId: string, taxOption: { value: string; label: string; rate?: number }) => {
    setResourcePricingRecords(prev => prev.map((r) => {
      if (r.id !== recordId) return r;
      if (r.taxes.some(t => t.id === taxOption.value)) return r;
      return { ...r, taxes: [...r.taxes, { id: taxOption.value, name: taxOption.label, rate: taxOption.rate || 0 }] };
    }));
    setTaxDropdownOpen(null);
  }, []);

  const removeTaxFromResourceRecord = useCallback((recordId: string, taxId: string) => {
    setResourcePricingRecords(prev => prev.map((r) => {
      if (r.id !== recordId) return r;
      return { ...r, taxes: r.taxes.filter(t => t.id !== taxId) };
    }));
  }, []);

  const addTier = useCallback((currency: string) => {
    setTiers([...tiers, {
      id: Date.now().toString(),
      name: `Tier ${tiers.filter((t) => t.currency === currency).length + 1}`,
      price: 0,
      currency,
    }]);
  }, [tiers]);

  const removeTier = useCallback((id: string) => {
    setTiers(tiers.filter((t) => t.id !== id));
  }, [tiers]);

  const updateTier = useCallback((id: string, field: keyof PricingTier, value: string | number) => {
    setTiers(tiers.map((t) => (t.id === id ? { ...t, [field]: value } : t)));
  }, [tiers]);

  const getAvailableCurrencies = useCallback(() => {
    const used = pricingRecords.map((r) => r.currency);
    return currencyOptions.filter((c) => !used.includes(c.code));
  }, [pricingRecords]);

  const getAvailableCurrenciesForResource = useCallback((resourceTypeId: string) => {
    const used = resourcePricingRecords.filter((r) => r.resourceTypeId === resourceTypeId).map((r) => r.currency);
    return currencyOptions.filter((c) => !used.includes(c.code));
  }, [resourcePricingRecords]);

  // Only Fixed and Hourly options (Tiered and Quote hidden)
  const pricingOptions = [
    { id: 'fixed', icon: DollarSign, label: 'Fixed Price', description: 'One-time fixed amount' },
    { id: 'hourly', icon: Calculator, label: 'Hourly Rate', description: 'Charge per hour' },
    // HIDDEN: Tiered and Quote options
    // { id: 'tiered', icon: Percent, label: 'Tiered', description: 'Multiple tiers' },
    // { id: 'custom', icon: Lightbulb, label: 'Quote', description: 'Custom quote' },
  ];

  // =================================================================
  // TAX TAGS COMPONENT
  // =================================================================

  const TaxTags: React.FC<{
    taxes: TaxEntry[];
    onRemove: (taxId: string) => void;
    recordId: string;
    onAddTax: (recordId: string, tax: { value: string; label: string; rate?: number }) => void;
    availableTaxes: { value: string; label: string; rate?: number }[];
  }> = ({ taxes, onRemove, recordId, onAddTax, availableTaxes }) => {
    const unused = availableTaxes.filter(t => !taxes.some(existing => existing.id === t.value));

    return (
      <div>
        <label className="block text-xs font-medium mb-1.5" style={{ color: colors.utility.secondaryText }}>
          Tax Rates (select multiple)
        </label>
        <div className="flex flex-wrap gap-1.5 items-center min-h-[40px] p-2 border rounded-xl" style={inputStyle}>
          {taxes.map((tax) => (
            <span
              key={tax.id}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium"
              style={{ backgroundColor: `${colors.brand.primary}15`, color: colors.brand.primary }}
            >
              {tax.name} ({tax.rate}%)
              <button type="button" onClick={() => onRemove(tax.id)} className="hover:opacity-70">
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}

          {unused.length > 0 && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setTaxDropdownOpen(taxDropdownOpen === recordId ? null : recordId)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs border border-dashed hover:border-solid transition-all"
                style={{ borderColor: colors.brand.primary, color: colors.brand.primary }}
              >
                <Plus className="w-3 h-3" />
                Add Tax
              </button>

              {taxDropdownOpen === recordId && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setTaxDropdownOpen(null)} />
                  <div
                    className="absolute left-0 z-50 mt-1 w-48 max-h-48 overflow-y-auto rounded-xl border shadow-lg"
                    style={{
                      backgroundColor: isDarkMode ? colors.utility.primaryBackground : '#FFFFFF',
                      borderColor: isDarkMode ? colors.utility.secondaryBackground : '#E5E7EB',
                    }}
                  >
                    {unused.map((tax) => (
                      <button
                        key={tax.value}
                        type="button"
                        onClick={() => onAddTax(recordId, tax)}
                        className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-800 text-sm"
                      >
                        <span>{tax.label}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {taxes.length === 0 && unused.length === 0 && (
            <span className="text-xs" style={{ color: colors.utility.secondaryText }}>No taxes available</span>
          )}
        </div>
      </div>
    );
  };

  // =================================================================
  // PRICE BREAKDOWN COMPONENT
  // =================================================================

  const PriceBreakdown: React.FC<{
    amount: number;
    taxes: TaxEntry[];
    taxInclusion: 'inclusive' | 'exclusive';
    currencySymbol: string;
  }> = ({ amount, taxes, taxInclusion, currencySymbol }) => {
    const breakdown = calculateBreakdown(amount, taxes, taxInclusion);
    if (amount <= 0) return null;

    return (
      <div
        className="mt-3 p-3 rounded-xl border"
        style={{ backgroundColor: `${colors.semantic.success}08`, borderColor: `${colors.semantic.success}30` }}
      >
        <div className="flex items-center gap-2 mb-2">
          <Receipt className="w-4 h-4" style={{ color: colors.semantic.success }} />
          <span className="text-xs font-semibold" style={{ color: colors.utility.primaryText }}>Price Breakdown</span>
        </div>
        <div className="space-y-1 text-xs" style={{ color: colors.utility.secondaryText }}>
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span style={{ color: colors.utility.primaryText }}>{currencySymbol} {breakdown.subtotal.toFixed(2)}</span>
          </div>
          {taxes.map((tax) => (
            <div key={tax.id} className="flex justify-between">
              <span>{tax.name} ({tax.rate}%)</span>
              <span style={{ color: colors.utility.primaryText }}>{currencySymbol} {((breakdown.subtotal * tax.rate) / 100).toFixed(2)}</span>
            </div>
          ))}
          {taxes.length > 1 && (
            <div className="flex justify-between pt-1 border-t" style={{ borderColor: isDarkMode ? '#374151' : '#E5E7EB' }}>
              <span>Total Tax ({breakdown.taxRate}%)</span>
              <span style={{ color: colors.utility.primaryText }}>{currencySymbol} {breakdown.taxAmount.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between pt-1 border-t font-semibold" style={{ borderColor: isDarkMode ? '#374151' : '#E5E7EB', color: colors.utility.primaryText }}>
            <span>Total</span>
            <span style={{ color: colors.semantic.success }}>{currencySymbol} {breakdown.total.toFixed(2)}</span>
          </div>
          {taxInclusion === 'inclusive' && (
            <div className="text-[10px] italic" style={{ color: colors.utility.secondaryText }}>* Price is tax inclusive</div>
          )}
        </div>
      </div>
    );
  };

  // =================================================================
  // RENDER
  // =================================================================

  return (
    <div className="animate-in fade-in slide-in-from-right-4 duration-200">
      <h2 className="text-lg font-bold mb-1" style={{ color: colors.utility.primaryText }}>
        Pricing Configuration
      </h2>
      <p className="text-sm mb-6" style={{ color: colors.utility.secondaryText }}>
        Set your service pricing. Add multiple currencies and tax rates as needed.
      </p>

      {/* TWO-COLUMN LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left Column (3/5) - Pricing Controls */}
        <div className="lg:col-span-3 space-y-6">

          {/* Resource-based Pricing Notice */}
          {pricingMode === 'resource_based' && selectedResourceTypes.length > 0 && (
            <div className="flex items-start gap-3 p-4 rounded-xl border" style={cardStyle}>
              <Users className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: colors.brand.primary }} />
              <div>
                <h4 className="font-semibold text-sm" style={{ color: colors.utility.primaryText }}>Resource-Based Pricing Active</h4>
                <p className="text-xs mt-1" style={{ color: colors.utility.secondaryText }}>Configure pricing for each resource type. Multiple taxes can be applied.</p>
              </div>
            </div>
          )}

          {/* Pricing Model Selection - Always shown regardless of pricingMode */}
          <div className="p-6 rounded-xl border" style={cardStyle}>
              <label className="block text-sm font-semibold mb-4" style={{ color: colors.utility.primaryText }}>
                Pricing Model <span style={{ color: colors.semantic.error }}>*</span>
              </label>
              <div className="grid grid-cols-2 gap-3">
                {pricingOptions.map((option) => {
                  const IconComp = option.icon;
                  const isSelected = priceType === option.id;
                  return (
                    <div
                      key={option.id}
                      onClick={() => setPriceType(option.id as PriceType)}
                      className="p-4 border-2 rounded-xl cursor-pointer transition-all hover:shadow-md"
                      style={{
                        backgroundColor: isSelected ? `${colors.brand.primary}08` : (isDarkMode ? colors.utility.primaryBackground : '#FFFFFF'),
                        borderColor: isSelected ? colors.brand.primary : (isDarkMode ? colors.utility.secondaryBackground : '#E5E7EB'),
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-12 h-12 rounded-xl flex items-center justify-center"
                          style={{
                            backgroundColor: isSelected ? colors.brand.primary : `${colors.brand.primary}15`,
                          }}
                        >
                          <IconComp
                            className="w-6 h-6"
                            style={{ color: isSelected ? '#FFFFFF' : colors.brand.primary }}
                          />
                        </div>
                        <div className="flex-1">
                          <div className="text-sm font-semibold" style={{ color: colors.utility.primaryText }}>{option.label}</div>
                          <div className="text-xs" style={{ color: colors.utility.secondaryText }}>{option.description}</div>
                        </div>
                        {isSelected && (
                          <CheckCircle2 className="w-5 h-5" style={{ color: colors.brand.primary }} />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          {/* MULTI-CURRENCY PRICING RECORDS - Always shown regardless of pricingMode */}
          {priceType !== 'custom' && (
            <div className="p-6 rounded-xl border" style={cardStyle}>
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-semibold flex items-center gap-2" style={{ color: colors.utility.primaryText }}>
                  <Globe className="w-4 h-4" style={{ color: colors.brand.primary }} />
                  Currency-Specific Pricing
                </h4>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setAddCurrencyDropdown(!addCurrencyDropdown)}
                    className="flex items-center gap-1 text-sm px-3 py-1.5 rounded-xl border-2 font-medium transition-all hover:shadow-md"
                    style={{
                      backgroundColor: isDarkMode ? colors.utility.primaryBackground : '#FFFFFF',
                      color: colors.brand.primary,
                      borderColor: colors.brand.primary
                    }}
                    disabled={getAvailableCurrencies().length === 0}
                  >
                    <Plus className="w-4 h-4" />
                    Add Currency
                  </button>
                  {addCurrencyDropdown && getAvailableCurrencies().length > 0 && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setAddCurrencyDropdown(false)} />
                      <div className="absolute right-0 z-50 mt-1 w-56 max-h-60 overflow-y-auto rounded-xl border shadow-lg" style={{ backgroundColor: isDarkMode ? colors.utility.primaryBackground : '#FFFFFF', borderColor: isDarkMode ? colors.utility.secondaryBackground : '#E5E7EB' }}>
                        {getAvailableCurrencies().map((currency) => (
                          <button key={currency.code} type="button" onClick={() => addPricingRecord(currency.code)} className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-800">
                            <span className="w-8 font-semibold">{currency.symbol}</span>
                            <span className="text-sm">{currency.name} ({currency.code})</span>
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                {pricingRecords.map((record) => {
                  const currencyInfo = currencyOptions.find((c) => c.code === record.currency);
                  const currencySymbol = currencyInfo?.symbol || record.currency;

                  return (
                    <div key={record.id} className="p-4 rounded-xl border" style={{ backgroundColor: isDarkMode ? colors.utility.primaryBackground : '#FAFAFA', borderColor: isDarkMode ? '#374151' : '#E5E7EB' }}>
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <span className="w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold" style={{ backgroundColor: `${colors.brand.primary}20`, color: colors.brand.primary }}>
                            {currencySymbol}
                          </span>
                          <div>
                            <div className="font-semibold" style={{ color: colors.utility.primaryText }}>{currencyInfo?.name || record.currency}</div>
                            <div className="text-xs" style={{ color: colors.utility.secondaryText }}>{record.currency}</div>
                          </div>
                        </div>
                        {pricingRecords.length > 1 && (
                          <button type="button" onClick={() => removePricingRecord(record.id)} className="p-2 rounded-lg hover:bg-red-50 transition-colors" title="Remove">
                            <Trash2 className="w-4 h-4" style={{ color: colors.semantic.error }} />
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-medium mb-1.5" style={{ color: colors.utility.secondaryText }}>
                            {priceType === 'hourly' ? 'Hourly Rate' : 'Price'} <span className="text-red-500">*</span>
                          </label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 font-semibold" style={{ color: colors.utility.secondaryText }}>{currencySymbol}</span>
                            <input
                              type="number"
                              value={record.amount || ''}
                              onChange={(e) => updatePricingRecord(record.id, 'amount', parseFloat(e.target.value) || 0)}
                              className="w-full pl-10 pr-3 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2"
                              style={inputStyle}
                              placeholder="0.00"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-medium mb-1.5" style={{ color: colors.utility.secondaryText }}>Tax Treatment</label>
                          <select
                            value={record.tax_inclusion}
                            onChange={(e) => updatePricingRecord(record.id, 'tax_inclusion', e.target.value)}
                            className="w-full px-3 py-2.5 border rounded-xl text-sm"
                            style={inputStyle}
                          >
                            <option value="exclusive">Tax Exclusive</option>
                            <option value="inclusive">Tax Inclusive</option>
                          </select>
                        </div>
                      </div>

                      <div className="mt-4">
                        <TaxTags taxes={record.taxes} onRemove={(taxId) => removeTaxFromRecord(record.id, taxId)} recordId={record.id} onAddTax={addTaxToRecord} availableTaxes={taxRateOptions} />
                      </div>

                      <PriceBreakdown amount={record.amount} taxes={record.taxes} taxInclusion={record.tax_inclusion} currencySymbol={currencySymbol} />

                      {/* HIDDEN: Tiered pricing section */}
                      {/*
                      {priceType === 'tiered' && (
                        <div className="mt-4 pt-4 border-t" style={{ borderColor: isDarkMode ? '#374151' : '#E5E7EB' }}>
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-xs font-medium" style={{ color: colors.utility.secondaryText }}>Pricing Tiers ({currencySymbol})</span>
                            <button type="button" onClick={() => addTier(record.currency)} className="text-xs flex items-center gap-1 px-2 py-1 rounded" style={{ color: colors.brand.primary, backgroundColor: `${colors.brand.primary}10` }}>
                              <Plus className="w-3 h-3" /> Add Tier
                            </button>
                          </div>
                          <div className="space-y-2">
                            {tiers.filter((t) => t.currency === record.currency).map((tier, idx) => (
                              <div key={tier.id} className="flex items-center gap-2">
                                <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold" style={{ backgroundColor: `${colors.brand.primary}15`, color: colors.brand.primary }}>{idx + 1}</span>
                                <input type="text" value={tier.name} onChange={(e) => updateTier(tier.id, 'name', e.target.value)} className="flex-1 px-2 py-1.5 border rounded-lg text-sm" style={inputStyle} placeholder="Tier name" />
                                <div className="relative w-28">
                                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs" style={{ color: colors.utility.secondaryText }}>{currencySymbol}</span>
                                  <input type="number" value={tier.price || ''} onChange={(e) => updateTier(tier.id, 'price', parseFloat(e.target.value) || 0)} className="w-full pl-6 pr-2 py-1.5 border rounded-lg text-sm" style={inputStyle} />
                                </div>
                                <button type="button" onClick={() => removeTier(tier.id)} className="p-1">
                                  <Trash2 className="w-3 h-3" style={{ color: colors.utility.secondaryText }} />
                                </button>
                              </div>
                            ))}
                            {tiers.filter((t) => t.currency === record.currency).length === 0 && (
                              <p className="text-xs italic" style={{ color: colors.utility.secondaryText }}>No tiers added. Click "Add Tier" to create pricing tiers.</p>
                            )}
                          </div>
                        </div>
                      )}
                      */}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* RESOURCE-BASED PRICING */}
          {pricingMode === 'resource_based' && selectedResourceTypes.length > 0 && (
            <div className="space-y-6">
              {selectedResourceTypes.map((resourceTypeId) => {
                const resourceName = resourceTypeId.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
                const records = resourcePricingRecords.filter((r) => r.resourceTypeId === resourceTypeId);
                const available = getAvailableCurrenciesForResource(resourceTypeId);

                return (
                  <div key={resourceTypeId} className="p-4 rounded-xl border" style={cardStyle}>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <Users className="w-5 h-5" style={{ color: colors.brand.primary }} />
                        <div>
                          <span className="font-semibold" style={{ color: colors.utility.primaryText }}>{resourceName}</span>
                          {resourceQuantities[resourceTypeId] > 1 && (
                            <span className="ml-2 text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: `${colors.brand.primary}15`, color: colors.brand.primary }}>x{resourceQuantities[resourceTypeId]}</span>
                          )}
                        </div>
                      </div>
                      {available.length > 0 && (
                        <div className="relative">
                          <button type="button" onClick={() => setEditingRecordId(editingRecordId === resourceTypeId ? null : resourceTypeId)} className="text-xs flex items-center gap-1 px-2 py-1 rounded-xl border-2 font-medium" style={{ color: colors.brand.primary, borderColor: colors.brand.primary, backgroundColor: isDarkMode ? colors.utility.secondaryBackground : '#FFFFFF' }}>
                            <Plus className="w-3 h-3" /> Currency
                          </button>
                          {editingRecordId === resourceTypeId && (
                            <>
                              <div className="fixed inset-0 z-40" onClick={() => setEditingRecordId(null)} />
                              <div className="absolute right-0 z-50 mt-1 w-48 max-h-48 overflow-y-auto rounded-xl border shadow-lg" style={{ backgroundColor: isDarkMode ? colors.utility.primaryBackground : '#FFFFFF', borderColor: isDarkMode ? colors.utility.secondaryBackground : '#E5E7EB' }}>
                                {available.map((c) => (
                                  <button key={c.code} type="button" onClick={() => { addResourcePricingCurrency(resourceTypeId, c.code); setEditingRecordId(null); }} className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-800 text-sm">
                                    <span className="font-semibold">{c.symbol}</span><span>{c.code}</span>
                                  </button>
                                ))}
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="space-y-3">
                      {records.map((record) => {
                        const info = currencyOptions.find((c) => c.code === record.currency);
                        const sym = info?.symbol || record.currency;
                        return (
                          <div key={record.id} className="p-3 rounded-xl border" style={{ backgroundColor: isDarkMode ? colors.utility.primaryBackground : '#FAFAFA', borderColor: isDarkMode ? '#374151' : '#E5E7EB' }}>
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium" style={{ color: colors.utility.primaryText }}>{sym} {record.currency}</span>
                              {records.length > 1 && (
                                <button type="button" onClick={() => setResourcePricingRecords(prev => prev.filter(r => r.id !== record.id))} className="p-1">
                                  <Trash2 className="w-3 h-3" style={{ color: colors.semantic.error }} />
                                </button>
                              )}
                            </div>
                            <div className="grid grid-cols-3 gap-3">
                              <div>
                                <label className="block text-xs mb-1" style={{ color: colors.utility.secondaryText }}>Model</label>
                                <select value={record.pricingModel} onChange={(e) => updateResourcePricing(record.id, 'pricingModel', e.target.value)} className="w-full px-2 py-1.5 border rounded-xl text-sm" style={inputStyle}>
                                  <option value="hourly">Per Hour</option>
                                  <option value="per_unit">Per Unit</option>
                                  <option value="fixed">Fixed</option>
                                </select>
                              </div>
                              <div>
                                <label className="block text-xs mb-1" style={{ color: colors.utility.secondaryText }}>Rate</label>
                                <div className="relative">
                                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs" style={{ color: colors.utility.secondaryText }}>{sym}</span>
                                  <input type="number" value={record.pricePerUnit || ''} onChange={(e) => updateResourcePricing(record.id, 'pricePerUnit', parseFloat(e.target.value) || 0)} className="w-full pl-6 pr-2 py-1.5 border rounded-xl text-sm" style={inputStyle} placeholder="0" />
                                </div>
                              </div>
                              <div>
                                <label className="block text-xs mb-1" style={{ color: colors.utility.secondaryText }}>Tax Mode</label>
                                <select value={record.tax_inclusion} onChange={(e) => updateResourcePricing(record.id, 'tax_inclusion', e.target.value)} className="w-full px-2 py-1.5 border rounded-xl text-sm" style={inputStyle}>
                                  <option value="exclusive">Exclusive</option>
                                  <option value="inclusive">Inclusive</option>
                                </select>
                              </div>
                            </div>
                            <div className="mt-3">
                              <TaxTags taxes={record.taxes} onRemove={(taxId) => removeTaxFromResourceRecord(record.id, taxId)} recordId={record.id} onAddTax={addTaxToResourceRecord} availableTaxes={taxRateOptions} />
                            </div>
                            <PriceBreakdown amount={record.pricePerUnit} taxes={record.taxes} taxInclusion={record.tax_inclusion} currencySymbol={sym} />
                          </div>
                        );
                      })}
                      {records.length === 0 && (
                        <div className="p-3 rounded-xl border-2 border-dashed text-center" style={{ borderColor: isDarkMode ? '#374151' : '#E5E7EB' }}>
                          <p className="text-sm" style={{ color: colors.utility.secondaryText }}>No pricing configured. Click "+ Currency" to add pricing.</p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* HIDDEN: Custom Quote Mode */}
          {/*
          {priceType === 'custom' && pricingMode !== 'resource_based' && (
            <div className="p-4 rounded-xl border" style={{ ...cardStyle, borderColor: `${colors.semantic.warning}40` }}>
              <div className="flex gap-3">
                <Lightbulb className="w-5 h-5 flex-shrink-0" style={{ color: colors.semantic.warning }} />
                <div>
                  <div className="font-semibold" style={{ color: colors.utility.primaryText }}>Custom Quote Mode</div>
                  <p className="text-sm mt-1" style={{ color: colors.utility.secondaryText }}>Price will be determined per contract. A quote request form will be shown to customers.</p>
                </div>
              </div>
            </div>
          )}
          */}

          {/* HIDDEN: Discount Options */}
          {/*
          <div className="border-t pt-6" style={{ borderColor: isDarkMode ? colors.utility.secondaryBackground : '#E5E7EB' }}>
            <h4 className="text-sm font-semibold mb-4" style={{ color: colors.utility.primaryText }}>Discount Options</h4>
            <div className="p-4 rounded-xl border shadow-sm space-y-3" style={cardStyle}>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={(formData.meta?.allowCoupons as boolean) || false} onChange={(e) => onChange('meta', { ...formData.meta, allowCoupons: e.target.checked })} className="w-4 h-4 rounded" style={{ accentColor: colors.brand.primary }} />
                <span className="text-sm" style={{ color: colors.utility.primaryText }}>Allow coupon codes</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={(formData.meta?.allowBulkDiscount as boolean) || false} onChange={(e) => onChange('meta', { ...formData.meta, allowBulkDiscount: e.target.checked })} className="w-4 h-4 rounded" style={{ accentColor: colors.brand.primary }} />
                <span className="text-sm" style={{ color: colors.utility.primaryText }}>Allow bulk/quantity discounts</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={(formData.meta?.allowNegotiatedPricing as boolean) || false} onChange={(e) => onChange('meta', { ...formData.meta, allowNegotiatedPricing: e.target.checked })} className="w-4 h-4 rounded" style={{ accentColor: colors.brand.primary }} />
                <span className="text-sm" style={{ color: colors.utility.primaryText }}>Enable negotiated pricing</span>
              </label>
            </div>
          </div>
          */}
        </div>

        {/* Right Column (2/5) - Explanation Card */}
        <div className="lg:col-span-2">
          <div
            className="p-6 rounded-xl border h-full"
            style={{
              backgroundColor: isDarkMode ? `${colors.semantic.success}10` : '#ECFDF5',
              borderColor: isDarkMode ? `${colors.semantic.success}30` : '#A7F3D0'
            }}
          >
            <div className="flex items-start gap-3 mb-4">
              <div
                className="p-2.5 rounded-xl"
                style={{
                  backgroundColor: isDarkMode ? colors.semantic.success : '#059669',
                }}
              >
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <div>
                <h4 className="font-semibold text-base" style={{ color: isDarkMode ? colors.utility.primaryText : '#064E3B' }}>
                  Pricing Best Practices
                </h4>
              </div>
            </div>

            <div className="space-y-4 text-sm" style={{ color: isDarkMode ? colors.utility.secondaryText : '#047857' }}>
              <p>
                Choose the right pricing model for your service:
              </p>

              <ul className="space-y-3">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: isDarkMode ? colors.semantic.success : '#059669' }} />
                  <span><strong>Fixed Price</strong> — Best for well-defined services with predictable scope and delivery</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: isDarkMode ? colors.semantic.success : '#059669' }} />
                  <span><strong>Hourly Rate</strong> — Ideal for consulting, support, or variable-length engagements</span>
                </li>
              </ul>
            </div>

            <div
              className="mt-5 p-4 rounded-xl"
              style={{
                backgroundColor: isDarkMode ? colors.utility.secondaryBackground : '#FFFFFF',
              }}
            >
              <div className="flex items-center gap-2 mb-2">
                <Info className="w-4 h-4" style={{ color: isDarkMode ? colors.semantic.success : '#059669' }} />
                <span className="font-semibold text-sm" style={{ color: isDarkMode ? colors.utility.primaryText : '#064E3B' }}>
                  Multi-Currency Tips
                </span>
              </div>
              <ul className="text-xs space-y-1" style={{ color: isDarkMode ? colors.utility.secondaryText : '#047857' }}>
                <li>• Add currencies for international customers</li>
                <li>• Set appropriate tax rates per currency/region</li>
                <li>• Use tax-inclusive pricing for consumer services</li>
                <li>• Price breakdown shows automatically when taxes applied</li>
              </ul>
            </div>

            <div
              className="mt-4 p-4 rounded-xl"
              style={{
                backgroundColor: isDarkMode ? colors.utility.secondaryBackground : '#FFFFFF',
              }}
            >
              <div className="flex items-center gap-2 mb-2">
                <Globe className="w-4 h-4" style={{ color: isDarkMode ? colors.semantic.success : '#059669' }} />
                <span className="font-semibold text-sm" style={{ color: isDarkMode ? colors.utility.primaryText : '#064E3B' }}>
                  Tax Configuration
                </span>
              </div>
              <ul className="text-xs space-y-1" style={{ color: isDarkMode ? colors.utility.secondaryText : '#047857' }}>
                <li>• Multiple taxes can be applied to a single price</li>
                <li>• Choose between tax-inclusive or tax-exclusive</li>
                <li>• Price breakdown updates in real-time</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PricingStep;
