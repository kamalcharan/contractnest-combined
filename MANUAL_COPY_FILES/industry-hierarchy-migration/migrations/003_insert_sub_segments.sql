-- ============================================================================
-- Migration: Insert Industry Sub-Segments
-- Description: Adds sub-segments under parent industries
-- Date: 2025-01-10
-- ============================================================================

-- ============================================================================
-- NEW PARENT SEGMENTS (Industries not in original 15)
-- ============================================================================

INSERT INTO m_catalog_industries (id, name, description, icon, common_pricing_rules, compliance_requirements, is_active, sort_order, parent_id, level, segment_type, created_at, updated_at)
VALUES
-- Agriculture (new parent)
('agriculture', 'Agriculture', 'Farming, agribusiness, agricultural products and services', 'Wheat', '[]', '["Agricultural Standards","FSSAI for Food Products","Pesticide Regulations"]', true, 16, NULL, 0, 'segment', NOW(), NOW()),

-- Legal & Professional Services (new parent)
('legal_professional', 'Legal & Professional Services', 'Law firms, legal consultants, and professional service providers', 'Scale', '[]', '["Bar Council Regulations","Legal Services Authority","Professional Ethics"]', true, 17, NULL, 0, 'segment', NOW(), NOW()),

-- Arts & Media (new parent)
('arts_media', 'Arts & Media', 'Creative arts, media production, entertainment and cultural services', 'Palette', '[]', '["Copyright Laws","Media Regulations","Content Guidelines"]', true, 18, NULL, 0, 'segment', NOW(), NOW()),

-- Spiritual & Religious Services (new parent)
('spiritual_religious', 'Spiritual & Religious Services', 'Religious services, spiritual guidance, and related products', 'Sparkles', '[]', '["Religious Trust Regulations","Charity Laws"]', true, 19, NULL, 0, 'segment', NOW(), NOW()),

-- Home Services (new parent)
('home_services', 'Home Services', 'Home maintenance, appliance services, and household solutions', 'Home', '[]', '["Consumer Protection","Service Standards","Warranty Regulations"]', true, 20, NULL, 0, 'segment', NOW(), NOW()),

-- Construction (new parent)
('construction', 'Construction', 'Building construction, civil engineering, and infrastructure development', 'HardHat', '[]', '["Building Codes","Safety Standards","Environmental Clearances","Labor Laws"]', true, 21, NULL, 0, 'segment', NOW(), NOW())

ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    icon = EXCLUDED.icon,
    updated_at = NOW();

-- ============================================================================
-- HEALTHCARE SUB-SEGMENTS
-- ============================================================================

INSERT INTO m_catalog_industries (id, name, description, icon, common_pricing_rules, compliance_requirements, is_active, sort_order, parent_id, level, segment_type, created_at, updated_at)
VALUES
('healthcare_general', 'General Healthcare', 'General medical services and healthcare facilities', 'Stethoscope', '[]', '[]', true, 1, 'healthcare', 1, 'sub_segment', NOW(), NOW()),
('dental_surgeon', 'Dental Surgeon', 'Dental clinics, oral surgery, and dental care services', 'Smile', '[]', '["Dental Council Registration","Clinic License","Bio-Medical Waste"]', true, 2, 'healthcare', 1, 'sub_segment', NOW(), NOW()),
('psychologist', 'Psychologist', 'Mental health services, counseling, and psychological care', 'Brain', '[]', '["RCI Registration","Mental Health Act Compliance"]', true, 3, 'healthcare', 1, 'sub_segment', NOW(), NOW()),
('medical_devices', 'Healthcare & Medical Devices', 'Medical equipment, devices, and healthcare technology', 'Activity', '[]', '["CDSCO Approval","Medical Device Rules","ISO 13485"]', true, 4, 'healthcare', 1, 'sub_segment', NOW(), NOW())

ON CONFLICT (id) DO UPDATE SET
    parent_id = EXCLUDED.parent_id,
    level = EXCLUDED.level,
    segment_type = EXCLUDED.segment_type,
    updated_at = NOW();

