// src/components/contracts/list/ViewModeToggle.tsx
// Toggle between Flat list and Grouped-by-client views

import React from 'react';
import { List, LayoutGrid } from 'lucide-react';

export type ViewMode = 'flat' | 'grouped';

interface ViewModeToggleProps {
  value: ViewMode;
  onChange: (mode: ViewMode) => void;
  groupLabel?: string; // "By Client" or "By Vendor" based on perspective
  colors: {
    brand: { primary: string };
    utility: { primaryText: string; secondaryText: string; secondaryBackground: string };
  };
}

const ViewModeToggle: React.FC<ViewModeToggleProps> = ({ value, onChange, groupLabel = 'By Client', colors }) => {
  const modes: Array<{ id: ViewMode; label: string; icon: React.ReactNode }> = [
    { id: 'flat', label: 'List', icon: <List size={13} /> },
    { id: 'grouped', label: groupLabel, icon: <LayoutGrid size={13} /> },
  ];

  return (
    <div
      style={{
        display: 'inline-flex',
        borderRadius: 8,
        border: `1px solid ${colors.utility.primaryText}15`,
        overflow: 'hidden',
      }}
    >
      {modes.map((mode) => {
        const isActive = value === mode.id;
        return (
          <button
            key={mode.id}
            onClick={() => onChange(mode.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              padding: '5px 10px',
              border: 'none',
              background: isActive ? colors.brand.primary + '15' : colors.utility.secondaryBackground,
              color: isActive ? colors.brand.primary : colors.utility.secondaryText,
              fontSize: 11,
              fontWeight: isActive ? 700 : 500,
              cursor: 'pointer',
              fontFamily: "'DM Sans', -apple-system, sans-serif",
              transition: 'all 0.15s',
            }}
          >
            {mode.icon}
            {mode.label}
          </button>
        );
      })}
    </div>
  );
};

export default ViewModeToggle;
