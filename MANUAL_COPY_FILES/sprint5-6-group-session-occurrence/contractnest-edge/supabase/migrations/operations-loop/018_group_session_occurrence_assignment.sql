-- ============================================================================
-- Migration: Group Session Occurrence Assignment — 018
-- ============================================================================
-- Purpose (Sprint 5+6 combined planning, 19 Jul 2026):
--   Group Session blocks (audience='group', e.g. BBB's "Saturday Cadence")
--   are added independently to MANY separate member contracts (BBB has 10
--   member contracts, each their own AR — confirmed via live query, not one
--   contract with an embedded 50-person roster). All of them share the same
--   cadence anchor, so their per-contract service events land on the same
--   calendar date, but today there is no entity tying those rows together.
--
--   t_appointments cannot represent this: contract_id and event_id are both
--   NOT NULL and singular (one appointment = one contract's one event) —
--   confirmed via schema inspection (operations-loop/012). Retrofitting it
--   to span many contracts would break every existing appointment query/
--   kanban that assumes that cardinality, and conflates two different jobs:
--   "negotiate a date with one buyer" (appointments) vs. "assign a host to
--   a cadence-fixed occurrence shared by many buyers" (this table).
--
--   assign_session_occurrence(): someone (instructor/host) is assigned ONCE
--   per (tenant, block, date); the assignment fans OUT into every member-
--   contract's t_contract_events row sharing that occurrence — instead of
--   assigning 50 times. Returns fanout_count so the caller can see/prove
--   the fan-out worked.
--
--   get_session_occurrences(): lists occurrences with a live member_count
--   (joined from t_contract_events, scoped to the tenant's session-category
--   catalog blocks via a safe TEXT-equality join — no uuid casting on
--   block_id, since FlyBy service blocks carry non-uuid ids like
--   "flyby-service-<ts>" and a cast there would throw for every tenant that
--   has any) and current assignment state. Powers the future cockpit
--   consolidation view (Phase 3, not built here).
--
--   Roster/attendance capture (Phase 2) builds on top of this; not included
--   here. Applied live via MCP and verified (empty-catalog read + NOT_FOUND
--   assign path against BBB) before this file was written — see
--   COPY_INSTRUCTIONS.txt.
-- Depends on: contracts/012 (t_contract_events), operations-loop/012 (t_appointments, convention reference only — no FK)
-- Safe to re-run: Yes
-- Applied by: OWNER — project uwyqhzotluikawcboldr
-- ============================================================================

-- ─────────────────────────────────────────────
-- Table
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS t_session_occurrence_assignments (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id             UUID NOT NULL,
    block_id              TEXT NOT NULL,     -- catalog session block id; matches t_contract_events.block_id (TEXT — instance ids can carry a coverage-type suffix elsewhere, but group-session member contracts have no coverage types, so this is the raw catalog id)
    scheduled_date        DATE NOT NULL,     -- the occurrence's calendar date (t_contract_events.scheduled_date::date)

    status                TEXT NOT NULL DEFAULT 'unassigned',  -- unassigned -> assigned -> completed | cancelled
    assigned_to           UUID,
    assigned_to_name      TEXT,
    roster_submission_id  UUID,              -- set once Phase 2's roster form is submitted for this occurrence
    notes                 TEXT,

    version               INT NOT NULL DEFAULT 1,
    is_live               BOOLEAN DEFAULT true,
    is_active             BOOLEAN DEFAULT true,
    created_at            TIMESTAMPTZ DEFAULT now(),
    updated_at            TIMESTAMPTZ DEFAULT now(),
    created_by            UUID,
    updated_by            UUID
);

COMMENT ON TABLE t_session_occurrence_assignments IS
    'Shared assignment for a Group Session occurrence (one catalog block, one date) spanning every member-contract''s own service event for that date. NOT an appointment — t_appointments is hard-wired to one contract + one event and cannot represent this cardinality.';

CREATE UNIQUE INDEX IF NOT EXISTS uq_session_occurrence
    ON t_session_occurrence_assignments (tenant_id, block_id, scheduled_date, is_live)
    WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_session_occurrence_board
    ON t_session_occurrence_assignments (tenant_id, status)
    WHERE is_active = true;

-- ─────────────────────────────────────────────
-- RPC: assign_session_occurrence
--   Upserts the occurrence's assignment, then fans assigned_to/
--   assigned_to_name into every matching member-contract's service event.
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION assign_session_occurrence(
    p_tenant_id        UUID,
    p_block_id         TEXT,
    p_scheduled_date   DATE,
    p_assigned_to      UUID,
    p_assigned_to_name TEXT,
    p_is_live          BOOLEAN DEFAULT true,
    p_changed_by       UUID DEFAULT NULL,
    p_changed_by_name  TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_member_count  INT;
    v_fanout_count  INT;
    v_row           RECORD;
    v_id            UUID;
BEGIN
    IF p_tenant_id IS NULL OR p_block_id IS NULL OR p_scheduled_date IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'tenant_id, block_id and scheduled_date are required');
    END IF;

    IF p_assigned_to IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'assigned_to is required');
    END IF;

    -- There must be at least one real occurrence to assign
    SELECT count(*) INTO v_member_count
    FROM t_contract_events e
    WHERE e.tenant_id = p_tenant_id
      AND e.block_id = p_block_id
      AND e.scheduled_date::date = p_scheduled_date
      AND e.event_type = 'service'
      AND e.is_active = true
      AND COALESCE(e.is_live, true) = p_is_live;

    IF v_member_count = 0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'No member events found for this occurrence', 'code', 'NOT_FOUND');
    END IF;

    SELECT * INTO v_row
    FROM t_session_occurrence_assignments
    WHERE tenant_id = p_tenant_id AND block_id = p_block_id AND scheduled_date = p_scheduled_date
      AND COALESCE(is_live, true) = p_is_live AND is_active = true
    FOR UPDATE;

    IF v_row IS NULL THEN
        INSERT INTO t_session_occurrence_assignments
            (tenant_id, block_id, scheduled_date, status, assigned_to, assigned_to_name, is_live, created_by, updated_by)
        VALUES
            (p_tenant_id, p_block_id, p_scheduled_date, 'assigned', p_assigned_to, p_assigned_to_name, p_is_live, p_changed_by, p_changed_by)
        RETURNING id INTO v_id;
    ELSE
        v_id := v_row.id;
        UPDATE t_session_occurrence_assignments
        SET status = 'assigned',
            assigned_to = p_assigned_to,
            assigned_to_name = p_assigned_to_name,
            version = version + 1,
            updated_by = p_changed_by,
            updated_at = now()
        WHERE id = v_id;
    END IF;

    -- Fan-out: every member-contract's event for this occurrence gets the same assignee
    UPDATE t_contract_events e
    SET assigned_to = p_assigned_to,
        assigned_to_name = p_assigned_to_name,
        version = e.version + 1,
        updated_by = p_changed_by,
        updated_at = now()
    WHERE e.tenant_id = p_tenant_id
      AND e.block_id = p_block_id
      AND e.scheduled_date::date = p_scheduled_date
      AND e.event_type = 'service'
      AND e.is_active = true
      AND COALESCE(e.is_live, true) = p_is_live;

    GET DIAGNOSTICS v_fanout_count = ROW_COUNT;

    INSERT INTO t_audit_log
        (tenant_id, entity_type, entity_id, contract_id, category, action, description, new_value, performed_by, performed_by_name)
    VALUES
        (p_tenant_id, 'session_occurrence', v_id, NULL, 'status', 'session_occurrence_assigned',
         format('Session occurrence %s / %s assigned to %s (%s member events updated)', p_block_id, p_scheduled_date, COALESCE(p_assigned_to_name, p_assigned_to::text), v_fanout_count),
         jsonb_build_object('block_id', p_block_id, 'scheduled_date', p_scheduled_date, 'assigned_to', p_assigned_to, 'fanout_count', v_fanout_count),
         p_changed_by, p_changed_by_name);

    RETURN jsonb_build_object(
        'success', true,
        'data', jsonb_build_object(
            'id', v_id,
            'status', 'assigned',
            'assigned_to', p_assigned_to,
            'assigned_to_name', p_assigned_to_name,
            'member_count', v_member_count,
            'fanout_count', v_fanout_count
        )
    );

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', 'Failed to assign session occurrence', 'details', SQLERRM, 'code', 'RPC_ERROR');
END;
$$;

