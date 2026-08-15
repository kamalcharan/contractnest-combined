// src/controllers/contractControllerV2.ts
// JTD Nucleus initiative — Milestone 1. New, versioned sibling of
// contractController.ts. That file is untouched. Create only, for now.

import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import ContractServiceV2 from '../services/contractServiceV2';
import {
  sendError,
  internalError,
  ERROR_CODES
} from '../utils/apiResponseHelpers';

class ContractControllerV2 {
  private contractServiceV2: ContractServiceV2;

  constructor() {
    this.contractServiceV2 = new ContractServiceV2();
  }

  /**
   * POST /api/v2/contracts
   * Create new contract via create_contract_transaction_v2.
   * Same request shape as POST /api/contracts — only the backing RPC differs.
   */
  createContract = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const tenantId = req.headers['x-tenant-id'] as string;
      const environment = (req.headers['x-environment'] as string) || 'live';
      const userJWT = req.headers.authorization?.replace('Bearer ', '') || '';
      const userId = req.user?.id || '';
      const idempotencyKey = req.headers['x-idempotency-key'] as string;

      const result = await this.contractServiceV2.createContract(
        req.body,
        userJWT,
        tenantId,
        userId,
        environment,
        idempotencyKey
      );

      if (!result.success) {
        sendError(res, ERROR_CODES.VALIDATION_ERROR, result.error || 'Contract creation failed', 400, { details: result.code });
        return;
      }

      res.status(201).json(result);
    } catch (error) {
      console.error('[ContractControllerV2] Error in createContract:', error);
      internalError(res, 'Failed to create contract');
    }
  };
}

export default ContractControllerV2;
