// ============================================================================
// Group Sessions dashboard queries — chair-side read model (generic per tenant).
// Overview → Occurrences → Roster → Member, over /api/group-sessions.
// Conventions per useVaniDeskQueries. tenant_id / is_live are injected by the
// api request interceptor as headers — never passed here.
// ============================================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
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

export type GsOccurrenceStatus = 'scheduled' | 'held' | 'skipped' | 'cancelled';

export interface GsOccurrenceRow {
  event_id: string;
  date: string;
  seq: number | null;
  total: number | null;
  status: GsOccurrenceStatus;
  is_past: boolean;
  note: string | null;
  present: number;
  /** Chair assigned to this occurrence (also backs a real appointment — see gs_schedule_assign) */
  assigned_to: string | null;
  assigned_to_name: string | null;
}

export interface GsRosterRow {
  contact_id: string;
  name: string | null;
  membership_contract_id: string | null;
  contract_name: string | null;
  start_date: string | null;
  end_date: string | null;
  /** Scoped to THIS member's own contract window (join date .. today/end date),
   * not the block's total — someone who joined late has a smaller denominator. */
  overall: number;
  attended: number;
  missed: number;
  substituted: number;
  /** From this member's OWN signed contract snapshot, not the live catalog
   * block — a later policy change never retroactively applies to them. */
  max_no_shows: number | null;
  max_substitutes: number | null;
  over_no_show_cap: boolean;
  over_substitute_cap: boolean;
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

// ── Schedule mutations (chair edits the shared per-block schedule) ───────────

const gsErr = (e: any): string =>
  e?.response?.data?.error?.message || e?.response?.data?.message || e?.message || 'Something went wrong';

/** gs_schedule_move/status/assign return {ok:false, reason} on refusal (e.g. a
 * held/completed occurrence is frozen) instead of throwing — surface that as a
 * real mutation error so the UI doesn't show a false "success" toast. */
const gsThrowIfRefused = (result: any) => {
  if (result?.ok === false) {
    throw new Error(result.reason === 'occurrence_completed'
      ? 'This session has already been held and is locked — it can no longer be moved or reassigned.'
      : result.reason || 'Request was refused');
  }
  return result;
};

/** Generate the shared schedule for a block from its cadence config. */
export const useGenerateSchedule = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { blockId: string; start?: string; end?: string }) => {
      const body: Record<string, unknown> = {};
      if (vars.start) body.start = vars.start;
      if (vars.end) body.end = vars.end;
      return unwrap(await api.post(API_ENDPOINTS.GROUP_SESSIONS.GENERATE(vars.blockId), body));
    },
    onSuccess: () => {
      toast.success('Schedule generated');
      queryClient.invalidateQueries({ queryKey: gsDashboardKeys.all });
    },
    onError: (e) => toast.error(`Could not generate schedule: ${gsErr(e)}`),
  });
};

/** Move one occurrence to a new date (holiday reschedule). */
export const useMoveOccurrence = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { id: string; date: string; note?: string }) =>
      gsThrowIfRefused(unwrap(await api.post(API_ENDPOINTS.GROUP_SESSIONS.OCC_MOVE(vars.id), { date: vars.date, note: vars.note }))),
    onSuccess: () => {
      toast.success('Date updated');
      queryClient.invalidateQueries({ queryKey: gsDashboardKeys.all });
    },
    onError: (e) => toast.error(`Could not move the date: ${gsErr(e)}`),
  });
};

/** Change one occurrence's status (skipped / cancelled / scheduled / held). */
export const useSetOccurrenceStatus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { id: string; status: GsOccurrenceStatus; note?: string }) =>
      gsThrowIfRefused(unwrap(await api.post(API_ENDPOINTS.GROUP_SESSIONS.OCC_STATUS(vars.id), { status: vars.status, note: vars.note }))),
    onSuccess: (_d, vars) => {
      toast.success(`Marked ${vars.status}`);
      queryClient.invalidateQueries({ queryKey: gsDashboardKeys.all });
    },
    onError: (e) => toast.error(`Could not update: ${gsErr(e)}`),
  });
};

