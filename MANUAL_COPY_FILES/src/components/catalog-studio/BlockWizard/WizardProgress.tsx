// src/components/catalog-studio/BlockWizard/WizardProgress.tsx
import React from 'react';
import { Check } from 'lucide-react';
import { useTheme } from '../../../contexts/ThemeContext';
import { WizardStep } from '../../../types/catalogStudio';

interface WizardProgressProps {
  steps: WizardStep[];
  currentStep: number;
}

const WizardProgress: React.FC<WizardProgressProps> = ({ steps, currentStep }) => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  return (
    <div
      className="px-6 py-4 border-b"
      style={{
        backgroundColor: isDarkMode ? colors.utility.secondaryBackground : '#F9FAFB',
        borderColor: isDarkMode ? colors.utility.secondaryBackground : '#E5E7EB'
      }}
    >
      <div className="flex items-center justify-center gap-2">
        {steps.map((step, index) => (
          <React.Fragment key={step.id}>
            {index > 0 && (
              <div
                className="w-8 h-0.5 transition-colors"
                style={{
                  backgroundColor: currentStep > index ? colors.semantic.success : (isDarkMode ? colors.utility.secondaryText : '#D1D5DB')
                }}
              />
            )}
            <div className="flex items-center gap-2">
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors"
                style={{
                  backgroundColor: currentStep > step.id
                    ? colors.semantic.success
                    : currentStep === step.id
                      ? colors.brand.primary
                      : (isDarkMode ? colors.utility.secondaryBackground : '#E5E7EB'),
                  color: currentStep >= step.id ? '#FFFFFF' : colors.utility.secondaryText
                }}
              >
                {currentStep > step.id ? <Check className="w-3 h-3" /> : step.id}
              </div>
              {currentStep === step.id && (
                <span
                  className="text-xs font-semibold"
                  style={{ color: colors.brand.primary }}
                >
                  {step.label}
                </span>
              )}
            </div>
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

export default WizardProgress;
