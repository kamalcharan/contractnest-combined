// src/hooks/queries/useContractEventQueries.ts
// Contract Events (Timeline) TanStack Query Hooks — follows useContractQueries pattern

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import api from '@/services/api';
import { captureException } from '@/utils/sentry';
import type {
  ContractEvent,
  ContractEventFilters,
  ContractEventListResponse,
  DateSummaryFilters,
  DateSummaryResponse,
  CreateContractEventsRequest,
  CreateContractEventsResponse,
  UpdateContractEventRequest,
} from '@/types/contractEvents';

// =================================================================
// API ENDPOINTS (inline until serviceURLs.ts is updated)
// =================================================================

const CONTRACT_EVENTS_API = {
  LIST: '/api/contract-events',
  DATES: '/api/contract-events/dates',
  GET: (id: string) => `/api/contract-events/${id}`,
  CREATE: '/api/contract-events',
  UPDATE: (id: string) => `/api/contract-events/${id}`,

  LIST_WITH_FILTERS: (filters: ContractEventFilters = {}) => {
    const params = new URLSearchParams();

    if (filters.contract_id) params.append('contract_id', filters.contract_id);
    if (filters.contact_id) params.append('contact_id', filters.contact_id);
    if (filters.assigned_to) params.append('assigned_to', filters.assigned_to);
    if (filters.status) params.append('status', filters.status);
    if (filters.event_type) params.append('event_type', filters.event_type);
    if (filters.date_from) params.append('date_from', filters.date_from);
    if (filters.date_to) params.append('date_to', filters.date_to);
    if (filters.page !== undefined) params.append('page', filters.page.toString());
    if (filters.per_page !== undefined) params.append('per_page', filters.per_page.toString());
    if (filters.sort_by) params.append('sort_by', filters.sort_by);
    if (filters.sort_order) params.append('sort_order', filters.sort_order);

    const queryString = params.toString();
    return queryString ? `/api/contract-events?${queryString}` : '/api/contract-events';
  },

  DATES_WITH_FILTERS: (filters: DateSummaryFilters = {}) => {
    const params = new URLSearchParams();

    if (filters.contract_id) params.append('contract_id', filters.contract_id);
    if (filters.contact_id) params.append('contact_id', filters.contact_id);
    if (filters.assigned_to) params.append('assigned_to', filters.assigned_to);
    if (filters.event_type) params.append('event_type', filters.event_type);

    const queryString = params.toString();
    return queryString ? `/api/contract-events/dates?${queryString}` : '/api/contract-events/dates';
  },
};

// =================================================================
// QUERY KEYS
// =================================================================

export const contractEventKeys = {
  all: ['contract-events'] as const,
  lists: () => [...contractEventKeys.all, 'list'] as const,
  list: (filters: ContractEventFilters) => [...contractEventKeys.lists(), { filters }] as const,
  details: () => [...contractEventKeys.all, 'detail'] as const,
  detail: (id: string) => [...contractEventKeys.details(), id] as const,
  dateSummaries: () => [...contractEventKeys.all, 'dates'] as const,
  dateSummary: (filters: DateSummaryFilters) => [...contractEventKeys.dateSummaries(), { filters }] as const,
};

// =================================================================
// QUERY HOOKS
// =================================================================

/**
 * Hook to fetch paginated, filtered list of contract events
 */
export const useContractEvents = (
  filters: ContractEventFilters = {},
  options?: {
    enabled?: boolean;
    refetchOnWindowFocus?: boolean;
  }
) => {
  const { currentTenant } = useAuth();

  return useQuery({
    queryKey: contractEventKeys.list(filters),
    queryFn: async (): Promise<ContractEventListResponse> => {
      if (!currentTenant?.id) {
        throw new Error('No tenant selected');
      }

      const url = CONTRACT_EVENTS_API.LIST_WITH_FILTERS(filters);
      const response = await api.get(url);

      const data = response.data?.data || response.data;

      if (!data) {
        return {
          items: [],
          total_count: 0,
          page_info: {
            has_next_page: false,
            has_prev_page: false,
            current_page: 1,
            total_pages: 0,
          },
          filters_applied: filters,
        };
      }

      return data;
    },
    enabled: !!currentTenant?.id && (options?.enabled !== false),
    staleTime: 1 * 60 * 1000,   // 1 minute (events change more frequently)
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: options?.refetchOnWindowFocus ?? false,
    refetchOnReconnect: true,
    retry: 1,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
    networkMode: 'online',
    structuralSharing: true,
  });
};

/**
 * Hook to fetch contract events for a specific contract
 */
export const useContractEventsForContract = (
  contractId: string | null,
  options?: {
    enabled?: boolean;
    page?: number;
    per_page?: number;
  }
) => {
  return useContractEvents(
    {
      contract_id: contractId || undefined,
      page: options?.page || 1,
      per_page: options?.per_page || 50,
      sort_by: 'scheduled_date',
      sort_order: 'asc',
    },
    {
      enabled: !!contractId && (options?.enabled !== false),
    }
  );
};

