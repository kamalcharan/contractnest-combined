-- 081_contact_stats_live_duplicates.sql
-- ALREADY APPLIED LIVE (2026-09-16) — this file is a source-of-record copy.
-- DO NOT RE-RUN.
--
-- get_contact_stats's 'duplicates' count read t_contacts.potential_duplicate
-- (see 079 — never populated in production). Swapped to the same live
-- get_tenant_duplicate_contact_ids() set 079/080 use, so the stat and the
-- "Possible duplicates" filter always agree. Kept inside the same filtered
-- v_counts SELECT so it still respects any active search/classification
-- filter, exactly as the old column-based count did — only the predicate
-- source changed.
CREATE OR REPLACE FUNCTION public.get_contact_stats(p_tenant_id uuid, p_is_live boolean DEFAULT true, p_type text DEFAULT NULL::text, p_search text DEFAULT NULL::text, p_classifications text[] DEFAULT NULL::text[], p_tags text[] DEFAULT NULL::text[])
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_counts record;
  v_archived integer;
  v_by_tag jsonb;
BEGIN
  SELECT
    COUNT(*) AS total,
    COUNT(*) FILTER (WHERE status = 'active') AS active,
    COUNT(*) FILTER (WHERE status = 'inactive') AS inactive,
    COUNT(*) FILTER (WHERE type = 'individual') AS individual,
    COUNT(*) FILTER (WHERE type = 'corporate') AS corporate,
    COUNT(*) FILTER (WHERE id IN (SELECT contact_id FROM get_tenant_duplicate_contact_ids(p_tenant_id, p_is_live))) AS duplicates,
    COUNT(*) FILTER (WHERE classifications ? 'client') AS client,
    COUNT(*) FILTER (WHERE classifications ? 'buyer') AS buyer,
    COUNT(*) FILTER (WHERE classifications ? 'seller') AS seller,
    COUNT(*) FILTER (WHERE classifications ? 'vendor') AS vendor,
    COUNT(*) FILTER (WHERE classifications ? 'partner') AS partner,
    COUNT(*) FILTER (WHERE classifications ? 'team_member') AS team_member,
    COUNT(*) FILTER (WHERE classifications ? 'team_staff') AS team_staff,
    COUNT(*) FILTER (WHERE classifications ? 'supplier') AS supplier,
    COUNT(*) FILTER (WHERE classifications ? 'customer') AS customer,
    COUNT(*) FILTER (WHERE classifications ? 'lead') AS lead
  INTO v_counts
  FROM t_contacts
  WHERE
    tenant_id = p_tenant_id
    AND is_live = p_is_live
    AND status <> 'archived'  -- 077b: soft-deleted rows never count
    AND (parent_contact_id IS NULL OR p_tags IS NOT NULL)
    AND (p_type IS NULL OR type = p_type)
    AND (
      p_search IS NULL
      OR name ILIKE '%' || p_search || '%'
      OR company_name ILIKE '%' || p_search || '%'
    )
    AND (
      p_classifications IS NULL
      OR classifications ?| p_classifications
    )
    AND (
      p_tags IS NULL
      OR EXISTS (
        SELECT 1 FROM jsonb_array_elements(COALESCE(tags, '[]'::jsonb)) AS tg
        WHERE lower(tg->>'tag_value') IN (SELECT lower(unnest_tag) FROM unnest(p_tags) AS unnest_tag)
      )
    );

  SELECT COUNT(*) INTO v_archived
  FROM t_contacts
  WHERE tenant_id = p_tenant_id AND is_live = p_is_live AND status = 'archived'
    AND (parent_contact_id IS NULL OR p_tags IS NOT NULL);

  -- Per-tag counts over the same population EXCEPT the tag filter itself.
  -- Children always counted (077); archived never counted (077b).
  SELECT COALESCE(jsonb_object_agg(tag_value, cnt), '{}'::jsonb)
  INTO v_by_tag
  FROM (
    SELECT tg->>'tag_value' AS tag_value, COUNT(DISTINCT c.id) AS cnt
    FROM t_contacts c
    CROSS JOIN LATERAL jsonb_array_elements(COALESCE(c.tags, '[]'::jsonb)) AS tg
    WHERE c.tenant_id = p_tenant_id
      AND c.is_live = p_is_live
      AND c.status <> 'archived'
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
      AND (tg->>'tag_value') IS NOT NULL
    GROUP BY tg->>'tag_value'
  ) tag_counts;

  RETURN jsonb_build_object(
    'success', true,
    'data', jsonb_build_object(
      'total', v_counts.total,
      'active', v_counts.active,
      'inactive', v_counts.inactive,
      'archived', v_archived,
      'by_type', jsonb_build_object(
        'individual', v_counts.individual,
        'corporate', v_counts.corporate
      ),
      'by_classification', jsonb_build_object(
        'client', v_counts.client,
        'buyer', v_counts.buyer,
        'seller', v_counts.seller,
        'vendor', v_counts.vendor,
        'partner', v_counts.partner,
        'team_member', v_counts.team_member,
        'team_staff', v_counts.team_staff,
        'supplier', v_counts.supplier,
        'customer', v_counts.customer,
        'lead', v_counts.lead
      ),
      'by_tag', v_by_tag,
      'duplicates', v_counts.duplicates
    )
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'code', SQLSTATE
    );
END;
$function$;
