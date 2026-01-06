-- ============================================
-- FIX: Update discover_search to use correct column name
-- m_catalog_industries.name instead of industry_name
-- ============================================

-- Drop and recreate discover_search with correct column
CREATE OR REPLACE FUNCTION discover_search(
    p_query_embedding vector(1536),
    p_query_text TEXT,
    p_scope VARCHAR DEFAULT 'group',
    p_scope_id UUID DEFAULT NULL,
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
            ci.name AS industry,  -- FIXED: was industry_name
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
              CASE p_scope
                  WHEN 'group' THEN gm.group_id = p_scope_id
                  WHEN 'tenant' THEN gm.tenant_id::UUID = p_scope_id
                  WHEN 'product' THEN TRUE
                  ELSE gm.group_id = p_scope_id
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
                    LEAST(1.0, br.base_similarity + 0.15)
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

-- Also fix the original vector_search functions from migration 004
-- These also have the same issue

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
        ci.name AS industry,  -- FIXED: was industry_name
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
    v_query_words := regexp_split_to_array(LOWER(TRIM(p_query_text)), '\s+');
    v_search_word := v_query_words[1];

    RETURN QUERY
    WITH base_results AS (
        SELECT
            gm.id AS membership_id,
            gm.tenant_id,
            tp.business_name,
            tp.business_email,
            gm.profile_data->>'mobile_number' AS mobile_number,
            tp.city,
            ci.name AS industry,  -- FIXED: was industry_name
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
                    LEAST(1.0, br.base_similarity + 0.15)
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

-- Grant permissions
GRANT EXECUTE ON FUNCTION discover_search TO authenticated;
GRANT EXECUTE ON FUNCTION discover_search TO service_role;
GRANT EXECUTE ON FUNCTION vector_search_members TO authenticated;
GRANT EXECUTE ON FUNCTION vector_search_members TO service_role;
GRANT EXECUTE ON FUNCTION vector_search_with_boost TO authenticated;
GRANT EXECUTE ON FUNCTION vector_search_with_boost TO service_role;
