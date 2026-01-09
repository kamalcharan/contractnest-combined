// src/components/catalog-studio/BlockWizard/BlockWizardContent.tsx
// Embeddable wizard content (no modal wrapper) for use in full page layouts
// Phase 4: Full Page Wizard
// Updated: Use BusinessRulesStep for step 6 instead of RulesStep

import React, { useState, useEffect } from 'react';
import { useTheme } from '../../../contexts/ThemeContext';
import { Block, WizardMode, BlockCategory } from '../../../types/catalogStudio';
import { BLOCK_CATEGORIES, WIZARD_STEPS } from '../../../utils/catalog-studio';
import WizardProgress from './WizardProgress';
import WizardFooter from './WizardFooter';
import {
  TypeSelectionStep,
  BasicInfoStep,
  // Service steps
  DeliveryStep,
  PricingStep,
  EvidenceStep,
  // RulesStep, // HIDDEN: Replaced by BusinessRulesStep
  // Spare Parts steps
  InventoryStep,
  FulfillmentStep,
  // Billing steps
  StructureStep,
  ScheduleStep,
  AutomationStep,
  // Content steps
  ContentStep,
  ContentSettingsStep,
  // Media steps
  MediaStep,
  ImageUploadStep,
  DisplaySettingsStep,
  // Checklist steps
  ItemsStep,
  ChecklistSettingsStep,
  // Document steps
  FileSettingsStep,
} from './steps';

// Import BusinessRulesStep for step 6
import BusinessRulesStep from './steps/service/BusinessRulesStep';

// =================================================================
// TYPES
// =================================================================

export interface BlockWizardContentProps {
  mode: WizardMode;
  blockType: string;
  editingBlock?: Block | null;
  initialStep?: number;
  categories?: BlockCategory[];
  showTypeSelection?: boolean;
  onSave: (block: Partial<Block>) => void;
  onCancel: () => void;
  onBlockTypeChange: (type: string) => void;
  onStepChange?: (step: number) => void;
  onFormDataChange?: (data: Partial<Block>) => void;
}

// =================================================================
// COMPONENT
// =================================================================

