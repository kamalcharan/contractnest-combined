-- =============================================================================
-- Tenant Isolation — BATCH 2 (UP)
-- =============================================================================
-- (a) Enable RLS on t_business_groups. Model A (open directory): the existing
--     groups_select_active policy (USING is_active = true) keeps the BBB/VaNi
--     directory openly browsable; writes stay restricted to service_role via the
--     existing groups_insert/update/delete_service policies. Matches app behaviour
--     (business-groups edge fn lists all active groups with no tenant filter).
--
-- (b) Consolidate the 4 tables Batch 1 enabled onto the clean batch1_* policy set
--     by dropping legacy policies that are inert or buggy:
--       * category_*_tenant_isolation / *_policy  -> keyed on get_current_tenant_id()
--         (a GUC that is never set) or jwt.claims (no tenant_id claim) => evaluate
--         to NULL for authenticated => contribute nothing.
--       * memberships_select_own / _update_own / _select_group_members -> compare
--         tenant_id = auth.uid() (a TENANT id vs a USER id). Verified against live
--         data: 0/61 rows match => provably dead.
--     Net effect: each table is left with exactly batch1_tenant_member_select
--     (authenticated, own-tenant SELECT) + batch1_service_role_all (service bypass).
--
-- SAFETY / NON-BREAKING: app path is service_role (bypasses RLS); none of these
-- tables are browser-touched. Validated live via BEGIN/ROLLBACK and re-confirmed
-- on the committed state:
--     t_category_master : User A sees 5 / 146           (isolation preserved)
--     t_business_groups : User A sees 2 / 2 active       (directory stays open)
--     t_group_memberships: User A sees 1 / 61            (isolation correct)
--
-- NOTE: leads / leads_contractnest were intentionally left untouched (flagged as
-- drop candidates — to be handled as a separate deletion with confirmation).
-- =============================================================================

-- (a) t_business_groups -> Model A
ALTER TABLE public.t_business_groups ENABLE ROW LEVEL SECURITY;

-- (b) drop inert/buggy legacy policies (idempotent)
DROP POLICY IF EXISTS category_master_tenant_isolation      ON public.t_category_master;
DROP POLICY IF EXISTS category_master_insert_policy         ON public.t_category_master;
DROP POLICY IF EXISTS category_master_update_policy         ON public.t_category_master;
DROP POLICY IF EXISTS category_master_delete_policy         ON public.t_category_master;
DROP POLICY IF EXISTS category_details_tenant_isolation     ON public.t_category_details;
DROP POLICY IF EXISTS category_details_insert_policy        ON public.t_category_details;
DROP POLICY IF EXISTS category_details_update_policy        ON public.t_category_details;
DROP POLICY IF EXISTS category_details_delete_policy        ON public.t_category_details;
DROP POLICY IF EXISTS category_resources_master_policy      ON public.t_category_resources_master;
DROP POLICY IF EXISTS tenant_isolation                      ON public.t_category_resources_master;
DROP POLICY IF EXISTS memberships_select_group_members      ON public.t_group_memberships;
DROP POLICY IF EXISTS memberships_select_own                ON public.t_group_memberships;
DROP POLICY IF EXISTS memberships_update_own                ON public.t_group_memberships;
DROP POLICY IF EXISTS memberships_insert_service            ON public.t_group_memberships;
DROP POLICY IF EXISTS memberships_delete_service            ON public.t_group_memberships;
