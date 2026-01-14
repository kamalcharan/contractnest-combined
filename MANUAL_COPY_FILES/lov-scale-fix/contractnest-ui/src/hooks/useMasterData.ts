// src/hooks/useMasterData.ts
// UPDATED: Using vaniToast instead of useToast for consistent UI

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { vaniToast } from '@/components/common/toast';
import api from '@/services/api';
import { API_ENDPOINTS } from '@/services/serviceURLs';
import { captureException } from '@/utils/sentry';

// Type definitions
export interface CategoryMaster {
  id: string;
  CategoryName: string;
  DisplayName: string;
  is_active: boolean;
  Description: string | null;
  icon_name: string | null;
  order_sequence: number | null;
  tenantid: string;
  created_at: string;
}

export interface CategoryDetail {
  id: string;
  SubCatName: string;
  DisplayName: string;
  category_id: string;
  hexcolor: string | null;
  icon_name: string | null;
  tags: string[] | null;
  tool_tip: string | null;
  is_active: boolean;
  Sequence_no: number | null;
  Description: string | null;
  tenantid: string;
  is_deletable: boolean;
  form_settings: any | null;
  created_at: string;
}

export interface MasterDataOption {
  value: string;
  label: string;
  color?: string | null;
  description?: string | null;
  sequence?: number | null;
  [key: string]: any; // Allow additional properties
}

// Cache types
interface CacheEntry {
  data: CategoryDetail[];
  timestamp: number;
  expiresIn: number;
}

// Cache store - shared across all hook instances
const masterDataCache = new Map<string, CacheEntry>();

// Default cache duration - 5 minutes
const DEFAULT_CACHE_DURATION = 5 * 60 * 1000;

// Hook options
export interface UseMasterDataOptions {
  cacheTime?: number;
  refetchOnMount?: boolean;
  refetchInterval?: number;
  enabled?: boolean;
  onSuccess?: (data: CategoryDetail[]) => void;
  onError?: (error: Error) => void;
}

