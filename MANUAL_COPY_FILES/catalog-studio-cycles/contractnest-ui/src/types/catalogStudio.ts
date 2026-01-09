// src/types/catalogStudio.ts
// Phase 6: Enhanced with pricing types and business rules
// Centralized types for Catalog Studio feature

export interface BlockCategory {
  id: string;           // Short identifier (e.g., 'service', 'spare')
  dbId?: string;        // Actual UUID from m_category_details for database operations
  name: string;
  icon: string; // Lucide icon name (e.g., 'Target', 'Package', 'Wallet')
  count: number;
  color: string;
  bgColor: string;
  description: string;
}

// =================================================================
// PRICING TYPES (Phase 6)
// =================================================================

export type PriceType = 'fixed' | 'hourly' | 'tiered' | 'custom' | 'resource_based';

export type PricingModel = 'hourly' | 'per_unit' | 'fixed';

export interface PricingTier {
  id: string;
  name: string;
  minQty?: number;
  maxQty?: number;
  price: number;
  description?: string;
}

export interface ResourcePricing {
  resourceTypeId: string;
  resourceTypeName: string;
  pricePerUnit: number;
  pricingModel: PricingModel;
}

export interface BlockPricing {
  priceType: PriceType;
  basePrice?: number;
  currency: string;
  pricingUnit?: 'service' | 'hour' | 'day' | 'week' | 'month' | 'visit';
  pricingTiers?: PricingTier[];
  resourcePricing?: ResourcePricing[];
  taxInclusive: boolean;
  taxRateId?: string;
  taxRate?: number;
  taxType?: 'gst' | 'vat' | 'sales' | 'none';
  allowCoupons?: boolean;
  allowBulkDiscount?: boolean;
  allowNegotiatedPricing?: boolean;
}

// =================================================================
// RESOURCE DEPENDENCY TYPES (Phase 5)
// =================================================================

export type ResourceDependencyMode = 'independent' | 'resource_based' | 'variant_based' | 'multi_resource';

export interface ResourceDependency {
  pricingMode: ResourceDependencyMode;
  resourceTypes: string[];
  resourceQuantities: Record<string, number>;
}

// =================================================================
// BUSINESS RULES TYPES (Phase 7)
// =================================================================

export interface FollowupConfig {
  enabled: boolean;
  freeFollowups: number;
  followupPeriod: number;
  followupPeriodUnit: 'days' | 'weeks' | 'months';
  paidFollowupPrice?: number;
  conditions?: string[];
}

export interface WarrantyConfig {
  enabled: boolean;
  warrantyPeriod: number;
  warrantyPeriodUnit: 'days' | 'months' | 'years';
  warrantyType: 'full' | 'limited' | 'parts_only' | 'labor_only';
  warrantyTerms?: string;
}

export interface CancellationConfig {
  policy: 'flexible' | 'moderate' | 'strict' | 'custom';
  refundPercentage: number;
  cutoffHours: number;
  customTerms?: string;
}

export interface RescheduleConfig {
  maxReschedules: number;
  rescheduleBuffer: number; // hours before service
  freeReschedules: number;
  rescheduleCharge?: number;
}

export interface BlockBusinessRules {
  followup: FollowupConfig;
  warranty?: WarrantyConfig;
  cancellation: CancellationConfig;
  reschedule: RescheduleConfig;
  autoApprove: boolean;
  requiresOTP: boolean;
  requiresDeposit?: boolean;
  depositPercentage?: number;
}

// =================================================================
// BLOCK TYPES (Enhanced)
// =================================================================

export interface BlockMeta extends Partial<BlockPricing>, Partial<ResourceDependency>, Partial<BlockBusinessRules> {
  // Image
  image?: File;
  image_url?: string;
  // Terms
  terms?: string;
  // Service-specific
  bufferTime?: string;
  // Spare-specific
  sku?: string;
  spareCategory?: string;
  // Billing-specific
  paymentType?: string;
  invoiceTrigger?: string;
  // Generic
  [key: string]: unknown;
}

export interface Block {
  id: string;
  categoryId: string;
  name: string;
  icon: string; // Lucide icon name
  description: string;
  price?: number;
  currency?: string;
  duration?: number;
  durationUnit?: string;
  tags: string[];
  evidenceTags?: string[];
  usage: { templates: number; contracts: number };
  meta?: BlockMeta;
  // Multi-tenancy (Phase 1)
  tenant_id?: string;
  is_seed?: boolean;
}

export interface WizardStep {
  id: number;
  label: string;
}

export type WizardMode = 'create' | 'edit';

export type BlockType =
  | 'service'
  | 'spare'
  | 'billing'
  | 'text'
  | 'video'
  | 'image'
  | 'checklist'
  | 'document';

export interface ServiceBlockFormData {
  name: string;
  icon: string;
  description: string;
  duration: number;
  durationUnit: 'minutes' | 'hours' | 'days';
  bufferTime: number;
  deliveryMode: 'on-site' | 'virtual' | 'hybrid';
  serviceArea?: string;
  requiresScheduling: boolean;
  schedulingBuffer: number;
  priceType: PriceType;
  basePrice: number;
  currency: string;
  taxInclusive: boolean;
  taxRate?: number;
  evidenceRequired: boolean;
  evidenceTypes: string[];
  photoRequired: boolean;
  signatureRequired: boolean;
  gpsRequired: boolean;
  autoApprove: boolean;
  requiresOTP: boolean;
  maxReschedules: number;
  cancellationPolicy: 'flexible' | 'moderate' | 'strict';
  refundPercentage: number;
}

export interface EvidenceType {
  id: string;
  name: string;
  icon: string; // Lucide icon name
  description: string;
}

export interface CancellationPolicy {
  id: string;
  name: string;
  description: string;
  refundPercent: number;
}

export interface IconOption {
  value: string; // Lucide icon name
  label: string;
}

export interface CurrencyOption {
  value: string;
  label: string;
  symbol: string;
}

// =================================================================
// HELPER TYPES
// =================================================================

export interface CreateBlockData {
  category_id: string;
  name: string;
  icon: string;
  description: string;
  price?: number;
  currency?: string;
  duration?: number;
  duration_unit?: string;
  tags?: string[];
  evidence_tags?: string[];
  meta?: BlockMeta;
  tenant_id?: string;
  is_seed?: boolean;
}

export interface UpdateBlockData extends Partial<CreateBlockData> {
  id?: never; // ID should not be in update data
}
