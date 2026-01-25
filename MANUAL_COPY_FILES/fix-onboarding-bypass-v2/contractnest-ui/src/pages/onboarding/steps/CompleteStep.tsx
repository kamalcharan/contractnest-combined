import React, { useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import {
  CheckCircle2,
  Rocket,
  Shield,
  FlaskConical,
  ArrowRight,
  Sparkles,
  Building2,
  Settings,
  Users,
  FileText
} from 'lucide-react';

interface OnboardingStepContext {
  onComplete: (data?: Record<string, any>) => void;
  onSkip: () => void;
  isSubmitting: boolean;
}

const CompleteStep: React.FC = () => {
  const navigate = useNavigate();
  const { onComplete, isSubmitting } = useOutletContext<OnboardingStepContext>();
  const { isDarkMode, currentTheme } = useTheme();
  const { user, currentTenant, markOnboardingComplete } = useAuth();
  const [isCompleting, setIsCompleting] = useState(false);

  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  const handleGetStarted = async () => {
    setIsCompleting(true);
    try {
      await onComplete({ acknowledged: true });
      // Mark onboarding as complete in AuthContext (updates state + sessionStorage)
      markOnboardingComplete();
      // Navigate to dashboard after completion
      navigate('/dashboard');
    } catch (error) {
      console.error('Error completing onboarding:', error);
      setIsCompleting(false);
    }
  };

  const highlights = [
    {
      icon: Building2,
      title: 'Business Profile',
      description: 'Your business identity is configured'
    },
    {
      icon: Settings,
      title: 'Quick Start Data',
      description: 'Required data has been set up for quick start'
    },
    {
      icon: Users,
      title: 'User Settings',
      description: 'Your preferences are saved'
    },
    {
      icon: FileText,
      title: 'Ready to Create',
      description: 'Start creating contracts immediately'
    }
  ];

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-3xl mx-auto">
          {/* Success Header */}
          <div className="text-center mb-8">
            <div
              className="inline-flex items-center justify-center w-20 h-20 rounded-full mb-6"
              style={{
                backgroundColor: '#10B98120',
                color: '#10B981'
              }}
            >
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <h1
              className="text-3xl font-bold mb-3"
              style={{ color: colors.utility.primaryText }}
            >
              You're All Set, {user?.first_name || 'there'}!
            </h1>

            <p
              className="text-lg mb-2"
              style={{ color: colors.brand.primary }}
            >
              <Sparkles className="inline w-5 h-5 mr-2" />
              Your workspace has been configured and is ready to use
            </p>

            <p
              className="text-base max-w-2xl mx-auto"
              style={{ color: colors.utility.secondaryText }}
            >
              ContractNest is now set up for <strong>{currentTenant?.name || 'your organization'}</strong>.
              You can start creating contracts, managing contacts, and tracking your service agreements right away.
            </p>
          </div>

          {/* What's Configured */}
          <div
            className="rounded-xl p-6 mb-6"
            style={{
              backgroundColor: isDarkMode ? colors.utility.surface : '#f8fafc',
              border: `1px solid ${isDarkMode ? colors.utility.border : '#e2e8f0'}`
            }}
          >
            <h3
              className="text-lg font-semibold mb-4 flex items-center gap-2"
              style={{ color: colors.utility.primaryText }}
            >
              <Rocket className="w-5 h-5" style={{ color: colors.brand.primary }} />
              What's Been Set Up
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {highlights.map((item, index) => {
                const Icon = item.icon;
                return (
                  <div
                    key={index}
                    className="flex items-start gap-3 p-3 rounded-lg"
                    style={{
                      backgroundColor: isDarkMode ? colors.utility.background : '#ffffff',
                      border: `1px solid ${isDarkMode ? colors.utility.border : '#e2e8f0'}`
                    }}
                  >
                    <div
                      className="p-2 rounded-lg"
                      style={{
                        backgroundColor: colors.brand.primary + '15',
                        color: colors.brand.primary
                      }}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <h4
                        className="font-medium text-sm"
                        style={{ color: colors.utility.primaryText }}
                      >
                        {item.title}
                      </h4>
                      <p
                        className="text-xs"
                        style={{ color: colors.utility.secondaryText }}
                      >
                        {item.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Environment Info */}
          <div
            className="rounded-xl p-6 mb-8"
            style={{
              backgroundColor: isDarkMode ? '#1e293b' : '#eff6ff',
              border: `1px solid ${isDarkMode ? '#334155' : '#bfdbfe'}`
            }}
          >
            <h3
              className="text-lg font-semibold mb-4 flex items-center gap-2"
              style={{ color: colors.utility.primaryText }}
            >
              <FlaskConical className="w-5 h-5" style={{ color: '#3b82f6' }} />
              Live & Test Environments
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Live Environment */}
              <div
                className="p-4 rounded-lg"
                style={{
                  backgroundColor: isDarkMode ? '#065f46' + '30' : '#d1fae5',
                  border: `1px solid ${isDarkMode ? '#10b981' : '#6ee7b7'}`
                }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="w-5 h-5" style={{ color: '#10b981' }} />
                  <h4
                    className="font-semibold"
                    style={{ color: isDarkMode ? '#6ee7b7' : '#065f46' }}
                  >
                    Live Environment
                  </h4>
                </div>
                <p
                  className="text-sm"
                  style={{ color: isDarkMode ? '#a7f3d0' : '#047857' }}
                >
                  Your production workspace. All contracts, contacts, and data here are real and will be used for actual business operations.
                </p>
              </div>

              {/* Test Environment */}
              <div
                className="p-4 rounded-lg"
                style={{
                  backgroundColor: isDarkMode ? '#7c3aed' + '20' : '#ede9fe',
                  border: `1px solid ${isDarkMode ? '#8b5cf6' : '#c4b5fd'}`
                }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <FlaskConical className="w-5 h-5" style={{ color: '#8b5cf6' }} />
                  <h4
                    className="font-semibold"
                    style={{ color: isDarkMode ? '#c4b5fd' : '#5b21b6' }}
                  >
                    Test Environment
                  </h4>
                </div>
                <p
                  className="text-sm"
                  style={{ color: isDarkMode ? '#ddd6fe' : '#6d28d9' }}
                >
                  A safe sandbox to explore features, try workflows, and train your team. Nothing here affects your live data.
                </p>
              </div>
            </div>

            <p
              className="text-sm mt-4 text-center"
              style={{ color: colors.utility.secondaryText }}
            >
              Switch between environments anytime using the toggle in the top navigation bar.
            </p>
          </div>

          {/* CTA Button */}
          <div className="text-center">
            <button
              onClick={handleGetStarted}
              disabled={isSubmitting || isCompleting}
              className="inline-flex items-center gap-2 px-8 py-4 rounded-xl text-lg font-semibold transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
              style={{
                backgroundColor: colors.brand.primary,
                color: '#ffffff',
                boxShadow: `0 4px 14px ${colors.brand.primary}40`
              }}
            >
              {isSubmitting || isCompleting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Finishing Setup...
                </>
              ) : (
                <>
                  Start Using ContractNest
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>

            <p
              className="text-sm mt-4"
              style={{ color: colors.utility.secondaryText }}
            >
              You can always adjust your settings later from the Settings menu.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompleteStep;
