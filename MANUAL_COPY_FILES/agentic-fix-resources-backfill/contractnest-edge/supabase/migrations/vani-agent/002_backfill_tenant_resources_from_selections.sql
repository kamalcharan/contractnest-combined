-- ============================================================================
-- FIX: Backfill t_category_resources_master from onboarding selections
-- ============================================================================
-- BUG (found 2026-07-02): Settings → Resources reads t_category_resources_master
-- (tenant-scoped), but the onboarding/seed pipeline never materializes the
-- tenant's selected resource templates (t_tenant_selected_resources) into it.
-- Tenants whose resources exist (e.g. rows from Feb 2026) got them via the
-- Resources UI manually. hubb has 24 selections but 0 materialized resources —
-- so Settings → Resources is empty and VaNi coverage derivation finds nothing,
-- even though Business Profile industries are correct (different table).
--
-- WHAT THIS DOES (idempotent, read-your-own-selections):
--   For EVERY tenant, insert one t_category_resources_master row per DISTINCT
--   selected resource template that has no same-name row of the same type yet.
--   No existing rows are modified or deleted. Applies to is_live = true.
--
-- ⚠️ OWNER-APPLIED ONLY via Supabase SQL editor. Review the SELECT below first.
-- ============================================================================

-- Preview what will be inserted (run this first):
--
-- SELECT tsr.tenant_id, rt.name, rt.resource_type_id, rt.sub_category
-- FROM (SELECT DISTINCT tenant_id, resource_template_id FROM t_tenant_selected_resources) tsr
-- JOIN m_catalog_resource_templates rt ON rt.id = tsr.resource_template_id
-- WHERE NOT EXISTS (
--   SELECT 1 FROM t_category_resources_master m
--   WHERE m.tenant_id = tsr.tenant_id
--     AND lower(m.name) = lower(rt.name)
--     AND m.resource_type_id = rt.resource_type_id
--     AND m.is_live = true
-- )
-- ORDER BY tsr.tenant_id, rt.resource_type_id, rt.name;

INSERT INTO t_category_resources_master (
  id, tenant_id, resource_type_id, name, display_name, description,
  sub_category, sequence_no, is_active, is_deletable, is_live, created_at, updated_at
)
SELECT
  gen_random_uuid(),
  tsr.tenant_id,
  rt.resource_type_id,
  rt.name,
  rt.name,
  rt.description,
  rt.sub_category,
  COALESCE(rt.sort_order, 100),
  true,
  true,
  true,
  now(),
  now()
FROM (SELECT DISTINCT tenant_id, resource_template_id FROM t_tenant_selected_resources) tsr
JOIN m_catalog_resource_templates rt ON rt.id = tsr.resource_template_id
WHERE NOT EXISTS (
  SELECT 1 FROM t_category_resources_master m
  WHERE m.tenant_id = tsr.tenant_id
    AND lower(m.name) = lower(rt.name)
    AND m.resource_type_id = rt.resource_type_id
    AND m.is_live = true
);

-- Verify (hubb should now show HVAC System, DG Set, Elevator/Lift, UPS,
-- STP/WTP Plant, Transformer, Ventilator, consultations, etc.):
--
-- SELECT resource_type_id, name, sub_category
-- FROM t_category_resources_master
-- WHERE tenant_id = '1f0a8dd2-d467-458f-8598-fe5c69548d7e' AND is_live = true
-- ORDER BY resource_type_id, name;
