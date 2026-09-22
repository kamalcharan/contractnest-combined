// src/routes/storageAdminRoutes.ts
// ============================================================================
// Storage admin routes — mounted at /api/admin/storage (see src/index.ts)
// ============================================================================
// Platform-admin only. The sweep runs itself on a timer; these exist so it can
// be inspected and triggered on demand rather than waited for.
//
//   GET  /sweep/status   what a sweep would find, touching nothing
//   POST /sweep          run one now (skips the due() check)
//
// The batch H admin screen will hang off this same router.
// ============================================================================

import express from 'express';
import rateLimit from 'express-rate-limit';
import { authenticate, requireAdmin } from '../middleware/auth';
import { storageCleanupService } from '../services/storageCleanupService';

const router = express.Router();

router.use(authenticate);
router.use(requireAdmin);

// A sweep deletes objects, so it is rate limited well below what a human needs.
const sweepLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
});

router.get('/sweep/status', async (_req: express.Request, res: express.Response) => {
  const status = await storageCleanupService.status();
  res.status(200).json({
    success: true,
    data: status,
    metadata: { timestamp: new Date().toISOString() },
  });
});

router.post('/sweep', sweepLimit, async (req: express.Request, res: express.Response) => {
  const rawLimit = Number(req.body?.limit);
  const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(Math.floor(rawLimit), 1000) : undefined;

  const summary = await storageCleanupService.runSweep({ force: true, limit });

  // A skipped sweep is not an error — it is the honest answer to "run now".
  // 'not_configured' is a 500 like everywhere else in this feature: a 503
  // would be cached by the UI's maintenance interceptor and lock the session.
  const status = summary.skipped === 'not_configured' || summary.skipped === 'no_database' ? 500 : 200;

  res.status(status).json({
    success: status === 200,
    data: summary,
    metadata: { timestamp: new Date().toISOString() },
  });
});

export default router;
