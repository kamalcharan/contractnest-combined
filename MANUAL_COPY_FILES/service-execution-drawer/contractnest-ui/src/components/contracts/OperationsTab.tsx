// src/components/contracts/OperationsTab.tsx
// Contract Operations Tab — replaces Timeline with grouped-by-date operational view
// Shows Promise vs Reality, date-grouped events with action strips,
// collapsed ticket summaries for completed groups, and slide-in service execution panel

import React, { useMemo, useState, useCallback } from 'react';
import {
  Calendar,
  CalendarDays,
  DollarSign,
  Wrench,
  Clock,
  AlertTriangle,
  Loader2,
  RefreshCw,
  Package,
  Plus,
  Play,
  FileText,
  ChevronRight,
  ChevronDown,
  User,
  CheckCircle2,
  Camera,
  ClipboardList,
  Eye,
} from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { getCurrencySymbol } from '@/utils/constants/currencies';
import {
  useContractEventsForContract,
  useContractEventOperations,
} from '@/hooks/queries/useContractEventQueries';
import {
  useEventStatuses,
  useEventTransitions,
} from '@/hooks/queries/useEventStatusConfigQueries';
import {
  useServiceTicketsForContract,
} from '@/hooks/queries/useServiceExecution';
import type { ServiceTicket } from '@/hooks/queries/useServiceExecution';
import type {
  ContractEvent,
  ContractEventStatus,
} from '@/types/contractEvents';
import type { EventStatusDefinition } from '@/types/eventStatusConfig';
import { EventCard } from '@/components/contracts/EventCard';
import ServiceExecutionDrawer from '@/components/contracts/ServiceExecutionDrawer';
import ServiceTicketDetail from '@/components/contracts/ServiceTicketDetail';
import type { TicketDetailState } from '@/components/contracts/ServiceTicketDetail';

// ═══════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════

export interface OperationsTabProps {
  contractId: string;
  currency: string;
  colors: any;
  /** Contract-level info for the Ops banner right side */
  buyerName?: string;
  contractValue?: number;
  collectedAmount?: number;
  collectionPct?: number;
}

interface DateGroup {
  date: string;
  deliverables: ContractEvent[]; // service + spare_part
  billing: ContractEvent[];
  allCompleted: boolean;
}

interface ServicePanelState {
  isOpen: boolean;
  date: string;
  events: ContractEvent[];
}

// ═══════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const formatEventDate = (dateStr: string): string => {
  const d = new Date(dateStr);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
};

const formatCurrency = (amount: number | null, currency: string): string => {
  if (amount == null) return '—';
  const sym = getCurrencySymbol(currency);
  return `${sym}${amount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
};

const daysFromNow = (dateStr: string): number => {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
};

const getDateLabel = (dateStr: string): { label: string; urgency: 'overdue' | 'today' | 'soon' | 'future' | 'past' } => {
  const days = daysFromNow(dateStr);
  if (days < 0) return { label: `${Math.abs(days)} day${Math.abs(days) !== 1 ? 's' : ''} ago`, urgency: 'past' };
  if (days === 0) return { label: 'Today', urgency: 'today' };
  if (days === 1) return { label: 'Tomorrow', urgency: 'soon' };
  if (days <= 7) return { label: `in ${days} days`, urgency: 'soon' };
  return { label: `in ${days} days`, urgency: 'future' };
};

// Ticket display info for completed date groups
interface TicketDisplayInfo {
  id: string;
  ticketNumber: string;
  assignedTo: string;
  evidenceCount: number;
  completedAt: string;
  eventCount: number;
}

// ═══════════════════════════════════════════════════
// PROMISE vs REALITY — COMPACT STRIP
// ═══════════════════════════════════════════════════

interface PromiseRealityProps {
  events: ContractEvent[];
  colors: any;
  currency: string;
  buyerName?: string;
  contractValue?: number;
  collectedAmount?: number;
  collectionPct?: number;
}

/** Compact inline progress pill for a single event type */
const ProgressPill: React.FC<{
  icon: React.ElementType;
  label: string;
  done: number;
  total: number;
  isUnlimited: boolean;
  accentColor: string;
  colors: any;
}> = ({ icon: Icon, label, done, total, isUnlimited, accentColor, colors }) => {
  const pct = !isUnlimited && total > 0 ? Math.round((done / total) * 100) : 0;
  return (
    <div className="flex items-center gap-2">
      <Icon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: accentColor }} />
      <span className="text-[10px] font-bold" style={{ color: colors.utility.primaryText }}>
        {label}
      </span>
      <span className="text-[10px] font-semibold" style={{ color: accentColor }}>
        {isUnlimited ? (
          <>{done} done <span style={{ fontSize: '11px' }}>&infin;</span></>
        ) : (
          <>{done}/{total}</>
        )}
      </span>
      {!isUnlimited && total > 0 && (
        <div className="w-14 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: `${colors.utility.primaryText}10` }}>
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${pct}%`, backgroundColor: accentColor }}
          />
        </div>
      )}
    </div>
  );
};

