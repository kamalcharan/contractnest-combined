-- Two small deferred pieces:
-- 1. gs_occurrence_attendance now flags a member as over their own
--    no-show/substitute cap while the chair is marking attendance that
--    day, not just after the fact on the roster page.
-- 2. gs_dash_sessions now reports whether a block has an attendance
--    policy configured, for a small indicator on the Overview cards.

CREATE OR REPLACE FUNCTION public.gs_occurrence_attendance(p_tenant uuid, p_occurrence uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_occ record; v_roster jsonb; v_present int;
BEGIN
  SELECT id, source_block_id, is_live, occurrence_date, seq, status
    INTO v_occ FROM t_group_session_schedule WHERE id=p_occurrence AND tenant_id=p_tenant;
  IF v_occ.id IS NULL THEN RETURN jsonb_build_object('ok', false, 'reason', 'not_found'); END IF;
  SELECT count(*) INTO v_present FROM t_session_attendance a
   WHERE a.schedule_occurrence_id=p_occurrence AND a.status='present';
  SELECT coalesce(jsonb_agg(r ORDER BY r->>'name'), '[]'::jsonb) INTO v_roster FROM (
    SELECT jsonb_build_object(
      'contact_id', m.buyer_id,
      'name', coalesce(a.member_name, m.buyer_name),
      'membership_contract_id', m.contract_id,
      'present', coalesce(a.status='present', false),
      'dues_pending', exists(SELECT 1 FROM t_contract_events be WHERE be.contract_id=m.contract_id AND be.event_type='billing' AND coalesce(be.status,'')<>'paid'),
      'missed', m.overall - m.attended,
      'max_no_shows', m.max_no_shows,
      'max_substitutes', m.max_substitutes,
      'over_no_show_cap', (m.max_no_shows IS NOT NULL AND (m.overall - m.attended) >= m.max_no_shows),
      'over_substitute_cap', (m.max_substitutes IS NOT NULL AND m.substituted >= m.max_substitutes)
    ) AS r
    FROM (
      SELECT DISTINCT ON (c.buyer_id)
        c.buyer_id, c.buyer_name, c.id AS contract_id,
        (cb.custom_fields->'config'->'groupSession'->'attendancePolicy'->>'maxNoShows')::int AS max_no_shows,
        (cb.custom_fields->'config'->'groupSession'->'attendancePolicy'->>'maxSubstitutes')::int AS max_substitutes,
        (SELECT count(*) FROM t_group_session_schedule s2
           WHERE s2.tenant_id=p_tenant AND s2.source_block_id=v_occ.source_block_id AND s2.is_live=v_occ.is_live
             AND s2.status NOT IN ('cancelled','skipped')
             AND (c.start_date IS NULL OR s2.occurrence_date >= c.start_date::date)
             AND s2.occurrence_date <= LEAST(current_date, coalesce(c.end_date::date, current_date))
        ) AS overall,
        (SELECT count(*) FROM t_session_attendance a2
           WHERE a2.source_block_id=v_occ.source_block_id AND a2.member_contact_id=c.buyer_id AND a2.status='present'
             AND (c.start_date IS NULL OR a2.occurrence_date >= c.start_date::date)
             AND a2.occurrence_date <= LEAST(current_date, coalesce(c.end_date::date, current_date))
        ) AS attended,
        (SELECT count(*) FROM t_session_attendance a2
           WHERE a2.source_block_id=v_occ.source_block_id AND a2.member_contact_id=c.buyer_id AND a2.status='present'
             AND a2.form_responses->>'is_substitute'='true'
             AND (c.start_date IS NULL OR a2.occurrence_date >= c.start_date::date)
             AND a2.occurrence_date <= LEAST(current_date, coalesce(c.end_date::date, current_date))
        ) AS substituted
      FROM t_contract_blocks cb JOIN t_contracts c ON c.id=cb.contract_id
      WHERE cb.source_block_id=v_occ.source_block_id AND c.tenant_id=p_tenant AND coalesce(c.is_live,true)=v_occ.is_live AND c.status='active'
      ORDER BY c.buyer_id, c.start_date DESC NULLS LAST
    ) m
    LEFT JOIN t_session_attendance a ON a.schedule_occurrence_id=p_occurrence AND a.member_contact_id=m.buyer_id
  ) s;
  RETURN jsonb_build_object('ok', true,
    'occurrence', jsonb_build_object('event_id', v_occ.id, 'date', v_occ.occurrence_date, 'seq', v_occ.seq, 'status', v_occ.status, 'block_id', v_occ.source_block_id),
    'present_count', v_present, 'roster', v_roster);
END $function$;

CREATE OR REPLACE FUNCTION public.gs_dash_sessions(p_tenant uuid, p_is_live boolean DEFAULT true)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v jsonb; v_total_roster int;
BEGIN
  SELECT count(DISTINCT c.buyer_id) INTO v_total_roster
  FROM t_contract_blocks cb JOIN t_contracts c ON c.id = cb.contract_id JOIN m_cat_blocks b ON b.id = cb.source_block_id
  WHERE c.tenant_id = p_tenant AND coalesce(c.is_live,true) = p_is_live AND c.status = 'active' AND b.config->>'audience' = 'group';
  SELECT coalesce(jsonb_agg(r ORDER BY r->>'name'), '[]'::jsonb) INTO v FROM (
    SELECT jsonb_build_object('block_id', blk.id, 'name', coalesce(blk.name, 'Group Session'), 'roster_size', blk.roster,
      'occurrences_total', blk.occ_total, 'occurrences_done', blk.occ_done, 'next_occurrence', blk.occ_next,
      'qr_ready', exists(SELECT 1 FROM t_group_session_tokens tk WHERE tk.tenant_id=p_tenant AND tk.source_block_id=blk.id AND tk.is_live=p_is_live AND tk.is_active),
      'attendance_pct', CASE WHEN blk.occ_done=0 OR blk.roster=0 THEN NULL ELSE round(100.0 * blk.present / (blk.occ_done * blk.roster)) END,
      'policy_configured', (blk.config->'groupSession'->'attendancePolicy'->>'maxNoShows' IS NOT NULL OR blk.config->'groupSession'->'attendancePolicy'->>'maxSubstitutes' IS NOT NULL)
    ) AS r
    FROM (
      SELECT b.id, b.name, b.config,
        (SELECT count(DISTINCT c2.buyer_id) FROM t_contract_blocks cb2 JOIN t_contracts c2 ON c2.id=cb2.contract_id
          WHERE cb2.source_block_id=b.id AND c2.tenant_id=p_tenant AND coalesce(c2.is_live,true)=p_is_live AND c2.status='active') AS roster,
        (SELECT count(*) FROM t_group_session_schedule s WHERE s.tenant_id=p_tenant AND s.source_block_id=b.id AND s.is_live=p_is_live AND s.status<>'cancelled') AS occ_total,
        (SELECT count(*) FROM t_group_session_schedule s WHERE s.tenant_id=p_tenant AND s.source_block_id=b.id AND s.is_live=p_is_live AND s.status<>'cancelled' AND s.occurrence_date < current_date) AS occ_done,
        (SELECT min(s.occurrence_date) FROM t_group_session_schedule s WHERE s.tenant_id=p_tenant AND s.source_block_id=b.id AND s.is_live=p_is_live AND s.status='scheduled' AND s.occurrence_date >= current_date) AS occ_next,
        (SELECT count(*) FROM t_session_attendance a JOIN t_group_session_schedule s ON s.id=a.schedule_occurrence_id
          WHERE a.source_block_id=b.id AND a.status='present' AND s.is_live=p_is_live AND s.occurrence_date < current_date) AS present
      FROM (SELECT DISTINCT b.id, b.name, b.config FROM t_contract_blocks cb JOIN t_contracts c ON c.id = cb.contract_id JOIN m_cat_blocks b ON b.id = cb.source_block_id
        WHERE c.tenant_id=p_tenant AND coalesce(c.is_live,true)=p_is_live AND c.status='active' AND b.config->>'audience'='group') b
    ) blk
  ) s;
  RETURN jsonb_build_object('sessions', v, 'roster_size', v_total_roster);
END $function$;
