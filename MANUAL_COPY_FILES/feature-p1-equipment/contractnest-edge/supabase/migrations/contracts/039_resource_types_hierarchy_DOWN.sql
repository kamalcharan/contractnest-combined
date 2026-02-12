-- 039_resource_types_hierarchy_DOWN.sql
-- Rollback: remove equipment subcategories and parent_type_id column

DELETE FROM m_catalog_resource_types
WHERE parent_type_id IS NOT NULL;

DROP INDEX IF EXISTS idx_mrt_parent_type_id;

ALTER TABLE m_catalog_resource_types
  DROP CONSTRAINT IF EXISTS fk_mrt_parent_type;

ALTER TABLE m_catalog_resource_types
  DROP COLUMN IF EXISTS parent_type_id;
