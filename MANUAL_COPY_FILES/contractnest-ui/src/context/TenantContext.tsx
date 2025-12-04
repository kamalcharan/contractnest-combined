// src/context/TenantContext.tsx
// TenantContext - Provides tenant business state, channel access, and usage tracking
// NOTE: This is a DUMMY implementation. Replace with real API calls when business model is ready.

import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

// Channel types supported
export type ChannelType = 'email' | 'sms' | 'whatsapp';

// Subscription tiers
export type SubscriptionTier = 'free' | 'starter' | 'professional' | 'enterprise';

// Subscription status
export type SubscriptionStatus = 'active' | 'trial' | 'expired' | 'cancelled' | 'suspended';

// Channel usage tracking
export interface ChannelUsage {
  used: number;
  limit: number;
  topup_balance: number;
  last_reset: Date;
  is_enabled: boolean;
}

// Channel configuration per tenant
export interface ChannelConfig {
  channel: ChannelType;
  is_active: boolean;
  provider: string; // e.g., 'msg91', 'twilio', 'meta'
  config: Record<string, any>; // Provider-specific config
  templates_enabled: boolean;
}

// Tenant business snapshot
export interface TenantSnapshot {
  tenant_id: string;
  tenant_name: string;
  workspace_code: string;

  // Business metrics
  days_active: number;
  created_at: Date;

  // Entity counts
  contracts_count: number;
  users_count: number;
  active_users_count: number;
  documents_count: number;
  storage_used_mb: number;
  storage_limit_mb: number;

  // Channel status
  active_channels: ChannelType[];

  // Subscription info
  subscription: {
    plan_id: string;
    plan_name: string;
    tier: SubscriptionTier;
    status: SubscriptionStatus;
    billing_cycle: 'monthly' | 'annual';
    current_period_start: Date;
    current_period_end: Date;
    auto_renew: boolean;
  };

  // Feature flags
  features: Record<string, boolean>;
}

// Usage metrics across all channels
export interface UsageMetrics {
  email: ChannelUsage;
  sms: ChannelUsage;
  whatsapp: ChannelUsage;
  api_calls: {
    used: number;
    limit: number;
    last_reset: Date;
  };
}

// TenantContext interface
export interface TenantContextType {
  // State
  snapshot: TenantSnapshot | null;
  usage: UsageMetrics | null;
  channelConfigs: ChannelConfig[];
  isLoading: boolean;
  error: string | null;

  // Feature & quota checks
  hasFeature: (feature: string) => boolean;
  hasQuota: (channel: ChannelType, count?: number) => boolean;
  getChannelConfig: (channel: ChannelType) => ChannelConfig | null;
  isChannelActive: (channel: ChannelType) => boolean;

  // Usage operations
  deductUsage: (channel: ChannelType, count?: number) => boolean;
  getRemainingQuota: (channel: ChannelType) => number;
  getUsagePercentage: (channel: ChannelType) => number;

  // Refresh data
  refreshTenantContext: () => Promise<void>;
}

// ============================================================================
// DUMMY DATA GENERATORS
// ============================================================================

const generateDummySnapshot = (tenantId: string, tenantName: string, workspaceCode: string): TenantSnapshot => {
  const createdAt = new Date();
  createdAt.setDate(createdAt.getDate() - 45); // 45 days ago

  return {
    tenant_id: tenantId,
    tenant_name: tenantName,
    workspace_code: workspaceCode,

    // Business metrics
    days_active: 45,
    created_at: createdAt,

    // Entity counts - dummy values
    contracts_count: 12,
    users_count: 5,
    active_users_count: 3,
    documents_count: 28,
    storage_used_mb: 256,
    storage_limit_mb: 5120, // 5GB

    // All channels active for dummy
    active_channels: ['email', 'sms', 'whatsapp'],

    // Subscription - Professional tier dummy
    subscription: {
      plan_id: 'plan_professional_monthly',
      plan_name: 'Professional',
      tier: 'professional',
      status: 'active',
      billing_cycle: 'monthly',
      current_period_start: new Date(),
      current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      auto_renew: true,
    },

    // Feature flags - all enabled for professional
    features: {
      'email_invites': true,
      'sms_invites': true,
      'whatsapp_invites': true,
      'bulk_invites': true,
      'custom_templates': true,
      'analytics_dashboard': true,
      'api_access': true,
      'webhook_notifications': true,
      'custom_branding': true,
      'priority_support': false, // Enterprise only
      'sla_guarantee': false, // Enterprise only
      'dedicated_account_manager': false, // Enterprise only
    },
  };
};

