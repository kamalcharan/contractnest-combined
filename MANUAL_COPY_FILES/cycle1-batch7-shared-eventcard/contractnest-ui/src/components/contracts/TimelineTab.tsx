// src/components/contracts/TimelineTab.tsx
// Contract Timeline Tab — displays live contract events from database
// Uses shared EventCard component for consistent UX across the product

import React, { useMemo } from 'react';
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
} from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { getCurrencySymbol } from '@/utils/constants/currencies';
import {
  useContractEventsForContract,
  useDateSummaryForContract,
  useContractEventOperations,
} from '@/hooks/queries/useContractEventQueries';
import {
  useEventStatuses,
  useEventTransitions,
} from '@/hooks/queries/useEventStatusConfigQueries';
import type {
  ContractEvent,
  ContractEventStatus,
  DateBucketSummary,
} from '@/types/contractEvents';
import type { EventStatusDefinition } from '@/types/eventStatusConfig';
import { EventCard } from '@/components/contracts/EventCard';

export interface TimelineTabProps {
  contractId: string;
  currency: string;
  colors: any;
}

// ─── Helpers ───

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const formatCurrency = (amount: number | null, currency: string): string => {
  if (amount == null) return '—';
  const sym = getCurrencySymbol(currency);
  return `${sym}${amount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
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
      {(bucket.spare_part_count ?? 0) > 0 && (
        <span className="flex items-center gap-1">
          <Package className="w-3 h-3" style={{ color: colors.semantic.info }} />
          {bucket.spare_part_count}
        </span>
      )}
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

  // Fetch dynamic status definitions + transitions (10min staleTime, fetch-once)
  const { data: serviceStatuses } = useEventStatuses('service');
  const { data: billingStatuses } = useEventStatuses('billing');
  const { data: sparePartStatuses } = useEventStatuses('spare_part');
  const { data: serviceTransitions } = useEventTransitions('service');
  const { data: billingTransitions } = useEventTransitions('billing');
  const { data: sparePartTransitions } = useEventTransitions('spare_part');

  // Build lookup maps
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

  // Mutations
  const { updateStatus, changingStatusEventId } = useContractEventOperations();

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
          // Sort order: service → spare_part → billing
          const typeOrder: Record<string, number> = { service: 0, spare_part: 1, billing: 2 };
          return (typeOrder[a.event_type] ?? 1) - (typeOrder[b.event_type] ?? 1);
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

      {/* Date Summary Buckets */}
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

      {/* Timeline Events List */}
      <div className="space-y-6">
        {groupedEvents.map((group) => {
          const dateObj = new Date(group.date);

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
                {group.events.map((event) => (
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
