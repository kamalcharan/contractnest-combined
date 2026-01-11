-- ============================================================================
-- Migration: Add Industry Hierarchy Support
-- Description: Adds parent_id, level, segment_type columns to m_catalog_industries
-- Date: 2025-01-10
-- ============================================================================

-- Step 1: Add new columns for hierarchy support
ALTER TABLE m_catalog_industries
ADD COLUMN IF NOT EXISTS parent_id VARCHAR(50) NULL,
ADD COLUMN IF NOT EXISTS level INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS segment_type VARCHAR(20) DEFAULT 'segment';

-- Step 2: Add foreign key constraint for parent-child relationship
-- (Only if it doesn't already exist)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_industry_parent'
        AND table_name = 'm_catalog_industries'
    ) THEN
        ALTER TABLE m_catalog_industries
        ADD CONSTRAINT fk_industry_parent
        FOREIGN KEY (parent_id) REFERENCES m_catalog_industries(id)
        ON DELETE SET NULL;
    END IF;
END $$;

-- Step 3: Add check constraint for segment_type
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.check_constraints
        WHERE constraint_name = 'chk_segment_type'
    ) THEN
        ALTER TABLE m_catalog_industries
        ADD CONSTRAINT chk_segment_type
        CHECK (segment_type IN ('segment', 'sub_segment'));
    END IF;
END $$;

-- Step 4: Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_industries_parent_id ON m_catalog_industries(parent_id);
CREATE INDEX IF NOT EXISTS idx_industries_level ON m_catalog_industries(level);
CREATE INDEX IF NOT EXISTS idx_industries_segment_type ON m_catalog_industries(segment_type);
CREATE INDEX IF NOT EXISTS idx_industries_parent_active ON m_catalog_industries(parent_id, is_active);

-- Step 5: Add comment for documentation
COMMENT ON COLUMN m_catalog_industries.parent_id IS 'Reference to parent industry for sub-segments. NULL for top-level segments.';
COMMENT ON COLUMN m_catalog_industries.level IS 'Hierarchy level: 0 = segment (parent), 1 = sub_segment (child)';
COMMENT ON COLUMN m_catalog_industries.segment_type IS 'Type of industry: segment (parent) or sub_segment (child)';

-- ============================================================================
-- Verification Query (run after migration to confirm)
-- ============================================================================
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'm_catalog_industries'
-- AND column_name IN ('parent_id', 'level', 'segment_type');
