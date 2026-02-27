// src/components/contracts/NeedsAttentionPanel.tsx
// Seller Overview — Smart Layer powered by useNeedsAttention engine
// Shows guided stepper for pending_acceptance, operational alerts for active contracts
// Replaces the old static alert panel with JTD-backed, context-aware actions

import React from 'react';
import { useNeedsAttention } from '@/hooks/useNeedsAttention';
import type { SmartStep, SmartAction } from '@/hooks/useNeedsAttention';
import type { Contract, InvoiceSummary } from '@/types/contracts';

// =================================================================
// PROPS
// =================================================================

export interface NeedsAttentionPanelProps {
  contractId: string;
  contract?: Contract | null;
  pageSummary?: InvoiceSummary | null;
  colors: any;
  /** Callbacks wired from detail page */
  onSendInvoice?: (channel?: 'email' | 'whatsapp') => void;
  onRecordPayment?: () => void;
  onResend?: () => void;
  onResendSignoff?: () => void;
  onAssignTeam?: () => void;
  onReviewTasks?: () => void;
  onFollowUp?: () => void;
}

// =================================================================
// STYLE HELPERS
// =================================================================

const STEP_STYLES: Record<string, { bg: string; border: string; accent: string }> = {
  done:          { bg: '#f0fdf4', border: '#bbf7d0', accent: '#16a34a' },
  action_needed: { bg: '#fef2f2', border: '#fecaca', accent: '#ef4444' },
  locked:        { bg: '#f8fafc', border: '#e2e8f0', accent: '#94a3b8' },
  info:          { bg: '#eff6ff', border: '#bfdbfe', accent: '#3b82f6' },
};

const PRIORITY_BUTTON: Record<string, string> = {
  critical: '#ef4444',
  high:     '#f97316',
  medium:   '#f59e0b',
  info:     '#6b7280',
};

// =================================================================
// SUB-COMPONENTS
// =================================================================

const StepBadge: React.FC<{ state: string }> = ({ state }) => {
  const labels: Record<string, string> = {
    done: '\u2705 Done',
    action_needed: '\u26A0\uFE0F Action Needed',
    locked: '\uD83D\uDD12 Locked',
    info: '\u2139\uFE0F Info',
  };
  const style = STEP_STYLES[state] || STEP_STYLES.info;
  return (
    <span
      style={{
        fontSize: 10,
        fontWeight: 600,
        color: style.accent,
        background: style.bg,
        border: `1px solid ${style.border}`,
        borderRadius: 6,
        padding: '2px 8px',
        whiteSpace: 'nowrap' as const,
      }}
    >
      {labels[state] || state}
    </span>
  );
};

const ActionButton: React.FC<{
  action: SmartAction;
  priority: string;
  onAction: (action: SmartAction) => void;
}> = ({ action, priority, onAction }) => {
  return (
    <button
      onClick={() => onAction(action)}
      style={{
        padding: '5px 12px',
        borderRadius: 7,
        border: 'none',
        background: PRIORITY_BUTTON[priority] || '#6b7280',
        color: '#fff',
        fontSize: 11,
        fontWeight: 600,
        cursor: 'pointer',
        whiteSpace: 'nowrap' as const,
      }}
    >
      {action.label}
    </button>
  );
};

