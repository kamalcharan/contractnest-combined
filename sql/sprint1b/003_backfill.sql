-- ============================================================================
-- Sprint 1(b) · 003 — Backfill for EXISTING active contracts
-- ⚠ OPEN QUESTION (founder): past events too, or future-only?
--   Default below = FUTURE-ONLY. For all events, remove the date predicate.
-- ============================================================================
DO $$
DECLARE r record; v integer := 0; total integer := 0;
BEGIN
  FOR r IN SELECT id, tenant_id FROM t_contracts WHERE status = 'active' AND is_active LOOP
    -- FUTURE-ONLY guard lives inside a tweaked call: reuse the generator, then
    -- prune past-event rows it created (simplest reviewable form).
    v := generate_contract_event_assets(r.id, r.tenant_id);
    total := total + v;
  END LOOP;
  -- FUTURE-ONLY: drop rows for events already in the past (delete-safe: the
  -- table is brand new; nothing references these rows yet).
  DELETE FROM t_contract_event_assets cea
  USING t_contract_events e
  WHERE e.id = cea.event_id AND e.scheduled_date < current_date;
  RAISE NOTICE 'Backfill inserted % rows (before future-only prune)', total;
END $$;
