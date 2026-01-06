-- ============================================
-- PHASE 1: INTENT DEFINITIONS & RBAC FOUNDATION
-- Creates master intent catalog and RBAC functions
-- ============================================

-- ============================================
-- 1. CREATE t_intent_definitions TABLE
-- Master catalog of all search intents
-- ============================================

CREATE TABLE IF NOT EXISTS t_intent_definitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Identity
    intent_code VARCHAR(50) UNIQUE NOT NULL,
    intent_name VARCHAR(100) NOT NULL,
    description TEXT,

    -- UI Defaults (can be overridden at group level)
    default_label VARCHAR(100),
    default_icon VARCHAR(50),
    default_prompt TEXT,

    -- Behavior
    intent_type VARCHAR(50) NOT NULL,              -- 'search', 'list', 'filter', 'action', 'info'
    requires_ai BOOLEAN DEFAULT FALSE,
    cacheable BOOLEAN DEFAULT TRUE,

    -- Default RBAC (can be overridden at group level)
    default_roles VARCHAR(50)[] DEFAULT ARRAY['admin', 'member'],
    default_channels VARCHAR(50)[] DEFAULT ARRAY['web', 'mobile', 'whatsapp', 'api'],
    default_scopes VARCHAR(50)[] DEFAULT ARRAY['tenant', 'group'],
    default_max_results INT DEFAULT 10,

    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    is_system BOOLEAN DEFAULT FALSE,              -- System intents cannot be deleted

    -- Metadata
    config JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_intent_definitions_code ON t_intent_definitions(intent_code);
CREATE INDEX IF NOT EXISTS idx_intent_definitions_type ON t_intent_definitions(intent_type);
CREATE INDEX IF NOT EXISTS idx_intent_definitions_active ON t_intent_definitions(is_active);

-- Comments
COMMENT ON TABLE t_intent_definitions IS 'Master catalog of all search intents with default RBAC settings';
COMMENT ON COLUMN t_intent_definitions.intent_code IS 'Unique identifier for the intent (e.g., search_offering)';
COMMENT ON COLUMN t_intent_definitions.intent_type IS 'Type: search, list, filter, action, info';
COMMENT ON COLUMN t_intent_definitions.default_roles IS 'Default roles allowed to use this intent';
COMMENT ON COLUMN t_intent_definitions.default_channels IS 'Default channels where this intent is available';
COMMENT ON COLUMN t_intent_definitions.default_scopes IS 'Default search scopes allowed (tenant, group, product)';

-- ============================================
-- 2. SEED SYSTEM INTENTS
-- Pre-populate with standard intents
-- ============================================

INSERT INTO t_intent_definitions (
    intent_code, intent_name, description, intent_type,
    default_label, default_icon, default_prompt,
    requires_ai, cacheable, is_system,
    default_roles, default_channels, default_scopes, default_max_results
) VALUES

-- Search intents (AI-powered)
(
    'search_offering',
    'Search by Offering',
    'Semantic search by product or service offering',
    'search',
    'Who is into?',
    'search',
    'What product or service are you looking for?',
    TRUE, TRUE, TRUE,
    ARRAY['admin', 'member', 'guest'],
    ARRAY['web', 'mobile', 'whatsapp', 'chatbot'],
    ARRAY['group', 'tenant', 'product'],
    10
),
(
    'search_segment',
    'Search by Segment',
    'Search members by industry segment or category',
    'search',
    'Find by segment',
    'category',
    'Which industry segment?',
    TRUE, TRUE, TRUE,
    ARRAY['admin', 'member'],
    ARRAY['web', 'mobile', 'whatsapp', 'chatbot'],
    ARRAY['group', 'tenant'],
    10
),
(
    'member_lookup',
    'Member Lookup',
    'Find member by name or company',
    'search',
    'Member lookup',
    'person',
    'Enter member or company name:',
    TRUE, TRUE, TRUE,
    ARRAY['admin', 'member'],
    ARRAY['web', 'mobile', 'whatsapp', 'chatbot'],
    ARRAY['group', 'tenant'],
    10
),

