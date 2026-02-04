-- ═══════════════════════════════════════════════════════════════════
-- Migration 012: Add per-block tax columns to t_contract_blocks
-- Enables storing tax_inclusive flag, tax_rate, tax_amount,
-- hsn_sac_code, and a JSONB tax_breakdown per line item.
-- Also updates create_contract_transaction RPC to accept these fields.
-- ═══════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────
-- STEP 1: Add columns to t_contract_blocks
-- ─────────────────────────────────────────────────
ALTER TABLE t_contract_blocks
  ADD COLUMN IF NOT EXISTS tax_inclusive  BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS tax_rate       NUMERIC(8, 4) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tax_amount     NUMERIC(14, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS hsn_sac_code   VARCHAR(20) DEFAULT '',
  ADD COLUMN IF NOT EXISTS tax_breakdown  JSONB DEFAULT '[]'::JSONB;

-- tax_breakdown stores per-block snapshot:
-- [
--   { "tax_id": "uuid", "name": "CGST", "rate": 9, "amount": 450.00 },
--   { "tax_id": "uuid", "name": "SGST", "rate": 9, "amount": 450.00 }
-- ]

COMMENT ON COLUMN t_contract_blocks.tax_inclusive IS 'Whether unit_price already includes tax';
COMMENT ON COLUMN t_contract_blocks.tax_rate IS 'Combined tax rate percentage (e.g. 18.00)';
COMMENT ON COLUMN t_contract_blocks.tax_amount IS 'Computed tax amount for this line item';
COMMENT ON COLUMN t_contract_blocks.hsn_sac_code IS 'HSN/SAC code for compliance';
COMMENT ON COLUMN t_contract_blocks.tax_breakdown IS 'Point-in-time snapshot of individual tax components';

-- ─────────────────────────────────────────────────
-- STEP 2: Update create_contract_transaction RPC
-- to read the new per-block tax fields from payload
-- ─────────────────────────────────────────────────
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
    v_tenant_id    UUID;
    v_created_by   UUID;
    v_record_type  VARCHAR;
    v_contract_id  UUID;
    v_cnak         VARCHAR;
    v_is_live      BOOLEAN;
    v_blocks       JSONB;
    v_block        JSONB;
    v_vendors      JSONB;
    v_vendor       JSONB;
    v_existing     JSONB;
BEGIN
    -- ═══════════════════════════════════════════
    -- STEP 1: Extract auth context
    -- ═══════════════════════════════════════════
    v_tenant_id := auth.jwt()->>'tenant_id';
    v_created_by := auth.uid();

    IF v_tenant_id IS NULL THEN
        RAISE EXCEPTION 'Missing tenant_id in JWT';
    END IF;

    -- ═══════════════════════════════════════════
    -- STEP 2: Idempotency check
    -- ═══════════════════════════════════════════
    IF p_idempotency_key IS NOT NULL THEN
        SELECT jsonb_build_object('id', id, 'contract_number', contract_number, 'status', status)
        INTO v_existing
        FROM t_contracts
        WHERE tenant_id = v_tenant_id
          AND metadata->>'idempotency_key' = p_idempotency_key
        LIMIT 1;

        IF v_existing IS NOT NULL THEN
            RETURN v_existing;
        END IF;
    END IF;

    -- ═══════════════════════════════════════════
    -- STEP 3: Generate CNAK
    -- ═══════════════════════════════════════════
    v_cnak := 'CNAK-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT || CLOCK_TIMESTAMP()::TEXT) FROM 1 FOR 8));
    v_record_type := COALESCE(p_payload->>'record_type', 'contract');
    v_is_live := COALESCE((p_payload->>'is_live')::BOOLEAN, true);

    -- ═══════════════════════════════════════════
    -- STEP 4: Insert contract
    -- ═══════════════════════════════════════════
    INSERT INTO t_contracts (
        tenant_id,
        record_type,
        name,
        title,
        description,
        status,
        acceptance_method,
        path,
        template_id,
        buyer_id,
        contact_id,
        contact_classification,
        buyer_name,
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
        version,
        is_live,
        visible,
        created_by,
        updated_by
    )
    VALUES (
        v_tenant_id,
        v_record_type,
        COALESCE(p_payload->>'name', 'Untitled'),
        COALESCE(p_payload->>'title', p_payload->>'name', 'Untitled'),
        p_payload->>'description',
        'draft',
        p_payload->>'acceptance_method',
        p_payload->>'path',
        (p_payload->>'template_id')::UUID,
        (p_payload->>'buyer_id')::UUID,
        (p_payload->>'contact_id')::UUID,
        p_payload->>'contact_classification',
        p_payload->>'buyer_name',
        (p_payload->>'duration_value')::INTEGER,
        p_payload->>'duration_unit',
        (p_payload->>'grace_period_value')::INTEGER,
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
        1,
        v_is_live,
        true,
        v_created_by,
        v_created_by
    )
    RETURNING id INTO v_contract_id;

    -- ═══════════════════════════════════════════
    -- STEP 5: Bulk insert blocks (with per-block tax)
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
            custom_fields,
            -- Per-block tax fields
            tax_inclusive,
            tax_rate,
            tax_amount,
            hsn_sac_code,
            tax_breakdown
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
            COALESCE(v_block->'custom_fields', '{}'::JSONB),
            -- Per-block tax values
            COALESCE((v_block->>'tax_inclusive')::BOOLEAN, false),
            COALESCE((v_block->>'tax_rate')::NUMERIC, 0),
            COALESCE((v_block->>'tax_amount')::NUMERIC, 0),
            COALESCE(v_block->>'hsn_sac_code', ''),
            COALESCE(v_block->'tax_breakdown', '[]'::JSONB)
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
    -- STEP 7: Store idempotency key
    -- ═══════════════════════════════════════════
    IF p_idempotency_key IS NOT NULL THEN
        UPDATE t_contracts
        SET metadata = COALESCE(metadata, '{}'::JSONB) || jsonb_build_object('idempotency_key', p_idempotency_key)
        WHERE id = v_contract_id;
    END IF;

    -- ═══════════════════════════════════════════
    -- STEP 8: Return result
    -- ═══════════════════════════════════════════
    RETURN (
        SELECT jsonb_build_object(
            'id', c.id,
            'tenant_id', c.tenant_id,
            'record_type', c.record_type,
            'contract_number', c.contract_number,
            'name', c.name,
            'title', c.title,
            'status', c.status,
            'global_access_id', c.global_access_id,
            'currency', c.currency,
            'total_value', c.total_value,
            'tax_total', c.tax_total,
            'grand_total', c.grand_total,
            'buyer_name', c.buyer_name,
            'buyer_email', c.buyer_email,
            'created_at', c.created_at
        )
        FROM t_contracts c
        WHERE c.id = v_contract_id
    );
END;
$$;
