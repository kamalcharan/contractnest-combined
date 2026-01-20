// src/utils/catalog-studio/catBlockAdapter.ts
// Production-ready adapter to convert between API CatBlock and UI Block types
// Properly maps ALL fields to database schema

import { CatBlock } from '@/hooks/queries/useCatBlocks';
import { Block } from '@/types/catalogStudio';

// =================================================================
// TYPE DEFINITIONS FOR DATABASE SCHEMA
// =================================================================

// Pricing record from PricingStep
interface PricingRecord {
  id: string;
  currency: string;
  amount: number;
  price_type: 'fixed' | 'hourly' | 'per_unit' | 'price_range';
  tax_inclusion: 'inclusive' | 'exclusive';
  taxes: Array<{ id: string; name: string; rate: number }>;
  billing_cycle?: string;
  is_active: boolean;
}

// Resource pricing record for resource-based pricing
interface ResourcePricingRecord {
  id: string;
  resourceTypeId: string;
  resourceTypeName: string;
  currency: string;
  pricePerUnit: number;
  pricingModel: 'hourly' | 'per_unit' | 'fixed';
  tax_inclusion: 'inclusive' | 'exclusive';
  taxes: Array<{ id: string; name: string; rate: number }>;
}

// Selected resource from ResourceDependencyStep
interface SelectedResource {
  resource_id: string;
  resource_type_id: string;
  resource_name: string;
  quantity: number;
  is_required: boolean;
}

// =================================================================
// ICON MAPPING
// =================================================================

const getDefaultIcon = (blockType: string | null): string => {
  const iconMap: Record<string, string> = {
    service: 'Wrench',
    spare: 'Package',
    billing: 'CreditCard',
    text: 'FileText',
    video: 'Video',
    image: 'Image',
    checklist: 'CheckSquare',
    document: 'FileCheck',
  };
  return iconMap[blockType || ''] || 'Circle';
};

// =================================================================
// API TO UI CONVERSION
// =================================================================

/**
 * Convert API CatBlock to UI Block format
 * Handles all block types and pricing modes
 * Uses block_type_name (from edge function enrichment) for proper matching
 */
