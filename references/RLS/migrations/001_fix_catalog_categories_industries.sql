-- ============================================
-- Migration: Enable RLS on t_catalog_categories and t_catalog_industries
-- Date: 2025-11-29
-- Priority: P0 - Critical Fix
-- Author: Claude AI
-- ============================================

-- ============================================
-- PART 1: t_catalog_categories
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
-- PART 2: t_catalog_industries
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
-- VERIFICATION QUERIES
-- ============================================

-- Verify RLS is enabled
SELECT
  tablename,
  rowsecurity AS rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('t_catalog_categories', 't_catalog_industries');

-- Verify policies exist
SELECT
  tablename,
  policyname,
  roles::text,
  cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('t_catalog_categories', 't_catalog_industries')
ORDER BY tablename, policyname;

-- Expected: Each table should have 2 policies:
-- 1. service_role_access_{table}
-- 2. tenant_isolation_{table}

-- ============================================
-- ROLLBACK (if needed)
-- ============================================
/*
-- To rollback, run:

DROP POLICY IF EXISTS "service_role_access_t_catalog_categories" ON public.t_catalog_categories;
DROP POLICY IF EXISTS "tenant_isolation_t_catalog_categories" ON public.t_catalog_categories;
ALTER TABLE public.t_catalog_categories DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_access_t_catalog_industries" ON public.t_catalog_industries;
DROP POLICY IF EXISTS "tenant_isolation_t_catalog_industries" ON public.t_catalog_industries;
ALTER TABLE public.t_catalog_industries DISABLE ROW LEVEL SECURITY;
*/