-- List/Filter intents (non-AI, traditional queries)
(
    'list_all',
    'List All',
    'Paginated list of all members/results',
    'list',
    'Show all',
    'list',
    NULL,
    FALSE, FALSE, TRUE,
    ARRAY['admin', 'member'],
    ARRAY['web', 'mobile', 'api'],
    ARRAY['group', 'tenant'],
    20
),
(
    'filter',
    'Filter Results',
    'Apply explicit filters to results',
    'filter',
    'Filter',
    'filter',
    NULL,
    FALSE, TRUE, TRUE,
    ARRAY['admin', 'member'],
    ARRAY['web', 'mobile', 'api'],
    ARRAY['group', 'tenant'],
    20
),

-- Info intents
(
    'about_group',
    'About Group',
    'Display information about the group',
    'info',
    'About this group',
    'info',
    NULL,
    FALSE, TRUE, TRUE,
    ARRAY['admin', 'member', 'guest'],
    ARRAY['web', 'mobile', 'whatsapp', 'chatbot'],
    ARRAY['group'],
    1
),

-- Action intents (admin only by default)
(
    'export',
    'Export Data',
    'Export search results to CSV/Excel',
    'action',
    'Export',
    'download',
    NULL,
    FALSE, FALSE, TRUE,
    ARRAY['admin'],
    ARRAY['web', 'api'],
    ARRAY['group', 'tenant'],
    1000
),
(
    'analytics',
    'View Analytics',
    'View search statistics and analytics',
    'action',
    'Analytics',
    'chart',
    NULL,
    FALSE, FALSE, TRUE,
    ARRAY['admin'],
    ARRAY['web'],
    ARRAY['group', 'tenant', 'product'],
    1
)

ON CONFLICT (intent_code) DO UPDATE SET
    intent_name = EXCLUDED.intent_name,
    description = EXCLUDED.description,
    default_label = EXCLUDED.default_label,
    default_icon = EXCLUDED.default_icon,
    default_prompt = EXCLUDED.default_prompt,
    requires_ai = EXCLUDED.requires_ai,
    cacheable = EXCLUDED.cacheable,
    default_roles = EXCLUDED.default_roles,
    default_channels = EXCLUDED.default_channels,
    default_scopes = EXCLUDED.default_scopes,
    default_max_results = EXCLUDED.default_max_results,
    updated_at = NOW();

-- ============================================
-- 3. CREATE get_resolved_intents FUNCTION
-- Resolves intents for a group/user/channel with RBAC
-- ============================================

CREATE OR REPLACE FUNCTION get_resolved_intents(
    p_group_id UUID,
    p_user_role VARCHAR DEFAULT 'member',
    p_channel VARCHAR DEFAULT 'web'
)
RETURNS JSONB AS $$
DECLARE
    v_group_intents JSONB;
    v_resolved JSONB := '[]'::JSONB;
    v_intent_override JSONB;
    v_master RECORD;
    v_allowed_roles VARCHAR[];
    v_allowed_channels VARCHAR[];
    v_intent_code VARCHAR;
