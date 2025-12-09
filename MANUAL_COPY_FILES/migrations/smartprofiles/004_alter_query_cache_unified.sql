-- ============================================
-- ALTER t_query_cache FOR UNIFIED CACHING
-- Supports: group_search, smartprofile_search, etc.
-- Enables unified analytics across all cache types
-- ============================================

-- Step 1: Add new columns for unified cache
ALTER TABLE public.t_query_cache
    ADD COLUMN IF NOT EXISTS cache_type TEXT DEFAULT 'group_search',
    ADD COLUMN IF NOT EXISTS scope TEXT DEFAULT 'group',
    ADD COLUMN IF NOT EXISTS scope_id UUID,
    ADD COLUMN IF NOT EXISTS failure_count INT DEFAULT 0,
    ADD COLUMN IF NOT EXISTS last_failure_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS failure_reason TEXT;

-- Step 2: Make group_id nullable (for non-group scoped caches)
ALTER TABLE public.t_query_cache
    ALTER COLUMN group_id DROP NOT NULL;

-- Step 3: Add cache_type constraint
ALTER TABLE public.t_query_cache
    DROP CONSTRAINT IF EXISTS chk_cache_type;
ALTER TABLE public.t_query_cache
    ADD CONSTRAINT chk_cache_type
    CHECK (cache_type IN ('group_search', 'smartprofile_search', 'product_search', 'tenant_search'));

-- Step 4: Add scope constraint
ALTER TABLE public.t_query_cache
    DROP CONSTRAINT IF EXISTS chk_cache_scope;
ALTER TABLE public.t_query_cache
    ADD CONSTRAINT chk_cache_scope
    CHECK (scope IN ('tenant', 'group', 'product'));

-- Step 5: Update existing records to have proper cache_type and scope
UPDATE public.t_query_cache
SET cache_type = 'group_search',
    scope = 'group',
    scope_id = group_id
WHERE cache_type IS NULL OR cache_type = 'group_search';

-- Step 6: Create unique constraint on cache_type + scope + scope_id + query
-- Drop old unique constraint first
ALTER TABLE public.t_query_cache
    DROP CONSTRAINT IF EXISTS uq_query_cache_group_query;

-- Create new composite unique constraint
ALTER TABLE public.t_query_cache
    ADD CONSTRAINT uq_query_cache_unified
    UNIQUE (cache_type, scope, scope_id, query_normalized);

-- Step 7: Add indexes for new columns
CREATE INDEX IF NOT EXISTS idx_query_cache_type
    ON public.t_query_cache(cache_type);

CREATE INDEX IF NOT EXISTS idx_query_cache_scope
    ON public.t_query_cache(scope, scope_id);

CREATE INDEX IF NOT EXISTS idx_query_cache_unified_lookup
    ON public.t_query_cache(cache_type, scope, scope_id, query_normalized);

-- Index for failure analytics
CREATE INDEX IF NOT EXISTS idx_query_cache_failures
    ON public.t_query_cache(cache_type, failure_count)
    WHERE failure_count > 0;

-- ============================================
-- FUNCTION: Get cached smartprofile search
-- Uses unified cache table
-- ============================================
CREATE OR REPLACE FUNCTION get_smartprofile_cached_search(
    p_scope TEXT,
    p_scope_id UUID,
    p_query_normalized TEXT
)
RETURNS TABLE (
    cache_id UUID,
    results JSONB,
    results_count INT,
    hit_count INT,
    is_cached BOOLEAN
) AS $$
DECLARE
    v_cache_record RECORD;
BEGIN
    SELECT * INTO v_cache_record
    FROM public.t_query_cache
    WHERE cache_type = 'smartprofile_search'
      AND scope = p_scope
      AND (
          (p_scope_id IS NULL AND scope_id IS NULL)
          OR scope_id = p_scope_id
      )
      AND query_normalized = p_query_normalized
      AND expires_at > NOW()
    LIMIT 1;

    IF FOUND THEN
        -- Update hit count and extend expiration
        UPDATE public.t_query_cache
        SET hit_count = t_query_cache.hit_count + 1,
            last_hit_at = NOW(),
            updated_at = NOW(),
            expires_at = NOW() + INTERVAL '45 days'
        WHERE id = v_cache_record.id;

        RETURN QUERY SELECT
            v_cache_record.id,
            v_cache_record.results,
            v_cache_record.results_count,
            v_cache_record.hit_count + 1,
            TRUE;
    ELSE
        RETURN QUERY SELECT
            NULL::UUID,
            '[]'::JSONB,
            0,
            0,
            FALSE;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- FUNCTION: Store smartprofile search cache
-- Uses unified cache table
-- ============================================
CREATE OR REPLACE FUNCTION store_smartprofile_cache(
    p_scope TEXT,
    p_scope_id UUID,
    p_query_text TEXT,
    p_query_normalized TEXT,
    p_query_embedding vector(1536),
    p_results JSONB,
    p_results_count INT
)
RETURNS UUID AS $$
DECLARE
    v_cache_id UUID;
