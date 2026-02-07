// src/pages/ops/cockpit/index.tsx
// Operations Cockpit — Revenue & Expense command center
// D1: Shell + Stats + Event Urgency + VaNi Sidebar + Footer
// D2: Awaiting Acceptance + Service Events + Action Queue (Revenue)

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Gauge,
  FileText,
  Send,
  AlertTriangle,
  Calendar,
  DollarSign,
  Wrench,
  Plus,
  RefreshCw,
  Users,
  Sparkles,
  ShieldCheck,
  BellRing,
  CreditCard,
  Clock,
  Eye,
  ChevronRight,
  CalendarDays,
  Receipt,
  CheckCircle2,
  XCircle,
  PlayCircle,
  Loader2,
  Edit3,
} from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { useTenantContext } from '@/contexts/TenantContext';
import { useContractStats, useContracts, useContractOperations } from '@/hooks/queries/useContractQueries';
import {
  useTenantDateSummary,
  useContractEvents,
  useContractEventOperations,
} from '@/hooks/queries/useContractEventQueries';
import { StatCard } from '@/components/subscription/cards/StatCard';
import { VaNiLoader } from '@/components/common/loaders/UnifiedLoader';
import type { Contract } from '@/types/contracts';
import type { ContractEvent, ContractEventStatus } from '@/types/contractEvents';
import { VALID_STATUS_TRANSITIONS } from '@/types/contractEvents';

// =================================================================
// TYPES
// =================================================================

type Perspective = 'revenue' | 'expense';
type EventTimeFilter = 'today' | 'week' | 'month';
type EventTypeFilter = 'all' | 'service' | 'billing';
type QueueFilter = 'all' | 'drafts' | 'urgent' | 'pending';

// =================================================================
// HELPERS
// =================================================================

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const formatEventDate = (dateStr: string): string => {
  const d = new Date(dateStr);
  return `${d.getDate()}-${MONTHS[d.getMonth()]}-${d.getFullYear()}`;
};

const getDateRange = (filter: EventTimeFilter): { from: string; to: string } => {
  const now = new Date();
  const from = new Date(now);
  from.setHours(0, 0, 0, 0);

  const to = new Date(now);
  if (filter === 'today') {
    to.setHours(23, 59, 59, 999);
  } else if (filter === 'week') {
    to.setDate(to.getDate() + 7);
  } else {
    to.setMonth(to.getMonth() + 1);
  }

  return {
    from: from.toISOString().split('T')[0],
    to: to.toISOString().split('T')[0],
  };
};

const getAcceptanceStatus = (contract: Contract): { label: string; color: string; bg: string } => {
  if (contract.accepted_at) {
    return { label: 'Viewed', color: '#10B981', bg: 'rgba(16, 185, 129, 0.1)' };
  }
  if (contract.sent_at) {
    return { label: 'Opened', color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.1)' };
  }
  return { label: 'Not Seen', color: '#EF4444', bg: 'rgba(239, 68, 68, 0.1)' };
};

const getEventStatusConfig = (status: ContractEventStatus, colors: any) => {
  switch (status) {
    case 'scheduled':
      return { label: 'Scheduled', icon: CalendarDays, color: colors.semantic?.info || colors.brand.secondary };
    case 'in_progress':
      return { label: 'In Progress', icon: PlayCircle, color: colors.brand.primary };
    case 'completed':
      return { label: 'Completed', icon: CheckCircle2, color: colors.semantic.success };
    case 'cancelled':
      return { label: 'Cancelled', icon: XCircle, color: colors.utility.secondaryText };
    case 'overdue':
      return { label: 'Overdue', icon: AlertTriangle, color: colors.semantic.error };
    default:
      return { label: status, icon: Clock, color: colors.utility.secondaryText };
  }
};

// =================================================================
// SUB-COMPONENTS — D1 (Shell)
// =================================================================

// ─── Perspective Switcher ───────────────────────────────────────

interface PerspectiveSwitcherProps {
  active: Perspective;
  onChange: (p: Perspective) => void;
  colors: any;
  isDarkMode: boolean;
}

const PerspectiveSwitcher: React.FC<PerspectiveSwitcherProps> = ({
  active,
  onChange,
  colors,
  isDarkMode,
}) => {
  const perspectives: Array<{ id: Perspective; label: string; sublabel: string }> = [
    { id: 'revenue', label: 'Revenue', sublabel: 'Clients' },
    { id: 'expense', label: 'Expense', sublabel: 'Vendors' },
  ];

  return (
    <div
      className="inline-flex rounded-xl p-1 gap-1"
      style={{
        background: isDarkMode ? 'rgba(30, 41, 59, 0.6)' : 'rgba(0, 0, 0, 0.06)',
        backdropFilter: 'blur(8px)',
      }}
    >
      {perspectives.map((p) => {
        const isActive = active === p.id;
        return (
          <button
            key={p.id}
            onClick={() => onChange(p.id)}
            className="px-5 py-2 rounded-lg text-sm font-semibold transition-all duration-200"
            style={{
              backgroundColor: isActive ? colors.brand.primary : 'transparent',
              color: isActive ? '#ffffff' : colors.utility.secondaryText,
              boxShadow: isActive ? `0 2px 8px ${colors.brand.primary}40` : 'none',
            }}
          >
            <span>{p.label}</span>
            <span
              className="ml-1.5 text-xs font-normal"
              style={{ opacity: isActive ? 0.85 : 0.6 }}
            >
              · {p.sublabel}
            </span>
          </button>
        );
      })}
    </div>
  );
};

