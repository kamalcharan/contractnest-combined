// src/hooks/queries/useMasterDataQueries.ts
// ✅ PRODUCTION: Master Data GraphQL hooks for Service Catalog

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import { getCurrentEnvironment } from '../../services/api';
import { currencyOptions, getDefaultCurrency } from '../../utils/constants/currencies';
// Debug utility - available as window.debugMasterData in browser console
import '../../utils/debugMasterData';

// =================================================================
// TYPES
// =================================================================

export interface ServiceCategory {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  hexcolor?: string;
  isActive: boolean;
  sortOrder?: number;
}

export interface Industry {
  id: string;
  name: string;
  description?: string;
  icon?: string; // Lucide icon name from m_catalog_industries
  isActive: boolean;
  sortOrder?: number;
}

export interface Currency {
  code: string;
  name: string;
  symbol: string;
  isActive: boolean;
  isDefault?: boolean;
  exchangeRate?: number;
}

export interface ResourceType {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  pricingModel: string;
  requiresHumanAssignment: boolean;
  hasCapacityLimits: boolean;
  isActive: boolean;
}

export interface MasterDataResponse {
  categories: ServiceCategory[];
  industries: Industry[];
  currencies: Currency[];
  resourceTypes: ResourceType[];
}

// =================================================================
// QUERY KEYS FACTORY
// =================================================================

export const masterDataKeys = {
  all: ['masterData'] as const,
  serviceCatalog: () => [...masterDataKeys.all, 'serviceCatalog'] as const,
  categories: () => [...masterDataKeys.all, 'categories'] as const,
  industries: () => [...masterDataKeys.all, 'industries'] as const,
  currencies: () => [...masterDataKeys.all, 'currencies'] as const,
  resourceTypes: () => [...masterDataKeys.all, 'resourceTypes'] as const,
};

// =================================================================
// HELPER FUNCTIONS
// =================================================================

/**
 * Execute edge function request with proper error handling
 */
