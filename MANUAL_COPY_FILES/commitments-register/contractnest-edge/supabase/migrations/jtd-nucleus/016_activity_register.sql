-- ============================================================================
-- 016_activity_register.sql — the Commitments Register's Activity tab
-- (batch commitments-register, 2026-09-17)
-- ============================================================================
-- Owner: "Event Schedule should answer 'what appointments / follow-ups did we
-- have' … Commitments Register — go ahead."
--
-- jtd_activity = the contract timeline (jtd_contract_activity, 012/013/014)
-- with the contract filter made optional and Who / kind-group / date / search
-- filters added, tenant-wide. Same row shape (+ contract_id, contract_number,
-- buyer_name per row), same paging, same rendered message. Grouped into what
-- a person asks for: appointments · follow-ups · calls · reminders · visits ·
-- payments · other. Counts per group are computed over the window ignoring
-- the group filter, so the chips stay a stable map. Default window: the last
-- 30 days (BBB alone holds 500+ group-session messages in 90 days).
-- Never returns balances or totals of money.
-- APPLIED LIVE 2026-09-17. Source of record. Spec: OPS-JTD-TOOLS-SPEC §5.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.jtd_activity(
  p_tenant  uuid,
  p_is_live boolean DEFAULT true,
  p_filters jsonb   DEFAULT '{}'::jsonb
) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_today  date := (now() AT TIME ZONE 'Asia/Kolkata')::date;
  v_from   date; v_to date; v_from_ts timestamptz; v_to_ts timestamptz;
  v_groups text[]; v_who uuid; v_q text; v_contract uuid; v_limit integer; v_offset integer;
  v_out jsonb; v_team jsonb;
