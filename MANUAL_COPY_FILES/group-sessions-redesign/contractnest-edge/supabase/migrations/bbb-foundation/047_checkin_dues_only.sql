-- ============================================================================
-- Migration: bbb-foundation/047 — Check-in page: dues-only path on
--            non-session days
-- ============================================================================
-- Owner request (2026-07-22): the master QR should be useful every day, not
-- just session days. Previously gs_submit_checkin hard-returned
-- 'no_session_today' when no occurrence exists for today, so a member who
-- scanned on an off day could VIEW their dues but not settle them.
--
-- Change (block-token branch): when there is no occurrence today but the
-- submission is a recognised member with a payment declaration, record the
-- declaration only — occurrence_event_id stays NULL (the schema's ad-hoc
-- case), no attendance row is written, no schedule status is touched, the
-- device is remembered, and the member's history is returned as usual.
-- A no-session submission with NO payment still returns 'no_session_today'.
-- The legacy per-contract token branch is unchanged.
--
-- Depends on: bbb-foundation/017/019/039/046
-- Safe to re-run: Yes (CREATE OR REPLACE)
-- Applied live: 2026-07-22 — project uwyqhzotluikawcboldr
-- ============================================================================

CREATE OR REPLACE FUNCTION public.gs_submit_checkin(
  p_token text, p_member uuid, p_member_name text, p_member_phone text,
  p_status text, p_payment jsonb DEFAULT NULL::jsonb,
  p_responses jsonb DEFAULT NULL::jsonb,
  p_form_template_id uuid DEFAULT NULL::uuid,
  p_form_template_version integer DEFAULT NULL::integer,
  p_device_token text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_tok public.t_group_session_tokens; v_occ public.t_contract_events;
  v_soid uuid; v_odate date; v_mc uuid; v_live boolean;
  v_status text := CASE WHEN p_status='apologies' THEN 'apologies' ELSE 'present' END;
BEGIN
  SELECT * INTO v_tok FROM public.t_group_session_tokens WHERE token=p_token AND is_active;
  IF v_tok.id IS NULL THEN RETURN jsonb_build_object('ok', false, 'reason', 'invalid_token'); END IF;
  IF v_tok.source_block_id IS NOT NULL THEN
    v_live := coalesce(v_tok.is_live, true);
    SELECT id, occurrence_date INTO v_soid, v_odate FROM public.t_group_session_schedule
     WHERE tenant_id=v_tok.tenant_id AND source_block_id=v_tok.source_block_id
       AND is_live=v_live AND occurrence_date=current_date AND status IN ('scheduled','held') LIMIT 1;
    IF v_soid IS NULL THEN
      -- Dues-only path: no session today, but a recognised member may still
      -- declare a payment. No attendance, no schedule change — declaration
      -- only, with occurrence_event_id NULL (ad-hoc).
      IF p_member IS NOT NULL AND p_payment IS NOT NULL AND (p_payment->>'billing_event_id') IS NOT NULL THEN
        v_mc := public.gs_block_membership_contract(v_tok.tenant_id, v_tok.source_block_id, p_member, v_live);
        IF v_mc IS NULL THEN
          RETURN jsonb_build_object('ok', false, 'reason', 'no_membership');
        END IF;
        INSERT INTO public.t_session_payment_declarations
          (tenant_id, session_contract_id, occurrence_event_id, member_contact_id, membership_contract_id, billing_event_id, upi_reference, amount, currency)
        VALUES (v_tok.tenant_id, v_mc, NULL, p_member, v_mc, (p_payment->>'billing_event_id')::uuid, p_payment->>'upi_reference', nullif(p_payment->>'amount','')::numeric, coalesce(p_payment->>'currency','INR'));
        PERFORM public.gs_checkin_remember_device(v_tok.tenant_id, v_tok.source_block_id, v_live, p_device_token, 'member', p_member, NULL);
        RETURN public.gs_member_history(p_token, p_member);
      END IF;
      RETURN jsonb_build_object('ok', false, 'reason', 'no_session_today');
    END IF;
    IF p_member IS NOT NULL THEN
      INSERT INTO public.t_session_attendance
        (tenant_id, source_block_id, schedule_occurrence_id, occurrence_date, member_contact_id, member_name, member_phone, status, form_responses, form_template_id, form_template_version)
      VALUES (v_tok.tenant_id, v_tok.source_block_id, v_soid, v_odate, p_member, p_member_name, p_member_phone, v_status, p_responses, p_form_template_id, p_form_template_version)
      ON CONFLICT (schedule_occurrence_id, member_contact_id) WHERE schedule_occurrence_id IS NOT NULL AND member_contact_id IS NOT NULL
        DO UPDATE SET status=excluded.status, member_name=excluded.member_name, member_phone=excluded.member_phone, checked_in_at=now(),
                      form_responses=excluded.form_responses, form_template_id=excluded.form_template_id, form_template_version=excluded.form_template_version;
    ELSE
      INSERT INTO public.t_session_attendance
        (tenant_id, source_block_id, schedule_occurrence_id, occurrence_date, member_name, member_phone, status, form_responses, form_template_id, form_template_version)
      VALUES (v_tok.tenant_id, v_tok.source_block_id, v_soid, v_odate, p_member_name, p_member_phone, v_status, p_responses, p_form_template_id, p_form_template_version);
    END IF;
    UPDATE public.t_group_session_schedule SET status='held', updated_at=now() WHERE id=v_soid AND status='scheduled';
    IF p_member IS NOT NULL AND p_payment IS NOT NULL AND (p_payment->>'billing_event_id') IS NOT NULL THEN
      v_mc := public.gs_block_membership_contract(v_tok.tenant_id, v_tok.source_block_id, p_member, v_live);
      -- Guard (pre-existing crash): a NULL membership contract used to abort
      -- the whole submission, rolling back the attendance row with it. Now
      -- the check-in stands and only the declaration is skipped.
      IF v_mc IS NOT NULL THEN
        INSERT INTO public.t_session_payment_declarations (tenant_id, session_contract_id, occurrence_event_id, member_contact_id, membership_contract_id, billing_event_id, upi_reference, amount, currency)
        VALUES (v_tok.tenant_id, v_mc, v_soid, p_member, v_mc, (p_payment->>'billing_event_id')::uuid, p_payment->>'upi_reference', nullif(p_payment->>'amount','')::numeric, coalesce(p_payment->>'currency','INR'));
      END IF;
    END IF;
    IF p_member IS NOT NULL THEN
      PERFORM public.gs_checkin_remember_device(v_tok.tenant_id, v_tok.source_block_id, v_live, p_device_token, 'member', p_member, NULL);
    END IF;
    RETURN public.gs_member_history(p_token, p_member);
  END IF;
  SELECT * INTO v_occ FROM public.t_contract_events WHERE contract_id=v_tok.contract_id AND event_type='service' AND scheduled_date::date=current_date ORDER BY scheduled_date LIMIT 1;
  IF v_occ.id IS NULL THEN RETURN jsonb_build_object('ok', false, 'reason', 'no_session_today'); END IF;
  IF p_member IS NOT NULL THEN
    INSERT INTO public.t_session_attendance (tenant_id, session_contract_id, occurrence_event_id, occurrence_date, member_contact_id, member_name, member_phone, status, form_responses, form_template_id, form_template_version)
    VALUES (v_tok.tenant_id, v_tok.contract_id, v_occ.id, v_occ.scheduled_date::date, p_member, p_member_name, p_member_phone, v_status, p_responses, p_form_template_id, p_form_template_version)
    ON CONFLICT (occurrence_event_id, member_contact_id)
      DO UPDATE SET status=excluded.status, member_name=excluded.member_name, member_phone=excluded.member_phone, checked_in_at=now(),
                    form_responses=excluded.form_responses, form_template_id=excluded.form_template_id, form_template_version=excluded.form_template_version;
  ELSE
    INSERT INTO public.t_session_attendance (tenant_id, session_contract_id, occurrence_event_id, occurrence_date, member_name, member_phone, status, form_responses, form_template_id, form_template_version)
    VALUES (v_tok.tenant_id, v_tok.contract_id, v_occ.id, v_occ.scheduled_date::date, p_member_name, p_member_phone, v_status, p_responses, p_form_template_id, p_form_template_version);
  END IF;
  IF p_member IS NOT NULL AND p_payment IS NOT NULL AND (p_payment->>'billing_event_id') IS NOT NULL THEN
    v_mc := public.gs_membership_contract(v_tok.tenant_id, p_member);
    INSERT INTO public.t_session_payment_declarations (tenant_id, session_contract_id, occurrence_event_id, member_contact_id, membership_contract_id, billing_event_id, upi_reference, amount, currency)
    VALUES (v_tok.tenant_id, v_tok.contract_id, v_occ.id, p_member, v_mc, (p_payment->>'billing_event_id')::uuid, p_payment->>'upi_reference', nullif(p_payment->>'amount','')::numeric, coalesce(p_payment->>'currency','INR'));
  END IF;
  IF p_member IS NOT NULL THEN
    PERFORM public.gs_checkin_remember_device(v_tok.tenant_id, NULL, coalesce(v_tok.is_live, true), p_device_token, 'member', p_member, NULL);
  END IF;
  RETURN public.gs_member_history(p_token, p_member);
END $function$;
