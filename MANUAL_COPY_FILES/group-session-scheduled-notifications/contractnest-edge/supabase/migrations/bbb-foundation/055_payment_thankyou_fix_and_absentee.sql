-- 055_payment_thankyou_fix_and_absentee.sql
--
-- Two things:
--   A. Make group_session_payment_thankyou correct BEFORE it ever fires. It has
--      never sent (0 rows) and cannot be safely rehearsed against a live member,
--      so every value it puts in the message is fixed by inspection here.
--   B. Add group_session_absentee_reminder in its "missing you" form — a member
--      absent from the last two occurrences gets a nudge ahead of the next one.
--      (The other reading, a 15–30 min after-start nudge, is explicitly NOT
--      wanted and is not built.)
--
-- ============================================================================
-- A. gs_confirm_declaration — three defects in the message it would have sent
-- ============================================================================
-- Defect 1 — session name always blank.
--   Reads m_cat_blocks via v_d.cat_block_id, but that column is NULL on all 33
--   declarations ever written. Message renders "...for ." with nothing after it.
--   Fix: resolve through the membership contract's blocks, falling back to the
--   session contract. Verified both paths return 'Saturday Cadence' on all 8
--   most recent declarations.
--
-- Defect 2 — amount can be 0, or understate what the member paid.
--   The message used v_amount, which is the LEDGER-ALLOCATED figure:
--       LEAST(COALESCE(v_d.amount, v_remaining), v_remaining,
--             COALESCE(v_inv.balance, 0))
--   With no open invoice that collapses to 0 → "we've received your payment of
--   0". That state is real and already handled elsewhere in the product (the
--   dashboard toast "Payment confirmed — no open invoice to record it
--   against"). Even with an invoice, a member declaring 4500 against 1500
--   remaining would be thanked for 1500.
--   Fix: the thank-you acknowledges what the MEMBER DECLARED (v_d.amount),
--   falling back to the allocated figure only when no declared amount exists.
--   Ledger behaviour is untouched — v_amount still drives the actual posting.
--
-- Defect 3 — phone built by concatenating country_code.
--   coalesce(country_code,'') || value. Live BBB contacts all store 'IN', so
--   this happens to work today, but it is the fragile pattern 054 replaced.
--   Fix: use gs_member_whatsapp_phone(), which derives from `value` alone and
--   returns NULL rather than guessing. All 59 live BBB contacts resolve.
--
-- Everything outside the thank-you block is byte-identical to the live
-- definition — ledger posting, status transitions and return shape unchanged.

