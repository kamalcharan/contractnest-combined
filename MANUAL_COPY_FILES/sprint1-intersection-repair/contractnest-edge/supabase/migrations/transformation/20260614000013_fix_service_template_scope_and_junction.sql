-- Fixup for migration 010: service templates were inserted without scope
-- and without junction rows in m_catalog_resource_template_industries.
-- The view v_resource_templates_by_industry does NOT use industry_id on the
-- templates table — it uses the junction table for industry_specific templates
-- and scope='universal' for universal ones.
--
-- Step 1: Set scope on all service templates that are missing it.
UPDATE m_catalog_resource_templates
SET scope = CASE
  WHEN industry_id IS NULL THEN 'universal'
  ELSE 'industry_specific'
END
WHERE resource_type_id = 'service'
  AND (scope IS NULL OR scope = '');

-- Step 2: Insert junction rows for industry-specific service templates.
-- Idempotent via ON CONFLICT DO NOTHING.
INSERT INTO m_catalog_resource_template_industries
  (template_id, industry_id, is_primary, relevance_score)
SELECT
  rt.id,
  rt.industry_id,
  true,
  80
FROM m_catalog_resource_templates rt
WHERE rt.resource_type_id = 'service'
  AND rt.industry_id IS NOT NULL
  AND rt.scope = 'industry_specific'
ON CONFLICT DO NOTHING;
