// src/pages/admin/jtd/components/JtdFilters.tsx
// Shared filter bar for Event Explorer

import React from 'react';
import { Search, X } from 'lucide-react';
import { useTheme } from '../../../../contexts/ThemeContext';
import type { JtdEventFilters } from '../types/jtdAdmin.types';
import { JTD_STATUS_META, CHANNEL_META, EVENT_TYPE_META } from '../types/jtdAdmin.types';

interface JtdFiltersProps {
  filters: JtdEventFilters;
  onChange: (filters: JtdEventFilters) => void;
  onClear: () => void;
}

export const JtdFilters: React.FC<JtdFiltersProps> = ({ filters, onChange, onClear }) => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  const selectStyle: React.CSSProperties = {
    backgroundColor: colors.utility.primaryBackground,
    color: colors.utility.primaryText,
    borderColor: colors.utility.primaryText + '20',
  };

  const hasActiveFilters = filters.status || filters.event_type || filters.channel || filters.source_type || filters.search || filters.date_from || filters.date_to;

  return (
    <div className="flex flex-wrap gap-3 items-center">
      {/* Search */}
      <div className="relative flex-1 min-w-[200px]">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 opacity-40" style={{ color: colors.utility.secondaryText }} />
        <input
          type="text"
          placeholder="Search recipient, source ref, ID..."
          value={filters.search || ''}
          onChange={(e) => onChange({ ...filters, search: e.target.value || undefined, page: 1 })}
          className="w-full pl-9 pr-3 py-2 rounded-lg text-sm border transition-colors"
          style={selectStyle}
        />
      </div>

      {/* Status */}
      <select
        value={filters.status || ''}
        onChange={(e) => onChange({ ...filters, status: e.target.value || undefined, page: 1 })}
        className="px-3 py-2 rounded-lg text-sm border transition-colors"
        style={selectStyle}
      >
        <option value="">All Statuses</option>
        {Object.entries(JTD_STATUS_META).map(([code, meta]) => (
          <option key={code} value={code}>{meta.label}</option>
        ))}
      </select>

      {/* Event Type */}
      <select
        value={filters.event_type || ''}
        onChange={(e) => onChange({ ...filters, event_type: e.target.value || undefined, page: 1 })}
        className="px-3 py-2 rounded-lg text-sm border transition-colors"
        style={selectStyle}
      >
        <option value="">All Types</option>
        {Object.entries(EVENT_TYPE_META).map(([code, meta]) => (
          <option key={code} value={code}>{meta.label}</option>
        ))}
      </select>

      {/* Channel */}
      <select
        value={filters.channel || ''}
        onChange={(e) => onChange({ ...filters, channel: e.target.value || undefined, page: 1 })}
        className="px-3 py-2 rounded-lg text-sm border transition-colors"
        style={selectStyle}
      >
        <option value="">All Channels</option>
        {Object.entries(CHANNEL_META).map(([code, meta]) => (
          <option key={code} value={code}>{meta.label}</option>
        ))}
      </select>

      {/* Date From */}
      <input
        type="date"
        value={filters.date_from || ''}
        onChange={(e) => onChange({ ...filters, date_from: e.target.value || undefined, page: 1 })}
        className="px-3 py-2 rounded-lg text-sm border transition-colors"
        style={selectStyle}
      />

      {/* Date To */}
      <input
        type="date"
        value={filters.date_to || ''}
        onChange={(e) => onChange({ ...filters, date_to: e.target.value || undefined, page: 1 })}
        className="px-3 py-2 rounded-lg text-sm border transition-colors"
        style={selectStyle}
      />

      {/* Clear */}
      {hasActiveFilters && (
        <button
          onClick={onClear}
          className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium hover:opacity-80 transition-colors"
          style={{ color: colors.semantic.error }}
        >
          <X size={14} /> Clear
        </button>
      )}
    </div>
  );
};
