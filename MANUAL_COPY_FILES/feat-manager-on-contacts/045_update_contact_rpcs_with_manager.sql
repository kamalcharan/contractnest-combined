-- ============================================================
-- UPDATED RPCs: Add manager_id / manager_name to contacts
-- Run this ENTIRE file in Supabase SQL Editor AFTER running
-- migration 045_add_manager_to_contacts.sql
-- ============================================================


-- ============================================================
-- 1. update_contact_idempotent_v2
-- CHANGED: Added manager_id + manager_name to UPDATE SET block
-- ============================================================
CREATE OR REPLACE FUNCTION update_contact_idempotent_v2(
  p_idempotency_key TEXT,
  p_contact_id UUID,
  p_contact_data JSONB,
  p_contact_channels JSONB DEFAULT NULL,
  p_addresses JSONB DEFAULT NULL,
  p_contact_persons JSONB DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_existing_contact RECORD;
BEGIN
  -- Idempotency check
  INSERT INTO api_idempotency (key, resource_type, resource_id)
  VALUES (p_idempotency_key, 'contact_update', p_contact_id)
  ON CONFLICT (key) DO NOTHING;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', TRUE,
      'data', jsonb_build_object('id', p_contact_id),
      'was_duplicate', TRUE,
      'message', 'Update already processed'
    );
  END IF;

  -- Check contact exists
  SELECT id, status INTO v_existing_contact
  FROM t_contacts WHERE id = p_contact_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Contact not found', 'code', 'NOT_FOUND');
  END IF;

  IF v_existing_contact.status = 'archived' THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Cannot update archived contact', 'code', 'CONTACT_ARCHIVED');
  END IF;

  -- Update main contact
  UPDATE t_contacts SET
    name                = COALESCE((p_contact_data->>'name')::TEXT, name),
    company_name        = COALESCE((p_contact_data->>'company_name')::TEXT, company_name),
    registration_number = COALESCE((p_contact_data->>'registration_number')::TEXT, registration_number),
    salutation          = COALESCE((p_contact_data->>'salutation')::TEXT, salutation),
    designation         = COALESCE((p_contact_data->>'designation')::TEXT, designation),
    department          = COALESCE((p_contact_data->>'department')::TEXT, department),
    classifications     = COALESCE(p_contact_data->'classifications', classifications),
    tags                = COALESCE(p_contact_data->'tags', tags),
    compliance_numbers  = COALESCE(p_contact_data->'compliance_numbers', compliance_numbers),
    notes               = COALESCE((p_contact_data->>'notes')::TEXT, notes),
    parent_contact_ids  = COALESCE(p_contact_data->'parent_contact_ids', parent_contact_ids),
    -- >>> NEW: manager fields (uses ? so explicit null clears the value) <<<
    manager_id          = CASE WHEN p_contact_data ? 'manager_id'
                               THEN (p_contact_data->>'manager_id')::UUID
                               ELSE manager_id END,
    manager_name        = CASE WHEN p_contact_data ? 'manager_name'
                               THEN p_contact_data->>'manager_name'
                               ELSE manager_name END,
    -- >>> END NEW <<<
    updated_by          = (p_contact_data->>'updated_by')::UUID,
    updated_at          = NOW()
  WHERE id = p_contact_id;

  -- Replace channels if provided
  IF p_contact_channels IS NOT NULL THEN
    DELETE FROM t_contact_channels WHERE contact_id = p_contact_id;
    IF jsonb_array_length(p_contact_channels) > 0 THEN
      INSERT INTO t_contact_channels (contact_id, channel_type, value, country_code, is_primary, is_verified, notes)
      SELECT p_contact_id, x.channel_type, x.value, x.country_code,
        COALESCE(x.is_primary, FALSE), COALESCE(x.is_verified, FALSE), x.notes
      FROM jsonb_to_recordset(p_contact_channels) AS x(
        channel_type TEXT, value TEXT, country_code TEXT, is_primary BOOLEAN, is_verified BOOLEAN, notes TEXT
      );
    END IF;
  END IF;

  -- Replace addresses if provided
  IF p_addresses IS NOT NULL THEN
    DELETE FROM t_contact_addresses WHERE contact_id = p_contact_id;
    IF jsonb_array_length(p_addresses) > 0 THEN
      INSERT INTO t_contact_addresses (contact_id, type, label, address_line1, address_line2, city, state_code, country_code, postal_code, google_pin, is_primary, notes)
      SELECT p_contact_id, COALESCE(x.type, x.address_type), x.label,
        COALESCE(x.address_line1, x.line1), COALESCE(x.address_line2, x.line2),
        x.city, COALESCE(x.state_code, x.state), COALESCE(x.country_code, x.country, 'IN'),
        x.postal_code, x.google_pin, COALESCE(x.is_primary, FALSE), x.notes
      FROM jsonb_to_recordset(p_addresses) AS x(
        type TEXT, address_type TEXT, label TEXT, address_line1 TEXT, line1 TEXT,
        address_line2 TEXT, line2 TEXT, city TEXT, state_code TEXT, state TEXT,
        country_code TEXT, country TEXT, postal_code TEXT, google_pin TEXT,
        is_primary BOOLEAN, notes TEXT
      );
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'success', TRUE,
    'data', jsonb_build_object('id', p_contact_id),
    'was_duplicate', FALSE,
    'message', 'Contact updated successfully'
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', FALSE, 'error', SQLERRM, 'code', 'UPDATE_CONTACT_ERROR');
END;
$$;


