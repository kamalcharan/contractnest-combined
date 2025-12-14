-- ============================================
-- SEED: BBB AI AGENT CONFIGURATION
-- Adds ai_agent config to BBB group settings
-- ============================================

-- ============================================
-- 1. ADD AI AGENT CONFIG TO BBB GROUP
-- ============================================

UPDATE public.t_business_groups
SET
    settings = COALESCE(settings, '{}'::jsonb) || jsonb_build_object(
        'ai_agent', jsonb_build_object(
            'enabled', true,
            'activation_keywords', jsonb_build_array(
                'Hi BBB',
                'Hello BBB',
                'hi bbb',
                'hello bbb',
                'HI BBB',
                'HELLO BBB',
                'Namaste BBB',
                'namaste bbb'
            ),
            'exit_keywords', jsonb_build_array(
                'Bye',
                'bye',
                'Exit',
                'exit',
                'Quit',
                'quit',
                'End',
                'end',
                'Bye BBB',
                'bye bbb'
            ),
            'welcome_message', 'Namaste! Welcome to BBB Business Network. I can help you find businesses, services, and connect with members. What are you looking for?',
            'goodbye_message', 'Thank you for using BBB! Say "Hi BBB" anytime to start again. Have a great day!',
            'session_timeout_minutes', 30,
            'default_language', 'en',
            'system_prompt_override', null
        )
    ),
    updated_at = NOW()
WHERE group_name = 'BBB';

-- ============================================
-- 2. VERIFICATION: Check BBB Config
-- ============================================

-- Verify the update
DO $$
DECLARE
    v_count INTEGER;
    v_enabled BOOLEAN;
BEGIN
    SELECT
        COUNT(*),
        (settings->'ai_agent'->>'enabled')::BOOLEAN
    INTO v_count, v_enabled
    FROM public.t_business_groups
    WHERE group_name = 'BBB';

    IF v_count = 0 THEN
        RAISE NOTICE '⚠️ WARNING: No group found with name "BBB". Please check group_name.';
    ELSIF v_enabled IS NULL OR v_enabled = false THEN
        RAISE NOTICE '⚠️ WARNING: AI agent not enabled for BBB group.';
    ELSE
        RAISE NOTICE '✅ SUCCESS: BBB group updated with AI agent config (enabled=true)';
    END IF;
END $$;

-- ============================================
-- 3. DISPLAY FINAL CONFIG
-- ============================================

SELECT
    id,
    group_name,
    group_type,
    settings->'ai_agent'->>'enabled' AS ai_enabled,
    settings->'ai_agent'->'activation_keywords' AS activation_keywords,
    settings->'ai_agent'->'exit_keywords' AS exit_keywords,
    settings->'ai_agent'->>'welcome_message' AS welcome_message,
    settings->'ai_agent'->>'session_timeout_minutes' AS timeout_minutes
FROM public.t_business_groups
WHERE group_name = 'BBB';

-- ============================================
-- 4. TEST: Verify detect_group_activation works
-- ============================================

SELECT 'Testing activation detection:' AS test;
SELECT * FROM detect_group_activation('Hi BBB');

SELECT 'Testing exit detection:' AS test;
SELECT * FROM detect_group_activation('Bye');

SELECT 'Testing AI-enabled groups:' AS test;
SELECT * FROM get_ai_enabled_groups();
