// src/components/catalog-studio/BlockWizard/index.tsx
// Block Creation/Edit Wizard with Modal and Full-Page variants
// ✅ Phase 8: Full-page support, DB-driven categories, ResourceDependency, BusinessRules

import React, { useState, useEffect } from 'react';
import { useTheme } from '../../../contexts/ThemeContext';
import { Block, WizardMode, BlockCategory } from '../../../types/catalogStudio';
import { BLOCK_CATEGORIES, WIZARD_STEPS } from '../../../utils/catalog-studio';
import { useBlockCategories } from '../../../hooks/queries/useBlockTypes';
import WizardHeader from './WizardHeader';
import WizardProgress from './WizardProgress';
import WizardFooter from './WizardFooter';
import BlockWizardContent from './BlockWizardContent';
import {
  TypeSelectionStep,
  BasicInfoStep,
  ResourceDependencyStep,
  // Service steps
  DeliveryStep,
  PricingStep,
  EvidenceStep,
  RulesStep,
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
import { BusinessRulesStep } from './steps/service';

// =================================================================
// TYPES
// =================================================================

interface BlockWizardProps {
  isOpen: boolean;
  mode: WizardMode;
  blockType: string;
  editingBlock?: Block | null;
  categories?: BlockCategory[];
  onClose: () => void;
  onSave: (block: Partial<Block>) => void;
  onBlockTypeChange: (type: string) => void;
  fullPage?: boolean; // NEW: Enable full-page layout
}

// =================================================================
// UPDATED WIZARD STEPS (With ResourceDependency & BusinessRules)
// =================================================================

const SERVICE_WIZARD_STEPS = [
  { id: 1, label: 'Type' },
  { id: 2, label: 'Basic Info' },
  { id: 3, label: 'Resources' },       // ResourceDependencyStep
  { id: 4, label: 'Delivery' },
  { id: 5, label: 'Pricing' },
  { id: 6, label: 'Evidence' },
  { id: 7, label: 'Rules' },
  { id: 8, label: 'Business Rules' },  // BusinessRulesStep
];

// =================================================================
// MODAL WRAPPER COMPONENT (Legacy - for blocks.tsx)
// =================================================================

const BlockWizard: React.FC<BlockWizardProps> = ({
  isOpen,
  mode,
  blockType,
  editingBlock,
  categories: propCategories,
  onClose,
  onSave,
  onBlockTypeChange,
  fullPage = false,
}) => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  // ✅ FIXED: Use DB-driven categories with fallback
  const { categories: dbCategories, isLoading: categoriesLoading } = useBlockCategories();
  const categories: BlockCategory[] = propCategories
    || (dbCategories.length > 0 ? dbCategories : BLOCK_CATEGORIES);

  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<Partial<Block>>(editingBlock || {});

  // ✅ Use updated steps for service blocks
  const getWizardSteps = () => {
    if (blockType === 'service') {
      return SERVICE_WIZARD_STEPS;
    }
    return WIZARD_STEPS[blockType] || WIZARD_STEPS.service;
  };

  const wizardSteps = getWizardSteps();
  const totalSteps = wizardSteps.length;

  // Reset when modal opens/closes or editing block changes
  useEffect(() => {
    if (isOpen) {
      setCurrentStep(mode === 'edit' ? 2 : 1);
      setFormData(editingBlock || {});
    }
  }, [isOpen, editingBlock, mode]);

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    } else {
      onSave(formData);
      onClose();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  const handleSaveDraft = () => {
    console.log('Saving draft:', formData);
  };

  const handleFormChange = (field: string, value: unknown) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleTypeChange = (type: string) => {
    onBlockTypeChange(type);
    setCurrentStep(1);
  };

  if (!isOpen) return null;

  const renderStepContent = () => {
    // Step 1 - Type Selection (common for all)
    if (currentStep === 1) {
      return (
        <TypeSelectionStep
          categories={categories}
          selectedType={blockType}
          onSelectType={handleTypeChange}
          isLoading={categoriesLoading}
        />
      );
    }

    // Step 2 - Basic Info (common for all)
    if (currentStep === 2) {
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
          case 7: return <RulesStep formData={formData} onChange={handleFormChange} />;
          case 8: return <BusinessRulesStep formData={formData} onChange={handleFormChange} />;
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

  // =================================================================
  // FULL PAGE LAYOUT
  // =================================================================

  if (fullPage) {
    return (
      <div
        className="min-h-screen flex flex-col"
        style={{ backgroundColor: colors.utility.primaryBackground }}
      >
        {/* Fixed Header */}
        <div
          className="sticky top-0 z-10 border-b"
          style={{
            backgroundColor: colors.utility.primaryBackground,
            borderColor: isDarkMode ? colors.utility.secondaryBackground : '#E5E7EB'
          }}
        >
          <div className="max-w-6xl mx-auto">
            <WizardHeader mode={mode} blockType={blockType} categories={categories} onClose={onClose} />
            <WizardProgress steps={wizardSteps} currentStep={currentStep} />
          </div>
        </div>

        {/* Scrollable Content - Full width */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-5xl mx-auto px-8 py-10">
            {renderStepContent()}
          </div>
        </div>

        {/* Fixed Footer */}
        <div
          className="sticky bottom-0 border-t"
          style={{
            backgroundColor: colors.utility.primaryBackground,
            borderColor: isDarkMode ? colors.utility.secondaryBackground : '#E5E7EB'
          }}
        >
          <div className="max-w-5xl mx-auto">
            <WizardFooter
              currentStep={currentStep}
              totalSteps={totalSteps}
              onPrevious={handlePrevious}
              onNext={handleNext}
              onSaveDraft={handleSaveDraft}
            />
          </div>
        </div>
      </div>
    );
  }

  // =================================================================
  // MODAL LAYOUT (Original - for backward compatibility)
  // =================================================================

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div
        className="rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        style={{ backgroundColor: colors.utility.primaryBackground }}
      >
        <WizardHeader
          mode={mode}
          blockType={blockType}
          categories={categories}
          onClose={onClose}
        />
        <WizardProgress steps={wizardSteps} currentStep={currentStep} />
        <div className="flex-1 overflow-y-auto p-6">{renderStepContent()}</div>
        <WizardFooter
          currentStep={currentStep}
          totalSteps={totalSteps}
          onPrevious={handlePrevious}
          onNext={handleNext}
          onSaveDraft={handleSaveDraft}
        />
      </div>
    </div>
  );
};

// =================================================================
// EXPORTS
// =================================================================

export default BlockWizard;

// Export the embeddable content component for full-page layouts
export { BlockWizardContent };

// Re-export sub-components for potential reuse
export { WizardHeader, WizardProgress, WizardFooter };

// Re-export all step components
export {
  TypeSelectionStep,
  BasicInfoStep,
  ResourceDependencyStep,
  DeliveryStep,
  PricingStep,
  EvidenceStep,
  RulesStep,
  InventoryStep,
  FulfillmentStep,
  StructureStep,
  ScheduleStep,
  AutomationStep,
  ContentStep,
  ContentSettingsStep,
  MediaStep,
  ImageUploadStep,
  DisplaySettingsStep,
  ItemsStep,
  ChecklistSettingsStep,
  FileSettingsStep,
  BusinessRulesStep,
};