const generateDummyUsage = (): UsageMetrics => {
  const lastReset = new Date();
  lastReset.setDate(1); // First of current month

  return {
    email: {
      used: 1200,
      limit: 5000,
      topup_balance: 500,
      last_reset: lastReset,
      is_enabled: true,
    },
    sms: {
      used: 150,
      limit: 500,
      topup_balance: 200,
      last_reset: lastReset,
      is_enabled: true,
    },
    whatsapp: {
      used: 80,
      limit: 300,
      topup_balance: 100,
      last_reset: lastReset,
      is_enabled: true,
    },
    api_calls: {
      used: 5000,
      limit: 50000,
      last_reset: lastReset,
    },
  };
};

const generateDummyChannelConfigs = (): ChannelConfig[] => [
  {
    channel: 'email',
    is_active: true,
    provider: 'msg91',
    config: {
      sender_email: 'noreply@contractnest.com',
      sender_name: 'ContractNest',
      reply_to: 'support@contractnest.com',
    },
    templates_enabled: true,
  },
  {
    channel: 'sms',
    is_active: true,
    provider: 'msg91',
    config: {
      sender_id: 'CNEST',
      route: 'transactional',
    },
    templates_enabled: true,
  },
  {
    channel: 'whatsapp',
    is_active: true,
    provider: 'meta',
    config: {
      phone_number_id: 'dummy_phone_id',
      business_account_id: 'dummy_business_id',
      access_token: '***', // Hidden
    },
    templates_enabled: true,
  },
];

// ============================================================================
// CONTEXT CREATION
// ============================================================================

const TenantContext = createContext<TenantContextType | undefined>(undefined);

// ============================================================================
// PROVIDER COMPONENT
// ============================================================================

export const TenantContextProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentTenant, isAuthenticated } = useAuth();

  // State
  const [snapshot, setSnapshot] = useState<TenantSnapshot | null>(null);
  const [usage, setUsage] = useState<UsageMetrics | null>(null);
  const [channelConfigs, setChannelConfigs] = useState<ChannelConfig[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // ============================================================================
  // FEATURE & QUOTA CHECKS
  // ============================================================================

  /**
   * Check if a feature is enabled for the current tenant
   */
  const hasFeature = useCallback((feature: string): boolean => {
    if (!snapshot) return false;
    return snapshot.features[feature] === true;
  }, [snapshot]);

  /**
   * Check if tenant has enough quota for a channel operation
   */
  const hasQuota = useCallback((channel: ChannelType, count: number = 1): boolean => {
    if (!usage) return false;

    const channelUsage = usage[channel];
    if (!channelUsage || !channelUsage.is_enabled) return false;

    const available = (channelUsage.limit - channelUsage.used) + channelUsage.topup_balance;
    return available >= count;
  }, [usage]);

  /**
   * Get channel configuration
   */
  const getChannelConfig = useCallback((channel: ChannelType): ChannelConfig | null => {
    return channelConfigs.find(c => c.channel === channel) || null;
  }, [channelConfigs]);

  /**
   * Check if a channel is active
   */
  const isChannelActive = useCallback((channel: ChannelType): boolean => {
    if (!snapshot) return false;
    return snapshot.active_channels.includes(channel);
  }, [snapshot]);

  // ============================================================================
  // USAGE OPERATIONS
  // ============================================================================

  /**
   * Deduct usage from a channel (returns false if insufficient quota)
   * NOTE: In production, this should be an API call
   */
  const deductUsage = useCallback((channel: ChannelType, count: number = 1): boolean => {
    if (!hasQuota(channel, count)) return false;

    setUsage(prev => {
      if (!prev) return prev;

      const channelUsage = { ...prev[channel] };
      const remaining = channelUsage.limit - channelUsage.used;

      if (remaining >= count) {
        // Deduct from regular limit first
        channelUsage.used += count;
      } else {
        // Use remaining limit + topup
        channelUsage.used = channelUsage.limit;
        channelUsage.topup_balance -= (count - remaining);
      }

      return {
        ...prev,
        [channel]: channelUsage,
      };
    });

    return true;
  }, [hasQuota]);

  /**
   * Get remaining quota for a channel (limit - used + topup)
   */
  const getRemainingQuota = useCallback((channel: ChannelType): number => {
    if (!usage) return 0;

    const channelUsage = usage[channel];
    if (!channelUsage) return 0;

    return (channelUsage.limit - channelUsage.used) + channelUsage.topup_balance;
  }, [usage]);

  /**
   * Get usage percentage for a channel (0-100)
   */
  const getUsagePercentage = useCallback((channel: ChannelType): number => {
    if (!usage) return 0;

    const channelUsage = usage[channel];
    if (!channelUsage || channelUsage.limit === 0) return 0;

    return Math.min(100, Math.round((channelUsage.used / channelUsage.limit) * 100));
  }, [usage]);

  // ============================================================================
  // DATA LOADING
  // ============================================================================

  /**
   * Refresh tenant context from API
   * NOTE: Currently uses dummy data. Replace with real API calls.
   */
  const refreshTenantContext = useCallback(async () => {
    if (!currentTenant) {
      setSnapshot(null);
      setUsage(null);
      setChannelConfigs([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // TODO: Replace with real API calls
      // const [snapshotRes, usageRes, configsRes] = await Promise.all([
      //   api.get(`/api/v1/tenants/${currentTenant.id}/snapshot`),
      //   api.get(`/api/v1/tenants/${currentTenant.id}/usage`),
      //   api.get(`/api/v1/tenants/${currentTenant.id}/channel-configs`),
      // ]);

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 300));

      // Use dummy data for now
      setSnapshot(generateDummySnapshot(
        currentTenant.id,
        currentTenant.name,
        currentTenant.workspace_code
      ));
      setUsage(generateDummyUsage());
      setChannelConfigs(generateDummyChannelConfigs());

    } catch (err: any) {
      console.error('Error loading tenant context:', err);
      setError(err.message || 'Failed to load tenant context');
    } finally {
      setIsLoading(false);
    }
  }, [currentTenant]);

  // Load context when tenant changes
  useEffect(() => {
    if (isAuthenticated && currentTenant) {
      refreshTenantContext();
    } else {
      setSnapshot(null);
      setUsage(null);
      setChannelConfigs([]);
      setIsLoading(false);
    }
  }, [isAuthenticated, currentTenant?.id, refreshTenantContext]);

  // ============================================================================
  // CONTEXT VALUE
  // ============================================================================

  const value: TenantContextType = {
    // State
    snapshot,
    usage,
    channelConfigs,
    isLoading,
    error,

    // Feature & quota checks
    hasFeature,
    hasQuota,
    getChannelConfig,
    isChannelActive,

    // Usage operations
    deductUsage,
    getRemainingQuota,
    getUsagePercentage,

    // Refresh
    refreshTenantContext,
  };

  return (
    <TenantContext.Provider value={value}>
      {children}
    </TenantContext.Provider>
  );
};

