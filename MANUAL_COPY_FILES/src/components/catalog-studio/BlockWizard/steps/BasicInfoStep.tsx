// src/components/catalog-studio/BlockWizard/steps/BasicInfoStep.tsx
import React from 'react';
import * as LucideIcons from 'lucide-react';
import { useTheme } from '../../../../contexts/ThemeContext';
import { Block } from '../../../../types/catalogStudio';
import { ICON_OPTIONS } from '../../../../utils/catalog-studio';

interface BasicInfoStepProps {
  blockType: string;
  formData: Partial<Block>;
  onChange: (field: string, value: string | number) => void;
}

// Helper to get Lucide icon component by name
const getIconComponent = (iconName: string) => {
  const iconsMap = LucideIcons as unknown as Record<string, React.ComponentType<{ className?: string; size?: number }>>;
  return iconsMap[iconName] || LucideIcons.Circle;
};

const BasicInfoStep: React.FC<BasicInfoStepProps> = ({ blockType, formData, onChange }) => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  const isServiceBlock = blockType === 'service';
  const isSpareBlock = blockType === 'spare';
  const isBillingBlock = blockType === 'billing';

  const inputStyle = {
    backgroundColor: colors.utility.primaryBackground,
    borderColor: isDarkMode ? colors.utility.secondaryBackground : '#D1D5DB',
    color: colors.utility.primaryText
  };

  const labelStyle = {
    color: colors.utility.primaryText
  };

  return (
    <div className="animate-in fade-in slide-in-from-right-4 duration-200">
      <h2
        className="text-lg font-bold mb-1"
        style={{ color: colors.utility.primaryText }}
      >
        Basic Information
      </h2>
      <p
        className="text-sm mb-6"
        style={{ color: colors.utility.secondaryText }}
      >
        Define the fundamental details of this block.
      </p>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1" style={labelStyle}>
              Block Name <span style={{ color: colors.semantic.error }}>*</span>
            </label>
            <input
              type="text"
              placeholder="e.g., Yoga Session"
              value={formData.name || ''}
              onChange={(e) => onChange('name', e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2"
              style={inputStyle}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" style={labelStyle}>Icon</label>
            <div className="flex gap-2 flex-wrap">
              {ICON_OPTIONS.slice(0, 6).map((opt) => {
                const IconComp = getIconComponent(opt.value);
                const isSelected = formData.icon === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => onChange('icon', opt.value)}
                    className="w-10 h-10 rounded-lg border-2 flex items-center justify-center transition-all"
                    style={{
                      backgroundColor: isSelected ? `${colors.brand.primary}20` : colors.utility.primaryBackground,
                      borderColor: isSelected ? colors.brand.primary : (isDarkMode ? colors.utility.secondaryBackground : '#D1D5DB')
                    }}
                    title={opt.label}
                  >
                    <IconComp className="w-5 h-5" style={{ color: isSelected ? colors.brand.primary : colors.utility.secondaryText }} />
                  </button>
                );
              })}
            </div>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1" style={labelStyle}>
            Description <span style={{ color: colors.semantic.error }}>*</span>
          </label>
          <textarea
            placeholder="Describe what this block includes..."
            value={formData.description || ''}
            onChange={(e) => onChange('description', e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 resize-none"
            style={inputStyle}
          />
        </div>
        {isServiceBlock && (
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1" style={labelStyle}>
                Duration <span style={{ color: colors.semantic.error }}>*</span>
              </label>
              <input
                type="number"
                value={formData.duration || 60}
                onChange={(e) => onChange('duration', parseInt(e.target.value))}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2"
                style={inputStyle}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={labelStyle}>Unit</label>
              <select
                value={formData.durationUnit || 'min'}
                onChange={(e) => onChange('durationUnit', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2"
                style={inputStyle}
              >
                <option value="min">Minutes</option>
                <option value="hours">Hours</option>
                <option value="days">Days</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={labelStyle}>Buffer Time</label>
              <select
                defaultValue="0"
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2"
                style={inputStyle}
              >
                <option value="0">No buffer</option>
                <option value="15">15 min</option>
                <option value="30">30 min</option>
                <option value="60">1 hour</option>
              </select>
            </div>
          </div>
        )}
        {isSpareBlock && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1" style={labelStyle}>
                SKU <span style={{ color: colors.semantic.error }}>*</span>
              </label>
              <input
                type="text"
                placeholder="e.g., ACF-150"
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2"
                style={inputStyle}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={labelStyle}>Category</label>
              <select
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2"
                style={inputStyle}
              >
                <option value="filter">Filters</option>
                <option value="gas">Gases</option>
                <option value="parts">Parts</option>
                <option value="accessories">Accessories</option>
              </select>
            </div>
          </div>
        )}
        {isBillingBlock && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1" style={labelStyle}>
                Payment Type <span style={{ color: colors.semantic.error }}>*</span>
              </label>
              <select
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2"
                style={inputStyle}
              >
                <option value="upfront">100% Upfront</option>
                <option value="emi">EMI/Installments</option>
                <option value="milestone">Milestone-based</option>
                <option value="subscription">Recurring</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={labelStyle}>Invoice Trigger</label>
              <select
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2"
                style={inputStyle}
              >
                <option value="auto">Auto-generate</option>
                <option value="manual">Manual</option>
                <option value="completion">On Completion</option>
              </select>
            </div>
          </div>
        )}
        <div>
          <label className="block text-sm font-medium mb-1" style={labelStyle}>Tags</label>
          <input
            type="text"
            placeholder="Add tags separated by commas..."
            className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2"
            style={inputStyle}
          />
          <p className="text-xs mt-1" style={{ color: colors.utility.secondaryText }}>
            Tags help organize and filter blocks in your library
          </p>
        </div>
      </div>
    </div>
  );
};

export default BasicInfoStep;
