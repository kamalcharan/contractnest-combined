// src/components/contracts/ContractWizard/index.tsx
// Contract Wizard - Main component with Floating Action Island
import React, { useState, useCallback } from 'react';
import Lottie from 'lottie-react';
import { X, ArrowRight } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { useContactList } from '@/hooks/useContacts';
import FloatingActionIsland from './FloatingActionIsland';
import PathSelectionStep, { ContractPath } from './steps/PathSelectionStep';
import TemplateSelectionStep from './steps/TemplateSelectionStep';
import YourRoleStep, { ContractRole } from './steps/YourRoleStep';
import BuyerSelectionStep from './steps/BuyerSelectionStep';
import AcceptanceMethodStep, { AcceptanceMethod } from './steps/AcceptanceMethodStep';
import ContractDetailsStep, { ContractDetailsData } from './steps/ContractDetailsStep';
import ServiceBlocksStep from './steps/ServiceBlocksStep';
import BillingCycleStep, { BillingCycleType } from './steps/BillingCycleStep';
import BillingViewStep from './steps/BillingViewStep';
import ReviewSendStep from './steps/ReviewSendStep';
import { ConfigurableBlock } from '@/components/catalog-studio';

// Re-export ConfigurableBlock as SelectedBlock for backwards compatibility
export type SelectedBlock = ConfigurableBlock;

// Contract type definition
export type ContractType = 'client' | 'vendor' | 'partner';

