// src/components/contracts/ContractWizard/steps/EventsPreviewStep.tsx
// Events Preview — vertical timeline with service (left) & billing (right) cards
// User can adjust scheduled dates before finalizing

import React, { useMemo, useState, useCallback } from 'react';
import {
  Calendar, CalendarDays, DollarSign, Wrench, Clock,
  Edit3, RotateCcw, Sparkles, Info, Receipt,
  CheckCircle2, Zap, Bell, Users,
} from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { getCurrencySymbol } from '@/utils/constants/currencies';
import type { ConfigurableBlock } from '@/components/catalog-studio/BlockCardConfigurable';
import {
  computeContractEvents,
  summarizeEvents,
  groupEventsByDate,
  type ContractEvent,
  type ComputeEventsInput,
} from '@/utils/service-contracts/contractEvents';

export interface EventsPreviewStepProps {
  startDate: Date;
  durationValue: number;
  durationUnit: string;
  selectedBlocks: ConfigurableBlock[];
  paymentMode: 'prepaid' | 'emi' | 'defined';
  emiMonths: number;
  perBlockPaymentType: Record<string, 'prepaid' | 'postpaid'>;
  billingCycleType: 'unified' | 'mixed' | null;
  grandTotal: number;
  currency: string;
  eventOverrides: Record<string, Date>;
  onEventOverridesChange: (overrides: Record<string, Date>) => void;
}

// ─── Helpers ───

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Format date as "5-Feb-2025" */
const formatEventDate = (d: Date): string =>
  `${d.getDate()}-${MONTHS[d.getMonth()]}-${d.getFullYear()}`;

