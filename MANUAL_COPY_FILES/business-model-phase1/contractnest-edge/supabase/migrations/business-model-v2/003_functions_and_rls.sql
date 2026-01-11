-- ============================================================
-- Migration: 003_functions_and_rls
-- Description: Database functions with race condition handling + RLS policies
-- Author: Claude Code Session
-- Date: 2025-01-11
-- Phase: 1 - Schema & Product Configs (Deliverable 3)
-- ============================================================

-- ============================================================
-- OVERVIEW
-- ============================================================
-- This migration creates:
--
-- PART A: DATABASE FUNCTIONS (RPC)
--   1. deduct_credits()        - Atomic credit deduction with row locking
--   2. add_credits()           - Atomic credit addition for topups
--   3. reserve_credits()       - Reserve credits for pending operations
--   4. release_reserved_credits() - Release reserved credits
--   5. aggregate_usage()       - Usage aggregation for billing period
--   6. record_usage()          - Record usage event atomically
--   7. get_credit_balance()    - Get current credit balance
--   8. check_credit_availability() - Check if sufficient credits
--   9. get_billing_status()    - Comprehensive billing status for tenant
--   10. calculate_tiered_price() - Calculate price based on tiers
--   11. process_credit_expiry() - Expire credits past expiry date
--
-- PART B: ROW LEVEL SECURITY (RLS)
--   - t_bm_product_config
--   - t_bm_credit_balance
--   - t_bm_credit_transaction
--   - t_bm_topup_pack
--   - t_contract_invoice
--   - t_bm_billing_event
--
-- Design Principles:
--   - FOR UPDATE NOWAIT/SKIP LOCKED for row-level locking
--   - Explicit transaction boundaries where needed
--   - Idempotency where possible
--   - Comprehensive error handling
--   - Audit trail for all operations
-- ============================================================


-- ============================================================
-- PART A: DATABASE FUNCTIONS
-- ============================================================

-- ============================================================
-- 1. deduct_credits()
-- ============================================================
-- Purpose: Atomically deduct credits with race condition protection
-- Uses FOR UPDATE to lock the row during the transaction
-- Returns success status, new balance, and error message if failed

