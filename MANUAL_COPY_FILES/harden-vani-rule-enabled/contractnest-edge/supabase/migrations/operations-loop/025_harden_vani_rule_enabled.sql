-- ============================================================================
-- 025 — harden vani_rule_enabled to match the codebase security convention
-- ============================================================================
-- vani_rule_enabled was introduced in migration 022 as a plain SQL function
-- without SECURITY DEFINER, REVOKE FROM public, or explicit GRANTs. That left
-- it with the Postgres default (EXECUTE granted to PUBLIC) — inconsistent
-- with every other function in this area (get_vani_rules, update_vani_rule,
-- start_vani_trial, get_vani_briefing) which all use the hardened pattern:
--   SECURITY DEFINER + REVOKE EXECUTE FROM PUBLIC + GRANT TO service_role
-- so they only run when called by the API's server-side service_role client.
--
-- Practical impact of the miss: minimal — the function is read-only and
-- returns a boolean, so info-leak is limited. But an authenticated user
-- could enumerate which notification rules are enabled for any tenant they
-- name, which is inconsistent with the tighter posture everywhere else.
-- This brings it in line.
--
-- Callers verified before revoke:
--   - jtd-worker/index.ts:84 — uses SUPABASE_SERVICE_ROLE_KEY. Safe.
--   - No other caller in the repo (grep for vani_rule_enabled shows only
--     jtd-worker and this migration file).
-- ============================================================================

CREATE OR REPLACE FUNCTION public.vani_rule_enabled(
    p_tenant_id uuid,
    p_rule_key  text
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
    SELECT COALESCE((
        SELECT COALESCE(tr.is_enabled, true)
        FROM m_vani_rule_templates mt
        LEFT JOIN t_vani_rules tr
               ON tr.tenant_id = p_tenant_id AND tr.rule_key = mt.rule_key
        WHERE mt.rule_key = p_rule_key AND mt.is_active = true
    ), true);
$function$;

REVOKE EXECUTE ON FUNCTION public.vani_rule_enabled(uuid, text) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.vani_rule_enabled(uuid, text) TO service_role;
