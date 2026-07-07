// ============================================================================
// Operations → Appointments — Stage 3 (ux-08 kanban, manual mode)
// Columns: Requested · Accepted · Reschedule · Your follow-up, plus a
// collapsible Closed section (completed + declined = "no appointment needed").
// The scanner auto-requests appointments ~6 days ahead for service events;
// the owner contacts the customer and records the outcome here.
// Accepting with a date syncs the service event's scheduled_date, so the
// Service Schedule reflects the agreed slot. Auto-chasing = VaNi stage.
// ============================================================================

import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CalendarCheck,
  CalendarClock,
  Phone,
  Mail,
  RefreshCw,
  AlertTriangle,
  Inbox,
  Loader2,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  CheckCircle2,
  XCircle,
  Clock,
  RotateCcw,
  BellOff,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { useTheme } from '@/contexts/ThemeContext';
import {
  useAppointments,
  useUpdateAppointment,
  type Appointment,
  type AppointmentStatus,
} from '@/hooks/queries/useAppointmentQueries';

const formatDate = (value: string | null): string => {
  if (!value) return '—';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const formatDateTime = (value: string | null): string => {
  if (!value) return '—';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '—';
  return `${d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}, ${d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true })}`;
};

const daysSince = (value: string): number => {
  const d = new Date(value);
  if (isNaN(d.getTime())) return 0;
  return Math.max(0, Math.floor((Date.now() - d.getTime()) / 86_400_000));
};

// Default datetime-local value: the event date at 10:00
const defaultSlot = (eventDate: string): string => {
  const d = new Date(eventDate);
  const base = isNaN(d.getTime()) || d.getTime() < Date.now() ? new Date() : d;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${base.getFullYear()}-${pad(base.getMonth() + 1)}-${pad(base.getDate())}T10:00`;
};

const AppointmentsPage: React.FC = () => {
  const navigate = useNavigate();
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  const appointmentsQuery = useAppointments();
  const updateMutation = useUpdateAppointment();

  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [acceptSlot, setAcceptSlot] = useState<string>('');
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [showClosed, setShowClosed] = useState(false);

  const appointments = appointmentsQuery.data || [];

  const columns = useMemo(() => {
    const by = (statuses: AppointmentStatus[]) =>
      appointments.filter((a) => statuses.includes(a.status));
    return {
      requested: by(['requested']),
      accepted: by(['accepted']),
      rescheduled: by(['rescheduled']),
      followUp: by(['no_response']),
      closed: by(['completed', 'declined']),
    };
  }, [appointments]);

  const transition = async (
    appt: Appointment,
    status: AppointmentStatus,
    scheduledAt?: string
  ) => {
    if (actioningId) return;
    setActioningId(appt.id);
    try {
      await updateMutation.mutateAsync({
        appointmentId: appt.id,
        status,
        scheduled_at: scheduledAt,
        version: appt.version,
      });
      setAcceptingId(null);
    } finally {
      setActioningId(null);
    }
  };

  const startAccept = (appt: Appointment) => {
    setAcceptingId(appt.id);
    setAcceptSlot(defaultSlot(appt.scheduled_at || appt.event_date));
  };

  const confirmAccept = (appt: Appointment) => {
    if (!acceptSlot) return;
    transition(appt, 'accepted', new Date(acceptSlot).toISOString());
  };

  // ── Card ──
  const renderCard = (appt: Appointment, column: string) => {
    const busy = actioningId === appt.id;
    const stale = daysSince(appt.last_activity_at);

    return (
      <div
        key={appt.id}
        className="rounded-lg border p-3 space-y-2"
        style={{
          borderColor: colors.utility.secondaryText + '20',
          backgroundColor: colors.utility.primaryBackground,
        }}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs font-bold truncate" style={{ color: colors.utility.primaryText }}>
              {appt.buyer_name || 'Unknown customer'}
            </p>
            <p className="text-[10px] truncate" style={{ color: colors.utility.secondaryText }}>
              {appt.block_name || 'Service visit'}
              {appt.task_id ? ` · ${appt.task_id}` : ''}
            </p>
          </div>
          <button
            onClick={() => navigate(`/contracts/${appt.contract_id}`)}
            title={`Open ${appt.contract_number || 'contract'}`}
            className="flex-shrink-0"
          >
            <ExternalLink className="h-3.5 w-3.5" style={{ color: colors.utility.secondaryText }} />
          </button>
        </div>

        <div className="space-y-0.5">
          <p className="text-[10px] inline-flex items-center gap-1 w-full" style={{ color: colors.utility.secondaryText }}>
            <CalendarClock className="h-3 w-3 flex-shrink-0" />
            {appt.status === 'accepted' && appt.scheduled_at
              ? `Confirmed: ${formatDateTime(appt.scheduled_at)}`
              : `Service due: ${formatDate(appt.event_date)}`}
          </p>
          {appt.buyer_phone && (
            <p className="text-[10px] inline-flex items-center gap-1 w-full" style={{ color: colors.utility.secondaryText }}>
              <Phone className="h-3 w-3 flex-shrink-0" />
              {appt.buyer_phone}
            </p>
          )}
          {appt.buyer_email && (
            <p className="text-[10px] inline-flex items-center gap-1 w-full truncate" style={{ color: colors.utility.secondaryText }}>
              <Mail className="h-3 w-3 flex-shrink-0" />
              {appt.buyer_email}
            </p>
          )}
          {column === 'followUp' && stale > 0 && (
            <p className="text-[10px] font-semibold" style={{ color: colors.semantic.error }}>
              {stale} day{stale === 1 ? '' : 's'} since last activity
            </p>
          )}
        </div>

        {/* Accept inline slot picker */}
        {acceptingId === appt.id ? (
          <div className="space-y-1.5">
            <input
              type="datetime-local"
              value={acceptSlot}
              onChange={(e) => setAcceptSlot(e.target.value)}
              className="w-full px-2 py-1 rounded border text-[11px]"
              style={{
                borderColor: colors.brand.primary + '50',
                color: colors.utility.primaryText,
                backgroundColor: colors.utility.secondaryBackground,
              }}
            />
            <div className="flex gap-1.5">
              <button
                onClick={() => confirmAccept(appt)}
                disabled={busy || !acceptSlot}
                className="flex-1 inline-flex items-center justify-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold"
                style={{ backgroundColor: colors.semantic.success, color: '#fff', opacity: busy ? 0.6 : 1 }}
              >
                {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
                Confirm slot
              </button>
              <button
                onClick={() => setAcceptingId(null)}
                disabled={busy}
                className="px-2 py-1 rounded-lg text-[10px] font-semibold border"
                style={{ borderColor: colors.utility.secondaryText + '30', color: colors.utility.secondaryText }}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {(appt.status === 'requested' || appt.status === 'rescheduled' || appt.status === 'no_response') && (
              <button
                onClick={() => startAccept(appt)}
                disabled={busy}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold"
                style={{ backgroundColor: colors.semantic.success, color: '#fff' }}
              >
                <CheckCircle2 className="h-3 w-3" /> Accept
              </button>
            )}
            {(appt.status === 'requested' || appt.status === 'accepted') && (
              <button
                onClick={() => transition(appt, 'rescheduled')}
                disabled={busy}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold border"
                style={{ borderColor: colors.semantic.warning + '60', color: colors.semantic.warning }}
              >
                <RotateCcw className="h-3 w-3" /> Reschedule
              </button>
            )}
            {appt.status === 'accepted' && (
              <button
                onClick={() => transition(appt, 'completed')}
                disabled={busy}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold"
                style={{ backgroundColor: colors.brand.primary, color: '#fff' }}
              >
                <CheckCircle2 className="h-3 w-3" /> Completed
              </button>
            )}
            {(appt.status === 'requested' || appt.status === 'rescheduled') && (
              <button
                onClick={() => transition(appt, 'no_response')}
                disabled={busy}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold border"
                style={{ borderColor: colors.utility.secondaryText + '40', color: colors.utility.secondaryText }}
              >
                <Clock className="h-3 w-3" /> No response
              </button>
            )}
            {appt.status === 'no_response' && (
              <button
                onClick={() => transition(appt, 'requested')}
                disabled={busy}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold border"
                style={{ borderColor: colors.brand.primary + '50', color: colors.brand.primary }}
              >
                <RotateCcw className="h-3 w-3" /> Re-request
              </button>
            )}
            {appt.status !== 'completed' && appt.status !== 'declined' && (
              <button
                onClick={() => {
                  if (window.confirm('Mark as "no appointment needed"? The event stays on the Service Schedule.')) {
                    transition(appt, 'declined');
                  }
                }}
                disabled={busy}
                title="No appointment needed"
                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold border"
                style={{ borderColor: colors.semantic.error + '40', color: colors.semantic.error }}
              >
                <BellOff className="h-3 w-3" /> Not needed
              </button>
            )}
            {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" style={{ color: colors.brand.primary }} />}
          </div>
        )}
      </div>
    );
  };

  // ── Loading / error ──
  if (appointmentsQuery.isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <LoadingSpinner size="lg" />
        <p style={{ color: colors.utility.secondaryText }}>Loading appointments…</p>
      </div>
    );
  }

  if (appointmentsQuery.isError) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="flex flex-col items-center py-12 gap-4">
            <AlertTriangle className="h-10 w-10" style={{ color: colors.semantic.error }} />
            <p style={{ color: colors.utility.primaryText }}>Could not load appointments.</p>
            <button
              onClick={() => appointmentsQuery.refetch()}
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

  const columnDefs = [
    { key: 'requested', title: 'Requested', hint: 'Contact the customer to agree a slot', color: colors.brand.primary, items: columns.requested },
    { key: 'accepted', title: 'Accepted', hint: 'Slot confirmed — shows on Service Schedule', color: colors.semantic.success, items: columns.accepted },
    { key: 'rescheduled', title: 'Reschedule', hint: 'New slot being agreed', color: colors.semantic.warning, items: columns.rescheduled },
    { key: 'followUp', title: 'Your follow-up', hint: 'No response — chase the customer', color: colors.semantic.error, items: columns.followUp },
  ];

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex-1 min-w-[240px]">
          <h1 className="text-2xl font-bold inline-flex items-center gap-2" style={{ color: colors.utility.primaryText }}>
            <CalendarCheck className="h-6 w-6" style={{ color: colors.brand.primary }} />
            Appointments
          </h1>
          <p className="text-sm mt-1" style={{ color: colors.utility.secondaryText }}>
            The scanner requests appointments ~6 days before each service visit — you agree the slot with the
            customer and record it here. Accepting updates the Service Schedule.
          </p>
        </div>
        <button
          onClick={() => appointmentsQuery.refetch()}
          disabled={appointmentsQuery.isFetching}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border"
          style={{ borderColor: colors.utility.secondaryText + '30', color: colors.utility.secondaryText }}
        >
          <RefreshCw className={`h-4 w-4 ${appointmentsQuery.isFetching ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Kanban */}
      {appointments.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center py-16 gap-2">
            <Inbox className="h-8 w-8" style={{ color: colors.utility.secondaryText }} />
            <p className="text-sm" style={{ color: colors.utility.secondaryText }}>
              No appointments yet — the scanner creates requests as service visits approach
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-start">
          {columnDefs.map((col) => (
            <div
              key={col.key}
              className="rounded-xl border p-3 space-y-2"
              style={{
                borderColor: col.color + '30',
                backgroundColor: colors.utility.secondaryBackground,
              }}
            >
              <div className="flex items-center gap-2 px-1">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: col.color }} />
                <p className="text-xs font-bold uppercase tracking-wide" style={{ color: colors.utility.primaryText }}>
                  {col.title}
                </p>
                <span
                  className="ml-auto px-2 py-0.5 rounded-full text-[10px] font-bold"
                  style={{ backgroundColor: col.color + '20', color: col.color }}
                >
                  {col.items.length}
                </span>
              </div>
              <p className="text-[10px] px-1" style={{ color: colors.utility.secondaryText }}>
                {col.hint}
              </p>
              {col.items.length === 0 ? (
                <p className="text-[11px] text-center py-6" style={{ color: colors.utility.secondaryText + '99' }}>
                  Empty
                </p>
              ) : (
                col.items.map((appt) => renderCard(appt, col.key))
              )}
            </div>
          ))}
        </div>
      )}

      {/* Closed (completed + "no appointment needed") */}
      {columns.closed.length > 0 && (
        <Card>
          <CardContent className="pt-4">
            <button
              onClick={() => setShowClosed(!showClosed)}
              className="flex items-center gap-2 w-full"
            >
              {showClosed ? (
                <ChevronDown className="h-4 w-4" style={{ color: colors.utility.secondaryText }} />
              ) : (
                <ChevronRight className="h-4 w-4" style={{ color: colors.utility.secondaryText }} />
              )}
              <span className="text-sm font-bold" style={{ color: colors.utility.primaryText }}>
                Closed
              </span>
              <span className="text-xs" style={{ color: colors.utility.secondaryText }}>
                {columns.closed.filter((a) => a.status === 'completed').length} completed ·{' '}
                {columns.closed.filter((a) => a.status === 'declined').length} no appointment needed
              </span>
            </button>
            {showClosed && (
              <div className="mt-3 space-y-1.5">
                {columns.closed.map((appt) => (
                  <div
                    key={appt.id}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg border"
                    style={{ borderColor: colors.utility.secondaryText + '15' }}
                  >
                    {appt.status === 'completed' ? (
                      <CheckCircle2 className="h-4 w-4 flex-shrink-0" style={{ color: colors.semantic.success }} />
                    ) : (
                      <XCircle className="h-4 w-4 flex-shrink-0" style={{ color: colors.utility.secondaryText }} />
                    )}
                    <span className="text-xs font-semibold" style={{ color: colors.utility.primaryText }}>
                      {appt.buyer_name || 'Unknown customer'}
                    </span>
                    <span className="text-[11px] truncate" style={{ color: colors.utility.secondaryText }}>
                      {appt.block_name || 'Service visit'} · {formatDate(appt.event_date)}
                      {appt.status === 'completed' && appt.scheduled_at ? ` · done ${formatDateTime(appt.scheduled_at)}` : ''}
                    </span>
                    <button
                      onClick={() => navigate(`/contracts/${appt.contract_id}`)}
                      className="ml-auto flex-shrink-0"
                      title="Open contract"
                    >
                      <ExternalLink className="h-3.5 w-3.5" style={{ color: colors.utility.secondaryText }} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AppointmentsPage;
