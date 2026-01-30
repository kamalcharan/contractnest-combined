// ═══════════════════════════════════════════════════════════════════
// CONTRACTS CRUD ENDPOINTS — ADD TO serviceURLs.ts > API_ENDPOINTS
// ═══════════════════════════════════════════════════════════════════
//
// PASTE this block INSIDE the API_ENDPOINTS object in serviceURLs.ts,
// AFTER the SERVICE_CONTRACTS block and BEFORE the SYSTEM block.
//
// Also add the ContractListFilters type import and helper function
// at the bottom of the file with the other helpers.
// ═══════════════════════════════════════════════════════════════════

/*
  // Inside API_ENDPOINTS = { ... }

  CONTRACTS: {
    // Main CRUD operations
    LIST: '/api/contracts',
    CREATE: '/api/contracts',
    GET: (id: string) => `/api/contracts/${id}`,
    UPDATE: (id: string) => `/api/contracts/${id}`,
    DELETE: (id: string) => `/api/contracts/${id}`,

    // Status management
    UPDATE_STATUS: (id: string) => `/api/contracts/${id}/status`,

    // Dashboard stats
    STATS: '/api/contracts/stats',

    // Health check
    HEALTH: '/api/contracts/health',

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
*/

// ═══════════════════════════════════════════════════════════════════
// TYPE to add alongside other filter types at bottom of serviceURLs.ts
// ═══════════════════════════════════════════════════════════════════

/*
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
*/

// ═══════════════════════════════════════════════════════════════════
// HELPER FUNCTION to add at the bottom with other helpers
// ═══════════════════════════════════════════════════════════════════

/*
  export const buildContractsListURL = (filters: ContractCrudFilters = {}): string => {
    return API_ENDPOINTS.CONTRACTS.LIST_WITH_FILTERS(filters);
  };
*/

// ═══════════════════════════════════════════════════════════════════
// ENDPOINT TYPE EXPORT to add with other endpoint types
// ═══════════════════════════════════════════════════════════════════

/*
  export type ContractsEndpoints = typeof API_ENDPOINTS.CONTRACTS;
*/

export {};
