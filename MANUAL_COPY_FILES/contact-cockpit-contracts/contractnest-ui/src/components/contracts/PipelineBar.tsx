// src/components/contracts/PipelineBar.tsx
// Reusable horizontal status pipeline bar for contracts
import React from 'react';
import {
  FileText,
  Eye,
  Clock,
  CheckCircle,
  XCircle,
} from 'lucide-react';

// ═══════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════

export interface PipelineBarProps {
  statusCounts: Record<string, number>;
  activeStatus: string | null;
  onStatusClick: (status: string | null) => void;
  colors: any;
  /** Compact mode for smaller spaces (like Contact Cockpit) */
  compact?: boolean;
}

// ═══════════════════════════════════════════════════
// PIPELINE STAGES CONFIGURATION
// ═══════════════════════════════════════════════════

export const PIPELINE_STAGES = [
  { key: 'draft', label: 'Draft', icon: FileText, colorKey: 'secondaryText' },
  { key: 'pending_review', label: 'In Review', icon: Eye, colorKey: 'info' },
  { key: 'pending_acceptance', label: 'Pending', icon: Clock, colorKey: 'warning' },
  { key: 'active', label: 'Active', icon: CheckCircle, colorKey: 'success' },
  { key: 'completed', label: 'Completed', icon: CheckCircle, colorKey: 'success' },
  { key: 'expired', label: 'Expired', icon: XCircle, colorKey: 'error' },
];

// ═══════════════════════════════════════════════════
// HELPER: Get semantic color from theme
// ═══════════════════════════════════════════════════

export const getSemanticColor = (colorKey: string, colors: any): string => {
  switch (colorKey) {
    case 'success': return colors.semantic.success;
    case 'warning': return colors.semantic.warning;
    case 'error': return colors.semantic.error;
    case 'info': return colors.brand.secondary || colors.brand.primary;
    default: return colors.utility.secondaryText;
  }
};

// ═══════════════════════════════════════════════════
// PIPELINE BAR COMPONENT
// ═══════════════════════════════════════════════════

const PipelineBar: React.FC<PipelineBarProps> = ({
  statusCounts,
  activeStatus,
  onStatusClick,
  colors,
  compact = false,
}) => {
  // Filter stages to only show ones with counts > 0 in compact mode
  const visibleStages = compact
    ? PIPELINE_STAGES.filter(stage => (statusCounts[stage.key] || 0) > 0)
    : PIPELINE_STAGES;

  // If no contracts at all in compact mode, show nothing
  if (compact && visibleStages.length === 0) {
    return null;
  }

  return (
    <div
      style={{
        display: 'flex',
        gap: compact ? 4 : 2,
        borderRadius: compact ? 8 : 10,
        overflow: 'hidden',
        background: compact ? 'transparent' : colors.utility.secondaryBackground,
        border: compact ? 'none' : `1px solid ${colors.utility.primaryText}20`,
        flexWrap: compact ? 'wrap' : 'nowrap',
      }}
    >
      {/* All button for compact mode */}
      {compact && (
        <button
          onClick={() => onStatusClick(null)}
          style={{
            padding: compact ? '6px 12px' : '14px 12px',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            border: `1px solid ${activeStatus === null ? colors.brand.primary : colors.utility.primaryText + '20'}`,
            borderRadius: 20,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            background: activeStatus === null ? `${colors.brand.primary}15` : 'transparent',
            fontSize: 12,
            fontWeight: 600,
            color: activeStatus === null ? colors.brand.primary : colors.utility.secondaryText,
          }}
        >
          All
          <span style={{ opacity: 0.7 }}>
            {Object.values(statusCounts).reduce((a, b) => a + b, 0)}
          </span>
        </button>
      )}

      {visibleStages.map((stage) => {
        const count = statusCounts[stage.key] || 0;
        const isActive = activeStatus === stage.key;
        const stageColor = getSemanticColor(stage.colorKey, colors);
        const Icon = stage.icon;

        if (compact) {
          // Compact pill style
          return (
            <button
              key={stage.key}
              onClick={() => onStatusClick(isActive ? null : stage.key)}
              style={{
                padding: '6px 12px',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                border: `1px solid ${isActive ? stageColor : colors.utility.primaryText + '20'}`,
                borderRadius: 20,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                background: isActive ? `${stageColor}15` : 'transparent',
                fontSize: 12,
                fontWeight: 600,
                color: isActive ? stageColor : colors.utility.secondaryText,
              }}
            >
              {stage.label}
              <span style={{ opacity: 0.7 }}>{count}</span>
            </button>
          );
        }

        // Full pipeline bar style
        return (
          <button
            key={stage.key}
            onClick={() => onStatusClick(isActive ? null : stage.key)}
            style={{
              flex: 1,
              padding: '14px 12px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 4,
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              background: isActive ? `${stageColor}14` : 'transparent',
              borderBottom: `3px solid ${isActive ? stageColor : `${stageColor}30`}`,
              position: 'relative',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Icon size={14} style={{ color: stageColor, opacity: count > 0 ? 1 : 0.4 }} />
              <span
                style={{
                  fontSize: 20,
                  fontWeight: 700,
                  color: count > 0 ? stageColor : colors.utility.secondaryText,
                  lineHeight: 1,
                }}
              >
                {count}
              </span>
            </div>
            <span
              style={{
                fontSize: 10,
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                color: colors.utility.secondaryText,
              }}
            >
              {stage.label}
            </span>
          </button>
        );
      })}
    </div>
  );
};

export default PipelineBar;
