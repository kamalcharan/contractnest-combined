// ============================================================================
// VaNi desk queries — vani-trial-and-briefing batch
// Entitlement + trial + Briefing feed over /api/vani.
// Conventions per useAppointmentQueries.
// ============================================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { vaniToast } from '@/components/common/toast';

export const VANI_ENDPOINTS = {
  ENTITLEMENT: '/api/vani/entitlement',
  TRIAL_START: '/api/vani/trial/start',
  BRIEFING: '/api/vani/briefing',
  RULES: '/api/vani/rules',
  RULE: (ruleKey: string) => `/api/vani/rules/${ruleKey}`
};

export interface VaniEntitlement {
  entitled: boolean;
  mode: 'open' | 'subscription';
  has_subscription: boolean;
  status: string | null; // 'trial' | 'active' | 'expired' | ...
  trial_start_date: string | null;
  trial_ends: string | null;
  trial_active: boolean;
}

export interface VaniBriefingItemInvoice {
  id: string;
  invoice_number: string | null;
  total_amount?: number;
  balance?: number;
  due_date: string | null;
  days_overdue?: number;
  contract_id: string;
}

export interface VaniBriefingItemAppointment {
  id: string;
  contract_id: string;
  event_id: string;
  scheduled_at: string | null;
  assigned_to_name: string | null;
  created_at: string;
  block_name?: string | null;
  event_date?: string | null;
}

export interface VaniBriefingItemServiceEvent {
  id: string;
  block_name: string | null;
  scheduled_date: string;
  status: string;
  contract_id: string;
}

export interface VaniBriefingGroup<T> {
  count: number;
  items: T[];
}

export interface VaniFeedEntry {
  kind: 'reminder' | 'invoice_drafted' | 'appointment_requested';
  title: string;
  detail: string;
  channel?: string;
  status?: string;
  ref?: string | null;
  id?: string;
  contract_id?: string;
  at: string;
}

export interface VaniBriefing {
  success: boolean;
  header: {
    reminders_24h: number;
    reminders_7d: number;
    invoices_drafted_7d: number;
    appointments_requested_7d: number;
  };
  needs_you: {
    draft_invoices: VaniBriefingGroup<VaniBriefingItemInvoice>;
    overdue_invoices: VaniBriefingGroup<VaniBriefingItemInvoice>;
    appointments_requested: VaniBriefingGroup<VaniBriefingItemAppointment>;
    unticketed_service_events: VaniBriefingGroup<VaniBriefingItemServiceEvent>;
  };
  feed: VaniFeedEntry[];
  generated_at: string;
}

export const vaniDeskKeys = {
  all: ['vani-desk'] as const,
  entitlement: (tenantId: string) => [...vaniDeskKeys.all, 'entitlement', tenantId] as const,
  briefing: (tenantId: string) => [...vaniDeskKeys.all, 'briefing', tenantId] as const
};

const extractErrorMessage = (error: any): string =>
  error?.response?.data?.error?.message ||
  error?.response?.data?.error ||
  error?.message ||
  'Something went wrong';

export const useVaniEntitlement = (options?: { enabled?: boolean }) => {
  const { currentTenant } = useAuth();

  return useQuery({
    queryKey: vaniDeskKeys.entitlement(currentTenant?.id || ''),
    queryFn: async (): Promise<VaniEntitlement> => {
      if (!currentTenant?.id) {
        throw new Error('Missing tenant');
      }
      const response = await api.get(VANI_ENDPOINTS.ENTITLEMENT);
      return response.data?.data || response.data;
    },
    enabled: !!currentTenant?.id && (options?.enabled !== false),
    staleTime: 60_000,
    refetchOnWindowFocus: false
  });
};

export const useStartVaniTrial = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await api.post(VANI_ENDPOINTS.TRIAL_START, {});
      return response.data?.data || response.data;
    },
    onSuccess: (data) => {
      if (data?.started_now) {
        vaniToast.success('Your 1-week VaNi trial has started 🎉', { duration: 4000 });
      } else if (data?.trial_active) {
        vaniToast.info('Your VaNi trial is already running', { duration: 3000 });
      } else {
        vaniToast.warning('Your VaNi trial has already been used', { duration: 4000 });
      }
      queryClient.invalidateQueries({ queryKey: vaniDeskKeys.all });
    },
    onError: (error: any) => {
      vaniToast.error(`Could not start the trial: ${extractErrorMessage(error)}`, {
        duration: 5000
      });
    }
  });
};

// ── Automation rules (Settings → Automation Rules) ─────────────────────────
// Read is free for every tenant; editing needs VaNi entitlement (403 otherwise).

export interface VaniRule {
  rule_key: string;
  name: string;
  description: string;
  domain: 'services' | 'finance' | string;
  config: Record<string, number>;
  is_enabled: boolean;
  defaults: Record<string, number>;
  constraints: Record<string, { min?: number; max?: number }>;
  version: number;
  is_customized: boolean;
}

export const useVaniRules = (options?: { enabled?: boolean }) => {
  const { currentTenant } = useAuth();

  return useQuery({
    queryKey: [...vaniDeskKeys.all, 'rules', currentTenant?.id || ''],
    queryFn: async (): Promise<VaniRule[]> => {
      if (!currentTenant?.id) {
        throw new Error('Missing tenant');
      }
      const response = await api.get(VANI_ENDPOINTS.RULES);
      const data = response.data?.data || response.data;
      return Array.isArray(data?.rules) ? data.rules : [];
    },
    enabled: !!currentTenant?.id && (options?.enabled !== false),
    staleTime: 30_000,
    refetchOnWindowFocus: false
  });
};

export interface UpdateVaniRuleParams {
  ruleKey: string;
  config?: Record<string, number>;
  is_enabled?: boolean;
  expected_version?: number;
}

export const useUpdateVaniRule = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ ruleKey, ...body }: UpdateVaniRuleParams) => {
      const response = await api.put(VANI_ENDPOINTS.RULE(ruleKey), body);
      return response.data?.data || response.data;
    },
    onSuccess: (data) => {
      vaniToast.success(
        data?.rule_key ? `Rule updated — ${String(data.rule_key).replace(/_/g, ' ')}` : 'Rule updated',
        { duration: 2500 }
      );
      queryClient.invalidateQueries({ queryKey: vaniDeskKeys.all });
    },
    onError: (error: any) => {
      const status = error?.response?.status;
      if (status === 403) {
        vaniToast.warning('Changing rules needs a VaNi trial or subscription', { duration: 4000 });
      } else if (status === 409) {
        vaniToast.error('This rule was changed elsewhere — reloading', { duration: 4000 });
      } else {
        vaniToast.error(`Could not update the rule: ${extractErrorMessage(error)}`, { duration: 5000 });
      }
      queryClient.invalidateQueries({ queryKey: vaniDeskKeys.all });
    }
  });
};

export const useVaniBriefing = (options?: { enabled?: boolean; days?: number }) => {
  const { currentTenant } = useAuth();
  const days = options?.days ?? 7;

  return useQuery({
    queryKey: [...vaniDeskKeys.briefing(currentTenant?.id || ''), days],
    queryFn: async (): Promise<VaniBriefing> => {
      if (!currentTenant?.id) {
        throw new Error('Missing tenant');
      }
      const response = await api.get(VANI_ENDPOINTS.BRIEFING, { params: { days } });
      return response.data?.data || response.data;
    },
    enabled: !!currentTenant?.id && (options?.enabled !== false),
    staleTime: 30_000,
    refetchOnWindowFocus: false
  });
};
