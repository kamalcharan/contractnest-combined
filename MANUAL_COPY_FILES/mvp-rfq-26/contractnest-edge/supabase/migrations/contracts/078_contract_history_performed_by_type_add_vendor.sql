-- 078_contract_history_performed_by_type_add_vendor.sql
-- ALREADY APPLIED LIVE (project uwyqhzotluikawcboldr) — do not re-run as a
-- "new" migration.
--
-- Second half of the same "Failed to submit quote" bug fixed by 077: after
-- extending action to allow 'rfq_quoted'/'rfq_declined', the same insert
-- in rfq_submit_quote still failed —
-- `23514 — new row for relation "t_contract_history" violates check
-- constraint "t_contract_history_performed_by_type_check"` — because that
-- function stamps performed_by_type='vendor' (a vendor is a contact, not a
-- tenant user), and the constraint only ever allowed
-- 'user' / 'system' / 'vani'. Same root cause as 077: the constraint
-- predates rfq_submit_quote and was never updated for it.
--
-- Verified live end-to-end after this fix: rfq_submit_quote succeeded
-- (response_status -> 'quoted'), then the test submission was reverted
-- (t_contract_vendors, t_contract_access, t_contracts.status, and the two
-- t_contract_history rows it created) so the RFQ was left exactly as
-- found.

ALTER TABLE t_contract_history
  DROP CONSTRAINT IF EXISTS t_contract_history_performed_by_type_check;

ALTER TABLE t_contract_history
  ADD CONSTRAINT t_contract_history_performed_by_type_check
  CHECK (performed_by_type::text = ANY (ARRAY[
    'user','system','vani','vendor'
  ]::text[]));
