-- ============================================================================
-- Credit Operation RPC Functions
-- ============================================================================
-- Matches Edge function call signatures
-- ============================================================================

-- Drop any existing versions
DROP FUNCTION IF EXISTS add_credits(UUID, TEXT, INTEGER, TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS deduct_credits(UUID, TEXT, INTEGER, TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS check_credit_availability(UUID, TEXT, INTEGER, TEXT);

-- ============================================================================
-- 1. ADD CREDITS
-- ============================================================================
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
-- 2. DEDUCT CREDITS
-- ============================================================================
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
-- 3. CHECK CREDIT AVAILABILITY
-- ============================================================================
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
COMMENT ON FUNCTION add_credits IS 'Add credits to tenant balance';
COMMENT ON FUNCTION deduct_credits IS 'Deduct credits from tenant balance with availability check';
COMMENT ON FUNCTION check_credit_availability IS 'Check if tenant has sufficient credits without deducting';
