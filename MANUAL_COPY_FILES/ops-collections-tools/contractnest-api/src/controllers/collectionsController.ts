// ============================================================================
// Collections Controller — Ops on JTD, Collections lane
// ============================================================================
// Derives the ACTOR from the authenticated user (VaNi will use its service
// identity later), the environment from x-environment, validates the body
// shape, and maps the RPC's machine-readable refusal `reason` to an HTTP
// status + error code the UI can turn into copy. No business rules here.
// Spec: specs/OPS-JTD-TOOLS-SPEC.md §4, §8.
// ============================================================================

import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { sendSuccess, sendError, internalError, ERROR_CODES } from '../utils/apiResponseHelpers';
import collectionsService, { Actor } from '../services/collectionsService';
import { invoiceService } from '../services/invoiceService';

const CHANNELS = ['email', 'whatsapp'] as const;
const OUTCOMES = ['reached', 'no_answer', 'promised', 'disputed', 'other'] as const;
const PAUSE_REASONS = ['promise', 'dispute', 'manual'] as const;

// Refusals that are the caller's doing (400/404/409) vs. everything else (500).
const REFUSAL_STATUS: Record<string, number> = {
  job_not_found: 404,
  assignee_not_in_tenant: 404,
  job_not_open: 409,
  already_paid: 409,
  nothing_owed: 409,
  paused: 409,
  declaration_pending: 409,
  already_sent_just_now: 409,
  duplicate_rung: 409,
  call_already_open: 409,
  no_recipient: 422,
  no_address: 422,
  no_template: 422,
  incomplete: 422,
  unsupported_channel: 400,
  invalid_outcome: 400,
  promise_date_required: 400,
  invalid_reason: 400,
  actor_required: 401,
};

class CollectionsController {
  private tenantId(req: AuthRequest): string {
    return (req.headers['x-tenant-id'] as string) || '';
  }

  private isLive(req: AuthRequest): boolean {
    return ((req.headers['x-environment'] as string) || 'live') === 'live';
  }

  /** The signed-in human is the actor. Name from the profile when present, else email. */
  private actor(req: AuthRequest): Actor | null {
    const u = req.user;
    if (!u?.id) return null;
    const name =
      [u.first_name, u.last_name].filter(Boolean).join(' ').trim() ||
      u.user_metadata?.full_name ||
      u.email ||
      null;
    return { type: 'user', id: u.id, name };
  }

  private refuse(res: Response, error: { code: string; message: string; details?: any }) {
    const status = REFUSAL_STATUS[error.code] ?? (error.code === 'RPC_ERROR' || error.code === 'INTERNAL' || error.code === 'CONFIG' ? 500 : 409);
    const code =
      status === 404 ? ERROR_CODES.NOT_FOUND :
      status === 400 ? ERROR_CODES.VALIDATION_ERROR :
      status === 401 ? ERROR_CODES.UNAUTHORIZED :
      status === 500 ? ERROR_CODES.INTERNAL_ERROR :
      ERROR_CODES.CONFLICT;
    // The RPC's reason travels as the code so the UI can pick its own copy;
    // the human message is the fallback.
    res.status(status).json({
      success: false,
      error: { code: error.code, category: code, message: error.message, details: error.details ?? null },
      metadata: { timestamp: new Date().toISOString() }
    });
  }

  private str(v: unknown): string | null {
    if (v === undefined || v === null) return null;
    const s = String(v).trim();
    return s === '' ? null : s;
  }

