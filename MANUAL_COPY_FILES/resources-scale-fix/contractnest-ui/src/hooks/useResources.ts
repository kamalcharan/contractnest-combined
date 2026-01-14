// src/hooks/useResources.ts
// SCALE-OPTIMIZED VERSION - vaniToast + idempotency headers
// Updated: January 2025

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { vaniToast } from '@/components/common/toast';
import api from '@/services/api';
import { API_ENDPOINTS, buildResourcesListURL } from '@/services/serviceURLs';
import { captureException } from '@/utils/sentry';

// Type definitions
export interface ResourceType {
  id: string;
  name: string;
  description?: string;
  is_active: boolean;
  sort_order?: number;
}

export interface Resource {
  id: string;
  resource_type_id: string;
  name: string;
  display_name: string;
  description?: string;
  hexcolor?: string;
  sequence_no?: number;
  contact_id?: string;
  tags?: string[];
  form_settings?: any;
  is_active: boolean;
  is_deletable: boolean;
  tenant_id: string;
  created_at: string;
  updated_at?: string;
  contact?: {
    id: string;
    first_name?: string;
    last_name?: string;
    email?: string;
  };
}

export interface CreateResourceFormData {
  resource_type_id: string;
  name: string;
  display_name: string;
  description?: string;
  hexcolor?: string;
  sequence_no?: number;
  contact_id?: string;
  tags?: string[];
  form_settings?: any;
  is_active?: boolean;
  is_deletable?: boolean;
}

export interface UpdateResourceFormData {
  name?: string;
  display_name?: string;
  description?: string;
  hexcolor?: string;
  sequence_no?: number;
  contact_id?: string;
  tags?: string[];
  form_settings?: any;
  is_active?: boolean;
  is_deletable?: boolean;
}

// Cache types
interface CacheEntry {
  data: ResourceType[] | Resource[];
  timestamp: number;
  expiresIn: number;
}

// Cache store - shared across all hook instances
const resourcesCache = new Map<string, CacheEntry>();

// Default cache duration - 5 minutes
const DEFAULT_CACHE_DURATION = 5 * 60 * 1000;

// Hook options
export interface UseResourcesOptions {
  cacheTime?: number;
  refetchOnMount?: boolean;
  enabled?: boolean;
  onSuccess?: (data: any[]) => void;
  onError?: (error: Error) => void;
}

