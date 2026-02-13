// src/services/serviceURLs.ts - UI Layer Version COMPLETE
// Updated with Service Catalog endpoints - ALL EXISTING ENDPOINTS PRESERVED
// Updated with Groups & Directory endpoints

// Catalog Studio filter types (declared before API_ENDPOINTS so helper functions can reference them)
export type CatBlockFilters = {
  block_type_id?: string;
  pricing_mode_id?: string;
  is_active?: boolean;
  tags?: string[];
  search?: string;
  page?: number;
  limit?: number;
};

export type CatTemplateFilters = {
  status_id?: string;
  is_public?: boolean;
  search?: string;
  page?: number;
  limit?: number;
};

// Contract event filter types (used by CONTRACT_EVENTS helper functions)
type ContractEventFilters = {
  contract_id?: string;
  contact_id?: string;
  assigned_to?: string;
  status?: string;
  event_type?: string;
  date_from?: string;
  date_to?: string;
  page?: number;
  per_page?: number;
  sort_by?: string;
  sort_order?: string;
};

type DateSummaryFilters = {
  contract_id?: string;
  contact_id?: string;
  assigned_to?: string;
  event_type?: string;
};

// Smart Forms filter types (used by ADMIN.SMART_FORMS helper functions)
export type SmartFormsFilters = {
  page?: number;
  limit?: number;
  status?: string;
  category?: string;
  form_type?: string;
  search?: string;
};

// Smart Forms submission filter types (Cycle 3 — tenant-facing)
export type SmartFormSubmissionFilters = {
  event_id?: string;
  contract_id?: string;
  template_id?: string;
};

