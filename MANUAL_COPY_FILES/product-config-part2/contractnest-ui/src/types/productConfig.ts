// ============================================================================
// Product Config Types
// ============================================================================
// Purpose: TypeScript interfaces for product billing configurations
// Used by: Plan Creation UI, Product Config management
// ============================================================================

// ============================================================================
// PLAN TYPES
// ============================================================================

/**
 * Plan type definition - determines pricing model
 */
export interface PlanType {
  /** Unique code (e.g., "per_user", "per_contract", "per_family") */
  code: string;
  /** Display label (e.g., "Per User", "Per Contract") */
  label: string;
  /** Primary metric for this plan type (e.g., "users", "contracts") */
  metric?: string;
  /** Description for tooltips */
  description?: string;
}

// ============================================================================
// FEATURES
// ============================================================================

/**
 * Feature type determines how it's configured in plan creation
 */
export type FeatureType = 'limit' | 'addon' | 'boolean' | 'usage';

/**
 * Feature definition - a capability that can be configured per plan
 */
export interface Feature {
  /** Unique identifier (e.g., "contacts", "contracts", "vani") */
  id: string;
  /** Display name (e.g., "Contacts", "VaNi AI") */
  name: string;
  /** Description for tooltips/help */
  description?: string;
  /**
   * Feature type:
   * - limit: Numeric limit per tier (e.g., Contacts: 50, 100, 200)
   * - addon: Optional add-on with separate pricing (e.g., VaNi AI: ₹5000/month)
   * - boolean: On/off feature (e.g., Portfolio Tracking: true/false)
   * - usage: Pay-per-use with unit pricing (e.g., AI Reports: ₹50 each)
   */
  type: FeatureType;
  /** Default value for paid plans */
  default: number | boolean;
  /** Value during trial period */
  trial: number | boolean;
  /** Unit label for display (e.g., "users", "GB", "contracts") */
  unit?: string;
  /** Base price for addon type features */
  base_price?: number;
  /** Price per unit for usage type features */
  unit_price?: number;
  /** Currency code (e.g., "INR", "USD") */
  currency?: string;
}

// ============================================================================
// TIER TEMPLATES
// ============================================================================

/**
 * Tier template - defines default tier ranges for a plan type
 */
export interface TierTemplate {
  /** Minimum value (inclusive) */
  min: number;
  /** Maximum value (inclusive), null = unlimited */
  max: number | null;
  /** Optional custom label (e.g., "1-10 users", "Enterprise") */
  label?: string;
  /** Optional base price for subscription_usage type */
  base_price?: number;
}

// ============================================================================
// NOTIFICATIONS
// ============================================================================

/**
 * Notification channel configuration
 */
export interface NotificationConfig {
  /** Channel identifier (e.g., "whatsapp", "sms", "email", "inapp") */
  channel: string;
  /** Display name (e.g., "WhatsApp Notifications") */
  name: string;
  /** Description */
  description?: string;
  /** Price per notification credit */
  unit_price: number;
  /** Default credits included per user/contract */
  default_credits: number;
  /** Currency code */
  currency?: string;
}

// ============================================================================
// FREE TIER
// ============================================================================

/**
 * Free tier configuration (for products like FamilyKnows)
 */
export interface FreeTierConfig {
  /** Whether free tier is enabled */
  enabled: boolean;
  /** Limits for free tier */
  limits: Record<string, number>;
}

// ============================================================================
// BILLING CONFIG (Main Structure)
// ============================================================================

/**
 * Complete billing configuration for a product
 * Stored in t_bm_product_config.billing_config
 */
export interface BillingConfig {
  /** Available plan types for this product */
  plan_types: PlanType[];
  /** Features that can be configured per plan */
  features: Feature[];
  /** Default tier ranges keyed by plan_type code */
  tier_templates: Record<string, TierTemplate[]>;
  /** Notification channel configurations */
  notifications: NotificationConfig[];
  /** Available trial duration options (in days) */
  trial_options: number[];
  /** Available billing cycles */
  billing_cycles: ('monthly' | 'quarterly' | 'annual')[];
  /** Default trial duration */
  default_trial_days?: number;
  /** Default billing cycle */
  default_billing_cycle?: string;
  /** Free tier configuration (optional) */
  free_tier?: FreeTierConfig;
}

// ============================================================================
// PRODUCT CONFIG
// ============================================================================

/**
 * Complete product configuration record
 */
export interface ProductConfig {
  /** Product identifier (e.g., "contractnest", "familyknows") */
  product_code: string;
  /** Display name (e.g., "ContractNest", "FamilyKnows") */
  product_name: string;
  /** Configuration version (e.g., "1.0", "1.1") */
  config_version: string;
  /** Full billing configuration */
  billing_config: BillingConfig;
  /** Whether this config is active */
  is_active: boolean;
  /** Last update timestamp */
  updated_at?: string;
}

/**
 * Summary of a product config (for list views)
 */
export interface ProductConfigSummary {
  product_code: string;
  product_name: string;
  config_version: string;
  is_active: boolean;
  updated_at?: string;
  plan_types?: PlanType[];
  feature_count?: number;
}

/**
 * History entry for product config version
 */
export interface ProductConfigHistoryEntry {
  id: string;
  config_version: string;
  changelog?: string;
  created_at: string;
  created_by?: string;
}

// ============================================================================
// API RESPONSES
// ============================================================================

/**
 * Response from GET /api/v1/product-config
 */
export interface ListProductConfigsResponse {
  success: boolean;
  products: ProductConfigSummary[];
  count: number;
}

/**
 * Response from GET /api/v1/product-config/:productCode
 */
export interface GetProductConfigResponse {
  success: boolean;
  product_code?: string;
  product_name?: string;
  config_version?: string;
  billing_config?: BillingConfig;
  is_active?: boolean;
  updated_at?: string;
  error?: string;
}

/**
 * Response from GET /api/v1/product-config/:productCode/history
 */
export interface GetProductConfigHistoryResponse {
  success: boolean;
  product_code: string;
  history: ProductConfigHistoryEntry[];
  count: number;
}

/**
 * Request body for PUT /api/v1/product-config/:productCode
 */
export interface UpdateProductConfigRequest {
  billing_config: BillingConfig;
  changelog?: string;
}

/**
 * Response from PUT /api/v1/product-config/:productCode
 */
export interface UpdateProductConfigResponse {
  success: boolean;
  message?: string;
  product_code?: string;
  config_version?: string;
  previous_version?: string;
  error?: string;
}

// ============================================================================
// HELPER TYPES
// ============================================================================

/**
 * Extract limit features from a billing config
 */
export function getLimitFeatures(config: BillingConfig): Feature[] {
  return config.features.filter(f => f.type === 'limit');
}

/**
 * Extract addon features from a billing config
 */
export function getAddonFeatures(config: BillingConfig): Feature[] {
  return config.features.filter(f => f.type === 'addon');
}

/**
 * Extract boolean features from a billing config
 */
export function getBooleanFeatures(config: BillingConfig): Feature[] {
  return config.features.filter(f => f.type === 'boolean');
}

/**
 * Extract usage features from a billing config
 */
export function getUsageFeatures(config: BillingConfig): Feature[] {
  return config.features.filter(f => f.type === 'usage');
}

/**
 * Get tier templates for a specific plan type
 */
export function getTierTemplates(config: BillingConfig, planTypeCode: string): TierTemplate[] {
  return config.tier_templates[planTypeCode] || [];
}
