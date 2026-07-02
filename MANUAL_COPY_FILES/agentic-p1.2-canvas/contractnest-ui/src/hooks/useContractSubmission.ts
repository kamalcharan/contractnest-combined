// src/hooks/useContractSubmission.ts
// Shared contract finalization — the SINGLE write path used by both the
// ContractWizard (its own submit) and the VaNi canvas review (this hook).
// create → status transition (pending_acceptance) → sign-off notification.
//
// Auto-accept contracts are NOT handled here: they require the pre-payment
// dialog, which lives in the wizard — callers route acceptanceMethod==='auto'
// drafts to the wizard instead.

import { useState, useCallback } from 'react';
import { useContractOperations } from '@/hooks/queries/useContractQueries';
import {
  mapWizardToRequest,
  createInitialWizardState,
  ContractWizardState,
} from '@/components/contracts/ContractWizard';
import type { CreateContractRequest } from '@/types/contracts';

export interface SubmissionResult {
  id: string;
  contract_number?: string;
  global_access_id?: string;
  status: string;
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

        // Transition draft → pending_acceptance (same as the wizard submit)
        if (created?.id && created?.status === 'draft') {
          try {
            const statusResult = await updateStatus({
              contractId: created.id,
              statusData: { status: 'pending_acceptance' },
            });
            created.status = 'pending_acceptance';
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

  return { submit, isSubmitting };
}

export default useContractSubmission;