export const catBlockToBlock = (catBlock: CatBlock): Block => {
  const config = catBlock.config || {};

  // Determine block type - check multiple fields for backward compatibility
  // Priority: block_type_name > type > category > default to 'service'
  // Note: block_type_id is a UUID, so we skip it and default to 'service' if others are missing
  const blockType = catBlock.block_type_name || catBlock.type || (catBlock as any).category || 'service';

  // Extract pricing info from the correct locations
  const pricingRecords = config.pricingRecords as PricingRecord[] | undefined;
  const primaryPricing = pricingRecords?.[0];

  return {
    id: catBlock.id,
    categoryId: blockType, // Uses 'service', 'spare', etc. instead of UUID
    name: catBlock.name,
    icon: catBlock.icon || config.icon || getDefaultIcon(blockType),
    description: catBlock.description || '',
    // Price from top-level or config
    price: catBlock.base_price || primaryPricing?.amount || config.base_price,
    currency: catBlock.currency || primaryPricing?.currency || config.currency_id || 'INR',
    duration: config.duration?.value || config.duration,
    durationUnit: config.duration?.unit || config.duration_unit || 'minutes',
    tags: catBlock.tags || [],
    evidenceTags: config.evidence_types || [],
    usage: {
      templates: 0,
      contracts: 0,
    },
    meta: {
      // Status
      status: catBlock.status || 'active',
      is_admin: catBlock.is_admin ? 'true' : 'false',
      is_active: catBlock.is_active ? 'true' : 'false',
      visible: catBlock.visible ? 'true' : 'false',

      // Legacy pricing mode fields (for backwards compatibility)
      pricing_mode_id: catBlock.pricing_mode_id,
      pricing_mode_name: (catBlock as any).pricing_mode_name,

      // New pricing mode fields
      pricingMode: catBlock.pricing_mode || config.pricingMode || 'independent',
      priceType: catBlock.price_type || config.priceType || 'fixed',
      pricingRecords: pricingRecords,
      resourcePricingRecords: config.resourcePricingRecords,
      pricingTiers: config.pricingTiers,

      // Resource pricing (from DB)
      resource_pricing: catBlock.resource_pricing,
      variant_pricing: catBlock.variant_pricing,

      // Selected resources
      selectedResources: config.selectedResources,
      resourceTypes: config.resourceTypes,

      // Tax info
      taxRate: catBlock.tax_rate || config.tax_rate,
      taxInclusive: config.taxInclusive,

      // Service-specific
      deliveryMode: config.deliveryMode || config.location?.type,
      serviceCycles: config.serviceCycles,
      bufferTime: config.buffer || config.bufferTime,
      location: config.location,
      assignment: config.assignment,
      evidence: config.evidence,
      sla: config.sla,
      automation: config.automation,

      // Business rules
      followup: config.followup,
      warranty: config.warranty,
      cancellation: config.cancellation,
      reschedule: config.reschedule,
      autoApprove: config.autoApprove,
      requiresOTP: config.requiresOTP,
      requiresDeposit: config.requiresDeposit,
      depositPercentage: config.depositPercentage,

      // Spare-specific
      sku: config.sku,
      hsn: config.hsn,
      brand: config.brand,
      uom: config.uom,
      barcode: config.barcode,
      inventory: config.inventory,
      stockQty: config.inventory?.current,
      reorderLevel: config.inventory?.reorder_level,
      trackInventory: config.inventory?.track,
      fulfillment: config.fulfillment,
      warehouseLocation: config.warehouseLocation,
      spareCategory: config.spareCategory,

      // Billing-specific
      paymentType: config.payment_type || config.paymentType,
      installments: config.installments,
      numInstallments: config.installments,
      numMilestones: config.installments,
      recurringFrequency: config.frequency || config.billing_frequency,
      schedule: config.schedule,
      autoInvoice: config.auto_invoice || config.autoInvoice,
      lateFee: config.late_fee || config.lateFee,
      paymentMethods: config.payment_methods || config.paymentMethods,
      upfrontPercent: config.upfront_percent,

      // Text/Content-specific
      content: config.content,
      contentType: config.content_type || config.contentType,
      requireAcceptance: config.require_acceptance || config.requireAcceptance,
      acceptanceLabel: config.acceptance_label || config.acceptanceLabel,
      variables: config.variables,

      // Checklist-specific
      items: config.items,
      requireAll: config.require_all || config.requireAll,
      allowNotes: config.allow_notes || config.allowNotes,

      // Media-specific
      mediaUrl: config.media_url || config.mediaUrl,
      thumbnailUrl: config.thumbnail_url || config.thumbnailUrl,
      displaySettings: config.displaySettings,

      // Document-specific
      fileUrl: config.file_url,
      fileType: config.file_type,
      fileSize: config.file_size,
      allowDownload: config.allow_download,
      requireSignature: config.require_signature,

      // Terms
      terms: config.terms,

      // Image
      image_url: config.image_url,

      // Timestamps
      created_at: catBlock.created_at,
      updated_at: catBlock.updated_at,

      // Store original UUIDs for API calls
      block_type_id_uuid: catBlock.block_type_id,
    },
    // Store config for edit/duplicate operations
    config: config,
    // Store pricing mode for operations
    pricingMode: (catBlock as any).pricing_mode_name || catBlock.pricing_mode || catBlock.pricing_mode_id,
  };
};

/**
 * Convert multiple CatBlocks to Blocks
 */
export const catBlocksToBlocks = (catBlocks: CatBlock[]): Block[] => {
  return catBlocks.map(catBlockToBlock);
};

// =================================================================
// UI TO API CONVERSION - CREATE
// =================================================================

/**
 * Helper to get value from block (checks both top-level and meta)
 * Wizard steps set data at top-level, but existing blocks have data in meta
 */
const getField = (block: Partial<Block>, field: string): unknown => {
  const topLevel = (block as Record<string, unknown>)[field];
  if (topLevel !== undefined) return topLevel;
  return block.meta?.[field];
};

/**
 * Build config JSONB for SERVICE block
 * Checks both top-level fields (from wizard) and meta fields (from existing blocks)
 */
