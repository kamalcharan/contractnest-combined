-- ============================================================
-- GET CONTACT STATS RPC FUNCTION
-- Efficiently retrieves contact statistics in a single query
-- ============================================================

-- Function: Get contact statistics with counts by status, type, and classification
-- This replaces the inefficient JS-based counting with a single SQL query
CREATE OR REPLACE FUNCTION get_contact_stats(
  p_tenant_id uuid,
  p_is_live boolean DEFAULT true,
  p_type text DEFAULT NULL,
  p_search text DEFAULT NULL,
  p_classifications text[] DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result jsonb;
  v_total integer;
  v_active integer;
  v_inactive integer;
  v_archived integer;
  v_individual integer;
  v_corporate integer;
  v_duplicates integer;
  v_buyer integer;
  v_seller integer;
  v_vendor integer;
  v_partner integer;
  v_team_member integer;
  v_team_staff integer;
  v_supplier integer;
  v_customer integer;
  v_lead integer;
BEGIN
  -- Build counts with a single query using conditional aggregation
  SELECT
    COUNT(*) AS total,
    COUNT(*) FILTER (WHERE status = 'active') AS active,
    COUNT(*) FILTER (WHERE status = 'inactive') AS inactive,
    COUNT(*) FILTER (WHERE status = 'archived') AS archived,
    COUNT(*) FILTER (WHERE type = 'individual') AS individual,
    COUNT(*) FILTER (WHERE type = 'corporate') AS corporate,
    COUNT(*) FILTER (WHERE potential_duplicate = true) AS duplicates,
    COUNT(*) FILTER (WHERE classifications ? 'buyer') AS buyer,
    COUNT(*) FILTER (WHERE classifications ? 'seller') AS seller,
    COUNT(*) FILTER (WHERE classifications ? 'vendor') AS vendor,
    COUNT(*) FILTER (WHERE classifications ? 'partner') AS partner,
    COUNT(*) FILTER (WHERE classifications ? 'team_member') AS team_member,
    COUNT(*) FILTER (WHERE classifications ? 'team_staff') AS team_staff,
    COUNT(*) FILTER (WHERE classifications ? 'supplier') AS supplier,
    COUNT(*) FILTER (WHERE classifications ? 'customer') AS customer,
    COUNT(*) FILTER (WHERE classifications ? 'lead') AS lead
  INTO
    v_total, v_active, v_inactive, v_archived,
    v_individual, v_corporate, v_duplicates,
    v_buyer, v_seller, v_vendor, v_partner, v_team_member,
    v_team_staff, v_supplier, v_customer, v_lead
  FROM t_contacts
  WHERE
    tenant_id = p_tenant_id
    AND is_live = p_is_live
    -- Optional type filter
    AND (p_type IS NULL OR type = p_type)
    -- Optional search filter
    AND (
      p_search IS NULL
      OR name ILIKE '%' || p_search || '%'
      OR company_name ILIKE '%' || p_search || '%'
    )
    -- Optional classifications filter (matches if contact has ANY of the requested classifications)
    AND (
      p_classifications IS NULL
      OR classifications ?| p_classifications
    );

  -- Build the result JSON
  v_result := jsonb_build_object(
    'success', true,
    'data', jsonb_build_object(
      'total', v_total,
      'active', v_active,
      'inactive', v_inactive,
      'archived', v_archived,
      'by_type', jsonb_build_object(
        'individual', v_individual,
        'corporate', v_corporate
      ),
      'by_classification', jsonb_build_object(
        'buyer', v_buyer,
        'seller', v_seller,
        'vendor', v_vendor,
        'partner', v_partner,
        'team_member', v_team_member,
        'team_staff', v_team_staff,
        'supplier', v_supplier,
        'customer', v_customer,
        'lead', v_lead
      ),
      'duplicates', v_duplicates
    )
  );

  RETURN v_result;

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'code', SQLSTATE
    );
END;
$$;

-- ============================================================
-- LIST CONTACTS WITH CLASSIFICATION FILTER RPC FUNCTION
-- Efficiently filters and paginates contacts at the database level
-- ============================================================

