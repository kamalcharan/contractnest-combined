-- ============================================
-- CHAT SESSIONS TABLE
-- 30-minute session expiry for conversation context
-- ============================================

CREATE TABLE IF NOT EXISTS public.t_chat_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- User/Tenant context
    user_id UUID,                                -- Auth user ID (nullable for anonymous)
    tenant_id UUID,                              -- Tenant context
    channel TEXT NOT NULL DEFAULT 'web',         -- web | whatsapp | widget

    -- Active group context
    group_id UUID REFERENCES public.t_business_groups(id) ON DELETE SET NULL,
    group_name TEXT,                             -- Cached for quick display

    -- Intent state machine
    intent_state TEXT NOT NULL DEFAULT 'IDLE',   -- IDLE | ACTIVATED | AWAITING_INPUT | SEARCHING
    current_intent TEXT,                         -- search_offering | search_segment | member_lookup | about_group
    pending_prompt TEXT,                         -- Prompt waiting for user input

    -- Session data (flexible storage)
    session_data JSONB DEFAULT '{}',             -- Additional context, last query, etc.
    message_count INT DEFAULT 0,                 -- Messages in this session

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_activity_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 minutes'),

    -- Constraints
    CONSTRAINT chk_intent_state CHECK (intent_state IN ('IDLE', 'ACTIVATED', 'AWAITING_INPUT', 'SEARCHING'))
);

-- Index for session lookup by user/tenant
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user
    ON public.t_chat_sessions(user_id, tenant_id);

-- Index for session expiry lookups
CREATE INDEX IF NOT EXISTS idx_chat_sessions_expires
    ON public.t_chat_sessions(expires_at);

-- Index for channel-based queries
CREATE INDEX IF NOT EXISTS idx_chat_sessions_channel
    ON public.t_chat_sessions(channel, user_id);

-- ============================================
-- FUNCTION: Get or create session
-- Returns existing active session or creates new one
-- ============================================
CREATE OR REPLACE FUNCTION get_or_create_session(
    p_user_id UUID,
    p_tenant_id UUID,
    p_channel TEXT DEFAULT 'web'
)
RETURNS public.t_chat_sessions AS $$
DECLARE
    v_session public.t_chat_sessions;
BEGIN
    -- Look for existing active session
    SELECT * INTO v_session
    FROM public.t_chat_sessions
    WHERE user_id = p_user_id
      AND tenant_id = p_tenant_id
      AND channel = p_channel
      AND expires_at > NOW()
    ORDER BY created_at DESC
    LIMIT 1;

    IF FOUND THEN
        -- Extend session expiry on activity
        UPDATE public.t_chat_sessions
        SET
            last_activity_at = NOW(),
            updated_at = NOW(),
            expires_at = NOW() + INTERVAL '30 minutes'
        WHERE id = v_session.id
        RETURNING * INTO v_session;

        RETURN v_session;
    ELSE
        -- Create new session
        INSERT INTO public.t_chat_sessions (
            user_id,
            tenant_id,
            channel,
            intent_state,
            created_at,
            updated_at,
            last_activity_at,
            expires_at
        ) VALUES (
            p_user_id,
            p_tenant_id,
            p_channel,
            'IDLE',
            NOW(),
            NOW(),
            NOW(),
            NOW() + INTERVAL '30 minutes'
        )
        RETURNING * INTO v_session;

        RETURN v_session;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- FUNCTION: Activate group in session
-- Sets group context when user types "Hi BBB"
-- ============================================
CREATE OR REPLACE FUNCTION activate_group_session(
    p_session_id UUID,
    p_group_id UUID,
    p_group_name TEXT
)
RETURNS public.t_chat_sessions AS $$
DECLARE
    v_session public.t_chat_sessions;
BEGIN
    UPDATE public.t_chat_sessions
    SET
        group_id = p_group_id,
        group_name = p_group_name,
        intent_state = 'ACTIVATED',
        current_intent = NULL,
        pending_prompt = NULL,
        last_activity_at = NOW(),
        updated_at = NOW(),
        expires_at = NOW() + INTERVAL '30 minutes'
    WHERE id = p_session_id
    RETURNING * INTO v_session;

    RETURN v_session;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- FUNCTION: Set intent in session
-- When user clicks an intent button
-- ============================================
CREATE OR REPLACE FUNCTION set_session_intent(
    p_session_id UUID,
    p_intent TEXT,
    p_prompt TEXT
)
RETURNS public.t_chat_sessions AS $$
DECLARE
    v_session public.t_chat_sessions;
BEGIN
    UPDATE public.t_chat_sessions
    SET
        intent_state = 'AWAITING_INPUT',
        current_intent = p_intent,
        pending_prompt = p_prompt,
        last_activity_at = NOW(),
        updated_at = NOW(),
        expires_at = NOW() + INTERVAL '30 minutes'
    WHERE id = p_session_id
    RETURNING * INTO v_session;

    RETURN v_session;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- FUNCTION: Clear session (on "Bye" or timeout)
-- ============================================
CREATE OR REPLACE FUNCTION end_chat_session(p_session_id UUID)
RETURNS void AS $$
BEGIN
    UPDATE public.t_chat_sessions
    SET
        intent_state = 'IDLE',
        group_id = NULL,
        group_name = NULL,
        current_intent = NULL,
        pending_prompt = NULL,
        updated_at = NOW(),
        expires_at = NOW()  -- Expire immediately
    WHERE id = p_session_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- FUNCTION: Increment message count
-- ============================================
CREATE OR REPLACE FUNCTION increment_session_messages(p_session_id UUID)
RETURNS void AS $$
BEGIN
    UPDATE public.t_chat_sessions
    SET
        message_count = message_count + 1,
        last_activity_at = NOW(),
        updated_at = NOW(),
        expires_at = NOW() + INTERVAL '30 minutes'
    WHERE id = p_session_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- CLEANUP: Remove expired sessions
-- Run periodically
-- ============================================
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS INT AS $$
DECLARE
    v_deleted_count INT;
BEGIN
    DELETE FROM public.t_chat_sessions
    WHERE expires_at < NOW();

    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- RLS Policies
-- ============================================
ALTER TABLE public.t_chat_sessions ENABLE ROW LEVEL SECURITY;

-- Users can only see their own sessions
CREATE POLICY "Users can manage own sessions" ON public.t_chat_sessions
    FOR ALL
    USING (user_id = auth.uid() OR tenant_id::text = auth.uid()::text);

-- Service role full access
CREATE POLICY "Service role full access" ON public.t_chat_sessions
    FOR ALL
    USING (auth.role() = 'service_role');

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.t_chat_sessions TO authenticated;
GRANT ALL ON public.t_chat_sessions TO service_role;

COMMENT ON TABLE public.t_chat_sessions IS 'Chat session state for VaNi AI assistant with 30-minute sliding expiry';
