-- ============================================
-- SCOPED SEARCH RPCs
-- Search and retrieve members within group scope
-- Uses: t_group_memberships, t_tenant_profiles, m_catalog_industries
-- ============================================

-- ============================================
-- 1. SCOPED MEMBER SEARCH (Vector Search)
-- Searches members using embeddings with group scope filter
-- ============================================

CREATE OR REPLACE FUNCTION scoped_member_search(
    p_query_text VARCHAR,
    p_query_embedding vector(1536),
    p_scope VARCHAR DEFAULT 'group',           -- 'group' or 'product'
    p_group_id UUID DEFAULT NULL,              -- Required if scope='group'
    p_limit INTEGER DEFAULT 10,
    p_similarity_threshold FLOAT DEFAULT 0.7
)
RETURNS TABLE (
    membership_id UUID,
    tenant_id UUID,
    group_id UUID,
    group_name VARCHAR,
    business_name VARCHAR,
    short_description TEXT,
    ai_enhanced_description TEXT,
    industry VARCHAR,
    city VARCHAR,
    contact_phone VARCHAR,
    contact_email VARCHAR,
    website_url VARCHAR,
    logo_url VARCHAR,
    approved_keywords TEXT[],
    similarity_score FLOAT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        gm.id AS membership_id,
        gm.tenant_id,
        gm.group_id,
        bg.group_name::VARCHAR,
        tp.business_name::VARCHAR,
        COALESCE(
            gm.profile_data->>'short_description',
            LEFT(gm.profile_data->>'ai_enhanced_description', 200)
        )::TEXT AS short_description,
        (gm.profile_data->>'ai_enhanced_description')::TEXT AS ai_enhanced_description,
        ci.industry_name::VARCHAR AS industry,
        tp.city::VARCHAR,
        COALESCE(
            gm.profile_data->>'mobile_number',
            tp.business_phone
        )::VARCHAR AS contact_phone,
        tp.business_email::VARCHAR AS contact_email,
        tp.website_url::VARCHAR,
        tp.logo_url::VARCHAR,
        ARRAY(
            SELECT jsonb_array_elements_text(
                COALESCE(gm.profile_data->'approved_keywords', '[]'::JSONB)
            )
        )::TEXT[] AS approved_keywords,
        (1 - (gm.embedding <=> p_query_embedding))::FLOAT AS similarity_score
    FROM public.t_group_memberships gm
    LEFT JOIN public.t_tenant_profiles tp ON tp.tenant_id = gm.tenant_id
    LEFT JOIN public.t_business_groups bg ON bg.id = gm.group_id
    LEFT JOIN public.m_catalog_industries ci ON ci.id::VARCHAR = tp.industry_id
    WHERE
        gm.status = 'active'
        AND gm.is_active = true
        AND gm.embedding IS NOT NULL
        -- Scope filtering
        AND CASE
            WHEN p_scope = 'product' THEN true
            WHEN p_scope = 'group' THEN gm.group_id = p_group_id
            ELSE gm.group_id = p_group_id  -- Default to group
        END
        -- Similarity threshold
        AND (1 - (gm.embedding <=> p_query_embedding)) >= p_similarity_threshold
    ORDER BY similarity_score DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 2. GET MEMBERS BY SCOPE
-- Lists members in a group (no vector search, just listing)
-- ============================================

CREATE OR REPLACE FUNCTION get_members_by_scope(
    p_scope VARCHAR DEFAULT 'group',
    p_group_id UUID DEFAULT NULL,
    p_industry_filter VARCHAR DEFAULT NULL,
    p_search_text VARCHAR DEFAULT NULL,
    p_limit INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    membership_id UUID,
    tenant_id UUID,
    group_id UUID,
    group_name VARCHAR,
    business_name VARCHAR,
    short_description TEXT,
    industry VARCHAR,
    city VARCHAR,
    contact_phone VARCHAR,
    contact_email VARCHAR,
    website_url VARCHAR,
    logo_url VARCHAR,
    member_number VARCHAR,
    total_count BIGINT
) AS $$
DECLARE
    v_total BIGINT;
BEGIN
    -- Get total count first
    SELECT COUNT(*) INTO v_total
    FROM public.t_group_memberships gm
    LEFT JOIN public.t_tenant_profiles tp ON tp.tenant_id = gm.tenant_id
    LEFT JOIN public.m_catalog_industries ci ON ci.id::VARCHAR = tp.industry_id
    WHERE
        gm.status = 'active'
        AND gm.is_active = true
        AND CASE
            WHEN p_scope = 'product' THEN true
            WHEN p_scope = 'group' THEN gm.group_id = p_group_id
            ELSE gm.group_id = p_group_id
        END
        AND (p_industry_filter IS NULL OR ci.industry_name ILIKE '%' || p_industry_filter || '%')
        AND (p_search_text IS NULL OR (
            tp.business_name ILIKE '%' || p_search_text || '%'
            OR gm.profile_data->>'short_description' ILIKE '%' || p_search_text || '%'
        ));

    -- Return results
    RETURN QUERY
    SELECT
        gm.id AS membership_id,
        gm.tenant_id,
        gm.group_id,
        bg.group_name::VARCHAR,
        tp.business_name::VARCHAR,
        COALESCE(
            gm.profile_data->>'short_description',
            LEFT(gm.profile_data->>'ai_enhanced_description', 200)
        )::TEXT AS short_description,
        ci.industry_name::VARCHAR AS industry,
        tp.city::VARCHAR,
        COALESCE(
            gm.profile_data->>'mobile_number',
            tp.business_phone
        )::VARCHAR AS contact_phone,
        tp.business_email::VARCHAR AS contact_email,
        tp.website_url::VARCHAR,
        tp.logo_url::VARCHAR,
        (gm.profile_data->>'member_number')::VARCHAR AS member_number,
        v_total AS total_count
    FROM public.t_group_memberships gm
    LEFT JOIN public.t_tenant_profiles tp ON tp.tenant_id = gm.tenant_id
    LEFT JOIN public.t_business_groups bg ON bg.id = gm.group_id
    LEFT JOIN public.m_catalog_industries ci ON ci.id::VARCHAR = tp.industry_id
    WHERE
        gm.status = 'active'
        AND gm.is_active = true
        AND CASE
            WHEN p_scope = 'product' THEN true
            WHEN p_scope = 'group' THEN gm.group_id = p_group_id
            ELSE gm.group_id = p_group_id
        END
        AND (p_industry_filter IS NULL OR ci.industry_name ILIKE '%' || p_industry_filter || '%')
        AND (p_search_text IS NULL OR (
            tp.business_name ILIKE '%' || p_search_text || '%'
            OR gm.profile_data->>'short_description' ILIKE '%' || p_search_text || '%'
        ))
    ORDER BY tp.business_name
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 3. GET MEMBER CONTACT
-- Gets detailed contact info for a specific member
-- ============================================

CREATE OR REPLACE FUNCTION get_member_contact(
    p_membership_id UUID,
    p_scope VARCHAR DEFAULT 'group',
    p_group_id UUID DEFAULT NULL
)
RETURNS TABLE (
    membership_id UUID,
    tenant_id UUID,
    group_id UUID,
    group_name VARCHAR,
    business_name VARCHAR,
    short_description TEXT,
    ai_enhanced_description TEXT,
    industry VARCHAR,
    city VARCHAR,
    state_code VARCHAR,
    address_line1 VARCHAR,
    contact_phone VARCHAR,
    contact_phone_country_code VARCHAR,
    contact_email VARCHAR,
    website_url VARCHAR,
    logo_url VARCHAR,
    member_number VARCHAR,
    approved_keywords TEXT[],
    has_access BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        gm.id AS membership_id,
        gm.tenant_id,
        gm.group_id,
        bg.group_name::VARCHAR,
        tp.business_name::VARCHAR,
        (gm.profile_data->>'short_description')::TEXT AS short_description,
        (gm.profile_data->>'ai_enhanced_description')::TEXT AS ai_enhanced_description,
        ci.industry_name::VARCHAR AS industry,
        tp.city::VARCHAR,
        tp.state_code::VARCHAR,
        tp.address_line1::VARCHAR,
        COALESCE(
            gm.profile_data->>'mobile_number',
            tp.business_phone
        )::VARCHAR AS contact_phone,
        tp.business_phone_country_code::VARCHAR AS contact_phone_country_code,
        tp.business_email::VARCHAR AS contact_email,
        tp.website_url::VARCHAR,
        tp.logo_url::VARCHAR,
        (gm.profile_data->>'member_number')::VARCHAR AS member_number,
        ARRAY(
            SELECT jsonb_array_elements_text(
                COALESCE(gm.profile_data->'approved_keywords', '[]'::JSONB)
            )
        )::TEXT[] AS approved_keywords,
        -- Check if caller has access to this member's contact
        CASE
            WHEN p_scope = 'product' THEN true
            WHEN p_scope = 'group' AND gm.group_id = p_group_id THEN true
            ELSE false
        END AS has_access
    FROM public.t_group_memberships gm
    LEFT JOIN public.t_tenant_profiles tp ON tp.tenant_id = gm.tenant_id
    LEFT JOIN public.t_business_groups bg ON bg.id = gm.group_id
    LEFT JOIN public.m_catalog_industries ci ON ci.id::VARCHAR = tp.industry_id
    WHERE gm.id = p_membership_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 4. GET SEGMENTS BY SCOPE
-- Lists industry segments with member counts
-- ============================================

CREATE OR REPLACE FUNCTION get_segments_by_scope(
    p_scope VARCHAR DEFAULT 'group',
    p_group_id UUID DEFAULT NULL
)
RETURNS TABLE (
    segment_name VARCHAR,
    industry_id VARCHAR,
    member_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        ci.industry_name::VARCHAR AS segment_name,
        tp.industry_id::VARCHAR,
        COUNT(*)::BIGINT AS member_count
    FROM public.t_group_memberships gm
    LEFT JOIN public.t_tenant_profiles tp ON tp.tenant_id = gm.tenant_id
    LEFT JOIN public.m_catalog_industries ci ON ci.id::VARCHAR = tp.industry_id
    WHERE
        gm.status = 'active'
        AND gm.is_active = true
        AND tp.industry_id IS NOT NULL
        AND ci.industry_name IS NOT NULL
        AND CASE
            WHEN p_scope = 'product' THEN true
            WHEN p_scope = 'group' THEN gm.group_id = p_group_id
            ELSE gm.group_id = p_group_id
        END
    GROUP BY ci.industry_name, tp.industry_id
    ORDER BY member_count DESC, ci.industry_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 5. GRANTS
-- ============================================

GRANT EXECUTE ON FUNCTION scoped_member_search TO authenticated;
GRANT EXECUTE ON FUNCTION scoped_member_search TO service_role;

GRANT EXECUTE ON FUNCTION get_members_by_scope TO authenticated;
GRANT EXECUTE ON FUNCTION get_members_by_scope TO service_role;

GRANT EXECUTE ON FUNCTION get_member_contact TO authenticated;
GRANT EXECUTE ON FUNCTION get_member_contact TO service_role;

GRANT EXECUTE ON FUNCTION get_segments_by_scope TO authenticated;
GRANT EXECUTE ON FUNCTION get_segments_by_scope TO service_role;

-- ============================================
-- 6. COMMENTS
-- ============================================

COMMENT ON FUNCTION scoped_member_search IS 'Vector search for members within scope. Uses embeddings for semantic matching.';
COMMENT ON FUNCTION get_members_by_scope IS 'Lists members in a group with optional industry/text filters. Supports pagination.';
COMMENT ON FUNCTION get_member_contact IS 'Gets detailed contact information for a specific member.';
COMMENT ON FUNCTION get_segments_by_scope IS 'Lists industry segments with member counts for a scope.';

-- ============================================
-- 7. VERIFICATION QUERIES
-- ============================================

/*
-- Test scoped search (requires embedding):

SELECT * FROM scoped_member_search(
    'panchakarma ayurveda',
    (SELECT embedding FROM t_group_memberships WHERE embedding IS NOT NULL LIMIT 1),
    'group',
    (SELECT id FROM t_business_groups WHERE group_name = 'BBB'),
    5,
    0.5
);

-- Test member listing:

SELECT * FROM get_members_by_scope(
    'group',
    (SELECT id FROM t_business_groups WHERE group_name = 'BBB'),
    NULL,  -- no industry filter
    NULL,  -- no search text
    10,
    0
);

-- Test member contact:

SELECT * FROM get_member_contact(
    'membership-uuid'::UUID,
    'group',
    'group-uuid'::UUID
);

-- Test segments:

SELECT * FROM get_segments_by_scope(
    'group',
    (SELECT id FROM t_business_groups WHERE group_name = 'BBB')
);
*/
