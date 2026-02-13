// src/hooks/queries/useProductMasterdata.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import toast from 'react-hot-toast';
import api from '@/services/api';
import { 
  API_ENDPOINTS, 
  buildGlobalMasterDataURL, 
  buildTenantMasterDataURL,
  buildGlobalCategoriesURL,
  buildTenantCategoriesURL,
  buildIndustriesURL,
  buildAllCategoriesURL,
  buildIndustryCategoriesURL,
  buildPrimaryIndustryCategoriesURL,
  type IndustryFilters,
  type CategoryFilters,
  type IndustryCategoryFilters,
  type Industry,
  type CategoryIndustryMap,
  type IndustryResponse,
  type CategoryMapResponse,
  type PaginationMetadata
} from '@/services/serviceURLs';
import { captureException } from '@/utils/sentry';
import { analyticsService } from '@/services/analytics.service';

// =================================================================
// TYPES - Enhanced with Tax Management Types
// =================================================================

// Existing types (preserved)
export interface CategoryDetail {
  id: string;
  category_id: string;
  detail_name: string;
  detail_value: string;
  description: string | null;
  sequence_no: number;
  is_active: boolean;
  tenant_id?: string;
  created_at: string;
  updated_at: string;
  display_name?: string;
  is_selectable?: boolean;
}

export interface CategoryMaster {
  id: string;
  category_name: string;
  description: string | null;
  sequence_no: number;
  is_active: boolean;
  tenant_id?: string;
  created_at: string;
  updated_at: string;
}

export interface CategoryInfo {
  id: string;
  name: string;
  description: string | null;
}

export interface MasterDataResponse {
  success: boolean;
  data?: CategoryDetail[];
  category_info?: CategoryInfo;
  tenant_id?: string;
  total_count?: number;
  error?: string;
  code?: string;
  message?: string;
  timestamp?: string;
}

export interface CategoryListResponse {
  success: boolean;
  data?: CategoryMaster[];
  total_count?: number;
  tenant_id?: string;
  error?: string;
  code?: string;
  message?: string;
  timestamp?: string;
}

// NEW: Tax Management Types
export interface TaxRate {
  id: string;
  name: string;
  rate: number;
  description?: string | null;
  sequence_no: number;
  is_default: boolean;
  is_active: boolean;
  tenant_id: string;
  created_at: string;
  updated_at: string;
}

export interface TaxRateWithUI extends TaxRate {
  isEditing: boolean;
  isLoading: boolean;
  hasUnsavedChanges: boolean;
}

export interface TaxSettings {
  id: string;
  display_mode: 'including_tax' | 'excluding_tax';
  default_tax_rate_id: string | null;
  tenant_id: string;
  created_at: string;
  updated_at: string;
}

export interface TaxRateFormData {
  name: string;
  rate: number;
  description?: string;
  sequence_no?: number;
  is_default?: boolean;
  is_active?: boolean;
}

export interface TaxDisplayFormData {
  display_mode: 'including_tax' | 'excluding_tax';
}

