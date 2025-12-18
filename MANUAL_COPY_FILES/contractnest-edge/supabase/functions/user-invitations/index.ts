// supabase/functions/user-invitations/index.ts
// User Invitations Edge Function - Now using JTD for delivery

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { nanoid } from "https://esm.sh/nanoid@4.0.0";

// JTD Integration - replaces direct MSG91 calls
import { sendInvitation } from './jtd-integration.ts';

const corsHeaders = {
 'Access-Control-Allow-Origin': '*',
 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-tenant-id',
 'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS'
};

serve(async (req) => {
 // Handle CORS preflight request
 if (req.method === 'OPTIONS') {
   return new Response('ok', { headers: corsHeaders });
 }

 try {
   const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
   const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

   // Create supabase client
   const supabase = createClient(supabaseUrl, supabaseKey);

   // Parse URL for routing
   const url = new URL(req.url);
   const pathSegments = url.pathname.split('/').filter(Boolean);

   // Route: POST /user-invitations/validate - Validate invitation code (PUBLIC)
   if (req.method === 'POST' && pathSegments.length === 2 && pathSegments[1] === 'validate') {
     const body = await req.json();
     return await validateInvitation(supabase, body);
   }

   // Route: POST /user-invitations/accept - Accept invitation (PUBLIC)
   if (req.method === 'POST' && pathSegments.length === 2 && pathSegments[1] === 'accept') {
     const body = await req.json();
     return await acceptInvitation(supabase, body);
   }

   // Route: POST /user-invitations/accept-existing-user - Accept invitation for existing user (REQUIRES AUTH)
   if (req.method === 'POST' && pathSegments.length === 2 && pathSegments[1] === 'accept-existing-user') {
     const authHeader = req.headers.get('Authorization');
     const token = authHeader?.replace('Bearer ', '');

     if (!authHeader || !token) {
       return new Response(
         JSON.stringify({ error: 'Authorization header is required' }),
         { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
       );
     }

     const { data: userData, error: userError } = await supabase.auth.getUser(token);

     if (userError || !userData?.user) {
       return new Response(
         JSON.stringify({ error: 'Invalid or expired token' }),
         { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
       );
     }

     const body = await req.json();
     return await acceptInvitationExistingUser(supabase, userData.user.id, body);
   }

   // All other routes require authentication
   const authHeader = req.headers.get('Authorization');
   const tenantId = req.headers.get('x-tenant-id');
   const token = authHeader?.replace('Bearer ', '');

   console.log('📥 Incoming request headers:', {
     method: req.method,
     url: req.url,
     'Authorization': authHeader ? 'Bearer [REDACTED]' : 'MISSING',
     'x-tenant-id': tenantId || 'MISSING'
   });

   if (!authHeader || !token) {
     return new Response(
       JSON.stringify({ error: 'Authorization header is required' }),
       { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
     );
   }

   if (!tenantId) {
     return new Response(
       JSON.stringify({ error: 'x-tenant-id header is required' }),
       { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
     );
   }

   const { data: userData, error: userError } = await supabase.auth.getUser(token);

   if (userError || !userData?.user) {
     return new Response(
       JSON.stringify({ error: 'Invalid or expired token' }),
       { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
     );
   }

   const userId = userData.user.id;

   // Route: GET /user-invitations - List all invitations
   if (req.method === 'GET' && pathSegments.length === 1) {
     return await listInvitations(supabase, tenantId, url.searchParams);
   }

   // Route: GET /user-invitations/:id - Get single invitation
   if (req.method === 'GET' && pathSegments.length === 2) {
     const invitationId = pathSegments[1];
     return await getInvitation(supabase, tenantId, invitationId);
   }

   // Route: POST /user-invitations - Create invitation
   if (req.method === 'POST' && pathSegments.length === 1) {
     const body = await req.json();
     return await createInvitation(supabase, tenantId, userId, body);
   }

   // Route: POST /user-invitations/:id/resend - Resend invitation
   if (req.method === 'POST' && pathSegments.length === 3 && pathSegments[2] === 'resend') {
     const invitationId = pathSegments[1];
     return await resendInvitation(supabase, tenantId, userId, invitationId);
   }

   // Route: POST /user-invitations/:id/cancel - Cancel invitation
   if (req.method === 'POST' && pathSegments.length === 3 && pathSegments[2] === 'cancel') {
     const invitationId = pathSegments[1];
     return await cancelInvitation(supabase, tenantId, userId, invitationId);
   }

   return new Response(
     JSON.stringify({ error: 'Invalid endpoint' }),
     { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
   );

 } catch (error) {
   console.error('Error processing request:', error);
   return new Response(
     JSON.stringify({ error: error.message || 'Internal server error' }),
     { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
   );
 }
});

// List invitations with filtering and pagination
async function listInvitations(supabase: any, tenantId: string, params: URLSearchParams) {
 try {
   const status = params.get('status') || 'all';
   const page = parseInt(params.get('page') || '1');
   const limit = parseInt(params.get('limit') || '10');
   const offset = (page - 1) * limit;

   let query = supabase
     .from('t_user_invitations')
     .select('*', { count: 'exact' })
     .eq('tenant_id', tenantId)
     .order('created_at', { ascending: false });

   if (status === 'pending') {
     query = query.in('status', ['pending', 'sent', 'resent']);
   } else if (status !== 'all') {
     query = query.eq('status', status);
   }

   query = query.range(offset, offset + limit - 1);

   const { data: invitations, error, count } = await query;

   if (error) {
     console.error('Error querying invitations:', error);
     throw error;
   }

   const invitedByIds = [...new Set((invitations || []).map(inv => inv.invited_by).filter(Boolean))];
   let userProfiles = new Map();

   if (invitedByIds.length > 0) {
     const { data: profiles } = await supabase
       .from('t_user_profiles')
       .select('id, user_id, first_name, last_name, email')
       .in('user_id', invitedByIds);

     if (profiles) {
       profiles.forEach(profile => {
         userProfiles.set(profile.user_id, profile);
       });
     }
   }

   const enrichedData = (invitations || []).map(invitation => {
     const isExpired = ['pending', 'sent', 'resent'].includes(invitation.status) &&
       new Date(invitation.expires_at) < new Date();

     const invitedByUser = userProfiles.get(invitation.invited_by) || null;

     let acceptedUser = null;
     if (invitation.accepted_by) {
       acceptedUser = { id: invitation.accepted_by };
     }

     return {
       ...invitation,
       invited_by_user: invitedByUser,
       is_expired: isExpired,
       time_remaining: isExpired ? null : getTimeRemaining(invitation.expires_at),
       accepted_user: acceptedUser
     };
   });

   return new Response(
     JSON.stringify({
       data: enrichedData,
       pagination: {
         page,
         limit,
         total: count || 0,
         totalPages: Math.ceil((count || 0) / limit)
       }
     }),
     { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
   );
 } catch (error) {
   console.error('Error listing invitations:', error);
   return new Response(
     JSON.stringify({ error: error.message || 'Failed to list invitations' }),
     { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
   );
 }
}

// Get single invitation
async function getInvitation(supabase: any, tenantId: string, invitationId: string) {
 try {
   const { data: invitation, error } = await supabase
     .from('t_user_invitations')
     .select('*')
     .eq('id', invitationId)
     .eq('tenant_id', tenantId)
     .single();

   if (error) {
     console.error('Error fetching invitation:', error);
     throw error;
   }

   if (!invitation) {
     return new Response(
       JSON.stringify({ error: 'Invitation not found' }),
       { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
     );
   }

   let invitedByUser = null;
   if (invitation.invited_by) {
     const { data: profile } = await supabase
       .from('t_user_profiles')
       .select('id, user_id, first_name, last_name, email')
       .eq('user_id', invitation.invited_by)
       .single();

     invitedByUser = profile;
   }

   let auditLogs = [];
   try {
     const { data: logs } = await supabase
       .from('t_invitation_audit_log')
       .select('*')
       .eq('invitation_id', invitationId)
       .order('performed_at', { ascending: false });

     auditLogs = logs || [];
   } catch (auditError) {
     console.log('Audit log table might not exist, skipping audit logs');
   }

   return new Response(
     JSON.stringify({
       ...invitation,
       invited_by_user: invitedByUser,
       audit_logs: auditLogs
     }),
     { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
   );
 } catch (error) {
   console.error('Error fetching invitation:', error);
   return new Response(
     JSON.stringify({ error: error.message || 'Failed to fetch invitation' }),
     { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
   );
 }
}

// Create new invitation - NOW USES JTD
async function createInvitation(supabase: any, tenantId: string, userId: string, body: any) {
 try {
   const { email, mobile_number, country_code, phone_code, invitation_method, role_id, custom_message } = body;

   if (!email && !mobile_number) {
     return new Response(
       JSON.stringify({ error: 'Either email or mobile number is required' }),
       { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
     );
   }

   // Check if user already exists with this email/phone
   if (email) {
     const { data: existingUser } = await supabase
       .from('t_user_profiles')
       .select('id, user_id')
       .eq('email', email)
       .single();

     if (existingUser) {
       const { data: existingAccess } = await supabase
         .from('t_user_tenants')
         .select('id')
         .eq('user_id', existingUser.user_id)
         .eq('tenant_id', tenantId)
         .single();

       if (existingAccess) {
         return new Response(
           JSON.stringify({ error: 'User already has access to this workspace' }),
           { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
         );
       }
     }
   }

   // Check for existing pending invitation
   let existingInviteQuery = supabase
     .from('t_user_invitations')
     .select('id')
     .eq('tenant_id', tenantId)
     .in('status', ['pending', 'sent', 'resent']);

   if (email) {
     existingInviteQuery = existingInviteQuery.eq('email', email);
   } else {
     existingInviteQuery = existingInviteQuery.eq('mobile_number', mobile_number);
   }

   const { data: existingInvite } = await existingInviteQuery.single();

   if (existingInvite) {
     return new Response(
       JSON.stringify({ error: 'An invitation is already pending for this user' }),
       { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
     );
   }

   // Generate invitation codes
   const userCode = generateUserCode(8);
   const secretCode = generateSecretCode(5);
   const invitationLink = generateInvitationLink(userCode, secretCode);

   // Create invitation record
   const invitationData = {
     tenant_id: tenantId,
     invited_by: userId,
     user_code: userCode,
     secret_code: secretCode,
     email: email || null,
     mobile_number: mobile_number || null,
     country_code: country_code || null,
     phone_code: phone_code || null,
     invitation_method: invitation_method || 'email',
     status: 'pending',
     created_by: userId,
     expires_at: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
     metadata: {
       intended_role: role_id ? { role_id } : null,
       custom_message: custom_message || null,
       invitation_url: invitationLink,
       delivery: {}
     }
   };

   const { data: invitation, error } = await supabase
     .from('t_user_invitations')
     .insert(invitationData)
     .select()
     .single();

   if (error) {
     console.error('Error creating invitation:', error);
     throw error;
   }

   await logAuditTrail(supabase, invitation.id, 'created', userId, {
     invitation_method,
     recipient: email || mobile_number
   });

   // Get inviter details
   const { data: inviterProfile } = await supabase
     .from('t_user_profiles')
     .select('first_name, last_name')
     .eq('user_id', userId)
     .single();

   // Get tenant details
   const { data: tenant } = await supabase
     .from('t_tenants')
     .select('name, workspace_code')
     .eq('id', tenantId)
     .single();

   // ============================================================
   // SEND VIA JTD (replaces direct MSG91 calls)
   // ============================================================
   let sendSuccess = false;
   let sendError = null;
   let jtdId = null;
   let skipped = false;

   try {
     console.log('📨 Sending invitation via JTD:', invitation_method);

     const recipientMobile = mobile_number
       ? (phone_code ? `${phone_code}${mobile_number}` : mobile_number)
       : undefined;

     const result = await sendInvitation(supabase, {
       tenantId,
       invitationId: invitation.id,
       invitationMethod: invitation_method || 'email',
       recipientEmail: email,
       recipientMobile: recipientMobile,
       inviterName: `${inviterProfile?.first_name || 'Someone'} ${inviterProfile?.last_name || ''}`.trim(),
       workspaceName: tenant?.name || 'Workspace',
       invitationLink,
       customMessage: custom_message
     });

     sendSuccess = result.success;
     jtdId = result.jtdId;
     skipped = result.skipped || false;

     if (result.error && !result.skipped) {
       sendError = result.error;
     }

     console.log('📨 JTD result:', { success: sendSuccess, jtdId, skipped });

   } catch (error) {
     console.error('Error creating JTD:', error);
     sendError = error.message;
   }

   // Update invitation status based on JTD creation result
   if (sendSuccess && !skipped) {
     await supabase
       .from('t_user_invitations')
       .update({
         status: 'sent',
         sent_at: new Date().toISOString(),
         metadata: {
           ...invitation.metadata,
           delivery: {
             status: 'queued',
             method: invitation_method,
             jtd_id: jtdId,
             queued_at: new Date().toISOString()
           }
         }
       })
       .eq('id', invitation.id);

     await logAuditTrail(supabase, invitation.id, 'sent', userId, {
       method: invitation_method,
       recipient: email || mobile_number,
       jtd_id: jtdId
     });
   } else if (skipped) {
     // Channel disabled - update metadata but keep pending
     await supabase
       .from('t_user_invitations')
       .update({
         metadata: {
           ...invitation.metadata,
           delivery: {
             status: 'skipped',
             method: invitation_method,
             reason: `Channel ${invitation_method} is disabled for this tenant`,
             skipped_at: new Date().toISOString()
           }
         }
       })
       .eq('id', invitation.id);
   } else {
     // Failed to create JTD
     await supabase
       .from('t_user_invitations')
       .update({
         metadata: {
           ...invitation.metadata,
           delivery: {
             status: 'failed',
             method: invitation_method,
             error: sendError,
             attempted_at: new Date().toISOString()
           }
         }
       })
       .eq('id', invitation.id);
   }

   return new Response(
     JSON.stringify({
       ...invitation,
       invitation_link: invitationLink,
       send_status: skipped ? 'skipped' : (sendSuccess ? 'queued' : 'failed'),
       send_error: sendError,
       jtd_id: jtdId
     }),
     { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
   );
 } catch (error) {
   console.error('Error creating invitation:', error);
   return new Response(
     JSON.stringify({ error: error.message || 'Failed to create invitation' }),
     { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
   );
 }
}

// Resend invitation - NOW USES JTD
async function resendInvitation(supabase: any, tenantId: string, userId: string, invitationId: string) {
 try {
   const { data: invitation, error } = await supabase
     .from('t_user_invitations')
     .select('*')
     .eq('id', invitationId)
     .eq('tenant_id', tenantId)
     .single();

   if (error || !invitation) {
     return new Response(
       JSON.stringify({ error: 'Invitation not found' }),
       { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
     );
   }

   if (!['pending', 'sent', 'resent'].includes(invitation.status)) {
     return new Response(
       JSON.stringify({ error: 'Cannot resend invitation in current status' }),
       { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
     );
   }

   // Update invitation
   const { error: updateError } = await supabase
     .from('t_user_invitations')
     .update({
       status: 'resent',
       resent_count: (invitation.resent_count || 0) + 1,
       last_resent_at: new Date().toISOString(),
       last_resent_by: userId,
       expires_at: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString()
     })
     .eq('id', invitationId);

   if (updateError) {
     console.error('Error updating invitation:', updateError);
     throw updateError;
   }

   await logAuditTrail(supabase, invitationId, 'resent', userId, {
     resent_count: (invitation.resent_count || 0) + 1,
     method: invitation.invitation_method
   });

   // Get inviter profile
   const { data: inviterProfile } = await supabase
     .from('t_user_profiles')
     .select('first_name, last_name')
     .eq('user_id', userId)
     .single();

   // Get tenant details
   const { data: tenant } = await supabase
     .from('t_tenants')
     .select('name, workspace_code')
     .eq('id', tenantId)
     .single();

   const invitationLink = generateInvitationLink(invitation.user_code, invitation.secret_code);

   // ============================================================
   // RESEND VIA JTD
   // ============================================================
   let sendSuccess = false;
   let sendError = null;
   let jtdId = null;

   try {
     console.log('📨 Resending invitation via JTD:', invitation.invitation_method);

     const recipientMobile = invitation.mobile_number
       ? (invitation.phone_code ? `${invitation.phone_code}${invitation.mobile_number}` : invitation.mobile_number)
       : undefined;

     const result = await sendInvitation(supabase, {
       tenantId,
       invitationId: invitation.id,
       invitationMethod: invitation.invitation_method,
       recipientEmail: invitation.email,
       recipientMobile: recipientMobile,
       inviterName: `${inviterProfile?.first_name || 'Someone'} ${inviterProfile?.last_name || ''}`.trim(),
       workspaceName: tenant?.name || 'Workspace',
       invitationLink,
       customMessage: invitation.metadata?.custom_message
     });

     sendSuccess = result.success;
     jtdId = result.jtdId;

     if (result.error && !result.skipped) {
       sendError = result.error;
     }

     console.log('📨 Resend JTD result:', { success: sendSuccess, jtdId });
   } catch (error) {
     console.error('Error resending via JTD:', error);
     sendError = error.message;
   }

   // Update metadata with send status
   if (sendSuccess) {
     await supabase
       .from('t_user_invitations')
       .update({
         sent_at: new Date().toISOString(),
         metadata: {
           ...invitation.metadata,
           delivery: {
             status: 'queued',
             method: invitation.invitation_method,
             jtd_id: jtdId,
             queued_at: new Date().toISOString(),
             resend_count: (invitation.resent_count || 0) + 1
           }
         }
       })
       .eq('id', invitationId);
   }

   return new Response(
     JSON.stringify({
       success: true,
       message: 'Invitation resent successfully',
       invitation_link: invitationLink,
       jtd_id: jtdId
     }),
     { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
   );
 } catch (error) {
   console.error('Error resending invitation:', error);
   return new Response(
     JSON.stringify({ error: error.message || 'Failed to resend invitation' }),
     { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
   );
 }
}

// Cancel invitation
async function cancelInvitation(supabase: any, tenantId: string, userId: string, invitationId: string) {
 try {
   const { data: invitation, error } = await supabase
     .from('t_user_invitations')
     .select('*')
     .eq('id', invitationId)
     .eq('tenant_id', tenantId)
     .single();

   if (error || !invitation) {
     return new Response(
       JSON.stringify({ error: 'Invitation not found' }),
       { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
     );
   }

   if (['accepted', 'cancelled'].includes(invitation.status)) {
     return new Response(
       JSON.stringify({ error: 'Cannot cancel invitation in current status' }),
       { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
     );
   }

   const { error: updateError } = await supabase
     .from('t_user_invitations')
     .update({
       status: 'cancelled',
       cancelled_at: new Date().toISOString(),
       cancelled_by: userId
     })
     .eq('id', invitationId);

   if (updateError) {
     console.error('Error cancelling invitation:', updateError);
     throw updateError;
   }

   await logAuditTrail(supabase, invitationId, 'cancelled', userId, {
     previous_status: invitation.status
   });

   return new Response(
     JSON.stringify({ success: true, message: 'Invitation cancelled successfully' }),
     { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
   );
 } catch (error) {
   console.error('Error cancelling invitation:', error);
   return new Response(
     JSON.stringify({ error: error.message || 'Failed to cancel invitation' }),
     { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
   );
 }
}

// Validate invitation (public endpoint)
async function validateInvitation(supabase: any, data: any) {
  try {
    const { user_code, secret_code } = data;

    const { data: invitation, error } = await supabase
      .from('t_user_invitations')
      .select(`
        *,
        t_tenants!inner(
          id,
          name,
          workspace_code,
          domain,
          status
        )
      `)
      .eq('user_code', user_code)
      .eq('secret_code', secret_code)
      .single();

    if (error || !invitation) {
      return new Response(
        JSON.stringify({
          valid: false,
          error: 'Invalid invitation code'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const isExpired = new Date(invitation.expires_at) < new Date();

    if (isExpired) {
      return new Response(
        JSON.stringify({
          valid: false,
          error: 'This invitation has expired'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (invitation.status === 'cancelled') {
      return new Response(
        JSON.stringify({
          valid: false,
          error: 'This invitation has been cancelled'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (invitation.status === 'accepted') {
      return new Response(
        JSON.stringify({
          valid: false,
          error: 'This invitation has already been accepted'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user exists
    let userExists = false;
    let userId = null;

    if (invitation.email) {
      const { data: authUsers } = await supabase.auth.admin.listUsers({
        filter: `email.eq.${invitation.email}`,
        page: 1,
        perPage: 1
      });

      if (authUsers?.users?.length > 0) {
        userExists = true;
        userId = authUsers.users[0].id;
      }
    } else if (invitation.mobile_number) {
      const { data: profile } = await supabase
        .from('t_user_profiles')
        .select('user_id')
        .eq('mobile_number', invitation.mobile_number)
        .single();

      if (profile) {
        userExists = true;
        userId = profile.user_id;
      }
    }

    return new Response(
      JSON.stringify({
        valid: true,
        invitation: {
          id: invitation.id,
          email: invitation.email,
          mobile_number: invitation.mobile_number,
          tenant: {
            id: invitation.t_tenants.id,
            name: invitation.t_tenants.name,
            workspace_code: invitation.t_tenants.workspace_code
          },
          user_exists: userExists,
          user_id: userId,
          status: invitation.status,
          expires_at: invitation.expires_at,
          metadata: invitation.metadata
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error validating invitation:', error);
    return new Response(
      JSON.stringify({
        valid: false,
        error: 'Failed to validate invitation'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

// Accept invitation
async function acceptInvitation(supabase: any, data: any) {
  try {
    const { user_code, secret_code, user_id, email } = data;

    const { data: invitation, error: inviteError } = await supabase
      .from('t_user_invitations')
      .select('*, t_tenants!inner(id, name, workspace_code)')
      .eq('user_code', user_code)
      .eq('secret_code', secret_code)
      .single();

    if (inviteError || !invitation) {
      return new Response(
        JSON.stringify({ error: 'Invalid invitation' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (invitation.status === 'accepted') {
      return new Response(
        JSON.stringify({ error: 'Invitation already accepted' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (invitation.status === 'cancelled') {
      return new Response(
        JSON.stringify({ error: 'Invitation has been cancelled' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (new Date(invitation.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ error: 'Invitation has expired' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let actualUserId = user_id;

    if (!actualUserId && email) {
      const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers({
        filter: `email.eq.${email}`,
        page: 1,
        perPage: 1
      });

      if (!authError && authUsers?.users?.length > 0) {
        actualUserId = authUsers.users[0].id;
      } else {
        const { data: profile } = await supabase
          .from('t_user_profiles')
          .select('user_id')
          .eq('email', email)
          .single();

        if (profile) {
          actualUserId = profile.user_id;
        }
      }
    }

    if (!actualUserId) {
      return new Response(
        JSON.stringify({ error: 'User not found. Please ensure you have an account.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: existingAccess } = await supabase
      .from('t_user_tenants')
      .select('id')
      .eq('user_id', actualUserId)
      .eq('tenant_id', invitation.tenant_id)
      .single();

    if (existingAccess) {
      return new Response(
        JSON.stringify({ error: 'You already have access to this workspace' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { error: updateError } = await supabase
      .from('t_user_invitations')
      .update({
        status: 'accepted',
        accepted_at: new Date().toISOString(),
        accepted_by: actualUserId
      })
      .eq('id', invitation.id);

    if (updateError) {
      throw updateError;
    }

    const { data: userTenant, error: tenantError } = await supabase
      .from('t_user_tenants')
      .insert({
        user_id: actualUserId,
        tenant_id: invitation.tenant_id,
        is_default: false,
        status: 'active'
      })
      .select()
      .single();

    if (tenantError) {
      await supabase
        .from('t_user_invitations')
        .update({ status: 'sent' })
        .eq('id', invitation.id);

      throw tenantError;
    }

    if (invitation.metadata?.role_id && userTenant) {
      await supabase
        .from('t_user_tenant_roles')
        .insert({
          user_tenant_id: userTenant.id,
          role_id: invitation.metadata.role_id
        });
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Invitation accepted successfully',
        tenant: invitation.t_tenants
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error accepting invitation:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to accept invitation' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

// Accept invitation for existing user
async function acceptInvitationExistingUser(supabase: any, userId: string, body: any) {
  try {
    const { user_code, secret_code } = body;

    const { data: invitation, error: inviteError } = await supabase
      .from('t_user_invitations')
      .select('*, t_tenants!inner(id, name, workspace_code)')
      .eq('user_code', user_code)
      .eq('secret_code', secret_code)
      .single();

    if (inviteError || !invitation) {
      return new Response(
        JSON.stringify({ error: 'Invalid invitation' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (invitation.status === 'accepted') {
      return new Response(
        JSON.stringify({ error: 'Invitation already accepted' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (invitation.status === 'cancelled') {
      return new Response(
        JSON.stringify({ error: 'Invitation has been cancelled' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (new Date(invitation.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ error: 'Invitation has expired' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: existingAccess } = await supabase
      .from('t_user_tenants')
      .select('id')
      .eq('user_id', userId)
      .eq('tenant_id', invitation.tenant_id)
      .single();

    if (existingAccess) {
      return new Response(
        JSON.stringify({ error: 'You already have access to this workspace' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { error: updateError } = await supabase
      .from('t_user_invitations')
      .update({
        status: 'accepted',
        accepted_at: new Date().toISOString(),
        accepted_by: userId
      })
      .eq('id', invitation.id);

    if (updateError) {
      throw updateError;
    }

    const { data: userTenant, error: tenantError } = await supabase
      .from('t_user_tenants')
      .insert({
        user_id: userId,
        tenant_id: invitation.tenant_id,
        is_default: false,
        status: 'active'
      })
      .select()
      .single();

    if (tenantError) {
      await supabase
        .from('t_user_invitations')
        .update({ status: 'sent' })
        .eq('id', invitation.id);

      throw tenantError;
    }

    if (invitation.metadata?.role_id && userTenant) {
      await supabase
        .from('t_user_tenant_roles')
        .insert({
          user_tenant_id: userTenant.id,
          role_id: invitation.metadata.role_id
        });
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Invitation accepted successfully',
        tenant: invitation.t_tenants
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error accepting invitation:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to accept invitation' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

// Helper functions
function generateUserCode(length: number = 8): string {
 return nanoid(length).toUpperCase();
}

function generateSecretCode(length: number = 5): string {
 return nanoid(length).toUpperCase();
}

function generateInvitationLink(userCode: string, secretCode: string): string {
 const baseUrl = Deno.env.get('FRONTEND_URL') || 'http://localhost:3000';
 return `${baseUrl}/accept-invitation?code=${userCode}&secret=${secretCode}`;
}

function getTimeRemaining(expiresAt: string): string {
 const now = new Date();
 const expiry = new Date(expiresAt);
 const diff = expiry.getTime() - now.getTime();

 if (diff <= 0) return 'Expired';

 const hours = Math.floor(diff / (1000 * 60 * 60));
 const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

 if (hours > 24) {
   const days = Math.floor(hours / 24);
   return `${days} day${days > 1 ? 's' : ''} remaining`;
 }

 return `${hours}h ${minutes}m remaining`;
}

async function logAuditTrail(
 supabase: any,
 invitationId: string,
 action: string,
 performedBy: string,
 metadata: any = {}
) {
 try {
   await supabase
     .from('t_invitation_audit_log')
     .insert({
       invitation_id: invitationId,
       action,
       performed_by: performedBy,
       performed_at: new Date().toISOString(),
       metadata
     });
 } catch (error) {
   console.log('Audit log table might not exist, skipping audit log');
 }
}
