// src/types/tenantManagement.ts
// Shared types for Subscription Management (Admin & Tenant Owner)

// ============================================
// STATUS TYPES
// ============================================

export type TenantStatus = 'active' | 'inactive' | 'suspended' | 'closed';
export type SubscriptionStatus = 'trial' | 'active' | 'grace_period' | 'suspended' | 'cancelled' | 'expired';
export type TenantType = 'buyer' | 'seller' | 'mixed' | 'unknown';
export type BillingCycle = 'monthly' | 'quarterly' | 'annual';

// ============================================
// TENANT LIST TYPES
// ============================================

export interface TenantSubscriptionInfo {
  status: SubscriptionStatus;
  product_code: string;
  billing_cycle: BillingCycle;
  trial_end_date?: string;
  next_billing_date?: string;
  current_tier?: string;
  days_until_expiry?: number;
}

export interface TenantProfileInfo {
  business_name: string;
  logo_url?: string;
  industry_name?: string;
  industry_id?: string;
  city?: string;
  business_email?: string;
}

export interface TenantStats {
  total_users: number;
  total_contacts: number;
  total_contracts: number;
  buyer_contacts: number;
  seller_contacts: number;
  storage_used_mb: number;
  storage_limit_mb: number;
}

export interface TenantOwnerInfo {
  user_id: string;
  email: string;
  first_name: string;
  last_name: string;
  name: string;
}

export interface TenantListItem {
  id: string;
  name: string;
  workspace_code: string;
  status: TenantStatus;
  is_admin: boolean;
  is_test: boolean;
  created_at: string;
  owner: TenantOwnerInfo | null;
  subscription: TenantSubscriptionInfo | null;
  profile: TenantProfileInfo | null;
  stats: TenantStats & { tenant_type: TenantType };
}

// ============================================
// ADMIN DASHBOARD STATS
// ============================================

export interface AdminSubscriptionStats {
  total_tenants: number;
  active_tenants: number;
  trial_tenants: number;
  expiring_soon: number; // trials expiring in 7 days
  churned_this_month: number;
  new_this_month: number;
  by_status: Record<TenantStatus, number>;
  by_subscription: Record<SubscriptionStatus, number>;
  by_tenant_type: {
    buyers: number;
    sellers: number;
    mixed: number;
    unknown: number;
  };
  by_industry: { industry_id: string; industry_name: string; count: number }[];
}

// ============================================
// DATA SUMMARY TYPES (For Delete Preview)
// ============================================

export interface DataSummaryItem {
  label: string;
  count: number;
  table?: string;
}

export interface TenantDataCategory {
  id: string;
  label: string;
  icon: string; // Lucide icon name
  color: string;
  description: string;
  totalCount: number;
  items: DataSummaryItem[];
}

export interface TenantDataSummary {
  tenant_id: string;
  tenant_name: string;
  workspace_code: string;
  categories: TenantDataCategory[];
  totalRecords: number;
  canDelete: boolean;
  blockingReasons: string[];
}

// ============================================
// FILTER TYPES
// ============================================

export interface AdminTenantFilters {
  status?: TenantStatus | 'all';
  subscription_status?: SubscriptionStatus | 'all';
  tenant_type?: TenantType | 'all';
  industry_id?: string;
  search?: string;
  page?: number;
  limit?: number;
  sort_by?: 'name' | 'created_at' | 'status' | 'subscription_status';
  sort_direction?: 'asc' | 'desc';
  is_test?: string;
}

export type QuickFilterType = 'all' | 'active' | 'trial' | 'expiring' | 'suspended' | 'test';

// ============================================
// ACTION TYPES
// ============================================

export interface ChangeStatusRequest {
  tenant_id: string;
  new_status: TenantStatus;
  reason: string;
}

export interface DeleteTenantDataRequest {
  tenant_id: string;
  confirmed: boolean;
  reason?: string;
}

export interface DeleteTenantDataResponse {
  success: boolean;
  deleted_counts: Record<string, number>;
  total_deleted: number;
  tenant_status: 'closed';
  deletion_log_id: string;
}

// ============================================
// FEEDBACK TYPES (Owner Offboarding)
// ============================================

export type FeedbackCategory =
  | 'better_alternative'
  | 'pricing'
  | 'not_using'
  | 'missing_features'
  | 'technical_issues'
  | 'testing'
  | 'other';

export interface ClosureeFeedback {
  category: FeedbackCategory;
  comment?: string;
}

export interface CloseAccountRequest {
  tenant_id: string;
  confirmed: boolean;
  feedback?: ClosureeFeedback;
}

// ============================================
// API RESPONSE TYPES
// ============================================

export interface AdminTenantsResponse {
  success: boolean;
  data: TenantListItem[];
  pagination: {
    current_page: number;
    total_pages: number;
    total_records: number;
    limit: number;
    has_next: boolean;
    has_prev: boolean;
  };
}

export interface AdminStatsResponse {
  success: boolean;
  data: AdminSubscriptionStats;
}

export interface DataSummaryResponse {
  success: boolean;
  data: TenantDataSummary;
}
