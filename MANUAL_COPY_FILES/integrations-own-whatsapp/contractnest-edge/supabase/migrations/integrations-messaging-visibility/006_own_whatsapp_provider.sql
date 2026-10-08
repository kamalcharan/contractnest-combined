-- ============================================================================
-- 006 — WhatsApp: Built-in + one generic "Own WhatsApp number" (batch integrations-own-whatsapp)
-- ============================================================================
-- Data only, no schema change. Settings → Integrations → WhatsApp is schema
-- driven (IntegrationSetupModal / DynamicFormField read config_schema and
-- metadata), so no UI or API code changes.
--
-- Owner decision (2026-10-08): keep ContractNest WhatsApp (Built-in); remove
-- the per-vendor cards; add ONE generic card where a tenant can store any
-- provider's details (provider, number, URL, key …). For now every tenant,
-- signia included, keeps sending through the Built-in number.
--
-- 1. meta_whatsapp and gupshup are hidden (is_active = false, rows kept).
--    Neither had a single tenant row (checked 2026-10-08).
-- 2. own_whatsapp is added. Sensitive fields (api_key, webhook_secret) are
--    stored in the encrypted blob by the integrations edge function, like the
--    Razorpay keys; the rest in the public blob.
-- 3. Honest copy: saving stores the details only. Nothing reads them yet —
--    jtd-worker and the API still send from MSG91_WHATSAPP_NUMBER, and inbound
--    routing by receiving number is not built (WhatsApp spec W6). Built-in's
--    toggle still governs the WhatsApp channel (toggle_integration_status →
--    n_jtd_tenant_config.channels_enabled); own_whatsapp does not touch it.
-- ============================================================================

UPDATE public.t_integration_providers
   SET is_active = false, updated_at = now()
 WHERE name IN ('meta_whatsapp', 'gupshup')
   AND type_id = (SELECT id FROM public.t_integration_types WHERE name = 'whatsapp_service');

INSERT INTO public.t_integration_providers (type_id, name, display_name, description, is_active, config_schema, metadata)
SELECT it.id, 'own_whatsapp', 'Own WhatsApp number',
       'Use your own WhatsApp Business number from any provider (MSG91, Gupshup, Meta Cloud API, Twilio or another). '
       || 'Your details are saved for your workspace. Messages keep going from the ContractNest number until own-number sending is switched on for your workspace.',
       true,
       jsonb_build_object('fields', jsonb_build_array(
         jsonb_build_object('name','provider','type','select','required',true,'sensitive',false,'display_name','Provider',
           'description','The company that runs your WhatsApp Business number.',
           'options', jsonb_build_array(
             jsonb_build_object('label','MSG91','value','msg91'),
             jsonb_build_object('label','Gupshup','value','gupshup'),
             jsonb_build_object('label','Meta WhatsApp Cloud API','value','meta'),
             jsonb_build_object('label','Twilio','value','twilio'),
             jsonb_build_object('label','Other','value','other'))),
         jsonb_build_object('name','business_number','type','text','required',true,'sensitive',false,'display_name','Business WhatsApp number',
           'description','With country code, for example +91 98765 43210.'),
         jsonb_build_object('name','display_name','type','text','required',false,'sensitive',false,'display_name','Display name',
           'description','The name your customers see in WhatsApp, as approved by Meta.'),
         jsonb_build_object('name','api_url','type','text','required',false,'sensitive',false,'display_name','API URL',
           'description','Your provider''s sending endpoint. Leave blank to use the provider''s standard one.'),
         jsonb_build_object('name','api_key','type','password','required',true,'sensitive',true,'display_name','API key / token',
           'description','Stored encrypted and never shown again. To change any detail later, enter the key again.'),
         jsonb_build_object('name','account_id','type','text','required',false,'sensitive',false,'display_name','Account / app ID',
           'description','WhatsApp Business Account ID, Phone Number ID or app name, depending on the provider.'),
         jsonb_build_object('name','webhook_secret','type','password','required',false,'sensitive',true,'display_name','Webhook secret',
           'description','Optional. Lets ContractNest check that incoming messages really come from your provider.')
       )),
       jsonb_build_object(
         'setup_steps', jsonb_build_array(
           'Your number must be a WhatsApp Business API number with your provider, not only the WhatsApp Business app on a phone.',
           'Copy the number, API key and account / app ID from your provider''s dashboard.',
           'Save here. Keep "ContractNest WhatsApp (Built-in)" switched on: messages still go from the ContractNest number until own-number sending is available for your workspace.'
         ))
  FROM public.t_integration_types it
 WHERE it.name = 'whatsapp_service'
   AND NOT EXISTS (SELECT 1 FROM public.t_integration_providers p WHERE p.name = 'own_whatsapp' AND p.type_id = it.id);
