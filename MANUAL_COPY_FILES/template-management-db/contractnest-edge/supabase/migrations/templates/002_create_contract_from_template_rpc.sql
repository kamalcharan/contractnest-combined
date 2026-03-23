-- =============================================================
-- TEMPLATE MANAGEMENT: Create Contract from Template
-- Migration: templates/002_create_contract_from_template_rpc.sql
-- Function: create_contract_from_template
--
-- Purpose: Fetches a template, merges with user overrides,
--          then delegates to existing create_contract_transaction().
--          ZERO changes to contract creation logic.
--
-- Flow:
--   1. Validate inputs
--   2. Idempotency check
--   3. Fetch template (verify access)
--   4. Build contract payload from template defaults + user overrides
--   5. Delegate to create_contract_transaction()
--   6. Return result (template_id is stored on the contract)
-- =============================================================

CREATE OR REPLACE FUNCTION create_contract_from_template(
    p_template_id UUID,
    p_tenant_id UUID,
    p_overrides JSONB,                          -- user-provided overrides (buyer info, duration, etc.)
    p_idempotency_key VARCHAR DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_template RECORD;
    v_contract_payload JSONB;
    v_template_blocks JSONB;
    v_contract_blocks JSONB := '[]'::JSONB;
    v_block JSONB;
    v_position INTEGER := 0;
    v_is_live BOOLEAN;
    v_created_by UUID;
    v_idempotency RECORD;
    v_result JSONB;
BEGIN
    -- ═══════════════════════════════════════════
    -- STEP 0: Input validation
    -- ═══════════════════════════════════════════
    IF p_template_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'template_id is required'
        );
    END IF;

    IF p_tenant_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'tenant_id is required'
        );
    END IF;

    v_is_live := COALESCE((p_overrides->>'is_live')::BOOLEAN, true);
    v_created_by := (p_overrides->>'created_by')::UUID;

    -- Contract name is required (can come from override or we auto-generate from template)
    IF (p_overrides->>'name') IS NULL OR TRIM(p_overrides->>'name') = '' THEN
        -- Will use template name as fallback below
        NULL;
    END IF;

    -- ═══════════════════════════════════════════
    -- STEP 1: Idempotency check
    -- ═══════════════════════════════════════════
    IF p_idempotency_key IS NOT NULL THEN
        SELECT * INTO v_idempotency
        FROM check_idempotency(
            p_idempotency_key,
            p_tenant_id,
            'create_contract_from_template'
        );

        IF v_idempotency.found THEN
            RETURN v_idempotency.response_body;
        END IF;
    END IF;

    -- ═══════════════════════════════════════════
    -- STEP 2: Fetch template (verify access)
    --   Tenant can use: own templates, system templates, public templates
    -- ═══════════════════════════════════════════
    SELECT * INTO v_template
    FROM m_cat_templates
    WHERE id = p_template_id
      AND is_active = true
      AND (
          tenant_id = p_tenant_id
          OR (tenant_id IS NULL AND is_system = true)
          OR is_public = true
      );

    IF v_template IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Template not found or access denied',
            'template_id', p_template_id
        );
    END IF;

    -- ═══════════════════════════════════════════
    -- STEP 3: Transform template blocks → contract blocks format
    --   Template blocks: [{block_id, section, quantity, price_override, sequence, config_override}]
    --   Contract blocks: [{position, source_type, source_block_id, block_name, unit_price, quantity, ...}]
    -- ═══════════════════════════════════════════
    v_template_blocks := COALESCE(v_template.blocks, '[]'::JSONB);

    FOR v_block IN SELECT * FROM jsonb_array_elements(v_template_blocks)
    LOOP
        v_position := v_position + 1;

        v_contract_blocks := v_contract_blocks || jsonb_build_array(
            jsonb_build_object(
                'position', COALESCE((v_block->>'sequence')::INTEGER, v_position),
                'source_type', 'catalog',
                'source_block_id', v_block->>'block_id',
                'block_name', COALESCE(v_block->>'block_name', v_block->>'name', 'Block ' || v_position),
                'block_description', v_block->>'block_description',
                'category_id', v_block->>'category_id',
                'category_name', v_block->>'category_name',
                'unit_price', COALESCE(v_block->>'price_override', v_block->>'unit_price'),
                'quantity', COALESCE((v_block->>'quantity')::INTEGER, 1),
                'billing_cycle', v_block->>'billing_cycle',
                'total_price', v_block->>'total_price',
                'flyby_type', v_block->>'flyby_type',
                'custom_fields', COALESCE(v_block->'config_override', v_block->'custom_fields', '{}'::JSONB)
            )
        );
    END LOOP;

    -- ═══════════════════════════════════════════
    -- STEP 4: Build contract payload
    --   Template defaults → overridden by user values
    --   p_overrides takes precedence over template defaults
    -- ═══════════════════════════════════════════
    v_contract_payload := jsonb_build_object(
        -- Identity
        'tenant_id', p_tenant_id,
        'is_live', v_is_live,
        'created_by', v_created_by,
        'template_id', p_template_id,

        -- Name: user override > template name
        'name', COALESCE(
            NULLIF(TRIM(p_overrides->>'name'), ''),
            v_template.display_name,
            v_template.name
        ),
        'description', COALESCE(p_overrides->>'description', v_template.description),

        -- Record type (always 'contract' when creating from template)
        'record_type', COALESCE(p_overrides->>'record_type', 'contract'),
        'contract_type', COALESCE(p_overrides->>'contract_type', 'client'),

        -- Pricing defaults from template
        'currency', COALESCE(p_overrides->>'currency', v_template.currency, 'INR'),
        'total_value', COALESCE(
            (p_overrides->>'total_value')::NUMERIC,
            v_template.subtotal,
            0
        ),
        'grand_total', COALESCE(
            (p_overrides->>'grand_total')::NUMERIC,
            v_template.total,
            0
        ),
        'tax_total', COALESCE((p_overrides->>'tax_total')::NUMERIC, 0),

        -- Blocks from template (transformed above)
        'blocks', v_contract_blocks,

        -- Buyer info (always from overrides — template doesn't store buyer)
        'buyer_id', p_overrides->>'buyer_id',
        'buyer_name', p_overrides->>'buyer_name',
        'buyer_company', p_overrides->>'buyer_company',
        'buyer_email', p_overrides->>'buyer_email',
        'buyer_phone', p_overrides->>'buyer_phone',
        'buyer_contact_person_id', p_overrides->>'buyer_contact_person_id',
        'buyer_contact_person_name', p_overrides->>'buyer_contact_person_name',

        -- Duration & Billing (from overrides, template doesn't store these)
        'acceptance_method', COALESCE(p_overrides->>'acceptance_method', 'manual'),
        'duration_value', p_overrides->>'duration_value',
        'duration_unit', p_overrides->>'duration_unit',
        'billing_cycle_type', p_overrides->>'billing_cycle_type',
        'payment_mode', p_overrides->>'payment_mode',
        'emi_months', p_overrides->>'emi_months',
        'per_block_payment_type', p_overrides->>'per_block_payment_type',

        -- Tax
        'selected_tax_rate_ids', COALESCE(p_overrides->'selected_tax_rate_ids', '[]'::JSONB),
        'tax_breakdown', COALESCE(p_overrides->'tax_breakdown', '[]'::JSONB),

        -- Equipment details (from overrides if any)
        'equipment_details', COALESCE(p_overrides->'equipment_details', '[]'::JSONB),

        -- Metadata: store template reference for traceability
        'metadata', jsonb_build_object(
            'created_from_template', true,
            'template_id', p_template_id,
            'template_name', v_template.name,
            'template_version', v_template.version
        ) || COALESCE(p_overrides->'metadata', '{}'::JSONB),

        -- Additional text fields
        'payment_terms', p_overrides->>'payment_terms',
        'renewal_terms', p_overrides->>'renewal_terms',
        'termination_clause', p_overrides->>'termination_clause',
        'notes', p_overrides->>'notes',

        -- Nomenclature
        'nomenclature_id', p_overrides->>'nomenclature_id',

        -- Performer context
        'performed_by_type', COALESCE(p_overrides->>'performed_by_type', 'user'),
        'performed_by_name', p_overrides->>'performed_by_name'
    );

    -- ═══════════════════════════════════════════
    -- STEP 5: Delegate to existing create_contract_transaction
    --   This is the KEY design decision: we reuse the existing
    --   contract creation logic 100%, zero duplication.
    -- ═══════════════════════════════════════════
    v_result := create_contract_transaction(v_contract_payload, p_idempotency_key);

    -- ═══════════════════════════════════════════
    -- STEP 6: Enrich result with template context
    -- ═══════════════════════════════════════════
    IF (v_result->>'success')::BOOLEAN = true THEN
        v_result := jsonb_set(
            v_result,
            '{data,template_context}',
            jsonb_build_object(
                'template_id', p_template_id,
                'template_name', v_template.name,
                'template_version', v_template.version,
                'blocks_from_template', jsonb_array_length(v_template_blocks)
            )
        );
    END IF;

    -- Store idempotency for this wrapper (separate endpoint from create_contract_transaction)
    IF p_idempotency_key IS NOT NULL AND (v_result->>'success')::BOOLEAN = true THEN
        PERFORM store_idempotency(
            p_idempotency_key,
            p_tenant_id,
            'create_contract_from_template',
            'POST',
            NULL,
            200,
            v_result,
            24
        );
    END IF;

    RETURN v_result;

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false,
        'error', 'Failed to create contract from template',
        'details', SQLERRM,
        'error_code', SQLSTATE
    );
END;
$$;

GRANT EXECUTE ON FUNCTION create_contract_from_template(UUID, UUID, JSONB, VARCHAR) TO authenticated;
GRANT EXECUTE ON FUNCTION create_contract_from_template(UUID, UUID, JSONB, VARCHAR) TO service_role;

-- ─────────────────────────────────────────────────────────────
-- Comments
-- ─────────────────────────────────────────────────────────────
COMMENT ON FUNCTION create_contract_from_template IS 'Creates a contract pre-filled from a template. Fetches template blocks and pricing defaults, merges with user overrides, then delegates to create_contract_transaction(). Zero changes to existing contract creation logic.';
