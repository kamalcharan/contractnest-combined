// ═══════════════════════════════════════════════════════════════════════════════
// ADD THE FOLLOWING TO src/services/serviceURLs.ts
// ═══════════════════════════════════════════════════════════════════════════════
//
// Find the ADMIN section and ADD the SUBSCRIPTION_MANAGEMENT block after STORAGE:

/*

  ADMIN: {
    STORAGE: {
      // ... existing storage endpoints ...
    },

    // ═══════════════════════════════════════════════════════════════════════════
    // SUBSCRIPTION MANAGEMENT ENDPOINTS - ADD THIS BLOCK
    // ═══════════════════════════════════════════════════════════════════════════
    SUBSCRIPTION_MANAGEMENT: {
      // Dashboard stats
      STATS: '/api/admin/subscription-management/stats',

      // Tenant list with filters
      TENANTS: '/api/admin/subscription-management/tenants',

      // Single tenant details
      TENANT_DETAIL: (id: string) => `/api/admin/subscription-management/tenants/${id}`,

      // Update tenant status
      UPDATE_STATUS: (id: string) => `/api/admin/subscription-management/tenants/${id}/status`,

      // Get tenant data summary (counts by category)
      DATA_SUMMARY: (id: string) => `/api/admin/subscription-management/tenants/${id}/data-summary`,

      // Delete tenant data (hard delete, keep t_tenants record)
      DELETE_DATA: (id: string) => `/api/admin/subscription-management/tenants/${id}/data`,

      // Helper function for listing tenants with filters
      TENANTS_WITH_FILTERS: (filters: AdminTenantFilters = {}) => {
        const params = new URLSearchParams();

        if (filters.status && filters.status !== 'all') {
          params.append('status', filters.status);
        }
        if (filters.subscription_status && filters.subscription_status !== 'all') {
          params.append('subscription_status', filters.subscription_status);
        }
        if (filters.tenant_type && filters.tenant_type !== 'all') {
          params.append('tenant_type', filters.tenant_type);
        }
        if (filters.industry_id) {
          params.append('industry_id', filters.industry_id);
        }
        if (filters.search) {
          params.append('search', filters.search);
        }
        if (filters.page) {
          params.append('page', filters.page.toString());
        }
        if (filters.limit) {
          params.append('limit', filters.limit.toString());
        }
        if (filters.sort_by) {
          params.append('sort_by', filters.sort_by);
        }
        if (filters.sort_direction) {
          params.append('sort_direction', filters.sort_direction);
        }

        const queryString = params.toString();
        return queryString
          ? `/api/admin/subscription-management/tenants?${queryString}`
          : '/api/admin/subscription-management/tenants';
      }
    }
  },

*/

// ═══════════════════════════════════════════════════════════════════════════════
// Also add the following TYPE at the end of the file (in the types section):
// ═══════════════════════════════════════════════════════════════════════════════

/*

// Admin Tenant Filters interface (for Subscription Management)
export type AdminTenantFilters = {
  status?: 'active' | 'inactive' | 'suspended' | 'closed' | 'all';
  subscription_status?: 'trial' | 'active' | 'grace_period' | 'suspended' | 'cancelled' | 'expired' | 'all';
  tenant_type?: 'buyer' | 'seller' | 'mixed' | 'all';
  industry_id?: string;
  search?: string;
  page?: number;
  limit?: number;
  sort_by?: 'name' | 'created_at' | 'status' | 'subscription_status';
  sort_direction?: 'asc' | 'desc';
};

*/

// ═══════════════════════════════════════════════════════════════════════════════
// COMPLETE EXAMPLE OF UPDATED ADMIN SECTION:
// ═══════════════════════════════════════════════════════════════════════════════

export const ADMIN_ENDPOINTS_EXAMPLE = {
  STORAGE: {
    DIAGNOSTIC: '/api/admin/storage/diagnostic',
    FIREBASE_STATUS: '/api/admin/storage/firebase/status',
    TENANT_STRUCTURE: '/api/admin/storage/diagnostic/tenant-structure',
    LIST_FILES: '/api/admin/storage/diagnostic/list',
    UPLOAD_FILE: '/api/admin/storage/diagnostic/upload',
    DELETE_FILE: '/api/admin/storage/diagnostic/file'
  },

  // NEW: Subscription Management
  SUBSCRIPTION_MANAGEMENT: {
    STATS: '/api/admin/subscription-management/stats',
    TENANTS: '/api/admin/subscription-management/tenants',
    TENANT_DETAIL: (id: string) => `/api/admin/subscription-management/tenants/${id}`,
    UPDATE_STATUS: (id: string) => `/api/admin/subscription-management/tenants/${id}/status`,
    DATA_SUMMARY: (id: string) => `/api/admin/subscription-management/tenants/${id}/data-summary`,
    DELETE_DATA: (id: string) => `/api/admin/subscription-management/tenants/${id}/data`,

    TENANTS_WITH_FILTERS: (filters: {
      status?: string;
      subscription_status?: string;
      tenant_type?: string;
      industry_id?: string;
      search?: string;
      page?: number;
      limit?: number;
    } = {}) => {
      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      if (filters.subscription_status) params.append('subscription_status', filters.subscription_status);
      if (filters.tenant_type) params.append('tenant_type', filters.tenant_type);
      if (filters.industry_id) params.append('industry_id', filters.industry_id);
      if (filters.search) params.append('search', filters.search);
      if (filters.page) params.append('page', filters.page.toString());
      if (filters.limit) params.append('limit', filters.limit.toString());
      const queryString = params.toString();
      return queryString
        ? `/api/admin/subscription-management/tenants?${queryString}`
        : '/api/admin/subscription-management/tenants';
    }
  }
};
