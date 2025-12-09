-- ============================================
-- SMARTPROFILE SEARCH CACHE TABLE
-- 45-day sliding expiration (updates on each hit)
-- ============================================

CREATE TABLE IF NOT EXISTS public.t_smartprofile_search_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Cache key (scope + scope_id + normalized query)
    cache_key TEXT NOT NULL UNIQUE,

    -- Scope context
    scope TEXT NOT NULL CHECK (scope IN ('tenant', 'group', 'product')),
    scope_id UUID,                               -- tenant_id or group_id based on scope

    -- Query data
    query_text TEXT NOT NULL,                    -- Original query text
    query_normalized TEXT NOT NULL,              -- Lowercase trimmed for matching
    query_embedding vector(1536),                -- OpenAI embedding

    -- Results
    results JSONB NOT NULL DEFAULT '[]',         -- Cached search results
    results_count INT DEFAULT 0,                 -- Number of results

    -- Cache metadata
    hit_count INT DEFAULT 1,                     -- Number of times this cache was hit
    search_type TEXT DEFAULT 'vector',           -- vector | keyword | hybrid

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_hit_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '45 days')
);

-- ============================================
-- INDEXES
-- ============================================

-- Primary lookup index
CREATE INDEX IF NOT EXISTS idx_smartprofile_cache_key
    ON public.t_smartprofile_search_cache(cache_key);

-- Scope-based lookup
CREATE INDEX IF NOT EXISTS idx_smartprofile_cache_scope
    ON public.t_smartprofile_search_cache(scope, scope_id);

-- Expiration cleanup
CREATE INDEX IF NOT EXISTS idx_smartprofile_cache_expires
    ON public.t_smartprofile_search_cache(expires_at);

-- Embedding similarity (for semantic cache matching if needed)
CREATE INDEX IF NOT EXISTS idx_smartprofile_cache_embedding
    ON public.t_smartprofile_search_cache USING ivfflat (query_embedding vector_cosine_ops)
    WITH (lists = 100);

-- ============================================
-- TRIGGER: Update updated_at timestamp
-- ============================================
CREATE OR REPLACE FUNCTION update_smartprofile_cache_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_smartprofile_cache_updated_at ON public.t_smartprofile_search_cache;
CREATE TRIGGER trg_smartprofile_cache_updated_at
    BEFORE UPDATE ON public.t_smartprofile_search_cache
    FOR EACH ROW
    EXECUTE FUNCTION update_smartprofile_cache_timestamp();

-- ============================================
-- FUNCTION: Cleanup expired cache entries
-- ============================================
CREATE OR REPLACE FUNCTION cleanup_expired_smartprofile_cache()
RETURNS INT AS $$
DECLARE
    v_deleted_count INT;
BEGIN
    DELETE FROM public.t_smartprofile_search_cache
    WHERE expires_at < NOW();

    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- FUNCTION: Get cached smartprofile search
-- ============================================
CREATE OR REPLACE FUNCTION get_smartprofile_cached_search(
    p_cache_key TEXT
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
    FROM public.t_smartprofile_search_cache
    WHERE cache_key = p_cache_key
      AND expires_at > NOW()
    LIMIT 1;

    IF FOUND THEN
        -- Update hit count and extend expiration
        UPDATE public.t_smartprofile_search_cache
        SET hit_count = t_smartprofile_search_cache.hit_count + 1,
            last_hit_at = NOW(),
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
-- RLS POLICIES
-- ============================================
ALTER TABLE public.t_smartprofile_search_cache ENABLE ROW LEVEL SECURITY;

-- Policy: Service role has full access
CREATE POLICY "Service role full access to smartprofile cache"
    ON public.t_smartprofile_search_cache
    FOR ALL
    USING (auth.role() = 'service_role');

-- Policy: Authenticated users can read cache (search results are not sensitive)
CREATE POLICY "Authenticated users can read smartprofile cache"
    ON public.t_smartprofile_search_cache
    FOR SELECT
    USING (auth.role() = 'authenticated');

-- ============================================
-- GRANTS
-- ============================================
GRANT SELECT ON public.t_smartprofile_search_cache TO authenticated;
GRANT ALL ON public.t_smartprofile_search_cache TO service_role;
GRANT EXECUTE ON FUNCTION cleanup_expired_smartprofile_cache TO service_role;
GRANT EXECUTE ON FUNCTION get_smartprofile_cached_search TO authenticated;
GRANT EXECUTE ON FUNCTION get_smartprofile_cached_search TO service_role;

-- ============================================
-- COMMENTS
-- ============================================
COMMENT ON TABLE public.t_smartprofile_search_cache IS 'Cache for SmartProfile AI search queries with 45-day sliding expiration';
COMMENT ON COLUMN public.t_smartprofile_search_cache.cache_key IS 'Unique key: scope:scope_id:query_normalized';
COMMENT ON COLUMN public.t_smartprofile_search_cache.scope IS 'Search scope: tenant, group, or product';
