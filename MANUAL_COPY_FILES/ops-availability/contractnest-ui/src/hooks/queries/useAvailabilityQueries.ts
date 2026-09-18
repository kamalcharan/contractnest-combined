// ============================================================================
// useAvailabilityQueries — who works when (migration jtd-nucleus/024)
// ============================================================================
// A person's working hours and weekly off (NULL = the organisation's cadence
// settings) and dated leave. Read on the user's page under Settings → Users,
// and by the Ops board through the clash pills (a schedule/confirm/assign
// re-reads the board, so every mutation here also invalidates it).
//   GET    /api/availability/users/:userId
//   PUT    /api/availability/users/:userId        { work_start?, work_end?, weekly_off? }  all null = inherit
//   POST   /api/availability/users/:userId/leave  { date, part, label? }
//   DELETE /api/availability/users/:userId/leave?date=
//   GET    /api/availability/team?days=60
// ============================================================================

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { API_ENDPOINTS } from '@/services/serviceURLs';
import { collectionsKeys } from '@/hooks/queries/useCollectionsQueries';

export type LeavePart = 'full' | 'am' | 'pm';
export interface LeaveDay { date: string; part: LeavePart; label: string | null }
export interface UserAvailability {
  success: boolean;
  user_id: string;
  /** the hours that apply — the person's own, else the organisation's */
  work_start: string;   // HH:MM
  work_end: string;
  weekly_off: number[]; // 0=Sun … 6=Sat
  source: 'user' | 'tenant';
  /** the person's own overrides, if any */
  own: { work_start?: string; work_end?: string; weekly_off?: number[] };
  tenant: { work_start: string; work_end: string; weekly_off: number[] };
  /** from 30 days back, onwards */
  leave: LeaveDay[];
}
export interface TeamAvailability {
  success: boolean;
  tenant: { work_start: string; work_end: string; weekly_off: number[]; default_visit_minutes: number } | null;
  holidays: Array<{ date: string; label: string | null }>;
  people: Array<{ user_id: string; name: string | null; work_start: string; work_end: string; weekly_off: number[]; source: 'user' | 'tenant'; leave: LeaveDay[] }>;
}

export const availabilityKeys = {
  all: ['availability'] as const,
  user: (tenantId: string, userId: string) => [...availabilityKeys.all, 'user', tenantId, userId] as const,
  team: (tenantId: string, days: number) => [...availabilityKeys.all, 'team', tenantId, days] as const,
};

const unwrap = <T,>(response: any): T => (response.data?.data ?? response.data) as T;
/** The API carries the RPC's machine-readable reason as the error code; this turns it into copy. */
export const availabilityError = (error: any, fallback: string): string => {
  const code = error?.response?.data?.error?.code;
  const msg = error?.response?.data?.error?.message;
  const copy: Record<string, string> = {
    user_not_in_tenant: 'That person is not in this business.',
    bad_hours: 'The working day must end after it starts.',
    bad_weekday: 'Pick weekdays only.',
    bad_part: 'Pick a full day, a morning or an afternoon.',
    date_required: 'Pick a date.',
  };
  return (code && copy[code]) || msg || error?.message || fallback;
};

export const useUserAvailability = (userId: string | undefined, options?: { enabled?: boolean }) => {
  const { currentTenant } = useAuth();
  return useQuery({
    queryKey: availabilityKeys.user(currentTenant?.id || '', userId || ''),
    queryFn: async (): Promise<UserAvailability> => {
      if (!currentTenant?.id || !userId) throw new Error('Missing tenant or user');
      const response = await api.get(API_ENDPOINTS.AVAILABILITY.USER(userId));
      return unwrap<UserAvailability>(response);
    },
    enabled: !!currentTenant?.id && !!userId && options?.enabled !== false,
    staleTime: 30 * 1000,
  });
};

export const useTeamAvailability = (days = 60, options?: { enabled?: boolean }) => {
  const { currentTenant } = useAuth();
  return useQuery({
    queryKey: availabilityKeys.team(currentTenant?.id || '', days),
    queryFn: async (): Promise<TeamAvailability> => {
      if (!currentTenant?.id) throw new Error('Missing tenant');
      const response = await api.get(API_ENDPOINTS.AVAILABILITY.TEAM, { params: { days } });
      return unwrap<TeamAvailability>(response);
    },
    enabled: !!currentTenant?.id && options?.enabled !== false,
    staleTime: 60 * 1000,
  });
};

/** After any change the person's card, the team, and the Ops board (clash pills) re-read. */
const useInvalidate = () => {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: availabilityKeys.all });
    queryClient.invalidateQueries({ queryKey: collectionsKeys.all });
  };
};

/** Hours + weekly off; pass all three as null to go back to the organisation's settings. */
export const useSetUserAvailability = () => {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (v: { userId: string; workStart: string | null; workEnd: string | null; weeklyOff: number[] | null }): Promise<UserAvailability> => {
      const response = await api.put(API_ENDPOINTS.AVAILABILITY.USER(v.userId), { work_start: v.workStart, work_end: v.workEnd, weekly_off: v.weeklyOff });
      return unwrap<UserAvailability>(response);
    },
    onSettled: () => invalidate(),
  });
};

export const useAddUserLeave = () => {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (v: { userId: string; date: string; part: LeavePart; label?: string | null }): Promise<UserAvailability> => {
      const response = await api.post(API_ENDPOINTS.AVAILABILITY.LEAVE(v.userId), { date: v.date, part: v.part, label: v.label ?? null });
      return unwrap<UserAvailability>(response);
    },
    onSettled: () => invalidate(),
  });
};

export const useRemoveUserLeave = () => {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (v: { userId: string; date: string }): Promise<UserAvailability> => {
      const response = await api.delete(API_ENDPOINTS.AVAILABILITY.LEAVE(v.userId), { params: { date: v.date } });
      return unwrap<UserAvailability>(response);
    },
    onSettled: () => invalidate(),
  });
};
