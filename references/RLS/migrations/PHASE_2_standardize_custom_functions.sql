-- ============================================
-- PHASE 2: Standardize Custom Functions Pattern
-- Date: 2025-11-29
-- Priority: P2 - MEDIUM
-- Tables: 10 tables using get_current_tenant_id() / has_tenant_access()
-- ============================================

-- ============================================
-- MIGRATION STRATEGY
-- ============================================
-- 1. ADD new standard policies (old ones still active - safe)
-- 2. TEST with both active
-- 3. DROP old policies after validation
-- ============================================

-- ============================================
-- TABLE 1: t_category_details
-- ============================================

-- Add new policies first (safe - old ones still work)
CREATE POLICY "service_role_access_t_category_details"
ON public.t_category_details
AS PERMISSIVE FOR ALL TO service_role
USING (true) WITH CHECK (true);

CREATE POLICY "tenant_isolation_t_category_details"
ON public.t_category_details
AS PERMISSIVE FOR ALL TO authenticated
USING (tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid)
WITH CHECK (tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid);

-- Drop old policies (run AFTER testing)
-- DROP POLICY IF EXISTS "category_details_delete_policy" ON public.t_category_details;
-- DROP POLICY IF EXISTS "category_details_insert_policy" ON public.t_category_details;
-- DROP POLICY IF EXISTS "category_details_tenant_isolation" ON public.t_category_details;
-- DROP POLICY IF EXISTS "category_details_update_policy" ON public.t_category_details;

-- ============================================
-- TABLE 2: t_category_master
-- ============================================

CREATE POLICY "service_role_access_t_category_master"
ON public.t_category_master
AS PERMISSIVE FOR ALL TO service_role
USING (true) WITH CHECK (true);

CREATE POLICY "tenant_isolation_t_category_master"
ON public.t_category_master
AS PERMISSIVE FOR ALL TO authenticated
USING (tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid)
WITH CHECK (tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid);

-- Drop old policies (run AFTER testing)
-- DROP POLICY IF EXISTS "category_master_delete_policy" ON public.t_category_master;
-- DROP POLICY IF EXISTS "category_master_insert_policy" ON public.t_category_master;
-- DROP POLICY IF EXISTS "category_master_tenant_isolation" ON public.t_category_master;
-- DROP POLICY IF EXISTS "category_master_update_policy" ON public.t_category_master;

-- ============================================
-- TABLE 3: t_role_permissions
-- ============================================

CREATE POLICY "service_role_access_t_role_permissions"
ON public.t_role_permissions
AS PERMISSIVE FOR ALL TO service_role
USING (true) WITH CHECK (true);

CREATE POLICY "tenant_isolation_t_role_permissions"
ON public.t_role_permissions
AS PERMISSIVE FOR ALL TO authenticated
USING (tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid)
WITH CHECK (tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid);

-- Drop old policies (run AFTER testing)
-- DROP POLICY IF EXISTS "role_permissions_delete_policy" ON public.t_role_permissions;
-- DROP POLICY IF EXISTS "role_permissions_insert_policy" ON public.t_role_permissions;
-- DROP POLICY IF EXISTS "role_permissions_tenant_isolation" ON public.t_role_permissions;
-- DROP POLICY IF EXISTS "role_permissions_update_policy" ON public.t_role_permissions;

-- ============================================
-- TABLE 4: t_tax_info
-- ============================================

CREATE POLICY "service_role_access_t_tax_info"
ON public.t_tax_info
AS PERMISSIVE FOR ALL TO service_role
USING (true) WITH CHECK (true);

CREATE POLICY "tenant_isolation_t_tax_info"
ON public.t_tax_info
AS PERMISSIVE FOR ALL TO authenticated
USING (tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid)
WITH CHECK (tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid);

-- Drop old policies (run AFTER testing)
-- DROP POLICY IF EXISTS "tax_info_delete_policy" ON public.t_tax_info;
-- DROP POLICY IF EXISTS "tax_info_insert_policy" ON public.t_tax_info;
-- DROP POLICY IF EXISTS "tax_info_tenant_isolation" ON public.t_tax_info;
-- DROP POLICY IF EXISTS "tax_info_update_policy" ON public.t_tax_info;

