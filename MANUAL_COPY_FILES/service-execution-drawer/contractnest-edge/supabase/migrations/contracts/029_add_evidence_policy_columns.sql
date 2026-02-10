-- =============================================================
-- ADD EVIDENCE POLICY COLUMNS TO t_contracts
-- Migration: contracts/029_add_evidence_policy_columns.sql
-- Purpose: Store evidence policy configuration at contract level
-- Fields:
--   evidence_policy_type: 'none' | 'upload' | 'smart_form'
--   evidence_selected_forms: JSONB array of selected form templates
-- =============================================================

-- ─────────────────────────────────────────────────────────────
-- STEP 1: Add columns to t_contracts
-- ─────────────────────────────────────────────────────────────
ALTER TABLE t_contracts
  ADD COLUMN IF NOT EXISTS evidence_policy_type VARCHAR(20) DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS evidence_selected_forms JSONB DEFAULT '[]'::JSONB;

-- Add a CHECK constraint to validate evidence_policy_type values
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_evidence_policy_type'
  ) THEN
    ALTER TABLE t_contracts
      ADD CONSTRAINT chk_evidence_policy_type
      CHECK (evidence_policy_type IN ('none', 'upload', 'smart_form'));
  END IF;
END $$;

COMMENT ON COLUMN t_contracts.evidence_policy_type IS 'Evidence collection policy: none=no verification, upload=file upload proof, smart_form=structured form(s)';
COMMENT ON COLUMN t_contracts.evidence_selected_forms IS 'Array of form templates for smart_form policy: [{form_template_id, name, sequence}]';


-- ─────────────────────────────────────────────────────────────
-- STEP 2: Update create_contract_transaction to handle evidence fields
-- ─────────────────────────────────────────────────────────────
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
    -- Extracted fields
    v_tenant_id UUID;
    v_record_type VARCHAR(10);
    v_contract_type VARCHAR(20);
    v_is_live BOOLEAN;
    v_created_by UUID;

    -- Sequence
    v_seq_result JSONB;
    v_contract_number VARCHAR(30);
    v_rfq_number VARCHAR(30);

    -- Auto-accept
    v_acceptance_method VARCHAR(20);
    v_initial_status VARCHAR(30);

    -- Result
    v_contract_id UUID;
    v_contract RECORD;

    -- Blocks & Vendors
    v_blocks JSONB;
    v_vendors JSONB;
    v_block JSONB;
    v_vendor JSONB;
    v_block_id UUID;

    -- CNAK (ContractNest Access Key)
    v_cnak VARCHAR(12);
    v_access_secret VARCHAR(32);

    -- Idempotency
    v_idempotency RECORD;
