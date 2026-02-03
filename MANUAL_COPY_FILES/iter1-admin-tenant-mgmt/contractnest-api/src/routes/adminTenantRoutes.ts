// src/routes/adminTenantRoutes.ts
// Admin Tenant Management Routes

import { Router, Request, Response } from 'express';
import { adminTenantService } from '../services/adminTenantService';

const router = Router();

/**
 * Middleware: require admin role (header-based, matching catalogStudioRoutes pattern)
 */
const requireAdmin = (req: Request, res: Response, next: Function): void => {
  const isAdmin = req.headers['x-is-admin'] === 'true';
  if (!isAdmin) {
    res.status(403).json({
      success: false,
      error: { code: 'FORBIDDEN', message: 'Admin access required' }
    });
    return;
  }
  next();
};

/**
 * GET /api/admin/tenants/stats
 * Returns platform-wide stats for the admin dashboard
 */
router.get('/stats', requireAdmin, async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization || '';
    const tenantId = (req.headers['x-tenant-id'] as string) || '';

    const result = await adminTenantService.getStats(authHeader, tenantId);

    res.json(result);
  } catch (error: any) {
    console.error('[AdminTenantRoutes] GET /stats error:', error.message);
    res.status(error.status || 500).json({
      success: false,
      error: { code: 'STATS_ERROR', message: error.message || 'Failed to load stats' }
    });
  }
});

/**
 * GET /api/admin/tenants/list
 * Returns paginated tenant list with profile, subscription, and record counts
 */
router.get('/list', requireAdmin, async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization || '';
    const tenantId = (req.headers['x-tenant-id'] as string) || '';

    const filters = {
      page: req.query.page ? parseInt(req.query.page as string) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
      status: req.query.status as string || undefined,
      subscription_status: req.query.subscription_status as string || undefined,
      search: req.query.search as string || undefined,
      sort_by: req.query.sort_by as string || undefined,
      sort_direction: req.query.sort_direction as string || undefined
    };

    const result = await adminTenantService.getTenants(authHeader, tenantId, filters);

    res.json(result);
  } catch (error: any) {
    console.error('[AdminTenantRoutes] GET /list error:', error.message);
    res.status(error.status || 500).json({
      success: false,
      error: { code: 'LIST_ERROR', message: error.message || 'Failed to load tenants' }
    });
  }
});

export default router;
