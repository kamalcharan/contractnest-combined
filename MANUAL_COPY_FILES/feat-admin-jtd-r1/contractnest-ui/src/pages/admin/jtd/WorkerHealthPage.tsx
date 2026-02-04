// src/pages/admin/jtd/WorkerHealthPage.tsx
// Admin JTD Worker Health — derived status, throughput, errors, queue state

import React from 'react';
import {
  HeartPulse,
  RefreshCw,
  AlertTriangle,
  Activity,
  Zap,
  XCircle,
  Inbox,
  Trash2,
  Clock,
  CheckCircle,
  AlertCircle,
  Pause,
  HelpCircle,
} from 'lucide-react';
import { useTheme } from '../../../contexts/ThemeContext';
import { useAuth } from '../../../context/AuthContext';
import { useWorkerHealth } from './hooks/useJtdAdmin';
import { JtdMetricCard } from './components/JtdMetricCard';
import { VaNiLoader } from '@/components/common/loaders';
import type { WorkerStatus } from './types/jtdAdmin.types';

const STATUS_CONFIG: Record<WorkerStatus, { label: string; color: string; bgColor: string; icon: typeof HeartPulse }> = {
  healthy:  { label: 'Healthy',  color: '#10B981', bgColor: '#D1FAE5', icon: CheckCircle },
  idle:     { label: 'Idle',     color: '#6B7280', bgColor: '#F3F4F6', icon: Pause },
  degraded: { label: 'Degraded', color: '#F59E0B', bgColor: '#FEF3C7', icon: AlertCircle },
  stalled:  { label: 'Stalled',  color: '#EF4444', bgColor: '#FEE2E2', icon: AlertTriangle },
  unknown:  { label: 'Unknown',  color: '#6B7280', bgColor: '#F3F4F6', icon: HelpCircle },
};

function formatAge(seconds: number | null): string {
  if (seconds === null || seconds === undefined) return '—';
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  return `${Math.floor(seconds / 86400)}d`;
}

