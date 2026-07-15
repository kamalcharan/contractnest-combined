// src/components/contracts/ContractWizard/logic/state.ts
// Wizard state shape + pure state helpers — extracted VERBATIM from index.tsx
// (Phase 1.5 logic extraction). No behavior change; guarded by logic/__parity__.
// The public import path stays '@/components/contracts/ContractWizard' via
// re-exports in index.tsx — do not import this file from outside the wizard.
import type { ContractPath, WizardMode } from '../steps/PathSelectionStep';
import type { BillingCycleType } from '../steps/BillingCycleStep';
import type { EvidencePolicyType, SelectedForm } from '../steps/EvidencePolicyStep';
import type { EquipmentDetailItem, CoverageTypeItem } from '../steps/AssetSelectionStep';
import type { ConfigurableBlock } from '@/components/catalog-studio';

// Keep ContractRole type export for backwards compatibility
export type ContractRole = 'client' | 'vendor' | null;

// Re-export ConfigurableBlock as SelectedBlock for backwards compatibility
export type SelectedBlock = ConfigurableBlock;

// Contract type definition
export type ContractType = 'client' | 'vendor' | 'partner';

// Wizard State Types
export interface ContractWizardState {
  path: ContractPath;
  templateId: string | null;
  // Role (kept for API compatibility, auto-set based on contractType)
  role: ContractRole;
  // Wizard mode: contract or rfq (vendor contracts only)
  wizardMode: WizardMode;
  // Step 1: Counterparty (single-select for contracts)
  buyerId: string | null;
  buyerName: string;
  buyerContactPersonId: string | null;
  buyerContactPersonName: string | null;
  useCompanyContact: boolean;
  // RFQ multi-vendor selection
  vendorIds: string[];
  vendorNames: string[];
  // Nomenclature (optional contract type classification)
  nomenclatureId: string | null;
  nomenclatureName: string | null;
  nomenclatureGroup: string | null;
  // Acceptance
  acceptanceMethod: 'payment' | 'signoff' | 'auto' | null;
  // Contract Details
  contractName: string;
  status: string;
  currency: string;
  description: string;
  startDate: Date;
  durationValue: number;
  durationUnit: string;
  gracePeriodValue: number;
  gracePeriodUnit: string;
  // Step 4: Billing Cycle
  billingCycleType: BillingCycleType;
  // Step 5: Blocks & Total
  selectedBlocks: SelectedBlock[];
  totalValue: number;
  // Step 6: Billing View - Tax & Payment
  selectedTaxRateIds: string[];
  baseSubtotal: number;
  taxTotal: number;
  grandTotal: number;
  taxBreakdown: Array<{ tax_rate_id: string; name: string; rate: number; amount: number }>;
  paymentMode: 'prepaid' | 'emi' | 'defined';
  emiMonths: number;
  perBlockPaymentType: Record<string, 'prepaid' | 'postpaid'>;
  // Asset Selection
  equipmentDetails: EquipmentDetailItem[];
  allowBuyerToAdd: boolean;
  coverageTypes: CoverageTypeItem[];
  // Evidence Policy
  evidencePolicyType: EvidencePolicyType;
  evidenceSelectedForms: SelectedForm[];
  // Events Preview: user-adjusted dates
  eventOverrides: Record<string, Date>;
}

// Initial wizard state factory (needs fresh Date each time)
export const createInitialWizardState = (): ContractWizardState => ({
  path: null,
  templateId: null,
  role: null,
  wizardMode: 'contract',
  // Counterparty
  buyerId: null,
  buyerName: '',
  buyerContactPersonId: null,
  buyerContactPersonName: null,
  useCompanyContact: false,
  vendorIds: [],
  vendorNames: [],
  // Nomenclature
  nomenclatureId: null,
  nomenclatureName: null,
  nomenclatureGroup: null,
  // Acceptance
  acceptanceMethod: null,
  // Contract Details
  contractName: '',
  status: 'draft',
  currency: 'INR',
  description: '',
  startDate: new Date(),
  durationValue: 1,
  durationUnit: 'months',
  gracePeriodValue: 0,
  gracePeriodUnit: 'days',
  // Billing Cycle
  billingCycleType: null,
  // Blocks & Total
  selectedBlocks: [],
  totalValue: 0,
  // Billing View - Tax & Payment
  selectedTaxRateIds: [],
  baseSubtotal: 0,
  taxTotal: 0,
  grandTotal: 0,
  taxBreakdown: [],
  paymentMode: 'prepaid',
  emiMonths: 6,
  perBlockPaymentType: {},
  // Asset Selection
  equipmentDetails: [],
  allowBuyerToAdd: false,
  coverageTypes: [],
  // Evidence Policy
  evidencePolicyType: 'none',
  evidenceSelectedForms: [],
  // Events Preview
  eventOverrides: {},
});

// Serialize wizard state for storage in metadata (Dates → ISO strings)
export function serializeWizardState(state: ContractWizardState): Record<string, any> {
  return {
    ...state,
    startDate: state.startDate instanceof Date ? state.startDate.toISOString() : state.startDate,
    eventOverrides: Object.fromEntries(
      Object.entries(state.eventOverrides).map(([k, v]) => [k, v instanceof Date ? v.toISOString() : v])
    ),
  };
}

// Deserialize wizard state from metadata (ISO strings → Dates)
export function deserializeWizardState(raw: Record<string, any>): ContractWizardState {
  return {
    ...createInitialWizardState(),
    ...raw,
    startDate: raw.startDate ? new Date(raw.startDate) : new Date(),
    eventOverrides: raw.eventOverrides
      ? Object.fromEntries(
          Object.entries(raw.eventOverrides).map(([k, v]) => [k, new Date(v as string)])
        )
      : {},
  };
}

// Strip contract-instance data (buyer, assets, event overrides) before a
// wizard state is persisted inside a template — templates are counterparty-free
export function sanitizeStateForTemplate(state: ContractWizardState): ContractWizardState {
  return {
    ...state,
    path: null,
    templateId: null,
    buyerId: null,
    buyerName: '',
    buyerContactPersonId: null,
    buyerContactPersonName: null,
    useCompanyContact: false,
    vendorIds: [],
    vendorNames: [],
    status: 'draft',
    equipmentDetails: [],
    coverageTypes: [],
    allowBuyerToAdd: false,
    eventOverrides: {},
  };
}
