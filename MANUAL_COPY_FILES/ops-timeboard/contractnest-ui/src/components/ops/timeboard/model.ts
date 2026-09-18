// src/components/ops/timeboard/model.ts
//
// The Timeboard's arithmetic (batch ops-timeboard, POA batch 3). Pure
// functions over what the readers already return — jtd_plan's days of board
// cards (023) and get_team_availability (024). Nothing here talks to the
// network; the page decides what to do with the answers.
//
// One rule from 024 carried through: an event row's scheduled_at carries its
// creation CLOCK time, never a real time — so a service is "timed" only when
// it has a slot (proposed or confirmed). Everything else sits in the day's
// all-day strip until someone (or VaNi) places it.

import type { BoardCard, PlanDay, WlTeamMember } from '@/hooks/queries/useCollectionsQueries';
import type { TeamAvailability } from '@/hooks/queries/useAvailabilityQueries';

export type Avail = TeamAvailability;
export const UNASSIGNED = '__unassigned__';
export const VANI = '__vani__';

// ── time helpers (browser local = IST, the same assumption as every datetime-local in the app) ──
export const pad = (n: number) => String(n).padStart(2, '0');
export const isoDay = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const addDays = (d: Date, n: number) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
export const today0 = () => { const t = new Date(); t.setHours(0, 0, 0, 0); return t; };
export const dayOf = (iso: string) => new Date(`${iso}T00:00:00`);
/** Monday of the week that holds `d` */
export const mondayOf = (d: Date) => { const x = new Date(d); x.setHours(0, 0, 0, 0); const dow = (x.getDay() + 6) % 7; x.setDate(x.getDate() - dow); return x; };
export const hhmmToMin = (s: string | null | undefined, fallback: number) => {
  if (!s) return fallback;
  const m = /^(\d{1,2}):(\d{2})/.exec(s);
  return m ? Number(m[1]) * 60 + Number(m[2]) : fallback;
};
export const minToHHMM = (m: number) => `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
export const fmtClock = (m: number) => {
  const h = Math.floor(m / 60), mm = m % 60;
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}${mm ? `:${pad(mm)}` : ''} ${h < 12 ? 'am' : 'pm'}`;
};
export const fmtDayShort = (day: string) => dayOf(day).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
/** minutes since local midnight of an ISO timestamp, or null */
export const minutesOf = (iso: string | null | undefined): number | null => {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.getHours() * 60 + d.getMinutes();
};
export const localDayOf = (iso: string | null | undefined): string | null => {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : isoDay(d);
};
export const snap = (m: number, step = 15) => Math.round(m / step) * step;

// ── what a card is, for placement ─────────────────────────────────────────
export const isService = (c: BoardCard) => c.lane === 'services';
/** a service with a real slot (proposed or confirmed) — the only rows with a true time */
export const isTimedService = (c: BoardCard) => isService(c) && (c.slot_state === 'proposed' || c.slot_state === 'confirmed') && !!c.visit?.slot?.at;
export const timedAt = (c: BoardCard): string | null => (isTimedService(c) ? c.visit!.slot!.at! : null);
/** a follow-up with a due time */
export const isFollowUp = (c: BoardCard) => c.kind === 'call_open';
/** the ladder's reminders — VaNi's rows */
export const isReminder = (c: BoardCard) => c.kind === 'rung_due' || c.kind === 'rung_ahead';
/** what a person can pick up and move on the board: a service that is not already in progress */
export const isDraggable = (c: BoardCard) => isService(c) && c.kind !== 'visit_in_progress';
export const durationOf = (c: BoardCard, fallback: number) => Math.max(15, c.visit?.duration_minutes || (isFollowUp(c) ? 30 : fallback));
/** which column a card belongs to in the Day view */
export const columnOf = (c: BoardCard): string => {
  if (isService(c)) return c.owner_id || UNASSIGNED;
  if (isFollowUp(c) && c.call_task?.assigned_to) return c.call_task.assigned_to;
  return VANI;
};
/** where the card sits in time inside its day, if anywhere */
export const startMinOf = (c: BoardCard): number | null => {
  if (isService(c)) return minutesOf(timedAt(c));
  if (isFollowUp(c)) return minutesOf(c.call_task?.due_at);
  if (isReminder(c)) return minutesOf(c.anchor_at);
  return null;
};

