// src/controllers/contractControllerV2.ts
// JTD Nucleus initiative — Milestone 1. New, versioned sibling of
// contractController.ts. That file is untouched. Create only, for now.

import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import ContractServiceV2 from '../services/contractServiceV2';
// V1 service imported ONLY for updateContractStatus — status transitions are
// deliberately outside V2 scope (one live update_contract_status RPC serves
// both paths, exactly as the single-assign flow uses it). V1 file untouched.
import ContractService from '../services/contractService';
import {
  sendSuccess,
  sendError,
  internalError,
  ERROR_CODES
} from '../utils/apiResponseHelpers';

class ContractControllerV2 {
  private contractServiceV2: ContractServiceV2;
  private contractService: ContractService;

  constructor() {
    this.contractServiceV2 = new ContractServiceV2();
    this.contractService = new ContractService();
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

  /**
   * POST /api/v2/contracts/bulk-create
   * V2 sibling of POST /api/contracts/bulk-create (that route is untouched).
   * Same request/response shape; two deliberate differences:
   *   · each item is created through create_contract_transaction_v2
   *     (explicit seller/buyer, unconditional CNAK grant, cadence-fit
   *     backstop) instead of the V1 create — bulk and single assignment
   *     now produce contracts through ONE engine;
   *   · dedup is FAIL-CLOSED: if the already-assigned lookup cannot be
   *     answered, the whole batch is refused up front (V1 silently skipped
   *     dedup and could double-create on a re-run).
   * Per-item independence unchanged: one failed member never rolls back
   * the others; a failed activation leaves that contract as a draft.
   */
  bulkCreateContracts = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const body = req.body || {};
      const templateId: string | undefined = body.template_id;
      const activate: boolean = body.activate !== false; // default true
      const items: Array<{ buyer_id?: string; request?: any }> = Array.isArray(body.items) ? body.items : [];

      if (items.length === 0) {
        sendError(res, ERROR_CODES.VALIDATION_ERROR, 'items is required and must be a non-empty array', 400);
        return;
      }
      if (items.length > 200) {
        sendError(res, ERROR_CODES.VALIDATION_ERROR, 'items exceeds the 200-per-request limit', 400);
        return;
      }
      if (items.some((i) => !i || typeof i.request !== 'object' || i.request === null)) {
        sendError(res, ERROR_CODES.VALIDATION_ERROR, 'each item must include a request object', 400);
        return;
      }

      const tenantId = req.headers['x-tenant-id'] as string;
      const environment = (req.headers['x-environment'] as string) || 'live';
      const isLive = environment !== 'test';
      const userJWT = req.headers.authorization?.replace('Bearer ', '') || '';
      const userId = req.user?.id || '';

      // Idempotency: skip members who already hold a live contract from this
      // template. Fail-closed — if this lookup fails we refuse the batch
      // instead of risking duplicates (retry is cheap; unwinding double
      // contracts is not).
      let alreadyAssigned = new Set<string>();
      if (templateId) {
        try {
          const buyerIds = items.map((i) => i.buyer_id || '').filter(Boolean);
          alreadyAssigned = await this.contractServiceV2.findAssignedBuyerIdsV2(
            tenantId, templateId, buyerIds, isLive
          );
        } catch (dedupErr: any) {
          console.error('[ContractControllerV2] bulk dedup failed — refusing batch:', dedupErr?.message);
          sendError(
            res, ERROR_CODES.INTERNAL_ERROR,
            'Could not verify which members are already assigned this template. No contracts were created — please retry.',
            503
          );
          return;
        }
      }

      const results: Array<Record<string, any>> = [];
      let created = 0, skipped = 0, failed = 0;

      for (const item of items) {
        const buyerId = item.buyer_id || null;

        if (buyerId && alreadyAssigned.has(buyerId)) {
          skipped += 1;
          results.push({ buyer_id: buyerId, status: 'skipped', reason: 'already has a contract from this template' });
          continue;
        }

        try {
          const createRes = await this.contractServiceV2.createContract(
            item.request, userJWT, tenantId, userId, environment
          );
          if (!createRes.success) {
            failed += 1;
            results.push({ buyer_id: buyerId, status: 'failed', error: createRes.error || 'Create failed' });
            continue;
          }

          const contract: any = createRes.data || {};
          let status: string = contract.status || 'created';
          let globalAccessId: string | undefined = contract.global_access_id;

          if (activate && contract.id && contract.status === 'draft') {
            const st = await this.contractService.updateContractStatus(
              contract.id, { status: 'active' }, userJWT, tenantId, userId, environment
            );
            if (st.success) {
              status = 'active';
              if ((st.data as any)?.global_access_id) globalAccessId = (st.data as any).global_access_id;
            }
            // A failed activation is non-fatal: the contract exists as a draft
            // and can be activated later.
          }

          created += 1;
          results.push({
            buyer_id: buyerId,
            status,
            contract_id: contract.id,
            contract_number: contract.contract_number,
            ...(globalAccessId ? { global_access_id: globalAccessId } : {}),
          });
        } catch (err: any) {
          failed += 1;
          results.push({ buyer_id: buyerId, status: 'failed', error: err?.message || 'Create failed' });
        }
      }

      sendSuccess(res, {
        results,
        summary: { total: items.length, created, skipped, failed },
      });
    } catch (error) {
      console.error('[ContractControllerV2] Error in bulkCreateContracts:', error);
      internalError(res, 'Bulk contract creation failed');
    }
  };
}

export default ContractControllerV2;
