// src/services/assetRegistryService.ts
// Service layer for Asset Registry — calls Express API (which proxies to Edge)

import api from './api';
import { API_ENDPOINTS } from './serviceURLs';
import type {
  TenantAsset,
  AssetRegistryFilters,
  AssetFormData,
  AssetListResponse,
  EquipmentCategory,
} from '@/types/assetRegistry';

class AssetRegistryService {

  // ── Equipment Categories (from DB) ──────────────────────────────────

  async getEquipmentCategories(): Promise<EquipmentCategory[]> {
    try {
      // Fetch ALL resource types, then filter to equipment-class ones client-side
      // (the edge function returns all types from m_catalog_resource_types)
      const url = API_ENDPOINTS.RESOURCES.RESOURCE_TYPES;
      const response = await api.get(url);
      const data = response.data?.data || response.data;
      if (!Array.isArray(data)) return [];

      // Keep only equipment-class types: id matches equipment/asset/consumable
      const EQUIPMENT_IDS = ['equipment', 'asset', 'consumable'];
      return data.filter((t: any) =>
        EQUIPMENT_IDS.includes((t.id || '').toLowerCase()) ||
        EQUIPMENT_IDS.includes((t.parent_type_id || '').toLowerCase())
      );
    } catch (error: any) {
      throw this.handleError(error, 'Failed to load equipment categories');
    }
  }

  // ── List Assets (with filters) ────────────────────────────────────

  async listAssets(filters: AssetRegistryFilters = {}): Promise<AssetListResponse> {
    try {
      const url = API_ENDPOINTS.ASSET_REGISTRY.LIST_WITH_FILTERS(filters);
      const response = await api.get(url);
      const data = response.data?.data || response.data;

      // Normalise: edge may return flat array or paginated wrapper
      if (Array.isArray(data)) {
        return {
          success: true,
          data,
          pagination: { total: data.length, limit: filters.limit || 50, offset: filters.offset || 0, has_more: false },
        };
      }

      return {
        success: true,
        data: data?.data || data?.items || [],
        pagination: data?.pagination || { total: 0, limit: 50, offset: 0, has_more: false },
      };
    } catch (error: any) {
      throw this.handleError(error, 'Failed to load assets');
    }
  }

  // ── Get Single Asset ──────────────────────────────────────────────

  async getAsset(id: string): Promise<TenantAsset> {
    try {
      const url = API_ENDPOINTS.ASSET_REGISTRY.GET(id);
      const response = await api.get(url);
      return response.data?.data || response.data;
    } catch (error: any) {
      throw this.handleError(error, 'Failed to load asset');
    }
  }

  // ── Create Asset ──────────────────────────────────────────────────

  async createAsset(formData: AssetFormData): Promise<TenantAsset> {
    try {
      const payload = this.transformForAPI(formData);
      const response = await api.post(API_ENDPOINTS.ASSET_REGISTRY.CREATE, payload, {
        headers: {
          'x-idempotency-key': `create-asset-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        },
      });
      return response.data?.data || response.data;
    } catch (error: any) {
      throw this.handleError(error, 'Failed to create asset');
    }
  }

  // ── Update Asset ──────────────────────────────────────────────────

  async updateAsset(id: string, formData: Partial<AssetFormData>): Promise<TenantAsset> {
    try {
      const payload = this.transformForAPI(formData);
      const url = API_ENDPOINTS.ASSET_REGISTRY.UPDATE(id);
      const response = await api.patch(url, payload);
      return response.data?.data || response.data;
    } catch (error: any) {
      throw this.handleError(error, 'Failed to update asset');
    }
  }

  // ── Delete (soft) Asset ───────────────────────────────────────────

  async deleteAsset(id: string): Promise<void> {
    try {
      const url = API_ENDPOINTS.ASSET_REGISTRY.DELETE(id);
      await api.delete(url);
    } catch (error: any) {
      throw this.handleError(error, 'Failed to delete asset');
    }
  }

  // ── Get Children (hierarchy) ──────────────────────────────────────

  async getChildren(parentAssetId: string): Promise<TenantAsset[]> {
    try {
      const url = API_ENDPOINTS.ASSET_REGISTRY.CHILDREN(parentAssetId);
      const response = await api.get(url);
      const data = response.data?.data || response.data;
      return Array.isArray(data) ? data : [];
    } catch (error: any) {
      throw this.handleError(error, 'Failed to load child assets');
    }
  }

  // ── Private helpers ───────────────────────────────────────────────

  private transformForAPI(formData: Partial<AssetFormData>): Record<string, any> {
    const payload: Record<string, any> = { ...formData };

    // Convert empty strings to null for optional fields
    const nullableFields = [
      'code', 'description', 'location', 'make', 'model',
      'serial_number', 'purchase_date', 'warranty_expiry',
      'last_service_date', 'owner_contact_id', 'asset_type_id',
      'parent_asset_id',
    ];
    for (const field of nullableFields) {
      if (payload[field] === '' || payload[field] === undefined) {
        payload[field] = null;
      }
    }

    // Clean specifications: remove empty keys
    if (payload.specifications) {
      const cleaned: Record<string, string> = {};
      for (const [k, v] of Object.entries(payload.specifications)) {
        if (k.trim() && String(v).trim()) {
          cleaned[k.trim()] = String(v).trim();
        }
      }
      payload.specifications = cleaned;
    }

    // Clean tags: remove empty
    if (payload.tags) {
      payload.tags = payload.tags.filter((t: string) => t.trim());
    }

    return payload;
  }

  private handleError(error: any, defaultMessage: string): Error {
    const message = error.response?.data?.error || error.response?.data?.message || error.message || defaultMessage;
    const err = new Error(message);
    (err as any).status = error.response?.status;
    (err as any).code = error.response?.data?.code;
    return err;
  }
}

const assetRegistryService = new AssetRegistryService();
export default assetRegistryService;
