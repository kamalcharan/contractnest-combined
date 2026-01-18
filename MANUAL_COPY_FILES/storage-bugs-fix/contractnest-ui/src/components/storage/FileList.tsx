// src/components/storage/FileList.tsx
import React, { useState } from 'react';
import { File, FileText, Image, Video, Download, Trash2, Eye, Calendar, HardDrive, Search, SortDesc, SortAsc, CheckSquare, Square, Loader2 } from 'lucide-react';
import { formatFileSize } from '@/utils/constants/storageConstants';
import FileActions from './FileActions';
import { useTheme } from '@/contexts/ThemeContext';
import { VaNiLoader } from '@/components/common/loaders';

export interface FileItem {
  id: string;
  file_name: string;
  file_size: number;
  file_type: string;
  file_category: string;
  download_url: string;
  created_at: string;
  updated_at: string;
}

interface FileListProps {
  files: FileItem[];
  onDelete: (fileId: string) => void;
  onBatchDelete?: (fileIds: string[]) => Promise<void>;
  emptyMessage?: string;
  isLoading?: boolean;
  className?: string;
  enableBatchOperations?: boolean;
  hideSearch?: boolean; // Hide internal search when parent provides filtered files
  style?: React.CSSProperties;
}

type SortField = 'file_name' | 'file_size' | 'file_type' | 'created_at';
type SortDirection = 'asc' | 'desc';

