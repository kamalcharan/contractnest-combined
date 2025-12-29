// src/pages/contracts/create/steps/TimelineStep.tsx
import React, { useState, useMemo } from 'react';
import {
  Calendar,
  ArrowRight,
  Clock,
  CheckCircle,
  Circle,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Info,
  CalendarDays,
  MapPin,
  Repeat,
  FileText
} from 'lucide-react';
import { useTheme } from '../../../../contexts/ThemeContext';
import { useContractBuilder } from '../../../../contexts/ContractBuilderContext';

interface TimelineEvent {
  id: string;
  type: 'service' | 'billing' | 'milestone' | 'renewal';
  title: string;
  description: string;
  date: Date;
  recurring?: boolean;
  status: 'upcoming' | 'scheduled' | 'completed';
}

interface TimelineStepProps {
  onNext: () => void;
  onBack: () => void;
}

const TimelineStep: React.FC<TimelineStepProps> = ({ onNext, onBack }) => {
  const { isDarkMode, currentTheme } = useTheme();
  const { state, dispatch } = useContractBuilder();

  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [startDate, setStartDate] = useState<Date>(
    state.contractData?.startDate || new Date()
  );
  const [contractDuration, setContractDuration] = useState<'6' | '12' | '24' | 'custom'>(
    state.contractData?.duration || '12'
  );
  const [customDuration, setCustomDuration] = useState<number>(12);

  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  // Generate timeline events based on selected services
  const timelineEvents = useMemo(() => {
    const events: TimelineEvent[] = [];
    const services = state.contractData?.services?.filter((s: any) => s.isIncluded) || [];
    const months = contractDuration === 'custom' ? customDuration : parseInt(contractDuration);

    // Contract start event
    events.push({
      id: 'start',
      type: 'milestone',
      title: 'Contract Begins',
      description: 'Contract becomes active upon acceptance',
      date: startDate,
      status: 'upcoming'
    });

    // Generate service events
    services.forEach((service: any) => {
      let currentDate = new Date(startDate);
      let eventCount = 0;
      const maxEvents = 12; // Limit events for display

      while (currentDate <= new Date(startDate.getTime() + months * 30 * 24 * 60 * 60 * 1000) && eventCount < maxEvents) {
        events.push({
          id: `${service.id}-${eventCount}`,
          type: 'service',
          title: service.name,
          description: `Scheduled ${service.frequency} service`,
          date: new Date(currentDate),
          recurring: service.frequency !== 'one-time',
          status: 'scheduled'
        });

        eventCount++;

        // Increment date based on frequency
        switch (service.frequency) {
          case 'weekly':
            currentDate.setDate(currentDate.getDate() + 7);
            break;
          case 'bi-weekly':
            currentDate.setDate(currentDate.getDate() + 14);
            break;
          case 'monthly':
            currentDate.setMonth(currentDate.getMonth() + 1);
            break;
          case 'quarterly':
            currentDate.setMonth(currentDate.getMonth() + 3);
            break;
          case 'annually':
            currentDate.setFullYear(currentDate.getFullYear() + 1);
            break;
          default:
            // one-time - exit loop
            currentDate = new Date(startDate.getTime() + (months + 1) * 30 * 24 * 60 * 60 * 1000);
        }
      }
    });

    // Add billing events (monthly)
    for (let i = 1; i <= Math.min(months, 12); i++) {
      const billingDate = new Date(startDate);
      billingDate.setMonth(billingDate.getMonth() + i);
      events.push({
        id: `billing-${i}`,
        type: 'billing',
        title: 'Monthly Invoice',
        description: `Invoice for month ${i}`,
        date: billingDate,
        status: 'scheduled'
      });
    }

    // Contract renewal event
    const renewalDate = new Date(startDate);
    renewalDate.setMonth(renewalDate.getMonth() + months);
    events.push({
      id: 'renewal',
      type: 'renewal',
      title: 'Contract Renewal',
      description: 'Contract expires or renews',
      date: renewalDate,
      status: 'upcoming'
    });

    // Sort by date
    return events.sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [state.contractData?.services, startDate, contractDuration, customDuration]);

  const handleContinue = () => {
    dispatch({
      type: 'UPDATE_CONTRACT_DATA',
      payload: {
        startDate,
        duration: contractDuration,
        customDuration: contractDuration === 'custom' ? customDuration : undefined
      }
    });
    dispatch({ type: 'MARK_STEP_COMPLETED', payload: 5 });
    onNext();
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'service':
        return <Clock className="h-4 w-4" />;
      case 'billing':
        return <FileText className="h-4 w-4" />;
      case 'milestone':
        return <CheckCircle className="h-4 w-4" />;
      case 'renewal':
        return <Repeat className="h-4 w-4" />;
      default:
        return <Circle className="h-4 w-4" />;
    }
  };

  const getEventColor = (type: string) => {
    switch (type) {
      case 'service':
        return 'bg-blue-500 text-white';
      case 'billing':
        return 'bg-green-500 text-white';
      case 'milestone':
        return 'bg-purple-500 text-white';
      case 'renewal':
        return 'bg-orange-500 text-white';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  // Group events by month for display
  const groupedEvents = useMemo(() => {
    const groups: { [key: string]: TimelineEvent[] } = {};
    timelineEvents.forEach(event => {
      const key = event.date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      if (!groups[key]) groups[key] = [];
      groups[key].push(event);
    });
    return groups;
  }, [timelineEvents]);

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground mb-2">
            Review Timeline
          </h1>
          <p className="text-muted-foreground">
            Preview the service schedule and key milestones
          </p>
        </div>

        {/* View Toggle */}
        <div className="flex items-center gap-2 bg-muted rounded-lg p-1">
          <button
            onClick={() => setViewMode('list')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              viewMode === 'list'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            List View
          </button>
          <button
            onClick={() => setViewMode('calendar')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              viewMode === 'calendar'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Calendar
          </button>
        </div>
      </div>

      {/* Contract Settings */}
      <div className="bg-card border border-border rounded-xl p-6 mb-6">
        <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <CalendarDays className="h-5 w-5" />
          Contract Period
        </h3>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Start Date */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Start Date
            </label>
            <input
              type="date"
              value={startDate.toISOString().split('T')[0]}
              onChange={(e) => setStartDate(new Date(e.target.value))}
              min={new Date().toISOString().split('T')[0]}
              className="w-full px-4 py-2.5 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>

          {/* Duration */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Contract Duration
            </label>
            <div className="flex gap-2">
              {[
                { value: '6', label: '6 months' },
                { value: '12', label: '1 year' },
                { value: '24', label: '2 years' },
                { value: 'custom', label: 'Custom' }
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => setContractDuration(option.value as any)}
                  className={`
                    flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all
                    ${contractDuration === option.value
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    }
                  `}
                >
                  {option.label}
                </button>
              ))}
            </div>
            {contractDuration === 'custom' && (
              <div className="mt-3 flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  max="60"
                  value={customDuration}
                  onChange={(e) => setCustomDuration(parseInt(e.target.value) || 1)}
                  className="w-24 px-4 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
                <span className="text-muted-foreground">months</span>
              </div>
            )}
          </div>
        </div>

        {/* Summary */}
        <div className="mt-4 pt-4 border-t border-border flex items-center gap-6 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <span>Starts: {formatDate(startDate)}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            <span>Duration: {contractDuration === 'custom' ? customDuration : contractDuration} months</span>
          </div>
          <div className="flex items-center gap-2">
            <Repeat className="h-4 w-4" />
            <span>{timelineEvents.filter(e => e.type === 'service').length} scheduled services</span>
          </div>
        </div>
      </div>

      {/* Timeline View */}
      {viewMode === 'list' ? (
        <div className="space-y-6">
          {Object.entries(groupedEvents).map(([monthYear, events]) => (
            <div key={monthYear}>
              <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                {monthYear}
              </h4>
              <div className="space-y-2">
                {events.map((event, index) => (
                  <div
                    key={event.id}
                    className="flex items-start gap-4 p-4 bg-card border border-border rounded-lg hover:border-primary/50 transition-colors"
                  >
                    <div className={`
                      w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0
                      ${getEventColor(event.type)}
                    `}>
                      {getEventIcon(event.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div>
                          <h5 className="font-medium text-foreground">{event.title}</h5>
                          <p className="text-sm text-muted-foreground">{event.description}</p>
                        </div>
                        <div className="text-right flex-shrink-0 ml-4">
                          <div className="text-sm font-medium text-foreground">
                            {event.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {event.date.toLocaleDateString('en-US', { weekday: 'short' })}
                          </div>
                        </div>
                      </div>
                      {event.recurring && (
                        <span className="inline-flex items-center gap-1 mt-2 text-xs text-blue-600 dark:text-blue-400">
                          <Repeat className="h-3 w-3" />
                          Recurring
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Calendar View */
        <div className="bg-card border border-border rounded-xl p-6">
          {/* Calendar Header */}
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
              className="p-2 hover:bg-muted rounded-lg transition-colors"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <h3 className="text-lg font-semibold text-foreground">
              {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </h3>
            <button
              onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
              className="p-2 hover:bg-muted rounded-lg transition-colors"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="p-2 text-center text-sm font-medium text-muted-foreground">
                {day}
              </div>
            ))}
            {(() => {
              const year = currentMonth.getFullYear();
              const month = currentMonth.getMonth();
              const firstDay = new Date(year, month, 1).getDay();
              const daysInMonth = new Date(year, month + 1, 0).getDate();
              const cells = [];

              // Empty cells before first day
              for (let i = 0; i < firstDay; i++) {
                cells.push(<div key={`empty-${i}`} className="p-2 h-24" />);
              }

              // Day cells
              for (let day = 1; day <= daysInMonth; day++) {
                const date = new Date(year, month, day);
                const dayEvents = timelineEvents.filter(e =>
                  e.date.getDate() === day &&
                  e.date.getMonth() === month &&
                  e.date.getFullYear() === year
                );

                cells.push(
                  <div
                    key={day}
                    className={`
                      p-2 h-24 border border-border rounded-lg overflow-hidden
                      ${dayEvents.length > 0 ? 'bg-primary/5' : 'bg-background'}
                    `}
                  >
                    <div className="text-sm font-medium text-foreground mb-1">{day}</div>
                    <div className="space-y-1">
                      {dayEvents.slice(0, 2).map(event => (
                        <div
                          key={event.id}
                          className={`
                            text-xs px-1.5 py-0.5 rounded truncate
                            ${getEventColor(event.type)}
                          `}
                          title={event.title}
                        >
                          {event.title}
                        </div>
                      ))}
                      {dayEvents.length > 2 && (
                        <div className="text-xs text-muted-foreground">
                          +{dayEvents.length - 2} more
                        </div>
                      )}
                    </div>
                  </div>
                );
              }

              return cells;
            })()}
          </div>

          {/* Legend */}
          <div className="mt-6 pt-4 border-t border-border flex flex-wrap gap-4">
            {[
              { type: 'service', label: 'Service Visit' },
              { type: 'billing', label: 'Billing' },
              { type: 'milestone', label: 'Milestone' },
              { type: 'renewal', label: 'Renewal' }
            ].map(item => (
              <div key={item.type} className="flex items-center gap-2 text-sm">
                <div className={`w-3 h-3 rounded-full ${getEventColor(item.type)}`} />
                <span className="text-muted-foreground">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Info Notice */}
      <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex gap-3">
          <Info className="h-5 w-5 text-blue-500 flex-shrink-0" />
          <div>
            <h4 className="font-medium text-blue-900 dark:text-blue-100">
              Timeline is Automatically Generated
            </h4>
            <p className="text-sm text-blue-700 dark:text-blue-300">
              This timeline is based on your selected services and billing preferences.
              Actual service dates may vary slightly based on scheduling availability.
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between pt-6 mt-8 border-t border-border">
        <button
          onClick={onBack}
          className="px-6 py-2.5 text-muted-foreground hover:text-foreground transition-colors"
        >
          Back
        </button>
        <button
          onClick={handleContinue}
          className="flex items-center gap-2 px-6 py-2.5 rounded-lg font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-all"
        >
          Continue
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default TimelineStep;
