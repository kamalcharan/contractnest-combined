// src/services/TenantSeedService.ts
// Service for seeding default data for new tenants
// Calls API layer which holds the seed data (single source of truth)

import api from './api';

// ============================================================
// TYPES
// ============================================================

export interface SeedPreviewItem {
  code: string;
  name: string;
  preview?: string;
}

export interface SeedPreview {
  category: string;
  displayName: string;
  description: string;
  itemCount: number;
  items: SeedPreviewItem[];
}

export interface SeedResult {
  success: boolean;
  category: string;
  displayName: string;
  inserted: number;
  skipped: number;
  errors: string[];
  items?: string[];
}

export interface TenantSeedResult {
  success: boolean;
  tenantId: string;
  environment: 'live' | 'test';
  results: SeedResult[];
  totalInserted: number;
  totalSkipped: number;
  errors: string[];
  timestamp: string;
}

export interface SeedStatus {
  category: string;
  displayName: string;
  isSeeded: boolean;
  count: number;
}

export interface SeedStatusResponse {
  success: boolean;
  tenantId: string;
  environment: string;
  allSeeded: boolean;
  requiredSeeded: boolean;
  statuses: SeedStatus[];
}

// ============================================================
// API ENDPOINTS
// ============================================================

const SEED_ENDPOINTS = {
  DEFAULTS: '/api/seeds/defaults',
  DEFAULTS_CATEGORY: (category: string) => `/api/seeds/defaults/${category}`,
  DATA_CATEGORY: (category: string) => `/api/seeds/data/${category}`,
  TENANT: '/api/seeds/tenant',
  TENANT_CATEGORY: (category: string) => `/api/seeds/tenant/${category}`,
  STATUS: '/api/seeds/status',
};

// ============================================================
// ENTITY DISPLAY NAMES (for UI convenience)
// These are also available from the API via /defaults/sequences
// ============================================================

export const ENTITY_DISPLAY_NAMES: Record<string, string> = {
  CONTACT: 'Contacts',
  CONTRACT: 'Contracts',
  INVOICE: 'Invoices',
  QUOTATION: 'Quotations',
  RECEIPT: 'Receipts',
  PROJECT: 'Projects',
  TASK: 'Tasks',
  TICKET: 'Support Tickets',
};

// ============================================================
// RESET FREQUENCY OPTIONS
// ============================================================

export const RESET_FREQUENCY_OPTIONS = [
  { value: 'NEVER', label: 'Never' },
  { value: 'YEARLY', label: 'Yearly (Jan 1st)' },
  { value: 'MONTHLY', label: 'Monthly (1st of month)' },
  { value: 'QUARTERLY', label: 'Quarterly (Apr, Jul, Oct, Jan)' }
] as const;

// ============================================================
// TENANT SEED SERVICE
// ============================================================

