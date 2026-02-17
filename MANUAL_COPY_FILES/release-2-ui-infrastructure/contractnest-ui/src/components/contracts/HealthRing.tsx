// src/components/contracts/HealthRing.tsx
// Animated SVG donut ring showing overall contract health score
// Theme-aware: uses ThemeContext colors for light/dark support

import React from 'react';
import type { HealthGrade } from '@/hooks/useContractHealth';

// =================================================================
// GRADE → COLOR MAP (uses Tailwind-compatible hex for SVG fill/stroke)
// =================================================================

const GRADE_COLORS: Record<HealthGrade, { stroke: string; bg: string }> = {
  excellent: { stroke: '#10b981', bg: '#ecfdf5' }, // emerald-500 / emerald-50
  good:      { stroke: '#3b82f6', bg: '#eff6ff' }, // blue-500 / blue-50
  warning:   { stroke: '#f59e0b', bg: '#fffbeb' }, // amber-500 / amber-50
  critical:  { stroke: '#ef4444', bg: '#fef2f2' }, // red-500 / red-50
};

// =================================================================
// PROPS
// =================================================================

interface HealthRingProps {
  /** Overall health score: 0–100 */
  score: number;
  /** Grade for color selection */
  grade: HealthGrade;
  /** SVG diameter in px (default: 120) */
  size?: number;
  /** Stroke width in px (default: 10) */
  strokeWidth?: number;
  /** Whether to animate on mount (default: true) */
  animated?: boolean;
  /** Additional CSS class */
  className?: string;
}

// =================================================================
// COMPONENT
// =================================================================

export const HealthRing: React.FC<HealthRingProps> = ({
  score,
  grade,
  size = 120,
  strokeWidth = 10,
  animated = true,
  className,
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.max(0, Math.min(100, score));
  const dashOffset = circumference - (progress / 100) * circumference;
  const center = size / 2;
  const colors = GRADE_COLORS[grade];

  return (
    <div className={className} style={{ width: size, height: size, position: 'relative' }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={{ transform: 'rotate(-90deg)' }}
      >
        {/* Background track */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-gray-200 dark:text-gray-700"
          opacity={0.3}
        />
        {/* Progress arc */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={colors.stroke}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          style={animated ? {
            transition: 'stroke-dashoffset 1s ease-out',
          } : undefined}
        />
      </svg>
      {/* Center label */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: size,
          height: size,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <span
          className="font-bold"
          style={{ fontSize: size * 0.28, color: colors.stroke, lineHeight: 1 }}
        >
          {score}
        </span>
        <span
          className="text-gray-500 dark:text-gray-400 font-medium"
          style={{ fontSize: size * 0.1, marginTop: 2 }}
        >
          / 100
        </span>
      </div>
    </div>
  );
};

export default HealthRing;
