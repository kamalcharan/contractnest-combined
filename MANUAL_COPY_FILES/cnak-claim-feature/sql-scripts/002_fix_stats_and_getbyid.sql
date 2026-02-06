-- ═══════════════════════════════════════════════════════════════════════════════
-- FIX: get_contract_stats and get_contract_by_id for CNAK Claim Feature
-- This fixes both SELLER and BUYER views to work correctly
--
-- IMPORTANT: Run this AFTER 001_cnak_claim_feature.sql
-- ═══════════════════════════════════════════════════════════════════════════════


-- ═══════════════════════════════════════════════════════════════════════════════
-- PART 1: FIXED get_contract_stats
-- Now includes both:
--   1. OWNED contracts (tenant_id = p_tenant_id) - counts as normal
--   2. ACCESSED contracts (via t_contract_access) - counts with flipped contract_type
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION get_contract_stats(
    p_tenant_id UUID,
    p_is_live BOOLEAN DEFAULT true
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_by_status JSONB;
    v_by_record_type JSONB;
    v_by_contract_type JSONB;
    v_totals RECORD;
BEGIN
    -- ═══════════════════════════════════════════
    -- STEP 0: Input validation
    -- ═══════════════════════════════════════════
    IF p_tenant_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'tenant_id is required'
        );
    END IF;

    -- ═══════════════════════════════════════════
    -- STEP 1: Counts by status (OWNED + ACCESSED)
    -- ═══════════════════════════════════════════
    SELECT COALESCE(
        jsonb_object_agg(status, cnt),
        '{}'::JSONB
    )
    INTO v_by_status
    FROM (
        SELECT status, COUNT(*) AS cnt
        FROM (
            -- Owned contracts
            SELECT c.status
            FROM t_contracts c
            WHERE c.tenant_id = p_tenant_id
              AND c.is_live = p_is_live
              AND c.is_active = true

            UNION ALL

            -- Accessed contracts (via CNAK claim)
            SELECT c.status
            FROM t_contracts c
            INNER JOIN t_contract_access ca ON ca.contract_id = c.id
            WHERE ca.accessor_tenant_id = p_tenant_id
              AND ca.status = 'accepted'
              AND ca.is_active = true
              AND c.is_live = p_is_live
              AND c.is_active = true
        ) combined
        GROUP BY status
    ) sub;

    -- ═══════════════════════════════════════════
    -- STEP 2: Counts by record_type (OWNED + ACCESSED)
    -- ═══════════════════════════════════════════
    SELECT COALESCE(
        jsonb_object_agg(record_type, cnt),
        '{}'::JSONB
    )
    INTO v_by_record_type
    FROM (
        SELECT record_type, COUNT(*) AS cnt
        FROM (
            -- Owned contracts
            SELECT c.record_type
            FROM t_contracts c
            WHERE c.tenant_id = p_tenant_id
              AND c.is_live = p_is_live
              AND c.is_active = true

            UNION ALL

            -- Accessed contracts
            SELECT c.record_type
            FROM t_contracts c
            INNER JOIN t_contract_access ca ON ca.contract_id = c.id
            WHERE ca.accessor_tenant_id = p_tenant_id
              AND ca.status = 'accepted'
              AND ca.is_active = true
              AND c.is_live = p_is_live
              AND c.is_active = true
        ) combined
        GROUP BY record_type
    ) sub;

    -- ═══════════════════════════════════════════
    -- STEP 3: Counts by contract_type (OWNED + ACCESSED with FLIP)
    -- For accessed contracts: client -> vendor, vendor -> client
    -- ═══════════════════════════════════════════
    SELECT COALESCE(
        jsonb_object_agg(contract_type, cnt),
        '{}'::JSONB
    )
    INTO v_by_contract_type
    FROM (
        SELECT contract_type, COUNT(*) AS cnt
        FROM (
            -- Owned contracts (as-is)
            SELECT c.contract_type
            FROM t_contracts c
            WHERE c.tenant_id = p_tenant_id
              AND c.is_live = p_is_live
              AND c.is_active = true

            UNION ALL

            -- Accessed contracts (FLIPPED type)
            -- Seller's "client" = Buyer's "vendor"
            -- Seller's "vendor" = Buyer's "client"
            SELECT CASE c.contract_type
                WHEN 'client' THEN 'vendor'
                WHEN 'vendor' THEN 'client'
                ELSE c.contract_type
            END AS contract_type
            FROM t_contracts c
            INNER JOIN t_contract_access ca ON ca.contract_id = c.id
            WHERE ca.accessor_tenant_id = p_tenant_id
              AND ca.status = 'accepted'
              AND ca.is_active = true
              AND c.is_live = p_is_live
              AND c.is_active = true
        ) combined
        GROUP BY contract_type
    ) sub;

    -- ═══════════════════════════════════════════
    -- STEP 4: Financial totals (OWNED + ACCESSED)
    -- ═══════════════════════════════════════════
    SELECT
        COUNT(*) AS total_count,
        COALESCE(SUM(total_value), 0) AS sum_total_value,
        COALESCE(SUM(grand_total), 0) AS sum_grand_total,
        COALESCE(SUM(CASE WHEN status = 'active' THEN grand_total ELSE 0 END), 0) AS active_value,
        COALESCE(SUM(CASE WHEN status = 'draft' THEN grand_total ELSE 0 END), 0) AS draft_value
    INTO v_totals
    FROM (
        -- Owned contracts
        SELECT c.status, c.total_value, c.grand_total
        FROM t_contracts c
        WHERE c.tenant_id = p_tenant_id
          AND c.is_live = p_is_live
          AND c.is_active = true

        UNION ALL

        -- Accessed contracts
        SELECT c.status, c.total_value, c.grand_total
        FROM t_contracts c
        INNER JOIN t_contract_access ca ON ca.contract_id = c.id
        WHERE ca.accessor_tenant_id = p_tenant_id
          AND ca.status = 'accepted'
          AND ca.is_active = true
          AND c.is_live = p_is_live
          AND c.is_active = true
    ) combined;

    -- ═══════════════════════════════════════════
    -- STEP 5: Return response
    -- ═══════════════════════════════════════════
    RETURN jsonb_build_object(
        'success', true,
        'data', jsonb_build_object(
            'total_count', v_totals.total_count,
            'by_status', v_by_status,
            'by_record_type', v_by_record_type,
            'by_contract_type', v_by_contract_type,
            'financials', jsonb_build_object(
                'total_value', v_totals.sum_total_value,
                'grand_total', v_totals.sum_grand_total,
                'active_value', v_totals.active_value,
                'draft_value', v_totals.draft_value
            )
        ),
        'retrieved_at', NOW()
    );

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false,
        'error', 'Failed to fetch contract stats',
        'details', SQLERRM,
        'error_code', SQLSTATE
    );
