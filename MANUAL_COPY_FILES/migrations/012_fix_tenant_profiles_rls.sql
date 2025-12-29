-- Migration: Fix RLS policies for t_tenant_profiles
-- Problem: Current policies require get_current_tenant_id() which may return NULL
-- Solution: Simpler policies that only check has_tenant_access()

-- Step 1: Drop existing policies
DROP POLICY IF EXISTS "tenant_profiles_tenant_isolation" ON public.t_tenant_profiles;
DROP POLICY IF EXISTS "tenant_profiles_insert_policy" ON public.t_tenant_profiles;
DROP POLICY IF EXISTS "tenant_profiles_update_policy" ON public.t_tenant_profiles;
DROP POLICY IF EXISTS "tenant_profiles_delete_policy" ON public.t_tenant_profiles;

-- Step 2: Ensure RLS is enabled
ALTER TABLE public.t_tenant_profiles ENABLE ROW LEVEL SECURITY;

-- Step 3: Create new policies

-- SELECT: Users can read profiles of tenants they belong to
CREATE POLICY "tenant_profiles_select_policy"
ON public.t_tenant_profiles
FOR SELECT
TO authenticated
USING (
  -- User must be an active member of this tenant
  EXISTS (
    SELECT 1 FROM public.t_user_tenants ut
    WHERE ut.user_id = auth.uid()
    AND ut.tenant_id = t_tenant_profiles.tenant_id
    AND ut.status = 'active'
  )
);

-- INSERT: Only owners/admins can create profiles
CREATE POLICY "tenant_profiles_insert_policy"
ON public.t_tenant_profiles
FOR INSERT
TO authenticated
WITH CHECK (
  -- User must be Owner or Admin of this tenant
  EXISTS (
    SELECT 1 FROM public.t_user_tenants ut
    JOIN public.t_user_tenant_roles utr ON ut.id = utr.user_tenant_id
    JOIN public.t_category_details cd ON utr.role_id = cd.id
    WHERE ut.user_id = auth.uid()
    AND ut.tenant_id = t_tenant_profiles.tenant_id
    AND ut.status = 'active'
    AND cd.sub_cat_name IN ('Owner', 'Admin')
  )
);

-- UPDATE: Only owners/admins can update profiles
CREATE POLICY "tenant_profiles_update_policy"
ON public.t_tenant_profiles
FOR UPDATE
TO authenticated
USING (
  -- User must be Owner or Admin of this tenant
  EXISTS (
    SELECT 1 FROM public.t_user_tenants ut
    JOIN public.t_user_tenant_roles utr ON ut.id = utr.user_tenant_id
    JOIN public.t_category_details cd ON utr.role_id = cd.id
    WHERE ut.user_id = auth.uid()
    AND ut.tenant_id = t_tenant_profiles.tenant_id
    AND ut.status = 'active'
    AND cd.sub_cat_name IN ('Owner', 'Admin')
  )
)
WITH CHECK (
  -- Same check for the new values
  EXISTS (
    SELECT 1 FROM public.t_user_tenants ut
    JOIN public.t_user_tenant_roles utr ON ut.id = utr.user_tenant_id
    JOIN public.t_category_details cd ON utr.role_id = cd.id
    WHERE ut.user_id = auth.uid()
    AND ut.tenant_id = t_tenant_profiles.tenant_id
    AND ut.status = 'active'
    AND cd.sub_cat_name IN ('Owner', 'Admin')
  )
);

-- DELETE: Only owners can delete profiles
CREATE POLICY "tenant_profiles_delete_policy"
ON public.t_tenant_profiles
FOR DELETE
TO authenticated
USING (
  -- User must be Owner of this tenant
  EXISTS (
    SELECT 1 FROM public.t_user_tenants ut
    JOIN public.t_user_tenant_roles utr ON ut.id = utr.user_tenant_id
    JOIN public.t_category_details cd ON utr.role_id = cd.id
    WHERE ut.user_id = auth.uid()
    AND ut.tenant_id = t_tenant_profiles.tenant_id
    AND ut.status = 'active'
    AND cd.sub_cat_name = 'Owner'
  )
);

-- Step 4: Allow service role full access (for Edge Functions)
CREATE POLICY "tenant_profiles_service_role_policy"
ON public.t_tenant_profiles
TO service_role
USING (true)
WITH CHECK (true);

-- Verify RLS is enabled
SELECT
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE tablename = 't_tenant_profiles';

-- List policies for verification
SELECT
  policyname,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 't_tenant_profiles';
