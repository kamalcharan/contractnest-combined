// src/types/contracts.ts
// Contract CRUD TypeScript interfaces — matches API DTOs from contractTypes.ts

// =================================================================
// ENUMS / CONSTANTS
// =================================================================

export const CONTRACT_RECORD_TYPES = {
  CONTRACT: 'contract',
  RFQ: 'rfq',
} as const;

export const CONTRACT_STATUSES = {
  DRAFT: 'draft',
  PENDING_REVIEW: 'pending_review',
  PENDING_ACCEPTANCE: 'pending_acceptance',
  ACTIVE: 'active',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  EXPIRED: 'expired',
  // RFQ-specific
  SENT: 'sent',
  QUOTES_RECEIVED: 'quotes_received',
  AWARDED: 'awarded',
  CONVERTED_TO_CONTRACT: 'converted_to_contract',
} as const;

export const CONTRACT_TYPES = {
  SERVICE: 'service',
  PARTNERSHIP: 'partnership',
  NDA: 'nda',
  PURCHASE_ORDER: 'purchase_order',
  LEASE: 'lease',
  SUBSCRIPTION: 'subscription',
} as const;

export const ACCEPTANCE_METHODS = {
  E_SIGNATURE: 'e_signature',
  AUTO: 'auto',
  MANUAL_UPLOAD: 'manual_upload',
  IN_PERSON: 'in_person',
} as const;

// Type unions
export type ContractRecordType = (typeof CONTRACT_RECORD_TYPES)[keyof typeof CONTRACT_RECORD_TYPES];
export type ContractStatus = (typeof CONTRACT_STATUSES)[keyof typeof CONTRACT_STATUSES];
export type ContractType = (typeof CONTRACT_TYPES)[keyof typeof CONTRACT_TYPES];
export type AcceptanceMethod = (typeof ACCEPTANCE_METHODS)[keyof typeof ACCEPTANCE_METHODS];

// =================================================================
// STATUS FLOW DEFINITIONS
// =================================================================

export const CONTRACT_STATUS_FLOW: Record<string, ContractStatus[]> = {
  draft: ['pending_review', 'cancelled'],
  pending_review: ['pending_acceptance', 'active', 'cancelled'], // active if auto-accept
  pending_acceptance: ['active', 'cancelled'],
  active: ['completed', 'cancelled', 'expired'],
  completed: [],
  cancelled: [],
  expired: [],
};

export const RFQ_STATUS_FLOW: Record<string, ContractStatus[]> = {
  draft: ['sent', 'cancelled'],
  sent: ['quotes_received', 'cancelled'],
  quotes_received: ['awarded', 'cancelled'],
  awarded: ['converted_to_contract', 'cancelled'],
  converted_to_contract: [],
  cancelled: [],
};

// =================================================================
// CORE ENTITY INTERFACES
// =================================================================

