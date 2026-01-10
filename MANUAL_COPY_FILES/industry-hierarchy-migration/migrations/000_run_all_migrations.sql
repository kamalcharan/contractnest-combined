-- ============================================================================
-- INDUSTRY HIERARCHY MIGRATION - MASTER SCRIPT
-- ============================================================================
-- Run this script to execute all migrations in order
-- Date: 2025-01-10
-- ============================================================================

-- IMPORTANT: Run these in order!
--
-- Option 1: Run this file directly (if your SQL client supports \i)
-- Option 2: Run each numbered file individually in order
--
-- ============================================================================

\echo '=============================================='
\echo 'Starting Industry Hierarchy Migration'
\echo '=============================================='

\echo ''
\echo '>>> Step 1: Adding hierarchy columns...'
\i 001_add_industry_hierarchy_columns.sql

\echo ''
\echo '>>> Step 2: Updating existing industries as segments...'
\i 002_update_existing_industries_as_segments.sql

\echo ''
\echo '>>> Step 3: Inserting sub-segments...'
\i 003_insert_sub_segments.sql

\echo ''
\echo '>>> Step 4: Creating tenant industry segments table...'
\i 004_create_tenant_industry_segments.sql

\echo ''
\echo '=============================================='
\echo 'Migration Complete!'
\echo '=============================================='

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

\echo ''
\echo '>>> Verification: Parent Segments'
SELECT id, name, level, segment_type
FROM m_catalog_industries
WHERE level = 0
ORDER BY sort_order;

\echo ''
\echo '>>> Verification: Sub-segments Count by Parent'
SELECT
    p.name as parent_segment,
    COUNT(c.id) as sub_segment_count
FROM m_catalog_industries p
LEFT JOIN m_catalog_industries c ON c.parent_id = p.id
WHERE p.level = 0
GROUP BY p.id, p.name, p.sort_order
ORDER BY p.sort_order;

\echo ''
\echo '>>> Verification: Sample Sub-segments'
SELECT
    p.name as parent,
    c.id,
    c.name as sub_segment
FROM m_catalog_industries c
JOIN m_catalog_industries p ON c.parent_id = p.id
WHERE c.level = 1
ORDER BY p.sort_order, c.sort_order
LIMIT 20;
