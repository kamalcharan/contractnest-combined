-- ============================================
-- SESSION MANAGEMENT RPCs - BY USER/TENANT
-- Overloaded functions for web/chat where we have user context
-- ============================================

-- ============================================
-- 1. GET AI SESSION BY USER
-- Returns active session for tenant_id + user_id (web/chat flow)
-- ============================================

CREATE OR REPLACE FUNCTION get_ai_session_by_user(
    p_tenant_id UUID,
    p_user_id UUID
)
RETURNS TABLE (
    session_id UUID,
    user_id UUID,
    phone VARCHAR,
    group_id UUID,
    group_code VARCHAR,
    group_name VARCHAR,
    session_scope VARCHAR,
    channel VARCHAR,
    context JSONB,
    conversation_history JSONB,
    detected_language VARCHAR,
    started_at TIMESTAMPTZ,
    last_activity_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ
) AS $$
BEGIN
    -- First, expire old sessions (for web channel only)
    UPDATE public.t_ai_agent_sessions
    SET is_active = false, end_reason = 'timeout', ended_at = NOW()
    WHERE expires_at < NOW()
      AND expires_at IS NOT NULL
      AND is_active = true;

    -- Return active session for this user
    RETURN QUERY
    SELECT
        s.id AS session_id,
        s.user_id,
        s.phone::VARCHAR,
        s.group_id,
        s.group_code::VARCHAR,
        bg.group_name::VARCHAR,
        s.session_scope::VARCHAR,
        s.channel::VARCHAR,
        s.context,
        s.conversation_history,
        s.detected_language::VARCHAR,
        s.started_at,
        s.last_activity_at,
        s.expires_at
    FROM public.t_ai_agent_sessions s
    LEFT JOIN public.t_business_groups bg ON bg.id = s.group_id
    WHERE s.user_id = p_user_id
      AND s.tenant_id = p_tenant_id
      AND s.is_active = true
    ORDER BY s.last_activity_at DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 2. CREATE AI SESSION BY USER
-- Creates session using tenant_id + user_id (web/chat flow)
-- Phone is optional - looked up from profile if not provided
-- ============================================

