-- ════════════════════════════════════════════════════════════════════════════
-- SPRINT 1 ACCEPTANCE PROOF SCRIPT (Task 6.4)
-- Run after onboarding a FRESH tenant through the 13-step VaNi flow,
-- selecting a leaf segment (e.g. dental_clinics) with ≥2 resources picked.
-- Replace :tenant_id below with the new tenant's uuid.
-- Every assertion maps to the Acceptance Run items in the sprint brief.
-- ════════════════════════════════════════════════════════════════════════════

-- ── 1. Intent persisted (S7 / S8 / S13 / A10) ───────────────────────────────
SELECT 'persona' AS chk, persona FROM t_tenant_profiles WHERE tenant_id = :'tenant_id';
-- EXPECT: seller | buyer | both (NOT NULL)

SELECT 'selected_resources' AS chk, resource_template_id, purpose, source
FROM t_tenant_selected_resources WHERE tenant_id = :'tenant_id';
-- EXPECT: ≥2 rows, source='onboarding'

SELECT 'step_model' AS chk, total_steps, onboarding_type,
       jsonb_object_keys(step_data) AS step_with_data
FROM t_tenant_onboarding WHERE tenant_id = :'tenant_id';
-- EXPECT: total_steps=13, onboarding_type='vani', keys include
--         persona-selection, resource-pick, vani-working, pricing-review

-- ── 2. Seeded catalog with KT lineage (probe flip B0.2/B0.3) ────────────────
SELECT 'seed_blocks' AS chk, b.cat_block_type_name, count(*)
FROM (
  SELECT CASE b.block_type_id
           WHEN 'ae7050b4-3cca-4ed9-aa02-4a1f697b75cc' THEN 'service'
           WHEN '1221e2dd-a603-47fb-9063-c393193514b7' THEN 'spare'
           ELSE b.block_type_id::text END AS cat_block_type_name
  FROM m_cat_blocks b
  WHERE b.tenant_id = :'tenant_id' AND b.is_seed = true AND b.resource_template_id IS NOT NULL
) b GROUP BY 1;
-- EXPECT: ≥1 service AND ≥1 spare

-- Price traceability: block base_price ← m_service_cycles.price_median
SELECT 'price_lineage' AS chk, b.name, b.base_price,
       sc.price_median, ec.service_name, rt.name AS equipment
FROM m_cat_blocks b
JOIN m_catalog_resource_templates rt ON rt.id = b.resource_template_id
JOIN m_equipment_checkpoints ec
  ON ec.resource_template_id = b.resource_template_id AND ec.service_name = b.name
LEFT JOIN m_service_cycles sc ON sc.checkpoint_id = ec.id AND sc.price_median = b.base_price
WHERE b.tenant_id = :'tenant_id' AND b.is_seed = true
LIMIT 10;
-- EXPECT: base_price matches a cycle's price_median for priced blocks

-- ── 4. Buyer leg: registry entries (if persona buyer/both) ──────────────────
SELECT 'registry' AS chk, resource_type_id, name, is_live, template_id
FROM t_client_asset_registry
WHERE tenant_id = :'tenant_id' AND ownership_type = 'self'
  AND specifications->>'seeded_from' = 'onboarding';
-- EXPECT: one row per consented template; resource_type_id 'equipment' rows
--         appear in /equipment-registry, 'asset' rows in /facility-registry;
--         is_live=true after equipment-confirm

-- ── 5. Contract lineage (outcome 3) — after creating a contract from a seeded
--      block through the wizard ────────────────────────────────────────────────
SELECT 'contract_lineage' AS chk, cb.block_name, cb.source_type, cb.source_block_id,
       cb.unit_price, mb.base_price AS catalog_price
FROM t_contract_blocks cb
JOIN t_contracts c ON c.id = cb.contract_id
LEFT JOIN m_cat_blocks mb ON mb.id = cb.source_block_id
WHERE c.tenant_id = :'tenant_id'
ORDER BY cb.created_at DESC LIMIT 5;
-- EXPECT: source_type='catalog', source_block_id NOT NULL = seeded block id,
--         unit_price defaulted from catalog_price

-- ── 6. Negative path: tenant in an uncovered industry ───────────────────────
-- Coverage check used by the seeder (universal templates excluded):
SELECT 'coverage' AS chk, count(*) FILTER (WHERE via IN ('tagged','junction')) AS covered
FROM resolve_industry_resource_templates(ARRAY['<uncovered_industry_id>']);
-- EXPECT: covered = 0 → seed responds status='no_coverage', UI shows amber
--         "no coverage" (no green checkmarks), zero rows in m_cat_blocks.

-- ── 7. §6 probe re-runs (B0.2/B0.3 flip) ────────────────────────────────────
SELECT 'B0.3_platform' AS probe,
       count(*) FILTER (WHERE is_seed)                    AS seed_blocks,
       count(*) FILTER (WHERE resource_template_id IS NOT NULL) AS blocks_with_lineage,
       count(*)                                           AS total_blocks
FROM m_cat_blocks;
-- BEFORE Sprint 1: seed_blocks=0, blocks_with_lineage=0 (probe report §2 B0.3)
-- AFTER acceptance run: both > 0 → B0.2/B0.3 flip to L1

SELECT 'seed_log' AS chk, status, blocks_created, skip_reason, error_message, is_live
FROM t_seed_logs WHERE tenant_id = :'tenant_id' ORDER BY created_at DESC LIMIT 10;
-- Observability: every seed attempt logged, including failures and skips
