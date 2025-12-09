-- ============================================
-- VECTOR SEARCH FUNCTION WITH CACHING
-- AI-powered search for group members
-- ============================================

-- ============================================
-- MAIN SEARCH FUNCTION
-- Called by Edge Function/n8n
-- ============================================
CREATE OR REPLACE FUNCTION vector_search_members(
    p_group_id UUID,
    p_query_embedding vector(1536),
    p_limit INT DEFAULT 10,
    p_similarity_threshold FLOAT DEFAULT 0.7
)
RETURNS TABLE (
    membership_id UUID,
    tenant_id UUID,
    business_name TEXT,
    business_email TEXT,
    mobile_number TEXT,
    city TEXT,
    industry TEXT,
    profile_snippet TEXT,
    ai_enhanced_description TEXT,
    approved_keywords TEXT[],
    similarity FLOAT,
    match_type TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        gm.id AS membership_id,
        gm.tenant_id,
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
        1 - (gm.embedding <=> p_query_embedding) AS similarity,
        'vector'::TEXT AS match_type
    FROM public.t_group_memberships gm
    LEFT JOIN public.t_tenant_profiles tp ON tp.tenant_id = gm.tenant_id::UUID
    LEFT JOIN public.m_catalog_industries ci ON ci.id = tp.industry_id
    WHERE gm.group_id = p_group_id
      AND gm.status = 'active'
      AND gm.is_active = TRUE
      AND gm.embedding IS NOT NULL
      AND 1 - (gm.embedding <=> p_query_embedding) >= p_similarity_threshold
    ORDER BY similarity DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- SEARCH WITH SEMANTIC CLUSTER BOOST
-- Boosts results that match semantic clusters
-- ============================================
CREATE OR REPLACE FUNCTION vector_search_with_boost(
    p_group_id UUID,
    p_query_embedding vector(1536),
    p_query_text TEXT,
    p_limit INT DEFAULT 10,
    p_similarity_threshold FLOAT DEFAULT 0.7
)
RETURNS TABLE (
    membership_id UUID,
    tenant_id UUID,
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
    match_type TEXT
) AS $$
DECLARE
    v_query_words TEXT[];
    v_search_word TEXT;
BEGIN
    -- Extract meaningful search word
    v_query_words := regexp_split_to_array(LOWER(TRIM(p_query_text)), '\s+');
    v_search_word := v_query_words[1];  -- Use first word for cluster matching

    RETURN QUERY
    WITH base_results AS (
        SELECT
            gm.id AS membership_id,
            gm.tenant_id,
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
        LEFT JOIN public.m_catalog_industries ci ON ci.id = tp.industry_id
        WHERE gm.group_id = p_group_id
          AND gm.status = 'active'
          AND gm.is_active = TRUE
          AND gm.embedding IS NOT NULL
          AND 1 - (gm.embedding <=> p_query_embedding) >= p_similarity_threshold
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
        'vector'::TEXT AS match_type
    FROM boosted_results br
    ORDER BY br.final_similarity DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- CACHED SEARCH FUNCTION
-- Checks cache first, then performs search
-- ============================================
CREATE OR REPLACE FUNCTION cached_vector_search(
    p_group_id UUID,
    p_query_text TEXT,
    p_query_embedding vector(1536),
    p_limit INT DEFAULT 10,
    p_similarity_threshold FLOAT DEFAULT 0.7,
    p_use_cache BOOLEAN DEFAULT TRUE
)
RETURNS JSONB AS $$
DECLARE
    v_query_normalized TEXT;
    v_cache_result RECORD;
    v_search_results JSONB;
    v_cache_id UUID;
    v_results_count INT;
BEGIN
    v_query_normalized := LOWER(TRIM(p_query_text));

    -- Check cache first
    IF p_use_cache THEN
        SELECT * INTO v_cache_result
        FROM get_cached_search(p_group_id, v_query_normalized);

        IF v_cache_result.is_cached THEN
            RETURN jsonb_build_object(
                'success', TRUE,
                'from_cache', TRUE,
                'cache_hit_count', v_cache_result.hit_count,
                'results_count', v_cache_result.results_count,
                'results', v_cache_result.results
            );
        END IF;
    END IF;

    -- Perform fresh search
    SELECT jsonb_agg(row_to_json(r)) INTO v_search_results
    FROM (
        SELECT *
        FROM vector_search_with_boost(
            p_group_id,
            p_query_embedding,
            p_query_text,
            p_limit,
            p_similarity_threshold
        )
    ) r;

    v_search_results := COALESCE(v_search_results, '[]'::JSONB);
    v_results_count := jsonb_array_length(v_search_results);

    -- Store in cache
    IF p_use_cache THEN
        v_cache_id := store_search_cache(
            p_group_id,
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
        'results', v_search_results
    );
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- GRANT PERMISSIONS
-- ============================================
GRANT EXECUTE ON FUNCTION vector_search_members TO authenticated;
GRANT EXECUTE ON FUNCTION vector_search_with_boost TO authenticated;
GRANT EXECUTE ON FUNCTION cached_vector_search TO authenticated;
GRANT EXECUTE ON FUNCTION vector_search_members TO service_role;
GRANT EXECUTE ON FUNCTION vector_search_with_boost TO service_role;
GRANT EXECUTE ON FUNCTION cached_vector_search TO service_role;
