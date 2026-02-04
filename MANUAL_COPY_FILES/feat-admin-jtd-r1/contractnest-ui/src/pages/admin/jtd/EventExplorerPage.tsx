// src/pages/admin/jtd/EventExplorerPage.tsx
// Admin JTD Event Explorer — searchable, filterable list of all JTD records

import React, { useState } from 'react';
import {
  Search,
  RefreshCw,
  Loader2,
  AlertTriangle,
  ChevronLeft,
  Clock,
  X,
} from 'lucide-react';
import { useTheme } from '../../../contexts/ThemeContext';
import { useAuth } from '../../../context/AuthContext';
import { useJtdEvents, useJtdEventDetail } from './hooks/useJtdAdmin';
import { JtdFilters } from './components/JtdFilters';
import { JtdEventRow } from './components/JtdEventRow';
import { JtdStatusBadge } from './components/JtdStatusBadge';
import type { JtdEventFilters, JtdEventRecord } from './types/jtdAdmin.types';

const EventExplorerPage: React.FC = () => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;
  const borderColor = isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)';
  const { currentTenant } = useAuth();
  const [filters, setFilters] = useState<JtdEventFilters>({ page: 1, limit: 50 });
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { events, pagination, loading, error, refresh } = useJtdEvents(filters);
  const { event: detail, history, loading: detailLoading } = useJtdEventDetail(selectedId);

  if (!currentTenant?.is_admin) {
    return (
      <div className="p-8 text-center" style={{ color: colors.utility.secondaryText }}>
        Admin access required.
      </div>
    );
  }

  const clearFilters = () => setFilters({ page: 1, limit: 50 });

  // ---- Detail Drawer ----
  if (selectedId && detail) {
    return (
      <div className="p-6 space-y-6 max-w-5xl mx-auto">
        <button
          onClick={() => setSelectedId(null)}
          className="flex items-center gap-2 text-sm font-medium hover:opacity-80"
          style={{ color: colors.brand.primary }}
        >
          <ChevronLeft size={16} /> Back to list
        </button>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold" style={{ color: colors.utility.primaryText }}>
              Event Detail
            </h1>
            <p className="text-xs mt-1 font-mono" style={{ color: colors.utility.secondaryText }}>
              {detail.id}
            </p>
          </div>
          <JtdStatusBadge code={detail.status_code} size="md" />
        </div>

        {/* Key Fields */}
        <div
          className="rounded-xl p-5 grid grid-cols-2 lg:grid-cols-3 gap-4"
          style={{ backgroundColor: colors.utility.primaryBackground, border: `1px solid ${borderColor}` }}
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
              <div className="text-xs font-medium mb-1" style={{ color: colors.utility.secondaryText }}>{item.label}</div>
              <div className="text-sm" style={{ color: colors.utility.primaryText }}>{item.value}</div>
            </div>
          ))}
        </div>

        {/* Error (if any) */}
        {detail.error_message && (
          <div className="rounded-xl p-4" style={{ backgroundColor: '#FEE2E2', border: '1px solid #FECACA' }}>
            <div className="text-sm font-medium mb-1" style={{ color: '#991B1B' }}>Error</div>
            <div className="text-sm" style={{ color: '#DC2626' }}>{detail.error_message}</div>
            {detail.error_code && (
              <div className="text-xs mt-1 font-mono" style={{ color: '#B91C1C' }}>Code: {detail.error_code}</div>
            )}
          </div>
        )}

        {/* Timestamps */}
        <div
          className="rounded-xl p-5"
          style={{ backgroundColor: colors.utility.primaryBackground, border: `1px solid ${borderColor}` }}
        >
          <h3 className="text-sm font-semibold mb-3" style={{ color: colors.utility.primaryText }}>Timestamps</h3>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
            {[
              { label: 'Created', value: detail.created_at },
              { label: 'Scheduled', value: detail.scheduled_at },
              { label: 'Executed', value: detail.executed_at },
              { label: 'Completed', value: detail.completed_at },
            ].map((ts) => (
              <div key={ts.label}>
                <div className="text-xs" style={{ color: colors.utility.secondaryText }}>{ts.label}</div>
                <div style={{ color: colors.utility.primaryText }}>
                  {ts.value ? new Date(ts.value).toLocaleString() : '—'}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Status History Timeline */}
        <div
          className="rounded-xl p-5"
          style={{ backgroundColor: colors.utility.primaryBackground, border: `1px solid ${borderColor}` }}
        >
          <h3 className="text-sm font-semibold mb-4" style={{ color: colors.utility.primaryText }}>Status History</h3>
          {history.length === 0 ? (
            <p className="text-sm opacity-40" style={{ color: colors.utility.secondaryText }}>No history</p>
          ) : (
            <div className="space-y-3">
              {history.map((h, i) => (
                <div key={h.id} className="flex items-start gap-3">
                  <div className="flex flex-col items-center">
                    <div className="w-2 h-2 rounded-full mt-1.5" style={{ backgroundColor: colors.brand.primary }} />
                    {i < history.length - 1 && (
                      <div className="w-px flex-1 min-h-[24px]" style={{ backgroundColor: borderColor }} />
                    )}
                  </div>
                  <div className="flex-1 pb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      {h.from_status_code && <JtdStatusBadge code={h.from_status_code} />}
                      {h.from_status_code && <span className="text-xs" style={{ color: colors.utility.secondaryText }}>-&gt;</span>}
                      <JtdStatusBadge code={h.to_status_code} />
                      {h.duration_seconds !== null && (
                        <span className="text-xs flex items-center gap-1" style={{ color: colors.utility.secondaryText }}>
                          <Clock size={10} /> {h.duration_seconds}s
                        </span>
                      )}
                    </div>
                    <div className="text-xs mt-1" style={{ color: colors.utility.secondaryText }}>
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
            className="rounded-xl p-5"
            style={{ backgroundColor: colors.utility.primaryBackground, border: `1px solid ${borderColor}` }}
          >
            <summary className="text-sm font-semibold cursor-pointer" style={{ color: colors.utility.primaryText }}>
              Payload (JSON)
            </summary>
            <pre className="mt-3 text-xs overflow-auto max-h-48 p-3 rounded-lg" style={{ backgroundColor: colors.utility.secondaryBackground, color: colors.utility.secondaryText }}>
              {JSON.stringify(detail.payload, null, 2)}
            </pre>
          </details>
        )}
      </div>
    );
  }

  // ---- Detail Loading ----
  if (selectedId && detailLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin" size={32} style={{ color: colors.brand.primary }} />
      </div>
    );
  }

  // ---- List View ----
  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: colors.utility.primaryText }}>Event Explorer</h1>
          <p className="text-sm mt-1" style={{ color: colors.utility.secondaryText }}>
            Search and inspect individual JTD records across all tenants
          </p>
        </div>
        <button
          onClick={refresh}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium hover:opacity-80"
          style={{ backgroundColor: colors.brand.primary, color: '#fff' }}
        >
          <RefreshCw size={16} /> Refresh
        </button>
      </div>

      {/* Filters */}
      <JtdFilters filters={filters} onChange={setFilters} onClear={clearFilters} />

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center h-32">
          <Loader2 className="animate-spin" size={32} style={{ color: colors.brand.primary }} />
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="p-6 text-center">
          <AlertTriangle size={24} className="mx-auto mb-2" style={{ color: '#EF4444' }} />
          <p style={{ color: colors.utility.primaryText }}>{error}</p>
        </div>
      )}

      {/* Table */}
      {!loading && events.length > 0 && (
        <div
          className="rounded-xl overflow-hidden overflow-x-auto"
          style={{ border: `1px solid ${borderColor}` }}
        >
          <table className="w-full min-w-[900px]">
            <thead>
              <tr style={{ backgroundColor: colors.utility.secondaryBackground }}>
                {['Tenant', 'Type', 'Channel', 'Recipient', 'Status', 'Retries', 'Cost', 'Time'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold" style={{ color: colors.utility.secondaryText }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {events.map((ev) => (
                <JtdEventRow key={ev.id} event={ev} onClick={(e) => setSelectedId(e.id)} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Empty */}
      {!loading && events.length === 0 && !error && (
        <div className="p-12 text-center" style={{ color: colors.utility.secondaryText }}>
          No events match your filters.
        </div>
      )}

      {/* Pagination */}
      {pagination && pagination.total_pages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-sm" style={{ color: colors.utility.secondaryText }}>
            Page {pagination.current_page} of {pagination.total_pages} ({pagination.total_records} events)
          </span>
          <div className="flex gap-2">
            <button
              disabled={!pagination.has_prev}
              onClick={() => setFilters(f => ({ ...f, page: (f.page || 1) - 1 }))}
              className="px-3 py-1 rounded text-sm disabled:opacity-30"
              style={{ border: `1px solid ${borderColor}`, color: colors.utility.primaryText }}
            >
              Prev
            </button>
            <button
              disabled={!pagination.has_next}
              onClick={() => setFilters(f => ({ ...f, page: (f.page || 1) + 1 }))}
              className="px-3 py-1 rounded text-sm disabled:opacity-30"
              style={{ border: `1px solid ${borderColor}`, color: colors.utility.primaryText }}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default EventExplorerPage;
