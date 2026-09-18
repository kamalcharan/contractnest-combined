// src/components/users/AvailabilityCard.tsx
//
// "Working hours & leave" on a user's page (Settings → Users → user), migration
// jtd-nucleus/024. Hours and weekly off default to the organisation's cadence
// settings; a person can carry their own. Leave is a date — a full day, a
// morning or an afternoon — with a label. The Ops board reads all of this:
// a slot outside these hours, on a day off or on leave shows a red pill, and
// "Plan this day" starts from the organisation's hours.

import React, { useEffect, useMemo, useState } from 'react';
import { CalendarClock, Loader2, Plus, Trash2 } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { useVaNiToast } from '@/components/common/toast/VaNiToast';
import { useUserAvailability, useSetUserAvailability, useAddUserLeave, useRemoveUserLeave, availabilityError, type LeavePart } from '@/hooks/queries/useAvailabilityQueries';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const todayISO = () => { const d = new Date(); const p = (n: number) => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`; };
const fmtDay = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
const partLabel = (p: LeavePart) => (p === 'am' ? 'Morning' : p === 'pm' ? 'Afternoon' : 'Full day');
const sameSet = (a: number[], b: number[]) => JSON.stringify([...a].sort()) === JSON.stringify([...b].sort());

const AvailabilityCard: React.FC<{ userId: string }> = ({ userId }) => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;
  const { addToast } = useVaNiToast();
  const q = useUserAvailability(userId);
  const setAvail = useSetUserAvailability();
  const addLeave = useAddUserLeave();
  const removeLeave = useRemoveUserLeave();
  const data = q.data;

  // ── hours form (own vs organisation) ──
  const [own, setOwn] = useState(false);
  const [start, setStart] = useState('09:00');
  const [end, setEnd] = useState('18:00');
  const [off, setOff] = useState<number[]>([0]);
  useEffect(() => {
    if (!data) return;
    setOwn(data.source === 'user');
    setStart(data.work_start); setEnd(data.work_end); setOff(data.weekly_off || []);
  }, [data]);
  const dirty = useMemo(() => {
    if (!data) return false;
    if (own !== (data.source === 'user')) return true;
    if (!own) return false;
    return start !== data.work_start || end !== data.work_end || !sameSet(off, data.weekly_off || []);
  }, [data, own, start, end, off]);

  // ── leave form ──
  const [date, setDate] = useState('');
  const [part, setPart] = useState<LeavePart>('full');
  const [label, setLabel] = useState('');

  const tile: React.CSSProperties = { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' };
  const input: React.CSSProperties = {
    border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.12)' : '#E5E7EB'}`, borderRadius: 10, padding: '6px 10px', fontSize: 13,
    backgroundColor: isDarkMode ? colors.utility.primaryBackground : '#FFFFFF', color: colors.utility.primaryText, minHeight: 36,
  };
  const chip = (on: boolean): React.CSSProperties => ({
    backgroundColor: on ? colors.brand.primary : (isDarkMode ? colors.utility.primaryBackground : '#FFFFFF'),
    borderColor: on ? colors.brand.primary : (isDarkMode ? 'rgba(255,255,255,0.12)' : '#E5E7EB'),
    color: on ? '#FFFFFF' : colors.utility.primaryText,
  });
  const busy = setAvail.isPending || addLeave.isPending || removeLeave.isPending;

  const saveHours = async () => {
    try {
      if (own && end <= start) { addToast({ type: 'error', title: 'Check the hours', message: 'The working day must end after it starts.' }); return; }
      await setAvail.mutateAsync(own ? { userId, workStart: start, workEnd: end, weeklyOff: off } : { userId, workStart: null, workEnd: null, weeklyOff: null });
      addToast({ type: 'success', title: 'Working hours saved', message: own ? `${start}–${end}` : 'Using the organisation\'s hours.' });
    } catch (e) {
      addToast({ type: 'error', title: 'Could not save', message: availabilityError(e, 'Please try again.') });
    }
  };
  const submitLeave = async () => {
    if (!date) return;
    try {
      await addLeave.mutateAsync({ userId, date, part, label: label.trim() || null });
      addToast({ type: 'success', title: 'Leave added', message: `${fmtDay(date)} · ${partLabel(part)}` });
      setDate(''); setLabel(''); setPart('full');
    } catch (e) {
      addToast({ type: 'error', title: 'Could not add leave', message: availabilityError(e, 'Please try again.') });
    }
  };
  const dropLeave = async (d: string) => {
    try { await removeLeave.mutateAsync({ userId, date: d }); addToast({ type: 'success', title: 'Leave removed', message: fmtDay(d) }); }
    catch (e) { addToast({ type: 'error', title: 'Could not remove leave', message: availabilityError(e, 'Please try again.') }); }
  };

  return (
    <div>
      <h3 className="text-lg font-semibold mb-1 flex items-center gap-2" style={{ color: colors.utility.primaryText }}><CalendarClock className="w-4 h-4" /> Working hours & leave</h3>
      <p className="text-xs mb-4" style={{ color: colors.utility.secondaryText }}>Ops uses this to flag a service slot outside these hours, on a day off or on leave. Nothing is refused — it is a warning on the card.</p>
      {q.isPending ? (
        <div className="py-6 flex justify-center"><Loader2 className="w-5 h-5 animate-spin" style={{ color: colors.brand.primary }} /></div>
      ) : q.isError || !data ? (
        <p className="text-sm" style={{ color: colors.utility.secondaryText }}>Couldn't load availability. <button onClick={() => q.refetch()} className="font-semibold" style={{ color: colors.brand.primary }}>Retry</button></p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* hours */}
          <div className="p-4 rounded-xl space-y-3" style={tile}>
            <label className="text-xs font-medium uppercase tracking-wide" style={{ color: colors.utility.secondaryText }}>Hours</label>
            <p className="text-sm font-medium" style={{ color: colors.utility.primaryText }}>
              {data.work_start}–{data.work_end} · off {(data.weekly_off || []).length ? data.weekly_off.map((d) => WEEKDAYS[d]).join(', ') : 'none'}
              <span className="ml-2 text-xs font-normal" style={{ color: colors.utility.secondaryText }}>{data.source === 'user' ? 'their own' : 'the organisation\'s'}</span>
            </p>
            <label className="inline-flex items-center gap-2 text-sm" style={{ color: colors.utility.primaryText }}>
              <input type="checkbox" checked={own} onChange={(e) => setOwn(e.target.checked)} /> Their own hours
            </label>
            {own && (
              <>
                <div className="flex items-center gap-2 flex-wrap">
                  <input type="time" value={start} onChange={(e) => setStart(e.target.value)} style={input} aria-label="Start" />
                  <span style={{ color: colors.utility.secondaryText }}>to</span>
                  <input type="time" value={end} onChange={(e) => setEnd(e.target.value)} style={input} aria-label="End" />
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {WEEKDAYS.map((w, d) => (
                    <button key={d} type="button" onClick={() => setOff((p) => (p.includes(d) ? p.filter((x) => x !== d) : [...p, d]))}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold border" style={chip(off.includes(d))} title={off.includes(d) ? `${w}: off` : `${w}: working`}>
                      {w}
                    </button>
                  ))}
                </div>
                <p className="text-[11px]" style={{ color: colors.utility.secondaryText }}>Highlighted days are off. Organisation default: {data.tenant.work_start}–{data.tenant.work_end}, off {(data.tenant.weekly_off || []).map((d) => WEEKDAYS[d]).join(', ') || 'none'}.</p>
              </>
            )}
            <button onClick={saveHours} disabled={!dirty || busy}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50"
              style={{ backgroundColor: colors.brand.primary, color: '#FFFFFF' }}>
              {setAvail.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {dirty ? 'Save hours' : 'Saved'}
            </button>
          </div>

          {/* leave */}
          <div className="p-4 rounded-xl space-y-3" style={tile}>
            <label className="text-xs font-medium uppercase tracking-wide" style={{ color: colors.utility.secondaryText }}>Leave</label>
            <div className="flex items-center gap-2 flex-wrap">
              <input type="date" value={date} min={todayISO()} onChange={(e) => setDate(e.target.value)} style={input} aria-label="Date" />
              <select value={part} onChange={(e) => setPart(e.target.value as LeavePart)} style={input} aria-label="Part of the day">
                <option value="full">Full day</option><option value="am">Morning</option><option value="pm">Afternoon</option>
              </select>
              <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="label (optional)" style={{ ...input, width: 150 }} aria-label="Label" />
              <button onClick={submitLeave} disabled={!date || busy} className="inline-flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-semibold disabled:opacity-50"
                style={{ backgroundColor: colors.brand.primary, color: '#FFFFFF' }}>
                {addLeave.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Add
              </button>
            </div>
            {data.leave.length === 0 ? (
              <p className="text-sm" style={{ color: colors.utility.secondaryText }}>No leave marked.</p>
            ) : (
              <ul className="space-y-1.5">
                {data.leave.map((l) => (
                  <li key={l.date} className="flex items-center justify-between gap-3 text-sm rounded-lg px-3 py-2" style={{ backgroundColor: isDarkMode ? 'rgba(255,255,255,0.04)' : '#FFFFFF', color: colors.utility.primaryText }}>
                    <span><span className="font-medium">{fmtDay(l.date)}</span> · {partLabel(l.part)}{l.label ? <span style={{ color: colors.utility.secondaryText }}> · {l.label}</span> : null}</span>
                    <button onClick={() => dropLeave(l.date)} disabled={busy} aria-label={`Remove leave on ${l.date}`} title="Remove" style={{ color: colors.utility.secondaryText }}><Trash2 className="w-4 h-4" /></button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AvailabilityCard;
