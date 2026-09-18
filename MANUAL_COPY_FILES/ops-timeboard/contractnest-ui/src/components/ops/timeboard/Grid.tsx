// src/components/ops/timeboard/Grid.tsx
//
// One grid for both Timeboard views. WEEK: a column per day, everyone's
// rows together. DAY: a column per person (then Unassigned, then VaNi) for
// one day. The rows are the board's cards; the blocks are the timed
// services (slot proposed/confirmed) and, in a person's column, their
// follow-ups; everything without a real time sits in the column's top
// strip, where a service can be picked up and dropped onto a time.
//
// Availability hatches the column (day off · holiday · leave · outside the
// hours), a red rule marks now on today, and a clash is a small ⚠ on the
// block — never a refusal, exactly like the tools (024).
//
// Native HTML5 drag and drop: the page owns what a drop MEANS (the confirm
// bar: propose / keep confirmed / assign); the grid only reports
// (card, day, person, minute).

import React, { useMemo, useState } from 'react';
import { Sparkles, ArrowUpRight, AlertTriangle, IndianRupee, PhoneCall, BellRing, CheckCircle2 } from 'lucide-react';
import { useInvoiceTheme } from '../../../pages/invoices/ui';
import { clean } from '@/components/ops/JobCard';
import type { BoardCard } from '@/hooks/queries/useCollectionsQueries';
import {
  type Avail, UNASSIGNED, VANI, availFor, minToHHMM, fmtClock, isService, isTimedService, isFollowUp, isReminder, isDraggable,
  columnOf, startMinOf, durationOf, localDayOf, timedAt, snap, isoDay,
} from './model';

export interface GridColumn { key: string; day: string; personId: string; label: string; sub?: string; isToday?: boolean }
export interface DropTarget { card: BoardCard; day: string; personId: string; start: number }
export interface RollUp { key: 'payments' | 'reminders' | 'followups' | 'declared' | 'other'; label: string; cards: BoardCard[] }

interface Props {
  mode: 'week' | 'day';
  columns: GridColumn[];
  /** every card in the window (the plan's days flattened) */
  cards: BoardCard[];
  avail?: Avail;
  range: { from: number; to: number };
  fallbackMinutes: number;
  selectedId?: string | null;
  busyId?: string | null;
  vaniOn: boolean;
  dragging?: BoardCard | null;
  onDragStart: (card: BoardCard | null) => void;
  onSelect: (card: BoardCard) => void;
  onOpenList: (title: string, cards: BoardCard[]) => void;
  onDrop: (t: DropTarget) => void;
  onOpenVani: () => void;
}

const HOUR = 48; // px per hour
const HEAD_H = 42;
const STRIP_MIN_H = 30; // the strips are one flex row, so all share the tallest one's height and the hours below line up

const cardsOfColumn = (mode: 'week' | 'day', col: GridColumn, cards: BoardCard[], dayOfCard: (c: BoardCard) => string | null) =>
  cards.filter((c) => dayOfCard(c) === col.day && (mode === 'week' || columnOf(c) === col.personId));

const kindRoll = (c: BoardCard): RollUp['key'] =>
  isReminder(c) ? 'reminders' : isFollowUp(c) ? 'followups' : c.kind === 'declaration_pending' ? 'declared' : c.lane === 'collections' ? 'payments' : 'other';

