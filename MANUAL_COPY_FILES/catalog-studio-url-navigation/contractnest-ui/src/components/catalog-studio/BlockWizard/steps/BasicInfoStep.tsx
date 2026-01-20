// src/components/catalog-studio/BlockWizard/steps/BasicInfoStep.tsx
// Updated: Confined Quick Tips height, increased Description, Terms beside Description, removed Duration

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  Upload,
  Image as ImageIcon,
  X,
  Tag,
  Lightbulb,
  Info,
  CheckCircle2,
  FileText,
} from 'lucide-react';
import { useTheme } from '../../../../contexts/ThemeContext';
import { Block } from '../../../../types/catalogStudio';
import { RichTextEditor } from '../../../ui/RichTextEditor';
import IconPicker from '../../IconPicker';

// =================================================================
// TYPES
// =================================================================

interface BasicInfoStepProps {
  blockType: string;
  formData: Partial<Block>;
  onChange: (field: string, value: unknown) => void;
}

// Block type labels for conditional display
const BLOCK_TYPE_LABELS: Record<string, string> = {
  service: 'Service Block',
  spare: 'Spare Part Block',
  billing: 'Billing Block',
  text: 'Text Block',
  video: 'Video Block',
  image: 'Image Block',
  checklist: 'Checklist Block',
  document: 'Document Block',
};

// =================================================================
// COMPONENT
// =================================================================