// Generate idempotency key
const generateIdempotencyKey = (): string => {
  return `resources-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
};

// Parse edge function response
const parseResponse = (response: any) => {
  console.log('PARSING RESPONSE:', response);

  // Handle new edge function format: { success: true, data: [...] }
  if (response?.data?.success === true && response?.data?.data) {
    console.log('NEW FORMAT - extracting data:', response.data.data);
    return response.data.data;
  }

  // Handle direct array response
  if (response?.data && Array.isArray(response.data)) {
    console.log('DIRECT ARRAY - using data:', response.data);
    return response.data;
  }

  // Handle direct format (fallback)
  if (response?.data) {
    console.log('DIRECT OBJECT - using data:', response.data);
    return response.data;
  }

  console.log('UNKNOWN FORMAT - returning empty array');
  return [];
};

// Resource Types Hook
export const useResourceTypes = (options: UseResourcesOptions = {}) => {
  const { currentTenant } = useAuth();
  const [data, setData] = useState<ResourceType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const isMountedRef = useRef(true);

  const {
    cacheTime = DEFAULT_CACHE_DURATION,
    refetchOnMount = true,
    enabled = true,
    onSuccess,
    onError
  } = options;

  const cacheKey = `resource-types-${currentTenant?.id}`;

  const fetchResourceTypes = useCallback(async () => {
    if (!currentTenant?.id || !enabled) {
      setLoading(false);
      return [];
    }

    // Check cache first
    const cached = resourcesCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < cached.expiresIn) {
      if (isMountedRef.current) {
        setData(cached.data as ResourceType[]);
        setLoading(false);
        onSuccess?.(cached.data as ResourceType[]);
      }
      return cached.data;
    }

    try {
      setLoading(true);
      setError(null);

      console.log('Fetching resource types...');
      const response = await api.get(API_ENDPOINTS.RESOURCES.RESOURCE_TYPES);

      console.log('RESOURCE TYPES API RESPONSE:', response);

      const resourceTypes = parseResponse(response);

      console.log('PARSED RESOURCE TYPES:', resourceTypes);

      // Ensure we have an array
      if (!Array.isArray(resourceTypes)) {
        throw new Error('Resource types response is not an array');
      }

      console.log('Resource types fetched:', resourceTypes.length);

      // Update cache
      resourcesCache.set(cacheKey, {
        data: resourceTypes,
        timestamp: Date.now(),
        expiresIn: cacheTime
      });

      if (isMountedRef.current) {
        setData(resourceTypes);
        setLoading(false);
        onSuccess?.(resourceTypes);
      }

      return resourceTypes;
    } catch (err) {
      const error = err as Error;

      console.error('Error fetching resource types:', error);

      if (isMountedRef.current) {
        setError(error);
        setLoading(false);
        onError?.(error);

        // UPDATED: Using vaniToast
        vaniToast.error('Error Loading Resource Types', {
          message: error.message,
          duration: 4000
        });
      }

      captureException(error, {
        tags: { component: 'useResourceTypes', action: 'fetchResourceTypes' },
        extra: { tenantId: currentTenant?.id }
      });

      return [];
    }
  }, [currentTenant?.id, cacheKey, cacheTime, enabled, onSuccess, onError]);

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
      fetchResourceTypes();
    }
  }, [fetchResourceTypes, refetchOnMount, enabled]);

  const refetch = useCallback(async () => {
    resourcesCache.delete(cacheKey);
    return fetchResourceTypes();
  }, [cacheKey, fetchResourceTypes]);

  return {
    data,
    loading,
    error,
    refetch
  };
};

// Resources Hook
export const useResources = (
  resourceTypeId?: string,
  options: UseResourcesOptions = {}
) => {
  const { currentTenant } = useAuth();
  const [data, setData] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const isMountedRef = useRef(true);

  const {
    cacheTime = DEFAULT_CACHE_DURATION,
    refetchOnMount = true,
    enabled = true,
    onSuccess,
    onError
  } = options;

  const cacheKey = `resources-${currentTenant?.id}-${resourceTypeId || 'all'}`;

  const fetchResources = useCallback(async () => {
    if (!currentTenant?.id || !enabled) {
      setLoading(false);
      return [];
    }

    // Check cache first
    const cached = resourcesCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < cached.expiresIn) {
      if (isMountedRef.current) {
        setData(cached.data as Resource[]);
        setLoading(false);
        onSuccess?.(cached.data as Resource[]);
      }
      return cached.data;
    }

    try {
      setLoading(true);
      setError(null);

      console.log('Fetching resources for type:', resourceTypeId);

      // Use proper URL builder with filters
      const url = buildResourcesListURL({
        resourceTypeId: resourceTypeId || undefined
      });

      console.log('Fetching from URL:', url);

      const response = await api.get(url);

      console.log('RESOURCES API RESPONSE:', response);

      const resources = parseResponse(response);

      // Ensure we have an array
      if (!Array.isArray(resources)) {
        throw new Error('Resources response is not an array');
      }

      console.log('Resources fetched:', resources.length);

      // Update cache
      resourcesCache.set(cacheKey, {
        data: resources,
        timestamp: Date.now(),
        expiresIn: cacheTime
      });

      if (isMountedRef.current) {
        setData(resources);
        setLoading(false);
        onSuccess?.(resources);
      }

      return resources;
    } catch (err) {
      const error = err as any;

      console.error('Error fetching resources:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);

      const errorMessage = error.response?.data?.error
        || error.response?.data?.message
        || error.message
        || 'Failed to fetch resources';

      if (isMountedRef.current) {
        setError(error);
        setLoading(false);
        onError?.(error);

        // UPDATED: Using vaniToast
        vaniToast.error('Error Loading Resources', {
          message: `${errorMessage}${error.response?.status ? ` (${error.response.status})` : ''}`,
          duration: 4000
        });
      }

      captureException(error, {
        tags: { component: 'useResources', action: 'fetchResources' },
        extra: {
          resourceTypeId,
          tenantId: currentTenant?.id,
          errorStatus: error.response?.status,
          errorData: error.response?.data
        }
      });

      return [];
    }
  }, [currentTenant?.id, resourceTypeId, cacheKey, cacheTime, enabled, onSuccess, onError]);

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
      fetchResources();
    }
  }, [fetchResources, refetchOnMount, enabled]);

  const refetch = useCallback(async () => {
    resourcesCache.delete(cacheKey);
    return fetchResources();
  }, [cacheKey, fetchResources]);

  return {
    data,
    loading,
    error,
    refetch
  };
};

// Create Resource - UPDATED: With idempotency header
export const useCreateResource = () => {
  const { currentTenant } = useAuth();
  const [loading, setLoading] = useState(false);

  const createResource = useCallback(async (data: CreateResourceFormData) => {
    if (!currentTenant?.id) {
      throw new Error('No tenant selected');
    }

    setLoading(true);
    try {
      console.log('Creating resource:', data);

      // Generate idempotency key for this operation
      const idempotencyKey = generateIdempotencyKey();

      const response = await api.post(API_ENDPOINTS.RESOURCES.CREATE, {
        ...data,
        tenant_id: currentTenant.id,
        is_active: data.is_active !== false,
        is_deletable: data.is_deletable !== false
      }, {
        headers: {
          'x-idempotency-key': idempotencyKey
        }
      });

      const result = parseResponse(response);

      console.log('Resource created:', result);

      // Clear relevant cache
      const cacheKeysToDelete = Array.from(resourcesCache.keys()).filter(key =>
        key.includes(`resources-${currentTenant.id}`)
      );
      cacheKeysToDelete.forEach(key => resourcesCache.delete(key));

      // UPDATED: Using vaniToast
      vaniToast.success('Resource Created', {
        message: 'Resource created successfully',
        duration: 3000
      });

      return result;
    } catch (error: any) {
      console.error('Error creating resource:', error);

      // UPDATED: Using vaniToast
      vaniToast.error('Error Creating Resource', {
        message: error.response?.data?.error || error.message || 'Failed to create resource',
        duration: 4000
      });

      throw error;
    } finally {
      setLoading(false);
    }
  }, [currentTenant?.id]);

  return { createResource, loading };
};

// Update Resource - UPDATED: With idempotency header
export const useUpdateResource = () => {
  const { currentTenant } = useAuth();
  const [loading, setLoading] = useState(false);

  const updateResource = useCallback(async (id: string, data: UpdateResourceFormData) => {
    if (!currentTenant?.id) {
      throw new Error('No tenant selected');
    }

    setLoading(true);
    try {
      console.log('Updating resource:', id, data);

      // Generate idempotency key for this operation
      const idempotencyKey = generateIdempotencyKey();

      const response = await api.patch(`${API_ENDPOINTS.RESOURCES.UPDATE(id)}`, data, {
        headers: {
          'x-idempotency-key': idempotencyKey
        }
      });
      const result = parseResponse(response);

      console.log('Resource updated:', result);

      // Clear relevant cache
      const cacheKeysToDelete = Array.from(resourcesCache.keys()).filter(key =>
        key.includes(`resources-${currentTenant.id}`)
      );
      cacheKeysToDelete.forEach(key => resourcesCache.delete(key));

      // UPDATED: Using vaniToast
      vaniToast.success('Resource Updated', {
        message: 'Resource updated successfully',
        duration: 3000
      });

      return result;
    } catch (error: any) {
      console.error('Error updating resource:', error);

      // UPDATED: Using vaniToast
      vaniToast.error('Error Updating Resource', {
        message: error.response?.data?.error || error.message || 'Failed to update resource',
        duration: 4000
      });

      throw error;
    } finally {
      setLoading(false);
    }
  }, [currentTenant?.id]);

  return { updateResource, loading };
};

// Delete Resource - UPDATED: With idempotency header
export const useDeleteResource = () => {
  const { currentTenant } = useAuth();
  const [loading, setLoading] = useState(false);

  const deleteResource = useCallback(async (id: string) => {
    if (!currentTenant?.id) {
      throw new Error('No tenant selected');
    }

    setLoading(true);
    try {
      console.log('Deleting resource:', id);

      // Generate idempotency key for this operation
      const idempotencyKey = generateIdempotencyKey();

      await api.delete(API_ENDPOINTS.RESOURCES.DELETE(id), {
        headers: {
          'x-idempotency-key': idempotencyKey
        }
      });

      console.log('Resource deleted:', id);

      // Clear relevant cache
      const cacheKeysToDelete = Array.from(resourcesCache.keys()).filter(key =>
        key.includes(`resources-${currentTenant.id}`)
      );
      cacheKeysToDelete.forEach(key => resourcesCache.delete(key));

      // UPDATED: Using vaniToast
      vaniToast.success('Resource Deleted', {
        message: 'Resource deleted successfully',
        duration: 3000
      });

    } catch (error: any) {
      console.error('Error deleting resource:', error);

      // UPDATED: Using vaniToast
      vaniToast.error('Error Deleting Resource', {
        message: error.response?.data?.error || error.message || 'Failed to delete resource',
        duration: 4000
      });

      throw error;
    } finally {
      setLoading(false);
    }
  }, [currentTenant?.id]);

  return { deleteResource, loading };
};

// Main Resources Manager Hook
export const useResourcesManager = (selectedResourceTypeId?: string) => {
  const resourceTypesResult = useResourceTypes();
  const resourcesResult = useResources(selectedResourceTypeId);
  const { createResource, loading: isCreating } = useCreateResource();
  const { updateResource, loading: isUpdating } = useUpdateResource();
  const { deleteResource, loading: isDeleting } = useDeleteResource();

  const refetchAll = useCallback(() => {
    resourceTypesResult.refetch();
    resourcesResult.refetch();
  }, [resourceTypesResult.refetch, resourcesResult.refetch]);

  return {
    // Data
    resourceTypes: resourceTypesResult.data,
    resources: resourcesResult.data,

    // Loading states
    isLoading: resourceTypesResult.loading || resourcesResult.loading,
    isError: !!resourceTypesResult.error || !!resourcesResult.error,
    error: resourceTypesResult.error || resourcesResult.error,
    isCreating,
    isUpdating,
    isDeleting,
    isMutating: isCreating || isUpdating || isDeleting,

    // Operations
    createResourceAsync: createResource,
    updateResourceAsync: updateResource,
    deleteResourceAsync: deleteResource,

    // Refetch
    refetchResources: resourcesResult.refetch,
    refetchResourceTypes: resourceTypesResult.refetch,
    refetchAll
  };
};

export default useResourcesManager;
