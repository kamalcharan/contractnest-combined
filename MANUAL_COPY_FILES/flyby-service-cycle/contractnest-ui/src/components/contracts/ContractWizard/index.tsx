// src/components/contracts/ContractWizard/index.tsx
// Contract Wizard - Main component with Floating Action Island
import React, { useState, useCallback } from 'react';
import { X, CheckCircle2, ArrowRight, Loader2, Copy, Check, Key, Mail, CreditCard, PenTool, Zap, Receipt, Building2, WifiOff, Globe, Monitor } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { useContractOperations } from '@/hooks/queries/useContractQueries';
import { useGatewayStatus } from '@/hooks/useGatewayStatus';
import type { CreateContractRequest, RecordPaymentResponse, PaymentMethod } from '@/types/contracts';
import api from '@/services/api';
import { API_ENDPOINTS } from '@/services/serviceURLs';
import FloatingActionIsland from './FloatingActionIsland';
import PathSelectionStep, { ContractPath, WizardMode } from './steps/PathSelectionStep';
import TemplateSelectionStep from './steps/TemplateSelectionStep';
import NomenclatureStep from './steps/NomenclatureStep';
import BuyerSelectionStep from './steps/BuyerSelectionStep';
import AcceptanceMethodStep, { AcceptanceMethod } from './steps/AcceptanceMethodStep';
import ContractDetailsStep, { ContractDetailsData } from './steps/ContractDetailsStep';
import ServiceBlocksStep from './steps/ServiceBlocksStep';
import BillingCycleStep, { BillingCycleType } from './steps/BillingCycleStep';
import BillingViewStep from './steps/BillingViewStep';
import ReviewSendStep from './steps/ReviewSendStep';
import EventsPreviewStep from './steps/EventsPreviewStep';
import EvidencePolicyStep, { type EvidencePolicyType, type SelectedForm } from './steps/EvidencePolicyStep';
import AssetSelectionStep, { type EquipmentDetailItem, type CoverageTypeItem } from './steps/AssetSelectionStep';
import { ConfigurableBlock } from '@/components/catalog-studio';
import { useVaNiToast } from '@/components/common/toast/VaNiToast';
import { categoryHasPricing } from '@/utils/catalog-studio/categories';
import { computeContractEvents, type ContractEvent } from '@/utils/service-contracts/contractEvents';

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

interface ContractWizardProps {
  isOpen: boolean;
  onClose: () => void;
  contractType?: ContractType;
  onComplete?: (contractData: ContractWizardState) => void;
}

// Step ID type for step-based routing
type StepId = 'path' | 'nomenclature' | 'counterparty' | 'acceptance' | 'details' | 'billingCycle' | 'blocks' | 'billingView' | 'assetSelection' | 'evidencePolicy' | 'events' | 'review';

interface StepConfig {
  id: StepId;
  label: string;
  heading: { title: string; subtitle: string };
}

// Contract flow: 8 steps (full flow) — acceptance before counterparty
const CONTRACT_STEPS: StepConfig[] = [
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

// RFQ flow: 5 steps (no acceptance, no billing cycle, no billing view)
const RFQ_STEPS: StepConfig[] = [
  { id: 'path', label: 'Choose Path', heading: { title: 'What would you like to create?', subtitle: 'Choose your starting point' } },
  { id: 'nomenclature', label: 'Request Type', heading: { title: 'What type of request is this?', subtitle: 'Select the nomenclature that best describes this RFQ' } },
  { id: 'counterparty', label: 'Select Vendors', heading: { title: 'Select Vendors for RFQ', subtitle: 'Choose one or more vendors to send this RFQ to' } },
  { id: 'details', label: 'Request Details', heading: { title: 'Request Details', subtitle: 'Define the basic information for your RFQ' } },
  { id: 'blocks', label: 'Define Services', heading: { title: 'Define Required Services', subtitle: 'Add the service blocks you need quotations for' } },
  { id: 'review', label: 'Review & Send', heading: { title: 'Review & Send RFQ', subtitle: 'Review your RFQ before sending to vendors' } },
];

// Dynamic headings for counterparty step based on contract type
const COUNTERPARTY_HEADINGS: Record<string, { title: string; subtitle: string }> = {
  client: { title: 'Select your Client', subtitle: 'Choose which client this contract is for' },
  vendor: { title: 'Select your Vendor', subtitle: 'Choose which vendor this contract is with' },
  partner: { title: 'Select your Partner', subtitle: 'Choose which partner this contract is with' },
};

// Counterparty labels for success screen
const COUNTERPARTY_LABEL: Record<string, string> = {
  client: 'client',
  vendor: 'vendor',
  partner: 'partner',
};

// Map wizard acceptance_method to API-accepted values
// API accepts: 'manual' | 'auto' | 'digital_signature'
const ACCEPTANCE_METHOD_API_MAP: Record<string, string> = {
  payment: 'manual',
  signoff: 'digital_signature',
  auto: 'auto',
};

// Payment method options for pre-payment dialog
const PAYMENT_METHOD_OPTIONS: { value: PaymentMethod; label: string }[] = [
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'upi', label: 'UPI' },
  { value: 'cash', label: 'Cash' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'card', label: 'Card' },
  { value: 'other', label: 'Other' },
];

