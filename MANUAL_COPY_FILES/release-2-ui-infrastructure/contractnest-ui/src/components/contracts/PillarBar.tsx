// src/components/contracts/PillarBar.tsx
// Individual pillar bar for the Contract Health Card
// Shows pillar label, score, grade color, and a horizontal progress bar

import React from 'react';
import type { HealthGrade } from '@/hooks/useContractHealth';

// =================================================================
// GRADE → TAILWIND CLASSES
// =================================================================

const GRADE_BAR_COLORS: Record<HealthGrade, { bar: string; track: string; text: string }> = {
  excellent: {
    bar: 'bg-emerald-500',
    track: 'bg-emerald-100 dark:bg-emerald-900/30',
    text: 'text-emerald-600 dark:text-emerald-400',
  },
  good: {
    bar: 'bg-blue-500',
    track: 'bg-blue-100 dark:bg-blue-900/30',
    text: 'text-blue-600 dark:text-blue-400',
  },
  warning: {
    bar: 'bg-amber-500',
    track: 'bg-amber-100 dark:bg-amber-900/30',
    text: 'text-amber-600 dark:text-amber-400',
  },
  critical: {
    bar: 'bg-red-500',
    track: 'bg-red-100 dark:bg-red-900/30',
    text: 'text-red-600 dark:text-red-400',
  },
};

// =================================================================
// PROPS
// =================================================================

interface PillarBarProps {
  /** Pillar label (e.g. "Completeness", "Financial") */
  label: string;
  /** Pillar score: 0–100 */
  score: number;
  /** Grade for color coding */
  grade: HealthGrade;
  /** Number of issues in this pillar (shown as a count) */
  issueCount?: number;
  /** Whether to animate the bar on mount (default: true) */
  animated?: boolean;
  /** Additional CSS class */
  className?: string;
}

// =================================================================
// COMPONENT
// =================================================================

export const PillarBar: React.FC<PillarBarProps> = ({
  label,
  score,
  grade,
  issueCount = 0,
  animated = true,
  className,
}) => {
  const colors = GRADE_BAR_COLORS[grade];
  const clampedScore = Math.max(0, Math.min(100, score));

  return (
    <div className={className}>
      {/* Label row */}
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
          {label}
        </span>
        <div className="flex items-center gap-1.5">
          {issueCount > 0 && (
            <span className="text-[10px] text-gray-400 dark:text-gray-500">
              {issueCount} issue{issueCount > 1 ? 's' : ''}
            </span>
          )}
          <span className={`text-xs font-bold ${colors.text}`}>
            {clampedScore}
          </span>
        </div>
      </div>
      {/* Progress bar */}
      <div className={`h-2 rounded-full overflow-hidden ${colors.track}`}>
        <div
          className={`h-full rounded-full ${colors.bar}`}
          style={{
            width: `${clampedScore}%`,
            transition: animated ? 'width 0.8s ease-out' : undefined,
          }}
        />
      </div>
    </div>
  );
};

export default PillarBar;
