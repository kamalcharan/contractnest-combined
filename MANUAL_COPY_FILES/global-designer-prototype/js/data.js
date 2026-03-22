/* ═══════════════════════════════════════════════════
   DATA — Real m_catalog data for Global Designer
   Source: ClaudeDocumentation/m_catalog_* files
   ═══════════════════════════════════════════════════ */

const Data = {

    // ═══════════ RESOURCE TYPES ═══════════
    resourceTypes: [
        { id: 'team_staff', name: 'Team Staff', icon: 'Users', pricing_model: 'hourly' },
        { id: 'equipment', name: 'Equipments', icon: 'Wrench', pricing_model: 'hourly' },
        { id: 'consumable', name: 'Consumables', icon: 'Package', pricing_model: 'per_unit' },
        { id: 'asset', name: 'Assets', icon: 'Building', pricing_model: 'hourly' },
        { id: 'partner', name: 'Partners', icon: 'Handshake', pricing_model: 'fixed' }
    ],

    // ═══════════ INDUSTRIES (15) ═══════════
    industries: [
        { id: 'healthcare', name: 'Healthcare', icon: '\uD83C\uDFE5', description: 'Medical services, hospitals, clinics, diagnostic centers', sort: 1, compliance: ['HIPAA', 'NABH Standards', 'Bio-Medical Waste Mgmt'] },
        { id: 'wellness', name: 'Wellness & Fitness', icon: '\uD83E\uDDD8', description: 'Yoga studios, gyms, spas, wellness centers', sort: 2, compliance: ['Safety Standards', 'Hygiene Protocols'] },
        { id: 'manufacturing', name: 'Manufacturing', icon: '\uD83C\uDFED', description: 'Production facilities, factories, process industries', sort: 3, compliance: ['ISO 9001', 'ISO 14001', 'OSHA'] },
        { id: 'facility_management', name: 'Facility Management', icon: '\uD83C\uDFE2', description: 'Commercial buildings, offices, malls, property management', sort: 4, compliance: ['Fire Safety', 'Building Codes'] },
        { id: 'technology', name: 'Technology', icon: '\uD83D\uDCBB', description: 'IT companies, software firms, data centers', sort: 5, compliance: ['GDPR', 'SOC 2', 'ISO 27001'] },
        { id: 'education', name: 'Education', icon: '\uD83C\uDF93', description: 'Schools, colleges, universities, coaching centers', sort: 6, compliance: ['Education Board Norms', 'Child Safety'] },
        { id: 'financial_services', name: 'Financial Services', icon: '\uD83C\uDFE6', description: 'Banks, insurance, investment firms, fintech', sort: 7, compliance: ['RBI Guidelines', 'SEBI', 'AML/KYC'] },
        { id: 'hospitality', name: 'Hospitality & Tourism', icon: '\uD83C\uDFE8', description: 'Hotels, restaurants, resorts, travel agencies', sort: 8, compliance: ['FSSAI', 'Fire Safety', 'Tourism Board'] },
        { id: 'retail', name: 'Retail', icon: '\uD83D\uDED2', description: 'Retail stores, supermarkets, e-commerce, chain stores', sort: 9, compliance: ['GST', 'Consumer Protection'] },
        { id: 'automotive', name: 'Automotive', icon: '\uD83D\uDE97', description: 'Car dealerships, service centers, fleet operators', sort: 10, compliance: ['Automotive Standards', 'Emission Norms'] },
        { id: 'real_estate', name: 'Real Estate', icon: '\uD83C\uDFE0', description: 'Property developers, real estate agencies', sort: 11, compliance: ['RERA', 'Building Codes'] },
        { id: 'telecommunications', name: 'Telecommunications', icon: '\uD83D\uDCF6', description: 'Telecom operators, ISPs, communication services', sort: 12, compliance: ['TRAI Regulations', 'DOT Guidelines'] },
        { id: 'logistics', name: 'Transportation & Logistics', icon: '\uD83D\uDE9A', description: 'Logistics companies, courier, warehouses', sort: 13, compliance: ['Transport Regulations', 'GST E-way Bills'] },
        { id: 'government', name: 'Government', icon: '\uD83C\uDFDB\uFE0F', description: 'Government departments, PSUs, municipal corporations', sort: 14, compliance: ['Procurement Rules', 'GeM Portal', 'RTI'] },
        { id: 'other', name: 'Other Industries', icon: '\uD83D\uDCBC', description: 'Industries not covered by specific categories', sort: 15, compliance: ['General Business Laws'] }
    ],

    // ═══════════ CATEGORIES PER INDUSTRY ═══════════
    // Real data from m_catalog_categories (showing top entries per industry + counts)
    categories: {
        healthcare: {
            count: 25,
            items: [
                { id: 'medical_equipment_amc', name: 'Medical Equipment AMC', variants: ['Comprehensive', 'Preventive', 'Breakdown', 'Calibration Only'] },
                { id: 'biomedical_equipment', name: 'Biomedical Equipment Services', variants: ['Installation', 'Repair', 'Calibration', 'Validation'] },
                { id: 'imaging_equipment_amc', name: 'Imaging Equipment AMC', variants: ['MRI', 'CT Scan', 'X-Ray', 'Ultrasound', 'PET Scan'] },
                { id: 'patient_care_services', name: 'Patient Care Services', variants: ['ICU Care', 'General Ward', 'Home Care', 'Palliative Care'] },
                { id: 'nursing_services', name: 'Nursing Services', variants: ['RN', 'LPN', 'Critical Care', 'Pediatric', 'Geriatric'] },
                { id: 'attendant_services', name: 'Attendant Services', variants: ['Ward Boy', 'Stretcher Bearer', 'OT Technician'] },
                { id: 'diagnostic_services', name: 'Diagnostic Services', variants: ['Pathology', 'Radiology', 'ECG', 'EEG'] },
                { id: 'laboratory_services', name: 'Laboratory Services', variants: ['Blood Tests', 'Urine Analysis', 'Microbiology'] },
                { id: 'health_screening', name: 'Health Screening Packages', variants: ['Basic', 'Comprehensive', 'Executive', 'Senior Citizen'] }
            ]
        },
        wellness: {
            count: 20,
            items: [
                { id: 'yoga_meditation', name: 'Yoga & Meditation', variants: ['Hatha', 'Vinyasa', 'Power Yoga', 'Ashtanga', 'Meditation'] },
                { id: 'gym_membership', name: 'Gym Membership Services', variants: ['Basic', 'Premium', 'Elite', 'Corporate', 'Family'] },
                { id: 'personal_training', name: 'Personal Training', variants: ['Weight Training', 'Functional', 'Sports Specific', 'HIIT'] },
                { id: 'group_fitness', name: 'Group Fitness Classes', variants: ['Aerobics', 'Zumba', 'Pilates', 'CrossFit'] },
                { id: 'spa_services', name: 'Spa Services', variants: ['Swedish', 'Deep Tissue', 'Hot Stone', 'Aromatherapy'] }
            ]
        },
        manufacturing: {
            count: 25,
            items: [
                { id: 'production_equipment_amc', name: 'Production Equipment AMC', variants: ['CNC Machines', 'Lathe', 'Milling', 'Press', 'Assembly Line'] },
                { id: 'automation_services', name: 'Industrial Automation', variants: ['PLC Programming', 'SCADA Systems', 'Robotics', 'HMI'] },
                { id: 'conveyor_maintenance', name: 'Conveyor System Maintenance', variants: ['Belt', 'Roller', 'Chain', 'Pneumatic'] },
                { id: 'packaging_equipment', name: 'Packaging Equipment Services', variants: ['Filling Machines', 'Sealing', 'Labeling', 'Wrapping'] },
                { id: 'quality_inspection', name: 'Quality Inspection Services', variants: ['Incoming', 'In-process QC', 'Final', 'Third Party'] }
            ]
        },
        facility_management: {
            count: 30,
            items: [
                { id: 'building_maintenance', name: 'Integrated Building Maintenance', variants: ['Hard Services', 'Soft Services', 'Integrated FM'] },
                { id: 'hvac_services', name: 'HVAC Services', variants: ['Split AC', 'VRF Systems', 'Chiller Plants', 'AHU'] },
                { id: 'electrical_maintenance', name: 'Electrical Maintenance', variants: ['HT/LT Panels', 'DG Sets', 'UPS Systems', 'Solar'] },
                { id: 'plumbing_services', name: 'Plumbing Services', variants: ['Water Supply', 'Drainage', 'Fixtures', 'Pumps'] },
                { id: 'elevator_maintenance', name: 'Elevator/Lift Maintenance', variants: ['Passenger Lifts', 'Goods Lifts', 'Escalators'] }
            ]
        },
        technology: {
            count: 30,
            items: [
                { id: 'it_infrastructure', name: 'IT Infrastructure Support', variants: ['Server Mgmt', 'Network', 'Storage', 'Virtualization'] },
                { id: 'cloud_services', name: 'Cloud Services', variants: ['AWS', 'Azure', 'Google Cloud', 'Private Cloud'] },
                { id: 'datacenter_services', name: 'Data Center Services', variants: ['Colocation', 'Managed Hosting', 'DR Site'] },
                { id: 'network_services', name: 'Network Services', variants: ['LAN/WAN', 'WiFi', 'SD-WAN', 'Network Security'] },
                { id: 'software_development', name: 'Software Development', variants: ['Web Apps', 'Mobile Apps', 'Enterprise', 'APIs'] }
            ]
        },
        education: {
            count: 30,
            items: [
                { id: 'classroom_teaching', name: 'Classroom Teaching Services', variants: ['Regular Faculty', 'Visiting Faculty', 'Guest Lectures'] },
                { id: 'online_teaching', name: 'Online Teaching Platform', variants: ['Live Classes', 'Recorded Lectures', 'Hybrid Mode'] },
                { id: 'tuition_coaching', name: 'Tuition & Coaching', variants: ['Individual', 'Group', 'Online', 'Test Prep'] },
                { id: 'skill_training', name: 'Skill Development Programs', variants: ['Technical', 'Soft Skills', 'Language', 'Certification'] },
                { id: 'competitive_exam_prep', name: 'Competitive Exam Preparation', variants: ['JEE', 'NEET', 'Civil Services', 'Banking'] }
            ]
        },
        financial_services: {
            count: 30,
            items: [
                { id: 'banking_services', name: 'Banking Services', variants: ['Savings', 'Current', 'Fixed Deposits', 'Loans'] },
                { id: 'corporate_banking', name: 'Corporate Banking', variants: ['Cash Mgmt', 'Trade Finance', 'Working Capital'] },
                { id: 'portfolio_management', name: 'Portfolio Management', variants: ['Discretionary', 'Advisory', 'Thematic'] },
                { id: 'insurance_services', name: 'Insurance Services', variants: ['Life', 'Health', 'Motor', 'Property'] },
                { id: 'tax_advisory', name: 'Tax Advisory', variants: ['Income Tax', 'GST', 'International Tax'] }
            ]
        },
        hospitality: {
            count: 25,
            items: [
                { id: 'room_services', name: 'Room Services & Housekeeping', variants: ['Daily Cleaning', 'Turn Down', 'Laundry'] },
                { id: 'front_office', name: 'Front Office Services', variants: ['Check-in/out', 'Reservations', 'Guest Relations'] },
                { id: 'restaurant_services', name: 'Restaurant Services', variants: ['Fine Dining', 'Multi-cuisine', 'Buffet'] },
                { id: 'event_management', name: 'Event & Banquet Services', variants: ['Weddings', 'Corporate Events', 'Conferences'] },
                { id: 'kitchen_equipment', name: 'Kitchen Equipment AMC', variants: ['Ovens', 'Refrigeration', 'Dishwashers'] }
            ]
        },
        retail: {
            count: 25,
            items: [
                { id: 'pos_systems', name: 'POS System Services', variants: ['Hardware', 'Software', 'Payment Integration'] },
                { id: 'inventory_mgmt', name: 'Inventory Management', variants: ['RFID', 'Barcode', 'Real-time Tracking'] },
                { id: 'store_fixtures', name: 'Store Fixtures & Equipment', variants: ['Shelving', 'Display Units', 'Signage'] },
                { id: 'refrigeration', name: 'Refrigeration AMC', variants: ['Display Coolers', 'Walk-in Freezers', 'Ice Machines'] },
                { id: 'retail_security', name: 'Retail Security Solutions', variants: ['CCTV', 'EAS Tags', 'Access Control'] }
            ]
        },
        automotive: {
            count: 25,
            items: [
                { id: 'vehicle_servicing', name: 'Vehicle Service Packages', variants: ['Basic', 'Major', 'Express', 'Comprehensive'] },
                { id: 'warranty_services', name: 'Extended Warranty Programs', variants: ['Powertrain', 'Comprehensive', 'Bumper to Bumper'] },
                { id: 'breakdown_assistance', name: 'Roadside Assistance', variants: ['Towing', 'Battery Jump', 'Flat Tire', 'Fuel Delivery'] },
                { id: 'vehicle_inspection', name: 'Vehicle Inspection Services', variants: ['Pre-purchase', 'Annual', 'Emission', 'Safety'] },
                { id: 'engine_repair', name: 'Engine Repair Services', variants: ['Overhaul', 'Timing Belt', 'Head Gasket', 'Turbo'] }
            ]
        },
        real_estate: {
            count: 25,
            items: [
                { id: 'property_management', name: 'Property Management', variants: ['Residential', 'Commercial', 'Industrial'] },
                { id: 'building_inspection', name: 'Building Inspection', variants: ['Structural', 'Electrical', 'Plumbing', 'Fire Safety'] },
                { id: 'interior_fitout', name: 'Interior Fit-out Services', variants: ['Office', 'Retail', 'Residential', 'Hospitality'] },
                { id: 'security_services', name: 'Security Services', variants: ['Guards', 'CCTV', 'Access Control', 'Alarm Systems'] },
                { id: 'landscaping', name: 'Landscaping & Gardening', variants: ['Lawn Care', 'Tree Surgery', 'Irrigation'] }
            ]
        },
        telecommunications: {
            count: 25,
            items: [
                { id: 'tower_maintenance', name: 'Cell Tower Maintenance', variants: ['Preventive', 'Corrective', 'Emergency'] },
                { id: 'fiber_services', name: 'Fiber Optic Services', variants: ['Installation', 'Splicing', 'Testing', 'Repair'] },
                { id: 'switching_equipment', name: 'Switching Equipment AMC', variants: ['Core Network', 'Access Network', 'Transport'] },
                { id: 'customer_premise', name: 'Customer Premise Equipment', variants: ['Router', 'Modem', 'Set-top Box', 'ONT'] },
                { id: 'network_monitoring', name: 'Network Monitoring Services', variants: ['24x7 NOC', 'Performance', 'Security'] }
            ]
        },
        logistics: {
            count: 25,
            items: [
                { id: 'fleet_management', name: 'Fleet Management Services', variants: ['GPS Tracking', 'Fuel Mgmt', 'Maintenance'] },
                { id: 'warehouse_services', name: 'Warehouse Services', variants: ['Storage', 'Pick & Pack', 'Cross-docking'] },
                { id: 'cold_chain', name: 'Cold Chain Logistics', variants: ['Refrigerated Transport', 'Cold Storage', 'Temp Monitoring'] },
                { id: 'material_handling', name: 'Material Handling Equipment', variants: ['Forklifts', 'Pallet Jacks', 'Conveyor Systems'] },
                { id: 'last_mile', name: 'Last Mile Delivery', variants: ['Same Day', 'Next Day', 'Scheduled', 'White Glove'] }
            ]
        },
        government: {
            count: 25,
            items: [
                { id: 'building_maintenance_gov', name: 'Government Building Maintenance', variants: ['Heritage', 'Modern', 'Campus'] },
                { id: 'it_services_gov', name: 'Government IT Services', variants: ['e-Governance', 'Data Center', 'Network'] },
                { id: 'security_gov', name: 'Government Security', variants: ['Physical', 'Cyber', 'CCTV', 'Access Control'] },
                { id: 'fleet_gov', name: 'Government Fleet Management', variants: ['VIP', 'General Pool', 'Specialized'] },
                { id: 'cleaning_gov', name: 'Government Cleaning Services', variants: ['Office', 'Hospital', 'Public Spaces'] }
            ]
        },
        other: {
            count: 20,
            items: [
                { id: 'general_amc', name: 'General AMC Services', variants: ['Equipment', 'Systems', 'Infrastructure'] },
                { id: 'consulting', name: 'Consulting Services', variants: ['Management', 'Technical', 'Strategy'] },
                { id: 'training', name: 'Training & Development', variants: ['Corporate', 'Technical', 'Safety'] }
            ]
        }
    },

    // ═══════════ RESOURCE TEMPLATES (21 total — real data) ═══════════
    resourceTemplates: [
        // Healthcare (4)
        { id: 'rt-hc-001', industry_id: 'healthcare', resource_type_id: 'team_staff', name: 'Medical Doctor', description: 'Licensed medical practitioner', pricing: { min: 100, max: 250, suggested: 150 }, attributes: { certifications: ['medical_license'], experience: 'expert' } },
        { id: 'rt-hc-002', industry_id: 'healthcare', resource_type_id: 'team_staff', name: 'Registered Nurse', description: 'Licensed nursing professional', pricing: { min: 50, max: 100, suggested: 75 }, attributes: { certifications: ['nursing_license'], experience: 'intermediate' } },
        { id: 'rt-hc-003', industry_id: 'healthcare', resource_type_id: 'equipment', name: 'Medical Diagnostic Equipment', description: 'Diagnostic tools and machines', pricing: { min: 25, max: 75, suggested: 50 }, attributes: { calibration: true, maintenance: 'monthly' } },
        { id: 'rt-hc-004', industry_id: 'healthcare', resource_type_id: 'consumable', name: 'Medical Supplies', description: 'Disposable medical supplies', pricing: { min: 3, max: 10, suggested: 5 }, attributes: { sterile: true, expiry_tracking: true } },
        // Wellness (3)
        { id: 'rt-wl-001', industry_id: 'wellness', resource_type_id: 'team_staff', name: 'Yoga Instructor', description: 'Certified yoga and wellness instructor', pricing: { min: 40, max: 100, suggested: 60 }, attributes: { certifications: ['yoga_certification'] } },
        { id: 'rt-wl-002', industry_id: 'wellness', resource_type_id: 'team_staff', name: 'Fitness Trainer', description: 'Personal fitness and gym trainer', pricing: { min: 30, max: 80, suggested: 50 }, attributes: { certifications: ['fitness_certification'] } },
        { id: 'rt-wl-003', industry_id: 'wellness', resource_type_id: 'equipment', name: 'Fitness Equipment', description: 'Gym and wellness equipment', pricing: { min: 15, max: 30, suggested: 20 }, attributes: { maintenance: 'monthly', safety_cert: true } },
        // Manufacturing (4)
        { id: 'rt-mf-001', industry_id: 'manufacturing', resource_type_id: 'team_staff', name: 'Production Engineer', description: 'Manufacturing and production specialist', pricing: { min: 60, max: 120, suggested: 85 }, attributes: { certifications: ['engineering_degree'] } },
        { id: 'rt-mf-002', industry_id: 'manufacturing', resource_type_id: 'team_staff', name: 'Quality Control Specialist', description: 'Quality assurance and testing expert', pricing: { min: 50, max: 95, suggested: 70 }, attributes: { certifications: ['qa_certification'] } },
        { id: 'rt-mf-003', industry_id: 'manufacturing', resource_type_id: 'equipment', name: 'Manufacturing Equipment', description: 'Production machinery and tools', pricing: { min: 50, max: 100, suggested: 75 }, attributes: { maintenance: 'weekly', safety_cert: true } },
        { id: 'rt-mf-004', industry_id: 'manufacturing', resource_type_id: 'asset', name: 'Production Facility', description: 'Manufacturing plant or facility space', pricing: { min: 150, max: 300, suggested: 200 }, attributes: { capacity: 'variable', utilities: true } },
        // Technology (3)
        { id: 'rt-tc-001', industry_id: 'technology', resource_type_id: 'team_staff', name: 'Software Developer', description: 'Programming and development specialist', pricing: { min: 70, max: 150, suggested: 95 }, attributes: { skills: ['programming'] } },
        { id: 'rt-tc-002', industry_id: 'technology', resource_type_id: 'team_staff', name: 'IT Support Specialist', description: 'Technical support and maintenance', pricing: { min: 45, max: 85, suggested: 65 }, attributes: { certifications: ['it_support'] } },
        { id: 'rt-tc-003', industry_id: 'technology', resource_type_id: 'equipment', name: 'IT Equipment', description: 'Computers, servers, and technical tools', pricing: { min: 20, max: 40, suggested: 25 }, attributes: { warranty: true, licensing: true } },
        // Facility Management (3)
        { id: 'rt-fm-001', industry_id: 'facility_management', resource_type_id: 'team_staff', name: 'Facility Manager', description: 'Building and facility management specialist', pricing: { min: 50, max: 100, suggested: 70 }, attributes: { certifications: ['facility_management'], experience: 'expert' } },
        { id: 'rt-fm-002', industry_id: 'facility_management', resource_type_id: 'team_staff', name: 'Maintenance Technician', description: 'General maintenance and repair specialist', pricing: { min: 30, max: 70, suggested: 45 }, attributes: { skills: ['electrical', 'plumbing', 'hvac'] } },
        { id: 'rt-fm-003', industry_id: 'facility_management', resource_type_id: 'equipment', name: 'Facility Equipment', description: 'HVAC, elevators, and building systems', pricing: { min: 30, max: 50, suggested: 40 }, attributes: { maintenance: 'quarterly', cert_required: true } },
        // Automotive (4)
        { id: 'rt-au-001', industry_id: 'automotive', resource_type_id: 'team_staff', name: 'Automotive Technician', description: 'Car service and repair specialist', pricing: { min: 40, max: 80, suggested: 55 }, attributes: { certifications: ['automotive_certification'] } },
        { id: 'rt-au-002', industry_id: 'automotive', resource_type_id: 'team_staff', name: 'Service Advisor', description: 'Customer service and automotive consultation', pricing: { min: 30, max: 60, suggested: 40 }, attributes: { customer_service: true } },
        { id: 'rt-au-003', industry_id: 'automotive', resource_type_id: 'equipment', name: 'Diagnostic Equipment', description: 'Car diagnostic and service tools', pricing: { min: 15, max: 40, suggested: 30 }, attributes: { software_updates: true, calibration: true } },
        { id: 'rt-au-004', industry_id: 'automotive', resource_type_id: 'consumable', name: 'Auto Parts & Fluids', description: 'Replacement parts and service fluids', pricing: { min: 10, max: 25, suggested: 15 }, attributes: { warranty_tracking: true, inventory: true } }
    ],

    // ═══════════ SIMULATED TEMPLATES (what's been built so far) ═══════════
    // In reality this would come from m_cat_templates WHERE scope='global'
    existingTemplates: [
        // Healthcare — some templates exist
        { id: 'tpl-g-001', resource_template_id: 'rt-hc-001', nomenclature: 'AMC', name: 'Medical Doctor AMC Template', status: 'published', blocks: 7, smartForms: 2, timesUsed: 12 },
        { id: 'tpl-g-002', resource_template_id: 'rt-hc-003', nomenclature: 'AMC', name: 'Diagnostic Equipment AMC', status: 'published', blocks: 8, smartForms: 3, timesUsed: 8 },
        { id: 'tpl-g-003', resource_template_id: 'rt-hc-002', nomenclature: 'AMC', name: 'Nursing Services AMC', status: 'draft', blocks: 5, smartForms: 1, timesUsed: 0 },
        // Manufacturing — partial
        { id: 'tpl-g-004', resource_template_id: 'rt-mf-003', nomenclature: 'AMC', name: 'Manufacturing Equipment AMC', status: 'published', blocks: 9, smartForms: 3, timesUsed: 15 },
        { id: 'tpl-g-005', resource_template_id: 'rt-mf-003', nomenclature: 'CMC', name: 'Manufacturing Equipment CMC', status: 'published', blocks: 10, smartForms: 4, timesUsed: 6 },
        // Automotive — partial
        { id: 'tpl-g-006', resource_template_id: 'rt-au-001', nomenclature: 'AMC', name: 'Auto Technician AMC', status: 'published', blocks: 6, smartForms: 2, timesUsed: 20 },
        { id: 'tpl-g-007', resource_template_id: 'rt-au-003', nomenclature: 'AMC', name: 'Diagnostic Equipment AMC', status: 'draft', blocks: 5, smartForms: 1, timesUsed: 0 },
        // Facility Management — partial
        { id: 'tpl-g-008', resource_template_id: 'rt-fm-003', nomenclature: 'AMC', name: 'Facility Equipment AMC', status: 'published', blocks: 8, smartForms: 3, timesUsed: 10 }
    ],

    // ═══════════ NOMENCLATURE TYPES ═══════════
    nomenclatures: [
        { code: 'AMC', name: 'Annual Maintenance Contract', description: 'Periodic preventive maintenance on subscription basis' },
        { code: 'CMC', name: 'Comprehensive Maintenance Contract', description: 'All-inclusive maintenance including parts and labor' },
        { code: 'FMC', name: 'Facility Management Contract', description: 'Ongoing facility-level management and maintenance' },
        { code: 'BREAKDOWN', name: 'Breakdown / On-Demand', description: 'Per-incident billing for breakdown repairs' },
        { code: 'CAMC', name: 'Computer AMC', description: 'IT equipment and computer maintenance contract' },
        { code: 'ON_DEMAND', name: 'On-Demand Service', description: 'Pay-per-use service with no subscription' }
    ],

    // ═══════════ BLOCK TYPES (for template builder) ═══════════
    blockTypes: [
        { id: 'scope_of_work', name: 'Scope of Work', icon: '\uD83D\uDCCB', description: 'Define services included/excluded', required: true, defaultFields: ['service_description', 'inclusions', 'exclusions', 'frequency'] },
        { id: 'pricing', name: 'Pricing & Payment', icon: '\uD83D\uDCB0', description: 'Cost structure, rates, payment terms', required: true, defaultFields: ['base_rate', 'rate_type', 'payment_schedule', 'tax_details'] },
        { id: 'sla', name: 'Service Level Agreement', icon: '\u23F1\uFE0F', description: 'Response times, uptime, penalties', required: false, defaultFields: ['response_time', 'resolution_time', 'uptime_guarantee', 'penalty_clause'] },
        { id: 'duration', name: 'Contract Duration', icon: '\uD83D\uDCC5', description: 'Start/end dates, renewal, termination', required: true, defaultFields: ['start_date', 'end_date', 'auto_renewal', 'notice_period'] },
        { id: 'resources', name: 'Resource Allocation', icon: '\uD83D\uDC65', description: 'Team members, equipment, consumables assigned', required: false, defaultFields: ['resource_list', 'quantity', 'availability', 'backup_resources'] },
        { id: 'escalation', name: 'Escalation Matrix', icon: '\uD83D\uDCE2', description: 'Contact hierarchy for issue resolution', required: false, defaultFields: ['level_1_contact', 'level_2_contact', 'level_3_contact', 'escalation_timeline'] },
        { id: 'compliance', name: 'Compliance & Certifications', icon: '\uD83D\uDEE1\uFE0F', description: 'Regulatory requirements, certifications', required: false, defaultFields: ['applicable_standards', 'certifications_required', 'audit_schedule'] },
        { id: 'terms', name: 'Terms & Conditions', icon: '\uD83D\uDCC4', description: 'Legal clauses, liability, indemnity', required: true, defaultFields: ['liability_cap', 'indemnity_clause', 'force_majeure', 'governing_law'] },
        { id: 'reporting', name: 'Reporting & Reviews', icon: '\uD83D\uDCCA', description: 'Periodic reports, review meetings', required: false, defaultFields: ['report_frequency', 'report_format', 'review_meeting_schedule'] },
        { id: 'custom', name: 'Custom Block', icon: '\u2699\uFE0F', description: 'User-defined content block', required: false, defaultFields: ['custom_content'] }
    ],

    // ═══════════ SAMPLE BLOCK DATA (for existing templates) ═══════════
    // Maps template ID -> array of blocks with field values
    templateBlocks: {
        'tpl-g-001': [ // Medical Doctor AMC
            { blockType: 'scope_of_work', order: 1, fields: { service_description: 'Preventive and corrective maintenance for medical practitioners', inclusions: 'Regular check-ups, On-call availability, Emergency consultations', exclusions: 'Surgical procedures, Specialist referrals', frequency: 'Monthly' } },
            { blockType: 'pricing', order: 2, fields: { base_rate: '{{resource.pricing.suggested}}', rate_type: 'Hourly', payment_schedule: 'Monthly', tax_details: 'GST @18%' } },
            { blockType: 'duration', order: 3, fields: { start_date: '{{contract.start_date}}', end_date: '{{contract.end_date}}', auto_renewal: 'Yes, 30 days notice', notice_period: '30 days' } },
            { blockType: 'sla', order: 4, fields: { response_time: '30 minutes (critical), 2 hours (normal)', resolution_time: '4 hours (critical), 24 hours (normal)', uptime_guarantee: '99.5%', penalty_clause: '5% deduction per SLA breach' } },
            { blockType: 'resources', order: 5, fields: { resource_list: '{{resource.name}}', quantity: '{{contract.quantity}}', availability: '24x7', backup_resources: '1 backup per 5 primary' } },
            { blockType: 'compliance', order: 6, fields: { applicable_standards: 'NABH, HIPAA', certifications_required: 'Medical License, Board Certification', audit_schedule: 'Quarterly' } },
            { blockType: 'terms', order: 7, fields: { liability_cap: '2x Annual Contract Value', indemnity_clause: 'Mutual indemnification', force_majeure: 'Standard', governing_law: 'Indian Contract Act' } }
        ],
        'tpl-g-004': [ // Manufacturing Equipment AMC
            { blockType: 'scope_of_work', order: 1, fields: { service_description: 'Preventive maintenance for CNC, lathe, and milling equipment', inclusions: 'Scheduled servicing, Calibration, Wear parts replacement', exclusions: 'Major overhaul, Accident damage, Operator error', frequency: 'Quarterly' } },
            { blockType: 'pricing', order: 2, fields: { base_rate: '{{resource.pricing.suggested}}', rate_type: 'Per Visit + Parts at actuals', payment_schedule: 'Quarterly advance', tax_details: 'GST @18%' } },
            { blockType: 'duration', order: 3, fields: { start_date: '{{contract.start_date}}', end_date: '{{contract.end_date}}', auto_renewal: 'Yes, 60 days notice', notice_period: '60 days' } },
            { blockType: 'sla', order: 4, fields: { response_time: '2 hours (breakdown), 48 hours (scheduled)', resolution_time: '8 hours (critical), 5 days (non-critical)', uptime_guarantee: '95%', penalty_clause: '2% per day downtime beyond SLA' } },
            { blockType: 'resources', order: 5, fields: { resource_list: 'Production Engineer, QC Specialist', quantity: 'As per equipment count', availability: 'Mon-Sat 8am-6pm', backup_resources: 'On-call weekend support' } },
            { blockType: 'escalation', order: 6, fields: { level_1_contact: 'Site Technician', level_2_contact: 'Regional Service Manager', level_3_contact: 'National Head - Service', escalation_timeline: 'L1: 0-2h, L2: 2-4h, L3: 4-8h' } },
            { blockType: 'compliance', order: 7, fields: { applicable_standards: 'ISO 9001:2015, ISO 14001', certifications_required: 'OEM Certification', audit_schedule: 'Bi-annual' } },
            { blockType: 'reporting', order: 8, fields: { report_frequency: 'Monthly', report_format: 'PDF + Dashboard', review_meeting_schedule: 'Quarterly' } },
            { blockType: 'terms', order: 9, fields: { liability_cap: '1x Annual Contract Value', indemnity_clause: 'Service provider indemnifies client', force_majeure: 'Extended (pandemic, supply chain)', governing_law: 'Indian Contract Act' } }
        ]
    },

    // ═══════════ SMARTFORM FIELD TYPES ═══════════
    smartFormFieldTypes: [
        { id: 'text', name: 'Text', icon: 'T' },
        { id: 'number', name: 'Number', icon: '#' },
        { id: 'date', name: 'Date', icon: '\uD83D\uDCC5' },
        { id: 'select', name: 'Dropdown', icon: '\u25BC' },
        { id: 'multi_select', name: 'Multi-Select', icon: '\u2610' },
        { id: 'currency', name: 'Currency', icon: '$' },
        { id: 'percentage', name: 'Percentage', icon: '%' },
        { id: 'template_var', name: 'Template Variable', icon: '{ }' }
    ],

    // Helper: get blocks for a template
    getTemplateBlocks(templateId) {
        return (this.templateBlocks[templateId] || []).map(b => ({
            ...b,
            type: this.blockTypes.find(bt => bt.id === b.blockType)
        }));
    },

    // ═══════════ COMPUTED HELPERS ═══════════
    getIndustryResources(industryId) {
        return this.resourceTemplates.filter(r => r.industry_id === industryId);
    },

    getResourceTemplates(resourceTemplateId) {
        return this.existingTemplates.filter(t => t.resource_template_id === resourceTemplateId);
    },

    getIndustryCoverage(industryId) {
        const resources = this.getIndustryResources(industryId);
        const categories = this.categories[industryId];
        const catCount = categories ? categories.count : 0;
        const resCount = resources.length;

        // Templates existing for this industry's resources
        const templates = resources.flatMap(r => this.getResourceTemplates(r.id));
        const publishedTemplates = templates.filter(t => t.status === 'published');

        // Coverage % = (resources with at least 1 published template) / total possible
        // "total possible" = resources * avg nomenclature types (let's say 4)
        const maxPossible = resCount * 4; // each resource could have AMC, CMC, FMC, Breakdown
        const actual = publishedTemplates.length;
        const coveragePercent = maxPossible > 0 ? Math.round((actual / maxPossible) * 100) : 0;

        return {
            industryId,
            categories: catCount,
            resources: resCount,
            totalTemplates: templates.length,
            publishedTemplates: publishedTemplates.length,
            draftTemplates: templates.filter(t => t.status === 'draft').length,
            smartForms: templates.reduce((s, t) => s + t.smartForms, 0),
            gaps: maxPossible - actual,
            maxPossible,
            coveragePercent,
            timesUsed: templates.reduce((s, t) => s + t.timesUsed, 0)
        };
    },

    getAllCoverage() {
        return this.industries.map(ind => ({
            ...ind,
            coverage: this.getIndustryCoverage(ind.id)
        }));
    },

    getGlobalStats() {
        const allCoverage = this.getAllCoverage();
        const totalResources = this.resourceTemplates.length;
        const totalTemplates = this.existingTemplates.length;
        const publishedTemplates = this.existingTemplates.filter(t => t.status === 'published').length;
        const totalCategories = Object.values(this.categories).reduce((s, c) => s + c.count, 0);
        const industriesWithResources = new Set(this.resourceTemplates.map(r => r.industry_id)).size;
        const totalGaps = allCoverage.reduce((s, i) => s + i.coverage.gaps, 0);
        const totalSmartForms = allCoverage.reduce((s, i) => s + i.coverage.smartForms, 0);
        const avgCoverage = Math.round(allCoverage.reduce((s, i) => s + i.coverage.coveragePercent, 0) / allCoverage.length);

        return {
            totalIndustries: this.industries.length,
            totalCategories,
            totalResources,
            totalTemplates,
            publishedTemplates,
            totalGaps,
            totalSmartForms,
            industriesWithResources,
            industriesWithGaps: this.industries.length - industriesWithResources,
            avgCoverage
        };
    }
};
