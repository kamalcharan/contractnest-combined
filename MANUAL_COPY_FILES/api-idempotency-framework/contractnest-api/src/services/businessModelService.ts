// src/services/businessModelService.ts
// UPDATED: Now forwards x-product and x-idempotency-key headers to Edge
// Updated: January 2025

import axios from 'axios';
import { captureException } from '../utils/sentry';
import { SUPABASE_URL } from '../utils/supabaseConfig';
import {
  PricingPlan,
  PlanVersion,
  CreatePlanRequest,
  UpdatePlanRequest,
  CreateVersionRequest,
  VersionComparisonResult
} from '../types/businessModel';
import { RequestContext, buildEdgeHeaders } from '../middleware/requestContext';

/**
 * Build headers for Edge function calls
 * Includes: Authorization, x-tenant-id, x-product, x-idempotency-key
 */
function buildHeaders(context: RequestContext): Record<string, string> {
  return buildEdgeHeaders(context);
}

/**
 * Legacy header builder for backward compatibility
 * Use context-based buildHeaders when possible
 */
function buildLegacyHeaders(
  authToken: string,
  tenantId: string,
  productCode?: string,
  idempotencyKey?: string
): Record<string, string> {
  const headers: Record<string, string> = {
    'Authorization': authToken,
    'x-tenant-id': tenantId,
    'x-product': productCode || 'contractnest',
    'Content-Type': 'application/json'
  };

  if (idempotencyKey) {
    headers['x-idempotency-key'] = idempotencyKey;
  }

  return headers;
}

/**
 * Business Model Service
 * Handles communication with the Supabase Edge Functions for Business Model operations
 */
