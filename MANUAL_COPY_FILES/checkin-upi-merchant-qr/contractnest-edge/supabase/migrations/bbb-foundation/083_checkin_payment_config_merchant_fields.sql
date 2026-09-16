-- 083_checkin_payment_config_merchant_fields.sql
-- ALREADY APPLIED LIVE (2026-09-16) — this file is a source-of-record copy.
-- DO NOT RE-RUN.
--
-- Root cause of the long-open "check-in UPI pay link still fails on real
-- GPay" item (raised 2026-07-25, mc=0000 fix didn't resolve it): the
-- hand-built upi:// intent was declaring the transaction as PERSONAL
-- (P2P) while the receiving VPA is actually registered on the UPI
-- network as a MERCHANT account. Confirmed by decoding the physical
-- Karnataka Bank QR sticker for this VPA (owner scanned it with a plain
-- QR reader and shared the raw payload):
--   upi://pay?ver=01&orgid=159052&mode=01&pa=9849502193@kbl&pn=U%20S%20R%20TRAVELS&mc=4722&cu=INR
-- Three fields were missing entirely (ver, orgid, mode), and the
-- merchant category code was actively wrong in the opposite direction —
-- mc=0000 means "not a merchant"/personal transfer; the real value is
-- 4722 (Travel Agencies and Tour Operators, the correct ISO 18245 code
-- for "U S R Travels"). Declaring the wrong transaction type to a
-- merchant-registered VPA is exactly the kind of mismatch that produces
-- "Payments to this receiver are not allowed by UPI network".
--
-- gs_checkin_payment_config now additively returns org_id/mcc from the
-- offline_upi integration's credentials->'public' JSONB (a data-only
-- update — no schema change; BBB's live row was updated in the same
-- session to carry org_id="159052", mcc="4722"). Backward compatible:
-- returns null for any tenant/environment that hasn't set them — e.g.
-- BBB's own TEST-environment config, which uses a personal VPA
-- (kamalcharan@okicici) and should correctly stay a plain P2P intent.
-- The frontend (upiPayment.ts, this same batch) only adds ver/orgid/
-- mode/mc to the built link when both org_id and mcc are present.
CREATE OR REPLACE FUNCTION public.gs_checkin_payment_config(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE v_tok public.t_group_session_tokens; v_live boolean; v_pub jsonb;
BEGIN
  SELECT * INTO v_tok FROM public.t_group_session_tokens WHERE token=p_token AND is_active;
  IF v_tok.id IS NULL THEN RETURN jsonb_build_object('ok', false, 'reason', 'invalid_token'); END IF;
  v_live := coalesce(v_tok.is_live, true);
  SELECT ti.credentials->'public' INTO v_pub
  FROM public.t_tenant_integrations ti
  JOIN public.t_integration_providers ip ON ip.id = ti.master_integration_id
  WHERE ip.name = 'offline_upi' AND ti.tenant_id = v_tok.tenant_id::text AND ti.is_live = v_live AND ti.is_active
  ORDER BY ti.updated_at DESC NULLS LAST LIMIT 1;
  IF v_pub IS NULL OR coalesce(v_pub->>'upi_id','') = '' THEN
    RETURN jsonb_build_object('ok', true, 'configured', false);
  END IF;
  RETURN jsonb_build_object(
    'ok', true, 'configured', true,
    'upi_id', v_pub->>'upi_id',
    'payee_name', coalesce(v_pub->>'payee_name',''),
    'org_id', v_pub->>'org_id',
    'mcc', v_pub->>'mcc'
  );
END $function$;

-- Data-only update (already applied): sets BBB's LIVE offline_upi config
-- to carry the two new fields. Included here for the record — re-running
-- is harmless (idempotent jsonb_set), but not required.
-- UPDATE t_tenant_integrations
-- SET credentials = jsonb_set(
--   jsonb_set(credentials, '{public,org_id}', '"159052"'),
--   '{public,mcc}', '"4722"'
-- )
-- WHERE tenant_id = 'dd194710-92b4-4110-80eb-0b492a0d2c1f'
--   AND is_live = true
--   AND master_integration_id = (SELECT id FROM t_integration_providers WHERE name = 'offline_upi');
