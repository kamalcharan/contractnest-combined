-- 039_resource_types_hierarchy.sql
-- Add parent_type_id to m_catalog_resource_types for hierarchical categories
-- Equipment subcategories become children of the 'equipment' row

-- ────────────────────────────────────────────────────────────────
-- 1. Add parent_type_id column (self-referencing FK)
-- ────────────────────────────────────────────────────────────────

ALTER TABLE m_catalog_resource_types
  ADD COLUMN IF NOT EXISTS parent_type_id VARCHAR(50) NULL;

ALTER TABLE m_catalog_resource_types
  ADD CONSTRAINT fk_mrt_parent_type
    FOREIGN KEY (parent_type_id)
    REFERENCES m_catalog_resource_types(id)
    ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_mrt_parent_type_id
  ON m_catalog_resource_types(parent_type_id);

-- ────────────────────────────────────────────────────────────────
-- 2. Seed equipment subcategories
-- ────────────────────────────────────────────────────────────────

INSERT INTO m_catalog_resource_types
  (id, name, description, icon, pricing_model, requires_human_assignment, has_capacity_limits, is_active, sort_order, parent_type_id, created_at, updated_at)
VALUES
  ('medical_imaging', 'Medical Imaging', 'X-ray, MRI, CT scanners and diagnostic imaging equipment', 'Scan', 'hourly', false, true, true, 1, 'equipment', NOW(), NOW()),
  ('life_support',    'Life Support',    'Ventilators, dialysis machines, cardiac monitors',         'HeartPulse', 'hourly', false, true, true, 2, 'equipment', NOW(), NOW()),
  ('sterilization',   'Sterilization',   'Autoclaves, UV sterilizers, chemical sterilization units', 'FlaskConical', 'hourly', false, true, true, 3, 'equipment', NOW(), NOW()),
  ('hvac',            'HVAC Systems',    'Heating, ventilation, and air conditioning systems',       'Thermometer', 'hourly', false, true, true, 4, 'equipment', NOW(), NOW()),
  ('elevator',        'Elevators & Lifts', 'Passenger and service elevators, platform lifts',       'ArrowUpDown', 'hourly', false, true, true, 5, 'equipment', NOW(), NOW()),
  ('power',           'Power Systems',   'Generators, UPS, transformers, electrical panels',         'Zap', 'hourly', false, true, true, 6, 'equipment', NOW(), NOW()),
  ('laboratory',      'Laboratory',      'Microscopes, centrifuges, incubators, analyzers',         'Microscope', 'hourly', false, true, true, 7, 'equipment', NOW(), NOW()),
  ('fire_safety',     'Fire Safety',     'Fire alarms, sprinklers, extinguishers, suppression',      'Flame', 'hourly', false, true, true, 8, 'equipment', NOW(), NOW()),
  ('it_network',      'IT & Network',    'Servers, switches, routers, access points',                'Wifi', 'hourly', false, true, true, 9, 'equipment', NOW(), NOW()),
  ('plumbing',        'Plumbing',        'Pumps, pipes, water heaters, filtration systems',          'Wrench', 'hourly', false, true, true, 10, 'equipment', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;
