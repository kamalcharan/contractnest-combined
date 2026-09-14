-- 076: instalment-billed plans must entitle on the first payment received.
--
-- An instalment plan's invoice sits at 'partially_paid' from the first
-- payment until the last, so a gate testing status='paid' could never be
-- satisfied. Entitlements were therefore never applied to ANY plan
-- subscriber. The recovery path used the same test, so nothing retried.
--
-- Functions are rewritten by substituting into their live prosrc rather
-- than being retyped (the migration 048 method). A silent no-op is the
-- failure mode of that technique, so every substitution RAISEs if its
-- anchor is not found.

-- 1. the gate itself: any money received entitles, not a fully settled invoice
DO $mig1$
DECLARE v_src TEXT; v_new TEXT;
BEGIN
  SELECT p.prosrc INTO v_src FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE p.proname = 'fn_apply_contract_entitlements' AND n.nspname = 'public';
  IF v_src IS NULL THEN RAISE EXCEPTION 'fn_apply_contract_entitlements not found'; END IF;

  v_new := replace(v_src,
    'WHERE contract_id = p_contract_id AND status = ''paid''',
    'WHERE contract_id = p_contract_id AND (status = ''paid'' OR COALESCE(amount_paid, 0) > 0)');

  IF v_new = v_src THEN RAISE EXCEPTION 'anchor not found: entitlement payment gate'; END IF;

  EXECUTE format('CREATE OR REPLACE FUNCTION public.fn_apply_contract_entitlements(p_contract_id uuid) '
              || 'RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS %L', v_new);
END $mig1$;

-- 2. the recovery path must fire on a partial payment too
DO $mig2$
DECLARE v_src TEXT; v_new TEXT;
BEGIN
  SELECT p.prosrc INTO v_src FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE p.proname = 'trg_fn_topup_credits_on_payment' AND n.nspname = 'public';
  IF v_src IS NULL THEN RAISE EXCEPTION 'trg_fn_topup_credits_on_payment not found'; END IF;

  v_new := replace(v_src,
    'IF NEW.status <> ''paid'' OR COALESCE(OLD.status, '''') = ''paid'' THEN',
    'IF COALESCE(NEW.amount_paid, 0) <= 0 AND NEW.status <> ''paid'' THEN');

  IF v_new = v_src THEN RAISE EXCEPTION 'anchor not found: payment settlement guard'; END IF;

  EXECUTE format('CREATE OR REPLACE FUNCTION public.trg_fn_topup_credits_on_payment() '
              || 'RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS %L', v_new);
END $mig2$;

-- 3. test-mode rows must not consume a paid allowance.
--    The entitlement triggers already filter is_live; the consumption
--    trigger never did. Credit grants are deliberately left running in
--    test mode so notification testing still works.
DO $mig3$
DECLARE v_src TEXT; v_new TEXT;
BEGIN
  SELECT p.prosrc INTO v_src FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE p.proname = 'trg_fn_contract_consumption' AND n.nspname = 'public';
  IF v_src IS NULL THEN RAISE EXCEPTION 'trg_fn_contract_consumption not found'; END IF;

  v_new := replace(v_src,
    'IF NEW.record_type = ''rfq'' THEN',
    'IF NEW.is_live IS NOT TRUE THEN' || E'\n'
    || '        NULL;  -- test-mode rows must not consume a paid allowance' || E'\n'
    || '    ELSIF NEW.record_type = ''rfq'' THEN');

  IF v_new = v_src THEN RAISE EXCEPTION 'anchor not found: consumption record_type branch'; END IF;

  EXECUTE format('CREATE OR REPLACE FUNCTION public.trg_fn_contract_consumption() '
              || 'RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS %L', v_new);
END $mig3$;

-- 4. an instalment can move amount_paid without status changing value, and
--    "AFTER UPDATE OF status" would miss it
DROP TRIGGER IF EXISTS trg_topup_credits_on_payment ON public.t_invoices;
CREATE TRIGGER trg_topup_credits_on_payment
  AFTER UPDATE OF status, amount_paid ON public.t_invoices
  FOR EACH ROW EXECUTE FUNCTION trg_fn_topup_credits_on_payment();

-- 5. backfill: settle every already-paid-for plan that the old gate skipped
DO $mig5$
DECLARE r RECORD; v_n INT := 0;
BEGIN
  FOR r IN
    SELECT c.id FROM t_contracts c
    WHERE c.status = 'active' AND c.is_live = TRUE AND c.record_type = 'contract'
      AND NOT (c.metadata ? 'entitlements_applied_at')
      AND EXISTS (SELECT 1 FROM t_contract_blocks b
                   WHERE b.contract_id = c.id
                     AND b.custom_fields->'config'->'metering' IS NOT NULL)
  LOOP
    PERFORM fn_apply_contract_entitlements(r.id);
    v_n := v_n + 1;
  END LOOP;
  RAISE NOTICE 'entitlement backfill considered % contract(s)', v_n;
END $mig5$;

-- 6. rebase the meters. Historical values are unreliable in both
--    directions (test rows inflated some; rows predating the trigger were
--    never counted at all), so each plan tenant is reset to what it has
--    actually created inside its CURRENT plan period -- the same basis the
--    existing plan-switch reset already uses.
WITH plans AS (
  SELECT DISTINCT ON (ct.source_tenant_id)
         ct.source_tenant_id AS tenant_id, c.start_date
  FROM t_contracts c JOIN t_contacts ct ON ct.id = c.buyer_id
  WHERE c.metadata->>'source' = 'plan_subscription'
    AND c.status = 'active' AND c.is_live = TRUE
  ORDER BY ct.source_tenant_id, c.created_at DESC
), counted AS (
  SELECT p.tenant_id,
         COUNT(*) FILTER (WHERE k.is_live AND k.record_type <> 'rfq'
                            AND k.created_at >= p.start_date) AS n_contracts,
         COUNT(*) FILTER (WHERE k.is_live AND k.record_type = 'rfq'
                            AND k.created_at >= p.start_date) AS n_rfqs
  FROM plans p LEFT JOIN t_contracts k ON k.tenant_id = p.tenant_id
  GROUP BY p.tenant_id
)
UPDATE t_tenant_context tc
SET usage_contracts = counted.n_contracts,
    usage_rfqs      = counted.n_rfqs,
    updated_at      = now()
FROM counted
WHERE tc.tenant_id = counted.tenant_id
  AND tc.product_code = 'contractnest'
  AND tc.billing_mode <> 'exempt';
