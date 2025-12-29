// src/types/contracts/contract.ts
export type ContractStatus = 'draft' | 'pending_review' | 'pending_acceptance' | 'active' | 'completed' | 'cancelled' | 'expired';
export type ContractType = 'service' | 'partnership';
export type AcceptanceCriteria = 'payment' | 'signoff' | 'creation';
export type BillingFrequency = 'monthly' | 'quarterly' | 'annually' | 'milestone' | 'on_completion' | 'prepaid';
export type Priority = 'low' | 'medium' | 'high' | 'critical';

// Core contract interface
export interface Contract {
  id: string;
  templateId: string;
  name: string;
  description?: string;
  contractNumber: string;
  status: ContractStatus;
  contractType: ContractType;
  
  // Parties involved
  buyerId: string;
  buyerDetails: ContactDetails;
  sellerId: string;
  sellerDetails: ContactDetails;
  partnerId?: string; // For partnership contracts
  partnerDetails?: ContactDetails;
  
  // Contract timeline
  startDate: string;
  endDate: string;
  createdAt: string;
  updatedAt: string;
  acceptedAt?: string;
  completedAt?: string;
  
  // Contract configuration
  acceptanceCriteria: AcceptanceCriteria;
  currency: string;
  totalValue: number;
  
  // Block configuration
  blocks: BlockInstance[];
  
  // Financial details
  billing: BillingConfiguration;
  
  // Metadata
  priority: Priority;
  tags: string[];
  attachments: ContractAttachment[];
  
  // Tenant and environment
  tenantId: string;
  isLive: boolean;
  
  // Tracking
  createdBy: string;
  lastModifiedBy: string;
  version: number;
}

// Contact details for contract parties
export interface ContactDetails {
  id: string;
  name: string;
  displayName: string;
  email: string;
  phone?: string;
  company?: string;
  address?: Address;
  contactType: 'individual' | 'corporate';
  classification: string[];
}