export const businessModelService = {
  /**
   * Get all pricing plans with optional filtering
   * Supports product_code filtering via x-product header
   */
  async getPlans(
    authToken: string,
    tenantId: string,
    showArchived: boolean = false,
    planType?: string,
    productCode?: string  // NEW: Product code for filtering
  ): Promise<PricingPlan[]> {
    try {
      if (!SUPABASE_URL) {
        throw new Error('Missing SUPABASE_URL configuration');
      }

      // Build query parameters
      const params = new URLSearchParams();
      if (showArchived) {
        params.append('showArchived', 'true');
      }
      if (planType) {
        params.append('planType', planType);
      }
      // Can also pass product_code as query param for explicit override
      if (productCode) {
        params.append('product_code', productCode);
      }

      const response = await axios.get(
        `${SUPABASE_URL}/functions/v1/plans?${params.toString()}`,
        {
          headers: buildLegacyHeaders(authToken, tenantId, productCode)
        }
      );

      // Handle new response format with data wrapper
      return response.data.data || response.data;
    } catch (error) {
      console.error('Error in getPlans service:', error);
      captureException(error instanceof Error ? error : new Error(String(error)), {
        tags: { source: 'service_businessModel', action: 'getPlans' },
        tenantId,
        productCode
      });
      throw error;
    }
  },

  /**
   * Get all pricing plans using request context
   * Preferred method - uses full context for proper header forwarding
   */
  async getPlansWithContext(
    context: RequestContext,
    showArchived: boolean = false,
    planType?: string
  ): Promise<PricingPlan[]> {
    try {
      if (!SUPABASE_URL) {
        throw new Error('Missing SUPABASE_URL configuration');
      }

      const params = new URLSearchParams();
      if (showArchived) {
        params.append('showArchived', 'true');
      }
      if (planType) {
        params.append('planType', planType);
      }

      const response = await axios.get(
        `${SUPABASE_URL}/functions/v1/plans?${params.toString()}`,
        {
          headers: buildHeaders(context)
        }
      );

      return response.data.data || response.data;
    } catch (error) {
      console.error('Error in getPlansWithContext service:', error);
      captureException(error instanceof Error ? error : new Error(String(error)), {
        tags: { source: 'service_businessModel', action: 'getPlansWithContext' },
        tenantId: context.tenantId,
        productCode: context.productCode
      });
      throw error;
    }
  },

  /**
   * Get a specific pricing plan by ID
   */
  async getPlan(
    authToken: string,
    tenantId: string,
    planId: string,
    productCode?: string
  ): Promise<PricingPlan | null> {
    try {
      if (!SUPABASE_URL) {
        throw new Error('Missing SUPABASE_URL configuration');
      }

      const response = await axios.get(
        `${SUPABASE_URL}/functions/v1/plans/${planId}`,
        {
          headers: buildLegacyHeaders(authToken, tenantId, productCode)
        }
      );

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        return null;
      }

      console.error('Error in getPlan service:', error);
      captureException(error instanceof Error ? error : new Error(String(error)), {
        tags: { source: 'service_businessModel', action: 'getPlan' },
        tenantId,
        planId
      });
      throw error;
    }
  },

  /**
   * Get plan using request context
   */
  async getPlanWithContext(
    context: RequestContext,
    planId: string
  ): Promise<PricingPlan | null> {
    try {
      if (!SUPABASE_URL) {
        throw new Error('Missing SUPABASE_URL configuration');
      }

      const response = await axios.get(
        `${SUPABASE_URL}/functions/v1/plans/${planId}`,
        {
          headers: buildHeaders(context)
        }
      );

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        return null;
      }

      console.error('Error in getPlanWithContext service:', error);
      captureException(error instanceof Error ? error : new Error(String(error)), {
        tags: { source: 'service_businessModel', action: 'getPlanWithContext' },
        tenantId: context.tenantId,
        planId
      });
      throw error;
    }
  },

  /**
   * Get plan data formatted for editing
   */
  async getPlanForEdit(
    authToken: string,
    tenantId: string,
    planId: string,
    productCode?: string
  ): Promise<any> {
    try {
      if (!SUPABASE_URL) {
        throw new Error('Missing SUPABASE_URL configuration');
      }

      const response = await axios.get(
        `${SUPABASE_URL}/functions/v1/plans/${planId}/edit`,
        {
          headers: buildLegacyHeaders(authToken, tenantId, productCode)
        }
      );

      return response.data;
    } catch (error) {
      console.error('Error in getPlanForEdit service:', error);
      captureException(error instanceof Error ? error : new Error(String(error)), {
        tags: { source: 'service_businessModel', action: 'getPlanForEdit' },
        tenantId,
        planId
      });
      throw error;
    }
  },

  /**
   * Get plan for edit using request context
   */
  async getPlanForEditWithContext(
    context: RequestContext,
    planId: string
  ): Promise<any> {
    try {
      if (!SUPABASE_URL) {
        throw new Error('Missing SUPABASE_URL configuration');
      }

      const response = await axios.get(
        `${SUPABASE_URL}/functions/v1/plans/${planId}/edit`,
        {
          headers: buildHeaders(context)
        }
      );

      return response.data;
    } catch (error) {
      console.error('Error in getPlanForEditWithContext service:', error);
      captureException(error instanceof Error ? error : new Error(String(error)), {
        tags: { source: 'service_businessModel', action: 'getPlanForEditWithContext' },
        tenantId: context.tenantId,
        planId
      });
      throw error;
    }
  },

  /**
   * Create a new pricing plan
   * Now supports idempotency key and product code
   */
  async createPlan(
    authToken: string,
    tenantId: string,
    planData: CreatePlanRequest,
    productCode?: string,
    idempotencyKey?: string  // NEW: Idempotency key
  ): Promise<PricingPlan> {
    try {
      if (!SUPABASE_URL) {
        throw new Error('Missing SUPABASE_URL configuration');
      }

      // Ensure product_code is set in plan data
      const dataWithProduct = {
        ...planData,
        product_code: planData.product_code || productCode || 'contractnest'
      };

      const response = await axios.post(
        `${SUPABASE_URL}/functions/v1/plans`,
        dataWithProduct,
        {
          headers: buildLegacyHeaders(authToken, tenantId, productCode, idempotencyKey)
        }
      );

      return response.data;
    } catch (error) {
      console.error('Error in createPlan service:', error);
      captureException(error instanceof Error ? error : new Error(String(error)), {
        tags: { source: 'service_businessModel', action: 'createPlan' },
        tenantId,
        productCode
      });
      throw error;
    }
  },

  /**
   * Create plan using request context (preferred)
   */
  async createPlanWithContext(
    context: RequestContext,
    planData: CreatePlanRequest
  ): Promise<PricingPlan> {
    try {
      if (!SUPABASE_URL) {
        throw new Error('Missing SUPABASE_URL configuration');
      }

      // Ensure product_code is set in plan data
      const dataWithProduct = {
        ...planData,
        product_code: planData.product_code || context.productCode
      };

      const response = await axios.post(
        `${SUPABASE_URL}/functions/v1/plans`,
        dataWithProduct,
        {
          headers: buildHeaders(context)
        }
      );

      return response.data;
    } catch (error) {
      console.error('Error in createPlanWithContext service:', error);
      captureException(error instanceof Error ? error : new Error(String(error)), {
        tags: { source: 'service_businessModel', action: 'createPlanWithContext' },
        tenantId: context.tenantId,
        productCode: context.productCode
      });
      throw error;
    }
  },

  /**
   * Update plan by creating new version (edit workflow)
   * Now supports idempotency key
   */
  async updatePlanAsNewVersion(
    authToken: string,
    tenantId: string,
    editData: any,
    productCode?: string,
    idempotencyKey?: string  // NEW: Idempotency key
  ): Promise<PricingPlan> {
    try {
      if (!SUPABASE_URL) {
        throw new Error('Missing SUPABASE_URL configuration');
      }

      const response = await axios.post(
        `${SUPABASE_URL}/functions/v1/plans`,
        editData,
        {
          headers: buildLegacyHeaders(authToken, tenantId, productCode, idempotencyKey)
        }
      );

      return response.data;
    } catch (error) {
      console.error('Error in updatePlanAsNewVersion service:', error);
      captureException(error instanceof Error ? error : new Error(String(error)), {
        tags: { source: 'service_businessModel', action: 'updatePlanAsNewVersion' },
        tenantId,
        planId: editData.plan_id
      });
      throw error;
    }
  },

  /**
   * Update plan as new version using request context (preferred)
   */
  async updatePlanAsNewVersionWithContext(
    context: RequestContext,
    editData: any
  ): Promise<PricingPlan> {
    try {
      if (!SUPABASE_URL) {
        throw new Error('Missing SUPABASE_URL configuration');
      }

      const response = await axios.post(
        `${SUPABASE_URL}/functions/v1/plans`,
        editData,
        {
          headers: buildHeaders(context)
        }
      );

      return response.data;
    } catch (error) {
      console.error('Error in updatePlanAsNewVersionWithContext service:', error);
      captureException(error instanceof Error ? error : new Error(String(error)), {
        tags: { source: 'service_businessModel', action: 'updatePlanAsNewVersionWithContext' },
        tenantId: context.tenantId,
        planId: editData.plan_id
      });
      throw error;
    }
  },

  /**
   * Update an existing pricing plan
   */
  async updatePlan(
    authToken: string,
    tenantId: string,
    planId: string,
    planData: UpdatePlanRequest,
    productCode?: string,
    idempotencyKey?: string
  ): Promise<PricingPlan> {
    try {
      if (!SUPABASE_URL) {
        throw new Error('Missing SUPABASE_URL configuration');
      }

      const response = await axios.put(
        `${SUPABASE_URL}/functions/v1/plans/${planId}`,
        planData,
        {
          headers: buildLegacyHeaders(authToken, tenantId, productCode, idempotencyKey)
        }
      );

      return response.data;
    } catch (error) {
      console.error('Error in updatePlan service:', error);
      captureException(error instanceof Error ? error : new Error(String(error)), {
        tags: { source: 'service_businessModel', action: 'updatePlan' },
        tenantId,
        planId
      });
      throw error;
    }
  },

  /**
   * Update plan using request context (preferred)
   */
  async updatePlanWithContext(
    context: RequestContext,
    planId: string,
    planData: UpdatePlanRequest
  ): Promise<PricingPlan> {
    try {
      if (!SUPABASE_URL) {
        throw new Error('Missing SUPABASE_URL configuration');
      }

      const response = await axios.put(
        `${SUPABASE_URL}/functions/v1/plans/${planId}`,
        planData,
        {
          headers: buildHeaders(context)
        }
      );

      return response.data;
    } catch (error) {
      console.error('Error in updatePlanWithContext service:', error);
      captureException(error instanceof Error ? error : new Error(String(error)), {
        tags: { source: 'service_businessModel', action: 'updatePlanWithContext' },
        tenantId: context.tenantId,
        planId
      });
      throw error;
    }
  },

  /**
   * Toggle plan visibility
   */
  async togglePlanVisibility(
    authToken: string,
    tenantId: string,
    planId: string,
    isVisible: boolean,
    productCode?: string,
    idempotencyKey?: string
  ): Promise<PricingPlan> {
    try {
      if (!SUPABASE_URL) {
        throw new Error('Missing SUPABASE_URL configuration');
      }

      const response = await axios.put(
        `${SUPABASE_URL}/functions/v1/plans/${planId}/visibility`,
        { is_visible: isVisible },
        {
          headers: buildLegacyHeaders(authToken, tenantId, productCode, idempotencyKey)
        }
      );

      return response.data;
    } catch (error) {
      console.error('Error in togglePlanVisibility service:', error);
      captureException(error instanceof Error ? error : new Error(String(error)), {
        tags: { source: 'service_businessModel', action: 'togglePlanVisibility' },
        tenantId,
        planId
      });
      throw error;
    }
  },

  /**
   * Toggle visibility using request context (preferred)
   */
  async togglePlanVisibilityWithContext(
    context: RequestContext,
    planId: string,
    isVisible: boolean
  ): Promise<PricingPlan> {
    try {
      if (!SUPABASE_URL) {
        throw new Error('Missing SUPABASE_URL configuration');
      }

      const response = await axios.put(
        `${SUPABASE_URL}/functions/v1/plans/${planId}/visibility`,
        { is_visible: isVisible },
        {
          headers: buildHeaders(context)
        }
      );

      return response.data;
    } catch (error) {
      console.error('Error in togglePlanVisibilityWithContext service:', error);
      captureException(error instanceof Error ? error : new Error(String(error)), {
        tags: { source: 'service_businessModel', action: 'togglePlanVisibilityWithContext' },
        tenantId: context.tenantId,
        planId
      });
      throw error;
    }
  },

  /**
   * Archive a pricing plan
   */
  async archivePlan(
    authToken: string,
    tenantId: string,
    planId: string,
    productCode?: string,
    idempotencyKey?: string
  ): Promise<PricingPlan> {
    try {
      if (!SUPABASE_URL) {
        throw new Error('Missing SUPABASE_URL configuration');
      }

      const response = await axios.put(
        `${SUPABASE_URL}/functions/v1/plans/${planId}/archive`,
        {},
        {
          headers: buildLegacyHeaders(authToken, tenantId, productCode, idempotencyKey)
        }
      );

      return response.data;
    } catch (error) {
      console.error('Error in archivePlan service:', error);
      captureException(error instanceof Error ? error : new Error(String(error)), {
        tags: { source: 'service_businessModel', action: 'archivePlan' },
        tenantId,
        planId
      });
      throw error;
    }
  },

  /**
   * Archive plan using request context (preferred)
   */
  async archivePlanWithContext(
    context: RequestContext,
    planId: string
  ): Promise<PricingPlan> {
    try {
      if (!SUPABASE_URL) {
        throw new Error('Missing SUPABASE_URL configuration');
      }

      const response = await axios.put(
        `${SUPABASE_URL}/functions/v1/plans/${planId}/archive`,
        {},
        {
          headers: buildHeaders(context)
        }
      );

      return response.data;
    } catch (error) {
      console.error('Error in archivePlanWithContext service:', error);
      captureException(error instanceof Error ? error : new Error(String(error)), {
        tags: { source: 'service_businessModel', action: 'archivePlanWithContext' },
        tenantId: context.tenantId,
        planId
      });
      throw error;
    }
  },

  /**
   * Get all versions for a plan
   */
  async getPlanVersions(
    authToken: string,
    tenantId: string,
    planId: string,
    productCode?: string
  ): Promise<PlanVersion[]> {
    try {
      if (!SUPABASE_URL) {
        throw new Error('Missing SUPABASE_URL configuration');
      }

      const response = await axios.get(
        `${SUPABASE_URL}/functions/v1/plan-versions?planId=${planId}`,
        {
          headers: buildLegacyHeaders(authToken, tenantId, productCode)
        }
      );

      return response.data;
    } catch (error) {
      console.error('Error in getPlanVersions service:', error);
      captureException(error instanceof Error ? error : new Error(String(error)), {
        tags: { source: 'service_businessModel', action: 'getPlanVersions' },
        tenantId,
        planId
      });
      throw error;
    }
  },

  /**
   * Get a specific plan version
   */
  async getPlanVersion(
    authToken: string,
    tenantId: string,
    versionId: string,
    productCode?: string
  ): Promise<PlanVersion | null> {
    try {
      if (!SUPABASE_URL) {
        throw new Error('Missing SUPABASE_URL configuration');
      }

      const response = await axios.get(
        `${SUPABASE_URL}/functions/v1/plan-versions?versionId=${versionId}`,
        {
          headers: buildLegacyHeaders(authToken, tenantId, productCode)
        }
      );

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        return null;
      }

      console.error('Error in getPlanVersion service:', error);
      captureException(error instanceof Error ? error : new Error(String(error)), {
        tags: { source: 'service_businessModel', action: 'getPlanVersion' },
        tenantId,
        versionId
      });
      throw error;
    }
  },

  /**
   * Create a new plan version
   * @deprecated Use updatePlanAsNewVersion instead
   */
  async createPlanVersion(
    authToken: string,
    tenantId: string,
    versionData: CreateVersionRequest,
    productCode?: string,
    idempotencyKey?: string
  ): Promise<PlanVersion> {
    console.warn('createPlanVersion is deprecated. Use updatePlanAsNewVersion instead.');

    try {
      if (!SUPABASE_URL) {
        throw new Error('Missing SUPABASE_URL configuration');
      }

      const response = await axios.post(
        `${SUPABASE_URL}/functions/v1/plan-versions`,
        versionData,
        {
          headers: buildLegacyHeaders(authToken, tenantId, productCode, idempotencyKey)
        }
      );

      return response.data;
    } catch (error) {
      console.error('Error in createPlanVersion service:', error);
      captureException(error instanceof Error ? error : new Error(String(error)), {
        tags: { source: 'service_businessModel', action: 'createPlanVersion' },
        tenantId,
        planId: versionData.plan_id
      });
      throw error;
    }
  },

  /**
   * Activate a specific plan version
   */
  async activatePlanVersion(
    authToken: string,
    tenantId: string,
    versionId: string,
    productCode?: string,
    idempotencyKey?: string
  ): Promise<PlanVersion> {
    try {
      if (!SUPABASE_URL) {
        throw new Error('Missing SUPABASE_URL configuration');
      }

      const response = await axios.put(
        `${SUPABASE_URL}/functions/v1/plan-versions/${versionId}/activate`,
        {},
        {
          headers: buildLegacyHeaders(authToken, tenantId, productCode, idempotencyKey)
        }
      );

      return response.data;
    } catch (error) {
      console.error('Error in activatePlanVersion service:', error);
      captureException(error instanceof Error ? error : new Error(String(error)), {
        tags: { source: 'service_businessModel', action: 'activatePlanVersion' },
        tenantId,
        versionId
      });
      throw error;
    }
  },

  /**
   * Compare two plan versions
   * @deprecated Comparison feature has been removed
   */
  async compareVersions(
    authToken: string,
    tenantId: string,
    version1Id: string,
    version2Id: string
  ): Promise<VersionComparisonResult> {
    console.warn('compareVersions is deprecated. This feature has been removed.');
    throw new Error('Version comparison feature has been removed');
  }
};
