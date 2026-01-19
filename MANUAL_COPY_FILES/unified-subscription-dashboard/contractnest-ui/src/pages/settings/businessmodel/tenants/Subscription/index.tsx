// src/pages/settings/businessmodel/tenants/Subscription/index.tsx
// Unified Subscription Dashboard with Glassmorphic Design
// Combines Plan Info, Usage Dashboard, and Credits into a single page

import React, { useState, useEffect, useMemo } from 'react';
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
  Loader2,
  Zap,
  Mail,
  Phone,
  Plus,
  Coins,
  BarChart3,
  Bell,
  RefreshCw,
  ShoppingCart
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { analyticsService } from '@/services/analytics.service';
import {
  useUsageSummary,
  useCreditBalance,
  useTopupPacks,
  getUsageStatus,
  formatStorageSize,
  CreditBalance,
  TopupPack
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

// ============================================================================
// Glassmorphic Summary Card Component
// ============================================================================
interface SummaryCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  subtext?: string;
  trend?: { value: number; isPositive: boolean };
  onClick?: () => void;
  isActive?: boolean;
  accentColor?: string;
}

const SummaryCard: React.FC<SummaryCardProps> = ({
  icon,
  label,
  value,
  subtext,
  trend,
  onClick,
  isActive = false,
  accentColor
}) => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;
  const accent = accentColor || colors.brand.primary;

  return (
    <div
      onClick={onClick}
      className={`
        relative rounded-2xl border transition-all duration-300 overflow-hidden
        ${onClick ? 'cursor-pointer hover:scale-[1.02] active:scale-[0.98]' : ''}
        ${isActive ? 'ring-2 ring-offset-2' : ''}
      `}
      style={{
        background: isDarkMode
          ? isActive
            ? `linear-gradient(135deg, ${accent}20 0%, ${accent}10 100%)`
            : 'rgba(30, 41, 59, 0.6)'
          : isActive
            ? `linear-gradient(135deg, ${accent}10 0%, ${accent}05 100%)`
            : 'rgba(255, 255, 255, 0.7)',
        backdropFilter: 'blur(12px)',
        border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'}`,
        boxShadow: isActive
          ? `0 8px 32px -8px ${accent}30`
          : '0 4px 24px -4px rgba(0,0,0,0.1)',
        '--tw-ring-color': accent
      } as React.CSSProperties}
    >
      <div className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p
              className="text-sm font-medium mb-1"
              style={{ color: colors.utility.secondaryText }}
            >
              {label}
            </p>
            <div className="flex items-baseline gap-2">
              <span
                className="text-2xl font-bold"
                style={{ color: colors.utility.primaryText }}
              >
                {typeof value === 'number' ? value.toLocaleString() : value}
              </span>
              {trend && (
                <span
                  className="flex items-center gap-1 text-xs font-medium"
                  style={{ color: trend.isPositive ? '#10B981' : '#EF4444' }}
                >
                  {trend.isPositive ? '↑' : '↓'} {trend.value}%
                </span>
              )}
            </div>
            {subtext && (
              <p
                className="text-xs mt-1"
                style={{ color: colors.utility.secondaryText }}
              >
                {subtext}
              </p>
            )}
          </div>
          <div
            className="rounded-xl p-3"
            style={{
              background: isDarkMode ? `${accent}20` : `${accent}15`
            }}
          >
            {icon}
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// Glassmorphic Section Card Component
// ============================================================================
interface SectionCardProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
  headerBadge?: React.ReactNode;
}

