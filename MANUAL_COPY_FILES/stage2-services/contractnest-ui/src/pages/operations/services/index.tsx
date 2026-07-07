// ============================================================================
// Operations → Service Schedule — Stage 2
// The tenant-wide events working list (absorbs the old mock ServiceSchedule +
// BusinessEvents pages). Real data: contract-events list + date-summary RPCs,
// status transitions via event-status-config, deep links into contract detail
// (the Tasks tab there hosts Start Service / tickets / evidence).
// The Ops Cockpit stays the at-a-glance summary; this is the full worklist.
// ============================================================================

import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CalendarClock,
  Wrench,
  DollarSign,
  Search,
  RefreshCw,
  ExternalLink,
  AlertTriangle,
  Inbox,
  Loader2,
  ChevronDown,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { useTheme } from '@/contexts/ThemeContext';
import {
  useContractEvents,
  useContractEventDateSummary,
  useContractEventOperations,
} from '@/hooks/queries/useContractEventQueries';
import { useStatusMap, useTransitionMap } from '@/hooks/queries/useEventStatusConfigQueries';
import type { ContractEvent } from '@/types/contractEvents';

type LaneFilter = 'all' | 'service' | 'billing';
type DatePreset = 'overdue' | 'today' | 'this_week' | 'next_30' | 'upcoming' | 'all';

const toISODate = (d: Date): string => d.toISOString().slice(0, 10);

const presetRange = (preset: DatePreset): { date_from?: string; date_to?: string } => {
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  switch (preset) {
    case 'overdue': {
      const y = new Date(start);
      y.setDate(y.getDate() - 1);
      return { date_to: toISODate(y) };
    }
    case 'today':
      return { date_from: toISODate(start), date_to: toISODate(start) };
    case 'this_week': {
      const end = new Date(start);
      end.setDate(end.getDate() + 7);
      return { date_from: toISODate(start), date_to: toISODate(end) };
    }
    case 'next_30': {
      const end = new Date(start);
      end.setDate(end.getDate() + 30);
      return { date_from: toISODate(start), date_to: toISODate(end) };
    }
    case 'upcoming':
      return { date_from: toISODate(start) };
    default:
      return {};
  }
};

