-- Migration 075: close the duplicate-declaration hole left by 052
-- Applied live 2026-08-15 (Supabase MCP, project uwyqhzotluikawcboldr,
-- name: checkin_declaration_dedup_any_open_status).
-- Source-of-record copy — DO NOT RE-RUN on the live project.
-- Requires 074 (asserted below).
--
-- ── WHAT WAS WRONG ─────────────────────────────────────────────────────────
-- 052's partial unique index was scoped to status='pending':
--
--   UNIQUE (member_contact_id, billing_event_id)
--   WHERE billing_event_id IS NOT NULL
--     AND status = 'pending'                        <-- the hole
--     AND created_at >= '2026-07-27 16:29:57+00'
--
-- The moment the chair confirmed the first declaration, that row LEFT the
-- index. A second declaration for the same instalment then inserted cleanly.
-- The guard only covered the window BEFORE the chair acted — which is the
-- least likely time for a duplicate, since members re-declare precisely
-- because they are unsure the first one registered.
--
-- And ON CONFLICT DO NOTHING discarded blocked rows SILENTLY: the page showed
-- success, so the member believed it recorded.
--
-- Live evidence (all pre-dating the index, so it never actually fired):
--   Dr SRINIVAS MEDEPALLI  3 declarations for one ₹1,500 instalment in 4
--                          minutes on 25 Jul — rejected, CONFIRMED, CONFIRMED
--   BHARAT KUMAR MANGIPUDI 2 for one ₹4,500 instalment; references
--                          '074747724582' and '074747724582 - 4500', which an
--                          exact-string reference check does NOT match
--
-- Money was protected only by gs_confirm_declaration's clamp
--   v_remaining := GREATEST(v_ev.amount - v_ev.settled, 0)
-- so the second confirm posts ₹0 (Medepalli's event reads amount_settled=1500
-- on a ₹1,500 event, not 3,000). But the duplicate still shows as CONFIRMED to
-- the chair, makes declaration-derived totals disagree with the ledger, and
-- since migration 053 would fire a SECOND "payment received" WhatsApp — the
-- message amount is COALESCE(v_d.amount, v_amount), the declared figure, not
-- the ₹0 actually posted.
--
-- ── DESIGN ─────────────────────────────────────────────────────────────────
-- 'rejected' stays OUT of the index deliberately. The chair rejects a
-- declaration precisely so the member can re-submit a corrected reference;
-- blocking that would strand them. So the index covers pending + confirmed.
--
-- ⚠️ ORDER MATTERS. A partial-index arbiter is inferred by matching the
-- ON CONFLICT WHERE clause against the index predicate. Changing the index
-- without changing the clause in the SAME transaction fails with 42P10
-- ("no unique or exclusion constraint matching the ON CONFLICT
-- specification") and breaks check-in outright — the same class of mistake
-- that produced the 074 regression. New index is created first, the function
-- is repointed, and only then is the old index dropped.

-- 1. Guard: the widened index must be buildable.
DO $guard$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.t_session_payment_declarations
     WHERE billing_event_id IS NOT NULL
       AND status IN ('pending','confirmed')
       AND created_at >= '2026-07-27 16:29:57.432347+00'::timestamptz
     GROUP BY member_contact_id, billing_event_id HAVING count(*) > 1
  ) THEN RAISE EXCEPTION '075: pre-existing duplicates would block the widened index'; END IF;
END
$guard$;

-- 2. Widened index alongside the old one.
CREATE UNIQUE INDEX uq_payment_decl_member_billing_open
  ON public.t_session_payment_declarations (member_contact_id, billing_event_id)
  WHERE billing_event_id IS NOT NULL
    AND status IN ('pending','confirmed')
    AND created_at >= '2026-07-27 16:29:57.432347+00'::timestamptz;

-- 3. Point the function at it, and stop the silence.
DO $mig$
DECLARE
  v_def text;