BEGIN
    -- ═══════════════════════════════════════════
    -- STEP 0: Input validation
    -- ═══════════════════════════════════════════
    v_tenant_id := (p_payload->>'tenant_id')::UUID;
    v_record_type := COALESCE(p_payload->>'record_type', 'contract');
    v_contract_type := COALESCE(p_payload->>'contract_type', 'client');
    v_is_live := COALESCE((p_payload->>'is_live')::BOOLEAN, true);
    v_created_by := (p_payload->>'created_by')::UUID;

    IF v_tenant_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'tenant_id is required'
        );
    END IF;

    IF p_payload->>'name' IS NULL OR TRIM(p_payload->>'name') = '' THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Contract name is required'
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
    -- STEP 2: Generate sequence number
    -- ═══════════════════════════════════════════
    IF v_record_type = 'rfq' THEN
        v_seq_result := get_next_formatted_sequence('PROJECT', v_tenant_id, v_is_live);
        v_rfq_number := v_seq_result->>'formatted';
    ELSE
        v_seq_result := get_next_formatted_sequence('CONTRACT', v_tenant_id, v_is_live);
        v_contract_number := v_seq_result->>'formatted';
    END IF;

    -- ═══════════════════════════════════════════
    -- STEP 3: Determine initial status
    --   Auto-accept rule: if acceptance_method = 'auto' → active
    -- ═══════════════════════════════════════════
    v_acceptance_method := p_payload->>'acceptance_method';

    IF v_acceptance_method = 'auto' AND v_record_type = 'contract' THEN
        v_initial_status := 'active';
    ELSE
        v_initial_status := 'draft';
    END IF;

    -- ═══════════════════════════════════════════
    -- STEP 3.5: Generate CNAK (ContractNest Access Key)
    --   Format: CNAK-XXXXXX (6 uppercase alphanumeric chars)
    --   Unique within tenant_id scope
    -- ═══════════════════════════════════════════
    LOOP
        v_cnak := 'CNAK-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));
        -- Check uniqueness within this tenant only
        IF NOT EXISTS (
            SELECT 1 FROM t_contracts
            WHERE tenant_id = v_tenant_id AND global_access_id = v_cnak
        ) THEN
            EXIT;
        END IF;
    END LOOP;

    -- ═══════════════════════════════════════════
    -- STEP 4: Insert contract
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
        global_access_id,
        evidence_policy_type,
        evidence_selected_forms,
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
        p_payload->>'buyer_name',
        p_payload->>'buyer_company',
        p_payload->>'buyer_email',
        p_payload->>'buyer_phone',
        (p_payload->>'buyer_contact_person_id')::UUID,
        p_payload->>'buyer_contact_person_name',
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
        v_cnak,
        COALESCE(p_payload->>'evidence_policy_type', 'none'),
        COALESCE(p_payload->'evidence_selected_forms', '[]'::JSONB),
        1,
        v_is_live,
        true,
        v_created_by,
        v_created_by
    )
    RETURNING id INTO v_contract_id;

    -- ═══════════════════════════════════════════
    -- STEP 5: Bulk insert blocks
    -- ═══════════════════════════════════════════
    v_blocks := COALESCE(p_payload->'blocks', '[]'::JSONB);

    FOR v_block IN SELECT * FROM jsonb_array_elements(v_blocks)
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
            custom_fields
        )
        VALUES (
            v_contract_id,
            v_tenant_id,
            COALESCE((v_block->>'position')::INTEGER, 0),
            COALESCE(v_block->>'source_type', 'flyby'),
            (v_block->>'source_block_id')::UUID,
            COALESCE(v_block->>'block_name', 'Untitled Block'),
            v_block->>'block_description',
            v_block->>'category_id',
            v_block->>'category_name',
            (v_block->>'unit_price')::NUMERIC,
            (v_block->>'quantity')::INTEGER,
            v_block->>'billing_cycle',
            (v_block->>'total_price')::NUMERIC,
            v_block->>'flyby_type',
            COALESCE(v_block->'custom_fields', '{}'::JSONB)
        );
    END LOOP;

    -- ═══════════════════════════════════════════
    -- STEP 6: Bulk insert vendors (RFQ only)
    -- ═══════════════════════════════════════════
    IF v_record_type = 'rfq' THEN
        v_vendors := COALESCE(p_payload->'vendors', '[]'::JSONB);

        FOR v_vendor IN SELECT * FROM jsonb_array_elements(v_vendors)
        LOOP
            INSERT INTO t_contract_vendors (
                contract_id,
                tenant_id,
                vendor_id,
                vendor_name,
                vendor_company,
                vendor_email,
                response_status
            )
            VALUES (
                v_contract_id,
                v_tenant_id,
                (v_vendor->>'vendor_id')::UUID,
                v_vendor->>'vendor_name',
                v_vendor->>'vendor_company',
                v_vendor->>'vendor_email',
                'pending'
            );
        END LOOP;
    END IF;

    -- ═══════════════════════════════════════════
    -- STEP 7: Audit trail — history entry
    -- ═══════════════════════════════════════════
    INSERT INTO t_contract_history (
        contract_id,
        tenant_id,
        action,
        from_status,
        to_status,
        changes,
        performed_by_type,
        performed_by_id,
        performed_by_name,
        note
    )
    VALUES (
        v_contract_id,
        v_tenant_id,
        'created',
        NULL,
        v_initial_status,
        jsonb_build_object(
            'record_type', v_record_type,
            'contract_type', v_contract_type,
            'blocks_count', jsonb_array_length(v_blocks),
            'vendors_count', CASE WHEN v_record_type = 'rfq'
                THEN jsonb_array_length(COALESCE(p_payload->'vendors', '[]'::JSONB))
                ELSE 0
            END
        ),
        COALESCE(p_payload->>'performed_by_type', 'user'),
        v_created_by,
        p_payload->>'performed_by_name',
        CASE v_record_type
            WHEN 'rfq' THEN 'RFQ created'
            ELSE 'Contract created'
        END
    );

    -- ═══════════════════════════════════════════
    -- STEP 7.5: Insert contract access row (CNAK grant)
    --   Grants the counterparty (buyer) access via CNAK
    --   Generates a secret_code for public link validation
    -- ═══════════════════════════════════════════
    v_access_secret := replace(gen_random_uuid()::text, '-', '');

    IF (p_payload->>'buyer_id') IS NOT NULL THEN
        INSERT INTO t_contract_access (
            contract_id,
            global_access_id,
            secret_code,
            tenant_id,
            creator_tenant_id,
            accessor_tenant_id,
            accessor_role,
            accessor_contact_id,
            accessor_email,
            accessor_name,
            status,
            is_active,
            created_by
        )
        VALUES (
            v_contract_id,
            v_cnak,
            v_access_secret,
            v_tenant_id,
            v_tenant_id,
            NULL,
            COALESCE(v_contract_type, 'client'),
            (p_payload->>'buyer_id')::UUID,
            p_payload->>'buyer_email',
            p_payload->>'buyer_name',
            'pending',
            true,
            v_created_by
        );
    END IF;

    -- ═══════════════════════════════════════════
    -- STEP 7.6: Auto-generate invoices (auto-accept only)
    --   When acceptance_method = 'auto', contract starts as 'active'
    --   so invoices are generated immediately at creation time.
    -- ═══════════════════════════════════════════
    IF v_initial_status = 'active' AND v_record_type = 'contract' THEN
        PERFORM generate_contract_invoices(v_contract_id, v_tenant_id, v_created_by);
    END IF;

    -- ═══════════════════════════════════════════
    -- STEP 8: Fetch the created contract for response
    -- ═══════════════════════════════════════════
    SELECT * INTO v_contract
    FROM t_contracts
    WHERE id = v_contract_id;

    -- ═══════════════════════════════════════════
    -- STEP 9: Build success response
    -- ═══════════════════════════════════════════
    DECLARE
        v_response JSONB;
    BEGIN
        v_response := jsonb_build_object(
            'success', true,
            'data', jsonb_build_object(
                'id', v_contract.id,
                'tenant_id', v_contract.tenant_id,
                'contract_number', v_contract.contract_number,
                'rfq_number', v_contract.rfq_number,
                'record_type', v_contract.record_type,
                'contract_type', v_contract.contract_type,
                'name', v_contract.name,
                'status', v_contract.status,
                'acceptance_method', v_contract.acceptance_method,
                'buyer_name', v_contract.buyer_name,
                'buyer_email', v_contract.buyer_email,
                'total_value', v_contract.total_value,
                'tax_total', v_contract.tax_total,
                'grand_total', v_contract.grand_total,
                'tax_breakdown', COALESCE(v_contract.tax_breakdown, '[]'::JSONB),
                'currency', v_contract.currency,
                'global_access_id', v_contract.global_access_id,
                'access_secret', v_access_secret,
                'evidence_policy_type', v_contract.evidence_policy_type,
                'evidence_selected_forms', COALESCE(v_contract.evidence_selected_forms, '[]'::JSONB),
                'version', v_contract.version,
                'created_at', v_contract.created_at
            ),
            'created_at', NOW()
        );

        -- Store idempotency (if key provided)
        IF p_idempotency_key IS NOT NULL THEN
            PERFORM store_idempotency(
                p_idempotency_key,
                v_tenant_id,
                'create_contract_transaction',
                'POST',
                NULL,
                200,
                v_response,
                24
            );
        END IF;

        RETURN v_response;
    END;

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false,
        'error', 'Failed to create contract',
        'details', SQLERRM,
        'error_code', SQLSTATE
    );
