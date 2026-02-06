// src/components/subscription/filters/TenantFilters.tsx
// Glassmorphism filters for tenant list

import React, { useState } from 'react';
import {
  Search,
  Filter,
  X,
  ChevronDown,
  Users,
  CheckCircle,
  Timer,
  AlertTriangle,
  ShieldOff,
  FlaskConical
} from 'lucide-react';
import {
  AdminTenantFilters,
  QuickFilterType,
  TenantStatus,
  SubscriptionStatus,
  TenantType
} from '../../../types/tenantManagement';
import { useTheme } from '../../../contexts/ThemeContext';

interface TenantFiltersProps {
  filters: AdminTenantFilters;
  onFiltersChange: (filters: AdminTenantFilters) => void;
  quickFilter: QuickFilterType;
  onQuickFilterChange: (filter: QuickFilterType) => void;
  industries?: { id: string; name: string }[];
  totalResults?: number;
}

const quickFilterConfig: {
  id: QuickFilterType;
  label: string;
  icon: React.ElementType;
  color: string;
}[] = [
  { id: 'all', label: 'All', icon: Users, color: '#6366F1' },
  { id: 'active', label: 'Active', icon: CheckCircle, color: '#10B981' },
  { id: 'trial', label: 'Trial', icon: Timer, color: '#F59E0B' },
  { id: 'expiring', label: 'Expiring', icon: AlertTriangle, color: '#EF4444' },
  { id: 'suspended', label: 'Suspended', icon: ShieldOff, color: '#DC2626' },
  { id: 'test', label: 'Test Account', icon: FlaskConical, color: '#F97316' }
];

