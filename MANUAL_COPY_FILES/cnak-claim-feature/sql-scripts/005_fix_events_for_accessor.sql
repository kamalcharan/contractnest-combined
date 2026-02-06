-- ═══════════════════════════════════════════════════════════════════════════════
-- FIX: get_contract_events_list - Allow accessors (buyers) to see events
-- Events are stored with seller's tenant_id, but buyers who claimed the contract
-- via t_contract_access should also be able to view them.
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION get_contract_events_list(
    p_tenant_id     UUID,
    p_is_live       BOOLEAN DEFAULT true,
    p_contract_id   UUID DEFAULT NULL,          -- scope: specific contract
    p_contact_id    UUID DEFAULT NULL,          -- scope: specific customer/contact
    p_assigned_to   UUID DEFAULT NULL,          -- filter: assigned team member
    p_status        TEXT DEFAULT NULL,           -- filter: event status
    p_event_type    TEXT DEFAULT NULL,           -- filter: 'service' | 'billing'
    p_date_from     TIMESTAMPTZ DEFAULT NULL,   -- filter: scheduled_date >= this
    p_date_to       TIMESTAMPTZ DEFAULT NULL,   -- filter: scheduled_date <= this
    p_page          INT DEFAULT 1,
    p_per_page      INT DEFAULT 50,
    p_sort_by       TEXT DEFAULT 'scheduled_date',
    p_sort_order    TEXT DEFAULT 'asc'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_total     INT;
    v_total_pages INT;
    v_offset    INT;
    v_events    JSONB;
    v_where     TEXT;
    v_order     TEXT;
    v_query     TEXT;
    v_count_query TEXT;
BEGIN
    -- ═══════════════════════════════════════════
    -- STEP 0: Input validation
    -- ═══════════════════════════════════════════
    IF p_tenant_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'tenant_id is required');
    END IF;

    -- Clamp pagination
    p_page := GREATEST(p_page, 1);
    p_per_page := LEAST(GREATEST(p_per_page, 1), 100);
    v_offset := (p_page - 1) * p_per_page;

    -- ═══════════════════════════════════════════
    -- STEP 1: Build WHERE clause
    -- MODIFIED: Include events from BOTH:
    --   1. Owned contracts (ce.tenant_id = p_tenant_id)
    --   2. Accessed contracts (via t_contract_access where accessor_tenant_id = p_tenant_id)
    -- ═══════════════════════════════════════════
    v_where := format(
        'WHERE ce.is_live = %L AND ce.is_active = true
         AND (
             -- Owned: events belong to this tenant
             ce.tenant_id = %L
             -- OR Accessed: events belong to contracts this tenant has access to
             OR ce.contract_id IN (
                 SELECT ca.contract_id
                 FROM t_contract_access ca
                 WHERE ca.accessor_tenant_id = %L
                   AND ca.status = ''accepted''
                   AND ca.is_active = true
             )
         )',
        p_is_live, p_tenant_id, p_tenant_id
    );

    -- Scope: contract
    IF p_contract_id IS NOT NULL THEN
        v_where := v_where || format(' AND ce.contract_id = %L', p_contract_id);
    END IF;

    -- Scope: customer/contact (joins through t_contracts.buyer_id + t_contract_vendors)
    IF p_contact_id IS NOT NULL THEN
        v_where := v_where || format(
            ' AND ce.contract_id IN (
                SELECT c.id FROM t_contracts c
                WHERE c.is_active = true
                  AND (c.buyer_id = %L
                       OR c.id IN (SELECT cv.contract_id FROM t_contract_vendors cv WHERE cv.contact_id = %L))
            )',
            p_contact_id, p_contact_id
        );
    END IF;

    -- Filters
    IF p_assigned_to IS NOT NULL THEN
        v_where := v_where || format(' AND ce.assigned_to = %L', p_assigned_to);
    END IF;

    IF p_status IS NOT NULL THEN
        v_where := v_where || format(' AND ce.status = %L', p_status);
    END IF;

    IF p_event_type IS NOT NULL THEN
        v_where := v_where || format(' AND ce.event_type = %L', p_event_type);
    END IF;

    IF p_date_from IS NOT NULL THEN
        v_where := v_where || format(' AND ce.scheduled_date >= %L', p_date_from);
    END IF;

    IF p_date_to IS NOT NULL THEN
        v_where := v_where || format(' AND ce.scheduled_date <= %L', p_date_to);
    END IF;

    -- ═══════════════════════════════════════════
    -- STEP 2: Build ORDER BY
    -- ═══════════════════════════════════════════
    v_order := CASE p_sort_by
        WHEN 'status'     THEN 'ce.status'
        WHEN 'event_type' THEN 'ce.event_type'
        WHEN 'amount'     THEN 'ce.amount'
        WHEN 'created_at' THEN 'ce.created_at'
        WHEN 'block_name' THEN 'ce.block_name'
        ELSE 'ce.scheduled_date'
    END;

    v_order := v_order || CASE WHEN LOWER(p_sort_order) = 'desc' THEN ' DESC' ELSE ' ASC' END;

    -- ═══════════════════════════════════════════
    -- STEP 3: Get total count
    -- ═══════════════════════════════════════════
    v_count_query := 'SELECT COUNT(*) FROM t_contract_events ce ' || v_where;
    EXECUTE v_count_query INTO v_total;

    v_total_pages := CEIL(v_total::NUMERIC / p_per_page);

    -- ═══════════════════════════════════════════
    -- STEP 4: Fetch paginated events with contract name
    -- ═══════════════════════════════════════════
    v_query := format(
        'SELECT COALESCE(jsonb_agg(row_data ORDER BY rn), ''[]''::JSONB)
         FROM (
             SELECT
                 ROW_NUMBER() OVER (ORDER BY %s) as rn,
                 jsonb_build_object(
                     ''id'', ce.id,
                     ''contract_id'', ce.contract_id,
                     ''contract_name'', c.name,
                     ''block_id'', ce.block_id,
                     ''block_name'', ce.block_name,
                     ''category_id'', ce.category_id,
                     ''event_type'', ce.event_type,
                     ''billing_sub_type'', ce.billing_sub_type,
                     ''billing_cycle_label'', ce.billing_cycle_label,
                     ''sequence_number'', ce.sequence_number,
                     ''total_occurrences'', ce.total_occurrences,
                     ''scheduled_date'', ce.scheduled_date,
                     ''original_date'', ce.original_date,
                     ''amount'', ce.amount,
                     ''currency'', ce.currency,
                     ''status'', ce.status,
                     ''assigned_to'', ce.assigned_to,
                     ''assigned_to_name'', ce.assigned_to_name,
                     ''notes'', ce.notes,
                     ''version'', ce.version,
                     ''created_at'', ce.created_at,
                     ''updated_at'', ce.updated_at
                 ) AS row_data
             FROM t_contract_events ce
             LEFT JOIN t_contracts c ON c.id = ce.contract_id
             %s
             ORDER BY %s
             LIMIT %s OFFSET %s
         ) sub',
        v_order,
        v_where,
        v_order,
        p_per_page,
        v_offset
    );

    EXECUTE v_query INTO v_events;

    -- ═══════════════════════════════════════════
    -- STEP 5: Return response
    -- ═══════════════════════════════════════════
    RETURN jsonb_build_object(
        'success', true,
        'data', COALESCE(v_events, '[]'::JSONB),
        'pagination', jsonb_build_object(
            'page', p_page,
            'per_page', p_per_page,
            'total', v_total,
            'total_pages', v_total_pages
        ),
        'filters', jsonb_build_object(
            'contract_id', p_contract_id,
            'contact_id', p_contact_id,
            'assigned_to', p_assigned_to,
            'status', p_status,
            'event_type', p_event_type,
            'date_from', p_date_from,
            'date_to', p_date_to,
            'sort_by', p_sort_by,
            'sort_order', p_sort_order
        ),
        'retrieved_at', NOW()
    );

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false,
        'error', 'Failed to fetch contract events',
        'details', SQLERRM,
        'error_code', SQLSTATE
    );
END;
$$;

GRANT EXECUTE ON FUNCTION get_contract_events_list(UUID, BOOLEAN, UUID, UUID, UUID, TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, INT, INT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_contract_events_list(UUID, BOOLEAN, UUID, UUID, UUID, TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, INT, INT, TEXT, TEXT) TO service_role;


-- ═══════════════════════════════════════════════════════════════════════════════
-- DONE! Deploy this to Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════════════════════
