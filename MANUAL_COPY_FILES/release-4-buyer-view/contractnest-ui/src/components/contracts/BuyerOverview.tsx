// src/components/contracts/BuyerOverview.tsx
// Buyer Overview tab — Health card (left) + What's Happening (right) + Quick Actions (full width)
// Mirrors SellerOverview layout pattern but with buyer-focused panels

import React from 'react';
import ContractHealthCard from './ContractHealthCard';
import WhatsHappeningPanel from './WhatsHappeningPanel';
import QuickActionsGrid from './QuickActionsGrid';
import type { ContractHealthResult } from '@/hooks/useContractHealth';
import type { ContractRole } from '@/hooks/useContractRole';
import type { InvoiceSummary } from '@/types/contracts';

// =================================================================
// PROPS
// =================================================================

export interface BuyerOverviewProps {
  contractId: string;
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
      {/* Row 1: Health Card (left) + What's Happening (right) */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <ContractHealthCard health={health} role={role} colors={colors} />
        <WhatsHappeningPanel
          contractId={contractId}
          pageSummary={pageSummary}
          colors={colors}
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
