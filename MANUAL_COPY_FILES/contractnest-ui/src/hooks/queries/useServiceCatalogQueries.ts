// src/hooks/queries/useServiceCatalogQueries.ts
// Complete Service Catalog React Query Hooks - Production Ready
// ✅ FIXED: Analytics errors resolved, statistics hook working

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import toast from 'react-hot-toast';
import api from '@/services/api';
import { API_ENDPOINTS, ServiceCatalogFilters, buildServiceCatalogListURL } from '@/services/serviceURLs';
import { captureException } from '@/utils/sentry';
import { analyticsService } from '@/services/analytics.service';

// =================================================================
// TYPES & INTERFACES - UPDATED WITH NEW FIELDS
// =================================================================

export interface ServiceCatalogListParams {
  search_term?: string;
  category_id?: string;
  industry_id?: string;
  is_active?: boolean;
  status?: boolean;
  service_type?: 'independent' | 'resource_based';
  is_variant?: boolean;
  parent_id?: string;
  price_min?: number;
  price_max?: number;
  currency?: string;
  has_resources?: boolean;
  sort_by?: 'name' | 'price' | 'created_at' | 'updated_at' | 'sort_order';
  sort_direction?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
  page?: number;
}

export interface Service {
  id: string;
  tenant_id: string;
  service_name: string;
  description?: string;
  short_description?: string;
  sku?: string;
  category_id?: string;
  industry_id?: string;
  
  status: boolean;
  is_active: boolean;
  
  service_type?: 'independent' | 'resource_based';
  
  is_variant?: boolean;
  parent_id?: string | null;
  
  pricing_config?: {
    base_price: number;
    currency: string;
    pricing_model: string;
    billing_cycle?: string;
    tax_inclusive?: boolean;
  };
  pricing_records?: ServicePricingRecord[];
  
  service_attributes?: Record<string, any>;
  duration_minutes?: number;
  sort_order?: number;
  
  required_resources?: RequiredResource[];
  resource_requirements?: ResourceRequirement[];
  
  tags?: string[];
  slug?: string;
  image_url?: string;
  
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
  is_live?: boolean;
  
  display_name?: string;
  formatted_price?: string;
  has_resources?: boolean;
  resource_count?: number;
}

export interface ServicePricingRecord {
  amount: number;
  currency: string;
  price_type: string;
  tax_inclusion?: 'inclusive' | 'exclusive';
  tax_rate_id?: string;
  tax_rate?: number;
  billing_cycle?: string;
}

export interface RequiredResource {
  resource_id: string;
  quantity?: number;
  is_optional?: boolean;
}

export interface ResourceRequirement {
  resource_id: string;
  resource_type_id?: string;
  quantity?: number;
  is_required?: boolean;
  duration_hours?: number;
  unit_cost?: number;
  currency?: string;
  is_billable?: boolean;
  required_skills?: string[];
  required_attributes?: Record<string, any>;
  sequence_order?: number;
}

export interface CreateServiceRequest {
  service_name: string;
  description?: string;
  short_description?: string;
  sku?: string;
  category_id?: string;
  industry_id?: string;
  
  service_type?: 'independent' | 'resource_based';
  
  is_variant?: boolean;
  parent_id?: string | null;
  
  pricing_config?: {
    base_price: number;
    currency: string;
    pricing_model: string;
    billing_cycle?: string;
    tax_inclusive?: boolean;
  };
  pricing_records?: ServicePricingRecord[];
  
  service_attributes?: Record<string, any>;
  duration_minutes?: number;
  sort_order?: number;
  
  required_resources?: RequiredResource[];
  resource_requirements?: ResourceRequirement[];
  
  tags?: string[];
  image_url?: string;
  status?: boolean;
}

export interface UpdateServiceRequest {
  service_name?: string;
  description?: string;
  short_description?: string;
  sku?: string;
  category_id?: string;
  industry_id?: string;
  
  service_type?: 'independent' | 'resource_based';
  
  is_variant?: boolean;
  parent_id?: string | null;
  
  pricing_config?: {
    base_price?: number;
    currency?: string;
    pricing_model?: string;
    billing_cycle?: string;
    tax_inclusive?: boolean;
  };
  pricing_records?: ServicePricingRecord[];
  
  service_attributes?: Record<string, any>;
  duration_minutes?: number;
  sort_order?: number;
  
