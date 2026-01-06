-- ============================================
-- SMARTPROFILE VECTOR SEARCH FUNCTIONS
-- AI-powered search for tenant smartprofiles
-- Supports: tenant scope, group scope (via membership), product scope
-- ============================================

-- ============================================
-- BASIC SEARCH FUNCTION (no boost)
-- ============================================
CREATE OR REPLACE FUNCTION smartprofile_vector_search(
    p_query_embedding vector(1536),
    p_scope TEXT DEFAULT 'product',           -- 'tenant' | 'group' | 'product'
    p_scope_id UUID DEFAULT NULL,             -- tenant_id for 'tenant', group_id for 'group', NULL for 'product'
    p_limit INT DEFAULT 10,
    p_similarity_threshold FLOAT DEFAULT 0.7
)
RETURNS TABLE (
    tenant_id UUID,
    business_name TEXT,
    business_email TEXT,
    city TEXT,
    industry TEXT,
    profile_snippet TEXT,
    ai_enhanced_description TEXT,
    approved_keywords TEXT[],
    profile_type TEXT,
    similarity FLOAT,
    match_type TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        sp.tenant_id,
        tp.business_name,
        tp.business_email,
        tp.city,
        ci.industry_name AS industry,
        LEFT(COALESCE(sp.ai_enhanced_description, sp.short_description, tp.business_name), 200) AS profile_snippet,
        sp.ai_enhanced_description,
        sp.approved_keywords,
        sp.profile_type,
        1 - (sp.embedding <=> p_query_embedding) AS similarity,
        'vector'::TEXT AS match_type
    FROM public.t_tenant_smartprofiles sp
    JOIN public.t_tenant_profiles tp ON tp.tenant_id = sp.tenant_id
    LEFT JOIN public.m_catalog_industries ci ON ci.id = tp.industry_id
    WHERE sp.status = 'active'
      AND sp.is_active = TRUE
      AND sp.embedding IS NOT NULL
      AND 1 - (sp.embedding <=> p_query_embedding) >= p_similarity_threshold
      -- Scope filtering
      AND (
          p_scope = 'product'  -- No filter for product-wide
          OR (p_scope = 'tenant' AND sp.tenant_id = p_scope_id)
          OR (p_scope = 'group' AND EXISTS (
              SELECT 1 FROM public.t_group_memberships gm
              WHERE gm.tenant_id = sp.tenant_id
                AND gm.group_id = p_scope_id
                AND gm.status = 'active'
                AND gm.is_active = TRUE
          ))
      )
    ORDER BY similarity DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- SEARCH WITH SEMANTIC CLUSTER BOOST
-- Boosts results that match semantic clusters
-- ============================================
CREATE OR REPLACE FUNCTION smartprofile_search_with_boost(
    p_query_embedding vector(1536),
    p_query_text TEXT,
    p_scope TEXT DEFAULT 'product',
    p_scope_id UUID DEFAULT NULL,
    p_limit INT DEFAULT 10,
    p_similarity_threshold FLOAT DEFAULT 0.7
)
RETURNS TABLE (
    tenant_id UUID,
    business_name TEXT,
    business_email TEXT,
    city TEXT,
    industry TEXT,
    profile_snippet TEXT,
    ai_enhanced_description TEXT,
    approved_keywords TEXT[],
    profile_type TEXT,
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
    -- Extract meaningful search word for cluster matching
    v_query_words := regexp_split_to_array(LOWER(TRIM(p_query_text)), '\s+');
    v_search_word := v_query_words[1];

    RETURN QUERY
    WITH base_results AS (
        SELECT
            sp.tenant_id,
            tp.business_name,
            tp.business_email,
            tp.city,
            ci.industry_name AS industry,
            LEFT(COALESCE(sp.ai_enhanced_description, sp.short_description, tp.business_name), 200) AS profile_snippet,
            sp.ai_enhanced_description,
            sp.approved_keywords,
            sp.profile_type,
            1 - (sp.embedding <=> p_query_embedding) AS base_similarity
        FROM public.t_tenant_smartprofiles sp
        JOIN public.t_tenant_profiles tp ON tp.tenant_id = sp.tenant_id
        LEFT JOIN public.m_catalog_industries ci ON ci.id = tp.industry_id
        WHERE sp.status = 'active'
          AND sp.is_active = TRUE
          AND sp.embedding IS NOT NULL
          AND 1 - (sp.embedding <=> p_query_embedding) >= p_similarity_threshold
          AND (
              p_scope = 'product'
              OR (p_scope = 'tenant' AND sp.tenant_id = p_scope_id)
              OR (p_scope = 'group' AND EXISTS (
                  SELECT 1 FROM public.t_group_memberships gm
                  WHERE gm.tenant_id = sp.tenant_id
                    AND gm.group_id = p_scope_id
                    AND gm.status = 'active'
                    AND gm.is_active = TRUE
              ))
          )
    ),
    -- Find clusters matching the search word (tenant-based clusters)
    cluster_matches AS (
        SELECT DISTINCT sc.tenant_id
        FROM public.t_semantic_clusters sc
        WHERE sc.tenant_id IS NOT NULL  -- Only tenant-based clusters
          AND sc.is_active = TRUE
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
                WHEN cm.tenant_id IS NOT NULL THEN
                    LEAST(1.0, br.base_similarity + 0.15)  -- +15% boost for cluster match
                ELSE br.base_similarity
            END AS final_similarity,
            CASE
                WHEN cm.tenant_id IS NOT NULL THEN 'cluster_match'
                ELSE NULL
            END AS boost_reason
        FROM base_results br
        LEFT JOIN cluster_matches cm ON cm.tenant_id = br.tenant_id
    )
    SELECT
        br.tenant_id,
        br.business_name,
        br.business_email,
        br.city,
        br.industry,
        br.profile_snippet,
        br.ai_enhanced_description,
        br.approved_keywords,
        br.profile_type,
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

-- ============================================
-- UNIFIED SEARCH FUNCTION
-- Entry point for n8n/Edge Function
-- Handles permission checks and caching
-- ============================================
CREATE OR REPLACE FUNCTION smartprofile_unified_search(
    p_query_text TEXT,
    p_query_embedding vector(1536),
    p_scope TEXT DEFAULT 'product',
    p_scope_id UUID DEFAULT NULL,
    p_user_role TEXT DEFAULT 'member',
    p_channel TEXT DEFAULT 'web',
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
    v_results_count INT;
BEGIN
    v_query_normalized := LOWER(TRIM(p_query_text));
    v_cache_key := p_scope || ':' || COALESCE(p_scope_id::TEXT, 'all') || ':' || v_query_normalized;

    -- Check cache (if enabled and scope is not tenant-specific)
    IF p_use_cache AND p_scope != 'tenant' THEN
        SELECT * INTO v_cache_result
        FROM public.t_smartprofile_search_cache
        WHERE cache_key = v_cache_key
          AND expires_at > NOW()
        LIMIT 1;

        IF FOUND THEN
            -- Update hit count
            UPDATE public.t_smartprofile_search_cache
            SET hit_count = hit_count + 1,
                last_hit_at = NOW(),
                expires_at = NOW() + INTERVAL '45 days'
            WHERE id = v_cache_result.id;

            RETURN jsonb_build_object(
                'success', TRUE,
                'from_cache', TRUE,
                'cache_hit_count', v_cache_result.hit_count + 1,
                'results_count', v_cache_result.results_count,
                'results', v_cache_result.results,
                'scope', p_scope
            );
        END IF;
    END IF;

    -- Perform fresh search with boost
    SELECT jsonb_agg(row_to_json(r)) INTO v_search_results
    FROM (
        SELECT *
        FROM smartprofile_search_with_boost(
            p_query_embedding,
            p_query_text,
            p_scope,
            p_scope_id,
            p_limit,
            p_similarity_threshold
        )
    ) r;

    v_search_results := COALESCE(v_search_results, '[]'::JSONB);
    v_results_count := jsonb_array_length(v_search_results);

    -- Store in cache (if enabled and results found)
    IF p_use_cache AND p_scope != 'tenant' AND v_results_count > 0 THEN
        INSERT INTO public.t_smartprofile_search_cache (
            cache_key,
            scope,
            scope_id,
            query_text,
            query_normalized,
            query_embedding,
            results,
            results_count,
            hit_count,
            created_at,
            updated_at,
            last_hit_at,
            expires_at
        ) VALUES (
            v_cache_key,
            p_scope,
            p_scope_id,
            p_query_text,
            v_query_normalized,
            p_query_embedding,
            v_search_results,
            v_results_count,
            1,
            NOW(),
            NOW(),
            NOW(),
            NOW() + INTERVAL '45 days'
        )
        ON CONFLICT (cache_key)
        DO UPDATE SET
            query_embedding = EXCLUDED.query_embedding,
            results = EXCLUDED.results,
            results_count = EXCLUDED.results_count,
            hit_count = t_smartprofile_search_cache.hit_count + 1,
            updated_at = NOW(),
            last_hit_at = NOW(),
            expires_at = NOW() + INTERVAL '45 days';
    END IF;

    RETURN jsonb_build_object(
        'success', TRUE,
        'from_cache', FALSE,
        'results_count', v_results_count,
        'results', v_search_results,
        'scope', p_scope,
        'query', p_query_text
    );
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- GRANT PERMISSIONS
-- ============================================
GRANT EXECUTE ON FUNCTION smartprofile_vector_search TO authenticated;
GRANT EXECUTE ON FUNCTION smartprofile_search_with_boost TO authenticated;
GRANT EXECUTE ON FUNCTION smartprofile_unified_search TO authenticated;
GRANT EXECUTE ON FUNCTION smartprofile_vector_search TO service_role;
GRANT EXECUTE ON FUNCTION smartprofile_search_with_boost TO service_role;
GRANT EXECUTE ON FUNCTION smartprofile_unified_search TO service_role;

-- ============================================
-- COMMENTS
-- ============================================
COMMENT ON FUNCTION smartprofile_vector_search IS 'Basic vector search for tenant smartprofiles without cluster boost';
COMMENT ON FUNCTION smartprofile_search_with_boost IS 'Vector search with semantic cluster boost (+15%)';
COMMENT ON FUNCTION smartprofile_unified_search IS 'Main entry point for smartprofile search with caching';
