// src/components/contracts/ContractHealthCard.tsx
// Composite card: HealthRing (left) + PillarBars (right) in horizontal layout
// + Contract Timeline row at bottom (start → end → prolongation)
// Role-aware title: seller sees "Health Diagnosis", buyer sees "Contract Health"

import React from 'react';
import { HealthRing } from './HealthRing';
import { PillarBar } from './PillarBar';
import type { ContractHealthResult } from '@/hooks/useContractHealth';
import type { ContractRole } from '@/hooks/useContractRole';
import type { Contract } from '@/types/contracts';

// =================================================================
// PILLAR ICON MAP
// =================================================================

const PILLAR_ICONS: Record<string, string> = {
  completeness: '\u270D\uFE0F',
  financial: '\uD83D\uDCB0',
  delivery: '\uD83D\uDD27',
  compliance: '\uD83D\uDCCB',
  evidence: '\uD83D\uDCF8',
  communication: '\uD83D\uDCAC',
  commitment: '\u270D\uFE0F',
};

// =================================================================
// ROLE-AWARE TITLES
// =================================================================

const CARD_TITLES: Record<ContractRole, string> = {
  seller: '\uD83D\uDC8A Health Diagnosis',
  buyer: '\uD83D\uDCCA Contract Health',
  viewer: '\uD83D\uDCCA Contract Health',
  unknown: '\uD83D\uDCCA Contract Health',
};

// =================================================================
// DATE HELPERS
// =================================================================

const addDuration = (start: Date, value: number, unit: string): Date => {
  const d = new Date(start);
  switch (unit) {
    case 'days':
      d.setDate(d.getDate() + value);
      break;
    case 'months':
      d.setMonth(d.getMonth() + value);
      break;
    case 'years':
      d.setFullYear(d.getFullYear() + value);
      break;
  }
  return d;
};

const fmtDate = (d: Date): string =>
  d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });

const fmtDuration = (value: number, unit: string): string => {
  if (!value) return '';
  const u = value === 1 ? unit.replace(/s$/, '') : unit;
  return `${value} ${u}`;
};

// =================================================================
// PROPS
// =================================================================

interface ContractHealthCardProps {
  /** Health result from useContractHealth */
  health: ContractHealthResult;
  /** Current tenant's role on this contract */
  role?: ContractRole;
  /** Theme colors from ThemeContext */
  colors: any;
  /** Contract data for timeline computation */
  contract?: Contract | null;
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
  contract,
  className,
}) => {
  const { overall, pillars } = health;
  const title = CARD_TITLES[role];

  if (pillars.length === 0) return null;

  // Compute timeline dates
  const startDate = contract?.start_date
    ? new Date(contract.start_date)
    : contract?.created_at
      ? new Date(contract.created_at)
      : null;

  const endDate = startDate && contract?.duration_value && contract?.duration_unit
    ? addDuration(startDate, contract.duration_value, contract.duration_unit)
    : null;

  const prolongationDate = endDate && contract?.grace_period_value && contract?.grace_period_unit && contract.grace_period_value > 0
    ? addDuration(endDate, contract.grace_period_value, contract.grace_period_unit)
    : null;

  // Progress percentage (how far through the contract we are)
  const now = new Date();
  let progressPct = 0;
  if (startDate && endDate) {
    const total = endDate.getTime() - startDate.getTime();
    const elapsed = now.getTime() - startDate.getTime();
    progressPct = total > 0 ? Math.min(100, Math.max(0, (elapsed / total) * 100)) : 0;
  }

  const hasTimeline = startDate && endDate;

  return (
    <div
      className={className}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 0,
        background: colors.utility.secondaryBackground,
        borderRadius: 16,
        border: `1px solid ${colors.utility.primaryText}15`,
        padding: 24,
      }}
    >
      {/* Top section: Ring + Pillars */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 28 }}>
        <HealthRing score={overall} />
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: colors.utility.primaryText,
              letterSpacing: 0.5,
              textTransform: 'uppercase' as const,
              marginBottom: 12,
            }}
          >
            {title}
          </div>
          {pillars.map((pillar) => (
            <PillarBar
              key={pillar.id}
              icon={PILLAR_ICONS[pillar.id] || '\uD83D\uDCCA'}
              label={pillar.label}
              score={pillar.score}
            />
          ))}
        </div>
      </div>

      {/* Timeline row */}
      {hasTimeline && (
        <div
          style={{
            marginTop: 16,
            paddingTop: 14,
            borderTop: `1px solid ${colors.utility.primaryText}10`,
          }}
        >
          {/* Progress bar */}
          <div
            style={{
              height: 4,
              borderRadius: 2,
              backgroundColor: colors.utility.primaryText + '12',
              position: 'relative' as const,
              marginBottom: 8,
            }}
          >
            <div
              style={{
                height: '100%',
                borderRadius: 2,
                width: `${progressPct}%`,
                backgroundColor: progressPct >= 100
                  ? colors.semantic?.warning || '#f59e0b'
                  : colors.brand.primary,
                transition: 'width 0.3s ease',
              }}
            />
            {/* Today marker */}
            {progressPct > 0 && progressPct < 100 && (
              <div
                style={{
                  position: 'absolute' as const,
                  left: `${progressPct}%`,
                  top: -3,
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  backgroundColor: colors.brand.primary,
                  border: `2px solid ${colors.utility.secondaryBackground}`,
                  transform: 'translateX(-50%)',
                }}
              />
            )}
          </div>

          {/* Date labels */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 600, color: colors.utility.primaryText }}>
                {fmtDate(startDate!)}
              </div>
              <div style={{ fontSize: 9, color: colors.utility.secondaryText }}>Start</div>
            </div>

            {/* Duration label in center */}
            <div style={{ textAlign: 'center' as const }}>
              <div style={{ fontSize: 10, color: colors.utility.secondaryText }}>
                {fmtDuration(contract!.duration_value!, contract!.duration_unit!)}
              </div>
            </div>

            <div style={{ textAlign: 'right' as const }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: colors.utility.primaryText }}>
                {fmtDate(endDate!)}
              </div>
              <div style={{ fontSize: 9, color: colors.utility.secondaryText }}>
                End
                {prolongationDate && (
                  <span style={{ color: colors.semantic?.warning || '#f59e0b' }}>
                    {' '}+{fmtDuration(contract!.grace_period_value!, contract!.grace_period_unit!)}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContractHealthCard;
