-- ============================================
-- QUERY CACHE TABLE
-- 45-day sliding expiration (updates on each hit)
-- ============================================

CREATE TABLE IF NOT EXISTS public.t_query_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Group scope
    group_id UUID NOT NULL REFERENCES public.t_business_groups(id) ON DELETE CASCADE,

    -- Query data
    query_text TEXT NOT NULL,                    -- Original query text
    query_normalized TEXT NOT NULL,              -- Lowercase trimmed for matching
    query_embedding vector(1536),                -- OpenAI embedding for semantic matching

    -- Results
    results JSONB NOT NULL DEFAULT '{}',         -- Cached search results
    results_count INT DEFAULT 0,                 -- Number of results

    -- Cache metadata
    hit_count INT DEFAULT 1,                     -- Number of times this cache was hit
    search_type TEXT DEFAULT 'vector',           -- vector | keyword | hybrid

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_hit_at TIMESTAMPTZ DEFAULT NOW(),       -- Last time cache was accessed
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '45 days'),  -- Sliding expiration

    -- Unique constraint: one cache entry per normalized query per group
    CONSTRAINT uq_query_cache_group_query UNIQUE (group_id, query_normalized)
);

-- Index for fast cache lookups
CREATE INDEX IF NOT EXISTS idx_query_cache_lookup
    ON public.t_query_cache(group_id, query_normalized);

-- Index for cache expiration cleanup
CREATE INDEX IF NOT EXISTS idx_query_cache_expires
    ON public.t_query_cache(expires_at);

-- Index for embedding similarity search (if needed for semantic cache matching)
CREATE INDEX IF NOT EXISTS idx_query_cache_embedding
    ON public.t_query_cache USING ivfflat (query_embedding vector_cosine_ops)
    WITH (lists = 100);

-- ============================================
-- FUNCTION: Update cache on hit
-- Extends expires_at by 45 days on each access
-- ============================================
CREATE OR REPLACE FUNCTION update_cache_on_hit(p_cache_id UUID)
RETURNS void AS $$
BEGIN
    UPDATE public.t_query_cache
    SET
        hit_count = hit_count + 1,
        last_hit_at = NOW(),
        updated_at = NOW(),
        expires_at = NOW() + INTERVAL '45 days'  -- Sliding expiration
    WHERE id = p_cache_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- FUNCTION: Get or create cache entry
-- Returns cached results if exists and not expired
-- ============================================
CREATE OR REPLACE FUNCTION get_cached_search(
    p_group_id UUID,
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
    -- Look for valid cache entry
    SELECT * INTO v_cache_record
    FROM public.t_query_cache qc
    WHERE qc.group_id = p_group_id
      AND qc.query_normalized = p_query_normalized
      AND qc.expires_at > NOW()
    LIMIT 1;

    IF FOUND THEN
        -- Update hit count and extend expiration
        PERFORM update_cache_on_hit(v_cache_record.id);

        RETURN QUERY SELECT
            v_cache_record.id,
            v_cache_record.results,
            v_cache_record.results_count,
            v_cache_record.hit_count + 1,
            TRUE;
    ELSE
        -- No cache found
        RETURN QUERY SELECT
            NULL::UUID,
            '{}'::JSONB,
            0,
            0,
            FALSE;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- FUNCTION: Store search results in cache
-- Upserts cache entry
-- ============================================
CREATE OR REPLACE FUNCTION store_search_cache(
    p_group_id UUID,
    p_query_text TEXT,
    p_query_normalized TEXT,
    p_query_embedding vector(1536),
    p_results JSONB,
    p_results_count INT,
    p_search_type TEXT DEFAULT 'vector'
)
RETURNS UUID AS $$
DECLARE
    v_cache_id UUID;
BEGIN
    INSERT INTO public.t_query_cache (
        group_id,
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
        p_group_id,
        p_query_text,
        p_query_normalized,
        p_query_embedding,
        p_results,
        p_results_count,
        p_search_type,
        1,
        NOW(),
        NOW(),
        NOW(),
        NOW() + INTERVAL '45 days'
    )
    ON CONFLICT (group_id, query_normalized)
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
-- CLEANUP: Remove expired cache entries
-- Run this periodically (cron job or scheduled function)
-- ============================================
CREATE OR REPLACE FUNCTION cleanup_expired_cache()
RETURNS INT AS $$
DECLARE
    v_deleted_count INT;
BEGIN
    DELETE FROM public.t_query_cache
    WHERE expires_at < NOW();

    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- RLS Policies
-- ============================================
ALTER TABLE public.t_query_cache ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read cache for groups they have access to
CREATE POLICY "Users can read cache for their groups" ON public.t_query_cache
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.t_group_memberships gm
            WHERE gm.group_id = t_query_cache.group_id
              AND gm.tenant_id = auth.uid()::text
              AND gm.status = 'active'
        )
    );

-- Service role can do everything
CREATE POLICY "Service role full access" ON public.t_query_cache
    FOR ALL
    USING (auth.role() = 'service_role');

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON public.t_query_cache TO authenticated;
GRANT ALL ON public.t_query_cache TO service_role;

COMMENT ON TABLE public.t_query_cache IS 'Cache for AI search queries with 45-day sliding expiration';
