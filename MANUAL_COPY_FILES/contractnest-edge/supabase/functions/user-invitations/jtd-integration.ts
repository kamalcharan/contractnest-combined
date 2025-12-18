// supabase/functions/user-invitations/jtd-integration.ts
// JTD Integration for User Invitations
// Creates JTD entries instead of sending directly via MSG91

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

interface CreateInvitationJTDParams {
  tenantId: string;
  invitationId: string;
  invitationMethod: 'email' | 'sms' | 'whatsapp';
  recipientEmail?: string;
  recipientMobile?: string;
  recipientName?: string;
  inviterName: string;
  workspaceName: string;
  invitationLink: string;
  customMessage?: string;
  isLive?: boolean;
}

interface JTDResult {
  success: boolean;
  jtdId?: string;
  error?: string;
}

/**
 * Create a JTD entry for user invitation
 * This replaces direct MSG91 calls and lets the JTD worker handle delivery
 */
export async function createInvitationJTD(
  supabase: ReturnType<typeof createClient>,
  params: CreateInvitationJTDParams
): Promise<JTDResult> {
  const {
    tenantId,
    invitationId,
    invitationMethod,
    recipientEmail,
    recipientMobile,
    recipientName,
    inviterName,
    workspaceName,
    invitationLink,
    customMessage,
    isLive = false
  } = params;

  try {
    // Map invitation_method to JTD channel
    const channel = invitationMethod; // email, sms, whatsapp are same

    // Build recipient_data based on channel
    const recipientData: Record<string, any> = {};
    if (channel === 'email') {
      recipientData.email = recipientEmail;
      recipientData.name = recipientName || recipientEmail?.split('@')[0];
    } else {
      recipientData.mobile = recipientMobile;
      recipientData.name = recipientName;
    }

    // Build template_data for rendering
    const templateData = {
      inviter_name: inviterName,
      workspace_name: workspaceName,
      invitation_link: invitationLink,
      custom_message: customMessage || '',
      recipient_name: recipientData.name || 'there'
    };

    // Create JTD entry
    const { data: jtd, error } = await supabase
      .from('n_jtd')
      .insert({
        event_type: 'notification',
        channel: channel,
        tenant_id: tenantId,
        source_type: 'user_invite',
        source_id: invitationId,
        current_status: 'created', // DB trigger will change to 'pending' after enqueue
        priority: 5, // Normal priority
        recipient_data: recipientData,
        template_data: templateData,
        metadata: {
          invitation_id: invitationId,
          invitation_method: invitationMethod,
          workspace_name: workspaceName
        },
        is_live: isLive,
        is_active: true,
        created_by: '00000000-0000-0000-0000-000000000001', // VaNi
        updated_by: '00000000-0000-0000-0000-000000000001'
      })
      .select('id')
      .single();

    if (error) {
      console.error('[JTD Integration] Error creating JTD:', error);
      return {
        success: false,
        error: error.message
      };
    }

    console.log(`[JTD Integration] Created JTD ${jtd.id} for invitation ${invitationId}`);

    return {
      success: true,
      jtdId: jtd.id
    };

  } catch (error) {
    console.error('[JTD Integration] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Get JTD status for an invitation
 * Used to check delivery status
 */
export async function getInvitationJTDStatus(
  supabase: ReturnType<typeof createClient>,
  invitationId: string
): Promise<{
  found: boolean;
  status?: string;
  sentAt?: string;
  deliveredAt?: string;
  error?: string;
}> {
  try {
    const { data: jtd, error } = await supabase
      .from('n_jtd')
      .select('id, current_status, sent_at, delivered_at, error_message')
      .eq('source_type', 'user_invite')
      .eq('source_id', invitationId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('[JTD Integration] Error fetching JTD status:', error);
      return { found: false, error: error.message };
    }

    if (!jtd) {
      return { found: false };
    }

    return {
      found: true,
      status: jtd.current_status,
      sentAt: jtd.sent_at,
      deliveredAt: jtd.delivered_at,
      error: jtd.error_message
    };

  } catch (error) {
    console.error('[JTD Integration] Error:', error);
    return {
      found: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Send invitation using JTD (replacement for direct MSG91 calls)
 *
 * Usage in user-invitations/index.ts:
 *
 * // Instead of:
 * // sendSuccess = await sendInvitationEmail({ ... });
 *
 * // Use:
 * import { sendInvitationViaJTD } from './jtd-integration.ts';
 * const result = await sendInvitationViaJTD(supabase, {
 *   tenantId,
 *   invitationId: invitation.id,
 *   invitationMethod: 'email',
 *   recipientEmail: email,
 *   inviterName: `${inviterProfile?.first_name} ${inviterProfile?.last_name}`.trim(),
 *   workspaceName: tenant?.name || 'Workspace',
 *   invitationLink,
 *   customMessage: custom_message,
 *   isLive: true // Set to true for production
 * });
 * sendSuccess = result.success;
 */
export async function sendInvitationViaJTD(
  supabase: ReturnType<typeof createClient>,
  params: CreateInvitationJTDParams
): Promise<{ success: boolean; jtdId?: string; error?: string }> {
  // Create JTD - the worker will handle actual delivery
  const result = await createInvitationJTD(supabase, params);

  if (!result.success) {
    console.error(`[JTD Integration] Failed to create JTD: ${result.error}`);
  }

  // Return success if JTD was created
  // Actual delivery will be async via JTD worker
  return result;
}

/**
 * Check if channel is enabled for tenant + source_type
 * Uses n_jtd_tenant_source_config table
 */
export async function isChannelEnabled(
  supabase: ReturnType<typeof createClient>,
  tenantId: string,
  sourceType: string,
  channel: 'email' | 'sms' | 'whatsapp' | 'inapp'
): Promise<boolean> {
  try {
    const { data: config, error } = await supabase
      .from('n_jtd_tenant_source_config')
      .select('email_enabled, sms_enabled, whatsapp_enabled, inapp_enabled')
      .eq('tenant_id', tenantId)
      .eq('source_type', sourceType)
      .eq('is_active', true)
      .single();

    if (error || !config) {
      // No config found - default to enabled
      console.log(`[JTD] No config for ${tenantId}/${sourceType}, defaulting to enabled`);
      return true;
    }

    const channelMap: Record<string, boolean> = {
      email: config.email_enabled,
      sms: config.sms_enabled,
      whatsapp: config.whatsapp_enabled,
      inapp: config.inapp_enabled
    };

    return channelMap[channel] ?? true;
  } catch (error) {
    console.error('[JTD] Error checking channel config:', error);
    return true; // Default to enabled on error
  }
}

/**
 * Get is_live flag from tenant config
 */
export async function getTenantIsLive(
  supabase: ReturnType<typeof createClient>,
  tenantId: string
): Promise<boolean> {
  try {
    const { data: config, error } = await supabase
      .from('n_jtd_tenant_config')
      .select('is_live')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .single();

    if (error || !config) {
      // No config - default to test mode (false)
      return false;
    }

    return config.is_live;
  } catch (error) {
    console.error('[JTD] Error getting tenant is_live:', error);
    return false;
  }
}

/**
 * Send invitation via JTD with channel check
 * Returns success=false if channel is disabled for tenant
 */
export async function sendInvitation(
  supabase: ReturnType<typeof createClient>,
  params: CreateInvitationJTDParams
): Promise<{ success: boolean; jtdId?: string; error?: string; skipped?: boolean }> {
  const { tenantId, invitationMethod } = params;

  // Check if channel is enabled for this tenant/source_type
  const channelEnabled = await isChannelEnabled(
    supabase,
    tenantId,
    'user_invite',
    invitationMethod
  );

  if (!channelEnabled) {
    console.log(`[JTD] Channel ${invitationMethod} disabled for tenant ${tenantId}`);
    return {
      success: true, // Not an error, just skipped
      skipped: true,
      error: `Channel ${invitationMethod} is disabled for this tenant`
    };
  }

  // Get is_live from tenant config if not provided
  let isLive = params.isLive;
  if (isLive === undefined) {
    isLive = await getTenantIsLive(supabase, tenantId);
  }

  // Create JTD with resolved is_live
  return createInvitationJTD(supabase, { ...params, isLive });
}
