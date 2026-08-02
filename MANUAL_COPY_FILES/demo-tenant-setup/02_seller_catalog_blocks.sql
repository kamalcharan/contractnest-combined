-- =====================================================================
-- DEMO TENANT SETUP — Script 02: Seller catalog blocks
-- Part A: KT-derived equipment blocks cloned from the proven seed set of
--         "sharma elevators" (ae85acfe-…), which was produced by the real
--         onboarding seeder (ktCatBlockMapperService → cat-blocks/bulk).
--         Trinity Tecnitions ← HVAC System, UPS System, DG Set
--         Value Elevators    ← Elevator / Lift, DG Set
--         Both test (is_live=false) and live (is_live=true) copies clone over.
-- Part B: Authored service blocks with real INR prices for
--         Freedom Services (pest control) & Hygene Services (housekeeping),
--         created in both environments. (No KT exists for services — Stream 1.)
-- Idempotent via the partial unique index
--   ux_cat_blocks_seed_template_env_name and NOT EXISTS guards.
-- =====================================================================

-- Part A: clone KT blocks (both envs come over because source has both)
INSERT INTO m_cat_blocks (
  id, block_type_id, name, display_name, icon, description, tags, category, config,
  pricing_mode_id, base_price, currency, price_type_id, tax_rate, hsn_sac_code,
  resource_pricing, variant_pricing, is_admin, visible, status_id, is_active,
  version, sequence_no, is_deletable, tenant_id, is_seed, is_live,
  form_template_id, knowledge_tree_ref, resource_template_id, kt_checkpoint_ids
)
SELECT
  gen_random_uuid(), b.block_type_id, b.name, b.display_name, b.icon, b.description, b.tags, b.category, b.config,
  b.pricing_mode_id, b.base_price, b.currency, b.price_type_id, b.tax_rate, b.hsn_sac_code,
  b.resource_pricing, b.variant_pricing, b.is_admin, b.visible, b.status_id, b.is_active,
  b.version, b.sequence_no, b.is_deletable, x.tid::uuid, b.is_seed, b.is_live,
  b.form_template_id, b.knowledge_tree_ref, b.resource_template_id, b.kt_checkpoint_ids
FROM m_cat_blocks b
JOIN m_catalog_resource_templates rt ON rt.id = b.resource_template_id
JOIN (VALUES
  ('c0000000-0000-4000-8000-000000000001','HVAC System'),
  ('c0000000-0000-4000-8000-000000000001','UPS System'),
  ('c0000000-0000-4000-8000-000000000001','DG Set (Generator)'),
  ('c0000000-0000-4000-8000-000000000002','Elevator / Lift'),
  ('c0000000-0000-4000-8000-000000000002','DG Set (Generator)')
) AS x(tid, tname) ON x.tname = rt.name AND rt.industry_id = 'facility_management'
WHERE b.tenant_id = 'ae85acfe-1952-46b6-854f-888731286258' AND b.is_seed
  AND NOT EXISTS (
    SELECT 1 FROM m_cat_blocks e
    WHERE e.tenant_id = x.tid::uuid AND e.is_seed
      AND e.resource_template_id = b.resource_template_id
      AND e.is_live = b.is_live AND e.name = b.name
  );

