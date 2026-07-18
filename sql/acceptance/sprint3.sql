-- ============================================================================
-- Sprint 3 Acceptance — Contract View: real items, per-asset grain
-- ============================================================================
-- Per CONTRACTNEST_SPRINT_SPEC.md Sprint 3: "DB completeness is the
-- acceptance bar" — every write path must land a row where expected.
-- Run each query against a test contract that has:
--   - at least one placeholder equipment_details entry (asset_registry_id
--     null, specifications.placeholder = true) on an ACTIVE contract
--   - the "Attach Asset" action performed once via the contract detail
--     Equipment tab (seller or buyer) against that placeholder
-- ============================================================================

-- 1. The contract has t_contract_event_assets rows at all (proves
--    generate_contract_event_assets ran off the real equipment_details
--    column, not the stale metadata.wizard_state path).
-- Expected: row count > 0 for an active contract with covered assets.
select contract_id, count(*) as event_asset_rows
from t_contract_event_assets
where contract_id = :contract_id
  and is_active
group by contract_id;

-- 2. Attach-asset flipped the right rows out of blocked_placeholder.
-- Expected: zero rows remain 'blocked_placeholder' for the asset_ref that
-- was just attached (:new_asset_ref = the real asset_registry_id used in
-- the attach action).
select status, count(*)
from t_contract_event_assets
where contract_id = :contract_id
  and asset_ref = :new_asset_ref
  and is_active
group by status;
-- FAIL if any row here still shows 'blocked_placeholder'.

-- 3. The old placeholder ref no longer has any rows (they were re-pointed,
--    not duplicated) — proves unlock_placeholder_event_assets updated
--    asset_ref in place rather than the attach path leaving orphan rows.
select count(*) as orphan_rows_for_old_placeholder
from t_contract_event_assets
where contract_id = :contract_id
  and asset_ref = :old_placeholder_ref
  and is_active;
-- Expected: 0.

-- 4. equipment_details itself was updated in place (same item id, now a
--    real asset_registry_id) — not appended as a duplicate entry.
select jsonb_array_length(equipment_details) as equipment_item_count,
       equipment_details
from t_contracts
where id = :contract_id;
-- Expected: item count UNCHANGED from before the attach action; the item
-- with id = :replaced_item_id now has asset_registry_id = :new_asset_ref
-- and specifications no longer has "placeholder": true.

-- 5. No other write path was introduced this sprint — this is a read-mostly
-- sprint per spec ("no new write actions" except attach-asset). Spot-check
-- that the only rows touched by the attach action are equipment_details
-- (on t_contracts) and t_contract_event_assets; nothing else should have
-- an updated_at newer than the attach action's timestamp for this contract.
select 'contracts' as table_name, updated_at from t_contracts where id = :contract_id
union all
select 'contract_blocks', max(updated_at) from t_contract_blocks where contract_id = :contract_id
union all
select 'contract_events', max(updated_at) from t_contract_events where contract_id = :contract_id
union all
select 'contract_history', max(created_at) from t_contract_history where contract_id = :contract_id
order by 2 desc;
-- Expected: only t_contracts.updated_at reflects the attach action's
-- timestamp; the others should predate it (attach-asset is not supposed
-- to touch blocks/events/history).