export interface TaxRatesResponse {
  success: boolean;
  rates?: TaxRate[];
  settings?: TaxSettings;
  error?: string;
  message?: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

// Tax state management types
export interface TaxRatesState {
  loading: boolean;
  saving: boolean;
  data: TaxRateWithUI[];
  error: string | null;
  editingId: string | null;
  deletingId: string | null;
  isAdding: boolean;
}

export interface TaxDisplayState {
  loading: boolean;
  saving: boolean;
  data: TaxSettings | null;
  error: string | null;
  hasUnsavedChanges: boolean;
}

// Validation constants
export const VALIDATION_RULES = {
  TAX_NAME: {
    MAX_LENGTH: 100,
    PATTERN: /^[a-zA-Z0-9\s\-_.,()%]+$/
  },
  TAX_RATE: {
    MIN: 0,
    MAX: 100
  },
  DESCRIPTION: {
    MAX_LENGTH: 255
  },
  SEQUENCE: {
    MIN: 1,
    MAX: 999
  }
};

export const ERROR_MESSAGES = {
  REQUIRED_FIELD: 'This field is required',
  NAME_TOO_LONG: `Name must be ${VALIDATION_RULES.TAX_NAME.MAX_LENGTH} characters or less`,
  INVALID_NAME: 'Name contains invalid characters',
  INVALID_RATE: `Rate must be between ${VALIDATION_RULES.TAX_RATE.MIN}% and ${VALIDATION_RULES.TAX_RATE.MAX}%`,
  DESCRIPTION_TOO_LONG: `Description must be ${VALIDATION_RULES.DESCRIPTION.MAX_LENGTH} characters or less`,
  INVALID_SEQUENCE: `Sequence must be between ${VALIDATION_RULES.SEQUENCE.MIN} and ${VALIDATION_RULES.SEQUENCE.MAX}`,
  LOAD_ERROR: 'Failed to load data. Please try again.',
  SAVE_ERROR: 'Failed to save changes. Please try again.',
  DELETE_ERROR: 'Failed to delete item. Please try again.',
  DEFAULT_RATE_DELETE: 'Cannot delete the default tax rate. Please set another rate as default first.'
};

// Common category names as constants for type safety
export const CATEGORY_NAMES = {
  PRICING_TYPE: 'pricing_type',
  STATUS_TYPE: 'status_type',
  PRIORITY_TYPE: 'priority_type',
  CLASSIFICATION_TYPE: 'classification_type',
  DOCUMENT_TYPE: 'document_type',
  CURRENCY_TYPE: 'currency_type',
  CONTACT_TYPE: 'contact_type',
  PAYMENT_TERMS: 'payment_terms',
  DELIVERY_TERMS: 'delivery_terms',
  CUSTOM_FIELDS: 'custom_fields',
  // NEW: Tax-related categories
  TAX_RATES: 'tax_rates',
  TAX_SETTINGS: 'tax_settings',
  // NEW: Platform products (Business Model Step 1)
  X_PRODUCT: 'X-Product'
} as const;

export type CategoryName = typeof CATEGORY_NAMES[keyof typeof CATEGORY_NAMES];

// Filters interface
export interface ProductMasterDataFilters {
  category_name: CategoryName | string;
  is_active?: boolean;
}

export interface CategoryListFilters {
  is_active?: boolean;
}

// =================================================================
// QUERY KEYS - Enhanced with Tax Keys
// =================================================================

export const productMasterdataKeys = {
  // Base keys
  all: ['product-masterdata'] as const,
  global: () => [...productMasterdataKeys.all, 'global'] as const,
  tenant: (tenantId: string) => [...productMasterdataKeys.all, 'tenant', tenantId] as const,
  
  // Global keys
  globalCategory: (categoryName: string, isActive?: boolean) => 
    [...productMasterdataKeys.global(), 'category', categoryName, { isActive }] as const,
  globalCategories: (isActive?: boolean) => 
    [...productMasterdataKeys.global(), 'categories', { isActive }] as const,
  
  // Tenant keys
  tenantCategory: (tenantId: string, categoryName: string, isActive?: boolean) => 
    [...productMasterdataKeys.tenant(tenantId), 'category', categoryName, { isActive }] as const,
  tenantCategories: (tenantId: string, isActive?: boolean) => 
    [...productMasterdataKeys.tenant(tenantId), 'categories', { isActive }] as const,
  
  // Industry-first onboarding keys
  industries: (filters?: IndustryFilters) => 
    [...productMasterdataKeys.all, 'industries', filters] as const,
  allCategories: (filters?: CategoryFilters) => 
    [...productMasterdataKeys.all, 'all-categories', filters] as const,
  industryCategories: (industryId: string, filters?: IndustryCategoryFilters) => 
    [...productMasterdataKeys.all, 'industry-categories', industryId, filters] as const,
  
  // NEW: Tax management keys
  taxRates: (tenantId: string) => 
    [...productMasterdataKeys.tenant(tenantId), 'tax-rates'] as const,
  taxSettings: (tenantId: string) => 
    [...productMasterdataKeys.tenant(tenantId), 'tax-settings'] as const,
  taxAll: (tenantId: string) => 
    [...productMasterdataKeys.tenant(tenantId), 'tax-all'] as const,
  
  // Utility keys
  constants: () => [...productMasterdataKeys.all, 'constants'] as const,
  health: () => [...productMasterdataKeys.all, 'health'] as const,
};

// =================================================================
// EXISTING HOOKS (Preserved - No Changes)
// =================================================================

/**
 * Hook to fetch global master data for a specific category
 */
export const useGlobalMasterData = (
  categoryName: CategoryName | string,
  isActive: boolean = true
) => {
  return useQuery({
    queryKey: productMasterdataKeys.globalCategory(categoryName, isActive),
    queryFn: async (): Promise<MasterDataResponse> => {
      const url = buildGlobalMasterDataURL(categoryName, isActive);
      const response = await api.get(url);
      return response.data;
    },
    enabled: !!categoryName,
    staleTime: 30 * 60 * 1000, // 30 minutes
    gcTime: 60 * 60 * 1000,    // 1 hour cache
    retry: 3,
  });
};

/**
 * Hook to fetch all global categories
 */
export const useGlobalCategories = (isActive: boolean = true) => {
  return useQuery({
    queryKey: productMasterdataKeys.globalCategories(isActive),
    queryFn: async (): Promise<CategoryListResponse> => {
      const url = buildGlobalCategoriesURL(isActive);
      const response = await api.get(url);
      return response.data;
    },
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    retry: 3,
  });
};

/**
 * Hook to fetch tenant-specific master data for a category
 */
export const useTenantMasterData = (
  categoryName: CategoryName | string,
  isActive: boolean = true
) => {
  const { currentTenant } = useAuth();

  return useQuery({
    queryKey: productMasterdataKeys.tenantCategory(
      currentTenant?.id || '', 
      categoryName, 
      isActive
    ),
    queryFn: async (): Promise<MasterDataResponse> => {
      if (!currentTenant?.id) {
        throw new Error('Tenant ID is required for tenant master data');
      }

      const url = buildTenantMasterDataURL(categoryName, isActive);
      const response = await api.get(url, {
        headers: {
          'x-tenant-id': currentTenant.id
        }
      });
      return response.data;
    },
    enabled: !!currentTenant?.id && !!categoryName,
    staleTime: 15 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: 3,
  });
};

/**
 * Hook to fetch all tenant categories
 */
export const useTenantCategories = (isActive: boolean = true) => {
  const { currentTenant } = useAuth();

  return useQuery({
    queryKey: productMasterdataKeys.tenantCategories(
      currentTenant?.id || '', 
      isActive
    ),
    queryFn: async (): Promise<CategoryListResponse> => {
      if (!currentTenant?.id) {
        throw new Error('Tenant ID is required for tenant categories');
      }

      const url = buildTenantCategoriesURL(isActive);
      const response = await api.get(url, {
        headers: {
          'x-tenant-id': currentTenant.id
        }
      });
      return response.data;
    },
    enabled: !!currentTenant?.id,
    staleTime: 15 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: 3,
  });
};

// =================================================================
// INDUSTRY-FIRST ONBOARDING HOOKS (Preserved)
// =================================================================

export const useIndustries = (filters: IndustryFilters = {}) => {
  // Default to limit=100 (backend max) to fetch all industries in a single call
  // There are ~68 industries total (21 parents + 47 sub-segments)
  const effectiveFilters = { limit: 100, ...filters };
  return useQuery({
    queryKey: productMasterdataKeys.industries(effectiveFilters),
    queryFn: async (): Promise<IndustryResponse> => {
      const url = buildIndustriesURL(effectiveFilters);
      const response = await api.get(url);
      return response.data;
    },
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    retry: 3,
  });
};

export const useAllCategories = (filters: CategoryFilters = {}) => {
  // Default to limit=100 (backend max) to fetch all categories in a single call
  const effectiveFilters = { limit: 100, ...filters };
  return useQuery({
    queryKey: productMasterdataKeys.allCategories(effectiveFilters),
    queryFn: async (): Promise<CategoryMapResponse> => {
      const url = buildAllCategoriesURL(effectiveFilters);
      const response = await api.get(url);
      return response.data;
    },
    staleTime: 15 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: 3,
  });
};

export const useIndustryCategories = (
  industryId: string,
  filters: IndustryCategoryFilters = {}
) => {
  return useQuery({
    queryKey: productMasterdataKeys.industryCategories(industryId, filters),
    queryFn: async (): Promise<CategoryMapResponse> => {
      if (!industryId) {
        throw new Error('Industry ID is required for industry categories');
      }

      const url = buildIndustryCategoriesURL(industryId, filters);
      const response = await api.get(url);
      return response.data;
    },
    enabled: !!industryId,
    staleTime: 15 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: 3,
  });
};

export const usePrimaryIndustryCategories = (
  industryId: string,
  filters: Omit<IndustryCategoryFilters, 'is_primary'> = {}
) => {
  return useIndustryCategories(industryId, { ...filters, is_primary: true });
};

// =================================================================
// NEW: TAX MANAGEMENT HOOKS
// =================================================================

/**
 * Hook to fetch tax rates and settings data
 */
export const useTaxData = () => {
  const { currentTenant } = useAuth();

  return useQuery({
    queryKey: productMasterdataKeys.taxAll(currentTenant?.id || ''),
    queryFn: async (): Promise<TaxRatesResponse> => {
      if (!currentTenant?.id) {
        throw new Error('Tenant ID is required for tax data');
      }

      const response = await api.get(API_ENDPOINTS.TAX_SETTINGS.BASE);
      return response.data;
    },
    enabled: !!currentTenant?.id,
    staleTime: 10 * 60 * 1000, // 10 minutes - tax data changes moderately
    gcTime: 30 * 60 * 1000,    // 30 minutes cache
    retry: 3,
  });
};

/**
 * Hook to fetch only tax rates
 */
export const useTaxRates = () => {
  const { currentTenant } = useAuth();

  return useQuery({
    queryKey: productMasterdataKeys.taxRates(currentTenant?.id || ''),
    queryFn: async (): Promise<TaxRate[]> => {
      if (!currentTenant?.id) {
        throw new Error('Tenant ID is required for tax rates');
      }

      const response = await api.get(API_ENDPOINTS.TAX_SETTINGS.BASE);
      return response.data.rates || [];
    },
    enabled: !!currentTenant?.id,
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: 3,
  });
};

/**
 * Hook to fetch only tax settings
 */
export const useTaxSettings = () => {
  const { currentTenant } = useAuth();

  return useQuery({
    queryKey: productMasterdataKeys.taxSettings(currentTenant?.id || ''),
    queryFn: async (): Promise<TaxSettings | null> => {
      if (!currentTenant?.id) {
        throw new Error('Tenant ID is required for tax settings');
      }

      const response = await api.get(API_ENDPOINTS.TAX_SETTINGS.BASE);
      return response.data.settings || null;
    },
    enabled: !!currentTenant?.id,
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: 3,
  });
};

// =================================================================
// NEW: TAX MUTATION HOOKS
// =================================================================

/**
 * Hook for creating tax rates
 */
export const useCreateTaxRate = () => {
  const { currentTenant } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: TaxRateFormData): Promise<TaxRate> => {
      if (!currentTenant?.id) {
        throw new Error('No tenant selected');
      }

      const idempotencyKey = `tax-rates-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      const requestData = {
        name: data.name.trim(),
        rate: data.rate,
        description: data.description?.trim() || null,
        sequence_no: data.sequence_no || 1,
        is_default: data.is_default || false
      };

      const response = await api.post(
        API_ENDPOINTS.TAX_SETTINGS.RATES,
        requestData,
        {
          headers: {
            'idempotency-key': idempotencyKey
          }
        }
      );

      return response.data;
    },
    onSuccess: (newRate) => {
      // Invalidate and refetch tax data
      queryClient.invalidateQueries({
        queryKey: productMasterdataKeys.taxAll(currentTenant?.id || '')
      });
      queryClient.invalidateQueries({
        queryKey: productMasterdataKeys.taxRates(currentTenant?.id || '')
      });

      // Track analytics
      try {
        analyticsService.trackPageView('settings/tax-settings/rates/created', 'Tax Rate Created');
      } catch (error) {
        console.error('Analytics error:', error);
      }

      toast.success('Tax rate created successfully', {
        duration: 3000,
        style: {
          padding: '16px',
          borderRadius: '8px',
          background: '#10B981',
          color: '#FFF',
          fontSize: '16px',
          minWidth: '300px'
        }
      });
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.error || error.message || ERROR_MESSAGES.SAVE_ERROR;
      
      captureException(error, {
        tags: { 
          component: 'useCreateTaxRate', 
          action: 'createRate' 
        },
        extra: { 
          tenantId: currentTenant?.id,
          errorMessage
        }
      });

      toast.error(`Save Error: ${errorMessage}`, {
        duration: 4000,
        style: {
          padding: '16px',
          borderRadius: '8px',
          background: '#EF4444',
          color: '#FFF',
          fontSize: '16px',
          minWidth: '300px'
        }
      });
    }
  });
};

/**
 * Hook for updating tax rates
 */
export const useUpdateTaxRate = () => {
  const { currentTenant } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<TaxRateFormData> }): Promise<TaxRate> => {
      if (!currentTenant?.id) {
        throw new Error('No tenant selected');
      }

      const idempotencyKey = `tax-rates-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      const updateData: any = {};
      if (data.name !== undefined) updateData.name = data.name.trim();
      if (data.rate !== undefined) updateData.rate = data.rate;
      if (data.description !== undefined) updateData.description = data.description?.trim() || null;
      if (data.sequence_no !== undefined) updateData.sequence_no = data.sequence_no;
      if (data.is_default !== undefined) updateData.is_default = data.is_default;

      const response = await api.put(
        API_ENDPOINTS.TAX_SETTINGS.RATE_DETAIL(id),
        updateData,
        {
          headers: {
            'idempotency-key': idempotencyKey
          }
        }
      );

      return response.data;
    },
    onSuccess: (updatedRate) => {
      // Invalidate and refetch tax data
      queryClient.invalidateQueries({
        queryKey: productMasterdataKeys.taxAll(currentTenant?.id || '')
      });
      queryClient.invalidateQueries({
        queryKey: productMasterdataKeys.taxRates(currentTenant?.id || '')
      });

      // Track analytics
      try {
        analyticsService.trackPageView('settings/tax-settings/rates/updated', 'Tax Rate Updated');
      } catch (error) {
        console.error('Analytics error:', error);
      }

      toast.success('Tax rate updated successfully', {
        duration: 3000,
        style: {
          padding: '16px',
          borderRadius: '8px',
          background: '#10B981',
          color: '#FFF',
          fontSize: '16px',
          minWidth: '300px'
        }
      });
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.error || error.message || ERROR_MESSAGES.SAVE_ERROR;
      
      captureException(error, {
        tags: { 
          component: 'useUpdateTaxRate', 
          action: 'updateRate' 
        },
        extra: { 
          tenantId: currentTenant?.id,
          errorMessage
        }
      });

      toast.error(`Update Error: ${errorMessage}`, {
        duration: 4000,
        style: {
          padding: '16px',
          borderRadius: '8px',
          background: '#EF4444',
          color: '#FFF',
          fontSize: '16px',
          minWidth: '300px'
        }
      });
    }
  });
};

