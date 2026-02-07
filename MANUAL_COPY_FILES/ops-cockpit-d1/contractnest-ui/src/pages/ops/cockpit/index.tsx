// src/pages/ops/cockpit/index.tsx
// Operations Cockpit — Revenue & Expense command center
// D1: Shell + Stats + Event Urgency + VaNi Sidebar + Footer

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Gauge,
  FileText,
  Send,
  AlertTriangle,
  Calendar,
  DollarSign,
  Wrench,
  Plus,
  RefreshCw,
  Users,
  Sparkles,
  ShieldCheck,
  BellRing,
  CreditCard,
  Clock,
} from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { useTenantContext } from '@/contexts/TenantContext';
import { useContractStats } from '@/hooks/queries/useContractQueries';
import { useTenantDateSummary } from '@/hooks/queries/useContractEventQueries';
import { StatCard } from '@/components/subscription/cards/StatCard';
import { VaNiLoader } from '@/components/common/loaders/UnifiedLoader';

// =================================================================
// TYPES
// =================================================================

type Perspective = 'revenue' | 'expense';

// =================================================================
// SUB-COMPONENTS
// =================================================================

// ─── Perspective Switcher ───────────────────────────────────────

interface PerspectiveSwitcherProps {
  active: Perspective;
  onChange: (p: Perspective) => void;
  colors: any;
  isDarkMode: boolean;
}

const PerspectiveSwitcher: React.FC<PerspectiveSwitcherProps> = ({
  active,
  onChange,
  colors,
  isDarkMode,
}) => {
  const perspectives: Array<{ id: Perspective; label: string; sublabel: string }> = [
    { id: 'revenue', label: 'Revenue', sublabel: 'Clients' },
    { id: 'expense', label: 'Expense', sublabel: 'Vendors' },
  ];

  return (
    <div
      className="inline-flex rounded-xl p-1 gap-1"
      style={{
        background: isDarkMode ? 'rgba(30, 41, 59, 0.6)' : 'rgba(0, 0, 0, 0.06)',
        backdropFilter: 'blur(8px)',
      }}
    >
      {perspectives.map((p) => {
        const isActive = active === p.id;
        return (
          <button
            key={p.id}
            onClick={() => onChange(p.id)}
            className="px-5 py-2 rounded-lg text-sm font-semibold transition-all duration-200"
            style={{
              backgroundColor: isActive ? colors.brand.primary : 'transparent',
              color: isActive ? '#ffffff' : colors.utility.secondaryText,
              boxShadow: isActive ? `0 2px 8px ${colors.brand.primary}40` : 'none',
            }}
          >
            <span>{p.label}</span>
            <span
              className="ml-1.5 text-xs font-normal"
              style={{ opacity: isActive ? 0.85 : 0.6 }}
            >
              · {p.sublabel}
            </span>
          </button>
        );
      })}
    </div>
  );
};

// ─── Event Urgency Bucket Card ──────────────────────────────────
// Follows BucketCard pattern from TimelineTab.tsx

interface BucketCardProps {
  title: string;
  count: number;
  serviceCount: number;
  billingCount: number;
  color: string;
  colors: any;
  isDarkMode: boolean;
  isHighlighted?: boolean;
}

const BucketCard: React.FC<BucketCardProps> = ({
  title,
  count,
  serviceCount,
  billingCount,
  color,
  colors,
  isDarkMode,
  isHighlighted,
}) => (
  <div
    className="flex-1 min-w-[120px] p-3.5 rounded-xl border transition-all"
    style={{
      backgroundColor: isHighlighted
        ? `${color}08`
        : isDarkMode
          ? 'rgba(30, 41, 59, 0.6)'
          : 'rgba(255, 255, 255, 0.7)',
      borderColor: isHighlighted ? `${color}30` : `${colors.utility.primaryText}10`,
      backdropFilter: 'blur(8px)',
    }}
  >
    <div className="flex items-center justify-between mb-2">
      <span
        className="text-[10px] font-bold uppercase tracking-wider"
        style={{ color }}
      >
        {title}
      </span>
      <span
        className="text-lg font-bold"
        style={{ color: isHighlighted ? color : colors.utility.primaryText }}
      >
        {count}
      </span>
    </div>
    <div className="flex items-center gap-3 text-[10px]" style={{ color: colors.utility.secondaryText }}>
      <span className="flex items-center gap-1">
        <Wrench className="w-3 h-3" style={{ color: colors.semantic.success }} />
        {serviceCount}
      </span>
      <span className="flex items-center gap-1">
        <DollarSign className="w-3 h-3" style={{ color: colors.semantic.warning }} />
        {billingCount}
      </span>
    </div>
  </div>
);

