-- ============================================================================
-- catalog-studio/008 — the tenant's business currency + the taxes new catalog
-- items carry. ONE truth for both, read by every seeding path (onboarding,
-- VaNi Seeding load + sync, service-only blocks) and by the composer.
-- ============================================================================
-- Before: seeding hard-coded INR, copied every KT currency (signia: INR+EUR+USD)
-- and stamped a flat tax_rate (fallback 18) with EMPTY per-record taxes[] — the
-- contract wizard reads the records, so seeded blocks were billed at 0% tax.
--
--   t_tenant_profiles.default_currency      business currency (column default INR)
--   t_tax_rates.apply_to_catalog            "apply to new catalog items"
--   fn_tenant_currency(tenant)              → 'INR' | the tenant's currency
--   fn_tenant_catalog_tax(tenant)           → {display_mode, inclusion, taxes[{id,name,rate}], total, source}
--        no_tax                   → taxes [] (source 'no_tax')
--        rates flagged            → those (source 'catalog')
--        none flagged             → the settings default rate, else the is_default rate (source 'default')
--        nothing set up           → taxes [] (source 'none') — never a made-up 18%
--   set_catalog_tax_rates(tenant, ids[])    flags exactly these rates
--   set_tenant_currency(tenant, code)       ^[A-Z]{3}$
--   get_tax_settings_with_rates             + apply_to_catalog per rate, + catalog_tax
-- ============================================================================

ALTER TABLE t_tenant_profiles ADD COLUMN IF NOT EXISTS default_currency varchar(3) NOT NULL DEFAULT 'INR';
ALTER TABLE t_tax_rates       ADD COLUMN IF NOT EXISTS apply_to_catalog boolean NOT NULL DEFAULT false;

-- The fallback reads the column default so the default lives in ONE place;
-- normalise it ('INR'::character varying → INR).
CREATE OR REPLACE FUNCTION fn_tenant_currency(p_tenant uuid)
RETURNS text LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v text;
BEGIN
  SELECT nullif(trim(default_currency), '') INTO v FROM t_tenant_profiles WHERE tenant_id = p_tenant;
  IF v IS NULL THEN
    SELECT substring(column_default FROM '''([A-Z]{3})''') INTO v
      FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 't_tenant_profiles' AND column_name = 'default_currency';
  END IF;
  RETURN upper(v);
END $$;