export const API_ENDPOINTS = {
  // =================================================================
  // ONBOARDING ENDPOINTS - PRESERVED
  // =================================================================
  ONBOARDING: {
    // Main onboarding operations
    STATUS: '/api/onboarding/status',
    INITIALIZE: '/api/onboarding/initialize',
    COMPLETE: '/api/onboarding/complete',
    
    // Step operations
    STEP: {
      COMPLETE: '/api/onboarding/step/complete',
      SKIP: '/api/onboarding/step/skip',
    },
    
    // Progress tracking
    PROGRESS: '/api/onboarding/progress',
    
    // Testing/Debug
    TEST: '/api/onboarding/test',
    
    // Helper functions for building URLs
    helpers: {
      // Get status with optional query params
      getStatusUrl: (includeSteps: boolean = true) => {
        const params = new URLSearchParams();
        if (includeSteps) params.append('includeSteps', 'true');
        const queryString = params.toString();
        return queryString ? `/api/onboarding/status?${queryString}` : '/api/onboarding/status';
      },
      
      // Build complete step URL with step ID
      completeStepUrl: (stepId?: string) => {
        if (stepId) {
          const params = new URLSearchParams({ stepId });
          return `/api/onboarding/step/complete?${params.toString()}`;
        }
        return '/api/onboarding/step/complete';
      },
      
      // Build skip step URL with step ID
      skipStepUrl: (stepId?: string) => {
        if (stepId) {
          const params = new URLSearchParams({ stepId });
          return `/api/onboarding/step/skip?${params.toString()}`;
        }
        return '/api/onboarding/step/skip';
      }
    }
  },

  MASTERDATA: {
    CATEGORIES: '/api/masterdata/categories',
    CATEGORY_DETAILS: '/api/masterdata/category-details',
    NEXT_SEQUENCE: '/api/masterdata/next-sequence'
  },
  
  // =================================================================
  // PRODUCT MASTER DATA ENDPOINTS - PRESERVED
  // =================================================================
  PRODUCT_MASTERDATA: {
    // Health and utility endpoints
    HEALTH: '/api/product-masterdata/health',
    CONSTANTS: '/api/product-masterdata/constants',
    
    // Global master data endpoints
    GLOBAL: {
      // Get global master data for specific category
      GET_CATEGORY: '/api/product-masterdata/global',
      
      // Get all global categories
      LIST_CATEGORIES: '/api/product-masterdata/global/categories',
      
      // Helper function to build global category URL with parameters
      GET_CATEGORY_WITH_PARAMS: (categoryName: string, isActive: boolean = true) => {
        const params = new URLSearchParams({
          category_name: categoryName,
          is_active: isActive.toString()
        });
        return `/api/product-masterdata/global?${params.toString()}`;
      },
      
      // Helper function to build global categories URL with active filter
      LIST_CATEGORIES_WITH_FILTER: (isActive: boolean = true) => {
        const params = new URLSearchParams({
          is_active: isActive.toString()
        });
        return `/api/product-masterdata/global/categories?${params.toString()}`;
      }
    },
    
    // Tenant-specific master data endpoints
    TENANT: {
      // Get tenant master data for specific category
      GET_CATEGORY: '/api/product-masterdata/tenant',
      
      // Get all tenant categories
      LIST_CATEGORIES: '/api/product-masterdata/tenant/categories',
      
      // Helper function to build tenant category URL with parameters
      GET_CATEGORY_WITH_PARAMS: (categoryName: string, isActive: boolean = true) => {
        const params = new URLSearchParams({
          category_name: categoryName,
          is_active: isActive.toString()
        });
        return `/api/product-masterdata/tenant?${params.toString()}`;
      },
      
      // Helper function to build tenant categories URL with active filter
      LIST_CATEGORIES_WITH_FILTER: (isActive: boolean = true) => {
        const params = new URLSearchParams({
          is_active: isActive.toString()
        });
        return `/api/product-masterdata/tenant/categories?${params.toString()}`;
      }
    },

    // =================================================================
    // INDUSTRY-FIRST ONBOARDING ENDPOINTS - PRESERVED
    // =================================================================
    INDUSTRIES: {
      // Get industries with pagination and search
      LIST: '/api/product-masterdata/industries',
      
      // Helper function to build industries URL with parameters
      LIST_WITH_PARAMS: (filters: IndustryFilters = {}) => {
        const params = new URLSearchParams();

        if (filters.page) params.append('page', filters.page.toString());
        if (filters.limit) params.append('limit', filters.limit.toString());
        if (filters.search) params.append('search', filters.search);
        if (filters.is_active !== undefined) params.append('is_active', filters.is_active.toString());
        if (filters.level !== undefined) params.append('level', filters.level.toString());
        if (filters.parent_id) params.append('parent_id', filters.parent_id);

        const queryString = params.toString();
        return queryString ? `/api/product-masterdata/industries?${queryString}` : '/api/product-masterdata/industries';
      }
    },

    CATEGORIES: {
      // Get all categories with pagination and search
      LIST_ALL: '/api/product-masterdata/categories/all',
      
      // Get industry-specific categories with filtering
      LIST_BY_INDUSTRY: '/api/product-masterdata/categories/by-industry',
      
      // Helper function to build all categories URL with parameters
      LIST_ALL_WITH_PARAMS: (filters: CategoryFilters = {}) => {
        const params = new URLSearchParams();
        
        if (filters.page) params.append('page', filters.page.toString());
        if (filters.limit) params.append('limit', filters.limit.toString());
        if (filters.search) params.append('search', filters.search);
        if (filters.is_active !== undefined) params.append('is_active', filters.is_active.toString());
        
        const queryString = params.toString();
        return queryString ? `/api/product-masterdata/categories/all?${queryString}` : '/api/product-masterdata/categories/all';
      },
      
      // Helper function to build industry categories URL with parameters
      LIST_BY_INDUSTRY_WITH_PARAMS: (industryId: string, filters: IndustryCategoryFilters = {}) => {
        const params = new URLSearchParams({
          industry_id: industryId
        });
        
        if (filters.is_primary !== undefined) params.append('is_primary', filters.is_primary.toString());
        if (filters.page) params.append('page', filters.page.toString());
        if (filters.limit) params.append('limit', filters.limit.toString());
        if (filters.search) params.append('search', filters.search);
        if (filters.is_active !== undefined) params.append('is_active', filters.is_active.toString());
        
        return `/api/product-masterdata/categories/by-industry?${params.toString()}`;
      }
    }
  },
  
  AUTH: {
    LOGIN: '/api/auth/login',
    REGISTER: '/api/auth/register',
    REGISTER_WITH_INVITATION: '/api/auth/register-with-invitation',
    USER: '/api/auth/user',
    SIGNOUT: '/api/auth/signout',
    REFRESH_TOKEN: '/api/auth/refresh-token',
    RESET_PASSWORD: '/api/auth/reset-password',
    CHANGE_PASSWORD: '/api/auth/change-password',
    COMPLETE_REGISTRATION: '/api/auth/complete-registration',
    VERIFY_PASSWORD: '/api/auth/verify-password',
    UPDATE_PREFERENCES: '/api/auth/preferences',
    
    // Google OAuth endpoints
    GOOGLE_AUTH: '/api/auth/google',
    GOOGLE_CALLBACK: '/api/auth/google-callback',
    GOOGLE_LINK: '/api/auth/google-link',
    GOOGLE_UNLINK: '/api/auth/google-unlink'
  },
  
  TENANTS: {
    LIST: '/api/tenants',
    CREATE: '/api/tenants',
    UPDATE: '/api/tenants',
    GET: '/api/tenants',
    PROFILE: '/api/tenant-profile',
    UPLOAD_LOGO: '/api/tenant-profile/logo',
    SERVED_INDUSTRIES: {
      LIST: '/api/tenant-profile/served-industries',
      ADD: '/api/tenant-profile/served-industries',
      REMOVE: (industryId: string) => `/api/tenant-profile/served-industries/${industryId}`,
      UNLOCK_PREVIEW: '/api/tenant-profile/served-industries/unlock-preview'
    }
  },
  
  // =================================================================
  // RESOURCES MANAGEMENT ENDPOINTS - PRESERVED
  // =================================================================
  RESOURCES: {
    // Main resource operations
    LIST: '/api/resources',
    CREATE: '/api/resources',
    GET: (id: string) => `/api/resources/${id}`,
    UPDATE: (id: string) => `/api/resources/${id}`,
    DELETE: (id: string) => `/api/resources/${id}`,
    
    // Resource types
    RESOURCE_TYPES: '/api/resources/resource-types',
    
    // Utility endpoints
    HEALTH: '/api/resources/health',
    SIGNING_STATUS: '/api/resources/signing-status',
    
    // Helper functions for building URLs with query parameters
    LIST_WITH_FILTERS: (filters: ResourceFilters = {}) => {
      const params = new URLSearchParams();
      
      if (filters.resourceTypeId) params.append('resourceTypeId', filters.resourceTypeId);
      if (filters.nextSequence) params.append('nextSequence', 'true');
      if (filters.search) params.append('search', filters.search);
      if (filters.includeInactive) params.append('includeInactive', 'true');
      
      const queryString = params.toString();
      return queryString ? `/api/resources?${queryString}` : '/api/resources';
    },
    
    // Get next sequence number for a resource type
    NEXT_SEQUENCE: (resourceTypeId: string) => `/api/resources?resourceTypeId=${resourceTypeId}&nextSequence=true`
  },
  
  // USER MANAGEMENT ENDPOINTS - PRESERVED
  USERS: {
    // Current user endpoints
    ME: '/api/users/me',
    UPDATE_PROFILE: '/api/users/me',
    
    // User list and details
    LIST: '/api/users',
    GET: (id: string) => `/api/users/${id}`,
    UPDATE: (id: string) => `/api/users/${id}`,
    
    // User actions
    SUSPEND: (id: string) => `/api/users/${id}/suspend`,
    ACTIVATE: (id: string) => `/api/users/${id}/activate`,
    RESET_PASSWORD: (id: string) => `/api/users/${id}/reset-password`,
    
    // Activity and analytics
    ACTIVITY: (id: string) => `/api/users/${id}/activity`,
    
    // Role management
    ASSIGN_ROLE: (id: string) => `/api/users/${id}/roles`,
    REMOVE_ROLE: (id: string, roleId: string) => `/api/users/${id}/roles/${roleId}`,
    
    // Invitations
    INVITATIONS: {
      LIST: '/api/users/invitations',
      CREATE: '/api/users/invitations',
      GET: (id: string) => `/api/users/invitations/${id}`,
      RESEND: (id: string) => `/api/users/invitations/${id}/resend`,
      CANCEL: (id: string) => `/api/users/invitations/${id}/cancel`,
      VALIDATE: '/api/users/invitations/validate',
      ACCEPT: '/api/users/invitations/accept'
    }
  },
  
  // CONTACT MANAGEMENT ENDPOINTS - PRESERVED
  CONTACTS: {
    // Main contact operations
    LIST: '/api/contacts',
    CREATE: '/api/contacts',
    GET: (id: string) => `/api/contacts/${id}`,
    UPDATE: (id: string) => `/api/contacts/${id}`,
    DELETE: (id: string) => `/api/contacts/${id}`,
    
    // Status management
    UPDATE_STATUS: (id: string) => `/api/contacts/${id}/status`,
    
    // Search and discovery
    SEARCH: '/api/contacts/search',
    DUPLICATES: '/api/contacts/duplicates',
    
    // Business actions
    SEND_INVITATION: (id: string) => `/api/contacts/${id}/invite`,
    
    // Analytics and reporting
    STATS: '/api/contacts/stats',
    
    // Utility endpoints
    HEALTH: '/api/contacts/health',
    CONSTANTS: '/api/contacts/constants',
    
    // Sub-resource management
    CHANNELS: {
      LIST: (contactId: string) => `/api/contacts/${contactId}/channels`,
      CREATE: (contactId: string) => `/api/contacts/${contactId}/channels`,
      UPDATE: (contactId: string, channelId: string) => `/api/contacts/${contactId}/channels/${channelId}`,
      DELETE: (contactId: string, channelId: string) => `/api/contacts/${contactId}/channels/${channelId}`
    },
    
    ADDRESSES: {
      LIST: (contactId: string) => `/api/contacts/${contactId}/addresses`,
      CREATE: (contactId: string) => `/api/contacts/${contactId}/addresses`,
      UPDATE: (contactId: string, addressId: string) => `/api/contacts/${contactId}/addresses/${addressId}`,
      DELETE: (contactId: string, addressId: string) => `/api/contacts/${contactId}/addresses/${addressId}`
    },
    
    // Bulk operations
    BULK: {
      UPDATE_STATUS: '/api/contacts/bulk/update-status',
      ADD_TAGS: '/api/contacts/bulk/add-tags',
      REMOVE_TAGS: '/api/contacts/bulk/remove-tags',
      EXPORT: '/api/contacts/bulk/export',
      IMPORT: '/api/contacts/bulk/import',
      DELETE: '/api/contacts/bulk/delete'
    }
  },
  
  ADMIN: {
    STORAGE: {
      DIAGNOSTIC: '/api/admin/storage/diagnostic',
      FIREBASE_STATUS: '/api/admin/storage/firebase/status',
      TENANT_STRUCTURE: '/api/admin/storage/diagnostic/tenant-structure',
      LIST_FILES: '/api/admin/storage/diagnostic/list',
      UPLOAD_FILE: '/api/admin/storage/diagnostic/upload',
      DELETE_FILE: '/api/admin/storage/diagnostic/file'
    },
    TENANT_MANAGEMENT: {
      STATS: '/api/admin/tenants/stats',
      LIST: '/api/admin/tenants/list',
      LIST_WITH_FILTERS: (filters: AdminTenantListFilters = {}) => {
        const params = new URLSearchParams();
        if (filters.page) params.append('page', filters.page.toString());
        if (filters.limit) params.append('limit', filters.limit.toString());
        if (filters.status) params.append('status', filters.status);
        if (filters.subscription_status) params.append('subscription_status', filters.subscription_status);
        if (filters.search) params.append('search', filters.search);
        if (filters.sort_by) params.append('sort_by', filters.sort_by);
        if (filters.sort_direction) params.append('sort_direction', filters.sort_direction);
        const queryString = params.toString();
        return queryString ? `/api/admin/tenants/list?${queryString}` : '/api/admin/tenants/list';
      },
      DATA_SUMMARY: (tenantId: string) => `/api/admin/tenants/${tenantId}/data-summary`,
      RESET_TEST_DATA: (tenantId: string) => `/api/admin/tenants/${tenantId}/reset-test-data`,
      RESET_ALL_DATA: (tenantId: string) => `/api/admin/tenants/${tenantId}/reset-all-data`,
      CLOSE_ACCOUNT: (tenantId: string) => `/api/admin/tenants/${tenantId}/close-account`
    },
    JTD: {
      QUEUE_METRICS: '/api/admin/jtd/queue/metrics',
      TENANT_STATS: '/api/admin/jtd/tenants/stats',
      TENANT_STATS_WITH_FILTERS: (filters: { page?: number; limit?: number; search?: string; sort_by?: string; sort_dir?: string } = {}) => {
        const params = new URLSearchParams();
        if (filters.page) params.append('page', filters.page.toString());
        if (filters.limit) params.append('limit', filters.limit.toString());
        if (filters.search) params.append('search', filters.search);
        if (filters.sort_by) params.append('sort_by', filters.sort_by);
        if (filters.sort_dir) params.append('sort_dir', filters.sort_dir);
        const qs = params.toString();
        return qs ? `/api/admin/jtd/tenants/stats?${qs}` : '/api/admin/jtd/tenants/stats';
      },
      EVENTS: '/api/admin/jtd/events',
      EVENTS_WITH_FILTERS: (filters: {
        page?: number; limit?: number; tenant_id?: string; status?: string;
        event_type?: string; channel?: string; source_type?: string;
        search?: string; date_from?: string; date_to?: string;
        sort_by?: string; sort_dir?: string;
      } = {}) => {
        const params = new URLSearchParams();
        if (filters.page) params.append('page', filters.page.toString());
        if (filters.limit) params.append('limit', filters.limit.toString());
        if (filters.tenant_id) params.append('tenant_id', filters.tenant_id);
        if (filters.status) params.append('status', filters.status);
        if (filters.event_type) params.append('event_type', filters.event_type);
        if (filters.channel) params.append('channel', filters.channel);
        if (filters.source_type) params.append('source_type', filters.source_type);
        if (filters.search) params.append('search', filters.search);
        if (filters.date_from) params.append('date_from', filters.date_from);
        if (filters.date_to) params.append('date_to', filters.date_to);
        if (filters.sort_by) params.append('sort_by', filters.sort_by);
        if (filters.sort_dir) params.append('sort_dir', filters.sort_dir);
        const qs = params.toString();
        return qs ? `/api/admin/jtd/events?${qs}` : '/api/admin/jtd/events';
      },
      EVENT_DETAIL: (jtdId: string) => `/api/admin/jtd/events/${jtdId}`,
      WORKER_HEALTH: '/api/admin/jtd/worker/health',
      // R2 — Actions
      RETRY_EVENT: '/api/admin/jtd/actions/retry',
      CANCEL_EVENT: '/api/admin/jtd/actions/cancel',
      FORCE_COMPLETE: '/api/admin/jtd/actions/force-complete',
      DLQ_MESSAGES: '/api/admin/jtd/dlq/messages',
      DLQ_MESSAGES_WITH_FILTERS: (filters: { page?: number; limit?: number } = {}) => {
        const params = new URLSearchParams();
        if (filters.page) params.append('page', filters.page.toString());
        if (filters.limit) params.append('limit', filters.limit.toString());
        const qs = params.toString();
        return qs ? `/api/admin/jtd/dlq/messages?${qs}` : '/api/admin/jtd/dlq/messages';
      },
      REQUEUE_DLQ: '/api/admin/jtd/actions/requeue-dlq',
      PURGE_DLQ: '/api/admin/jtd/actions/purge-dlq'
    },
    // =================================================================
    // SMART FORMS — Admin Form Template Management
    // =================================================================
    SMART_FORMS: {
      LIST: '/api/admin/forms',
      GET: (id: string) => `/api/admin/forms/${id}`,
      CREATE: '/api/admin/forms',
      UPDATE: (id: string) => `/api/admin/forms/${id}`,
      DELETE: (id: string) => `/api/admin/forms/${id}`,
      VALIDATE: '/api/admin/forms/validate',
      CLONE: (id: string) => `/api/admin/forms/${id}/clone`,
      SUBMIT_REVIEW: (id: string) => `/api/admin/forms/${id}/submit-review`,
      APPROVE: (id: string) => `/api/admin/forms/${id}/approve`,
      REJECT: (id: string) => `/api/admin/forms/${id}/reject`,
      NEW_VERSION: (id: string) => `/api/admin/forms/${id}/new-version`,
      ARCHIVE: (id: string) => `/api/admin/forms/${id}/archive`,
      LIST_WITH_FILTERS: (filters: SmartFormsFilters = {}) => {
        const params = new URLSearchParams();
        if (filters.page) params.append('page', filters.page.toString());
        if (filters.limit) params.append('limit', filters.limit.toString());
        if (filters.status) params.append('status', filters.status);
        if (filters.category) params.append('category', filters.category);
        if (filters.form_type) params.append('form_type', filters.form_type);
        if (filters.search) params.append('search', filters.search);
        const qs = params.toString();
        return qs ? `/api/admin/forms?${qs}` : '/api/admin/forms';
      }
    }
  },

  // =================================================================
  // TENANT ACCOUNT ENDPOINTS (Owner-side: data summary + close account)
  // =================================================================
  TENANT_ACCOUNT: {
    DATA_SUMMARY: '/api/tenant/data-summary',
    RESET_TEST_DATA: '/api/tenant/reset-test-data',
    RESET_ALL_DATA: '/api/tenant/reset-all-data',
    CLOSE_ACCOUNT: '/api/tenant/close-account'
  },

  INTEGRATIONS: {
    BASE: '/api/integrations',
    LIST: '/api/integrations',
    BY_TYPE: (type: string) => `/api/integrations/${type}`,
    DETAIL: (type: string, providerId: string) => `/api/integrations/${type}/${providerId}`,
    TEST: '/api/integrations/test',
    TOGGLE_STATUS: (id: string) => `/api/integrations/${id}/status`
  },
  
  // BUSINESS MODEL ENDPOINTS - PRESERVED
  BUSINESSMODEL: {
    // Plan management
    PLANS: '/api/business-model/plans',
    PLAN_DETAIL: (id: string) => `/api/business-model/plans/${id}`,
    PLAN_EDIT: (id: string) => `/api/business-model/plans/${id}/edit`,
    PLAN_UPDATE: '/api/business-model/plans/edit',
    PLAN_VISIBILITY: (id: string) => `/api/business-model/plans/${id}/visibility`,
    PLAN_ARCHIVE: (id: string) => `/api/business-model/plans/${id}/archive`,
    
    // Plan version management
    PLAN_VERSIONS: '/api/business-model/plan-versions',
    PLAN_VERSION_DETAIL: (id: string) => `/api/business-model/plan-versions/${id}`,
    PLAN_VERSION_ACTIVATE: (id: string) => `/api/business-model/plan-versions/${id}/activate`,
    PLAN_VERSIONS_COMPARE: '/api/business-model/plan-versions/compare',
    
    // Tenant assignment
    PLAN_ASSIGN: (id: string) => `/api/business-model/plans/${id}/assign`,
    PLAN_TENANTS: (id: string) => `/api/business-model/plans/${id}/tenants`,
    
    // Billing integration
    BILLING_OVERVIEW: '/api/business-model/billing',
    BILLING_PLAN: (id: string) => `/api/business-model/billing/plans/${id}`
  },
  
  // =================================================================
  // CATALOG MANAGEMENT ENDPOINTS - PRESERVED
  // =================================================================
  CATALOG: {
    // Main catalog operations
    LIST: '/api/catalog',
    CREATE: '/api/catalog',
    GET: (id: string) => `/api/catalog/${id}`,
    UPDATE: (id: string) => `/api/catalog/${id}`,
    DELETE: (id: string) => `/api/catalog/${id}`,
    
    // Special operations
    RESTORE: (id: string) => `/api/catalog/restore/${id}`,
    VERSIONS: (id: string) => `/api/catalog/versions/${id}`,
    
    // Multi-currency operations
    MULTI_CURRENCY: {
      // Get tenant currencies
      TENANT_CURRENCIES: '/api/catalog/multi-currency',
      
      // Get catalog pricing details
      GET_PRICING: (catalogId: string) => `/api/catalog/multi-currency/${catalogId}`,
      
      // Create/update multi-currency pricing
      UPSERT_PRICING: '/api/catalog/multi-currency',
      
      // Update specific currency pricing
      UPDATE_CURRENCY: (catalogId: string, currency: string) => `/api/catalog/multi-currency/${catalogId}/${currency}`,
      
      // Delete specific currency pricing
      DELETE_CURRENCY: (catalogId: string, currency: string) => `/api/catalog/multi-currency/${catalogId}/${currency}`
    },
    
    // Legacy pricing endpoints (backward compatibility)
    PRICING: {
      // Legacy single currency operations
      UPSERT: (catalogId: string) => `/api/catalog/pricing/${catalogId}`,
      GET: (catalogId: string) => `/api/catalog/pricing/${catalogId}`,
      DELETE: (catalogId: string, currency: string) => `/api/catalog/pricing/${catalogId}/${currency}`,
      
      // Multi-currency operations (updated to match new structure)
      GET_MULTI: (catalogId: string) => `/api/catalog/multi-currency/${catalogId}?detailed=true`,
      UPSERT_MULTI: '/api/catalog/multi-currency',
      UPDATE_CURRENCY: (catalogId: string, currency: string) => `/api/catalog/multi-currency/${catalogId}/${currency}`,
      DELETE_CURRENCY: (catalogId: string, currency: string) => `/api/catalog/multi-currency/${catalogId}/${currency}`
    }
  },

  // =================================================================
  // SERVICE CATALOG ENDPOINTS - UPDATED WITH NEW STATUS & VERSION ENDPOINTS
  // =================================================================
  SERVICE_CATALOG: {
    // Main service operations via Express API layer
    LIST: '/api/service-catalog/services',
    CREATE: '/api/service-catalog/services',
    GET: (id: string) => `/api/service-catalog/services/${id}`,
    UPDATE: (id: string) => `/api/service-catalog/services/${id}`,
    DELETE: (id: string) => `/api/service-catalog/services/${id}`,
    
    // Service status management
    TOGGLE_STATUS: (id: string) => `/api/service-catalog/services/${id}/status`,
    ACTIVATE: (id: string) => `/api/service-catalog/services/${id}/activate`,
    
    // Service analytics and history
    STATISTICS: '/api/service-catalog/services/statistics',
    VERSION_HISTORY: (id: string) => `/api/service-catalog/services/${id}/versions`,
    
    // Service resources
    SERVICE_RESOURCES: (id: string) => `/api/service-catalog/services/${id}/resources`,
    
    // Master data and configuration
    MASTER_DATA: '/api/service-catalog/master-data',
    
    // Health and utility
    HEALTH: '/api/service-catalog/health',
    
    // Helper function for services with query params
    LIST_WITH_FILTERS: (filters: ServiceCatalogFilters = {}) => {
      const params = new URLSearchParams();
      
      if (filters.search_term) params.append('search_term', filters.search_term);
      if (filters.category_id) params.append('category_id', filters.category_id);
      if (filters.industry_id) params.append('industry_id', filters.industry_id);
      if (filters.is_active !== undefined) params.append('is_active', filters.is_active.toString());
      if (filters.price_min !== undefined) params.append('price_min', filters.price_min.toString());
      if (filters.price_max !== undefined) params.append('price_max', filters.price_max.toString());
      if (filters.currency) params.append('currency', filters.currency);
      if (filters.has_resources !== undefined) params.append('has_resources', filters.has_resources.toString());
      if (filters.sort_by) params.append('sort_by', filters.sort_by);
      if (filters.sort_direction) params.append('sort_direction', filters.sort_direction);
      if (filters.limit !== undefined) params.append('limit', filters.limit.toString());
      if (filters.offset !== undefined) params.append('offset', filters.offset.toString());
      
      const queryString = params.toString();
      return queryString ? `/api/service-catalog/services?${queryString}` : '/api/service-catalog/services';
    }
  },
  
  // =================================================================
  // CATALOG STUDIO ENDPOINTS
  // =================================================================
  CATALOG_STUDIO: {
    // Health check
    HEALTH: '/api/catalog-studio/health',

    // Block operations
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

    // Template operations
    TEMPLATES: {
      LIST: '/api/catalog-studio/templates',
      GET: (id: string) => `/api/catalog-studio/templates/${id}`,
      CREATE: '/api/catalog-studio/templates',
      UPDATE: (id: string) => `/api/catalog-studio/templates/${id}`,
      DELETE: (id: string) => `/api/catalog-studio/templates/${id}`,
      SYSTEM: '/api/catalog-studio/templates/system',
      PUBLIC: '/api/catalog-studio/templates/public',
      COPY: (id: string) => `/api/catalog-studio/templates/${id}/copy`,

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

      SYSTEM_WITH_FILTERS: (filters: CatTemplateFilters = {}) => {
        const params = new URLSearchParams();

        if (filters.status_id) params.append('status_id', filters.status_id);
        if (filters.search) params.append('search', filters.search);
        if (filters.page) params.append('page', filters.page.toString());
        if (filters.limit) params.append('limit', filters.limit.toString());

        const queryString = params.toString();
        return queryString ? `/api/catalog-studio/templates/system?${queryString}` : '/api/catalog-studio/templates/system';
      },

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
  // GROUPS & DIRECTORY MANAGEMENT ENDPOINTS - NEW ADDITION
  // =================================================================
  GROUPS: {
    // Main group operations
    LIST: '/api/groups',
    GET: (groupId: string) => `/api/groups/${groupId}`,
    VERIFY_ACCESS: '/api/groups/verify-access',
    
    // Helper function for listing groups with filters
    LIST_WITH_FILTERS: (filters: GroupFilters = {}) => {
      const params = new URLSearchParams();
      
      if (filters.group_type) params.append('group_type', filters.group_type);
      if (filters.is_active !== undefined) params.append('is_active', filters.is_active.toString());
      if (filters.search) params.append('search', filters.search);
      
      const queryString = params.toString();
      return queryString ? `/api/groups?${queryString}` : '/api/groups';
    },
    
    // Membership operations
    MEMBERSHIPS: {
      CREATE: '/api/memberships',
      GET: (membershipId: string) => `/api/memberships/${membershipId}`,
      UPDATE: (membershipId: string) => `/api/memberships/${membershipId}`,
      DELETE: (membershipId: string) => `/api/memberships/${membershipId}`,
      LIST_BY_GROUP: (groupId: string) => `/api/memberships/group/${groupId}`,
      
      // Helper function for listing memberships with filters
      LIST_BY_GROUP_WITH_FILTERS: (groupId: string, filters: MembershipFilters = {}) => {
        const params = new URLSearchParams();
        
        if (filters.status) params.append('status', filters.status);
        if (filters.limit !== undefined) params.append('limit', filters.limit.toString());
        if (filters.offset !== undefined) params.append('offset', filters.offset.toString());
        
        const queryString = params.toString();
        return queryString 
          ? `/api/memberships/group/${groupId}?${queryString}` 
          : `/api/memberships/group/${groupId}`;
      }
    },
    
    // Profile operations (AI-powered)
    PROFILES: {
      ENHANCE: '/api/profiles/enhance',
      SCRAPE_WEBSITE: '/api/profiles/scrape-website',
      GENERATE_CLUSTERS: '/api/profiles/generate-clusters',
      SAVE: '/api/profiles/save',
      SAVE_CLUSTERS: '/api/profiles/clusters',
      GET_CLUSTERS: (membershipId: string) => `/api/profiles/clusters/${membershipId}`,
      DELETE_CLUSTERS: (membershipId: string) => `/api/profiles/clusters/${membershipId}`,
    },
    
    // Search operations
    SEARCH: '/api/search',
    
    // Helper function for search with options
    SEARCH_WITH_OPTIONS: (searchOptions: GroupSearchOptions = {}) => {
      // Search uses POST, but we can build the body structure here
      return {
        url: '/api/search',
        body: {
          group_id: searchOptions.group_id,
          query: searchOptions.query,
          limit: searchOptions.limit || 10,
          use_cache: searchOptions.use_cache !== false
        }
      };
    },
    
    // Admin operations
    ADMIN: {
      STATS: (groupId: string) => `/api/admin/stats/${groupId}`,
      UPDATE_MEMBERSHIP_STATUS: (membershipId: string) => `/api/admin/memberships/${membershipId}/status`,
      ACTIVITY_LOGS: (groupId: string) => `/api/admin/activity-logs/${groupId}`,
      
      // Helper function for activity logs with filters
      ACTIVITY_LOGS_WITH_FILTERS: (groupId: string, filters: ActivityLogFilters = {}) => {
        const params = new URLSearchParams();

        if (filters.activity_type) params.append('activity_type', filters.activity_type);
        if (filters.limit !== undefined) params.append('limit', filters.limit.toString());
        if (filters.offset !== undefined) params.append('offset', filters.offset.toString());

        const queryString = params.toString();
        return queryString
          ? `/api/admin/activity-logs/${groupId}?${queryString}`
          : `/api/admin/activity-logs/${groupId}`;
      }
    },

    // Tenant Dashboard operations (NLP-based search)
    TENANTS_DASHBOARD: {
      STATS: '/api/tenants/stats',
      SEARCH: '/api/tenants/search',
      INTENTS: '/api/intents',

      // Helper function for getting intents with filters
      INTENTS_WITH_FILTERS: (groupId: string, userRole: string = 'admin', channel: string = 'web') => {
        const params = new URLSearchParams();
        params.append('group_id', groupId);
        params.append('user_role', userRole);
        params.append('channel', channel);
        return `/api/intents?${params.toString()}`;
      }
    },

    // SmartProfile operations (tenant-level AI profiles)
    SMARTPROFILES: {
      GET: (tenantId: string) => `/api/smartprofiles/${tenantId}`,
      SAVE: '/api/smartprofiles',
      GENERATE: '/api/smartprofiles/generate',
      SEARCH: '/api/smartprofiles/search'
    }
  },

  // =================================================================
  // SERVICE CONTRACTS - BLOCK SYSTEM ENDPOINTS - PRESERVED
  // =================================================================
  SERVICE_CONTRACTS: {
    BLOCKS: {
      // Main block data endpoints (read-only)
      CATEGORIES: '/api/service-contracts/blocks/categories',
      MASTERS: '/api/service-contracts/blocks/masters',
      VARIANTS: (masterId: string) => `/api/service-contracts/blocks/masters/${masterId}/variants`,
      HIERARCHY: '/api/service-contracts/blocks/hierarchy',
      VARIANT_DETAIL: (variantId: string) => `/api/service-contracts/blocks/variant/${variantId}`,
      
      // Template builder optimized endpoints
      TEMPLATE_BUILDER: '/api/service-contracts/blocks/template-builder',
      SEARCH: '/api/service-contracts/blocks/search',
      STATS: '/api/service-contracts/blocks/stats'
    },
    
    // Templates
    TEMPLATES: {
      // Global templates (Admin only)
      GLOBAL: {
        LIST: '/api/service-contracts/templates/global',
        CREATE: '/api/service-contracts/templates/global',
        GET: (id: string) => `/api/service-contracts/templates/global/${id}`,
        UPDATE: (id: string) => `/api/service-contracts/templates/global/${id}`,
        DELETE: (id: string) => `/api/service-contracts/templates/global/${id}`,
        ANALYTICS: '/api/service-contracts/templates/global/analytics'
      },
      
      // Local templates (Tenant)
      LOCAL: {
        LIST: '/api/service-contracts/templates',
        CREATE: '/api/service-contracts/templates',
        GET: (id: string) => `/api/service-contracts/templates/${id}`,
        UPDATE: (id: string) => `/api/service-contracts/templates/${id}`,
        DELETE: (id: string) => `/api/service-contracts/templates/${id}`,
        CLONE: (id: string) => `/api/service-contracts/templates/${id}/clone`,
        PREVIEW: (id: string) => `/api/service-contracts/templates/${id}/preview`
      },
      
      // Template operations
      COPY_GLOBAL: (globalId: string) => `/api/service-contracts/templates/copy-global/${globalId}`,
      MARKETPLACE: '/api/service-contracts/templates/marketplace',
      MY_TEMPLATES: '/api/service-contracts/templates/my-templates'
    },
    
    CONTRACTS: {
      // Main contract operations
      LIST: '/api/service-contracts/contracts',
      CREATE: '/api/service-contracts/contracts',
      GET: (id: string) => `/api/service-contracts/contracts/${id}`,
      UPDATE: (id: string) => `/api/service-contracts/contracts/${id}`,
      DELETE: (id: string) => `/api/service-contracts/contracts/${id}`,
      
      // Contract lifecycle
      SEND: (id: string) => `/api/service-contracts/contracts/${id}/send`,
      ACCEPT: (id: string) => `/api/service-contracts/contracts/${id}/accept`,
      COMPLETE: (id: string) => `/api/service-contracts/contracts/${id}/complete`,
      
      // Contract details
      TIMELINE: (id: string) => `/api/service-contracts/contracts/${id}/timeline`,
      EVENTS: (id: string) => `/api/service-contracts/contracts/${id}/events`,
      PREVIEW: (id: string) => `/api/service-contracts/contracts/${id}/preview`
    }
  },
  
  // =================================================================
  // CONTRACTS CRUD ENDPOINTS - NEW
  // =================================================================
  CONTRACTS: {
    // Main CRUD operations
    LIST: '/api/contracts',
    CREATE: '/api/contracts',
    GET: (id: string) => `/api/contracts/${id}`,
    UPDATE: (id: string) => `/api/contracts/${id}`,
    DELETE: (id: string) => `/api/contracts/${id}`,

    // Status management
    UPDATE_STATUS: (id: string) => `/api/contracts/${id}/status`,

    // Invoices & payments
    INVOICES: (id: string) => `/api/contracts/${id}/invoices`,
    RECORD_PAYMENT: (id: string) => `/api/contracts/${id}/invoices/record-payment`,
    NOTIFY: (id: string) => `/api/contracts/${id}/notify`,

    // Dashboard stats
    STATS: '/api/contracts/stats',

    // Health check
    HEALTH: '/api/contracts/health',
     // Public access (no auth required)
   PUBLIC_VALIDATE: '/api/contracts/public/validate',
    PUBLIC_RESPOND: '/api/contracts/public/respond',


    // CNAK Claim endpoint
    CLAIM: '/api/contracts/claim',

    // Helper: build list URL with filters
    LIST_WITH_FILTERS: (filters: ContractCrudFilters = {}) => {
      const params = new URLSearchParams();

      if (filters.record_type) params.append('record_type', filters.record_type);
      if (filters.contract_type) params.append('contract_type', filters.contract_type);
      if (filters.status) params.append('status', filters.status);
      if (filters.search) params.append('search', filters.search);
      if (filters.start_date_from) params.append('start_date_from', filters.start_date_from);
      if (filters.start_date_to) params.append('start_date_to', filters.start_date_to);
      if (filters.end_date_from) params.append('end_date_from', filters.end_date_from);
      if (filters.end_date_to) params.append('end_date_to', filters.end_date_to);
      if (filters.min_value !== undefined) params.append('min_value', filters.min_value.toString());
      if (filters.max_value !== undefined) params.append('max_value', filters.max_value.toString());
      if (filters.currency) params.append('currency', filters.currency);
      if (filters.sort_by) params.append('sort_by', filters.sort_by);
      if (filters.sort_direction) params.append('sort_direction', filters.sort_direction);
      if (filters.limit !== undefined) params.append('limit', filters.limit.toString());
      if (filters.offset !== undefined) params.append('offset', filters.offset.toString());
      if (filters.page !== undefined) params.append('page', filters.page.toString());

      const queryString = params.toString();
      return queryString ? `/api/contracts?${queryString}` : '/api/contracts';
    }
  },

  // =================================================================
  // CONTRACT EVENTS (TIMELINE) ENDPOINTS
  // =================================================================
  CONTRACT_EVENTS: {
    LIST: '/api/contract-events',
    DATES: '/api/contract-events/dates',
    GET: (id: string) => `/api/contract-events/${id}`,
    CREATE: '/api/contract-events',
    UPDATE: (id: string) => `/api/contract-events/${id}`,

    LIST_WITH_FILTERS: (filters: ContractEventFilters = {}) => {
      const params = new URLSearchParams();

      if (filters.contract_id) params.append('contract_id', filters.contract_id);
      if (filters.contact_id) params.append('contact_id', filters.contact_id);
      if (filters.assigned_to) params.append('assigned_to', filters.assigned_to);
      if (filters.status) params.append('status', filters.status);
      if (filters.event_type) params.append('event_type', filters.event_type);
      if (filters.date_from) params.append('date_from', filters.date_from);
      if (filters.date_to) params.append('date_to', filters.date_to);
      if (filters.page !== undefined) params.append('page', filters.page.toString());
      if (filters.per_page !== undefined) params.append('per_page', filters.per_page.toString());
      if (filters.sort_by) params.append('sort_by', filters.sort_by);
      if (filters.sort_order) params.append('sort_order', filters.sort_order);

      const queryString = params.toString();
      return queryString ? `/api/contract-events?${queryString}` : '/api/contract-events';
    },

    DATES_WITH_FILTERS: (filters: DateSummaryFilters = {}) => {
      const params = new URLSearchParams();

      if (filters.contract_id) params.append('contract_id', filters.contract_id);
      if (filters.contact_id) params.append('contact_id', filters.contact_id);
      if (filters.assigned_to) params.append('assigned_to', filters.assigned_to);
      if (filters.event_type) params.append('event_type', filters.event_type);

      const queryString = params.toString();
      return queryString ? `/api/contract-events/dates?${queryString}` : '/api/contract-events/dates';
    },
  },

  // =================================================================
  // EVENT STATUS CONFIG ENDPOINTS
  // =================================================================
  EVENT_STATUS_CONFIG: {
    // Status definitions
    STATUSES: '/api/event-status-config/statuses',

    // Status transitions
    TRANSITIONS: '/api/event-status-config/transitions',

    // Seed defaults for tenant
    SEED: '/api/event-status-config/seed',

    // Helper: get statuses for a specific event type
    GET_STATUSES: (eventType: string) => {
      const params = new URLSearchParams({ event_type: eventType });
      return `/api/event-status-config/statuses?${params.toString()}`;
    },

    // Helper: get transitions for a specific event type + optional from_status
    GET_TRANSITIONS: (eventType: string, fromStatus?: string) => {
      const params = new URLSearchParams({ event_type: eventType });
      if (fromStatus) params.append('from_status', fromStatus);
      return `/api/event-status-config/transitions?${params.toString()}`;
    },
  },

  // =================================================================
  // PAYMENT GATEWAY ENDPOINTS
  // =================================================================
  PAYMENTS: {
    CREATE_ORDER: '/api/payments/create-order',
    CREATE_LINK: '/api/payments/create-link',
    VERIFY_PAYMENT: '/api/payments/verify-payment',
    STATUS: '/api/payments/status',
  },

  // =================================================================
  // SERVICE EXECUTION ENDPOINTS (Tickets, Evidence, Audit)
  // =================================================================
  SERVICE_EXECUTION: {
    HEALTH: '/api/service-execution/health',

    // Tickets
    TICKETS: {
      LIST: '/api/service-execution',
      CREATE: '/api/service-execution',
      GET: (ticketId: string) => `/api/service-execution/${ticketId}`,
      UPDATE: (ticketId: string) => `/api/service-execution/${ticketId}`,

      LIST_WITH_FILTERS: (filters: ServiceTicketFilters = {}) => {
        const params = new URLSearchParams();
        if (filters.contract_id) params.append('contract_id', filters.contract_id);
        if (filters.status) params.append('status', filters.status);
        if (filters.assigned_to) params.append('assigned_to', filters.assigned_to);
        if (filters.page) params.append('page', filters.page.toString());
        if (filters.per_page) params.append('per_page', filters.per_page.toString());
        const qs = params.toString();
        return qs ? `/api/service-execution?${qs}` : '/api/service-execution';
      },
    },

    // Evidence
    EVIDENCE: {
      LIST: '/api/service-execution/evidence',
      CREATE: (ticketId: string) => `/api/service-execution/${ticketId}/evidence`,
      UPDATE: (ticketId: string, evidenceId: string) => `/api/service-execution/${ticketId}/evidence/${evidenceId}`,
      LIST_FOR_TICKET: (ticketId: string) => `/api/service-execution/${ticketId}/evidence`,

      LIST_WITH_FILTERS: (filters: ServiceEvidenceFilters = {}) => {
        const params = new URLSearchParams();
        if (filters.contract_id) params.append('contract_id', filters.contract_id);
        if (filters.ticket_id) params.append('ticket_id', filters.ticket_id);
        if (filters.evidence_type) params.append('evidence_type', filters.evidence_type);
        if (filters.status) params.append('status', filters.status);
        if (filters.page) params.append('page', filters.page.toString());
        if (filters.per_page) params.append('per_page', filters.per_page.toString());
        const qs = params.toString();
        return qs ? `/api/service-execution/evidence?${qs}` : '/api/service-execution/evidence';
      },
    },

    // Audit Log
    AUDIT: {
      LIST: '/api/service-execution/audit',

      LIST_WITH_FILTERS: (filters: AuditLogFilters = {}) => {
        const params = new URLSearchParams();
        if (filters.contract_id) params.append('contract_id', filters.contract_id);
        if (filters.entity_type) params.append('entity_type', filters.entity_type);
        if (filters.entity_id) params.append('entity_id', filters.entity_id);
        if (filters.category) params.append('category', filters.category);
        if (filters.date_from) params.append('date_from', filters.date_from);
        if (filters.date_to) params.append('date_to', filters.date_to);
        if (filters.page) params.append('page', filters.page.toString());
        if (filters.per_page) params.append('per_page', filters.per_page.toString());
        const qs = params.toString();
        return qs ? `/api/service-execution/audit?${qs}` : '/api/service-execution/audit';
      },
    },
  },

  // System and maintenance endpoints
  SYSTEM: {
    MAINTENANCE_STATUS: '/api/system/maintenance/status',
    HEALTH_CHECK: '/api/system/health',
    SESSION_STATUS: '/api/system/session/status'
  },
  
  STORAGE: {
    STATS: '/api/storage/stats',
    SETUP: '/api/storage/setup', 
    FILES: '/api/storage/files',
    CATEGORIES: '/api/storage/categories',
    UPLOAD_MULTIPLE: '/api/storage/files/multiple',
    DELETE_BATCH: '/api/storage/files/delete-batch'
  },
  
  TAX_SETTINGS: {
    BASE: '/api/tax-settings',
    SETTINGS: '/api/tax-settings/settings',
    RATES: '/api/tax-settings/rates',
    RATE_DETAIL: (id: string) => `/api/tax-settings/rates/${id}`,
  },

  // =================================================================
  // SEQUENCE NUMBERS MANAGEMENT ENDPOINTS - NEW
  // =================================================================
  SEQUENCES: {
    // Health check
    HEALTH: '/api/sequences/health',

    // Sequence configurations CRUD
    CONFIGS: {
      LIST: '/api/sequences/configs',
      CREATE: '/api/sequences/configs',
      UPDATE: (id: string) => `/api/sequences/configs/${id}`,
      DELETE: (id: string) => `/api/sequences/configs/${id}`,
    },

    // Sequence status and operations
    STATUS: '/api/sequences/status',
    NEXT: (code: string) => `/api/sequences/next/${code}`,
    RESET: (code: string) => `/api/sequences/reset/${code}`,

    // Onboarding and backfill
    SEED: '/api/sequences/seed',
    BACKFILL: (code: string) => `/api/sequences/backfill/${code}`,

    // Helper function for listing configs with filters
    LIST_WITH_FILTERS: (filters: SequenceFilters = {}) => {
      const params = new URLSearchParams();

      if (filters.is_active !== undefined) params.append('is_active', filters.is_active.toString());
      if (filters.entity_type) params.append('entity_type', filters.entity_type);

      const queryString = params.toString();
      return queryString ? `/api/sequences/configs?${queryString}` : '/api/sequences/configs';
    }
  },

  // =================================================================
  // SMART FORMS — Tenant-facing Selections + Submissions (Cycle 3)
  // =================================================================
  SMART_FORMS: {
    // Convenience: admin template endpoints (same as ADMIN.SMART_FORMS)
    ADMIN: {
      LIST: '/api/admin/forms',
      GET: (id: string) => `/api/admin/forms/${id}`,
      CREATE: '/api/admin/forms',
      UPDATE: (id: string) => `/api/admin/forms/${id}`,
    },
    // Tenant form selections (bookmarks)
    SELECTIONS: {
      LIST: '/api/forms/selections',
      TOGGLE: '/api/forms/selections',
    },
    // Tenant form submissions
    SUBMISSIONS: {
      LIST: '/api/forms/submissions',
      GET: (id: string) => `/api/forms/submissions/${id}`,
      CREATE: '/api/forms/submissions',
      UPDATE: (id: string) => `/api/forms/submissions/${id}`,
      LIST_WITH_FILTERS: (filters: SmartFormSubmissionFilters = {}) => {
        const params = new URLSearchParams();
        if (filters.event_id) params.append('event_id', filters.event_id);
        if (filters.contract_id) params.append('contract_id', filters.contract_id);
        if (filters.template_id) params.append('template_id', filters.template_id);
        const qs = params.toString();
        return qs ? `/api/forms/submissions?${qs}` : '/api/forms/submissions';
      },
    },
  },

  // =================================================================
  // CLIENT ASSET REGISTRY (P1 — client-owned equipment + entity)
  // =================================================================
  CLIENT_ASSET_REGISTRY: {
    BASE: '/api/client-asset-registry',
    LIST_WITH_FILTERS: (filters: { contact_id?: string; resource_type_id?: string; status?: string; limit?: number; offset?: number } = {}) => {
      const params = new URLSearchParams();
      if (filters.contact_id) params.append('contact_id', filters.contact_id);
      if (filters.resource_type_id) params.append('resource_type_id', filters.resource_type_id);
      if (filters.status) params.append('status', filters.status);
      if (filters.limit) params.append('limit', String(filters.limit));
      if (filters.offset) params.append('offset', String(filters.offset));
      const qs = params.toString();
      return qs ? `/api/client-asset-registry?${qs}` : '/api/client-asset-registry';
    },
    GET: (id: string) => `/api/client-asset-registry?id=${id}`,
    CREATE: '/api/client-asset-registry',
    UPDATE: (id: string) => `/api/client-asset-registry?id=${id}`,
    DELETE: (id: string) => `/api/client-asset-registry?id=${id}`,
    CHILDREN: (parentAssetId: string) => `/api/client-asset-registry/children?parent_asset_id=${parentAssetId}`,
    CONTRACT_ASSETS: (contractId: string) => `/api/client-asset-registry/contract-assets?contract_id=${contractId}`,
    LINK_CONTRACT_ASSETS: '/api/client-asset-registry/contract-assets',
    UNLINK_CONTRACT_ASSET: (contractId: string, assetId: string) =>
      `/api/client-asset-registry/contract-assets?contract_id=${contractId}&asset_id=${assetId}`,
  }
};

// =================================================================
// TYPE DEFINITIONS FOR BETTER TYPESCRIPT SUPPORT - PRESERVED & ENHANCED
// =================================================================

// Product Master Data filter interfaces
export type ProductMasterDataFilters = {
  category_name: string;
  is_active?: boolean;
};

export type ProductMasterDataCategoryFilters = {
  is_active?: boolean;
};

// Enhanced filter interfaces for industry-first onboarding
export type IndustryFilters = {
  page?: number;
  limit?: number;
  search?: string;
  is_active?: boolean;
  level?: number;
  parent_id?: string;
};

export type CategoryFilters = {
  page?: number;
  limit?: number;
  search?: string;
  is_active?: boolean;
};

export type IndustryCategoryFilters = {
  is_primary?: boolean;
  page?: number;
  limit?: number;
  search?: string;
  is_active?: boolean;
};

// Service Catalog filter interface
export type ServiceCatalogFilters = {
  search_term?: string;
  category_id?: string;
  industry_id?: string;
  is_active?: boolean;
  price_min?: number;
  price_max?: number;
  currency?: string;
  has_resources?: boolean;
  sort_by?: 'name' | 'price' | 'created_at' | 'updated_at' | 'sort_order';
  sort_direction?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
};

// Groups & Directory filter interfaces
export type GroupFilters = {
  group_type?: 'bbb_chapter' | 'association' | 'network' | 'community';
  is_active?: boolean;
  search?: string;
};

export type MembershipFilters = {
  status?: 'all' | 'active' | 'suspended' | 'pending' | 'inactive';
  limit?: number;
  offset?: number;
};

export type GroupSearchOptions = {
  group_id: string;
  query: string;
  limit?: number;
  use_cache?: boolean;
};

export type ActivityLogFilters = {
  activity_type?: 'profile_update' | 'status_change' | 'profile_view' | 'search' | 'join' | 'leave';
  limit?: number;
  offset?: number;
};

// Pagination metadata interface
export type PaginationMetadata = {
  current_page: number;
  total_pages: number;
  total_records: number;
  limit: number;
  has_next: boolean;
  has_prev: boolean;
};

// Industry interface
export type Industry = {
  id: string;
  name: string;
  description: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  parent_id?: string | null;
  level?: number;
  segment_type?: string;
  icon?: string;
};

// Category-Industry mapping interface
export type CategoryIndustryMap = {
  id: string;
  category_id: string;
  industry_id: string;
  display_name: string;
  display_order: number;
  is_primary: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

// Enhanced response interfaces
export type IndustryResponse = {
  success: boolean;
  data?: Industry[];
  pagination?: PaginationMetadata;
  error?: string;
  code?: string;
  timestamp?: string;
};

export type CategoryMapResponse = {
  success: boolean;
  data?: CategoryIndustryMap[];
  industry_id?: string;
  filters?: {
    is_primary_only: boolean;
    search_applied: boolean;
  };
  pagination?: PaginationMetadata;
  error?: string;
  code?: string;
  timestamp?: string;
};

// Contract CRUD filter interface
export type ContractCrudFilters = {
  record_type?: string;
  contract_type?: string;
  status?: string;
  search?: string;
  start_date_from?: string;
  start_date_to?: string;
  end_date_from?: string;
  end_date_to?: string;
  min_value?: number;
  max_value?: number;
  currency?: string;
  sort_by?: 'title' | 'contract_number' | 'status' | 'total_value' | 'start_date' | 'end_date' | 'created_at' | 'updated_at';
  sort_direction?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
  page?: number;
};

// Admin Tenant Management filter interface
export type AdminTenantListFilters = {
  page?: number;
  limit?: number;
  status?: string;
  subscription_status?: string;
  search?: string;
  sort_by?: string;
  sort_direction?: string;
};

// Sequence Numbers filter interface
export type SequenceFilters = {
  is_active?: boolean;
  entity_type?: string;
};

// Sequence configuration interface
export type SequenceConfig = {
  id: string;
  entity_type: string;
  prefix: string;
  suffix: string | null;
  padding: number;
  start_value: number;
  current_value: number;
  increment_by: number;
  reset_frequency: 'never' | 'yearly' | 'monthly' | 'quarterly';
  format_pattern: string;
  is_active: boolean;
  tenant_id: string;
  environment: 'live' | 'test';
  created_at: string;
  updated_at: string;
};

// Sequence status interface
export type SequenceStatus = {
  entity_type: string;
  display_name: string;
  current_value: number;
  next_formatted: string;
  is_active: boolean;
  reset_frequency: string;
  last_reset_at: string | null;
};

// Resources filter interface
export type ResourceFilters = {
  resourceTypeId?: string;
  search?: string;
  includeInactive?: boolean;
  nextSequence?: boolean;
  page?: number;
  limit?: number;
  sortBy?: 'name' | 'display_name' | 'sequence_no' | 'created_at' | 'updated_at';
  sortOrder?: 'asc' | 'desc';
};

// Resource types
export type ResourceEndpoints = typeof API_ENDPOINTS.RESOURCES;
export type ContactEndpoints = typeof API_ENDPOINTS.CONTACTS;
export type CatalogEndpoints = typeof API_ENDPOINTS.CATALOG;
export type ServiceCatalogEndpoints = typeof API_ENDPOINTS.SERVICE_CATALOG;
export type GroupsEndpoints = typeof API_ENDPOINTS.GROUPS;
export type ServiceContractsEndpoints = typeof API_ENDPOINTS.SERVICE_CONTRACTS;
export type BlockEndpoints = typeof API_ENDPOINTS.SERVICE_CONTRACTS.BLOCKS;
export type ProductMasterDataEndpoints = typeof API_ENDPOINTS.PRODUCT_MASTERDATA;
export type OnboardingEndpoints = typeof API_ENDPOINTS.ONBOARDING;
export type SequencesEndpoints = typeof API_ENDPOINTS.SEQUENCES;
export type ContractsEndpoints = typeof API_ENDPOINTS.CONTRACTS;
export type ContractEventsEndpoints = typeof API_ENDPOINTS.CONTRACT_EVENTS;
export type EventStatusConfigEndpoints = typeof API_ENDPOINTS.EVENT_STATUS_CONFIG;
export type SmartFormsEndpoints = typeof API_ENDPOINTS.ADMIN.SMART_FORMS;
export type ServiceExecutionEndpoints = typeof API_ENDPOINTS.SERVICE_EXECUTION;

// Contact filters interface
export type ContactFilters = {
  status?: 'active' | 'inactive' | 'archived';
  type?: 'individual' | 'corporate' | 'contact_person';
  search?: string;
  classifications?: string[];
  page?: number;
  limit?: number;
  includeInactive?: boolean;
  includeArchived?: boolean;
};

// Catalog filters interface
export type CatalogFilters = {
  catalogType?: number; // 1-4 for catalog types
  includeInactive?: boolean;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: 'name' | 'created_at' | 'updated_at' | 'type' | 'version';
  sortOrder?: 'asc' | 'desc';
};

// Block filters interface
export type BlockFilters = {
  categoryId?: string;
  search?: string;
  nodeType?: string;
  category?: string;
};

// Block search parameters
export type BlockSearchParams = {
  q: string; // Search query
  category?: string;
  nodeType?: string;
};

// Service Execution filter types
export type ServiceTicketFilters = {
  contract_id?: string;
  status?: string;
  assigned_to?: string;
  page?: number;
  per_page?: number;
};

export type ServiceEvidenceFilters = {
  contract_id?: string;
  ticket_id?: string;
  evidence_type?: string;
  status?: string;
  page?: number;
  per_page?: number;
};

export type AuditLogFilters = {
  contract_id?: string;
  entity_type?: string;
  entity_id?: string;
  category?: string;
  date_from?: string;
  date_to?: string;
  page?: number;
  per_page?: number;
};

// =================================================================
// HELPER FUNCTIONS FOR BUILDING URLS WITH QUERY PARAMETERS - PRESERVED & ENHANCED
// =================================================================

/**
 * Build resources list URL with filters
 */
export const buildResourcesListURL = (filters: ResourceFilters = {}): string => {
  return API_ENDPOINTS.RESOURCES.LIST_WITH_FILTERS(filters);
};

/**
 * Build contact list URL with filters
 */
export const buildContactListURL = (filters: ContactFilters = {}): string => {
  const url = new URL(API_ENDPOINTS.CONTACTS.LIST, window.location.origin);
  
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      if (Array.isArray(value)) {
        url.searchParams.append(key, value.join(','));
      } else {
        url.searchParams.append(key, value.toString());
      }
    }
  });
  
  return url.pathname + url.search;
};

