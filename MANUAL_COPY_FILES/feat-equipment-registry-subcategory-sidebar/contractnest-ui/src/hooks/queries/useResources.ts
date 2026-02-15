// src/hooks/queries/useResources.ts
// FIXED TanStack Query hooks for Resources - Enhanced response parsing

import { 
  useQuery, 
  useMutation, 
  useQueryClient,
  UseQueryResult,
  UseMutationResult,
} from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { useAuth } from '@/context/AuthContext';
import api from '@/services/api';
import { API_ENDPOINTS } from '@/services/serviceURLs';

// =================================================================
// TYPES (Simplified from your existing types)
// =================================================================

export interface ResourceType {
  id: string;
  name: string;
  description?: string;
  is_active: boolean;
  sort_order?: number;
  requires_human_assignment?: boolean;
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
  sub_category?: string;
  tags?: any;
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
  tags?: any;
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
  tags?: any;
  form_settings?: any;
  is_active?: boolean;
  is_deletable?: boolean;
}

export interface ResourceFilters {
  resourceTypeId?: string;
  search?: string;
  includeInactive?: boolean;
  include_deleted?: boolean;
}

// =================================================================
// QUERY KEYS
// =================================================================

export const RESOURCE_QUERY_KEYS = {
  all: ['resources'] as const,
  types: () => [...RESOURCE_QUERY_KEYS.all, 'types'] as const,
  lists: () => [...RESOURCE_QUERY_KEYS.all, 'list'] as const,
  list: (filters: ResourceFilters) => [...RESOURCE_QUERY_KEYS.lists(), filters] as const,
  details: () => [...RESOURCE_QUERY_KEYS.all, 'detail'] as const,
  detail: (id: string) => [...RESOURCE_QUERY_KEYS.details(), id] as const,
  nextSequence: (resourceTypeId: string) => [...RESOURCE_QUERY_KEYS.all, 'nextSequence', resourceTypeId] as const,
} as const;

// =================================================================
// ENHANCED RESPONSE PARSING (Fixed for API controller format)
// =================================================================

const parseResponse = (response: any, context: string = 'unknown') => {
  console.log(`🔍 PARSING ${context.toUpperCase()} RESPONSE:`, response);
  
  try {
    // Handle API controller format: { success: true, data: [...], message: "...", timestamp: "..." }
    if (response?.data?.success === true && response?.data?.data !== undefined) {
      console.log(`✅ ${context} - API CONTROLLER FORMAT - extracting data:`, response.data.data);
      return response.data.data;
    }
    
    // Handle edge function format: { success: true, data: [...] }
    if (response?.data && typeof response.data === 'object') {
      // If response.data is an array, use it directly
      if (Array.isArray(response.data)) {
        console.log(`✅ ${context} - DIRECT ARRAY - using data:`, response.data);
        return response.data;
      }
      
      // If response.data is an object, check for nested data
      if (response.data.success === true && response.data.data !== undefined) {
        console.log(`✅ ${context} - NESTED SUCCESS FORMAT - extracting data:`, response.data.data);
        return response.data.data;
      }
      
      // If response.data has the expected structure but no wrapper
      console.log(`✅ ${context} - DIRECT OBJECT - using data:`, response.data);
      return response.data;
    }
    
    // Handle raw response (shouldn't happen with axios, but just in case)
    if (Array.isArray(response)) {
      console.log(`✅ ${context} - RAW ARRAY - using response:`, response);
      return response;
    }
    
    console.log(`❌ ${context} - UNKNOWN FORMAT - returning empty array`);
    return [];
    
  } catch (error) {
    console.error(`❌ ${context} - PARSE ERROR:`, error);
    return [];
  }
};

// Helper to validate array responses
const validateArrayResponse = (data: any, context: string): any[] => {
  if (!Array.isArray(data)) {
    console.error(`❌ ${context} - Expected array but got:`, typeof data, data);
    throw new Error(`${context} response is not an array`);
  }
  
  console.log(`✅ ${context} - Validated array with ${data.length} items`);
  return data;
};

// Helper to validate object responses
const validateObjectResponse = (data: any, context: string): any => {
  if (!data || typeof data !== 'object') {
    console.error(`❌ ${context} - Expected object but got:`, typeof data, data);
    throw new Error(`${context} response is not a valid object`);
  }
  
  console.log(`✅ ${context} - Validated object:`, data);
  return data;
};

