// src/hooks/useContractHealth.ts
// Contract Health Engine — pillar-based scoring system
// Pure computation utility: contract + events + invoiceSummary → { overall, pillars[] }

import { useMemo } from 'react';
import type { Contract, ContractDetail, InvoiceSummary } from '@/types/contracts';
import type { ContractEvent } from '@/types/contractEvents';

// =================================================================
// TYPES
// =================================================================

export type HealthGrade = 'excellent' | 'good' | 'warning' | 'critical';
export type IssueSeverity = 'info' | 'warning' | 'critical';

export interface HealthIssue {
  field: string;
  message: string;
  severity: IssueSeverity;
}

export interface HealthPillar {
  /** Pillar identifier */
  id: string;
  /** Human-readable label */
  label: string;
  /** Score for this pillar: 0–100 */
  score: number;
  /** Grade derived from pillar score */
  grade: HealthGrade;
  /** Weight used in the overall calculation (sums to 1.0 across all pillars) */
  weight: number;
  /** Issues found in this pillar */
  issues: HealthIssue[];
}

export interface ContractHealthResult {
  /** Overall weighted health score: 0–100 */
  overall: number;
  /** Overall grade */
  grade: HealthGrade;
  /** Human-readable grade label */
  gradeLabel: string;
  /** Individual pillar scores */
  pillars: HealthPillar[];
}

// =================================================================
// CONSTANTS
// =================================================================

const GRADE_THRESHOLDS: { min: number; grade: HealthGrade; label: string }[] = [
  { min: 85, grade: 'excellent', label: 'Excellent' },
  { min: 65, grade: 'good', label: 'Good' },
  { min: 40, grade: 'warning', label: 'Needs Attention' },
  { min: 0, grade: 'critical', label: 'Critical' },
];

function scoreToGrade(score: number): HealthGrade {
  return GRADE_THRESHOLDS.find((t) => score >= t.min)!.grade;
}

function scoreToLabel(score: number): string {
  return GRADE_THRESHOLDS.find((t) => score >= t.min)!.label;
}

// =================================================================
// PILLAR SCORERS
// =================================================================

/**
 * Pillar 1: Completeness — are all required contract fields filled?
 */
function scoreCompleteness(contract: Contract | ContractDetail): HealthPillar {
  const issues: HealthIssue[] = [];
  let filled = 0;
  const checks = [
    { field: 'title', test: !!contract.title?.trim(), msg: 'Contract title is missing' },
    { field: 'description', test: !!contract.description?.trim(), msg: 'No description provided' },
    { field: 'contract_type', test: !!contract.contract_type, msg: 'Contract type is not set' },
    { field: 'buyer_name', test: !!contract.buyer_name?.trim(), msg: 'Buyer name is missing' },
    { field: 'buyer_email', test: !!contract.buyer_email?.trim(), msg: 'Buyer email is missing' },
    { field: 'total_value', test: (contract.total_value ?? 0) > 0, msg: 'Total value is not set' },
    { field: 'currency', test: !!contract.currency?.trim(), msg: 'Currency not specified' },
    { field: 'duration', test: (contract.duration_value ?? 0) > 0 && !!contract.duration_unit, msg: 'Duration not defined' },
    { field: 'acceptance_method', test: !!contract.acceptance_method, msg: 'Acceptance method not set' },
    {
      field: 'blocks',
      test: (() => {
        const d = contract as ContractDetail;
        return d.blocks ? d.blocks.length > 0 : (contract.blocks_count ?? 0) > 0;
      })(),
      msg: 'No service blocks added',
    },
  ];

  for (const c of checks) {
    if (c.test) {
      filled++;
    } else {
      issues.push({
        field: c.field,
        message: c.msg,
        severity: ['title', 'buyer_name', 'blocks'].includes(c.field) ? 'critical' : 'warning',
      });
    }
  }

  const score = Math.round((filled / checks.length) * 100);
  return { id: 'completeness', label: 'Completeness', score, grade: scoreToGrade(score), weight: 0.25, issues };
}