// ─── Event Urgency Bucket Card ──────────────────────────────────

interface BucketCardProps {
  title: string;
  count: number;
  serviceCount: number;
  billingCount: number;
  color: string;
  colors: any;
  isDarkMode: boolean;
  isHighlighted?: boolean;
}

const BucketCard: React.FC<BucketCardProps> = ({
  title,
  count,
  serviceCount,
  billingCount,
  color,
  colors,
  isDarkMode,
  isHighlighted,
}) => (
  <div
    className="flex-1 min-w-[120px] p-3.5 rounded-xl border transition-all"
    style={{
      backgroundColor: isHighlighted
        ? `${color}08`
        : isDarkMode
          ? 'rgba(30, 41, 59, 0.6)'
          : 'rgba(255, 255, 255, 0.7)',
      borderColor: isHighlighted ? `${color}30` : `${colors.utility.primaryText}10`,
      backdropFilter: 'blur(8px)',
    }}
  >
    <div className="flex items-center justify-between mb-2">
      <span
        className="text-[10px] font-bold uppercase tracking-wider"
        style={{ color }}
      >
        {title}
      </span>
      <span
        className="text-lg font-bold"
        style={{ color: isHighlighted ? color : colors.utility.primaryText }}
      >
        {count}
      </span>
    </div>
    <div className="flex items-center gap-3 text-[10px]" style={{ color: colors.utility.secondaryText }}>
      <span className="flex items-center gap-1">
        <Wrench className="w-3 h-3" style={{ color: colors.semantic.success }} />
        {serviceCount}
      </span>
      <span className="flex items-center gap-1">
        <DollarSign className="w-3 h-3" style={{ color: colors.semantic.warning }} />
        {billingCount}
      </span>
    </div>
  </div>
);

// ─── VaNi Sidebar (Coming Soon) ────────────────────────────────

interface VaNiSidebarProps {
  colors: any;
  isDarkMode: boolean;
}

