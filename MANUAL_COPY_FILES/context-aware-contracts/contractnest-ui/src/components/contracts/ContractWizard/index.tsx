// src/components/contracts/ContractWizard/index.tsx
// Contract Wizard - Main component with Floating Action Island
import React, { useState, useCallback } from 'react';
import { X } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import FloatingActionIsland from './FloatingActionIsland';
import PathSelectionStep, { ContractPath } from './steps/PathSelectionStep';
import TemplateSelectionStep from './steps/TemplateSelectionStep';
import YourRoleStep, { ContractRole } from './steps/YourRoleStep';
import BuyerSelectionStep from './steps/BuyerSelectionStep';
import AcceptanceMethodStep, { AcceptanceMethod } from './steps/AcceptanceMethodStep';
import ContractDetailsStep, { ContractDetailsData } from './steps/ContractDetailsStep';
import ServiceBlocksStep from './steps/ServiceBlocksStep';
import BillingCycleStep, { BillingCycleType } from './steps/BillingCycleStep';
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
  'Review & Send',
];

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
      // Complete the wizard
      onComplete?.(wizardState);
      onClose();
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
      case 6:
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
      case 7:
        return (
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
              <h2
                className="text-xl font-semibold mb-2"
                style={{ color: colors.utility.primaryText }}
              >
                Review & Send
              </h2>
              <p style={{ color: colors.utility.secondaryText }}>
                Step 8 - Review and send will be implemented here
              </p>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

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
        {/* Header */}
        <header
          className="flex items-center justify-between px-6 py-4 border-b shrink-0"
          style={{
            backgroundColor: colors.utility.secondaryBackground,
            borderColor: `${colors.utility.primaryText}10`,
          }}
        >
          {/* Left: Logo & Contract Type */}
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
            <span
              className="text-sm font-medium"
              style={{ color: colors.utility.secondaryText }}
            >
              {showTemplateSelection
                ? 'Select Template'
                : wizardState.path === 'template'
                  ? 'From Template'
                  : wizardState.path === 'scratch'
                    ? 'Custom Contract'
                    : 'New Contract'}
            </span>
          </div>

          {/* Center: Progress Dots */}
          <div className="flex items-center gap-2">
            {Array.from({ length: TOTAL_STEPS }).map((_, index) => (
              <button
                key={index}
                onClick={() => {
                  // Only allow going back to completed steps
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
