// src/components/contracts/TimelineTab.tsx
// Contract Timeline Tab — displays live contract events from database
// Uses useContractEventsForContract hook to fetch events

import React, { useMemo, useState } from 'react';
import {
  Calendar,
  CalendarDays,
  DollarSign,
  Wrench,
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  PlayCircle,
  Loader2,
  Receipt,
  ChevronDown,
  ChevronUp,
  RefreshCw,
} from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { getCurrencySymbol } from '@/utils/constants/currencies';
import {
  useContractEventsForContract,
  useDateSummaryForContract,
  useContractEventOperations,
} from '@/hooks/queries/useContractEventQueries';
import type {
  ContractEvent,
  ContractEventStatus,
  DateBucketSummary,
} from '@/types/contractEvents';
import {
  CONTRACT_EVENT_STATUSES,
  VALID_STATUS_TRANSITIONS,
} from '@/types/contractEvents';

export interface TimelineTabProps {
  contractId: string;
  currency: string;
  colors: any;
}

// ─── Helpers ───

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const formatEventDate = (dateStr: string): string => {
  const d = new Date(dateStr);
  return `${d.getDate()}-${MONTHS[d.getMonth()]}-${d.getFullYear()}`;
};

const formatCurrency = (amount: number | null, currency: string): string => {
  if (amount == null) return '—';
  const sym = getCurrencySymbol(currency);
  return `${sym}${amount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
};

const getStatusConfig = (status: ContractEventStatus, colors: any) => {
  switch (status) {
    case 'scheduled':
      return {
        label: 'Scheduled',
        icon: CalendarDays,
        bg: `${colors.semantic.info}12`,
        color: colors.semantic.info,
      };
    case 'in_progress':
      return {
        label: 'In Progress',
        icon: PlayCircle,
        bg: `${colors.brand.primary}12`,
        color: colors.brand.primary,
      };
    case 'completed':
      return {
        label: 'Completed',
        icon: CheckCircle2,
        bg: `${colors.semantic.success}12`,
        color: colors.semantic.success,
      };
    case 'cancelled':
      return {
        label: 'Cancelled',
        icon: XCircle,
        bg: `${colors.utility.secondaryText}12`,
        color: colors.utility.secondaryText,
      };
    case 'overdue':
      return {
        label: 'Overdue',
        icon: AlertTriangle,
        bg: `${colors.semantic.error}12`,
        color: colors.semantic.error,
      };
    default:
      return {
        label: status,
        icon: Clock,
        bg: `${colors.utility.secondaryText}12`,
        color: colors.utility.secondaryText,
      };
  }
};

// ─── Date Bucket Summary Card ───

interface BucketCardProps {
  title: string;
  bucket: DateBucketSummary;
  color: string;
  colors: any;
  isHighlighted?: boolean;
}

const BucketCard: React.FC<BucketCardProps> = ({ title, bucket, color, colors, isHighlighted }) => (
  <div
    className="flex-1 min-w-[120px] p-3 rounded-xl border transition-all"
    style={{
      backgroundColor: isHighlighted ? `${color}08` : colors.utility.secondaryBackground,
      borderColor: isHighlighted ? `${color}30` : `${colors.utility.primaryText}10`,
    }}
  >
    <div className="flex items-center justify-between mb-2">
      <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color }}>
        {title}
      </span>
      <span className="text-lg font-bold" style={{ color: colors.utility.primaryText }}>
        {bucket.count}
      </span>
    </div>
    <div className="flex items-center gap-3 text-[10px]" style={{ color: colors.utility.secondaryText }}>
      <span className="flex items-center gap-1">
        <Wrench className="w-3 h-3" style={{ color: colors.semantic.success }} />
        {bucket.service_count}
      </span>
      <span className="flex items-center gap-1">
        <DollarSign className="w-3 h-3" style={{ color: colors.semantic.warning }} />
        {bucket.billing_count}
      </span>
    </div>
    {bucket.billing_amount > 0 && (
      <div className="mt-1 text-xs font-semibold" style={{ color: colors.semantic.warning }}>
        {formatCurrency(bucket.billing_amount, 'INR')}
      </div>
    )}
  </div>
);

// ─── Event Card ───

interface EventCardProps {
  event: ContractEvent;
  currency: string;
  colors: any;
  onStatusChange: (eventId: string, newStatus: ContractEventStatus, version: number) => void;
  isUpdating: boolean;
}

const EventCard: React.FC<EventCardProps> = ({ event, currency, colors, onStatusChange, isUpdating }) => {
  const [showActions, setShowActions] = useState(false);
  const isService = event.event_type === 'service';
  const accent = isService ? colors.semantic.success : colors.semantic.warning;
  const statusConfig = getStatusConfig(event.status, colors);
  const StatusIcon = statusConfig.icon;

  const validTransitions = VALID_STATUS_TRANSITIONS[event.status] || [];
  const hasActions = validTransitions.length > 0;

  return (
    <div
      className="rounded-xl border shadow-sm hover:shadow-md transition-all"
      style={{
        borderColor: `${accent}20`,
        backgroundColor: colors.utility.secondaryBackground,
        borderLeft: `4px solid ${accent}`,
      }}
    >
      <div className="p-4">
        {/* Header: Icon + Name + Sequence */}
        <div className="flex items-center gap-3 mb-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: `linear-gradient(135deg, ${accent}20, ${accent}08)` }}
          >
            {isService ? (
              <Wrench className="w-5 h-5" style={{ color: accent }} />
            ) : (
              <Receipt className="w-5 h-5" style={{ color: accent }} />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold truncate" style={{ color: colors.utility.primaryText }}>
              {event.block_name}
            </p>
            <p className="text-xs" style={{ color: colors.utility.secondaryText }}>
              {isService ? 'Service Delivery' : (event.billing_cycle_label || 'Billing')}
            </p>
          </div>
          {event.total_occurrences > 1 && (
            <span
              className="text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: `${accent}12`, color: accent }}
            >
              {event.sequence_number}/{event.total_occurrences}
            </span>
          )}
        </div>

        {/* Amount (billing events) */}
        {event.amount != null && event.amount > 0 && (
          <div
            className="mb-3 px-3 py-2 rounded-lg"
            style={{ backgroundColor: `${colors.semantic.warning}08` }}
          >
            <span className="text-sm font-bold" style={{ color: colors.utility.primaryText }}>
              {formatCurrency(event.amount, event.currency || currency)}
            </span>
          </div>
        )}

        {/* Date + Status Row */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CalendarDays className="w-4 h-4" style={{ color: colors.brand.secondary }} />
            <span className="text-xs font-medium" style={{ color: colors.utility.primaryText }}>
              {formatEventDate(event.scheduled_date)}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Status badge with dropdown trigger */}
            <button
              onClick={() => hasActions && setShowActions(!showActions)}
              disabled={!hasActions || isUpdating}
              className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full transition-all ${
                hasActions ? 'cursor-pointer hover:opacity-80' : 'cursor-default'
              }`}
              style={{ backgroundColor: statusConfig.bg, color: statusConfig.color }}
            >
              {isUpdating ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <StatusIcon className="w-3 h-3" />
              )}
              {statusConfig.label}
              {hasActions && !isUpdating && (
                showActions ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
              )}
            </button>
          </div>
        </div>

        {/* Status Actions Dropdown */}
        {showActions && hasActions && (
          <div
            className="mt-3 pt-3 border-t flex flex-wrap gap-2"
            style={{ borderColor: `${colors.utility.primaryText}10` }}
          >
            <span className="text-[10px] mr-2" style={{ color: colors.utility.secondaryText }}>
              Change to:
            </span>
            {validTransitions.map((newStatus) => {
              const config = getStatusConfig(newStatus as ContractEventStatus, colors);
              const Icon = config.icon;
              return (
                <button
                  key={newStatus}
                  onClick={() => {
                    onStatusChange(event.id, newStatus as ContractEventStatus, event.version);
                    setShowActions(false);
                  }}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold transition-all hover:opacity-80"
                  style={{ backgroundColor: config.bg, color: config.color }}
                >
                  <Icon className="w-3 h-3" />
                  {config.label}
                </button>
              );
            })}
          </div>
        )}

        {/* Notes */}
        {event.notes && (
          <div
            className="mt-3 pt-3 border-t text-xs"
            style={{
              borderColor: `${colors.utility.primaryText}10`,
              color: colors.utility.secondaryText,
            }}
          >
            {event.notes}
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Main Component ───

const TimelineTab: React.FC<TimelineTabProps> = ({ contractId, currency, colors }) => {
  const { isDarkMode } = useTheme();

  // Fetch events for this contract
  const {
    data: eventsData,
    isLoading: eventsLoading,
    error: eventsError,
    refetch: refetchEvents,
  } = useContractEventsForContract(contractId);

  // Fetch date summary for this contract
  const {
    data: dateSummary,
    isLoading: summaryLoading,
  } = useDateSummaryForContract(contractId);

  // Mutations
  const { updateStatus, isChangingStatus } = useContractEventOperations();

  // Group events by date
  const groupedEvents = useMemo(() => {
    if (!eventsData?.items) return [];

    const groups: { date: string; events: ContractEvent[] }[] = [];
    const eventsByDate: Record<string, ContractEvent[]> = {};

    eventsData.items.forEach((event) => {
      const dateKey = event.scheduled_date.split('T')[0];
      if (!eventsByDate[dateKey]) {
        eventsByDate[dateKey] = [];
      }
      eventsByDate[dateKey].push(event);
    });

    // Sort dates
    const sortedDates = Object.keys(eventsByDate).sort();
    sortedDates.forEach((date) => {
      groups.push({
        date,
        events: eventsByDate[date].sort((a, b) => {
          // Service events first, then billing
          if (a.event_type === 'service' && b.event_type === 'billing') return -1;
          if (a.event_type === 'billing' && b.event_type === 'service') return 1;
          return 0;
        }),
      });
    });

    return groups;
  }, [eventsData]);

  const handleStatusChange = async (
    eventId: string,
    newStatus: ContractEventStatus,
    version: number
  ) => {
    try {
      await updateStatus({ eventId, newStatus, version });
    } catch (error) {
      // Error handling is done in the hook
    }
  };

  // Loading state
  if (eventsLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 animate-spin" style={{ color: colors.brand.primary }} />
          <p className="text-sm" style={{ color: colors.utility.secondaryText }}>
            Loading timeline events...
          </p>
        </div>
      </div>
    );
  }

  // Error state
  if (eventsError) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <AlertTriangle className="w-12 h-12" style={{ color: colors.semantic.error }} />
        <h3 className="text-lg font-semibold" style={{ color: colors.utility.primaryText }}>
          Failed to load timeline
        </h3>
        <p className="text-sm" style={{ color: colors.utility.secondaryText }}>
          {eventsError instanceof Error ? eventsError.message : 'An error occurred'}
        </p>
        <button
          onClick={() => refetchEvents()}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors hover:opacity-80"
          style={{ backgroundColor: colors.brand.primary, color: '#ffffff' }}
        >
          <RefreshCw className="w-4 h-4" />
          Try Again
        </button>
      </div>
    );
  }

  // Empty state
  if (!eventsData?.items || eventsData.items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div
          className="w-20 h-20 rounded-2xl flex items-center justify-center mb-6"
          style={{ background: `linear-gradient(135deg, ${colors.brand.primary}15, ${colors.brand.primary}05)` }}
        >
          <Calendar className="w-10 h-10" style={{ color: colors.brand.primary }} />
        </div>
        <h3 className="text-lg font-bold mb-2" style={{ color: colors.utility.primaryText }}>
          No Events Yet
        </h3>
        <p className="text-sm text-center max-w-md" style={{ color: colors.utility.secondaryText }}>
          Timeline events will appear here once the contract is activated.
          Events are automatically created from the contract's service and billing schedule.
        </p>
      </div>
    );
  }

  // Main render
  return (
    <div className="space-y-6">

      {/* ═══ Date Summary Buckets ═══ */}
      {dateSummary && (
        <div
          className="rounded-xl border p-4"
          style={{ backgroundColor: colors.utility.secondaryBackground, borderColor: `${colors.utility.primaryText}10` }}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: colors.utility.primaryText }}>
              <Clock className="w-4 h-4" style={{ color: colors.brand.primary }} />
              Event Schedule
            </h3>
            <span className="text-xs" style={{ color: colors.utility.secondaryText }}>
              {dateSummary.totals.total_events} total events
            </span>
          </div>

          <div className="flex flex-wrap gap-3">
            <BucketCard
              title="Overdue"
              bucket={dateSummary.overdue}
              color={colors.semantic.error}
              colors={colors}
              isHighlighted={dateSummary.overdue.count > 0}
            />
            <BucketCard
              title="Today"
              bucket={dateSummary.today}
              color={colors.brand.primary}
              colors={colors}
              isHighlighted={dateSummary.today.count > 0}
            />
            <BucketCard
              title="Tomorrow"
              bucket={dateSummary.tomorrow}
              color={colors.brand.secondary}
              colors={colors}
            />
            <BucketCard
              title="This Week"
              bucket={dateSummary.this_week}
              color={colors.semantic.info}
              colors={colors}
            />
            <BucketCard
              title="Next Week"
              bucket={dateSummary.next_week}
              color={colors.semantic.warning}
              colors={colors}
            />
            <BucketCard
              title="Later"
              bucket={dateSummary.later}
              color={colors.utility.secondaryText}
              colors={colors}
            />
          </div>
        </div>
      )}

      {/* ═══ Timeline Events List ═══ */}
      <div className="space-y-6">
        {groupedEvents.map((group) => {
          const dateObj = new Date(group.date);
          const serviceEvts = group.events.filter(e => e.event_type === 'service');
          const billingEvts = group.events.filter(e => e.event_type === 'billing');

          return (
            <div key={group.date} className="relative">
              {/* Date Header */}
              <div className="flex items-center gap-3 mb-4">
                <div
                  className="w-12 h-12 rounded-xl flex flex-col items-center justify-center flex-shrink-0"
                  style={{
                    background: `linear-gradient(135deg, ${colors.brand.secondary}, ${colors.brand.secondary}CC)`,
                    boxShadow: `0 4px 14px ${colors.brand.secondary}30`,
                  }}
                >
                  <span className="text-sm font-bold text-white">{dateObj.getDate()}</span>
                  <span className="text-[8px] font-medium text-white/80">
                    {MONTHS[dateObj.getMonth()]}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-semibold" style={{ color: colors.utility.primaryText }}>
                    {dateObj.toLocaleDateString('en-US', { weekday: 'long' })}
                  </p>
                  <p className="text-xs" style={{ color: colors.utility.secondaryText }}>
                    {group.events.length} event{group.events.length !== 1 ? 's' : ''} scheduled
                  </p>
                </div>
              </div>

              {/* Events Grid */}
              <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}>
                {/* Service Events */}
                {serviceEvts.map((event) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    currency={currency}
                    colors={colors}
                    onStatusChange={handleStatusChange}
                    isUpdating={isChangingStatus}
                  />
                ))}

                {/* Billing Events */}
                {billingEvts.map((event) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    currency={currency}
                    colors={colors}
                    onStatusChange={handleStatusChange}
                    isUpdating={isChangingStatus}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Pagination Info */}
      {eventsData.page_info && eventsData.total_count > 0 && (
        <div
          className="flex items-center justify-center py-4 border-t"
          style={{ borderColor: `${colors.utility.primaryText}10` }}
        >
          <span className="text-xs" style={{ color: colors.utility.secondaryText }}>
            Showing {eventsData.items.length} of {eventsData.total_count} events
            {eventsData.page_info.has_next_page && ' • More events available'}
          </span>
        </div>
      )}
    </div>
  );
};

export default TimelineTab;
