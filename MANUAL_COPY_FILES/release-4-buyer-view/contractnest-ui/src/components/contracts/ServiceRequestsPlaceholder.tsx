// src/components/contracts/ServiceRequestsPlaceholder.tsx
// Buyer "Requests" tab — placeholder with empty state + New Request button
// Non-functional for now; wired for future implementation

import React from 'react';
import { PlusCircle, Inbox } from 'lucide-react';

// =================================================================
// PROPS
// =================================================================

export interface ServiceRequestsPlaceholderProps {
  colors: any;
  onNewRequest?: () => void;
}

// =================================================================
// COMPONENT
// =================================================================

export const ServiceRequestsPlaceholder: React.FC<ServiceRequestsPlaceholderProps> = ({
  colors,
  onNewRequest,
}) => {
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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Inbox style={{ width: 16, height: 16, color: colors.brand.primary }} />
          <span
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: colors.utility.primaryText,
              letterSpacing: 0.5,
              textTransform: 'uppercase' as const,
            }}
          >
            Service Requests
          </span>
        </div>
        <button
          onClick={onNewRequest}
          disabled={!onNewRequest}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '8px 16px',
            borderRadius: 10,
            border: 'none',
            background: colors.brand.primary,
            color: '#ffffff',
            fontSize: 12,
            fontWeight: 600,
            cursor: onNewRequest ? 'pointer' : 'default',
            opacity: onNewRequest ? 1 : 0.5,
            transition: 'opacity 0.15s ease',
          }}
        >
          <PlusCircle style={{ width: 14, height: 14 }} />
          New Request
        </button>
      </div>

      {/* Empty state */}
      <div
        style={{
          textAlign: 'center' as const,
          padding: '48px 24px',
          borderRadius: 12,
          border: `2px dashed ${colors.utility.primaryText}15`,
        }}
      >
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: 16,
            background: colors.brand.primary + '10',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
          }}
        >
          <Inbox style={{ width: 28, height: 28, color: colors.brand.primary + '60' }} />
        </div>
        <div style={{ fontSize: 16, fontWeight: 600, color: colors.utility.primaryText, marginBottom: 8 }}>
          No service requests yet
        </div>
        <div
          style={{
            fontSize: 13,
            color: colors.utility.secondaryText,
            maxWidth: 360,
            margin: '0 auto',
            lineHeight: 1.5,
          }}
        >
          When you need additional services, changes, or support from the seller,
          submit a request here. You'll be able to track its status and communicate directly.
        </div>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            padding: '6px 14px',
            borderRadius: 20,
            background: colors.brand.primary + '12',
            color: colors.brand.primary,
            fontSize: 11,
            fontWeight: 600,
            marginTop: 16,
          }}
        >
          Coming Soon
        </div>
      </div>
    </div>
  );
};

export default ServiceRequestsPlaceholder;