const formatEventDate = (value: string): string => {
  const d = new Date(value);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const ServiceSchedulePage: React.FC = () => {
  const navigate = useNavigate();
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  const [lane, setLane] = useState<LaneFilter>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [datePreset, setDatePreset] = useState<DatePreset>('this_week');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [openStatusMenu, setOpenStatusMenu] = useState<string | null>(null);

  // ── Data ──
  const summaryQuery = useContractEventDateSummary({});
  const range = presetRange(datePreset);
  const eventsQuery = useContractEvents({
    event_type: lane === 'all' ? undefined : lane,
    status: statusFilter === 'all' ? undefined : statusFilter,
    date_from: range.date_from,
    date_to: range.date_to,
    page,
    per_page: 50,
    sort_by: 'scheduled_date',
    sort_order: datePreset === 'overdue' ? 'desc' : 'asc',
  } as any);

  const { updateStatus, isChangingStatus, changingStatusEventId } = useContractEventOperations();

  // Status config (labels/colors) + allowed transitions per event type
  const serviceStatusMap = useStatusMap('service');
  const billingStatusMap = useStatusMap('billing');
  const serviceTransitions = useTransitionMap('service');
  const billingTransitions = useTransitionMap('billing');

  const events: ContractEvent[] = eventsQuery.data?.items || [];
  const totalCount = eventsQuery.data?.total_count || 0;
  const pageInfo = eventsQuery.data?.page_info;

  const filteredEvents = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return events;
    return events.filter((e) =>
      [e.block_name, (e as any).contract_title, (e as any).contract_number, (e as any).task_id]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(term))
    );
  }, [events, searchTerm]);

  const summary = summaryQuery.data;

  const bucketDefs: { key: string; label: string; preset: DatePreset; color: string }[] = [
    { key: 'overdue', label: 'Overdue', preset: 'overdue', color: colors.semantic.error },
    { key: 'today', label: 'Today', preset: 'today', color: colors.semantic.warning },
    { key: 'this_week', label: 'This week', preset: 'this_week', color: colors.brand.primary },
    { key: 'later', label: 'Upcoming', preset: 'upcoming', color: colors.utility.secondaryText },
  ];

  const statusInfo = (event: ContractEvent) => {
    const map = event.event_type === 'billing' ? billingStatusMap : serviceStatusMap;
    const def: any = (map as any)?.[event.status];
    return {
      label: def?.display_name || event.status.replace(/_/g, ' '),
      color: def?.hex_color || colors.utility.secondaryText,
    };
  };

  const allowedTransitions = (event: ContractEvent): string[] => {
    const map = event.event_type === 'billing' ? billingTransitions : serviceTransitions;
    return ((map as any)?.[event.status] as string[]) || [];
  };

  const handleStatusChange = async (event: ContractEvent, newStatus: string) => {
    setOpenStatusMenu(null);
    try {
      await updateStatus({
        eventId: event.id,
        newStatus: newStatus as any,
        version: (event as any).version,
      });
    } catch {
      // errors are toasted by the mutation hook (409/422 handling included)
    }
  };

  // Statuses offered in the filter dropdown (union of both lanes)
  const filterStatuses = useMemo(() => {
    const keys = new Set<string>();
    Object.keys((serviceStatusMap as any) || {}).forEach((k) => keys.add(k));
    Object.keys((billingStatusMap as any) || {}).forEach((k) => keys.add(k));
    return Array.from(keys);
  }, [serviceStatusMap, billingStatusMap]);

  if (eventsQuery.isLoading && !eventsQuery.data) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <LoadingSpinner size="lg" />
        <p style={{ color: colors.utility.secondaryText }}>Loading service schedule…</p>
      </div>
    );
  }

  if (eventsQuery.isError) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="flex flex-col items-center py-12 gap-4">
            <AlertTriangle className="h-10 w-10" style={{ color: colors.semantic.error }} />
            <p style={{ color: colors.utility.primaryText }}>Could not load events.</p>
            <button
              onClick={() => eventsQuery.refetch()}
              className="px-4 py-2 rounded-lg text-sm font-semibold"
              style={{ backgroundColor: colors.brand.primary, color: '#fff' }}
            >
              Try again
            </button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-5" onClick={() => setOpenStatusMenu(null)}>
      {/* Header */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex-1 min-w-[240px]">
          <h1 className="text-2xl font-bold" style={{ color: colors.utility.primaryText }}>
            Service Schedule
          </h1>
          <p className="text-sm mt-1" style={{ color: colors.utility.secondaryText }}>
            Every promised event across your contracts — service visits and billing milestones
          </p>
        </div>

        {/* Lane toggle */}
        <div
          className="inline-flex rounded-lg border p-1"
          style={{ borderColor: colors.utility.secondaryText + '30', backgroundColor: colors.utility.secondaryBackground }}
        >
          {(['all', 'service', 'billing'] as LaneFilter[]).map((l) => (
            <button
              key={l}
              onClick={(e) => { e.stopPropagation(); setLane(l); setPage(1); }}
              className="px-3 py-1.5 rounded-md text-sm font-semibold capitalize inline-flex items-center gap-1.5"
              style={{
                backgroundColor: lane === l ? colors.brand.primary : 'transparent',
                color: lane === l ? '#fff' : colors.utility.secondaryText,
              }}
            >
              {l === 'service' && <Wrench className="h-3.5 w-3.5" />}
              {l === 'billing' && <DollarSign className="h-3.5 w-3.5" />}
              {l === 'all' ? 'All events' : l}
            </button>
          ))}
        </div>

        <button
          onClick={(e) => { e.stopPropagation(); eventsQuery.refetch(); summaryQuery.refetch(); }}
          disabled={eventsQuery.isFetching}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border"
          style={{ borderColor: colors.utility.secondaryText + '30', color: colors.utility.secondaryText }}
        >
          <RefreshCw className={`h-4 w-4 ${eventsQuery.isFetching ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Bucket bar (from the date-summary RPC) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {bucketDefs.map((bucket) => {
          const data: any = (summary as any)?.[bucket.key];
          const laterExtra =
            bucket.key === 'later'
              ? ((summary as any)?.tomorrow?.count || 0) + ((summary as any)?.next_week?.count || 0)
              : 0;
          const count = (data?.count || 0) + laterExtra;
          const active = datePreset === bucket.preset;
          return (
            <button
              key={bucket.key}
              onClick={(e) => { e.stopPropagation(); setDatePreset(bucket.preset); setPage(1); }}
              className="rounded-xl border p-3 text-left transition-all"
              style={{
                borderColor: active ? bucket.color : colors.utility.secondaryText + '20',
                backgroundColor: active ? bucket.color + '0D' : colors.utility.secondaryBackground,
                boxShadow: active ? `0 0 0 1px ${bucket.color}` : undefined,
              }}
            >
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: bucket.color }}>
                {bucket.label}
              </p>
              <p className="text-xl font-bold mt-0.5" style={{ color: colors.utility.primaryText }}>
                {summaryQuery.isLoading ? '…' : count}
              </p>
              {data?.billing_amount > 0 && (
                <p className="text-[10px]" style={{ color: colors.utility.secondaryText }}>
                  incl. billing ₹{Number(data.billing_amount).toLocaleString('en-IN')}
                </p>
              )}
            </button>
          );
        })}
      </div>

      {/* Filters row */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: colors.utility.secondaryText }} />
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            placeholder="Search block, contract, task id…"
            className="pl-9 pr-3 py-2 rounded-lg border text-sm w-72 bg-transparent"
            style={{ borderColor: colors.utility.secondaryText + '30', color: colors.utility.primaryText }}
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          onClick={(e) => e.stopPropagation()}
          className="px-3 py-2 rounded-lg border text-sm"
          style={{
            borderColor: colors.utility.secondaryText + '30',
            color: colors.utility.primaryText,
            backgroundColor: colors.utility.primaryBackground,
          }}
        >
          <option value="all">All statuses</option>
          {filterStatuses.map((s) => (
            <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
          ))}
        </select>

        <select
          value={datePreset}
          onChange={(e) => { setDatePreset(e.target.value as DatePreset); setPage(1); }}
          onClick={(e) => e.stopPropagation()}
          className="px-3 py-2 rounded-lg border text-sm"
          style={{
            borderColor: colors.utility.secondaryText + '30',
            color: colors.utility.primaryText,
            backgroundColor: colors.utility.primaryBackground,
          }}
        >
          <option value="overdue">Overdue</option>
          <option value="today">Today</option>
          <option value="this_week">This week</option>
          <option value="next_30">Next 30 days</option>
          <option value="upcoming">All upcoming</option>
          <option value="all">All dates</option>
        </select>

        <span className="text-xs ml-auto" style={{ color: colors.utility.secondaryText }}>
          {filteredEvents.length} of {totalCount} events
        </span>
      </div>

      {/* Event list */}
      <Card>
        <CardContent className="pt-4">
          {filteredEvents.length === 0 ? (
            <div className="flex flex-col items-center py-12 gap-2">
              <Inbox className="h-8 w-8" style={{ color: colors.utility.secondaryText }} />
              <p className="text-sm" style={{ color: colors.utility.secondaryText }}>
                No events match this view
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredEvents.map((event) => {
                const sInfo = statusInfo(event);
                const transitions = allowedTransitions(event);
                const isBilling = event.event_type === 'billing';
                const isUpdatingThis = isChangingStatus && changingStatusEventId === event.id;

                return (
                  <div
                    key={event.id}
                    className="flex flex-wrap items-center gap-3 p-3 rounded-lg border"
                    style={{ borderColor: colors.utility.secondaryText + '18' }}
                  >
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: (isBilling ? colors.semantic.warning : colors.brand.primary) + '15' }}
                    >
                      {isBilling ? (
                        <DollarSign className="h-4 w-4" style={{ color: colors.semantic.warning }} />
                      ) : (
                        <Wrench className="h-4 w-4" style={{ color: colors.brand.primary }} />
                      )}
                    </div>

                    <div className="flex-1 min-w-[220px]">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold" style={{ color: colors.utility.primaryText }}>
                          {event.block_name || (isBilling ? 'Billing milestone' : 'Service visit')}
                        </p>
                        {(event as any).task_id && (
                          <span className="text-[10px] font-mono" style={{ color: colors.utility.secondaryText }}>
                            {(event as any).task_id}
                          </span>
                        )}
                        {(event as any).billing_cycle_label && (
                          <span className="text-[10px]" style={{ color: colors.utility.secondaryText }}>
                            {(event as any).billing_cycle_label}
                          </span>
                        )}
                      </div>
                      <p className="text-xs mt-0.5 inline-flex items-center gap-1.5" style={{ color: colors.utility.secondaryText }}>
                        <CalendarClock className="h-3 w-3" />
                        {formatEventDate(event.scheduled_date)}
                        {(event as any).contract_title ? ` · ${(event as any).contract_title}` : ''}
                        {isBilling && event.amount
                          ? ` · ₹${Number(event.amount).toLocaleString('en-IN')}`
                          : ''}
                      </p>
                    </div>

                    {/* Status badge + transition menu */}
                    <div className="relative">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (transitions.length > 0) {
                            setOpenStatusMenu(openStatusMenu === event.id ? null : event.id);
                          }
                        }}
                        disabled={isUpdatingThis}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold"
                        style={{ backgroundColor: sInfo.color + '20', color: sInfo.color }}
                      >
                        {isUpdatingThis ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                        {sInfo.label}
                        {transitions.length > 0 && <ChevronDown className="h-3 w-3" />}
                      </button>
                      {openStatusMenu === event.id && transitions.length > 0 && (
                        <div
                          className="absolute right-0 top-full mt-1 z-20 rounded-lg border shadow-lg py-1 min-w-[160px]"
                          style={{
                            backgroundColor: colors.utility.primaryBackground,
                            borderColor: colors.utility.secondaryText + '25',
                          }}
                        >
                          {transitions.map((to) => (
                            <button
                              key={to}
                              onClick={(e) => { e.stopPropagation(); handleStatusChange(event, to); }}
                              className="w-full text-left px-3 py-1.5 text-xs capitalize hover:opacity-80"
                              style={{ color: colors.utility.primaryText }}
                            >
                              → {to.replace(/_/g, ' ')}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <button
                      onClick={(e) => { e.stopPropagation(); navigate(`/contracts/${event.contract_id}`); }}
                      title="Open contract (Start Service / tickets live there)"
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border"
                      style={{ borderColor: colors.utility.secondaryText + '30', color: colors.utility.secondaryText }}
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Contract
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {pageInfo && (pageInfo.has_next_page || pageInfo.has_prev_page) && (
            <div className="flex items-center justify-center gap-3 mt-4">
              <button
                disabled={!pageInfo.has_prev_page}
                onClick={(e) => { e.stopPropagation(); setPage((p) => Math.max(1, p - 1)); }}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold border disabled:opacity-40"
                style={{ borderColor: colors.utility.secondaryText + '30', color: colors.utility.secondaryText }}
              >
                Previous
              </button>
              <span className="text-xs" style={{ color: colors.utility.secondaryText }}>
                Page {pageInfo.current_page} of {pageInfo.total_pages}
              </span>
              <button
                disabled={!pageInfo.has_next_page}
                onClick={(e) => { e.stopPropagation(); setPage((p) => p + 1); }}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold border disabled:opacity-40"
                style={{ borderColor: colors.utility.secondaryText + '30', color: colors.utility.secondaryText }}
              >
                Next
              </button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ServiceSchedulePage;