/**
 * Pillar 2: Financial — collection rate, invoice health
 */
function scoreFinancial(
  contract: Contract | ContractDetail,
  invoiceSummary?: InvoiceSummary | null,
): HealthPillar {
  const issues: HealthIssue[] = [];

  // If no financial data yet, base score on whether value is set
  if (!invoiceSummary || invoiceSummary.invoice_count === 0) {
    const hasValue = (contract.total_value ?? 0) > 0;
    const hasCurrency = !!contract.currency;
    const hasBilling = !!contract.billing_cycle_type;
    const hasPayment = !!contract.payment_mode;

    let score = 50; // Base: no invoices yet is neutral
    if (!hasValue) { score -= 20; issues.push({ field: 'total_value', message: 'No contract value set', severity: 'warning' }); }
    if (!hasCurrency) { score -= 5; issues.push({ field: 'currency', message: 'Currency not specified', severity: 'info' }); }
    if (!hasBilling) { score -= 10; issues.push({ field: 'billing_cycle', message: 'Billing cycle not configured', severity: 'info' }); }
    if (!hasPayment) { score -= 5; issues.push({ field: 'payment_mode', message: 'Payment mode not set', severity: 'info' }); }

    if (contract.status === 'draft') {
      // Draft contracts with no invoices are expected
      score = Math.max(score, 60);
    }

    return { id: 'financial', label: 'Financial', score: Math.max(0, score), grade: scoreToGrade(Math.max(0, score)), weight: 0.30, issues };
  }

  // Has invoices — score based on collection performance
  const collectionPct = invoiceSummary.collection_percentage ?? 0;
  let score = Math.round(collectionPct);

  if (invoiceSummary.overdue_count > 0) {
    const overdueRatio = invoiceSummary.overdue_count / invoiceSummary.invoice_count;
    score = Math.max(0, score - Math.round(overdueRatio * 30));
    issues.push({
      field: 'overdue',
      message: `${invoiceSummary.overdue_count} overdue invoice${invoiceSummary.overdue_count > 1 ? 's' : ''}`,
      severity: 'critical',
    });
  }

  if (invoiceSummary.total_balance > 0 && collectionPct < 50) {
    issues.push({
      field: 'collection',
      message: `Only ${Math.round(collectionPct)}% collected`,
      severity: 'warning',
    });
  }

  return { id: 'financial', label: 'Financial', score: Math.max(0, Math.min(100, score)), grade: scoreToGrade(Math.max(0, Math.min(100, score))), weight: 0.30, issues };
}

/**
 * Pillar 3: Delivery — event execution rate
 */
function scoreDelivery(
  contract: Contract | ContractDetail,
  events?: ContractEvent[] | null,
): HealthPillar {
  const issues: HealthIssue[] = [];

  if (!events || events.length === 0) {
    // No events — score based on contract status
    if (contract.status === 'draft' || contract.status === 'pending_review' || contract.status === 'pending_acceptance') {
      return { id: 'delivery', label: 'Delivery', score: 70, grade: 'good', weight: 0.30, issues: [] };
    }
    if (contract.status === 'active') {
      issues.push({ field: 'events', message: 'Active contract has no scheduled events', severity: 'warning' });
      return { id: 'delivery', label: 'Delivery', score: 40, grade: 'warning', weight: 0.30, issues };
    }
    return { id: 'delivery', label: 'Delivery', score: 50, grade: 'warning', weight: 0.30, issues };
  }

  const total = events.length;
  const completed = events.filter((e) => e.status === 'completed').length;
  const overdue = events.filter((e) => e.status === 'overdue').length;
  const cancelled = events.filter((e) => e.status === 'cancelled').length;

  const effective = total - cancelled;
  const completionRate = effective > 0 ? (completed / effective) * 100 : 0;

  let score = Math.round(completionRate);

  // Penalize overdue events
  if (overdue > 0) {
    const overdueRatio = overdue / effective;
    score = Math.max(0, score - Math.round(overdueRatio * 25));
    issues.push({
      field: 'overdue_events',
      message: `${overdue} overdue event${overdue > 1 ? 's' : ''}`,
      severity: 'critical',
    });
  }

  // Boost if all completed and no overdue
  if (completed === effective && effective > 0 && overdue === 0) {
    score = 100;
  }

  return { id: 'delivery', label: 'Delivery', score: Math.max(0, Math.min(100, score)), grade: scoreToGrade(Math.max(0, Math.min(100, score))), weight: 0.30, issues };
}

