-- =====================================================================
-- DEMO TENANT SETUP — Script 99: FULL ROLLBACK
-- Removes the 7 demo tenants and every row created by scripts 01-06.
-- All demo rows are identifiable by the fixed tenant UUIDs
-- c0000000-0000-4000-8000-000000000001 … 007 (and auth users a0000000-…).
-- Safe to run repeatedly. Does not touch any other tenant.
-- =====================================================================
DO $$
DECLARE
  v_tenants uuid[] := ARRAY(
    SELECT ('c0000000-0000-4000-8000-00000000000' || n)::uuid FROM generate_series(1,7) n);
  v_users uuid[] := ARRAY(
    SELECT ('a0000000-0000-4000-8000-00000000000' || n)::uuid FROM generate_series(1,7) n);
  t text;
  v_tables text[] := ARRAY[
    -- contract graph first
    't_contract_events', 't_contract_access', 't_contract_blocks', 't_contracts',
    -- business data
    't_client_asset_registry',
    -- contacts (children via contact_id below)
    't_contacts',
    -- catalog & seeds
    'm_cat_blocks', 't_seed_logs',
    -- onboarding & profile state
    't_tenant_selected_resources', 't_tenant_served_industries', 't_tenant_onboarding',
    't_tenant_profiles', 't_category_details', 't_category_master',
    't_tenant_cadence_settings', 't_tenant_holiday_dates',
    'm_event_status_transitions', 'm_event_status_config',
    -- membership
    't_user_tenants', 't_tenants'
  ];
BEGIN
  -- contact children (no tenant_id on channel/address tables)
  DELETE FROM t_contact_channels  ch USING t_contacts c WHERE ch.contact_id = c.id AND c.tenant_id = ANY(v_tenants);
  DELETE FROM t_contact_addresses ad USING t_contacts c WHERE ad.contact_id = c.id AND c.tenant_id = ANY(v_tenants);
  -- role links (keyed by user_tenant)
  DELETE FROM t_user_tenant_roles r USING t_user_tenants ut WHERE r.user_tenant_id = ut.id AND ut.tenant_id = ANY(v_tenants);
  -- vendor contacts auto-created in OTHER tenants by cnak claims (none expected, but safe)
  DELETE FROM t_contacts WHERE source_tenant_id = ANY(v_tenants) AND source = 'cnak_claim';

  FOREACH t IN ARRAY v_tables LOOP
    IF to_regclass('public.' || t) IS NOT NULL THEN
      EXECUTE format('DELETE FROM %I WHERE tenant_id = ANY($1)', t) USING v_tenants;
    END IF;
  END LOOP;

  -- users
  DELETE FROM t_user_profiles WHERE user_id = ANY(v_users);
  DELETE FROM auth.identities WHERE user_id = ANY(v_users);
  DELETE FROM auth.users WHERE id = ANY(v_users);
END $$;