/**
 * Build catalog list URL with filters
 */
export const buildCatalogListURL = (filters: CatalogFilters = {}): string => {
  const url = new URL(API_ENDPOINTS.CATALOG.LIST, window.location.origin);
  
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      url.searchParams.append(key, value.toString());
    }
  });
  
  return url.pathname + url.search;
};

/**
 * Build service catalog list URL with filters
 */
export const buildServiceCatalogListURL = (filters: ServiceCatalogFilters = {}): string => {
  return API_ENDPOINTS.SERVICE_CATALOG.LIST_WITH_FILTERS(filters);
};

/**
 * Build groups list URL with filters
 */
export const buildGroupsListURL = (filters: GroupFilters = {}): string => {
  return API_ENDPOINTS.GROUPS.LIST_WITH_FILTERS(filters);
};

/**
 * Build group memberships URL with filters
 */
export const buildGroupMembershipsURL = (groupId: string, filters: MembershipFilters = {}): string => {
  return API_ENDPOINTS.GROUPS.MEMBERSHIPS.LIST_BY_GROUP_WITH_FILTERS(groupId, filters);
};

/**
 * Build activity logs URL with filters
 */
export const buildActivityLogsURL = (groupId: string, filters: ActivityLogFilters = {}): string => {
  return API_ENDPOINTS.GROUPS.ADMIN.ACTIVITY_LOGS_WITH_FILTERS(groupId, filters);
};

