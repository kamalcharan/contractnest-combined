// src/components/contracts/ContractHealthCard.tsx
// Composite card: HealthRing (left) + PillarBars (right) in horizontal layout
// Role-aware title: seller sees "Health Diagnosis", buyer sees "Contract Health"

import React from 'react';
import { HealthRing } from './HealthRing';
import { PillarBar } from './PillarBar';
import type { ContractHealthResult } from '@/hooks/useContractHealth';
import type { ContractRole } from '@/hooks/useContractRole';

// =================================================================
// PILLAR ICON MAP
// =================================================================

const PILLAR_ICONS: Record<string, string> = {
  completeness: '✍️',
  financial: '💰',
  delivery: '🔧',
  compliance: '📋',
  evidence: '📸',
  communication: '💬',
  commitment: '✍️',
};

// =================================================================
// ROLE-AWARE TITLES
// =================================================================

const CARD_TITLES: Record<ContractRole, string> = {
  seller: '💊 Health Diagnosis',
  buyer: '📊 Contract Health',
  viewer: '📊 Contract Health',
  unknown: '📊 Contract Health',
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
  const { overall, pillars } = health;
  const title = CARD_TITLES[role];

  if (pillars.length === 0) return null;

  return (
    <div
      className={className}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 28,
        background: colors.utility.secondaryBackground,
        borderRadius: 16,
        border: `1px solid ${colors.utility.primaryText}15`,
        padding: 24,
      }}
    >
      <HealthRing score={overall} />
      <div style={{ flex: 1 }}>
        <div
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: colors.utility.primaryText,
            letterSpacing: 0.5,
            textTransform: 'uppercase',
            marginBottom: 12,
          }}
        >
          {title}
        </div>
        {pillars.map((pillar) => (
          <PillarBar
            key={pillar.id}
            icon={PILLAR_ICONS[pillar.id] || '📊'}
            label={pillar.label}
            score={pillar.score}
          />
        ))}
      </div>
    </div>
  );
};

export default ContractHealthCard;
