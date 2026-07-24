-- ============================================================================
-- 072_persist_evidence_policy_on_create.sql
-- ============================================================================
-- Purpose: Fix create_contract_transaction silently dropping the wizard's
-- Evidence Policy step selections on contract CREATION.
--
-- update_contract_transaction already persists evidence_policy_type and
-- evidence_selected_forms (added by an earlier migration for the edit
-- path). create_contract_transaction's INSERT never referenced either
-- column, so a contract created via the wizard's auto-accept / VaNi
-- initial-create flow always started with the column defaults
-- ('none' / '[]') regardless of what the user selected in the wizard --
-- the selection only "stuck" if the contract was later edited and saved
-- via update_contract_transaction.
--
-- This migration re-applies create_contract_transaction unchanged except
-- for adding evidence_policy_type / evidence_selected_forms to the
-- INSERT column list and VALUES, mirroring the update path's handling
-- (COALESCE to the same column defaults: 'none' and '[]'::JSONB).
-- ============================================================================

CREATE OR REPLACE FUNCTION public.create_contract_transaction(p_payload jsonb, p_idempotency_key character varying DEFAULT NULL::character varying)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_tenant_id UUID;
    v_record_type VARCHAR(10);
    v_contract_type VARCHAR(20);
    v_is_live BOOLEAN;
    v_created_by UUID;
    v_seq_result JSONB;
    v_contract_number VARCHAR(30);
    v_rfq_number VARCHAR(30);
    v_acceptance_method VARCHAR(20);
    v_initial_status VARCHAR(30);
    v_nomenclature_id UUID;
    v_nomenclature_code TEXT;
    v_nomenclature_name TEXT;
    v_contract_id UUID;
    v_contract RECORD;
    v_blocks JSONB;
    v_vendors JSONB;
    v_block JSONB;
    v_vendor JSONB;
    v_block_id UUID;
    v_cnak VARCHAR(12);
    v_access_secret VARCHAR(32);
    v_idempotency RECORD;
