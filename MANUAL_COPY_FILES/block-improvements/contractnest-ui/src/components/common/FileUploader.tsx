// src/components/common/FileUploader.tsx
// Reusable file upload component using useStorageManagement hook

import React, { useState, useRef, useCallback } from 'react';
import { Upload, X, File, Image, Video, FileText, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { useStorageManagement, StorageFile } from '../../hooks/useStorageManagement';
import { formatFileSize, isFileTypeAllowed, isFileSizeAllowed, STORAGE_CATEGORIES } from '../../utils/constants/storageConstants';

export interface FileUploaderProps {
  category: string;
  accept?: string;
  maxSize?: number;
  multiple?: boolean;
  onUploadComplete: (file: StorageFile) => void;
  onUploadError?: (error: string) => void;
  onFileRemove?: (fileId: string) => void;
  existingFiles?: StorageFile[];
  showPreview?: boolean;
  previewSize?: 'small' | 'medium' | 'large';
  label?: string;
  hint?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}

const FileUploader: React.FC<FileUploaderProps> = ({
  category,
  accept,
  maxSize,
  multiple = false,
  onUploadComplete,
  onUploadError,
  onFileRemove,
  existingFiles = [],
  showPreview = true,
  previewSize = 'medium',
  label,
  hint,
  required = false,
  disabled = false,
  className = '',
}) => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  const { uploadFile, deleteFile, isSubmitting, storageSetupComplete } = useStorageManagement();

  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<StorageFile[]>(existingFiles);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Get category config
  const categoryConfig = STORAGE_CATEGORIES.find(c => c.id === category);
  const allowedTypes = categoryConfig?.allowedTypes || [];
  const maxFileSize = maxSize || categoryConfig?.maxFileSize || 5 * 1024 * 1024;

  // Determine accept string
  const acceptString = accept || allowedTypes.join(',');

  // Get file icon based on type
  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return Image;
    if (mimeType.startsWith('video/')) return Video;
    if (mimeType.includes('pdf') || mimeType.includes('document')) return FileText;
    return File;
  };

  // Preview size classes
  const previewSizeClasses = {
    small: 'w-16 h-16',
    medium: 'w-24 h-24',
    large: 'w-32 h-32',
  };

  // Handle file selection
  const handleFileSelect = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0 || disabled) return;

    setError(null);

    const filesToUpload = multiple ? Array.from(files) : [files[0]];

    for (const file of filesToUpload) {
      // Validate file type
      if (!isFileTypeAllowed(file.type, category)) {
        const errorMsg = `File type "${file.type}" is not allowed for this category`;
        setError(errorMsg);
        onUploadError?.(errorMsg);
        continue;
      }

      // Validate file size
      if (!isFileSizeAllowed(file.size, category)) {
        const errorMsg = `File size exceeds maximum of ${formatFileSize(maxFileSize)}`;
        setError(errorMsg);
        onUploadError?.(errorMsg);
        continue;
      }

      // Upload file
      setUploadProgress(0);

      try {
        const uploadedFile = await uploadFile(file, category);

        if (uploadedFile) {
          setUploadedFiles(prev => [...prev, uploadedFile]);
          onUploadComplete(uploadedFile);
          setUploadProgress(100);

          // Clear progress after a moment
          setTimeout(() => setUploadProgress(null), 1500);
        }
      } catch (err: any) {
        const errorMsg = err.message || 'Upload failed';
        setError(errorMsg);
        onUploadError?.(errorMsg);
        setUploadProgress(null);
      }
    }
  }, [category, disabled, maxFileSize, multiple, onUploadComplete, onUploadError, uploadFile]);

  // Handle drag events
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (!disabled) {
      handleFileSelect(e.dataTransfer.files);
    }
  };

  // Handle file removal
  const handleRemoveFile = async (fileId: string) => {
    const success = await deleteFile(fileId);
    if (success) {
      setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
      onFileRemove?.(fileId);
    }
  };

  // Open file picker
  const openFilePicker = () => {
    if (!disabled) {
      fileInputRef.current?.click();
    }
  };

  // Check if storage is ready
  if (!storageSetupComplete) {
    return (
      <div
        className={`p-4 rounded-lg border-2 border-dashed text-center ${className}`}
        style={{
          borderColor: colors.semantic.warning,
          backgroundColor: `${colors.semantic.warning}10`
        }}
      >
        <AlertCircle className="w-8 h-8 mx-auto mb-2" style={{ color: colors.semantic.warning }} />
        <p className="text-sm font-medium" style={{ color: colors.utility.primaryText }}>
          Storage not configured
        </p>
        <p className="text-xs mt-1" style={{ color: colors.utility.secondaryText }}>
          Please set up storage in Settings first
        </p>
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Label */}
      {label && (
        <label className="block text-sm font-medium mb-2" style={{ color: colors.utility.primaryText }}>
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      {/* Upload Area */}
      <div
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={openFilePicker}
        className={`
          border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-opacity-80'}
        `}
        style={{
          borderColor: isDragging
            ? colors.brand.primary
            : error
              ? colors.semantic.error
              : (isDarkMode ? colors.utility.secondaryText : '#D1D5DB'),
          backgroundColor: isDragging
            ? `${colors.brand.primary}10`
            : (isDarkMode ? colors.utility.secondaryBackground : '#FAFAFA'),
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={acceptString}
          multiple={multiple}
          onChange={(e) => handleFileSelect(e.target.files)}
          className="hidden"
          disabled={disabled}
        />

        {/* Upload Icon/Progress */}
        {isSubmitting || uploadProgress !== null ? (
          <div className="flex flex-col items-center">
            {uploadProgress !== null && uploadProgress < 100 ? (
              <Loader2 className="w-10 h-10 animate-spin mb-2" style={{ color: colors.brand.primary }} />
            ) : (
              <CheckCircle className="w-10 h-10 mb-2" style={{ color: colors.semantic.success }} />
            )}
            <p className="text-sm font-medium" style={{ color: colors.utility.primaryText }}>
              {uploadProgress !== null && uploadProgress < 100 ? 'Uploading...' : 'Upload complete!'}
            </p>
          </div>
        ) : (
          <>
            <Upload className="w-10 h-10 mx-auto mb-2" style={{ color: colors.utility.secondaryText }} />
            <p className="text-sm font-medium" style={{ color: colors.utility.primaryText }}>
              {isDragging ? 'Drop file here' : 'Drag and drop or click to upload'}
            </p>
            <p className="text-xs mt-1" style={{ color: colors.utility.secondaryText }}>
              {hint || `Max ${formatFileSize(maxFileSize)}`}
            </p>
          </>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="mt-2 flex items-center gap-2 text-sm" style={{ color: colors.semantic.error }}>
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      {/* Uploaded Files Preview */}
      {showPreview && uploadedFiles.length > 0 && (
        <div className="mt-4 space-y-2">
          <p className="text-xs font-medium" style={{ color: colors.utility.secondaryText }}>
            Uploaded Files
          </p>
          <div className="flex flex-wrap gap-2">
            {uploadedFiles.map((file) => {
              const FileIcon = getFileIcon(file.mime_type);
              const isImage = file.mime_type.startsWith('image/');

              return (
                <div
                  key={file.id}
                  className={`relative rounded-lg overflow-hidden border ${previewSizeClasses[previewSize]}`}
                  style={{
                    borderColor: isDarkMode ? colors.utility.secondaryBackground : '#E5E7EB',
                    backgroundColor: isDarkMode ? colors.utility.secondaryBackground : '#F9FAFB'
                  }}
                >
                  {isImage && file.download_url ? (
                    <img
                      src={file.download_url}
                      alt={file.file_name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center p-2">
                      <FileIcon className="w-6 h-6 mb-1" style={{ color: colors.utility.secondaryText }} />
                      <span
                        className="text-xs truncate max-w-full px-1"
                        style={{ color: colors.utility.primaryText }}
                      >
                        {file.file_name}
                      </span>
                    </div>
                  )}

                  {/* Remove Button */}
                  {!disabled && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveFile(file.id);
                      }}
                      className="absolute top-1 right-1 p-1 rounded-full bg-red-500 text-white hover:bg-red-600 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default FileUploader;
