-- =============================================================
-- FIX: Payment gateway text=uuid type mismatch + Invoice audit logging
-- Migration: contracts/047_fix_payment_gateway_type_and_invoice_audit.sql
--
-- Problem 1: get_tenant_gateway_credentials(p_tenant_id UUID)
--   The Edge function passes tenant_id as TEXT via supabase.rpc().
--   PostgreSQL raises: "operator does not exist: text = uuid"
--   because PostgREST sends the param as text and PG can't resolve
--   the implicit cast for the = operator.
--
-- Fix 1: Recreate get_tenant_gateway_credentials with p_tenant_id TEXT
--   and cast to UUID inside the function body.
--
-- Problem 2: generate_contract_invoices() creates invoices but
--   does NOT insert into t_audit_log. The audit trail shows nothing
--   for invoice generation.
--
-- Fix 2: Recreate generate_contract_invoices() with INSERT INTO
--   t_audit_log after invoice creation.
--
-- Problem 3: respond_to_contract() activates a contract but does
--   NOT log the activation or invoice generation in t_audit_log.
--
-- Fix 3: Add audit log entries in respond_to_contract() for:
--   a) Contract activation (status_change)
--   b) Invoice generation (billing)
-- =============================================================


-- ─────────────────────────────────────────────────────────────
-- 1. FIX get_tenant_gateway_credentials: TEXT param instead of UUID
-- ─────────────────────────────────────────────────────────────

-- Drop the old UUID-signature function and its grants
DROP FUNCTION IF EXISTS get_tenant_gateway_credentials(UUID, TEXT);

CREATE OR REPLACE FUNCTION get_tenant_gateway_credentials(
    p_tenant_id TEXT,                       -- Changed from UUID to TEXT
    p_provider   TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_result JSONB;
    v_tenant_uuid UUID;
BEGIN
    -- Cast text → uuid safely
    BEGIN
        v_tenant_uuid := p_tenant_id::UUID;
    EXCEPTION WHEN invalid_text_representation THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Invalid tenant_id format'
        );
    END;

    SELECT jsonb_build_object(
        'success', true,
        'data', jsonb_build_object(
            'integration_id', ti.id,
            'provider', ip.name,
            'display_name', ip.display_name,
            'credentials', ti.credentials,
            'is_live', ti.is_live,
            'is_active', ti.is_active,
            'connection_status', ti.connection_status,
            'last_verified', ti.last_verified
        )
    ) INTO v_result
    FROM t_tenant_integrations ti
    JOIN t_integration_providers ip ON ti.master_integration_id = ip.id
    JOIN t_integration_types it ON ip.type_id = it.id
    WHERE ti.tenant_id = v_tenant_uuid
      AND it.name = 'payment_gateway'
      AND ti.is_active = true
      AND (p_provider IS NULL OR ip.name = p_provider)
    ORDER BY ti.updated_at DESC
    LIMIT 1;

    IF v_result IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'No active payment gateway found for this tenant'
        );
    END IF;

    RETURN v_result;
END;
$$;

