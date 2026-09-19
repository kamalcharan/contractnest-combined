-- jtd-nucleus/025 — p_tenant_id is mandatory on the destructive tenant functions.
-- APPLIED LIVE 2026-09-19. Source of record.
--
-- None of the four had a NULL check, and all four wrap their steps in
-- `EXCEPTION WHEN OTHERS THEN NULL`. A NULL argument deleted nothing
-- (tenant_id = NULL matches no rows) and reported SUCCESS — an admin clicking
-- "Reset All Data" would be told it worked when nothing happened. Guard is the
-- FIRST statement, outside every BEGIN…EXCEPTION block, so the surrounding
-- handlers cannot swallow it. Pattern copied from cleanup_tenant_seed_data.
--
-- Behaviour: close / reset_all / reset_test return {success:false,...} because
-- they have an outer WHEN OTHERS…RETURN (the edge callers already check
-- data?.success === false); reset_tenant_session_and_forms raises.

DO $mig$
BEGIN
  PERFORM public.jtd__rewrite_fn('admin_close_tenant_account',
    E'  v_err text;\r\nBEGIN\r\n',
    E'  v_err text;\r\nBEGIN\r\n  IF p_tenant_id IS NULL THEN\r\n    RAISE EXCEPTION ''admin_close_tenant_account: p_tenant_id is required'';\r\n  END IF;\r\n',
    '025-close');

  PERFORM public.jtd__rewrite_fn('admin_reset_all_data',
    E'  v_total integer := 0;\nBEGIN\n',
    E'  v_total integer := 0;\nBEGIN\n  IF p_tenant_id IS NULL THEN\n    RAISE EXCEPTION ''admin_reset_all_data: p_tenant_id is required'';\n  END IF;\n',
    '025-reset-all');

  PERFORM public.jtd__rewrite_fn('admin_reset_test_data',
    E'  v_contract_ids UUID[];\nBEGIN\n',
    E'  v_contract_ids UUID[];\nBEGIN\n  IF p_tenant_id IS NULL THEN\n    RAISE EXCEPTION ''admin_reset_test_data: p_tenant_id is required'';\n  END IF;\n',
    '025-reset-test');

  PERFORM public.jtd__rewrite_fn('reset_tenant_session_and_forms',
    E'DECLARE v_contracts uuid[];\nBEGIN\n',
    E'DECLARE v_contracts uuid[];\nBEGIN\n  IF p_tenant_id IS NULL THEN\n    RAISE EXCEPTION ''reset_tenant_session_and_forms: p_tenant_id is required'';\n  END IF;\n',
    '025-reset-session');
END $mig$;

DO $check$
DECLARE v_n int;
BEGIN
  SELECT count(*) INTO v_n FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public'
     AND p.proname IN ('admin_close_tenant_account','admin_reset_all_data',
                       'admin_reset_test_data','reset_tenant_session_and_forms')
     AND pg_get_functiondef(p.oid) LIKE '%p_tenant_id is required%';
  IF v_n <> 4 THEN RAISE EXCEPTION '025: guard landed in only % of 4 functions', v_n; END IF;
END $check$;
