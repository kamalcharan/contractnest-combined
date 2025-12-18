// src/routes/jtd.ts
// JTD Routes - New JTD Framework with MSG91
import express from 'express';
import * as jtdController from '../controllers/jtdController';
import { authenticate } from '../middleware/auth';

const router = express.Router();

// =================================================================
// Internal API Endpoints (require authentication)
// =================================================================

// Create new JTD entry
router.post('/', authenticate, jtdController.createJTD);

// Query JTDs for tenant (with filters)
router.get('/', authenticate, jtdController.queryJTDs);

// Get metrics for tenant
router.get('/metrics', authenticate, jtdController.getMetrics);

// Get single JTD by ID (with optional history)
router.get('/:id', authenticate, jtdController.getJTD);

// =================================================================
// Edge Function Callbacks (require internal signature)
// =================================================================

// Update JTD status from worker (internal signature required)
router.post('/:id/status', jtdController.updateStatus);

// Trigger JTD worker manually
router.post('/trigger-worker', jtdController.triggerWorker);

// =================================================================
// MSG91 Webhook Endpoints (public - no auth, IP whitelist recommended)
// =================================================================

router.post('/webhooks/msg91/email', jtdController.handleMSG91EmailWebhook);
router.post('/webhooks/msg91/sms', jtdController.handleMSG91SMSWebhook);
router.post('/webhooks/msg91/whatsapp', jtdController.handleMSG91WhatsAppWebhook);

// =================================================================
// Legacy Compatibility Aliases (for backward compatibility)
// =================================================================

// Old route: POST /events -> now POST /
router.post('/events', authenticate, jtdController.createJTD);

// Old route: GET /events/:eventId -> now GET /:id
router.get('/events/:eventId', authenticate, async (req, res) => {
  req.params.id = req.params.eventId;
  return jtdController.getJTD(req, res);
});

export default router;
