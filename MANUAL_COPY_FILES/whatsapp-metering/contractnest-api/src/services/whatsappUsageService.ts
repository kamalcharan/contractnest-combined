// ============================================================================
// WhatsApp usage — credits left + this month's split (migration
// 20261008170000_whatsapp_metering, get_whatsapp_usage)
// ============================================================================
// get_whatsapp_usage is service-role only, so this service checks the caller
// is an active member of the tenant before reading it.

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { captureException } from '../utils/sentry';

export interface WhatsappUsage {
  success: boolean;
  metered: boolean;
  available: number;
  balance: number;
  reserved: number;
  state: 'ok' | 'low' | 'out' | 'not_metered';
  low_threshold: number;
  last_purchase: { quantity: number; at: string } | null;
  month: {
    from: string;
    notifications: number;
    team: number;
    customer: number;
    total: number;
    inbound: number;
    free_closing: number;
  };
  generated_at: string;
}

export type WhatsappUsageResult =
  | { success: true; data: WhatsappUsage }
  | { success: false; status: number; error: { code: string; message: string } };

class WhatsappUsageService {
  private client(): SupabaseClient | null {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;
    if (!url || !key) return null;
    return createClient(url, key, { auth: { persistSession: false } });
  }

  async get(tenantId: string, userId: string): Promise<WhatsappUsageResult> {
    const db = this.client();
    if (!db) return { success: false, status: 500, error: { code: 'CONFIG', message: 'Supabase is not configured' } };
    try {
      const { data: member, error: memberError } = await db
        .from('t_user_tenants').select('id')
        .eq('user_id', userId).eq('tenant_id', tenantId).eq('status', 'active')
        .maybeSingle();
      if (memberError) throw new Error(memberError.message);
      if (!member) return { success: false, status: 403, error: { code: 'FORBIDDEN', message: 'Workspace unavailable' } };

      const { data, error } = await db.rpc('get_whatsapp_usage', { p_tenant_id: tenantId });
      if (error) throw new Error(error.message);
      if (!data?.success) {
        return { success: false, status: 500, error: { code: 'RPC_ERROR', message: 'Could not read WhatsApp usage' } };
      }
      return { success: true, data: data as WhatsappUsage };
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      console.error('[WhatsappUsageService] get failed:', err.message);
      captureException(err, { tags: { source: 'whatsapp_usage_service' }, tenantId });
      return { success: false, status: 500, error: { code: 'INTERNAL_ERROR', message: 'Could not read WhatsApp usage' } };
    }
  }
}

export const whatsappUsageService = new WhatsappUsageService();
export default whatsappUsageService;
