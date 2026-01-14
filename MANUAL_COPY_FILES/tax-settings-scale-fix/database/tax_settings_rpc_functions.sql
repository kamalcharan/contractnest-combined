-- ============================================================================
-- TAX SETTINGS RPC FUNCTIONS FOR SCALE
-- Run this migration in Supabase SQL Editor
-- ============================================================================

-- ============================================================================
-- 1. IDEMPOTENCY CACHE TABLE (for database-backed idempotency)
-- ============================================================================

CREATE TABLE IF NOT EXISTS t_idempotency_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idempotency_key TEXT NOT NULL,
  tenant_id UUID NOT NULL,
  response_data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  UNIQUE(idempotency_key, tenant_id)
);

-- Index for fast lookups and cleanup
CREATE INDEX IF NOT EXISTS idx_idempotency_cache_lookup
  ON t_idempotency_cache(tenant_id, idempotency_key)
  WHERE expires_at > NOW();

CREATE INDEX IF NOT EXISTS idx_idempotency_cache_expires
  ON t_idempotency_cache(expires_at);

-- Auto-cleanup function for expired entries
CREATE OR REPLACE FUNCTION cleanup_expired_idempotency_cache()
RETURNS void AS $$
BEGIN
  DELETE FROM t_idempotency_cache WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 2. GET TAX SETTINGS WITH RATES (Single call for GET)
-- ============================================================================

