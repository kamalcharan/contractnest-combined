// src/components/catalog-studio/BlockWizard/WizardFooter.tsx
// Updated: Better styled buttons for Back and Save Draft
// Updated: Added validation errors display

import React from 'react';
import { ChevronLeft, ChevronRight, Save, AlertCircle } from 'lucide-react';
import { useTheme } from '../../../contexts/ThemeContext';

interface WizardFooterProps {
  currentStep: number;
  totalSteps: number;
  onPrevious: () => void;
  onNext: () => void;
  onSaveDraft: () => void;
  validationErrors?: string[];
}

const WizardFooter: React.FC<WizardFooterProps> = ({
  currentStep,
  totalSteps,
  onPrevious,
  onNext,
  onSaveDraft,
  validationErrors = []
}) => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;
  const isFirstStep = currentStep === 1;
  const isLastStep = currentStep === totalSteps;

  // Button style definitions
  const backButtonStyle = {
    backgroundColor: isFirstStep
      ? 'transparent'
      : (isDarkMode ? colors.utility.secondaryBackground : '#F3F4F6'),
    borderColor: isFirstStep
      ? 'transparent'
      : (isDarkMode ? colors.utility.secondaryText + '40' : '#D1D5DB'),
    color: isFirstStep
      ? (isDarkMode ? colors.utility.secondaryBackground : '#D1D5DB')
      : colors.utility.primaryText,
  };

  const saveDraftButtonStyle = {
    backgroundColor: isDarkMode ? '#78350F' + '20' : '#FFFBEB',
    borderColor: isDarkMode ? '#F59E0B' + '60' : '#FCD34D',
    color: isDarkMode ? '#FBBF24' : '#B45309',
  };

  const saveDraftHoverStyle = {
    backgroundColor: isDarkMode ? '#78350F' + '40' : '#FEF3C7',
  };

  const continueButtonStyle = {
    backgroundColor: colors.brand.primary,
  };

  const hasErrors = validationErrors.length > 0;

  return (
    <div
      className="border-t"
      style={{
        backgroundColor: isDarkMode ? colors.utility.primaryBackground : '#FFFFFF',
        borderColor: isDarkMode ? colors.utility.secondaryBackground : '#E5E7EB'
      }}
    >
      {/* Validation Errors Display */}
      {hasErrors && (
        <div
          className="px-6 py-3 flex items-start gap-3"
          style={{
            backgroundColor: isDarkMode ? colors.semantic.error + '15' : '#FEF2F2',
            borderBottom: `1px solid ${isDarkMode ? colors.semantic.error + '30' : '#FECACA'}`,
          }}
        >
          <AlertCircle
            className="w-5 h-5 flex-shrink-0 mt-0.5"
            style={{ color: isDarkMode ? colors.semantic.error : '#DC2626' }}
          />
          <div className="flex-1">
            <p
              className="text-sm font-medium mb-1"
              style={{ color: isDarkMode ? colors.semantic.error : '#DC2626' }}
            >
              Please fix the following errors:
            </p>
            <ul className="text-sm space-y-0.5" style={{ color: isDarkMode ? colors.semantic.error : '#B91C1C' }}>
              {validationErrors.map((error, index) => (
                <li key={index}>• {error}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Button Row */}
      <div className="px-6 py-4 flex justify-between items-center">
        {/* Back Button - Now with background and border */}
        <button
        onClick={onPrevious}
        disabled={isFirstStep}
        className="px-4 py-2.5 text-sm font-medium flex items-center gap-2 rounded-xl border transition-all"
        style={{
          ...backButtonStyle,
          cursor: isFirstStep ? 'not-allowed' : 'pointer',
          opacity: isFirstStep ? 0.5 : 1,
        }}
        onMouseEnter={(e) => {
          if (!isFirstStep) {
            e.currentTarget.style.backgroundColor = isDarkMode ? colors.utility.secondaryBackground : '#E5E7EB';
          }
        }}
        onMouseLeave={(e) => {
          if (!isFirstStep) {
            e.currentTarget.style.backgroundColor = isDarkMode ? colors.utility.secondaryBackground : '#F3F4F6';
          }
        }}
      >
        <ChevronLeft className="w-4 h-4" />
        Back
      </button>

      <div className="flex gap-3">
        {/* Save Draft Button - Now with amber/yellow theme */}
        <button
          onClick={onSaveDraft}
          className="px-4 py-2.5 text-sm font-medium border-2 rounded-xl transition-all flex items-center gap-2"
          style={saveDraftButtonStyle}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = saveDraftHoverStyle.backgroundColor;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = saveDraftButtonStyle.backgroundColor;
          }}
        >
          <Save className="w-4 h-4" />
          Save Draft
        </button>

        {/* Continue Button - Primary color (unchanged) */}
        <button
          onClick={onNext}
          className="px-5 py-2.5 text-sm font-semibold text-white rounded-xl flex items-center gap-2 transition-all shadow-sm hover:shadow-md"
          style={continueButtonStyle}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = colors.brand.secondary;
            e.currentTarget.style.transform = 'translateY(-1px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = colors.brand.primary;
            e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          {isLastStep ? 'Save Block' : 'Continue'}
          {!isLastStep && <ChevronRight className="w-4 h-4" />}
        </button>
        </div>
      </div>
    </div>
  );
};

export default WizardFooter;
