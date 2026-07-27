-- =============================================================================
-- Retire the legacy service-catalog stack
-- =============================================================================
-- Context
--   ContractNest had two catalog systems. Catalog Studio (m_cat_blocks, 2230
--   rows) is the live one. The legacy "service catalog" (t_catalog_* tables,
--   /api/service-catalog, edge service-catalog, /catalog UI) is retired.
--
-- Pre-verified before writing this migration (2026-07-27):
--   * All six t_catalog_* tables held ZERO rows.
--   * No inbound FOREIGN KEYs from any other table.
--   * No dependent views.
--   * 20 dependent functions were legacy-catalog-only (dropped in §2).
--   * 2 dependent functions are shared admin RPCs and are PATCHED in §1
--     rather than dropped:
--       - admin_reset_all_data      : its t_catalog_* DELETEs are already
--                                     wrapped in EXCEPTION WHEN OTHERS blocks,
--                                     so it degrades safely. Left untouched.
--       - get_tenant_data_summary   : its t_catalog_items / t_catalog_categories
--                                     counts are NOT wrapped and WOULD THROW
--                                     once the tables are gone. Patched below.
--
-- ORDER OF DEPLOYMENT (important)
--   Deploy the application code FIRST (UI + API + edge, which no longer
--   reference any of this), THEN run this migration. Running it before the
--   code deploy would break the still-deployed legacy endpoints.
--
-- Rollback: the tables are empty, so rollback = restore schema from the
--   original creation migrations. No data can be lost.
-- =============================================================================

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────────
-- §1  Patch the shared admin RPC that would otherwise break
-- ─────────────────────────────────────────────────────────────────────────────
-- get_tenant_data_summary counts rows per tenant table for the admin tenant
-- operations screen. Its first two counts referenced t_catalog_items and
-- t_catalog_categories WITHOUT an exception guard. We drop those two entries
-- (they are always 0 and the tables are being removed) and keep everything
-- else identical. The remaining t_catalog_* counts in that function are
-- already guarded by `EXCEPTION WHEN OTHERS THEN v_count := 0;` and will
-- simply report 0 — harmless — but we strip them too for cleanliness.

DO $patch$
DECLARE
  v_src  text;
  v_new  text;
  v_args text;