/**
 * Hook to fetch contract events for a specific customer (contact)
 */
export const useContractEventsForCustomer = (
  contactId: string | null,
  options?: {
    enabled?: boolean;
    page?: number;
    per_page?: number;
  }
) => {
  return useContractEvents(
    {
      contact_id: contactId || undefined,
      page: options?.page || 1,
      per_page: options?.per_page || 50,
      sort_by: 'scheduled_date',
      sort_order: 'asc',
    },
    {
      enabled: !!contactId && (options?.enabled !== false),
    }
  );
};

/**
 * Hook to fetch contract events assigned to a specific user
 */
export const useContractEventsForAssignee = (
  assigneeId: string | null,
  options?: {
    enabled?: boolean;
    page?: number;
    per_page?: number;
  }
) => {
  return useContractEvents(
    {
      assigned_to: assigneeId || undefined,
      page: options?.page || 1,
      per_page: options?.per_page || 50,
      sort_by: 'scheduled_date',
      sort_order: 'asc',
    },
    {
      enabled: !!assigneeId && (options?.enabled !== false),
    }
  );
};

/**
 * Hook to fetch date summary (6 buckets: overdue, today, tomorrow, this_week, next_week, later)
 */
export const useContractEventDateSummary = (
  filters: DateSummaryFilters = {},
  options?: {
    enabled?: boolean;
    refetchInterval?: number;
  }
) => {
  const { currentTenant } = useAuth();

  return useQuery({
    queryKey: contractEventKeys.dateSummary(filters),
    queryFn: async (): Promise<DateSummaryResponse> => {
      if (!currentTenant?.id) {
        throw new Error('No tenant selected');
      }

      const url = CONTRACT_EVENTS_API.DATES_WITH_FILTERS(filters);
      const response = await api.get(url);

      const data = response.data?.data || response.data;

      // Return empty buckets if no data
      if (!data) {
        const emptyBucket = { count: 0, service_count: 0, billing_count: 0, billing_amount: 0, by_status: {} };
        return {
          overdue: emptyBucket,
          today: emptyBucket,
          tomorrow: emptyBucket,
          this_week: emptyBucket,
          next_week: emptyBucket,
          later: emptyBucket,
          totals: { total_events: 0, total_billing_amount: 0 },
        };
      }

      return data;
    },
    enabled: !!currentTenant?.id && (options?.enabled !== false),
    staleTime: 30 * 1000,  // 30 seconds (summary changes frequently)
    gcTime: 5 * 60 * 1000,
    refetchInterval: options?.refetchInterval,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    retry: 1,
    networkMode: 'online',
  });
};

/**
 * Hook to fetch date summary for a specific contract
 */
export const useDateSummaryForContract = (
  contractId: string | null,
  options?: { enabled?: boolean }
) => {
  return useContractEventDateSummary(
    { contract_id: contractId || undefined },
    { enabled: !!contractId && (options?.enabled !== false) }
  );
};

/**
 * Hook to fetch date summary for a specific customer
 */
export const useDateSummaryForCustomer = (
  contactId: string | null,
  options?: { enabled?: boolean }
) => {
  return useContractEventDateSummary(
    { contact_id: contactId || undefined },
    { enabled: !!contactId && (options?.enabled !== false) }
  );
};

/**
 * Hook to fetch tenant-wide date summary (dashboard)
 */
export const useTenantDateSummary = (options?: { enabled?: boolean; refetchInterval?: number }) => {
  return useContractEventDateSummary({}, options);
};

// =================================================================
// MUTATION HOOKS
// =================================================================

/**
 * Hook for contract event operations (create, update)
 */
