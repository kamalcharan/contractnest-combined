-- =====================================================================
-- DEMO TENANT SETUP — Script 05: Contracts + blocks + events + payments
-- 16 contracts per seller (64 total), all 12-month duration:
--   nn 01-03  anchor contracts to Pulse Hospital / Complex Pharma / Gold Fusionn (active)
--   nn 04-10  active filler contracts (varied cadence/starts)
--   nn 11     expiring soon (started Sep 2025)
--   nn 12     recent monthly start
--   nn 13     half-yearly cadence
--   nn 14     completed last year (renewal story)
--   nn 15     draft   nn 16 sent   (no events — events derive on activation)
-- Blocks per contract: Terms text, Service visits, Billing fee.
-- Billing events are CALENDAR-ALIGNED (start + k months — deliberately
-- avoids the known day-count drift bug in the derivation engine).
-- Past billing events are paid (amount_settled=amount); the most recent
-- past cycle of every 3rd contract is overdue. Past service events are
-- completed. Draft/sent contracts carry no events.
-- Contract ids: f<seller>000000-0000-4000-8000-0000000000<nn>
-- CNAK: CNAK-D<s><nn>A<s>  (stable, needed by script 06 claims)
-- Idempotent: skips any contract id that already exists.
-- =====================================================================
DO $$
DECLARE
  k jsonb; j int; kk int;
  v_tid uuid; v_cid uuid; v_num json; v_cnak text;
  v_start date; v_end date; v_status text;
  v_cycles int; v_cyc_months int; v_amt numeric; v_total numeric; v_tax numeric; v_grand numeric;
  v_visits int; v_svc_id uuid; v_bill_id uuid; v_txt_id uuid;
  v_buyer_company text; v_person_name text;
  v_evt_date date; v_evt_status text; v_label_cad text;
  v_nom_code text; v_nom_name text; v_svc_name text;
  v_today date := current_date;
  v_cfg jsonb := '[
    {"s":1,"nn":"01","b":"ee000000-0100-4000-8000-000000000005","p":"ef000000-0100-4000-8000-000000000005","nm":"Comprehensive HVAC AMC - Pulse Hospital","st":"active","sd":"2026-01-01","cad":"quarterly","amt":212500,"v":12},
    {"s":1,"nn":"02","b":"ee000000-0100-4000-8000-000000000006","p":"ef000000-0100-4000-8000-000000000006","nm":"AHU & Chiller AMC - Complex Pharma","st":"active","sd":"2026-02-01","cad":"quarterly","amt":150000,"v":12},
    {"s":1,"nn":"03","b":"ee000000-0100-4000-8000-000000000007","p":"ef000000-0100-4000-8000-000000000007","nm":"HVAC AMC - Gold Fusionn Plant","st":"active","sd":"2026-03-01","cad":"quarterly","amt":90000,"v":8},
    {"s":1,"nn":"04","b":"ea000000-0100-4000-8000-000000000001","p":"eb000000-0100-4000-8000-000000000001","nm":"HVAC AMC - Orchid Grand Hotel","st":"active","sd":"2026-02-01","cad":"quarterly","amt":62500,"v":8},
    {"s":1,"nn":"05","b":"ea000000-0100-4000-8000-000000000002","p":"eb000000-0100-4000-8000-000000000002","nm":"Clinic HVAC AMC - Medicover","st":"active","sd":"2026-03-01","cad":"quarterly","amt":45000,"v":6},
    {"s":1,"nn":"06","b":"ea000000-0100-4000-8000-000000000003","p":"eb000000-0100-4000-8000-000000000003","nm":"Mall HVAC AMC - Sunrise Mall","st":"active","sd":"2026-04-01","cad":"quarterly","amt":75000,"v":8},
    {"s":1,"nn":"07","b":"ea000000-0100-4000-8000-000000000004","p":"eb000000-0100-4000-8000-000000000004","nm":"Campus HVAC AMC - TechPark One","st":"active","sd":"2026-01-01","cad":"quarterly","amt":112500,"v":12},
    {"s":1,"nn":"08","b":"ea000000-0100-4000-8000-000000000005","p":"eb000000-0100-4000-8000-000000000005","nm":"Cold Room AMC - Krishna Cold Storage","st":"active","sd":"2026-05-01","cad":"quarterly","amt":37500,"v":6},
    {"s":1,"nn":"09","b":"ea000000-0100-4000-8000-000000000006","p":"eb000000-0100-4000-8000-000000000006","nm":"HVAC AMC - Apex Diagnostics","st":"active","sd":"2026-06-01","cad":"quarterly","amt":30000,"v":4},
    {"s":1,"nn":"10","b":"ea000000-0100-4000-8000-000000000007","p":null,"nm":"HVAC AMC - Delta BPO Towers","st":"active","sd":"2026-02-01","cad":"quarterly","amt":87500,"v":8},
    {"s":1,"nn":"11","b":"ea000000-0100-4000-8000-000000000008","p":null,"nm":"HVAC AMC - GreenLeaf Residency","st":"active","sd":"2025-09-01","cad":"quarterly","amt":40000,"v":6},
    {"s":1,"nn":"12","b":"ea000000-0100-4000-8000-000000000009","p":null,"nm":"Convention HVAC O&M - Novotel","st":"active","sd":"2026-06-01","cad":"monthly","amt":55000,"v":12},
    {"s":1,"nn":"13","b":"ea000000-0100-4000-8000-000000000010","p":null,"nm":"Pharma HVAC AMC - Sri Vishnu Labs","st":"active","sd":"2026-04-01","cad":"halfyearly","amt":120000,"v":6},
    {"s":1,"nn":"14","b":"ea000000-0100-4000-8000-000000000001","p":"eb000000-0100-4000-8000-000000000001","nm":"HVAC AMC 2025 - Orchid Grand Hotel","st":"completed","sd":"2025-04-01","cad":"quarterly","amt":60000,"v":8},
    {"s":1,"nn":"15","b":"ea000000-0100-4000-8000-000000000002","p":"eb000000-0100-4000-8000-000000000002","nm":"HVAC AMC Renewal FY27 - Medicover","st":"draft","sd":"2026-09-01","cad":"quarterly","amt":47500,"v":6},
    {"s":1,"nn":"16","b":"ea000000-0100-4000-8000-000000000003","p":"eb000000-0100-4000-8000-000000000003","nm":"HVAC AMC Renewal - Sunrise Mall","st":"sent","sd":"2026-09-01","cad":"quarterly","amt":78750,"v":8},
    {"s":2,"nn":"01","b":"ee000000-0200-4000-8000-000000000005","p":"ef000000-0200-4000-8000-000000000005","nm":"Lift AMC (3 Lifts) - Pulse Hospital","st":"active","sd":"2026-01-01","cad":"quarterly","amt":41250,"v":12},
    {"s":2,"nn":"02","b":"ee000000-0200-4000-8000-000000000006","p":"ef000000-0200-4000-8000-000000000006","nm":"Goods Lift AMC - Complex Pharma","st":"active","sd":"2026-02-01","cad":"quarterly","amt":15000,"v":6},
    {"s":2,"nn":"03","b":"ee000000-0200-4000-8000-000000000007","p":"ef000000-0200-4000-8000-000000000007","nm":"Material Hoist AMC - Gold Fusionn","st":"active","sd":"2026-03-01","cad":"quarterly","amt":18000,"v":6},
    {"s":2,"nn":"04","b":"ea000000-0200-4000-8000-000000000001","p":"eb000000-0200-4000-8000-000000000001","nm":"Lift AMC (4 Lifts) - Skyline Towers","st":"active","sd":"2026-01-01","cad":"quarterly","amt":55000,"v":12},
    {"s":2,"nn":"05","b":"ea000000-0200-4000-8000-000000000002","p":"eb000000-0200-4000-8000-000000000002","nm":"Lift AMC - Metro Business Center","st":"active","sd":"2026-02-01","cad":"quarterly","amt":30000,"v":8},
    {"s":2,"nn":"06","b":"ea000000-0200-4000-8000-000000000003","p":"eb000000-0200-4000-8000-000000000003","nm":"Lift & Escalator AMC - City Central Mall","st":"active","sd":"2026-01-01","cad":"quarterly","amt":90000,"v":12},
    {"s":2,"nn":"07","b":"ea000000-0200-4000-8000-000000000004","p":"eb000000-0200-4000-8000-000000000004","nm":"Lift AMC - Lotus Grand Apartments","st":"active","sd":"2026-04-01","cad":"quarterly","amt":45000,"v":8},
    {"s":2,"nn":"08","b":"ea000000-0200-4000-8000-000000000005","p":"eb000000-0200-4000-8000-000000000005","nm":"Campus Lift AMC - Prestige Tech Campus","st":"active","sd":"2026-03-01","cad":"quarterly","amt":82500,"v":12},
    {"s":2,"nn":"09","b":"ea000000-0200-4000-8000-000000000006","p":"eb000000-0200-4000-8000-000000000006","nm":"Hospital Lift AMC - Global Hospital Annex","st":"active","sd":"2026-05-01","cad":"quarterly","amt":33000,"v":8},
    {"s":2,"nn":"10","b":"ea000000-0200-4000-8000-000000000007","p":null,"nm":"Lift AMC - Imperial Heights","st":"active","sd":"2026-06-01","cad":"quarterly","amt":27500,"v":6},
    {"s":2,"nn":"11","b":"ea000000-0200-4000-8000-000000000008","p":null,"nm":"Lift AMC - Raintree Hotel","st":"active","sd":"2025-09-01","cad":"quarterly","amt":24000,"v":6},
    {"s":2,"nn":"12","b":"ea000000-0200-4000-8000-000000000009","p":null,"nm":"Lift AMC - SLN Commercial Complex","st":"active","sd":"2026-06-01","cad":"monthly","amt":12000,"v":12},
    {"s":2,"nn":"13","b":"ea000000-0200-4000-8000-000000000010","p":null,"nm":"Lift AMC - MyHome Towers","st":"active","sd":"2026-04-01","cad":"halfyearly","amt":66000,"v":6},
    {"s":2,"nn":"14","b":"ea000000-0200-4000-8000-000000000001","p":"eb000000-0200-4000-8000-000000000001","nm":"Lift AMC 2025 - Skyline Towers","st":"completed","sd":"2025-04-01","cad":"quarterly","amt":50000,"v":12},
    {"s":2,"nn":"15","b":"ea000000-0200-4000-8000-000000000002","p":"eb000000-0200-4000-8000-000000000002","nm":"Lift AMC Renewal FY27 - Metro Business Center","st":"draft","sd":"2026-09-01","cad":"quarterly","amt":32000,"v":8},
    {"s":2,"nn":"16","b":"ea000000-0200-4000-8000-000000000003","p":"eb000000-0200-4000-8000-000000000003","nm":"Lift & Escalator AMC Renewal - City Central Mall","st":"sent","sd":"2026-09-01","cad":"quarterly","amt":95000,"v":12},
    {"s":3,"nn":"01","b":"ee000000-0300-4000-8000-000000000005","p":"ef000000-0300-4000-8000-000000000005","nm":"Integrated Pest Management - Pulse Hospital","st":"active","sd":"2026-01-01","cad":"monthly","amt":20000,"v":12},
    {"s":3,"nn":"02","b":"ee000000-0300-4000-8000-000000000006","p":"ef000000-0300-4000-8000-000000000006","nm":"GMP Pest Control Program - Complex Pharma","st":"active","sd":"2026-02-01","cad":"monthly","amt":15000,"v":12},
    {"s":3,"nn":"03","b":"ee000000-0300-4000-8000-000000000007","p":"ef000000-0300-4000-8000-000000000007","nm":"Plant Pest Control AMC - Gold Fusionn","st":"active","sd":"2026-03-01","cad":"quarterly","amt":30000,"v":8},
    {"s":3,"nn":"04","b":"ea000000-0300-4000-8000-000000000001","p":"eb000000-0300-4000-8000-000000000001","nm":"Kitchen Pest Control - Spice Garden","st":"active","sd":"2026-01-01","cad":"monthly","amt":12000,"v":12},
    {"s":3,"nn":"05","b":"ea000000-0300-4000-8000-000000000002","p":"eb000000-0300-4000-8000-000000000002","nm":"Hotel Pest Control AMC - Grand Kakatiya","st":"active","sd":"2026-02-01","cad":"monthly","amt":18000,"v":12},
    {"s":3,"nn":"06","b":"ea000000-0300-4000-8000-000000000003","p":"eb000000-0300-4000-8000-000000000003","nm":"Store Pest Control - FreshMart","st":"active","sd":"2026-03-01","cad":"quarterly","amt":21000,"v":8},
    {"s":3,"nn":"07","b":"ea000000-0300-4000-8000-000000000004","p":"eb000000-0300-4000-8000-000000000004","nm":"Campus Pest Control - Sunshine School","st":"active","sd":"2026-04-01","cad":"quarterly","amt":15000,"v":4},
    {"s":3,"nn":"08","b":"ea000000-0300-4000-8000-000000000005","p":"eb000000-0300-4000-8000-000000000005","nm":"Warehouse Fumigation AMC - Ananta","st":"active","sd":"2026-02-01","cad":"quarterly","amt":24000,"v":8},
    {"s":3,"nn":"09","b":"ea000000-0300-4000-8000-000000000006","p":"eb000000-0300-4000-8000-000000000006","nm":"Community Pest Control - Green Meadows","st":"active","sd":"2026-05-01","cad":"quarterly","amt":18000,"v":4},
    {"s":3,"nn":"10","b":"ea000000-0300-4000-8000-000000000007","p":null,"nm":"Mill Pest & Rodent Control - Krishna Rice Mills","st":"active","sd":"2026-06-01","cad":"monthly","amt":10000,"v":12},
    {"s":3,"nn":"11","b":"ea000000-0300-4000-8000-000000000008","p":null,"nm":"DC Pest Control - MedPlus Distribution","st":"active","sd":"2025-09-01","cad":"quarterly","amt":19500,"v":6},
    {"s":3,"nn":"12","b":"ea000000-0300-4000-8000-000000000009","p":null,"nm":"Resort Pest Control - Bella Vista","st":"active","sd":"2026-06-01","cad":"monthly","amt":14000,"v":12},
    {"s":3,"nn":"13","b":"ea000000-0300-4000-8000-000000000010","p":null,"nm":"Office Pest Control - Corniche","st":"active","sd":"2026-04-01","cad":"halfyearly","amt":36000,"v":4},
    {"s":3,"nn":"14","b":"ea000000-0300-4000-8000-000000000001","p":"eb000000-0300-4000-8000-000000000001","nm":"Kitchen Pest Control 2025 - Spice Garden","st":"completed","sd":"2025-04-01","cad":"monthly","amt":11000,"v":12},
    {"s":3,"nn":"15","b":"ea000000-0300-4000-8000-000000000002","p":"eb000000-0300-4000-8000-000000000002","nm":"Pest Control Renewal FY27 - Grand Kakatiya","st":"draft","sd":"2026-09-01","cad":"monthly","amt":19000,"v":12},
    {"s":3,"nn":"16","b":"ea000000-0300-4000-8000-000000000003","p":"eb000000-0300-4000-8000-000000000003","nm":"Pest Control Renewal - FreshMart","st":"sent","sd":"2026-09-01","cad":"quarterly","amt":22000,"v":8},
    {"s":4,"nn":"01","b":"ee000000-0400-4000-8000-000000000005","p":"ef000000-0400-4000-8000-000000000005","nm":"Housekeeping Services (10 Staff) - Pulse Hospital","st":"active","sd":"2026-01-01","cad":"monthly","amt":220000,"v":12},
    {"s":4,"nn":"02","b":"ee000000-0400-4000-8000-000000000006","p":"ef000000-0400-4000-8000-000000000006","nm":"GMP Housekeeping (6 Staff) - Complex Pharma","st":"active","sd":"2026-02-01","cad":"monthly","amt":132000,"v":12},
    {"s":4,"nn":"03","b":"ee000000-0400-4000-8000-000000000007","p":"ef000000-0400-4000-8000-000000000007","nm":"Plant Housekeeping (3 Staff) - Gold Fusionn","st":"active","sd":"2026-03-01","cad":"monthly","amt":66000,"v":12},
    {"s":4,"nn":"04","b":"ea000000-0400-4000-8000-000000000001","p":"eb000000-0400-4000-8000-000000000001","nm":"Tower Housekeeping - Landmark Towers","st":"active","sd":"2026-01-01","cad":"monthly","amt":88000,"v":12},
    {"s":4,"nn":"05","b":"ea000000-0400-4000-8000-000000000002","p":"eb000000-0400-4000-8000-000000000002","nm":"Clinic Housekeeping - Apollo Kilpauk","st":"active","sd":"2026-02-01","cad":"monthly","amt":44000,"v":12},
    {"s":4,"nn":"06","b":"ea000000-0400-4000-8000-000000000003","p":"eb000000-0400-4000-8000-000000000003","nm":"IT Park Housekeeping (8 Staff) - Chennai One","st":"active","sd":"2026-01-01","cad":"monthly","amt":176000,"v":12},
    {"s":4,"nn":"07","b":"ea000000-0400-4000-8000-000000000004","p":"eb000000-0400-4000-8000-000000000004","nm":"Hotel Housekeeping Support - Trident","st":"active","sd":"2026-03-01","cad":"monthly","amt":110000,"v":12},
    {"s":4,"nn":"08","b":"ea000000-0400-4000-8000-000000000005","p":"eb000000-0400-4000-8000-000000000005","nm":"Campus Housekeeping - SRM College","st":"active","sd":"2026-04-01","cad":"monthly","amt":96000,"v":12},
    {"s":4,"nn":"09","b":"ea000000-0400-4000-8000-000000000006","p":"eb000000-0400-4000-8000-000000000006","nm":"Office Housekeeping - Marina Bay","st":"active","sd":"2026-05-01","cad":"monthly","amt":52000,"v":12},
    {"s":4,"nn":"10","b":"ea000000-0400-4000-8000-000000000007","p":null,"nm":"Corporate Housekeeping - Ceebros House","st":"active","sd":"2026-06-01","cad":"monthly","amt":60000,"v":12},
    {"s":4,"nn":"11","b":"ea000000-0400-4000-8000-000000000008","p":null,"nm":"Mall Housekeeping - VGP Commercial","st":"active","sd":"2025-09-01","cad":"monthly","amt":48000,"v":12},
    {"s":4,"nn":"12","b":"ea000000-0400-4000-8000-000000000009","p":null,"nm":"Quarterly Deep Clean - Olympia Tech Square","st":"active","sd":"2026-06-01","cad":"quarterly","amt":45000,"v":4},
    {"s":4,"nn":"13","b":"ea000000-0400-4000-8000-000000000010","p":null,"nm":"Hygiene Program - Kauvery Medical Center","st":"active","sd":"2026-04-01","cad":"halfyearly","amt":84000,"v":2},
    {"s":4,"nn":"14","b":"ea000000-0400-4000-8000-000000000001","p":"eb000000-0400-4000-8000-000000000001","nm":"Tower Housekeeping 2025 - Landmark Towers","st":"completed","sd":"2025-04-01","cad":"monthly","amt":80000,"v":12},
    {"s":4,"nn":"15","b":"ea000000-0400-4000-8000-000000000002","p":"eb000000-0400-4000-8000-000000000002","nm":"Housekeeping Renewal FY27 - Apollo Kilpauk","st":"draft","sd":"2026-09-01","cad":"monthly","amt":46000,"v":12},
    {"s":4,"nn":"16","b":"ea000000-0400-4000-8000-000000000003","p":"eb000000-0400-4000-8000-000000000003","nm":"IT Park Housekeeping Renewal - Chennai One","st":"sent","sd":"2026-09-01","cad":"monthly","amt":180000,"v":12}
  ]'::jsonb;
