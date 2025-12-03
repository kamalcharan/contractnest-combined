// src/services/TenantSeedService.ts
// Service for seeding default data for new tenants
// Centralized source of truth for all tenant default configurations

import api from './api';
import { API_ENDPOINTS } from './serviceURLs';

// ============================================================
// DEFAULT SEQUENCE CONFIGURATIONS
// These are the default sequences seeded for new tenants
// ============================================================

export interface DefaultSequenceConfig {
  code: string;
  name: string;
  description: string;
  prefix: string;
  separator: string;
  suffix: string;
  padding_length: number;
  start_value: number;
  reset_frequency: 'NEVER' | 'YEARLY' | 'MONTHLY' | 'QUARTERLY';
  increment_by: number;
  hexcolor: string;
  icon_name: string;
  is_deletable: boolean;
  sequence_order: number;
}

// Default sequence configurations for both live and test environments
export const DEFAULT_SEQUENCES: DefaultSequenceConfig[] = [
  {
    code: 'CONTACT',
    name: 'Contact Number',
    description: 'Auto-generated number for contacts',
    prefix: 'CT',
    separator: '-',
    suffix: '',
    padding_length: 4,
    start_value: 1001,
    reset_frequency: 'NEVER',
    increment_by: 1,
    hexcolor: '#3B82F6',  // Blue
    icon_name: 'Users',
    is_deletable: false,  // System sequence
    sequence_order: 1
  },
  {
    code: 'CONTRACT',
    name: 'Contract Number',
    description: 'Auto-generated number for contracts',
    prefix: 'CN',
    separator: '-',
    suffix: '',
    padding_length: 4,
    start_value: 1001,
    reset_frequency: 'YEARLY',
    increment_by: 1,
    hexcolor: '#10B981',  // Green
    icon_name: 'FileText',
    is_deletable: false,
    sequence_order: 2
  },
  {
    code: 'INVOICE',
    name: 'Invoice Number',
    description: 'Auto-generated number for invoices',
    prefix: 'INV',
    separator: '-',
    suffix: '',
    padding_length: 5,
    start_value: 10001,
    reset_frequency: 'YEARLY',
    increment_by: 1,
    hexcolor: '#F59E0B',  // Amber
    icon_name: 'Receipt',
    is_deletable: false,
    sequence_order: 3
  },
  {
    code: 'QUOTATION',
    name: 'Quotation Number',
    description: 'Auto-generated number for quotations',
    prefix: 'QT',
    separator: '-',
    suffix: '',
    padding_length: 4,
    start_value: 1001,
    reset_frequency: 'YEARLY',
    increment_by: 1,
    hexcolor: '#8B5CF6',  // Purple
    icon_name: 'FileQuestion',
    is_deletable: false,
    sequence_order: 4
  },
  {
    code: 'RECEIPT',
    name: 'Receipt Number',
    description: 'Auto-generated number for receipts',
    prefix: 'RCP',
    separator: '-',
    suffix: '',
    padding_length: 5,
    start_value: 10001,
    reset_frequency: 'YEARLY',
    increment_by: 1,
    hexcolor: '#EC4899',  // Pink
    icon_name: 'CreditCard',
    is_deletable: false,
    sequence_order: 5
  },
  {
    code: 'PROJECT',
    name: 'Project Number',
    description: 'Auto-generated number for projects',
    prefix: 'PRJ',
    separator: '-',
    suffix: '',
    padding_length: 4,
    start_value: 1001,
    reset_frequency: 'YEARLY',
    increment_by: 1,
    hexcolor: '#06B6D4',  // Cyan
    icon_name: 'Folder',
    is_deletable: true,   // Optional sequence
    sequence_order: 6
  },
  {
    code: 'TASK',
    name: 'Task Number',
    description: 'Auto-generated number for tasks',
    prefix: 'TSK',
    separator: '-',
    suffix: '',
    padding_length: 5,
    start_value: 10001,
    reset_frequency: 'NEVER',
    increment_by: 1,
    hexcolor: '#64748B',  // Slate
    icon_name: 'CheckSquare',
    is_deletable: true,
    sequence_order: 7
  },
  {
    code: 'TICKET',
    name: 'Support Ticket Number',
    description: 'Auto-generated number for support tickets',
    prefix: 'TKT',
    separator: '-',
    suffix: '',
    padding_length: 5,
    start_value: 10001,
    reset_frequency: 'YEARLY',
    increment_by: 1,
    hexcolor: '#EF4444',  // Red
    icon_name: 'Ticket',
    is_deletable: true,
    sequence_order: 8
  }
];

// ============================================================
// ENTITY TYPE DISPLAY NAMES
// Used for showing friendly names in the UI
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
// SEED SERVICE RESPONSES
// ============================================================

