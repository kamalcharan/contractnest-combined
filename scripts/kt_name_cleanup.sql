-- KT catalog_name maintenance (founder-approved, first run 2026-06-11: 7 rows)
-- Strips leading frequency words from offering names — cadence lives in
-- frequency_value/unit, never in the name (cycles-generator skill rule).
-- SAFE: only updates names where stripping causes NO collision; collision
-- cases are listed for manual/LLM resolution instead.

-- 1) Preview impure names + collision detection
WITH named AS (
  SELECT DISTINCT c.resource_template_id, sc.id, sc.catalog_name,
    trim(regexp_replace(sc.catalog_name, '^(Monthly|Quarterly|Bi-Annual|Half-Yearly|Annual|Weekly|Daily)\s+', '', 'i')) AS stripped
  FROM m_service_cycles sc JOIN m_equipment_checkpoints c ON c.id=sc.checkpoint_id
  WHERE sc.catalog_name ~* '^(monthly|quarterly|bi-annual|half-yearly|annual|weekly|daily)\s'
    AND sc.is_active AND c.is_active
)
SELECT resource_template_id, catalog_name, stripped,
  count(*) OVER (PARTITION BY resource_template_id, stripped) > 1
    OR EXISTS (SELECT 1 FROM m_service_cycles x JOIN m_equipment_checkpoints xc ON xc.id=x.checkpoint_id
               WHERE xc.resource_template_id = named.resource_template_id
                 AND x.catalog_name = named.stripped) AS would_collide
FROM named ORDER BY resource_template_id, catalog_name;

-- 2) Apply (non-colliding only) — uncomment to run
-- WITH impure AS (... same CTE ...)
-- UPDATE m_service_cycles sc SET catalog_name = i.stripped
-- FROM impure i WHERE sc.id = i.id AND NOT i.would_collide;
