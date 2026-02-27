-- ============================================================
-- Phase 0b PROPOSED: Fix orphan industry_ids
-- DO NOT RUN YET - Review and approve first
-- ============================================================

-- First, check none of these IDs already exist (safety check)
SELECT id FROM m_catalog_industries
WHERE id IN (
  'networking_solutions',
  'technology_general',
  'wellness_general',
  'healthcare_general',
  'polymers',
  'ups_battery_inverters',
  'life_insurance',
  'training_consulting'
);

-- PROPOSED INSERTS (one per orphan):

-- 1. networking_solutions → sub-segment of 'technology'
-- Used by: ramnet, alex_workspace
INSERT INTO m_catalog_industries (id, name, parent_id, level, segment_type, icon, description, is_active)
VALUES (
  'networking_solutions',
  'Networking Solutions',
  'technology',
  1,
  'sub_segment',
  'Network',
  'Network infrastructure, LAN/WAN solutions, and connectivity services',
  true
);

-- 2. technology_general → sub-segment of 'technology'
-- Used by: Vikuna Technologies
INSERT INTO m_catalog_industries (id, name, parent_id, level, segment_type, icon, description, is_active)
VALUES (
  'technology_general',
  'General Technology Services',
  'technology',
  1,
  'sub_segment',
  'Cpu',
  'General IT and technology services across multiple domains',
  true
);

-- 3. wellness_general → sub-segment of 'wellness'
-- Used by: vikunatechnologies
INSERT INTO m_catalog_industries (id, name, parent_id, level, segment_type, icon, description, is_active)
VALUES (
  'wellness_general',
  'General Wellness',
  'wellness',
  1,
  'sub_segment',
  'Heart',
  'General wellness, fitness, and holistic health services',
  true
);

-- 4. healthcare_general → sub-segment of 'healthcare'
-- Used by: valuep
INSERT INTO m_catalog_industries (id, name, parent_id, level, segment_type, icon, description, is_active)
VALUES (
  'healthcare_general',
  'General Healthcare',
  'healthcare',
  1,
  'sub_segment',
  'Stethoscope',
  'General healthcare services including multi-specialty hospitals and clinics',
  true
);

-- 5. polymers → sub-segment of 'manufacturing'
-- Used by: vinodspace
INSERT INTO m_catalog_industries (id, name, parent_id, level, segment_type, icon, description, is_active)
VALUES (
  'polymers',
  'Polymers & Plastics',
  'manufacturing',
  1,
  'sub_segment',
  'FlaskConical',
  'Polymer manufacturing, plastic products, and chemical processing',
  true
);

-- 6. ups_battery_inverters → sub-segment of 'manufacturing'
-- NOTE: Could also be 'technology'. Using 'manufacturing' as these are manufactured products.
-- Used by: infinite-solutions
INSERT INTO m_catalog_industries (id, name, parent_id, level, segment_type, icon, description, is_active)
VALUES (
  'ups_battery_inverters',
  'UPS, Battery & Inverter Systems',
  'manufacturing',
  1,
  'sub_segment',
  'BatteryCharging',
  'Manufacturing and service of UPS systems, batteries, inverters, and power backup equipment',
  true
);

-- 7. life_insurance → sub-segment of 'financial_services'
-- Used by: enter
INSERT INTO m_catalog_industries (id, name, parent_id, level, segment_type, icon, description, is_active)
VALUES (
  'life_insurance',
  'Life Insurance',
  'financial_services',
  1,
  'sub_segment',
  'Shield',
  'Life insurance products, policy management, and claims processing',
  true
);

-- 8. training_consulting → sub-segment of 'education'
-- Used by: webinar
INSERT INTO m_catalog_industries (id, name, parent_id, level, segment_type, icon, description, is_active)
VALUES (
  'training_consulting',
  'Training & Consulting',
  'education',
  1,
  'sub_segment',
  'GraduationCap',
  'Corporate training, professional development, and consulting services',
  true
);

-- VERIFICATION after running:
SELECT id, name, parent_id, level, segment_type
FROM m_catalog_industries
WHERE id IN (
  'networking_solutions',
  'technology_general',
  'wellness_general',
  'healthcare_general',
  'polymers',
  'ups_battery_inverters',
  'life_insurance',
  'training_consulting'
)
ORDER BY parent_id, id;