GRANT EXECUTE ON FUNCTION assign_session_occurrence(UUID, TEXT, DATE, UUID, TEXT, BOOLEAN, UUID, TEXT) TO service_role;

-- ─────────────────────────────────────────────
-- RPC: get_session_occurrences
--   Lists occurrences for a tenant (optionally filtered to a date range),
--   each with its live member_count (from t_contract_events, scoped to the
--   tenant's session-category catalog blocks) and its current assignment
--   state (from t_session_occurrence_assignments, if any).
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_session_occurrences(
    p_tenant_id  UUID,
    p_is_live    BOOLEAN DEFAULT true,
    p_date_from  DATE DEFAULT NULL,
    p_date_to    DATE DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_items JSONB;
BEGIN
    IF p_tenant_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'tenant_id is required');
    END IF;

    SELECT COALESCE(jsonb_agg(to_jsonb(x) ORDER BY x.scheduled_date ASC), '[]'::jsonb)
    INTO v_items
    FROM (
        WITH group_blocks AS (
            SELECT b.id::text AS id_text
            FROM m_cat_blocks b
            WHERE b.tenant_id = p_tenant_id AND b.category = 'session'
        )
        SELECT
            e.block_id,
            e.block_name,
            e.scheduled_date::date AS scheduled_date,
            count(*) AS member_count,
            count(*) FILTER (WHERE e.status = 'completed') AS completed_count,
            a.id AS assignment_id,
            COALESCE(a.status, 'unassigned') AS assignment_status,
            a.assigned_to,
            a.assigned_to_name,
            a.roster_submission_id
        FROM t_contract_events e
        -- TEXT equality, never a uuid cast on e.block_id — FlyBy service
        -- blocks carry non-uuid ids (e.g. "flyby-service-<ts>") and casting
        -- those would throw for every tenant that has any.
        JOIN group_blocks gb ON split_part(e.block_id, '__', 1) = gb.id_text
        LEFT JOIN t_session_occurrence_assignments a
          ON a.tenant_id = e.tenant_id
         AND a.block_id = e.block_id
         AND a.scheduled_date = e.scheduled_date::date
         AND COALESCE(a.is_live, true) = p_is_live
         AND a.is_active = true
        WHERE e.tenant_id = p_tenant_id
          AND e.event_type = 'service'
          AND e.is_active = true
          AND COALESCE(e.is_live, true) = p_is_live
          AND (p_date_from IS NULL OR e.scheduled_date::date >= p_date_from)
          AND (p_date_to IS NULL OR e.scheduled_date::date <= p_date_to)
        GROUP BY e.block_id, e.block_name, e.scheduled_date::date, a.id, a.status, a.assigned_to, a.assigned_to_name, a.roster_submission_id
    ) x;

    RETURN jsonb_build_object('success', true, 'data', v_items, 'retrieved_at', now());

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', 'Failed to fetch session occurrences', 'details', SQLERRM, 'code', 'RPC_ERROR');
END;
$$;

GRANT EXECUTE ON FUNCTION get_session_occurrences(UUID, BOOLEAN, DATE, DATE) TO service_role;
