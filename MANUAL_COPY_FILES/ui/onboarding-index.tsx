//src/pages/onboarding/indes.tsx
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOnboarding } from '@/hooks/queries/useOnboarding';

const OnboardingIndexPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentStepId } = useOnboarding();

  useEffect(() => {
    // Redirect to welcome or current step
    if (!currentStepId || currentStepId === 'user-profile') {
      // First time user - start with welcome
      navigate('/onboarding/welcome', { replace: true });
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
    'welcome': '/onboarding/welcome',
    'storage-setup': '/onboarding/storage-setup',
    'user-profile': '/onboarding/user-profile',
    'theme-selection': '/onboarding/theme-selection',
    'business-basic': '/onboarding/business-basic',
    'business-branding': '/onboarding/business-branding',
    'business-preferences': '/onboarding/business-preferences',
    'sequence-numbers': '/onboarding/sequence-numbers',
    'master-data': '/onboarding/master-data',
    'complete': '/onboarding/complete'
  };

  return stepPaths[stepId] || '/onboarding/welcome';
};

export default OnboardingIndexPage;