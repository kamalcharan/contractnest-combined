-- ============================================================================
-- CATALOG STUDIO: Add Tenant Fields to cat_blocks
-- ============================================================================
-- Purpose: Add tenant_id and is_seed fields for multi-tenancy support
--
-- Changes:
-- 1. tenant_id - UUID for tenant-specific blocks (nullable for global blocks)
-- 2. is_seed - Boolean to mark blocks that should be copied to all tenants
--
-- NOTE: is_admin already exists in the table
-- ============================================================================

-- Add tenant_id column
ALTER TABLE cat_blocks
ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;

-- Add is_seed column (seed blocks are available to all tenants as a copy)
ALTER TABLE cat_blocks
ADD COLUMN IF NOT EXISTS is_seed BOOLEAN NOT NULL DEFAULT false;

-- ============================================================================
-- INDEXES for new columns
-- ============================================================================

-- Index for tenant_id lookups
CREATE INDEX IF NOT EXISTS idx_cat_blocks_tenant_id ON cat_blocks(tenant_id);

-- Index for is_seed lookups
CREATE INDEX IF NOT EXISTS idx_cat_blocks_is_seed ON cat_blocks(is_seed);

-- Composite index for tenant + active blocks
CREATE INDEX IF NOT EXISTS idx_cat_blocks_tenant_active
ON cat_blocks(tenant_id, is_active) WHERE is_active = true;

-- ============================================================================
-- UPDATE RLS POLICIES
-- ============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS read_cat_blocks ON cat_blocks;
DROP POLICY IF EXISTS write_cat_blocks ON cat_blocks;

-- New Read Policy:
-- Users can read:
-- 1. Global blocks (tenant_id IS NULL) that are active and visible
-- 2. Seed blocks (is_seed = true) that are active
-- 3. Their tenant's blocks
-- 4. Admin users can read all blocks
CREATE POLICY read_cat_blocks ON cat_blocks
    FOR SELECT
    USING (
        -- Global blocks (active + visible)
        (tenant_id IS NULL AND is_active = true AND visible = true)
        OR
        -- Seed blocks (active)
        (is_seed = true AND is_active = true)
        OR
        -- Tenant's own blocks - using request header
        (tenant_id::text = current_setting('request.headers', true)::json->>'x-tenant-id')
        OR
        -- Admin users can see all
        (auth.jwt() ->> 'is_admin')::boolean = true
    );

-- New Write Policy:
-- Users can write to their own tenant's blocks OR global blocks if admin
-- Removed admin-only restriction - anyone can CRUD their tenant's blocks
CREATE POLICY write_cat_blocks ON cat_blocks
    FOR ALL
    USING (
        -- User's own tenant blocks
        (tenant_id::text = current_setting('request.headers', true)::json->>'x-tenant-id')
        OR
        -- Admin can write global/seed blocks
        ((auth.jwt() ->> 'is_admin')::boolean = true AND (tenant_id IS NULL OR is_seed = true))
    )
    WITH CHECK (
        -- User's own tenant blocks
        (tenant_id::text = current_setting('request.headers', true)::json->>'x-tenant-id')
        OR
        -- Admin can create global/seed blocks
        ((auth.jwt() ->> 'is_admin')::boolean = true AND (tenant_id IS NULL OR is_seed = true))
    );

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON COLUMN cat_blocks.tenant_id IS 'Tenant UUID for tenant-specific blocks. NULL for global/system blocks.';
COMMENT ON COLUMN cat_blocks.is_seed IS 'If true, this block is available to all tenants as a template copy.';

-- ============================================================================
-- VERIFICATION QUERY
-- ============================================================================

-- Run this to verify the changes:
-- SELECT column_name, data_type, is_nullable, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'cat_blocks'
-- AND column_name IN ('tenant_id', 'is_seed', 'is_admin')
-- ORDER BY ordinal_position;