/**
 * Build multi-currency pricing URL with detailed flag
 */
export const buildCatalogPricingURL = (catalogId: string, detailed: boolean = false): string => {
  const baseUrl = API_ENDPOINTS.CATALOG.MULTI_CURRENCY.GET_PRICING(catalogId);
  return detailed ? `${baseUrl}?detailed=true` : baseUrl;
};

/**
 * Build block masters URL with filters
 */
export const buildBlockMastersURL = (filters: BlockFilters = {}): string => {
  const url = new URL(API_ENDPOINTS.SERVICE_CONTRACTS.BLOCKS.MASTERS, window.location.origin);
  
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      url.searchParams.append(key, value.toString());
    }
  });
  
  return url.pathname + url.search;
};

/**
 * Build block search URL with parameters
 */
export const buildBlockSearchURL = (params: BlockSearchParams): string => {
  const url = new URL(API_ENDPOINTS.SERVICE_CONTRACTS.BLOCKS.SEARCH, window.location.origin);
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      url.searchParams.append(key, value.toString());
    }
  });
  
  return url.pathname + url.search;
};

/**
 * Build product master data URL for global category
 */
export const buildGlobalMasterDataURL = (categoryName: string, isActive: boolean = true): string => {
  return API_ENDPOINTS.PRODUCT_MASTERDATA.GLOBAL.GET_CATEGORY_WITH_PARAMS(categoryName, isActive);
};