CREATE OR REPLACE FUNCTION public.gs_confirm_declaration(p_tenant uuid, p_declaration uuid, p_confirm boolean, p_user uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_d         public.t_session_payment_declarations;
  v_ev        record;
  v_inv       record;
  v_remaining numeric;
  v_amount    numeric := 0;
  v_res       jsonb;
BEGIN
  SELECT * INTO v_d FROM public.t_session_payment_declarations
   WHERE id = p_declaration AND tenant_id = p_tenant;
  IF v_d.id IS NULL THEN RETURN jsonb_build_object('ok', false, 'reason', 'not_found'); END IF;
  IF v_d.status <> 'pending' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'already_processed');
  END IF;

  IF NOT p_confirm THEN
    UPDATE public.t_session_payment_declarations
       SET status = 'rejected', confirmed_by = p_user, confirmed_at = now()
     WHERE id = p_declaration;
    RETURN jsonb_build_object('ok', true);
  END IF;

  SELECT id, amount, COALESCE(amount_settled, 0) AS settled,
         COALESCE(is_live, true) AS is_live
    INTO v_ev
    FROM public.t_contract_events
   WHERE id = v_d.billing_event_id AND event_type = 'billing';

  SELECT id, contract_id, balance
    INTO v_inv
    FROM public.t_invoices
   WHERE contract_id = v_d.membership_contract_id
     AND invoice_type = 'receivable'
     AND is_active = true
     AND status IN ('unpaid', 'partially_paid')
     AND COALESCE(is_live, true) = COALESCE(v_ev.is_live, true)
   ORDER BY created_at ASC
   LIMIT 1;

  v_remaining := GREATEST(COALESCE(v_ev.amount, 0) - COALESCE(v_ev.settled, 0), 0);
  v_amount := LEAST(COALESCE(v_d.amount, v_remaining), v_remaining, COALESCE(v_inv.balance, 0));

  IF v_inv.id IS NOT NULL AND v_amount > 0 THEN
    v_res := public.record_invoice_payment_with_allocations(jsonb_build_object(
      'invoice_id',      v_inv.id,
      'contract_id',     v_inv.contract_id,
      'tenant_id',       p_tenant,
      'recorded_by',     p_user,
      'is_live',         COALESCE(v_ev.is_live, true),
      'amount',          v_amount,
      'payment_method',  'upi',
      'payment_date',    (now() at time zone 'Asia/Kolkata')::date,
      'reference_number', v_d.upi_reference,
      'notes',           'Group session dues — declaration confirmed by chair',
      'event_allocations', jsonb_build_array(
        jsonb_build_object('event_id', v_d.billing_event_id, 'amount', v_amount))
    ));
    IF COALESCE((v_res->>'success')::boolean, false) IS NOT TRUE THEN
      RETURN jsonb_build_object('ok', false, 'reason', 'ledger_failed',
        'details', COALESCE(v_res->>'error', 'record_invoice_payment failed'));
    END IF;
  END IF;

  UPDATE public.t_session_payment_declarations
     SET status = 'confirmed', confirmed_by = p_user, confirmed_at = now()
   WHERE id = p_declaration;

  UPDATE public.t_contract_events
     SET status = 'paid', updated_at = now()
   WHERE id = v_d.billing_event_id
     AND event_type = 'billing'
     AND COALESCE(amount_settled, 0) >= COALESCE(amount, 0);

  -- Sprint 2: payment thank-you — same transaction as the confirm above.
  DECLARE
    v_member_name  text;
    v_member_phone text;
    v_session_name text;
    v_msg_amount   numeric;
  BEGIN
    SELECT c.name INTO v_member_name FROM public.t_contacts c WHERE c.id = v_d.member_contact_id;

    -- Defect 3 fix
    v_member_phone := public.gs_member_whatsapp_phone(v_d.member_contact_id);

    -- Defect 1 fix: cat_block_id is never populated; resolve via the contract's
    -- blocks instead. Membership contract first, session contract as fallback.
    SELECT coalesce(mcb.display_name, mcb.name) INTO v_session_name
      FROM public.t_contract_blocks cb
      JOIN public.m_cat_blocks mcb ON mcb.id = cb.source_block_id
     WHERE cb.contract_id = v_d.membership_contract_id
       AND mcb.config->'groupSession' IS NOT NULL
     LIMIT 1;

    IF v_session_name IS NULL THEN
      SELECT coalesce(mcb.display_name, mcb.name) INTO v_session_name
        FROM public.t_contract_blocks cb
        JOIN public.m_cat_blocks mcb ON mcb.id = cb.source_block_id
       WHERE cb.contract_id = v_d.session_contract_id
         AND mcb.config->'groupSession' IS NOT NULL
       LIMIT 1;
    END IF;

    -- Defect 2 fix: thank them for what they declared, not what was allocated.
    v_msg_amount := COALESCE(v_d.amount, v_amount);

    -- Belt and braces: never send a thank-you that cannot name the session or
    -- the sum. Better a silent miss (visible as a missing JTD row) than a
    -- message reading "payment of 0 for ." going to a real member.
    IF v_member_phone IS NOT NULL
       AND coalesce(v_session_name, '') <> ''
       AND coalesce(v_msg_amount, 0) > 0 THEN
      INSERT INTO public.n_jtd (
        tenant_id, event_type_code, channel_code, source_type_code, source_id,
        recipient_type, recipient_id, recipient_name, recipient_contact,
        template_key, template_variables, is_live, performed_by_type
      ) VALUES (
        p_tenant, 'notification', 'whatsapp', 'group_session_payment_thankyou', p_declaration,
        'contact', v_d.member_contact_id, v_member_name, v_member_phone,
        'group_session_payment_thankyou',
        jsonb_build_object(
          'member_name',  coalesce(v_member_name, ''),
          -- trim_scale drops a trailing .00 so 1500.00 renders as "1500",
          -- matching how amounts are stored and displayed elsewhere.
          'amount',       trim_scale(v_msg_amount)::text,
          'session_name', v_session_name
        ),
        COALESCE(v_ev.is_live, true), 'system'
      );
    END IF;
  END;

  RETURN jsonb_build_object('ok', true,
    'ledger_recorded', (v_inv.id IS NOT NULL AND v_amount > 0),
    'receipt_amount', v_amount);