const WorkerHealthPage: React.FC = () => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;
  const { currentTenant } = useAuth();
  const { data, loading, error, refresh } = useWorkerHealth(15000);

  if (!currentTenant?.is_admin) {
    return (
      <div className="p-8 text-center transition-colors" style={{ color: colors.utility.secondaryText }}>
        Admin access required.
      </div>
    );
  }

  if (loading && !data) {
    return (
      <VaNiLoader size="md" message="Loading worker health..." />
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center">
        <AlertCircle size={32} className="mx-auto mb-3" style={{ color: colors.semantic.error }} />
        <p className="transition-colors" style={{ color: colors.semantic.error }}>{error}</p>
        <button onClick={refresh} className="mt-3 text-sm underline hover:no-underline transition-colors" style={{ color: colors.brand.primary }}>Retry</button>
      </div>
    );
  }

  if (!data) return null;

  const cfg = STATUS_CONFIG[data.status] || STATUS_CONFIG.unknown;
  const StatusIcon = cfg.icon;

  return (
    <div
      className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto min-h-screen transition-colors"
      style={{ backgroundColor: colors.utility.primaryBackground }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold transition-colors" style={{ color: colors.utility.primaryText }}>Worker Health</h1>
          <p className="text-sm mt-1 transition-colors" style={{ color: colors.utility.secondaryText }}>
            JTD processing worker status and performance
          </p>
        </div>
        <button
          onClick={refresh}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium hover:opacity-80 transition-colors"
          style={{ backgroundColor: colors.brand.primary, color: '#fff' }}
        >
          <RefreshCw size={16} /> Refresh
        </button>
      </div>

      {/* Status Banner */}
      <div
        className="rounded-lg shadow-sm border p-6 flex items-center gap-4 transition-colors"
        style={{
          backgroundColor: cfg.bgColor,
          borderColor: cfg.color + '40',
        }}
      >
        <div
          className="w-14 h-14 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: cfg.color + '20' }}
        >
          <StatusIcon size={28} style={{ color: cfg.color }} />
        </div>
        <div>
          <div className="text-lg font-bold" style={{ color: cfg.color }}>{cfg.label}</div>
          <div className="text-sm" style={{ color: cfg.color + 'CC' }}>
            {data.status === 'healthy' && 'Worker is processing normally.'}
            {data.status === 'idle' && 'No items in queue, worker is idle.'}
            {data.status === 'degraded' && `${data.stuck_count} stuck items or high error rate detected.`}
            {data.status === 'stalled' && 'Worker has not processed messages recently despite queue items.'}
            {data.status === 'unknown' && 'No processing data available yet.'}
          </div>
        </div>
        <div className="ml-auto text-right">
          <div className="text-xs" style={{ color: cfg.color + '99' }}>Last executed</div>
          <div className="text-sm font-medium" style={{ color: cfg.color }}>
            {data.last_executed_at ? new Date(data.last_executed_at).toLocaleString() : 'Never'}
          </div>
        </div>
      </div>

      {/* Throughput & Errors */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <JtdMetricCard
          title="Processed (1h)"
          value={data.throughput.last_1h}
          icon={Zap}
          iconColor={colors.semantic.success}
        />
        <JtdMetricCard
          title="Processed (24h)"
          value={data.throughput.last_24h}
          icon={Activity}
          iconColor={colors.semantic.info}
        />
        <JtdMetricCard
          title="Errors (1h)"
          value={data.errors.last_1h}
          icon={XCircle}
          iconColor={data.errors.last_1h > 0 ? colors.semantic.error : colors.utility.secondaryText}
          alert={data.errors.last_1h > 5}
        />
        <JtdMetricCard
          title="Error Rate (1h)"
          value={`${data.errors.error_rate_1h}%`}
          icon={AlertTriangle}
          iconColor={data.errors.error_rate_1h > 10 ? colors.semantic.error : data.errors.error_rate_1h > 0 ? colors.semantic.warning : colors.semantic.success}
          alert={data.errors.error_rate_1h > 20}
        />
      </div>

      {/* Processing Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Performance */}
        <div
          className="rounded-lg shadow-sm border p-5 transition-colors"
          style={{ backgroundColor: colors.utility.secondaryBackground, borderColor: colors.utility.primaryText + '20' }}
        >
          <h3 className="text-sm font-semibold mb-4 transition-colors" style={{ color: colors.utility.primaryText }}>
            Performance
          </h3>
          <div className="space-y-3">
            {[
              { label: 'Currently Processing', value: String(data.currently_processing) },
              { label: 'Stuck (> 5min)', value: String(data.stuck_count), alert: data.stuck_count > 0 },
              { label: 'Avg Duration', value: `${data.throughput.avg_duration_sec}s` },
              { label: 'Errors (24h)', value: String(data.errors.last_24h), alert: data.errors.last_24h > 10 },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between">
                <span className="text-sm transition-colors" style={{ color: colors.utility.secondaryText }}>{item.label}</span>
                <span
                  className="text-sm font-medium transition-colors"
                  style={{ color: item.alert ? colors.semantic.error : colors.utility.primaryText }}
                >
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Queue State */}
        <div
          className="rounded-lg shadow-sm border p-5 transition-colors"
          style={{ backgroundColor: colors.utility.secondaryBackground, borderColor: colors.utility.primaryText + '20' }}
        >
          <h3 className="text-sm font-semibold mb-4 transition-colors" style={{ color: colors.utility.primaryText }}>
            Queue State
          </h3>
          <div className="space-y-3">
            {[
              { label: 'Queue Length', value: String(data.queue.length), icon: Inbox },
              { label: 'Oldest Message', value: formatAge(data.queue.oldest_age_sec), icon: Clock },
              { label: 'DLQ Length', value: String(data.queue.dlq_length), icon: Trash2, alert: data.queue.dlq_length > 0 },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.label} className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-sm transition-colors" style={{ color: colors.utility.secondaryText }}>
                    <Icon size={14} /> {item.label}
                  </span>
                  <span
                    className="text-sm font-medium transition-colors"
                    style={{ color: item.alert ? colors.semantic.error : colors.utility.primaryText }}
                  >
                    {item.value}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="text-xs text-center transition-colors" style={{ color: colors.utility.secondaryText }}>
        Auto-refreshes every 15 seconds &middot; Last updated: {new Date(data.generated_at).toLocaleTimeString()}
      </div>
    </div>
  );
};

export default WorkerHealthPage;
