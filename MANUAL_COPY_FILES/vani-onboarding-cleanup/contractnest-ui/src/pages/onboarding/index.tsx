// src/pages/onboarding/index.tsx
// /onboarding — the single entry into the VaNi onboarding.
//
// Registration, login with onboarding unfinished, the "Getting Started" menu
// entry and every retired onboarding URL all land here. It waits for the
// saved status, then opens the first VaNi screen this tenant has not finished
// (resumePathFor in components/onboarding/journey.ts), passing the business
// type the later screens read from route state.
//
// It used to redirect on the first render, before the status arrived — the
// hook's default then read as "nothing done" and every returning tenant was
// sent back to /start.

import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOnboarding } from '@/hooks/queries/useOnboarding';
import { VaNiLoader } from '@/components/common/loaders';

const OnboardingIndexPage: React.FC = () => {
  const navigate = useNavigate();
  const { isLoading, isOnboardingComplete, resumeTarget } = useOnboarding();

  useEffect(() => {
    if (isLoading) return;
    if (isOnboardingComplete) {
      navigate('/', { replace: true });
      return;
    }
    navigate(resumeTarget.path, { replace: true, state: resumeTarget.state });
  }, [isLoading, isOnboardingComplete, resumeTarget, navigate]);

  return (
    <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <VaNiLoader size="md" message="Picking up where you left off…" />
    </div>
  );
};

export default OnboardingIndexPage;
