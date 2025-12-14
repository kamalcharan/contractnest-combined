-- ============================================
-- AI AGENT CONFIGURATION SCHEMA
-- Defines the ai_agent JSONB structure for t_business_groups.settings
-- ============================================

-- ============================================
-- 1. DOCUMENTATION: ai_agent JSONB Schema
-- ============================================

/*
The ai_agent configuration is stored in t_business_groups.settings->'ai_agent'

Schema:
{
    "enabled": boolean,                    -- Is AI agent enabled for this group?
    "activation_keywords": string[],       -- Keywords to start session (e.g., ["Hi BBB", "Hello BBB"])
    "exit_keywords": string[],             -- Keywords to end session (e.g., ["Bye", "Exit"])
    "welcome_message": string,             -- Message shown when session starts
    "goodbye_message": string,             -- Message shown when session ends
    "session_timeout_minutes": number,     -- Session timeout for web (default: 30)
    "default_language": string,            -- Default language code (e.g., "en", "hi")
    "system_prompt_override": string|null  -- Custom system prompt for AI (optional)
}

Example:
{
    "ai_agent": {
        "enabled": true,
        "activation_keywords": ["Hi BBB", "Hello BBB", "hi bbb", "hello bbb"],
        "exit_keywords": ["Bye", "Exit", "bye", "exit"],
        "welcome_message": "Namaste! Welcome to BBB. How can I help you find businesses?",
        "goodbye_message": "Thank you! Say Hi BBB anytime to start again.",
        "session_timeout_minutes": 30,
        "default_language": "en",
        "system_prompt_override": null
    }
}
*/

-- ============================================
-- 2. HELPER FUNCTION: Get AI Agent Config
-- Returns ai_agent config with defaults
-- ============================================

CREATE OR REPLACE FUNCTION get_ai_agent_config(p_group_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_settings JSONB;
    v_ai_config JSONB;
    v_group_name TEXT;
BEGIN
    -- Get group settings
    SELECT settings, group_name INTO v_settings, v_group_name
    FROM public.t_business_groups
    WHERE id = p_group_id;

    IF NOT FOUND THEN
        RETURN NULL;
    END IF;

    -- Extract ai_agent config or empty object
    v_ai_config := COALESCE(v_settings->'ai_agent', '{}'::JSONB);

    -- Return config with defaults merged
    RETURN jsonb_build_object(
        'enabled', COALESCE((v_ai_config->>'enabled')::BOOLEAN, FALSE),
        'activation_keywords', COALESCE(
            v_ai_config->'activation_keywords',
            jsonb_build_array('Hi ' || v_group_name, 'Hello ' || v_group_name)
        ),
        'exit_keywords', COALESCE(
            v_ai_config->'exit_keywords',
            '["Bye", "Exit", "bye", "exit"]'::JSONB
        ),
        'welcome_message', COALESCE(
            v_ai_config->>'welcome_message',
            'Welcome to ' || v_group_name || '! How can I help you?'
        ),
        'goodbye_message', COALESCE(
            v_ai_config->>'goodbye_message',
            'Thank you for using ' || v_group_name || '! Say Hi ' || v_group_name || ' anytime.'
        ),
        'session_timeout_minutes', COALESCE(
            (v_ai_config->>'session_timeout_minutes')::INTEGER,
            30
        ),
        'default_language', COALESCE(
            v_ai_config->>'default_language',
            'en'
        ),
        'system_prompt_override', v_ai_config->>'system_prompt_override'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 3. HELPER FUNCTION: Check if AI Agent Enabled
-- Quick check without loading full config
-- ============================================

CREATE OR REPLACE FUNCTION is_ai_agent_enabled(p_group_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN COALESCE(
        (
            SELECT (settings->'ai_agent'->>'enabled')::BOOLEAN
            FROM public.t_business_groups
            WHERE id = p_group_id
        ),
        FALSE
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 4. GRANTS
-- ============================================

GRANT EXECUTE ON FUNCTION get_ai_agent_config TO authenticated;
GRANT EXECUTE ON FUNCTION get_ai_agent_config TO service_role;

GRANT EXECUTE ON FUNCTION is_ai_agent_enabled TO authenticated;
GRANT EXECUTE ON FUNCTION is_ai_agent_enabled TO service_role;

-- ============================================
-- 5. COMMENTS
-- ============================================

COMMENT ON FUNCTION get_ai_agent_config IS 'Returns AI agent configuration for a group with defaults applied';
COMMENT ON FUNCTION is_ai_agent_enabled IS 'Quick check if AI agent is enabled for a group';
