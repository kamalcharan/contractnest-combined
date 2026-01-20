// hooks/useBusinessModel.ts - UPDATED WITH IDEMPOTENCY KEY SUPPORT
// Changes: createPlan and updatePlanAsNewVersion now support idempotency keys

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import api, { postWithIdempotency, putWithIdempotency } from '@/services/api';
import { toast } from 'react-hot-toast';

// Core Plan Types
interface BusinessModelPlan {
  id: string;
  plan_id?: string;
  name: string;
  description: string;
  planType: 'Per User' | 'Per Contract';
  plan_type?: 'Per User' | 'Per Contract';
  isActive: boolean;
  is_active?: boolean;
  isLive: boolean;
  is_live?: boolean;
  isVisible?: boolean;
  is_visible?: boolean;
  isArchived?: boolean;
  is_archived?: boolean;
  defaultCurrencyCode: string;
  default_currency_code?: string;
  supportedCurrencies: string[];
  supported_currencies?: string[];
  tiers: PricingTier[];
  version?: string;
  createdAt?: string;
  created_at?: string;
  updatedAt?: string;
  updated_at?: string;
  tenantId?: string;
  tenant_id?: string;
  billingCycle?: 'monthly' | 'yearly' | 'one-time';
  billing_cycle?: 'monthly' | 'yearly' | 'one-time';
  trialPeriodDays?: number;
  trial_duration?: number;
  activeVersion?: PlanVersion;
  active_version?: PlanVersion;
  features?: PlanFeature[];
  notifications?: NotificationConfig[];
  subscriber_count?: number;
  productCode?: string;
  product_code?: string;
  productName?: string;
  product_name?: string;
}

interface PricingTier {
  tier_id?: string;
  minValue: number;
  min_value?: number;
  maxValue: number | null;
  max_value?: number | null;
  basePrice: number;
  base_price?: number;
  unitPrice: number;
  unit_price?: number;
  label?: string;
  prices: Record<string, number>;
}

interface PlanFeature {
  id?: string;
  feature_id?: string;
  name?: string;
  description?: string;
  enabled?: boolean;
  limit?: number;
  trial_limit?: number;
  trial_enabled?: boolean;
  test_env_limit?: number;
  is_special_feature?: boolean;
  pricing_period?: 'monthly' | 'quarterly' | 'annually';
  prices?: Record<string, number>;
}

interface NotificationConfig {
  id?: string;
  notif_type?: string;
  method?: string;
  category?: string;
  enabled?: boolean;
  credits_per_unit?: number;
  prices?: Record<string, number>;
}

interface PlanVersion {
  version_id?: string;
  version_number?: string;
  is_active?: boolean;
  effective_date?: string;
  changelog?: string;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
  tiers?: PricingTier[];
  features?: PlanFeature[];
  notifications?: NotificationConfig[];
}

interface CreatePlanRequest {
  name: string;
  description: string;
  planType: 'Per User' | 'Per Contract';
  plan_type?: 'Per User' | 'Per Contract';
  defaultCurrencyCode: string;
  default_currency_code?: string;
  supportedCurrencies: string[];
  supported_currencies?: string[];
  tiers: PricingTier[];
  isActive?: boolean;
  is_active?: boolean;
  isLive?: boolean;
  is_live?: boolean;
  trialPeriodDays?: number;
  trial_duration?: number;
  features?: PlanFeature[];
  notifications?: NotificationConfig[];
  productCode?: string;
  product_code?: string;
  initial_version?: {
    version_number: string;
    is_active: boolean;
    effective_date: string;
    changelog: string;
    tiers: any[];
    features: any[];
    notifications: any[];
  };
  // NEW: Idempotency key for race condition prevention
  _idempotencyKey?: string;
}

interface UpdatePlanRequest extends Partial<CreatePlanRequest> {
  id?: string;
  plan_id?: string;
}

interface EditPlanData {
  plan_id: string;
  name: string;
  description: string;
  plan_type: 'Per User' | 'Per Contract';
  trial_duration: number;
  is_visible: boolean;
  default_currency_code: string;
  supported_currencies: string[];
  current_version_id: string;
  current_version_number: string;
  next_version_number: string;
  effective_date: string;
  changelog: string;
  tiers: PricingTier[];
  features: PlanFeature[];
  notifications: NotificationConfig[];
  // NEW: Idempotency key for race condition prevention
  _idempotencyKey?: string;
}

