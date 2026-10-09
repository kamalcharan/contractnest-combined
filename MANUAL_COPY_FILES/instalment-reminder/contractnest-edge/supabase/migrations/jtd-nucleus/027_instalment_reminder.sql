-- ============================================================================
-- jtd-nucleus/027 — instalment payment reminder (batch instalment-reminder)
-- ============================================================================
-- POA payments step 5. The WhatsApp Nudge borrowed the invoice template
-- (payment_request_v2, "…has sent you an invoice…"), wrong for an instalment.
-- MSG91 approved payment_instalment_due_v1 (positional, 7 variables):
--   "Hi {{1}}, As per your {{2}} plan with {{3}}, your payment for {{4}} is
--    {{5}}, due on {{6}}. Please pay {{7}}. Thank you!"
--
-- 1. jtd_instalment_message_vars(job, payment_link, upi_id) — THE builder.
--    Every sender of an instalment reminder (Nudge today; the ladder's WhatsApp
--    rung and the WhatsApp assistant later) calls this, nothing else.
--      customer_name  contact company/name as stored (same rule as the nudge)
--      plan           monthly · quarterly · half-yearly · yearly from
--                     t_contracts.metadata.billing_plan; else the contract no.
--      tenant_name    Business Profile name, else tenant name
--      period         monthly "October 2026" · quarterly "Oct to Dec 2026" ·
--                     half-yearly "Oct 2026 to Mar 2027" · yearly likewise;
--                     no plan → block name (+ "instalment n of m")
--      amount         what is still owed, "Rs 4,500" (as stored, no rounding
--                     beyond the rupee, the nudge's existing format)
--      due_date       "01 Oct 2026" (IST)
--      pay_line       gateway link → "using this link: <url>"; UPI → "to UPI ID
--                     <id>", plus " or scan the QR at the meeting, and enter
--                     your UPI reference when you check in" for group-session
--                     contracts; nothing configured → "as agreed with us"
-- 2. jtd_nudge_payment — its WhatsApp variables come from the builder
--    (rewrite in place; the email branch is untouched).
-- 3. payment_nudge_whatsapp template rows (global + 8 tenant copies) point at
--    payment_instalment_due_v1 with its 7 variables in order. The worker's
--    generic path sends by that declared order — no worker change.
-- 4. Scanner STEP 5 (whole-invoice "payment due" email) skips an invoice that
--    carries more than one instalment, so a part-paid member is never told the
--    whole invoice is due.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.jtd_instalment_message_vars(
    p_job_id uuid, p_payment_link text DEFAULT NULL, p_upi_id text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    v_job     record;
    v_c       record;
    v_ev      record;
    v_contact uuid;
    v_name    text;
    v_tenant  text;
    v_owed    numeric;
    v_due     date;
    v_plan    text;
    v_months  integer;
    v_end     date;
    v_period  text;
    v_pay     text;
    v_group   boolean;
BEGIN
    SELECT j.id, j.tenant_id, j.contract_id, j.invoice_id, j.amount, j.amount_settled,
           j.currency, j.scheduled_at, j.block_name
      INTO v_job
      FROM n_jtd j WHERE j.id = p_job_id AND j.event_type_code = 'payment';
    IF NOT FOUND THEN RETURN NULL; END IF;

    SELECT c.contract_number, c.buyer_id, c.buyer_name,
           lower(replace(replace(COALESCE(c.metadata->>'billing_plan', ''), '-', ''), '_', '')) AS plan
      INTO v_c FROM t_contracts c WHERE c.id = v_job.contract_id;

    SELECT e.sequence_number, e.total_occurrences INTO v_ev
      FROM t_contract_events e WHERE e.id = p_job_id;

    SELECT COALESCE(i.contact_id, v_c.buyer_id) INTO v_contact
      FROM (SELECT 1) one LEFT JOIN t_invoices i ON i.id = v_job.invoice_id;
    SELECT COALESCE(NULLIF(TRIM(ct.company_name), ''), NULLIF(TRIM(ct.name), ''), v_c.buyer_name)
      INTO v_name FROM t_contacts ct WHERE ct.id = v_contact;
    v_name := COALESCE(v_name, v_c.buyer_name);

    SELECT COALESCE(NULLIF(TRIM(tp.business_name), ''), NULLIF(TRIM(t.name), ''))
      INTO v_tenant
      FROM t_tenants t LEFT JOIN t_tenant_profiles tp ON tp.tenant_id = t.id
     WHERE t.id = v_job.tenant_id;

    v_owed := GREATEST(COALESCE(v_job.amount, 0) - COALESCE(v_job.amount_settled, 0), 0);
    v_due  := (v_job.scheduled_at AT TIME ZONE 'Asia/Kolkata')::date;

    v_months := CASE v_c.plan
                  WHEN 'monthly' THEN 1 WHEN 'quarterly' THEN 3
                  WHEN 'halfyearly' THEN 6 WHEN 'yearly' THEN 12 WHEN 'annual' THEN 12
                  ELSE NULL END;
    v_plan := CASE v_months WHEN 1 THEN 'monthly' WHEN 3 THEN 'quarterly'
                            WHEN 6 THEN 'half-yearly' WHEN 12 THEN 'yearly'
                            ELSE v_c.contract_number END;

    IF v_months = 1 THEN
        v_period := to_char(v_due, 'FMMonth YYYY');
    ELSIF v_months IS NOT NULL THEN
        v_end := (date_trunc('month', v_due) + make_interval(months => v_months - 1))::date;
        v_period := CASE WHEN extract(year FROM v_due) = extract(year FROM v_end)
                         THEN to_char(v_due, 'Mon') || ' to ' || to_char(v_end, 'Mon YYYY')
                         ELSE to_char(v_due, 'Mon YYYY') || ' to ' || to_char(v_end, 'Mon YYYY') END;
    ELSE
        v_period := COALESCE(NULLIF(TRIM(v_job.block_name), ''), v_c.contract_number)
                 || CASE WHEN COALESCE(v_ev.total_occurrences, 1) > 1
                         THEN ' (instalment ' || v_ev.sequence_number || ' of ' || v_ev.total_occurrences || ')'
                         ELSE '' END;
    END IF;

    v_group := EXISTS (SELECT 1 FROM t_contract_blocks b
                        WHERE b.contract_id = v_job.contract_id
                          AND b.custom_fields->'config'->>'audience' = 'group');
    v_pay := CASE
        WHEN COALESCE(p_payment_link, '') LIKE 'http%' THEN 'using this link: ' || p_payment_link
        WHEN COALESCE(TRIM(p_upi_id), '') <> '' THEN
             'to UPI ID ' || TRIM(p_upi_id)
             || CASE WHEN v_group THEN ' or scan the QR at the meeting, and enter your UPI reference when you check in'
                     ELSE '' END
        ELSE 'as agreed with us' END;

    RETURN jsonb_build_object(
        'customer_name', v_name,
        'plan',          v_plan,
        'tenant_name',   v_tenant,
        'period',        v_period,
        'amount',        CASE WHEN COALESCE(v_job.currency, 'INR') = 'INR' THEN 'Rs ' ELSE v_job.currency || ' ' END
                         || to_char(round(v_owed), 'FM99,99,99,999'),
        'due_date',      to_char(v_due, 'DD Mon YYYY'),
        'pay_line',      v_pay);
END;
$$;

REVOKE ALL ON FUNCTION public.jtd_instalment_message_vars(uuid, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.jtd_instalment_message_vars(uuid, text, text) TO service_role;

-- 2. Nudge: WhatsApp variables from the builder (email branch untouched).
DO $$
DECLARE v_oid oid; v_def text; v_new text;
BEGIN
    SELECT p.oid INTO STRICT v_oid FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public' AND p.proname = 'jtd_nudge_payment';
    v_def := pg_get_functiondef(v_oid);
    IF position('jtd_instalment_message_vars' IN v_def) > 0 THEN
        RETURN;  -- already rewritten
    END IF;
    v_new := regexp_replace(v_def,
        'v_vars := CASE WHEN p_channel = ''whatsapp'' THEN\s+jsonb_build_object\(''customer_name'', v_name, ''tenant_name'', v_tenant,.*?''pay_line'', v_pay->>''pay_line''\)',
        'v_vars := CASE WHEN p_channel = ''whatsapp'' THEN
      public.jtd_instalment_message_vars(p_job_id, p_payment_link, p_upi_id)');
    IF v_new = v_def THEN
        RAISE EXCEPTION '027 nudge: anchor not found';
    END IF;
    EXECUTE v_new;
    v_def := pg_get_functiondef(v_oid);
    IF position('jtd_instalment_message_vars(p_job_id, p_payment_link, p_upi_id)' IN v_def) = 0
       OR position('''payment_link'', COALESCE(p_payment_link, '''')' IN v_def) = 0 THEN
        RAISE EXCEPTION '027 nudge: rewrite did not land as expected';
    END IF;
END $$;

-- 3. Nudge WhatsApp template → the approved instalment template.
UPDATE public.n_jtd_templates t
   SET provider_template_id = 'payment_instalment_due_v1',
       variables  = '["customer_name","plan","tenant_name","period","amount","due_date","pay_line"]'::jsonb,
       content    = (SELECT g.content FROM public.n_jtd_templates g
                      WHERE g.source_type_code = 'payment_instalment_due' AND g.channel_code = 'whatsapp'
                        AND g.tenant_id IS NULL LIMIT 1),
       updated_at = now()
 WHERE t.source_type_code = 'payment_nudge_whatsapp'
   AND t.channel_code = 'whatsapp'
   AND t.provider_template_id = 'payment_request_v2';

-- 4. Scanner STEP 5: no whole-invoice reminder for an invoice with instalments.
DO $$
BEGIN
    IF position('ie.invoice_id = i.id' IN (SELECT prosrc FROM pg_proc WHERE proname = 'run_contract_event_scanner')) > 0 THEN
        RETURN;  -- already rewritten
    END IF;
    PERFORM public.jtd__rewrite_fn('run_contract_event_scanner',
        'AND i.last_reminder_at IS NULL',
        'AND i.last_reminder_at IS NULL
          AND (SELECT count(*) FROM t_contract_events ie
                WHERE ie.invoice_id = i.id AND ie.event_type = ''billing'') <= 1',
        '027 scanner');
END $$;