export interface Address {
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

// Block system for contracts
export interface BlockInstance {
  id: string;
  blockType: string;
  blockCategory: 'core' | 'event' | 'content' | 'commercial';
  position: number;
  name: string;
  description?: string;
  isRequired: boolean;
  isValid: boolean;
  validationErrors: ValidationError[];
  configuration: Record<string, any>;
  dependencies: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ValidationError {
  field: string;
  message: string;
  severity: 'error' | 'warning';
  code: string;
}

// Billing and financial configuration
export interface BillingConfiguration {
  frequency: BillingFrequency;
  totalAmount: number;
  currency: string;
  billingRules: BillingRule[];
  paymentTerms: PaymentTerms;
  taxConfiguration?: TaxConfiguration;
}

export interface BillingRule {
  id: string;
  name: string;
  type: 'milestone' | 'recurring' | 'usage' | 'fixed';
  amount: number;
  percentage?: number;
  triggerCondition: string;
  dueDate?: string;
  description?: string;
  isActive: boolean;
}

export interface PaymentTerms {
  daysNet: number; // Net 30, Net 60, etc.
  discountPercent?: number;
  discountDays?: number;
  lateFeePercent?: number;
  currency: string;
}

export interface TaxConfiguration {
  taxRate: number;
  taxType: string;
  taxRegion: string;
  exemptionCode?: string;
}

// Service commitments and events
export interface ServiceCommitment {
  id: string;
  serviceType: string;
  serviceName: string;
  description: string;
  quantity: number;
  cycle: number; // Days between occurrences
  startDate: string;
  endDate?: string;
  equipmentId?: string;
  equipmentDetails?: EquipmentDetails;
  pricePerEvent: number;
  totalPrice: number;
  events: ServiceEvent[];
  isActive: boolean;
}

export interface ServiceEvent {
  id: string;
  commitmentId: string;
  eventNumber: number;
  scheduledDate: string;
  actualDate?: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'overdue';
  assignedTo?: string;
  notes?: string;
  attachments: string[];
  completionDetails?: CompletionDetails;
}

export interface CompletionDetails {
  completedBy: string;
  completedAt: string;
  notes: string;
  attachments: string[];
  rating?: number;
  feedback?: string;
}

// Equipment and asset details
export interface EquipmentDetails {
  id: string;
  name: string;
  serialNumber: string;
  model: string;
  manufacturer: string;
  category: string;
  subCategory: string;
  specifications: Record<string, any>;
  calibrationParameters?: CalibrationParameter[];
  location?: string;
  purchaseDate?: string;
  warrantyExpiry?: string;
}

export interface CalibrationParameter {
  id: string;
  name: string;
  expectedValue: number;
  tolerance: number;
  unit: string;
  lastCalibrated?: string;
  nextCalibration?: string;
  status: 'valid' | 'due' | 'overdue';
}

// Contract attachments and documents
export interface ContractAttachment {
  id: string;
  name: string;
  type: 'document' | 'image' | 'video' | 'other';
  size: number;
  mimeType: string;
  url: string;
  uploadedBy: string;
  uploadedAt: string;
  category: 'legal' | 'technical' | 'financial' | 'reference';
  isRequired: boolean;
}

// Contract creation and updates
export interface CreateContractPayload {
  templateId: string;
  name: string;
  description?: string;
  buyerId: string;
  sellerId: string;
  partnerId?: string;
  startDate: string;
  endDate: string;
  acceptanceCriteria: AcceptanceCriteria;
  currency: string;
  priority: Priority;
  tags: string[];
}

export interface UpdateContractPayload extends Partial<CreateContractPayload> {
  id: string;
  blocks?: BlockInstance[];
  billing?: BillingConfiguration;
  attachments?: ContractAttachment[];
}

// Contract filtering and search
export interface ContractFilters {
  status?: ContractStatus;
  contractType?: ContractType;
  buyerId?: string;
  sellerId?: string;
  partnerId?: string;
  priority?: Priority;
  tags?: string[];
  search?: string;
  startDateFrom?: string;
  startDateTo?: string;
  endDateFrom?: string;
  endDateTo?: string;
  totalValueMin?: number;
  totalValueMax?: number;
  page?: number;
  limit?: number;
  sortBy?: 'name' | 'startDate' | 'endDate' | 'totalValue' | 'status' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}

// Contract search results
export interface ContractSearchResult {
  contracts: Contract[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  filters: ContractFilters;
  aggregations: {
    statusCounts: Record<ContractStatus, number>;
    typeCounts: Record<ContractType, number>;
    totalValue: number;
    averageValue: number;
  };
}

// Contract statistics
export interface ContractStats {
  total: number;
  active: number;
  completed: number;
  pending: number;
  totalValue: number;
  averageValue: number;
  upcomingRenewals: number;
  overdueEvents: number;
  byStatus: Record<ContractStatus, number>;
  byType: Record<ContractType, number>;
  byMonth: MonthlyStats[];
}

export interface MonthlyStats {
  month: string;
  year: number;
  count: number;
  value: number;
}

// Contract timeline and events
export interface ContractTimeline {
  contractId: string;
  events: TimelineEvent[];
  milestones: Milestone[];
  upcomingEvents: UpcomingEvent[];
}

export interface TimelineEvent {
  id: string;
  type: 'created' | 'updated' | 'accepted' | 'service_completed' | 'billing' | 'milestone' | 'note';
  title: string;
  description: string;
  date: string;
  actor: string;
  metadata?: Record<string, any>;
}

export interface Milestone {
  id: string;
  name: string;
  description: string;
  dueDate: string;
  status: 'pending' | 'completed' | 'overdue';
  completedDate?: string;
  amount?: number;
  dependencies: string[];
}

export interface UpcomingEvent {
  id: string;
  type: 'service' | 'billing' | 'milestone' | 'renewal' | 'review';
  title: string;
  dueDate: string;
  priority: Priority;
  assignedTo?: string;
  estimatedDuration?: number;
}

// Hook return types
export interface UseContractReturn {
  contract: Contract | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  updateContract: (payload: UpdateContractPayload) => Promise<void>;
  deleteContract: () => Promise<void>;
}

export interface UseContractsReturn {
  contracts: Contract[];
  loading: boolean;
  error: string | null;
  pagination: ContractSearchResult['pagination'] | null;
  stats: ContractStats | null;
  filters: ContractFilters;
  refetch: () => Promise<void>;
  updateFilters: (filters: Partial<ContractFilters>) => void;
  clearFilters: () => void;
}

// Constants and labels
export const CONTRACT_STATUS_LABELS: Record<ContractStatus, string> = {
  draft: 'Draft',
  pending_review: 'Pending Review',
  pending_acceptance: 'Pending Acceptance',
  active: 'Active',
  completed: 'Completed',
  cancelled: 'Cancelled',
  expired: 'Expired'
};

export const CONTRACT_STATUS_COLORS: Record<ContractStatus, string> = {
  draft: 'bg-gray-100 text-gray-800 border-gray-200',
  pending_review: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  pending_acceptance: 'bg-blue-100 text-blue-800 border-blue-200',
  active: 'bg-green-100 text-green-800 border-green-200',
  completed: 'bg-purple-100 text-purple-800 border-purple-200',
  cancelled: 'bg-red-100 text-red-800 border-red-200',
  expired: 'bg-orange-100 text-orange-800 border-orange-200'
};

export const ACCEPTANCE_CRITERIA_LABELS: Record<AcceptanceCriteria, string> = {
  payment: 'Payment Received',
  signoff: 'Customer Sign-off',
  creation: 'Auto-accept on Creation'
};

export const BILLING_FREQUENCY_LABELS: Record<BillingFrequency, string> = {
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  annually: 'Annually',
  milestone: 'Milestone-based',
  on_completion: 'On Completion',
  prepaid: 'Prepaid'
};

export const PRIORITY_LABELS: Record<Priority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  critical: 'Critical'
};

export const PRIORITY_COLORS: Record<Priority, string> = {
  low: 'bg-gray-100 text-gray-800',
  medium: 'bg-blue-100 text-blue-800',
  high: 'bg-orange-100 text-orange-800',
  critical: 'bg-red-100 text-red-800'
};

// Default values
export const DEFAULT_CONTRACT_FILTERS: ContractFilters = {
  page: 1,
  limit: 10,
  sortBy: 'createdAt',
  sortOrder: 'desc'
};