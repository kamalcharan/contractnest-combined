-- ═══════════════════════════════════════════════════════════════
-- ONE-TIME MIGRATION: Process events for active contracts
-- that still have computed_events (never processed due to broken PGMQ trigger)
--
-- RUN THIS ONCE in Supabase SQL Editor
-- Safe to run multiple times — process_contract_events_from_computed is idempotent
-- ═══════════════════════════════════════════════════════════════

-- STEP 1: Preview — see which contracts have unprocessed events
SELECT
    id AS contract_id,
    tenant_id,
    name,
    status,
    record_type,
    jsonb_array_length(computed_events) AS pending_event_count,
    created_at
FROM t_contracts
WHERE status = 'active'
  AND is_active = true
  AND computed_events IS NOT NULL
  AND jsonb_array_length(computed_events) > 0
ORDER BY created_at;

-- ═══════════════════════════════════════════════════════════════
-- STEP 2: Process all pending events
-- Calls process_contract_events_from_computed() for each contract
-- This inserts events into t_contract_events and NULLs computed_events
-- ═══════════════════════════════════════════════════════════════

DO $$
DECLARE
    v_rec   RECORD;
    v_result JSONB;
    v_total  INT := 0;
    v_ok     INT := 0;
    v_fail   INT := 0;
BEGIN
    FOR v_rec IN
        SELECT id, tenant_id, name,
               jsonb_array_length(computed_events) AS event_count
        FROM t_contracts
        WHERE status = 'active'
          AND is_active = true
          AND computed_events IS NOT NULL
          AND jsonb_array_length(computed_events) > 0
    LOOP
        v_total := v_total + 1;

        BEGIN
            v_result := process_contract_events_from_computed(v_rec.id, v_rec.tenant_id);

            IF (v_result->>'success')::BOOLEAN THEN
                v_ok := v_ok + 1;
                RAISE NOTICE 'OK  [%] % — % events processed',
                    v_rec.id, v_rec.name, v_rec.event_count;
            ELSE
                v_fail := v_fail + 1;
                RAISE NOTICE 'FAIL [%] % — %',
                    v_rec.id, v_rec.name, v_result->>'error';
            END IF;
        EXCEPTION WHEN OTHERS THEN
            v_fail := v_fail + 1;
            RAISE NOTICE 'ERROR [%] % — %', v_rec.id, v_rec.name, SQLERRM;
        END;
    END LOOP;

    RAISE NOTICE '════════════════════════════════════════';
    RAISE NOTICE 'DONE — Total: %, Success: %, Failed: %', v_total, v_ok, v_fail;
    RAISE NOTICE '════════════════════════════════════════';
END;
$$;

-- ═══════════════════════════════════════════════════════════════
-- STEP 3: Verify — confirm no contracts have unprocessed events
-- ═══════════════════════════════════════════════════════════════

SELECT
    id AS contract_id,
    tenant_id,
    name,
    status,
    CASE
        WHEN computed_events IS NULL THEN 'PROCESSED (computed_events cleared)'
        WHEN jsonb_array_length(computed_events) = 0 THEN 'EMPTY (no events to process)'
        ELSE 'STILL PENDING — ' || jsonb_array_length(computed_events) || ' events'
    END AS event_status,
    (SELECT COUNT(*) FROM t_contract_events ce WHERE ce.contract_id = t_contracts.id) AS actual_event_count
FROM t_contracts
WHERE status = 'active'
  AND is_active = true
ORDER BY created_at;
