// src/components/contracts/QuickActionsGrid.tsx
// Buyer Overview — Quick Actions grid
// 2x3 grid of buyer-relevant action buttons (visual placeholders wired to callbacks)

import React from 'react';
import {
  FileText,
  MessageSquare,
  CreditCard,
  Camera,
  PlusCircle,
  Download,
} from 'lucide-react';

// =================================================================
// PROPS
// =================================================================

export interface QuickActionsGridProps {
  colors: any;
  onViewContract?: () => void;
  onMessageSeller?: () => void;
  onMakePayment?: () => void;
  onViewEvidence?: () => void;
  onRequestService?: () => void;
  onDownloadPdf?: () => void;
}

// =================================================================
// ACTION DEFINITIONS
// =================================================================

interface QuickAction {
  icon: React.ElementType;
  label: string;
  description: string;
  iconColor: string;
  iconBg: string;
  handler?: () => void;
}

// =================================================================
// COMPONENT
// =================================================================

export const QuickActionsGrid: React.FC<QuickActionsGridProps> = ({
  colors,
  onViewContract,
  onMessageSeller,
  onMakePayment,
  onViewEvidence,
  onRequestService,
  onDownloadPdf,
}) => {
  const actions: QuickAction[] = [
    {
      icon: FileText,
      label: 'View Contract',
      description: 'Review full contract document',
      iconColor: '#3b82f6',
      iconBg: '#eff6ff',
      handler: onViewContract,
    },
    {
      icon: MessageSquare,
      label: 'Message Seller',
      description: 'Send a message to the seller',
      iconColor: '#8b5cf6',
      iconBg: '#faf5ff',
      handler: onMessageSeller,
    },
    {
      icon: CreditCard,
      label: 'Make Payment',
      description: 'Pay an outstanding invoice',
      iconColor: '#10b981',
      iconBg: '#f0fdf4',
      handler: onMakePayment,
    },
    {
      icon: Camera,
      label: 'View Evidence',
      description: 'See proof of work & uploads',
      iconColor: '#06b6d4',
      iconBg: '#ecfeff',
      handler: onViewEvidence,
    },
    {
      icon: PlusCircle,
      label: 'Request Service',
      description: 'Submit a new service request',
      iconColor: '#f59e0b',
      iconBg: '#fffbeb',
      handler: onRequestService,
    },
    {
      icon: Download,
      label: 'Download PDF',
      description: 'Download contract as PDF',
      iconColor: '#64748b',
      iconBg: '#f8fafc',
      handler: onDownloadPdf,
    },
  ];

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
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
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
          Quick Actions
        </span>
      </div>

      {/* 2x3 Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <button
              key={action.label}
              onClick={action.handler}
              disabled={!action.handler}
              style={{
                display: 'flex',
                flexDirection: 'column' as const,
                alignItems: 'center',
                gap: 8,
                padding: '16px 10px',
                borderRadius: 12,
                border: `1px solid ${colors.utility.primaryText}10`,
                background: 'transparent',
                cursor: action.handler ? 'pointer' : 'default',
                opacity: action.handler ? 1 : 0.6,
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                if (action.handler) {
                  (e.currentTarget as HTMLButtonElement).style.background = action.iconBg;
                  (e.currentTarget as HTMLButtonElement).style.borderColor = action.iconColor + '30';
                }
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                (e.currentTarget as HTMLButtonElement).style.borderColor = colors.utility.primaryText + '10';
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  background: action.iconBg,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Icon style={{ width: 20, height: 20, color: action.iconColor }} />
              </div>
              <div style={{ textAlign: 'center' as const }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: colors.utility.primaryText }}>
                  {action.label}
                </div>
                <div
                  style={{
                    fontSize: 10,
                    color: colors.utility.secondaryText,
                    marginTop: 2,
                    lineHeight: 1.3,
                  }}
                >
                  {action.description}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default QuickActionsGrid;