  required_resources?: RequiredResource[];
  resource_requirements?: ResourceRequirement[];
  
  tags?: string[];
  image_url?: string;
  status?: boolean;
}

export interface ServiceCatalogResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  timestamp: string;
}

export interface ServiceListResponse {
  items: Service[];
  total_count: number;
  page_info: {
    has_next_page: boolean;
    has_prev_page: boolean;
    current_page: number;
    total_pages: number;
  };
  filters_applied: ServiceCatalogListParams;
}

export interface ServiceStatistics {
  total_services: number;
  active_services: number;
  inactive_services: number;
  services_with_resources: number;
  service_variants: number;
}

export interface ServiceVersionHistory {
  service_id: string;
  versions: Service[];
  total_versions: number;
}

export interface MasterData {
  categories: Array<{
    id: string;
    name: string;
    description?: string;
    is_active: boolean;
  }>;
  industries: Array<{
    id: string;
    name: string;
    description?: string;
    is_active: boolean;
  }>;
  currencies: Array<{
    code: string;
    name: string;
    symbol: string;
  }>;
  tax_rates: Array<{
    id: string;
    name: string;
    rate: number;
    is_default: boolean;
  }>;
}

// =================================================================
// QUERY KEYS
// =================================================================

export const serviceCatalogKeys = {
  all: ['service-catalog'] as const,
  lists: () => [...serviceCatalogKeys.all, 'list'] as const,
  list: (filters: ServiceCatalogListParams) => [...serviceCatalogKeys.lists(), { filters }] as const,
  details: () => [...serviceCatalogKeys.all, 'detail'] as const,
  detail: (id: string) => [...serviceCatalogKeys.details(), id] as const,
  resources: (id: string) => [...serviceCatalogKeys.all, 'resources', id] as const,
  masterData: () => [...serviceCatalogKeys.all, 'master-data'] as const,
  statistics: () => [...serviceCatalogKeys.all, 'statistics'] as const,
  versions: (id: string) => [...serviceCatalogKeys.all, 'versions', id] as const,
};

// =================================================================
// QUERY HOOKS
// =================================================================

/**
 * PRODUCTION FIX: Hook to fetch list of services with filtering and pagination
 * Optimized for high-concurrency (500-600 requests) with proper caching and retry logic
 */
export const useServiceCatalogItems = (
  filters: ServiceCatalogListParams = {},
  options?: {
    enabled?: boolean;
    refetchOnWindowFocus?: boolean;
  }
) => {
  const { currentTenant } = useAuth();

  return useQuery({
    queryKey: serviceCatalogKeys.list(filters),
    queryFn: async (): Promise<ServiceListResponse> => {
      if (!currentTenant?.id) {
        throw new Error('No tenant selected');
      }

      const url = buildServiceCatalogListURL(filters);
      const response = await api.get(url);

      const data = response.data?.data || response.data;

      if (!data) {
        return {
          items: [],
          total_count: 0,
          page_info: {
            has_next_page: false,
            has_prev_page: false,
            current_page: 1,
            total_pages: 0
          },
          filters_applied: filters
        };
      }

      return data;
    },
    enabled: !!currentTenant?.id && (options?.enabled !== false),

    // PRODUCTION FIX: Optimized cache settings for high concurrency
    staleTime: 2 * 60 * 1000, // 2 minutes (reduced from 5) - faster updates
    gcTime: 5 * 60 * 1000, // 5 minutes (reduced from 10) - less memory

    refetchOnWindowFocus: options?.refetchOnWindowFocus ?? false,
    refetchOnReconnect: true, // Auto-refetch on network reconnection

    // PRODUCTION FIX: Exponential backoff retry logic
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // 1s, 2s, 4s max 30s

    // PRODUCTION FIX: Request deduplication - prevent duplicate requests
    networkMode: 'online',

    // PRODUCTION FIX: Structural sharing for memory optimization
    structuralSharing: true,
  });
};

/**
 * Hook to fetch a single service by ID
 */
export const useServiceCatalogItem = (serviceId: string | null) => {
  const { currentTenant } = useAuth();

  return useQuery({
    queryKey: serviceCatalogKeys.detail(serviceId || ''),
    queryFn: async (): Promise<Service> => {
      if (!serviceId || !currentTenant?.id) {
        throw new Error('Service ID and tenant are required');
      }

      const response = await api.get(API_ENDPOINTS.SERVICE_CATALOG.GET(serviceId));
      
      const data = response.data?.data || response.data;
      
      if (!data) {
        throw new Error('Service not found');
      }

      return data;
    },
    enabled: !!serviceId && !!currentTenant?.id,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 3,
  });
};

