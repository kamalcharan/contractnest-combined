// ============================================================================
// Appointment queries — Stage 3 (Operations → Appointments)
// Board feed + create + transitions over /api/appointments.
// Conventions per useFinanceQueries.
// ============================================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { vaniToast } from '@/components/common/toast';

export const APPOINTMENT_ENDPOINTS = {
  LIST: '/api/appointments',
  CREATE: '/api/appointments',
  UPDATE: (id: string) => `/api/appointments/${id}`
};

export type AppointmentStatus =
  | 'requested'
  | 'accepted'
  | 'declined'
  | 'rescheduled'
  | 'completed'
  | 'no_response';

export interface Appointment {
  id: string;
  status: AppointmentStatus;
  proposed_slots: { slot: string; note?: string }[];
  scheduled_at: string | null;
  assigned_to: string | null;
  assigned_to_name: string | null;
  notes: string | null;
  last_activity_at: string;
  version: number;
  created_at: string;
  updated_at: string;
  event_id: string;
  block_name: string | null;
  task_id: string | null;
  event_date: string;
  event_status: string;
  contract_id: string;
  contract_number: string | null;
  contract_name: string | null;
  buyer_id: string | null;
  buyer_name: string | null;
  buyer_phone: string | null;
  buyer_email: string | null;
}

export const appointmentKeys = {
  all: ['appointments'] as const,
  list: (tenantId: string) => [...appointmentKeys.all, 'list', tenantId] as const
};

export const useAppointments = (options?: { enabled?: boolean }) => {
  const { currentTenant } = useAuth();

  return useQuery({
    queryKey: appointmentKeys.list(currentTenant?.id || ''),
    queryFn: async (): Promise<Appointment[]> => {
      if (!currentTenant?.id) {
        throw new Error('Missing tenant');
      }
      const response = await api.get(APPOINTMENT_ENDPOINTS.LIST);
      const result = response.data?.data || response.data;
      return Array.isArray(result) ? result : [];
    },
    enabled: !!currentTenant?.id && (options?.enabled !== false),
    staleTime: 30_000,
    refetchOnWindowFocus: false
  });
};

const extractErrorMessage = (error: any): string =>
  error?.response?.data?.error?.message ||
  error?.response?.data?.error ||
  error?.message ||
  'Something went wrong';

export interface UpdateAppointmentParams {
  appointmentId: string;
  status?: AppointmentStatus;
  scheduled_at?: string;
  notes?: string;
  version?: number;
}

export const useUpdateAppointment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ appointmentId, ...body }: UpdateAppointmentParams) => {
      const response = await api.patch(APPOINTMENT_ENDPOINTS.UPDATE(appointmentId), body);
      return response.data;
    },
    onSuccess: (data) => {
      const status = data?.data?.status;
      vaniToast.success(
        status ? `Appointment ${String(status).replace(/_/g, ' ')}` : 'Appointment updated',
        { duration: 2500 }
      );
      queryClient.invalidateQueries({ queryKey: appointmentKeys.all });
      // Accepting syncs the event's scheduled_date — refresh event views too
      queryClient.invalidateQueries({ queryKey: ['contract-events'] });
    },
    onError: (error: any) => {
      vaniToast.error(`Update failed: ${extractErrorMessage(error)}`, { duration: 5000 });
    }
  });
};

export const useCreateAppointment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { event_id: string; notes?: string }) => {
      const response = await api.post(APPOINTMENT_ENDPOINTS.CREATE, params);
      return response.data;
    },
    onSuccess: () => {
      vaniToast.success('Appointment requested', { duration: 2500 });
      queryClient.invalidateQueries({ queryKey: appointmentKeys.all });
    },
    onError: (error: any) => {
      vaniToast.error(`Request failed: ${extractErrorMessage(error)}`, { duration: 5000 });
    }
  });
};
