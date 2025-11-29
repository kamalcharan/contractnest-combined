-- ============================================
-- PHASE 3: Standardize Subquery Pattern
-- Date: 2025-11-29
-- Priority: P3 - MEDIUM
-- Tables: 12 tables using tenant_id IN (SELECT ... FROM t_user_tenants)
-- ============================================

-- ============================================
-- TABLE 1: t_tenant_onboarding
-- ============================================

CREATE POLICY "service_role_access_t_tenant_onboarding"
ON public.t_tenant_onboarding
AS PERMISSIVE FOR ALL TO service_role
USING (true) WITH CHECK (true);

CREATE POLICY "tenant_isolation_t_tenant_onboarding"
ON public.t_tenant_onboarding
AS PERMISSIVE FOR ALL TO authenticated
USING (tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid)
WITH CHECK (tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid);

-- Drop old policies (run AFTER testing)
-- DROP POLICY IF EXISTS "tenant_onboarding_insert" ON public.t_tenant_onboarding;
-- DROP POLICY IF EXISTS "tenant_onboarding_select" ON public.t_tenant_onboarding;
-- DROP POLICY IF EXISTS "tenant_onboarding_update" ON public.t_tenant_onboarding;

-- ============================================
-- TABLE 2: t_onboarding_step_status
-- ============================================

CREATE POLICY "service_role_access_t_onboarding_step_status"
ON public.t_onboarding_step_status
AS PERMISSIVE FOR ALL TO service_role
USING (true) WITH CHECK (true);

CREATE POLICY "tenant_isolation_t_onboarding_step_status"
ON public.t_onboarding_step_status
AS PERMISSIVE FOR ALL TO authenticated
USING (tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid)
WITH CHECK (tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid);

-- Drop old policies (run AFTER testing)
-- DROP POLICY IF EXISTS "step_status_insert" ON public.t_onboarding_step_status;
-- DROP POLICY IF EXISTS "step_status_select" ON public.t_onboarding_step_status;
-- DROP POLICY IF EXISTS "step_status_update" ON public.t_onboarding_step_status;

-- ============================================
-- TABLE 3: t_bm_tenant_subscription
-- ============================================

CREATE POLICY "service_role_access_t_bm_tenant_subscription"
ON public.t_bm_tenant_subscription
AS PERMISSIVE FOR ALL TO service_role
USING (true) WITH CHECK (true);

CREATE POLICY "tenant_isolation_t_bm_tenant_subscription"
ON public.t_bm_tenant_subscription
AS PERMISSIVE FOR ALL TO authenticated
USING (tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid)
WITH CHECK (tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid);

-- Drop old policies (run AFTER testing)
-- DROP POLICY IF EXISTS "service_role_manage_subscriptions" ON public.t_bm_tenant_subscription;
-- DROP POLICY IF EXISTS "tenant_view_own_subscriptions" ON public.t_bm_tenant_subscription;

-- ============================================
-- TABLE 4: t_bm_subscription_usage
-- Note: No direct tenant_id, uses subscription_id FK
-- ============================================

CREATE POLICY "service_role_access_t_bm_subscription_usage"
ON public.t_bm_subscription_usage
AS PERMISSIVE FOR ALL TO service_role
USING (true) WITH CHECK (true);

CREATE POLICY "tenant_isolation_t_bm_subscription_usage"
ON public.t_bm_subscription_usage
AS PERMISSIVE FOR SELECT TO authenticated
USING (
  subscription_id IN (
    SELECT subscription_id FROM t_bm_tenant_subscription
    WHERE tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid
  )
);

-- Drop old policies (run AFTER testing)
-- DROP POLICY IF EXISTS "service_role_manage_usage" ON public.t_bm_subscription_usage;
-- DROP POLICY IF EXISTS "tenant_view_own_usage" ON public.t_bm_subscription_usage;

-- ============================================
-- TABLE 5: t_bm_invoice
-- Note: No direct tenant_id, uses subscription_id FK
-- ============================================

CREATE POLICY "service_role_access_t_bm_invoice"
ON public.t_bm_invoice
AS PERMISSIVE FOR ALL TO service_role
USING (true) WITH CHECK (true);

CREATE POLICY "tenant_isolation_t_bm_invoice"
ON public.t_bm_invoice
AS PERMISSIVE FOR SELECT TO authenticated
USING (
  subscription_id IN (
    SELECT subscription_id FROM t_bm_tenant_subscription
    WHERE tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid
  )
);

-- Drop old policies (run AFTER testing)
-- DROP POLICY IF EXISTS "service_role_manage_invoices" ON public.t_bm_invoice;
-- DROP POLICY IF EXISTS "tenant_view_own_invoices" ON public.t_bm_invoice;

