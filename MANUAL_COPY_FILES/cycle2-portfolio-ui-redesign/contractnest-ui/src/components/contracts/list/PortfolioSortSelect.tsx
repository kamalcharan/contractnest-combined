// src/components/contracts/list/PortfolioSortSelect.tsx
// Sort dropdown for the contract portfolio list

import React from 'react';

export type PortfolioSortOption = 'health_score' | 'total_value' | 'created_at' | 'completion';

interface PortfolioSortSelectProps {
  value: PortfolioSortOption;
  onChange: (value: PortfolioSortOption) => void;
  colors: {
    utility: { primaryText: string; secondaryText: string; secondaryBackground: string };
  };
}

const OPTIONS: Array<{ value: PortfolioSortOption; label: string }> = [
  { value: 'health_score', label: 'Sort: Worst Health First' },
  { value: 'total_value', label: 'Sort: Highest Value' },
  { value: 'created_at', label: 'Sort: Recently Updated' },
  { value: 'completion', label: 'Sort: Least Complete' },
];

const PortfolioSortSelect: React.FC<PortfolioSortSelectProps> = ({ value, onChange, colors }) => {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as PortfolioSortOption)}
      style={{
        padding: '5px 10px',
        borderRadius: 8,
        border: `1px solid ${colors.utility.primaryText}20`,
        background: colors.utility.secondaryBackground,
        color: colors.utility.secondaryText,
        fontSize: 12,
        fontWeight: 600,
        fontFamily: "'DM Sans', -apple-system, sans-serif",
        cursor: 'pointer',
        outline: 'none',
      }}
    >
      {OPTIONS.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
};

export default PortfolioSortSelect;