const buildServiceConfig = (block: Partial<Block>): Record<string, unknown> => {
  const config: Record<string, unknown> = {};

  // Icon (also saved at top level)
  if (block.icon) config.icon = block.icon;

  // Duration - check both locations
  const duration = getField(block, 'duration') || block.duration;
  const durationUnit = getField(block, 'durationUnit') || block.durationUnit;
  if (duration) {
    config.duration = {
      value: duration,
      unit: durationUnit || 'minutes',
    };
  }

  // Buffer time
  const bufferTime = getField(block, 'bufferTime') || getField(block, 'schedulingBuffer');
  if (bufferTime) config.buffer = bufferTime;

  // Location/Delivery mode - wizard sets at top level
  const deliveryMode = getField(block, 'deliveryMode');
  const location = getField(block, 'location');
  if (deliveryMode || location) {
    config.location = location || {
      type: deliveryMode || 'onsite',
      onsite_config: deliveryMode === 'on-site' || deliveryMode === 'onsite' || deliveryMode === 'hybrid' ? {
        require_gps: getField(block, 'requiresGPS') || false,
      } : undefined,
      virtual_config: deliveryMode === 'virtual' || deliveryMode === 'hybrid' ? {
        platform: getField(block, 'virtualPlatform') || 'zoom',
      } : undefined,
    };
    config.deliveryMode = deliveryMode;
  }

  // Service cycles - wizard sets requiresCycles, cycleDays, cycleGracePeriod
  const requiresCycles = getField(block, 'requiresCycles');
  const cycleDays = getField(block, 'cycleDays');
  const serviceCycles = getField(block, 'serviceCycles');
  if (requiresCycles || serviceCycles) {
    config.serviceCycles = serviceCycles || {
      enabled: requiresCycles,
      days: cycleDays,
      gracePeriod: getField(block, 'cycleGracePeriod'),
    };
  }

  // Assignment
  const assignment = getField(block, 'assignment');
  if (assignment) config.assignment = assignment;

  // Evidence configuration - wizard sets evidenceRequired, evidenceTypes
  const evidenceRequired = getField(block, 'evidenceRequired');
  const evidenceTypes = getField(block, 'evidenceTypes') || block.evidenceTags;
  const evidence = getField(block, 'evidence');
  if (evidence || evidenceTypes?.length || evidenceRequired) {
    config.evidence = evidence || (evidenceTypes || []).map((type: string) => ({
      type,
      config: { required: true },
    }));
    config.evidence_types = evidenceTypes;
    config.evidenceRequired = evidenceRequired;
  }

  // OTP requirement
  const requiresOTP = getField(block, 'requiresOTP');
  if (requiresOTP !== undefined) {
    config.requiresOTP = requiresOTP;
    config.otpConfig = getField(block, 'otpConfig');
  }

  // SLA
  const sla = getField(block, 'sla');
  if (sla) config.sla = sla;

  // Automation
  const automation = getField(block, 'automation');
  if (automation) config.automation = automation;

  // Business rules - wizard sets these at top level
  const followup = getField(block, 'followup');
  const warranty = getField(block, 'warranty');
  const cancellation = getField(block, 'cancellation');
  const reschedule = getField(block, 'reschedule') || getField(block, 'allowReschedule');
  const autoApprove = getField(block, 'autoApprove');
  const requiresDeposit = getField(block, 'requiresDeposit');

  if (followup) config.followup = followup;
  if (warranty) config.warranty = warranty;
  if (cancellation) config.cancellation = cancellation;
  if (reschedule !== undefined) config.reschedule = reschedule;
  if (autoApprove !== undefined) config.autoApprove = autoApprove;
  if (requiresDeposit !== undefined) {
    config.requiresDeposit = requiresDeposit;
    config.depositPercentage = getField(block, 'depositPercentage');
  }

  // Pricing mode and records - wizard may set at top level
  const pricingMode = getField(block, 'pricingMode');
  const priceType = getField(block, 'priceType');
  const pricingRecords = getField(block, 'pricingRecords');
  const resourcePricingRecords = getField(block, 'resourcePricingRecords');
  const pricingTiers = getField(block, 'pricingTiers');

  if (pricingMode) config.pricingMode = pricingMode;
  if (priceType) config.priceType = priceType;
  if (pricingRecords) config.pricingRecords = pricingRecords;
  if (resourcePricingRecords) config.resourcePricingRecords = resourcePricingRecords;
  if (pricingTiers) config.pricingTiers = pricingTiers;

  // Selected resources (from ResourceDependencyStep) - wizard sets at top level
  const selectedResources = getField(block, 'selectedResources');
  const resourceTypes = getField(block, 'resourceTypes');
  if (selectedResources) config.selectedResources = selectedResources;
  if (resourceTypes) config.resourceTypes = resourceTypes;

  // Terms
  const terms = getField(block, 'terms');
  if (terms) config.terms = terms;

  // Image
  const imageUrl = getField(block, 'image_url') || getField(block, 'imageUrl');
  if (imageUrl) config.image_url = imageUrl;

  return config;
};