// Main hook
export const useMasterData = (
  categoryName: string,
  options: UseMasterDataOptions = {}
) => {
  const { currentTenant } = useAuth();
  const [data, setData] = useState<CategoryDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const isMountedRef = useRef(true);

  const {
    cacheTime = DEFAULT_CACHE_DURATION,
    refetchOnMount = true,
    refetchInterval,
    enabled = true,
    onSuccess,
    onError
  } = options;

  const cacheKey = `${currentTenant?.id}-${categoryName}`;

  const fetchCategoryData = useCallback(async () => {
    if (!currentTenant?.id || !enabled) {
      setLoading(false);
      return [];
    }

    // Check cache first
    const cached = masterDataCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < cached.expiresIn) {
      if (isMountedRef.current) {
        setData(cached.data);
        setLoading(false);
        onSuccess?.(cached.data);
      }
      return cached.data;
    }

    try {
      setLoading(true);
      setError(null);

      // First get all categories to find the one we need
      const categoriesResponse = await api.get(
        `${API_ENDPOINTS.MASTERDATA.CATEGORIES}?tenantId=${currentTenant.id}`
      );

      const category = categoriesResponse.data.find(
        (cat: CategoryMaster) =>
          cat.CategoryName === categoryName ||
          cat.DisplayName === categoryName
      );

      if (!category) {
        throw new Error(`Category "${categoryName}" not found`);
      }

      // Then get category details
      const detailsResponse = await api.get(
        `${API_ENDPOINTS.MASTERDATA.CATEGORY_DETAILS}?categoryId=${category.id}&tenantId=${currentTenant.id}`
      );

      const categoryData: CategoryDetail[] = detailsResponse.data;

      // Update cache
      masterDataCache.set(cacheKey, {
        data: categoryData,
        timestamp: Date.now(),
        expiresIn: cacheTime
      });

      if (isMountedRef.current) {
        setData(categoryData);
        onSuccess?.(categoryData);
      }

      return categoryData;
    } catch (err) {
      const error = err as Error;

      if (isMountedRef.current) {
        setError(error);
        onError?.(error);

        // Only show toast for non-404 errors
        if (!error.message.includes('not found')) {
          vaniToast.error('Error Loading Data', {
            message: error.message,
            duration: 4000
          });
        }
      }

      captureException(error, {
        tags: { component: 'useMasterData', action: 'fetchCategoryData' },
        extra: { categoryName, tenantId: currentTenant?.id }
      });

      return [];
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [currentTenant?.id, categoryName, cacheKey, cacheTime, enabled, onSuccess, onError]);

  // Track mounted state
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Initial fetch
  useEffect(() => {
    if (refetchOnMount && enabled) {
      fetchCategoryData();
    }
  }, [fetchCategoryData, refetchOnMount, enabled]);

  // Refetch interval
  useEffect(() => {
    if (refetchInterval && refetchInterval > 0 && enabled) {
      const interval = setInterval(fetchCategoryData, refetchInterval);
      return () => clearInterval(interval);
    }
  }, [fetchCategoryData, refetchInterval, enabled]);

  const refetch = useCallback(async () => {
    // Clear cache for this key
    masterDataCache.delete(cacheKey);
    return fetchCategoryData();
  }, [cacheKey, fetchCategoryData]);

  const clearCache = useCallback(() => {
    masterDataCache.delete(cacheKey);
  }, [cacheKey]);

  const invalidate = useCallback(() => {
    masterDataCache.delete(cacheKey);
    setData([]);
  }, [cacheKey]);

  return {
    data,
    loading,
    error,
    refetch,
    clearCache,
    invalidate
  };
};

// Hook for getting dropdown options
export const useMasterDataOptions = (
  categoryName: string,
  options?: UseMasterDataOptions & {
    valueField?: keyof CategoryDetail;
    labelField?: keyof CategoryDetail;
    includeInactive?: boolean;
    sortBy?: keyof CategoryDetail;
    sortOrder?: 'asc' | 'desc';
  }
) => {
  const {
    valueField = 'id',
    labelField = 'DisplayName',
    includeInactive = false,
    sortBy = 'Sequence_no',
    sortOrder = 'asc',
    ...masterDataOptions
  } = options || {};

  const { data, loading, error, refetch, clearCache, invalidate } = useMasterData(
    categoryName,
    masterDataOptions
  );

  const dropdownOptions: MasterDataOption[] = data
    .filter(item => includeInactive || item.is_active)
    .sort((a, b) => {
      const aVal = a[sortBy];
      const bVal = b[sortBy];

      // Handle null/undefined values
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;

      // Sort
      if (sortOrder === 'asc') {
        return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      } else {
        return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
      }
    })
    .map(item => ({
      value: String(item[valueField]),
      label: String(item[labelField]),
      color: item.hexcolor,
      description: item.Description,
      sequence: item.Sequence_no,
      // Include all original fields
      ...item
    }));

  return {
    options: dropdownOptions,
    loading,
    error,
    refetch,
    clearCache,
    invalidate
  };
};

// Hook for getting a specific value by name
export const useMasterDataValue = (
  categoryName: string,
  valueName: string | null | undefined,
  options?: UseMasterDataOptions
) => {
  const { data, loading, error, refetch } = useMasterData(categoryName, options);

  const value = valueName
    ? data.find(item =>
        item.SubCatName === valueName ||
        item.DisplayName === valueName ||
        item.id === valueName
      )
    : null;

  return { value, loading, error, refetch };
};

// Hook for multiple categories at once
export const useMultipleMasterData = (
  categoryNames: string[],
  options?: UseMasterDataOptions
) => {
  const [allData, setAllData] = useState<Record<string, CategoryDetail[]>>({});
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState<Record<string, Error>>({});
  const { currentTenant } = useAuth();

  const fetchAllCategories = useCallback(async () => {
    if (!currentTenant?.id || categoryNames.length === 0) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const results: Record<string, CategoryDetail[]> = {};
    const errorResults: Record<string, Error> = {};

    await Promise.all(
      categoryNames.map(async (categoryName) => {
        try {
          // Use the same logic as single category fetch
          const cacheKey = `${currentTenant.id}-${categoryName}`;
          const cached = masterDataCache.get(cacheKey);

          if (cached && Date.now() - cached.timestamp < cached.expiresIn) {
            results[categoryName] = cached.data;
          } else {
            // Fetch data
            const categoriesResponse = await api.get(
              `${API_ENDPOINTS.MASTERDATA.CATEGORIES}?tenantId=${currentTenant.id}`
            );

            const category = categoriesResponse.data.find(
              (cat: CategoryMaster) =>
                cat.CategoryName === categoryName ||
                cat.DisplayName === categoryName
            );

            if (category) {
              const detailsResponse = await api.get(
                `${API_ENDPOINTS.MASTERDATA.CATEGORY_DETAILS}?categoryId=${category.id}&tenantId=${currentTenant.id}`
              );

              results[categoryName] = detailsResponse.data;

              // Update cache
              masterDataCache.set(cacheKey, {
                data: detailsResponse.data,
                timestamp: Date.now(),
                expiresIn: options?.cacheTime || DEFAULT_CACHE_DURATION
              });
            } else {
              results[categoryName] = [];
            }
          }
        } catch (error) {
          errorResults[categoryName] = error as Error;
          results[categoryName] = [];
        }
      })
    );

    setAllData(results);
    setErrors(errorResults);
    setLoading(false);
  }, [categoryNames.join(','), currentTenant?.id, options?.cacheTime]);

  useEffect(() => {
    fetchAllCategories();
  }, [fetchAllCategories]);

  const refetch = useCallback(() => {
    // Clear cache for all categories
    categoryNames.forEach(categoryName => {
      const cacheKey = `${currentTenant?.id}-${categoryName}`;
      masterDataCache.delete(cacheKey);
    });
    return fetchAllCategories();
  }, [categoryNames, currentTenant?.id, fetchAllCategories]);

  return { data: allData, loading, errors, refetch };
};

// Cache management hook
export const useMasterDataCache = () => {
  const { currentTenant } = useAuth();

  const clearAllCache = useCallback(() => {
    masterDataCache.clear();
  }, []);

  const clearCategoryCache = useCallback((categoryName: string) => {
    if (currentTenant?.id) {
      const cacheKey = `${currentTenant.id}-${categoryName}`;
      masterDataCache.delete(cacheKey);
    }
  }, [currentTenant?.id]);

  const getCacheSize = useCallback(() => {
    return masterDataCache.size;
  }, []);

  const getCacheKeys = useCallback(() => {
    return Array.from(masterDataCache.keys());
  }, []);

  const preloadCategories = useCallback(async (categoryNames: string[]) => {
    if (!currentTenant?.id) return;

    await Promise.all(
      categoryNames.map(async (categoryName) => {
        const cacheKey = `${currentTenant.id}-${categoryName}`;
        const cached = masterDataCache.get(cacheKey);

        // Only fetch if not already cached
        if (!cached || Date.now() - cached.timestamp >= cached.expiresIn) {
          try {
            const categoriesResponse = await api.get(
              `${API_ENDPOINTS.MASTERDATA.CATEGORIES}?tenantId=${currentTenant.id}`
            );

            const category = categoriesResponse.data.find(
              (cat: CategoryMaster) =>
                cat.CategoryName === categoryName ||
                cat.DisplayName === categoryName
            );

            if (category) {
              const detailsResponse = await api.get(
                `${API_ENDPOINTS.MASTERDATA.CATEGORY_DETAILS}?categoryId=${category.id}&tenantId=${currentTenant.id}`
              );

              masterDataCache.set(cacheKey, {
                data: detailsResponse.data,
                timestamp: Date.now(),
                expiresIn: DEFAULT_CACHE_DURATION
              });
            }
          } catch (error) {
            console.error(`Failed to preload category ${categoryName}:`, error);
          }
        }
      })
    );
  }, [currentTenant?.id]);

  return {
    clearAllCache,
    clearCategoryCache,
    getCacheSize,
    getCacheKeys,
    preloadCategories
  };
};
