// src/components/contracts/ContractWizard/steps/AcceptanceMethodStep.tsx
// Step 2: Choose contract acceptance method
import React from 'react';
import { CreditCard, PenTool, CheckCircle, Check, Info } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import {
  ACCEPTANCE_METHOD_CONFIG,
  getAcceptanceMethodColors,
} from '@/utils/constants/contracts';

export type AcceptanceMethod = 'payment' | 'signoff' | 'auto' | null;

interface AcceptanceMethodStepProps {
  selectedMethod: AcceptanceMethod;
  onSelectMethod: (method: AcceptanceMethod) => void;
}

// Map icon names to components
const iconMap: Record<string, React.ElementType> = {
  CreditCard,
  PenTool,
  CheckCircle,
};

const AcceptanceMethodStep: React.FC<AcceptanceMethodStepProps> = ({
  selectedMethod,
  onSelectMethod,
}) => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  return (
    <div
      className="min-h-[60vh] px-4 py-8"
      style={{ backgroundColor: colors.utility.primaryBackground }}
    >
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <h2
            className="text-2xl font-bold mb-3"
            style={{ color: colors.utility.primaryText }}
          >
            How should this contract be accepted?
          </h2>
          <p
            className="text-sm max-w-lg mx-auto"
            style={{ color: colors.utility.secondaryText }}
          >
            Choose how your buyer will confirm acceptance of this contract.
            This determines when the contract becomes active.
          </p>
        </div>

        {/* Acceptance Method Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {ACCEPTANCE_METHOD_CONFIG.map((method) => {
            const isSelected = selectedMethod === method.id;
            const IconComponent = iconMap[method.lucideIcon] || CheckCircle;
            const methodColors = getAcceptanceMethodColors(
              method.colorKey,
              colors,
              isSelected
            );

            return (
              <button
                key={method.id}
                onClick={() => onSelectMethod(method.id as AcceptanceMethod)}
                className="relative flex flex-col p-6 rounded-2xl border-2 text-left transition-all duration-300 hover:shadow-lg group"
                style={{
                  backgroundColor: isSelected
                    ? methodColors.bg
                    : colors.utility.secondaryBackground,
                  borderColor: isSelected
                    ? methodColors.border
                    : `${colors.utility.primaryText}15`,
                  transform: isSelected ? 'scale(1.02)' : 'scale(1)',
                }}
              >
                {/* Selection Indicator (top right) */}
                <div
                  className="absolute top-5 right-5 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all"
                  style={{
                    borderColor: isSelected
                      ? methodColors.border
                      : `${colors.utility.primaryText}30`,
                    backgroundColor: isSelected
                      ? methodColors.border
                      : 'transparent',
                  }}
                >
                  {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                </div>

                {/* Icon */}
                <div
                  className="w-14 h-14 rounded-xl flex items-center justify-center mb-4 transition-colors"
                  style={{
                    backgroundColor: isSelected
                      ? methodColors.iconBg
                      : `${colors.utility.primaryText}08`,
                  }}
                >
                  <IconComponent
                    className="w-7 h-7"
                    style={{
                      color: isSelected
                        ? methodColors.text
                        : colors.utility.secondaryText,
                    }}
                  />
                </div>

                {/* Title */}
                <h3
                  className="text-lg font-semibold mb-2"
                  style={{
                    color: isSelected
                      ? methodColors.text
                      : colors.utility.primaryText,
                  }}
                >
                  {method.label}
                </h3>

                {/* Short Description */}
                <p
                  className="text-sm mb-4"
                  style={{ color: colors.utility.secondaryText }}
                >
                  {method.shortDescription}
                </p>

                {/* Features List */}
                <div className="space-y-2 mt-auto">
                  {method.features.map((feature, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Check
                        className="w-4 h-4 flex-shrink-0"
                        style={{
                          color: isSelected
                            ? methodColors.text
                            : colors.semantic.success,
                        }}
                      />
                      <span
                        className="text-xs"
                        style={{ color: colors.utility.secondaryText }}
                      >
                        {feature}
                      </span>
                    </div>
                  ))}
                </div>
              </button>
            );
          })}
        </div>

        {/* Selected Method Info Panel */}
        {selectedMethod && (
          <div
            className="mt-8 p-5 rounded-xl border flex items-start gap-4"
            style={{
              backgroundColor: colors.utility.secondaryBackground,
              borderColor: `${colors.utility.primaryText}10`,
            }}
          >
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: `${colors.brand.primary}15` }}
            >
              <Info className="w-5 h-5" style={{ color: colors.brand.primary }} />
            </div>
            <div className="flex-1">
              <h4
                className="font-semibold mb-1"
                style={{ color: colors.utility.primaryText }}
              >
                {ACCEPTANCE_METHOD_CONFIG.find((m) => m.id === selectedMethod)?.label}{' '}
                Acceptance
              </h4>
              <p
                className="text-sm"
                style={{ color: colors.utility.secondaryText }}
              >
                {ACCEPTANCE_METHOD_CONFIG.find((m) => m.id === selectedMethod)?.description}
              </p>
            </div>
          </div>
        )}

        {/* Helper Text */}
        <p
          className="text-center text-xs mt-6"
          style={{ color: colors.utility.secondaryText }}
        >
          You can change the acceptance method later before sending the contract
        </p>
      </div>
    </div>
  );
};

export default AcceptanceMethodStep;
