// src/components/tenantprofile/shared/BrandColorPicker.tsx
import React, { useState, useEffect } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { Palette, RefreshCw, Copy, Check, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

interface ColorPickerProps {
  /** Label for the color picker */
  label: string;
  /** Current color value */
  value: string;
  /** Callback when color changes */
  onChange: (color: string) => void;
  /** Whether the field is disabled */
  disabled?: boolean;
  /** Optional placeholder color */
  placeholder?: string;
  /** Show preset colors */
  showPresets?: boolean;
  /** Custom preset colors */
  presetColors?: string[];
}

interface BrandColorPickerProps {
  /** Primary color value */
  primaryColor: string;
  /** Secondary color value */
  secondaryColor: string;
  /** Callback when primary color changes */
  onPrimaryColorChange: (color: string) => void;
  /** Callback when secondary color changes */
  onSecondaryColorChange: (color: string) => void;
  /** Whether the fields are disabled */
  disabled?: boolean;
  /** Optional custom class name */
  className?: string;
  /** Show label */
  showLabel?: boolean;
  /** Custom label text */
  labelText?: string;
  /** Compact mode - inline layout without presets/preview */
  compact?: boolean;
}

/**
 * Single Color Picker Component
 */
const ColorPicker: React.FC<ColorPickerProps> = ({
  label,
  value,
  onChange,
  disabled = false,
  placeholder = '#000000',
  showPresets = true,
  presetColors = [
    '#4F46E5', // Indigo
    '#7C3AED', // Violet
    '#2563EB', // Blue
    '#0891B2', // Cyan
    '#059669', // Emerald
    '#10B981', // Green
    '#F59E0B', // Amber
    '#EF4444', // Red
    '#EC4899', // Pink
    '#8B5CF6', // Purple
  ]
}) => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;
  
  const [inputValue, setInputValue] = useState(value);
  const [isValid, setIsValid] = useState(true);
  const [copied, setCopied] = useState(false);
  
  // Validate hex color
  const isValidHexColor = (color: string): boolean => {
    return /^#[0-9A-F]{6}$/i.test(color);
  };
  
  // Update input when prop changes
  useEffect(() => {
    setInputValue(value);
    setIsValid(isValidHexColor(value));
  }, [value]);
  
  /**
   * Handle input change
   */
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    
    // Validate and update
    if (isValidHexColor(newValue)) {
      setIsValid(true);
      onChange(newValue);
    } else {
      setIsValid(false);
    }
  };
  
  /**
   * Handle color picker change
   */
  const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newColor = e.target.value;
    setInputValue(newColor);
    setIsValid(true);
    onChange(newColor);
  };
  
  /**
   * Handle preset click
   */
  const handlePresetClick = (color: string) => {
    if (!disabled) {
      setInputValue(color);
      setIsValid(true);
      onChange(color);
      toast.success(`${label} updated`);
    }
  };
  
  /**
   * Generate random color
   */
  const generateRandomColor = () => {
    if (!disabled) {
      const randomColor = '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0').toUpperCase();
      setInputValue(randomColor);
      setIsValid(true);
      onChange(randomColor);
      toast.success('Random color generated');
    }
  };
  
  /**
   * Copy color to clipboard
   */
  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(inputValue);
      setCopied(true);
      toast.success('Color copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error('Failed to copy color');
    }
  };
  
  return (
    <div className="space-y-3">
      {/* Label */}
      <label 
        className="block text-sm font-medium transition-colors"
        style={{ color: colors.utility.primaryText }}
      >
        {label}
      </label>
      
      {/* Color Display and Picker */}
      <div className="flex items-center space-x-3">
        {/* Color Preview Circle */}
        <div 
          className="w-12 h-12 rounded-full border-2 flex-shrink-0 cursor-pointer transition-all hover:scale-105"
          style={{ 
            backgroundColor: isValid ? inputValue : placeholder,
            borderColor: isValid 
              ? colors.utility.secondaryText + '20' 
              : colors.semantic.error,
            boxShadow: `0 0 0 3px ${(isValid ? inputValue : placeholder) + '20'}`
          }}
          onClick={() => document.getElementById(`color-input-${label}`)?.click()}
          title="Click to pick color"
          role="button"
          aria-label={`Pick ${label.toLowerCase()}`}
        />
        
        {/* Hidden Color Input */}
        <input
          id={`color-input-${label}`}
          type="color"
          value={isValid ? inputValue : placeholder}
          onChange={handleColorChange}
          className="sr-only"
          disabled={disabled}
          aria-label={`${label} color picker`}
        />
        
        {/* Hex Input */}
        <div className="flex-1">
          <input
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            placeholder={placeholder}
            maxLength={7}
            className="w-full p-2 border rounded-md font-mono text-sm focus:outline-none focus:ring-2 transition-colors uppercase"
            style={{
              borderColor: isValid 
                ? colors.utility.secondaryText + '40' 
                : colors.semantic.error,
              backgroundColor: colors.utility.secondaryBackground,
              color: colors.utility.primaryText,
              '--tw-ring-color': colors.brand.primary
            } as React.CSSProperties}
            disabled={disabled}
            aria-label={`${label} hex value`}
            aria-invalid={!isValid}
          />
        </div>
        
        {/* Action Buttons */}
        <div className="flex items-center space-x-2">
          {/* Copy Button */}
          <button
            type="button"
            onClick={copyToClipboard}
            disabled={disabled || !isValid}
            className="p-2 rounded-md border transition-all hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              backgroundColor: colors.utility.secondaryBackground,
              borderColor: colors.utility.secondaryText + '20',
              color: copied ? colors.semantic.success : colors.utility.secondaryText
            }}
            title="Copy to clipboard"
            aria-label="Copy color to clipboard"
          >
            {copied ? (
              <Check className="h-4 w-4" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </button>
          
          {/* Random Button */}
          <button
            type="button"
            onClick={generateRandomColor}
            disabled={disabled}
            className="p-2 rounded-md border transition-all hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              backgroundColor: colors.utility.secondaryBackground,
              borderColor: colors.utility.secondaryText + '20',
              color: colors.utility.secondaryText
            }}
            title="Generate random color"
            aria-label="Generate random color"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>
      
      {/* Error Message */}
      {!isValid && (
        <div 
          className="flex items-start space-x-2 p-2 rounded-md transition-colors"
          style={{
            backgroundColor: colors.semantic.error + '10',
            borderLeft: `3px solid ${colors.semantic.error}`
          }}
          role="alert"
        >
          <AlertCircle 
            className="h-4 w-4 mt-0.5 flex-shrink-0"
            style={{ color: colors.semantic.error }}
          />
          <p 
            className="text-xs"
            style={{ color: colors.semantic.error }}
          >
            Please enter a valid hex color (e.g., #4F46E5)
          </p>
        </div>
      )}
      
      {/* Preset Colors */}
      {showPresets && (
        <div className="space-y-2">
          <p 
            className="text-xs font-medium transition-colors"
            style={{ color: colors.utility.secondaryText }}
          >
            Quick Colors
          </p>
          <div className="flex flex-wrap gap-2">
            {presetColors.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => handlePresetClick(color)}
                disabled={disabled}
                className="w-8 h-8 rounded-full border-2 transition-all hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2"
                style={{
                  backgroundColor: color,
                  borderColor: inputValue.toLowerCase() === color.toLowerCase() 
                    ? colors.utility.primaryText 
                    : 'transparent',
                  '--tw-ring-color': colors.brand.primary
                } as React.CSSProperties}
                title={color}
                aria-label={`Preset color ${color}`}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Brand Color Picker Component (Primary + Secondary)
 */
const BrandColorPicker: React.FC<BrandColorPickerProps> = ({
  primaryColor,
  secondaryColor,
  onPrimaryColorChange,
  onSecondaryColorChange,
  disabled = false,
  className = '',
  showLabel = true,
  labelText = 'Brand Colors',
  compact = false
}) => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  // Compact mode - simple inline color pickers
  if (compact) {
    return (
      <div className={`space-y-2 ${className}`}>
        <label
          className="block text-sm font-medium transition-colors"
          style={{ color: colors.utility.primaryText }}
        >
          Brand Colors
        </label>
        <div className="flex items-center space-x-4">
          {/* Primary Color */}
          <div className="flex items-center space-x-2">
            <div
              className="w-8 h-8 rounded-full border-2 cursor-pointer transition-all hover:scale-105"
              style={{
                backgroundColor: primaryColor,
                borderColor: colors.utility.secondaryText + '40',
              }}
              onClick={() => document.getElementById('compact-primary-color')?.click()}
              title="Primary Color"
            />
            <input
              id="compact-primary-color"
              type="color"
              value={primaryColor}
              onChange={(e) => onPrimaryColorChange(e.target.value)}
              className="sr-only"
              disabled={disabled}
            />
            <span
              className="text-xs font-mono"
              style={{ color: colors.utility.secondaryText }}
            >
              Primary
            </span>
          </div>

          {/* Secondary Color */}
          <div className="flex items-center space-x-2">
            <div
              className="w-8 h-8 rounded-full border-2 cursor-pointer transition-all hover:scale-105"
              style={{
                backgroundColor: secondaryColor,
                borderColor: colors.utility.secondaryText + '40',
              }}
              onClick={() => document.getElementById('compact-secondary-color')?.click()}
              title="Secondary Color"
            />
            <input
              id="compact-secondary-color"
              type="color"
              value={secondaryColor}
              onChange={(e) => onSecondaryColorChange(e.target.value)}
              className="sr-only"
              disabled={disabled}
            />
            <span
              className="text-xs font-mono"
              style={{ color: colors.utility.secondaryText }}
            >
              Secondary
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Section Label */}
      {showLabel && (
        <div>
          <div
            className="text-base font-medium flex items-center transition-colors"
            style={{ color: colors.utility.primaryText }}
          >
            <Palette
              className="mr-2 h-5 w-5"
              style={{ color: colors.brand.primary }}
            />
            {labelText}
          </div>
          <p
            className="text-sm mt-1 transition-colors"
            style={{ color: colors.utility.secondaryText }}
          >
            Customize your application colors to match your brand
          </p>
        </div>
      )}

      {/* Color Pickers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Primary Color */}
        <ColorPicker
          label="Primary Color"
          value={primaryColor}
          onChange={onPrimaryColorChange}
          disabled={disabled}
          placeholder="#4F46E5"
        />

        {/* Secondary Color */}
        <ColorPicker
          label="Secondary Color"
          value={secondaryColor}
          onChange={onSecondaryColorChange}
          disabled={disabled}
          placeholder="#10B981"
        />
      </div>

      {/* Preview Section */}
      <div
        className="p-4 rounded-lg border transition-colors"
        style={{
          backgroundColor: colors.utility.secondaryBackground,
          borderColor: colors.utility.secondaryText + '20'
        }}
      >
        <p
          className="text-xs font-medium mb-3 transition-colors"
          style={{ color: colors.utility.secondaryText }}
        >
          Color Preview
        </p>
        <div className="flex items-center space-x-4">
          <div className="flex-1 space-y-2">
            <div
              className="h-10 rounded-md flex items-center justify-center text-white font-medium text-sm transition-all"
              style={{ backgroundColor: primaryColor }}
            >
              Primary
            </div>
            <div
              className="h-10 rounded-md flex items-center justify-center text-white font-medium text-sm transition-all"
              style={{ backgroundColor: secondaryColor }}
            >
              Secondary
            </div>
          </div>
          <div
            className="flex-1 h-20 rounded-md transition-all"
            style={{
              background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default BrandColorPicker;