// UUID check for fly-by block detection
const isValidUUID = (id: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

// Compute and format events for API (matches t_contracts.computed_events JSONB schema)
function computeEventsForApi(state: ContractWizardState): any[] | undefined {
  // Skip for RFQ mode
  if (state.wizardMode === 'rfq') return undefined;

  // Compute events using the same logic as EventsPreviewStep
  const rawEvents = computeContractEvents({
    startDate: state.startDate,
    durationValue: state.durationValue,
    durationUnit: state.durationUnit,
    selectedBlocks: state.selectedBlocks,
    paymentMode: state.paymentMode,
    emiMonths: state.emiMonths,
    perBlockPaymentType: state.perBlockPaymentType,
    billingCycleType: state.billingCycleType,
    grandTotal: state.grandTotal || state.totalValue,
    currency: state.currency,
  });

  if (!rawEvents || rawEvents.length === 0) return undefined;

  // Apply eventOverrides and convert to API format
  return rawEvents.map((event: ContractEvent) => {
    // Apply user override if exists
    const overriddenDate = state.eventOverrides[event.id];
    const scheduledDate = overriddenDate || event.scheduled_date;

    return {
      block_id: event.block_id,
      block_name: event.block_name,
      category_id: event.category_id || undefined,
      event_type: event.event_type,
      billing_sub_type: event.billing_sub_type || undefined,
      billing_cycle_label: event.billing_cycle_label || undefined,
      sequence_number: event.sequence_number,
      total_occurrences: event.total_occurrences,
      scheduled_date: scheduledDate instanceof Date
        ? scheduledDate.toISOString()
        : new Date(scheduledDate).toISOString(),
      amount: event.amount || undefined,
      currency: event.currency || state.currency,
      assigned_to: event.assigned_to || undefined,
      assigned_to_name: event.assigned_to_name || undefined,
    };
  });
}

// Map wizard state to API request payload (matches deployed DB RPC schema)
function mapWizardToRequest(
  state: ContractWizardState,
  contractType: ContractType
): Record<string, any> {
  // Map acceptance method to API-compatible value
  const apiAcceptanceMethod = state.acceptanceMethod
    ? ACCEPTANCE_METHOD_API_MAP[state.acceptanceMethod] || state.acceptanceMethod
    : undefined;

  // Compute events for contract (not RFQ)
  const computedEvents = computeEventsForApi(state);

  // Build blocks array — flattened to match t_contract_blocks columns
  const blocks = state.selectedBlocks.map((block, idx) => {
    const isFlyBy = !isValidUUID(block.id);
    return {
      position: idx,
      source_type: isFlyBy ? 'flyby' : 'catalog',
      source_block_id: isFlyBy ? undefined : block.id,
      block_name: block.name,
      block_description: block.description || '',
      category_id: block.categoryId || undefined,
      category_name: block.categoryName,
      unit_price: block.price,
      quantity: block.quantity,
      billing_cycle: block.cycle,
      custom_cycle_days: block.customCycleDays || undefined,
      service_cycle_days: block.serviceCycleDays || undefined,
      total_price: block.totalPrice,
      flyby_type: isFlyBy ? (block.flyByType || 'text') : undefined,
      custom_fields: {
        currency: block.currency,
        unlimited: block.unlimited,
        config: block.config || {},
        originalId: isFlyBy ? block.id : undefined,
      },
    };
  });

  // Build vendors array (RFQ only) — matches t_contract_vendors columns
  const vendors = state.wizardMode === 'rfq'
    ? state.vendorIds.map((id, idx) => ({
        vendor_id: id,
        contact_id: id,
        contact_classification: 'vendor',
        vendor_name: state.vendorNames[idx] || '',
      }))
    : [];

  return {
    // Core fields
    record_type: state.wizardMode === 'rfq' ? 'rfq' : 'contract',
    // Note: contract_type omitted — API validates against pricing types
    // (fixed_price, etc.) which the wizard doesn't set. The relationship
    // type (client/vendor/partner) is carried by contact_classification.
    name: state.contractName,
    title: state.contractName,
    description: state.description || undefined,
    acceptance_method: apiAcceptanceMethod,
    path: state.path,
    template_id: state.templateId || undefined,

    // Nomenclature (optional contract type classification)
    nomenclature_id: state.nomenclatureId || undefined,

    // Buyer / counterparty (contact_id + classification)
    buyer_id: state.buyerId || undefined,
    contact_id: state.buyerId || undefined,
    contact_classification: contractType,
    buyer_name: state.buyerName || undefined,

    // Duration & timeline
    duration_value: state.durationValue,
    duration_unit: state.durationUnit,
    grace_period_value: state.gracePeriodValue,
    grace_period_unit: state.gracePeriodUnit,

    // Billing
    currency: state.currency,
    billing_cycle_type: state.billingCycleType || undefined,
    payment_mode: state.paymentMode,
    emi_months: state.paymentMode === 'emi' ? state.emiMonths : undefined,
    per_block_payment_type: JSON.stringify(state.perBlockPaymentType),
    total_value: state.baseSubtotal || state.totalValue,
    tax_total: state.taxTotal,
    grand_total: state.grandTotal,
    selected_tax_rate_ids: state.selectedTaxRateIds,
    tax_breakdown: state.taxBreakdown,

    // Related entities
    blocks,
    vendors,

    // Evidence policy
    evidence_policy_type: state.evidencePolicyType,
    evidence_selected_forms: state.evidencePolicyType === 'smart_form'
      ? state.evidenceSelectedForms.map((f) => ({
          form_template_id: f.form_template_id,
          name: f.name,
          version: f.version,
          category: f.category,
          sort_order: f.sort_order,
        }))
      : [],

    // Computed events (for PGMQ trigger when contract becomes active)
    computed_events: computedEvents,

    // Equipment / Entity details (JSONB — matches t_contracts.equipment_details)
    equipment_details: state.equipmentDetails.length > 0 ? state.equipmentDetails : undefined,
    allow_buyer_to_add_equipment: state.allowBuyerToAdd || undefined,
    coverage_types: state.coverageTypes.length > 0 ? state.coverageTypes : undefined,
  };
}

// Initial wizard state factory (needs fresh Date each time)
const createInitialWizardState = (): ContractWizardState => ({
  path: null,
  templateId: null,
  role: null,
  wizardMode: 'contract',
  // Counterparty
  buyerId: null,
  buyerName: '',
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

const ContractWizard: React.FC<ContractWizardProps> = ({
  isOpen,
  onClose,
  contractType = 'client',
  onComplete,
}) => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  // API mutation
  const { createContract, updateStatus, sendNotification, isCreating } = useContractOperations();
  const { addToast } = useVaNiToast();

  // Gateway status for pre-payment dialog (online option)
  const { hasActiveGateway: wizardHasGateway, providerDisplayName: wizardGatewayName } = useGatewayStatus();

  // Current step state
  const [currentStep, setCurrentStep] = useState(0);

  // Sub-step for template selection (shown after choosing "From Template")
  const [showTemplateSelection, setShowTemplateSelection] = useState(false);

  // Success screen state
  const [isContractSent, setIsContractSent] = useState(false);
  const [createdContractData, setCreatedContractData] = useState<Record<string, any> | null>(null);
  const [cnakCopied, setCnakCopied] = useState(false);

  // Pre-payment dialog state (auto-accept flow: collect payment BEFORE creation)
  const [showPrePaymentDialog, setShowPrePaymentDialog] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [processingStep, setProcessingStep] = useState('');
  const [recordedReceipt, setRecordedReceipt] = useState<RecordPaymentResponse | null>(null);

  // Payment form state (pre-payment dialog fields)
  const [paymentChannel, setPaymentChannel] = useState<'offline' | 'online'>('offline');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('bank_transfer');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [paymentEmiSequence, setPaymentEmiSequence] = useState(1);

  // Wizard data state
  const [wizardState, setWizardState] = useState<ContractWizardState>(createInitialWizardState);

  // Derived: contract ID from creation response (for payment dialog)
  const createdContractId = createdContractData?.id;

  // Reset entire wizard to fresh state
  const resetWizard = useCallback(() => {
    setWizardState(createInitialWizardState());
    setCurrentStep(0);
    setShowTemplateSelection(false);
    setIsContractSent(false);
    setCreatedContractData(null);
    setCnakCopied(false);
    // Pre-payment dialog resets
    setShowPrePaymentDialog(false);
    setIsProcessingPayment(false);
    setProcessingStep('');
    setRecordedReceipt(null);
    setPaymentAmount('');
    setPaymentMethod('bank_transfer');
    setPaymentDate(new Date().toISOString().split('T')[0]);
    setPaymentReference('');
    setPaymentNotes('');
    setPaymentEmiSequence(1);
  }, []);

  // Close handler — resets wizard state then calls parent onClose
  const handleClose = useCallback(() => {
    resetWizard();
    onClose();
  }, [resetWizard, onClose]);

  // Update wizard state helper
  const updateWizardState = useCallback(
    <K extends keyof ContractWizardState>(
      key: K,
      value: ContractWizardState[K]
    ) => {
      setWizardState((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  // Determine if RFQ mode is active
  const isRfqMode = wizardState.wizardMode === 'rfq';

  // Dynamic step array based on wizard mode
  const activeSteps = isRfqMode ? RFQ_STEPS : CONTRACT_STEPS;
  const totalSteps = activeSteps.length;
  const stepLabels = activeSteps.map(s => s.label);

  // Get current step ID
  const currentStepId = activeSteps[currentStep]?.id || 'path';

  // Calculate total value from selected blocks
  const calculateTotalValue = useCallback(() => {
    return wizardState.selectedBlocks.reduce(
      (total, block) => total + block.totalPrice,
      0
    );
  }, [wizardState.selectedBlocks]);

  // Navigation validation (step ID-based)
  const canGoNext = useCallback((): boolean => {
    // If showing template selection sub-step
    if (showTemplateSelection) {
      return wizardState.templateId !== null;
    }

    switch (currentStepId) {
      case 'path':
        return wizardState.path !== null;
      case 'nomenclature':
        return true; // Optional step — can always proceed
      case 'counterparty':
        return isRfqMode
          ? wizardState.vendorIds.length > 0
          : wizardState.buyerId !== null;
      case 'acceptance':
        return wizardState.acceptanceMethod !== null;
      case 'details':
        return wizardState.contractName.trim() !== '' && wizardState.durationValue > 0;
      case 'billingCycle':
        return wizardState.billingCycleType !== null;
      case 'blocks':
        return wizardState.selectedBlocks.length > 0;
      case 'billingView':
        return true;
      case 'assetSelection':
        // Coverage types are mandatory — user must pick at least one type
        return wizardState.coverageTypes.length > 0;
      case 'evidencePolicy':
        return true; // Evidence policy always has a default (none)
      case 'events':
        return true; // Events preview is informational, always valid
      case 'review':
        return true;
      default:
        return false;
    }
  }, [currentStepId, wizardState, showTemplateSelection, isRfqMode]);

  const canGoBack = currentStep > 0 || showTemplateSelection;
  const isLastStep = currentStep === totalSteps - 1;

  // Navigation handlers
  const handleNext = useCallback(async () => {
    if (isLastStep) {
      // Auto-accept: show pre-payment dialog instead of creating immediately
      if (wizardState.acceptanceMethod === 'auto') {
        const total = wizardState.grandTotal || wizardState.totalValue;
        const isEmi = wizardState.paymentMode === 'emi' && wizardState.emiMonths > 0;
        const emiAmount = isEmi ? Math.round((total / wizardState.emiMonths) * 100) / 100 : total;
        setPaymentAmount(emiAmount.toString());
        setPaymentChannel('offline');
        setPaymentMethod('bank_transfer');
        setPaymentDate(new Date().toISOString().split('T')[0]);
        setPaymentReference('');
        setPaymentNotes('');
        setPaymentEmiSequence(1);
        setShowPrePaymentDialog(true);
        return;
      }

      // Non-auto acceptance methods: create contract directly
      try {
        const request = mapWizardToRequest(wizardState, contractType);
        const result = await createContract(request as CreateContractRequest);
        const created = result as Record<string, any>;

        // Transition status: contracts → pending_acceptance, RFQs → sent
        if (created?.id && created?.status === 'draft') {
          const targetStatus = created.record_type === 'rfq' ? 'sent' : 'pending_acceptance';
          try {
            await updateStatus({
              contractId: created.id,
              statusData: { status: targetStatus },
            });
            created.status = targetStatus;
          } catch {
            // Non-fatal: contract was created, status transition can be retried
            console.warn(`Contract created but status transition to ${targetStatus} failed`);
          }
        }

        // Send sign-off notification for signoff contracts (non-blocking)
        if (created?.id && wizardState.acceptanceMethod === 'signoff' && created.record_type !== 'rfq') {
          sendNotification({ contractId: created.id }).catch(() => {
            console.warn('Contract created but sign-off notification failed to send');
          });
        }

        setCreatedContractData(created);
        setCnakCopied(false);
        setIsContractSent(true);
      } catch {
        // Error toast is handled by the mutation's onError
      }
    } else if (showTemplateSelection) {
      // From template selection, go to acceptance step (index 1 in contract flow)
      setShowTemplateSelection(false);
      setCurrentStep(1);
    } else if (canGoNext()) {
      // Special handling for path step -> check if "From Template" was selected
      if (currentStepId === 'path' && wizardState.path === 'template') {
        setShowTemplateSelection(true);
        return;
      }

      // Validate unified billing cycle on blocks step
      if (currentStepId === 'blocks' && wizardState.billingCycleType === 'unified') {
        const pricingBlocks = wizardState.selectedBlocks.filter((block) => {
          if (block.isFlyBy) {
            return block.flyByType === 'service' || block.flyByType === 'spare';
          }
          return categoryHasPricing(block.categoryId || '');
        });

        if (pricingBlocks.length > 0) {
          const cycles = new Set(pricingBlocks.map((b) => b.cycle));
          if (cycles.size > 1) {
            addToast({
              type: 'error',
              title: 'Billing cycle mismatch',
              message: 'Unified Cycle requires all pricing blocks to use the same billing cycle. Please update the blocks so they all match.',
            });
            return;
          }
        }
      }

      setCurrentStep((prev) => Math.min(prev + 1, totalSteps - 1));
    }
  }, [isLastStep, canGoNext, wizardState, showTemplateSelection, currentStepId, totalSteps, contractType, createContract, updateStatus, sendNotification, addToast]);

  // Done button handler on success screen
  const handleDone = useCallback(() => {
    onComplete?.(wizardState);
    resetWizard();
    onClose();
  }, [wizardState, onComplete, resetWizard, onClose]);

  // Create contract WITH payment recording (auto-accept flow)
  const handleCreateWithPayment = useCallback(async () => {
    let contractResult: Record<string, any> | null = null;
    try {
      setIsProcessingPayment(true);

      // Step 1: Create the contract
      setProcessingStep('Creating contract...');
      const request = mapWizardToRequest(wizardState, contractType);
      contractResult = (await createContract(request as CreateContractRequest)) as Record<string, any>;
      const contractId = contractResult?.id;
      if (!contractId) throw new Error('Contract created but no ID returned');
      setCreatedContractData(contractResult);

      // Step 2: Fetch the auto-generated invoice
      setProcessingStep('Fetching invoice...');
      const invoiceResponse = await api.get(API_ENDPOINTS.CONTRACTS.INVOICES(contractId));
      const invoices = invoiceResponse.data?.data?.invoices || invoiceResponse.data?.invoices || [];
      const invoice = invoices[0];
      if (!invoice?.id) throw new Error('Invoice not found');

      // Step 3: Record the payment
      setProcessingStep('Recording payment...');
      const paymentPayload = {
        invoice_id: invoice.id,
        amount: parseFloat(paymentAmount),
        payment_method: paymentMethod,
        payment_date: paymentDate,
        reference_number: paymentReference || undefined,
        notes: paymentNotes || undefined,
        emi_sequence: wizardState.paymentMode === 'emi' ? paymentEmiSequence : undefined,
      };

      const paymentResponse = await api.post(
        API_ENDPOINTS.CONTRACTS.RECORD_PAYMENT(contractId),
        paymentPayload
      );
      const receipt = paymentResponse.data?.data || paymentResponse.data;

      setRecordedReceipt(receipt);
      setShowPrePaymentDialog(false);
      setCnakCopied(false);
      setIsContractSent(true);

      addToast({
        type: 'success',
        title: 'Contract created & payment recorded',
        message: `Receipt: ${receipt.receipt_number}`,
      });
    } catch (err: any) {
      if (contractResult) {
        // Contract was created but payment failed — still show success
        setCreatedContractData(contractResult);
        setShowPrePaymentDialog(false);
        setCnakCopied(false);
        setIsContractSent(true);
        addToast({
          type: 'warning',
          title: 'Contract created, payment recording failed',
          message: err.message || 'Record payment later from contract details.',
        });
      } else {
        addToast({
          type: 'error',
          title: 'Failed to create contract',
          message: err.message || 'An error occurred',
        });
      }
    } finally {
      setIsProcessingPayment(false);
      setProcessingStep('');
    }
  }, [wizardState, contractType, createContract, paymentAmount, paymentMethod, paymentDate, paymentReference, paymentNotes, paymentEmiSequence, addToast]);

  // Create contract WITHOUT payment (skip payment, auto-accept flow)
  const handleCreateSkipPayment = useCallback(async () => {
    try {
      setIsProcessingPayment(true);
      setProcessingStep('Creating contract...');
      setShowPrePaymentDialog(false);

      const request = mapWizardToRequest(wizardState, contractType);
      const result = await createContract(request as CreateContractRequest);
      setCreatedContractData(result as Record<string, any>);
      setCnakCopied(false);
      setIsContractSent(true);
    } catch {
      // Error toast handled by mutation's onError
    } finally {
      setIsProcessingPayment(false);
      setProcessingStep('');
    }
  }, [wizardState, contractType, createContract]);

  // Create contract + initiate online Razorpay payment (auto-accept flow)
  const handleCreateWithOnlinePayment = useCallback(async () => {
    let contractResult: Record<string, any> | null = null;
    try {
      setIsProcessingPayment(true);

      // Step 1: Create the contract
      setProcessingStep('Creating contract...');
      const request = mapWizardToRequest(wizardState, contractType);
      contractResult = (await createContract(request as CreateContractRequest)) as Record<string, any>;
      const contractId = contractResult?.id;
      if (!contractId) throw new Error('Contract created but no ID returned');
      setCreatedContractData(contractResult);

      // Step 2: Fetch the auto-generated invoice
      setProcessingStep('Fetching invoice...');
      const invoiceResponse = await api.get(API_ENDPOINTS.CONTRACTS.INVOICES(contractId));
      const invoices = invoiceResponse.data?.data?.invoices || invoiceResponse.data?.invoices || [];
      const invoice = invoices[0];
      if (!invoice?.id) throw new Error('Invoice not found');

      // Step 3: Create payment order via gateway
      setProcessingStep('Initiating payment gateway...');
      const orderResponse = await api.post(API_ENDPOINTS.PAYMENTS.CREATE_ORDER, {
        invoice_id: invoice.id,
        contract_id: contractId,
        amount: parseFloat(paymentAmount),
        currency: wizardState.currency || 'INR',
        collection_mode: 'terminal',
      });
      const orderData = orderResponse.data?.data || orderResponse.data;

      if (!orderData?.gateway_order_id || !orderData?.gateway_key_id) {
        throw new Error('Failed to create payment order');
      }

      // Step 4: Open Razorpay checkout
      setProcessingStep('Opening payment gateway...');
      setIsProcessingPayment(false);
      setShowPrePaymentDialog(false);

      // Razorpay will handle the rest — open checkout popup
      const options = {
        key: orderData.gateway_key_id,
        amount: Math.round(parseFloat(paymentAmount) * 100),
        currency: wizardState.currency || 'INR',
        name: wizardState.contractName || 'Contract Payment',
        order_id: orderData.gateway_order_id,
        handler: async (response: any) => {
          try {
            // Verify payment
            await api.post(API_ENDPOINTS.PAYMENTS.VERIFY_PAYMENT, {
              request_id: orderData.request_id,
              gateway_order_id: response.razorpay_order_id,
              gateway_payment_id: response.razorpay_payment_id,
              gateway_signature: response.razorpay_signature,
            });
            addToast({
              type: 'success',
              title: 'Payment successful',
              message: 'Contract created and payment received.',
            });
          } catch {
            addToast({
              type: 'warning',
              title: 'Contract created, payment verification pending',
              message: 'Payment will be confirmed shortly via webhook.',
            });
          }
          setCnakCopied(false);
          setIsContractSent(true);
        },
        modal: {
          ondismiss: () => {
            // User closed Razorpay — contract is still created, show success
            setCnakCopied(false);
            setIsContractSent(true);
            addToast({
              type: 'warning',
              title: 'Contract created, payment not completed',
              message: 'You can collect payment later from contract details.',
            });
          },
        },
        prefill: {
          name: wizardState.buyerName || '',
        },
      };

      if (typeof window !== 'undefined' && (window as any).Razorpay) {
        const rzp = new (window as any).Razorpay(options);
        rzp.open();
      } else {
        throw new Error('Razorpay SDK not loaded');
      }
    } catch (err: any) {
      if (contractResult) {
        setCreatedContractData(contractResult);
        setShowPrePaymentDialog(false);
        setCnakCopied(false);
        setIsContractSent(true);
        addToast({
          type: 'warning',
          title: 'Contract created, online payment failed',
          message: err.message || 'You can collect payment later from contract details.',
        });
      } else {
        addToast({
          type: 'error',
          title: 'Failed to create contract',
          message: err.message || 'An error occurred',
        });
      }
      setIsProcessingPayment(false);
      setProcessingStep('');
    }
  }, [wizardState, contractType, createContract, paymentAmount, addToast]);

  const handleBack = useCallback(() => {
    if (showTemplateSelection) {
      // Go back to path selection
      setShowTemplateSelection(false);
      updateWizardState('templateId', null);
    } else {
      setCurrentStep((prev) => Math.max(prev - 1, 0));
    }
  }, [showTemplateSelection, updateWizardState]);

  // Path selection handler
  const handlePathSelect = useCallback(
    (path: ContractPath) => {
      updateWizardState('path', path);
    },
    [updateWizardState]
  );

  // Template selection handler
  const handleTemplateSelect = useCallback(
    (templateId: string) => {
      updateWizardState('templateId', templateId);
    },
    [updateWizardState]
  );

  // Switch to scratch from template selection
  const handleSwitchToScratch = useCallback(() => {
    updateWizardState('path', 'scratch');
    updateWizardState('templateId', null);
    setShowTemplateSelection(false);
    setCurrentStep(1); // Go to Acceptance step (first after path)
  }, [updateWizardState]);

  // Billing cycle type selection handler
  const handleBillingCycleTypeSelect = useCallback(
    (cycleType: BillingCycleType) => {
      updateWizardState('billingCycleType', cycleType);
    },
    [updateWizardState]
  );

  // Wizard mode change handler (RFQ/Contract)
  const handleWizardModeChange = useCallback(
    (mode: WizardMode) => {
      updateWizardState('wizardMode', mode);
      // Reset step to 0 when mode changes (path is always step 0)
      setCurrentStep(0);
    },
    [updateWizardState]
  );

  // Buyer selection handler
  const handleBuyerSelect = useCallback(
    (buyerId: string, buyerName: string) => {
      updateWizardState('buyerId', buyerId || null);
      updateWizardState('buyerName', buyerName);
    },
    [updateWizardState]
  );

  // Vendor multi-select handler (for RFQ)
  const handleVendorsChange = useCallback(
    (ids: string[], names: string[]) => {
      updateWizardState('vendorIds', ids);
      updateWizardState('vendorNames', names);
    },
    [updateWizardState]
  );

  // Nomenclature selection handler
  const handleNomenclatureSelect = useCallback(
    (id: string | null, displayName: string | null, group?: string | null) => {
      updateWizardState('nomenclatureId', id);
      updateWizardState('nomenclatureName', displayName);
      updateWizardState('nomenclatureGroup', group ?? null);
    },
    [updateWizardState]
  );

  // Acceptance method selection handler
  const handleAcceptanceMethodSelect = useCallback(
    (method: AcceptanceMethod) => {
      updateWizardState('acceptanceMethod', method);
    },
    [updateWizardState]
  );

  // Contract details change handler
  const handleDetailsChange = useCallback(
    (data: Partial<ContractDetailsData>) => {
      setWizardState((prev) => ({ ...prev, ...data }));
    },
    []
  );

  // Blocks change handler
  const handleBlocksChange = useCallback(
    (blocks: SelectedBlock[]) => {
      const totalValue = blocks.reduce((sum, block) => sum + block.totalPrice, 0);
      setWizardState((prev) => ({
        ...prev,
        selectedBlocks: blocks,
        totalValue,
      }));
    },
    []
  );

  // Tax rate IDs change handler
  const handleTaxRateIdsChange = useCallback(
    (ids: string[]) => {
      updateWizardState('selectedTaxRateIds', ids);
    },
    [updateWizardState]
  );

  // Tax totals change handler (called by BillingViewStep when computed totals change)
  const handleTotalsChange = useCallback(
    (totals: { baseSubtotal?: number; taxTotal: number; grandTotal: number; taxBreakdown: Array<{ tax_rate_id: string; name: string; rate: number; amount: number }> }) => {
      setWizardState((prev) => ({
        ...prev,
        baseSubtotal: totals.baseSubtotal ?? prev.baseSubtotal,
        taxTotal: totals.taxTotal,
        grandTotal: totals.grandTotal,
        taxBreakdown: totals.taxBreakdown,
      }));
    },
    []
  );

  // Payment mode change handler
  const handlePaymentModeChange = useCallback(
    (mode: 'prepaid' | 'emi' | 'defined') => {
      updateWizardState('paymentMode', mode);
    },
    [updateWizardState]
  );

  // EMI months change handler
  const handleEmiMonthsChange = useCallback(
    (months: number) => {
      updateWizardState('emiMonths', months);
    },
    [updateWizardState]
  );

  // Per-block payment type change handler
  const handlePerBlockPaymentTypeChange = useCallback(
    (blockPaymentTypes: Record<string, 'prepaid' | 'postpaid'>) => {
      updateWizardState('perBlockPaymentType', blockPaymentTypes);
    },
    [updateWizardState]
  );

  // Event overrides change handler (Events Preview step)
  const handleEventOverridesChange = useCallback(
    (overrides: Record<string, Date>) => {
      updateWizardState('eventOverrides', overrides);
    },
    [updateWizardState]
  );

  // Render current step content (step ID-based routing)
  const renderStepContent = () => {
    // Show template selection sub-step if applicable
    if (showTemplateSelection) {
      return (
        <TemplateSelectionStep
          templates={[]} // Empty for now - will be populated from API
          selectedTemplateId={wizardState.templateId}
          onSelectTemplate={handleTemplateSelect}
          onSwitchToScratch={handleSwitchToScratch}
          isLoading={false}
        />
      );
    }

    switch (currentStepId) {
      case 'path':
        return (
          <PathSelectionStep
            selectedPath={wizardState.path}
            onSelectPath={handlePathSelect}
            showModeSelection={contractType === 'vendor'}
            wizardMode={wizardState.wizardMode}
            onModeChange={handleWizardModeChange}
          />
        );
      case 'nomenclature':
        return (
          <NomenclatureStep
            selectedId={wizardState.nomenclatureId}
            onSelect={handleNomenclatureSelect}
          />
        );
      case 'counterparty':
        return isRfqMode ? (
          <BuyerSelectionStep
            selectedBuyerId={null}
            selectedBuyerName=""
            onSelectBuyer={() => {}} // Not used in multi-select
            contractType="vendor"
            multiSelect={true}
            selectedVendorIds={wizardState.vendorIds}
            selectedVendorNames={wizardState.vendorNames}
            onVendorsChange={handleVendorsChange}
          />
        ) : (
          <BuyerSelectionStep
            selectedBuyerId={wizardState.buyerId}
            selectedBuyerName={wizardState.buyerName}
            onSelectBuyer={handleBuyerSelect}
            contractType={contractType}
            acceptanceMethod={wizardState.acceptanceMethod}
          />
        );
      case 'acceptance':
        return (
          <AcceptanceMethodStep
            selectedMethod={wizardState.acceptanceMethod}
            onSelectMethod={handleAcceptanceMethodSelect}
          />
        );
      case 'details':
        return (
          <ContractDetailsStep
            data={{
              contractName: wizardState.contractName,
              status: wizardState.status,
              currency: wizardState.currency,
              description: wizardState.description,
              startDate: wizardState.startDate,
              durationValue: wizardState.durationValue,
              durationUnit: wizardState.durationUnit,
              gracePeriodValue: wizardState.gracePeriodValue,
              gracePeriodUnit: wizardState.gracePeriodUnit,
            }}
            onChange={handleDetailsChange}
            title={isRfqMode ? 'Request Details' : undefined}
            subtitle={isRfqMode ? 'Define the basic information for your RFQ' : undefined}
          />
        );
      case 'billingCycle':
        return (
          <BillingCycleStep
            selectedCycleType={wizardState.billingCycleType}
            onSelectCycleType={handleBillingCycleTypeSelect}
          />
        );
      case 'blocks': {
        // Calculate contract duration in months
        const durationInMonths = wizardState.durationUnit === 'months'
          ? wizardState.durationValue
          : wizardState.durationUnit === 'years'
            ? wizardState.durationValue * 12
            : Math.ceil(wizardState.durationValue / 30);

        return (
          <ServiceBlocksStep
            selectedBlocks={wizardState.selectedBlocks}
            currency={wizardState.currency}
            onBlocksChange={handleBlocksChange}
            contractName={wizardState.contractName || (isRfqMode ? 'New RFQ' : 'New Contract')}
            contractStatus={wizardState.status}
            contractDuration={durationInMonths}
            contractStartDate={wizardState.startDate}
            selectedBuyer={wizardState.buyerId ? {
              id: wizardState.buyerId,
              contact_type: 'individual',
              name: wizardState.buyerName,
            } : undefined}
            rfqMode={isRfqMode}
            coverageTypes={wizardState.coverageTypes}
          />
        );
      }
      case 'billingView': {
        // Billing View - calculate duration in months
        const billingDuration = wizardState.durationUnit === 'months'
          ? wizardState.durationValue
          : wizardState.durationUnit === 'years'
            ? wizardState.durationValue * 12
            : Math.ceil(wizardState.durationValue / 30);

        return (
          <BillingViewStep
            selectedBlocks={wizardState.selectedBlocks}
            currency={wizardState.currency}
            billingCycleType={wizardState.billingCycleType}
            onBlocksChange={handleBlocksChange}
            selectedTaxRateIds={wizardState.selectedTaxRateIds}
            onTaxRateIdsChange={handleTaxRateIdsChange}
            onTotalsChange={handleTotalsChange}
            paymentMode={wizardState.paymentMode}
            onPaymentModeChange={handlePaymentModeChange}
            emiMonths={wizardState.emiMonths}
            onEmiMonthsChange={handleEmiMonthsChange}
            perBlockPaymentType={wizardState.perBlockPaymentType}
            onPerBlockPaymentTypeChange={handlePerBlockPaymentTypeChange}
            contractDuration={billingDuration}
          />
        );
      }
      case 'assetSelection': {
        return (
          <AssetSelectionStep
            contactId={wizardState.buyerId || ''}
            buyerName={wizardState.buyerName}
            nomenclatureGroup={wizardState.nomenclatureGroup}
            equipmentDetails={wizardState.equipmentDetails}
            onEquipmentDetailsChange={(items) =>
              updateWizardState('equipmentDetails', items)
            }
            allowBuyerToAdd={wizardState.allowBuyerToAdd}
            onAllowBuyerToAddChange={(allow) =>
              updateWizardState('allowBuyerToAdd', allow)
            }
            coverageTypes={wizardState.coverageTypes}
            onCoverageTypesChange={(types) =>
              updateWizardState('coverageTypes', types)
            }
          />
        );
      }
      case 'evidencePolicy': {
        return (
          <EvidencePolicyStep
            policyType={wizardState.evidencePolicyType}
            selectedForms={wizardState.evidenceSelectedForms}
            onPolicyTypeChange={(type) =>
              updateWizardState('evidencePolicyType', type)
            }
            onSelectedFormsChange={(forms) =>
              updateWizardState('evidenceSelectedForms', forms)
            }
          />
        );
      }
      case 'events': {
        return (
          <div className="px-6 py-4">
            <EventsPreviewStep
              startDate={wizardState.startDate}
              durationValue={wizardState.durationValue}
              durationUnit={wizardState.durationUnit}
              selectedBlocks={wizardState.selectedBlocks}
              paymentMode={wizardState.paymentMode}
              emiMonths={wizardState.emiMonths}
              perBlockPaymentType={wizardState.perBlockPaymentType}
              billingCycleType={wizardState.billingCycleType}
              grandTotal={wizardState.grandTotal || wizardState.totalValue}
              currency={wizardState.currency}
              eventOverrides={wizardState.eventOverrides}
              onEventOverridesChange={handleEventOverridesChange}
            />
          </div>
        );
      }
      case 'review':
        return (
          <ReviewSendStep
            contractName={wizardState.contractName}
            contractStatus={wizardState.status}
            description={wizardState.description}
            durationValue={wizardState.durationValue}
            durationUnit={wizardState.durationUnit}
            buyerId={wizardState.buyerId}
            buyerName={wizardState.buyerName}
            acceptanceMethod={wizardState.acceptanceMethod}
            billingCycleType={wizardState.billingCycleType}
            currency={wizardState.currency}
            selectedBlocks={wizardState.selectedBlocks}
            paymentMode={wizardState.paymentMode}
            emiMonths={wizardState.emiMonths}
            perBlockPaymentType={wizardState.perBlockPaymentType}
            selectedTaxRateIds={wizardState.selectedTaxRateIds}
            rfqMode={isRfqMode}
            vendorNames={wizardState.vendorNames}
            nomenclatureName={wizardState.nomenclatureName}
          />
        );
      default:
        return null;
    }
  };

  // Copy CNAK to clipboard
  const handleCopyCnak = useCallback(async () => {
    const cnak = createdContractData?.global_access_id;
    if (!cnak) return;
    try {
      await navigator.clipboard.writeText(cnak);
      setCnakCopied(true);
      setTimeout(() => setCnakCopied(false), 2000);
    } catch {
      // Fallback: ignore if clipboard API unavailable
    }
  }, [createdContractData]);

  // Derived data from API response for success screen
  const contractNumber = createdContractData?.contract_number || createdContractData?.rfq_number || '';
  const cnak = createdContractData?.global_access_id || '';
  const createdGrandTotal = createdContractData?.grand_total;
  const createdCurrency = createdContractData?.currency || wizardState.currency || 'INR';

  // Format currency amount
  const formatAmount = (amount: number | undefined, currency: string) => {
    if (amount === undefined || amount === null) return '';
    try {
      return new Intl.NumberFormat('en-IN', { style: 'currency', currency }).format(amount);
    } catch {
      return `${currency} ${amount.toLocaleString()}`;
    }
  };

  // Acceptance method display config
  const acceptanceConfig: Record<string, { icon: React.ReactNode; title: string; subtitle: string; statusLabel: string; statusColor: string }> = {
    payment: {
      icon: <CreditCard className="w-5 h-5" />,
      title: 'Contract Created & Sent for Payment',
      subtitle: 'An invoice will be sent to the client for payment.',
      statusLabel: 'Pending Payment',
      statusColor: colors.semantic.warning,
    },
    signoff: {
      icon: <PenTool className="w-5 h-5" />,
      title: 'Contract Created — Awaiting Sign-off',
      subtitle: 'A secure link has been sent for review and sign-off.',
      statusLabel: 'Pending Sign-off',
      statusColor: colors.semantic.info,
    },
    auto: {
      icon: <Zap className="w-5 h-5" />,
      title: 'Contract Created & Active',
      subtitle: 'This contract is now active. Record payments as they come in.',
      statusLabel: 'Active',
      statusColor: colors.semantic.success,
    },
  };

  // Success screen - rendered before the !isOpen guard so it stays visible
  if (isContractSent) {
    const acceptMethod = wizardState.acceptanceMethod || 'auto';
    const config = acceptanceConfig[acceptMethod] || acceptanceConfig.auto;

    return (
      <div className="fixed inset-0 z-50">
        {/* Backdrop */}
        <div
          className="absolute inset-0"
          style={{
            backgroundColor: isDarkMode
              ? 'rgba(0, 0, 0, 0.85)'
              : 'rgba(0, 0, 0, 0.5)',
          }}
        />

        {/* Success Content */}
        <div
          className="relative z-10 w-full h-full flex items-center justify-center overflow-y-auto py-8"
          style={{ backgroundColor: colors.utility.primaryBackground }}
        >
          <div className="text-center max-w-lg px-6">
            {/* Animated Checkmark */}
            <div className="mb-6 flex justify-center">
              <div
                className="relative w-24 h-24 rounded-full flex items-center justify-center"
                style={{
                  background: `linear-gradient(135deg, ${config.statusColor}20, ${config.statusColor}08)`,
                  animation: 'scaleIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
                }}
              >
                {/* Outer ring */}
                <div
                  className="absolute inset-0 rounded-full border-2"
                  style={{
                    borderColor: config.statusColor,
                    animation: 'ringPulse 2s ease-in-out infinite',
                  }}
                />
                {/* Inner checkmark circle */}
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center"
                  style={{
                    backgroundColor: config.statusColor,
                    animation: 'scaleIn 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) 0.2s both',
                  }}
                >
                  <CheckCircle2 className="w-8 h-8 text-white" />
                </div>
              </div>
            </div>

            {/* Title — per acceptance method */}
            <h2
              className="text-xl font-bold mb-1"
              style={{
                color: colors.utility.primaryText,
                animation: 'fadeInUp 0.5s ease-out 0.4s both',
              }}
            >
              {isRfqMode ? 'RFQ Sent!' : config.title}
            </h2>

            {/* Subtitle */}
            <p
              className="text-xs mb-5"
              style={{
                color: colors.utility.secondaryText,
                animation: 'fadeInUp 0.5s ease-out 0.5s both',
              }}
            >
              {isRfqMode
                ? 'Vendors will be notified and can submit their quotations.'
                : config.subtitle}
            </p>

            {/* Contract Info Card */}
            {!isRfqMode && (
              <div
                className="rounded-xl p-4 mb-4 text-left"
                style={{
                  backgroundColor: isDarkMode ? `${colors.utility.surface}` : `${colors.utility.surface}`,
                  border: `1px solid ${colors.utility.border}`,
                  animation: 'fadeInUp 0.5s ease-out 0.55s both',
                }}
              >
                {/* Contract Number Row */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium" style={{ color: colors.utility.secondaryText }}>Contract</span>
                    <span className="text-sm font-semibold" style={{ color: colors.utility.primaryText }}>
                      {contractNumber || 'Processing...'}
                    </span>
                  </div>
                  {/* Status Badge */}
                  <span
                    className="text-[10px] font-semibold px-2.5 py-1 rounded-full"
                    style={{
                      backgroundColor: `${config.statusColor}18`,
                      color: config.statusColor,
                    }}
                  >
                    {config.statusLabel}
                  </span>
                </div>

                {/* CNAK Row */}
                {cnak && (
                  <div className="flex items-center justify-between mb-3 pb-3" style={{ borderBottom: `1px solid ${colors.utility.border}` }}>
                    <div className="flex items-center gap-2">
                      <Key className="w-3.5 h-3.5" style={{ color: colors.brand.primary }} />
                      <span className="text-xs font-medium" style={{ color: colors.utility.secondaryText }}>CNAK</span>
                      <span
                        className="text-sm font-mono font-bold tracking-wide"
                        style={{ color: colors.brand.primary }}
                      >
                        {cnak}
                      </span>
                    </div>
                    <button
                      onClick={handleCopyCnak}
                      className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-md transition-all hover:opacity-80"
                      style={{
                        backgroundColor: cnakCopied ? `${colors.semantic.success}15` : `${colors.brand.primary}10`,
                        color: cnakCopied ? colors.semantic.success : colors.brand.primary,
                      }}
                    >
                      {cnakCopied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      {cnakCopied ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                )}

                {/* Client & Amount */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-[10px] mb-0.5" style={{ color: colors.utility.secondaryText }}>
                      {COUNTERPARTY_LABEL[contractType] ? COUNTERPARTY_LABEL[contractType].charAt(0).toUpperCase() + COUNTERPARTY_LABEL[contractType].slice(1) : 'Counterparty'}
                    </p>
                    <p className="text-xs font-medium truncate" style={{ color: colors.utility.primaryText }}>
                      {wizardState.buyerName || 'N/A'}
                    </p>
                  </div>
                  {createdGrandTotal !== undefined && createdGrandTotal !== null && (
                    <div className="text-right">
                      <p className="text-[10px] mb-0.5" style={{ color: colors.utility.secondaryText }}>Amount</p>
                      <p className="text-xs font-semibold" style={{ color: colors.utility.primaryText }}>
                        {formatAmount(createdGrandTotal, createdCurrency)}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* RFQ Info Card */}
            {isRfqMode && (
              <div
                className="rounded-xl p-4 mb-4 text-left"
                style={{
                  backgroundColor: colors.utility.surface,
                  border: `1px solid ${colors.utility.border}`,
                  animation: 'fadeInUp 0.5s ease-out 0.55s both',
                }}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium" style={{ color: colors.utility.secondaryText }}>RFQ</span>
                    <span className="text-sm font-semibold" style={{ color: colors.utility.primaryText }}>
                      {createdContractData?.rfq_number || 'Processing...'}
                    </span>
                  </div>
                  <span
                    className="text-[10px] font-semibold px-2.5 py-1 rounded-full"
                    style={{ backgroundColor: `${colors.semantic.info}18`, color: colors.semantic.info }}
                  >
                    Sent
                  </span>
                </div>
                <p className="text-xs" style={{ color: colors.utility.secondaryText }}>
                  Sent to{' '}
                  <strong style={{ color: colors.utility.primaryText }}>
                    {wizardState.vendorNames.length > 0
                      ? `${wizardState.vendorNames.length} vendor${wizardState.vendorNames.length > 1 ? 's' : ''}`
                      : 'your vendors'}
                  </strong>
                </p>
              </div>
            )}

            {/* Acceptance-specific info panel (contracts only) */}
            {!isRfqMode && (
              <div
                className="rounded-xl p-3 mb-5"
                style={{
                  backgroundColor: `${config.statusColor}08`,
                  border: `1px solid ${config.statusColor}20`,
                  animation: 'fadeInUp 0.5s ease-out 0.65s both',
                }}
              >
                <div className="flex items-start gap-2.5">
                  <div
                    className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center mt-0.5"
                    style={{ backgroundColor: `${config.statusColor}15`, color: config.statusColor }}
                  >
                    {config.icon}
                  </div>
                  <div className="text-left">
                    {acceptMethod === 'payment' && (
                      <>
                        <p className="text-xs font-medium mb-0.5" style={{ color: colors.utility.primaryText }}>
                          Invoice will be dispatched
                        </p>
                        <p className="text-[10px]" style={{ color: colors.utility.secondaryText }}>
                          {createdContractData?.buyer_email
                            ? <>An invoice will be sent to <strong>{createdContractData.buyer_email}</strong>. Contract activates upon payment.</>
                            : 'An invoice will be sent to the client. Contract activates upon payment.'}
                        </p>
                      </>
                    )}
                    {acceptMethod === 'signoff' && (
                      <>
                        <p className="text-xs font-medium mb-0.5" style={{ color: colors.utility.primaryText }}>
                          Awaiting client sign-off
                        </p>
                        <p className="text-[10px] mb-1.5" style={{ color: colors.utility.secondaryText }}>
                          {createdContractData?.buyer_email
                            ? <>A secure link will be sent to <strong>{createdContractData.buyer_email}</strong></>
                            : 'A secure link will be sent to the client'}
                        </p>
                        <div className="flex items-center gap-3 text-[10px]" style={{ color: colors.utility.secondaryText }}>
                          <span className="flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: colors.semantic.success }} />
                            Accept &rarr; Active
                          </span>
                          <span className="flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: colors.semantic.error }} />
                            Reject &rarr; Edit & Resend
                          </span>
                        </div>
                      </>
                    )}
                    {acceptMethod === 'auto' && (
                      <>
                        <p className="text-xs font-medium mb-0.5" style={{ color: colors.utility.primaryText }}>
                          {recordedReceipt ? 'Payment Recorded' : 'Contract is now active'}
                        </p>
                        {recordedReceipt ? (
                          <div className="text-[10px] space-y-1" style={{ color: colors.utility.secondaryText }}>
                            <p>
                              Receipt:{' '}
                              <strong style={{ color: colors.semantic.success }}>{recordedReceipt.receipt_number}</strong>
                            </p>
                            <p>
                              Amount: <strong>{formatAmount(recordedReceipt.amount, recordedReceipt.currency)}</strong>
                              {recordedReceipt.emi_sequence
                                ? ` (${recordedReceipt.emi_sequence} of ${wizardState.emiMonths})`
                                : ''}
                            </p>
                            <p>Invoice balance: {formatAmount(recordedReceipt.balance, recordedReceipt.currency)}</p>
                          </div>
                        ) : (
                          <p className="text-[10px]" style={{ color: colors.utility.secondaryText }}>
                            No initial payment was recorded. You can record payments from the contract details page.
                          </p>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* CNAK tracking note (contracts only) */}
            {!isRfqMode && cnak && (
              <p
                className="text-[10px] mb-5 flex items-center justify-center gap-1.5"
                style={{
                  color: colors.utility.secondaryText,
                  animation: 'fadeInUp 0.5s ease-out 0.7s both',
                }}
              >
                <Key className="w-3 h-3" style={{ color: colors.brand.primary }} />
                Track this contract using CNAK: <strong style={{ color: colors.brand.primary }}>{cnak}</strong>
              </p>
            )}

            {/* Done Button */}
            <button
              onClick={handleDone}
              className="inline-flex items-center gap-2 px-8 py-3 rounded-xl text-white font-semibold transition-all hover:opacity-90 hover:shadow-lg"
              style={{
                backgroundColor: colors.brand.primary,
                animation: 'fadeInUp 0.5s ease-out 0.75s both',
              }}
            >
              Done
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* CSS Animations */}
        <style>{`
          @keyframes scaleIn {
            from { transform: scale(0); opacity: 0; }
            to { transform: scale(1); opacity: 1; }
          }
          @keyframes fadeInUp {
            from { transform: translateY(16px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
          }
          @keyframes ringPulse {
            0%, 100% { transform: scale(1); opacity: 0.6; }
            50% { transform: scale(1.08); opacity: 0.3; }
          }
        `}</style>
      </div>
    );
  }

  // Pre-payment dialog: collect payment details before creating contract
  if (showPrePaymentDialog && !isContractSent) {
    const isEmi = wizardState.paymentMode === 'emi' && wizardState.emiMonths > 0;
    const total = wizardState.grandTotal || wizardState.totalValue;
    const subtotalVal = wizardState.baseSubtotal || wizardState.totalValue;
    const taxVal = wizardState.taxTotal || 0;
    const emiInstallmentAmount = isEmi ? Math.round((total / wizardState.emiMonths) * 100) / 100 : total;
    const pmtCurrency = wizardState.currency || 'INR';

    const fmtPmt = (val: number) => {
      try { return new Intl.NumberFormat('en-IN', { style: 'currency', currency: pmtCurrency }).format(val); }
      catch { return `${pmtCurrency} ${val.toLocaleString()}`; }
    };

    const pmtInputStyle: React.CSSProperties = {
      backgroundColor: colors.utility.secondaryBackground,
      border: `1px solid ${colors.utility.border}`,
      color: colors.utility.primaryText,
      borderRadius: '0.5rem',
      padding: '0.5rem 0.75rem',
      fontSize: '0.75rem',
      width: '100%',
      outline: 'none',
    };
    const pmtLabelStyle: React.CSSProperties = {
      color: colors.utility.secondaryText,
      fontSize: '0.625rem',
      fontWeight: 500,
      marginBottom: '0.25rem',
      display: 'block',
    };

    return (
      <div className="fixed inset-0 z-[60]">
        {/* Backdrop */}
        <div
          className="absolute inset-0"
          style={{ backgroundColor: isDarkMode ? 'rgba(0, 0, 0, 0.85)' : 'rgba(0, 0, 0, 0.5)' }}
        />

        {/* Processing overlay */}
        {isProcessingPayment && (
          <div className="absolute inset-0 z-30 flex items-center justify-center" style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)' }}>
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3" style={{ color: colors.brand.primary }} />
              <p className="text-sm font-medium" style={{ color: '#fff' }}>{processingStep}</p>
            </div>
          </div>
        )}

        {/* Dialog Card — Landscape 2-column */}
        <div className="relative z-10 w-full h-full flex items-center justify-center overflow-y-auto py-8">
          <div
            className="w-full max-w-3xl rounded-xl shadow-xl mx-4"
            style={{
              backgroundColor: colors.utility.primaryBackground,
              border: `1px solid ${colors.utility.border}`,
            }}
          >
            {/* Header */}
            <div className="p-4 pb-3 flex items-center justify-between" style={{ borderBottom: `1px solid ${colors.utility.border}` }}>
              <div className="flex items-center gap-2">
                <Receipt className="w-4 h-4" style={{ color: colors.brand.primary }} />
                <h3 className="text-sm font-semibold" style={{ color: colors.utility.primaryText }}>
                  Record Payment & Create Contract
                </h3>
              </div>
              <button
                onClick={() => setShowPrePaymentDialog(false)}
                disabled={isProcessingPayment}
                className="p-1 rounded-lg transition-all hover:opacity-70"
                style={{ color: colors.utility.secondaryText }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* 2-Column Body */}
            <div className="grid grid-cols-[1fr_1.2fr] min-h-0">
              {/* LEFT: Contract Summary */}
              <div className="p-5 border-r" style={{ borderColor: colors.utility.border }}>
                {/* Client Info */}
                <div className="flex items-center gap-3 mb-5">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: `${colors.brand.primary}12` }}
                  >
                    <Building2 className="w-5 h-5" style={{ color: colors.brand.primary }} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold truncate" style={{ color: colors.utility.primaryText }}>
                      {wizardState.buyerName || 'Client'}
                    </p>
                    <p className="text-[10px]" style={{ color: colors.utility.secondaryText }}>
                      {wizardState.contractName || 'Untitled Contract'}
                    </p>
                  </div>
                </div>

                {/* Amount Breakdown */}
                <div
                  className="rounded-lg p-4 space-y-2.5"
                  style={{ backgroundColor: colors.utility.secondaryBackground }}
                >
                  <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: colors.utility.secondaryText }}>
                    Amount Breakdown
                  </p>
                  <div className="flex justify-between">
                    <span className="text-xs" style={{ color: colors.utility.secondaryText }}>Subtotal</span>
                    <span className="text-xs font-medium" style={{ color: colors.utility.primaryText }}>{fmtPmt(subtotalVal)}</span>
                  </div>

                  {/* Individual tax lines from wizard state */}
                  {wizardState.taxBreakdown?.length > 0 ? (
                    wizardState.taxBreakdown.map((tax, idx) => (
                      <div key={idx} className="flex justify-between">
                        <span className="text-xs" style={{ color: colors.utility.secondaryText }}>{tax.name} ({tax.rate}%)</span>
                        <span className="text-xs font-medium" style={{ color: colors.utility.primaryText }}>{fmtPmt(tax.amount)}</span>
                      </div>
                    ))
                  ) : taxVal > 0 ? (
                    <div className="flex justify-between">
                      <span className="text-xs" style={{ color: colors.utility.secondaryText }}>Tax</span>
                      <span className="text-xs font-medium" style={{ color: colors.utility.primaryText }}>{fmtPmt(taxVal)}</span>
                    </div>
                  ) : null}

                  <div className="border-t pt-2" style={{ borderColor: `${colors.utility.primaryText}10` }}>
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold" style={{ color: colors.utility.primaryText }}>
                        {isEmi ? 'Grand Total' : 'Amount Due'}
                      </span>
                      <span className="text-base font-bold" style={{ color: colors.brand.primary }}>
                        {fmtPmt(total)}
                      </span>
                    </div>
                  </div>

                  {isEmi && (
                    <div
                      className="flex justify-between items-center p-2 rounded-md mt-1"
                      style={{ backgroundColor: `${colors.brand.primary}08` }}
                    >
                      <span className="text-[10px]" style={{ color: colors.utility.secondaryText }}>Per Installment</span>
                      <span className="text-xs font-bold" style={{ color: colors.brand.primary }}>{fmtPmt(emiInstallmentAmount)}</span>
                    </div>
                  )}
                </div>

                {/* Payment Mode Badge */}
                <div className="mt-4 flex items-center gap-2">
                  <CreditCard className="w-3.5 h-3.5" style={{ color: colors.utility.secondaryText }} />
                  <span className="text-[11px] font-medium" style={{ color: colors.utility.secondaryText }}>
                    {wizardState.paymentMode === 'prepaid' ? 'Upfront Payment' : wizardState.paymentMode === 'emi' ? `EMI (${wizardState.emiMonths} months)` : 'As Defined'}
                  </span>
                </div>
              </div>

              {/* RIGHT: Payment Form */}
              <div className="p-5">
                {/* Offline / Online Toggle */}
                {wizardHasGateway && (
                  <div className="flex gap-1 p-1 rounded-lg mb-4" style={{ backgroundColor: colors.utility.secondaryBackground }}>
                    <button
                      onClick={() => setPaymentChannel('offline')}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-xs font-medium transition-all"
                      style={{
                        backgroundColor: paymentChannel === 'offline' ? colors.utility.primaryBackground : 'transparent',
                        color: paymentChannel === 'offline' ? colors.utility.primaryText : colors.utility.secondaryText,
                        boxShadow: paymentChannel === 'offline' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                      }}
                    >
                      <WifiOff className="w-3.5 h-3.5" />
                      Offline
                    </button>
                    <button
                      onClick={() => setPaymentChannel('online')}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-xs font-medium transition-all"
                      style={{
                        backgroundColor: paymentChannel === 'online' ? colors.utility.primaryBackground : 'transparent',
                        color: paymentChannel === 'online' ? colors.brand.primary : colors.utility.secondaryText,
                        boxShadow: paymentChannel === 'online' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                      }}
                    >
                      <Globe className="w-3.5 h-3.5" />
                      Online ({wizardGatewayName || 'Gateway'})
                    </button>
                  </div>
                )}

                {paymentChannel === 'offline' ? (
                  /* ── Offline Form ── */
                  <div className="space-y-3">
                    {/* EMI Installment Selector */}
                    {isEmi && (
                      <div>
                        <label style={pmtLabelStyle}>Installment</label>
                        <select
                          value={paymentEmiSequence}
                          onChange={(e) => setPaymentEmiSequence(parseInt(e.target.value, 10))}
                          style={pmtInputStyle}
                        >
                          {Array.from({ length: wizardState.emiMonths }, (_, i) => (
                            <option key={i + 1} value={i + 1}>
                              Installment {i + 1} of {wizardState.emiMonths}
                              {i === 0 ? ' (First)' : ''}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* Amount */}
                    <div>
                      <label style={pmtLabelStyle}>Amount ({pmtCurrency})</label>
                      <input
                        type="number"
                        value={paymentAmount}
                        onChange={(e) => setPaymentAmount(e.target.value)}
                        placeholder="0.00"
                        min="0"
                        step="0.01"
                        style={pmtInputStyle}
                      />
                    </div>

                    {/* 2-col: Method + Date */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label style={pmtLabelStyle}>Payment Method</label>
                        <select
                          value={paymentMethod}
                          onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                          style={pmtInputStyle}
                        >
                          {PAYMENT_METHOD_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label style={pmtLabelStyle}>Payment Date</label>
                        <input
                          type="date"
                          value={paymentDate}
                          onChange={(e) => setPaymentDate(e.target.value)}
                          style={pmtInputStyle}
                        />
                      </div>
                    </div>

                    {/* Reference */}
                    <div>
                      <label style={pmtLabelStyle}>Reference / Transaction ID (optional)</label>
                      <input
                        type="text"
                        value={paymentReference}
                        onChange={(e) => setPaymentReference(e.target.value)}
                        placeholder="e.g. UTR number, cheque no."
                        style={pmtInputStyle}
                      />
                    </div>

                    {/* Notes */}
                    <div>
                      <label style={pmtLabelStyle}>Notes (optional)</label>
                      <textarea
                        value={paymentNotes}
                        onChange={(e) => setPaymentNotes(e.target.value)}
                        placeholder="Any additional notes..."
                        rows={2}
                        style={{ ...pmtInputStyle, resize: 'none' as const }}
                      />
                    </div>
                  </div>
                ) : (
                  /* ── Online Form ── */
                  <div className="space-y-4">
                    <div
                      className="p-4 rounded-lg text-center"
                      style={{ backgroundColor: `${colors.brand.primary}06`, border: `1px solid ${colors.brand.primary}20` }}
                    >
                      <Monitor className="w-8 h-8 mx-auto mb-2" style={{ color: colors.brand.primary }} />
                      <p className="text-xs font-semibold mb-1" style={{ color: colors.utility.primaryText }}>
                        {wizardGatewayName || 'Payment Gateway'} Checkout
                      </p>
                      <p className="text-[11px]" style={{ color: colors.utility.secondaryText }}>
                        Create contract and open {wizardGatewayName || 'payment gateway'} checkout to collect{' '}
                        <span className="font-bold" style={{ color: colors.brand.primary }}>
                          {fmtPmt(isEmi ? emiInstallmentAmount : total)}
                        </span>
                      </p>
                    </div>

                    {isEmi && (
                      <div className="flex items-center gap-2 p-2.5 rounded-lg" style={{ backgroundColor: colors.utility.secondaryBackground }}>
                        <span className="text-[10px]" style={{ color: colors.utility.secondaryText }}>
                          Collecting installment 1 of {wizardState.emiMonths}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Actions */}
                <div className="flex flex-col gap-2 mt-5">
                  {paymentChannel === 'offline' ? (
                    <button
                      onClick={handleCreateWithPayment}
                      disabled={isProcessingPayment || !paymentAmount || parseFloat(paymentAmount) <= 0}
                      className="w-full py-2.5 rounded-lg text-xs font-semibold text-white transition-all hover:opacity-90 flex items-center justify-center gap-1.5"
                      style={{
                        backgroundColor: colors.brand.primary,
                        opacity: isProcessingPayment || !paymentAmount ? 0.6 : 1,
                      }}
                    >
                      {isProcessingPayment ? (
                        <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Processing...</>
                      ) : (
                        'Record Payment & Create Contract'
                      )}
                    </button>
                  ) : (
                    <button
                      onClick={handleCreateWithOnlinePayment}
                      disabled={isProcessingPayment}
                      className="w-full py-2.5 rounded-lg text-xs font-semibold text-white transition-all hover:opacity-90 flex items-center justify-center gap-1.5"
                      style={{
                        backgroundColor: colors.brand.primary,
                        opacity: isProcessingPayment ? 0.6 : 1,
                      }}
                    >
                      {isProcessingPayment ? (
                        <><Loader2 className="w-3.5 h-3.5 animate-spin" /> {processingStep || 'Processing...'}</>
                      ) : (
                        <>
                          <Globe className="w-3.5 h-3.5" />
                          Pay Online & Create Contract
                        </>
                      )}
                    </button>
                  )}
                  <button
                    onClick={handleCreateSkipPayment}
                    disabled={isProcessingPayment}
                    className="w-full py-2 rounded-lg text-xs font-medium transition-all hover:opacity-80"
                    style={{
                      backgroundColor: colors.utility.secondaryBackground,
                      color: colors.utility.secondaryText,
                      border: `1px solid ${colors.utility.border}`,
                    }}
                  >
                    Skip — Create Without Payment
                  </button>
                  <button
                    onClick={() => setShowPrePaymentDialog(false)}
                    disabled={isProcessingPayment}
                    className="w-full py-2 rounded-lg text-xs font-medium transition-all hover:opacity-80"
                    style={{
                      color: colors.utility.secondaryText,
                    }}
                  >
                    Cancel — Back to Review
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        className="absolute inset-0 transition-opacity"
        style={{
          backgroundColor: isDarkMode
            ? 'rgba(0, 0, 0, 0.8)'
            : 'rgba(0, 0, 0, 0.5)',
        }}
        onClick={handleClose}
      />

      {/* Wizard Container */}
      <div
        className="relative z-10 w-full h-full overflow-hidden flex flex-col"
        style={{ backgroundColor: colors.utility.primaryBackground }}
      >
        {/* Header with Step Title */}
        <header
          className="px-6 py-3 border-b shrink-0"
          style={{
            backgroundColor: colors.utility.secondaryBackground,
            borderColor: `${colors.utility.primaryText}10`,
          }}
        >
          {/* Top Row: Logo, Progress Dots, Close */}
          <div className="flex items-center justify-between">
            {/* Left: Logo */}
            <div className="flex items-center gap-3">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold"
                style={{ backgroundColor: colors.brand.primary }}
              >
                CN
              </div>
              <div
                className="h-5 w-px"
                style={{ backgroundColor: `${colors.utility.primaryText}20` }}
              />
              {/* Step Title */}
              <div>
                <h2
                  className="text-sm font-bold"
                  style={{ color: colors.utility.primaryText }}
                >
                  {(() => {
                    if (showTemplateSelection) return 'Select Template';
                    if (currentStepId === 'counterparty' && !isRfqMode) {
                      const heading = COUNTERPARTY_HEADINGS[contractType] || COUNTERPARTY_HEADINGS.client;
                      return heading.title;
                    }
                    const step = activeSteps[currentStep];
                    return step?.heading.title || step?.label || '';
                  })()}
                </h2>
                <p
                  className="text-[11px]"
                  style={{ color: colors.utility.secondaryText }}
                >
                  {(() => {
                    if (showTemplateSelection) return 'Choose a template to start from';
                    if (currentStepId === 'counterparty' && !isRfqMode) {
                      const heading = COUNTERPARTY_HEADINGS[contractType] || COUNTERPARTY_HEADINGS.client;
                      return heading.subtitle;
                    }
                    const step = activeSteps[currentStep];
                    return step?.heading.subtitle || '';
                  })()}
                </p>
              </div>
            </div>

            {/* Center: Progress Dots */}
            <div className="flex items-center gap-2">
              {Array.from({ length: totalSteps }).map((_, index) => (
                <button
                  key={index}
                  onClick={() => {
                    if (index < currentStep) {
                      setCurrentStep(index);
                    }
                  }}
                  disabled={index > currentStep}
                  className="transition-all duration-300 rounded-full"
                  style={{
                    width: index === currentStep ? '32px' : '8px',
                    height: '8px',
                    backgroundColor:
                      index === currentStep
                        ? colors.brand.primary
                        : index < currentStep
                          ? colors.semantic.success
                          : `${colors.utility.primaryText}20`,
                    cursor: index < currentStep ? 'pointer' : 'default',
                  }}
                />
              ))}
            </div>

            {/* Right: Close Button */}
            <button
              onClick={handleClose}
              className="p-2 rounded-lg transition-colors hover:opacity-80"
              style={{
                backgroundColor: `${colors.utility.primaryText}10`,
                color: colors.utility.primaryText,
              }}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto pb-24">
          {renderStepContent()}
        </main>

        {/* Floating Action Island */}
        <FloatingActionIsland
          currentStep={showTemplateSelection ? 0 : currentStep}
          totalSteps={totalSteps}
          stepLabels={showTemplateSelection ? ['Select Template', ...stepLabels.slice(1)] : stepLabels}
          totalValue={calculateTotalValue()}
          currency={wizardState.currency}
          canGoBack={canGoBack}
          canGoNext={canGoNext() && !isCreating}
          isLastStep={isLastStep}
          onBack={handleBack}
          onNext={handleNext}
          onClose={handleClose}
          sendButtonText={
            isCreating
              ? 'Creating...'
              : isRfqMode
                ? 'Send RFQ'
                : wizardState.acceptanceMethod === 'auto'
                  ? 'Create Contract'
                  : 'Send Contract'
          }
          showTotal={!isRfqMode}
        />
      </div>
    </div>
  );
};

export default ContractWizard;
