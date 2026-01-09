// src/components/catalog-studio/BlockWizard/WizardProgress.tsx
// Updated: Side wizard layout instead of horizontal top

import React from 'react';
import { Check } from 'lucide-react';
import { useTheme } from '../../../contexts/ThemeContext';
import { WizardStep } from '../../../types/catalogStudio';

interface WizardProgressProps {
  steps: WizardStep[];
  currentStep: number;
  onStepClick?: (stepId: number) => void;
  allowNavigation?: boolean;
}

const WizardProgress: React.FC<WizardProgressProps> = ({
  steps,
  currentStep,
  onStepClick,
  allowNavigation = false
}) => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  const handleStepClick = (stepId: number) => {
    if (allowNavigation || stepId < currentStep) {
      onStepClick?.(stepId);
    }
  };

  return (
    <div
      className="w-56 flex-shrink-0 border-r py-6 px-4"
      style={{
        backgroundColor: isDarkMode ? colors.utility.secondaryBackground : '#F9FAFB',
        borderColor: isDarkMode ? colors.utility.secondaryBackground : '#E5E7EB'
      }}
    >
      <div className="space-y-1">
        {steps.map((step, index) => {
          const isCompleted = currentStep > step.id;
          const isCurrent = currentStep === step.id;
          const isClickable = allowNavigation || step.id < currentStep;

          return (
            <div key={step.id} className="relative">
              {/* Connector Line */}
              {index < steps.length - 1 && (
                <div
                  className="absolute left-4 top-10 w-0.5 h-6"
                  style={{
                    backgroundColor: isCompleted
                      ? colors.semantic.success
                      : (isDarkMode ? colors.utility.secondaryText + '40' : '#D1D5DB')
                  }}
                />
              )}

              {/* Step Item */}
              <button
                onClick={() => handleStepClick(step.id)}
                disabled={!isClickable}
                className={`w-full flex items-center gap-3 p-2.5 rounded-xl transition-all ${
                  isClickable ? 'cursor-pointer hover:bg-opacity-80' : 'cursor-default'
                }`}
                style={{
                  backgroundColor: isCurrent
                    ? (isDarkMode ? colors.brand.primary + '20' : colors.brand.primary + '10')
                    : 'transparent',
                }}
              >
                {/* Step Number/Check */}
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors flex-shrink-0"
                  style={{
                    backgroundColor: isCompleted
                      ? colors.semantic.success
                      : isCurrent
                        ? colors.brand.primary
                        : (isDarkMode ? colors.utility.primaryBackground : '#E5E7EB'),
                    color: isCompleted || isCurrent
                      ? '#FFFFFF'
                      : colors.utility.secondaryText
                  }}
                >
                  {isCompleted ? <Check className="w-4 h-4" /> : step.id}
                </div>

                {/* Step Label */}
                <span
                  className={`text-sm font-medium transition-colors ${
                    isCurrent ? 'font-semibold' : ''
                  }`}
                  style={{
                    color: isCurrent
                      ? colors.brand.primary
                      : isCompleted
                        ? colors.semantic.success
                        : colors.utility.secondaryText
                  }}
                >
                  {step.label}
                </span>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default WizardProgress;
