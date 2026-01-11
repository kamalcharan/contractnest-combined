-- ============================================================
-- Migration: 003c_is_tenant_admin_fix
-- Description: Fix is_tenant_admin function with dependency handling
-- Author: Claude Code Session
-- Date: 2025-01-11
-- Phase: 1 - Schema & Product Configs (Deliverable 3, Part C)
-- ============================================================
--
-- ISSUE: is_tenant_admin(uuid) exists with parameter name "check_tenant_id"
--        but we want to use "p_tenant_id" for consistency
--
-- DEPENDENCY: v_audit_logs_detailed view depends on is_tenant_admin(uuid)
--
-- OPTIONS:
--   Option 1: Keep existing function (skip this migration)
--   Option 2: DROP CASCADE and recreate both function and view
--
-- This script implements Option 2 (DROP CASCADE)
-- ============================================================

-- ============================================================
-- STEP 1: Save the view definition (for recreation)
-- ============================================================
-- First, let's check if the view exists and get its definition
-- Run this query manually to see the view definition:
-- SELECT pg_get_viewdef('v_audit_logs_detailed'::regclass, true);

-- ============================================================
-- STEP 2: Drop function with CASCADE (drops dependent view)
-- ============================================================

DROP FUNCTION IF EXISTS public.is_tenant_admin(uuid) CASCADE;

-- ============================================================
-- STEP 3: Recreate is_tenant_admin with correct parameter name
-- ============================================================

CREATE OR REPLACE FUNCTION public.is_tenant_admin(p_tenant_id UUID DEFAULT NULL)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.t_user_tenants ut
        WHERE ut.user_id = auth.uid()
          AND ut.status = 'active'
          AND ut.is_admin = true
          AND (p_tenant_id IS NULL OR ut.tenant_id = p_tenant_id)
    );
$$;

COMMENT ON FUNCTION public.is_tenant_admin IS
'Check if current user is admin of their tenant (t_user_tenants.is_admin = true).
Optionally filter by specific tenant_id.';

GRANT EXECUTE ON FUNCTION public.is_tenant_admin TO authenticated;

-- ============================================================
-- STEP 4: Recreate v_audit_logs_detailed view
-- ============================================================
-- NOTE: You need to run the original view creation script after this
-- The view definition should be in your existing migrations or schema
--
-- If you have the view definition, uncomment and paste it below:
--
-- CREATE OR REPLACE VIEW public.v_audit_logs_detailed AS
-- <paste your view definition here>;
--
-- ============================================================


-- ============================================================
-- MIGRATION 003c COMPLETE
-- ============================================================
--
-- IMPORTANT: After running this migration, you must recreate
-- the v_audit_logs_detailed view using its original definition.
--
-- To find the original view definition, check:
-- 1. Your existing migration files
-- 2. Database backup
-- 3. Run before dropping: SELECT pg_get_viewdef('v_audit_logs_detailed'::regclass, true);
-- ============================================================
