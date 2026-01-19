// src/services/productConfigService.ts
// Service for Product Configuration management
// Follows the same pattern as sequenceService.ts

import api from './api';
import { API_ENDPOINTS, ProductConfigFilters } from './serviceURLs';
import {
  ProductConfig,
  BillingConfig,
  ProductConfigSummary,
  ProductConfigHistoryEntry
} from '@/types/productConfig';

// Response types
export interface ListProductConfigsResponse {
  success: boolean;
  data: ProductConfigSummary[];
  count: number;
}

export interface GetProductConfigResponse {
  success: boolean;
  data?: ProductConfig;
  error?: string;
}

export interface GetProductConfigHistoryResponse {
  success: boolean;
  product_code: string;
  history: ProductConfigHistoryEntry[];
  count: number;
}

export interface UpdateProductConfigRequest {
  billing_config: BillingConfig;
  changelog?: string;
}

export interface UpdateProductConfigResponse {
  success: boolean;
  message?: string;
  product_code?: string;
  config_version?: string;
  previous_version?: string;
  error?: string;
}

// Product Config Service
export const productConfigService = {
  /**
   * Get all product configurations
   */
  async listConfigs(filters?: ProductConfigFilters): Promise<ListProductConfigsResponse> {
    const url = filters
      ? API_ENDPOINTS.PRODUCT_CONFIG.LIST_WITH_FILTERS(filters)
      : API_ENDPOINTS.PRODUCT_CONFIG.LIST;

    const response = await api.get<ListProductConfigsResponse>(url);
    return response.data;
  },

  /**
   * Get product configuration by product code
   */
  async getConfig(productCode: string): Promise<GetProductConfigResponse> {
    const url = API_ENDPOINTS.PRODUCT_CONFIG.GET(productCode);
    const response = await api.get<GetProductConfigResponse>(url);
    return response.data;
  },

  /**
   * Get product configuration version history
   */
  async getConfigHistory(productCode: string): Promise<GetProductConfigHistoryResponse> {
    const url = API_ENDPOINTS.PRODUCT_CONFIG.HISTORY(productCode);
    const response = await api.get<GetProductConfigHistoryResponse>(url);
    return response.data;
  },

  /**
   * Update product configuration
   */
  async updateConfig(
    productCode: string,
    request: UpdateProductConfigRequest
  ): Promise<UpdateProductConfigResponse> {
    const url = API_ENDPOINTS.PRODUCT_CONFIG.UPDATE(productCode);
    const response = await api.put<UpdateProductConfigResponse>(url, request);
    return response.data;
  }
};

export default productConfigService;
