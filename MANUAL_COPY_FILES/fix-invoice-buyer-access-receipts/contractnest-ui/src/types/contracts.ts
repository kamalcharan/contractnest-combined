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
  draft: ['pending_review', 'pending_acceptance', 'cancelled'], // pending_acceptance for wizard send (skip review)
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
// EQUIPMENT / ENTITY DETAIL (denormalized on t_contracts)
// =================================================================

/** Single equipment or entity entry stored in t_contracts.equipment_details JSONB */
export interface ContractEquipmentDetail {
  /** Client-generated UUID for local list identity */
  id: string;
  /** Optional FK back to t_client_asset_registry */
  asset_registry_id?: string | null;
  /** Tenant who added this entry */
  added_by_tenant_id?: string;
  /** Role of who added: seller or buyer */
  added_by_role?: 'seller' | 'buyer';
  /** equipment or entity */
  resource_type: 'equipment' | 'entity';
  /** FK to m_catalog_resource_types (optional) */
  category_id?: string | null;
  /** Denormalized category name, e.g. "Diagnostic Imaging" */
  category_name: string;
  /** Specific item name, e.g. "MRI Scanner" */
  item_name: string;
  /** Quantity of this item */
  quantity: number;
  // Equipment-specific
  make?: string | null;
  model?: string | null;
  serial_number?: string | null;
  condition?: 'good' | 'fair' | 'poor' | 'critical' | null;
  criticality?: 'low' | 'medium' | 'high' | 'critical' | null;
  location?: string | null;
  purchase_date?: string | null;
  warranty_expiry?: string | null;
  // Entity-specific
  area_sqft?: number | null;
  dimensions?: { length?: number; width?: number; height?: number; unit?: string } | null;
  capacity?: number | null;
  // Overflow
  specifications?: Record<string, any>;
  notes?: string | null;
}

// =================================================================
// CORE ENTITY INTERFACES
// =================================================================

export interface Contract {
  id: string;
  tenant_id: string;
  // Dual-persona: who sells vs who buys this contract
  seller_id?: string;           // Tenant who created/owns/sells — equals tenant_id for existing data
  buyer_tenant_id?: string | null; // Tenant who claimed/accepted as buyer — null until claimed
  record_type: ContractRecordType;
  contract_type: ContractType;
  contract_number: string;
  title: string;
  name?: string;
  description?: string;
  status: ContractStatus;
  acceptance_method: AcceptanceMethod;
  path?: string;
  template_id?: string;
  // CNAK (ContractNest Access Key) — unique per tenant
  global_access_id?: string;
  // Counterparty / contact fields (populated by create RPC)
  buyer_id?: string;
  buyer_name?: string;
  buyer_company?: string;
  buyer_email?: string;
  buyer_phone?: string;
  buyer_contact_person_id?: string;
  buyer_contact_person_name?: string;
  contact_id?: string;
  contact_classification?: string;
  // Duration & Timeline
  duration_value?: number;
  duration_unit?: string;
  grace_period_value?: number;
  grace_period_unit?: string;
  // Billing
  currency?: string;
  billing_cycle_type?: string;
  payment_mode?: string;
  emi_months?: number;
  per_block_payment_type?: string;
  // Financials
  total_value?: number;
  tax_total?: number;
  grand_total?: number;
  selected_tax_rate_ids?: string[];
  tax_breakdown?: Array<{ tax_rate_id: string; name: string; rate: number; amount: number }>;
  // Dates
  sent_at?: string;
  accepted_at?: string;
  completed_at?: string;
  // Audit
  version: number;
  is_live?: boolean;
  created_by: string;
  updated_by?: string;
  created_at: string;
  updated_at: string;
  // Computed counts (from get_contract_by_id)
  blocks_count?: number;
  vendors_count?: number;
  attachments_count?: number;
  // Legacy/optional
  renewal_terms?: string;
  termination_clause?: string;
  notes?: string;
  metadata?: Record<string, any>;
  // Evidence policy (set during contract creation wizard)
  evidence_policy_type?: 'none' | 'upload' | 'smart_form';
  evidence_selected_forms?: Array<{ form_template_id: string; name: string; sequence: number }>;
  // Denormalized equipment/entity details
  equipment_details?: ContractEquipmentDetail[];
}

export interface ContractBlock {
  id: string;
  contract_id?: string;
  position: number;
  source_type?: string;
  source_block_id?: string;
  block_name: string;
  block_description?: string;
  category_id?: string;
  category_name?: string;
  unit_price?: number;
  quantity?: number;
  billing_cycle?: string;
  total_price?: number;
  flyby_type?: string;
  custom_fields?: Record<string, any>;
  created_at: string;
}

export interface ContractVendor {
  id: string;
  contract_id?: string;
  vendor_id: string;
  vendor_name?: string;
  vendor_company?: string;
  vendor_email?: string;
  response_status?: string;
  responded_at?: string;
  quoted_amount?: number;
  quote_notes?: string;
  created_at: string;
}

export interface ContractAttachment {
  id: string;
  contract_id?: string;
  block_id?: string;
  file_name: string;
  file_path?: string;
  file_size?: number;
  file_type?: string;
  mime_type?: string;
  download_url?: string;
  file_category?: string;
  metadata?: Record<string, any>;
  uploaded_by?: string;
  created_at: string;
}

