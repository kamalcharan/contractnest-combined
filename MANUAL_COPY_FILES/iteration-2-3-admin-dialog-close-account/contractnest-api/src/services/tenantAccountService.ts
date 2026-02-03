// src/services/tenantAccountService.ts
// Service layer for Tenant Account Management (Owner-side)
// Proxies to tenant-account edge function
// Pattern: matches businessModelService.ts (simple headers, no signing)

import axios from 'axios';
import { SUPABASE_URL } from '../utils/supabaseConfig';

const BASE_URL = `${SUPABASE_URL}/functions/v1/tenant-account`;

export class TenantAccountService {

  /**
   * GET /data-summary - Owner's own tenant data summary
   */
  async getDataSummary(authHeader: string, tenantId: string): Promise<any> {
    try {
      const url = `${BASE_URL}/data-summary`;
      console.log(`[tenantAccountService] Fetching owner data summary from: ${url}`);

      const response = await axios.get(url, {
        headers: {
          Authorization: authHeader,
          'x-tenant-id': tenantId,
          'Content-Type': 'application/json'
        }
      });

      return response.data;
    } catch (error: any) {
      console.error('[tenantAccountService] getDataSummary error:', error.message);
      throw error;
    }
  }

  /**
   * POST /close-account - Owner closes their own account
   */
  async closeAccount(authHeader: string, tenantId: string, reason?: string): Promise<any> {
    try {
      const url = `${BASE_URL}/close-account`;
      console.log(`[tenantAccountService] Close account: ${url}`);

      const response = await axios.post(url,
        { confirmed: true, reason: reason || '' },
        {
          headers: {
            Authorization: authHeader,
            'x-tenant-id': tenantId,
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data;
    } catch (error: any) {
      console.error('[tenantAccountService] closeAccount error:', error.message);
      throw error;
    }
  }
}

export const tenantAccountService = new TenantAccountService();
