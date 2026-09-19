-- jtd-nucleus/029 — closing a tenant removes its template rows.
-- APPLIED LIVE 2026-09-19. Source of record.
--
-- admin_reset_all_data already deleted n_jtd, n_jtd_status_history,
-- n_jtd_history, n_jtd_tenant_source_config and n_jtd_tenant_config for the
-- tenant, but not n_jtd_templates — which only started holding per-tenant rows
-- with 027. This covers BOTH surfaces (/admin/subscription-management and
-- /settings/business-profile) because admin_close_tenant_account calls
-- admin_reset_all_data.
--
-- `AND tenant_id IS NOT NULL` is belt-and-braces, not load-bearing: with a NULL
-- argument `tenant_id = NULL` already matches nothing, and 025 refuses a NULL
-- call outright. It is written explicitly because n_jtd_templates is the ONLY
-- table in this function holding SHARED rows — the global registry lives here
-- as tenant_id IS NULL — and every step is wrapped in `EXCEPTION WHEN OTHERS
-- THEN NULL`. A later rewrite using COALESCE or IS NOT DISTINCT FROM would wipe
-- the registry for every tenant SILENTLY.
--
-- admin_reset_test_data is deliberately NOT changed: templates are
-- configuration, not test data, and seeded rows carry is_live = true so its
-- `is_live = false` sweep already skips them. Do not "fix" this.

DO $mig$
BEGIN
  PERFORM public.jtd__rewrite_fn('admin_reset_all_data',
    E'  BEGIN DELETE FROM n_jtd_tenant_config WHERE tenant_id = p_tenant_id; EXCEPTION WHEN OTHERS THEN NULL; END;\n',
    E'  BEGIN DELETE FROM n_jtd_tenant_config WHERE tenant_id = p_tenant_id; EXCEPTION WHEN OTHERS THEN NULL; END;\n  BEGIN DELETE FROM n_jtd_templates WHERE tenant_id = p_tenant_id AND tenant_id IS NOT NULL; EXCEPTION WHEN OTHERS THEN NULL; END;\n',
    '029-reset-all-templates');
END $mig$;

DO $check$
DECLARE v_src text;
BEGIN
  SELECT pg_get_functiondef(p.oid) INTO v_src
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.proname = 'admin_reset_all_data';

  IF v_src NOT LIKE '%DELETE FROM n_jtd_templates WHERE tenant_id = p_tenant_id AND tenant_id IS NOT NULL%' THEN
    RAISE EXCEPTION '029: template delete did not land in admin_reset_all_data';
  END IF;

  IF position('p_tenant_id is required' IN v_src) > position('n_jtd_templates' IN v_src) THEN
    RAISE EXCEPTION '029: NULL guard is no longer ahead of the template delete';
  END IF;
END $check$;