BEGIN
  SELECT p.prosrc, pg_get_function_identity_arguments(p.oid)
    INTO v_src, v_args
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.proname = 'get_tenant_data_summary'
  LIMIT 1;

  IF v_src IS NULL THEN
    RAISE NOTICE 'get_tenant_data_summary not found — skipping patch';
    RETURN;
  END IF;

  v_new := v_src;

  -- Unguarded counts: t_catalog_items
  v_new := replace(v_new,
    E'  SELECT COUNT(*) INTO v_count FROM t_catalog_items WHERE tenant_id = p_tenant_id;\r\n',
    E'  v_count := 0; -- t_catalog_items retired\r\n');
  v_new := replace(v_new,
    E'  v_items := v_items || jsonb_build_array(jsonb_build_object(''label'', ''Catalog Items'', ''count'', v_count, ''table'', ''t_catalog_items''));\r\n',
    E'');

  -- Unguarded counts: t_catalog_categories
  v_new := replace(v_new,
    E'  SELECT COUNT(*) INTO v_count FROM t_catalog_categories WHERE tenant_id = p_tenant_id;\r\n',
    E'  v_count := 0; -- t_catalog_categories retired\r\n');
  v_new := replace(v_new,
    E'  v_items := v_items || jsonb_build_array(jsonb_build_object(''label'', ''Categories'', ''count'', v_count, ''table'', ''t_catalog_categories''));\r\n',
    E'');

  -- Guarded counts (would return 0 anyway) — removed for cleanliness
  v_new := replace(v_new,
    E'  BEGIN SELECT COUNT(*) INTO v_count FROM t_catalog_service_resources WHERE tenant_id = p_tenant_id;\r\n  EXCEPTION WHEN OTHERS THEN v_count := 0; END;\r\n',
    E'  v_count := 0; -- t_catalog_service_resources retired\r\n');
  v_new := replace(v_new,
    E'  v_items := v_items || jsonb_build_array(jsonb_build_object(''label'', ''Service Resources'', ''count'', v_count, ''table'', ''t_catalog_service_resources''));\r\n',
    E'');
  v_new := replace(v_new,
    E'  BEGIN SELECT COUNT(*) INTO v_count FROM t_catalog_resource_pricing WHERE tenant_id = p_tenant_id;\r\n  EXCEPTION WHEN OTHERS THEN v_count := 0; END;\r\n',
    E'  v_count := 0; -- t_catalog_resource_pricing retired\r\n');
  v_new := replace(v_new,
    E'  v_items := v_items || jsonb_build_array(jsonb_build_object(''label'', ''Resource Pricing'', ''count'', v_count, ''table'', ''t_catalog_resource_pricing''));\r\n',
    E'');
  v_new := replace(v_new,
    E'  BEGIN SELECT COUNT(*) INTO v_count FROM t_catalog_industries WHERE tenant_id = p_tenant_id;\r\n  EXCEPTION WHEN OTHERS THEN v_count := 0; END;\r\n',
    E'  v_count := 0; -- t_catalog_industries retired\r\n');
  v_new := replace(v_new,
    E'  v_items := v_items || jsonb_build_array(jsonb_build_object(''label'', ''Industries'', ''count'', v_count, ''table'', ''t_catalog_industries''));\r\n',
    E'');

  IF v_new ~* 't_catalog_(items|categories|resources|service_resources|resource_pricing|industries)' THEN
    RAISE EXCEPTION 'get_tenant_data_summary still references a retired t_catalog_* table after patching — aborting migration';
  END IF;

  EXECUTE format(
    'CREATE OR REPLACE FUNCTION public.get_tenant_data_summary(%s) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS %L',
    v_args, v_new);

  RAISE NOTICE 'get_tenant_data_summary patched: t_catalog_* counts removed';
END
$patch$;

-- ─────────────────────────────────────────────────────────────────────────────
-- §2  Drop the legacy-catalog-only RPCs
-- ─────────────────────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.associate_service_resources(p_service_id uuid, p_tenant_id uuid, p_user_id uuid, p_is_live boolean, p_resource_data jsonb, p_idempotency_key character varying);
DROP FUNCTION IF EXISTS public.bulk_create_services(p_tenant_id uuid, p_user_id uuid, p_is_live boolean, p_services_data jsonb, p_idempotency_key character varying);
DROP FUNCTION IF EXISTS public.bulk_update_services(p_tenant_id uuid, p_user_id uuid, p_is_live boolean, p_updates_data jsonb, p_idempotency_key character varying);
DROP FUNCTION IF EXISTS public.copy_catalog_live_to_test(p_tenant_id uuid);
DROP FUNCTION IF EXISTS public.create_catalog_item_version(p_current_item_id uuid, p_version_reason text);
DROP FUNCTION IF EXISTS public.create_service_catalog_item(p_tenant_id uuid, p_user_id uuid, p_is_live boolean, p_service_data jsonb, p_idempotency_key character varying);
DROP FUNCTION IF EXISTS public.delete_service_catalog_item(p_service_id uuid, p_tenant_id uuid, p_user_id uuid, p_is_live boolean, p_idempotency_key character varying);
DROP FUNCTION IF EXISTS public.get_available_resources(p_tenant_id uuid, p_is_live boolean, p_resource_type character varying, p_filters jsonb, p_page integer, p_limit integer);
DROP FUNCTION IF EXISTS public.get_catalog_item_history(p_item_id uuid);
DROP FUNCTION IF EXISTS public.get_next_version_number(p_original_item_id uuid);
DROP FUNCTION IF EXISTS public.get_service_catalog_item(p_service_id uuid, p_tenant_id uuid, p_is_live boolean);
DROP FUNCTION IF EXISTS public.get_service_pricing(p_service_id uuid, p_tenant_id uuid, p_is_live boolean, p_currency_code character varying);
DROP FUNCTION IF EXISTS public.get_service_resources(p_service_id uuid, p_tenant_id uuid, p_is_live boolean);
DROP FUNCTION IF EXISTS public.promote_catalog_test_to_live(p_tenant_id uuid);
DROP FUNCTION IF EXISTS public.query_service_catalog_items(p_tenant_id uuid, p_is_live boolean, p_filters jsonb, p_page integer, p_limit integer);
DROP FUNCTION IF EXISTS public.soft_delete_catalog_item(p_item_id uuid);
DROP FUNCTION IF EXISTS public.update_service_catalog_item(p_service_id uuid, p_tenant_id uuid, p_user_id uuid, p_is_live boolean, p_update_data jsonb, p_idempotency_key character varying);
DROP FUNCTION IF EXISTS public.update_service_pricing(p_service_id uuid, p_tenant_id uuid, p_user_id uuid, p_is_live boolean, p_pricing_data jsonb, p_idempotency_key character varying);
DROP FUNCTION IF EXISTS public.validate_category_environment_consistency();
DROP FUNCTION IF EXISTS public.validate_item_environment_consistency();

