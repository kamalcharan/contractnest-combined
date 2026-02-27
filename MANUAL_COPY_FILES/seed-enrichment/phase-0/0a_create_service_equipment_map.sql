-- ============================================================
-- Phase 0a: Create m_service_equipment_map table
-- Service × Equipment matrix for seller block generation
-- ============================================================

-- Create table
CREATE TABLE IF NOT EXISTS m_service_equipment_map (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  industry_id varchar NOT NULL,
  service_name varchar NOT NULL,
  service_code varchar NOT NULL,
  equipment_category varchar NOT NULL,
  equipment_types jsonb NOT NULL DEFAULT '[]',
  block_type varchar NOT NULL DEFAULT 'service',
  config_template jsonb DEFAULT '{}',
  hsn_sac_code varchar,
  pricing_guidance jsonb DEFAULT '{}',
  is_active boolean NOT NULL DEFAULT true,
  sort_order int DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_sem_industry ON m_service_equipment_map(industry_id);
CREATE INDEX IF NOT EXISTS idx_sem_equipment_category ON m_service_equipment_map(equipment_category);
CREATE INDEX IF NOT EXISTS idx_sem_service_code ON m_service_equipment_map(service_code);

-- Verify creation
SELECT
  table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name = 'm_service_equipment_map'
ORDER BY ordinal_position;