const Grid: React.FC<Props> = ({ mode, columns, cards, avail, range, fallbackMinutes, selectedId, busyId, vaniOn, dragging, onDragStart, onSelect, onOpenList, onDrop, onOpenVani }) => {
  const { colors, ink, sub } = useInvoiceTheme();
  const brand = colors.brand.primary, green = colors.semantic.success, red = colors.semantic.error, amber = colors.semantic.warning;
  const hairline = `${colors.utility.primaryText}14`;
  const mono: React.CSSProperties = { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' };
  const [ghost, setGhost] = useState<{ key: string; start: number } | null>(null);

  const hours = useMemo(() => { const h: number[] = []; for (let m = range.from; m < range.to; m += 60) h.push(m); return h; }, [range]);
  const bodyH = ((range.to - range.from) / 60) * HOUR;
  const yOf = (min: number) => ((min - range.from) / 60) * HOUR;
  const now = new Date();
  const nowDay = isoDay(now), nowMin = now.getHours() * 60 + now.getMinutes();

  /** which local day a card sits on: a timed service → its slot's day; else the plan's anchor day (the card already sits under that day) */
  const anchorDay = (c: BoardCard) => (isTimedService(c) ? localDayOf(timedAt(c)) : localDayOf(c.anchor_at)) || null;

  const colour = (c: BoardCard) =>
    c.kind === 'visit_in_progress' ? brand
    : c.kind === 'visit_overdue' || c.kind === 'rung_due' || c.kind === 'overdue_no_ladder' || c.kind === 'invoice_overdue' ? red
    : c.slot_state === 'confirmed' ? green
    : c.slot_state === 'proposed' || c.kind === 'slot_to_confirm' ? amber
    : isFollowUp(c) ? brand
    : colors.utility.secondaryText;

  const timeFromPointer = (e: React.DragEvent, el: HTMLElement, minutes: number) => {
    const rect = el.getBoundingClientRect();
    const raw = range.from + ((e.clientY - rect.top) / HOUR) * 60;
    return Math.max(range.from, Math.min(range.to - minutes, snap(raw, 15)));
  };

  /** everything a column needs, computed once per column per render */
  const models = useMemo(() => columns.map((col) => {
    const mine = cardsOfColumn(mode, col, cards, anchorDay);
    const a = availFor(avail, mode === 'day' ? col.personId : UNASSIGNED, col.day);
    const timed = mine
      .map((c) => ({ c, start: startMinOf(c) }))
      .filter((x): x is { c: BoardCard; start: number } => x.start != null && (isTimedService(x.c) || (mode === 'day' && (isFollowUp(x.c) || isReminder(x.c)))))
      .map((x) => ({ ...x, minutes: isReminder(x.c) ? 30 : durationOf(x.c, fallbackMinutes) }))
      .sort((x, y) => x.start - y.start);
    const lanes: number[] = []; const laneEnd: number[] = [];
    timed.forEach((t, i) => { let l = laneEnd.findIndex((e) => e <= t.start); if (l < 0) { l = laneEnd.length; laneEnd.push(0); } laneEnd[l] = t.start + t.minutes; lanes[i] = l; });
    const untimed = mine.filter((c) => !timed.some((t) => t.c.id === c.id));
    const stripServices = untimed.filter(isService);
    const rolls: RollUp[] = (['payments', 'reminders', 'followups', 'declared', 'other'] as RollUp['key'][])
      .map((k) => ({ key: k, cards: untimed.filter((c) => !isService(c) && kindRoll(c) === k), label: '' }))
      .filter((r) => r.cards.length)
      .map((r) => ({ ...r, label: r.key === 'payments' ? `${r.cards.length} due` : r.key === 'reminders' ? `${r.cards.length} reminder${r.cards.length === 1 ? '' : 's'}` : r.key === 'followups' ? `${r.cards.length} follow-up${r.cards.length === 1 ? '' : 's'}` : r.key === 'declared' ? `${r.cards.length} declared` : `${r.cards.length} more` }));
    return { col, a, timed, lanes, laneCount: Math.max(1, laneEnd.length), stripServices, rolls, isVani: col.personId === VANI, past: col.day < nowDay };
  }), [columns, cards, avail, mode, fallbackMinutes, nowDay]); // eslint-disable-line react-hooks/exhaustive-deps

  const x: Ctx = { mode, range, selectedId, busyId, vaniOn, dragging, onDragStart, onSelect, onOpenList, onDrop, onOpenVani, ghost, setGhost, colors, ink, sub, brand, red, hairline, mono, hours, bodyH, yOf, nowMin, colour, timeFromPointer, fallbackMinutes };
  const railStyle: React.CSSProperties = { backgroundColor: colors.utility.secondaryBackground };
  const hatch = `repeating-linear-gradient(135deg, ${colors.utility.primaryText}0c 0 6px, transparent 6px 14px)`;

  return (
    <div className="overflow-auto rounded-2xl border" style={{ borderColor: hairline, backgroundColor: colors.utility.secondaryBackground, maxHeight: 'calc(100vh - 240px)' }}>
      <div style={{ minWidth: 48 + columns.length * 150 }}>
        {/* row 1: headers (sticky) */}
        <div className="flex sticky top-0 z-20 border-b" style={{ borderColor: hairline, backgroundColor: colors.utility.secondaryBackground }}>
          <div className="flex-none w-12 sticky left-0 z-20" style={railStyle} />
          {models.map((m) => <ColHead key={m.col.key} m={m} x={x} />)}
        </div>
        {/* row 2: the all-day strips — siblings, so every column's strip is as tall as the tallest and the hours below line up */}
        <div className="flex border-b" style={{ borderColor: hairline, backgroundColor: `${colors.utility.primaryText}05` }}>
          <div className="flex-none w-12 sticky left-0 z-10" style={railStyle} />
          {models.map((m) => <ColStrip key={m.col.key} m={m} x={x} />)}
        </div>
        {/* row 3: the hours */}
        <div className="flex">
          <div className="flex-none w-12 sticky left-0 z-10 relative" style={{ ...railStyle, height: bodyH }}>
            {hours.map((h) => <div key={h} className="absolute right-1.5 text-[9.5px] -translate-y-1/2" style={{ ...mono, ...sub, top: yOf(h) }}>{h === range.from ? '' : fmtClock(h)}</div>)}
          </div>
          {models.map((m) => <ColBody key={m.col.key} m={m} x={x} hatch={hatch} />)}
        </div>
      </div>
    </div>
  );
};

interface Model {
  col: GridColumn; a: ReturnType<typeof availFor>;
  timed: Array<{ c: BoardCard; start: number; minutes: number }>; lanes: number[]; laneCount: number;
  stripServices: BoardCard[]; rolls: RollUp[]; isVani: boolean; past: boolean;
}
interface Ctx {
  mode: 'week' | 'day'; range: { from: number; to: number }; fallbackMinutes: number;
  selectedId?: string | null; busyId?: string | null; vaniOn: boolean; dragging?: BoardCard | null;
  onDragStart: Props['onDragStart']; onSelect: Props['onSelect']; onOpenList: Props['onOpenList']; onDrop: Props['onDrop']; onOpenVani: Props['onOpenVani'];
  ghost: { key: string; start: number } | null; setGhost: (g: { key: string; start: number } | null) => void;
  colors: any; ink: React.CSSProperties; sub: React.CSSProperties; brand: string; red: string; hairline: string; mono: React.CSSProperties;
  hours: number[]; bodyH: number; yOf: (m: number) => number; nowMin: number;
  colour: (c: BoardCard) => string; timeFromPointer: (e: React.DragEvent, el: HTMLElement, minutes: number) => number;
}
const cellClass = 'flex-1 min-w-[150px] border-l';

// The three pieces are module-level components so a re-render (the drag ghost moves on every dragover) never remounts a drop target.
const ColHead: React.FC<{ m: Model; x: Ctx }> = ({ m, x }) => {
  const { col, a, isVani } = m;
  const { colors, ink, sub, brand, hairline, mono, vaniOn } = x;
  return (
    <div className={`${cellClass} px-2 py-1.5 overflow-hidden`} style={{ borderColor: hairline, height: HEAD_H }}>
      <div className="flex items-baseline gap-1.5">
        {col.sub
          ? <><span className="text-[10px] font-bold uppercase tracking-[0.14em]" style={{ ...mono, color: col.isToday ? brand : colors.utility.secondaryText }}>{col.label}</span><span className="text-[13px] font-extrabold" style={ink}>{col.sub}</span></>
          : <span className="text-[13px] font-extrabold truncate" style={ink}>{col.label}</span>}
        {isVani && <Sparkles size={11} style={{ color: vaniOn ? brand : colors.utility.secondaryText }} />}
      </div>
      <div className="text-[10px] truncate" style={sub} title={a.off ? a.off.label : a.leave ? a.leave.label : undefined}>
        {isVani ? (vaniOn ? 'reminders the ladder sends' : 'off — these wait on you')
          : a.off ? a.off.label
          : `${minToHHMM(a.start!)}–${minToHHMM(a.end!)}${a.leave ? ` · ${a.leave.label}` : ''}`}
      </div>
    </div>
  );
};

const ColStrip: React.FC<{ m: Model; x: Ctx }> = ({ m, x }) => {
  const { col, stripServices, rolls, isVani, timed } = m;
  const { colors, red, brand, hairline, selectedId, busyId, vaniOn, onDragStart, onSelect, onOpenList, onOpenVani, setGhost, colour } = x;
  return (
    <div className={`${cellClass} px-1 py-1 flex flex-wrap gap-1 content-start`} style={{ borderColor: hairline, minHeight: STRIP_MIN_H }}>
      {stripServices.map((c) => (
        <button key={c.id} draggable={isDraggable(c) && busyId !== c.id} onDragStart={(e) => { e.dataTransfer.setData('text/plain', c.id); e.dataTransfer.effectAllowed = 'move'; window.setTimeout(() => onDragStart(c), 0); }} onDragEnd={() => { onDragStart(null); setGhost(null); }}
          onClick={() => onSelect(c)} title={`${c.visit?.block_name || 'Service'} · ${c.contract_number} · ${clean(c.buyer_name)} — no time yet: drag onto a time`}
          className="max-w-full inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10.5px] font-bold border truncate cursor-grab active:cursor-grabbing"
          style={{ color: colour(c), borderColor: `${colour(c)}55`, backgroundColor: selectedId === c.id ? `${colour(c)}33` : `${colour(c)}12`, borderStyle: c.slot_state === 'none' || !c.slot_state ? 'dashed' : 'solid' }}>
          {!!c.visit?.clashes?.length && <AlertTriangle size={10} style={{ color: red }} />}
          <span className="truncate">{c.visit?.block_name || c.contract_number}</span>
        </button>
      ))}
      {rolls.map((r) => (
        <button key={r.key} onClick={() => onOpenList(`${col.sub ? `${col.label} ${col.sub}` : col.label} · ${r.label}`, r.cards)} title="Open the list"
          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10.5px] font-bold border"
          style={{ color: r.key === 'payments' && r.cards.some((c) => c.days_overdue > 0) ? red : colors.utility.secondaryText, borderColor: hairline, backgroundColor: colors.utility.primaryBackground }}>
          {r.key === 'payments' ? <IndianRupee size={10} /> : r.key === 'reminders' ? <BellRing size={10} /> : r.key === 'followups' ? <PhoneCall size={10} /> : <CheckCircle2 size={10} />}
          {r.label}
        </button>
      ))}
      {isVani && !vaniOn && rolls.length + timed.length > 0 && (
        <button onClick={onOpenVani} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10.5px] font-bold" style={{ color: brand }}>Open VaNi <ArrowUpRight size={10} /></button>
      )}
    </div>
  );
};

