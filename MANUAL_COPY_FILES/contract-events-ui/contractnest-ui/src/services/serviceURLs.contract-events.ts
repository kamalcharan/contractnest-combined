// =================================================================
// CONTRACT EVENTS ENDPOINTS - ADD TO serviceURLs.ts
// =================================================================
// Add this section after the CONTRACTS section (around line 892)
// Also add the filter type and helper function at the bottom

// ─────────────────────────────────────────────────────────────────
// ADD THIS SECTION TO API_ENDPOINTS (after CONTRACTS section):
// ─────────────────────────────────────────────────────────────────

/*
  // =================================================================
  // CONTRACT EVENTS (TIMELINE) ENDPOINTS
  // =================================================================
  CONTRACT_EVENTS: {
    // Main CRUD operations
    LIST: '/api/contract-events',
    GET: (id: string) => `/api/contract-events/${id}`,
    CREATE: '/api/contract-events',
    UPDATE: (id: string) => `/api/contract-events/${id}`,

    // Date summary (6 buckets: overdue, today, tomorrow, this_week, next_week, later)
    DATES: '/api/contract-events/dates',

    // Health check
    HEALTH: '/api/contract-events/health',

    // Helper: build list URL with filters
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

    // Helper: build dates URL with filters
    DATES_WITH_FILTERS: (filters: ContractEventDateFilters = {}) => {
      const params = new URLSearchParams();

      if (filters.contract_id) params.append('contract_id', filters.contract_id);
      if (filters.contact_id) params.append('contact_id', filters.contact_id);
      if (filters.assigned_to) params.append('assigned_to', filters.assigned_to);
      if (filters.event_type) params.append('event_type', filters.event_type);

      const queryString = params.toString();
      return queryString ? `/api/contract-events/dates?${queryString}` : '/api/contract-events/dates';
    },
  },
*/

// ─────────────────────────────────────────────────────────────────
// ADD THESE TYPES (after ContractCrudFilters around line 1119):
// ─────────────────────────────────────────────────────────────────

/*
// Contract Events filter interface
export type ContractEventFilters = {
  contract_id?: string;
  contact_id?: string;
  assigned_to?: string;
  status?: 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'overdue';
  event_type?: 'service' | 'billing';
  date_from?: string;
  date_to?: string;
  page?: number;
  per_page?: number;
  sort_by?: 'scheduled_date' | 'created_at' | 'updated_at' | 'status' | 'event_type' | 'amount';
  sort_order?: 'asc' | 'desc';
};

// Contract Events date summary filter interface
export type ContractEventDateFilters = {
  contract_id?: string;
  contact_id?: string;
  assigned_to?: string;
  event_type?: 'service' | 'billing';
};
*/

// ─────────────────────────────────────────────────────────────────
// ADD THIS HELPER FUNCTION (after buildContractsListURL around line 1403):
// ─────────────────────────────────────────────────────────────────

/*
/**
 * Build contract events list URL with filters
 *\/
export const buildContractEventsListURL = (filters: ContractEventFilters = {}): string => {
  return API_ENDPOINTS.CONTRACT_EVENTS.LIST_WITH_FILTERS(filters);
};

/**
 * Build contract events date summary URL with filters
 *\/
export const buildContractEventsDateURL = (filters: ContractEventDateFilters = {}): string => {
  return API_ENDPOINTS.CONTRACT_EVENTS.DATES_WITH_FILTERS(filters);
};
*/

// ─────────────────────────────────────────────────────────────────
// ADD TO EXPORTS (after ContractsEndpoints around line 1191):
// ─────────────────────────────────────────────────────────────────

/*
export type ContractEventsEndpoints = typeof API_ENDPOINTS.CONTRACT_EVENTS;
*/

// ─────────────────────────────────────────────────────────────────
// VALIDATION HELPER (add after isValidOnboardingStepId):
// ─────────────────────────────────────────────────────────────────

/*
/**
 * Validate contract event status
 *\/
export const isValidContractEventStatus = (status: string): boolean => {
  const validStatuses = ['scheduled', 'in_progress', 'completed', 'cancelled', 'overdue'];
  return validStatuses.includes(status);
};

/**
 * Validate contract event type
 *\/
export const isValidContractEventType = (eventType: string): boolean => {
  const validTypes = ['service', 'billing'];
  return validTypes.includes(eventType);
};
*/

export {};
