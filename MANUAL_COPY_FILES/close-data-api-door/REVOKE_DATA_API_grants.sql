-- =============================================================================
-- CLOSE DOOR B — revoke anon/authenticated grants on the public schema
-- =============================================================================
-- PREREQUISITE: all client-side supabase.from() calls must already be moved to
-- the API and deployed (see COPY_INSTRUCTIONS.txt A–E). Verify first:
--     grep -rnE "\.(from|rpc)\(['\"]" contractnest-ui/src   -> expect none
--
-- Effect: the PostgREST Data API (https://<ref>.supabase.co/rest/v1/...) will
-- return permission-denied for anon/authenticated on ALL public tables. Your
-- API/edge (service_role) is unaffected. Supabase Auth/GoTrue is unaffected
-- (separate schema/endpoint). Fully reversible via the RE-GRANT block below.
--
-- Apply in TWO STAGES with app testing between them.
-- =============================================================================

-- ---- STAGE 1: revoke anon (anonymous visitors) --------------------------------
REVOKE ALL PRIVILEGES ON ALL TABLES    IN SCHEMA public FROM anon;
REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public FROM anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES    FROM anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon;
-- >>> TEST: landing/playground/early-access lead forms, forgot-password (logged out).

-- ---- STAGE 2: revoke authenticated (logged-in users) --------------------------
REVOKE ALL PRIVILEGES ON ALL TABLES    IN SCHEMA public FROM authenticated;
REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public FROM authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES    FROM authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM authenticated;
-- >>> TEST: full app while logged in — dashboard, contracts, catalog, lock screen,
--     create-tenant name check, settings, etc. Everything routes via the API, so
--     nothing should 403.

-- ---- VERIFY: no table privileges remain for anon/authenticated ----------------
-- Expect 0 rows:
--   SELECT grantee, count(*) FROM information_schema.role_table_grants
--   WHERE table_schema='public' AND grantee IN ('anon','authenticated')
--   GROUP BY grantee;

-- =============================================================================
-- ROLLBACK (re-open Door B) — restores the Supabase default grants
-- =============================================================================
-- GRANT ALL ON ALL TABLES    IN SCHEMA public TO anon, authenticated;
-- GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
-- ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES    TO anon, authenticated;
-- ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated;

-- NOTE (functions): no client-side supabase.rpc() calls were found, so EXECUTE on
-- public functions could also be revoked from anon/authenticated for completeness.
-- Left out here to avoid touching any GoTrue/Realtime-adjacent helpers; do it as a
-- separate, tested follow-up if you want the schema fully sealed.
