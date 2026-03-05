-- Recreate update_contact_idempotent_v2 with UUID parameter
-- Both overloaded versions were dropped; this recreates the correct one.

-- First ensure no versions remain
DROP FUNCTION IF EXISTS update_contact_idempotent_v2(text, uuid, jsonb, jsonb, jsonb, jsonb);
DROP FUNCTION IF EXISTS update_contact_idempotent_v2(uuid, uuid, jsonb, jsonb, jsonb, jsonb);

-- Recreate with UUID idempotency key (matches api_idempotency.key UUID column)
CREATE OR REPLACE FUNCTION update_contact_idempotent_v2(
  p_idempotency_key UUID,
  p_contact_id UUID,
  p_contact_data JSONB,
  p_contact_channels JSONB DEFAULT NULL,
  p_addresses JSONB DEFAULT NULL,
  p_contact_persons JSONB DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing_contact RECORD;
BEGIN
  -- STEP 1: Idempotency check
  INSERT INTO api_idempotency (key, resource_type, resource_id)
  VALUES (p_idempotency_key, 'contact_update', p_contact_id)
  ON CONFLICT (key) DO NOTHING;

  IF NOT FOUND THEN
    -- Already processed
    RETURN jsonb_build_object(
      'success', TRUE,
      'data', jsonb_build_object('id', p_contact_id),
      'was_duplicate', TRUE,
      'message', 'Update already processed with this idempotency key'
    );
  END IF;

  -- STEP 2: Check contact exists and not archived
  SELECT id, status INTO v_existing_contact
  FROM t_contacts
  WHERE id = p_contact_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'Contact not found',
      'code', 'NOT_FOUND'
    );
  END IF;

  IF v_existing_contact.status = 'archived' THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'Cannot update archived contact',
      'code', 'CONTACT_ARCHIVED'
    );
  END IF;

  -- STEP 3: Update main contact
  UPDATE t_contacts SET
    name = COALESCE((p_contact_data->>'name')::TEXT, name),
    company_name = COALESCE((p_contact_data->>'company_name')::TEXT, company_name),
    registration_number = COALESCE((p_contact_data->>'registration_number')::TEXT, registration_number),
    salutation = COALESCE((p_contact_data->>'salutation')::TEXT, salutation),
    designation = COALESCE((p_contact_data->>'designation')::TEXT, designation),
    department = COALESCE((p_contact_data->>'department')::TEXT, department),
    is_primary_contact = COALESCE((p_contact_data->>'is_primary_contact')::BOOLEAN, is_primary_contact),
    classifications = COALESCE(p_contact_data->'classifications', classifications),
    tags = COALESCE(p_contact_data->'tags', tags),
    compliance_numbers = COALESCE(p_contact_data->'compliance_numbers', compliance_numbers),
    notes = COALESCE((p_contact_data->>'notes')::TEXT, notes),
    parent_contact_ids = COALESCE(p_contact_data->'parent_contact_ids', parent_contact_ids),
    updated_by = (p_contact_data->>'updated_by')::UUID,
    updated_at = NOW()
  WHERE id = p_contact_id;

  -- STEP 4: Replace channels if provided
  IF p_contact_channels IS NOT NULL THEN
    DELETE FROM t_contact_channels WHERE contact_id = p_contact_id;

    IF jsonb_array_length(p_contact_channels) > 0 THEN
      INSERT INTO t_contact_channels (contact_id, channel_type, value, country_code, is_primary, is_verified, notes)
      SELECT
        p_contact_id,
        x.channel_type, x.value, x.country_code,
        COALESCE(x.is_primary, FALSE),
        COALESCE(x.is_verified, FALSE),
        x.notes
      FROM jsonb_to_recordset(p_contact_channels) AS x(
        channel_type TEXT, value TEXT, country_code TEXT,
        is_primary BOOLEAN, is_verified BOOLEAN, notes TEXT
      );
    END IF;
  END IF;

  -- STEP 5: Replace addresses if provided
  IF p_addresses IS NOT NULL THEN
    DELETE FROM t_contact_addresses WHERE contact_id = p_contact_id;

    IF jsonb_array_length(p_addresses) > 0 THEN
      INSERT INTO t_contact_addresses (contact_id, type, label, address_line1, address_line2, city, state_code, country_code, postal_code, google_pin, is_primary, notes)
      SELECT
        p_contact_id,
        COALESCE(x.type, x.address_type),
        x.label,
        COALESCE(x.address_line1, x.line1),
        COALESCE(x.address_line2, x.line2),
        x.city,
        COALESCE(x.state_code, x.state),
        COALESCE(x.country_code, x.country, 'IN'),
        x.postal_code,
        x.google_pin,
        COALESCE(x.is_primary, FALSE),
        x.notes
      FROM jsonb_to_recordset(p_addresses) AS x(
        type TEXT, address_type TEXT, label TEXT,
        address_line1 TEXT, line1 TEXT, address_line2 TEXT, line2 TEXT,
        city TEXT, state_code TEXT, state TEXT, country_code TEXT, country TEXT,
        postal_code TEXT, google_pin TEXT, is_primary BOOLEAN, notes TEXT
      );
    END IF;
  END IF;

  -- Contact persons handling is more complex (create/update/delete)
  -- For now, let existing logic handle it or implement similar pattern

  RETURN jsonb_build_object(
    'success', TRUE,
    'data', jsonb_build_object('id', p_contact_id),
    'was_duplicate', FALSE,
    'message', 'Contact updated successfully'
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', SQLERRM,
      'code', 'UPDATE_CONTACT_ERROR'
    );
END;
$$;
