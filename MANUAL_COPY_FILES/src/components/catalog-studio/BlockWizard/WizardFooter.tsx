// src/components/catalog-studio/BlockWizard/WizardFooter.tsx
import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTheme } from '../../../contexts/ThemeContext';

interface WizardFooterProps {
  currentStep: number;
  totalSteps: number;
  onPrevious: () => void;
  onNext: () => void;
  onSaveDraft: () => void;
}

const WizardFooter: React.FC<WizardFooterProps> = ({
  currentStep,
  totalSteps,
  onPrevious,
  onNext,
  onSaveDraft
}) => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;
  const isFirstStep = currentStep === 1;
  const isLastStep = currentStep === totalSteps;

  return (
    <div
      className="px-6 py-4 border-t flex justify-between items-center"
      style={{
        backgroundColor: colors.utility.primaryBackground,
        borderColor: isDarkMode ? colors.utility.secondaryBackground : '#E5E7EB'
      }}
    >
      <button
        onClick={onPrevious}
        disabled={isFirstStep}
        className="px-4 py-2 text-sm font-medium flex items-center gap-2 transition-colors"
        style={{
          color: isFirstStep ? (isDarkMode ? colors.utility.secondaryBackground : '#D1D5DB') : colors.utility.secondaryText,
          cursor: isFirstStep ? 'not-allowed' : 'pointer'
        }}
      >
        <ChevronLeft className="w-4 h-4" />
        Back
      </button>
      <div className="flex gap-3">
        <button
          onClick={onSaveDraft}
          className="px-4 py-2 text-sm font-medium border rounded-lg transition-colors"
          style={{
            backgroundColor: colors.utility.primaryBackground,
            borderColor: isDarkMode ? colors.utility.secondaryText : '#D1D5DB',
            color: colors.utility.primaryText
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = isDarkMode ? colors.utility.secondaryBackground : '#F9FAFB';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = colors.utility.primaryBackground;
          }}
        >
          Save Draft
        </button>
        <button
          onClick={onNext}
          className="px-4 py-2 text-sm font-medium text-white rounded-lg flex items-center gap-2 transition-colors"
          style={{ backgroundColor: colors.brand.primary }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = colors.brand.secondary;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = colors.brand.primary;
          }}
        >
          {isLastStep ? 'Save Block' : 'Continue'}
          {!isLastStep && <ChevronRight className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
};

export default WizardFooter;
