// Onboarding API service for communication with backend

import api from './api';
import { API_ENDPOINTS } from './serviceURLs';
import {
  OnboardingStatusResponse,
  InitializeOnboardingResponse,
  CompleteStepRequest,
  CompleteStepResponse,
  SkipStepRequest,
  SkipStepResponse,
  UpdateProgressRequest,
  OnboardingOperationResult,
  OnboardingStepId
} from '../types/onboardingTypes';

/**
 * Onboarding Service - handles all API communication for onboarding
 */
class OnboardingService {
  /**
   * Get current onboarding status
   */
  async getStatus(): Promise<OnboardingStatusResponse> {
    try {
      const response = await api.get<OnboardingStatusResponse>(
        API_ENDPOINTS.ONBOARDING.STATUS
      );
      return response.data;
    } catch (error: any) {
      console.error('[OnboardingService] Error getting status:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Initialize onboarding for new tenant
   */
  async initialize(): Promise<InitializeOnboardingResponse> {
    try {
      const response = await api.post<InitializeOnboardingResponse>(
        API_ENDPOINTS.ONBOARDING.INITIALIZE
      );
      return response.data;
    } catch (error: any) {
      console.error('[OnboardingService] Error initializing:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Complete an onboarding step
   */
  async completeStep(stepId: OnboardingStepId | string, data?: Record<string, any>): Promise<CompleteStepResponse> {
    try {
      // Skip API call for UI-only steps
      const uiOnlySteps = ['welcome', 'theme-selection', 'business-branding', 'business-preferences'];
      if (uiOnlySteps.includes(stepId)) {
        return {
          success: true,
          message: 'Step completed',
          current_step: 2, // This will be updated by fetchStatus
          completed_steps: []
        };
      }

      // Map UI steps to backend steps
      const stepMapping: Record<string, string> = {
        'storage-setup': 'storage',
        'user-profile': 'user-profile',
        'business-basic': 'business-profile',
        'master-data': 'data-setup'
      };

      const backendStepId = stepMapping[stepId] || stepId;

      const payload: CompleteStepRequest = {
        stepId: backendStepId as OnboardingStepId,
        data
      };
      
      const response = await api.post<CompleteStepResponse>(
        API_ENDPOINTS.ONBOARDING.STEP.COMPLETE,
        payload
      );
      return response.data;
    } catch (error: any) {
      console.error('[OnboardingService] Error completing step:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Skip an optional onboarding step
   */
  async skipStep(stepId: OnboardingStepId | string): Promise<SkipStepResponse> {
    try {
      // Skip API call for UI-only steps
      const uiOnlySteps = ['welcome', 'theme-selection', 'business-branding', 'business-preferences'];
      if (uiOnlySteps.includes(stepId)) {
        return {
          success: true,
          message: 'Step skipped',
          current_step: 2,
          skipped_steps: []
        };
      }

      // Map UI steps to backend steps
      const stepMapping: Record<string, string> = {
        'storage-setup': 'storage',
        'user-profile': 'user-profile',
        'business-basic': 'business-profile',
        'master-data': 'data-setup'
      };

      const backendStepId = stepMapping[stepId] || stepId;

      const payload: SkipStepRequest = {
        stepId: backendStepId as OnboardingStepId
      };
      
      const response = await api.put<SkipStepResponse>(
        API_ENDPOINTS.ONBOARDING.STEP.SKIP,
        payload
      );
      return response.data;
    } catch (error: any) {
      console.error('[OnboardingService] Error skipping step:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Update onboarding progress (save current state)
   */
  async updateProgress(currentStep?: number, stepData?: Record<string, any>): Promise<OnboardingOperationResult> {
    try {
      const payload: UpdateProgressRequest = {
        current_step: currentStep,
        step_data: stepData
      };
      
      const response = await api.put<OnboardingOperationResult>(
        API_ENDPOINTS.ONBOARDING.PROGRESS,
        payload
      );
      return response.data;
    } catch (error: any) {
      console.error('[OnboardingService] Error updating progress:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Complete entire onboarding process
   */
  async complete(): Promise<OnboardingOperationResult> {
    try {
      const response = await api.post<OnboardingOperationResult>(
        API_ENDPOINTS.ONBOARDING.COMPLETE
      );
      return response.data;
    } catch (error: any) {
      console.error('[OnboardingService] Error completing onboarding:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Test onboarding connection
   */
  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      const response = await api.get<{ success: boolean; message: string }>(
        API_ENDPOINTS.ONBOARDING.TEST
      );
      return response.data;
    } catch (error: any) {
      console.error('[OnboardingService] Error testing connection:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Handle API errors consistently
   */
  private handleError(error: any): Error {
    if (error.response) {
      // Server responded with error
      const message = error.response.data?.error || 
                     error.response.data?.message || 
                     'An error occurred during onboarding';
      return new Error(message);
    } else if (error.request) {
      // Request made but no response
      return new Error('Unable to connect to onboarding service');
    } else {
      // Something else happened
      return new Error(error.message || 'An unexpected error occurred');
    }
  }

  /**
   * Check if a step can be skipped
   */
  canSkipStep(stepId: OnboardingStepId | string): boolean {
    const requiredSteps = ['user-profile', 'business-basic'];
    return !requiredSteps.includes(stepId);
  }

  /**
   * Validate step data before submission
   */
  validateStepData(stepId: OnboardingStepId | string, data: Record<string, any>): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    switch (stepId) {
      case 'user-profile':
        if (!data.first_name) errors.push('First name is required');
        if (!data.last_name) errors.push('Last name is required');
        if (!data.email) errors.push('Email is required');
        break;
        
      case 'business-basic':
        if (!data.business_name) errors.push('Business name is required');
        if (!data.country_code) errors.push('Country is required');
        break;
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Get step-specific help text
   */
  getStepHelpText(stepId: OnboardingStepId | string): string {
    const helpTexts: Record<string, string> = {
      'welcome': 'Get started with ContractNest',
      'storage-setup': 'Set up cloud storage for your files',
      'user-profile': 'Set up your personal information',
      'theme-selection': 'Choose your preferred theme',
      'business-basic': 'Enter basic business information',
      'business-branding': 'Set up your brand',
      'business-preferences': 'Configure business preferences',
      'master-data': 'Set up initial data',
      'complete': 'Finish onboarding'
    };

    return helpTexts[stepId] || '';
  }

  /**
   * Get estimated time remaining
   */
  getEstimatedTimeRemaining(remainingSteps: (OnboardingStepId | string)[]): number {
    const stepTimes: Record<string, number> = {
      'welcome': 1,
      'storage-setup': 1,
      'user-profile': 2,
      'theme-selection': 1,
      'business-basic': 2,
      'business-branding': 2,
      'business-preferences': 1,
      'master-data': 5,
      'complete': 0
    };

    return remainingSteps.reduce((total, stepId) => {
      return total + (stepTimes[stepId] || 0);
    }, 0);
  }
}

// Export singleton instance
export const onboardingService = new OnboardingService();

// Export for backward compatibility
export default onboardingService;