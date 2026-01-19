// src/pages/settings/businessmodel/admin/pricing-plans/create.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FormProvider, useForm } from 'react-hook-form';
import { ArrowLeft, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { analyticsService } from '@/services/analytics.service';

// ✅ FIXED: Updated imports
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

// ✅ FIXED: Define PlanType locally
type PlanType = typeof PLAN_TYPES[number];

/**
 * ✅ FIXED: Updated form data interface
 */
interface PricingPlanFormData {
  productCode: string; // Product this plan belongs to
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

const CreatePricingPlanPage: React.FC = () => {
  const navigate = useNavigate();
  const { isLive } = useAuth();
  const { isDarkMode, currentTheme } = useTheme();
  const { createPlan, submitting } = useBusinessModel();
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Get theme colors
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;
  
  // Get default currency for form initialization
  const defaultCurrency = getDefaultCurrency();
  
  // ✅ FIXED: Updated default values
  const methods = useForm<PricingPlanFormData>({
    defaultValues: {
      productCode: '', // Will be set by BasicInfoStep when products load
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
  
  // Track page view analytics
  useEffect(() => {
    analyticsService.trackPageView(
      'settings/businessmodel/admin/pricing-plans/create', 
      'Create Pricing Plan'
    );
  }, []);
  
  // Navigation handlers
  const handleBack = () => {
    navigate('/settings/businessmodel/admin/pricing-plans');
  };
  
  const handleCancel = () => {
    const isDirty = methods.formState.isDirty;
    
    if (isDirty) {
      const confirmed = window.confirm('You have unsaved changes. Are you sure you want to cancel?');
      if (!confirmed) return;
    }
    
    navigate('/settings/businessmodel/admin/pricing-plans');
  };
  
  // Define wizard steps configuration
  const wizardSteps = [
    {
      id: 'basic-info',
      title: 'Basic Info',
      component: <BasicInfoStep />
    },
    {
      id: 'pricing-tiers',
      title: 'Pricing',
      component: <PricingTiersStep />
    },
    {
      id: 'features',
      title: 'Features',
      component: <FeaturesStep />
    },
    {
      id: 'notifications',
      title: 'Credits',
      component: <NotificationsStep />
    },
    {
      id: 'review',
      title: 'Review',
      component: <ReviewStep />
    }
  ];
  
  /**
   * Handle step navigation with validation
   */
  const changeStep = async (newStep: number) => {
    // If moving forward, validate current step
    if (newStep > currentStep) {
      let hasErrors = false;
      
      // Step-specific validation
      if (currentStep === 0) {
        // Validate basic information
        const { productCode, name, defaultCurrencyCode, supportedCurrencies } = methods.getValues();
        if (!productCode || !name || !defaultCurrencyCode || !supportedCurrencies || supportedCurrencies.length === 0) {
          hasErrors = true;

          if (!productCode) {
            toast.error("Product selection is required");
          }
          if (!name) {
            toast.error("Plan name is required");
          }
          if (!defaultCurrencyCode || !supportedCurrencies || supportedCurrencies.length === 0) {
            toast.error("At least one currency must be selected");
          }
        }
      } else if (currentStep === 1) {
        // Validate pricing tiers
        const tiers = methods.getValues('tiers');
        if (!tiers || tiers.length === 0) {
          hasErrors = true;
          toast.error("At least one pricing tier is required");
        } else {
          // Check if all tiers have prices for all currencies
          const supportedCurrencies = methods.getValues('supportedCurrencies');
          const invalidTiers = tiers.filter(tier => {
            if (!tier.prices) return true;
            return supportedCurrencies.some(currency => 
              tier.prices[currency] === undefined || tier.prices[currency] === null
            );
          });
          
          if (invalidTiers.length > 0) {
            hasErrors = true;
            toast.error("Please set prices for all tiers in all supported currencies");
          }
        }
      }
      
      if (hasErrors) {
        return; // Prevent step change if validation fails
      }
    }
    
    // Allow step change if validation passes or moving backward
    if (newStep >= 0 && newStep < wizardSteps.length) {
      setCurrentStep(newStep);
    }
  };
  
  /**
   * ✅ FIXED: Transform form data to API request format
   */
  const transformFormDataToApiRequest = (data: PricingPlanFormData): CreatePlanRequest => {
    console.log('Transforming form data:', data);
    
    // Helper function to generate tier labels
    const generateTierLabel = (minValue: number, maxValue: number | null, planType: string): string => {
      const unit = planType === 'Per User' ? 'Users' : 'Contracts';
      if (maxValue === null) {
        return `${minValue}+ ${unit}`;
      }
      return `${minValue} - ${maxValue} ${unit}`;
    };

    // ✅ FIXED: Transform to match CreatePlanRequest interface exactly
    return {
      // Product association
      productCode: data.productCode,
      product_code: data.productCode,
      name: data.name,
      description: data.description,
      // ✅ Both camelCase and snake_case for API compatibility
      planType: data.planType,
      plan_type: data.planType,
      defaultCurrencyCode: data.defaultCurrencyCode,
      default_currency_code: data.defaultCurrencyCode,
      supportedCurrencies: data.supportedCurrencies,
      supported_currencies: data.supportedCurrencies,
      // ✅ Top-level tiers array (required by interface)
      tiers: data.tiers.map((tier, index) => ({
        tier_id: tier.tier_id || `tier_${Date.now()}_${index}`,
        minValue: tier.minValue,
        min_value: tier.minValue,
        maxValue: tier.maxValue,
        max_value: tier.maxValue,
        basePrice: tier.prices[data.defaultCurrencyCode] || 0, // Required by PricingTier interface
        base_price: tier.prices[data.defaultCurrencyCode] || 0,
        unitPrice: tier.prices[data.defaultCurrencyCode] || 0, // Required by PricingTier interface
        unit_price: tier.prices[data.defaultCurrencyCode] || 0,
        label: tier.label || generateTierLabel(tier.minValue, tier.maxValue, data.planType),
        prices: tier.prices || {}
      })),
      // ✅ Optional fields
      isActive: true,
      is_active: true,
      isLive: true,
      is_live: true,
      trialPeriodDays: data.trialDuration,
      trial_duration: data.trialDuration,
      // ✅ Top-level features and notifications
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
      // ✅ Optional initial_version (if your API uses it)
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
  };
  
  /**
   * ✅ FIXED: Handle form submission
   */
  const handleSubmit = async (data: PricingPlanFormData) => {
    try {
      // Prevent duplicate submissions
      if (isSubmitting || submitting) {
        console.log('Submission already in progress, ignoring duplicate request');
        return;
      }
      
      setIsSubmitting(true);
      
      console.log('Raw form data to submit:', data);
      
      // Final validation before submission
      if (!data.tiers || data.tiers.length === 0) {
        toast.error("Please add at least one pricing tier before creating the plan.");
        setIsSubmitting(false);
        return;
      }
      
      // Check if all tiers have valid prices
      const invalidTiers = data.tiers.filter(tier => {
        if (!tier.prices) return true;
        return data.supportedCurrencies.some(currency => 
          tier.prices[currency] === undefined || tier.prices[currency] === null
        );
      });
      
      if (invalidTiers.length > 0) {
        toast.error("Please set prices for all tiers in all supported currencies.");
        setIsSubmitting(false);
        return;
      }
      
      // Transform form data to API request format
      const apiRequestData = transformFormDataToApiRequest(data);
      
      // Debug: Log the transformed data
      console.log('Transformed API request data:', JSON.stringify(apiRequestData, null, 2));
      
      // Create the plan
      console.log('Sending plan creation request...');
      const createdPlan = await createPlan(apiRequestData);
      
      if (createdPlan) {
        console.log('Plan created successfully:', createdPlan);
        toast.success('Plan created successfully!');
        
        // Small delay to ensure any pending state updates complete
        setTimeout(() => {
          // ✅ FIXED: Handle both ID formats
          const planId = createdPlan.id || createdPlan.plan_id;
          navigate(`/settings/businessmodel/admin/pricing-plans/${planId}`, { 
            replace: true 
          });
        }, 100);
      } else {
        console.error('Plan creation returned null');
        setIsSubmitting(false);
        toast.error("Failed to create plan. Please try again.");
      }
    } catch (error) {
      console.error('Error in form submission:', error);
      setIsSubmitting(false);
      toast.error("An error occurred while creating the plan.");
    }
  };

  /**
   * Render current step with form context
   */
  const renderCurrentStep = () => {
    return (
      <FormProvider {...methods}>
        <div onClick={(e) => e.stopPropagation()}>
          {wizardSteps[currentStep].component}
        </div>
      </FormProvider>
    );
  };
  
  // Handle navigation button clicks
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
  
  return (
    <div 
      className="p-6 transition-colors"
      style={{ backgroundColor: `${colors.utility.primaryBackground}20` }}
    >
      {/* Page Header */}
      <div className="flex items-center mb-8">
        <button 
          onClick={handleBack} 
          className="mr-4 p-2 rounded-full hover:opacity-80 transition-colors"
          style={{ backgroundColor: colors.utility.secondaryBackground }}
          type="button"
          aria-label="Go back to plans list"
        >
          <ArrowLeft 
            className="h-5 w-5 transition-colors"
            style={{ color: colors.utility.secondaryText }}
          />
        </button>
        <div>
          <h1 
            className="text-2xl font-bold transition-colors"
            style={{ color: colors.utility.primaryText }}
          >
            Create Pricing Plan
          </h1>
          <p 
            className="transition-colors"
            style={{ color: colors.utility.secondaryText }}
          >
            Configure a new pricing plan for your tenants
          </p>
        </div>
      </div>
      
      {/* Form Wizard Steps Navigation */}
      <div className="mb-6">
        <FormWizard
          steps={wizardSteps}
          currentStepIndex={currentStep}
          onStepChange={changeStep}
        />
      </div>
      
      {/* Main Form Container */}
      <div 
        className="rounded-lg border overflow-hidden transition-colors"
        style={{
          backgroundColor: colors.utility.secondaryBackground,
          borderColor: colors.utility.secondaryText + '40'
        }}
      >
        <div 
          className="px-6 py-4 border-b transition-colors"
          style={{
            backgroundColor: `${colors.utility.primaryBackground}20`,
            borderColor: colors.utility.secondaryText + '40'
          }}
        >
          <h2 
            className="text-lg font-semibold transition-colors"
            style={{ color: colors.utility.primaryText }}
          >
            {wizardSteps[currentStep].title}
          </h2>
        </div>
        
        <div className="p-6">
          {/* Current Step Content */}
          {renderCurrentStep()}
          
          {/* Navigation Buttons */}
          <div className="flex justify-between mt-6">
            {/* Left Button - Cancel or Previous */}
            {currentStep === 0 ? (
              <button
                type="button"
                onClick={handleCancel}
                className="px-4 py-2 rounded-md border hover:opacity-80 transition-colors"
                style={{
                  borderColor: colors.utility.secondaryText + '40',
                  backgroundColor: colors.utility.primaryBackground,
                  color: colors.utility.primaryText
                }}
              >
                Cancel
              </button>
            ) : (
              <button
                type="button"
                onClick={handlePrevious}
                className="px-4 py-2 rounded-md border hover:opacity-80 transition-colors"
                style={{
                  borderColor: colors.utility.secondaryText + '40',
                  backgroundColor: colors.utility.primaryBackground,
                  color: colors.utility.primaryText
                }}
              >
                Previous
              </button>
            )}
            
            {/* Right Button - Next or Submit */}
            {currentStep < wizardSteps.length - 1 ? (
              <button
                type="button"
                onClick={handleNext}
                disabled={submitting || isSubmitting}
                className="px-6 py-2 rounded-md text-white hover:opacity-90 transition-colors disabled:opacity-70"
                style={{
                  background: `linear-gradient(to right, ${colors.brand.primary}, ${colors.brand.secondary})`
                }}
              >
                Next
              </button>
            ) : (
              <button
                type="button"
                onClick={handleFinalSubmit}
                disabled={submitting || isSubmitting}
                className="px-6 py-2 rounded-md text-white hover:opacity-90 transition-colors disabled:opacity-70 flex items-center"
                style={{
                  background: `linear-gradient(to right, ${colors.brand.primary}, ${colors.brand.secondary})`
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
                      <circle 
                        className="opacity-25" 
                        cx="12" 
                        cy="12" 
                        r="10" 
                        stroke="currentColor" 
                        strokeWidth="4"
                      />
                      <path 
                        className="opacity-75" 
                        fill="currentColor" 
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
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
      </div>
      
      {/* Environment Warning for Test Mode */}
      {!isLive && (
        <div 
          className="mt-8 p-4 border rounded-md transition-colors"
          style={{
            backgroundColor: `${colors.semantic.warning}10`,
            borderColor: `${colors.semantic.warning}40`
          }}
        >
          <p 
            className="text-sm flex items-center transition-colors"
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