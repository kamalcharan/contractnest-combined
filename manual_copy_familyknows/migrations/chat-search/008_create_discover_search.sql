-- ============================================
-- PHASE 2: MULTI-SCOPE SEARCH FUNCTIONS
-- Enables search across group, tenant, or product
-- ============================================

-- ============================================
-- 1. CREATE discover_search FUNCTION
-- Main search function supporting all scopes
-- ============================================

CREATE OR REPLACE FUNCTION discover_search(
    p_query_embedding vector(1536),
    p_query_text TEXT,
    p_scope VARCHAR DEFAULT 'group',           -- 'group', 'tenant', 'product'
    p_scope_id UUID DEFAULT NULL,              -- group_id or tenant_id (NULL for product scope)
    p_limit INT DEFAULT 10,
    p_similarity_threshold FLOAT DEFAULT 0.7
)
RETURNS TABLE (
    membership_id UUID,
    tenant_id UUID,
    group_id UUID,
    group_name TEXT,
    business_name TEXT,
    business_email TEXT,
    mobile_number TEXT,
    city TEXT,
    industry TEXT,
    profile_snippet TEXT,
    ai_enhanced_description TEXT,
    approved_keywords TEXT[],
    similarity FLOAT,
    similarity_original FLOAT,
    boost_applied TEXT,
    match_type TEXT,
    search_scope TEXT
) AS $$
DECLARE
    v_query_words TEXT[];
    v_search_word TEXT;
BEGIN
    -- Extract first meaningful word for cluster matching
    v_query_words := regexp_split_to_array(LOWER(TRIM(p_query_text)), '\s+');
    v_search_word := v_query_words[1];

    RETURN QUERY
    WITH base_results AS (
        SELECT
            gm.id AS membership_id,
            gm.tenant_id,
            gm.group_id,
            bg.group_name,
            tp.business_name,
            tp.business_email,
            gm.profile_data->>'mobile_number' AS mobile_number,
            tp.city,
            ci.industry_name AS industry,
            LEFT(COALESCE(
                gm.profile_data->>'ai_enhanced_description',
                gm.profile_data->>'short_description',
                tp.business_name
            ), 200) AS profile_snippet,
            gm.profile_data->>'ai_enhanced_description' AS ai_enhanced_description,
            ARRAY(
                SELECT jsonb_array_elements_text(
                    COALESCE(gm.profile_data->'approved_keywords', '[]'::JSONB)
                )
            ) AS approved_keywords,
            1 - (gm.embedding <=> p_query_embedding) AS base_similarity
        FROM public.t_group_memberships gm
        LEFT JOIN public.t_tenant_profiles tp ON tp.tenant_id = gm.tenant_id::UUID
        LEFT JOIN public.t_business_groups bg ON bg.id = gm.group_id
        LEFT JOIN public.m_catalog_industries ci ON ci.id = tp.industry_id
        WHERE gm.status = 'active'
          AND gm.is_active = TRUE
          AND gm.embedding IS NOT NULL
          AND 1 - (gm.embedding <=> p_query_embedding) >= p_similarity_threshold
          AND (
              -- Scope filtering
              CASE p_scope
                  WHEN 'group' THEN gm.group_id = p_scope_id
                  WHEN 'tenant' THEN gm.tenant_id::UUID = p_scope_id
                  WHEN 'product' THEN TRUE  -- All tenants across product
                  ELSE gm.group_id = p_scope_id  -- Default to group
              END
          )
    ),
    cluster_matches AS (
        SELECT DISTINCT sc.membership_id
        FROM public.t_semantic_clusters sc
        WHERE sc.is_active = TRUE
          AND (
              LOWER(sc.primary_term) LIKE '%' || v_search_word || '%'
              OR EXISTS (
                  SELECT 1
                  FROM unnest(sc.related_terms) rt
                  WHERE LOWER(rt) LIKE '%' || v_search_word || '%'
              )
          )
    ),
    boosted_results AS (
        SELECT
            br.*,
            CASE
                WHEN cm.membership_id IS NOT NULL THEN
                    LEAST(1.0, br.base_similarity + 0.15)  -- +15% boost for cluster match
                ELSE br.base_similarity
            END AS final_similarity,
            CASE
                WHEN cm.membership_id IS NOT NULL THEN 'cluster_match'
                ELSE NULL
            END AS boost_reason
        FROM base_results br
        LEFT JOIN cluster_matches cm ON cm.membership_id = br.membership_id
    )
    SELECT
        br.membership_id,
        br.tenant_id::UUID,
        br.group_id,
        br.group_name,
        br.business_name,
        br.business_email,
        br.mobile_number,
        br.city,
        br.industry,
        br.profile_snippet,
        br.ai_enhanced_description,
        br.approved_keywords,
        br.final_similarity AS similarity,
        br.base_similarity AS similarity_original,
        br.boost_reason AS boost_applied,
        'vector'::TEXT AS match_type,
        p_scope AS search_scope
    FROM boosted_results br
    ORDER BY br.final_similarity DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION discover_search IS 'Multi-scope vector search with semantic cluster boost. Supports group, tenant, or product-wide search.';