/**
 * Build product master data URL for tenant category
 */
export const buildTenantMasterDataURL = (categoryName: string, isActive: boolean = true): string => {
  return API_ENDPOINTS.PRODUCT_MASTERDATA.TENANT.GET_CATEGORY_WITH_PARAMS(categoryName, isActive);
};

/**
 * Build global categories URL with active filter
 */
export const buildGlobalCategoriesURL = (isActive: boolean = true): string => {
  return API_ENDPOINTS.PRODUCT_MASTERDATA.GLOBAL.LIST_CATEGORIES_WITH_FILTER(isActive);
};

/**
 * Build tenant categories URL with active filter
 */
export const buildTenantCategoriesURL = (isActive: boolean = true): string => {
  return API_ENDPOINTS.PRODUCT_MASTERDATA.TENANT.LIST_CATEGORIES_WITH_FILTER(isActive);
};

/**
 * Build industries list URL with filters
 */
export const buildIndustriesURL = (filters: IndustryFilters = {}): string => {
  return API_ENDPOINTS.PRODUCT_MASTERDATA.INDUSTRIES.LIST_WITH_PARAMS(filters);
};

/**
 * Build all categories list URL with filters
 */
export const buildAllCategoriesURL = (filters: CategoryFilters = {}): string => {
  return API_ENDPOINTS.PRODUCT_MASTERDATA.CATEGORIES.LIST_ALL_WITH_PARAMS(filters);
};

