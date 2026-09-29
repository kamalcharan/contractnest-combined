-- ============================================================================
-- 041 — storefront checkout flow: acceptance follows the seller's payment
--        options; phones stored the way Contacts store them; the review page
--        learns the contract's source; the package page gets the seller's
--        document header and the "what happens next" facts.
-- ============================================================================
-- Owner decisions (2026-09-29):
--   • "show online payment options if available, if not take acceptance and
--      say '<seller> will connect with you to close up your request'"
--   • "show the price, it won't change — we have 'UPI / QR image'
--      functionality, we can invoke it, users will see QR and pay … Seller
--      will check it offline and then connect back with the buyer"
--   • mobile capture = country code + number, as Contacts capture it
--
-- What changes:
--   1. fn_tenant_payment_options(tenant, is_live) — ONE rule for "can this
--      seller take a payment on the public review page", mirroring what the
--      API's payment-context endpoint reports (gateway_configured = active
--      Razorpay integration in the same environment; offline_upi_configured =
--      active offline_upi integration carrying a UPI id). Used by the
--      checkout, the storefront resolver and the back-fill below.
--   2. purchase_from_storefront — acceptance_method is now
--        'payment' when the seller has any option (the existing
--                  PublicPaymentSection shows Razorpay and/or the QR + "I've
--                  paid" declaration; the seller confirms offline and the
--                  contract activates on confirmation), else
--        'signoff' (the buyer accepts with one tap; the seller connects).
--      It used to write 'manual', which the review page treats as
--      payment-gated while get_public_contract_payment_context refuses
--      anything but 'payment' — the buyer was stuck between the two.
--      Returns acceptance_method + payment_options so the checkout can say
--      what comes next before it navigates.
--   3. Phones: every channel row these writers insert now carries
--      country_code (ISO, 'IN') and value '+<dial><number>' — exactly what
--      ContactChannelsSection writes — via fn_storefront_channel_phone.
--      lead_capture / storefront_identify / purchase_from_storefront accept
--      country_code in their contact json.
--   4. validate_contract_access emits contract.source (metadata->>'source')
--      so the review page can word the success screen for a storefront buyer.
--   5. resolve_storefront(key, count) — seller carries address, GST, email,
--      phone, website, short description (the buyer-facing document header)
--      and the storefront carries payment {gateway, offline_upi, any}.
--   6. Back-fill: pending storefront contracts still on 'manual' move to the
--      rule above (CN-1023 on signia → 'signoff').
-- ============================================================================

-- ── 1. payment options ──────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.fn_tenant_payment_options(p_tenant_id uuid, p_is_live boolean DEFAULT TRUE)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  WITH gw AS (
    SELECT EXISTS (
      SELECT 1
      FROM public.t_tenant_integrations ti
      JOIN public.t_integration_providers ip ON ip.id = ti.master_integration_id
      JOIN public.t_integration_types it ON it.id = ip.type_id
      WHERE ti.tenant_id = p_tenant_id::text
        AND it.name = 'payment_gateway'
        AND ip.name = 'razorpay'
        AND ti.is_active = TRUE
        AND ti.is_live = COALESCE(p_is_live, TRUE)
    ) AS ok
  ), upi AS (
    SELECT EXISTS (
      SELECT 1
      FROM public.t_tenant_integrations ti
      JOIN public.t_integration_providers ip ON ip.id = ti.master_integration_id
      WHERE ip.name = 'offline_upi'
        AND ti.tenant_id = p_tenant_id::text
        AND ti.is_active = TRUE
        AND COALESCE(ti.credentials->'public'->>'upi_id', '') <> ''
    ) AS ok
  )
  SELECT jsonb_build_object(
    'gateway',     gw.ok,
    'offline_upi', upi.ok,
    'any',         gw.ok OR upi.ok)
  FROM gw, upi;
$$;

COMMENT ON FUNCTION public.fn_tenant_payment_options(uuid, boolean) IS
  'Can this seller take a payment on the public review page? gateway = active Razorpay in this environment; offline_upi = active offline_upi integration with a UPI id. Mirrors the API payment-context rule (041).';

