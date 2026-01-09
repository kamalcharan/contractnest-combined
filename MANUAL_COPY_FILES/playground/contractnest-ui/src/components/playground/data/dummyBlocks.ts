// src/components/playground/data/dummyBlocks.ts
// Pre-built blocks for Equipment AMC industry demo

import { PlaygroundBlock } from '../types';

export const EQUIPMENT_AMC_BLOCKS: PlaygroundBlock[] = [
  // SERVICE BLOCKS
  {
    id: 'svc-preventive',
    categoryId: 'service',
    name: 'Quarterly Preventive Maintenance',
    icon: 'Wrench',
    description: 'Comprehensive quarterly inspection, cleaning, and preventive maintenance for all covered equipment.',
    price: 4500,
    currency: 'INR',
    duration: 4,
    durationUnit: 'hours',
    tags: ['preventive', 'quarterly', 'inspection'],
    meta: {
      deliveryMode: 'on-site',
      requiresScheduling: true,
    },
  },
  {
    id: 'svc-emergency',
    categoryId: 'service',
    name: 'Emergency Breakdown Support',
    icon: 'AlertTriangle',
    description: '24/7 emergency response with 4-hour SLA for critical breakdowns.',
    price: 2500,
    currency: 'INR',
    duration: 2,
    durationUnit: 'hours',
    tags: ['emergency', '24/7', 'SLA'],
    meta: {
      deliveryMode: 'on-site',
      slaHours: 4,
    },
  },
  {
    id: 'svc-calibration',
    categoryId: 'service',
    name: 'Annual Calibration Service',
    icon: 'Gauge',
    description: 'Precision calibration and certification for equipment accuracy compliance.',
    price: 8000,
    currency: 'INR',
    duration: 6,
    durationUnit: 'hours',
    tags: ['calibration', 'certification', 'annual'],
    meta: {
      deliveryMode: 'on-site',
      certificateProvided: true,
    },
  },

  // SPARE PART BLOCKS
  {
    id: 'spare-compressor',
    categoryId: 'spare',
    name: 'Compressor Unit',
    icon: 'Cog',
    description: 'OEM-grade compressor replacement unit with 1-year warranty.',
    price: 15000,
    currency: 'INR',
    tags: ['compressor', 'OEM', 'warranty'],
    meta: {
      sku: 'COMP-001',
      warranty: '1 year',
      stock: 5,
    },
  },
  {
    id: 'spare-filter',
    categoryId: 'spare',
    name: 'Filter Kit (Set of 4)',
    icon: 'Filter',
    description: 'High-efficiency filter kit including air, oil, and fuel filters.',
    price: 3500,
    currency: 'INR',
    tags: ['filter', 'kit', 'consumable'],
    meta: {
      sku: 'FILT-004',
      contents: ['Air filter', 'Oil filter', 'Fuel filter x2'],
      stock: 20,
    },
  },
  {
    id: 'spare-refrigerant',
    categoryId: 'spare',
    name: 'Refrigerant Gas (R410A)',
    icon: 'Thermometer',
    description: 'Eco-friendly refrigerant gas for AC and cooling systems.',
    price: 1200,
    currency: 'INR',
    tags: ['refrigerant', 'R410A', 'eco-friendly'],
    meta: {
      sku: 'REF-410A',
      unit: 'kg',
      stock: 50,
    },
  },

  // BILLING BLOCKS
  {
    id: 'bill-annual',
    categoryId: 'billing',
    name: 'Annual Payment Plan',
    icon: 'Calendar',
    description: 'Pay in 4 quarterly installments with 5% discount on upfront payment.',
    price: 0,
    currency: 'INR',
    tags: ['annual', 'installments', 'discount'],
    meta: {
      paymentType: 'installments',
      installments: 4,
      discountUpfront: 5,
    },
  },
  {
    id: 'bill-monthly',
    categoryId: 'billing',
    name: 'Monthly Subscription',
    icon: 'CreditCard',
    description: 'Fixed monthly fee with auto-debit for hassle-free payments.',
    price: 0,
    currency: 'INR',
    tags: ['monthly', 'subscription', 'auto-debit'],
    meta: {
      paymentType: 'subscription',
      frequency: 'monthly',
    },
  },

  // TEXT BLOCKS
  {
    id: 'text-terms',
    categoryId: 'text',
    name: 'Standard Terms & Conditions',
    icon: 'FileText',
    description: 'Standard AMC terms covering scope, exclusions, and liability.',
    tags: ['terms', 'legal', 'standard'],
    meta: {
      content: `
        1. Scope of Services: This AMC covers preventive maintenance and breakdown support for listed equipment.
        2. Exclusions: Physical damage, misuse, and third-party modifications are not covered.
        3. Response Time: Emergency calls will be attended within 4 hours during business hours.
        4. Payment Terms: Invoices are due within 15 days of issue.
        5. Termination: Either party may terminate with 30 days written notice.
      `,
    },
  },
  {
    id: 'text-sla',
    categoryId: 'text',
    name: 'SLA Agreement',
    icon: 'Shield',
    description: 'Service Level Agreement with uptime guarantees and penalties.',
    tags: ['SLA', 'uptime', 'guarantee'],
    meta: {
      content: `
        Service Level Agreement:
        - Uptime Guarantee: 99.5% equipment availability
        - Response Time: 4 hours for critical, 24 hours for non-critical
        - Resolution Time: 8 hours for critical, 48 hours for non-critical
        - Penalty: 2% credit for each percentage point below SLA
      `,
    },
  },
];

// Category metadata for styling
export const BLOCK_CATEGORY_STYLES = {
  service: {
    color: '#4F46E5',
    bgColor: '#EEF2FF',
    label: 'Services',
    icon: 'Briefcase',
  },
  spare: {
    color: '#059669',
    bgColor: '#ECFDF5',
    label: 'Spare Parts',
    icon: 'Package',
  },
  billing: {
    color: '#D97706',
    bgColor: '#FFFBEB',
    label: 'Billing',
    icon: 'CreditCard',
  },
  text: {
    color: '#6B7280',
    bgColor: '#F9FAFB',
    label: 'Terms & Docs',
    icon: 'FileText',
  },
};
