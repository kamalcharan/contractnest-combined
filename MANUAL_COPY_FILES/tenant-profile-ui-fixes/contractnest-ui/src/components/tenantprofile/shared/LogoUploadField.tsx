// src/components/tenantprofile/shared/LogoUploadField.tsx
import React, { useState, useRef } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { Building, Upload, Trash2, Loader2, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

interface LogoUploadFieldProps {
  /** Current logo URL (if exists) */
  logoUrl?: string | null;
  /** Callback when logo file is selected */
  onLogoChange: (file: File | null) => void;
  /** Whether the field is disabled */
  disabled?: boolean;
  /** Optional custom class name */
  className?: string;
  /** Show label */
  showLabel?: boolean;
  /** Custom label text */
  labelText?: string;
}

const LogoUploadField: React.FC<LogoUploadFieldProps> = ({
  logoUrl,
  onLogoChange,
  disabled = false,
  className = '',
  showLabel = true,
  labelText = 'Organization Logo'
}) => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;
  
  const [previewUrl, setPreviewUrl] = useState<string | null>(logoUrl || null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Allowed file types
  const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml'];
  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
  
  /**
   * Validate file before processing
   */
  const validateFile = (file: File): { valid: boolean; error?: string } => {
    // Check file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return {
        valid: false,
        error: 'Invalid file type. Please upload PNG, JPG, or SVG files only.'
      };
    }
    
    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      return {
        valid: false,
        error: 'File size exceeds 5MB limit. Please choose a smaller file.'
      };
    }
    
    return { valid: true };
  };
  
  /**
   * Handle file selection
   */
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    
    if (!file) {
      return;
    }
    
    // Reset previous error
    setError(null);
    
    // Validate file
    const validation = validateFile(file);
    if (!validation.valid) {
      setError(validation.error || 'Invalid file');
      toast.error(validation.error || 'Invalid file');
      
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }
    
    setIsUploading(true);
    
    try {
      // Create preview URL
      const preview = URL.createObjectURL(file);
      setPreviewUrl(preview);
      
      // Call parent callback
      onLogoChange(file);
      
      toast.success('Logo selected successfully');
    } catch (err) {
      console.error('Error processing logo:', err);
      setError('Failed to process logo file');
      toast.error('Failed to process logo file');
    } finally {
      setIsUploading(false);
    }
  };
  
  /**
   * Handle remove logo
   */
  const handleRemoveLogo = () => {
    // Revoke preview URL to free memory
    if (previewUrl && previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl);
    }
    
    setPreviewUrl(null);
    setError(null);
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    
    // Call parent callback
    onLogoChange(null);
    
    toast.success('Logo removed');
  };
  
  /**
   * Trigger file input click
   */
  const handleUploadClick = () => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };
  
  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);
  
  return (
    <div className={`space-y-4 ${className}`}>
      {/* Label */}
      {showLabel && (
        <div 
          className="text-base font-medium transition-colors"
          style={{ color: colors.utility.primaryText }}
        >
          {labelText}
        </div>
      )}
      
      {/* Upload Area */}
      <div className="flex items-center space-x-6">
        {/* Preview Box */}
        <div 
          className="w-24 h-24 flex items-center justify-center rounded-lg overflow-hidden border transition-all relative"
          style={{
            backgroundColor: colors.utility.secondaryBackground,
            borderColor: error 
              ? colors.semantic.error 
              : colors.utility.secondaryText + '20'
          }}
          role="img"
          aria-label={previewUrl ? 'Logo preview' : 'No logo uploaded'}
        >
          {isUploading ? (
            <Loader2 
              className="animate-spin"
              style={{ color: colors.brand.primary }}
              size={32}
            />
          ) : previewUrl ? (
            <img 
              src={previewUrl} 
              alt="Logo Preview" 
              className="w-full h-full object-contain"
            />
          ) : (
            <Building 
              style={{ color: colors.utility.secondaryText }} 
              size={32} 
            />
          )}
        </div>
        
        {/* Upload Controls */}
        <div className="flex flex-col space-y-3 flex-1">
          <div className="flex space-x-3">
            {/* Upload Button */}
            <button
              type="button" 
              className="flex items-center px-3 py-2 rounded-md border transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                backgroundColor: colors.brand.primary + '05',
                borderColor: colors.brand.primary + '10',
                color: colors.utility.primaryText
              }}
              onClick={handleUploadClick}
              disabled={disabled || isUploading}
              onMouseEnter={(e) => {
                if (!disabled && !isUploading) {
                  e.currentTarget.style.backgroundColor = colors.brand.primary + '10';
                }
              }}
              onMouseLeave={(e) => {
                if (!disabled && !isUploading) {
                  e.currentTarget.style.backgroundColor = colors.brand.primary + '05';
                }
              }}
              aria-label="Upload logo"
            >
              {isUploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" style={{ color: colors.brand.primary }} />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload 
                    className="mr-2 h-4 w-4"
                    style={{ color: colors.brand.primary }}
                  />
                  Upload Logo
                </>
              )}
            </button>
            
            {/* Remove Button */}
            {previewUrl && !isUploading && (
              <button
                type="button"
                className="flex items-center px-3 py-2 rounded-md border transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  backgroundColor: colors.semantic.error + '05',
                  borderColor: colors.semantic.error + '10',
                  color: colors.semantic.error
                }}
                onClick={handleRemoveLogo}
                disabled={disabled}
                onMouseEnter={(e) => {
                  if (!disabled) {
                    e.currentTarget.style.backgroundColor = colors.semantic.error + '10';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!disabled) {
                    e.currentTarget.style.backgroundColor = colors.semantic.error + '05';
                  }
                }}
                aria-label="Remove logo"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Remove
              </button>
            )}
          </div>
          
          {/* Help Text */}
          {!error && (
            <p 
              className="text-xs transition-colors"
              style={{ color: colors.utility.secondaryText }}
            >
              Recommended: 512x512px. Max: 5MB. Formats: PNG, JPG, SVG.
            </p>
          )}
          
          {/* Error Message */}
          {error && (
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
                {error}
              </p>
            </div>
          )}
          
          {/* Hidden File Input */}
          <input 
            ref={fileInputRef}
            id="logo-upload" 
            type="file"
            accept={ALLOWED_TYPES.join(',')}
            className="hidden"
            onChange={handleFileSelect}
            disabled={disabled || isUploading}
            aria-label="Logo file input"
          />
        </div>
      </div>
    </div>
  );
};

export default LogoUploadField;