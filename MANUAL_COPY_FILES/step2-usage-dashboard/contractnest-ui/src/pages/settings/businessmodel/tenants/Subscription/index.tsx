// src/pages/settings/businessmodel/tenants/Subscription/index.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  CreditCard,
  Calendar,
  DollarSign,
  User,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
  TrendingUp,
  Package,
  Settings,
  Download,
  ExternalLink,
  HardDrive,
  FileText,
  MessageSquare,
  Loader2
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { analyticsService } from '@/services/analytics.service';
import {
  useUsageSummary,
  getUsageStatus,
  formatStorageSize
} from '@/hooks/queries/useBusinessModelQueries';

// Types
interface Feature {
  name: string;
  included: boolean;
  limit?: number | string;
  additionalPrice?: number;
  currency?: string;
}

interface PricingTier {
  name: string;
  basePrice: number;
  unitPrice?: number;
  minUsers?: number;
  maxUsers?: number | null;
  currencyPrices?: Record<string, number>;
}

interface PricingPlan {
  id: string;
  name: string;
  description: string;
  tiers: PricingTier[];
  features: Feature[];
  isPopular?: boolean;
  currency: string;
  billingPeriod: 'monthly' | 'annually';
}

interface Subscription {
  id: string;
  plan: PricingPlan;
  status: 'active' | 'cancelled' | 'expired' | 'trial';
  startDate: string;
  endDate: string;
  nextBillingDate: string;
  amountPerBilling: number;
  currency: string;
  userCount: number;
  isTrialActive: boolean;
  trialEndDate?: string;
  autoRenew: boolean;
  paymentMethod?: {
    type: string;
    last4?: string;
    expiryDate?: string;
  };
}

interface UsageData {
  feature: string;
  used: number;
  limit: number | string;
  percentage: number;
}

// Mock data for demonstration
const mockPlan: PricingPlan = {
  id: 'plan_professional',
  name: 'Professional Plan',
  description: 'Perfect for growing businesses',
  currency: 'INR',
  billingPeriod: 'monthly',
  isPopular: true,
  tiers: [
    {
      name: 'Up to 10 users',
      basePrice: 2500,
      unitPrice: 250,
      minUsers: 1,
      maxUsers: 10,
      currencyPrices: {
        'INR': 2500,
        'USD': 30,
        'EUR': 28
      }
    }
  ],
  features: [
    { name: 'Unlimited Contracts', included: true },
    { name: 'Document Templates', included: true, limit: 50 },
    { name: 'API Access', included: true },
    { name: 'Priority Support', included: true },
    { name: 'Advanced Analytics', included: true },
    { name: 'Custom Branding', included: false, additionalPrice: 500, currency: 'INR' },
    { name: 'SSO Integration', included: false, additionalPrice: 1000, currency: 'INR' },
    { name: 'Audit Logs', included: true, limit: '6 months' }
  ]
};

const mockSubscription: Subscription = {
  id: 'sub_12345',
  plan: mockPlan,
  status: 'active',
  startDate: '2024-01-15T00:00:00Z',
  endDate: '2025-01-15T00:00:00Z',
  nextBillingDate: '2024-12-15T00:00:00Z',
  amountPerBilling: 8 * (mockPlan.tiers[0]?.currencyPrices?.['INR'] || mockPlan.tiers[0]?.basePrice || 0),
  currency: 'INR',
  userCount: 8,
  isTrialActive: false,
  autoRenew: true,
  paymentMethod: {
    type: 'credit_card',
    last4: '4242',
    expiryDate: '12/26'
  }
};

// No mock data - show empty state when no subscription is active

const SubscriptionIndexPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentTenant, user } = useAuth();
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;
  
  const [subscription, setSubscription] = useState<Subscription>(mockSubscription);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch real usage data from API (Business Model Phase 4 Step 2)
  const {
    data: usageSummary,
    isLoading: usageLoading,
    error: usageError
  } = useUsageSummary();

  // Check if there's an active subscription
  const hasActiveSubscription = usageSummary?.success && usageSummary?.subscription_id;

  // Transform API response to UsageData format for display
  const usageData: UsageData[] = React.useMemo(() => {
    if (!usageSummary?.success || !usageSummary.metrics) {
      return []; // Return empty - no data available
    }

    const metrics = usageSummary.metrics;
    const data: UsageData[] = [];

    // Contracts
    if (metrics.contracts) {
      data.push({
        feature: 'Contracts Created',
        used: metrics.contracts.used || 0,
        limit: metrics.contracts.unlimited ? 'Unlimited' : (metrics.contracts.limit || 'Unlimited'),
        percentage: metrics.contracts.percentage || 0
      });
    }

    // Users
    if (metrics.users) {
      data.push({
        feature: 'Active Users',
        used: metrics.users.used || 0,
        limit: metrics.users.included || 10,
        percentage: metrics.users.included
          ? Math.round((metrics.users.used / metrics.users.included) * 100)
          : 0
      });
    }

    // Storage
    if (metrics.storage) {
      data.push({
        feature: 'Storage Used',
        used: metrics.storage.used_mb || 0,
        limit: metrics.storage.included_mb || 40,
        percentage: metrics.storage.percentage || 0
      });
    }

    // Notification Credits
    if (metrics.notifications) {
      data.push({
        feature: 'Notification Credits',
        used: metrics.notifications.credits_remaining || 0,
        limit: metrics.notifications.is_low ? 'Low Balance!' : 'Available',
        percentage: 0 // Credits don't have a percentage
      });
    }

    return data;
  }, [usageSummary]);

  // Track page view
  useEffect(() => {
    analyticsService.trackPageView(
      'settings/businessmodel/tenants/subscription', 
      'Tenant Subscription Management'
    );
  }, []);

  // Format currency
  const formatCurrency = (amount: number, currency: string = 'INR'): string => {
    const locale = currency === 'INR' ? 'en-IN' : 'en-US';
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency,
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Format date
  const formatDate = (dateString: string): string => {
    return new Intl.DateTimeFormat('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(new Date(dateString));
  };

  // Get status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <span 
            className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium"
            style={{
              backgroundColor: `${colors.semantic.success}20`,
              color: colors.semantic.success
            }}
          >
            <CheckCircle className="h-4 w-4 mr-1" />
            Active
          </span>
        );
      case 'trial':
        return (
          <span 
            className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium"
            style={{
              backgroundColor: `${colors.brand.primary}20`,
              color: colors.brand.primary
            }}
          >
            <Clock className="h-4 w-4 mr-1" />
            Trial
          </span>
        );
      case 'cancelled':
        return (
          <span 
            className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium"
            style={{
              backgroundColor: `${colors.semantic.error}20`,
              color: colors.semantic.error
            }}
          >
            <XCircle className="h-4 w-4 mr-1" />
            Cancelled
          </span>
        );
      case 'expired':
        return (
          <span 
            className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium"
            style={{
              backgroundColor: `${colors.utility.secondaryText}20`,
              color: colors.utility.secondaryText
            }}
          >
            <AlertCircle className="h-4 w-4 mr-1" />
            Expired
          </span>
        );
      default:
        return (
          <span 
            className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium"
            style={{
              backgroundColor: `${colors.utility.secondaryText}20`,
              color: colors.utility.secondaryText
            }}
          >
            {status}
          </span>
        );
    }
  };

  // Navigation handlers
  const handleBack = () => {
    navigate('/settings/businessmodel/tenants');
  };

  const handleUpgrade = () => {
    navigate('/settings/businessmodel/tenants/pricing-plans');
  };

  const handleManagePayment = () => {
    navigate('/settings/businessmodel/tenants/subscription/payment');
  };

  const handleViewBilling = () => {
    navigate('/settings/businessmodel/tenants/subscription/billing');
  };

  const handleDownloadInvoice = () => {
    // In a real app, this would download the latest invoice
    console.log('Downloading invoice...');
  };

  const handleCancelSubscription = () => {
    const confirmed = window.confirm(
      'Are you sure you want to cancel your subscription? This action cannot be undone.'
    );
    
    if (confirmed) {
      setIsLoading(true);
      // In a real app, this would call the API
      setTimeout(() => {
        setSubscription(prev => ({ ...prev, status: 'cancelled', autoRenew: false }));
        setIsLoading(false);
      }, 1000);
    }
  };

  const handleToggleAutoRenew = () => {
    setIsLoading(true);
    // In a real app, this would call the API
    setTimeout(() => {
      setSubscription(prev => ({ ...prev, autoRenew: !prev.autoRenew }));
      setIsLoading(false);
    }, 500);
  };

  return (
    <div 
      className="p-6 transition-colors"
      style={{ backgroundColor: `${colors.utility.secondaryText}10` }}
    >
      {/* Page Header */}
      <div className="flex items-center mb-8">
        <button 
          onClick={handleBack} 
          className="mr-4 p-2 rounded-full transition-colors hover:opacity-80"
          style={{ backgroundColor: `${colors.utility.secondaryText}20` }}
        >
          <ArrowLeft 
            className="h-5 w-5"
            style={{ color: colors.utility.secondaryText }}
          />
        </button>
        <div>
          <h1 
            className="text-2xl font-bold transition-colors"
            style={{ color: colors.utility.primaryText }}
          >
            Subscription Management
          </h1>
          <p 
            className="transition-colors"
            style={{ color: colors.utility.secondaryText }}
          >
            Manage your current plan, billing, and usage
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Current Plan Overview */}
          <div 
            className="rounded-lg border overflow-hidden transition-colors"
            style={{
              backgroundColor: colors.utility.secondaryBackground,
              borderColor: `${colors.utility.primaryText}20`
            }}
          >
            <div 
              className="px-6 py-4 border-b transition-colors"
              style={{
                backgroundColor: `${colors.utility.secondaryText}10`,
                borderBottomColor: `${colors.utility.primaryText}20`
              }}
            >
              <div className="flex items-center justify-between">
                <h2 
                  className="text-lg font-semibold transition-colors"
                  style={{ color: colors.utility.primaryText }}
                >
                  Current Plan
                </h2>
                {getStatusBadge(subscription.status)}
              </div>
            </div>
            
            <div className="p-6">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h3 
                    className="text-xl font-bold mb-2 transition-colors"
                    style={{ color: colors.brand.primary }}
                  >
                    {subscription.plan.name}
                  </h3>
                  <p 
                    className="mb-4 transition-colors"
                    style={{ color: colors.utility.secondaryText }}
                  >
                    {subscription.plan.description}
                  </p>
                  <div className="flex items-center space-x-6 text-sm">
                    <div className="flex items-center">
                      <User 
                        className="h-4 w-4 mr-2"
                        style={{ color: colors.utility.secondaryText }}
                      />
                      <span 
                        className="transition-colors"
                        style={{ color: colors.utility.primaryText }}
                      >
                        {subscription.userCount} users
                      </span>
                    </div>
                    <div className="flex items-center">
                      <Calendar 
                        className="h-4 w-4 mr-2"
                        style={{ color: colors.utility.secondaryText }}
                      />
                      <span 
                        className="transition-colors"
                        style={{ color: colors.utility.primaryText }}
                      >
                        Renews {formatDate(subscription.nextBillingDate)}
                      </span>
                    </div>
                    <div className="flex items-center">
                      <DollarSign 
                        className="h-4 w-4 mr-2"
                        style={{ color: colors.utility.secondaryText }}
                      />
                      <span 
                        className="transition-colors"
                        style={{ color: colors.utility.primaryText }}
                      >
                        {formatCurrency(subscription.amountPerBilling)} / month
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="text-right">
                  <div 
                    className="text-2xl font-bold transition-colors"
                    style={{ color: colors.utility.primaryText }}
                  >
                    {formatCurrency(subscription.amountPerBilling)}
                  </div>
                  <div 
                    className="text-sm transition-colors"
                    style={{ color: colors.utility.secondaryText }}
                  >
                    per month
                  </div>
                  {subscription.plan.isPopular && (
                    <div className="mt-2">
                      <span 
                        className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium"
                        style={{
                          backgroundColor: `${colors.brand.primary}20`,
                          color: colors.brand.primary
                        }}
                      >
                        <TrendingUp className="h-3 w-3 mr-1" />
                        Most Popular
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Auto-renewal toggle */}
              <div 
                className="flex items-center justify-between p-4 rounded-lg transition-colors"
                style={{ backgroundColor: `${colors.utility.secondaryText}20` }}
              >
                <div>
                  <div 
                    className="font-medium transition-colors"
                    style={{ color: colors.utility.primaryText }}
                  >
                    Auto-renewal
                  </div>
                  <div 
                    className="text-sm transition-colors"
                    style={{ color: colors.utility.secondaryText }}
                  >
                    {subscription.autoRenew 
                      ? 'Your subscription will automatically renew' 
                      : 'Your subscription will not renew automatically'
                    }
                  </div>
                </div>
                <button
                  onClick={handleToggleAutoRenew}
                  disabled={isLoading}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-50`}
                  style={{
                    backgroundColor: subscription.autoRenew ? colors.brand.primary : `${colors.utility.secondaryText}40`
                  }}
                >
                  <span 
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      subscription.autoRenew ? 'translate-x-6' : 'translate-x-1'
                    }`} 
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Plan Features */}
          <div 
            className="rounded-lg border overflow-hidden transition-colors"
            style={{
              backgroundColor: colors.utility.secondaryBackground,
              borderColor: `${colors.utility.primaryText}20`
            }}
          >
            <div 
              className="px-6 py-4 border-b transition-colors"
              style={{
                backgroundColor: `${colors.utility.secondaryText}10`,
                borderBottomColor: `${colors.utility.primaryText}20`
              }}
            >
              <h2 
                className="text-lg font-semibold transition-colors"
                style={{ color: colors.utility.primaryText }}
              >
                Plan Features
              </h2>
            </div>
            
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {subscription.plan.features
                  .filter((feature: Feature) => feature.included)
                  .map((feature: Feature, index: number) => (
                    <div key={index} className="flex items-center space-x-3">
                      <CheckCircle 
                        className="h-5 w-5 flex-shrink-0"
                        style={{ color: colors.semantic.success }}
                      />
                      <div>
                        <span 
                          className="font-medium transition-colors"
                          style={{ color: colors.utility.primaryText }}
                        >
                          {feature.name}
                        </span>
                        {feature.limit && (
                          <span 
                            className="text-sm ml-2 transition-colors"
                            style={{ color: colors.utility.secondaryText }}
                          >
                            ({feature.limit})
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
              </div>

              {/* Additional Features Available */}
              {subscription.plan.features.filter((f: Feature) => !f.included && f.additionalPrice).length > 0 && (
                <div 
                  className="mt-6 pt-6 border-t transition-colors"
                  style={{ borderTopColor: `${colors.utility.primaryText}20` }}
                >
                  <h3 
                    className="font-medium mb-4 transition-colors"
                    style={{ color: colors.utility.primaryText }}
                  >
                    Additional Features Available
                  </h3>
                  <div className="space-y-3">
                    {subscription.plan.features
                      .filter((f: Feature) => !f.included && f.additionalPrice)
                      .map((feature: Feature, index: number) => (
                        <div 
                          key={index} 
                          className="flex items-center justify-between p-3 border rounded-lg transition-colors"
                          style={{ borderColor: `${colors.utility.primaryText}20` }}
                        >
                          <div className="flex items-center space-x-3">
                            <Package 
                              className="h-5 w-5"
                              style={{ color: colors.utility.secondaryText }}
                            />
                            <span 
                              className="font-medium transition-colors"
                              style={{ color: colors.utility.primaryText }}
                            >
                              {feature.name}
                            </span>
                          </div>
                          <div className="flex items-center space-x-3">
                            <span 
                              className="text-sm font-medium transition-colors"
                              style={{ color: colors.utility.primaryText }}
                            >
                              {formatCurrency(feature.additionalPrice || 0, feature.currency || 'INR')}/month
                            </span>
                            <button 
                              className="text-sm font-medium transition-colors hover:opacity-80"
                              style={{ color: colors.brand.primary }}
                            >
                              Add
                            </button>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Usage Statistics */}
          <div
            className="rounded-lg border overflow-hidden transition-colors"
            style={{
              backgroundColor: colors.utility.secondaryBackground,
              borderColor: `${colors.utility.primaryText}20`
            }}
          >
            <div
              className="px-6 py-4 border-b transition-colors flex items-center justify-between"
              style={{
                backgroundColor: `${colors.utility.secondaryText}10`,
                borderBottomColor: `${colors.utility.primaryText}20`
              }}
            >
              <h2
                className="text-lg font-semibold transition-colors"
                style={{ color: colors.utility.primaryText }}
              >
                Usage Statistics
              </h2>
              {usageSummary?.period && (
                <span
                  className="text-xs px-2 py-1 rounded-full"
                  style={{
                    backgroundColor: `${colors.brand.primary}20`,
                    color: colors.brand.primary
                  }}
                >
                  {usageSummary.period.days_remaining} days remaining
                </span>
              )}
            </div>

            <div className="p-6">
              {usageLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2
                    className="h-6 w-6 animate-spin"
                    style={{ color: colors.brand.primary }}
                  />
                  <span
                    className="ml-2"
                    style={{ color: colors.utility.secondaryText }}
                  >
                    Loading usage data...
                  </span>
                </div>
              ) : usageError || !hasActiveSubscription || usageData.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div
                    className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
                    style={{ backgroundColor: `${colors.utility.secondaryText}20` }}
                  >
                    <Package
                      className="h-8 w-8"
                      style={{ color: colors.utility.secondaryText }}
                    />
                  </div>
                  <h3
                    className="text-lg font-medium mb-2"
                    style={{ color: colors.utility.primaryText }}
                  >
                    No Active Plan
                  </h3>
                  <p
                    className="text-sm mb-6 max-w-sm"
                    style={{ color: colors.utility.secondaryText }}
                  >
                    {usageError
                      ? 'Unable to load subscription data. Please try again later.'
                      : 'No subscription is currently configured. Choose a plan to get started with usage tracking.'}
                  </p>
                  <button
                    onClick={handleUpgrade}
                    className="px-6 py-2 rounded-md transition-colors hover:opacity-90 flex items-center"
                    style={{
                      backgroundColor: colors.brand.primary,
                      color: 'white'
                    }}
                  >
                    <TrendingUp className="h-4 w-4 mr-2" />
                    View Plans
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {usageData.map((usage, index) => {
                    // Get icon based on feature
                    const getFeatureIcon = (feature: string) => {
                      switch (feature) {
                        case 'Active Users':
                          return <User className="h-4 w-4" />;
                        case 'Contracts Created':
                          return <FileText className="h-4 w-4" />;
                        case 'Storage Used':
                          return <HardDrive className="h-4 w-4" />;
                        case 'Notification Credits':
                          return <MessageSquare className="h-4 w-4" />;
                        default:
                          return <Package className="h-4 w-4" />;
                      }
                    };

                    // Format display value
                    const formatValue = (feature: string, value: number) => {
                      if (feature === 'Storage Used') {
                        return formatStorageSize(value);
                      }
                      return value.toLocaleString();
                    };

                    // Format limit display
                    const formatLimit = (feature: string, limit: number | string) => {
                      if (typeof limit === 'string') return limit;
                      if (feature === 'Storage Used') {
                        return formatStorageSize(limit);
                      }
                      return limit.toLocaleString();
                    };

                    const isUnlimited = usage.limit === 'Unlimited';
                    const isCredits = usage.feature === 'Notification Credits';
                    const isLowCredits = isCredits && usage.limit === 'Low Balance!';

                    return (
                      <div key={index} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <span style={{ color: colors.utility.secondaryText }}>
                              {getFeatureIcon(usage.feature)}
                            </span>
                            <span
                              className="font-medium transition-colors"
                              style={{ color: colors.utility.primaryText }}
                            >
                              {usage.feature}
                            </span>
                          </div>
                          <span
                            className="text-sm transition-colors"
                            style={{
                              color: isLowCredits
                                ? colors.semantic.error
                                : colors.utility.secondaryText
                            }}
                          >
                            {isCredits
                              ? `${formatValue(usage.feature, usage.used)} credits`
                              : `${formatValue(usage.feature, usage.used)}${!isUnlimited ? ` / ${formatLimit(usage.feature, usage.limit)}` : ''}`
                            }
                            {isLowCredits && (
                              <span className="ml-2 text-xs font-medium">
                                ⚠️ Low
                              </span>
                            )}
                          </span>
                        </div>
                        {!isUnlimited && !isCredits && typeof usage.limit === 'number' && (
                          <div
                            className="w-full rounded-full h-2"
                            style={{ backgroundColor: `${colors.utility.secondaryText}30` }}
                          >
                            <div
                              className="h-2 rounded-full transition-all"
                              style={{
                                backgroundColor: usage.percentage >= 90
                                  ? colors.semantic.error
                                  : usage.percentage >= 75
                                    ? (colors.semantic.warning || '#F59E0B')
                                    : colors.semantic.success,
                                width: `${Math.min(usage.percentage, 100)}%`
                              }}
                            />
                          </div>
                        )}
                        {usage.percentage >= 90 && !isUnlimited && !isCredits && (
                          <div className="flex items-center space-x-2 text-sm">
                            <AlertCircle
                              className="h-4 w-4"
                              style={{ color: colors.semantic.error }}
                            />
                            <span
                              className="transition-colors"
                              style={{ color: colors.semantic.error }}
                            >
                              Approaching limit - consider upgrading
                            </span>
                          </div>
                        )}
                        {isLowCredits && (
                          <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center space-x-2">
                              <AlertCircle
                                className="h-4 w-4"
                                style={{ color: colors.semantic.warning || '#F59E0B' }}
                              />
                              <span
                                className="transition-colors"
                                style={{ color: colors.semantic.warning || '#F59E0B' }}
                              >
                                Credits running low
                              </span>
                            </div>
                            <button
                              onClick={() => navigate('/businessmodel/tenants/subscription/credits')}
                              className="text-sm font-medium transition-colors hover:opacity-80"
                              style={{ color: colors.brand.primary }}
                            >
                              Buy More →
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <div 
            className="rounded-lg border overflow-hidden transition-colors"
            style={{
              backgroundColor: colors.utility.secondaryBackground,
              borderColor: `${colors.utility.primaryText}20`
            }}
          >
            <div 
              className="px-6 py-4 border-b transition-colors"
              style={{
                backgroundColor: `${colors.utility.secondaryText}10`,
                borderBottomColor: `${colors.utility.primaryText}20`
              }}
            >
              <h2 
                className="text-lg font-semibold transition-colors"
                style={{ color: colors.utility.primaryText }}
              >
                Quick Actions
              </h2>
            </div>
            
            <div className="p-6 space-y-3">
              <button
                onClick={handleUpgrade}
                className="w-full px-4 py-2 rounded-md transition-colors hover:opacity-90 flex items-center justify-center"
                style={{
                  backgroundColor: colors.brand.primary,
                  color: 'white'
                }}
              >
                <TrendingUp className="h-4 w-4 mr-2" />
                Upgrade Plan
              </button>
              
              <button
                onClick={handleManagePayment}
                className="w-full px-4 py-2 border rounded-md transition-colors hover:opacity-80 flex items-center justify-center"
                style={{
                  borderColor: `${colors.utility.primaryText}20`,
                  backgroundColor: colors.utility.primaryBackground,
                  color: colors.utility.primaryText
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = `${colors.utility.secondaryText}10`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = colors.utility.primaryBackground;
                }}
              >
                <CreditCard className="h-4 w-4 mr-2" />
                Manage Payment
              </button>
              
              <button
                onClick={handleViewBilling}
                className="w-full px-4 py-2 border rounded-md transition-colors hover:opacity-80 flex items-center justify-center"
                style={{
                  borderColor: `${colors.utility.primaryText}20`,
                  backgroundColor: colors.utility.primaryBackground,
                  color: colors.utility.primaryText
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = `${colors.utility.secondaryText}10`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = colors.utility.primaryBackground;
                }}
              >
                <Calendar className="h-4 w-4 mr-2" />
                View Billing History
              </button>
              
              <button
                onClick={handleDownloadInvoice}
                className="w-full px-4 py-2 border rounded-md transition-colors hover:opacity-80 flex items-center justify-center"
                style={{
                  borderColor: `${colors.utility.primaryText}20`,
                  backgroundColor: colors.utility.primaryBackground,
                  color: colors.utility.primaryText
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = `${colors.utility.secondaryText}10`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = colors.utility.primaryBackground;
                }}
              >
                <Download className="h-4 w-4 mr-2" />
                Download Invoice
              </button>
            </div>
          </div>

          {/* Payment Method */}
          {subscription.paymentMethod && (
            <div 
              className="rounded-lg border overflow-hidden transition-colors"
              style={{
                backgroundColor: colors.utility.secondaryBackground,
                borderColor: `${colors.utility.primaryText}20`
              }}
            >
              <div 
                className="px-6 py-4 border-b transition-colors"
                style={{
                  backgroundColor: `${colors.utility.secondaryText}10`,
                  borderBottomColor: `${colors.utility.primaryText}20`
                }}
              >
                <h2 
                  className="text-lg font-semibold transition-colors"
                  style={{ color: colors.utility.primaryText }}
                >
                  Payment Method
                </h2>
              </div>
              
              <div className="p-6">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-6 bg-gradient-to-r from-blue-500 to-purple-600 rounded-md flex items-center justify-center">
                    <CreditCard className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <div 
                      className="font-medium transition-colors"
                      style={{ color: colors.utility.primaryText }}
                    >
                      •••• •••• •••• {subscription.paymentMethod.last4}
                    </div>
                    <div 
                      className="text-sm transition-colors"
                      style={{ color: colors.utility.secondaryText }}
                    >
                      Expires {subscription.paymentMethod.expiryDate}
                    </div>
                  </div>
                </div>
                
                <button
                  onClick={handleManagePayment}
                  className="mt-4 text-sm font-medium flex items-center transition-colors hover:opacity-80"
                  style={{ color: colors.brand.primary }}
                >
                  <Settings className="h-4 w-4 mr-1" />
                  Update Payment Method
                </button>
              </div>
            </div>
          )}

          {/* Billing Information */}
          <div 
            className="rounded-lg border overflow-hidden transition-colors"
            style={{
              backgroundColor: colors.utility.secondaryBackground,
              borderColor: `${colors.utility.primaryText}20`
            }}
          >
            <div 
              className="px-6 py-4 border-b transition-colors"
              style={{
                backgroundColor: `${colors.utility.secondaryText}10`,
                borderBottomColor: `${colors.utility.primaryText}20`
              }}
            >
              <h2 
                className="text-lg font-semibold transition-colors"
                style={{ color: colors.utility.primaryText }}
              >
                Billing Information
              </h2>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="flex justify-between">
                <span 
                  className="transition-colors"
                  style={{ color: colors.utility.secondaryText }}
                >
                  Current Period
                </span>
                <span 
                  className="font-medium transition-colors"
                  style={{ color: colors.utility.primaryText }}
                >
                  {formatDate(subscription.startDate)} - {formatDate(subscription.endDate)}
                </span>
              </div>
              
              <div className="flex justify-between">
                <span 
                  className="transition-colors"
                  style={{ color: colors.utility.secondaryText }}
                >
                  Next Billing
                </span>
                <span 
                  className="font-medium transition-colors"
                  style={{ color: colors.utility.primaryText }}
                >
                  {formatDate(subscription.nextBillingDate)}
                </span>
              </div>
              
              <div className="flex justify-between">
                <span 
                  className="transition-colors"
                  style={{ color: colors.utility.secondaryText }}
                >
                  Amount
                </span>
                <span 
                  className="font-medium transition-colors"
                  style={{ color: colors.utility.primaryText }}
                >
                  {formatCurrency(subscription.amountPerBilling)}
                </span>
              </div>
              
              <div 
                className="pt-4 border-t transition-colors"
                style={{ borderTopColor: `${colors.utility.primaryText}20` }}
              >
                <button
                  onClick={handleViewBilling}
                  className="text-sm font-medium flex items-center transition-colors hover:opacity-80"
                  style={{ color: colors.brand.primary }}
                >
                  <ExternalLink className="h-4 w-4 mr-1" />
                  View Full Billing History
                </button>
              </div>
            </div>
          </div>

          {/* Danger Zone */}
          {subscription.status === 'active' && (
            <div 
              className="rounded-lg border overflow-hidden transition-colors"
              style={{
                backgroundColor: colors.utility.secondaryBackground,
                borderColor: `${colors.semantic.error}20`
              }}
            >
              <div 
                className="px-6 py-4 border-b transition-colors"
                style={{
                  backgroundColor: `${colors.semantic.error}10`,
                  borderBottomColor: `${colors.semantic.error}20`
                }}
              >
                <h2 
                  className="text-lg font-semibold transition-colors"
                  style={{ color: colors.semantic.error }}
                >
                  Danger Zone
                </h2>
              </div>
              
              <div className="p-6">
                <p 
                  className="text-sm mb-4 transition-colors"
                  style={{ color: colors.utility.secondaryText }}
                >
                  Once you cancel your subscription, you will lose access to all paid features at the end of your current billing period.
                </p>
                
                <button
                  onClick={handleCancelSubscription}
                  disabled={isLoading}
                  className="w-full px-4 py-2 rounded-md transition-colors disabled:opacity-50 hover:opacity-90"
                  style={{
                    backgroundColor: colors.semantic.error,
                    color: 'white'
                  }}
                >
                  {isLoading ? 'Cancelling...' : 'Cancel Subscription'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SubscriptionIndexPage;