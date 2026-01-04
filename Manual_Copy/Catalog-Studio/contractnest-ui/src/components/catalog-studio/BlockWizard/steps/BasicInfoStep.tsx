// src/components/catalog-studio/BlockWizard/steps/BasicInfoStep.tsx
// Phase 5: Enhanced with RichTextEditor, Image Upload, IconPicker
// Follows patterns from ServiceForm/BasicInfoStep.tsx

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Upload, Image as ImageIcon, X, AlertTriangle, Clock, Tag } from 'lucide-react';
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

  const isServiceBlock = blockType === 'service';
  const isSpareBlock = blockType === 'spare';
  const isBillingBlock = blockType === 'billing';

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

  // Input styles - white background for light mode
  const inputStyle = {
    backgroundColor: isDarkMode ? colors.utility.secondaryBackground : '#FFFFFF',
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

      <div className="space-y-6">
        {/* Row 1: Name and Icon */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Block Name */}
          <div>
            <label className="block text-sm font-medium mb-1" style={labelStyle}>
              {blockTypeLabel} Name <span style={{ color: colors.semantic.error }}>*</span>
            </label>
            <input
              type="text"
              placeholder={`e.g., ${isServiceBlock ? 'Yoga Session' : isSpareBlock ? 'Air Filter' : 'Monthly Plan'}`}
              value={formData.name || ''}
              onChange={(e) => onChange('name', e.target.value)}
              className="w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2"
              style={{
                ...inputStyle,
                '--tw-ring-color': colors.brand.primary + '40',
              } as React.CSSProperties}
            />
          </div>

          {/* Icon Picker */}
          <IconPicker
            value={formData.icon || 'Circle'}
            onChange={(icon) => onChange('icon', icon)}
            label="Block Icon"
          />
        </div>

        {/* Row 2: Image Upload */}
        <div>
          <label className="block text-sm font-medium mb-2" style={labelStyle}>
            Block Image <span className="text-xs font-normal" style={{ color: colors.utility.secondaryText }}>(Optional)</span>
          </label>

          <div
            className={`border-2 border-dashed rounded-lg transition-all ${
              isDragging ? 'border-blue-400' : ''
            }`}
            style={{
              borderColor: imagePreview
                ? colors.semantic.success + '60'
                : isDragging
                ? colors.brand.primary
                : (isDarkMode ? colors.utility.secondaryBackground : '#D1D5DB'),
              backgroundColor: isDragging
                ? colors.brand.primary + '10'
                : (isDarkMode ? colors.utility.secondaryBackground : '#FFFFFF'),
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
                  className="w-full h-32 object-cover rounded-lg"
                />
                <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-30 transition-all rounded-lg flex items-center justify-center">
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
                    className="absolute top-2 right-2 px-2 py-1 rounded text-xs font-medium"
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

          <p className="text-xs mt-1.5" style={{ color: colors.utility.secondaryText }}>
            Recommended: PNG, JPG up to 10MB
          </p>
        </div>

        {/* Row 3: Description (RichTextEditor) */}
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
          minHeight={100}
          maxHeight={200}
        />

        {/* Row 4: Terms & Conditions (Optional - RichTextEditor) */}
        {(isServiceBlock || isSpareBlock) && (
          <RichTextEditor
            value={(formData.meta?.terms as string) || ''}
            onChange={(value) => onChange('meta', { ...formData.meta, terms: value })}
            label="Terms & Conditions"
            placeholder="Enter any specific terms and conditions for this block..."
            required={false}
            maxLength={1000}
            showCharCount={true}
            allowFullscreen={true}
            toolbarButtons={['bold', 'italic', 'bulletList']}
            minHeight={80}
            maxHeight={150}
          />
        )}

        {/* Block-specific fields */}
        {isServiceBlock && (
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1" style={labelStyle}>
                Duration <span style={{ color: colors.semantic.error }}>*</span>
              </label>
              <div className="relative">
                <Clock
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
                  style={{ color: colors.utility.secondaryText }}
                />
                <input
                  type="number"
                  value={formData.duration || 60}
                  onChange={(e) => onChange('duration', parseInt(e.target.value))}
                  className="w-full pl-10 pr-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2"
                  style={inputStyle}
                />
              </div>
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
                value={(formData.meta?.bufferTime as string) || '0'}
                onChange={(e) => onChange('meta', { ...formData.meta, bufferTime: e.target.value })}
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
                value={(formData.meta?.sku as string) || ''}
                onChange={(e) => onChange('meta', { ...formData.meta, sku: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2"
                style={inputStyle}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={labelStyle}>Category</label>
              <select
                value={(formData.meta?.spareCategory as string) || 'parts'}
                onChange={(e) => onChange('meta', { ...formData.meta, spareCategory: e.target.value })}
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
                value={(formData.meta?.paymentType as string) || 'upfront'}
                onChange={(e) => onChange('meta', { ...formData.meta, paymentType: e.target.value })}
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
                value={(formData.meta?.invoiceTrigger as string) || 'auto'}
                onChange={(e) => onChange('meta', { ...formData.meta, invoiceTrigger: e.target.value })}
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

        {/* Tags */}
        <div>
          <label className="block text-sm font-medium mb-1" style={labelStyle}>
            <Tag className="inline w-4 h-4 mr-1" />
            Tags
          </label>
          <input
            type="text"
            placeholder="Add tags separated by commas..."
            value={formData.tags?.join(', ') || ''}
            onChange={(e) => handleTagsChange(e.target.value)}
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
