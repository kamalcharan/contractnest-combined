// src/components/contracts/ContractWizard/index.tsx
// Contract Wizard - Main component with Floating Action Island
import React, { useState, useCallback } from 'react';
import { X, CheckCircle2, ArrowRight, Loader2 } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { useContractOperations } from '@/hooks/queries/useContractQueries';
import type { CreateContractRequest } from '@/types/contracts';
import FloatingActionIsland from './FloatingActionIsland';
import PathSelectionStep, { ContractPath, WizardMode } from './steps/PathSelectionStep';
import TemplateSelectionStep from './steps/TemplateSelectionStep';
import BuyerSelectionStep from './steps/BuyerSelectionStep';
import AcceptanceMethodStep, { AcceptanceMethod } from './steps/AcceptanceMethodStep';
import ContractDetailsStep, { ContractDetailsData } from './steps/ContractDetailsStep';
import ServiceBlocksStep from './steps/ServiceBlocksStep';
import BillingCycleStep, { BillingCycleType } from './steps/BillingCycleStep';
import BillingViewStep from './steps/BillingViewStep';
import ReviewSendStep from './steps/ReviewSendStep';
import { ConfigurableBlock } from '@/components/catalog-studio';

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
  paymentMode: 'prepaid' | 'emi';
  emiMonths: number;
  perBlockPaymentType: Record<string, 'prepaid' | 'postpaid'>;
}

interface ContractWizardProps {
  isOpen: boolean;
  onClose: () => void;
  contractType?: ContractType;
  onComplete?: (contractData: ContractWizardState) => void;
}

// Step ID type for step-based routing
type StepId = 'path' | 'counterparty' | 'acceptance' | 'details' | 'billingCycle' | 'blocks' | 'billingView' | 'review';

interface StepConfig {
  id: StepId;
  label: string;
  heading: { title: string; subtitle: string };
}

// Contract flow: 8 steps (full flow) — acceptance before counterparty
const CONTRACT_STEPS: StepConfig[] = [
  { id: 'path', label: 'Choose Path', heading: { title: 'How would you like to create your contract?', subtitle: 'Choose your starting point' } },
  { id: 'acceptance', label: 'Acceptance', heading: { title: 'How should this contract be accepted?', subtitle: 'Choose how your buyer will confirm acceptance' } },
  { id: 'counterparty', label: 'Counterparty', heading: { title: '', subtitle: '' } }, // Dynamic based on contractType
  { id: 'details', label: 'Details', heading: { title: 'Contract Details', subtitle: 'Define the basic information for your contract' } },
  { id: 'billingCycle', label: 'Billing Cycle', heading: { title: 'Billing Cycle', subtitle: 'How should services be billed?' } },
  { id: 'blocks', label: 'Add Blocks', heading: { title: 'Add Service Blocks', subtitle: 'Select services and configure them for your contract' } },
  { id: 'billingView', label: 'Billing View', heading: { title: 'Billing View', subtitle: 'Review line items, pricing and apply tax' } },
  { id: 'review', label: 'Review & Send', heading: { title: 'Review & Send', subtitle: 'Review your contract before sending' } },
];

