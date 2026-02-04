// src/pages/admin/jtd/QueueMonitorPage.tsx
// Admin JTD Queue Monitor — live queue depth, DLQ, status distribution

import React from 'react';
import {
  ListOrdered,
  AlertTriangle,
  Activity,
  RefreshCw,
  Loader2,
  Inbox,
  Trash2,
  Clock,
  Zap,
  CreditCard,
  Calendar,
} from 'lucide-react';
import { useTheme } from '../../../contexts/ThemeContext';
import { useAuth } from '../../../context/AuthContext';
import { useQueueMetrics } from './hooks/useJtdAdmin';
import { JtdMetricCard } from './components/JtdMetricCard';
import { JtdStatusBadge } from './components/JtdStatusBadge';

function formatAge(seconds: number | null): string {
  if (seconds === null || seconds === undefined) return '—';
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  return `${Math.floor(seconds / 86400)}d`;
}

const QueueMonitorPage: React.FC = () => {
  const { colors } = useTheme();
  const { currentTenant } = useAuth();
  const { data, loading, error, refresh } = useQueueMetrics(15000);

  if (!currentTenant?.is_admin) {
    return (
      <div className="p-8 text-center" style={{ color: colors.utility.secondaryText }}>
        Admin access required.
      </div>
    );
  }

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin" size={32} style={{ color: colors.brand.primary }} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center">
        <AlertTriangle size={32} className="mx-auto mb-3" style={{ color: '#EF4444' }} />
        <p style={{ color: colors.utility.primaryText }}>{error}</p>
        <button onClick={refresh} className="mt-3 text-sm underline" style={{ color: colors.brand.primary }}>Retry</button>
      </div>
    );
  }

  if (!data) return null;

  const statusEntries = Object.entries(data.status_distribution).sort((a, b) => b[1] - a[1]);
  const eventTypeEntries = Object.entries(data.last_24h.by_event_type).sort((a, b) => b[1] - a[1]);
  const channelEntries = Object.entries(data.last_24h.by_channel).sort((a, b) => b[1] - a[1]);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: colors.utility.primaryText }}>Queue Monitor</h1>
          <p className="text-sm mt-1" style={{ color: colors.utility.secondaryText }}>
            Live view of the JTD processing pipeline
          </p>
        </div>
        <button
          onClick={refresh}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium hover:opacity-80 transition-opacity"
          style={{ backgroundColor: colors.brand.primary, color: '#fff' }}
        >
          <RefreshCw size={16} /> Refresh
        </button>
      </div>

      {/* Top Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <JtdMetricCard
          title="Queue Depth"
          value={data.main_queue.length}
          subtitle={data.main_queue.oldest_age_sec ? `Oldest: ${formatAge(data.main_queue.oldest_age_sec)}` : 'Empty'}
          icon={Inbox}
          iconColor="#3B82F6"
          alert={data.main_queue.length > 100}
        />
        <JtdMetricCard
          title="Dead Letter Queue"
          value={data.dlq.length}
          subtitle={data.dlq.oldest_age_sec ? `Oldest: ${formatAge(data.dlq.oldest_age_sec)}` : 'Empty'}
          icon={Trash2}
          iconColor={data.dlq.length > 0 ? '#EF4444' : '#6B7280'}
          alert={data.dlq.length > 0}
        />
        <JtdMetricCard
          title="Currently Processing"
          value={data.actionable.currently_processing}
          subtitle="Active right now"
          icon={Zap}
          iconColor="#F97316"
        />
        <JtdMetricCard
          title="Failed (Retryable)"
          value={data.actionable.failed_retryable}
          subtitle="Can be retried"
          icon={AlertTriangle}
          iconColor={data.actionable.failed_retryable > 0 ? '#EF4444' : '#10B981'}
          alert={data.actionable.failed_retryable > 10}
        />
      </div>

      {/* Actionable Items */}
      <div className="grid grid-cols-2 lg:grid-cols-2 gap-4">
        <JtdMetricCard
          title="Scheduled (Due Now)"
          value={data.actionable.scheduled_due}
          subtitle="Waiting to be enqueued"
          icon={Calendar}
          iconColor="#8B5CF6"
          alert={data.actionable.scheduled_due > 50}
        />
        <JtdMetricCard
          title="No Credits (Waiting)"
          value={data.actionable.no_credits_waiting}
          subtitle="Blocked on credit top-up"
          icon={CreditCard}
          iconColor="#D97706"
          alert={data.actionable.no_credits_waiting > 0}
        />
      </div>

      {/* Status Distribution + Last 24h Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Status Distribution */}
        <div
          className="rounded-xl p-5"
          style={{ backgroundColor: colors.utility.primaryBackground, border: `1px solid ${colors.utility.divider}` }}
        >
          <h3 className="text-sm font-semibold mb-4" style={{ color: colors.utility.primaryText }}>
            Status Distribution (All Time)
          </h3>
          <div className="space-y-2">
            {statusEntries.map(([code, count]) => (
              <div key={code} className="flex items-center justify-between">
                <JtdStatusBadge code={code} />
                <span className="text-sm font-medium" style={{ color: colors.utility.primaryText }}>
                  {count.toLocaleString()}
                </span>
              </div>
            ))}
            {statusEntries.length === 0 && (
              <p className="text-sm opacity-40" style={{ color: colors.utility.secondaryText }}>No data</p>
            )}
          </div>
        </div>

        {/* By Event Type (24h) */}
        <div
          className="rounded-xl p-5"
          style={{ backgroundColor: colors.utility.primaryBackground, border: `1px solid ${colors.utility.divider}` }}
        >
          <h3 className="text-sm font-semibold mb-4" style={{ color: colors.utility.primaryText }}>
            By Event Type (Last 24h)
          </h3>
          <div className="space-y-2">
            {eventTypeEntries.map(([code, count]) => (
              <div key={code} className="flex items-center justify-between">
                <JtdStatusBadge code={code} type="event_type" />
                <span className="text-sm font-medium" style={{ color: colors.utility.primaryText }}>
                  {count.toLocaleString()}
                </span>
              </div>
            ))}
            {eventTypeEntries.length === 0 && (
              <p className="text-sm opacity-40" style={{ color: colors.utility.secondaryText }}>No data</p>
            )}
          </div>
        </div>

        {/* By Channel (24h) */}
        <div
          className="rounded-xl p-5"
          style={{ backgroundColor: colors.utility.primaryBackground, border: `1px solid ${colors.utility.divider}` }}
        >
          <h3 className="text-sm font-semibold mb-4" style={{ color: colors.utility.primaryText }}>
            By Channel (Last 24h)
          </h3>
          <div className="space-y-2">
            {channelEntries.map(([code, count]) => (
              <div key={code} className="flex items-center justify-between">
                <JtdStatusBadge code={code} type="channel" />
                <span className="text-sm font-medium" style={{ color: colors.utility.primaryText }}>
                  {count.toLocaleString()}
                </span>
              </div>
            ))}
            {channelEntries.length === 0 && (
              <p className="text-sm opacity-40" style={{ color: colors.utility.secondaryText }}>No data</p>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="text-xs text-center" style={{ color: colors.utility.tertiaryText }}>
        Auto-refreshes every 15 seconds &middot; Last updated: {new Date(data.generated_at).toLocaleTimeString()}
      </div>
    </div>
  );
};

export default QueueMonitorPage;