const BasicInfoStep: React.FC<BasicInfoStepProps> = ({ blockType, formData, onChange }) => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  // Local state for image preview
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isSpareBlock = blockType === 'spare';
  const isBillingBlock = blockType === 'billing';
  const isServiceBlock = blockType === 'service';

  // Get block type label
  const blockTypeLabel = BLOCK_TYPE_LABELS[blockType] || 'Block';

  // Initialize preview from existing image
  useEffect(() => {
    const imageUrl = formData.meta?.image_url as string | undefined;
    const imageFile = formData.meta?.image as File | undefined;

    if (imageFile) {
      const objectUrl = URL.createObjectURL(imageFile);
      setImagePreview(objectUrl);
      return () => URL.revokeObjectURL(objectUrl);
    } else if (imageUrl) {
      setImagePreview(imageUrl);
    } else {
      setImagePreview(null);
    }
  }, [formData.meta?.image, formData.meta?.image_url]);

  // Styles
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

  const labelStyle = {
    color: colors.utility.primaryText,
  };

  // Handle image selection (buffer, don't upload)
  const handleImageSelect = useCallback((file: File) => {
    if (!file || !file.type.startsWith('image/')) {
      console.error('Invalid file type. Please select an image.');
      return;
    }

    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      console.error('File too large. Maximum size is 10MB.');
      return;
    }

    // Store in meta
    onChange('meta', {
      ...formData.meta,
      image: file,
    });
  }, [formData.meta, onChange]);

  const handleFileInputChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) handleImageSelect(file);
  }, [handleImageSelect]);

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setIsDragging(false);
    const file = event.dataTransfer.files[0];
    if (file) handleImageSelect(file);
  }, [handleImageSelect]);

  const handleRemoveImage = useCallback(() => {
    setImagePreview(null);
    onChange('meta', {
      ...formData.meta,
      image: null,
      image_url: '',
    });
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [formData.meta, onChange]);

  const openFileDialog = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  // Handle tags input
  const handleTagsChange = useCallback((value: string) => {
    const tags = value.split(',').map(t => t.trim()).filter(t => t);
    onChange('tags', tags);
  }, [onChange]);

  return (
    <div className="animate-in fade-in slide-in-from-right-4 duration-200">
      {/* Header */}
      <h2 className="text-lg font-bold mb-1" style={{ color: colors.utility.primaryText }}>
        Basic Information
      </h2>
      <p className="text-sm mb-6" style={{ color: colors.utility.secondaryText }}>
        Define the fundamental details of this {blockTypeLabel.toLowerCase()}.
      </p>

      {/* TWO-COLUMN LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left Column (3/5) - Form Fields */}
        <div className="lg:col-span-3 space-y-5">
          {/* Name and Icon Card */}
          <div className="p-5 rounded-xl border" style={cardStyle}>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Block Name */}
              <div>
                <label className="block text-sm font-medium mb-2" style={labelStyle}>
                  {blockTypeLabel} Name <span style={{ color: colors.semantic.error }}>*</span>
                </label>
                <input
                  type="text"
                  placeholder={`e.g., ${isServiceBlock ? 'Yoga Session' : isSpareBlock ? 'Air Filter' : 'Monthly Plan'}`}
                  value={formData.name || ''}
                  onChange={(e) => onChange('name', e.target.value)}
                  className="w-full px-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2"
                  style={inputStyle}
                  required
                />
              </div>

              {/* Icon Picker */}
              <IconPicker
                value={formData.icon || 'Circle'}
                onChange={(icon) => onChange('icon', icon)}
                label="Block Icon"
              />
            </div>
          </div>

          {/* Image Upload Card */}
          <div className="p-5 rounded-xl border" style={cardStyle}>
            <label className="block text-sm font-medium mb-3" style={labelStyle}>
              Block Image <span className="text-xs font-normal" style={{ color: colors.utility.secondaryText }}>(Optional)</span>
            </label>

            <div
              className={`border-2 border-dashed rounded-xl transition-all ${
                isDragging ? 'border-blue-400' : ''
              }`}
              style={{
                borderColor: imagePreview
                  ? colors.semantic.success + '60'
                  : isDragging
                  ? colors.brand.primary
                  : (isDarkMode ? colors.utility.primaryBackground : '#D1D5DB'),
                backgroundColor: isDragging
                  ? colors.brand.primary + '10'
                  : (isDarkMode ? colors.utility.primaryBackground : '#F9FAFB'),
              }}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              {imagePreview ? (
                <div className="relative">
                  <img
                    src={imagePreview}
                    alt="Block preview"
                    className="w-full h-32 object-cover rounded-xl"
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-30 transition-all rounded-xl flex items-center justify-center">
                    <div className="opacity-0 hover:opacity-100 transition-opacity flex gap-2">
                      <button
                        type="button"
                        onClick={openFileDialog}
                        className="p-2 bg-white rounded-full shadow-md hover:bg-gray-100 transition-colors"
                      >
                        <Upload className="h-4 w-4 text-gray-700" />
                      </button>
                      <button
                        type="button"
                        onClick={handleRemoveImage}
                        className="p-2 bg-white rounded-full shadow-md hover:bg-gray-100 transition-colors"
                      >
                        <X className="h-4 w-4 text-gray-700" />
                      </button>
                    </div>
                  </div>
                  {formData.meta?.image && !formData.meta?.image_url && (
                    <div
                      className="absolute top-2 right-2 px-2 py-1 rounded-lg text-xs font-medium"
                      style={{
                        backgroundColor: colors.semantic.warning + '20',
                        color: colors.semantic.warning,
                        border: `1px solid ${colors.semantic.warning}`,
                      }}
                    >
                      Will upload on save
                    </div>
                  )}
                </div>
              ) : (
                <div
                  className="p-6 text-center cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={openFileDialog}
                >
                  <ImageIcon
                    className="h-8 w-8 mx-auto mb-2"
                    style={{ color: colors.utility.secondaryText }}
                  />
                  <p className="text-sm mb-1" style={{ color: colors.utility.primaryText }}>
                    Add Block Image
                  </p>
                  <p className="text-xs" style={{ color: colors.utility.secondaryText }}>
                    Drag and drop or click to browse
                  </p>
                </div>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileInputChange}
              className="hidden"
            />

            <p className="text-xs mt-2" style={{ color: colors.utility.secondaryText }}>
              Recommended: PNG, JPG up to 10MB
            </p>
          </div>

          {/* Description Card */}
          <div className="p-5 rounded-xl border" style={cardStyle}>
            <RichTextEditor
              value={formData.description || ''}
              onChange={(value) => onChange('description', value)}
              label="Description"
              placeholder="Describe what this block includes..."
              required={true}
              maxLength={2000}
              showCharCount={true}
              allowFullscreen={true}
              toolbarButtons={['bold', 'italic', 'underline', 'bulletList', 'orderedList']}
              minHeight={150}
              maxHeight={200}
            />
          </div>

          {/* Block-specific fields - Spare Parts */}
          {isSpareBlock && (
            <div className="p-5 rounded-xl border" style={cardStyle}>
              <h4 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: colors.utility.primaryText }}>
                <FileText className="w-4 h-4" style={{ color: colors.brand.primary }} />
                Product Details
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2" style={labelStyle}>
                    SKU <span style={{ color: colors.semantic.error }}>*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., ACF-150"
                    value={(formData.meta?.sku as string) || ''}
                    onChange={(e) => onChange('meta', { ...formData.meta, sku: e.target.value })}
                    className="w-full px-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2"
                    style={inputStyle}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2" style={labelStyle}>Category</label>
                  <select
                    value={(formData.meta?.spareCategory as string) || 'parts'}
                    onChange={(e) => onChange('meta', { ...formData.meta, spareCategory: e.target.value })}
                    className="w-full px-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2"
                    style={inputStyle}
                  >
                    <option value="filter">Filters</option>
                    <option value="gas">Gases</option>
                    <option value="parts">Parts</option>
                    <option value="accessories">Accessories</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Tags Card */}
          <div className="p-5 rounded-xl border" style={cardStyle}>
            <label className="block text-sm font-medium mb-2 flex items-center gap-2" style={labelStyle}>
              <Tag className="w-4 h-4" style={{ color: colors.brand.primary }} />
              Tags
            </label>
            <input
              type="text"
              placeholder="Add tags separated by commas..."
              value={formData.tags?.join(', ') || ''}
              onChange={(e) => handleTagsChange(e.target.value)}
              className="w-full px-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2"
              style={inputStyle}
            />
            <p className="text-xs mt-2" style={{ color: colors.utility.secondaryText }}>
              Tags help organize and filter blocks in your library
            </p>
          </div>
        </div>

        {/* Right Column (2/5) - Tips Card + Terms */}
        <div className="lg:col-span-2 space-y-5">
          {/* Quick Tips Card - Confined height */}
          <div
            className="p-5 rounded-xl border"
            style={{
              backgroundColor: isDarkMode ? `${colors.brand.primary}10` : '#F0F9FF',
              borderColor: isDarkMode ? `${colors.brand.primary}30` : '#BAE6FD'
            }}
          >
            <div className="flex items-start gap-3 mb-3">
              <div
                className="p-2 rounded-lg"
                style={{
                  backgroundColor: isDarkMode ? colors.brand.primary : '#0284C7',
                }}
              >
                <Lightbulb className="w-4 h-4 text-white" />
              </div>
              <div>
                <h4 className="font-semibold text-sm" style={{ color: isDarkMode ? colors.utility.primaryText : '#0C4A6E' }}>
                  Quick Tips
                </h4>
              </div>
            </div>

            <div className="space-y-2 text-sm" style={{ color: isDarkMode ? colors.utility.secondaryText : '#0369A1' }}>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: isDarkMode ? colors.brand.primary : '#0284C7' }} />
                <span className="text-xs">Use clear, descriptive names</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: isDarkMode ? colors.brand.primary : '#0284C7' }} />
                <span className="text-xs">Add a high-quality image</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: isDarkMode ? colors.brand.primary : '#0284C7' }} />
                <span className="text-xs">Write detailed descriptions</span>
              </div>
            </div>

            <div
              className="mt-3 p-3 rounded-lg"
              style={{
                backgroundColor: isDarkMode ? colors.utility.secondaryBackground : '#FFFFFF',
              }}
            >
              <div className="flex items-center gap-2 mb-1">
                <Info className="w-3.5 h-3.5" style={{ color: isDarkMode ? colors.brand.primary : '#0284C7' }} />
                <span className="font-semibold text-xs" style={{ color: isDarkMode ? colors.utility.primaryText : '#0C4A6E' }}>
                  Required Fields
                </span>
              </div>
              <ul className="text-xs space-y-0.5" style={{ color: isDarkMode ? colors.utility.secondaryText : '#0369A1' }}>
                <li>• Block Name</li>
                <li>• Description</li>
                {isSpareBlock && <li>• SKU</li>}
              </ul>
            </div>
          </div>

          {/* Terms & Conditions Card - Below Quick Tips */}
          {(isServiceBlock || isSpareBlock) && (
            <div className="p-5 rounded-xl border" style={cardStyle}>
              <RichTextEditor
                value={(formData.meta?.terms as string) || ''}
                onChange={(value) => onChange('meta', { ...formData.meta, terms: value })}
                label="Terms & Conditions"
                placeholder="Enter any specific terms and conditions..."
                required={false}
                maxLength={1000}
                showCharCount={true}
                allowFullscreen={true}
                toolbarButtons={['bold', 'italic', 'bulletList']}
                minHeight={150}
                maxHeight={200}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BasicInfoStep;