/**
 * Build config JSONB for SPARE block
 * Checks both top-level fields (from wizard) and meta fields (from existing blocks)
 */
const buildSpareConfig = (block: Partial<Block>): Record<string, unknown> => {
  const config: Record<string, unknown> = {};

  // Icon
  if (block.icon) config.icon = block.icon;

  // Product identification - wizard sets these at top level
  const sku = getField(block, 'sku');
  const hsn = getField(block, 'hsn');
  const brand = getField(block, 'brand');
  const uom = getField(block, 'uom');
  const barcode = getField(block, 'barcode');

  if (sku) config.sku = sku;
  if (hsn) config.hsn = hsn;
  if (brand) config.brand = brand;
  if (uom) config.uom = uom;
  if (barcode) config.barcode = barcode;

  // Inventory - wizard sets trackInventory, stockQty, reorderLevel
  const trackInventory = getField(block, 'trackInventory');
  const stockQty = getField(block, 'stockQty') || getField(block, 'stockQuantity');
  const reorderLevel = getField(block, 'reorderLevel');
  const inventory = getField(block, 'inventory');

  config.inventory = inventory || {
    track: trackInventory !== false,
    current: stockQty || 0,
    reorder_level: reorderLevel || 5,
    reorder_qty: getField(block, 'reorderQty') || 10,
    alert_on_low: getField(block, 'alertOnLow') !== false,
  };

  // Fulfillment - wizard sets includeInService, allowPickup, allowShipping
  const fulfillment = getField(block, 'fulfillment');
  const includeInService = getField(block, 'includeInService');
  const allowPickup = getField(block, 'allowPickup');
  const allowShipping = getField(block, 'allowShipping');

  if (fulfillment) {
    config.fulfillment = fulfillment;
  } else if (includeInService !== undefined || allowPickup !== undefined || allowShipping !== undefined) {
    config.fulfillment = {
      include_in_service: includeInService !== false,
      pickup: allowPickup || false,
      ship: allowShipping || false,
    };
  }

  // Warranty
  const warranty = getField(block, 'warranty');
  const warrantyMonths = getField(block, 'warrantyMonths');
  if (warranty) {
    config.warranty = warranty;
  } else if (warrantyMonths) {
    config.warranty = {
      months: warrantyMonths,
      type: getField(block, 'warrantyType') || 'manufacturing_defect',
    };
  }

  // Warehouse location
  const warehouseLocation = getField(block, 'warehouseLocation');
  if (warehouseLocation) config.warehouseLocation = warehouseLocation;

  // Category
  const spareCategory = getField(block, 'spareCategory');
  if (spareCategory) config.spareCategory = spareCategory;

  // Pricing records
  const pricingRecords = getField(block, 'pricingRecords');
  const priceType = getField(block, 'priceType');
  if (pricingRecords) config.pricingRecords = pricingRecords;
  if (priceType) config.priceType = priceType;

  // Terms
  const terms = getField(block, 'terms');
  if (terms) config.terms = terms;

  // Image
  const imageUrl = getField(block, 'image_url') || getField(block, 'imageUrl');
  if (imageUrl) config.image_url = imageUrl;

  return config;
};

