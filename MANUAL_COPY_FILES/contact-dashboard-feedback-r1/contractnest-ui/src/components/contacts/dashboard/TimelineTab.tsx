// src/components/contacts/dashboard/TimelineTab.tsx
// Full event timeline: overdue + upcoming, with type/status filters and chronological layout
// Reuses EventCard compact variant for consistent UI with contract detail pages

import React, { useState, useMemo } from 'react';
import {
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle,
  Wrench,
  DollarSign,
  Filter,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { EventCard } from '@/components/contracts/EventCard';
import type { ContractEvent } from '@/types/contractEvents';
import type { OverdueEvent, UpcomingEvent, EventsSummary } from '@/types/contactCockpit';

// ═══════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════

interface TimelineTabProps {
  events: EventsSummary;
  overdueEvents: OverdueEvent[];
  upcomingEvents: UpcomingEvent[];
  colors: any;
  formatCurrency: (value: number, currency?: string) => string;
  daysAhead: number;
  onDaysAheadChange: (days: number) => void;
}

type TimelineFilter = 'all' | 'overdue' | 'upcoming' | 'today';
type TypeFilter = 'all' | 'service' | 'billing';

// ═══════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
}

/** Map cockpit event data to ContractEvent shape for EventCard */
function toContractEvent(
  e: OverdueEvent | UpcomingEvent,
  kind: 'overdue' | 'upcoming' | 'today'
): ContractEvent & { _kind: string; _days_diff: number } {
  const isOverdue = 'days_overdue' in e;
  return {
    id: e.id,
    tenant_id: '',
    contract_id: e.contract_id,
    contract_number: e.contract_number,
    contract_title: e.contract_name,
    task_id: null,
    block_id: '',
    block_name: e.block_name,
    category_id: null,
    event_type: e.event_type as 'service' | 'billing',
    sequence_number: e.sequence_number || 1,
    total_occurrences: e.total_occurrences || 1,
    scheduled_date: e.scheduled_date,
    status: e.status as any,
    assigned_to: e.assigned_to || null,
    assigned_to_name: e.assigned_to_name || null,
    notes: null,
    amount: e.amount,
    currency: e.currency,
    version: 0,
    is_live: true,
    created_at: '',
    updated_at: '',
    // Extra fields for timeline grouping
    _kind: kind,
    _days_diff: isOverdue ? (e as OverdueEvent).days_overdue : (e as UpcomingEvent).days_until,
  } as any;
}

// ═══════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════

