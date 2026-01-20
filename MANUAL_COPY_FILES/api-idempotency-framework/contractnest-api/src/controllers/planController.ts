// src/controllers/planController.ts
// UPDATED: Now uses request context middleware for proper header forwarding
// Supports: x-product, x-idempotency-key, x-tenant-id
// Updated: January 2025

import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { captureException } from '../utils/sentry';
import { businessModelService } from '../services/businessModelService';
import { validateSupabaseConfig } from '../utils/supabaseConfig';
import {
  handleEdgeError,
  notFoundError,
  validationError,
  unauthorizedError,
  badRequestError,
  internalError,
  generateRequestId
} from '../utils/apiErrors';
import { getRequestContext, RequestContext } from '../middleware/requestContext';

/**
 * Helper to get context with fallback for backward compatibility
 * Supports both new middleware context and legacy header extraction
 */
function getContext(req: Request): RequestContext {
  // If context middleware was applied, use it
  if (req.context) {
    return req.context;
  }

  // Fallback: extract headers manually (backward compatibility)
  const requestId = generateRequestId();
  return {
    authToken: req.headers.authorization as string,
    tenantId: req.headers['x-tenant-id'] as string,
    productCode: (req.headers['x-product'] as string) || 'contractnest',
    idempotencyKey: req.headers['x-idempotency-key'] as string | undefined,
    userId: req.headers['x-user-id'] as string | undefined,
    requestId,
    startTime: Date.now()
  };
}

/**
 * Get all pricing plans with optional filtering
 * Supports: showArchived, planType query params
 * Headers: x-product (for filtering by product)
 */
export const getPlans = async (req: Request, res: Response) => {
  const requestId = req.context?.requestId || generateRequestId();

  try {
    if (!validateSupabaseConfig('api_businessModel', 'getPlans')) {
      return internalError(res, requestId, 'Missing Supabase configuration');
    }

    const context = getContext(req);

    if (!context.authToken) {
      return unauthorizedError(res, 'Authorization header is required', requestId);
    }

    if (!context.tenantId) {
      return badRequestError(res, 'x-tenant-id header is required', requestId);
    }

    const showArchived = req.query.showArchived === 'true';
    const planType = req.query.planType as string | undefined;

    // Use context-aware service method
    const plans = await businessModelService.getPlans(
      context.authToken,
      context.tenantId,
      showArchived,
      planType,
      context.productCode  // Pass product code for filtering
    );

    return res.status(200).json(plans);
  } catch (error: any) {
    console.error('Error in getPlans controller:', error.message);

    captureException(error instanceof Error ? error : new Error(String(error)), {
      tags: { source: 'api_businessModel', action: 'getPlans' },
      requestId
    });

    return handleEdgeError(res, error, requestId);
  }
};

/**
 * Get a specific pricing plan by ID
 */
export const getPlan = async (req: Request, res: Response) => {
  const requestId = req.context?.requestId || generateRequestId();
  const planId = req.params.id;

  try {
    if (!validateSupabaseConfig('api_businessModel', 'getPlan')) {
      return internalError(res, requestId, 'Missing Supabase configuration');
    }

    const context = getContext(req);

    if (!context.authToken) {
      return unauthorizedError(res, 'Authorization header is required', requestId);
    }

    if (!context.tenantId) {
      return badRequestError(res, 'x-tenant-id header is required', requestId);
    }

    const plan = await businessModelService.getPlan(
      context.authToken,
      context.tenantId,
      planId,
      context.productCode
    );

    if (!plan) {
      return notFoundError(res, 'Plan', requestId);
    }

    return res.status(200).json(plan);
  } catch (error: any) {
    console.error('Error in getPlan controller:', error.message);

    captureException(error instanceof Error ? error : new Error(String(error)), {
      tags: { source: 'api_businessModel', action: 'getPlan' },
      requestId,
      planId
    });

    return handleEdgeError(res, error, requestId);
  }
};

/**
 * Get plan data for editing (with suggested version number)
 */
