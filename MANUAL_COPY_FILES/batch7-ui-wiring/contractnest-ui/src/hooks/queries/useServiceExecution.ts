// src/hooks/queries/useServiceExecution.ts
// Service Execution TanStack Query Hooks — tickets, evidence, audit
// Follows useContractEventQueries pattern

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import api from '@/services/api';
import { API_ENDPOINTS } from '@/services/serviceURLs';
import type { ServiceTicketFilters, ServiceEvidenceFilters, AuditLogFilters } from '@/services/serviceURLs';

// =================================================================
// TYPES
// =================================================================

export interface ServiceTicket {
  id: string;
  ticket_number: string;
  contract_id: string;
  status: string;
  assigned_to_id: string | null;
  assigned_to_name: string | null;
  created_by_id: string;
  created_by_name: string;
  notes: string | null;
  version: number;
  created_at: string;
  updated_at: string;
  started_at: string | null;
  completed_at: string | null;
  event_count: number;
  evidence_count: number;
}

export interface ServiceTicketDetail extends ServiceTicket {
  events: Array<{
    id: string;
    event_id: string;
    event_type: string;
    block_name: string;
  }>;
  evidence: ServiceEvidence[];
}

export interface ServiceEvidence {
  id: string;
  ticket_id: string;
  contract_id: string;
  block_id: string | null;
  block_name: string | null;
  evidence_type: string;
  status: string;
  file_url: string | null;
  file_name: string | null;
  file_size: number | null;
  file_type: string | null;
  otp_code: string | null;
  otp_verified: boolean;
  otp_verified_at: string | null;
  otp_verified_by_name: string | null;
  form_data: any;
  uploaded_by_id: string | null;
  uploaded_by_name: string | null;
  verified_by_id: string | null;
  verified_by_name: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface AuditLogEntry {
  id: string;
  entity_type: string;
  entity_id: string;
  category: string;
  action: string;
  description: string | null;
  old_value: any;
  new_value: any;
  performed_by_id: string;
  performed_by_name: string;
  created_at: string;
}

interface TicketListResponse {
  items: ServiceTicket[];
  total_count: number;
  page: number;
  per_page: number;
}

interface EvidenceListResponse {
  items: ServiceEvidence[];
  total_count: number;
  page: number;
  per_page: number;
}

interface AuditLogResponse {
  items: AuditLogEntry[];
  total_count: number;
  page: number;
  per_page: number;
  category_counts?: Record<string, number>;
}

// =================================================================
// QUERY KEYS
// =================================================================

export const serviceExecutionKeys = {
  all: ['service-execution'] as const,

  // Tickets
  tickets: () => [...serviceExecutionKeys.all, 'tickets'] as const,
  ticketList: (filters: ServiceTicketFilters) => [...serviceExecutionKeys.tickets(), 'list', { filters }] as const,
  ticketDetail: (ticketId: string) => [...serviceExecutionKeys.tickets(), 'detail', ticketId] as const,

  // Evidence
  evidence: () => [...serviceExecutionKeys.all, 'evidence'] as const,
  evidenceList: (filters: ServiceEvidenceFilters) => [...serviceExecutionKeys.evidence(), 'list', { filters }] as const,
  ticketEvidence: (ticketId: string) => [...serviceExecutionKeys.evidence(), 'ticket', ticketId] as const,

  // Audit
  audit: () => [...serviceExecutionKeys.all, 'audit'] as const,
  auditLog: (filters: AuditLogFilters) => [...serviceExecutionKeys.audit(), 'list', { filters }] as const,
};

// =================================================================
// TICKET HOOKS
// =================================================================

export const useServiceTickets = (
  filters: ServiceTicketFilters = {},
  options?: { enabled?: boolean }
) => {
  const { currentTenant } = useAuth();

  return useQuery({
    queryKey: serviceExecutionKeys.ticketList(filters),
    queryFn: async (): Promise<TicketListResponse> => {
      if (!currentTenant?.id) throw new Error('No tenant selected');

      const url = API_ENDPOINTS.SERVICE_EXECUTION.TICKETS.LIST_WITH_FILTERS(filters);
      const response = await api.get(url);
      const data = response.data?.data || response.data;

      return data || { items: [], total_count: 0, page: 1, per_page: 25 };
    },
    enabled: !!currentTenant?.id && (options?.enabled !== false),
    staleTime: 1 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
  });
};

export const useServiceTicketsForContract = (
  contractId: string | null,
  options?: { enabled?: boolean }
) => {
  return useServiceTickets(
    { contract_id: contractId || undefined, per_page: 100 },
    { enabled: !!contractId && (options?.enabled !== false) }
  );
};

export const useServiceTicketDetail = (
  ticketId: string | null,
  options?: { enabled?: boolean }
) => {
  const { currentTenant } = useAuth();

  return useQuery({
    queryKey: serviceExecutionKeys.ticketDetail(ticketId || ''),
    queryFn: async (): Promise<ServiceTicketDetail> => {
      if (!currentTenant?.id) throw new Error('No tenant selected');
      if (!ticketId) throw new Error('No ticket ID');

      const url = API_ENDPOINTS.SERVICE_EXECUTION.TICKETS.GET(ticketId);
      const response = await api.get(url);
      const data = response.data?.data || response.data;
      return data;
    },
    enabled: !!currentTenant?.id && !!ticketId && (options?.enabled !== false),
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
  });
};

// =================================================================
// TICKET MUTATIONS
// =================================================================

interface CreateTicketPayload {
  contract_id: string;
  event_ids: string[];
  assigned_to_id?: string;
  assigned_to_name?: string;
  notes?: string;
}

interface UpdateTicketPayload {
  ticketId: string;
  status?: string;
  assigned_to_id?: string;
  assigned_to_name?: string;
  notes?: string;
  version: number;
}

export const useCreateServiceTicket = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (payload: CreateTicketPayload) => {
      const response = await api.post(API_ENDPOINTS.SERVICE_EXECUTION.TICKETS.CREATE, payload);
      return response.data?.data || response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: serviceExecutionKeys.tickets() });
      toast({
        title: 'Service Ticket Created',
        description: `Ticket ${data?.ticket_number || ''} created successfully`,
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to create ticket',
        description: error?.response?.data?.message || error.message || 'An error occurred',
        variant: 'destructive',
      });
    },
  });
};