BEGIN
    -- Get group's intent_buttons from settings.chat
    SELECT COALESCE(settings->'chat'->'intent_buttons', '[]'::JSONB)
    INTO v_group_intents
    FROM t_business_groups
    WHERE id = p_group_id;

    -- If no group intents defined, use all active system intents filtered by RBAC
    IF v_group_intents IS NULL OR v_group_intents = '[]'::JSONB THEN
        SELECT COALESCE(jsonb_agg(
            jsonb_build_object(
                'intent_code', intent_code,
                'label', default_label,
                'icon', default_icon,
                'prompt', default_prompt,
                'intent_type', intent_type,
                'requires_ai', requires_ai,
                'cacheable', cacheable,
                'max_results', default_max_results,
                'scopes', default_scopes
            )
        ), '[]'::JSONB) INTO v_resolved
        FROM t_intent_definitions
        WHERE is_active = TRUE
          AND p_user_role = ANY(default_roles)
          AND p_channel = ANY(default_channels);

        RETURN v_resolved;
    END IF;

    -- Process each group intent override
    FOR v_intent_override IN SELECT * FROM jsonb_array_elements(v_group_intents)
    LOOP
        -- Get intent_code (support both 'intent_code' and legacy 'id' field)
        v_intent_code := COALESCE(
            v_intent_override->>'intent_code',
            v_intent_override->>'id'
        );

        -- Skip if no intent code
        IF v_intent_code IS NULL THEN
            CONTINUE;
        END IF;

        -- Skip if explicitly disabled
        IF (v_intent_override->>'enabled')::BOOLEAN = FALSE THEN
            CONTINUE;
        END IF;

        -- Get master definition
        SELECT * INTO v_master
        FROM t_intent_definitions
        WHERE intent_code = v_intent_code
          AND is_active = TRUE;

        -- Skip if intent not found in master
        IF NOT FOUND THEN
            CONTINUE;
        END IF;

        -- Determine allowed roles (group override or master default)
        IF v_intent_override ? 'roles' AND jsonb_array_length(v_intent_override->'roles') > 0 THEN
            SELECT ARRAY(SELECT jsonb_array_elements_text(v_intent_override->'roles'))
            INTO v_allowed_roles;
        ELSE
            v_allowed_roles := v_master.default_roles;
        END IF;

        -- Check role permission
        IF NOT (p_user_role = ANY(v_allowed_roles)) THEN
            CONTINUE;
        END IF;

        -- Determine allowed channels (group override or master default)
        IF v_intent_override ? 'channels' AND jsonb_array_length(v_intent_override->'channels') > 0 THEN
            SELECT ARRAY(SELECT jsonb_array_elements_text(v_intent_override->'channels'))
            INTO v_allowed_channels;
        ELSE
            v_allowed_channels := v_master.default_channels;
        END IF;

        -- Check channel permission
        IF NOT (p_channel = ANY(v_allowed_channels)) THEN
            CONTINUE;
        END IF;

        -- Build resolved intent with merged values
        v_resolved := v_resolved || jsonb_build_object(
            'intent_code', v_master.intent_code,
            'label', COALESCE(v_intent_override->>'label', v_master.default_label),
            'icon', COALESCE(v_intent_override->>'icon', v_master.default_icon),
            'prompt', COALESCE(v_intent_override->>'prompt', v_master.default_prompt),
            'intent_type', v_master.intent_type,
            'requires_ai', v_master.requires_ai,
            'cacheable', v_master.cacheable,
            'max_results', COALESCE(
                (v_intent_override->>'max_results')::INT,
                v_master.default_max_results
            ),
            'scopes', COALESCE(
                v_intent_override->'scopes',
                to_jsonb(v_master.default_scopes)
            )
        );
    END LOOP;

    RETURN v_resolved;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_resolved_intents IS 'Resolves intents for a group with RBAC filtering based on user role and channel';

-- ============================================
-- 4. CREATE check_intent_permission FUNCTION
-- Validates if user can use specific intent
-- ============================================

CREATE OR REPLACE FUNCTION check_intent_permission(
    p_group_id UUID,
    p_intent_code VARCHAR,
    p_user_role VARCHAR,
    p_channel VARCHAR,
    p_scope VARCHAR DEFAULT 'group'
)
RETURNS TABLE (
    is_allowed BOOLEAN,
    max_results INT,
    denial_reason TEXT
) AS $$
DECLARE
    v_master RECORD;
    v_group_override JSONB;
    v_allowed_roles VARCHAR[];
    v_allowed_channels VARCHAR[];
    v_allowed_scopes VARCHAR[];
