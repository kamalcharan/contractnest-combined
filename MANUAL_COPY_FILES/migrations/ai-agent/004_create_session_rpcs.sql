-- ============================================
-- SESSION MANAGEMENT RPCs
-- get_ai_session, create_ai_session, update_ai_session, end_ai_session
-- ============================================

-- ============================================
-- 1. GET AI SESSION
-- Returns active session for a phone number
-- ============================================

CREATE OR REPLACE FUNCTION get_ai_session(p_phone VARCHAR)
RETURNS TABLE (
    session_id UUID,
    user_id UUID,
    group_id UUID,
    group_code VARCHAR,
    group_name VARCHAR,
    session_scope VARCHAR,
    channel VARCHAR,
    context JSONB,
    conversation_history JSONB,
    detected_language VARCHAR,
    started_at TIMESTAMPTZ,
    last_activity_at TIMESTAMPTZ
) AS $$
DECLARE
    v_phone_digits VARCHAR;
BEGIN
    v_phone_digits := regexp_replace(p_phone, '[^0-9]', '', 'g');

    -- First, expire old sessions (for web channel only)
    UPDATE public.t_ai_agent_sessions
    SET is_active = false, end_reason = 'timeout', ended_at = NOW()
    WHERE expires_at < NOW()
      AND expires_at IS NOT NULL
      AND is_active = true;

    -- Return active session
    RETURN QUERY
    SELECT
        s.id AS session_id,
        s.user_id,
        s.group_id,
        s.group_code::VARCHAR,
        bg.group_name::VARCHAR,
        s.session_scope::VARCHAR,
        s.channel::VARCHAR,
        s.context,
        s.conversation_history,
        s.detected_language::VARCHAR,
        s.started_at,
        s.last_activity_at
    FROM public.t_ai_agent_sessions s
    LEFT JOIN public.t_business_groups bg ON bg.id = s.group_id
    WHERE (s.phone = p_phone OR s.phone_normalized = v_phone_digits)
      AND s.is_active = true
    ORDER BY s.last_activity_at DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 2. CREATE AI SESSION
-- Creates new session, ends any existing ones for this phone
-- ============================================

CREATE OR REPLACE FUNCTION create_ai_session(
    p_user_id UUID,
    p_phone VARCHAR,
    p_group_id UUID,
    p_channel VARCHAR DEFAULT 'whatsapp',
    p_language VARCHAR DEFAULT 'en'
)
RETURNS UUID AS $$
DECLARE
    v_session_id UUID;
    v_phone_digits VARCHAR;
    v_group_code VARCHAR;
    v_timeout INTEGER;
    v_expires_at TIMESTAMPTZ;
BEGIN
    v_phone_digits := regexp_replace(p_phone, '[^0-9]', '', 'g');

    -- Get group info and timeout setting
    SELECT
        group_name,
        COALESCE((settings->'ai_agent'->>'session_timeout_minutes')::INTEGER, 30)
    INTO v_group_code, v_timeout
    FROM public.t_business_groups
    WHERE id = p_group_id;

    -- End existing sessions for this phone
    UPDATE public.t_ai_agent_sessions
    SET
        is_active = false,
        end_reason = 'new_session',
        ended_at = NOW(),
        updated_at = NOW()
    WHERE phone_normalized = v_phone_digits
      AND is_active = true;

    -- Calculate expiry: NULL for WhatsApp, timeout for web
    IF p_channel = 'whatsapp' THEN
        v_expires_at := NULL;  -- WhatsApp sessions don't expire by time
    ELSE
        v_expires_at := NOW() + (v_timeout || ' minutes')::INTERVAL;
    END IF;

    -- Create new session
    INSERT INTO public.t_ai_agent_sessions (
        user_id,
        phone,
        phone_normalized,
        group_id,
        group_code,
        channel,
        session_scope,
        detected_language,
        is_active,
        started_at,
        last_activity_at,
        expires_at,
        context,
        conversation_history
    ) VALUES (
        p_user_id,
        p_phone,
        v_phone_digits,
        p_group_id,
        v_group_code,
        p_channel,
        'group',
        p_language,
        true,
        NOW(),
        NOW(),
        v_expires_at,
        '{}'::JSONB,
        '[]'::JSONB
    )
    RETURNING id INTO v_session_id;

    RETURN v_session_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 3. UPDATE AI SESSION
