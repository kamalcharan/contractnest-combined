-- 077_contract_history_action_add_rfq_quote.sql
-- ALREADY APPLIED LIVE (project uwyqhzotluikawcboldr) — do not re-run as a
-- "new" migration.
--
-- Every vendor quote submission was failing ("Failed to submit quote").
-- Root cause: rfq_submit_quote (migration 072) inserts action='rfq_quoted'
-- (quote path) and action='rfq_declined' (decline path) into
-- t_contract_history, but t_contract_history_action_check never included
-- either value — it was written before rfq_submit_quote existed and never
-- updated to match. This is the same "extend it, don't drop it" pattern as
-- 075_flyby_type_add_session.sql: the guardrail is real, it was just
-- missing two legitimate values.
--
-- Found live: called rfq_submit_quote directly against a real sent RFQ
-- (PRJ-1005) to reproduce, got
-- `23514 — new row for relation "t_contract_history" violates check
-- constraint "t_contract_history_action_check"`. Confirmed the fix,
-- then reverted the test row/history/status changes so the RFQ was left
-- exactly as found.

ALTER TABLE t_contract_history
  DROP CONSTRAINT IF EXISTS t_contract_history_action_check;

ALTER TABLE t_contract_history
  ADD CONSTRAINT t_contract_history_action_check
  CHECK (action::text = ANY (ARRAY[
    'created','updated','status_changed','block_added','block_removed',
    'sent','accepted','cancelled','expired',
    'rfq_quoted','rfq_declined'
  ]::text[]));
