-- ============================================================
-- Migration: 007_fix_pgmq_permissions
-- Description: Fix PGMQ permission issue - add SECURITY DEFINER to trigger function
-- Author: Claude
-- Date: 2025-12-18
-- Issue: "permission denied for schema pgmq" when inserting into n_jtd
-- ============================================================

-- ============================================================
-- 1. FIX TRIGGER FUNCTION: Add SECURITY DEFINER
-- ============================================================

-- The original function was missing SECURITY DEFINER, causing
-- "permission denied for schema pgmq" error when authenticated
-- users insert into n_jtd table.

CREATE OR REPLACE FUNCTION public.jtd_enqueue_on_insert()
RETURNS TRIGGER AS $$
DECLARE
    v_message JSONB;
BEGIN
    -- Only enqueue if status is 'created' (initial state)
    IF NEW.status_code = 'created' THEN
        -- Build message payload
        v_message := jsonb_build_object(
            'jtd_id', NEW.id,
            'tenant_id', NEW.tenant_id,
            'event_type_code', NEW.event_type_code,
            'channel_code', NEW.channel_code,
            'source_type_code', NEW.source_type_code,
            'priority', NEW.priority,
            'scheduled_at', NEW.scheduled_at,
            'recipient_contact', NEW.recipient_contact,
            'is_live', NEW.is_live,
            'created_at', NEW.created_at
        );

        -- Send to queue
        PERFORM pgmq.send('jtd_queue', v_message);

        -- Update status to 'pending' (queued)
        NEW.status_code := 'pending';
        NEW.status_changed_at := NOW();
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.jtd_enqueue_on_insert IS 'Automatically enqueue JTD to PGMQ on insert (runs with elevated privileges)';

-- ============================================================
-- 2. GRANT USAGE ON PGMQ SCHEMA (belt and suspenders)
-- ============================================================

-- Grant usage on pgmq schema to authenticated and service_role
-- This is a backup measure in case SECURITY DEFINER isn't sufficient

GRANT USAGE ON SCHEMA pgmq TO authenticated;
GRANT USAGE ON SCHEMA pgmq TO service_role;

-- Grant execute on pgmq functions
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA pgmq TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA pgmq TO service_role;

-- Grant select/insert on pgmq queue tables (created by pgmq.create())
GRANT SELECT, INSERT, UPDATE, DELETE ON pgmq.q_jtd_queue TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON pgmq.q_jtd_queue TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON pgmq.q_jtd_dlq TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON pgmq.q_jtd_dlq TO service_role;

-- Grant on pgmq meta table
GRANT SELECT ON pgmq.meta TO authenticated;
GRANT SELECT ON pgmq.meta TO service_role;

-- ============================================================
-- 3. VERIFY FIX
-- ============================================================

-- You can verify the fix by running:
-- SELECT prosecdef FROM pg_proc WHERE proname = 'jtd_enqueue_on_insert';
-- Should return 't' (true) indicating SECURITY DEFINER is set

-- ============================================================
-- END OF MIGRATION
-- ============================================================
