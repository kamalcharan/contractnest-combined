-- ═══════════════════════════════════════════════════════════════════════════════
-- CNAK CLAIM FEATURE - Complete SQL Scripts
-- Run these in Supabase SQL Editor in order
-- ═══════════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════════════
-- PART 1: TABLE ALTERATIONS
-- ═══════════════════════════════════════════════════════════════════════════════

-- Add columns to t_contract_access for claim tracking
ALTER TABLE t_contract_access ADD COLUMN IF NOT EXISTS claimed_at TIMESTAMPTZ;
ALTER TABLE t_contract_access ADD COLUMN IF NOT EXISTS claimed_by UUID;

-- Add columns to t_contacts for source tracking
ALTER TABLE t_contacts ADD COLUMN IF NOT EXISTS source VARCHAR(50);
ALTER TABLE t_contacts ADD COLUMN IF NOT EXISTS source_tenant_id UUID;
ALTER TABLE t_contacts ADD COLUMN IF NOT EXISTS source_cnak VARCHAR(20);


-- ═══════════════════════════════════════════════════════════════════════════════
-- PART 2: MODIFIED get_contracts_list RPC
-- Now includes contracts accessed via t_contract_access (CNAK claim)
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION get_contracts_list(
    p_tenant_id UUID,
    p_is_live BOOLEAN DEFAULT true,
    p_record_type VARCHAR DEFAULT NULL,
    p_contract_type VARCHAR DEFAULT NULL,
    p_status VARCHAR DEFAULT NULL,
    p_search VARCHAR DEFAULT NULL,
    p_page INTEGER DEFAULT 1,
    p_per_page INTEGER DEFAULT 20,
    p_sort_by VARCHAR DEFAULT 'created_at',
    p_sort_order VARCHAR DEFAULT 'desc'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_total INTEGER;
    v_total_pages INTEGER;
    v_offset INTEGER;
    v_contracts JSONB;
BEGIN
    -- Input validation
    IF p_tenant_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'tenant_id is required');
    END IF;

    -- Clamp pagination
    p_page := GREATEST(p_page, 1);
    p_per_page := LEAST(GREATEST(p_per_page, 1), 100);
    v_offset := (p_page - 1) * p_per_page;

    -- Get total count (own + accessed contracts)
    SELECT COUNT(*) INTO v_total
    FROM (
        -- Own contracts
        SELECT c.id
        FROM t_contracts c
        WHERE c.tenant_id = p_tenant_id
          AND c.is_live = p_is_live
          AND c.is_active = true
          AND (p_record_type IS NULL OR c.record_type = p_record_type)
          AND (p_contract_type IS NULL OR c.contract_type = p_contract_type)
          AND (p_status IS NULL OR c.status = p_status)
          AND (p_search IS NULL OR TRIM(p_search) = '' OR
               c.name ILIKE '%' || TRIM(p_search) || '%' OR
               c.contract_number ILIKE '%' || TRIM(p_search) || '%' OR
               c.rfq_number ILIKE '%' || TRIM(p_search) || '%' OR
               c.buyer_name ILIKE '%' || TRIM(p_search) || '%')

        UNION

        -- Accessed contracts (via CNAK claim)
        SELECT c.id
        FROM t_contracts c
        INNER JOIN t_contract_access ca ON ca.contract_id = c.id
        WHERE ca.accessor_tenant_id = p_tenant_id
          AND ca.status = 'accepted'
          AND ca.is_active = true
          AND c.is_live = p_is_live
          AND c.is_active = true
          AND (p_record_type IS NULL OR c.record_type = p_record_type)
          -- For accessed contracts, flip contract_type filter (client becomes vendor)
          AND (p_contract_type IS NULL OR
               (p_contract_type = 'vendor' AND c.contract_type = 'client') OR
               (p_contract_type = 'client' AND c.contract_type = 'vendor') OR
               (p_contract_type = 'partner' AND c.contract_type = 'partner'))
          AND (p_status IS NULL OR c.status = p_status)
          AND (p_search IS NULL OR TRIM(p_search) = '' OR
               c.name ILIKE '%' || TRIM(p_search) || '%' OR
               c.contract_number ILIKE '%' || TRIM(p_search) || '%' OR
               c.global_access_id ILIKE '%' || TRIM(p_search) || '%')
    ) combined;

    v_total_pages := CEIL(v_total::NUMERIC / p_per_page);

    -- Fetch paginated contracts
    SELECT COALESCE(jsonb_agg(row_data ORDER BY sort_key DESC), '[]'::JSONB)
    INTO v_contracts
    FROM (
        -- Own contracts
        SELECT
            c.created_at as sort_key,
            jsonb_build_object(
                'id', c.id,
                'tenant_id', c.tenant_id,
                'contract_number', c.contract_number,
                'rfq_number', c.rfq_number,
                'record_type', c.record_type,
                'contract_type', c.contract_type,
                'name', c.name,
                'description', c.description,
                'status', c.status,
                'buyer_id', c.buyer_id,
                'buyer_name', c.buyer_name,
                'buyer_company', c.buyer_company,
                'acceptance_method', c.acceptance_method,
                'global_access_id', c.global_access_id,
                'duration_value', c.duration_value,
                'duration_unit', c.duration_unit,
                'currency', c.currency,
                'billing_cycle_type', c.billing_cycle_type,
                'total_value', c.total_value,
                'grand_total', c.grand_total,
                'sent_at', c.sent_at,
                'accepted_at', c.accepted_at,
                'version', c.version,
                'created_by', c.created_by,
                'created_at', c.created_at,
                'updated_at', c.updated_at,
                'access_type', 'owner',
                'access_role', c.contract_type,
                'blocks_count', (SELECT COUNT(*) FROM t_contract_blocks cb WHERE cb.contract_id = c.id),
                'vendors_count', (SELECT COUNT(*) FROM t_contract_vendors cv WHERE cv.contract_id = c.id)
            ) AS row_data
        FROM t_contracts c
        WHERE c.tenant_id = p_tenant_id
          AND c.is_live = p_is_live
          AND c.is_active = true
          AND (p_record_type IS NULL OR c.record_type = p_record_type)
          AND (p_contract_type IS NULL OR c.contract_type = p_contract_type)
          AND (p_status IS NULL OR c.status = p_status)
          AND (p_search IS NULL OR TRIM(p_search) = '' OR
               c.name ILIKE '%' || TRIM(p_search) || '%' OR
               c.contract_number ILIKE '%' || TRIM(p_search) || '%' OR
               c.rfq_number ILIKE '%' || TRIM(p_search) || '%' OR
               c.buyer_name ILIKE '%' || TRIM(p_search) || '%')

        UNION ALL

        -- Accessed contracts (via CNAK claim)
        SELECT
            c.created_at as sort_key,
            jsonb_build_object(
                'id', c.id,
                'tenant_id', c.tenant_id,
                'contract_number', c.contract_number,
                'rfq_number', c.rfq_number,
                'record_type', c.record_type,
                'contract_type', CASE c.contract_type
                    WHEN 'client' THEN 'vendor'    -- Flip: seller's client = buyer's vendor
                    WHEN 'vendor' THEN 'client'
                    ELSE c.contract_type
                END,
                'name', c.name,
                'description', c.description,
                'status', c.status,
                'buyer_id', c.buyer_id,
                'buyer_name', c.buyer_name,
                'buyer_company', c.buyer_company,
                'acceptance_method', c.acceptance_method,
                'global_access_id', c.global_access_id,
                'duration_value', c.duration_value,
                'duration_unit', c.duration_unit,
                'currency', c.currency,
                'billing_cycle_type', c.billing_cycle_type,
                'total_value', c.total_value,
                'grand_total', c.grand_total,
                'sent_at', c.sent_at,
                'accepted_at', c.accepted_at,
                'version', c.version,
                'created_by', c.created_by,
                'created_at', c.created_at,
                'updated_at', c.updated_at,
                'access_type', 'accessor',
                'access_role', ca.accessor_role,
                'seller_tenant_id', c.tenant_id,
                'blocks_count', (SELECT COUNT(*) FROM t_contract_blocks cb WHERE cb.contract_id = c.id),
                'vendors_count', (SELECT COUNT(*) FROM t_contract_vendors cv WHERE cv.contract_id = c.id)
            ) AS row_data
        FROM t_contracts c
        INNER JOIN t_contract_access ca ON ca.contract_id = c.id
        WHERE ca.accessor_tenant_id = p_tenant_id
          AND ca.status = 'accepted'
          AND ca.is_active = true
          AND c.is_live = p_is_live
          AND c.is_active = true
          AND (p_record_type IS NULL OR c.record_type = p_record_type)
          AND (p_contract_type IS NULL OR
               (p_contract_type = 'vendor' AND c.contract_type = 'client') OR
               (p_contract_type = 'client' AND c.contract_type = 'vendor') OR
               (p_contract_type = 'partner' AND c.contract_type = 'partner'))
          AND (p_status IS NULL OR c.status = p_status)
          AND (p_search IS NULL OR TRIM(p_search) = '' OR
               c.name ILIKE '%' || TRIM(p_search) || '%' OR
               c.contract_number ILIKE '%' || TRIM(p_search) || '%' OR
               c.global_access_id ILIKE '%' || TRIM(p_search) || '%')

        ORDER BY sort_key DESC
        LIMIT p_per_page OFFSET v_offset
    ) sub;

    -- Return response
    RETURN jsonb_build_object(
        'success', true,
        'data', COALESCE(v_contracts, '[]'::JSONB),
        'pagination', jsonb_build_object(
            'page', p_page,
            'per_page', p_per_page,
            'total', v_total,
            'total_pages', v_total_pages
        ),
        'filters', jsonb_build_object(
            'record_type', p_record_type,
            'contract_type', p_contract_type,
            'status', p_status,
            'search', p_search,
            'sort_by', p_sort_by,
            'sort_order', p_sort_order
        ),
        'retrieved_at', NOW()
    );

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false,
        'error', 'Failed to fetch contracts',
        'details', SQLERRM,
        'error_code', SQLSTATE
    );