END;
$function$;

-- ============================================================================
-- B. ABSENTEE "MISSING YOU" REMINDER
-- ============================================================================
-- Dedupe index must now cover the third source type. A partial index's
-- predicate cannot be altered in place, so drop and recreate. Safe: there are
-- zero rows for any of these three codes.

DROP INDEX IF EXISTS public.ux_n_jtd_group_session_reminder;

CREATE UNIQUE INDEX ux_n_jtd_group_session_reminder
    ON public.n_jtd (
        tenant_id, source_type_code, source_id, recipient_id, is_live,
        (metadata->>'reminder_key')
    )
    WHERE source_type_code IN (
        'group_session_looking_forward',
        'group_session_noshow_regret',
        'group_session_absentee_reminder'
    );

CREATE OR REPLACE FUNCTION public.gs_run_session_notifications()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_now_ist timestamp := (now() at time zone 'Asia/Kolkata');
    v_today   date;
    v_ab      integer := 0;
    v_lf      integer := 0;
    v_ns      integer := 0;
BEGIN
    v_today := v_now_ist::date;

    -- ------------------------------------------------------------------
    -- 1. ABSENTEE "MISSING YOU" — missed the last two occurrences
    -- ------------------------------------------------------------------
    -- Runs FIRST, at the 3-days-out mark, so the looking-forward step below
    -- can defer to it and a member never receives both on the same day. The
    -- absent member still gets the ordinary 1-day-out reminder, so everyone
    -- receives exactly two messages per occurrence — only the first differs.
    --
    -- "Missed the last two" means: the two most recent past occurrences of
    -- this block, with no 'present' attendance row for either. A substitute
    -- counts as attendance (recorded against the member's own contact_id), so
    -- sending a stand-in correctly avoids the nudge.
    --
    -- Guarded so a NEW member is never told they were missed: they must have
    -- been on the roster for BOTH of those past dates. Fewer than two past
    -- occurrences (a block that has only just started) sends nothing.
    WITH blk AS (
        SELECT mcb.id AS block_id, mcb.tenant_id,
               coalesce(mcb.display_name, mcb.name) AS block_name,
               mcb.config->'groupSession'->'timing'->>'startTime' AS start_time
        FROM public.m_cat_blocks mcb
        WHERE mcb.config->'groupSession'->'timing'->>'startTime' IS NOT NULL
          AND coalesce(mcb.is_active, true)
    ),
    occ AS (
        SELECT s.id AS occ_id, s.tenant_id, s.source_block_id, s.is_live,
               s.occurrence_date, b.block_name, b.start_time
        FROM public.t_group_session_schedule s
        JOIN blk b ON b.block_id = s.source_block_id AND b.tenant_id = s.tenant_id
        WHERE coalesce(s.status, '') NOT IN ('cancelled', 'skipped')
          AND (s.occurrence_date - v_today) = 3
    ),
    last_two AS (
        SELECT o.occ_id, lt.id AS past_occ_id, lt.occurrence_date AS past_date
        FROM occ o
        CROSS JOIN LATERAL (
            SELECT s2.id, s2.occurrence_date
            FROM public.t_group_session_schedule s2
            WHERE s2.tenant_id       = o.tenant_id
              AND s2.source_block_id = o.source_block_id
              AND s2.is_live         = o.is_live
              AND coalesce(s2.status, '') NOT IN ('cancelled', 'skipped')
              AND s2.occurrence_date < v_today
            ORDER BY s2.occurrence_date DESC
            LIMIT 2
        ) lt
    )
    INSERT INTO public.n_jtd (
        tenant_id, event_type_code, channel_code, source_type_code, source_id,
        recipient_type, recipient_id, recipient_name, recipient_contact,
        template_key, template_variables, metadata, is_live, performed_by_type
    )
    SELECT o.tenant_id, 'reminder', 'whatsapp', 'group_session_absentee_reminder', o.occ_id,
           'contact', m.contact_id, m.member_name, ph.phone,
           'group_session_absentee_reminder',
           jsonb_build_object(
               'member_name',     coalesce(m.member_name, ''),
               'session_name',    coalesce(o.block_name, ''),
               'occurrence_date', to_char(o.occurrence_date, 'DD Mon YYYY'),
               'start_time',      o.start_time
           ),
           jsonb_build_object('reminder_key', 'absentee'),
           o.is_live, 'system'
    FROM occ o
    CROSS JOIN LATERAL public.gs_roster_members(o.tenant_id, o.source_block_id, o.is_live, o.occurrence_date) m
    CROSS JOIN LATERAL (SELECT public.gs_member_whatsapp_phone(m.contact_id) AS phone) ph
    WHERE ph.phone IS NOT NULL
      -- there ARE two prior occurrences to have missed
      AND (SELECT count(*) FROM last_two lt WHERE lt.occ_id = o.occ_id) = 2
      -- attended neither of them
      AND NOT EXISTS (
          SELECT 1
          FROM last_two lt
          JOIN public.t_session_attendance a ON a.schedule_occurrence_id = lt.past_occ_id
          WHERE lt.occ_id = o.occ_id
            AND a.member_contact_id = m.contact_id
            AND a.status = 'present'
      )
      -- and was actually on the roster for both, so new joiners are spared
      AND (
          SELECT count(*) FROM last_two lt
          WHERE lt.occ_id = o.occ_id
            AND EXISTS (
                SELECT 1 FROM public.gs_roster_members(o.tenant_id, o.source_block_id, o.is_live, lt.past_date) r
                 WHERE r.contact_id = m.contact_id
            )
      ) = 2
      AND EXISTS (
          SELECT 1 FROM public.n_jtd_templates t
           WHERE t.tenant_id        = o.tenant_id
             AND t.source_type_code = 'group_session_absentee_reminder'
             AND t.channel_code     = 'whatsapp'
             AND t.is_active
      )
    ON CONFLICT DO NOTHING;

    GET DIAGNOSTICS v_ab = ROW_COUNT;

    -- ------------------------------------------------------------------
    -- 2. LOOKING FORWARD — 3 days out and 1 day out
    -- ------------------------------------------------------------------
    WITH blk AS (
        SELECT mcb.id AS block_id,
               mcb.tenant_id,
               coalesce(mcb.display_name, mcb.name) AS block_name,
               mcb.config->'groupSession'->'timing'->>'startTime' AS start_time
        FROM public.m_cat_blocks mcb
        WHERE mcb.config->'groupSession'->'timing'->>'startTime' IS NOT NULL
          AND coalesce(mcb.is_active, true)
    ),
    occ AS (
        SELECT s.id AS occ_id, s.tenant_id, s.source_block_id, s.is_live,
               s.occurrence_date, (s.occurrence_date - v_today) AS days_out,
               b.block_name, b.start_time
        FROM public.t_group_session_schedule s
        JOIN blk b ON b.block_id = s.source_block_id AND b.tenant_id = s.tenant_id
        WHERE coalesce(s.status, '') NOT IN ('cancelled', 'skipped')
          AND (s.occurrence_date - v_today) IN (3, 1)
    )
    INSERT INTO public.n_jtd (
        tenant_id, event_type_code, channel_code, source_type_code, source_id,
        recipient_type, recipient_id, recipient_name, recipient_contact,
        template_key, template_variables, metadata, is_live, performed_by_type
    )
    SELECT o.tenant_id, 'reminder', 'whatsapp', 'group_session_looking_forward', o.occ_id,
           'contact', m.contact_id, m.member_name, ph.phone,
           'group_session_looking_forward',
           jsonb_build_object(
               'member_name',     coalesce(m.member_name, ''),
               'session_name',    coalesce(o.block_name, ''),
               'occurrence_date', to_char(o.occurrence_date, 'DD Mon YYYY'),
               'start_time',      o.start_time
           ),
           jsonb_build_object('reminder_key', 'lf_' || o.days_out::text),
           o.is_live, 'system'
    FROM occ o
    CROSS JOIN LATERAL public.gs_roster_members(o.tenant_id, o.source_block_id, o.is_live, o.occurrence_date) m
    CROSS JOIN LATERAL (SELECT public.gs_member_whatsapp_phone(m.contact_id) AS phone) ph
    WHERE ph.phone IS NOT NULL
      -- Defer to the absentee nudge: if this member already got one for this
      -- occurrence, skip the 3-day looking-forward. They still get the 1-day.
      AND NOT (
          o.days_out = 3
          AND EXISTS (
              SELECT 1 FROM public.n_jtd j
               WHERE j.source_type_code = 'group_session_absentee_reminder'
                 AND j.source_id        = o.occ_id
                 AND j.recipient_id     = m.contact_id
                 AND j.is_live          = o.is_live
          )
      )
      AND EXISTS (
          SELECT 1 FROM public.n_jtd_templates t
           WHERE t.tenant_id        = o.tenant_id
             AND t.source_type_code = 'group_session_looking_forward'
             AND t.channel_code     = 'whatsapp'
             AND t.is_active
      )
    ON CONFLICT DO NOTHING;

    GET DIAGNOSTICS v_lf = ROW_COUNT;

    -- ------------------------------------------------------------------
    -- 3. NO-SHOW REGRET — session end + 2 hours
    -- ------------------------------------------------------------------
    WITH blk AS (
        SELECT mcb.id AS block_id,
               mcb.tenant_id,
               coalesce(mcb.display_name, mcb.name) AS block_name,
               (mcb.config->'groupSession'->'timing'->>'startTime')::time AS start_time,
               (mcb.config->'groupSession'->'timing'->>'durationMinutes')::int AS duration_min
        FROM public.m_cat_blocks mcb
        WHERE mcb.config->'groupSession'->'timing'->>'startTime'       IS NOT NULL
          AND mcb.config->'groupSession'->'timing'->>'durationMinutes' IS NOT NULL
          AND coalesce(mcb.is_active, true)
    ),
    occ AS (
        SELECT s.id AS occ_id, s.tenant_id, s.source_block_id, s.is_live,
               s.occurrence_date, b.block_name
        FROM public.t_group_session_schedule s
        JOIN blk b ON b.block_id = s.source_block_id AND b.tenant_id = s.tenant_id
        WHERE coalesce(s.status, '') NOT IN ('cancelled', 'skipped')
          AND s.occurrence_date >= v_today - 1
          AND v_now_ist >= (
                s.occurrence_date
              + b.start_time
              + make_interval(mins => b.duration_min)
              + interval '2 hours'
          )
    )
    INSERT INTO public.n_jtd (
        tenant_id, event_type_code, channel_code, source_type_code, source_id,
        recipient_type, recipient_id, recipient_name, recipient_contact,
        template_key, template_variables, metadata, is_live, performed_by_type
    )
    SELECT o.tenant_id, 'reminder', 'whatsapp', 'group_session_noshow_regret', o.occ_id,
           'contact', m.contact_id, m.member_name, ph.phone,
           'group_session_noshow_regret',
           jsonb_build_object(
               'member_name',     coalesce(m.member_name, ''),
               'session_name',    coalesce(o.block_name, ''),
               'occurrence_date', to_char(o.occurrence_date, 'DD Mon YYYY')
           ),
           jsonb_build_object('reminder_key', 'regret'),
           o.is_live, 'system'
    FROM occ o
    CROSS JOIN LATERAL public.gs_roster_members(o.tenant_id, o.source_block_id, o.is_live, o.occurrence_date) m
    CROSS JOIN LATERAL (SELECT public.gs_member_whatsapp_phone(m.contact_id) AS phone) ph
    WHERE ph.phone IS NOT NULL
      AND NOT EXISTS (
          SELECT 1 FROM public.t_session_attendance a
           WHERE a.schedule_occurrence_id = o.occ_id
             AND a.member_contact_id      = m.contact_id
             AND a.status                 = 'present'
      )
      AND EXISTS (
          SELECT 1 FROM public.n_jtd_templates t
           WHERE t.tenant_id        = o.tenant_id
             AND t.source_type_code = 'group_session_noshow_regret'
             AND t.channel_code     = 'whatsapp'
             AND t.is_active
      )
    ON CONFLICT DO NOTHING;

    GET DIAGNOSTICS v_ns = ROW_COUNT;

    RETURN jsonb_build_object(
        'ok', true,
        'ist_now', to_char(v_now_ist, 'YYYY-MM-DD HH24:MI'),
        'absentee_enqueued', v_ab,
        'looking_forward_enqueued', v_lf,
        'noshow_regret_enqueued', v_ns
    );
END;
$function$;

COMMENT ON FUNCTION public.gs_run_session_notifications() IS
'Cron-driven Group Session WhatsApp reminders: absentee "missing you" (3 days out, missed last two), looking-forward (3 and 1 days out, deferring to absentee on day 3), no-show regret (session end + 2h). Idempotent via ux_n_jtd_group_session_reminder. IST-aware.';

-- ============================================================================
-- ABSENTEE TEMPLATE MAPPING
-- ============================================================================
-- Seeded 4 Aug 2026, once MSG91 approved the template. Template is POSITIONAL
-- ({{1}}..{{4}}) like every other template in this account — see the header of
-- jtd-worker/handlers/whatsapp.ts for why named parameters must never be used
-- here. Variable order: member_name, session_name, occurrence_date, start_time.

INSERT INTO public.n_jtd_templates (
    tenant_id, template_key, name, description, channel_code, source_type_code,
    content, provider_template_id, is_live, is_active
) VALUES (
    'dd194710-92b4-4110-80eb-0b492a0d2c1f',
    'group_session_absentee_reminder',
    'Group Session Absentee Reminder (BBB)',
    'Sent 3 days before an occurrence to members who missed the last two; replaces that day''s looking-forward for them',
    'whatsapp',
    'group_session_absentee_reminder',
    'Hi {{1}}, we have missed you at the last couple of {{2}} sessions. The next one is on {{3}} at {{4}}. Hope to see you there!',
    'group_session_absentee_reminder',
    true,
    true
)
ON CONFLICT (tenant_id, template_key, channel_code, is_live) DO UPDATE SET
    provider_template_id = EXCLUDED.provider_template_id,
    content              = EXCLUDED.content,
    is_active            = EXCLUDED.is_active,
    updated_at           = NOW();