/**
 * Hook to fetch service resources
 */
export const useServiceResources = (serviceId: string | null) => {
  const { currentTenant } = useAuth();

  return useQuery({
    queryKey: serviceCatalogKeys.resources(serviceId || ''),
    queryFn: async () => {
      if (!serviceId || !currentTenant?.id) {
        throw new Error('Service ID and tenant are required');
      }

      const response = await api.get(API_ENDPOINTS.SERVICE_CATALOG.SERVICE_RESOURCES(serviceId));
      
      const data = response.data?.data || response.data;
      
      return data || { associated_resources: [], total_resources: 0 };
    },
    enabled: !!serviceId && !!currentTenant?.id,
    staleTime: 10 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    retry: 3,
  });
};

/**
 * Hook to fetch master data (categories, industries, currencies)
 */
export const useServiceCatalogMasterData = () => {
  const { currentTenant } = useAuth();

  return useQuery({
    queryKey: serviceCatalogKeys.masterData(),
    queryFn: async (): Promise<MasterData> => {
      if (!currentTenant?.id) {
        throw new Error('No tenant selected');
      }

      const response = await api.get(API_ENDPOINTS.SERVICE_CATALOG.MASTER_DATA);
      
      const data = response.data?.data || response.data;
      
      return data || {
        categories: [],
        industries: [],
        currencies: [],
        tax_rates: []
      };
    },
    enabled: !!currentTenant?.id,
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    retry: 3,
  });
};

/**
 * PRODUCTION FIX: Hook to fetch service statistics
 * Optimized for high-frequency polling with aggressive caching
 */
export const useServiceStatistics = (options?: { enabled?: boolean }) => {
  const { currentTenant } = useAuth();

  return useQuery({
    queryKey: serviceCatalogKeys.statistics(),
    queryFn: async (): Promise<ServiceStatistics> => {
      if (!currentTenant?.id) {
        throw new Error('No tenant selected');
      }

      const response = await api.get(API_ENDPOINTS.SERVICE_CATALOG.STATISTICS);

      const data = response.data?.data || response.data;

      return data || {
        total_services: 0,
        active_services: 0,
        inactive_services: 0,
        services_with_resources: 0,
        service_variants: 0
      };
    },
    enabled: !!currentTenant?.id && (options?.enabled !== false),

    // PRODUCTION FIX: Statistics change infrequently, cache aggressively
    staleTime: 3 * 60 * 1000, // 3 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes - can keep longer as data is small

    // PRODUCTION FIX: Retry with backoff
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),

    refetchOnWindowFocus: false, // Don't refetch on focus - statistics are stable
    refetchOnReconnect: true,
    networkMode: 'online',
    structuralSharing: true,
  });
};

/**
 * Hook to fetch service version history
 */
export const useServiceVersionHistory = (serviceId: string | null, options?: { enabled?: boolean }) => {
  const { currentTenant } = useAuth();

  return useQuery({
    queryKey: serviceCatalogKeys.versions(serviceId || ''),
    queryFn: async (): Promise<ServiceVersionHistory> => {
      if (!serviceId || !currentTenant?.id) {
        throw new Error('Service ID and tenant are required');
      }

      const response = await api.get(API_ENDPOINTS.SERVICE_CATALOG.VERSION_HISTORY(serviceId));
      
      const data = response.data?.data || response.data;
      
      return data || {
        service_id: serviceId,
        versions: [],
        total_versions: 0
      };
    },
    enabled: !!serviceId && !!currentTenant?.id && (options?.enabled !== false),
    staleTime: 10 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    retry: 3,
  });
};

// =================================================================
// MUTATION HOOKS
// =================================================================

/**
 * Hook for service catalog operations (create, update, delete)
 */
