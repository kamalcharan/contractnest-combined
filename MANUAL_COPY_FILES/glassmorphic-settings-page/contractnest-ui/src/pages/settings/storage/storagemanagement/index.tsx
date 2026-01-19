// src/pages/settings/storage/storagemanagement/index.tsx
// Glassmorphic Design
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Upload, FileText, Plus, Search, Filter, File, Files, HardDrive, Loader2 } from 'lucide-react';
import { useStorageManagement } from '@/hooks/useStorageManagement';
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
  
  // Show loading - Glassmorphic
  if (isLoading) {
    return (
      <div
        className="min-h-screen p-6 transition-colors"
        style={{
          background: isDarkMode
            ? 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)'
            : 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 50%, #f8fafc 100%)'
        }}
      >
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin" style={{ color: colors.brand.primary }} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="rounded-2xl h-32 animate-pulse"
                style={{
                  background: isDarkMode ? 'rgba(30, 41, 59, 0.6)' : 'rgba(255, 255, 255, 0.7)',
                  backdropFilter: 'blur(12px)',
                  border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'}`
                }}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen p-6 transition-colors"
      style={{
        background: isDarkMode
          ? 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)'
          : 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 50%, #f8fafc 100%)'
      }}
    >
      <div className="max-w-6xl mx-auto">
        {/* Glassmorphic Header */}
        <div
          className="rounded-2xl border mb-6 overflow-hidden"
          style={{
            background: isDarkMode ? 'rgba(30, 41, 59, 0.6)' : 'rgba(255, 255, 255, 0.7)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'}`,
            boxShadow: '0 4px 24px -4px rgba(0,0,0,0.1)'
          }}
        >
          <div className="p-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={handleBack}
                className="p-2 rounded-xl transition-all hover:scale-105"
                style={{
                  background: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                }}
              >
                <ArrowLeft className="h-5 w-5" style={{ color: colors.utility.secondaryText }} />
              </button>
              <div
                className="p-3 rounded-xl"
                style={{
                  background: `linear-gradient(135deg, ${colors.brand.primary}20 0%, ${colors.brand.secondary || colors.brand.primary}15 100%)`
                }}
              >
                <HardDrive className="h-6 w-6" style={{ color: colors.brand.primary }} />
              </div>
              <div>
                <h1 className="text-2xl font-bold" style={{ color: colors.utility.primaryText }}>
                  Storage Management
                </h1>
                <p className="text-sm mt-0.5" style={{ color: colors.utility.secondaryText }}>
                  Manage your files and storage
                </p>
              </div>
            </div>

            {/* Upload Button */}
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
                className="w-56"
                style={{
                  backgroundColor: isDarkMode ? 'rgba(30, 41, 59, 0.95)' : 'rgba(255, 255, 255, 0.95)',
                  backdropFilter: 'blur(12px)',
                  borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'
                }}
              >
                <DropdownMenuItem
                  onClick={() => { setMultipleUploadMode(false); setShowUploader(true); }}
                  className="cursor-pointer"
                >
                  <File className="w-4 h-4 mr-2" style={{ color: colors.brand.primary }} />
                  <div>
                    <div className="font-medium" style={{ color: colors.utility.primaryText }}>Single File</div>
                    <div className="text-xs" style={{ color: colors.utility.secondaryText }}>Upload one file at a time</div>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => { setMultipleUploadMode(true); setShowUploader(true); }}
                  className="cursor-pointer"
                >
                  <Files className="w-4 h-4 mr-2" style={{ color: colors.brand.primary }} />
                  <div>
                    <div className="font-medium" style={{ color: colors.utility.primaryText }}>Multiple Files</div>
                    <div className="text-xs" style={{ color: colors.utility.secondaryText }}>Upload up to 10 files at once</div>
                  </div>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
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
      
        {/* Category Cards - Glassmorphic Section */}
        <div
          className="rounded-2xl border mb-6 overflow-hidden"
          style={{
            background: isDarkMode ? 'rgba(30, 41, 59, 0.6)' : 'rgba(255, 255, 255, 0.7)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'}`,
            boxShadow: '0 4px 24px -4px rgba(0,0,0,0.1)'
          }}
        >
          <div
            className="px-6 py-4 border-b"
            style={{
              backgroundColor: isDarkMode ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
              borderBottomColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'
            }}
          >
            <h2 className="text-lg font-semibold" style={{ color: colors.utility.primaryText }}>
              Storage Categories
            </h2>
          </div>
          <div className="p-6">
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
        </div>

        {/* Recent Files - Glassmorphic Section */}
        <div
          className="rounded-2xl border overflow-hidden"
          style={{
            background: isDarkMode ? 'rgba(30, 41, 59, 0.6)' : 'rgba(255, 255, 255, 0.7)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'}`,
            boxShadow: '0 4px 24px -4px rgba(0,0,0,0.1)'
          }}
        >
          <div
            className="px-6 py-4 border-b flex items-center justify-between"
            style={{
              backgroundColor: isDarkMode ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
              borderBottomColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'
            }}
          >
            <h2 className="text-lg font-semibold" style={{ color: colors.utility.primaryText }}>
              Recent Files
            </h2>
            <div className="relative">
              <Search
                className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4"
                style={{ color: colors.utility.secondaryText }}
              />
              <input
                type="text"
                placeholder="Search files..."
                className="pl-10 pr-4 py-2 rounded-xl focus:outline-none focus:ring-2 transition-colors"
                style={{
                  backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                  color: colors.utility.primaryText,
                  '--tw-ring-color': colors.brand.primary
                } as React.CSSProperties}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <div className="p-6">
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
      </div>
    </div>
  );
};

export default StorageManagementPage;