export const TenantSeedService = {
  /**
   * Get preview of all seed categories
   * Fetches from API layer (single source of truth)
   */
  async getAllDefaults(): Promise<{
    previews: SeedPreview[];
    categories: string[];
    requiredCategories: string[];
  }> {
    try {
      console.log('[TenantSeedService] Fetching all seed defaults');
      const response = await api.get<{
        success: boolean;
        data: SeedPreview[];
        categories: string[];
        requiredCategories: string[];
      }>(SEED_ENDPOINTS.DEFAULTS);

      return {
        previews: response.data.data,
        categories: response.data.categories,
        requiredCategories: response.data.requiredCategories
      };
    } catch (error) {
      console.error('[TenantSeedService] Error fetching defaults:', error);
      throw error;
    }
  },

  /**
   * Get preview for a specific seed category
   */
  async getCategoryDefaults(category: string): Promise<SeedPreview> {
    try {
      console.log('[TenantSeedService] Fetching defaults for:', category);
      const response = await api.get<{ success: boolean; data: SeedPreview }>(
        SEED_ENDPOINTS.DEFAULTS_CATEGORY(category)
      );
      return response.data.data;
    } catch (error) {
      console.error('[TenantSeedService] Error fetching category defaults:', error);
      throw error;
    }
  },

  /**
   * Get sequence defaults preview (convenience method)
   */
  async getSequenceDefaults(): Promise<SeedPreview> {
    return this.getCategoryDefaults('sequences');
  },

  /**
   * Seed all required data for the current tenant
   */
  async seedAllDefaults(categories?: string[]): Promise<TenantSeedResult> {
    try {
      console.log('[TenantSeedService] Seeding all defaults', { categories });
      const response = await api.post<TenantSeedResult>(
        SEED_ENDPOINTS.TENANT,
        { categories }
      );
      console.log('[TenantSeedService] Seed result:', response.data);
      return response.data;
    } catch (error) {
      console.error('[TenantSeedService] Error seeding defaults:', error);
      throw error;
    }
  },

  /**
   * Seed a specific category for the current tenant
   */
  async seedCategory(category: string): Promise<SeedResult> {
    try {
      console.log('[TenantSeedService] Seeding category:', category);
      const response = await api.post<{ success: boolean; data: SeedResult }>(
        SEED_ENDPOINTS.TENANT_CATEGORY(category)
      );
      console.log('[TenantSeedService] Category seed result:', response.data);
      return response.data.data;
    } catch (error) {
      console.error('[TenantSeedService] Error seeding category:', error);
      throw error;
    }
  },

  /**
   * Seed sequences for the current tenant (convenience method)
   */
  async seedSequences(): Promise<SeedResult> {
    return this.seedCategory('sequences');
  },

  /**
   * Check seed status for the current tenant
   */
  async getSeedStatus(): Promise<SeedStatusResponse> {
    try {
      console.log('[TenantSeedService] Checking seed status');
      const response = await api.get<SeedStatusResponse>(SEED_ENDPOINTS.STATUS);
      return response.data;
    } catch (error) {
      console.error('[TenantSeedService] Error checking status:', error);
      throw error;
    }
  },

  /**
   * Check if sequences have already been seeded
   */
  async checkSequencesSeeded(): Promise<boolean> {
    try {
      const status = await this.getSeedStatus();
      const sequencesStatus = status.statuses.find(s => s.category === 'sequences');
      return sequencesStatus?.isSeeded ?? false;
    } catch (error) {
      console.error('[TenantSeedService] Error checking sequences seeded:', error);
      return false;
    }
  },

  /**
   * Get display name for an entity type
   */
  getEntityDisplayName(entityType: string): string {
    return ENTITY_DISPLAY_NAMES[entityType?.toUpperCase()] || entityType;
  }
};

// ============================================================
// HELPER FUNCTIONS
// ============================================================

/**
 * Get the color for a sequence type (for UI theming)
 * Note: Actual colors are defined in API layer and returned via preview
 */
export const getSequenceColor = (code: string): string => {
  const colorMap: Record<string, string> = {
    CONTACT: '#3B82F6',
    CONTRACT: '#10B981',
    INVOICE: '#F59E0B',
    QUOTATION: '#8B5CF6',
    RECEIPT: '#EC4899',
    PROJECT: '#06B6D4',
    TASK: '#64748B',
    TICKET: '#EF4444',
  };
  return colorMap[code?.toUpperCase()] || '#6B7280';
};

/**
 * Get the icon name for a sequence type (Lucide icons)
 */
export const getSequenceIcon = (code: string): string => {
  const iconMap: Record<string, string> = {
    CONTACT: 'Users',
    CONTRACT: 'FileText',
    INVOICE: 'Receipt',
    QUOTATION: 'FileQuestion',
    RECEIPT: 'CreditCard',
    PROJECT: 'Folder',
    TASK: 'CheckSquare',
    TICKET: 'Ticket',
  };
  return iconMap[code?.toUpperCase()] || 'Hash';
};

/**
 * Get all sequence codes
 */
export const getAllSequenceCodes = (): string[] => {
  return Object.keys(ENTITY_DISPLAY_NAMES);
};

/**
 * Get sequence options for dropdowns
 */
export const getSequenceOptions = (): Array<{ value: string; label: string }> => {
  return Object.entries(ENTITY_DISPLAY_NAMES).map(([value, label]) => ({
    value,
    label
  }));
};

// Default export
export default TenantSeedService;
