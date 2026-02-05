// src/hooks/queries/useContactCockpit.ts
// Contact Cockpit TanStack Query Hook

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import api from '@/services/api';
import type { ContactCockpitData, ContactCockpitResponse } from '@/types/contactCockpit';

// =================================================================
// API ENDPOINT
// =================================================================

const COCKPIT_API = {
  SUMMARY: (contactId: string, daysAhead: number = 7) =>
    `/api/contacts/${contactId}/cockpit?days_ahead=${daysAhead}`,
};

// =================================================================
// QUERY KEYS
// =================================================================

export const contactCockpitKeys = {
  all: ['contact-cockpit'] as const,
  summaries: () => [...contactCockpitKeys.all, 'summary'] as const,
  summary: (contactId: string, daysAhead: number) =>
    [...contactCockpitKeys.summaries(), { contactId, daysAhead }] as const,
};

// =================================================================
// QUERY HOOK
// =================================================================

/**
 * Hook to fetch contact cockpit summary data
 * Includes: contracts summary, events summary, overdue/upcoming events, LTV, health score
 */
export const useContactCockpit = (
  contactId: string | null,
  options?: {
    enabled?: boolean;
    daysAhead?: number;
    refetchInterval?: number;
  }
) => {
  const { currentTenant } = useAuth();
  const daysAhead = options?.daysAhead ?? 7;

  return useQuery({
    queryKey: contactCockpitKeys.summary(contactId || '', daysAhead),
    queryFn: async (): Promise<ContactCockpitData> => {
      if (!currentTenant?.id) {
        throw new Error('No tenant selected');
      }
      if (!contactId) {
        throw new Error('Contact ID is required');
      }

      const response = await api.get(COCKPIT_API.SUMMARY(contactId, daysAhead));

      const result: ContactCockpitResponse = response.data?.data || response.data;

      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to load cockpit data');
      }

      return result.data;
    },
    enabled: !!currentTenant?.id && !!contactId && (options?.enabled !== false),
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000,   // 10 minutes
    refetchInterval: options?.refetchInterval,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
    networkMode: 'online',
  });
};

// =================================================================
// UTILITY HOOKS
// =================================================================

/**
 * Hook to invalidate contact cockpit queries
 */
export const useInvalidateContactCockpit = () => {
  const queryClient = useQueryClient();

  return {
    invalidateAll: () => {
      queryClient.invalidateQueries({ queryKey: contactCockpitKeys.all });
    },
    invalidateForContact: (contactId: string) => {
      queryClient.invalidateQueries({
        predicate: (query) =>
          query.queryKey[0] === 'contact-cockpit' &&
          query.queryKey[1] === 'summary' &&
          (query.queryKey[2] as any)?.contactId === contactId,
      });
    },
  };
};

/**
 * Hook to prefetch cockpit data for a contact
 */
export const usePrefetchContactCockpit = () => {
  const queryClient = useQueryClient();
  const { currentTenant } = useAuth();

  return async (contactId: string, daysAhead: number = 7) => {
    if (!currentTenant?.id || !contactId) return;

    await queryClient.prefetchQuery({
      queryKey: contactCockpitKeys.summary(contactId, daysAhead),
      queryFn: async () => {
        const response = await api.get(COCKPIT_API.SUMMARY(contactId, daysAhead));
        const result: ContactCockpitResponse = response.data?.data || response.data;
        if (!result.success || !result.data) {
          throw new Error(result.error || 'Failed to load cockpit data');
        }
        return result.data;
      },
      staleTime: 2 * 60 * 1000,
    });
  };
};

export default useContactCockpit;
