// src/hooks/queries/useWaitingCredits.ts
//
// Notifications that could not be sent because the tenant had no credits.
//
// These are not failures. A JTD parked as 'no_credits' is holding its place
// in a FIFO queue and will be released automatically the moment credits
// arrive — trg_context_release_jtds fires on any balance increase and calls
// release_waiting_jtds. So the honest phrasing on screen is "waiting", never
// "failed": nothing is lost and the tenant does not need to re-do anything.
//
// The route and its RPC have existed since jtd-framework/003. Nothing ever
// called them from the tenant side because, until Business Model V4 Phase B,
// nothing in the product ever parked a message.

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import api from '@/services/api';
import { API_ENDPOINTS } from '@/services/serviceURLs';

export interface WaitingCredits {
  whatsapp: number;
  sms: number;
  email: number;
  /** Not returned by every version of the RPC — treat as optional. */
  inapp?: number;
  total: number;
}

const EMPTY: WaitingCredits = { whatsapp: 0, sms: 0, email: 0, total: 0 };

export const waitingCreditsKeys = {
  all: ['waiting-credits'] as const,
  detail: (tenantId?: string) => [...waitingCreditsKeys.all, tenantId] as const,
};

export const useWaitingCredits = () => {
  const { currentTenant } = useAuth();

  return useQuery({
    queryKey: waitingCreditsKeys.detail(currentTenant?.id),
    queryFn: async (): Promise<WaitingCredits> => {
      if (!currentTenant?.id) throw new Error('Missing tenant');
      const response = await api.get(API_ENDPOINTS.TENANT_CONTEXT.WAITING_JTDS);
      return (response.data?.waiting ?? EMPTY) as WaitingCredits;
    },
    enabled: !!currentTenant?.id,
    // A top-up drains the queue within seconds, so a stale count is worse
    // than a slightly chattier poll.
    staleTime: 30 * 1000,
    // Never blow up the page it sits on — an empty queue and an unreachable
    // one look the same to the tenant, and neither is worth an error state.
    retry: 1,
  });
};

export default useWaitingCredits;
