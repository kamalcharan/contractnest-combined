-- ============================================================================
-- Migration: Create Tenant Industry Segments Table
-- Description: Supports multiple sub-segment selection per tenant
-- Date: 2025-01-10
-- ============================================================================

-- Create table for tenant industry segment selections
CREATE TABLE IF NOT EXISTS t_tenant_industry_segments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    industry_id VARCHAR(50) NOT NULL,      -- Parent segment (level 0)
    sub_segment_id VARCHAR(50) NOT NULL,   -- Sub-segment (level 1)
    is_primary BOOLEAN DEFAULT false,       -- Primary sub-segment for display
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Foreign keys
    CONSTRAINT fk_tenant_industry_tenant
        FOREIGN KEY (tenant_id) REFERENCES t_tenants(id) ON DELETE CASCADE,
    CONSTRAINT fk_tenant_industry_parent
        FOREIGN KEY (industry_id) REFERENCES m_catalog_industries(id) ON DELETE RESTRICT,
    CONSTRAINT fk_tenant_industry_sub_segment
        FOREIGN KEY (sub_segment_id) REFERENCES m_catalog_industries(id) ON DELETE RESTRICT,

    -- Unique constraint: tenant can select each sub-segment only once
    CONSTRAINT uq_tenant_sub_segment UNIQUE (tenant_id, sub_segment_id)
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_tenant_segments_tenant_id ON t_tenant_industry_segments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_segments_industry_id ON t_tenant_industry_segments(industry_id);
CREATE INDEX IF NOT EXISTS idx_tenant_segments_sub_segment_id ON t_tenant_industry_segments(sub_segment_id);
CREATE INDEX IF NOT EXISTS idx_tenant_segments_is_primary ON t_tenant_industry_segments(tenant_id, is_primary) WHERE is_primary = true;

-- Add comments for documentation
COMMENT ON TABLE t_tenant_industry_segments IS 'Stores tenant industry and sub-segment selections. Supports multiple sub-segments per tenant.';
COMMENT ON COLUMN t_tenant_industry_segments.tenant_id IS 'Reference to the tenant';
COMMENT ON COLUMN t_tenant_industry_segments.industry_id IS 'Parent industry segment (level 0)';
COMMENT ON COLUMN t_tenant_industry_segments.sub_segment_id IS 'Selected sub-segment (level 1)';
COMMENT ON COLUMN t_tenant_industry_segments.is_primary IS 'Indicates if this is the primary/main sub-segment for display purposes';

-- ============================================================================
-- Trigger: Ensure only one primary per tenant
-- ============================================================================

CREATE OR REPLACE FUNCTION ensure_single_primary_segment()
RETURNS TRIGGER AS $$
BEGIN
    -- If setting this as primary, unset other primaries for same tenant
    IF NEW.is_primary = true THEN
        UPDATE t_tenant_industry_segments
        SET is_primary = false, updated_at = NOW()
        WHERE tenant_id = NEW.tenant_id
          AND id != NEW.id
          AND is_primary = true;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_ensure_single_primary ON t_tenant_industry_segments;
CREATE TRIGGER trg_ensure_single_primary
    BEFORE INSERT OR UPDATE ON t_tenant_industry_segments
    FOR EACH ROW
    WHEN (NEW.is_primary = true)
    EXECUTE FUNCTION ensure_single_primary_segment();

-- ============================================================================
-- Trigger: Validate sub-segment belongs to industry
-- ============================================================================

CREATE OR REPLACE FUNCTION validate_sub_segment_parent()
RETURNS TRIGGER AS $$
DECLARE
    actual_parent_id VARCHAR(50);
BEGIN
    -- Get the actual parent of the sub-segment
    SELECT parent_id INTO actual_parent_id
    FROM m_catalog_industries
    WHERE id = NEW.sub_segment_id;

    -- Validate parent matches
    IF actual_parent_id IS NULL OR actual_parent_id != NEW.industry_id THEN
        RAISE EXCEPTION 'Sub-segment % does not belong to industry %',
            NEW.sub_segment_id, NEW.industry_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_validate_sub_segment ON t_tenant_industry_segments;
CREATE TRIGGER trg_validate_sub_segment
    BEFORE INSERT OR UPDATE ON t_tenant_industry_segments
    FOR EACH ROW
    EXECUTE FUNCTION validate_sub_segment_parent();

-- ============================================================================
-- Enable Row Level Security (RLS)
-- ============================================================================

ALTER TABLE t_tenant_industry_segments ENABLE ROW LEVEL SECURITY;

-- Policy: Tenants can only see their own segments
CREATE POLICY tenant_segments_select_policy ON t_tenant_industry_segments
    FOR SELECT
    USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

-- Policy: Tenants can only insert their own segments
CREATE POLICY tenant_segments_insert_policy ON t_tenant_industry_segments
    FOR INSERT
    WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

-- Policy: Tenants can only update their own segments
CREATE POLICY tenant_segments_update_policy ON t_tenant_industry_segments
    FOR UPDATE
    USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

-- Policy: Tenants can only delete their own segments
CREATE POLICY tenant_segments_delete_policy ON t_tenant_industry_segments
    FOR DELETE
    USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

-- ============================================================================
-- Updated_at Trigger
-- ============================================================================

CREATE OR REPLACE FUNCTION update_tenant_segments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_tenant_segments_updated_at ON t_tenant_industry_segments;
CREATE TRIGGER trg_update_tenant_segments_updated_at
    BEFORE UPDATE ON t_tenant_industry_segments
    FOR EACH ROW
    EXECUTE FUNCTION update_tenant_segments_updated_at();

-- ============================================================================
-- Verification Queries
-- ============================================================================
--
-- Check table structure:
-- \d t_tenant_industry_segments
--
-- Check triggers:
-- SELECT trigger_name, event_manipulation, action_timing
-- FROM information_schema.triggers
-- WHERE event_object_table = 't_tenant_industry_segments';
--
-- Check RLS policies:
-- SELECT policyname, cmd, qual, with_check
-- FROM pg_policies
-- WHERE tablename = 't_tenant_industry_segments';
