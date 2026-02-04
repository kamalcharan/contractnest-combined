// src/pages/admin/jtd/EventExplorerPage.tsx
// Admin JTD Event Explorer — searchable, filterable list of all JTD records
// R2: Added inline action buttons (Retry, Cancel, Force Complete) + ConfirmationDialog + Toast

import React, { useState } from 'react';
import {
  Search,
  RefreshCw,
  AlertTriangle,
  ChevronLeft,
  Clock,
  X,
  AlertCircle,
  RotateCcw,
  XCircle,
  CheckCircle,
} from 'lucide-react';
import { useTheme } from '../../../contexts/ThemeContext';
import { useAuth } from '../../../context/AuthContext';
import { useJtdEvents, useJtdEventDetail, useJtdAction } from './hooks/useJtdAdmin';
import { JtdFilters } from './components/JtdFilters';
import { JtdEventRow } from './components/JtdEventRow';
import { JtdStatusBadge } from './components/JtdStatusBadge';
import { VaNiLoader } from '@/components/common/loaders';
import { vaniToast } from '@/components/common/toast';
import { ConfirmationDialog } from '@/components/ui/ConfirmationDialog';
import type { JtdEventFilters, JtdEventRecord } from './types/jtdAdmin.types';

// Which statuses allow which actions
const RETRYABLE = ['failed'];
const CANCELLABLE = ['created', 'pending', 'queued', 'scheduled'];
const FORCE_COMPLETABLE = ['processing'];

