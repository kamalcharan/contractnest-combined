-- jtd-nucleus/027 — per-tenant template seeding.
-- APPLIED LIVE 2026-09-19. Source of record.
--
-- Owner model: every template is tenant-specific EXCEPT the identity/access
-- ones (signup, invite users, contract sign-off). Tenants will not normally
-- customise; the row exists so that IF they ask for a change, it is made on
-- their own row. The global tenant_id IS NULL rows are the registry.
--
-- jtd_platform_source_types() is the single source of truth and mirrors
-- GATE_EXEMPT_SOURCE_TYPES in jtd-worker/index.ts. Password reset / forgot
-- password are deliberately absent: they are not JTD source types at all
-- (Supabase Auth delivers them).
--
-- Seeds ONE row per (tenant, source_type, channel) — never one per environment
-- the way seedTenantTemplatesService does for sequences. Two rows differing
-- only by is_live would both satisfy getTemplate(), which ends in .single().
-- uq_jtd_template_resolution (026) enforces this physically.

CREATE OR REPLACE FUNCTION public.jtd_platform_source_types()
RETURNS text[] LANGUAGE sql IMMUTABLE AS
$f$ SELECT ARRAY['user_invite','user_created','contract_signoff']::text[] $f$;

COMMENT ON FUNCTION public.jtd_platform_source_types() IS
  'Identity/access message source types. Stay GLOBAL only — never seeded per tenant. Mirrors GATE_EXEMPT_SOURCE_TYPES in jtd-worker/index.ts.';

CREATE OR REPLACE FUNCTION public.fn_seed_jtd_templates_for_tenant(p_tenant uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS
$f$
DECLARE v_ins int := 0; v_expected int; v_covered int; v_status text;
BEGIN
  IF p_tenant IS NULL THEN
    RAISE EXCEPTION 'fn_seed_jtd_templates_for_tenant: p_tenant is required';
  END IF;

  SELECT status INTO v_status FROM t_tenants WHERE id = p_tenant;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'reason', 'tenant_not_found');
  END IF;
  -- closed tenants are not re-populated; reopening should call this explicitly
  IF COALESCE(v_status,'') = 'closed' THEN
    RETURN jsonb_build_object('success', false, 'reason', 'tenant_closed');
  END IF;

  INSERT INTO n_jtd_templates (tenant_id, template_key, name, description, channel_code,
         source_type_code, subject, content, content_html, variables,
         provider_template_id, version, is_live, is_active)
  SELECT p_tenant, g.template_key, g.name, g.description, g.channel_code,
         g.source_type_code, g.subject, g.content, g.content_html, g.variables,
         g.provider_template_id, COALESCE(g.version, 1), true, true
    FROM n_jtd_templates g
   WHERE g.tenant_id IS NULL AND g.is_active
     AND g.source_type_code <> ALL (public.jtd_platform_source_types())
  ON CONFLICT (COALESCE(tenant_id, '00000000-0000-0000-0000-000000000000'::uuid),
               source_type_code, channel_code) WHERE is_active DO NOTHING;
  GET DIAGNOSTICS v_ins = ROW_COUNT;

  SELECT count(*) INTO v_expected FROM n_jtd_templates g
   WHERE g.tenant_id IS NULL AND g.is_active
     AND g.source_type_code <> ALL (public.jtd_platform_source_types());

  SELECT count(*) INTO v_covered FROM n_jtd_templates g
   WHERE g.tenant_id IS NULL AND g.is_active
     AND g.source_type_code <> ALL (public.jtd_platform_source_types())
     AND EXISTS (SELECT 1 FROM n_jtd_templates t
                  WHERE t.tenant_id = p_tenant AND t.is_active
                    AND t.source_type_code = g.source_type_code
                    AND t.channel_code = g.channel_code);

  RETURN jsonb_build_object('success', true, 'tenant_id', p_tenant, 'inserted', v_ins,
    'expected', v_expected, 'covered', v_covered, 'missing', v_expected - v_covered);
END $f$;

COMMENT ON FUNCTION public.fn_seed_jtd_templates_for_tenant(uuid) IS
  'Copies every active tenant-scope registry template to one tenant. Idempotent (ON CONFLICT on uq_jtd_template_resolution). Never touches rows the tenant already has, and never copies platform source types.';

-- Trigger: same shape and fail-open posture as the five seeders already on
-- t_tenants (cadence, event statuses, VaNi rules, integrations, default plan).
CREATE OR REPLACE FUNCTION public.trg_fn_seed_jtd_templates()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS
$f$
BEGIN
    BEGIN
        PERFORM public.fn_seed_jtd_templates_for_tenant(NEW.id);
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'fn_seed_jtd_templates_for_tenant failed for tenant %: %', NEW.id, SQLERRM;
    END;
    RETURN NEW;
END $f$;

DROP TRIGGER IF EXISTS trg_tenants_seed_jtd_templates ON public.t_tenants;
CREATE TRIGGER trg_tenants_seed_jtd_templates
  AFTER INSERT ON public.t_tenants
  FOR EACH ROW EXECUTE FUNCTION public.trg_fn_seed_jtd_templates();

DO $check$
DECLARE v_n int;
BEGIN
  SELECT count(*) INTO v_n FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname='public' AND p.proname IN
     ('jtd_platform_source_types','fn_seed_jtd_templates_for_tenant','trg_fn_seed_jtd_templates');
  IF v_n <> 3 THEN RAISE EXCEPTION '027: expected 3 functions, found %', v_n; END IF;

  SELECT count(*) INTO v_n FROM pg_trigger
   WHERE NOT tgisinternal AND tgname = 'trg_tenants_seed_jtd_templates'
     AND tgrelid = 'public.t_tenants'::regclass;
  IF v_n <> 1 THEN RAISE EXCEPTION '027: trigger not attached'; END IF;
END $check$;