-- ============================================
-- 2. CREATE cached_discover_search FUNCTION
-- Wrapper that checks cache before searching
-- ============================================

CREATE OR REPLACE FUNCTION cached_discover_search(
    p_query_text TEXT,
    p_query_embedding vector(1536),
    p_scope VARCHAR DEFAULT 'group',
    p_scope_id UUID DEFAULT NULL,
    p_limit INT DEFAULT 10,
    p_similarity_threshold FLOAT DEFAULT 0.7,
    p_use_cache BOOLEAN DEFAULT TRUE
)
RETURNS JSONB AS $$
DECLARE
    v_query_normalized TEXT;
    v_cache_key TEXT;
    v_cache_result RECORD;
    v_search_results JSONB;
    v_cache_id UUID;
    v_results_count INT;
BEGIN
    v_query_normalized := LOWER(TRIM(p_query_text));

    -- Build cache key including scope
    v_cache_key := p_scope || ':' || COALESCE(p_scope_id::TEXT, 'all') || ':' || v_query_normalized;

    -- Check cache first (using group_id for backward compatibility, but key includes scope)
    IF p_use_cache AND p_scope = 'group' AND p_scope_id IS NOT NULL THEN
        SELECT * INTO v_cache_result
        FROM get_cached_search(p_scope_id, v_query_normalized);

        IF v_cache_result.is_cached THEN
            RETURN jsonb_build_object(
                'success', TRUE,
                'from_cache', TRUE,
                'cache_hit_count', v_cache_result.hit_count,
                'results_count', v_cache_result.results_count,
                'results', v_cache_result.results,
                'search_scope', p_scope
            );
        END IF;
    END IF;

    -- Perform fresh search
    SELECT COALESCE(jsonb_agg(row_to_json(r)), '[]'::JSONB) INTO v_search_results
    FROM (
        SELECT *
        FROM discover_search(
            p_query_embedding,
            p_query_text,
            p_scope,
            p_scope_id,
            p_limit,
            p_similarity_threshold
        )
    ) r;

    v_results_count := jsonb_array_length(v_search_results);

    -- Store in cache (only for group scope currently)
    IF p_use_cache AND p_scope = 'group' AND p_scope_id IS NOT NULL THEN
        v_cache_id := store_search_cache(
            p_scope_id,
            p_query_text,
            v_query_normalized,
            p_query_embedding,
            v_search_results,
            v_results_count,
            'vector'
        );
    END IF;

    RETURN jsonb_build_object(
        'success', TRUE,
        'from_cache', FALSE,
        'cache_id', v_cache_id,
        'results_count', v_results_count,
        'results', v_search_results,
        'search_scope', p_scope
    );
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION cached_discover_search IS 'Cached version of discover_search. Checks cache before performing search.';

-- ============================================
-- 3. CREATE unified_search FUNCTION
-- Entry point that validates intent + permission + executes search
-- ============================================