-- ============================================
-- TABLE 5: t_tenant_files
-- ============================================

CREATE POLICY "service_role_access_t_tenant_files"
ON public.t_tenant_files
AS PERMISSIVE FOR ALL TO service_role
USING (true) WITH CHECK (true);

CREATE POLICY "tenant_isolation_t_tenant_files"
ON public.t_tenant_files
AS PERMISSIVE FOR ALL TO authenticated
USING (tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid)
WITH CHECK (tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid);

-- Drop old policies (run AFTER testing)
-- DROP POLICY IF EXISTS "tenant_files_delete_policy" ON public.t_tenant_files;
-- DROP POLICY IF EXISTS "tenant_files_insert_policy" ON public.t_tenant_files;
-- DROP POLICY IF EXISTS "tenant_files_select_policy" ON public.t_tenant_files;
-- DROP POLICY IF EXISTS "tenant_files_update_policy" ON public.t_tenant_files;

-- ============================================
-- TABLE 6: t_tenant_profiles
-- ============================================

CREATE POLICY "service_role_access_t_tenant_profiles"
ON public.t_tenant_profiles
AS PERMISSIVE FOR ALL TO service_role
USING (true) WITH CHECK (true);

CREATE POLICY "tenant_isolation_t_tenant_profiles"
ON public.t_tenant_profiles
AS PERMISSIVE FOR ALL TO authenticated
USING (tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid)
WITH CHECK (tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid);

-- Drop old policies (run AFTER testing)
-- DROP POLICY IF EXISTS "tenant_profiles_delete_policy" ON public.t_tenant_profiles;
-- DROP POLICY IF EXISTS "tenant_profiles_insert_policy" ON public.t_tenant_profiles;
-- DROP POLICY IF EXISTS "tenant_profiles_tenant_isolation" ON public.t_tenant_profiles;
-- DROP POLICY IF EXISTS "tenant_profiles_update_policy" ON public.t_tenant_profiles;

-- ============================================
-- TABLE 7: t_user_profiles
-- Note: Special case - allows user to see their own profile
-- ============================================

CREATE POLICY "service_role_access_t_user_profiles"
ON public.t_user_profiles
AS PERMISSIVE FOR ALL TO service_role
USING (true) WITH CHECK (true);

-- Keep user's ability to see/edit their own profile
CREATE POLICY "tenant_isolation_t_user_profiles"
ON public.t_user_profiles
AS PERMISSIVE FOR ALL TO authenticated
USING (
  -- User can access their own profile
  user_id = auth.uid()
  OR
  -- Or profiles of users in their tenant
  user_id IN (
    SELECT ut.user_id FROM t_user_tenants ut
    WHERE ut.tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid
  )
)
WITH CHECK (
  user_id = auth.uid()
);

-- Drop old policies (run AFTER testing)
-- DROP POLICY IF EXISTS "superadmin_bypass" ON public.t_user_profiles;
-- DROP POLICY IF EXISTS "user_profiles_delete_policy" ON public.t_user_profiles;
-- DROP POLICY IF EXISTS "user_profiles_insert_policy" ON public.t_user_profiles;
-- DROP POLICY IF EXISTS "user_profiles_tenant_isolation" ON public.t_user_profiles;
-- DROP POLICY IF EXISTS "user_profiles_update_policy" ON public.t_user_profiles;

-- ============================================
-- TABLE 8: t_user_tenant_roles
-- Note: Junction table - needs special handling
-- ============================================

CREATE POLICY "service_role_access_t_user_tenant_roles"
ON public.t_user_tenant_roles
AS PERMISSIVE FOR ALL TO service_role
USING (true) WITH CHECK (true);

