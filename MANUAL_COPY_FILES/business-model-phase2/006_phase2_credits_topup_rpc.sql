-- ============================================================================
-- Phase 2 RPC Functions - Credits & Topup Packs
-- ============================================================================
-- Uses actual schema from Phase 1 tables
-- ============================================================================

-- ============================================================================
-- 1. GET CREDIT BALANCE
-- ============================================================================
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
    -- Get all credit balances for tenant
    SELECT jsonb_agg(
        jsonb_build_object(
            'id', id,
            'credit_type', credit_type,
            'channel', channel,
            'balance', balance,
            'reserved_balance', COALESCE(reserved_balance, 0),
            'available_balance', balance - COALESCE(reserved_balance, 0),
            'low_balance_threshold', COALESCE(low_balance_threshold, 10),
            'is_low', balance < COALESCE(low_balance_threshold, 10),
            'expires_at', expires_at,
            'last_topup_at', last_topup_at,
            'last_topup_amount', last_topup_amount
        ) ORDER BY credit_type, channel
    )
    INTO v_credits
    FROM t_bm_credit_balance
    WHERE tenant_id = p_tenant_id
      AND (expires_at IS NULL OR expires_at > NOW());

    -- Build summary by credit type
    SELECT jsonb_object_agg(
        credit_type,
        jsonb_build_object(
            'total_balance', SUM(balance),
            'total_reserved', SUM(COALESCE(reserved_balance, 0)),
            'total_available', SUM(balance - COALESCE(reserved_balance, 0))
        )
    )
    INTO v_summary
    FROM t_bm_credit_balance
    WHERE tenant_id = p_tenant_id
      AND (expires_at IS NULL OR expires_at > NOW())
    GROUP BY credit_type;

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
-- 2. GET TOPUP PACKS
-- ============================================================================
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
-- 3. GET USAGE SUMMARY (Simplified - works without t_bm_usage_event)
-- ============================================================================
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
-- COMMENTS
-- ============================================================================
COMMENT ON FUNCTION get_credit_balance(UUID) IS 'Returns all credit balances for a tenant with summary';
COMMENT ON FUNCTION get_topup_packs(TEXT, TEXT) IS 'Returns available topup packs filtered by product/credit type';
COMMENT ON FUNCTION get_usage_summary(UUID, TIMESTAMPTZ, TIMESTAMPTZ) IS 'Returns usage and credit summary for billing period';