CREATE OR REPLACE FUNCTION create_ai_session_by_user(
    p_tenant_id UUID,
    p_user_id UUID,
    p_group_id UUID,
    p_channel VARCHAR DEFAULT 'web',
    p_language VARCHAR DEFAULT 'en',
    p_phone VARCHAR DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_session_id UUID;
    v_phone VARCHAR;
    v_phone_digits VARCHAR;
    v_group_code VARCHAR;
    v_timeout INTEGER;
    v_expires_at TIMESTAMPTZ;
BEGIN
    -- Get phone from profile if not provided
    IF p_phone IS NULL THEN
        SELECT mobile_number INTO v_phone
        FROM public.t_user_profiles
        WHERE id = p_user_id
          AND tenant_id = p_tenant_id;
    ELSE
        v_phone := p_phone;
    END IF;

    v_phone_digits := regexp_replace(COALESCE(v_phone, ''), '[^0-9]', '', 'g');

    -- Get group info and timeout setting
    SELECT
        group_name,
        COALESCE((settings->'ai_agent'->>'session_timeout_minutes')::INTEGER, 30)
    INTO v_group_code, v_timeout
    FROM public.t_business_groups
    WHERE id = p_group_id;

    -- End existing sessions for this user in this tenant
    UPDATE public.t_ai_agent_sessions
    SET
        is_active = false,
        end_reason = 'new_session',
        ended_at = NOW(),
        updated_at = NOW()
    WHERE user_id = p_user_id
      AND tenant_id = p_tenant_id
      AND is_active = true;

    -- Calculate expiry: NULL for WhatsApp, timeout for web/chat
    IF p_channel = 'whatsapp' THEN
        v_expires_at := NULL;
    ELSE
        v_expires_at := NOW() + (v_timeout || ' minutes')::INTERVAL;
    END IF;

    -- Create new session
    INSERT INTO public.t_ai_agent_sessions (
        tenant_id,
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
        p_tenant_id,
        p_user_id,
        v_phone,
        NULLIF(v_phone_digits, ''),
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
-- 3. END AI SESSION BY USER
-- Ends session using tenant_id + user_id
-- ============================================

CREATE OR REPLACE FUNCTION end_ai_session_by_user(
    p_tenant_id UUID,
    p_user_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE public.t_ai_agent_sessions
    SET
        is_active = false,
        end_reason = 'user_exit',
        ended_at = NOW(),
        updated_at = NOW()
    WHERE user_id = p_user_id
      AND tenant_id = p_tenant_id
      AND is_active = true;

    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 4. SWITCH AI SESSION BY USER
-- Switches group using tenant_id + user_id
-- ============================================

CREATE OR REPLACE FUNCTION switch_ai_session_by_user(
    p_tenant_id UUID,
    p_user_id UUID,
    p_new_group_id UUID,
    p_language VARCHAR DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_phone VARCHAR;
    v_channel VARCHAR;
    v_language VARCHAR;
    v_new_session_id UUID;
BEGIN
    -- Get phone and channel from current session
    SELECT phone, channel, detected_language
    INTO v_phone, v_channel, v_language
    FROM public.t_ai_agent_sessions
    WHERE user_id = p_user_id
      AND tenant_id = p_tenant_id
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
    WHERE user_id = p_user_id
      AND tenant_id = p_tenant_id
      AND is_active = true;

    -- Create new session with new group
    v_new_session_id := create_ai_session_by_user(
        p_tenant_id,
        p_user_id,
        p_new_group_id,
        COALESCE(v_channel, 'web'),
        COALESCE(p_language, v_language, 'en'),
        v_phone
    );

    RETURN v_new_session_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 5. ADD tenant_id COLUMN TO SESSIONS TABLE
-- Required for user-based lookups
-- ============================================

-- Add tenant_id column if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 't_ai_agent_sessions'
          AND column_name = 'tenant_id'
    ) THEN
        ALTER TABLE public.t_ai_agent_sessions
        ADD COLUMN tenant_id UUID REFERENCES public.t_tenant_profiles(id);

        -- Create index for user-based lookups
        CREATE INDEX IF NOT EXISTS idx_ai_sessions_tenant_user
        ON public.t_ai_agent_sessions(tenant_id, user_id)
        WHERE is_active = true;

        COMMENT ON COLUMN public.t_ai_agent_sessions.tenant_id IS 'Tenant ID for user-based session lookups (web/chat)';
    END IF;
END $$;

-- ============================================
-- 6. UPDATE ORIGINAL create_ai_session TO INCLUDE tenant_id
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
    v_tenant_id UUID;
BEGIN
    v_phone_digits := regexp_replace(p_phone, '[^0-9]', '', 'g');

    -- Get tenant_id from user profile
    SELECT tenant_id INTO v_tenant_id
    FROM public.t_user_profiles
    WHERE id = p_user_id;

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
        v_expires_at := NULL;
    ELSE
        v_expires_at := NOW() + (v_timeout || ' minutes')::INTERVAL;
    END IF;

    -- Create new session (now includes tenant_id)
    INSERT INTO public.t_ai_agent_sessions (
        tenant_id,
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
        v_tenant_id,
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
-- 7. GRANTS
-- ============================================

GRANT EXECUTE ON FUNCTION get_ai_session_by_user TO authenticated;
GRANT EXECUTE ON FUNCTION get_ai_session_by_user TO service_role;

GRANT EXECUTE ON FUNCTION create_ai_session_by_user TO authenticated;
GRANT EXECUTE ON FUNCTION create_ai_session_by_user TO service_role;

GRANT EXECUTE ON FUNCTION end_ai_session_by_user TO authenticated;
GRANT EXECUTE ON FUNCTION end_ai_session_by_user TO service_role;

GRANT EXECUTE ON FUNCTION switch_ai_session_by_user TO authenticated;
GRANT EXECUTE ON FUNCTION switch_ai_session_by_user TO service_role;

-- ============================================
-- 8. COMMENTS
-- ============================================

COMMENT ON FUNCTION get_ai_session_by_user IS 'Returns active AI session for a tenant + user combination. Used for web/chat where user is authenticated.';
COMMENT ON FUNCTION create_ai_session_by_user IS 'Creates AI session using tenant_id + user_id. Phone is looked up from profile if not provided.';
COMMENT ON FUNCTION end_ai_session_by_user IS 'Ends AI session by tenant_id + user_id.';
COMMENT ON FUNCTION switch_ai_session_by_user IS 'Switches group for session by tenant_id + user_id.';

-- ============================================
-- 9. VERIFICATION QUERIES
-- ============================================

/*
-- Test user-based session flow:

-- 1. Create session by user (web channel)
SELECT create_ai_session_by_user(
    'tenant-uuid-here'::UUID,
    'user-uuid-here'::UUID,
    'group-uuid-here'::UUID,
    'web',
    'en'
);

-- 2. Get session by user
SELECT * FROM get_ai_session_by_user(
    'tenant-uuid-here'::UUID,
    'user-uuid-here'::UUID
);

-- 3. End session by user
SELECT end_ai_session_by_user(
    'tenant-uuid-here'::UUID,
    'user-uuid-here'::UUID
);

-- Compare: Phone-based (WhatsApp) vs User-based (Web)
-- WhatsApp: get_ai_session('+919876543210')
-- Web:      get_ai_session_by_user(tenant_id, user_id)
*/