BEGIN
    -- Get master definition
    SELECT * INTO v_master
    FROM t_intent_definitions
    WHERE intent_code = p_intent_code AND is_active = TRUE;

    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, 0, 'Intent not found or inactive'::TEXT;
        RETURN;
    END IF;

    -- Get group override if exists
    SELECT intent INTO v_group_override
    FROM t_business_groups bg,
         jsonb_array_elements(COALESCE(bg.settings->'chat'->'intent_buttons', '[]'::JSONB)) AS intent
    WHERE bg.id = p_group_id
      AND (intent->>'intent_code' = p_intent_code OR intent->>'id' = p_intent_code)
    LIMIT 1;

    -- Check if disabled at group level
    IF v_group_override IS NOT NULL AND (v_group_override->>'enabled')::BOOLEAN = FALSE THEN
        RETURN QUERY SELECT FALSE, 0, 'Intent disabled for this group'::TEXT;
        RETURN;
    END IF;

    -- Determine allowed roles
    IF v_group_override IS NOT NULL AND v_group_override ? 'roles' AND jsonb_array_length(v_group_override->'roles') > 0 THEN
        SELECT ARRAY(SELECT jsonb_array_elements_text(v_group_override->'roles'))
        INTO v_allowed_roles;
    ELSE
        v_allowed_roles := v_master.default_roles;
    END IF;

    -- Check role
    IF NOT (p_user_role = ANY(v_allowed_roles)) THEN
        RETURN QUERY SELECT FALSE, 0, 'Role not permitted for this intent'::TEXT;
        RETURN;
    END IF;

    -- Determine allowed channels
    IF v_group_override IS NOT NULL AND v_group_override ? 'channels' AND jsonb_array_length(v_group_override->'channels') > 0 THEN
        SELECT ARRAY(SELECT jsonb_array_elements_text(v_group_override->'channels'))
        INTO v_allowed_channels;
    ELSE
        v_allowed_channels := v_master.default_channels;
    END IF;

    -- Check channel
    IF NOT (p_channel = ANY(v_allowed_channels)) THEN
        RETURN QUERY SELECT FALSE, 0, 'Channel not permitted for this intent'::TEXT;
        RETURN;
    END IF;

    -- Determine allowed scopes
    IF v_group_override IS NOT NULL AND v_group_override ? 'scopes' AND jsonb_array_length(v_group_override->'scopes') > 0 THEN
        SELECT ARRAY(SELECT jsonb_array_elements_text(v_group_override->'scopes'))
        INTO v_allowed_scopes;
    ELSE
        v_allowed_scopes := v_master.default_scopes;
    END IF;

    -- Check scope
    IF NOT (p_scope = ANY(v_allowed_scopes)) THEN
        RETURN QUERY SELECT FALSE, 0, 'Scope not permitted for this intent'::TEXT;
        RETURN;
    END IF;

    -- All checks passed
    RETURN QUERY SELECT
        TRUE,
        COALESCE((v_group_override->>'max_results')::INT, v_master.default_max_results),
        NULL::TEXT;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION check_intent_permission IS 'Checks if a user role can use an intent on a specific channel and scope';

-- ============================================
-- 5. GRANT PERMISSIONS
-- ============================================

GRANT SELECT ON t_intent_definitions TO authenticated;
GRANT ALL ON t_intent_definitions TO service_role;

GRANT EXECUTE ON FUNCTION get_resolved_intents TO authenticated;
GRANT EXECUTE ON FUNCTION get_resolved_intents TO service_role;

GRANT EXECUTE ON FUNCTION check_intent_permission TO authenticated;
GRANT EXECUTE ON FUNCTION check_intent_permission TO service_role;

-- ============================================
-- 6. VERIFICATION QUERIES (Run after migration)
-- ============================================

-- Verify table created with data
-- SELECT intent_code, intent_type, default_roles, default_channels FROM t_intent_definitions;

-- Test get_resolved_intents (replace with actual group_id)
-- SELECT get_resolved_intents('YOUR_GROUP_ID'::UUID, 'member', 'whatsapp');

-- Test check_intent_permission
-- SELECT * FROM check_intent_permission('YOUR_GROUP_ID'::UUID, 'search_offering', 'member', 'whatsapp', 'group');