const TimelineTab: React.FC<TimelineTabProps> = ({
  events,
  overdueEvents,
  upcomingEvents,
  colors,
  formatCurrency,
  daysAhead,
  onDaysAheadChange,
}) => {
  const navigate = useNavigate();
  const [timelineFilter, setTimelineFilter] = useState<TimelineFilter>('all');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');

  // Merge into unified timeline with ContractEvent shape
  const timeline = useMemo(() => {
    const items: Array<ContractEvent & { _kind: string; _days_diff: number }> = [];

    for (const e of overdueEvents) {
      items.push(toContractEvent(e, 'overdue'));
    }
    for (const e of upcomingEvents) {
      items.push(toContractEvent(e, (e as UpcomingEvent).is_today ? 'today' : 'upcoming'));
    }

    // Sort: overdue first (most overdue), then today, then upcoming (soonest)
    items.sort((a, b) => {
      const order: Record<string, number> = { overdue: 0, today: 1, upcoming: 2 };
      if (order[a._kind] !== order[b._kind]) return order[a._kind] - order[b._kind];
      if (a._kind === 'overdue') return b._days_diff - a._days_diff;
      return a._days_diff - b._days_diff;
    });

    return items;
  }, [overdueEvents, upcomingEvents]);

  // Apply filters
  const filtered = useMemo(() => {
    return timeline.filter(item => {
      if (timelineFilter !== 'all' && item._kind !== timelineFilter) return false;
      if (typeFilter !== 'all' && item.event_type !== typeFilter) return false;
      return true;
    });
  }, [timeline, timelineFilter, typeFilter]);

  // Group by date
  const groupedByDate = useMemo(() => {
    const groups: { date: string; items: typeof filtered }[] = [];
    const map = new Map<string, typeof filtered>();
    for (const item of filtered) {
      const dateKey = item.scheduled_date.split('T')[0];
      if (!map.has(dateKey)) map.set(dateKey, []);
      map.get(dateKey)!.push(item);
    }
    for (const [date, items] of map) {
      groups.push({ date, items });
    }
    return groups;
  }, [filtered]);

  const todayCount = timeline.filter(t => t._kind === 'today').length;

  // No-op status change handler (read-only in contact dashboard — click to navigate instead)
  const handleStatusChange = () => {};

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-5">

      {/* ─── Summary Cards Row ─── */}
      <div className="grid grid-cols-4 gap-4">
        {/* Overdue */}
        <button
          onClick={() => setTimelineFilter(timelineFilter === 'overdue' ? 'all' : 'overdue')}
          className="rounded-xl border p-4 text-left transition-all"
          style={{
            backgroundColor: timelineFilter === 'overdue' ? '#ef444410' : colors.utility.secondaryBackground,
            borderColor: timelineFilter === 'overdue' ? '#ef4444' : colors.utility.primaryText + '10',
          }}
        >
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="h-4 w-4" style={{ color: '#ef4444' }} />
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: colors.utility.secondaryText }}>Overdue</span>
          </div>
          <div className="text-2xl font-bold" style={{ color: '#ef4444' }}>
            {events.overdue}
          </div>
        </button>

        {/* Today */}
        <button
          onClick={() => setTimelineFilter(timelineFilter === 'today' ? 'all' : 'today')}
          className="rounded-xl border p-4 text-left transition-all"
          style={{
            backgroundColor: timelineFilter === 'today' ? '#f59e0b10' : colors.utility.secondaryBackground,
            borderColor: timelineFilter === 'today' ? '#f59e0b' : colors.utility.primaryText + '10',
          }}
        >
          <div className="flex items-center gap-2 mb-1">
            <Clock className="h-4 w-4" style={{ color: '#f59e0b' }} />
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: colors.utility.secondaryText }}>Today</span>
          </div>
          <div className="text-2xl font-bold" style={{ color: '#f59e0b' }}>
            {todayCount}
          </div>
        </button>

        {/* Upcoming */}
        <button
          onClick={() => setTimelineFilter(timelineFilter === 'upcoming' ? 'all' : 'upcoming')}
          className="rounded-xl border p-4 text-left transition-all"
          style={{
            backgroundColor: timelineFilter === 'upcoming' ? '#3b82f610' : colors.utility.secondaryBackground,
            borderColor: timelineFilter === 'upcoming' ? '#3b82f6' : colors.utility.primaryText + '10',
          }}
        >
          <div className="flex items-center gap-2 mb-1">
            <Calendar className="h-4 w-4" style={{ color: '#3b82f6' }} />
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: colors.utility.secondaryText }}>
              Next {daysAhead}d
            </span>
          </div>
          <div className="text-2xl font-bold" style={{ color: '#3b82f6' }}>
            {upcomingEvents.filter(e => !e.is_today).length}
          </div>
        </button>

        {/* Completed */}
        <div
          className="rounded-xl border p-4"
          style={{ backgroundColor: colors.utility.secondaryBackground, borderColor: colors.utility.primaryText + '10' }}
        >
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle className="h-4 w-4" style={{ color: '#22c55e' }} />
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: colors.utility.secondaryText }}>Completed</span>
          </div>
          <div className="text-2xl font-bold" style={{ color: '#22c55e' }}>
            {events.completed}
          </div>
          <div className="text-xs mt-1" style={{ color: colors.utility.secondaryText }}>
            of {events.total} total
          </div>
        </div>
      </div>

      {/* ─── Filter Bar ─── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4" style={{ color: colors.utility.secondaryText }} />
          {/* Type filter */}
          {(['all', 'service', 'billing'] as TypeFilter[]).map(t => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5"
              style={{
                border: `1px solid ${typeFilter === t ? colors.brand.primary : colors.utility.primaryText + '15'}`,
                backgroundColor: typeFilter === t ? colors.brand.primary + '10' : 'transparent',
                color: typeFilter === t ? colors.brand.primary : colors.utility.secondaryText,
              }}
            >
              {t === 'service' && <Wrench className="h-3 w-3" />}
              {t === 'billing' && <DollarSign className="h-3 w-3" />}
              {t === 'all' ? 'All Types' : t === 'service' ? 'Service' : 'Billing'}
            </button>
          ))}

          {(timelineFilter !== 'all' || typeFilter !== 'all') && (
            <button
              onClick={() => { setTimelineFilter('all'); setTypeFilter('all'); }}
              className="text-xs font-semibold px-2 py-1 rounded"
              style={{ color: colors.brand.primary, backgroundColor: colors.brand.primary + '10' }}
            >
              Clear filters
            </button>
          )}
        </div>

        {/* Days Ahead Selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs" style={{ color: colors.utility.secondaryText }}>Look ahead:</span>
          {[7, 14, 30].map(d => (
            <button
              key={d}
              onClick={() => onDaysAheadChange(d)}
              className="px-2.5 py-1 rounded text-xs font-semibold"
              style={{
                backgroundColor: daysAhead === d ? colors.brand.primary + '15' : 'transparent',
                color: daysAhead === d ? colors.brand.primary : colors.utility.secondaryText,
              }}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>

      {/* ─── Timeline ─── */}
      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <Calendar className="h-16 w-16 mx-auto mb-4 opacity-30" style={{ color: colors.utility.secondaryText }} />
          <h3 className="text-lg font-semibold mb-2" style={{ color: colors.utility.primaryText }}>
            No events to show
          </h3>
          <p className="text-sm" style={{ color: colors.utility.secondaryText }}>
            {timelineFilter !== 'all' || typeFilter !== 'all' ? 'Try adjusting your filters' : 'No overdue or upcoming events'}
          </p>
        </div>
      ) : (
        <div className="relative">
          {/* Vertical line */}
          <div
            className="absolute left-[7px] top-2 bottom-2 w-0.5"
            style={{ backgroundColor: colors.utility.primaryText + '12' }}
          />

          {groupedByDate.map((group) => {
            const isToday = group.items.some(i => i._kind === 'today');
            const hasOverdue = group.items.some(i => i._kind === 'overdue');

            return (
              <div key={group.date} className="mb-6 last:mb-0">
                {/* Date header */}
                <div className="flex items-center gap-3 mb-3 relative">
                  <div
                    className="w-4 h-4 rounded-full border-2 z-10 flex-shrink-0"
                    style={{
                      borderColor: hasOverdue ? '#ef4444' : isToday ? '#f59e0b' : colors.brand.primary,
                      backgroundColor: hasOverdue ? '#ef4444' : isToday ? '#f59e0b' : colors.brand.primary,
                    }}
                  />
                  <span className="text-sm font-bold" style={{ color: colors.utility.primaryText }}>
                    {formatDate(group.date)}
                  </span>
                  {isToday && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-bold" style={{ backgroundColor: '#f59e0b20', color: '#f59e0b' }}>
                      TODAY
                    </span>
                  )}
                  {hasOverdue && !isToday && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-bold" style={{ backgroundColor: '#ef444420', color: '#ef4444' }}>
                      OVERDUE
                    </span>
                  )}
                </div>

                {/* Events for this date — using EventCard compact variant */}
                <div className="ml-8 grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
                  {group.items.map(item => (
                    <EventCard
                      key={item.id}
                      event={item}
                      colors={colors}
                      onStatusChange={handleStatusChange}
                      hideActions
                      variant="compact"
                      onViewContract={(contractId) => navigate(`/contracts/${contractId}`)}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default TimelineTab;
