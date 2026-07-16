-- ============================================================================
-- Sprint 1(b) · 001 — Contract-level discount persistence
-- Safe: all columns nullable; nothing reads them until step (c) ships.
-- ============================================================================

ALTER TABLE t_contracts
  ADD COLUMN IF NOT EXISTS discount_type  varchar(10)
    CHECK (discount_type IN ('percent', 'amount')),
  ADD COLUMN IF NOT EXISTS discount_value numeric(14,2),
  ADD COLUMN IF NOT EXISTS discount_total numeric(14,2);

COMMENT ON COLUMN t_contracts.discount_type  IS 'Sprint1(b): contract-level discount kind (percent|amount); null = no discount';
COMMENT ON COLUMN t_contracts.discount_value IS 'Sprint1(b): the entered value (e.g. 10 for 10%, or 500 for ₹500)';
COMMENT ON COLUMN t_contracts.discount_total IS 'Sprint1(b): computed absolute discount in contract currency (auditable even for percent)';

-- ----------------------------------------------------------------------------
-- STEP 2 (apply-time task, NOT in this file):
-- Extend create_contract_transaction + update_contract_transaction:
--   • add discount_type, discount_value, discount_total to the INSERT/UPDATE
--     column lists,
--   • read them as  p_payload->>'discount_type',
--     (p_payload->>'discount_value')::numeric, (p_payload->>'discount_total')::numeric.
-- ⚠ Regenerate each function with `pg_get_functiondef` from the LIVE database
-- immediately before editing — other streams change these RPCs; never apply
-- a body drafted from an old snapshot (stale-base rule).
-- ----------------------------------------------------------------------------
