-- ============================================
-- ADD CHAT CONFIG TO GROUPS SETTINGS
-- Extends t_business_groups.settings JSONB
-- ============================================

-- ============================================
-- FUNCTION: Get chat config for a group
-- Returns chat settings with defaults
-- ============================================
CREATE OR REPLACE FUNCTION get_group_chat_config(p_group_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_settings JSONB;
    v_chat_config JSONB;
    v_group_name TEXT;
BEGIN
    -- Get group settings
    SELECT settings, group_name INTO v_settings, v_group_name
    FROM public.t_business_groups
    WHERE id = p_group_id;

    IF NOT FOUND THEN
        RETURN NULL;
    END IF;

    -- Extract chat config or use defaults
    v_chat_config := COALESCE(v_settings->'chat', '{}'::JSONB);

    -- Merge with defaults
    RETURN jsonb_build_object(
        'trigger_phrase', COALESCE(
            v_chat_config->>'trigger_phrase',
            v_settings->'whatsapp'->>'trigger_phrase',  -- Fallback to whatsapp trigger
            'Hi ' || v_group_name
        ),
        'exit_phrase', COALESCE(
            v_chat_config->>'exit_phrase',
            v_settings->'whatsapp'->>'exit_phrase',
            'Bye'
        ),
        'welcome_message', COALESCE(
            v_chat_config->>'welcome_message',
            'Welcome to ' || v_group_name || '! How can I help you today?'
        ),
        'goodbye_message', COALESCE(
            v_chat_config->>'goodbye_message',
            'Thank you for using ' || v_group_name || ' Directory! Have a great day!'
        ),
        'intent_buttons', COALESCE(
            v_chat_config->'intent_buttons',
            '[
                {"id": "search_offering", "label": "Who is into?", "icon": "search", "prompt": "What product or service are you looking for?"},
                {"id": "search_segment", "label": "Find by segment", "icon": "category", "prompt": "Which industry segment?"},
                {"id": "member_lookup", "label": "Member lookup", "icon": "person", "prompt": "Enter member or company name:"},
                {"id": "about_group", "label": "About this group", "icon": "info", "prompt": null}
            ]'::JSONB
        ),
        'bot_enabled', COALESCE(
            (v_chat_config->>'bot_enabled')::BOOLEAN,
            (v_settings->'whatsapp'->>'bot_enabled')::BOOLEAN,
            TRUE
        ),
        'max_results', COALESCE(
            (v_chat_config->>'max_results')::INT,
            (v_settings->'search_config'->>'max_results')::INT,
            5
        )
    );
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- FUNCTION: Find group by trigger phrase
-- Used when user types "Hi BBB"
-- ============================================
CREATE OR REPLACE FUNCTION find_group_by_trigger(p_trigger_phrase TEXT)
RETURNS TABLE (
    group_id UUID,
    group_name TEXT,
    group_type TEXT,
    chat_config JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        bg.id AS group_id,
        bg.group_name,
        bg.group_type,
        get_group_chat_config(bg.id) AS chat_config
    FROM public.t_business_groups bg
    WHERE bg.is_active = TRUE
      AND (
          -- Check chat.trigger_phrase
          LOWER(bg.settings->'chat'->>'trigger_phrase') = LOWER(p_trigger_phrase)
          -- Or whatsapp.trigger_phrase (fallback)
          OR LOWER(bg.settings->'whatsapp'->>'trigger_phrase') = LOWER(p_trigger_phrase)
          -- Or default pattern "Hi {group_name}"
          OR LOWER('Hi ' || bg.group_name) = LOWER(p_trigger_phrase)
      )
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- FUNCTION: Get all available groups with triggers
-- For the initial "Hi, I'm VaNi" message
-- ============================================
CREATE OR REPLACE FUNCTION get_available_groups_for_chat()
RETURNS TABLE (
    group_id UUID,
    group_name TEXT,
    trigger_phrase TEXT,
    description TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        bg.id AS group_id,
        bg.group_name,
        COALESCE(
            bg.settings->'chat'->>'trigger_phrase',
            bg.settings->'whatsapp'->>'trigger_phrase',
            'Hi ' || bg.group_name
        ) AS trigger_phrase,
        bg.description
    FROM public.t_business_groups bg
    WHERE bg.is_active = TRUE
      AND COALESCE((bg.settings->'chat'->>'bot_enabled')::BOOLEAN,
                   (bg.settings->'whatsapp'->>'bot_enabled')::BOOLEAN,
                   TRUE) = TRUE
    ORDER BY bg.group_name;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- SYSTEM CONFIG TABLE (for VaNi intro message)
-- ============================================
CREATE TABLE IF NOT EXISTS public.t_system_config (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert VaNi intro config
INSERT INTO public.t_system_config (key, value, description)
VALUES (
    'vani_chat_intro',
    '{
        "greeting": "Hi, I''m VaNi, your AI assistant!",
        "instruction": "To start a conversation, type the group code:",
        "exit_instruction": "Type ''Bye'' anytime to end the conversation.",
        "no_groups_message": "No groups are currently available for chat.",
        "error_message": "Sorry, I couldn''t understand that. Please try again.",
        "session_expired_message": "Your session has expired. Please start again with a group code."
    }'::JSONB,
    'VaNi chat introduction messages'
)
ON CONFLICT (key) DO UPDATE SET
    value = EXCLUDED.value,
    updated_at = NOW();

-- ============================================
-- FUNCTION: Get VaNi intro message with groups
-- ============================================
CREATE OR REPLACE FUNCTION get_vani_intro_message()
RETURNS JSONB AS $$
DECLARE
    v_config JSONB;
    v_groups JSONB;
BEGIN
    -- Get system config
    SELECT value INTO v_config
    FROM public.t_system_config
    WHERE key = 'vani_chat_intro';

    -- Get available groups
    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'group_id', g.group_id,
            'group_name', g.group_name,
            'trigger_phrase', g.trigger_phrase,
            'description', g.description
        )
    ), '[]'::JSONB) INTO v_groups
    FROM get_available_groups_for_chat() g;

    RETURN jsonb_build_object(
        'type', 'intro',
        'greeting', v_config->>'greeting',
        'instruction', v_config->>'instruction',
        'exit_instruction', v_config->>'exit_instruction',
        'available_groups', v_groups
    );
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT SELECT ON public.t_system_config TO authenticated;
GRANT ALL ON public.t_system_config TO service_role;

COMMENT ON TABLE public.t_system_config IS 'System-wide configuration including VaNi chat settings';
