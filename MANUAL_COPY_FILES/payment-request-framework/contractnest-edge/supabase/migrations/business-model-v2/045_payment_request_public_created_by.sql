-- 045 — public Razorpay checkout: payment record was never saved (2026-10-08)
-- The pay page has no signed-in user, so payment-gateway passes
-- created_by = '' and create_payment_request's ('')::UUID threw inside its
-- catch-all: the Razorpay order was created and paid, but no request row
-- existed, the page got no request_id and verification was refused
-- ("cnak, secret_code, request_id and gateway_payment_id are required").
-- An empty created_by now means "no user".
DO $$
DECLARE v_def text; v_new text;
BEGIN
  SELECT pg_get_functiondef(p.oid) INTO v_def FROM pg_proc p WHERE p.proname = 'create_payment_request';
  v_new := replace(v_def,
    $a$v_created_by       := (p_payload->>'created_by')::UUID;$a$,
    $b$v_created_by       := NULLIF(p_payload->>'created_by', '')::UUID;$b$);
  IF v_new = v_def THEN
    RAISE EXCEPTION '045: anchor not found in create_payment_request';
  END IF;
  EXECUTE v_new;
END $$;
