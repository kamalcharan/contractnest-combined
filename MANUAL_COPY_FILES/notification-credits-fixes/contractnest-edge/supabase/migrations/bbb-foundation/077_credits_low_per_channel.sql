-- Migration 077: credits_low fires per channel, not on the cross-channel sum
-- Applied live 2026-08-19 (Supabase MCP, project uwyqhzotluikawcboldr,
-- name: credits_low_per_channel). Source-of-record copy — DO NOT RE-RUN.
--
-- ── WHAT WAS WRONG ─────────────────────────────────────────────────────────
-- Settings -> Plans (tenants/Subscription/index.tsx) ALREADY has the whole
-- low-balance UI: a "Running low" pill, per-channel balance tiles, and a
-- "N notifications waiting for credits" banner. The pill reads
-- t_tenant_context.flag_credits_low, computed by fn_recalc_credit_flags as
--
--     (whatsapp + sms + email + inapp + pooled) < 10
--
-- i.e. summed ACROSS channels. On 18 Aug 2026 BBB sat at WhatsApp 3 +
-- email 20 = 23 -> "not low", while the only channel they actually use was
-- about to hit zero on session-day morning. The healthy email pool masked the
-- WhatsApp shortage, so the existing warning never showed. No UI change was
-- needed — the flag was the defect.
--
-- ── FIX ────────────────────────────────────────────────────────────────────
-- credits_low is now true when ANY sendable channel is under the threshold:
--   active subscription AND (channel + pooled) > 0 AND (channel + pooled) < 10
-- Channels at zero are excluded deliberately:
--   * an unused channel (SMS on every current tenant) would otherwise read
--     "low" forever;
--   * an exhausted channel already surfaces through flag_can_send_* = false
--     and the "waiting for credits" banner — and on the way to zero it passes
--     through 9..1, where this pill now fires.
-- Stored flags recomputed for all tenants via a no-op UPDATE that fires the
-- BEFORE trigger (trg_context_credit_flags).
--
-- ── VERIFIED (in the migration's post-check, RAISEs on failure) ───────────
--   fn_recalc_credit_flags(3, 0, 20, 0,'active',0)  -> credits_low = TRUE
--     (the exact 18 Aug morning state — would now have warned)
--   fn_recalc_credit_flags(200,0, 20, 0,'active',0) -> FALSE
--   fn_recalc_credit_flags(200,0,  0, 0,'active',0) -> FALSE (unused channels)
-- BBB after apply: whatsapp 200 / email 20, flag_credits_low = false. ✓

CREATE OR REPLACE FUNCTION public.fn_recalc_credit_flags(
    p_credits_whatsapp integer,
    p_credits_sms integer,
    p_credits_email integer,
    p_credits_pooled integer,
    p_subscription_status text,
    p_credits_inapp integer DEFAULT 0)
RETURNS TABLE(can_send_whatsapp boolean, can_send_sms boolean, can_send_email boolean,
              can_send_inapp boolean, credits_low boolean)
LANGUAGE plpgsql
AS $function$
DECLARE
    v_is_active BOOLEAN;
    v_low_threshold INTEGER := 10;
BEGIN
    v_is_active := p_subscription_status IN ('active', 'trial', 'grace_period');
    RETURN QUERY SELECT
        v_is_active AND (p_credits_whatsapp + p_credits_pooled) > 0,
        v_is_active AND (p_credits_sms      + p_credits_pooled) > 0,
        v_is_active AND (p_credits_email    + p_credits_pooled) > 0,
        v_is_active AND (p_credits_inapp    + p_credits_pooled) > 0,
        -- Per channel: low the moment any channel the tenant can still send on
        -- drops under the threshold. The old cross-channel sum let email mask
        -- an empty WhatsApp pool (18 Aug 2026).
        (   (v_is_active AND (p_credits_whatsapp + p_credits_pooled) > 0 AND (p_credits_whatsapp + p_credits_pooled) < v_low_threshold)
         OR (v_is_active AND (p_credits_sms      + p_credits_pooled) > 0 AND (p_credits_sms      + p_credits_pooled) < v_low_threshold)
         OR (v_is_active AND (p_credits_email    + p_credits_pooled) > 0 AND (p_credits_email    + p_credits_pooled) < v_low_threshold)
         OR (v_is_active AND (p_credits_inapp    + p_credits_pooled) > 0 AND (p_credits_inapp    + p_credits_pooled) < v_low_threshold));
END;
$function$;

-- Recompute stored flags for every tenant (no-op update fires the BEFORE trigger)
UPDATE t_tenant_context SET credits_whatsapp = credits_whatsapp;