-- Part B: authored service blocks (Freedom = pest control, Hygene = housekeeping)
DO $$
DECLARE
  svc jsonb; env boolean;
  v_block_type_service uuid := 'ae7050b4-3cca-4ed9-aa02-4a1f697b75cc';
  v_mode_independent   uuid := '718f839d-9d41-4212-b2b0-553a2198fb86';
  v_pt_per_session     uuid := '8b0cec60-d7de-495b-a06f-d7a58f5c0c4b';
  v_pt_per_unit        uuid := 'ee896155-2aab-4aa3-934e-34bac9226a53';
  v_pt_fixed           uuid := '9c74b90e-770b-41c0-ab7c-3c140061415c';
  v_cfg jsonb := '[
    {"t":"c0000000-0000-4000-8000-000000000003","n":"General Pest Control - Commercial","pt":"per_session","p":4500,"sac":"998531","icon":"🐜",
     "d":"Integrated pest management for offices and commercial premises - cockroach, ant and general crawling insect control with residual spray and gel treatment."},
    {"t":"c0000000-0000-4000-8000-000000000003","n":"General Pest Control - Industrial","pt":"per_session","p":7500,"sac":"998531","icon":"🏭",
     "d":"Industrial-grade pest control for plants and warehouses - covers larger areas, loading bays and storage zones with HACCP-compatible chemicals."},
    {"t":"c0000000-0000-4000-8000-000000000003","n":"Termite Treatment (Anti-Termite Chemical Barrier)","pt":"fixed","p":28000,"sac":"998531","icon":"🪵",
     "d":"Drill-fill-seal anti-termite treatment along walls and foundations with 5-year warranty. Pricing for up to 2000 sq.ft built-up area."},
    {"t":"c0000000-0000-4000-8000-000000000003","n":"Rodent Control Program","pt":"per_session","p":3500,"sac":"998531","icon":"🐀",
     "d":"Rodent stations, glue traps and entry-point proofing with monthly monitoring log. Suitable for food-handling and pharma-adjacent areas."},
    {"t":"c0000000-0000-4000-8000-000000000003","n":"Mosquito Fogging Service","pt":"per_session","p":2500,"sac":"998531","icon":"🦟",
     "d":"Thermal fogging of open and peripheral areas plus larvicide treatment of stagnant water points. Evening application per session."},
    {"t":"c0000000-0000-4000-8000-000000000003","n":"Bed Bug Treatment","pt":"per_session","p":6000,"sac":"998531","icon":"🛏️",
     "d":"Two-round bed bug elimination (spray + steam) for hostels, hotels and hospital wards, with 30-day re-infestation guarantee."},
    {"t":"c0000000-0000-4000-8000-000000000003","n":"Cockroach Gel Treatment","pt":"per_session","p":2000,"sac":"998531","icon":"🪳",
     "d":"Odourless gel-bait application in kitchens, pantries and electrical ducts - safe for occupied premises, no evacuation needed."},
    {"t":"c0000000-0000-4000-8000-000000000003","n":"Bird Netting & Proofing","pt":"fixed","p":18000,"sac":"998531","icon":"🕊️",
     "d":"UV-stabilized nylon netting and spike installation for facades, AC decks and terraces. Pricing per standard elevation section."},
    {"t":"c0000000-0000-4000-8000-000000000003","n":"Fumigation - Warehouse / Container","pt":"per_session","p":9500,"sac":"998531","icon":"📦",
     "d":"ALP/MBr fumigation of warehouses, silos and export containers with gas-tight sheeting and government-compliant certification."},
    {"t":"c0000000-0000-4000-8000-000000000003","n":"Wood Borer Treatment","pt":"per_session","p":5500,"sac":"998531","icon":"🪑",
     "d":"Injection treatment of infested furniture and wooden fixtures with preventive surface coating for surrounding woodwork."},

    {"t":"c0000000-0000-4000-8000-000000000004","n":"Daily Housekeeping Deployment - per Housekeeper (Monthly)","pt":"fixed","p":22000,"sac":"998533","icon":"🧹",
     "d":"Trained housekeeper deployed daily (26 days/month, 8-hr shift) with uniform, ID and supervision. Consumables billed separately."},
    {"t":"c0000000-0000-4000-8000-000000000004","n":"Housekeeping Supervisor Deployment (Monthly)","pt":"fixed","p":32000,"sac":"998533","icon":"🧑‍💼",
     "d":"Site supervisor managing rosters, checklists, consumable indents and daily quality audits across deployed housekeeping staff."},
    {"t":"c0000000-0000-4000-8000-000000000004","n":"Deep Cleaning - Office Space (per 1000 sq.ft)","pt":"per_unit","p":3500,"sac":"998533","icon":"🧽",
     "d":"Machine scrubbing of floors, workstation sanitization, glass partitions, ceiling cobweb removal and washroom descaling."},
    {"t":"c0000000-0000-4000-8000-000000000004","n":"Deep Cleaning - Hospital / Clinical Area (per 1000 sq.ft)","pt":"per_unit","p":5500,"sac":"998533","icon":"🏥",
     "d":"Hospital-grade terminal cleaning with approved disinfectants, fogging and swab-test readiness for wards, OTs and ICUs."},
    {"t":"c0000000-0000-4000-8000-000000000004","n":"Facade & Glass Cleaning","pt":"per_session","p":15000,"sac":"998533","icon":"🏢",
     "d":"External facade and glass cleaning using rope-access/spider technicians with safety certification. Per elevation session."},
    {"t":"c0000000-0000-4000-8000-000000000004","n":"Carpet Shampooing (per 100 sq.ft)","pt":"per_unit","p":1200,"sac":"998533","icon":"🧴",
     "d":"Injection-extraction carpet shampooing with stain treatment and fast-dry process for offices and hotels."},
    {"t":"c0000000-0000-4000-8000-000000000004","n":"Marble Polishing & Crystallization (per 100 sq.ft)","pt":"per_unit","p":2800,"sac":"998533","icon":"✨",
     "d":"Diamond-pad grinding, polishing and crystallization restoring gloss on marble/granite lobbies and corridors."},
    {"t":"c0000000-0000-4000-8000-000000000004","n":"Washroom Hygiene Program (Monthly)","pt":"fixed","p":8500,"sac":"998533","icon":"🚻",
     "d":"Scheduled washroom servicing with air fresheners, sanitizer dispensers, urinal sleeves and hygiene consumable refills."},
    {"t":"c0000000-0000-4000-8000-000000000004","n":"Sofa & Upholstery Cleaning (per seat)","pt":"per_unit","p":450,"sac":"998533","icon":"🛋️",
     "d":"Dry-foam upholstery cleaning with fabric-safe chemicals and vacuum extraction, per seat pricing."},
    {"t":"c0000000-0000-4000-8000-000000000004","n":"Pantry & Cafeteria Cleaning (Monthly)","pt":"fixed","p":12000,"sac":"998533","icon":"🍽️",
     "d":"Daily pantry and cafeteria upkeep - degreasing, table sanitization, waste segregation and weekly deep-clean of equipment surfaces."}
  ]'::jsonb;
  v_pt_id uuid;
