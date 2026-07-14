// ============================================================================
// Group Sessions Dashboard Routes — mounted at /api/group-sessions
// ============================================================================
// Authenticated, chair-side read model for the generic Group Sessions dashboard.
// tenant/environment are read from headers inside the controller.

import express from 'express';
import groupSessionsDashboardController from '../controllers/groupSessionsDashboardController';
import { authenticate } from '../middleware/auth';

const router = express.Router();

router.use(authenticate);

// GET /api/group-sessions/sessions                     → overview list + aggregates
router.get('/sessions', groupSessionsDashboardController.dashSessions);
// GET /api/group-sessions/occurrences/:contractId      → occurrences for a session
router.get('/occurrences/:contractId', groupSessionsDashboardController.dashOccurrences);
// GET /api/group-sessions/roster/:contractId           → roster + attendance + dues
router.get('/roster/:contractId', groupSessionsDashboardController.dashRoster);
// GET /api/group-sessions/member/:memberId             → member drill-down
router.get('/member/:memberId', groupSessionsDashboardController.dashMember);

export default router;
