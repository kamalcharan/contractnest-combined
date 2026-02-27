-- ============================================================
-- Phase 0b AUDIT: Find orphan industry_ids
-- Run this in Supabase SQL Editor and paste the results back
-- ============================================================

-- 1. All industry_ids currently used in t_tenant_profiles
SELECT DISTINCT
  tp.industry_id,
  COUNT(DISTINCT tp.tenant_id) as tenant_count,
  string_agg(DISTINCT t.name, ', ') as tenant_names,
  CASE
    WHEN mi.id IS NOT NULL THEN 'EXISTS'
    ELSE 'ORPHAN'
  END as status
FROM t_tenant_profiles tp
JOIN tenants t ON tp.tenant_id = t.id
LEFT JOIN m_catalog_industries mi ON tp.industry_id = mi.id
WHERE tp.industry_id IS NOT NULL
GROUP BY tp.industry_id, mi.id
ORDER BY status DESC, tenant_count DESC;

-- 2. All top-level industries currently in m_catalog_industries
SELECT id, name, parent_id, level, segment_type, is_active
FROM m_catalog_industries
WHERE level = 0
ORDER BY name;

-- 3. All sub-segments currently in m_catalog_industries
SELECT id, name, parent_id, level, segment_type, is_active
FROM m_catalog_industries
WHERE level = 1
ORDER BY parent_id, name;
