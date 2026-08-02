-- =====================================================================
-- DEMO TENANT SETUP — Script 08: Buyer registry hierarchy alignment
-- Migration 009_registry_seed_structured (applied live 2026-08-02) makes
-- the product's registry hierarchical: campus → building → equipment,
-- via specifications.entity_type + parent_asset_id. Script 03 seeded the
-- demo buyers' equipment as flat rows. Align them with the new shape:
-- one named campus + building per buyer (live env), equipment parented
-- underneath. Idempotent.
-- =====================================================================
DO $$
DECLARE
  b record;
  v_campus uuid; v_building uuid;
BEGIN
  FOR b IN SELECT * FROM (VALUES
    ('c0000000-0000-4000-8000-000000000005'::uuid, 'a0000000-0000-4000-8000-000000000005'::uuid,
     'Banjara Hills Campus', 'Main Hospital Block'),
    ('c0000000-0000-4000-8000-000000000006'::uuid, 'a0000000-0000-4000-8000-000000000006'::uuid,
     'Pashamylaram Plant', 'Production Block'),
    ('c0000000-0000-4000-8000-000000000007'::uuid, 'a0000000-0000-4000-8000-000000000007'::uuid,
     'Sriperumbudur Works', 'Plant Shed 1')
  ) AS x(tid, uid, campus_name, building_name) LOOP

    SELECT id INTO v_campus FROM t_client_asset_registry
    WHERE tenant_id = b.tid AND ownership_type = 'self' AND is_live = true
      AND specifications->>'entity_type' = 'campus' LIMIT 1;
    IF v_campus IS NULL THEN
      INSERT INTO t_client_asset_registry (
        tenant_id, ownership_type, resource_type_id, template_id, name,
        status, condition, criticality, specifications, is_active, is_live, created_by, updated_by
      ) VALUES (
        b.tid, 'self', 'asset', NULL, b.campus_name,
        'active', 'good', 'medium',
        jsonb_build_object('seeded_from', 'demo-tenant-setup', 'entity_type', 'campus'),
        true, true, b.uid, b.uid
      ) RETURNING id INTO v_campus;
    END IF;

    SELECT id INTO v_building FROM t_client_asset_registry
    WHERE tenant_id = b.tid AND ownership_type = 'self' AND is_live = true
      AND specifications->>'entity_type' = 'building' LIMIT 1;
    IF v_building IS NULL THEN
      INSERT INTO t_client_asset_registry (
        tenant_id, ownership_type, resource_type_id, template_id, name,
        status, condition, criticality, parent_asset_id, location,
        specifications, is_active, is_live, created_by, updated_by
      ) VALUES (
        b.tid, 'self', 'asset', NULL, b.building_name,
        'active', 'good', 'medium', v_campus, b.campus_name,
        jsonb_build_object('seeded_from', 'demo-tenant-setup', 'entity_type', 'building'),
        true, true, b.uid, b.uid
      ) RETURNING id INTO v_building;
    END IF;

    -- parent the flat equipment rows under the building
    UPDATE t_client_asset_registry a
    SET parent_asset_id = v_building, updated_at = now()
    WHERE a.tenant_id = b.tid AND a.ownership_type = 'self' AND a.is_live = true
      AND a.resource_type_id = 'equipment'
      AND a.parent_asset_id IS NULL;
  END LOOP;
END $$;
