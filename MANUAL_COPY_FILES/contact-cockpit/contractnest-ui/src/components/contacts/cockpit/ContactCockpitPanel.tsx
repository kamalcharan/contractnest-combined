// src/components/contacts/cockpit/ContactCockpitPanel.tsx
// Main Cockpit Panel - Contracts Pulse + Events Radar

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  Calendar,
  AlertTriangle,
  Clock,
  CheckCircle,
  ChevronRight,
  Plus,
  User,
  DollarSign,
  Settings,
  Loader2,
  CalendarDays,
  CalendarRange,
} from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import type {
  ContactCockpitData,
  ContractSummaryItem,
  OverdueEvent,
  UpcomingEvent,
  DateRangeOption,
  DATE_RANGE_OPTIONS,
} from '@/types/contactCockpit';

interface ContactCockpitPanelProps {
  data: ContactCockpitData | undefined;
  isLoading: boolean;
  contactId: string;
  classifications?: string[];
  onDateRangeChange?: (days: number) => void;
  className?: string;
}

// =================================================================
// SUB-COMPONENTS
// =================================================================

// Contracts Pulse Section
const ContractsPulse: React.FC<{
  contracts: ContractSummaryItem[];
  byStatus: Record<string, number>;
  total: number;
  contactId: string;
  classifications?: string[];
}> = ({ contracts, byStatus, total, contactId, classifications = [] }) => {
  const navigate = useNavigate();
  const { isDarkMode } = useTheme();

  const getStatusColor = (status: string): string => {
    const colors: Record<string, string> = {
      active: '#10B981',
      draft: '#6B7280',
      pending: '#F59E0B',
      expired: '#EF4444',
      cancelled: '#9CA3AF',
    };
    return colors[status] || '#6B7280';
  };

  const getStatusBgColor = (status: string): string => {
    const colors: Record<string, string> = {
      active: isDarkMode ? 'rgba(16, 185, 129, 0.15)' : 'rgba(16, 185, 129, 0.1)',
      draft: isDarkMode ? 'rgba(107, 114, 128, 0.15)' : 'rgba(107, 114, 128, 0.1)',
      pending: isDarkMode ? 'rgba(245, 158, 11, 0.15)' : 'rgba(245, 158, 11, 0.1)',
      expired: isDarkMode ? 'rgba(239, 68, 68, 0.15)' : 'rgba(239, 68, 68, 0.1)',
      cancelled: isDarkMode ? 'rgba(156, 163, 175, 0.15)' : 'rgba(156, 163, 175, 0.1)',
    };
    return colors[status] || 'rgba(107, 114, 128, 0.1)';
  };

  // Calculate progress (mock - based on days since creation)
  const getProgress = (contract: ContractSummaryItem): number => {
    if (contract.status !== 'active') return 0;
    const created = new Date(contract.created_at);
    const now = new Date();
    const daysSinceCreation = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
    const totalDays = contract.duration_value * (contract.duration_unit === 'months' ? 30 : contract.duration_unit === 'years' ? 365 : 1);
    return Math.min(100, Math.round((daysSinceCreation / totalDays) * 100));
  };

  const handleCreateContract = (type: string) => {
    navigate(`/contracts/create?contactId=${contactId}&contractType=${type}`);
  };

  return (
    <div className={`rounded-xl border p-5 ${
      isDarkMode ? 'border-gray-700 bg-gray-800/50' : 'border-gray-200 bg-white'
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-green-500/10">
            <FileText className="h-4 w-4 text-green-500" />
          </div>
          <h3 className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            Contracts Pulse
          </h3>
          <span className={`text-xs px-2 py-0.5 rounded-full ${
            isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'
          }`}>
            {total}
          </span>
        </div>

        {/* Create Contract Dropdown */}
        <div className="relative group">
          <button
            className={`
              flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium
              transition-colors
              ${isDarkMode
                ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                : 'bg-green-50 text-green-700 hover:bg-green-100'
              }
            `}
          >
            <Plus className="h-4 w-4" />
            <span>New</span>
          </button>

          {/* Dropdown */}
          <div className={`
            absolute right-0 top-full mt-1 py-1 rounded-lg shadow-lg border z-50
            opacity-0 invisible group-hover:opacity-100 group-hover:visible
            transition-all duration-150
            ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}
          `}
          style={{ minWidth: '180px' }}
          >
            {classifications.includes('client') && (
              <button
                onClick={() => handleCreateContract('client')}
                className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left ${
                  isDarkMode ? 'hover:bg-gray-700 text-gray-200' : 'hover:bg-gray-50 text-gray-700'
                }`}
              >
                <FileText className="h-4 w-4 text-green-500" />
                Client Contract
              </button>
            )}
            {classifications.includes('vendor') && (
              <button
                onClick={() => handleCreateContract('vendor')}
                className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left ${
                  isDarkMode ? 'hover:bg-gray-700 text-gray-200' : 'hover:bg-gray-50 text-gray-700'
                }`}
              >
                <Settings className="h-4 w-4 text-blue-500" />
                Vendor Contract
              </button>
            )}
            {classifications.includes('partner') && (
              <button
                onClick={() => handleCreateContract('partner')}
                className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left ${
                  isDarkMode ? 'hover:bg-gray-700 text-gray-200' : 'hover:bg-gray-50 text-gray-700'
                }`}
              >
                <User className="h-4 w-4 text-purple-500" />
                Partner Contract
              </button>
            )}
            {classifications.length === 0 && (
              <button
                onClick={() => handleCreateContract('client')}
                className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left ${
                  isDarkMode ? 'hover:bg-gray-700 text-gray-200' : 'hover:bg-gray-50 text-gray-700'
                }`}
              >
                <FileText className="h-4 w-4 text-green-500" />
                New Contract
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Status Summary Pills */}
      <div className="flex flex-wrap gap-2 mb-4">
        {Object.entries(byStatus).map(([status, count]) => (
          <span
            key={status}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium"
            style={{
              backgroundColor: getStatusBgColor(status),
              color: getStatusColor(status),
            }}
          >
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: getStatusColor(status) }} />
            {status.charAt(0).toUpperCase() + status.slice(1)}: {count}
          </span>
        ))}
      </div>

      {/* Contracts List */}
      <div className="space-y-3 max-h-64 overflow-y-auto">
        {contracts.length === 0 ? (
          <div className={`text-center py-6 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No contracts yet</p>
          </div>
        ) : (
          contracts.slice(0, 5).map((contract) => {
            const progress = getProgress(contract);
            return (
              <div
                key={contract.id}
                className={`
                  p-3 rounded-lg border cursor-pointer
                  transition-all hover:shadow-sm
                  ${isDarkMode
                    ? 'border-gray-700 hover:border-gray-600 bg-gray-800/30'
                    : 'border-gray-100 hover:border-gray-200 bg-gray-50/50'
                  }
                `}
                onClick={() => navigate(`/contracts/${contract.id}`)}
                style={{
                  borderLeftWidth: '3px',
                  borderLeftColor: getStatusColor(contract.status),
                }}
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <span
                      className="text-[10px] font-bold uppercase tracking-wider"
                      style={{ color: getStatusColor(contract.status) }}
                    >
                      {contract.status}
                    </span>
                    <h4 className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      {contract.name}
                    </h4>
                    <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      {contract.contract_number} • ₹{contract.grand_total.toLocaleString()}
                    </p>
                  </div>
                  <ChevronRight className={`h-4 w-4 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`} />
                </div>

                {/* Progress Bar (for active contracts) */}
                {contract.status === 'active' && (
                  <div className="mt-2">
                    <div className="flex items-center justify-between text-[10px] mb-1">
                      <span className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>Progress</span>
                      <span className={isDarkMode ? 'text-gray-300' : 'text-gray-600'}>{progress}%</span>
                    </div>
                    <div className={`h-1.5 rounded-full ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
                      <div
                        className="h-full rounded-full bg-green-500 transition-all duration-300"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}

        {contracts.length > 5 && (
          <button
            onClick={() => navigate(`/contacts/${contracts[0]?.contract_number?.split('-')[0] || ''}/contracts`)}
            className={`w-full py-2 text-sm font-medium rounded-lg ${
              isDarkMode
                ? 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
            }`}
          >
            View all {contracts.length} contracts
          </button>
        )}
      </div>
    </div>
  );
};

// Events Radar Section
const EventsRadar: React.FC<{
  overdueEvents: OverdueEvent[];
  upcomingEvents: UpcomingEvent[];
  eventsSummary: { total: number; completed: number; overdue: number; by_status: Record<string, number> };
  daysAhead: number;
  onDateRangeChange?: (days: number) => void;
  contactId: string;
}> = ({ overdueEvents, upcomingEvents, eventsSummary, daysAhead, onDateRangeChange, contactId }) => {
  const navigate = useNavigate();
  const { isDarkMode } = useTheme();
  const [selectedRange, setSelectedRange] = useState<DateRangeOption>(
    daysAhead === 7 ? '7' : daysAhead === 14 ? '14' : daysAhead === 30 ? '30' : daysAhead === 90 ? '90' : '7'
  );

  const dateRangeOptions = [
    { value: '7', label: '7 Days', days: 7 },
    { value: '14', label: 'Fortnight', days: 14 },
    { value: '30', label: 'Month', days: 30 },
    { value: '90', label: 'Quarter', days: 90 },
  ];

  const handleRangeChange = (value: string, days: number) => {
    setSelectedRange(value as DateRangeOption);
    onDateRangeChange?.(days);
  };

  const todayEvents = upcomingEvents.filter(e => e.is_today);
  const futureEvents = upcomingEvents.filter(e => !e.is_today);

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
  };

  const getEventTypeIcon = (type: string) => {
    return type === 'billing'
      ? <DollarSign className="h-3.5 w-3.5" />
      : <Settings className="h-3.5 w-3.5" />;
  };

  return (
    <div className={`rounded-xl border p-5 ${
      isDarkMode ? 'border-gray-700 bg-gray-800/50' : 'border-gray-200 bg-white'
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-blue-500/10">
            <Calendar className="h-4 w-4 text-blue-500" />
          </div>
          <h3 className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            Events Radar
          </h3>
        </div>

        {/* Date Range Selector */}
        <div className="flex items-center gap-1 p-1 rounded-lg bg-gray-100 dark:bg-gray-700">
          {dateRangeOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => handleRangeChange(option.value, option.days)}
              className={`
                px-2.5 py-1 text-xs font-medium rounded-md transition-all
                ${selectedRange === option.value
                  ? (isDarkMode ? 'bg-gray-600 text-white' : 'bg-white text-gray-900 shadow-sm')
                  : (isDarkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700')
                }
              `}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Events List */}
      <div className="space-y-4 max-h-80 overflow-y-auto">
        {/* Overdue Section */}
        {overdueEvents.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <span className="text-xs font-bold uppercase tracking-wider text-red-500">
                Overdue ({overdueEvents.length})
              </span>
            </div>
            <div className="space-y-2">
              {overdueEvents.slice(0, 3).map((event) => (
                <div
                  key={event.id}
                  className={`
                    p-2.5 rounded-lg border-l-3 cursor-pointer
                    transition-all hover:shadow-sm
                    ${isDarkMode
                      ? 'bg-red-900/20 border-red-500 hover:bg-red-900/30'
                      : 'bg-red-50 border-red-500 hover:bg-red-100'
                    }
                  `}
                  style={{ borderLeftWidth: '3px' }}
                  onClick={() => navigate(`/contracts/${event.contract_id}`)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`p-1 rounded ${
                        event.event_type === 'billing' ? 'bg-blue-500/20 text-blue-500' : 'bg-purple-500/20 text-purple-500'
                      }`}>
                        {getEventTypeIcon(event.event_type)}
                      </span>
                      <div>
                        <p className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                          {event.block_name}
                        </p>
                        <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          {event.contract_number}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-red-500">
                      {event.days_overdue}d overdue
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Today Section */}
        {todayEvents.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-4 w-4 text-amber-500" />
              <span className="text-xs font-bold uppercase tracking-wider text-amber-500">
                Today ({todayEvents.length})
              </span>
            </div>
            <div className="space-y-2">
              {todayEvents.map((event) => (
                <div
                  key={event.id}
                  className={`
                    p-2.5 rounded-lg border-l-3 cursor-pointer
                    transition-all hover:shadow-sm
                    ${isDarkMode
                      ? 'bg-amber-900/20 border-amber-500 hover:bg-amber-900/30'
                      : 'bg-amber-50 border-amber-500 hover:bg-amber-100'
                    }
                  `}
                  style={{ borderLeftWidth: '3px' }}
                  onClick={() => navigate(`/contracts/${event.contract_id}`)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`p-1 rounded ${
                        event.event_type === 'billing' ? 'bg-blue-500/20 text-blue-500' : 'bg-purple-500/20 text-purple-500'
                      }`}>
                        {getEventTypeIcon(event.event_type)}
                      </span>
                      <div>
                        <p className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                          {event.block_name}
                        </p>
                        <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          {event.contract_number}
                          {event.amount && ` • ₹${event.amount.toLocaleString()}`}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs font-medium text-amber-600">Today</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Upcoming Section */}
        {futureEvents.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <CalendarDays className="h-4 w-4 text-green-500" />
              <span className="text-xs font-bold uppercase tracking-wider text-green-500">
                Upcoming ({futureEvents.length})
              </span>
            </div>
            <div className="space-y-2">
              {futureEvents.slice(0, 5).map((event) => (
                <div
                  key={event.id}
                  className={`
                    p-2.5 rounded-lg border cursor-pointer
                    transition-all hover:shadow-sm
                    ${isDarkMode
                      ? 'bg-gray-800/50 border-gray-700 hover:border-gray-600'
                      : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                    }
                  `}
                  onClick={() => navigate(`/contracts/${event.contract_id}`)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`p-1 rounded ${
                        event.event_type === 'billing' ? 'bg-blue-500/20 text-blue-500' : 'bg-purple-500/20 text-purple-500'
                      }`}>
                        {getEventTypeIcon(event.event_type)}
                      </span>
                      <div>
                        <p className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                          {event.block_name}
                        </p>
                        <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          {event.contract_number}
                          {event.sequence_number && ` • ${event.sequence_number}/${event.total_occurrences}`}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-xs font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                        {formatDate(event.scheduled_date)}
                      </p>
                      <p className={`text-[10px] ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                        in {event.days_until}d
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {overdueEvents.length === 0 && upcomingEvents.length === 0 && (
          <div className={`text-center py-8 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            <CheckCircle className="h-10 w-10 mx-auto mb-3 text-green-500 opacity-50" />
            <p className="text-sm font-medium">All caught up!</p>
            <p className="text-xs mt-1">No pending events in the selected range</p>
          </div>
        )}
      </div>
    </div>
  );
};

// =================================================================
// MAIN COMPONENT
// =================================================================

const ContactCockpitPanel: React.FC<ContactCockpitPanelProps> = ({
  data,
  isLoading,
  contactId,
  classifications = [],
  onDateRangeChange,
  className = '',
}) => {
  const { isDarkMode } = useTheme();

  if (isLoading) {
    return (
      <div className={`grid grid-cols-1 lg:grid-cols-2 gap-6 ${className}`}>
        {[1, 2].map((i) => (
          <div
            key={i}
            className={`rounded-xl border p-5 animate-pulse ${
              isDarkMode ? 'border-gray-700 bg-gray-800/50' : 'border-gray-200 bg-white'
            }`}
          >
            <div className="flex items-center gap-2 mb-4">
              <div className={`w-8 h-8 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'}`} />
              <div className={`h-5 w-32 rounded ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'}`} />
            </div>
            <div className="space-y-3">
              {[1, 2, 3].map((j) => (
                <div key={j} className={`h-16 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'}`} />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <div className={`grid grid-cols-1 lg:grid-cols-2 gap-6 ${className}`}>
      {/* Contracts Pulse */}
      <ContractsPulse
        contracts={data.contracts.contracts}
        byStatus={data.contracts.by_status}
        total={data.contracts.total}
        contactId={contactId}
        classifications={classifications}
      />

      {/* Events Radar */}
      <EventsRadar
        overdueEvents={data.overdue_events}
        upcomingEvents={data.upcoming_events}
        eventsSummary={data.events}
        daysAhead={data.days_ahead}
        onDateRangeChange={onDateRangeChange}
        contactId={contactId}
      />
    </div>
  );
};

export default ContactCockpitPanel;