END;
$$;

GRANT EXECUTE ON FUNCTION get_contracts_list(UUID, BOOLEAN, VARCHAR, VARCHAR, VARCHAR, VARCHAR, INTEGER, INTEGER, VARCHAR, VARCHAR) TO authenticated;
GRANT EXECUTE ON FUNCTION get_contracts_list(UUID, BOOLEAN, VARCHAR, VARCHAR, VARCHAR, VARCHAR, INTEGER, INTEGER, VARCHAR, VARCHAR) TO service_role;


-- ═══════════════════════════════════════════════════════════════════════════════
-- PART 3: NEW claim_contract_by_cnak RPC
-- Allows a tenant to claim a contract using CNAK after acceptance
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION claim_contract_by_cnak(
    p_cnak VARCHAR,
    p_tenant_id UUID,
    p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_access RECORD;
    v_contract RECORD;
    v_seller_tenant RECORD;
    v_seller_profile RECORD;
    v_contact_id UUID;
    v_existing_contact_id UUID;
BEGIN
    -- ═══════════════════════════════════════════
    -- STEP 1: Validate inputs
    -- ═══════════════════════════════════════════
    IF p_cnak IS NULL OR TRIM(p_cnak) = '' THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'CNAK is required'
        );
    END IF;

    IF p_tenant_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'tenant_id is required'
        );
    END IF;

    -- ═══════════════════════════════════════════
    -- STEP 2: Find access record by CNAK
    -- ═══════════════════════════════════════════
    SELECT * INTO v_access
    FROM t_contract_access
    WHERE global_access_id = UPPER(TRIM(p_cnak))
      AND is_active = true
    FOR UPDATE;

    IF v_access IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Invalid CNAK code. Please check and try again.'
        );
    END IF;

    -- ═══════════════════════════════════════════
    -- STEP 3: Check status - must be 'accepted'
    -- ═══════════════════════════════════════════
    IF v_access.status <> 'accepted' THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', CASE v_access.status
                WHEN 'pending' THEN 'This contract has not been accepted yet. Please accept it first using the review link.'
                WHEN 'viewed' THEN 'This contract has not been accepted yet. Please accept it first using the review link.'
                WHEN 'rejected' THEN 'This contract was rejected and cannot be claimed.'
                WHEN 'expired' THEN 'This contract access has expired.'
                ELSE 'Contract is not in a claimable state.'
            END,
            'status', v_access.status
        );
    END IF;

    -- ═══════════════════════════════════════════
    -- STEP 4: Check if already claimed by another tenant
    -- ═══════════════════════════════════════════
    IF v_access.accessor_tenant_id IS NOT NULL THEN
        IF v_access.accessor_tenant_id = p_tenant_id THEN
            -- Already claimed by this tenant - return success with contract info
            SELECT * INTO v_contract FROM t_contracts WHERE id = v_access.contract_id;

            RETURN jsonb_build_object(
                'success', true,
                'already_claimed', true,
                'message', 'This contract is already in your ContractHub.',
                'contract', jsonb_build_object(
                    'id', v_contract.id,
                    'name', v_contract.name,
                    'contract_number', v_contract.contract_number,
                    'status', v_contract.status,
                    'grand_total', v_contract.grand_total,
                    'currency', v_contract.currency
                )
            );
        ELSE
            -- Claimed by a different tenant
            RETURN jsonb_build_object(
                'success', false,
                'error', 'This contract has already been claimed by another workspace.'
            );
        END IF;
    END IF;

    -- ═══════════════════════════════════════════
    -- STEP 5: Prevent self-claim (seller claiming own contract)
    -- ═══════════════════════════════════════════
    IF v_access.tenant_id = p_tenant_id THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'You cannot claim your own contract. This contract is already in your ContractHub.'
        );
    END IF;

    -- ═══════════════════════════════════════════
    -- STEP 6: Get contract details
    -- ═══════════════════════════════════════════
    SELECT * INTO v_contract
    FROM t_contracts
    WHERE id = v_access.contract_id
      AND is_active = true;

    IF v_contract IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Contract not found or no longer active.'
        );
    END IF;

    -- ═══════════════════════════════════════════
    -- STEP 7: Get seller tenant info for contact creation
    -- ═══════════════════════════════════════════
    SELECT * INTO v_seller_tenant
    FROM t_tenants
    WHERE id = v_access.tenant_id;

    SELECT * INTO v_seller_profile
    FROM t_tenant_profiles
    WHERE tenant_id = v_access.tenant_id
    LIMIT 1;

    -- ═══════════════════════════════════════════
    -- STEP 8: Check if seller contact already exists in buyer's space
    -- ═══════════════════════════════════════════
    SELECT id INTO v_existing_contact_id
    FROM t_contacts
    WHERE tenant_id = p_tenant_id
      AND source_tenant_id = v_access.tenant_id
      AND is_active = true
    LIMIT 1;

    -- ═══════════════════════════════════════════
    -- STEP 9: Create seller as vendor contact (if not exists)
    -- ═══════════════════════════════════════════
    IF v_existing_contact_id IS NULL THEN
        INSERT INTO t_contacts (
            tenant_id,
            type,
            status,
            name,
            company_name,
            source,
            source_tenant_id,
            source_cnak,
            notes,
            created_by,
            is_live,
            is_active
        )
        VALUES (
            p_tenant_id,
            'vendor',
            'active',
            COALESCE(v_seller_profile.business_name, v_seller_tenant.name, 'Unknown Vendor'),
            COALESCE(v_seller_profile.business_name, v_seller_tenant.name),
            'cnak_claim',
            v_access.tenant_id,
            p_cnak,
            'Auto-created from CNAK contract claim',
            p_user_id,
            true,
            true
        )
        RETURNING id INTO v_contact_id;
    ELSE
        v_contact_id := v_existing_contact_id;
    END IF;

    -- ═══════════════════════════════════════════
    -- STEP 10: Update access record with accessor_tenant_id
    -- ═══════════════════════════════════════════
    UPDATE t_contract_access
    SET accessor_tenant_id = p_tenant_id,
        accessor_contact_id = v_contact_id,
        claimed_at = NOW(),
        claimed_by = p_user_id,
        updated_at = NOW()
    WHERE id = v_access.id;

    -- ═══════════════════════════════════════════
    -- STEP 11: Return success with contract and seller info
    -- ═══════════════════════════════════════════
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Contract claimed successfully! It is now in your ContractHub.',
        'contract', jsonb_build_object(
            'id', v_contract.id,
            'name', v_contract.name,
            'contract_number', v_contract.contract_number,
            'description', v_contract.description,
            'status', v_contract.status,
            'total_value', v_contract.total_value,
            'grand_total', v_contract.grand_total,
            'currency', v_contract.currency,
            'duration_value', v_contract.duration_value,
            'duration_unit', v_contract.duration_unit,
            'global_access_id', v_contract.global_access_id
        ),
        'seller', jsonb_build_object(
            'contact_id', v_contact_id,
            'name', COALESCE(v_seller_profile.business_name, v_seller_tenant.name),
            'is_new_contact', v_existing_contact_id IS NULL
        ),
        'claimed_at', NOW()
    );

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false,
        'error', 'Failed to claim contract: ' || SQLERRM
    );
END;
$$;

-- Grants
GRANT EXECUTE ON FUNCTION claim_contract_by_cnak(VARCHAR, UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION claim_contract_by_cnak(VARCHAR, UUID, UUID) TO service_role;


-- ═══════════════════════════════════════════════════════════════════════════════
-- DONE! All SQL scripts executed successfully.
-- ═══════════════════════════════════════════════════════════════════════════════
