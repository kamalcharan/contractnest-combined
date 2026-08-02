-- =====================================================================
-- DEMO TENANT SETUP — Script 01: Provision 7 demo tenants
-- Project: uwyqhzotluikawcboldr (ContractNest)
-- Creates: auth users, user profiles, tenants, tenant links, LOVs,
--          owner roles, tenant profiles, served industries,
--          selected resources, completed onboarding, sequences.
-- Idempotent: safe to re-run (ON CONFLICT / NOT EXISTS guards).
-- Rollback: 99_rollback.sql (deletes by the fixed UUID prefixes below)
--
-- Fixed UUID scheme (suffix N = tenant ordinal 1..7):
--   auth user:    a0000000-0000-4000-8000-00000000000N
--   user profile: b0000000-0000-4000-8000-00000000000N
--   tenant:       c0000000-0000-4000-8000-00000000000N
--   user_tenant:  d0000000-0000-4000-8000-00000000000N
-- Ordinals: 1=Trinity Tecnitions 2=Value Elevators 3=Freedom Services
--           4=Hygene Services    5=Pulse Hospital  6=Complex Pharma
--           7=Gold Fusionn
-- =====================================================================

DO $$
DECLARE
  t jsonb;
  v_cfg jsonb := '[
    {"n":1,"email":"trinity@t.com","pw":"trinity2025","first":"Rajesh","last":"Kumar","mobile":"9848012301","ucode":"TRINITY1",
     "tenant":"Trinity Tecnitions","wcode":"tri418","persona":"seller","engagement":"equipment_first","industry":"hvac",
     "city":"Hyderabad","state":"TG","addr":"Plot 42, Balanagar Industrial Area","pin":"500037","gst":"36AABCT2214F1Z6","pan":"AABCT2214F",
     "desc":"HVAC installation & maintenance specialists — AMC/CMC for chillers, AHUs, VRF and precision cooling."},
    {"n":2,"email":"value@v.com","pw":"value2025","first":"Suresh","last":"Menon","mobile":"9848012302","ucode":"VALUEEL1",
     "tenant":"Value Elevators","wcode":"val519","persona":"seller","engagement":"equipment_first","industry":"lifts_elevators",
     "city":"Bengaluru","state":"KA","addr":"18/2, Hosur Main Road, Bommanahalli","pin":"560068","gst":"29AADCV5521G1Z8","pan":"AADCV5521G",
     "desc":"Lift & elevator maintenance company — passenger, goods and hospital lifts, AMC and modernization."},
    {"n":3,"email":"freedom@f.com","pw":"freedom2025","first":"Imran","last":"Shaikh","mobile":"9848012303","ucode":"FREEDOM1",
     "tenant":"Freedom Services","wcode":"fre304","persona":"seller","engagement":"service_first","industry":"facility_management",
     "city":"Pune","state":"MH","addr":"Office 7, Wakdewadi, Shivajinagar","pin":"411005","gst":"27AAFCF8834H1Z2","pan":"AAFCF8834H",
     "desc":"Professional pest control services — general pest, termite, rodent and fumigation programs for commercial facilities."},
    {"n":4,"email":"hygene@h.com","pw":"hygene2025","first":"Lakshmi","last":"Nair","mobile":"9848012304","ucode":"HYGENES1",
     "tenant":"Hygene Services","wcode":"hyg761","persona":"seller","engagement":"service_first","industry":"facility_management",
     "city":"Chennai","state":"TN","addr":"No 96, Mount Road, Guindy","pin":"600032","gst":"33AAHCH1192J1Z4","pan":"AAHCH1192J",
     "desc":"Housekeeping & facility hygiene company — daily housekeeping deployment, deep cleaning and washroom hygiene programs."},
    {"n":5,"email":"pulse@p.com","pw":"pulse2025","first":"Anand","last":"Rao","mobile":"9848012305","ucode":"PULSEHO1",
     "tenant":"Pulse Hospital","wcode":"pul228","persona":"buyer","engagement":"equipment_first","industry":"healthcare",
     "city":"Hyderabad","state":"TG","addr":"Road No 2, Banjara Hills","pin":"500034","gst":"36AAJCP6633K1Z1","pan":"AAJCP6633K",
     "desc":"250-bed multi-speciality hospital — ICU, OT, diagnostics; outsources facility equipment maintenance to specialist vendors."},
    {"n":6,"email":"complex@c.com","pw":"complex2025","first":"Priya","last":"Sharma","mobile":"9848012306","ucode":"COMPLEX1",
     "tenant":"Complex Pharma","wcode":"com915","persona":"buyer","engagement":"equipment_first","industry":"pharma",
     "city":"Hyderabad","state":"TG","addr":"Sy No 12, IDA Pashamylaram, Patancheru","pin":"502307","gst":"36AAKCC7745L1Z9","pan":"AAKCC7745L",
     "desc":"WHO-GMP formulations plant — tablets & capsules; regulated utilities (purified water, HVAC-AHU) under strict compliance."},
    {"n":7,"email":"gold@g.com","pw":"gold2025","first":"Vikram","last":"Reddy","mobile":"9848012307","ucode":"GOLDFUS1",
     "tenant":"Gold Fusionn","wcode":"gol647","persona":"buyer","engagement":"equipment_first","industry":"manufacturing",
     "city":"Chennai","state":"TN","addr":"B-14, SIPCOT Industrial Park, Sriperumbudur","pin":"602105","gst":"33AALCG9856M1Z7","pan":"AALCG9856M",
     "desc":"Precision engineering & fabrication plant — CNC shops, compressors and utilities running two shifts."}
  ]'::jsonb;
  v_uid uuid; v_pid uuid; v_tid uuid; v_utid uuid;
  v_roles_cat uuid; v_tags_cat uuid; v_comp_cat uuid;
