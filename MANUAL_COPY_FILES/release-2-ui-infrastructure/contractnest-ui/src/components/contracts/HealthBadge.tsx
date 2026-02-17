// src/components/contracts/HealthBadge.tsx
// Displays a contract's health score as a color-coded inline badge
// Uses the pillar-based useContractHealth hook

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useContractHealth, type HealthGrade } from '@/hooks/useContractHealth';
import type { Contract, ContractDetail, InvoiceSummary } from '@/types/contracts';
import type { ContractEvent } from '@/types/contractEvents';

// =================================================================
// STYLE MAP
// =================================================================

const GRADE_STYLES: Record<HealthGrade, { bg: string; text: string; border: string }> = {
  excellent: {
    bg: 'bg-emerald-50 dark:bg-emerald-950/40',
    text: 'text-emerald-700 dark:text-emerald-300',
    border: 'border-emerald-200 dark:border-emerald-800',
  },
  good: {
    bg: 'bg-blue-50 dark:bg-blue-950/40',
    text: 'text-blue-700 dark:text-blue-300',
    border: 'border-blue-200 dark:border-blue-800',
  },
  warning: {
    bg: 'bg-amber-50 dark:bg-amber-950/40',
    text: 'text-amber-700 dark:text-amber-300',
    border: 'border-amber-200 dark:border-amber-800',
  },
  critical: {
    bg: 'bg-red-50 dark:bg-red-950/40',
    text: 'text-red-700 dark:text-red-300',
    border: 'border-red-200 dark:border-red-800',
  },
};

// =================================================================
// PROPS
// =================================================================

interface HealthBadgeProps {
  /** Contract to compute health for */
  contract: Contract | ContractDetail | null | undefined;
  /** Optional events for delivery pillar scoring */
  events?: ContractEvent[] | null;
  /** Optional invoice summary for financial pillar scoring */
  invoiceSummary?: InvoiceSummary | null;
  /** Show the numeric score (default: true) */
  showScore?: boolean;
  /** Show the grade label (default: true) */
  showLabel?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Size variant */
  size?: 'sm' | 'md';
}

// =================================================================
// COMPONENT
// =================================================================

export const HealthBadge: React.FC<HealthBadgeProps> = ({
  contract,
  events,
  invoiceSummary,
  showScore = true,
  showLabel = true,
  className,
  size = 'sm',
}) => {
  const { overall, grade, gradeLabel, pillars } = useContractHealth({
    contract,
    events,
    invoiceSummary,
  });

  if (!contract) return null;

  const style = GRADE_STYLES[grade];
  const issueCount = pillars.reduce((sum, p) => sum + p.issues.length, 0);

  return (
    <Badge
      variant="outline"
      title={issueCount > 0 ? `${issueCount} issue${issueCount > 1 ? 's' : ''} found` : 'No issues'}
      className={cn(
        style.bg,
        style.text,
        style.border,
        size === 'sm' ? 'text-[10px] px-1.5 py-0' : 'text-xs px-2.5 py-0.5',
        'font-medium',
        className
      )}
    >
      {showScore && <span className="mr-1 font-bold">{overall}</span>}
      {showLabel && <span>{gradeLabel}</span>}
    </Badge>
  );
};

export default HealthBadge;