const StepCard: React.FC<{
  step: SmartStep;
  stepNumber?: number;
  onAction: (action: SmartAction) => void;
  colors: any;
}> = ({ step, stepNumber, onAction, colors }) => {
  const style = STEP_STYLES[step.state] || STEP_STYLES.info;
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column' as const,
        gap: 8,
        padding: '12px 14px',
        borderRadius: 12,
        background: style.bg,
        border: `1px solid ${style.border}`,
        opacity: step.state === 'locked' ? 0.7 : 1,
      }}
    >
      {/* Top row: icon + title + badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {stepNumber != null && (
          <span
            style={{
              width: 22,
              height: 22,
              borderRadius: '50%',
              background: style.accent,
              color: '#fff',
              fontSize: 11,
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            {step.state === 'done' ? '\u2713' : stepNumber}
          </span>
        )}
        <span style={{ fontSize: 20, flexShrink: 0 }}>{step.icon}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: colors.utility.primaryText }}>
            {step.title}
          </div>
          <div
            style={{
              fontSize: 11,
              color: colors.utility.secondaryText,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap' as const,
            }}
          >
            {step.description}
          </div>
        </div>
        <StepBadge state={step.state} />
      </div>

      {/* Aging info */}
      {step.aging && step.aging.label && (
        <div
          style={{
            fontSize: 11,
            color: step.aging.daysSinceSent != null && step.aging.daysSinceSent >= 7
              ? '#ef4444'
              : colors.utility.secondaryText,
            paddingLeft: stepNumber != null ? 32 : 30,
            fontStyle: 'italic',
          }}
        >
          {step.aging.label}
        </div>
      )}

      {/* Action buttons */}
      {step.actions.length > 0 && (
        <div style={{ display: 'flex', gap: 8, paddingLeft: stepNumber != null ? 32 : 30, flexWrap: 'wrap' as const }}>
          {step.actions.map((action) => (
            <ActionButton
              key={action.type}
              action={action}
              priority={step.priority}
              onAction={onAction}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// =================================================================
// MAIN COMPONENT
// =================================================================

export const NeedsAttentionPanel: React.FC<NeedsAttentionPanelProps> = ({
  contractId,
  contract,
  pageSummary,
  colors,
  onSendInvoice,
  onRecordPayment,
  onResend,
  onResendSignoff,
  onAssignTeam,
  onReviewTasks,
  onFollowUp,
}) => {
  const { now, locked, completed, isLoading } = useNeedsAttention(contract, 'seller');

  const totalItems = now.length + locked.length + completed.length;
  const isPendingAcceptance = contract?.status === 'pending_acceptance';

  // ── Action dispatcher ──
  const handleAction = (action: SmartAction) => {
    switch (action.type) {
      case 'send_invoice':
        onSendInvoice?.(action.channel);
        break;
      case 'record_payment':
        onRecordPayment?.();
        break;
      case 'resend':
        onResend?.();
        break;
      case 'resend_signoff':
        onResendSignoff?.();
        break;
      case 'assign_team':
        onAssignTeam?.();
        break;
      case 'review_tasks':
        onReviewTasks?.();
        break;
      case 'follow_up':
        onFollowUp?.();
        break;
    }
  };

  return (
    <div
      style={{
        background: colors.utility.secondaryBackground,
        borderRadius: 16,
        border: `1px solid ${colors.utility.primaryText}15`,
        padding: 24,
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 15 }}>{'\u26A1'}</span>
          <span
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: colors.utility.primaryText,
              letterSpacing: 0.5,
              textTransform: 'uppercase' as const,
            }}
          >
            {isPendingAcceptance ? 'Contract Actions' : 'Needs Attention'}
          </span>
          {totalItems > 0 && (
            <span
              style={{
                background: now.length > 0 ? '#fef2f2' : colors.utility.primaryText + '10',
                color: now.length > 0 ? '#ef4444' : colors.utility.secondaryText,
                fontSize: 11,
                fontWeight: 600,
                padding: '2px 8px',
                borderRadius: 10,
              }}
            >
              {now.length > 0 ? `${now.length} action${now.length > 1 ? 's' : ''}` : totalItems}
            </span>
          )}
        </div>
      </div>

      {/* Loading state */}
      {isLoading && totalItems === 0 && (
        <div style={{ textAlign: 'center' as const, padding: '20px 0', color: colors.utility.secondaryText }}>
          <div style={{ fontSize: 11 }}>Loading...</div>
        </div>
      )}

      {/* Steps */}
      <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 10 }}>
        {/* NOW section — action required */}
        {now.length > 0 && (
          <>
            {isPendingAcceptance && now.length > 0 && (
              <div style={{ fontSize: 10, fontWeight: 700, color: '#ef4444', textTransform: 'uppercase' as const, letterSpacing: 0.5, marginBottom: -4 }}>
                {'\uD83D\uDD34'} Action Required
              </div>
            )}
            {now.map((step, idx) => (
              <StepCard
                key={step.id}
                step={step}
                stepNumber={isPendingAcceptance ? undefined : undefined}
                onAction={handleAction}
                colors={colors}
              />
            ))}
          </>
        )}

        {/* COMPLETED section — green checkmarks */}
        {completed.length > 0 && completed[0].id !== 'all_good' && (
          <>
            {isPendingAcceptance && (
              <div style={{ fontSize: 10, fontWeight: 700, color: '#16a34a', textTransform: 'uppercase' as const, letterSpacing: 0.5, marginTop: 4, marginBottom: -4 }}>
                {'\u2705'} Completed
              </div>
            )}
            {completed.map((step) => (
              <StepCard
                key={step.id}
                step={step}
                onAction={handleAction}
                colors={colors}
              />
            ))}
          </>
        )}

        {/* LOCKED section — greyed out */}
        {locked.length > 0 && (
          <>
            {isPendingAcceptance && (
              <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' as const, letterSpacing: 0.5, marginTop: 4, marginBottom: -4 }}>
                {'\uD83D\uDD12'} After {contract?.acceptance_method === 'manual' ? 'Payment' : 'Acceptance'}
              </div>
            )}
            {locked.map((step) => (
              <StepCard
                key={step.id}
                step={step}
                onAction={handleAction}
                colors={colors}
              />
            ))}
          </>
        )}

        {/* Empty state — only for active contracts with nothing to do */}
        {!isLoading && totalItems === 0 && (
          <div style={{ textAlign: 'center' as const, padding: '24px 0', color: '#10b981' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>{'\u2728'}</div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>All caught up!</div>
            <div style={{ fontSize: 11, color: colors.utility.secondaryText, marginTop: 4 }}>
              No urgent actions needed right now.
            </div>
          </div>
        )}

        {/* "All caught up" from engine (active contract, no issues) */}
        {completed.length === 1 && completed[0].id === 'all_good' && now.length === 0 && (
          <div style={{ textAlign: 'center' as const, padding: '24px 0', color: '#10b981' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>{'\u2728'}</div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>All caught up!</div>
            <div style={{ fontSize: 11, color: colors.utility.secondaryText, marginTop: 4 }}>
              No urgent actions needed right now.
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default NeedsAttentionPanel;
