-- 070_fix_tax_settings_upsert_record_null_check.sql
-- Fixes create_or_update_tax_settings() incorrectly taking the INSERT branch
-- for tenants that already have a t_tax_settings row, whenever that row has
-- ANY null column (e.g. default_tax_rate_id, the common case for a tenant
-- who hasn't set a specific default rate). Root cause: `v_existing IS NOT
-- NULL` on a PL/pgSQL RECORD variable checks that EVERY field is non-null,
-- not "was a row found" -- a single null column made an existing row look
-- like "no row", sending the UPSERT into INSERT and hitting the
-- unique_tenant_tax_settings constraint. Not specific to display_mode='no_tax'
-- -- reproducible on any save for any tenant whose settings row has a null
-- default_tax_rate_id. Fixed by using the FOUND special variable, which
-- reliably reflects whether the preceding SELECT INTO matched a row.
--
-- Applied live via Supabase MCP and verified (re-ran the exact failing call
-- against a real tenant with a null default_tax_rate_id: now correctly
-- updates the existing row, is_update=true, same id, version incremented)
-- before this migration file was written.

CREATE OR REPLACE FUNCTION public.create_or_update_tax_settings(p_tenant_id uuid, p_display_mode character varying, p_default_tax_rate_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_existing RECORD;
    v_settings RECORD;
    v_is_update BOOLEAN;
    v_effective_rate_id UUID;
BEGIN
    IF p_tenant_id IS NULL THEN
        RETURN jsonb_build_object('error', 'tenant_id is required');
    END IF;

    IF p_display_mode NOT IN ('including_tax', 'excluding_tax', 'no_tax') THEN
        RETURN jsonb_build_object('error', 'Invalid display_mode. Must be "including_tax", "excluding_tax", or "no_tax"');
    END IF;

    v_effective_rate_id := CASE WHEN p_display_mode = 'no_tax' THEN NULL ELSE p_default_tax_rate_id END;

    SELECT * INTO v_existing FROM t_tax_settings WHERE tenant_id = p_tenant_id;
    -- Bug fix: RECORD "IS NOT NULL" checks every field is non-null, not "was a row
    -- found" -- a row with any legitimately-null column (e.g. default_tax_rate_id)
    -- was wrongly treated as "no existing row", sending every such tenant down the
    -- INSERT branch and hitting the unique_tenant_tax_settings constraint. FOUND is
    -- the reliable way to check whether the preceding SELECT INTO matched a row.
    v_is_update := FOUND;

    IF v_is_update THEN
        UPDATE t_tax_settings
        SET display_mode = p_display_mode,
            default_tax_rate_id = v_effective_rate_id,
            version = version + 1,
            updated_at = now()
        WHERE tenant_id = p_tenant_id
        RETURNING * INTO v_settings;
    ELSE
        INSERT INTO t_tax_settings (tenant_id, display_mode, default_tax_rate_id, version)
        VALUES (p_tenant_id, p_display_mode, v_effective_rate_id, 1)
        RETURNING * INTO v_settings;
    END IF;

    RETURN jsonb_build_object(
        'settings', jsonb_build_object(
            'id', v_settings.id,
            'tenant_id', v_settings.tenant_id,
            'display_mode', v_settings.display_mode,
            'default_tax_rate_id', v_settings.default_tax_rate_id,
            'version', v_settings.version,
            'created_at', v_settings.created_at,
            'updated_at', v_settings.updated_at
        ),
        'is_update', v_is_update
    );
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('error', 'Failed to save tax settings: ' || SQLERRM);
END;
$function$;
