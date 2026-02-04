// src/pages/admin/jtd/QueueMonitorPage.tsx
// Admin JTD Queue Monitor — live queue depth, DLQ, status distribution
// R2: Added DLQ message list with requeue + purge actions

import React, { useState } from 'react';
import {
  ListOrdered,
  AlertTriangle,
  Activity,
  RefreshCw,
  Inbox,
  Trash2,
  Clock,
  Zap,
  CreditCard,
  Calendar,
  AlertCircle,
  RotateCcw,
} from 'lucide-react';
import { useTheme } from '../../../contexts/ThemeContext';
import { useAuth } from '../../../context/AuthContext';
import { useQueueMetrics, useDlqMessages, useJtdAction } from './hooks/useJtdAdmin';
import { JtdMetricCard } from './components/JtdMetricCard';
import { JtdStatusBadge } from './components/JtdStatusBadge';
import { VaNiLoader } from '@/components/common/loaders';
import { vaniToast } from '@/components/common/toast';
import { ConfirmationDialog } from '@/components/ui/ConfirmationDialog';
import type { DlqMessage } from './types/jtdAdmin.types';

function formatAge(seconds: number | null): string {
  if (seconds === null || seconds === undefined) return '—';
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  return `${Math.floor(seconds / 86400)}d`;
}

