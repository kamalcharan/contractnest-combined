-- ============================================================================
-- Business Model Phase 2 - RPC Functions (FIXED for actual schema)
-- ============================================================================
-- Uses correct column names from t_bm_tenant_subscription:
-- subscription_id, tenant_id, version_id, status, currency_code, units,
-- current_tier, amount_per_billing, billing_cycle, start_date, renewal_date,
-- trial_ends, created_at, updated_at
-- ============================================================================

-- ============================================================================
-- 1. GET SUBSCRIPTION DETAILS (FIXED)
-- ============================================================================
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
-- 2. GET BILLING STATUS (Simplified for current schema)
-- ============================================================================
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
-- COMMENTS
-- ============================================================================
COMMENT ON FUNCTION get_subscription_details(UUID) IS 'Returns subscription details with plan info - uses actual schema columns';
COMMENT ON FUNCTION get_billing_status(UUID) IS 'Returns billing status summary for tenant';
COMMENT ON FUNCTION get_billing_alerts(UUID) IS 'Returns billing alerts (trial ending, renewal upcoming, etc.)';