export interface Contract {
  id: string;
  tenant_id: string;
  record_type: ContractRecordType;
  contract_type: ContractType;
  contract_number: string;
  title: string;
  description?: string;
  status: ContractStatus;
  acceptance_method: AcceptanceMethod;
  start_date?: string;
  end_date?: string;
  total_value?: number;
  currency?: string;
  payment_terms?: string;
  renewal_terms?: string;
  termination_clause?: string;
  notes?: string;
  metadata?: Record<string, any>;
  version: number;
  created_by: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

export interface ContractBlock {
  id: string;
  contract_id: string;
  block_id: string;
  sort_order: number;
  content_snapshot?: Record<string, any>;
  created_at: string;
}

export interface ContractVendor {
  id: string;
  contract_id: string;
  contact_id: string;
  role: string;
  is_primary: boolean;
  contact_name?: string;
  contact_email?: string;
  created_at: string;
}

export interface ContractAttachment {
  id: string;
  contract_id: string;
  file_name: string;
  file_url: string;
  file_type: string;
  file_size: number;
  uploaded_by: string;
  created_at: string;
}

export interface ContractHistoryEntry {
  id: string;
  contract_id: string;
  action: string;
  changed_by: string;
  changed_at: string;
  old_values?: Record<string, any>;
  new_values?: Record<string, any>;
  notes?: string;
}

// Full contract detail (returned by GET /:id)
export interface ContractDetail extends Contract {
  blocks: ContractBlock[];
  vendors: ContractVendor[];
  attachments: ContractAttachment[];
  history: ContractHistoryEntry[];
}

// =================================================================
// REQUEST INTERFACES
// =================================================================

export interface CreateContractRequest {
  record_type: ContractRecordType;
  contract_type: ContractType;
  title: string;
  description?: string;
  acceptance_method?: AcceptanceMethod;
  start_date?: string;
  end_date?: string;
  total_value?: number;
  currency?: string;
  payment_terms?: string;
  renewal_terms?: string;
  termination_clause?: string;
  notes?: string;
  metadata?: Record<string, any>;
  // Related entities (created in same transaction)
  blocks?: Array<{ block_id: string; sort_order: number; content_snapshot?: Record<string, any> }>;
  vendors?: Array<{ contact_id: string; role: string; is_primary: boolean }>;
}

export interface UpdateContractRequest {
  title?: string;
  description?: string;
  contract_type?: ContractType;
  acceptance_method?: AcceptanceMethod;
  start_date?: string;
  end_date?: string;
  total_value?: number;
  currency?: string;
  payment_terms?: string;
  renewal_terms?: string;
  termination_clause?: string;
  notes?: string;
  metadata?: Record<string, any>;
  version: number; // Required for optimistic concurrency
  blocks?: Array<{ block_id: string; sort_order: number; content_snapshot?: Record<string, any> }>;
  vendors?: Array<{ contact_id: string; role: string; is_primary: boolean }>;
}

export interface UpdateContractStatusRequest {
  status: ContractStatus;
  notes?: string;
}

// =================================================================
// RESPONSE INTERFACES
// =================================================================

export interface ContractListResponse {
  items: Contract[];
  total_count: number;
  page_info: {
    has_next_page: boolean;
    has_prev_page: boolean;
    current_page: number;
    total_pages: number;
  };
  filters_applied: ContractListFilters;
}

export interface ContractStatsResponse {
  total: number;
  by_status: Record<string, number>;
  by_record_type: Record<string, number>;
  by_contract_type: Record<string, number>;
  total_value: number;
  currency_breakdown: Array<{ currency: string; total: number; count: number }>;
}

// =================================================================
// FILTER INTERFACES
// =================================================================

export interface ContractListFilters {
  record_type?: ContractRecordType;
  contract_type?: ContractType;
  status?: ContractStatus;
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
}

// =================================================================
// UI HELPER TYPES
// =================================================================

// Type filter for the hub left rail
export type ContractTypeFilter = 'all' | 'client' | 'vendor' | 'partner';

// Status color mapping for UI
export const CONTRACT_STATUS_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  draft: { bg: 'secondaryText', text: 'secondaryText', label: 'Draft' },
  pending_review: { bg: 'info', text: 'info', label: 'In Review' },
  pending_acceptance: { bg: 'warning', text: 'warning', label: 'Pending Accept' },
  active: { bg: 'success', text: 'success', label: 'Active' },
  completed: { bg: 'brand.tertiary', text: 'brand.tertiary', label: 'Completed' },
  cancelled: { bg: 'error', text: 'error', label: 'Cancelled' },
  expired: { bg: 'error', text: 'error', label: 'Expired' },
  sent: { bg: 'info', text: 'info', label: 'Sent' },
  quotes_received: { bg: 'warning', text: 'warning', label: 'Quotes Received' },
  awarded: { bg: 'success', text: 'success', label: 'Awarded' },
  converted_to_contract: { bg: 'success', text: 'success', label: 'Converted' },
};
