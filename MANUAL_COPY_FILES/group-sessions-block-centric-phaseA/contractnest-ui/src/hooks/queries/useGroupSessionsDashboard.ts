// ============================================================================
// Group Sessions dashboard queries — chair-side read model (generic per tenant).
// Overview → Occurrences → Roster → Member, over /api/group-sessions.
// Conventions per useVaniDeskQueries. tenant_id / is_live are injected by the
// api request interceptor as headers — never passed here.
// ============================================================================

import { useQuery } from '@tanstack/react-query';
import api from '@/services/api';
import { API_ENDPOINTS } from '@/services/serviceURLs';
import { useAuth } from '@/context/AuthContext';

// ── Shapes returned by the gs_dash_* RPCs ──────────────────────────────────

export interface GsSessionRow {
  block_id: string;
  name: string;
  occurrences_total: number;
  occurrences_done: number;
  next_occurrence: string | null;
  roster_size: number;
  qr_ready: boolean;
  attendance_pct: number | null;
}

export interface GsSessionsResponse {
  sessions: GsSessionRow[];
  roster_size: number;
}

export interface GsOccurrenceRow {
  event_id: string;
  date: string;
  seq: number | null;
  total: number | null;
  status: 'past' | 'upcoming';
  present: number;
}

export interface GsRosterRow {
  contact_id: string;
  name: string | null;
  membership_contract_id: string | null;
  contract_name: string | null;
  start_date: string | null;
  end_date: string | null;
  attended: number;
  dues_pending: boolean;
}

export interface GsMemberAttendanceRow {
  date: string | null;
  status: string | null;
}

export interface GsMemberBillingRow {
  label: string | null;
  date: string | null;
  amount: number | null;
  currency: string | null;
  status: string | null;
}

export interface GsMemberResponse {
  membership_contract_id: string | null;
  attendance: GsMemberAttendanceRow[];
  billing: GsMemberBillingRow[];
}

// ── Query keys ─────────────────────────────────────────────────────────────

export const gsDashboardKeys = {
  all: ['group-sessions-dashboard'] as const,
  sessions: (tenantId: string, isLive: boolean) =>
    [...gsDashboardKeys.all, 'sessions', tenantId, isLive] as const,
  occurrences: (tenantId: string, blockId: string) =>
    [...gsDashboardKeys.all, 'occurrences', tenantId, blockId] as const,
  roster: (tenantId: string, blockId: string) =>
    [...gsDashboardKeys.all, 'roster', tenantId, blockId] as const,
  member: (tenantId: string, memberId: string) =>
    [...gsDashboardKeys.all, 'member', tenantId, memberId] as const,
};

const unwrap = (response: any) => response?.data?.data ?? response?.data;

// ── Hooks ────────────────────────────────────────────────────────────────

/** Overview: list group sessions + tenant roster size. */
export const useGroupSessions = (options?: { enabled?: boolean }) => {
  const { currentTenant, isLive } = useAuth();

  return useQuery({
    queryKey: gsDashboardKeys.sessions(currentTenant?.id || '', !!isLive),
    queryFn: async (): Promise<GsSessionsResponse> => {
      if (!currentTenant?.id) throw new Error('Missing tenant');
      const data = unwrap(await api.get(API_ENDPOINTS.GROUP_SESSIONS.SESSIONS));
      return {
        sessions: Array.isArray(data?.sessions) ? data.sessions : [],
        roster_size: data?.roster_size ?? 0,
      };
    },
    enabled: !!currentTenant?.id && options?.enabled !== false,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });
};

/** Occurrences (shared schedule) for one group-session block. */
export const useGroupSessionOccurrences = (
  blockId: string | null | undefined,
  options?: { enabled?: boolean }
) => {
  const { currentTenant } = useAuth();

  return useQuery({
    queryKey: gsDashboardKeys.occurrences(currentTenant?.id || '', blockId || ''),
    queryFn: async (): Promise<GsOccurrenceRow[]> => {
      if (!currentTenant?.id) throw new Error('Missing tenant');
      if (!blockId) throw new Error('Missing block');
      const data = unwrap(await api.get(API_ENDPOINTS.GROUP_SESSIONS.OCCURRENCES(blockId)));
      return Array.isArray(data?.occurrences) ? data.occurrences : [];
    },
    enabled: !!currentTenant?.id && !!blockId && options?.enabled !== false,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });
};

/** Roster (distinct members of active contracts carrying the block) + dues. */
export const useGroupSessionRoster = (
  blockId: string | null | undefined,
  options?: { enabled?: boolean }
) => {
  const { currentTenant } = useAuth();

  return useQuery({
    queryKey: gsDashboardKeys.roster(currentTenant?.id || '', blockId || ''),
    queryFn: async (): Promise<GsRosterRow[]> => {
      if (!currentTenant?.id) throw new Error('Missing tenant');
      if (!blockId) throw new Error('Missing block');
      const data = unwrap(await api.get(API_ENDPOINTS.GROUP_SESSIONS.ROSTER(blockId)));
      return Array.isArray(data?.roster) ? data.roster : [];
    },
    enabled: !!currentTenant?.id && !!blockId && options?.enabled !== false,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });
};

/** Member drill-down: attendance history + billing/dues. */
export const useGroupSessionMember = (
  memberId: string | null | undefined,
  options?: { enabled?: boolean }
) => {
  const { currentTenant } = useAuth();

  return useQuery({
    queryKey: gsDashboardKeys.member(currentTenant?.id || '', memberId || ''),
    queryFn: async (): Promise<GsMemberResponse> => {
      if (!currentTenant?.id) throw new Error('Missing tenant');
      if (!memberId) throw new Error('Missing member');
      const data = unwrap(await api.get(API_ENDPOINTS.GROUP_SESSIONS.MEMBER(memberId)));
      return {
        membership_contract_id: data?.membership_contract_id ?? null,
        attendance: Array.isArray(data?.attendance) ? data.attendance : [],
        billing: Array.isArray(data?.billing) ? data.billing : [],
      };
    },
    enabled: !!currentTenant?.id && !!memberId && options?.enabled !== false,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });
};