interface PlanFilters {
  isActive?: boolean;
  is_active?: boolean;
  isLive?: boolean;
  is_live?: boolean;
  planType?: string;
  plan_type?: string;
  search?: string;
  sortBy?: 'name' | 'createdAt' | 'updatedAt';
  sort_by?: 'name' | 'created_at' | 'updated_at';
  sortOrder?: 'asc' | 'desc';
  sort_order?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

interface UseBusinessModelReturn {
  plans: BusinessModelPlan[];
  selectedPlan: BusinessModelPlan | null;
  currentPlan: BusinessModelPlan | null;
  planVersions: PlanVersion[];
  currentEditData: EditPlanData | null;
  isLoading: boolean;
  loading: boolean;
  loadingEdit: boolean;
  submitting: boolean;
  error: string | null;
  filters: PlanFilters;
  features: PlanFeature[];
  notifications: NotificationConfig[];
  tiers: PricingTier[];
  loadPlans: (filters?: PlanFilters) => Promise<void>;
  loadPlanDetails: (planId: string) => Promise<BusinessModelPlan | null>;
  fetchPlan: (planId: string) => Promise<BusinessModelPlan | null>;
  createPlan: (planData: CreatePlanRequest) => Promise<BusinessModelPlan>;
  updatePlan: (planId: string, planData: UpdatePlanRequest) => Promise<BusinessModelPlan>;
  deletePlan: (planId: string) => Promise<void>;
  duplicatePlan: (planId: string, newName?: string) => Promise<BusinessModelPlan>;
  loadPlanForEdit: (planId: string) => Promise<EditPlanData | null>;
  updatePlanAsNewVersion: (editData: EditPlanData) => Promise<any>;
  loadPlanVersions: (planId: string) => Promise<PlanVersion[]>;
  fetchPlanVersions: (planId: string) => Promise<PlanVersion[]>;
  activatePlanVersion: (versionId: string) => Promise<boolean>;
  resetEditMode: () => void;
  togglePlanVisibility: (planId: string, visible: boolean) => Promise<boolean>;
  archivePlan: (planId: string) => Promise<boolean>;
  calculatePrice: (planId: string, usage: Record<string, number>) => Promise<number>;
  validatePricing: (tiers: PricingTier[]) => Promise<{ isValid: boolean; errors: string[] }>;
  clearSelectedPlan: () => void;
  clearError: () => void;
  refreshPlans: () => Promise<void>;
  setFilters: (filters: Partial<PlanFilters>) => void;
  resetFilters: () => void;
  getActiveVersion: (planId: string) => PlanVersion | null;
  getVersionHistory: (planId: string) => PlanVersion[];
  clearAllData: () => void;
}

// Data transformation utilities
const transformApiPlanToFrontend = (apiPlan: any): BusinessModelPlan => {
  if (!apiPlan) return apiPlan;

  return {
    ...apiPlan,
    id: apiPlan.id || apiPlan.plan_id,
    plan_id: apiPlan.plan_id || apiPlan.id,
    planType: apiPlan.plan_type || apiPlan.planType,
    plan_type: apiPlan.plan_type || apiPlan.planType,
    isActive: apiPlan.is_active ?? apiPlan.isActive ?? true,
    is_active: apiPlan.is_active ?? apiPlan.isActive ?? true,
    isVisible: apiPlan.is_visible ?? apiPlan.isVisible ?? true,
    is_visible: apiPlan.is_visible ?? apiPlan.isVisible ?? true,
    isArchived: apiPlan.is_archived ?? apiPlan.isArchived ?? false,
    is_archived: apiPlan.is_archived ?? apiPlan.isArchived ?? false,
    defaultCurrencyCode: apiPlan.default_currency_code || apiPlan.defaultCurrencyCode,
    default_currency_code: apiPlan.default_currency_code || apiPlan.defaultCurrencyCode,
    supportedCurrencies: apiPlan.supported_currencies || apiPlan.supportedCurrencies || [],
    supported_currencies: apiPlan.supported_currencies || apiPlan.supportedCurrencies || [],
    createdAt: apiPlan.created_at || apiPlan.createdAt,
    created_at: apiPlan.created_at || apiPlan.createdAt,
    updatedAt: apiPlan.updated_at || apiPlan.updatedAt,
    updated_at: apiPlan.updated_at || apiPlan.updatedAt,
    trialPeriodDays: apiPlan.trial_duration || apiPlan.trialPeriodDays,
    trial_duration: apiPlan.trial_duration || apiPlan.trialPeriodDays,
    activeVersion: apiPlan.active_version || apiPlan.activeVersion,
    active_version: apiPlan.active_version || apiPlan.activeVersion,
    tiers: apiPlan.tiers || apiPlan.activeVersion?.tiers || [],
    features: apiPlan.features || apiPlan.activeVersion?.features || [],
    notifications: apiPlan.notifications || apiPlan.activeVersion?.notifications || [],
    productCode: apiPlan.product_code || apiPlan.productCode,
    product_code: apiPlan.product_code || apiPlan.productCode,
    productName: apiPlan.product_name || apiPlan.productName,
    product_name: apiPlan.product_name || apiPlan.productName,
  };
};

const transformFrontendToApiFormat = (frontendData: any): any => {
  if (!frontendData) return frontendData;

  // Remove internal fields like _idempotencyKey before sending to API
  const { _idempotencyKey, ...dataWithoutInternals } = frontendData;

  return {
    ...dataWithoutInternals,
    plan_id: frontendData.plan_id || frontendData.id,
    plan_type: frontendData.planType || frontendData.plan_type,
    is_active: frontendData.isActive ?? frontendData.is_active,
    is_visible: frontendData.isVisible ?? frontendData.is_visible,
    is_archived: frontendData.isArchived ?? frontendData.is_archived,
    default_currency_code: frontendData.defaultCurrencyCode || frontendData.default_currency_code,
    supported_currencies: frontendData.supportedCurrencies || frontendData.supported_currencies,
    created_at: frontendData.createdAt || frontendData.created_at,
    updated_at: frontendData.updatedAt || frontendData.updated_at,
    trial_duration: frontendData.trialPeriodDays || frontendData.trial_duration,
    product_code: frontendData.productCode || frontendData.product_code,
  };
};

// Helper function to ensure all currencies have prices
const ensureCurrencyConsistency = (data: any): any => {
  const supportedCurrencies = data.supported_currencies || data.supportedCurrencies || [];

  if (data.tiers) {
    data.tiers = data.tiers.map((tier: any) => {
      const prices = { ...tier.prices };
      supportedCurrencies.forEach((currency: string) => {
        if (prices[currency] === undefined || prices[currency] === null) {
          console.warn(`Tier missing ${currency} price, defaulting to 0`);
          prices[currency] = 0;
        }
      });
      return { ...tier, prices };
    });
  }

  if (data.features) {
    data.features = data.features.map((feature: any) => {
      if (feature.is_special_feature && feature.prices) {
        const prices = { ...feature.prices };
        supportedCurrencies.forEach((currency: string) => {
          if (prices[currency] === undefined || prices[currency] === null) {
            console.warn(`Special feature ${feature.name} missing ${currency} price, defaulting to 0`);
            prices[currency] = 0;
          }
        });
        return { ...feature, prices };
      }
      return feature;
    });
  }

  if (data.notifications) {
    data.notifications = data.notifications.map((notif: any) => {
      const prices = { ...notif.prices };
      supportedCurrencies.forEach((currency: string) => {
        if (prices[currency] === undefined || prices[currency] === null) {
          console.warn(`Notification ${notif.notif_type} missing ${currency} price, defaulting to 0`);
          prices[currency] = 0;
        }
      });
      return { ...notif, prices };
    });
  }

  return data;
};

export const useBusinessModel = (): UseBusinessModelReturn => {
  const { currentTenant, user, isLive } = useAuth();
  const tenantId = currentTenant?.id;

  // Core State
  const [plans, setPlans] = useState<BusinessModelPlan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<BusinessModelPlan | null>(null);
  const [planVersions, setPlanVersions] = useState<PlanVersion[]>([]);
  const [currentEditData, setCurrentEditData] = useState<EditPlanData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingEdit, setLoadingEdit] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFiltersState] = useState<PlanFilters>({
    isLive: isLive,
    is_live: isLive,
    sortBy: 'updatedAt',
    sort_by: 'updated_at',
    sortOrder: 'desc',
    sort_order: 'desc',
    page: 1,
    limit: 20
  });

  // Request management
  const activeRequests = useRef<Map<string, Promise<any>>>(new Map());
  const cache = useRef<Map<string, { data: any; timestamp: number; ttl: number }>>(new Map());
  const lastTenantId = useRef<string | null>(null);
  const isInitialized = useRef(false);

  // NEW: Track last idempotency key to prevent duplicate submissions
  const lastIdempotencyKey = useRef<string | null>(null);

  const CACHE_TTL = {
    PLANS: 5 * 60 * 1000,
    PLAN_DETAILS: 10 * 60 * 1000,
  };

  // Enhanced error handling
  const handleError = useCallback((error: any, operation: string): string => {
    let errorMessage = `Failed to ${operation}`;

    if (error?.response?.data?.error) {
      errorMessage = error.response.data.error;
    } else if (error?.message) {
      errorMessage = error.message;
    }

    console.error(`Error ${operation}:`, error);
    setError(errorMessage);

    if (!operation.includes('load') && !operation.includes('fetch')) {
      toast.error(errorMessage);
    }

    return errorMessage;
  }, []);

  // Clear all data for environment switch
  const clearAllData = useCallback(() => {
    console.log('Clearing all business model data for environment switch');
    setPlans([]);
    setSelectedPlan(null);
    setPlanVersions([]);
    setCurrentEditData(null);
    setError(null);
    cache.current.clear();
    activeRequests.current.clear();
    isInitialized.current = false;
    lastIdempotencyKey.current = null;
    console.log('Business model data cleared');
  }, []);

  // Load plans
  const loadPlans = useCallback(async (filterOverrides?: PlanFilters): Promise<void> => {
    if (!tenantId) {
      console.warn('No tenant ID available for loading plans');
      return;
    }

    if (isLoading) {
      console.log('Already loading plans, skipping duplicate call');
      return;
    }

    const requestKey = `plans_${tenantId}_${isLive}`;

    if (activeRequests.current.has(requestKey)) {
      console.log('Request already in progress, waiting for completion');
      try {
        return await activeRequests.current.get(requestKey);
      } catch (err) {
        activeRequests.current.delete(requestKey);
      }
    }

    try {
      setError(null);
      setIsLoading(true);

      console.log('Fetching plans from: /api/business-model/plans?isLive=' + isLive);

      const requestPromise = api.get('/api/business-model/plans?isLive=' + isLive);
      activeRequests.current.set(requestKey, requestPromise);

      const response = await requestPromise;
      console.log('Raw API response:', response);

      let finalPlansData: BusinessModelPlan[] = [];

      if (Array.isArray(response.data)) {
        finalPlansData = response.data;
      } else if (response.data?.plans && Array.isArray(response.data.plans)) {
        finalPlansData = response.data.plans;
      } else if (response.data?.data && Array.isArray(response.data.data)) {
        finalPlansData = response.data.data;
      } else {
        console.warn('Unexpected API response structure:', response.data);
        finalPlansData = [];
      }

      const transformedPlans = finalPlansData.map(transformApiPlanToFrontend);

      console.log(`Loaded ${transformedPlans.length} plans`);
      setPlans(transformedPlans);

    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        console.log('Request was aborted');
        return;
      }
      handleError(err, 'load plans');
      setPlans([]);
    } finally {
      setIsLoading(false);
      activeRequests.current.delete(requestKey);
    }
  }, [tenantId, isLive, isLoading, handleError]);

  // Load specific plan details
  const loadPlanDetails = useCallback(async (planId: string): Promise<BusinessModelPlan | null> => {
    if (!planId || !tenantId) {
      console.warn('Missing planId or tenantId for loading plan details');
      return null;
    }

    try {
      setError(null);
      setIsLoading(true);

      console.log(`Fetching plan details for: ${planId}`);

      const response = await api.get(`/api/business-model/plans/${planId}`);
      const planData = response.data;

      if (planData) {
        const transformedPlan = transformApiPlanToFrontend(planData);
        setSelectedPlan(transformedPlan);

        setPlans(prev => {
          const index = prev.findIndex(p => p.id === planId || p.plan_id === planId);
          if (index >= 0) {
            const updated = [...prev];
            updated[index] = transformedPlan;
            return updated;
          }
          return prev;
        });

        console.log(`Plan loaded successfully: ${planId}`);
        return transformedPlan;
      }

      return null;

    } catch (err) {
      handleError(err, 'load plan details');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [tenantId, handleError]);

  const fetchPlan = useCallback(async (planId: string): Promise<BusinessModelPlan | null> => {
    return loadPlanDetails(planId);
  }, [loadPlanDetails]);

  // Load plan for editing
  const loadPlanForEdit = useCallback(async (planId: string): Promise<EditPlanData | null> => {
    if (!planId || !tenantId) {
      console.warn('Missing planId or tenantId for loading plan for edit');
      return null;
    }

    try {
      setError(null);
      setLoadingEdit(true);

      console.log(`Loading plan for edit: ${planId}`);

      const response = await api.get(`/api/business-model/plans/${planId}/edit`);
      const editData = response.data;

      if (editData) {
        const fixedEditData = ensureCurrencyConsistency(editData);
        setCurrentEditData(fixedEditData);
        console.log('Plan loaded for edit successfully:', fixedEditData);
        return fixedEditData;
      }

      return null;

    } catch (err) {
      handleError(err, 'load plan for edit');
      return null;
    } finally {
      setLoadingEdit(false);
    }
  }, [tenantId, handleError]);

  // Update plan as new version - WITH IDEMPOTENCY SUPPORT
  const updatePlanAsNewVersion = useCallback(async (editData: EditPlanData): Promise<any> => {
    if (!editData.plan_id || !tenantId) {
      console.error('Missing plan_id or tenantId for updating plan');
      return null;
    }

    // Extract idempotency key if provided
    const idempotencyKey = editData._idempotencyKey;

    // Check for duplicate submission with same idempotency key
    if (idempotencyKey && lastIdempotencyKey.current === idempotencyKey) {
      console.log('Duplicate submission detected with same idempotency key, ignoring');
      return null;
    }

    try {
      setError(null);
      setSubmitting(true);

      // Track this idempotency key
      if (idempotencyKey) {
        lastIdempotencyKey.current = idempotencyKey;
      }

      console.log('Updating plan as new version:', editData.plan_id, 'with idempotency key:', idempotencyKey);

      const sanitizedData = ensureCurrencyConsistency(editData);
      const apiData = {
        ...transformFrontendToApiFormat(sanitizedData),
        updatedBy: user?.id,
        updated_by: user?.id
      };

      // Use postWithIdempotency helper
      const result = await postWithIdempotency(
        '/api/business-model/plans/edit',
        apiData,
        idempotencyKey
      );

      await loadPlans();
      setCurrentEditData(null);

      console.log('Plan updated as new version successfully');
      toast.success('Plan updated successfully');

      return result;

    } catch (err: any) {
      console.error('Error in updatePlanAsNewVersion:', err);

      if (err.response?.data) {
        console.error('Error response data:', err.response.data);

        if (err.response.data.details && Array.isArray(err.response.data.details)) {
          console.error('Validation failures:');
          err.response.data.details.forEach((detail: string, index: number) => {
            console.error(`  ${index + 1}. ${detail}`);
          });

          const errorMessage = 'Validation Failed:\n' + err.response.data.details.join('\n');
          toast.error(errorMessage, { duration: 6000 });

          const detailedError = `Validation failed: ${err.response.data.details.join(', ')}`;
          setError(detailedError);
          return null;
        }
      }

      const errorMessage = err.response?.data?.error || err.message || 'Failed to update plan';
      handleError(err, 'update plan as new version');
      return null;
    } finally {
      setSubmitting(false);
    }
  }, [tenantId, user?.id, handleError, loadPlans]);

  // Load plan versions
  const loadPlanVersions = useCallback(async (planId: string): Promise<PlanVersion[]> => {
    if (!planId || !tenantId) {
      console.warn('Missing planId or tenantId for loading plan versions');
      return [];
    }

    try {
      setError(null);

      console.log(`Loading plan versions for: ${planId}`);

      const response = await api.get(`/api/business-model/plan-versions?planId=${planId}`);
      const versions = response.data || [];

      const sortedVersions = versions.sort((a: PlanVersion, b: PlanVersion) => {
        const aNum = parseFloat(a.version_number || '0');
        const bNum = parseFloat(b.version_number || '0');
        return bNum - aNum;
      });

      setPlanVersions(sortedVersions);
      console.log(`Loaded ${sortedVersions.length} versions for plan: ${planId}`);

      return sortedVersions;

    } catch (err) {
      handleError(err, 'load plan versions');
      return [];
    }
  }, [tenantId, handleError]);

  const fetchPlanVersions = useCallback(async (planId: string): Promise<PlanVersion[]> => {
    return loadPlanVersions(planId);
  }, [loadPlanVersions]);

  // Activate plan version
  const activatePlanVersion = useCallback(async (versionId: string): Promise<boolean> => {
    if (!versionId || !tenantId) {
      console.error('Missing versionId or tenantId for activating plan version');
      return false;
    }

    try {
      setError(null);

      console.log(`Activating plan version: ${versionId}`);

      await api.put(`/api/business-model/plan-versions/${versionId}/activate`, {
        updatedBy: user?.id
      });

      setPlanVersions(prev => prev.map(version => ({
        ...version,
        is_active: version.version_id === versionId
      })));

      console.log('Plan version activated successfully');
      toast.success('Plan version activated successfully');

      return true;

    } catch (err) {
      handleError(err, 'activate plan version');
      return false;
    }
  }, [tenantId, user?.id, handleError]);

  // Create new plan - WITH IDEMPOTENCY SUPPORT
  const createPlan = useCallback(async (planData: CreatePlanRequest): Promise<BusinessModelPlan> => {
    if (!tenantId) {
      throw new Error('No tenant ID available for creating plan');
    }

    // Extract idempotency key if provided
    const idempotencyKey = planData._idempotencyKey;

    // Check for duplicate submission with same idempotency key
    if (idempotencyKey && lastIdempotencyKey.current === idempotencyKey) {
      console.log('Duplicate submission detected with same idempotency key, ignoring');
      throw new Error('Duplicate submission detected');
    }

    try {
      setError(null);
      setIsLoading(true);

      // Track this idempotency key
      if (idempotencyKey) {
        lastIdempotencyKey.current = idempotencyKey;
      }

      console.log('Creating new plan:', planData.name, 'with idempotency key:', idempotencyKey);

      const sanitizedPlanData = ensureCurrencyConsistency(planData);

      const apiData = transformFrontendToApiFormat({
        ...sanitizedPlanData,
        tenantId,
        tenant_id: tenantId,
        createdBy: user?.id,
        created_by: user?.id,
        isLive: isLive,
        is_live: isLive
      });

      // Use postWithIdempotency helper
      const responseData = await postWithIdempotency(
        '/api/business-model/plans',
        apiData,
        idempotencyKey
      );

      const newPlan = transformApiPlanToFrontend(responseData);

      setPlans(prev => [newPlan, ...prev]);

      cache.current.clear();

      console.log(`Plan created successfully: ${newPlan.id}`);
      // Note: Toast is handled by the calling component

      return newPlan;

    } catch (err) {
      const errorMessage = handleError(err, 'create plan');
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [tenantId, user?.id, isLive, handleError]);

  // Update existing plan (metadata only)
  const updatePlan = useCallback(async (planId: string, planData: UpdatePlanRequest): Promise<BusinessModelPlan> => {
    if (!planId || !tenantId) {
      throw new Error('Missing planId or tenantId for updating plan');
    }

    const idempotencyKey = planData._idempotencyKey;

    try {
      setError(null);
      setIsLoading(true);

      console.log(`Updating plan: ${planId}`, idempotencyKey ? `with idempotency key: ${idempotencyKey}` : '');

      const apiData = transformFrontendToApiFormat({
        ...planData,
        updatedBy: user?.id,
        updated_by: user?.id
      });

      // Use putWithIdempotency helper
      const responseData = await putWithIdempotency(
        `/api/business-model/plans/${planId}`,
        apiData,
        idempotencyKey
      );

      const updatedPlan = transformApiPlanToFrontend(responseData);

      setPlans(prev => {
        const index = prev.findIndex(p => p.id === planId || p.plan_id === planId);
        if (index >= 0) {
          const updated = [...prev];
          updated[index] = updatedPlan;
          return updated;
        }
        return prev;
      });

      if (selectedPlan?.id === planId || selectedPlan?.plan_id === planId) {
        setSelectedPlan(updatedPlan);
      }

      console.log(`Plan updated successfully: ${planId}`);
      toast.success('Plan updated successfully');

      return updatedPlan;

    } catch (err) {
      const errorMessage = handleError(err, 'update plan');
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [tenantId, user?.id, selectedPlan, handleError]);

  // Delete plan
  const deletePlan = useCallback(async (planId: string): Promise<void> => {
    if (!planId || !tenantId) {
      throw new Error('Missing planId or tenantId for deleting plan');
    }

    try {
      setError(null);
      setIsLoading(true);

      console.log(`Deleting plan: ${planId}`);

      await api.delete(`/api/business-model/plans/${planId}`);

      setPlans(prev => prev.filter(p => p.id !== planId && p.plan_id !== planId));

      if (selectedPlan?.id === planId || selectedPlan?.plan_id === planId) {
        setSelectedPlan(null);
      }

      console.log(`Plan deleted successfully: ${planId}`);
      toast.success('Plan deleted successfully');

    } catch (err) {
      handleError(err, 'delete plan');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [tenantId, selectedPlan, handleError]);

  // Duplicate plan
  const duplicatePlan = useCallback(async (planId: string, newName?: string): Promise<BusinessModelPlan> => {
    if (!planId || !tenantId) {
      throw new Error('Missing planId or tenantId for duplicating plan');
    }

    try {
      setError(null);
      setIsLoading(true);

      const response = await api.post(`/api/business-model/plans/${planId}/duplicate`, {
        name: newName
      });

      const duplicatedPlan = transformApiPlanToFrontend(response.data);
      setPlans(prev => [duplicatedPlan, ...prev]);

      toast.success('Plan duplicated successfully');
      return duplicatedPlan;

    } catch (err) {
      const errorMessage = handleError(err, 'duplicate plan');
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [tenantId, handleError]);

  // Toggle plan visibility
  const togglePlanVisibility = useCallback(async (planId: string, visible: boolean): Promise<boolean> => {
    if (!planId || !tenantId) {
      console.error('Missing planId or tenantId for toggling plan visibility');
      return false;
    }

    try {
      setError(null);

      console.log(`Toggling plan visibility: ${planId} to ${visible}`);

      const response = await api.put(`/api/business-model/plans/${planId}/visibility`, {
        is_visible: visible,
        updatedBy: user?.id
      });

      const updatedPlan = transformApiPlanToFrontend(response.data);

      if (selectedPlan?.id === planId || selectedPlan?.plan_id === planId) {
        setSelectedPlan(updatedPlan);
      }

      setPlans(prev => {
        const index = prev.findIndex(p => p.id === planId || p.plan_id === planId);
        if (index >= 0) {
          const updated = [...prev];
          updated[index] = updatedPlan;
          return updated;
        }
        return prev;
      });

      console.log(`Plan visibility toggled successfully: ${planId}`);
      toast.success(`Plan ${visible ? 'published' : 'hidden'} successfully`);

      return true;

    } catch (err) {
      handleError(err, 'toggle plan visibility');
      return false;
    }
  }, [tenantId, user?.id, selectedPlan, handleError]);

  // Archive plan
  const archivePlan = useCallback(async (planId: string): Promise<boolean> => {
    if (!planId || !tenantId) {
      console.error('Missing planId or tenantId for archiving plan');
      return false;
    }

    try {
      setError(null);
      setIsLoading(true);

      console.log(`Archiving plan: ${planId}`);

      await api.put(`/api/business-model/plans/${planId}/archive`, {
        updatedBy: user?.id
      });

      if (selectedPlan?.id === planId || selectedPlan?.plan_id === planId) {
        const updatedPlan = { ...selectedPlan, isArchived: true, is_archived: true };
        setSelectedPlan(updatedPlan);
      }

      setPlans(prev => {
        const index = prev.findIndex(p => p.id === planId || p.plan_id === planId);
        if (index >= 0) {
          const updated = [...prev];
          updated[index] = { ...updated[index], isArchived: true, is_archived: true };
          return updated;
        }
        return prev;
      });

      console.log(`Plan archived successfully: ${planId}`);
      // Note: Toast is handled by the calling component for VaNiToast

      return true;

    } catch (err) {
      handleError(err, 'archive plan');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [tenantId, user?.id, selectedPlan, handleError]);

  // Calculate price for a plan with given usage
  const calculatePrice = useCallback(async (planId: string, usage: Record<string, number>): Promise<number> => {
    try {
      const response = await api.post(`/api/business-model/plans/${planId}/calculate-price`, {
        usage
      });
      return response.data.totalPrice;
    } catch (err) {
      handleError(err, 'calculate price');
      return 0;
    }
  }, [handleError]);

  // Validate pricing tiers
  const validatePricing = useCallback(async (tiers: PricingTier[]): Promise<{ isValid: boolean; errors: string[] }> => {
    try {
      const response = await api.post('/api/business-model/validate-pricing', {
        tiers
      });
      return response.data;
    } catch (err) {
      handleError(err, 'validate pricing');
      return { isValid: false, errors: ['Validation failed'] };
    }
  }, [handleError]);

  // Reset edit mode
  const resetEditMode = useCallback(() => {
    setCurrentEditData(null);
    setLoadingEdit(false);
    setSubmitting(false);
  }, []);

  // Get active version for a plan
  const getActiveVersion = useCallback((planId: string): PlanVersion | null => {
    return planVersions.find(version =>
      version.version_id && version.is_active
    ) || null;
  }, [planVersions]);

  // Get version history for a plan
  const getVersionHistory = useCallback((planId: string): PlanVersion[] => {
    return planVersions;
  }, [planVersions]);

  // Load plans when tenant changes
  useEffect(() => {
    if (!tenantId) {
      console.log('No tenant ID, clearing plans');
      setPlans([]);
      setSelectedPlan(null);
      setPlanVersions([]);
      setCurrentEditData(null);
      setError(null);
      isInitialized.current = false;
      lastTenantId.current = null;
      return;
    }

    if (tenantId !== lastTenantId.current || !isInitialized.current) {
      console.log('Tenant changed or not initialized, loading plans:', tenantId);

      lastTenantId.current = tenantId;
      isInitialized.current = true;

      setPlans([]);
      setSelectedPlan(null);
      setPlanVersions([]);
      setCurrentEditData(null);
      setError(null);
      cache.current.clear();

      setTimeout(() => {
        loadPlans();
      }, 100);
    }
  }, [tenantId]);

  // Update filters when isLive changes
  useEffect(() => {
    setFiltersState(prev => ({
      ...prev,
      isLive,
      is_live: isLive
    }));
  }, [isLive]);

  // Environment change listener
  useEffect(() => {
    const handleEnvironmentChange = (event: CustomEvent) => {
      console.log('Environment changed event received in useBusinessModel');
      clearAllData();
    };

    window.addEventListener('environment-changed' as any, handleEnvironmentChange);

    return () => {
      window.removeEventListener('environment-changed' as any, handleEnvironmentChange);
    };
  }, [clearAllData]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      console.log('useBusinessModel cleanup started');
      activeRequests.current.clear();
      cache.current.clear();
      console.log('useBusinessModel cleanup completed');
    };
  }, []);

  // Utility functions
  const clearSelectedPlan = useCallback(() => {
    setSelectedPlan(null);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const refreshPlans = useCallback(async (): Promise<void> => {
    cache.current.clear();
    await loadPlans();
  }, [loadPlans]);

  const setFilters = useCallback((newFilters: Partial<PlanFilters>) => {
    setFiltersState(prev => ({ ...prev, ...newFilters }));
  }, []);

  const resetFilters = useCallback(() => {
    setFiltersState({
      isLive: isLive,
      is_live: isLive,
      sortBy: 'updatedAt',
      sort_by: 'updated_at',
      sortOrder: 'desc',
      sort_order: 'desc',
      page: 1,
      limit: 20
    });
  }, [isLive]);

  // Computed values for detail view
  const features = useMemo(() => {
    return selectedPlan?.features || selectedPlan?.activeVersion?.features || selectedPlan?.active_version?.features || [];
  }, [selectedPlan]);

  const notifications = useMemo(() => {
    return selectedPlan?.notifications || selectedPlan?.activeVersion?.notifications || selectedPlan?.active_version?.notifications || [];
  }, [selectedPlan]);

  const tiers = useMemo(() => {
    return selectedPlan?.tiers || selectedPlan?.activeVersion?.tiers || selectedPlan?.active_version?.tiers || [];
  }, [selectedPlan]);

  // Memoized return object
  return useMemo(() => ({
    plans,
    selectedPlan,
    currentPlan: selectedPlan,
    planVersions,
    currentEditData,
    isLoading,
    loading: isLoading,
    loadingEdit,
    submitting,
    error,
    filters,
    features,
    notifications,
    tiers,
    loadPlans,
    loadPlanDetails,
    fetchPlan,
    createPlan,
    updatePlan,
    deletePlan,
    duplicatePlan,
    loadPlanForEdit,
    updatePlanAsNewVersion,
    loadPlanVersions,
    fetchPlanVersions,
    activatePlanVersion,
    resetEditMode,
    togglePlanVisibility,
    archivePlan,
    calculatePrice,
    validatePricing,
    clearSelectedPlan,
    clearError,
    refreshPlans,
    setFilters,
    resetFilters,
    getActiveVersion,
    getVersionHistory,
    clearAllData,
  }), [
    plans,
    selectedPlan,
    planVersions,
    currentEditData,
    isLoading,
    loadingEdit,
    submitting,
    error,
    filters,
    features,
    notifications,
    tiers,
    loadPlans,
    loadPlanDetails,
    fetchPlan,
    createPlan,
    updatePlan,
    deletePlan,
    duplicatePlan,
    loadPlanForEdit,
    updatePlanAsNewVersion,
    loadPlanVersions,
    fetchPlanVersions,
    activatePlanVersion,
    resetEditMode,
    togglePlanVisibility,
    archivePlan,
    calculatePrice,
    validatePricing,
    clearSelectedPlan,
    clearError,
    refreshPlans,
    setFilters,
    resetFilters,
    getActiveVersion,
    getVersionHistory,
    clearAllData
  ]);
};

// Export types
export type {
  BusinessModelPlan,
  PricingTier,
  PlanFeature,
  NotificationConfig,
  PlanVersion,
  CreatePlanRequest,
  UpdatePlanRequest,
  EditPlanData,
  PlanFilters,
  UseBusinessModelReturn
};