const FileList: React.FC<FileListProps> = ({
  files,
  onDelete,
  onBatchDelete,
  emptyMessage = 'No files found',
  isLoading = false,
  className = '',
  enableBatchOperations = false,
  hideSearch = false,
  style
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [isBatchDeleting, setIsBatchDeleting] = useState(false);
  const { isDarkMode, currentTheme } = useTheme();
  
  // Get theme colors
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;
  
  // Get file icon based on type
  const getFileIcon = (fileType: string) => {
    const extension = fileType.toLowerCase();
    
    if (['jpg', 'jpeg', 'png', 'gif', 'svg'].includes(extension)) {
      return <Image className="w-5 h-5" style={{ color: colors.brand.primary }} />;
    } else if (['mp4', 'mov', 'avi', 'webm'].includes(extension)) {
      return <Video className="w-5 h-5" style={{ color: colors.brand.tertiary }} />;
    } else if (['pdf'].includes(extension)) {
      return <FileText className="w-5 h-5" style={{ color: colors.semantic.error }} />;
    } else if (['doc', 'docx'].includes(extension)) {
      return <FileText className="w-5 h-5" style={{ color: colors.brand.secondary }} />;
    } else {
      return <File className="w-5 h-5" style={{ color: colors.utility.secondaryText }} />;
    }
  };
  
  // Toggle sort field and direction
  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };
  
  // Get sorted and filtered files
  const getSortedFiles = () => {
    const filtered = files.filter(file => 
      file.file_name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    return [...filtered].sort((a, b) => {
      let comparison = 0;
      
      if (sortField === 'file_name') {
        comparison = a.file_name.localeCompare(b.file_name);
      } else if (sortField === 'file_size') {
        comparison = a.file_size - b.file_size;
      } else if (sortField === 'file_type') {
        comparison = a.file_type.localeCompare(b.file_type);
      } else if (sortField === 'created_at') {
        comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      }
      
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  };
  
  const sortedFiles = getSortedFiles();
  
  // Render sort icon
  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) return null;
    
    return sortDirection === 'asc' 
      ? <SortAsc className="w-4 h-4 inline ml-1" style={{ color: colors.brand.primary }} />
      : <SortDesc className="w-4 h-4 inline ml-1" style={{ color: colors.brand.primary }} />;
  };
  
  // Toggle file selection
  const toggleFileSelection = (fileId: string) => {
    const newSelection = new Set(selectedFiles);
    if (newSelection.has(fileId)) {
      newSelection.delete(fileId);
    } else {
      newSelection.add(fileId);
    }
    setSelectedFiles(newSelection);
  };
  
  // Toggle all files selection
  const toggleAllSelection = () => {
    if (selectedFiles.size === sortedFiles.length) {
      setSelectedFiles(new Set());
    } else {
      setSelectedFiles(new Set(sortedFiles.map(f => f.id)));
    }
  };
  
  // Handle batch delete
  const handleBatchDelete = async () => {
    if (!onBatchDelete || selectedFiles.size === 0) return;
    
    const confirmed = window.confirm(
      `Are you sure you want to delete ${selectedFiles.size} files? This action cannot be undone.`
    );
    
    if (!confirmed) return;
    
    setIsBatchDeleting(true);
    try {
      await onBatchDelete(Array.from(selectedFiles));
      setSelectedFiles(new Set());
    } finally {
      setIsBatchDeleting(false);
    }
  };
  
  if (isLoading) {
    return (
      <div
        className={`border rounded-lg transition-colors ${className}`}
        style={{
          backgroundColor: colors.utility.secondaryBackground,
          borderColor: `${colors.utility.primaryText}20`,
          ...style
        }}
      >
        <div className="flex justify-center py-12">
          <VaNiLoader size="md" text="Loading files..." />
        </div>
      </div>
    );
  }
  
  return (
    <div
      className={`border rounded-lg transition-colors ${className}`}
      style={{
        backgroundColor: colors.utility.secondaryBackground,
        borderColor: `${colors.utility.primaryText}20`,
        ...style
      }}
    >
      {/* Search Bar - hidden when parent provides filtered files */}
      {!hideSearch && (
        <div
          className="p-4 border-b transition-colors"
          style={{ borderColor: `${colors.utility.primaryText}20` }}
        >
          <div className="flex items-center justify-between gap-4">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search
                  className="h-4 w-4 transition-colors"
                  style={{ color: colors.utility.secondaryText }}
                />
              </div>
              <input
                type="text"
                placeholder="Search files..."
                className="pl-10 w-full p-2 rounded-md border focus:outline-none focus:ring-2 transition-colors"
                style={{
                  borderColor: `${colors.utility.primaryText}40`,
                  backgroundColor: colors.utility.primaryBackground,
                  color: colors.utility.primaryText,
                  '--tw-ring-color': colors.brand.primary
                } as React.CSSProperties}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {enableBatchOperations && selectedFiles.size > 0 && (
              <button
                onClick={handleBatchDelete}
                disabled={isBatchDeleting}
                className="px-4 py-2 text-white rounded-md transition-all duration-200 flex items-center disabled:opacity-50 hover:opacity-80"
                style={{ backgroundColor: colors.semantic.error }}
              >
                {isBatchDeleting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete {selectedFiles.size} Files
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      )}
      
      {sortedFiles.length === 0 ? (
        <div className="text-center py-12">
          <div 
            className="mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4 transition-colors"
            style={{ backgroundColor: `${colors.utility.primaryText}10` }}
          >
            <File 
              className="w-8 h-8 transition-colors"
              style={{ color: colors.utility.secondaryText }}
            />
          </div>
          <h3 
            className="text-lg font-medium mb-2 transition-colors"
            style={{ color: colors.utility.primaryText }}
          >
            No files found
          </h3>
          <p 
            className="transition-colors"
            style={{ color: colors.utility.secondaryText }}
          >
            {searchTerm ? `No files match your search "${searchTerm}"` : emptyMessage}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead 
              style={{ backgroundColor: `${colors.utility.primaryText}05` }}
            >
              <tr>
                {enableBatchOperations && (
                  <th className="px-4 py-3 text-left">
                    <button
                      onClick={toggleAllSelection}
                      className="p-1 rounded transition-all duration-200 hover:opacity-80"
                      style={{ 
                        backgroundColor: `${colors.utility.primaryText}10`,
                        color: colors.utility.primaryText
                      }}
                    >
                      {selectedFiles.size === sortedFiles.length ? (
                        <CheckSquare className="w-4 h-4" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>
                  </th>
                )}
                <th 
                  className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider cursor-pointer transition-colors"
                  style={{ color: colors.utility.secondaryText }}
                  onClick={() => toggleSort('file_name')}
                >
                  <span className="flex items-center">
                    File {renderSortIcon('file_name')}
                  </span>
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider cursor-pointer transition-colors"
                  style={{ color: colors.utility.secondaryText }}
                  onClick={() => toggleSort('file_type')}
                >
                  <span className="flex items-center">
                    Type {renderSortIcon('file_type')}
                  </span>
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider cursor-pointer transition-colors"
                  style={{ color: colors.utility.secondaryText }}
                  onClick={() => toggleSort('file_size')}
                >
                  <span className="flex items-center">
                    Size {renderSortIcon('file_size')}
                  </span>
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider cursor-pointer transition-colors"
                  style={{ color: colors.utility.secondaryText }}
                  onClick={() => toggleSort('created_at')}
                >
                  <span className="flex items-center">
                    Uploaded {renderSortIcon('created_at')}
                  </span>
                </th>
                <th 
                  className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider transition-colors"
                  style={{ color: colors.utility.secondaryText }}
                >
                  Actions
                </th>
              </tr>
            </thead>
            <tbody 
              className="divide-y transition-colors"
              style={{ '--tw-divide-opacity': '0.2', backgroundColor: 'transparent' }}
            >
              {sortedFiles.map((file) => (
                <tr 
                  key={file.id} 
                  className="transition-all duration-200 hover:opacity-80"
                  style={{ backgroundColor: 'transparent' }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = `${colors.utility.primaryText}05`;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  {enableBatchOperations && (
                    <td className="px-4 py-4">
                      <button
                        onClick={() => toggleFileSelection(file.id)}
                        className="p-1 rounded transition-all duration-200 hover:opacity-80"
                        style={{ 
                          backgroundColor: `${colors.utility.primaryText}10`,
                          color: colors.utility.primaryText
                        }}
                      >
                        {selectedFiles.has(file.id) ? (
                          <CheckSquare className="w-4 h-4" />
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                      </button>
                    </td>
                  )}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 mr-3">
                        {getFileIcon(file.file_type)}
                      </div>
                      <div className="truncate max-w-xs">
                        <div 
                          className="text-sm font-medium transition-colors"
                          style={{ color: colors.utility.primaryText }}
                        >
                          {file.file_name}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td 
                    className="px-6 py-4 whitespace-nowrap text-sm transition-colors"
                    style={{ color: colors.utility.primaryText }}
                  >
                    {file.file_type.toUpperCase()}
                  </td>
                  <td 
                    className="px-6 py-4 whitespace-nowrap text-sm transition-colors"
                    style={{ color: colors.utility.primaryText }}
                  >
                    {formatFileSize(file.file_size)}
                  </td>
                  <td 
                    className="px-6 py-4 whitespace-nowrap text-sm transition-colors"
                    style={{ color: colors.utility.primaryText }}
                  >
                    {new Date(file.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                    <FileActions 
                      file={file}
                      onDelete={() => onDelete(file.id)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      
      {/* File Count Footer */}
      <div 
        className="p-3 border-t text-sm flex items-center justify-between transition-colors"
        style={{
          borderColor: `${colors.utility.primaryText}20`,
          color: colors.utility.secondaryText
        }}
      >
        <div className="flex items-center">
          <HardDrive className="w-4 h-4 mr-2" />
          <span>
            {sortedFiles.length} {sortedFiles.length === 1 ? 'file' : 'files'}
            {searchTerm && ` matching "${searchTerm}"`}
          </span>
        </div>
        {enableBatchOperations && selectedFiles.size > 0 && (
          <span>{selectedFiles.size} selected</span>
        )}
      </div>
    </div>
  );
};

export default FileList;