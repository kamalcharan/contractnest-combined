// src/components/catalog-studio/BlockWizard/steps/spare/FulfillmentStep.tsx
import React from 'react';
import { Truck, Clock, MapPin, Package } from 'lucide-react';
import { useTheme } from '../../../../../contexts/ThemeContext';

interface FulfillmentStepProps {
  formData: {
    fulfillmentType?: 'stock' | 'order' | 'dropship';
    leadTime?: number;
    leadTimeUnit?: string;
    shippingWeight?: number;
    dimensions?: { length: number; width: number; height: number };
    freeShipping?: boolean;
    shippingCost?: number;
  };
  onChange: (field: string, value: unknown) => void;
}

const FulfillmentStep: React.FC<FulfillmentStepProps> = ({ formData, onChange }) => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  const inputStyle = {
    backgroundColor: colors.utility.primaryBackground,
    borderColor: isDarkMode ? colors.utility.secondaryBackground : '#D1D5DB',
    color: colors.utility.primaryText
  };

  const labelStyle = { color: colors.utility.primaryText };

  const fulfillmentOptions = [
    { id: 'stock', icon: Package, label: 'From Stock', description: 'Ship from warehouse inventory' },
    { id: 'order', icon: Clock, label: 'Made to Order', description: 'Procure after order received' },
    { id: 'dropship', icon: Truck, label: 'Dropship', description: 'Ship directly from supplier' },
  ];

  return (
    <div className="animate-in fade-in slide-in-from-right-4 duration-200">
      <h2 className="text-lg font-bold mb-1" style={{ color: colors.utility.primaryText }}>
        Fulfillment Settings
      </h2>
      <p className="text-sm mb-6" style={{ color: colors.utility.secondaryText }}>
        Configure how this spare part will be delivered.
      </p>

      <div className="space-y-6">
        {/* Fulfillment Type */}
        <div>
          <label className="block text-sm font-medium mb-3" style={labelStyle}>
            Fulfillment Method <span style={{ color: colors.semantic.error }}>*</span>
          </label>
          <div className="grid grid-cols-3 gap-3">
            {fulfillmentOptions.map((option) => {
              const IconComp = option.icon;
              const isSelected = (formData.fulfillmentType || 'stock') === option.id;
              return (
                <div
                  key={option.id}
                  onClick={() => onChange('fulfillmentType', option.id)}
                  className="p-4 border-2 rounded-xl cursor-pointer text-center transition-all"
                  style={{
                    backgroundColor: isSelected ? `${colors.brand.primary}10` : colors.utility.primaryBackground,
                    borderColor: isSelected ? colors.brand.primary : (isDarkMode ? colors.utility.secondaryBackground : '#E5E7EB')
                  }}
                >
                  <IconComp className="w-8 h-8 mx-auto mb-2" style={{ color: colors.brand.primary }} />
                  <div className="text-sm font-bold" style={{ color: colors.utility.primaryText }}>{option.label}</div>
                  <div className="text-xs" style={{ color: colors.utility.secondaryText }}>{option.description}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Lead Time */}
        <div className="p-4 rounded-lg" style={{ backgroundColor: isDarkMode ? colors.utility.secondaryBackground : '#F9FAFB' }}>
          <h4 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: colors.utility.primaryText }}>
            <Clock className="w-4 h-4" /> Lead Time
          </h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1" style={labelStyle}>Processing Time</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={formData.leadTime || 1}
                  onChange={(e) => onChange('leadTime', parseInt(e.target.value))}
                  className="flex-1 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2"
                  style={inputStyle}
                />
                <select
                  value={formData.leadTimeUnit || 'days'}
                  onChange={(e) => onChange('leadTimeUnit', e.target.value)}
                  className="px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2"
                  style={inputStyle}
                >
                  <option value="hours">Hours</option>
                  <option value="days">Days</option>
                  <option value="weeks">Weeks</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={labelStyle}>Shipping Method</label>
              <select className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2" style={inputStyle}>
                <option value="standard">Standard Shipping</option>
                <option value="express">Express Shipping</option>
                <option value="same-day">Same Day Delivery</option>
                <option value="pickup">Customer Pickup</option>
              </select>
            </div>
          </div>
        </div>

        {/* Package Details */}
        <div className="p-4 rounded-lg" style={{ backgroundColor: isDarkMode ? colors.utility.secondaryBackground : '#F9FAFB' }}>
          <h4 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: colors.utility.primaryText }}>
            <Package className="w-4 h-4" /> Package Details
          </h4>
          <div className="grid grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1" style={labelStyle}>Weight (kg)</label>
              <input
                type="number"
                step="0.1"
                value={formData.shippingWeight || 0}
                onChange={(e) => onChange('shippingWeight', parseFloat(e.target.value))}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2"
                style={inputStyle}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={labelStyle}>Length (cm)</label>
              <input
                type="number"
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2"
                style={inputStyle}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={labelStyle}>Width (cm)</label>
              <input
                type="number"
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2"
                style={inputStyle}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={labelStyle}>Height (cm)</label>
              <input
                type="number"
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2"
                style={inputStyle}
              />
            </div>
          </div>
        </div>

        {/* Shipping Cost */}
        <div className="p-4 rounded-lg" style={{ backgroundColor: isDarkMode ? colors.utility.secondaryBackground : '#F9FAFB' }}>
          <h4 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: colors.utility.primaryText }}>
            <MapPin className="w-4 h-4" /> Shipping Cost
          </h4>
          <div className="space-y-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.freeShipping === true}
                onChange={(e) => onChange('freeShipping', e.target.checked)}
                className="w-4 h-4 rounded"
                style={{ accentColor: colors.brand.primary }}
              />
              <span className="text-sm" style={{ color: colors.utility.primaryText }}>Free shipping included</span>
            </label>
            {!formData.freeShipping && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1" style={labelStyle}>Flat Shipping Rate</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: colors.utility.secondaryText }}>₹</span>
                    <input
                      type="number"
                      value={formData.shippingCost || 0}
                      onChange={(e) => onChange('shippingCost', parseFloat(e.target.value))}
                      className="w-full pl-8 pr-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2"
                      style={inputStyle}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={labelStyle}>Shipping Calculation</label>
                  <select className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2" style={inputStyle}>
                    <option value="flat">Flat Rate</option>
                    <option value="weight">By Weight</option>
                    <option value="distance">By Distance</option>
                  </select>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Additional Options */}
        <div className="space-y-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" className="w-4 h-4 rounded" style={{ accentColor: colors.brand.primary }} />
            <span className="text-sm" style={{ color: colors.utility.primaryText }}>
              Requires serial number tracking
            </span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" className="w-4 h-4 rounded" style={{ accentColor: colors.brand.primary }} />
            <span className="text-sm" style={{ color: colors.utility.primaryText }}>
              Warranty included (specify in contract)
            </span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" className="w-4 h-4 rounded" style={{ accentColor: colors.brand.primary }} />
            <span className="text-sm" style={{ color: colors.utility.primaryText }}>
              Installation required (add as service block)
            </span>
          </label>
        </div>
      </div>
    </div>
  );
};

export default FulfillmentStep;
