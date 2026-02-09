-- ============================================================================
-- Migration 020: Add task_id Column + Backfill Existing Events
-- ============================================================================
-- Purpose:
--   1. Add task_id column to t_contract_events
--   2. Generate TSK-XXXXX for all existing events (per tenant, ordered by created_at)
--   3. Advance sequence counter in t_category_details so new events don't clash
-- Format: TSK-XXXXX (prefix=TSK, separator=-, padding=5, start=10001)
-- Safe to re-run: Yes (only updates rows where task_id IS NULL)
-- ============================================================================

-- Step 1: Add task_id column if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 't_contract_events' AND column_name = 'task_id'
    ) THEN
        ALTER TABLE t_contract_events ADD COLUMN task_id TEXT;
        RAISE NOTICE 'Added task_id column to t_contract_events';
    ELSE
        RAISE NOTICE 'task_id column already exists, skipping ALTER';
    END IF;
END;
$$;

-- Step 2: Backfill task_ids using a single UPDATE with window function
-- Assigns sequential TSK-XXXXX per tenant, ordered by created_at
UPDATE t_contract_events e
SET task_id = 'TSK-' || LPAD((n.seq_num)::TEXT, 5, '0')
FROM (
    SELECT
        id,
        (ROW_NUMBER() OVER (PARTITION BY tenant_id ORDER BY created_at, id) + 10000)::INT AS seq_num
    FROM t_contract_events
    WHERE task_id IS NULL
) n
WHERE e.id = n.id;

-- Step 3: Advance the TASK sequence counter in t_category_details
-- so new auto-generated task_ids don't collide with backfilled ones
DO $$
DECLARE
    v_rec RECORD;
BEGIN
    FOR v_rec IN
        SELECT
            tenant_id,
            COUNT(*) + 10001 AS next_val
        FROM t_contract_events
        WHERE task_id IS NOT NULL
        GROUP BY tenant_id
    LOOP
        UPDATE t_category_details
        SET form_settings = jsonb_set(
            COALESCE(form_settings, '{}'::JSONB),
            '{start_value}',
            to_jsonb(v_rec.next_val)
        )
        WHERE tenant_id = v_rec.tenant_id
          AND sub_cat_name = 'TASK'
          AND COALESCE((form_settings->>'start_value')::INT, 10001) < v_rec.next_val;
    END LOOP;
END;
$$;

-- Step 4: Create index on task_id for lookups
CREATE INDEX IF NOT EXISTS idx_contract_events_task_id
    ON t_contract_events (task_id)
    WHERE task_id IS NOT NULL;

-- Step 5: Create unique index per tenant to prevent duplicate task_ids
CREATE UNIQUE INDEX IF NOT EXISTS idx_contract_events_tenant_task_id
    ON t_contract_events (tenant_id, task_id)
    WHERE task_id IS NOT NULL;