CREATE POLICY "tenant_isolation_t_user_tenant_roles"
ON public.t_user_tenant_roles
AS PERMISSIVE FOR ALL TO authenticated
USING (
  user_tenant_id IN (
    SELECT id FROM t_user_tenants
    WHERE tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid
  )
)
WITH CHECK (
  user_tenant_id IN (
    SELECT id FROM t_user_tenants
    WHERE tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid
  )
);

-- Drop old policies (run AFTER testing)
-- DROP POLICY IF EXISTS "user_tenant_roles_delete_policy" ON public.t_user_tenant_roles;
-- DROP POLICY IF EXISTS "user_tenant_roles_insert_policy" ON public.t_user_tenant_roles;
-- DROP POLICY IF EXISTS "user_tenant_roles_tenant_isolation" ON public.t_user_tenant_roles;
-- DROP POLICY IF EXISTS "user_tenant_roles_update_policy" ON public.t_user_tenant_roles;

-- ============================================
-- TABLE 9: t_user_tenants
-- Note: Special case - user can see their own memberships
-- ============================================

CREATE POLICY "service_role_access_t_user_tenants"
ON public.t_user_tenants
AS PERMISSIVE FOR ALL TO service_role
USING (true) WITH CHECK (true);

CREATE POLICY "tenant_isolation_t_user_tenants"
ON public.t_user_tenants
AS PERMISSIVE FOR ALL TO authenticated
USING (
  -- User can see their own memberships
  user_id = auth.uid()
  OR
  -- Or memberships in their current tenant
  tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid
)
WITH CHECK (
  tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid
);

-- Drop old policies (run AFTER testing)
-- DROP POLICY IF EXISTS "user_tenants_delete_policy" ON public.t_user_tenants;
-- DROP POLICY IF EXISTS "user_tenants_insert_policy" ON public.t_user_tenants;
-- DROP POLICY IF EXISTS "user_tenants_tenant_isolation" ON public.t_user_tenants;
-- DROP POLICY IF EXISTS "user_tenants_update_policy" ON public.t_user_tenants;

-- ============================================
-- TABLE 10: t_tenant_integrations
-- Note: tenant_id is TEXT type, not UUID - need to handle
-- ============================================

CREATE POLICY "service_role_access_t_tenant_integrations"
ON public.t_tenant_integrations
AS PERMISSIVE FOR ALL TO service_role
USING (true) WITH CHECK (true);

CREATE POLICY "tenant_isolation_t_tenant_integrations"
ON public.t_tenant_integrations
AS PERMISSIVE FOR ALL TO authenticated
USING (
  tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id')::text
)
WITH CHECK (
  tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id')::text
);

-- Drop old policies (run AFTER testing)
-- DROP POLICY IF EXISTS "tenant_integrations_delete_policy" ON public.t_tenant_integrations;
-- DROP POLICY IF EXISTS "tenant_integrations_insert_policy" ON public.t_tenant_integrations;
-- DROP POLICY IF EXISTS "tenant_integrations_select_policy" ON public.t_tenant_integrations;
-- DROP POLICY IF EXISTS "tenant_integrations_update_policy" ON public.t_tenant_integrations;

-- ============================================
-- VERIFICATION
-- ============================================

SELECT
  tablename,
  COUNT(*) as policy_count,
  STRING_AGG(policyname, ', ' ORDER BY policyname) as policies
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    't_category_details', 't_category_master', 't_role_permissions',
    't_tax_info', 't_tenant_files', 't_tenant_profiles',
    't_user_profiles', 't_user_tenant_roles', 't_user_tenants',
    't_tenant_integrations'
  )
GROUP BY tablename
ORDER BY tablename;