BEGIN
    INSERT INTO public.t_query_cache (
        cache_type,
        scope,
        scope_id,
        group_id,  -- NULL for smartprofile searches
        query_text,
        query_normalized,
        query_embedding,
        results,
        results_count,
        search_type,
        hit_count,
        created_at,
        updated_at,
        last_hit_at,
        expires_at
    ) VALUES (
        'smartprofile_search',
        p_scope,
        p_scope_id,
        NULL,
        p_query_text,
        p_query_normalized,
        p_query_embedding,
        p_results,
        p_results_count,
        'vector',
        1,
        NOW(),
        NOW(),
        NOW(),
        NOW() + INTERVAL '45 days'
    )
    ON CONFLICT (cache_type, scope, scope_id, query_normalized)
    DO UPDATE SET
        query_embedding = EXCLUDED.query_embedding,
        results = EXCLUDED.results,
        results_count = EXCLUDED.results_count,
        hit_count = t_query_cache.hit_count + 1,
        updated_at = NOW(),
        last_hit_at = NOW(),
        expires_at = NOW() + INTERVAL '45 days'
    RETURNING id INTO v_cache_id;

    RETURN v_cache_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- FUNCTION: Record cache failure (for analytics)
-- ============================================
CREATE OR REPLACE FUNCTION record_cache_failure(
    p_cache_type TEXT,
    p_scope TEXT,
    p_scope_id UUID,
    p_query_normalized TEXT,
    p_failure_reason TEXT
)
RETURNS VOID AS $$
BEGIN
    UPDATE public.t_query_cache
    SET failure_count = failure_count + 1,
        last_failure_at = NOW(),
        failure_reason = p_failure_reason,
        updated_at = NOW()
    WHERE cache_type = p_cache_type
      AND scope = p_scope
      AND (
          (p_scope_id IS NULL AND scope_id IS NULL)
          OR scope_id = p_scope_id
      )
      AND query_normalized = p_query_normalized;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- VIEW: Cache analytics
-- ============================================
CREATE OR REPLACE VIEW v_cache_analytics AS
SELECT
    cache_type,
    scope,
    COUNT(*) AS total_entries,
    SUM(hit_count) AS total_hits,
    SUM(failure_count) AS total_failures,
    AVG(hit_count) AS avg_hits_per_entry,
    COUNT(*) FILTER (WHERE expires_at < NOW()) AS expired_entries,
    COUNT(*) FILTER (WHERE expires_at >= NOW()) AS active_entries,
    MAX(last_hit_at) AS last_activity
FROM public.t_query_cache
GROUP BY cache_type, scope;

-- Grant access to view
GRANT SELECT ON v_cache_analytics TO authenticated;
GRANT SELECT ON v_cache_analytics TO service_role;

-- ============================================
-- UPDATE: smartprofile_unified_search to use unified cache
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
    v_cache_result RECORD;
    v_search_results JSONB;
    v_results_count INT;
    v_cache_id UUID;
BEGIN
    v_query_normalized := LOWER(TRIM(p_query_text));

    -- Check cache (if enabled and scope is not tenant-specific)
    IF p_use_cache AND p_scope != 'tenant' THEN
        SELECT * INTO v_cache_result
        FROM get_smartprofile_cached_search(p_scope, p_scope_id, v_query_normalized);

        IF v_cache_result.is_cached THEN
            RETURN jsonb_build_object(
                'success', TRUE,
                'from_cache', TRUE,
                'cache_hit_count', v_cache_result.hit_count,
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
        v_cache_id := store_smartprofile_cache(
            p_scope,
            p_scope_id,
            p_query_text,
            v_query_normalized,
            p_query_embedding,
            v_search_results,
            v_results_count
        );
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
-- GRANTS
-- ============================================
GRANT EXECUTE ON FUNCTION get_smartprofile_cached_search TO authenticated;
GRANT EXECUTE ON FUNCTION get_smartprofile_cached_search TO service_role;
GRANT EXECUTE ON FUNCTION store_smartprofile_cache TO service_role;
GRANT EXECUTE ON FUNCTION record_cache_failure TO service_role;

-- ============================================
-- COMMENTS
-- ============================================
COMMENT ON COLUMN public.t_query_cache.cache_type IS 'Type of cache: group_search, smartprofile_search, product_search, tenant_search';
COMMENT ON COLUMN public.t_query_cache.scope IS 'Search scope: tenant, group, product';
COMMENT ON COLUMN public.t_query_cache.scope_id IS 'ID for the scope (tenant_id, group_id, or NULL for product)';
COMMENT ON COLUMN public.t_query_cache.failure_count IS 'Number of times this cached query resulted in errors';
COMMENT ON COLUMN public.t_query_cache.failure_reason IS 'Last failure reason for debugging';
COMMENT ON VIEW v_cache_analytics IS 'Analytics view for cache performance by type and scope';
