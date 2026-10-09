-- ============================================================================
-- WhatsApp metering (batch whatsapp-metering, POA W3, spec §10)
-- ============================================================================
-- Notifications keep their existing path: n_jtd row → jtd-worker →
-- jtd_reserve_credit / jtd_charge_credit / jtd_release_credit. That worker runs
-- once a minute, too slow for a conversation, so chat messages (team assistant,
-- customer chat) are metered here, synchronously, on the SAME primitives
-- (reserve_credits / deduct_credits / release_reserved_credits) and the SAME
-- journal (reference_type 'wa_message').
--
-- Owner rules (8 Oct 2026):
--   · 1 credit per outbound message; inbound recorded, never charged.
--   · Test environment and exempt / unmetered tenants are never charged.
--   · At zero credits ONE free closing message per conversation, then nothing,
--     until credits are added again. Team: "out of credits, ask your admin".
--     Outsider: reads as a temporary issue + "connect directly on <number>"
--     (Business Profile phone → business WhatsApp → owner's verified WhatsApp
--     phone → else the storefront link).
--   · Low credit at 20 % of the most recent PURCHASE (top-up / add-on); the
--     small per-contract plan grants do not count; no purchase yet → 10.
--
-- Nothing calls these yet; the W4 router is the first caller (through the edge
-- module _shared/whatsapp/meteredSender.ts). Readers/writers are service-role
-- only (SECURITY DEFINER, EXECUTE revoked from PUBLIC/anon/authenticated).
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.t_whatsapp_messages (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id           uuid NOT NULL REFERENCES public.t_tenants(id) ON DELETE CASCADE,
    is_live             boolean NOT NULL DEFAULT true,
    direction           text NOT NULL CHECK (direction IN ('in', 'out')),
    audience            text NOT NULL CHECK (audience IN ('team', 'customer')),
    phone_e164          text NOT NULL CHECK (phone_e164 ~ '^\+[1-9][0-9]{7,14}$'),
    user_id             uuid,
    contact_id          uuid,
    message_type        text NOT NULL DEFAULT 'text',
    body                text,
    payload             jsonb NOT NULL DEFAULT '{}'::jsonb,
    is_closing          boolean NOT NULL DEFAULT false,
    status              text NOT NULL DEFAULT 'queued'
                        CHECK (status IN ('received', 'queued', 'sent', 'failed', 'delivered', 'read')),
    provider_message_id text,
    error               text,
    credit              jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at          timestamptz NOT NULL DEFAULT now(),
    updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_wa_messages_tenant_created
    ON public.t_whatsapp_messages (tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS ix_wa_messages_conversation
    ON public.t_whatsapp_messages (tenant_id, audience, phone_e164, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS ux_wa_messages_provider_id
    ON public.t_whatsapp_messages (provider_message_id) WHERE provider_message_id IS NOT NULL;

ALTER TABLE public.t_whatsapp_messages ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.t_whatsapp_messages FROM anon, authenticated;

-- ----------------------------------------------------------------------------
-- Who to send people to when the workspace is out of credits.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_wa_tenant_contact_number(p_tenant_id uuid)
RETURNS text
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    v_p      record;
    v_digits text;
    v_cc     text;
BEGIN
    SELECT business_phone, business_phone_country_code, business_phone_code,
           business_whatsapp, business_whatsapp_country_code
      INTO v_p
      FROM t_tenant_profiles WHERE tenant_id = p_tenant_id LIMIT 1;

    IF FOUND THEN
        v_digits := regexp_replace(COALESCE(NULLIF(v_p.business_phone, ''), v_p.business_whatsapp, ''), '\D', '', 'g');
        IF NULLIF(v_p.business_phone, '') IS NOT NULL THEN
            v_cc := regexp_replace(COALESCE(NULLIF(v_p.business_phone_country_code, ''), NULLIF(v_p.business_phone_code, ''), '91'), '\D', '', 'g');
        ELSE
            v_cc := regexp_replace(COALESCE(NULLIF(v_p.business_whatsapp_country_code, ''), NULLIF(v_p.business_phone_country_code, ''), '91'), '\D', '', 'g');
        END IF;
        IF length(v_digits) BETWEEN 6 AND 13 THEN
            RETURN '+' || COALESCE(NULLIF(v_cc, ''), '91') || ' ' || v_digits;
        END IF;
    END IF;

    RETURN (
        SELECT b.phone_e164
          FROM t_tenants t
          JOIN t_whatsapp_phone_bindings b ON b.user_id = t.created_by
         WHERE t.id = p_tenant_id
           AND b.revoked_at IS NULL AND b.auth_confirmed_at IS NOT NULL
         LIMIT 1
    );
END;
$$;

-- ----------------------------------------------------------------------------
-- Is chat for this tenant / environment charged at all?
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_wa_metered(p_tenant_id uuid, p_is_live boolean)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
    SELECT COALESCE(p_is_live, true)
       AND COALESCE((SELECT billing_mode FROM t_tenant_context
                      WHERE tenant_id = p_tenant_id
                      ORDER BY (product_code = 'contractnest') DESC LIMIT 1), 'exempt') <> 'exempt';
$$;

-- ----------------------------------------------------------------------------
-- Inbound: recorded for usage, never charged.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.wa_message_log_in(
    p_tenant_id uuid, p_is_live boolean, p_audience text, p_phone text,
    p_user_id uuid DEFAULT NULL, p_contact_id uuid DEFAULT NULL,
    p_message_type text DEFAULT 'text', p_body text DEFAULT NULL,
    p_payload jsonb DEFAULT '{}'::jsonb, p_provider_message_id text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    v_id uuid;
BEGIN
    IF p_provider_message_id IS NOT NULL THEN
        SELECT id INTO v_id FROM t_whatsapp_messages WHERE provider_message_id = p_provider_message_id;
        IF FOUND THEN
            RETURN jsonb_build_object('success', true, 'message_id', v_id, 'duplicate', true);
        END IF;
    END IF;

    INSERT INTO t_whatsapp_messages (tenant_id, is_live, direction, audience, phone_e164, user_id,
                                     contact_id, message_type, body, payload, status, provider_message_id)
    VALUES (p_tenant_id, COALESCE(p_is_live, true), 'in', p_audience, p_phone, p_user_id,
            p_contact_id, COALESCE(p_message_type, 'text'), p_body, COALESCE(p_payload, '{}'::jsonb),
            'received', p_provider_message_id)
    RETURNING id INTO v_id;

    RETURN jsonb_build_object('success', true, 'message_id', v_id, 'duplicate', false);
EXCEPTION WHEN unique_violation THEN
    SELECT id INTO v_id FROM t_whatsapp_messages WHERE provider_message_id = p_provider_message_id;
    RETURN jsonb_build_object('success', true, 'message_id', v_id, 'duplicate', true);
WHEN check_violation THEN
    RETURN jsonb_build_object('success', false, 'reason', 'invalid_input', 'error', SQLERRM);
END;
$$;

-- ----------------------------------------------------------------------------
-- Outbound step 1: log the message and hold one credit.
--   ok        → { success, message_id, metered, pool }            send it
--   no credit → { success:false, reason:'no_credits', send_closing, message_id?,
--                 closing:{audience, contact_number, storefront_key} }
--               send_closing = true exactly once per conversation until credits
--               are added again; message_id is then the free closing row.
-- A per-conversation advisory lock makes "exactly once" hold under concurrency.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.wa_meter_reserve(
    p_tenant_id uuid, p_is_live boolean, p_audience text, p_phone text,
    p_user_id uuid DEFAULT NULL, p_contact_id uuid DEFAULT NULL,
    p_message_type text DEFAULT 'text', p_body text DEFAULT NULL,
    p_payload jsonb DEFAULT '{}'::jsonb)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    v_id         uuid;
    v_pool       text;
    v_state      record;
    v_r          record;
    v_last_grant timestamptz;
    v_closing_id uuid;
BEGIN
    IF p_audience NOT IN ('team', 'customer') OR p_phone !~ '^\+[1-9][0-9]{7,14}$' THEN
        RETURN jsonb_build_object('success', false, 'reason', 'invalid_input');
    END IF;

    IF NOT fn_wa_metered(p_tenant_id, p_is_live) THEN
        INSERT INTO t_whatsapp_messages (tenant_id, is_live, direction, audience, phone_e164, user_id,
                                         contact_id, message_type, body, payload, credit)
        VALUES (p_tenant_id, COALESCE(p_is_live, true), 'out', p_audience, p_phone, p_user_id,
                p_contact_id, COALESCE(p_message_type, 'text'), p_body, COALESCE(p_payload, '{}'::jsonb),
                jsonb_build_object('metered', false))
        RETURNING id INTO v_id;
        RETURN jsonb_build_object('success', true, 'message_id', v_id, 'metered', false);
    END IF;

    PERFORM pg_advisory_xact_lock(hashtext('wa_meter:' || p_tenant_id::text || ':' || p_audience || ':' || p_phone));

    SELECT * INTO v_state FROM fn_credit_state(p_tenant_id, 'notification', 'whatsapp', FALSE);
    IF FOUND AND (v_state.gross - v_state.reserved) >= 1 THEN
        v_pool := 'whatsapp';
    ELSE
        SELECT * INTO v_state FROM fn_credit_state(p_tenant_id, 'notification', NULL, FALSE);
        IF FOUND AND (v_state.gross - v_state.reserved) >= 1 THEN
            v_pool := NULL;
        ELSE
            v_pool := '-';
        END IF;
    END IF;

    IF v_pool IS DISTINCT FROM '-' THEN
        SELECT * INTO v_r FROM reserve_credits(p_tenant_id, 'notification', v_pool, 1);
        IF COALESCE(v_r.success, false) THEN
            INSERT INTO t_whatsapp_messages (tenant_id, is_live, direction, audience, phone_e164, user_id,
                                             contact_id, message_type, body, payload, credit)
            VALUES (p_tenant_id, true, 'out', p_audience, p_phone, p_user_id, p_contact_id,
                    COALESCE(p_message_type, 'text'), p_body, COALESCE(p_payload, '{}'::jsonb),
                    jsonb_build_object('metered', true, 'pool', COALESCE(v_pool, '_'),
                                       'reserved', 1, 'reserved_at', now()))
            RETURNING id INTO v_id;
            RETURN jsonb_build_object('success', true, 'message_id', v_id, 'metered', true,
                                      'pool', COALESCE(v_pool, '_'), 'available_after', v_r.available_after);
        END IF;
    END IF;

    -- Out of credits. One free closing message per conversation since the last
    -- time credits were added (any positive journal row on WhatsApp or pooled).
    SELECT max(created_at) INTO v_last_grant
      FROM t_credit_journal
     WHERE tenant_id = p_tenant_id AND credit_type = 'notification'
       AND (channel = 'whatsapp' OR channel IS NULL) AND quantity > 0;

    IF EXISTS (SELECT 1 FROM t_whatsapp_messages m
                WHERE m.tenant_id = p_tenant_id AND m.audience = p_audience
                  AND m.phone_e164 = p_phone AND m.direction = 'out' AND m.is_closing
                  AND m.status <> 'failed'
                  AND m.created_at > COALESCE(v_last_grant, '-infinity'::timestamptz)) THEN
        RETURN jsonb_build_object('success', false, 'reason', 'no_credits', 'send_closing', false);
    END IF;

    INSERT INTO t_whatsapp_messages (tenant_id, is_live, direction, audience, phone_e164, user_id,
                                     contact_id, message_type, body, payload, is_closing, credit)
    VALUES (p_tenant_id, true, 'out', p_audience, p_phone, p_user_id, p_contact_id,
            'text', NULL, jsonb_build_object('replaces', p_message_type), true,
            jsonb_build_object('metered', false, 'free', true, 'reason', 'no_credits'))
    RETURNING id INTO v_closing_id;

    RETURN jsonb_build_object(
        'success', false, 'reason', 'no_credits', 'send_closing', true, 'message_id', v_closing_id,
        'closing', jsonb_build_object(
            'audience', p_audience,
            'contact_number', CASE WHEN p_audience = 'customer' THEN fn_wa_tenant_contact_number(p_tenant_id) END,
            'storefront_key', CASE WHEN p_audience = 'customer' THEN (
                SELECT storefront_key FROM t_touchpoints
                 WHERE tenant_id = p_tenant_id AND is_active AND storefront_key IS NOT NULL
                 ORDER BY created_at DESC LIMIT 1) END));
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'wa_meter_reserve failed for tenant %: %', p_tenant_id, SQLERRM;
    RETURN jsonb_build_object('success', false, 'reason', 'meter_error', 'error', SQLERRM);
END;
$$;

-- ----------------------------------------------------------------------------
-- Outbound step 2a: the provider accepted it → charge the held credit.
-- Idempotent: a second call never charges twice.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.wa_meter_charge(
    p_message_id uuid, p_provider_message_id text DEFAULT NULL, p_body text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    v_m    record;
    v_pool text;
    v_res  jsonb;
BEGIN
    SELECT * INTO v_m FROM t_whatsapp_messages WHERE id = p_message_id AND direction = 'out' FOR UPDATE;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'reason', 'message_not_found');
    END IF;

    UPDATE t_whatsapp_messages
       SET status = CASE WHEN status IN ('delivered', 'read') THEN status ELSE 'sent' END,
           provider_message_id = COALESCE(p_provider_message_id, provider_message_id),
           body = COALESCE(p_body, body), error = NULL, updated_at = now()
     WHERE id = p_message_id;

    IF COALESCE((v_m.credit->>'metered')::boolean, false) = false THEN
        RETURN jsonb_build_object('success', true, 'charged', false, 'reason', 'not_metered');
    END IF;
    IF v_m.credit ? 'charged_at' OR EXISTS (SELECT 1 FROM t_credit_journal
               WHERE reference_type = 'wa_message' AND reference_id = p_message_id
                 AND transaction_type = 'deduction') THEN
        RETURN jsonb_build_object('success', true, 'charged', false, 'reason', 'already_charged');
    END IF;
    IF v_m.credit ? 'released_at' THEN
        RETURN jsonb_build_object('success', false, 'charged', false, 'reason', 'already_released');
    END IF;

    v_pool := NULLIF(v_m.credit->>'pool', '_');
    v_res := deduct_credits(v_m.tenant_id, 'notification', 1, v_pool, 'wa_message',
                            p_message_id::text, 'WhatsApp ' || v_m.audience || ' message');

    IF COALESCE((v_res->>'success')::boolean, false) THEN
        UPDATE t_whatsapp_messages
           SET credit = credit || jsonb_build_object('charged', 1, 'charged_at', now())
         WHERE id = p_message_id;
    END IF;
    RETURN v_res || jsonb_build_object('charged', COALESCE((v_res->>'success')::boolean, false));
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'wa_meter_charge failed for %: %', p_message_id, SQLERRM;
    RETURN jsonb_build_object('success', false, 'reason', 'meter_error', 'error', SQLERRM);
END;
$$;

-- ----------------------------------------------------------------------------
-- Outbound step 2b: the send failed → give the held credit back.
-- A failed closing message does not use up the conversation's one closing.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.wa_meter_release(p_message_id uuid, p_error text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    v_m record;
    v_r record;
BEGIN
    SELECT * INTO v_m FROM t_whatsapp_messages WHERE id = p_message_id AND direction = 'out' FOR UPDATE;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'reason', 'message_not_found');
    END IF;

    UPDATE t_whatsapp_messages
       SET status = 'failed', error = left(p_error, 1000), updated_at = now()
     WHERE id = p_message_id AND status IN ('queued', 'failed');

    IF COALESCE((v_m.credit->>'metered')::boolean, false) = false
       OR v_m.credit ? 'charged_at' OR v_m.credit ? 'released_at' THEN
        RETURN jsonb_build_object('success', true, 'released', false, 'reason', 'nothing_held');
    END IF;

    SELECT * INTO v_r FROM release_reserved_credits(v_m.tenant_id, 'notification',
                                                    NULLIF(v_m.credit->>'pool', '_'), 1);
    UPDATE t_whatsapp_messages
       SET credit = credit || jsonb_build_object('released_at', now())
     WHERE id = p_message_id;

    RETURN jsonb_build_object('success', true, 'released', true, 'reserved_after', v_r.reserved_after);
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'wa_meter_release failed for %: %', p_message_id, SQLERRM;
    RETURN jsonb_build_object('success', false, 'reason', 'meter_error', 'error', SQLERRM);
END;
$$;

-- ----------------------------------------------------------------------------
-- Reader for Home: credits left, low state, this IST month's split.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_whatsapp_usage(p_tenant_id uuid)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    v_ctx        record;
    v_available  bigint := 0;
    v_balance    bigint := 0;
    v_reserved   bigint := 0;
    v_purchase   record;
    v_threshold  integer := 10;
    v_from       timestamptz;
    v_month      jsonb;
    v_state      text;
BEGIN
    SELECT * INTO v_ctx FROM t_tenant_context
     WHERE tenant_id = p_tenant_id ORDER BY (product_code = 'contractnest') DESC LIMIT 1;

    IF FOUND THEN
        v_balance  := COALESCE(v_ctx.credits_whatsapp, 0) + COALESCE(v_ctx.credits_pooled, 0);
        v_reserved := COALESCE((v_ctx.credits_reserved->>'notification:whatsapp')::bigint, 0)
                    + COALESCE((v_ctx.credits_reserved->>'notification:_')::bigint, 0);
        v_available := GREATEST(0, v_balance - v_reserved);
    END IF;

    SELECT quantity, created_at INTO v_purchase
      FROM t_credit_journal
     WHERE tenant_id = p_tenant_id AND credit_type = 'notification'
       AND (channel = 'whatsapp' OR channel IS NULL)
       AND transaction_type = 'topup' AND quantity > 0
       AND COALESCE(metadata->>'source', '') <> 'plan_grant'
     ORDER BY created_at DESC LIMIT 1;
    IF FOUND THEN
        v_threshold := GREATEST(1, ceil(v_purchase.quantity * 0.2))::integer;
    END IF;

    v_from := (date_trunc('month', now() AT TIME ZONE 'Asia/Kolkata')) AT TIME ZONE 'Asia/Kolkata';

    SELECT jsonb_build_object(
        'from', v_from,
        'notifications', (SELECT count(*) FROM t_credit_journal j
                           LEFT JOIN n_jtd n ON n.id = j.reference_id
                          WHERE j.tenant_id = p_tenant_id AND j.reference_type = 'jtd'
                            AND j.transaction_type = 'deduction' AND j.created_at >= v_from
                            AND (j.channel = 'whatsapp' OR (j.channel IS NULL AND n.channel_code = 'whatsapp'))),
        'team', (SELECT count(*) FROM t_credit_journal j JOIN t_whatsapp_messages m ON m.id = j.reference_id
                  WHERE j.tenant_id = p_tenant_id AND j.reference_type = 'wa_message'
                    AND j.transaction_type = 'deduction' AND j.created_at >= v_from AND m.audience = 'team'),
        'customer', (SELECT count(*) FROM t_credit_journal j JOIN t_whatsapp_messages m ON m.id = j.reference_id
                      WHERE j.tenant_id = p_tenant_id AND j.reference_type = 'wa_message'
                        AND j.transaction_type = 'deduction' AND j.created_at >= v_from AND m.audience = 'customer'),
        'inbound', (SELECT count(*) FROM t_whatsapp_messages
                     WHERE tenant_id = p_tenant_id AND direction = 'in' AND is_live AND created_at >= v_from),
        'free_closing', (SELECT count(*) FROM t_whatsapp_messages
                          WHERE tenant_id = p_tenant_id AND is_closing AND status <> 'failed' AND created_at >= v_from)
    ) INTO v_month;

    v_month := v_month || jsonb_build_object('total',
        (v_month->>'notifications')::int + (v_month->>'team')::int + (v_month->>'customer')::int);

    v_state := CASE
        WHEN NOT fn_wa_metered(p_tenant_id, true) THEN 'not_metered'
        WHEN v_available = 0 THEN 'out'
        WHEN v_available < v_threshold THEN 'low'
        ELSE 'ok' END;

    RETURN jsonb_build_object(
        'success', true,
        'metered', fn_wa_metered(p_tenant_id, true),
        'available', v_available, 'balance', v_balance, 'reserved', v_reserved,
        'state', v_state, 'low_threshold', v_threshold,
        'last_purchase', CASE WHEN v_purchase.quantity IS NULL THEN NULL
                              ELSE jsonb_build_object('quantity', v_purchase.quantity, 'at', v_purchase.created_at) END,
        'month', v_month,
        'generated_at', now());
END;
$$;

REVOKE ALL ON FUNCTION public.fn_wa_tenant_contact_number(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fn_wa_metered(uuid, boolean) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.wa_message_log_in(uuid, boolean, text, text, uuid, uuid, text, text, jsonb, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.wa_meter_reserve(uuid, boolean, text, text, uuid, uuid, text, text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.wa_meter_charge(uuid, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.wa_meter_release(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_whatsapp_usage(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_wa_tenant_contact_number(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.fn_wa_metered(uuid, boolean) TO service_role;
GRANT EXECUTE ON FUNCTION public.wa_message_log_in(uuid, boolean, text, text, uuid, uuid, text, text, jsonb, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.wa_meter_reserve(uuid, boolean, text, text, uuid, uuid, text, text, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.wa_meter_charge(uuid, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.wa_meter_release(uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_whatsapp_usage(uuid) TO service_role;
