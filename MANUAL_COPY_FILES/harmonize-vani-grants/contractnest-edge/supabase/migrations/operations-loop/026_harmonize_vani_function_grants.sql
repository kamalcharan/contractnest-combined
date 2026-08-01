-- ============================================================================
-- 026 — harmonize vani_* function grants with the codebase convention
-- ============================================================================
-- The four vani_* functions (get_vani_rules, update_vani_rule, start_vani_trial,
-- get_vani_briefing) were shipped with EXECUTE granted only to postgres +
-- service_role — tighter than every other RPC the API calls.
--
-- Every OTHER RPC in the codebase (get_tenant_cadence_settings, upsert_tenant_
-- cadence_settings, materialize_tenant_resources, icp_similar_tenants,
-- insert_audit_logs_batch, seed_sample_contacts, and dozens more) is granted
-- to PUBLIC + anon + authenticated + postgres + service_role. The pattern is:
--   "grant EXECUTE broadly; SECURITY DEFINER + explicit p_tenant_id parameter
--    is what enforces safety at the function body level."
--
-- The vani_* deviation surfaced when calling Automation Rules from Railway:
-- the API's SUPABASE_KEY env var is the anon key (matching every other service
-- in the API, which uses SUPABASE_KEY, not SUPABASE_SERVICE_ROLE_KEY). Anon
-- wasn't on the vani_* grantee list -> "permission denied for function
-- get_vani_rules". Local dev happened to work because dev had SERVICE_ROLE_KEY
-- set, masking the deviation for a year.
--
-- This migration re-grants all five vani_* functions (four pre-existing + the
-- vani_rule_enabled introduced in migration 022 and further hardened wrongly
-- in migration 025) to match the actual codebase convention. Also drops
-- migration 025's overly-tight state along the way.
--
-- Safety: all these functions are SECURITY DEFINER with a p_tenant_id
-- parameter that scopes their reads/writes. Granting EXECUTE to anon/
-- authenticated is safe because the tenant scoping is done inside the
-- function body, not at the grant boundary — same as every other RPC in
-- the codebase.
-- ============================================================================

-- get_vani_rules: takes p_tenant_id, returns that tenant's rules only
GRANT EXECUTE ON FUNCTION public.get_vani_rules(uuid)
  TO PUBLIC, anon, authenticated;

-- update_vani_rule: takes p_tenant_id, upserts one row for that tenant only
GRANT EXECUTE ON FUNCTION public.update_vani_rule(
    uuid, text, jsonb, boolean, integer, uuid
) TO PUBLIC, anon, authenticated;

-- start_vani_trial: takes p_tenant_id, idempotent trial start for that tenant only
GRANT EXECUTE ON FUNCTION public.start_vani_trial(uuid)
  TO PUBLIC, anon, authenticated;

-- get_vani_briefing: takes p_tenant_id, returns that tenant's briefing only
GRANT EXECUTE ON FUNCTION public.get_vani_briefing(uuid, boolean, integer)
  TO PUBLIC, anon, authenticated;

-- vani_rule_enabled: takes p_tenant_id, returns a boolean for that tenant's rule.
-- Undoes migration 025's over-tight REVOKE — that migration was wrong (it
-- harmonized to the wrong precedent).
GRANT EXECUTE ON FUNCTION public.vani_rule_enabled(uuid, text)
  TO PUBLIC, anon, authenticated;
