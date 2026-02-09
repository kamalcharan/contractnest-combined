// src/hooks/queries/useEventStatusConfigQueries.ts
// Event Status Configuration TanStack Query Hooks
// Pattern: fetch-once with long staleTime (status config rarely changes)

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import api from '@/services/api';
import { API_ENDPOINTS } from '@/services/serviceURLs';
import { captureException } from '@/utils/sentry';
import type {
  EventStatusDefinition,
  EventStatusTransition,
  GetStatusesResponse,
  GetTransitionsResponse,
  UpsertStatusRequest,
  DeleteStatusRequest,
  UpsertTransitionRequest,
  DeleteTransitionRequest,
  StatusMap,
  TransitionMap,
} from '@/types/eventStatusConfig';
import { buildStatusMap, buildTransitionMap } from '@/types/eventStatusConfig';

// =================================================================
// QUERY KEYS
// =================================================================

export const eventStatusConfigKeys = {
  all: ['event-status-config'] as const,
  statuses: () => [...eventStatusConfigKeys.all, 'statuses'] as const,
  statusesByType: (eventType: string) => [...eventStatusConfigKeys.statuses(), eventType] as const,
  transitions: () => [...eventStatusConfigKeys.all, 'transitions'] as const,
  transitionsByType: (eventType: string) => [...eventStatusConfigKeys.transitions(), eventType] as const,
  transitionsFrom: (eventType: string, fromStatus: string) =>
    [...eventStatusConfigKeys.transitionsByType(eventType), fromStatus] as const,
};

// =================================================================
// QUERY HOOKS
// =================================================================

/**
 * Fetch status definitions for an event type.
 * Long staleTime — status config rarely changes during a session.
 */
export const useEventStatuses = (
  eventType: string,
  options?: { enabled?: boolean }
) => {
  const { currentTenant } = useAuth();

  return useQuery({
    queryKey: eventStatusConfigKeys.statusesByType(eventType),
    queryFn: async (): Promise<GetStatusesResponse> => {
      if (!currentTenant?.id) {
        throw new Error('No tenant selected');
      }

      const url = API_ENDPOINTS.EVENT_STATUS_CONFIG.GET_STATUSES(eventType);
      const response = await api.get(url);
      const data = response.data?.data || response.data;

      return data || { success: true, event_type: eventType, is_tenant_override: false, statuses: [] };
    },
    enabled: !!currentTenant?.id && !!eventType && (options?.enabled !== false),
    staleTime: 10 * 60 * 1000,  // 10 minutes — config rarely changes
    gcTime: 30 * 60 * 1000,     // 30 minutes in cache
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: 1,
    structuralSharing: true,
  });
};

/**
 * Fetch transitions for an event type.
 * Optionally filter by from_status.
 */
export const useEventTransitions = (
  eventType: string,
  fromStatus?: string,
  options?: { enabled?: boolean }
) => {
  const { currentTenant } = useAuth();

  return useQuery({
    queryKey: fromStatus
      ? eventStatusConfigKeys.transitionsFrom(eventType, fromStatus)
      : eventStatusConfigKeys.transitionsByType(eventType),
    queryFn: async (): Promise<GetTransitionsResponse> => {
      if (!currentTenant?.id) {
        throw new Error('No tenant selected');
      }

      const url = API_ENDPOINTS.EVENT_STATUS_CONFIG.GET_TRANSITIONS(eventType, fromStatus);
      const response = await api.get(url);
      const data = response.data?.data || response.data;

      return data || { success: true, event_type: eventType, is_tenant_override: false, transitions: [] };
    },
    enabled: !!currentTenant?.id && !!eventType && (options?.enabled !== false),
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: 1,
    structuralSharing: true,
  });
};

// =================================================================
// DERIVED DATA HOOKS
// =================================================================

/**
 * Get a StatusMap (status_code -> definition) for quick lookups.
 * Useful for rendering status badges with colors/icons.
 */
export const useStatusMap = (eventType: string): StatusMap => {
  const { data } = useEventStatuses(eventType);
  if (!data?.statuses) return {};
  return buildStatusMap(data.statuses);
};

