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

  /** GET /api/group-sessions/occurrences/:blockId */
  dashOccurrences = async (req: AuthRequest, res: Response): Promise<void> => {
    const tenantId = this.tenantId(req);
    const blockId = req.params.blockId;
    if (!tenantId) {
      sendError(res, ERROR_CODES.VALIDATION_ERROR, 'Tenant is required', 400);
      return;
    }
    if (!blockId) {
      sendError(res, ERROR_CODES.VALIDATION_ERROR, 'blockId is required', 400);
      return;
    }
    const result = await groupSessionsDashboardService.dashOccurrences(tenantId, blockId, this.isLive(req));
    if (!result.success) {
      sendError(res, ERROR_CODES.INTERNAL_ERROR, result.error?.message || 'Failed to load occurrences', 500);
      return;
    }
    sendSuccess(res, result.data);
  };

  /** POST /api/group-sessions/occurrences/:blockId/generate */
  generateSchedule = async (req: AuthRequest, res: Response): Promise<void> => {
    const tenantId = this.tenantId(req);
    const blockId = req.params.blockId;
    if (!tenantId || !blockId) {
      sendError(res, ERROR_CODES.VALIDATION_ERROR, 'Tenant and blockId are required', 400);
      return;
    }
    const { start, end } = req.body || {};
    const result = await groupSessionsDashboardService.generateSchedule(tenantId, blockId, this.isLive(req), start, end);
    if (!result.success) {
      sendError(res, ERROR_CODES.INTERNAL_ERROR, result.error?.message || 'Failed to generate schedule', 500);
      return;
    }
    sendSuccess(res, result.data);
  };

  /** POST /api/group-sessions/occurrence/:id/move  body:{ date, note? } */
  moveOccurrence = async (req: AuthRequest, res: Response): Promise<void> => {
    const tenantId = this.tenantId(req);
    const id = req.params.id;
    const { date, note } = req.body || {};
    if (!tenantId || !id) {
      sendError(res, ERROR_CODES.VALIDATION_ERROR, 'Tenant and occurrence id are required', 400);
      return;
    }
    if (!date) {
      sendError(res, ERROR_CODES.VALIDATION_ERROR, 'date is required', 400);
      return;
    }
    const result = await groupSessionsDashboardService.scheduleMove(tenantId, id, date, note);
    if (!result.success) {
      sendError(res, ERROR_CODES.INTERNAL_ERROR, result.error?.message || 'Failed to move occurrence', 500);
      return;
    }
    sendSuccess(res, result.data);
  };

  /** POST /api/group-sessions/occurrence/:id/status  body:{ status, note? } */
  setOccurrenceStatus = async (req: AuthRequest, res: Response): Promise<void> => {
    const tenantId = this.tenantId(req);
    const id = req.params.id;
    const { status, note } = req.body || {};
    if (!tenantId || !id) {
      sendError(res, ERROR_CODES.VALIDATION_ERROR, 'Tenant and occurrence id are required', 400);
      return;
    }
    if (!status) {
      sendError(res, ERROR_CODES.VALIDATION_ERROR, 'status is required', 400);
      return;
    }
    const result = await groupSessionsDashboardService.scheduleStatus(tenantId, id, status, note);
    if (!result.success) {
      sendError(res, ERROR_CODES.INTERNAL_ERROR, result.error?.message || 'Failed to update occurrence', 500);
      return;
    }
    sendSuccess(res, result.data);
  };

  /** POST /api/group-sessions/occurrences/:blockId/add  body:{ date, note? } */
  addOccurrence = async (req: AuthRequest, res: Response): Promise<void> => {
    const tenantId = this.tenantId(req);
    const blockId = req.params.blockId;
    const { date, note } = req.body || {};
    if (!tenantId || !blockId) {
      sendError(res, ERROR_CODES.VALIDATION_ERROR, 'Tenant and blockId are required', 400);
      return;
    }
    if (!date) {
      sendError(res, ERROR_CODES.VALIDATION_ERROR, 'date is required', 400);
      return;
    }
    const result = await groupSessionsDashboardService.scheduleAdd(tenantId, blockId, this.isLive(req), date, note);
    if (!result.success) {
      sendError(res, ERROR_CODES.INTERNAL_ERROR, result.error?.message || 'Failed to add occurrence', 500);
      return;
    }
    sendSuccess(res, result.data);
  };

  /** GET /api/group-sessions/roster/:blockId */
  dashRoster = async (req: AuthRequest, res: Response): Promise<void> => {
    const tenantId = this.tenantId(req);
    const blockId = req.params.blockId;
    if (!tenantId) {
      sendError(res, ERROR_CODES.VALIDATION_ERROR, 'Tenant is required', 400);
      return;
    }
    if (!blockId) {
      sendError(res, ERROR_CODES.VALIDATION_ERROR, 'blockId is required', 400);
      return;
    }
    const result = await groupSessionsDashboardService.dashRoster(tenantId, blockId, this.isLive(req));
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

  /** POST /api/group-sessions/token/:blockId → mint/return the block QR token */
  ensureToken = async (req: AuthRequest, res: Response): Promise<void> => {
    const tenantId = this.tenantId(req);
    const blockId = req.params.blockId;
    if (!tenantId || !blockId) {
      sendError(res, ERROR_CODES.VALIDATION_ERROR, 'Tenant and blockId are required', 400);
      return;
    }
    const result = await groupSessionsDashboardService.ensureBlockToken(tenantId, blockId, this.isLive(req));
    if (!result.success) {
      sendError(res, ERROR_CODES.INTERNAL_ERROR, result.error?.message || 'Failed to create check-in token', 500);
      return;
    }
    sendSuccess(res, result.data);
  };
}

export default new GroupSessionsDashboardController();
