// src/pages/admin/jtd/TenantOperationsPage.tsx
// Admin JTD Tenant Operations — per-tenant volume, channels, success rates

import React, { useState } from 'react';
import {
  Building2,
  Search,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  XCircle,
  CreditCard,
  ArrowUpDown,
  Sparkles,
  AlertCircle,
} from 'lucide-react';
import { useTheme } from '../../../contexts/ThemeContext';
import { useAuth } from '../../../context/AuthContext';
import { useTenantStats } from './hooks/useJtdAdmin';
import { JtdMetricCard } from './components/JtdMetricCard';
import { JtdStatusBadge } from './components/JtdStatusBadge';
import { VaNiLoader } from '@/components/common/loaders';
import type { TenantStatsFilters, TenantJtdStats } from './types/jtdAdmin.types';

const TenantOperationsPage: React.FC = () => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;
  const { currentTenant } = useAuth();
  const [filters, setFilters] = useState<TenantStatsFilters>({ page: 1, limit: 20, sort_by: 'total_jtds', sort_dir: 'desc' });
  const [searchInput, setSearchInput] = useState('');
  const { data, loading, error, refresh } = useTenantStats(filters);

  if (!currentTenant?.is_admin) {
    return (
      <div className="p-8 text-center transition-colors" style={{ color: colors.utility.secondaryText }}>
        Admin access required.
      </div>
    );
  }

  const handleSearch = () => {
    setFilters(f => ({ ...f, search: searchInput || undefined, page: 1 }));
  };

  const handleSort = (col: string) => {
    setFilters(f => ({
      ...f,
      sort_by: col,
      sort_dir: f.sort_by === col && f.sort_dir === 'desc' ? 'asc' : 'desc',
    }));
  };

  const global = data?.global;
  const tenants = data?.tenants || [];
  const pagination = data?.pagination;

  return (
    <div
      className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto min-h-screen transition-colors"
      style={{ backgroundColor: colors.utility.primaryBackground }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold transition-colors" style={{ color: colors.utility.primaryText }}>Tenant Operations</h1>
          <p className="text-sm mt-1 transition-colors" style={{ color: colors.utility.secondaryText }}>
            JTD volume, channel usage, and success rates per tenant
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

      {/* Global KPIs */}
      {global && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <JtdMetricCard title="Total JTDs" value={global.total_jtds} icon={Building2} iconColor={colors.semantic.info} />
          <JtdMetricCard title="Sent" value={global.total_sent} icon={CheckCircle} iconColor={colors.semantic.success} />
          <JtdMetricCard title="Failed" value={global.total_failed} icon={XCircle} iconColor={colors.semantic.error} alert={global.total_failed > 0} />
          <JtdMetricCard title="No Credits" value={global.total_no_credits} icon={CreditCard} iconColor={colors.semantic.warning} alert={global.total_no_credits > 0} />
          <JtdMetricCard title="Total Cost" value={`$${global.total_cost.toFixed(2)}`} icon={CreditCard} iconColor="#8B5CF6" />
        </div>
      )}

      {/* Search Bar */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 opacity-40" style={{ color: colors.utility.secondaryText }} />
          <input
            type="text"
            placeholder="Search tenant name..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="w-full pl-9 pr-3 py-2 rounded-lg text-sm border transition-colors"
            style={{ backgroundColor: colors.utility.primaryBackground, color: colors.utility.primaryText, borderColor: colors.utility.primaryText + '20' }}
          />
        </div>
        <button
          onClick={handleSearch}
          className="px-4 py-2 rounded-lg text-sm font-medium hover:opacity-80 transition-colors"
          style={{ backgroundColor: colors.brand.primary, color: '#fff' }}
        >
          Search
        </button>
      </div>

      {/* Loading / Error */}
      {loading && !data && (
        <VaNiLoader size="md" message="Loading tenant stats..." />
      )}

      {error && (
        <div className="p-6 text-center">
          <AlertCircle size={24} className="mx-auto mb-2" style={{ color: colors.semantic.error }} />
          <p className="transition-colors" style={{ color: colors.semantic.error }}>{error}</p>
        </div>
      )}

      {/* Tenant Table */}
      {!loading && tenants.length > 0 && (
        <div
          className="rounded-lg shadow-sm border overflow-hidden transition-colors"
          style={{ borderColor: colors.utility.primaryText + '20' }}
        >
          <table className="w-full">
            <thead>
              <tr style={{ backgroundColor: colors.utility.secondaryBackground }}>
                {[
                  { key: 'tenant_name', label: 'Tenant' },
                  { key: 'total_jtds', label: 'Total' },
                  { key: 'sent', label: 'Sent' },
                  { key: 'failed', label: 'Failed' },
                  { key: 'success_rate', label: 'Success %' },
                  { key: 'total_cost', label: 'Cost' },
                  { key: 'channels', label: 'Channels' },
                  { key: 'vani', label: 'VaNi' },
                ].map((col) => (
                  <th
                    key={col.key}
                    className="px-4 py-3 text-left text-xs font-semibold cursor-pointer select-none transition-colors"
                    style={{ color: colors.utility.secondaryText }}
                    onClick={() => col.key !== 'channels' && col.key !== 'vani' && handleSort(col.key)}
                  >
                    <span className="flex items-center gap-1">
                      {col.label}
                      {col.key !== 'channels' && col.key !== 'vani' && <ArrowUpDown size={12} />}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tenants.map((t: TenantJtdStats) => (
                <tr
                  key={t.tenant_id}
                  className="hover:opacity-90 transition-colors"
                  style={{ borderBottom: `1px solid ${colors.utility.primaryText + '20'}` }}
                >
                  <td className="px-4 py-3">
                    <div className="text-sm font-medium transition-colors" style={{ color: colors.utility.primaryText }}>{t.tenant_name}</div>
                    <div className="text-xs transition-colors" style={{ color: colors.utility.secondaryText }}>{t.tenant_status}</div>
                  </td>
                  <td className="px-4 py-3 text-sm transition-colors" style={{ color: colors.utility.primaryText }}>{t.total_jtds.toLocaleString()}</td>
                  <td className="px-4 py-3 text-sm" style={{ color: colors.semantic.success }}>{t.sent.toLocaleString()}</td>
                  <td className="px-4 py-3 text-sm" style={{ color: t.failed > 0 ? colors.semantic.error : colors.utility.secondaryText }}>{t.failed.toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <span
                      className="text-sm font-medium"
                      style={{ color: t.success_rate >= 90 ? colors.semantic.success : t.success_rate >= 70 ? colors.semantic.warning : colors.semantic.error }}
                    >
                      {t.success_rate}%
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm transition-colors" style={{ color: colors.utility.secondaryText }}>${t.total_cost.toFixed(2)}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 flex-wrap">
                      {Object.entries(t.by_channel).map(([ch, cnt]) => (
                        <span key={ch} className="text-xs px-1.5 py-0.5 rounded transition-colors" style={{ backgroundColor: colors.utility.secondaryBackground, color: colors.utility.secondaryText }}>
                          {ch}: {cnt}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {t.vani_enabled ? (
                      <Sparkles size={16} style={{ color: colors.brand.primary }} />
                    ) : (
                      <span className="text-xs opacity-40">Off</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Empty State */}
      {!loading && tenants.length === 0 && !error && (
        <div className="p-12 text-center transition-colors" style={{ color: colors.utility.secondaryText }}>
          No tenant data found.
        </div>
      )}

      {/* Pagination */}
      {pagination && pagination.total_pages > 1 && (
        <div
          className="flex items-center justify-between rounded-lg shadow-sm border p-4 transition-colors"
          style={{ backgroundColor: colors.utility.secondaryBackground, borderColor: colors.utility.primaryText + '20' }}
        >
          <span className="text-sm transition-colors" style={{ color: colors.utility.secondaryText }}>
            Page {pagination.current_page} of {pagination.total_pages} ({pagination.total_records} tenants)
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
    </div>
  );
};

export default TenantOperationsPage;
