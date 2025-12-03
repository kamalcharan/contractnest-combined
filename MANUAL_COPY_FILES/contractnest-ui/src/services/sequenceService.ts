// src/services/sequenceService.ts
// Service for Sequence Numbers management
// Follows the same pattern as masterdata.ts

import api from './api';
import { API_ENDPOINTS, SequenceConfig, SequenceStatus, SequenceFilters } from './serviceURLs';

// Request/Response types
export interface CreateSequenceConfigRequest {
  entity_type: string;
  prefix: string;
  suffix?: string;
  padding: number;
  start_value: number;
  increment_by?: number;
  reset_frequency?: 'never' | 'yearly' | 'monthly' | 'quarterly';
  format_pattern?: string;
  is_active?: boolean;
}

export interface UpdateSequenceConfigRequest {
  prefix?: string;
  suffix?: string;
  padding?: number;
  start_value?: number;
  increment_by?: number;
  reset_frequency?: 'never' | 'yearly' | 'monthly' | 'quarterly';
  format_pattern?: string;
  is_active?: boolean;
}

export interface SequenceConfigListResponse {
  success: boolean;
  data: SequenceConfig[];
  count: number;
}

export interface SequenceStatusResponse {
  success: boolean;
  data: SequenceStatus[];
  count: number;
}

export interface NextSequenceResponse {
  success: boolean;
  formatted: string;
  raw_value: number;
  entity_type: string;
}

export interface ResetSequenceRequest {
  new_value?: number;
}

export interface ResetSequenceResponse {
  success: boolean;
  message: string;
  old_value: number;
  new_value: number;
}

export interface SeedSequencesResponse {
  success: boolean;
  message: string;
  seeded_count: number;
  sequences: string[];
}

export interface BackfillResponse {
  success: boolean;
  message: string;
  updated_count: number;
}

// Sequence Service
export const sequenceService = {
  /**
   * Get all sequence configurations for the tenant
   */
  async getConfigs(filters?: SequenceFilters): Promise<SequenceConfig[]> {
    try {
      const url = filters
        ? API_ENDPOINTS.SEQUENCES.LIST_WITH_FILTERS(filters)
        : API_ENDPOINTS.SEQUENCES.CONFIGS.LIST;

      console.log('[SequenceService] Fetching configs from:', url);
      const response = await api.get<SequenceConfigListResponse>(url);

      console.log('[SequenceService] Configs response:', response.data);
      return response.data.data || [];
    } catch (error) {
      console.error('[SequenceService] Error fetching configs:', error);
      throw error;
    }
  },

  /**
   * Get sequence status with current values and next formatted numbers
   */
  async getStatus(): Promise<SequenceStatus[]> {
    try {
      console.log('[SequenceService] Fetching sequence status');
      const response = await api.get<SequenceStatusResponse>(API_ENDPOINTS.SEQUENCES.STATUS);

      console.log('[SequenceService] Status response:', response.data);
      return response.data.data || [];
    } catch (error) {
      console.error('[SequenceService] Error fetching status:', error);
      throw error;
    }
  },

  /**
   * Create a new sequence configuration
   */
  async createConfig(config: CreateSequenceConfigRequest): Promise<SequenceConfig> {
    try {
      console.log('[SequenceService] Creating config:', config);
      const response = await api.post<{ success: boolean; data: SequenceConfig }>(
        API_ENDPOINTS.SEQUENCES.CONFIGS.CREATE,
        config
      );

      console.log('[SequenceService] Create response:', response.data);
      return response.data.data;
    } catch (error) {
      console.error('[SequenceService] Error creating config:', error);
      throw error;
    }
  },

  /**
   * Update an existing sequence configuration
   */
  async updateConfig(id: string, updates: UpdateSequenceConfigRequest): Promise<SequenceConfig> {
    try {
      console.log('[SequenceService] Updating config:', id, updates);
      const response = await api.patch<{ success: boolean; data: SequenceConfig }>(
        API_ENDPOINTS.SEQUENCES.CONFIGS.UPDATE(id),
        updates
      );

      console.log('[SequenceService] Update response:', response.data);
      return response.data.data;
    } catch (error) {
      console.error('[SequenceService] Error updating config:', error);
      throw error;
    }
  },

  /**
   * Delete a sequence configuration
   */
  async deleteConfig(id: string): Promise<{ success: boolean }> {
    try {
      console.log('[SequenceService] Deleting config:', id);
      const response = await api.delete<{ success: boolean }>(
        API_ENDPOINTS.SEQUENCES.CONFIGS.DELETE(id)
      );

      console.log('[SequenceService] Delete response:', response.data);
      return response.data;
    } catch (error) {
      console.error('[SequenceService] Error deleting config:', error);
      throw error;
    }
  },

  /**
   * Get the next formatted sequence number for a specific entity type
   */
  async getNext(code: string): Promise<NextSequenceResponse> {
    try {
      console.log('[SequenceService] Getting next sequence for:', code);
      const response = await api.get<NextSequenceResponse>(
        API_ENDPOINTS.SEQUENCES.NEXT(code)
      );

      console.log('[SequenceService] Next sequence response:', response.data);
      return response.data;
    } catch (error) {
      console.error('[SequenceService] Error getting next sequence:', error);
      throw error;
    }
  },

  /**
   * Reset a sequence counter to a specific value
   */
  async resetSequence(code: string, newValue?: number): Promise<ResetSequenceResponse> {
    try {
      console.log('[SequenceService] Resetting sequence:', code, 'to:', newValue);
      const response = await api.post<ResetSequenceResponse>(
        API_ENDPOINTS.SEQUENCES.RESET(code),
        newValue !== undefined ? { new_value: newValue } : {}
      );

      console.log('[SequenceService] Reset response:', response.data);
      return response.data;
    } catch (error) {
      console.error('[SequenceService] Error resetting sequence:', error);
      throw error;
    }
  },

  /**
   * Seed default sequences for a new tenant (onboarding)
   */
  async seedDefaults(): Promise<SeedSequencesResponse> {
    try {
      console.log('[SequenceService] Seeding default sequences');
      const response = await api.post<SeedSequencesResponse>(
        API_ENDPOINTS.SEQUENCES.SEED
      );

      console.log('[SequenceService] Seed response:', response.data);
      return response.data;
    } catch (error) {
      console.error('[SequenceService] Error seeding sequences:', error);
      throw error;
    }
  },

  /**
   * Backfill existing records with sequence numbers
   */
  async backfill(code: string): Promise<BackfillResponse> {
    try {
      console.log('[SequenceService] Backfilling records for:', code);
      const response = await api.post<BackfillResponse>(
        API_ENDPOINTS.SEQUENCES.BACKFILL(code)
      );

      console.log('[SequenceService] Backfill response:', response.data);
      return response.data;
    } catch (error) {
      console.error('[SequenceService] Error backfilling:', error);
      throw error;
    }
  },

  /**
   * Health check for sequence service
   */
  async healthCheck(): Promise<{ status: string }> {
    try {
      const response = await api.get<{ status: string }>(API_ENDPOINTS.SEQUENCES.HEALTH);
      return response.data;
    } catch (error) {
      console.error('[SequenceService] Health check failed:', error);
      throw error;
    }
  }
};

// Export types
export type { SequenceConfig, SequenceStatus, SequenceFilters };

// Default export
export default sequenceService;
