// ============================================================================
// Sandbox Controller — clear a tenant's transactional data
// ============================================================================
// Authenticated; the tenant comes from x-tenant-id, so a caller can only ever
// reset their OWN tenant. Thin — the RPCs own the deletes.

import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import sandboxService from '../services/sandboxService';
import { sendSuccess, sendError, ERROR_CODES } from '../utils/apiResponseHelpers';

class SandboxController {
  private tenantId(req: AuthRequest): string {
    return (req.headers['x-tenant-id'] as string) || '';
  }

  preview = async (req: AuthRequest, res: Response): Promise<void> => {
    const tenantId = this.tenantId(req);
    if (!tenantId) { sendError(res, ERROR_CODES.VALIDATION_ERROR, 'Tenant is required', 400); return; }
    const result = await sandboxService.preview(tenantId);
    if (!result.success) { sendError(res, ERROR_CODES.INTERNAL_ERROR, result.error?.message || 'Failed to load preview', 500); return; }
    sendSuccess(res, result.data);
  };

  reset = async (req: AuthRequest, res: Response): Promise<void> => {
    const tenantId = this.tenantId(req);
    if (!tenantId) { sendError(res, ERROR_CODES.VALIDATION_ERROR, 'Tenant is required', 400); return; }
    const body = req.body || {};
    const includeContacts = body.include_contacts === true;
    const includeEquipment = body.include_equipment === true;
    const result = await sandboxService.reset(tenantId, includeContacts, includeEquipment);
    if (!result.success) { sendError(res, ERROR_CODES.INTERNAL_ERROR, result.error?.message || 'Reset failed', 500); return; }
    sendSuccess(res, result.data);
  };
}

export default new SandboxController();
