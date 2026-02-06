-- ═══════════════════════════════════════════════════════════════════════════════
-- FIX: respond_to_contract - Add invoice and event generation on accept
-- This fixes the missing events/invoices when contract is accepted via sign-off link
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION respond_to_contract(
    p_cnak             VARCHAR,
    p_secret_code      VARCHAR,
    p_action           VARCHAR,          -- 'accept' | 'reject'
    p_responded_by     UUID DEFAULT NULL, -- user ID if logged in
    p_responder_name   VARCHAR DEFAULT NULL,
    p_responder_email  VARCHAR DEFAULT NULL,
    p_rejection_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_access   RECORD;
    v_contract RECORD;
    v_new_status VARCHAR(20);
BEGIN
    -- ── Step 1: Validate inputs ──
    IF p_cnak IS NULL OR p_secret_code IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'CNAK and secret code are required'
        );
    END IF;

    IF p_action NOT IN ('accept', 'reject') THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Action must be accept or reject'
        );
    END IF;

    -- ── Step 2: Look up and lock access grant ──
    SELECT *
    INTO v_access
    FROM t_contract_access
    WHERE global_access_id = p_cnak
      AND secret_code      = p_secret_code
      AND is_active         = true
    FOR UPDATE;

    IF v_access.id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Invalid access code'
        );
    END IF;

    -- ── Step 3: Check if already responded ──
    IF v_access.status IN ('accepted', 'rejected') THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'This contract has already been ' || v_access.status,
            'status', v_access.status
        );
    END IF;

    -- ── Step 4: Check expiry ──
    IF v_access.expires_at IS NOT NULL AND v_access.expires_at < NOW() THEN
        -- Mark as expired
        UPDATE t_contract_access
        SET status = 'expired', updated_at = NOW()
        WHERE id = v_access.id;

        RETURN jsonb_build_object(
            'success', false,
            'error', 'This access link has expired'
        );
    END IF;

    -- ── Step 5: Get contract ──
    SELECT *
    INTO v_contract
    FROM t_contracts
    WHERE id = v_access.contract_id
      AND is_active = true
    FOR UPDATE;

    IF v_contract.id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Contract not found'
        );
    END IF;

    -- ── Step 6: Determine new status ──
    v_new_status := CASE p_action
        WHEN 'accept' THEN 'accepted'
        WHEN 'reject' THEN 'rejected'
    END;

    -- ── Step 7: Update access record ──
    UPDATE t_contract_access
    SET status           = v_new_status,
        responded_by     = p_responded_by,
        responded_at     = NOW(),
        rejection_reason = CASE WHEN p_action = 'reject' THEN p_rejection_reason ELSE NULL END,
        updated_at       = NOW()
    WHERE id = v_access.id;

    -- ── Step 8: Update contract status if accepted ──
    IF p_action = 'accept' THEN
        -- Move contract from pending_acceptance → active
        IF v_contract.status = 'pending_acceptance' THEN
            UPDATE t_contracts
            SET status      = 'active',
                accepted_at = NOW(),  -- Set accepted_at timestamp
                version     = version + 1,
                updated_at  = NOW()
            WHERE id = v_contract.id;

            -- Log status change in history
            INSERT INTO t_contract_history (
                contract_id, tenant_id,
                action, from_status, to_status,
                changes,
                performed_by_type, performed_by_id, performed_by_name,
                note
            ) VALUES (
                v_contract.id,
                v_access.tenant_id,
                'status_change',
                'pending_acceptance',
                'active',
                NULL,
                'external',
                p_responded_by,
                COALESCE(p_responder_name, v_access.accessor_name, 'External party'),
                'Contract accepted via sign-off link'
            );

            -- ═══════════════════════════════════════════
            -- NEW: Generate invoices when contract becomes active
            -- This was missing - invoices are only generated when
            -- contract status = 'active' and record_type = 'contract'
            -- ═══════════════════════════════════════════
            IF v_contract.record_type = 'contract' THEN
                BEGIN
                    PERFORM generate_contract_invoices(
                        v_contract.id,
                        v_access.tenant_id,
                        p_responded_by  -- Use responder as creator, or NULL
                    );
                EXCEPTION WHEN OTHERS THEN
                    -- Log error but don't fail the whole transaction
                    RAISE WARNING 'Failed to generate invoices for contract %: %', v_contract.id, SQLERRM;
                END;
            END IF;

            -- ═══════════════════════════════════════════
            -- NEW: Process computed events when contract becomes active
            -- This creates the contract events from the computed_events column
            -- ═══════════════════════════════════════════
            IF v_contract.record_type = 'contract' THEN
                BEGIN
                    PERFORM process_contract_events_from_computed(
                        v_contract.id,
                        v_access.tenant_id
                    );
                EXCEPTION WHEN OTHERS THEN
                    -- Log error but don't fail the whole transaction
                    RAISE WARNING 'Failed to process events for contract %: %', v_contract.id, SQLERRM;
                END;
            END IF;
        END IF;
    END IF;

    -- ── Step 9: Return result ──
    RETURN jsonb_build_object(
        'success', true,
        'action', p_action,
        'status', v_new_status,
        'contract_id', v_contract.id,
        'contract_number', v_contract.contract_number,
        'message', CASE p_action
            WHEN 'accept' THEN 'Contract accepted successfully'
            WHEN 'reject' THEN 'Contract rejected'
        END
    );

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false,
        'error', 'Failed to respond to contract: ' || SQLERRM
    );
END;
$$;

-- Grants
GRANT EXECUTE ON FUNCTION respond_to_contract(VARCHAR, VARCHAR, VARCHAR, UUID, VARCHAR, VARCHAR, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION respond_to_contract(VARCHAR, VARCHAR, VARCHAR, UUID, VARCHAR, VARCHAR, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION respond_to_contract(VARCHAR, VARCHAR, VARCHAR, UUID, VARCHAR, VARCHAR, TEXT) TO authenticated;


-- ═══════════════════════════════════════════════════════════════════════════════
-- DONE! Deploy this to Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════════════════════
