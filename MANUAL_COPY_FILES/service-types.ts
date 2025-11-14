// src/types/catalog/service.ts
// ✅ UPDATED: Aligned with backend boolean status + variant support

export interface Service {
  id: string;
  service_name: string;
  sku?: string;
  description: string;
  short_description?: string; // ✅ ADDED
  terms?: string;
  image_url?: string;
  image_file_id?: string; 
  service_type: 'independent' | 'resource_based';
  
  // ✅ CHANGED: status is now boolean (true = active, false = inactive)
  status: boolean;
  
  // ✅ KEPT: For backward compatibility and computed fields
  is_active: boolean;
  
  // ✅ NEW: Variant support
  is_variant?: boolean;
  parent_id?: string | null;
  
  tenant_id: string;
  created_at: string;
  updated_at: string;
  created_by: string;
  updated_by?: string;
  
  // Relations
  pricing_records?: ServicePricing[];
  resource_requirements?: ServiceResource[];
}

export interface ServicePricing {
  id: string;
  service_id: string;
  currency: string;
  amount: number;
  price_type: string; // From master data: 'fixed', 'unit_price', 'price_range'
  tax_inclusion: 'inclusive' | 'exclusive';
  tax_rate_id?: string;
  tax_rate?: number;
  billing_cycle?: string; // ✅ ADDED
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ServiceResource {
  id: string;
  service_id: string;
  resource_id: string;
  resource_type_id: string;
  quantity: number;
  is_required: boolean;
  duration_hours?: number; // ✅ ADDED
  unit_cost?: number; // ✅ ADDED
  currency?: string; // ✅ ADDED
  is_billable?: boolean; // ✅ ADDED
  required_skills?: string[]; // ✅ ADDED
  required_attributes?: Record<string, any>; // ✅ ADDED
  sequence_no: number;
  created_at: string;
  updated_at: string;
  
  // Relations
  resource?: {
    id: string;
    name: string;
    display_name: string;
    resource_type_id: string;
  };
}

// Form Data Types
export interface ServiceBasicInfo {
  service_name: string;
  sku?: string;
  description: string;
  short_description?: string; // ✅ ADDED
  terms?: string;
  image?: File | null;
  image_url?: string;
  
  // ✅ NEW: Variant fields
  is_variant?: boolean;
  parent_id?: string | null;
}

export interface ServiceTypeSelection {
  service_type: 'independent' | 'resource_based';
}

export interface ServicePricingForm {
  currency: string;
  amount: number;
  price_type: string;
  tax_inclusion: 'inclusive' | 'exclusive';
  tax_rate_id?: string;
  billing_cycle?: string; // ✅ ADDED
}

export interface ServiceResourceForm {
  resource_id: string;
  resource_type_id: string;
  resource_name?: string; // For displaying in edit mode
  quantity: number;
  is_required: boolean;
  duration_hours?: number; // ✅ ADDED
  unit_cost?: number; // ✅ ADDED
  currency?: string; // ✅ ADDED
  is_billable?: boolean; // ✅ ADDED
  description?: string; // For displaying in edit mode

  // Populated from API in edit mode
  resource?: {
    id: string;
    name: string;
    display_name: string;
    resource_type_id: string;
  };
}

export interface ServiceFormData {
  // Tab 1: Basic Info
  basic_info: ServiceBasicInfo;
  
  // Tab 2: Service Type & Configuration
  service_type: 'independent' | 'resource_based';
  pricing_records: ServicePricingForm[];
  resource_requirements: ServiceResourceForm[];
  
  // ✅ NEW: Initial status (defaults to true/active)
  status?: boolean;
}

// API Response Types
export interface ServiceResponse {
  success: boolean;
  data?: Service;
  error?: string;
  message?: string;
}

export interface ServiceListResponse {
  success: boolean;
  data?: Service[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
    has_next_page?: boolean; // ✅ ADDED
    has_prev_page?: boolean; // ✅ ADDED
  };
  error?: string;
  message?: string;
}

// ✅ NEW: Service statistics response
export interface ServiceStatisticsResponse {
  success: boolean;
  data?: {
    total_services: number;
    active_services: number;
    inactive_services: number;
    services_with_resources: number;
    service_variants: number;
  };
  error?: string;
  message?: string;
}

// ✅ NEW: Service version history response
export interface ServiceVersionHistoryResponse {
  success: boolean;
  data?: {
    service_id: string;
    versions: Service[];
    total_versions: number;
  };
  error?: string;
  message?: string;
}

// Form Validation Types - Updated to match validation schemas
export interface ServiceValidationErrors {
  // Basic info errors
  service_name?: string;
  sku?: string;
  description?: string;
  short_description?: string; // ✅ ADDED
  terms?: string;
  
