// src/components/contracts/EventScheduleAdjuster.tsx
//
// Bulk date adjustment for a COMPUTED (not yet saved) event schedule.
// Used in two places, both pre-save:
//   1. ContractWizard → EventsPreviewStep  (single contract)
//   2. BulkAssignDialog                    (template schedule → N clones)
//
// It owns no schedule of its own: it reads the already-computed events and
// writes into the same `eventOverrides` map ({ eventId → Date }) that the
// wizard has always used for single-date edits, which mapper.ts applies at
// save time. So nothing new is persisted and no API changes are needed.
//
// WHY day-of-month exists: the derivation engine spaces recurring cycles by
// fixed day counts (monthly = 30 days), so a monthly series drifts off the
// calendar — 1 Apr → 1 May → 31 May → 30 Jun, i.e. two bills in May and none
// in June. Snapping billing to a chosen day of month straightens that out
// without touching the engine.

import React, { useMemo, useState } from 'react';
import { CalendarRange, RotateCcw, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import type { ContractEvent } from '@/utils/service-contracts/contractEvents';

export type AdjusterScope = 'all' | 'billing' | 'future';

export interface EventScheduleAdjusterProps {
  /** Events as computed from the current wizard/draft state (pre-override). */
  events: ContractEvent[];
  /** Current overrides — the single source of truth for adjustments. */
  eventOverrides: Record<string, Date>;
  onEventOverridesChange: (overrides: Record<string, Date>) => void;
  /** Shown in the summary line, e.g. "applies to all 18 contracts". */
  appliesToNote?: string;
}

const DOM_OPTIONS: Array<{ value: string; label: string }> = [
  { value: '1', label: '1st' },
  { value: '5', label: '5th' },
  { value: '10', label: '10th' },
  { value: '15', label: '15th' },
  { value: '20', label: '20th' },
  { value: '25', label: '25th' },
  { value: 'last', label: 'Last day' },
];

const FUTURE_FROM_INDEX = 1; // "future" = everything after the first event

/** Effective date for an event = override if present, else its computed date. */
const dateOf = (e: ContractEvent, ov: Record<string, Date>): Date =>
  ov[e.id] || e.scheduled_date;

const monthKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}`;

const EventScheduleAdjuster: React.FC<EventScheduleAdjusterProps> = ({
  events,
  eventOverrides,
  onEventOverridesChange,
  appliesToNote,
}) => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;
  const brand = colors.brand.primary;

  const [dom, setDom] = useState<string>('1');
  const [shiftDays, setShiftDays] = useState<string>('7');
  const [scope, setScope] = useState<AdjusterScope>('all');

  // Events in effective-date order — "future" scope and the drift audit both
  // depend on the order the user actually sees.
  const ordered = useMemo(
    () =>
      [...events].sort(
        (a, b) => dateOf(a, eventOverrides).getTime() - dateOf(b, eventOverrides).getTime()
      ),
    [events, eventOverrides]
  );

  const inScope = (e: ContractEvent, index: number): boolean => {
    if (scope === 'billing') return e.event_type === 'billing';
    if (scope === 'future') return index >= FUTURE_FROM_INDEX;
    return true;
  };

  // Billing months holding more than one billing event — the readable symptom
  // of day-count drift. Service visits are excluded: a fortnightly visit
  // legitimately lands twice in a month.
  const clashingMonths = useMemo(() => {
    const counts = new Map<string, number>();
    ordered
      .filter((e) => e.event_type === 'billing')
      .forEach((e) => {
        const k = monthKey(dateOf(e, eventOverrides));
        counts.set(k, (counts.get(k) || 0) + 1);
      });
    return Array.from(counts.values()).filter((c) => c > 1).length;
  }, [ordered, eventOverrides]);

  /**
   * Snapping a drifted series to one day-of-month can land two billing events
   * on the same date. Push each colliding event to the next month so the
   * series stays one-per-month — which is the whole point of the action.
   */
  const dedupeBillingMonths = (next: Record<string, Date>) => {
    const bills = [...events]
      .filter((e) => e.event_type === 'billing')
      .sort((a, b) => dateOf(a, next).getTime() - dateOf(b, next).getTime());

    const seen = new Set<string>();
    bills.forEach((e) => {
      let d = dateOf(e, next);
      let key = monthKey(d);
      // Guard the loop: a schedule can't need more hops than it has events.
      let hops = 0;
      while (seen.has(key) && hops < bills.length + 1) {
        d = new Date(d.getFullYear(), d.getMonth() + 1, d.getDate());
        key = monthKey(d);
        next[e.id] = d;
        hops++;
      }
      seen.add(key);
    });
  };

  const applyDayOfMonth = () => {
    const next = { ...eventOverrides };
    ordered.forEach((e, i) => {
      // Day-of-month is a BILLING concept — a service visit keeps its own
      // cadence and must never jump to the 1st.
      if (e.event_type !== 'billing') return;
      if (!inScope(e, i)) return;
      const d = dateOf(e, eventOverrides);
      const nd = new Date(d.getFullYear(), d.getMonth(), 1);
      if (dom === 'last') nd.setMonth(nd.getMonth() + 1, 0);
      else nd.setDate(parseInt(dom, 10));
      next[e.id] = nd;
    });
    dedupeBillingMonths(next);
    onEventOverridesChange(next);
  };

  const applyShift = () => {
    const n = parseInt(shiftDays, 10);
    if (!n || Number.isNaN(n)) return;
    const next = { ...eventOverrides };
    ordered.forEach((e, i) => {
      if (!inScope(e, i)) return;
      const d = new Date(dateOf(e, eventOverrides));
      d.setDate(d.getDate() + n);
      next[e.id] = d;
    });
    onEventOverridesChange(next);
  };

  const resetAll = () => onEventOverridesChange({});

  const adjustedCount = Object.keys(eventOverrides).length;
  const hasBilling = events.some((e) => e.event_type === 'billing');

  // ── styles (inline, matching the wizard's existing token usage) ──
  const labelStyle: React.CSSProperties = {
    fontSize: 10,
    fontWeight: 800,
    letterSpacing: '0.07em',
    textTransform: 'uppercase',
    color: colors.utility.secondaryText,
    marginBottom: 4,
    display: 'block',
  };
  const controlStyle: React.CSSProperties = {
    fontSize: 13,
    padding: '6px 9px',
    borderRadius: 9,
    border: `1px solid ${colors.utility.primaryText}20`,
    background: colors.utility.secondaryBackground,
    color: colors.utility.primaryText,
  };
  const btnStyle: React.CSSProperties = {
    fontSize: 12.5,
    fontWeight: 800,
    padding: '6px 13px',
    borderRadius: 9,
    border: 'none',
    background: brand,
    color: '#fff',
    cursor: 'pointer',
  };
  const ghostBtnStyle: React.CSSProperties = {
    ...btnStyle,
    background: 'transparent',
    color: colors.utility.secondaryText,
    border: `1px solid ${colors.utility.primaryText}20`,
  };

  return (
    <div
      style={{
        borderRadius: 12,
        border: `1px solid ${colors.utility.primaryText}14`,
        background: colors.utility.primaryBackground,
        marginBottom: 14,
        overflow: 'hidden',
      }}
    >
      {/* ── controls ─────────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          gap: 20,
          flexWrap: 'wrap',
          alignItems: 'flex-end',
          padding: '12px 14px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, alignSelf: 'center' }}>
          <CalendarRange size={15} style={{ color: brand }} />
          <span style={{ fontSize: 13, fontWeight: 800, color: colors.utility.primaryText }}>
            Adjust schedule
          </span>
        </div>

        {hasBilling && (
          <div>
            <label style={labelStyle} htmlFor="esa-dom">Billing day of month</label>
            <div style={{ display: 'flex', gap: 6 }}>
              <select
                id="esa-dom"
                value={dom}
                onChange={(e) => setDom(e.target.value)}
                style={controlStyle}
              >
                {DOM_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              <button type="button" onClick={applyDayOfMonth} style={btnStyle}>Apply</button>
            </div>
          </div>
        )}

        <div>
          <label style={labelStyle} htmlFor="esa-shift">Shift dates</label>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <input
              id="esa-shift"
              type="number"
              value={shiftDays}
              onChange={(e) => setShiftDays(e.target.value)}
              style={{ ...controlStyle, width: 68 }}
            />
            <span style={{ fontSize: 12, color: colors.utility.secondaryText }}>days</span>
            <button type="button" onClick={applyShift} style={btnStyle}>Apply</button>
          </div>
        </div>

        <div>
          <label style={labelStyle} htmlFor="esa-scope">Apply to</label>
          <select
            id="esa-scope"
            value={scope}
            onChange={(e) => setScope(e.target.value as AdjusterScope)}
            style={controlStyle}
          >
            <option value="all">All events</option>
            <option value="billing">Billing events only</option>
            <option value="future">All except the first</option>
          </select>
        </div>

        <div style={{ flex: '1 1 auto' }} />

        {adjustedCount > 0 && (
          <button
            type="button"
            onClick={resetAll}
            style={{ ...ghostBtnStyle, display: 'flex', alignItems: 'center', gap: 5 }}
          >
            <RotateCcw size={12} /> Reset all
          </button>
        )}
      </div>

      {/* ── status line: the drift audit, in plain words ─────── */}
      {hasBilling && (
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 7,
            padding: '9px 14px',
            fontSize: 12,
            lineHeight: 1.5,
            background: clashingMonths > 0
              ? `${colors.semantic.warning}14`
              : `${colors.semantic.success}12`,
            color: clashingMonths > 0 ? colors.semantic.warning : colors.semantic.success,
            borderTop: `1px solid ${colors.utility.primaryText}0D`,
          }}
        >
          {clashingMonths > 0 ? (
            <>
              <AlertTriangle size={13} style={{ flex: 'none', marginTop: 1 }} />
              <span>
                <b>
                  {clashingMonths} calendar month{clashingMonths > 1 ? 's have' : ' has'} two billing
                  events
                </b>{' '}
                — recurring cycles are generated in fixed day counts, so the schedule drifts off the
                calendar. Set a billing day of month to straighten it.
              </span>
            </>
          ) : (
            <>
              <CheckCircle2 size={13} style={{ flex: 'none', marginTop: 1 }} />
              <span>
                <b>One billing event per calendar month.</b>
                {adjustedCount > 0 && (
                  <> {adjustedCount} date{adjustedCount > 1 ? 's' : ''} adjusted
                    {appliesToNote ? ` — ${appliesToNote}` : ''}.</>
                )}
              </span>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default EventScheduleAdjuster;
