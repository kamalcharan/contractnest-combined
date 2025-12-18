// src/controllers/jtdController.ts
// JTD Controller - New JTD Framework with MSG91 webhooks
// Handles internal API calls and external webhook callbacks

import { Request, Response } from 'express';
import { jtdService, CreateJTDRequest } from '../services/jtdService';
import { captureException } from '../utils/sentry';

// =================================================================
// INTERNAL API ENDPOINTS
// =================================================================

/**
 * Create a new JTD entry
 * POST /api/jtd
 *
 * Used by internal services to trigger notifications/tasks
 * Requires internal signature verification for Edge Function calls
 */
export const createJTD = async (req: Request, res: Response) => {
  try {
    const {
      event_type,
      channel,
      tenant_id,
      source_type,
      source_id,
      recipient_data,
      template_data,
      metadata,
      scheduled_for,
      priority,
      is_live
    } = req.body;

    // Validate required fields
    if (!event_type) {
      return res.status(400).json({
        success: false,
        error: 'event_type is required'
      });
    }

    if (!channel) {
      return res.status(400).json({
        success: false,
        error: 'channel is required'
      });
    }

    if (!tenant_id) {
      return res.status(400).json({
        success: false,
        error: 'tenant_id is required'
      });
    }

    if (!source_type) {
      return res.status(400).json({
        success: false,
        error: 'source_type is required'
      });
    }

    if (!recipient_data) {
      return res.status(400).json({
        success: false,
        error: 'recipient_data is required'
      });
    }

    // Validate recipient_data has required field based on channel
    if (channel === 'email' && !recipient_data.email) {
      return res.status(400).json({
        success: false,
        error: 'recipient_data.email is required for email channel'
      });
    }

    if ((channel === 'sms' || channel === 'whatsapp') && !recipient_data.mobile) {
      return res.status(400).json({
        success: false,
        error: `recipient_data.mobile is required for ${channel} channel`
      });
    }

    if (channel === 'inapp' && !recipient_data.user_id) {
      return res.status(400).json({
        success: false,
        error: 'recipient_data.user_id is required for inapp channel'
      });
    }

    const jtdData: CreateJTDRequest = {
      event_type,
      channel,
      tenant_id,
      source_type,
      source_id,
      recipient_data,
      template_data,
      metadata,
      scheduled_for,
      priority,
      is_live
    };

    const jtd = await jtdService.createJTD(jtdData);

    res.status(201).json({
      success: true,
      data: {
        id: jtd.id,
        status: jtd.current_status,
        event_type: jtd.event_type,
        channel: jtd.channel
      }
    });

  } catch (error) {
    console.error('[JTD Controller] Error creating JTD:', error);
    captureException(error as Error, {
      tags: { source: 'jtd_controller', action: 'createJTD' },
      extra: { event_type: req.body.event_type, channel: req.body.channel }
    });
    res.status(500).json({
      success: false,
      error: 'Failed to create JTD'
    });
  }
};

/**
 * Get JTD by ID
 * GET /api/jtd/:id
 */
export const getJTD = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const includeHistory = req.query.include_history === 'true';

    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'id is required'
      });
    }

    const jtd = includeHistory
      ? await jtdService.getJTDWithHistory(id)
      : await jtdService.getJTD(id);

    if (!jtd) {
      return res.status(404).json({
        success: false,
        error: 'JTD not found'
      });
    }

    res.json({
      success: true,
      data: jtd
    });

  } catch (error) {
    console.error('[JTD Controller] Error fetching JTD:', error);
    captureException(error as Error, {
      tags: { source: 'jtd_controller', action: 'getJTD' },
      extra: { id: req.params.id }
    });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch JTD'
    });
  }
};

/**
 * Query JTDs for a tenant
 * GET /api/jtd?tenant_id=xxx&event_type=xxx&channel=xxx...
 */
export const queryJTDs = async (req: Request, res: Response) => {
  try {
    const {
      tenant_id,
      event_type,
      channel,
      source_type,
      source_id,
      status,
      is_live,
      from_date,
      to_date,
      limit,
      offset
    } = req.query;

    if (!tenant_id) {
      return res.status(400).json({
        success: false,
        error: 'tenant_id is required'
      });
    }

    const result = await jtdService.queryJTDs(tenant_id as string, {
      event_type: event_type as string,
      channel: channel as string,
      source_type: source_type as string,
      source_id: source_id as string,
      status: status as string,
      is_live: is_live === 'true' ? true : is_live === 'false' ? false : undefined,
      from_date: from_date as string,
      to_date: to_date as string,
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined
    });

    res.json({
      success: true,
      data: result.data,
      meta: {
        count: result.count,
        limit: limit ? parseInt(limit as string) : 50,
        offset: offset ? parseInt(offset as string) : 0
      }
    });

  } catch (error) {
    console.error('[JTD Controller] Error querying JTDs:', error);
    captureException(error as Error, {
      tags: { source: 'jtd_controller', action: 'queryJTDs' },
      extra: { tenant_id: req.query.tenant_id }
    });
    res.status(500).json({
      success: false,
      error: 'Failed to query JTDs'
    });
  }
};

