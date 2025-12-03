// src/types/onboardingTypes.ts - UI Layer Version
// TypeScript interfaces for Onboarding functionality (matching API layer)

/**
 * Onboarding entity - tenant onboarding configuration
 */
export interface TenantOnboarding {
  id: string;
  tenant_id: string;
  onboarding_type: 'business' | 'user';
  current_step: number;
  total_steps: number;
  completed_steps: string[];
  skipped_steps: string[];
  step_data: Record<string, any>;
  started_at: string;
  completed_at: string | null;
  is_completed: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Onboarding step status entity
 */
export interface OnboardingStepStatus {
  id: string;
  tenant_id: string;
  step_id: string;
  step_sequence: number;
  status: 'pending' | 'in_progress' | 'completed' | 'skipped';
  started_at: string | null;
  completed_at: string | null;
  attempts: number;
  error_log: Record<string, any> | null;
  created_at: string;
  updated_at: string;
}

/**
 * Onboarding status response
 */
export interface OnboardingStatusResponse {
  needs_onboarding: boolean;
  onboarding: TenantOnboarding | null;
  steps: OnboardingStepStatus[];
  current_step: number;
  total_steps: number;
  completed_steps: string[];
  skipped_steps: string[];
}

/**
 * Initialize onboarding response
 */
export interface InitializeOnboardingResponse {
  id: string;
  message: string;
  is_completed?: boolean;
}

/**
 * Complete step request
 */
export interface CompleteStepRequest {
  stepId: string;
  data?: Record<string, any>;
}

/**
 * Complete step response
 */
export interface CompleteStepResponse {
  success: boolean;
  message: string;
  current_step: number;
  completed_steps: string[];
}

/**
 * Skip step request
 */
export interface SkipStepRequest {
  stepId: string;
}

/**
 * Skip step response
 */
export interface SkipStepResponse {
  success: boolean;
  message: string;
  current_step: number;
  skipped_steps: string[];
}

/**
 * Update progress request
 */
export interface UpdateProgressRequest {
  current_step?: number;
  step_data?: Record<string, any>;
}

/**
 * Generic onboarding operation result
 */
export interface OnboardingOperationResult {
  success: boolean;
  message: string;
  data?: any;
  error?: string;
}

/**
 * Onboarding step definition (UI specific)
 */
export interface OnboardingStep {
  id: string;
  sequence: number;
  title: string;
  description: string;
  isRequired: boolean;
  estimatedTime?: string;
  icon?: string;
  path?: string;
  component?: string;
}

/**
 * Onboarding validation result
 */
export interface OnboardingValidation {
  isValid: boolean;
  errors: string[];
  warnings?: string[];
}

/**
 * UI specific - Onboarding context state
 */
export interface OnboardingContextState {
  isLoading: boolean;
  isInitialized: boolean;
  needsOnboarding: boolean;
  currentStep: number;
  totalSteps: number;
  completedSteps: string[];
  skippedSteps: string[];
  stepData: Record<string, any>;
  onboarding: TenantOnboarding | null;
  steps: OnboardingStepStatus[];
  error: string | null;
}

/**
 * UI specific - Step navigation
 */
export interface StepNavigation {
  canGoBack: boolean;
  canGoForward: boolean;
  canSkip: boolean;
  nextStep: string | null;
  previousStep: string | null;
}

/**
 * Define step types - Backend only knows these 6
 */
export type OnboardingStepId = 'user-profile' | 'business-profile' | 'data-setup' | 'storage' | 'team' | 'tour';
export type RequiredStepId = 'user-profile' | 'business-profile';

/**
 * Constants for onboarding functionality
 */
export const ONBOARDING_CONSTANTS = {
  TYPES: {
    BUSINESS: 'business' as const,
    USER: 'user' as const,
  },
  STATUS: {
    PENDING: 'pending' as const,
    IN_PROGRESS: 'in_progress' as const,
    COMPLETED: 'completed' as const,
    SKIPPED: 'skipped' as const,
  },
  STEPS: {
    USER_PROFILE: 'user-profile' as OnboardingStepId,
    BUSINESS_PROFILE: 'business-profile' as OnboardingStepId,
    DATA_SETUP: 'data-setup' as OnboardingStepId,
    STORAGE: 'storage' as OnboardingStepId,
    TEAM: 'team' as OnboardingStepId,
    TOUR: 'tour' as OnboardingStepId,
  },
  REQUIRED_STEPS: ['user-profile', 'business-basic'] as string[],
  TOTAL_STEPS: 13, // Updated for 13-step flow (added sequence-numbers)

  // UI specific - routing paths
  ROUTES: {
    BASE: '/onboarding',
    WELCOME: '/onboarding/welcome',
    STORAGE_SETUP: '/onboarding/storage-setup',
    USER_PROFILE: '/onboarding/user-profile',
    THEME_SELECTION: '/onboarding/theme-selection',
    BUSINESS_BASIC: '/onboarding/business-basic',
    BUSINESS_BRANDING: '/onboarding/business-branding',
    BUSINESS_PREFERENCES: '/onboarding/business-preferences',
    SEQUENCE_NUMBERS: '/onboarding/sequence-numbers',
    MASTER_DATA: '/onboarding/master-data',
    TEAM_INVITE: '/onboarding/team-invite',
    PRODUCT_TOUR: '/onboarding/product-tour',
    SAMPLE_CONTRACT: '/onboarding/sample-contract',
    COMPLETE: '/onboarding/complete',
  }
} as const;

/**
 * Onboarding error codes for consistent error handling
 */
export enum OnboardingErrorCode {
  INVALID_STEP_ID = 'INVALID_STEP_ID',
  STEP_NOT_FOUND = 'STEP_NOT_FOUND',
  REQUIRED_STEP_CANNOT_SKIP = 'REQUIRED_STEP_CANNOT_SKIP',
  INVALID_STEP_DATA = 'INVALID_STEP_DATA',
  ONBOARDING_ALREADY_COMPLETED = 'ONBOARDING_ALREADY_COMPLETED',
  ONBOARDING_NOT_INITIALIZED = 'ONBOARDING_NOT_INITIALIZED',
  STEP_ALREADY_COMPLETED = 'STEP_ALREADY_COMPLETED',
  PREVIOUS_STEP_NOT_COMPLETED = 'PREVIOUS_STEP_NOT_COMPLETED',
  DATABASE_ERROR = 'DATABASE_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
}

/**
 * Onboarding error messages for user display
 */
export const ONBOARDING_ERROR_MESSAGES: Record<OnboardingErrorCode, string> = {
  [OnboardingErrorCode.INVALID_STEP_ID]: 'Invalid step identifier',
  [OnboardingErrorCode.STEP_NOT_FOUND]: 'Onboarding step not found',
  [OnboardingErrorCode.REQUIRED_STEP_CANNOT_SKIP]: 'Cannot skip required step',
  [OnboardingErrorCode.INVALID_STEP_DATA]: 'Invalid step data provided',
  [OnboardingErrorCode.ONBOARDING_ALREADY_COMPLETED]: 'Onboarding has already been completed',
  [OnboardingErrorCode.ONBOARDING_NOT_INITIALIZED]: 'Onboarding has not been initialized',
  [OnboardingErrorCode.STEP_ALREADY_COMPLETED]: 'This step has already been completed',
  [OnboardingErrorCode.PREVIOUS_STEP_NOT_COMPLETED]: 'Please complete the previous step first',
  [OnboardingErrorCode.DATABASE_ERROR]: 'Database operation failed',
  [OnboardingErrorCode.NETWORK_ERROR]: 'Network connection error',
  [OnboardingErrorCode.UNAUTHORIZED]: 'Authentication required',
  [OnboardingErrorCode.FORBIDDEN]: 'Insufficient permissions',
  [OnboardingErrorCode.INTERNAL_ERROR]: 'Internal server error',
};

/**
 * Type guards for runtime type checking
 */
export const OnboardingTypeGuards = {
  isValidStepId: (stepId: any): stepId is OnboardingStepId => {
    return typeof stepId === 'string' && 
           (Object.values(ONBOARDING_CONSTANTS.STEPS) as string[]).includes(stepId);
  },
  
  isRequiredStep: (stepId: string): boolean => {
    return ONBOARDING_CONSTANTS.REQUIRED_STEPS.includes(stepId);
  },
  
  isValidStatus: (status: any): status is typeof ONBOARDING_CONSTANTS.STATUS[keyof typeof ONBOARDING_CONSTANTS.STATUS] => {
    return Object.values(ONBOARDING_CONSTANTS.STATUS).includes(status);
  },
  
  isValidOnboardingType: (type: any): type is 'business' | 'user' => {
    return type === 'business' || type === 'user';
  },
};

/**
 * Utility functions for onboarding operations
 */
export const OnboardingUtils = {
  /**
   * Get step definition by ID - Returns definition for all 12 UI steps
   */
  getStepDefinition: (stepId: string): OnboardingStep | null => {
    const steps: OnboardingStep[] = [
      {
        id: 'welcome',
        sequence: 1,
        title: 'Welcome',
        description: 'Get introduced to ContractNest',
        isRequired: false,
        estimatedTime: '1 min',
        icon: 'Sparkles',
        path: ONBOARDING_CONSTANTS.ROUTES.WELCOME,
        component: 'WelcomeStep'
      },
      {
        id: 'storage-setup',
        sequence: 2,
        title: 'Storage Setup',
        description: 'Configure your file storage',
        isRequired: false,
        estimatedTime: '1 min',
        icon: 'HardDrive',
        path: ONBOARDING_CONSTANTS.ROUTES.STORAGE_SETUP,
        component: 'StorageSetupStep'
      },
      {
        id: 'user-profile',
        sequence: 3,
        title: 'Your Profile',
        description: 'Set up your personal information',
        isRequired: false,
        estimatedTime: '2 min',
        icon: 'User',
        path: ONBOARDING_CONSTANTS.ROUTES.USER_PROFILE,
        component: 'UserProfileStep'
      },
      {
        id: 'theme-selection',
        sequence: 4,
        title: 'Theme Selection',
        description: 'Choose your preferred visual theme',
        isRequired: false,
        estimatedTime: '1 min',
        icon: 'Palette',
        path: ONBOARDING_CONSTANTS.ROUTES.THEME_SELECTION,
        component: 'ThemeSelectionStep'
      },
      {
        id: 'business-basic',
        sequence: 5,
        title: 'Business Profile',
        description: 'Select your business role in service contracts',
        isRequired: true,
        estimatedTime: '2 min',
        icon: 'Building',
        path: ONBOARDING_CONSTANTS.ROUTES.BUSINESS_BASIC,
        component: 'BusinessBasicStep'
      },
      {
        id: 'business-branding',
        sequence: 6,
        title: 'Industry',
        description: 'Choose your industry sector',
        isRequired: false,
        estimatedTime: '2 min',
        icon: 'Building2',
        path: ONBOARDING_CONSTANTS.ROUTES.BUSINESS_BRANDING,
        component: 'BusinessBrandingStep'
      },
      {
        id: 'business-preferences',
        sequence: 7,
        title: 'Branding',
        description: 'Customize your workspace with logo and colors',
        isRequired: false,
        estimatedTime: '3 min',
        icon: 'Paintbrush',
        path: ONBOARDING_CONSTANTS.ROUTES.BUSINESS_PREFERENCES,
        component: 'BusinessPreferencesStep'
      },
      {
        id: 'sequence-numbers',
        sequence: 8,
        title: 'Sequence Numbers',
        description: 'Configure auto-generated number formats',
        isRequired: false,
        estimatedTime: '2 min',
        icon: 'Hash',
        path: ONBOARDING_CONSTANTS.ROUTES.SEQUENCE_NUMBERS,
        component: 'SequenceNumbersStep'
      },
      {
        id: 'master-data',
        sequence: 9,
        title: 'Data Setup',
        description: 'Import or set up your initial data',
        isRequired: false,
        estimatedTime: '5 min',
        icon: 'Database',
        path: ONBOARDING_CONSTANTS.ROUTES.MASTER_DATA,
        component: 'MasterDataStep'
      },
      {
        id: 'team-invite',
        sequence: 10,
        title: 'Invite Team',
        description: 'Add team members to collaborate',
        isRequired: false,
        estimatedTime: '2 min',
        icon: 'Users',
        path: ONBOARDING_CONSTANTS.ROUTES.TEAM_INVITE,
        component: 'TeamInviteStep'
      },
      {
        id: 'product-tour',
        sequence: 11,
        title: 'Product Tour',
        description: 'Learn the basics of ContractNest',
        isRequired: false,
        estimatedTime: '3 min',
        icon: 'Map',
        path: ONBOARDING_CONSTANTS.ROUTES.PRODUCT_TOUR,
        component: 'ProductTourStep'
      },
      {
        id: 'sample-contract',
        sequence: 12,
        title: 'Sample Contract',
        description: 'Try creating your first contract',
        isRequired: false,
        estimatedTime: '3 min',
        icon: 'FileText',
        path: ONBOARDING_CONSTANTS.ROUTES.SAMPLE_CONTRACT,
        component: 'SampleContractStep'
      },
      {
        id: 'complete',
        sequence: 13,
        title: 'All Done!',
        description: 'Complete your onboarding',
        isRequired: false,
        estimatedTime: '0 min',
        icon: 'CheckCircle',
        path: ONBOARDING_CONSTANTS.ROUTES.COMPLETE,
        component: 'CompleteStep'
      }
    ];
    
    return steps.find(step => step.id === stepId) || null;
  },
  
  /**
   * Get all step definitions - Returns all 12 UI steps in order
   */
  getAllSteps: (): OnboardingStep[] => {
    return [
      'welcome',
      'storage-setup',
      'user-profile',
      'theme-selection',
      'business-basic',
      'business-branding',
      'business-preferences',
      'sequence-numbers',
      'master-data',
      'team-invite',
      'product-tour',
      'sample-contract',
      'complete'
    ].map(id => OnboardingUtils.getStepDefinition(id)).filter(Boolean) as OnboardingStep[];
  },
  
  /**
   * Calculate progress percentage
   */
  calculateProgress: (completedSteps: string[], totalSteps: number): number => {
    if (totalSteps === 0) return 0;
    return Math.round((completedSteps.length / totalSteps) * 100);
  },
  
  /**
   * Get next step ID
   */
  getNextStep: (currentStep: number): string | null => {
    const allSteps = OnboardingUtils.getAllSteps();
    if (currentStep >= 1 && currentStep < allSteps.length) {
      return allSteps[currentStep].id;
    }
    return null;
  },
  
  /**
   * Get previous step ID
   */
  getPreviousStep: (currentStep: number): string | null => {
    const allSteps = OnboardingUtils.getAllSteps();
    if (currentStep > 1 && currentStep <= allSteps.length) {
      return allSteps[currentStep - 2].id;
    }
    return null;
  },
  
  /**
   * Get step navigation info
   */
  getStepNavigation: (currentStep: number, completedSteps: string[], skippedSteps: string[]): StepNavigation => {
    const nextStep = OnboardingUtils.getNextStep(currentStep);
    const previousStep = OnboardingUtils.getPreviousStep(currentStep);
    const currentStepDef = OnboardingUtils.getStepDefinition(OnboardingUtils.getStepIdBySequence(currentStep));
    
    return {
      canGoBack: currentStep > 1,
      canGoForward: currentStep < ONBOARDING_CONSTANTS.TOTAL_STEPS,
      canSkip: currentStepDef ? !currentStepDef.isRequired : false,
      nextStep,
      previousStep,
    };
  },
  
  /**
   * Get step ID by sequence number
   */
  getStepIdBySequence: (sequence: number): string | null => {
    const allSteps = OnboardingUtils.getAllSteps();
    if (sequence >= 1 && sequence <= allSteps.length) {
      return allSteps[sequence - 1].id;
    }
    return null;
  },
  
  /**
   * Get sequence by step ID
   */
  getSequenceByStepId: (stepId: string): number => {
    const step = OnboardingUtils.getStepDefinition(stepId);
    return step ? step.sequence : 0;
  },
  
  /**
   * Check if onboarding is complete
   */
  isOnboardingComplete: (completedSteps: string[]): boolean => {
    const requiredSteps = ONBOARDING_CONSTANTS.REQUIRED_STEPS;
    return requiredSteps.every(step => completedSteps.includes(step));
  },
  
  /**
   * Get step status
   */
  getStepStatus: (stepId: string, completedSteps: string[], skippedSteps: string[], currentStepId: string | null): typeof ONBOARDING_CONSTANTS.STATUS[keyof typeof ONBOARDING_CONSTANTS.STATUS] => {
    if (completedSteps.includes(stepId)) {
      return ONBOARDING_CONSTANTS.STATUS.COMPLETED;
    }
    if (skippedSteps.includes(stepId)) {
      return ONBOARDING_CONSTANTS.STATUS.SKIPPED;
    }
    if (currentStepId === stepId) {
      return ONBOARDING_CONSTANTS.STATUS.IN_PROGRESS;
    }
    return ONBOARDING_CONSTANTS.STATUS.PENDING;
  },
  
  /**
   * Format time estimate for display
   */
  formatTimeEstimate: (minutes: number): string => {
    if (minutes < 60) {
      return `${minutes} min`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
  },
  
  /**
   * Get total estimated time for remaining steps
   */
  getTotalEstimatedTime: (remainingSteps: string[]): number => {
    const timeMap: Record<string, number> = {
      'welcome': 1,
      'storage-setup': 1,
      'user-profile': 2,
      'theme-selection': 1,
      'business-basic': 2,
      'business-branding': 2,
      'business-preferences': 3,
      'sequence-numbers': 2,
      'master-data': 5,
      'team-invite': 2,
      'product-tour': 3,
      'sample-contract': 3,
      'complete': 0
    };
    
    return remainingSteps.reduce((total, stepId) => {
      return total + (timeMap[stepId] || 0);
    }, 0);
  },
  
  /**
   * Validate complete step request
   */
  validateCompleteStep: (request: any): OnboardingValidation => {
    const errors: string[] = [];
    
    if (!request || typeof request !== 'object') {
      errors.push('Invalid request format');
    } else {
      if (!request.stepId || typeof request.stepId !== 'string') {
        errors.push('Step ID is required');
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  },
  
  /**
   * Validate skip step request
   */
  validateSkipStep: (request: any): OnboardingValidation => {
    const errors: string[] = [];
    
    if (!request || typeof request !== 'object') {
      errors.push('Invalid request format');
    } else {
      if (!request.stepId || typeof request.stepId !== 'string') {
        errors.push('Step ID is required');
      }
      
      // Check if step can be skipped
      if (request.stepId && OnboardingTypeGuards.isRequiredStep(request.stepId)) {
        errors.push('Cannot skip required step');
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
};

/**
 * Export everything for easy importing
 */
export default {
  ONBOARDING_CONSTANTS,
  OnboardingErrorCode,
  ONBOARDING_ERROR_MESSAGES,
  OnboardingTypeGuards,
  OnboardingUtils,
};