/**
 * Hook for deleting tax rates
 */
export const useDeleteTaxRate = () => {
  const { currentTenant } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      if (!currentTenant?.id) {
        throw new Error('No tenant selected');
      }

      await api.delete(API_ENDPOINTS.TAX_SETTINGS.RATE_DETAIL(id));
    },
    onSuccess: () => {
      // Invalidate and refetch tax data
      queryClient.invalidateQueries({
        queryKey: productMasterdataKeys.taxAll(currentTenant?.id || '')
      });
      queryClient.invalidateQueries({
        queryKey: productMasterdataKeys.taxRates(currentTenant?.id || '')
      });

      // Track analytics
      try {
        analyticsService.trackPageView('settings/tax-settings/rates/deleted', 'Tax Rate Deleted');
      } catch (error) {
        console.error('Analytics error:', error);
      }

      toast.success('Tax rate deleted successfully', {
        duration: 3000,
        style: {
          padding: '16px',
          borderRadius: '8px',
          background: '#10B981',
          color: '#FFF',
          fontSize: '16px',
          minWidth: '300px'
        }
      });
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.error || error.message || ERROR_MESSAGES.DELETE_ERROR;
      
      captureException(error, {
        tags: { 
          component: 'useDeleteTaxRate', 
          action: 'deleteRate' 
        },
        extra: { 
          tenantId: currentTenant?.id,
          errorMessage
        }
      });

      toast.error(`Delete Error: ${errorMessage}`, {
        duration: 4000,
        style: {
          padding: '16px',
          borderRadius: '8px',
          background: '#EF4444',
          color: '#FFF',
          fontSize: '16px',
          minWidth: '300px'
        }
      });
    }
  });
};