export const getPlanForEdit = async (req: Request, res: Response) => {
  const requestId = req.context?.requestId || generateRequestId();
  const planId = req.params.id;

  try {
    if (!validateSupabaseConfig('api_businessModel', 'getPlanForEdit')) {
      return internalError(res, requestId, 'Missing Supabase configuration');
    }

    const context = getContext(req);

    if (!context.authToken) {
      return unauthorizedError(res, 'Authorization header is required', requestId);
    }

    if (!context.tenantId) {
      return badRequestError(res, 'x-tenant-id header is required', requestId);
    }

    const editData = await businessModelService.getPlanForEdit(
      context.authToken,
      context.tenantId,
      planId,
      context.productCode
    );

    if (!editData) {
      return notFoundError(res, 'Plan or active version', requestId);
    }

    return res.status(200).json(editData);
  } catch (error: any) {
    console.error('Error in getPlanForEdit controller:', error.message);

    captureException(error instanceof Error ? error : new Error(String(error)), {
      tags: { source: 'api_businessModel', action: 'getPlanForEdit' },
      requestId,
      planId
    });

    return handleEdgeError(res, error, requestId);
  }
};

/**
 * Create a new pricing plan
 * Supports idempotency via x-idempotency-key header
 */
export const createPlan = async (req: Request, res: Response) => {
  const requestId = req.context?.requestId || generateRequestId();

  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const fieldErrors: Record<string, string> = {};
      errors.array().forEach(err => {
        if ('path' in err) {
          fieldErrors[err.path] = err.msg;
        }
      });
      return validationError(res, fieldErrors, requestId);
    }

    if (!validateSupabaseConfig('api_businessModel', 'createPlan')) {
      return internalError(res, requestId, 'Missing Supabase configuration');
    }

    const context = getContext(req);

    if (!context.authToken) {
      return unauthorizedError(res, 'Authorization header is required', requestId);
    }

    if (!context.tenantId) {
      return badRequestError(res, 'x-tenant-id header is required', requestId);
    }

    // Pass idempotency key to service
    const plan = await businessModelService.createPlan(
      context.authToken,
      context.tenantId,
      req.body,
      context.productCode,
      context.idempotencyKey  // Forward idempotency key
    );

    return res.status(201).json(plan);
  } catch (error: any) {
    console.error('Error in createPlan controller:', error.message);

    captureException(error instanceof Error ? error : new Error(String(error)), {
      tags: { source: 'api_businessModel', action: 'createPlan' },
      requestId
    });

    return handleEdgeError(res, error, requestId);
  }
};

/**
 * Update plan by creating new version (edit workflow)
 * This is the main edit endpoint - always creates a new version
 * Supports idempotency via x-idempotency-key header
 */
export const updatePlanAsNewVersion = async (req: Request, res: Response) => {
  const requestId = req.context?.requestId || generateRequestId();

  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const fieldErrors: Record<string, string> = {};
      errors.array().forEach(err => {
        if ('path' in err) {
          fieldErrors[err.path] = err.msg;
        }
      });
      return validationError(res, fieldErrors, requestId);
    }

    if (!validateSupabaseConfig('api_businessModel', 'updatePlanAsNewVersion')) {
      return internalError(res, requestId, 'Missing Supabase configuration');
    }

    const context = getContext(req);

    if (!context.authToken) {
      return unauthorizedError(res, 'Authorization header is required', requestId);
    }

    if (!context.tenantId) {
      return badRequestError(res, 'x-tenant-id header is required', requestId);
    }

    // Validate required fields
    if (!req.body.plan_id) {
      return badRequestError(res, 'plan_id is required for edit workflow', requestId);
    }

    if (!req.body.next_version_number) {
      return badRequestError(res, 'next_version_number is required', requestId);
    }

    if (!req.body.changelog || req.body.changelog.trim().length < 5) {
      return badRequestError(res, 'changelog must be at least 5 characters long', requestId);
    }

    // Pass idempotency key to service
    const plan = await businessModelService.updatePlanAsNewVersion(
      context.authToken,
      context.tenantId,
      req.body,
      context.productCode,
      context.idempotencyKey  // Forward idempotency key
    );

    return res.status(200).json(plan);
  } catch (error: any) {
    console.error('Error in updatePlanAsNewVersion controller:', error.message);

    // Log full error details for debugging
    if (error.response?.data) {
      console.error('Full error response:', JSON.stringify(error.response.data, null, 2));
    }

    captureException(error instanceof Error ? error : new Error(String(error)), {
      tags: { source: 'api_businessModel', action: 'updatePlanAsNewVersion' },
      requestId,
      planId: req.body.plan_id
    });

    return handleEdgeError(res, error, requestId);
  }
};

