-- ============================================================================
-- Make Email / SMS / WhatsApp messaging VISIBLE in /settings/integrations.
--
-- Model (per product decision):
--   * Each channel gets a "ContractNest (Built-in)" provider (platform_managed) —
--     the only working path today (JTD → MSG91). Shown as active / no setup.
--   * Bring-your-own providers (SendGrid, Twilio, Meta, Gupshup) are shown as
--     "Coming soon" — visible but LOCKED (no credential entry), so nobody can
--     save creds the JTD worker does not yet honour.
--   * NO dispatch/worker changes. This is visibility only.
--
-- Idempotent: safe to run more than once.
-- Catalog is GLOBAL — this affects every tenant's settings page.
-- ============================================================================

-- 1) Ensure the WhatsApp integration type exists
insert into t_integration_types (name, display_name, description, icon_name, is_active)
select 'whatsapp_service', 'WhatsApp', 'WhatsApp Business messaging', 'message-circle', true
where not exists (select 1 from t_integration_types where name = 'whatsapp_service');

-- 2) Make Email / SMS / WhatsApp sections visible
update t_integration_types
set is_active = true, updated_at = now()
where name in ('email_service', 'sms_service', 'whatsapp_service');

-- 3) "ContractNest (Built-in)" provider per channel — the active, no-setup path
insert into t_integration_providers (type_id, name, display_name, description, is_active, config_schema, metadata)
select t.id, p.name, p.display_name, p.description, true, '{"fields": []}'::jsonb, '{"platform_managed": true}'::jsonb
from (values
  ('email_service',    'contractnest_email',    'ContractNest Email (Built-in)',    'Send emails through ContractNest. No setup required — included with your workspace.'),
  ('sms_service',      'contractnest_sms',      'ContractNest SMS (Built-in)',      'Send SMS through ContractNest. No setup required — included with your workspace.'),
  ('whatsapp_service', 'contractnest_whatsapp', 'ContractNest WhatsApp (Built-in)', 'Send WhatsApp messages through ContractNest. No setup required — included with your workspace.')
) as p(type_name, name, display_name, description)
join t_integration_types t on t.name = p.type_name
where not exists (select 1 from t_integration_providers ip where ip.name = p.name);

-- 4a) Existing BYO providers → "Coming soon" (keep their schema for later enablement)
update t_integration_providers
set metadata = coalesce(metadata, '{}'::jsonb) || '{"coming_soon": true}'::jsonb, updated_at = now()
where name in ('sendgrid', 'twilio');

-- 4b) New WhatsApp BYO providers (locked, coming soon)
insert into t_integration_providers (type_id, name, display_name, description, is_active, config_schema, metadata)
select t.id, p.name, p.display_name, p.description, true, p.config_schema::jsonb, p.metadata::jsonb
from (values
  ('whatsapp_service', 'meta_whatsapp', 'Meta WhatsApp Cloud API',
   'Use your own Meta WhatsApp Business (Cloud API) account.',
   '{"fields":[{"name":"phone_number_id","type":"text","required":true,"sensitive":false,"display_name":"Phone Number ID"},{"name":"access_token","type":"password","required":true,"sensitive":true,"display_name":"Access Token"},{"name":"waba_id","type":"text","required":false,"sensitive":false,"display_name":"WhatsApp Business Account ID"}]}',
   '{"coming_soon": true}'),
  ('whatsapp_service', 'gupshup', 'Gupshup',
   'Use your own Gupshup WhatsApp account.',
   '{"fields":[{"name":"api_key","type":"password","required":true,"sensitive":true,"display_name":"API Key"},{"name":"app_name","type":"text","required":true,"sensitive":false,"display_name":"App Name"},{"name":"source_number","type":"text","required":true,"sensitive":false,"display_name":"Source Number"}]}',
   '{"coming_soon": true}')
) as p(type_name, name, display_name, description, config_schema, metadata)
join t_integration_types t on t.name = p.type_name
where not exists (select 1 from t_integration_providers ip where ip.name = p.name);

-- ROLLBACK (if ever needed):
--   update t_integration_types set is_active = false where name in ('email_service','sms_service','whatsapp_service');
--   -- (built-in + byo whatsapp rows can be left; they only render when the type is active)
