// src/components/contracts/ContractWizard/logic/stepConfig.ts
// Step registries + step-related constants — extracted VERBATIM from index.tsx
// (Phase 1.5 logic extraction). No behavior change.

// Step ID type for step-based routing
export type StepId = 'path' | 'nomenclature' | 'counterparty' | 'acceptance' | 'details' | 'billingCycle' | 'blocks' | 'billingView' | 'assetSelection' | 'evidencePolicy' | 'events' | 'review';

export interface StepConfig {
  id: StepId;
  label: string;
  heading: { title: string; subtitle: string };
}

// Contract flow: 8 steps (full flow) — acceptance before counterparty
export const CONTRACT_STEPS: StepConfig[] = [
  { id: 'path', label: 'Choose Path', heading: { title: 'How would you like to create your contract?', subtitle: 'Choose your starting point' } },
  { id: 'nomenclature', label: 'Contract Type', heading: { title: 'What type of contract is this?', subtitle: 'Select the nomenclature that best describes this contract' } },
  { id: 'acceptance', label: 'Acceptance', heading: { title: 'How should this contract be accepted?', subtitle: 'Choose how your buyer will confirm acceptance' } },
  { id: 'counterparty', label: 'Counterparty', heading: { title: '', subtitle: '' } }, // Dynamic based on contractType
  { id: 'details', label: 'Details', heading: { title: 'Contract Details', subtitle: 'Define the basic information for your contract' } },
  { id: 'assetSelection', label: 'Assets', heading: { title: 'Select Client Assets', subtitle: 'Choose which of your client\'s assets this contract covers' } },
  { id: 'billingCycle', label: 'Billing Cycle', heading: { title: 'Billing Cycle', subtitle: 'How should services be billed?' } },
  { id: 'blocks', label: 'Add Blocks', heading: { title: 'Add Service Blocks', subtitle: 'Select services and configure them for your contract' } },
  { id: 'billingView', label: 'Billing View', heading: { title: 'Billing View', subtitle: 'Review line items, pricing and apply tax' } },
  { id: 'evidencePolicy', label: 'Evidence Policy', heading: { title: 'Evidence Policy', subtitle: 'Choose how evidence is captured during service execution' } },
  { id: 'events', label: 'Events Preview', heading: { title: 'Events Preview', subtitle: 'Review service delivery and billing schedule' } },
  { id: 'review', label: 'Review & Send', heading: { title: 'Review & Send', subtitle: 'Review your contract before sending' } },
];

// Template flow: a contract minus the counterparty — no path, no buyer,
// no buyer assets, no events (no real dates yet). Same step components.
export const TEMPLATE_STEPS: StepConfig[] = [
  { id: 'nomenclature', label: 'Contract Type', heading: { title: 'What type of contract is this template for?', subtitle: 'Select the nomenclature that best describes it' } },
  { id: 'acceptance', label: 'Acceptance', heading: { title: 'Default acceptance method', subtitle: 'Contracts created from this template will start with this — changeable per contract' } },
  { id: 'details', label: 'Details', heading: { title: 'Template Details', subtitle: 'Name this template and set the default duration' } },
  { id: 'billingCycle', label: 'Billing Cycle', heading: { title: 'Billing Cycle', subtitle: 'How should services be billed by default?' } },
  { id: 'blocks', label: 'Add Blocks', heading: { title: 'Add Service Blocks', subtitle: 'Select services and configure them for this template' } },
  { id: 'billingView', label: 'Billing View', heading: { title: 'Billing View', subtitle: 'Review line items, pricing and default tax' } },
  { id: 'evidencePolicy', label: 'Evidence Policy', heading: { title: 'Evidence Policy', subtitle: 'Default evidence capture for contracts from this template' } },
  { id: 'events', label: 'Events Preview', heading: { title: 'Events Preview (illustrative)', subtitle: 'Assumes a start today — real dates are set when a contract is created from this template' } },
  { id: 'review', label: 'Review & Save', heading: { title: 'Review & Save Template', subtitle: 'Review the template before saving — publish it from the Templates page' } },
];

// RFQ flow: 5 steps (no acceptance, no billing cycle, no billing view)
export const RFQ_STEPS: StepConfig[] = [
  { id: 'path', label: 'Choose Path', heading: { title: 'What would you like to create?', subtitle: 'Choose your starting point' } },
  { id: 'nomenclature', label: 'Request Type', heading: { title: 'What type of request is this?', subtitle: 'Select the nomenclature that best describes this RFQ' } },
  { id: 'counterparty', label: 'Select Vendors', heading: { title: 'Select Vendors for RFQ', subtitle: 'Choose one or more vendors to send this RFQ to' } },
  { id: 'details', label: 'Request Details', heading: { title: 'Request Details', subtitle: 'Define the basic information for your RFQ' } },
  { id: 'blocks', label: 'Define Services', heading: { title: 'Define Required Services', subtitle: 'Add the service blocks you need quotations for' } },
  { id: 'review', label: 'Review & Send', heading: { title: 'Review & Send RFQ', subtitle: 'Review your RFQ before sending to vendors' } },
];

// Dynamic headings for counterparty step based on contract type
export const COUNTERPARTY_HEADINGS: Record<string, { title: string; subtitle: string }> = {
  client: { title: 'Select your Client', subtitle: 'Choose which client this contract is for' },
  vendor: { title: 'Select your Vendor', subtitle: 'Choose which vendor this contract is with' },
  partner: { title: 'Select your Partner', subtitle: 'Choose which partner this contract is with' },
};

// Counterparty labels for success screen
export const COUNTERPARTY_LABEL: Record<string, string> = {
  client: 'client',
  vendor: 'vendor',
  partner: 'partner',
};

// Minimum step index to trigger auto-save (Details step = index 4 in CONTRACT_STEPS)
export const DRAFT_SAVE_MIN_STEP_ID = 'details';

// ── WizardShell additions (Phase 2) ─────────────────────────────────────────
// Phases group the granular steps into 4 chapters for the stepper.
// Grouping is contiguous over the ACTUAL step order of every flow.
export type WizardPhaseId = 'setup' | 'terms' | 'services' | 'finalize';

export const PHASE_LABELS: Record<WizardPhaseId, string> = {
  setup: 'Setup',
  terms: 'Terms',
  services: 'Services',
  finalize: 'Finalize',
};

export const STEP_PHASE: Record<StepId, WizardPhaseId> = {
  path: 'setup',
  nomenclature: 'setup',
  acceptance: 'setup',
  counterparty: 'setup',
  details: 'terms',
  assetSelection: 'terms',
  billingCycle: 'terms',
  blocks: 'services',
  billingView: 'services',
  evidencePolicy: 'finalize',
  events: 'finalize',
  review: 'finalize',
};

// Reason shown when Continue is pressed while the step is incomplete.
// The button is never silently disabled — this is the "why".
export function blockedHintFor(stepId: StepId, isRfqMode: boolean): string {
  switch (stepId) {
    case 'path': return 'Choose how you want to start';
    case 'counterparty':
      return isRfqMode ? 'Select at least one vendor to continue' : 'Select a counterparty to continue';
    case 'acceptance': return 'Choose how this contract will be accepted';
    case 'details': return 'Add a contract name and a duration greater than zero';
    case 'billingCycle': return 'Pick a billing cycle to continue';
    case 'blocks': return 'Add at least one service block';
    case 'assetSelection': return 'Select at least one coverage type';
    default: return 'Complete this step to continue';
  }
}

export const TEMPLATE_SELECTION_HINT = 'Pick a template to continue';