// RFQ flow: 5 steps (no acceptance, no billing cycle, no billing view)
const RFQ_STEPS: StepConfig[] = [
  { id: 'path', label: 'Choose Path', heading: { title: 'What would you like to create?', subtitle: 'Choose your starting point' } },
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

// UUID check for fly-by block detection
const isValidUUID = (id: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

// Map wizard state to API request payload (matches deployed DB RPC schema)
function mapWizardToRequest(
  state: ContractWizardState,
  contractType: ContractType
): Record<string, any> {
  // Map acceptance method to API-compatible value
  const apiAcceptanceMethod = state.acceptanceMethod
    ? ACCEPTANCE_METHOD_API_MAP[state.acceptanceMethod] || state.acceptanceMethod
    : undefined;

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
    total_value: state.totalValue,
    selected_tax_rate_ids: state.selectedTaxRateIds,

    // Related entities
    blocks,
    vendors,
  };
}

const ContractWizard: React.FC<ContractWizardProps> = ({
  isOpen,
  onClose,
  contractType = 'client',
  onComplete,
}) => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  // API mutation
  const { createContract, isCreating } = useContractOperations();

  // Current step state
  const [currentStep, setCurrentStep] = useState(0);

  // Sub-step for template selection (shown after choosing "From Template")
  const [showTemplateSelection, setShowTemplateSelection] = useState(false);

  // Success screen state
  const [isContractSent, setIsContractSent] = useState(false);

  // Wizard data state
  const [wizardState, setWizardState] = useState<ContractWizardState>({
    path: null,
    templateId: null,
    role: null,
    wizardMode: 'contract',
    // Counterparty
    buyerId: null,
    buyerName: '',
    vendorIds: [],
    vendorNames: [],
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
    paymentMode: 'prepaid',
    emiMonths: 6,
    perBlockPaymentType: {},
  });

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
      // Final step — call API to create the contract
      try {
        const request = mapWizardToRequest(wizardState, contractType);
        await createContract(request as CreateContractRequest);
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
      } else {
        setCurrentStep((prev) => Math.min(prev + 1, totalSteps - 1));
      }
    }
  }, [isLastStep, canGoNext, wizardState, showTemplateSelection, currentStepId, totalSteps, contractType, createContract]);

  // Done button handler on success screen
  const handleDone = useCallback(() => {
    onComplete?.(wizardState);
    setIsContractSent(false);
    onClose();
  }, [wizardState, onComplete, onClose]);

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

  // Payment mode change handler
  const handlePaymentModeChange = useCallback(
    (mode: 'prepaid' | 'emi') => {
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
          />
        );
      default:
        return null;
    }
  };

  // Success screen - rendered before the !isOpen guard so it stays visible
  if (isContractSent) {
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
          className="relative z-10 w-full h-full flex items-center justify-center"
          style={{ backgroundColor: colors.utility.primaryBackground }}
        >
          <div className="text-center max-w-md px-6">
            {/* Animated Checkmark */}
            <div className="mb-8 flex justify-center">
              <div
                className="relative w-28 h-28 rounded-full flex items-center justify-center"
                style={{
                  background: `linear-gradient(135deg, ${colors.semantic.success}20, ${colors.semantic.success}08)`,
                  animation: 'scaleIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
                }}
              >
                {/* Outer ring */}
                <div
                  className="absolute inset-0 rounded-full border-2"
                  style={{
                    borderColor: colors.semantic.success,
                    animation: 'ringPulse 2s ease-in-out infinite',
                  }}
                />
                {/* Inner checkmark circle */}
                <div
                  className="w-20 h-20 rounded-full flex items-center justify-center"
                  style={{
                    backgroundColor: colors.semantic.success,
                    animation: 'scaleIn 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) 0.2s both',
                  }}
                >
                  <CheckCircle2 className="w-10 h-10 text-white" />
                </div>
              </div>
            </div>

            {/* Title */}
            <h2
              className="text-2xl font-bold mb-3"
              style={{
                color: colors.utility.primaryText,
                animation: 'fadeInUp 0.5s ease-out 0.4s both',
              }}
            >
              {isRfqMode ? 'RFQ Sent!' : 'Contract Sent!'}
            </h2>

            {/* Description */}
            <p
              className="text-sm mb-2"
              style={{
                color: colors.utility.secondaryText,
                animation: 'fadeInUp 0.5s ease-out 0.5s both',
              }}
            >
              <strong style={{ color: colors.utility.primaryText }}>
                {wizardState.contractName || (isRfqMode ? 'Your RFQ' : 'Your contract')}
              </strong>
              {isRfqMode ? (
                <>
                  {' '}has been sent to{' '}
                  <strong style={{ color: colors.brand.primary }}>
                    {wizardState.vendorNames.length > 0
                      ? `${wizardState.vendorNames.length} vendor${wizardState.vendorNames.length > 1 ? 's' : ''}`
                      : 'your vendors'}
                  </strong>
                  {' '}for quotation.
                </>
              ) : (
                <>
                  {' '}has been sent to{' '}
                  <strong style={{ color: colors.brand.primary }}>
                    {wizardState.buyerName || `your ${COUNTERPARTY_LABEL[contractType] || 'counterparty'}`}
                  </strong>
                  {' '}for review.
                </>
              )}
            </p>

            {/* Acceptance method note (contracts only) / RFQ note */}
            <p
              className="text-xs mb-8"
              style={{
                color: colors.utility.secondaryText,
                animation: 'fadeInUp 0.5s ease-out 0.6s both',
              }}
            >
              {isRfqMode
                ? 'Vendors will be notified and can submit their quotations.'
                : wizardState.acceptanceMethod === 'signoff'
                  ? 'They will need to sign off to accept the contract.'
                  : wizardState.acceptanceMethod === 'payment'
                    ? 'The contract will be accepted once payment is completed.'
                    : 'The contract will be auto-accepted.'}
            </p>

            {/* Done Button */}
            <button
              onClick={handleDone}
              className="inline-flex items-center gap-2 px-8 py-3 rounded-xl text-white font-semibold transition-all hover:opacity-90 hover:shadow-lg"
              style={{
                backgroundColor: colors.brand.primary,
                animation: 'fadeInUp 0.5s ease-out 0.7s both',
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
        onClick={onClose}
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
              onClick={onClose}
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
          onClose={onClose}
          sendButtonText={isCreating ? 'Creating...' : isRfqMode ? 'Send RFQ' : undefined}
          showTotal={!isRfqMode}
        />
      </div>
    </div>
  );
};

export default ContractWizard;
