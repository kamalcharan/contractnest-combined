// src/utils/constants/globalTemplateData.ts
// Rich industry, category, and resource data for the Global Template Designer
// Source: ClaudeDocumentation/globaltemplates/global-designer-prototype/js/data.js
//
// NOTE: Industries come from DB via useTemplateCoverage hook.
// Categories and Resource Types below are MOCK data until API endpoints exist.
// The INDUSTRY_EMOJI_MAP is a fallback for when the API icon field is missing/Lucide name.

// =================================================================
// INDUSTRY EMOJI FALLBACK MAP
// Maps industry IDs to emoji icons. Used when API returns null or Lucide icon names.
// =================================================================
export const INDUSTRY_EMOJI_MAP: Record<string, string> = {
  healthcare: '🏥',
  wellness: '🧘',
  manufacturing: '🏭',
  facility_management: '🏢',
  technology: '💻',
  education: '🎓',
  financial_services: '🏦',
  hospitality: '🏨',
  retail: '🛒',
  automotive: '🚗',
  real_estate: '🏠',
  telecommunications: '📶',
  logistics: '🚚',
  government: '🏛️',
  agriculture: '🌱',
  non_profit: '❤️',
  professional_services: '💼',
  legal: '⚖️',
  energy: '⚡',
  media: '🎬',
  other: '💼',
};

// Helper: resolve icon — prefer API icon if it looks like an emoji, else fallback
export const resolveIndustryIcon = (industryId: string, apiIcon: string | null): string => {
  // If API returns an emoji (starts with a non-ASCII char), use it
  if (apiIcon && /^[^\x00-\x7F]/.test(apiIcon)) return apiIcon;
  // Otherwise use our fallback map
  return INDUSTRY_EMOJI_MAP[industryId] || '📋';
};

// =================================================================
// RESOURCE TYPES (global across all industries)
// =================================================================

export interface ResourceType {
  id: string;
  name: string;
  icon: string;
  pricingModel: string;
}

export const RESOURCE_TYPES: ResourceType[] = [
  { id: 'team_staff', name: 'Team Staff', icon: '👥', pricingModel: 'hourly' },
  { id: 'equipment', name: 'Equipment', icon: '🔧', pricingModel: 'hourly' },
  { id: 'consumable', name: 'Consumables', icon: '📦', pricingModel: 'per_unit' },
  { id: 'asset', name: 'Assets', icon: '🏢', pricingModel: 'hourly' },
  { id: 'partner', name: 'Partners', icon: '🤝', pricingModel: 'fixed' },
];

// NOTE: Industries come from DB via useTemplateCoverage() hook, NOT hardcoded here.

// =================================================================
// CATEGORIES PER INDUSTRY
// =================================================================

export interface CategoryVariant {
  id: string;
  name: string;
  variants: string[];
}

export interface IndustryCategories {
  count: number;
  items: CategoryVariant[];
}