-- ============================================================================
-- FINANCIAL SERVICES SUB-SEGMENTS
-- ============================================================================

INSERT INTO m_catalog_industries (id, name, description, icon, common_pricing_rules, compliance_requirements, is_active, sort_order, parent_id, level, segment_type, created_at, updated_at)
VALUES
('financial_general', 'General Financial Services', 'General banking and financial services', 'DollarSign', '[]', '[]', true, 1, 'financial_services', 1, 'sub_segment', NOW(), NOW()),
('life_insurance', 'Life Insurance', 'Life insurance products and advisory services', 'Shield', '[]', '["IRDAI Registration","Insurance Act Compliance"]', true, 2, 'financial_services', 1, 'sub_segment', NOW(), NOW()),
('health_insurance', 'General & Health Insurance', 'Health and general insurance products', 'ShieldCheck', '[]', '["IRDAI Registration","Insurance Act Compliance"]', true, 3, 'financial_services', 1, 'sub_segment', NOW(), NOW()),
('investment_advisory', 'Investment Advisory', 'Investment planning, wealth management, and advisory', 'TrendingUp', '[]', '["SEBI RIA Registration","Fiduciary Standards"]', true, 4, 'financial_services', 1, 'sub_segment', NOW(), NOW()),
('forex_money_transfer', 'Forex & Money Transfer', 'Foreign exchange and money transfer services', 'ArrowLeftRight', '[]', '["RBI FFMC License","FEMA Compliance","AML Guidelines"]', true, 5, 'financial_services', 1, 'sub_segment', NOW(), NOW()),
('esi_pf_consulting', 'ESI & PF Consulting', 'Employee benefits, ESI, and provident fund consulting', 'FileText', '[]', '["EPFO Guidelines","ESIC Regulations"]', true, 6, 'financial_services', 1, 'sub_segment', NOW(), NOW()),
('accountants_auditors', 'Accountants & Auditors', 'Accounting, auditing, and taxation services', 'Calculator', '[]', '["ICAI Membership","Companies Act","Tax Laws"]', true, 7, 'financial_services', 1, 'sub_segment', NOW(), NOW()),
('bank_loans', 'Bank Loans', 'Loan products, lending services, and credit facilities', 'Landmark', '[]', '["RBI Guidelines","Fair Lending Practices"]', true, 8, 'financial_services', 1, 'sub_segment', NOW(), NOW())

ON CONFLICT (id) DO UPDATE SET
    parent_id = EXCLUDED.parent_id,
    level = EXCLUDED.level,
    segment_type = EXCLUDED.segment_type,
    updated_at = NOW();

-- ============================================================================
-- TECHNOLOGY SUB-SEGMENTS
-- ============================================================================

INSERT INTO m_catalog_industries (id, name, description, icon, common_pricing_rules, compliance_requirements, is_active, sort_order, parent_id, level, segment_type, created_at, updated_at)
VALUES
('technology_general', 'General Technology', 'General IT and technology services', 'Cpu', '[]', '[]', true, 1, 'technology', 1, 'sub_segment', NOW(), NOW()),
('digital_marketing', 'Digital Marketing', 'Online marketing, SEO, social media, and digital advertising', 'Megaphone', '[]', '["IT Act Compliance","ASCI Guidelines","Data Protection"]', true, 2, 'technology', 1, 'sub_segment', NOW(), NOW()),
('it_consulting', 'IT Consulting', 'IT strategy, consulting, and implementation services', 'Monitor', '[]', '["Data Protection Laws","ISO 27001"]', true, 3, 'technology', 1, 'sub_segment', NOW(), NOW()),
('cyber_security', 'Cyber Security', 'Information security, cybersecurity solutions and services', 'Lock', '[]', '["CERT-In Guidelines","ISO 27001","Data Protection Laws"]', true, 4, 'technology', 1, 'sub_segment', NOW(), NOW()),
('networking_solutions', 'Networking Solutions', 'Network infrastructure, connectivity, and solutions', 'Network', '[]', '["DOT Regulations","ISP License"]', true, 5, 'technology', 1, 'sub_segment', NOW(), NOW()),
('computer_hardware', 'Computer Hardware', 'Computer equipment, hardware sales and services', 'HardDrive', '[]', '["BIS Standards","E-Waste Rules"]', true, 6, 'technology', 1, 'sub_segment', NOW(), NOW())

