// src/pages/onboarding/steps/MasterDataStep.tsx
import React from 'react';
import { useOutletContext } from 'react-router-dom';
import { useTheme } from '@/contexts/ThemeContext';
import {
  Database,
  FileSpreadsheet,
  TestTube2,
  Package,
  Rocket,
  Clock,
  CheckCircle2,
  ArrowRight
} from 'lucide-react';

interface OnboardingStepContext {
  onComplete: (data?: Record<string, any>) => void;
  onSkip: () => void;
  isSubmitting: boolean;
}

const MasterDataStep: React.FC = () => {
  const { onComplete, isSubmitting } = useOutletContext<OnboardingStepContext>();
  const { isDarkMode, currentTheme } = useTheme();

  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  const upcomingFeatures = [
    {
      icon: FileSpreadsheet,
      title: 'Import Master Data',
      description: 'Bulk import your contacts, services, and pricing from Excel/CSV files',
      status: 'coming-soon'
    },
    {
      icon: Package,
      title: 'Seed Data Packages',
      description: 'Pre-configured industry templates with sample services, categories, and workflows',
      status: 'coming-soon'
    },
    {
      icon: TestTube2,
      title: 'Sample Test Data',
      description: 'Generate realistic sample data to explore features before going live',
      status: 'coming-soon'
    },
    {
      icon: Database,
      title: 'Quick Start Templates',
      description: 'Industry-specific starter kits with pre-built contracts and service templates',
      status: 'coming-soon'
    }
  ];

  const handleContinue = () => {
    // Mark as completed (even though it's a placeholder)
    onComplete({
      step: 'master-data',
      skipped_reason: 'feature_coming_soon',
      completed_at: new Date().toISOString()
    });
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <div
              className="inline-flex items-center justify-center w-20 h-20 rounded-full mb-4"
              style={{
                backgroundColor: colors.brand.primary + '15',
                color: colors.brand.primary
              }}
            >
              <Database className="w-10 h-10" />
            </div>

            <h1
              className="text-2xl font-bold mb-3"
              style={{ color: colors.utility.primaryText }}
            >
              Data Setup
            </h1>

            <p
              className="text-base max-w-xl mx-auto"
              style={{ color: colors.utility.secondaryText }}
            >
              Get started quickly with pre-configured data, import your existing records,
              or explore with sample data.
            </p>
          </div>

          {/* Coming Soon Badge */}
          <div
            className="flex items-center justify-center gap-2 mb-8 py-3 px-6 rounded-full mx-auto w-fit"
            style={{
              backgroundColor: colors.semantic.warning + '15',
              border: `1px solid ${colors.semantic.warning}30`
            }}
          >
            <Clock className="w-4 h-4" style={{ color: colors.semantic.warning }} />
            <span
              className="text-sm font-medium"
              style={{ color: colors.semantic.warning }}
            >
              These features are coming soon!
            </span>
          </div>

          {/* Feature Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            {upcomingFeatures.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div
                  key={index}
                  className="p-5 rounded-xl border relative overflow-hidden"
                  style={{
                    backgroundColor: colors.utility.secondaryBackground,
                    borderColor: colors.utility.primaryText + '10'
                  }}
                >
                  {/* Coming Soon Ribbon */}
                  <div
                    className="absolute top-3 right-3 text-xs px-2 py-1 rounded-full"
                    style={{
                      backgroundColor: colors.brand.primary + '15',
                      color: colors.brand.primary
                    }}
                  >
                    Coming Soon
                  </div>

                  <div
                    className="w-12 h-12 rounded-lg flex items-center justify-center mb-3"
                    style={{
                      backgroundColor: colors.brand.primary + '10',
                      color: colors.brand.primary
                    }}
                  >
                    <Icon className="w-6 h-6" />
                  </div>

                  <h3
                    className="font-semibold mb-2"
                    style={{ color: colors.utility.primaryText }}
                  >
                    {feature.title}
                  </h3>

                  <p
                    className="text-sm"
                    style={{ color: colors.utility.secondaryText }}
                  >
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>

          {/* What You Can Do Now Section */}
          <div
            className="p-6 rounded-xl border mb-6"
            style={{
              backgroundColor: colors.semantic.success + '08',
              borderColor: colors.semantic.success + '20'
            }}
          >
            <div className="flex items-start gap-4">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                style={{
                  backgroundColor: colors.semantic.success + '20',
                  color: colors.semantic.success
                }}
              >
                <Rocket className="w-5 h-5" />
              </div>
              <div>
                <h3
                  className="font-semibold mb-2"
                  style={{ color: colors.utility.primaryText }}
                >
                  You're Ready to Go!
                </h3>
                <p
                  className="text-sm mb-3"
                  style={{ color: colors.utility.secondaryText }}
                >
                  While we're building these exciting features, you can start using ContractNest right away:
                </p>
                <ul className="space-y-2">
                  {[
                    'Create contacts and service providers manually',
                    'Set up your first service contract',
                    'Define custom categories and services',
                    'Configure notifications and reminders'
                  ].map((item, idx) => (
                    <li
                      key={idx}
                      className="flex items-center gap-2 text-sm"
                      style={{ color: colors.utility.secondaryText }}
                    >
                      <CheckCircle2
                        className="w-4 h-4 flex-shrink-0"
                        style={{ color: colors.semantic.success }}
                      />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Continue Button */}
          <div className="flex justify-center">
            <button
              onClick={handleContinue}
              disabled={isSubmitting}
              className="flex items-center gap-2 px-8 py-3 rounded-lg font-medium transition-all hover:opacity-90 disabled:opacity-50"
              style={{
                backgroundColor: colors.brand.primary,
                color: '#ffffff'
              }}
            >
              {isSubmitting ? (
                'Processing...'
              ) : (
                <>
                  Continue to Complete Setup
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MasterDataStep;