BEGIN
    v_tenant_id := (p_payload->>'tenant_id')::UUID;
    v_record_type := COALESCE(p_payload->>'record_type', 'contract');
    v_contract_type := COALESCE(p_payload->>'contract_type', 'client');
    v_is_live := COALESCE((p_payload->>'is_live')::BOOLEAN, true);
    v_created_by := (p_payload->>'created_by')::UUID;

    IF v_tenant_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'tenant_id is required');
    END IF;

    IF p_payload->>'name' IS NULL OR TRIM(p_payload->>'name') = '' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Contract name is required');
    END IF;

    -- STEP 1: Idempotency check
    IF p_idempotency_key IS NOT NULL THEN
        SELECT * INTO v_idempotency
        FROM check_idempotency(p_idempotency_key, v_tenant_id, 'create_contract_transaction');
        IF v_idempotency.found THEN
            RETURN v_idempotency.response_body;
        END IF;
    END IF;

    -- STEP 2: Generate contract number
    IF v_record_type = 'rfq' THEN
        v_seq_result := get_next_formatted_sequence('PROJECT', v_tenant_id, v_is_live);
        v_rfq_number := v_seq_result->>'formatted';
    ELSE
        v_seq_result := get_next_formatted_sequence('CONTRACT', v_tenant_id, v_is_live);
        v_contract_number := v_seq_result->>'formatted';
    END IF;

    -- STEP 2.5: Resolve acceptance method + initial status
    v_acceptance_method := COALESCE(p_payload->>'acceptance_method', 'manual');
    IF v_acceptance_method = 'auto' AND v_record_type = 'contract' THEN
        v_initial_status := 'active';
    ELSIF v_record_type = 'rfq' THEN
        v_initial_status := 'draft';
    ELSE
        v_initial_status := 'draft';
    END IF;

    -- ═══════════════════════════════════════════
    -- STEP 2.6: Nomenclature denormalization
    -- FIXED: uses m_category_details + m_category_master (actual tables)
    -- instead of non-existent t_nomenclatures
    -- ═══════════════════════════════════════════
    IF (p_payload->>'nomenclature_id') IS NOT NULL THEN
        v_nomenclature_id := (p_payload->>'nomenclature_id')::UUID;

        SELECT cd.sub_cat_name, cd.display_name
        INTO v_nomenclature_code, v_nomenclature_name
        FROM m_category_details cd
        JOIN m_category_master cm ON cd.category_id = cm.id
        WHERE cd.id = v_nomenclature_id
          AND cm.category_name = 'cat_contract_nomenclature';

        IF v_nomenclature_code IS NULL THEN
            v_nomenclature_id := NULL;
        END IF;
    END IF;

    -- STEP 3: Generate CNAK (only for non-draft)
    IF v_initial_status != 'draft' THEN
        v_access_secret := md5(random()::text || clock_timestamp()::text);
        FOR i IN 1..10 LOOP
            v_cnak := 'CNAK-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));
            IF NOT EXISTS (
                SELECT 1 FROM t_contracts
                WHERE tenant_id = v_tenant_id AND global_access_id = v_cnak
            ) THEN
                EXIT;
            END IF;
        END LOOP;
    ELSE
        v_cnak := NULL;
        v_access_secret := NULL;
    END IF;

    -- STEP 4: Insert contract
    INSERT INTO t_contracts (
        tenant_id, seller_id, contract_number, rfq_number,
        record_type, contract_type, path, template_id,
        name, description, status,
        buyer_id, buyer_name, buyer_company, buyer_email, buyer_phone,
        buyer_contact_person_id, buyer_contact_person_name,
        acceptance_method, start_date,
        duration_value, duration_unit,
        grace_period_value, grace_period_unit,
        currency, billing_cycle_type, payment_mode, emi_months,
        per_block_payment_type,
        total_value, tax_total, grand_total,
        discount_type, discount_value, discount_total,
        selected_tax_rate_ids, tax_breakdown, computed_events,
        nomenclature_id, nomenclature_code, nomenclature_name,
        equipment_details, allow_buyer_to_add_equipment,
        coverage_types, evidence_policy_type, evidence_selected_forms, metadata,
        global_access_id, version, is_live, is_active,
        created_by, updated_by
    )
    VALUES (
        v_tenant_id, v_tenant_id,
        v_contract_number, v_rfq_number,
        v_record_type, v_contract_type,
        p_payload->>'path', (p_payload->>'template_id')::UUID,
        TRIM(p_payload->>'name'), p_payload->>'description',
        v_initial_status,
        (p_payload->>'buyer_id')::UUID, p_payload->>'buyer_name',
        p_payload->>'buyer_company', p_payload->>'buyer_email', p_payload->>'buyer_phone',
        (p_payload->>'buyer_contact_person_id')::UUID, p_payload->>'buyer_contact_person_name',
        v_acceptance_method,
        COALESCE((p_payload->>'start_date')::TIMESTAMPTZ, NOW()),
        (p_payload->>'duration_value')::INTEGER, p_payload->>'duration_unit',
        COALESCE((p_payload->>'grace_period_value')::INTEGER, 0), p_payload->>'grace_period_unit',
        COALESCE(p_payload->>'currency', 'INR'),
        p_payload->>'billing_cycle_type', p_payload->>'payment_mode',
        (p_payload->>'emi_months')::INTEGER, p_payload->>'per_block_payment_type',
        COALESCE((p_payload->>'total_value')::NUMERIC, 0),
        COALESCE((p_payload->>'tax_total')::NUMERIC, 0),
        COALESCE((p_payload->>'grand_total')::NUMERIC, 0),
        p_payload->>'discount_type',
        (p_payload->>'discount_value')::NUMERIC,
        (p_payload->>'discount_total')::NUMERIC,
        COALESCE(p_payload->'selected_tax_rate_ids', '[]'::JSONB),
        COALESCE(p_payload->'tax_breakdown', '[]'::JSONB),
        p_payload->'computed_events',
        v_nomenclature_id, v_nomenclature_code, v_nomenclature_name,
        COALESCE(p_payload->'equipment_details', '[]'::JSONB),
        COALESCE((p_payload->>'allow_buyer_to_add_equipment')::BOOLEAN, false),
        COALESCE(p_payload->'coverage_types', '[]'::JSONB),
        COALESCE(p_payload->>'evidence_policy_type', 'none'),
        COALESCE(p_payload->'evidence_selected_forms', '[]'::JSONB),
        COALESCE(p_payload->'metadata', '{}'::JSONB),
        v_cnak, 1, v_is_live, true,
        v_created_by, v_created_by
    )
    RETURNING id INTO v_contract_id;

    -- STEP 5: Bulk insert blocks
    v_blocks := COALESCE(p_payload->'blocks', '[]'::JSONB);
    FOR v_block IN SELECT * FROM jsonb_array_elements(v_blocks)
    LOOP
        INSERT INTO t_contract_blocks (
            contract_id, tenant_id, position,
            source_type, source_block_id,
            block_name, block_description,
            category_id, category_name,
            unit_price, quantity, billing_cycle, total_price,
            flyby_type, custom_fields
        )
        VALUES (
            v_contract_id, v_tenant_id,
            COALESCE((v_block->>'position')::INTEGER, 0),
            COALESCE(v_block->>'source_type', 'flyby'),
            (v_block->>'source_block_id')::UUID,
            COALESCE(v_block->>'block_name', 'Untitled Block'),
            v_block->>'block_description',
            v_block->>'category_id', v_block->>'category_name',
            (v_block->>'unit_price')::NUMERIC,
            (v_block->>'quantity')::INTEGER,
            v_block->>'billing_cycle',
            (v_block->>'total_price')::NUMERIC,
            v_block->>'flyby_type',
            COALESCE(v_block->'custom_fields', '{}'::JSONB)
        );
    END LOOP;

    -- STEP 6: Bulk insert vendors (RFQ only)
    IF v_record_type = 'rfq' THEN
        v_vendors := COALESCE(p_payload->'vendors', '[]'::JSONB);
        FOR v_vendor IN SELECT * FROM jsonb_array_elements(v_vendors)
        LOOP
            INSERT INTO t_contract_vendors (
                contract_id, tenant_id,
                vendor_id, vendor_name, vendor_company, vendor_email,
                response_status
            )
            VALUES (
                v_contract_id, v_tenant_id,
                (v_vendor->>'vendor_id')::UUID,
                v_vendor->>'vendor_name', v_vendor->>'vendor_company',
                v_vendor->>'vendor_email', 'pending'
            );
        END LOOP;
    END IF;

    -- STEP 7: Create history entry
    INSERT INTO t_contract_history (
        contract_id, tenant_id,
        action, from_status, to_status,
        performed_by_type, performed_by_id, performed_by_name, note
    )
    VALUES (
        v_contract_id, v_tenant_id,
        'created', NULL, v_initial_status,
        COALESCE(p_payload->>'performed_by_type', 'user'),
        v_created_by, p_payload->>'performed_by_name',
        COALESCE(p_payload->>'note', v_record_type || ' created')
    );

    -- STEP 7.5: Create contract_access row (only for non-draft)
    IF v_cnak IS NOT NULL AND (p_payload->>'buyer_id') IS NOT NULL THEN
        INSERT INTO t_contract_access (
            contract_id, global_access_id, secret_code,
            tenant_id, creator_tenant_id, accessor_tenant_id,
            accessor_role, accessor_contact_id,
            accessor_email, accessor_name,
            status, is_active, created_by
        )
        VALUES (
            v_contract_id, v_cnak, v_access_secret,
            v_tenant_id, v_tenant_id, NULL,
            COALESCE(v_contract_type, 'client'),
            (p_payload->>'buyer_id')::UUID,
            p_payload->>'buyer_email', p_payload->>'buyer_name',
            'pending', true, v_created_by
        );
    END IF;

    -- STEP 7.6: Auto-generate invoices (auto-accept only)
    IF v_initial_status = 'active' AND v_record_type = 'contract' THEN
        PERFORM generate_contract_invoices(v_contract_id, v_tenant_id, v_created_by);
    END IF;

    -- STEP 7.7: Auto-create events (auto-accept only)
    IF v_initial_status = 'active' AND v_record_type = 'contract' THEN
        PERFORM process_contract_events_from_computed(v_contract_id, v_tenant_id);
    END IF;

    -- STEP 8: Fetch the created contract for response
    SELECT * INTO v_contract FROM t_contracts WHERE id = v_contract_id;

    -- STEP 9: Build success response
    DECLARE
        v_response JSONB;
    BEGIN
        v_response := jsonb_build_object(
            'success', true,
            'data', jsonb_build_object(
                'id', v_contract.id,
                'tenant_id', v_contract.tenant_id,
                'seller_id', v_contract.seller_id,
                'buyer_tenant_id', v_contract.buyer_tenant_id,
                'contract_number', v_contract.contract_number,
                'rfq_number', v_contract.rfq_number,
                'record_type', v_contract.record_type,
                'contract_type', v_contract.contract_type,
                'name', v_contract.name,
                'status', v_contract.status,
                'acceptance_method', v_contract.acceptance_method,
                'start_date', v_contract.start_date,
                'buyer_name', v_contract.buyer_name,
                'buyer_email', v_contract.buyer_email,
                'total_value', v_contract.total_value,
                'tax_total', v_contract.tax_total,
                'grand_total', v_contract.grand_total,
                'discount_type', v_contract.discount_type,
                'discount_value', v_contract.discount_value,
                'discount_total', v_contract.discount_total,
                'tax_breakdown', COALESCE(v_contract.tax_breakdown, '[]'::JSONB),
                'currency', v_contract.currency,
                'global_access_id', v_contract.global_access_id,
                'access_secret', v_access_secret,
                'nomenclature_id', v_contract.nomenclature_id,
                'nomenclature_code', v_contract.nomenclature_code,
                'nomenclature_name', v_contract.nomenclature_name,
                'equipment_details', COALESCE(v_contract.equipment_details, '[]'::JSONB),
                'allow_buyer_to_add_equipment', v_contract.allow_buyer_to_add_equipment,
                'coverage_types', COALESCE(v_contract.coverage_types, '[]'::JSONB),
                'metadata', COALESCE(v_contract.metadata, '{}'::JSONB),
                'version', v_contract.version,
                'created_at', v_contract.created_at
            ),
            'created_at', NOW()
        );

        IF p_idempotency_key IS NOT NULL THEN
            PERFORM store_idempotency(
                p_idempotency_key, v_tenant_id,
                'create_contract_transaction', 'POST', NULL,
                200, v_response, 24
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
$function$