/**
 * Get a TransitionMap (from_status -> allowed to_status[]) for UI validation.
 * Useful for disabling invalid status options in dropdowns.
 */
export const useTransitionMap = (eventType: string): TransitionMap => {
  const { data } = useEventTransitions(eventType);
  if (!data?.transitions) return {};
  return buildTransitionMap(data.transitions);
};

/**
 * Get allowed next statuses for a specific current status.
 */
export const useAllowedTransitions = (
  eventType: string,
  currentStatus: string
): string[] => {
  const transitionMap = useTransitionMap(eventType);
  return transitionMap[currentStatus] || [];
};

// =================================================================
// MUTATION HOOKS
// =================================================================

export const useEventStatusConfigMutations = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: eventStatusConfigKeys.all });
  };

  const upsertStatus = useMutation({
    mutationFn: async (data: UpsertStatusRequest) => {
      const response = await api.post(
        API_ENDPOINTS.EVENT_STATUS_CONFIG.STATUSES,
        data
      );
      return response.data;
    },
    onSuccess: (_data, variables) => {
      invalidateAll();
      toast({
        title: 'Status saved',
        description: `${variables.display_name} has been saved.`,
      });
    },
    onError: (error: any) => {
      captureException(error, { tags: { source: 'event_status_config', action: 'upsert_status' } });
      toast({
        title: 'Failed to save status',
        description: error?.response?.data?.error?.message || 'An error occurred',
        variant: 'destructive',
      });
    },
  });

  const deleteStatus = useMutation({
    mutationFn: async (data: DeleteStatusRequest) => {
      const response = await api.delete(
        API_ENDPOINTS.EVENT_STATUS_CONFIG.STATUSES,
        { data }
      );
      return response.data;
    },
    onSuccess: () => {
      invalidateAll();
      toast({ title: 'Status removed' });
    },
    onError: (error: any) => {
      captureException(error, { tags: { source: 'event_status_config', action: 'delete_status' } });
      toast({
        title: 'Failed to remove status',
        description: error?.response?.data?.error?.message || 'An error occurred',
        variant: 'destructive',
      });
    },
  });

  const upsertTransition = useMutation({
    mutationFn: async (data: UpsertTransitionRequest) => {
      const response = await api.post(
        API_ENDPOINTS.EVENT_STATUS_CONFIG.TRANSITIONS,
        data
      );
      return response.data;
    },
    onSuccess: () => {
      invalidateAll();
      toast({ title: 'Transition saved' });
    },
    onError: (error: any) => {
      captureException(error, { tags: { source: 'event_status_config', action: 'upsert_transition' } });
      toast({
        title: 'Failed to save transition',
        description: error?.response?.data?.error?.message || 'An error occurred',
        variant: 'destructive',
      });
    },
  });

  const deleteTransition = useMutation({
    mutationFn: async (data: DeleteTransitionRequest) => {
      const response = await api.delete(
        API_ENDPOINTS.EVENT_STATUS_CONFIG.TRANSITIONS,
        { data }
      );
      return response.data;
    },
    onSuccess: () => {
      invalidateAll();
      toast({ title: 'Transition removed' });
    },
    onError: (error: any) => {
      captureException(error, { tags: { source: 'event_status_config', action: 'delete_transition' } });
      toast({
        title: 'Failed to remove transition',
        description: error?.response?.data?.error?.message || 'An error occurred',
        variant: 'destructive',
      });
    },
  });

  const seedDefaults = useMutation({
    mutationFn: async () => {
      const response = await api.post(API_ENDPOINTS.EVENT_STATUS_CONFIG.SEED);
      return response.data;
    },
    onSuccess: () => {
      invalidateAll();
      toast({ title: 'Defaults restored', description: 'Event status configuration has been reset to defaults.' });
    },
    onError: (error: any) => {
      captureException(error, { tags: { source: 'event_status_config', action: 'seed_defaults' } });
      toast({
        title: 'Failed to restore defaults',
        description: error?.response?.data?.error?.message || 'An error occurred',
        variant: 'destructive',
      });
    },
  });

  return {
    upsertStatus,
    deleteStatus,
    upsertTransition,
    deleteTransition,
    seedDefaults,
  };
};
