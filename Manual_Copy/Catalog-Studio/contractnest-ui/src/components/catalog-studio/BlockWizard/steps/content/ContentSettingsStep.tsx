// src/components/catalog-studio/BlockWizard/steps/content/ContentSettingsStep.tsx
import React from 'react';
import { Eye, Edit, Lock, Check } from 'lucide-react';
import { useTheme } from '../../../../../contexts/ThemeContext';

interface ContentSettingsStepProps {
  formData: {
    requireSignature?: boolean;
    requireAcknowledgment?: boolean;
    isEditable?: boolean;
    visibility?: 'always' | 'contract' | 'hidden';
    displayOrder?: number;
  };
  onChange: (field: string, value: unknown) => void;
}

const ContentSettingsStep: React.FC<ContentSettingsStepProps> = ({ formData, onChange }) => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  const inputStyle = {
    backgroundColor: isDarkMode ? colors.utility.secondaryBackground : '#FFFFFF',
    borderColor: isDarkMode ? colors.utility.secondaryBackground : '#D1D5DB',
    color: colors.utility.primaryText
  };

  const labelStyle = { color: colors.utility.primaryText };

  return (
    <div className="animate-in fade-in slide-in-from-right-4 duration-200">
      <h2 className="text-lg font-bold mb-1" style={{ color: colors.utility.primaryText }}>
        Content Settings
      </h2>
      <p className="text-sm mb-6" style={{ color: colors.utility.secondaryText }}>
        Configure how this content block behaves in contracts.
      </p>

      <div className="space-y-6">
        {/* Display Settings */}
        <div className="p-4 rounded-lg" style={{ backgroundColor: isDarkMode ? colors.utility.secondaryBackground : '#F9FAFB' }}>
          <h4 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: colors.utility.primaryText }}>
            <Eye className="w-4 h-4" /> Display Settings
          </h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1" style={labelStyle}>Visibility</label>
              <select
                value={formData.visibility || 'always'}
                onChange={(e) => onChange('visibility', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2"
                style={inputStyle}
              >
                <option value="always">Always visible</option>
                <option value="contract">In contract only</option>
                <option value="print">Print version only</option>
                <option value="hidden">Hidden (internal)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={labelStyle}>Display Order</label>
              <input
                type="number"
                value={formData.displayOrder || 1}
                onChange={(e) => onChange('displayOrder', parseInt(e.target.value))}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2"
                style={inputStyle}
              />
            </div>
          </div>
        </div>

        {/* Editing Options */}
        <div className="p-4 rounded-lg" style={{ backgroundColor: isDarkMode ? colors.utility.secondaryBackground : '#F9FAFB' }}>
          <h4 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: colors.utility.primaryText }}>
            <Edit className="w-4 h-4" /> Editing Options
          </h4>
          <div className="space-y-3">
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-sm" style={{ color: colors.utility.primaryText }}>
                Allow editing during contract creation
              </span>
              <div
                className="w-10 h-5 rounded-full relative cursor-pointer transition-colors"
                style={{ backgroundColor: formData.isEditable === true ? colors.brand.primary : (isDarkMode ? colors.utility.secondaryText : '#D1D5DB') }}
                onClick={() => onChange('isEditable', !formData.isEditable)}
              >
                <div
                  className="absolute w-4 h-4 bg-white rounded-full top-0.5 transition-all"
                  style={{ left: formData.isEditable === true ? '22px' : '2px' }}
                />
              </div>
            </label>
            <p className="text-xs" style={{ color: colors.utility.secondaryText }}>
              When enabled, sellers can modify this text when creating contracts
            </p>
          </div>
        </div>

        {/* Acknowledgment Options */}
        <div className="p-4 rounded-lg" style={{ backgroundColor: isDarkMode ? colors.utility.secondaryBackground : '#F9FAFB' }}>
          <h4 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: colors.utility.primaryText }}>
            <Check className="w-4 h-4" /> Acknowledgment Requirements
          </h4>
          <div className="space-y-4">
            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <span className="text-sm font-medium" style={{ color: colors.utility.primaryText }}>
                  Require buyer acknowledgment
                </span>
                <p className="text-xs" style={{ color: colors.utility.secondaryText }}>
                  Buyer must check "I have read and agree" checkbox
                </p>
              </div>
              <div
                className="w-10 h-5 rounded-full relative cursor-pointer transition-colors"
                style={{ backgroundColor: formData.requireAcknowledgment === true ? colors.brand.primary : (isDarkMode ? colors.utility.secondaryText : '#D1D5DB') }}
                onClick={() => onChange('requireAcknowledgment', !formData.requireAcknowledgment)}
              >
                <div
                  className="absolute w-4 h-4 bg-white rounded-full top-0.5 transition-all"
                  style={{ left: formData.requireAcknowledgment === true ? '22px' : '2px' }}
                />
              </div>
            </label>
            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <span className="text-sm font-medium" style={{ color: colors.utility.primaryText }}>
                  Require digital signature
                </span>
                <p className="text-xs" style={{ color: colors.utility.secondaryText }}>
                  Buyer must sign to accept these terms
                </p>
              </div>
              <div
                className="w-10 h-5 rounded-full relative cursor-pointer transition-colors"
                style={{ backgroundColor: formData.requireSignature === true ? colors.brand.primary : (isDarkMode ? colors.utility.secondaryText : '#D1D5DB') }}
                onClick={() => onChange('requireSignature', !formData.requireSignature)}
              >
                <div
                  className="absolute w-4 h-4 bg-white rounded-full top-0.5 transition-all"
                  style={{ left: formData.requireSignature === true ? '22px' : '2px' }}
                />
              </div>
            </label>
          </div>
        </div>

        {/* Legal Settings */}
        <div className="p-4 rounded-lg" style={{ backgroundColor: isDarkMode ? colors.utility.secondaryBackground : '#F9FAFB' }}>
          <h4 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: colors.utility.primaryText }}>
            <Lock className="w-4 h-4" /> Legal Settings
          </h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1" style={labelStyle}>Content Type</label>
              <select className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2" style={inputStyle}>
                <option value="terms">Terms & Conditions</option>
                <option value="privacy">Privacy Policy</option>
                <option value="disclaimer">Disclaimer</option>
                <option value="warranty">Warranty Terms</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={labelStyle}>Jurisdiction</label>
              <select className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2" style={inputStyle}>
                <option value="india">India</option>
                <option value="us">United States</option>
                <option value="uk">United Kingdom</option>
                <option value="eu">European Union</option>
              </select>
            </div>
          </div>
          <div className="mt-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" className="w-4 h-4 rounded" style={{ accentColor: colors.brand.primary }} />
              <span className="text-sm" style={{ color: colors.utility.primaryText }}>
                This content has been reviewed by legal counsel
              </span>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContentSettingsStep;
