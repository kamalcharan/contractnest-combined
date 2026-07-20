-- ============================================================================
-- Migration: Group Session Chair Appointment — 031
-- ============================================================================
-- Purpose (Sprint 5+6 combined planning, 19 Jul 2026):
--   Follow-up to 030 (which added assigned_to/assigned_to_name directly on
--   t_group_session_schedule). Owner's next requirement: assigning a chair
--   should ALSO create a real appointment for that person in the existing
--   Appointments system, not just a field on the occurrence row.
--
--   This is architecturally sound where the earlier (reverted) attempt
--   wasn't: it's genuinely 1:1 (one occurrence -> one chair -> one
--   appointment), the exact cardinality t_appointments was built for —
--   unlike "one appointment fanned across 50 members' contracts," which
--   was correctly ruled out. The only blocker was that contract_id/
--   event_id were both NOT NULL, hard-wiring every appointment to a
--   contract-event. A Group Session occurrence has neither (it lives in
--   t_group_session_schedule, shared across many member contracts via
--   t_contract_blocks, not owned by any single one).
--
--   Also debated and declined in this session: merging occurrences INTO
--   t_contract_events itself (a "universal cadence table" with a type
--   discriminator). Technically feasible (nullable contract_id + CHECK),
--   but would require rewriting ~26 already-live gs_* RPCs and the
--   working /group-sessions dashboard for a conceptual-purity gain that
--   doesn't even solve the attendance-table question (t_session_attendance
--   still can't fold into t_contract_event_assets either way, since
--   attendance is per (occurrence, member) with no per-member event to
--   attach to — deliberately avoided). Owner agreed: not worth the
--   rewrite risk; a read-layer UNION view can give VaNi the same unified
--   view later without touching the live gs_* system.
--
--   Fix: widen t_appointments minimally — nullable contract_id/event_id,
--   new nullable group_session_occurrence_id (FK), a CHECK enforcing
--   exactly one link type is set, and a partial unique index (one active
--   appointment per occurrence, mirroring the existing per-event rule).
--   gs_schedule_assign() (030) extended to upsert the appointment in the
--   same call — status='accepted' directly (no requested/negotiation
--   stage: the date is already fixed by the cadence, not by buyer
--   negotiation; the tenant is assigning, not proposing slots). Passing
--   assigned_to=NULL clears both the occurrence field AND soft-deletes
--   the appointment (is_active=false), instead of leaving a stale
--   'accepted' appointment for someone no longer assigned.
--
--   New gs_schedule_assign_default(): "set as default chair going
--   forward" — applies to every future (occurrence_date >= current_date),
--   non-cancelled occurrence for the block in one call, each getting its
--   own appointment row via the same per-occurrence logic. A later
--   single-occurrence gs_schedule_assign() call still overrides just
--   that one date without touching the others (owner: "default to all,
--   but might change at a session").
-- Depends on: bbb-foundation/030 (assigned_to/assigned_to_name columns,
--   gs_schedule_assign), operations-loop/012 (t_appointments)
-- Safe to re-run: Yes
-- Applied by: OWNER — project uwyqhzotluikawcboldr
-- ============================================================================

ALTER TABLE t_appointments
  ALTER COLUMN contract_id DROP NOT NULL,
  ALTER COLUMN event_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS group_session_occurrence_id UUID REFERENCES t_group_session_schedule(id) ON DELETE CASCADE;

ALTER TABLE t_appointments
  ADD CONSTRAINT chk_appointments_link_type CHECK (
    (event_id IS NOT NULL AND contract_id IS NOT NULL AND group_session_occurrence_id IS NULL)
    OR
    (event_id IS NULL AND contract_id IS NULL AND group_session_occurrence_id IS NOT NULL)
  );

CREATE UNIQUE INDEX IF NOT EXISTS uq_appointments_group_session_occurrence
  ON t_appointments (group_session_occurrence_id)
  WHERE is_active = true AND group_session_occurrence_id IS NOT NULL;

-- gs_schedule_assign: extended from 030 to also upsert the chair's
-- appointment (or soft-delete it, when p_assigned_to is NULL).
CREATE OR REPLACE FUNCTION public.gs_schedule_assign(p_tenant uuid, p_id uuid, p_assigned_to uuid, p_assigned_to_name text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_block uuid; v_live boolean; v_date date; v_appt_id uuid;
BEGIN
  SELECT source_block_id, is_live, occurrence_date INTO v_block, v_live, v_date
  FROM t_group_session_schedule WHERE id=p_id AND tenant_id=p_tenant;
  IF v_block IS NULL THEN RETURN jsonb_build_object('ok', false, 'reason', 'not_found'); END IF;

  IF p_assigned_to IS NULL THEN
    UPDATE t_group_session_schedule
      SET assigned_to=NULL, assigned_to_name=NULL, updated_at=now()
    WHERE id=p_id AND tenant_id=p_tenant;

    UPDATE t_appointments SET is_active=false, updated_at=now()
    WHERE group_session_occurrence_id=p_id AND is_active=true;

    RETURN gs_dash_occurrences(p_tenant, v_block, v_live);
  END IF;

  UPDATE t_group_session_schedule
    SET assigned_to=p_assigned_to, assigned_to_name=p_assigned_to_name, updated_at=now()
  WHERE id=p_id AND tenant_id=p_tenant;

  SELECT id INTO v_appt_id FROM t_appointments
  WHERE group_session_occurrence_id=p_id AND is_active=true;

  IF v_appt_id IS NULL THEN
    INSERT INTO t_appointments
      (tenant_id, group_session_occurrence_id, status, scheduled_at, assigned_to, assigned_to_name, is_live)
    VALUES
      (p_tenant, p_id, 'accepted', v_date::timestamptz, p_assigned_to, p_assigned_to_name, v_live);
  ELSE
    UPDATE t_appointments
    SET assigned_to=p_assigned_to, assigned_to_name=p_assigned_to_name, scheduled_at=v_date::timestamptz,
        status='accepted', version=version+1, last_activity_at=now(), updated_at=now()
    WHERE id=v_appt_id;
  END IF;

  RETURN gs_dash_occurrences(p_tenant, v_block, v_live);
END $function$;

-- New RPC: apply a chair as the default for every future occurrence of a
-- block in one call.
CREATE OR REPLACE FUNCTION public.gs_schedule_assign_default(p_tenant uuid, p_block uuid, p_is_live boolean, p_assigned_to uuid, p_assigned_to_name text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE r RECORD; v_count int := 0;
BEGIN
  FOR r IN
    SELECT id FROM t_group_session_schedule
    WHERE tenant_id=p_tenant AND source_block_id=p_block AND is_live=p_is_live
      AND occurrence_date >= current_date AND status <> 'cancelled'
  LOOP
    PERFORM gs_schedule_assign(p_tenant, r.id, p_assigned_to, p_assigned_to_name);
    v_count := v_count + 1;
  END LOOP;
  RETURN jsonb_build_object('ok', true, 'assigned_count', v_count, 'occurrences', (gs_dash_occurrences(p_tenant, p_block, p_is_live)->'occurrences'));
END $function$;
