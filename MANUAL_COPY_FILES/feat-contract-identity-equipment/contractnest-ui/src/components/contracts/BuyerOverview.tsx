// src/components/contracts/BuyerOverview.tsx
// Buyer Overview tab — Health card (left) + Smart Layer (right) + Quick Actions (full width)
// Smart Layer shows guided steps for pending_acceptance, activity for active contracts

import React from 'react';
import ContractHealthCard from './ContractHealthCard';
import WhatsHappeningPanel from './WhatsHappeningPanel';
import QuickActionsGrid from './QuickActionsGrid';
import type { ContractHealthResult } from '@/hooks/useContractHealth';
import type { ContractRole } from '@/hooks/useContractRole';
import type { Contract, InvoiceSummary } from '@/types/contracts';

// =================================================================
// PROPS
// =================================================================

export interface BuyerOverviewProps {
  contractId: string;
  contract?: Contract | null;
  currency: string;
  health: ContractHealthResult;
  role: ContractRole;
  pageSummary?: InvoiceSummary | null;
  colors: any;
  onViewContract?: () => void;
  onMessageSeller?: () => void;
  onMakePayment?: () => void;
  onViewEvidence?: () => void;
  onRequestService?: () => void;
  onDownloadPdf?: () => void;
}

// =================================================================
// COMPONENT
// =================================================================

export const BuyerOverview: React.FC<BuyerOverviewProps> = ({
  contractId,
  contract,
  currency,
  health,
  role,
  pageSummary,
  colors,
  onViewContract,
  onMessageSeller,
  onMakePayment,
  onViewEvidence,
  onRequestService,
  onDownloadPdf,
}) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Row 1: Health Card (left) + What's Happening / Smart Layer (right) */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <ContractHealthCard health={health} role={role} colors={colors} contract={contract} />
        <WhatsHappeningPanel
          contractId={contractId}
          contract={contract}
          pageSummary={pageSummary}
          colors={colors}
          onMakePayment={onMakePayment}
        />
      </div>

      {/* Row 2: Quick Actions Grid (full width) */}
      <QuickActionsGrid
        colors={colors}
        onViewContract={onViewContract}
        onMessageSeller={onMessageSeller}
        onMakePayment={onMakePayment}
        onViewEvidence={onViewEvidence}
        onRequestService={onRequestService}
        onDownloadPdf={onDownloadPdf}
      />
    </div>
  );
};

export default BuyerOverview;
