// src/pages/settings/storage/storagemanagement/index.tsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Upload, FileText, Plus, Search, Filter, File, Files } from 'lucide-react';
import { useStorageManagement } from '@/hooks/useStorageManagement';
import { VaNiLoader } from '@/components/common/loaders';
import StorageStats from '@/components/storage/StorageStats';
import CategoryCard from '@/components/storage/CategoryCard';
import FileList from '@/components/storage/FileList';
import FileUploader from '@/components/storage/FileUploader';
import { analyticsService } from '@/services/analytics.service';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/Button';
import { useTheme } from '@/contexts/ThemeContext';

const StorageManagementPage: React.FC = () => {
  const navigate = useNavigate();
  const { isDarkMode, currentTheme } = useTheme();
  
  // Get theme colors
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;
  
  const {
    isLoading,
    isSubmitting,
    storageSetupComplete,
    storageStats,
    files,
    categoryFiles,
    fetchFiles,
    uploadFile,
    uploadMultipleFiles,
    deleteFile,
    deleteMultipleFiles,
    getStorageCategories
  } = useStorageManagement();
  
  const [showUploader, setShowUploader] = useState(false);
  const [selectedUploadCategory, setSelectedUploadCategory] = useState<string>('documents');
  const [searchTerm, setSearchTerm] = useState('');
  const [multipleUploadMode, setMultipleUploadMode] = useState(false);
  
  // Track page view
  useEffect(() => {
    analyticsService.trackPageView('settings/storage/management', 'Storage Management');
  }, []);
  
  // Redirect if storage not setup
  useEffect(() => {
    if (!isLoading && !storageSetupComplete) {
      navigate('/settings/storage/storagesetup');
    }
  }, [storageSetupComplete, isLoading, navigate]);
  
  // Handle back button
  const handleBack = () => {
    navigate('/settings');
  };
  
  // Handle category click
  const handleCategoryClick = (categoryId: string) => {
    navigate(`/settings/storage/categoryfiles/${categoryId}`);
  };
  
  // Handle single file upload
  const handleSingleFileUpload = async (file: File) => {
    const uploaded = await uploadFile(file, selectedUploadCategory);
    if (uploaded) {
      setShowUploader(false);
      setMultipleUploadMode(false);
    }
  };
  
  // Handle multiple file upload
  const handleMultipleFileUpload = async (files: File[]) => {
    const success = await uploadMultipleFiles(files, selectedUploadCategory);
    if (success) {
      setShowUploader(false);
      setMultipleUploadMode(false);
    }
  };
  
  // Combined upload handler
  const handleFileUpload = async (filesOrFile: File | File[]) => {
    if (Array.isArray(filesOrFile)) {
      await handleMultipleFileUpload(filesOrFile);
    } else {
      await handleSingleFileUpload(filesOrFile);
    }
  };
  
  // Handle batch delete
  const handleBatchDelete = async (fileIds: string[]) => {
    await deleteMultipleFiles(fileIds);
  };
  
  // Get categories
  const categories = getStorageCategories();
  
  // Get selected category for uploader
  const selectedCategory = categories.find(c => c.id === selectedUploadCategory);
  
  // Filter files by search term
  const filteredFiles = files.filter(file => 
    file.file_name.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  // Calculate category sizes
  const getCategorySize = (categoryId: string) => {
    const categoryFileList = categoryFiles[categoryId] || [];
    return categoryFileList.reduce((total, file) => total + file.file_size, 0);
  };
  
  // Show loading
  if (isLoading) {
    return (
      <div
        className="p-6 transition-colors duration-200 min-h-screen"
        style={{
          background: isDarkMode
            ? `linear-gradient(to bottom right, ${colors.utility.primaryBackground}, ${colors.utility.secondaryBackground})`
            : `linear-gradient(to bottom right, ${colors.utility.primaryBackground}, ${colors.utility.secondaryBackground})`
        }}
      >
        <div className="flex justify-center py-12">
          <VaNiLoader size="md" message="Loading Storage..." />
        </div>
      </div>
    );
  }
  
  return (
    <div 
      className="p-6 transition-colors duration-200 min-h-screen"
      style={{
        background: isDarkMode 
          ? `linear-gradient(to bottom right, ${colors.utility.primaryBackground}, ${colors.utility.secondaryBackground})`
          : `linear-gradient(to bottom right, ${colors.utility.primaryBackground}, ${colors.utility.secondaryBackground})`
      }}
    >
      {/* Page Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center">
          <button 
            onClick={handleBack} 
            className="mr-4 p-2 rounded-full transition-colors hover:opacity-80"
            style={{ backgroundColor: colors.utility.secondaryBackground + '80' }}
          >
            <ArrowLeft 
              className="h-5 w-5 transition-colors" 
              style={{ color: colors.utility.secondaryText }}
            />
          </button>
          <div>
            <h1 
              className="text-2xl font-bold transition-colors"
              style={{ color: colors.utility.primaryText }}
            >
              Storage Management
            </h1>
            <p 
              className="transition-colors"
              style={{ color: colors.utility.secondaryText }}
            >
              Manage your files and storage
            </p>
          </div>
        </div>
        
        {/* Upload Button with Dropdown using existing component */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              disabled={isSubmitting}
              className="transition-colors hover:opacity-90"
              style={{
                background: `linear-gradient(to right, ${colors.brand.primary}, ${colors.brand.secondary})`,
                color: '#FFFFFF',
                borderColor: 'transparent'
              }}
            >
              <Upload className="w-4 h-4 mr-2" />
              Upload File
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent 
            align="end" 
            className="w-56 transition-colors"
            style={{
              backgroundColor: colors.utility.secondaryBackground,
              borderColor: colors.utility.primaryText + '20'
            }}
          >
            <DropdownMenuItem 
              onClick={() => {
                setMultipleUploadMode(false);
                setShowUploader(true);
              }}
              className="transition-colors hover:opacity-80"
              style={{ backgroundColor: colors.utility.primaryBackground + '50' }}
            >
              <File className="w-4 h-4 mr-2" />
              <div>
                <div 
                  className="font-medium transition-colors"
                  style={{ color: colors.utility.primaryText }}
                >
                  Single File
                </div>
                <div 
                  className="text-xs transition-colors"
                  style={{ color: colors.utility.secondaryText }}
                >
                  Upload one file at a time
                </div>
              </div>
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => {
                setMultipleUploadMode(true);
                setShowUploader(true);
              }}
              className="transition-colors hover:opacity-80"
              style={{ backgroundColor: colors.utility.primaryBackground + '50' }}
            >
              <Files className="w-4 h-4 mr-2" />
              <div>
                <div 
                  className="font-medium transition-colors"
                  style={{ color: colors.utility.primaryText }}
                >
                  Multiple Files
                </div>
                <div 
                  className="text-xs transition-colors"
                  style={{ color: colors.utility.secondaryText }}
                >
                  Upload up to 10 files at once
                </div>
              </div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      
      {/* File Uploader Modal */}
      {showUploader && selectedCategory && (
        <FileUploader
          category={selectedCategory}
          onUpload={handleFileUpload}
          onCancel={() => {
            setShowUploader(false);
            setMultipleUploadMode(false);
          }}
          isUploading={isSubmitting}
         // multiple={multipleUploadMode}
        />
      )}
      
      {/* Storage Stats */}
      {storageStats && (
        <StorageStats
          totalQuota={storageStats.quota}
          usedSpace={storageStats.used}
          availableSpace={storageStats.available}
          usagePercentage={storageStats.usagePercentage}
          totalFiles={storageStats.totalFiles}
          className="mb-6"
        />
      )}
      
      {/* Category Cards */}
      <div className="mb-6">
        <h2 
          className="text-lg font-medium mb-4 transition-colors"
          style={{ color: colors.utility.primaryText }}
        >
          Storage Categories
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {categories.map(category => {
            const categoryFilesList = categoryFiles[category.id] || [];
            const totalSize = getCategorySize(category.id);
            
            return (
              <CategoryCard
                key={category.id}
                category={category}
                fileCount={categoryFilesList.length}
                totalSize={totalSize}
                onClick={() => handleCategoryClick(category.id)}
              />
            );
          })}
        </div>
      </div>
      
      {/* Recent Files */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 
            className="text-lg font-medium transition-colors"
            style={{ color: colors.utility.primaryText }}
          >
            Recent Files
          </h2>
          <div className="relative">
            <Search 
              className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 transition-colors" 
              style={{ color: colors.utility.secondaryText }}
            />
            <input
              type="text"
              placeholder="Search files..."
              className="pl-10 pr-4 py-2 border rounded-md focus:outline-none focus:ring-1 transition-colors"
              style={{
                borderColor: colors.utility.primaryText + '40',
                backgroundColor: colors.utility.primaryBackground,
                color: colors.utility.primaryText,
                '--tw-ring-color': colors.brand.primary
              } as React.CSSProperties}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        
        <FileList
          files={searchTerm ? filteredFiles : files.slice(0, 10)}
          onDelete={deleteFile}
          onBatchDelete={handleBatchDelete}
          emptyMessage="No files uploaded yet"
          isLoading={false}
          enableBatchOperations={true}
        />
      </div>
    </div>
  );
};

export default StorageManagementPage;