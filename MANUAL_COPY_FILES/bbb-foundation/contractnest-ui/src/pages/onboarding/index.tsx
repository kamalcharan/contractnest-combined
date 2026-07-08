//src/pages/onboarding/indes.tsx
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOnboarding } from '@/hooks/queries/useOnboarding';

const OnboardingIndexPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentStepId } = useOnboarding();

  useEffect(() => {
    // Redirect to vani-intro for users who haven't passed the intro yet,
    // then resume from current step for those mid-onboarding.
    //
    // Both entry points land here:
    //   1. Registration → /onboarding (no currentStepId yet)
    //   2. Login with incomplete onboarding → /onboarding (currentStepId may be 'welcome')
    //
    // 'welcome' is included because it's the first real step — anyone at that
    // point hasn't experienced the VaNi intro yet and should see it first.
    const needsIntro = !currentStepId || currentStepId === 'user-profile' || currentStepId === 'welcome';
    if (needsIntro) {
      navigate('/onboarding/vani-intro', { replace: true });
    } else {
      // Resume from where they left off
      const stepPath = getStepPath(currentStepId);
      navigate(stepPath, { replace: true });
    }
  }, [currentStepId, navigate]);

  return null; // This is just a redirect page
};

const getStepPath = (stepId: string): string => {
  const stepPaths: Record<string, string> = {
    // Legacy onboarding steps
    'welcome': '/onboarding/welcome',
    'storage-setup': '/onboarding/storage-setup',
    'user-profile': '/onboarding/user-profile',
    'theme-selection': '/onboarding/theme-selection',
    'business-basic': '/onboarding/business-basic',
    'business-branding': '/onboarding/business-branding',
    'business-preferences': '/onboarding/business-preferences',
    'sequence-numbers': '/onboarding/sequence-numbers',
    'master-data': '/onboarding/master-data',
    'complete': '/onboarding/complete',
    // VaNi onboarding steps
    'vani-intro': '/onboarding/vani-intro',
    'business-details': '/onboarding/business-details',
    'persona-selection': '/onboarding/persona-selection',
    'industry-selection': '/onboarding/industry-selection',
    'served-industries': '/onboarding/served-industries',
    'vani-consent': '/onboarding/vani-consent',
    'vani-working': '/onboarding/vani-working',
    'lov-setup': '/onboarding/lov-setup',
  };

  // Any unrecognised step → restart VaNi intro (safe fallback)
  return stepPaths[stepId] || '/onboarding/vani-intro';
};

export default OnboardingIndexPage;