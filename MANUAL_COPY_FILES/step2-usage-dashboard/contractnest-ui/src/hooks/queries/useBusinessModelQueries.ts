// src/hooks/queries/useBusinessModelQueries.ts
// Business Model Phase 4 - Step 2: Usage Summary and Credit Management Hooks

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import api from '@/services/api';
import { API_ENDPOINTS } from '@/services/serviceURLs';

// =================================================================
// TYPES
// =================================================================

export interface UsageMetric {
  used: number;
  limit?: number | null;
  included?: number;
  percentage?: number | null;
  unlimited?: boolean;
  extra?: number;
  overage_mb?: number;
  used_mb?: number;
  included_mb?: number;
}

export interface NotificationCredits {
  credits_remaining: number;
  low_threshold: number;
  is_low: boolean;
}

export interface UsagePeriod {
  start: string;
  end: string;
  days_remaining: number;
}

export interface UsageMetrics {
  contracts: UsageMetric;
  users: UsageMetric;
  storage: UsageMetric;
  notifications: NotificationCredits;
}

export interface UsageSummaryResponse {
  success: boolean;
  tenant_id: string;
  subscription_id?: string;
  product_code?: string;
  status?: string;
  period?: UsagePeriod;
  metrics?: UsageMetrics;
  raw_usage?: Record<string, number>;
  generated_at?: string;
  error?: string;
}

export interface TopupPack {
  id: string;
  product_code: string;
  credit_type: string;
  name: string;
  quantity: number;
  price: number;
  currency: string;
  expiry_days?: number | null;
  is_active: boolean;
  sort_order: number;
}

export interface TopupPacksResponse {
  success: boolean;
  packs: TopupPack[];
  product_code?: string;
  credit_type?: string;
}

export interface CreditBalance {
  credit_type: string;
  channel?: string;
  balance: number;
  expires_at?: string | null;
}

export interface CreditBalanceResponse {
  success: boolean;
  tenant_id: string;
  balances: CreditBalance[];
  total_notification_credits: number;
}

// =================================================================
// QUERY KEYS
// =================================================================

export const businessModelKeys = {
  all: ['business-model'] as const,
  usage: () => [...businessModelKeys.all, 'usage'] as const,
  usageSummary: (tenantId: string) => [...businessModelKeys.usage(), 'summary', tenantId] as const,
  invoiceEstimate: (tenantId: string) => [...businessModelKeys.all, 'invoice-estimate', tenantId] as const,
  credits: () => [...businessModelKeys.all, 'credits'] as const,
  creditBalance: (tenantId: string) => [...businessModelKeys.credits(), 'balance', tenantId] as const,
  topupPacks: (productCode?: string, creditType?: string) =>
    [...businessModelKeys.credits(), 'topup-packs', { productCode, creditType }] as const,
};

// =================================================================
// USAGE SUMMARY HOOK
// =================================================================

/**
 * Fetch usage summary for the current tenant
 * Returns contracts, users, storage, and notification credit metrics
 */
export const useUsageSummary = (periodStart?: string, periodEnd?: string) => {
  const { currentTenant } = useAuth();

  return useQuery({
    queryKey: businessModelKeys.usageSummary(currentTenant?.id || ''),
    queryFn: async (): Promise<UsageSummaryResponse> => {
      if (!currentTenant?.id) {
        throw new Error('Tenant ID is required');
      }

      const params = new URLSearchParams();
      if (periodStart) params.append('period_start', periodStart);
      if (periodEnd) params.append('period_end', periodEnd);

      const url = params.toString()
        ? `${API_ENDPOINTS.BUSINESS_MODEL.USAGE_SUMMARY}?${params.toString()}`
        : API_ENDPOINTS.BUSINESS_MODEL.USAGE_SUMMARY;

      const response = await api.get(url);
      return response.data;
    },
    enabled: !!currentTenant?.id,
    staleTime: 2 * 60 * 1000, // 2 minutes - usage can change frequently
    gcTime: 10 * 60 * 1000, // 10 minutes cache
    retry: 2,
  });
};

// =================================================================
// INVOICE ESTIMATE HOOK
// =================================================================

/**
 * Fetch invoice estimate for the current billing period
 */
export const useInvoiceEstimate = () => {
  const { currentTenant } = useAuth();

  return useQuery({
    queryKey: businessModelKeys.invoiceEstimate(currentTenant?.id || ''),
    queryFn: async () => {
      if (!currentTenant?.id) {
        throw new Error('Tenant ID is required');
      }

      const response = await api.get(API_ENDPOINTS.BUSINESS_MODEL.INVOICE_ESTIMATE);
      return response.data;
    },
    enabled: !!currentTenant?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000,
    retry: 2,
  });
};

// =================================================================
// CREDIT BALANCE HOOK
// =================================================================

/**
 * Fetch credit balance for the current tenant
 */
export const useCreditBalance = () => {
  const { currentTenant } = useAuth();

  return useQuery({
    queryKey: businessModelKeys.creditBalance(currentTenant?.id || ''),
    queryFn: async (): Promise<CreditBalanceResponse> => {
      if (!currentTenant?.id) {
        throw new Error('Tenant ID is required');
      }

      const response = await api.get(API_ENDPOINTS.BUSINESS_MODEL.CREDIT_BALANCE);
      return response.data;
    },
    enabled: !!currentTenant?.id,
    staleTime: 1 * 60 * 1000, // 1 minute - credits can change often
    gcTime: 5 * 60 * 1000,
    retry: 2,
  });
};

// =================================================================
// TOPUP PACKS HOOK
// =================================================================

/**
 * Fetch available topup packs
 * @param productCode - Optional product code filter (defaults to current product from header)
 * @param creditType - Optional credit type filter (e.g., 'notification')
 */
export const useTopupPacks = (productCode?: string, creditType?: string) => {
  return useQuery({
    queryKey: businessModelKeys.topupPacks(productCode, creditType),
    queryFn: async (): Promise<TopupPacksResponse> => {
      const params = new URLSearchParams();
      if (productCode) params.append('product_code', productCode);
      if (creditType) params.append('credit_type', creditType);

      const url = params.toString()
        ? `${API_ENDPOINTS.BUSINESS_MODEL.TOPUP_PACKS}?${params.toString()}`
        : API_ENDPOINTS.BUSINESS_MODEL.TOPUP_PACKS;

      const response = await api.get(url);
      return response.data;
    },
    staleTime: 10 * 60 * 1000, // 10 minutes - packs don't change often
    gcTime: 30 * 60 * 1000,
    retry: 2,
  });
};

// =================================================================
// UTILITY FUNCTIONS
// =================================================================

/**
 * Calculate usage percentage with color coding
 */
export const getUsageStatus = (percentage: number | null | undefined): {
  color: 'green' | 'yellow' | 'red';
  label: string;
} => {
  if (percentage === null || percentage === undefined) {
    return { color: 'green', label: 'Unlimited' };
  }

  if (percentage >= 90) {
    return { color: 'red', label: 'Critical' };
  }

  if (percentage >= 75) {
    return { color: 'yellow', label: 'Warning' };
  }

  return { color: 'green', label: 'Good' };
};

/**
 * Format storage size
 */
export const formatStorageSize = (mb: number): string => {
  if (mb >= 1024) {
    return `${(mb / 1024).toFixed(1)} GB`;
  }
  return `${mb} MB`;
};

export default {
  useUsageSummary,
  useInvoiceEstimate,
  useCreditBalance,
  useTopupPacks,
  getUsageStatus,
  formatStorageSize,
};
