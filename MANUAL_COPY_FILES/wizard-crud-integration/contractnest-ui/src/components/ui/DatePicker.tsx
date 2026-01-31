// src/components/ui/DatePicker.tsx
// Themed calendar date picker — built on Popover + date-fns
import React, { useState, useMemo, useCallback } from 'react';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { useTheme } from '@/contexts/ThemeContext';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  subMonths,
  isSameMonth,
  isSameDay,
  isToday,
  isBefore,
  startOfDay,
} from 'date-fns';

interface DatePickerProps {
  value: Date | null;
  onChange: (date: Date) => void;
  placeholder?: string;
  minDate?: Date;
  maxDate?: Date;
  label?: string;
  required?: boolean;
  error?: string;
}

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

const DatePicker: React.FC<DatePickerProps> = ({
  value,
  onChange,
  placeholder = 'Select date',
  minDate,
  maxDate,
  label,
  required,
  error,
}) => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;
  const [open, setOpen] = useState(false);
  const [viewMonth, setViewMonth] = useState<Date>(value || new Date());

  // Build calendar grid (6 rows x 7 cols)
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(viewMonth);
    const monthEnd = endOfMonth(viewMonth);
    const gridStart = startOfWeek(monthStart); // Sunday
    const gridEnd = endOfWeek(monthEnd);

    const days: Date[] = [];
    let day = gridStart;
    while (day <= gridEnd) {
      days.push(day);
      day = addDays(day, 1);
    }
    return days;
  }, [viewMonth]);

  const isDisabled = useCallback(
    (date: Date) => {
      if (minDate && isBefore(date, startOfDay(minDate))) return true;
      if (maxDate && isBefore(startOfDay(maxDate), date)) return true;
      return false;
    },
    [minDate, maxDate]
  );

  const handleSelect = (date: Date) => {
    if (isDisabled(date)) return;
    onChange(date);
    setOpen(false);
  };

  const goPrev = () => setViewMonth((m) => subMonths(m, 1));
  const goNext = () => setViewMonth((m) => addMonths(m, 1));

  return (
    <div>
      {label && (
        <label
          className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider mb-3"
          style={{ color: colors.utility.secondaryText }}
        >
          <Calendar className="w-3.5 h-3.5" />
          {label}
          {required && <span style={{ color: colors.semantic.error }}>*</span>}
        </label>
      )}

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="w-full px-4 py-3 rounded-xl border-2 flex items-center justify-between transition-all text-left"
            style={{
              backgroundColor: colors.utility.primaryBackground,
              borderColor: error
                ? colors.semantic.error
                : open
                ? colors.brand.primary
                : `${colors.utility.primaryText}15`,
              boxShadow: open ? `0 0 0 3px ${colors.brand.primary}15` : 'none',
            }}
          >
            <span
              style={{
                color: value ? colors.utility.primaryText : colors.utility.secondaryText,
                fontSize: 14,
                fontWeight: value ? 500 : 400,
              }}
            >
              {value ? format(value, 'MMM d, yyyy') : placeholder}
            </span>
            <Calendar
              className="w-4 h-4"
              style={{ color: colors.utility.secondaryText }}
            />
          </button>
        </PopoverTrigger>

        <PopoverContent
          align="start"
          sideOffset={6}
          className="p-0 w-[300px]"
          style={{
            backgroundColor: colors.utility.secondaryBackground,
            borderColor: `${colors.utility.primaryText}15`,
            borderRadius: 16,
            boxShadow: '0 12px 40px rgba(0,0,0,0.15)',
          }}
        >
          {/* Month/Year header */}
          <div
            className="flex items-center justify-between px-4 pt-4 pb-2"
          >
            <button
              type="button"
              onClick={goPrev}
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:opacity-70"
              style={{ background: `${colors.utility.primaryText}08` }}
            >
              <ChevronLeft className="w-4 h-4" style={{ color: colors.utility.primaryText }} />
            </button>

            <span
              className="text-sm font-bold tracking-wide"
              style={{ color: colors.utility.primaryText }}
            >
              {format(viewMonth, 'MMMM yyyy')}
            </span>

            <button
              type="button"
              onClick={goNext}
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:opacity-70"
              style={{ background: `${colors.utility.primaryText}08` }}
            >
              <ChevronRight className="w-4 h-4" style={{ color: colors.utility.primaryText }} />
            </button>
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 px-3 pb-1">
            {WEEKDAYS.map((d) => (
              <div
                key={d}
                className="text-center text-[10px] font-bold uppercase tracking-widest py-1"
                style={{ color: colors.utility.secondaryText }}
              >
                {d}
              </div>
            ))}
          </div>

          {/* Day grid */}
          <div className="grid grid-cols-7 gap-px px-3 pb-4">
            {calendarDays.map((day, i) => {
              const inMonth = isSameMonth(day, viewMonth);
              const selected = value ? isSameDay(day, value) : false;
              const today = isToday(day);
              const disabled = isDisabled(day);

              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleSelect(day)}
                  disabled={disabled}
                  className="relative w-full aspect-square flex items-center justify-center rounded-lg transition-all text-sm"
                  style={{
                    fontWeight: selected ? 700 : today ? 600 : 400,
                    color: disabled
                      ? `${colors.utility.secondaryText}40`
                      : selected
                      ? '#fff'
                      : !inMonth
                      ? `${colors.utility.secondaryText}50`
                      : colors.utility.primaryText,
                    backgroundColor: selected
                      ? colors.brand.primary
                      : 'transparent',
                    cursor: disabled ? 'not-allowed' : 'pointer',
                    borderRadius: 10,
                  }}
                  onMouseEnter={(e) => {
                    if (!selected && !disabled) {
                      e.currentTarget.style.backgroundColor = `${colors.brand.primary}12`;
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!selected) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }
                  }}
                >
                  {format(day, 'd')}
                  {/* Today dot indicator */}
                  {today && !selected && (
                    <span
                      className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full"
                      style={{ backgroundColor: colors.brand.primary }}
                    />
                  )}
                </button>
              );
            })}
          </div>

          {/* Quick actions */}
          <div
            className="flex items-center justify-between px-4 py-3 border-t"
            style={{ borderColor: `${colors.utility.primaryText}10` }}
          >
            <button
              type="button"
              onClick={() => handleSelect(new Date())}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-all"
              style={{
                color: colors.brand.primary,
                background: `${colors.brand.primary}10`,
              }}
            >
              Today
            </button>
            {value && (
              <span
                className="text-xs font-medium"
                style={{ color: colors.utility.secondaryText }}
              >
                {format(value, 'EEEE, MMM d')}
              </span>
            )}
          </div>
        </PopoverContent>
      </Popover>

      {error && (
        <span
          className="text-xs mt-1 block"
          style={{ color: colors.semantic.error }}
        >
          {error}
        </span>
      )}
    </div>
  );
};

export default DatePicker;
