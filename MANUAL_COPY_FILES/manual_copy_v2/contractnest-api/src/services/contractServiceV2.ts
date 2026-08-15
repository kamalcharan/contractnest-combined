// src/services/contractServiceV2.ts
// JTD Nucleus initiative — Milestone 1. New, versioned sibling of
// contractService.ts. That file is untouched. Talks to the new
// contracts-v2 edge function (create_contract_transaction_v2) instead
// of contracts (create_contract_transaction). Create only, for now —
// mirrors contractService.ts's createContract + makeRequest + HMAC
// signing exactly, just pointed at the v2 edge function.

import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

interface EdgeFunctionResponseV2<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
}

class ContractServiceV2 {
  private readonly edgeFunctionUrl: string;
  private readonly internalSigningSecret: string;

  constructor() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const internalSigningSecret = process.env.INTERNAL_SIGNING_SECRET;

    if (!supabaseUrl) {
      throw new Error('SUPABASE_URL environment variable is not set');
    }

    if (!internalSigningSecret) {
      console.warn('[ContractServiceV2] INTERNAL_SIGNING_SECRET not set. HMAC signature will be empty.');
    }

    this.edgeFunctionUrl = supabaseUrl + '/functions/v1/contracts-v2';
    this.internalSigningSecret = internalSigningSecret || '';
  }

  async createContract(
    contractData: any,
    userJWT: string,
    tenantId: string,
    userId: string,
    environment: string = 'live',
    idempotencyKey?: string
  ): Promise<EdgeFunctionResponseV2> {
    const requestPayload = {
      ...contractData,
      name: contractData.title || contractData.name,
      contract_type: contractData.contract_type || contractData.contact_classification,
      created_by: userId
    };

    return await this.makeRequest(
      'POST',
      this.edgeFunctionUrl,
      requestPayload,
      userJWT,
      tenantId,
      environment,
      idempotencyKey
    );
  }

  /**
   * V2 sibling of contractService.findAssignedBuyerIds — bulk-assign dedup:
   * which of these buyers ALREADY hold a contract from this template?
   * Hardened over V1 (owner-approved, 2026-08-15):
   *   · FAIL-CLOSED — V1 returned an empty set on missing creds or a query
   *     error, silently skipping dedup and allowing duplicates on exactly
   *     the re-run-after-partial-failure scenario dedup exists for. V2
   *     THROWS instead; the bulk caller aborts the batch with a clear error
   *     rather than guessing.
   *   · is_live filter — V1 was environment-blind, so a TEST-mode contract
   *     from the template falsely blocked that member's LIVE assignment
   *     (and vice versa).
   *   · is_active=true filter — V1 let a soft-deleted contract block
   *     re-assignment forever.
   * Status filter unchanged: active / pending_acceptance (a draft or a
   * completed/expired contract does not block re-assignment).
   */
  async findAssignedBuyerIdsV2(
    tenantId: string,
    templateId: string,
    buyerIds: string[],
    isLive: boolean
  ): Promise<Set<string>> {
    const unique = Array.from(new Set(buyerIds.filter(Boolean)));
    if (!tenantId || !templateId || unique.length === 0) return new Set();

    const url = process.env.SUPABASE_URL as string;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;
    if (!url || !key) {
      throw new Error('Bulk-assign dedup unavailable: missing Supabase credentials');
    }

    const sb = createClient(url, key, { auth: { persistSession: false } });
    const { data, error } = await sb
      .from('t_contracts')
      .select('buyer_id')
      .eq('tenant_id', tenantId)
      .eq('template_id', templateId)
      .eq('is_active', true)
      .eq('is_live', isLive)
      .in('buyer_id', unique)
      .in('status', ['active', 'pending_acceptance']);

    if (error) {
      throw new Error(`Bulk-assign dedup query failed: ${error.message}`);
    }
    return new Set((data || []).map((r: any) => r.buyer_id).filter(Boolean));
  }

  private async makeRequest(
    method: string,
    url: string,
    body: any,
    userJWT: string,
    tenantId: string,
    environment: string = 'live',
    idempotencyKey?: string
  ): Promise<EdgeFunctionResponseV2> {
    try {
      const requestBody = body ? JSON.stringify(body) : '';

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userJWT}`,
        'x-tenant-id': tenantId,
        'x-environment': environment
      };

      if (this.internalSigningSecret) {
        headers['x-internal-signature'] = this.generateHMACSignature(requestBody);
      }

      if (idempotencyKey) {
        headers['x-idempotency-key'] = idempotencyKey;
      }

      const requestOptions: RequestInit = { method, headers };
      if (body) {
        requestOptions.body = requestBody;
      }

      console.log(`[ContractServiceV2] ${method} ${url}`);

      const response = await fetch(url, requestOptions);
      const responseData = await response.json();

      if (!response.ok) {
        console.error('[ContractServiceV2] Edge function error:', responseData);
        return {
          success: false,
          error: responseData.error || 'Edge function request failed',
          code: responseData.code || 'EDGE_FUNCTION_ERROR'
        };
      }

      return responseData;
    } catch (error) {
      console.error('[ContractServiceV2] Network error:', error);
      return {
        success: false,
        error: 'Network error occurred',
        code: 'NETWORK_ERROR'
      };
    }
  }

  private generateHMACSignature(payload: string): string {
    if (!this.internalSigningSecret) {
      return '';
    }
    try {
      return crypto
        .createHmac('sha256', this.internalSigningSecret)
        .update(payload)
        .digest('hex');
    } catch (error) {
      console.error('[ContractServiceV2] HMAC generation error:', error);
      return '';
    }
  }
}

export default ContractServiceV2;
