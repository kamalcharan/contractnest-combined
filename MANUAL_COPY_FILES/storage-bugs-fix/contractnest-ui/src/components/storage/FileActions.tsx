// src/components/storage/FileActions.tsx
import React, { useState } from 'react';
import { Download, Trash2, Eye, MoreHorizontal, FileText, Copy, Share2 } from 'lucide-react';
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
  onCopyLink,
  showPreview = true,
  showShare = false,
  className = ''
}) => {
  const [showDropdown, setShowDropdown] = useState(false);
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

    // Close dropdown if open
    setShowDropdown(false);
  };
  
  // Handle preview
  const handlePreview = () => {
    window.open(file.download_url, '_blank');
    setShowDropdown(false);
  };
  
  // Handle copy link
  const handleCopyLink = () => {
    navigator.clipboard.writeText(file.download_url)
      .then(() => {
        // You could show a toast notification here
        console.log('Link copied to clipboard');
        if (onCopyLink) onCopyLink();
      })
      .catch(err => {
        console.error('Failed to copy link: ', err);
      });
    
    setShowDropdown(false);
  };
  
  // Handle delete click
  const handleDeleteClick = () => {
    setConfirmDelete(true);
    setShowDropdown(false);
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
  
  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = () => {
      setShowDropdown(false);
    };
    
    if (showDropdown) {
      document.addEventListener('click', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [showDropdown]);
  
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
      {/* Simple Actions Row */}
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
        
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowDropdown(!showDropdown);
          }}
          className="transition-colors hover:opacity-80"
          style={{ color: colors.utility.secondaryText }}
          title="More options"
        >
          <MoreHorizontal className="w-5 h-5" />
        </button>
      </div>
      
      {/* Dropdown Menu */}
      {showDropdown && (
        <div
          className="absolute right-0 mt-1 py-2 w-48 rounded-md shadow-lg border z-50 transition-colors"
          style={{
            backgroundColor: colors.utility.secondaryBackground,
            borderColor: `${colors.utility.primaryText}20`
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div 
            className="px-3 py-1 text-xs font-semibold uppercase tracking-wide border-b mb-1 transition-colors"
            style={{
              color: colors.utility.secondaryText,
              borderColor: `${colors.utility.primaryText}20`
            }}
          >
            Actions
          </div>
          
          <button
            onClick={handleDownload}
            className="w-full px-4 py-2 text-sm text-left flex items-center transition-all duration-200 hover:opacity-80"
            style={{ 
              color: colors.utility.primaryText,
              backgroundColor: 'transparent'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = `${colors.utility.primaryText}10`;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <Download className="w-4 h-4 mr-2" />
            Download
          </button>
          
          {isPreviewable() && (
            <button
              onClick={handlePreview}
              className="w-full px-4 py-2 text-sm text-left flex items-center transition-all duration-200 hover:opacity-80"
              style={{ 
                color: colors.utility.primaryText,
                backgroundColor: 'transparent'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = `${colors.utility.primaryText}10`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <Eye className="w-4 h-4 mr-2" />
              Preview
            </button>
          )}
          
          <button
            onClick={handleCopyLink}
            className="w-full px-4 py-2 text-sm text-left flex items-center transition-all duration-200 hover:opacity-80"
            style={{ 
              color: colors.utility.primaryText,
              backgroundColor: 'transparent'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = `${colors.utility.primaryText}10`;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <Copy className="w-4 h-4 mr-2" />
            Copy Link
          </button>
          
          {showShare && (
            <button
              onClick={() => alert('Share functionality coming soon')}
              className="w-full px-4 py-2 text-sm text-left flex items-center transition-all duration-200 hover:opacity-80"
              style={{ 
                color: colors.utility.primaryText,
                backgroundColor: 'transparent'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = `${colors.utility.primaryText}10`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <Share2 className="w-4 h-4 mr-2" />
              Share
            </button>
          )}
          
          <div 
            className="border-t my-1 transition-colors"
            style={{ borderColor: `${colors.utility.primaryText}20` }}
          />
          
          <button
            onClick={handleDeleteClick}
            className="w-full px-4 py-2 text-sm text-left flex items-center transition-all duration-200 hover:opacity-80"
            style={{ 
              color: colors.semantic.error,
              backgroundColor: 'transparent'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = `${colors.semantic.error}10`;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete
          </button>
        </div>
      )}
    </div>
  );
};

export default FileActions;