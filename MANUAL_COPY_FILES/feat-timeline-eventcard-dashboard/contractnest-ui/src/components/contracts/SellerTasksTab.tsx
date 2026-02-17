// src/components/contracts/SellerTasksTab.tsx
// Seller/Buyer Tasks tab — center-line vertical timeline with EventCard
// Mirrors the EventsPreviewStep layout using live API data
// Used by Seller "Tasks" tab and Buyer "My Services" tab

import React, { useMemo, useState, useCallback } from 'react';
import {
  CalendarDays,
  DollarSign,
  Wrench,
  Loader2,
  RefreshCw,
  AlertTriangle,
  Play,
  FileText,
  CheckCircle2,
  ClipboardList,
  CreditCard,
  Clock,
} from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import {
  useContractEventsForContract,
  useContractEventOperations,
} from '@/hooks/queries/useContractEventQueries';
import { useContract } from '@/hooks/queries/useContractQueries';
import {
  useEventStatuses,
  useEventTransitions,
} from '@/hooks/queries/useEventStatusConfigQueries';
import type { ContractEvent, ContractEventStatus } from '@/types/contractEvents';
import type { EventStatusDefinition } from '@/types/eventStatusConfig';
import { EventCard } from '@/components/contracts/EventCard';
import ServiceExecutionDrawer from '@/components/contracts/ServiceExecutionDrawer';

// ═══════════════════════════════════════════════════
// PROPS
// ═══════════════════════════════════════════════════

export interface SellerTasksTabProps {
  contractId: string;
  currency: string;
  colors: any;
  /** 'seller' (default) shows Start Service / Generate Invoice actions;
   *  'buyer' shows Make Payment action on billing side */
  role?: 'seller' | 'buyer';
}

// ═══════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

interface DateGroup {
  date: string;
  dateObj: Date;
  serviceEvents: ContractEvent[];
  billingEvents: ContractEvent[];
}

// ═══════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════