-- ============================================
-- TABLE 6: t_tenant_domains
-- ============================================

CREATE POLICY "service_role_access_t_tenant_domains"
ON public.t_tenant_domains
AS PERMISSIVE FOR ALL TO service_role
USING (true) WITH CHECK (true);

CREATE POLICY "tenant_isolation_t_tenant_domains"
ON public.t_tenant_domains
AS PERMISSIVE FOR ALL TO authenticated
USING (tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid)
WITH CHECK (tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid);

-- Drop old policies (run AFTER testing)
-- DROP POLICY IF EXISTS "Service role full access to tenant domains" ON public.t_tenant_domains;
-- DROP POLICY IF EXISTS "Users can view their tenant domains" ON public.t_tenant_domains;

-- ============================================
-- TABLE 7: t_tenant_regions
-- ============================================

CREATE POLICY "service_role_access_t_tenant_regions"
ON public.t_tenant_regions
AS PERMISSIVE FOR ALL TO service_role
USING (true) WITH CHECK (true);

CREATE POLICY "tenant_isolation_t_tenant_regions"
ON public.t_tenant_regions
AS PERMISSIVE FOR ALL TO authenticated
USING (tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid)
WITH CHECK (tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid);

-- Drop old policies (run AFTER testing)
-- DROP POLICY IF EXISTS "Service role full access to tenant regions" ON public.t_tenant_regions;
-- DROP POLICY IF EXISTS "Users can view their tenant regions" ON public.t_tenant_regions;

-- ============================================
-- TABLE 8: t_invitation_audit_log
-- Note: No direct tenant_id, uses invitation_id FK
-- ============================================

CREATE POLICY "service_role_access_t_invitation_audit_log"
ON public.t_invitation_audit_log
AS PERMISSIVE FOR ALL TO service_role
USING (true) WITH CHECK (true);

CREATE POLICY "tenant_isolation_t_invitation_audit_log"
ON public.t_invitation_audit_log
AS PERMISSIVE FOR SELECT TO authenticated
USING (
  invitation_id IN (
    SELECT id FROM t_user_invitations
    WHERE tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid
  )
);

-- Drop old policies (run AFTER testing)
-- DROP POLICY IF EXISTS "Service role can insert audit logs" ON public.t_invitation_audit_log;
-- DROP POLICY IF EXISTS "Users can view audit logs" ON public.t_invitation_audit_log;

-- ============================================
-- TABLE 9: t_user_invitations
-- ============================================

CREATE POLICY "service_role_access_t_user_invitations"
ON public.t_user_invitations
AS PERMISSIVE FOR ALL TO service_role
USING (true) WITH CHECK (true);

CREATE POLICY "tenant_isolation_t_user_invitations"
ON public.t_user_invitations
AS PERMISSIVE FOR ALL TO authenticated
USING (tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid)
WITH CHECK (tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid);

-- Keep public validation for invitation links
CREATE POLICY "public_validate_t_user_invitations"
ON public.t_user_invitations
AS PERMISSIVE FOR SELECT TO public
USING (user_code IS NOT NULL AND secret_code IS NOT NULL);

-- Drop old policies (run AFTER testing)
-- DROP POLICY IF EXISTS "Authorized users can create invitations" ON public.t_user_invitations;
-- DROP POLICY IF EXISTS "Public can validate invitations" ON public.t_user_invitations;
-- DROP POLICY IF EXISTS "Users can update their invitations" ON public.t_user_invitations;
-- DROP POLICY IF EXISTS "Users can view tenant invitations" ON public.t_user_invitations;

-- ============================================
-- TABLE 10: t_contacts
-- ============================================

CREATE POLICY "service_role_access_t_contacts"
ON public.t_contacts
AS PERMISSIVE FOR ALL TO service_role
USING (true) WITH CHECK (true);

CREATE POLICY "tenant_isolation_t_contacts"
ON public.t_contacts
AS PERMISSIVE FOR ALL TO authenticated
USING (tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid)
WITH CHECK (tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid);

-- Drop old policies (run AFTER testing)
-- DROP POLICY IF EXISTS "Users can access contacts from their tenant" ON public.t_contacts;

-- ============================================
-- TABLE 11: t_contact_addresses
-- Note: No direct tenant_id, uses contact_id FK
-- ============================================

CREATE POLICY "service_role_access_t_contact_addresses"
ON public.t_contact_addresses
AS PERMISSIVE FOR ALL TO service_role
USING (true) WITH CHECK (true);

