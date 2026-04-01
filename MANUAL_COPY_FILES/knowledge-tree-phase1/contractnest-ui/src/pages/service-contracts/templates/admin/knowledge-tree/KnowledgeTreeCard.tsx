// src/pages/service-contracts/templates/admin/knowledge-tree/KnowledgeTreeCard.tsx
// Card component for the Knowledge Trees grid — shows built/gap status per equipment

import React from 'react';
import {
  TreePine,
  CheckCircle2,
  AlertCircle,
  Wrench,
  Package,
  ClipboardCheck,
  RefreshCw,
  ChevronRight,
} from 'lucide-react';
import type { KnowledgeTreeCoverageItem } from './types';

export interface KnowledgeTreeCardProps {
  id: string;
  name: string;
  subCategory: string;
  scope: string;
  coverage: KnowledgeTreeCoverageItem | null;
  colors: any;
  compact?: boolean;
  onView?: (id: string) => void;
  onBuild?: (id: string) => void;
}

const KnowledgeTreeCard: React.FC<KnowledgeTreeCardProps> = ({
  id,
  name,
  subCategory,
  scope,
  coverage,
  colors,
  compact = false,
  onView,
  onBuild,
}) => {
  const isBuilt = coverage && coverage.variants_count > 0;

  if (compact) {
    // ── List view ──
    return (
      <div
        className="flex items-center justify-between p-4 rounded-xl border transition-all hover:-translate-y-0.5 hover:shadow-md cursor-pointer"
        style={{
          backgroundColor: colors.utility.secondaryBackground,
          borderColor: isBuilt
            ? colors.semantic.success + '30'
            : colors.utility.secondaryText + '15',
        }}
        onClick={() => isBuilt ? onView?.(id) : onBuild?.(id)}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{
              backgroundColor: isBuilt
                ? colors.semantic.success + '15'
                : colors.utility.secondaryText + '10',
              color: isBuilt ? colors.semantic.success : colors.utility.secondaryText,
            }}
          >
            {isBuilt ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          </div>
          <div className="min-w-0">
            <div className="font-semibold text-sm truncate" style={{ color: colors.utility.primaryText }}>
              {name}
            </div>
            <div className="text-xs truncate" style={{ color: colors.utility.secondaryText }}>
              {subCategory}
            </div>
          </div>
        </div>
        {isBuilt && coverage ? (
          <div className="flex items-center gap-4 text-xs flex-shrink-0" style={{ color: colors.utility.secondaryText }}>
            <span>{coverage.variants_count} variants</span>
            <span>{coverage.spare_parts_count} parts</span>
            <span>{coverage.checkpoints_count} checkpoints</span>
            <ChevronRight className="h-4 w-4" />
          </div>
        ) : (
          <span
            className="text-xs font-medium px-2.5 py-1 rounded-full flex-shrink-0"
            style={{
              backgroundColor: colors.semantic.error + '10',
              color: colors.semantic.error,
            }}
          >
            Gap
          </span>
        )}
      </div>
    );
  }

  // ── Grid view ──
  return (
    <div
      className="rounded-xl border overflow-hidden transition-all hover:-translate-y-1 hover:shadow-lg"
      style={{
        backgroundColor: colors.utility.secondaryBackground,
        borderColor: isBuilt
          ? colors.semantic.success + '30'
          : colors.utility.secondaryText + '15',
      }}
    >
      {/* Status bar */}
      <div
        className="px-4 py-2 flex items-center justify-between text-xs font-semibold"
        style={{
          backgroundColor: isBuilt ? colors.semantic.success + '10' : colors.semantic.error + '08',
          color: isBuilt ? colors.semantic.success : colors.semantic.error,
        }}
      >
        <div className="flex items-center gap-1.5">
          {isBuilt ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />}
          {isBuilt ? 'Built' : 'Gap — No Knowledge Tree'}
        </div>
        {scope === 'cross_industry' && (
          <span
            className="text-[10px] px-2 py-0.5 rounded-full font-medium"
            style={{
              backgroundColor: colors.brand.primary + '15',
              color: colors.brand.primary,
            }}
          >
            Cross-Industry
          </span>
        )}
      </div>

      {/* Body */}
      <div className="p-5">
        <div className="flex items-start gap-3 mb-4">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{
              backgroundColor: isBuilt ? colors.semantic.success + '12' : colors.utility.secondaryText + '08',
              color: isBuilt ? colors.semantic.success : colors.utility.secondaryText,
            }}
          >
            <TreePine className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h3
              className="font-bold text-[15px] leading-tight truncate"
              style={{ color: colors.utility.primaryText }}
            >
              {name}
            </h3>
            <p className="text-xs mt-0.5" style={{ color: colors.utility.secondaryText }}>
              {subCategory}
            </p>
          </div>
        </div>

        {isBuilt && coverage ? (
          <>
            {/* Stats row */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              <StatMini
                icon={<Wrench className="h-3 w-3" />}
                value={coverage.variants_count}
                label="Variants"
                colors={colors}
              />
              <StatMini
                icon={<Package className="h-3 w-3" />}
                value={coverage.spare_parts_count}
                label="Parts"
                colors={colors}
              />
              <StatMini
                icon={<ClipboardCheck className="h-3 w-3" />}
                value={coverage.checkpoints_count}
                label="Checkpoints"
                colors={colors}
              />
            </div>

            {/* Action */}
            <button
              onClick={() => onView?.(id)}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold transition-all hover:opacity-90"
              style={{
                backgroundColor: colors.semantic.success + '12',
                color: colors.semantic.success,
              }}
            >
              View Tree
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </>
        ) : (
          <>
            {/* Empty state */}
            <div
              className="text-center py-4 mb-4 rounded-lg border border-dashed"
              style={{
                borderColor: colors.utility.secondaryText + '20',
                color: colors.utility.secondaryText,
              }}
            >
              <RefreshCw className="h-5 w-5 mx-auto mb-1.5 opacity-40" />
              <p className="text-xs">No variants, parts, or checkpoints defined yet</p>
            </div>

            {/* Build action */}
            <button
              onClick={() => onBuild?.(id)}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold text-white transition-all hover:opacity-90 hover:shadow-md"
              style={{
                background: `linear-gradient(135deg, ${colors.brand.primary}, ${colors.brand.secondary || colors.brand.primary})`,
              }}
            >
              Build Tree
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </>
        )}
      </div>
    </div>
  );
};

// ── Mini stat for card ──────────────────────────────────────────────
const StatMini: React.FC<{
  icon: React.ReactNode;
  value: number;
  label: string;
  colors: any;
}> = ({ icon, value, label, colors }) => (
  <div
    className="text-center py-2 rounded-lg"
    style={{ backgroundColor: colors.utility.primaryBackground }}
  >
    <div className="flex items-center justify-center gap-1 mb-0.5" style={{ color: colors.utility.secondaryText }}>
      {icon}
    </div>
    <div className="text-lg font-bold font-mono leading-none" style={{ color: colors.utility.primaryText }}>
      {value}
    </div>
    <div className="text-[10px] mt-0.5" style={{ color: colors.utility.secondaryText }}>
      {label}
    </div>
  </div>
);

export default KnowledgeTreeCard;
