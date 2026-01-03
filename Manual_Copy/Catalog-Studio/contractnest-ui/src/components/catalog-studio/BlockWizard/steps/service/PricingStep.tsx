// src/components/catalog-studio/BlockWizard/steps/service/PricingStep.tsx
// Phase 6: Enhanced with multi-currency, tax integration, resource-specific pricing

import React, { useState, useMemo } from 'react';
import {
  DollarSign,
  Percent,
  Calculator,
  Plus,
  Trash2,
  Lightbulb,
  ChevronDown,
  Users,
  AlertCircle,
  Info,
  Check,
} from 'lucide-react';
import { useTheme } from '../../../../../contexts/ThemeContext';
import { Block } from '../../../../../types/catalogStudio';
import { currencyOptions, getCurrencySymbol, Currency } from '../../../../../utils/constants/currencies';
import { useTaxRatesDropdown } from '../../../../../hooks/queries/useProductMasterdata';

// =================================================================
// TYPES
// =================================================================

interface PricingTier {
  id: string;
  name: string;
  price: number;
  description?: string;
}

interface ResourcePricing {
  resourceTypeId: string;
  resourceTypeName: string;
  pricePerUnit: number;
  pricingModel: 'hourly' | 'per_unit' | 'fixed';
}

interface PricingStepProps {
  formData: Partial<Block>;
  onChange: (field: string, value: unknown) => void;
}

type PriceType = 'fixed' | 'hourly' | 'tiered' | 'custom' | 'resource_based';

// =================================================================
// COMPONENT
// =================================================================

