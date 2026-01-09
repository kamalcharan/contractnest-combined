// src/components/playground/data/dummyVendors.ts
// Simulated vendor data for buyer flow demo

import { VendorQuote } from '../types';

export const EQUIPMENT_AMC_VENDORS: VendorQuote[] = [
  {
    id: 'vendor-1',
    vendorName: 'TechCare Services',
    vendorLogo: 'TC',
    rating: 4.8,
    price: 48000,
    responseTime: '2 hours',
    features: [
      '24/7 emergency support',
      'OEM-certified technicians',
      'Genuine spare parts only',
      '99.5% uptime SLA',
      'Dedicated account manager',
    ],
    highlight: 'Best Value',
  },
  {
    id: 'vendor-2',
    vendorName: 'RapidFix Industrial',
    vendorLogo: 'RF',
    rating: 4.6,
    price: 42000,
    responseTime: '4 hours',
    features: [
      'Business hours support',
      'Trained technicians',
      'Quality spare parts',
      '98% uptime SLA',
      'Monthly reports',
    ],
    highlight: 'Budget Friendly',
  },
  {
    id: 'vendor-3',
    vendorName: 'ProMaint Solutions',
    vendorLogo: 'PM',
    rating: 4.9,
    price: 62000,
    responseTime: '1 hour',
    features: [
      '24/7 priority support',
      'OEM-certified + specialized training',
      'Genuine + premium spare parts',
      '99.9% uptime SLA',
      'Dedicated team of 3',
      'Predictive maintenance included',
    ],
    highlight: 'Premium',
  },
];

export const VENDOR_COLORS: Record<string, { bg: string; text: string }> = {
  'vendor-1': { bg: '#4F46E5', text: '#FFFFFF' },
  'vendor-2': { bg: '#059669', text: '#FFFFFF' },
  'vendor-3': { bg: '#7C3AED', text: '#FFFFFF' },
};

// RFP template for Equipment AMC
export const EQUIPMENT_AMC_RFP_TEMPLATE = {
  serviceType: 'Equipment Annual Maintenance Contract',
  equipmentTypes: [
    'Industrial AC Units',
    'Compressors',
    'Generators',
    'HVAC Systems',
    'Chillers',
    'UPS Systems',
  ],
  budgetRanges: [
    '₹25,000 - ₹50,000 / year',
    '₹50,000 - ₹1,00,000 / year',
    '₹1,00,000 - ₹2,50,000 / year',
    '₹2,50,000+ / year',
  ],
  timelineOptions: [
    'Immediate (within 1 week)',
    'Within 2 weeks',
    'Within 1 month',
    'Next quarter',
  ],
  commonRequirements: [
    'Quarterly preventive maintenance',
    '24/7 emergency support',
    'Genuine spare parts',
    'Certified technicians',
    'Monthly health reports',
    'Uptime SLA guarantee',
  ],
};