// =================================================================
// QUERY HOOKS
// =================================================================

/**
 * Get all resource types
 * FIXED: Better error handling and response validation
 */
export const useResourceTypes = (): UseQueryResult<ResourceType[], Error> => {
  const { currentTenant } = useAuth();

  return useQuery({
    queryKey: RESOURCE_QUERY_KEYS.types(),
    queryFn: async () => {
      console.log('🚀 Fetching resource types...');
      
      try {
        const response = await api.get(API_ENDPOINTS.RESOURCES.RESOURCE_TYPES);
        const data = parseResponse(response, 'resource_types');
        const resourceTypes = validateArrayResponse(data, 'ResourceTypes');
        
        console.log('✅ Resource types fetched successfully:', resourceTypes.length);
        return resourceTypes;
        
      } catch (error: any) {
        console.error('❌ Resource types fetch failed:', error);
        throw new Error(error.response?.data?.error || error.message || 'Failed to fetch resource types');
      }
    },
    enabled: !!currentTenant,
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    refetchOnWindowFocus: false,
    retry: (failureCount, error) => {
      console.log(`🔄 Resource types retry attempt ${failureCount}:`, error.message);
      return failureCount < 3;
    },
  });
};

/**
 * Get resources with filtering
 * FIXED: Better error handling and response validation
 */
export const useResources = (
  filters: ResourceFilters = {}
): UseQueryResult<Resource[], Error> => {
  const { currentTenant } = useAuth();

  return useQuery({
    queryKey: RESOURCE_QUERY_KEYS.list(filters),
    queryFn: async () => {
      console.log('🚀 Fetching resources with filters:', filters);
      
      try {
        let url = API_ENDPOINTS.RESOURCES.LIST;
        const params = new URLSearchParams();
        
        if (filters.resourceTypeId) {
          params.append('resourceTypeId', filters.resourceTypeId);
        }
        if (filters.search) {
          params.append('search', filters.search);
        }
        if (filters.includeInactive) {
          params.append('includeInactive', 'true');
        }
        if (filters.include_deleted) {
          params.append('include_deleted', 'true');
        }
        
        if (params.toString()) {
          url += `?${params.toString()}`;
        }

        const response = await api.get(url);
        const data = parseResponse(response, 'resources');
        const resources = validateArrayResponse(data, 'Resources');
        
        console.log('✅ Resources fetched successfully:', resources.length);
        return resources;
        
      } catch (error: any) {
        console.error('❌ Resources fetch failed:', error);
        throw new Error(error.response?.data?.error || error.message || 'Failed to fetch resources');
      }
    },
    enabled: !!currentTenant,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
    refetchOnWindowFocus: true,
    retry: (failureCount, error) => {
      console.log(`🔄 Resources retry attempt ${failureCount}:`, error.message);
      return failureCount < 2;
    },
  });
};

/**
 * Get resources by specific type
 */
export const useResourcesByType = (
  resourceTypeId: string | null | undefined,
  additionalFilters: Omit<ResourceFilters, 'resourceTypeId'> = {}
): UseQueryResult<Resource[], Error> => {
  const filters: ResourceFilters = {
    ...additionalFilters,
    resourceTypeId: resourceTypeId || undefined,
  };

  return useResources(filters);
};

/**
 * Get single resource by ID
 */
export const useResource = (
  resourceId: string | null | undefined
): UseQueryResult<Resource, Error> => {
  const { currentTenant } = useAuth();

  return useQuery({
    queryKey: RESOURCE_QUERY_KEYS.detail(resourceId || ''),
    queryFn: async () => {
      console.log('🚀 Fetching resource:', resourceId);
      
      try {
        const response = await api.get(`${API_ENDPOINTS.RESOURCES.LIST}?resourceId=${resourceId}`);
        const data = parseResponse(response, 'single_resource');
        const resources = validateArrayResponse(data, 'SingleResource');
        
        if (resources.length === 0) {
          throw new Error('Resource not found');
        }
        
        console.log('✅ Resource fetched:', resources[0].name);
        return resources[0];
        
      } catch (error: any) {
        console.error('❌ Resource fetch failed:', error);
        throw new Error(error.response?.data?.error || error.message || 'Failed to fetch resource');
      }
    },
    enabled: !!resourceId && !!currentTenant,
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    retry: 2,
  });
};

/**
 * Get next sequence number for a resource type
 */
