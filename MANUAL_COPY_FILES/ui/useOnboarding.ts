// src/hooks/queries/useOnboarding.ts
// React hook for onboarding functionality

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { onboardingService } from '../../services/onboarding.service';
import toast from 'react-hot-toast';
import {
  OnboardingStatusResponse,
  TenantOnboarding,
  OnboardingStepStatus,
  OnboardingStepId,
  ONBOARDING_CONSTANTS,
  OnboardingUtils
} from '../../types/onboardingTypes';

interface UseOnboardingReturn {
  // State
  isLoading: boolean;
  isInitializing: boolean;
  isSubmitting: boolean;
  error: string | null;

  // Onboarding data
  needsOnboarding: boolean;
  isOnboardingComplete: boolean;
  currentStep: number;
  currentStepId: OnboardingStepId | null;
  totalSteps: number;
  completedSteps: string[];
  skippedSteps: string[];
  stepData: Record<string, any>;
  onboarding: TenantOnboarding | null;
  steps: OnboardingStepStatus[];

  // Progress
  progressPercentage: number;
  estimatedTimeRemaining: number;

  // Navigation
  canGoBack: boolean;
  canGoForward: boolean;
  canSkip: boolean;
  nextStepId: string | null;
  previousStepId: string | null;

  // Actions
  initializeOnboarding: () => Promise<void>;
  completeStep: (stepId: OnboardingStepId, data?: Record<string, any>) => Promise<boolean>;
  skipStep: (stepId: OnboardingStepId) => Promise<boolean>;
  updateProgress: (data?: Record<string, any>) => Promise<void>;
  completeOnboarding: () => Promise<void>;
  goToStep: (stepId: OnboardingStepId) => void;
  goToNextStep: () => void;
  goToPreviousStep: () => void;
  refreshStatus: () => Promise<void>;

  // Utilities
  getStepStatus: (stepId: OnboardingStepId) => 'pending' | 'in_progress' | 'completed' | 'skipped';
  isStepCompleted: (stepId: OnboardingStepId) => boolean;
  isStepSkipped: (stepId: OnboardingStepId) => boolean;
  canAccessStep: (stepId: OnboardingStepId) => boolean;
}

