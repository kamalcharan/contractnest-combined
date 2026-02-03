// src/services/adminTenantService.ts
// Service layer for Admin Tenant Management - proxies to edge function

import axios from 'axios';
import crypto from 'crypto';

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const BASE_URL = `${SUPABASE_URL}/functions/v1/admin-tenant-management`;
const SIGNING_SECRET = process.env.INTERNAL_SIGNING_SECRET || '';
const TIMEOUT = 30000;

/**
 * Internal signing - matches existing pattern in resourcesService.ts
 */
function createSignedHeaders(body: string = ''): Record<string, string> {
  const timestamp = new Date().toISOString();
  const data = body + timestamp + SIGNING_SECRET;
  const hash = crypto.createHash('sha256').update(data).digest('base64');
  const signature = hash.substring(0, 32);

  return {
    'x-internal-signature': signature,
    'x-timestamp': timestamp
  };
}

/**
 * Parse edge function response
 */
function parseResponse(response: any): any {
  const data = response.data;
  if (data?.success === true) {
    return data;
  }
  if (data?.error) {
    const err: any = new Error(data.error.message || 'Edge function error');
    err.status = response.status;
    err.code = data.error.code;
    throw err;
  }
  return data;
}

export class AdminTenantService {

  /**
   * GET /stats - Platform-wide stats
   */
  async getStats(authHeader: string, tenantId: string): Promise<any> {
    try {
      const response = await axios.get(`${BASE_URL}/stats`, {
        headers: {
          'Authorization': authHeader,
          'x-tenant-id': tenantId,
          'x-is-admin': 'true',
          'Content-Type': 'application/json',
          ...createSignedHeaders()
        },
        timeout: TIMEOUT
      });

      return parseResponse(response);
    } catch (error: any) {
      if (error.response) {
        const err: any = new Error(error.response.data?.error?.message || 'Failed to load stats');
        err.status = error.response.status;
        throw err;
      }
      throw error;
    }
  }

  /**
   * GET /tenants - Paginated tenant list with filters
   */
  async getTenants(
    authHeader: string,
    tenantId: string,
    filters: {
      page?: number;
      limit?: number;
      status?: string;
      subscription_status?: string;
      search?: string;
      sort_by?: string;
      sort_direction?: string;
    }
  ): Promise<any> {
    try {
      const params = new URLSearchParams();
      if (filters.page) params.append('page', String(filters.page));
      if (filters.limit) params.append('limit', String(filters.limit));
      if (filters.status) params.append('status', filters.status);
      if (filters.subscription_status) params.append('subscription_status', filters.subscription_status);
      if (filters.search) params.append('search', filters.search);
      if (filters.sort_by) params.append('sort_by', filters.sort_by);
      if (filters.sort_direction) params.append('sort_direction', filters.sort_direction);

      const queryString = params.toString();
      const url = `${BASE_URL}/tenants${queryString ? '?' + queryString : ''}`;

      const response = await axios.get(url, {
        headers: {
          'Authorization': authHeader,
          'x-tenant-id': tenantId,
          'x-is-admin': 'true',
          'Content-Type': 'application/json',
          ...createSignedHeaders()
        },
        timeout: TIMEOUT
      });

      return parseResponse(response);
    } catch (error: any) {
      if (error.response) {
        const err: any = new Error(error.response.data?.error?.message || 'Failed to load tenants');
        err.status = error.response.status;
        throw err;
      }
      throw error;
    }
  }
}

export const adminTenantService = new AdminTenantService();
