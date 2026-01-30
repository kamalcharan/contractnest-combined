// src/components/contracts/ContractWizard/steps/PathSelectionStep.tsx
// Step 0: Choose creation mode (RFQ/Contract) then path (Template/Scratch)
// Mode selection only shown for vendor contracts
import React from 'react';
import { LayoutTemplate, PenLine, Clock, Zap, Sparkles, Settings, FileQuestion, FileSignature } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

export type ContractPath = 'template' | 'scratch' | null;
export type WizardMode = 'contract' | 'rfq';

interface PathSelectionStepProps {
  selectedPath: ContractPath;
  onSelectPath: (path: ContractPath) => void;
  // Mode selection (vendor contracts only)
  showModeSelection?: boolean;
  wizardMode?: WizardMode;
  onModeChange?: (mode: WizardMode) => void;
}

interface PathOption {
  id: ContractPath;
  title: string;
  description: string;
  icon: React.ElementType;
  features: { icon: React.ElementType; text: string }[];
  recommended?: boolean;
}

const pathOptions: PathOption[] = [
  {
    id: 'template',
    title: 'From Template',
    description: 'Start with a pre-built template and customize it for your buyer',
    icon: LayoutTemplate,
    recommended: true,
    features: [
      { icon: Clock, text: 'Quick setup in minutes' },
      { icon: Zap, text: 'Pre-configured blocks' },
      { icon: Sparkles, text: 'Industry best practices' },
    ],
  },
  {
    id: 'scratch',
    title: 'Create from Scratch',
    description: 'Build a custom contract by selecting individual service blocks',
    icon: PenLine,
    features: [
      { icon: Settings, text: 'Full customization' },
      { icon: Zap, text: 'Flexible block assembly' },
      { icon: Sparkles, text: 'Tailored to your needs' },
    ],
  },
];

interface ModeOption {
  id: WizardMode;
  title: string;
  description: string;
  icon: React.ElementType;
}

const modeOptions: ModeOption[] = [
  {
    id: 'rfq',
    title: 'Create RFQ',
    description: 'Send a Request for Quotation to multiple vendors',
    icon: FileQuestion,
  },
  {
    id: 'contract',
    title: 'Create Contract',
    description: 'Create a direct contract with a vendor',
    icon: FileSignature,
  },
];

const PathSelectionStep: React.FC<PathSelectionStepProps> = ({
  selectedPath,
  onSelectPath,
  showModeSelection = false,
  wizardMode = 'contract',
  onModeChange,
}) => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
      {/* Mode Selection (vendor contracts only) */}
      {showModeSelection && (
        <div className="w-full max-w-3xl mb-8">
          <div className="text-center mb-6">
            <h2
              className="text-2xl font-bold mb-3"
              style={{ color: colors.utility.primaryText }}
            >
              What would you like to create?
            </h2>
            <p
              className="text-sm max-w-md mx-auto"
              style={{ color: colors.utility.secondaryText }}
            >
              Choose between sending an RFQ to vendors or creating a direct contract
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            {modeOptions.map((option) => {
              const isSelected = wizardMode === option.id;
              const ModeIcon = option.icon;

              return (
                <button
                  key={option.id}
                  onClick={() => onModeChange?.(option.id)}
                  className="relative flex items-center gap-4 p-5 rounded-xl border-2 text-left transition-all duration-300 hover:shadow-md"
                  style={{
                    backgroundColor: isSelected
                      ? `${colors.brand.primary}08`
                      : colors.utility.secondaryBackground,
                    borderColor: isSelected
                      ? colors.brand.primary
                      : `${colors.utility.primaryText}15`,
                  }}
                >
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors"
                    style={{
                      backgroundColor: isSelected
                        ? colors.brand.primary
                        : `${colors.brand.primary}15`,
                    }}
                  >
                    <ModeIcon
                      className="w-6 h-6"
                      style={{ color: isSelected ? 'white' : colors.brand.primary }}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3
                      className="text-base font-semibold"
                      style={{ color: colors.utility.primaryText }}
                    >
                      {option.title}
                    </h3>
                    <p
                      className="text-xs mt-0.5"
                      style={{ color: colors.utility.secondaryText }}
                    >
                      {option.description}
                    </p>
                  </div>
                  {/* Selection indicator */}
                  <div
                    className="w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0"
                    style={{
                      borderColor: isSelected ? colors.brand.primary : `${colors.utility.primaryText}30`,
                      backgroundColor: isSelected ? colors.brand.primary : 'transparent',
                    }}
                  >
                    {isSelected && (
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Divider */}
          <div className="flex items-center gap-4 mb-6">
            <div className="flex-1 h-px" style={{ backgroundColor: `${colors.utility.primaryText}15` }} />
            <span className="text-xs font-medium" style={{ color: colors.utility.secondaryText }}>
              Then choose how to start
            </span>
            <div className="flex-1 h-px" style={{ backgroundColor: `${colors.utility.primaryText}15` }} />
          </div>
        </div>
      )}

      {/* Path Selection Header (only when no mode selection above) */}
      {!showModeSelection && (
        <div className="text-center mb-10">
          <h2
            className="text-2xl font-bold mb-3"
            style={{ color: colors.utility.primaryText }}
          >
            How would you like to create your contract?
          </h2>
          <p
            className="text-sm max-w-md mx-auto"
            style={{ color: colors.utility.secondaryText }}
          >
            Choose your starting point. You can always customize everything in the next steps.
          </p>
        </div>
      )}

      {/* Path Options Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-3xl">
        {pathOptions.map((option) => {
          const isSelected = selectedPath === option.id;
          const IconComponent = option.icon;

          return (
            <button
              key={option.id}
              onClick={() => onSelectPath(option.id)}
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
              {/* Recommended Badge */}
              {option.recommended && (
                <div
                  className="absolute -top-3 left-6 px-3 py-1 rounded-full text-xs font-semibold text-white"
                  style={{ backgroundColor: colors.brand.primary }}
                >
                  Recommended
                </div>
              )}

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
                className="text-sm mb-5"
                style={{ color: colors.utility.secondaryText }}
              >
                {option.description}
              </p>

              {/* Features */}
              <div className="space-y-2.5 mt-auto">
                {option.features.map((feature, index) => {
                  const FeatureIcon = feature.icon;
                  return (
                    <div key={index} className="flex items-center gap-2.5">
                      <FeatureIcon
                        className="w-4 h-4 flex-shrink-0"
                        style={{ color: colors.semantic.success }}
                      />
                      <span
                        className="text-sm"
                        style={{ color: colors.utility.secondaryText }}
                      >
                        {feature.text}
                      </span>
                    </div>
                  );
                })}
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

export default PathSelectionStep;