export const useOnboarding = (): UseOnboardingReturn => {
  const navigate = useNavigate();
  const { currentTenant, isAuthenticated } = useAuth();

  // State
  const [isLoading, setIsLoading] = useState(true);
  const [isInitializing, setIsInitializing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Onboarding data
  const [statusData, setStatusData] = useState<OnboardingStatusResponse | null>(null);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [isOnboardingComplete, setIsOnboardingComplete] = useState(false);

  // Derived state
  const onboarding = statusData?.onboarding || null;
  const steps = statusData?.steps || [];
  const currentStep = statusData?.current_step || 1;
  const totalSteps = statusData?.total_steps || ONBOARDING_CONSTANTS.TOTAL_STEPS;
  const completedSteps = statusData?.completed_steps || [];
  const skippedSteps = statusData?.skipped_steps || [];
  const stepData = onboarding?.step_data || {};

  // Calculate current step ID
  const currentStepId = OnboardingUtils.getStepIdBySequence(currentStep) as OnboardingStepId | null;

  // Calculate progress
  const progressPercentage = OnboardingUtils.calculateProgress(completedSteps, totalSteps);

  // Calculate remaining time
  const remainingSteps = OnboardingUtils.getAllSteps()
    .filter(step => !completedSteps.includes(step.id) && !skippedSteps.includes(step.id))
    .map(step => step.id as OnboardingStepId);
  const estimatedTimeRemaining = OnboardingUtils.getTotalEstimatedTime(remainingSteps);

  // Navigation state
  const nextStepId = OnboardingUtils.getNextStep(currentStep);
  const previousStepId = OnboardingUtils.getPreviousStep(currentStep);
  const canGoBack = currentStep > 1;
  const canGoForward = currentStep < totalSteps && nextStepId !== null;
  const canSkip = currentStepId ? onboardingService.canSkipStep(currentStepId) : false;

  /**
   * Map UI step IDs to backend step IDs
   */
  const getBackendStepId = (uiStepId: string): OnboardingStepId | null => {
    const stepMapping: Record<string, OnboardingStepId> = {
      'welcome': 'user-profile',
      'storage-setup': 'storage',
      'user-profile': 'user-profile',
      'theme-selection': 'user-profile',
      'business-basic': 'business-profile',
      'business-branding': 'business-profile',
      'business-preferences': 'business-profile',
      'master-data': 'data-setup',
      'complete': null
    };

    return stepMapping[uiStepId] || null;
  };

  /**
   * Fetch onboarding status
   */
  const fetchStatus = useCallback(async () => {
    if (!isAuthenticated || !currentTenant?.id) {
      setIsLoading(false);
      return;
    }

    try {
      const response = await onboardingService.getStatus();
      setStatusData(response);
      setNeedsOnboarding(response.needs_onboarding);
      setIsOnboardingComplete(response.onboarding?.is_completed || false);
      setError(null);
    } catch (err: any) {
      console.error('Error fetching onboarding status:', err);
      setError(err.message);
      
      // If onboarding not found, initialize it automatically
      if (err.message?.includes('not found') || err.message?.includes('not initialized')) {
        console.log('Onboarding not initialized, initializing now...');
        try {
          const initResponse = await onboardingService.initialize();
          console.log('Onboarding initialized:', initResponse);
          // Fetch status again after initialization
          const statusResponse = await onboardingService.getStatus();
          setStatusData(statusResponse);
          setNeedsOnboarding(statusResponse.needs_onboarding);
          setIsOnboardingComplete(statusResponse.onboarding?.is_completed || false);
          setError(null);
        } catch (initErr: any) {
          console.error('Failed to initialize onboarding:', initErr);
          setError(initErr.message);
        }
      }
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, currentTenant?.id]);

  /**
   * Initialize onboarding
   */
  const initializeOnboarding = async () => {
    setIsInitializing(true);
    setError(null);
    
    try {
      const response = await onboardingService.initialize();
      
      if (response.is_completed) {
        toast.success('Onboarding already completed');
        setIsOnboardingComplete(true);
        navigate('/dashboard');
      } else {
        toast.success('Onboarding initialized successfully');
        await fetchStatus();
        navigate('/onboarding/welcome');
      }
    } catch (err: any) {
      console.error('Error initializing onboarding:', err);
      setError(err.message);
      toast.error(err.message || 'Failed to initialize onboarding');
    } finally {
      setIsInitializing(false);
    }
  };

  /**
   * Complete a step
   */
  const completeStep = async (stepId: OnboardingStepId, data?: Record<string, any>): Promise<boolean> => {
    setIsSubmitting(true);
    setError(null);
    
    try {
      // Map UI step ID to backend step ID
      const backendStepId = getBackendStepId(stepId);
      console.log('Mapping UI step:', stepId, 'to backend step:', backendStepId);
      
      if (!backendStepId) {
        // If no backend mapping, just succeed without API call
        console.log('No backend step mapping for:', stepId, '- no API call needed');
        setIsSubmitting(false);
        return true;
      }
      
      // Validate data if provided
      if (data) {
        const validation = onboardingService.validateStepData(backendStepId, data);
        if (!validation.isValid) {
          validation.errors.forEach(error => toast.error(error));
          setIsSubmitting(false);
          return false;
        }
      }
      
      const response = await onboardingService.completeStep(backendStepId, data);
      
      if (response.success) {
        toast.success(response.message || 'Step completed successfully');
        
        // Don't navigate here - let the layout handle navigation
        // Just update the status
        console.log('Step completed successfully:', response);
        
        return true;
      } else {
        throw new Error(response.message || 'Failed to complete step');
      }
    } catch (err: any) {
      console.error('Error completing step:', err);
      setError(err.message);
      toast.error(err.message || 'Failed to complete step');
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Skip a step
   */
  const skipStep = async (stepId: OnboardingStepId): Promise<boolean> => {
    const backendStepId = getBackendStepId(stepId);
    
    if (!backendStepId) {
      // If no backend mapping, just succeed
      console.log('No backend step mapping for:', stepId, '- skip without API call');
      return true;
    }
    
    if (!onboardingService.canSkipStep(backendStepId)) {
      toast.error('This step cannot be skipped');
      return false;
    }
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      const response = await onboardingService.skipStep(backendStepId);
      
      if (response.success) {
        toast.success('Step skipped');
        
        // Don't navigate here - let the layout handle navigation
        console.log('Step skipped successfully:', response);
        
        return true;
      } else {
        throw new Error(response.message || 'Failed to skip step');
      }
    } catch (err: any) {
      console.error('Error skipping step:', err);
      setError(err.message);
      toast.error(err.message || 'Failed to skip step');
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Update progress (save current state)
   */
  const updateProgress = async (data?: Record<string, any>) => {
    try {
      await onboardingService.updateProgress(currentStep, data);
    } catch (err: any) {
      console.error('Error updating progress:', err);
      // Don't show error toast for progress updates
    }
  };

  /**
   * Complete onboarding
   */
  const completeOnboarding = async () => {
    setIsSubmitting(true);
    setError(null);
    
    try {
      const response = await onboardingService.complete();
      
      if (response.success) {
        toast.success('Onboarding completed successfully!');
        setIsOnboardingComplete(true);
        navigate('/dashboard');
      } else {
        throw new Error(response.message || 'Failed to complete onboarding');
      }
    } catch (err: any) {
      console.error('Error completing onboarding:', err);
      setError(err.message);
      toast.error(err.message || 'Failed to complete onboarding');
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Navigation functions
   */
  const goToStep = (stepId: OnboardingStepId) => {
    const stepDef = OnboardingUtils.getStepDefinition(stepId);
    if (stepDef?.path) {
      navigate(stepDef.path);
    }
  };

  const goToNextStep = () => {
    if (nextStepId) {
      const nextStepPath = OnboardingUtils.getStepDefinition(nextStepId)?.path;
      if (nextStepPath) {
        navigate(nextStepPath);
      }
    }
  };

  const goToPreviousStep = () => {
    if (previousStepId) {
      goToStep(previousStepId as OnboardingStepId);
    }
  };

  /**
   * Utility functions
   */
  const getStepStatus = (stepId: OnboardingStepId): 'pending' | 'in_progress' | 'completed' | 'skipped' => {
    if (completedSteps.includes(stepId)) return 'completed';
    if (skippedSteps.includes(stepId)) return 'skipped';
    if (currentStepId === stepId) return 'in_progress';
    return 'pending';
  };

  const isStepCompleted = (stepId: OnboardingStepId): boolean => {
    return completedSteps.includes(stepId);
  };

  const isStepSkipped = (stepId: OnboardingStepId): boolean => {
    return skippedSteps.includes(stepId);
  };

  const canAccessStep = (stepId: OnboardingStepId): boolean => {
    const stepSequence = OnboardingUtils.getSequenceByStepId(stepId);
    
    // Can always access completed or skipped steps
    if (isStepCompleted(stepId) || isStepSkipped(stepId)) {
      return true;
    }
    
    // Can access current step
    if (currentStep === stepSequence) {
      return true;
    }
    
    // Can't access future steps
    if (stepSequence > currentStep) {
      return false;
    }
    
    // Can access previous steps
    return true;
  };

  const refreshStatus = async () => {
    setIsLoading(true);
    await fetchStatus();
  };

  // Initial load
  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  return {
    // State
    isLoading,
    isInitializing,
    isSubmitting,
    error,
    
    // Onboarding data
    needsOnboarding,
    isOnboardingComplete,
    currentStep,
    currentStepId,
    totalSteps,
    completedSteps,
    skippedSteps,
    stepData,
    onboarding,
    steps,
    
    // Progress
    progressPercentage,
    estimatedTimeRemaining,
    
    // Navigation
    canGoBack,
    canGoForward,
    canSkip,
    nextStepId,
    previousStepId,
    
    // Actions
    initializeOnboarding,
    completeStep,
    skipStep,
    updateProgress,
    completeOnboarding,
    goToStep,
    goToNextStep,
    goToPreviousStep,
    refreshStatus,
    
    // Utilities
    getStepStatus,
    isStepCompleted,
    isStepSkipped,
    canAccessStep
  };
};

export default useOnboarding;