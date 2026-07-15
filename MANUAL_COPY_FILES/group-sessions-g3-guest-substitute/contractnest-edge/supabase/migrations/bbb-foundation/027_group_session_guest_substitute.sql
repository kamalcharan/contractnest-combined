-- ============================================================================
-- 027_group_session_guest_substitute.sql
-- ----------------------------------------------------------------------------
-- G3 — public (token-gated) check-in for GUESTS and SUBSTITUTES.
--   gs_checkin_guest      : phone not on roster -> save a contact tagged 'guest'
--                           and mark that guest present.
--   gs_checkin_substitute : someone standing in for a member -> save them as an
--                           Alternative Contact Person (child t_contacts row
--                           under the member) and mark the MEMBER present
--                           (seat filled via substitute).
-- Both mirror gs_submit_checkin's occurrence resolution (block path primary,
-- contract path fallback) and dedupe contacts by phone so re-scans don't pile
-- up duplicates. SECURITY DEFINER; only reachable with a valid active token.
-- ============================================================================

-- Guest tag / Substitute tag as the app stores them: [{tag_color,tag_label,tag_value}]
CREATE OR REPLACE FUNCTION public.gs_checkin_guest(
  p_token text,
  p_name text,
  p_phone text,
  p_company text DEFAULT NULL,
  p_email text DEFAULT NULL,
  p_status text DEFAULT 'present',
  p_responses jsonb DEFAULT NULL,
  p_form_template_id uuid DEFAULT NULL,
  p_form_template_version integer DEFAULT NULL
) RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_tok public.t_group_session_tokens;
  v_live boolean;
  v_soid uuid; v_odate date;
  v_occ public.t_contract_events;
  v_cid uuid;
  v_status text := CASE WHEN p_status='apologies' THEN 'apologies' ELSE 'present' END;
  v_tags jsonb := jsonb_build_array(jsonb_build_object('tag_color','#6B7280','tag_label','Guest','tag_value','guest'));