export interface ContractHistoryEntry {
  id: string;
  contract_id?: string;
  action: string;
  from_status?: string;
  to_status?: string;
  changes?: Record<string, any>;
  performed_by_type?: string;
  performed_by_name?: string;
  note?: string;
  created_at: string;
}

// Full contract detail (returned by GET /:id)
export interface ContractDetail extends Contract {
  blocks: ContractBlock[];
  vendors: ContractVendor[];
  attachments: ContractAttachment[];
  history: ContractHistoryEntry[];
}

// =================================================================
// INVOICE & RECEIPT INTERFACES
// =================================================================

export type InvoiceType = 'receivable' | 'payable';
export type InvoiceStatus = 'unpaid' | 'partially_paid' | 'paid' | 'overdue' | 'cancelled';
export type PaymentMethod = 'cash' | 'bank_transfer' | 'upi' | 'cheque' | 'card' | 'other';

export interface Invoice {
  id: string;
  contract_id: string;
  tenant_id: string;
  invoice_number: string;
  invoice_type: InvoiceType;
  amount: number;
  tax_amount: number;
  total_amount: number;
  currency: string;
  amount_paid: number;
  balance: number;
  status: InvoiceStatus;
  payment_mode?: string;
  emi_sequence?: number;
  emi_total?: number;
  billing_cycle?: string;
  block_ids?: string[];
  due_date?: string;
  issued_at: string;
  paid_at?: string;
  notes?: string;
  created_at: string;
  receipts_count?: number;
  receipts?: InvoiceReceipt[];
}

export interface InvoiceReceipt {
  id: string;
  invoice_id: string;
  contract_id: string;
  tenant_id: string;
  receipt_number: string;
  amount: number;
  currency: string;
  payment_date: string;
  payment_method: PaymentMethod;
  reference_number?: string;
  notes?: string;
  is_offline: boolean;
  is_verified: boolean;
  recorded_by?: string;
  created_at: string;
}

export interface InvoiceSummary {
  total_invoiced: number;
  total_paid: number;
  total_balance: number;
  invoice_count: number;
  paid_count: number;
  unpaid_count: number;
  partial_count: number;
  overdue_count: number;
  cancelled_count?: number;
  collection_percentage: number;
}

// Payment recording
export interface RecordPaymentPayload {
  invoice_id: string;
  amount: number;
  payment_method: PaymentMethod;
  payment_date?: string;
  reference_number?: string;
  notes?: string;
  emi_sequence?: number;
}

export interface RecordPaymentResponse {
  receipt_id: string;
  receipt_number: string;
  amount: number;
  currency: string;
  payment_method: string;
  payment_date: string;
  emi_sequence?: number;
  invoice_id: string;
  invoice_number: string;
  invoice_status: string;
  amount_paid: number;
  balance: number;
  receipts_count: number;
}

// =================================================================
// REQUEST INTERFACES
// =================================================================

export interface CreateContractRequest {
  record_type: ContractRecordType;
  contract_type?: ContractType;
  contact_classification?: string;
  title?: string;
  name?: string;
  description?: string;
  status?: string;
  acceptance_method?: string;
  path?: string;
  template_id?: string;
  // Counterparty
  buyer_id?: string;
  buyer_name?: string;
  contact_id?: string;
  // Duration
  duration_value?: number;
  duration_unit?: string;
  grace_period_value?: number;
  grace_period_unit?: string;
  // Billing
  currency?: string;
  billing_cycle_type?: string;
  payment_mode?: string;
  emi_months?: number;
  per_block_payment_type?: string;
  // Financials
  total_value?: number;
  tax_total?: number;
  grand_total?: number;
  selected_tax_rate_ids?: string[];
  tax_breakdown?: Array<{ tax_rate_id: string; name: string; rate: number; amount: number }>;
  // Related entities (created in same transaction)
  blocks?: Array<Record<string, any>>;
  vendors?: Array<Record<string, any>>;
  notes?: string;
  metadata?: Record<string, any>;
  // Denormalized equipment/entity details
  equipment_details?: ContractEquipmentDetail[];
}

export interface UpdateContractRequest {
  title?: string;
  name?: string;
  description?: string;
  contract_type?: ContractType;
  acceptance_method?: string;
  // Duration
  duration_value?: number;
  duration_unit?: string;
  grace_period_value?: number;
  grace_period_unit?: string;
  // Billing
  currency?: string;
  billing_cycle_type?: string;
  payment_mode?: string;
  emi_months?: number;
  per_block_payment_type?: string;
  // Financials
  total_value?: number;
  tax_total?: number;
  grand_total?: number;
  selected_tax_rate_ids?: string[];
  tax_breakdown?: Array<{ tax_rate_id: string; name: string; rate: number; amount: number }>;
  notes?: string;
  metadata?: Record<string, any>;
  version: number; // Required for optimistic concurrency
  blocks?: Array<Record<string, any>>;
  vendors?: Array<Record<string, any>>;
  // Denormalized equipment/entity details
  equipment_details?: ContractEquipmentDetail[];
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
