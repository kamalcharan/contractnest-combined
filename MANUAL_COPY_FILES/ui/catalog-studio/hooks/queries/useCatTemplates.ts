// src/hooks/queries/useCatTemplates.ts
// TanStack Query hooks for Catalog Studio Templates

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import api from '@/services/api';
import { API_ENDPOINTS, CatTemplateFilters } from '@/services/serviceURLs';
import { CatBlock } from './useCatBlocks';

// =================================================================
// TYPES
// =================================================================

export interface TemplateBlock {
  block_id: string;
  order: number;
  config_overrides?: Record<string, any>;
}

export interface CatTemplate {
  id: string;
  tenant_id?: string;
  name: string;
  description?: string;
  blocks: TemplateBlock[];
  is_system: boolean;
  is_public: boolean;
  is_live: boolean;
  status_id: string;
  copied_from_id?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface CatTemplateWithBlocks extends CatTemplate {
  expanded_blocks?: CatBlock[];
}

export interface CatTemplatesResponse {
  success: boolean;
  data?: {
    templates: CatTemplate[];
    total: number;
  };
  error?: {
    code: string;
    message: string;
  };
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
  };
}

export interface CatTemplateResponse {
  success: boolean;
  data?: CatTemplate;
  error?: {
    code: string;
    message: string;
  };
}

// =================================================================
// QUERY KEYS
// =================================================================

export const catTemplateKeys = {
  all: ['catalog-studio', 'templates'] as const,
  lists: () => [...catTemplateKeys.all, 'list'] as const,
  list: (filters: CatTemplateFilters) => [...catTemplateKeys.lists(), { filters }] as const,
  system: () => [...catTemplateKeys.all, 'system'] as const,
  systemList: (filters: CatTemplateFilters) => [...catTemplateKeys.system(), { filters }] as const,
  public: () => [...catTemplateKeys.all, 'public'] as const,
  publicList: (filters: CatTemplateFilters) => [...catTemplateKeys.public(), { filters }] as const,
  details: () => [...catTemplateKeys.all, 'detail'] as const,
  detail: (id: string) => [...catTemplateKeys.details(), id] as const,
};

// =================================================================
// HOOKS - TENANT TEMPLATES
// =================================================================

/**
 * Hook to fetch tenant templates
 */