-- Re-grant with new signature (TEXT, TEXT)
GRANT EXECUTE ON FUNCTION get_tenant_gateway_credentials(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_tenant_gateway_credentials(TEXT, TEXT) TO service_role;


-- ─────────────────────────────────────────────────────────────
-- 2. FIX generate_contract_invoices: add audit log entry
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION generate_contract_invoices(
    p_contract_id UUID,
    p_tenant_id UUID,
    p_created_by UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_contract RECORD;
    v_invoice_type VARCHAR(20);
    v_seq_result JSONB;
    v_invoice_number VARCHAR(30);
    v_invoice_id UUID;
BEGIN
    -- ═══════════════════════════════════════════
    -- STEP 0: Fetch contract + validate
    -- ═══════════════════════════════════════════
    SELECT * INTO v_contract
    FROM t_contracts
    WHERE id = p_contract_id
      AND tenant_id = p_tenant_id
      AND is_active = true;

    IF v_contract IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Contract not found'
        );
    END IF;

    -- Allow 'active' always, and 'pending_acceptance' for payment-acceptance contracts
    IF v_contract.status <> 'active' AND NOT (
        v_contract.status = 'pending_acceptance' AND v_contract.acceptance_method = 'manual'
    ) THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Contract must be active to generate invoices (payment-acceptance contracts generate at pending_acceptance)',
            'current_status', v_contract.status
        );
    END IF;

    -- Don't generate if invoices already exist (idempotent)
    IF EXISTS (
        SELECT 1 FROM t_invoices
        WHERE contract_id = p_contract_id AND is_active = true
    ) THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Invoices already generated for this contract'
        );
    END IF;

    -- ═══════════════════════════════════════════
    -- STEP 1: Determine AR/AP from contract_type
    -- ═══════════════════════════════════════════
    v_invoice_type := CASE v_contract.contract_type
        WHEN 'vendor' THEN 'payable'
        ELSE 'receivable'
    END;

    -- ═══════════════════════════════════════════
    -- STEP 2: Generate sequence number
    -- ═══════════════════════════════════════════
    v_seq_result := get_next_formatted_sequence('INVOICE', p_tenant_id, v_contract.is_live);
    v_invoice_number := v_seq_result->>'formatted';

    -- ═══════════════════════════════════════════
    -- STEP 3: Create single invoice for grand_total
    -- ═══════════════════════════════════════════
    INSERT INTO t_invoices (
        contract_id, tenant_id, invoice_number, invoice_type,
        amount, tax_amount, total_amount, currency,
        balance, status, payment_mode,
        emi_total,
        due_date, issued_at,
        is_live, created_by
    ) VALUES (
        p_contract_id, p_tenant_id, v_invoice_number, v_invoice_type,
        COALESCE(v_contract.total_value, 0),
        COALESCE(v_contract.tax_total, 0),
        COALESCE(v_contract.grand_total, 0),
        COALESCE(v_contract.currency, 'INR'),
        COALESCE(v_contract.grand_total, 0),  -- balance = total at creation
        'unpaid',
        COALESCE(v_contract.payment_mode, 'prepaid'),
        CASE WHEN v_contract.payment_mode = 'emi'
             THEN v_contract.emi_months
             ELSE NULL
        END,
        CURRENT_DATE, NOW(),
        v_contract.is_live, p_created_by
    )
    RETURNING id INTO v_invoice_id;

    -- ═══════════════════════════════════════════
    -- STEP 3.5: Audit log — invoice generated
    -- ═══════════════════════════════════════════
    BEGIN
        INSERT INTO t_audit_log (
            tenant_id,
            entity_type,
            entity_id,
            contract_id,
            category,
            action,
            description,
            new_value,
            performed_by,
            performed_by_name
        ) VALUES (
            p_tenant_id,
            'contract',
            v_invoice_id,
            p_contract_id,
            'billing',
            'invoice_generated',
            'Invoice ' || v_invoice_number || ' generated for contract ' || COALESCE(v_contract.contract_number, v_contract.id::TEXT),
            jsonb_build_object(
                'invoice_id', v_invoice_id,
                'invoice_number', v_invoice_number,
                'invoice_type', v_invoice_type,
                'total_amount', COALESCE(v_contract.grand_total, 0),
                'currency', COALESCE(v_contract.currency, 'INR'),
                'payment_mode', COALESCE(v_contract.payment_mode, 'prepaid'),
                'status', 'unpaid'
            ),
            p_created_by,
            CASE WHEN p_created_by IS NULL THEN 'System' ELSE NULL END
        );
    EXCEPTION WHEN OTHERS THEN
        -- Audit failure should not block invoice generation
        RAISE NOTICE 'Audit log insert failed for invoice %: %', v_invoice_id, SQLERRM;
    END;

    -- ═══════════════════════════════════════════
    -- STEP 4: Return summary
    -- ═══════════════════════════════════════════
    RETURN jsonb_build_object(
        'success', true,
        'data', jsonb_build_object(
            'contract_id', p_contract_id,
            'invoice_id', v_invoice_id,
            'invoice_number', v_invoice_number,
            'invoice_type', v_invoice_type,
            'payment_mode', COALESCE(v_contract.payment_mode, 'prepaid'),
            'emi_months', v_contract.emi_months,
            'total_amount', COALESCE(v_contract.grand_total, 0),
            'currency', COALESCE(v_contract.currency, 'INR')
        )
    );

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false,
        'error', 'Failed to generate invoices',
        'details', SQLERRM,
        'error_code', SQLSTATE
    );
END;
$$;

