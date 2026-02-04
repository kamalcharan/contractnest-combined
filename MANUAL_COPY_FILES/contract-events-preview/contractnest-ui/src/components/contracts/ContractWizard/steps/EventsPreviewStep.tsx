// src/components/contracts/ContractWizard/steps/EventsPreviewStep.tsx
// Events Preview — shows computed service + billing events timeline
// User can adjust scheduled dates before finalizing

import React, { useMemo, useState, useCallback } from 'react';
import {
  Calendar, DollarSign, Wrench, Clock, ChevronDown, ChevronUp,
  AlertTriangle, CheckCircle2, Edit3, RotateCcw,
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
  // Event overrides (user-adjusted dates)
  eventOverrides: Record<string, Date>; // eventId → adjusted date
  onEventOverridesChange: (overrides: Record<string, Date>) => void;
}

// Format currency
const fmtCurrency = (amount: number, currency: string): string => {
  const sym = getCurrencySymbol(currency);
  return `${sym}${amount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
};

// Format date for input
const toInputDate = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

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

  const [collapsedDates, setCollapsedDates] = useState<Set<string>>(new Set());
  const [editingEventId, setEditingEventId] = useState<string | null>(null);

  // Compute events
  const computedEvents = useMemo(() => {
    const input: ComputeEventsInput = {
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
    };
    return computeContractEvents(input);
  }, [startDate, durationValue, durationUnit, selectedBlocks, paymentMode, emiMonths, perBlockPaymentType, billingCycleType, grandTotal, currency]);

  // Apply overrides to events
  const events: ContractEvent[] = useMemo(() => {
    return computedEvents.map(e => {
      if (eventOverrides[e.id]) {
        return { ...e, scheduled_date: eventOverrides[e.id] };
      }
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

  const toggleDateCollapse = useCallback((dateKey: string) => {
    setCollapsedDates(prev => {
      const next = new Set(prev);
      if (next.has(dateKey)) next.delete(dateKey);
      else next.add(dateKey);
      return next;
    });
  }, []);

  const hasOverrides = Object.keys(eventOverrides).length > 0;

  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Calendar className="w-12 h-12 mb-4" style={{ color: colors.utility.secondaryText }} />
        <h3 className="text-lg font-semibold mb-2" style={{ color: colors.utility.primaryText }}>
          No Events to Preview
        </h3>
        <p className="text-sm text-center max-w-md" style={{ color: colors.utility.secondaryText }}>
          Add service blocks with pricing and configure billing to generate contract events.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Summary Bar ── */}
      <div
        className="grid grid-cols-2 sm:grid-cols-4 gap-3"
      >
        {[
          {
            label: 'Total Events',
            value: summary.totalEvents.toString(),
            icon: <Calendar className="w-4 h-4" />,
            color: colors.brand.primary,
          },
          {
            label: 'Service Events',
            value: summary.serviceEvents.toString(),
            icon: <Wrench className="w-4 h-4" />,
            color: colors.semantic.success,
          },
          {
            label: 'Billing Events',
            value: summary.billingEvents.toString(),
            icon: <DollarSign className="w-4 h-4" />,
            color: colors.semantic.warning,
          },
          {
            label: 'Span',
            value: `${summary.spanDays} days`,
            icon: <Clock className="w-4 h-4" />,
            color: colors.utility.secondaryText,
          },
        ].map((stat, idx) => (
          <div
            key={idx}
            className="p-3 rounded-xl border"
            style={{
              borderColor: isDarkMode ? colors.utility.secondaryBackground : '#E5E7EB',
              backgroundColor: isDarkMode ? colors.utility.secondaryBackground : '#FAFAFA',
            }}
          >
            <div className="flex items-center gap-2 mb-1">
              <span style={{ color: stat.color }}>{stat.icon}</span>
              <span className="text-[10px] uppercase tracking-wide font-medium" style={{ color: colors.utility.secondaryText }}>
                {stat.label}
              </span>
            </div>
            <span className="text-lg font-bold" style={{ color: colors.utility.primaryText }}>
              {stat.value}
            </span>
          </div>
        ))}
      </div>

      {/* ── Override Indicator ── */}
      {hasOverrides && (
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs"
          style={{
            backgroundColor: `${colors.semantic.warning}10`,
            color: colors.semantic.warning,
          }}
        >
          <Edit3 className="w-3.5 h-3.5" />
          <span>{Object.keys(eventOverrides).length} event date(s) adjusted from original schedule</span>
        </div>
      )}

      {/* ── Timeline ── */}
      <div className="space-y-2">
        {dateGroups.map((group, gIdx) => {
          const dateKey = group.date.toISOString().split('T')[0];
          const isCollapsed = collapsedDates.has(dateKey);
          const isToday = dateKey === new Date().toISOString().split('T')[0];
          const serviceCount = group.events.filter(e => e.event_type === 'service').length;
          const billingCount = group.events.filter(e => e.event_type === 'billing').length;
          const billingSum = group.events
            .filter(e => e.event_type === 'billing')
            .reduce((s, e) => s + (e.amount || 0), 0);

          return (
            <div
              key={dateKey}
              className="rounded-xl border overflow-hidden"
              style={{
                borderColor: isToday
                  ? colors.brand.primary
                  : isDarkMode ? colors.utility.secondaryBackground : '#E5E7EB',
                backgroundColor: colors.utility.primaryBackground,
              }}
            >
              {/* Date Header */}
              <button
                onClick={() => toggleDateCollapse(dateKey)}
                className="w-full px-4 py-3 flex items-center justify-between hover:opacity-80 transition-opacity"
                style={{
                  background: isToday
                    ? `linear-gradient(135deg, ${colors.brand.primary}10 0%, transparent 100%)`
                    : undefined,
                }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold"
                    style={{
                      backgroundColor: `${colors.brand.primary}12`,
                      color: colors.brand.primary,
                    }}
                  >
                    {group.date.getDate()}
                  </div>
                  <div className="text-left">
                    <div className="text-sm font-semibold" style={{ color: colors.utility.primaryText }}>
                      {group.dateLabel}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      {serviceCount > 0 && (
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full"
                          style={{ backgroundColor: `${colors.semantic.success}12`, color: colors.semantic.success }}>
                          {serviceCount} service
                        </span>
                      )}
                      {billingCount > 0 && (
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full"
                          style={{ backgroundColor: `${colors.semantic.warning}12`, color: colors.semantic.warning }}>
                          {billingCount} billing
                        </span>
                      )}
                      {billingSum > 0 && (
                        <span className="text-[10px] font-medium" style={{ color: colors.utility.secondaryText }}>
                          {fmtCurrency(billingSum, currency)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className="text-xs font-medium px-2 py-1 rounded-full"
                    style={{ backgroundColor: colors.utility.secondaryBackground, color: colors.utility.secondaryText }}
                  >
                    {group.events.length}
                  </span>
                  {isCollapsed ? (
                    <ChevronDown className="w-4 h-4" style={{ color: colors.utility.secondaryText }} />
                  ) : (
                    <ChevronUp className="w-4 h-4" style={{ color: colors.utility.secondaryText }} />
                  )}
                </div>
              </button>

              {/* Event Rows */}
              {!isCollapsed && (
                <div
                  className="border-t"
                  style={{ borderColor: isDarkMode ? colors.utility.secondaryBackground : '#F3F4F6' }}
                >
                  {group.events.map((event) => {
                    const isService = event.event_type === 'service';
                    const isOverridden = !!eventOverrides[event.id];
                    const isEditing = editingEventId === event.id;
                    const accentColor = isService ? colors.semantic.success : colors.semantic.warning;

                    return (
                      <div
                        key={event.id}
                        className="px-4 py-2.5 flex items-center gap-3 border-b last:border-b-0"
                        style={{
                          borderColor: isDarkMode ? `${colors.utility.secondaryBackground}80` : '#F9FAFB',
                          backgroundColor: isOverridden ? `${colors.semantic.warning}04` : undefined,
                        }}
                      >
                        {/* Type Icon */}
                        <div
                          className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{ backgroundColor: `${accentColor}12` }}
                        >
                          {isService ? (
                            <Wrench className="w-3.5 h-3.5" style={{ color: accentColor }} />
                          ) : (
                            <DollarSign className="w-3.5 h-3.5" style={{ color: accentColor }} />
                          )}
                        </div>

                        {/* Event Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold truncate" style={{ color: colors.utility.primaryText }}>
                              {event.block_name}
                            </span>
                            {event.total_occurrences > 1 && (
                              <span
                                className="text-[10px] font-medium px-1.5 py-0.5 rounded-full flex-shrink-0"
                                style={{ backgroundColor: `${accentColor}12`, color: accentColor }}
                              >
                                {event.sequence_number}/{event.total_occurrences}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span
                              className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                              style={{ backgroundColor: `${accentColor}10`, color: accentColor }}
                            >
                              {isService ? 'Service' : event.billing_cycle_label || 'Billing'}
                            </span>
                            {event.amount && (
                              <span className="text-xs font-medium" style={{ color: colors.utility.primaryText }}>
                                {fmtCurrency(event.amount, event.currency || currency)}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Date edit / display */}
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {isEditing ? (
                            <input
                              type="date"
                              defaultValue={toInputDate(event.scheduled_date)}
                              onBlur={(e) => handleDateChange(event.id, e.target.value)}
                              autoFocus
                              className="text-xs px-2 py-1 rounded-lg border"
                              style={{
                                backgroundColor: colors.utility.primaryBackground,
                                borderColor: `${colors.utility.primaryText}20`,
                                color: colors.utility.primaryText,
                              }}
                            />
                          ) : (
                            <button
                              onClick={() => setEditingEventId(event.id)}
                              className="text-xs px-2 py-1 rounded-lg hover:opacity-80 transition-opacity"
                              style={{
                                backgroundColor: isOverridden ? `${colors.semantic.warning}10` : 'transparent',
                                color: isOverridden ? colors.semantic.warning : colors.utility.secondaryText,
                              }}
                              title="Click to adjust date"
                            >
                              {event.scheduled_date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                            </button>
                          )}
                          {isOverridden && !isEditing && (
                            <button
                              onClick={() => handleResetDate(event.id)}
                              className="p-1 rounded hover:opacity-80"
                              title="Reset to original date"
                              style={{ color: colors.utility.secondaryText }}
                            >
                              <RotateCcw className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default EventsPreviewStep;
