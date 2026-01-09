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

  // Determine block type - use enriched block_type_name, or type, or block_type_id
  const blockType = catBlock.block_type_name || catBlock.type || catBlock.block_type_id || 'service';

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
 * Build config JSONB for SERVICE block
 */
const buildServiceConfig = (block: Partial<Block>): Record<string, unknown> => {
  const meta = block.meta || {};
  const config: Record<string, unknown> = {};

  // Icon (also saved at top level)
  if (block.icon) config.icon = block.icon;

  // Duration
  if (block.duration || meta.duration) {
    config.duration = {
      value: block.duration || meta.duration,
      unit: block.durationUnit || meta.durationUnit || 'minutes',
    };
  }

  // Buffer time
  if (meta.bufferTime) config.buffer = meta.bufferTime;

  // Location/Delivery mode
  if (meta.deliveryMode || meta.location) {
    config.location = meta.location || {
      type: meta.deliveryMode || 'onsite',
      onsite_config: meta.deliveryMode === 'onsite' || meta.deliveryMode === 'hybrid' ? {
        require_gps: meta.requiresGPS || false,
      } : undefined,
      virtual_config: meta.deliveryMode === 'virtual' || meta.deliveryMode === 'hybrid' ? {
        platform: meta.virtualPlatform || 'zoom',
      } : undefined,
    };
    config.deliveryMode = meta.deliveryMode;
  }

  // Service cycles
  if (meta.serviceCycles) config.serviceCycles = meta.serviceCycles;

  // Assignment
  if (meta.assignment) config.assignment = meta.assignment;

  // Evidence configuration
  if (meta.evidence || block.evidenceTags?.length) {
    config.evidence = meta.evidence || (block.evidenceTags || []).map((type: string) => ({
      type,
      config: { required: true },
    }));
    config.evidence_types = block.evidenceTags;
  }

  // OTP requirement
  if (meta.requiresOTP !== undefined) {
    config.requiresOTP = meta.requiresOTP;
    config.otpConfig = meta.otpConfig;
  }

  // SLA
  if (meta.sla) config.sla = meta.sla;

  // Automation
  if (meta.automation) config.automation = meta.automation;

  // Business rules
  if (meta.followup) config.followup = meta.followup;
  if (meta.warranty) config.warranty = meta.warranty;
  if (meta.cancellation) config.cancellation = meta.cancellation;
  if (meta.reschedule) config.reschedule = meta.reschedule;
  if (meta.autoApprove !== undefined) config.autoApprove = meta.autoApprove;
  if (meta.requiresDeposit !== undefined) {
    config.requiresDeposit = meta.requiresDeposit;
    config.depositPercentage = meta.depositPercentage;
  }

  // Pricing mode and records
  if (meta.pricingMode) config.pricingMode = meta.pricingMode;
  if (meta.priceType) config.priceType = meta.priceType;
  if (meta.pricingRecords) config.pricingRecords = meta.pricingRecords;
  if (meta.resourcePricingRecords) config.resourcePricingRecords = meta.resourcePricingRecords;
  if (meta.pricingTiers) config.pricingTiers = meta.pricingTiers;

  // Selected resources (from ResourceDependencyStep)
  if (meta.selectedResources) config.selectedResources = meta.selectedResources;
  if (meta.resourceTypes) config.resourceTypes = meta.resourceTypes;

  // Terms
  if (meta.terms) config.terms = meta.terms;

  // Image
  if (meta.image_url) config.image_url = meta.image_url;

  return config;
};

/**
 * Build config JSONB for SPARE block
 */