-- Updates session activity, context, and conversation history
-- ============================================

CREATE OR REPLACE FUNCTION update_ai_session(
    p_session_id UUID,
    p_context JSONB DEFAULT NULL,
    p_language VARCHAR DEFAULT NULL,
    p_add_message JSONB DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    v_timeout INTEGER;
    v_channel VARCHAR;
    v_history JSONB;
    v_new_expires TIMESTAMPTZ;
BEGIN
    -- Get session info
    SELECT
        s.channel,
        COALESCE((bg.settings->'ai_agent'->>'session_timeout_minutes')::INTEGER, 30),
        s.conversation_history
    INTO v_channel, v_timeout, v_history
    FROM public.t_ai_agent_sessions s
    LEFT JOIN public.t_business_groups bg ON s.group_id = bg.id
    WHERE s.id = p_session_id AND s.is_active = true;

    IF NOT FOUND THEN
        RETURN false;
    END IF;

    -- Add new message to history if provided
    IF p_add_message IS NOT NULL THEN
        -- Add timestamp if not present
        IF NOT (p_add_message ? 'timestamp') THEN
            p_add_message := p_add_message || jsonb_build_object('timestamp', NOW());
        END IF;

        v_history := v_history || p_add_message;

        -- Trim to last 10 messages
        IF jsonb_array_length(v_history) > 10 THEN
            v_history := (
                SELECT jsonb_agg(elem)
                FROM (
                    SELECT elem
                    FROM jsonb_array_elements(v_history) WITH ORDINALITY AS t(elem, ord)
                    ORDER BY ord DESC
                    LIMIT 10
                ) sub
            );
        END IF;
    END IF;

    -- Calculate new expiry for web channel
    IF v_channel = 'whatsapp' THEN
        v_new_expires := NULL;
    ELSE
        v_new_expires := NOW() + (v_timeout || ' minutes')::INTERVAL;
    END IF;

    -- Update session
    UPDATE public.t_ai_agent_sessions
    SET
        last_activity_at = NOW(),
        expires_at = v_new_expires,
        context = CASE
            WHEN p_context IS NOT NULL THEN context || p_context
            ELSE context
        END,
        conversation_history = v_history,
        detected_language = COALESCE(p_language, detected_language),
        updated_at = NOW()
    WHERE id = p_session_id
      AND is_active = true;

    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 4. END AI SESSION
-- Marks session as inactive (user said "Bye")
-- ============================================

CREATE OR REPLACE FUNCTION end_ai_session(p_phone VARCHAR)
RETURNS BOOLEAN AS $$
DECLARE
    v_phone_digits VARCHAR;
BEGIN
    v_phone_digits := regexp_replace(p_phone, '[^0-9]', '', 'g');

    UPDATE public.t_ai_agent_sessions
    SET
        is_active = false,
        end_reason = 'user_exit',
        ended_at = NOW(),
        updated_at = NOW()
    WHERE phone_normalized = v_phone_digits
      AND is_active = true;

    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 5. SWITCH AI SESSION (Bonus)
-- Switches from one group to another
-- ============================================

CREATE OR REPLACE FUNCTION switch_ai_session(
    p_phone VARCHAR,
    p_new_group_id UUID,
    p_language VARCHAR DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_user_id UUID;
    v_channel VARCHAR;
    v_language VARCHAR;
    v_new_session_id UUID;
    v_phone_digits VARCHAR;
BEGIN
    v_phone_digits := regexp_replace(p_phone, '[^0-9]', '', 'g');

    -- Get user_id and channel from current session
    SELECT user_id, channel, detected_language
    INTO v_user_id, v_channel, v_language
    FROM public.t_ai_agent_sessions
    WHERE phone_normalized = v_phone_digits
      AND is_active = true
    ORDER BY last_activity_at DESC
    LIMIT 1;

    -- End current session with switch reason
    UPDATE public.t_ai_agent_sessions
    SET
        is_active = false,
        end_reason = 'switch_group',
        ended_at = NOW(),
        updated_at = NOW()
    WHERE phone_normalized = v_phone_digits
      AND is_active = true;

    -- Create new session with new group
    v_new_session_id := create_ai_session(
        v_user_id,
        p_phone,
        p_new_group_id,
        COALESCE(v_channel, 'whatsapp'),
        COALESCE(p_language, v_language, 'en')
    );

    RETURN v_new_session_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 6. CLEANUP EXPIRED SESSIONS
-- Utility function for maintenance
-- ============================================

CREATE OR REPLACE FUNCTION cleanup_expired_ai_sessions()
RETURNS INTEGER AS $$
DECLARE
    v_deleted_count INTEGER;
BEGIN
    UPDATE public.t_ai_agent_sessions
    SET
        is_active = false,
        end_reason = 'timeout',
        ended_at = NOW()
    WHERE expires_at < NOW()
      AND expires_at IS NOT NULL
      AND is_active = true;

    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 7. GRANTS
-- ============================================

GRANT EXECUTE ON FUNCTION get_ai_session TO authenticated;
GRANT EXECUTE ON FUNCTION get_ai_session TO service_role;

GRANT EXECUTE ON FUNCTION create_ai_session TO authenticated;
GRANT EXECUTE ON FUNCTION create_ai_session TO service_role;

GRANT EXECUTE ON FUNCTION update_ai_session TO authenticated;
GRANT EXECUTE ON FUNCTION update_ai_session TO service_role;

GRANT EXECUTE ON FUNCTION end_ai_session TO authenticated;
GRANT EXECUTE ON FUNCTION end_ai_session TO service_role;

GRANT EXECUTE ON FUNCTION switch_ai_session TO authenticated;
GRANT EXECUTE ON FUNCTION switch_ai_session TO service_role;

GRANT EXECUTE ON FUNCTION cleanup_expired_ai_sessions TO service_role;

-- ============================================
-- 8. COMMENTS
-- ============================================

COMMENT ON FUNCTION get_ai_session IS 'Returns active AI session for a phone number. Auto-expires timed-out web sessions.';
COMMENT ON FUNCTION create_ai_session IS 'Creates new AI session. Ends any existing sessions for the phone. WhatsApp sessions have no time expiry.';
COMMENT ON FUNCTION update_ai_session IS 'Updates session activity, context, and conversation history. Keeps last 10 messages.';
COMMENT ON FUNCTION end_ai_session IS 'Ends AI session when user says Bye. Marks session as inactive.';
COMMENT ON FUNCTION switch_ai_session IS 'Switches session from one group to another (e.g., user says Hi TechForum while in BBB).';
COMMENT ON FUNCTION cleanup_expired_ai_sessions IS 'Maintenance function to clean up expired sessions. Returns count of sessions cleaned.';

-- ============================================
-- 9. VERIFICATION QUERIES
-- ============================================

/*
-- Test session flow:

-- 1. Create session
SELECT create_ai_session(
    'user-uuid-here'::UUID,
    '+919876543210',
    'group-uuid-here'::UUID,
    'whatsapp',
    'en'
);

-- 2. Get session
SELECT * FROM get_ai_session('+919876543210');

-- 3. Update session with context
SELECT update_ai_session(
    'session-uuid-here'::UUID,
    '{"last_search": "panchakarma"}'::JSONB,
    'hi',
    '{"role": "user", "content": "panchakarma kaun karta hai?"}'::JSONB
);

-- 4. End session
SELECT end_ai_session('+919876543210');

-- 5. Verify ended
SELECT * FROM get_ai_session('+919876543210');  -- Should return empty
*/