export const INDUSTRY_CATEGORIES: Record<string, IndustryCategories> = {
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
      { id: 'health_screening', name: 'Health Screening Packages', variants: ['Basic', 'Comprehensive', 'Executive', 'Senior Citizen'] },
    ],
  },
  wellness: {
    count: 20,
    items: [
      { id: 'yoga_meditation', name: 'Yoga & Meditation', variants: ['Hatha', 'Vinyasa', 'Power Yoga', 'Ashtanga', 'Meditation'] },
      { id: 'gym_membership', name: 'Gym Membership Services', variants: ['Basic', 'Premium', 'Elite', 'Corporate', 'Family'] },
      { id: 'personal_training', name: 'Personal Training', variants: ['Weight Training', 'Functional', 'Sports Specific', 'HIIT'] },
      { id: 'group_fitness', name: 'Group Fitness Classes', variants: ['Aerobics', 'Zumba', 'Pilates', 'CrossFit'] },
      { id: 'spa_services', name: 'Spa Services', variants: ['Swedish', 'Deep Tissue', 'Hot Stone', 'Aromatherapy'] },
    ],
  },
  manufacturing: {
    count: 25,
    items: [
      { id: 'production_equipment_amc', name: 'Production Equipment AMC', variants: ['CNC Machines', 'Lathe', 'Milling', 'Press', 'Assembly Line'] },
      { id: 'automation_services', name: 'Industrial Automation', variants: ['PLC Programming', 'SCADA Systems', 'Robotics', 'HMI'] },
      { id: 'conveyor_maintenance', name: 'Conveyor System Maintenance', variants: ['Belt', 'Roller', 'Chain', 'Pneumatic'] },
      { id: 'packaging_equipment', name: 'Packaging Equipment Services', variants: ['Filling Machines', 'Sealing', 'Labeling', 'Wrapping'] },
      { id: 'quality_inspection', name: 'Quality Inspection Services', variants: ['Incoming', 'In-process QC', 'Final', 'Third Party'] },
    ],
  },
  facility_management: {
    count: 30,
    items: [
      { id: 'building_maintenance', name: 'Integrated Building Maintenance', variants: ['Hard Services', 'Soft Services', 'Integrated FM'] },
      { id: 'hvac_services', name: 'HVAC Services', variants: ['Split AC', 'VRF Systems', 'Chiller Plants', 'AHU'] },
      { id: 'electrical_maintenance', name: 'Electrical Maintenance', variants: ['HT/LT Panels', 'DG Sets', 'UPS Systems', 'Solar'] },
      { id: 'plumbing_services', name: 'Plumbing Services', variants: ['Water Supply', 'Drainage', 'Fixtures', 'Pumps'] },
      { id: 'elevator_maintenance', name: 'Elevator/Lift Maintenance', variants: ['Passenger Lifts', 'Goods Lifts', 'Escalators'] },
    ],
  },
  technology: {
    count: 30,
    items: [
      { id: 'it_infrastructure', name: 'IT Infrastructure Support', variants: ['Server Mgmt', 'Network', 'Storage', 'Virtualization'] },
      { id: 'cloud_services', name: 'Cloud Services', variants: ['AWS', 'Azure', 'Google Cloud', 'Private Cloud'] },
      { id: 'datacenter_services', name: 'Data Center Services', variants: ['Colocation', 'Managed Hosting', 'DR Site'] },
      { id: 'network_services', name: 'Network Services', variants: ['LAN/WAN', 'WiFi', 'SD-WAN', 'Network Security'] },
      { id: 'software_development', name: 'Software Development', variants: ['Web Apps', 'Mobile Apps', 'Enterprise', 'APIs'] },
    ],
  },
  education: {
    count: 30,
    items: [
      { id: 'classroom_teaching', name: 'Classroom Teaching Services', variants: ['Regular Faculty', 'Visiting Faculty', 'Guest Lectures'] },
      { id: 'online_teaching', name: 'Online Teaching Platform', variants: ['Live Classes', 'Recorded Lectures', 'Hybrid Mode'] },
      { id: 'tuition_coaching', name: 'Tuition & Coaching', variants: ['Individual', 'Group', 'Online', 'Test Prep'] },
      { id: 'skill_training', name: 'Skill Development Programs', variants: ['Technical', 'Soft Skills', 'Language', 'Certification'] },
      { id: 'competitive_exam_prep', name: 'Competitive Exam Preparation', variants: ['JEE', 'NEET', 'Civil Services', 'Banking'] },
    ],
  },
  financial_services: {
    count: 30,
    items: [
      { id: 'banking_services', name: 'Banking Services', variants: ['Savings', 'Current', 'Fixed Deposits', 'Loans'] },
      { id: 'corporate_banking', name: 'Corporate Banking', variants: ['Cash Mgmt', 'Trade Finance', 'Working Capital'] },
      { id: 'portfolio_management', name: 'Portfolio Management', variants: ['Discretionary', 'Advisory', 'Thematic'] },
      { id: 'insurance_services', name: 'Insurance Services', variants: ['Life', 'Health', 'Motor', 'Property'] },
      { id: 'tax_advisory', name: 'Tax Advisory', variants: ['Income Tax', 'GST', 'International Tax'] },
    ],
  },
  hospitality: {
    count: 25,
    items: [
      { id: 'room_services', name: 'Room Services & Housekeeping', variants: ['Daily Cleaning', 'Turn Down', 'Laundry'] },
      { id: 'front_office', name: 'Front Office Services', variants: ['Check-in/out', 'Reservations', 'Guest Relations'] },
      { id: 'restaurant_services', name: 'Restaurant Services', variants: ['Fine Dining', 'Multi-cuisine', 'Buffet'] },
      { id: 'event_management', name: 'Event & Banquet Services', variants: ['Weddings', 'Corporate Events', 'Conferences'] },
      { id: 'kitchen_equipment', name: 'Kitchen Equipment AMC', variants: ['Ovens', 'Refrigeration', 'Dishwashers'] },
    ],
  },
  retail: {
    count: 25,
    items: [
      { id: 'pos_systems', name: 'POS System Services', variants: ['Hardware', 'Software', 'Payment Integration'] },
      { id: 'inventory_mgmt', name: 'Inventory Management', variants: ['RFID', 'Barcode', 'Real-time Tracking'] },
      { id: 'store_fixtures', name: 'Store Fixtures & Equipment', variants: ['Shelving', 'Display Units', 'Signage'] },
      { id: 'refrigeration', name: 'Refrigeration AMC', variants: ['Display Coolers', 'Walk-in Freezers', 'Ice Machines'] },
      { id: 'retail_security', name: 'Retail Security Solutions', variants: ['CCTV', 'EAS Tags', 'Access Control'] },
    ],
  },
  automotive: {
    count: 25,
    items: [
      { id: 'vehicle_servicing', name: 'Vehicle Service Packages', variants: ['Basic', 'Major', 'Express', 'Comprehensive'] },
      { id: 'warranty_services', name: 'Extended Warranty Programs', variants: ['Powertrain', 'Comprehensive', 'Bumper to Bumper'] },
      { id: 'breakdown_assistance', name: 'Roadside Assistance', variants: ['Towing', 'Battery Jump', 'Flat Tire', 'Fuel Delivery'] },
      { id: 'vehicle_inspection', name: 'Vehicle Inspection Services', variants: ['Pre-purchase', 'Annual', 'Emission', 'Safety'] },
      { id: 'engine_repair', name: 'Engine Repair Services', variants: ['Overhaul', 'Timing Belt', 'Head Gasket', 'Turbo'] },
    ],
  },
  real_estate: {
    count: 25,
    items: [
      { id: 'property_management', name: 'Property Management', variants: ['Residential', 'Commercial', 'Industrial'] },
      { id: 'building_inspection', name: 'Building Inspection', variants: ['Structural', 'Electrical', 'Plumbing', 'Fire Safety'] },
      { id: 'interior_fitout', name: 'Interior Fit-out Services', variants: ['Office', 'Retail', 'Residential', 'Hospitality'] },
      { id: 'security_services', name: 'Security Services', variants: ['Guards', 'CCTV', 'Access Control', 'Alarm Systems'] },
      { id: 'landscaping', name: 'Landscaping & Gardening', variants: ['Lawn Care', 'Tree Surgery', 'Irrigation'] },
    ],
  },
  telecommunications: {
    count: 25,
    items: [
      { id: 'tower_maintenance', name: 'Cell Tower Maintenance', variants: ['Preventive', 'Corrective', 'Emergency'] },
      { id: 'fiber_services', name: 'Fiber Optic Services', variants: ['Installation', 'Splicing', 'Testing', 'Repair'] },
      { id: 'switching_equipment', name: 'Switching Equipment AMC', variants: ['Core Network', 'Access Network', 'Transport'] },
      { id: 'customer_premise', name: 'Customer Premise Equipment', variants: ['Router', 'Modem', 'Set-top Box', 'ONT'] },
      { id: 'network_monitoring', name: 'Network Monitoring Services', variants: ['24x7 NOC', 'Performance', 'Security'] },
    ],
  },
  logistics: {
    count: 25,
    items: [
      { id: 'fleet_management', name: 'Fleet Management Services', variants: ['GPS Tracking', 'Fuel Mgmt', 'Maintenance'] },
      { id: 'warehouse_services', name: 'Warehouse Services', variants: ['Storage', 'Pick & Pack', 'Cross-docking'] },
      { id: 'cold_chain', name: 'Cold Chain Logistics', variants: ['Refrigerated Transport', 'Cold Storage', 'Temp Monitoring'] },
      { id: 'material_handling', name: 'Material Handling Equipment', variants: ['Forklifts', 'Pallet Jacks', 'Conveyor Systems'] },
      { id: 'last_mile', name: 'Last Mile Delivery', variants: ['Same Day', 'Next Day', 'Scheduled', 'White Glove'] },
    ],
  },
  government: {
    count: 25,
    items: [
      { id: 'building_maintenance_gov', name: 'Government Building Maintenance', variants: ['Heritage', 'Modern', 'Campus'] },
      { id: 'it_services_gov', name: 'Government IT Services', variants: ['e-Governance', 'Data Center', 'Network'] },
      { id: 'security_gov', name: 'Government Security', variants: ['Physical', 'Cyber', 'CCTV', 'Access Control'] },
      { id: 'fleet_gov', name: 'Government Fleet Management', variants: ['VIP', 'General Pool', 'Specialized'] },
      { id: 'cleaning_gov', name: 'Government Cleaning Services', variants: ['Office', 'Hospital', 'Public Spaces'] },
    ],
  },
  other: {
    count: 20,
    items: [
      { id: 'general_amc', name: 'General AMC Services', variants: ['Equipment', 'Systems', 'Infrastructure'] },
      { id: 'consulting', name: 'Consulting Services', variants: ['Management', 'Technical', 'Strategy'] },
      { id: 'training', name: 'Training & Development', variants: ['Corporate', 'Technical', 'Safety'] },
    ],
  },
};

// Helper: get total categories across all industries
export const getTotalCategories = (): number =>
  Object.values(INDUSTRY_CATEGORIES).reduce((sum, c) => sum + c.count, 0);

// Helper: get categories for a specific industry
export const getCategoriesForIndustry = (industryId: string): CategoryVariant[] =>
  INDUSTRY_CATEGORIES[industryId]?.items || [];

// Helper: get category count for an industry
export const getCategoryCount = (industryId: string): number =>
  INDUSTRY_CATEGORIES[industryId]?.count || 0;