/**
 * Build config JSONB for BILLING block
 * Checks both top-level fields (from wizard) and meta fields (from existing blocks)
 */
const buildBillingConfig = (block: Partial<Block>): Record<string, unknown> => {
  const config: Record<string, unknown> = {};

  // Icon
  if (block.icon) config.icon = block.icon;

  // Payment type - wizard sets at top level
  const paymentType = getField(block, 'paymentType');
  config.payment_type = paymentType || 'upfront';

  // Structure based on payment type
  if (paymentType === 'emi' || paymentType === 'milestone') {
    config.installments = getField(block, 'numInstallments') || getField(block, 'numMilestones') || 3;
    config.frequency = getField(block, 'recurringFrequency') || 'monthly';
  }

  // Schedule
  const schedule = getField(block, 'schedule');
  if (schedule) config.schedule = schedule;

  // Auto invoice
  const autoInvoice = getField(block, 'autoInvoice');
  config.auto_invoice = autoInvoice !== false;

  // Late fee
  const lateFee = getField(block, 'lateFee');
  if (lateFee) config.late_fee = lateFee;

  // Payment methods
  const paymentMethods = getField(block, 'paymentMethods');
  if (paymentMethods) config.payment_methods = paymentMethods;

  // Billing frequency for recurring
  const recurringFrequency = getField(block, 'recurringFrequency');
  if (recurringFrequency) config.billing_frequency = recurringFrequency;

  // Upfront percentage
  const upfrontPercent = getField(block, 'upfrontPercent');
  if (upfrontPercent) config.upfront_percent = upfrontPercent;

  return config;
};

/**
 * Build config JSONB for TEXT block
 * Checks both top-level fields (from wizard) and meta fields (from existing blocks)
 */
const buildTextConfig = (block: Partial<Block>): Record<string, unknown> => {
  const config: Record<string, unknown> = {};

  // Icon
  if (block.icon) config.icon = block.icon;

  // Content - wizard sets at top level
  config.content = getField(block, 'content') || '';
  config.content_type = getField(block, 'contentType') || 'rich';

  // Acceptance
  const requireAcceptance = getField(block, 'requireAcceptance');
  if (requireAcceptance) {
    config.require_acceptance = true;
    config.acceptance_label = getField(block, 'acceptanceLabel') || 'I agree';
  }

  // Variables
  const variables = getField(block, 'variables');
  if (variables) config.variables = variables;

  return config;
};

/**
 * Build config JSONB for CHECKLIST block
 * Checks both top-level fields (from wizard) and meta fields (from existing blocks)
 */
const buildChecklistConfig = (block: Partial<Block>): Record<string, unknown> => {
  const config: Record<string, unknown> = {};

  // Icon
  if (block.icon) config.icon = block.icon;

  // Items - wizard sets at top level
  config.items = getField(block, 'items') || [];

  // Settings
  const requireAll = getField(block, 'requireAll');
  const allowNotes = getField(block, 'allowNotes');
  config.require_all = requireAll !== false;
  config.allow_notes = allowNotes !== false;

  return config;
};

/**
 * Build config JSONB for MEDIA (video/image) block
 * Checks both top-level fields (from wizard) and meta fields (from existing blocks)
 */
const buildMediaConfig = (block: Partial<Block>): Record<string, unknown> => {
  const config: Record<string, unknown> = {};

  // Icon
  if (block.icon) config.icon = block.icon;

  // Media URLs - wizard sets at top level
  const mediaUrl = getField(block, 'mediaUrl');
  const thumbnailUrl = getField(block, 'thumbnailUrl');
  const imageUrl = getField(block, 'image_url') || getField(block, 'imageUrl');

  if (mediaUrl) config.media_url = mediaUrl;
  if (thumbnailUrl) config.thumbnail_url = thumbnailUrl;
  if (imageUrl) config.image_url = imageUrl;

  // Display settings
  const displaySettings = getField(block, 'displaySettings');
  if (displaySettings) config.displaySettings = displaySettings;

  return config;
};

/**
 * Build config JSONB for DOCUMENT block
 * Checks both top-level fields (from wizard) and meta fields (from existing blocks)
 */
