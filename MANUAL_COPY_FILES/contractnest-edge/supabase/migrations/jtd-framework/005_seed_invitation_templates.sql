-- 005_seed_invitation_templates.sql
-- Seed JTD templates for user invitation notifications
-- Part of JTD Framework

-- ============================================================
-- USER INVITATION TEMPLATES
-- ============================================================

-- Email template for user invitation
INSERT INTO public.n_jtd_templates (
    event_type,
    channel,
    tenant_id,
    name,
    subject,
    body,
    variables,
    is_active,
    created_by,
    updated_by
) VALUES (
    'notification',
    'email',
    NULL, -- System template (applies to all tenants)
    'user_invitation_email',
    'You''re invited to join {{workspace_name}}',
    '<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Invitation to {{workspace_name}}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f5f5f5;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
        <div style="background-color: #4F46E5; color: white; padding: 30px; text-align: center;">
            <h1 style="margin: 0;">You''re Invited!</h1>
        </div>
        <div style="padding: 40px;">
            <p>Hi {{recipient_name}},</p>
            <p><strong>{{inviter_name}}</strong> has invited you to join <strong>{{workspace_name}}</strong>.</p>
            {{#custom_message}}
            <div style="background-color: #EEF2FF; padding: 15px; margin: 20px 0; border-radius: 4px;">
                <p style="margin: 0;">{{custom_message}}</p>
            </div>
            {{/custom_message}}
            <div style="text-align: center; margin: 40px 0;">
                <a href="{{invitation_link}}" style="background-color: #4F46E5; color: white; padding: 14px 30px; text-decoration: none; border-radius: 6px; display: inline-block;">Accept Invitation</a>
            </div>
            <p style="font-size: 14px; color: #666;">This invitation expires in 48 hours.</p>
            <p style="font-size: 14px; color: #666;">If you can''t click the button, copy this link: {{invitation_link}}</p>
        </div>
        <div style="background-color: #f9fafb; padding: 20px; text-align: center; font-size: 12px; color: #666;">
            <p style="margin: 0;">Powered by ContractNest</p>
        </div>
    </div>
</body>
</html>',
    '["recipient_name", "inviter_name", "workspace_name", "invitation_link", "custom_message"]'::jsonb,
    true,
    '00000000-0000-0000-0000-000000000001', -- VaNi
    '00000000-0000-0000-0000-000000000001'
) ON CONFLICT (event_type, channel, tenant_id) WHERE tenant_id IS NULL
DO UPDATE SET
    body = EXCLUDED.body,
    subject = EXCLUDED.subject,
    variables = EXCLUDED.variables,
    updated_at = now();

-- SMS template for user invitation
INSERT INTO public.n_jtd_templates (
    event_type,
    channel,
    tenant_id,
    name,
    subject,
    body,
    variables,
    is_active,
    created_by,
    updated_by
) VALUES (
    'notification',
    'sms',
    NULL,
    'user_invitation_sms',
    NULL, -- No subject for SMS
    '{{inviter_name}} invited you to join {{workspace_name}}. Accept here: {{invitation_link}}',
    '["inviter_name", "workspace_name", "invitation_link"]'::jsonb,
    true,
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001'
) ON CONFLICT (event_type, channel, tenant_id) WHERE tenant_id IS NULL
DO UPDATE SET
    body = EXCLUDED.body,
    variables = EXCLUDED.variables,
    updated_at = now();

-- WhatsApp template for user invitation
-- Note: body contains the MSG91/WhatsApp approved template NAME
-- The actual template is configured on MSG91 dashboard
INSERT INTO public.n_jtd_templates (
    event_type,
    channel,
    tenant_id,
    name,
    subject,
    body,
    variables,
    is_active,
    created_by,
    updated_by
) VALUES (
    'notification',
    'whatsapp',
    NULL,
    'user_invitation_whatsapp',
    NULL,
    'user_invitation', -- This is the template NAME on MSG91
    '["inviter_name", "workspace_name", "invitation_link"]'::jsonb,
    true,
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001'
) ON CONFLICT (event_type, channel, tenant_id) WHERE tenant_id IS NULL
DO UPDATE SET
    body = EXCLUDED.body,
    variables = EXCLUDED.variables,
    updated_at = now();

-- ============================================================
-- SEED TENANT CONFIG FOR USER INVITE
-- Enable all channels for user_invite by default for test tenants
-- ============================================================

-- Note: Tenant configs already seeded in 004_rls_policies.sql
-- Here we add source_type specific configs

-- For tenant 1: Enable email, sms, whatsapp for user_invite
INSERT INTO public.n_jtd_tenant_source_config (
    tenant_id,
    source_type,
    email_enabled,
    sms_enabled,
    whatsapp_enabled,
    inapp_enabled,
    is_active,
    created_by,
    updated_by
) VALUES (
    '70f8eb69-9ccf-4a0c-8177-cb6131934344',
    'user_invite',
    true,
    true,
    true,
    false, -- No in-app for invite (user doesn't have account yet)
    true,
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001'
) ON CONFLICT (tenant_id, source_type)
DO UPDATE SET
    email_enabled = EXCLUDED.email_enabled,
    sms_enabled = EXCLUDED.sms_enabled,
    whatsapp_enabled = EXCLUDED.whatsapp_enabled,
    updated_at = now();

-- For tenant 2: Enable email, sms, whatsapp for user_invite
INSERT INTO public.n_jtd_tenant_source_config (
    tenant_id,
    source_type,
    email_enabled,
    sms_enabled,
    whatsapp_enabled,
    inapp_enabled,
    is_active,
    created_by,
    updated_by
) VALUES (
    'a58ca91a-7832-4b4c-b67c-a210032f26b8',
    'user_invite',
    true,
    true,
    true,
    false,
    true,
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001'
) ON CONFLICT (tenant_id, source_type)
DO UPDATE SET
    email_enabled = EXCLUDED.email_enabled,
    sms_enabled = EXCLUDED.sms_enabled,
    whatsapp_enabled = EXCLUDED.whatsapp_enabled,
    updated_at = now();

-- ============================================================
-- VERIFICATION
-- ============================================================

DO $$
DECLARE
    template_count INTEGER;
    config_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO template_count
    FROM public.n_jtd_templates
    WHERE name LIKE 'user_invitation%';

    SELECT COUNT(*) INTO config_count
    FROM public.n_jtd_tenant_source_config
    WHERE source_type = 'user_invite';

    RAISE NOTICE 'User invitation templates seeded: %', template_count;
    RAISE NOTICE 'Tenant source configs for user_invite: %', config_count;
END $$;