-- ── 3. phone the way Contacts store it ──────────────────────────────────────
-- Returns {digits, value, country_code}. digits = every digit of the input
-- (dial code included); value = '+' || digits; country_code = the ISO the
-- caller sent, else 'IN' when the number reads as an Indian mobile. A bare
-- 10-digit number is treated as Indian (the only market today) so older
-- clients that send no dial code still store a dialable value.
CREATE OR REPLACE FUNCTION public.fn_storefront_channel_phone(p_raw text, p_country text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_digits text := public.fn_storefront_phone(p_raw);
  v_iso    text := NULLIF(upper(btrim(COALESCE(p_country, ''))), '');
BEGIN
  IF v_digits IS NULL THEN RETURN NULL; END IF;
  IF v_iso IS NOT NULL AND v_iso !~ '^[A-Z]{2}$' THEN v_iso := NULL; END IF;
  IF length(v_digits) = 10 AND (v_iso IS NULL OR v_iso = 'IN') THEN
    v_digits := '91' || v_digits;
    v_iso := 'IN';
  END IF;
  IF v_iso IS NULL AND length(v_digits) = 12 AND left(v_digits, 2) = '91' THEN v_iso := 'IN'; END IF;
  RETURN jsonb_build_object('digits', v_digits, 'value', '+' || v_digits, 'country_code', v_iso);
END;
$$;

-- ── 3a. lead_capture: country_code on the mobile channel ────────────────────
CREATE OR REPLACE FUNCTION public.lead_capture(p_tenant_id uuid, p_is_live boolean, p_contact jsonb, p_interest jsonb, p_actor jsonb DEFAULT NULL::jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_name text := NULLIF(btrim(p_contact->>'name'), '');
  v_company text := NULLIF(btrim(p_contact->>'company'), '');
  v_email text := NULLIF(lower(btrim(p_contact->>'email')), '');
  v_ph jsonb := public.fn_storefront_channel_phone(p_contact->>'phone', p_contact->>'country_code');
  v_phone text := v_ph->>'digits';
  v_kind text := COALESCE(NULLIF(p_interest->>'kind', ''), 'manual');
  v_contact uuid; v_new_contact boolean := false; v_new_interest boolean := false;
  v_seq jsonb; v_tp public.t_touchpoints; v_fam uuid; v_tpl_name text; v_int public.t_contact_interests;
  v_question text := NULLIF(left(btrim(p_interest->>'question'), 1000), '');
  v_note text := NULLIF(left(btrim(p_interest->>'note'), 1000), '');
BEGIN
  IF v_kind NOT IN ('storefront','vani','manual') THEN v_kind := 'manual'; END IF;
  IF v_name IS NULL AND v_company IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'A name is required', 'error_code', 'VALIDATION_ERROR');
  END IF;
  IF v_phone IS NULL AND v_email IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'A mobile number or email is required', 'error_code', 'VALIDATION_ERROR');
  END IF;

  IF NULLIF(p_interest->>'storefront_key', '') IS NOT NULL THEN
    v_tp := public.fn_storefront_by_key(p_interest->>'storefront_key');
    IF v_tp.id IS NOT NULL AND v_tp.tenant_id <> p_tenant_id THEN v_tp := NULL; END IF;
  END IF;
  IF NULLIF(p_interest->>'template_family', '') IS NOT NULL THEN
    BEGIN v_fam := public.fn_template_family((p_interest->>'template_family')::uuid); EXCEPTION WHEN OTHERS THEN v_fam := NULL; END;
  END IF;
  IF v_fam IS NOT NULL THEN
    v_tpl_name := (public.fn_storefront_package_json(v_fam))->>'name';
  END IF;
  v_tpl_name := COALESCE(v_tpl_name, NULLIF(btrim(p_interest->>'template_name'), ''));

  v_contact := public.fn_find_contact_by_reach(p_tenant_id, p_is_live, v_phone, v_email);
  IF v_contact IS NULL THEN
    v_seq := public.get_next_formatted_sequence('CONTACT', p_tenant_id, p_is_live);
    IF v_company IS NOT NULL THEN
      INSERT INTO public.t_contacts (tenant_id, is_live, type, name, company_name, contact_number, classifications, status, is_active, is_seed, source, notes)
      VALUES (p_tenant_id, p_is_live, 'corporate', NULL, v_company, v_seq->>'formatted', '["lead"]'::jsonb, 'active', TRUE, FALSE, v_kind,
              CASE WHEN v_name IS NOT NULL THEN 'Contact: ' || v_name END)
      RETURNING id INTO v_contact;
    ELSE
      INSERT INTO public.t_contacts (tenant_id, is_live, type, name, company_name, contact_number, classifications, status, is_active, is_seed, source)
      VALUES (p_tenant_id, p_is_live, 'individual', v_name, NULL, v_seq->>'formatted', '["lead"]'::jsonb, 'active', TRUE, FALSE, v_kind)
      RETURNING id INTO v_contact;
    END IF;
    IF v_phone IS NOT NULL THEN
      INSERT INTO public.t_contact_channels (contact_id, channel_type, value, country_code, is_primary, is_verified)
      VALUES (v_contact, 'mobile', v_ph->>'value', v_ph->>'country_code', TRUE, COALESCE((p_contact->>'phone_verified')::boolean, FALSE));
    END IF;
    IF v_email IS NOT NULL THEN
      INSERT INTO public.t_contact_channels (contact_id, channel_type, value, is_primary) VALUES (v_contact, 'email', v_email, v_phone IS NULL);
    END IF;
    v_new_contact := true;
  ELSE
    UPDATE public.t_contacts
    SET classifications = CASE WHEN classifications ? 'client' OR classifications ? 'lead' THEN classifications
                               ELSE COALESCE(classifications, '[]'::jsonb) || '["lead"]'::jsonb END,
        updated_at = now()
    WHERE id = v_contact;
  END IF;

  SELECT * INTO v_int FROM public.t_contact_interests
  WHERE tenant_id = p_tenant_id AND contact_id = v_contact AND stage IN ('new','contacted')
    AND kind = v_kind AND template_family IS NOT DISTINCT FROM v_fam
    AND last_activity_at > now() - interval '30 days'
  ORDER BY last_activity_at DESC LIMIT 1 FOR UPDATE;
  IF v_int.id IS NULL THEN
    INSERT INTO public.t_contact_interests (tenant_id, is_live, contact_id, kind, channel, storefront_id, storefront_key,
                                            template_family, template_name, question, note, metadata)
    VALUES (p_tenant_id, p_is_live, v_contact, v_kind, NULLIF(p_interest->>'channel', ''), v_tp.id, v_tp.storefront_key,
            v_fam, v_tpl_name, v_question, v_note, COALESCE(p_interest->'metadata', '{}'::jsonb))
    RETURNING * INTO v_int;
    v_new_interest := true;
    IF v_tp.id IS NOT NULL THEN UPDATE public.t_touchpoints SET leads_count = leads_count + 1 WHERE id = v_tp.id; END IF;
  ELSE
    UPDATE public.t_contact_interests
    SET last_activity_at = now(), updated_at = now(),
        question = CASE WHEN v_question IS NULL THEN question WHEN question IS NULL THEN v_question ELSE question || E'\n' || v_question END,
        note     = CASE WHEN v_note IS NULL THEN note WHEN note IS NULL THEN v_note ELSE note || E'\n' || v_note END,
        metadata = metadata || COALESCE(p_interest->'metadata', '{}'::jsonb)
    WHERE id = v_int.id RETURNING * INTO v_int;
  END IF;

  RETURN jsonb_build_object('success', true, 'contact_id', v_contact, 'interest_id', v_int.id,
                            'is_new_contact', v_new_contact, 'is_new_interest', v_new_interest, 'stage', v_int.stage);
