// src/hooks/useProductConfig.ts
// Hook to fetch product-specific configuration from the API
// Falls back to pricing.ts constants if API call fails

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { API_ENDPOINTS } from '@/services/serviceURLs';
import {
  featureItems as defaultFeatureItems,
  FeatureItem,
  defaultUserTiers,
  defaultContractTiers,
  TierRange,
  notificationItems as defaultNotificationItems,
  NotificationItem,
  planTypes as defaultPlanTypes,
  PlanType
} from '@/utils/constants/pricing';
import {
  ProductConfig,
  BillingConfig,
  Feature,
  TierTemplate,
  getLimitFeatures,
  getAddonFeatures,
  getBooleanFeatures,
  getUsageFeatures
} from '@/types/productConfig';

// Transform API Feature to UI FeatureItem
const transformFeatureToFeatureItem = (feature: Feature): FeatureItem => {
  return {
    id: feature.code,
    name: feature.display_name,
    description: feature.description || '',
    isSpecialFeature: feature.type === 'addon' || feature.type === 'boolean',
    defaultLimit: feature.default_limit ?? (feature.type === 'limit' ? 50 : 1),
    trialLimit: feature.trial_limit ?? (feature.type === 'limit' ? 5 : 1),
    basePrice: feature.base_price
  };
};

// Transform API TierTemplate to UI TierRange
const transformTierTemplateToTierRange = (tier: TierTemplate): TierRange => {
  return {
    min: tier.min,
    max: tier.max,
    label: tier.label
  };
};

interface UseProductConfigOptions {
  productCode: string;
  enabled?: boolean;
}

interface UseProductConfigResult {
  // Raw config from API
  config: ProductConfig | null;
  billingConfig: BillingConfig | null;

  // Transformed for UI consumption
  featureItems: FeatureItem[];
  planTypes: PlanType[];
  userTiers: TierRange[];
  contractTiers: TierRange[];
  notificationItems: NotificationItem[];

  // Loading states
  isLoading: boolean;
  error: Error | null;

  // Helpers
  isUsingFallback: boolean;
  refetch: () => Promise<void>;
}

export const useProductConfig = (options: UseProductConfigOptions): UseProductConfigResult => {
  const { productCode, enabled = true } = options;
  const { accessToken, isAuthenticated } = useAuth();

  // State
  const [config, setConfig] = useState<ProductConfig | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [isUsingFallback, setIsUsingFallback] = useState(false);

  // Fetch product config
  const fetchConfig = useCallback(async () => {
    if (!productCode || !enabled || !isAuthenticated) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(API_ENDPOINTS.PRODUCT_CONFIG.GET(productCode), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch product config: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.success && data.data) {
        setConfig(data.data);
        setIsUsingFallback(false);
      } else {
        throw new Error(data.error || 'Unknown error');
      }
    } catch (err) {
      console.warn(`[useProductConfig] API call failed, using fallback values:`, err);
      setError(err instanceof Error ? err : new Error('Unknown error'));
      setIsUsingFallback(true);
    } finally {
      setIsLoading(false);
    }
  }, [productCode, enabled, isAuthenticated, accessToken]);

  // Fetch on mount and when dependencies change
  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  // Extract billing config
  const billingConfig = useMemo(() => {
    return config?.billing_config || null;
  }, [config]);

  // Transform features for UI
  const featureItems = useMemo((): FeatureItem[] => {
    if (!billingConfig?.features || billingConfig.features.length === 0) {
      // Fallback to default features from pricing.ts
      return defaultFeatureItems;
    }

    return billingConfig.features.map(transformFeatureToFeatureItem);
  }, [billingConfig]);

  // Get plan types from config or fallback
  const planTypes = useMemo((): PlanType[] => {
    if (!billingConfig?.plan_types || billingConfig.plan_types.length === 0) {
      return defaultPlanTypes;
    }

    // Validate plan types are valid
    const validPlanTypes = billingConfig.plan_types.filter(
      (pt): pt is PlanType => pt === 'Per User' || pt === 'Per Contract'
    );

    return validPlanTypes.length > 0 ? validPlanTypes : defaultPlanTypes;
  }, [billingConfig]);

  // Get tier templates or fallback
  const userTiers = useMemo((): TierRange[] => {
    if (!billingConfig?.tier_templates?.user_tiers || billingConfig.tier_templates.user_tiers.length === 0) {
      return defaultUserTiers;
    }

    return billingConfig.tier_templates.user_tiers.map(transformTierTemplateToTierRange);
  }, [billingConfig]);

  const contractTiers = useMemo((): TierRange[] => {
    if (!billingConfig?.tier_templates?.contract_tiers || billingConfig.tier_templates.contract_tiers.length === 0) {
      return defaultContractTiers;
    }

    return billingConfig.tier_templates.contract_tiers.map(transformTierTemplateToTierRange);
  }, [billingConfig]);

  // Get notification items (currently using fallback, can be extended)
  const notificationItems = useMemo((): NotificationItem[] => {
    // TODO: Add notification config to billing_config if needed
    return defaultNotificationItems;
  }, []);

  return {
    config,
    billingConfig,
    featureItems,
    planTypes,
    userTiers,
    contractTiers,
    notificationItems,
    isLoading,
    error,
    isUsingFallback,
    refetch: fetchConfig
  };
};

// Convenience hook for just features
export const useProductFeatures = (productCode: string, enabled = true) => {
  const { featureItems, isLoading, error, isUsingFallback } = useProductConfig({ productCode, enabled });
  return { featureItems, isLoading, error, isUsingFallback };
};

// Convenience hook for just tier templates
export const useProductTiers = (productCode: string, enabled = true) => {
  const { userTiers, contractTiers, isLoading, error, isUsingFallback } = useProductConfig({ productCode, enabled });
  return { userTiers, contractTiers, isLoading, error, isUsingFallback };
};

export default useProductConfig;