-- ============================================================
-- 2. create_contact_idempotent_v2
-- CHANGED: Added manager_id + manager_name to INSERT block
-- ============================================================
CREATE OR REPLACE FUNCTION create_contact_idempotent_v2(
  p_idempotency_key TEXT,
  p_contact_data JSONB,
  p_contact_channels JSONB,
  p_addresses JSONB,
  p_contact_persons JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_contact_id UUID;
  v_existing_id UUID;
  v_person RECORD;
  v_person_contact_id UUID;
BEGIN
  -- Idempotency check
  INSERT INTO api_idempotency (key, resource_type)
  VALUES (p_idempotency_key, 'contact')
  ON CONFLICT (key) DO NOTHING;

  IF NOT FOUND THEN
    SELECT resource_id INTO v_existing_id
    FROM api_idempotency
    WHERE key = p_idempotency_key;

    IF v_existing_id IS NOT NULL THEN
      RETURN jsonb_build_object(
        'success', TRUE,
        'data', (SELECT to_jsonb(c.*) FROM t_contacts c WHERE c.id = v_existing_id),
        'was_duplicate', TRUE,
        'message', 'Contact already created with this idempotency key'
      );
    END IF;
  END IF;

  -- Create main contact
  INSERT INTO t_contacts (
    type, status, name, company_name, registration_number,
    salutation, designation, department, is_primary_contact,
    classifications, tags, compliance_numbers, notes,
    parent_contact_ids,
    manager_id, manager_name,                                    -- >>> NEW <<<
    tenant_id, auth_user_id, created_by, is_live
  )
  VALUES (
    (p_contact_data->>'type')::TEXT,
    COALESCE((p_contact_data->>'status')::TEXT, 'active'),
    (p_contact_data->>'name')::TEXT,
    (p_contact_data->>'company_name')::TEXT,
    (p_contact_data->>'registration_number')::TEXT,
    (p_contact_data->>'salutation')::TEXT,
    (p_contact_data->>'designation')::TEXT,
    (p_contact_data->>'department')::TEXT,
    COALESCE((p_contact_data->>'is_primary_contact')::BOOLEAN, FALSE),
    COALESCE(p_contact_data->'classifications', '[]'::JSONB),
    COALESCE(p_contact_data->'tags', '[]'::JSONB),
    COALESCE(p_contact_data->'compliance_numbers', '[]'::JSONB),
    (p_contact_data->>'notes')::TEXT,
    COALESCE(p_contact_data->'parent_contact_ids', '[]'::JSONB),
    (p_contact_data->>'manager_id')::UUID,                       -- >>> NEW <<<
    (p_contact_data->>'manager_name')::TEXT,                     -- >>> NEW <<<
    (p_contact_data->>'tenant_id')::UUID,
    (p_contact_data->>'auth_user_id')::UUID,
    (p_contact_data->>'created_by')::UUID,
    COALESCE((p_contact_data->>'is_live')::BOOLEAN, TRUE)
  )
  RETURNING id INTO v_contact_id;

  -- Bulk insert channels
  IF jsonb_array_length(p_contact_channels) > 0 THEN
    INSERT INTO t_contact_channels (contact_id, channel_type, value, country_code, is_primary, is_verified, notes)
    SELECT
      v_contact_id,
      x.channel_type, x.value, x.country_code,
      COALESCE(x.is_primary, FALSE),
      COALESCE(x.is_verified, FALSE),
      x.notes
    FROM jsonb_to_recordset(p_contact_channels) AS x(
      channel_type TEXT, value TEXT, country_code TEXT,
      is_primary BOOLEAN, is_verified BOOLEAN, notes TEXT
    );
  END IF;

  -- Bulk insert addresses
  IF jsonb_array_length(p_addresses) > 0 THEN
    INSERT INTO t_contact_addresses (contact_id, type, label, address_line1, address_line2, city, state_code, country_code, postal_code, google_pin, is_primary, notes)
    SELECT
      v_contact_id,
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

  -- Create contact persons
  IF jsonb_array_length(p_contact_persons) > 0 THEN
    FOR v_person IN
      SELECT * FROM jsonb_to_recordset(p_contact_persons) AS x(
        name TEXT, salutation TEXT, designation TEXT, department TEXT,
        is_primary BOOLEAN, notes TEXT, contact_channels JSONB
      )
    LOOP
      INSERT INTO t_contacts (
        type, status, name, salutation, designation, department,
        is_primary_contact, parent_contact_ids, classifications,
        tags, compliance_numbers, notes, tenant_id, created_by, is_live
      )
      VALUES (
        'individual', 'active', v_person.name, v_person.salutation,
        v_person.designation, v_person.department,
        COALESCE(v_person.is_primary, FALSE),
        jsonb_build_array(v_contact_id),
        '["team_member"]'::JSONB,
        '[]'::JSONB, '[]'::JSONB, v_person.notes,
        (p_contact_data->>'tenant_id')::UUID,
        (p_contact_data->>'created_by')::UUID,
        COALESCE((p_contact_data->>'is_live')::BOOLEAN, TRUE)
      )
      RETURNING id INTO v_person_contact_id;

      IF v_person.contact_channels IS NOT NULL AND jsonb_array_length(v_person.contact_channels) > 0 THEN
        INSERT INTO t_contact_channels (contact_id, channel_type, value, country_code, is_primary, is_verified, notes)
        SELECT
          v_person_contact_id,
          x.channel_type, x.value, x.country_code,
          COALESCE(x.is_primary, FALSE),
          COALESCE(x.is_verified, FALSE),
          x.notes
        FROM jsonb_to_recordset(v_person.contact_channels) AS x(
          channel_type TEXT, value TEXT, country_code TEXT,
          is_primary BOOLEAN, is_verified BOOLEAN, notes TEXT
        );
      END IF;
    END LOOP;
  END IF;

  -- Update idempotency record
  UPDATE api_idempotency SET resource_id = v_contact_id WHERE key = p_idempotency_key;

  RETURN jsonb_build_object(
    'success', TRUE,
    'data', jsonb_build_object('id', v_contact_id),
    'was_duplicate', FALSE,
    'message', 'Contact created successfully'
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', SQLERRM,
      'code', 'CREATE_CONTACT_ERROR'
    );
END;
$$;


-- ============================================================
-- 3. get_contact_full_v2
-- CHANGED: Added manager_id + manager_name to jsonb_build_object
-- ============================================================
CREATE OR REPLACE FUNCTION get_contact_full_v2(
  p_contact_id UUID,
  p_tenant_id UUID,
  p_is_live BOOLEAN DEFAULT TRUE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_contact JSONB;
BEGIN
  SELECT jsonb_build_object(
    'id', c.id,
    'name', c.name,
    'company_name', c.company_name,
    'type', c.type,
    'status', c.status,
    'classifications', c.classifications,
    'tags', COALESCE(c.tags, '[]'::JSONB),
    'compliance_numbers', COALESCE(c.compliance_numbers, '[]'::JSONB),
    'notes', c.notes,
    'salutation', c.salutation,
    'designation', c.designation,
    'department', c.department,
    'registration_number', c.registration_number,
    'parent_contact_ids', c.parent_contact_ids,
    'manager_id', c.manager_id,                                  -- >>> NEW <<<
    'manager_name', c.manager_name,                              -- >>> NEW <<<
    'potential_duplicate', c.potential_duplicate,
    'auth_user_id', c.auth_user_id,
    'tenant_id', c.tenant_id,
    'is_live', c.is_live,
    'created_at', c.created_at,
    'updated_at', c.updated_at,
    'created_by', c.created_by,
    'displayName', CASE
      WHEN c.type = 'corporate' THEN COALESCE(c.company_name, 'Unnamed Company')
      ELSE COALESCE(
        CASE WHEN c.salutation IS NOT NULL THEN c.salutation || '. ' ELSE '' END || c.name,
        'Unnamed Contact'
      )
    END,
    'contact_channels', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', ch.id,
          'channel_type', ch.channel_type,
          'value', ch.value,
          'country_code', ch.country_code,
          'is_primary', ch.is_primary,
          'is_verified', ch.is_verified,
          'notes', ch.notes
        ) ORDER BY ch.is_primary DESC, ch.created_at
      )
      FROM t_contact_channels ch
      WHERE ch.contact_id = c.id
    ), '[]'::JSONB),
    'addresses', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', a.id,
          'type', a.type,
          'label', a.label,
          'address_line1', a.address_line1,
          'address_line2', a.address_line2,
          'city', a.city,
          'state_code', a.state_code,
          'country_code', a.country_code,
          'postal_code', a.postal_code,
          'google_pin', a.google_pin,
          'is_primary', a.is_primary,
          'notes', a.notes
        ) ORDER BY a.is_primary DESC, a.created_at
      )
      FROM t_contact_addresses a
      WHERE a.contact_id = c.id
    ), '[]'::JSONB),
    'contact_addresses', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', a.id,
          'type', a.type,
          'label', a.label,
          'address_line1', a.address_line1,
          'address_line2', a.address_line2,
          'city', a.city,
          'state_code', a.state_code,
          'country_code', a.country_code,
          'postal_code', a.postal_code,
          'google_pin', a.google_pin,
          'is_primary', a.is_primary,
          'notes', a.notes
        ) ORDER BY a.is_primary DESC, a.created_at
      )
      FROM t_contact_addresses a
      WHERE a.contact_id = c.id
    ), '[]'::JSONB),
    'parent_contacts', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', p.id,
          'name', p.name,
          'company_name', p.company_name,
          'type', p.type,
          'status', p.status
        )
      )
      FROM t_contacts p
      WHERE p.id = ANY(
        SELECT jsonb_array_elements_text(c.parent_contact_ids)::UUID
      )
        AND p.is_live = p_is_live
        AND p.tenant_id = p_tenant_id
    ), '[]'::JSONB),
    'contact_persons', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', child.id,
          'name', child.name,
          'salutation', child.salutation,
          'designation', child.designation,
          'department', child.department,
          'type', child.type,
          'status', child.status,
          'contact_channels', COALESCE((
            SELECT jsonb_agg(
              jsonb_build_object(
                'id', ch2.id,
                'channel_type', ch2.channel_type,
                'value', ch2.value,
                'country_code', ch2.country_code,
                'is_primary', ch2.is_primary
              )
            )
            FROM t_contact_channels ch2
            WHERE ch2.contact_id = child.id
          ), '[]'::JSONB)
        )
      )
      FROM t_contacts child
      WHERE child.parent_contact_ids @> jsonb_build_array(c.id::TEXT)
        AND child.is_live = p_is_live
        AND child.tenant_id = p_tenant_id
        AND child.status != 'archived'
    ), '[]'::JSONB)
  )
  INTO v_contact
  FROM t_contacts c
  WHERE c.id = p_contact_id
    AND c.tenant_id = p_tenant_id
    AND c.is_live = p_is_live;

  IF v_contact IS NULL THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'Contact not found',
      'code', 'NOT_FOUND'
    );
  END IF;

  RETURN jsonb_build_object(
    'success', TRUE,
    'data', v_contact
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', SQLERRM,
      'code', SQLSTATE
    );
