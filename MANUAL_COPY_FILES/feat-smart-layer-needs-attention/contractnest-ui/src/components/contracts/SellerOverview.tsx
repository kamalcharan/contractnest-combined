// src/components/contracts/SellerOverview.tsx
// Seller Overview tab — Health card (left) + Smart Layer (right) + Dual Track (full width)
// Smart Layer replaces old static NeedsAttentionPanel with guided workflow

import React from 'react';
import ContractHealthCard from './ContractHealthCard';
import NeedsAttentionPanel from './NeedsAttentionPanel';
import DualTrackPreview from './DualTrackPreview';
import type { ContractHealthResult } from '@/hooks/useContractHealth';
import type { ContractRole } from '@/hooks/useContractRole';
import type { Contract, InvoiceSummary } from '@/types/contracts';

// =================================================================
// PROPS
// =================================================================

export interface SellerOverviewProps {
  contractId: string;
  contract?: Contract | null;
  currency: string;
  health: ContractHealthResult;
  role: ContractRole;
  pageSummary?: InvoiceSummary | null;
  colors: any;
  onViewFullTimeline?: () => void;
  /** Smart layer action callbacks */
  onSendInvoice?: (channel?: 'email' | 'whatsapp') => void;
  onRecordPayment?: () => void;
  onResend?: () => void;
  onResendSignoff?: () => void;
  onAssignTeam?: () => void;
  onReviewTasks?: () => void;
  onFollowUp?: () => void;
}

// =================================================================
// COMPONENT
// =================================================================

export const SellerOverview: React.FC<SellerOverviewProps> = ({
  contractId,
  contract,
  currency,
  health,
  role,
  pageSummary,
  colors,
  onViewFullTimeline,
  onSendInvoice,
  onRecordPayment,
  onResend,
  onResendSignoff,
  onAssignTeam,
  onReviewTasks,
  onFollowUp,
}) => {
  const isPendingAcceptance = contract?.status === 'pending_acceptance';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Row 1: Health Card (left) + Smart Layer (right) */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <ContractHealthCard health={health} role={role} colors={colors} />
        <NeedsAttentionPanel
          contractId={contractId}
          contract={contract}
          pageSummary={pageSummary}
          colors={colors}
          onSendInvoice={onSendInvoice}
          onRecordPayment={onRecordPayment}
          onResend={onResend}
          onResendSignoff={onResendSignoff}
          onAssignTeam={onAssignTeam}
          onReviewTasks={onReviewTasks}
          onFollowUp={onFollowUp}
        />
      </div>

      {/* Row 2: Dual-Track Timeline Preview (full width) — only for active contracts */}
      {!isPendingAcceptance && (
        <DualTrackPreview
          contractId={contractId}
          currency={currency}
          colors={colors}
          onViewFullTimeline={onViewFullTimeline}
        />
      )}
    </div>
  );
};

export default SellerOverview;
