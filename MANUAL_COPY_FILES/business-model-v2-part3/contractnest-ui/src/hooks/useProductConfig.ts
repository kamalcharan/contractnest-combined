// src/hooks/useProductConfig.ts
// Hook to fetch product-specific configuration from the API
// Falls back to pricing.ts constants if API call fails

import { useState, useEffect, useCallback, useMemo } from 'react';
import { productConfigService } from '@/services/productConfigService';
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
  TierTemplate
} from '@/types/productConfig';

// Transform API Feature to UI FeatureItem
const transformFeatureToFeatureItem = (feature: Feature): FeatureItem => {
  // Get default/trial values - handle both number and boolean types
  const defaultVal = typeof feature.default === 'number' ? feature.default : (feature.default ? 1 : 0);
  const trialVal = typeof feature.trial === 'number' ? feature.trial : (feature.trial ? 1 : 0);

  return {
    id: feature.id,
    name: feature.name,
    description: feature.description || '',
    isSpecialFeature: feature.type === 'addon' || feature.type === 'boolean',
    defaultLimit: defaultVal,
    trialLimit: trialVal,
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

  // State
  const [config, setConfig] = useState<ProductConfig | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [isUsingFallback, setIsUsingFallback] = useState(false);

  // Fetch product config using the service
  const fetchConfig = useCallback(async () => {
    if (!productCode || !enabled) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await productConfigService.getConfig(productCode);

      if (response.success && response.data) {
        setConfig(response.data);
        setIsUsingFallback(false);
        console.log(`[useProductConfig] Loaded config for ${productCode}:`, response.data);
      } else {
        throw new Error(response.error || 'Failed to load product config');
      }
    } catch (err) {
      console.warn(`[useProductConfig] API call failed for ${productCode}, using fallback values:`, err);
      setError(err instanceof Error ? err : new Error('Unknown error'));
      setIsUsingFallback(true);
    } finally {
      setIsLoading(false);
    }
  }, [productCode, enabled]);

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

    // Handle both string[] and PlanType[] formats
    const configPlanTypes = billingConfig.plan_types;

    // If it's an array of strings like ["Per User", "Per Contract"]
    if (typeof configPlanTypes[0] === 'string') {
      const validPlanTypes = (configPlanTypes as unknown as string[]).filter(
        (pt): pt is PlanType => pt === 'Per User' || pt === 'Per Contract'
      );
      return validPlanTypes.length > 0 ? validPlanTypes : defaultPlanTypes;
    }

    // If it's an array of PlanType objects, extract labels
    return defaultPlanTypes;
  }, [billingConfig]);

  // Get tier templates or fallback
  const userTiers = useMemo((): TierRange[] => {
    const tierTemplates = billingConfig?.tier_templates;
    if (!tierTemplates) {
      return defaultUserTiers;
    }

    // Check for user_tiers or per_user key
    const userTierData = tierTemplates.user_tiers || tierTemplates.per_user || tierTemplates['Per User'];
    if (!userTierData || userTierData.length === 0) {
      return defaultUserTiers;
    }

    return userTierData.map(transformTierTemplateToTierRange);
  }, [billingConfig]);

  const contractTiers = useMemo((): TierRange[] => {
    const tierTemplates = billingConfig?.tier_templates;
    if (!tierTemplates) {
      return defaultContractTiers;
    }

    // Check for contract_tiers or per_contract key
    const contractTierData = tierTemplates.contract_tiers || tierTemplates.per_contract || tierTemplates['Per Contract'];
    if (!contractTierData || contractTierData.length === 0) {
      return defaultContractTiers;
    }

    return contractTierData.map(transformTierTemplateToTierRange);
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