  // Configuration errors
  service_type?: string;
  pricing_records?: string;
  resource_requirements?: string;
  
  // ✅ NEW: Variant validation errors
  is_variant?: string;
  parent_id?: string;
  
  // ✅ NEW: Status validation error
  status?: string;
  
  // Pricing specific errors
  currency?: string;
  amount?: string;
  basePrice?: string;
  taxRate?: string;
  price_type?: string;
  tax_inclusion?: string;
  tax_rate_id?: string;
  billing_cycle?: string; // ✅ ADDED
  
  // Resource specific errors
  resource_id?: string;
  resource_type_id?: string;
  quantity?: string;
  duration_hours?: string; // ✅ ADDED
  unit_cost?: string; // ✅ ADDED
  
  // General errors
  general?: string;
  
  // Allow any other string keys for flexibility
  [key: string]: string | undefined;
}

// ✅ NEW: Service filters for querying
export interface ServiceFilters {
  search_term?: string;
  category_id?: string;
  industry_id?: string;
  is_active?: boolean;
  status?: boolean; // ✅ NEW: Filter by boolean status
  service_type?: 'independent' | 'resource_based';
  has_resources?: boolean;
  is_variant?: boolean; // ✅ NEW: Filter variants only
  parent_id?: string; // ✅ NEW: Filter by parent
  price_min?: number;
  price_max?: number;
  currency?: string;
  sort_by?: 'name' | 'price' | 'created_at' | 'sort_order';
  sort_direction?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
  page?: number; // ✅ ADDED: For easier pagination
}

// Constants
export const SERVICE_TYPES = {
  INDEPENDENT: 'independent',
  RESOURCE_BASED: 'resource_based'
} as const;

// ✅ UPDATED: Status is now boolean
export const SERVICE_STATUS = {
  ACTIVE: true,
  INACTIVE: false
} as const;

// ✅ DEPRECATED: Legacy status enum kept for migration compatibility
export const LEGACY_SERVICE_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  DRAFT: 'draft'
} as const;

export const TAX_INCLUSION_OPTIONS = {
  INCLUSIVE: 'inclusive',
  EXCLUSIVE: 'exclusive'
} as const;

export const PRICE_TYPES = {
  FIXED: 'fixed',
  UNIT_PRICE: 'unit_price',
  PRICE_RANGE: 'price_range'
} as const;

export type ServiceType = typeof SERVICE_TYPES[keyof typeof SERVICE_TYPES];
export type ServiceStatus = boolean; // ✅ CHANGED: Now boolean instead of string union
export type LegacyServiceStatus = typeof LEGACY_SERVICE_STATUS[keyof typeof LEGACY_SERVICE_STATUS]; // ✅ NEW: For backward compatibility
export type TaxInclusion = typeof TAX_INCLUSION_OPTIONS[keyof typeof TAX_INCLUSION_OPTIONS];
export type PriceType = typeof PRICE_TYPES[keyof typeof PRICE_TYPES];

// ✅ NEW: Helper functions for status display
export const getServiceStatusDisplay = (status: boolean): string => {
  return status ? 'Active' : 'Inactive';
};

export const getServiceStatusBadgeColor = (status: boolean): string => {
  return status ? 'success' : 'default';
};

export const getServiceStatusIcon = (status: boolean): string => {
  return status ? '✓' : '✗';
};

// ✅ NEW: Helper functions for variants
export const isServiceVariant = (service: Service): boolean => {
  return service.is_variant === true && !!service.parent_id;
};

export const hasVariants = (service: Service, allServices: Service[]): boolean => {
  return allServices.some(s => s.parent_id === service.id);
};

export const getServiceVariants = (serviceId: string, allServices: Service[]): Service[] => {
  return allServices.filter(s => s.parent_id === serviceId);
};

export const getParentService = (service: Service, allServices: Service[]): Service | undefined => {
  if (!service.parent_id) return undefined;
  return allServices.find(s => s.id === service.parent_id);
};