const SectionCard: React.FC<SectionCardProps> = ({
  title,
  subtitle,
  children,
  action,
  headerBadge
}) => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  return (
    <div
      className="rounded-2xl border overflow-hidden"
      style={{
        background: isDarkMode ? 'rgba(30, 41, 59, 0.6)' : 'rgba(255, 255, 255, 0.7)',
        backdropFilter: 'blur(12px)',
        border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'}`,
        boxShadow: '0 4px 24px -4px rgba(0,0,0,0.1)'
      }}
    >
      <div
        className="px-6 py-4 border-b flex items-center justify-between"
        style={{
          backgroundColor: isDarkMode ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
          borderBottomColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'
        }}
      >
        <div>
          <div className="flex items-center gap-3">
            <h2
              className="text-lg font-semibold"
              style={{ color: colors.utility.primaryText }}
            >
              {title}
            </h2>
            {headerBadge}
          </div>
          {subtitle && (
            <p
              className="text-sm mt-0.5"
              style={{ color: colors.utility.secondaryText }}
            >
              {subtitle}
            </p>
          )}
        </div>
        {action}
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
};

// ============================================================================
// Usage Progress Bar Component
// ============================================================================
interface UsageProgressProps {
  label: string;
  icon: React.ReactNode;
  used: number;
  limit: number | string;
  percentage: number;
  formatValue?: (val: number) => string;
}

const UsageProgress: React.FC<UsageProgressProps> = ({
  label,
  icon,
  used,
  limit,
  percentage,
  formatValue = (v) => v.toLocaleString()
}) => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  const isUnlimited = limit === 'Unlimited';
  const progressColor =
    percentage >= 90
      ? colors.semantic.error
      : percentage >= 75
        ? colors.semantic.warning || '#F59E0B'
        : colors.semantic.success;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span style={{ color: colors.utility.secondaryText }}>{icon}</span>
          <span
            className="font-medium text-sm"
            style={{ color: colors.utility.primaryText }}
          >
            {label}
          </span>
        </div>
        <span
          className="text-sm"
          style={{ color: colors.utility.secondaryText }}
        >
          {formatValue(used)}
          {!isUnlimited && typeof limit === 'number' && ` / ${formatValue(limit)}`}
          {isUnlimited && ' (Unlimited)'}
        </span>
      </div>
      {!isUnlimited && typeof limit === 'number' && (
        <div
          className="w-full rounded-full h-2"
          style={{ backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }}
        >
          <div
            className="h-2 rounded-full transition-all duration-500"
            style={{
              backgroundColor: progressColor,
              width: `${Math.min(percentage, 100)}%`
            }}
          />
        </div>
      )}
      {percentage >= 90 && !isUnlimited && (
        <div className="flex items-center gap-1.5 text-xs" style={{ color: colors.semantic.error }}>
          <AlertCircle className="h-3.5 w-3.5" />
          <span>Approaching limit - consider upgrading</span>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// Credit Channel Card Component
// ============================================================================
interface CreditChannelCardProps {
  channel: string;
  icon: React.ReactNode;
  balance: number;
  isLow?: boolean;
  onTopup: () => void;
}

const CreditChannelCard: React.FC<CreditChannelCardProps> = ({
  channel,
  icon,
  balance,
  isLow = false,
  onTopup
}) => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  return (
    <div
      className="rounded-xl p-4 flex items-center justify-between"
      style={{
        background: isDarkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
        border: `1px solid ${isLow ? `${colors.semantic.warning}40` : isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}`
      }}
    >
      <div className="flex items-center gap-3">
        <div
          className="rounded-lg p-2.5"
          style={{
            background: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'
          }}
        >
          {icon}
        </div>
        <div>
          <p
            className="font-medium text-sm"
            style={{ color: colors.utility.primaryText }}
          >
            {channel}
          </p>
          <p
            className="text-xs flex items-center gap-1"
            style={{ color: isLow ? colors.semantic.warning || '#F59E0B' : colors.utility.secondaryText }}
          >
            {balance.toLocaleString()} credits
            {isLow && <span className="text-[10px]">⚠️ Low</span>}
          </p>
        </div>
      </div>
      <button
        onClick={onTopup}
        className="text-xs font-medium px-3 py-1.5 rounded-lg transition-all hover:scale-105"
        style={{
          backgroundColor: `${colors.brand.primary}15`,
          color: colors.brand.primary
        }}
      >
        <Plus className="h-3 w-3 inline mr-1" />
        Topup
      </button>
    </div>
  );
};

// ============================================================================
// Topup Pack Card Component
// ============================================================================
interface TopupPackCardProps {
  pack: TopupPack;
  onBuy: () => void;
}

const TopupPackCard: React.FC<TopupPackCardProps> = ({ pack, onBuy }) => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  const formatPrice = (price: number, currency: string) => {
    const locale = currency === 'INR' ? 'en-IN' : 'en-US';
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      maximumFractionDigits: 0
    }).format(price);
  };

  return (
    <div
      className="rounded-xl p-4 relative overflow-hidden transition-all hover:scale-[1.02]"
      style={{
        background: pack.is_popular
          ? `linear-gradient(135deg, ${colors.brand.primary}15 0%, ${colors.brand.secondary || colors.brand.primary}10 100%)`
          : isDarkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
        border: `1px solid ${pack.is_popular ? `${colors.brand.primary}40` : isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}`
      }}
    >
      {pack.is_popular && (
        <div
          className="absolute top-2 right-2 text-[10px] font-bold px-2 py-0.5 rounded-full"
          style={{
            backgroundColor: colors.brand.primary,
            color: 'white'
          }}
        >
          POPULAR
        </div>
      )}
      <div className="flex items-start justify-between">
        <div>
          <h4
            className="font-semibold"
            style={{ color: colors.utility.primaryText }}
          >
            {pack.name}
          </h4>
          <p
            className="text-xs mt-1"
            style={{ color: colors.utility.secondaryText }}
          >
            {pack.credits.toLocaleString()} credits
          </p>
          <p
            className="text-lg font-bold mt-2"
            style={{ color: colors.brand.primary }}
          >
            {formatPrice(pack.price, pack.currency)}
          </p>
        </div>
        <button
          onClick={onBuy}
          className="px-4 py-2 rounded-lg text-sm font-medium transition-all hover:opacity-90"
          style={{
            backgroundColor: colors.brand.primary,
            color: 'white'
          }}
        >
          <ShoppingCart className="h-4 w-4 inline mr-1" />
          Buy
        </button>
      </div>
    </div>
  );
};

