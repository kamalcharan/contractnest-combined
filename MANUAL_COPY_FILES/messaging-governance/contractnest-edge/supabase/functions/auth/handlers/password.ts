// supabase/functions/auth/handlers/password.ts
import { corsHeaders } from '../utils/cors.ts';
import { errorResponse, successResponse } from '../utils/helpers.ts';
import { validateEmail } from '../utils/validation.ts';

export async function handleResetPassword(supabase: any, data: any) {
  const { email } = data;
  
  if (!email) {
    return errorResponse('Email is required');
  }

  if (!validateEmail(email)) {
    return errorResponse('Invalid email format');
  }

  try {
    console.log('Attempting to send password reset email to:', email);
    
    const frontendUrl = Deno.env.get('FRONTEND_URL') || 'http://localhost:5173';
    
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${frontendUrl}/auth/reset-password`
    });

    if (error) {
      console.error('Password reset email error:', error.message);
      throw error;
    }

    console.log('Password reset email sent successfully');

    // Audit trail (owner decision 2026-07-22): password reset is an
    // identity-message exception — it always sends via Supabase Auth's own
    // delivery (never through JTD/MSG91, since it carries a Supabase-signed
    // magic link only Supabase itself can generate) — but every outbound
    // message must still be visible in the JTD audit trail. This inserts an
    // AUDIT-ONLY record after the fact with a terminal status_code, so
    // trg_jtd_enqueue (which only queues rows inserted with
    // status_code='created') never picks it up — nothing is dispatched a
    // second time. Best-effort: never let audit logging break the actual
    // reset flow, and skip quietly if the email doesn't match a known user
    // (Supabase's own response already avoids revealing whether an account
    // exists, so this preserves that).
    try {
      const { data: profile } = await supabase
        .from('t_user_profiles')
        .select('user_id')
        .eq('email', email)
        .maybeSingle();

      if (profile?.user_id) {
        const { data: userTenant } = await supabase
          .from('t_user_tenants')
          .select('tenant_id')
          .eq('user_id', profile.user_id)
          .eq('is_default', true)
          .maybeSingle();

        if (userTenant?.tenant_id) {
          await supabase.from('n_jtd').insert({
            tenant_id: userTenant.tenant_id,
            event_type_code: 'notification',
            channel_code: 'email',
            source_type_code: 'password_reset',
            recipient_type: 'user',
            recipient_id: profile.user_id,
            recipient_contact: email,
            status_code: 'delivered',
            template_key: 'password_reset_email_v1',
            performed_by_type: 'system',
            performed_by_name: 'Supabase Auth',
            is_live: true,
            metadata: {
              delivered_via: 'supabase_auth',
              note: 'Identity message — exempt from rules+integrations gate; delivered directly by Supabase Auth. This row is audit-only and was never queued.'
            }
          });
        }
      }
    } catch (auditError: any) {
      console.error('Password reset audit log failed (non-fatal):', auditError?.message);
    }

    return successResponse({ message: 'Password reset email sent' });
  } catch (error: any) {
    console.error('Password reset process error:', error.message);
    return errorResponse(error.message, 500);
  }
}

export async function handleChangePassword(supabase: any, data: any) {
  const { current_password, new_password } = data;
  
  if (!current_password || !new_password) {
    return errorResponse('Current and new passwords are required');
  }

  try {
    console.log('Attempting to change password');
    
    // Get user from JWT
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('User not found');
    }

    console.log('Verifying current password for user:', user.id);

    // Verify current password
    const { error: verifyError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: current_password
    });

    if (verifyError) {
      console.error('Current password verification failed:', verifyError.message);
      return errorResponse('Current password is incorrect');
    }

    console.log('Current password verified, updating to new password');

    // Update password
    const { error: updateError } = await supabase.auth.updateUser({
      password: new_password
    });

    if (updateError) {
      console.error('Password update error:', updateError.message);
      throw updateError;
    }

    console.log('Password updated successfully');
    return successResponse({ message: 'Password updated successfully' });
  } catch (error: any) {
    console.error('Password change process error:', error.message);
    return errorResponse(error.message, 500);
  }
}

export async function handleVerifyPassword(supabaseAdmin: any, authHeader: string | null, data: any) {
  const { password } = data;
  
  if (!password) {
    return errorResponse('Password is required');
  }

  if (!authHeader) {
    return errorResponse('Authentication required', 401);
  }

  try {
    // Get user from token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    
    if (userError || !user) {
      return errorResponse('Invalid token', 401);
    }

    console.log('Verifying password for user:', user.id);

    // Check if user has email auth method
    const { data: authMethod } = await supabaseAdmin
      .from('t_user_auth_methods')
      .select('auth_type, is_primary')
      .eq('user_id', user.id)
      .eq('auth_type', 'email')
      .single();

    if (!authMethod) {
      return errorResponse('Password authentication not available for this user');
    }

    // Verify password
    const { error: verifyError } = await supabaseAdmin.auth.signInWithPassword({
      email: user.email,
      password: password
    });

    if (verifyError) {
      console.log('Password verification failed');
      return successResponse({ valid: false });
    }

    console.log('Password verified successfully');
    return successResponse({ valid: true });
  } catch (error: any) {
    console.error('Password verification error:', error.message);
    return errorResponse(error.message, 500);
  }
}