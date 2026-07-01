-- =============================================================================
-- Tenant Isolation — BATCH 2 (DOWN / rollback)
-- =============================================================================
-- Reverses the meaningful, behaviour-changing part of Batch 2:
--   * DISABLE RLS on t_business_groups (returns it to its pre-batch2 state).
--
-- The consolidation drops in part (b) removed policies that were provably INERT
-- or BUGGY (GUC/jwt keyed against unset values, or tenant_id = auth.uid() which
-- matched 0/61 rows). Dropping them changed NO row visibility (validated), so
-- there is nothing functional to restore. They are intentionally NOT recreated.
-- The affected tables remain correctly protected by the batch1_* policies
-- (own-tenant SELECT + service_role bypass) applied in Batch 1.
-- =============================================================================

ALTER TABLE public.t_business_groups DISABLE ROW LEVEL SECURITY;
