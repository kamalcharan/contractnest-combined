// ============================================================================
// Cadence Settings — tenant holiday calendar + default shift policy
// ============================================================================
// The calendar every smart Service Cycle respects: which weekdays are off,
// which specific dates are holidays, and — when an occurrence lands on a
// holiday — the default suggested move (next / previous working day). The move
// is only a default: the user is alerted and decides per occurrence when a
// cycle is generated.

import React, { useEffect, useState } from 'react';
import { CalendarClock, Plus, Trash2, Loader2, ArrowRight, ArrowLeft, CalendarDays } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { useVaNiToast } from '@/components/common/toast/VaNiToast';
import { useCadenceSettings } from './useCadenceSettings';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const CadenceSettingsPage: React.FC = () => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;
  const { addToast } = useVaNiToast();
  const { settings, loading, saving, error, save, addHoliday, removeHoliday } = useCadenceSettings();

  const [weekly, setWeekly] = useState<number[]>([]);
  const [shift, setShift] = useState<'next' | 'previous'>('next');
  const [newDate, setNewDate] = useState('');
  const [newLabel, setNewLabel] = useState('');

  // Hydrate local editor from loaded settings
  useEffect(() => {
    setWeekly(settings.weekly_holidays);
    setShift(settings.default_shift);
  }, [settings.weekly_holidays, settings.default_shift]);

  const dirty =
    JSON.stringify([...weekly].sort()) !== JSON.stringify([...settings.weekly_holidays].sort()) ||
    shift !== settings.default_shift;

  const card = {
    backgroundColor: isDarkMode ? colors.utility.secondaryBackground : '#FFFFFF',
    borderColor: isDarkMode ? colors.utility.secondaryBackground : '#E5E7EB',
  };

  const toggleWeekday = (d: number) =>
    setWeekly((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]));

  const handleSave = async () => {
    const ok = await save(weekly, shift);
    addToast(ok
      ? { type: 'success', title: 'Cadence settings saved', message: 'Service cycles will use this calendar.' }
      : { type: 'error', title: 'Save failed', message: error || 'Please try again.' });
  };

  const handleAddHoliday = async () => {
    if (!newDate) return;
    const ok = await addHoliday(newDate, newLabel.trim() || undefined);
    if (ok) { setNewDate(''); setNewLabel(''); addToast({ type: 'success', title: 'Holiday added', message: newDate }); }
    else addToast({ type: 'error', title: 'Could not add holiday', message: error || 'Please try again.' });
  };

  const fmtDate = (d: string) => {
    try { return new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }); }
    catch { return d; }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 gap-2">
        <Loader2 className="w-5 h-5 animate-spin" style={{ color: colors.brand.primary }} />
        <span className="text-sm" style={{ color: colors.utility.secondaryText }}>Loading cadence settings…</span>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
             style={{ backgroundColor: `${colors.brand.primary}15` }}>
          <CalendarClock className="w-6 h-6" style={{ color: colors.brand.primary }} />
        </div>
        <div>
          <h1 className="text-xl font-bold" style={{ color: colors.utility.primaryText }}>Cadence Settings</h1>
          <p className="text-sm mt-0.5" style={{ color: colors.utility.secondaryText }}>
            The holiday calendar your recurring service cycles respect. When a cycle lands on a holiday,
            you'll be alerted and can move it — this sets the default.
          </p>
        </div>
      </div>

      {/* Weekly holidays */}
      <div className="rounded-xl border p-5" style={card}>
        <h2 className="text-sm font-semibold mb-1" style={{ color: colors.utility.primaryText }}>Weekly holidays</h2>
        <p className="text-xs mb-4" style={{ color: colors.utility.secondaryText }}>Weekdays your organisation is off. Cycles avoid these by default.</p>
        <div className="flex flex-wrap gap-2">
          {WEEKDAYS.map((label, d) => {
            const on = weekly.includes(d);
            return (
              <button key={d} type="button" onClick={() => toggleWeekday(d)}
                className="px-4 py-2 rounded-lg text-sm font-semibold border-2 transition-all"
                style={{
                  backgroundColor: on ? colors.brand.primary : (isDarkMode ? colors.utility.primaryBackground : '#FFFFFF'),
                  borderColor: on ? colors.brand.primary : (isDarkMode ? colors.utility.secondaryBackground : '#E5E7EB'),
                  color: on ? '#FFFFFF' : colors.utility.primaryText,
                }}>
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Default shift */}
      <div className="rounded-xl border p-5" style={card}>
        <h2 className="text-sm font-semibold mb-1" style={{ color: colors.utility.primaryText }}>When an occurrence lands on a holiday</h2>
        <p className="text-xs mb-4" style={{ color: colors.utility.secondaryText }}>The default move suggested in the alert. You can override it per occurrence.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {([
            { id: 'next', icon: ArrowRight, label: 'Next working day', desc: 'Move it forward (N+1)' },
            { id: 'previous', icon: ArrowLeft, label: 'Previous working day', desc: 'Move it back (N−1)' },
          ] as const).map((opt) => {
            const on = shift === opt.id;
            const Icon = opt.icon;
            return (
              <button key={opt.id} type="button" onClick={() => setShift(opt.id)}
                className="p-4 rounded-xl border-2 text-left transition-all flex items-center gap-3"
                style={{
                  backgroundColor: on ? `${colors.brand.primary}08` : (isDarkMode ? colors.utility.primaryBackground : '#FFFFFF'),
                  borderColor: on ? colors.brand.primary : (isDarkMode ? colors.utility.secondaryBackground : '#E5E7EB'),
                }}>
                <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                     style={{ backgroundColor: on ? colors.brand.primary : `${colors.brand.primary}15` }}>
                  <Icon className="w-4 h-4" style={{ color: on ? '#FFFFFF' : colors.brand.primary }} />
                </div>
                <div>
                  <div className="text-sm font-semibold" style={{ color: colors.utility.primaryText }}>{opt.label}</div>
                  <div className="text-xs" style={{ color: colors.utility.secondaryText }}>{opt.desc}</div>
                </div>
              </button>
            );
          })}
        </div>
        <div className="mt-4 flex justify-end">
          <button onClick={handleSave} disabled={saving || !dirty}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-white text-sm font-semibold disabled:opacity-40"
            style={{ backgroundColor: colors.brand.primary }}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {dirty ? 'Save changes' : 'Saved'}
          </button>
        </div>
      </div>

      {/* Marked holidays */}
      <div className="rounded-xl border p-5" style={card}>
        <h2 className="text-sm font-semibold mb-1" style={{ color: colors.utility.primaryText }}>Marked holidays</h2>
        <p className="text-xs mb-4" style={{ color: colors.utility.secondaryText }}>Specific dates the organisation is closed (festivals, one-offs).</p>

        <div className="flex flex-wrap items-end gap-2 mb-4">
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: colors.utility.secondaryText }}>Date</label>
            <input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)}
              className="px-3 py-2 rounded-lg border text-sm"
              style={{ borderColor: colors.utility.border || '#E5E7EB', color: colors.utility.primaryText, backgroundColor: isDarkMode ? colors.utility.primaryBackground : '#FFFFFF' }} />
          </div>
          <div className="flex-1 min-w-[160px]">
            <label className="block text-xs font-medium mb-1" style={{ color: colors.utility.secondaryText }}>Label (optional)</label>
            <input value={newLabel} onChange={(e) => setNewLabel(e.target.value)} placeholder="e.g. Diwali"
              className="w-full px-3 py-2 rounded-lg border text-sm"
              style={{ borderColor: colors.utility.border || '#E5E7EB', color: colors.utility.primaryText, backgroundColor: isDarkMode ? colors.utility.primaryBackground : '#FFFFFF' }} />
          </div>
          <button onClick={handleAddHoliday} disabled={saving || !newDate}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-white text-sm font-semibold disabled:opacity-40"
            style={{ backgroundColor: colors.brand.primary }}>
            <Plus className="w-4 h-4" /> Add
          </button>
        </div>

        {settings.holidays.length === 0 ? (
          <div className="text-center py-8 text-xs rounded-lg border border-dashed"
               style={{ color: colors.utility.secondaryText, borderColor: isDarkMode ? colors.utility.secondaryBackground : '#E5E7EB' }}>
            <CalendarDays className="w-5 h-5 mx-auto mb-2 opacity-60" />
            No marked holidays yet.
          </div>
        ) : (
          <div className="space-y-2">
            {settings.holidays.map((h) => (
              <div key={h.date} className="flex items-center gap-3 px-3 py-2.5 rounded-lg border"
                   style={{ borderColor: isDarkMode ? colors.utility.secondaryBackground : '#EEF0F4' }}>
                <CalendarDays className="w-4 h-4 flex-shrink-0" style={{ color: colors.brand.primary }} />
                <span className="text-sm font-medium" style={{ color: colors.utility.primaryText }}>{fmtDate(h.date)}</span>
                {h.label && <span className="text-xs" style={{ color: colors.utility.secondaryText }}>· {h.label}</span>}
                <div className="flex-1" />
                <button onClick={() => removeHoliday(h.date)} disabled={saving}
                  className="p-1.5 rounded-lg hover:opacity-80 disabled:opacity-40" title="Remove"
                  style={{ color: colors.semantic.error }}>
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CadenceSettingsPage;
