// src/vani/pages/VaNiDashboard.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { 
  VaNiMetricCard, 
  VaNiList, 
  VaNiListItem, 
  VaNiListHeader,
  VaNiStatusBadge 
} from '../components/shared';
import { 
  realisticBusinessEvents,
  realisticEventJobs,
  realisticContracts,
  businessIntelligence,
  type BusinessEvent,
  type EventDrivenJob
} from '../utils/fakeData';
import type { MetricData } from '../components/shared/VaniMetricCard';
import { 
  Activity, 
  Send, 
  CheckCircle, 
  AlertCircle,
  Plus,
  TrendingUp,
  Clock,
  DollarSign,
  Users,
  MessageSquare,
  Mail,
  Smartphone,
  Bell,
  Monitor,
  RefreshCw,
  BarChart3,
  Settings,
  Calendar,
  FileText,
  Zap,
  Building,
  Database,
  Workflow,
  ArrowRight,
  ExternalLink,
  Timer
} from 'lucide-react';
import toast from 'react-hot-toast';

const VaNiDashboard: React.FC = () => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;
  const navigate = useNavigate();
  
  // State for dashboard data
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTimeframe, setSelectedTimeframe] = useState<'today' | 'week' | 'month'>('month');

  // Calculate comprehensive business metrics
  const businessMetrics = useMemo(() => {
    const totalEvents = realisticBusinessEvents.length;
    const completedEvents = realisticBusinessEvents.filter(e => e.status === 'completed').length;
    const inProgressEvents = realisticBusinessEvents.filter(e => e.status === 'in_progress').length;
    const plannedEvents = realisticBusinessEvents.filter(e => e.status === 'planned').length;
    const failedEvents = realisticBusinessEvents.filter(e => e.status === 'failed').length;

    // Jobs and automation metrics
    const totalJobs = realisticEventJobs.length;
    const completedJobs = realisticEventJobs.filter(j => j.status === 'completed').length;
    const successRate = totalJobs > 0 ? (completedJobs / totalJobs) * 100 : 0;
    
    // Financial metrics
    const accountsReceivable = businessIntelligence.getAccountsReceivable();
    const overduePayments = accountsReceivable.filter(ar => ar.daysOverdue > 0);
    const totalOutstanding = accountsReceivable.reduce((sum, ar) => sum + ar.amount, 0);
    const overdueAmount = overduePayments.reduce((sum, ar) => sum + ar.amount, 0);

    // Service metrics
    const serviceEvents = realisticBusinessEvents.filter(e => e.eventType === 'service_due');
    const completedServices = serviceEvents.filter(e => e.status === 'completed').length;
    const upcomingServices = serviceEvents.filter(e => e.status === 'planned').length;

    // Contract metrics
    const activeContracts = realisticContracts.filter(c => c.status === 'active').length;
    const expiringContracts = realisticContracts.filter(c => c.status === 'expiring').length;
    
    // Module health
    const moduleHealth = ['contracts', 'invoicing', 'services'].reduce((acc, module) => {
      const moduleEvents = realisticBusinessEvents.filter(e => e.sourceModule === module);
      const successfulEvents = moduleEvents.filter(e => e.status === 'completed');
      const healthScore = moduleEvents.length > 0 ? (successfulEvents.length / moduleEvents.length) * 100 : 100;
      
      acc[module] = healthScore >= 95 ? 'healthy' : healthScore >= 85 ? 'warning' : 'critical';
      return acc;
    }, {} as Record<string, 'healthy' | 'warning' | 'critical'>);

    return {
      events: {
        total: totalEvents,
        completed: completedEvents,
        inProgress: inProgressEvents,
        planned: plannedEvents,
        failed: failedEvents,
        successRate: totalEvents > 0 ? (completedEvents / totalEvents) * 100 : 0
      },
      automation: {
        totalJobs,
        completedJobs,
        successRate,
        pendingJobs: realisticEventJobs.filter(j => j.status === 'pending').length
      },
      financial: {
        totalOutstanding,
        overdueAmount,
        overdueCount: overduePayments.length,
        collectionRate: accountsReceivable.length > 0 ? ((accountsReceivable.length - overduePayments.length) / accountsReceivable.length) * 100 : 100
      },
      operations: {
        completedServices,
        upcomingServices,
        activeContracts,
        expiringContracts,
        serviceCompletionRate: serviceEvents.length > 0 ? (completedServices / serviceEvents.length) * 100 : 0
      },
      moduleHealth
    };
  }, [selectedTimeframe]);

  // Recent business events (last 10)
  const recentEvents = useMemo(() => {
    return realisticBusinessEvents
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 8);
  }, []);

  // Critical events requiring attention
  const criticalEvents = useMemo(() => {
    return realisticBusinessEvents.filter(event => 
      event.priority >= 8 || 
      event.status === 'failed' || 
      (event.eventType === 'payment_due' && event.status === 'reminded')
    );
  }, []);

  // Load dashboard data
  const loadDashboardData = async () => {
    try {
      setLoading(true);
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 800));
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Refresh data
  const handleRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
    toast.success('Business data refreshed', {
      style: { background: colors.semantic.success, color: '#FFF' }
    });
  };

  useEffect(() => {
    loadDashboardData();
  }, [selectedTimeframe]);

  // Metric cards data - focused on business operations
  const metrics: MetricData[] = [
    {
      value: businessMetrics.events.total.toString(),
      label: 'Business Events',
      subtitle: 'Across all modules',
      icon: <Activity className="w-5 h-5" />,
      trend: {
        direction: 'up',
        percentage: 15.2,
        period: 'vs last month'
      },
      businessContext: {
        entityType: 'events',
        relatedCount: businessMetrics.events.inProgress,
        actionable: businessMetrics.events.failed > 0,
        urgency: businessMetrics.events.failed > 0 ? 'high' : 'medium'
      },
      status: businessMetrics.events.failed > 0 ? 'warning' : 'success',
      secondaryMetric: {
        value: `${businessMetrics.events.successRate.toFixed(1)}%`,
        label: 'Success Rate'
      }
    },
    {
      value: businessMetrics.automation.successRate.toFixed(1) + '%',
      label: 'Automation Success',
      subtitle: 'Event-driven jobs',
      icon: <Zap className="w-5 h-5" />,
      trend: {
        direction: 'up',
        percentage: 3.1,
        period: 'vs last month'
      },
      businessContext: {
        entityType: 'contracts',
        relatedCount: businessMetrics.automation.totalJobs,
        actionable: businessMetrics.automation.successRate < 95,
        urgency: businessMetrics.automation.successRate < 85 ? 'high' : 'low'
      },
      status: businessMetrics.automation.successRate >= 95 ? 'success' : 'warning',
      cost: `${businessMetrics.automation.completedJobs}/${businessMetrics.automation.totalJobs} jobs completed`
    },
    {
      value: businessMetrics.financial.overdueCount.toString(),
      label: 'Overdue Payments',
      subtitle: 'Requiring collection',
      icon: <AlertCircle className="w-5 h-5" />,
      trend: {
        direction: 'down',
        percentage: 8.5,
        period: 'vs last month'
      },
      businessContext: {
        entityType: 'payments',
        relatedCount: businessMetrics.financial.overdueCount,
        actionable: businessMetrics.financial.overdueCount > 0,
        urgency: businessMetrics.financial.overdueCount > 2 ? 'critical' : 'medium'
      },
      status: businessMetrics.financial.overdueCount === 0 ? 'success' : 
              businessMetrics.financial.overdueCount > 2 ? 'critical' : 'warning',
      cost: `₹${(businessMetrics.financial.overdueAmount / 1000).toFixed(0)}K outstanding`
    },
    {
      value: businessMetrics.operations.activeContracts.toString(),
      label: 'Active Contracts',
      subtitle: 'Revenue generating',
      icon: <FileText className="w-5 h-5" />,
      businessContext: {
        entityType: 'contracts',
        relatedCount: businessMetrics.operations.expiringContracts,
        actionable: businessMetrics.operations.expiringContracts > 0,
        urgency: businessMetrics.operations.expiringContracts > 0 ? 'medium' : 'low'
      },
      status: businessMetrics.operations.expiringContracts === 0 ? 'success' : 'warning',
      secondaryMetric: {
        value: `${businessMetrics.operations.serviceCompletionRate.toFixed(1)}%`,
        label: 'Service Rate'
      }
    }
  ];

  // Quick action handlers
  const handleCreateEventRule = () => navigate('/vani/rules/create');
  const handleViewEvents = () => navigate('/vani/events');
  const handleViewAnalytics = () => navigate('/vani/analytics');
  const handleManageWebhooks = () => navigate('/vani/webhooks');
  const handleViewReceivables = () => navigate('/vani/finance/receivables');
  const handleViewServices = () => navigate('/vani/operations/services');

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Get event type icon
  const getEventTypeIcon = (eventType: string) => {
    switch (eventType) {
      case 'service_due': return <Calendar className="w-4 h-4" />;
      case 'payment_due': return <DollarSign className="w-4 h-4" />;
      case 'contract_renewal': return <FileText className="w-4 h-4" />;
      case 'emergency_service': return <AlertCircle className="w-4 h-4" />;
      default: return <Activity className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 
            className="text-3xl font-bold transition-colors"
            style={{ color: colors.utility.primaryText }}
          >
            VaNi Dashboard
          </h1>
          <p 
            className="text-sm mt-1 transition-colors"
            style={{ color: colors.utility.secondaryText }}
          >
            Central nervous system for business operations - Event-driven automation hub
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          {/* Timeframe Selector */}
          <div className="flex items-center space-x-1 p-1 border rounded-lg" style={{ borderColor: `${colors.utility.primaryText}20` }}>
            {(['today', 'week', 'month'] as const).map((timeframe) => (
              <button
                key={timeframe}
                onClick={() => setSelectedTimeframe(timeframe)}
                className={`px-3 py-1 text-sm rounded transition-colors ${
                  selectedTimeframe === timeframe ? '' : ''
                }`}
                style={{
                  backgroundColor: selectedTimeframe === timeframe 
                    ? colors.brand.primary 
                    : 'transparent',
                  color: selectedTimeframe === timeframe 
                    ? '#FFF' 
                    : colors.utility.primaryText
                }}
              >
                {timeframe.charAt(0).toUpperCase() + timeframe.slice(1)}
              </button>
            ))}
          </div>

          <button
            onClick={handleRefresh}
            disabled={refreshing || loading}
            className="flex items-center space-x-2 px-4 py-2 border rounded-lg transition-colors hover:opacity-80 disabled:opacity-50"
            style={{
              borderColor: `${colors.utility.primaryText}20`,
              backgroundColor: colors.utility.secondaryBackground,
              color: colors.utility.primaryText
            }}
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          
          <button
            onClick={handleCreateEventRule}
            className="flex items-center space-x-2 px-4 py-2 text-white rounded-lg transition-all hover:opacity-90"
            style={{
              background: `linear-gradient(to right, ${colors.brand.primary}, ${colors.brand.secondary})`
            }}
          >
            <Workflow className="w-4 h-4" />
            <span>Create Rule</span>
          </button>
        </div>
      </div>

      {/* Business Intelligence Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metrics.map((metric, index) => (
          <VaNiMetricCard
            key={index}
            metric={metric}
            variant="business"
            loading={loading}
            onClick={
              index === 0 ? handleViewEvents :
              index === 2 ? handleViewReceivables :
              index === 3 ? () => navigate('/contracts') :
              undefined
            }
          />
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* Recent Business Events */}
        <div className="xl:col-span-2">
          <Card
            className="h-full transition-colors"
            style={{
              backgroundColor: colors.utility.secondaryBackground,
              borderColor: `${colors.utility.primaryText}20`
            }}
          >
            <VaNiListHeader
              title="Recent Business Events"
              description="Real-time events from all business modules"
              showMetrics={true}
              metrics={{
                total: businessMetrics.events.total,
                pending: businessMetrics.events.planned,
                completed: businessMetrics.events.completed,
                failed: businessMetrics.events.failed
              }}
              moduleHealth={businessMetrics.moduleHealth}
              actions={
                <button
                  onClick={handleViewEvents}
                  className="flex items-center space-x-1 px-3 py-1.5 text-sm border rounded-md transition-colors hover:opacity-80"
                  style={{
                    borderColor: `${colors.utility.primaryText}20`,
                    backgroundColor: colors.utility.primaryBackground,
                    color: colors.utility.primaryText
                  }}
                >
                  <span>View All</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              }
            />
            
            <CardContent className="p-0">
              {loading ? (
                <div className="space-y-3 p-4">
                  {[...Array(6)].map((_, i) => (
                    <div
                      key={i}
                      className="animate-pulse rounded-lg p-4"
                      style={{ backgroundColor: `${colors.utility.primaryText}10` }}
                    >
                      <div className="h-4 w-3/4 rounded mb-2" style={{ backgroundColor: `${colors.utility.primaryText}20` }} />
                      <div className="h-3 w-1/2 rounded" style={{ backgroundColor: `${colors.utility.primaryText}15` }} />
                    </div>
                  ))}
                </div>
              ) : (
                <VaNiList variant="business" spacing="compact" className="p-4">
                  {recentEvents.map((event) => {
                    const relatedJobs = businessIntelligence.getJobsByBusinessEvent(event.id);
                    
                    return (
                      <VaNiListItem
                        key={event.id}
                        variant="business"
                        onClick={() => navigate(`/vani/events/${event.id}`)}
                        businessContext={{
                          priority: event.priority,
                          urgency: event.priority >= 8 ? 'critical' : event.priority >= 6 ? 'high' : 'medium',
                          entityType: event.entityType,
                          moduleSource: event.sourceModule,
                          hasActions: true
                        }}
                        onSecondaryAction={() => navigate(`/contracts/${event.metadata.contractId}`)}
                        secondaryActionLabel="View Contract"
                        style={{
                          backgroundColor: colors.utility.primaryBackground,
                          borderColor: `${colors.utility.primaryText}15`
                        }}
                      >
                        <div className="flex items-center space-x-3 flex-1">
                          {/* Event Type Icon */}
                          <div 
                            className="p-2 rounded-lg"
                            style={{ backgroundColor: `${colors.brand.primary}20` }}
                          >
                            <div style={{ color: colors.brand.primary }}>
                              {getEventTypeIcon(event.eventType)}
                            </div>
                          </div>

                          {/* Event Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-3 mb-1">
                              <h3 
                                className="font-medium truncate text-sm"
                                style={{ color: colors.utility.primaryText }}
                              >
                                {event.entityName}
                              </h3>
                              <VaNiStatusBadge status={event.status as any} variant="event" size="sm" />
                            </div>
                            
                            <div className="flex items-center space-x-3 text-xs" style={{ color: colors.utility.secondaryText }}>
                              <span>{event.contactName}</span>
                              <span>•</span>
                              <span>{formatDate(event.eventDate)}</span>
                              {event.metadata.contractId && (
                                <>
                                  <span>•</span>
                                  <span>Contract #{event.metadata.contractId}</span>
                                </>
                              )}
                            </div>

                            {/* Business Context */}
                            <div className="mt-1 flex items-center space-x-2">
                              {event.metadata.amount && (
                                <span 
                                  className="text-xs font-medium"
                                  style={{ color: colors.semantic.success }}
                                >
                                  ₹{event.metadata.amount.toLocaleString()}
                                </span>
                              )}
                              {relatedJobs.length > 0 && (
                                <span 
                                  className="text-xs px-1.5 py-0.5 rounded"
                                  style={{ 
                                    backgroundColor: `${colors.brand.secondary}20`,
                                    color: colors.brand.secondary 
                                  }}
                                >
                                  {relatedJobs.length} jobs
                                </span>
                              )}
                              {event.metadata.serviceNumber && (
                                <span 
                                  className="text-xs"
                                  style={{ color: colors.utility.secondaryText }}
                                >
                                  Service {event.metadata.serviceNumber}/{event.metadata.totalServices}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </VaNiListItem>
                    );
                  })}
                </VaNiList>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar - Quick Actions & Critical Items */}
        <div className="space-y-6">
          
          {/* Critical Events Alert */}
          {criticalEvents.length > 0 && (
            <Card
              className="border-2 transition-colors"
              style={{
                backgroundColor: `${colors.semantic.error}05`,
                borderColor: `${colors.semantic.error}40`
              }}
            >
              <CardHeader className="pb-3">
                <CardTitle 
                  className="flex items-center space-x-2 text-lg"
                  style={{ color: colors.semantic.error }}
                >
                  <AlertCircle className="w-5 h-5" />
                  <span>Critical Events ({criticalEvents.length})</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {criticalEvents.slice(0, 3).map((event) => (
                    <div
                      key={event.id}
                      className="p-3 rounded-lg border cursor-pointer transition-colors hover:opacity-80"
                      style={{
                        backgroundColor: colors.utility.primaryBackground,
                        borderColor: `${colors.semantic.error}30`
                      }}
                      onClick={() => navigate(`/vani/events/${event.id}`)}
                    >
                      <div className="flex items-center space-x-2">
                        <div style={{ color: colors.semantic.error }}>
                          {getEventTypeIcon(event.eventType)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p 
                            className="text-sm font-medium truncate"
                            style={{ color: colors.utility.primaryText }}
                          >
                            {event.contactName}
                          </p>
                          <p 
                            className="text-xs truncate"
                            style={{ color: colors.utility.secondaryText }}
                          >
                            {event.eventType.replace('_', ' ')} • Priority {event.priority}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                  {criticalEvents.length > 3 && (
                    <button
                      onClick={() => navigate('/vani/events?filter=critical')}
                      className="w-full text-center py-2 text-sm transition-colors hover:opacity-80"
                      style={{ color: colors.semantic.error }}
                    >
                      View {criticalEvents.length - 3} more critical events →
                    </button>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Quick Actions */}
          <Card
            className="transition-colors"
            style={{
              backgroundColor: colors.utility.secondaryBackground,
              borderColor: `${colors.utility.primaryText}20`
            }}
          >
            <CardHeader>
              <CardTitle style={{ color: colors.utility.primaryText }}>
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <button
                onClick={handleViewEvents}
                className="w-full flex items-center space-x-3 p-3 border rounded-lg transition-all hover:shadow-sm hover:scale-[1.01]"
                style={{
                  borderColor: `${colors.brand.primary}40`,
                  backgroundColor: `${colors.brand.primary}10`,
                  color: colors.utility.primaryText
                }}
              >
                <Activity className="w-4 h-4" style={{ color: colors.brand.primary }} />
                <span>View All Events</span>
                <ArrowRight className="w-4 h-4 ml-auto" />
              </button>
              
              <button
                onClick={handleViewReceivables}
                className="w-full flex items-center space-x-3 p-3 border rounded-lg transition-colors hover:opacity-80"
                style={{
                  borderColor: `${colors.utility.primaryText}20`,
                  backgroundColor: colors.utility.primaryBackground,
                  color: colors.utility.primaryText
                }}
              >
                <DollarSign className="w-4 h-4" />
                <span>Accounts Receivable</span>
                <ArrowRight className="w-4 h-4 ml-auto" />
              </button>
              
              <button
                onClick={handleViewServices}
                className="w-full flex items-center space-x-3 p-3 border rounded-lg transition-colors hover:opacity-80"
                style={{
                  borderColor: `${colors.utility.primaryText}20`,
                  backgroundColor: colors.utility.primaryBackground,
                  color: colors.utility.primaryText
                }}
              >
                <Calendar className="w-4 h-4" />
                <span>Service Schedule</span>
                <ArrowRight className="w-4 h-4 ml-auto" />
              </button>

              <button
                onClick={handleManageWebhooks}
                className="w-full flex items-center space-x-3 p-3 border rounded-lg transition-colors hover:opacity-80"
                style={{
                  borderColor: `${colors.utility.primaryText}20`,
                  backgroundColor: colors.utility.primaryBackground,
                  color: colors.utility.primaryText
                }}
              >
                <Zap className="w-4 h-4" />
                <span>Webhook Management</span>
                <ArrowRight className="w-4 h-4 ml-auto" />
              </button>
            </CardContent>
          </Card>

          {/* Business Performance Summary */}
          <Card
            className="transition-colors"
            style={{
              backgroundColor: colors.utility.secondaryBackground,
              borderColor: `${colors.utility.primaryText}20`
            }}
          >
            <CardHeader>
              <CardTitle 
                className="flex items-center space-x-2"
                style={{ color: colors.utility.primaryText }}
              >
                <BarChart3 className="w-5 h-5" />
                <span>Performance Summary</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span style={{ color: colors.utility.secondaryText }}>
                    Event Success Rate
                  </span>
                  <span 
                    className="font-medium"
                    style={{ 
                      color: businessMetrics.events.successRate >= 95 
                        ? colors.semantic.success 
                        : colors.semantic.warning 
                    }}
                  >
                    {businessMetrics.events.successRate.toFixed(1)}%
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span style={{ color: colors.utility.secondaryText }}>
                    Automation Success
                  </span>
                  <span 
                    className="font-medium"
                    style={{ 
                      color: businessMetrics.automation.successRate >= 95 
                        ? colors.semantic.success 
                        : colors.semantic.warning 
                    }}
                  >
                    {businessMetrics.automation.successRate.toFixed(1)}%
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span style={{ color: colors.utility.secondaryText }}>
                    Collection Rate
                  </span>
                  <span 
                    className="font-medium"
                    style={{ 
                      color: businessMetrics.financial.collectionRate >= 90 
                        ? colors.semantic.success 
                        : colors.semantic.warning 
                    }}
                  >
                    {businessMetrics.financial.collectionRate.toFixed(1)}%
                  </span>
                </div>
                
                <div 
                  className="pt-3 border-t"
                  style={{ borderColor: `${colors.utility.primaryText}20` }}
                >
                  <button
                    onClick={handleViewAnalytics}
                    className="w-full flex items-center justify-center space-x-2 py-2 text-sm transition-colors hover:opacity-80"
                    style={{ color: colors.brand.primary }}
                  >
                    <BarChart3 className="w-4 h-4" />
                    <span>View Detailed Analytics</span>
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default VaNiDashboard;