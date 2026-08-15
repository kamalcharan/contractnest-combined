// src/routes/contractRoutesV2.ts
// JTD Nucleus initiative — Milestone 1. New, versioned sibling of
// contractRoutes.ts. That file is untouched. One endpoint only, for now:
// POST /api/v2/contracts — everything else (list/get/update/status/etc.)
// still goes through the V1 routes.

import express from 'express';
import ContractControllerV2 from '../controllers/contractControllerV2';
import { authenticate } from '../middleware/auth';

const router = express.Router();
const contractControllerV2 = new ContractControllerV2();

router.use(authenticate);

const ensureTenant = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (!req.headers['x-tenant-id']) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'BAD_REQUEST',
        message: 'x-tenant-id header is required'
      },
      metadata: { timestamp: new Date().toISOString() }
    });
  }
  next();
};

router.use(ensureTenant);

/**
 * @route POST /api/v2/contracts
 * @description Create new contract via create_contract_transaction_v2
 * @header {string} x-idempotency-key - Idempotency key (recommended)
 * @body {CreateContractRequest} - same shape as POST /api/contracts
 * @returns {ContractDetail} 201 Created
 */
router.post('/', contractControllerV2.createContract);

export default router;
