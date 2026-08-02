-- 011_cnak_vendor_side.sql
-- ═══════════════════════════════════════════════════════════════════════
-- CNAK sent to the VENDOR (seller) of an expense-side record — viewer-
-- relative side classification for claimed contracts.
--
-- APPLIED TO PROD 2026-08-02 via Supabase MCP (migration name
-- `cnak_vendor_viewer_relative_side`). Kept here for the record — do NOT
-- run again blindly: the DO-block guard aborts if the expected filter
-- line is no longer present in the live definition.
--
-- Background: c.contract_type is relative to the CREATOR ('client' =
-- creator sells / revenue, 'vendor' = creator buys / expense).
-- get_contracts_list includes contracts a tenant can ACCESS via
-- t_contract_access (CNAK claims) but filtered them by the CREATOR's
-- contract_type — so every claimed contract landed on the claimant's
-- Expense side, which is wrong when the claimant is the contract's
-- vendor (accessor_role='vendor': they deliver the work → their REVENUE).
--
-- The patch substitutes the one p_contract_type filter line in the LIVE
-- definition (not retyped) with a viewer-relative CASE:
--   viewer owns the row      → c.contract_type unchanged
--   viewer is an accessor    → accessor_role 'vendor' → 'client' view
--                              (revenue); any other role → 'vendor' view
--                              (expense); no grant row → fall back to
--                              c.contract_type.
--
-- Companion (non-DB) change in the same batch: auth edge function
-- registration.ts derives onboarding_type 'cnak' vs 'cnak_vendor' from
-- t_contract_access.accessor_role, and AuthContext maps 'cnak_vendor' →
-- the seller ('rfq') lite flavor.
-- ═══════════════════════════════════════════════════════════════════════

DO $do$
DECLARE
  v_def TEXT;
BEGIN
  SELECT pg_get_functiondef(oid) INTO v_def
  FROM pg_proc
  WHERE proname = 'get_contracts_list'
    AND pronamespace = 'public'::regnamespace;

  IF v_def IS NULL THEN
    RAISE EXCEPTION 'get_contracts_list not found';
  END IF;

  IF position($old$v_where := v_where || format(' AND c.contract_type = %L', p_contract_type);$old$ IN v_def) = 0 THEN
    RAISE EXCEPTION 'expected p_contract_type filter line not found in get_contracts_list — aborting, function left untouched';
  END IF;

  v_def := replace(
    v_def,
    $old$v_where := v_where || format(' AND c.contract_type = %L', p_contract_type);$old$,
    $new$v_where := v_where || format(
            ' AND (CASE WHEN c.tenant_id = %L THEN c.contract_type
                        ELSE COALESCE((
                            SELECT CASE WHEN LOWER(ca2.accessor_role) = ''vendor''
                                        THEN ''client'' ELSE ''vendor'' END
                            FROM t_contract_access ca2
                            WHERE ca2.contract_id = c.id
                              AND ca2.accessor_tenant_id = %L
                              AND ca2.is_active = true
                            ORDER BY ca2.created_at DESC
                            LIMIT 1
                        ), c.contract_type)
                   END) = %L',
            p_tenant_id, p_tenant_id, p_contract_type);$new$
  );

  EXECUTE v_def;
END $do$;
