-- ============================================================================
-- Migration: Integration RPC Functions
-- Purpose: Create RPC functions for integrations to bypass RLS
-- Pattern: Following billing Edge Function pattern
-- ============================================================================

-- ============================================================================
-- 1. GET INTEGRATION TYPES WITH STATUS
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_integration_types_with_status(
  p_tenant_id TEXT,
  p_is_live BOOLEAN DEFAULT TRUE
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT COALESCE(jsonb_agg(type_data), '[]'::jsonb)
  INTO result
  FROM (
    SELECT jsonb_build_object(
      'integration_type', t.name,
      'display_name', t.display_name,
      'description', t.description,
      'icon_name', t.icon_name,
      'active_count', COALESCE(active_counts.cnt, 0),
      'total_available', COALESCE(provider_counts.cnt, 0)
    ) AS type_data
    FROM t_integration_types t
    LEFT JOIN (
      -- Count active tenant integrations per type
      SELECT
        ip.type_id,
        COUNT(ti.id) AS cnt
      FROM t_integration_providers ip
      INNER JOIN t_tenant_integrations ti ON ti.master_integration_id = ip.id
      WHERE ti.tenant_id = p_tenant_id
        AND ti.is_live = p_is_live
        AND ti.is_active = true
      GROUP BY ip.type_id
    ) active_counts ON active_counts.type_id = t.id
    LEFT JOIN (
      -- Count available providers per type
      SELECT
        type_id,
        COUNT(*) AS cnt
      FROM t_integration_providers
      WHERE is_active = true
      GROUP BY type_id
    ) provider_counts ON provider_counts.type_id = t.id
    WHERE t.is_active = true
    ORDER BY t.display_name
  ) subq;

  RETURN result;
END;
$$;

-- ============================================================================
-- 2. GET INTEGRATIONS BY TYPE
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_integrations_by_type(
  p_tenant_id TEXT,
  p_type TEXT,
  p_is_live BOOLEAN DEFAULT TRUE
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSONB;
  v_type_id UUID;
BEGIN
  -- Get the type ID
  SELECT id INTO v_type_id
  FROM t_integration_types
  WHERE name = p_type;

  IF v_type_id IS NULL THEN
    RETURN '[]'::jsonb;
  END IF;

  SELECT COALESCE(jsonb_agg(integration_data), '[]'::jsonb)
  INTO result
  FROM (
    SELECT jsonb_build_object(
      'id', ti.id,
      'tenant_id', ti.tenant_id,
      'master_integration_id', ip.id,
      'integration_type', it.name,
      'integration_type_display', it.display_name,
      'provider_name', ip.name,
      'display_name', ip.display_name,
      'description', ip.description,
      'logo_url', ip.logo_url,
      'config_schema', ip.config_schema,
      'metadata', ip.metadata,
      'is_configured', CASE WHEN ti.id IS NOT NULL THEN true ELSE false END,
      'is_active', COALESCE(ti.is_active, false),
      'is_live', COALESCE(ti.is_live, p_is_live),
      'connection_status', COALESCE(ti.connection_status, 'Not Configured'),
      'last_verified', ti.last_verified
    ) AS integration_data
    FROM t_integration_providers ip
    INNER JOIN t_integration_types it ON it.id = ip.type_id
    LEFT JOIN t_tenant_integrations ti ON ti.master_integration_id = ip.id
      AND ti.tenant_id = p_tenant_id
      AND ti.is_live = p_is_live
    WHERE ip.type_id = v_type_id
      AND ip.is_active = true
    ORDER BY ip.display_name
  ) subq;

  RETURN result;
END;
$$;

-- ============================================================================
-- 3. GET SPECIFIC TENANT INTEGRATION BY PROVIDER ID
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_tenant_integration(
  p_tenant_id TEXT,
  p_provider_id UUID,
  p_is_live BOOLEAN DEFAULT TRUE
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'id', ti.id,
    'tenant_id', ti.tenant_id,
    'master_integration_id', ti.master_integration_id,
    'is_active', ti.is_active,
    'is_live', ti.is_live,
    'credentials', ti.credentials,
    'connection_status', ti.connection_status,
    'last_verified', ti.last_verified,
    'created_at', ti.created_at,
    'updated_at', ti.updated_at,
    'provider', jsonb_build_object(
      'id', ip.id,
      'type_id', ip.type_id,
      'name', ip.name,
      'display_name', ip.display_name,
      'description', ip.description,
      'logo_url', ip.logo_url,
      'config_schema', ip.config_schema,
      'metadata', ip.metadata
    )
  )
  INTO result
  FROM t_tenant_integrations ti
  INNER JOIN t_integration_providers ip ON ip.id = ti.master_integration_id
  WHERE ti.tenant_id = p_tenant_id
    AND ti.master_integration_id = p_provider_id
    AND ti.is_live = p_is_live;

  RETURN result;
END;
$$;

-- ============================================================================
-- 4. SAVE (CREATE/UPDATE) TENANT INTEGRATION
-- ============================================================================
CREATE OR REPLACE FUNCTION public.save_tenant_integration(
  p_tenant_id TEXT,
  p_master_integration_id UUID,
  p_credentials TEXT,  -- Encrypted credentials as text
  p_is_live BOOLEAN DEFAULT TRUE,
  p_is_active BOOLEAN DEFAULT TRUE,
  p_connection_status TEXT DEFAULT 'Pending'
)
RETURNS JSONB
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing_id UUID;
  v_result JSONB;
  v_now TIMESTAMPTZ := NOW();
BEGIN
  -- Check if integration already exists
  SELECT id INTO v_existing_id
  FROM t_tenant_integrations
  WHERE tenant_id = p_tenant_id
    AND master_integration_id = p_master_integration_id
    AND is_live = p_is_live;

  IF v_existing_id IS NOT NULL THEN
    -- Update existing integration
    UPDATE t_tenant_integrations
    SET
      is_active = p_is_active,
      credentials = p_credentials::jsonb,
      connection_status = p_connection_status,
      last_verified = CASE WHEN p_connection_status = 'Connected' THEN v_now ELSE last_verified END,
      updated_at = v_now
    WHERE id = v_existing_id
    RETURNING jsonb_build_object(
      'id', id,
      'tenant_id', tenant_id,
      'master_integration_id', master_integration_id,
      'is_active', is_active,
      'is_live', is_live,
      'connection_status', connection_status,
      'last_verified', last_verified,
      'created_at', created_at,
      'updated_at', updated_at
    ) INTO v_result;
  ELSE
    -- Create new integration
    INSERT INTO t_tenant_integrations (
      tenant_id,
      master_integration_id,
      is_active,
      is_live,
      credentials,
      connection_status,
      last_verified,
      created_at,
      updated_at
    ) VALUES (
      p_tenant_id,
      p_master_integration_id,
      p_is_active,
      p_is_live,
      p_credentials::jsonb,
      p_connection_status,
      CASE WHEN p_connection_status = 'Connected' THEN v_now ELSE NULL END,
      v_now,
      v_now
    )
    RETURNING jsonb_build_object(
      'id', id,
      'tenant_id', tenant_id,
      'master_integration_id', master_integration_id,
      'is_active', is_active,
      'is_live', is_live,
      'connection_status', connection_status,
      'last_verified', last_verified,
      'created_at', created_at,
      'updated_at', updated_at
    ) INTO v_result;
  END IF;

  RETURN v_result;
END;
$$;

-- ============================================================================
-- 5. TOGGLE INTEGRATION STATUS
-- ============================================================================
CREATE OR REPLACE FUNCTION public.toggle_integration_status(
  p_tenant_id TEXT,
  p_integration_id UUID,
  p_is_active BOOLEAN
)
RETURNS JSONB
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
BEGIN
  UPDATE t_tenant_integrations
  SET
    is_active = p_is_active,
    updated_at = NOW()
  WHERE id = p_integration_id
    AND tenant_id = p_tenant_id
  RETURNING jsonb_build_object(
    'success', true,
    'integration', jsonb_build_object(
      'id', id,
      'tenant_id', tenant_id,
      'master_integration_id', master_integration_id,
      'is_active', is_active,
      'is_live', is_live,
      'connection_status', connection_status,
      'last_verified', last_verified,
      'updated_at', updated_at
    )
  ) INTO v_result;

  IF v_result IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Integration not found or not authorized'
    );
  END IF;

  RETURN v_result;
END;
$$;

-- ============================================================================
-- 6. GET PROVIDER BY ID (for test connection)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_integration_provider(
  p_provider_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'id', id,
    'name', name,
    'display_name', display_name,
    'config_schema', config_schema
  )
  INTO result
  FROM t_integration_providers
  WHERE id = p_provider_id;

  RETURN result;
END;
$$;

-- ============================================================================
-- 7. GET EXISTING CREDENTIALS (for merging during test)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_integration_credentials(
  p_tenant_id TEXT,
  p_integration_id UUID
)
RETURNS TEXT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_credentials TEXT;
BEGIN
  SELECT credentials::text
  INTO v_credentials
  FROM t_tenant_integrations
  WHERE id = p_integration_id
    AND tenant_id = p_tenant_id;

  RETURN v_credentials;
END;
$$;

-- ============================================================================
-- 8. UPDATE LAST VERIFIED TIMESTAMP
-- ============================================================================
CREATE OR REPLACE FUNCTION public.update_integration_verified(
  p_tenant_id TEXT,
  p_integration_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE t_tenant_integrations
  SET
    last_verified = NOW(),
    connection_status = 'Connected'
  WHERE id = p_integration_id
    AND tenant_id = p_tenant_id;

  RETURN FOUND;
END;
$$;

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================
GRANT EXECUTE ON FUNCTION public.get_integration_types_with_status TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.get_integrations_by_type TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.get_tenant_integration TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.save_tenant_integration TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.toggle_integration_status TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.get_integration_provider TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.get_integration_credentials TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.update_integration_verified TO authenticated, anon, service_role;
