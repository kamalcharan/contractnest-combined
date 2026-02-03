-- ============================================================================
-- Admin Tenant Data Operations - RPC Functions
-- Purpose: Data summary, reset test data, reset all data, close account
-- ============================================================================

-- ============================================================================
-- 1. GET TENANT DATA SUMMARY
-- Returns row counts per table for a specific tenant, grouped by category
-- Used by the admin drawer to show data breakdown before delete operations
-- ============================================================================
CREATE OR REPLACE FUNCTION get_tenant_data_summary(p_tenant_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tenant_name text;
  v_workspace_code text;
  v_categories jsonb;
  v_total integer := 0;
  -- Counts
  c_contacts integer;
  c_contact_addresses integer;
  c_contact_channels integer;
  c_user_tenants integer;
  c_user_invitations integer;
  c_tenant_files integer;
  c_catalog_items integer;
  c_catalog_resources integer;
  c_catalog_categories integer;
  c_catalog_industries integer;
  c_catalog_resource_pricing integer;
  c_catalog_service_resources integer;
  c_category_details integer;
  c_category_master integer;
  c_tenant_profiles integer;
  c_tax_settings integer;
  c_tax_rates integer;
  c_tax_info integer;
  c_tenant_domains integer;
  c_tenant_regions integer;
  c_tenant_integrations integer;
  c_role_permissions integer;
  c_bm_tenant_subscription integer;
  c_bm_subscription_usage integer;
BEGIN
  -- Get tenant info
  SELECT name, workspace_code INTO v_tenant_name, v_workspace_code
  FROM t_tenants WHERE id = p_tenant_id;

  IF v_tenant_name IS NULL THEN
    RETURN jsonb_build_object('error', 'Tenant not found');
  END IF;

  -- Category 1: Contacts & Relationships
  SELECT COUNT(*) INTO c_contacts FROM t_contacts WHERE tenant_id = p_tenant_id;
  SELECT COUNT(*) INTO c_contact_addresses FROM t_contact_addresses WHERE contact_id IN (SELECT id FROM t_contacts WHERE tenant_id = p_tenant_id);
  SELECT COUNT(*) INTO c_contact_channels FROM t_contact_channels WHERE contact_id IN (SELECT id FROM t_contacts WHERE tenant_id = p_tenant_id);

  -- Category 2: Users & Team
  SELECT COUNT(*) INTO c_user_tenants FROM t_user_tenants WHERE tenant_id = p_tenant_id;
  SELECT COUNT(*) INTO c_user_invitations FROM t_user_invitations WHERE tenant_id = p_tenant_id;

  -- Category 3: Files & Documents
  SELECT COUNT(*) INTO c_tenant_files FROM t_tenant_files WHERE tenant_id = p_tenant_id;

  -- Category 4: Catalog & Services
  SELECT COUNT(*) INTO c_catalog_items FROM t_catalog_items WHERE tenant_id = p_tenant_id;
  SELECT COUNT(*) INTO c_catalog_resources FROM t_catalog_resources WHERE tenant_id = p_tenant_id;
  SELECT COUNT(*) INTO c_catalog_categories FROM t_catalog_categories WHERE tenant_id = p_tenant_id;
  SELECT COUNT(*) INTO c_catalog_industries FROM t_catalog_industries WHERE tenant_id = p_tenant_id;
  SELECT COUNT(*) INTO c_catalog_resource_pricing FROM t_catalog_resource_pricing WHERE tenant_id = p_tenant_id;
  SELECT COUNT(*) INTO c_catalog_service_resources FROM t_catalog_service_resources WHERE tenant_id = p_tenant_id;
  SELECT COUNT(*) INTO c_category_details FROM t_category_details WHERE tenant_id = p_tenant_id;
  SELECT COUNT(*) INTO c_category_master FROM t_category_master WHERE tenant_id = p_tenant_id;

  -- Category 5: Settings & Configuration
  SELECT COUNT(*) INTO c_tenant_profiles FROM t_tenant_profiles WHERE tenant_id = p_tenant_id;
  SELECT COUNT(*) INTO c_tax_settings FROM t_tax_settings WHERE tenant_id = p_tenant_id;
  SELECT COUNT(*) INTO c_tax_rates FROM t_tax_rates WHERE tenant_id = p_tenant_id;
  SELECT COUNT(*) INTO c_tax_info FROM t_tax_info WHERE tenant_id = p_tenant_id;
  SELECT COUNT(*) INTO c_tenant_domains FROM t_tenant_domains WHERE tenant_id = p_tenant_id;
  SELECT COUNT(*) INTO c_tenant_regions FROM t_tenant_regions WHERE tenant_id = p_tenant_id;
  SELECT COUNT(*) INTO c_tenant_integrations FROM t_tenant_integrations WHERE tenant_id = p_tenant_id::text;
  SELECT COUNT(*) INTO c_role_permissions FROM t_role_permissions WHERE tenant_id = p_tenant_id;

  -- Category 6: Subscription & Billing
  SELECT COUNT(*) INTO c_bm_tenant_subscription FROM t_bm_tenant_subscription WHERE tenant_id = p_tenant_id;
  SELECT COUNT(*) INTO c_bm_subscription_usage FROM t_bm_subscription_usage WHERE subscription_id IN (SELECT subscription_id FROM t_bm_tenant_subscription WHERE tenant_id = p_tenant_id);

  -- Calculate total
  v_total := c_contacts + c_contact_addresses + c_contact_channels
    + c_user_tenants + c_user_invitations
    + c_tenant_files
    + c_catalog_items + c_catalog_resources + c_catalog_categories + c_catalog_industries
    + c_catalog_resource_pricing + c_catalog_service_resources + c_category_details + c_category_master
    + c_tenant_profiles + c_tax_settings + c_tax_rates + c_tax_info
    + c_tenant_domains + c_tenant_regions + c_tenant_integrations + c_role_permissions
    + c_bm_tenant_subscription + c_bm_subscription_usage;

  -- Build categories array
  v_categories := jsonb_build_array(
    jsonb_build_object(
      'id', 'contacts',
      'label', 'Contacts & Relationships',
      'icon', 'Users',
      'color', '#3B82F6',
      'description', 'Business contacts, addresses, and communication channels',
      'totalCount', c_contacts + c_contact_addresses + c_contact_channels,
      'items', jsonb_build_array(
        jsonb_build_object('label', 'Contacts', 'count', c_contacts, 'table', 't_contacts'),
        jsonb_build_object('label', 'Addresses', 'count', c_contact_addresses, 'table', 't_contact_addresses'),
        jsonb_build_object('label', 'Channels', 'count', c_contact_channels, 'table', 't_contact_channels')
      )
    ),
    jsonb_build_object(
      'id', 'users',
      'label', 'Users & Team',
      'icon', 'UserPlus',
      'color', '#8B5CF6',
      'description', 'Team members, roles, and pending invitations',
      'totalCount', c_user_tenants + c_user_invitations,
      'items', jsonb_build_array(
        jsonb_build_object('label', 'Team Members', 'count', c_user_tenants, 'table', 't_user_tenants'),
        jsonb_build_object('label', 'Invitations', 'count', c_user_invitations, 'table', 't_user_invitations')
      )
    ),
    jsonb_build_object(
      'id', 'files',
      'label', 'Files & Documents',
      'icon', 'FileText',
      'color', '#10B981',
      'description', 'Uploaded files and documents',
      'totalCount', c_tenant_files,
      'items', jsonb_build_array(
        jsonb_build_object('label', 'Files', 'count', c_tenant_files, 'table', 't_tenant_files')
      )
    ),
    jsonb_build_object(
      'id', 'catalog',
      'label', 'Catalog & Services',
      'icon', 'Package',
      'color', '#F59E0B',
      'description', 'Products, services, categories, and pricing',
      'totalCount', c_catalog_items + c_catalog_resources + c_catalog_categories + c_catalog_industries
        + c_catalog_resource_pricing + c_catalog_service_resources + c_category_details + c_category_master,
      'items', jsonb_build_array(
        jsonb_build_object('label', 'Catalog Items', 'count', c_catalog_items, 'table', 't_catalog_items'),
        jsonb_build_object('label', 'Resources', 'count', c_catalog_resources, 'table', 't_catalog_resources'),
        jsonb_build_object('label', 'Categories', 'count', c_catalog_categories, 'table', 't_catalog_categories'),
        jsonb_build_object('label', 'Industries', 'count', c_catalog_industries, 'table', 't_catalog_industries'),
        jsonb_build_object('label', 'Pricing', 'count', c_catalog_resource_pricing, 'table', 't_catalog_resource_pricing'),
        jsonb_build_object('label', 'Service Resources', 'count', c_catalog_service_resources, 'table', 't_catalog_service_resources'),
        jsonb_build_object('label', 'Category Details', 'count', c_category_details, 'table', 't_category_details'),
        jsonb_build_object('label', 'Category Master', 'count', c_category_master, 'table', 't_category_master')
      )
    ),
    jsonb_build_object(
      'id', 'settings',
      'label', 'Settings & Configuration',
      'icon', 'Settings',
      'color', '#6366F1',
      'description', 'Business settings, tax, domains, and integrations',
      'totalCount', c_tenant_profiles + c_tax_settings + c_tax_rates + c_tax_info
        + c_tenant_domains + c_tenant_regions + c_tenant_integrations + c_role_permissions,
      'items', jsonb_build_array(
        jsonb_build_object('label', 'Business Profile', 'count', c_tenant_profiles, 'table', 't_tenant_profiles'),
        jsonb_build_object('label', 'Tax Settings', 'count', c_tax_settings, 'table', 't_tax_settings'),
        jsonb_build_object('label', 'Tax Rates', 'count', c_tax_rates, 'table', 't_tax_rates'),
        jsonb_build_object('label', 'Tax Info', 'count', c_tax_info, 'table', 't_tax_info'),
        jsonb_build_object('label', 'Domains', 'count', c_tenant_domains, 'table', 't_tenant_domains'),
        jsonb_build_object('label', 'Regions', 'count', c_tenant_regions, 'table', 't_tenant_regions'),
        jsonb_build_object('label', 'Integrations', 'count', c_tenant_integrations, 'table', 't_tenant_integrations'),
        jsonb_build_object('label', 'Permissions', 'count', c_role_permissions, 'table', 't_role_permissions')
      )
    ),
    jsonb_build_object(
      'id', 'subscription',
      'label', 'Subscription & Billing',
      'icon', 'CreditCard',
      'color', '#EC4899',
      'description', 'Subscription plan and billing records',
      'totalCount', c_bm_tenant_subscription + c_bm_subscription_usage,
      'items', jsonb_build_array(
        jsonb_build_object('label', 'Subscription', 'count', c_bm_tenant_subscription, 'table', 't_bm_tenant_subscription'),
        jsonb_build_object('label', 'Usage Records', 'count', c_bm_subscription_usage, 'table', 't_bm_subscription_usage')
      )
    )
  );

  RETURN jsonb_build_object(
    'tenant_id', p_tenant_id,
    'tenant_name', v_tenant_name,
    'workspace_code', v_workspace_code,
    'categories', v_categories,
    'totalRecords', v_total,
    'canDelete', true,
    'blockingReasons', '[]'::jsonb
  );
END;
$$;

-- ============================================================================
-- 2. RESET TEST DATA
-- Deletes records where is_live = false for a specific tenant
-- Only affects tables that have the is_live column
-- ============================================================================
CREATE OR REPLACE FUNCTION admin_reset_test_data(p_tenant_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_deleted jsonb := '{}'::jsonb;
  v_count integer;
  v_total integer := 0;
BEGIN
  -- t_contact_channels (child of contacts with is_live=false)
  DELETE FROM t_contact_channels
  WHERE contact_id IN (
    SELECT id FROM t_contacts WHERE tenant_id = p_tenant_id AND is_live = false
  );
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted := v_deleted || jsonb_build_object('t_contact_channels', v_count);
  v_total := v_total + v_count;

  -- t_contact_addresses (child of contacts with is_live=false)
  DELETE FROM t_contact_addresses
  WHERE contact_id IN (
    SELECT id FROM t_contacts WHERE tenant_id = p_tenant_id AND is_live = false
  );
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted := v_deleted || jsonb_build_object('t_contact_addresses', v_count);
  v_total := v_total + v_count;

  -- t_contacts (is_live = false)
  DELETE FROM t_contacts WHERE tenant_id = p_tenant_id AND is_live = false;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted := v_deleted || jsonb_build_object('t_contacts', v_count);
  v_total := v_total + v_count;

  -- t_catalog_resource_pricing (child)
  DELETE FROM t_catalog_resource_pricing
  WHERE tenant_id = p_tenant_id AND is_live = false;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted := v_deleted || jsonb_build_object('t_catalog_resource_pricing', v_count);
  v_total := v_total + v_count;

  -- t_catalog_service_resources (child)
  DELETE FROM t_catalog_service_resources
  WHERE tenant_id = p_tenant_id AND is_live = false;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted := v_deleted || jsonb_build_object('t_catalog_service_resources', v_count);
  v_total := v_total + v_count;

  -- t_catalog_resources
  DELETE FROM t_catalog_resources WHERE tenant_id = p_tenant_id AND is_live = false;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted := v_deleted || jsonb_build_object('t_catalog_resources', v_count);
  v_total := v_total + v_count;

  -- t_catalog_items
  DELETE FROM t_catalog_items WHERE tenant_id = p_tenant_id AND is_live = false;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted := v_deleted || jsonb_build_object('t_catalog_items', v_count);
  v_total := v_total + v_count;

  -- t_tenant_files
  DELETE FROM t_tenant_files WHERE tenant_id = p_tenant_id AND is_live = false;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted := v_deleted || jsonb_build_object('t_tenant_files', v_count);
  v_total := v_total + v_count;

  RETURN jsonb_build_object(
    'success', true,
    'operation', 'reset_test_data',
    'tenant_id', p_tenant_id,
    'deleted_counts', v_deleted,
    'total_deleted', v_total
  );
END;
$$;

-- ============================================================================
-- 3. RESET ALL DATA
-- Deletes ALL tenant data across all tables, keeps the tenant account open
-- Deletes child records first to avoid FK violations
-- ============================================================================
CREATE OR REPLACE FUNCTION admin_reset_all_data(p_tenant_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_deleted jsonb := '{}'::jsonb;
  v_count integer;
  v_total integer := 0;
BEGIN
  -- ========== CHILDREN FIRST ==========

  -- Contact children
  DELETE FROM t_contact_channels WHERE contact_id IN (SELECT id FROM t_contacts WHERE tenant_id = p_tenant_id);
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted := v_deleted || jsonb_build_object('t_contact_channels', v_count);
  v_total := v_total + v_count;

  DELETE FROM t_contact_addresses WHERE contact_id IN (SELECT id FROM t_contacts WHERE tenant_id = p_tenant_id);
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted := v_deleted || jsonb_build_object('t_contact_addresses', v_count);
  v_total := v_total + v_count;

  -- Catalog children
  DELETE FROM t_catalog_resource_pricing WHERE tenant_id = p_tenant_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted := v_deleted || jsonb_build_object('t_catalog_resource_pricing', v_count);
  v_total := v_total + v_count;

  DELETE FROM t_catalog_service_resources WHERE tenant_id = p_tenant_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted := v_deleted || jsonb_build_object('t_catalog_service_resources', v_count);
  v_total := v_total + v_count;

  -- Subscription children (no tenant_id column, joins via subscription_id)
  DELETE FROM t_bm_subscription_usage WHERE subscription_id IN (SELECT subscription_id FROM t_bm_tenant_subscription WHERE tenant_id = p_tenant_id);
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted := v_deleted || jsonb_build_object('t_bm_subscription_usage', v_count);
  v_total := v_total + v_count;

  -- ========== MAIN TABLES ==========

  DELETE FROM t_contacts WHERE tenant_id = p_tenant_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted := v_deleted || jsonb_build_object('t_contacts', v_count);
  v_total := v_total + v_count;

  DELETE FROM t_user_invitations WHERE tenant_id = p_tenant_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted := v_deleted || jsonb_build_object('t_user_invitations', v_count);
  v_total := v_total + v_count;

  DELETE FROM t_tenant_files WHERE tenant_id = p_tenant_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted := v_deleted || jsonb_build_object('t_tenant_files', v_count);
  v_total := v_total + v_count;

  DELETE FROM t_catalog_items WHERE tenant_id = p_tenant_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted := v_deleted || jsonb_build_object('t_catalog_items', v_count);
  v_total := v_total + v_count;

  DELETE FROM t_catalog_resources WHERE tenant_id = p_tenant_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted := v_deleted || jsonb_build_object('t_catalog_resources', v_count);
  v_total := v_total + v_count;

  DELETE FROM t_catalog_categories WHERE tenant_id = p_tenant_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted := v_deleted || jsonb_build_object('t_catalog_categories', v_count);
  v_total := v_total + v_count;

  DELETE FROM t_catalog_industries WHERE tenant_id = p_tenant_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted := v_deleted || jsonb_build_object('t_catalog_industries', v_count);
  v_total := v_total + v_count;

  DELETE FROM t_category_details WHERE tenant_id = p_tenant_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted := v_deleted || jsonb_build_object('t_category_details', v_count);
  v_total := v_total + v_count;

  DELETE FROM t_category_master WHERE tenant_id = p_tenant_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted := v_deleted || jsonb_build_object('t_category_master', v_count);
  v_total := v_total + v_count;

  DELETE FROM t_tax_rates WHERE tenant_id = p_tenant_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted := v_deleted || jsonb_build_object('t_tax_rates', v_count);
  v_total := v_total + v_count;

  DELETE FROM t_tax_settings WHERE tenant_id = p_tenant_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted := v_deleted || jsonb_build_object('t_tax_settings', v_count);
  v_total := v_total + v_count;

  DELETE FROM t_tax_info WHERE tenant_id = p_tenant_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted := v_deleted || jsonb_build_object('t_tax_info', v_count);
  v_total := v_total + v_count;

  DELETE FROM t_tenant_domains WHERE tenant_id = p_tenant_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted := v_deleted || jsonb_build_object('t_tenant_domains', v_count);
  v_total := v_total + v_count;

  DELETE FROM t_tenant_regions WHERE tenant_id = p_tenant_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted := v_deleted || jsonb_build_object('t_tenant_regions', v_count);
  v_total := v_total + v_count;

  DELETE FROM t_tenant_integrations WHERE tenant_id = p_tenant_id::text;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted := v_deleted || jsonb_build_object('t_tenant_integrations', v_count);
  v_total := v_total + v_count;

  DELETE FROM t_role_permissions WHERE tenant_id = p_tenant_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted := v_deleted || jsonb_build_object('t_role_permissions', v_count);
  v_total := v_total + v_count;

  DELETE FROM t_tenant_profiles WHERE tenant_id = p_tenant_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted := v_deleted || jsonb_build_object('t_tenant_profiles', v_count);
  v_total := v_total + v_count;

  DELETE FROM t_bm_tenant_subscription WHERE tenant_id = p_tenant_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted := v_deleted || jsonb_build_object('t_bm_tenant_subscription', v_count);
  v_total := v_total + v_count;

  -- Reset storage counters on tenant
  UPDATE t_tenants SET storage_consumed = 0 WHERE id = p_tenant_id;

  RETURN jsonb_build_object(
    'success', true,
    'operation', 'reset_all_data',
    'tenant_id', p_tenant_id,
    'deleted_counts', v_deleted,
    'total_deleted', v_total
  );
END;
$$;

-- ============================================================================
-- 4. CLOSE TENANT ACCOUNT
-- Deletes ALL data (calls admin_reset_all_data) + sets tenant status to 'closed'
-- Also removes user_tenants associations
-- ============================================================================
CREATE OR REPLACE FUNCTION admin_close_tenant_account(p_tenant_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_reset_result jsonb;
  v_user_count integer;
BEGIN
  -- First, delete all data
  v_reset_result := admin_reset_all_data(p_tenant_id);

  -- Remove user-tenant associations
  DELETE FROM t_user_tenants WHERE tenant_id = p_tenant_id;
  GET DIAGNOSTICS v_user_count = ROW_COUNT;

  -- Close the tenant
  UPDATE t_tenants
  SET status = 'closed', updated_at = NOW()
  WHERE id = p_tenant_id;

  RETURN jsonb_build_object(
    'success', true,
    'operation', 'close_account',
    'tenant_id', p_tenant_id,
    'deleted_counts', (v_reset_result->>'deleted_counts')::jsonb || jsonb_build_object('t_user_tenants', v_user_count),
    'total_deleted', (v_reset_result->>'total_deleted')::integer + v_user_count,
    'tenant_status', 'closed'
  );
END;
$$;