END;
$$;


-- ============================================================
-- 4. list_contacts_with_channels_v2
-- CHANGED: Added manager_id + manager_name to jsonb_build_object
-- ============================================================
CREATE OR REPLACE FUNCTION list_contacts_with_channels_v2(
  p_tenant_id UUID,
  p_is_live BOOLEAN DEFAULT TRUE,
  p_type TEXT DEFAULT NULL,
  p_status TEXT DEFAULT NULL,
  p_search TEXT DEFAULT NULL,
  p_classifications TEXT[] DEFAULT NULL,
  p_page INTEGER DEFAULT 1,
  p_limit INTEGER DEFAULT 20,
  p_sort_by TEXT DEFAULT 'created_at',
  p_sort_order TEXT DEFAULT 'desc',
  p_include_inactive BOOLEAN DEFAULT FALSE,
  p_include_archived BOOLEAN DEFAULT FALSE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_offset INTEGER;
  v_total INTEGER;
  v_contacts JSONB;
  v_result JSONB;
BEGIN
  -- Calculate offset
  v_offset := (p_page - 1) * p_limit;

  -- Get total count first
  SELECT COUNT(*)
  INTO v_total
  FROM t_contacts c
  WHERE c.tenant_id = p_tenant_id
    AND c.is_live = p_is_live
    AND (p_type IS NULL OR c.type = p_type)
    AND (
      p_status IS NULL
      OR c.status = p_status
      OR (p_include_inactive AND c.status = 'inactive')
      OR (p_include_archived AND c.status = 'archived')
    )
    AND (
      p_search IS NULL
      OR c.name ILIKE '%' || p_search || '%'
      OR c.company_name ILIKE '%' || p_search || '%'
    )
    AND (
      p_classifications IS NULL
      OR c.classifications ?| p_classifications
    );

  -- Get contacts with sorting applied via subquery
  SELECT COALESCE(jsonb_agg(contact_row), '[]'::jsonb)
  INTO v_contacts
  FROM (
    SELECT jsonb_build_object(
      'id', c.id,
      'type', c.type,
      'status', c.status,
      'name', c.name,
      'company_name', c.company_name,
      'displayName', CASE
        WHEN c.type = 'individual' AND c.salutation IS NOT NULL AND c.salutation != ''
        THEN c.salutation || ' ' || c.name
        ELSE COALESCE(c.name, c.company_name)
      END,
      'salutation', c.salutation,
      'designation', c.designation,
      'department', c.department,
      'classifications', c.classifications,
      'tags', c.tags,
      'notes', c.notes,
      'manager_id', c.manager_id,                               -- >>> NEW <<<
      'manager_name', c.manager_name,                           -- >>> NEW <<<
      'tenant_id', c.tenant_id,
      'auth_user_id', c.auth_user_id,
      'created_at', c.created_at,
      'updated_at', c.updated_at,
      'is_live', c.is_live,
      'primary_channel', (
        SELECT jsonb_build_object(
          'id', ch.id,
          'channel_type', ch.channel_type,
          'value', ch.value,
          'is_primary', ch.is_primary
        )
        FROM t_contact_channels ch
        WHERE ch.contact_id = c.id AND ch.is_primary = true
        LIMIT 1
      ),
      'primary_address', (
        SELECT jsonb_build_object(
          'id', a.id,
          'type', a.type,
          'address_line1', a.address_line1,
          'city', a.city,
          'state_code', a.state_code,
          'country_code', a.country_code,
          'is_primary', a.is_primary
        )
        FROM t_contact_addresses a
        WHERE a.contact_id = c.id AND a.is_primary = true
        LIMIT 1
      )
    ) AS contact_row
    FROM t_contacts c
    WHERE c.tenant_id = p_tenant_id
      AND c.is_live = p_is_live
      AND (p_type IS NULL OR c.type = p_type)
      AND (
        p_status IS NULL
        OR c.status = p_status
        OR (p_include_inactive AND c.status = 'inactive')
        OR (p_include_archived AND c.status = 'archived')
      )
      AND (
        p_search IS NULL
        OR c.name ILIKE '%' || p_search || '%'
        OR c.company_name ILIKE '%' || p_search || '%'
      )
      AND (
        p_classifications IS NULL
        OR c.classifications ?| p_classifications
      )
    ORDER BY
      CASE
        WHEN p_sort_by = 'name' THEN
          CASE WHEN p_sort_order = 'asc' THEN 1 ELSE -1 END *
          (CASE WHEN COALESCE(c.name, c.company_name) IS NULL THEN 1 ELSE 0 END)
        ELSE 0
      END,
      CASE WHEN p_sort_by = 'name' AND p_sort_order = 'asc' THEN LOWER(COALESCE(c.name, c.company_name)) END ASC NULLS LAST,
      CASE WHEN p_sort_by = 'name' AND p_sort_order = 'desc' THEN LOWER(COALESCE(c.name, c.company_name)) END DESC NULLS LAST,
      CASE WHEN p_sort_by = 'created_at' AND p_sort_order = 'asc' THEN c.created_at END ASC NULLS LAST,
      CASE WHEN p_sort_by = 'created_at' AND p_sort_order = 'desc' THEN c.created_at END DESC NULLS LAST,
      CASE WHEN p_sort_by = 'updated_at' AND p_sort_order = 'asc' THEN c.updated_at END ASC NULLS LAST,
      CASE WHEN p_sort_by = 'updated_at' AND p_sort_order = 'desc' THEN c.updated_at END DESC NULLS LAST,
      c.created_at DESC NULLS LAST
    LIMIT p_limit
    OFFSET v_offset
  ) AS ordered_contacts;

  -- Build result
  v_result := jsonb_build_object(
    'success', true,
    'data', jsonb_build_object(
      'contacts', v_contacts,
      'pagination', jsonb_build_object(
        'page', p_page,
        'limit', p_limit,
        'total', v_total,
        'totalPages', CEIL(v_total::FLOAT / p_limit)
      )
    )
  );

  RETURN v_result;

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM,
    'code', SQLSTATE
  );
END;
$$;


-- ============================================================
-- DONE. All 4 RPCs updated with manager_id + manager_name.
-- ============================================================
