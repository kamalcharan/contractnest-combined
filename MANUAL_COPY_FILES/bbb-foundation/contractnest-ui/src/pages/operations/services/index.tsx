// ============================================================================
// Operations → Service Schedule — Stage 2 (v2 after owner feedback)
// Tenant-wide events working list (absorbs the old ServiceSchedule +
// BusinessEvents mocks). Real data: contract-events list + date-summary RPCs.
// v3: inline transition chips (clip-safe), Appointment column + Book action
// v2: hub-style table columns (Task · Contract · Customer · Phone · Email ·
// Date · Status · Action), grouped-by-customer view (contracts-hub pattern)
// with flat toggle, date-summary buckets fixed to the RPC's `total` shape.
// ============================================================================

import React, { useEffect, useMemo, useState } from 'react';
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
  ChevronRight,
  Phone,
  Mail,
  Users,
  List,
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
import { useCreateAppointment } from '@/hooks/queries/useAppointmentQueries';
import type { ContractEvent } from '@/types/contractEvents';

type LaneFilter = 'all' | 'service' | 'billing';
type DatePreset = 'overdue' | 'today' | 'this_week' | 'next_30' | 'upcoming' | 'all';
type ViewMode = 'grouped' | 'flat';

// Row shape = ContractEvent + the customer fields added by migration 011
type EventRow = ContractEvent & {
  contract_number?: string | null;
  contract_name?: string | null;
  task_id?: string | null;
  buyer_id?: string | null;
  buyer_name?: string | null;
  buyer_phone?: string | null;
  buyer_email?: string | null;
  billing_cycle_label?: string | null;
  version?: number;
  appointment_id?: string | null;
  appointment_status?: string | null;
  appointment_scheduled_at?: string | null;
};

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

// Table column template (shared by header + rows). Action column last.
// Cols: Task · Contract · Customer · Phone · Email · Date · Amount · Status · Appointment · [open]
const GRID_COLS = 'minmax(170px,1.3fr) 100px minmax(130px,1fr) 125px minmax(150px,1fr) 100px 110px 120px 130px 44px';

