// src/components/catalog-studio/BlockWizard/BlockWizardContent.tsx
// Embeddable wizard content (no modal wrapper) for use in full page layouts
// Phase 4: Full Page Wizard
// Updated: Use BusinessRulesStep for step 6 instead of RulesStep
// Updated: Added mandatory field validation before proceeding to next step

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTheme } from '../../../contexts/ThemeContext';
import { Block, WizardMode, BlockCategory } from '../../../types/catalogStudio';
import { BLOCK_CATEGORIES, WIZARD_STEPS } from '../../../utils/catalog-studio';
import WizardProgress from './WizardProgress';
import WizardFooter from './WizardFooter';
import {
  TypeSelectionStep,
  BasicInfoStep,
  ResourceDependencyStep,
  // Service steps
  DeliveryStep,
  PricingStep,
  EvidenceStep,
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

// Import BusinessRulesStep for step 7
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
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const contentRef = useRef<HTMLDivElement>(null);

  // Scroll to top when step changes
  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [currentStep]);

  // Validation function for each step
  const validateStep = useCallback((step: number, type: string, data: Partial<Block>): string[] => {
    const errors: string[] = [];

    // Step 1 - Type Selection: Just need a type selected
    if (step === 1 && showTypeSelection) {
      if (!type) {
        errors.push('Please select a block type');
      }
      return errors;
    }

    // Step 2 - Basic Info: Name and Description required
    const basicInfoStep = showTypeSelection ? 2 : 1;
    if (step === basicInfoStep) {
      if (!data.name?.trim()) {
        errors.push('Block name is required');
      }
      if (!data.description?.trim()) {
        errors.push('Description is required');
      }
      // Block-specific validations for Basic Info
      // Duration removed for service blocks
      if (type === 'spare') {
        if (!data.meta?.sku?.toString().trim()) {
          errors.push('SKU is required');
        }
      }
      if (type === 'billing') {
        if (!data.meta?.paymentType) {
          errors.push('Payment type is required');
        }
      }
      return errors;
    }

    // Block-specific step validations
    if (type === 'service') {
      // Step 3 - Resources: No mandatory fields (independent is default)
      // Step 4 - Delivery: No mandatory fields (cycles are optional)
      // Step 5 - Pricing: Price is required
      // Supports both independent pricing (pricingRecords) and resource-based pricing (resourcePricingRecords)
      if (step === 5) {
        const pricingMode = data.meta?.pricingMode as string | undefined;
        let hasValidPrice = false;

        if (pricingMode === 'resource_based') {
          // Check resourcePricingRecords for resource-based pricing
          const resourcePricingRecords = data.meta?.resourcePricingRecords as Array<{ pricePerUnit: number }> | undefined;
          hasValidPrice = resourcePricingRecords && resourcePricingRecords.length > 0 &&
                          resourcePricingRecords.some(r => r.pricePerUnit > 0);
        } else {
          // Check pricingRecords for independent pricing (default)
          const pricingRecords = data.meta?.pricingRecords as Array<{ amount: number }> | undefined;
          hasValidPrice = pricingRecords && pricingRecords.length > 0 &&
                          pricingRecords.some(r => r.amount > 0);
        }

        if (!hasValidPrice) {
          errors.push('Price is required');
        }
      }
      // Step 6 - Evidence: No mandatory fields
      // Step 7 - Business Rules: No mandatory fields
    }

    if (type === 'spare') {
      // Step 3 - Inventory: Stock quantity required
      if (step === 3) {
        if (!data.meta?.stockQuantity || data.meta.stockQuantity < 0) {
          errors.push('Stock quantity is required');
        }
      }
      // Step 4 - Pricing: Price required
      if (step === 4) {
        const pricingRecords = data.meta?.pricingRecords as Array<{ amount: number }> | undefined;
        const hasValidPrice = pricingRecords && pricingRecords.length > 0 &&
                              pricingRecords.some(r => r.amount > 0);
        if (!hasValidPrice) {
          errors.push('Price is required');
        }
      }
      // Step 5 - Fulfillment: No mandatory fields
    }

    if (type === 'billing') {
      // Step 3 - Structure: Billing structure required
      if (step === 3) {
        if (!data.meta?.billingStructure) {
          errors.push('Billing structure is required');
        }
      }
      // Step 4 - Schedule: Billing frequency required
      if (step === 4) {
        if (!data.meta?.billingFrequency) {
          errors.push('Billing frequency is required');
        }
      }
      // Step 5 - Automation: No mandatory fields
    }

    return errors;
  }, [showTypeSelection]);

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
    // Validate current step before proceeding
    const errors = validateStep(currentStep, blockType, formData);
    setValidationErrors(errors);

    if (errors.length > 0) {
      // Don't proceed if there are validation errors
      return;
    }

    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    } else {
      onSave(formData);
    }
  };

  // Clear validation errors when form data changes
  useEffect(() => {
    if (validationErrors.length > 0) {
      setValidationErrors([]);
    }
  }, [formData]);

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
          case 3: return <ResourceDependencyStep formData={formData} onChange={handleFormChange} />;
          case 4: return <DeliveryStep formData={formData} onChange={handleFormChange} />;
          case 5: return <PricingStep formData={formData} onChange={handleFormChange} />;
          case 6: return <EvidenceStep formData={formData} onChange={handleFormChange} />;
          case 7: return <BusinessRulesStep formData={formData} onChange={handleFormChange} />;
        }
        break;

      case 'spare':
        switch (currentStep) {
          case 3: return <InventoryStep formData={formData} onChange={handleFormChange} />;
          case 4: return <PricingStep formData={formData} onChange={handleFormChange} />;
          case 5: return <FulfillmentStep formData={formData} onChange={handleFormChange} />;
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
    <div className="flex h-full">
      {/* Side Progress Bar */}
      <WizardProgress
        steps={wizardSteps}
        currentStep={currentStep}
        onStepClick={handleStepClick}
        allowNavigation={mode === 'edit'}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Step Content */}
        <div ref={contentRef} className="flex-1 overflow-y-auto p-6">
          {renderStepContent()}
        </div>

        {/* Footer */}
        <WizardFooter
          currentStep={currentStep}
          totalSteps={totalSteps}
          onPrevious={handlePrevious}
          onNext={handleNext}
          onSaveDraft={handleSaveDraft}
          onCancel={onCancel}
          validationErrors={validationErrors}
        />
      </div>
    </div>
  );
};

export default BlockWizardContent;
