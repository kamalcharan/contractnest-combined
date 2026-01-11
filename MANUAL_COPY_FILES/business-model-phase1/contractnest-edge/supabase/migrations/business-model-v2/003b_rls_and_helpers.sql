-- ============================================================
-- Migration: 003b_rls_and_helpers
-- Description: RLS policies and helper functions (excluding is_tenant_admin)
-- Author: Claude Code Session
-- Date: 2025-01-11
-- Phase: 1 - Schema & Product Configs (Deliverable 3, Part B)
-- ============================================================

-- ============================================================
-- Enable RLS on all new tables
-- ============================================================

ALTER TABLE public.t_bm_product_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.t_bm_credit_balance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.t_bm_credit_transaction ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.t_bm_topup_pack ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.t_contract_invoice ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.t_bm_billing_event ENABLE ROW LEVEL SECURITY;


-- ============================================================
-- Helper function: is_platform_admin()
-- Check if user belongs to platform admin tenant
-- ============================================================

CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.t_user_tenants ut
        INNER JOIN public.t_tenants t ON ut.tenant_id = t.id
        WHERE ut.user_id = auth.uid()
          AND ut.status = 'active'
          AND t.is_admin = true
    );
$$;

COMMENT ON FUNCTION public.is_platform_admin IS
'Check if current user belongs to platform admin tenant (t_tenants.is_admin = true)';


-- ============================================================
-- Helper function: get_user_tenant_id()
-- Get user's default tenant_id
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_user_tenant_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT ut.tenant_id
    FROM public.t_user_tenants ut
    WHERE ut.user_id = auth.uid()
      AND ut.status = 'active'
      AND ut.is_default = true
    LIMIT 1;
$$;

COMMENT ON FUNCTION public.get_user_tenant_id IS
'Get the default tenant_id for the current user from t_user_tenants';


-- ============================================================
-- Helper function: user_belongs_to_tenant()
-- Check if user belongs to a specific tenant
-- ============================================================

CREATE OR REPLACE FUNCTION public.user_belongs_to_tenant(p_tenant_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.t_user_tenants ut
        WHERE ut.user_id = auth.uid()
          AND ut.tenant_id = p_tenant_id
          AND ut.status = 'active'
    );
$$;

COMMENT ON FUNCTION public.user_belongs_to_tenant IS
'Check if current user belongs to the specified tenant';


-- ============================================================
-- RLS: t_bm_product_config
-- ============================================================
-- All authenticated users can read active configs
-- Only platform admins can insert/update/delete

DROP POLICY IF EXISTS "product_config_select" ON public.t_bm_product_config;
CREATE POLICY "product_config_select" ON public.t_bm_product_config
    FOR SELECT
    TO authenticated
    USING (is_active = true);

DROP POLICY IF EXISTS "product_config_admin_all" ON public.t_bm_product_config;
CREATE POLICY "product_config_admin_all" ON public.t_bm_product_config
    FOR ALL
    TO authenticated
    USING (public.is_platform_admin())
    WITH CHECK (public.is_platform_admin());


-- ============================================================
-- RLS: t_bm_credit_balance
-- ============================================================
-- Tenants can only see their own credit balances
-- Platform admins can see all

DROP POLICY IF EXISTS "credit_balance_tenant_select" ON public.t_bm_credit_balance;
CREATE POLICY "credit_balance_tenant_select" ON public.t_bm_credit_balance
    FOR SELECT
    TO authenticated
    USING (
        public.user_belongs_to_tenant(tenant_id)
        OR public.is_platform_admin()
    );

DROP POLICY IF EXISTS "credit_balance_admin_all" ON public.t_bm_credit_balance;
CREATE POLICY "credit_balance_admin_all" ON public.t_bm_credit_balance
    FOR ALL
    TO authenticated
    USING (public.is_platform_admin())
    WITH CHECK (public.is_platform_admin());

-- Service role bypass (for RPC functions)
DROP POLICY IF EXISTS "credit_balance_service" ON public.t_bm_credit_balance;
CREATE POLICY "credit_balance_service" ON public.t_bm_credit_balance
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);


-- ============================================================
-- RLS: t_bm_credit_transaction
-- ============================================================
-- Tenants can only see their own transactions (read-only)
-- Only service role/admin can insert

DROP POLICY IF EXISTS "credit_transaction_tenant_select" ON public.t_bm_credit_transaction;
CREATE POLICY "credit_transaction_tenant_select" ON public.t_bm_credit_transaction
    FOR SELECT
    TO authenticated
    USING (
        public.user_belongs_to_tenant(tenant_id)
        OR public.is_platform_admin()
    );

