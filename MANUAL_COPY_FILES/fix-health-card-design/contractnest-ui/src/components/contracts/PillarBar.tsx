// src/components/contracts/PillarBar.tsx
// Individual pillar bar for the Contract Health Card
// Horizontal row: icon | label (90px) | progress bar | score

import React from 'react';

// =================================================================
// PROPS
// =================================================================

interface PillarBarProps {
  /** Emoji icon for this pillar */
  icon: string;
  /** Pillar label (e.g. "Delivery", "Financial") */
  label: string;
  /** Pillar score: 0–100 */
  score: number;
  /** Additional CSS class */
  className?: string;
}

// =================================================================
// COMPONENT
// =================================================================

export const PillarBar: React.FC<PillarBarProps> = ({
  icon,
  label,
  score,
  className,
}) => {
  const clampedScore = Math.max(0, Math.min(100, score));
  const color = clampedScore >= 70 ? '#10b981' : clampedScore >= 40 ? '#f59e0b' : '#ef4444';

  return (
    <div
      className={className}
      style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}
    >
      <span style={{ fontSize: 14, width: 22, textAlign: 'center' }}>{icon}</span>
      <div style={{ width: 90, fontSize: 12, fontWeight: 600, color: '#475569' }}>{label}</div>
      <div
        style={{
          flex: 1,
          height: 6,
          background: '#f1f5f9',
          borderRadius: 6,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${clampedScore}%`,
            height: '100%',
            background: color,
            borderRadius: 6,
            transition: 'width 1s ease',
          }}
        />
      </div>
      <span
        style={{
          fontFamily: 'monospace',
          fontSize: 12,
          fontWeight: 700,
          color,
          width: 28,
          textAlign: 'right',
        }}
      >
        {clampedScore}
      </span>
    </div>
  );
};

export default PillarBar;