ON CONFLICT (id) DO UPDATE SET
    parent_id = EXCLUDED.parent_id,
    level = EXCLUDED.level,
    segment_type = EXCLUDED.segment_type,
    updated_at = NOW();

-- ============================================================================
-- EDUCATION SUB-SEGMENTS
-- ============================================================================

INSERT INTO m_catalog_industries (id, name, description, icon, common_pricing_rules, compliance_requirements, is_active, sort_order, parent_id, level, segment_type, created_at, updated_at)
VALUES
('education_general', 'General Education', 'Schools, colleges, and educational institutions', 'GraduationCap', '[]', '[]', true, 1, 'education', 1, 'sub_segment', NOW(), NOW()),
('coaching_skill_development', 'Coaching & Skill Development', 'Coaching centers, skill training, and professional development', 'BookOpen', '[]', '["Skill India Guidelines","NSDC Standards"]', true, 2, 'education', 1, 'sub_segment', NOW(), NOW()),
('training_consulting', 'Training & Consulting', 'Corporate training, educational consulting services', 'Users', '[]', '["Training Standards","Industry Certifications"]', true, 3, 'education', 1, 'sub_segment', NOW(), NOW())

ON CONFLICT (id) DO UPDATE SET
    parent_id = EXCLUDED.parent_id,
    level = EXCLUDED.level,
    segment_type = EXCLUDED.segment_type,
    updated_at = NOW();

-- ============================================================================
-- REAL ESTATE SUB-SEGMENTS
-- ============================================================================

INSERT INTO m_catalog_industries (id, name, description, icon, common_pricing_rules, compliance_requirements, is_active, sort_order, parent_id, level, segment_type, created_at, updated_at)
VALUES
('real_estate_general', 'General Real Estate', 'Property sales, rentals, and real estate services', 'Home', '[]', '[]', true, 1, 'real_estate', 1, 'sub_segment', NOW(), NOW()),
('vaastu_consulting', 'Vaastu Consulting', 'Vaastu shastra consulting and architectural guidance', 'Compass', '[]', '[]', true, 2, 'real_estate', 1, 'sub_segment', NOW(), NOW())

ON CONFLICT (id) DO UPDATE SET
    parent_id = EXCLUDED.parent_id,
    level = EXCLUDED.level,
    segment_type = EXCLUDED.segment_type,
    updated_at = NOW();

-- ============================================================================
-- CONSTRUCTION SUB-SEGMENTS
-- ============================================================================

INSERT INTO m_catalog_industries (id, name, description, icon, common_pricing_rules, compliance_requirements, is_active, sort_order, parent_id, level, segment_type, created_at, updated_at)
VALUES
('builders_construction', 'Builders & Constructions', 'Building contractors, construction companies', 'Building', '[]', '["RERA Registration","Building Permits","Safety Standards"]', true, 1, 'construction', 1, 'sub_segment', NOW(), NOW())

ON CONFLICT (id) DO UPDATE SET
    parent_id = EXCLUDED.parent_id,
    level = EXCLUDED.level,
    segment_type = EXCLUDED.segment_type,
    updated_at = NOW();

-- ============================================================================
-- MANUFACTURING SUB-SEGMENTS
-- ============================================================================