END;
$$;

GRANT EXECUTE ON FUNCTION get_contract_stats(UUID, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION get_contract_stats(UUID, BOOLEAN) TO service_role;


-- ═══════════════════════════════════════════════════════════════════════════════
-- PART 2: FIXED get_contract_by_id
-- Now allows viewing contracts that are either:
--   1. OWNED (tenant_id = p_tenant_id)
--   2. ACCESSED (via t_contract_access where accessor_tenant_id = p_tenant_id)
-- For accessed contracts, flips contract_type and adds access metadata
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
    IF v_contract IS NULL THEN
        -- Check t_contract_access for accessor rights
        SELECT * INTO v_access
        FROM t_contract_access
        WHERE contract_id = p_contract_id
          AND accessor_tenant_id = p_tenant_id
          AND status = 'accepted'
          AND is_active = true;

        IF v_access IS NOT NULL THEN
            -- Accessor has rights - fetch the contract
            SELECT * INTO v_contract
            FROM t_contracts
            WHERE id = p_contract_id
              AND is_active = true;

            v_is_accessor := true;
        END IF;
    END IF;

    -- ═══════════════════════════════════════════
    -- STEP 3: Return error if still not found
    -- ═══════════════════════════════════════════
    IF v_contract IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Contract not found',
            'contract_id', p_contract_id
        );
    END IF;

    -- ═══════════════════════════════════════════
    -- STEP 4: Determine effective contract_type
    -- For accessors: flip client <-> vendor
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
    -- STEP 5: Fetch blocks (ordered by position)
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
    -- STEP 6: Fetch vendors (RFQ only)
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
    -- STEP 8: Fetch recent history (last 20 entries)
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
    -- STEP 9: Return full contract with embedded data
    -- ═══════════════════════════════════════════
    RETURN jsonb_build_object(
        'success', true,
        'data', jsonb_build_object(
            'id', v_contract.id,
            'tenant_id', v_contract.tenant_id,
            'contract_number', v_contract.contract_number,
            'rfq_number', v_contract.rfq_number,
            'record_type', v_contract.record_type,
            'contract_type', v_effective_contract_type,  -- Use effective (possibly flipped) type
            'original_contract_type', v_contract.contract_type,  -- Original for reference
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

            -- Access metadata (for accessors)
            'access_type', CASE WHEN v_is_accessor THEN 'accessor' ELSE 'owner' END,
            'is_accessor', v_is_accessor,
            'accessor_role', CASE WHEN v_is_accessor THEN v_access.accessor_role ELSE NULL END,
            'claimed_at', CASE WHEN v_is_accessor THEN v_access.claimed_at ELSE NULL END,

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


-- ═══════════════════════════════════════════════════════════════════════════════
-- PART 3: FIXED claim_contract_by_cnak
-- Fix: Use 'corporate' type instead of 'vendor' (constraint violation)
-- Fix: Use company_name instead of name for corporate contacts
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
    -- STEP 9: Create seller as CORPORATE contact (if not exists)
    -- NOTE: Using 'corporate' type (not 'vendor') due to constraint
    -- For corporate contacts, use company_name (not name)
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
            'corporate',  -- FIXED: Use 'corporate' instead of 'vendor'
            'active',
            NULL,  -- FIXED: name should be NULL for corporate type
            COALESCE(v_seller_profile.business_name, v_seller_tenant.name, 'Unknown Vendor'),
            'cnak_claim',
            v_access.tenant_id,
            p_cnak,
            'Auto-created from CNAK contract claim (vendor relationship)',
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
-- DONE! Deploy this to Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════════════════════
