// src/hooks/queries/useOnboarding.ts
// Onboarding status for the VaNi onboarding: is this tenant still onboarding,
// which VaNi steps are recorded, and where a returning tenant resumes.
//
// The legacy step machinery that used to live here (a numeric current_step
// mapped onto the old 11-step list, complete/skip/next/previous helpers for
// the legacy screens) was removed with those screens (batch
// vani-onboarding-cleanup). VaNi steps record themselves through
// utils/onboarding/completeVaniStep; the resume rule is resumePathFor in
// components/onboarding/journey.ts.

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { onboardingService } from '../../services/onboarding.service';
import { OnboardingStatusResponse } from '../../types/onboardingTypes';
import { resumePathFor, ResumeTarget } from '@/components/onboarding/journey';

export interface UseOnboardingReturn {
  isLoading: boolean;
  error: string | null;
  needsOnboarding: boolean;
  isOnboardingComplete: boolean;
  /** Recorded VaNi steps — completed and skipped */
  doneSteps: string[];
  stepData: Record<string, any>;
  /** Where a returning tenant picks up (only meaningful while onboarding) */
  resumeTarget: ResumeTarget;
  refreshStatus: () => Promise<void>;
}

export const useOnboarding = (): UseOnboardingReturn => {
  const { currentTenant, isAuthenticated } = useAuth();

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusData, setStatusData] = useState<OnboardingStatusResponse | null>(null);

  const fetchStatus = useCallback(async () => {
    if (!isAuthenticated || !currentTenant?.id) {
      setIsLoading(false);
      return;
    }
    try {
      setStatusData(await onboardingService.getStatus());
      setError(null);
    } catch (err: any) {
      // No record yet (a tenant that never started): create it, then read it.
      if (err.message?.includes('not found') || err.message?.includes('not initialized')) {
        try {
          await onboardingService.initialize();
          setStatusData(await onboardingService.getStatus());
          setError(null);
        } catch (initErr: any) {
          console.error('[onboarding] Failed to initialize:', initErr);
          setError(initErr.message);
        }
      } else {
        console.error('[onboarding] Failed to load status:', err);
        setError(err.message);
      }
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, currentTenant?.id]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // The status endpoint nests progress under `data` (see OnboardingStatusResponse).
  // Reading it from the top level returned nothing, so every returning tenant
  // looked brand new and was sent back to /start.
  const progress = statusData?.data;
  const stepData = progress?.step_data || statusData?.onboarding?.step_data || {};
  const doneSteps = useMemo(
    () => Array.from(new Set([
      ...(progress?.completed_steps || statusData?.completed_steps || []),
      ...(progress?.skipped_steps || statusData?.skipped_steps || []),
    ])),
    [statusData, progress]
  );
  const resumeTarget = useMemo(() => resumePathFor(doneSteps, stepData), [doneSteps, stepData]);
  const isOnboardingComplete =
    progress?.is_complete ?? statusData?.onboarding?.is_completed ?? (statusData ? !statusData.needs_onboarding : false);

  return {
    isLoading,
    error,
    needsOnboarding: statusData?.needs_onboarding ?? false,
    isOnboardingComplete,
    doneSteps,
    stepData,
    resumeTarget,
    refreshStatus: fetchStatus,
  };
};

export default useOnboarding;
