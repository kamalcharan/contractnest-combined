// src/components/catalog-studio/BlockWizard/index.tsx
import React, { useState } from 'react';
import { useTheme } from '../../../contexts/ThemeContext';
import { Block, WizardMode } from '../../../types/catalogStudio';
import { BLOCK_CATEGORIES, WIZARD_STEPS } from '../../../utils/catalog-studio';
import WizardHeader from './WizardHeader';
import WizardProgress from './WizardProgress';
import WizardFooter from './WizardFooter';
import { TypeSelectionStep, BasicInfoStep, DeliveryStep, PricingStep, EvidenceStep, RulesStep } from './steps';

interface BlockWizardProps {
  isOpen: boolean;
  mode: WizardMode;
  blockType: string;
  editingBlock?: Block | null;
  onClose: () => void;
  onSave: (block: Partial<Block>) => void;
  onBlockTypeChange: (type: string) => void;
}

const BlockWizard: React.FC<BlockWizardProps> = ({
  isOpen, mode, blockType, editingBlock, onClose, onSave, onBlockTypeChange,
}) => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<Partial<Block>>(editingBlock || {});

  const wizardSteps = WIZARD_STEPS[blockType] || WIZARD_STEPS.service;
  const totalSteps = wizardSteps.length;

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
    if (currentStep === 1) {
      return <TypeSelectionStep categories={BLOCK_CATEGORIES} selectedType={blockType} onSelectType={handleTypeChange} />;
    }
    if (currentStep === 2) {
      return <BasicInfoStep blockType={blockType} formData={formData} onChange={handleFormChange} />;
    }
    if (blockType === 'service') {
      switch (currentStep) {
        case 3: return <DeliveryStep formData={formData} onChange={handleFormChange} />;
        case 4: return <PricingStep formData={formData} onChange={handleFormChange} />;
        case 5: return <EvidenceStep formData={formData} onChange={handleFormChange} />;
        case 6: return <RulesStep formData={formData} onChange={handleFormChange} />;
      }
    }
    const stepLabel = wizardSteps.find((s) => s.id === currentStep)?.label || 'Configuration';
    return (
      <div className="animate-in fade-in slide-in-from-right-4 duration-200">
        <h2 className="text-lg font-bold mb-1" style={{ color: colors.utility.primaryText }}>{stepLabel}</h2>
        <p className="text-sm mb-6" style={{ color: colors.utility.secondaryText }}>Configure settings for this block.</p>
        <div
          className="p-8 border-2 border-dashed rounded-xl text-center"
          style={{ borderColor: isDarkMode ? colors.utility.secondaryBackground : '#D1D5DB' }}
        >
          <div className="text-4xl mb-3">🚧</div>
          <div className="text-lg font-semibold" style={{ color: colors.utility.primaryText }}>Step {currentStep} Configuration</div>
          <div className="text-sm mt-1" style={{ color: colors.utility.secondaryText }}>{stepLabel} settings will be available soon</div>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div
        className="rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        style={{ backgroundColor: colors.utility.primaryBackground }}
      >
        <WizardHeader mode={mode} blockType={blockType} categories={BLOCK_CATEGORIES} onClose={onClose} />
        <WizardProgress steps={wizardSteps} currentStep={currentStep} />
        <div className="flex-1 overflow-y-auto p-6">{renderStepContent()}</div>
        <WizardFooter currentStep={currentStep} totalSteps={totalSteps} onPrevious={handlePrevious} onNext={handleNext} onSaveDraft={handleSaveDraft} />
      </div>
    </div>
  );
};

export default BlockWizard;
