// src/utils/catalog-studio/blocks.ts
import { Block } from '../../types/catalogStudio';

export const DUMMY_BLOCKS: Block[] = [
  { id: 's1', categoryId: 'service', name: 'Yoga Session', icon: 'Heart', description: '60-min yoga with PCOD-specific asanas', price: 2000, currency: 'INR', duration: 60, durationUnit: 'min', tags: ['On-site'], evidenceTags: ['Photo', 'Sign'], usage: { templates: 3, contracts: 47 } },
  { id: 's2', categoryId: 'service', name: 'Gynec Consultation', icon: 'Stethoscope', description: '30-min specialist consultation', price: 1500, currency: 'INR', duration: 30, durationUnit: 'min', tags: ['Virtual'], evidenceTags: ['Report'], usage: { templates: 2, contracts: 31 } },
  { id: 's3', categoryId: 'service', name: 'AC Deep Service', icon: 'Snowflake', description: 'Complete cleaning and gas check', price: 1200, currency: 'INR', duration: 90, durationUnit: 'min', tags: [], evidenceTags: ['Before/After', 'GPS'], usage: { templates: 1, contracts: 89 } },
  { id: 's4', categoryId: 'service', name: 'Plumbing Repair', icon: 'Wrench', description: 'General plumbing maintenance', price: 800, currency: 'INR', duration: 45, durationUnit: 'min', tags: ['On-site'], evidenceTags: ['Photo'], usage: { templates: 2, contracts: 56 } },
  { id: 'sp1', categoryId: 'spare', name: 'AC Filter 1.5T', icon: 'Fan', description: 'Replacement filter for 1.5T units', price: 450, currency: 'INR', tags: [], meta: { sku: 'ACF-150', stock: 24 }, usage: { templates: 2, contracts: 0 } },
  { id: 'sp2', categoryId: 'spare', name: 'Refrigerant Gas R32', icon: 'Wind', description: 'Eco-friendly refrigerant', price: 800, currency: 'INR', tags: [], meta: { sku: 'GAS-R32', stock: 12 }, usage: { templates: 1, contracts: 0 } },
  { id: 'sp3', categoryId: 'spare', name: 'Compressor 1.5T', icon: 'Cog', description: 'Replacement compressor unit', price: 4500, currency: 'INR', tags: [], meta: { sku: 'COMP-150', stock: 5 }, usage: { templates: 1, contracts: 0 } },
  { id: 'b1', categoryId: 'billing', name: '3-Month EMI', icon: 'CreditCard', description: 'Split into 3 installments', tags: ['Auto-Invoice'], meta: { payments: 3, frequency: 'Monthly' }, usage: { templates: 4, contracts: 0 } },
  { id: 'b2', categoryId: 'billing', name: '100% Advance', icon: 'Banknote', description: 'Full payment upfront', tags: ['Instant'], meta: { upfront: '100%' }, usage: { templates: 6, contracts: 0 } },
  { id: 'b3', categoryId: 'billing', name: '50-50 Milestone', icon: 'Target', description: '50% advance, 50% on completion', tags: ['Milestone'], meta: { milestones: 2 }, usage: { templates: 3, contracts: 0 } },
  { id: 't1', categoryId: 'text', name: 'Standard T&C', icon: 'ScrollText', description: 'General terms and conditions', tags: ['Legal', 'Sign Required'], usage: { templates: 8, contracts: 0 } },
  { id: 't2', categoryId: 'text', name: 'Cancellation Policy', icon: 'Ban', description: '24-hour notice required', tags: ['Policy'], usage: { templates: 5, contracts: 0 } },
  { id: 't3', categoryId: 'text', name: 'Privacy Notice', icon: 'Lock', description: 'Data handling disclosure', tags: ['Compliance'], usage: { templates: 7, contracts: 0 } },
  { id: 'v1', categoryId: 'video', name: 'Welcome Video', icon: 'Film', description: 'Introduction to the program', tags: ['Required'], meta: { duration: '3:24' }, usage: { templates: 2, contracts: 0 } },
  { id: 'v2', categoryId: 'video', name: 'Service Demo', icon: 'Play', description: 'How the service works', tags: [], meta: { duration: '5:12' }, usage: { templates: 1, contracts: 0 } },
  { id: 'i1', categoryId: 'image', name: 'Service Brochure', icon: 'ImageIcon', description: 'Visual overview of services', tags: [], meta: { size: '1200x800' }, usage: { templates: 3, contracts: 0 } },
  { id: 'i2', categoryId: 'image', name: 'Team Photo', icon: 'Users', description: 'Our service team', tags: [], meta: { size: '800x600' }, usage: { templates: 2, contracts: 0 } },
  { id: 'c1', categoryId: 'checklist', name: 'Pre-Service Checklist', icon: 'CheckSquare', description: 'Items to verify before work', tags: ['Photo/item'], meta: { items: 8 }, usage: { templates: 2, contracts: 0 } },
  { id: 'c2', categoryId: 'checklist', name: 'Post-Service Checklist', icon: 'ClipboardCheck', description: 'Completion verification', tags: [], meta: { items: 5 }, usage: { templates: 3, contracts: 0 } },
  { id: 'd1', categoryId: 'document', name: 'Certificate Upload', icon: 'Paperclip', description: 'Completion certificate', tags: ['PDF, DOC'], usage: { templates: 1, contracts: 0 } },
  { id: 'd2', categoryId: 'document', name: 'ID Verification', icon: 'IdCard', description: 'Customer identification', tags: ['Required'], usage: { templates: 2, contracts: 0 } },
];

export const getBlocksByCategory = (categoryId: string): Block[] => {
  return DUMMY_BLOCKS.filter((block) => block.categoryId === categoryId);
};

export const getBlockById = (id: string): Block | undefined => {
  return DUMMY_BLOCKS.find((block) => block.id === id);
};

export const getAllBlocks = (): Block[] => {
  return DUMMY_BLOCKS;
};
