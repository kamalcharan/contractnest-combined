-- 056_group_session_dispatch_hour.sql
--
-- APPLIED TO PRODUCTION 5 Aug 2026. Source-of-record copy — do not re-run.
--
-- Give the tenant control over WHEN reminders go out.
--
-- The scheduler runs every 15 minutes and enqueues as soon as its date
-- condition matches. Because "today" is Asia/Kolkata, the 3-days-out window
-- opens the instant the IST date rolls over — so on 5 Aug 2026 the first batch
-- of 46 reminders was dispatched at 00:00 IST, waking members in the middle of
-- the night. Correct by the date arithmetic, wrong for humans.
--
-- Fix: a per-block dispatch hour, read from
--   config.groupSession.notifications.dispatchHour   (0-23, IST, default 10)
-- Reminders are only enqueued when the IST hour is at or after that value, and
-- before 21:00. The upper bound matters: without it, a scheduler outage lasting
-- most of the day would "catch up" at 23:00 and cause exactly the problem this
-- migration exists to prevent. Missing a day's reminder is better than sending
-- it at bedtime.
--
-- Only the two FORWARD-LOOKING reminders are gated. group_session_noshow_regret
-- is deliberately left alone: it is already anchored to a sensible human moment
-- (session end + 2h), so an hour gate would only delay it for no reason.
--
-- Idempotency is unaffected — ux_n_jtd_group_session_reminder still guarantees
-- one message per member per occurrence per reminder_key, whichever run inside
-- the window happens to do the work.
--
-- The function body is identical to 055 except for:
--   * v_hour  := EXTRACT(hour FROM v_now_ist)
--   * dispatch_hour pulled into both forward-looking blk CTEs
--   * "AND v_hour >= b.dispatch_hour AND v_hour < 21" on both occ CTEs
--   * ist_hour added to the returned jsonb for observability
-- See the applied migration in Supabase for the full text.

-- Set BBB's dispatch hour explicitly so it is visible rather than defaulted.
UPDATE public.m_cat_blocks
   SET config = jsonb_set(config, '{groupSession,notifications}',
                          jsonb_build_object('dispatchHour', 10), true),
       updated_at = now()
 WHERE id = 'c6e86303-4a3c-41fa-8779-e330d5b0574d';
