// src/components/contracts/ContractWizard/index.tsx
// Contract Wizard - Main component with Floating Action Island
import React, { useState, useCallback } from 'react';
import { X } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import FloatingActionIsland from './FloatingActionIsland';
import PathSelectionStep, { ContractPath } from './steps/PathSelectionStep';
import TemplateSelectionStep from './steps/TemplateSelectionStep';

// Wizard State Types
export interface ContractWizardState {
  path: ContractPath;
  templateId: string | null;
  buyerId: string | null;
  buyerName: string;
  acceptanceMethod: 'payment' | 'signoff' | 'auto' | null;
  contractName: string;
  duration: number;
  currency: string;
  description: string;
  selectedBlocks: SelectedBlock[];
  totalValue: number;
}

export interface SelectedBlock {
  id: string;
  name: string;
  quantity: number;
  cycle: number;
  unlimited: boolean;
  price: number;
  totalPrice: number;
}

interface ContractWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete?: (contractData: ContractWizardState) => void;
}

// Step configuration
const STEP_LABELS = [
  'Choose Path',
  'Select Buyer',
  'Acceptance',
  'Details',
  'Add Blocks',
  'Review & Send',
];

const TOTAL_STEPS = 6;

const ContractWizard: React.FC<ContractWizardProps> = ({
  isOpen,
  onClose,
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
    buyerId: null,
    buyerName: '',
    acceptanceMethod: null,
    contractName: '',
    duration: 12,
    currency: 'USD',
    description: '',
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
      case 1: // Buyer Selection
        return wizardState.buyerId !== null;
      case 2: // Acceptance Method
        return wizardState.acceptanceMethod !== null;
      case 3: // Base Details
        return wizardState.contractName.trim() !== '' && wizardState.duration > 0;
      case 4: // Block Assembly
        return wizardState.selectedBlocks.length > 0;
      case 5: // Review
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
    setCurrentStep(1); // Go to buyer selection
  }, [updateWizardState]);

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
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
              <h2
                className="text-xl font-semibold mb-2"
                style={{ color: colors.utility.primaryText }}
              >
                Select Buyer
              </h2>
              <p style={{ color: colors.utility.secondaryText }}>
                Step 2 - Buyer selection will be implemented here
              </p>
            </div>
          </div>
        );
      case 2:
        return (
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
              <h2
                className="text-xl font-semibold mb-2"
                style={{ color: colors.utility.primaryText }}
              >
                Acceptance Method
              </h2>
              <p style={{ color: colors.utility.secondaryText }}>
                Step 3 - Acceptance options will be implemented here
              </p>
            </div>
          </div>
        );
      case 3:
        return (
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
              <h2
                className="text-xl font-semibold mb-2"
                style={{ color: colors.utility.primaryText }}
              >
                Contract Details
              </h2>
              <p style={{ color: colors.utility.secondaryText }}>
                Step 4 - Base details will be implemented here
              </p>
            </div>
          </div>
        );
      case 4:
        return (
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
              <h2
                className="text-xl font-semibold mb-2"
                style={{ color: colors.utility.primaryText }}
              >
                Add Service Blocks
              </h2>
              <p style={{ color: colors.utility.secondaryText }}>
                Step 5 - Block assembly will be implemented here
              </p>
            </div>
          </div>
        );
      case 5:
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
                Step 6 - Review and send will be implemented here
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
