-- Stream 1 / Task 1.3 — Seed service resource templates
-- Adds 'service' resource_type_id to m_catalog_resource_templates.
-- These represent WHAT IS SOLD (deliverables / packages), distinct from:
--   equipment = physical machines the tenant services
--   asset     = physical spaces/facilities
--   team_staff = people/roles (WHO delivers)
--   service   = the sellable deliverable itself (WHAT is sold)
--
-- Covers 6 industries plus 2 universal (NULL industry) templates.
-- Idempotent via ON CONFLICT DO NOTHING.

INSERT INTO m_catalog_resource_templates
  (id, name, resource_type_id, industry_id, sub_category,
   is_active, is_recommended, description)
VALUES

  -- ── Wellness ──────────────────────────────────────────────────────
  (gen_random_uuid(), 'Yoga Sessions',              'service', 'wellness', 'Fitness Services',   true, true,  'Group or individual yoga sessions — daily, weekly, or subscription-based'),
  (gen_random_uuid(), 'Personal Training Package',  'service', 'wellness', 'Fitness Services',   true, true,  'One-on-one personal training with a certified fitness trainer'),
  (gen_random_uuid(), 'Nutrition Consultation',     'service', 'wellness', 'Nutrition Services',  true, false, 'Personalised dietary planning and nutrition counselling sessions'),
  (gen_random_uuid(), 'Physiotherapy Sessions',     'service', 'wellness', 'Health Services',    true, false, 'Therapeutic exercise and rehabilitation sessions'),
  (gen_random_uuid(), 'Wellness Assessment',        'service', 'wellness', 'Health Services',    true, false, 'Comprehensive health and wellness evaluation package'),

  -- ── Healthcare ───────────────────────────────────────────────────
  (gen_random_uuid(), 'General Consultation',       'service', 'healthcare', 'Consultation',      true, true,  'In-person or teleconsultation with a general practitioner'),
  (gen_random_uuid(), 'Specialist Consultation',    'service', 'healthcare', 'Consultation',      true, true,  'Specialist doctor consultation — Gynecology, Cardiology, Orthopedics etc.'),
  (gen_random_uuid(), 'Diagnostic Package',         'service', 'healthcare', 'Diagnostics',       true, false, 'Lab tests and diagnostics bundled as a package'),
  (gen_random_uuid(), 'Health Screening Package',   'service', 'healthcare', 'Preventive Health', true, false, 'Preventive health check-up including vitals, blood work, and consultation'),
  (gen_random_uuid(), 'Home Healthcare Visit',      'service', 'healthcare', 'Home Care',         true, false, 'Nurse or doctor visit to patient home for monitoring or treatment'),

  -- ── Legal / Professional ─────────────────────────────────────────
  (gen_random_uuid(), 'Contract Drafting & Review', 'service', 'legal_professional', 'Legal Services', true, true,  'Drafting, reviewing, and advising on contracts and legal agreements'),
  (gen_random_uuid(), 'Legal Retainer',             'service', 'legal_professional', 'Legal Services', true, true,  'On-call legal advisory on a monthly retainer basis'),
  (gen_random_uuid(), 'Compliance Audit',           'service', 'legal_professional', 'Compliance',     true, false, 'Review of business operations for regulatory compliance'),
  (gen_random_uuid(), 'IP Filing & Management',     'service', 'legal_professional', 'IP Services',    true, false, 'Trademark, patent and copyright filing and management services'),

  -- ── Financial Services ───────────────────────────────────────────
  (gen_random_uuid(), 'Payroll Processing',         'service', 'financial_services', 'Payroll',      true, true,  'End-to-end payroll processing, calculation, and disbursement'),
  (gen_random_uuid(), 'Tax Filing & Advisory',      'service', 'financial_services', 'Tax Services', true, true,  'Income tax, GST, TDS filing and tax planning advisory'),
  (gen_random_uuid(), 'Bookkeeping',                'service', 'financial_services', 'Accounting',   true, false, 'Monthly accounts recording, reconciliation, and ledger maintenance'),
  (gen_random_uuid(), 'HR Compliance',              'service', 'financial_services', 'HR Services',  true, false, 'PF, ESI, and labour law compliance management'),

  -- ── Professional Services ────────────────────────────────────────
  (gen_random_uuid(), 'Business Consulting',        'service', 'professional_services', 'Consulting',       true, true,  'Strategic business consulting and advisory engagements'),
  (gen_random_uuid(), 'Project Management',         'service', 'professional_services', 'Project Services', true, true,  'End-to-end project scoping, planning, and delivery management'),
  (gen_random_uuid(), 'Training & Development',     'service', 'professional_services', 'Training',         true, false, 'Employee training programs, workshops, and skill development sessions'),
  (gen_random_uuid(), 'IT Consulting',              'service', 'professional_services', 'IT Services',      true, false, 'Technology strategy, infrastructure, and digital transformation advisory'),

  -- ── Education ────────────────────────────────────────────────────
  (gen_random_uuid(), 'Tutoring Sessions',          'service', 'education', 'Academic Services', true, true,  'One-on-one or group academic tutoring for students'),
  (gen_random_uuid(), 'Certification Training',     'service', 'education', 'Certification',     true, false, 'Professional certification and exam preparation programs'),

  -- ── Technology ───────────────────────────────────────────────────
  (gen_random_uuid(), 'Software Support & AMC',     'service', 'technology', 'IT Support',          true, true,  'Annual maintenance and support contract for software products'),
  (gen_random_uuid(), 'Cloud Managed Services',     'service', 'technology', 'Managed IT Services', true, false, 'Ongoing management and monitoring of cloud infrastructure'),
  (gen_random_uuid(), 'Cybersecurity Audit',        'service', 'technology', 'Security Services',   true, false, 'Security assessment, vulnerability scanning, and compliance review'),

  -- ── Universal (NULL industry — applies to all) ───────────────────
  (gen_random_uuid(), 'Support Retainer',           'service', NULL, 'Retainer Services', true, false, 'On-call support and advisory on a monthly retainer basis'),
  (gen_random_uuid(), 'Managed Service Contract',   'service', NULL, 'Managed Services',  true, false, 'Ongoing managed delivery of a defined scope of services')

ON CONFLICT DO NOTHING;

COMMENT ON TABLE m_catalog_resource_templates IS
  'Catalog of resource templates. resource_type_id values: equipment (machines), asset (spaces/facilities), team_staff (people/roles), consumable (materials), service (sellable deliverables — added Stream 1 / Task 1.3).';