// ── availability ──────────────────────────────────────────────────────────
export interface DayAvail {
  /** working window in minutes since midnight; null when the whole day is off */
  start: number | null;
  end: number | null;
  off: null | { kind: 'weekly_off' | 'holiday' | 'leave'; label: string };
  /** a half day of leave keeps the other half open */
  leave?: { part: 'am' | 'pm'; label: string };
}
const AM_PM_BOUNDARY = 13 * 60; // 024: 13:00 is the am/pm boundary

const person = (avail: Avail | undefined, personId: string) => avail?.people.find((p) => p.user_id === personId);

/** The hours that apply to one column on one day: a person's own (or inherited), or the organisation's for Unassigned / VaNi. */
export const availFor = (avail: Avail | undefined, personId: string, day: string): DayAvail => {
  const tenant = avail?.tenant;
  const p = personId === UNASSIGNED || personId === VANI ? undefined : person(avail, personId);
  const start = hhmmToMin(p?.work_start || tenant?.work_start, 9 * 60);
  const end = hhmmToMin(p?.work_end || tenant?.work_end, 18 * 60);
  const dow = dayOf(day).getDay();
  const weeklyOff = p?.weekly_off ?? tenant?.weekly_off ?? [0];
  if (weeklyOff.includes(dow)) return { start: null, end: null, off: { kind: 'weekly_off', label: 'day off' } };
  const hol = avail?.holidays.find((h) => h.date === day);
  if (hol) return { start: null, end: null, off: { kind: 'holiday', label: hol.label || 'holiday' } };
  const lv = p?.leave.find((l) => l.date === day);
  if (lv?.part === 'full') return { start: null, end: null, off: { kind: 'leave', label: lv.label || 'on leave' } };
  if (lv?.part === 'am') return { start: Math.max(start, AM_PM_BOUNDARY), end, off: null, leave: { part: 'am', label: lv.label || 'on leave (morning)' } };
  if (lv?.part === 'pm') return { start, end: Math.min(end, AM_PM_BOUNDARY), off: null, leave: { part: 'pm', label: lv.label || 'on leave (afternoon)' } };
  return { start, end, off: null };
};

/** The grid's vertical range: the earliest start and latest end across everyone, padded by an hour, never narrower than 08:00–19:00. */
export const gridRange = (avail: Avail | undefined): { from: number; to: number } => {
  let from = 8 * 60, to = 19 * 60;
  const all = [avail?.tenant, ...(avail?.people || [])].filter(Boolean) as Array<{ work_start: string; work_end: string }>;
  for (const a of all) {
    from = Math.min(from, hhmmToMin(a.work_start, 9 * 60) - 60);
    to = Math.max(to, hhmmToMin(a.work_end, 18 * 60) + 60);
  }
  return { from: Math.max(0, Math.floor(from / 60) * 60), to: Math.min(24 * 60, Math.ceil(to / 60) * 60) };
};

// ── busy intervals + the clash preview (mirrors jtd_slot_check, client-side, for the drag) ──
export interface Busy { start: number; end: number; card: BoardCard }
export const busyFor = (cards: BoardCard[], personId: string, day: string, fallbackMinutes: number, exclude?: string): Busy[] =>
  cards
    .filter((c) => c.id !== exclude && isTimedService(c) && (c.owner_id || UNASSIGNED) === personId && localDayOf(timedAt(c)) === day)
    .map((c) => { const s = minutesOf(timedAt(c))!; return { start: s, end: s + durationOf(c, fallbackMinutes), card: c }; })
    .sort((a, b) => a.start - b.start);

