-- ============================================================================
-- Migration: Stage 2 Services — 011 Customer fields on the events list
-- ============================================================================
-- Purpose (owner feedback on Service Schedule v1): the events list must show
-- Contract ID, customer name, phone and email. get_contract_events_list only
-- returned contract_name. Full CREATE OR REPLACE of contracts/013 §3 with
-- the added fields (marked STAGE 2 CHANGE): task_id, contract_number,
-- buyer_id, buyer_name (company-first), buyer_phone / buyer_email with
-- t_contact_channels fallbacks (denormalized contract fields are NULL in
-- practice). Everything else verbatim.
-- Depends on: contracts/013, contracts/020 (task_id)
-- Safe to re-run: Yes
-- Applied by: OWNER — project uwyqhzotluikawcboldr
-- ============================================================================

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
    -- ═══════════════════════════════════════════
    v_where := format(
        'WHERE ce.tenant_id = %L AND ce.is_live = %L AND ce.is_active = true',
        p_tenant_id, p_is_live
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
                WHERE c.tenant_id = %L AND c.is_active = true
                  AND (c.buyer_id = %L
                       OR c.id IN (SELECT cv.contract_id FROM t_contract_vendors cv WHERE cv.contact_id = %L))
            )',
            p_tenant_id, p_contact_id, p_contact_id
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
    -- STEP 4: Fetch paginated events with contract + customer context
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
                     ''contract_number'', c.contract_number,
                     ''task_id'', ce.task_id,
                     ''buyer_id'', c.buyer_id,
                     ''buyer_name'', COALESCE(c.buyer_company, c.buyer_name),
                     ''buyer_phone'', COALESCE(NULLIF(TRIM(c.buyer_phone), ''''), (
                         SELECT ch.value FROM t_contact_channels ch
                         WHERE ch.contact_id = c.buyer_id AND ch.channel_type IN (''mobile'', ''whatsapp'')
                         ORDER BY CASE ch.channel_type WHEN ''mobile'' THEN 0 ELSE 1 END,
                                  ch.is_primary DESC NULLS LAST, ch.created_at
                         LIMIT 1)),
                     ''buyer_email'', COALESCE(NULLIF(TRIM(c.buyer_email), ''''), (
                         SELECT ch.value FROM t_contact_channels ch
                         WHERE ch.contact_id = c.buyer_id AND ch.channel_type = ''email''
                         ORDER BY ch.is_primary DESC NULLS LAST, ch.created_at
                         LIMIT 1)),
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
