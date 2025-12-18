// src/services/jtdRealtimeListener.ts
// Realtime listener for creating JTD events from database changes
// Updated for new JTD Framework

import { createClient } from '@supabase/supabase-js';
import { jtdService } from './jtdService';
import { captureException } from '../utils/sentry';
import { SUPABASE_URL, SUPABASE_KEY } from '../utils/supabaseConfig';

const VANI_UUID = '00000000-0000-0000-0000-000000000001';

interface UserTenantPayload {
  user_id: string;
  tenant_id: string;
  role?: string;
}

interface InvitationPayload {
  id: string;
  email?: string;
  mobile?: string;
  tenant_id: string;
  role_id: string;
  invited_by: string;
  expires_at: string;
  invitation_method?: string;
}

export class JTDRealtimeListener {
  private supabase: any;
  private channels: Map<string, any> = new Map();
  private isListening: boolean = false;

  constructor() {
    if (SUPABASE_URL && SUPABASE_KEY) {
      this.supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
        auth: {
          persistSession: false,
          autoRefreshToken: false
        },
        realtime: {
          params: {
            eventsPerSecond: 10
          }
        }
      });
    }
  }

  async start() {
    if (!this.supabase) {
      console.error('[JTD Realtime] Supabase client not initialized');
      return;
    }

    if (this.isListening) {
      console.log('[JTD Realtime] Already running');
      return;
    }

    console.log('[JTD Realtime] Starting listener...');

    try {
      // Listen to t_user_tenants for new user associations
      const userTenantChannel = this.supabase
        .channel('jtd-user-tenants')
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 't_user_tenants'
        }, async (payload: any) => {
          console.log('[JTD Realtime] New user-tenant relationship:', payload.new?.user_id);
          if (payload.new?.user_id && payload.new?.tenant_id) {
            await this.handleUserTenantCreated(payload.new as UserTenantPayload);
          }
        })
        .subscribe((status: string, err?: any) => {
          console.log('[JTD Realtime] User-tenant channel:', status);
          if (err) console.error('[JTD Realtime] Error:', err);
        });

      this.channels.set('user-tenants', userTenantChannel);

      // Note: User invitations are now handled by the user-invitations Edge Function
      // which creates JTD entries directly. We don't need to listen here.
      // But we can listen for invitation acceptance events if needed.

      this.isListening = true;
      console.log('[JTD Realtime] Started successfully');
    } catch (error) {
      console.error('[JTD Realtime] Error starting:', error);
      captureException(error as Error, {
        tags: { component: 'JTDRealtimeListener', action: 'start' }
      });
      throw error;
    }
  }

  async stop() {
    if (!this.supabase) return;

    console.log('[JTD Realtime] Stopping...');

    for (const [name, channel] of this.channels) {
      await this.supabase.removeChannel(channel);
      console.log(`[JTD Realtime] Removed channel: ${name}`);
    }

    this.channels.clear();
    this.isListening = false;
    console.log('[JTD Realtime] Stopped');
  }

  private async handleUserTenantCreated(userTenant: UserTenantPayload) {
    try {
      // Get user profile
      const profileResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/t_user_profiles?user_id=eq.${userTenant.user_id}`,
        {
          headers: {
            'apikey': SUPABASE_KEY!,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const profileData = await profileResponse.json();
      const userProfile = profileData[0];

      if (!userProfile?.email) {
        console.log('[JTD Realtime] No email for user, skipping welcome notification');
        return;
      }

      // Get tenant name
      const tenantResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/t_tenants?id=eq.${userTenant.tenant_id}`,
        {
          headers: {
            'apikey': SUPABASE_KEY!,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const tenantData = await tenantResponse.json();
      const tenantName = tenantData[0]?.name || 'Your Workspace';

      // Create JTD for welcome email (using new JTD format)
      await jtdService.createJTD({
        event_type: 'notification',
        channel: 'email',
        tenant_id: userTenant.tenant_id,
        source_type: 'user_created',
        source_id: userTenant.user_id,
        recipient_data: {
          user_id: userTenant.user_id,
          email: userProfile.email,
          name: `${userProfile.first_name || ''} ${userProfile.last_name || ''}`.trim() || 'User'
        },
        template_data: {
          user_name: userProfile.first_name || 'there',
          workspace_name: tenantName,
          login_url: process.env.APP_URL || 'https://app.contractnest.com'
        },
        metadata: {
          user_code: userProfile.user_code,
          role: userTenant.role
        },
        is_live: true
      });

      console.log('[JTD Realtime] Created welcome JTD for user:', userTenant.user_id);
    } catch (error) {
      console.error('[JTD Realtime] Error handling user-tenant created:', error);
      captureException(error as Error, {
        tags: { component: 'JTDRealtimeListener', action: 'handleUserTenantCreated' },
        extra: { userId: userTenant.user_id }
      });
    }
  }
}

// Export singleton instance
export const jtdRealtimeListener = new JTDRealtimeListener();
