-- =====================================================================
-- DEMO TENANT SETUP — Script 03: Buyer asset registries (own equipment)
-- Pulse Hospital (c…05), Complex Pharma (c…06), Gold Fusionn (c…07)
-- ownership_type='self', is_live=true (live environment, confirmed state)
-- template_id resolved from m_catalog_resource_templates by (name, industry).
-- Idempotent: guarded by (tenant_id, name) NOT EXISTS.
-- =====================================================================
DO $$
DECLARE
  a jsonb;
  v_tpl uuid;
  v_cfg jsonb := '[
    {"t":"5","tpl":"HVAC System","ti":"facility_management","n":"AHU - ICU Wing","code":"PH-HVAC-01","mk":"Voltas","md":"AHU-12000 CFM","sn":"VLT-AHU-22-4471","crit":"critical","cond":"good","loc":"ICU Wing, Level 2","pd":"2022-03-15","we":"2025-03-14","ls":"2026-06-20"},
    {"t":"5","tpl":"HVAC System","ti":"facility_management","n":"AHU - Operation Theatre Block","code":"PH-HVAC-02","mk":"Blue Star","md":"AHU-15000 CFM (HEPA)","sn":"BS-AHU-21-8830","crit":"critical","cond":"good","loc":"OT Block, Level 3","pd":"2021-08-10","we":"2024-08-09","ls":"2026-07-05"},
    {"t":"5","tpl":"HVAC System","ti":"facility_management","n":"Chiller Plant - 250 TR","code":"PH-HVAC-03","mk":"Carrier","md":"30XA-250","sn":"CAR-30XA-19-0112","crit":"high","cond":"fair","loc":"Utility Block Roof","pd":"2019-05-22","we":"2022-05-21","ls":"2026-05-30"},
    {"t":"5","tpl":"DG Set (Generator)","ti":"facility_management","n":"DG Set 750 kVA - Main Backup","code":"PH-DG-01","mk":"Cummins","md":"C750D5","sn":"CMN-750-20-3391","crit":"critical","cond":"good","loc":"DG Yard","pd":"2020-11-02","we":"2023-11-01","ls":"2026-07-12"},
    {"t":"5","tpl":"DG Set (Generator)","ti":"facility_management","n":"DG Set 500 kVA - Secondary","code":"PH-DG-02","mk":"Kirloskar","md":"KG1-500WS","sn":"KIR-500-18-7754","crit":"high","cond":"fair","loc":"DG Yard","pd":"2018-06-18","we":"2021-06-17","ls":"2026-06-28"},
    {"t":"5","tpl":"Elevator / Lift","ti":"facility_management","n":"Passenger Lift - OPD Block","code":"PH-LIFT-01","mk":"Otis","md":"Gen2 Premier 13P","sn":"OTS-G2-21-2210","crit":"high","cond":"good","loc":"OPD Block","pd":"2021-02-25","we":"2024-02-24","ls":"2026-07-18"},
    {"t":"5","tpl":"Elevator / Lift","ti":"facility_management","n":"Bed Lift - Ward Tower A","code":"PH-LIFT-02","mk":"Schindler","md":"S5500 Hospital 26P","sn":"SCH-5500-21-0908","crit":"critical","cond":"good","loc":"Ward Tower A","pd":"2021-02-25","we":"2024-02-24","ls":"2026-07-18"},
    {"t":"5","tpl":"Elevator / Lift","ti":"facility_management","n":"Bed Lift - Ward Tower B","code":"PH-LIFT-03","mk":"Schindler","md":"S5500 Hospital 26P","sn":"SCH-5500-21-0911","crit":"critical","cond":"good","loc":"Ward Tower B","pd":"2021-03-12","we":"2024-03-11","ls":"2026-06-25"},
    {"t":"5","tpl":"UPS System","ti":"facility_management","n":"UPS 120 kVA - ICU & OT","code":"PH-UPS-01","mk":"Vertiv","md":"Liebert EXM 120","sn":"VRT-EXM-22-5540","crit":"critical","cond":"good","loc":"Electrical Room L2","pd":"2022-01-30","we":"2025-01-29","ls":"2026-07-01"},
    {"t":"5","tpl":"UPS System","ti":"facility_management","n":"UPS 80 kVA - Diagnostics","code":"PH-UPS-02","mk":"APC","md":"Galaxy VS 80","sn":"APC-GVS-20-1123","crit":"high","cond":"good","loc":"Diagnostics Wing","pd":"2020-09-14","we":"2023-09-13","ls":"2026-06-15"},
    {"t":"5","tpl":"STP / WTP Plant","ti":"facility_management","n":"STP 150 KLD","code":"PH-STP-01","mk":"Thermax","md":"MBBR-150","sn":"THX-STP-19-0245","crit":"medium","cond":"fair","loc":"Basement Utility","pd":"2019-12-05","we":"2021-12-04","ls":"2026-05-20"},
    {"t":"5","tpl":"Ventilator","ti":"healthcare","n":"Ventilator - ICU Bay 1","code":"PH-VENT-01","mk":"Draeger","md":"Evita V300","sn":"DRG-V300-23-8801","crit":"critical","cond":"good","loc":"ICU Bay 1","pd":"2023-04-19","we":"2026-04-18","ls":"2026-07-22"},
    {"t":"5","tpl":"Ventilator","ti":"healthcare","n":"Ventilator - ICU Bay 2","code":"PH-VENT-02","mk":"Draeger","md":"Evita V300","sn":"DRG-V300-23-8804","crit":"critical","cond":"good","loc":"ICU Bay 2","pd":"2023-04-19","we":"2026-04-18","ls":"2026-07-22"},
    {"t":"5","tpl":"Ventilator","ti":"healthcare","n":"Ventilator - Emergency","code":"PH-VENT-03","mk":"Hamilton","md":"HAMILTON-C3","sn":"HAM-C3-22-3312","crit":"critical","cond":"good","loc":"Emergency Ward","pd":"2022-10-08","we":"2025-10-07","ls":"2026-07-10"},

    {"t":"6","tpl":"Purified Water System","ti":"pharma","n":"PW Generation Plant - 2000 LPH","code":"CP-PW-01","mk":"Thermax","md":"RO+EDI 2000LPH","sn":"THX-PW-21-0034","crit":"critical","cond":"good","loc":"Utility Block A","pd":"2021-06-30","we":"2024-06-29","ls":"2026-07-15"},
    {"t":"6","tpl":"Purified Water System","ti":"pharma","n":"PW Distribution Loop - Block B","code":"CP-PW-02","mk":"Praj HiPurity","md":"SS316L Loop 6bar","sn":"PRJ-LP-21-0871","crit":"critical","cond":"good","loc":"Production Block B","pd":"2021-07-15","we":"2024-07-14","ls":"2026-07-15"},
    {"t":"6","tpl":"HVAC-AHU (Pharma Grade)","ti":"pharma","n":"AHU - Granulation (Grade C)","code":"CP-AHU-01","mk":"Waves Aircon","md":"Pharma AHU 8000 CFM","sn":"WAV-AHU-20-2210","crit":"critical","cond":"good","loc":"Granulation Suite","pd":"2020-04-12","we":"2023-04-11","ls":"2026-06-30"},
    {"t":"6","tpl":"HVAC-AHU (Pharma Grade)","ti":"pharma","n":"AHU - Compression (Grade C)","code":"CP-AHU-02","mk":"Waves Aircon","md":"Pharma AHU 6000 CFM","sn":"WAV-AHU-20-2214","crit":"critical","cond":"good","loc":"Compression Suite","pd":"2020-04-12","we":"2023-04-11","ls":"2026-06-30"},
    {"t":"6","tpl":"HVAC-AHU (Pharma Grade)","ti":"pharma","n":"AHU - Packing (Grade D)","code":"CP-AHU-03","mk":"Blue Star","md":"Pharma AHU 5000 CFM","sn":"BS-AHU-19-6612","crit":"high","cond":"fair","loc":"Packing Hall","pd":"2019-09-25","we":"2022-09-24","ls":"2026-06-10"},
    {"t":"6","tpl":"DG Set (Generator)","ti":"facility_management","n":"DG Set 1010 kVA - Plant Backup","code":"CP-DG-01","mk":"Cummins","md":"C1010D5","sn":"CMN-1010-21-0458","crit":"critical","cond":"good","loc":"DG Yard","pd":"2021-01-20","we":"2024-01-19","ls":"2026-07-08"},
    {"t":"6","tpl":"DG Set (Generator)","ti":"facility_management","n":"DG Set 500 kVA - QC & Admin","code":"CP-DG-02","mk":"Kirloskar","md":"KG1-500WS","sn":"KIR-500-19-8821","crit":"high","cond":"good","loc":"DG Yard","pd":"2019-03-08","we":"2022-03-07","ls":"2026-06-22"},
    {"t":"6","tpl":"UPS System","ti":"facility_management","n":"UPS 60 kVA - QC Laboratory","code":"CP-UPS-01","mk":"Vertiv","md":"Liebert ITA2 60","sn":"VRT-ITA-22-7789","crit":"high","cond":"good","loc":"QC Lab","pd":"2022-05-17","we":"2025-05-16","ls":"2026-07-02"},
    {"t":"6","tpl":"UPS System","ti":"facility_management","n":"UPS 60 kVA - BMS & Servers","code":"CP-UPS-02","mk":"APC","md":"Galaxy VS 60","sn":"APC-GVS-22-4471","crit":"high","cond":"good","loc":"Server Room","pd":"2022-05-17","we":"2025-05-16","ls":"2026-07-02"},
    {"t":"6","tpl":"HVAC System","ti":"facility_management","n":"Chiller - Utility 180 TR","code":"CP-HVAC-01","mk":"Daikin","md":"EWAD-180","sn":"DKN-EWAD-20-3345","crit":"high","cond":"good","loc":"Utility Block A","pd":"2020-08-03","we":"2023-08-02","ls":"2026-06-18"},

    {"t":"7","tpl":"Industrial Compressor","ti":"manufacturing","n":"Screw Compressor - Shop 1","code":"GF-COMP-01","mk":"Atlas Copco","md":"GA75 VSD+","sn":"ATC-GA75-21-1101","crit":"critical","cond":"good","loc":"Compressor House 1","pd":"2021-04-14","we":"2024-04-13","ls":"2026-07-11"},
    {"t":"7","tpl":"Industrial Compressor","ti":"manufacturing","n":"Screw Compressor - Shop 2","code":"GF-COMP-02","mk":"Atlas Copco","md":"GA75 VSD+","sn":"ATC-GA75-21-1108","crit":"high","cond":"good","loc":"Compressor House 1","pd":"2021-04-14","we":"2024-04-13","ls":"2026-07-11"},
    {"t":"7","tpl":"Industrial Compressor","ti":"manufacturing","n":"Backup Compressor - ELGi","code":"GF-COMP-03","mk":"ELGi","md":"EG55-8.5","sn":"ELG-EG55-18-0912","crit":"medium","cond":"fair","loc":"Compressor House 2","pd":"2018-10-05","we":"2021-10-04","ls":"2026-05-25"},
    {"t":"7","tpl":"DG Set (Generator)","ti":"facility_management","n":"DG Set 625 kVA - Line 1 & 2","code":"GF-DG-01","mk":"Kirloskar","md":"KG1-625WS","sn":"KIR-625-20-3319","crit":"high","cond":"good","loc":"DG Yard","pd":"2020-02-11","we":"2023-02-10","ls":"2026-07-14"},
    {"t":"7","tpl":"DG Set (Generator)","ti":"facility_management","n":"DG Set 320 kVA - Utilities","code":"GF-DG-02","mk":"Mahindra Powerol","md":"MP-320","sn":"MAH-320-17-6604","crit":"medium","cond":"fair","loc":"DG Yard","pd":"2017-07-28","we":"2020-07-27","ls":"2026-06-19"},
    {"t":"7","tpl":"Transformer","ti":"facility_management","n":"Transformer 1000 kVA - Main Incomer","code":"GF-TRF-01","mk":"Crompton Greaves","md":"1000kVA 11/0.433kV","sn":"CG-1000-19-0781","crit":"critical","cond":"good","loc":"HT Yard","pd":"2019-01-16","we":"2022-01-15","ls":"2026-04-30"},
    {"t":"7","tpl":"Transformer","ti":"facility_management","n":"Transformer 630 kVA - Shop 2","code":"GF-TRF-02","mk":"Voltamp","md":"630kVA 11/0.433kV","sn":"VMP-630-19-1174","crit":"high","cond":"good","loc":"HT Yard","pd":"2019-01-16","we":"2022-01-15","ls":"2026-04-30"},
    {"t":"7","tpl":"HVAC System","ti":"facility_management","n":"AHU - Paint Shop","code":"GF-HVAC-01","mk":"Blue Star","md":"AHU-9000 CFM","sn":"BS-AHU-20-7823","crit":"medium","cond":"good","loc":"Paint Shop","pd":"2020-12-09","we":"2023-12-08","ls":"2026-06-05"},
    {"t":"7","tpl":"HVAC System","ti":"facility_management","n":"VRF System - Office Block","code":"GF-HVAC-02","mk":"Daikin","md":"VRV-X 20HP","sn":"DKN-VRV-22-2290","crit":"low","cond":"good","loc":"Admin Office","pd":"2022-08-21","we":"2025-08-20","ls":"2026-07-03"},
    {"t":"7","tpl":"STP / WTP Plant","ti":"facility_management","n":"ETP 50 KLD","code":"GF-ETP-01","mk":"Ion Exchange","md":"ETP-50KLD","sn":"IEX-ETP-18-0553","crit":"medium","cond":"fair","loc":"Effluent Yard","pd":"2018-05-30","we":"2020-05-29","ls":"2026-05-15"}
  ]'::jsonb;
