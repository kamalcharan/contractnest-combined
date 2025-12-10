// src/components/tenantprofile/ProfileWizardSteps.tsx
// Shared progress steps component for profile creation wizard
// Used by both GroupProfileDashboard and SmartProfile pages

import React from 'react';
import { useTheme } from '@/contexts/ThemeContext';

export type WizardStep = 'entry' | 'profile' | 'enhanced' | 'clusters' | 'success';

interface ProfileWizardStepsProps {
  currentStep: WizardStep;
  steps: WizardStep[];
  stepLabels?: Record<WizardStep, string>;
}

const defaultLabels: Record<WizardStep, string> = {
  entry: 'Profile',
  profile: 'Profile',
  enhanced: 'Enhance',
  clusters: 'Clusters',
  success: 'Done'
};

export const ProfileWizardSteps: React.FC<ProfileWizardStepsProps> = ({
  currentStep,
  steps,
  stepLabels = defaultLabels
}) => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;
  const currentIndex = steps.indexOf(currentStep);

  return (
    <div className="mb-8">
      <div className="flex items-center justify-center space-x-4">
        {steps.map((step, i) => (
          <React.Fragment key={step}>
            <div className="flex items-center space-x-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  currentStep === step ? 'ring-2 ring-offset-2' : ''
                }`}
                style={{
                  backgroundColor: currentIndex >= i
                    ? colors.brand.primary
                    : `${colors.utility.primaryText}20`,
                  color: currentIndex >= i
                    ? '#FFF'
                    : colors.utility.secondaryText,
                  '--tw-ring-color': colors.brand.primary
                } as React.CSSProperties}
              >
                {i + 1}
              </div>
              <span
                className="text-sm hidden sm:inline"
                style={{
                  color: currentStep === step ? colors.utility.primaryText : colors.utility.secondaryText
                }}
              >
                {stepLabels[step] || step}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                className="w-12 h-0.5"
                style={{
                  backgroundColor: currentIndex > i
                    ? colors.brand.primary
                    : `${colors.utility.primaryText}20`
                }}
              />
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

export default ProfileWizardSteps;
