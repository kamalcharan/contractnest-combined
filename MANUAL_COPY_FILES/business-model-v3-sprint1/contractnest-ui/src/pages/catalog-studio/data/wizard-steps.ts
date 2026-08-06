// src/pages/catalog-studio/data/wizard-steps.ts
import { WizardStep, EvidenceType } from '../types';

export const WIZARD_STEPS: Record<string, WizardStep[]> = {
  service: [
    { id: 1, label: 'Type' },
    { id: 2, label: 'Basic Info' },
    { id: 3, label: 'Delivery' },
    { id: 4, label: 'Pricing' },
    { id: 5, label: 'Evidence' },
    { id: 6, label: 'Rules' },
  ],
  spare: [
    { id: 1, label: 'Type' },
    { id: 2, label: 'Basic Info' },
    { id: 3, label: 'Inventory' },
    { id: 4, label: 'Pricing' },
    { id: 5, label: 'Fulfillment' },
  ],
  billing: [
    { id: 1, label: 'Type' },
    { id: 2, label: 'Basic Info' },
    { id: 3, label: 'Structure' },
    { id: 4, label: 'Schedule' },
    { id: 5, label: 'Automation' },
  ],
  // Credit Pack (platform only). No delivery, evidence or SLA — a metering
  // block grants credits, sets limits or flips a flag; it is never performed.
  // Pricing stays, because a Credit Pack is something the tenant buys.
  metering: [
    { id: 1, label: 'Type' },
    { id: 2, label: 'Basic Info' },
    { id: 3, label: 'Metering' },
    { id: 4, label: 'Pricing' },
  ],
  text: [
    { id: 1, label: 'Type' },
    { id: 2, label: 'Basic Info' },
    { id: 3, label: 'Content' },
    { id: 4, label: 'Settings' },
  ],
  video: [
    { id: 1, label: 'Type' },
    { id: 2, label: 'Basic Info' },
    { id: 3, label: 'Media' },
    { id: 4, label: 'Settings' },
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
    { id: 4, label: 'Settings' },
  ],
};

export const EVIDENCE_TYPES: EvidenceType[] = [
  { id: 'photo', name: 'Photo', icon: '📷', description: 'Capture photos before/during/after service' },
  { id: 'signature', name: 'Customer Signature', icon: '✍️', description: 'Digital signature for service confirmation' },
  { id: 'gps', name: 'GPS Location', icon: '📍', description: 'Capture technician location at service' },
  { id: 'otp', name: 'OTP Verification', icon: '🔐', description: 'Customer OTP for service start/completion' },
  { id: 'timestamp', name: 'Timestamp', icon: '🕐', description: 'Auto-capture date and time' },
  { id: 'report', name: 'Service Report', icon: '📋', description: 'Generate detailed service report' },
];

export const ICON_OPTIONS = [
  { value: '🧘', label: '🧘 Yoga/Wellness' },
  { value: '🩺', label: '🩺 Medical' },
  { value: '❄️', label: '❄️ AC/Cooling' },
  { value: '🔧', label: '🔧 Repair' },
  { value: '💻', label: '💻 IT/Tech' },
  { value: '🎓', label: '🎓 Training' },
  { value: '🏠', label: '🏠 Home' },
  { value: '🚗', label: '🚗 Automotive' },
  { value: '🧹', label: '🧹 Cleaning' },
  { value: '🛠️', label: '🛠️ Maintenance' },
  { value: '📦', label: '📦 Delivery' },
  { value: '💼', label: '💼 Business' },
];

export const CURRENCY_OPTIONS = [
  { value: 'INR', label: '₹ INR', symbol: '₹' },
  { value: 'USD', label: '$ USD', symbol: '$' },
  { value: 'EUR', label: '€ EUR', symbol: '€' },
  { value: 'GBP', label: '£ GBP', symbol: '£' },
];

export const CANCELLATION_POLICIES = [
  { id: 'flexible', name: 'Flexible', description: 'Full refund up to 24 hours before service', refundPercent: 100 },
  { id: 'moderate', name: 'Moderate', description: '50% refund up to 24 hours before service', refundPercent: 50 },
  { id: 'strict', name: 'Strict', description: 'No refund after booking confirmation', refundPercent: 0 },
];