-- ============================================
-- CLEANUP SCRIPT (Run AFTER validation)
-- ============================================
/*
-- Uncomment and run after testing confirms new policies work

-- t_category_details
DROP POLICY IF EXISTS "category_details_delete_policy" ON public.t_category_details;
DROP POLICY IF EXISTS "category_details_insert_policy" ON public.t_category_details;
DROP POLICY IF EXISTS "category_details_tenant_isolation" ON public.t_category_details;
DROP POLICY IF EXISTS "category_details_update_policy" ON public.t_category_details;

-- t_category_master
DROP POLICY IF EXISTS "category_master_delete_policy" ON public.t_category_master;
DROP POLICY IF EXISTS "category_master_insert_policy" ON public.t_category_master;
DROP POLICY IF EXISTS "category_master_tenant_isolation" ON public.t_category_master;
DROP POLICY IF EXISTS "category_master_update_policy" ON public.t_category_master;

-- t_role_permissions
DROP POLICY IF EXISTS "role_permissions_delete_policy" ON public.t_role_permissions;
DROP POLICY IF EXISTS "role_permissions_insert_policy" ON public.t_role_permissions;
DROP POLICY IF EXISTS "role_permissions_tenant_isolation" ON public.t_role_permissions;
DROP POLICY IF EXISTS "role_permissions_update_policy" ON public.t_role_permissions;

-- t_tax_info
DROP POLICY IF EXISTS "tax_info_delete_policy" ON public.t_tax_info;
DROP POLICY IF EXISTS "tax_info_insert_policy" ON public.t_tax_info;
DROP POLICY IF EXISTS "tax_info_tenant_isolation" ON public.t_tax_info;
DROP POLICY IF EXISTS "tax_info_update_policy" ON public.t_tax_info;

-- t_tenant_files
DROP POLICY IF EXISTS "tenant_files_delete_policy" ON public.t_tenant_files;
DROP POLICY IF EXISTS "tenant_files_insert_policy" ON public.t_tenant_files;
DROP POLICY IF EXISTS "tenant_files_select_policy" ON public.t_tenant_files;
DROP POLICY IF EXISTS "tenant_files_update_policy" ON public.t_tenant_files;

-- t_tenant_profiles
DROP POLICY IF EXISTS "tenant_profiles_delete_policy" ON public.t_tenant_profiles;
DROP POLICY IF EXISTS "tenant_profiles_insert_policy" ON public.t_tenant_profiles;
DROP POLICY IF EXISTS "tenant_profiles_tenant_isolation" ON public.t_tenant_profiles;
DROP POLICY IF EXISTS "tenant_profiles_update_policy" ON public.t_tenant_profiles;

-- t_user_profiles
DROP POLICY IF EXISTS "superadmin_bypass" ON public.t_user_profiles;
DROP POLICY IF EXISTS "user_profiles_delete_policy" ON public.t_user_profiles;
DROP POLICY IF EXISTS "user_profiles_insert_policy" ON public.t_user_profiles;
DROP POLICY IF EXISTS "user_profiles_tenant_isolation" ON public.t_user_profiles;
DROP POLICY IF EXISTS "user_profiles_update_policy" ON public.t_user_profiles;

-- t_user_tenant_roles
DROP POLICY IF EXISTS "user_tenant_roles_delete_policy" ON public.t_user_tenant_roles;
DROP POLICY IF EXISTS "user_tenant_roles_insert_policy" ON public.t_user_tenant_roles;
DROP POLICY IF EXISTS "user_tenant_roles_tenant_isolation" ON public.t_user_tenant_roles;
DROP POLICY IF EXISTS "user_tenant_roles_update_policy" ON public.t_user_tenant_roles;

-- t_user_tenants
DROP POLICY IF EXISTS "user_tenants_delete_policy" ON public.t_user_tenants;
DROP POLICY IF EXISTS "user_tenants_insert_policy" ON public.t_user_tenants;
DROP POLICY IF EXISTS "user_tenants_tenant_isolation" ON public.t_user_tenants;
DROP POLICY IF EXISTS "user_tenants_update_policy" ON public.t_user_tenants;

-- t_tenant_integrations
DROP POLICY IF EXISTS "tenant_integrations_delete_policy" ON public.t_tenant_integrations;
DROP POLICY IF EXISTS "tenant_integrations_insert_policy" ON public.t_tenant_integrations;
DROP POLICY IF EXISTS "tenant_integrations_select_policy" ON public.t_tenant_integrations;
DROP POLICY IF EXISTS "tenant_integrations_update_policy" ON public.t_tenant_integrations;
*/
