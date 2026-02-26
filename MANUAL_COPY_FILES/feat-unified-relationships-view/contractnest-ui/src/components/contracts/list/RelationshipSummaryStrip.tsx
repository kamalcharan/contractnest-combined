// src/components/contracts/list/RelationshipSummaryStrip.tsx
// Portfolio-level aggregate metrics strip for the unified Relationships list header.
// Shows: Total Relationships, Total Contracts, Portfolio Value, Collected, Outstanding, Avg Health

import React from 'react';
import type { RelationshipPortfolioSummary } from '@/types/relationships';

interface RelationshipSummaryStripProps {
  summary: RelationshipPortfolioSummary | undefined;
  isLoading: boolean;
  colors: {
    brand: { primary: string };
    utility: { primaryText: string; secondaryText: string; secondaryBackground: string };
    semantic: { success: string; error: string; warning: string };
  };
}

const fmt = (n: number, currency?: string) => {
  if (currency === 'USD') return '$' + n.toLocaleString('en-US', { maximumFractionDigits: 0 });
  return '\u20B9' + n.toLocaleString('en-IN', { maximumFractionDigits: 0 });
};

const RelationshipSummaryStrip: React.FC<RelationshipSummaryStripProps> = ({
  summary,
  isLoading,
  colors,
}) => {
  const totalRelationships = summary?.totalRelationships ?? 0;
  const totalContracts = summary?.totalContracts ?? 0;
  const totalValue = summary?.totalValue ?? 0;
  const collected = summary?.totalCollected ?? 0;
  const outstanding = summary?.outstanding ?? 0;
  const avgHealth = summary?.avgHealth ?? 0;
  const needsAttention = summary?.needsAttention ?? 0;

  const healthColor =
    avgHealth >= 70
      ? colors.semantic.success
      : avgHealth >= 40
        ? colors.semantic.warning
        : colors.semantic.error;

  const cards = [
    {
      label: 'Relationships',
      value: String(totalRelationships),
      color: colors.brand.primary,
      bg: colors.brand.primary + '0a',
    },
    {
      label: 'Contracts',
      value: String(totalContracts),
      color: colors.utility.primaryText,
      bg: colors.utility.secondaryBackground,
    },
    {
      label: 'Portfolio Value',
      value: fmt(totalValue),
      color: colors.utility.primaryText,
      bg: colors.utility.secondaryBackground,
    },
    {
      label: 'Collected',
      value: fmt(collected),
      color: colors.semantic.success,
      bg: colors.semantic.success + '0a',
    },
    {
      label: 'Outstanding',
      value: fmt(outstanding),
      color: outstanding > 0 ? colors.semantic.error : colors.semantic.success,
      bg: outstanding > 0 ? colors.semantic.error + '08' : colors.semantic.success + '0a',
    },
    {
      label: 'Avg Health',
      value: String(avgHealth),
      color: healthColor,
      bg: colors.utility.secondaryBackground,
    },
  ];

  return (
    <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
      {cards.map((card, i) => (
        <div
          key={i}
          style={{
            flex: 1,
            padding: '12px 14px',
            borderRadius: 10,
            background: card.bg,
            border: `1px solid ${colors.utility.primaryText}10`,
            textAlign: 'center',
            transition: 'all 0.15s',
            opacity: isLoading ? 0.5 : 1,
          }}
        >
          <div
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 16,
              fontWeight: 700,
              color: card.color,
              lineHeight: 1.2,
            }}
          >
            {isLoading ? '...' : card.value}
          </div>
          <div
            style={{
              fontSize: 9,
              color: colors.utility.secondaryText,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: 0.8,
              marginTop: 3,
            }}
          >
            {card.label}
          </div>
        </div>
      ))}
    </div>
  );
};

export default RelationshipSummaryStrip;
