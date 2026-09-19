-- jtd-nucleus/030  --  ALREADY APPLIED LIVE 2026-09-19. Source of record; do NOT re-run.
--
-- 1. admin_reset_all_data was silently leaving data behind.
--    Four tables reference t_contracts / t_invoices / n_jtd with ON DELETE NO ACTION
--    and appeared in none of the function's 38 DELETE statements:
--        t_contract_event_assets        -> t_contracts
--        t_public_payment_declarations  -> t_contracts, t_invoices
--        t_session_payment_declarations -> t_invoices (adhoc_invoice_id)
--        t_invoice_receipt_allocations  -> n_jtd
--    The parent DELETE therefore raised an FK violation, which that statement's own
--    `EXCEPTION WHEN OTHERS THEN NULL` swallowed -- and the function still returned
--    success:true. Live effect: tenant flow1 (closed) kept 2 contracts + 5 event
--    assets after a "successful" reset.
--    Fix: delete the four, tenant-scoped, ahead of their parents. All four carry
--    tenant_id, so no subquery is needed.
--
-- 2. admin_purge_orphan_auth_users(p_dry_run) -- the "orphan" option.
--    Closing an account clears its tenant data but leaves the auth identity behind:
--    143 auth.users against 77 t_user_tenants rows. This deletes only identities
--    that belong to no tenant, have no profile, and are referenced by none of the
--    non-cascading FKs into auth.users. t_tenants.created_by is NO ACTION and
--    nullable, so it is released rather than cascading the tenant row away.
--    Dry run by default; service_role only.

DO $do$
BEGIN
  PERFORM public.jtd__rewrite_fn('admin_reset_all_data',
    E'  BEGIN DELETE FROM t_invoice_receipts WHERE tenant_id = p_tenant_id;\n',
    E'  BEGIN DELETE FROM t_public_payment_declarations WHERE tenant_id = p_tenant_id;\n'
    || E'    GET DIAGNOSTICS v_count = ROW_COUNT; v_total := v_total + v_count; EXCEPTION WHEN OTHERS THEN NULL; END;\n'
    || E'  BEGIN DELETE FROM t_session_payment_declarations WHERE tenant_id = p_tenant_id;\n'
    || E'    GET DIAGNOSTICS v_count = ROW_COUNT; v_total := v_total + v_count; EXCEPTION WHEN OTHERS THEN NULL; END;\n'
    || E'  BEGIN DELETE FROM t_invoice_receipt_allocations WHERE tenant_id = p_tenant_id;\n'
    || E'    GET DIAGNOSTICS v_count = ROW_COUNT; v_total := v_total + v_count; EXCEPTION WHEN OTHERS THEN NULL; END;\n'
    || E'  BEGIN DELETE FROM t_invoice_receipts WHERE tenant_id = p_tenant_id;\n',
    '030a');

  PERFORM public.jtd__rewrite_fn('admin_reset_all_data',
    E'  BEGIN DELETE FROM t_contracts WHERE tenant_id = p_tenant_id;\n',
    E'  BEGIN DELETE FROM t_contract_event_assets WHERE tenant_id = p_tenant_id;\n'
    || E'    GET DIAGNOSTICS v_count = ROW_COUNT; v_total := v_total + v_count;\n'
    || E'    v_deleted_counts := v_deleted_counts || jsonb_build_object(''contract_event_assets'', v_count); EXCEPTION WHEN OTHERS THEN NULL; END;\n'
    || E'  BEGIN DELETE FROM t_contracts WHERE tenant_id = p_tenant_id;\n',
    '030b');
END $do$;

CREATE OR REPLACE FUNCTION public.admin_purge_orphan_auth_users(p_dry_run boolean DEFAULT true)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth AS $fn$
DECLARE
  v_ids uuid[]; v_users jsonb; v_tenants integer := 0; v_deleted integer := 0;
BEGIN
  -- An orphan belongs to no tenant, has no profile, and is referenced by none of
  -- the non-cascading FKs into auth.users. A tenant they created that still has
  -- members keeps its creator, so such a user is never an orphan.
  SELECT COALESCE(array_agg(u.id), '{}'::uuid[]) INTO v_ids
  FROM auth.users u
  WHERE NOT EXISTS (SELECT 1 FROM t_user_tenants ut WHERE ut.user_id = u.id)
    AND NOT EXISTS (SELECT 1 FROM t_user_profiles p WHERE p.user_id = u.id)
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

  SELECT count(*) INTO v_tenants FROM t_tenants t WHERE t.created_by = ANY(v_ids);

  IF NOT p_dry_run AND array_length(v_ids, 1) > 0 THEN
    -- t_tenants.created_by is NO ACTION and nullable: release it, keep the tenant row
    UPDATE t_tenants SET created_by = NULL WHERE created_by = ANY(v_ids);
    DELETE FROM auth.users WHERE id = ANY(v_ids);
    GET DIAGNOSTICS v_deleted = ROW_COUNT;
  END IF;

  RETURN jsonb_build_object('success', true, 'dry_run', p_dry_run,
    'orphan_users', COALESCE(array_length(v_ids, 1), 0),
    'tenants_created_by_cleared', v_tenants, 'users_deleted', v_deleted,
    'users', COALESCE(v_users, '[]'::jsonb));
END;
$fn$;

REVOKE ALL ON FUNCTION public.admin_purge_orphan_auth_users(boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_purge_orphan_auth_users(boolean) TO service_role;

-- the anchor-rewrite technique fails silently on a whitespace mismatch: post-check it landed
DO $do$
DECLARE n integer;
BEGIN
  SELECT count(*) INTO n FROM pg_proc p, regexp_matches(p.prosrc, 't_contract_event_assets|t_public_payment_declarations|t_session_payment_declarations|t_invoice_receipt_allocations', 'g')
   WHERE p.proname = 'admin_reset_all_data';
  IF n <> 4 THEN RAISE EXCEPTION '030: expected 4 new deletes in admin_reset_all_data, found %', n; END IF;
END $do$;