BEGIN
  FOR t IN SELECT * FROM jsonb_array_elements(v_cfg) LOOP
    v_uid  := ('a0000000-0000-4000-8000-00000000000' || (t->>'n'))::uuid;
    v_pid  := ('b0000000-0000-4000-8000-00000000000' || (t->>'n'))::uuid;
    v_tid  := ('c0000000-0000-4000-8000-00000000000' || (t->>'n'))::uuid;
    v_utid := ('d0000000-0000-4000-8000-00000000000' || (t->>'n'))::uuid;

    -- 1. auth user (bcrypt password, pre-confirmed, email provider)
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      confirmation_token, recovery_token, email_change_token_new, email_change,
      phone_change, phone_change_token, email_change_token_current, reauthentication_token,
      is_sso_user, is_anonymous, created_at, updated_at
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', v_uid, 'authenticated', 'authenticated',
      t->>'email', extensions.crypt(t->>'pw', extensions.gen_salt('bf')),
      now(), '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('first_name', t->>'first', 'last_name', t->>'last',
                         'email_verified', true, 'registration_status', 'complete'),
      '', '', '', '', '', '', '', '',
      false, false, now(), now()
    ) ON CONFLICT (id) DO NOTHING;

    INSERT INTO auth.identities (id, provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (v_uid, v_uid::text, v_uid,
            jsonb_build_object('sub', v_uid::text, 'email', t->>'email', 'email_verified', false, 'phone_verified', false),
            'email', now(), now(), now())
    ON CONFLICT (provider_id, provider) DO NOTHING;

    -- 2. user profile
    INSERT INTO t_user_profiles (id, user_id, first_name, last_name, email, country_code, mobile_number,
                                 user_code, preferred_theme, is_dark_mode, preferred_language, is_active)
    VALUES (v_pid, v_uid, t->>'first', t->>'last', t->>'email', 'IN', t->>'mobile',
            t->>'ucode', 'sleek-cool', false, 'en', true)
    ON CONFLICT (id) DO NOTHING;

    -- 3. tenant (INSERT fires seed triggers: event-status config, cadence, vani rules)
    INSERT INTO t_tenants (id, name, workspace_code, status, is_test, settings, created_by,
                           storage_path, storage_quota, storage_consumed, storage_provider, storage_setup_complete)
    VALUES (v_tid, t->>'tenant', t->>'wcode', 'active', true, '{}'::jsonb, v_uid,
            'tenant_' || replace(left(v_tid::text, 8), '-', '') || '_demo', 40, 0, 'firebase', true)
    ON CONFLICT (id) DO NOTHING;

    -- 4. user ↔ tenant link
    INSERT INTO t_user_tenants (id, user_id, tenant_id, is_default, status, is_admin)
    VALUES (v_utid, v_uid, v_tid, true, 'active', true)
    ON CONFLICT (id) DO NOTHING;

    -- 5. LOV category groups (Roles / Tags / Compliance Numbers) + details
    IF NOT EXISTS (SELECT 1 FROM t_category_master WHERE tenant_id = v_tid AND category_name = 'Roles') THEN
      INSERT INTO t_category_master (id, tenant_id, category_name, display_name, description, is_active, is_live)
      VALUES (gen_random_uuid(), v_tid, 'Roles', 'Roles', 'User roles in the system', true, true)
      RETURNING id INTO v_roles_cat;
      INSERT INTO t_category_details (id, tenant_id, category_id, sub_cat_name, display_name, hexcolor, sequence_no, is_deletable, is_active, is_live) VALUES
        (gen_random_uuid(), v_tid, v_roles_cat, 'Owner',  'Owner',  '#32e275', 1, false, true, true),
        (gen_random_uuid(), v_tid, v_roles_cat, 'Admin',  'Admin',  '#3b82f6', 2, true,  true, true),
        (gen_random_uuid(), v_tid, v_roles_cat, 'Member', 'Member', '#8b5cf6', 3, true,  true, true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM t_category_master WHERE tenant_id = v_tid AND category_name = 'Tags') THEN
      INSERT INTO t_category_master (id, tenant_id, category_name, display_name, description, is_active, is_live)
      VALUES (gen_random_uuid(), v_tid, 'Tags', 'Tags', 'Contact and entity tags', true, true)
      RETURNING id INTO v_tags_cat;
      INSERT INTO t_category_details (id, tenant_id, category_id, sub_cat_name, display_name, hexcolor, sequence_no, is_deletable, is_active, is_live) VALUES
        (gen_random_uuid(), v_tid, v_tags_cat, 'VIP',   'VIP',   '#F59E0B', 1, true, true, true),
        (gen_random_uuid(), v_tid, v_tags_cat, 'Lead',  'Lead',  '#3B82F6', 2, true, true, true),
        (gen_random_uuid(), v_tid, v_tags_cat, 'Guest', 'Guest', '#10B981', 3, true, true, true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM t_category_master WHERE tenant_id = v_tid AND category_name = 'Compliance Numbers') THEN
      INSERT INTO t_category_master (id, tenant_id, category_name, display_name, description, is_active, is_live)
      VALUES (gen_random_uuid(), v_tid, 'Compliance Numbers', 'Compliance Numbers', 'Tax and regulatory compliance identifiers', true, true)
      RETURNING id INTO v_comp_cat;
      INSERT INTO t_category_details (id, tenant_id, category_id, sub_cat_name, display_name, hexcolor, sequence_no, is_deletable, is_active, is_live) VALUES
        (gen_random_uuid(), v_tid, v_comp_cat, 'GST', 'GST', '#10B981', 1, true, true, true),
        (gen_random_uuid(), v_tid, v_comp_cat, 'PAN', 'PAN', '#3B82F6', 2, true, true, true);
    END IF;

    -- 6. Owner role assignment
    INSERT INTO t_user_tenant_roles (id, user_tenant_id, role_id)
    SELECT gen_random_uuid(), v_utid, cd.id
    FROM t_category_details cd
    JOIN t_category_master cm ON cm.id = cd.category_id
    WHERE cd.tenant_id = v_tid AND cm.category_name = 'Roles' AND cd.sub_cat_name = 'Owner'
      AND NOT EXISTS (SELECT 1 FROM t_user_tenant_roles r WHERE r.user_tenant_id = v_utid);

    -- 7. tenant business profile
    INSERT INTO t_tenant_profiles (id, tenant_id, business_name, business_email,
      business_phone_country_code, business_phone, business_whatsapp, country_code, state_code,
      address_line1, city, postal_code, industry_id, gst_number, pan_number,
      persona, engagement_model, short_description, primary_color, secondary_color)
    SELECT gen_random_uuid(), v_tid, t->>'tenant', t->>'email',
      '+91', t->>'mobile', t->>'mobile', 'IN', t->>'state',
      t->>'addr', t->>'city', t->>'pin', t->>'industry', t->>'gst', t->>'pan',
      t->>'persona', t->>'engagement', t->>'desc', '#F59E0B', '#10B981'
    WHERE NOT EXISTS (SELECT 1 FROM t_tenant_profiles WHERE tenant_id = v_tid);

    -- 8. sequence numbers
    PERFORM seed_sequence_numbers_for_tenant(v_tid, v_uid);
  END LOOP;
END $$;

-- =====================================================================
-- Served industries (sellers only)
-- =====================================================================
INSERT INTO t_tenant_served_industries (id, tenant_id, industry_id, added_by)
SELECT gen_random_uuid(), x.tid::uuid, x.ind, x.uid::uuid
FROM (VALUES
  ('c0000000-0000-4000-8000-000000000001','a0000000-0000-4000-8000-000000000001','healthcare'),
  ('c0000000-0000-4000-8000-000000000001','a0000000-0000-4000-8000-000000000001','pharma'),
  ('c0000000-0000-4000-8000-000000000001','a0000000-0000-4000-8000-000000000001','manufacturing'),
  ('c0000000-0000-4000-8000-000000000001','a0000000-0000-4000-8000-000000000001','facility_management'),
  ('c0000000-0000-4000-8000-000000000002','a0000000-0000-4000-8000-000000000002','healthcare'),
  ('c0000000-0000-4000-8000-000000000002','a0000000-0000-4000-8000-000000000002','pharma'),
  ('c0000000-0000-4000-8000-000000000002','a0000000-0000-4000-8000-000000000002','manufacturing'),
  ('c0000000-0000-4000-8000-000000000002','a0000000-0000-4000-8000-000000000002','real_estate'),
  ('c0000000-0000-4000-8000-000000000003','a0000000-0000-4000-8000-000000000003','healthcare'),
  ('c0000000-0000-4000-8000-000000000003','a0000000-0000-4000-8000-000000000003','pharma'),
  ('c0000000-0000-4000-8000-000000000003','a0000000-0000-4000-8000-000000000003','manufacturing'),
  ('c0000000-0000-4000-8000-000000000003','a0000000-0000-4000-8000-000000000003','hospitality'),
  ('c0000000-0000-4000-8000-000000000004','a0000000-0000-4000-8000-000000000004','healthcare'),
  ('c0000000-0000-4000-8000-000000000004','a0000000-0000-4000-8000-000000000004','pharma'),
  ('c0000000-0000-4000-8000-000000000004','a0000000-0000-4000-8000-000000000004','manufacturing'),
  ('c0000000-0000-4000-8000-000000000004','a0000000-0000-4000-8000-000000000004','hospitality')
) AS x(tid, uid, ind)
WHERE NOT EXISTS (
  SELECT 1 FROM t_tenant_served_industries s
  WHERE s.tenant_id = x.tid::uuid AND s.industry_id = x.ind
);

-- =====================================================================
-- Selected resources (sellers: sell / buyers: own) — resolved by template name
-- =====================================================================
INSERT INTO t_tenant_selected_resources (id, tenant_id, resource_template_id, purpose, source, created_by)
SELECT gen_random_uuid(), x.tid::uuid, rt.id, x.purpose, 'onboarding', x.uid::uuid
FROM (VALUES
  -- Trinity Tecnitions (sell): HVAC, UPS, DG
  ('c0000000-0000-4000-8000-000000000001','a0000000-0000-4000-8000-000000000001','sell','HVAC System','facility_management'),
  ('c0000000-0000-4000-8000-000000000001','a0000000-0000-4000-8000-000000000001','sell','UPS System','facility_management'),
  ('c0000000-0000-4000-8000-000000000001','a0000000-0000-4000-8000-000000000001','sell','DG Set (Generator)','facility_management'),
  -- Value Elevators (sell): Elevator, DG
  ('c0000000-0000-4000-8000-000000000002','a0000000-0000-4000-8000-000000000002','sell','Elevator / Lift','facility_management'),
  ('c0000000-0000-4000-8000-000000000002','a0000000-0000-4000-8000-000000000002','sell','DG Set (Generator)','facility_management'),
  -- Pulse Hospital (own)
  ('c0000000-0000-4000-8000-000000000005','a0000000-0000-4000-8000-000000000005','own','HVAC System','facility_management'),
  ('c0000000-0000-4000-8000-000000000005','a0000000-0000-4000-8000-000000000005','own','DG Set (Generator)','facility_management'),
  ('c0000000-0000-4000-8000-000000000005','a0000000-0000-4000-8000-000000000005','own','Elevator / Lift','facility_management'),
  ('c0000000-0000-4000-8000-000000000005','a0000000-0000-4000-8000-000000000005','own','UPS System','facility_management'),
  ('c0000000-0000-4000-8000-000000000005','a0000000-0000-4000-8000-000000000005','own','STP / WTP Plant','facility_management'),
  ('c0000000-0000-4000-8000-000000000005','a0000000-0000-4000-8000-000000000005','own','Ventilator','healthcare'),
  -- Complex Pharma (own)
  ('c0000000-0000-4000-8000-000000000006','a0000000-0000-4000-8000-000000000006','own','Purified Water System','pharma'),
  ('c0000000-0000-4000-8000-000000000006','a0000000-0000-4000-8000-000000000006','own','HVAC-AHU (Pharma Grade)','pharma'),
  ('c0000000-0000-4000-8000-000000000006','a0000000-0000-4000-8000-000000000006','own','DG Set (Generator)','facility_management'),
  ('c0000000-0000-4000-8000-000000000006','a0000000-0000-4000-8000-000000000006','own','UPS System','facility_management'),
  ('c0000000-0000-4000-8000-000000000006','a0000000-0000-4000-8000-000000000006','own','HVAC System','facility_management'),
  -- Gold Fusionn (own)
  ('c0000000-0000-4000-8000-000000000007','a0000000-0000-4000-8000-000000000007','own','Industrial Compressor','manufacturing'),
  ('c0000000-0000-4000-8000-000000000007','a0000000-0000-4000-8000-000000000007','own','DG Set (Generator)','facility_management'),
  ('c0000000-0000-4000-8000-000000000007','a0000000-0000-4000-8000-000000000007','own','Transformer','facility_management'),
  ('c0000000-0000-4000-8000-000000000007','a0000000-0000-4000-8000-000000000007','own','HVAC System','facility_management'),
  ('c0000000-0000-4000-8000-000000000007','a0000000-0000-4000-8000-000000000007','own','STP / WTP Plant','facility_management')
) AS x(tid, uid, purpose, tname, tind)
JOIN m_catalog_resource_templates rt ON rt.name = x.tname AND rt.industry_id = x.tind
WHERE NOT EXISTS (
  SELECT 1 FROM t_tenant_selected_resources s
  WHERE s.tenant_id = x.tid::uuid AND s.resource_template_id = rt.id AND s.purpose = x.purpose
);

-- =====================================================================
-- Onboarding marked complete (mirrors the VaNi 6-step business flow)
-- NOTE: a DB trigger auto-creates the t_tenant_onboarding row at step 1
-- on tenant INSERT, so this is an UPDATE, not an INSERT.
-- =====================================================================
UPDATE t_tenant_onboarding o SET
  current_step = 6, total_steps = 6, is_completed = true, completed_at = now(), updated_at = now(),
  completed_steps = '["persona-selection","engagement-model","resource-pick","vani-working","pricing-review","equipment-confirm"]'::jsonb,
  step_data = jsonb_build_object(
    'persona-selection', jsonb_build_object('persona', tp.persona),
    'engagement-model',  jsonb_build_object('engagement_model', tp.engagement_model, 'default_tab',
                          CASE WHEN tp.engagement_model = 'service_first' THEN 'services' ELSE 'equipment' END),
    'vani-working',      jsonb_build_object('persona', tp.persona, 'no_coverage', false, 'seeded_by', 'demo-tenant-setup')
  )
FROM t_tenant_profiles tp
WHERE tp.tenant_id = o.tenant_id
  AND o.tenant_id::text LIKE 'c0000000-0000-4000-8000-00000000000%'
  AND o.is_completed = false;
