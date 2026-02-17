// src/components/contracts/HealthRing.tsx
// Animated SVG donut ring showing overall contract health score
// Design: score number + "HEALTH" label in center, setTimeout animation

import React, { useState, useEffect } from 'react';

// =================================================================
// PROPS
// =================================================================

interface HealthRingProps {
  /** Overall health score: 0–100 */
  score: number;
  /** SVG diameter in px (default: 120) */
  size?: number;
  /** Stroke width in px (default: 9) */
  strokeWidth?: number;
  /** Additional CSS class */
  className?: string;
}

// =================================================================
// COMPONENT
// =================================================================

export const HealthRing: React.FC<HealthRingProps> = ({
  score,
  size = 120,
  strokeWidth = 9,
  className,
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const [offset, setOffset] = useState(circumference);
  const color = score >= 70 ? '#10b981' : score >= 40 ? '#f59e0b' : '#ef4444';

  useEffect(() => {
    const t = setTimeout(
      () => setOffset(circumference - (score / 100) * circumference),
      300,
    );
    return () => clearTimeout(t);
  }, [score, circumference]);

  return (
    <div className={className} style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        {/* Background track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#0f172a"
          strokeWidth={strokeWidth}
          opacity={0.06}
        />
        {/* Progress arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.4,0,0.2,1)' }}
        />
      </svg>
      {/* Center label */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <span
          style={{
            fontFamily: 'monospace',
            fontSize: 28,
            fontWeight: 700,
            color,
            lineHeight: 1,
          }}
        >
          {score}
        </span>
        <span
          style={{
            fontSize: 10,
            color: '#94a3b8',
            letterSpacing: 1.5,
            textTransform: 'uppercase',
            marginTop: 3,
            fontWeight: 600,
          }}
        >
          Health
        </span>
      </div>
    </div>
  );
};

export default HealthRing;
