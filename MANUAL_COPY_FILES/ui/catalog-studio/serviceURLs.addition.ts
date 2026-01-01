// src/services/serviceURLs.ts - ADDITION for Catalog Studio
// Add this section to API_ENDPOINTS object in serviceURLs.ts

// =================================================================
// CATALOG STUDIO ENDPOINTS - NEW ADDITION
// =================================================================
CATALOG_STUDIO: {
  // Health check
  HEALTH: '/api/catalog-studio/health',

  // Block operations (Global blocks - admin managed)
  BLOCKS: {
    LIST: '/api/catalog-studio/blocks',
    GET: (id: string) => `/api/catalog-studio/blocks/${id}`,
    CREATE: '/api/catalog-studio/blocks',
    UPDATE: (id: string) => `/api/catalog-studio/blocks/${id}`,
    DELETE: (id: string) => `/api/catalog-studio/blocks/${id}`,

    // Helper function for listing blocks with filters
    LIST_WITH_FILTERS: (filters: CatBlockFilters = {}) => {
      const params = new URLSearchParams();

      if (filters.block_type_id) params.append('block_type_id', filters.block_type_id);
      if (filters.pricing_mode_id) params.append('pricing_mode_id', filters.pricing_mode_id);
      if (filters.is_active !== undefined) params.append('is_active', filters.is_active.toString());
      if (filters.tags && filters.tags.length > 0) params.append('tags', filters.tags.join(','));
      if (filters.search) params.append('search', filters.search);
      if (filters.page) params.append('page', filters.page.toString());
      if (filters.limit) params.append('limit', filters.limit.toString());

      const queryString = params.toString();
      return queryString ? `/api/catalog-studio/blocks?${queryString}` : '/api/catalog-studio/blocks';
    }
  },

  // Template operations (Tenant + System templates)
  TEMPLATES: {
    // Tenant templates
    LIST: '/api/catalog-studio/templates',
    GET: (id: string) => `/api/catalog-studio/templates/${id}`,
    CREATE: '/api/catalog-studio/templates',
    UPDATE: (id: string) => `/api/catalog-studio/templates/${id}`,
    DELETE: (id: string) => `/api/catalog-studio/templates/${id}`,

    // System templates (global)
    SYSTEM: '/api/catalog-studio/templates/system',

    // Public templates (from other tenants)
    PUBLIC: '/api/catalog-studio/templates/public',

    // Copy system template to tenant
    COPY: (id: string) => `/api/catalog-studio/templates/${id}/copy`,

    // Helper function for listing templates with filters
    LIST_WITH_FILTERS: (filters: CatTemplateFilters = {}) => {
      const params = new URLSearchParams();

      if (filters.status_id) params.append('status_id', filters.status_id);
      if (filters.is_public !== undefined) params.append('is_public', filters.is_public.toString());
      if (filters.search) params.append('search', filters.search);
      if (filters.page) params.append('page', filters.page.toString());
      if (filters.limit) params.append('limit', filters.limit.toString());

      const queryString = params.toString();
      return queryString ? `/api/catalog-studio/templates?${queryString}` : '/api/catalog-studio/templates';
    },

    // Helper for system templates with filters
    SYSTEM_WITH_FILTERS: (filters: CatTemplateFilters = {}) => {
      const params = new URLSearchParams();

      if (filters.status_id) params.append('status_id', filters.status_id);
      if (filters.search) params.append('search', filters.search);
      if (filters.page) params.append('page', filters.page.toString());
      if (filters.limit) params.append('limit', filters.limit.toString());

      const queryString = params.toString();
      return queryString ? `/api/catalog-studio/templates/system?${queryString}` : '/api/catalog-studio/templates/system';
    },

    // Helper for public templates with filters
    PUBLIC_WITH_FILTERS: (filters: CatTemplateFilters = {}) => {
      const params = new URLSearchParams();

      if (filters.search) params.append('search', filters.search);
      if (filters.page) params.append('page', filters.page.toString());
      if (filters.limit) params.append('limit', filters.limit.toString());

      const queryString = params.toString();
      return queryString ? `/api/catalog-studio/templates/public?${queryString}` : '/api/catalog-studio/templates/public';
    }
  }
},

// =================================================================
// TYPE DEFINITIONS - Add to existing types section
// =================================================================

// Catalog Studio Block filter interface
export type CatBlockFilters = {
  block_type_id?: string;
  pricing_mode_id?: string;
  is_active?: boolean;
  tags?: string[];
  search?: string;
  page?: number;
  limit?: number;
};

// Catalog Studio Template filter interface
export type CatTemplateFilters = {
  status_id?: string;
  is_public?: boolean;
  search?: string;
  page?: number;
  limit?: number;
};

// Catalog Studio endpoint types
export type CatalogStudioEndpoints = typeof API_ENDPOINTS.CATALOG_STUDIO;
export type CatBlockEndpoints = typeof API_ENDPOINTS.CATALOG_STUDIO.BLOCKS;
export type CatTemplateEndpoints = typeof API_ENDPOINTS.CATALOG_STUDIO.TEMPLATES;

// =================================================================
// HELPER FUNCTIONS - Add to existing helper functions section
// =================================================================

/**
 * Build catalog studio blocks list URL with filters
 */
export const buildCatBlocksListURL = (filters: CatBlockFilters = {}): string => {
  return API_ENDPOINTS.CATALOG_STUDIO.BLOCKS.LIST_WITH_FILTERS(filters);
};

/**
 * Build catalog studio templates list URL with filters
 */
export const buildCatTemplatesListURL = (filters: CatTemplateFilters = {}): string => {
  return API_ENDPOINTS.CATALOG_STUDIO.TEMPLATES.LIST_WITH_FILTERS(filters);
};

/**
 * Build catalog studio system templates URL with filters
 */
export const buildCatSystemTemplatesURL = (filters: CatTemplateFilters = {}): string => {
  return API_ENDPOINTS.CATALOG_STUDIO.TEMPLATES.SYSTEM_WITH_FILTERS(filters);
};

/**
 * Build catalog studio public templates URL with filters
 */
export const buildCatPublicTemplatesURL = (filters: CatTemplateFilters = {}): string => {
  return API_ENDPOINTS.CATALOG_STUDIO.TEMPLATES.PUBLIC_WITH_FILTERS(filters);
};

// =================================================================
// VALIDATION HELPERS - Add to existing validation section
// =================================================================

/**
 * Validate block ID format
 */
export const isValidBlockId = (id: string): boolean => {
  return isValidUUID(id);
};

/**
 * Validate template ID format
 */
export const isValidTemplateId = (id: string): boolean => {
  return isValidUUID(id);
};
