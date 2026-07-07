-- ============================================================================
-- 018 — VaNi Rules security hardening (audit finding, 2026-07-08)
-- ============================================================================
-- FINDING (critical): 017 created m_vani_rule_templates and t_vani_rules
-- without RLS, and Supabase default privileges granted full CRUD to anon +
-- authenticated. Any holder of the anon key could read or rewrite ANY
-- tenant's automation rules directly via PostgREST, bypassing the API and
-- its entitlement gate.
--
-- FIX: enable RLS with NO policies (deny-by-default for PostgREST roles) and
-- revoke the table grants. All legitimate access flows through the
-- SECURITY DEFINER RPCs (get_vani_rules / update_vani_rule / seed_vani_rules,
-- granted to service_role only) and the scanner (SECURITY DEFINER) — none of
-- which are affected by table-level RLS.
-- ============================================================================

ALTER TABLE m_vani_rule_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE t_vani_rules ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON m_vani_rule_templates FROM anon, authenticated;
REVOKE ALL ON t_vani_rules FROM anon, authenticated;

-- ----------------------------------------------------------------------------
-- FINDING 2 (critical, caught by Supabase advisors): `REVOKE ... FROM PUBLIC`
-- does NOT remove the EXECUTE that Supabase default privileges grant DIRECTLY
-- to anon/authenticated — so every SECURITY DEFINER RPC from 015/017 was
-- still callable via PostgREST /rest/v1/rpc/ with the anon key, including
-- update_vani_rule (cross-tenant WRITE) and get_vani_briefing (cross-tenant
-- READ). Revoke the direct grants; only service_role keeps EXECUTE.
-- (The same gap exists platform-wide on ~226 pre-existing functions — see
-- the audit report; fixing those is a separate owner-scoped task.)
-- ----------------------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION start_vani_trial(UUID) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION get_vani_briefing(UUID, BOOLEAN, INTEGER) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION get_vani_rules(UUID) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION update_vani_rule(UUID, TEXT, JSONB, BOOLEAN, INT, UUID) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION seed_vani_rules(UUID) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION run_contract_event_scanner(INT, INT, INT, INT, INT) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION vani_rule_int(UUID, TEXT, TEXT, INT) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION vani_rule_enabled(UUID, TEXT) FROM anon, authenticated;

-- ----------------------------------------------------------------------------
-- FINDING 3 (advisor WARN): trigger functions from 015/017 had a mutable
-- search_path (search-path hijack hardening for SECURITY-sensitive functions).
-- ----------------------------------------------------------------------------
ALTER FUNCTION trg_fn_update_context_on_subscription() SET search_path = public;
ALTER FUNCTION trg_fn_seed_vani_rules() SET search_path = public;
