// ============================================================================
// VaNi Composer Controller — Phase 1
// ============================================================================
// POST /api/vani-composer/parse-intent  { text }
// POST /api/vani-composer/compose       { intent, buyer_id, buyer_name }
// POST /api/vani-composer/feedback      { interaction_ids, was_accepted?, was_edited?, user_rating? }
//
// Context extraction follows contractEventController: tenant/env/JWT from
// headers, userId from req.user (authenticate middleware).
// ============================================================================

import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { sendSuccess, sendError, internalError, ERROR_CODES } from '../utils/apiResponseHelpers';
import contractComposerService, { ComposerCallContext, ParsedIntent } from '../services/contractComposerService';
import vaniLLMClient from '../services/vaniLLMClient';

class VaniComposerController {
  private getContext(req: AuthRequest): ComposerCallContext {
    return {
      tenantId: (req.headers['x-tenant-id'] as string) || '',
      userId: req.user?.id || '',
      userJWT: req.headers.authorization?.replace('Bearer ', '') || '',
      environment: (req.headers['x-environment'] as string) || 'live',
    };
  }

  /** GET /health — reports whether the LLM endpoint is configured */
  health = async (_req: AuthRequest, res: Response): Promise<void> => {
    sendSuccess(res, {
      llm_enabled: vaniLLMClient.isEnabled(),
      model: vaniLLMClient.getModelVersion(),
    });
  };

  /** POST /parse-intent */
  parseIntent = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const text = String(req.body?.text || '').trim();
      if (text.length < 5 || text.length > 500) {
        sendError(res, ERROR_CODES.VALIDATION_ERROR, 'text must be 5–500 characters', 400);
        return;
      }

      const ctx = this.getContext(req);
      const result = await contractComposerService.parseIntent(text, ctx);
      sendSuccess(res, result);
    } catch (error: any) {
      console.error('❌ VaniComposer parse-intent failed:', error.message);
      internalError(res, error.message || 'Intent parsing failed');
    }
  };

  /** POST /compose */
  compose = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const intent = req.body?.intent as ParsedIntent | undefined;
      const buyerId = String(req.body?.buyer_id || '');
      const buyerName = String(req.body?.buyer_name || '');

      if (!intent || !intent.duration || !Array.isArray(intent.activities)) {
        sendError(res, ERROR_CODES.VALIDATION_ERROR, 'intent (from parse-intent) is required', 400);
        return;
      }
      if (!buyerId || !buyerName) {
        sendError(res, ERROR_CODES.VALIDATION_ERROR, 'buyer_id and buyer_name are required', 400);
        return;
      }

      const ctx = this.getContext(req);
      const result = await contractComposerService.compose(
        intent,
        { id: buyerId, name: buyerName },
        ctx
      );
      sendSuccess(res, result);
    } catch (error: any) {
      console.error('❌ VaniComposer compose failed:', error.message);
      internalError(res, error.message || 'Composition failed');
    }
  };

  /** POST /feedback — fire-and-forget quality signals */
  feedback = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const ids = Array.isArray(req.body?.interaction_ids)
        ? req.body.interaction_ids.map(String).slice(0, 10)
        : [];
      if (ids.length === 0) {
        sendError(res, ERROR_CODES.VALIDATION_ERROR, 'interaction_ids is required', 400);
        return;
      }

      contractComposerService.recordFeedback(ids, {
        wasAccepted: typeof req.body?.was_accepted === 'boolean' ? req.body.was_accepted : undefined,
        wasEdited: typeof req.body?.was_edited === 'boolean' ? req.body.was_edited : undefined,
        userRating: typeof req.body?.user_rating === 'number' ? req.body.user_rating : undefined,
      });
      sendSuccess(res, { recorded: ids.length });
    } catch (error: any) {
      internalError(res, error.message || 'Feedback recording failed');
    }
  };
}

export default new VaniComposerController();
