// src/components/catalog-studio/BlockWizard/steps/media/ImageUploadStep.tsx
import React from 'react';
import { Image, Link, Lightbulb } from 'lucide-react';
import { useTheme } from '../../../../../contexts/ThemeContext';
import FileUploader from '../../../../common/FileUploader';

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
    backgroundColor: isDarkMode ? colors.utility.secondaryBackground : '#FFFFFF',
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
                backgroundColor: (formData.sourceType || 'upload') === 'upload' ? `${colors.brand.primary}10` : (isDarkMode ? colors.utility.secondaryBackground : '#FFFFFF'),
                borderColor: (formData.sourceType || 'upload') === 'upload' ? colors.brand.primary : (isDarkMode ? colors.utility.secondaryBackground : '#E5E7EB')
              }}
            >
              <Image className="w-8 h-8 mx-auto mb-2" style={{ color: colors.brand.primary }} />
              <div className="text-sm font-bold" style={{ color: colors.utility.primaryText }}>Upload File</div>
              <div className="text-xs" style={{ color: colors.utility.secondaryText }}>Upload from your device</div>
            </div>
            <div
              onClick={() => onChange('sourceType', 'url')}
              className="p-4 border-2 rounded-xl cursor-pointer text-center transition-all"
              style={{
                backgroundColor: formData.sourceType === 'url' ? `${colors.brand.primary}10` : (isDarkMode ? colors.utility.secondaryBackground : '#FFFFFF'),
                borderColor: formData.sourceType === 'url' ? colors.brand.primary : (isDarkMode ? colors.utility.secondaryBackground : '#E5E7EB')
              }}
            >
              <Link className="w-8 h-8 mx-auto mb-2" style={{ color: colors.brand.primary }} />
              <div className="text-sm font-bold" style={{ color: colors.utility.primaryText }}>External URL</div>
              <div className="text-xs" style={{ color: colors.utility.secondaryText }}>Link to hosted image</div>
            </div>
          </div>
        </div>

        {/* Upload Area - Using FileUploader */}
        {(formData.sourceType || 'upload') === 'upload' && (
          <FileUploader
            category="block_images"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onUploadComplete={(file) => onChange('imageUrl', file.download_url)}
            onUploadError={(error) => console.error('Image upload failed:', error)}
            showPreview={true}
            previewSize="large"
            hint="PNG, JPG, WebP, GIF (max 5MB)"
          />
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

        {/* Preview for URL input */}
        {formData.sourceType === 'url' && formData.imageUrl && (
          <div className="p-4 rounded-lg" style={{ backgroundColor: isDarkMode ? colors.utility.secondaryBackground : '#F9FAFB' }}>
            <h4 className="text-sm font-semibold mb-3" style={{ color: colors.utility.primaryText }}>Preview</h4>
            <div
              className="aspect-video rounded-lg flex items-center justify-center overflow-hidden"
              style={{ backgroundColor: isDarkMode ? '#1F2937' : '#E5E7EB' }}
            >
              <img
                src={formData.imageUrl}
                alt="Preview"
                className="max-w-full max-h-full object-contain"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
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
              maxLength={255}
              className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2"
              style={inputStyle}
            />
            <p className="text-xs mt-1" style={{ color: colors.utility.secondaryText }}>
              {(formData.altText || '').length}/255 characters
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" style={labelStyle}>Caption (optional)</label>
            <input
              type="text"
              value={formData.caption || ''}
              onChange={(e) => onChange('caption', e.target.value)}
              placeholder="Caption shown below the image..."
              maxLength={500}
              className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2"
              style={inputStyle}
            />
            <p className="text-xs mt-1" style={{ color: colors.utility.secondaryText }}>
              {(formData.caption || '').length}/500 characters
            </p>
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
