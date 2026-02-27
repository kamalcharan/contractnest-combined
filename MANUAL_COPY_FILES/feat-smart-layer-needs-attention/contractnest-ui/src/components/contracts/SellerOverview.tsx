// src/components/contracts/SellerOverview.tsx
// Seller Overview tab — Health card (left) + Smart Layer (full width below)
// Smart Layer REPLACES DualTrackPreview — it IS the intelligence layer now

import React from 'react';
import ContractHealthCard from './ContractHealthCard';
import NeedsAttentionPanel from './NeedsAttentionPanel';
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
          onViewFullTimeline={onViewFullTimeline}
        />
      </div>
    </div>
  );
};

export default SellerOverview;
