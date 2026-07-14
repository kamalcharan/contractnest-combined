// ============================================================================
// Group Sessions Dashboard Controller — chair-side read model
// ============================================================================
//   GET /api/group-sessions/sessions               → overview list + aggregates
//   GET /api/group-sessions/occurrences/:contractId → occurrences for a session
//   GET /api/group-sessions/roster/:contractId      → roster + attendance + dues
//   GET /api/group-sessions/member/:memberId        → member drill-down
//
// tenant/environment come from headers (authenticate middleware runs before us),
// mirroring vaniDeskController.
// ============================================================================

import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { sendSuccess, sendError, ERROR_CODES } from '../utils/apiResponseHelpers';
import groupSessionsDashboardService from '../services/groupSessionsDashboardService';

class GroupSessionsDashboardController {
  private tenantId(req: AuthRequest): string {
    return (req.headers['x-tenant-id'] as string) || '';
  }

  private isLive(req: AuthRequest): boolean {
    return ((req.headers['x-environment'] as string) || 'live') === 'live';
  }

  /** GET /api/group-sessions/sessions */
  dashSessions = async (req: AuthRequest, res: Response): Promise<void> => {
    const tenantId = this.tenantId(req);
    if (!tenantId) {
      sendError(res, ERROR_CODES.VALIDATION_ERROR, 'Tenant is required', 400);
      return;
    }
    const result = await groupSessionsDashboardService.dashSessions(tenantId, this.isLive(req));
    if (!result.success) {
      sendError(res, ERROR_CODES.INTERNAL_ERROR, result.error?.message || 'Failed to load group sessions', 500);
      return;
    }
    sendSuccess(res, result.data);
  };

  /** GET /api/group-sessions/occurrences/:contractId */
  dashOccurrences = async (req: AuthRequest, res: Response): Promise<void> => {
    const tenantId = this.tenantId(req);
    const contractId = req.params.contractId;
    if (!tenantId) {
      sendError(res, ERROR_CODES.VALIDATION_ERROR, 'Tenant is required', 400);
      return;
    }
    if (!contractId) {
      sendError(res, ERROR_CODES.VALIDATION_ERROR, 'contractId is required', 400);
      return;
    }
    const result = await groupSessionsDashboardService.dashOccurrences(tenantId, contractId);
    if (!result.success) {
      sendError(res, ERROR_CODES.INTERNAL_ERROR, result.error?.message || 'Failed to load occurrences', 500);
      return;
    }
    sendSuccess(res, result.data);
  };

  /** GET /api/group-sessions/roster/:contractId */
  dashRoster = async (req: AuthRequest, res: Response): Promise<void> => {
    const tenantId = this.tenantId(req);
    const contractId = req.params.contractId;
    if (!tenantId) {
      sendError(res, ERROR_CODES.VALIDATION_ERROR, 'Tenant is required', 400);
      return;
    }
    if (!contractId) {
      sendError(res, ERROR_CODES.VALIDATION_ERROR, 'contractId is required', 400);
      return;
    }
    const result = await groupSessionsDashboardService.dashRoster(tenantId, contractId);
    if (!result.success) {
      sendError(res, ERROR_CODES.INTERNAL_ERROR, result.error?.message || 'Failed to load roster', 500);
      return;
    }
    sendSuccess(res, result.data);
  };

  /** GET /api/group-sessions/member/:memberId */
  dashMember = async (req: AuthRequest, res: Response): Promise<void> => {
    const tenantId = this.tenantId(req);
    const memberId = req.params.memberId;
    if (!tenantId) {
      sendError(res, ERROR_CODES.VALIDATION_ERROR, 'Tenant is required', 400);
      return;
    }
    if (!memberId) {
      sendError(res, ERROR_CODES.VALIDATION_ERROR, 'memberId is required', 400);
      return;
    }
    const result = await groupSessionsDashboardService.dashMember(tenantId, memberId);
    if (!result.success) {
      sendError(res, ERROR_CODES.INTERNAL_ERROR, result.error?.message || 'Failed to load member', 500);
      return;
    }
    sendSuccess(res, result.data);
  };
}

export default new GroupSessionsDashboardController();
