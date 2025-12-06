// src/pages/settings/businessmodel/admin/pricing-plans/detail.tsx 

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Loader2, Archive, Users } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { analyticsService } from '@/services/analytics.service';
import { useBusinessModel } from '@/hooks/useBusinessModel';
import ConfirmationDialog from '@/components/ui/ConfirmationDialog';

// Import all modular components
import { 
  PlanDetailHeader,
  CurrencySelector,
  PlanInformationCard,
  PricingTiersCard,
  FeaturesCard,
  NotificationCreditsCard,
  ActionsCard,
  StatsCard
} from '@/components/businessmodel/admin/plandetail';

const PlanDetailView: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { isLive } = useAuth();
  const { isDarkMode, currentTheme } = useTheme();
  
  const { 
    selectedPlan,
    isLoading,
    error,
    loadPlanDetails,
    togglePlanVisibility,
    archivePlan
  } = useBusinessModel();
  
  // Local state
  const [selectedCurrency, setSelectedCurrency] = useState<string>('');
  const [showArchiveDialog, setShowArchiveDialog] = useState(false);
  const [archiving, setArchiving] = useState(false);
  
  // Get theme colors
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;
  
  // Use refs to track mounting and prevent multiple loads
  const isMounted = useRef(true);
  const isLoadingRef = useRef(false);
  const lastLoadedId = useRef<string | null>(null);
  
  // Set up mounting status
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);
  
  // Track page view - only once when ID changes
  useEffect(() => {
    if (id) {
      analyticsService.trackPageView(
        'settings/businessmodel/admin/pricing-plans/detail', 
        'Pricing Plan Detail'
      );
    }
  }, [id]);
  
  // Load plan details - simplified logic
  useEffect(() => {
    const loadPlan = async () => {
      // Validate inputs
      if (!id || !isMounted.current) {
        return;
      }
      
      // Prevent duplicate loads
      if (isLoadingRef.current || lastLoadedId.current === id) {
        return;
      }
      
      // Check if plan is already loaded
      if (selectedPlan && (selectedPlan.id === id || selectedPlan.plan_id === id)) {
        // Plan already loaded, just set currency
        const defaultCurrency = selectedPlan.defaultCurrencyCode || selectedPlan.default_currency_code || 'USD';
        if (!selectedCurrency) {
          setSelectedCurrency(defaultCurrency);
        }
        return;
      }
      
      try {
        isLoadingRef.current = true;
        lastLoadedId.current = id;
        
        console.log(`Loading plan: ${id}`);
        const plan = await loadPlanDetails(id);
        
        if (plan && isMounted.current) {
          console.log('Plan loaded successfully:', plan.name);
          
          // Set default currency
          const defaultCurrency = plan.defaultCurrencyCode || plan.default_currency_code || 'USD';
          setSelectedCurrency(defaultCurrency);
        }
      } catch (err) {
        console.error('Error loading plan:', err);
        // Don't set error state here as it's handled by the hook
      } finally {
        isLoadingRef.current = false;
      }
    };
    
    loadPlan();
  }, [id, loadPlanDetails]); // Removed dependencies that could cause loops
  
  // Navigation handlers
  const handleBack = useCallback(() => {
    navigate('/settings/businessmodel/admin/pricing-plans');
  }, [navigate]);
  
  const handleEdit = useCallback(() => {
    if (id) {
      navigate(`/settings/businessmodel/admin/pricing-plans/${id}/edit`);
    }
  }, [navigate, id]);
  
  const handleAssignWithCurrency = useCallback((currencyCode: string) => {
    if (id) {
      navigate(`/settings/businessmodel/admin/pricing-plans/${id}/assign?currency=${currencyCode}`);
    }
  }, [navigate, id]);

  const handleVersionHistory = useCallback(() => {
    if (id) {
      navigate(`/settings/businessmodel/admin/pricing-plans/${id}/versions`);
    }
  }, [navigate, id]);

  const handleViewBilling = useCallback(() => {
    if (id) {
      navigate(`/settings/businessmodel/admin/billing?planId=${id}`);
    }
  }, [navigate, id]);
  
  // Plan actions
  const handleTogglePlanVisibility = useCallback(async () => {
    if (!selectedPlan || !id) return;
    
    const isVisible = selectedPlan.isVisible ?? selectedPlan.is_visible ?? false;
    const action = isVisible ? 'hide' : 'publish';
    
    const confirmed = window.confirm(`Are you sure you want to ${action} this plan?`);
    
    if (confirmed) {
      await togglePlanVisibility(id, !isVisible);
    }
  }, [selectedPlan, id, togglePlanVisibility]);
  
  // Archive plan with dialog
  const handleArchivePricingPlan = useCallback(() => {
    setShowArchiveDialog(true);
  }, []);
  
  const handleConfirmArchive = useCallback(async () => {
    if (!selectedPlan || !id) return;
    
    setArchiving(true);
    setShowArchiveDialog(false);
    
    try {
      const success = await archivePlan(id);
      
      if (success && isMounted.current) {
        // Navigate back to plans list after successful archive
        setTimeout(() => {
          if (isMounted.current) {
            navigate('/settings/businessmodel/admin/pricing-plans');
          }
        }, 500);
      }
    } catch (error) {
      console.error('Error archiving plan:', error);
    } finally {
      if (isMounted.current) {
        setArchiving(false);
      }
    }
  }, [selectedPlan, id, archivePlan, navigate]);
  
  const handleCurrencyChange = useCallback((currency: string) => {
    if (currency !== selectedCurrency) {
      setSelectedCurrency(currency);
    }
  }, [selectedCurrency]);
  
  // Redirect if no ID
  if (!id) {
    navigate('/settings/businessmodel/admin/pricing-plans');
    return null;
  }
  
  // Loading state
  if (isLoading && !selectedPlan) {
    return (
      <div 
        className="min-h-screen transition-colors"
        style={{ backgroundColor: colors.utility.primaryBackground }}
      >
        <div className="p-6">
          <PlanDetailHeader
            planName="Loading..."
            planDescription=""
            isLive={isLive}
            onBack={handleBack}
          />
          
          <div className="flex justify-center items-center min-h-[300px]">
            <Loader2 
              className="h-8 w-8 animate-spin transition-colors"
              style={{ color: colors.brand.primary }}
            />
            <span 
              className="ml-2 transition-colors"
              style={{ color: colors.utility.secondaryText }}
            >
              Loading plan details...
            </span>
          </div>
        </div>
      </div>
    );
  }
  
  // Error or not found state
  if (!isLoading && !selectedPlan && error) {
    return (
      <div 
        className="min-h-screen transition-colors"
        style={{ backgroundColor: colors.utility.primaryBackground }}
      >
        <div className="p-6">
          <PlanDetailHeader
            planName="Plan Not Found"
            planDescription="The requested pricing plan could not be found."
            isLive={isLive}
            onBack={handleBack}
          />
          
          <div 
            className="rounded-lg border p-8 text-center mt-6 transition-colors"
            style={{
              backgroundColor: colors.utility.secondaryBackground,
              borderColor: colors.utility.secondaryText + '40'
            }}
          >
            <h3 
              className="text-lg font-medium transition-colors"
              style={{ color: colors.utility.primaryText }}
            >
              No Plan Found
            </h3>
            <p 
              className="mt-2 mb-4 transition-colors"
              style={{ color: colors.utility.secondaryText }}
            >
              {error || 'The pricing plan could not be loaded.'}
            </p>
            <button
              onClick={handleBack}
              className="px-4 py-2 rounded-md text-white hover:opacity-90 transition-colors"
              style={{
                background: `linear-gradient(to right, ${colors.brand.primary}, ${colors.brand.secondary})`
              }}
            >
              Back to Plans
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  // Wait for plan to load
  if (!selectedPlan) {
    return null;
  }
  
  // Extract plan data with flexible property access
  const planData = {
    id: selectedPlan.id || selectedPlan.plan_id,
    name: selectedPlan.name || 'Untitled Plan',
    description: selectedPlan.description || '',
    planType: selectedPlan.planType || selectedPlan.plan_type || 'Per User',
    trialDuration: selectedPlan.trialPeriodDays || selectedPlan.trial_duration || 0,
    isVisible: selectedPlan.isVisible ?? selectedPlan.is_visible ?? false,
    isArchived: selectedPlan.isArchived ?? selectedPlan.is_archived ?? false,
    defaultCurrencyCode: selectedPlan.defaultCurrencyCode || selectedPlan.default_currency_code || 'USD',
    supportedCurrencies: selectedPlan.supportedCurrencies || selectedPlan.supported_currencies || ['USD'],
    createdAt: selectedPlan.createdAt || selectedPlan.created_at || new Date().toISOString(),
    updatedAt: selectedPlan.updatedAt || selectedPlan.updated_at || new Date().toISOString(),
    activeVersion: selectedPlan.activeVersion || selectedPlan.active_version || null,
    productCode: selectedPlan.productCode || selectedPlan.product_code,
    productName: selectedPlan.productName || selectedPlan.product_name
  };
  
  // Extract version data
  const activeVersion = planData.activeVersion;
  const tiers = selectedPlan.tiers || activeVersion?.tiers || [];
  const features = selectedPlan.features || activeVersion?.features || [];
  const notifications = selectedPlan.notifications || activeVersion?.notifications || [];
  
  return (
    <div 
      className="min-h-screen transition-colors"
      style={{ backgroundColor: colors.utility.primaryBackground }}
    >
      <div className="p-6">
        {/* Page Header */}
        <PlanDetailHeader
          planName={planData.name}
          planDescription={planData.description}
          isVisible={planData.isVisible}
          isArchived={planData.isArchived}
          isLive={isLive}
          productName={planData.productName}
          onBack={handleBack}
        />
        
        {/* Currency Selection */}
        <CurrencySelector
          supportedCurrencies={planData.supportedCurrencies}
          defaultCurrencyCode={planData.defaultCurrencyCode}
          selectedCurrency={selectedCurrency || planData.defaultCurrencyCode}
          onCurrencyChange={handleCurrencyChange}
        />
        
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Main Content - Left Column */}
          <div className="w-full lg:w-2/3 space-y-6">
            {/* Plan Information */}
            <PlanInformationCard
              planType={planData.planType}
              trialDuration={planData.trialDuration}
              supportedCurrencies={planData.supportedCurrencies}
              defaultCurrencyCode={planData.defaultCurrencyCode}
              createdAt={planData.createdAt}
              updatedAt={planData.updatedAt}
              activeVersion={activeVersion && activeVersion.version_number && activeVersion.effective_date ? {
                version_number: activeVersion.version_number,
                effective_date: activeVersion.effective_date
              } : undefined}
              productName={planData.productName}
              productCode={planData.productCode}
            />
            
            {/* Pricing Tiers */}
            <PricingTiersCard
              tiers={tiers}
              selectedCurrency={selectedCurrency || planData.defaultCurrencyCode}
              planType={planData.planType}
              isArchived={planData.isArchived}
              onEdit={handleEdit}
            />
            
            {/* Features */}
            <FeaturesCard
              features={features}
              selectedCurrency={selectedCurrency || planData.defaultCurrencyCode}
              planType={planData.planType}
              isArchived={planData.isArchived}
              onEdit={handleEdit}
            />
            
            {/* Notification Credits */}
            <NotificationCreditsCard
              notifications={notifications}
              selectedCurrency={selectedCurrency || planData.defaultCurrencyCode}
              planType={planData.planType}
              isArchived={planData.isArchived}
              onEdit={handleEdit}
            />
          </div>
          
          {/* Sidebar - Right Column */}
          <div className="w-full lg:w-1/3 space-y-6">
            {/* Actions Card */}
            <ActionsCard
              isVisible={planData.isVisible}
              isArchived={planData.isArchived}
              supportedCurrencies={planData.supportedCurrencies}
              defaultCurrencyCode={planData.defaultCurrencyCode}
              onEdit={handleEdit}
              onToggleVisibility={handleTogglePlanVisibility}
              onArchive={handleArchivePricingPlan}
              onVersionHistory={handleVersionHistory}
              onViewBilling={handleViewBilling}
              onAssignWithCurrency={handleAssignWithCurrency}
            />
            
            {/* Stats Card */}
            <StatsCard
              stats={{
                activeTenants: selectedPlan.subscriber_count || 0,
                trialTenants: 0,
                monthlyRevenue: 0,
                conversionRate: 0,
                totalSubscribers: selectedPlan.subscriber_count || 0,
                averageRevenuePerUser: 0,
                churnRate: 0,
                lifetimeValue: 0
              }}
              selectedCurrency={selectedCurrency || planData.defaultCurrencyCode}
              isLoading={false}
            />
          </div>
        </div>
        
        {/* Archive Confirmation Dialog */}
        <ConfirmationDialog
          isOpen={showArchiveDialog}
          onClose={() => setShowArchiveDialog(false)}
          onConfirm={handleConfirmArchive}
          title="Archive Plan"
          description="Are you sure you want to archive this plan? This action cannot be undone and the plan will no longer be visible to tenants."
          confirmText="Archive Plan"
          type="danger"
          icon={<Archive className="h-6 w-6" />}
          isLoading={archiving}
        />
      </div>
    </div>
  );
};

export default PlanDetailView;