DROP POLICY IF EXISTS "credit_transaction_admin_insert" ON public.t_bm_credit_transaction;
CREATE POLICY "credit_transaction_admin_insert" ON public.t_bm_credit_transaction
    FOR INSERT
    TO authenticated
    WITH CHECK (public.is_platform_admin());

-- Service role bypass (for RPC functions)
DROP POLICY IF EXISTS "credit_transaction_service" ON public.t_bm_credit_transaction;
CREATE POLICY "credit_transaction_service" ON public.t_bm_credit_transaction
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);


-- ============================================================
-- RLS: t_bm_topup_pack
-- ============================================================
-- All authenticated users can see active packs
-- Only platform admins can manage

DROP POLICY IF EXISTS "topup_pack_select" ON public.t_bm_topup_pack;
CREATE POLICY "topup_pack_select" ON public.t_bm_topup_pack
    FOR SELECT
    TO authenticated
    USING (is_active = true);

DROP POLICY IF EXISTS "topup_pack_admin_all" ON public.t_bm_topup_pack;
CREATE POLICY "topup_pack_admin_all" ON public.t_bm_topup_pack
    FOR ALL
    TO authenticated
    USING (public.is_platform_admin())
    WITH CHECK (public.is_platform_admin());


-- ============================================================
-- RLS: t_contract_invoice
-- ============================================================
-- Tenants can only see/manage their own invoices
-- Platform admins can see all

DROP POLICY IF EXISTS "contract_invoice_tenant_select" ON public.t_contract_invoice;
CREATE POLICY "contract_invoice_tenant_select" ON public.t_contract_invoice
    FOR SELECT
    TO authenticated
    USING (
        public.user_belongs_to_tenant(tenant_id)
        OR public.is_platform_admin()
    );

DROP POLICY IF EXISTS "contract_invoice_tenant_insert" ON public.t_contract_invoice;
CREATE POLICY "contract_invoice_tenant_insert" ON public.t_contract_invoice
    FOR INSERT
    TO authenticated
    WITH CHECK (
        public.user_belongs_to_tenant(tenant_id)
        OR public.is_platform_admin()
    );

DROP POLICY IF EXISTS "contract_invoice_tenant_update" ON public.t_contract_invoice;
CREATE POLICY "contract_invoice_tenant_update" ON public.t_contract_invoice
    FOR UPDATE
    TO authenticated
    USING (
        public.user_belongs_to_tenant(tenant_id)
        OR public.is_platform_admin()
    )
    WITH CHECK (
        public.user_belongs_to_tenant(tenant_id)
        OR public.is_platform_admin()
    );

-- No delete policy - invoices should not be deleted (only cancelled)

-- Service role bypass
DROP POLICY IF EXISTS "contract_invoice_service" ON public.t_contract_invoice;
CREATE POLICY "contract_invoice_service" ON public.t_contract_invoice
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);


-- ============================================================
-- RLS: t_bm_billing_event
-- ============================================================
-- Tenants can see their own events (read-only)
-- Platform admins and service role can manage all

DROP POLICY IF EXISTS "billing_event_tenant_select" ON public.t_bm_billing_event;
CREATE POLICY "billing_event_tenant_select" ON public.t_bm_billing_event
    FOR SELECT
    TO authenticated
    USING (
        (tenant_id IS NOT NULL AND public.user_belongs_to_tenant(tenant_id))
        OR public.is_platform_admin()
    );

DROP POLICY IF EXISTS "billing_event_admin_all" ON public.t_bm_billing_event;
CREATE POLICY "billing_event_admin_all" ON public.t_bm_billing_event
    FOR ALL
    TO authenticated
    USING (public.is_platform_admin())
    WITH CHECK (public.is_platform_admin());

-- Service role bypass (for webhooks and background jobs)
DROP POLICY IF EXISTS "billing_event_service" ON public.t_bm_billing_event;
CREATE POLICY "billing_event_service" ON public.t_bm_billing_event
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);


-- ============================================================
-- Grant execute permissions on helper functions
-- ============================================================

GRANT EXECUTE ON FUNCTION public.is_platform_admin TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_tenant_id TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_belongs_to_tenant TO authenticated;


-- ============================================================
-- MIGRATION 003b COMPLETE - RLS Policies & Helper Functions
-- ============================================================
--
-- NOTE: is_tenant_admin() function is NOT included here.
-- It has dependencies (v_audit_logs_detailed view) that require
-- special handling. See 003c_is_tenant_admin_fix.sql
-- ============================================================
