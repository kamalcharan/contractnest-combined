-- ============================================
-- PHASE 4: Fix Deprecated Pattern
-- Date: 2025-11-29
-- Priority: P2 - LOW
-- Tables: t_category_resources_master (uses app_metadata)
-- ============================================

-- ============================================
-- TABLE: t_category_resources_master
-- Issue: Uses deprecated auth.jwt()->'app_metadata'->>'tenant_id'
-- Current: 2 policies with different patterns
-- Target: 2 standard policies
-- ============================================

-- Step 1: Add new standard policies
CREATE POLICY "service_role_access_t_category_resources_master"
ON public.t_category_resources_master
AS PERMISSIVE FOR ALL TO service_role
USING (true) WITH CHECK (true);

CREATE POLICY "tenant_isolation_t_category_resources_master"
ON public.t_category_resources_master
AS PERMISSIVE FOR ALL TO authenticated
USING (tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid)
WITH CHECK (tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid);

-- Step 2: Enable RLS (if not already - Query 1 showed it as disabled)
ALTER TABLE public.t_category_resources_master ENABLE ROW LEVEL SECURITY;

-- Drop old policies (run AFTER testing)
-- DROP POLICY IF EXISTS "category_resources_master_policy" ON public.t_category_resources_master;
-- DROP POLICY IF EXISTS "tenant_isolation" ON public.t_category_resources_master;

-- ============================================
-- VERIFICATION
-- ============================================

SELECT
  tablename,
  policyname,
  roles::text,
  cmd,
  qual::text as using_clause
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 't_category_resources_master'
ORDER BY policyname;

-- ============================================
-- CLEANUP SCRIPT (Run AFTER validation)
-- ============================================
/*
DROP POLICY IF EXISTS "category_resources_master_policy" ON public.t_category_resources_master;
DROP POLICY IF EXISTS "tenant_isolation" ON public.t_category_resources_master;
*/
