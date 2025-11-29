-- ============================================
-- PHASE 1: Fix Over-Permissive Policies
-- Date: 2025-11-29
-- Priority: P1 - HIGH
-- Tables: t_tax_rates, t_tax_settings
-- ============================================

-- ============================================
-- TABLE 1: t_tax_rates
-- Issue: Has policy "tax_rates_policy" that allows ALL authenticated users
-- Current: 5 policies (mixed patterns)
-- Target: 2 policies (standard pattern)
-- ============================================

-- Step 1: Drop ALL existing policies
DROP POLICY IF EXISTS "tax_rates_policy" ON public.t_tax_rates;
DROP POLICY IF EXISTS "tenant_tax_rates_delete" ON public.t_tax_rates;
DROP POLICY IF EXISTS "tenant_tax_rates_insert" ON public.t_tax_rates;
DROP POLICY IF EXISTS "tenant_tax_rates_select" ON public.t_tax_rates;
DROP POLICY IF EXISTS "tenant_tax_rates_update" ON public.t_tax_rates;

-- Step 2: Create standard policies
CREATE POLICY "service_role_access_t_tax_rates"
ON public.t_tax_rates
AS PERMISSIVE
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "tenant_isolation_t_tax_rates"
ON public.t_tax_rates
AS PERMISSIVE
FOR ALL
TO authenticated
USING (
  tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid
)
WITH CHECK (
  tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid
);

-- ============================================
-- TABLE 2: t_tax_settings
-- Issue: 8 redundant policies including "service_role_bypass_rls_tax_settings"
--        with USING(true) on PUBLIC role (DANGEROUS!)
-- Current: 8 policies
-- Target: 2 policies (standard pattern)
-- ============================================

-- Step 1: Drop ALL existing policies
DROP POLICY IF EXISTS "service_role_bypass_rls_tax_settings" ON public.t_tax_settings;
DROP POLICY IF EXISTS "service_role_full_access_tax_settings" ON public.t_tax_settings;
DROP POLICY IF EXISTS "tax_settings_all_for_super_admins" ON public.t_tax_settings;
DROP POLICY IF EXISTS "tax_settings_insert_for_tenant_admins" ON public.t_tax_settings;
DROP POLICY IF EXISTS "tax_settings_select_for_super_admins" ON public.t_tax_settings;
DROP POLICY IF EXISTS "tax_settings_select_for_tenant_users" ON public.t_tax_settings;
DROP POLICY IF EXISTS "tax_settings_update_for_tenant_admins" ON public.t_tax_settings;
-- Add any other policies that may exist
DROP POLICY IF EXISTS "tax_settings_delete_for_tenant_admins" ON public.t_tax_settings;

-- Step 2: Create standard policies (with super admin support)
CREATE POLICY "service_role_access_t_tax_settings"
ON public.t_tax_settings
AS PERMISSIVE
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Tenant isolation with super admin bypass
CREATE POLICY "tenant_isolation_t_tax_settings"
ON public.t_tax_settings
AS PERMISSIVE
FOR ALL
TO authenticated
USING (
  -- Normal users: tenant isolation
  tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid
  OR
  -- Super admins: can access all tenants
  EXISTS (
    SELECT 1 FROM t_user_profiles
    WHERE user_id = auth.uid() AND is_admin = true
  )
)
WITH CHECK (
  tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid
  OR
  EXISTS (
    SELECT 1 FROM t_user_profiles
    WHERE user_id = auth.uid() AND is_admin = true
  )
);

-- ============================================
-- VERIFICATION
-- ============================================

-- Verify policies
SELECT
  tablename,
  policyname,
  roles::text,
  cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('t_tax_rates', 't_tax_settings')
ORDER BY tablename, policyname;

-- ============================================
-- EXPECTED RESULTS
-- ============================================
-- t_tax_rates: 2 policies
--   - service_role_access_t_tax_rates
--   - tenant_isolation_t_tax_rates
--
-- t_tax_settings: 2 policies
--   - service_role_access_t_tax_settings
--   - tenant_isolation_t_tax_settings

-- ============================================
-- ROLLBACK (if needed)
-- ============================================
/*
-- WARNING: Rollback will restore VULNERABLE state
-- Only use if new policies break functionality

-- t_tax_rates rollback
DROP POLICY IF EXISTS "service_role_access_t_tax_rates" ON public.t_tax_rates;
DROP POLICY IF EXISTS "tenant_isolation_t_tax_rates" ON public.t_tax_rates;

-- Restore old policies (copy from backup before running migration)
CREATE POLICY "tax_rates_policy" ON public.t_tax_rates
  FOR ALL TO authenticated USING (auth.role() = 'authenticated');
-- ... restore other old policies as needed

-- t_tax_settings rollback
DROP POLICY IF EXISTS "service_role_access_t_tax_settings" ON public.t_tax_settings;
DROP POLICY IF EXISTS "tenant_isolation_t_tax_settings" ON public.t_tax_settings;

-- Restore old policies (copy from backup before running migration)
-- ... restore old policies as needed
*/
