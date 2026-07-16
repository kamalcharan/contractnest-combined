// Parity fixtures — synthetic wizard states exercising every branch of the
// extracted logic (mapper, serialization, gating). All dates are FIXED so
// outputs are deterministic. Do not use new Date() here.
import type { ContractWizardState } from '../state';
import { createInitialWizardState } from '../state';

const FIXED_START = new Date('2026-08-01T00:00:00.000Z');

function base(overrides: Partial<ContractWizardState>): ContractWizardState {
  return { ...createInitialWizardState(), startDate: FIXED_START, ...overrides };
}

// F1 — plain client contract: 2 catalog blocks, one recurring service cycle,
// prepaid, tax applied. The bread-and-butter path.
export const F1_basicContract = base({
  path: 'scratch',
  buyerId: '11111111-1111-4111-8111-111111111111',
  buyerName: 'Sunrise Medical',
  nomenclatureId: '22222222-2222-4222-8222-222222222222',
  nomenclatureName: 'AMC',
  nomenclatureGroup: 'equipment_maintenance',
  acceptanceMethod: 'signoff',
  contractName: 'Sunrise AMC 2026',
  description: 'Annual maintenance for imaging equipment',
  durationValue: 12,
  durationUnit: 'months',
  billingCycleType: 'quarterly' as any,
  selectedBlocks: [
    {
      id: '33333333-3333-4333-8333-333333333333',
      name: 'MRI Preventive Maintenance',
      description: 'Quarterly PM visit',
      icon: 'wrench',
      quantity: 4,
      cycle: 'Quarterly',
      serviceCycleDays: 90,
      unlimited: false,
      price: 38000,
      currency: 'INR',
      totalPrice: 152000,
      categoryName: 'Service',
      categoryColor: '#000',
      categoryId: 'service',
    },
    {
      id: '44444444-4444-4444-8444-444444444444',
      name: 'Filter Kit',
      description: 'Replacement filters',
      icon: 'box',
      quantity: 2,
      cycle: 'One-time',
      unlimited: false,
      price: 6000,
      currency: 'INR',
      totalPrice: 12000,
      categoryName: 'Spare',
      categoryColor: '#000',
      categoryId: 'spare',
    },
  ] as any,
  totalValue: 164000,
  baseSubtotal: 164000,
  // Sprint 1: 10% contract-level discount, applied before tax.
  // taxable = 164000 − 16400 = 147600 → GST 18% = 26568 → to pay 174168
  discountType: 'percent',
  discountValue: 10,
  discountTotal: 16400,
  taxTotal: 26568,
  grandTotal: 174168,
  selectedTaxRateIds: ['55555555-5555-4555-8555-555555555555'],
  taxBreakdown: [{ tax_rate_id: '55555555-5555-4555-8555-555555555555', name: 'GST 18%', rate: 18, amount: 26568 }],
});

// F2 — EMI + per-block payment types + event date overrides + equipment/coverage
export const F2_emiWithOverrides = base({
  path: 'scratch',
  buyerId: '11111111-1111-4111-8111-111111111111',
  buyerName: 'Pinnacle Tower',
  nomenclatureGroup: 'facility_property',
  acceptanceMethod: 'payment',
  contractName: 'Pinnacle HVAC 2026',
  durationValue: 6,
  durationUnit: 'months',
  billingCycleType: 'monthly' as any,
  paymentMode: 'emi',
  emiMonths: 6,
  perBlockPaymentType: { '66666666-6666-4666-8666-666666666666': 'postpaid' },
  selectedBlocks: [
    {
      id: '66666666-6666-4666-8666-666666666666',
      name: 'AHU Monthly Service',
      description: 'Filters, belts, coils',
      icon: 'fan',
      quantity: 6,
      cycle: 'Monthly',
      serviceCycleDays: 30,
      unlimited: false,
      price: 4500,
      currency: 'INR',
      totalPrice: 27000,
      categoryName: 'Service',
      categoryColor: '#000',
      categoryId: 'service',
    },
  ] as any,
  totalValue: 27000,
  baseSubtotal: 27000,
  taxTotal: 0,
  grandTotal: 27000,
  equipmentDetails: [{ id: 'eq-1', name: 'AHU-01', location: 'Tower A' }] as any,
  allowBuyerToAdd: true,
  coverageTypes: [{ id: 'cov-1', name: 'Comprehensive' }] as any,
  // Push the 2nd service occurrence by 3 days (tests override + re-sort)
  eventOverrides: { 'svc-66666666-6666-4666-8666-666666666666-2': new Date('2026-09-04T00:00:00.000Z') },
});

// F3 — RFQ mode: vendors array, computed_events must be undefined
export const F3_rfq = base({
  path: 'scratch',
  wizardMode: 'rfq',
  vendorIds: ['77777777-7777-4777-8777-777777777777', '88888888-8888-4888-8888-888888888888'],
  vendorNames: ['CoolAir Services', 'ThermoFix'],
  contractName: 'HVAC RFQ Q3',
  durationValue: 3,
  durationUnit: 'months',
  selectedBlocks: [
    {
      id: '99999999-9999-4999-8999-999999999999',
      name: 'Chiller Overhaul',
      description: 'Full teardown',
      icon: 'snowflake',
      quantity: 1,
      cycle: 'One-time',
      unlimited: false,
      price: 0,
      currency: 'INR',
      totalPrice: 0,
      categoryName: 'Service',
      categoryColor: '#000',
      categoryId: 'service',
    },
  ] as any,
});

// F4 — fly-by (non-UUID) block + smart-form evidence policy
export const F4_flybySmartForm = base({
  path: 'scratch',
  buyerId: '11111111-1111-4111-8111-111111111111',
  buyerName: 'Ledger & Co',
  acceptanceMethod: 'auto',
  contractName: 'Custom Scope 2026',
  durationValue: 1,
  durationUnit: 'years',
  billingCycleType: 'annual' as any,
  selectedBlocks: [
    {
      id: 'flyby-note-1',
      name: 'Scope Note',
      description: 'Custom clause',
      icon: 'file',
      quantity: 1,
      cycle: 'One-time',
      unlimited: false,
      price: 0,
      currency: 'INR',
      totalPrice: 0,
      categoryName: 'Text',
      categoryColor: '#000',
      flyByType: 'text',
      isFlyBy: true,
    },
  ] as any,
  evidencePolicyType: 'smart_form' as any,
  evidenceSelectedForms: [
    { form_template_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', name: 'PM Checklist', version: 2, category: 'maintenance', sort_order: 1 },
  ] as any,
});

// F5 — template-sanitized state (round-trips serialization; buyer stripped)
export const F5_templateState = base({
  contractName: 'AMC Gold Template',
  acceptanceMethod: 'signoff',
  durationValue: 12,
  durationUnit: 'months',
  billingCycleType: 'quarterly' as any,
  selectedBlocks: F1_basicContract.selectedBlocks,
  totalValue: 164000,
  baseSubtotal: 164000,
  grandTotal: 164000,
});

export const FIXTURES: Record<string, ContractWizardState> = {
  F1_basicContract,
  F2_emiWithOverrides,
  F3_rfq,
  F4_flybySmartForm,
  F5_templateState,
};
