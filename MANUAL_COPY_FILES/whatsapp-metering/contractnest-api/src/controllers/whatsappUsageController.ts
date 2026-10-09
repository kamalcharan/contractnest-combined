// ============================================================================
// GET /api/tenant-context/whatsapp-usage — credits left, low state, this
// IST month's split (notifications · team assistant · customer chat).
// ============================================================================

import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import whatsappUsageService from '../services/whatsappUsageService';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const getWhatsappUsage = async (req: AuthRequest, res: Response): Promise<void> => {
  const tenantId = String(req.headers['x-tenant-id'] || '');
  const userId = String((req.user as any)?.id || '');
  if (!UUID_RE.test(tenantId)) {
    res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'x-tenant-id header is required' } });
    return;
  }
  if (!UUID_RE.test(userId)) {
    res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Sign in required' } });
    return;
  }
  const result = await whatsappUsageService.get(tenantId, userId);
  if (result.success) {
    res.status(200).json({ success: true, data: result.data });
    return;
  }
  res.status(result.status).json({ success: false, error: result.error });
};