const PricingStep: React.FC<PricingStepProps> = ({ formData, onChange }) => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  // Tax rates from API
  const { options: taxRateOptions, isLoading: taxLoading } = useTaxRatesDropdown();

  // Local state
  const [priceType, setPriceType] = useState<PriceType>(
    (formData.meta?.priceType as PriceType) || 'fixed'
  );
  const [showCurrencyDropdown, setShowCurrencyDropdown] = useState(false);
  const [tiers, setTiers] = useState<PricingTier[]>(
    (formData.meta?.pricingTiers as PricingTier[]) || [
      { id: '1', name: 'Basic', price: 500, description: 'Standard service' },
      { id: '2', name: 'Premium', price: 1000, description: 'Extended service with extras' },
    ]
  );

  // Get resource types from formData (set in ResourceDependencyStep)
  const selectedResourceTypes = (formData.meta?.resourceTypes as string[]) || [];
  const resourceQuantities = (formData.meta?.resourceQuantities as Record<string, number>) || {};
  const pricingMode = (formData.meta?.pricingMode as string) || 'independent';

  // Resource pricing state
  const [resourcePricing, setResourcePricing] = useState<ResourcePricing[]>(
    (formData.meta?.resourcePricing as ResourcePricing[]) ||
      selectedResourceTypes.map((typeId) => ({
        resourceTypeId: typeId,
        resourceTypeName: typeId.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
        pricePerUnit: 0,
        pricingModel: 'hourly' as const,
      }))
  );

  // Current currency
  const currentCurrency = (formData.meta?.currency as string) || 'INR';
  const currencySymbol = getCurrencySymbol(currentCurrency);

  // Styles
  const inputStyle = {
    backgroundColor: colors.utility.primaryBackground,
    borderColor: isDarkMode ? colors.utility.secondaryBackground : '#D1D5DB',
    color: colors.utility.primaryText,
  };

  const labelStyle = { color: colors.utility.primaryText };

  // Pricing options
  const pricingOptions = [
    { id: 'fixed', icon: DollarSign, label: 'Fixed', description: 'One price' },
    { id: 'hourly', icon: Calculator, label: 'Hourly', description: 'Per hour' },
    { id: 'tiered', icon: Percent, label: 'Tiered', description: 'Multiple options' },
    { id: 'custom', icon: Calculator, label: 'Quote', description: 'Custom quote' },
  ];

  // Handlers
  const handlePriceTypeChange = (type: PriceType) => {
    setPriceType(type);
    onChange('meta', { ...formData.meta, priceType: type });
  };

  const handleCurrencyChange = (currencyCode: string) => {
    onChange('meta', { ...formData.meta, currency: currencyCode });
    setShowCurrencyDropdown(false);
  };

  const handleTaxRateChange = (taxRateId: string) => {
    const selectedRate = taxRateOptions.find((r) => r.value === taxRateId);
    onChange('meta', {
      ...formData.meta,
      taxRateId,
      taxRate: selectedRate?.rate || 0,
    });
  };

  const addTier = () => {
    const newTier: PricingTier = {
      id: Date.now().toString(),
      name: `Tier ${tiers.length + 1}`,
      price: 0,
    };
    const updated = [...tiers, newTier];
    setTiers(updated);
    onChange('meta', { ...formData.meta, pricingTiers: updated });
  };

  const removeTier = (id: string) => {
    const updated = tiers.filter((t) => t.id !== id);
    setTiers(updated);
    onChange('meta', { ...formData.meta, pricingTiers: updated });
  };

  const updateTier = (id: string, field: keyof PricingTier, value: string | number) => {
    const updated = tiers.map((t) => (t.id === id ? { ...t, [field]: value } : t));
    setTiers(updated);
    onChange('meta', { ...formData.meta, pricingTiers: updated });
  };

  const updateResourcePricing = (
    typeId: string,
    field: keyof ResourcePricing,
    value: string | number
  ) => {
    const updated = resourcePricing.map((rp) =>
      rp.resourceTypeId === typeId ? { ...rp, [field]: value } : rp
    );
    setResourcePricing(updated);
    onChange('meta', { ...formData.meta, resourcePricing: updated });
  };

  return (
    <div className="animate-in fade-in slide-in-from-right-4 duration-200">
      <h2 className="text-lg font-bold mb-1" style={{ color: colors.utility.primaryText }}>
        Pricing Configuration
      </h2>
      <p className="text-sm mb-6" style={{ color: colors.utility.secondaryText }}>
        Set how this block will be priced.
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
                This block uses resource-dependent pricing. Configure rates for each resource type below.
              </p>
            </div>
          </div>
        )}

        {/* Pricing Model Selection (only show if not resource-based) */}
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
                    onClick={() => handlePriceTypeChange(option.id as PriceType)}
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

        {/* Currency Selection */}
        <div>
          <label className="block text-sm font-medium mb-2" style={labelStyle}>
            Currency
          </label>
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowCurrencyDropdown(!showCurrencyDropdown)}
              className="w-full flex items-center justify-between px-3 py-2.5 border rounded-lg text-sm"
              style={inputStyle}
            >
              <div className="flex items-center gap-2">
                <span className="font-semibold">{currencySymbol}</span>
                <span>
                  {currencyOptions.find((c) => c.code === currentCurrency)?.name || currentCurrency}
                </span>
              </div>
              <ChevronDown
                className={`w-4 h-4 transition-transform ${showCurrencyDropdown ? 'rotate-180' : ''}`}
                style={{ color: colors.utility.secondaryText }}
              />
            </button>

            {showCurrencyDropdown && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowCurrencyDropdown(false)} />
                <div
                  className="absolute z-50 mt-1 w-full max-h-60 overflow-y-auto rounded-lg border shadow-lg"
                  style={{
                    backgroundColor: colors.utility.primaryBackground,
                    borderColor: isDarkMode ? colors.utility.secondaryBackground : '#E5E7EB',
                  }}
                >
                  {currencyOptions.map((currency) => (
                    <button
                      key={currency.code}
                      type="button"
                      onClick={() => handleCurrencyChange(currency.code)}
                      className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                      <span className="w-8 font-semibold" style={{ color: colors.utility.primaryText }}>
                        {currency.symbol}
                      </span>
                      <div className="flex-1">
                        <div className="text-sm" style={{ color: colors.utility.primaryText }}>
                          {currency.name}
                        </div>
                        <div className="text-xs" style={{ color: colors.utility.secondaryText }}>
                          {currency.code}
                        </div>
                      </div>
                      {currency.code === currentCurrency && (
                        <Check className="w-4 h-4" style={{ color: colors.brand.primary }} />
                      )}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Fixed/Hourly Pricing */}
        {(priceType === 'fixed' || priceType === 'hourly') && pricingMode !== 'resource_based' && (
          <div
            className="p-4 rounded-lg"
            style={{ backgroundColor: isDarkMode ? colors.utility.secondaryBackground : '#F9FAFB' }}
          >
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1" style={labelStyle}>
                  {priceType === 'fixed' ? 'Service Price' : 'Hourly Rate'}{' '}
                  <span style={{ color: colors.semantic.error }}>*</span>
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
                    value={(formData.meta?.basePrice as number) || 0}
                    onChange={(e) =>
                      onChange('meta', { ...formData.meta, basePrice: parseFloat(e.target.value) })
                    }
                    className="w-full pl-10 pr-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2"
                    style={inputStyle}
                    placeholder="0.00"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={labelStyle}>
                  Unit
                </label>
                <select
                  value={(formData.meta?.pricingUnit as string) || (priceType === 'hourly' ? 'hour' : 'service')}
                  onChange={(e) => onChange('meta', { ...formData.meta, pricingUnit: e.target.value })}
                  className="w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2"
                  style={inputStyle}
                >
                  <option value="service">Per Service</option>
                  <option value="hour">Per Hour</option>
                  <option value="day">Per Day</option>
                  <option value="week">Per Week</option>
                  <option value="month">Per Month</option>
                  <option value="visit">Per Visit</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Resource-Based Pricing Configuration */}
        {pricingMode === 'resource_based' && selectedResourceTypes.length > 0 && (
          <div className="space-y-4">
            <h4 className="text-sm font-semibold" style={{ color: colors.utility.primaryText }}>
              Resource Pricing
            </h4>

            {resourcePricing.map((rp) => (
              <div
                key={rp.resourceTypeId}
                className="p-4 rounded-lg border"
                style={{
                  backgroundColor: colors.utility.primaryBackground,
                  borderColor: isDarkMode ? colors.utility.secondaryBackground : '#E5E7EB',
                }}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4" style={{ color: colors.brand.primary }} />
                    <span className="text-sm font-medium" style={{ color: colors.utility.primaryText }}>
                      {rp.resourceTypeName}
                    </span>
                    {resourceQuantities[rp.resourceTypeId] > 1 && (
                      <span
                        className="text-xs px-2 py-0.5 rounded-full"
                        style={{
                          backgroundColor: `${colors.brand.primary}15`,
                          color: colors.brand.primary,
                        }}
                      >
                        x{resourceQuantities[rp.resourceTypeId]}
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium mb-1" style={{ color: colors.utility.secondaryText }}>
                      Pricing Model
                    </label>
                    <select
                      value={rp.pricingModel}
                      onChange={(e) =>
                        updateResourcePricing(
                          rp.resourceTypeId,
                          'pricingModel',
                          e.target.value as 'hourly' | 'per_unit' | 'fixed'
                        )
                      }
                      className="w-full px-3 py-2 border rounded-lg text-sm"
                      style={inputStyle}
                    >
                      <option value="hourly">Per Hour</option>
                      <option value="per_unit">Per Unit</option>
                      <option value="fixed">Fixed Rate</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1" style={{ color: colors.utility.secondaryText }}>
                      Rate ({currencySymbol})
                    </label>
                    <div className="relative">
                      <span
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-sm"
                        style={{ color: colors.utility.secondaryText }}
                      >
                        {currencySymbol}
                      </span>
                      <input
                        type="number"
                        value={rp.pricePerUnit}
                        onChange={(e) =>
                          updateResourcePricing(rp.resourceTypeId, 'pricePerUnit', parseFloat(e.target.value) || 0)
                        }
                        className="w-full pl-8 pr-3 py-2 border rounded-lg text-sm"
                        style={inputStyle}
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tiered Pricing */}
        {priceType === 'tiered' && pricingMode !== 'resource_based' && (
          <div
            className="p-4 rounded-lg space-y-4"
            style={{ backgroundColor: isDarkMode ? colors.utility.secondaryBackground : '#F9FAFB' }}
          >
            <div className="flex justify-between items-center">
              <h4 className="text-sm font-semibold" style={{ color: colors.utility.primaryText }}>
                Pricing Tiers
              </h4>
              <button
                onClick={addTier}
                className="text-sm flex items-center gap-1"
                style={{ color: colors.brand.primary }}
              >
                <Plus className="w-4 h-4" /> Add Tier
              </button>
            </div>
            <div className="space-y-3">
              {tiers.map((tier, index) => (
                <div
                  key={tier.id}
                  className="flex items-center gap-3 p-3 rounded-lg border"
                  style={{
                    backgroundColor: colors.utility.primaryBackground,
                    borderColor: isDarkMode ? colors.utility.secondaryBackground : '#E5E7EB',
                  }}
                >
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
                    style={{ backgroundColor: `${colors.brand.primary}20`, color: colors.brand.primary }}
                  >
                    {index + 1}
                  </div>
                  <div className="flex-1 grid grid-cols-3 gap-3">
                    <input
                      type="text"
                      value={tier.name}
                      onChange={(e) => updateTier(tier.id, 'name', e.target.value)}
                      placeholder="Tier name"
                      className="px-3 py-1.5 border rounded-lg text-sm"
                      style={inputStyle}
                    />
                    <div className="relative">
                      <span
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-sm"
                        style={{ color: colors.utility.secondaryText }}
                      >
                        {currencySymbol}
                      </span>
                      <input
                        type="number"
                        value={tier.price}
                        onChange={(e) => updateTier(tier.id, 'price', parseFloat(e.target.value))}
                        className="w-full pl-8 pr-3 py-1.5 border rounded-lg text-sm"
                        style={inputStyle}
                      />
                    </div>
                    <input
                      type="text"
                      value={tier.description || ''}
                      onChange={(e) => updateTier(tier.id, 'description', e.target.value)}
                      placeholder="Description"
                      className="px-3 py-1.5 border rounded-lg text-sm"
                      style={inputStyle}
                    />
                  </div>
                  {tiers.length > 1 && (
                    <button
                      onClick={() => removeTier(tier.id)}
                      style={{ color: colors.utility.secondaryText }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = colors.semantic.error)}
                      onMouseLeave={(e) => (e.currentTarget.style.color = colors.utility.secondaryText)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
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

        {/* Tax Settings */}
        <div
          className="border-t pt-6"
          style={{ borderColor: isDarkMode ? colors.utility.secondaryBackground : '#E5E7EB' }}
        >
          <h4 className="text-sm font-semibold mb-4" style={{ color: colors.utility.primaryText }}>
            Tax Settings
          </h4>

          <div className="space-y-4">
            {/* Tax Inclusive Toggle */}
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium" style={{ color: colors.utility.primaryText }}>
                  Tax Display Mode
                </label>
                <p className="text-xs" style={{ color: colors.utility.secondaryText }}>
                  How prices are displayed to customers
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onChange('meta', { ...formData.meta, taxInclusive: true })}
                  className={`px-3 py-1.5 text-sm rounded-l-lg border transition-colors ${
                    formData.meta?.taxInclusive !== false ? 'font-medium' : ''
                  }`}
                  style={{
                    backgroundColor:
                      formData.meta?.taxInclusive !== false
                        ? colors.brand.primary
                        : colors.utility.primaryBackground,
                    color:
                      formData.meta?.taxInclusive !== false ? '#FFFFFF' : colors.utility.primaryText,
                    borderColor: colors.brand.primary,
                  }}
                >
                  Including Tax
                </button>
                <button
                  type="button"
                  onClick={() => onChange('meta', { ...formData.meta, taxInclusive: false })}
                  className={`px-3 py-1.5 text-sm rounded-r-lg border transition-colors ${
                    formData.meta?.taxInclusive === false ? 'font-medium' : ''
                  }`}
                  style={{
                    backgroundColor:
                      formData.meta?.taxInclusive === false
                        ? colors.brand.primary
                        : colors.utility.primaryBackground,
                    color:
                      formData.meta?.taxInclusive === false ? '#FFFFFF' : colors.utility.primaryText,
                    borderColor: colors.brand.primary,
                  }}
                >
                  Excluding Tax
                </button>
              </div>
            </div>

            {/* Tax Rate Selection */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1" style={labelStyle}>
                  Tax Rate
                </label>
                {taxLoading ? (
                  <div className="px-3 py-2.5 border rounded-lg text-sm" style={inputStyle}>
                    Loading tax rates...
                  </div>
                ) : taxRateOptions.length > 0 ? (
                  <select
                    value={(formData.meta?.taxRateId as string) || ''}
                    onChange={(e) => handleTaxRateChange(e.target.value)}
                    className="w-full px-3 py-2.5 border rounded-lg text-sm"
                    style={inputStyle}
                  >
                    <option value="">Select tax rate</option>
                    {taxRateOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                        {option.isDefault ? ' (Default)' : ''}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={(formData.meta?.taxRate as number) || 18}
                      onChange={(e) =>
                        onChange('meta', { ...formData.meta, taxRate: parseFloat(e.target.value) })
                      }
                      className="w-full px-3 py-2.5 border rounded-lg text-sm"
                      style={inputStyle}
                      placeholder="18"
                    />
                    <span className="text-sm" style={{ color: colors.utility.secondaryText }}>
                      %
                    </span>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={labelStyle}>
                  Tax Type
                </label>
                <select
                  value={(formData.meta?.taxType as string) || 'gst'}
                  onChange={(e) => onChange('meta', { ...formData.meta, taxType: e.target.value })}
                  className="w-full px-3 py-2.5 border rounded-lg text-sm"
                  style={inputStyle}
                >
                  <option value="gst">GST</option>
                  <option value="vat">VAT</option>
                  <option value="sales">Sales Tax</option>
                  <option value="none">No Tax</option>
                </select>
              </div>
            </div>
          </div>
        </div>

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
                onChange={(e) =>
                  onChange('meta', { ...formData.meta, allowNegotiatedPricing: e.target.checked })
                }
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