BEGIN
  FOR k IN SELECT * FROM jsonb_array_elements(v_cfg) LOOP
    v_tid := ('c0000000-0000-4000-8000-00000000000' || (k->>'s'))::uuid;
    v_cid := ('f' || (k->>'s') || '000000-0000-4000-8000-0000000000' || (k->>'nn'))::uuid;
    IF EXISTS (SELECT 1 FROM t_contracts e WHERE e.id = v_cid) THEN CONTINUE; END IF;

    v_status := k->>'st';
    v_start := (k->>'sd')::date;
    v_end := v_start + interval '12 months' - interval '1 day';
    v_amt := (k->>'amt')::numeric;
    v_visits := (k->>'v')::int;
    v_cycles := CASE k->>'cad' WHEN 'monthly' THEN 12 WHEN 'quarterly' THEN 4 WHEN 'halfyearly' THEN 2 ELSE 1 END;
    v_cyc_months := 12 / v_cycles;
    v_total := v_amt * v_cycles;
    v_tax := round(v_total * 0.18, 2);
    v_grand := v_total + v_tax;
    v_label_cad := CASE k->>'cad' WHEN 'monthly' THEN 'Monthly' WHEN 'quarterly' THEN 'Quarterly' WHEN 'halfyearly' THEN 'Half-Yearly' ELSE 'Annual' END;
    v_cnak := 'CNAK-D' || (k->>'s') || (k->>'nn') || 'A' || (k->>'s');
    v_nom_code := CASE WHEN (k->>'s') = '4' THEN 'manpower' ELSE 'amc' END;
    v_nom_name := CASE WHEN (k->>'s') = '4' THEN 'Manpower' ELSE 'AMC' END;
    v_svc_name := CASE k->>'s'
      WHEN '1' THEN 'Preventive Maintenance Visits - HVAC'
      WHEN '2' THEN 'Preventive Maintenance Visits - Lifts'
      WHEN '3' THEN 'Scheduled Pest Control Service'
      ELSE 'Housekeeping Deployment & Monthly Audit' END;

    SELECT company_name INTO v_buyer_company FROM t_contacts WHERE id = (k->>'b')::uuid;
    v_person_name := NULL;
    IF (k->>'p') IS NOT NULL THEN
      SELECT name INTO v_person_name FROM t_contacts WHERE id = (k->>'p')::uuid;
    END IF;

    v_num := generate_unique_sequence_for_contract(v_tid, true);

    INSERT INTO t_contracts (
      id, tenant_id, contract_number, record_type, contract_type, name, description, status,
      buyer_id, buyer_name, buyer_company, buyer_contact_person_id, buyer_contact_person_name,
      acceptance_method, duration_value, duration_unit, grace_period_value, grace_period_unit,
      currency, billing_cycle_type, payment_mode, total_value, tax_total, grand_total,
      selected_tax_rate_ids, sent_at, accepted_at, completed_at, version, is_live, is_active,
      created_by, global_access_id, nomenclature_code, nomenclature_name,
      asset_count, asset_summary, equipment_details, coverage_types, metadata,
      seller_id, start_date, end_date, allow_buyer_to_add_equipment, evidence_policy_type, evidence_selected_forms
    ) VALUES (
      v_cid, v_tid, v_num->>'formatted', 'contract', 'client', k->>'nm',
      'Demo contract - ' || (k->>'nm'), v_status,
      (k->>'b')::uuid, v_buyer_company, v_buyer_company,
      (k->>'p')::uuid, v_person_name,
      'manual', 12, 'months', 30, 'days',
      'INR', k->>'cad', 'defined', v_total, v_tax, v_grand,
      '[]'::jsonb,
      CASE WHEN v_status = 'sent' THEN now() ELSE NULL END,
      CASE WHEN v_status IN ('active','completed') THEN v_start::timestamptz ELSE NULL END,
      CASE WHEN v_status = 'completed' THEN v_end::timestamptz ELSE NULL END,
      1, true, true,
      ('a0000000-0000-4000-8000-00000000000' || (k->>'s'))::uuid,
      v_cnak, v_nom_code, v_nom_name,
      0, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, jsonb_build_object('seeded_from','demo-tenant-setup'),
      v_tid, v_start::timestamptz, v_end::timestamptz, false, 'none', '[]'::jsonb
    );

    -- blocks
    v_txt_id := gen_random_uuid(); v_svc_id := gen_random_uuid(); v_bill_id := gen_random_uuid();
    INSERT INTO t_contract_blocks (id, contract_id, tenant_id, position, source_type, block_name, block_description, category_id, category_name, unit_price, quantity, billing_cycle, total_price, custom_fields)
    VALUES
      (v_txt_id, v_cid, v_tid, 0, 'flyby', 'Terms & Conditions',
       '<p>Scope, exclusions and SLAs as per annexure. Payment due within 15 days of invoice. Consumables and spares billed at actuals unless covered.</p>',
       'text', 'Text', 0, 1, 'prepaid', 0,
       jsonb_build_object('config', jsonb_build_object('content', '<p>Scope, exclusions and SLAs as per annexure. Payment due within 15 days of invoice. Consumables and spares billed at actuals unless covered.</p>', 'autoIncluded', true, 'showDescription', true), 'currency', 'INR', 'unlimited', false)),
      (v_svc_id, v_cid, v_tid, 1, 'flyby', v_svc_name,
       '<p>' || v_visits || ' scheduled visits across the contract period with service reports per visit.</p>',
       'service', 'Service', 0, v_visits, 'custom', 0,
       jsonb_build_object('config', jsonb_build_object('billingOnly', false, 'complimentary', true, 'serviceCycles', jsonb_build_object('enabled', true, 'days', (365 / GREATEST(v_visits,1))::int), 'showDescription', true), 'currency', 'INR', 'unlimited', false)),
      (v_bill_id, v_cid, v_tid, 2, 'flyby', v_nom_name || ' Fee - ' || v_label_cad,
       '<p>' || v_label_cad || ' fee of INR ' || v_amt || ' plus GST 18%.</p>',
       'billing', 'Billing', v_amt, v_cycles, k->>'cad', v_total,
       jsonb_build_object('config', jsonb_build_object('billingOnly', true, 'cadencePricing', jsonb_build_object('baseAmount', v_total, 'baseMonths', 12, 'defaultCadence', k->>'cad', 'rates', jsonb_build_array(jsonb_build_object('cycle', k->>'cad', 'amount', v_amt, 'enabled', true))), 'showDescription', true), 'currency', 'INR', 'unlimited', false));

    -- events only for active/completed
    IF v_status IN ('active','completed') THEN
      -- billing events: calendar-aligned (start + k*cyc_months months)
      FOR j IN 1..v_cycles LOOP
        v_evt_date := (v_start + make_interval(months => (j-1) * v_cyc_months))::date;
        IF v_evt_date <= v_today THEN
          IF v_status = 'active' AND ((k->>'nn')::int % 3 = 0)
             AND v_evt_date = (SELECT max((v_start + make_interval(months => (x-1) * v_cyc_months))::date)
                               FROM generate_series(1, v_cycles) x
                               WHERE (v_start + make_interval(months => (x-1) * v_cyc_months))::date <= v_today) THEN
            v_evt_status := 'overdue';
          ELSE
            v_evt_status := 'paid';
          END IF;
        ELSE
          v_evt_status := 'scheduled';
        END IF;
        INSERT INTO t_contract_events (id, tenant_id, contract_id, block_id, block_name, category_id,
          event_type, billing_sub_type, billing_cycle_label, sequence_number, total_occurrences,
          scheduled_date, original_date, amount, currency, status, version, is_live, is_active, amount_settled, created_by)
        VALUES (gen_random_uuid(), v_tid, v_cid, v_bill_id::text, v_nom_name || ' Fee - ' || v_label_cad, 'billing',
          'billing', 'recurring', v_label_cad || ' ' || j || '/' || v_cycles, j, v_cycles,
          v_evt_date::timestamptz, v_evt_date::timestamptz, v_amt, 'INR', v_evt_status, 1, true, true,
          CASE WHEN v_evt_status = 'paid' THEN v_amt ELSE 0 END,
          ('a0000000-0000-4000-8000-00000000000' || (k->>'s'))::uuid);
      END LOOP;

      -- service visit events, evenly spaced across 12 months
      FOR j IN 1..v_visits LOOP
        v_evt_date := (v_start + ((j-1) * 365 / v_visits))::date;
        v_evt_status := CASE WHEN v_evt_date <= v_today THEN 'completed' ELSE 'scheduled' END;
        INSERT INTO t_contract_events (id, tenant_id, contract_id, block_id, block_name, category_id,
          event_type, sequence_number, total_occurrences,
          scheduled_date, original_date, amount, currency, status, version, is_live, is_active, amount_settled, created_by)
        VALUES (gen_random_uuid(), v_tid, v_cid, v_svc_id::text, v_svc_name, 'service',
          'service', j, v_visits,
          v_evt_date::timestamptz, v_evt_date::timestamptz, 0, 'INR', v_evt_status, 1, true, true, 0,
          ('a0000000-0000-4000-8000-00000000000' || (k->>'s'))::uuid);
      END LOOP;
    END IF;
  END LOOP;
END $$;
