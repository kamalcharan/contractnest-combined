// src/types/onboardingTypes.ts - UI Layer Version
// Shapes of the onboarding API responses (status / initialize / step).
//
// The legacy 11-step onboarding model that used to live here (OnboardingUtils,
// step definitions, routes, sequence maths) was removed with the legacy and
// long-form screens (batch vani-onboarding-cleanup). The VaNi step order now
// lives in components/onboarding/journey.ts (VANI_STEP_ORDER, resumePathFor).

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
 * Onboarding status response — GET /api/onboarding/status, which passes the
 * edge function's body through unchanged. The progress is NESTED under
 * `data`; the top-level progress fields below are not sent today and are
 * kept optional only for older callers. Read progress through `data`.
 */
export interface OnboardingStatusData {
  is_complete: boolean;
  onboarding_type: string;
  current_step: number;
  total_steps: number;
  completed_steps: string[];
  skipped_steps: string[];
  step_data: Record<string, any>;
}

export interface OnboardingStatusResponse {
  needs_onboarding: boolean;
  onboarding_type?: string;
  data?: OnboardingStatusData;
  onboarding?: TenantOnboarding | null;
  steps?: OnboardingStepStatus[];
  current_step?: number;
  total_steps?: number;
  completed_steps?: string[];
  skipped_steps?: string[];
  /** Tenant owner, for the "waiting on your owner" page non-owners see */
  owner?: { name: string; email: string } | null;
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
 * A VaNi onboarding step id as stored in completed_steps / step_data
 * (see VaniStepId in utils/onboarding/completeVaniStep.ts for the list).
 */
export type OnboardingStepId = string;
