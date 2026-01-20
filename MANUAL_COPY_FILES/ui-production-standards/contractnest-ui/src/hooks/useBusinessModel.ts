// hooks/useBusinessModel.ts - UPDATED WITH PRODUCT FILTER SUPPORT

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import api from '@/services/api';
import { toast } from 'react-hot-toast';

// Types (abbreviated - keep same as original)
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
  return {
    ...frontendData,
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
  };
};

const ensureCurrencyConsistency = (data: any): any => {
  const supportedCurrencies = data.supported_currencies || data.supportedCurrencies || [];
  if (data.tiers) {
    data.tiers = data.tiers.map((tier: any) => {
      const prices = { ...tier.prices };
      supportedCurrencies.forEach((currency: string) => {
        if (prices[currency] === undefined || prices[currency] === null) {
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
          prices[currency] = 0;
        }
      });
      return { ...notif, prices };
    });
  }
  return data;
};

export const useBusinessModel = () => {
  const { currentTenant, user, isLive } = useAuth();
  const tenantId = currentTenant?.id;

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

  const activeRequests = useRef<Map<string, Promise<any>>>(new Map());
  const cache = useRef<Map<string, { data: any; timestamp: number; ttl: number }>>(new Map());
  const lastTenantId = useRef<string | null>(null);
  const isInitialized = useRef(false);

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

  const clearAllData = useCallback(() => {
    setPlans([]);
    setSelectedPlan(null);
    setPlanVersions([]);
    setCurrentEditData(null);
    setError(null);
    cache.current.clear();
    activeRequests.current.clear();
    isInitialized.current = false;
  }, []);

  /**
   * Load plans with optional product filter
   * @param filterOverrides - Optional filter overrides
   * @param productCode - Optional product code filter. Empty string or 'all' means no filter.
   */
  const loadPlans = useCallback(async (filterOverrides?: PlanFilters, productCode?: string): Promise<void> => {
    if (!tenantId) {
      console.warn('No tenant ID available for loading plans');
      return;
    }

    if (isLoading) {
      console.log('Already loading plans, skipping duplicate call');
      return;
    }

    // Determine effective product code (empty string means all products)
    const effectiveProductCode = productCode === 'all' ? '' : (productCode || '');
    const requestKey = `plans_${tenantId}_${isLive}_${effectiveProductCode}`;

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

      // Build URL with product_code filter
      // IMPORTANT: Always pass product_code param - empty string means "all products" (no filter)
      let url = `/api/business-model/plans?isLive=${isLive}&product_code=${encodeURIComponent(effectiveProductCode)}`;

      console.log(`[useBusinessModel] Fetching plans from: ${url}`);

      const requestPromise = api.get(url);
      activeRequests.current.set(requestKey, requestPromise);

      const response = await requestPromise;

      let finalPlansData: BusinessModelPlan[] = [];
      if (Array.isArray(response.data)) {
        finalPlansData = response.data;
      } else if (response.data?.plans && Array.isArray(response.data.plans)) {
        finalPlansData = response.data.plans;
      } else if (response.data?.data && Array.isArray(response.data.data)) {
        finalPlansData = response.data.data;
      } else {
        finalPlansData = [];
      }

      const transformedPlans = finalPlansData.map(transformApiPlanToFrontend);
      console.log(`[useBusinessModel] Loaded ${transformedPlans.length} plans for product: ${effectiveProductCode || 'ALL'}`);
      setPlans(transformedPlans);

    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }
      handleError(err, 'load plans');
      setPlans([]);
    } finally {
      setIsLoading(false);
      activeRequests.current.delete(requestKey);
    }
  }, [tenantId, isLive, isLoading, handleError]);

  const loadPlanDetails = useCallback(async (planId: string): Promise<BusinessModelPlan | null> => {
    if (!planId || !tenantId) return null;
    try {
      setError(null);
      setIsLoading(true);
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

  const loadPlanForEdit = useCallback(async (planId: string): Promise<EditPlanData | null> => {
    if (!planId || !tenantId) return null;
    try {
      setError(null);
      setLoadingEdit(true);
      const response = await api.get(`/api/business-model/plans/${planId}/edit`);
      const editData = response.data;
      if (editData) {
        const fixedEditData = ensureCurrencyConsistency(editData);
        setCurrentEditData(fixedEditData);
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

  const updatePlanAsNewVersion = useCallback(async (editData: EditPlanData): Promise<any> => {
    if (!editData.plan_id || !tenantId) return null;
    try {
      setError(null);
      setSubmitting(true);
      const sanitizedData = ensureCurrencyConsistency(editData);
      const response = await api.post(`/api/business-model/plans/edit`, {
        ...sanitizedData,
        updatedBy: user?.id,
        updated_by: user?.id
      });
      const result = response.data;
      await loadPlans();
      setCurrentEditData(null);
      toast.success('Plan updated successfully');
      return result;
    } catch (err: any) {
      if (err.response?.data?.details && Array.isArray(err.response.data.details)) {
        const errorMessage = 'Validation Failed:\n' + err.response.data.details.join('\n');
        toast.error(errorMessage, { duration: 6000 });
        setError(`Validation failed: ${err.response.data.details.join(', ')}`);
        return null;
      }
      handleError(err, 'update plan as new version');
      return null;
    } finally {
      setSubmitting(false);
    }
  }, [tenantId, user?.id, handleError, loadPlans]);

  const loadPlanVersions = useCallback(async (planId: string): Promise<PlanVersion[]> => {
    if (!planId || !tenantId) return [];
    try {
      setError(null);
      const response = await api.get(`/api/business-model/plan-versions?planId=${planId}`);
      const versions = response.data || [];
      const sortedVersions = versions.sort((a: PlanVersion, b: PlanVersion) => {
        const aNum = parseFloat(a.version_number || '0');
        const bNum = parseFloat(b.version_number || '0');
        return bNum - aNum;
      });
      setPlanVersions(sortedVersions);
      return sortedVersions;
    } catch (err) {
      handleError(err, 'load plan versions');
      return [];
    }
  }, [tenantId, handleError]);

  const fetchPlanVersions = useCallback(async (planId: string): Promise<PlanVersion[]> => {
    return loadPlanVersions(planId);
  }, [loadPlanVersions]);

  const activatePlanVersion = useCallback(async (versionId: string): Promise<boolean> => {
    if (!versionId || !tenantId) return false;
    try {
      setError(null);
      await api.put(`/api/business-model/plan-versions/${versionId}/activate`, {
        updatedBy: user?.id
      });
      setPlanVersions(prev => prev.map(version => ({
        ...version,
        is_active: version.version_id === versionId
      })));
      toast.success('Plan version activated successfully');
      return true;
    } catch (err) {
      handleError(err, 'activate plan version');
      return false;
    }
  }, [tenantId, user?.id, handleError]);

  const createPlan = useCallback(async (planData: CreatePlanRequest): Promise<BusinessModelPlan> => {
    if (!tenantId) throw new Error('No tenant ID available for creating plan');
    try {
      setError(null);
      setIsLoading(true);
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
      const response = await api.post('/api/business-model/plans', apiData);
      const newPlan = transformApiPlanToFrontend(response.data);
      setPlans(prev => [newPlan, ...prev]);
      cache.current.clear();
      toast.success('Plan created successfully');
      return newPlan;
    } catch (err) {
      const errorMessage = handleError(err, 'create plan');
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [tenantId, user?.id, isLive, handleError]);

  const updatePlan = useCallback(async (planId: string, planData: UpdatePlanRequest): Promise<BusinessModelPlan> => {
    if (!planId || !tenantId) throw new Error('Missing planId or tenantId for updating plan');
    try {
      setError(null);
      setIsLoading(true);
      const apiData = transformFrontendToApiFormat({
        ...planData,
        updatedBy: user?.id,
        updated_by: user?.id
      });
      const response = await api.put(`/api/business-model/plans/${planId}`, apiData);
      const updatedPlan = transformApiPlanToFrontend(response.data);
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
      toast.success('Plan updated successfully');
      return updatedPlan;
    } catch (err) {
      const errorMessage = handleError(err, 'update plan');
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [tenantId, user?.id, selectedPlan, handleError]);

  const deletePlan = useCallback(async (planId: string): Promise<void> => {
    if (!planId || !tenantId) throw new Error('Missing planId or tenantId for deleting plan');
    try {
      setError(null);
      setIsLoading(true);
      await api.delete(`/api/business-model/plans/${planId}`);
      setPlans(prev => prev.filter(p => p.id !== planId && p.plan_id !== planId));
      if (selectedPlan?.id === planId || selectedPlan?.plan_id === planId) {
        setSelectedPlan(null);
      }
      toast.success('Plan deleted successfully');
    } catch (err) {
      handleError(err, 'delete plan');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [tenantId, selectedPlan, handleError]);

  const duplicatePlan = useCallback(async (planId: string, newName?: string): Promise<BusinessModelPlan> => {
    if (!planId || !tenantId) throw new Error('Missing planId or tenantId for duplicating plan');
    try {
      setError(null);
      setIsLoading(true);
      const response = await api.post(`/api/business-model/plans/${planId}/duplicate`, { name: newName });
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

  const togglePlanVisibility = useCallback(async (planId: string, visible: boolean): Promise<boolean> => {
    if (!planId || !tenantId) return false;
    try {
      setError(null);
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
      toast.success(`Plan ${visible ? 'published' : 'hidden'} successfully`);
      return true;
    } catch (err) {
      handleError(err, 'toggle plan visibility');
      return false;
    }
  }, [tenantId, user?.id, selectedPlan, handleError]);

  const archivePlan = useCallback(async (planId: string): Promise<boolean> => {
    if (!planId || !tenantId) return false;
    try {
      setError(null);
      setIsLoading(true);
      await api.put(`/api/business-model/plans/${planId}/archive`, { updatedBy: user?.id });
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
      toast.success('Plan archived successfully');
      return true;
    } catch (err) {
      handleError(err, 'archive plan');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [tenantId, user?.id, selectedPlan, handleError]);

  const calculatePrice = useCallback(async (planId: string, usage: Record<string, number>): Promise<number> => {
    try {
      const response = await api.post(`/api/business-model/plans/${planId}/calculate-price`, { usage });
      return response.data.totalPrice;
    } catch (err) {
      handleError(err, 'calculate price');
      return 0;
    }
  }, [handleError]);

  const validatePricing = useCallback(async (tiers: PricingTier[]): Promise<{ isValid: boolean; errors: string[] }> => {
    try {
      const response = await api.post('/api/business-model/validate-pricing', { tiers });
      return response.data;
    } catch (err) {
      handleError(err, 'validate pricing');
      return { isValid: false, errors: ['Validation failed'] };
    }
  }, [handleError]);

  const resetEditMode = useCallback(() => {
    setCurrentEditData(null);
    setLoadingEdit(false);
    setSubmitting(false);
  }, []);

  const getActiveVersion = useCallback((planId: string): PlanVersion | null => {
    return planVersions.find(version => version.version_id && version.is_active) || null;
  }, [planVersions]);

  const getVersionHistory = useCallback((planId: string): PlanVersion[] => {
    return planVersions;
  }, [planVersions]);

  // Load plans when tenant changes
  useEffect(() => {
    if (!tenantId) {
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

  useEffect(() => {
    setFiltersState(prev => ({ ...prev, isLive, is_live: isLive }));
  }, [isLive]);

  useEffect(() => {
    const handleEnvironmentChange = () => clearAllData();
    window.addEventListener('environment-changed' as any, handleEnvironmentChange);
    return () => window.removeEventListener('environment-changed' as any, handleEnvironmentChange);
  }, [clearAllData]);

  useEffect(() => {
    return () => {
      activeRequests.current.clear();
      cache.current.clear();
    };
  }, []);

  const clearSelectedPlan = useCallback(() => setSelectedPlan(null), []);
  const clearError = useCallback(() => setError(null), []);
  const refreshPlans = useCallback(async (): Promise<void> => {
    cache.current.clear();
    await loadPlans();
  }, [loadPlans]);
  const setFilters = useCallback((newFilters: Partial<PlanFilters>) => {
    setFiltersState(prev => ({ ...prev, ...newFilters }));
  }, []);
  const resetFilters = useCallback(() => {
    setFiltersState({
      isLive,
      is_live: isLive,
      sortBy: 'updatedAt',
      sort_by: 'updated_at',
      sortOrder: 'desc',
      sort_order: 'desc',
      page: 1,
      limit: 20
    });
  }, [isLive]);

  const features = useMemo(() => selectedPlan?.features || selectedPlan?.activeVersion?.features || selectedPlan?.active_version?.features || [], [selectedPlan]);
  const notifications = useMemo(() => selectedPlan?.notifications || selectedPlan?.activeVersion?.notifications || selectedPlan?.active_version?.notifications || [], [selectedPlan]);
  const tiers = useMemo(() => selectedPlan?.tiers || selectedPlan?.activeVersion?.tiers || selectedPlan?.active_version?.tiers || [], [selectedPlan]);

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
    plans, selectedPlan, planVersions, currentEditData, isLoading, loadingEdit, submitting, error, filters,
    features, notifications, tiers, loadPlans, loadPlanDetails, fetchPlan, createPlan, updatePlan, deletePlan,
    duplicatePlan, loadPlanForEdit, updatePlanAsNewVersion, loadPlanVersions, fetchPlanVersions, activatePlanVersion,
    resetEditMode, togglePlanVisibility, archivePlan, calculatePrice, validatePricing, clearSelectedPlan,
    clearError, refreshPlans, setFilters, resetFilters, getActiveVersion, getVersionHistory, clearAllData
  ]);
};

export type {
  BusinessModelPlan,
  PricingTier,
  PlanFeature,
  NotificationConfig,
  PlanVersion,
  CreatePlanRequest,
  UpdatePlanRequest,
  EditPlanData,
  PlanFilters
};