-- ─────────────────────────────────────────────────────────────────────────────
-- §3  Safety gate — refuse to drop if any table somehow gained rows
-- ─────────────────────────────────────────────────────────────────────────────
DO $guard$
DECLARE
  t    text;
  n    bigint;
BEGIN
  FOREACH t IN ARRAY ARRAY['t_catalog_items','t_catalog_categories','t_catalog_resources',
                           't_catalog_service_resources','t_catalog_resource_pricing',
                           't_catalog_industries']
  LOOP
    IF to_regclass('public.'||t) IS NULL THEN CONTINUE; END IF;
    EXECUTE format('SELECT COUNT(*) FROM public.%I', t) INTO n;
    IF n > 0 THEN
      RAISE EXCEPTION 'ABORT: %.% still holds % row(s) — legacy catalog is NOT empty, migration halted', 'public', t, n;
    END IF;
  END LOOP;
  RAISE NOTICE 'Safety gate passed — all legacy catalog tables empty';
END
$guard$;

-- ─────────────────────────────────────────────────────────────────────────────
-- §4  Drop the legacy catalog tables
-- ─────────────────────────────────────────────────────────────────────────────
-- CASCADE only removes objects owned BY these tables (their own indexes,
-- triggers, RLS policies, sequences). Verified above that nothing external
-- depends on them.
DROP TABLE IF EXISTS public.t_catalog_service_resources CASCADE;
DROP TABLE IF EXISTS public.t_catalog_resource_pricing  CASCADE;
DROP TABLE IF EXISTS public.t_catalog_items             CASCADE;
DROP TABLE IF EXISTS public.t_catalog_categories        CASCADE;
DROP TABLE IF EXISTS public.t_catalog_resources         CASCADE;
DROP TABLE IF EXISTS public.t_catalog_industries        CASCADE;

-- ─────────────────────────────────────────────────────────────────────────────
-- §5  Post-conditions
-- ─────────────────────────────────────────────────────────────────────────────
DO $verify$
DECLARE
  v_tables int;
  v_funcs  int;
BEGIN
  SELECT COUNT(*) INTO v_tables FROM information_schema.tables
   WHERE table_schema='public'
     AND table_name IN ('t_catalog_items','t_catalog_categories','t_catalog_resources',
                        't_catalog_service_resources','t_catalog_resource_pricing',
                        't_catalog_industries');

  SELECT COUNT(*) INTO v_funcs FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
   WHERE n.nspname='public'
     AND p.prosrc ~* 't_catalog_(items|categories|resources|service_resources|resource_pricing|industries)'
     AND p.proname <> 'admin_reset_all_data';   -- guarded by design, safe

  IF v_tables <> 0 THEN
    RAISE EXCEPTION 'Post-check failed: % legacy catalog table(s) still present', v_tables;
  END IF;
  IF v_funcs <> 0 THEN
    RAISE EXCEPTION 'Post-check failed: % function(s) still reference retired tables', v_funcs;
  END IF;

  RAISE NOTICE 'Legacy service-catalog retired: 6 tables + 20 functions removed, 1 function patched';
END
$verify$;

COMMIT;