CREATE POLICY "tenant_isolation_t_contact_addresses"
ON public.t_contact_addresses
AS PERMISSIVE FOR ALL TO authenticated
USING (
  contact_id IN (
    SELECT id FROM t_contacts
    WHERE tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid
  )
)
WITH CHECK (
  contact_id IN (
    SELECT id FROM t_contacts
    WHERE tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid
  )
);

-- Drop old policies (run AFTER testing)
-- DROP POLICY IF EXISTS "Users can access contact addresses from their tenant" ON public.t_contact_addresses;

-- ============================================
-- TABLE 12: t_contact_channels
-- Note: No direct tenant_id, uses contact_id FK
-- ============================================

CREATE POLICY "service_role_access_t_contact_channels"
ON public.t_contact_channels
AS PERMISSIVE FOR ALL TO service_role
USING (true) WITH CHECK (true);

CREATE POLICY "tenant_isolation_t_contact_channels"
ON public.t_contact_channels
AS PERMISSIVE FOR ALL TO authenticated
USING (
  contact_id IN (
    SELECT id FROM t_contacts
    WHERE tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid
  )
)
WITH CHECK (
  contact_id IN (
    SELECT id FROM t_contacts
    WHERE tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid
  )
);

-- Drop old policies (run AFTER testing)
-- DROP POLICY IF EXISTS "Users can access contact channels from their tenant" ON public.t_contact_channels;

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
    't_tenant_onboarding', 't_onboarding_step_status',
    't_bm_tenant_subscription', 't_bm_subscription_usage', 't_bm_invoice',
    't_tenant_domains', 't_tenant_regions',
    't_invitation_audit_log', 't_user_invitations',
    't_contacts', 't_contact_addresses', 't_contact_channels'
  )
GROUP BY tablename
ORDER BY tablename;

-- ============================================
-- CLEANUP SCRIPT (Run AFTER validation)
-- ============================================
/*
-- Uncomment and run after testing confirms new policies work

-- t_tenant_onboarding
DROP POLICY IF EXISTS "tenant_onboarding_insert" ON public.t_tenant_onboarding;
DROP POLICY IF EXISTS "tenant_onboarding_select" ON public.t_tenant_onboarding;
DROP POLICY IF EXISTS "tenant_onboarding_update" ON public.t_tenant_onboarding;

-- t_onboarding_step_status
DROP POLICY IF EXISTS "step_status_insert" ON public.t_onboarding_step_status;
DROP POLICY IF EXISTS "step_status_select" ON public.t_onboarding_step_status;
DROP POLICY IF EXISTS "step_status_update" ON public.t_onboarding_step_status;

-- t_bm_tenant_subscription
DROP POLICY IF EXISTS "service_role_manage_subscriptions" ON public.t_bm_tenant_subscription;
DROP POLICY IF EXISTS "tenant_view_own_subscriptions" ON public.t_bm_tenant_subscription;

-- t_bm_subscription_usage
DROP POLICY IF EXISTS "service_role_manage_usage" ON public.t_bm_subscription_usage;
DROP POLICY IF EXISTS "tenant_view_own_usage" ON public.t_bm_subscription_usage;

-- t_bm_invoice
DROP POLICY IF EXISTS "service_role_manage_invoices" ON public.t_bm_invoice;
DROP POLICY IF EXISTS "tenant_view_own_invoices" ON public.t_bm_invoice;

-- t_tenant_domains
DROP POLICY IF EXISTS "Service role full access to tenant domains" ON public.t_tenant_domains;
DROP POLICY IF EXISTS "Users can view their tenant domains" ON public.t_tenant_domains;

-- t_tenant_regions
DROP POLICY IF EXISTS "Service role full access to tenant regions" ON public.t_tenant_regions;
DROP POLICY IF EXISTS "Users can view their tenant regions" ON public.t_tenant_regions;

-- t_invitation_audit_log
DROP POLICY IF EXISTS "Service role can insert audit logs" ON public.t_invitation_audit_log;
DROP POLICY IF EXISTS "Users can view audit logs" ON public.t_invitation_audit_log;

-- t_user_invitations
DROP POLICY IF EXISTS "Authorized users can create invitations" ON public.t_user_invitations;
DROP POLICY IF EXISTS "Public can validate invitations" ON public.t_user_invitations;
DROP POLICY IF EXISTS "Users can update their invitations" ON public.t_user_invitations;
DROP POLICY IF EXISTS "Users can view tenant invitations" ON public.t_user_invitations;

-- t_contacts
DROP POLICY IF EXISTS "Users can access contacts from their tenant" ON public.t_contacts;

-- t_contact_addresses
DROP POLICY IF EXISTS "Users can access contact addresses from their tenant" ON public.t_contact_addresses;

-- t_contact_channels
DROP POLICY IF EXISTS "Users can access contact channels from their tenant" ON public.t_contact_channels;
*/
