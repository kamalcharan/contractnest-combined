-- ============================================================================
-- Migration: Update Existing Industries as Parent Segments
-- Description: Marks all 15 existing industries as level=0 parent segments
-- Date: 2025-01-10
-- ============================================================================

-- Update all existing industries to be parent segments
UPDATE m_catalog_industries
SET
    parent_id = NULL,
    level = 0,
    segment_type = 'segment',
    updated_at = NOW()
WHERE parent_id IS NULL
  AND level IS NULL;

-- Alternative: Update specific IDs (safer approach)
UPDATE m_catalog_industries
SET
    parent_id = NULL,
    level = 0,
    segment_type = 'segment',
    updated_at = NOW()
WHERE id IN (
    'healthcare',
    'wellness',
    'manufacturing',
    'facility_management',
    'technology',
    'education',
    'financial_services',
    'hospitality',
    'retail',
    'logistics',
    'real_estate',
    'telecommunications',
    'government',
    'automotive',
    'other'
);

-- ============================================================================
-- Verification Query
-- ============================================================================
-- SELECT id, name, level, segment_type, parent_id
-- FROM m_catalog_industries
-- WHERE level = 0
-- ORDER BY sort_order;