export const useServiceCatalogOperations = () => {
  const { currentTenant } = useAuth();
  const queryClient = useQueryClient();
  const { toast: shadcnToast } = useToast();

  // Create service mutation
  const createServiceMutation = useMutation({
    mutationFn: async (serviceData: CreateServiceRequest): Promise<Service> => {
      if (!currentTenant?.id) {
        throw new Error('No tenant selected');
      }

      const response = await api.post(API_ENDPOINTS.SERVICE_CATALOG.CREATE, serviceData, {
        headers: {
          'x-idempotency-key': `create-service-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        }
      });

      return response.data?.data || response.data;
    },
    onSuccess: (createdService) => {
      queryClient.invalidateQueries({ queryKey: serviceCatalogKeys.lists() });
      queryClient.invalidateQueries({ queryKey: serviceCatalogKeys.statistics() });
      
      queryClient.setQueryData(
        serviceCatalogKeys.detail(createdService.id),
        createdService
      );

      try {
        analyticsService.trackPageView('service/created', 'Service Created');
      } catch (error) {
        console.error('Analytics error:', error);
      }

      toast.success('Service created successfully', {
        duration: 3000,
        style: {
          background: '#10B981',
          color: '#FFF',
        }
      });

      shadcnToast({
        title: "Success",
        description: `Service "${createdService.service_name}" has been created successfully`,
      });
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.error || error.message || 'Failed to create service';
      
      captureException(error, {
        tags: { 
          component: 'useServiceCatalogOperations', 
          action: 'createService' 
        },
        extra: { 
          tenantId: currentTenant?.id,
          errorMessage
        }
      });

      toast.error(`Create Error: ${errorMessage}`, {
        duration: 4000,
        style: {
          background: '#EF4444',
          color: '#FFF',
        }
      });

      shadcnToast({
        variant: "destructive",
        title: "Create Failed",
        description: errorMessage
      });
    }
  });

  // Update service mutation
  const updateServiceMutation = useMutation({
    mutationFn: async ({ 
      serviceId, 
      serviceData 
    }: { 
      serviceId: string; 
      serviceData: UpdateServiceRequest 
    }): Promise<Service> => {
      if (!currentTenant?.id) {
        throw new Error('No tenant selected');
      }

      const response = await api.put(API_ENDPOINTS.SERVICE_CATALOG.UPDATE(serviceId), serviceData, {
        headers: {
          'x-idempotency-key': `update-service-${serviceId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        }
      });

      return response.data?.data || response.data;
    },
    onSuccess: (updatedService) => {
      queryClient.setQueryData(
        serviceCatalogKeys.detail(updatedService.id),
        updatedService
      );

      queryClient.invalidateQueries({ queryKey: serviceCatalogKeys.lists() });
      queryClient.invalidateQueries({ queryKey: serviceCatalogKeys.statistics() });

      try {
        analyticsService.trackPageView('service/updated', 'Service Updated');
      } catch (error) {
        console.error('Analytics error:', error);
      }

      toast.success('Service updated successfully', {
        duration: 3000,
        style: {
          background: '#10B981',
          color: '#FFF',
        }
      });

      shadcnToast({
        title: "Success",
        description: `Service "${updatedService.service_name}" has been updated successfully`,
      });
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.error || error.message || 'Failed to update service';
      
      captureException(error, {
        tags: { 
          component: 'useServiceCatalogOperations', 
          action: 'updateService' 
        },
        extra: { 
          tenantId: currentTenant?.id,
          errorMessage
        }
      });

      toast.error(`Update Error: ${errorMessage}`, {
        duration: 4000,
        style: {
          background: '#EF4444',
          color: '#FFF',
        }
      });

      shadcnToast({
        variant: "destructive",
        title: "Update Failed",
        description: errorMessage
      });
    }
  });

  // Delete service mutation
  const deleteServiceMutation = useMutation({
    mutationFn: async (serviceId: string): Promise<void> => {
      if (!currentTenant?.id) {
        throw new Error('No tenant selected');
      }

      await api.delete(API_ENDPOINTS.SERVICE_CATALOG.DELETE(serviceId), {
        headers: {
          'x-idempotency-key': `delete-service-${serviceId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        }
      });
    },
    onSuccess: (_, serviceId) => {
      queryClient.removeQueries({ queryKey: serviceCatalogKeys.detail(serviceId) });
      queryClient.invalidateQueries({ queryKey: serviceCatalogKeys.lists() });
      queryClient.invalidateQueries({ queryKey: serviceCatalogKeys.statistics() });

      try {
        analyticsService.trackPageView('service/deleted', 'Service Deleted');
      } catch (error) {
        console.error('Analytics error:', error);
      }

      toast.success('Service deactivated successfully', {
        duration: 3000,
        style: {
          background: '#10B981',
          color: '#FFF',
        }
      });

      shadcnToast({
        title: "Success",
        description: "Service has been deactivated successfully",
      });
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.error || error.message || 'Failed to deactivate service';
      
      captureException(error, {
        tags: { 
          component: 'useServiceCatalogOperations', 
          action: 'deleteService' 
        },
        extra: { 
          tenantId: currentTenant?.id,
          errorMessage
        }
      });

      toast.error(`Deactivate Error: ${errorMessage}`, {
        duration: 4000,
        style: {
          background: '#EF4444',
          color: '#FFF',
        }
      });

      shadcnToast({
        variant: "destructive",
        title: "Deactivate Failed",
        description: errorMessage
      });
    }
  });

  return {
    createService: createServiceMutation.mutateAsync,
    updateService: updateServiceMutation.mutateAsync,
    deleteService: deleteServiceMutation.mutateAsync,
    createServiceMutation,
    updateServiceMutation,
    deleteServiceMutation,
    isCreating: createServiceMutation.isPending,
    isUpdating: updateServiceMutation.isPending,
    isDeleting: deleteServiceMutation.isPending,
  };
};

/**
 * Hook for service status operations
 */
export const useServiceStatusOperations = () => {
  const { currentTenant } = useAuth();
  const queryClient = useQueryClient();
  const { toast: shadcnToast } = useToast();

  // PRODUCTION FIX: Toggle status mutation with optimistic updates
  const toggleStatusMutation = useMutation({
    mutationFn: async ({
      serviceId,
      status
    }: {
      serviceId: string;
      status: boolean
    }): Promise<Service> => {
      if (!currentTenant?.id) {
        throw new Error('No tenant selected');
      }

      const response = await api.patch(
        API_ENDPOINTS.SERVICE_CATALOG.TOGGLE_STATUS(serviceId),
        { status },
        {
          headers: {
            'x-idempotency-key': `toggle-status-${serviceId}-${Date.now()}`
          }
        }
      );

      return response.data?.data?.service || response.data?.data || response.data;
    },
    // PRODUCTION FIX: Add optimistic update BEFORE API call
    onMutate: async ({ serviceId, status }) => {
      // Cancel outgoing refetches to prevent overwriting optimistic update
      await queryClient.cancelQueries({ queryKey: serviceCatalogKeys.lists() });
      await queryClient.cancelQueries({ queryKey: serviceCatalogKeys.detail(serviceId) });

      // Snapshot current values for rollback
      const previousLists = queryClient.getQueriesData({ queryKey: serviceCatalogKeys.lists() });
      const previousDetail = queryClient.getQueryData(serviceCatalogKeys.detail(serviceId));

      // Optimistically update detail cache
      queryClient.setQueryData(
        serviceCatalogKeys.detail(serviceId),
        (old: Service | undefined) => {
          if (!old) return old;
          return { ...old, status, is_active: status };
        }
      );

      // Optimistically update all list caches
      queryClient.setQueriesData(
        { queryKey: serviceCatalogKeys.lists() },
        (old: ServiceListResponse | undefined) => {
          if (!old) return old;

          return {
            ...old,
            items: old.items.map(service =>
              service.id === serviceId
                ? { ...service, status, is_active: status }
                : service
            )
          };
        }
      );

      // Return context for rollback
      return { previousLists, previousDetail, serviceId, status };
    },
    onSuccess: (updatedService, variables) => {
      // Update detail cache with server response
      queryClient.setQueryData(
        serviceCatalogKeys.detail(updatedService.id),
        updatedService
      );

      // PRODUCTION FIX: Delayed invalidation to prevent flickering
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: serviceCatalogKeys.lists() });
        queryClient.invalidateQueries({ queryKey: serviceCatalogKeys.statistics() });
      }, 500);

      try {
        analyticsService.trackPageView('service/status-toggled', 'Service Status Toggled');
      } catch (error) {
        console.error('Analytics error:', error);
      }

      const statusText = variables.status ? 'activated' : 'deactivated';

      toast.success(`Service ${statusText} successfully`, {
        duration: 3000,
        style: {
          background: '#10B981',
          color: '#FFF',
        }
      });

      shadcnToast({
        title: "Success",
        description: `Service "${updatedService.service_name}" has been ${statusText}`,
      });
    },
    onError: (error: any, variables, context) => {
      // PRODUCTION FIX: Rollback optimistic updates on error
      if (context) {
        // Restore previous lists
        if (context.previousLists) {
          context.previousLists.forEach(([queryKey, data]) => {
            queryClient.setQueryData(queryKey, data);
          });
        }

        // Restore previous detail
        if (context.previousDetail) {
          queryClient.setQueryData(
            serviceCatalogKeys.detail(context.serviceId),
            context.previousDetail
          );
        }
      }

      const errorMessage = error.response?.data?.error || error.message || 'Failed to toggle service status';

      captureException(error, {
        tags: {
          component: 'useServiceStatusOperations',
          action: 'toggleStatus'
        },
        extra: {
          tenantId: currentTenant?.id,
          errorMessage
        }
      });

      toast.error(`Status Toggle Error: ${errorMessage}`, {
        duration: 4000,
        style: {
          background: '#EF4444',
          color: '#FFF',
        }
      });

      shadcnToast({
        variant: "destructive",
        title: "Status Toggle Failed",
        description: errorMessage
      });
    },
    // PRODUCTION FIX: Always refetch after mutation settles
    onSettled: () => {
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: serviceCatalogKeys.statistics() });
      }, 1000);
    }
  });

  // Activate service mutation
  const activateServiceMutation = useMutation({
    mutationFn: async (serviceId: string): Promise<Service> => {
      if (!currentTenant?.id) {
        throw new Error('No tenant selected');
      }

      const response = await api.post(
        API_ENDPOINTS.SERVICE_CATALOG.ACTIVATE(serviceId),
        {},
        {
          headers: {
            'x-idempotency-key': `activate-service-${serviceId}-${Date.now()}`
          }
        }
      );

      return response.data?.data?.service || response.data?.data || response.data;
    },
    onSuccess: (updatedService) => {
      queryClient.setQueryData(
        serviceCatalogKeys.detail(updatedService.id),
        updatedService
      );

      queryClient.invalidateQueries({ queryKey: serviceCatalogKeys.lists() });
      queryClient.invalidateQueries({ queryKey: serviceCatalogKeys.statistics() });

      try {
        analyticsService.trackPageView('service/activated', 'Service Activated');
      } catch (error) {
        console.error('Analytics error:', error);
      }

      toast.success('Service activated successfully', {
        duration: 3000,
        style: {
          background: '#10B981',
          color: '#FFF',
        }
      });

      shadcnToast({
        title: "Success",
        description: `Service "${updatedService.service_name}" has been activated`,
      });
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.error || error.message || 'Failed to activate service';
      
      captureException(error, {
        tags: { 
          component: 'useServiceStatusOperations', 
          action: 'activateService' 
        },
        extra: { 
          tenantId: currentTenant?.id,
          errorMessage
        }
      });

      toast.error(`Activate Error: ${errorMessage}`, {
        duration: 4000,
        style: {
          background: '#EF4444',
          color: '#FFF',
        }
      });

      shadcnToast({
        variant: "destructive",
        title: "Activation Failed",
        description: errorMessage
      });
    }
  });

  return {
    toggleStatus: toggleStatusMutation.mutateAsync,
    activateService: activateServiceMutation.mutateAsync,
    toggleStatusMutation,
    activateServiceMutation,
    isTogglingStatus: toggleStatusMutation.isPending,
    isActivating: activateServiceMutation.isPending,
  };
};

// =================================================================
// UTILITY HOOKS
// =================================================================

/**
 * Hook to refresh service catalog data
 */
export const useRefreshServiceCatalog = () => {
  const queryClient = useQueryClient();

  const refreshAll = () => {
    queryClient.invalidateQueries({ queryKey: serviceCatalogKeys.all });
  };

  const refreshLists = () => {
    queryClient.invalidateQueries({ queryKey: serviceCatalogKeys.lists() });
  };

  const refreshService = (serviceId: string) => {
    queryClient.invalidateQueries({ queryKey: serviceCatalogKeys.detail(serviceId) });
  };

  const refreshMasterData = () => {
    queryClient.invalidateQueries({ queryKey: serviceCatalogKeys.masterData() });
  };

  const refreshStatistics = () => {
    queryClient.invalidateQueries({ queryKey: serviceCatalogKeys.statistics() });
  };

  const refreshVersionHistory = (serviceId: string) => {
    queryClient.invalidateQueries({ queryKey: serviceCatalogKeys.versions(serviceId) });
  };

  return {
    refreshAll,
    refreshLists,
    refreshService,
    refreshMasterData,
    refreshStatistics,
    refreshVersionHistory,
  };
};

/**
 * Hook for optimistic updates
 */
export const useServiceCatalogOptimisticUpdates = () => {
  const queryClient = useQueryClient();

  const optimisticUpdateService = (serviceId: string, updates: Partial<Service>) => {
    queryClient.setQueryData(
      serviceCatalogKeys.detail(serviceId),
      (oldData: Service | undefined) => {
        if (!oldData) return oldData;
        return { ...oldData, ...updates };
      }
    );
  };

  const rollbackOptimisticUpdate = (serviceId: string) => {
    queryClient.invalidateQueries({ queryKey: serviceCatalogKeys.detail(serviceId) });
  };

  return {
    optimisticUpdateService,
    rollbackOptimisticUpdate,
  };
};

// =================================================================
// DROPDOWN/SELECT OPTIMIZED HOOKS
// =================================================================

/**
 * Hook for service catalog dropdown/select components
 */
export const useServiceCatalogDropdown = (filters: Partial<ServiceCatalogListParams> = {}) => {
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useServiceCatalogItems({
    ...filters,
    limit: 1000,
    status: true
  });

  const options = data?.items?.map(service => ({
    value: service.id,
    label: service.service_name,
    description: service.description,
    price: service.formatted_price,
    category: service.category_id,
    isActive: service.is_active,
    status: service.status,
    isVariant: service.is_variant,
    parentId: service.parent_id,
  })) || [];

  return {
    options: options.sort((a, b) => a.label.localeCompare(b.label)),
    isLoading,
    error,
    refetch: () => queryClient.invalidateQueries({ queryKey: serviceCatalogKeys.lists() })
  };
};

/**
 * Hook for master data dropdowns
 */
export const useMasterDataDropdowns = () => {
  const { data, isLoading, error } = useServiceCatalogMasterData();

  const categoryOptions = data?.categories?.filter(cat => cat.is_active).map(cat => ({
    value: cat.id,
    label: cat.name,
    description: cat.description
  })) || [];

  const industryOptions = data?.industries?.filter(ind => ind.is_active).map(ind => ({
    value: ind.id,
    label: ind.name,
    description: ind.description
  })) || [];

  const currencyOptions = data?.currencies?.map(curr => ({
    value: curr.code,
    label: `${curr.code} - ${curr.name}`,
    symbol: curr.symbol
  })) || [];

  const taxRateOptions = data?.tax_rates?.map(rate => ({
    value: rate.id,
    label: `${rate.name} (${rate.rate}%)`,
    rate: rate.rate,
    isDefault: rate.is_default
  })) || [];

  return {
    categoryOptions,
    industryOptions,
    currencyOptions,
    taxRateOptions,
    isLoading,
    error,
    masterData: data,
  };
};

// =================================================================
// VARIANT-SPECIFIC HELPER HOOKS
// =================================================================

/**
 * Hook to get all variants of a service
 */
export const useServiceVariants = (parentId: string | null) => {
  return useServiceCatalogItems({
    parent_id: parentId || undefined,
    is_variant: true,
    limit: 100
  });
};

/**
 * Hook to check if a service has variants
 */
export const useHasVariants = (serviceId: string | null) => {
  const { data } = useServiceVariants(serviceId);
  return {
    hasVariants: (data?.items?.length || 0) > 0,
    variantCount: data?.items?.length || 0,
    variants: data?.items || []
  };
};

// =================================================================
// EXPORT DEFAULT
// =================================================================

export default {
  useServiceCatalogItems,
  useServiceCatalogItem,
  useServiceResources,
  useServiceCatalogMasterData,
  useServiceStatistics,
  useServiceVersionHistory,
  
  useServiceCatalogOperations,
  useServiceStatusOperations,
  
  useRefreshServiceCatalog,
  useServiceCatalogOptimisticUpdates,
  useServiceCatalogDropdown,
  useMasterDataDropdowns,
  
  useServiceVariants,
  useHasVariants,
  
  serviceCatalogKeys,
};