const buildDocumentConfig = (block: Partial<Block>): Record<string, unknown> => {
  const config: Record<string, unknown> = {};

  // Icon
  if (block.icon) config.icon = block.icon;

  // File settings - wizard sets at top level
  const fileUrl = getField(block, 'fileUrl');
  const fileType = getField(block, 'fileType');
  const fileSize = getField(block, 'fileSize');
  const allowDownload = getField(block, 'allowDownload');
  const requireSignature = getField(block, 'requireSignature');

  if (fileUrl) config.file_url = fileUrl;
  if (fileType) config.file_type = fileType;
  if (fileSize) config.file_size = fileSize;
  if (allowDownload !== undefined) config.allow_download = allowDownload;
  if (requireSignature !== undefined) config.require_signature = requireSignature;

  return config;
};

/**
 * Build the appropriate config based on block type
 */
const buildConfig = (block: Partial<Block>, blockType: string): Record<string, unknown> => {
  switch (blockType) {
    case 'service':
      return buildServiceConfig(block);
    case 'spare':
      return buildSpareConfig(block);
    case 'billing':
      return buildBillingConfig(block);
    case 'text':
      return buildTextConfig(block);
    case 'video':
    case 'image':
      return buildMediaConfig(block);
    case 'checklist':
      return buildChecklistConfig(block);
    case 'document':
      return buildDocumentConfig(block);
    default:
      return { icon: block.icon };
  }
};

/**
 * Extract primary price from pricing records or direct fields
 * Checks both top-level (wizard) and meta (existing blocks) fields
 */
const extractPrimaryPrice = (block: Partial<Block>): { price?: number; currency?: string } => {
  // First check pricingRecords - can be at top-level (wizard) or meta (existing)
  const pricingRecords = getField(block, 'pricingRecords') as PricingRecord[] | undefined;

  if (pricingRecords && pricingRecords.length > 0) {
    const primary = pricingRecords.find(r => r.is_active) || pricingRecords[0];
    return {
      price: primary.amount,
      currency: primary.currency,
    };
  }

  // Check direct price fields - wizard may set at top level
  const directPrice = getField(block, 'price') as number | undefined;
  const basePrice = getField(block, 'basePrice') as number | undefined;
  const directCurrency = getField(block, 'currency') as string | undefined;

  return {
    price: directPrice ?? basePrice ?? block.price,
    currency: directCurrency ?? block.currency ?? 'INR',
  };
};

/**
 * Build resource_pricing JSONB for resource-based blocks
 * Checks both top-level (wizard) and meta (existing blocks) fields
 */
const buildResourcePricing = (block: Partial<Block>): Record<string, unknown> | undefined => {
  // Check pricingMode from both locations
  const pricingMode = getField(block, 'pricingMode') as string;

  if (pricingMode !== 'resource_based') return undefined;

  // Check selectedResources from both locations
  const selectedResources = getField(block, 'selectedResources') as SelectedResource[] | undefined;
  const resourcePricingRecords = getField(block, 'resourcePricingRecords') as ResourcePricingRecord[] | undefined;

  if (!selectedResources || selectedResources.length === 0) return undefined;

  // Group by resource type
  const resourceTypeId = selectedResources[0]?.resource_type_id;

  return {
    resource_type_id: resourceTypeId,
    label: 'Select Resource',
    required: true,
    allow_any: false,
    selection_time: 'contract',
    options: selectedResources.map(sr => {
      const pricing = resourcePricingRecords?.find(rp => rp.resourceTypeId === sr.resource_type_id);
      return {
        resource_id: sr.resource_id,
        name: sr.resource_name,
        price: pricing?.pricePerUnit || 0,
        currency: pricing?.currency || 'INR',
      };
    }),
  };
};

/**
 * Options for block creation/update
 */
interface BlockOperationOptions {
  userId?: string;
  sequenceNo?: number;
  isLive?: boolean;
}

/**
 * Convert UI Block data to API CreateBlockData format
 * Maps ALL fields properly to database schema
 * Reads from both top-level (wizard) and meta (existing blocks)
 * Sends string block_type_id like 'service' - edge function will resolve to UUID
 */
