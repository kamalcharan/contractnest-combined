// src/components/contracts/list/RelationshipSortSelect.tsx
// Sort dropdown for the unified Relationships list.

import React from 'react';
import { ArrowUpDown } from 'lucide-react';
import type { RelationshipSortOption } from '@/types/relationships';

interface RelationshipSortSelectProps {
  value: RelationshipSortOption;
  direction: 'asc' | 'desc';
  onChange: (sort: RelationshipSortOption, direction: 'asc' | 'desc') => void;
  colors: any;
  isDarkMode: boolean;
}

const SORT_OPTIONS: Array<{ value: RelationshipSortOption; label: string; defaultDir: 'asc' | 'desc' }> = [
  { value: 'name', label: 'Name', defaultDir: 'asc' },
  { value: 'contract_count', label: 'Contracts', defaultDir: 'desc' },
  { value: 'total_value', label: 'Value', defaultDir: 'desc' },
  { value: 'health', label: 'Health', defaultDir: 'asc' },
  { value: 'created_at', label: 'Created', defaultDir: 'desc' },
];

const RelationshipSortSelect: React.FC<RelationshipSortSelectProps> = ({
  value,
  direction,
  onChange,
  colors,
  isDarkMode,
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newSort = e.target.value as RelationshipSortOption;
    const opt = SORT_OPTIONS.find((o) => o.value === newSort);
    onChange(newSort, opt?.defaultDir || 'asc');
  };

  const toggleDirection = () => {
    onChange(value, direction === 'asc' ? 'desc' : 'asc');
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <select
        value={value}
        onChange={handleChange}
        style={{
          padding: '6px 10px',
          borderRadius: 8,
          border: `1px solid ${colors.utility.primaryText}15`,
          background: isDarkMode ? 'rgba(30, 41, 59, 0.6)' : '#fff',
          color: colors.utility.primaryText,
          fontSize: 12,
          fontWeight: 500,
          cursor: 'pointer',
          outline: 'none',
        }}
      >
        {SORT_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            Sort: {opt.label}
          </option>
        ))}
      </select>

      <button
        onClick={toggleDirection}
        title={direction === 'asc' ? 'Ascending' : 'Descending'}
        style={{
          width: 30,
          height: 30,
          borderRadius: 8,
          border: `1px solid ${colors.utility.primaryText}15`,
          background: 'transparent',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: colors.utility.secondaryText,
          transition: 'all 0.15s',
          transform: direction === 'desc' ? 'scaleY(-1)' : 'none',
        }}
      >
        <ArrowUpDown size={13} />
      </button>
    </div>
  );
};

export default RelationshipSortSelect;