INSERT INTO m_catalog_industries (id, name, description, icon, common_pricing_rules, compliance_requirements, is_active, sort_order, parent_id, level, segment_type, created_at, updated_at)
VALUES
('manufacturing_general', 'General Manufacturing', 'General manufacturing and production', 'Factory', '[]', '[]', true, 1, 'manufacturing', 1, 'sub_segment', NOW(), NOW()),
('food_processing', 'Food Processing', 'Food manufacturing, processing, and packaging', 'Cookie', '[]', '["FSSAI License","Food Safety Standards","Hygiene Regulations"]', true, 2, 'manufacturing', 1, 'sub_segment', NOW(), NOW()),
('food_products', 'Food Products', 'Food product manufacturing and distribution', 'Apple', '[]', '["FSSAI License","Labeling Standards"]', true, 3, 'manufacturing', 1, 'sub_segment', NOW(), NOW()),
('polymers', 'Polymers', 'Polymer manufacturing, plastics, and rubber products', 'Box', '[]', '["BIS Standards","Environmental Regulations","Plastic Waste Rules"]', true, 4, 'manufacturing', 1, 'sub_segment', NOW(), NOW()),
('printing_packaging', 'Printing & Packaging', 'Commercial printing and packaging solutions', 'Printer', '[]', '["Packaging Standards","Environmental Compliance"]', true, 5, 'manufacturing', 1, 'sub_segment', NOW(), NOW()),
('scientific_lab_supplier', 'Scientific Lab Supplier', 'Laboratory equipment and scientific supplies', 'Flask', '[]', '["BIS Standards","Laboratory Safety"]', true, 6, 'manufacturing', 1, 'sub_segment', NOW(), NOW())

ON CONFLICT (id) DO UPDATE SET
    parent_id = EXCLUDED.parent_id,
    level = EXCLUDED.level,
    segment_type = EXCLUDED.segment_type,
    updated_at = NOW();

-- ============================================================================
-- RETAIL SUB-SEGMENTS
-- ============================================================================

INSERT INTO m_catalog_industries (id, name, description, icon, common_pricing_rules, compliance_requirements, is_active, sort_order, parent_id, level, segment_type, created_at, updated_at)
VALUES
('retail_general', 'General Retail', 'General retail stores and shops', 'ShoppingBag', '[]', '[]', true, 1, 'retail', 1, 'sub_segment', NOW(), NOW()),
('jewelry_trading', 'Jewelry Trading', 'Jewelry retail, wholesale, and trading', 'Gem', '[]', '["Hallmarking","BIS Standards","PAN for High Value"]', true, 2, 'retail', 1, 'sub_segment', NOW(), NOW()),
('fashion_designer', 'Fashion Designer', 'Fashion design, apparel, and clothing', 'Shirt', '[]', '["Textile Standards","Export Regulations"]', true, 3, 'retail', 1, 'sub_segment', NOW(), NOW()),
('home_appliances', 'Home Appliances', 'Household appliances and electronics retail', 'Tv', '[]', '["BIS Standards","BEE Star Rating","E-Waste Rules"]', true, 4, 'retail', 1, 'sub_segment', NOW(), NOW()),
('corporate_gifting', 'Corporate Gifting', 'Corporate gifts, promotional items, and merchandise', 'Gift', '[]', '["GST Compliance"]', true, 5, 'retail', 1, 'sub_segment', NOW(), NOW()),
('stationary_housekeeping', 'Stationary & Housekeeping Products', 'Office supplies, stationery, and housekeeping products', 'Paperclip', '[]', '["Product Safety Standards"]', true, 6, 'retail', 1, 'sub_segment', NOW(), NOW())

ON CONFLICT (id) DO UPDATE SET
    parent_id = EXCLUDED.parent_id,
    level = EXCLUDED.level,
    segment_type = EXCLUDED.segment_type,
    updated_at = NOW();

-- ============================================================================
-- HOSPITALITY SUB-SEGMENTS
-- ============================================================================

INSERT INTO m_catalog_industries (id, name, description, icon, common_pricing_rules, compliance_requirements, is_active, sort_order, parent_id, level, segment_type, created_at, updated_at)
VALUES
('hospitality_general', 'General Hospitality', 'Hotels, resorts, and hospitality services', 'UtensilsCrossed', '[]', '[]', true, 1, 'hospitality', 1, 'sub_segment', NOW(), NOW()),
('tours_travels', 'Tours & Travels', 'Travel agencies, tour operators, and travel services', 'Plane', '[]', '["Tourism License","IATA Membership"]', true, 2, 'hospitality', 1, 'sub_segment', NOW(), NOW()),
('catering_services', 'Catering Services', 'Event catering, food services, and hospitality catering', 'ChefHat', '[]', '["FSSAI License","Food Safety","Hygiene Standards"]', true, 3, 'hospitality', 1, 'sub_segment', NOW(), NOW())