export const useNextSequence = (
  resourceTypeId: string | null | undefined
): UseQueryResult<number, Error> => {
  const { currentTenant } = useAuth();

  return useQuery({
    queryKey: RESOURCE_QUERY_KEYS.nextSequence(resourceTypeId || ''),
    queryFn: async () => {
      console.log('🚀 Fetching next sequence for:', resourceTypeId);
      
      try {
        const response = await api.get(
          `${API_ENDPOINTS.RESOURCES.LIST}?resourceTypeId=${resourceTypeId}&nextSequence=true`
        );
        const data = parseResponse(response, 'next_sequence');
        
        // Handle the nextSequence response
        if (data && typeof data === 'object' && data.nextSequence) {
          console.log('✅ Next sequence:', data.nextSequence);
          return data.nextSequence;
        }
        
        // Fallback if response format is unexpected
        if (typeof data === 'number') {
          console.log('✅ Next sequence (direct):', data);
          return data;
        }
        
        console.log('✅ Next sequence (fallback):', 1);
        return 1;
        
      } catch (error: any) {
        console.error('❌ Next sequence fetch failed:', error);
        throw new Error(error.response?.data?.error || error.message || 'Failed to fetch next sequence');
      }
    },
    enabled: !!resourceTypeId && !!currentTenant,
    staleTime: 1 * 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000,
    retry: 1,
  });
};

// =================================================================
// MUTATION HOOKS
// =================================================================

/**
 * Create new resource mutation
 */
export const useCreateResource = (): UseMutationResult<
  Resource,
  Error,
  { data: CreateResourceFormData; idempotencyKey?: string },
  unknown
> => {
  const queryClient = useQueryClient();
  const { currentTenant } = useAuth();

  return useMutation({
    mutationFn: async (variables: { data: CreateResourceFormData; idempotencyKey?: string }) => {
      console.log('🚀 Creating resource:', variables.data);
      
      try {
        const requestData = {
          ...variables.data,
          tenant_id: currentTenant?.id,
          is_active: variables.data.is_active !== false,
          is_deletable: variables.data.is_deletable !== false
        };

        const response = await api.post(API_ENDPOINTS.RESOURCES.CREATE, requestData);
        const data = parseResponse(response, 'create_resource');
        const resource = validateObjectResponse(data, 'CreateResource');
        
        console.log('✅ Resource created:', resource);
        return resource;
        
      } catch (error: any) {
        console.error('❌ Create resource failed:', error);
        throw new Error(error.response?.data?.error || error.message || 'Failed to create resource');
      }
    },
    
    onSuccess: (newResource, variables) => {
      // Invalidate and refetch resource lists
      queryClient.invalidateQueries({ 
        queryKey: RESOURCE_QUERY_KEYS.lists() 
      });
      
      // Invalidate next sequence for this type
      queryClient.invalidateQueries({ 
        queryKey: RESOURCE_QUERY_KEYS.nextSequence(newResource.resource_type_id)
      });
      
      // Add the new resource to cache
      queryClient.setQueryData(
        RESOURCE_QUERY_KEYS.detail(newResource.id),
        newResource
      );

      // Show success toast
      toast.success('Resource created successfully!', {
        duration: 3000,
        style: {
          padding: '16px',
          borderRadius: '8px',
          background: '#10B981',
          color: '#FFF',
          fontSize: '14px'
        },
      });
    },
    
    onError: (error) => {
      console.error('❌ Create resource failed:', error);
      
      toast.error(error.message || 'Failed to create resource', {
        duration: 6000,
        style: {
          padding: '16px',
          borderRadius: '8px',
          background: '#EF4444',
          color: '#FFF',
          fontSize: '14px'
        },
      });
    },
  });
};

/**
 * Update resource mutation
 */
export const useUpdateResource = (): UseMutationResult<
  Resource,
  Error,
  { id: string; data: UpdateResourceFormData; idempotencyKey?: string },
  unknown
> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (variables: { id: string; data: UpdateResourceFormData; idempotencyKey?: string }) => {
      console.log('🚀 Updating resource:', variables.id, variables.data);
      
      try {
        const response = await api.patch(`${API_ENDPOINTS.RESOURCES.UPDATE(variables.id)}`, variables.data);
        const data = parseResponse(response, 'update_resource');
        const resource = validateObjectResponse(data, 'UpdateResource');
        
        console.log('✅ Resource updated:', resource);
        return resource;
        
      } catch (error: any) {
        console.error('❌ Update resource failed:', error);
        throw new Error(error.response?.data?.error || error.message || 'Failed to update resource');
      }
    },
    
    onSuccess: (updatedResource, variables) => {
      // Update the specific resource in cache
      queryClient.setQueryData(
        RESOURCE_QUERY_KEYS.detail(updatedResource.id),
        updatedResource
      );
      
      // Invalidate and refetch resource lists
      queryClient.invalidateQueries({ 
        queryKey: RESOURCE_QUERY_KEYS.lists() 
      });

      toast.success('Resource updated successfully!', {
        duration: 3000,
        style: {
          padding: '16px',
          borderRadius: '8px',
          background: '#10B981',
          color: '#FFF',
          fontSize: '14px'
        },
      });
    },
    
    onError: (err, variables, context) => {
      console.error('Update resource failed:', err);
      
      toast.error(err.message || 'Failed to update resource', {
        duration: 4000,
        style: {
          padding: '16px',
          borderRadius: '8px',
          background: '#EF4444',
          color: '#FFF',
          fontSize: '14px'
        },
      });
    },
  });
};

/**
 * Delete resource mutation
 */
export const useDeleteResource = (): UseMutationResult<
  void,
  Error,
  { id: string; idempotencyKey?: string },
  unknown
> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (variables: { id: string; idempotencyKey?: string }) => {
      console.log('🚀 Deleting resource:', variables.id);
      
      try {
        await api.delete(API_ENDPOINTS.RESOURCES.DELETE(variables.id));
        console.log('✅ Resource deleted:', variables.id);
        
      } catch (error: any) {
        console.error('❌ Delete resource failed:', error);
        throw new Error(error.response?.data?.error || error.message || 'Failed to delete resource');
      }
    },
    
    onSuccess: (_, variables) => {
      const { id } = variables;
      
      // Remove the resource from cache
      queryClient.removeQueries({ 
        queryKey: RESOURCE_QUERY_KEYS.detail(id) 
      });
      
      // Invalidate and refetch resource lists
      queryClient.invalidateQueries({ 
        queryKey: RESOURCE_QUERY_KEYS.lists() 
      });
      
      toast.success('Resource deleted successfully!', {
        duration: 3000,
        style: {
          padding: '16px',
          borderRadius: '8px',
          background: '#10B981',
          color: '#FFF',
          fontSize: '14px'
        },
      });
    },
    
    onError: (err) => {
      console.error('Delete resource failed:', err);
      
      toast.error(err.message || 'Failed to delete resource', {
        duration: 4000,
        style: {
          padding: '16px',
          borderRadius: '8px',
          background: '#EF4444',
          color: '#FFF',
          fontSize: '14px'
        },
      });
    },
  });
};

// =================================================================
// COMBINED MANAGER HOOK
// =================================================================

/**
 * Combined hook for resource management (similar to your useResourcesManager)
 */
export const useResourcesManager = (selectedResourceTypeId?: string) => {
  const resourceTypesQuery = useResourceTypes();
  const resourcesQuery = useResourcesByType(selectedResourceTypeId);
  const createResourceMutation = useCreateResource();
  const updateResourceMutation = useUpdateResource();
  const deleteResourceMutation = useDeleteResource();

  return {
    // Data
    resourceTypes: resourceTypesQuery.data || [],
    resources: resourcesQuery.data || [],
    
    // Loading states
    isLoading: resourceTypesQuery.isLoading || resourcesQuery.isLoading,
    isError: resourceTypesQuery.isError || resourcesQuery.isError,
    error: resourceTypesQuery.error || resourcesQuery.error,
    
    // Mutation states
    isCreating: createResourceMutation.isPending,
    isUpdating: updateResourceMutation.isPending,
    isDeleting: deleteResourceMutation.isPending,
    isMutating: createResourceMutation.isPending || updateResourceMutation.isPending || deleteResourceMutation.isPending,
    
    // Operations
    createResourceAsync: createResourceMutation.mutateAsync,
    updateResourceAsync: updateResourceMutation.mutateAsync,
    deleteResourceAsync: deleteResourceMutation.mutateAsync,
    
    // Refetch
    refetchResources: resourcesQuery.refetch,
    refetchResourceTypes: resourceTypesQuery.refetch,
    refetchAll: () => {
      resourceTypesQuery.refetch();
      resourcesQuery.refetch();
    }
  };
};

export default useResourcesManager;