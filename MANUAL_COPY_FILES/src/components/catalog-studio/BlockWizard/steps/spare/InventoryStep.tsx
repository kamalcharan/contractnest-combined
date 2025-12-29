// src/components/catalog-studio/BlockWizard/steps/spare/InventoryStep.tsx
import React from 'react';
import { Package, AlertTriangle, TrendingUp, Warehouse } from 'lucide-react';
import { useTheme } from '../../../../../contexts/ThemeContext';

interface InventoryStepProps {
  formData: {
    sku?: string;
    barcode?: string;
    stockQty?: number;
    reorderLevel?: number;
    reorderQty?: number;
    trackInventory?: boolean;
    allowBackorder?: boolean;
    warehouseLocation?: string;
  };
  onChange: (field: string, value: unknown) => void;
}

const InventoryStep: React.FC<InventoryStepProps> = ({ formData, onChange }) => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  const inputStyle = {
    backgroundColor: colors.utility.primaryBackground,
    borderColor: isDarkMode ? colors.utility.secondaryBackground : '#D1D5DB',
    color: colors.utility.primaryText
  };

  const labelStyle = { color: colors.utility.primaryText };

  return (
    <div className="animate-in fade-in slide-in-from-right-4 duration-200">
      <h2 className="text-lg font-bold mb-1" style={{ color: colors.utility.primaryText }}>
        Inventory Settings
      </h2>
      <p className="text-sm mb-6" style={{ color: colors.utility.secondaryText }}>
        Configure stock tracking and inventory management.
      </p>

      <div className="space-y-6">
        {/* Identification */}
        <div className="p-4 rounded-lg" style={{ backgroundColor: isDarkMode ? colors.utility.secondaryBackground : '#F9FAFB' }}>
          <h4 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: colors.utility.primaryText }}>
            <Package className="w-4 h-4" /> Product Identification
          </h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1" style={labelStyle}>
                SKU <span style={{ color: colors.semantic.error }}>*</span>
              </label>
              <input
                type="text"
                value={formData.sku || ''}
                onChange={(e) => onChange('sku', e.target.value)}
                placeholder="e.g., ACF-150"
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2"
                style={inputStyle}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={labelStyle}>Barcode/UPC</label>
              <input
                type="text"
                value={formData.barcode || ''}
                onChange={(e) => onChange('barcode', e.target.value)}
                placeholder="Optional"
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2"
                style={inputStyle}
              />
            </div>
          </div>
        </div>

        {/* Stock Levels */}
        <div className="p-4 rounded-lg" style={{ backgroundColor: isDarkMode ? colors.utility.secondaryBackground : '#F9FAFB' }}>
          <h4 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: colors.utility.primaryText }}>
            <TrendingUp className="w-4 h-4" /> Stock Levels
          </h4>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1" style={labelStyle}>Current Stock</label>
              <input
                type="number"
                value={formData.stockQty || 0}
                onChange={(e) => onChange('stockQty', parseInt(e.target.value))}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2"
                style={inputStyle}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={labelStyle}>Reorder Level</label>
              <input
                type="number"
                value={formData.reorderLevel || 5}
                onChange={(e) => onChange('reorderLevel', parseInt(e.target.value))}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2"
                style={inputStyle}
              />
              <p className="text-xs mt-1" style={{ color: colors.utility.secondaryText }}>Alert when stock falls below</p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={labelStyle}>Reorder Quantity</label>
              <input
                type="number"
                value={formData.reorderQty || 10}
                onChange={(e) => onChange('reorderQty', parseInt(e.target.value))}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2"
                style={inputStyle}
              />
            </div>
          </div>
        </div>

        {/* Warehouse */}
        <div className="p-4 rounded-lg" style={{ backgroundColor: isDarkMode ? colors.utility.secondaryBackground : '#F9FAFB' }}>
          <h4 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: colors.utility.primaryText }}>
            <Warehouse className="w-4 h-4" /> Storage Location
          </h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1" style={labelStyle}>Warehouse</label>
              <select
                value={formData.warehouseLocation || 'main'}
                onChange={(e) => onChange('warehouseLocation', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2"
                style={inputStyle}
              >
                <option value="main">Main Warehouse</option>
                <option value="secondary">Secondary Warehouse</option>
                <option value="vendor">Vendor Managed</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={labelStyle}>Bin/Shelf Location</label>
              <input
                type="text"
                placeholder="e.g., A1-B2"
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2"
                style={inputStyle}
              />
            </div>
          </div>
        </div>

        {/* Tracking Options */}
        <div className="space-y-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.trackInventory !== false}
              onChange={(e) => onChange('trackInventory', e.target.checked)}
              className="w-4 h-4 rounded"
              style={{ accentColor: colors.brand.primary }}
            />
            <span className="text-sm" style={{ color: colors.utility.primaryText }}>
              Track inventory levels automatically
            </span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.allowBackorder === true}
              onChange={(e) => onChange('allowBackorder', e.target.checked)}
              className="w-4 h-4 rounded"
              style={{ accentColor: colors.brand.primary }}
            />
            <span className="text-sm" style={{ color: colors.utility.primaryText }}>
              Allow backorders when out of stock
            </span>
          </label>
        </div>

        {/* Low Stock Warning */}
        <div
          className="p-4 rounded-lg flex gap-3"
          style={{ backgroundColor: `${colors.semantic.warning}15` }}
        >
          <AlertTriangle className="w-5 h-5 flex-shrink-0" style={{ color: colors.semantic.warning }} />
          <div className="text-sm" style={{ color: isDarkMode ? colors.utility.primaryText : '#92400E' }}>
            <strong>Tip:</strong> Set up low-stock alerts to ensure you never run out of critical spare parts during service calls.
          </div>
        </div>
      </div>
    </div>
  );
};

export default InventoryStep;
