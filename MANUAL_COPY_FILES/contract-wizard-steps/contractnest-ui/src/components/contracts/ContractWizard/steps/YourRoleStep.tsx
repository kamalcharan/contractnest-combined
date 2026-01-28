// src/components/contracts/ContractWizard/steps/YourRoleStep.tsx
// Step 2: Your Role - Define whether you're the Client or Vendor in this contract
import React from 'react';
import { User, Building2, ArrowRight } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

export type ContractRole = 'client' | 'vendor' | null;

interface YourRoleStepProps {
  selectedRole: ContractRole;
  onSelectRole: (role: ContractRole) => void;
}

interface RoleOption {
  id: ContractRole;
  title: string;
  description: string;
  icon: React.ElementType;
  flowDescription: string;
}

const roleOptions: RoleOption[] = [
  {
    id: 'client',
    title: "I'm the Client",
    description: 'Hiring a vendor to provide services',
    icon: User,
    flowDescription: 'You will select a vendor and define what services you need',
  },
  {
    id: 'vendor',
    title: "I'm the Vendor",
    description: 'Providing services to a client',
    icon: Building2,
    flowDescription: 'You will select a client and define what services you offer',
  },
];

const YourRoleStep: React.FC<YourRoleStepProps> = ({
  selectedRole,
  onSelectRole,
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
          Your Role
        </h2>
        <p
          className="text-sm max-w-md mx-auto"
          style={{ color: colors.utility.secondaryText }}
        >
          Who are you in this contract?
        </p>
      </div>

      {/* Role Options Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-3xl">
        {roleOptions.map((option) => {
          const isSelected = selectedRole === option.id;
          const IconComponent = option.icon;

          return (
            <button
              key={option.id}
              onClick={() => onSelectRole(option.id)}
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
                className="text-sm mb-5"
                style={{ color: colors.utility.secondaryText }}
              >
                {option.description}
              </p>

              {/* Flow Description */}
              <div
                className="flex items-center gap-2 mt-auto pt-4 border-t"
                style={{ borderColor: `${colors.utility.primaryText}10` }}
              >
                <ArrowRight
                  className="w-4 h-4 flex-shrink-0"
                  style={{ color: colors.semantic.info }}
                />
                <span
                  className="text-xs"
                  style={{ color: colors.utility.secondaryText }}
                >
                  {option.flowDescription}
                </span>
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

export default YourRoleStep;
