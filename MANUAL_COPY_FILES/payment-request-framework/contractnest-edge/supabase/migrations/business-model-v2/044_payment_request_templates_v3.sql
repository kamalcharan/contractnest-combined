-- 044 — payment request: approved MSG91 templates (2026-10-05)
--   email     payment_request_email_v3   (HTML, same six variables as v2)
--   whatsapp  payment_request_button_v1  (positional body {{1}}-{{4}} =
--             customer_name, tenant_name, invoice_number, amount; "Pay now"
--             URL button https://www.contractnest.com/contract-review{{1}})
-- The WhatsApp source-type row stays on payment_request_v2 (text + link,
-- optional QR header) — the fallback when an invoice has no private pay page.
-- fn_enqueue_invoice_notification picks the button template per message via
-- metadata.whatsapp_template_override when the pay link is the pay page.

-- 1. Email: global seed row + every tenant copy.
UPDATE public.n_jtd_templates
   SET provider_template_id = 'payment_request_email_v3'
 WHERE source_type_code = 'payment_request'
   AND channel_code = 'email'
   AND provider_template_id = 'payment_request_email_v2';

-- 2. WhatsApp: button template when the pay page exists.
DO $$
DECLARE
  v_def text;
  v_new text;
BEGIN
  SELECT pg_get_functiondef(p.oid) INTO v_def
    FROM pg_proc p WHERE p.proname = 'fn_enqueue_invoice_notification';

  v_new := v_def;

  v_new := replace(v_new,
    '  v_rule_on     boolean;',
    '  v_rule_on     boolean;
  v_suffix      text;');

  v_new := replace(v_new,
    '                     ELSE ''payment_request_email'' END;',
    '                     ELSE ''payment_request_email'' END;

  -- The private pay page ("?cnak=...&secret=...") rides the approved
  -- "Pay now" button template; anything else keeps the text template.
  v_suffix := substring(COALESCE(p_payment_link, '''')
                        from ''/contract-review(\?cnak=CNAK-[A-Za-z0-9-]+&secret=[A-Za-z0-9]+)$'');');

  v_new := replace(v_new,
    '        ''pay_line'',       v_pay->>''pay_line'')
    ELSE',
    '        ''pay_line'',       v_pay->>''pay_line'')
      || CASE WHEN v_suffix IS NOT NULL
              THEN jsonb_build_object(''pay_link_suffix'', v_suffix)
              ELSE ''{}''::jsonb END
    ELSE');

  v_new := replace(v_new,
    '    CASE WHEN p_channel = ''whatsapp'' AND p_qr_url IS NOT NULL',
    '    CASE WHEN p_channel = ''whatsapp'' AND v_suffix IS NOT NULL
         THEN jsonb_build_object(''whatsapp_template_override'', ''payment_request_button_v1'')
         WHEN p_channel = ''whatsapp'' AND p_qr_url IS NOT NULL');

  IF (length(v_new) - length(replace(v_new, 'v_suffix', ''))) / length('v_suffix') <> 5 THEN
    RAISE EXCEPTION '044: anchor rewrite did not land (v_suffix count %)',
      (length(v_new) - length(replace(v_new, 'v_suffix', ''))) / length('v_suffix');
  END IF;

  EXECUTE v_new;
END $$;
