// src/hooks/useProductConfig.ts
// Hook to fetch product-specific configuration from the API
// Falls back to pricing.ts constants if API call fails
// Pattern: Same as useResources.ts

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import api from '@/services/api';
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
  TierTemplate
} from '@/types/productConfig';

// Transform API Feature to UI FeatureItem
const transformFeatureToFeatureItem = (feature: Feature): FeatureItem => {
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

// Parse API response
const parseResponse = (response: any): ProductConfig | null => {
  // Handle { success: true, data: {...} } format
  if (response?.data?.success === true && response?.data?.data) {
    return response.data.data;
  }
  // Handle direct data format
  if (response?.data?.success === true) {
    return response.data;
  }
  // Handle direct object
  if (response?.data) {
    return response.data;
  }
  return null;
};

interface UseProductConfigOptions {
  productCode: string;
  enabled?: boolean;
}

interface UseProductConfigResult {
  config: ProductConfig | null;
  billingConfig: BillingConfig | null;
  featureItems: FeatureItem[];
  planTypes: PlanType[];
  userTiers: TierRange[];
  contractTiers: TierRange[];
  notificationItems: NotificationItem[];
  isLoading: boolean;
  error: Error | null;
  isUsingFallback: boolean;
  refetch: () => Promise<void>;
}

export const useProductConfig = (options: UseProductConfigOptions): UseProductConfigResult => {
  const { productCode, enabled = true } = options;

  const [config, setConfig] = useState<ProductConfig | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [isUsingFallback, setIsUsingFallback] = useState(false);
  const isMountedRef = useRef(true);

  // Fetch product config using api.ts
  const fetchConfig = useCallback(async () => {
    if (!productCode || !enabled) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log(`[useProductConfig] Fetching config for: ${productCode}`);

      const response = await api.get(API_ENDPOINTS.PRODUCT_CONFIG.GET(productCode));

      console.log('[useProductConfig] API Response:', response);

      const data = parseResponse(response);

      if (data && isMountedRef.current) {
        setConfig(data);
        setIsUsingFallback(false);
        console.log(`[useProductConfig] Loaded config for ${productCode}:`, data);
      } else {
        throw new Error('Invalid response format');
      }
    } catch (err: any) {
      console.warn(`[useProductConfig] API call failed for ${productCode}, using fallback:`, err);

      if (isMountedRef.current) {
        setError(err instanceof Error ? err : new Error(err?.message || 'Unknown error'));
        setIsUsingFallback(true);
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [productCode, enabled]);

  // Track mounted state
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

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
      return defaultFeatureItems;
    }
    return billingConfig.features.map(transformFeatureToFeatureItem);
  }, [billingConfig]);

  // Get plan types from config or fallback
  const planTypes = useMemo((): PlanType[] => {
    if (!billingConfig?.plan_types || billingConfig.plan_types.length === 0) {
      return defaultPlanTypes;
    }

    const configPlanTypes = billingConfig.plan_types;
    if (typeof configPlanTypes[0] === 'string') {
      const validPlanTypes = (configPlanTypes as unknown as string[]).filter(
        (pt): pt is PlanType => pt === 'Per User' || pt === 'Per Contract'
      );
      return validPlanTypes.length > 0 ? validPlanTypes : defaultPlanTypes;
    }

    return defaultPlanTypes;
  }, [billingConfig]);

  // Get tier templates or fallback
  const userTiers = useMemo((): TierRange[] => {
    const tierTemplates = billingConfig?.tier_templates;
    if (!tierTemplates) {
      return defaultUserTiers;
    }

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

    const contractTierData = tierTemplates.contract_tiers || tierTemplates.per_contract || tierTemplates['Per Contract'];
    if (!contractTierData || contractTierData.length === 0) {
      return defaultContractTiers;
    }

    return contractTierData.map(transformTierTemplateToTierRange);
  }, [billingConfig]);

  const notificationItems = useMemo((): NotificationItem[] => {
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

// Convenience hooks
export const useProductFeatures = (productCode: string, enabled = true) => {
  const { featureItems, isLoading, error, isUsingFallback } = useProductConfig({ productCode, enabled });
  return { featureItems, isLoading, error, isUsingFallback };
};

export const useProductTiers = (productCode: string, enabled = true) => {
  const { userTiers, contractTiers, isLoading, error, isUsingFallback } = useProductConfig({ productCode, enabled });
  return { userTiers, contractTiers, isLoading, error, isUsingFallback };
};

export default useProductConfig;
