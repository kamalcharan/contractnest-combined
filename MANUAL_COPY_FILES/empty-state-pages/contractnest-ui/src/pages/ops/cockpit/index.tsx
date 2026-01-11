// src/pages/ops/cockpit/index.tsx
// Operations Cockpit - Real-time Contract Operations Dashboard
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  FileText,
  Clock,
  CheckCircle,
  AlertTriangle,
  TrendingUp,
  Users,
  Calendar,
  DollarSign,
  RefreshCw,
  Filter,
  Download,
  Bell,
  Eye,
  Gauge,
  Zap,
  Target,
  LineChart
} from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import ComingSoonWrapper from '@/components/common/ComingSoonWrapper';

// Coming soon features for Operations
const operationsFeatures = [
  {
    icon: Gauge,
    title: 'Real-time Operations Dashboard',
    description: 'Monitor contract operations live. Track active deals, pending approvals, and bottlenecks at a glance.',
    highlight: true
  },
  {
    icon: Bell,
    title: 'Smart Alerts & Notifications',
    description: 'Never miss a deadline. Automated alerts for expirations, renewals, and pending actions.',
    highlight: false
  },
  {
    icon: LineChart,
    title: 'Performance Analytics',
    description: 'Measure contract velocity, completion rates, and team performance with actionable insights.',
    highlight: false
  },
  {
    icon: Zap,
    title: 'Quick Actions Hub',
    description: 'One-click access to common operations. Create contracts, invite parties, and manage workflows.',
    highlight: false
  }
];

// Floating icons for operations
const operationsFloatingIcons = [
  { Icon: Activity, top: '8%', left: '5%', delay: '0s', duration: '21s' },
  { Icon: Gauge, top: '15%', right: '6%', delay: '1.5s', duration: '18s' },
  { Icon: Bell, top: '55%', left: '4%', delay: '3s', duration: '22s' },
  { Icon: TrendingUp, top: '65%', right: '5%', delay: '2s', duration: '19s' },
  { Icon: Target, top: '35%', left: '7%', delay: '4s', duration: '20s' },
  { Icon: Clock, top: '45%', right: '8%', delay: '2.5s', duration: '17s' },
];

// Reusing existing components
import ActivityFeed from '@/components/dashboard/ActivityFeed';
import StatsCard from '@/components/dashboard/StatsCard';
import ContractStatsGrid from '@/components/contracts/ContractStatsGrid';
import RecentContractsCard from '@/components/contracts/RecentContractsCard';

type TimeRange = 'today' | 'week' | 'month' | 'quarter';