BEGIN
  FOR a IN SELECT * FROM jsonb_array_elements(v_cfg) LOOP
    SELECT rt.id INTO v_tpl FROM m_catalog_resource_templates rt
    WHERE rt.name = a->>'tpl' AND rt.industry_id = a->>'ti' LIMIT 1;

    INSERT INTO t_client_asset_registry (
      id, tenant_id, resource_type_id, template_id, name, code, status, condition, criticality,
      location, make, model, serial_number, purchase_date, warranty_expiry, last_service_date,
      tags, specifications, is_active, is_live, ownership_type
    )
    SELECT gen_random_uuid(),
      ('c0000000-0000-4000-8000-00000000000' || (a->>'t'))::uuid,
      'equipment', v_tpl, a->>'n', a->>'code', 'active', a->>'cond', a->>'crit',
      a->>'loc', a->>'mk', a->>'md', a->>'sn',
      (a->>'pd')::date, (a->>'we')::date, (a->>'ls')::date,
      '[]'::jsonb,
      jsonb_build_object('seeded_from', 'demo-tenant-setup',
                         'resource_template_id', v_tpl,
                         'resource_template_name', a->>'tpl'),
      true, true, 'self'
    WHERE NOT EXISTS (
      SELECT 1 FROM t_client_asset_registry e
      WHERE e.tenant_id = ('c0000000-0000-4000-8000-00000000000' || (a->>'t'))::uuid
        AND e.name = a->>'n'
    );
  END LOOP;
END $$;