// ============================================================================
// CUSTOM HOOK
// ============================================================================

export const useTenantContext = (): TenantContextType => {
  const context = useContext(TenantContext);
  if (context === undefined) {
    throw new Error('useTenantContext must be used within a TenantContextProvider');
  }
  return context;
};

// ============================================================================
// HELPER HOOKS (convenience wrappers)
// ============================================================================

/**
 * Hook to check if a specific channel is available and has quota
 */
export const useChannelAvailability = (channel: ChannelType) => {
  const { isChannelActive, hasQuota, getChannelConfig, getRemainingQuota, getUsagePercentage } = useTenantContext();

  return {
    isActive: isChannelActive(channel),
    hasQuota: hasQuota(channel),
    config: getChannelConfig(channel),
    remainingQuota: getRemainingQuota(channel),
    usagePercentage: getUsagePercentage(channel),
  };
};

/**
 * Hook to get subscription info
 */
export const useSubscription = () => {
  const { snapshot } = useTenantContext();

  if (!snapshot) {
    return {
      tier: 'free' as SubscriptionTier,
      status: 'expired' as SubscriptionStatus,
      isActive: false,
      isProfessionalOrHigher: false,
      isEnterprise: false,
    };
  }

  const { subscription } = snapshot;
  const tierOrder: SubscriptionTier[] = ['free', 'starter', 'professional', 'enterprise'];
  const tierIndex = tierOrder.indexOf(subscription.tier);

  return {
    ...subscription,
    isActive: subscription.status === 'active' || subscription.status === 'trial',
    isProfessionalOrHigher: tierIndex >= 2,
    isEnterprise: subscription.tier === 'enterprise',
  };
};

/**
 * Hook to get tenant business metrics
 */
export const useTenantMetrics = () => {
  const { snapshot } = useTenantContext();

  if (!snapshot) {
    return {
      daysActive: 0,
      contractsCount: 0,
      usersCount: 0,
      activeUsersCount: 0,
      documentsCount: 0,
      storageUsedMb: 0,
      storageLimitMb: 0,
      storagePercentage: 0,
    };
  }

  return {
    daysActive: snapshot.days_active,
    contractsCount: snapshot.contracts_count,
    usersCount: snapshot.users_count,
    activeUsersCount: snapshot.active_users_count,
    documentsCount: snapshot.documents_count,
    storageUsedMb: snapshot.storage_used_mb,
    storageLimitMb: snapshot.storage_limit_mb,
    storagePercentage: Math.round((snapshot.storage_used_mb / snapshot.storage_limit_mb) * 100),
  };
};

export default TenantContext;