BEGIN
  FOR svc IN SELECT * FROM jsonb_array_elements(v_cfg) LOOP
    v_pt_id := CASE svc->>'pt'
      WHEN 'per_session' THEN v_pt_per_session
      WHEN 'per_unit'    THEN v_pt_per_unit
      ELSE v_pt_fixed END;
    FOREACH env IN ARRAY ARRAY[true, false] LOOP
      INSERT INTO m_cat_blocks (
        id, block_type_id, name, display_name, icon, description, tags, config,
        pricing_mode_id, base_price, currency, price_type_id, tax_rate, hsn_sac_code,
        is_admin, visible, is_active, version, sequence_no, is_deletable,
        tenant_id, is_seed, is_live
      )
      SELECT gen_random_uuid(), v_block_type_service, svc->>'n', svc->>'n', svc->>'icon', svc->>'d', '[]'::jsonb,
        jsonb_build_object(
          'priceType', svc->>'pt', 'pricingMode', 'independent', 'deliveryMode', 'onsite',
          'pricingRecords', jsonb_build_array(jsonb_build_object(
            'id','1','taxes','[]'::jsonb,'amount',(svc->>'p')::numeric,'currency','INR',
            'is_active',true,'price_type',svc->>'pt','tax_inclusion','exclusive'))
        ),
        v_mode_independent, (svc->>'p')::numeric, 'INR', v_pt_id, 18, svc->>'sac',
        false, true, true, 1, 0, true,
        (svc->>'t')::uuid, false, env
      WHERE NOT EXISTS (
        SELECT 1 FROM m_cat_blocks e
        WHERE e.tenant_id = (svc->>'t')::uuid AND e.name = svc->>'n' AND e.is_live = env
      );
    END LOOP;
  END LOOP;
END $$;