export const useCatTemplates = (filters?: CatTemplateFilters) => {
  const { currentTenant, isAdmin } = useAuth();

  return useQuery({
    queryKey: catTemplateKeys.list(filters || {}),
    queryFn: async (): Promise<CatTemplatesResponse> => {
      if (!currentTenant?.id) {
        throw new Error('Missing tenant');
      }

      const url = API_ENDPOINTS.CATALOG_STUDIO.TEMPLATES.LIST_WITH_FILTERS(filters || {});

      const response = await api.get(url, {
        headers: {
          'x-is-admin': String(isAdmin || false),
        },
      });

      return response.data;
    },
    enabled: !!currentTenant?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
};

/**
 * Hook to fetch a single template by ID
 */
export const useCatTemplate = (templateId: string | undefined) => {
  const { currentTenant, isAdmin } = useAuth();

  return useQuery({
    queryKey: catTemplateKeys.detail(templateId || ''),
    queryFn: async (): Promise<CatTemplateResponse> => {
      if (!currentTenant?.id || !templateId) {
        throw new Error('Missing tenant or template ID');
      }

      const url = API_ENDPOINTS.CATALOG_STUDIO.TEMPLATES.GET(templateId);

      const response = await api.get(url, {
        headers: {
          'x-is-admin': String(isAdmin || false),
        },
      });

      return response.data;
    },
    enabled: !!currentTenant?.id && !!templateId,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
};

// =================================================================
// HOOKS - SYSTEM TEMPLATES
// =================================================================

/**
 * Hook to fetch system templates (global templates)
 */
export const useCatSystemTemplates = (filters?: CatTemplateFilters) => {
  const { currentTenant, isAdmin } = useAuth();

  return useQuery({
    queryKey: catTemplateKeys.systemList(filters || {}),
    queryFn: async (): Promise<CatTemplatesResponse> => {
      if (!currentTenant?.id) {
        throw new Error('Missing tenant');
      }

      const url = API_ENDPOINTS.CATALOG_STUDIO.TEMPLATES.SYSTEM_WITH_FILTERS(filters || {});

      const response = await api.get(url, {
        headers: {
          'x-is-admin': String(isAdmin || false),
        },
      });

      return response.data;
    },
    enabled: !!currentTenant?.id,
    staleTime: 10 * 60 * 1000, // 10 minutes (system templates change less frequently)
    gcTime: 15 * 60 * 1000,
  });
};

// =================================================================
// HOOKS - PUBLIC TEMPLATES
// =================================================================

/**
 * Hook to fetch public templates (from other tenants)
 */
export const useCatPublicTemplates = (filters?: CatTemplateFilters) => {
  const { currentTenant, isAdmin } = useAuth();

  return useQuery({
    queryKey: catTemplateKeys.publicList(filters || {}),
    queryFn: async (): Promise<CatTemplatesResponse> => {
      if (!currentTenant?.id) {
        throw new Error('Missing tenant');
      }

      const url = API_ENDPOINTS.CATALOG_STUDIO.TEMPLATES.PUBLIC_WITH_FILTERS(filters || {});

      const response = await api.get(url, {
        headers: {
          'x-is-admin': String(isAdmin || false),
        },
      });

      return response.data;
    },
    enabled: !!currentTenant?.id,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
};

// =================================================================
// UTILITY HOOKS
// =================================================================

/**
 * Hook to get templates formatted for dropdown/select components
 */
export const useCatTemplatesForDropdown = (filters?: CatTemplateFilters) => {
  const { data, isLoading, error } = useCatTemplates(filters);

  const options = data?.data?.templates?.map((template) => ({
    value: template.id,
    label: template.name,
    description: template.description,
    isSystem: template.is_system,
    isPublic: template.is_public,
    blockCount: template.blocks?.length || 0,
  })) || [];

  return {
    options,
    isLoading,
    error,
    total: data?.data?.total || 0,
  };
};

/**
 * Hook to search templates
 */
export const useSearchCatTemplates = (searchQuery: string, additionalFilters?: Omit<CatTemplateFilters, 'search'>) => {
  return useCatTemplates({
    ...additionalFilters,
    search: searchQuery,
  });
};

/**
 * Hook to get all available templates (tenant + system + public)
 */
export const useAllAvailableTemplates = (filters?: CatTemplateFilters) => {
  const tenantTemplates = useCatTemplates(filters);
  const systemTemplates = useCatSystemTemplates(filters);
  const publicTemplates = useCatPublicTemplates(filters);

  const isLoading = tenantTemplates.isLoading || systemTemplates.isLoading || publicTemplates.isLoading;
  const isError = tenantTemplates.isError || systemTemplates.isError || publicTemplates.isError;

  const allTemplates = [
    ...(tenantTemplates.data?.data?.templates || []),
    ...(systemTemplates.data?.data?.templates || []),
    ...(publicTemplates.data?.data?.templates || []),
  ];

  return {
    templates: allTemplates,
    tenantTemplates: tenantTemplates.data?.data?.templates || [],
    systemTemplates: systemTemplates.data?.data?.templates || [],
    publicTemplates: publicTemplates.data?.data?.templates || [],
    isLoading,
    isError,
    error: tenantTemplates.error || systemTemplates.error || publicTemplates.error,
  };
};

// =================================================================
// EXPORTS
// =================================================================

export default {
  // Tenant templates
  useCatTemplates,
  useCatTemplate,

  // System templates
  useCatSystemTemplates,

  // Public templates
  useCatPublicTemplates,

  // Utility hooks
  useCatTemplatesForDropdown,
  useSearchCatTemplates,
  useAllAvailableTemplates,

  // Query keys
  catTemplateKeys,
};
