// src/components/subscription/data-viz/DataProgressBar.tsx
// Segmented progress bar for data visualization

import React from 'react';
import { useTheme } from '../../../contexts/ThemeContext';

interface DataSegment {
  label: string;
  value: number;
  color: string;
}

interface DataProgressBarProps {
  segments: DataSegment[];
  total?: number;
  height?: number;
  showLabels?: boolean;
  showValues?: boolean;
  animated?: boolean;
  className?: string;
}

export const DataProgressBar: React.FC<DataProgressBarProps> = ({
  segments,
  total,
  height = 8,
  showLabels = false,
  showValues = true,
  animated = true,
  className = ''
}) => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  const computedTotal = total || segments.reduce((acc, seg) => acc + seg.value, 0);

  // Calculate percentages
  const segmentsWithPercent = segments.map(seg => ({
    ...seg,
    percent: computedTotal > 0 ? (seg.value / computedTotal) * 100 : 0
  }));

  return (
    <div className={className}>
      {/* Labels */}
      {showLabels && (
        <div className="flex items-center justify-between mb-2 text-xs">
          {segmentsWithPercent.map((seg, index) => (
            <div key={index} className="flex items-center gap-1.5">
              <div
                className="w-2 h-2 rounded-full"
                style={{ background: seg.color }}
              />
              <span style={{ color: colors.utility.secondaryText }}>
                {seg.label}
              </span>
              {showValues && (
                <span className="font-medium" style={{ color: colors.utility.primaryText }}>
                  {seg.value.toLocaleString()}
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Progress Bar */}
      <div
        className="rounded-full overflow-hidden flex"
        style={{
          height: `${height}px`,
          background: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'
        }}
      >
        {segmentsWithPercent.map((seg, index) => (
          <div
            key={index}
            className={`h-full ${animated ? 'transition-all duration-700 ease-out' : ''}`}
            style={{
              width: `${seg.percent}%`,
              background: seg.color,
              marginLeft: index > 0 ? '1px' : 0
            }}
            title={`${seg.label}: ${seg.value.toLocaleString()} (${seg.percent.toFixed(1)}%)`}
          />
        ))}
      </div>

      {/* Inline values */}
      {!showLabels && showValues && (
        <div className="flex items-center gap-3 mt-2 flex-wrap">
          {segmentsWithPercent.map((seg, index) => (
            <div key={index} className="flex items-center gap-1.5 text-xs">
              <div
                className="w-2 h-2 rounded-full"
                style={{ background: seg.color }}
              />
              <span style={{ color: colors.utility.secondaryText }}>
                {seg.label}: <span className="font-medium">{seg.percent.toFixed(0)}%</span>
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DataProgressBar;