export interface Preview { kind: 'weekly_off' | 'holiday' | 'leave' | 'outside_hours' | 'overlap'; detail: string }
export const previewClashes = (avail: Avail | undefined, cards: BoardCard[], personId: string, day: string, start: number, minutes: number, exclude?: string): Preview[] => {
  const out: Preview[] = [];
  const a = availFor(avail, personId, day);
  if (a.off) out.push({ kind: a.off.kind, detail: a.off.label });
  else {
    const end = start + minutes;
    if (a.leave && ((a.leave.part === 'am' && start < AM_PM_BOUNDARY) || (a.leave.part === 'pm' && end > AM_PM_BOUNDARY))) out.push({ kind: 'leave', detail: a.leave.label });
    if (a.start != null && a.end != null && (start < a.start || end > a.end)) out.push({ kind: 'outside_hours', detail: `outside ${minToHHMM(a.start)}–${minToHHMM(a.end)}` });
  }
  if (personId !== UNASSIGNED && personId !== VANI) {
    for (const b of busyFor(cards, personId, day, minutes, exclude)) {
      if (b.start < start + minutes && b.end > start) out.push({ kind: 'overlap', detail: `overlaps ${b.card.visit?.block_name || 'a service'} · ${b.card.contract_number} at ${minToHHMM(b.start)}` });
    }
  }
  return out;
};

// ── find a slot ───────────────────────────────────────────────────────────
export interface FreeSlot { day: string; start: number; personId: string; personName: string }
/**
 * The next free slots for a service: the technician's own hours (or every
 * person's when unassigned), skipping days off, leave, holidays and timed
 * services, stepping by `step` minutes, within `days` days from `fromDay`.
 */
export const findSlots = (opts: {
  avail: Avail | undefined; cards: BoardCard[]; team: WlTeamMember[]; card: BoardCard;
  fromDay: string; days: number; minutes: number; step?: number; limit?: number;
}): FreeSlot[] => {
  const { avail, cards, team, card, fromDay, days, minutes } = opts;
  const step = opts.step || 30, limit = opts.limit || 6;
  const people = card.owner_id ? [card.owner_id] : team.map((t) => t.user_id);
  const nameOf = (id: string) => team.find((t) => t.user_id === id)?.name || avail?.people.find((p) => p.user_id === id)?.name || 'a technician';
  const now = new Date();
  const nowDay = isoDay(now), nowMin = now.getHours() * 60 + now.getMinutes();
  const out: FreeSlot[] = [];
  for (let i = 0; i < days && out.length < limit; i++) {
    const day = isoDay(addDays(dayOf(fromDay), i));
    for (const pid of people) {
      const a = availFor(avail, pid, day);
      if (a.off || a.start == null || a.end == null) continue;
      const busy = busyFor(cards, pid, day, minutes, card.id);
      let t = Math.ceil(a.start / step) * step;
      if (day === nowDay) t = Math.max(t, Math.ceil((nowMin + 1) / step) * step);
      while (t + minutes <= a.end && out.length < limit) {
        const hit = busy.find((b) => b.start < t + minutes && b.end > t);
        if (hit) { t = Math.ceil(hit.end / step) * step; continue; }
        out.push({ day, start: t, personId: pid, personName: nameOf(pid) });
        break; // one slot per person per day keeps the list varied
      }
    }
  }
  return out.sort((x, y) => (x.day === y.day ? x.start - y.start : x.day < y.day ? -1 : 1)).slice(0, limit);
};

// ── the window's cards by day (the plan already grouped them; this indexes them) ──
export const cardsByDay = (days: PlanDay[]): Map<string, BoardCard[]> => new Map(days.map((d) => [d.day, d.cards]));
export const allCards = (days: PlanDay[]): BoardCard[] => days.flatMap((d) => d.cards);

/** the person columns for the Day view: everyone on the team (a technician with rows but not on the team list is added), then Unassigned, then VaNi */
export const dayColumns = (team: WlTeamMember[], cards: BoardCard[], meId?: string): Array<{ id: string; name: string }> => {
  const cols = new Map<string, string>();
  for (const t of team) cols.set(t.user_id, t.name || 'Teammate');
  for (const c of cards) {
    const id = columnOf(c);
    if (id !== UNASSIGNED && id !== VANI && !cols.has(id)) cols.set(id, c.owner_name || c.visit?.assigned_to_name || c.call_task?.assigned_to_name || 'Teammate');
  }
  const list = Array.from(cols, ([id, name]) => ({ id, name: id === meId ? `${name} (you)` : name }));
  list.sort((a, b) => (a.id === meId ? -1 : b.id === meId ? 1 : a.name.localeCompare(b.name)));
  return [...list, { id: UNASSIGNED, name: 'Unassigned' }, { id: VANI, name: 'VaNi' }];
};

export type { BoardCard };