const BlockWizardContent: React.FC<BlockWizardContentProps> = ({
  mode,
  blockType,
  editingBlock,
  initialStep = 1,
  categories = BLOCK_CATEGORIES,
  showTypeSelection = true,
  onSave,
  onCancel,
  onBlockTypeChange,
  onStepChange,
  onFormDataChange,
}) => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  const [currentStep, setCurrentStep] = useState(initialStep);
  const [formData, setFormData] = useState<Partial<Block>>(editingBlock || {});

  // Get wizard steps based on block type
  const wizardSteps = WIZARD_STEPS[blockType] || WIZARD_STEPS.service;

  // Adjust steps if type selection is hidden (skip step 1)
  const effectiveSteps = showTypeSelection
    ? wizardSteps
    : wizardSteps.filter(s => s.id !== 1);

  const totalSteps = wizardSteps.length;

  // Sync initial step
  useEffect(() => {
    if (initialStep !== currentStep) {
      setCurrentStep(initialStep);
    }
  }, [initialStep]);

  // Sync editing block
  useEffect(() => {
    if (editingBlock) {
      setFormData(editingBlock);
    }
  }, [editingBlock]);

  // Notify parent of step changes
  useEffect(() => {
    onStepChange?.(currentStep);
  }, [currentStep, onStepChange]);

  // Notify parent of form data changes
  useEffect(() => {
    onFormDataChange?.(formData);
  }, [formData, onFormDataChange]);

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    } else {
      onSave(formData);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    } else {
      onCancel();
    }
  };

  const handleSaveDraft = () => {
    console.log('Saving draft:', formData);
    // Could emit an onSaveDraft event here
  };

  const handleFormChange = (field: string, value: unknown) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleTypeChange = (type: string) => {
    onBlockTypeChange(type);
    // Don't reset step when changing type in full page mode
    // The parent component controls navigation
  };

  const handleStepClick = (stepId: number) => {
    // Allow direct navigation to steps (for full page mode)
    if (stepId <= currentStep || mode === 'edit') {
      setCurrentStep(stepId);
    }
  };

  const renderStepContent = () => {
    // Step 1 - Type Selection (common for all, optional)
    if (currentStep === 1 && showTypeSelection) {
      return (
        <TypeSelectionStep
          categories={categories}
          selectedType={blockType}
          onSelectType={handleTypeChange}
        />
      );
    }

    // Step 2 - Basic Info (common for all)
    if (currentStep === 2 || (currentStep === 1 && !showTypeSelection)) {
      return (
        <BasicInfoStep
          blockType={blockType}
          formData={formData}
          onChange={handleFormChange}
        />
      );
    }

    // Block-specific steps (step 3+)
    switch (blockType) {
      case 'service':
        switch (currentStep) {
          case 3: return <DeliveryStep formData={formData} onChange={handleFormChange} />;
          case 4: return <PricingStep formData={formData} onChange={handleFormChange} />;
          case 5: return <EvidenceStep formData={formData} onChange={handleFormChange} />;
          // Step 6: Use BusinessRulesStep instead of RulesStep
          case 6: return <BusinessRulesStep formData={formData} onChange={handleFormChange} />;
        }
        break;

      case 'spare':
        switch (currentStep) {
          case 3: return <InventoryStep formData={formData} onChange={handleFormChange} />;
          case 4: return <FulfillmentStep formData={formData} onChange={handleFormChange} />;
        }
        break;

      case 'billing':
        switch (currentStep) {
          case 3: return <StructureStep formData={formData} onChange={handleFormChange} />;
          case 4: return <ScheduleStep formData={formData} onChange={handleFormChange} />;
          case 5: return <AutomationStep formData={formData} onChange={handleFormChange} />;
        }
        break;

      case 'text':
        switch (currentStep) {
          case 3: return <ContentStep formData={formData} onChange={handleFormChange} />;
          case 4: return <ContentSettingsStep formData={formData} onChange={handleFormChange} />;
        }
        break;

      case 'video':
        switch (currentStep) {
          case 3: return <MediaStep formData={formData} onChange={handleFormChange} />;
          case 4: return <DisplaySettingsStep formData={formData} onChange={handleFormChange} />;
        }
        break;

      case 'image':
        switch (currentStep) {
          case 3: return <ImageUploadStep formData={formData} onChange={handleFormChange} />;
          case 4: return <DisplaySettingsStep formData={formData} onChange={handleFormChange} />;
        }
        break;

      case 'checklist':
        switch (currentStep) {
          case 3: return <ItemsStep formData={formData} onChange={handleFormChange} />;
          case 4: return <ChecklistSettingsStep formData={formData} onChange={handleFormChange} />;
        }
        break;

      case 'document':
        switch (currentStep) {
          case 3: return <FileSettingsStep formData={formData} onChange={handleFormChange} />;
        }
        break;
    }

    // Fallback for any unhandled steps
    const stepLabel = wizardSteps.find((s) => s.id === currentStep)?.label || 'Configuration';
    return (
      <div className="animate-in fade-in slide-in-from-right-4 duration-200">
        <h2 className="text-lg font-bold mb-1" style={{ color: colors.utility.primaryText }}>
          {stepLabel}
        </h2>
        <p className="text-sm mb-6" style={{ color: colors.utility.secondaryText }}>
          Configure settings for this block.
        </p>
        <div
          className="p-8 border-2 border-dashed rounded-xl text-center"
          style={{ borderColor: isDarkMode ? colors.utility.secondaryBackground : '#D1D5DB' }}
        >
          <div className="text-4xl mb-3">🚧</div>
          <div className="text-lg font-semibold" style={{ color: colors.utility.primaryText }}>
            Step {currentStep} Configuration
          </div>
          <div className="text-sm mt-1" style={{ color: colors.utility.secondaryText }}>
            {stepLabel} settings will be available soon
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full">
      {/* Progress Bar */}
      <WizardProgress
        steps={wizardSteps}
        currentStep={currentStep}
        onStepClick={handleStepClick}
        allowNavigation={mode === 'edit'}
      />

      {/* Step Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {renderStepContent()}
      </div>

      {/* Footer */}
      <WizardFooter
        currentStep={currentStep}
        totalSteps={totalSteps}
        onPrevious={handlePrevious}
        onNext={handleNext}
        onSaveDraft={handleSaveDraft}
      />
    </div>
  );
};

export default BlockWizardContent;
