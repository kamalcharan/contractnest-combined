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
    // Map invitation_method to JTD channel_code
    const channelCode = invitationMethod; // email, sms, whatsapp are same

    // Build recipient info based on channel
    let recipientContact: string;
    const derivedRecipientName = recipientName ||
      (channelCode === 'email' ? recipientEmail?.split('@')[0] : undefined) ||
      'there';

    if (channelCode === 'email') {
      recipientContact = recipientEmail || '';
    } else {
      recipientContact = recipientMobile || '';
    }

    // Build payload with template_data for rendering
    // IMPORTANT: For WhatsApp templates, the ORDER of keys in template_data matters!
    // MSG91 uses Object.values() which respects insertion order.
    // Template: {{1}}=recipient_name, {{2}}=inviter_name, {{3}}=workspace_name, {{4}}=invitation_link
    const payload = {
      recipient_data: {
        email: recipientEmail,
        mobile: recipientMobile,
        name: derivedRecipientName
      },
      template_data: {
        // Order MUST match WhatsApp template placeholders: {{1}}, {{2}}, {{3}}, {{4}}
        recipient_name: derivedRecipientName,   // {{1}}
        inviter_name: inviterName,              // {{2}}
        workspace_name: workspaceName,          // {{3}}
        invitation_link: invitationLink,        // {{4}}
        custom_message: customMessage || ''     // Not used in WhatsApp template
      }
    };

    // Create JTD entry - matches n_jtd table columns
    const { data: jtd, error } = await supabase
      .from('n_jtd')
      .insert({
        tenant_id: tenantId,
        event_type_code: 'notification',
        channel_code: channelCode,
        source_type_code: 'user_invite',
        source_id: invitationId,
        status_code: 'created',
        priority: 5,
        recipient_name: derivedRecipientName,
        recipient_contact: recipientContact,
        payload: payload,
        template_key: `user_invitation_${channelCode}`,
        template_variables: payload.template_data,
        metadata: {
          invitation_id: invitationId,
          invitation_method: invitationMethod,
          workspace_name: workspaceName
        },
        is_live: isLive,
        performed_by_type: 'system',
        performed_by_id: '00000000-0000-0000-0000-000000000001', // VaNi
        performed_by_name: 'VaNi',
        created_by: '00000000-0000-0000-0000-000000000001',
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
  executedAt?: string;
  completedAt?: string;
  error?: string;
}> {
  try {
    const { data: jtd, error } = await supabase
      .from('n_jtd')
      .select('id, status_code, executed_at, completed_at, error_message')
      .eq('source_type_code', 'user_invite')
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
      status: jtd.status_code,
      executedAt: jtd.executed_at,
      completedAt: jtd.completed_at,
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
 *
 * The table has channels_enabled as TEXT[] containing enabled channels
 * e.g., ['email', 'sms', 'whatsapp']
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
      .select('channels_enabled, is_enabled')
      .eq('tenant_id', tenantId)
      .eq('source_type_code', sourceType)
      .eq('is_active', true)
      .single();

    if (error || !config) {
      // No config found - default to enabled
      console.log(`[JTD] No config for ${tenantId}/${sourceType}, defaulting to enabled`);
      return true;
    }

    // Check if overall source is enabled
    if (!config.is_enabled) {
      return false;
    }

    // Check if specific channel is in channels_enabled array
    const channelsEnabled: string[] = config.channels_enabled || [];
    return channelsEnabled.includes(channel);
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

/**
 * Multi-channel invitation parameters
 */
interface MultiChannelInvitationParams {
  tenantId: string;
  invitationId: string;
  recipientEmail?: string;
  recipientMobile?: string;
  recipientName?: string;
  inviterName: string;
  workspaceName: string;
  invitationLink: string;
  customMessage?: string;
  isLive?: boolean;
  /** Primary channel requested by user (email, sms, whatsapp) */
  primaryChannel: 'email' | 'sms' | 'whatsapp';
}

interface MultiChannelResult {
  success: boolean;
  channels: {
    channel: string;
    success: boolean;
    jtdId?: string;
    skipped?: boolean;
    error?: string;
  }[];
  /** At least one channel succeeded */
  anySuccess: boolean;
}

/**
 * Send invitation via multiple channels based on tenant configuration
 *
 * Logic:
 * - Email invites: Send only via email
 * - Mobile invites (SMS/WhatsApp): Send via BOTH WhatsApp AND SMS if enabled
 *
 * This ensures maximum delivery for mobile-based invitations since
 * WhatsApp has better delivery rates but SMS is a fallback.
 */
export async function sendMultiChannelInvitation(
  supabase: ReturnType<typeof createClient>,
  params: MultiChannelInvitationParams
): Promise<MultiChannelResult> {
  const {
    tenantId,
    invitationId,
    recipientEmail,
    recipientMobile,
    recipientName,
    inviterName,
    workspaceName,
    invitationLink,
    customMessage,
    isLive,
    primaryChannel
  } = params;

  const results: MultiChannelResult['channels'] = [];

  // Get is_live from tenant config if not provided
  let resolvedIsLive = isLive;
  if (resolvedIsLive === undefined) {
    resolvedIsLive = await getTenantIsLive(supabase, tenantId);
  }

  console.log(`[JTD Multi-Channel] Starting for invitation ${invitationId}, primary: ${primaryChannel}`);

  // Determine channels to send based on primary channel
  const channelsToSend: Array<'email' | 'sms' | 'whatsapp'> = [];

  if (primaryChannel === 'email') {
    // Email only for email invites
    channelsToSend.push('email');
  } else {
    // For mobile invites, try both WhatsApp and SMS (in that order)
    // WhatsApp has better delivery, SMS is fallback
    channelsToSend.push('whatsapp');
    // SMS deprioritized for now per user request
    // channelsToSend.push('sms');
  }

  // Process each channel
  for (const channel of channelsToSend) {
    // Check if channel is enabled for this tenant
    const channelEnabled = await isChannelEnabled(
      supabase,
      tenantId,
      'user_invite',
      channel
    );

    if (!channelEnabled) {
      console.log(`[JTD Multi-Channel] Channel ${channel} disabled for tenant ${tenantId}`);
      results.push({
        channel,
        success: true,
        skipped: true,
        error: `Channel ${channel} is disabled for this tenant`
      });
      continue;
    }

    // Create JTD entry for this channel
    const jtdResult = await createInvitationJTD(supabase, {
      tenantId,
      invitationId,
      invitationMethod: channel,
      recipientEmail: channel === 'email' ? recipientEmail : undefined,
      recipientMobile: channel !== 'email' ? recipientMobile : undefined,
      recipientName,
      inviterName,
      workspaceName,
      invitationLink,
      customMessage,
      isLive: resolvedIsLive
    });

    results.push({
      channel,
      success: jtdResult.success,
      jtdId: jtdResult.jtdId,
      error: jtdResult.error
    });

    if (jtdResult.success) {
      console.log(`[JTD Multi-Channel] Created JTD ${jtdResult.jtdId} for ${channel}`);
    } else {
      console.error(`[JTD Multi-Channel] Failed to create JTD for ${channel}: ${jtdResult.error}`);
    }
  }

  // Determine overall success
  const anySuccess = results.some(r => r.success && !r.skipped);

  console.log(`[JTD Multi-Channel] Complete. Any success: ${anySuccess}, Results:`,
    results.map(r => `${r.channel}:${r.success ? (r.skipped ? 'skipped' : 'ok') : 'failed'}`).join(', ')
  );

  return {
    success: anySuccess,
    channels: results,
    anySuccess
  };
}
