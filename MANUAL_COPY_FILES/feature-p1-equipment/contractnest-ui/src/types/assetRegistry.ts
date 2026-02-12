// src/types/assetRegistry.ts
// UI-layer domain types for Equipment Registry (aligned with API assetRegistryTypes)

// ── Equipment Category (from m_catalog_resource_types) ────────────────

export interface EquipmentCategory {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  pricing_model: string;
  requires_human_assignment: boolean;
  has_capacity_limits: boolean;
  is_active: boolean;
  sort_order: number;
  parent_type_id: string | null;
  created_at: string;
  updated_at: string;
}

// ── Domain Objects ────────────────────────────────────────────────────

export interface TenantAsset {
  id: string;
  tenant_id: string;
  resource_type_id: string;
  asset_type_id: string | null;
  parent_asset_id: string | null;
  template_id: string | null;
  industry_id: string | null;
  name: string;
  code: string | null;
  description: string | null;
  status: AssetStatus;
  condition: AssetCondition;
  criticality: AssetCriticality;
  owner_contact_id: string | null;
  location: string | null;
  // Equipment-specific
  make: string | null;
  model: string | null;
  serial_number: string | null;
  purchase_date: string | null;
  warranty_expiry: string | null;
  last_service_date: string | null;
  // Entity-specific
  area_sqft: number | null;
  dimensions: AssetDimensions | null;
  capacity: number | null;
  // Metadata
  specifications: Record<string, any>;
  tags: string[];
  image_url: string | null;
  is_active: boolean;
  is_live: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
}

export interface ContractAsset {
  id: string;
  contract_id: string;
  asset_id: string;
  tenant_id: string;
  coverage_type: string | null;
  service_terms: Record<string, any>;
  pricing_override: Record<string, any> | null;
  notes: string | null;
  is_active: boolean;
  is_live: boolean;
  created_at: string;
  updated_at: string;
  asset?: TenantAsset;
}

export interface AssetDimensions {
  length?: number;
  width?: number;
  height?: number;
  unit?: 'ft' | 'm' | 'cm';
}

// ── Enums ─────────────────────────────────────────────────────────────

export type AssetStatus = 'active' | 'inactive' | 'under_repair' | 'decommissioned';
export type AssetCondition = 'good' | 'fair' | 'poor' | 'critical';
export type AssetCriticality = 'low' | 'medium' | 'high' | 'critical';

// ── Form Data ─────────────────────────────────────────────────────────

export interface AssetFormData {
  name: string;
  resource_type_id: string;
  asset_type_id?: string;
  parent_asset_id?: string;
  code?: string;
  description?: string;
  status: AssetStatus;
  condition: AssetCondition;
  criticality: AssetCriticality;
  owner_contact_id?: string;
  location?: string;
  // Equipment fields
  make?: string;
  model?: string;
  serial_number?: string;
  purchase_date?: string;
  warranty_expiry?: string;
  last_service_date?: string;
  // Entity fields
  area_sqft?: number;
  capacity?: number;
  // Metadata
  specifications: Record<string, string>;
  tags: string[];
}

// ── Filter / Query Types ──────────────────────────────────────────────

export interface AssetRegistryFilters {
  resource_type_id?: string;
  status?: AssetStatus;
  condition?: AssetCondition;
  search?: string;
  is_live?: boolean;
  limit?: number;
  offset?: number;
}

// ── Response DTOs ─────────────────────────────────────────────────────

export interface AssetListResponse {
  success: boolean;
  data: TenantAsset[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    has_more: boolean;
  };
}

export interface AssetResponse {
  success: boolean;
  data: TenantAsset;
  message?: string;
}

export interface DeleteAssetResponse {
  success: boolean;
  data: { id: string; name: string };
  message: string;
}

// ── UI Helpers ────────────────────────────────────────────────────────

export const CONDITION_CONFIG: Record<AssetCondition, { label: string; color: string; bg: string }> = {
  good:     { label: 'Good',     color: '#10b981', bg: '#d1fae5' },
  fair:     { label: 'Fair',     color: '#f59e0b', bg: '#fef3c7' },
  poor:     { label: 'Poor',     color: '#ef4444', bg: '#fee2e2' },
  critical: { label: 'Critical', color: '#dc2626', bg: '#fecaca' },
};

export const CRITICALITY_CONFIG: Record<AssetCriticality, { label: string; color: string; bg: string }> = {
  low:      { label: 'Low',      color: '#10b981', bg: '#ecfdf5' },
  medium:   { label: 'Medium',   color: '#f59e0b', bg: '#fffbeb' },
  high:     { label: 'High',     color: '#f97316', bg: '#fff7ed' },
  critical: { label: 'Critical', color: '#ef4444', bg: '#fef2f2' },
};

export const STATUS_CONFIG: Record<AssetStatus, { label: string; color: string }> = {
  active:          { label: 'Active',          color: '#10b981' },
  inactive:        { label: 'Inactive',        color: '#94a3b8' },
  under_repair:    { label: 'Under Repair',    color: '#f59e0b' },
  decommissioned:  { label: 'Decommissioned',  color: '#ef4444' },
};

export function getWarrantyStatus(warrantyExpiry: string | null): { label: string; variant: 'active' | 'expiring' | 'expired' | 'none' } {
  if (!warrantyExpiry) return { label: 'No Warranty', variant: 'none' };
  const now = new Date();
  const expiry = new Date(warrantyExpiry);
  const diffDays = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return { label: `Expired ${Math.abs(diffDays)}d ago`, variant: 'expired' };
  if (diffDays <= 90) return { label: `Expires in ${diffDays}d`, variant: 'expiring' };
  return { label: `${diffDays}d remaining`, variant: 'active' };
}

export const DEFAULT_FORM_DATA: AssetFormData = {
  name: '',
  resource_type_id: '',
  status: 'active',
  condition: 'good',
  criticality: 'medium',
  specifications: {},
  tags: [],
};
