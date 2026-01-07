-- ============================================================
-- Migration: 004_jtd_cron_jobs
-- Description: Cron jobs for JTD worker and cleanup
-- Date: 2025-01-08
-- 
-- Prerequisites:
--   - pg_cron extension enabled
--   - pg_net extension enabled  
--   - Vault secrets configured:
--     - SUPABASE_URL
--     - SUPABASE_SERVICE_ROLE_KEY
-- ============================================================

-- ============================================================
-- 1. ENABLE REQUIRED EXTENSIONS
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- ============================================================
-- 2. INVOKE JTD WORKER FUNCTION
-- ============================================================

CREATE OR REPLACE FUNCTION public.invoke_jtd_worker()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_supabase_url TEXT;
    v_service_role_key TEXT;
    v_request_id BIGINT;
BEGIN
    -- Get secrets from vault
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
$$;

-- ============================================================
-- 3. CLEANUP TOOL RESULTS FUNCTION (if not exists)
-- ============================================================

CREATE OR REPLACE FUNCTION public.cleanup_tool_results()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Clean up old pg_net responses (older than 24 hours)
    DELETE FROM net._http_response
    WHERE created < NOW() - INTERVAL '24 hours';
    
    -- Clean up completed requests older than 1 hour
    DELETE FROM net.http_request_queue
    WHERE created < NOW() - INTERVAL '1 hour';
    
    RAISE NOTICE 'Tool results cleanup completed at %', NOW();
END;
$$;

-- ============================================================
-- 4. SCHEDULE CRON JOBS
-- ============================================================

-- Remove any existing duplicate jobs first
DO $$
DECLARE
    v_job RECORD;
BEGIN
    -- Unschedule existing JTD worker jobs
    FOR v_job IN 
        SELECT jobid FROM cron.job 
        WHERE command LIKE '%invoke_jtd_worker%'
    LOOP
        PERFORM cron.unschedule(v_job.jobid);
    END LOOP;
    
    -- Unschedule existing cleanup jobs
    FOR v_job IN 
        SELECT jobid FROM cron.job 
        WHERE command LIKE '%cleanup_tool_results%'
    LOOP
        PERFORM cron.unschedule(v_job.jobid);
    END LOOP;
END $$;

-- Schedule JTD Worker - runs every minute
SELECT cron.schedule(
    'jtd-worker-every-minute',           -- job name
    '* * * * *',                          -- every minute
    'SELECT public.invoke_jtd_worker()'   -- command
);

-- Schedule Cleanup - runs every hour
SELECT cron.schedule(
    'cleanup-tool-results-hourly',        -- job name
    '0 * * * *',                          -- every hour at minute 0
    'SELECT public.cleanup_tool_results()'
);

-- ============================================================
-- 5. GRANT PERMISSIONS
-- ============================================================

GRANT EXECUTE ON FUNCTION public.invoke_jtd_worker TO postgres;
GRANT EXECUTE ON FUNCTION public.cleanup_tool_results TO postgres;

-- ============================================================
-- 6. VERIFY CRON JOBS
-- ============================================================

-- This is just for verification, not actual migration
DO $$
DECLARE
    v_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_count FROM cron.job WHERE active = true;
    RAISE NOTICE 'Active cron jobs: %', v_count;
END $$;

-- ============================================================
-- END OF MIGRATION
-- ============================================================