  /** GET /worklist?horizon=30 */
  worklist = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const horizon = Math.min(Math.max(parseInt(String(req.query.horizon ?? '30'), 10) || 30, 1), 120);
      const result = await collectionsService.worklist(this.tenantId(req), this.isLive(req), horizon);
      if (!result.success) { this.refuse(res, result.error!); return; }
      sendSuccess(res, result.data);
    } catch (error) {
      console.error('[CollectionsController] worklist error:', error);
      internalError(res, 'Failed to load the collections worklist');
    }
  };

  /** POST /payments/:jobId/nudge  {channel, note} */
  nudge = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const actor = this.actor(req);
      if (!actor) { sendError(res, ERROR_CODES.UNAUTHORIZED, 'Sign in to send reminders', 401); return; }
      const tenantId = this.tenantId(req);
      const jobId = String(req.params.jobId || '');
      const channel = String(req.body?.channel || '');
      if (!jobId) { sendError(res, ERROR_CODES.VALIDATION_ERROR, 'jobId is required', 400); return; }
      if (!(CHANNELS as readonly string[]).includes(channel)) {
        sendError(res, ERROR_CODES.VALIDATION_ERROR, 'channel must be email or whatsapp', 400); return;
      }

      // Pay line: the tenant's offline UPI when configured (same source the
      // invoice send uses). Gateway link minting is deliberately not done for
      // a reminder — a failed lookup must never block the nudge.
      let upiId: string | null = null;
      let paymentLink: string | null = null;
      try {
        const cfg = await invoiceService.getTenantPaymentConfig({ tenantId, isLive: this.isLive(req) });
        if (cfg?.data?.configured && cfg.data.upi_id) {
          upiId = String(cfg.data.upi_id);
          paymentLink = `upi://pay?pa=${encodeURIComponent(upiId)}&cu=INR`;
        }
      } catch (e: any) {
        console.warn('[CollectionsController] UPI config lookup failed, sending without a pay line:', e?.message);
      }

      const result = await collectionsService.nudge(
        tenantId, jobId, channel as 'email' | 'whatsapp', actor, this.str(req.body?.note), paymentLink, upiId
      );
      if (!result.success) { this.refuse(res, result.error!); return; }
      sendSuccess(res, result.data);
    } catch (error) {
      console.error('[CollectionsController] nudge error:', error);
      internalError(res, 'Failed to send the reminder');
    }
  };

  /** POST /payments/:jobId/call  {called_at, outcome, notes, promise_date} */
  logCall = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const actor = this.actor(req);
      if (!actor) { sendError(res, ERROR_CODES.UNAUTHORIZED, 'Sign in to log a call', 401); return; }
      const jobId = String(req.params.jobId || '');
      const outcome = String(req.body?.outcome || '');
      if (!jobId) { sendError(res, ERROR_CODES.VALIDATION_ERROR, 'jobId is required', 400); return; }
      if (!(OUTCOMES as readonly string[]).includes(outcome)) {
        sendError(res, ERROR_CODES.VALIDATION_ERROR, `outcome must be one of ${OUTCOMES.join(', ')}`, 400); return;
      }
      const calledAt = this.str(req.body?.called_at);
      if (calledAt && Number.isNaN(Date.parse(calledAt))) {
        sendError(res, ERROR_CODES.VALIDATION_ERROR, 'called_at must be a date-time', 400); return;
      }
      const promiseDate = this.str(req.body?.promise_date);
      if (promiseDate && !/^\d{4}-\d{2}-\d{2}$/.test(promiseDate)) {
        sendError(res, ERROR_CODES.VALIDATION_ERROR, 'promise_date must be YYYY-MM-DD', 400); return;
      }

      const result = await collectionsService.logCall(
        this.tenantId(req), jobId, actor, calledAt, outcome, this.str(req.body?.notes), promiseDate
      );
      if (!result.success) { this.refuse(res, result.error!); return; }
      sendSuccess(res, result.data);
    } catch (error) {
      console.error('[CollectionsController] logCall error:', error);
      internalError(res, 'Failed to log the call');
    }
  };

  /** POST /payments/:jobId/escalate  {assign_to, note} */
  escalate = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const actor = this.actor(req);
      if (!actor) { sendError(res, ERROR_CODES.UNAUTHORIZED, 'Sign in to assign a call', 401); return; }
      const jobId = String(req.params.jobId || '');
      const assignTo = this.str(req.body?.assign_to);
      if (!jobId || !assignTo) { sendError(res, ERROR_CODES.VALIDATION_ERROR, 'jobId and assign_to are required', 400); return; }

      const result = await collectionsService.escalate(this.tenantId(req), jobId, assignTo, actor, this.str(req.body?.note));
      if (!result.success) { this.refuse(res, result.error!); return; }
      sendSuccess(res, result.data);
    } catch (error) {
      console.error('[CollectionsController] escalate error:', error);
      internalError(res, 'Failed to assign the call');
    }
  };

  /** POST /payments/:jobId/pause  {reason, until, note} */
  pause = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const actor = this.actor(req);
      if (!actor) { sendError(res, ERROR_CODES.UNAUTHORIZED, 'Sign in to pause reminders', 401); return; }
      const jobId = String(req.params.jobId || '');
      const reason = String(req.body?.reason || '');
      if (!jobId) { sendError(res, ERROR_CODES.VALIDATION_ERROR, 'jobId is required', 400); return; }
      if (!(PAUSE_REASONS as readonly string[]).includes(reason)) {
        sendError(res, ERROR_CODES.VALIDATION_ERROR, `reason must be one of ${PAUSE_REASONS.join(', ')}`, 400); return;
      }
      const until = this.str(req.body?.until);
      if (until && !/^\d{4}-\d{2}-\d{2}$/.test(until)) {
        sendError(res, ERROR_CODES.VALIDATION_ERROR, 'until must be YYYY-MM-DD', 400); return;
      }

      const result = await collectionsService.pause(this.tenantId(req), jobId, reason, actor, until, this.str(req.body?.note));
      if (!result.success) { this.refuse(res, result.error!); return; }
      sendSuccess(res, result.data);
    } catch (error) {
      console.error('[CollectionsController] pause error:', error);
      internalError(res, 'Failed to pause reminders');
    }
  };

  /** POST /payments/:jobId/resume  {note} */
  resume = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const actor = this.actor(req);
      if (!actor) { sendError(res, ERROR_CODES.UNAUTHORIZED, 'Sign in to resume reminders', 401); return; }
      const jobId = String(req.params.jobId || '');
      if (!jobId) { sendError(res, ERROR_CODES.VALIDATION_ERROR, 'jobId is required', 400); return; }

      const result = await collectionsService.resume(this.tenantId(req), jobId, actor, this.str(req.body?.note));
      if (!result.success) { this.refuse(res, result.error!); return; }
      sendSuccess(res, result.data);
    } catch (error) {
      console.error('[CollectionsController] resume error:', error);
      internalError(res, 'Failed to resume reminders');
    }
  };
}

export default CollectionsController;
