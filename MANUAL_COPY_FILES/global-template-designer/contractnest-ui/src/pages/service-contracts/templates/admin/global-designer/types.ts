// src/pages/service-contracts/templates/admin/global-designer/types.ts
// Types for the Global Template Designer Wizard

import type { AcceptanceMethod } from '@/components/contracts/ContractWizard/steps/AcceptanceMethodStep';
import type { BillingCycleType } from '@/components/contracts/ContractWizard/steps/BillingCycleStep';
import type { EvidencePolicyType, SelectedForm } from '@/components/contracts/ContractWizard/steps/EvidencePolicyStep';

// ─── Wizard State ───────────────────────────────────────────────────

export interface GlobalDesignerWizardState {
  // Step 1: Template Identity
  templateName: string;
  templateDescription: string;
  targetIndustries: string[];          // Multi-select — admin targets multiple industries
  nomenclatureIds: string[];           // Compatible nomenclature types (AMC, CMC, SLA, etc.)
  nomenclatureNames: string[];         // Display names for selected nomenclatures
  contractType: 'service' | 'partnership';
  complexity: 'simple' | 'medium' | 'complex';
  tags: string[];
  estimatedDuration: string;           // e.g., "12 months"

  // Step 2: Equipment & Coverage Defaults
  isEquipmentBased: boolean;
  isEntityBased: boolean;
  defaultCoverageTypes: string[];      // Resource type IDs
  defaultCoverageNames: string[];      // Resource type display names
  allowBuyerEquipment: boolean;        // Default: allow buyer to add equipment

  // Step 3: Block Assembly — managed by useTemplateBuilder hook (external)

  // Step 4: Billing & Payment Defaults
  defaultBillingCycleType: BillingCycleType;
  defaultPaymentMode: 'prepaid' | 'emi' | 'defined' | null;
  defaultPaymentTermsDays: number;     // Net 30, 60, etc.
  defaultTaxApproach: 'inclusive' | 'exclusive';

  // Step 5: Policies & Compliance
  defaultEvidencePolicy: EvidencePolicyType;
  defaultEvidenceForms: SelectedForm[];
  defaultAcceptanceMethod: AcceptanceMethod;
  complianceTags: string[];            // HIPAA, ISO 9001, etc.

  // Step 6: Publish
  publishStatus: 'draft' | 'active' | 'featured';
}

// ─── Step Configuration ─────────────────────────────────────────────

export interface WizardStep {
  id: number;
  key: string;
  title: string;
  subtitle: string;
  icon: string;                        // Lucide icon name
  isOptional: boolean;
  isConditional?: boolean;             // e.g., Equipment step only if equipment-based
}

export const WIZARD_STEPS: WizardStep[] = [
  {
    id: 0,
    key: 'identity',
    title: 'Template Identity',
    subtitle: 'Name, industries & contract type',
    icon: 'FileText',
    isOptional: false,
  },
  {
    id: 1,
    key: 'equipment',
    title: 'Equipment & Coverage',
    subtitle: 'Default equipment & coverage settings',
    icon: 'Wrench',
    isOptional: true,
  },
  {
    id: 2,
    key: 'blocks',
    title: 'Block Assembly',
    subtitle: 'Drag & drop template blocks',
    icon: 'LayoutGrid',
    isOptional: false,
  },
  {
    id: 3,
    key: 'billing',
    title: 'Billing Defaults',
    subtitle: 'Payment & billing configuration',
    icon: 'CreditCard',
    isOptional: true,
  },
  {
    id: 4,
    key: 'policies',
    title: 'Policies & Compliance',
    subtitle: 'Evidence, acceptance & compliance',
    icon: 'Shield',
    isOptional: true,
  },
  {
    id: 5,
    key: 'review',
    title: 'Review & Publish',
    subtitle: 'Summary and publish settings',
    icon: 'Rocket',
    isOptional: false,
  },
];

// ─── Default State ──────────────────────────────────────────────────

export const INITIAL_WIZARD_STATE: GlobalDesignerWizardState = {
  // Step 1
  templateName: '',
  templateDescription: '',
  targetIndustries: [],
  nomenclatureIds: [],
  nomenclatureNames: [],
  contractType: 'service',
  complexity: 'medium',
  tags: [],
  estimatedDuration: '12 months',

  // Step 2
  isEquipmentBased: false,
  isEntityBased: false,
  defaultCoverageTypes: [],
  defaultCoverageNames: [],
  allowBuyerEquipment: true,

  // Step 4
  defaultBillingCycleType: null,
  defaultPaymentMode: null,
  defaultPaymentTermsDays: 30,
  defaultTaxApproach: 'exclusive',

  // Step 5
  defaultEvidencePolicy: 'none',
  defaultEvidenceForms: [],
  defaultAcceptanceMethod: null,
  complianceTags: [],

  // Step 6
  publishStatus: 'draft',
};

// ─── Common Compliance Tags ─────────────────────────────────────────

export const COMPLIANCE_TAG_OPTIONS = [
  { id: 'hipaa', label: 'HIPAA', industry: 'healthcare' },
  { id: 'fda', label: 'FDA', industry: 'healthcare' },
  { id: 'hitech', label: 'HITECH', industry: 'healthcare' },
  { id: 'iso_9001', label: 'ISO 9001', industry: 'manufacturing' },
  { id: 'osha', label: 'OSHA', industry: 'manufacturing' },
  { id: 'epa', label: 'EPA', industry: 'manufacturing' },
  { id: 'sox', label: 'SOX', industry: 'financial_services' },
  { id: 'pci_dss', label: 'PCI DSS', industry: 'financial_services' },
  { id: 'gdpr', label: 'GDPR', industry: 'technology' },
  { id: 'soc_2', label: 'SOC 2', industry: 'technology' },
  { id: 'iso_27001', label: 'ISO 27001', industry: 'technology' },
  { id: 'dot', label: 'DOT', industry: 'transportation' },
  { id: 'hazmat', label: 'HAZMAT', industry: 'transportation' },
  { id: 'ferpa', label: 'FERPA', industry: 'education' },
  { id: 'itar', label: 'ITAR', industry: 'aerospace' },
];

// ─── Payment Term Options ───────────────────────────────────────────

export const PAYMENT_TERMS_OPTIONS = [
  { value: 0, label: 'Due Immediately' },
  { value: 7, label: 'Net 7' },
  { value: 15, label: 'Net 15' },
  { value: 30, label: 'Net 30' },
  { value: 45, label: 'Net 45' },
  { value: 60, label: 'Net 60' },
  { value: 90, label: 'Net 90' },
];
