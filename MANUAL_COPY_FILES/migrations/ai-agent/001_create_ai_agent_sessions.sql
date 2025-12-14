-- ============================================
-- AI AGENT SESSIONS TABLE
-- Manages conversation sessions for AI agent
-- Supports WhatsApp (no expiry) and Web (30 min expiry)
-- ============================================

-- ============================================
-- 1. CREATE TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.t_ai_agent_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- User identification
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    phone VARCHAR(20) NOT NULL,                    -- Original phone format (E.164)
    phone_normalized VARCHAR(20) NOT NULL,         -- Digits only for flexible matching

    -- Group context (scope)
    group_id UUID REFERENCES public.t_business_groups(id) ON DELETE SET NULL,
    group_code VARCHAR(50),                        -- Denormalized for quick access

    -- Channel and scope
    channel VARCHAR(20) NOT NULL DEFAULT 'whatsapp',  -- 'whatsapp' | 'web' | 'widget'
    session_scope VARCHAR(20) NOT NULL DEFAULT 'group',

    -- Conversation context (for AI memory)
    context JSONB DEFAULT '{}'::jsonb,
    /*
    Example context:
    {
        "last_search_query": "panchakarma",
        "last_results_count": 3,
        "last_member_id": "uuid",
        "last_member_name": "Ayurveda Clinic"
    }
    */

    -- Conversation history (last 10 messages for context window)
    conversation_history JSONB DEFAULT '[]'::jsonb,
    /*
    Example:
    [
        {"role": "user", "content": "Hi BBB", "timestamp": "2024-12-01T10:00:00Z"},
        {"role": "assistant", "content": "Welcome!", "timestamp": "2024-12-01T10:00:01Z"}
    ]
    */

    -- Language detection
    detected_language VARCHAR(10) DEFAULT 'en',

    -- Session lifecycle
    is_active BOOLEAN DEFAULT true,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    last_activity_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,                        -- NULL for WhatsApp (never expires by time)
    ended_at TIMESTAMPTZ DEFAULT NULL,
    end_reason VARCHAR(50) DEFAULT NULL,           -- 'user_exit' | 'timeout' | 'switch_group' | 'error'

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 2. INDEXES
-- ============================================

-- Primary lookup by phone (most common query)
CREATE INDEX IF NOT EXISTS idx_ai_sessions_phone
    ON public.t_ai_agent_sessions(phone)
    WHERE is_active = true;

-- Normalized phone lookup (flexible matching)
CREATE INDEX IF NOT EXISTS idx_ai_sessions_phone_norm
    ON public.t_ai_agent_sessions(phone_normalized)
    WHERE is_active = true;

-- User lookup
CREATE INDEX IF NOT EXISTS idx_ai_sessions_user
    ON public.t_ai_agent_sessions(user_id)
    WHERE is_active = true;

-- Group lookup
CREATE INDEX IF NOT EXISTS idx_ai_sessions_group
    ON public.t_ai_agent_sessions(group_id)
    WHERE is_active = true;

-- Expiry lookup for cleanup
CREATE INDEX IF NOT EXISTS idx_ai_sessions_expires
    ON public.t_ai_agent_sessions(expires_at)
    WHERE is_active = true AND expires_at IS NOT NULL;

-- Channel-based queries
CREATE INDEX IF NOT EXISTS idx_ai_sessions_channel
    ON public.t_ai_agent_sessions(channel, phone_normalized);

-- ============================================
-- 3. ROW LEVEL SECURITY
-- ============================================

ALTER TABLE public.t_ai_agent_sessions ENABLE ROW LEVEL SECURITY;

-- Users can view their own sessions
CREATE POLICY "Users can view own sessions"
    ON public.t_ai_agent_sessions
    FOR SELECT
    USING (user_id = auth.uid());

-- Users can update their own sessions
CREATE POLICY "Users can update own sessions"
    ON public.t_ai_agent_sessions
    FOR UPDATE
    USING (user_id = auth.uid());

-- Service role has full access (for N8N/backend)
CREATE POLICY "Service role full access"
    ON public.t_ai_agent_sessions
    FOR ALL
    USING (auth.role() = 'service_role');

-- ============================================
-- 4. GRANTS
-- ============================================

GRANT SELECT, INSERT, UPDATE ON public.t_ai_agent_sessions TO authenticated;
GRANT ALL ON public.t_ai_agent_sessions TO service_role;

-- ============================================
-- 5. COMMENTS
-- ============================================

COMMENT ON TABLE public.t_ai_agent_sessions IS 'AI agent conversation sessions. WhatsApp sessions have no expiry, Web sessions expire after 30 minutes of inactivity.';

COMMENT ON COLUMN public.t_ai_agent_sessions.phone IS 'Phone number in original format (E.164 recommended: +919876543210)';
COMMENT ON COLUMN public.t_ai_agent_sessions.phone_normalized IS 'Phone number with only digits for flexible matching (e.g., 919876543210)';
COMMENT ON COLUMN public.t_ai_agent_sessions.context IS 'JSON object storing conversation context like last search query, results, etc.';
COMMENT ON COLUMN public.t_ai_agent_sessions.conversation_history IS 'Array of last 10 messages for AI context window';
COMMENT ON COLUMN public.t_ai_agent_sessions.expires_at IS 'Session expiry time. NULL for WhatsApp (no time-based expiry).';
COMMENT ON COLUMN public.t_ai_agent_sessions.end_reason IS 'Why session ended: user_exit, timeout, switch_group, error';