const QueueMonitorPage: React.FC = () => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;
  const { currentTenant } = useAuth();
  const { data, loading, error, refresh } = useQueueMetrics(15000);
  const [dlqPage, setDlqPage] = useState(1);
  const dlq = useDlqMessages({ page: dlqPage, limit: 20 });
  const action = useJtdAction();

  // Confirmation dialog state
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{
    type: 'requeue' | 'purge';
    msgId?: number;
    label: string;
  } | null>(null);

  if (!currentTenant?.is_admin) {
    return (
      <div className="p-8 text-center transition-colors" style={{ color: colors.utility.secondaryText }}>
        Admin access required.
      </div>
    );
  }

  if (loading && !data) {
    return (
      <VaNiLoader size="md" message="Loading queue metrics..." />
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

  const statusEntries = Object.entries(data.status_distribution).sort((a, b) => b[1] - a[1]);
  const eventTypeEntries = Object.entries(data.last_24h.by_event_type).sort((a, b) => b[1] - a[1]);
  const channelEntries = Object.entries(data.last_24h.by_channel).sort((a, b) => b[1] - a[1]);

  // DLQ action handlers
  const openRequeue = (msgId: number) => {
    setConfirmAction({ type: 'requeue', msgId, label: `Requeue DLQ message #${msgId}?` });
    setConfirmOpen(true);
  };

  const openPurge = () => {
    setConfirmAction({ type: 'purge', label: 'Purge ALL DLQ messages?' });
    setConfirmOpen(true);
  };

  const handleConfirm = async () => {
    if (!confirmAction) return;
    setConfirmOpen(false);

    let result;
    if (confirmAction.type === 'requeue' && confirmAction.msgId) {
      result = await action.requeueDlq(confirmAction.msgId);
    } else if (confirmAction.type === 'purge') {
      result = await action.purgeDlq();
    }

    if (result?.success) {
      vaniToast.success(result.message || 'Action completed');
      dlq.refresh();
      refresh();
    } else {
      vaniToast.error(result?.error || action.error || 'Action failed');
    }
    setConfirmAction(null);
  };

  return (
    <div
      className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto min-h-screen transition-colors"
      style={{ backgroundColor: colors.utility.primaryBackground }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold transition-colors" style={{ color: colors.utility.primaryText }}>Queue Monitor</h1>
          <p className="text-sm mt-1 transition-colors" style={{ color: colors.utility.secondaryText }}>
            Live view of the JTD processing pipeline
          </p>
        </div>
        <button
          onClick={() => { refresh(); dlq.refresh(); }}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium hover:opacity-80 transition-colors"
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
          iconColor={colors.semantic.info}
          alert={data.main_queue.length > 100}
        />
        <JtdMetricCard
          title="Dead Letter Queue"
          value={data.dlq.length}
          subtitle={data.dlq.oldest_age_sec ? `Oldest: ${formatAge(data.dlq.oldest_age_sec)}` : 'Empty'}
          icon={Trash2}
          iconColor={data.dlq.length > 0 ? colors.semantic.error : colors.utility.secondaryText}
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
          iconColor={data.actionable.failed_retryable > 0 ? colors.semantic.error : colors.semantic.success}
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
          iconColor={colors.semantic.warning}
          alert={data.actionable.no_credits_waiting > 0}
        />
      </div>

      {/* Status Distribution + Last 24h Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Status Distribution */}
        <div
          className="rounded-lg shadow-sm border p-5 transition-colors"
          style={{ backgroundColor: colors.utility.secondaryBackground, borderColor: colors.utility.primaryText + '20' }}
        >
          <h3 className="text-sm font-semibold mb-4 transition-colors" style={{ color: colors.utility.primaryText }}>
            Status Distribution (All Time)
          </h3>
          <div className="space-y-2">
            {statusEntries.map(([code, count]) => (
              <div key={code} className="flex items-center justify-between">
                <JtdStatusBadge code={code} />
                <span className="text-sm font-medium transition-colors" style={{ color: colors.utility.primaryText }}>
                  {count.toLocaleString()}
                </span>
              </div>
            ))}
            {statusEntries.length === 0 && (
              <p className="text-sm opacity-40 transition-colors" style={{ color: colors.utility.secondaryText }}>No data</p>
            )}
          </div>
        </div>

        {/* By Event Type (24h) */}
        <div
          className="rounded-lg shadow-sm border p-5 transition-colors"
          style={{ backgroundColor: colors.utility.secondaryBackground, borderColor: colors.utility.primaryText + '20' }}
        >
          <h3 className="text-sm font-semibold mb-4 transition-colors" style={{ color: colors.utility.primaryText }}>
            By Event Type (Last 24h)
          </h3>
          <div className="space-y-2">
            {eventTypeEntries.map(([code, count]) => (
              <div key={code} className="flex items-center justify-between">
                <JtdStatusBadge code={code} type="event_type" />
                <span className="text-sm font-medium transition-colors" style={{ color: colors.utility.primaryText }}>
                  {count.toLocaleString()}
                </span>
              </div>
            ))}
            {eventTypeEntries.length === 0 && (
              <p className="text-sm opacity-40 transition-colors" style={{ color: colors.utility.secondaryText }}>No data</p>
            )}
          </div>
        </div>

        {/* By Channel (24h) */}
        <div
          className="rounded-lg shadow-sm border p-5 transition-colors"
          style={{ backgroundColor: colors.utility.secondaryBackground, borderColor: colors.utility.primaryText + '20' }}
        >
          <h3 className="text-sm font-semibold mb-4 transition-colors" style={{ color: colors.utility.primaryText }}>
            By Channel (Last 24h)
          </h3>
          <div className="space-y-2">
            {channelEntries.map(([code, count]) => (
              <div key={code} className="flex items-center justify-between">
                <JtdStatusBadge code={code} type="channel" />
                <span className="text-sm font-medium transition-colors" style={{ color: colors.utility.primaryText }}>
                  {count.toLocaleString()}
                </span>
              </div>
            ))}
            {channelEntries.length === 0 && (
              <p className="text-sm opacity-40 transition-colors" style={{ color: colors.utility.secondaryText }}>No data</p>
            )}
          </div>
        </div>
      </div>

      {/* ================================================================
          R2 — DLQ Messages Section
          ================================================================ */}
      <div
        className="rounded-lg shadow-sm border p-5 transition-colors"
        style={{ backgroundColor: colors.utility.secondaryBackground, borderColor: colors.utility.primaryText + '20' }}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold transition-colors" style={{ color: colors.utility.primaryText }}>
            Dead Letter Queue Messages
          </h3>
          <div className="flex gap-2">
            <button
              onClick={dlq.refresh}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium hover:opacity-80 transition-colors"
              style={{ backgroundColor: colors.brand.primary + '20', color: colors.brand.primary }}
            >
              <RefreshCw size={12} /> Refresh
            </button>
            {dlq.messages.length > 0 && (
              <button
                onClick={openPurge}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium hover:opacity-80 transition-colors"
                style={{ backgroundColor: colors.semantic.error + '20', color: colors.semantic.error }}
              >
                <Trash2 size={12} /> Purge All
              </button>
            )}
          </div>
        </div>

        {dlq.loading && <VaNiLoader size="sm" message="Loading DLQ..." />}

        {dlq.error && (
          <div className="p-4 text-center">
            <p className="text-sm transition-colors" style={{ color: colors.semantic.error }}>{dlq.error}</p>
          </div>
        )}

        {!dlq.loading && dlq.messages.length === 0 && !dlq.error && (
          <p className="text-sm text-center py-6 transition-colors" style={{ color: colors.utility.secondaryText }}>
            DLQ is empty — no dead-letter messages.
          </p>
        )}

        {!dlq.loading && dlq.messages.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead>
                <tr>
                  {['ID', 'Tenant', 'Type', 'Channel', 'Error', 'Age', 'Reads', 'Actions'].map((h) => (
                    <th key={h} className="px-3 py-2 text-left text-xs font-semibold transition-colors" style={{ color: colors.utility.secondaryText }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {dlq.messages.map((msg) => (
                  <tr
                    key={msg.msg_id}
                    className="border-t transition-colors"
                    style={{ borderColor: colors.utility.primaryText + '10' }}
                  >
                    <td className="px-3 py-2 text-xs font-mono transition-colors" style={{ color: colors.utility.primaryText }}>
                      #{msg.msg_id}
                    </td>
                    <td className="px-3 py-2 text-sm transition-colors" style={{ color: colors.utility.primaryText }}>
                      {msg.tenant_name}
                    </td>
                    <td className="px-3 py-2">
                      {msg.event_type ? <JtdStatusBadge code={msg.event_type} type="event_type" /> : <span className="text-xs" style={{ color: colors.utility.secondaryText }}>—</span>}
                    </td>
                    <td className="px-3 py-2">
                      {msg.channel ? <JtdStatusBadge code={msg.channel} type="channel" /> : <span className="text-xs" style={{ color: colors.utility.secondaryText }}>—</span>}
                    </td>
                    <td className="px-3 py-2 text-xs max-w-[200px] truncate transition-colors" style={{ color: colors.semantic.error }} title={msg.error_message}>
                      {msg.error_message || '—'}
                    </td>
                    <td className="px-3 py-2 text-xs transition-colors" style={{ color: colors.utility.secondaryText }}>
                      {formatAge(msg.age_seconds)}
                    </td>
                    <td className="px-3 py-2 text-xs transition-colors" style={{ color: colors.utility.primaryText }}>
                      {msg.read_ct}
                    </td>
                    <td className="px-3 py-2">
                      <button
                        onClick={() => openRequeue(msg.msg_id)}
                        className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium hover:opacity-80 transition-colors"
                        style={{ backgroundColor: colors.semantic.info + '20', color: colors.semantic.info }}
                        title="Requeue to main queue"
                      >
                        <RotateCcw size={12} /> Requeue
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* DLQ Pagination */}
        {dlq.pagination && dlq.pagination.total_pages > 1 && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t transition-colors" style={{ borderColor: colors.utility.primaryText + '10' }}>
            <span className="text-xs transition-colors" style={{ color: colors.utility.secondaryText }}>
              Page {dlq.pagination.current_page} of {dlq.pagination.total_pages} ({dlq.pagination.total_records} messages)
            </span>
            <div className="flex gap-2">
              <button
                disabled={!dlq.pagination.has_prev}
                onClick={() => setDlqPage(p => p - 1)}
                className="px-2 py-1 rounded text-xs border disabled:opacity-30 hover:opacity-80 transition-colors"
                style={{ borderColor: colors.utility.primaryText + '20', color: colors.utility.primaryText }}
              >
                Prev
              </button>
              <button
                disabled={!dlq.pagination.has_next}
                onClick={() => setDlqPage(p => p + 1)}
                className="px-2 py-1 rounded text-xs border disabled:opacity-30 hover:opacity-80 transition-colors"
                style={{ borderColor: colors.utility.primaryText + '20', color: colors.utility.primaryText }}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="text-xs text-center transition-colors" style={{ color: colors.utility.secondaryText }}>
        Auto-refreshes every 15 seconds &middot; Last updated: {new Date(data.generated_at).toLocaleTimeString()}
      </div>

      {/* Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={confirmOpen}
        onClose={() => { setConfirmOpen(false); setConfirmAction(null); }}
        onConfirm={handleConfirm}
        title={confirmAction?.label || 'Confirm Action'}
        description={confirmAction?.type === 'purge'
          ? 'This will permanently delete ALL messages from the DLQ. This cannot be undone.'
          : 'This will move the message back to the main processing queue.'
        }
        type={confirmAction?.type === 'purge' ? 'danger' : 'warning'}
        isLoading={action.loading}
      />
    </div>
  );
};

export default QueueMonitorPage;
