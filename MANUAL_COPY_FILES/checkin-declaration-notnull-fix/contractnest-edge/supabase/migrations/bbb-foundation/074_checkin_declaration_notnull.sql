-- Migration 074: gs_submit_checkin — member payment on a meeting day
-- Applied live 2026-08-15 (Supabase MCP, project uwyqhzotluikawcboldr,
-- name: checkin_declaration_not_null_and_attendance_isolation).
-- Source-of-record copy — DO NOT RE-RUN on the live project.
--
-- ── WHAT WAS BROKEN ────────────────────────────────────────────────────────
-- Regression introduced by migration 052 (the duplicate-declaration dedup).
-- Adding ON CONFLICT rewrote the whole function body, and in the block-token,
-- session-day declaration INSERT the expression written into
-- session_contract_id changed from v_mc to v_tok.contract_id:
--
--   022, 039:  VALUES (v_tok.tenant_id, v_mc,               v_soid, ...)  ✅
--   052, 053:  VALUES (v_tok.tenant_id, v_tok.contract_id,  v_soid, ...)  ❌
--
-- v_tok.contract_id is NULL for every block-scoped token (the block lives in
-- source_block_id; all three BBB tokens have contract_id = null), and
-- t_session_payment_declarations.session_contract_id is NOT NULL. So the
-- insert raised:
--
--   23502 null value in column "session_contract_id" ... violates not-null
--
-- and because a PL/pgSQL function is a single transaction, that exception also
-- discarded the member's ATTENDANCE row and the status='held' flip that had
-- already been written earlier in the same call.
--
-- ── WHY IT WAS INVISIBLE FOR THREE WEEKS ───────────────────────────────────
-- Three conditions must hold simultaneously to reach the broken statement:
-- a MEMBER (not a guest), on an actual MEETING DAY, who TYPES a UPI reference.
-- Miss any one and control lands on a sibling statement that still works:
--   * no meeting that day  -> v_mc                  ✅
--   * guest                -> gs_checkin_guest,     ✅ (a different function)
--                             writes source_block_id
--   * legacy contract token-> v_tok.contract_id     ✅ (non-null there)
-- The 8 Aug 2026 debug session exercised a member payment on a NON-meeting day
-- (7 Aug) and a guest fee (8 Aug) — both green, neither touching this line.
-- And the failure is self-concealing: the member sees a generic "Check-in
-- failed", retries WITHOUT a reference, and succeeds — so attendance fills in
-- normally and the only trace is money that never arrives.
--
-- Live evidence: 25 Jul (pre-052) 35 attendance / 30 declarations.
--                 8 Aug (post-052) 13 attendance /  0 member declarations.
--                 Zero declarations carrying a billing_event_id since 27 Jul.
--
-- ── METHOD ─────────────────────────────────────────────────────────────────
-- Edits are substituted into the LIVE pg_get_functiondef() rather than
-- retyped, and every anchor is asserted BEFORE substitution, with a post-check
-- afterwards. Migration 058 silently no-opped on two of four functions because
-- whitespace differed; a silent no-op is this technique's failure mode.

DO $mig$
DECLARE
  v_def text;
