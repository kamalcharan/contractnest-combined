// src/routes/adminTenantRoutes.ts
// Admin Tenant Management Routes

import { Router, Request, Response } from 'express';
import { adminTenantService } from '../services/adminTenantService';

const router = Router();

/**
 * GET /api/admin/tenants/stats
 * Returns platform-wide stats for the admin dashboard
 */
router.get('/stats', async (req: Request, res: Response) => {
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
router.get('/list', async (req: Request, res: Response) => {
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