CREATE OR REPLACE FUNCTION unified_search(
    p_group_id UUID,
    p_query_text TEXT,
    p_query_embedding vector(1536),
    p_intent_code VARCHAR DEFAULT 'search_offering',
    p_user_role VARCHAR DEFAULT 'member',
    p_channel VARCHAR DEFAULT 'web',
    p_scope VARCHAR DEFAULT 'group',
    p_limit INT DEFAULT NULL,
    p_use_cache BOOLEAN DEFAULT TRUE
)
RETURNS JSONB AS $$
DECLARE
    v_permission RECORD;
    v_max_results INT;
    v_search_result JSONB;
    v_scope_id UUID;
BEGIN
    -- 1. Check permission
    SELECT * INTO v_permission
    FROM check_intent_permission(
        p_group_id,
        p_intent_code,
        p_user_role,
        p_channel,
        p_scope
    );

    IF NOT v_permission.is_allowed THEN
        RETURN jsonb_build_object(
            'success', FALSE,
            'error', 'Permission denied',
            'denial_reason', v_permission.denial_reason,
            'intent_code', p_intent_code,
            'user_role', p_user_role,
            'channel', p_channel
        );
    END IF;

    -- 2. Determine max_results (use provided or permission-based)
    v_max_results := COALESCE(p_limit, v_permission.max_results, 10);

    -- 3. Determine scope_id
    IF p_scope = 'group' THEN
        v_scope_id := p_group_id;
    ELSIF p_scope = 'tenant' THEN
        -- For tenant scope, we need to get tenant_id from context
        -- For now, use group's primary tenant or require explicit tenant_id
        v_scope_id := NULL; -- Will search all in group's context
    ELSE
        v_scope_id := NULL; -- Product-wide
    END IF;

    -- 4. Execute search
    v_search_result := cached_discover_search(
        p_query_text,
        p_query_embedding,
        p_scope,
        COALESCE(v_scope_id, p_group_id),
        v_max_results,
        0.7,  -- default similarity threshold
        p_use_cache
    );

    -- 5. Add metadata to result
    RETURN v_search_result || jsonb_build_object(
        'intent_code', p_intent_code,
        'user_role', p_user_role,
        'channel', p_channel,
        'query', p_query_text,
        'max_results_allowed', v_max_results
    );
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION unified_search IS 'Unified search entry point. Validates intent permission, then executes cached search.';

-- ============================================
-- 4. GRANT PERMISSIONS
-- ============================================

GRANT EXECUTE ON FUNCTION discover_search TO authenticated;
GRANT EXECUTE ON FUNCTION discover_search TO service_role;

GRANT EXECUTE ON FUNCTION cached_discover_search TO authenticated;
GRANT EXECUTE ON FUNCTION cached_discover_search TO service_role;

GRANT EXECUTE ON FUNCTION unified_search TO authenticated;
GRANT EXECUTE ON FUNCTION unified_search TO service_role;

-- ============================================
-- 5. VERIFICATION QUERIES
-- ============================================

-- Test discover_search with group scope (requires embedding)
-- First get BBB group_id and a sample embedding:
--
-- WITH sample AS (
--     SELECT gm.group_id, gm.embedding
--     FROM t_group_memberships gm
--     JOIN t_business_groups bg ON bg.id = gm.group_id
--     WHERE bg.group_name = 'BBB' AND gm.embedding IS NOT NULL
--     LIMIT 1
-- )
-- SELECT * FROM discover_search(
--     (SELECT embedding FROM sample),
--     'AC repair',
--     'group',
--     (SELECT group_id FROM sample),
--     5,
--     0.5
-- );

-- Test unified_search (validates permission first)
-- WITH sample AS (
--     SELECT gm.group_id, gm.embedding
--     FROM t_group_memberships gm
--     JOIN t_business_groups bg ON bg.id = gm.group_id
--     WHERE bg.group_name = 'BBB' AND gm.embedding IS NOT NULL
--     LIMIT 1
-- )
-- SELECT unified_search(
--     (SELECT group_id FROM sample),
--     'AC repair',
--     (SELECT embedding FROM sample),
--     'search_offering',
--     'member',
--     'whatsapp',
--     'group',
--     5,
--     FALSE
-- );