BEGIN
  SELECT pg_get_functiondef(p.oid) INTO v_def
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.proname = 'gs_submit_checkin';
  IF v_def IS NULL THEN RAISE EXCEPTION '074: gs_submit_checkin not found'; END IF;

  -- (a) THE BUG. Three fallbacks, not two: v_mc is itself NULL when the member
  --     has no ACTIVE contract on the block (lapsed, mid-renewal, or arrived
  --     via device recognition, which does not enforce the membership check
  --     that phone lookup does). source_block_id is guaranteed non-null inside
  --     this branch, so this column can never fail again.
  IF position('VALUES (v_tok.tenant_id, v_tok.contract_id, v_soid, p_member, v_mc,' in v_def) = 0
    THEN RAISE EXCEPTION '074 anchor (a) session-day insert not found'; END IF;
  v_def := replace(v_def,
    'VALUES (v_tok.tenant_id, v_tok.contract_id, v_soid, p_member, v_mc,',
    'VALUES (v_tok.tenant_id, coalesce(v_tok.contract_id, v_mc, v_tok.source_block_id), v_soid, p_member, v_mc,');

  -- (b) The no-session branch carries the same latent crash when v_mc is NULL.
  IF position('VALUES (v_tok.tenant_id, v_mc, NULL, p_member, v_mc,' in v_def) = 0
    THEN RAISE EXCEPTION '074 anchor (b) no-session insert not found'; END IF;
  v_def := replace(v_def,
    'VALUES (v_tok.tenant_id, v_mc, NULL, p_member, v_mc,',
    'VALUES (v_tok.tenant_id, coalesce(v_mc, v_tok.source_block_id), NULL, p_member, v_mc,');

  -- (c) carrier for a failed declaration
  IF position('v_status text := CASE WHEN p_status=''apologies'' THEN ''apologies'' ELSE ''present'' END;' in v_def) = 0
    THEN RAISE EXCEPTION '074 anchor (c) DECLARE not found'; END IF;
  v_def := replace(v_def,
    'v_status text := CASE WHEN p_status=''apologies'' THEN ''apologies'' ELSE ''present'' END;',
    'v_status text := CASE WHEN p_status=''apologies'' THEN ''apologies'' ELSE ''present'' END;' || chr(10) || '  v_pay_error text;');

  -- (d) Attendance must never again die with the payment. Deliberately NOT a
  --     silent swallow (`WHEN others THEN NULL`) — the error is captured and
  --     returned to the caller, because silence is exactly how this hid.
  IF (SELECT count(*) FROM regexp_matches(v_def,
        'INSERT INTO public\.t_session_payment_declarations[^;]*?v_soid, p_member, v_mc[^;]*?DO NOTHING;', 'g')) <> 1
    THEN RAISE EXCEPTION '074 anchor (d) expected exactly 1 wrap target'; END IF;
  v_def := regexp_replace(v_def,
    '(INSERT INTO public\.t_session_payment_declarations[^;]*?v_soid, p_member, v_mc[^;]*?DO NOTHING;)',
    'BEGIN \1 EXCEPTION WHEN others THEN v_pay_error := SQLSTATE || '': '' || SQLERRM; END;');

  -- (e) surface it (NULL on every healthy path, on all three return sites)
  IF (length(v_def) - length(replace(v_def, 'RETURN public.gs_member_history(p_token, p_member);', '')))
       / length('RETURN public.gs_member_history(p_token, p_member);') <> 3
    THEN RAISE EXCEPTION '074 anchor (e) expected 3 return sites'; END IF;
  v_def := replace(v_def,
    'RETURN public.gs_member_history(p_token, p_member);',
    'RETURN public.gs_member_history(p_token, p_member) || jsonb_build_object(''payment_error'', v_pay_error);');

  EXECUTE v_def;
END
$mig$;

-- Post-check: assert the rewrite actually landed on the live function.
DO $chk$
DECLARE v_src text;
BEGIN
  SELECT p.prosrc INTO v_src FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.proname = 'gs_submit_checkin';
  IF position('coalesce(v_tok.contract_id, v_mc, v_tok.source_block_id), v_soid' in v_src) = 0
    THEN RAISE EXCEPTION '074 POST-CHECK FAILED: session-day fix absent'; END IF;
  IF position('VALUES (v_tok.tenant_id, v_tok.contract_id, v_soid' in v_src) > 0
    THEN RAISE EXCEPTION '074 POST-CHECK FAILED: old broken expression still present'; END IF;
  IF position('v_pay_error' in v_src) = 0
    THEN RAISE EXCEPTION '074 POST-CHECK FAILED: v_pay_error absent'; END IF;
  RAISE NOTICE '074 post-check OK';
END
$chk$;

-- ── VERIFICATION RUN AFTER APPLY (both probes end in RAISE, so both roll back)
--
-- 1. The check that was missing on 27 Jul AND on 8 Aug — all three conditions
--    forced together (member + meeting day + UPI reference):
--
--      declarations_inserted = 1
--      session_contract_id   = 2a36a3d1… (the membership contract, i.e. v_mc)
--      occurrence            = fc82a076… (today's occurrence)
--      attendance_rows       = 1
--      payment_error         = (none)
--      ok                    = true
--
-- 2. Isolation — declaration forced to fail (amount 'not-a-number'):
--
--      declarations_inserted = 0
--      attendance_recovered  = 1        <-- would have been 0 before this fix
--      occurrence_status     = held     <-- would have been rolled back
--      ok                    = true
--      payment_error         = 22P02: invalid input syntax for type numeric
--
-- Post-state confirmed: 0 probe rows, attendance intact, total declarations
-- unchanged at 36.
--
-- ── NOT CHANGED HERE ───────────────────────────────────────────────────────
-- * session_contract_id is NOT NULL but now legitimately holds a contract id
--   OR a block id (the guest path in gs_checkin_guest already did this — see
--   the 8 Aug guest row, session_contract_id = c6e86303 = the block). A
--   modelling wart worth cleaning up, deliberately not three days before a
--   collection day.
-- * The ON CONFLICT dedup from 052 is still scoped to status='pending', so a
--   second declaration slips through once the first is confirmed/rejected and
--   is discarded SILENTLY. Still open (see CLAUDE.md, 2026-08-06).