export interface SeedSequencesResponse {
  success: boolean;
  message: string;
  seeded_count: number;
  sequences: string[];
}

export interface SeedResult {
  success: boolean;
  category: string;
  count: number;
  items: string[];
  error?: string;
}

export interface TenantSeedResult {
  success: boolean;
  results: SeedResult[];
  total_seeded: number;
  errors: string[];
}

// ============================================================
// TENANT SEED SERVICE
// ============================================================

export const TenantSeedService = {
  /**
   * Get default sequence configurations
   * Can be used to display preview during onboarding
   */
  getDefaultSequences(): DefaultSequenceConfig[] {
    return DEFAULT_SEQUENCES;
  },

  /**
   * Get a specific sequence configuration by code
   */
  getSequenceByCode(code: string): DefaultSequenceConfig | undefined {
    return DEFAULT_SEQUENCES.find(s => s.code === code.toUpperCase());
  },

  /**
   * Get display name for an entity type
   */
  getEntityDisplayName(entityType: string): string {
    return ENTITY_DISPLAY_NAMES[entityType?.toUpperCase()] || entityType;
  },

  /**
   * Generate preview of what a sequence number will look like
   */
  generateSequencePreview(config: DefaultSequenceConfig, currentValue?: number): string {
    const value = currentValue ?? config.start_value;
    const paddedNumber = String(value).padStart(config.padding_length, '0');
    return `${config.prefix}${config.separator}${paddedNumber}${config.suffix}`;
  },

  /**
   * Seed default sequences for the current tenant
   * Calls the backend API which handles the actual database operations
   * Works for both live and test environments (determined by x-environment header)
   */
  async seedSequences(): Promise<SeedSequencesResponse> {
    try {
      console.log('[TenantSeedService] Seeding default sequences');
      const response = await api.post<SeedSequencesResponse>(API_ENDPOINTS.SEQUENCES.SEED);
      console.log('[TenantSeedService] Seed response:', response.data);
      return response.data;
    } catch (error) {
      console.error('[TenantSeedService] Error seeding sequences:', error);
      throw error;
    }
  },

  /**
   * Seed all default data for a new tenant
   * Currently includes: Sequences
   * Future: Roles, Tags, Statuses, etc.
   */
  async seedAllDefaults(): Promise<TenantSeedResult> {
    const results: SeedResult[] = [];
    const errors: string[] = [];
    let totalSeeded = 0;

    // Seed sequences
    try {
      const sequenceResult = await this.seedSequences();
      results.push({
        success: sequenceResult.success,
        category: 'Sequence Numbers',
        count: sequenceResult.seeded_count,
        items: sequenceResult.sequences
      });
      totalSeeded += sequenceResult.seeded_count;
    } catch (error: any) {
      errors.push(`Sequences: ${error.message || 'Failed to seed'}`);
      results.push({
        success: false,
        category: 'Sequence Numbers',
        count: 0,
        items: [],
        error: error.message
      });
    }

    // Future: Add more seed operations here
    // - Roles
    // - Tags
    // - Default statuses
    // - etc.

    return {
      success: errors.length === 0,
      results,
      total_seeded: totalSeeded,
      errors
    };
  },

  /**
   * Check if sequences have already been seeded for the tenant
   * Useful for onboarding flow to determine if step should be skipped
   */
  async checkSequencesSeeded(): Promise<boolean> {
    try {
      const response = await api.get<{ success: boolean; data: any[] }>(API_ENDPOINTS.SEQUENCES.CONFIGS.LIST);
      return response.data.data && response.data.data.length > 0;
    } catch (error) {
      console.error('[TenantSeedService] Error checking seeded sequences:', error);
      return false;
    }
  }
};

// ============================================================
// HELPER FUNCTIONS
// ============================================================

/**
 * Get the color for a sequence type (for UI theming)
 */
export const getSequenceColor = (code: string): string => {
  const sequence = DEFAULT_SEQUENCES.find(s => s.code === code.toUpperCase());
  return sequence?.hexcolor || '#6B7280'; // Default gray
};

/**
 * Get the icon name for a sequence type (Lucide icons)
 */
export const getSequenceIcon = (code: string): string => {
  const sequence = DEFAULT_SEQUENCES.find(s => s.code === code.toUpperCase());
  return sequence?.icon_name || 'Hash';
};

/**
 * Get all sequence codes (useful for dropdowns)
 */
export const getAllSequenceCodes = (): string[] => {
  return DEFAULT_SEQUENCES.map(s => s.code);
};

/**
 * Get sequence options for dropdowns
 */
export const getSequenceOptions = (): Array<{ value: string; label: string }> => {
  return DEFAULT_SEQUENCES.map(s => ({
    value: s.code,
    label: s.name
  }));
};

// Default export
export default TenantSeedService;
