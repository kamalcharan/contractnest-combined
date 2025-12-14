-- ============================================
-- GROUP ACTIVATION DETECTION RPC
-- Detects "Hi BBB" / "Bye" keywords and returns matching group
-- ============================================

-- ============================================
-- 1. MAIN FUNCTION: detect_group_activation
-- Checks if message matches any group's activation/exit keywords
-- ============================================

CREATE OR REPLACE FUNCTION detect_group_activation(p_message VARCHAR)
RETURNS TABLE (
    group_id UUID,
    group_name VARCHAR,
    group_code VARCHAR,
    group_type VARCHAR,
    is_activation BOOLEAN,
    is_exit BOOLEAN,
    ai_config JSONB
) AS $$
DECLARE
    v_message_lower VARCHAR;
    v_message_trimmed VARCHAR;
BEGIN
    -- Normalize message: lowercase and trim
    v_message_trimmed := TRIM(p_message);
    v_message_lower := LOWER(v_message_trimmed);

    -- ============================================
    -- Check for ACTIVATION keywords
    -- ============================================
    RETURN QUERY
    SELECT
        bg.id AS group_id,
        bg.group_name::VARCHAR,
        bg.group_name::VARCHAR AS group_code,  -- Using group_name as code
        bg.group_type::VARCHAR,
        true AS is_activation,
        false AS is_exit,
        get_ai_agent_config(bg.id) AS ai_config
    FROM public.t_business_groups bg
    WHERE
        -- AI agent must be enabled
        (bg.settings->'ai_agent'->>'enabled')::BOOLEAN = true
        -- Check activation keywords (case-insensitive)
        AND EXISTS (
            SELECT 1
            FROM jsonb_array_elements_text(bg.settings->'ai_agent'->'activation_keywords') kw
            WHERE LOWER(kw) = v_message_lower
        )
    LIMIT 1;

    -- If activation found, return
    IF FOUND THEN
        RETURN;
    END IF;

    -- ============================================
    -- Check for EXIT keywords (across all AI-enabled groups)
    -- ============================================
    RETURN QUERY
    SELECT
        NULL::UUID AS group_id,
        NULL::VARCHAR AS group_name,
        NULL::VARCHAR AS group_code,
        NULL::VARCHAR AS group_type,
        false AS is_activation,
        true AS is_exit,
        NULL::JSONB AS ai_config
    FROM public.t_business_groups bg
    WHERE
        (bg.settings->'ai_agent'->>'enabled')::BOOLEAN = true
        AND EXISTS (
            SELECT 1
            FROM jsonb_array_elements_text(bg.settings->'ai_agent'->'exit_keywords') kw
            WHERE LOWER(kw) = v_message_lower
        )
    LIMIT 1;

    -- Note: If neither activation nor exit found, returns empty result set
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 2. HELPER FUNCTION: Get Available Groups for Chat
-- Returns all AI-enabled groups with their activation keywords
-- ============================================

CREATE OR REPLACE FUNCTION get_ai_enabled_groups()
RETURNS TABLE (
    group_id UUID,
    group_name VARCHAR,
    group_type VARCHAR,
    activation_keywords JSONB,
    welcome_message VARCHAR,
    description TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        bg.id AS group_id,
        bg.group_name::VARCHAR,
        bg.group_type::VARCHAR,
        bg.settings->'ai_agent'->'activation_keywords' AS activation_keywords,
        (bg.settings->'ai_agent'->>'welcome_message')::VARCHAR AS welcome_message,
        bg.description
    FROM public.t_business_groups bg
    WHERE
        bg.is_active = true
        AND (bg.settings->'ai_agent'->>'enabled')::BOOLEAN = true
    ORDER BY bg.group_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 3. HELPER FUNCTION: Check if Message is Exit Command
-- Quick check without full detection
-- ============================================

CREATE OR REPLACE FUNCTION is_exit_command(p_message VARCHAR)
RETURNS BOOLEAN AS $$
DECLARE
    v_message_lower VARCHAR;
BEGIN
    v_message_lower := LOWER(TRIM(p_message));

    -- Check common exit keywords
    IF v_message_lower IN ('bye', 'exit', 'quit', 'end', 'stop', 'goodbye') THEN
        RETURN true;
    END IF;

    -- Check against all configured exit keywords
    RETURN EXISTS (
        SELECT 1
        FROM public.t_business_groups bg,
             jsonb_array_elements_text(bg.settings->'ai_agent'->'exit_keywords') kw
        WHERE
            (bg.settings->'ai_agent'->>'enabled')::BOOLEAN = true
            AND LOWER(kw) = v_message_lower
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 4. GRANTS
-- ============================================

GRANT EXECUTE ON FUNCTION detect_group_activation TO authenticated;
GRANT EXECUTE ON FUNCTION detect_group_activation TO service_role;

GRANT EXECUTE ON FUNCTION get_ai_enabled_groups TO authenticated;
GRANT EXECUTE ON FUNCTION get_ai_enabled_groups TO service_role;

GRANT EXECUTE ON FUNCTION is_exit_command TO authenticated;
GRANT EXECUTE ON FUNCTION is_exit_command TO service_role;

-- ============================================
-- 5. COMMENTS
-- ============================================

COMMENT ON FUNCTION detect_group_activation IS 'Detects if message is an activation keyword (Hi BBB) or exit keyword (Bye). Returns matching group with AI config.';
COMMENT ON FUNCTION get_ai_enabled_groups IS 'Returns all groups with AI agent enabled, including their activation keywords.';
COMMENT ON FUNCTION is_exit_command IS 'Quick check if a message is an exit command (Bye, Exit, etc.)';

-- ============================================
-- 6. VERIFICATION QUERIES
-- ============================================

/*
-- Test activation detection:

SELECT * FROM detect_group_activation('Hi BBB');
-- Should return: is_activation=true, group_name='BBB'

SELECT * FROM detect_group_activation('hello bbb');
-- Should return: is_activation=true (case-insensitive)

SELECT * FROM detect_group_activation('Bye');
-- Should return: is_exit=true, group_id=NULL

SELECT * FROM detect_group_activation('random message');
-- Should return: empty result set

-- List all AI-enabled groups:
SELECT * FROM get_ai_enabled_groups();

-- Quick exit check:
SELECT is_exit_command('bye');  -- true
SELECT is_exit_command('hello'); -- false
*/
