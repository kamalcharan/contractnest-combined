// src/components/contracts/list/PortfolioSummaryStrip.tsx
// Portfolio-level aggregate metrics strip for the contract list header

import React from 'react';
import type { ContractPortfolioStats } from '@/types/contracts';

interface PortfolioSummaryStripProps {
  stats: ContractPortfolioStats | undefined;
  totalValue: number;
  currency?: string;
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

const PortfolioSummaryStrip: React.FC<PortfolioSummaryStripProps> = ({
  stats,
  totalValue,
  currency,
  colors,
}) => {
  const collected = stats?.total_collected ?? 0;
  const outstanding = stats?.outstanding ?? 0;
  const avgHealth = stats?.avg_health_score ?? 0;
  const needsAttention = stats?.needs_attention_count ?? 0;
  const overdueEvents = stats?.total_overdue_events ?? 0;

  const healthColor =
    avgHealth >= 70
      ? colors.semantic.success
      : avgHealth >= 40
        ? colors.semantic.warning
        : colors.semantic.error;

  const cards = [
    {
      label: 'Portfolio Value',
      value: fmt(totalValue, currency),
      color: colors.utility.primaryText,
      bg: colors.utility.secondaryBackground,
    },
    {
      label: 'Collected',
      value: fmt(collected, currency),
      color: colors.semantic.success,
      bg: colors.semantic.success + '0a',
    },
    {
      label: 'Outstanding',
      value: fmt(outstanding, currency),
      color: outstanding > 0 ? colors.semantic.error : colors.semantic.success,
      bg: outstanding > 0 ? colors.semantic.error + '08' : colors.semantic.success + '0a',
    },
    {
      label: 'Avg Health',
      value: String(avgHealth),
      color: healthColor,
      bg: colors.utility.secondaryBackground,
    },
    {
      label: 'Needs Attention',
      value: String(needsAttention),
      color: needsAttention > 0 ? colors.semantic.error : colors.semantic.success,
      bg: needsAttention > 0 ? colors.semantic.error + '08' : colors.semantic.success + '0a',
    },
    {
      label: 'Overdue Tasks',
      value: String(overdueEvents),
      color: overdueEvents > 0 ? colors.semantic.error : colors.semantic.success,
      bg: overdueEvents > 0 ? colors.semantic.error + '08' : colors.semantic.success + '0a',
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
            {card.value}
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

export default PortfolioSummaryStrip;
