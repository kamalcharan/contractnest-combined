// src/types/contractEvents.ts
// Contract Events (Timeline) Type Definitions

// =================================================================
// ENUMS / CONSTANTS
// =================================================================

export const CONTRACT_EVENT_TYPES = {
  SERVICE: 'service',
  BILLING: 'billing',
} as const;

export const CONTRACT_EVENT_STATUSES = {
  SCHEDULED: 'scheduled',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  OVERDUE: 'overdue',
} as const;

export const BILLING_SUB_TYPES = {
  ADVANCE: 'advance',
  MILESTONE: 'milestone',
  RECURRING: 'recurring',
  FINAL: 'final',
} as const;

// Valid status transitions (for UI validation)
export const VALID_STATUS_TRANSITIONS: Record<string, string[]> = {
  scheduled: ['in_progress', 'cancelled'],
  in_progress: ['completed', 'cancelled'],
  completed: [],      // Terminal state
  cancelled: [],      // Terminal state
  overdue: ['in_progress', 'completed', 'cancelled'],
};

export type ContractEventType = typeof CONTRACT_EVENT_TYPES[keyof typeof CONTRACT_EVENT_TYPES];
export type ContractEventStatus = typeof CONTRACT_EVENT_STATUSES[keyof typeof CONTRACT_EVENT_STATUSES];
export type BillingSubType = typeof BILLING_SUB_TYPES[keyof typeof BILLING_SUB_TYPES];

// =================================================================
// FILTER TYPES
// =================================================================

export interface ContractEventFilters {
  contract_id?: string;
  contact_id?: string;
  assigned_to?: string;
  status?: ContractEventStatus;
  event_type?: ContractEventType;
  date_from?: string;
  date_to?: string;
  page?: number;
  per_page?: number;
  sort_by?: 'scheduled_date' | 'created_at' | 'updated_at' | 'status' | 'event_type' | 'amount';
  sort_order?: 'asc' | 'desc';
}

export interface DateSummaryFilters {
  contract_id?: string;
  contact_id?: string;
  assigned_to?: string;
  event_type?: ContractEventType;
}

// =================================================================
// REQUEST TYPES
// =================================================================

export interface ContractEventInput {
  block_id: string;
  block_name: string;
  category_id?: string;
  event_type: ContractEventType;
  billing_sub_type?: BillingSubType;
  billing_cycle_label?: string;
  sequence_number: number;
  total_occurrences: number;
  scheduled_date: string;
  amount?: number;
  currency?: string;
  assigned_to?: string;
  assigned_to_name?: string;
  notes?: string;
}

export interface CreateContractEventsRequest {
  contract_id: string;
  events: ContractEventInput[];
}

export interface UpdateContractEventRequest {
  version: number;
  status?: ContractEventStatus;
  scheduled_date?: string;
  assigned_to?: string;
  assigned_to_name?: string;
  notes?: string;
  amount?: number;
  reason?: string;
}

// =================================================================
// RESPONSE TYPES
// =================================================================

export interface ContractEvent {
  id: string;
  tenant_id: string;
  contract_id: string;
  contract_number?: string;
  contract_title?: string;
  block_id: string;
  block_name: string;
  category_id: string | null;
  event_type: ContractEventType;
  billing_sub_type: BillingSubType | null;
  billing_cycle_label: string | null;
  sequence_number: number;
  total_occurrences: number;
  scheduled_date: string;
  original_date: string;
  amount: number | null;
  currency: string | null;
  status: ContractEventStatus;
  assigned_to: string | null;
  assigned_to_name: string | null;
  notes: string | null;
  version: number;
  is_live: boolean;
  created_at: string;
  updated_at: string;
}

export interface ContractEventListResponse {
  items: ContractEvent[];
  total_count: number;
  page_info: {
    has_next_page: boolean;
    has_prev_page: boolean;
    current_page: number;
    total_pages: number;
  };
  filters_applied: ContractEventFilters;
}

export interface DateBucketSummary {
  count: number;
  service_count: number;
  billing_count: number;
  billing_amount: number;
  by_status: Record<string, number>;
}

export interface DateSummaryResponse {
  overdue: DateBucketSummary;
  today: DateBucketSummary;
  tomorrow: DateBucketSummary;
  this_week: DateBucketSummary;
  next_week: DateBucketSummary;
  later: DateBucketSummary;
  totals: {
    total_events: number;
    total_billing_amount: number;
  };
}

export interface CreateContractEventsResponse {
  inserted_count: number;
  event_ids: string[];
}

// =================================================================
// COMPUTED EVENTS (for wizard - saved to contract before trigger)
// =================================================================

export interface ComputedEvent {
  block_id: string;
  block_name: string;
  category_id?: string;
  event_type: ContractEventType;
  billing_sub_type?: BillingSubType;
  billing_cycle_label?: string;
  sequence_number: number;
  total_occurrences: number;
  scheduled_date: string;
  amount?: number;
  currency?: string;
  assigned_to?: string;
  assigned_to_name?: string;
  notes?: string;
}

// This is what gets stored in t_contracts.computed_events JSONB
export type ComputedEventsPayload = ComputedEvent[];