END;
$$;

GRANT EXECUTE ON FUNCTION create_contract_transaction(JSONB, VARCHAR) TO authenticated;
GRANT EXECUTE ON FUNCTION create_contract_transaction(JSONB, VARCHAR) TO service_role;


-- ─────────────────────────────────────────────────────────────
-- STEP 3: Update get_contract_by_id to return evidence fields
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_contract_by_id(
    p_contract_id UUID,
    p_tenant_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_contract RECORD;
    v_blocks JSONB;
    v_vendors JSONB;
    v_attachments JSONB;
    v_history JSONB;
BEGIN
    -- ═══════════════════════════════════════════
    -- STEP 0: Input validation
    -- ═══════════════════════════════════════════
    IF p_contract_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'contract_id is required'
        );
    END IF;

    IF p_tenant_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'tenant_id is required'
        );
    END IF;

    -- ═══════════════════════════════════════════
    -- STEP 1: Fetch contract
    -- ═══════════════════════════════════════════
    SELECT * INTO v_contract
    FROM t_contracts
    WHERE id = p_contract_id
      AND tenant_id = p_tenant_id
      AND is_active = true;

    IF v_contract IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Contract not found',
            'contract_id', p_contract_id
        );
    END IF;

    -- ═══════════════════════════════════════════
    -- STEP 2: Fetch blocks (ordered by position)
    -- ═══════════════════════════════════════════
    SELECT COALESCE(
        jsonb_agg(
            jsonb_build_object(
                'id', cb.id,
                'position', cb.position,
                'source_type', cb.source_type,
                'source_block_id', cb.source_block_id,
                'block_name', cb.block_name,
                'block_description', cb.block_description,
                'category_id', cb.category_id,
                'category_name', cb.category_name,
                'unit_price', cb.unit_price,
                'quantity', cb.quantity,
                'billing_cycle', cb.billing_cycle,
                'total_price', cb.total_price,
                'flyby_type', cb.flyby_type,
                'custom_fields', cb.custom_fields,
                'created_at', cb.created_at
            )
            ORDER BY cb.position ASC
        ),
        '[]'::JSONB
    )
    INTO v_blocks
    FROM t_contract_blocks cb
    WHERE cb.contract_id = p_contract_id;

    -- ═══════════════════════════════════════════
    -- STEP 3: Fetch vendors (RFQ only)
    -- ═══════════════════════════════════════════
    SELECT COALESCE(
        jsonb_agg(
            jsonb_build_object(
                'id', cv.id,
                'vendor_id', cv.vendor_id,
                'vendor_name', cv.vendor_name,
                'vendor_company', cv.vendor_company,
                'vendor_email', cv.vendor_email,
                'response_status', cv.response_status,
                'responded_at', cv.responded_at,
                'quoted_amount', cv.quoted_amount,
                'quote_notes', cv.quote_notes,
                'created_at', cv.created_at
            )
        ),
        '[]'::JSONB
    )
    INTO v_vendors
    FROM t_contract_vendors cv
    WHERE cv.contract_id = p_contract_id;

    -- ═══════════════════════════════════════════
    -- STEP 4: Fetch attachments
    -- ═══════════════════════════════════════════
    SELECT COALESCE(
        jsonb_agg(
            jsonb_build_object(
                'id', ca.id,
                'block_id', ca.block_id,
                'file_name', ca.file_name,
                'file_path', ca.file_path,
                'file_size', ca.file_size,
                'file_type', ca.file_type,
                'mime_type', ca.mime_type,
                'download_url', ca.download_url,
                'file_category', ca.file_category,
                'metadata', ca.metadata,
                'uploaded_by', ca.uploaded_by,
                'created_at', ca.created_at
            )
        ),
        '[]'::JSONB
    )
    INTO v_attachments
    FROM t_contract_attachments ca
    WHERE ca.contract_id = p_contract_id;

    -- ═══════════════════════════════════════════
    -- STEP 5: Fetch recent history (last 20 entries)
    -- ═══════════════════════════════════════════
    SELECT COALESCE(
        jsonb_agg(
            jsonb_build_object(
                'id', ch.id,
                'action', ch.action,
                'from_status', ch.from_status,
                'to_status', ch.to_status,
                'changes', ch.changes,
                'performed_by_type', ch.performed_by_type,
                'performed_by_name', ch.performed_by_name,
                'note', ch.note,
                'created_at', ch.created_at
            )
            ORDER BY ch.created_at DESC
        ),
        '[]'::JSONB
    )
    INTO v_history
    FROM (
        SELECT *
        FROM t_contract_history
        WHERE contract_id = p_contract_id
        ORDER BY created_at DESC
        LIMIT 20
    ) ch;

    -- ═══════════════════════════════════════════
    -- STEP 6: Return full contract with embedded data
    -- ═══════════════════════════════════════════
    RETURN jsonb_build_object(
        'success', true,
        'data', jsonb_build_object(
            'id', v_contract.id,
            'tenant_id', v_contract.tenant_id,
            'contract_number', v_contract.contract_number,
            'rfq_number', v_contract.rfq_number,
            'record_type', v_contract.record_type,
            'contract_type', v_contract.contract_type,
            'path', v_contract.path,
            'template_id', v_contract.template_id,
            'name', v_contract.name,
            'description', v_contract.description,
            'status', v_contract.status,

            -- Counterparty
            'buyer_id', v_contract.buyer_id,
            'buyer_name', v_contract.buyer_name,
            'buyer_company', v_contract.buyer_company,
            'buyer_email', v_contract.buyer_email,
            'buyer_phone', v_contract.buyer_phone,
            'buyer_contact_person_id', v_contract.buyer_contact_person_id,
            'buyer_contact_person_name', v_contract.buyer_contact_person_name,

            -- CNAK
            'global_access_id', v_contract.global_access_id,

            -- Acceptance & Duration
            'acceptance_method', v_contract.acceptance_method,
            'duration_value', v_contract.duration_value,
            'duration_unit', v_contract.duration_unit,
            'grace_period_value', v_contract.grace_period_value,
            'grace_period_unit', v_contract.grace_period_unit,

            -- Billing
            'currency', v_contract.currency,
            'billing_cycle_type', v_contract.billing_cycle_type,
            'payment_mode', v_contract.payment_mode,
            'emi_months', v_contract.emi_months,
            'per_block_payment_type', v_contract.per_block_payment_type,

            -- Financials
            'total_value', v_contract.total_value,
            'tax_total', v_contract.tax_total,
            'grand_total', v_contract.grand_total,
            'selected_tax_rate_ids', v_contract.selected_tax_rate_ids,
            'tax_breakdown', COALESCE(v_contract.tax_breakdown, '[]'::JSONB),

            -- Evidence Policy
            'evidence_policy_type', COALESCE(v_contract.evidence_policy_type, 'none'),
            'evidence_selected_forms', COALESCE(v_contract.evidence_selected_forms, '[]'::JSONB),

            -- Dates
            'sent_at', v_contract.sent_at,
            'accepted_at', v_contract.accepted_at,
            'completed_at', v_contract.completed_at,

            -- Version & Audit
            'version', v_contract.version,
            'is_live', v_contract.is_live,
            'created_by', v_contract.created_by,
            'updated_by', v_contract.updated_by,
            'created_at', v_contract.created_at,
            'updated_at', v_contract.updated_at,

            -- Embedded relations
            'blocks', v_blocks,
            'vendors', v_vendors,
            'attachments', v_attachments,
            'history', v_history,

            -- Computed counts
            'blocks_count', jsonb_array_length(v_blocks),
            'vendors_count', jsonb_array_length(v_vendors),
            'attachments_count', jsonb_array_length(v_attachments)
        ),
        'retrieved_at', NOW()
    );

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false,
        'error', 'Failed to fetch contract',
        'details', SQLERRM,
        'error_code', SQLSTATE
    );
END;
$$;

GRANT EXECUTE ON FUNCTION get_contract_by_id(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_contract_by_id(UUID, UUID) TO service_role;
