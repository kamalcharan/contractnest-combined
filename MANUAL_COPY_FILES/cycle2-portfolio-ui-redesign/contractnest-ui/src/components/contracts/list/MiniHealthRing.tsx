// src/components/contracts/list/MiniHealthRing.tsx
// Compact health score donut for contract list rows
// Same color logic as detail HealthRing, but inline-sized (32px)

import React from 'react';

interface MiniHealthRingProps {
  score: number;
  size?: number;
  colors: {
    semantic: { success: string; warning: string; error: string };
    utility: { secondaryText: string };
  };
}

const MiniHealthRing: React.FC<MiniHealthRingProps> = ({ score, size = 32, colors }) => {
  const r = (size - 4) / 2;
  const circ = 2 * Math.PI * r;
  const color =
    score >= 70
      ? colors.semantic.success
      : score >= 40
        ? colors.semantic.warning
        : score > 0
          ? colors.semantic.error
          : colors.utility.secondaryText + '30';

  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={colors.utility.secondaryText + '20'}
          strokeWidth={3}
        />
        {/* Progress */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={3}
          strokeDasharray={circ}
          strokeDashoffset={circ - (score / 100) * circ}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.8s ease' }}
        />
      </svg>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <span
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 9,
            fontWeight: 700,
            color,
          }}
        >
          {score > 0 ? score : '—'}
        </span>
      </div>
    </div>
  );
};

export default MiniHealthRing;