/**
 * Hook for updating tax display settings
 */
export const useUpdateTaxDisplay = () => {
  const { currentTenant } = useAuth();
  const queryClient = useQueryClient();
  const { toast: shadcnToast } = useToast();

  return useMutation({
    mutationFn: async (mode: 'including_tax' | 'excluding_tax'): Promise<TaxSettings> => {
      if (!currentTenant?.id) {
        throw new Error('No tenant selected');
      }

      const idempotencyKey = `tax-display-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      // Get current settings to preserve default_tax_rate_id
      const currentSettings = queryClient.getQueryData(
        productMasterdataKeys.taxSettings(currentTenant.id)
      ) as TaxSettings | null;

      const requestData = {
        display_mode: mode,
        default_tax_rate_id: currentSettings?.default_tax_rate_id || null
      };

      const response = await api.post(
        API_ENDPOINTS.TAX_SETTINGS.SETTINGS,
        requestData,
        {
          headers: {
            'idempotency-key': idempotencyKey
          }
        }
      );

      return response.data;
    },
    onSuccess: (updatedSettings) => {
      // Invalidate and refetch tax data
      queryClient.invalidateQueries({
        queryKey: productMasterdataKeys.taxAll(currentTenant?.id || '')
      });
      queryClient.invalidateQueries({
        queryKey: productMasterdataKeys.taxSettings(currentTenant?.id || '')
      });

      // Track analytics
      try {
        analyticsService.trackPageView('settings/tax-settings/display/updated', 'Tax Display Mode Updated');
      } catch (error) {
        console.error('Analytics error:', error);
      }

      shadcnToast({
        title: "Success",
        description: `Tax display mode updated to "${updatedSettings.display_mode === 'including_tax' ? 'Including tax' : 'Excluding tax'}"`,
      });
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.error || error.message || 'Failed to update tax display mode';
      
      captureException(error, {
        tags: { 
          component: 'useUpdateTaxDisplay', 
          action: 'updateDisplayMode' 
        },
        extra: { 
          tenantId: currentTenant?.id,
          errorMessage
        }
      });

      shadcnToast({
        variant: "destructive",
        title: "Error",
        description: errorMessage
      });
    }
  });
};

// =================================================================
// UTILITY HOOKS (Enhanced with Tax Utils)
// =================================================================

/**
 * Hook to get master data constants and API information
 */
export const useMasterDataConstants = () => {
  return useQuery({
    queryKey: productMasterdataKeys.constants(),
    queryFn: async () => {
      const response = await api.get(API_ENDPOINTS.PRODUCT_MASTERDATA.CONSTANTS);
      return response.data;
    },
    staleTime: Infinity,
    gcTime: Infinity,
    retry: 3,
  });
};

/**
 * Hook to check master data service health
 */
export const useMasterDataHealth = () => {
  return useQuery({
    queryKey: productMasterdataKeys.health(),
    queryFn: async () => {
      const response = await api.get(API_ENDPOINTS.PRODUCT_MASTERDATA.HEALTH);
      return response.data;
    },
    staleTime: 1 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    retry: 1,
  });
};

// =================================================================
// DROPDOWN/SELECT OPTIMIZED HOOKS (Enhanced with Tax Dropdowns)
// =================================================================

/**
 * Hook for dropdown/select components - formats data for UI consumption
 */
export const useMasterDataDropdown = (
  categoryName: CategoryName | string,
  scope: 'global' | 'tenant' = 'global',
  isActive: boolean = true
) => {
  const globalQuery = useGlobalMasterData(categoryName, isActive);
  const tenantQuery = useTenantMasterData(categoryName, isActive);
  
  const query = scope === 'global' ? globalQuery : tenantQuery;
  
  const options = query.data?.data?.map(item => ({
    value: item.detail_value,
    label: item.detail_name || item.detail_value,
    description: item.description,
    isActive: item.is_active,
    sequenceNo: item.sequence_no
  })) || [];

  return {
    options: options.sort((a, b) => a.sequenceNo - b.sequenceNo),
    isLoading: query.isLoading,
    error: query.error,
    isSuccess: query.isSuccess,
    categoryInfo: query.data?.category_info,
    refetch: query.refetch
  };
};

/**
 * NEW: Hook for tax rates dropdown - formats data for UI consumption
 */
export const useTaxRatesDropdown = () => {
  const query = useTaxRates();
  
  const options = query.data?.map(rate => ({
    value: rate.id,
    label: `${rate.name} (${rate.rate}%)`,
    description: rate.description,
    isActive: rate.is_active,
    isDefault: rate.is_default,
    sequenceNo: rate.sequence_no,
    rate: rate.rate
  })) || [];

  return {
    options: options.sort((a, b) => {
      // Default rate first, then by sequence
      if (a.isDefault && !b.isDefault) return -1;
      if (!a.isDefault && b.isDefault) return 1;
      return a.sequenceNo - b.sequenceNo;
    }),
    isLoading: query.isLoading,
    error: query.error,
    isSuccess: query.isSuccess,
    refetch: query.refetch
  };
};

/**
 * Hook for industries dropdown
 */
export const useIndustriesDropdown = (filters: IndustryFilters = {}) => {
  const query = useIndustries(filters);
  
  const options = query.data?.data?.map(item => ({
    value: item.id,
    label: item.name,
    description: item.description,
    isActive: item.is_active,
    sortOrder: item.sort_order
  })) || [];

  return {
    options: options.sort((a, b) => a.sortOrder - b.sortOrder),
    isLoading: query.isLoading,
    error: query.error,
    isSuccess: query.isSuccess,
    pagination: query.data?.pagination,
    refetch: query.refetch
  };
};

// =================================================================
// VALIDATION UTILITIES
// =================================================================

/**
 * Validate tax rate data
 */
export const validateTaxRate = (data: Partial<TaxRateFormData>): ValidationResult => {
  const errors: Record<string, string> = {};
  
  if (data.name !== undefined) {
    if (!data.name || data.name.trim().length === 0) {
      errors.name = ERROR_MESSAGES.REQUIRED_FIELD;
    } else if (data.name.length > VALIDATION_RULES.TAX_NAME.MAX_LENGTH) {
      errors.name = ERROR_MESSAGES.NAME_TOO_LONG;
    } else if (!VALIDATION_RULES.TAX_NAME.PATTERN.test(data.name)) {
      errors.name = ERROR_MESSAGES.INVALID_NAME;
    }
  }
  
  if (data.rate !== undefined) {
    if (data.rate < VALIDATION_RULES.TAX_RATE.MIN || data.rate > VALIDATION_RULES.TAX_RATE.MAX) {
      errors.rate = ERROR_MESSAGES.INVALID_RATE;
    }
  }
  
  if (data.description && data.description.length > VALIDATION_RULES.DESCRIPTION.MAX_LENGTH) {
    errors.description = ERROR_MESSAGES.DESCRIPTION_TOO_LONG;
  }
  
  if (data.sequence_no !== undefined && data.sequence_no !== null) {
    if (data.sequence_no < VALIDATION_RULES.SEQUENCE.MIN || data.sequence_no > VALIDATION_RULES.SEQUENCE.MAX) {
      errors.sequence_no = ERROR_MESSAGES.INVALID_SEQUENCE;
    }
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

/**
 * Validate tax display form data
 */
export const validateTaxDisplay = (data: TaxDisplayFormData): ValidationResult => {
  const errors: Record<string, string> = {};
  
  if (!data.display_mode) {
    errors.display_mode = 'Display mode is required';
  } else if (!['including_tax', 'excluding_tax'].includes(data.display_mode)) {
    errors.display_mode = 'Invalid display mode';
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

// =================================================================
// QUICK ACCESS HOOKS FOR COMMON CATEGORIES
// =================================================================

export const usePricingTypesDropdown = (scope: 'global' | 'tenant' = 'global') => {
  return useMasterDataDropdown(CATEGORY_NAMES.PRICING_TYPE, scope);
};

export const useStatusTypesDropdown = (scope: 'global' | 'tenant' = 'global') => {
  return useMasterDataDropdown(CATEGORY_NAMES.STATUS_TYPE, scope);
};

export const usePriorityTypesDropdown = (scope: 'global' | 'tenant' = 'global') => {
  return useMasterDataDropdown(CATEGORY_NAMES.PRIORITY_TYPE, scope);
};

export const useContactTypesDropdown = (scope: 'global' | 'tenant' = 'global') => {
  return useMasterDataDropdown(CATEGORY_NAMES.CONTACT_TYPE, scope);
};

/**
 * Hook for X-Product dropdown - Platform products (ContractNest, FamilyKnows, Kaladristi)
 * Used in admin plan creation to select which product the plan belongs to
 * detail_value matches x-product header values exactly
 */
export const useXProductDropdown = (scope: 'global' | 'tenant' = 'global') => {
  return useMasterDataDropdown(CATEGORY_NAMES.X_PRODUCT, scope);
};