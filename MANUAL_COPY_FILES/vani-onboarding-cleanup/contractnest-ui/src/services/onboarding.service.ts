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
  async completeStep(stepId: OnboardingStepId, data?: Record<string, any>): Promise<CompleteStepResponse> {
    try {
      // VaNi step ids go to the API as they are (the legacy UI→backend step
      // mapping went with the legacy screens).
      const payload: CompleteStepRequest = {
        stepId,
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
  async skipStep(stepId: OnboardingStepId): Promise<SkipStepResponse> {
    try {
      const payload: SkipStepRequest = {
        stepId
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
}

// Export singleton instance
export const onboardingService = new OnboardingService();

// Export for backward compatibility
export default onboardingService;