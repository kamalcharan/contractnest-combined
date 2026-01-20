// src/pages/settings/businessmodel/admin/pricing-plans/index.tsx
// UPDATED: Product Filter with API reload, Removed Debug, Glassmorphic Design

import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlusCircle, ArrowLeft, Filter, X, Package } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { analyticsService } from '@/services/analytics.service';
import { useBusinessModel } from '@/hooks/useBusinessModel';
import { vaniToast } from '@/components/common/toast/VaNiToast';
import { VaNiLoader, SectionLoader } from '@/components/common/loaders/UnifiedLoader';
import { useXProductDropdown } from '@/hooks/queries/useProductMasterdata';

// Import components
import SummaryCards from '@/components/businessmodel/dashboard/SummaryCards';
import PlanList, { PricingPlanSummary } from '@/components/businessmodel/dashboard/PlanList';

const PricingPlansAdminPage: React.FC = () => {
  const navigate = useNavigate();
  const { isDarkMode, currentTheme } = useTheme();

  const {
    isLoading,
    plans,
    loadPlans,
    archivePlan,
    error
  } = useBusinessModel();

  // Fetch products dynamically from X-Product category
  const { options: productOptions, isLoading: productsLoading } = useXProductDropdown('global');

  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  // Filter states
  const [activeFilter, setActiveFilter] = useState<'all' | 'plans' | 'users' | 'renewals' | 'trials'>('all');
  const [productFilter, setProductFilter] = useState<string>(''); // Empty = All Products
  const [showFilters, setShowFilters] = useState(false);

  // Build product filter options with "All Products" at the beginning
  const PRODUCT_OPTIONS = useMemo(() => {
    const allOption = { value: '', label: 'All Products' };
    if (!productOptions || productOptions.length === 0) {
      return [allOption];
    }
    return [allOption, ...productOptions.map(p => ({ value: p.value, label: p.label }))];
  }, [productOptions]);

  // Summary data calculated from plans
  const [summaryData, setSummaryData] = useState({
    activePlans: 0,
    totalUsers: 0,
    renewalsSoon: 0,
    trialsEnding: 0
  });

  // Processed plans for the list component
  const [processedPlans, setProcessedPlans] = useState<PricingPlanSummary[]>([]);

  // Track component lifecycle properly
  const isMounted = useRef(true);
  const hasTrackedPageView = useRef(false);
  const lastProductFilter = useRef<string>('');

  // Set up mounting status - only once
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Track page view only once
  useEffect(() => {
    if (!hasTrackedPageView.current) {
      analyticsService.trackPageView('settings/businessmodel/admin/pricing-plans', 'Plan Configuration');
      hasTrackedPageView.current = true;
    }
  }, []);

  // Handle product filter change - reload plans from API
  const handleProductFilterChange = useCallback((newProductCode: string) => {
    if (lastProductFilter.current === newProductCode) return;

    setProductFilter(newProductCode);
    lastProductFilter.current = newProductCode;

    // Reload plans with the new product filter
    loadPlans(undefined, newProductCode || undefined);
  }, [loadPlans]);

  // Process plans data with new field compatibility
  useEffect(() => {
    if (!isMounted.current) return;

    try {
      // Handle both API formats for field names
      const activePlansCount = plans.filter(plan => {
        const isVisible = plan.isVisible ?? plan.is_visible ?? true;
        const isArchived = plan.isArchived ?? plan.is_archived ?? false;
        return !isArchived && isVisible;
      }).length;

      let totalUsersCount = 0;

      // Convert plans to format expected by PlanList component
      const formattedPlans = plans.map(plan => {
        // Add user count to total (if available)
        const subscriberCount = plan.subscriber_count || 0;
        totalUsersCount += subscriberCount;

        // Handle both field formats
        const isVisible = plan.isVisible ?? plan.is_visible ?? true;
        const isArchived = plan.isArchived ?? plan.is_archived ?? false;
        const planType = plan.planType || plan.plan_type || 'Per User';
        const updatedAt = plan.updatedAt || plan.updated_at;
        const createdAt = plan.createdAt || plan.created_at;

        // Handle version information from both formats
        const activeVersion = plan.activeVersion || plan.active_version;
        const versionNumber = activeVersion?.version_number || plan.version || '1.0';
        const featuresCount = activeVersion?.features?.length || plan.features?.length || 0;

        return {
          id: plan.id || plan.plan_id || '',
          name: plan.name || 'Untitled Plan',
          version: versionNumber,
          isActive: isVisible && !isArchived,
          planType: planType as 'Per User' | 'Per Contract',
          userCount: subscriberCount,
          featuresCount: featuresCount,
          lastUpdated: updatedAt ? new Date(updatedAt).toLocaleDateString() :
            createdAt ? new Date(createdAt).toLocaleDateString() :
              'Unknown',
          productCode: plan.productCode || plan.product_code,
          productName: plan.productName || plan.product_name
        };
      });

      // Set processed plans
      setProcessedPlans(formattedPlans);

      // Calculate renewals and trials percentages
      const renewalsSoon = Math.floor(totalUsersCount * 0.15);
      const trialsEnding = Math.floor(totalUsersCount * 0.08);

      // Update summary data
      setSummaryData({
        activePlans: activePlansCount,
        totalUsers: totalUsersCount,
        renewalsSoon,
        trialsEnding
      });

    } catch (err) {
      console.error("Error processing plans data:", err);
    }
  }, [plans]);

  // Handle Back
  const handleBack = () => {
    navigate('/settings');
  };

  // Handle Create New Plan
  const handleCreatePlan = () => {
    navigate('/settings/businessmodel/admin/pricing-plans/create');
  };

  // Handle View Plan with robust ID handling
  const handleViewPlan = (planId: string) => {
    if (!planId) return;
    try {
      navigate(`/settings/businessmodel/admin/pricing-plans/${planId}`);
    } catch (error) {
      window.location.href = `/settings/businessmodel/admin/pricing-plans/${planId}`;
    }
  };

  // Handle Archive Plan with VaNiToast
  const handleArchivePlan = async (planId: string) => {
    const confirmed = window.confirm('Are you sure you want to archive this plan? This will hide it from all tenants.');

    if (confirmed) {
      try {
        const success = await archivePlan(planId);
        if (success) {
          vaniToast.success('Plan archived successfully');
          await loadPlans(undefined, productFilter || undefined);
        }
      } catch (err) {
        vaniToast.error('Failed to archive plan', { message: 'Please try again' });
      }
    }
  };

  // Handle summary card clicks
  const handleSummaryCardClick = (cardType: 'plans' | 'users' | 'renewals' | 'trials') => {
    setActiveFilter(prev => prev === cardType ? 'all' : cardType);
  };

  // Filter plans based on active filter (product filter is now handled by API)
  const getFilteredPlans = useMemo(() => {
    let filtered = processedPlans;

    // Status filter (product filter is done via API)
    if (activeFilter === 'all') return filtered;

    switch (activeFilter) {
      case 'plans':
        return filtered.filter(plan => plan.isActive);
      case 'users':
        return filtered.filter(plan => plan.userCount > 0);
      case 'renewals':
        return filtered.slice(0, 2);
      case 'trials':
        return filtered.filter((_, idx) => idx === 3);
      default:
        return filtered;
    }
  }, [processedPlans, activeFilter]);

  // Clear all filters
  const clearFilters = () => {
    setActiveFilter('all');
    if (productFilter) {
      handleProductFilterChange('');
    }
  };

  // Check if any filters are active
  const hasActiveFilters = activeFilter !== 'all' || productFilter !== '';

  // Handle error state from hook
  if (error) {
    return (
      <div
        className="p-6 transition-colors min-h-screen"
        style={{ backgroundColor: colors.utility.primaryBackground }}
      >
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center">
              <button
                onClick={handleBack}
                className="mr-4 p-2 rounded-xl hover:opacity-80 transition-colors"
                style={{ backgroundColor: `${colors.brand.primary}20` }}
              >
                <ArrowLeft
                  className="h-5 w-5"
                  style={{ color: colors.brand.primary }}
                />
              </button>
              <div>
                <h1
                  className="text-2xl font-bold"
                  style={{ color: colors.utility.primaryText }}
                >
                  Plan Configuration
                </h1>
                <p style={{ color: colors.utility.secondaryText }}>
                  Error loading plans
                </p>
              </div>
            </div>
          </div>

          <div
            className="rounded-2xl p-8 text-center"
            style={{
              backgroundColor: `${colors.semantic.error}10`,
              border: `1px solid ${colors.semantic.error}20`
            }}
          >
            <h3
              className="text-lg font-medium mb-2"
              style={{ color: colors.semantic.error }}
            >
              Error Loading Plans
            </h3>
            <p
              className="mb-4"
              style={{ color: colors.utility.secondaryText }}
            >
              {error}
            </p>
            <button
              onClick={() => loadPlans(undefined, productFilter || undefined)}
              className="px-6 py-2 rounded-xl text-white hover:opacity-90 transition-colors"
              style={{
                background: `linear-gradient(135deg, ${colors.brand.primary}, ${colors.brand.secondary})`
              }}
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Show VaNiLoader when loading
  if (isLoading && plans.length === 0) {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-6"
        style={{ backgroundColor: colors.utility.primaryBackground }}
      >
        <VaNiLoader
          size="lg"
          message="LOADING PLANS"
          showSkeleton={true}
          skeletonVariant="card"
          skeletonCount={6}
        />
      </div>
    );
  }

  return (
    <div
      className="p-6 transition-colors min-h-screen"
      style={{ backgroundColor: colors.utility.primaryBackground }}
    >
      <div className="max-w-6xl mx-auto">
        {/* Glassmorphic Page Header */}
        <div
          className="rounded-2xl p-6 mb-6"
          style={{
            backgroundColor: isDarkMode
              ? 'rgba(30, 41, 59, 0.6)'
              : 'rgba(255, 255, 255, 0.8)',
            backdropFilter: 'blur(12px)',
            border: `1px solid ${isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}`
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <button
                onClick={handleBack}
                className="mr-4 p-2 rounded-xl hover:opacity-80 transition-colors"
                style={{ backgroundColor: `${colors.brand.primary}20` }}
              >
                <ArrowLeft
                  className="h-5 w-5"
                  style={{ color: colors.brand.primary }}
                />
              </button>
              <div>
                <h1
                  className="text-2xl font-bold"
                  style={{ color: colors.utility.primaryText }}
                >
                  Plan Configuration
                </h1>
                <p style={{ color: colors.utility.secondaryText }}>
                  Manage subscription plans and pricing structure
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Filter Toggle Button */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`px-4 py-2 rounded-xl flex items-center gap-2 transition-all ${hasActiveFilters ? 'ring-2' : ''}`}
                style={{
                  backgroundColor: hasActiveFilters
                    ? `${colors.brand.primary}20`
                    : colors.utility.secondaryBackground,
                  color: hasActiveFilters
                    ? colors.brand.primary
                    : colors.utility.primaryText,
                  ringColor: colors.brand.primary
                }}
              >
                <Filter className="h-4 w-4" />
                Filters
                {hasActiveFilters && (
                  <span
                    className="w-5 h-5 rounded-full text-xs flex items-center justify-center text-white"
                    style={{ backgroundColor: colors.brand.primary }}
                  >
                    {(activeFilter !== 'all' ? 1 : 0) + (productFilter ? 1 : 0)}
                  </span>
                )}
              </button>

              {/* Create New Plan Button */}
              <button
                onClick={handleCreatePlan}
                className="px-4 py-2 rounded-xl text-white hover:opacity-90 transition-colors inline-flex items-center shadow-lg"
                style={{
                  background: `linear-gradient(135deg, ${colors.brand.primary}, ${colors.brand.secondary})`
                }}
              >
                <PlusCircle className="h-4 w-4 mr-2" />
                Create New Plan
              </button>
            </div>
          </div>

          {/* Expandable Filters Section */}
          {showFilters && (
            <div
              className="mt-4 pt-4 border-t flex items-center gap-4 flex-wrap"
              style={{ borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)' }}
            >
              {/* Product Filter Dropdown */}
              <div className="flex items-center gap-2">
                <Package
                  className="h-4 w-4"
                  style={{ color: colors.utility.secondaryText }}
                />
                <label
                  className="text-sm font-medium"
                  style={{ color: colors.utility.secondaryText }}
                >
                  Product:
                </label>
                <select
                  value={productFilter}
                  onChange={(e) => handleProductFilterChange(e.target.value)}
                  disabled={productsLoading || isLoading}
                  className="px-3 py-2 rounded-xl text-sm transition-colors focus:outline-none focus:ring-2 disabled:opacity-50 min-w-[150px]"
                  style={{
                    backgroundColor: colors.utility.secondaryBackground,
                    color: colors.utility.primaryText,
                    border: `1px solid ${isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}`,
                    ringColor: colors.brand.primary
                  }}
                >
                  {productsLoading ? (
                    <option value="">Loading products...</option>
                  ) : (
                    PRODUCT_OPTIONS.map((option, index) => (
                      <option key={option.value || `all-${index}`} value={option.value}>
                        {option.label}
                      </option>
                    ))
                  )}
                </select>
              </div>

              {/* Clear Filters Button */}
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="px-3 py-2 rounded-xl text-sm flex items-center gap-1 hover:opacity-80 transition-colors"
                  style={{
                    backgroundColor: `${colors.semantic.error}20`,
                    color: colors.semantic.error
                  }}
                >
                  <X className="h-3 w-3" />
                  Clear All
                </button>
              )}
            </div>
          )}
        </div>

        {/* Summary Cards */}
        <SummaryCards
          activePlans={summaryData.activePlans}
          totalUsers={summaryData.totalUsers}
          renewalsSoon={summaryData.renewalsSoon}
          trialsEnding={summaryData.trialsEnding}
          onCardClick={handleSummaryCardClick}
        />

        {/* Active Filter Indicators */}
        {hasActiveFilters && (
          <div className="mb-4 flex flex-wrap gap-2">
            {activeFilter !== 'all' && (
              <div
                className="inline-flex items-center px-3 py-1.5 rounded-full text-sm"
                style={{
                  backgroundColor: `${colors.brand.primary}20`,
                  color: colors.brand.primary
                }}
              >
                <span className="font-medium mr-2">
                  Status: {activeFilter.charAt(0).toUpperCase() + activeFilter.slice(1)}
                </span>
                <button
                  onClick={() => setActiveFilter('all')}
                  className="hover:opacity-80"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}

            {productFilter && (
              <div
                className="inline-flex items-center px-3 py-1.5 rounded-full text-sm"
                style={{
                  backgroundColor: `${colors.brand.secondary}20`,
                  color: colors.brand.secondary
                }}
              >
                <Package className="h-3 w-3 mr-1" />
                <span className="font-medium mr-2">
                  {PRODUCT_OPTIONS.find(o => o.value === productFilter)?.label}
                </span>
                <button
                  onClick={() => handleProductFilterChange('')}
                  className="hover:opacity-80"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* Subscription Plans Section */}
        <div className="mb-6">
          <h2
            className="text-xl font-semibold mb-4"
            style={{ color: colors.utility.primaryText }}
          >
            Subscription Plans
            {getFilteredPlans.length !== processedPlans.length && (
              <span
                className="ml-2 text-sm font-normal"
                style={{ color: colors.utility.secondaryText }}
              >
                (Showing {getFilteredPlans.length} of {processedPlans.length})
              </span>
            )}
          </h2>

          {/* Show section loader during refresh */}
          {isLoading && plans.length > 0 ? (
            <SectionLoader
              message="Refreshing plans..."
              variant="vani"
              height="md"
              skeletonVariant="table"
              skeletonCount={5}
            />
          ) : (
            <PlanList
              plans={getFilteredPlans}
              onViewPlan={handleViewPlan}
              onArchivePlan={handleArchivePlan}
              isLoading={isLoading}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default PricingPlansAdminPage;