CREATE OR REPLACE FUNCTION fn_tenant_catalog_tax(p_tenant uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_mode text; v_default uuid; v_taxes jsonb; v_source text;
BEGIN
  SELECT display_mode, default_tax_rate_id INTO v_mode, v_default FROM t_tax_settings WHERE tenant_id = p_tenant;
  v_mode := coalesce(v_mode, 'excluding_tax');

  IF v_mode = 'no_tax' THEN
    v_taxes := '[]'::jsonb; v_source := 'no_tax';
  ELSE
    SELECT jsonb_agg(jsonb_build_object('id', r.id, 'name', r.name, 'rate', r.rate) ORDER BY r.sequence_no, r.name)
      INTO v_taxes FROM t_tax_rates r
     WHERE r.tenant_id = p_tenant AND r.is_active AND r.apply_to_catalog;
    v_source := 'catalog';
    IF v_taxes IS NULL THEN
      SELECT jsonb_build_array(jsonb_build_object('id', r.id, 'name', r.name, 'rate', r.rate))
        INTO v_taxes FROM t_tax_rates r
       WHERE r.tenant_id = p_tenant AND r.is_active
         AND (r.id = v_default OR (v_default IS NULL AND r.is_default))
       ORDER BY (r.id = v_default) DESC NULLS LAST LIMIT 1;
      v_source := 'default';
    END IF;
    IF v_taxes IS NULL THEN v_taxes := '[]'::jsonb; v_source := 'none'; END IF;
  END IF;

  RETURN jsonb_build_object(
    'display_mode', v_mode,
    'inclusion', CASE WHEN v_mode = 'including_tax' THEN 'inclusive' ELSE 'exclusive' END,
    'taxes', v_taxes,
    'total', coalesce((SELECT sum((t->>'rate')::numeric) FROM jsonb_array_elements(v_taxes) t), 0),
    'source', v_source,
    'currency', fn_tenant_currency(p_tenant)
  );
END $$;

CREATE OR REPLACE FUNCTION set_catalog_tax_rates(p_tenant uuid, p_rate_ids uuid[])
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_bad int;
BEGIN
  IF p_tenant IS NULL THEN RETURN jsonb_build_object('success', false, 'reason', 'tenant_required'); END IF;
  SELECT count(*) INTO v_bad FROM unnest(coalesce(p_rate_ids, '{}')) i
   WHERE NOT EXISTS (SELECT 1 FROM t_tax_rates r WHERE r.id = i AND r.tenant_id = p_tenant AND r.is_active);
  IF v_bad > 0 THEN
    RETURN jsonb_build_object('success', false, 'reason', 'unknown_rate', 'message', 'One or more tax rates do not exist or are inactive');
  END IF;
  UPDATE t_tax_rates SET apply_to_catalog = (id = ANY(coalesce(p_rate_ids, '{}'))), updated_at = now()
   WHERE tenant_id = p_tenant AND apply_to_catalog IS DISTINCT FROM (id = ANY(coalesce(p_rate_ids, '{}')));
  RETURN jsonb_build_object('success', true, 'catalog_tax', fn_tenant_catalog_tax(p_tenant));
END $$;

CREATE OR REPLACE FUNCTION set_tenant_currency(p_tenant uuid, p_currency text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v text := upper(trim(coalesce(p_currency, '')));
BEGIN
  IF p_tenant IS NULL THEN RETURN jsonb_build_object('success', false, 'reason', 'tenant_required'); END IF;
  IF v !~ '^[A-Z]{3}$' THEN
    RETURN jsonb_build_object('success', false, 'reason', 'invalid_currency', 'message', 'Currency must be a 3-letter code');
  END IF;
  UPDATE t_tenant_profiles SET default_currency = v, updated_at = now() WHERE tenant_id = p_tenant;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'reason', 'no_profile', 'message', 'Save your business profile first');
  END IF;
  RETURN jsonb_build_object('success', true, 'currency', v);
END $$;

-- get_tax_settings_with_rates: + apply_to_catalog per rate, + catalog_tax (anchor rewrite)
DO $$
DECLARE v_src text; v_new text;
BEGIN
  SELECT pg_get_functiondef('get_tax_settings_with_rates(uuid)'::regprocedure) INTO v_src;
  v_new := replace(v_src, $a$'is_active', r.is_active,$a$, $a$'is_active', r.is_active,
                'apply_to_catalog', r.apply_to_catalog,$a$);
  v_new := replace(v_new, $a$'rates', v_rates
    );$a$, $a$'rates', v_rates,
        'catalog_tax', fn_tenant_catalog_tax(p_tenant_id)
    );$a$);
  IF v_new = v_src OR position('apply_to_catalog' in v_new) = 0 OR position('catalog_tax' in v_new) = 0 THEN
    RAISE EXCEPTION 'get_tax_settings_with_rates rewrite did not land';
  END IF;
  EXECUTE v_new;
END $$;

-- Writers and the resolver take a tenant id, so only the server (service role)
-- may call them; the API scopes the tenant from the authenticated request.
REVOKE ALL ON FUNCTION set_catalog_tax_rates(uuid, uuid[]) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION set_tenant_currency(uuid, text)     FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION fn_tenant_catalog_tax(uuid)         FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION set_catalog_tax_rates(uuid, uuid[]) TO service_role;
GRANT EXECUTE ON FUNCTION set_tenant_currency(uuid, text)     TO service_role;
GRANT EXECUTE ON FUNCTION fn_tenant_catalog_tax(uuid)         TO service_role;
GRANT EXECUTE ON FUNCTION fn_tenant_currency(uuid)            TO service_role, authenticated;