ON CONFLICT (id) DO UPDATE SET
    parent_id = EXCLUDED.parent_id,
    level = EXCLUDED.level,
    segment_type = EXCLUDED.segment_type,
    updated_at = NOW();

-- ============================================================================
-- FACILITY MANAGEMENT SUB-SEGMENTS
-- ============================================================================

INSERT INTO m_catalog_industries (id, name, description, icon, common_pricing_rules, compliance_requirements, is_active, sort_order, parent_id, level, segment_type, created_at, updated_at)
VALUES
('facility_general', 'General Facility Management', 'General facility and property management', 'Building2', '[]', '[]', true, 1, 'facility_management', 1, 'sub_segment', NOW(), NOW()),
('fire_safety_systems', 'Fire Safety & Protection Systems', 'Fire safety equipment, installation, and maintenance', 'Flame', '[]', '["Fire Safety Norms","NBC Compliance","AMC Standards"]', true, 2, 'facility_management', 1, 'sub_segment', NOW(), NOW())

ON CONFLICT (id) DO UPDATE SET
    parent_id = EXCLUDED.parent_id,
    level = EXCLUDED.level,
    segment_type = EXCLUDED.segment_type,
    updated_at = NOW();

-- ============================================================================
-- WELLNESS SUB-SEGMENTS
-- ============================================================================

INSERT INTO m_catalog_industries (id, name, description, icon, common_pricing_rules, compliance_requirements, is_active, sort_order, parent_id, level, segment_type, created_at, updated_at)
VALUES
('wellness_general', 'General Wellness & Fitness', 'Gyms, fitness centers, and wellness services', 'Heart', '[]', '[]', true, 1, 'wellness', 1, 'sub_segment', NOW(), NOW()),
('health_wellness', 'Health & Wellness', 'Health coaching, wellness programs, and lifestyle services', 'HeartPulse', '[]', '["Health Standards","Safety Protocols"]', true, 2, 'wellness', 1, 'sub_segment', NOW(), NOW())

ON CONFLICT (id) DO UPDATE SET
    parent_id = EXCLUDED.parent_id,
    level = EXCLUDED.level,
    segment_type = EXCLUDED.segment_type,
    updated_at = NOW();

-- ============================================================================
-- HOME SERVICES SUB-SEGMENTS
-- ============================================================================

INSERT INTO m_catalog_industries (id, name, description, icon, common_pricing_rules, compliance_requirements, is_active, sort_order, parent_id, level, segment_type, created_at, updated_at)
VALUES
('ac_dealer_services', 'Air Conditioner Dealer / Services', 'AC sales, installation, repair, and maintenance', 'Wind', '[]', '["BEE Standards","Refrigerant Regulations","Service Standards"]', true, 1, 'home_services', 1, 'sub_segment', NOW(), NOW()),
('ups_battery_inverters', 'UPS Battery & Inverters', 'Power backup solutions, UPS, batteries, and inverters', 'BatteryCharging', '[]', '["BIS Standards","E-Waste Rules"]', true, 2, 'home_services', 1, 'sub_segment', NOW(), NOW())

ON CONFLICT (id) DO UPDATE SET
    parent_id = EXCLUDED.parent_id,
    level = EXCLUDED.level,
    segment_type = EXCLUDED.segment_type,
    updated_at = NOW();

-- ============================================================================
-- LEGAL & PROFESSIONAL SERVICES SUB-SEGMENTS
-- ============================================================================

INSERT INTO m_catalog_industries (id, name, description, icon, common_pricing_rules, compliance_requirements, is_active, sort_order, parent_id, level, segment_type, created_at, updated_at)
VALUES
('legal_services', 'Legal Services', 'Law firms, legal advisors, and litigation services', 'Scale', '[]', '["Bar Council Registration","Legal Services Authority"]', true, 1, 'legal_professional', 1, 'sub_segment', NOW(), NOW())