export const useContractEventOperations = () => {
  const { currentTenant } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // ── Bulk Create ──
  const createEventsMutation = useMutation({
    mutationFn: async (data: CreateContractEventsRequest): Promise<CreateContractEventsResponse> => {
      if (!currentTenant?.id) {
        throw new Error('No tenant selected');
      }

      const response = await api.post(CONTRACT_EVENTS_API.CREATE, data, {
        headers: {
          'x-idempotency-key': `create-events-${data.contract_id}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        },
      });

      return response.data?.data || response.data;
    },
    onSuccess: (result, variables) => {
      // Invalidate all related queries
      queryClient.invalidateQueries({ queryKey: contractEventKeys.lists() });
      queryClient.invalidateQueries({ queryKey: contractEventKeys.dateSummaries() });

      toast({
        title: 'Events Created',
        description: `${result.inserted_count} event(s) have been created`,
      });
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.error || error.message || 'Failed to create events';

      captureException(error, {
        tags: { component: 'useContractEventOperations', action: 'createEvents' },
        extra: { tenantId: currentTenant?.id, errorMessage },
      });

      toast({
        variant: 'destructive',
        title: 'Create Failed',
        description: errorMessage,
      });
    },
  });

  // ── Update Single Event ──
  const updateEventMutation = useMutation({
    mutationFn: async ({
      eventId,
      updateData,
    }: {
      eventId: string;
      updateData: UpdateContractEventRequest;
    }): Promise<ContractEvent> => {
      if (!currentTenant?.id) {
        throw new Error('No tenant selected');
      }

      const response = await api.patch(
        CONTRACT_EVENTS_API.UPDATE(eventId),
        updateData
      );

      return response.data?.data || response.data;
    },
    onSuccess: (updatedEvent) => {
      // Update cache directly for the detail
      queryClient.setQueryData(contractEventKeys.detail(updatedEvent.id), updatedEvent);

      // Invalidate lists and summaries
      queryClient.invalidateQueries({ queryKey: contractEventKeys.lists() });
      queryClient.invalidateQueries({ queryKey: contractEventKeys.dateSummaries() });

      const statusDisplay = updatedEvent.status.replace(/_/g, ' ');
      toast({
        title: 'Event Updated',
        description: `Status changed to ${statusDisplay}`,
      });
    },
    onError: (error: any) => {
      const status = error.response?.status;
      const code = error.response?.data?.code;

      let errorMessage: string;
      let title: string;

      if (status === 409 || code === 'VERSION_CONFLICT') {
        errorMessage = 'This event was modified by someone else. Please refresh and try again.';
        title = 'Version Conflict';
      } else if (status === 422 || code === 'INVALID_TRANSITION') {
        errorMessage = error.response?.data?.error || 'Invalid status transition';
        title = 'Invalid Transition';
      } else {
        errorMessage = error.response?.data?.error || error.message || 'Failed to update event';
        title = 'Update Failed';
      }

      captureException(error, {
        tags: { component: 'useContractEventOperations', action: 'updateEvent' },
        extra: { tenantId: currentTenant?.id, errorMessage, httpStatus: status },
      });

      toast({
        variant: 'destructive',
        title,
        description: errorMessage,
      });
    },
  });

  // ── Quick Status Update ──
  const updateStatusMutation = useMutation({
    mutationFn: async ({
      eventId,
      newStatus,
      version,
      reason,
    }: {
      eventId: string;
      newStatus: string;
      version: number;
      reason?: string;
    }): Promise<ContractEvent> => {
      if (!currentTenant?.id) {
        throw new Error('No tenant selected');
      }

      const response = await api.patch(CONTRACT_EVENTS_API.UPDATE(eventId), {
        status: newStatus,
        version,
        reason,
      });

      return response.data?.data || response.data;
    },
    onSuccess: (updatedEvent) => {
      queryClient.setQueryData(contractEventKeys.detail(updatedEvent.id), updatedEvent);
      queryClient.invalidateQueries({ queryKey: contractEventKeys.lists() });
      queryClient.invalidateQueries({ queryKey: contractEventKeys.dateSummaries() });

      const statusDisplay = updatedEvent.status.replace(/_/g, ' ');
      toast({
        title: 'Status Updated',
        description: `Event marked as ${statusDisplay}`,
      });
    },
    onError: (error: any) => {
      const status = error.response?.status;
      const errorMessage =
        status === 409
          ? 'This event was modified by someone else. Please refresh and try again.'
          : error.response?.data?.error || error.message || 'Failed to update status';

      captureException(error, {
        tags: { component: 'useContractEventOperations', action: 'updateStatus' },
        extra: { tenantId: currentTenant?.id, errorMessage, httpStatus: status },
      });

      toast({
        variant: 'destructive',
        title: status === 409 ? 'Version Conflict' : 'Status Update Failed',
        description: errorMessage,
      });
    },
  });

  return {
    // Mutations
    createEvents: createEventsMutation.mutateAsync,
    updateEvent: updateEventMutation.mutateAsync,
    updateStatus: updateStatusMutation.mutateAsync,

    // Loading states
    isCreating: createEventsMutation.isPending,
    isUpdating: updateEventMutation.isPending,
    isChangingStatus: updateStatusMutation.isPending,

    // Error states
    createError: createEventsMutation.error,
    updateError: updateEventMutation.error,
    statusError: updateStatusMutation.error,
  };
};

// =================================================================
// UTILITY HOOKS
// =================================================================

/**
 * Hook to invalidate all contract event queries (useful after realtime updates)
 */
export const useInvalidateContractEvents = () => {
  const queryClient = useQueryClient();

  return {
    invalidateAll: () => {
      queryClient.invalidateQueries({ queryKey: contractEventKeys.all });
    },
    invalidateLists: () => {
      queryClient.invalidateQueries({ queryKey: contractEventKeys.lists() });
    },
    invalidateDateSummaries: () => {
      queryClient.invalidateQueries({ queryKey: contractEventKeys.dateSummaries() });
    },
    invalidateForContract: (contractId: string) => {
      queryClient.invalidateQueries({
        queryKey: contractEventKeys.list({ contract_id: contractId }),
      });
      queryClient.invalidateQueries({
        queryKey: contractEventKeys.dateSummary({ contract_id: contractId }),
      });
    },
  };
};