BEGIN
  SELECT pg_get_functiondef(p.oid) INTO v_def
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.proname = 'gs_submit_checkin';
  IF v_def IS NULL THEN RAISE EXCEPTION '075: gs_submit_checkin not found'; END IF;
  IF position('v_pay_error' in v_def) = 0
    THEN RAISE EXCEPTION '075: migration 074 has not been applied'; END IF;

  -- (a) carrier for the RETURNING probe
  IF (length(v_def) - length(replace(v_def, '  v_pay_error text;', ''))) / length('  v_pay_error text;') <> 1
    THEN RAISE EXCEPTION '075 anchor (a) expected exactly 1 v_pay_error declaration'; END IF;
  v_def := replace(v_def, '  v_pay_error text;', '  v_pay_error text;' || chr(10) || '  v_decl_id uuid;');

  -- (b) arbiter predicate -> must match the new index exactly (3 sites)
  IF (length(v_def) - length(replace(v_def, 'WHERE billing_event_id IS NOT NULL AND status = ''pending'' AND created_at', '')))
       / length('WHERE billing_event_id IS NOT NULL AND status = ''pending'' AND created_at') <> 3
    THEN RAISE EXCEPTION '075 anchor (b) expected 3 ON CONFLICT sites'; END IF;
  v_def := replace(v_def,
    'WHERE billing_event_id IS NOT NULL AND status = ''pending'' AND created_at',
    'WHERE billing_event_id IS NOT NULL AND status IN (''pending'',''confirmed'') AND created_at');

  -- (c) session-day branch: a swallowed conflict becomes a reported one
  IF (length(v_def) - length(replace(v_def, 'DO NOTHING; EXCEPTION WHEN others THEN v_pay_error', '')))
       / length('DO NOTHING; EXCEPTION WHEN others THEN v_pay_error') <> 1
    THEN RAISE EXCEPTION '075 anchor (c) wrapped site not found'; END IF;
  v_def := replace(v_def,
    'DO NOTHING; EXCEPTION WHEN others THEN v_pay_error',
    'DO NOTHING RETURNING id INTO v_decl_id; IF v_decl_id IS NULL THEN v_pay_error := ''duplicate_declaration''; END IF; EXCEPTION WHEN others THEN v_pay_error');

  -- (d) same for the no-session branch
  IF (SELECT count(*) FROM regexp_matches(v_def,
        'INSERT INTO public\.t_session_payment_declarations[^;]*?NULL, p_member, v_mc[^;]*?DO NOTHING;', 'g')) <> 1
    THEN RAISE EXCEPTION '075 anchor (d) expected exactly 1 no-session site'; END IF;
  v_def := regexp_replace(v_def,
    '(INSERT INTO public\.t_session_payment_declarations[^;]*?NULL, p_member, v_mc[^;]*?DO NOTHING);',
    '\1 RETURNING id INTO v_decl_id; IF v_decl_id IS NULL THEN v_pay_error := ''duplicate_declaration''; END IF;');

  EXECUTE v_def;
END
$mig$;

-- 4. Retire the narrow index only once nothing references it.
DROP INDEX IF EXISTS public.uq_payment_decl_member_billing_pending;

-- 5. Post-check.
DO $chk$
DECLARE v_src text;
BEGIN
  SELECT p.prosrc INTO v_src FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.proname = 'gs_submit_checkin';
  IF position('status IN (''pending'',''confirmed'')' in v_src) = 0
    THEN RAISE EXCEPTION '075 POST-CHECK FAILED: widened predicate absent from function'; END IF;
  IF position('status = ''pending'' AND created_at' in v_src) > 0
    THEN RAISE EXCEPTION '075 POST-CHECK FAILED: narrow predicate still present'; END IF;
  IF (length(v_src) - length(replace(v_src, 'duplicate_declaration', ''))) / length('duplicate_declaration') <> 2
    THEN RAISE EXCEPTION '075 POST-CHECK FAILED: expected 2 duplicate_declaration sites'; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes
                  WHERE tablename='t_session_payment_declarations'
                    AND indexname='uq_payment_decl_member_billing_open')
    THEN RAISE EXCEPTION '075 POST-CHECK FAILED: widened index missing'; END IF;
  IF EXISTS (SELECT 1 FROM pg_indexes
              WHERE tablename='t_session_payment_declarations'
                AND indexname='uq_payment_decl_member_billing_pending')
    THEN RAISE EXCEPTION '075 POST-CHECK FAILED: narrow index still present'; END IF;
  RAISE NOTICE '075 post-check OK';
END
$chk$;

-- ── VERIFICATION RUN AFTER APPLY (all probes end in RAISE, so all roll back)
--
--   A  genuine first-time declaration        -> inserted=1, payment_error=(none)
--   B  re-declare after chair CONFIRMED it   -> inserted=0,
--                                               payment_error=duplicate_declaration
--   C  re-declare after chair REJECTED it    -> inserted=1, payment_error=(none)
--   attendance intact throughout
--
-- B is the case 052 let through silently. C is the case that must NOT be
-- blocked. Post-state confirmed: 0 probe rows left.
--
-- ── NOT CHANGED HERE ───────────────────────────────────────────────────────
-- * The GUEST index (uq_payment_decl_guest_catblock_pending, on
--   member_contact_id + cat_block_id + occurrence_event_id) is still scoped to
--   status='pending' and carries the identical hole. Left alone deliberately:
--   it is a different index and a different function (gs_checkin_guest), and
--   widening it needs its own ON CONFLICT clause updated in lockstep. Worth
--   doing, but not bundled into a fix shipped days before a collection day.
-- * The legacy contract-token branch gets the widened predicate but no
--   RETURNING probe — no contract-scoped tokens exist on BBB (all three tokens
--   are block-scoped), so that path is unexercised.
-- * Reference-string normalisation (so '074747724582 - 4500' matches
--   '074747724582') is a UI-side comparison in SessionCheckinPage.tsx's
--   duplicateRefDecl, not a DB concern. Still exact-match today.
