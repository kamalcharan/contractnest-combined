// src/hooks/useStorageManagement.ts
import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { vaniToast } from '@/components/common/toast';
import api from '@/services/api';
import { API_ENDPOINTS } from '@/services/serviceURLs';
import { 
  STORAGE_CATEGORIES, 
  formatFileSize,
  getFileExtension,
  isFileTypeAllowed,
  isFileSizeAllowed
} from '@/utils/constants/storageConstants';

// Types
export interface StorageStats {
  storageSetupComplete: boolean;
  quota: number;
  used: number;
  available: number;
  usagePercentage: number;
  totalFiles: number;
  categories: CategoryStats[];
}

export interface CategoryStats {
  id: string;
  name: string;
  count: number;
}

export interface StorageFile {
  id: string;
  tenant_id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  file_type: string;
  file_category: string;
  mime_type: string;
  download_url: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
  metadata?: any;
}

// Hook implementation
export const useStorageManagement = () => {
  const { currentTenant, setCurrentTenant, isLive } = useAuth();
  
  // States
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [storageStats, setStorageStats] = useState<StorageStats | null>(null);
  const [storageSetupComplete, setStorageSetupComplete] = useState<boolean>(false);
  const [files, setFiles] = useState<StorageFile[]>([]);
  const [categoryFiles, setCategoryFiles] = useState<Record<string, StorageFile[]>>({});
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [initialLoadComplete, setInitialLoadComplete] = useState<boolean>(false);
  
  // Refs
  const isMountedRef = useRef<boolean>(true);
  const loadingRef = useRef<boolean>(false);
  
  // Helper function to ensure headers are set
  const ensureHeaders = useCallback(() => {
    if (currentTenant?.id) {
      api.defaults.headers.common['x-tenant-id'] = currentTenant.id;
    }
    
    if (!api.defaults.headers.common['Authorization']) {
      console.warn('Authorization header not set in api defaults');
    }
  }, [currentTenant]);
  
  // Combined initial load function to prevent multiple reloads
  const loadInitialData = useCallback(async () => {
    // Prevent duplicate loads
    if (loadingRef.current || !currentTenant?.id || initialLoadComplete) {
      return;
    }
    
    loadingRef.current = true;
    ensureHeaders();
    
    setIsLoading(true);
    setError(null);
    
    try {
      console.log(`Loading storage data for ${isLive ? 'Live' : 'Test'} environment`);
      
      // Fetch storage stats
      const statsResponse = await api.get(API_ENDPOINTS.STORAGE.STATS);
      
      if (!isMountedRef.current) return;
      
      const statsData = statsResponse.data;
      
      if (statsData.storageSetupComplete === false) {
        // Storage not setup
        setStorageSetupComplete(false);
        setStorageStats(null);
        setFiles([]);
        setCategoryFiles({});
      } else {
        // Storage is setup
        setStorageStats(statsData);
        setStorageSetupComplete(true);
        
        // Update tenant in context if needed
        if (currentTenant && !currentTenant.storage_setup_complete && setCurrentTenant) {
          setCurrentTenant({
            ...currentTenant,
            storage_setup_complete: true
          });
        }
        
        // Fetch files immediately
        try {
          const filesResponse = await api.get(API_ENDPOINTS.STORAGE.FILES);
          
          if (!isMountedRef.current) return;
          
          const filesData = filesResponse.data || [];
          setFiles(filesData);
          
          // Group files by category
          const groupedFiles: Record<string, StorageFile[]> = {};
          STORAGE_CATEGORIES.forEach(cat => {
            groupedFiles[cat.id] = filesData.filter((file: StorageFile) => 
              file.file_category === cat.id
            );
          });
          setCategoryFiles(groupedFiles);
        } catch (filesError) {
          console.error('Error fetching files:', filesError);
          setFiles([]);
          setCategoryFiles({});
        }
      }
      
      setInitialLoadComplete(true);
    } catch (err: any) {
      if (!isMountedRef.current) return;
      
      console.error('Error loading storage data:', err);
      
      if (err.response?.status === 401) {
        console.error('Authentication error in storage');
      } else if (err.response?.status === 404) {
        setStorageSetupComplete(false);
        setStorageStats(null);
        setFiles([]);
        setCategoryFiles({});
        setError(null);
      } else {
        setError(err.response?.data?.error || 'Failed to load storage data');
      }
      
      setInitialLoadComplete(true);
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
        loadingRef.current = false;
      }
    }
  }, [currentTenant, setCurrentTenant, isLive, ensureHeaders, initialLoadComplete]);
  
  // Fetch storage stats only (used for refresh)
  const fetchStorageStats = useCallback(async () => {
    if (!currentTenant?.id) {
      return;
    }
    
    ensureHeaders();
    setError(null);
    
    try {
      const response = await api.get(API_ENDPOINTS.STORAGE.STATS);
      
      if (!isMountedRef.current) return;
      
      const data = response.data;
      
      if (data.storageSetupComplete === false) {
        setStorageSetupComplete(false);
        setStorageStats(null);
      } else {
        setStorageStats(data);
        setStorageSetupComplete(true);
      }
    } catch (err: any) {
      if (!isMountedRef.current) return;
      
      console.error('Error fetching storage stats:', err);
      
      if (err.response?.status === 404) {
        setStorageSetupComplete(false);
        setStorageStats(null);
        setError(null);
      } else {
        setError(err.response?.data?.error || 'Failed to load storage statistics');
      }
    }
  }, [currentTenant, ensureHeaders]);
  
  // Setup storage
  const setupStorage = async (): Promise<boolean> => {
    if (!currentTenant?.id) {
      vaniToast.error('No tenant selected');
      return false;
    }
    
    ensureHeaders();
    setIsSubmitting(true);
    setError(null);
    
    try {
      console.log(`Setting up storage for ${isLive ? 'Live' : 'Test'} environment`);
      
      const response = await api.post(API_ENDPOINTS.STORAGE.SETUP);
      
      if (!isMountedRef.current) return false;
      
      const data = response.data;
      
      setStorageStats(data);
      setStorageSetupComplete(true);
      
      if (setCurrentTenant) {
        setCurrentTenant({
          ...currentTenant,
          storage_setup_complete: true
        });
      }
      
      vaniToast.success('Storage setup completed successfully');
      return true;
    } catch (err: any) {
      if (!isMountedRef.current) return false;

      console.error('Error setting up storage:', err);

      if (err.response?.status === 400) {
        const errorMessage = err.response?.data?.error || '';

        if (errorMessage.toLowerCase().includes('already set up')) {
          setStorageSetupComplete(true);
          await fetchStorageStats();
          vaniToast.info('Storage is already set up');
          return true;
        }
      }

      setError(err.response?.data?.error || 'Failed to setup storage');
      vaniToast.error(err.response?.data?.error || 'Failed to setup storage');
      return false;
    } finally {
      if (isMountedRef.current) {
        setIsSubmitting(false);
      }
    }
  };
  
  // Fetch files (can be called independently for refresh)
  const fetchFiles = useCallback(async (category?: string): Promise<StorageFile[]> => {
    if (!currentTenant?.id || !storageSetupComplete) {
      return [];
    }
    
    ensureHeaders();
    setError(null);
    
    try {
      let url = API_ENDPOINTS.STORAGE.FILES;
      if (category) {
        url += `?category=${category}`;
      }
      
      console.log(`Fetching files for ${isLive ? 'Live' : 'Test'} environment${category ? ` (category: ${category})` : ''}`);
      
      const response = await api.get(url);
      
      if (!isMountedRef.current) return [];
      
      const data = response.data || [];
      
      if (category) {
        setCategoryFiles(prev => ({
          ...prev,
          [category]: data
        }));
      } else {
        setFiles(data);
        
        // Group files by category
        const groupedFiles: Record<string, StorageFile[]> = {};
        STORAGE_CATEGORIES.forEach(cat => {
          groupedFiles[cat.id] = data.filter((file: StorageFile) => file.file_category === cat.id);
        });
        setCategoryFiles(groupedFiles);
      }
      
      return data;
    } catch (err: any) {
      if (!isMountedRef.current) return [];
      
      console.error('Error fetching files:', err);
      
      if (err.response?.status === 404 || err.response?.status === 400) {
        return [];
      }
      
      setError(err.response?.data?.error || 'Failed to load files');
      return [];
    }
  }, [currentTenant?.id, storageSetupComplete, isLive, ensureHeaders]);
  
  // Upload single file
  const uploadFile = async (file: File, category: string, metadata?: any): Promise<StorageFile | null> => {
    if (!currentTenant?.id || !storageSetupComplete) {
      vaniToast.error('Storage is not set up yet');
      return null;
    }

    if (!isFileSizeAllowed(file.size, category)) {
      vaniToast.error(`File size exceeds the maximum limit of ${formatFileSize(5 * 1024 * 1024)}`);
      return null;
    }

    if (!isFileTypeAllowed(file.type, category)) {
      vaniToast.error('File type is not allowed for this category');
      return null;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      if (storageStats && file.size > storageStats.available) {
        vaniToast.error('Not enough storage space available');
        return null;
      }

      const formData = new FormData();
      formData.append('file', file);
      formData.append('category', category);
      if (metadata) {
        formData.append('metadata', JSON.stringify(metadata));
      }
      
      console.log(`Uploading to ${isLive ? 'Live' : 'Test'} environment`);
      
      const authToken = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
      const tenantId = currentTenant.id;
      const baseURL = api.defaults.baseURL;
      const uploadURL = `${baseURL}${API_ENDPOINTS.STORAGE.FILES}`;
      
      const response = await fetch(uploadURL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'x-tenant-id': tenantId,
          'x-environment': isLive ? 'live' : 'test'
        },
        body: formData
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Upload failed with status ${response.status}`);
      }
      
      const uploadedFile = await response.json();
      
      // Update local state
      setFiles(prev => [uploadedFile, ...prev]);
      setCategoryFiles(prev => ({
        ...prev,
        [category]: [uploadedFile, ...(prev[category] || [])]
      }));
      
      // Refresh storage stats
      fetchStorageStats();

      vaniToast.success('File uploaded successfully');
      return uploadedFile;
    } catch (err: any) {
      console.error('Upload Error:', err);

      const errorMessage = err.message || 'Failed to upload file';
      setError(errorMessage);
      vaniToast.error(errorMessage);

      return null;
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Upload multiple files
  const uploadMultipleFiles = async (files: File[], category: string): Promise<boolean> => {
    if (!currentTenant?.id || !storageSetupComplete) {
      vaniToast.error('Storage is not set up yet');
      return false;
    }

    const totalSize = files.reduce((sum, file) => sum + file.size, 0);
    if (storageStats && totalSize > storageStats.available) {
      vaniToast.error('Not enough storage space available for all files');
      return false;
    }
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      const formData = new FormData();
      
      files.forEach(file => {
        formData.append('files', file);
      });
      
      formData.append('category', category);
      
      console.log(`Uploading ${files.length} files to ${isLive ? 'Live' : 'Test'} environment`);
      
      const authToken = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
      const tenantId = currentTenant.id;
      const baseURL = api.defaults.baseURL;
      const uploadURL = `${baseURL}${API_ENDPOINTS.STORAGE.FILES}/multiple`;
      
      const response = await fetch(uploadURL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'x-tenant-id': tenantId,
          'x-environment': isLive ? 'live' : 'test'
        },
        body: formData
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Upload failed with status ${response.status}`);
      }
      
      const result = await response.json();
      
      if (!isMountedRef.current) return false;
      
      const successfulUploads = result.results
        .filter((r: any) => r.file)
        .map((r: any) => r.file);
      
      if (successfulUploads.length > 0) {
        setFiles(prev => [...successfulUploads, ...prev]);
        setCategoryFiles(prev => ({
          ...prev,
          [category]: [...successfulUploads, ...(prev[category] || [])]
        }));
      }
      
      fetchStorageStats();

      if (result.summary.failed > 0) {
        vaniToast.warning(result.message);
      } else {
        vaniToast.success(result.message);
      }

      return result.summary.failed === 0;
    } catch (err: any) {
      if (!isMountedRef.current) return false;

      console.error('Error uploading multiple files:', err);
      setError(err.message || 'Failed to upload files');
      vaniToast.error(err.message || 'Failed to upload files');
      return false;
    } finally {
      if (isMountedRef.current) {
        setIsSubmitting(false);
      }
    }
  };
  
  // Delete single file
  const deleteFile = async (fileId: string): Promise<boolean> => {
    if (!currentTenant?.id || !storageSetupComplete) return false;
    
    ensureHeaders();
    setIsSubmitting(true);
    setError(null);
    
    try {
      console.log(`Deleting file from ${isLive ? 'Live' : 'Test'} environment`);
      
      await api.delete(`${API_ENDPOINTS.STORAGE.FILES}/${fileId}`);
      
      if (!isMountedRef.current) return false;
      
      const fileToDelete = files.find(f => f.id === fileId);
      
      if (fileToDelete) {
        const category = fileToDelete.file_category;
        
        setFiles(prev => prev.filter(f => f.id !== fileId));
        setCategoryFiles(prev => ({
          ...prev,
          [category]: prev[category]?.filter(f => f.id !== fileId) || []
        }));
      }
      
      fetchStorageStats();

      vaniToast.success('File deleted successfully');
      return true;
    } catch (err: any) {
      if (!isMountedRef.current) return false;

      console.error('Error deleting file:', err);
      setError(err.response?.data?.error || 'Failed to delete file');
      vaniToast.error(err.response?.data?.error || 'Failed to delete file');
      return false;
    } finally {
      if (isMountedRef.current) {
        setIsSubmitting(false);
      }
    }
  };
  
  // Delete multiple files
  const deleteMultipleFiles = async (fileIds: string[]): Promise<boolean> => {
    if (!currentTenant?.id || !storageSetupComplete) return false;
    
    ensureHeaders();
    setIsSubmitting(true);
    setError(null);
    
    try {
      console.log(`Deleting ${fileIds.length} files from ${isLive ? 'Live' : 'Test'} environment`);
      
      const response = await api.post(`${API_ENDPOINTS.STORAGE.FILES}/delete-batch`, {
        fileIds
      });
      
      if (!isMountedRef.current) return false;
      
      const result = response.data;
      
      const deletedIds = result.results
        .filter((r: any) => r.success)
        .map((r: any) => r.fileId);
      
      if (deletedIds.length > 0) {
        setFiles(prev => prev.filter(f => !deletedIds.includes(f.id)));
        
        const newCategoryFiles = { ...categoryFiles };
        Object.keys(newCategoryFiles).forEach(category => {
          newCategoryFiles[category] = newCategoryFiles[category].filter(
            f => !deletedIds.includes(f.id)
          );
        });
        setCategoryFiles(newCategoryFiles);
      }
      
      fetchStorageStats();

      if (result.summary.failed > 0) {
        vaniToast.warning(result.message);
      } else {
        vaniToast.success(result.message);
      }

      return result.summary.failed === 0;
    } catch (err: any) {
      if (!isMountedRef.current) return false;

      console.error('Error deleting multiple files:', err);
      setError(err.response?.data?.error || 'Failed to delete files');
      vaniToast.error(err.response?.data?.error || 'Failed to delete files');
      return false;
    } finally {
      if (isMountedRef.current) {
        setIsSubmitting(false);
      }
    }
  };
  
  // Get storage categories
  const getStorageCategories = useCallback(() => {
    return STORAGE_CATEGORIES;
  }, []);
  
  // Clear all data
  const clearAllData = useCallback(() => {
    console.log('Clearing all storage data');
    setStorageStats(null);
    setFiles([]);
    setCategoryFiles({});
    setSelectedCategory(null);
    setError(null);
    setInitialLoadComplete(false);
    loadingRef.current = false;
  }, []);
  
  // Single useEffect for initial load
  useEffect(() => {
    if (currentTenant?.id && !initialLoadComplete) {
      loadInitialData();
    }
  }, [currentTenant?.id, loadInitialData]);
  
  // Handle environment changes
  useEffect(() => {
    if (initialLoadComplete) {
      clearAllData();
    }
  }, [isLive]);
  
  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    
    return () => {
      isMountedRef.current = false;
      loadingRef.current = false;
    };
  }, []);
  
  return {
    // State
    isLoading,
    isSubmitting,
    storageStats,
    storageSetupComplete,
    files,
    categoryFiles,
    selectedCategory,
    error,
    
    // Actions
    setupStorage,
    fetchStorageStats,
    fetchFiles,
    uploadFile,
    uploadMultipleFiles,
    deleteFile,
    deleteMultipleFiles,
    getStorageCategories,
    setSelectedCategory,
    clearAllData,
  };
};

export default useStorageManagement;