const ServiceSchedulePage: React.FC = () => {
  const navigate = useNavigate();
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  const [lane, setLane] = useState<LaneFilter>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [datePreset, setDatePreset] = useState<DatePreset>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [viewMode, setViewMode] = useState<ViewMode>('grouped');
  const [openStatusMenu, setOpenStatusMenu] = useState<string | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  // ── Data ──
  const summaryQuery = useContractEventDateSummary({});
  const range = presetRange(datePreset);
  const eventsQuery = useContractEvents({
    event_type: lane === 'all' ? undefined : lane,
    status: statusFilter === 'all' ? undefined : statusFilter,
    date_from: range.date_from,
    date_to: range.date_to,
    page,
    per_page: 100,
    sort_by: 'scheduled_date',
    sort_order: datePreset === 'overdue' ? 'desc' : 'asc',
  } as any);

  const { updateStatus, isChangingStatus, changingStatusEventId } = useContractEventOperations();
  const createAppointment = useCreateAppointment();
  const [bookingEventId, setBookingEventId] = useState<string | null>(null);

  // Status config (labels/colors) + allowed transitions per event type
  const serviceStatusMap = useStatusMap('service');
  const billingStatusMap = useStatusMap('billing');
  const serviceTransitions = useTransitionMap('service');
  const billingTransitions = useTransitionMap('billing');

  const events: EventRow[] = (eventsQuery.data?.items as EventRow[]) || [];
  const totalCount = eventsQuery.data?.total_count || 0;
  const pageInfo = eventsQuery.data?.page_info;

  const filteredEvents = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return events;
    return events.filter((e) =>
      [e.block_name, e.contract_name, e.contract_number, e.task_id, e.buyer_name, e.buyer_email, e.buyer_phone]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(term))
    );
  }, [events, searchTerm]);

  // ── Grouped view: by customer (contracts-hub pattern) ──
  const groups = useMemo(() => {
    const map = new Map<string, { key: string; name: string; rows: EventRow[]; overdue: number }>();
    for (const e of filteredEvents) {
      const key = e.buyer_id || e.buyer_name || 'unknown';
      if (!map.has(key)) {
        map.set(key, { key, name: e.buyer_name || 'Unknown customer', rows: [], overdue: 0 });
      }
      const g = map.get(key)!;
      g.rows.push(e);
      if (e.status === 'overdue') g.overdue += 1;
    }
    return Array.from(map.values()).sort((a, b) => b.overdue - a.overdue || b.rows.length - a.rows.length);
  }, [filteredEvents]);

  // Expand all groups by default whenever the group set changes
  useEffect(() => {
    if (viewMode === 'grouped' && groups.length > 0) {
      setExpandedGroups(new Set(groups.map((g) => g.key)));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode, groups.length]);

  const toggleGroup = (key: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const summary: any = summaryQuery.data;

  // NOTE: the date-summary RPC emits `total` per bucket (not `count`),
  // with by_type.{service,billing} — read defensively.
  const bucketCount = (bucket: any): number => Number(bucket?.total ?? bucket?.count ?? 0);

  const bucketDefs: { key: string; label: string; preset: DatePreset; color: string; extraKeys?: string[] }[] = [
    { key: 'overdue', label: 'Overdue', preset: 'overdue', color: colors.semantic.error },
    { key: 'today', label: 'Today', preset: 'today', color: colors.semantic.warning },
    { key: 'this_week', label: 'This week', preset: 'this_week', color: colors.brand.primary, extraKeys: ['tomorrow'] },
    { key: 'later', label: 'Upcoming', preset: 'upcoming', color: colors.utility.secondaryText, extraKeys: ['next_week'] },
  ];

  const statusInfo = (event: EventRow) => {
    const map = event.event_type === 'billing' ? billingStatusMap : serviceStatusMap;
    const def: any = (map as any)?.[event.status];
    return {
      label: def?.display_name || event.status.replace(/_/g, ' '),
      color: def?.hex_color || colors.utility.secondaryText,
    };
  };

  const allowedTransitions = (event: EventRow): string[] => {
    const map = event.event_type === 'billing' ? billingTransitions : serviceTransitions;
    return ((map as any)?.[event.status] as string[]) || [];
  };

  const handleStatusChange = async (event: EventRow, newStatus: string) => {
    setOpenStatusMenu(null);
    try {
      await updateStatus({
        eventId: event.id,
        newStatus: newStatus as any,
        version: event.version as any,
      });
    } catch {
      // errors are toasted by the mutation hook (409/422 handling included)
    }
  };

  // Status filter options, grouped by event type (service vs billing) so the
  // dropdown demarks the two sets instead of flattening them together.
  const toStatusList = (map: any) =>
    Object.entries(map || {})
      .map(([code, def]: any) => ({
        code,
        label: def?.display_name || code.replace(/_/g, ' '),
        order: def?.display_order ?? 999,
      }))
      .sort((a, b) => a.order - b.order);
  const serviceStatusList = useMemo(() => toStatusList(serviceStatusMap), [serviceStatusMap]);
  const billingStatusList = useMemo(() => toStatusList(billingStatusMap), [billingStatusMap]);

  // ── Row renderer (table-style grid; inline expanding transition chips —
  //    the EventCard pattern; absolute menus get clipped by the scroll container) ──
  const handleBookAppointment = async (event: EventRow) => {
    if (bookingEventId) return;
    setBookingEventId(event.id);
    try {
      await createAppointment.mutateAsync({ event_id: event.id });
      eventsQuery.refetch();
    } finally {
      setBookingEventId(null);
    }
  };

  const appointmentCell = (event: EventRow) => {
    if (event.event_type !== 'service') {
      return <span className="text-[11px]" style={{ color: colors.utility.secondaryText + '80' }}>—</span>;
    }
    if (event.appointment_status) {
      const s = event.appointment_status;
      const color =
        s === 'accepted' ? colors.semantic.success
        : s === 'no_response' ? colors.semantic.error
        : s === 'rescheduled' ? colors.semantic.warning
        : s === 'declined' || s === 'completed' ? colors.utility.secondaryText
        : colors.brand.primary;
      return (
        <button
          onClick={(e) => { e.stopPropagation(); navigate('/ops/appointments'); }}
          title="Open Appointments board"
          className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide truncate max-w-full text-left"
          style={{ backgroundColor: color + '18', color }}
        >
          {s.replace(/_/g, ' ')}
          {s === 'accepted' && event.appointment_scheduled_at
            ? ` · ${formatEventDate(event.appointment_scheduled_at)}`
            : ''}
        </button>
      );
    }
    if (['completed', 'cancelled'].includes(event.status)) {
      return <span className="text-[11px]" style={{ color: colors.utility.secondaryText + '80' }}>—</span>;
    }
    return (
      <button
        onClick={(e) => { e.stopPropagation(); handleBookAppointment(event); }}
        disabled={bookingEventId === event.id}
        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold"
        style={{ backgroundColor: colors.brand.primary, color: '#fff', opacity: bookingEventId === event.id ? 0.6 : 1 }}
      >
        {bookingEventId === event.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <CalendarClock className="h-3 w-3" />}
        Book
      </button>
    );
  };

  const renderRow = (event: EventRow, indent: boolean) => {
    const sInfo = statusInfo(event);
    const transitions = allowedTransitions(event);
    const isBilling = event.event_type === 'billing';
    const isUpdatingThis = isChangingStatus && changingStatusEventId === event.id;
    const isExpanded = openStatusMenu === event.id;

    return (
      <div
        key={event.id}
        className="rounded-lg border"
        style={{
          borderColor: colors.utility.secondaryText + '15',
          marginLeft: indent ? 20 : 0,
          backgroundColor: colors.utility.primaryBackground,
        }}
      >
        <div className="grid items-center gap-2 px-3 py-2.5" style={{ gridTemplateColumns: GRID_COLS }}>
          {/* Task */}
          <div className="flex items-center gap-2 min-w-0">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: (isBilling ? colors.semantic.warning : colors.brand.primary) + '15' }}
            >
              {isBilling ? (
                <DollarSign className="h-3.5 w-3.5" style={{ color: colors.semantic.warning }} />
              ) : (
                <Wrench className="h-3.5 w-3.5" style={{ color: colors.brand.primary }} />
              )}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold truncate" style={{ color: colors.utility.primaryText }}>
                {event.block_name || (isBilling ? 'Billing milestone' : 'Service visit')}
              </p>
              <p className="text-[10px] truncate" style={{ color: colors.utility.secondaryText }}>
                {event.task_id || ''}
                {event.billing_cycle_label ? `${event.task_id ? ' · ' : ''}${event.billing_cycle_label}` : ''}
              </p>
            </div>
          </div>

          {/* Contract # */}
          <button
            onClick={(e) => { e.stopPropagation(); navigate(`/contracts/${event.contract_id}`); }}
            className="text-xs font-semibold text-left truncate hover:underline"
            style={{ color: colors.brand.primary }}
            title={event.contract_name || undefined}
          >
            {event.contract_number || '—'}
          </button>

          {/* Customer */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (event.buyer_id) navigate(`/contacts/${event.buyer_id}`);
            }}
            className="text-xs text-left truncate hover:underline"
            style={{ color: colors.utility.primaryText }}
          >
            {event.buyer_name || '—'}
          </button>

          {/* Phone */}
          <span className="text-[11px] inline-flex items-center gap-1 truncate" style={{ color: colors.utility.secondaryText }}>
            {event.buyer_phone ? (<><Phone className="h-3 w-3 flex-shrink-0" />{event.buyer_phone}</>) : '—'}
          </span>

          {/* Email */}
          <span className="text-[11px] inline-flex items-center gap-1 truncate" style={{ color: colors.utility.secondaryText }}>
            {event.buyer_email ? (<><Mail className="h-3 w-3 flex-shrink-0" />{event.buyer_email}</>) : '—'}
          </span>

          {/* Date */}
          <span className="text-[11px] inline-flex items-center gap-1" style={{ color: colors.utility.secondaryText }}>
            <CalendarClock className="h-3 w-3 flex-shrink-0" />
            {formatEventDate(event.scheduled_date)}
          </span>

          {/* Amount — open balance to be paid (billing only) */}
          {(() => {
            if (!isBilling || event.amount == null) {
              return <span className="text-[11px] text-right" style={{ color: colors.utility.secondaryText + '80' }}>—</span>;
            }
            const gross = Number(event.amount || 0);
            const settled = Number((event as any).amount_settled || 0);
            const openBal = Math.max(0, Math.round((gross - settled) * 100) / 100);
            const isPaid = openBal <= 0.005;
            return (
              <span
                className="text-[11px] font-semibold text-right tabular-nums truncate"
                style={{ color: isPaid ? colors.semantic.success : colors.semantic.warning }}
                title={`Gross ₹${gross.toLocaleString('en-IN')} · Paid ₹${settled.toLocaleString('en-IN')}`}
              >
                {isPaid ? '₹0' : `₹${openBal.toLocaleString('en-IN')}`}
              </span>
            );
          })()}

          {/* Status (click to expand transition chips below the row) */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (transitions.length > 0) setOpenStatusMenu(isExpanded ? null : event.id);
            }}
            disabled={isUpdatingThis}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-semibold max-w-full"
            style={{
              backgroundColor: sInfo.color + '20',
              color: sInfo.color,
              cursor: transitions.length > 0 ? 'pointer' : 'default',
            }}
            title={transitions.length > 0 ? 'Change status' : undefined}
          >
            {isUpdatingThis ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
            <span className="truncate">{sInfo.label}</span>
            {transitions.length > 0 && !isUpdatingThis && (
              <ChevronDown
                className="h-3 w-3 flex-shrink-0 transition-transform"
                style={{ transform: isExpanded ? 'rotate(180deg)' : undefined }}
              />
            )}
          </button>

          {/* Appointment */}
          <div className="min-w-0">{appointmentCell(event)}</div>

          {/* Action: open contract */}
          <button
            onClick={(e) => { e.stopPropagation(); navigate(`/contracts/${event.contract_id}`); }}
            title={isBilling ? 'Open contract (invoices)' : 'Open contract (Start Service)'}
            className="inline-flex items-center justify-center h-7 w-7 rounded-lg border"
            style={{ borderColor: colors.utility.secondaryText + '30', color: colors.utility.secondaryText }}
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Inline transition chips (EventCard pattern — never clipped) */}
        {isExpanded && transitions.length > 0 && (
          <div
            className="flex flex-wrap items-center gap-1.5 px-3 pb-2.5 pt-2 border-t"
            style={{ borderColor: colors.utility.secondaryText + '12' }}
          >
            <span className="text-[10px]" style={{ color: colors.utility.secondaryText }}>
              Change to:
            </span>
            {transitions.map((to) => (
              <button
                key={to}
                onClick={(e) => { e.stopPropagation(); handleStatusChange(event, to); }}
                className="px-2 py-1 rounded-lg text-[10px] font-semibold capitalize hover:opacity-80 border"
                style={{
                  borderColor: colors.brand.primary + '40',
                  color: colors.brand.primary,
                  backgroundColor: colors.brand.primary + '0D',
                }}
              >
                → {to.replace(/_/g, ' ')}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  // ── Loading / error ──
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

  const tableHeader = (
    <div
      className="grid items-center gap-2 px-3 py-2 text-[10px] font-bold uppercase tracking-wider"
      style={{ gridTemplateColumns: GRID_COLS, color: colors.utility.secondaryText }}
    >
      <span>Task</span>
      <span>Contract</span>
      <span>Customer</span>
      <span>Phone</span>
      <span>Email</span>
      <span>Date</span>
      <span className="text-right">Amount</span>
      <span>Status</span>
      <span>Appointment</span>
      <span />
    </div>
  );

  return (
    <div className="p-6 space-y-5" onClick={() => setOpenStatusMenu(null)}>
      {/* Header */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex-1 min-w-[240px]">
          <h1 className="text-2xl font-bold" style={{ color: colors.utility.primaryText }}>
            Event Schedule
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

      {/* Bucket bar (RPC emits `total` per bucket) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {bucketDefs.map((bucket) => {
          const own = bucketCount(summary?.[bucket.key]);
          const extra = (bucket.extraKeys || []).reduce((acc, k) => acc + bucketCount(summary?.[k]), 0);
          const count = own + extra;
          const billingAmt =
            Number(summary?.[bucket.key]?.by_type?.billing ?? 0);
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
              {billingAmt > 0 && (
                <p className="text-[10px]" style={{ color: colors.utility.secondaryText }}>
                  {billingAmt} billing event{billingAmt === 1 ? '' : 's'}
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
            placeholder="Search task, contract, customer, email…"
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
          <optgroup label="Service">
            {serviceStatusList.map((s) => (
              <option key={`svc-${s.code}`} value={s.code}>{s.label}</option>
            ))}
          </optgroup>
          <optgroup label="Billing">
            {billingStatusList.map((s) => (
              <option key={`bil-${s.code}`} value={s.code}>{s.label}</option>
            ))}
          </optgroup>
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
          <option value="all">All dates</option>
          <option value="overdue">Overdue</option>
          <option value="today">Today</option>
          <option value="this_week">This week</option>
          <option value="next_30">Next 30 days</option>
          <option value="upcoming">All upcoming</option>
        </select>

        {/* Grouped / flat toggle (contracts-hub pattern) */}
        <div
          className="inline-flex rounded-lg border p-1"
          style={{ borderColor: colors.utility.secondaryText + '30', backgroundColor: colors.utility.secondaryBackground }}
        >
          {(
            [
              { mode: 'grouped' as ViewMode, icon: Users, label: 'By customer' },
              { mode: 'flat' as ViewMode, icon: List, label: 'Flat' },
            ]
          ).map(({ mode, icon: Icon, label }) => (
            <button
              key={mode}
              onClick={(e) => { e.stopPropagation(); setViewMode(mode); }}
              title={label}
              className="px-2.5 py-1.5 rounded-md text-xs font-semibold inline-flex items-center gap-1.5"
              style={{
                backgroundColor: viewMode === mode ? colors.brand.primary : 'transparent',
                color: viewMode === mode ? '#fff' : colors.utility.secondaryText,
              }}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>

        <span className="text-xs ml-auto" style={{ color: colors.utility.secondaryText }}>
          {filteredEvents.length} of {totalCount} events
        </span>
      </div>

      {/* Event table */}
      <Card>
        <CardContent className="pt-4 overflow-x-auto">
          {filteredEvents.length === 0 ? (
            <div className="flex flex-col items-center py-12 gap-2">
              <Inbox className="h-8 w-8" style={{ color: colors.utility.secondaryText }} />
              <p className="text-sm" style={{ color: colors.utility.secondaryText }}>
                No events match this view
              </p>
            </div>
          ) : viewMode === 'flat' ? (
            <div className="space-y-1.5 min-w-[1300px]">
              {tableHeader}
              {filteredEvents.map((event) => renderRow(event, false))}
            </div>
          ) : (
            <div className="space-y-2 min-w-[1300px]">
              {tableHeader}
              {groups.map((group) => {
                const isExpanded = expandedGroups.has(group.key);
                return (
                  <div key={group.key} className="space-y-1.5">
                    {/* Customer group header (hub pattern) */}
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleGroup(group.key); }}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg border text-left"
                      style={{
                        borderColor: colors.utility.secondaryText + '20',
                        backgroundColor: colors.utility.secondaryBackground,
                      }}
                    >
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 flex-shrink-0" style={{ color: colors.utility.secondaryText }} />
                      ) : (
                        <ChevronRight className="h-4 w-4 flex-shrink-0" style={{ color: colors.utility.secondaryText }} />
                      )}
                      <Users className="h-4 w-4 flex-shrink-0" style={{ color: colors.brand.primary }} />
                      <span className="text-sm font-bold" style={{ color: colors.utility.primaryText }}>
                        {group.name}
                      </span>
                      <span className="text-xs" style={{ color: colors.utility.secondaryText }}>
                        {group.rows.length} event{group.rows.length === 1 ? '' : 's'}
                      </span>
                      {group.overdue > 0 && (
                        <span
                          className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                          style={{ backgroundColor: colors.semantic.error + '15', color: colors.semantic.error }}
                        >
                          {group.overdue} overdue
                        </span>
                      )}
                    </button>
                    {isExpanded && group.rows.map((event) => renderRow(event, true))}
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
