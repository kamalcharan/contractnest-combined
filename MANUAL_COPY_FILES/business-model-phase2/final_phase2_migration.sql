-- ============================================================================
-- BUSINESS MODEL PHASE 2 - COMPLETE MIGRATION
-- ============================================================================
-- Version: 1.0.0
-- Date: January 2026
-- Purpose: All RPC functions for Phase 2 Billing API
-- Depends on: Phase 1 tables (t_bm_credit_balance, t_bm_topup_pack, etc.)
-- ============================================================================

-- ============================================================================
-- CLEANUP: Drop existing functions to avoid conflicts
-- ============================================================================

-- Drop credit operation functions (all signatures)
DROP FUNCTION IF EXISTS public.add_credits(UUID, TEXT, INTEGER, TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.add_credits(UUID, TEXT, TEXT, INTEGER, TEXT, TEXT, UUID, TEXT, TIMESTAMPTZ, UUID);
DROP FUNCTION IF EXISTS public.deduct_credits(UUID, TEXT, INTEGER, TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.deduct_credits(UUID, TEXT, TEXT, INTEGER, TEXT, UUID, TEXT, UUID);
DROP FUNCTION IF EXISTS public.check_credit_availability(UUID, TEXT, INTEGER, TEXT);
DROP FUNCTION IF EXISTS public.check_credit_availability(UUID, TEXT, TEXT, INTEGER);

-- Drop read operation functions
DROP FUNCTION IF EXISTS public.get_subscription_details(UUID);
DROP FUNCTION IF EXISTS public.get_billing_status(UUID);
DROP FUNCTION IF EXISTS public.get_billing_alerts(UUID);
DROP FUNCTION IF EXISTS public.get_credit_balance(UUID);
DROP FUNCTION IF EXISTS public.get_credit_balance(UUID, TEXT);
DROP FUNCTION IF EXISTS public.get_topup_packs(TEXT, TEXT);
DROP FUNCTION IF EXISTS public.get_usage_summary(UUID, TIMESTAMPTZ, TIMESTAMPTZ);


-- ============================================================================
-- 1. GET SUBSCRIPTION DETAILS
-- ============================================================================
-- Returns detailed subscription information with plan details
-- Used by: GET /api/billing/subscription/:tenantId

CREATE OR REPLACE FUNCTION get_subscription_details(
    p_tenant_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_subscription RECORD;
    v_plan_version RECORD;
    v_pricing_plan RECORD;
BEGIN
    -- Get subscription
    SELECT *
    INTO v_subscription
    FROM t_bm_tenant_subscription
    WHERE tenant_id = p_tenant_id
      AND status IN ('active', 'trial', 'canceled', 'expired')
    ORDER BY created_at DESC
    LIMIT 1;

    IF v_subscription IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'No subscription found',
            'tenant_id', p_tenant_id
        );
    END IF;

    -- Get plan version
    SELECT *
    INTO v_plan_version
    FROM t_bm_plan_version
    WHERE version_id = v_subscription.version_id;

    -- Get pricing plan
    IF v_plan_version IS NOT NULL THEN
        SELECT *
        INTO v_pricing_plan
        FROM t_bm_pricing_plan
        WHERE plan_id = v_plan_version.plan_id;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'subscription', jsonb_build_object(
            'subscription_id', v_subscription.subscription_id,
            'tenant_id', v_subscription.tenant_id,
            'version_id', v_subscription.version_id,
            'status', v_subscription.status,
            'currency_code', v_subscription.currency_code,
            'units', v_subscription.units,
            'current_tier', v_subscription.current_tier,
            'amount_per_billing', v_subscription.amount_per_billing,
            'billing_cycle', v_subscription.billing_cycle,
            'start_date', v_subscription.start_date,
            'renewal_date', v_subscription.renewal_date,
            'trial_ends', v_subscription.trial_ends,
            'created_at', v_subscription.created_at
        ),
        'plan_version', CASE WHEN v_plan_version IS NOT NULL THEN jsonb_build_object(
            'version_id', v_plan_version.version_id,
            'version_number', v_plan_version.version_number,
            'is_active', v_plan_version.is_active,
            'tiers', v_plan_version.tiers,
            'features', v_plan_version.features,
            'notifications', v_plan_version.notifications,
            'topup_options', v_plan_version.topup_options
        ) ELSE NULL END,
        'pricing_plan', CASE WHEN v_pricing_plan IS NOT NULL THEN jsonb_build_object(
            'plan_id', v_pricing_plan.plan_id,
            'name', v_pricing_plan.name,
            'description', v_pricing_plan.description,
            'plan_type', v_pricing_plan.plan_type,
            'product_code', v_pricing_plan.product_code,
            'trial_duration', v_pricing_plan.trial_duration,
            'default_currency_code', v_pricing_plan.default_currency_code
        ) ELSE NULL END
    );
END;
$$;

GRANT EXECUTE ON FUNCTION get_subscription_details(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_subscription_details(UUID) TO service_role;


-- ============================================================================
-- 2. GET BILLING STATUS
-- ============================================================================
-- Returns billing status summary (bot-friendly)
-- Used by: GET /api/billing/status/:tenantId

CREATE OR REPLACE FUNCTION get_billing_status(
    p_tenant_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_subscription RECORD;
    v_plan_version RECORD;
    v_pricing_plan RECORD;
    v_days_until_renewal INT;
BEGIN
    -- Get subscription
    SELECT *
    INTO v_subscription
    FROM t_bm_tenant_subscription
    WHERE tenant_id = p_tenant_id
      AND status IN ('active', 'trial', 'canceled', 'expired')
    ORDER BY created_at DESC
    LIMIT 1;

    IF v_subscription IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'No subscription found',
            'tenant_id', p_tenant_id,
            'has_subscription', false
        );
    END IF;

    -- Get plan details
    SELECT * INTO v_plan_version
    FROM t_bm_plan_version WHERE version_id = v_subscription.version_id;

    IF v_plan_version IS NOT NULL THEN
        SELECT * INTO v_pricing_plan
        FROM t_bm_pricing_plan WHERE plan_id = v_plan_version.plan_id;
    END IF;

    -- Calculate days until renewal
    v_days_until_renewal := GREATEST(0, (v_subscription.renewal_date::DATE - CURRENT_DATE));

    RETURN jsonb_build_object(
        'success', true,
        'tenant_id', p_tenant_id,
        'has_subscription', true,
        'status', v_subscription.status,
        'plan_name', COALESCE(v_pricing_plan.name, 'Unknown Plan'),
        'product_code', COALESCE(v_pricing_plan.product_code, 'unknown'),
        'billing_cycle', v_subscription.billing_cycle,
        'amount_per_billing', v_subscription.amount_per_billing,
        'currency_code', v_subscription.currency_code,
        'units', v_subscription.units,
        'current_tier', v_subscription.current_tier,
        'start_date', v_subscription.start_date,
        'renewal_date', v_subscription.renewal_date,
        'days_until_renewal', v_days_until_renewal,
        'trial_ends', v_subscription.trial_ends,
        'is_trial', v_subscription.status = 'trial',
        'is_active', v_subscription.status = 'active',
        'generated_at', NOW()
    );
END;
$$;

GRANT EXECUTE ON FUNCTION get_billing_status(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_billing_status(UUID) TO service_role;


-- ============================================================================
-- 3. GET BILLING ALERTS
-- ============================================================================
-- Returns billing alerts (trial ending, renewal upcoming, etc.)
-- Used by: GET /api/billing/alerts/:tenantId

CREATE OR REPLACE FUNCTION get_billing_alerts(
    p_tenant_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_subscription RECORD;
    v_alerts JSONB := '[]'::JSONB;
    v_days_until_renewal INT;
BEGIN
    -- Get subscription
    SELECT *
    INTO v_subscription
    FROM t_bm_tenant_subscription
    WHERE tenant_id = p_tenant_id
      AND status IN ('active', 'trial', 'canceled', 'expired')
    ORDER BY created_at DESC
    LIMIT 1;

    IF v_subscription IS NULL THEN
        RETURN jsonb_build_object(
            'success', true,
            'alerts', v_alerts,
            'count', 0
        );
    END IF;

    v_days_until_renewal := GREATEST(0, (v_subscription.renewal_date::DATE - CURRENT_DATE));

    -- Check for trial ending soon
    IF v_subscription.status = 'trial' AND v_subscription.trial_ends IS NOT NULL THEN
        DECLARE
            v_trial_days INT := GREATEST(0, (v_subscription.trial_ends::DATE - CURRENT_DATE));
        BEGIN
            IF v_trial_days <= 3 THEN
                v_alerts := v_alerts || jsonb_build_object(
                    'type', 'trial_ending',
                    'severity', 'warning',
                    'message', 'Your trial ends in ' || v_trial_days || ' days',
                    'days_remaining', v_trial_days
                );
            END IF;
        END;
    END IF;

    -- Check for renewal coming up
    IF v_days_until_renewal <= 7 AND v_subscription.status = 'active' THEN
        v_alerts := v_alerts || jsonb_build_object(
            'type', 'renewal_upcoming',
            'severity', 'info',
            'message', 'Subscription renews in ' || v_days_until_renewal || ' days',
            'days_remaining', v_days_until_renewal,
            'amount', v_subscription.amount_per_billing,
            'currency', v_subscription.currency_code
        );
    END IF;

    -- Check for expired/canceled status
    IF v_subscription.status IN ('canceled', 'expired') THEN
        v_alerts := v_alerts || jsonb_build_object(
            'type', 'subscription_' || v_subscription.status,
            'severity', 'error',
            'message', 'Your subscription is ' || v_subscription.status
        );
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'alerts', v_alerts,
        'count', jsonb_array_length(v_alerts)
    );
END;
$$;

GRANT EXECUTE ON FUNCTION get_billing_alerts(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_billing_alerts(UUID) TO service_role;


-- ============================================================================
-- 4. GET CREDIT BALANCE
-- ============================================================================
-- Returns all credit balances for a tenant with summary
-- Used by: GET /api/billing/credits/:tenantId

CREATE OR REPLACE FUNCTION get_credit_balance(
    p_tenant_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_credits JSONB;
    v_summary JSONB;
BEGIN
    -- Get all credits
    SELECT jsonb_agg(row_to_json(c))
    INTO v_credits
    FROM (
        SELECT
            id,
            credit_type,
            channel,
            balance,
            COALESCE(reserved_balance, 0) as reserved_balance,
            balance - COALESCE(reserved_balance, 0) as available_balance,
            COALESCE(low_balance_threshold, 10) as low_balance_threshold,
            balance < COALESCE(low_balance_threshold, 10) as is_low,
            expires_at,
            last_topup_at,
            last_topup_amount
        FROM t_bm_credit_balance
        WHERE tenant_id = p_tenant_id
          AND (expires_at IS NULL OR expires_at > NOW())
        ORDER BY credit_type, channel
    ) c;

    -- Build summary by credit type
    SELECT jsonb_object_agg(credit_type, totals)
    INTO v_summary
    FROM (
        SELECT
            credit_type,
            jsonb_build_object(
                'total_balance', SUM(balance),
                'total_reserved', SUM(COALESCE(reserved_balance, 0)),
                'total_available', SUM(balance - COALESCE(reserved_balance, 0))
            ) as totals
        FROM t_bm_credit_balance
        WHERE tenant_id = p_tenant_id
          AND (expires_at IS NULL OR expires_at > NOW())
        GROUP BY credit_type
    ) s;

    RETURN jsonb_build_object(
        'success', true,
        'tenant_id', p_tenant_id,
        'credits', COALESCE(v_credits, '[]'::JSONB),
        'summary', COALESCE(v_summary, '{}'::JSONB),
        'generated_at', NOW()
    );
END;
$$;

GRANT EXECUTE ON FUNCTION get_credit_balance(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_credit_balance(UUID) TO service_role;


-- ============================================================================
-- 5. GET TOPUP PACKS
-- ============================================================================
-- Returns available topup packs filtered by product/credit type
-- Used by: GET /api/billing/topup-packs

CREATE OR REPLACE FUNCTION get_topup_packs(
    p_product_code TEXT DEFAULT NULL,
    p_credit_type TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_packs JSONB;
BEGIN
    SELECT jsonb_agg(
        jsonb_build_object(
            'id', id,
            'product_code', product_code,
            'credit_type', credit_type,
            'name', name,
            'description', description,
            'quantity', quantity,
            'price', price,
            'currency_code', COALESCE(currency_code, 'INR'),
            'expiry_days', expiry_days,
            'is_popular', COALESCE(is_popular, false),
            'sort_order', COALESCE(sort_order, 0),
            'original_price', original_price,
            'discount_percentage', discount_percentage,
            'promotion_text', promotion_text,
            'promotion_ends_at', promotion_ends_at,
            'price_per_unit', ROUND(price / NULLIF(quantity, 0), 2)
        ) ORDER BY sort_order, price
    )
    INTO v_packs
    FROM t_bm_topup_pack
    WHERE is_active = true
      AND (p_product_code IS NULL OR product_code = p_product_code)
      AND (p_credit_type IS NULL OR credit_type = p_credit_type);

    RETURN jsonb_build_object(
        'success', true,
        'packs', COALESCE(v_packs, '[]'::JSONB),
        'count', COALESCE(jsonb_array_length(v_packs), 0),
        'filters', jsonb_build_object(
            'product_code', p_product_code,
            'credit_type', p_credit_type
        )
    );
END;
$$;

GRANT EXECUTE ON FUNCTION get_topup_packs(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_topup_packs(TEXT, TEXT) TO service_role;


-- ============================================================================
-- 6. GET USAGE SUMMARY
-- ============================================================================
-- Returns usage and credit summary for billing period
-- Used by: GET /api/billing/usage/:tenantId

CREATE OR REPLACE FUNCTION get_usage_summary(
    p_tenant_id UUID,
    p_period_start TIMESTAMPTZ DEFAULT NULL,
    p_period_end TIMESTAMPTZ DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_subscription RECORD;
    v_credits JSONB;
    v_actual_start TIMESTAMPTZ;
    v_actual_end TIMESTAMPTZ;
BEGIN
    -- Get subscription
    SELECT *
    INTO v_subscription
    FROM t_bm_tenant_subscription
    WHERE tenant_id = p_tenant_id
      AND status IN ('active', 'trial')
    ORDER BY created_at DESC
    LIMIT 1;

    IF v_subscription IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'No active subscription found',
            'tenant_id', p_tenant_id
        );
    END IF;

    -- Determine period
    v_actual_start := COALESCE(p_period_start, v_subscription.start_date);
    v_actual_end := COALESCE(p_period_end, v_subscription.renewal_date);

    -- Get credit usage summary
    SELECT jsonb_object_agg(
        credit_type || COALESCE('_' || channel, ''),
        jsonb_build_object(
            'balance', balance,
            'reserved', COALESCE(reserved_balance, 0),
            'available', balance - COALESCE(reserved_balance, 0),
            'is_low', balance < COALESCE(low_balance_threshold, 10)
        )
    )
    INTO v_credits
    FROM t_bm_credit_balance
    WHERE tenant_id = p_tenant_id
      AND (expires_at IS NULL OR expires_at > NOW());

    RETURN jsonb_build_object(
        'success', true,
        'tenant_id', p_tenant_id,
        'subscription_id', v_subscription.subscription_id,
        'status', v_subscription.status,
        'period', jsonb_build_object(
            'start', v_actual_start,
            'end', v_actual_end,
            'days_remaining', GREATEST(0, (v_actual_end::DATE - CURRENT_DATE))
        ),
        'credits', COALESCE(v_credits, '{}'::JSONB),
        'billing', jsonb_build_object(
            'cycle', v_subscription.billing_cycle,
            'amount', v_subscription.amount_per_billing,
            'currency', v_subscription.currency_code,
            'units', v_subscription.units
        ),
        'generated_at', NOW()
    );
END;
$$;

GRANT EXECUTE ON FUNCTION get_usage_summary(UUID, TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION get_usage_summary(UUID, TIMESTAMPTZ, TIMESTAMPTZ) TO service_role;


-- ============================================================================
-- 7. ADD CREDITS
-- ============================================================================
-- Add credits to tenant balance
-- Used by: POST /api/billing/credits/add

CREATE OR REPLACE FUNCTION add_credits(
    p_tenant_id UUID,
    p_credit_type TEXT,
    p_quantity INTEGER,
    p_channel TEXT DEFAULT NULL,
    p_source TEXT DEFAULT 'manual',
    p_reference_id TEXT DEFAULT NULL,
    p_description TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_credit RECORD;
    v_new_balance INTEGER;
BEGIN
    -- Validate inputs
    IF p_quantity <= 0 THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Quantity must be positive'
        );
    END IF;

    -- Find or create credit balance record
    SELECT * INTO v_credit
    FROM t_bm_credit_balance
    WHERE tenant_id = p_tenant_id
      AND credit_type = p_credit_type
      AND (channel IS NOT DISTINCT FROM p_channel)
    FOR UPDATE;

    IF v_credit IS NULL THEN
        -- Create new credit balance
        INSERT INTO t_bm_credit_balance (
            tenant_id, credit_type, channel, balance,
            last_topup_at, last_topup_amount
        )
        VALUES (
            p_tenant_id, p_credit_type, p_channel, p_quantity,
            NOW(), p_quantity
        )
        RETURNING balance INTO v_new_balance;
    ELSE
        -- Update existing balance
        UPDATE t_bm_credit_balance
        SET balance = balance + p_quantity,
            last_topup_at = NOW(),
            last_topup_amount = p_quantity,
            updated_at = NOW()
        WHERE id = v_credit.id
        RETURNING balance INTO v_new_balance;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'tenant_id', p_tenant_id,
        'credit_type', p_credit_type,
        'channel', p_channel,
        'quantity_added', p_quantity,
        'new_balance', v_new_balance,
        'source', p_source,
        'reference_id', p_reference_id,
        'description', p_description
    );
END;
$$;

GRANT EXECUTE ON FUNCTION add_credits(UUID, TEXT, INTEGER, TEXT, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION add_credits(UUID, TEXT, INTEGER, TEXT, TEXT, TEXT, TEXT) TO service_role;


-- ============================================================================
-- 8. DEDUCT CREDITS
-- ============================================================================
-- Deduct credits from tenant balance with availability check
-- Used by: POST /api/billing/credits/deduct

CREATE OR REPLACE FUNCTION deduct_credits(
    p_tenant_id UUID,
    p_credit_type TEXT,
    p_quantity INTEGER,
    p_channel TEXT DEFAULT NULL,
    p_reference_type TEXT DEFAULT NULL,
    p_reference_id TEXT DEFAULT NULL,
    p_description TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_credit RECORD;
    v_available INTEGER;
    v_new_balance INTEGER;
BEGIN
    -- Validate inputs
    IF p_quantity <= 0 THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Quantity must be positive'
        );
    END IF;

    -- Get credit balance with lock
    SELECT * INTO v_credit
    FROM t_bm_credit_balance
    WHERE tenant_id = p_tenant_id
      AND credit_type = p_credit_type
      AND (channel IS NOT DISTINCT FROM p_channel)
      AND (expires_at IS NULL OR expires_at > NOW())
    FOR UPDATE;

    IF v_credit IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'No credit balance found',
            'tenant_id', p_tenant_id,
            'credit_type', p_credit_type,
            'channel', p_channel
        );
    END IF;

    -- Calculate available balance
    v_available := v_credit.balance - COALESCE(v_credit.reserved_balance, 0);

    IF v_available < p_quantity THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Insufficient credits',
            'required', p_quantity,
            'available', v_available,
            'balance', v_credit.balance,
            'reserved', COALESCE(v_credit.reserved_balance, 0)
        );
    END IF;

    -- Deduct credits
    UPDATE t_bm_credit_balance
    SET balance = balance - p_quantity,
        updated_at = NOW()
    WHERE id = v_credit.id
    RETURNING balance INTO v_new_balance;

    RETURN jsonb_build_object(
        'success', true,
        'tenant_id', p_tenant_id,
        'credit_type', p_credit_type,
        'channel', p_channel,
        'quantity_deducted', p_quantity,
        'previous_balance', v_credit.balance,
        'new_balance', v_new_balance,
        'reference_type', p_reference_type,
        'reference_id', p_reference_id,
        'description', p_description
    );
END;
$$;

GRANT EXECUTE ON FUNCTION deduct_credits(UUID, TEXT, INTEGER, TEXT, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION deduct_credits(UUID, TEXT, INTEGER, TEXT, TEXT, TEXT, TEXT) TO service_role;


-- ============================================================================
-- 9. CHECK CREDIT AVAILABILITY
-- ============================================================================
-- Check if tenant has sufficient credits without deducting
-- Used by: POST /api/billing/credits/check

CREATE OR REPLACE FUNCTION check_credit_availability(
    p_tenant_id UUID,
    p_credit_type TEXT,
    p_quantity INTEGER,
    p_channel TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_credit RECORD;
    v_available INTEGER;
BEGIN
    -- Get credit balance
    SELECT * INTO v_credit
    FROM t_bm_credit_balance
    WHERE tenant_id = p_tenant_id
      AND credit_type = p_credit_type
      AND (channel IS NOT DISTINCT FROM p_channel)
      AND (expires_at IS NULL OR expires_at > NOW());

    IF v_credit IS NULL THEN
        RETURN jsonb_build_object(
            'success', true,
            'is_available', false,
            'reason', 'No credit balance found',
            'required', p_quantity,
            'available', 0,
            'tenant_id', p_tenant_id,
            'credit_type', p_credit_type,
            'channel', p_channel
        );
    END IF;

    -- Calculate available balance
    v_available := v_credit.balance - COALESCE(v_credit.reserved_balance, 0);

    RETURN jsonb_build_object(
        'success', true,
        'is_available', v_available >= p_quantity,
        'required', p_quantity,
        'available', v_available,
        'balance', v_credit.balance,
        'reserved', COALESCE(v_credit.reserved_balance, 0),
        'shortfall', GREATEST(0, p_quantity - v_available),
        'tenant_id', p_tenant_id,
        'credit_type', p_credit_type,
        'channel', p_channel
    );
END;
$$;

GRANT EXECUTE ON FUNCTION check_credit_availability(UUID, TEXT, INTEGER, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION check_credit_availability(UUID, TEXT, INTEGER, TEXT) TO service_role;


-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON FUNCTION get_subscription_details(UUID) IS 'Returns subscription details with plan info';
COMMENT ON FUNCTION get_billing_status(UUID) IS 'Returns billing status summary for tenant';
COMMENT ON FUNCTION get_billing_alerts(UUID) IS 'Returns billing alerts (trial ending, renewal upcoming, etc.)';
COMMENT ON FUNCTION get_credit_balance(UUID) IS 'Returns all credit balances for a tenant with summary';
COMMENT ON FUNCTION get_topup_packs(TEXT, TEXT) IS 'Returns available topup packs filtered by product/credit type';
COMMENT ON FUNCTION get_usage_summary(UUID, TIMESTAMPTZ, TIMESTAMPTZ) IS 'Returns usage and credit summary for billing period';
COMMENT ON FUNCTION add_credits(UUID, TEXT, INTEGER, TEXT, TEXT, TEXT, TEXT) IS 'Add credits to tenant balance';
COMMENT ON FUNCTION deduct_credits(UUID, TEXT, INTEGER, TEXT, TEXT, TEXT, TEXT) IS 'Deduct credits with availability check';
COMMENT ON FUNCTION check_credit_availability(UUID, TEXT, INTEGER, TEXT) IS 'Check credit availability without deducting';


-- ============================================================================
-- VERIFICATION
-- ============================================================================
SELECT 'Phase 2 RPC Functions Created:' as status;
SELECT proname as function_name, pg_get_function_identity_arguments(oid) as arguments
FROM pg_proc
WHERE proname IN (
    'get_subscription_details',
    'get_billing_status',
    'get_billing_alerts',
    'get_credit_balance',
    'get_topup_packs',
    'get_usage_summary',
    'add_credits',
    'deduct_credits',
    'check_credit_availability'
)
ORDER BY proname;

SELECT '✅ Phase 2 Migration Complete' as status;