const VaNiSidebar: React.FC<VaNiSidebarProps> = ({ colors, isDarkMode }) => {
  const futureItems = [
    { icon: AlertTriangle, label: 'SLA Breach Alerts', description: 'Auto-detect SLA violations' },
    { icon: BellRing, label: 'Renewal Reminders', description: 'Smart renewal nudges' },
    { icon: CreditCard, label: 'Payment Nudges', description: 'Overdue invoice follow-ups' },
    { icon: ShieldCheck, label: 'Compliance Flags', description: 'Regulatory alerts' },
    { icon: Sparkles, label: 'Smart Recommendations', description: 'AI-powered insights' },
  ];

  return (
    <div
      className="rounded-2xl border overflow-hidden"
      style={{
        background: isDarkMode
          ? 'rgba(30, 41, 59, 0.8)'
          : 'rgba(255, 255, 255, 0.8)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
      }}
    >
      <div
        className="px-5 py-4 border-b flex items-center gap-2.5"
        style={{ borderColor: `${colors.utility.primaryText}10` }}
      >
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{
            background: `linear-gradient(135deg, ${colors.brand.primary}20, ${colors.brand.secondary}15)`,
          }}
        >
          <Sparkles className="h-4 w-4" style={{ color: colors.brand.primary }} />
        </div>
        <div>
          <h3 className="text-sm font-bold" style={{ color: colors.utility.primaryText }}>
            VaNi
          </h3>
          <p className="text-[10px]" style={{ color: colors.utility.secondaryText }}>
            AI Operations Assistant
          </p>
        </div>
      </div>
      <div className="p-5">
        <div
          className="text-center py-6 mb-4 rounded-xl"
          style={{ backgroundColor: `${colors.brand.primary}06` }}
        >
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3"
            style={{
              background: `linear-gradient(135deg, ${colors.brand.primary}15, ${colors.brand.primary}05)`,
            }}
          >
            <Sparkles className="h-7 w-7" style={{ color: colors.brand.primary }} />
          </div>
          <p className="text-sm font-semibold mb-1" style={{ color: colors.utility.primaryText }}>
            Coming Soon
          </p>
          <p className="text-xs px-4" style={{ color: colors.utility.secondaryText }}>
            VaNi will proactively surface alerts and recommendations here
          </p>
        </div>
        <div className="space-y-2.5">
          <p
            className="text-[10px] font-bold uppercase tracking-wider px-1"
            style={{ color: colors.utility.secondaryText }}
          >
            Planned Capabilities
          </p>
          {futureItems.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.label}
                className="flex items-center gap-3 p-2.5 rounded-lg"
                style={{ backgroundColor: `${colors.utility.primaryText}04` }}
              >
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: `${colors.utility.primaryText}08` }}
                >
                  <Icon className="h-3.5 w-3.5" style={{ color: colors.utility.secondaryText }} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium" style={{ color: colors.utility.primaryText }}>
                    {item.label}
                  </p>
                  <p className="text-[10px]" style={{ color: colors.utility.secondaryText }}>
                    {item.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ─── Footer Status Bar ─────────────────────────────────────────

interface FooterStatusBarProps {
  totalContracts: number;
  totalEvents: number;
  isRefreshing: boolean;
  onRefresh: () => void;
  colors: any;
  isDarkMode: boolean;
}

const FooterStatusBar: React.FC<FooterStatusBarProps> = ({
  totalContracts,
  totalEvents,
  isRefreshing,
  onRefresh,
  colors,
  isDarkMode,
}) => {
  const [lastRefreshed, setLastRefreshed] = useState(new Date());

  useEffect(() => {
    if (!isRefreshing) {
      setLastRefreshed(new Date());
    }
  }, [isRefreshing]);

  return (
    <div
      className="mt-6 px-5 py-3 rounded-xl border flex items-center justify-between"
      style={{
        background: isDarkMode
          ? 'rgba(30, 41, 59, 0.5)'
          : 'rgba(255, 255, 255, 0.6)',
        backdropFilter: 'blur(8px)',
        borderColor: `${colors.utility.primaryText}08`,
      }}
    >
      <div className="flex items-center gap-4 text-xs" style={{ color: colors.utility.secondaryText }}>
        <span className="flex items-center gap-1.5">
          <FileText className="h-3 w-3" />
          {totalContracts} contracts
        </span>
        <span className="flex items-center gap-1.5">
          <Calendar className="h-3 w-3" />
          {totalEvents} events
        </span>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-[10px]" style={{ color: colors.utility.secondaryText }}>
          Synced {lastRefreshed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all hover:opacity-80"
          style={{
            backgroundColor: `${colors.brand.primary}10`,
            color: colors.brand.primary,
          }}
        >
          <RefreshCw className={`h-3 w-3 ${isRefreshing ? 'animate-spin' : ''}`} />
          {isRefreshing ? 'Syncing...' : 'Refresh'}
        </button>
      </div>
    </div>
  );
};

// =================================================================
// SUB-COMPONENTS — D2 (Revenue Operational Cards)
// =================================================================

// ─── Card Shell ─────────────────────────────────────────────────

const GlassCard: React.FC<{
  children: React.ReactNode;
  colors: any;
  isDarkMode: boolean;
  className?: string;
}> = ({ children, colors, isDarkMode, className = '' }) => (
  <div
    className={`rounded-2xl border ${className}`}
    style={{
      background: isDarkMode
        ? 'rgba(30, 41, 59, 0.8)'
        : 'rgba(255, 255, 255, 0.8)',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
    }}
  >
    {children}
  </div>
);

// ─── Filter Pill ────────────────────────────────────────────────

const FilterPill: React.FC<{
  label: string;
  isActive: boolean;
  onClick: () => void;
  colors: any;
  count?: number;
}> = ({ label, isActive, onClick, colors, count }) => (
  <button
    onClick={onClick}
    className="px-3 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wide transition-all"
    style={{
      backgroundColor: isActive ? colors.brand.primary : `${colors.utility.primaryText}06`,
      color: isActive ? '#ffffff' : colors.utility.secondaryText,
    }}
  >
    {label}
    {count !== undefined && count > 0 && (
      <span
        className="ml-1 px-1.5 py-0.5 rounded-full text-[9px]"
        style={{
          backgroundColor: isActive ? 'rgba(255,255,255,0.25)' : `${colors.utility.primaryText}10`,
        }}
      >
        {count}
      </span>
    )}
  </button>
);

// ─── Awaiting Acceptance Card ───────────────────────────────────

interface AwaitingAcceptanceCardProps {
  contracts: Contract[];
  isLoading: boolean;
  onView: (id: string) => void;
  onResend: (id: string) => void;
  isSending: boolean;
  colors: any;
  isDarkMode: boolean;
}

const AwaitingAcceptanceCard: React.FC<AwaitingAcceptanceCardProps> = ({
  contracts,
  isLoading,
  onView,
  onResend,
  isSending,
  colors,
  isDarkMode,
}) => {
  if (isLoading) {
    return (
      <GlassCard colors={colors} isDarkMode={isDarkMode}>
        <div className="p-5 flex items-center justify-center py-10">
          <Loader2 className="h-5 w-5 animate-spin" style={{ color: colors.brand.primary }} />
          <span className="ml-2 text-xs" style={{ color: colors.utility.secondaryText }}>Loading...</span>
        </div>
      </GlassCard>
    );
  }

  return (
    <GlassCard colors={colors} isDarkMode={isDarkMode}>
      {/* Header */}
      <div className="px-5 py-4 flex items-center justify-between border-b" style={{ borderColor: `${colors.utility.primaryText}10` }}>
        <div className="flex items-center gap-2">
          <Send className="h-4 w-4" style={{ color: colors.semantic.warning }} />
          <h3 className="text-sm font-bold" style={{ color: colors.utility.primaryText }}>
            Awaiting Acceptance
          </h3>
        </div>
        <span
          className="text-[10px] font-bold px-2 py-0.5 rounded-full"
          style={{ backgroundColor: `${colors.semantic.warning}15`, color: colors.semantic.warning }}
        >
          {contracts.length}
        </span>
      </div>

      {/* List */}
      <div className="p-3">
        {contracts.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircle2 className="h-8 w-8 mx-auto mb-2" style={{ color: colors.semantic.success }} />
            <p className="text-xs font-medium" style={{ color: colors.utility.primaryText }}>All caught up</p>
            <p className="text-[10px]" style={{ color: colors.utility.secondaryText }}>No contracts awaiting acceptance</p>
          </div>
        ) : (
          <div className="space-y-2">
            {contracts.slice(0, 5).map((contract) => {
              const status = getAcceptanceStatus(contract);
              return (
                <div
                  key={contract.id}
                  className="flex items-center gap-3 p-3 rounded-xl transition-all hover:opacity-90"
                  style={{
                    backgroundColor: isDarkMode ? 'rgba(30, 41, 59, 0.5)' : 'rgba(0, 0, 0, 0.02)',
                    borderLeft: `3px solid ${status.color}`,
                  }}
                >
                  {/* Contract info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold truncate" style={{ color: colors.utility.primaryText }}>
                      {contract.title}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px]" style={{ color: colors.utility.secondaryText }}>
                        {contract.contract_number}
                      </span>
                      {contract.buyer_name && (
                        <span className="text-[10px]" style={{ color: colors.utility.secondaryText }}>
                          · {contract.buyer_name}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Status badge */}
                  <span
                    className="text-[9px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: status.bg, color: status.color }}
                  >
                    {status.label}
                  </span>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button
                      onClick={() => onView(contract.id)}
                      className="p-1.5 rounded-lg transition-all hover:opacity-80"
                      style={{ backgroundColor: `${colors.brand.primary}10` }}
                      title="View contract"
                    >
                      <Eye className="h-3.5 w-3.5" style={{ color: colors.brand.primary }} />
                    </button>
                    <button
                      onClick={() => onResend(contract.id)}
                      disabled={isSending}
                      className="p-1.5 rounded-lg transition-all hover:opacity-80"
                      style={{ backgroundColor: `${colors.semantic.warning}10` }}
                      title="Resend notification"
                    >
                      {isSending ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" style={{ color: colors.semantic.warning }} />
                      ) : (
                        <Send className="h-3.5 w-3.5" style={{ color: colors.semantic.warning }} />
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
            {contracts.length > 5 && (
              <p className="text-center text-[10px] pt-1" style={{ color: colors.utility.secondaryText }}>
                +{contracts.length - 5} more
              </p>
            )}
          </div>
        )}
      </div>
    </GlassCard>
  );
};

// ─── Service Events Card ────────────────────────────────────────

interface ServiceEventsCardProps {
  events: ContractEvent[];
  isLoading: boolean;
  timeFilter: EventTimeFilter;
  typeFilter: EventTypeFilter;
  onTimeFilterChange: (f: EventTimeFilter) => void;
  onTypeFilterChange: (f: EventTypeFilter) => void;
  onStatusChange: (eventId: string, newStatus: ContractEventStatus, version: number) => void;
  isUpdatingStatus: boolean;
  onViewContract: (contractId: string) => void;
  colors: any;
  isDarkMode: boolean;
}

const ServiceEventsCard: React.FC<ServiceEventsCardProps> = ({
  events,
  isLoading,
  timeFilter,
  typeFilter,
  onTimeFilterChange,
  onTypeFilterChange,
  onStatusChange,
  isUpdatingStatus,
  onViewContract,
  colors,
  isDarkMode,
}) => {
  const filteredEvents = useMemo(() => {
    if (typeFilter === 'all') return events;
    return events.filter((e) => e.event_type === typeFilter);
  }, [events, typeFilter]);

  return (
    <GlassCard colors={colors} isDarkMode={isDarkMode}>
      {/* Header + Filters */}
      <div className="px-5 py-4 border-b" style={{ borderColor: `${colors.utility.primaryText}10` }}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4" style={{ color: colors.brand.primary }} />
            <h3 className="text-sm font-bold" style={{ color: colors.utility.primaryText }}>
              Service Events
            </h3>
          </div>
          <span className="text-[10px]" style={{ color: colors.utility.secondaryText }}>
            {filteredEvents.length} events
          </span>
        </div>
        {/* Dual-axis filters */}
        <div className="flex items-center justify-between">
          <div className="flex gap-1.5">
            {(['today', 'week', 'month'] as EventTimeFilter[]).map((f) => (
              <FilterPill key={f} label={f === 'today' ? 'Today' : f === 'week' ? 'This Week' : 'This Month'}
                isActive={timeFilter === f} onClick={() => onTimeFilterChange(f)} colors={colors} />
            ))}
          </div>
          <div className="flex gap-1.5">
            {(['all', 'service', 'billing'] as EventTypeFilter[]).map((f) => (
              <FilterPill key={f} label={f === 'all' ? 'All' : f === 'service' ? 'Service' : 'Billing'}
                isActive={typeFilter === f} onClick={() => onTypeFilterChange(f)} colors={colors} />
            ))}
          </div>
        </div>
      </div>

      {/* Events list */}
      <div className="p-3">
        {isLoading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-5 w-5 animate-spin" style={{ color: colors.brand.primary }} />
            <span className="ml-2 text-xs" style={{ color: colors.utility.secondaryText }}>Loading events...</span>
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="text-center py-8">
            <Calendar className="h-8 w-8 mx-auto mb-2" style={{ color: colors.utility.secondaryText }} />
            <p className="text-xs font-medium" style={{ color: colors.utility.primaryText }}>No events</p>
            <p className="text-[10px]" style={{ color: colors.utility.secondaryText }}>
              No {typeFilter !== 'all' ? typeFilter : ''} events for this period
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredEvents.slice(0, 8).map((event) => {
              const isService = event.event_type === 'service';
              const accent = isService ? colors.semantic.success : colors.semantic.warning;
              const statusCfg = getEventStatusConfig(event.status, colors);
              const StatusIcon = statusCfg.icon;
              const transitions = VALID_STATUS_TRANSITIONS[event.status] || [];

              return (
                <div
                  key={event.id}
                  className="p-3 rounded-xl transition-all"
                  style={{
                    backgroundColor: isDarkMode ? 'rgba(30, 41, 59, 0.5)' : 'rgba(0, 0, 0, 0.02)',
                    borderLeft: `3px solid ${accent}`,
                  }}
                >
                  <div className="flex items-center gap-3">
                    {/* Icon */}
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: `${accent}12` }}
                    >
                      {isService ? (
                        <Wrench className="w-4 h-4" style={{ color: accent }} />
                      ) : (
                        <Receipt className="w-4 h-4" style={{ color: accent }} />
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold truncate" style={{ color: colors.utility.primaryText }}>
                        {event.block_name}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px]" style={{ color: colors.utility.secondaryText }}>
                          {formatEventDate(event.scheduled_date)}
                        </span>
                        {event.contract_title && (
                          <button
                            onClick={() => onViewContract(event.contract_id)}
                            className="text-[10px] truncate max-w-[120px] hover:underline"
                            style={{ color: colors.brand.primary }}
                          >
                            {event.contract_title}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Amount (billing) */}
                    {event.amount != null && event.amount > 0 && (
                      <span className="text-xs font-bold flex-shrink-0" style={{ color: colors.semantic.warning }}>
                        {Number(event.amount).toLocaleString()}
                      </span>
                    )}

                    {/* Status badge */}
                    <span
                      className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: `${statusCfg.color}12`, color: statusCfg.color }}
                    >
                      <StatusIcon className="w-3 h-3" />
                      {statusCfg.label}
                    </span>

                    {/* Quick action: advance status */}
                    {transitions.length > 0 && (
                      <button
                        onClick={() => onStatusChange(event.id, transitions[0] as ContractEventStatus, event.version)}
                        disabled={isUpdatingStatus}
                        className="p-1.5 rounded-lg transition-all hover:opacity-80 flex-shrink-0"
                        style={{ backgroundColor: `${colors.brand.primary}10` }}
                        title={`Mark as ${transitions[0]}`}
                      >
                        {isUpdatingStatus ? (
                          <Loader2 className="h-3 w-3 animate-spin" style={{ color: colors.brand.primary }} />
                        ) : (
                          <ChevronRight className="h-3 w-3" style={{ color: colors.brand.primary }} />
                        )}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
            {filteredEvents.length > 8 && (
              <p className="text-center text-[10px] pt-1" style={{ color: colors.utility.secondaryText }}>
                +{filteredEvents.length - 8} more events
              </p>
            )}
          </div>
        )}
      </div>
    </GlassCard>
  );
};

// ─── Action Queue Card ──────────────────────────────────────────

interface ActionQueueCardProps {
  draftContracts: Contract[];
  overdueEvents: ContractEvent[];
  pendingContracts: Contract[];
  isLoading: boolean;
  onViewContract: (id: string) => void;
  queueFilter: QueueFilter;
  onQueueFilterChange: (f: QueueFilter) => void;
  colors: any;
  isDarkMode: boolean;
}

const ActionQueueCard: React.FC<ActionQueueCardProps> = ({
  draftContracts,
  overdueEvents,
  pendingContracts,
  isLoading,
  onViewContract,
  queueFilter,
  onQueueFilterChange,
  colors,
  isDarkMode,
}) => {
  // Build unified queue items
  const queueItems = useMemo(() => {
    const items: Array<{
      id: string;
      type: 'draft' | 'urgent' | 'pending';
      title: string;
      subtitle: string;
      date: string;
      color: string;
      icon: any;
      contractId: string;
    }> = [];

    draftContracts.forEach((c) => {
      items.push({
        id: `draft-${c.id}`,
        type: 'draft',
        title: c.title,
        subtitle: `Draft · ${c.contract_number}`,
        date: c.updated_at,
        color: colors.utility.secondaryText,
        icon: Edit3,
        contractId: c.id,
      });
    });

    overdueEvents.forEach((e) => {
      items.push({
        id: `urgent-${e.id}`,
        type: 'urgent',
        title: e.block_name,
        subtitle: `Overdue · ${e.contract_title || e.contract_id}`,
        date: e.scheduled_date,
        color: colors.semantic.error,
        icon: AlertTriangle,
        contractId: e.contract_id,
      });
    });

    pendingContracts.forEach((c) => {
      items.push({
        id: `pending-${c.id}`,
        type: 'pending',
        title: c.title,
        subtitle: `Pending Review · ${c.contract_number}`,
        date: c.updated_at,
        color: colors.semantic.warning,
        icon: Clock,
        contractId: c.id,
      });
    });

    return items;
  }, [draftContracts, overdueEvents, pendingContracts, colors]);

  const filteredItems = useMemo(() => {
    if (queueFilter === 'all') return queueItems;
    return queueItems.filter((item) => item.type === queueFilter);
  }, [queueItems, queueFilter]);

  const counts = useMemo(() => ({
    all: queueItems.length,
    drafts: draftContracts.length,
    urgent: overdueEvents.length,
    pending: pendingContracts.length,
  }), [queueItems.length, draftContracts.length, overdueEvents.length, pendingContracts.length]);

  return (
    <GlassCard colors={colors} isDarkMode={isDarkMode}>
      {/* Header + Filters */}
      <div className="px-5 py-4 border-b" style={{ borderColor: `${colors.utility.primaryText}10` }}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Gauge className="h-4 w-4" style={{ color: colors.semantic.error }} />
            <h3 className="text-sm font-bold" style={{ color: colors.utility.primaryText }}>
              Action Queue
            </h3>
          </div>
          <span
            className="text-[10px] font-bold px-2 py-0.5 rounded-full"
            style={{ backgroundColor: `${colors.semantic.error}15`, color: colors.semantic.error }}
          >
            {counts.all}
          </span>
        </div>
        <div className="flex gap-1.5">
          {(['all', 'drafts', 'urgent', 'pending'] as QueueFilter[]).map((f) => (
            <FilterPill
              key={f}
              label={f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
              isActive={queueFilter === f}
              onClick={() => onQueueFilterChange(f)}
              colors={colors}
              count={counts[f]}
            />
          ))}
        </div>
      </div>

      {/* Queue list */}
      <div className="p-3">
        {isLoading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-5 w-5 animate-spin" style={{ color: colors.brand.primary }} />
            <span className="ml-2 text-xs" style={{ color: colors.utility.secondaryText }}>Loading...</span>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircle2 className="h-8 w-8 mx-auto mb-2" style={{ color: colors.semantic.success }} />
            <p className="text-xs font-medium" style={{ color: colors.utility.primaryText }}>Queue clear</p>
            <p className="text-[10px]" style={{ color: colors.utility.secondaryText }}>No actions pending</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredItems.slice(0, 6).map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.id}
                  className="flex items-center gap-3 p-3 rounded-xl transition-all hover:opacity-90 cursor-pointer"
                  style={{
                    backgroundColor: isDarkMode ? 'rgba(30, 41, 59, 0.5)' : 'rgba(0, 0, 0, 0.02)',
                    borderLeft: `3px solid ${item.color}`,
                  }}
                  onClick={() => onViewContract(item.contractId)}
                >
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: `${item.color}12` }}
                  >
                    <Icon className="w-4 h-4" style={{ color: item.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold truncate" style={{ color: colors.utility.primaryText }}>
                      {item.title}
                    </p>
                    <p className="text-[10px] truncate" style={{ color: colors.utility.secondaryText }}>
                      {item.subtitle}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-[10px]" style={{ color: colors.utility.secondaryText }}>
                      {formatEventDate(item.date)}
                    </span>
                    <ChevronRight className="h-3 w-3" style={{ color: colors.utility.secondaryText }} />
                  </div>
                </div>
              );
            })}
            {filteredItems.length > 6 && (
              <p className="text-center text-[10px] pt-1" style={{ color: colors.utility.secondaryText }}>
                +{filteredItems.length - 6} more actions
              </p>
            )}
          </div>
        )}
      </div>
    </GlassCard>
  );
};

// =================================================================
// MAIN PAGE COMPONENT
// =================================================================

const OpsCockpitPage: React.FC = () => {
  const navigate = useNavigate();
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  // Tenant profile — for default perspective
  const { profile, loading: profileLoading } = useTenantContext();

  // Perspective state — defaults from business_type_id once profile loads
  const [perspective, setPerspective] = useState<Perspective | null>(null);

  useEffect(() => {
    if (perspective === null && profile?.business_type_id) {
      setPerspective(profile.business_type_id === 'buyer' ? 'expense' : 'revenue');
    }
  }, [profile?.business_type_id, perspective]);

  const activePerspective: Perspective = perspective || 'revenue';

  // ─── D2 filter state ───
  const [eventTimeFilter, setEventTimeFilter] = useState<EventTimeFilter>('week');
  const [eventTypeFilter, setEventTypeFilter] = useState<EventTypeFilter>('all');
  const [queueFilter, setQueueFilter] = useState<QueueFilter>('all');

  // ─── D1 data hooks ───
  const {
    data: contractStats,
    isLoading: statsLoading,
    isFetching: statsFetching,
    refetch: refetchStats,
  } = useContractStats();

  const {
    data: dateSummary,
    isLoading: summaryLoading,
    isFetching: summaryFetching,
    refetch: refetchSummary,
  } = useTenantDateSummary();

  // ─── D2 data hooks ───
  // Contracts awaiting acceptance
  const {
    data: pendingAcceptanceData,
    isLoading: acceptanceLoading,
  } = useContracts({ status: 'pending_acceptance' as any, per_page: 10 });

  // Draft contracts (for action queue)
  const {
    data: draftContractsData,
    isLoading: draftsLoading,
  } = useContracts({ status: 'draft' as any, per_page: 10 });

  // Pending review contracts (for action queue)
  const {
    data: pendingReviewData,
    isLoading: pendingLoading,
  } = useContracts({ status: 'pending_review' as any, per_page: 10 });

  // Service events (filtered by time range)
  const dateRange = useMemo(() => getDateRange(eventTimeFilter), [eventTimeFilter]);
  const {
    data: eventsData,
    isLoading: eventsLoading,
  } = useContractEvents({
    date_from: dateRange.from,
    date_to: dateRange.to,
    per_page: 20,
    sort_by: 'scheduled_date',
    sort_order: 'asc',
  });

  // Overdue events (for action queue)
  const {
    data: overdueEventsData,
    isLoading: overdueLoading,
  } = useContractEvents({
    status: 'overdue' as any,
    per_page: 10,
    sort_by: 'scheduled_date',
    sort_order: 'asc',
  });

  // Mutations
  const { sendNotification, isSendingNotification } = useContractOperations();
  const { updateStatus: updateEventStatus, isChangingStatus } = useContractEventOperations();

  // ─── Derived values ───
  const isLoading = profileLoading || statsLoading || summaryLoading;
  const isRefreshing = statsFetching || summaryFetching;

  const stats = useMemo(() => {
    if (!contractStats) return { active: 0, pendingAcceptance: 0, drafts: 0, total: 0 };
    const byStatus = contractStats.by_status || {};
    return {
      active: Number(byStatus.active) || 0,
      pendingAcceptance: Number(byStatus.pending_acceptance) || 0,
      drafts: Number(byStatus.draft) || 0,
      total: Number(contractStats.total) || 0,
    };
  }, [contractStats]);

  const urgency = useMemo(() => {
    const empty = { count: 0, service_count: 0, billing_count: 0, billing_amount: 0, by_status: {} };
    const safeBucket = (b: any) => ({
      count: Number(b?.count) || 0,
      service_count: Number(b?.service_count) || 0,
      billing_count: Number(b?.billing_count) || 0,
      billing_amount: Number(b?.billing_amount) || 0,
      by_status: b?.by_status || {},
    });
    if (!dateSummary) {
      return {
        overdue: empty, today: empty, tomorrow: empty,
        this_week: empty, next_week: empty, later: empty,
        totals: { total_events: 0, total_billing_amount: 0 },
      };
    }
    return {
      overdue: safeBucket(dateSummary.overdue),
      today: safeBucket(dateSummary.today),
      tomorrow: safeBucket(dateSummary.tomorrow),
      this_week: safeBucket(dateSummary.this_week),
      next_week: safeBucket(dateSummary.next_week),
      later: safeBucket(dateSummary.later),
      totals: {
        total_events: Number(dateSummary.totals?.total_events) || 0,
        total_billing_amount: Number(dateSummary.totals?.total_billing_amount) || 0,
      },
    };
  }, [dateSummary]);

  const pendingAcceptanceContracts = useMemo(() => pendingAcceptanceData?.items || [], [pendingAcceptanceData]);
  const draftContracts = useMemo(() => draftContractsData?.items || [], [draftContractsData]);
  const pendingReviewContracts = useMemo(() => pendingReviewData?.items || [], [pendingReviewData]);
  const serviceEvents = useMemo(() => eventsData?.items || [], [eventsData]);
  const overdueEvents = useMemo(() => overdueEventsData?.items || [], [overdueEventsData]);

  // ─── Handlers ───
  const handleRefresh = useCallback(() => {
    refetchStats();
    refetchSummary();
  }, [refetchStats, refetchSummary]);

  const handleViewContract = useCallback((id: string) => {
    navigate(`/contracts/${id}`);
  }, [navigate]);

  const handleResendNotification = useCallback(async (contractId: string) => {
    try {
      await sendNotification({ contractId });
    } catch {
      // Toast handled by hook
    }
  }, [sendNotification]);

  const handleEventStatusChange = useCallback(async (eventId: string, newStatus: ContractEventStatus, version: number) => {
    try {
      await updateEventStatus({ eventId, newStatus, version });
    } catch {
      // Toast handled by hook
    }
  }, [updateEventStatus]);

  // CTAs per perspective
  const revenueCTAs = [
    { label: 'New Contract', icon: Plus, action: () => navigate('/contracts/create') },
    { label: 'Add Client', icon: Users, action: () => navigate('/contacts') },
  ];

  const expenseCTAs = [
    { label: 'New RFQ', icon: Plus, action: () => navigate('/contracts/create') },
    { label: 'Claim CNAK', icon: ShieldCheck, action: () => navigate('/contracts/claim') },
  ];

  const activeCTAs = activePerspective === 'revenue' ? revenueCTAs : expenseCTAs;

  // ─── Loading ───
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <VaNiLoader
          size="md"
          message="Loading Operations Cockpit..."
          showSkeleton
          skeletonVariant="card"
          skeletonCount={4}
        />
      </div>
    );
  }

  return (
    <div
      className="min-h-screen p-6"
      style={{ backgroundColor: colors.utility.primaryBackground }}
    >
      {/* ═══════ HEADER ═══════ */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{
              background: `linear-gradient(135deg, ${colors.brand.primary}20, ${colors.brand.secondary}15)`,
            }}
          >
            <Gauge className="h-5 w-5" style={{ color: colors.brand.primary }} />
          </div>
          <div>
            <h1
              className="text-xl font-bold"
              style={{ color: colors.utility.primaryText }}
            >
              Operations Cockpit
            </h1>
            <p
              className="text-xs"
              style={{ color: colors.utility.secondaryText }}
            >
              {activePerspective === 'revenue'
                ? 'Revenue operations — what needs your attention today'
                : 'Expense operations — procurement & vendor management'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <PerspectiveSwitcher
            active={activePerspective}
            onChange={(p) => setPerspective(p)}
            colors={colors}
            isDarkMode={isDarkMode}
          />
          {activeCTAs.map((cta) => {
            const Icon = cta.icon;
            return (
              <button
                key={cta.label}
                onClick={cta.action}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all hover:opacity-90"
                style={{
                  backgroundColor: colors.brand.primary,
                  color: '#ffffff',
                  boxShadow: `0 2px 8px ${colors.brand.primary}30`,
                }}
              >
                <Icon className="h-3.5 w-3.5" />
                {cta.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ═══════ STAT CARDS ROW ═══════ */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatCard
          label="Active Contracts"
          value={stats.active}
          icon={FileText}
          iconColor={colors.semantic.success}
          size="sm"
        />
        <StatCard
          label="Pending Acceptance"
          value={stats.pendingAcceptance}
          icon={Send}
          iconColor={colors.semantic.warning}
          size="sm"
        />
        <StatCard
          label="Drafts"
          value={stats.drafts}
          icon={FileText}
          iconColor={colors.utility.secondaryText}
          size="sm"
        />
        <StatCard
          label="Overdue Events"
          value={urgency.overdue.count}
          icon={AlertTriangle}
          iconColor={urgency.overdue.count > 0 ? colors.semantic.error : colors.utility.secondaryText}
          size="sm"
        />
      </div>

      {/* ═══════ MAIN GRID: Content + VaNi Sidebar ═══════ */}
      <div className="grid gap-6" style={{ gridTemplateColumns: '1fr 300px' }}>
        {/* Left: Main Content */}
        <div className="space-y-6">

          {/* Event Urgency Buckets */}
          <GlassCard colors={colors} isDarkMode={isDarkMode} className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" style={{ color: colors.brand.primary }} />
                <h3 className="text-sm font-bold" style={{ color: colors.utility.primaryText }}>
                  Event Schedule
                </h3>
              </div>
              <span className="text-xs" style={{ color: colors.utility.secondaryText }}>
                {urgency.totals.total_events} total events
              </span>
            </div>
            <div className="flex gap-3">
              <BucketCard title="Overdue" count={urgency.overdue.count}
                serviceCount={urgency.overdue.service_count} billingCount={urgency.overdue.billing_count}
                color={colors.semantic.error} colors={colors} isDarkMode={isDarkMode}
                isHighlighted={urgency.overdue.count > 0} />
              <BucketCard title="Today" count={urgency.today.count}
                serviceCount={urgency.today.service_count} billingCount={urgency.today.billing_count}
                color={colors.brand.primary} colors={colors} isDarkMode={isDarkMode}
                isHighlighted={urgency.today.count > 0} />
              <BucketCard title="Tomorrow" count={urgency.tomorrow.count}
                serviceCount={urgency.tomorrow.service_count} billingCount={urgency.tomorrow.billing_count}
                color={colors.brand.secondary} colors={colors} isDarkMode={isDarkMode} />
              <BucketCard title="This Week" count={urgency.this_week.count}
                serviceCount={urgency.this_week.service_count} billingCount={urgency.this_week.billing_count}
                color={colors.semantic?.info || colors.brand.secondary} colors={colors} isDarkMode={isDarkMode} />
              <BucketCard title="Next Week" count={urgency.next_week.count}
                serviceCount={urgency.next_week.service_count} billingCount={urgency.next_week.billing_count}
                color={colors.semantic.warning} colors={colors} isDarkMode={isDarkMode} />
              <BucketCard title="Later" count={urgency.later.count}
                serviceCount={urgency.later.service_count} billingCount={urgency.later.billing_count}
                color={colors.utility.secondaryText} colors={colors} isDarkMode={isDarkMode} />
            </div>
          </GlassCard>

          {/* ═══ D2: Revenue Operational Cards ═══ */}
          {activePerspective === 'revenue' && (
            <>
              {/* Awaiting Acceptance */}
              <AwaitingAcceptanceCard
                contracts={pendingAcceptanceContracts}
                isLoading={acceptanceLoading}
                onView={handleViewContract}
                onResend={handleResendNotification}
                isSending={isSendingNotification}
                colors={colors}
                isDarkMode={isDarkMode}
              />

              {/* Service Events */}
              <ServiceEventsCard
                events={serviceEvents}
                isLoading={eventsLoading}
                timeFilter={eventTimeFilter}
                typeFilter={eventTypeFilter}
                onTimeFilterChange={setEventTimeFilter}
                onTypeFilterChange={setEventTypeFilter}
                onStatusChange={handleEventStatusChange}
                isUpdatingStatus={isChangingStatus}
                onViewContract={handleViewContract}
                colors={colors}
                isDarkMode={isDarkMode}
              />

              {/* Action Queue */}
              <ActionQueueCard
                draftContracts={draftContracts}
                overdueEvents={overdueEvents}
                pendingContracts={pendingReviewContracts}
                isLoading={draftsLoading || overdueLoading || pendingLoading}
                onViewContract={handleViewContract}
                queueFilter={queueFilter}
                onQueueFilterChange={setQueueFilter}
                colors={colors}
                isDarkMode={isDarkMode}
              />
            </>
          )}

          {/* Expense placeholder — D3/D4 */}
          {activePerspective === 'expense' && (
            <div
              className="rounded-2xl border p-8 text-center"
              style={{
                background: isDarkMode ? 'rgba(30, 41, 59, 0.4)' : 'rgba(255, 255, 255, 0.5)',
                backdropFilter: 'blur(8px)',
                borderColor: `${colors.utility.primaryText}15`,
                borderStyle: 'dashed',
              }}
            >
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3"
                style={{ backgroundColor: `${colors.brand.primary}10` }}
              >
                <Gauge className="h-6 w-6" style={{ color: colors.brand.primary }} />
              </div>
              <p className="text-sm font-semibold mb-1" style={{ color: colors.utility.primaryText }}>
                Expense Cards — Next Delivery
              </p>
              <p className="text-xs" style={{ color: colors.utility.secondaryText }}>
                CNAK Verification · RFQ Tracker · Service Events · Action Queue
              </p>
            </div>
          )}
        </div>

        {/* Right: VaNi Sidebar */}
        <VaNiSidebar colors={colors} isDarkMode={isDarkMode} />
      </div>

      {/* ═══════ FOOTER STATUS BAR ═══════ */}
      <FooterStatusBar
        totalContracts={stats.total}
        totalEvents={urgency.totals.total_events}
        isRefreshing={isRefreshing}
        onRefresh={handleRefresh}
        colors={colors}
        isDarkMode={isDarkMode}
      />
    </div>
  );
};

export default OpsCockpitPage;
