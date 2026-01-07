-- ============================================
-- TENANT SMART PROFILES TABLE
-- One AI-enhanced profile per tenant (not per group membership)
-- Searchable across tenants, groups, and product-wide
-- ============================================

-- Ensure pgvector extension exists
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================
-- TABLE: t_tenant_smartprofiles
-- ============================================
CREATE TABLE IF NOT EXISTS public.t_tenant_smartprofiles (
    -- Primary key is tenant_id (one smartprofile per tenant)
    tenant_id UUID PRIMARY KEY REFERENCES public.t_tenants(id) ON DELETE CASCADE,

    -- AI-enhanced profile content
    short_description TEXT,                         -- User's original short description
    ai_enhanced_description TEXT,                   -- AI-enhanced version
    approved_keywords TEXT[] DEFAULT '{}',          -- Approved search keywords
    suggested_keywords TEXT[] DEFAULT '{}',         -- AI-suggested (pending approval)

    -- Profile classification
    profile_type TEXT DEFAULT 'both' CHECK (profile_type IN ('buyer', 'seller', 'both')),

    -- Vector embedding for semantic search
    embedding vector(1536),                         -- OpenAI text-embedding-3-small

    -- Profile status
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'inactive', 'pending_review')),
    is_active BOOLEAN DEFAULT TRUE,

    -- AI processing metadata
    last_enhanced_at TIMESTAMPTZ,                   -- When AI enhancement was last run
    last_embedding_at TIMESTAMPTZ,                  -- When embedding was last generated
    enhancement_source TEXT,                        -- 'manual' | 'website_scrape' | 'ai_only'

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================

-- Index for vector similarity search
CREATE INDEX IF NOT EXISTS idx_smartprofiles_embedding
    ON public.t_tenant_smartprofiles USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100);

-- Index for status filtering
CREATE INDEX IF NOT EXISTS idx_smartprofiles_status
    ON public.t_tenant_smartprofiles(status, is_active);

-- Index for profile type filtering
CREATE INDEX IF NOT EXISTS idx_smartprofiles_profile_type
    ON public.t_tenant_smartprofiles(profile_type);

-- Index for keyword search (GIN for array)
CREATE INDEX IF NOT EXISTS idx_smartprofiles_keywords
    ON public.t_tenant_smartprofiles USING GIN (approved_keywords);

-- ============================================
-- TRIGGER: Update updated_at timestamp
-- ============================================
CREATE OR REPLACE FUNCTION update_smartprofile_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_smartprofiles_updated_at ON public.t_tenant_smartprofiles;
CREATE TRIGGER trg_smartprofiles_updated_at
    BEFORE UPDATE ON public.t_tenant_smartprofiles
    FOR EACH ROW
    EXECUTE FUNCTION update_smartprofile_timestamp();

-- ============================================
-- RLS POLICIES
-- ============================================
ALTER TABLE public.t_tenant_smartprofiles ENABLE ROW LEVEL SECURITY;

-- Policy: Tenants can read/update their own smartprofile
CREATE POLICY "Tenants can manage their own smartprofile"
    ON public.t_tenant_smartprofiles
    FOR ALL
    USING (tenant_id::text = auth.uid()::text);

-- Policy: Authenticated users can read active smartprofiles (for search)
CREATE POLICY "Authenticated users can read active smartprofiles"
    ON public.t_tenant_smartprofiles
    FOR SELECT
    USING (
        auth.role() = 'authenticated'
        AND status = 'active'
        AND is_active = TRUE
    );

-- Policy: Service role has full access
CREATE POLICY "Service role full access to smartprofiles"
    ON public.t_tenant_smartprofiles
    FOR ALL
    USING (auth.role() = 'service_role');

-- ============================================
-- GRANTS
-- ============================================
GRANT SELECT, INSERT, UPDATE ON public.t_tenant_smartprofiles TO authenticated;
GRANT ALL ON public.t_tenant_smartprofiles TO service_role;

-- ============================================
-- COMMENTS
-- ============================================
COMMENT ON TABLE public.t_tenant_smartprofiles IS 'AI-enhanced tenant profiles for semantic search. One profile per tenant, searchable across all groups.';
COMMENT ON COLUMN public.t_tenant_smartprofiles.embedding IS 'OpenAI text-embedding-3-small vector for semantic similarity search';
COMMENT ON COLUMN public.t_tenant_smartprofiles.approved_keywords IS 'Keywords approved by tenant for search matching';
COMMENT ON COLUMN public.t_tenant_smartprofiles.profile_type IS 'buyer = looking to purchase, seller = offering services, both = dual role';