/** Assign (or clear, with contactId=undefined) one occurrence's chair.
 * Also creates/updates a real 'accepted' appointment for that person —
 * see gs_schedule_assign (bbb-foundation/031). */
export const useAssignChair = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { id: string; contactId: string | undefined; contactName: string | undefined }) =>
      gsThrowIfRefused(unwrap(await api.post(API_ENDPOINTS.GROUP_SESSIONS.OCC_ASSIGN(vars.id), {
        assigned_to: vars.contactId ?? null, assigned_to_name: vars.contactName ?? null,
      }))),
    onSuccess: (_d, vars) => {
      toast.success(vars.contactId ? 'Chair assigned' : 'Chair removed');
      queryClient.invalidateQueries({ queryKey: gsDashboardKeys.all });
    },
    onError: (e) => toast.error(`Could not update the chair: ${gsErr(e)}`),
  });
};

/** Set the default chair for every future occurrence of a block in one call
 * ("assign once, applies going forward"; a later single-occurrence
 * useAssignChair call still overrides just that date). */
export const useAssignChairDefault = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { blockId: string; contactId: string; contactName: string | undefined }) =>
      unwrap(await api.post(API_ENDPOINTS.GROUP_SESSIONS.OCC_ASSIGN_DEFAULT(vars.blockId), {
        assigned_to: vars.contactId, assigned_to_name: vars.contactName ?? null,
      })),
    onSuccess: (d) => {
      toast.success(`Set as default chair for ${d?.assigned_count ?? 0} upcoming sessions`);
      queryClient.invalidateQueries({ queryKey: gsDashboardKeys.all });
    },
    onError: (e) => toast.error(`Could not set the default chair: ${gsErr(e)}`),
  });
};

// ── Occurrence attendance (the session drill-down) ──────────────────────────

export interface GsOccAttendanceMember {
  contact_id: string;
  name: string | null;
  membership_contract_id: string | null;
  present: boolean;
  dues_pending: boolean;
}
export interface GsOccurrenceAttendance {
  ok: boolean;
  occurrence: { event_id: string; date: string; seq: number | null; status: GsOccurrenceStatus; block_id: string } | null;
  present_count: number;
  roster: GsOccAttendanceMember[];
}

export const useOccurrenceAttendance = (occurrenceId: string | null | undefined, options?: { enabled?: boolean }) => {
  const { currentTenant } = useAuth();
  return useQuery({
    queryKey: [...gsDashboardKeys.all, 'occ-attendance', currentTenant?.id || '', occurrenceId || ''],
    queryFn: async (): Promise<GsOccurrenceAttendance> => {
      if (!currentTenant?.id || !occurrenceId) throw new Error('Missing');
      return unwrap(await api.get(API_ENDPOINTS.GROUP_SESSIONS.OCC_ATTENDANCE(occurrenceId)));
    },
    enabled: !!currentTenant?.id && !!occurrenceId && options?.enabled !== false,
    staleTime: 10_000,
    refetchOnWindowFocus: false,
  });
};

/** Chair marks a member present/absent for an occurrence. */
export const useMarkAttendance = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { occurrenceId: string; memberId: string; present: boolean; memberName?: string }) =>
      unwrap(await api.post(API_ENDPOINTS.GROUP_SESSIONS.OCC_MARK(vars.occurrenceId), {
        member_id: vars.memberId, present: vars.present, member_name: vars.memberName,
      })),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: gsDashboardKeys.all }),
    onError: (e) => toast.error(`Could not update attendance: ${gsErr(e)}`),
  });
};

// ── Member within a block (member profile drill-down) ───────────────────────

