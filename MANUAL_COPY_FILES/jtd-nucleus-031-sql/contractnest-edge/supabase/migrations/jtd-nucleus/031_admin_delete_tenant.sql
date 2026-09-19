-- jtd-nucleus/031  --  ALREADY APPLIED LIVE 2026-09-19. Source of record; do NOT re-run.
--
-- 1. admin_delete_tenant -- the hard delete, which did not exist.
--    admin_close_tenant_account only flips status to 'closed', and
--    admin_reset_all_data only clears the data inside a tenant. The t_tenants
--    row itself was never removable, so the platform tenant count never fell:
--    138 rows, 56 of them closed and empty.
--    28 FK children cascade off t_tenants; 9 more are ON DELETE NO ACTION and
--    block it (n_tenant_preferences, t_ai_agent_sessions, t_audit_logs,
--    t_bm_tenant_subscription, t_business_groups, t_group_activity_logs,
--    t_public_payment_declarations, t_tenant_profiles, t_vani_rules), plus a
--    long tail of tenant-scoped tables with no FK at all. Rather than hand-list
--    45 tables in a fragile order, this sweeps every table carrying a tenant_id
--    in repeated passes and lets FK order resolve itself.
--    The sweep swallows FK errors per statement -- exactly the failure mode
--    fixed in 030 -- so it ends by PROVING no row survived and raising if one
--    did, instead of trusting the sweep. Refuses the platform admin tenant.
--
-- 2. admin_purge_orphan_auth_users -- widened from 030.
--    The 030 rule required the identity to have no t_user_profiles row. That is
--    true of throwaway signups but not of a real tenant's users, so deleting a
--    tenant left its logins behind (a first pass caught only 3 of 60). A profile
--    cascades on auth.users delete, so belonging to no tenant is the real test.
--    A platform-admin profile is still never an orphan.

CREATE OR REPLACE FUNCTION public.admin_delete_tenant(p_tenant_id uuid, p_dry_run boolean DEFAULT true)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth AS $fn$
DECLARE
  v_name text; v_admin boolean; r record; c bigint; moved bigint; pass int;
  v_swept bigint := 0; v_left text := ''; v_reset jsonb;
BEGIN
  IF p_tenant_id IS NULL THEN RAISE EXCEPTION 'admin_delete_tenant: p_tenant_id is required'; END IF;
  SELECT name, is_admin INTO v_name, v_admin FROM t_tenants WHERE id = p_tenant_id;
  IF v_name IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'tenant_not_found'); END IF;
  IF v_admin THEN RETURN jsonb_build_object('success', false, 'error', 'refused_admin_tenant', 'tenant', v_name); END IF;

  IF p_dry_run THEN
    RETURN jsonb_build_object('success', true, 'dry_run', true, 'tenant', v_name,
      'users', (SELECT count(*) FROM t_user_tenants WHERE tenant_id = p_tenant_id),
      'contracts', (SELECT count(*) FROM t_contracts WHERE tenant_id = p_tenant_id));
  END IF;

  v_reset := public.admin_reset_all_data(p_tenant_id);

  -- a surviving tenant's contract keeps its row; it only loses the buyer workspace
  UPDATE t_contracts SET buyer_tenant_id = NULL WHERE buyer_tenant_id = p_tenant_id;
  DELETE FROM t_business_groups WHERE admin_tenant_id = p_tenant_id;

  -- sweep every tenant-scoped table; repeated passes let FK order resolve itself
  -- (t_tenant_integrations.tenant_id is text, hence the ::text comparison)
  FOR pass IN 1..12 LOOP
    moved := 0;
    FOR r IN
      SELECT cl.relname AS tbl FROM pg_class cl
      JOIN pg_namespace ns ON ns.oid = cl.relnamespace
      JOIN pg_attribute a ON a.attrelid = cl.oid AND a.attname = 'tenant_id' AND a.attnum > 0
      WHERE ns.nspname = 'public' AND cl.relkind = 'r'
    LOOP
      BEGIN
        EXECUTE format('DELETE FROM public.%I WHERE tenant_id::text = $1', r.tbl) USING p_tenant_id::text;
        GET DIAGNOSTICS c = ROW_COUNT; moved := moved + c;
      EXCEPTION WHEN OTHERS THEN NULL;   -- still blocked by an FK; retry next pass
      END;
    END LOOP;
    v_swept := v_swept + moved;
    EXIT WHEN moved = 0;
  END LOOP;

  -- the sweep swallows FK errors, so prove nothing survived rather than trust it
  FOR r IN
    SELECT cl.relname AS tbl FROM pg_class cl
    JOIN pg_namespace ns ON ns.oid = cl.relnamespace
    JOIN pg_attribute a ON a.attrelid = cl.oid AND a.attname = 'tenant_id' AND a.attnum > 0
    WHERE ns.nspname = 'public' AND cl.relkind = 'r'
  LOOP
    EXECUTE format('SELECT count(*) FROM public.%I WHERE tenant_id::text = $1', r.tbl) INTO c USING p_tenant_id::text;
    IF c > 0 THEN v_left := v_left || r.tbl || '=' || c || ' '; END IF;
  END LOOP;
  IF v_left <> '' THEN
    RAISE EXCEPTION 'admin_delete_tenant(%): rows survived the sweep: %', v_name, v_left;
  END IF;

  DELETE FROM t_tenants WHERE id = p_tenant_id;   -- 28 FK children cascade

  RETURN jsonb_build_object('success', true, 'dry_run', false, 'tenant', v_name,
    'reset', v_reset->'deleted_counts', 'rows_swept', v_swept);