const OpsCockpitPage: React.FC = () => {
  const navigate = useNavigate();
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  const [timeRange, setTimeRange] = useState<TimeRange>('week');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Mock operational data
  const operationalStats = {
    activeContracts: 47,
    pendingApprovals: 8,
    expiringThisMonth: 5,
    renewalsDue: 12,
    totalValue: 4500000,
    completionRate: 94
  };

  const alerts = [
    { id: 1, type: 'warning', message: '3 contracts expiring in 7 days', action: 'View' },
    { id: 2, type: 'info', message: '5 pending signature requests', action: 'Review' },
    { id: 3, type: 'success', message: '2 contracts signed today', action: 'View' }
  ];

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  const getAlertStyle = (type: string) => {
    switch (type) {
      case 'warning':
        return { bg: `${colors.semantic.warning}15`, border: colors.semantic.warning, icon: AlertTriangle };
      case 'success':
        return { bg: `${colors.semantic.success}15`, border: colors.semantic.success, icon: CheckCircle };
      default:
        return { bg: `${colors.brand.primary}15`, border: colors.brand.primary, icon: Bell };
    }
  };

  return (
    <div
      className="min-h-screen p-6"
      style={{ backgroundColor: colors.utility.primaryBackground }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1
            className="text-2xl font-bold"
            style={{ color: colors.utility.primaryText }}
          >
            Operations Cockpit
          </h1>
          <p
            className="text-sm"
            style={{ color: colors.utility.secondaryText }}
          >
            Real-time contract operations monitoring
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Time Range Filter */}
          <div
            className="flex rounded-lg p-1"
            style={{ backgroundColor: `${colors.utility.primaryText}10` }}
          >
            {(['today', 'week', 'month', 'quarter'] as TimeRange[]).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className="px-3 py-1.5 rounded-md text-sm font-medium transition-all capitalize"
                style={{
                  backgroundColor: timeRange === range ? colors.brand.primary : 'transparent',
                  color: timeRange === range ? '#fff' : colors.utility.primaryText
                }}
              >
                {range}
              </button>
            ))}
          </div>

          {/* Refresh Button */}
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="p-2 rounded-lg transition-colors hover:opacity-80"
            style={{ backgroundColor: `${colors.utility.primaryText}10` }}
          >
            <RefreshCw
              size={20}
              className={isRefreshing ? 'animate-spin' : ''}
              style={{ color: colors.utility.primaryText }}
            />
          </button>

          {/* Export Button */}
          <button
            className="flex items-center gap-2 px-4 py-2 rounded-lg transition-colors hover:opacity-80"
            style={{
              backgroundColor: colors.brand.primary,
              color: '#fff'
            }}
          >
            <Download size={18} />
            Export
          </button>
        </div>
      </div>

      {/* Alerts Banner */}
      <div className="mb-6 space-y-2">
        {alerts.map((alert) => {
          const alertStyle = getAlertStyle(alert.type);
          const AlertIcon = alertStyle.icon;
          return (
            <div
              key={alert.id}
              className="flex items-center justify-between p-3 rounded-lg border-l-4"
              style={{
                backgroundColor: alertStyle.bg,
                borderLeftColor: alertStyle.border
              }}
            >
              <div className="flex items-center gap-3">
                <AlertIcon size={18} style={{ color: alertStyle.border }} />
                <span style={{ color: colors.utility.primaryText }}>{alert.message}</span>
              </div>
              <button
                className="text-sm font-medium px-3 py-1 rounded-md transition-colors hover:opacity-80"
                style={{
                  backgroundColor: `${alertStyle.border}20`,
                  color: alertStyle.border
                }}
              >
                {alert.action}
              </button>
            </div>
          );
        })}
      </div>

      {/* Stats Grid - Using existing StatsCard component */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatsCard
          title="Active Contracts"
          value={operationalStats.activeContracts}
          trend="up"
          change={12}
          icon={FileText}
        />
        <StatsCard
          title="Pending Approvals"
          value={operationalStats.pendingApprovals}
          trend="down"
          change={5}
          icon={Clock}
        />
        <StatsCard
          title="Expiring This Month"
          value={operationalStats.expiringThisMonth}
          trend="neutral"
          change={0}
          icon={AlertTriangle}
        />
        <StatsCard
          title="Renewals Due"
          value={operationalStats.renewalsDue}
          trend="up"
          change={8}
          icon={RefreshCw}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Contract Status Overview */}
        <div className="lg:col-span-2 space-y-6">
          {/* Contract Status Grid - Reusing existing component */}
          <ContractStatsGrid
            contractStats={{
              draft: 3,
              sent: 8,
              negotiation: 4,
              inForce: 47,
              completed: 156
            }}
            contactId="ops-dashboard"
          />

          {/* Performance Metrics */}
          <div
            className="rounded-lg border p-6"
            style={{
              backgroundColor: colors.utility.secondaryBackground,
              borderColor: `${colors.utility.primaryText}20`
            }}
          >
            <h3
              className="text-lg font-semibold mb-4"
              style={{ color: colors.utility.primaryText }}
            >
              Performance Metrics
            </h3>
            <div className="grid grid-cols-3 gap-6">
              <div className="text-center">
                <div
                  className="text-4xl font-bold mb-1"
                  style={{ color: colors.semantic.success }}
                >
                  {operationalStats.completionRate}%
                </div>
                <p
                  className="text-sm"
                  style={{ color: colors.utility.secondaryText }}
                >
                  Completion Rate
                </p>
              </div>
              <div className="text-center">
                <div
                  className="text-4xl font-bold mb-1"
                  style={{ color: colors.brand.primary }}
                >
                  4.2
                </div>
                <p
                  className="text-sm"
                  style={{ color: colors.utility.secondaryText }}
                >
                  Avg. Days to Sign
                </p>
              </div>
              <div className="text-center">
                <div
                  className="text-4xl font-bold mb-1"
                  style={{ color: colors.brand.secondary }}
                >
                  ₹{(operationalStats.totalValue / 100000).toFixed(1)}L
                </div>
                <p
                  className="text-sm"
                  style={{ color: colors.utility.secondaryText }}
                >
                  Total Value
                </p>
              </div>
            </div>

            {/* Progress Bars */}
            <div className="mt-6 space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span style={{ color: colors.utility.secondaryText }}>Contract Velocity</span>
                  <span style={{ color: colors.utility.primaryText }}>85%</span>
                </div>
                <div
                  className="h-2 rounded-full"
                  style={{ backgroundColor: `${colors.utility.primaryText}10` }}
                >
                  <div
                    className="h-2 rounded-full transition-all"
                    style={{ width: '85%', backgroundColor: colors.semantic.success }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span style={{ color: colors.utility.secondaryText }}>Renewal Rate</span>
                  <span style={{ color: colors.utility.primaryText }}>72%</span>
                </div>
                <div
                  className="h-2 rounded-full"
                  style={{ backgroundColor: `${colors.utility.primaryText}10` }}
                >
                  <div
                    className="h-2 rounded-full transition-all"
                    style={{ width: '72%', backgroundColor: colors.brand.primary }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Recent Contracts - Reusing existing component */}
          <RecentContractsCard contactId="ops-dashboard" />
        </div>

        {/* Right Column - Activity & Quick Actions */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <div
            className="rounded-lg border p-4"
            style={{
              backgroundColor: colors.utility.secondaryBackground,
              borderColor: `${colors.utility.primaryText}20`
            }}
          >
            <h3
              className="text-base font-semibold mb-4"
              style={{ color: colors.utility.primaryText }}
            >
              Quick Actions
            </h3>
            <div className="space-y-2">
              <button
                onClick={() => navigate('/contracts/create')}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg transition-colors hover:opacity-90"
                style={{
                  backgroundColor: colors.brand.primary,
                  color: '#fff'
                }}
              >
                <FileText size={18} />
                Create Contract
              </button>
              <button
                onClick={() => navigate('/contracts/preview')}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg border transition-colors hover:opacity-80"
                style={{
                  borderColor: `${colors.utility.primaryText}20`,
                  color: colors.utility.primaryText
                }}
              >
                <Eye size={18} />
                View All Contracts
              </button>
              <button
                onClick={() => navigate('/contracts/invite')}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg border transition-colors hover:opacity-80"
                style={{
                  borderColor: `${colors.utility.primaryText}20`,
                  color: colors.utility.primaryText
                }}
              >
                <Users size={18} />
                Invite Sellers
              </button>
            </div>
          </div>

          {/* Activity Feed - Reusing existing component */}
          <ActivityFeed />

          {/* Upcoming Deadlines */}
          <div
            className="rounded-lg border p-4"
            style={{
              backgroundColor: colors.utility.secondaryBackground,
              borderColor: `${colors.utility.primaryText}20`
            }}
          >
            <h3
              className="text-base font-semibold mb-4"
              style={{ color: colors.utility.primaryText }}
            >
              Upcoming Deadlines
            </h3>
            <div className="space-y-3">
              {[
                { name: 'Acme Corp Renewal', date: 'Jan 15', days: 5 },
                { name: 'TechCo Signature', date: 'Jan 18', days: 8 },
                { name: 'DataInc Review', date: 'Jan 22', days: 12 }
              ].map((item, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 rounded-lg"
                  style={{ backgroundColor: `${colors.utility.primaryText}05` }}
                >
                  <div>
                    <p
                      className="font-medium text-sm"
                      style={{ color: colors.utility.primaryText }}
                    >
                      {item.name}
                    </p>
                    <p
                      className="text-xs"
                      style={{ color: colors.utility.secondaryText }}
                    >
                      Due: {item.date}
                    </p>
                  </div>
                  <span
                    className="text-xs px-2 py-1 rounded-full"
                    style={{
                      backgroundColor: item.days <= 7 ? `${colors.semantic.warning}20` : `${colors.utility.secondaryText}20`,
                      color: item.days <= 7 ? colors.semantic.warning : colors.utility.secondaryText
                    }}
                  >
                    {item.days} days
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Wrapped Operations Cockpit with Coming Soon
const OpsCockpitPageWithComingSoon: React.FC = () => {
  return (
    <ComingSoonWrapper
      pageKey="operations"
      title="Operations Cockpit"
      subtitle="Your command center for contract operations. Real-time monitoring, smart alerts, and performance insights - all in one powerful dashboard."
      heroIcon={Activity}
      features={operationsFeatures}
      floatingIcons={operationsFloatingIcons}
    >
      <OpsCockpitPage />
    </ComingSoonWrapper>
  );
};

export default OpsCockpitPageWithComingSoon;
