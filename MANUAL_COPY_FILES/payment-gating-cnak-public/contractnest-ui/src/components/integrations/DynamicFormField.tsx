// src/components/integrations/DynamicFormField.tsx
import React from 'react';
import { Eye, EyeOff, Upload, Loader2, X, ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { captureException } from '@/utils/sentry';
import { useTheme } from '@/contexts/ThemeContext';
import { vaniToast } from '@/components/common/toast';
import api from '@/services/api';
import { API_ENDPOINTS } from '@/services/serviceURLs';

// Define ConfigField interface locally to avoid import issues
interface ConfigField {
  name: string;
  type: 'text' | 'password' | 'email' | 'boolean' | 'select' | 'number' | 'image';
  required: boolean;
  sensitive: boolean;
  description: string | null;
  display_name: string;
  default?: any;
  options?: Array<{ label: string; value: string | number | boolean }>;
}

interface DynamicFormFieldProps {
  field: ConfigField;
  value: any;
  onChange: (value: any) => void;
  className?: string;
  disabled?: boolean;
}

const DynamicFormField: React.FC<DynamicFormFieldProps> = ({
  field,
  value,
  onChange,
  className,
  disabled = false
}) => {
  const [passwordVisible, setPasswordVisible] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const { isDarkMode, currentTheme } = useTheme();
  
  // Get theme colors
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;
  
  // Format the field value correctly
  const getFormattedValue = () => {
    if (value === undefined && field.default !== undefined) {
      return field.default;
    }
    
    if (value === undefined || value === null) {
      return field.type === 'boolean' ? false : '';
    }
    
    return value;
  };
  
  // Toggle password visibility
  const togglePasswordVisibility = () => {
    setPasswordVisible(!passwordVisible);
  };
  
  // Handle field change
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    try {
      const inputValue = e.target.value;
      let parsedValue: any = inputValue;
      
      // Convert to appropriate type based on field type
      if (field.type === 'number') {
        parsedValue = inputValue === '' ? '' : Number(inputValue);
      } else if (field.type === 'boolean') {
        parsedValue = (e.target as HTMLInputElement).checked;
      }
      
      onChange(parsedValue);
    } catch (error) {
      captureException(error, {
        tags: { component: 'DynamicFormField', action: 'handleChange' },
        extra: { field_name: field.name, field_type: field.type }
      });
    }
  };
  
  // Handle QR/image file selection → upload → store the returned URL
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      vaniToast.error('Please select an image file');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      vaniToast.error('Image must be under 5MB');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('qr_image', file);
      const response = await api.post(API_ENDPOINTS.INTEGRATIONS.UPLOAD_QR, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      const url = response.data?.qr_image_url;
      if (url) {
        onChange(url);
        vaniToast.success('QR code uploaded');
      } else {
        vaniToast.error('Upload succeeded but no URL was returned');
      }
    } catch (error: any) {
      captureException(error, {
        tags: { component: 'DynamicFormField', action: 'handleFileSelect' },
        extra: { field_name: field.name }
      });
      vaniToast.error(error.response?.data?.error || 'Failed to upload QR code');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Render different field types
  const renderField = () => {
    const formattedValue = getFormattedValue();

    switch (field.type) {
      case 'image':
        return (
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg"
              onChange={handleFileSelect}
              disabled={disabled || uploading}
              className="hidden"
              id={`${field.name}-file-input`}
            />
            {formattedValue ? (
              <div className="flex items-center gap-3">
                <img
                  src={formattedValue}
                  alt={field.display_name}
                  className="w-16 h-16 rounded-md object-contain border"
                  style={{ borderColor: `${colors.utility.secondaryText}40`, backgroundColor: colors.utility.secondaryBackground }}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={disabled || uploading}
                  className={cn(
                    "px-3 py-1.5 text-sm rounded-md border transition-colors flex items-center gap-1.5",
                    (disabled || uploading) && "opacity-60 cursor-not-allowed"
                  )}
                  style={{ borderColor: `${colors.utility.secondaryText}40`, color: colors.utility.primaryText }}
                >
                  {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                  Replace
                </button>
                <button
                  type="button"
                  onClick={() => onChange('')}
                  disabled={disabled || uploading}
                  className="p-1.5 rounded-md transition-colors"
                  style={{ color: colors.utility.secondaryText }}
                  title="Remove"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={disabled || uploading}
                className={cn(
                  "w-full p-4 border-2 border-dashed rounded-md flex flex-col items-center justify-center gap-2 transition-colors",
                  (disabled || uploading) && "opacity-60 cursor-not-allowed"
                )}
                style={{ borderColor: `${colors.utility.secondaryText}40`, color: colors.utility.secondaryText }}
              >
                {uploading ? <Loader2 size={20} className="animate-spin" /> : <ImageIcon size={20} />}
                <span className="text-sm">{uploading ? 'Uploading...' : `Upload ${field.display_name}`}</span>
              </button>
            )}
          </div>
        );

      case 'password':
        return (
          <div className="relative">
            <input
              id={field.name}
              type={passwordVisible ? 'text' : 'password'}
              value={formattedValue}
              onChange={handleChange}
              placeholder={`Enter ${field.display_name}`}
              className={cn(
                "w-full p-2 border rounded-md focus:outline-none focus:ring-2 transition-colors",
                disabled && "opacity-60 cursor-not-allowed",
                className
              )}
              style={{
                borderColor: `${colors.utility.secondaryText}40`,
                backgroundColor: colors.utility.secondaryBackground,
                color: colors.utility.primaryText,
                '--tw-ring-color': colors.brand.primary
              } as React.CSSProperties}
              disabled={disabled}
              autoComplete="off"
            />
            <button
              type="button"
              onClick={togglePasswordVisibility}
              className="absolute inset-y-0 right-0 pr-3 flex items-center transition-colors"
              style={{ color: colors.utility.secondaryText }}
            >
              {passwordVisible ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        );
        
      case 'boolean':
        return (
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              id={field.name}
              type="checkbox"
              checked={formattedValue}
              onChange={handleChange}
              className="sr-only peer"
              disabled={disabled}
            />
            <div 
              className={cn(
                "w-11 h-6 peer-focus:outline-none rounded-full peer",
                "peer-checked:after:translate-x-full peer-checked:after:border-white",
                "after:content-[''] after:absolute after:top-[2px] after:left-[2px]",
                "after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5",
                "after:transition-all dark:border-gray-600 transition-colors",
                disabled && "opacity-60 cursor-not-allowed"
              )}
              style={{
                backgroundColor: formattedValue ? colors.brand.primary : colors.utility.secondaryText + '40'
              }}
            />
          </label>
        );
        
      case 'number':
        return (
          <input
            id={field.name}
            type="number"
            value={formattedValue}
            onChange={handleChange}
            placeholder={`Enter ${field.display_name}`}
            className={cn(
              "w-full p-2 border rounded-md focus:outline-none focus:ring-2 transition-colors",
              disabled && "opacity-60 cursor-not-allowed",
              className
            )}
            style={{
              borderColor: `${colors.utility.secondaryText}40`,
              backgroundColor: colors.utility.secondaryBackground,
              color: colors.utility.primaryText,
              '--tw-ring-color': colors.brand.primary
            } as React.CSSProperties}
            disabled={disabled}
          />
        );
        
      case 'select':
        return (
          <select
            id={field.name}
            value={formattedValue}
            onChange={handleChange}
            className={cn(
              "w-full p-2 border rounded-md focus:outline-none focus:ring-2 transition-colors",
              disabled && "opacity-60 cursor-not-allowed",
              className
            )}
            style={{
              borderColor: `${colors.utility.secondaryText}40`,
              backgroundColor: colors.utility.secondaryBackground,
              color: colors.utility.primaryText,
              '--tw-ring-color': colors.brand.primary
            } as React.CSSProperties}
            disabled={disabled}
          >
            <option value="">Select {field.display_name}</option>
            {field.options?.map(option => (
              <option key={String(option.value)} value={String(option.value)}>
                {option.label}
              </option>
            ))}
          </select>
        );
        
      case 'text':
      case 'email':
      default:
        return (
          <input
            id={field.name}
            type={field.type === 'email' ? 'email' : 'text'}
            value={formattedValue}
            onChange={handleChange}
            placeholder={`Enter ${field.display_name}`}
            className={cn(
              "w-full p-2 border rounded-md focus:outline-none focus:ring-2 transition-colors",
              disabled && "opacity-60 cursor-not-allowed",
              className
            )}
            style={{
              borderColor: `${colors.utility.secondaryText}40`,
              backgroundColor: colors.utility.secondaryBackground,
              color: colors.utility.primaryText,
              '--tw-ring-color': colors.brand.primary
            } as React.CSSProperties}
            disabled={disabled}
          />
        );
    }
  };
  
  return (
    <div className="space-y-2">
      <div className="flex justify-between">
        <label 
          htmlFor={field.name} 
          className="block text-sm font-medium transition-colors"
          style={{ color: colors.utility.primaryText }}
        >
          {field.display_name}
          {field.required && <span className="text-red-500 ml-1">*</span>}
        </label>
        
        {field.sensitive && (
          <span 
            className="text-xs transition-colors"
            style={{ color: colors.utility.secondaryText }}
          >
            Sensitive
          </span>
        )}
      </div>
      
      {renderField()}
      
      {field.description && (
        <p 
          className="text-xs transition-colors"
          style={{ color: colors.utility.secondaryText }}
        >
          {field.description}
        </p>
      )}
    </div>
  );
};

export default DynamicFormField;