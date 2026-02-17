// src/components/contracts/ContractHealthCard.tsx
// Composite card: HealthRing (overall score) + PillarBars (individual pillars)
// Accepts a role prop to show role-aware labels (e.g. "Your Service Health" vs "Contract Health")

import React from 'react';
import { Activity } from 'lucide-react';
import { HealthRing } from './HealthRing';
import { PillarBar } from './PillarBar';
import type { ContractHealthResult } from '@/hooks/useContractHealth';
import type { ContractRole } from '@/hooks/useContractRole';

// =================================================================
// ROLE-AWARE LABELS
// =================================================================

const CARD_TITLES: Record<ContractRole, string> = {
  seller: 'Service Health',
  buyer: 'Contract Health',
  viewer: 'Contract Health',
  unknown: 'Contract Health',
};

const CARD_SUBTITLES: Record<ContractRole, string> = {
  seller: 'How well are you delivering on this contract?',
  buyer: 'How well is this contract being fulfilled?',
  viewer: 'Overall contract health assessment',
  unknown: 'Overall contract health assessment',
};

// =================================================================
// PROPS
// =================================================================

interface ContractHealthCardProps {
  /** Health result from useContractHealth or computeContractHealth */
  health: ContractHealthResult;
  /** Current tenant's role on this contract */
  role?: ContractRole;
  /** Theme colors from ThemeContext */
  colors: any;
  /** Additional CSS class */
  className?: string;
}

// =================================================================
// COMPONENT
// =================================================================

export const ContractHealthCard: React.FC<ContractHealthCardProps> = ({
  health,
  role = 'unknown',
  colors,
  className,
}) => {
  const { overall, grade, gradeLabel, pillars } = health;
  const title = CARD_TITLES[role];
  const subtitle = CARD_SUBTITLES[role];

  if (pillars.length === 0) return null;

  return (
    <div
      className={`rounded-xl shadow-md border overflow-hidden ${className ?? ''}`}
      style={{
        backgroundColor: colors.utility.secondaryBackground,
        borderColor: colors.utility.primaryText + '15',
      }}
    >
      {/* Header */}
      <div
        className="px-5 py-3 border-b flex items-center gap-2"
        style={{ borderColor: colors.utility.primaryText + '10' }}
      >
        <Activity className="h-4 w-4" style={{ color: colors.brand.primary }} />
        <div>
          <h3 className="text-sm font-bold" style={{ color: colors.utility.primaryText }}>
            {title}
          </h3>
        </div>
      </div>

      {/* Body */}
      <div className="p-5">
        {/* Subtitle */}
        <p className="text-[11px] mb-4" style={{ color: colors.utility.secondaryText }}>
          {subtitle}
        </p>

        {/* Ring + Grade label */}
        <div className="flex flex-col items-center mb-5">
          <HealthRing score={overall} grade={grade} size={110} strokeWidth={9} />
          <span
            className="mt-2 text-xs font-semibold px-2.5 py-0.5 rounded-full"
            style={{
              color: colors.utility.primaryText,
              backgroundColor: colors.utility.primaryText + '08',
            }}
          >
            {gradeLabel}
          </span>
        </div>

        {/* Pillar bars */}
        <div className="space-y-3">
          {pillars.map((pillar) => (
            <PillarBar
              key={pillar.id}
              label={pillar.label}
              score={pillar.score}
              grade={pillar.grade}
              issueCount={pillar.issues.length}
            />
          ))}
        </div>

        {/* Issue count summary */}
        {(() => {
          const totalIssues = pillars.reduce((sum, p) => sum + p.issues.length, 0);
          if (totalIssues === 0) return null;
          return (
            <div
              className="mt-4 pt-3 border-t text-center"
              style={{ borderColor: colors.utility.primaryText + '08' }}
            >
              <span className="text-[11px]" style={{ color: colors.utility.secondaryText }}>
                {totalIssues} actionable item{totalIssues > 1 ? 's' : ''} found
              </span>
            </div>
          );
        })()}
      </div>
    </div>
  );
};

export default ContractHealthCard;
