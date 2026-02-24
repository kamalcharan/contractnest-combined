// src/components/contacts/dashboard/TimelineTab.tsx
// Full event timeline: overdue + upcoming, with type/status filters and chronological layout

import React, { useState, useMemo } from 'react';
import {
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle,
  Wrench,
  DollarSign,
  ChevronRight,
  Filter,
  User,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
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

function formatShortDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
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

  // Merge into unified timeline
  const timeline = useMemo(() => {
    const items: Array<{
      id: string;
      kind: 'overdue' | 'upcoming' | 'today';
      event_type: 'service' | 'billing';
      block_name: string;
      contract_id: string;
      contract_number: string;
      contract_name: string;
      scheduled_date: string;
      days_diff: number;
      status: string;
      amount?: number;
      currency?: string;
      assigned_to_name?: string;
      sequence_number?: number;
      total_occurrences?: number;
    }> = [];

    for (const e of overdueEvents) {
      items.push({
        id: e.id,
        kind: 'overdue',
        event_type: e.event_type as 'service' | 'billing',
        block_name: e.block_name,
        contract_id: e.contract_id,
        contract_number: e.contract_number,
        contract_name: e.contract_name,
        scheduled_date: e.scheduled_date,
        days_diff: e.days_overdue,
        status: e.status,
        amount: e.amount,
        currency: e.currency,
        assigned_to_name: e.assigned_to_name,
        sequence_number: e.sequence_number,
        total_occurrences: e.total_occurrences,
      });
    }

    for (const e of upcomingEvents) {
      items.push({
        id: e.id,
        kind: e.is_today ? 'today' : 'upcoming',
        event_type: e.event_type as 'service' | 'billing',
        block_name: e.block_name,
        contract_id: e.contract_id,
        contract_number: e.contract_number,
        contract_name: e.contract_name,
        scheduled_date: e.scheduled_date,
        days_diff: e.days_until,
        status: e.status,
        amount: e.amount,
        currency: e.currency,
        assigned_to_name: e.assigned_to_name,
        sequence_number: e.sequence_number,
        total_occurrences: e.total_occurrences,
      });
    }

    // Sort: overdue first (most overdue first), then today, then upcoming (soonest first)
    items.sort((a, b) => {
      const order = { overdue: 0, today: 1, upcoming: 2 };
      if (order[a.kind] !== order[b.kind]) return order[a.kind] - order[b.kind];
      if (a.kind === 'overdue') return b.days_diff - a.days_diff; // most overdue first
      return a.days_diff - b.days_diff; // soonest first
    });

    return items;
  }, [overdueEvents, upcomingEvents]);

  // Apply filters
  const filtered = useMemo(() => {
    return timeline.filter(item => {
      if (timelineFilter !== 'all' && item.kind !== timelineFilter) return false;
      if (typeFilter !== 'all' && item.event_type !== typeFilter) return false;
      return true;
    });
  }, [timeline, timelineFilter, typeFilter]);

  // Group by date for the visual timeline
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

  const todayCount = timeline.filter(t => t.kind === 'today').length;

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
            const groupDate = new Date(group.date);
            const isToday = group.items.some(i => i.kind === 'today');
            const hasOverdue = group.items.some(i => i.kind === 'overdue');

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
                </div>

                {/* Events for this date */}
                <div className="ml-8 space-y-2">
                  {group.items.map(item => (
                    <div
                      key={item.id}
                      className="rounded-xl border p-3 flex items-center justify-between cursor-pointer hover:shadow-sm transition-all"
                      style={{
                        backgroundColor: item.kind === 'overdue'
                          ? '#ef444408'
                          : colors.utility.secondaryBackground,
                        borderColor: item.kind === 'overdue'
                          ? '#ef444430'
                          : colors.utility.primaryText + '10',
                      }}
                      onClick={() => navigate(`/contracts/${item.contract_id}`)}
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        {/* Event type icon */}
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{
                            backgroundColor: item.event_type === 'service' ? '#8b5cf620' : '#3b82f620',
                          }}
                        >
                          {item.event_type === 'service' ? (
                            <Wrench className="h-4 w-4" style={{ color: '#8b5cf6' }} />
                          ) : (
                            <DollarSign className="h-4 w-4" style={{ color: '#3b82f6' }} />
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold truncate" style={{ color: colors.utility.primaryText }}>
                              {item.block_name}
                            </span>
                            {item.sequence_number && item.total_occurrences && (
                              <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: colors.utility.primaryText + '08', color: colors.utility.secondaryText }}>
                                #{item.sequence_number}/{item.total_occurrences}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-xs" style={{ color: colors.utility.secondaryText }}>
                            <span>{item.contract_number}</span>
                            <span>•</span>
                            <span className="truncate">{item.contract_name}</span>
                            {item.assigned_to_name && (
                              <>
                                <span>•</span>
                                <span className="flex items-center gap-1">
                                  <User className="h-3 w-3" />
                                  {item.assigned_to_name}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 flex-shrink-0">
                        {/* Amount (billing events) */}
                        {item.amount != null && item.amount > 0 && (
                          <span className="text-sm font-bold" style={{ color: colors.utility.primaryText }}>
                            {formatCurrency(item.amount, item.currency)}
                          </span>
                        )}

                        {/* Timing badge */}
                        <span
                          className="px-2 py-1 rounded-full text-xs font-bold whitespace-nowrap"
                          style={{
                            backgroundColor: item.kind === 'overdue' ? '#ef444420' : item.kind === 'today' ? '#f59e0b20' : '#22c55e20',
                            color: item.kind === 'overdue' ? '#ef4444' : item.kind === 'today' ? '#f59e0b' : '#22c55e',
                          }}
                        >
                          {item.kind === 'overdue'
                            ? `${item.days_diff}d overdue`
                            : item.kind === 'today'
                            ? 'Today'
                            : `in ${item.days_diff}d`}
                        </span>

                        <ChevronRight className="h-4 w-4" style={{ color: colors.utility.secondaryText + '60' }} />
                      </div>
                    </div>
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
