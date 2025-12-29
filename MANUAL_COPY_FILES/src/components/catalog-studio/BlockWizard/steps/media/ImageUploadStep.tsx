// src/components/catalog-studio/BlockWizard/steps/media/ImageUploadStep.tsx
import React from 'react';
import { Image, Upload, Link, Grid, Lightbulb } from 'lucide-react';
import { useTheme } from '../../../../../contexts/ThemeContext';

interface ImageUploadStepProps {
  formData: {
    sourceType?: 'upload' | 'url';
    imageUrl?: string;
    altText?: string;
    caption?: string;
  };
  onChange: (field: string, value: unknown) => void;
}

const ImageUploadStep: React.FC<ImageUploadStepProps> = ({ formData, onChange }) => {
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
        Image Upload
      </h2>
      <p className="text-sm mb-6" style={{ color: colors.utility.secondaryText }}>
        Add an image to this block.
      </p>

      <div className="space-y-6">
        {/* Source Type */}
        <div>
          <label className="block text-sm font-medium mb-3" style={labelStyle}>Image Source</label>
          <div className="grid grid-cols-2 gap-3">
            <div
              onClick={() => onChange('sourceType', 'upload')}
              className="p-4 border-2 rounded-xl cursor-pointer text-center transition-all"
              style={{
                backgroundColor: (formData.sourceType || 'upload') === 'upload' ? `${colors.brand.primary}10` : colors.utility.primaryBackground,
                borderColor: (formData.sourceType || 'upload') === 'upload' ? colors.brand.primary : (isDarkMode ? colors.utility.secondaryBackground : '#E5E7EB')
              }}
            >
              <Upload className="w-8 h-8 mx-auto mb-2" style={{ color: colors.brand.primary }} />
              <div className="text-sm font-bold" style={{ color: colors.utility.primaryText }}>Upload File</div>
              <div className="text-xs" style={{ color: colors.utility.secondaryText }}>Upload from your device</div>
            </div>
            <div
              onClick={() => onChange('sourceType', 'url')}
              className="p-4 border-2 rounded-xl cursor-pointer text-center transition-all"
              style={{
                backgroundColor: formData.sourceType === 'url' ? `${colors.brand.primary}10` : colors.utility.primaryBackground,
                borderColor: formData.sourceType === 'url' ? colors.brand.primary : (isDarkMode ? colors.utility.secondaryBackground : '#E5E7EB')
              }}
            >
              <Link className="w-8 h-8 mx-auto mb-2" style={{ color: colors.brand.primary }} />
              <div className="text-sm font-bold" style={{ color: colors.utility.primaryText }}>External URL</div>
              <div className="text-xs" style={{ color: colors.utility.secondaryText }}>Link to hosted image</div>
            </div>
          </div>
        </div>

        {/* Upload Area */}
        {(formData.sourceType || 'upload') === 'upload' && (
          <div
            className="border-2 border-dashed rounded-xl p-8 text-center"
            style={{ borderColor: isDarkMode ? colors.utility.secondaryText : '#D1D5DB' }}
          >
            <Image className="w-12 h-12 mx-auto mb-3" style={{ color: colors.utility.secondaryText }} />
            <div className="text-sm font-medium" style={{ color: colors.utility.primaryText }}>
              Drag and drop image here
            </div>
            <div className="text-xs mt-1" style={{ color: colors.utility.secondaryText }}>
              PNG, JPG, WebP (max 5MB)
            </div>
            <button
              className="mt-4 px-4 py-2 text-sm font-medium rounded-lg"
              style={{ backgroundColor: colors.brand.primary, color: '#FFFFFF' }}
            >
              Browse Files
            </button>
          </div>
        )}

        {/* URL Input */}
        {formData.sourceType === 'url' && (
          <div>
            <label className="block text-sm font-medium mb-1" style={labelStyle}>Image URL</label>
            <input
              type="url"
              value={formData.imageUrl || ''}
              onChange={(e) => onChange('imageUrl', e.target.value)}
              placeholder="https://..."
              className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2"
              style={inputStyle}
            />
          </div>
        )}

        {/* Preview */}
        {formData.imageUrl && (
          <div className="p-4 rounded-lg" style={{ backgroundColor: isDarkMode ? colors.utility.secondaryBackground : '#F9FAFB' }}>
            <h4 className="text-sm font-semibold mb-3" style={{ color: colors.utility.primaryText }}>Preview</h4>
            <div
              className="aspect-video rounded-lg flex items-center justify-center overflow-hidden"
              style={{ backgroundColor: isDarkMode ? '#1F2937' : '#E5E7EB' }}
            >
              <Image className="w-16 h-16" style={{ color: colors.utility.secondaryText }} />
            </div>
          </div>
        )}

        {/* Image Details */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1" style={labelStyle}>Alt Text (for accessibility)</label>
            <input
              type="text"
              value={formData.altText || ''}
              onChange={(e) => onChange('altText', e.target.value)}
              placeholder="Describe the image..."
              className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2"
              style={inputStyle}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" style={labelStyle}>Caption (optional)</label>
            <input
              type="text"
              value={formData.caption || ''}
              onChange={(e) => onChange('caption', e.target.value)}
              placeholder="Caption shown below the image..."
              className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2"
              style={inputStyle}
            />
          </div>
        </div>

        {/* Tip */}
        <div className="p-4 rounded-lg flex gap-3" style={{ backgroundColor: `${colors.semantic.info}15` }}>
          <Lightbulb className="w-5 h-5 flex-shrink-0" style={{ color: colors.semantic.info }} />
          <div className="text-sm" style={{ color: isDarkMode ? colors.utility.primaryText : '#1E40AF' }}>
            <strong>Tip:</strong> Use high-quality images that are optimized for web. Recommended dimensions: 1200x800 pixels.
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageUploadStep;
