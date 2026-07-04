-- Phase B: ICP archetypes (curated cold-start chips) + embedding-neighbour RPC
-- ALREADY APPLIED to project uwyqhzotluikawcboldr on 2026-07-04 (kept here for record).

CREATE TABLE IF NOT EXISTS m_icp_archetypes (
  id            text PRIMARY KEY,
  name          text NOT NULL,
  personas      text[] NOT NULL DEFAULT '{}',   -- empty = any persona
  industry_ids  text[] NOT NULL DEFAULT '{}',   -- match m_catalog_industries.id
  keywords      text[] NOT NULL DEFAULT '{}',   -- match tenant vocabulary
  chip_patterns text[] NOT NULL DEFAULT '{}',   -- composable starter chips
  sort_order    int  NOT NULL DEFAULT 0,
  is_active     boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now()
);

INSERT INTO m_icp_archetypes (id, name, personas, industry_ids, keywords, chip_patterns, sort_order) VALUES
('healthcare_maintenance','Healthcare equipment & facility maintenance','{}',
  ARRAY['healthcare','dental_clinics','physiotherapy'],
  ARRAY['hospital','clinic','patient','medical','ward','theatre','diagnostic','ventilator','equipment'],
  ARRAY['1 year Ventilator AMC with quarterly PM visits','1 year Operation Theatre FMC, billed monthly','6 month Specialist Consultation service package, billed monthly'],
  10),
('facility_property','Facility & property management','{}',
  ARRAY['commercial_realty','residential_realty','hotels_resorts','commercial_cleaning','security_services','municipal'],
  ARRAY['building','facility','property','housekeeping','hvac','elevator','security','cleaning','maintenance','amenities'],
  ARRAY['1 year HVAC System AMC, billed quarterly','1 year Common Area FMC, billed monthly','6 month Housekeeping service package, billed monthly'],
  20),
('it_digital_consulting','IT & digital consulting','{seller,both}',
  ARRAY['it_consulting','saas_cloud','design_studios','isp','mobile_operators'],
  ARRAY['software','digital','transformation','consulting','cloud','managed','support','ai','data','platform'],
  ARRAY['1 year Digital Transformation program, billed quarterly','6 month Fractional CDO engagement, billed monthly','1 year Managed IT Support, billed monthly'],
  30),
('professional_services','Professional services','{seller,both}',
  ARRAY['accounting_tax','law_firms','insurance','banking'],
  ARRAY['advisory','retainer','audit','legal','compliance','tax','consulting','accounting'],
  ARRAY['1 year Retainer service package, billed monthly','6 month Advisory engagement, billed quarterly','1 year Annual Compliance service, billed quarterly'],
  40),
('wellness_fitness','Wellness & fitness','{seller,both}',
  ARRAY['gyms_fitness','yoga_studios','spiritual_retreats','physiotherapy'],
  ARRAY['membership','training','wellness','fitness','yoga','session','coaching','therapy'],
  ARRAY['1 year Membership package, billed monthly','6 month Personal Training package, billed monthly','1 year Wellness program, billed quarterly'],
  50),
('field_services','Field & trade services','{seller,both}',
  ARRAY['plumbing','electrical_services','auto_service','renovation','civil_construction'],
  ARRAY['repair','installation','maintenance','service','inspection','preventive'],
  ARRAY['1 year Preventive Maintenance AMC, billed quarterly','6 month Service package, billed monthly','1 year Annual Service Contract, billed quarterly'],
  60),
('generic_service','General service contract','{}','{}','{}',
  ARRAY['1 year Service Package, billed quarterly','6 month Service package, billed monthly','1 year Annual Maintenance Contract, billed quarterly'],
  900)
ON CONFLICT (id) DO NOTHING;

CREATE OR REPLACE FUNCTION icp_similar_tenants(p_tenant_id uuid, p_limit int DEFAULT 5)
RETURNS TABLE(tenant_id uuid, similarity double precision)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, extensions
AS $$
  SELECT sp.tenant_id,
         (1 - (sp.embedding <=> me.embedding))::double precision AS similarity
  FROM t_tenant_smartprofiles sp,
       (SELECT embedding FROM t_tenant_smartprofiles
         WHERE tenant_id = p_tenant_id AND embedding IS NOT NULL LIMIT 1) me
  WHERE sp.tenant_id <> p_tenant_id
    AND sp.embedding IS NOT NULL
    AND sp.is_active
  ORDER BY sp.embedding <=> me.embedding
  LIMIT greatest(1, least(p_limit, 20));
$$;
