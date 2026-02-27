-- ============================================================
-- Phase 0c AUDIT: Check category masters with zero details
-- Run this in Supabase SQL Editor and paste the results back
-- ============================================================

-- 1. All category masters with their detail counts
SELECT
  cm.cat_name,
  cm.cat_code,
  cm.is_active,
  COUNT(cd.id) as detail_count
FROM m_category_master cm
LEFT JOIN m_category_details cd ON cd.cat_code = cm.cat_code AND cd.is_active = true
GROUP BY cm.cat_name, cm.cat_code, cm.is_active
ORDER BY detail_count ASC, cm.cat_name;

-- 2. Specific check for the 4 flagged categories
SELECT
  cm.cat_name,
  cm.cat_code,
  cm.is_active,
  cd.sub_cat_name,
  cd.sub_cat_code,
  cd.is_active as detail_active
FROM m_category_master cm
LEFT JOIN m_category_details cd ON cd.cat_code = cm.cat_code
WHERE cm.cat_code IN ('service_statuses', 'tax_applicability', 'resource_pricing_models', 'resource_types')
ORDER BY cm.cat_code, cd.sub_cat_name;

-- 3. Check m_category_details column structure (verify column names)
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'm_category_details'
ORDER BY ordinal_position;

-- 4. Check m_category_master column structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'm_category_master'
ORDER BY ordinal_position;