ON CONFLICT (id) DO UPDATE SET
    parent_id = EXCLUDED.parent_id,
    level = EXCLUDED.level,
    segment_type = EXCLUDED.segment_type,
    updated_at = NOW();

-- ============================================================================
-- ARTS & MEDIA SUB-SEGMENTS
-- ============================================================================

INSERT INTO m_catalog_industries (id, name, description, icon, common_pricing_rules, compliance_requirements, is_active, sort_order, parent_id, level, segment_type, created_at, updated_at)
VALUES
('arts_paintings', 'Arts and Paintings', 'Fine arts, paintings, galleries, and art services', 'Palette', '[]', '["Copyright Laws","Art Authentication"]', true, 1, 'arts_media', 1, 'sub_segment', NOW(), NOW()),
('photography_videography', 'Photography & Videography', 'Photo and video production, studios, and services', 'Camera', '[]', '["Copyright Laws","Content Guidelines"]', true, 2, 'arts_media', 1, 'sub_segment', NOW(), NOW())

ON CONFLICT (id) DO UPDATE SET
    parent_id = EXCLUDED.parent_id,
    level = EXCLUDED.level,
    segment_type = EXCLUDED.segment_type,
    updated_at = NOW();

-- ============================================================================
-- SPIRITUAL & RELIGIOUS SUB-SEGMENTS
-- ============================================================================

INSERT INTO m_catalog_industries (id, name, description, icon, common_pricing_rules, compliance_requirements, is_active, sort_order, parent_id, level, segment_type, created_at, updated_at)
VALUES
('astrology', 'Astrology', 'Astrology services, horoscope, and related consultations', 'Star', '[]', '[]', true, 1, 'spiritual_religious', 1, 'sub_segment', NOW(), NOW()),
('pandit_puja_products', 'Pandit, Puja Products', 'Religious services, puja items, and spiritual products', 'Sparkles', '[]', '[]', true, 2, 'spiritual_religious', 1, 'sub_segment', NOW(), NOW())

ON CONFLICT (id) DO UPDATE SET
    parent_id = EXCLUDED.parent_id,
    level = EXCLUDED.level,
    segment_type = EXCLUDED.segment_type,
    updated_at = NOW();

-- ============================================================================
-- AGRICULTURE SUB-SEGMENTS
-- ============================================================================

INSERT INTO m_catalog_industries (id, name, description, icon, common_pricing_rules, compliance_requirements, is_active, sort_order, parent_id, level, segment_type, created_at, updated_at)
VALUES
('agriculture_general', 'General Agriculture', 'Farming, crop production, and agricultural services', 'Wheat', '[]', '["Agricultural Standards","APMC Regulations"]', true, 1, 'agriculture', 1, 'sub_segment', NOW(), NOW())

ON CONFLICT (id) DO UPDATE SET
    parent_id = EXCLUDED.parent_id,
    level = EXCLUDED.level,
    segment_type = EXCLUDED.segment_type,
    updated_at = NOW();

-- ============================================================================
-- Verification Queries
-- ============================================================================
--
-- Check all parent segments:
-- SELECT id, name, level, segment_type FROM m_catalog_industries WHERE level = 0 ORDER BY sort_order;
--
-- Check sub-segments by parent:
-- SELECT p.name as parent, c.id, c.name as sub_segment
-- FROM m_catalog_industries c
-- JOIN m_catalog_industries p ON c.parent_id = p.id
-- WHERE c.level = 1
-- ORDER BY p.sort_order, c.sort_order;
--
-- Count sub-segments per parent:
-- SELECT p.name, COUNT(c.id) as sub_segment_count
-- FROM m_catalog_industries p
-- LEFT JOIN m_catalog_industries c ON c.parent_id = p.id
-- WHERE p.level = 0
-- GROUP BY p.id, p.name
-- ORDER BY p.sort_order;