const buildSpareConfig = (block: Partial<Block>): Record<string, unknown> => {
  const meta = block.meta || {};
  const config: Record<string, unknown> = {};

  // Icon
  if (block.icon) config.icon = block.icon;

  // Product identification
  if (meta.sku) config.sku = meta.sku;
  if (meta.hsn) config.hsn = meta.hsn;
  if (meta.brand) config.brand = meta.brand;
  if (meta.uom) config.uom = meta.uom || 'each';
  if (meta.barcode) config.barcode = meta.barcode;

  // Inventory
  config.inventory = {
    track: meta.trackInventory !== false,
    current: meta.stockQty || meta.stockQuantity || 0,
    reorder_level: meta.reorderLevel || 5,
    reorder_qty: meta.reorderQty || 10,
    alert_on_low: meta.alertOnLow !== false,
  };

  // Fulfillment
  if (meta.fulfillment) {
    config.fulfillment = meta.fulfillment;
  } else {
    config.fulfillment = {
      include_in_service: meta.includeInService !== false,
      pickup: meta.allowPickup || false,
      ship: meta.allowShipping || false,
    };
  }

  // Warranty
  if (meta.warranty) {
    config.warranty = meta.warranty;
  } else if (meta.warrantyMonths) {
    config.warranty = {
      months: meta.warrantyMonths,
      type: meta.warrantyType || 'manufacturing_defect',
    };
  }

  // Warehouse location
  if (meta.warehouseLocation) config.warehouseLocation = meta.warehouseLocation;

  // Category
  if (meta.spareCategory) config.spareCategory = meta.spareCategory;

  // Pricing records
  if (meta.pricingRecords) config.pricingRecords = meta.pricingRecords;
  if (meta.priceType) config.priceType = meta.priceType;

  // Terms
  if (meta.terms) config.terms = meta.terms;

  // Image
  if (meta.image_url) config.image_url = meta.image_url;

  return config;
};

/**
 * Build config JSONB for BILLING block
 */
const buildBillingConfig = (block: Partial<Block>): Record<string, unknown> => {
  const meta = block.meta || {};
  const config: Record<string, unknown> = {};

  // Icon
  if (block.icon) config.icon = block.icon;

  // Payment type
  config.payment_type = meta.paymentType || 'upfront';

  // Structure based on payment type
  if (meta.paymentType === 'emi' || meta.paymentType === 'milestone') {
    config.installments = meta.numInstallments || meta.numMilestones || 3;
    config.frequency = meta.recurringFrequency || 'monthly';
  }

  // Schedule
  if (meta.schedule) {
    config.schedule = meta.schedule;
  }

  // Auto invoice
  config.auto_invoice = meta.autoInvoice !== false;

  // Late fee
  if (meta.lateFee) {
    config.late_fee = meta.lateFee;
  }

  // Payment methods
  if (meta.paymentMethods) {
    config.payment_methods = meta.paymentMethods;
  }

  // Billing frequency for recurring
  if (meta.recurringFrequency) {
    config.billing_frequency = meta.recurringFrequency;
  }

  // Upfront percentage
  if (meta.upfrontPercent) {
    config.upfront_percent = meta.upfrontPercent;
  }

  return config;
};

/**
 * Build config JSONB for TEXT block
 */
const buildTextConfig = (block: Partial<Block>): Record<string, unknown> => {
  const meta = block.meta || {};
  const config: Record<string, unknown> = {};

  // Icon
  if (block.icon) config.icon = block.icon;

  // Content
  config.content = meta.content || '';
  config.content_type = meta.contentType || 'rich';

  // Acceptance
  if (meta.requireAcceptance) {
    config.require_acceptance = true;
    config.acceptance_label = meta.acceptanceLabel || 'I agree';
  }

  // Variables
  if (meta.variables) {
    config.variables = meta.variables;
  }

  return config;
};

/**
 * Build config JSONB for CHECKLIST block
 */
const buildChecklistConfig = (block: Partial<Block>): Record<string, unknown> => {
  const meta = block.meta || {};
  const config: Record<string, unknown> = {};

  // Icon
  if (block.icon) config.icon = block.icon;

  // Items
  config.items = meta.items || [];

  // Settings
  config.require_all = meta.requireAll !== false;
  config.allow_notes = meta.allowNotes !== false;

  return config;
};

/**
 * Build config JSONB for MEDIA (video/image) block
 */
const buildMediaConfig = (block: Partial<Block>): Record<string, unknown> => {
  const meta = block.meta || {};
  const config: Record<string, unknown> = {};

  // Icon
  if (block.icon) config.icon = block.icon;

  // Media URLs
  if (meta.mediaUrl) config.media_url = meta.mediaUrl;
  if (meta.thumbnailUrl) config.thumbnail_url = meta.thumbnailUrl;
  if (meta.image_url) config.image_url = meta.image_url;

  // Display settings
  if (meta.displaySettings) {
    config.displaySettings = meta.displaySettings;
  }

  return config;
};

/**
 * Build config JSONB for DOCUMENT block
 */
