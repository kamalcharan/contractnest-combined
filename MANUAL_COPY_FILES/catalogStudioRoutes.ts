// backend/src/routes/catalogStudioRoutes.ts
/**
 * Catalog Studio Routes
 * Express router for blocks and templates endpoints
 */

import express, { Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/auth';
import catalogStudioController from '../controllers/catalogStudioController';

const router = express.Router();

// ============================================
// Middleware
// ============================================

// Apply authentication to all routes
router.use(authenticate);

/**
 * Validate required tenant header
 */
const validateTenant = (req: Request, res: Response, next: NextFunction): void => {
  const tenantId = req.headers['x-tenant-id'];

  if (!tenantId) {
    res.status(400).json({
      success: false,
      error: { code: 'BAD_REQUEST', message: 'x-tenant-id header is required' },
    });
    return;
  }

  next();
};

/**
 * Validate UUID parameter
 */
const validateUUID = (paramName: string) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const id = req.params[paramName];
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    if (!uuidRegex.test(id)) {
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_FORMAT', message: `Invalid ${paramName} format. Expected UUID.` },
      });
      return;
    }

    next();
  };
};

/**
 * Require admin access
 */
const requireAdmin = (req: Request, res: Response, next: NextFunction): void => {
  const isAdmin = req.headers['x-is-admin'] === 'true';

  if (!isAdmin) {
    res.status(403).json({
      success: false,
      error: { code: 'FORBIDDEN', message: 'Admin access required' },
    });
    return;
  }

  next();
};

// ============================================
// Block Routes
// ============================================

// GET /blocks - List all blocks
router.get(
  '/blocks',
  validateTenant,
  catalogStudioController.getBlocks
);

// GET /blocks/:id - Get single block
router.get(
  '/blocks/:id',
  validateTenant,
  validateUUID('id'),
  catalogStudioController.getBlockById
);

// POST /blocks - Create block (admin only)
router.post(
  '/blocks',
  validateTenant,
  requireAdmin,
  catalogStudioController.createBlock
);

// PATCH /blocks/:id - Update block (admin only)
router.patch(
  '/blocks/:id',
  validateTenant,
  requireAdmin,
  validateUUID('id'),
  catalogStudioController.updateBlock
);

// DELETE /blocks/:id - Delete block (admin only)
router.delete(
  '/blocks/:id',
  validateTenant,
  requireAdmin,
  validateUUID('id'),
  catalogStudioController.deleteBlock
);

// ============================================
// Template Routes
// ============================================

// GET /templates - List tenant templates
router.get(
  '/templates',
  validateTenant,
  catalogStudioController.getTemplates
);

// GET /templates/system - List system templates
router.get(
  '/templates/system',
  validateTenant,
  catalogStudioController.getSystemTemplates
);

// GET /templates/public - List public templates
router.get(
  '/templates/public',
  validateTenant,
  catalogStudioController.getPublicTemplates
);

// GET /templates/:id - Get single template
router.get(
  '/templates/:id',
  validateTenant,
  validateUUID('id'),
  catalogStudioController.getTemplateById
);

// POST /templates - Create template
router.post(
  '/templates',
  validateTenant,
  catalogStudioController.createTemplate
);

// POST /templates/:id/copy - Copy system template to tenant
router.post(
  '/templates/:id/copy',
  validateTenant,
  validateUUID('id'),
  catalogStudioController.copyTemplate
);

// PATCH /templates/:id - Update template
router.patch(
  '/templates/:id',
  validateTenant,
  validateUUID('id'),
  catalogStudioController.updateTemplate
);

// DELETE /templates/:id - Delete template
router.delete(
  '/templates/:id',
  validateTenant,
  validateUUID('id'),
  catalogStudioController.deleteTemplate
);

// ============================================
// Health Check
// ============================================

router.get('/health', (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      service: 'catalog-studio',
      status: 'healthy',
      timestamp: new Date().toISOString(),
    },
  });
});

export default router;
