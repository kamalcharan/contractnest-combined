// src/components/catalog-studio/BlockWizard/steps/service/PricingStep.tsx
import React, { useState } from 'react';
import { DollarSign, Percent, Calculator, Plus, Trash2, Lightbulb } from 'lucide-react';
import { useTheme } from '../../../../../contexts/ThemeContext';
import { CURRENCY_OPTIONS } from '../../../../../utils/catalog-studio';

interface PricingTier { id: string; name: string; price: number; description?: string; }

interface PricingStepProps {
  formData: {
    priceType?: 'fixed' | 'hourly' | 'tiered' | 'custom';
    basePrice?: number;
    currency?: string;
    taxInclusive?: boolean;
    taxRate?: number;
    pricingTiers?: PricingTier[];
  };
  onChange: (field: string, value: unknown) => void;
}

const PricingStep: React.FC<PricingStepProps> = ({ formData, onChange }) => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  const [priceType, setPriceType] = useState(formData.priceType || 'fixed');
  const [tiers, setTiers] = useState<PricingTier[]>(formData.pricingTiers || [
    { id: '1', name: 'Basic', price: 500, description: 'Standard service' },
    { id: '2', name: 'Premium', price: 1000, description: 'Extended service with extras' },
  ]);

  const handlePriceTypeChange = (type: 'fixed' | 'hourly' | 'tiered' | 'custom') => {
    setPriceType(type);
    onChange('priceType', type);
  };

  const addTier = () => {
    const newTier: PricingTier = { id: Date.now().toString(), name: `Tier ${tiers.length + 1}`, price: 0 };
    setTiers([...tiers, newTier]);
    onChange('pricingTiers', [...tiers, newTier]);
  };

  const removeTier = (id: string) => {
    const updated = tiers.filter((t) => t.id !== id);
    setTiers(updated);
    onChange('pricingTiers', updated);
  };

  const updateTier = (id: string, field: keyof PricingTier, value: string | number) => {
    const updated = tiers.map((t) => (t.id === id ? { ...t, [field]: value } : t));
    setTiers(updated);
    onChange('pricingTiers', updated);
  };

  const selectedCurrency = CURRENCY_OPTIONS.find((c) => c.value === (formData.currency || 'INR'));

  const inputStyle = {
    backgroundColor: colors.utility.primaryBackground,
    borderColor: isDarkMode ? colors.utility.secondaryBackground : '#D1D5DB',
    color: colors.utility.primaryText
  };

  const labelStyle = { color: colors.utility.primaryText };

  const pricingOptions = [
    { id: 'fixed', icon: DollarSign, label: 'Fixed', description: 'One price' },
    { id: 'hourly', icon: Calculator, label: 'Hourly', description: 'Per hour' },
    { id: 'tiered', icon: Percent, label: 'Tiered', description: 'Multiple options' },
    { id: 'custom', icon: Calculator, label: 'Quote', description: 'Custom quote' },
  ];

  return (
    <div className="animate-in fade-in slide-in-from-right-4 duration-200">
      <h2 className="text-lg font-bold mb-1" style={{ color: colors.utility.primaryText }}>
        Pricing Configuration
      </h2>
      <p className="text-sm mb-6" style={{ color: colors.utility.secondaryText }}>
        Set how this service will be priced.
      </p>
      <div className="space-y-6">
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
                  onClick={() => handlePriceTypeChange(option.id as 'fixed' | 'hourly' | 'tiered' | 'custom')}
                  className="p-3 border-2 rounded-xl cursor-pointer text-center transition-all"
                  style={{
                    backgroundColor: isSelected ? `${colors.brand.primary}10` : colors.utility.primaryBackground,
                    borderColor: isSelected ? colors.brand.primary : (isDarkMode ? colors.utility.secondaryBackground : '#E5E7EB')
                  }}
                >
                  <IconComp className="w-6 h-6 mx-auto mb-1" style={{ color: colors.brand.primary }} />
                  <div className="text-sm font-bold" style={{ color: colors.utility.primaryText }}>{option.label}</div>
                  <div className="text-xs" style={{ color: colors.utility.secondaryText }}>{option.description}</div>
                </div>
              );
            })}
          </div>
        </div>

        {(priceType === 'fixed' || priceType === 'hourly') && (
          <div className="p-4 rounded-lg" style={{ backgroundColor: isDarkMode ? colors.utility.secondaryBackground : '#F9FAFB' }}>
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1" style={labelStyle}>
                  {priceType === 'fixed' ? 'Service Price' : 'Hourly Rate'} <span style={{ color: colors.semantic.error }}>*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: colors.utility.secondaryText }}>
                    {selectedCurrency?.symbol}
                  </span>
                  <input
                    type="number"
                    value={formData.basePrice || 0}
                    onChange={(e) => onChange('basePrice', parseFloat(e.target.value))}
                    className="w-full pl-8 pr-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2"
                    style={inputStyle}
                    placeholder="0.00"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={labelStyle}>Currency</label>
                <select
                  value={formData.currency || 'INR'}
                  onChange={(e) => onChange('currency', e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2"
                  style={inputStyle}
                >
                  {CURRENCY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {priceType === 'tiered' && (
          <div className="p-4 rounded-lg space-y-4" style={{ backgroundColor: isDarkMode ? colors.utility.secondaryBackground : '#F9FAFB' }}>
            <div className="flex justify-between items-center">
              <h4 className="text-sm font-semibold" style={{ color: colors.utility.primaryText }}>Pricing Tiers</h4>
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
                    borderColor: isDarkMode ? colors.utility.secondaryBackground : '#E5E7EB'
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
                      className="px-3 py-1.5 border rounded-lg text-sm focus:outline-none focus:ring-2"
                      style={inputStyle}
                    />
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: colors.utility.secondaryText }}>
                        {selectedCurrency?.symbol}
                      </span>
                      <input
                        type="number"
                        value={tier.price}
                        onChange={(e) => updateTier(tier.id, 'price', parseFloat(e.target.value))}
                        className="w-full pl-8 pr-3 py-1.5 border rounded-lg text-sm focus:outline-none focus:ring-2"
                        style={inputStyle}
                      />
                    </div>
                    <input
                      type="text"
                      value={tier.description || ''}
                      onChange={(e) => updateTier(tier.id, 'description', e.target.value)}
                      placeholder="Description"
                      className="px-3 py-1.5 border rounded-lg text-sm focus:outline-none focus:ring-2"
                      style={inputStyle}
                    />
                  </div>
                  {tiers.length > 1 && (
                    <button
                      onClick={() => removeTier(tier.id)}
                      style={{ color: colors.utility.secondaryText }}
                      onMouseEnter={(e) => { e.currentTarget.style.color = colors.semantic.error; }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = colors.utility.secondaryText; }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {priceType === 'custom' && (
          <div
            className="p-4 rounded-lg border"
            style={{
              backgroundColor: `${colors.semantic.warning}10`,
              borderColor: `${colors.semantic.warning}40`
            }}
          >
            <div className="flex gap-3">
              <Lightbulb className="w-5 h-5 flex-shrink-0" style={{ color: colors.semantic.warning }} />
              <div>
                <div className="font-semibold" style={{ color: colors.utility.primaryText }}>Custom Quote Mode</div>
                <p className="text-sm mt-1" style={{ color: colors.utility.secondaryText }}>
                  Price will be determined per contract. A quote request form will be shown to customers instead of a fixed price.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="border-t pt-6" style={{ borderColor: isDarkMode ? colors.utility.secondaryBackground : '#E5E7EB' }}>
          <h4 className="text-sm font-semibold mb-4" style={{ color: colors.utility.primaryText }}>Tax Settings</h4>
          <div className="space-y-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.taxInclusive !== false}
                onChange={(e) => onChange('taxInclusive', e.target.checked)}
                className="w-4 h-4 rounded"
                style={{ accentColor: colors.brand.primary }}
              />
              <span className="text-sm" style={{ color: colors.utility.primaryText }}>
                Price includes taxes (GST/VAT)
              </span>
            </label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1" style={labelStyle}>Tax Rate (%)</label>
                <input
                  type="number"
                  value={formData.taxRate || 18}
                  onChange={(e) => onChange('taxRate', parseFloat(e.target.value))}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2"
                  style={inputStyle}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={labelStyle}>Tax Type</label>
                <select className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2" style={inputStyle}>
                  <option value="gst">GST</option>
                  <option value="vat">VAT</option>
                  <option value="sales">Sales Tax</option>
                  <option value="none">No Tax</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t pt-6" style={{ borderColor: isDarkMode ? colors.utility.secondaryBackground : '#E5E7EB' }}>
          <h4 className="text-sm font-semibold mb-4" style={{ color: colors.utility.primaryText }}>Discount Options</h4>
          <div className="space-y-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" className="w-4 h-4 rounded" style={{ accentColor: colors.brand.primary }} />
              <span className="text-sm" style={{ color: colors.utility.primaryText }}>Allow coupon codes</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" className="w-4 h-4 rounded" style={{ accentColor: colors.brand.primary }} />
              <span className="text-sm" style={{ color: colors.utility.primaryText }}>Allow bulk/quantity discounts</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" className="w-4 h-4 rounded" style={{ accentColor: colors.brand.primary }} />
              <span className="text-sm" style={{ color: colors.utility.primaryText }}>Enable negotiated pricing</span>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PricingStep;
