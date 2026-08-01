-- ============================================================================
-- 024 — admin JTD Event Explorer surfaces TEST-env records
-- ============================================================================
-- get_admin_jtd_events had `WHERE j.is_live = true` hard-coded — so any JTD
-- record enqueued while a tenant admin was in TEST environment (is_live=false)
-- was permanently invisible in Admin → JTD → Event Explorer, regardless of
-- filters. Reason: BBB's TEST-env attendance-ack records (source_type_code
-- group_session_attendance_ack, 2026-08-01) DID exist in n_jtd and DID get
-- gated correctly by jtd-worker's TEST-env guardrail, but were unreachable
-- for a tenant admin trying to debug why "nothing happened" — the pipeline
-- was working end-to-end and the diagnostic surface was hiding proof of it.
--
-- Fix: replace the hard-coded predicate with a nullable p_is_live parameter.
-- Default NULL = show both environments (safer for debugging than the old
-- LIVE-only default — an admin actively looking at this page is usually
-- trying to find WHY something didn't send, not filter it out).
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_admin_jtd_events(
  p_page             integer     DEFAULT 1,
  p_limit            integer     DEFAULT 50,
  p_tenant_id        uuid        DEFAULT NULL,
  p_status_code      text        DEFAULT NULL,
  p_event_type_code  text        DEFAULT NULL,
  p_channel_code     text        DEFAULT NULL,
  p_source_type_code text        DEFAULT NULL,
  p_search           text        DEFAULT NULL,
  p_date_from        timestamptz DEFAULT NULL,
  p_date_to          timestamptz DEFAULT NULL,
  p_sort_by          text        DEFAULT 'created_at',
  p_sort_dir         text        DEFAULT 'desc',
  p_is_live          boolean     DEFAULT NULL  -- NULL = both envs (default); true = LIVE only; false = TEST only
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_offset int;
  v_total  int;
  v_events jsonb;
BEGIN
  v_offset := (p_page - 1) * p_limit;

  SELECT count(*) INTO v_total
  FROM n_jtd j
  WHERE (p_is_live         IS NULL OR j.is_live          = p_is_live)
    AND (p_tenant_id        IS NULL OR j.tenant_id        = p_tenant_id)
    AND (p_status_code      IS NULL OR j.status_code      = p_status_code)
    AND (p_event_type_code  IS NULL OR j.event_type_code  = p_event_type_code)
    AND (p_channel_code     IS NULL OR j.channel_code     = p_channel_code)
    AND (p_source_type_code IS NULL OR j.source_type_code = p_source_type_code)
    AND (p_date_from        IS NULL OR j.created_at      >= p_date_from)
    AND (p_date_to          IS NULL OR j.created_at      <= p_date_to)
    AND (p_search           IS NULL
         OR j.recipient_name    ILIKE '%' || p_search || '%'
         OR j.recipient_contact ILIKE '%' || p_search || '%'
         OR j.source_ref        ILIKE '%' || p_search || '%'
         OR j.id::text          ILIKE '%' || p_search || '%');

  SELECT COALESCE(jsonb_agg(row_data), '[]'::jsonb) INTO v_events
  FROM (
    SELECT jsonb_build_object(
      'id',                 j.id,
      'tenant_id',          j.tenant_id,
      'tenant_name',        t.name,
      'is_live',            j.is_live,
      'event_type_code',    j.event_type_code,
      'channel_code',       j.channel_code,
      'source_type_code',   j.source_type_code,
      'source_ref',         j.source_ref,
      'status_code',        j.status_code,
      'previous_status',    j.previous_status_code,
      'priority',           j.priority,
      'recipient_name',     j.recipient_name,
      'recipient_contact',  j.recipient_contact,
      'template_key',       j.template_key,
      'retry_count',        j.retry_count,
      'max_retries',        j.max_retries,
      'cost',               j.cost,
      'error_message',      j.error_message,
      'error_code',         j.error_code,
      'provider_code',      j.provider_code,
      'provider_message_id',j.provider_message_id,
      'performed_by_type',  j.performed_by_type,
      'performed_by_name',  j.performed_by_name,
      'scheduled_at',       j.scheduled_at,
      'executed_at',        j.executed_at,
      'completed_at',       j.completed_at,
      'created_at',         j.created_at,
      'status_changes',     COALESCE((
        SELECT count(*) FROM n_jtd_status_history sh WHERE sh.jtd_id = j.id
      ), 0)
    ) AS row_data
    FROM n_jtd j
    JOIN t_tenants t ON t.id = j.tenant_id
    WHERE (p_is_live         IS NULL OR j.is_live          = p_is_live)
      AND (p_tenant_id        IS NULL OR j.tenant_id        = p_tenant_id)
      AND (p_status_code      IS NULL OR j.status_code      = p_status_code)
      AND (p_event_type_code  IS NULL OR j.event_type_code  = p_event_type_code)
      AND (p_channel_code     IS NULL OR j.channel_code     = p_channel_code)
      AND (p_source_type_code IS NULL OR j.source_type_code = p_source_type_code)
      AND (p_date_from        IS NULL OR j.created_at      >= p_date_from)
      AND (p_date_to          IS NULL OR j.created_at      <= p_date_to)
      AND (p_search           IS NULL
           OR j.recipient_name    ILIKE '%' || p_search || '%'
           OR j.recipient_contact ILIKE '%' || p_search || '%'
           OR j.source_ref        ILIKE '%' || p_search || '%'
           OR j.id::text          ILIKE '%' || p_search || '%')
    ORDER BY
      CASE WHEN p_sort_by = 'created_at' AND p_sort_dir = 'desc' THEN j.created_at END DESC,
      CASE WHEN p_sort_by = 'created_at' AND p_sort_dir = 'asc'  THEN j.created_at END ASC,
      CASE WHEN p_sort_by = 'priority'   AND p_sort_dir = 'desc' THEN j.priority   END DESC,
      CASE WHEN p_sort_by = 'priority'   AND p_sort_dir = 'asc'  THEN j.priority   END ASC,
      CASE WHEN p_sort_by = 'status'     AND p_sort_dir = 'asc'  THEN j.status_code END ASC,
      CASE WHEN p_sort_by = 'status'     AND p_sort_dir = 'desc' THEN j.status_code END DESC,
      j.created_at DESC
    LIMIT p_limit
    OFFSET v_offset
  ) sub;

  RETURN jsonb_build_object(
    'events',     v_events,
    'pagination', jsonb_build_object(
      'current_page',  p_page,
      'total_pages',   CEIL(v_total::float / p_limit)::int,
      'total_records', v_total,
      'limit',         p_limit,
      'has_next',      (v_offset + p_limit) < v_total,
      'has_prev',      p_page > 1
    ),
    'generated_at', NOW()
  );
END;
$function$;
