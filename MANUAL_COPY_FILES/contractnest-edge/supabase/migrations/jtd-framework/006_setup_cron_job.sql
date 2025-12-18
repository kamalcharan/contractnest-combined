-- ============================================================
-- Migration: 006_setup_cron_job
-- Description: Setup pg_cron job to invoke jtd-worker Edge Function
-- Author: Claude
-- Date: 2025-12-18
-- Prereq: pg_cron and pg_net extensions activated
-- ============================================================

-- ============================================================
-- 1. ENABLE EXTENSIONS (if not already enabled)
-- ============================================================

-- pg_cron should be enabled in Supabase Dashboard > Database > Extensions
-- pg_net should be enabled in Supabase Dashboard > Database > Extensions

-- ============================================================
-- 2. CREATE FUNCTION TO INVOKE JTD WORKER
-- ============================================================

-- This function uses pg_net to make HTTP request to jtd-worker Edge Function
CREATE OR REPLACE FUNCTION public.invoke_jtd_worker()
RETURNS void AS $$
DECLARE
    v_supabase_url TEXT;
    v_service_role_key TEXT;
    v_request_id BIGINT;
BEGIN
    -- Get secrets from vault (using existing secret names)
    SELECT decrypted_secret INTO v_supabase_url
    FROM vault.decrypted_secrets
    WHERE name = 'SUPABASE_URL'
    LIMIT 1;

    SELECT decrypted_secret INTO v_service_role_key
    FROM vault.decrypted_secrets
    WHERE name = 'SUPABASE_SERVICE_ROLE_KEY'
    LIMIT 1;

    -- Make HTTP request to jtd-worker Edge Function
    IF v_supabase_url IS NOT NULL AND v_service_role_key IS NOT NULL THEN
        SELECT net.http_post(
            url := v_supabase_url || '/functions/v1/jtd-worker',
            headers := jsonb_build_object(
                'Authorization', 'Bearer ' || v_service_role_key,
                'Content-Type', 'application/json'
            ),
            body := '{}'::jsonb
        ) INTO v_request_id;

        RAISE NOTICE 'JTD Worker invoked, request_id: %', v_request_id;
    ELSE
        RAISE WARNING 'Cannot invoke JTD Worker: Supabase URL or Service Role Key not configured';
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.invoke_jtd_worker IS 'Invokes JTD Worker Edge Function via pg_net';

-- ============================================================
-- 3. CREATE CRON JOB (runs every 30 seconds)
-- ============================================================

-- Remove existing job if it exists
SELECT cron.unschedule('jtd-worker-cron')
WHERE EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'jtd-worker-cron'
);

-- Schedule job to run every 30 seconds
-- Note: pg_cron minimum interval is 1 minute, so we use a workaround
-- For more frequent polling, consider using Supabase scheduled functions

SELECT cron.schedule(
    'jtd-worker-cron',           -- job name
    '* * * * *',                 -- every minute
    'SELECT public.invoke_jtd_worker();'
);

-- ============================================================
-- 4. ALTERNATIVE: Database Webhook Trigger (Real-time)
-- ============================================================

-- For real-time processing, you can use a database webhook instead of cron.
-- This triggers jtd-worker immediately when a message is queued.
--
-- To set this up in Supabase Dashboard:
-- 1. Go to Database > Webhooks
-- 2. Create new webhook:
--    - Name: jtd-queue-webhook
--    - Table: pgmq.q_jtd_queue
--    - Events: INSERT
--    - URL: https://your-project.supabase.co/functions/v1/jtd-worker
--    - HTTP Headers: Authorization: Bearer <service_role_key>

-- ============================================================
-- 5. VAULT SECRETS (already configured)
-- ============================================================

-- This migration uses existing vault secrets:
-- - SUPABASE_URL
-- - SUPABASE_SERVICE_ROLE_KEY
-- No additional configuration needed.

-- ============================================================
-- 6. MANUAL TEST FUNCTION
-- ============================================================

-- Function to manually test JTD queue processing
CREATE OR REPLACE FUNCTION public.test_jtd_worker()
RETURNS TABLE (
    queue_length BIGINT,
    messages_sample JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        (SELECT count(*) FROM pgmq.q_jtd_queue)::BIGINT as queue_length,
        (SELECT jsonb_agg(message) FROM (SELECT message FROM pgmq.q_jtd_queue LIMIT 5) sub) as messages_sample;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.test_jtd_worker IS 'Test function to check JTD queue status';

-- ============================================================
-- END OF MIGRATION
-- ============================================================