CREATE OR REPLACE FUNCTION get_tax_settings_with_rates(
  p_tenant_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  v_settings JSON;
  v_rates JSON;
  v_result JSON;
BEGIN
  -- Get settings (or default if not exists)
  SELECT json_build_object(
    'id', COALESCE(id, gen_random_uuid()),
    'tenant_id', p_tenant_id,
    'display_mode', COALESCE(display_mode, 'excluding_tax'),
    'default_tax_rate_id', default_tax_rate_id,
    'version', COALESCE(version, 1),
    'created_at', COALESCE(created_at, NOW()),
    'updated_at', COALESCE(updated_at, NOW())
  )
  INTO v_settings
  FROM t_tax_settings
  WHERE tenant_id = p_tenant_id;

  -- If no settings found, return default
  IF v_settings IS NULL THEN
    v_settings := json_build_object(
      'id', NULL,
      'tenant_id', p_tenant_id,
      'display_mode', 'excluding_tax',
      'default_tax_rate_id', NULL,
      'version', 1,
      'created_at', NOW(),
      'updated_at', NOW()
    );
  END IF;

  -- Get active rates ordered by sequence
  SELECT COALESCE(json_agg(
    json_build_object(
      'id', id,
      'tenant_id', tenant_id,
      'name', name,
      'rate', rate,
      'is_default', is_default,
      'is_active', is_active,
      'sequence_no', sequence_no,
      'description', description,
      'version', version,
      'created_at', created_at,
      'updated_at', updated_at
    ) ORDER BY sequence_no ASC NULLS LAST
  ), '[]'::json)
  INTO v_rates
  FROM t_tax_rates
  WHERE tenant_id = p_tenant_id
    AND is_active = true;

  -- Build final result
  v_result := json_build_object(
    'settings', v_settings,
    'rates', v_rates
  );

  RETURN v_result;
END;
$$;

-- ============================================================================
-- 3. CREATE OR UPDATE TAX SETTINGS (Single call for settings)
-- ============================================================================

CREATE OR REPLACE FUNCTION create_or_update_tax_settings(
  p_tenant_id UUID,
  p_display_mode TEXT,
  p_default_tax_rate_id UUID DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_existing RECORD;
  v_result RECORD;
  v_is_update BOOLEAN := false;
BEGIN
  -- Validate display_mode
  IF p_display_mode NOT IN ('including_tax', 'excluding_tax') THEN
    RAISE EXCEPTION 'Invalid display_mode. Must be "including_tax" or "excluding_tax"'
      USING ERRCODE = 'check_violation';
  END IF;

  -- Check if settings exist
  SELECT id, version INTO v_existing
  FROM t_tax_settings
  WHERE tenant_id = p_tenant_id;

  IF v_existing.id IS NOT NULL THEN
    -- Update existing
    v_is_update := true;
    UPDATE t_tax_settings
    SET
      display_mode = p_display_mode,
      default_tax_rate_id = p_default_tax_rate_id,
      version = version + 1,
      updated_at = NOW()
    WHERE tenant_id = p_tenant_id
    RETURNING * INTO v_result;
  ELSE
    -- Insert new
    INSERT INTO t_tax_settings (tenant_id, display_mode, default_tax_rate_id, version)
    VALUES (p_tenant_id, p_display_mode, p_default_tax_rate_id, 1)
    RETURNING * INTO v_result;
  END IF;

  RETURN json_build_object(
    'settings', row_to_json(v_result),
    'is_update', v_is_update
  );
END;
$$;

-- ============================================================================
-- 4. CREATE TAX RATE ATOMIC (Single call with all validations)
-- ============================================================================

CREATE OR REPLACE FUNCTION create_tax_rate_atomic(
  p_tenant_id UUID,
  p_name TEXT,
  p_rate NUMERIC,
  p_is_default BOOLEAN DEFAULT false,
  p_description TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_normalized_name TEXT;
  v_next_sequence INT;
  v_existing RECORD;
  v_result RECORD;
BEGIN
  -- Normalize name to uppercase
  v_normalized_name := UPPER(TRIM(p_name));

  -- Validate name
  IF v_normalized_name IS NULL OR LENGTH(v_normalized_name) = 0 THEN
    RAISE EXCEPTION 'Name is required and cannot be empty'
      USING ERRCODE = 'check_violation';
  END IF;

  IF LENGTH(v_normalized_name) > 100 THEN
    RAISE EXCEPTION 'Name cannot exceed 100 characters'
      USING ERRCODE = 'check_violation';
  END IF;

  -- Validate rate
  IF p_rate IS NULL OR p_rate < 0 OR p_rate > 100 THEN
    RAISE EXCEPTION 'Rate must be between 0 and 100'
      USING ERRCODE = 'check_violation';
  END IF;

  -- Check for duplicate (case-insensitive name + rate combination)
  SELECT id, name, rate INTO v_existing
  FROM t_tax_rates
  WHERE tenant_id = p_tenant_id
    AND UPPER(name) = v_normalized_name
    AND rate = p_rate
    AND is_active = true;

  IF v_existing.id IS NOT NULL THEN
    RAISE EXCEPTION 'DUPLICATE_TAX_RATE:{"existing_rate":{"id":"%","name":"%","rate":%}}',
      v_existing.id, v_existing.name, v_existing.rate
      USING ERRCODE = 'unique_violation';
  END IF;

  -- Get next sequence number (increment by 10)
  SELECT COALESCE(MAX(sequence_no), 0) + 10 INTO v_next_sequence
  FROM t_tax_rates
  WHERE tenant_id = p_tenant_id AND is_active = true;

  -- If setting as default, unset existing defaults
  IF p_is_default THEN
    UPDATE t_tax_rates
    SET is_default = false, updated_at = NOW()
    WHERE tenant_id = p_tenant_id
      AND is_default = true
      AND is_active = true;
  END IF;

  -- Insert new rate
  INSERT INTO t_tax_rates (
    tenant_id,
    name,
    rate,
    is_default,
    is_active,
    sequence_no,
    description,
    version
  )
  VALUES (
    p_tenant_id,
    v_normalized_name,
    p_rate,
    COALESCE(p_is_default, false),
    true,
    v_next_sequence,
    NULLIF(TRIM(p_description), ''),
    1
  )
  RETURNING * INTO v_result;

  RETURN row_to_json(v_result);
END;
$$;

-- ============================================================================
-- 5. UPDATE TAX RATE ATOMIC (Single call with all validations)
-- ============================================================================

CREATE OR REPLACE FUNCTION update_tax_rate_atomic(
  p_tenant_id UUID,
  p_rate_id UUID,
  p_name TEXT DEFAULT NULL,
  p_rate NUMERIC DEFAULT NULL,
  p_is_default BOOLEAN DEFAULT NULL,
  p_description TEXT DEFAULT NULL,
  p_expected_version INT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current RECORD;
  v_normalized_name TEXT;
  v_check_name TEXT;
  v_check_rate NUMERIC;
  v_existing RECORD;
  v_result RECORD;
BEGIN
  -- Get current rate
  SELECT * INTO v_current
  FROM t_tax_rates
  WHERE id = p_rate_id
    AND tenant_id = p_tenant_id
    AND is_active = true;

  IF v_current.id IS NULL THEN
    RAISE EXCEPTION 'Tax rate not found or has been deleted'
      USING ERRCODE = 'no_data_found';
  END IF;

  -- Optimistic locking check
  IF p_expected_version IS NOT NULL AND v_current.version != p_expected_version THEN
    RAISE EXCEPTION 'Tax rate was modified by another user. Please refresh and try again.'
      USING ERRCODE = 'serialization_failure';
  END IF;

  -- Determine values to check for duplicate
  IF p_name IS NOT NULL THEN
    v_normalized_name := UPPER(TRIM(p_name));
    IF LENGTH(v_normalized_name) = 0 THEN
      RAISE EXCEPTION 'Name cannot be empty'
        USING ERRCODE = 'check_violation';
    END IF;
    IF LENGTH(v_normalized_name) > 100 THEN
      RAISE EXCEPTION 'Name cannot exceed 100 characters'
        USING ERRCODE = 'check_violation';
    END IF;
    v_check_name := v_normalized_name;
  ELSE
    v_check_name := v_current.name;
  END IF;

  IF p_rate IS NOT NULL THEN
    IF p_rate < 0 OR p_rate > 100 THEN
      RAISE EXCEPTION 'Rate must be between 0 and 100'
        USING ERRCODE = 'check_violation';
    END IF;
    v_check_rate := p_rate;
  ELSE
    v_check_rate := v_current.rate;
  END IF;

  -- Check for duplicate if name or rate changed
  IF (p_name IS NOT NULL AND v_normalized_name != v_current.name)
     OR (p_rate IS NOT NULL AND p_rate != v_current.rate) THEN
    SELECT id, name, rate INTO v_existing
    FROM t_tax_rates
    WHERE tenant_id = p_tenant_id
      AND UPPER(name) = v_check_name
      AND rate = v_check_rate
      AND is_active = true
      AND id != p_rate_id;

    IF v_existing.id IS NOT NULL THEN
      RAISE EXCEPTION 'DUPLICATE_TAX_RATE:{"existing_rate":{"id":"%","name":"%","rate":%}}',
        v_existing.id, v_existing.name, v_existing.rate
        USING ERRCODE = 'unique_violation';
    END IF;
  END IF;

  -- If setting as default, unset other defaults
  IF p_is_default = true THEN
    UPDATE t_tax_rates
    SET is_default = false, updated_at = NOW()
    WHERE tenant_id = p_tenant_id
      AND is_default = true
      AND is_active = true
      AND id != p_rate_id;
  END IF;

  -- Update the rate
  UPDATE t_tax_rates
  SET
    name = COALESCE(v_normalized_name, name),
    rate = COALESCE(p_rate, rate),
    is_default = COALESCE(p_is_default, is_default),
    description = CASE
      WHEN p_description IS NOT NULL THEN NULLIF(TRIM(p_description), '')
      ELSE description
    END,
    version = version + 1,
    updated_at = NOW()
  WHERE id = p_rate_id
    AND tenant_id = p_tenant_id
  RETURNING * INTO v_result;

  RETURN row_to_json(v_result);
END;
$$;

-- ============================================================================
-- 6. DELETE TAX RATE (Soft delete with validation)
-- ============================================================================

CREATE OR REPLACE FUNCTION delete_tax_rate_atomic(
  p_tenant_id UUID,
  p_rate_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current RECORD;
  v_result RECORD;
BEGIN
  -- Get current rate
  SELECT * INTO v_current
  FROM t_tax_rates
  WHERE id = p_rate_id
    AND tenant_id = p_tenant_id;

  IF v_current.id IS NULL THEN
    RAISE EXCEPTION 'Tax rate not found'
      USING ERRCODE = 'no_data_found';
  END IF;

  IF NOT v_current.is_active THEN
    RAISE EXCEPTION 'Tax rate is already deleted'
      USING ERRCODE = 'check_violation';
  END IF;

  IF v_current.is_default THEN
    RAISE EXCEPTION 'Cannot delete the default tax rate. Please set another rate as default first.'
      USING ERRCODE = 'check_violation';
  END IF;

  -- Soft delete
  UPDATE t_tax_rates
  SET is_active = false, updated_at = NOW()
  WHERE id = p_rate_id
    AND tenant_id = p_tenant_id
  RETURNING * INTO v_result;

  RETURN json_build_object(
    'success', true,
    'message', 'Tax rate deleted successfully',
    'deletedRate', json_build_object(
      'id', v_result.id,
      'name', v_result.name
    )
  );
END;
$$;

-- ============================================================================
-- 7. IDEMPOTENCY HELPER FUNCTIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION get_idempotency_response(
  p_tenant_id UUID,
  p_idempotency_key TEXT
)
RETURNS JSON
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  v_cached RECORD;
BEGIN
  SELECT response_data INTO v_cached
  FROM t_idempotency_cache
  WHERE tenant_id = p_tenant_id
    AND idempotency_key = p_idempotency_key
    AND expires_at > NOW();

  IF v_cached.response_data IS NOT NULL THEN
    RETURN v_cached.response_data;
  END IF;

  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION set_idempotency_response(
  p_tenant_id UUID,
  p_idempotency_key TEXT,
  p_response_data JSON,
  p_ttl_minutes INT DEFAULT 15
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO t_idempotency_cache (tenant_id, idempotency_key, response_data, expires_at)
  VALUES (p_tenant_id, p_idempotency_key, p_response_data, NOW() + (p_ttl_minutes || ' minutes')::INTERVAL)
  ON CONFLICT (idempotency_key, tenant_id)
  DO UPDATE SET
    response_data = EXCLUDED.response_data,
    expires_at = EXCLUDED.expires_at;
END;
$$;

-- ============================================================================
-- 8. INDEXES FOR TAX TABLES (if not already exists)
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_tax_settings_tenant
  ON t_tax_settings(tenant_id);

CREATE INDEX IF NOT EXISTS idx_tax_rates_tenant_active
  ON t_tax_rates(tenant_id, is_active);

CREATE INDEX IF NOT EXISTS idx_tax_rates_tenant_seq
  ON t_tax_rates(tenant_id, sequence_no)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_tax_rates_tenant_name_rate
  ON t_tax_rates(tenant_id, UPPER(name), rate)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_tax_rates_tenant_default
  ON t_tax_rates(tenant_id)
  WHERE is_default = true AND is_active = true;

-- ============================================================================
-- GRANT PERMISSIONS (adjust role names as needed)
-- ============================================================================

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION get_tax_settings_with_rates(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION create_or_update_tax_settings(UUID, TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION create_tax_rate_atomic(UUID, TEXT, NUMERIC, BOOLEAN, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION update_tax_rate_atomic(UUID, UUID, TEXT, NUMERIC, BOOLEAN, TEXT, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION delete_tax_rate_atomic(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_idempotency_response(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION set_idempotency_response(UUID, TEXT, JSON, INT) TO authenticated;

-- Grant to service_role for Edge functions
GRANT EXECUTE ON FUNCTION get_tax_settings_with_rates(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION create_or_update_tax_settings(UUID, TEXT, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION create_tax_rate_atomic(UUID, TEXT, NUMERIC, BOOLEAN, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION update_tax_rate_atomic(UUID, UUID, TEXT, NUMERIC, BOOLEAN, TEXT, INT) TO service_role;
GRANT EXECUTE ON FUNCTION delete_tax_rate_atomic(UUID, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION get_idempotency_response(UUID, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION set_idempotency_response(UUID, TEXT, JSON, INT) TO service_role;

-- Grant table access for idempotency cache
GRANT SELECT, INSERT, UPDATE, DELETE ON t_idempotency_cache TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON t_idempotency_cache TO authenticated;

-- ============================================================================
-- VERIFICATION QUERIES (run these to verify installation)
-- ============================================================================

-- Test get_tax_settings_with_rates (replace with actual tenant_id)
-- SELECT get_tax_settings_with_rates('your-tenant-uuid-here');

-- Verify functions exist
-- SELECT routine_name FROM information_schema.routines
-- WHERE routine_schema = 'public'
-- AND routine_name LIKE '%tax%';
