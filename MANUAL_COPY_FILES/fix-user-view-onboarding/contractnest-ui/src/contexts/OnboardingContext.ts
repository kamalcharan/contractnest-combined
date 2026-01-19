// src/contexts/OnboardingContext.tsx
// Global context for onboarding state management

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { onboardingService } from '@/services/onboarding.service';
import {
  OnboardingContextState,
  OnboardingStepId,
  StepNavigation,
  ONBOARDING_CONSTANTS,
  OnboardingUtils
} from '../types/onboardingTypes';
import toast from 'react-hot-toast';

interface OnboardingContextValue extends OnboardingContextState {
  // Actions
  initializeOnboarding: () => Promise<void>;
  completeCurrentStep: (data?: Record<string, any>) => Promise<boolean>;
  skipCurrentStep: () => Promise<boolean>;
  saveProgress: (data?: Record<string, any>) => Promise<void>;
  finishOnboarding: () => Promise<void>;
  
  // Navigation
  navigation: StepNavigation;
  goToStep: (stepId: OnboardingStepId) => void;
  goNext: () => void;
  goPrevious: () => void;
  
  // Utilities
  getStepStatus: (stepId: OnboardingStepId) => 'pending' | 'in_progress' | 'completed' | 'skipped';
  isStepAccessible: (stepId: OnboardingStepId) => boolean;
  refreshStatus: () => Promise<void>;
}

const OnboardingContext = createContext<OnboardingContextValue | undefined>(undefined);

interface OnboardingProviderProps {
  children: ReactNode;
}

