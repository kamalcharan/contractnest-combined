-- RUN ONLY AFTER jtd-worker IS REDEPLOYED FROM THIS BATCH.
--
-- Until the deployed worker reads n_jtd_templates.variables for the declared
-- order, it falls back to Object.values() over a jsonb column, whose key order
-- Postgres does not preserve. Measured on these exact rows, deployed v35 sends:
--   visit_slot_request       -> link, slot_text, tenant_name, service_name, customer_name
--   service_visit_scheduled  -> visit_date, tenant_name, service_name, customer_name
--   service_visit_started    -> tenant_name, service_name, customer_name, technician_name
--   service_visit_completed  -> tenant_name, customer_name, ticket_number, assets_serviced
-- against {{1}}..{{N}}. MSG91 returns success and the row reads 'sent'.
--
-- service_visit_scheduled/started/completed fire from AUTOMATIC triggers
-- (appointment accept, ticket start, ticket complete), so wiring them early
-- sends scrambled text to real customers with no human in the loop.

BEGIN;

UPDATE n_jtd_templates SET provider_template_id = 'visit_slot_request', updated_at = now()
 WHERE tenant_id IS NULL AND template_key = 'visit_slot_request_whatsapp';

UPDATE n_jtd_templates SET provider_template_id = 'service_visit_scheduled', updated_at = now()
 WHERE tenant_id IS NULL AND template_key = 'service_visit_scheduled';

UPDATE n_jtd_templates SET provider_template_id = 'service_visit_started', updated_at = now()
 WHERE tenant_id IS NULL AND template_key = 'service_visit_started';

UPDATE n_jtd_templates SET provider_template_id = 'service_visit_completed', updated_at = now()
 WHERE tenant_id IS NULL AND template_key = 'service_visit_completed';

DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM n_jtd_templates
   WHERE tenant_id IS NULL AND channel_code = 'whatsapp'
     AND template_key IN ('visit_slot_request_whatsapp','service_visit_scheduled',
                          'service_visit_started','service_visit_completed')
     AND provider_template_id IS NOT NULL;
  IF n <> 4 THEN RAISE EXCEPTION 'expected 4 wired WhatsApp templates, found %', n; END IF;
END $$;

COMMIT;

-- After this, jtd_ops_board's ask_channels gains 'whatsapp' automatically
-- (it is computed as: provider_template_id IS NOT NULL), so the WhatsApp
-- "Ask" button appears on the board with no deploy.
