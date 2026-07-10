// src/hooks/useContractSubmission.ts
// Shared contract finalization — the SINGLE write path used by both the
// ContractWizard (its own submit) and the VaNi canvas review (this hook).
// create → status transition → sign-off notification.
//
// Transition target depends on the acceptance method (mirrors the wizard):
//   • sign-off / manual  → pending_acceptance (buyer accepts, then activates)
//   • auto-accept        → active (no counterparty step; activation generates
//                          the invoices + billing events immediately). Payment
//                          is captured later via the Record Payment flow — the
//                          same as the wizard's "skip payment" auto-accept path.

import { useState, useCallback } from 'react';
import { useContractOperations } from '@/hooks/queries/useContractQueries';
import {
  mapWizardToRequest,
  createInitialWizardState,
  ContractWizardState,
} from '@/components/contracts/ContractWizard';
import type { CreateContractRequest } from '@/types/contracts';
import api from '@/services/api';
import { API_ENDPOINTS } from '@/services/serviceURLs';

export interface SubmissionResult {
  id: string;
  contract_number?: string;
  global_access_id?: string;
  status: string;
}

/** One member in a bulk assignment. */
export interface BulkSubmitItem {
  buyerId: string;
  draft: Partial<ContractWizardState> & Record<string, any>;
  contractType?: 'client' | 'vendor' | 'partner';
}

/** Per-member outcome returned by the bulk endpoint. */
export interface BulkResultRow {
  buyer_id: string | null;
  status: string;           // 'active' | 'pending_acceptance' | 'created' | 'skipped' | 'failed'
  contract_id?: string;
  contract_number?: string;
  global_access_id?: string;
  error?: string;
  reason?: string;
}

export interface BulkSubmitResult {
  results: BulkResultRow[];
  summary: { total: number; created: number; skipped: number; failed: number };
}

export function useContractSubmission() {
  const { createContract, updateStatus, sendNotification } = useContractOperations();
  const [isSubmitting, setIsSubmitting] = useState(false);

  /**
   * Finalize a draft: expects a partial wizard-state-shaped object (e.g. the
   * VaNi composer draft); missing fields fall back to wizard defaults so
   * mapWizardToRequest sees a complete state.
   */
  const submit = useCallback(
    async (
      draft: Partial<ContractWizardState> & Record<string, any>,
      contractType: 'client' | 'vendor' | 'partner' = 'client'
    ): Promise<SubmissionResult> => {
      setIsSubmitting(true);
      try {
        const state: ContractWizardState = {
          ...createInitialWizardState(),
          ...draft,
          startDate: draft.startDate
            ? (draft.startDate instanceof Date ? draft.startDate : new Date(draft.startDate as any))
            : new Date(),
        };

        const request = mapWizardToRequest(state, contractType);
        request.metadata = {};

        const created = (await createContract(request as CreateContractRequest)) as Record<string, any>;

        // Transition off draft. Auto-accept has no counterparty gate, so it
        // goes straight to 'active' (that transition is what generates the
        // invoices + billing events); everything else waits in
        // 'pending_acceptance' for the buyer. Same targets the wizard uses.
        const isAutoAccept = state.acceptanceMethod === 'auto';
        const targetStatus = isAutoAccept ? 'active' : 'pending_acceptance';
        if (created?.id && created?.status === 'draft') {
          try {
            const statusResult = await updateStatus({
              contractId: created.id,
              statusData: { status: targetStatus },
            });
            created.status = targetStatus;
            if (statusResult?.global_access_id) {
              created.global_access_id = statusResult.global_access_id;
            }
          } catch {
            console.warn('Contract created but status transition failed (retryable)');
          }
        }

        // Sign-off contracts: notify the buyer (non-blocking, mirrors wizard)
        if (created?.id && state.acceptanceMethod === 'signoff') {
          sendNotification({ contractId: created.id }).catch(() => {
            console.warn('Sign-off notification failed (non-blocking)');
          });
        }

        return {
          id: created?.id,
          contract_number: created?.contract_number,
          global_access_id: created?.global_access_id,
          status: created?.status || 'pending_acceptance',
        };
      } finally {
        setIsSubmitting(false);
      }
    },
    [createContract, updateStatus, sendNotification]
  );

  /**
   * Bulk finalize: map many drafts → requests (same client mapper as submit,
   * so there is ONE source of truth) and post them in a single call to the
   * bulk endpoint, which creates + optionally activates each server-side and
   * returns per-member results. Used by BulkAssignDialog.
   *
   * `templateId` is stamped onto every draft so the created contracts carry
   * their template link (the assembled draft omits it) — this is also what the
   * server dedup keys on to skip members already assigned this template.
   */
  const submitBulk = useCallback(
    async (
      items: BulkSubmitItem[],
      opts: { templateId?: string; activate?: boolean } = {}
    ): Promise<BulkSubmitResult> => {
      setIsSubmitting(true);
      try {
        const requestItems = items.map(({ buyerId, draft, contractType = 'client' }) => {
          const state: ContractWizardState = {
            ...createInitialWizardState(),
            ...draft,
            templateId: opts.templateId || (draft as any).templateId || null,
            startDate: draft.startDate
              ? (draft.startDate instanceof Date ? draft.startDate : new Date(draft.startDate as any))
              : new Date(),
          };
          const request = mapWizardToRequest(state, contractType);
          request.metadata = {};
          return { buyer_id: buyerId, request };
        });

        const resp = await api.post(API_ENDPOINTS.CONTRACTS.BULK_CREATE, {
          template_id: opts.templateId,
          activate: opts.activate !== false,
          items: requestItems,
        });
        const data = (resp.data?.data || resp.data) as BulkSubmitResult;
        return {
          results: data?.results || [],
          summary: data?.summary || { total: items.length, created: 0, skipped: 0, failed: items.length },
        };
      } finally {
        setIsSubmitting(false);
      }
    },
    []
  );

  return { submit, submitBulk, isSubmitting };
}

export default useContractSubmission;