export interface GsMemberBlockAtt { date: string; seq: number | null; is_past: boolean; present: boolean; is_substitute: boolean }
export interface GsMemberBlock {
  ok: boolean;
  name: string | null;
  membership_contract_id: string | null;
  attended: number;
  /** occurrences_done kept for back-compat; now member-window-scoped (was
   * block-wide before) — same value as `overall`. */
  occurrences_done: number;
  overall: number;
  missed: number;
  substituted: number;
  max_no_shows: number | null;
  max_substitutes: number | null;
  over_no_show_cap: boolean;
  over_substitute_cap: boolean;
  last_seen: string | null;
  dues_pending: boolean;
  attendance: GsMemberBlockAtt[];
  billing: GsMemberBillingRow[];
}

export const useMemberBlock = (
  memberId: string | null | undefined,
  blockId: string | null | undefined,
  options?: { enabled?: boolean }
) => {
  const { currentTenant } = useAuth();
  return useQuery({
    queryKey: [...gsDashboardKeys.all, 'member-block', currentTenant?.id || '', memberId || '', blockId || ''],
    queryFn: async (): Promise<GsMemberBlock> => {
      if (!currentTenant?.id || !memberId || !blockId) throw new Error('Missing');
      return unwrap(await api.get(API_ENDPOINTS.GROUP_SESSIONS.MEMBER_BLOCK(memberId, blockId)));
    },
    enabled: !!currentTenant?.id && !!memberId && !!blockId && options?.enabled !== false,
    staleTime: 15_000,
    refetchOnWindowFocus: false,
  });
};

// ── Chair dues confirmation (members' declared UPI payments at check-in) ─────

export interface GsDeclaration {
  id: string;
  member_contact_id: string | null;
  member_name: string | null;
  billing_event_id: string | null;
  label: string | null;
  due_date: string | null;
  amount: number | null;
  currency: string | null;
  upi_reference: string | null;
  created_at: string | null;
}

/** Pending payment declarations awaiting chair confirmation (tenant-wide). */
export const usePendingDeclarations = (options?: { enabled?: boolean }) => {
  const { currentTenant } = useAuth();
  return useQuery({
    queryKey: [...gsDashboardKeys.all, 'declarations', currentTenant?.id || ''],
    queryFn: async (): Promise<GsDeclaration[]> => {
      if (!currentTenant?.id) throw new Error('Missing tenant');
      const data = unwrap(await api.get(API_ENDPOINTS.SESSION_CHECKIN.DECLARATIONS));
      return Array.isArray(data?.declarations) ? data.declarations : [];
    },
    enabled: !!currentTenant?.id && options?.enabled !== false,
    staleTime: 15_000,
    refetchOnWindowFocus: false,
  });
};

/** Confirm (paid) or reject a declared payment. */
export const useConfirmDeclaration = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { id: string; confirm: boolean }) =>
      unwrap(await api.post(API_ENDPOINTS.SESSION_CHECKIN.CONFIRM_DECLARATION(vars.id), { confirm: vars.confirm })),
    onSuccess: (_d, vars) => {
      toast.success(vars.confirm ? 'Payment confirmed — marked paid' : 'Payment rejected');
      queryClient.invalidateQueries({ queryKey: gsDashboardKeys.all });
    },
    onError: (e) => toast.error(`Could not update the payment: ${gsErr(e)}`),
  });
};

/** Mint/return the block's static check-in (QR) token. */
export const useEnsureBlockToken = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { blockId: string }): Promise<{ token: string; block_id: string }> =>
      unwrap(await api.post(API_ENDPOINTS.GROUP_SESSIONS.TOKEN(vars.blockId), {})),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: gsDashboardKeys.all }),
    onError: (e) => toast.error(`Could not create the check-in link: ${gsErr(e)}`),
  });
};

/** Add an ad-hoc occurrence. */
export const useAddOccurrence = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { blockId: string; date: string; note?: string }) =>
      unwrap(await api.post(API_ENDPOINTS.GROUP_SESSIONS.OCC_ADD(vars.blockId), { date: vars.date, note: vars.note })),
    onSuccess: () => {
      toast.success('Occurrence added');
      queryClient.invalidateQueries({ queryKey: gsDashboardKeys.all });
    },
    onError: (e) => toast.error(`Could not add occurrence: ${gsErr(e)}`),
  });
};