-- Function: List contacts with proper pagination and classification filtering at DB level
CREATE OR REPLACE FUNCTION list_contacts_filtered(
  p_tenant_id uuid,
  p_is_live boolean DEFAULT true,
  p_page integer DEFAULT 1,
  p_limit integer DEFAULT 20,
  p_type text DEFAULT NULL,
  p_status text DEFAULT NULL,
  p_search text DEFAULT NULL,
  p_classifications text[] DEFAULT NULL,
  p_user_status text DEFAULT NULL,
  p_show_duplicates boolean DEFAULT false,
  p_include_inactive boolean DEFAULT false,
  p_include_archived boolean DEFAULT false,
  p_sort_by text DEFAULT 'created_at',
  p_sort_order text DEFAULT 'desc'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_offset integer;
  v_contacts jsonb;
  v_total_count integer;
  v_total_pages integer;
  v_result jsonb;
  v_status_filter text[];
BEGIN
  -- Calculate offset
  v_offset := (p_page - 1) * p_limit;

  -- Build status filter array
  IF p_status IS NOT NULL AND p_status != 'all' THEN
    v_status_filter := ARRAY[p_status];
  ELSIF p_include_inactive AND p_include_archived THEN
    v_status_filter := ARRAY['active', 'inactive', 'archived'];
  ELSIF p_include_inactive THEN
    v_status_filter := ARRAY['active', 'inactive'];
  ELSIF p_include_archived THEN
    v_status_filter := ARRAY['active', 'archived'];
  ELSE
    v_status_filter := ARRAY['active'];
  END IF;

  -- Get total count first
  SELECT COUNT(*)
  INTO v_total_count
  FROM t_contacts c
  WHERE
    c.tenant_id = p_tenant_id
    AND c.is_live = p_is_live
    AND c.status = ANY(v_status_filter)
    -- Optional type filter
    AND (p_type IS NULL OR c.type = p_type)
    -- Optional search filter
    AND (
      p_search IS NULL
      OR c.name ILIKE '%' || p_search || '%'
      OR c.company_name ILIKE '%' || p_search || '%'
    )
    -- Optional classifications filter (matches if contact has ANY of the requested classifications)
    AND (
      p_classifications IS NULL
      OR c.classifications ?| p_classifications
    )
    -- Optional user status filter
    AND (
      p_user_status IS NULL
      OR (p_user_status = 'user' AND c.auth_user_id IS NOT NULL)
      OR (p_user_status = 'not_user' AND c.auth_user_id IS NULL)
    )
    -- Optional duplicates filter
    AND (
      NOT p_show_duplicates
      OR c.potential_duplicate = true
    );

  -- Calculate total pages
  v_total_pages := CEIL(v_total_count::float / p_limit);

  -- Get paginated contacts with dynamic sorting
  SELECT jsonb_agg(contact_row ORDER BY
    CASE WHEN p_sort_by = 'created_at' AND p_sort_order = 'desc' THEN contact_row->>'created_at' END DESC NULLS LAST,
    CASE WHEN p_sort_by = 'created_at' AND p_sort_order = 'asc' THEN contact_row->>'created_at' END ASC NULLS LAST,
    CASE WHEN p_sort_by = 'name' AND p_sort_order = 'desc' THEN contact_row->>'name' END DESC NULLS LAST,
    CASE WHEN p_sort_by = 'name' AND p_sort_order = 'asc' THEN contact_row->>'name' END ASC NULLS LAST,
    CASE WHEN p_sort_by = 'updated_at' AND p_sort_order = 'desc' THEN contact_row->>'updated_at' END DESC NULLS LAST,
    CASE WHEN p_sort_by = 'updated_at' AND p_sort_order = 'asc' THEN contact_row->>'updated_at' END ASC NULLS LAST
  )
  INTO v_contacts
  FROM (
    SELECT jsonb_build_object(
      'id', c.id,
      'name', c.name,
      'company_name', c.company_name,
      'type', c.type,
      'status', c.status,
      'classifications', c.classifications,
      'created_at', c.created_at,
      'updated_at', c.updated_at,
      'parent_contact_ids', c.parent_contact_ids,
      'tenant_id', c.tenant_id,
      'potential_duplicate', c.potential_duplicate,
      'notes', c.notes,
      'salutation', c.salutation,
      'designation', c.designation,
      'department', c.department
    ) AS contact_row
    FROM t_contacts c
    WHERE
      c.tenant_id = p_tenant_id
      AND c.is_live = p_is_live
      AND c.status = ANY(v_status_filter)
      AND (p_type IS NULL OR c.type = p_type)
      AND (
        p_search IS NULL
        OR c.name ILIKE '%' || p_search || '%'
        OR c.company_name ILIKE '%' || p_search || '%'
      )
      AND (
        p_classifications IS NULL
        OR c.classifications ?| p_classifications
      )
      AND (
        p_user_status IS NULL
        OR (p_user_status = 'user' AND c.auth_user_id IS NOT NULL)
        OR (p_user_status = 'not_user' AND c.auth_user_id IS NULL)
      )
      AND (
        NOT p_show_duplicates
        OR c.potential_duplicate = true
      )
    ORDER BY
      CASE WHEN p_sort_by = 'created_at' AND p_sort_order = 'desc' THEN c.created_at END DESC NULLS LAST,
      CASE WHEN p_sort_by = 'created_at' AND p_sort_order = 'asc' THEN c.created_at END ASC NULLS LAST,
      CASE WHEN p_sort_by = 'name' AND p_sort_order = 'desc' THEN c.name END DESC NULLS LAST,
      CASE WHEN p_sort_by = 'name' AND p_sort_order = 'asc' THEN c.name END ASC NULLS LAST,
      CASE WHEN p_sort_by = 'updated_at' AND p_sort_order = 'desc' THEN c.updated_at END DESC NULLS LAST,
      CASE WHEN p_sort_by = 'updated_at' AND p_sort_order = 'asc' THEN c.updated_at END ASC NULLS LAST
    LIMIT p_limit
    OFFSET v_offset
  ) AS subq;

  -- Build the result JSON
  v_result := jsonb_build_object(
    'success', true,
    'data', jsonb_build_object(
      'contacts', COALESCE(v_contacts, '[]'::jsonb),
      'pagination', jsonb_build_object(
        'page', p_page,
        'limit', p_limit,
        'total', v_total_count,
        'totalPages', v_total_pages
      )
    )
  );

  RETURN v_result;

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'code', SQLSTATE
    );
END;
$$;

-- Grant execute permissions (adjust role as needed)
-- GRANT EXECUTE ON FUNCTION get_contact_stats TO authenticated;
-- GRANT EXECUTE ON FUNCTION list_contacts_filtered TO authenticated;
