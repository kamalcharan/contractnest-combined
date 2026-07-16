# Sprint 1 (b) — Migration draft (REVIEW BEFORE APPLY)

Status: DRAFT — nothing here has been applied. Apply via Supabase MCP
(`apply_migration`) file-by-file after founder review, in order.

## Ground truth this draft is built on (verified 16 Jul 2026)
- `create_contract_transaction(p_payload jsonb)` / `update_contract_transaction`
  insert NAMED columns → they must be extended to read the three discount
  fields from the payload (file 001, step 2 — regenerate from the LIVE
  function body at apply time, do not paste from memory).
- Covered assets are NOT normalized today: `t_contract_assets` exists but has
  0 rows; the wizard's asset picks live in
  `t_contracts.metadata->'wizard_state'->'equipmentDetails'` (placeholders =
  entries with `asset_registry_id: null`). The generator reads from there
  (spec: asset_ref = equipment_details entry id / asset_registry_id).
- Events materialize on activation via trg_queue_contract_events →
  process_contract_events_from_computed. The asset-row generator piggybacks
  the same transition with an alphabetically-later trigger name
  (PG fires same-event triggers in name order).

## Files
1. `001_discounts.sql` — t_contracts discount columns (+ RPC extension notes)
2. `002_event_assets.sql` — t_contract_event_assets + activation generator + trigger
3. `003_backfill.sql` — backfill for existing ACTIVE contracts (see open question)
4. `rollback.sql` — full reverse order rollback
5. `sprint1_acceptance.sql` — acceptance queries per the sprint spec

## OPEN QUESTION for founder (blocks 003 only)
Backfill scope: generate asset rows for PAST service events of active
contracts too, or FUTURE-only (scheduled_date >= today)? Draft defaults to
FUTURE-ONLY (past visits were never proven through this system; creating
overdue-looking rows for them would flood ops views). Flip the flag in 003.

## What this migration deliberately does NOT do
- No behavior change until step (c): columns are nullable, the new table
  is only written on NEW activations; nothing reads it yet.
- No RLS additions (t_* tables follow the existing service-role convention).