/**
 * Build industry-specific categories URL with filters
 */
export const buildIndustryCategoriesURL = (industryId: string, filters: IndustryCategoryFilters = {}): string => {
  return API_ENDPOINTS.PRODUCT_MASTERDATA.CATEGORIES.LIST_BY_INDUSTRY_WITH_PARAMS(industryId, filters);
};

/**
 * Build industry categories URL for primary categories only
 */
export const buildPrimaryIndustryCategoriesURL = (industryId: string, filters: Omit<IndustryCategoryFilters, 'is_primary'> = {}): string => {
  return buildIndustryCategoriesURL(industryId, { ...filters, is_primary: true });
};

/**
 * Build contracts list URL with filters
 */
export const buildContractsListURL = (filters: ContractCrudFilters = {}): string => {
  return API_ENDPOINTS.CONTRACTS.LIST_WITH_FILTERS(filters);
};

/**
 * Build onboarding status URL with optional parameters
 */
export const buildOnboardingStatusURL = (includeSteps: boolean = true, includeMeta: boolean = false): string => {
  const params = new URLSearchParams();
  if (includeSteps) params.append('includeSteps', 'true');
  if (includeMeta) params.append('includeMeta', 'true');
  const queryString = params.toString();
  return queryString ? `${API_ENDPOINTS.ONBOARDING.STATUS}?${queryString}` : API_ENDPOINTS.ONBOARDING.STATUS;
};

