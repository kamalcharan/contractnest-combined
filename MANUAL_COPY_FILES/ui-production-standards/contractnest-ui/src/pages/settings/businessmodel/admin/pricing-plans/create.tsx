// src/pages/settings/businessmodel/admin/pricing-plans/create.tsx
// UPDATED: Glassmorphic design, VaNiLoader, VaNiToast, Idempotency, Race Condition Handling

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { FormProvider, useForm } from 'react-hook-form';
import { ArrowLeft, Save, Sparkles } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { analyticsService } from '@/services/analytics.service';

// Updated imports - VaNiToast instead of react-hot-toast
import { vaniToast } from '@/components/common/toast/VaNiToast';
import { VaNiLoader, SectionLoader } from '@/components/common/loaders/UnifiedLoader';

import {
  useBusinessModel,
  CreatePlanRequest
} from '@/hooks/useBusinessModel';
import { getDefaultCurrency } from '@/utils/constants/currencies';
import { PLAN_TYPES } from '@/utils/constants/businessModelConstants';

// Import Wizard Components
import FormWizard from '@/components/businessmodel/planform/FormWizard';
import BasicInfoStep from '@/components/businessmodel/planform/BasicInfoStep';
import PricingTiersStep from '@/components/businessmodel/planform/PricingTiersStep';
import FeaturesStep from '@/components/businessmodel/planform/FeaturesStep';
import NotificationsStep from '@/components/businessmodel/planform/NotificationsStep';
import ReviewStep from '@/components/businessmodel/planform/ReviewStep';

type PlanType = typeof PLAN_TYPES[number];

interface PricingPlanFormData {
  productCode: string;
  name: string;
  description: string;
  planType: PlanType;
  trialDuration: number;
  isVisible: boolean;
  defaultCurrencyCode: string;
  supportedCurrencies: string[];
  tiers: Array<{
    tier_id?: string;
    minValue: number;
    maxValue: number | null;
    label?: string;
    prices: Record<string, number>;
  }>;
  features: Array<{
    feature_id: string;
    name?: string;
    enabled: boolean;
    limit: number;
    trial_limit: number;
    trial_enabled: boolean;
    test_env_limit: number;
    is_special_feature?: boolean;
    pricing_period: 'monthly' | 'quarterly' | 'annually';
    prices?: Record<string, number>;
  }>;
  notifications: Array<{
    notif_type: string;
    category: string;
    enabled: boolean;
    credits_per_unit: number;
    prices: Record<string, number>;
  }>;
}

// Generate idempotency key for mutation requests
const generateIdempotencyKey = (): string => {
  return `plan_create_${Date.now()}_${crypto.randomUUID()}`;
};