// ─── VaNi Sidebar (Coming Soon) ────────────────────────────────

interface VaNiSidebarProps {
  colors: any;
  isDarkMode: boolean;
}

const VaNiSidebar: React.FC<VaNiSidebarProps> = ({ colors, isDarkMode }) => {
  const futureItems = [
    { icon: AlertTriangle, label: 'SLA Breach Alerts', description: 'Auto-detect SLA violations' },
    { icon: BellRing, label: 'Renewal Reminders', description: 'Smart renewal nudges' },
    { icon: CreditCard, label: 'Payment Nudges', description: 'Overdue invoice follow-ups' },
    { icon: ShieldCheck, label: 'Compliance Flags', description: 'Regulatory alerts' },
    { icon: Sparkles, label: 'Smart Recommendations', description: 'AI-powered insights' },
  ];

  return (
    <div
      className="rounded-2xl border overflow-hidden"
      style={{
        background: isDarkMode
          ? 'rgba(30, 41, 59, 0.8)'
          : 'rgba(255, 255, 255, 0.8)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
      }}
    >
      {/* Header */}
      <div
        className="px-5 py-4 border-b flex items-center gap-2.5"
        style={{ borderColor: `${colors.utility.primaryText}10` }}
      >
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{
            background: `linear-gradient(135deg, ${colors.brand.primary}20, ${colors.brand.secondary}15)`,
          }}
        >
          <Sparkles className="h-4 w-4" style={{ color: colors.brand.primary }} />
        </div>
        <div>
          <h3 className="text-sm font-bold" style={{ color: colors.utility.primaryText }}>
            VaNi
          </h3>
          <p className="text-[10px]" style={{ color: colors.utility.secondaryText }}>
            AI Operations Assistant
          </p>
        </div>
      </div>

      {/* Coming Soon State */}
      <div className="p-5">
        <div
          className="text-center py-6 mb-4 rounded-xl"
          style={{ backgroundColor: `${colors.brand.primary}06` }}
        >
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3"
            style={{
              background: `linear-gradient(135deg, ${colors.brand.primary}15, ${colors.brand.primary}05)`,
            }}
          >
            <Sparkles className="h-7 w-7" style={{ color: colors.brand.primary }} />
          </div>
          <p className="text-sm font-semibold mb-1" style={{ color: colors.utility.primaryText }}>
            Coming Soon
          </p>
          <p className="text-xs px-4" style={{ color: colors.utility.secondaryText }}>
            VaNi will proactively surface alerts and recommendations here
          </p>
        </div>

        {/* Future capabilities list */}
        <div className="space-y-2.5">
          <p
            className="text-[10px] font-bold uppercase tracking-wider px-1"
            style={{ color: colors.utility.secondaryText }}
          >
            Planned Capabilities
          </p>
          {futureItems.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.label}
                className="flex items-center gap-3 p-2.5 rounded-lg"
                style={{ backgroundColor: `${colors.utility.primaryText}04` }}
              >
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: `${colors.utility.primaryText}08` }}
                >
                  <Icon className="h-3.5 w-3.5" style={{ color: colors.utility.secondaryText }} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium" style={{ color: colors.utility.primaryText }}>
                    {item.label}
                  </p>
                  <p className="text-[10px]" style={{ color: colors.utility.secondaryText }}>
                    {item.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ─── Footer Status Bar ─────────────────────────────────────────

interface FooterStatusBarProps {
  totalContracts: number;
  totalEvents: number;
  isRefreshing: boolean;
  onRefresh: () => void;
  colors: any;
  isDarkMode: boolean;
}

const FooterStatusBar: React.FC<FooterStatusBarProps> = ({
  totalContracts,
  totalEvents,
  isRefreshing,
  onRefresh,
  colors,
  isDarkMode,
}) => {
  const [lastRefreshed, setLastRefreshed] = useState(new Date());

  useEffect(() => {
    if (!isRefreshing) {
      setLastRefreshed(new Date());
    }
  }, [isRefreshing]);

  return (
    <div
      className="mt-6 px-5 py-3 rounded-xl border flex items-center justify-between"
      style={{
        background: isDarkMode
          ? 'rgba(30, 41, 59, 0.5)'
          : 'rgba(255, 255, 255, 0.6)',
        backdropFilter: 'blur(8px)',
        borderColor: `${colors.utility.primaryText}08`,
      }}
    >
      <div className="flex items-center gap-4 text-xs" style={{ color: colors.utility.secondaryText }}>
        <span className="flex items-center gap-1.5">
          <FileText className="h-3 w-3" />
          {totalContracts} contracts
        </span>
        <span className="flex items-center gap-1.5">
          <Calendar className="h-3 w-3" />
          {totalEvents} events
        </span>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-[10px]" style={{ color: colors.utility.secondaryText }}>
          Synced {lastRefreshed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all hover:opacity-80"
          style={{
            backgroundColor: `${colors.brand.primary}10`,
            color: colors.brand.primary,
          }}
        >
          <RefreshCw className={`h-3 w-3 ${isRefreshing ? 'animate-spin' : ''}`} />
          {isRefreshing ? 'Syncing...' : 'Refresh'}
        </button>
      </div>
    </div>
  );
};

// =================================================================
// MAIN PAGE COMPONENT
// =================================================================

const OpsCockpitPage: React.FC = () => {
  const navigate = useNavigate();
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  // Tenant profile — for default perspective
  const { profile, loading: profileLoading } = useTenantContext();

  // Perspective state — defaults from business_type_id once profile loads
  const [perspective, setPerspective] = useState<Perspective | null>(null);

  useEffect(() => {
    if (perspective === null && profile?.business_type_id) {
      setPerspective(profile.business_type_id === 'buyer' ? 'expense' : 'revenue');
    }
  }, [profile?.business_type_id, perspective]);

  const activePerspective: Perspective = perspective || 'revenue';

  // Data hooks
  const {
    data: contractStats,
    isLoading: statsLoading,
    isFetching: statsFetching,
    refetch: refetchStats,
  } = useContractStats();

  const {
    data: dateSummary,
    isLoading: summaryLoading,
    isFetching: summaryFetching,
    refetch: refetchSummary,
  } = useTenantDateSummary();

  const isLoading = profileLoading || statsLoading || summaryLoading;
  const isRefreshing = statsFetching || summaryFetching;

  // Derived stats — guard every value with Number() to prevent undefined reaching StatCard
  const stats = useMemo(() => {
    if (!contractStats) return { active: 0, pendingAcceptance: 0, drafts: 0, total: 0 };
    const byStatus = contractStats.by_status || {};
    return {
      active: Number(byStatus.active) || 0,
      pendingAcceptance: Number(byStatus.pending_acceptance) || 0,
      drafts: Number(byStatus.draft) || 0,
      total: Number(contractStats.total) || 0,
    };
  }, [contractStats]);

  // Event urgency from tenant-wide date summary
  // Normalize each bucket to ensure count/service_count/billing_count are always numbers
  const urgency = useMemo(() => {
    const empty = { count: 0, service_count: 0, billing_count: 0, billing_amount: 0, by_status: {} };
    const safeBucket = (b: any) => ({
      count: Number(b?.count) || 0,
      service_count: Number(b?.service_count) || 0,
      billing_count: Number(b?.billing_count) || 0,
      billing_amount: Number(b?.billing_amount) || 0,
      by_status: b?.by_status || {},
    });
    if (!dateSummary) {
      return {
        overdue: empty,
        today: empty,
        tomorrow: empty,
        this_week: empty,
        next_week: empty,
        later: empty,
        totals: { total_events: 0, total_billing_amount: 0 },
      };
    }
    return {
      overdue: safeBucket(dateSummary.overdue),
      today: safeBucket(dateSummary.today),
      tomorrow: safeBucket(dateSummary.tomorrow),
      this_week: safeBucket(dateSummary.this_week),
      next_week: safeBucket(dateSummary.next_week),
      later: safeBucket(dateSummary.later),
      totals: {
        total_events: Number(dateSummary.totals?.total_events) || 0,
        total_billing_amount: Number(dateSummary.totals?.total_billing_amount) || 0,
      },
    };
  }, [dateSummary]);

  // Refresh all data
  const handleRefresh = () => {
    refetchStats();
    refetchSummary();
  };

  // CTAs per perspective
  const revenueCTAs = [
    { label: 'New Contract', icon: Plus, action: () => navigate('/contracts/create') },
    { label: 'Add Client', icon: Users, action: () => navigate('/contacts') },
  ];

  const expenseCTAs = [
    { label: 'New RFQ', icon: Plus, action: () => navigate('/contracts/create') },
    { label: 'Claim CNAK', icon: ShieldCheck, action: () => navigate('/contracts/claim') },
  ];

  const activeCTAs = activePerspective === 'revenue' ? revenueCTAs : expenseCTAs;

  // ─── Loading ───
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <VaNiLoader
          size="md"
          message="Loading Operations Cockpit..."
          showSkeleton
          skeletonVariant="card"
          skeletonCount={4}
        />
      </div>
    );
  }

  return (
    <div
      className="min-h-screen p-6"
      style={{ backgroundColor: colors.utility.primaryBackground }}
    >
      {/* ═══════ HEADER ═══════ */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{
              background: `linear-gradient(135deg, ${colors.brand.primary}20, ${colors.brand.secondary}15)`,
            }}
          >
            <Gauge className="h-5 w-5" style={{ color: colors.brand.primary }} />
          </div>
          <div>
            <h1
              className="text-xl font-bold"
              style={{ color: colors.utility.primaryText }}
            >
              Operations Cockpit
            </h1>
            <p
              className="text-xs"
              style={{ color: colors.utility.secondaryText }}
            >
              {activePerspective === 'revenue'
                ? 'Revenue operations — what needs your attention today'
                : 'Expense operations — procurement & vendor management'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <PerspectiveSwitcher
            active={activePerspective}
            onChange={(p) => setPerspective(p)}
            colors={colors}
            isDarkMode={isDarkMode}
          />
          {activeCTAs.map((cta) => {
            const Icon = cta.icon;
            return (
              <button
                key={cta.label}
                onClick={cta.action}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all hover:opacity-90"
                style={{
                  backgroundColor: colors.brand.primary,
                  color: '#ffffff',
                  boxShadow: `0 2px 8px ${colors.brand.primary}30`,
                }}
              >
                <Icon className="h-3.5 w-3.5" />
                {cta.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ═══════ STAT CARDS ROW ═══════ */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatCard
          label="Active Contracts"
          value={stats.active}
          icon={FileText}
          iconColor={colors.semantic.success}
          size="sm"
        />
        <StatCard
          label="Pending Acceptance"
          value={stats.pendingAcceptance}
          icon={Send}
          iconColor={colors.semantic.warning}
          size="sm"
        />
        <StatCard
          label="Drafts"
          value={stats.drafts}
          icon={FileText}
          iconColor={colors.utility.secondaryText}
          size="sm"
        />
        <StatCard
          label="Overdue Events"
          value={urgency.overdue.count}
          icon={AlertTriangle}
          iconColor={urgency.overdue.count > 0 ? colors.semantic.error : colors.utility.secondaryText}
          size="sm"
        />
      </div>

      {/* ═══════ MAIN GRID: Content + VaNi Sidebar ═══════ */}
      <div className="grid gap-6" style={{ gridTemplateColumns: '1fr 300px' }}>
        {/* Left: Main Content */}
        <div className="space-y-6">

          {/* Event Urgency Buckets — follows TimelineTab BucketCard pattern */}
          <div
            className="rounded-2xl border p-5"
            style={{
              background: isDarkMode
                ? 'rgba(30, 41, 59, 0.8)'
                : 'rgba(255, 255, 255, 0.8)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" style={{ color: colors.brand.primary }} />
                <h3 className="text-sm font-bold" style={{ color: colors.utility.primaryText }}>
                  Event Schedule
                </h3>
              </div>
              <span className="text-xs" style={{ color: colors.utility.secondaryText }}>
                {urgency.totals.total_events} total events
              </span>
            </div>

            <div className="flex gap-3">
              <BucketCard
                title="Overdue"
                count={urgency.overdue.count}
                serviceCount={urgency.overdue.service_count}
                billingCount={urgency.overdue.billing_count}
                color={colors.semantic.error}
                colors={colors}
                isDarkMode={isDarkMode}
                isHighlighted={urgency.overdue.count > 0}
              />
              <BucketCard
                title="Today"
                count={urgency.today.count}
                serviceCount={urgency.today.service_count}
                billingCount={urgency.today.billing_count}
                color={colors.brand.primary}
                colors={colors}
                isDarkMode={isDarkMode}
                isHighlighted={urgency.today.count > 0}
              />
              <BucketCard
                title="Tomorrow"
                count={urgency.tomorrow.count}
                serviceCount={urgency.tomorrow.service_count}
                billingCount={urgency.tomorrow.billing_count}
                color={colors.brand.secondary}
                colors={colors}
                isDarkMode={isDarkMode}
              />
              <BucketCard
                title="This Week"
                count={urgency.this_week.count}
                serviceCount={urgency.this_week.service_count}
                billingCount={urgency.this_week.billing_count}
                color={colors.semantic?.info || colors.brand.secondary}
                colors={colors}
                isDarkMode={isDarkMode}
              />
              <BucketCard
                title="Next Week"
                count={urgency.next_week.count}
                serviceCount={urgency.next_week.service_count}
                billingCount={urgency.next_week.billing_count}
                color={colors.semantic.warning}
                colors={colors}
                isDarkMode={isDarkMode}
              />
              <BucketCard
                title="Later"
                count={urgency.later.count}
                serviceCount={urgency.later.service_count}
                billingCount={urgency.later.billing_count}
                color={colors.utility.secondaryText}
                colors={colors}
                isDarkMode={isDarkMode}
              />
            </div>
          </div>

          {/* ═══ D2 Placeholder: Operational Cards ═══ */}
          <div
            className="rounded-2xl border p-8 text-center"
            style={{
              background: isDarkMode
                ? 'rgba(30, 41, 59, 0.4)'
                : 'rgba(255, 255, 255, 0.5)',
              backdropFilter: 'blur(8px)',
              borderColor: `${colors.utility.primaryText}15`,
              borderStyle: 'dashed',
            }}
          >
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3"
              style={{ backgroundColor: `${colors.brand.primary}10` }}
            >
              <Gauge className="h-6 w-6" style={{ color: colors.brand.primary }} />
            </div>
            <p className="text-sm font-semibold mb-1" style={{ color: colors.utility.primaryText }}>
              Operational Cards — Next Delivery
            </p>
            <p className="text-xs" style={{ color: colors.utility.secondaryText }}>
              {activePerspective === 'revenue'
                ? 'Awaiting Acceptance · Service Events · Action Queue'
                : 'CNAK Verification · RFQ Tracker · Service Events · Action Queue'}
            </p>
          </div>
        </div>

        {/* Right: VaNi Sidebar */}
        <VaNiSidebar colors={colors} isDarkMode={isDarkMode} />
      </div>

      {/* ═══════ FOOTER STATUS BAR ═══════ */}
      <FooterStatusBar
        totalContracts={stats.total}
        totalEvents={urgency.totals.total_events}
        isRefreshing={isRefreshing}
        onRefresh={handleRefresh}
        colors={colors}
        isDarkMode={isDarkMode}
      />
    </div>
  );
};

export default OpsCockpitPage;