export const SellerTasksTab: React.FC<SellerTasksTabProps> = ({
  contractId,
  currency,
  colors,
  role = 'seller',
}) => {
  const { isDarkMode } = useTheme();
  const isSeller = role === 'seller';

  const [servicePanel, setServicePanel] = useState<{
    isOpen: boolean;
    date: string;
    events: ContractEvent[];
  }>({ isOpen: false, date: '', events: [] });

  // ── Data hooks ──
  const { data: contractData } = useContract(contractId);
  const {
    data: eventsData,
    isLoading,
    error,
    refetch,
  } = useContractEventsForContract(contractId);

  const { data: serviceStatuses } = useEventStatuses('service');
  const { data: billingStatuses } = useEventStatuses('billing');
  const { data: sparePartStatuses } = useEventStatuses('spare_part');
  const { data: serviceTransitions } = useEventTransitions('service');
  const { data: billingTransitions } = useEventTransitions('billing');
  const { data: sparePartTransitions } = useEventTransitions('spare_part');

  const statusDefsByType = useMemo(
    (): Record<string, EventStatusDefinition[]> => ({
      service: serviceStatuses?.statuses || [],
      billing: billingStatuses?.statuses || [],
      spare_part: sparePartStatuses?.statuses || [],
    }),
    [serviceStatuses, billingStatuses, sparePartStatuses],
  );

  const transitionsByType = useMemo(() => {
    const buildMap = (transitions: any[]) => {
      const map: Record<string, string[]> = {};
      for (const t of transitions) {
        if (!map[t.from_status]) map[t.from_status] = [];
        map[t.from_status].push(t.to_status);
      }
      return map;
    };
    return {
      service: buildMap(serviceTransitions?.transitions || []),
      billing: buildMap(billingTransitions?.transitions || []),
      spare_part: buildMap(sparePartTransitions?.transitions || []),
    };
  }, [serviceTransitions, billingTransitions, sparePartTransitions]);

  const { updateStatus, changingStatusEventId } = useContractEventOperations();

  const allEvents = eventsData?.items || [];
  const totalTasks = allEvents.length;

  // ── Group events by scheduled date ──
  const dateGroups: DateGroup[] = useMemo(() => {
    const byDate: Record<string, ContractEvent[]> = {};
    allEvents.forEach((event) => {
      const key = event.scheduled_date.split('T')[0];
      if (!byDate[key]) byDate[key] = [];
      byDate[key].push(event);
    });

    return Object.keys(byDate)
      .sort()
      .map((date) => {
        const events = byDate[date];
        const dateObj = new Date(date + 'T00:00:00');
        const serviceEvents = events.filter(
          (e) => e.event_type === 'service' || e.event_type === 'spare_part',
        );
        const billingEvents = events.filter((e) => e.event_type === 'billing');
        return { date, dateObj, serviceEvents, billingEvents };
      });
  }, [allEvents]);

  // ── Handlers ──
  const handleStatusChange = useCallback(
    async (eventId: string, newStatus: ContractEventStatus, version: number) => {
      try {
        await updateStatus({ eventId, newStatus, version });
      } catch {
        // Error handled in hook (toast)
      }
    },
    [updateStatus],
  );

  const handleStartService = useCallback(
    (date: string, events: ContractEvent[]) => {
      setServicePanel({ isOpen: true, date, events });
    },
    [],
  );

  // ── Theme colors ──
  const dateNodeColor = colors.brand?.secondary || colors.brand?.primary || '#6366f1';
  const successColor = colors.semantic?.success || '#10B981';
  const warningColor = colors.semantic?.warning || '#F59E0B';

  // ── Loading ──
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 animate-spin" style={{ color: colors.brand.primary }} />
          <p className="text-sm" style={{ color: colors.utility.secondaryText }}>
            Loading timeline...
          </p>
        </div>
      </div>
    );
  }

  // ── Error ──
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <AlertTriangle className="w-12 h-12" style={{ color: colors.semantic?.error || '#EF4444' }} />
        <h3 className="text-lg font-semibold" style={{ color: colors.utility.primaryText }}>
          Failed to load timeline
        </h3>
        <p className="text-sm" style={{ color: colors.utility.secondaryText }}>
          {error instanceof Error ? error.message : 'An error occurred'}
        </p>
        <button
          onClick={() => refetch()}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors hover:opacity-80"
          style={{ backgroundColor: colors.brand.primary, color: '#ffffff' }}
        >
          <RefreshCw className="w-4 h-4" /> Try Again
        </button>
      </div>
    );
  }

  // ── Empty state ──
  if (totalTasks === 0) {
    const contractStatus = (contractData as any)?.status;
    const isPreActive =
      contractStatus &&
      contractStatus !== 'active' &&
      contractStatus !== 'completed';

    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div
          className="w-20 h-20 rounded-2xl flex items-center justify-center mb-6"
          style={{
            background: `linear-gradient(135deg, ${colors.brand.primary}15, ${colors.brand.primary}05)`,
          }}
        >
          {isPreActive ? (
            <Clock className="w-10 h-10" style={{ color: colors.brand.primary }} />
          ) : (
            <ClipboardList className="w-10 h-10" style={{ color: colors.brand.primary }} />
          )}
        </div>
        <h3 className="text-lg font-bold mb-2" style={{ color: colors.utility.primaryText }}>
          {isPreActive ? 'Contract Not Yet Active' : 'No Tasks Yet'}
        </h3>
        <p className="text-sm text-center max-w-md" style={{ color: colors.utility.secondaryText }}>
          {isPreActive
            ? 'Events will be generated automatically once the contract becomes active.'
            : 'Events will appear here as the contract progresses.'}
        </p>
      </div>
    );
  }

  // ════════════════════════════════════════════════════
  // MAIN RENDER — Center-line vertical timeline
  // ════════════════════════════════════════════════════
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
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 20,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Clock className="w-4 h-4" style={{ color: colors.utility.primaryText }} />
          <span
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: colors.utility.primaryText,
              letterSpacing: 0.5,
              textTransform: 'uppercase' as const,
            }}
          >
            Full Timeline
          </span>
          <span
            style={{
              background: `${colors.utility.primaryText}10`,
              color: colors.utility.secondaryText,
              fontSize: 11,
              fontWeight: 600,
              padding: '2px 8px',
              borderRadius: 10,
            }}
          >
            {totalTasks} tasks
          </span>
        </div>
      </div>

      {/* Timeline */}
      <div className="relative">
        {/* Vertical center line */}
        <div
          className="absolute left-1/2 transform -translate-x-1/2 top-6 bottom-6 w-0.5 rounded-full"
          style={{
            background: `linear-gradient(180deg, transparent 0%, ${dateNodeColor}25 8%, ${dateNodeColor}25 92%, transparent 100%)`,
          }}
        />

        <div className="space-y-10">
          {dateGroups.map((group, gIdx) => {
            const isFirst = gIdx === 0;
            const isLast = gIdx === dateGroups.length - 1;
            const dayNum = group.dateObj.getDate();

            const hasIncompleteService = group.serviceEvents.some(
              (e) => e.status !== 'completed' && e.status !== 'cancelled',
            );
            const hasIncompleteBilling = group.billingEvents.some(
              (e) => e.status !== 'completed' && e.status !== 'cancelled',
            );

            return (
              <div key={group.date} className="relative flex items-start">
                {/* ─── LEFT: Service & Spare Part cards ─── */}
                <div className="flex-1 flex flex-col gap-3 items-end pr-6 pt-1">
                  {/* Column header (first date group only) */}
                  {isFirst && group.serviceEvents.length > 0 && (
                    <div className="flex items-center gap-1.5 mb-1">
                      <Wrench className="w-3 h-3" style={{ color: successColor }} />
                      <span
                        className="text-[10px] font-bold uppercase tracking-wider"
                        style={{ color: successColor }}
                      >
                        Service & Parts
                      </span>
                    </div>
                  )}

                  {group.serviceEvents.length > 0 ? (
                    <>
                      {group.serviceEvents.map((evt) => (
                        <div key={evt.id} className="w-full max-w-[272px]">
                          <EventCard
                            event={evt}
                            currency={currency}
                            colors={colors}
                            onStatusChange={handleStatusChange}
                            updatingEventId={changingStatusEventId}
                            statusDefs={statusDefsByType[evt.event_type]}
                            allowedTransitions={
                              transitionsByType[evt.event_type]?.[evt.status] || []
                            }
                          />
                        </div>
                      ))}

                      {/* Start Service button — seller only */}
                      {isSeller && hasIncompleteService && (
                        <button
                          onClick={() =>
                            handleStartService(group.date, [
                              ...group.serviceEvents,
                              ...group.billingEvents,
                            ])
                          }
                          className="flex items-center gap-2 px-3 py-2 rounded-lg text-[11px] font-bold transition-all hover:shadow-md hover:opacity-90"
                          style={{
                            background: `linear-gradient(135deg, ${colors.brand.primary}, ${colors.brand.primary}DD)`,
                            color: '#ffffff',
                            boxShadow: `0 2px 8px ${colors.brand.primary}25`,
                          }}
                        >
                          <Play className="w-3.5 h-3.5" />
                          Start Service
                        </button>
                      )}
                    </>
                  ) : (
                    <div className="h-16" />
                  )}
                </div>

                {/* ─── CENTER: Date node on vertical line ─── */}
                <div
                  className="relative z-10 flex flex-col items-center flex-shrink-0"
                  style={{ width: '6rem' }}
                >
                  {/* Connector dot above (except first) */}
                  {gIdx > 0 && (
                    <div
                      className="w-1.5 h-1.5 rounded-full mb-2"
                      style={{ backgroundColor: `${dateNodeColor}30` }}
                    />
                  )}

                  {/* Main date circle */}
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center shadow-lg"
                    style={{
                      background: `linear-gradient(135deg, ${dateNodeColor}, ${dateNodeColor}CC)`,
                      boxShadow: `0 4px 14px ${dateNodeColor}30`,
                    }}
                  >
                    <span className="text-sm font-bold text-white">{dayNum}</span>
                  </div>

                  {/* Month-Year label */}
                  <span
                    className="text-[10px] font-bold mt-1.5 whitespace-nowrap"
                    style={{ color: colors.utility.primaryText }}
                  >
                    {MONTHS[group.dateObj.getMonth()]} {group.dateObj.getFullYear()}
                  </span>

                  {/* Connector dot below (except last) */}
                  {!isLast && (
                    <div
                      className="w-1.5 h-1.5 rounded-full mt-2"
                      style={{ backgroundColor: `${dateNodeColor}30` }}
                    />
                  )}
                </div>

                {/* ─── RIGHT: Billing & Payment cards ─── */}
                <div className="flex-1 flex flex-col gap-3 items-start pl-6 pt-1">
                  {/* Column header (first date group only) */}
                  {isFirst && group.billingEvents.length > 0 && (
                    <div className="flex items-center gap-1.5 mb-1">
                      <DollarSign className="w-3 h-3" style={{ color: warningColor }} />
                      <span
                        className="text-[10px] font-bold uppercase tracking-wider"
                        style={{ color: warningColor }}
                      >
                        Billing & Payments
                      </span>
                    </div>
                  )}

                  {group.billingEvents.length > 0 ? (
                    <>
                      {group.billingEvents.map((evt) => (
                        <div key={evt.id} className="w-full max-w-[272px]">
                          <EventCard
                            event={evt}
                            currency={currency}
                            colors={colors}
                            onStatusChange={handleStatusChange}
                            updatingEventId={changingStatusEventId}
                            statusDefs={statusDefsByType[evt.event_type]}
                            allowedTransitions={
                              transitionsByType[evt.event_type]?.[evt.status] || []
                            }
                          />
                        </div>
                      ))}

                      {/* Action button: Generate Invoice (seller) / Make Payment (buyer) */}
                      {hasIncompleteBilling &&
                        (isSeller ? (
                          <button
                            className="flex items-center gap-2 px-3 py-2 rounded-lg text-[11px] font-bold border transition-all hover:shadow-md hover:opacity-90"
                            style={{
                              borderColor: `${warningColor}30`,
                              color: warningColor,
                              backgroundColor: `${warningColor}08`,
                            }}
                          >
                            <FileText className="w-3.5 h-3.5" />
                            Generate Invoice
                          </button>
                        ) : (
                          <button
                            className="flex items-center gap-2 px-3 py-2 rounded-lg text-[11px] font-bold border transition-all hover:shadow-md hover:opacity-90"
                            style={{
                              borderColor: `${colors.brand.primary}30`,
                              color: colors.brand.primary,
                              backgroundColor: `${colors.brand.primary}08`,
                            }}
                          >
                            <CreditCard className="w-3.5 h-3.5" />
                            Make Payment
                          </button>
                        ))}
                    </>
                  ) : (
                    <div className="h-16" />
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Timeline end marker */}
        <div className="flex justify-center mt-6">
          <div
            className="flex items-center gap-2 px-4 py-2 rounded-full"
            style={{
              backgroundColor: `${dateNodeColor}08`,
              border: `1px dashed ${dateNodeColor}25`,
            }}
          >
            <CheckCircle2 className="w-3.5 h-3.5" style={{ color: dateNodeColor }} />
            <span className="text-[11px] font-semibold" style={{ color: dateNodeColor }}>
              Timeline End
            </span>
          </div>
        </div>
      </div>

      {/* Pagination indicator */}
      {eventsData?.page_info && eventsData.total_count > 0 && (
        <div
          className="flex items-center justify-center py-4 mt-6 border-t"
          style={{ borderColor: `${colors.utility.primaryText}10` }}
        >
          <span className="text-xs" style={{ color: colors.utility.secondaryText }}>
            Showing {eventsData.items.length} of {eventsData.total_count} events
            {eventsData.page_info.has_next_page && ' \u00B7 More events available'}
          </span>
        </div>
      )}

      {/* Service Execution Drawer (seller only) */}
      {isSeller && (
        <ServiceExecutionDrawer
          isOpen={servicePanel.isOpen}
          contractId={contractId}
          date={servicePanel.date}
          events={servicePanel.events}
          allContractEvents={allEvents}
          currency={currency}
          evidencePolicyType={
            (contractData as any)?.evidence_policy_type ||
            (contractData as any)?.metadata?.evidence_policy_type ||
            'none'
          }
          evidenceSelectedForms={
            (contractData as any)?.evidence_selected_forms ||
            (contractData as any)?.metadata?.evidence_selected_forms
          }
          statusDefsByType={statusDefsByType}
          transitionsByType={transitionsByType}
          onClose={() => setServicePanel({ isOpen: false, date: '', events: [] })}
        />
      )}
    </div>
  );
};

export default SellerTasksTab;
