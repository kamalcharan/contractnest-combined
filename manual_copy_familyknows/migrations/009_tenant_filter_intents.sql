-- ============================================
-- TENANT FILTER INTENTS
-- Adds filter intents for Tenant Profiles page
-- ============================================

-- ============================================
-- 1. ADD NEW FILTER INTENTS
-- ============================================

INSERT INTO t_intent_definitions (
    intent_code, intent_name, description, intent_type,
    default_label, default_icon, default_prompt,
    requires_ai, cacheable, is_system,
    default_roles, default_channels, default_scopes, default_max_results
) VALUES

-- Filter by Group
(
    'filter_by_group',
    'Filter by Group',
    'Filter tenants by business group membership',
    'filter',
    'By Group',
    'users',
    'Which group would you like to filter by?',
    TRUE, TRUE, TRUE,
    ARRAY['admin', 'member'],
    ARRAY['web', 'mobile', 'api'],
    ARRAY['tenant', 'group'],
    20
),

-- Filter by Industry
(
    'filter_by_industry',
    'Filter by Industry',
    'Filter tenants by industry segment',
    'filter',
    'By Industry',
    'building',
    'Which industry are you looking for?',
    TRUE, TRUE, TRUE,
    ARRAY['admin', 'member'],
    ARRAY['web', 'mobile', 'api'],
    ARRAY['tenant', 'group'],
    20
),

-- Filter by Profile Type (Buyer/Seller)
(
    'filter_by_profile_type',
    'Filter by Profile Type',
    'Filter tenants by buyer or seller profile',
    'filter',
    'Buyers/Sellers',
    'user-check',
    'Are you looking for buyers or sellers?',
    TRUE, TRUE, TRUE,
    ARRAY['admin', 'member'],
    ARRAY['web', 'mobile', 'api'],
    ARRAY['tenant', 'group'],
    20
),

-- Tenant Stats (for dashboard cards)
(
    'tenant_stats',
    'Tenant Statistics',
    'Get aggregated statistics for tenant profiles',
    'info',
    'Statistics',
    'bar-chart',
    NULL,
    FALSE, TRUE, TRUE,
    ARRAY['admin'],
    ARRAY['web', 'api'],
    ARRAY['tenant', 'group'],
    1
),

-- All Tenants
(
    'list_all_tenants',
    'List All Tenants',
    'Show all tenant profiles',
    'list',
    'All Tenants',
    'users',
    'Showing all tenant profiles',
    FALSE, FALSE, TRUE,
    ARRAY['admin'],
    ARRAY['web', 'api'],
    ARRAY['tenant', 'group'],
    50
),

-- Search Buyers
(
    'search_buyers',
    'Search Buyers',
    'Find buyer profiles',
    'search',
    'Find Buyers',
    'shopping-cart',
    'Show all buyer profiles',
    TRUE, TRUE, TRUE,
    ARRAY['admin', 'member'],
    ARRAY['web', 'mobile', 'whatsapp', 'api'],
    ARRAY['tenant', 'group'],
    20
),

-- Search Sellers
(
    'search_sellers',
    'Search Sellers',
    'Find seller profiles',
    'search',
    'Find Sellers',
    'store',
    'Show all seller profiles',
    TRUE, TRUE, TRUE,
    ARRAY['admin', 'member'],
    ARRAY['web', 'mobile', 'whatsapp', 'api'],
    ARRAY['tenant', 'group'],
    20
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
-- 2. CREATE get_tenant_stats FUNCTION
-- Returns aggregated stats for tenant dashboard
-- ============================================

CREATE OR REPLACE FUNCTION get_tenant_stats(
    p_group_id UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_stats JSONB;
BEGIN
    SELECT jsonb_build_object(
        'total_tenants', (
            SELECT COUNT(DISTINCT m.tenant_id)
            FROM t_group_memberships m
            WHERE (p_group_id IS NULL OR m.group_id = p_group_id)
              AND m.status = 'active'
        ),
        'by_group', (
            SELECT COALESCE(jsonb_agg(
                jsonb_build_object(
                    'group_id', g.id,
                    'group_name', g.name,
                    'count', member_count.cnt
                )
            ), '[]'::jsonb)
            FROM t_business_groups g
            LEFT JOIN (
                SELECT group_id, COUNT(DISTINCT tenant_id) as cnt
                FROM t_group_memberships
                WHERE status = 'active'
                GROUP BY group_id
            ) member_count ON member_count.group_id = g.id
            WHERE g.is_active = TRUE
              AND (p_group_id IS NULL OR g.id = p_group_id)
        ),
        'by_industry', (
            SELECT COALESCE(jsonb_agg(
                jsonb_build_object(
                    'industry_id', tp.industry_id,
                    'industry_name', COALESCE(tp.industry_id, 'Unknown'),
                    'count', COUNT(DISTINCT m.tenant_id)
                )
            ), '[]'::jsonb)
            FROM t_group_memberships m
            JOIN t_tenant_profiles tp ON tp.tenant_id = m.tenant_id
            WHERE m.status = 'active'
              AND (p_group_id IS NULL OR m.group_id = p_group_id)
            GROUP BY tp.industry_id
        ),
        'by_profile_type', (
            SELECT jsonb_build_object(
                'buyers', (
                    SELECT COUNT(DISTINCT m.tenant_id)
                    FROM t_group_memberships m
                    JOIN t_tenant_profiles tp ON tp.tenant_id = m.tenant_id
                    WHERE m.status = 'active'
                      AND (p_group_id IS NULL OR m.group_id = p_group_id)
                      AND tp.profile_type = 'buyer'
                ),
                'sellers', (
                    SELECT COUNT(DISTINCT m.tenant_id)
                    FROM t_group_memberships m
                    JOIN t_tenant_profiles tp ON tp.tenant_id = m.tenant_id
                    WHERE m.status = 'active'
                      AND (p_group_id IS NULL OR m.group_id = p_group_id)
                      AND tp.profile_type = 'seller'
                ),
                'both', (
                    SELECT COUNT(DISTINCT m.tenant_id)
                    FROM t_group_memberships m
                    JOIN t_tenant_profiles tp ON tp.tenant_id = m.tenant_id
                    WHERE m.status = 'active'
                      AND (p_group_id IS NULL OR m.group_id = p_group_id)
                      AND tp.profile_type = 'both'
                )
            )
        )
    ) INTO v_stats;

    RETURN v_stats;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_tenant_stats IS 'Returns aggregated statistics for tenant profiles dashboard';

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_tenant_stats TO authenticated;
GRANT EXECUTE ON FUNCTION get_tenant_stats TO service_role;

-- ============================================
-- 3. VERIFICATION QUERIES
-- ============================================

-- Verify new intents added
-- SELECT intent_code, intent_name, intent_type FROM t_intent_definitions WHERE intent_code LIKE 'filter_%' OR intent_code LIKE '%tenant%' OR intent_code LIKE 'search_buyer%' OR intent_code LIKE 'search_seller%';

-- Test get_tenant_stats
-- SELECT get_tenant_stats();
-- SELECT get_tenant_stats('YOUR_GROUP_ID'::UUID);