CREATE OR REPLACE FUNCTION public.deduct_credits(
    p_tenant_id UUID,
    p_credit_type TEXT,
    p_channel TEXT DEFAULT NULL,
    p_quantity INTEGER DEFAULT 1,
    p_reference_type TEXT DEFAULT NULL,
    p_reference_id UUID DEFAULT NULL,
    p_description TEXT DEFAULT NULL,
    p_created_by UUID DEFAULT NULL
)
RETURNS TABLE (
    success BOOLEAN,
    balance_after INTEGER,
    error_code TEXT,
    error_message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_balance_id UUID;
    v_current_balance INTEGER;
    v_reserved_balance INTEGER;
    v_available_balance INTEGER;
    v_new_balance INTEGER;
    v_expires_at TIMESTAMPTZ;
BEGIN
    -- Validate input
    IF p_quantity <= 0 THEN
        RETURN QUERY SELECT false, 0, 'INVALID_QUANTITY'::TEXT, 'Quantity must be positive'::TEXT;
        RETURN;
    END IF;

    -- Lock the credit balance row for update (prevents race conditions)
    -- NOWAIT will fail immediately if row is locked by another transaction
    BEGIN
        SELECT id, balance, reserved_balance, expires_at
        INTO v_balance_id, v_current_balance, v_reserved_balance, v_expires_at
        FROM public.t_bm_credit_balance
        WHERE tenant_id = p_tenant_id
          AND credit_type = p_credit_type
          AND (channel = p_channel OR (channel IS NULL AND p_channel IS NULL))
        FOR UPDATE NOWAIT;
    EXCEPTION
        WHEN lock_not_available THEN
            RETURN QUERY SELECT false, 0, 'LOCK_CONFLICT'::TEXT, 'Resource is locked by another operation. Please retry.'::TEXT;
            RETURN;
    END;

    -- Check if balance record exists
    IF v_balance_id IS NULL THEN
        RETURN QUERY SELECT false, 0, 'NO_BALANCE'::TEXT,
            format('No credit balance found for tenant %s, type %s', p_tenant_id, p_credit_type)::TEXT;
        RETURN;
    END IF;

    -- Check if credits have expired
    IF v_expires_at IS NOT NULL AND v_expires_at < NOW() THEN
        RETURN QUERY SELECT false, 0, 'CREDITS_EXPIRED'::TEXT,
            'Credits have expired'::TEXT;
        RETURN;
    END IF;

    -- Calculate available balance (total - reserved)
    v_available_balance := v_current_balance - COALESCE(v_reserved_balance, 0);

    -- Check if sufficient credits available
    IF v_available_balance < p_quantity THEN
        RETURN QUERY SELECT false, v_available_balance, 'INSUFFICIENT_CREDITS'::TEXT,
            format('Insufficient credits. Available: %s, Required: %s', v_available_balance, p_quantity)::TEXT;
        RETURN;
    END IF;

    -- Deduct credits
    v_new_balance := v_current_balance - p_quantity;

    UPDATE public.t_bm_credit_balance
    SET balance = v_new_balance,
        updated_at = NOW()
    WHERE id = v_balance_id;

    -- Record transaction in audit trail
    INSERT INTO public.t_bm_credit_transaction (
        tenant_id,
        credit_type,
        channel,
        transaction_type,
        quantity,
        balance_before,
        balance_after,
        reference_type,
        reference_id,
        description,
        created_by
    ) VALUES (
        p_tenant_id,
        p_credit_type,
        p_channel,
        'deduction',
        -p_quantity,  -- Negative for deduction
        v_current_balance,
        v_new_balance,
        p_reference_type,
        p_reference_id,
        COALESCE(p_description, 'Credit deduction'),
        p_created_by
    );

    RETURN QUERY SELECT true, v_new_balance, NULL::TEXT, NULL::TEXT;
END;
$$;

COMMENT ON FUNCTION public.deduct_credits IS
'Atomically deduct credits with row-level locking to prevent race conditions.
Uses FOR UPDATE NOWAIT - fails immediately if row is locked.
Returns: success, balance_after, error_code, error_message';


-- ============================================================
-- 2. add_credits()
-- ============================================================
-- Purpose: Atomically add credits (for topups, refunds, initial allocation)
-- Creates balance record if it doesn't exist

CREATE OR REPLACE FUNCTION public.add_credits(
    p_tenant_id UUID,
    p_credit_type TEXT,
    p_channel TEXT DEFAULT NULL,
    p_quantity INTEGER DEFAULT 1,
    p_transaction_type TEXT DEFAULT 'topup',
    p_reference_type TEXT DEFAULT NULL,
    p_reference_id UUID DEFAULT NULL,
    p_description TEXT DEFAULT NULL,
    p_expires_at TIMESTAMPTZ DEFAULT NULL,
    p_created_by UUID DEFAULT NULL
)
RETURNS TABLE (
    success BOOLEAN,
    balance_after INTEGER,
    balance_id UUID,
    error_message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_balance_id UUID;
    v_current_balance INTEGER;
    v_new_balance INTEGER;
BEGIN
    -- Validate input
    IF p_quantity <= 0 THEN
        RETURN QUERY SELECT false, 0, NULL::UUID, 'Quantity must be positive'::TEXT;
        RETURN;
    END IF;

    IF p_transaction_type NOT IN ('topup', 'refund', 'adjustment', 'initial', 'transfer') THEN
        RETURN QUERY SELECT false, 0, NULL::UUID, 'Invalid transaction type'::TEXT;
        RETURN;
    END IF;

    -- Try to lock existing balance row
    SELECT id, balance
    INTO v_balance_id, v_current_balance
    FROM public.t_bm_credit_balance
    WHERE tenant_id = p_tenant_id
      AND credit_type = p_credit_type
      AND (channel = p_channel OR (channel IS NULL AND p_channel IS NULL))
    FOR UPDATE;

    IF v_balance_id IS NULL THEN
        -- Create new balance record
        v_current_balance := 0;
        v_new_balance := p_quantity;

        INSERT INTO public.t_bm_credit_balance (
            tenant_id,
            credit_type,
            channel,
            balance,
            last_topup_at,
            last_topup_amount,
            expires_at
        ) VALUES (
            p_tenant_id,
            p_credit_type,
            p_channel,
            v_new_balance,
            NOW(),
            p_quantity,
            p_expires_at
        )
        RETURNING id INTO v_balance_id;
    ELSE
        -- Update existing balance
        v_new_balance := v_current_balance + p_quantity;

        UPDATE public.t_bm_credit_balance
        SET balance = v_new_balance,
            last_topup_at = CASE WHEN p_transaction_type = 'topup' THEN NOW() ELSE last_topup_at END,
            last_topup_amount = CASE WHEN p_transaction_type = 'topup' THEN p_quantity ELSE last_topup_amount END,
            expires_at = COALESCE(p_expires_at, expires_at),
            updated_at = NOW()
        WHERE id = v_balance_id;
    END IF;

    -- Record transaction
    INSERT INTO public.t_bm_credit_transaction (
        tenant_id,
        credit_type,
        channel,
        transaction_type,
        quantity,
        balance_before,
        balance_after,
        reference_type,
        reference_id,
        description,
        created_by
    ) VALUES (
        p_tenant_id,
        p_credit_type,
        p_channel,
        p_transaction_type,
        p_quantity,  -- Positive for addition
        v_current_balance,
        v_new_balance,
        p_reference_type,
        p_reference_id,
        COALESCE(p_description, 'Credit ' || p_transaction_type),
        p_created_by
    );

    RETURN QUERY SELECT true, v_new_balance, v_balance_id, NULL::TEXT;
END;
$$;

COMMENT ON FUNCTION public.add_credits IS
'Atomically add credits to tenant balance. Creates balance record if not exists.
Supports: topup, refund, adjustment, initial, transfer';


-- ============================================================
-- 3. reserve_credits()
-- ============================================================
-- Purpose: Reserve credits for pending operations
-- Reserved credits are not available for other operations

CREATE OR REPLACE FUNCTION public.reserve_credits(
    p_tenant_id UUID,
    p_credit_type TEXT,
    p_channel TEXT DEFAULT NULL,
    p_quantity INTEGER DEFAULT 1
)
RETURNS TABLE (
    success BOOLEAN,
    available_after INTEGER,
    error_message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_balance_id UUID;
    v_current_balance INTEGER;
    v_reserved_balance INTEGER;
    v_available_balance INTEGER;
BEGIN
    -- Lock and fetch balance
    SELECT id, balance, COALESCE(reserved_balance, 0)
    INTO v_balance_id, v_current_balance, v_reserved_balance
    FROM public.t_bm_credit_balance
    WHERE tenant_id = p_tenant_id
      AND credit_type = p_credit_type
      AND (channel = p_channel OR (channel IS NULL AND p_channel IS NULL))
    FOR UPDATE NOWAIT;

    IF v_balance_id IS NULL THEN
        RETURN QUERY SELECT false, 0, 'No credit balance found'::TEXT;
        RETURN;
    END IF;

    v_available_balance := v_current_balance - v_reserved_balance;

    IF v_available_balance < p_quantity THEN
        RETURN QUERY SELECT false, v_available_balance,
            format('Insufficient available credits. Available: %s', v_available_balance)::TEXT;
        RETURN;
    END IF;

    -- Add to reserved
    UPDATE public.t_bm_credit_balance
    SET reserved_balance = v_reserved_balance + p_quantity,
        updated_at = NOW()
    WHERE id = v_balance_id;

    RETURN QUERY SELECT true, (v_available_balance - p_quantity), NULL::TEXT;
END;
$$;

COMMENT ON FUNCTION public.reserve_credits IS
'Reserve credits for pending operations. Reserved credits cannot be used elsewhere.';


-- ============================================================
-- 4. release_reserved_credits()
-- ============================================================
-- Purpose: Release previously reserved credits (cancel reservation)

CREATE OR REPLACE FUNCTION public.release_reserved_credits(
    p_tenant_id UUID,
    p_credit_type TEXT,
    p_channel TEXT DEFAULT NULL,
    p_quantity INTEGER DEFAULT 1
)
RETURNS TABLE (
    success BOOLEAN,
    reserved_after INTEGER,
    error_message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_balance_id UUID;
    v_reserved_balance INTEGER;
BEGIN
    SELECT id, COALESCE(reserved_balance, 0)
    INTO v_balance_id, v_reserved_balance
    FROM public.t_bm_credit_balance
    WHERE tenant_id = p_tenant_id
      AND credit_type = p_credit_type
      AND (channel = p_channel OR (channel IS NULL AND p_channel IS NULL))
    FOR UPDATE;

    IF v_balance_id IS NULL THEN
        RETURN QUERY SELECT false, 0, 'No credit balance found'::TEXT;
        RETURN;
    END IF;

    -- Release reserved (don't go below 0)
    UPDATE public.t_bm_credit_balance
    SET reserved_balance = GREATEST(0, v_reserved_balance - p_quantity),
        updated_at = NOW()
    WHERE id = v_balance_id;

    RETURN QUERY SELECT true, GREATEST(0, v_reserved_balance - p_quantity), NULL::TEXT;
END;
$$;

COMMENT ON FUNCTION public.release_reserved_credits IS
'Release previously reserved credits back to available pool.';


-- ============================================================
-- 5. aggregate_usage()
-- ============================================================
-- Purpose: Aggregate usage for a tenant within a billing period
-- Returns JSONB with usage per metric type

CREATE OR REPLACE FUNCTION public.aggregate_usage(
    p_tenant_id UUID,
    p_period_start TIMESTAMPTZ,
    p_period_end TIMESTAMPTZ
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
    v_result JSONB;
BEGIN
    SELECT COALESCE(
        jsonb_object_agg(
            metric_key,
            jsonb_build_object(
                'total_quantity', total_quantity,
                'record_count', record_count,
                'first_recorded', first_recorded,
                'last_recorded', last_recorded
            )
        ),
        '{}'::JSONB
    )
    INTO v_result
    FROM (
        SELECT
            COALESCE(metric_type, type) as metric_key,
            SUM(COALESCE(quantity, used_amount, 1)) as total_quantity,
            COUNT(*) as record_count,
            MIN(COALESCE(recorded_at, updated_at)) as first_recorded,
            MAX(COALESCE(recorded_at, updated_at)) as last_recorded
        FROM public.t_bm_subscription_usage
        WHERE tenant_id = p_tenant_id
          AND COALESCE(recorded_at, updated_at) >= p_period_start
          AND COALESCE(recorded_at, updated_at) < p_period_end
        GROUP BY COALESCE(metric_type, type)
    ) aggregated;

    RETURN v_result;
END;
$$;

COMMENT ON FUNCTION public.aggregate_usage IS
'Aggregate usage for a tenant within a billing period. Returns JSONB with usage per metric type.';


-- ============================================================
-- 6. record_usage()
-- ============================================================
-- Purpose: Record a usage event atomically
-- Handles both new-style (metric_type) and old-style (type) columns

CREATE OR REPLACE FUNCTION public.record_usage(
    p_tenant_id UUID,
    p_subscription_id UUID,
    p_metric_type TEXT,
    p_quantity INTEGER DEFAULT 1,
    p_reference_type TEXT DEFAULT NULL,
    p_reference_id UUID DEFAULT NULL,
    p_billing_period TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'
)
RETURNS TABLE (
    success BOOLEAN,
    usage_id UUID,
    period_total BIGINT,
    error_message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_usage_id UUID;
    v_period_total BIGINT;
    v_billing_period TEXT;
BEGIN
    -- Auto-calculate billing period if not provided (format: YYYY-QN or YYYY-MM)
    IF p_billing_period IS NULL THEN
        v_billing_period := TO_CHAR(NOW(), 'YYYY') || '-Q' || CEIL(EXTRACT(MONTH FROM NOW()) / 3.0)::INTEGER;
    ELSE
        v_billing_period := p_billing_period;
    END IF;

    -- Insert usage record
    INSERT INTO public.t_bm_subscription_usage (
        tenant_id,
        subscription_id,
        type,
        metric_type,
        identifier,
        quantity,
        used_amount,
        limit_amount,
        recorded_at,
        reference_type,
        reference_id,
        billing_period
    ) VALUES (
        p_tenant_id,
        p_subscription_id,
        p_metric_type,  -- Also set old 'type' column for compatibility
        p_metric_type,
        p_metric_type,  -- identifier
        p_quantity,
        p_quantity,     -- used_amount for compatibility
        0,              -- limit_amount (tracked elsewhere)
        NOW(),
        p_reference_type,
        p_reference_id,
        v_billing_period
    )
    RETURNING usage_id INTO v_usage_id;

    -- Calculate period total for this metric
    SELECT COALESCE(SUM(COALESCE(quantity, used_amount, 1)), 0)
    INTO v_period_total
    FROM public.t_bm_subscription_usage
    WHERE tenant_id = p_tenant_id
      AND COALESCE(metric_type, type) = p_metric_type
      AND billing_period = v_billing_period;

    RETURN QUERY SELECT true, v_usage_id, v_period_total, NULL::TEXT;
END;
$$;

COMMENT ON FUNCTION public.record_usage IS
'Record a usage event atomically. Returns period total for limit checking.';


-- ============================================================
-- 7. get_credit_balance()
-- ============================================================
-- Purpose: Get current credit balance for a tenant

CREATE OR REPLACE FUNCTION public.get_credit_balance(
    p_tenant_id UUID,
    p_credit_type TEXT DEFAULT NULL
)
RETURNS TABLE (
    credit_type TEXT,
    channel TEXT,
    balance INTEGER,
    reserved_balance INTEGER,
    available_balance INTEGER,
    expires_at TIMESTAMPTZ,
    is_low BOOLEAN,
    low_balance_threshold INTEGER
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        cb.credit_type,
        cb.channel,
        cb.balance,
        COALESCE(cb.reserved_balance, 0) as reserved_balance,
        (cb.balance - COALESCE(cb.reserved_balance, 0)) as available_balance,
        cb.expires_at,
        (cb.balance <= COALESCE(cb.low_balance_threshold, 10)) as is_low,
        COALESCE(cb.low_balance_threshold, 10) as low_balance_threshold
    FROM public.t_bm_credit_balance cb
    WHERE cb.tenant_id = p_tenant_id
      AND (p_credit_type IS NULL OR cb.credit_type = p_credit_type)
      AND (cb.expires_at IS NULL OR cb.expires_at > NOW())
    ORDER BY cb.credit_type, cb.channel;
END;
$$;

COMMENT ON FUNCTION public.get_credit_balance IS
'Get current credit balances for a tenant. Optionally filter by credit type.';


-- ============================================================
-- 8. check_credit_availability()
-- ============================================================
-- Purpose: Check if tenant has sufficient credits without deducting

CREATE OR REPLACE FUNCTION public.check_credit_availability(
    p_tenant_id UUID,
    p_credit_type TEXT,
    p_channel TEXT DEFAULT NULL,
    p_quantity INTEGER DEFAULT 1
)
RETURNS TABLE (
    is_available BOOLEAN,
    available_balance INTEGER,
    shortfall INTEGER
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
    v_balance INTEGER;
    v_reserved INTEGER;
    v_available INTEGER;
BEGIN
    SELECT balance, COALESCE(reserved_balance, 0)
    INTO v_balance, v_reserved
    FROM public.t_bm_credit_balance
    WHERE tenant_id = p_tenant_id
      AND credit_type = p_credit_type
      AND (channel = p_channel OR (channel IS NULL AND p_channel IS NULL))
      AND (expires_at IS NULL OR expires_at > NOW());

    v_available := COALESCE(v_balance - v_reserved, 0);

    RETURN QUERY SELECT
        (v_available >= p_quantity) as is_available,
        v_available as available_balance,
        GREATEST(0, p_quantity - v_available) as shortfall;
END;
$$;

COMMENT ON FUNCTION public.check_credit_availability IS
'Check if tenant has sufficient credits without deducting. Non-blocking read.';


-- ============================================================
-- 9. get_billing_status()
-- ============================================================
-- Purpose: Get comprehensive billing status for a tenant (bot-friendly)

CREATE OR REPLACE FUNCTION public.get_billing_status(
    p_tenant_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
    v_result JSONB;
    v_subscription RECORD;
    v_credits JSONB;
    v_usage JSONB;
    v_pending_invoices BIGINT;
    v_last_payment RECORD;
BEGIN
    -- Get subscription info
    SELECT
        s.subscription_id,
        s.status,
        s.product_code,
        s.billing_cycle,
        s.start_date,
        s.renewal_date,
        s.trial_ends,
        s.trial_start_date,
        s.grace_start_date,
        s.grace_end_date,
        s.next_billing_date,
        p.name as plan_name
    INTO v_subscription
    FROM public.t_bm_tenant_subscription s
    LEFT JOIN public.t_bm_plan_version pv ON s.version_id = pv.version_id
    LEFT JOIN public.t_bm_pricing_plan p ON pv.plan_id = p.plan_id
    WHERE s.tenant_id = p_tenant_id
      AND s.status NOT IN ('canceled', 'expired')
    ORDER BY s.created_at DESC
    LIMIT 1;

    -- Get credit balances
    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'type', credit_type,
            'channel', channel,
            'balance', balance,
            'available', balance - COALESCE(reserved_balance, 0),
            'is_low', balance <= COALESCE(low_balance_threshold, 10)
        )
    ), '[]'::JSONB)
    INTO v_credits
    FROM public.t_bm_credit_balance
    WHERE tenant_id = p_tenant_id
      AND (expires_at IS NULL OR expires_at > NOW());

    -- Get current period usage
    v_usage := public.aggregate_usage(
        p_tenant_id,
        COALESCE(v_subscription.start_date, DATE_TRUNC('quarter', NOW())),
        NOW()
    );

    -- Get pending invoice count
    SELECT COUNT(*)
    INTO v_pending_invoices
    FROM public.t_bm_invoice
    WHERE tenant_id = p_tenant_id
      AND status IN ('pending', 'sent', 'overdue');

    -- Get last payment
    SELECT paid_at, amount, status
    INTO v_last_payment
    FROM public.t_bm_invoice
    WHERE tenant_id = p_tenant_id
      AND status = 'paid'
    ORDER BY paid_at DESC
    LIMIT 1;

    -- Build result
    v_result := jsonb_build_object(
        'tenant_id', p_tenant_id,
        'subscription', CASE WHEN v_subscription.subscription_id IS NOT NULL THEN
            jsonb_build_object(
                'id', v_subscription.subscription_id,
                'status', v_subscription.status,
                'product_code', v_subscription.product_code,
                'plan_name', v_subscription.plan_name,
                'billing_cycle', v_subscription.billing_cycle,
                'start_date', v_subscription.start_date,
                'renewal_date', v_subscription.renewal_date,
                'next_billing_date', v_subscription.next_billing_date,
                'trial_ends', v_subscription.trial_ends,
                'grace_end_date', v_subscription.grace_end_date,
                'days_until_renewal', EXTRACT(DAY FROM (v_subscription.renewal_date - NOW()))::INTEGER
            )
        ELSE NULL END,
        'credits', v_credits,
        'usage', v_usage,
        'invoices', jsonb_build_object(
            'pending_count', v_pending_invoices,
            'last_payment', CASE WHEN v_last_payment.paid_at IS NOT NULL THEN
                jsonb_build_object(
                    'date', v_last_payment.paid_at,
                    'amount', v_last_payment.amount
                )
            ELSE NULL END
        ),
        'alerts', public.get_billing_alerts(p_tenant_id),
        'retrieved_at', NOW()
    );

    RETURN v_result;
END;
$$;

COMMENT ON FUNCTION public.get_billing_status IS
'Get comprehensive billing status for a tenant. Bot-friendly JSON response.';


-- ============================================================
-- 10. get_billing_alerts()
-- ============================================================
-- Purpose: Get billing-related alerts for a tenant

CREATE OR REPLACE FUNCTION public.get_billing_alerts(
    p_tenant_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
    v_alerts JSONB := '[]'::JSONB;
    v_subscription RECORD;
    v_credit RECORD;
    v_overdue_count BIGINT;
BEGIN
    -- Check subscription status
    SELECT status, trial_ends, grace_end_date, renewal_date
    INTO v_subscription
    FROM public.t_bm_tenant_subscription
    WHERE tenant_id = p_tenant_id
      AND status NOT IN ('canceled', 'expired')
    ORDER BY created_at DESC
    LIMIT 1;

    IF v_subscription.status = 'trial' AND v_subscription.trial_ends IS NOT NULL THEN
        IF v_subscription.trial_ends <= NOW() + INTERVAL '3 days' THEN
            v_alerts := v_alerts || jsonb_build_object(
                'type', 'trial_expiring',
                'severity', 'warning',
                'message', format('Trial expires in %s days',
                    GREATEST(0, EXTRACT(DAY FROM (v_subscription.trial_ends - NOW()))::INTEGER))
            );
        END IF;
    END IF;

    IF v_subscription.status = 'grace_period' AND v_subscription.grace_end_date IS NOT NULL THEN
        v_alerts := v_alerts || jsonb_build_object(
            'type', 'grace_period',
            'severity', 'critical',
            'message', format('Account will be suspended in %s days if payment not received',
                GREATEST(0, EXTRACT(DAY FROM (v_subscription.grace_end_date - NOW()))::INTEGER))
        );
    END IF;

    IF v_subscription.status = 'suspended' THEN
        v_alerts := v_alerts || jsonb_build_object(
            'type', 'suspended',
            'severity', 'critical',
            'message', 'Account is suspended. Please make payment to restore access.'
        );
    END IF;

    -- Check low credits
    FOR v_credit IN
        SELECT credit_type, channel, balance, low_balance_threshold
        FROM public.t_bm_credit_balance
        WHERE tenant_id = p_tenant_id
          AND balance <= COALESCE(low_balance_threshold, 10)
          AND (expires_at IS NULL OR expires_at > NOW())
    LOOP
        v_alerts := v_alerts || jsonb_build_object(
            'type', 'low_credits',
            'severity', 'warning',
            'message', format('Low %s credits: %s remaining', v_credit.credit_type, v_credit.balance),
            'credit_type', v_credit.credit_type,
            'channel', v_credit.channel
        );
    END LOOP;

    -- Check overdue invoices
    SELECT COUNT(*)
    INTO v_overdue_count
    FROM public.t_bm_invoice
    WHERE tenant_id = p_tenant_id
      AND status = 'overdue';

    IF v_overdue_count > 0 THEN
        v_alerts := v_alerts || jsonb_build_object(
            'type', 'overdue_invoices',
            'severity', 'critical',
            'message', format('%s overdue invoice(s) require attention', v_overdue_count)
        );
    END IF;

    RETURN v_alerts;
END;
$$;

COMMENT ON FUNCTION public.get_billing_alerts IS
'Get billing-related alerts for a tenant (low credits, trial expiring, etc.)';


-- ============================================================
-- 11. calculate_tiered_price()
-- ============================================================
-- Purpose: Calculate price based on tiered pricing configuration

CREATE OR REPLACE FUNCTION public.calculate_tiered_price(
    p_tiers JSONB,
    p_quantity INTEGER
)
RETURNS NUMERIC
LANGUAGE plpgsql
IMMUTABLE
SECURITY DEFINER
AS $$
DECLARE
    v_total NUMERIC := 0;
    v_remaining INTEGER := p_quantity;
    v_tier RECORD;
    v_tier_quantity INTEGER;
    v_tier_from INTEGER;
    v_tier_to INTEGER;
    v_tier_price NUMERIC;
BEGIN
    -- Iterate through tiers in order
    FOR v_tier IN
        SELECT
            (tier->>'from')::INTEGER as tier_from,
            COALESCE((tier->>'to')::INTEGER, 2147483647) as tier_to,
            COALESCE(
                (tier->>'price')::NUMERIC,
                (tier->>'unit_price')::NUMERIC,
                (tier->>'per_unit')::NUMERIC,
                0
            ) as tier_price
        FROM jsonb_array_elements(p_tiers) as tier
        ORDER BY (tier->>'from')::INTEGER
    LOOP
        IF v_remaining <= 0 THEN
            EXIT;
        END IF;

        -- Calculate quantity in this tier
        IF p_quantity >= v_tier.tier_from THEN
            v_tier_quantity := LEAST(
                v_remaining,
                v_tier.tier_to - v_tier.tier_from + 1
            );

            -- For quantities that start before this tier
            IF p_quantity - v_remaining < v_tier.tier_from THEN
                v_tier_quantity := LEAST(
                    v_remaining,
                    p_quantity - v_tier.tier_from + 1
                );
            END IF;

            IF v_tier_quantity > 0 THEN
                v_total := v_total + (v_tier_quantity * v_tier.tier_price);
                v_remaining := v_remaining - v_tier_quantity;
            END IF;
        END IF;
    END LOOP;

    RETURN v_total;
END;
$$;

COMMENT ON FUNCTION public.calculate_tiered_price IS
'Calculate price based on tiered pricing. Expects JSONB array with from, to, price fields.';


-- ============================================================
-- 12. process_credit_expiry()
-- ============================================================
-- Purpose: Expire credits past their expiry date (called by scheduler)

CREATE OR REPLACE FUNCTION public.process_credit_expiry()
RETURNS TABLE (
    tenant_id UUID,
    credit_type TEXT,
    channel TEXT,
    expired_amount INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_record RECORD;
BEGIN
    -- Find and lock expired credit balances
    FOR v_record IN
        SELECT cb.id, cb.tenant_id, cb.credit_type, cb.channel, cb.balance
        FROM public.t_bm_credit_balance cb
        WHERE cb.expires_at IS NOT NULL
          AND cb.expires_at <= NOW()
          AND cb.balance > 0
        FOR UPDATE SKIP LOCKED
    LOOP
        -- Record expiry transaction
        INSERT INTO public.t_bm_credit_transaction (
            tenant_id,
            credit_type,
            channel,
            transaction_type,
            quantity,
            balance_before,
            balance_after,
            description
        ) VALUES (
            v_record.tenant_id,
            v_record.credit_type,
            v_record.channel,
            'expiry',
            -v_record.balance,
            v_record.balance,
            0,
            'Credits expired'
        );

        -- Zero out balance
        UPDATE public.t_bm_credit_balance
        SET balance = 0,
            updated_at = NOW()
        WHERE id = v_record.id;

        -- Return expired record
        RETURN QUERY SELECT
            v_record.tenant_id,
            v_record.credit_type,
            v_record.channel,
            v_record.balance;
    END LOOP;
END;
$$;

COMMENT ON FUNCTION public.process_credit_expiry IS
'Expire credits past their expiry date. Uses SKIP LOCKED for concurrent safety.';


-- ============================================================
-- PART B: ROW LEVEL SECURITY (RLS)
-- ============================================================

-- ============================================================
-- Enable RLS on all tables
-- ============================================================

ALTER TABLE public.t_bm_product_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.t_bm_credit_balance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.t_bm_credit_transaction ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.t_bm_topup_pack ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.t_contract_invoice ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.t_bm_billing_event ENABLE ROW LEVEL SECURITY;


-- ============================================================
-- Helper function to check if user is admin
-- ============================================================

CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.t_tenant t
        WHERE t.id = auth.uid()
          AND t.admin = true
    );
$$;

-- Alternative: Check via user metadata
CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT COALESCE(
        (auth.jwt() -> 'app_metadata' ->> 'is_admin')::BOOLEAN,
        false
    );
$$;


-- ============================================================
-- Helper function to get user's tenant_id
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_user_tenant_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT COALESCE(
        (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::UUID,
        auth.uid()
    );
$$;


-- ============================================================
-- RLS: t_bm_product_config
-- ============================================================
-- All authenticated users can read active configs
-- Only admins can insert/update/delete

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
-- Admins can see all

DROP POLICY IF EXISTS "credit_balance_tenant_select" ON public.t_bm_credit_balance;
CREATE POLICY "credit_balance_tenant_select" ON public.t_bm_credit_balance
    FOR SELECT
    TO authenticated
    USING (
        tenant_id = public.get_user_tenant_id()
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
        tenant_id = public.get_user_tenant_id()
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
-- Only admins can manage

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
-- Admins can see all

DROP POLICY IF EXISTS "contract_invoice_tenant_select" ON public.t_contract_invoice;
CREATE POLICY "contract_invoice_tenant_select" ON public.t_contract_invoice
    FOR SELECT
    TO authenticated
    USING (
        tenant_id = public.get_user_tenant_id()
        OR public.is_platform_admin()
    );

DROP POLICY IF EXISTS "contract_invoice_tenant_insert" ON public.t_contract_invoice;
CREATE POLICY "contract_invoice_tenant_insert" ON public.t_contract_invoice
    FOR INSERT
    TO authenticated
    WITH CHECK (
        tenant_id = public.get_user_tenant_id()
        OR public.is_platform_admin()
    );

DROP POLICY IF EXISTS "contract_invoice_tenant_update" ON public.t_contract_invoice;
CREATE POLICY "contract_invoice_tenant_update" ON public.t_contract_invoice
    FOR UPDATE
    TO authenticated
    USING (
        tenant_id = public.get_user_tenant_id()
        OR public.is_platform_admin()
    )
    WITH CHECK (
        tenant_id = public.get_user_tenant_id()
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
-- Admins and service role can manage all

DROP POLICY IF EXISTS "billing_event_tenant_select" ON public.t_bm_billing_event;
CREATE POLICY "billing_event_tenant_select" ON public.t_bm_billing_event
    FOR SELECT
    TO authenticated
    USING (
        tenant_id = public.get_user_tenant_id()
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
-- Grant execute permissions on functions
-- ============================================================

GRANT EXECUTE ON FUNCTION public.deduct_credits TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.add_credits TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.reserve_credits TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.release_reserved_credits TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.aggregate_usage TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.record_usage TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_credit_balance TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.check_credit_availability TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_billing_status TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_billing_alerts TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.calculate_tiered_price TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.process_credit_expiry TO service_role;

GRANT EXECUTE ON FUNCTION public.is_admin_user TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_platform_admin TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_tenant_id TO authenticated;


-- ============================================================
-- MIGRATION COMPLETE
-- ============================================================
--
-- PART A: DATABASE FUNCTIONS
--   1. deduct_credits()           - Atomic deduction with FOR UPDATE NOWAIT
--   2. add_credits()              - Atomic addition, creates record if needed
--   3. reserve_credits()          - Reserve for pending operations
--   4. release_reserved_credits() - Release reservations
--   5. aggregate_usage()          - Usage aggregation by period
--   6. record_usage()             - Record usage events
--   7. get_credit_balance()       - Get credit balances
--   8. check_credit_availability()- Check without deducting
--   9. get_billing_status()       - Comprehensive status (bot-friendly)
--   10. get_billing_alerts()      - Billing alerts
--   11. calculate_tiered_price()  - Tiered pricing calculation
--   12. process_credit_expiry()   - Expire old credits
--
-- PART B: RLS POLICIES
--   - t_bm_product_config:      Read all active, admin manages
--   - t_bm_credit_balance:      Tenant sees own, admin sees all
--   - t_bm_credit_transaction:  Tenant sees own (read-only)
--   - t_bm_topup_pack:          Read all active, admin manages
--   - t_contract_invoice:       Tenant manages own
--   - t_bm_billing_event:       Tenant sees own, admin manages all
--
-- HELPER FUNCTIONS
--   - is_admin_user()           - Check if user is admin via t_tenant
--   - is_platform_admin()       - Check if user is admin via JWT
--   - get_user_tenant_id()      - Get tenant_id from JWT or auth.uid()
--
-- RACE CONDITION HANDLING
--   - FOR UPDATE NOWAIT: Fails immediately if locked
--   - FOR UPDATE SKIP LOCKED: Skips locked rows (batch processing)
--   - Atomic transactions within functions
--   - Audit trail for all credit operations
-- ============================================================
