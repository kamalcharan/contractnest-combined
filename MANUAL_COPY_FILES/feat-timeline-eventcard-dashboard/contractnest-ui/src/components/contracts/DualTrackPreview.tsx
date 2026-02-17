// src/components/contracts/DualTrackPreview.tsx
// Seller Overview — dual-column timeline preview
// Left: Service events · Right: Financial/billing events
// Shows first 3 each with "Full Timeline →" link
// Uses EventCard compact variant for consistent card styling

import React from 'react';
import { Wrench, DollarSign } from 'lucide-react';
import { useContractEventsForContract } from '@/hooks/queries/useContractEventQueries';
import { EventCard } from '@/components/contracts/EventCard';

// =================================================================
// PROPS
// =================================================================

export interface DualTrackPreviewProps {
  contractId: string;
  currency: string;
  colors: any;
  onViewFullTimeline?: () => void;
}

// =================================================================
// MAIN COMPONENT
// =================================================================

export const DualTrackPreview: React.FC<DualTrackPreviewProps> = ({
  contractId,
  currency,
  colors,
  onViewFullTimeline,
}) => {
  const { data: eventsData } = useContractEventsForContract(contractId);
  const allEvents = eventsData?.items || [];

  // Split into service (service + spare_part) and billing
  const serviceEvents = allEvents
    .filter((e: any) => e.event_type === 'service' || e.event_type === 'spare_part')
    .slice(0, 3);

  const billingEvents = allEvents
    .filter((e: any) => e.event_type === 'billing')
    .slice(0, 3);

  const completedServices = allEvents.filter(
    (e: any) => (e.event_type === 'service' || e.event_type === 'spare_part') && e.status === 'completed',
  ).length;
  const totalServices = allEvents.filter(
    (e: any) => e.event_type === 'service' || e.event_type === 'spare_part',
  ).length;

  const totalCollected = allEvents
    .filter((e: any) => e.event_type === 'billing' && e.status === 'completed')
    .reduce((sum: number, e: any) => sum + (e.amount || 0), 0);
  const totalBillingValue = allEvents
    .filter((e: any) => e.event_type === 'billing')
    .reduce((sum: number, e: any) => sum + (e.amount || 0), 0);

  const fmtCurrency = (v: number) =>
    new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: currency || 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(v);

  const successColor = colors.semantic?.success || '#10B981';
  const warningColor = colors.semantic?.warning || '#F59E0B';

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
          <span style={{ fontSize: 15 }}>⏱</span>
          <span
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: colors.utility.primaryText,
              letterSpacing: 0.5,
              textTransform: 'uppercase' as const,
            }}
          >
            Contract Timeline
          </span>
        </div>
        {onViewFullTimeline && (
          <span
            onClick={onViewFullTimeline}
            style={{ fontSize: 11, color: successColor, fontWeight: 600, cursor: 'pointer' }}
          >
            Full Timeline →
          </span>
        )}
      </div>

      {/* Dual columns */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        {/* Service column */}
        <div>
          <div
            className="flex items-center gap-2 mb-3 px-3 py-2 rounded-lg"
            style={{ backgroundColor: `${successColor}08`, border: `1px solid ${successColor}15` }}
          >
            <Wrench className="w-3.5 h-3.5" style={{ color: successColor }} />
            <span className="text-xs font-bold" style={{ color: successColor }}>
              Service Tasks
            </span>
            <span
              className="text-[10px] font-semibold ml-auto"
              style={{ color: successColor, fontFamily: 'monospace' }}
            >
              {completedServices}/{totalServices}
            </span>
          </div>
          {serviceEvents.length > 0 ? (
            <div className="space-y-3">
              {serviceEvents.map((e: any) => (
                <EventCard
                  key={e.id}
                  event={e}
                  currency={currency}
                  colors={colors}
                  onStatusChange={() => {}}
                  hideActions
                  variant="compact"
                />
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: 20, color: '#cbd5e1', fontSize: 12 }}>
              No service events yet
            </div>
          )}
        </div>

        {/* Billing column */}
        <div>
          <div
            className="flex items-center gap-2 mb-3 px-3 py-2 rounded-lg"
            style={{ backgroundColor: `${warningColor}08`, border: `1px solid ${warningColor}15` }}
          >
            <DollarSign className="w-3.5 h-3.5" style={{ color: warningColor }} />
            <span className="text-xs font-bold" style={{ color: warningColor }}>
              Financial Tasks
            </span>
            <span
              className="text-[10px] font-semibold ml-auto"
              style={{ color: warningColor, fontFamily: 'monospace' }}
            >
              {fmtCurrency(totalCollected)} / {fmtCurrency(totalBillingValue)}
            </span>
          </div>
          {billingEvents.length > 0 ? (
            <div className="space-y-3">
              {billingEvents.map((e: any) => (
                <EventCard
                  key={e.id}
                  event={e}
                  currency={currency}
                  colors={colors}
                  onStatusChange={() => {}}
                  hideActions
                  variant="compact"
                />
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: 20, color: '#cbd5e1', fontSize: 12 }}>
              No billing events yet
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DualTrackPreview;
