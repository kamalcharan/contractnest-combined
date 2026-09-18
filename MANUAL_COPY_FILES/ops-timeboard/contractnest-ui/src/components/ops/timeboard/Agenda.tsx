// src/components/ops/timeboard/Agenda.tsx
//
// The Timeboard on a phone (and the third view on a desktop): the window's
// days as a list, each day's rows in time order — timed services first,
// then everything without a time. A tap opens the same side panel as the
// grids. Nothing here is draggable; on a phone the card's own Schedule
// panel does the moving.

import React from 'react';
import { AlertTriangle, BellRing, PhoneCall, IndianRupee, Wrench } from 'lucide-react';
import { useInvoiceTheme } from '../../../pages/invoices/ui';
import { clean, kindLabel } from '@/components/ops/JobCard';
import type { BoardCard, PlanDay } from '@/hooks/queries/useCollectionsQueries';
import { fmtClock, startMinOf, isService, isFollowUp, isReminder, isTimedService, durationOf } from './model';

const Agenda: React.FC<{
  days: PlanDay[];
  fallbackMinutes: number;
  selectedId?: string | null;
  meId?: string;
  onSelect: (c: BoardCard) => void;
}> = ({ days, fallbackMinutes, selectedId, meId, onSelect }) => {
  const { colors, ink, sub } = useInvoiceTheme();
  const brand = colors.brand.primary, red = colors.semantic.error, green = colors.semantic.success, amber = colors.semantic.warning;
  const hairline = `${colors.utility.primaryText}14`;
  const mono: React.CSSProperties = { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' };
  const colour = (c: BoardCard) =>
    c.kind === 'visit_in_progress' || isFollowUp(c) ? brand
    : c.kind === 'visit_overdue' || c.kind === 'rung_due' || c.days_overdue > 0 ? red
    : c.slot_state === 'confirmed' ? green
    : c.slot_state === 'proposed' || c.kind === 'slot_to_confirm' ? amber
    : colors.utility.secondaryText;

  return (
    <div className="space-y-3">
      {days.map((d) => {
        const rows = [...d.cards].sort((a, b) => {
          const x = isTimedService(a) || isFollowUp(a) || isReminder(a) ? startMinOf(a) : null;
          const y = isTimedService(b) || isFollowUp(b) || isReminder(b) ? startMinOf(b) : null;
          if (x == null && y == null) return 0;
          if (x == null) return 1;
          if (y == null) return -1;
          return x - y;
        });
        const dt = new Date(`${d.day}T00:00:00`);
        return (
          <section key={d.day} className="rounded-2xl border px-3 py-2.5" style={{ borderColor: d.is_today ? `${brand}70` : hairline, backgroundColor: colors.utility.secondaryBackground }}>
            <div className="flex items-baseline gap-2">
              <span className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ ...mono, color: d.is_today ? brand : colors.utility.secondaryText }}>{d.dow}</span>
              <span className="text-[15px] font-extrabold" style={ink}>{dt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
              {d.counts.needs_you > 0 && <span className="text-[10.5px] font-bold" style={{ color: amber }}>{d.counts.needs_you} need you</span>}
              {d.counts.clashes > 0 && <span className="text-[10.5px] font-bold" style={{ color: red }}>{d.counts.clashes} clash{d.counts.clashes === 1 ? '' : 'es'}</span>}
            </div>
            {rows.length === 0 ? <p className="mt-1 text-[11.5px]" style={sub}>Nothing committed.</p> : (
              <ul className="mt-1.5">
                {rows.map((c) => {
                  const start = isTimedService(c) || isFollowUp(c) || isReminder(c) ? startMinOf(c) : null;
                  const k = colour(c);
                  return (
                    <li key={c.id} className="border-t first:border-t-0" style={{ borderColor: hairline }}>
                      <button onClick={() => onSelect(c)} className="w-full flex items-center gap-2.5 py-2 text-left" style={{ backgroundColor: selectedId === c.id ? `${brand}0d` : 'transparent' }}>
                        <span className="w-14 flex-none text-[11px] font-bold tabular-nums" style={{ ...mono, color: start == null ? colors.utility.secondaryText : k }}>
                          {start == null ? '—' : fmtClock(start)}
                        </span>
                        <span className="flex-none" style={{ color: k }}>
                          {isReminder(c) ? <BellRing size={13} /> : isFollowUp(c) ? <PhoneCall size={13} /> : isService(c) ? <Wrench size={13} /> : <IndianRupee size={13} />}
                        </span>
                        <span className="flex-1 min-w-0">
                          <span className="block text-[12.5px] font-bold truncate" style={ink}>
                            {isService(c) ? (c.visit?.block_name || 'Service') : isReminder(c) ? `Reminder · rung ${c.rung?.step ?? c.dunning_step + 1}` : isFollowUp(c) ? 'Follow-up' : kindLabel(c, meId)}
                            <span className="font-normal" style={sub}> · {clean(c.buyer_name) || c.contract_number}</span>
                          </span>
                          <span className="block text-[10.5px] truncate" style={sub}>
                            {c.contract_number}
                            {isService(c) && ` · ${kindLabel(c, meId)}`}
                            {isService(c) && start != null && ` · ${durationOf(c, fallbackMinutes)} min`}
                            {isService(c) && ` · ${c.owner_id ? (c.owner_id === meId ? 'you' : c.owner_name || 'a technician') : 'unassigned'}`}
                            {isFollowUp(c) && c.call_task?.assigned_to_name && ` · ${c.call_task.assigned_to === meId ? 'you' : c.call_task.assigned_to_name}`}
                          </span>
                        </span>
                        {!!c.visit?.clashes?.length && <AlertTriangle size={13} style={{ color: red }} />}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
};

export default Agenda;