/**
 * Get JTD metrics for a tenant
 * GET /api/jtd/metrics?tenant_id=xxx&from_date=xxx&to_date=xxx
 */
export const getMetrics = async (req: Request, res: Response) => {
  try {
    const { tenant_id, from_date, to_date } = req.query;

    if (!tenant_id) {
      return res.status(400).json({
        success: false,
        error: 'tenant_id is required'
      });
    }

    const metrics = await jtdService.getMetrics(tenant_id as string, {
      from_date: from_date as string,
      to_date: to_date as string
    });

    res.json({
      success: true,
      data: metrics
    });

  } catch (error) {
    console.error('[JTD Controller] Error fetching metrics:', error);
    captureException(error as Error, {
      tags: { source: 'jtd_controller', action: 'getMetrics' },
      extra: { tenant_id: req.query.tenant_id }
    });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch metrics'
    });
  }
};

/**
 * Manually trigger JTD worker
 * POST /api/jtd/trigger-worker
 *
 * Requires internal signature or admin auth
 */
export const triggerWorker = async (req: Request, res: Response) => {
  try {
    // Verify internal signature if present
    const signature = req.headers['x-signature'] as string;
    const timestamp = req.headers['x-timestamp'] as string;

    if (signature && timestamp) {
      const payload = JSON.stringify(req.body);
      const verification = jtdService.verifyInternalSignature(
        req.method,
        req.path,
        payload,
        signature,
        parseInt(timestamp)
      );

      if (!verification.valid) {
        console.warn('[JTD Controller] Invalid internal signature:', verification.error);
        return res.status(401).json({
          success: false,
          error: 'Invalid signature',
          code: 'INVALID_SIGNATURE'
        });
      }
    }

    const result = await jtdService.triggerWorker();

    if (result.success) {
      res.json({
        success: true,
        data: result.result
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error
      });
    }

  } catch (error) {
    console.error('[JTD Controller] Error triggering worker:', error);
    captureException(error as Error, {
      tags: { source: 'jtd_controller', action: 'triggerWorker' }
    });
    res.status(500).json({
      success: false,
      error: 'Failed to trigger worker'
    });
  }
};

// =================================================================
// EDGE FUNCTION CALLBACK (Status Update from Worker)
// =================================================================

/**
 * Update JTD status from Edge Function worker
 * POST /api/jtd/:id/status
 *
 * Requires internal signature verification
 */
export const updateStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, provider_message_id, error_message, metadata } = req.body;

    // Verify internal signature
    const signature = req.headers['x-signature'] as string;
    const timestamp = req.headers['x-timestamp'] as string;

    if (!signature || !timestamp) {
      return res.status(401).json({
        success: false,
        error: 'Missing signature headers',
        code: 'MISSING_SIGNATURE'
      });
    }

    const payload = JSON.stringify(req.body);
    const verification = jtdService.verifyInternalSignature(
      req.method,
      req.path,
      payload,
      signature,
      parseInt(timestamp)
    );

    if (!verification.valid) {
      console.warn('[JTD Controller] Invalid internal signature:', verification.error);
      return res.status(401).json({
        success: false,
        error: 'Invalid signature',
        code: 'INVALID_SIGNATURE'
      });
    }

    // Validate required fields
    if (!id || !status) {
      return res.status(400).json({
        success: false,
        error: 'id and status are required'
      });
    }

    await jtdService.updateStatus(id, status, {
      provider_message_id,
      error_message,
      metadata
    });

    res.json({
      success: true,
      data: { id, status }
    });

  } catch (error) {
    console.error('[JTD Controller] Error updating status:', error);
    captureException(error as Error, {
      tags: { source: 'jtd_controller', action: 'updateStatus' },
      extra: { id: req.params.id, status: req.body.status }
    });
    res.status(500).json({
      success: false,
      error: 'Failed to update status'
    });
  }
};

// =================================================================
// MSG91 WEBHOOK HANDLERS
// =================================================================

/**
 * Handle MSG91 Email webhook
 * POST /api/webhooks/msg91/email
 *
 * MSG91 sends delivery status updates here
 */
export const handleMSG91EmailWebhook = async (req: Request, res: Response) => {
  try {
    console.log('[JTD Controller] MSG91 Email webhook received:', JSON.stringify(req.body));

    // Verify webhook signature if configured
    const signature = req.headers['x-msg91-signature'] as string;
    const payload = JSON.stringify(req.body);

    const verification = jtdService.verifyMSG91Webhook(payload, signature);
    if (!verification.valid) {
      console.warn('[JTD Controller] Invalid MSG91 webhook signature:', verification.error);
      // Still return 200 to avoid retries, but log the issue
    }

    // MSG91 may send array of events or single event
    const events = Array.isArray(req.body) ? req.body : [req.body];

    for (const event of events) {
      if (event.request_id) {
        await jtdService.handleMSG91EmailWebhook(event);
      }
    }

    // MSG91 expects 200 OK
    res.status(200).json({ success: true });

  } catch (error) {
    console.error('[JTD Controller] Error handling MSG91 email webhook:', error);
    captureException(error as Error, {
      tags: { source: 'jtd_controller', action: 'handleMSG91EmailWebhook' }
    });
    // Still return 200 to avoid webhook retries
    res.status(200).json({ success: false });
  }
};

