// ============================================================================
// Group Sessions Dashboard Service — chair-side read model (Batch: GS dashboard)
// ============================================================================
// Server-side Supabase client (service role). The SECURITY DEFINER RPCs
// (migration 018_group_session_dashboard_rpcs) own all logic; this service only
// forwards tenant/is_live/ids. Generic for any tenant — a "group session" is any
// contract flagged metadata.group_session_owner='true'. Read-only.
// ============================================================================

import { createClient, SupabaseClient } from '@supabase/supabase-js';

export interface GsDashResult<T = any> {
  success: boolean;
  data?: T;
  error?: { code: string; message: string };
}

class GroupSessionsDashboardService {
  private client(): SupabaseClient | null {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;
    if (!url || !key) return null;
    return createClient(url, key);
  }

  private async call(fn: string, args: Record<string, unknown>): Promise<GsDashResult> {
    const supabase = this.client();
    if (!supabase) {
      return { success: false, error: { code: 'CONFIG', message: 'Supabase is not configured' } };
    }
    try {
      const { data, error } = await supabase.rpc(fn, args);
      if (error) {
        console.error(`[GroupSessionsDashboardService] ${fn} failed:`, error.message);
        return { success: false, error: { code: 'RPC_ERROR', message: error.message } };
      }
      return { success: true, data };
    } catch (e: any) {
      console.error(`[GroupSessionsDashboardService] ${fn} error:`, e.message);
      return { success: false, error: { code: 'UNEXPECTED', message: e.message || 'Unexpected error' } };
    }
  }

  /** Overview: list group sessions + aggregates for the tenant/environment. */
  dashSessions(tenantId: string, isLive: boolean) {
    return this.call('gs_dash_sessions', { p_tenant: tenantId, p_is_live: isLive });
  }

  /** Occurrences (shared schedule) for one group-session block. */
  dashOccurrences(tenantId: string, blockId: string) {
    return this.call('gs_dash_occurrences', { p_tenant: tenantId, p_block: blockId });
  }

  /** Roster (distinct members of active contracts carrying the block) + dues. */
  dashRoster(tenantId: string, blockId: string, isLive: boolean) {
    return this.call('gs_dash_roster', { p_tenant: tenantId, p_block: blockId, p_is_live: isLive });
  }

  /** Member drill-down: attendance history + billing/dues. */
  dashMember(tenantId: string, memberId: string) {
    return this.call('gs_dash_member', { p_tenant: tenantId, p_member: memberId });
  }
}

export const groupSessionsDashboardService = new GroupSessionsDashboardService();
export default groupSessionsDashboardService;
