-- =============================================================
-- PATCH: Add computed_events to create_contract_transaction RPC
-- Migration: contracts/014_add_computed_events_to_create_rpc.sql
--
-- This patch updates the create_contract_transaction RPC to include
-- the computed_events JSONB column when inserting a new contract.
-- =============================================================

-- Drop and recreate the function with computed_events support
CREATE OR REPLACE FUNCTION create_contract_transaction(
    p_payload JSONB,
    p_idempotency_key VARCHAR DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_idempotency       RECORD;
    v_tenant_id         UUID;
    v_contract_id       UUID;
    v_contract_number   VARCHAR;
    v_rfq_number        VARCHAR;
    v_record_type       VARCHAR;
    v_contract_type     VARCHAR;
    v_acceptance_method VARCHAR;
    v_initial_status    VARCHAR;
    v_cnak              VARCHAR(12);
    v_block             JSONB;
    v_block_id          UUID;
    v_vendor            JSONB;
    v_vendor_id         UUID;
    v_contact_info      RECORD;
    v_response          JSONB;
BEGIN
    -- ═══════════════════════════════════════════
    -- STEP 0: Extract and validate tenant_id
    -- ═══════════════════════════════════════════
    v_tenant_id := (p_payload->>'tenant_id')::UUID;

    IF v_tenant_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'tenant_id is required',
            'error_code', 'MISSING_TENANT_ID'
        );
    END IF;

    -- ═══════════════════════════════════════════
    -- STEP 1: Idempotency check
    -- ═══════════════════════════════════════════
    IF p_idempotency_key IS NOT NULL THEN
        SELECT * INTO v_idempotency
        FROM check_idempotency(
            p_idempotency_key,
            v_tenant_id,
            'create_contract_transaction'
        );

        IF v_idempotency.found THEN
            RETURN v_idempotency.response_body;
        END IF;
    END IF;

    -- ═══════════════════════════════════════════
    -- STEP 2: Determine record type, contract type, acceptance method
    -- ═══════════════════════════════════════════
    v_record_type := COALESCE(p_payload->>'record_type', 'contract');
    v_contract_type := p_payload->>'contract_type';
    v_acceptance_method := COALESCE(p_payload->>'acceptance_method', 'manual');

    -- Determine initial status based on record type
    IF v_record_type = 'rfq' THEN
        v_initial_status := 'draft';
    ELSE
        v_initial_status := 'draft';
    END IF;

    -- ═══════════════════════════════════════════
    -- STEP 3: Generate contract number / RFQ number / CNAK
    -- ═══════════════════════════════════════════
    IF v_record_type = 'rfq' THEN
        v_rfq_number := generate_rfq_number(v_tenant_id);
        v_contract_number := NULL;
    ELSE
        v_contract_number := generate_contract_number(v_tenant_id);
        v_rfq_number := NULL;
    END IF;

    -- Generate CNAK (Contract Number Access Key)
    v_cnak := generate_cnak();

    -- Ensure CNAK is unique
    WHILE EXISTS (SELECT 1 FROM t_contracts WHERE global_access_id = v_cnak) LOOP
        v_cnak := generate_cnak();
    END LOOP;

    -- ═══════════════════════════════════════════
    -- STEP 3b: Fetch buyer contact info if buyer_id provided
    -- ═══════════════════════════════════════════
    IF (p_payload->>'buyer_id') IS NOT NULL THEN
        SELECT
            company_name,
            email,
            phone,
            primary_contact_person_id,
            primary_contact_person_name
        INTO v_contact_info
        FROM t_contacts
        WHERE id = (p_payload->>'buyer_id')::UUID
          AND tenant_id = v_tenant_id
          AND is_active = true;
    END IF;

    -- ═══════════════════════════════════════════
    -- STEP 4: Insert contract (NOW WITH computed_events)
    -- ═══════════════════════════════════════════
    INSERT INTO t_contracts (
        tenant_id,
        contract_number,
        rfq_number,
        record_type,
        contract_type,
        path,
        template_id,
        name,
        description,
        status,
        buyer_id,
        buyer_name,
        buyer_company,
        buyer_email,
        buyer_phone,
        buyer_contact_person_id,
        buyer_contact_person_name,
        acceptance_method,
        duration_value,
        duration_unit,
        grace_period_value,
        grace_period_unit,
        currency,
        billing_cycle_type,
        payment_mode,
        emi_months,
        per_block_payment_type,
        total_value,
        tax_total,
        grand_total,
        selected_tax_rate_ids,
        tax_breakdown,
        computed_events,          -- ← NEW: computed_events column
        global_access_id,
        version,
        is_live,
        is_active,
        created_by,
        updated_by
    )
    VALUES (
        v_tenant_id,
        v_contract_number,
        v_rfq_number,
        v_record_type,
        v_contract_type,
        p_payload->>'path',
        (p_payload->>'template_id')::UUID,
        TRIM(p_payload->>'name'),
        p_payload->>'description',
        v_initial_status,
        (p_payload->>'buyer_id')::UUID,
        COALESCE(p_payload->>'buyer_name', v_contact_info.company_name),
        COALESCE(p_payload->>'buyer_company', v_contact_info.company_name),
        COALESCE(p_payload->>'buyer_email', v_contact_info.email),
        COALESCE(p_payload->>'buyer_phone', v_contact_info.phone),
        COALESCE((p_payload->>'buyer_contact_person_id')::UUID, v_contact_info.primary_contact_person_id),
        COALESCE(p_payload->>'buyer_contact_person_name', v_contact_info.primary_contact_person_name),
        v_acceptance_method,
        (p_payload->>'duration_value')::INTEGER,
        p_payload->>'duration_unit',
        COALESCE((p_payload->>'grace_period_value')::INTEGER, 0),
        p_payload->>'grace_period_unit',
        COALESCE(p_payload->>'currency', 'INR'),
        p_payload->>'billing_cycle_type',
        p_payload->>'payment_mode',
        (p_payload->>'emi_months')::INTEGER,
        p_payload->>'per_block_payment_type',
        COALESCE((p_payload->>'total_value')::NUMERIC, 0),
        COALESCE((p_payload->>'tax_total')::NUMERIC, 0),
        COALESCE((p_payload->>'grand_total')::NUMERIC, 0),
        COALESCE(p_payload->'selected_tax_rate_ids', '[]'::JSONB),
        COALESCE(p_payload->'tax_breakdown', '[]'::JSONB),
        p_payload->'computed_events',  -- ← NEW: Extract computed_events from payload
        v_cnak,
        1,
        COALESCE((p_payload->>'is_live')::BOOLEAN, true),
        true,
        (p_payload->>'created_by')::UUID,
        (p_payload->>'created_by')::UUID
    )
    RETURNING id INTO v_contract_id;

    -- ═══════════════════════════════════════════
    -- STEP 5: Insert blocks (if provided)
    -- ═══════════════════════════════════════════
    IF p_payload->'blocks' IS NOT NULL AND jsonb_array_length(p_payload->'blocks') > 0 THEN
        FOR v_block IN SELECT * FROM jsonb_array_elements(p_payload->'blocks')
        LOOP
            INSERT INTO t_contract_blocks (
                contract_id,
                tenant_id,
                position,
                source_type,
                source_block_id,
                block_name,
                block_description,
                category_id,
                category_name,
                unit_price,
                quantity,
                billing_cycle,
                total_price,
                flyby_type,
                custom_fields,
                is_live,
                is_active,
                created_by,
                updated_by
            )
            VALUES (
                v_contract_id,
                v_tenant_id,
                COALESCE((v_block->>'position')::INTEGER, 0),
                COALESCE(v_block->>'source_type', 'catalog'),
                (v_block->>'source_block_id')::UUID,
                v_block->>'block_name',
                v_block->>'block_description',
                (v_block->>'category_id')::UUID,
                v_block->>'category_name',
                COALESCE((v_block->>'unit_price')::NUMERIC, 0),
                COALESCE((v_block->>'quantity')::INTEGER, 1),
                v_block->>'billing_cycle',
                COALESCE((v_block->>'total_price')::NUMERIC, 0),
                v_block->>'flyby_type',
                COALESCE(v_block->'custom_fields', '{}'::JSONB),
                COALESCE((p_payload->>'is_live')::BOOLEAN, true),
                true,
                (p_payload->>'created_by')::UUID,
                (p_payload->>'created_by')::UUID
            )
            RETURNING id INTO v_block_id;
        END LOOP;
    END IF;

    -- ═══════════════════════════════════════════
    -- STEP 6: Insert vendors (RFQ only)
    -- ═══════════════════════════════════════════
    IF v_record_type = 'rfq' AND p_payload->'vendors' IS NOT NULL AND jsonb_array_length(p_payload->'vendors') > 0 THEN
        FOR v_vendor IN SELECT * FROM jsonb_array_elements(p_payload->'vendors')
        LOOP
            INSERT INTO t_contract_vendors (
                contract_id,
                tenant_id,
                vendor_id,
                contact_id,
                contact_classification,
                vendor_name,
                status,
                is_active,
                created_by,
                updated_by
            )
            VALUES (
                v_contract_id,
                v_tenant_id,
                (v_vendor->>'vendor_id')::UUID,
                (v_vendor->>'contact_id')::UUID,
                COALESCE(v_vendor->>'contact_classification', 'vendor'),
                v_vendor->>'vendor_name',
                'pending',
                true,
                (p_payload->>'created_by')::UUID,
                (p_payload->>'created_by')::UUID
            )
            RETURNING id INTO v_vendor_id;
        END LOOP;
    END IF;

    -- ═══════════════════════════════════════════
    -- STEP 7: Build response
    -- ═══════════════════════════════════════════
    v_response := jsonb_build_object(
        'success', true,
        'data', (
            SELECT jsonb_build_object(
                'id', c.id,
                'tenant_id', c.tenant_id,
                'contract_number', c.contract_number,
                'rfq_number', c.rfq_number,
                'record_type', c.record_type,
                'name', c.name,
                'status', c.status,
                'global_access_id', c.global_access_id,
                'buyer_id', c.buyer_id,
                'buyer_name', c.buyer_name,
                'buyer_email', c.buyer_email,
                'currency', c.currency,
                'grand_total', c.grand_total,
                'acceptance_method', c.acceptance_method,
                'computed_events_count', COALESCE(jsonb_array_length(c.computed_events), 0),
                'created_at', c.created_at
            )
            FROM t_contracts c
            WHERE c.id = v_contract_id
        ),
        'created_at', NOW()
    );

    -- ═══════════════════════════════════════════
    -- STEP 8: Store idempotency (if key provided)
    -- ═══════════════════════════════════════════
    IF p_idempotency_key IS NOT NULL THEN
        PERFORM store_idempotency(
            p_idempotency_key,
            v_tenant_id,
            'create_contract_transaction',
            'POST',
            NULL,
            201,
            v_response,
            24
        );
    END IF;

    RETURN v_response;

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false,
        'error', SQLERRM,
        'error_code', 'TRANSACTION_FAILED',
        'sqlstate', SQLSTATE
    );
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION create_contract_transaction(JSONB, VARCHAR) TO authenticated;
GRANT EXECUTE ON FUNCTION create_contract_transaction(JSONB, VARCHAR) TO service_role;

-- Add comment
COMMENT ON FUNCTION create_contract_transaction IS 'Creates a contract with blocks, vendors, and computed_events in a single transaction';
