-- ═══════════════════════════════════════════════════════════════════════════
-- 074_rfq_persist_response_deadline.sql
--
-- 073 added t_contracts.response_deadline and returned it from the list, and
-- the RFQ wizard now sends it — but create_contract_transaction's INSERT never
-- set it, so it would silently stay NULL on every new RFQ.
--
-- This patches the LIVE definition of create_contract_transaction in place:
-- two unique anchors (the column list and the VALUES list) get response_deadline
-- inserted, and the migration ABORTS if either anchor is missing rather than
-- half-patching. The other ~13.5k characters are never retyped.
--
-- APPLIED TO PRODUCTION (uwyqhzotluikawcboldr) 30 Jul 2026. Verified: the
-- function now references response_deadline in both the column list and the
-- VALUES list. Idempotent-ish: re-running is safe (the anchors change after the
-- first run, so a second run aborts on "anchor not found" — which is the guard
-- working, not a failure). DO NOT re-apply.
--
-- NOTE: update_contract_transaction is NOT patched here — editing an RFQ draft's
-- deadline is a follow-up. Create is the path that matters for the deadline to
-- appear on new RFQs and light up the aging chip.
-- ═══════════════════════════════════════════════════════════════════════════

DO $mig$
DECLARE
    v_def TEXT;
    v_col_old TEXT := 'grace_period_value, grace_period_unit,';
    v_col_new TEXT := 'grace_period_value, grace_period_unit, response_deadline,';
    v_val_old TEXT := 'COALESCE((p_payload->>''grace_period_value'')::INTEGER, 0), p_payload->>''grace_period_unit'',';
    v_val_new TEXT := 'COALESCE((p_payload->>''grace_period_value'')::INTEGER, 0), p_payload->>''grace_period_unit'', (p_payload->>''response_deadline'')::DATE,';
BEGIN
    SELECT pg_get_functiondef(p.oid) INTO v_def
      FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname='public' AND p.proname='create_contract_transaction';

    IF v_def IS NULL THEN
        RAISE EXCEPTION '074: create_contract_transaction not found';
    END IF;
    IF position(v_col_old IN v_def) = 0 THEN
        RAISE EXCEPTION '074: column-list anchor not found — re-derive the patch';
    END IF;
    IF position(v_val_old IN v_def) = 0 THEN
        RAISE EXCEPTION '074: VALUES anchor not found — re-derive the patch';
    END IF;

    v_def := replace(v_def, v_col_old, v_col_new);
    v_def := replace(v_def, v_val_old, v_val_new);
    EXECUTE v_def;
END
$mig$;