/**
 * Get onboarding step endpoint
 */
export const getOnboardingStepEndpoint = (operation: 'complete' | 'skip', stepId?: string): string => {
  const baseUrl = operation === 'complete' 
    ? API_ENDPOINTS.ONBOARDING.STEP.COMPLETE 
    : API_ENDPOINTS.ONBOARDING.STEP.SKIP;
  
  if (stepId) {
    const params = new URLSearchParams({ stepId });
    return `${baseUrl}?${params.toString()}`;
  }
  
  return baseUrl;
};

// =================================================================
// VALIDATION HELPERS - PRESERVED & ENHANCED
// =================================================================

/**
 * Validate resource ID format (UUID)
 */
export const isValidResourceId = (id: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return typeof id === 'string' && uuidRegex.test(id);
};

/**
 * Validate catalog ID format
 */
export const isValidCatalogId = (id: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return typeof id === 'string' && uuidRegex.test(id);
};

/**
 * Validate service ID format
 */
export const isValidServiceId = (id: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return typeof id === 'string' && uuidRegex.test(id);
};

/**
 * Validate group ID format
 */
export const isValidGroupId = (id: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return typeof id === 'string' && uuidRegex.test(id);
};

/**
 * Validate membership ID format
 */
export const isValidMembershipId = (id: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return typeof id === 'string' && uuidRegex.test(id);
};