/**
 * Update plan metadata only (rare operation)
 * Supports idempotency via x-idempotency-key header
 */
export const updatePlan = async (req: Request, res: Response) => {
  const requestId = req.context?.requestId || generateRequestId();
  const planId = req.params.id;

  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const fieldErrors: Record<string, string> = {};
      errors.array().forEach(err => {
        if ('path' in err) {
          fieldErrors[err.path] = err.msg;
        }
      });
      return validationError(res, fieldErrors, requestId);
    }

    if (!validateSupabaseConfig('api_businessModel', 'updatePlan')) {
      return internalError(res, requestId, 'Missing Supabase configuration');
    }

    const context = getContext(req);

    if (!context.authToken) {
      return unauthorizedError(res, 'Authorization header is required', requestId);
    }

    if (!context.tenantId) {
      return badRequestError(res, 'x-tenant-id header is required', requestId);
    }

    const plan = await businessModelService.updatePlan(
      context.authToken,
      context.tenantId,
      planId,
      req.body,
      context.productCode,
      context.idempotencyKey
    );

    return res.status(200).json(plan);
  } catch (error: any) {
    console.error('Error in updatePlan controller:', error.message);

    captureException(error instanceof Error ? error : new Error(String(error)), {
      tags: { source: 'service_businessModel', action: 'updatePlan' },
      requestId,
      planId
    });

    return handleEdgeError(res, error, requestId);
  }
};

/**
 * Toggle plan visibility
 * Supports idempotency via x-idempotency-key header
 */
export const togglePlanVisibility = async (req: Request, res: Response) => {
  const requestId = req.context?.requestId || generateRequestId();
  const planId = req.params.id;

  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const fieldErrors: Record<string, string> = {};
      errors.array().forEach(err => {
        if ('path' in err) {
          fieldErrors[err.path] = err.msg;
        }
      });
      return validationError(res, fieldErrors, requestId);
    }

    if (!validateSupabaseConfig('api_businessModel', 'togglePlanVisibility')) {
      return internalError(res, requestId, 'Missing Supabase configuration');
    }

    const context = getContext(req);

    if (!context.authToken) {
      return unauthorizedError(res, 'Authorization header is required', requestId);
    }

    if (!context.tenantId) {
      return badRequestError(res, 'x-tenant-id header is required', requestId);
    }

    const isVisible = req.body.is_visible;
    if (isVisible === undefined) {
      return badRequestError(res, 'is_visible field is required', requestId);
    }

    const plan = await businessModelService.togglePlanVisibility(
      context.authToken,
      context.tenantId,
      planId,
      isVisible,
      context.productCode,
      context.idempotencyKey
    );

    return res.status(200).json(plan);
  } catch (error: any) {
    console.error('Error in togglePlanVisibility controller:', error.message);

    captureException(error instanceof Error ? error : new Error(String(error)), {
      tags: { source: 'api_businessModel', action: 'togglePlanVisibility' },
      requestId,
      planId
    });

    return handleEdgeError(res, error, requestId);
  }
};

/**
 * Archive a pricing plan
 * Supports idempotency via x-idempotency-key header
 */
export const archivePlan = async (req: Request, res: Response) => {
  const requestId = req.context?.requestId || generateRequestId();
  const planId = req.params.id;

  try {
    if (!validateSupabaseConfig('api_businessModel', 'archivePlan')) {
      return internalError(res, requestId, 'Missing Supabase configuration');
    }

    const context = getContext(req);

    if (!context.authToken) {
      return unauthorizedError(res, 'Authorization header is required', requestId);
    }

    if (!context.tenantId) {
      return badRequestError(res, 'x-tenant-id header is required', requestId);
    }

    const plan = await businessModelService.archivePlan(
      context.authToken,
      context.tenantId,
      planId,
      context.productCode,
      context.idempotencyKey
    );

    return res.status(200).json(plan);
  } catch (error: any) {
    console.error('Error in archivePlan controller:', error.message);

    captureException(error instanceof Error ? error : new Error(String(error)), {
      tags: { source: 'api_businessModel', action: 'archivePlan' },
      requestId,
      planId
    });

    return handleEdgeError(res, error, requestId);
  }
};
