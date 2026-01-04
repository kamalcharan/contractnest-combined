// src/components/catalog-studio/BlockWizard/steps/media/DisplaySettingsStep.tsx
import React from 'react';
import { Maximize, Play, Eye, Settings } from 'lucide-react';
import { useTheme } from '../../../../../contexts/ThemeContext';

interface DisplaySettingsStepProps {
  formData: {
    displaySize?: 'small' | 'medium' | 'large' | 'full';
    alignment?: 'left' | 'center' | 'right';
    autoplay?: boolean;
    loop?: boolean;
    muted?: boolean;
    showControls?: boolean;
  };
  onChange: (field: string, value: unknown) => void;
  blockType: string;
}

const DisplaySettingsStep: React.FC<DisplaySettingsStepProps> = ({ formData, onChange, blockType }) => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  const inputStyle = {
    backgroundColor: isDarkMode ? colors.utility.secondaryBackground : '#FFFFFF',
    borderColor: isDarkMode ? colors.utility.secondaryBackground : '#D1D5DB',
    color: colors.utility.primaryText
  };

  const labelStyle = { color: colors.utility.primaryText };
  const isVideo = blockType === 'video';

  const sizeOptions = [
    { id: 'small', label: 'Small', width: '25%' },
    { id: 'medium', label: 'Medium', width: '50%' },
    { id: 'large', label: 'Large', width: '75%' },
    { id: 'full', label: 'Full Width', width: '100%' },
  ];

  return (
    <div className="animate-in fade-in slide-in-from-right-4 duration-200">
      <h2 className="text-lg font-bold mb-1" style={{ color: colors.utility.primaryText }}>
        Display Settings
      </h2>
      <p className="text-sm mb-6" style={{ color: colors.utility.secondaryText }}>
        Configure how this {isVideo ? 'video' : 'image'} appears in contracts.
      </p>

      <div className="space-y-6">
        {/* Size Selection */}
        <div className="p-4 rounded-lg" style={{ backgroundColor: isDarkMode ? colors.utility.secondaryBackground : '#F9FAFB' }}>
          <h4 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: colors.utility.primaryText }}>
            <Maximize className="w-4 h-4" /> Display Size
          </h4>
          <div className="grid grid-cols-4 gap-3">
            {sizeOptions.map((size) => {
              const isSelected = (formData.displaySize || 'medium') === size.id;
              return (
                <div
                  key={size.id}
                  onClick={() => onChange('displaySize', size.id)}
                  className="p-3 border-2 rounded-lg cursor-pointer text-center transition-all"
                  style={{
                    backgroundColor: isSelected ? `${colors.brand.primary}10` : (isDarkMode ? colors.utility.secondaryBackground : '#FFFFFF'),
                    borderColor: isSelected ? colors.brand.primary : (isDarkMode ? colors.utility.secondaryBackground : '#E5E7EB')
                  }}
                >
                  <div
                    className="h-8 mx-auto mb-2 rounded"
                    style={{
                      width: size.width,
                      maxWidth: '100%',
                      backgroundColor: colors.brand.primary
                    }}
                  />
                  <div className="text-xs font-medium" style={{ color: colors.utility.primaryText }}>{size.label}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Alignment */}
        <div className="p-4 rounded-lg" style={{ backgroundColor: isDarkMode ? colors.utility.secondaryBackground : '#F9FAFB' }}>
          <h4 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: colors.utility.primaryText }}>
            <Settings className="w-4 h-4" /> Alignment
          </h4>
          <div className="grid grid-cols-3 gap-3">
            {['left', 'center', 'right'].map((align) => {
              const isSelected = (formData.alignment || 'center') === align;
              return (
                <div
                  key={align}
                  onClick={() => onChange('alignment', align)}
                  className="p-3 border-2 rounded-lg cursor-pointer text-center transition-all"
                  style={{
                    backgroundColor: isSelected ? `${colors.brand.primary}10` : (isDarkMode ? colors.utility.secondaryBackground : '#FFFFFF'),
                    borderColor: isSelected ? colors.brand.primary : (isDarkMode ? colors.utility.secondaryBackground : '#E5E7EB')
                  }}
                >
                  <div className="text-sm font-medium capitalize" style={{ color: colors.utility.primaryText }}>{align}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Video-specific Options */}
        {isVideo && (
          <div className="p-4 rounded-lg" style={{ backgroundColor: isDarkMode ? colors.utility.secondaryBackground : '#F9FAFB' }}>
            <h4 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: colors.utility.primaryText }}>
              <Play className="w-4 h-4" /> Playback Options
            </h4>
            <div className="space-y-3">
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-sm" style={{ color: colors.utility.primaryText }}>Autoplay</span>
                <div
                  className="w-10 h-5 rounded-full relative cursor-pointer transition-colors"
                  style={{ backgroundColor: formData.autoplay === true ? colors.brand.primary : (isDarkMode ? colors.utility.secondaryText : '#D1D5DB') }}
                  onClick={() => onChange('autoplay', !formData.autoplay)}
                >
                  <div
                    className="absolute w-4 h-4 bg-white rounded-full top-0.5 transition-all"
                    style={{ left: formData.autoplay === true ? '22px' : '2px' }}
                  />
                </div>
              </label>
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-sm" style={{ color: colors.utility.primaryText }}>Loop video</span>
                <div
                  className="w-10 h-5 rounded-full relative cursor-pointer transition-colors"
                  style={{ backgroundColor: formData.loop === true ? colors.brand.primary : (isDarkMode ? colors.utility.secondaryText : '#D1D5DB') }}
                  onClick={() => onChange('loop', !formData.loop)}
                >
                  <div
                    className="absolute w-4 h-4 bg-white rounded-full top-0.5 transition-all"
                    style={{ left: formData.loop === true ? '22px' : '2px' }}
                  />
                </div>
              </label>
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-sm" style={{ color: colors.utility.primaryText }}>Start muted</span>
                <div
                  className="w-10 h-5 rounded-full relative cursor-pointer transition-colors"
                  style={{ backgroundColor: formData.muted !== false ? colors.brand.primary : (isDarkMode ? colors.utility.secondaryText : '#D1D5DB') }}
                  onClick={() => onChange('muted', formData.muted === false)}
                >
                  <div
                    className="absolute w-4 h-4 bg-white rounded-full top-0.5 transition-all"
                    style={{ left: formData.muted !== false ? '22px' : '2px' }}
                  />
                </div>
              </label>
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-sm" style={{ color: colors.utility.primaryText }}>Show player controls</span>
                <div
                  className="w-10 h-5 rounded-full relative cursor-pointer transition-colors"
                  style={{ backgroundColor: formData.showControls !== false ? colors.brand.primary : (isDarkMode ? colors.utility.secondaryText : '#D1D5DB') }}
                  onClick={() => onChange('showControls', formData.showControls === false)}
                >
                  <div
                    className="absolute w-4 h-4 bg-white rounded-full top-0.5 transition-all"
                    style={{ left: formData.showControls !== false ? '22px' : '2px' }}
                  />
                </div>
              </label>
            </div>
          </div>
        )}

        {/* Visibility */}
        <div className="p-4 rounded-lg" style={{ backgroundColor: isDarkMode ? colors.utility.secondaryBackground : '#F9FAFB' }}>
          <h4 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: colors.utility.primaryText }}>
            <Eye className="w-4 h-4" /> Visibility
          </h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1" style={labelStyle}>Show in</label>
              <select
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2"
                style={inputStyle}
              >
                <option value="all">All views</option>
                <option value="web">Web only</option>
                <option value="print">Print only</option>
                <option value="mobile">Mobile only</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={labelStyle}>Border Style</label>
              <select
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2"
                style={inputStyle}
              >
                <option value="none">No border</option>
                <option value="thin">Thin border</option>
                <option value="rounded">Rounded corners</option>
                <option value="shadow">Drop shadow</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DisplaySettingsStep;
