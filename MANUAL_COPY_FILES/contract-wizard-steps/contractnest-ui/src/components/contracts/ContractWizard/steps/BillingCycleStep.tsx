// src/components/contracts/ContractWizard/steps/BillingCycleStep.tsx
// Step 6: Billing Cycle - Choose between Unified Cycle or Mixed Cycles
import React from 'react';
import { Calendar, Shuffle, CheckCircle2 } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

export type BillingCycleType = 'unified' | 'mixed' | null;

interface BillingCycleStepProps {
  selectedCycleType: BillingCycleType;
  onSelectCycleType: (cycleType: BillingCycleType) => void;
}

interface CycleOption {
  id: BillingCycleType;
  title: string;
  description: string;
  icon: React.ElementType;
  benefits: string[];
  visualExample: {
    labels: string[];
    description: string;
  };
}

const cycleOptions: CycleOption[] = [
  {
    id: 'unified',
    title: 'Unified Cycle',
    description: 'All services billed on the same schedule',
    icon: Calendar,
    benefits: [
      'Simpler invoicing',
      'Predictable billing',
      'Easier reconciliation',
    ],
    visualExample: {
      labels: ['M', 'M', 'M'],
      description: 'All Monthly',
    },
  },
  {
    id: 'mixed',
    title: 'Mixed Cycles',
    description: 'Each service has its own billing schedule',
    icon: Shuffle,
    benefits: [
      'Maximum flexibility',
      'Mix recurring & one-time',
      'Custom per service',
    ],
    visualExample: {
      labels: ['M', 'Q', '1x'],
      description: 'Monthly, Quarterly, One-time',
    },
  },
];

const BillingCycleStep: React.FC<BillingCycleStepProps> = ({
  selectedCycleType,
  onSelectCycleType,
}) => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
      {/* Header */}
      <div className="text-center mb-10">
        <h2
          className="text-2xl font-bold mb-3"
          style={{ color: colors.utility.primaryText }}
        >
          Billing Cycle
        </h2>
        <p
          className="text-sm max-w-md mx-auto"
          style={{ color: colors.utility.secondaryText }}
        >
          How should services be billed?
        </p>
      </div>

      {/* Cycle Options Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-3xl">
        {cycleOptions.map((option) => {
          const isSelected = selectedCycleType === option.id;
          const IconComponent = option.icon;

          return (
            <button
              key={option.id}
              onClick={() => onSelectCycleType(option.id)}
              className="relative flex flex-col p-6 rounded-2xl border-2 text-left transition-all duration-300 hover:shadow-lg group"
              style={{
                backgroundColor: isSelected
                  ? `${colors.brand.primary}08`
                  : colors.utility.secondaryBackground,
                borderColor: isSelected
                  ? colors.brand.primary
                  : `${colors.utility.primaryText}15`,
                transform: isSelected ? 'scale(1.02)' : 'scale(1)',
              }}
            >
              {/* Icon */}
              <div
                className="w-14 h-14 rounded-xl flex items-center justify-center mb-4 transition-colors"
                style={{
                  backgroundColor: isSelected
                    ? colors.brand.primary
                    : `${colors.brand.primary}15`,
                }}
              >
                <IconComponent
                  className="w-7 h-7"
                  style={{
                    color: isSelected ? 'white' : colors.brand.primary,
                  }}
                />
              </div>

              {/* Title & Description */}
              <h3
                className="text-lg font-semibold mb-2"
                style={{ color: colors.utility.primaryText }}
              >
                {option.title}
              </h3>
              <p
                className="text-sm mb-4"
                style={{ color: colors.utility.secondaryText }}
              >
                {option.description}
              </p>

              {/* Visual Example */}
              <div
                className="flex items-center gap-2 mb-4 p-3 rounded-lg"
                style={{ backgroundColor: `${colors.utility.primaryText}05` }}
              >
                <div className="flex items-center gap-1.5">
                  {option.visualExample.labels.map((label, index) => (
                    <div
                      key={index}
                      className="w-8 h-8 rounded-md flex items-center justify-center text-xs font-semibold"
                      style={{
                        backgroundColor: isSelected
                          ? colors.brand.primary
                          : `${colors.brand.primary}20`,
                        color: isSelected ? 'white' : colors.brand.primary,
                      }}
                    >
                      {label}
                    </div>
                  ))}
                </div>
                <span
                  className="text-xs ml-2"
                  style={{ color: colors.utility.secondaryText }}
                >
                  {option.visualExample.description}
                </span>
              </div>

              {/* Benefits */}
              <div className="space-y-2 mt-auto">
                {option.benefits.map((benefit, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <CheckCircle2
                      className="w-4 h-4 flex-shrink-0"
                      style={{ color: colors.semantic.success }}
                    />
                    <span
                      className="text-sm"
                      style={{ color: colors.utility.secondaryText }}
                    >
                      {benefit}
                    </span>
                  </div>
                ))}
              </div>

              {/* Selection Indicator */}
              <div
                className="absolute top-6 right-6 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all"
                style={{
                  borderColor: isSelected
                    ? colors.brand.primary
                    : `${colors.utility.primaryText}30`,
                  backgroundColor: isSelected
                    ? colors.brand.primary
                    : 'transparent',
                }}
              >
                {isSelected && (
                  <svg
                    className="w-3.5 h-3.5 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={3}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default BillingCycleStep;
