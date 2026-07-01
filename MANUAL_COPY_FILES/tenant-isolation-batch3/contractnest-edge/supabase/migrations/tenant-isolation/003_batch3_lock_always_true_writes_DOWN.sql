-- =============================================================================
-- Tenant Isolation — BATCH 3 (DOWN / rollback)
-- Recreates the always-true write policies dropped by the UP migration,
-- restoring the exact pre-batch3 state. (These grants are insecure — restore
-- only if a rollback is genuinely required.)
-- =============================================================================

-- t_bm_pricing_plan
CREATE POLICY allow_insert_plans ON public.t_bm_pricing_plan
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY allow_update_plans ON public.t_bm_pricing_plan
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- t_campaign_leads
CREATE POLICY leads_delete_policy ON public.t_campaign_leads
  FOR DELETE TO authenticated USING (true);
CREATE POLICY leads_insert_policy_anon ON public.t_campaign_leads
  FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY leads_insert_policy_auth ON public.t_campaign_leads
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY leads_update_policy ON public.t_campaign_leads
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- t_campaigns
CREATE POLICY campaigns_delete_policy ON public.t_campaigns
  FOR DELETE TO authenticated USING (true);
CREATE POLICY campaigns_insert_policy ON public.t_campaigns
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY campaigns_update_policy ON public.t_campaigns
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- t_contract_payment_events (original policies were TO public with true)
CREATE POLICY "Service role can insert payment events" ON public.t_contract_payment_events
  FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Service role can update payment events" ON public.t_contract_payment_events
  FOR UPDATE TO public USING (true);

-- t_tax_settings
CREATE POLICY service_role_bypass_rls_tax_settings ON public.t_tax_settings
  FOR ALL TO public USING (true) WITH CHECK (true);