export const blockToCreateData = (
  block: Partial<Block> & { name: string },
  options: BlockOperationOptions = {}
) => {
  const blockType = block.categoryId || 'service';
  const { price, currency } = extractPrimaryPrice(block);

  // Get pricing mode - check both top-level and meta
  const pricingMode = getField(block, 'pricingMode') as string || 'independent';

  // Get price type - check both top-level and meta
  const pricingRecords = getField(block, 'pricingRecords') as PricingRecord[] | undefined;
  const priceType = getField(block, 'priceType') as string || pricingRecords?.[0]?.price_type || 'fixed';

  // Map price_type to DB enum values
  const dbPriceType = priceType === 'hourly' ? 'per_hour' : priceType === 'fixed' ? 'per_session' : priceType;

  // Get status - check both top-level and meta
  const status = getField(block, 'status') as string || 'active';

  // Get tax rate
  const taxRate = getField(block, 'taxRate') as number || 18.00;

  // Get visibility
  const visible = getField(block, 'visible');
  const isAdmin = getField(block, 'is_admin');

  // Get HSN/SAC code for spare parts
  const hsnSacCode = getField(block, 'hsn') as string || getField(block, 'hsnSacCode') as string;

  return {
    // Required fields
    name: block.name,
    type: blockType,  // Correct field name for DB
    // Note: block_type_id expects UUID - let API/edge resolve it from 'type'
    category: blockType, // Category field (same as block type)

    // Optional top-level fields
    display_name: block.name,
    icon: block.icon || getDefaultIcon(blockType),
    description: block.description || '',
    tags: block.tags || [],

    // Pricing at top level (for independent mode)
    // Note: pricing_mode_id expects UUID - store pricingMode in config instead
    base_price: price,
    currency: currency || 'INR',
    // NOTE: price_type_id expects UUID - store in config instead
    // NOTE: status_id expects UUID - store in config instead

    // Tax
    tax_rate: taxRate,
    hsn_sac_code: hsnSacCode || '', // Must be string, not null

    // Resource pricing (for resource_based mode)
    resource_pricing: buildResourcePricing(block),

    // Visibility
    visible: visible !== 'false' && visible !== false,
    is_admin: isAdmin === 'true' || isAdmin === true,

    // Ordering
    sequence_no: options.sequenceNo ?? 0,

    // Environment
    is_live: options.isLive ?? true,

    // Audit fields
    created_by: options.userId || null,
    updated_by: options.userId || null,

    // Type-specific config (includes priceType and status as strings)
    config: {
      ...buildConfig(block, blockType),
      priceType: priceType,  // Store as string in config
      status: status,        // Store as string in config
    },
  };
};

/**
 * Convert UI Block updates to API UpdateBlockData format
 * Only includes changed fields
 */
