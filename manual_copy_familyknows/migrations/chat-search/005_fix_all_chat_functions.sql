-- ============================================
-- FIX ALL CHAT FUNCTIONS
-- Run this if you're getting 500 errors
-- This creates all functions if they don't exist
-- ============================================

-- 1. Ensure t_system_config exists
CREATE TABLE IF NOT EXISTS public.t_system_config (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Insert VaNi config if not exists
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
ON CONFLICT (key) DO NOTHING;

-- 3. get_group_chat_config function
CREATE OR REPLACE FUNCTION get_group_chat_config(p_group_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_settings JSONB;
    v_chat_config JSONB;
    v_group_name TEXT;
BEGIN
    SELECT settings, group_name INTO v_settings, v_group_name
    FROM public.t_business_groups
    WHERE id = p_group_id;

    IF NOT FOUND THEN
        RETURN NULL;
    END IF;

    v_chat_config := COALESCE(v_settings->'chat', '{}'::JSONB);

    RETURN jsonb_build_object(
        'trigger_phrase', COALESCE(
            v_chat_config->>'trigger_phrase',
            v_settings->'whatsapp'->>'trigger_phrase',
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
            5
        )
    );
END;
$$ LANGUAGE plpgsql;

-- 4. find_group_by_trigger function
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
          LOWER(bg.settings->'chat'->>'trigger_phrase') = LOWER(p_trigger_phrase)
          OR LOWER(bg.settings->'whatsapp'->>'trigger_phrase') = LOWER(p_trigger_phrase)
          OR LOWER('Hi ' || bg.group_name) = LOWER(p_trigger_phrase)
      )
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- 5. get_available_groups_for_chat function
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

-- 6. get_vani_intro_message function
CREATE OR REPLACE FUNCTION get_vani_intro_message()
RETURNS JSONB AS $$
DECLARE
    v_config JSONB;
    v_groups JSONB;
BEGIN
    SELECT value INTO v_config
    FROM public.t_system_config
    WHERE key = 'vani_chat_intro';

    -- Default if config not found
    IF v_config IS NULL THEN
        v_config := '{
            "greeting": "Hi, I''m VaNi, your AI assistant!",
            "instruction": "To start a conversation, type the group code:",
            "exit_instruction": "Type ''Bye'' anytime to end the conversation."
        }'::JSONB;
    END IF;

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

-- 7. Session functions (from 002)
CREATE OR REPLACE FUNCTION get_or_create_session(
    p_user_id UUID,
    p_tenant_id UUID,
    p_channel TEXT DEFAULT 'web'
)
RETURNS public.t_chat_sessions AS $$
DECLARE
    v_session public.t_chat_sessions;
BEGIN
    SELECT * INTO v_session
    FROM public.t_chat_sessions
    WHERE (user_id = p_user_id OR (user_id IS NULL AND p_user_id IS NULL))
      AND (tenant_id = p_tenant_id OR (tenant_id IS NULL AND p_tenant_id IS NULL))
      AND channel = p_channel
      AND expires_at > NOW()
    ORDER BY created_at DESC
    LIMIT 1;

    IF FOUND THEN
        UPDATE public.t_chat_sessions
        SET
            last_activity_at = NOW(),
            updated_at = NOW(),
            expires_at = NOW() + INTERVAL '30 minutes'
        WHERE id = v_session.id
        RETURNING * INTO v_session;

        RETURN v_session;
    ELSE
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
        expires_at = NOW()
    WHERE id = p_session_id;
END;
$$ LANGUAGE plpgsql;

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

-- 8. Grant permissions
GRANT SELECT ON public.t_system_config TO authenticated;
GRANT ALL ON public.t_system_config TO service_role;

-- 9. Test: Check if BBB group exists and what trigger it needs
DO $$
DECLARE
    v_group RECORD;
BEGIN
    RAISE NOTICE '=== CHECKING GROUPS ===';

    FOR v_group IN
        SELECT id, group_name,
               COALESCE(settings->'chat'->>'trigger_phrase',
                       settings->'whatsapp'->>'trigger_phrase',
                       'Hi ' || group_name) as trigger_phrase
        FROM t_business_groups WHERE is_active = TRUE
    LOOP
        RAISE NOTICE 'Group: %, Trigger: %', v_group.group_name, v_group.trigger_phrase;
    END LOOP;
END $$;

-- Done!
SELECT 'All chat functions created successfully!' as status;