/**
 * Validate UUID format (for blocks, variants, etc.)
 */
export const isValidUUID = (id: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return typeof id === 'string' && uuidRegex.test(id);
};

/**
 * Validate currency code format
 */
export const isValidCurrency = (currency: string): boolean => {
  const currencyRegex = /^[A-Z]{3}$/;
  return typeof currency === 'string' && currencyRegex.test(currency);
};

/**
 * Validate resource search query
 */
export const isValidResourceSearchQuery = (query: string): boolean => {
  return typeof query === 'string' && query.trim().length >= 1 && query.length <= 100;
};

/**
 * Validate group search query
 */
export const isValidGroupSearchQuery = (query: string): boolean => {
  return typeof query === 'string' && query.trim().length >= 2 && query.length <= 200;
};

/**
 * Validate group type
 */
export const isValidGroupType = (groupType: string): boolean => {
  const validTypes = ['bbb_chapter', 'association', 'network', 'community'];
  return validTypes.includes(groupType);
};

/**
 * Validate membership status
 */
export const isValidMembershipStatus = (status: string): boolean => {
  const validStatuses = ['all', 'active', 'suspended', 'pending', 'inactive'];
  return validStatuses.includes(status);
};

/**
 * Validate activity type
 */
export const isValidActivityType = (activityType: string): boolean => {
  const validTypes = ['profile_update', 'status_change', 'profile_view', 'search', 'join', 'leave'];
  return validTypes.includes(activityType);
};

/**
 * Validate category name format for product master data
 */
export const isValidCategoryName = (categoryName: string): boolean => {
  // Category names should be alphanumeric with underscores and hyphens
  const categoryNameRegex = /^[a-zA-Z0-9_-]{2,100}$/;
  return typeof categoryName === 'string' && categoryNameRegex.test(categoryName);
};

/**
 * Validate industry ID format
 */
export const isValidIndustryId = (industryId: string): boolean => {
  return isValidUUID(industryId);
};

/**
 * Validate search query for industry endpoints
 */
export const isValidSearchQuery = (search: string): boolean => {
  return typeof search === 'string' && search.trim().length >= 3 && search.length <= 100;
};

/**
 * Validate pagination parameters
 */
export const isValidPaginationParams = (page?: number, limit?: number): boolean => {
  if (page !== undefined && (page < 1 || page > 10000)) return false;
  if (limit !== undefined && (limit < 1 || limit > 100)) return false;
  return true;
};

/**
 * Validate onboarding step ID
 */
export const isValidOnboardingStepId = (stepId: string): boolean => {
  const validSteps = ['user-profile', 'business-profile', 'data-setup', 'storage', 'team', 'tour'];
  return validSteps.includes(stepId);
};

// Export everything for comprehensive access
export default API_ENDPOINTS;