const EventExplorerPage: React.FC = () => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;
  const { currentTenant } = useAuth();
  const [filters, setFilters] = useState<JtdEventFilters>({ page: 1, limit: 50 });
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { events, pagination, loading, error, refresh } = useJtdEvents(filters);
  const { event: detail, history, loading: detailLoading } = useJtdEventDetail(selectedId);
  const action = useJtdAction();

  // Confirmation dialog state
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{
    type: 'retry' | 'cancel' | 'force-sent' | 'force-failed';
    jtdId: string;
    label: string;
  } | null>(null);

  if (!currentTenant?.is_admin) {
    return (
      <div className="p-8 text-center transition-colors" style={{ color: colors.utility.secondaryText }}>
        Admin access required.
      </div>
    );
  }

  const clearFilters = () => setFilters({ page: 1, limit: 50 });

  // Open confirmation dialog
  const openConfirm = (type: 'retry' | 'cancel' | 'force-sent' | 'force-failed', jtdId: string) => {
    const labels = {
      retry: 'Retry this failed event?',
      cancel: 'Cancel this event?',
      'force-sent': 'Force-complete as SENT?',
      'force-failed': 'Force-complete as FAILED?',
    };
    setConfirmAction({ type, jtdId, label: labels[type] });
    setConfirmOpen(true);
  };

  // Execute confirmed action
  const handleConfirm = async () => {
    if (!confirmAction) return;
    setConfirmOpen(false);

    let result;
    switch (confirmAction.type) {
      case 'retry':
        result = await action.retryEvent(confirmAction.jtdId);
        break;
      case 'cancel':
        result = await action.cancelEvent(confirmAction.jtdId);
        break;
      case 'force-sent':
        result = await action.forceComplete(confirmAction.jtdId, 'sent');
        break;
      case 'force-failed':
        result = await action.forceComplete(confirmAction.jtdId, 'failed');
        break;
    }

    if (result?.success) {
      vaniToast.success(result.message || 'Action completed');
      refresh();
    } else {
      vaniToast.error(result?.error || action.error || 'Action failed');
    }
    setConfirmAction(null);
  };

  // Render action buttons for a row
  const renderRowActions = (ev: JtdEventRecord) => {
    const buttons: React.ReactNode[] = [];

    if (RETRYABLE.includes(ev.status_code)) {
      buttons.push(
        <button
          key="retry"
          onClick={(e) => { e.stopPropagation(); openConfirm('retry', ev.id); }}
          className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium hover:opacity-80 transition-colors"
          style={{ backgroundColor: colors.semantic.info + '20', color: colors.semantic.info }}
          title="Retry"
        >
          <RotateCcw size={12} /> Retry
        </button>
      );
    }

    if (CANCELLABLE.includes(ev.status_code)) {
      buttons.push(
        <button
          key="cancel"
          onClick={(e) => { e.stopPropagation(); openConfirm('cancel', ev.id); }}
          className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium hover:opacity-80 transition-colors"
          style={{ backgroundColor: colors.semantic.warning + '20', color: colors.semantic.warning }}
          title="Cancel"
        >
          <XCircle size={12} /> Cancel
        </button>
      );
    }

    if (FORCE_COMPLETABLE.includes(ev.status_code)) {
      buttons.push(
        <button
          key="force-sent"
          onClick={(e) => { e.stopPropagation(); openConfirm('force-sent', ev.id); }}
          className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium hover:opacity-80 transition-colors"
          style={{ backgroundColor: colors.semantic.success + '20', color: colors.semantic.success }}
          title="Force Sent"
        >
          <CheckCircle size={12} /> Sent
        </button>,
        <button
          key="force-failed"
          onClick={(e) => { e.stopPropagation(); openConfirm('force-failed', ev.id); }}
          className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium hover:opacity-80 transition-colors"
          style={{ backgroundColor: colors.semantic.error + '20', color: colors.semantic.error }}
          title="Force Failed"
        >
          <XCircle size={12} /> Failed
        </button>
      );
    }

    if (buttons.length === 0) return null;
    return <div className="flex gap-1">{buttons}</div>;
  };

  // ---- Detail Drawer ----
  if (selectedId && detail) {
    return (
      <div
        className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto min-h-screen transition-colors"
        style={{ backgroundColor: colors.utility.primaryBackground }}
      >
        <button
          onClick={() => setSelectedId(null)}
          className="flex items-center gap-2 text-sm font-medium hover:opacity-80 transition-colors"
          style={{ color: colors.brand.primary }}
        >
          <ChevronLeft size={16} /> Back to list
        </button>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold transition-colors" style={{ color: colors.utility.primaryText }}>
              Event Detail
            </h1>
            <p className="text-xs mt-1 font-mono transition-colors" style={{ color: colors.utility.secondaryText }}>
              {detail.id}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Detail-level actions */}
            {RETRYABLE.includes(detail.status_code) && (
              <button
                onClick={() => openConfirm('retry', detail.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium hover:opacity-80 transition-colors"
                style={{ backgroundColor: colors.semantic.info + '20', color: colors.semantic.info }}
              >
                <RotateCcw size={14} /> Retry
              </button>
            )}
            {CANCELLABLE.includes(detail.status_code) && (
              <button
                onClick={() => openConfirm('cancel', detail.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium hover:opacity-80 transition-colors"
                style={{ backgroundColor: colors.semantic.warning + '20', color: colors.semantic.warning }}
              >
                <XCircle size={14} /> Cancel
              </button>
            )}
            {FORCE_COMPLETABLE.includes(detail.status_code) && (
              <>
                <button
                  onClick={() => openConfirm('force-sent', detail.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium hover:opacity-80 transition-colors"
                  style={{ backgroundColor: colors.semantic.success + '20', color: colors.semantic.success }}
                >
                  <CheckCircle size={14} /> Force Sent
                </button>
                <button
                  onClick={() => openConfirm('force-failed', detail.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium hover:opacity-80 transition-colors"
                  style={{ backgroundColor: colors.semantic.error + '20', color: colors.semantic.error }}
                >
                  <XCircle size={14} /> Force Failed
                </button>
              </>
            )}
            <JtdStatusBadge code={detail.status_code} size="md" />
          </div>
        </div>

        {/* Key Fields */}
        <div
          className="rounded-lg shadow-sm border p-5 grid grid-cols-2 lg:grid-cols-3 gap-4 transition-colors"
          style={{ backgroundColor: colors.utility.secondaryBackground, borderColor: colors.utility.primaryText + '20' }}
        >
          {[
            { label: 'Tenant', value: detail.tenant_name },
            { label: 'Type', value: detail.event_type_code },
            { label: 'Channel', value: detail.channel_code || '—' },
            { label: 'Source', value: detail.source_type_code },
            { label: 'Recipient', value: detail.recipient_name || '—' },
            { label: 'Contact', value: detail.recipient_contact || '—' },
            { label: 'Template', value: detail.template_key || '—' },
            { label: 'Priority', value: String(detail.priority) },
            { label: 'Retries', value: `${detail.retry_count} / ${detail.max_retries}` },
            { label: 'Cost', value: detail.cost > 0 ? `$${detail.cost.toFixed(4)}` : '—' },
            { label: 'Provider', value: detail.provider_code || '—' },
            { label: 'Actor', value: `${detail.performed_by_type}${detail.performed_by_name ? ` (${detail.performed_by_name})` : ''}` },
          ].map((item) => (
            <div key={item.label}>
              <div className="text-xs font-medium mb-1 transition-colors" style={{ color: colors.utility.secondaryText }}>{item.label}</div>
              <div className="text-sm transition-colors" style={{ color: colors.utility.primaryText }}>{item.value}</div>
            </div>
          ))}
        </div>

        {/* Error (if any) */}
        {detail.error_message && (
          <div
            className="rounded-lg border p-4 transition-colors"
            style={{ backgroundColor: colors.semantic.error + '10', borderColor: colors.semantic.error + '40' }}
          >
            <div className="text-sm font-medium mb-1" style={{ color: colors.semantic.error }}>Error</div>
            <div className="text-sm" style={{ color: colors.semantic.error }}>{detail.error_message}</div>
            {detail.error_code && (
              <div className="text-xs mt-1 font-mono" style={{ color: colors.semantic.error }}>Code: {detail.error_code}</div>
            )}
          </div>
        )}

        {/* Timestamps */}
        <div
          className="rounded-lg shadow-sm border p-5 transition-colors"
          style={{ backgroundColor: colors.utility.secondaryBackground, borderColor: colors.utility.primaryText + '20' }}
        >
          <h3 className="text-sm font-semibold mb-3 transition-colors" style={{ color: colors.utility.primaryText }}>Timestamps</h3>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
            {[
              { label: 'Created', value: detail.created_at },
              { label: 'Scheduled', value: detail.scheduled_at },
              { label: 'Executed', value: detail.executed_at },
              { label: 'Completed', value: detail.completed_at },
            ].map((ts) => (
              <div key={ts.label}>
                <div className="text-xs transition-colors" style={{ color: colors.utility.secondaryText }}>{ts.label}</div>
                <div className="transition-colors" style={{ color: colors.utility.primaryText }}>
                  {ts.value ? new Date(ts.value).toLocaleString() : '—'}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Status History Timeline */}
        <div
          className="rounded-lg shadow-sm border p-5 transition-colors"
          style={{ backgroundColor: colors.utility.secondaryBackground, borderColor: colors.utility.primaryText + '20' }}
        >
          <h3 className="text-sm font-semibold mb-4 transition-colors" style={{ color: colors.utility.primaryText }}>Status History</h3>
          {history.length === 0 ? (
            <p className="text-sm opacity-40 transition-colors" style={{ color: colors.utility.secondaryText }}>No history</p>
          ) : (
            <div className="space-y-3">
              {history.map((h, i) => (
                <div key={h.id} className="flex items-start gap-3">
                  <div className="flex flex-col items-center">
                    <div className="w-2 h-2 rounded-full mt-1.5" style={{ backgroundColor: colors.brand.primary }} />
                    {i < history.length - 1 && (
                      <div className="w-px flex-1 min-h-[24px]" style={{ backgroundColor: colors.utility.primaryText + '20' }} />
                    )}
                  </div>
                  <div className="flex-1 pb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      {h.from_status_code && <JtdStatusBadge code={h.from_status_code} />}
                      {h.from_status_code && <span className="text-xs" style={{ color: colors.utility.secondaryText }}>&rarr;</span>}
                      <JtdStatusBadge code={h.to_status_code} />
                      {h.duration_seconds !== null && (
                        <span className="text-xs flex items-center gap-1" style={{ color: colors.utility.secondaryText }}>
                          <Clock size={10} /> {h.duration_seconds}s
                        </span>
                      )}
                    </div>
                    <div className="text-xs mt-1 transition-colors" style={{ color: colors.utility.secondaryText }}>
                      {new Date(h.created_at).toLocaleString()} &middot; {h.performed_by_type}
                      {h.reason && ` — ${h.reason}`}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Payload (collapsed) */}
        {detail.payload && Object.keys(detail.payload).length > 0 && (
          <details
            className="rounded-lg shadow-sm border p-5 transition-colors"
            style={{ backgroundColor: colors.utility.secondaryBackground, borderColor: colors.utility.primaryText + '20' }}
          >
            <summary className="text-sm font-semibold cursor-pointer transition-colors" style={{ color: colors.utility.primaryText }}>
              Payload (JSON)
            </summary>
            <pre className="mt-3 text-xs overflow-auto max-h-48 p-3 rounded-lg" style={{ backgroundColor: colors.utility.primaryBackground, color: colors.utility.secondaryText }}>
              {JSON.stringify(detail.payload, null, 2)}
            </pre>
          </details>
        )}

        {/* Confirmation Dialog */}
        <ConfirmationDialog
          isOpen={confirmOpen}
          onClose={() => { setConfirmOpen(false); setConfirmAction(null); }}
          onConfirm={handleConfirm}
          title={confirmAction?.label || 'Confirm Action'}
          description="This action will update the event status. Are you sure?"
          type={confirmAction?.type === 'cancel' || confirmAction?.type === 'force-failed' ? 'danger' : 'warning'}
          isLoading={action.loading}
        />
      </div>
    );
  }

  // ---- Detail Loading ----
  if (selectedId && detailLoading) {
    return (
      <VaNiLoader size="md" message="Loading event detail..." />
    );
  }

  // ---- List View ----
  return (
    <div
      className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto min-h-screen transition-colors"
      style={{ backgroundColor: colors.utility.primaryBackground }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold transition-colors" style={{ color: colors.utility.primaryText }}>Event Explorer</h1>
          <p className="text-sm mt-1 transition-colors" style={{ color: colors.utility.secondaryText }}>
            Search and inspect individual JTD records across all tenants
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

      {/* Filters */}
      <JtdFilters filters={filters} onChange={setFilters} onClear={clearFilters} />

      {/* Loading */}
      {loading && (
        <VaNiLoader size="md" message="Loading events..." />
      )}

      {/* Error */}
      {error && (
        <div className="p-6 text-center">
          <AlertCircle size={24} className="mx-auto mb-2" style={{ color: colors.semantic.error }} />
          <p className="transition-colors" style={{ color: colors.semantic.error }}>{error}</p>
        </div>
      )}

      {/* Table */}
      {!loading && events.length > 0 && (
        <div
          className="rounded-lg shadow-sm border overflow-hidden overflow-x-auto transition-colors"
          style={{ borderColor: colors.utility.primaryText + '20' }}
        >
          <table className="w-full min-w-[1050px]">
            <thead>
              <tr style={{ backgroundColor: colors.utility.secondaryBackground }}>
                {['Tenant', 'Type', 'Channel', 'Recipient', 'Status', 'Retries', 'Cost', 'Time', 'Actions'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold transition-colors" style={{ color: colors.utility.secondaryText }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {events.map((ev) => (
                <tr
                  key={ev.id}
                  onClick={() => setSelectedId(ev.id)}
                  className="cursor-pointer hover:opacity-80 transition-colors border-t"
                  style={{ borderColor: colors.utility.primaryText + '10' }}
                >
                  <td className="px-4 py-3 text-sm transition-colors" style={{ color: colors.utility.primaryText }}>{ev.tenant_name}</td>
                  <td className="px-4 py-3"><JtdStatusBadge code={ev.event_type_code} type="event_type" /></td>
                  <td className="px-4 py-3"><JtdStatusBadge code={ev.channel_code || ''} type="channel" /></td>
                  <td className="px-4 py-3 text-sm transition-colors" style={{ color: colors.utility.primaryText }}>
                    {ev.recipient_name || ev.recipient_contact || '—'}
                  </td>
                  <td className="px-4 py-3"><JtdStatusBadge code={ev.status_code} /></td>
                  <td className="px-4 py-3 text-sm transition-colors" style={{ color: colors.utility.primaryText }}>
                    {ev.retry_count}/{ev.max_retries}
                  </td>
                  <td className="px-4 py-3 text-sm transition-colors" style={{ color: colors.utility.primaryText }}>
                    {ev.cost > 0 ? `$${ev.cost.toFixed(4)}` : '—'}
                  </td>
                  <td className="px-4 py-3 text-xs transition-colors" style={{ color: colors.utility.secondaryText }}>
                    {new Date(ev.created_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">{renderRowActions(ev)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Empty */}
      {!loading && events.length === 0 && !error && (
        <div className="p-12 text-center transition-colors" style={{ color: colors.utility.secondaryText }}>
          No events match your filters.
        </div>
      )}

      {/* Pagination */}
      {pagination && pagination.total_pages > 1 && (
        <div
          className="flex items-center justify-between rounded-lg shadow-sm border p-4 transition-colors"
          style={{ backgroundColor: colors.utility.secondaryBackground, borderColor: colors.utility.primaryText + '20' }}
        >
          <span className="text-sm transition-colors" style={{ color: colors.utility.secondaryText }}>
            Page {pagination.current_page} of {pagination.total_pages} ({pagination.total_records} events)
          </span>
          <div className="flex gap-2">
            <button
              disabled={!pagination.has_prev}
              onClick={() => setFilters(f => ({ ...f, page: (f.page || 1) - 1 }))}
              className="px-3 py-1 rounded text-sm border disabled:opacity-30 hover:opacity-80 transition-colors"
              style={{ borderColor: colors.utility.primaryText + '20', color: colors.utility.primaryText }}
            >
              Prev
            </button>
            <button
              disabled={!pagination.has_next}
              onClick={() => setFilters(f => ({ ...f, page: (f.page || 1) + 1 }))}
              className="px-3 py-1 rounded text-sm border disabled:opacity-30 hover:opacity-80 transition-colors"
              style={{ borderColor: colors.utility.primaryText + '20', color: colors.utility.primaryText }}
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={confirmOpen}
        onClose={() => { setConfirmOpen(false); setConfirmAction(null); }}
        onConfirm={handleConfirm}
        title={confirmAction?.label || 'Confirm Action'}
        description="This action will update the event status. Are you sure?"
        type={confirmAction?.type === 'cancel' || confirmAction?.type === 'force-failed' ? 'danger' : 'warning'}
        isLoading={action.loading}
      />
    </div>
  );
};

export default EventExplorerPage;
