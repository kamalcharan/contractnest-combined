// src/pages/service-contracts/templates/admin/global-designer/types.ts
// Types for the Global Template Designer Wizard (8 steps)

import type { AcceptanceMethod } from '@/components/contracts/ContractWizard/steps/AcceptanceMethodStep';
import type { BillingCycleType } from '@/components/contracts/ContractWizard/steps/BillingCycleStep';
import type { EvidencePolicyType, SelectedForm } from '@/components/contracts/ContractWizard/steps/EvidencePolicyStep';
import type { ContractDetailsData } from '@/components/contracts/ContractWizard/steps/ContractDetailsStep';

// ─── Wizard State ───────────────────────────────────────────────────

export interface GlobalDesignerWizardState {
  // Step 1: Nomenclature (reuses NomenclatureStep from contract wizard)
  nomenclatureId: string | null;          // Selected nomenclature ID
  nomenclatureDisplayName: string | null; // Display name (e.g., "AMC")
  nomenclatureGroup: string | null;       // Group key (equipment_maintenance, facility_property, etc.)

  // Step 2: Template Details (adapted from ContractDetailsStep — no Status)
  contractDetails: ContractDetailsData;

  // Step 3: Industries (admin: any, non-admin: my industry + industries I serve)
  targetIndustries: string[];             // Selected industry IDs from m_catalog_industries

  // Step 4: Equipment / Facility Names (from m_catalog_resource_templates, filtered by industries + nomenclature)
  selectedAssetTypeIds: string[];        // Resource template IDs selected
  selectedAssetTypeNames: string[];      // Resource template names for display

  // Step 5: Service Blocks — uses ServiceBlocksStep from contract wizard (catalog-driven)

  // Step 6: Billing & Payment Defaults
  defaultBillingCycleType: BillingCycleType;
  defaultPaymentMode: 'prepaid' | 'emi' | 'defined' | null;
  defaultPaymentTermsDays: number;     // Net 30, 60, etc.
  defaultTaxApproach: 'inclusive' | 'exclusive';

  // Step 7: Policies & Compliance
  defaultEvidencePolicy: EvidencePolicyType;
  defaultEvidenceForms: SelectedForm[];
  defaultAcceptanceMethod: AcceptanceMethod;
  complianceTags: string[];            // HIPAA, ISO 9001, etc.

  // Step 8: Publish
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
  isConditional?: boolean;
}

export const WIZARD_STEPS: WizardStep[] = [
  {
    id: 0,
    key: 'nomenclature',
    title: 'Contract Type',
    subtitle: 'Select nomenclature (AMC, CMC, SLA, etc.)',
    icon: 'FileText',
    isOptional: true,
  },
  {
    id: 1,
    key: 'details',
    title: 'Template Details',
    subtitle: 'Name, description, duration & timeline',
    icon: 'ClipboardList',
    isOptional: false,
  },
  {
    id: 2,
    key: 'industries',
    title: 'Industries',
    subtitle: 'Select target industries for this template',
    icon: 'Globe2',
    isOptional: false,
  },
  {
    id: 3,
    key: 'assets',
    title: 'Equipment / Facility',
    subtitle: 'Select covered equipment or facility names',
    icon: 'Wrench',
    isOptional: true,
    isConditional: true,
  },
  {
    id: 4,
    key: 'blocks',
    title: 'Service Blocks',
    subtitle: 'Add blocks from service catalog',
    icon: 'ShoppingCart',
    isOptional: false,
  },
  {
    id: 5,
    key: 'billing',
    title: 'Billing Defaults',
    subtitle: 'Payment & billing configuration',
    icon: 'CreditCard',
    isOptional: true,
  },
  {
    id: 6,
    key: 'policies',
    title: 'Policies & Compliance',
    subtitle: 'Evidence, acceptance & compliance',
    icon: 'Shield',
    isOptional: true,
  },
  {
    id: 7,
    key: 'review',
    title: 'Review & Publish',
    subtitle: 'Summary and publish settings',
    icon: 'Rocket',
    isOptional: false,
  },
];

// ─── Default State ──────────────────────────────────────────────────

export const INITIAL_WIZARD_STATE: GlobalDesignerWizardState = {
  // Step 1: Nomenclature
  nomenclatureId: null,
  nomenclatureDisplayName: null,
  nomenclatureGroup: null,

  // Step 2: Template Details
  contractDetails: {
    contractName: '',
    status: 'draft',
    currency: '',
    description: '',
    startDate: new Date(),
    durationValue: 12,
    durationUnit: 'months',
    gracePeriodValue: 0,
    gracePeriodUnit: 'days',
  },

  // Step 3: Industries
  targetIndustries: [],

  // Step 4: Asset Names
  selectedAssetTypeIds: [],
  selectedAssetTypeNames: [],

  // Step 6: Billing
  defaultBillingCycleType: null,
  defaultPaymentMode: null,
  defaultPaymentTermsDays: 30,
  defaultTaxApproach: 'exclusive',

  // Step 7: Policies
  defaultEvidencePolicy: 'none',
  defaultEvidenceForms: [],
  defaultAcceptanceMethod: null,
  complianceTags: [],

  // Step 8: Publish
  publishStatus: 'draft',
};

// ─── Nomenclature group constants (determines equipment vs facility) ─

export const ASSET_STEP_GROUPS = new Set(['equipment_maintenance', 'facility_property']);

// ─── Nomenclature → resource_type_id mapping for m_catalog_resource_templates ─

export const NOMENCLATURE_RESOURCE_TYPE_MAP: Record<string, string> = {
  equipment_maintenance: 'equipment',
  facility_property: 'asset',        // DB uses 'asset' for facilities
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