/**
 * Pillar 4: Compliance — seller_id, acceptance method, dual-persona readiness
 */
function scoreCompliance(contract: Contract | ContractDetail): HealthPillar {
  const issues: HealthIssue[] = [];
  let points = 0;
  const maxPoints = 4;

  // seller_id set
  if (contract.seller_id) {
    points++;
  } else {
    issues.push({ field: 'seller_id', message: 'Seller identity not set', severity: 'info' });
  }

  // acceptance_method set
  if (contract.acceptance_method) {
    points++;
  } else {
    issues.push({ field: 'acceptance_method', message: 'Acceptance method not configured', severity: 'warning' });
  }

  // Has buyer contact info
  if (contract.buyer_name && contract.buyer_email) {
    points++;
  } else {
    issues.push({ field: 'buyer_contact', message: 'Buyer contact info incomplete', severity: 'warning' });
  }

  // Has contract number
  if (contract.contract_number) {
    points++;
  } else {
    issues.push({ field: 'contract_number', message: 'Contract number missing', severity: 'info' });
  }

  const score = Math.round((points / maxPoints) * 100);
  return { id: 'compliance', label: 'Compliance', score, grade: scoreToGrade(score), weight: 0.15, issues };
}

// =================================================================
// MAIN COMPUTATION
// =================================================================

export interface ComputeHealthInput {
  contract: Contract | ContractDetail;
  events?: ContractEvent[] | null;
  invoiceSummary?: InvoiceSummary | null;
}

/**
 * Pure function: computes contract health from contract + events + invoiceSummary.
 *
 * Returns `{ overall, grade, gradeLabel, pillars[] }` where each pillar has its own
 * score (0–100), grade, weight, and issues list.
 *
 * Pillar weights: Completeness 25%, Financial 30%, Delivery 30%, Compliance 15% = 100%
 */
export function computeContractHealth(input: ComputeHealthInput): ContractHealthResult {
  const { contract, events, invoiceSummary } = input;

  const pillars: HealthPillar[] = [
    scoreCompleteness(contract),
    scoreFinancial(contract, invoiceSummary),
    scoreDelivery(contract, events),
    scoreCompliance(contract),
  ];

  // Weighted average
  const overall = Math.round(
    pillars.reduce((sum, p) => sum + p.score * p.weight, 0)
  );

  return {
    overall,
    grade: scoreToGrade(overall),
    gradeLabel: scoreToLabel(overall),
    pillars,
  };
}

// =================================================================
// REACT HOOK WRAPPER
// =================================================================

/**
 * React hook wrapping computeContractHealth with memoization.
 *
 * Usage:
 * ```tsx
 * const health = useContractHealth({ contract, events, invoiceSummary });
 * // health.overall, health.pillars, health.grade
 * ```
 */
export function useContractHealth(
  input: { contract: Contract | ContractDetail | null | undefined; events?: ContractEvent[] | null; invoiceSummary?: InvoiceSummary | null }
): ContractHealthResult {
  const { contract, events, invoiceSummary } = input;

  return useMemo<ContractHealthResult>(() => {
    if (!contract) {
      return {
        overall: 0,
        grade: 'critical',
        gradeLabel: 'Critical',
        pillars: [],
      };
    }
    return computeContractHealth({ contract, events, invoiceSummary });
  }, [contract, events, invoiceSummary]);
}

export default useContractHealth;