// ============================================================================
// Main Subscription Dashboard Component
// ============================================================================
const SubscriptionDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { currentTenant, user } = useAuth();
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  const [subscription, setSubscription] = useState<Subscription>(mockSubscription);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'credits'>('overview');

  // Fetch real data from API
  const {
    data: usageSummary,
    isLoading: usageLoading,
    error: usageError,
    refetch: refetchUsage
  } = useUsageSummary();

  const {
    data: creditBalance,
    isLoading: creditLoading,
    refetch: refetchCredits
  } = useCreditBalance();

  const {
    data: topupPacks,
    isLoading: packsLoading
  } = useTopupPacks();

  // Check if there's an active subscription
  const hasActiveSubscription = usageSummary?.success && usageSummary?.subscription_id;

  // Transform API response to UsageData format
  const usageData: UsageData[] = useMemo(() => {
    if (!usageSummary?.success || !usageSummary.metrics) {
      return [];
    }

    const metrics = usageSummary.metrics;
    const data: UsageData[] = [];

    if (metrics.contracts) {
      data.push({
        feature: 'Contracts Created',
        used: metrics.contracts.used || 0,
        limit: metrics.contracts.unlimited ? 'Unlimited' : (metrics.contracts.limit || 'Unlimited'),
        percentage: metrics.contracts.percentage || 0
      });
    }

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

    if (metrics.storage) {
      data.push({
        feature: 'Storage Used',
        used: metrics.storage.used_mb || 0,
        limit: metrics.storage.included_mb || 40,
        percentage: metrics.storage.percentage || 0
      });
    }

    return data;
  }, [usageSummary]);

  // Calculate total notification credits
  const totalCredits = useMemo(() => {
    if (!creditBalance?.success || !creditBalance.balances) return 0;
    return creditBalance.balances.reduce((sum, b) => sum + (b.balance || 0), 0);
  }, [creditBalance]);

  const isLowCredits = creditBalance?.is_low || totalCredits < 100;

  // Track page view
  useEffect(() => {
    analyticsService.trackPageView(
      'settings/businessmodel/tenants/subscription',
      'Unified Subscription Dashboard'
    );
  }, []);

  // Format helpers
  const formatCurrency = (amount: number, currency: string = 'INR'): string => {
    const locale = currency === 'INR' ? 'en-IN' : 'en-US';
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString: string): string => {
    return new Intl.DateTimeFormat('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(new Date(dateString));
  };

  // Navigation handlers
  const handleBack = () => {
    navigate('/settings');
  };

  const handleUpgrade = () => {
    navigate('/businessmodel/tenants/pricing-plans');
  };

  const handleRefresh = () => {
    refetchUsage();
    refetchCredits();
  };

  const handleBuyPack = (pack: TopupPack) => {
    // In a real app, this would open a payment modal
    console.log('Buying pack:', pack);
    alert(`Opening payment for ${pack.name} - ${formatCurrency(pack.price, pack.currency)}`);
  };

  const handleTopupChannel = (channel: string) => {
    // In a real app, navigate to specific topup page
    console.log('Topup for channel:', channel);
    setActiveTab('credits');
  };

  // Get status badge
  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
      active: { color: colors.semantic.success, icon: <CheckCircle className="h-4 w-4" />, label: 'Active' },
      trial: { color: colors.brand.primary, icon: <Clock className="h-4 w-4" />, label: 'Trial' },
      cancelled: { color: colors.semantic.error, icon: <XCircle className="h-4 w-4" />, label: 'Cancelled' },
      expired: { color: colors.utility.secondaryText, icon: <AlertCircle className="h-4 w-4" />, label: 'Expired' }
    };

    const config = statusConfig[status] || statusConfig.expired;
    return (
      <span
        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium"
        style={{
          backgroundColor: `${config.color}20`,
          color: config.color
        }}
      >
        {config.icon}
        {config.label}
      </span>
    );
  };

  const getFeatureIcon = (feature: string) => {
    const iconMap: Record<string, React.ReactNode> = {
      'Active Users': <User className="h-4 w-4" />,
      'Contracts Created': <FileText className="h-4 w-4" />,
      'Storage Used': <HardDrive className="h-4 w-4" />
    };
    return iconMap[feature] || <Package className="h-4 w-4" />;
  };

  const getChannelIcon = (channel: string) => {
    const iconMap: Record<string, React.ReactNode> = {
      sms: <MessageSquare className="h-5 w-5" style={{ color: colors.brand.primary }} />,
      email: <Mail className="h-5 w-5" style={{ color: '#10B981' }} />,
      whatsapp: <Phone className="h-5 w-5" style={{ color: '#25D366' }} />,
      push: <Bell className="h-5 w-5" style={{ color: '#F59E0B' }} />
    };
    return iconMap[channel.toLowerCase()] || <Zap className="h-5 w-5" style={{ color: colors.brand.primary }} />;
  };

  return (
    <div
      className="min-h-screen p-6 transition-colors"
      style={{
        background: isDarkMode
          ? 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)'
          : 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 50%, #f8fafc 100%)'
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center">
          <button
            onClick={handleBack}
            className="mr-4 p-2 rounded-full transition-all hover:scale-105"
            style={{
              backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'
            }}
          >
            <ArrowLeft
              className="h-5 w-5"
              style={{ color: colors.utility.secondaryText }}
            />
          </button>
          <div>
            <h1
              className="text-2xl font-bold"
              style={{ color: colors.utility.primaryText }}
            >
              My Subscription
            </h1>
            <p
              className="text-sm"
              style={{ color: colors.utility.secondaryText }}
            >
              Manage your plan, track usage, and buy credits
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            className="p-2 rounded-lg transition-all hover:scale-105"
            style={{
              backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'
            }}
          >
            <RefreshCw
              className={`h-5 w-5 ${usageLoading || creditLoading ? 'animate-spin' : ''}`}
              style={{ color: colors.utility.secondaryText }}
            />
          </button>
          <button
            onClick={handleUpgrade}
            className="px-4 py-2 rounded-lg font-medium transition-all hover:opacity-90 flex items-center gap-2"
            style={{
              backgroundColor: colors.brand.primary,
              color: 'white'
            }}
          >
            <TrendingUp className="h-4 w-4" />
            Upgrade Plan
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <SummaryCard
          icon={<CreditCard className="h-6 w-6" style={{ color: colors.brand.primary }} />}
          label="Current Plan"
          value={subscription.plan.name}
          subtext={`${formatCurrency(subscription.amountPerBilling, subscription.currency)}/month`}
          isActive={subscription.status === 'active'}
          accentColor={colors.brand.primary}
        />
        <SummaryCard
          icon={<BarChart3 className="h-6 w-6" style={{ color: '#10B981' }} />}
          label="Usage This Period"
          value={usageSummary?.period?.days_remaining ? `${usageSummary.period.days_remaining} days left` : 'Loading...'}
          subtext={usageData.length > 0 ? `${usageData.filter(u => u.percentage > 75).length} resources high usage` : 'No data'}
          trend={usageData.length > 0 ? { value: 12, isPositive: true } : undefined}
          accentColor="#10B981"
        />
        <SummaryCard
          icon={<Coins className="h-6 w-6" style={{ color: isLowCredits ? '#F59E0B' : '#8B5CF6' }} />}
          label="Notification Credits"
          value={creditLoading ? '...' : totalCredits.toLocaleString()}
          subtext={isLowCredits ? '⚠️ Low balance - consider topping up' : 'Credits available'}
          accentColor={isLowCredits ? '#F59E0B' : '#8B5CF6'}
          onClick={() => setActiveTab('credits')}
        />
      </div>

      {/* Tab Switcher */}
      <div
        className="inline-flex rounded-xl p-1 mb-6"
        style={{
          background: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'
        }}
      >
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-6 py-2 rounded-lg text-sm font-medium transition-all`}
          style={{
            backgroundColor: activeTab === 'overview' ? colors.brand.primary : 'transparent',
            color: activeTab === 'overview' ? 'white' : colors.utility.secondaryText
          }}
        >
          Overview
        </button>
        <button
          onClick={() => setActiveTab('credits')}
          className={`px-6 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2`}
          style={{
            backgroundColor: activeTab === 'credits' ? colors.brand.primary : 'transparent',
            color: activeTab === 'credits' ? 'white' : colors.utility.secondaryText
          }}
        >
          Credits
          {isLowCredits && (
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: '#F59E0B' }}
            />
          )}
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Usage & Plan */}
          <div className="lg:col-span-2 space-y-6">
            {/* Usage Statistics */}
            <SectionCard
              title="Usage Statistics"
              subtitle="Resource consumption this billing period"
              headerBadge={
                usageSummary?.period && (
                  <span
                    className="text-xs px-2 py-1 rounded-full"
                    style={{
                      backgroundColor: `${colors.brand.primary}20`,
                      color: colors.brand.primary
                    }}
                  >
                    {usageSummary.period.days_remaining} days left
                  </span>
                )
              }
            >
              {usageLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2
                    className="h-8 w-8 animate-spin"
                    style={{ color: colors.brand.primary }}
                  />
                </div>
              ) : usageData.length === 0 ? (
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
                    Choose a plan to get started with usage tracking.
                  </p>
                  <button
                    onClick={handleUpgrade}
                    className="px-6 py-2 rounded-lg font-medium transition-all hover:opacity-90 flex items-center gap-2"
                    style={{
                      backgroundColor: colors.brand.primary,
                      color: 'white'
                    }}
                  >
                    <TrendingUp className="h-4 w-4" />
                    View Plans
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  {usageData.map((usage, index) => (
                    <UsageProgress
                      key={index}
                      label={usage.feature}
                      icon={getFeatureIcon(usage.feature)}
                      used={usage.used}
                      limit={usage.limit}
                      percentage={usage.percentage}
                      formatValue={usage.feature === 'Storage Used' ? formatStorageSize : undefined}
                    />
                  ))}
                </div>
              )}
            </SectionCard>

            {/* Plan Features */}
            <SectionCard title="Plan Features" subtitle="What's included in your plan">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {subscription.plan.features
                  .filter((f) => f.included)
                  .map((feature, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <CheckCircle
                        className="h-5 w-5 flex-shrink-0"
                        style={{ color: colors.semantic.success }}
                      />
                      <div>
                        <span
                          className="font-medium text-sm"
                          style={{ color: colors.utility.primaryText }}
                        >
                          {feature.name}
                        </span>
                        {feature.limit && (
                          <span
                            className="text-xs ml-2"
                            style={{ color: colors.utility.secondaryText }}
                          >
                            ({feature.limit})
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </SectionCard>
          </div>

          {/* Right Column - Billing & Quick Actions */}
          <div className="space-y-6">
            {/* Plan Status */}
            <SectionCard title="Plan Status">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span style={{ color: colors.utility.secondaryText }}>Status</span>
                  {getStatusBadge(subscription.status)}
                </div>
                <div className="flex items-center justify-between">
                  <span style={{ color: colors.utility.secondaryText }}>Users</span>
                  <span
                    className="font-medium"
                    style={{ color: colors.utility.primaryText }}
                  >
                    {subscription.userCount} active
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span style={{ color: colors.utility.secondaryText }}>Next Billing</span>
                  <span
                    className="font-medium"
                    style={{ color: colors.utility.primaryText }}
                  >
                    {formatDate(subscription.nextBillingDate)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span style={{ color: colors.utility.secondaryText }}>Amount</span>
                  <span
                    className="font-bold text-lg"
                    style={{ color: colors.brand.primary }}
                  >
                    {formatCurrency(subscription.amountPerBilling)}
                  </span>
                </div>
              </div>
            </SectionCard>

            {/* Quick Actions */}
            <SectionCard title="Quick Actions">
              <div className="space-y-3">
                <button
                  onClick={handleUpgrade}
                  className="w-full px-4 py-3 rounded-xl text-sm font-medium transition-all hover:opacity-90 flex items-center justify-center gap-2"
                  style={{
                    backgroundColor: colors.brand.primary,
                    color: 'white'
                  }}
                >
                  <TrendingUp className="h-4 w-4" />
                  Upgrade Plan
                </button>
                <button
                  className="w-full px-4 py-3 rounded-xl text-sm font-medium transition-all hover:opacity-80 flex items-center justify-center gap-2"
                  style={{
                    backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                    color: colors.utility.primaryText
                  }}
                >
                  <Download className="h-4 w-4" />
                  Download Invoice
                </button>
                <button
                  className="w-full px-4 py-3 rounded-xl text-sm font-medium transition-all hover:opacity-80 flex items-center justify-center gap-2"
                  style={{
                    backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                    color: colors.utility.primaryText
                  }}
                >
                  <ExternalLink className="h-4 w-4" />
                  Billing History
                </button>
              </div>
            </SectionCard>

            {/* Payment Method */}
            {subscription.paymentMethod && (
              <SectionCard title="Payment Method">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-md flex items-center justify-center">
                    <CreditCard className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <div
                      className="font-medium text-sm"
                      style={{ color: colors.utility.primaryText }}
                    >
                      •••• •••• •••• {subscription.paymentMethod.last4}
                    </div>
                    <div
                      className="text-xs"
                      style={{ color: colors.utility.secondaryText }}
                    >
                      Expires {subscription.paymentMethod.expiryDate}
                    </div>
                  </div>
                </div>
                <button
                  className="mt-4 text-sm font-medium flex items-center gap-1 transition-all hover:opacity-80"
                  style={{ color: colors.brand.primary }}
                >
                  <Settings className="h-4 w-4" />
                  Update Payment Method
                </button>
              </SectionCard>
            )}
          </div>
        </div>
      ) : (
        /* Credits Tab */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Credit Balances */}
          <div className="lg:col-span-2 space-y-6">
            <SectionCard
              title="Credit Balances"
              subtitle="Notification credits by channel"
              action={
                <button
                  onClick={handleRefresh}
                  className="text-sm font-medium flex items-center gap-1"
                  style={{ color: colors.brand.primary }}
                >
                  <RefreshCw className={`h-4 w-4 ${creditLoading ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
              }
            >
              {creditLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2
                    className="h-8 w-8 animate-spin"
                    style={{ color: colors.brand.primary }}
                  />
                </div>
              ) : !creditBalance?.balances || creditBalance.balances.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div
                    className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
                    style={{ backgroundColor: `${colors.utility.secondaryText}20` }}
                  >
                    <Coins
                      className="h-8 w-8"
                      style={{ color: colors.utility.secondaryText }}
                    />
                  </div>
                  <h3
                    className="text-lg font-medium mb-2"
                    style={{ color: colors.utility.primaryText }}
                  >
                    No Credits Yet
                  </h3>
                  <p
                    className="text-sm mb-6 max-w-sm"
                    style={{ color: colors.utility.secondaryText }}
                  >
                    Purchase a topup pack to start sending notifications.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {creditBalance.balances.map((balance, index) => (
                    <CreditChannelCard
                      key={index}
                      channel={balance.channel.charAt(0).toUpperCase() + balance.channel.slice(1)}
                      icon={getChannelIcon(balance.channel)}
                      balance={balance.balance}
                      isLow={balance.is_low}
                      onTopup={() => handleTopupChannel(balance.channel)}
                    />
                  ))}
                </div>
              )}
            </SectionCard>

            {/* Credit Usage History - Placeholder */}
            <SectionCard title="Recent Usage" subtitle="Last 7 days of notification activity">
              <div className="flex items-center justify-center py-12 text-center">
                <p style={{ color: colors.utility.secondaryText }}>
                  Usage history coming soon...
                </p>
              </div>
            </SectionCard>
          </div>

          {/* Topup Packs */}
          <div className="space-y-6">
            <SectionCard title="Topup Packs" subtitle="Buy more notification credits">
              {packsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2
                    className="h-8 w-8 animate-spin"
                    style={{ color: colors.brand.primary }}
                  />
                </div>
              ) : !topupPacks?.packs || topupPacks.packs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <p style={{ color: colors.utility.secondaryText }}>
                    No topup packs available
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {topupPacks.packs.map((pack, index) => (
                    <TopupPackCard
                      key={index}
                      pack={pack}
                      onBuy={() => handleBuyPack(pack)}
                    />
                  ))}
                </div>
              )}
            </SectionCard>

            {/* Need Help */}
            <SectionCard title="Need More Credits?">
              <p
                className="text-sm mb-4"
                style={{ color: colors.utility.secondaryText }}
              >
                Contact us for custom enterprise credit packages with volume discounts.
              </p>
              <button
                className="w-full px-4 py-3 rounded-xl text-sm font-medium transition-all hover:opacity-80 flex items-center justify-center gap-2"
                style={{
                  backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                  color: colors.utility.primaryText
                }}
              >
                <Mail className="h-4 w-4" />
                Contact Sales
              </button>
            </SectionCard>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubscriptionDashboard;
