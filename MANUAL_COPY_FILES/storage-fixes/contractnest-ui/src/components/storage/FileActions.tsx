// src/components/storage/FileActions.tsx
import React, { useState } from 'react';
import { Download, Trash2, Eye } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

interface FileActionsProps {
  file: {
    id: string;
    file_name: string;
    download_url: string;
    file_type: string;
  };
  onDelete: () => void;
  onCopyLink?: () => void;
  showPreview?: boolean;
  showShare?: boolean;
  className?: string;
}

const FileActions: React.FC<FileActionsProps> = ({
  file,
  onDelete,
  showPreview = true,
  className = ''
}) => {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const { isDarkMode, currentTheme } = useTheme();

  // Get theme colors
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  // Handle download - uses fetch + blob for cross-origin Firebase URLs
  const handleDownload = async () => {
    try {
      // Fetch the file as blob to handle cross-origin downloads
      const response = await fetch(file.download_url);
      const blob = await response.blob();

      // Create a blob URL and trigger download
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = file.file_name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Clean up the blob URL
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error('Download failed:', error);
      // Fallback: open in new tab if blob download fails
      window.open(file.download_url, '_blank');
    }
  };

  // Handle preview
  const handlePreview = () => {
    window.open(file.download_url, '_blank');
  };

  // Handle delete click
  const handleDeleteClick = () => {
    setConfirmDelete(true);
  };

  // Handle confirmed delete
  const handleConfirmedDelete = () => {
    onDelete();
    setConfirmDelete(false);
  };

  // Cancel delete
  const handleCancelDelete = () => {
    setConfirmDelete(false);
  };

  // Determine if file is previewable
  const isPreviewable = () => {
    const previewableTypes = ['jpg', 'jpeg', 'png', 'gif', 'pdf'];
    const extension = file.file_type.toLowerCase();
    return previewableTypes.includes(extension);
  };

  if (confirmDelete) {
    return (
      <div className="flex space-x-2 items-center">
        <button
          onClick={handleConfirmedDelete}
          className="text-xs font-medium transition-colors hover:opacity-80"
          style={{ color: colors.semantic.error }}
        >
          Confirm
        </button>
        <span style={{ color: colors.utility.secondaryText }}>|</span>
        <button
          onClick={handleCancelDelete}
          className="text-xs transition-colors hover:opacity-80"
          style={{ color: colors.utility.secondaryText }}
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      {/* Simple Actions Row - Download, Preview (if applicable), Delete */}
      <div className="flex space-x-3">
        <button
          onClick={handleDownload}
          className="transition-colors hover:opacity-80"
          style={{ color: colors.brand.primary }}
          title="Download file"
        >
          <Download className="w-5 h-5" />
        </button>

        {showPreview && isPreviewable() && (
          <button
            onClick={handlePreview}
            className="transition-colors hover:opacity-80"
            style={{ color: colors.brand.primary }}
            title="Preview file"
          >
            <Eye className="w-5 h-5" />
          </button>
        )}

        <button
          onClick={handleDeleteClick}
          className="transition-colors hover:opacity-80"
          style={{ color: colors.semantic.error }}
          title="Delete file"
        >
          <Trash2 className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

export default FileActions;