END;
$fn$;

REVOKE ALL ON FUNCTION public.admin_delete_tenant(uuid, boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_tenant(uuid, boolean) TO service_role;

CREATE OR REPLACE FUNCTION public.admin_purge_orphan_auth_users(p_dry_run boolean DEFAULT true)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth AS $fn$
DECLARE
  v_ids uuid[]; v_users jsonb; v_tenants integer := 0; v_deleted integer := 0; v_profiles integer := 0;
BEGIN
  -- An orphan belongs to no tenant and is referenced by none of the non-cascading
  -- FKs into auth.users. It may still have a t_user_profiles row: that cascades.
  -- A platform-admin profile is never an orphan, nor is the creator of a tenant
  -- that still has members.
  SELECT COALESCE(array_agg(u.id), '{}'::uuid[]) INTO v_ids
  FROM auth.users u
  WHERE NOT EXISTS (SELECT 1 FROM t_user_tenants ut WHERE ut.user_id = u.id)
    AND NOT EXISTS (SELECT 1 FROM t_user_profiles p WHERE p.user_id = u.id AND p.is_admin)
    AND NOT EXISTS (SELECT 1 FROM t_contacts c WHERE c.auth_user_id = u.id)
    AND NOT EXISTS (SELECT 1 FROM t_audit_logs a WHERE a.user_id = u.id)
    AND NOT EXISTS (SELECT 1 FROM t_tenant_files f WHERE f.created_by = u.id)
    AND NOT EXISTS (SELECT 1 FROM t_invitation_audit_log l WHERE l.performed_by = u.id)
    AND NOT EXISTS (SELECT 1 FROM t_user_invitations i
                    WHERE u.id IN (i.created_by, i.invited_by, i.accepted_by, i.cancelled_by, i.last_resent_by))
    AND NOT EXISTS (SELECT 1 FROM t_tenants t
                    WHERE t.created_by = u.id
                      AND EXISTS (SELECT 1 FROM t_user_tenants ut2 WHERE ut2.tenant_id = t.id));

  SELECT jsonb_agg(x) INTO v_users FROM (
    SELECT jsonb_build_object('id', u.id, 'email', u.email,
                              'created_at', u.created_at, 'last_sign_in_at', u.last_sign_in_at) AS x
    FROM auth.users u WHERE u.id = ANY(v_ids) ORDER BY u.created_at) s;

  SELECT count(*) INTO v_tenants  FROM t_tenants t WHERE t.created_by = ANY(v_ids);
  SELECT count(*) INTO v_profiles FROM t_user_profiles p WHERE p.user_id = ANY(v_ids);

  IF NOT p_dry_run AND array_length(v_ids, 1) > 0 THEN
    UPDATE t_tenants SET created_by = NULL WHERE created_by = ANY(v_ids);
    DELETE FROM auth.users WHERE id = ANY(v_ids);   -- t_user_profiles cascades
    GET DIAGNOSTICS v_deleted = ROW_COUNT;
  END IF;

  RETURN jsonb_build_object('success', true, 'dry_run', p_dry_run,
    'orphan_users', COALESCE(array_length(v_ids, 1), 0),
    'profiles_cascaded', v_profiles,
    'tenants_created_by_cleared', v_tenants, 'users_deleted', v_deleted,
    'users', COALESCE(v_users, '[]'::jsonb));
END;
$fn$;

REVOKE ALL ON FUNCTION public.admin_purge_orphan_auth_users(boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_purge_orphan_auth_users(boolean) TO service_role;
