// ============================================================================
// VaNi Composer Routes — Phase 1
// ============================================================================
// Mounted at /api/vani-composer (see src/index.ts).
// Pattern follows contractEventRoutes: authenticate → tenant guard → rate limit.
// ============================================================================

import { Router, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { authenticate, AuthRequest } from '../middleware/auth';
import vaniComposerController from '../controllers/vaniComposerController';

const router = Router();

router.use(authenticate);

// Tenant guard — composer is strictly tenant-scoped
router.use((req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.headers['x-tenant-id']) {
    res.status(400).json({
      success: false,
      error: { code: 'MISSING_TENANT', message: 'x-tenant-id header is required' },
    });
    return;
  }
  next();
});

// LLM calls are expensive (CPU inference) — keep the lid on
const composerRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { code: 'RATE_LIMITED', message: 'Too many VaNi requests — try again in a minute' } },
});
router.use(composerRateLimit);

router.get('/health', vaniComposerController.health);
router.post('/parse-intent', vaniComposerController.parseIntent);
router.post('/compose', vaniComposerController.compose);
router.post('/feedback', vaniComposerController.feedback);

export default router;