const PromiseRealityStrip: React.FC<PromiseRealityProps> = ({
  events, colors, currency, buyerName, contractValue, collectedAmount, collectionPct,
}) => {
  const stats = useMemo(() => {
    const service = { total: 0, done: 0, unlimited: false };
    const sparePart = { total: 0, done: 0, unlimited: false };
    const billing = { total: 0, done: 0, unlimited: false };
    let overdueCount = 0;
    let nextDue: string | null = null;

    events.forEach((e) => {
      const bucket = e.event_type === 'service' ? service
        : e.event_type === 'spare_part' ? sparePart
        : billing;
      bucket.total++;
      if (e.status === 'completed') bucket.done++;
      if (e.status === 'overdue') overdueCount++;
      // Detect unlimited: total_occurrences === 0 means open-ended
      if (e.total_occurrences === 0) bucket.unlimited = true;
      if (e.status !== 'completed' && e.status !== 'cancelled') {
        if (!nextDue || e.scheduled_date < nextDue) nextDue = e.scheduled_date;
      }
    });

    return { service, sparePart, billing, overdueCount, nextDue };
  }, [events]);

  const nextDueInfo = stats.nextDue ? getDateLabel(stats.nextDue) : null;
  const hasSpareParts = stats.sparePart.total > 0;

  return (
    <div
      className="rounded-xl border px-4 py-3 mb-5 flex items-center gap-0"
      style={{ backgroundColor: colors.utility.secondaryBackground, borderColor: `${colors.utility.primaryText}10` }}
    >
      {/* Left: Progress pills + Next due */}
      <div className="flex items-center gap-4 flex-1 min-w-0 flex-wrap">
        <ProgressPill
          icon={Wrench}
          label="Services"
          done={stats.service.done}
          total={stats.service.total}
          isUnlimited={stats.service.unlimited}
          accentColor={colors.semantic?.success || '#10B981'}
          colors={colors}
        />
        {hasSpareParts && (
          <ProgressPill
            icon={Package}
            label="Parts"
            done={stats.sparePart.done}
            total={stats.sparePart.total}
            isUnlimited={stats.sparePart.unlimited}
            accentColor={colors.semantic?.info || '#3B82F6'}
            colors={colors}
          />
        )}
        <ProgressPill
          icon={DollarSign}
          label="Billing"
          done={stats.billing.done}
          total={stats.billing.total}
          isUnlimited={stats.billing.unlimited}
          accentColor={colors.semantic?.warning || '#F59E0B'}
          colors={colors}
        />

        {/* Separator */}
        <div className="h-5 w-px flex-shrink-0" style={{ backgroundColor: `${colors.utility.primaryText}12` }} />

        {/* Next due */}
        {nextDueInfo ? (
          <span className="text-[10px] flex items-center gap-1 flex-shrink-0" style={{ color: colors.utility.secondaryText }}>
            <Calendar className="w-3 h-3" style={{ color: colors.brand.primary }} />
            Next:{' '}
            <span className="font-bold" style={{ color: colors.utility.primaryText }}>
              {formatEventDate(stats.nextDue!)}
            </span>
          </span>
        ) : (
          <span className="text-[10px] font-semibold flex-shrink-0" style={{ color: colors.semantic?.success || '#10B981' }}>
            All done
          </span>
        )}

        {/* Overdue badge */}
        {stats.overdueCount > 0 && (
          <span
            className="text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 flex-shrink-0"
            style={{ backgroundColor: `${colors.semantic.error}10`, color: colors.semantic.error }}
          >
            <AlertTriangle className="w-2.5 h-2.5" />
            {stats.overdueCount} overdue
          </span>
        )}
      </div>

      {/* Right: Contact + Financial snapshot */}
      {(buyerName || contractValue != null) && (
        <>
          <div className="h-5 w-px mx-3 flex-shrink-0" style={{ backgroundColor: `${colors.utility.primaryText}12` }} />
          <div className="flex items-center gap-3 flex-shrink-0">
            {buyerName && (
              <div className="flex items-center gap-1.5">
                <User className="w-3 h-3" style={{ color: colors.brand.primary }} />
                <span className="text-[10px] font-bold max-w-[120px] truncate" style={{ color: colors.utility.primaryText }}>
                  {buyerName}
                </span>
              </div>
            )}
            {contractValue != null && (
              <div className="text-right">
                <span className="text-[10px] font-bold" style={{ color: colors.utility.primaryText }}>
                  {formatCurrency(collectedAmount ?? 0, currency)}/{formatCurrency(contractValue, currency)}
                </span>
                {collectionPct != null && (
                  <div className="w-16 h-1 rounded-full mt-0.5 overflow-hidden" style={{ backgroundColor: `${colors.utility.primaryText}10` }}>
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.min(collectionPct, 100)}%`,
                        backgroundColor: collectionPct >= 100 ? colors.semantic.success : colors.brand.primary,
                      }}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════
// COMPLETED TICKET SUMMARY CARD
// ═══════════════════════════════════════════════════

interface TicketSummaryProps {
  date: string;
  deliverables: ContractEvent[];
  billing: ContractEvent[];
  colors: any;
  currency: string;
  ticket?: TicketDisplayInfo | null;
  onViewTicket?: (ticketId: string, ticketNumber: string, assignedTo: string, completedAt: string, events: ContractEvent[]) => void;
}

const TicketSummaryCard: React.FC<TicketSummaryProps> = ({ date, deliverables, billing, colors, currency, ticket, onViewTicket }) => {
  const [expanded, setExpanded] = useState(false);
  const allEvents = [...deliverables, ...billing];
  const billingTotal = billing.reduce((sum, e) => sum + (e.amount || 0), 0);

  return (
    <div
      className="rounded-xl border overflow-hidden transition-all"
      style={{
        backgroundColor: colors.utility.secondaryBackground,
        borderColor: `${colors.semantic.success}20`,
        borderLeft: `3px solid ${colors.semantic.success}`,
      }}
    >
      {/* Summary Row */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4 flex items-center gap-4 text-left hover:opacity-90 transition-opacity"
      >
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: `${colors.semantic.success}12` }}
        >
          <CheckCircle2 className="w-4.5 h-4.5" style={{ color: colors.semantic.success }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-xs font-bold" style={{ color: colors.utility.primaryText }}>
              {ticket?.ticketNumber || 'Completed'}
            </span>
            <span
              className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
              style={{ backgroundColor: `${colors.semantic.success}12`, color: colors.semantic.success }}
            >
              {ticket ? 'Completed' : `${deliverables.length} event${deliverables.length !== 1 ? 's' : ''}`}
            </span>
          </div>
          <div className="flex items-center gap-3 text-[10px]" style={{ color: colors.utility.secondaryText }}>
            <span className="flex items-center gap-1">
              <Wrench className="w-3 h-3" />
              {deliverables.length} deliverable{deliverables.length !== 1 ? 's' : ''}
            </span>
            {billing.length > 0 && (
              <span className="flex items-center gap-1">
                <DollarSign className="w-3 h-3" />
                {formatCurrency(billingTotal, currency)}
              </span>
            )}
            {ticket?.assignedTo && (
              <span className="flex items-center gap-1">
                <User className="w-3 h-3" />
                {ticket.assignedTo}
              </span>
            )}
            {ticket && (
              <span className="flex items-center gap-1">
                <Camera className="w-3 h-3" />
                {ticket.evidenceCount} evidence
              </span>
            )}
          </div>
        </div>
        {onViewTicket && ticket && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onViewTicket(ticket.id, ticket.ticketNumber, ticket.assignedTo, date, [...deliverables, ...billing]);
            }}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-all hover:opacity-80 flex-shrink-0 mr-1"
            style={{
              backgroundColor: `${colors.brand.primary}10`,
              color: colors.brand.primary,
              border: `1px solid ${colors.brand.primary}20`,
            }}
          >
            <Eye className="w-3 h-3" />
            View
          </button>
        )}
        <ChevronDown
          className={`w-4 h-4 transition-transform flex-shrink-0 ${expanded ? 'rotate-180' : ''}`}
          style={{ color: colors.utility.secondaryText }}
        />
      </button>

      {/* Expanded: show individual event cards */}
      {expanded && (
        <div className="px-4 pb-4 pt-0">
          <div
            className="border-t pt-4 grid gap-3"
            style={{
              borderColor: `${colors.utility.primaryText}08`,
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            }}
          >
            {allEvents.map((event) => (
              <div key={event.id} className="opacity-70">
                <EventCard
                  event={event}
                  currency={currency}
                  colors={colors}
                  onStatusChange={() => {}}
                  hideActions
                  variant="compact"
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════
// DATE GROUP HEADER
// ═══════════════════════════════════════════════════

interface DateHeaderProps {
  date: string;
  eventCount: number;
  isOverdue: boolean;
  isToday: boolean;
  colors: any;
  onAddAppointment?: () => void;
}

const DateGroupHeader: React.FC<DateHeaderProps> = ({
  date, eventCount, isOverdue, isToday, colors, onAddAppointment,
}) => {
  const dateObj = new Date(date);
  const dayNum = dateObj.getDate();
  const monthStr = MONTHS[dateObj.getMonth()];
  const dateLabel = getDateLabel(date);

  const headerColor = isOverdue
    ? colors.semantic.error
    : isToday
    ? colors.brand.primary
    : colors.brand.secondary || colors.brand.primary;

  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-3">
        <div
          className="w-12 h-12 rounded-xl flex flex-col items-center justify-center flex-shrink-0"
          style={{
            background: `linear-gradient(135deg, ${headerColor}, ${headerColor}CC)`,
            boxShadow: `0 4px 14px ${headerColor}30`,
          }}
        >
          <span className="text-sm font-bold text-white">{dayNum}</span>
          <span className="text-[8px] font-medium text-white/80">{monthStr}</span>
        </div>
        <div>
          <div className="flex items-center gap-2">
            <p className="text-sm font-bold" style={{ color: colors.utility.primaryText }}>
              {dateObj.toLocaleDateString('en-US', { weekday: 'long' })}
            </p>
            <span
              className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
              style={{
                backgroundColor: `${headerColor}12`,
                color: headerColor,
              }}
            >
              {dateLabel.label}
            </span>
            {isOverdue && (
              <span
                className="text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1"
                style={{ backgroundColor: `${colors.semantic.error}12`, color: colors.semantic.error }}
              >
                <AlertTriangle className="w-3 h-3" /> Overdue
              </span>
            )}
          </div>
          <p className="text-xs" style={{ color: colors.utility.secondaryText }}>
            {eventCount} event{eventCount !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {onAddAppointment && (
        <button
          onClick={onAddAppointment}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[10px] font-semibold transition-all hover:opacity-80"
          style={{
            borderColor: `${colors.brand.primary}25`,
            color: colors.brand.primary,
            backgroundColor: `${colors.brand.primary}06`,
          }}
        >
          <Plus className="w-3 h-3" />
          Appointment
        </button>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════

const OperationsTab: React.FC<OperationsTabProps> = ({
  contractId, currency, colors, buyerName, contractValue, collectedAmount, collectionPct,
}) => {
  const { isDarkMode } = useTheme();

  const [servicePanel, setServicePanel] = useState<ServicePanelState>({
    isOpen: false,
    date: '',
    events: [],
  });

  const [ticketDetail, setTicketDetail] = useState<TicketDetailState>({
    isOpen: false,
    ticketId: undefined,
    ticketNumber: '',
    assignedTo: '',
    completedAt: '',
    events: [],
  });

  // ─── Data hooks ───
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

  const statusDefsByType: Record<string, EventStatusDefinition[]> = useMemo(() => ({
    service: serviceStatuses?.statuses || [],
    billing: billingStatuses?.statuses || [],
    spare_part: sparePartStatuses?.statuses || [],
  }), [serviceStatuses, billingStatuses, sparePartStatuses]);

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

  // ─── Service Tickets for this contract ───
  const { data: ticketsData } = useServiceTicketsForContract(contractId);

  // Build ticket lookup: map completed_at date → ticket info
  const ticketsByDate = useMemo((): Record<string, TicketDisplayInfo> => {
    if (!ticketsData?.items) return {};
    const map: Record<string, TicketDisplayInfo> = {};
    ticketsData.items.forEach((t: ServiceTicket) => {
      if (t.completed_at) {
        const dateKey = t.completed_at.split('T')[0];
        if (!map[dateKey]) {
          map[dateKey] = {
            id: t.id,
            ticketNumber: t.ticket_number,
            assignedTo: t.assigned_to_name || 'Unassigned',
            evidenceCount: t.evidence_count,
            completedAt: dateKey,
            eventCount: t.event_count,
          };
        }
      }
    });
    return map;
  }, [ticketsData]);

  const { updateStatus, changingStatusEventId } = useContractEventOperations();

  // ─── Group events by date ───
  const dateGroups: DateGroup[] = useMemo(() => {
    if (!eventsData?.items) return [];

    const byDate: Record<string, ContractEvent[]> = {};
    eventsData.items.forEach((event) => {
      const key = event.scheduled_date.split('T')[0];
      if (!byDate[key]) byDate[key] = [];
      byDate[key].push(event);
    });

    return Object.keys(byDate)
      .sort()
      .map((date) => {
        const events = byDate[date];
        const deliverables = events
          .filter((e) => e.event_type === 'service' || e.event_type === 'spare_part')
          .sort((a, b) => {
            const order: Record<string, number> = { service: 0, spare_part: 1 };
            return (order[a.event_type] ?? 0) - (order[b.event_type] ?? 0);
          });
        const billing = events.filter((e) => e.event_type === 'billing');
        const allCompleted = events.every((e) => e.status === 'completed' || e.status === 'cancelled');

        return { date, deliverables, billing, allCompleted };
      });
  }, [eventsData]);

  // ─── Handlers ───
  const handleStatusChange = useCallback(async (
    eventId: string,
    newStatus: ContractEventStatus,
    version: number,
  ) => {
    try {
      await updateStatus({ eventId, newStatus, version });
    } catch {
      // Error handled in hook
    }
  }, [updateStatus]);

  const handleStartService = useCallback((date: string, events: ContractEvent[]) => {
    setServicePanel({ isOpen: true, date, events });
  }, []);

  const handleViewTicket = useCallback((ticketId: string, ticketNumber: string, assignedTo: string, completedAt: string, events: ContractEvent[]) => {
    setTicketDetail({ isOpen: true, ticketId, ticketNumber, assignedTo, completedAt, events });
  }, []);

  // ─── Loading ───
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 animate-spin" style={{ color: colors.brand.primary }} />
          <p className="text-sm" style={{ color: colors.utility.secondaryText }}>Loading operations...</p>
        </div>
      </div>
    );
  }

  // ─── Error ───
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <AlertTriangle className="w-12 h-12" style={{ color: colors.semantic.error }} />
        <h3 className="text-lg font-semibold" style={{ color: colors.utility.primaryText }}>
          Failed to load operations
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

  // ─── Empty ───
  if (!eventsData?.items || eventsData.items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div
          className="w-20 h-20 rounded-2xl flex items-center justify-center mb-6"
          style={{ background: `linear-gradient(135deg, ${colors.brand.primary}15, ${colors.brand.primary}05)` }}
        >
          <ClipboardList className="w-10 h-10" style={{ color: colors.brand.primary }} />
        </div>
        <h3 className="text-lg font-bold mb-2" style={{ color: colors.utility.primaryText }}>
          No Operations Yet
        </h3>
        <p className="text-sm text-center max-w-md" style={{ color: colors.utility.secondaryText }}>
          Operations will appear here once the contract is activated.
          Service deliverables, spare parts, and billing events will be grouped by date.
        </p>
      </div>
    );
  }

  // ─── Main render ───
  return (
    <div>
      {/* Promise vs Reality — compact strip */}
      <PromiseRealityStrip
        events={eventsData.items}
        colors={colors}
        currency={currency}
        buyerName={buyerName}
        contractValue={contractValue}
        collectedAmount={collectedAmount}
        collectionPct={collectionPct}
      />

      {/* Date Groups */}
      <div className="space-y-8">
        {dateGroups.map((group) => {
          const totalEvents = group.deliverables.length + group.billing.length;
          const days = daysFromNow(group.date);
          const hasIncomplete = !group.allCompleted;
          const isOverdue = days < 0 && hasIncomplete;
          const isToday = days === 0;

          // ─── Completed Group: collapsed ticket summary ───
          if (group.allCompleted && group.deliverables.length > 0) {
            return (
              <div key={group.date}>
                <DateGroupHeader
                  date={group.date}
                  eventCount={totalEvents}
                  isOverdue={false}
                  isToday={isToday}
                  colors={colors}
                />
                <TicketSummaryCard
                  date={group.date}
                  deliverables={group.deliverables}
                  billing={group.billing}
                  colors={colors}
                  currency={currency}
                  ticket={ticketsByDate[group.date] || null}
                  onViewTicket={handleViewTicket}
                />
              </div>
            );
          }

          // ─── Active Group: event cards + action strips ───
          return (
            <div key={group.date}>
              <DateGroupHeader
                date={group.date}
                eventCount={totalEvents}
                isOverdue={isOverdue}
                isToday={isToday}
                colors={colors}
                onAddAppointment={() => {}}
              />

              {/* Deliverables Section */}
              {group.deliverables.length > 0 && (
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Wrench className="w-3.5 h-3.5" style={{ color: colors.semantic?.success || '#10B981' }} />
                    <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: colors.utility.secondaryText }}>
                      Deliverables
                    </span>
                    <div className="flex-1 h-px" style={{ backgroundColor: `${colors.utility.primaryText}08` }} />
                  </div>
                  <div
                    className="grid gap-3 mb-3"
                    style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}
                  >
                    {group.deliverables.map((event) => (
                      <EventCard
                        key={event.id}
                        event={event}
                        currency={currency}
                        colors={colors}
                        onStatusChange={handleStatusChange}
                        updatingEventId={changingStatusEventId}
                        statusDefs={statusDefsByType[event.event_type]}
                        allowedTransitions={transitionsByType[event.event_type]?.[event.status] || []}
                      />
                    ))}
                  </div>
                  {/* Start Service button — only if there are non-completed deliverables */}
                  {group.deliverables.some((e) => e.status !== 'completed' && e.status !== 'cancelled') && (
                    <button
                      onClick={() => handleStartService(group.date, [...group.deliverables, ...group.billing])}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold transition-all hover:shadow-md hover:opacity-90"
                      style={{
                        background: `linear-gradient(135deg, ${colors.brand.primary}, ${colors.brand.primary}DD)`,
                        color: '#ffffff',
                        boxShadow: `0 2px 8px ${colors.brand.primary}25`,
                      }}
                    >
                      <Play className="w-4 h-4" />
                      Start Service
                    </button>
                  )}
                </div>
              )}

              {/* Billing Section */}
              {group.billing.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <DollarSign className="w-3.5 h-3.5" style={{ color: colors.semantic?.warning || '#F59E0B' }} />
                    <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: colors.utility.secondaryText }}>
                      Billing
                    </span>
                    <div className="flex-1 h-px" style={{ backgroundColor: `${colors.utility.primaryText}08` }} />
                  </div>
                  <div
                    className="grid gap-3 mb-3"
                    style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}
                  >
                    {group.billing.map((event) => (
                      <EventCard
                        key={event.id}
                        event={event}
                        currency={currency}
                        colors={colors}
                        onStatusChange={handleStatusChange}
                        updatingEventId={changingStatusEventId}
                        statusDefs={statusDefsByType[event.event_type]}
                        allowedTransitions={transitionsByType[event.event_type]?.[event.status] || []}
                      />
                    ))}
                  </div>
                  {/* Generate Invoice button — only if there are non-completed billing events */}
                  {group.billing.some((e) => e.status !== 'completed' && e.status !== 'cancelled') && (
                    <button
                      className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold border transition-all hover:shadow-md hover:opacity-90"
                      style={{
                        borderColor: `${colors.semantic.warning}30`,
                        color: colors.semantic.warning,
                        backgroundColor: `${colors.semantic.warning}08`,
                      }}
                    >
                      <FileText className="w-4 h-4" />
                      Generate Invoice
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Pagination */}
      {eventsData.page_info && eventsData.total_count > 0 && (
        <div
          className="flex items-center justify-center py-4 mt-6 border-t"
          style={{ borderColor: `${colors.utility.primaryText}10` }}
        >
          <span className="text-xs" style={{ color: colors.utility.secondaryText }}>
            Showing {eventsData.items.length} of {eventsData.total_count} events
            {eventsData.page_info.has_next_page && ' \u2022 More events available'}
          </span>
        </div>
      )}

      {/* Service Execution Drawer */}
      <ServiceExecutionDrawer
        isOpen={servicePanel.isOpen}
        contractId={contractId}
        date={servicePanel.date}
        events={servicePanel.events}
        allContractEvents={eventsData?.items || []}
        currency={currency}
        evidencePolicyType="none"
        statusDefsByType={statusDefsByType}
        transitionsByType={transitionsByType}
        onClose={() => setServicePanel({ isOpen: false, date: '', events: [] })}
      />

      {/* Service Ticket Detail Slide-In Panel */}
      <ServiceTicketDetail
        state={ticketDetail}
        onClose={() => setTicketDetail({ isOpen: false, ticketId: undefined, ticketNumber: '', assignedTo: '', completedAt: '', events: [] })}
        colors={colors}
        currency={currency}
      />
    </div>
  );
};

export default OperationsTab;