BEGIN
  SELECT * INTO v_tok FROM public.t_group_session_tokens WHERE token=p_token AND is_active;
  IF v_tok.id IS NULL THEN RETURN jsonb_build_object('ok', false, 'reason', 'invalid_token'); END IF;
  IF coalesce(btrim(p_name),'') = '' THEN RETURN jsonb_build_object('ok', false, 'reason', 'name_required'); END IF;
  v_live := coalesce(v_tok.is_live, true);

  -- Reuse an existing guest contact for this phone (dedupe), else create one.
  IF coalesce(btrim(p_phone),'') <> '' THEN
    SELECT c.id INTO v_cid
    FROM public.t_contacts c
    JOIN public.t_contact_channels ch ON ch.contact_id = c.id AND ch.channel_type='mobile' AND ch.value = p_phone
    WHERE c.tenant_id = v_tok.tenant_id AND coalesce(c.is_live, v_live) = v_live
      AND c.tags @> '[{"tag_value":"guest"}]'
    ORDER BY c.created_at DESC LIMIT 1;
  END IF;

  IF v_cid IS NULL THEN
    -- Guests are individuals: the type/name check forbids company_name here,
    -- so any company text is kept in notes.
    INSERT INTO public.t_contacts
      (tenant_id, type, status, name, tags, industries, is_seed, is_live, is_primary_contact, source, notes, created_at, updated_at)
    VALUES
      (v_tok.tenant_id, 'individual', 'active', p_name, v_tags, '[]'::jsonb, false, v_live, false, 'session_checkin',
       CASE WHEN coalesce(btrim(p_company),'') <> '' THEN 'Company: ' || btrim(p_company) ELSE NULL END, now(), now())
    RETURNING id INTO v_cid;

    IF coalesce(btrim(p_phone),'') <> '' THEN
      INSERT INTO public.t_contact_channels (contact_id, channel_type, value, is_primary, created_at, updated_at)
      VALUES (v_cid, 'mobile', p_phone, true, now(), now());
    END IF;
    IF coalesce(btrim(p_email),'') <> '' THEN
      INSERT INTO public.t_contact_channels (contact_id, channel_type, value, is_primary, created_at, updated_at)
      VALUES (v_cid, 'email', p_email, true, now(), now());
    END IF;
  END IF;

  -- Mark attendance for the guest (block path primary, contract path fallback).
  IF v_tok.source_block_id IS NOT NULL THEN
    SELECT id, occurrence_date INTO v_soid, v_odate FROM public.t_group_session_schedule
     WHERE tenant_id=v_tok.tenant_id AND source_block_id=v_tok.source_block_id
       AND is_live=v_live AND occurrence_date=current_date AND status IN ('scheduled','held') LIMIT 1;
    IF v_soid IS NULL THEN RETURN jsonb_build_object('ok', false, 'reason', 'no_session_today'); END IF;

    INSERT INTO public.t_session_attendance
      (tenant_id, source_block_id, schedule_occurrence_id, occurrence_date, member_contact_id, member_name, member_phone, status, form_responses, form_template_id, form_template_version)
    VALUES (v_tok.tenant_id, v_tok.source_block_id, v_soid, v_odate, v_cid, p_name, p_phone, v_status, p_responses, p_form_template_id, p_form_template_version)
    ON CONFLICT (schedule_occurrence_id, member_contact_id) WHERE schedule_occurrence_id IS NOT NULL AND member_contact_id IS NOT NULL
      DO UPDATE SET status=excluded.status, member_name=excluded.member_name, member_phone=excluded.member_phone, checked_in_at=now(),
                    form_responses=excluded.form_responses, form_template_id=excluded.form_template_id, form_template_version=excluded.form_template_version;

    UPDATE public.t_group_session_schedule SET status='held', updated_at=now() WHERE id=v_soid AND status='scheduled';
    RETURN jsonb_build_object('ok', true, 'kind', 'guest', 'contact_id', v_cid);
  END IF;

  SELECT * INTO v_occ FROM public.t_contract_events WHERE contract_id=v_tok.contract_id AND event_type='service' AND scheduled_date::date=current_date ORDER BY scheduled_date LIMIT 1;
  IF v_occ.id IS NULL THEN RETURN jsonb_build_object('ok', false, 'reason', 'no_session_today'); END IF;

  INSERT INTO public.t_session_attendance
    (tenant_id, session_contract_id, occurrence_event_id, occurrence_date, member_contact_id, member_name, member_phone, status, form_responses, form_template_id, form_template_version)
  VALUES (v_tok.tenant_id, v_tok.contract_id, v_occ.id, v_occ.scheduled_date::date, v_cid, p_name, p_phone, v_status, p_responses, p_form_template_id, p_form_template_version)
  ON CONFLICT (occurrence_event_id, member_contact_id)
    DO UPDATE SET status=excluded.status, member_name=excluded.member_name, member_phone=excluded.member_phone, checked_in_at=now(),
                  form_responses=excluded.form_responses, form_template_id=excluded.form_template_id, form_template_version=excluded.form_template_version;

  RETURN jsonb_build_object('ok', true, 'kind', 'guest', 'contact_id', v_cid);
END $function$;


CREATE OR REPLACE FUNCTION public.gs_checkin_substitute(
  p_token text,
  p_member uuid,            -- the member being stood in for
  p_sub_name text,
  p_sub_phone text,
  p_status text DEFAULT 'present',
  p_responses jsonb DEFAULT NULL,
  p_form_template_id uuid DEFAULT NULL,
  p_form_template_version integer DEFAULT NULL
) RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_tok public.t_group_session_tokens;
  v_live boolean;
  v_soid uuid; v_odate date;
  v_occ public.t_contract_events;
  v_member public.t_contacts;
  v_sub uuid;
  v_status text := CASE WHEN p_status='apologies' THEN 'apologies' ELSE 'present' END;
  v_tags jsonb := jsonb_build_array(jsonb_build_object('tag_color','#8B5CF6','tag_label','Substitute','tag_value','substitute'));
  v_resp jsonb;