GRANT EXECUTE ON FUNCTION generate_contract_invoices(UUID, UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION generate_contract_invoices(UUID, UUID, UUID) TO service_role;


-- ─────────────────────────────────────────────────────────────
-- 3. FIX respond_to_contract: add audit log for activation + invoices
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION respond_to_contract(
    p_cnak             VARCHAR,
    p_secret_code      VARCHAR,
    p_action           VARCHAR,          -- 'accept' | 'reject'
    p_responded_by     UUID DEFAULT NULL,
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
    v_invoice_result JSONB;
    v_performer_name TEXT;
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

    IF v_access IS NULL THEN
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

    IF v_contract IS NULL THEN
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

    -- Resolve performer name once
    v_performer_name := COALESCE(p_responder_name, v_access.accessor_name, 'External party');

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
        IF v_contract.status = 'pending_acceptance' THEN
            UPDATE t_contracts
            SET status      = 'active',
                accepted_at = COALESCE(accepted_at, NOW()),
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
                jsonb_build_object(
                    'record_type', v_contract.record_type,
                    'acceptance_method', v_contract.acceptance_method,
                    'accepted_via', 'sign_off_link'
                ),
                'external',
                p_responded_by,
                v_performer_name,
                'Contract accepted via sign-off link'
            );

            -- ═══════════════════════════════════════════
            -- FIX: Audit log — contract activated
            -- ═══════════════════════════════════════════
            BEGIN
                INSERT INTO t_audit_log (
                    tenant_id,
                    entity_type,
                    entity_id,
                    contract_id,
                    category,
                    action,
                    description,
                    old_value,
                    new_value,
                    performed_by,
                    performed_by_name
                ) VALUES (
                    v_access.tenant_id,
                    'contract',
                    v_contract.id,
                    v_contract.id,
                    'status',
                    'status_changed',
                    'Contract ' || COALESCE(v_contract.contract_number, v_contract.id::TEXT) || ' activated via sign-off link',
                    jsonb_build_object('status', 'pending_acceptance'),
                    jsonb_build_object(
                        'status', 'active',
                        'accepted_by', v_performer_name,
                        'acceptance_method', v_contract.acceptance_method,
                        'accepted_via', 'sign_off_link'
                    ),
                    p_responded_by,
                    v_performer_name
                );
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Audit log insert failed for contract activation %: %', v_contract.id, SQLERRM;
            END;

            -- ═══════════════════════════════════════════
            -- Generate invoices on activation
            -- (generate_contract_invoices now handles its own audit log)
            -- ═══════════════════════════════════════════
            IF v_contract.record_type = 'contract' THEN
                v_invoice_result := generate_contract_invoices(
                    v_contract.id,
                    v_access.tenant_id,
                    p_responded_by
                );
            END IF;

            -- ═══════════════════════════════════════════
            -- Queue JTD event (contract_accepted)
            -- ═══════════════════════════════════════════
            BEGIN
                PERFORM pgmq.send('jtd_queue', jsonb_build_object(
                    'source_type_code', 'contract_accepted',
                    'tenant_id', v_access.tenant_id,
                    'contract_id', v_contract.id,
                    'contract_name', v_contract.name,
                    'from_status', 'pending_acceptance',
                    'to_status', 'active',
                    'record_type', v_contract.record_type,
                    'performed_by_id', p_responded_by,
                    'performed_by_name', v_performer_name
                ));
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'JTD queue failed for contract % (public accept): %', v_contract.id, SQLERRM;
            END;
        END IF;

    ELSIF p_action = 'reject' THEN
        -- ═══════════════════════════════════════════
        -- Audit log — contract rejected
        -- ═══════════════════════════════════════════
        BEGIN
            INSERT INTO t_audit_log (
                tenant_id,
                entity_type,
                entity_id,
                contract_id,
                category,
                action,
                description,
                old_value,
                new_value,
                performed_by,
                performed_by_name
            ) VALUES (
                v_access.tenant_id,
                'contract',
                v_contract.id,
                v_contract.id,
                'status',
                'status_changed',
                'Contract ' || COALESCE(v_contract.contract_number, v_contract.id::TEXT) || ' rejected via sign-off link',
                jsonb_build_object('status', v_contract.status),
                jsonb_build_object(
                    'status', 'rejected',
                    'rejected_by', v_performer_name,
                    'rejection_reason', p_rejection_reason
                ),
                p_responded_by,
                v_performer_name
            );
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Audit log insert failed for contract rejection %: %', v_contract.id, SQLERRM;
        END;
    END IF;

    -- ── Step 9: Return result ──
    RETURN jsonb_build_object(
        'success', true,
        'action', p_action,
        'status', v_new_status,
        'contract_id', v_contract.id,
        'contract_number', v_contract.contract_number,
        'invoices_generated', COALESCE((v_invoice_result->>'success')::BOOLEAN, false),
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

-- Grants (same signature as original)
GRANT EXECUTE ON FUNCTION respond_to_contract(VARCHAR, VARCHAR, VARCHAR, UUID, VARCHAR, VARCHAR, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION respond_to_contract(VARCHAR, VARCHAR, VARCHAR, UUID, VARCHAR, VARCHAR, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION respond_to_contract(VARCHAR, VARCHAR, VARCHAR, UUID, VARCHAR, VARCHAR, TEXT) TO authenticated;