export const useUpdateServiceTicket = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ ticketId, ...payload }: UpdateTicketPayload) => {
      const url = API_ENDPOINTS.SERVICE_EXECUTION.TICKETS.UPDATE(ticketId);
      const response = await api.patch(url, payload);
      return response.data?.data || response.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: serviceExecutionKeys.tickets() });
      queryClient.invalidateQueries({ queryKey: serviceExecutionKeys.ticketDetail(variables.ticketId) });
      toast({
        title: 'Ticket Updated',
        description: 'Service ticket updated successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to update ticket',
        description: error?.response?.data?.message || error.message || 'An error occurred',
        variant: 'destructive',
      });
    },
  });
};

// =================================================================
// EVIDENCE HOOKS
// =================================================================

export const useServiceEvidence = (
  filters: ServiceEvidenceFilters = {},
  options?: { enabled?: boolean }
) => {
  const { currentTenant } = useAuth();

  return useQuery({
    queryKey: serviceExecutionKeys.evidenceList(filters),
    queryFn: async (): Promise<EvidenceListResponse> => {
      if (!currentTenant?.id) throw new Error('No tenant selected');

      const url = API_ENDPOINTS.SERVICE_EXECUTION.EVIDENCE.LIST_WITH_FILTERS(filters);
      const response = await api.get(url);
      const data = response.data?.data || response.data;

      return data || { items: [], total_count: 0, page: 1, per_page: 25 };
    },
    enabled: !!currentTenant?.id && (options?.enabled !== false),
    staleTime: 1 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
  });
};

