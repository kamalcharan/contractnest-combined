-- ============================================
-- ALTER t_semantic_clusters
-- Add tenant_id column for SmartProfile clusters
-- Keeps membership_id for existing group-based clusters
-- ============================================

-- Add tenant_id column (nullable - existing rows keep membership_id only)
ALTER TABLE public.t_semantic_clusters
    ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.t_tenants(id) ON DELETE CASCADE;

-- Add index for tenant_id lookups
CREATE INDEX IF NOT EXISTS idx_semantic_clusters_tenant_id
    ON public.t_semantic_clusters(tenant_id)
    WHERE tenant_id IS NOT NULL;

-- Add composite index for tenant + active status
CREATE INDEX IF NOT EXISTS idx_semantic_clusters_tenant_active
    ON public.t_semantic_clusters(tenant_id, is_active)
    WHERE tenant_id IS NOT NULL;

-- ============================================
-- UPDATE RLS POLICIES
-- Add policy for tenant-based access
-- ============================================

-- Policy: Tenants can read their own smartprofile clusters
DROP POLICY IF EXISTS "Tenants can read their smartprofile clusters" ON public.t_semantic_clusters;
CREATE POLICY "Tenants can read their smartprofile clusters"
    ON public.t_semantic_clusters
    FOR SELECT
    USING (
        tenant_id IS NOT NULL
        AND tenant_id::text = auth.uid()::text
    );

-- Policy: Tenants can manage their own smartprofile clusters
DROP POLICY IF EXISTS "Tenants can manage their smartprofile clusters" ON public.t_semantic_clusters;
CREATE POLICY "Tenants can manage their smartprofile clusters"
    ON public.t_semantic_clusters
    FOR ALL
    USING (
        tenant_id IS NOT NULL
        AND tenant_id::text = auth.uid()::text
    );

-- Policy: Authenticated users can read active clusters for search (tenant-based)
DROP POLICY IF EXISTS "Authenticated can read active tenant clusters" ON public.t_semantic_clusters;
CREATE POLICY "Authenticated can read active tenant clusters"
    ON public.t_semantic_clusters
    FOR SELECT
    USING (
        auth.role() = 'authenticated'
        AND tenant_id IS NOT NULL
        AND is_active = TRUE
    );

-- ============================================
-- CONSTRAINT: Either membership_id OR tenant_id must be set
-- ============================================
ALTER TABLE public.t_semantic_clusters
    DROP CONSTRAINT IF EXISTS chk_cluster_owner;

ALTER TABLE public.t_semantic_clusters
    ADD CONSTRAINT chk_cluster_owner
    CHECK (
        (membership_id IS NOT NULL AND tenant_id IS NULL)
        OR (membership_id IS NULL AND tenant_id IS NOT NULL)
    );

-- ============================================
-- COMMENT
-- ============================================
COMMENT ON COLUMN public.t_semantic_clusters.tenant_id IS 'FK to t_tenants for SmartProfile clusters. Mutually exclusive with membership_id.';
