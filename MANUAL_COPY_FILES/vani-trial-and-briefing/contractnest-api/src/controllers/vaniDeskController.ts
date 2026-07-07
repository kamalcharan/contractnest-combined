// ============================================================================
// VaNi Desk Controller — vani-trial-and-briefing batch
// ============================================================================
//   GET  /api/vani/entitlement  → entitlement + trial state (landing page CTA)
//   POST /api/vani/trial/start  → start the 7-day trial (idempotent)
//   GET  /api/vani/briefing     → Briefing page payload (gated by entitlement)
//
// Context extraction mirrors vaniComposerController: tenant/environment from
// headers (authenticate middleware runs before us).
// ============================================================================

import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { sendSuccess, sendError, internalError, ERROR_CODES } from '../utils/apiResponseHelpers';
import vaniDeskService from '../services/vaniDeskService';
import vaniEntitlementService from '../services/vaniEntitlementService';

class VaniDeskController {
  private tenantId(req: AuthRequest): string {
    return (req.headers['x-tenant-id'] as string) || '';
  }

  private isLive(req: AuthRequest): boolean {
    return ((req.headers['x-environment'] as string) || 'live') === 'live';
  }

  /** GET /api/vani/entitlement */
  getEntitlement = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const details = await vaniEntitlementService.getDetails(this.tenantId(req));
      sendSuccess(res, details);
    } catch (error) {
      console.error('[VaniDeskController] getEntitlement error:', error);
      internalError(res, 'Failed to load VaNi entitlement');
    }
  };

  /** POST /api/vani/trial/start */
  startTrial = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const tenantId = this.tenantId(req);
      const result = await vaniDeskService.startTrial(tenantId);

      if (!result.success) {
        sendError(
          res,
          ERROR_CODES.INTERNAL_ERROR,
          result.error?.message || 'Could not start the VaNi trial',
          500
        );
        return;
      }

      sendSuccess(res, result.data);
    } catch (error) {
      console.error('[VaniDeskController] startTrial error:', error);
      internalError(res, 'Failed to start the VaNi trial');
    }
  };

  /** GET /api/vani/briefing?days=7 */
  getBriefing = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const tenantId = this.tenantId(req);

      // Gate: Briefing is a VaNi surface (mode=open passes everyone through)
      const entitled = await vaniEntitlementService.isEntitled(tenantId);
      if (!entitled) {
        sendError(res, ERROR_CODES.FORBIDDEN, 'VaNi trial or subscription required', 403);
        return;
      }

      const daysRaw = parseInt(String(req.query.days ?? '7'), 10);
      const feedDays = Number.isFinite(daysRaw) ? Math.min(Math.max(daysRaw, 1), 30) : 7;

      const result = await vaniDeskService.getBriefing(tenantId, this.isLive(req), feedDays);

      if (!result.success) {
        sendError(
          res,
          ERROR_CODES.INTERNAL_ERROR,
          result.error?.message || 'Could not load the briefing',
          500
        );
        return;
      }

      sendSuccess(res, result.data);
    } catch (error) {
      console.error('[VaniDeskController] getBriefing error:', error);
      internalError(res, 'Failed to load the VaNi briefing');
    }
  };
}

export default VaniDeskController;
