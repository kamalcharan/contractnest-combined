-- ═══════════════════════════════════════════════════════════════════════════════
-- FIX V2: get_contract_by_id - Minimal change from original
-- This keeps the original logic intact and only adds accessor support as fallback
-- FIX: Split jsonb_build_object to avoid >100 arguments limit
-- ═══════════════════════════════════════════════════════════════════════════════

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
    v_access RECORD;
    v_is_accessor BOOLEAN := false;
    v_effective_contract_type VARCHAR(20);
    v_blocks JSONB;
    v_vendors JSONB;
    v_attachments JSONB;
    v_history JSONB;
    v_result_data JSONB;
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
    -- STEP 1: Try to fetch as OWNED contract first
    -- ═══════════════════════════════════════════
    SELECT * INTO v_contract
    FROM t_contracts
    WHERE id = p_contract_id
      AND tenant_id = p_tenant_id
      AND is_active = true;

    -- ═══════════════════════════════════════════
    -- STEP 2: If not owned, check if ACCESSED via t_contract_access
    -- ═══════════════════════════════════════════
    IF v_contract.id IS NULL THEN
        SELECT ca.* INTO v_access
        FROM t_contract_access ca
        WHERE ca.contract_id = p_contract_id
          AND ca.accessor_tenant_id = p_tenant_id
          AND ca.status = 'accepted'
          AND ca.is_active = true;

        IF v_access.id IS NOT NULL THEN
            SELECT * INTO v_contract
            FROM t_contracts
            WHERE id = p_contract_id
              AND is_active = true;

            IF v_contract.id IS NOT NULL THEN
                v_is_accessor := true;
            END IF;
        END IF;
    END IF;

    -- ═══════════════════════════════════════════
    -- STEP 3: Return error if still not found
    -- ═══════════════════════════════════════════
    IF v_contract.id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Contract not found',
            'contract_id', p_contract_id
        );
    END IF;

    -- ═══════════════════════════════════════════
    -- STEP 4: Determine effective contract_type
    -- ═══════════════════════════════════════════
    IF v_is_accessor THEN
        v_effective_contract_type := CASE v_contract.contract_type
            WHEN 'client' THEN 'vendor'
            WHEN 'vendor' THEN 'client'
            ELSE v_contract.contract_type
        END;
    ELSE
        v_effective_contract_type := v_contract.contract_type;
    END IF;

    -- ═══════════════════════════════════════════
    -- STEP 5: Fetch blocks
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
    -- STEP 6: Fetch vendors
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
    -- STEP 7: Fetch attachments
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
    -- STEP 8: Fetch history
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
    -- STEP 9: Build result using concatenation (avoids 100 arg limit)
    -- ═══════════════════════════════════════════

    -- Core fields
    v_result_data := jsonb_build_object(
        'id', v_contract.id,
        'tenant_id', v_contract.tenant_id,
        'contract_number', v_contract.contract_number,
        'rfq_number', v_contract.rfq_number,
        'record_type', v_contract.record_type,
        'contract_type', v_effective_contract_type,
        'path', v_contract.path,
        'template_id', v_contract.template_id,
        'name', v_contract.name,
        'description', v_contract.description,
        'status', v_contract.status
    );

    -- Buyer fields
    v_result_data := v_result_data || jsonb_build_object(
        'buyer_id', v_contract.buyer_id,
        'buyer_name', v_contract.buyer_name,
        'buyer_company', v_contract.buyer_company,
        'buyer_email', v_contract.buyer_email,
        'buyer_phone', v_contract.buyer_phone,
        'buyer_contact_person_id', v_contract.buyer_contact_person_id,
        'buyer_contact_person_name', v_contract.buyer_contact_person_name,
        'global_access_id', v_contract.global_access_id
    );

    -- Duration & Acceptance fields
    v_result_data := v_result_data || jsonb_build_object(
        'acceptance_method', v_contract.acceptance_method,
        'duration_value', v_contract.duration_value,
        'duration_unit', v_contract.duration_unit,
        'grace_period_value', v_contract.grace_period_value,
        'grace_period_unit', v_contract.grace_period_unit
    );

    -- Billing fields
    v_result_data := v_result_data || jsonb_build_object(
        'currency', v_contract.currency,
        'billing_cycle_type', v_contract.billing_cycle_type,
        'payment_mode', v_contract.payment_mode,
        'emi_months', v_contract.emi_months,
        'per_block_payment_type', v_contract.per_block_payment_type
    );

    -- Financial fields
    v_result_data := v_result_data || jsonb_build_object(
        'total_value', v_contract.total_value,
        'tax_total', v_contract.tax_total,
        'grand_total', v_contract.grand_total,
        'selected_tax_rate_ids', v_contract.selected_tax_rate_ids,
        'tax_breakdown', COALESCE(v_contract.tax_breakdown, '[]'::JSONB)
    );

    -- Date fields
    v_result_data := v_result_data || jsonb_build_object(
        'sent_at', v_contract.sent_at,
        'accepted_at', v_contract.accepted_at,
        'completed_at', v_contract.completed_at
    );

    -- Audit fields
    v_result_data := v_result_data || jsonb_build_object(
        'version', v_contract.version,
        'is_live', v_contract.is_live,
        'created_by', v_contract.created_by,
        'updated_by', v_contract.updated_by,
        'created_at', v_contract.created_at,
        'updated_at', v_contract.updated_at
    );

    -- Access & embedded data
    v_result_data := v_result_data || jsonb_build_object(
        'access_type', CASE WHEN v_is_accessor THEN 'accessor' ELSE 'owner' END,
        'blocks', v_blocks,
        'vendors', v_vendors,
        'attachments', v_attachments,
        'history', v_history,
        'blocks_count', jsonb_array_length(v_blocks),
        'vendors_count', jsonb_array_length(v_vendors),
        'attachments_count', jsonb_array_length(v_attachments)
    );

    -- ═══════════════════════════════════════════
    -- STEP 10: Return result
    -- ═══════════════════════════════════════════
    RETURN jsonb_build_object(
        'success', true,
        'data', v_result_data,
        'retrieved_at', NOW()
    );

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false,
        'error', 'Failed to fetch contract: ' || SQLERRM,
        'error_code', SQLSTATE
    );
END;
$$;

GRANT EXECUTE ON FUNCTION get_contract_by_id(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_contract_by_id(UUID, UUID) TO service_role;


-- ═══════════════════════════════════════════════════════════════════════════════
-- DONE! Deploy this to Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════════════════════