const CreatePricingPlanPage: React.FC = () => {
  const navigate = useNavigate();
  const { isLive } = useAuth();
  const { isDarkMode, currentTheme } = useTheme();
  const { createPlan, submitting, isLoading } = useBusinessModel();
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);

  // Race condition prevention refs
  const idempotencyKeyRef = useRef<string | null>(null);
  const submissionInProgressRef = useRef(false);
  const lastSubmissionTimeRef = useRef<number>(0);
  const DEBOUNCE_MS = 2000; // Prevent rapid submissions

  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;
  const defaultCurrency = getDefaultCurrency();

  const methods = useForm<PricingPlanFormData>({
    defaultValues: {
      productCode: '',
      name: '',
      description: '',
      planType: 'Per User',
      trialDuration: 7,
      isVisible: true,
      defaultCurrencyCode: defaultCurrency.code,
      supportedCurrencies: [defaultCurrency.code],
      tiers: [
        {
          tier_id: `tier_${Date.now()}`,
          minValue: 1,
          maxValue: 10,
          prices: { [defaultCurrency.code]: 0 }
        }
      ],
      features: [],
      notifications: [
        {
          notif_type: 'Email',
          category: 'Transactional',
          enabled: true,
          credits_per_unit: 25,
          prices: { [defaultCurrency.code]: 0 }
        }
      ]
    },
    mode: 'onBlur'
  });

  // Track page view and initialize
  useEffect(() => {
    analyticsService.trackPageView(
      'settings/businessmodel/admin/pricing-plans/create',
      'Create Pricing Plan'
    );

    // Simulate initialization delay for smooth loading transition
    const timer = setTimeout(() => {
      setIsInitializing(false);
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  // Navigation handlers
  const handleBack = useCallback(() => {
    navigate('/settings/businessmodel/admin/pricing-plans');
  }, [navigate]);

  const handleCancel = useCallback(() => {
    const isDirty = methods.formState.isDirty;

    if (isDirty) {
      const confirmed = window.confirm('You have unsaved changes. Are you sure you want to cancel?');
      if (!confirmed) return;
    }

    navigate('/settings/businessmodel/admin/pricing-plans');
  }, [methods.formState.isDirty, navigate]);

  // Define wizard steps configuration
  const wizardSteps = [
    { id: 'basic-info', title: 'Basic Info', component: <BasicInfoStep /> },
    { id: 'pricing-tiers', title: 'Pricing', component: <PricingTiersStep /> },
    { id: 'features', title: 'Features', component: <FeaturesStep /> },
    { id: 'notifications', title: 'Credits', component: <NotificationsStep /> },
    { id: 'review', title: 'Review', component: <ReviewStep /> }
  ];

  // Handle step navigation with validation
  const changeStep = useCallback(async (newStep: number) => {
    if (newStep > currentStep) {
      let hasErrors = false;

      if (currentStep === 0) {
        const { productCode, name, defaultCurrencyCode, supportedCurrencies } = methods.getValues();
        if (!productCode || !name || !defaultCurrencyCode || !supportedCurrencies || supportedCurrencies.length === 0) {
          hasErrors = true;
          if (!productCode) vaniToast.error("Product selection is required");
          if (!name) vaniToast.error("Plan name is required");
          if (!defaultCurrencyCode || !supportedCurrencies || supportedCurrencies.length === 0) {
            vaniToast.error("At least one currency must be selected");
          }
        }
      } else if (currentStep === 1) {
        const tiers = methods.getValues('tiers');
        if (!tiers || tiers.length === 0) {
          hasErrors = true;
          vaniToast.error("At least one pricing tier is required");
        } else {
          const supportedCurrencies = methods.getValues('supportedCurrencies');
          const invalidTiers = tiers.filter(tier => {
            if (!tier.prices) return true;
            return supportedCurrencies.some(currency =>
              tier.prices[currency] === undefined || tier.prices[currency] === null
            );
          });

          if (invalidTiers.length > 0) {
            hasErrors = true;
            vaniToast.error("Please set prices for all tiers in all supported currencies");
          }
        }
      }

      if (hasErrors) return;
    }

    if (newStep >= 0 && newStep < wizardSteps.length) {
      setCurrentStep(newStep);
    }
  }, [currentStep, methods, wizardSteps.length]);

  // Transform form data to API request format
  const transformFormDataToApiRequest = useCallback((data: PricingPlanFormData): CreatePlanRequest => {
    const generateTierLabel = (minValue: number, maxValue: number | null, planType: string): string => {
      const unit = planType === 'Per User' ? 'Users' : 'Contracts';
      if (maxValue === null) return `${minValue}+ ${unit}`;
      return `${minValue} - ${maxValue} ${unit}`;
    };

    return {
      productCode: data.productCode,
      product_code: data.productCode,
      name: data.name,
      description: data.description,
      planType: data.planType,
      plan_type: data.planType,
      defaultCurrencyCode: data.defaultCurrencyCode,
      default_currency_code: data.defaultCurrencyCode,
      supportedCurrencies: data.supportedCurrencies,
      supported_currencies: data.supportedCurrencies,
      tiers: data.tiers.map((tier, index) => ({
        tier_id: tier.tier_id || `tier_${Date.now()}_${index}`,
        minValue: tier.minValue,
        min_value: tier.minValue,
        maxValue: tier.maxValue,
        max_value: tier.maxValue,
        basePrice: tier.prices[data.defaultCurrencyCode] || 0,
        base_price: tier.prices[data.defaultCurrencyCode] || 0,
        unitPrice: tier.prices[data.defaultCurrencyCode] || 0,
        unit_price: tier.prices[data.defaultCurrencyCode] || 0,
        label: tier.label || generateTierLabel(tier.minValue, tier.maxValue, data.planType),
        prices: tier.prices || {}
      })),
      isActive: true,
      is_active: true,
      isLive: true,
      is_live: true,
      trialPeriodDays: data.trialDuration,
      trial_duration: data.trialDuration,
      features: data.features
        .filter(feature => feature.feature_id)
        .map(feature => ({
          feature_id: feature.feature_id,
          name: feature.name || '',
          enabled: feature.enabled,
          limit: feature.limit,
          trial_limit: feature.trial_limit,
          trial_enabled: feature.trial_enabled,
          test_env_limit: feature.test_env_limit,
          is_special_feature: feature.is_special_feature || false,
          pricing_period: feature.pricing_period,
          prices: feature.is_special_feature && feature.prices ? feature.prices : undefined
        })),
      notifications: data.notifications
        .filter(notification => notification.notif_type)
        .map(notification => ({
          notif_type: notification.notif_type,
          category: notification.category,
          enabled: notification.enabled,
          credits_per_unit: notification.credits_per_unit,
          prices: notification.prices || {}
        })),
      initial_version: {
        version_number: '1.0',
        is_active: true,
        effective_date: new Date().toISOString(),
        changelog: 'Initial version created with plan',
        tiers: data.tiers.map((tier, index) => ({
          tier_id: tier.tier_id || `tier_${Date.now()}_${index}`,
          min_value: tier.minValue,
          max_value: tier.maxValue,
          label: tier.label || generateTierLabel(tier.minValue, tier.maxValue, data.planType),
          prices: tier.prices || {}
        })),
        features: data.features
          .filter(feature => feature.feature_id)
          .map(feature => ({
            feature_id: feature.feature_id,
            name: feature.name || '',
            enabled: feature.enabled,
            limit: feature.limit,
            trial_limit: feature.trial_limit,
            trial_enabled: feature.trial_enabled,
            test_env_limit: feature.test_env_limit,
            is_special_feature: feature.is_special_feature || false,
            pricing_period: feature.pricing_period,
            prices: feature.is_special_feature && feature.prices ? feature.prices : undefined
          })),
        notifications: data.notifications
          .filter(notification => notification.notif_type)
          .map(notification => ({
            notif_type: notification.notif_type,
            category: notification.category,
            enabled: notification.enabled,
            credits_per_unit: notification.credits_per_unit,
            prices: notification.prices || {}
          }))
      }
    };
  }, []);

  // Handle form submission with race condition prevention
  const handleSubmit = useCallback(async (data: PricingPlanFormData) => {
    // Race condition check 1: Prevent if already submitting
    if (submissionInProgressRef.current || isSubmitting || submitting) {
      console.log('Submission already in progress, ignoring duplicate request');
      vaniToast.warning('Submission in progress, please wait...');
      return;
    }

    // Race condition check 2: Debounce rapid submissions
    const now = Date.now();
    if (now - lastSubmissionTimeRef.current < DEBOUNCE_MS) {
      console.log('Submission debounced - too rapid');
      vaniToast.warning('Please wait before submitting again');
      return;
    }

    // Generate new idempotency key for this submission
    idempotencyKeyRef.current = generateIdempotencyKey();
    const currentIdempotencyKey = idempotencyKeyRef.current;

    try {
      // Lock submission
      submissionInProgressRef.current = true;
      lastSubmissionTimeRef.current = now;
      setIsSubmitting(true);

      console.log('Starting plan creation with idempotency key:', currentIdempotencyKey);

      // Final validation
      if (!data.tiers || data.tiers.length === 0) {
        vaniToast.error("Please add at least one pricing tier before creating the plan.");
        return;
      }

      const invalidTiers = data.tiers.filter(tier => {
        if (!tier.prices) return true;
        return data.supportedCurrencies.some(currency =>
          tier.prices[currency] === undefined || tier.prices[currency] === null
        );
      });

      if (invalidTiers.length > 0) {
        vaniToast.error("Please set prices for all tiers in all supported currencies.");
        return;
      }

      // Transform and submit
      const apiRequestData = transformFormDataToApiRequest(data);

      // Pass idempotency key through the request
      const createdPlan = await createPlan({
        ...apiRequestData,
        _idempotencyKey: currentIdempotencyKey
      } as CreatePlanRequest);

      if (createdPlan) {
        console.log('Plan created successfully:', createdPlan);
        vaniToast.success('Plan created successfully!', {
          message: `${data.name} has been created`
        });

        setTimeout(() => {
          const planId = createdPlan.id || createdPlan.plan_id;
          navigate(`/settings/businessmodel/admin/pricing-plans/${planId}`, {
            replace: true
          });
        }, 100);
      } else {
        console.error('Plan creation returned null');
        vaniToast.error("Failed to create plan", { message: "Please try again" });
      }
    } catch (error) {
      console.error('Error in form submission:', error);
      vaniToast.error("An error occurred", { message: "Please try again" });
    } finally {
      // Unlock submission
      submissionInProgressRef.current = false;
      setIsSubmitting(false);
    }
  }, [isSubmitting, submitting, createPlan, transformFormDataToApiRequest, navigate]);

  // Render current step with form context
  const renderCurrentStep = () => {
    return (
      <FormProvider {...methods}>
        <div onClick={(e) => e.stopPropagation()}>
          {wizardSteps[currentStep].component}
        </div>
      </FormProvider>
    );
  };

  // Navigation button handlers
  const handlePrevious = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    changeStep(currentStep - 1);
  };

  const handleNext = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    changeStep(currentStep + 1);
  };

  const handleFinalSubmit = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    methods.handleSubmit(handleSubmit)();
  };

  // Show VaNiLoader during initialization
  if (isInitializing) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: colors.utility.primaryBackground }}
      >
        <VaNiLoader
          size="lg"
          message="PREPARING WIZARD"
          showSkeleton={true}
          skeletonVariant="card"
          skeletonCount={3}
        />
      </div>
    );
  }

  return (
    <div
      className="min-h-screen p-6 transition-colors"
      style={{ backgroundColor: colors.utility.primaryBackground }}
    >
      {/* Glassmorphic Page Container */}
      <div
        className="max-w-5xl mx-auto rounded-2xl overflow-hidden shadow-2xl"
        style={{
          backgroundColor: isDarkMode
            ? 'rgba(30, 41, 59, 0.8)'
            : 'rgba(255, 255, 255, 0.9)',
          backdropFilter: 'blur(12px)',
          border: `1px solid ${isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}`
        }}
      >
        {/* Page Header */}
        <div
          className="px-6 py-4 border-b flex items-center"
          style={{
            borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
            backgroundColor: isDarkMode
              ? 'rgba(15, 23, 42, 0.6)'
              : 'rgba(248, 250, 252, 0.8)'
          }}
        >
          <button
            onClick={handleBack}
            className="mr-4 p-2 rounded-xl hover:opacity-80 transition-all"
            style={{
              backgroundColor: `${colors.brand.primary}20`,
              color: colors.brand.primary
            }}
            type="button"
            aria-label="Go back to plans list"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex-1">
            <h1
              className="text-xl font-bold transition-colors flex items-center gap-2"
              style={{ color: colors.utility.primaryText }}
            >
              <Sparkles className="h-5 w-5" style={{ color: colors.brand.primary }} />
              Create Pricing Plan
            </h1>
            <p
              className="text-sm transition-colors"
              style={{ color: colors.utility.secondaryText }}
            >
              Configure a new pricing plan for your tenants
            </p>
          </div>
        </div>

        {/* Form Wizard Steps Navigation */}
        <div className="px-6 py-4">
          <FormWizard
            steps={wizardSteps}
            currentStepIndex={currentStep}
            onStepChange={changeStep}
          />
        </div>

        {/* Step Content Container */}
        <div
          className="mx-6 mb-6 rounded-xl border overflow-hidden"
          style={{
            backgroundColor: isDarkMode
              ? 'rgba(15, 23, 42, 0.4)'
              : 'rgba(255, 255, 255, 0.6)',
            borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)'
          }}
        >
          <div
            className="px-6 py-3 border-b"
            style={{
              backgroundColor: isDarkMode
                ? 'rgba(30, 41, 59, 0.4)'
                : 'rgba(248, 250, 252, 0.6)',
              borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)'
            }}
          >
            <h2
              className="text-lg font-semibold"
              style={{ color: colors.utility.primaryText }}
            >
              {wizardSteps[currentStep].title}
            </h2>
          </div>

          <div className="p-6">
            {/* Show loader during step transitions or data loading */}
            {isLoading ? (
              <SectionLoader
                message="Loading..."
                variant="vani"
                height="md"
                skeletonVariant="list"
                skeletonCount={3}
              />
            ) : (
              renderCurrentStep()
            )}
          </div>
        </div>

        {/* Navigation Buttons */}
        <div
          className="px-6 py-4 border-t flex justify-between"
          style={{
            borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
            backgroundColor: isDarkMode
              ? 'rgba(15, 23, 42, 0.6)'
              : 'rgba(248, 250, 252, 0.8)'
          }}
        >
          {currentStep === 0 ? (
            <button
              type="button"
              onClick={handleCancel}
              className="px-4 py-2 rounded-xl border hover:opacity-80 transition-all"
              style={{
                borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)',
                backgroundColor: 'transparent',
                color: colors.utility.primaryText
              }}
            >
              Cancel
            </button>
          ) : (
            <button
              type="button"
              onClick={handlePrevious}
              className="px-4 py-2 rounded-xl border hover:opacity-80 transition-all"
              style={{
                borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)',
                backgroundColor: 'transparent',
                color: colors.utility.primaryText
              }}
            >
              Previous
            </button>
          )}

          {currentStep < wizardSteps.length - 1 ? (
            <button
              type="button"
              onClick={handleNext}
              disabled={submitting || isSubmitting}
              className="px-6 py-2 rounded-xl text-white hover:opacity-90 transition-all disabled:opacity-70 shadow-lg"
              style={{
                background: `linear-gradient(135deg, ${colors.brand.primary}, ${colors.brand.secondary})`
              }}
            >
              Next
            </button>
          ) : (
            <button
              type="button"
              onClick={handleFinalSubmit}
              disabled={submitting || isSubmitting}
              className="px-6 py-2 rounded-xl text-white hover:opacity-90 transition-all disabled:opacity-70 flex items-center shadow-lg"
              style={{
                background: `linear-gradient(135deg, ${colors.brand.primary}, ${colors.brand.secondary})`
              }}
            >
              {submitting || isSubmitting ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Creating Plan...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Create Plan
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Environment Warning for Test Mode */}
      {!isLive && (
        <div
          className="max-w-5xl mx-auto mt-6 p-4 rounded-xl border"
          style={{
            backgroundColor: `${colors.semantic.warning}10`,
            borderColor: `${colors.semantic.warning}40`,
            backdropFilter: 'blur(8px)'
          }}
        >
          <p
            className="text-sm flex items-center"
            style={{ color: colors.semantic.warning }}
          >
            <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            You are in the Test Environment. Plans created here will not affect live customers.
          </p>
        </div>
      )}
    </div>
  );
};

export default CreatePricingPlanPage;