export const TenantFilters: React.FC<TenantFiltersProps> = ({
  filters,
  onFiltersChange,
  quickFilter,
  onQuickFilterChange,
  industries = [],
  totalResults
}) => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [searchValue, setSearchValue] = useState(filters.search || '');

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onFiltersChange({ ...filters, search: searchValue, page: 1 });
  };

  const handleSearchClear = () => {
    setSearchValue('');
    onFiltersChange({ ...filters, search: undefined, page: 1 });
  };

  const handleFilterChange = (key: keyof AdminTenantFilters, value: any) => {
    onFiltersChange({
      ...filters,
      [key]: value === 'all' ? undefined : value,
      page: 1
    });
  };

  const hasActiveFilters = filters.status || filters.subscription_status || filters.tenant_type || filters.industry_id;

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: isDarkMode
          ? 'rgba(30, 41, 59, 0.8)'
          : 'rgba(255, 255, 255, 0.85)',
        backdropFilter: 'blur(12px)',
        border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.5)'}`,
        boxShadow: '0 4px 24px -8px rgba(0,0,0,0.08)'
      }}
    >
      {/* Search Bar */}
      <form onSubmit={handleSearchSubmit} className="p-4">
        <div className="relative">
          <Search
            size={20}
            className="absolute left-4 top-1/2 -translate-y-1/2"
            style={{ color: colors.utility.secondaryText }}
          />
          <input
            type="text"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            placeholder="Search by name, email, or workspace code..."
            className="w-full pl-12 pr-12 py-3 rounded-xl border-none outline-none transition-all"
            style={{
              background: isDarkMode ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.03)',
              color: colors.utility.primaryText
            }}
          />
          {searchValue && (
            <button
              type="button"
              onClick={handleSearchClear}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-opacity-80 transition-colors"
              style={{
                background: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'
              }}
            >
              <X size={16} style={{ color: colors.utility.secondaryText }} />
            </button>
          )}
        </div>
      </form>

      {/* Quick Filters */}
      <div
        className="px-4 pb-4"
        style={{
          borderBottom: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)'}`
        }}
      >
        <div className="flex items-center gap-2 flex-wrap">
          {quickFilterConfig.map((qf) => {
            const Icon = qf.icon;
            const isActive = quickFilter === qf.id;

            return (
              <button
                key={qf.id}
                onClick={() => onQuickFilterChange(qf.id)}
                className={`
                  flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium
                  transition-all duration-200
                  ${isActive ? 'scale-105' : 'hover:scale-102'}
                `}
                style={{
                  background: isActive
                    ? `${qf.color}25`
                    : isDarkMode
                      ? 'rgba(255,255,255,0.05)'
                      : 'rgba(0,0,0,0.03)',
                  color: isActive ? qf.color : colors.utility.secondaryText,
                  border: isActive ? `1px solid ${qf.color}40` : '1px solid transparent'
                }}
              >
                <Icon size={14} />
                <span>{qf.label}</span>
              </button>
            );
          })}

          {/* Advanced Filters Toggle */}
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className={`
              ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium
              transition-all duration-200
            `}
            style={{
              background: hasActiveFilters || showAdvanced
                ? `${colors.brand.primary}20`
                : isDarkMode
                  ? 'rgba(255,255,255,0.05)'
                  : 'rgba(0,0,0,0.03)',
              color: hasActiveFilters || showAdvanced
                ? colors.brand.primary
                : colors.utility.secondaryText
            }}
          >
            <Filter size={14} />
            <span>Filters</span>
            {hasActiveFilters && (
              <span
                className="w-2 h-2 rounded-full"
                style={{ background: colors.brand.primary }}
              />
            )}
            <ChevronDown
              size={14}
              className={`transition-transform ${showAdvanced ? 'rotate-180' : ''}`}
            />
          </button>
        </div>
      </div>

      {/* Advanced Filters */}
      {showAdvanced && (
        <div
          className="p-4 grid grid-cols-2 md:grid-cols-4 gap-4"
          style={{
            background: isDarkMode ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.01)'
          }}
        >
          {/* Status Filter */}
          <div>
            <label
              className="block text-xs font-medium mb-1.5"
              style={{ color: colors.utility.secondaryText }}
            >
              Tenant Status
            </label>
            <select
              value={filters.status || 'all'}
              onChange={(e) => handleFilterChange('status', e.target.value as TenantStatus)}
              className="w-full px-3 py-2 rounded-lg text-sm outline-none transition-colors"
              style={{
                background: isDarkMode ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.8)',
                color: colors.utility.primaryText,
                border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`
              }}
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="suspended">Suspended</option>
              <option value="closed">Closed</option>
            </select>
          </div>

          {/* Subscription Status Filter */}
          <div>
            <label
              className="block text-xs font-medium mb-1.5"
              style={{ color: colors.utility.secondaryText }}
            >
              Subscription
            </label>
            <select
              value={filters.subscription_status || 'all'}
              onChange={(e) => handleFilterChange('subscription_status', e.target.value as SubscriptionStatus)}
              className="w-full px-3 py-2 rounded-lg text-sm outline-none transition-colors"
              style={{
                background: isDarkMode ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.8)',
                color: colors.utility.primaryText,
                border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`
              }}
            >
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="trial">Trial</option>
              <option value="grace_period">Grace Period</option>
              <option value="suspended">Suspended</option>
              <option value="cancelled">Cancelled</option>
              <option value="expired">Expired</option>
            </select>
          </div>

          {/* Tenant Type Filter */}
          <div>
            <label
              className="block text-xs font-medium mb-1.5"
              style={{ color: colors.utility.secondaryText }}
            >
              Tenant Type
            </label>
            <select
              value={filters.tenant_type || 'all'}
              onChange={(e) => handleFilterChange('tenant_type', e.target.value as TenantType)}
              className="w-full px-3 py-2 rounded-lg text-sm outline-none transition-colors"
              style={{
                background: isDarkMode ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.8)',
                color: colors.utility.primaryText,
                border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`
              }}
            >
              <option value="all">All Types</option>
              <option value="buyer">Buyers</option>
              <option value="seller">Sellers</option>
              <option value="mixed">Mixed</option>
            </select>
          </div>

          {/* Industry Filter */}
          <div>
            <label
              className="block text-xs font-medium mb-1.5"
              style={{ color: colors.utility.secondaryText }}
            >
              Industry
            </label>
            <select
              value={filters.industry_id || 'all'}
              onChange={(e) => handleFilterChange('industry_id', e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-sm outline-none transition-colors"
              style={{
                background: isDarkMode ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.8)',
                color: colors.utility.primaryText,
                border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`
              }}
            >
              <option value="all">All Industries</option>
              {industries.map((ind) => (
                <option key={ind.id} value={ind.id}>{ind.name}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Results count */}
      {totalResults !== undefined && (
        <div
          className="px-4 py-2 text-sm"
          style={{
            color: colors.utility.secondaryText,
            borderTop: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)'}`
          }}
        >
          <span className="font-medium" style={{ color: colors.utility.primaryText }}>
            {totalResults.toLocaleString()}
          </span>
          {' '}tenants found
        </div>
      )}
    </div>
  );
};

export default TenantFilters;