export const useContractEvidence = (
  contractId: string | null,
  options?: { enabled?: boolean }
) => {
  return useServiceEvidence(
    { contract_id: contractId || undefined, per_page: 200 },
    { enabled: !!contractId && (options?.enabled !== false) }
  );
};

export const useTicketEvidence = (
  ticketId: string | null,
  options?: { enabled?: boolean }
) => {
  return useServiceEvidence(
    { ticket_id: ticketId || undefined, per_page: 50 },
    { enabled: !!ticketId && (options?.enabled !== false) }
  );
};

// =================================================================
// EVIDENCE MUTATIONS
// =================================================================

interface CreateEvidencePayload {
  ticketId: string;
  contract_id: string;
  block_id?: string;
  block_name?: string;
  evidence_type: string;
  file_url?: string;
  file_name?: string;
  file_size?: number;
  file_type?: string;
  form_data?: any;
  notes?: string;
}

interface UpdateEvidencePayload {
  ticketId: string;
  evidenceId: string;
  action: 'verify' | 'reject' | 'verify_otp' | 'update_file' | 'update_form';
  otp_code?: string;
  file_url?: string;
  file_name?: string;
  form_data?: any;
  notes?: string;
}

export const useCreateServiceEvidence = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ ticketId, ...payload }: CreateEvidencePayload) => {
      const url = API_ENDPOINTS.SERVICE_EXECUTION.EVIDENCE.CREATE(ticketId);
      const response = await api.post(url, payload);
      return response.data?.data || response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: serviceExecutionKeys.evidence() });
      queryClient.invalidateQueries({ queryKey: serviceExecutionKeys.tickets() });
      toast({ title: 'Evidence Uploaded', description: 'Evidence added successfully' });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to upload evidence',
        description: error?.response?.data?.message || error.message || 'An error occurred',
        variant: 'destructive',
      });
    },
  });
};

export const useUpdateServiceEvidence = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ ticketId, evidenceId, ...payload }: UpdateEvidencePayload) => {
      const url = API_ENDPOINTS.SERVICE_EXECUTION.EVIDENCE.UPDATE(ticketId, evidenceId);
      const response = await api.patch(url, payload);
      return response.data?.data || response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: serviceExecutionKeys.evidence() });
      toast({ title: 'Evidence Updated', description: 'Evidence updated successfully' });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to update evidence',
        description: error?.response?.data?.message || error.message || 'An error occurred',
        variant: 'destructive',
      });
    },
  });
};

// =================================================================
// AUDIT LOG HOOKS
// =================================================================

export const useAuditLog = (
  filters: AuditLogFilters = {},
  options?: { enabled?: boolean }
) => {
  const { currentTenant } = useAuth();

  return useQuery({
    queryKey: serviceExecutionKeys.auditLog(filters),
    queryFn: async (): Promise<AuditLogResponse> => {
      if (!currentTenant?.id) throw new Error('No tenant selected');

      const url = API_ENDPOINTS.SERVICE_EXECUTION.AUDIT.LIST_WITH_FILTERS(filters);
      const response = await api.get(url);
      const data = response.data?.data || response.data;

      return data || { items: [], total_count: 0, page: 1, per_page: 25, category_counts: {} };
    },
    enabled: !!currentTenant?.id && (options?.enabled !== false),
    staleTime: 1 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
  });
};

export const useContractAuditLog = (
  contractId: string | null,
  filters?: { category?: string; page?: number; per_page?: number },
  options?: { enabled?: boolean }
) => {
  return useAuditLog(
    {
      contract_id: contractId || undefined,
      entity_type: 'contract',
      entity_id: contractId || undefined,
      category: filters?.category,
      page: filters?.page,
      per_page: filters?.per_page || 50,
    },
    { enabled: !!contractId && (options?.enabled !== false) }
  );
};