BEGIN
  IF p_tenant IS NULL THEN RETURN jsonb_build_object('success', false, 'reason', 'tenant_required'); END IF;
  p_filters := COALESCE(p_filters, '{}'::jsonb);
  BEGIN v_from := NULLIF(p_filters->>'from','')::date; EXCEPTION WHEN others THEN v_from := NULL; END;
  BEGIN v_to   := NULLIF(p_filters->>'to','')::date;   EXCEPTION WHEN others THEN v_to := NULL; END;
  v_to   := COALESCE(v_to, v_today);
  v_from := COALESCE(v_from, v_to - 30);
  IF v_from > v_to THEN v_from := v_to - 30; END IF;
  -- IST calendar days → timestamptz bounds
  v_from_ts := (v_from::timestamp) AT TIME ZONE 'Asia/Kolkata';
  v_to_ts   := ((v_to + 1)::timestamp) AT TIME ZONE 'Asia/Kolkata';
  IF jsonb_typeof(p_filters->'groups') = 'array' AND jsonb_array_length(p_filters->'groups') > 0 THEN
    v_groups := ARRAY(SELECT jsonb_array_elements_text(p_filters->'groups'));
  END IF;
  BEGIN v_who := NULLIF(p_filters->>'who','')::uuid; EXCEPTION WHEN others THEN v_who := NULL; END;
  BEGIN v_contract := NULLIF(p_filters->>'contract_id','')::uuid; EXCEPTION WHEN others THEN v_contract := NULL; END;
  v_q := NULLIF(TRIM(COALESCE(p_filters->>'q', '')), '');
  BEGIN v_limit := NULLIF(p_filters->>'limit','')::numeric::integer; EXCEPTION WHEN others THEN v_limit := NULL; END;
  BEGIN v_offset := NULLIF(p_filters->>'offset','')::numeric::integer; EXCEPTION WHEN others THEN v_offset := NULL; END;
  v_limit  := LEAST(GREATEST(COALESCE(v_limit, 50), 1), 500);
  v_offset := GREATEST(COALESCE(v_offset, 0), 0);

  WITH ctr AS (
    SELECT c.id, c.contract_number, c.buyer_id, c.buyer_name FROM public.t_contracts c
     WHERE c.tenant_id = p_tenant AND (v_contract IS NULL OR c.id = v_contract)
  ),
  jobs AS (
    SELECT j.id, j.contract_id, j.recipient_name, j.amount, j.currency FROM public.n_jtd j
     WHERE j.tenant_id = p_tenant AND j.event_type_code = 'payment' AND COALESCE(j.is_live, true) = p_is_live
  ),
  svc AS (
    SELECT al.id::text AS id, 'service'::text AS source, (COALESCE(al.category,'content') || ':' || al.action)::text AS kind, al.created_at AS at,
           'user'::text AS actor_type, COALESCE(al.performed_by_name, 'System')::text AS actor_name,
           COALESCE(NULLIF(al.description,''), initcap(replace(al.action,'_',' ')))::text AS title,
           NULL::text AS detail,
           COALESCE(CASE WHEN jsonb_typeof(al.old_value) = 'string' THEN al.old_value #>> '{}' END, al.old_value->>'status', al.old_value->>'assigned_to_name')::text AS from_v,
           COALESCE(CASE WHEN jsonb_typeof(al.new_value) = 'string' THEN al.new_value #>> '{}' END, al.new_value->>'status', al.new_value->>'assigned_to_name')::text AS to_v,
           NULL::text AS channel, NULL::text AS status, NULL::numeric AS amount, NULL::text AS currency,
           NULL::uuid AS job_id, CASE WHEN al.entity_type IN ('contract_event','event') THEN al.entity_id END AS event_id, al.id AS ref_id,
           al.category::text AS category, NULL::jsonb AS message,
           c.id AS contract_id, c.contract_number, c.buyer_name, al.performed_by AS who_id,
           CASE al.entity_type WHEN 'appointment' THEN 'appointments'
                               WHEN 'service_ticket' THEN 'visits' WHEN 'contract_event' THEN 'visits' WHEN 'event' THEN 'visits' WHEN 'event_asset' THEN 'visits'
                               ELSE 'other' END::text AS grp
      FROM public.t_audit_log al JOIN ctr c ON c.id = al.contract_id
     WHERE al.tenant_id = p_tenant AND al.created_at >= v_from_ts AND al.created_at < v_to_ts
  ),
  bill AS (
    SELECT a.id::text, 'billing', ('event:' || a.field_changed)::text, a.changed_at,
           CASE WHEN a.changed_by IS NULL THEN 'system' ELSE 'user' END::text, COALESCE(a.changed_by_name, 'System')::text,
           ((CASE WHEN e.event_type = 'service' THEN 'Service visit ' ELSE 'Billing event ' END) || COALESCE(e.billing_cycle_label, 'instalment ' || e.sequence_number::text, '') || ' · ' || replace(a.field_changed, '_', ' ') || ' changed')::text,
           a.reason::text, a.old_value::text, a.new_value::text,
           NULL::text, NULL::text, e.amount, COALESCE(e.currency, 'INR')::text,
           e.id, e.id, a.id, 'billing_events'::text, NULL::jsonb,
           c.id, c.contract_number, c.buyer_name, a.changed_by,
           CASE WHEN e.event_type = 'service' THEN 'visits' ELSE 'payments' END::text
      FROM public.t_contract_event_audit a
      JOIN public.t_contract_events e ON e.id = a.event_id
      JOIN ctr c ON c.id = e.contract_id
     WHERE a.tenant_id = p_tenant AND COALESCE(e.is_live, true) = p_is_live AND a.changed_at >= v_from_ts AND a.changed_at < v_to_ts
  ),
  comms AS (
    SELECT n.id::text, 'collections', n.source_type_code::text, n.created_at,
           COALESCE(n.performed_by_type, 'system')::text,
           COALESCE(n.performed_by_name, CASE WHEN n.performed_by_type = 'vani' THEN 'VaNi' ELSE 'System' END)::text,
           CASE n.source_type_code
             WHEN 'payment_nudge_email'    THEN 'Reminder by email to ' || COALESCE(n.recipient_name, n.recipient_contact, 'the customer') || CASE WHEN COALESCE(n.dunning_step,0) > 0 THEN ' · rung ' || n.dunning_step ELSE ' · heads-up' END
             WHEN 'payment_nudge_whatsapp' THEN 'Reminder on WhatsApp to ' || COALESCE(n.recipient_name, n.recipient_contact, 'the customer') || CASE WHEN COALESCE(n.dunning_step,0) > 0 THEN ' · rung ' || n.dunning_step ELSE ' · heads-up' END
             WHEN 'payment_call_due'       THEN CASE WHEN n.business_context->>'task_kind' = 'follow_up' THEN 'Follow-up set' ELSE 'Call assigned to ' || COALESCE(n.assigned_to_name, 'a teammate') END
                                                || CASE WHEN n.scheduled_at IS NOT NULL THEN ' · due ' || to_char(n.scheduled_at AT TIME ZONE 'Asia/Kolkata', 'DD Mon YYYY') ELSE '' END
             WHEN 'payment_call_logged'    THEN 'Called ' || COALESCE(n.recipient_name, 'the customer') || ' — ' || COALESCE(replace(n.metadata->>'outcome', '_', ' '), 'logged')
             WHEN 'payment_due'            THEN 'Automated payment reminder' || CASE WHEN n.channel_code IS NOT NULL THEN ' by ' || n.channel_code ELSE '' END || CASE WHEN n.recipient_name IS NOT NULL THEN ' to ' || n.recipient_name ELSE '' END
             WHEN 'payment_received'       THEN 'Payment received notice' || CASE WHEN n.channel_code IS NOT NULL THEN ' by ' || n.channel_code ELSE '' END || CASE WHEN n.recipient_name IS NOT NULL THEN ' to ' || n.recipient_name ELSE '' END
             WHEN 'visit_slot_request'     THEN 'Asked ' || COALESCE(n.recipient_name, 'the customer') || ' to confirm a visit slot' || CASE WHEN n.channel_code IS NOT NULL THEN ' by ' || n.channel_code ELSE '' END
             ELSE initcap(replace(n.source_type_code, '_', ' ')) || CASE WHEN n.channel_code IS NOT NULL THEN ' by ' || n.channel_code ELSE '' END || CASE WHEN n.recipient_name IS NOT NULL THEN ' to ' || n.recipient_name ELSE '' END
           END::text,
           COALESCE(n.notes, n.error_message)::text, NULL::text, NULL::text,
           n.channel_code::text, n.status_code::text, n.amount, COALESCE(n.currency, 'INR')::text,
           CASE WHEN jb.id IS NOT NULL THEN jb.id END, NULL::uuid, n.id, 'collections'::text,
           CASE WHEN n.channel_code IN ('email','whatsapp','sms') AND jsonb_typeof(n.template_variables) = 'object'
                THEN public.jtd_render_message(n.tenant_id, n.source_type_code, n.channel_code, n.template_variables) END,
           c.id, c.contract_number, c.buyer_name, COALESCE(n.assigned_to, n.performed_by_id),
           CASE WHEN n.source_type_code = 'payment_call_due' AND n.business_context->>'task_kind' = 'follow_up' THEN 'followups'
                WHEN n.source_type_code IN ('payment_call_due','payment_call_logged') THEN 'calls'
                WHEN n.source_type_code IN ('visit_slot_request','service_visit_scheduled') THEN 'appointments'
                WHEN n.source_type_code IN ('service_visit_started','service_visit_completed','service_reminder','service_scheduled') THEN 'visits'
                WHEN n.source_type_code IN ('payment_received') THEN 'payments'
                WHEN n.event_type_code IN ('reminder','notification') THEN 'reminders'
                ELSE 'other' END::text
      FROM public.n_jtd n
      LEFT JOIN jobs jb ON jb.id = n.source_id
      JOIN ctr c ON c.id = COALESCE(n.contract_id, jb.contract_id,
                                    CASE WHEN (n.business_context->>'contract_id') ~ '^[0-9a-f-]{36}$' THEN (n.business_context->>'contract_id')::uuid END)
     WHERE n.tenant_id = p_tenant AND COALESCE(n.is_live, true) = p_is_live
       AND n.event_type_code NOT IN ('payment', 'service_visit')
       AND n.created_at >= v_from_ts AND n.created_at < v_to_ts
  ),
  hist AS (
    SELECT h.id::text, 'collections', (CASE WHEN h.action IN ('paused','resumed') THEN 'ladder_' ELSE '' END || h.action)::text, h.created_at,
           COALESCE(h.performed_by_type, 'user')::text, COALESCE(h.performed_by_name, 'Someone')::text,
           (CASE h.action
              WHEN 'paused'  THEN 'Reminders paused' || COALESCE(' · ' || (h.details->>'reason'), '') || COALESCE(' until ' || to_char((h.details->>'until')::date, 'DD Mon YYYY'), '')
              WHEN 'resumed' THEN 'Reminders resumed'
              WHEN 'visit_assigned'       THEN 'Visit assigned to ' || COALESCE(h.details->>'assigned_to_name', 'a technician')
              WHEN 'visit_scheduled'      THEN 'Slot proposed' || COALESCE(' for ' || to_char((h.details->>'scheduled_at')::timestamptz AT TIME ZONE 'Asia/Kolkata', 'Dy DD Mon, HH12:MI AM'), '')
              WHEN 'visit_slot_confirmed' THEN 'Slot confirmed' || COALESCE(' for ' || to_char((h.details->>'scheduled_at')::timestamptz AT TIME ZONE 'Asia/Kolkata', 'Dy DD Mon, HH12:MI AM'), '')
              WHEN 'visit_slot_asked'     THEN 'Customer asked to confirm the slot' || COALESCE(' · ' || (h.details->>'channel'), '')
              WHEN 'visit_slot_accepted'  THEN 'Customer confirmed the slot'
              WHEN 'visit_slot_proposed'  THEN 'Customer suggested another time' || COALESCE(' · ' || to_char((h.details->>'scheduled_at')::timestamptz AT TIME ZONE 'Asia/Kolkata', 'Dy DD Mon, HH12:MI AM'), '')
              WHEN 'visit_slot_declined'  THEN 'Customer said the visit is not needed'
              WHEN 'visit_started'        THEN 'Visit started'
              WHEN 'visit_completed'      THEN 'Visit marked done'
              ELSE initcap(replace(h.action, '_', ' ')) END)::text,
           h.note::text, NULL::text, NULL::text, NULL::text, NULL::text, j.amount, COALESCE(j.currency, 'INR')::text,
           CASE WHEN j.event_type_code = 'payment' THEN j.id END, CASE WHEN j.event_type_code = 'service_visit' THEN j.id END, h.id, 'collections'::text, NULL::jsonb,
           c.id, c.contract_number, c.buyer_name, h.performed_by_id,
           CASE WHEN h.action IN ('paused','resumed') THEN 'reminders'
                WHEN h.action LIKE 'visit_slot%' OR h.action IN ('visit_scheduled') THEN 'appointments'
                ELSE 'visits' END::text
      FROM public.n_jtd_history h
      JOIN public.n_jtd j ON j.id = h.jtd_id AND j.tenant_id = p_tenant AND COALESCE(j.is_live, true) = p_is_live
      JOIN ctr c ON c.id = j.contract_id
     WHERE (h.action IN ('paused', 'resumed') OR h.action LIKE 'visit_%')
       AND h.created_at >= v_from_ts AND h.created_at < v_to_ts
  ),
  sdecl AS (
    SELECT d.id, d.billing_event_id AS job_id, jb.contract_id, d.amount, COALESCE(d.currency, 'INR') AS currency, d.upi_reference AS reference, d.status, d.created_at, d.confirmed_at, d.confirmed_by, d.description,
           COALESCE(ct.name, jb.recipient_name) AS who
      FROM public.t_session_payment_declarations d
      JOIN jobs jb ON jb.id = d.billing_event_id
      LEFT JOIN public.t_contacts ct ON ct.id = d.member_contact_id
     WHERE d.tenant_id = p_tenant
  ),
  pdecl AS (
    SELECT d.id, NULL::uuid AS job_id, d.contract_id, d.amount, COALESCE(d.currency, 'INR')::text AS currency, d.reference, d.status, d.created_at, d.confirmed_at, d.confirmed_by, NULL::text AS description,
           d.declarer_name AS who
      FROM public.t_public_payment_declarations d
     WHERE d.tenant_id = p_tenant AND COALESCE(d.is_live, true) = p_is_live
  ),
  decl_all AS (SELECT * FROM sdecl UNION ALL SELECT * FROM pdecl),
  decl AS (
    SELECT (d.id::text || ':declared'), 'collections', 'declaration'::text, d.created_at,
           'customer'::text, COALESCE(d.who, c.buyer_name)::text,
           (COALESCE(d.who, c.buyer_name) || ' declared a payment of Rs ' || to_char(round(d.amount), 'FM99,99,99,999') || COALESCE(' · ref ' || NULLIF(d.reference, ''), ' · no reference'))::text,
           d.description::text, NULL::text, NULL::text, 'upi'::text, d.status::text, d.amount, d.currency::text,
           d.job_id, d.job_id, d.id, 'collections'::text, NULL::jsonb,
           c.id, c.contract_number, c.buyer_name, NULL::uuid, 'payments'::text
      FROM decl_all d JOIN ctr c ON c.id = d.contract_id
     WHERE d.created_at >= v_from_ts AND d.created_at < v_to_ts
    UNION ALL
    SELECT (d.id::text || ':' || d.status), 'collections', ('declaration_' || d.status)::text, d.confirmed_at,
           'user'::text, COALESCE(NULLIF(TRIM(CONCAT_WS(' ', up.first_name, up.last_name)), ''), up.email, 'Someone')::text,
           (CASE d.status WHEN 'confirmed' THEN 'Declared payment confirmed' ELSE 'Declared payment rejected' END || ' · Rs ' || to_char(round(d.amount), 'FM99,99,99,999') || ' from ' || COALESCE(d.who, c.buyer_name))::text,
           NULL::text, NULL::text, NULL::text, 'upi'::text, d.status::text, d.amount, d.currency::text,
           d.job_id, d.job_id, d.id, 'collections'::text, NULL::jsonb,
           c.id, c.contract_number, c.buyer_name, d.confirmed_by, 'payments'::text
      FROM decl_all d JOIN ctr c ON c.id = d.contract_id LEFT JOIN public.t_user_profiles up ON up.user_id = d.confirmed_by
     WHERE d.confirmed_at IS NOT NULL AND d.status IN ('confirmed', 'rejected') AND d.confirmed_at >= v_from_ts AND d.confirmed_at < v_to_ts
  ),
  allr AS (
    SELECT * FROM svc UNION ALL SELECT * FROM bill UNION ALL SELECT * FROM comms UNION ALL SELECT * FROM hist UNION ALL SELECT * FROM decl
  ),
  win AS (
    SELECT * FROM allr r WHERE r.at IS NOT NULL
       AND (v_who IS NULL OR r.who_id = v_who)
       AND (v_q IS NULL OR r.buyer_name ILIKE '%' || v_q || '%' OR r.contract_number ILIKE '%' || v_q || '%' OR r.title ILIKE '%' || v_q || '%')
  ),
  flt AS (SELECT * FROM win r WHERE v_groups IS NULL OR r.grp = ANY (v_groups)),
  page AS (SELECT * FROM flt ORDER BY at DESC, id LIMIT v_limit OFFSET v_offset)
  SELECT jsonb_build_object(
    'rows', COALESCE((SELECT jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
              'id', x.id, 'source', x.source, 'kind', x.kind, 'group', x.grp, 'at', x.at, 'actor_type', x.actor_type, 'actor_name', x.actor_name,
              'title', x.title, 'detail', x.detail, 'from', x.from_v, 'to', x.to_v, 'channel', x.channel, 'status', x.status,
              'amount', x.amount, 'currency', x.currency, 'job_id', x.job_id, 'event_id', x.event_id, 'ref_id', x.ref_id, 'category', x.category,
              'message', x.message, 'contract_id', x.contract_id, 'contract_number', x.contract_number, 'buyer_name', x.buyer_name, 'who_id', x.who_id))
              ORDER BY x.at DESC, x.id) FROM page x), '[]'::jsonb),
    'total', (SELECT count(*) FROM flt),
    'counts', (SELECT jsonb_build_object(
                 'all', count(*),
                 'appointments', count(*) FILTER (WHERE r.grp = 'appointments'),
                 'followups',    count(*) FILTER (WHERE r.grp = 'followups'),
                 'calls',        count(*) FILTER (WHERE r.grp = 'calls'),
                 'reminders',    count(*) FILTER (WHERE r.grp = 'reminders'),
                 'visits',       count(*) FILTER (WHERE r.grp = 'visits'),
                 'payments',     count(*) FILTER (WHERE r.grp = 'payments'),
                 'other',        count(*) FILTER (WHERE r.grp = 'other')) FROM win r)
  ) INTO v_out;

  SELECT COALESCE(jsonb_agg(jsonb_build_object('user_id', ut.user_id, 'name', COALESCE(NULLIF(TRIM(CONCAT_WS(' ', up.first_name, up.last_name)), ''), up.email)) ORDER BY up.first_name), '[]'::jsonb)
    INTO v_team FROM public.t_user_tenants ut LEFT JOIN public.t_user_profiles up ON up.user_id = ut.user_id
   WHERE ut.tenant_id = p_tenant AND COALESCE(ut.status, 'active') IN ('active','accepted');

  RETURN jsonb_build_object(
    'success', true, 'today', v_today, 'is_live', p_is_live,
    'window', jsonb_build_object('from', v_from, 'to', v_to),
    'filters', jsonb_strip_nulls(jsonb_build_object('groups', to_jsonb(v_groups), 'who', v_who, 'q', v_q, 'contract_id', v_contract, 'limit', v_limit, 'offset', v_offset)),
    'rows', v_out->'rows', 'total', v_out->'total', 'counts', v_out->'counts', 'team', v_team,
    'generated_at', now());
END;
$$;

COMMENT ON FUNCTION public.jtd_activity(uuid, boolean, jsonb) IS
  'Commitments Register · Activity: tenant-wide activity timeline (service/appointment/ticket audit + event audit + JTD communications, tasks, visit history, declarations) grouped appointments · followups · calls · reminders · visits · payments · other; filters from/to (IST days, default last 30), groups[], who (actor or assignee), q, contract_id, limit/offset. Counts ignore the group filter. Never returns totals of money. Spec: OPS-JTD-TOOLS-SPEC §5.';
