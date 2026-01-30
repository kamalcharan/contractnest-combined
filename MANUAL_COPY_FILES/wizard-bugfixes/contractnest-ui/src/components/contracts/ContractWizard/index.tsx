// src/components/contracts/ContractWizard/index.tsx
// Contract Wizard - Main component with Floating Action Island
import React, { useState, useCallback } from 'react';
import { X, CheckCircle2, ArrowRight } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import FloatingActionIsland from './FloatingActionIsland';
import PathSelectionStep, { ContractPath } from './steps/PathSelectionStep';
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
  // Step 1: Counterparty
  buyerId: string | null;
  buyerName: string;
  // Step 2: Acceptance
  acceptanceMethod: 'payment' | 'signoff' | 'auto' | null;
  // Step 3: Contract Details
  contractName: string;
  status: string;
  currency: string;
  description: string;
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

// Step configuration (YourRole removed - 8 steps)
const STEP_LABELS = [
  'Choose Path',
  'Counterparty',
  'Acceptance',
  'Details',
  'Billing Cycle',
  'Add Blocks',
  'Billing View',
  'Review & Send',
];

// Step headings shown in the wizard header
const STEP_HEADINGS: Array<{ title: string; subtitle: string }> = [
  { title: 'How would you like to create your contract?', subtitle: 'Choose your starting point' },
  { title: '', subtitle: '' }, // Dynamic - set based on contractType
  { title: 'How should this contract be accepted?', subtitle: 'Choose how your buyer will confirm acceptance' },
  { title: 'Contract Details', subtitle: 'Define the basic information for your contract' },
  { title: 'Billing Cycle', subtitle: 'How should services be billed?' },
  { title: 'Add Service Blocks', subtitle: 'Select services and configure them for your contract' },
  { title: 'Billing View', subtitle: 'Review line items, pricing and apply tax' },
  { title: 'Review & Send', subtitle: 'Review your contract before sending' },
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

const TOTAL_STEPS = 8;

const ContractWizard: React.FC<ContractWizardProps> = ({
  isOpen,
  onClose,
  contractType = 'client',
  onComplete,
}) => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

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
    // Step 1: Counterparty
    buyerId: null,
    buyerName: '',
    // Step 2: Acceptance
    acceptanceMethod: null,
    // Step 3: Contract Details
    contractName: '',
    status: 'draft',
    currency: 'INR',
    description: '',
    durationValue: 1,
    durationUnit: 'months',
    gracePeriodValue: 0,
    gracePeriodUnit: 'days',
    // Step 4: Billing Cycle
    billingCycleType: null,
    // Step 5: Blocks & Total
    selectedBlocks: [],
    totalValue: 0,
    // Step 6: Billing View - Tax & Payment
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

  // Calculate total value from selected blocks
  const calculateTotalValue = useCallback(() => {
    return wizardState.selectedBlocks.reduce(
      (total, block) => total + block.totalPrice,
      0
    );
  }, [wizardState.selectedBlocks]);

  // Navigation validation
  const canGoNext = useCallback((): boolean => {
    // If showing template selection sub-step
    if (showTemplateSelection) {
      return wizardState.templateId !== null;
    }

    switch (currentStep) {
      case 0: // Path Selection
        return wizardState.path !== null;
      case 1: // Counterparty Selection
        return wizardState.buyerId !== null;
      case 2: // Acceptance Method
        return wizardState.acceptanceMethod !== null;
      case 3: // Contract Details
        return wizardState.contractName.trim() !== '' && wizardState.durationValue > 0;
      case 4: // Billing Cycle
        return wizardState.billingCycleType !== null;
      case 5: // Block Assembly
        return wizardState.selectedBlocks.length > 0;
      case 6: // Billing View
        return true;
      case 7: // Review & Send
        return true;
      default:
        return false;
    }
  }, [currentStep, wizardState, showTemplateSelection]);

  const canGoBack = currentStep > 0 || showTemplateSelection;
  const isLastStep = currentStep === TOTAL_STEPS - 1;

  // Navigation handlers
  const handleNext = useCallback(() => {
    if (isLastStep) {
      // Show success screen instead of immediately closing
      setIsContractSent(true);
    } else if (showTemplateSelection) {
      // From template selection, go to counterparty step
      setShowTemplateSelection(false);
      setCurrentStep(1);
    } else if (canGoNext()) {
      // Special handling for step 0 -> check if "From Template" was selected
      if (currentStep === 0 && wizardState.path === 'template') {
        setShowTemplateSelection(true);
      } else {
        setCurrentStep((prev) => Math.min(prev + 1, TOTAL_STEPS - 1));
      }
    }
  }, [isLastStep, canGoNext, wizardState, showTemplateSelection, currentStep]);

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
    setCurrentStep(1); // Go to Counterparty step
  }, [updateWizardState]);

  // Billing cycle type selection handler
  const handleBillingCycleTypeSelect = useCallback(
    (cycleType: BillingCycleType) => {
      updateWizardState('billingCycleType', cycleType);
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

  // Render current step content
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

    switch (currentStep) {
      case 0:
        return (
          <PathSelectionStep
            selectedPath={wizardState.path}
            onSelectPath={handlePathSelect}
          />
        );
      case 1:
        return (
          <BuyerSelectionStep
            selectedBuyerId={wizardState.buyerId}
            selectedBuyerName={wizardState.buyerName}
            onSelectBuyer={handleBuyerSelect}
            contractType={contractType}
          />
        );
      case 2:
        return (
          <AcceptanceMethodStep
            selectedMethod={wizardState.acceptanceMethod}
            onSelectMethod={handleAcceptanceMethodSelect}
          />
        );
      case 3:
        return (
          <ContractDetailsStep
            data={{
              contractName: wizardState.contractName,
              status: wizardState.status,
              currency: wizardState.currency,
              description: wizardState.description,
              durationValue: wizardState.durationValue,
              durationUnit: wizardState.durationUnit,
              gracePeriodValue: wizardState.gracePeriodValue,
              gracePeriodUnit: wizardState.gracePeriodUnit,
            }}
            onChange={handleDetailsChange}
          />
        );
      case 4:
        return (
          <BillingCycleStep
            selectedCycleType={wizardState.billingCycleType}
            onSelectCycleType={handleBillingCycleTypeSelect}
          />
        );
      case 5: {
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
            contractName={wizardState.contractName || 'New Contract'}
            contractStatus={wizardState.status}
            contractDuration={durationInMonths}
            contractStartDate={new Date()}
            selectedBuyer={wizardState.buyerId ? {
              id: wizardState.buyerId,
              contact_type: 'individual',
              name: wizardState.buyerName,
            } : undefined}
          />
        );
      }
      case 6: {
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
      case 7:
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
              Contract Sent!
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
                {wizardState.contractName || 'Your contract'}
              </strong>
              {' '}has been sent to{' '}
              <strong style={{ color: colors.brand.primary }}>
                {wizardState.buyerName || `your ${COUNTERPARTY_LABEL[contractType] || 'counterparty'}`}
              </strong>
              {' '}for review.
            </p>

            {/* Acceptance method note */}
            <p
              className="text-xs mb-8"
              style={{
                color: colors.utility.secondaryText,
                animation: 'fadeInUp 0.5s ease-out 0.6s both',
              }}
            >
              {wizardState.acceptanceMethod === 'signoff'
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
                    const heading = currentStep === 1
                      ? COUNTERPARTY_HEADINGS[contractType] || COUNTERPARTY_HEADINGS.client
                      : STEP_HEADINGS[currentStep];
                    return heading?.title || STEP_LABELS[currentStep];
                  })()}
                </h2>
                <p
                  className="text-[11px]"
                  style={{ color: colors.utility.secondaryText }}
                >
                  {(() => {
                    if (showTemplateSelection) return 'Choose a template to start from';
                    const heading = currentStep === 1
                      ? COUNTERPARTY_HEADINGS[contractType] || COUNTERPARTY_HEADINGS.client
                      : STEP_HEADINGS[currentStep];
                    return heading?.subtitle || '';
                  })()}
                </p>
              </div>
            </div>

            {/* Center: Progress Dots */}
            <div className="flex items-center gap-2">
              {Array.from({ length: TOTAL_STEPS }).map((_, index) => (
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
          totalSteps={TOTAL_STEPS}
          stepLabels={showTemplateSelection ? ['Select Template', ...STEP_LABELS.slice(1)] : STEP_LABELS}
          totalValue={calculateTotalValue()}
          currency={wizardState.currency}
          canGoBack={canGoBack}
          canGoNext={canGoNext()}
          isLastStep={isLastStep}
          onBack={handleBack}
          onNext={handleNext}
          onClose={onClose}
        />
      </div>
    </div>
  );
};

export default ContractWizard;