export const blockToUpdateData = (
  updates: Partial<Block>,
  options: BlockOperationOptions = {}
) => {
  const data: Record<string, unknown> = {};
  const meta = updates.meta || {};

  // Basic fields
  if (updates.name !== undefined) data.name = updates.name;
  if (updates.description !== undefined) data.description = updates.description;
  if (updates.icon !== undefined) data.icon = updates.icon;
  if (updates.tags !== undefined) data.tags = updates.tags;

  // Type change (rare but possible)
  if (updates.categoryId !== undefined) {
    data.type = updates.categoryId;
    data.block_type_id = updates.categoryId;
    data.category = updates.categoryId;
  }

  // Pricing mode (edge expects pricing_mode_id)
  if (meta.pricingMode !== undefined) {
    data.pricing_mode_id = meta.pricingMode;
  }

  // Price updates
  const { price, currency } = extractPrimaryPrice(updates);
  if (price !== undefined) data.base_price = price;
  if (currency !== undefined) data.currency = currency;

  // NOTE: price_type_id expects UUID - store in config instead
  // NOTE: status_id expects UUID - store in config instead

  // Tax rate
  if (meta.taxRate !== undefined) data.tax_rate = meta.taxRate;

  // HSN/SAC code
  const hsnSacCode = getField(updates, 'hsn') || getField(updates, 'hsnSacCode');
  if (hsnSacCode !== undefined) data.hsn_sac_code = hsnSacCode;

  // Audit field
  if (options.userId) data.updated_by = options.userId;

  // Visibility
  if (meta.visible !== undefined) data.visible = meta.visible !== 'false';

  // Resource pricing
  const resourcePricing = buildResourcePricing(updates);
  if (resourcePricing) data.resource_pricing = resourcePricing;

  // Config updates - rebuild entire config if any meta changes
  if (Object.keys(meta).length > 0 && updates.categoryId) {
    data.config = buildConfig(updates, updates.categoryId);
  } else if (Object.keys(meta).length > 0) {
    // Partial config update - merge with existing
    const configUpdates: Record<string, unknown> = {};

    // Common config fields
    if (updates.icon !== undefined) configUpdates.icon = updates.icon;
    if (updates.duration !== undefined) {
      configUpdates.duration = {
        value: updates.duration,
        unit: updates.durationUnit || 'minutes',
      };
    }
    if (updates.evidenceTags !== undefined) configUpdates.evidence_types = updates.evidenceTags;

    // Meta fields that go into config
    if (meta.pricingRecords !== undefined) configUpdates.pricingRecords = meta.pricingRecords;
    if (meta.resourcePricingRecords !== undefined) configUpdates.resourcePricingRecords = meta.resourcePricingRecords;
    if (meta.priceType !== undefined) configUpdates.priceType = meta.priceType;
    if (meta.pricingMode !== undefined) configUpdates.pricingMode = meta.pricingMode;
    if (meta.status !== undefined) configUpdates.status = meta.status; // Store in config as string
    if (meta.selectedResources !== undefined) configUpdates.selectedResources = meta.selectedResources;
    if (meta.resourceTypes !== undefined) configUpdates.resourceTypes = meta.resourceTypes;
    if (meta.deliveryMode !== undefined) configUpdates.deliveryMode = meta.deliveryMode;
    if (meta.serviceCycles !== undefined) configUpdates.serviceCycles = meta.serviceCycles;
    if (meta.bufferTime !== undefined) configUpdates.buffer = meta.bufferTime;
    if (meta.terms !== undefined) configUpdates.terms = meta.terms;

    // Business rules
    if (meta.followup !== undefined) configUpdates.followup = meta.followup;
    if (meta.warranty !== undefined) configUpdates.warranty = meta.warranty;
    if (meta.cancellation !== undefined) configUpdates.cancellation = meta.cancellation;
    if (meta.reschedule !== undefined) configUpdates.reschedule = meta.reschedule;
    if (meta.autoApprove !== undefined) configUpdates.autoApprove = meta.autoApprove;
    if (meta.requiresOTP !== undefined) configUpdates.requiresOTP = meta.requiresOTP;

    // Spare-specific
    if (meta.sku !== undefined) configUpdates.sku = meta.sku;
    if (meta.inventory !== undefined) configUpdates.inventory = meta.inventory;
    if (meta.fulfillment !== undefined) configUpdates.fulfillment = meta.fulfillment;

    // Billing-specific
    if (meta.paymentType !== undefined) configUpdates.payment_type = meta.paymentType;
    if (meta.schedule !== undefined) configUpdates.schedule = meta.schedule;

    // Content-specific
    if (meta.content !== undefined) configUpdates.content = meta.content;
    if (meta.contentType !== undefined) configUpdates.content_type = meta.contentType;

    // Checklist-specific
    if (meta.items !== undefined) configUpdates.items = meta.items;

    if (Object.keys(configUpdates).length > 0) {
      data.config = configUpdates;
    }
  }

  return data;
};

/**
 * Create a template block from a Block
 * Used when adding blocks to templates
 */
export const createTemplateBlock = (block: Block, order: number) => {
  return {
    block_id: block.id,
    order: order,
    config: {
      visible: true,
      price: block.price,
      duration: block.duration,
    },
  };
};

// =================================================================
// EXPORTS
// =================================================================

export default {
  catBlockToBlock,
  catBlocksToBlocks,
  blockToCreateData,
  blockToUpdateData,
  createTemplateBlock,
};