const fmtCurrency = (amount: number, cur: string): string => {
  const sym = getCurrencySymbol(cur);
  return `${sym}${amount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
};

const toInputDate = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

// ─── Component ───

const EventsPreviewStep: React.FC<EventsPreviewStepProps> = ({
  startDate,
  durationValue,
  durationUnit,
  selectedBlocks,
  paymentMode,
  emiMonths,
  perBlockPaymentType,
  billingCycleType,
  grandTotal,
  currency,
  eventOverrides,
  onEventOverridesChange,
}) => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  const [editingEventId, setEditingEventId] = useState<string | null>(null);

  // ── Compute events ──
  const computedEvents = useMemo(() => {
    const input: ComputeEventsInput = {
      startDate, durationValue, durationUnit, selectedBlocks,
      paymentMode, emiMonths, perBlockPaymentType, billingCycleType,
      grandTotal, currency,
    };
    return computeContractEvents(input);
  }, [startDate, durationValue, durationUnit, selectedBlocks, paymentMode, emiMonths, perBlockPaymentType, billingCycleType, grandTotal, currency]);

  // Apply overrides
  const events: ContractEvent[] = useMemo(() => {
    return computedEvents.map(e => {
      if (eventOverrides[e.id]) return { ...e, scheduled_date: eventOverrides[e.id] };
      return e;
    }).sort((a, b) => {
      const dd = a.scheduled_date.getTime() - b.scheduled_date.getTime();
      if (dd !== 0) return dd;
      if (a.event_type === 'service' && b.event_type === 'billing') return -1;
      if (a.event_type === 'billing' && b.event_type === 'service') return 1;
      return 0;
    });
  }, [computedEvents, eventOverrides]);

  const summary = useMemo(() => summarizeEvents(events), [events]);
  const dateGroups = useMemo(() => groupEventsByDate(events), [events]);

  // ── Handlers ──
  const handleDateChange = useCallback((eventId: string, newDate: string) => {
    const d = new Date(newDate);
    if (!isNaN(d.getTime())) {
      onEventOverridesChange({ ...eventOverrides, [eventId]: d });
    }
    setEditingEventId(null);
  }, [eventOverrides, onEventOverridesChange]);

  const handleResetDate = useCallback((eventId: string) => {
    const updated = { ...eventOverrides };
    delete updated[eventId];
    onEventOverridesChange(updated);
    setEditingEventId(null);
  }, [eventOverrides, onEventOverridesChange]);

  const hasOverrides = Object.keys(eventOverrides).length > 0;

  // ── Render single event card ──
  const renderEventCard = (event: ContractEvent, side: 'left' | 'right') => {
    const isService = event.event_type === 'service';
    const isOverridden = !!eventOverrides[event.id];
    const isEditing = editingEventId === event.id;
    const accent = isService ? colors.semantic.success : colors.semantic.warning;

    return (
      <div
        key={event.id}
        className="w-full max-w-[272px] rounded-xl border shadow-sm hover:shadow-md transition-all"
        style={{
          borderColor: isOverridden ? `${colors.semantic.warning}50` : `${accent}20`,
          backgroundColor: colors.utility.primaryBackground,
          ...(side === 'left'
            ? { borderRight: `3px solid ${accent}` }
            : { borderLeft: `3px solid ${accent}` }),
        }}
      >
        <div className="p-3.5">
          {/* Header: Icon + Name + Sequence */}
          <div className="flex items-center gap-2.5 mb-2">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: `linear-gradient(135deg, ${accent}20, ${accent}08)` }}
            >
              {isService
                ? <Wrench className="w-4 h-4" style={{ color: accent }} />
                : <Receipt className="w-4 h-4" style={{ color: accent }} />
              }
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold truncate" style={{ color: colors.utility.primaryText }}>
                {event.block_name}
              </p>
              <p className="text-[10px]" style={{ color: colors.utility.secondaryText }}>
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
              className="mb-2.5 px-3 py-1.5 rounded-lg"
              style={{ backgroundColor: colors.utility.secondaryBackground }}
            >
              <span className="text-sm font-bold" style={{ color: colors.utility.primaryText }}>
                {fmtCurrency(event.amount, event.currency || currency)}
              </span>
            </div>
          )}

          {/* Bottom: Date control + Status */}
          <div className="flex items-center justify-between gap-2">
            {/* Date control */}
            <div className="flex items-center gap-1 min-w-0">
              {isEditing ? (
                <input
                  type="date"
                  defaultValue={toInputDate(event.scheduled_date)}
                  onBlur={(e) => handleDateChange(event.id, e.target.value)}
                  autoFocus
                  className="text-xs px-2.5 py-1.5 rounded-lg border outline-none w-[138px]"
                  style={{
                    backgroundColor: colors.utility.secondaryBackground,
                    borderColor: colors.brand.primary,
                    color: colors.utility.primaryText,
                  }}
                />
              ) : (
                <button
                  onClick={() => setEditingEventId(event.id)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs transition-all group"
                  style={{
                    backgroundColor: isOverridden ? `${colors.semantic.warning}08` : colors.utility.secondaryBackground,
                    color: isOverridden ? colors.semantic.warning : colors.utility.primaryText,
                    border: `1px dashed ${isOverridden ? colors.semantic.warning + '40' : colors.utility.border}`,
                  }}
                  title="Click to adjust date"
                >
                  <CalendarDays
                    className="w-3.5 h-3.5 flex-shrink-0"
                    style={{ color: isOverridden ? colors.semantic.warning : colors.brand.primary }}
                  />
                  <span className="font-medium whitespace-nowrap">{formatEventDate(event.scheduled_date)}</span>
                  <Edit3 className="w-3 h-3 opacity-0 group-hover:opacity-60 transition-opacity flex-shrink-0" />
                </button>
              )}
              {isOverridden && !isEditing && (
                <button
                  onClick={() => handleResetDate(event.id)}
                  className="p-1 rounded-lg hover:opacity-70 transition-opacity flex-shrink-0"
                  title="Reset to original date"
                  style={{ color: colors.semantic.warning }}
                >
                  <RotateCcw className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Status badge */}
            <span
              className="text-[9px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full flex-shrink-0 whitespace-nowrap"
              style={{ backgroundColor: `${colors.semantic.info}12`, color: colors.semantic.info }}
            >
              Planned
            </span>
          </div>
        </div>
      </div>
    );
  };

  // ── Empty state ──
  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div
          className="w-20 h-20 rounded-2xl flex items-center justify-center mb-6"
          style={{ background: `linear-gradient(135deg, ${colors.brand.primary}15, ${colors.brand.primary}05)` }}
        >
          <Calendar className="w-10 h-10" style={{ color: colors.brand.primary }} />
        </div>
        <h3 className="text-lg font-bold mb-2" style={{ color: colors.utility.primaryText }}>
          No Events to Preview
        </h3>
        <p className="text-sm text-center max-w-md" style={{ color: colors.utility.secondaryText }}>
          Add service blocks with pricing and configure billing to generate contract events.
        </p>
      </div>
    );
  }

  // ════════════════════════════════════════════════════
  // MAIN RENDER — Two-column: Timeline + Info Panel
  // ════════════════════════════════════════════════════
  return (
    <div className="flex gap-8 min-h-0">

      {/* ═══ LEFT: Vertical Timeline ═══ */}
      <div className="flex-[2] min-w-0 pb-8">

        {/* Override indicator */}
        {hasOverrides && (
          <div
            className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-xs font-medium mb-6"
            style={{
              background: `linear-gradient(135deg, ${colors.semantic.warning}08, ${colors.semantic.warning}03)`,
              border: `1px solid ${colors.semantic.warning}25`,
              color: colors.semantic.warning,
            }}
          >
            <Edit3 className="w-4 h-4 flex-shrink-0" />
            <span>{Object.keys(eventOverrides).length} event date(s) adjusted from original schedule</span>
          </div>
        )}

        {/* Timeline container */}
        <div className="relative">

          {/* Vertical center line */}
          <div
            className="absolute left-1/2 transform -translate-x-1/2 top-6 bottom-6 w-0.5 rounded-full"
            style={{
              background: `linear-gradient(180deg, transparent 0%, ${colors.brand.primary}25 8%, ${colors.brand.primary}25 92%, transparent 100%)`,
            }}
          />

          {/* Date groups */}
          <div className="space-y-10">
            {dateGroups.map((group, gIdx) => {
              const dateKey = group.date.toISOString().split('T')[0];
              const serviceEvts = group.events.filter(e => e.event_type === 'service');
              const billingEvts = group.events.filter(e => e.event_type === 'billing');
              const dayNum = Math.max(1, Math.round(
                (group.date.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
              ) + 1);
              const isFirst = gIdx === 0;
              const isLast = gIdx === dateGroups.length - 1;

              return (
                <div key={dateKey} className="relative flex items-start">

                  {/* LEFT COLUMN: Service event cards */}
                  <div className="flex-1 flex flex-col gap-3 items-end pr-6 pt-1">
                    {serviceEvts.length > 0 ? (
                      <>
                        {/* Column header (first group only) */}
                        {isFirst && (
                          <div className="flex items-center gap-1.5 mb-1">
                            <Wrench className="w-3 h-3" style={{ color: colors.semantic.success }} />
                            <span
                              className="text-[10px] font-bold uppercase tracking-wider"
                              style={{ color: colors.semantic.success }}
                            >
                              Service Delivery
                            </span>
                          </div>
                        )}
                        {serviceEvts.map(evt => renderEventCard(evt, 'left'))}
                      </>
                    ) : (
                      /* Spacer to keep date node roughly centered */
                      <div className="h-16" />
                    )}
                  </div>

                  {/* CENTER: Date node on vertical line */}
                  <div className="relative z-10 flex flex-col items-center flex-shrink-0" style={{ width: '6rem' }}>
                    {/* Connector dot above (except first) */}
                    {!isFirst && (
                      <div
                        className="w-1.5 h-1.5 rounded-full mb-2"
                        style={{ backgroundColor: `${colors.brand.primary}30` }}
                      />
                    )}

                    {/* Main date circle */}
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center shadow-lg"
                      style={{
                        background: `linear-gradient(135deg, ${colors.brand.primary}, ${colors.brand.primary}CC)`,
                        boxShadow: `0 4px 14px ${colors.brand.primary}30`,
                      }}
                    >
                      <span className="text-sm font-bold text-white">
                        {group.date.getDate()}
                      </span>
                    </div>

                    {/* Month-Year label */}
                    <span
                      className="text-[10px] font-bold mt-1.5 whitespace-nowrap"
                      style={{ color: colors.utility.primaryText }}
                    >
                      {MONTHS[group.date.getMonth()]} {group.date.getFullYear()}
                    </span>

                    {/* Day number badge */}
                    <span
                      className="text-[9px] font-semibold mt-0.5 px-2 py-0.5 rounded-full"
                      style={{
                        backgroundColor: `${colors.brand.primary}10`,
                        color: colors.brand.primary,
                      }}
                    >
                      Day {dayNum}
                    </span>

                    {/* Connector dot below (except last) */}
                    {!isLast && (
                      <div
                        className="w-1.5 h-1.5 rounded-full mt-2"
                        style={{ backgroundColor: `${colors.brand.primary}30` }}
                      />
                    )}
                  </div>

                  {/* RIGHT COLUMN: Billing event cards */}
                  <div className="flex-1 flex flex-col gap-3 items-start pl-6 pt-1">
                    {billingEvts.length > 0 ? (
                      <>
                        {isFirst && (
                          <div className="flex items-center gap-1.5 mb-1">
                            <DollarSign className="w-3 h-3" style={{ color: colors.semantic.warning }} />
                            <span
                              className="text-[10px] font-bold uppercase tracking-wider"
                              style={{ color: colors.semantic.warning }}
                            >
                              Billing & Payments
                            </span>
                          </div>
                        )}
                        {billingEvts.map(evt => renderEventCard(evt, 'right'))}
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
                backgroundColor: `${colors.brand.primary}08`,
                border: `1px dashed ${colors.brand.primary}25`,
              }}
            >
              <CheckCircle2 className="w-3.5 h-3.5" style={{ color: colors.brand.primary }} />
              <span
                className="text-[11px] font-semibold"
                style={{ color: colors.brand.primary }}
              >
                Contract End &mdash; {summary.spanDays} day span
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ RIGHT: Info Panel (sticky) ═══ */}
      <div className="w-80 flex-shrink-0 space-y-4 sticky top-0 self-start">

        {/* ── Summary Stats ── */}
        <div
          className="rounded-2xl border p-5"
          style={{
            borderColor: isDarkMode ? colors.utility.secondaryBackground : '#E5E7EB',
            backgroundColor: isDarkMode ? colors.utility.secondaryBackground : '#FAFAFA',
          }}
        >
          <h4
            className="text-[10px] font-bold uppercase tracking-wider mb-4"
            style={{ color: colors.utility.secondaryText }}
          >
            Event Summary
          </h4>
          <div className="space-y-3">
            {/* Total */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: `${colors.brand.primary}10` }}
                >
                  <Calendar className="w-3.5 h-3.5" style={{ color: colors.brand.primary }} />
                </div>
                <span className="text-xs" style={{ color: colors.utility.secondaryText }}>Total Events</span>
              </div>
              <span className="text-sm font-bold" style={{ color: colors.utility.primaryText }}>
                {summary.totalEvents}
              </span>
            </div>
            {/* Service */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: `${colors.semantic.success}10` }}
                >
                  <Wrench className="w-3.5 h-3.5" style={{ color: colors.semantic.success }} />
                </div>
                <span className="text-xs" style={{ color: colors.utility.secondaryText }}>Service</span>
              </div>
              <span className="text-sm font-bold" style={{ color: colors.semantic.success }}>
                {summary.serviceEvents}
              </span>
            </div>
            {/* Billing */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: `${colors.semantic.warning}10` }}
                >
                  <DollarSign className="w-3.5 h-3.5" style={{ color: colors.semantic.warning }} />
                </div>
                <span className="text-xs" style={{ color: colors.utility.secondaryText }}>Billing</span>
              </div>
              <span className="text-sm font-bold" style={{ color: colors.semantic.warning }}>
                {summary.billingEvents}
              </span>
            </div>
            {/* Billing Total */}
            {summary.totalBillingAmount > 0 && (
              <div
                className="flex items-center justify-between pt-3 mt-1 border-t"
                style={{ borderColor: `${colors.utility.primaryText}08` }}
              >
                <span className="text-xs font-medium" style={{ color: colors.utility.secondaryText }}>
                  Total Billing
                </span>
                <span className="text-sm font-bold" style={{ color: colors.utility.primaryText }}>
                  {fmtCurrency(summary.totalBillingAmount, currency)}
                </span>
              </div>
            )}
            {/* Span */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: `${colors.utility.secondaryText}10` }}
                >
                  <Clock className="w-3.5 h-3.5" style={{ color: colors.utility.secondaryText }} />
                </div>
                <span className="text-xs" style={{ color: colors.utility.secondaryText }}>Duration</span>
              </div>
              <span className="text-sm font-bold" style={{ color: colors.utility.primaryText }}>
                {summary.spanDays} days
              </span>
            </div>
          </div>
        </div>

        {/* ── About This Screen ── */}
        <div
          className="rounded-2xl border p-5"
          style={{
            borderColor: isDarkMode ? colors.utility.secondaryBackground : '#E5E7EB',
            backgroundColor: isDarkMode ? colors.utility.secondaryBackground : '#FAFAFA',
          }}
        >
          <div className="flex items-center gap-2.5 mb-3">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: `${colors.semantic.info}10` }}
            >
              <Info className="w-4 h-4" style={{ color: colors.semantic.info }} />
            </div>
            <h4 className="text-xs font-bold" style={{ color: colors.utility.primaryText }}>
              About Events Preview
            </h4>
          </div>
          <p
            className="text-[11px] leading-relaxed mb-3"
            style={{ color: colors.utility.secondaryText }}
          >
            This timeline shows every scheduled event in your contract.
            Service deliveries appear on the <strong style={{ color: colors.semantic.success }}>left</strong> and
            billing milestones on the <strong style={{ color: colors.semantic.warning }}>right</strong>.
          </p>
          <p
            className="text-[11px] leading-relaxed mb-4"
            style={{ color: colors.utility.secondaryText }}
          >
            Events are auto-computed from your block configuration, quantities, service cycles, and billing settings.
          </p>

          {/* Editable dates callout */}
          <div
            className="flex items-start gap-2.5 p-3 rounded-xl"
            style={{
              backgroundColor: `${colors.brand.primary}06`,
              border: `1px dashed ${colors.brand.primary}20`,
            }}
          >
            <CalendarDays
              className="w-4 h-4 flex-shrink-0 mt-0.5"
              style={{ color: colors.brand.primary }}
            />
            <div>
              <p className="text-[11px] font-semibold mb-0.5" style={{ color: colors.brand.primary }}>
                Dates are editable
              </p>
              <p className="text-[10px] leading-relaxed" style={{ color: colors.utility.secondaryText }}>
                Click any date on the timeline cards to adjust the schedule.
                Changed dates are highlighted and can be reset anytime.
              </p>
            </div>
          </div>
        </div>

        {/* ── VaNi AI Card ── */}
        <div
          className="rounded-2xl p-5 relative overflow-hidden"
          style={{
            background: `linear-gradient(135deg, ${colors.brand.primary}12 0%, ${colors.brand.primary}06 50%, ${colors.brand.primary}02 100%)`,
            border: `1px solid ${colors.brand.primary}18`,
          }}
        >
          {/* Decorative background sparkle */}
          <div className="absolute -top-2 -right-2 opacity-[0.06] pointer-events-none">
            <Sparkles className="w-24 h-24" style={{ color: colors.brand.primary }} />
          </div>

          <div className="relative z-10">
            {/* Header */}
            <div className="flex items-center gap-2.5 mb-3">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center shadow-sm"
                style={{
                  background: `linear-gradient(135deg, ${colors.brand.primary}, ${colors.brand.primary}BB)`,
                  boxShadow: `0 2px 8px ${colors.brand.primary}30`,
                }}
              >
                <Sparkles className="w-4.5 h-4.5 text-white" />
              </div>
              <div>
                <h4 className="text-xs font-bold" style={{ color: colors.utility.primaryText }}>
                  VaNi AI
                </h4>
                <p className="text-[9px] font-medium" style={{ color: colors.utility.secondaryText }}>
                  Intelligent Event Automation
                </p>
              </div>
            </div>

            <p
              className="text-[11px] leading-relaxed mb-3.5"
              style={{ color: colors.utility.secondaryText }}
            >
              Once the contract is active, VaNi will automatically manage these events:
            </p>

            {/* Feature list */}
            <div className="space-y-2.5">
              {[
                { icon: <Zap className="w-3 h-3" />, label: 'Auto-trigger events on schedule' },
                { icon: <Bell className="w-3 h-3" />, label: 'Send reminders before due dates' },
                { icon: <CheckCircle2 className="w-3 h-3" />, label: 'Track delivery & payment status' },
                { icon: <Users className="w-3 h-3" />, label: 'Manage team allocations' },
              ].map((item, idx) => (
                <div key={idx} className="flex items-center gap-2.5">
                  <div
                    className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: `${colors.brand.primary}12`, color: colors.brand.primary }}
                  >
                    {item.icon}
                  </div>
                  <span className="text-[11px]" style={{ color: colors.utility.primaryText }}>
                    {item.label}
                  </span>
                </div>
              ))}
            </div>

            {/* Subtle footer */}
            <div
              className="mt-4 pt-3 border-t flex items-center gap-1.5"
              style={{ borderColor: `${colors.brand.primary}12` }}
            >
              <Sparkles className="w-3 h-3" style={{ color: `${colors.brand.primary}60` }} />
              <span className="text-[9px] font-medium" style={{ color: `${colors.brand.primary}80` }}>
                Powered by VaNi AI Engine
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventsPreviewStep;
