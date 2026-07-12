// src/utils/service-contracts/holidayResolver.ts
// Detects contract service occurrences that land on a tenant holiday and
// computes shift suggestions (N+1 / N-1) using the tenant Cadence Settings.
// Used by the Events Preview step to surface a holiday-clash resolver.

import type { ContractEvent } from './contractEvents';
import type { CadenceSettings } from '@/pages/settings/cadence/useCadenceSettings';

const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** YYYY-MM-DD key in local time (matches the holiday date format). */
const toKey = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const addDays = (d: Date, n: number): Date => {
  const c = new Date(d);
  c.setDate(c.getDate() + n);
  return c;
};

/** True when `date` falls on a weekly holiday (day-of-week) or a specific holiday date. */
export function isHolidayDate(date: Date, settings: CadenceSettings | null | undefined): boolean {
  if (!settings) return false;
  if (Array.isArray(settings.weekly_holidays) && settings.weekly_holidays.includes(date.getDay())) return true;
  const key = toKey(date);
  return (settings.holidays || []).some((h) => h.date === key);
}

/**
 * Walk in `direction` from `date` until a non-holiday day is found. Starts at
 * `date` itself, so a clashing date shifts to the nearest clear day. Capped so
 * a fully-blocked window can't loop forever (returns the last tried date).
 */
export function shiftOffHoliday(
  date: Date,
  direction: 'next' | 'previous',
  settings: CadenceSettings | null | undefined
): Date {
  const step = direction === 'previous' ? -1 : 1;
  let d = new Date(date);
  for (let i = 0; i < 14 && isHolidayDate(d, settings); i++) {
    d = addDays(d, step);
  }
  return d;
}

/** Human-readable reason a date is a holiday (weekday name or the holiday label). */
export function holidayReason(date: Date, settings: CadenceSettings | null | undefined): string {
  if (!settings) return '';
  const key = toKey(date);
  const named = (settings.holidays || []).find((h) => h.date === key);
  if (named) return named.label || 'Holiday';
  if (settings.weekly_holidays?.includes(date.getDay())) return `${WEEKDAY_NAMES[date.getDay()]} (weekly off)`;
  return 'Holiday';
}

export interface HolidayConflict {
  eventId: string;
  blockName: string;
  date: Date;      // the clashing (holiday) date
  nextDate: Date;  // suggestion if shifted forward (N+1)
  prevDate: Date;  // suggestion if shifted backward (N-1)
  reason: string;
}

/**
 * Find every service occurrence whose current date lands on a holiday. Billing
 * events are ignored (money can move on any day); only service delivery /
 * session occurrences are shifted.
 */
export function findHolidayConflicts(
  events: ContractEvent[],
  settings: CadenceSettings | null | undefined
): HolidayConflict[] {
  if (!settings) return [];
  const out: HolidayConflict[] = [];
  for (const e of events) {
    if (e.event_type !== 'service') continue;
    if (!isHolidayDate(e.scheduled_date, settings)) continue;
    out.push({
      eventId: e.id,
      blockName: e.block_name,
      date: e.scheduled_date,
      nextDate: shiftOffHoliday(e.scheduled_date, 'next', settings),
      prevDate: shiftOffHoliday(e.scheduled_date, 'previous', settings),
      reason: holidayReason(e.scheduled_date, settings),
    });
  }
  return out;
}