const executeMasterDataRequest = async (endpoint: string, token: string, tenantId?: string) => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };

  if (tenantId) {
    headers['x-tenant-id'] = tenantId;
  }

  const response = await fetch(endpoint, {
    method: 'GET',
    headers
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status} ${response.statusText}`);
  }

  const result = await response.json();
  
  if (!result.success) {
    throw new Error(result.error || 'API request failed');
  }
  
  return result;
};

// =================================================================
// MASTER DATA HOOKS
// =================================================================

/**
 * Get all service catalog master data (categories, industries, currencies, resource types)
 */
export const useServiceCatalogMasterData = () => {
  const { user, currentTenant } = useAuth();

  return useQuery({
    queryKey: masterDataKeys.serviceCatalog(),
    queryFn: async (): Promise<MasterDataResponse> => {
      if (!user?.token || !currentTenant?.id) {
        throw new Error('User not authenticated or no tenant selected');
      }

      console.log('🔍 Fetching service catalog master data');

      // Fetch categories from edge function (with fallback for different category names)
      let categoriesResult;
      try {
        categoriesResult = await executeMasterDataRequest(
          `/api/functions/product-masterdata?category_name=service_categories`,
          user.token,
          currentTenant.id
        );
      } catch (error) {
        console.warn('Failed to fetch service_categories, trying categories:', error);
        try {
          categoriesResult = await executeMasterDataRequest(
            `/api/functions/product-masterdata?category_name=categories`,
            user.token,
            currentTenant.id
          );
        } catch (error2) {
          console.warn('Failed to fetch categories, using fallback:', error2);
          categoriesResult = { data: [] };
        }
      }
      console.log('📊 Categories result:', categoriesResult);

      // Fetch industries from edge function (uses /industries path to query m_catalog_industries table)
      const industriesResult = await executeMasterDataRequest(
        `/api/functions/product-masterdata/industries`,
        user.token,
        currentTenant.id
      );
      console.log('📊 Industries result:', industriesResult);

      // Fetch resource types from edge function
      const resourceTypesResult = await executeMasterDataRequest(
        `/api/functions/product-masterdata?category_name=resource_types`,
        user.token,
        currentTenant.id
      );

      // Transform edge function response to match expected format
      let categories: ServiceCategory[] = (categoriesResult.data || []).map((item: any) => ({
        id: item.id || item.category_detail_id,
        name: item.display_name || item.name,
        description: item.description,
        icon: item.icon_name,
        hexcolor: item.hex_color,
        isActive: item.is_active,
        sortOrder: item.sequence_no
      }));

      // If no categories found, provide fallback
      if (categories.length === 0) {
        console.warn('No categories found from API, using fallback categories');
        categories = [
          { id: '1', name: 'Consulting', description: 'Consulting services', isActive: true, sortOrder: 1, icon: '🧠', hexcolor: '#3B82F6' },
          { id: '2', name: 'Development', description: 'Software development services', isActive: true, sortOrder: 2, icon: '💻', hexcolor: '#10B981' },
          { id: '3', name: 'Design', description: 'Design and creative services', isActive: true, sortOrder: 3, icon: '🎨', hexcolor: '#F59E0B' },
          { id: '4', name: 'Marketing', description: 'Marketing and advertising services', isActive: true, sortOrder: 4, icon: '📢', hexcolor: '#EF4444' },
          { id: '5', name: 'Support', description: 'Support and maintenance services', isActive: true, sortOrder: 5, icon: '🛠️', hexcolor: '#8B5CF6' }
        ];
      }
      console.log('📊 Final categories:', categories);

      let industries: Industry[] = (industriesResult.data || []).map((item: any) => ({
        id: item.id || item.category_detail_id,
        name: item.display_name || item.name,
        description: item.description,
        icon: item.icon, // Lucide icon name from m_catalog_industries
        isActive: item.is_active,
        sortOrder: item.sort_order || item.sequence_no
      }));

      // If no industries found, provide fallback
      if (industries.length === 0) {
        console.warn('No industries found from API, using fallback industries');
        industries = [
          { id: 'technology', name: 'Technology', description: 'IT companies, software firms, data centers', icon: 'Cpu', isActive: true, sortOrder: 1 },
          { id: 'healthcare', name: 'Healthcare', description: 'Medical services, hospitals, clinics', icon: 'Stethoscope', isActive: true, sortOrder: 2 },
          { id: 'financial_services', name: 'Financial Services', description: 'Banks, insurance, investment firms', icon: 'DollarSign', isActive: true, sortOrder: 3 },
          { id: 'education', name: 'Education', description: 'Schools, colleges, universities', icon: 'GraduationCap', isActive: true, sortOrder: 4 },
          { id: 'retail', name: 'Retail', description: 'Retail stores, e-commerce', icon: 'ShoppingBag', isActive: true, sortOrder: 5 },
          { id: 'other', name: 'Other', description: 'Industries not covered by specific categories', icon: 'MoreHorizontal', isActive: true, sortOrder: 99 }
        ];
      }

      const resourceTypes: ResourceType[] = (resourceTypesResult.data || []).map((item: any) => ({
        id: item.id || item.category_detail_id,
        name: item.display_name || item.name,
        description: item.description,
        icon: item.icon_name,
        pricingModel: item.pricing_model || 'HOURLY',
        requiresHumanAssignment: item.requires_human_assignment || false,
        hasCapacityLimits: item.has_capacity_limits || false,
        isActive: item.is_active
      }));

      // Use currency constants instead of API
      const currencies: Currency[] = currencyOptions.map(currency => ({
        code: currency.code,
        name: currency.name,
        symbol: currency.symbol,
        isActive: true,
        isDefault: currency.isDefault
      }));

      return {
        categories,
        industries,
        currencies,
        resourceTypes
      };
    },
    enabled: !!user?.token && !!currentTenant?.id,
    staleTime: 15 * 60 * 1000, // 15 minutes - master data changes infrequently
    retry: 2
  });
};

/**
 * Get service categories only
 */
export const useServiceCategories = () => {
  const masterDataQuery = useServiceCatalogMasterData();

  return {
    ...masterDataQuery,
    data: masterDataQuery.data?.categories || [],
    isLoading: masterDataQuery.isLoading,
    error: masterDataQuery.error,
    refetch: masterDataQuery.refetch
  };
};

/**
 * Get industries only
 */
export const useIndustries = () => {
  const masterDataQuery = useServiceCatalogMasterData();

  return {
    ...masterDataQuery,
    data: masterDataQuery.data?.industries || [],
    isLoading: masterDataQuery.isLoading,
    error: masterDataQuery.error,
    refetch: masterDataQuery.refetch
  };
};

/**
 * Get currencies only
 */
export const useCurrencies = () => {
  const masterDataQuery = useServiceCatalogMasterData();

  return {
    ...masterDataQuery,
    data: masterDataQuery.data?.currencies || [],
    isLoading: masterDataQuery.isLoading,
    error: masterDataQuery.error,
    refetch: masterDataQuery.refetch
  };
};

/**
 * Get resource types only
 */
export const useResourceTypes = () => {
  const masterDataQuery = useServiceCatalogMasterData();

  return {
    ...masterDataQuery,
    data: masterDataQuery.data?.resourceTypes || [],
    isLoading: masterDataQuery.isLoading,
    error: masterDataQuery.error,
    refetch: masterDataQuery.refetch
  };
};

/**
 * Get active service categories (filtered)
 */
export const useActiveServiceCategories = () => {
  const categoriesQuery = useServiceCategories();

  return {
    ...categoriesQuery,
    data: categoriesQuery.data.filter(category => category.isActive),
  };
};

/**
 * Get active currencies (filtered)
 */
export const useActiveCurrencies = () => {
  const currenciesQuery = useCurrencies();

  return {
    ...currenciesQuery,
    data: currenciesQuery.data.filter(currency => currency.isActive),
  };
};

/**
 * Get active resource types (filtered)
 */
export const useActiveResourceTypes = () => {
  const resourceTypesQuery = useResourceTypes();

  return {
    ...resourceTypesQuery,
    data: resourceTypesQuery.data.filter(type => type.isActive),
  };
};

// =================================================================
// HELPER HOOKS
// =================================================================

/**
 * Get category by ID
 */
export const useServiceCategory = (categoryId: string) => {
  const categoriesQuery = useServiceCategories();

  const category = categoriesQuery.data.find(cat => cat.id === categoryId);

  return {
    data: category,
    isLoading: categoriesQuery.isLoading,
    error: categoriesQuery.error,
    isFound: !!category
  };
};

/**
 * Get industry by ID
 */
export const useIndustry = (industryId: string) => {
  const industriesQuery = useIndustries();

  const industry = industriesQuery.data.find(ind => ind.id === industryId);

  return {
    data: industry,
    isLoading: industriesQuery.isLoading,
    error: industriesQuery.error,
    isFound: !!industry
  };
};

/**
 * Get currency by code
 */
export const useCurrency = (currencyCode: string) => {
  const currenciesQuery = useCurrencies();

  const currency = currenciesQuery.data.find(curr => curr.code === currencyCode);

  return {
    data: currency,
    isLoading: currenciesQuery.isLoading,
    error: currenciesQuery.error,
    isFound: !!currency
  };
};

/**
 * Get resource type by ID
 */
export const useResourceType = (resourceTypeId: string) => {
  const resourceTypesQuery = useResourceTypes();

  const resourceType = resourceTypesQuery.data.find(type => type.id === resourceTypeId);

  return {
    data: resourceType,
    isLoading: resourceTypesQuery.isLoading,
    error: resourceTypesQuery.error,
    isFound: !!resourceType
  };
};

// =================================================================
// LEGACY COMPATIBILITY
// =================================================================

/**
 * Legacy compatibility for tenant currencies
 */
export const useTenantCurrencies = () => {
  const currenciesQuery = useActiveCurrencies();

  // Transform to legacy format
  return {
    ...currenciesQuery,
    data: currenciesQuery.data.map(currency => ({
      code: currency.code,
      name: currency.name,
      symbol: currency.symbol,
      isDefault: currency.isDefault
    }))
  };
};

/**
 * Get default currency
 */
export const useDefaultCurrency = () => {
  return {
    data: getDefaultCurrency(),
    isLoading: false,
    error: null
  };
};

/**
 * Get pricing models from master data
 */
export const usePricingModels = () => {
  const { user, currentTenant } = useAuth();

  return useQuery({
    queryKey: [...masterDataKeys.all, 'pricingModels'],
    queryFn: async () => {
      if (!user?.token || !currentTenant?.id) {
        throw new Error('User not authenticated or no tenant selected');
      }

      console.log('🔍 Fetching pricing models from master data');

      try {
        // Fetch pricing models from edge function
        const result = await executeMasterDataRequest(
          `/api/functions/product-masterdata?category_name=pricing_models`,
          user.token,
          currentTenant.id
        );

        // Transform edge function response to match expected format
        const pricingModels = (result.data || []).map((item: any) => ({
          id: item.id || item.category_detail_id,
          code: item.code || item.value_code,
          name: item.display_name || item.name,
          description: item.description,
          isActive: item.is_active,
          sortOrder: item.sequence_no
        }));

        return pricingModels;
      } catch (error) {
        console.warn('Failed to fetch pricing models from API, using defaults:', error);
        // Fallback to hardcoded pricing models
        return [
          { id: '1', code: 'fixed', name: 'Fixed Price', description: 'One-time fixed price', isActive: true, sortOrder: 1 },
          { id: '2', code: 'hourly', name: 'Hourly Rate', description: 'Price per hour', isActive: true, sortOrder: 2 },
          { id: '3', code: 'daily', name: 'Daily Rate', description: 'Price per day', isActive: true, sortOrder: 3 },
          { id: '4', code: 'monthly', name: 'Monthly Rate', description: 'Price per month', isActive: true, sortOrder: 4 },
          { id: '5', code: 'per-unit', name: 'Per Unit', description: 'Price per unit/item', isActive: true, sortOrder: 5 }
        ];
      }
    },
    enabled: !!user?.token && !!currentTenant?.id,
    staleTime: 15 * 60 * 1000, // 15 minutes
    retry: 1
  });
};

/**
 * Get pricing models formatted for dropdown/select components
 */
export const usePricingModelsForDropdown = () => {
  const pricingModelsQuery = usePricingModels();

  return {
    ...pricingModelsQuery,
    data: pricingModelsQuery.data ? pricingModelsQuery.data
      .filter(model => model.isActive)
      .map(model => ({
        value: model.code,
        label: model.name,
        description: model.description
      })) : []
  };
};

/**
 * Get categories formatted for dropdown/select components
 */
export const useCategoriesForDropdown = () => {
  const categoriesQuery = useActiveServiceCategories();

  return {
    ...categoriesQuery,
    data: categoriesQuery.data ? categoriesQuery.data.map(category => ({
      value: category.id,
      label: category.name,
      icon: category.icon,
      color: category.hexcolor
    })) : []
  };
};

/**
 * Get industries formatted for dropdown/select components
 */
export const useIndustriesForDropdown = () => {
  const industriesQuery = useIndustries();

  return {
    ...industriesQuery,
    data: industriesQuery.data ? industriesQuery.data
      .filter(industry => industry.isActive)
      .map(industry => ({
        value: industry.id,
        label: industry.name,
        description: industry.description,
        icon: industry.icon
      })) : []
  };
};

/**
 * Get currencies formatted for dropdown/select components
 */
export const useCurrenciesForDropdown = () => {
  const currenciesQuery = useActiveCurrencies();

  return {
    ...currenciesQuery,
    data: currenciesQuery.data ? currenciesQuery.data.map(currency => ({
      value: currency.code,
      label: `${currency.name} (${currency.symbol})`,
      symbol: currency.symbol,
      code: currency.code,
      isDefault: currency.isDefault
    })) : []
  };
};

/**
 * Get resource types formatted for dropdown/select components
 */
export const useResourceTypesForDropdown = () => {
  const resourceTypesQuery = useActiveResourceTypes();

  return {
    ...resourceTypesQuery,
    data: resourceTypesQuery.data.map(type => ({
      value: type.id,
      label: type.name,
      description: type.description,
      icon: type.icon,
      requiresHumanAssignment: type.requiresHumanAssignment,
      hasCapacityLimits: type.hasCapacityLimits
    }))
  };
};

// =================================================================
// UTILITY FUNCTIONS
// =================================================================

/**
 * Format currency display
 */
export const formatCurrencyDisplay = (currencyCode: string, amount: number): string => {
  const { data: currency } = useCurrency(currencyCode);
  
  if (currency) {
    return `${currency.symbol}${amount.toLocaleString()}`;
  }
  
  return `${currencyCode} ${amount}`;
};

/**
 * Get category display color
 */
export const getCategoryColor = (categoryId: string): string => {
  const { data: category } = useServiceCategory(categoryId);
  return category?.hexcolor || '#6366F1';
};

/**
 * Get category display icon
 */
export const getCategoryIcon = (categoryId: string): string => {
  const { data: category } = useServiceCategory(categoryId);
  return category?.icon || '📋';
};

// =================================================================
// EXPORTS
// =================================================================

export default {
  // Main hooks
  useServiceCatalogMasterData,
  useServiceCategories,
  useIndustries,
  useCurrencies,
  useResourceTypes,
  
  // Filtered hooks
  useActiveServiceCategories,
  useActiveCurrencies,
  useActiveResourceTypes,
  
  // Individual item hooks
  useServiceCategory,
  useIndustry,
  useCurrency,
  useResourceType,
  
  // Dropdown formatted hooks
  useCategoriesForDropdown,
  useIndustriesForDropdown,
  useCurrenciesForDropdown,
  useResourceTypesForDropdown,
  
  // Legacy compatibility
  useTenantCurrencies,
  useDefaultCurrency,
  
  // Pricing models
  usePricingModels,
  usePricingModelsForDropdown,
  
  // Utility functions
  formatCurrencyDisplay,
  getCategoryColor,
  getCategoryIcon
};