const ColBody: React.FC<{ m: Model; x: Ctx; hatch: string }> = ({ m, x, hatch }) => {
  const { col, a, timed, lanes, laneCount, isVani, past } = m;
  const { mode, range, colors, ink, brand, red, hairline, hours, bodyH, yOf, nowMin, selectedId, busyId, vaniOn, dragging, onDragStart, onSelect, onDrop, ghost, setGhost, colour, timeFromPointer, fallbackMinutes } = x;
  const canDrop = !!dragging && !isVani;
  const dragMinutes = dragging ? durationOf(dragging, fallbackMinutes) : 0;
  const isGhost = ghost?.key === col.key;
  return (
    <div className={`${cellClass} relative`} style={{ borderColor: hairline, height: bodyH, opacity: past ? 0.75 : 1 }}
      onDragOver={(e) => { if (!canDrop) return; e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setGhost({ key: col.key, start: timeFromPointer(e, e.currentTarget, dragMinutes) }); }}
      onDragLeave={(e) => { if (e.currentTarget === e.target) setGhost(null); }}
      onDrop={(e) => { if (!canDrop || !dragging) return; e.preventDefault(); const start = timeFromPointer(e, e.currentTarget, dragMinutes); setGhost(null); onDrop({ card: dragging, day: col.day, personId: mode === 'week' ? (dragging.owner_id || UNASSIGNED) : col.personId, start }); }}>
      {/* hatching for the off-hours */}
      {a.off ? (
        <div className="absolute inset-0" style={{ backgroundImage: hatch }} />
      ) : (
        <>
          {a.start! > range.from && <div className="absolute left-0 right-0" style={{ top: 0, height: yOf(a.start!), backgroundImage: hatch }} />}
          {a.end! < range.to && <div className="absolute left-0 right-0" style={{ top: yOf(a.end!), height: bodyH - yOf(a.end!), backgroundImage: hatch }} />}
        </>
      )}
      {hours.map((h) => <div key={h} className="absolute left-0 right-0 border-t" style={{ top: yOf(h), borderColor: hairline }} />)}
      {col.isToday && nowMin >= range.from && nowMin <= range.to && (
        <div className="absolute left-0 right-0 z-[5] pointer-events-none" style={{ top: yOf(nowMin), borderTop: `2px solid ${red}` }}>
          <span className="absolute -top-1 left-0 w-2 h-2 rounded-full" style={{ backgroundColor: red }} />
        </div>
      )}
      {/* the ghost of what is being dragged */}
      {isGhost && dragging && (
        <div className="absolute left-1 right-1 rounded-md border-2 border-dashed z-[6] pointer-events-none px-1.5 py-0.5 text-[10.5px] font-bold" style={{ top: yOf(ghost!.start), height: Math.max(22, (dragMinutes / 60) * HOUR), borderColor: brand, backgroundColor: `${brand}1a`, color: brand }}>
          {fmtClock(ghost!.start)} · {dragging.visit?.block_name || dragging.contract_number}
        </div>
      )}
      {/* the blocks */}
      {timed.map((t, i) => {
        const c = t.c, k = colour(c);
        const w = 100 / laneCount, left = lanes[i] * w;
        const drag = isDraggable(c) && busyId !== c.id;
        const asked = !!c.visit?.ask?.asked_at;
        const muted = isReminder(c) && !vaniOn;
        return (
          <button key={c.id} draggable={drag} onDragStart={(e) => { e.dataTransfer.setData('text/plain', c.id); e.dataTransfer.effectAllowed = 'move'; window.setTimeout(() => onDragStart(c), 0); }} onDragEnd={() => { onDragStart(null); setGhost(null); }}
            onClick={() => onSelect(c)}
            title={`${isReminder(c) ? 'Reminder' : isFollowUp(c) ? 'Follow-up' : c.visit?.block_name || 'Service'} · ${c.contract_number} · ${clean(c.buyer_name)} · ${fmtClock(t.start)}${c.visit?.clashes?.length ? ` · ⚠ ${c.visit.clashes.map((y) => y.detail).join('; ')}` : ''}`}
            className={`absolute rounded-md border text-left px-1.5 py-0.5 overflow-hidden z-[4] ${drag ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'} ${dragging?.id === c.id ? 'opacity-40' : ''}`}
            style={{ top: yOf(t.start), height: Math.max(22, (t.minutes / 60) * HOUR - 2), left: `calc(${left}% + 2px)`, width: `calc(${w}% - 4px)`,
              borderColor: selectedId === c.id ? k : `${k}66`, borderWidth: selectedId === c.id ? 2 : 1, borderStyle: c.slot_state === 'proposed' && !asked ? 'dashed' : 'solid',
              backgroundColor: muted ? `${colors.utility.secondaryText}14` : `${k}1a`, color: muted ? colors.utility.secondaryText : k }}>
            <div className="flex items-center gap-1 text-[10.5px] font-bold leading-tight">
              {isReminder(c) ? <BellRing size={10} /> : isFollowUp(c) ? <PhoneCall size={10} /> : null}
              {!!c.visit?.clashes?.length && <AlertTriangle size={10} style={{ color: red }} />}
              <span className="truncate">{isReminder(c) ? `Rung ${c.rung?.step ?? c.dunning_step + 1} · ${clean(c.buyer_name) || c.contract_number}` : isFollowUp(c) ? clean(c.buyer_name) || c.contract_number : c.visit?.block_name || c.contract_number}</span>
            </div>
            {t.minutes >= 45 && <div className="text-[10px] truncate opacity-80" style={ink}>{fmtClock(t.start)} · {isReminder(c) || isFollowUp(c) ? c.contract_number : clean(c.buyer_name) || c.contract_number}{mode === 'week' && isService(c) && c.owner_name ? ` · ${c.owner_name}` : ''}</div>}
          </button>
        );
      })}
    </div>
  );
};

export default Grid;
