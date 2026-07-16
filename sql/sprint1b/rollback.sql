-- Sprint 1(b) rollback — reverse order
DROP TRIGGER IF EXISTS trg_zz_generate_event_assets ON t_contracts;
DROP FUNCTION IF EXISTS trg_fn_generate_event_assets();
DROP FUNCTION IF EXISTS unlock_placeholder_event_assets(uuid, uuid, text, text);
DROP FUNCTION IF EXISTS generate_contract_event_assets(uuid, uuid);
DROP TABLE IF EXISTS t_contract_event_assets;
ALTER TABLE t_contracts
  DROP COLUMN IF EXISTS discount_type,
  DROP COLUMN IF EXISTS discount_value,
  DROP COLUMN IF EXISTS discount_total;
-- RPC extensions: restore prior function bodies from the pre-apply
-- pg_get_functiondef snapshots taken at apply time.