/**
 * Handle MSG91 SMS webhook
 * POST /api/webhooks/msg91/sms
 */
export const handleMSG91SMSWebhook = async (req: Request, res: Response) => {
  try {
    console.log('[JTD Controller] MSG91 SMS webhook received:', JSON.stringify(req.body));

    // Verify webhook signature if configured
    const signature = req.headers['x-msg91-signature'] as string;
    const payload = JSON.stringify(req.body);

    const verification = jtdService.verifyMSG91Webhook(payload, signature);
    if (!verification.valid) {
      console.warn('[JTD Controller] Invalid MSG91 webhook signature:', verification.error);
    }

    // MSG91 may send array of events or single event
    const events = Array.isArray(req.body) ? req.body : [req.body];

    for (const event of events) {
      if (event.request_id) {
        await jtdService.handleMSG91SMSWebhook(event);
      }
    }

    // MSG91 expects 200 OK
    res.status(200).json({ success: true });

  } catch (error) {
    console.error('[JTD Controller] Error handling MSG91 SMS webhook:', error);
    captureException(error as Error, {
      tags: { source: 'jtd_controller', action: 'handleMSG91SMSWebhook' }
    });
    res.status(200).json({ success: false });
  }
};

/**
 * Handle MSG91 WhatsApp webhook
 * POST /api/webhooks/msg91/whatsapp
 */
export const handleMSG91WhatsAppWebhook = async (req: Request, res: Response) => {
  try {
    console.log('[JTD Controller] MSG91 WhatsApp webhook received:', JSON.stringify(req.body));

    // Verify webhook signature if configured
    const signature = req.headers['x-msg91-signature'] as string;
    const payload = JSON.stringify(req.body);

    const verification = jtdService.verifyMSG91Webhook(payload, signature);
    if (!verification.valid) {
      console.warn('[JTD Controller] Invalid MSG91 webhook signature:', verification.error);
    }

    // MSG91 may send array of events or single event
    const events = Array.isArray(req.body) ? req.body : [req.body];

    for (const event of events) {
      if (event.message_id) {
        await jtdService.handleMSG91WhatsAppWebhook(event);
      }
    }

    // MSG91 expects 200 OK
    res.status(200).json({ success: true });

  } catch (error) {
    console.error('[JTD Controller] Error handling MSG91 WhatsApp webhook:', error);
    captureException(error as Error, {
      tags: { source: 'jtd_controller', action: 'handleMSG91WhatsAppWebhook' }
    });
    res.status(200).json({ success: false });
  }
};

// =================================================================
// ROUTE DEFINITIONS (for convenience - can be used in routes/jtd.ts)
// =================================================================

export const JTD_ROUTES = {
  // Internal API endpoints
  create: { method: 'POST', path: '/api/jtd', handler: createJTD },
  get: { method: 'GET', path: '/api/jtd/:id', handler: getJTD },
  query: { method: 'GET', path: '/api/jtd', handler: queryJTDs },
  metrics: { method: 'GET', path: '/api/jtd/metrics', handler: getMetrics },
  triggerWorker: { method: 'POST', path: '/api/jtd/trigger-worker', handler: triggerWorker },
  updateStatus: { method: 'POST', path: '/api/jtd/:id/status', handler: updateStatus },

  // MSG91 Webhooks (no auth - rely on IP whitelist + optional signature)
  webhookEmail: { method: 'POST', path: '/api/webhooks/msg91/email', handler: handleMSG91EmailWebhook },
  webhookSMS: { method: 'POST', path: '/api/webhooks/msg91/sms', handler: handleMSG91SMSWebhook },
  webhookWhatsApp: { method: 'POST', path: '/api/webhooks/msg91/whatsapp', handler: handleMSG91WhatsAppWebhook }
};

/**
 * Example route registration:
 *
 * import { Router } from 'express';
 * import * as jtdController from '../controllers/jtdController';
 * import { hmacMiddleware } from '../middleware/security/hmac';
 * import { authenticate } from '../middleware/auth';
 *
 * const router = Router();
 *
 * // Internal API endpoints (require auth)
 * router.post('/jtd', authenticate, jtdController.createJTD);
 * router.get('/jtd', authenticate, jtdController.queryJTDs);
 * router.get('/jtd/metrics', authenticate, jtdController.getMetrics);
 * router.get('/jtd/:id', authenticate, jtdController.getJTD);
 *
 * // Edge Function callback (requires internal signature)
 * router.post('/jtd/:id/status', jtdController.updateStatus);
 * router.post('/jtd/trigger-worker', jtdController.triggerWorker);
 *
 * // MSG91 Webhooks (public - no auth, IP whitelist recommended)
 * router.post('/webhooks/msg91/email', jtdController.handleMSG91EmailWebhook);
 * router.post('/webhooks/msg91/sms', jtdController.handleMSG91SMSWebhook);
 * router.post('/webhooks/msg91/whatsapp', jtdController.handleMSG91WhatsAppWebhook);
 *
 * export default router;
 */