export const OnboardingProvider: React.FC<OnboardingProviderProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentTenant, isAuthenticated, user } = useAuth();
  
  // Initialize state
  const [state, setState] = useState<OnboardingContextState>({
    isLoading: true,
    isInitialized: false,
    needsOnboarding: false,
    currentStep: 1,
    totalSteps: ONBOARDING_CONSTANTS.TOTAL_STEPS,
    completedSteps: [],
    skippedSteps: [],
    stepData: {},
    onboarding: null,
    steps: [],
    error: null
  });
  
  /**
   * Fetch onboarding status from API
   */
  const fetchStatus = useCallback(async () => {
    if (!isAuthenticated || !currentTenant?.id) {
      setState(prev => ({ ...prev, isLoading: false }));
      return;
    }
    
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      
      const response = await onboardingService.getStatus();
      
      setState(prev => ({
        ...prev,
        isLoading: false,
        isInitialized: true,
        needsOnboarding: response.needs_onboarding,
        currentStep: response.current_step,
        totalSteps: response.total_steps,
        completedSteps: response.completed_steps,
        skippedSteps: response.skipped_steps,
        stepData: response.onboarding?.step_data || {},
        onboarding: response.onboarding,
        steps: response.steps,
        error: null
      }));

      // Check if we should redirect based on onboarding status and user role
      handleOnboardingRedirect(
        response.needs_onboarding,
        response.onboarding?.is_completed || false,
        response.owner  // Pass owner info for non-owners
      );
      
    } catch (err: any) {
      console.error('[OnboardingContext] Error fetching status:', err);
      
      // If onboarding not found, user needs onboarding
      if (err.message?.includes('not found')) {
        setState(prev => ({
          ...prev,
          isLoading: false,
          needsOnboarding: true,
          error: null
        }));
      } else {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: err.message
        }));
      }
    }
  }, [isAuthenticated, currentTenant?.id]);
  
  /**
   * Handle onboarding redirects based on status and user role
   */
  const handleOnboardingRedirect = (needsOnboarding: boolean, isCompleted: boolean, ownerInfo?: { name: string; email: string } | null) => {
    const isOnboardingPath = location.pathname.startsWith('/onboarding');
    const isOnboardingPendingPath = location.pathname === '/onboarding-pending';

    // If onboarding is needed but not completed
    if (needsOnboarding && !isCompleted) {
      // Don't redirect from certain paths
      const excludedPaths = ['/logout', '/login', '/register', '/misc', '/invitation'];
      const shouldRedirect = !excludedPaths.some(path => location.pathname.startsWith(path));

      if (shouldRedirect) {
        // Check if user is the owner (only owners can complete onboarding)
        // CRITICAL: Use strict equality to avoid undefined/null being truthy
        if (currentTenant?.is_owner === true) {
          // Owner: redirect to onboarding (if not already there)
          if (!isOnboardingPath) {
            console.log('[OnboardingContext] Owner redirect to /onboarding');
            navigate('/onboarding');
          }
        } else {
          // Non-owner: redirect to onboarding-pending (if not already there)
          if (!isOnboardingPendingPath) {
            // Store owner info for the pending page
            console.log('[OnboardingContext] Non-owner redirect to /onboarding-pending, is_owner:', currentTenant?.is_owner);
            navigate('/onboarding-pending', { state: { owner: ownerInfo } });
          }
        }
      }
    }

    // If onboarding is completed and user is still on onboarding path or pending path
    if (isCompleted) {
      if (isOnboardingPath && location.pathname !== '/onboarding/complete') {
        navigate('/dashboard');
      }
      if (isOnboardingPendingPath) {
        navigate('/dashboard');
      }
    }
  };
  
  /**
   * Initialize onboarding for new tenant
   */
  const initializeOnboarding = async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      
      const response = await onboardingService.initialize();
      
      if (response.is_completed) {
        toast.success('Onboarding already completed');
        navigate('/dashboard');
      } else {
        toast.success('Let\'s get started!');
        await fetchStatus();
        navigate('/onboarding/user-profile');
      }
    } catch (err: any) {
      console.error('[OnboardingContext] Error initializing:', err);
      setState(prev => ({ ...prev, isLoading: false, error: err.message }));
      toast.error(err.message || 'Failed to initialize onboarding');
    }
  };
  
  /**
   * Complete the current step
   */
  const completeCurrentStep = async (data?: Record<string, any>): Promise<boolean> => {
    const currentStepId = OnboardingUtils.getStepIdBySequence(state.currentStep);
    if (!currentStepId) return false;
    
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      
      // Validate data if provided
      if (data) {
        const validation = onboardingService.validateStepData(currentStepId as OnboardingStepId, data);
        if (!validation.isValid) {
          validation.errors.forEach(error => toast.error(error));
          setState(prev => ({ ...prev, isLoading: false }));
          return false;
        }
      }
      
      const response = await onboardingService.completeStep(currentStepId as OnboardingStepId, data);
      
      if (response.success) {
        toast.success('Step completed!');
        await fetchStatus();
        
        // Auto-navigate to next step
        const nextStepId = OnboardingUtils.getNextStep(response.current_step);
        if (nextStepId) {
          const nextStepPath = OnboardingUtils.getStepDefinition(nextStepId)?.path;
          if (nextStepPath) {
            navigate(nextStepPath);
          }
        } else if (OnboardingUtils.isOnboardingComplete(response.completed_steps)) {
          navigate('/onboarding/complete');
        }
        
        return true;
      }
      
      throw new Error(response.message || 'Failed to complete step');
      
    } catch (err: any) {
      console.error('[OnboardingContext] Error completing step:', err);
      setState(prev => ({ ...prev, isLoading: false, error: err.message }));
      toast.error(err.message || 'Failed to complete step');
      return false;
    }
  };
  
  /**
   * Skip the current step
   */
  const skipCurrentStep = async (): Promise<boolean> => {
    const currentStepId = OnboardingUtils.getStepIdBySequence(state.currentStep);
    if (!currentStepId) return false;
    
    if (!onboardingService.canSkipStep(currentStepId as OnboardingStepId)) {
      toast.error('This step is required and cannot be skipped');
      return false;
    }
    
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      
      const response = await onboardingService.skipStep(currentStepId as OnboardingStepId);
      
      if (response.success) {
        toast.success('Step skipped');
        await fetchStatus();
        
        // Auto-navigate to next step
        const nextStepId = OnboardingUtils.getNextStep(response.current_step);
        if (nextStepId) {
          const nextStepPath = OnboardingUtils.getStepDefinition(nextStepId)?.path;
          if (nextStepPath) {
            navigate(nextStepPath);
          }
        }
        
        return true;
      }
      
      throw new Error(response.message || 'Failed to skip step');
      
    } catch (err: any) {
      console.error('[OnboardingContext] Error skipping step:', err);
      setState(prev => ({ ...prev, isLoading: false, error: err.message }));
      toast.error(err.message || 'Failed to skip step');
      return false;
    }
  };
  
  /**
   * Save progress without completing step
   */
  const saveProgress = async (data?: Record<string, any>) => {
    try {
      await onboardingService.updateProgress(state.currentStep, data);
      
      // Update local state
      if (data) {
        setState(prev => ({
          ...prev,
          stepData: { ...prev.stepData, ...data }
        }));
      }
    } catch (err: any) {
      console.error('[OnboardingContext] Error saving progress:', err);
      // Don't show error for auto-save
    }
  };
  
  /**
   * Complete entire onboarding
   */
  const finishOnboarding = async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      
      const response = await onboardingService.complete();
      
      if (response.success) {
        toast.success('Welcome aboard! 🎉');
        setState(prev => ({
          ...prev,
          isLoading: false,
          needsOnboarding: false,
          onboarding: prev.onboarding ? { ...prev.onboarding, is_completed: true } : null
        }));
        navigate('/dashboard');
      } else {
        throw new Error(response.message || 'Failed to complete onboarding');
      }
    } catch (err: any) {
      console.error('[OnboardingContext] Error finishing onboarding:', err);
      setState(prev => ({ ...prev, isLoading: false, error: err.message }));
      toast.error(err.message || 'Failed to complete onboarding');
    }
  };
  
  /**
   * Navigation helpers
   */
  const navigation: StepNavigation = OnboardingUtils.getStepNavigation(
    state.currentStep,
    state.completedSteps,
    state.skippedSteps
  );
  
  const goToStep = (stepId: OnboardingStepId) => {
    if (isStepAccessible(stepId)) {
      const stepPath = OnboardingUtils.getStepDefinition(stepId)?.path;
      if (stepPath) {
        navigate(stepPath);
      }
    } else {
      toast.error('Please complete previous steps first');
    }
  };
  
  const goNext = () => {
    if (navigation.nextStep) {
      goToStep(navigation.nextStep as OnboardingStepId);
    }
  };
  
  const goPrevious = () => {
    if (navigation.previousStep) {
      goToStep(navigation.previousStep as OnboardingStepId);
    }
  };
  
  /**
   * Utility functions
   */
  const getStepStatus = (stepId: OnboardingStepId): 'pending' | 'in_progress' | 'completed' | 'skipped' => {
    const currentStepId = OnboardingUtils.getStepIdBySequence(state.currentStep);
    return OnboardingUtils.getStepStatus(
      stepId,
      state.completedSteps,
      state.skippedSteps,
      currentStepId
    );
  };
  
  const isStepAccessible = (stepId: OnboardingStepId): boolean => {
    const stepSequence = OnboardingUtils.getSequenceByStepId(stepId);
    
    // Can always access completed or skipped steps
    if (state.completedSteps.includes(stepId) || state.skippedSteps.includes(stepId)) {
      return true;
    }
    
    // Can access current step
    if (state.currentStep === stepSequence) {
      return true;
    }
    
    // Can't access future steps
    if (stepSequence > state.currentStep) {
      return false;
    }
    
    // Can access previous steps
    return true;
  };
  
  const refreshStatus = async () => {
    await fetchStatus();
  };
  
  // Initial load and tenant change
  useEffect(() => {
    if (isAuthenticated && currentTenant?.id) {
      fetchStatus();
    }
  }, [fetchStatus, isAuthenticated, currentTenant?.id]);
  
  // Auto-save on unmount
  useEffect(() => {
    return () => {
      // Save any pending data when component unmounts
      if (state.stepData && Object.keys(state.stepData).length > 0) {
        onboardingService.updateProgress(state.currentStep, state.stepData).catch(console.error);
      }
    };
  }, [state.stepData, state.currentStep]);
  
  const value: OnboardingContextValue = {
    ...state,
    
    // Actions
    initializeOnboarding,
    completeCurrentStep,
    skipCurrentStep,
    saveProgress,
    finishOnboarding,
    
    // Navigation
    navigation,
    goToStep,
    goNext,
    goPrevious,
    
    // Utilities
    getStepStatus,
    isStepAccessible,
    refreshStatus
  };
  
  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  );
};

/**
 * Hook to use onboarding context
 */
export const useOnboardingContext = () => {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error('useOnboardingContext must be used within OnboardingProvider');
  }
  return context;
};

export default OnboardingContext;