BEGIN
  SELECT * INTO v_tok FROM public.t_group_session_tokens WHERE token=p_token AND is_active;
  IF v_tok.id IS NULL THEN RETURN jsonb_build_object('ok', false, 'reason', 'invalid_token'); END IF;
  IF coalesce(btrim(p_sub_name),'') = '' THEN RETURN jsonb_build_object('ok', false, 'reason', 'substitute_name_required'); END IF;

  SELECT * INTO v_member FROM public.t_contacts WHERE id = p_member AND tenant_id = v_tok.tenant_id;
  IF v_member.id IS NULL THEN RETURN jsonb_build_object('ok', false, 'reason', 'member_not_found'); END IF;
  v_live := coalesce(v_tok.is_live, true);

  -- Reuse an existing Alternative Contact Person under this member for this
  -- phone (dedupe), else create one as a child contact.
  IF coalesce(btrim(p_sub_phone),'') <> '' THEN
    SELECT c.id INTO v_sub
    FROM public.t_contacts c
    JOIN public.t_contact_channels ch ON ch.contact_id = c.id AND ch.channel_type='mobile' AND ch.value = p_sub_phone
    WHERE c.parent_contact_id = p_member AND c.tenant_id = v_tok.tenant_id
    ORDER BY c.created_at DESC LIMIT 1;
  END IF;

  IF v_sub IS NULL THEN
    -- An Alternative Contact Person is a 'contact_person' row under the member.
    INSERT INTO public.t_contacts
      (tenant_id, parent_contact_id, type, status, name, tags, industries, is_seed, is_live, is_primary_contact, source, notes, created_at, updated_at)
    VALUES
      (v_tok.tenant_id, p_member, 'contact_person', 'active', p_sub_name, v_tags, '[]'::jsonb, false, v_live, false, 'session_checkin',
       'Substitute for ' || coalesce(v_member.name,'member') || ' (added at session check-in)', now(), now())
    RETURNING id INTO v_sub;

    IF coalesce(btrim(p_sub_phone),'') <> '' THEN
      INSERT INTO public.t_contact_channels (contact_id, channel_type, value, is_primary, created_at, updated_at)
      VALUES (v_sub, 'mobile', p_sub_phone, false, now(), now());
    END IF;
  END IF;

  -- Substitute metadata rides along in the stored form responses.
  v_resp := coalesce(p_responses, '{}'::jsonb) || jsonb_build_object(
    'is_substitute', true, 'substitute_contact_id', v_sub, 'substitute_name', p_sub_name, 'substitute_phone', p_sub_phone);

  -- Mark the MEMBER present (seat filled via substitute).
  IF v_tok.source_block_id IS NOT NULL THEN
    SELECT id, occurrence_date INTO v_soid, v_odate FROM public.t_group_session_schedule
     WHERE tenant_id=v_tok.tenant_id AND source_block_id=v_tok.source_block_id
       AND is_live=v_live AND occurrence_date=current_date AND status IN ('scheduled','held') LIMIT 1;
    IF v_soid IS NULL THEN RETURN jsonb_build_object('ok', false, 'reason', 'no_session_today'); END IF;

    INSERT INTO public.t_session_attendance
      (tenant_id, source_block_id, schedule_occurrence_id, occurrence_date, member_contact_id, member_name, member_phone, status, form_responses, form_template_id, form_template_version)
    VALUES (v_tok.tenant_id, v_tok.source_block_id, v_soid, v_odate, p_member,
            coalesce(v_member.name,'Member') || ' (substitute: ' || p_sub_name || ')', p_sub_phone, v_status, v_resp, p_form_template_id, p_form_template_version)
    ON CONFLICT (schedule_occurrence_id, member_contact_id) WHERE schedule_occurrence_id IS NOT NULL AND member_contact_id IS NOT NULL
      DO UPDATE SET status=excluded.status, member_name=excluded.member_name, member_phone=excluded.member_phone, checked_in_at=now(),
                    form_responses=excluded.form_responses, form_template_id=excluded.form_template_id, form_template_version=excluded.form_template_version;

    UPDATE public.t_group_session_schedule SET status='held', updated_at=now() WHERE id=v_soid AND status='scheduled';
    RETURN public.gs_member_history(p_token, p_member);
  END IF;

  SELECT * INTO v_occ FROM public.t_contract_events WHERE contract_id=v_tok.contract_id AND event_type='service' AND scheduled_date::date=current_date ORDER BY scheduled_date LIMIT 1;
  IF v_occ.id IS NULL THEN RETURN jsonb_build_object('ok', false, 'reason', 'no_session_today'); END IF;

  INSERT INTO public.t_session_attendance
    (tenant_id, session_contract_id, occurrence_event_id, occurrence_date, member_contact_id, member_name, member_phone, status, form_responses, form_template_id, form_template_version)
  VALUES (v_tok.tenant_id, v_tok.contract_id, v_occ.id, v_occ.scheduled_date::date, p_member,
          coalesce(v_member.name,'Member') || ' (substitute: ' || p_sub_name || ')', p_sub_phone, v_status, v_resp, p_form_template_id, p_form_template_version)
  ON CONFLICT (occurrence_event_id, member_contact_id)
    DO UPDATE SET status=excluded.status, member_name=excluded.member_name, member_phone=excluded.member_phone, checked_in_at=now(),
                  form_responses=excluded.form_responses, form_template_id=excluded.form_template_id, form_template_version=excluded.form_template_version;

  RETURN public.gs_member_history(p_token, p_member);
END $function$;
