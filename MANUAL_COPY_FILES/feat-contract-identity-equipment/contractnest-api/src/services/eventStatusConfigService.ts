// ============================================================================
// Event Status Config Service
// ============================================================================
// Purpose: Call event-status-config RPCs via Supabase client (direct RPC)
// Pattern: Direct RPC calls — no edge function hop needed
//
// Previously: API → Edge Function (HMAC) → Supabase RPC
// Now:        API → Supabase RPC (direct, via service_role key)
// ============================================================================

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  UpsertStatusRequest,
  DeleteStatusRequest,
  UpsertTransitionRequest,
  DeleteTransitionRequest
} from '../types/eventStatusConfigTypes';

interface EdgeResponse {
  success: boolean;
  data?: any;
  error?: string;
  code?: string;
  // Allow pass-through of RPC response fields
  [key: string]: any;
}

class EventStatusConfigService {
  private readonly supabase: SupabaseClient;

  constructor() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('SUPABASE_URL and SUPABASE_KEY environment variables are required');
    }

    this.supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }

  // ==========================================================
  // READ METHODS
  // ==========================================================

  async getStatuses(
    eventType: string,
    tenantId: string,
    _environment: string = 'live'
  ): Promise<EdgeResponse> {
    try {
      const { data, error } = await this.supabase.rpc('get_event_status_config', {
        p_tenant_id: tenantId,
        p_event_type: eventType,
      });

      if (error) {
        console.error('[EventStatusConfigService] RPC get_event_status_config error:', error);
        return { success: false, error: error.message, code: 'RPC_ERROR' };
      }

      // The RPC returns a JSONB object with { success, event_type, statuses, ... }
      return data || { success: true, statuses: [] };
    } catch (err: any) {
      console.error('[EventStatusConfigService] getStatuses error:', err);
      return { success: false, error: err.message, code: 'INTERNAL_ERROR' };
    }
  }

  async getTransitions(
    eventType: string,
    tenantId: string,
    _environment: string = 'live',
    fromStatus?: string
  ): Promise<EdgeResponse> {
    try {
      const { data, error } = await this.supabase.rpc('get_event_status_transitions', {
        p_tenant_id: tenantId,
        p_event_type: eventType,
        p_from_status: fromStatus || null,
      });

      if (error) {
        console.error('[EventStatusConfigService] RPC get_event_status_transitions error:', error);
        return { success: false, error: error.message, code: 'RPC_ERROR' };
      }

      return data || { success: true, transitions: [] };
    } catch (err: any) {
      console.error('[EventStatusConfigService] getTransitions error:', err);
      return { success: false, error: err.message, code: 'INTERNAL_ERROR' };
    }
  }

  // ==========================================================
  // WRITE METHODS
  // ==========================================================

  async upsertStatus(
    body: UpsertStatusRequest,
    tenantId: string,
    _environment: string = 'live'
  ): Promise<EdgeResponse> {
    try {
      const { data, error } = await this.supabase.rpc('upsert_event_status_config', {
        p_tenant_id: tenantId,
        p_event_type: body.event_type,
        p_status_code: body.status_code,
        p_display_name: body.display_name,
        p_description: body.description || null,
        p_hex_color: body.hex_color || '#6B7280',
        p_icon_name: body.icon_name || null,
        p_display_order: body.display_order ?? 0,
        p_is_initial: body.is_initial ?? false,
        p_is_terminal: body.is_terminal ?? false,
      });

      if (error) {
        console.error('[EventStatusConfigService] RPC upsert_event_status_config error:', error);
        return { success: false, error: error.message, code: 'RPC_ERROR' };
      }

      return data || { success: true };
    } catch (err: any) {
      console.error('[EventStatusConfigService] upsertStatus error:', err);
      return { success: false, error: err.message, code: 'INTERNAL_ERROR' };
    }
  }

  async deleteStatus(
    body: DeleteStatusRequest,
    tenantId: string,
    _environment: string = 'live'
  ): Promise<EdgeResponse> {
    try {
      const { data, error } = await this.supabase.rpc('delete_event_status_config', {
        p_tenant_id: tenantId,
        p_event_type: body.event_type,
        p_status_code: body.status_code,
      });

      if (error) {
        console.error('[EventStatusConfigService] RPC delete_event_status_config error:', error);
        return { success: false, error: error.message, code: 'RPC_ERROR' };
      }

      return data || { success: true };
    } catch (err: any) {
      console.error('[EventStatusConfigService] deleteStatus error:', err);
      return { success: false, error: err.message, code: 'INTERNAL_ERROR' };
    }
  }

  async upsertTransition(
    body: UpsertTransitionRequest,
    tenantId: string,
    _environment: string = 'live'
  ): Promise<EdgeResponse> {
    try {
      const { data, error } = await this.supabase.rpc('upsert_event_status_transition', {
        p_tenant_id: tenantId,
        p_event_type: body.event_type,
        p_from_status: body.from_status,
        p_to_status: body.to_status,
        p_requires_reason: body.requires_reason ?? false,
        p_requires_evidence: body.requires_evidence ?? false,
      });

      if (error) {
        console.error('[EventStatusConfigService] RPC upsert_event_status_transition error:', error);
        return { success: false, error: error.message, code: 'RPC_ERROR' };
      }

      return data || { success: true };
    } catch (err: any) {
      console.error('[EventStatusConfigService] upsertTransition error:', err);
      return { success: false, error: err.message, code: 'INTERNAL_ERROR' };
    }
  }

  async deleteTransition(
    body: DeleteTransitionRequest,
    tenantId: string,
    _environment: string = 'live'
  ): Promise<EdgeResponse> {
    try {
      const { data, error } = await this.supabase.rpc('delete_event_status_transition', {
        p_id: body.id,
      });

      if (error) {
        console.error('[EventStatusConfigService] RPC delete_event_status_transition error:', error);
        return { success: false, error: error.message, code: 'RPC_ERROR' };
      }

      return data || { success: true };
    } catch (err: any) {
      console.error('[EventStatusConfigService] deleteTransition error:', err);
      return { success: false, error: err.message, code: 'INTERNAL_ERROR' };
    }
  }

  async seedDefaults(
    tenantId: string,
    _environment: string = 'live'
  ): Promise<EdgeResponse> {
    try {
      const { data, error } = await this.supabase.rpc('seed_event_status_defaults', {
        p_tenant_id: tenantId,
      });

      if (error) {
        console.error('[EventStatusConfigService] RPC seed_event_status_defaults error:', error);
        return { success: false, error: error.message, code: 'RPC_ERROR' };
      }

      return data || { success: true };
    } catch (err: any) {
      console.error('[EventStatusConfigService] seedDefaults error:', err);
      return { success: false, error: err.message, code: 'INTERNAL_ERROR' };
    }
  }
}

export default EventStatusConfigService;
