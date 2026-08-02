-- ============================================================
-- 09_fix_profile_type_perspective.sql
-- Demo tenant setup — fix perspective initialization (applied live 2026-08-02)
--
-- ROOT CAUSE: the tenant-profile edge function serves the API field
-- `business_type_id` from the legacy `profile_type` COLUMN, not from the
-- `business_type_id` column:
--   transformProfileToResponse():  business_type_id: data.profile_type
-- and the real onboarding POST writes:
--   profile_type := requestData.business_type_id ?? requestData.persona
--
-- The UI (TenantContext.tsx) calls initializePerspective(profile.business_type_id)
-- on login — only when truthy. Scripts 01/07 set `persona` and the
-- `business_type_id` column but left `profile_type` NULL, so the API returned
-- business_type_id: null, the perspective was never initialized, and every
-- demo tenant (buyers included) landed on the default Revenue side —
-- hiding buyer contracts/registries that live in the Expense view.
--
-- FIX: mirror persona into profile_type, matching what real onboarding writes.
-- Effect is immediate (edge profile cache TTL is 30s) — re-login required.
-- ============================================================

UPDATE t_tenant_profiles
SET profile_type = persona, updated_at = now()
WHERE tenant_id::text LIKE 'c0000000-0000-4000-8000-%'
  AND profile_type IS DISTINCT FROM persona;

-- Verification: all 7 rows should show profile_type = persona
-- SELECT tenant_id, persona, profile_type FROM t_tenant_profiles
-- WHERE tenant_id::text LIKE 'c0000000-0000-4000-8000-%';
