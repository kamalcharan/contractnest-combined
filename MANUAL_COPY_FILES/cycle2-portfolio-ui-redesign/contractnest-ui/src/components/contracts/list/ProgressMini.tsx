// src/components/contracts/list/ProgressMini.tsx
// Compact progress bar with percentage label for contract list rows

import React from 'react';

interface ProgressMiniProps {
  value: number;
  width?: number;
  colors: {
    semantic: { success: string; error: string };
    brand: { primary: string };
    utility: { secondaryText: string };
  };
}

const ProgressMini: React.FC<ProgressMiniProps> = ({ value, width = 80, colors }) => {
  const color =
    value === 100
      ? colors.semantic.success
      : value >= 50
        ? colors.brand.primary
        : value > 0
          ? colors.semantic.error + 'cc'
          : colors.utility.secondaryText + '30';

  return (
    <div style={{ width, display: 'flex', alignItems: 'center', gap: 6 }}>
      <div
        style={{
          flex: 1,
          height: 4,
          background: colors.utility.secondaryText + '15',
          borderRadius: 4,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${value}%`,
            height: '100%',
            background: color,
            borderRadius: 4,
            transition: 'width 0.6s ease',
          }}
        />
      </div>
      <span
        style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 10,
          fontWeight: 600,
          color: colors.utility.secondaryText,
          width: 28,
          textAlign: 'right',
        }}
      >
        {value}%
      </span>
    </div>
  );
};

export default ProgressMini;