const buildDocumentConfig = (block: Partial<Block>): Record<string, unknown> => {
  const meta = block.meta || {};
  const config: Record<string, unknown> = {};

  // Icon
  if (block.icon) config.icon = block.icon;

  // File settings
  if (meta.fileUrl) config.file_url = meta.fileUrl;
  if (meta.fileType) config.file_type = meta.fileType;
  if (meta.fileSize) config.file_size = meta.fileSize;
  if (meta.allowDownload !== undefined) config.allow_download = meta.allowDownload;
  if (meta.requireSignature !== undefined) config.require_signature = meta.requireSignature;

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
 * Extract primary price from pricing records
 */
const extractPrimaryPrice = (block: Partial<Block>): { price?: number; currency?: string } => {
  const meta = block.meta || {};
  const pricingRecords = meta.pricingRecords as PricingRecord[] | undefined;

  if (pricingRecords && pricingRecords.length > 0) {
    const primary = pricingRecords.find(r => r.is_active) || pricingRecords[0];
    return {
      price: primary.amount,
      currency: primary.currency,
    };
  }

  return {
    price: block.price,
    currency: block.currency,
  };
};

/**
 * Build resource_pricing JSONB for resource-based blocks
 */
const buildResourcePricing = (block: Partial<Block>): Record<string, unknown> | undefined => {
  const meta = block.meta || {};
  const pricingMode = meta.pricingMode as string;

  if (pricingMode !== 'resource_based') return undefined;

  const selectedResources = meta.selectedResources as SelectedResource[] | undefined;
  const resourcePricingRecords = meta.resourcePricingRecords as ResourcePricingRecord[] | undefined;

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
 * Convert UI Block data to API CreateBlockData format
 * Maps ALL fields properly to database schema
 * Sends string block_type_id like 'service' - edge function will resolve to UUID
 */
export const blockToCreateData = (block: Partial<Block> & { name: string }) => {
  const blockType = block.categoryId || 'service';
  const meta = block.meta || {};
  const { price, currency } = extractPrimaryPrice(block);

  // Get price type from meta
  const pricingRecords = meta.pricingRecords as PricingRecord[] | undefined;
  const priceType = meta.priceType || pricingRecords?.[0]?.price_type || 'fixed';

  // Map price_type to DB enum values
  const dbPriceType = priceType === 'hourly' ? 'per_hour' : priceType === 'fixed' ? 'per_session' : priceType;

  return {
    // Required fields
    name: block.name,
    type: blockType,  // Correct field name for DB
    block_type_id: blockType, // For edge function resolution

    // Optional top-level fields
    display_name: block.name,
    icon: block.icon || getDefaultIcon(blockType),
    description: block.description || '',
    tags: block.tags || [],

    // Pricing at top level (for independent mode)
    pricing_mode: (meta.pricingMode as string) || 'independent',
    pricing_mode_id: (meta.pricingMode as string) || 'independent', // For edge function resolution
    base_price: price,
    currency: currency || 'INR',
    price_type: dbPriceType,

    // Tax
    tax_rate: meta.taxRate || 18.00,

    // Resource pricing (for resource_based mode)
    resource_pricing: buildResourcePricing(block),

    // Status - default to active
    status: (meta.status as string) || 'active',

    // Visibility
    visible: meta.visible !== 'false',
    is_admin: meta.is_admin === 'true',

    // Type-specific config
    config: buildConfig(block, blockType),
  };
};

/**
 * Convert UI Block updates to API UpdateBlockData format
 * Only includes changed fields
 */
export const blockToUpdateData = (updates: Partial<Block>) => {
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
  }

  // Pricing mode
  if (meta.pricingMode !== undefined) {
    data.pricing_mode = meta.pricingMode;
    data.pricing_mode_id = meta.pricingMode;
  }

  // Price updates
  const { price, currency } = extractPrimaryPrice(updates);
  if (price !== undefined) data.base_price = price;
  if (currency !== undefined) data.currency = currency;

  // Price type
  if (meta.priceType !== undefined) {
    const priceType = meta.priceType as string;
    data.price_type = priceType === 'hourly' ? 'per_hour' : priceType === 'fixed' ? 'per_session' : priceType;
  }

  // Tax rate
  if (meta.taxRate !== undefined) data.tax_rate = meta.taxRate;

  // Status
  if (meta.status !== undefined) data.status = meta.status;

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
