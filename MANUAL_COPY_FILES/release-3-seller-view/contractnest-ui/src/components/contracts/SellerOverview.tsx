// src/components/contracts/SellerOverview.tsx
// Seller Overview tab — Health card (left) + Needs Attention (right) + Dual Track (full width)

import React from 'react';
import ContractHealthCard from './ContractHealthCard';
import NeedsAttentionPanel from './NeedsAttentionPanel';
import DualTrackPreview from './DualTrackPreview';
import type { ContractHealthResult } from '@/hooks/useContractHealth';
import type { ContractRole } from '@/hooks/useContractRole';
import type { InvoiceSummary } from '@/types/contracts';

// =================================================================
// PROPS
// =================================================================

export interface SellerOverviewProps {
  contractId: string;
  currency: string;
  health: ContractHealthResult;
  role: ContractRole;
  pageSummary?: InvoiceSummary | null;
  colors: any;
  onViewFullTimeline?: () => void;
}

// =================================================================
// COMPONENT
// =================================================================

export const SellerOverview: React.FC<SellerOverviewProps> = ({
  contractId,
  currency,
  health,
  role,
  pageSummary,
  colors,
  onViewFullTimeline,
}) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Row 1: Health Card (left) + Needs Attention (right) */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <ContractHealthCard health={health} role={role} colors={colors} />
        <NeedsAttentionPanel
          contractId={contractId}
          pageSummary={pageSummary}
          colors={colors}
        />
      </div>

      {/* Row 2: Dual-Track Timeline Preview (full width) */}
      <DualTrackPreview
        contractId={contractId}
        currency={currency}
        colors={colors}
        onViewFullTimeline={onViewFullTimeline}
      />
    </div>
  );
};

export default SellerOverview;
