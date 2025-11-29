-- ============================================
-- PHASE 0: Enable RLS on Critical Tables
-- Date: 2025-11-29
-- Priority: P0 - CRITICAL
-- Tables: t_catalog_categories, t_catalog_industries, t_idempotency_keys
-- ============================================

-- ============================================
-- TABLE 1: t_catalog_categories
-- Issue: Has tenant_id but RLS is DISABLED
-- ============================================

-- Step 1: Enable RLS
ALTER TABLE public.t_catalog_categories ENABLE ROW LEVEL SECURITY;

-- Step 2: Service Role Policy
CREATE POLICY "service_role_access_t_catalog_categories"
ON public.t_catalog_categories
AS PERMISSIVE
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Step 3: Tenant Isolation Policy
CREATE POLICY "tenant_isolation_t_catalog_categories"
ON public.t_catalog_categories
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
-- TABLE 2: t_catalog_industries
-- Issue: Has tenant_id but RLS is DISABLED
-- ============================================

-- Step 1: Enable RLS
ALTER TABLE public.t_catalog_industries ENABLE ROW LEVEL SECURITY;

-- Step 2: Service Role Policy
CREATE POLICY "service_role_access_t_catalog_industries"
ON public.t_catalog_industries
AS PERMISSIVE
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Step 3: Tenant Isolation Policy
CREATE POLICY "tenant_isolation_t_catalog_industries"
ON public.t_catalog_industries
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
-- TABLE 3: t_idempotency_keys
-- Issue: Has tenant_id but RLS is DISABLED
-- Note: This is a technical table, service_role only
-- ============================================

-- Step 1: Enable RLS
ALTER TABLE public.t_idempotency_keys ENABLE ROW LEVEL SECURITY;

-- Step 2: Service Role Only Policy
CREATE POLICY "service_role_only_t_idempotency_keys"
ON public.t_idempotency_keys
AS PERMISSIVE
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ============================================
-- VERIFICATION
-- ============================================

-- Verify RLS is enabled
SELECT
  tablename,
  rowsecurity AS rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('t_catalog_categories', 't_catalog_industries', 't_idempotency_keys');

-- Verify policies exist
SELECT
  tablename,
  policyname,
  roles::text,
  cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('t_catalog_categories', 't_catalog_industries', 't_idempotency_keys')
ORDER BY tablename, policyname;

-- ============================================
-- EXPECTED RESULTS
-- ============================================
-- t_catalog_categories: 2 policies (service_role_access, tenant_isolation)
-- t_catalog_industries: 2 policies (service_role_access, tenant_isolation)
-- t_idempotency_keys: 1 policy (service_role_only)

-- ============================================
-- ROLLBACK (if needed)
-- ============================================
/*
DROP POLICY IF EXISTS "service_role_access_t_catalog_categories" ON public.t_catalog_categories;
DROP POLICY IF EXISTS "tenant_isolation_t_catalog_categories" ON public.t_catalog_categories;
ALTER TABLE public.t_catalog_categories DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_access_t_catalog_industries" ON public.t_catalog_industries;
DROP POLICY IF EXISTS "tenant_isolation_t_catalog_industries" ON public.t_catalog_industries;
ALTER TABLE public.t_catalog_industries DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_only_t_idempotency_keys" ON public.t_idempotency_keys;
ALTER TABLE public.t_idempotency_keys DISABLE ROW LEVEL SECURITY;
*/
