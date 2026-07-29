// src/components/onboarding/OnboardingLayout.tsx
// Premium onboarding layout — header-integrated navigation
import React, { useEffect, useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useOnboarding } from '@/hooks/queries/useOnboarding';
import { useTenantProfile } from '@/hooks/useTenantProfile';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import {
  Loader2,
  AlertCircle,
  X,
  ChevronLeft,
  ChevronRight,
  SkipForward,
} from 'lucide-react';
import { OnboardingUtils } from '@/types/onboardingTypes';
import JourneyRail from './JourneyRail';
import { resolveJourney, normaliseJourneyPersona } from './journey';
import toast from 'react-hot-toast';

interface OnboardingLayoutProps {
  children?: React.ReactNode;
}

const OnboardingLayout: React.FC<OnboardingLayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isDarkMode, currentTheme } = useTheme();
  const { currentTenant, user } = useAuth();

  const {
    isLoading,
    isSubmitting,
    needsOnboarding,
    isOnboardingComplete,
    currentStep,
    currentStepId,
    totalSteps,
    completedSteps,
    skippedSteps,
    progressPercentage,
    estimatedTimeRemaining,
    canGoBack,
    canGoForward,
    canSkip,
    completeStep,
    skipStep,
    goToNextStep,
    goToPreviousStep,
    completeOnboarding,
    initializeOnboarding,
    refreshStatus,
    error,
  } = useOnboarding();

  // Tenant Profile Hook for business profile steps
  const {
    formData: tenantFormData,
    fetchProfile: fetchTenantProfile,
    updateField: updateTenantField,
    handleLogoChange: handleTenantLogoChange,
    submitProfile,
  } = useTenantProfile({ isOnboarding: true });

  // With isOnboarding: true the hook deliberately skips its own auto-fetch
  // (useTenantProfile.ts:154, 167, 188), so formData stays empty unless
  // something asks for it. The journey below needs the persona to know
  // whether this tenant sees a pricing step or an assets step, so fetch it
  // once here. This layout is the parent route: it mounts once for the whole
  // onboarding session, not per step, so this is a single request.
  useEffect(() => {
    fetchTenantProfile?.();
    // fetchProfile is stable in the existing hook; re-running would loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTenant?.id]);

  // ── Unified wizard ────────────────────────────────────────────────────────
  // The header used to draw its dots from OnboardingUtils.getAllSteps(), the
  // LEGACY 11-step list. Almost no VaNi route appears in it, so the lookup
  // returned -1 and the counter rendered "0 / 11" with no dot marked current —
  // while the body of the same screen said "Step 7 of 9". Three step models,
  // three different answers.
  //
  // For the express journey the header now renders the SAME JourneyRail the
  // express screens render, from the SAME model, so the numbers agree end to
  // end. resolveJourney returns null for anything else — the long form, and
  // therefore BBB and every existing chapter, falls through to the original
  // markup below completely unchanged.
  const personaSource = tenantFormData as
    | { persona?: unknown; business_type_id?: unknown }
    | undefined;
  const journeyPersona = normaliseJourneyPersona(
    personaSource?.persona ?? personaSource?.business_type_id
  );
  const journey = resolveJourney(location.pathname, journeyPersona);

  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;
  const allSteps = OnboardingUtils.getAllSteps();
  const isCompletePage = location.pathname === '/onboarding/complete' ||
                         location.pathname === '/onboarding/done' ||
                         location.pathname === '/onboarding/pricing-review' ||
                         location.pathname === '/onboarding/equipment-confirm';

  // Track local UI step from URL
  const [uiStepId, setUiStepId] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Business profile data accumulation (for onboarding tracking)
  const [businessProfileData, setBusinessProfileData] = useState<Record<string, any>>({});

  // Custom step labels override
  const stepLabelOverrides: Record<string, string> = {
    'business-basic': 'Business Profile',
    'business-branding': 'Industry',
    'served-industries': 'Industries You Serve',
    'business-preferences': 'Branding',
  };

  // Steps that have their own submit buttons (hide header Continue)
  const stepsWithOwnButtons = [
    'business-details',
    'persona-selection',
    'theme-selection',
    'industry-selection',
    'vani-consent',
    'resource-pick',
    'business-basic',
    'business-branding',
    'served-industries',
    'business-preferences',
    'storage-setup',
    'vani-working',
    'pricing-review',
    'equipment-confirm',
    // Both of these render their own Continue and drive their own navigation,
    // but neither was listed here. currentIndex is -1 for them (they are not
    // in the legacy allSteps), so the header's Continue computed
    // allSteps[-1 + 1] = allSteps[0] and would have thrown the tenant back to
    // the legacy 'welcome' screen. Listing them hides that second button.
    'terms-conditions',
    'lov-setup',
  ];

  useEffect(() => {
    const pathParts = location.pathname.split('/');
    const stepFromPath = pathParts[pathParts.length - 1];
    setUiStepId(stepFromPath);
  }, [location.pathname]);

  // Initialize onboarding if needed
  useEffect(() => {
    const initOnboarding = async () => {
      if (!isLoading && needsOnboarding && !currentStepId && !isCompletePage) {
        try {
          await initializeOnboarding();
        } catch (err) {
          console.error('Failed to initialize onboarding:', err);
          toast.error('Failed to initialize onboarding');
        }
      }
    };
    initOnboarding();
  }, [needsOnboarding, currentStepId, isLoading, isCompletePage]);

  // Redirect if onboarding is already complete
  useEffect(() => {
    if (!isLoading && isOnboardingComplete && !isCompletePage) {
      toast.success('Onboarding already completed!');
      navigate('/ops/cockpit');
    }
  }, [isOnboardingComplete, isLoading, isCompletePage, navigate]);

  // ════════════════════════════════════════════════════════════════
  // STEP COMPLETION LOGIC (preserved from original)
  // ════════════════════════════════════════════════════════════════

  const handleCompleteStep = async (data?: Record<string, any>) => {
    if (isProcessing) return;

    setIsProcessing(true);

    try {
      const currentIndex = allSteps.findIndex((s) => s.id === uiStepId);
      const nextStep = allSteps[currentIndex + 1];

      // Business profile steps that need data accumulation
      const businessSteps = ['business-basic', 'business-branding', 'business-preferences'];

      if (businessSteps.includes(uiStepId)) {
        const isEmptyData = !data || Object.keys(data).length === 0;

        if (isEmptyData) {
          toast.success('Continuing to next step');
          if (nextStep) {
            navigate(nextStep.path || `/onboarding/${nextStep.id}`);
          } else {
            navigate('/onboarding/complete');
          }
          setIsProcessing(false);
          return;
        }

        const updatedBusinessData = { ...businessProfileData, ...data };
        setBusinessProfileData(updatedBusinessData);

        if (uiStepId === 'business-preferences') {
          toast.loading('Saving your business profile...', { id: 'saving-profile' });

          const profileSaved = await submitProfile();
          if (!profileSaved) {
            toast.error('Failed to save business profile', { id: 'saving-profile' });
            setIsProcessing(false);
            return;
          }
          toast.success('Business profile saved successfully!', { id: 'saving-profile' });

          toast.loading('Completing onboarding step...', { id: 'completing-step' });
          const success = await completeStep('business-preferences', updatedBusinessData);

          if (success) {
            toast.success('Step completed!', { id: 'completing-step' });
            await refreshStatus();
            setBusinessProfileData({});

            if (nextStep) {
              navigate(nextStep.path || `/onboarding/${nextStep.id}`);
            } else {
              navigate('/onboarding/complete');
            }
          } else {
            toast.error('Failed to complete step', { id: 'completing-step' });
          }
        } else {
          toast.success('Progress saved');
          if (nextStep) {
            navigate(nextStep.path || `/onboarding/${nextStep.id}`);
          }
        }
      } else {
        // Non-business steps
        const uiOnlySteps = ['welcome', 'storage-setup', 'theme-selection', 'served-industries'];

        if (uiOnlySteps.includes(uiStepId)) {
          toast.success('Step completed');
          if (nextStep) {
            navigate(nextStep.path || `/onboarding/${nextStep.id}`);
          }
        } else {
          toast.loading('Saving...', { id: 'saving-step' });
          const success = await completeStep(uiStepId as any, data);

          if (success) {
            toast.success('Step completed!', { id: 'saving-step' });
            await refreshStatus();
            if (nextStep) {
              navigate(nextStep.path || `/onboarding/${nextStep.id}`);
            } else {
              navigate('/onboarding/complete');
            }
          } else {
            toast.error('Failed to complete step', { id: 'saving-step' });
          }
        }
      }
    } catch (err: any) {
      console.error('Error in handleCompleteStep:', err);
      toast.error(err?.message || 'An error occurred');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSkipStep = async () => {
    if (isProcessing) return;

    setIsProcessing(true);
    try {
      const currentIndex = allSteps.findIndex((s) => s.id === uiStepId);
      const nextStep = allSteps[currentIndex + 1];

      if (uiStepId && canSkip) {
        toast.loading('Skipping step...', { id: 'skip-step' });
        const success = await skipStep(uiStepId as any);

        if (success) {
          toast.success('Step skipped', { id: 'skip-step' });
          await refreshStatus();
          if (nextStep) {
            navigate(nextStep.path || `/onboarding/${nextStep.id}`);
          }
        } else {
          toast.error('Failed to skip step', { id: 'skip-step' });
        }
      }
    } catch (err: any) {
      console.error('Error in handleSkipStep:', err);
      toast.error(err?.message || 'An error occurred');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFinish = async () => {
    toast.loading('Completing onboarding...', { id: 'finish-onboarding' });
    try {
      await completeOnboarding();
      toast.success('Onboarding completed successfully!', { id: 'finish-onboarding' });
    } catch (err: any) {
      console.error('Error completing onboarding:', err);
      toast.error(err?.message || 'Failed to complete onboarding', { id: 'finish-onboarding' });
    }
  };

  const handleGoToPreviousStep = () => {
    const currentIndex = allSteps.findIndex((s) => s.id === uiStepId);
    if (currentIndex > 0) {
      const prevStep = allSteps[currentIndex - 1];
      navigate(prevStep.path || `/onboarding/${prevStep.id}`);
    }
  };

  const handleClose = () => {
    navigate('/ops/cockpit');
  };

  // ════════════════════════════════════════════════════════════════
  // DERIVED VALUES
  // ════════════════════════════════════════════════════════════════

  const getStepTitle = (stepId: string): string => {
    return stepLabelOverrides[stepId] || allSteps.find((s) => s.id === stepId)?.title || stepId;
  };

  const currentIndex = allSteps.findIndex((s) => s.id === uiStepId);
  const canGoBackIsland = currentIndex > 0;
  const isLastStep = currentIndex === allSteps.length - 1;
  const showIslandContinue = !stepsWithOwnButtons.includes(uiStepId);
  const currentStepDef = allSteps.find((s) => s.id === uiStepId);
  const isStepSkippable = currentStepDef ? !currentStepDef.isRequired : false;

  // ════════════════════════════════════════════════════════════════
  // LOADING STATE
  // ════════════════════════════════════════════════════════════════

  if (isLoading) {
    return (
      <div
        className="h-screen flex items-center justify-center"
        style={{ backgroundColor: colors.utility.primaryBackground }}
      >
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4" style={{ color: colors.brand.primary }} />
          <p style={{ color: colors.utility.secondaryText }}>Loading onboarding...</p>
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════
  // ERROR STATE
  // ════════════════════════════════════════════════════════════════

  if (error && !needsOnboarding) {
    return (
      <div
        className="h-screen flex items-center justify-center"
        style={{ backgroundColor: colors.utility.primaryBackground }}
      >
        <div className="text-center max-w-md">
          <AlertCircle className="w-12 h-12 mx-auto mb-4" style={{ color: colors.semantic.error }} />
          <h2 className="text-xl font-semibold mb-2" style={{ color: colors.utility.primaryText }}>
            Onboarding Error
          </h2>
          <p className="mb-6" style={{ color: colors.utility.secondaryText }}>
            {error}
          </p>
          <button
            onClick={() => navigate('/ops/cockpit')}
            className="px-6 py-2 rounded-md transition-colors hover:opacity-90"
            style={{ backgroundColor: colors.brand.primary, color: '#ffffff' }}
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════
  // MAIN LAYOUT
  // ════════════════════════════════════════════════════════════════

  return (
    <div
      className="h-screen flex flex-col overflow-hidden"
      style={{ backgroundColor: colors.utility.primaryBackground }}
    >
      {/* ─── Premium Header ────────────────────────────────────── */}
      <div
        className="flex-shrink-0 px-6 py-4 flex items-center justify-between border-b"
        style={{
          backgroundColor: isDarkMode
            ? 'rgba(17, 24, 39, 0.95)'
            : 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(12px) saturate(180%)',
          WebkitBackdropFilter: 'blur(12px) saturate(180%)',
          borderColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
        }}
      >
        {/* Left: Logo + Step title */}
        <div className="flex items-center gap-4">
          {/* CN Badge */}
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold text-white"
            style={{ backgroundColor: colors.brand.primary }}
          >
            CN
          </div>

          <div>
            <h1 className="text-base font-semibold" style={{ color: colors.utility.primaryText }}>
              {/* On the express journey the rail's own label is the truth —
                  getStepTitle reads the legacy registry, which has no entry
                  for these routes and falls back to 'Getting Started'. */}
              {journey
                ? journey.steps[journey.currentIndex]?.label
                : getStepTitle(uiStepId) || 'Getting Started'}
            </h1>
            <p className="text-xs" style={{ color: colors.utility.secondaryText }}>
              {currentStepDef?.description || 'Begin your setup journey'}
            </p>
          </div>
        </div>

        {/* Center: Progress — the shared wizard on the express journey, the
            original legacy dots everywhere else. */}
        {journey ? (
          <div className="hidden md:flex items-center">
            <JourneyRail
              steps={journey.steps}
              currentIndex={journey.currentIndex}
              compact
              accent={colors.brand.primary}
              done={colors.semantic.success}
              muted={colors.utility.secondaryText}
              onAccent="#ffffff"
            />
          </div>
        ) : (
        <div className="hidden md:flex items-center gap-1.5">
          {allSteps.map((step, index) => {
            const isCompleted = completedSteps.includes(step.id) || skippedSteps.includes(step.id);
            const isCurrent = index === currentIndex;

            return (
              <div
                key={step.id}
                className="h-1.5 rounded-full transition-all duration-300 cursor-pointer"
                style={{
                  width: isCurrent ? '28px' : '10px',
                  backgroundColor: isCurrent
                    ? colors.brand.primary
                    : isCompleted
                      ? colors.semantic.success
                      : isDarkMode
                        ? 'rgba(255, 255, 255, 0.15)'
                        : 'rgba(0, 0, 0, 0.12)',
                }}
                title={getStepTitle(step.id)}
                onClick={() => navigate(step.path || `/onboarding/${step.id}`)}
              />
            );
          })}
        </div>
        )}

        {/* Right: Navigation + Step counter + Close */}
        <div className="flex items-center gap-2">
          {/* Skip (optional steps only) */}
          {!isCompletePage && isStepSkippable && !isLastStep && (
            <button
              onClick={handleSkipStep}
              disabled={isSubmitting || isProcessing}
              className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-all hover:opacity-80 disabled:opacity-40"
              style={{
                backgroundColor: isDarkMode
                  ? 'rgba(255, 255, 255, 0.08)'
                  : 'rgba(0, 0, 0, 0.05)',
                color: colors.utility.secondaryText,
              }}
            >
              <SkipForward className="w-3.5 h-3.5" />
              Skip
            </button>
          )}

          {/* Back */}
          {!isCompletePage && (
            <button
              onClick={handleGoToPreviousStep}
              disabled={!canGoBackIsland || isSubmitting || isProcessing}
              className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:opacity-80"
              style={{
                backgroundColor: isDarkMode
                  ? 'rgba(255, 255, 255, 0.08)'
                  : 'rgba(0, 0, 0, 0.05)',
                color: colors.utility.primaryText,
              }}
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              Back
            </button>
          )}

          {/* Continue (steps without own buttons) */}
          {!isCompletePage && showIslandContinue && (
            <button
              onClick={() => handleCompleteStep()}
              disabled={isSubmitting || isProcessing}
              className="flex items-center gap-1 px-4 py-1.5 rounded-full text-xs font-medium text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90"
              style={{ backgroundColor: colors.brand.primary }}
            >
              {isSubmitting || isProcessing ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  Continue
                  <ChevronRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          )}

          {/* Divider */}
          <div
            className="w-px h-5 mx-1"
            style={{
              backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
            }}
          />

          {/* Step counter. On the express journey JourneyRail already carries
              the count, so a second one here would contradict it on narrow
              screens where the rail is hidden. */}
          {!journey && (
            <span
              className="text-xs font-medium px-2.5 py-1 rounded-full"
              style={{
                backgroundColor: colors.brand.primary + '15',
                color: colors.brand.primary,
              }}
            >
              {currentIndex + 1} / {allSteps.length}
            </span>
          )}
          {journey && (
            <span
              className="text-xs font-medium px-2.5 py-1 rounded-full md:hidden"
              style={{
                backgroundColor: colors.brand.primary + '15',
                color: colors.brand.primary,
              }}
            >
              {journey.currentIndex + 1} / {journey.steps.length}
            </span>
          )}

          {/* Close */}
          <button
            onClick={handleClose}
            className="p-1.5 rounded-full transition-colors hover:opacity-80"
            style={{
              backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
            }}
            title="Exit onboarding"
          >
            <X className="w-4 h-4" style={{ color: colors.utility.secondaryText }} />
          </button>
        </div>
      </div>

      {/* ─── Step Content ──────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        <div className="h-full pb-6">
          <Outlet
            context={{
              onComplete: handleCompleteStep,
              onSkip: handleSkipStep,
              onFinish: handleFinish,
              isSubmitting: isSubmitting || isProcessing,
              stepData: {},
              updateTenantField,
              handleTenantLogoChange,
              submitProfile,
            }}
          />
        </div>
      </div>

    </div>
  );
};

export default OnboardingLayout;
