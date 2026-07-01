-- =============================================================================
-- Tenant Isolation — BATCH 3 (UP)
-- Lock always-true WRITE grants on backend-only tables.
-- =============================================================================
-- These 5 tables are written only via service_role (API/edge), never by the
-- browser (verified: no UI .from() writes). Removing the authenticated/anon/
-- public "USING/CHECK true" write policies is therefore non-breaking — service_role
-- bypasses RLS. Properly-scoped policies (tenant-admin, membership, service_role,
-- super-admin) are LEFT INTACT.
--
-- Validated live via BEGIN/ROLLBACK: 0 always-true write policies remain for
-- anon/authenticated/public on these tables afterward.
--
-- NOTE (not in this batch): t_campaigns / t_campaign_leads still have SELECT
-- USING true for authenticated (open read). Feature is unused (0 rows); folded
-- into a later read-tightening pass.
-- =============================================================================

-- t_bm_pricing_plan — any authenticated user could insert/update pricing plans
DROP POLICY IF EXISTS allow_insert_plans ON public.t_bm_pricing_plan;
DROP POLICY IF EXISTS allow_update_plans ON public.t_bm_pricing_plan;

-- t_campaign_leads — open insert/update/delete (anon + authenticated)
DROP POLICY IF EXISTS leads_delete_policy      ON public.t_campaign_leads;
DROP POLICY IF EXISTS leads_insert_policy_anon ON public.t_campaign_leads;
DROP POLICY IF EXISTS leads_insert_policy_auth ON public.t_campaign_leads;
DROP POLICY IF EXISTS leads_update_policy      ON public.t_campaign_leads;

-- t_campaigns — open insert/update/delete (authenticated)
DROP POLICY IF EXISTS campaigns_delete_policy ON public.t_campaigns;
DROP POLICY IF EXISTS campaigns_insert_policy ON public.t_campaigns;
DROP POLICY IF EXISTS campaigns_update_policy ON public.t_campaigns;

-- t_contract_payment_events — policies NAMED "Service role can..." but actually
-- applied to PUBLIC with true (any anon/authenticated could write payment events)
DROP POLICY IF EXISTS "Service role can insert payment events" ON public.t_contract_payment_events;
DROP POLICY IF EXISTS "Service role can update payment events" ON public.t_contract_payment_events;

-- t_tax_settings — ALL-roles USING/CHECK true (full open access to tax config)
DROP POLICY IF EXISTS service_role_bypass_rls_tax_settings ON public.t_tax_settings;
