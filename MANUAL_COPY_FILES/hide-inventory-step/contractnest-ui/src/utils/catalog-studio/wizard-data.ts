// src/utils/catalog-studio/wizard-data.ts
import { WizardStep, EvidenceType, CancellationPolicy, IconOption, CurrencyOption } from '../../types/catalogStudio';

export const WIZARD_STEPS: Record<string, WizardStep[]> = {
  service: [
    { id: 1, label: 'Type' },
    { id: 2, label: 'Basic Info' },
    { id: 3, label: 'Resources' },      // ResourceDependencyStep - Independent vs Resource-based
    { id: 4, label: 'Delivery' },
    { id: 5, label: 'Pricing' },
    { id: 6, label: 'Evidence' },
    { id: 7, label: 'Business Rules' },
  ],
  spare: [
    { id: 1, label: 'Type' },
    { id: 2, label: 'Basic Info' },
    { id: 3, label: 'Pricing' },
  ],
  billing: [
    { id: 1, label: 'Type' },
    { id: 2, label: 'Basic Info' },
    { id: 3, label: 'Structure' },
    { id: 4, label: 'Schedule' },
    { id: 5, label: 'Automation' },
  ],
  // TEXT BLOCK: Single page (Type + Content with Name/Icon/RichText)
  text: [
    { id: 1, label: 'Type' },
    { id: 2, label: 'Content' },  // Name, Icon, RichText all in one
  ],
  // VIDEO BLOCK: Single page (Type + Media with Name/Icon/Video/Settings)
  video: [
    { id: 1, label: 'Type' },
    { id: 2, label: 'Media' },    // Name, Icon, Video, Display Settings all in one
  ],
  image: [
    { id: 1, label: 'Type' },
    { id: 2, label: 'Basic Info' },
    { id: 3, label: 'Upload' },
    { id: 4, label: 'Display' },
  ],
  checklist: [
    { id: 1, label: 'Type' },
    { id: 2, label: 'Basic Info' },
    { id: 3, label: 'Items' },
    { id: 4, label: 'Settings' },
  ],
  document: [
    { id: 1, label: 'Type' },
    { id: 2, label: 'Basic Info' },
    { id: 3, label: 'File Settings' },
  ],
};

export const EVIDENCE_TYPES: EvidenceType[] = [
  { id: 'photo', name: 'Photo', icon: 'Camera', description: 'Capture photos before/during/after service' },
  { id: 'signature', name: 'Customer Signature', icon: 'Pen', description: 'Digital signature for service confirmation' },
  { id: 'gps', name: 'GPS Location', icon: 'MapPin', description: 'Capture technician location at service' },
  { id: 'otp', name: 'OTP Verification', icon: 'Shield', description: 'Customer OTP for service start/completion' },
  { id: 'timestamp', name: 'Timestamp', icon: 'Clock', description: 'Auto-capture date and time' },
  { id: 'report', name: 'Service Report', icon: 'ClipboardList', description: 'Generate detailed service report' },
];

export const ICON_OPTIONS: IconOption[] = [
  { value: 'Heart', label: 'Yoga/Wellness' },
  { value: 'Stethoscope', label: 'Medical' },
  { value: 'Snowflake', label: 'AC/Cooling' },
  { value: 'Wrench', label: 'Repair' },
  { value: 'Monitor', label: 'IT/Tech' },
  { value: 'GraduationCap', label: 'Training' },
  { value: 'Home', label: 'Home' },
  { value: 'Car', label: 'Automotive' },
  { value: 'Sparkles', label: 'Cleaning' },
  { value: 'Settings', label: 'Maintenance' },
  { value: 'Package', label: 'Delivery' },
  { value: 'Briefcase', label: 'Business' },
];

export const CURRENCY_OPTIONS: CurrencyOption[] = [
  { value: 'INR', label: '₹ INR', symbol: '₹' },
  { value: 'USD', label: '$ USD', symbol: '$' },
  { value: 'EUR', label: '€ EUR', symbol: '€' },
  { value: 'GBP', label: '£ GBP', symbol: '£' },
];

export const CANCELLATION_POLICIES: CancellationPolicy[] = [
  { id: 'flexible', name: 'Flexible', description: 'Full refund up to 24 hours before service', refundPercent: 100 },
  { id: 'moderate', name: 'Moderate', description: '50% refund up to 24 hours before service', refundPercent: 50 },
  { id: 'strict', name: 'Strict', description: 'No refund after booking confirmation', refundPercent: 0 },
];