END;
$function$;

-- ── 3b. storefront_identify: carry country_code through ─────────────────────
CREATE OR REPLACE FUNCTION public.storefront_identify(p_key text, p_buyer jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE v_tp public.t_touchpoints; v_otp public.t_storefront_otp; v_phone text; v_fam uuid; v_res jsonb;
BEGIN
  v_tp := public.fn_storefront_by_key(p_key);
  IF v_tp.id IS NULL OR NOT public.fn_storefront_entitled(v_tp.tenant_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'This link is not available', 'error_code', 'NOT_FOUND');
  END IF;
  v_phone := public.fn_storefront_phone(p_buyer->>'phone');
  SELECT * INTO v_otp FROM public.t_storefront_otp
  WHERE verify_token = NULLIF(p_buyer->>'otp_token', '') AND verified_at > now() - interval '30 minutes';
  IF v_otp.id IS NULL OR v_phone IS NULL OR right(v_otp.phone, 10) <> right(v_phone, 10) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Verify your mobile number first', 'error_code', 'PHONE_NOT_VERIFIED');
  END IF;
  BEGIN v_fam := public.fn_template_family(NULLIF(p_buyer->>'template_id', '')::uuid); EXCEPTION WHEN OTHERS THEN v_fam := NULL; END;
  IF v_fam IS NULL OR NOT (v_fam = ANY (v_tp.template_ids)) THEN v_fam := v_tp.template_ids[1]; END IF;
  v_res := public.lead_capture(v_tp.tenant_id, TRUE,
    jsonb_build_object('name', p_buyer->>'name', 'company', p_buyer->>'company', 'phone', p_buyer->>'phone',
                       'country_code', p_buyer->>'country_code', 'email', p_buyer->>'email', 'phone_verified', true),
    jsonb_build_object('kind', 'storefront', 'channel', COALESCE(NULLIF(p_buyer->>'channel', ''), 'website'),
                       'storefront_key', v_tp.storefront_key, 'template_family', v_fam, 'note', 'Started checkout'));
  RETURN v_res;
END;
$function$;

-- ── 2 + 3c. purchase_from_storefront ────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.purchase_from_storefront(p_key text, p_buyer jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_tp      public.t_touchpoints;
  v_tpl     RECORD;
  v_fam     uuid;
  v_name    TEXT; v_company TEXT; v_email TEXT; v_phone TEXT; v_phone_raw TEXT;
  v_ph      JSONB;
  v_otp     public.t_storefront_otp;
  v_contact UUID;
  v_seq     JSONB;
  v_blocks  JSONB := '[]'::JSONB;
  v_block   JSONB;
  v_payload JSONB;
  v_result  JSONB;
  v_contract UUID;
  v_status  JSONB;
  v_cnak    TEXT; v_secret TEXT;
  v_pay     JSONB;
  v_accept  TEXT;
BEGIN
  v_tp := public.fn_storefront_by_key(p_key);
  IF v_tp.id IS NULL OR NOT public.fn_storefront_entitled(v_tp.tenant_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'This link is not available', 'error_code', 'NOT_FOUND');
  END IF;

  IF NULLIF(p_buyer->>'template_id', '') IS NULL THEN
    v_fam := v_tp.template_ids[1];
  ELSE
    BEGIN
      v_fam := public.fn_template_family((p_buyer->>'template_id')::uuid);
    EXCEPTION WHEN OTHERS THEN v_fam := NULL;
    END;
  END IF;
  IF v_fam IS NULL OR NOT (v_fam = ANY (v_tp.template_ids)) THEN
    RETURN jsonb_build_object('success', false, 'error', 'That package is not on this storefront', 'error_code', 'VALIDATION_ERROR');
  END IF;
  SELECT * INTO v_tpl FROM public.t_cat_templates WHERE id = public.fn_storefront_latest_template(v_fam);
  IF v_tpl.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'This link is not available', 'error_code', 'TEMPLATE_GONE');
  END IF;

  v_name    := NULLIF(btrim(p_buyer->>'name'), '');
  v_company := NULLIF(btrim(p_buyer->>'company'), '');
  v_email   := NULLIF(lower(btrim(p_buyer->>'email')), '');
  v_ph      := public.fn_storefront_channel_phone(p_buyer->>'phone', p_buyer->>'country_code');
  v_phone   := v_ph->>'digits';
  v_phone_raw := v_ph->>'value';
  IF v_name IS NULL OR v_phone IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Name and mobile number are required', 'error_code', 'VALIDATION_ERROR');
  END IF;

  SELECT * INTO v_otp FROM public.t_storefront_otp
  WHERE verify_token = NULLIF(p_buyer->>'otp_token', '') AND verified_at > now() - interval '30 minutes';
  IF v_otp.id IS NULL OR right(v_otp.phone, 10) <> right(v_phone, 10) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Verify your mobile number first', 'error_code', 'PHONE_NOT_VERIFIED');
  END IF;

  -- The seller's payment options decide how the buyer accepts (owner rule):
  -- any option → 'payment' (the review page shows it; the seller confirms an
  -- offline payment and the contract activates on confirmation); none →
  -- 'signoff' (one-tap accept; the seller connects to close the request).
  v_pay := public.fn_tenant_payment_options(v_tp.tenant_id, TRUE);
  v_accept := CASE WHEN COALESCE((v_pay->>'any')::boolean, FALSE) AND COALESCE(v_tpl.total, 0) > 0 THEN 'payment' ELSE 'signoff' END;

  SELECT c.id INTO v_contact
  FROM public.t_contacts c JOIN public.t_contact_channels ch ON ch.contact_id = c.id
  WHERE c.tenant_id = v_tp.tenant_id AND c.is_live = TRUE AND c.is_active = TRUE
    AND ch.channel_type = 'mobile' AND right(regexp_replace(ch.value, '[^0-9]', '', 'g'), 10) = right(v_phone, 10)
  ORDER BY c.created_at LIMIT 1;
  IF v_contact IS NULL AND v_email IS NOT NULL THEN
    SELECT c.id INTO v_contact
    FROM public.t_contacts c JOIN public.t_contact_channels ch ON ch.contact_id = c.id
    WHERE c.tenant_id = v_tp.tenant_id AND c.is_live = TRUE AND c.is_active = TRUE
      AND ch.channel_type = 'email' AND lower(ch.value) = v_email
    ORDER BY c.created_at LIMIT 1;
  END IF;

  IF v_contact IS NULL THEN
    v_seq := public.get_next_formatted_sequence('CONTACT', v_tp.tenant_id, TRUE);
    IF v_company IS NOT NULL THEN
      INSERT INTO public.t_contacts (tenant_id, is_live, type, name, company_name, contact_number, classifications, status, is_active, is_seed, source)
      VALUES (v_tp.tenant_id, TRUE, 'corporate', NULL, v_company, v_seq->>'formatted', '["client"]'::JSONB, 'active', TRUE, FALSE, 'storefront')
      RETURNING id INTO v_contact;
    ELSE
      INSERT INTO public.t_contacts (tenant_id, is_live, type, name, company_name, contact_number, classifications, status, is_active, is_seed, source)
      VALUES (v_tp.tenant_id, TRUE, 'individual', v_name, NULL, v_seq->>'formatted', '["client"]'::JSONB, 'active', TRUE, FALSE, 'storefront')
      RETURNING id INTO v_contact;
    END IF;
    INSERT INTO public.t_contact_channels (contact_id, channel_type, value, country_code, is_primary, is_verified)
    VALUES (v_contact, 'mobile', v_phone_raw, v_ph->>'country_code', TRUE, TRUE);
    IF v_email IS NOT NULL THEN
      INSERT INTO public.t_contact_channels (contact_id, channel_type, value, is_primary) VALUES (v_contact, 'email', v_email, FALSE);
    END IF;
  ELSE
    UPDATE public.t_contacts SET classifications = CASE WHEN classifications ? 'client' THEN classifications ELSE classifications || '["client"]'::jsonb END,
                                 updated_at = now()
    WHERE id = v_contact;
    -- the verified number is now known to be theirs
    UPDATE public.t_contact_channels SET is_verified = TRUE, country_code = COALESCE(country_code, v_ph->>'country_code')
    WHERE contact_id = v_contact AND channel_type = 'mobile'
      AND right(regexp_replace(value, '[^0-9]', '', 'g'), 10) = right(v_phone, 10);
  END IF;

  FOR v_block IN SELECT * FROM jsonb_array_elements(COALESCE(v_tpl.blocks, '[]'::JSONB)) LOOP
    v_blocks := v_blocks || jsonb_build_array(jsonb_build_object(
      'position',        COALESCE((v_block->>'order')::INT, 0),
      'source_type',     'catalog',
      'source_block_id', v_block->>'block_id',
      'block_name',      v_block->'config_overrides'->>'name',
      'category_id',     v_block->'config_overrides'->>'category_id',
      'category_name',   v_block->'config_overrides'->>'category_name',
      'unit_price',      COALESCE((v_block->'config_overrides'->>'unit_price')::NUMERIC, 0),
      'quantity',        COALESCE((v_block->'config_overrides'->>'quantity')::INT, 1),
      'billing_cycle',   COALESCE(v_block->'config_overrides'->>'billing_cycle', 'prepaid'),
      'total_price',     COALESCE((v_block->'config_overrides'->>'total_price')::NUMERIC, 0),
      'custom_fields',   jsonb_build_object(
                            'config',   COALESCE(v_block->'config_overrides'->'config', '{}'::JSONB),
                            'currency', COALESCE(v_tpl.currency, 'INR'),
                            'notes',    'Storefront: ' || COALESCE(v_tpl.display_name, v_tpl.name))));
  END LOOP;

  v_payload := jsonb_build_object(
    'tenant_id',         v_tp.tenant_id,
    'is_live',           TRUE,
    'record_type',       'contract',
    'contract_type',     'client',
    'name',              COALESCE(v_tpl.display_name, v_tpl.name),
    'buyer_id',          v_contact,
    'buyer_name',        v_name,
    'buyer_email',       v_email,
    'buyer_phone',       v_phone_raw,
    'buyer_company',     v_company,
    'currency',          COALESCE(v_tpl.currency, 'INR'),
    'duration_value',    COALESCE((v_tpl.settings->'defaults'->>'duration_value')::INT, 1),
    'duration_unit',     COALESCE(v_tpl.settings->'defaults'->>'duration_unit', 'months'),
    'start_date',        now(),
    'acceptance_method', v_accept,
    'nomenclature_id',   v_tpl.settings->'defaults'->>'nomenclature_id',
    'billing_cycle_type',COALESCE(v_tpl.settings->'defaults'->>'billing_cycle_type', 'unified'),
    'grand_total',       COALESCE(v_tpl.total, 0),
    'total_value',       COALESCE(v_tpl.total, 0),
    'tax_total',         0,
    'discount_total',    0,
    'blocks',            v_blocks,
    'performed_by_type', 'user',
    'metadata',          jsonb_build_object(
                            'source',          'storefront_purchase',
                            'storefront_key',  v_tp.storefront_key,
                            'storefront_id',   v_tp.id,
                            'template_id',     v_tpl.id,
                            'template_family', v_fam,
                            'phone_verified',  TRUE,
                            'payment_options', v_pay));

  v_result := public.create_contract_transaction(v_payload, NULL);
  IF NOT COALESCE((v_result->>'success')::BOOLEAN, FALSE) THEN
    RETURN jsonb_build_object('success', false, 'error', COALESCE(v_result->>'error', 'Could not create the order'), 'error_code', 'CONTRACT_CREATE_FAILED', 'detail', v_result);
  END IF;
  v_contract := (v_result->'data'->>'id')::UUID;

  -- create_contract_transaction's mapper may normalise the method; the rule
  -- above is the storefront's contract with the buyer, so pin it.
  UPDATE public.t_contracts SET acceptance_method = v_accept WHERE id = v_contract AND acceptance_method IS DISTINCT FROM v_accept;

  v_status := public.update_contract_status(v_contract, v_tp.tenant_id, 'pending_acceptance', NULL, v_name, 'system', 'Storefront purchase');
  IF NOT COALESCE((v_status->>'success')::BOOLEAN, FALSE) THEN
    RETURN jsonb_build_object('success', false, 'error', COALESCE(v_status->>'error', 'Could not prepare the order for review'), 'error_code', 'STATUS_TRANSITION_FAILED', 'detail', v_status);
  END IF;

  SELECT global_access_id INTO v_cnak FROM public.t_contracts WHERE id = v_contract;
  SELECT secret_code INTO v_secret FROM public.t_contract_access WHERE contract_id = v_contract ORDER BY created_at DESC LIMIT 1;

  UPDATE public.t_touchpoints SET purchases_count = purchases_count + 1 WHERE id = v_tp.id;

  RETURN jsonb_build_object(
    'success', true,
    'contract_id', v_contract,
    'contract_number', v_result->'data'->>'contract_number',
    'contact_id', v_contact,
    'acceptance_method', v_accept,
    'payment_options', v_pay,
    'cnak', v_cnak, 'secret', v_secret,
    'review_path', CASE WHEN v_cnak IS NOT NULL AND v_secret IS NOT NULL
                        THEN '/contracts/review?cnak=' || v_cnak || '&secret=' || v_secret ELSE NULL END);
END;
$function$;

-- ── 4. validate_contract_access → contract.source ───────────────────────────
SELECT public.jtd__rewrite_fn(
  'validate_contract_access',
  $old$            'acceptance_method',   v_contract.acceptance_method,$old$,
  $new$            'acceptance_method',   v_contract.acceptance_method,
            'source',              v_contract.metadata->>'source',$new$,
  '041 validate_contract_access.source');

-- ── 5. resolve_storefront: the seller's document header + payment options ───
CREATE OR REPLACE FUNCTION public.resolve_storefront(p_key text, p_count boolean DEFAULT true)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE v_tp public.t_touchpoints; v_pkgs jsonb; v_seller jsonb;
BEGIN
  v_tp := public.fn_storefront_by_key(p_key);
  IF v_tp.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'This link is not available', 'error_code', 'NOT_FOUND');
  END IF;
  IF NOT public.fn_storefront_entitled(v_tp.tenant_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'This link is not available', 'error_code', 'NOT_ENTITLED');
  END IF;
  v_pkgs := public.fn_storefront_packages(v_tp.template_ids);
  IF jsonb_array_length(v_pkgs) = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'This link is not available', 'error_code', 'TEMPLATE_GONE');
  END IF;
  SELECT jsonb_build_object(
           'name',            COALESCE(NULLIF(tp.business_name, ''), tn.name),
           'logo_url',        tp.logo_url,
           'primary_color',   tp.primary_color,
           'secondary_color', tp.secondary_color,
           'city',            tp.city,
           'state_code',      tp.state_code,
           'country_code',    tp.country_code,
           'address_line1',   tp.address_line1,
           'address_line2',   tp.address_line2,
           'postal_code',     tp.postal_code,
           'gst_number',      tp.gst_number,
           'email',           tp.business_email,
           'phone',           CASE WHEN NULLIF(tp.business_phone, '') IS NULL THEN NULL
                                   ELSE COALESCE(NULLIF(tp.business_phone_code, ''), '') || tp.business_phone END,
           'website_url',     tp.website_url,
           'short_description', tp.short_description)
  INTO v_seller
  FROM public.t_tenants tn LEFT JOIN public.t_tenant_profiles tp ON tp.tenant_id = tn.id
  WHERE tn.id = v_tp.tenant_id LIMIT 1;
  IF p_count THEN UPDATE public.t_touchpoints SET views_count = views_count + 1 WHERE id = v_tp.id; END IF;
  RETURN jsonb_build_object('success', true, 'storefront', jsonb_build_object(
    'key',          v_tp.storefront_key,
    'name',         v_tp.name,
    'seller',       v_seller,
    'card_style',   public.fn_storefront_card_style(v_tp.tenant_id, v_tp.card_style, NULL),
    'faq',          v_tp.faq,
    'packages',     v_pkgs,
    'vani_enabled', public.vani_is_enabled(v_tp.tenant_id),
    'payment',      public.fn_tenant_payment_options(v_tp.tenant_id, TRUE),
    'seller_name',  v_seller->>'name',
    'template',     v_pkgs->0));
END;
$function$;

-- ── 6. back-fill pending storefront contracts still on 'manual' ─────────────
UPDATE public.t_contracts c
SET acceptance_method = CASE WHEN COALESCE((public.fn_tenant_payment_options(c.tenant_id, c.is_live)->>'any')::boolean, FALSE)
                              AND COALESCE(c.grand_total, 0) > 0 THEN 'payment' ELSE 'signoff' END,
    updated_at = now()
WHERE c.metadata->>'source' = 'storefront_purchase'
  AND c.status = 'pending_acceptance'
  AND c.acceptance_method = 'manual';

-- ── 041b (applied as its own migration, same day) ───────────────────────────
-- vani_site_capture builds the contact json by hand; carry country_code
-- through to lead_capture so a VaNi lead's mobile is stored like the rest.
SELECT public.jtd__rewrite_fn('vani_site_capture',
  $old$'phone', p_contact->>'phone', 'email', p_contact->>'email')$old$,
  $new$'phone', p_contact->>'phone', 'country_code', p_contact->>'country_code', 'email', p_contact->>'email')$new$,
  '041b vani_site_capture.country_code');