// Wizard State Types
export interface ContractWizardState {
  path: ContractPath;
  templateId: string | null;
  // Step 1: Your Role
  role: ContractRole;
  // Step 2: Counterparty
  buyerId: string | null;
  buyerName: string;
  // Step 3: Acceptance
  acceptanceMethod: 'payment' | 'signoff' | 'auto' | null;
  // Step 4: Contract Details
  contractName: string;
  status: string;
  currency: string;
  description: string;
  durationValue: number;
  durationUnit: string;
  gracePeriodValue: number;
  gracePeriodUnit: string;
  // Step 5: Billing Cycle
  billingCycleType: BillingCycleType;
  // Step 6: Blocks & Total
  selectedBlocks: SelectedBlock[];
  totalValue: number;
  // Step 7: Billing View - Tax & Payment
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

// Step configuration
const STEP_LABELS = [
  'Choose Path',
  'Your Role',
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
  { title: 'Your Role', subtitle: 'Who are you in this contract?' },
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

const TOTAL_STEPS = 9;

// ─── Lottie: Contract Sent animation ──────────────────────────────
// Circle bounce-in with checkmark reveal + expanding pulse ring
const contractSentAnimation = {
  v: '5.7.4',
  fr: 30,
  ip: 0,
  op: 75,
  w: 200,
  h: 200,
  nm: 'Contract Sent',
  ddd: 0,
  assets: [],
  layers: [
    // Expanding pulse ring
    {
      ddd: 0, ind: 1, ty: 4, nm: 'Pulse', sr: 1,
      ks: {
        o: { a: 1, k: [{ t: 10, s: [50], e: [0] }, { t: 45, s: [0] }] },
        r: { a: 0, k: 0 },
        p: { a: 0, k: [100, 100, 0] },
        a: { a: 0, k: [0, 0, 0] },
        s: { a: 1, k: [{ t: 10, s: [80, 80, 100], e: [170, 170, 100] }, { t: 45, s: [170, 170, 100] }] },
      },
      shapes: [
        { ty: 'el', p: { a: 0, k: [0, 0] }, s: { a: 0, k: [80, 80] } },
        { ty: 'st', c: { a: 0, k: [0.96, 0.62, 0.04, 1] }, o: { a: 0, k: 100 }, w: { a: 0, k: 2 } },
      ],
    },
    // Main circle with bounce
    {
      ddd: 0, ind: 2, ty: 4, nm: 'Circle', sr: 1,
      ks: {
        o: { a: 0, k: 100 },
        r: { a: 0, k: 0 },
        p: { a: 0, k: [100, 100, 0] },
        a: { a: 0, k: [0, 0, 0] },
        s: { a: 1, k: [
          { t: 0, s: [0, 0, 100], e: [115, 115, 100] },
          { t: 12, s: [115, 115, 100], e: [95, 95, 100] },
          { t: 18, s: [95, 95, 100], e: [100, 100, 100] },
          { t: 22, s: [100, 100, 100] },
        ] },
      },
      shapes: [
        { ty: 'el', p: { a: 0, k: [0, 0] }, s: { a: 0, k: [80, 80] } },
        { ty: 'fl', c: { a: 0, k: [0.96, 0.62, 0.04, 1] }, o: { a: 0, k: 100 } },
      ],
    },
    // Checkmark
    {
      ddd: 0, ind: 3, ty: 4, nm: 'Check', sr: 1,
      ks: {
        o: { a: 1, k: [{ t: 18, s: [0], e: [100] }, { t: 24, s: [100] }] },
        r: { a: 0, k: 0 },
        p: { a: 0, k: [100, 100, 0] },
        a: { a: 0, k: [0, 0, 0] },
        s: { a: 1, k: [
          { t: 18, s: [0, 0, 100], e: [110, 110, 100] },
          { t: 26, s: [110, 110, 100], e: [100, 100, 100] },
          { t: 30, s: [100, 100, 100] },
        ] },
      },
      shapes: [
        {
          ty: 'gr',
          it: [
            {
              ty: 'sh',
              ks: { a: 0, k: {
                c: false,
                v: [[-18, 0], [-6, 12], [18, -12]],
                i: [[0, 0], [0, 0], [0, 0]],
                o: [[0, 0], [0, 0], [0, 0]],
              } },
            },
            { ty: 'st', c: { a: 0, k: [1, 1, 1, 1] }, o: { a: 0, k: 100 }, w: { a: 0, k: 4 }, lc: 2, lj: 2 },
            { ty: 'tr', p: { a: 0, k: [0, 0] }, a: { a: 0, k: [0, 0] }, s: { a: 0, k: [100, 100] }, r: { a: 0, k: 0 }, o: { a: 0, k: 100 } },
          ],
        },
      ],
    },
  ],
};

const ContractWizard: React.FC<ContractWizardProps> = ({
  isOpen,
  onClose,
  contractType = 'client',
  onComplete,
}) => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  // Prefetch contacts on wizard open — warms in-memory cache (5-min TTL)
  // so Step 2 (Counterparty) loads instantly without a spinner.
  // Works for client, vendor, and partner flows.
  useContactList({
    page: 1,
    limit: 20,
    classifications: [contractType],
    status: 'active',
    sort_by: 'created_at',
    sort_order: 'desc',
    enabled: isOpen,
  });

  // Current step state
  const [currentStep, setCurrentStep] = useState(0);

  // Contract sent confirmation screen (signoff flow)
  const [isContractSent, setIsContractSent] = useState(false);

  // Sub-step for template selection (shown after choosing "From Template")
  const [showTemplateSelection, setShowTemplateSelection] = useState(false);

  // Wizard data state
  const [wizardState, setWizardState] = useState<ContractWizardState>({
    path: null,
    templateId: null,
    // Step 1: Your Role
    role: null,
    // Step 2: Counterparty
    buyerId: null,
    buyerName: '',
    // Step 3: Acceptance
    acceptanceMethod: null,
    // Step 4: Contract Details
    contractName: '',
    status: 'draft',
    currency: 'INR', // Default to INR
    description: '',
    durationValue: 1,
    durationUnit: 'months',
    gracePeriodValue: 0,
    gracePeriodUnit: 'days',
    // Step 5: Billing Cycle
    billingCycleType: null,
    // Step 6: Blocks & Total
    selectedBlocks: [],
    totalValue: 0,
    // Step 7: Billing View - Tax & Payment
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
      // Can only proceed if a template is selected OR they click "switch to scratch"
      return wizardState.templateId !== null;
    }

    switch (currentStep) {
      case 0: // Path Selection
        return wizardState.path !== null;
      case 1: // Your Role
        return wizardState.role !== null;
      case 2: // Counterparty Selection
        return wizardState.buyerId !== null;
      case 3: // Acceptance Method
        return wizardState.acceptanceMethod !== null;
      case 4: // Contract Details
        return wizardState.contractName.trim() !== '' && wizardState.durationValue > 0;
      case 5: // Billing Cycle
        return wizardState.billingCycleType !== null;
      case 6: // Block Assembly
        return wizardState.selectedBlocks.length > 0;
      case 7: // Billing View
        return true; // Can always proceed (tax is optional)
      case 8: // Review & Send
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
      onComplete?.(wizardState);
      if (wizardState.acceptanceMethod === 'signoff') {
        // Show animated confirmation screen before closing
        setIsContractSent(true);
      } else {
        onClose();
      }
    } else if (showTemplateSelection) {
      // From template selection, go to buyer step
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
  }, [isLastStep, canGoNext, wizardState, onComplete, onClose, showTemplateSelection, currentStep]);

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
    setCurrentStep(1); // Go to Your Role step
  }, [updateWizardState]);

  // Role selection handler
  const handleRoleSelect = useCallback(
    (role: ContractRole) => {
      updateWizardState('role', role);
    },
    [updateWizardState]
  );

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
          <YourRoleStep
            selectedRole={wizardState.role}
            onSelectRole={handleRoleSelect}
          />
        );
      case 2:
        return (
          <BuyerSelectionStep
            selectedBuyerId={wizardState.buyerId}
            selectedBuyerName={wizardState.buyerName}
            onSelectBuyer={handleBuyerSelect}
            contractType={contractType}
          />
        );
      case 3:
        return (
          <AcceptanceMethodStep
            selectedMethod={wizardState.acceptanceMethod}
            onSelectMethod={handleAcceptanceMethodSelect}
          />
        );
      case 4:
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
      case 5:
        return (
          <BillingCycleStep
            selectedCycleType={wizardState.billingCycleType}
            onSelectCycleType={handleBillingCycleTypeSelect}
          />
        );
      case 6: {
        // Calculate contract duration in months
        const durationInMonths = wizardState.durationUnit === 'months'
          ? wizardState.durationValue
          : wizardState.durationUnit === 'years'
            ? wizardState.durationValue * 12
            : Math.ceil(wizardState.durationValue / 30); // days to months

        return (
          <ServiceBlocksStep
            selectedBlocks={wizardState.selectedBlocks}
            currency={wizardState.currency}
            onBlocksChange={handleBlocksChange}
            contractName={wizardState.contractName || 'New Contract'}
            contractStatus={wizardState.status}
            contractDuration={durationInMonths}
            contractStartDate={new Date()}
            // Buyer info - create a minimal buyer object from wizard state
            selectedBuyer={wizardState.buyerId ? {
              id: wizardState.buyerId,
              contact_type: 'individual',
              name: wizardState.buyerName,
            } : undefined}
          />
        );
      }
      case 7: {
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
      case 8:
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

  if (!isOpen) return null;

  // ─── Contract Sent Confirmation Screen ───
  if (isContractSent) {
    return (
      <div className="fixed inset-0 z-50">
        <div
          className="absolute inset-0"
          style={{ backgroundColor: isDarkMode ? 'rgba(0,0,0,0.8)' : 'rgba(0,0,0,0.5)' }}
        />
        <div
          className="relative z-10 w-full h-full flex flex-col items-center justify-center"
          style={{ backgroundColor: colors.utility.primaryBackground }}
        >
          {/* Lottie animation */}
          <Lottie
            animationData={contractSentAnimation}
            loop={false}
            style={{
              width: 160,
              height: 160,
              filter: isDarkMode ? 'brightness(1.1)' : 'none',
            }}
          />

          <h2
            className="text-2xl font-bold mt-6 mb-3"
            style={{ color: colors.utility.primaryText }}
          >
            Contract Sent!
          </h2>
          <p
            className="text-sm max-w-md text-center leading-relaxed mb-2"
            style={{ color: colors.utility.secondaryText }}
          >
            Your contract <b style={{ color: colors.utility.primaryText }}>{wizardState.contractName || 'Untitled'}</b> has
            been sent to <b style={{ color: colors.brand.primary }}>{wizardState.buyerName || 'the customer'}</b> for review.
          </p>
          <p
            className="text-xs mb-8"
            style={{ color: colors.utility.secondaryText }}
          >
            You will be notified once they respond.
          </p>

          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 shadow-lg"
            style={{ backgroundColor: colors.brand.primary }}
          >
            Done
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  // ─── Normal Wizard UI ───
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
                    const heading = currentStep === 2
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
                    const heading = currentStep === 2
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
