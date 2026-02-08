// src/pages/ops/cockpit/index.tsx
// Operations Cockpit — Revenue & Expense command center
// D1: Shell + Stats + Event Urgency + VaNi Sidebar + Footer
// D2: Awaiting Acceptance + Service Events + Action Queue (Revenue)
// Theme: Uses currentTheme brand colors (not hardcoded green)

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
  useContractEvents,
  useContractEventOperations,
} from '@/hooks/queries/useContractEventQueries';
import { StatCard } from '@/components/subscription/cards/StatCard';
import { VaNiLoader } from '@/components/common/loaders/UnifiedLoader';
import type { Contract } from '@/types/contracts';
import type { ContractEvent, ContractEventStatus } from '@/types/contractEvents';
import { VALID_STATUS_TRANSITIONS } from '@/types/contractEvents';
import QuickAddContactDrawer from '@/components/contacts/QuickAddContactDrawer';
import ContractWizard from '@/components/contracts/ContractWizard';
import type { ContractType } from '@/components/contracts/ContractWizard';
import { useAuth } from '@/context/AuthContext';
import { prefetchContacts } from '@/hooks/useContacts';

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

/** Append hex alpha to a #RRGGBB color string */
const withOpacity = (hex: string, opacity: number): string => {
  const base = (hex || '#6B7280').slice(0, 7);
  const alpha = Math.round(opacity * 255).toString(16).padStart(2, '0');
  return base + alpha;
};

const formatEventDate = (dateStr: string): string => {
  const d = new Date(dateStr);
  return `${d.getDate()}-${MONTHS[d.getMonth()]}-${d.getFullYear()}`;
};

const daysSince = (dateStr: string): number => {
  const d = new Date(dateStr);
  const now = new Date();
  return Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
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

const getAcceptanceStatus = (contract: Contract): { label: string; color: string; bgClass: string; borderClass: string } => {
  if (contract.accepted_at) {
    return { label: 'Viewed', color: '#10B981', bgClass: 'bg-green-50 dark:bg-green-500/10', borderClass: 'border-green-200 dark:border-green-500/30' };
  }
  if (contract.sent_at) {
    return { label: 'Opened', color: '#F59E0B', bgClass: 'bg-amber-50 dark:bg-amber-500/10', borderClass: 'border-amber-200 dark:border-amber-500/30' };
  }
  return { label: 'Not Seen', color: '#EF4444', bgClass: 'bg-red-50 dark:bg-red-500/10', borderClass: 'border-red-200 dark:border-red-500/30' };
};

const getEventStatusConfig = (status: ContractEventStatus) => {
  switch (status) {
    case 'overdue':
      return { label: 'Overdue', icon: AlertTriangle, color: '#EF4444', dotClass: 'bg-red-500 shadow-red-500/30' };
    case 'scheduled':
      return { label: 'Scheduled', icon: CalendarDays, color: '#3B82F6', dotClass: 'bg-blue-500' };
    case 'in_progress':
      return { label: 'In Progress', icon: PlayCircle, color: '#8B5CF6', dotClass: 'bg-purple-500' };
    case 'completed':
      return { label: 'Completed', icon: CheckCircle2, color: '#10B981', dotClass: 'bg-green-500' };
    case 'cancelled':
      return { label: 'Cancelled', icon: XCircle, color: '#9CA3AF', dotClass: 'bg-gray-400' };
    default:
      return { label: status, icon: Clock, color: '#6B7280', dotClass: 'bg-gray-400' };
  }
};

const getInitials = (name?: string): string => {
  if (!name) return '??';
  return name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);
};

const AVATAR_COLORS = ['#6366F1', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#3B82F6', '#EF4444', '#14B8A6'];
const getAvatarColor = (str: string): string => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
};

// =================================================================
// SUB-COMPONENTS
// =================================================================

// ─── Perspective Switcher (below heading) ───────────────────────

interface PerspectiveSwitcherProps {
  active: Perspective;
  onChange: (p: Perspective) => void;
  isDarkMode: boolean;
  brandColor: string;
}

const PerspectiveSwitcher: React.FC<PerspectiveSwitcherProps> = ({
  active,
  onChange,
  isDarkMode,
  brandColor,
}) => {
  const perspectives: Array<{ id: Perspective; label: string; sublabel: string }> = [
    { id: 'revenue', label: 'Revenue', sublabel: 'Clients' },
    { id: 'expense', label: 'Expense', sublabel: 'Vendors' },
  ];

  return (
    <div className={`inline-flex rounded-lg p-0.5 gap-0.5 ${
      isDarkMode ? 'bg-gray-800' : 'bg-gray-100'
    }`}>
      {perspectives.map((p) => {
        const isActive = active === p.id;
        return (
          <button
            key={p.id}
            onClick={() => onChange(p.id)}
            className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-all duration-200 ${
              isActive
                ? 'text-white shadow-sm'
                : isDarkMode
                  ? 'text-gray-400 hover:text-gray-200'
                  : 'text-gray-500 hover:text-gray-700'
            }`}
            style={isActive ? { backgroundColor: brandColor } : undefined}
          >
            {p.label}
            <span className={`ml-1 text-xs font-normal ${isActive ? 'opacity-80' : ''}`}>
              · {p.sublabel}
            </span>
          </button>
        );
      })}
    </div>
  );
};

// ─── Filter Pill (contacts-style) ───────────────────────────────

const FilterPill: React.FC<{
  label: string;
  isActive: boolean;
  onClick: () => void;
  isDarkMode: boolean;
  count?: number;
}> = ({ label, isActive, onClick, isDarkMode, count }) => (
  <button
    onClick={onClick}
    className={`px-2.5 py-1 rounded-md text-[10px] font-semibold transition-all whitespace-nowrap ${
      isActive
        ? isDarkMode ? 'bg-gray-600 text-white font-bold' : 'bg-gray-200 text-gray-900 font-bold'
        : isDarkMode ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'
    }`}
  >
    {label}
    {count !== undefined && count > 0 && (
      <span className={`ml-1 px-1 py-0.5 rounded text-[9px] ${
        isActive
          ? isDarkMode ? 'bg-gray-500' : 'bg-gray-300'
          : isDarkMode ? 'bg-gray-700' : 'bg-gray-100'
      }`}>
        {count}
      </span>
    )}
  </button>
);

// ─── Event Urgency Bucket Card ──────────────────────────────────

interface BucketCardProps {
  title: string;
  count: number;
  serviceCount: number;
  billingCount: number;
  color: string;
  isDarkMode: boolean;
  isHighlighted?: boolean;
}

const BucketCard: React.FC<BucketCardProps> = ({
  title,
  count,
  serviceCount,
  billingCount,
  color,
  isDarkMode,
  isHighlighted,
}) => (
  <div
    className={`p-3 rounded-xl border transition-all ${
      isDarkMode ? 'border-gray-700 bg-gray-800/50' : 'border-gray-200 bg-white'
    }`}
    style={{
      borderLeftWidth: isHighlighted ? '3px' : '1px',
      borderLeftColor: isHighlighted ? color : undefined,
    }}
  >
    <div className="flex items-center justify-between mb-2">
      <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color }}>
        {title}
      </span>
      <span
        className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}
        style={{ color: isHighlighted ? color : undefined }}
      >
        {count}
      </span>
    </div>
    <div className={`flex items-center gap-3 text-[10px] ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
      <span className="flex items-center gap-1">
        <Wrench className="w-3 h-3" style={{ color: '#10B981' }} />
        {serviceCount}
      </span>
      <span className="flex items-center gap-1">
        <DollarSign className="w-3 h-3" style={{ color: '#F59E0B' }} />
        {billingCount}
      </span>
    </div>
  </div>
);

// ─── VaNi Sidebar (Coming Soon) ────────────────────────────────

const VaNiSidebar: React.FC<{ isDarkMode: boolean }> = ({ isDarkMode }) => {
  const futureItems = [
    { icon: AlertTriangle, label: 'SLA Breach Alerts', description: 'Auto-detect SLA violations' },
    { icon: BellRing, label: 'Renewal Reminders', description: 'Smart renewal nudges' },
    { icon: CreditCard, label: 'Payment Nudges', description: 'Overdue invoice follow-ups' },
    { icon: ShieldCheck, label: 'Compliance Flags', description: 'Regulatory alerts' },
    { icon: Sparkles, label: 'Smart Recommendations', description: 'AI-powered insights' },
  ];

  return (
    <div className={`rounded-xl border overflow-hidden ${
      isDarkMode ? 'border-gray-700 bg-gray-800/50' : 'border-gray-200 bg-white'
    }`}>
      <div className={`px-5 py-4 border-b flex items-center gap-2.5 ${
        isDarkMode ? 'border-gray-700' : 'border-gray-200'
      }`}>
        <div className="p-2 rounded-lg bg-purple-500/10">
          <Sparkles className="h-4 w-4 text-purple-500" />
        </div>
        <div>
          <h3 className={`text-sm font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>VaNi</h3>
          <p className={`text-[10px] ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>AI Operations Assistant</p>
        </div>
      </div>
      <div className="p-5">
        <div className={`text-center py-6 mb-4 rounded-xl ${isDarkMode ? 'bg-gray-700/30' : 'bg-gray-50'}`}>
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3 ${
            isDarkMode ? 'bg-purple-500/10' : 'bg-purple-50'
          }`}>
            <Sparkles className="h-7 w-7 text-purple-500" />
          </div>
          <p className={`text-sm font-semibold mb-1 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Coming Soon</p>
          <p className={`text-xs px-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            VaNi will proactively surface alerts and recommendations here
          </p>
        </div>
        <div className="space-y-2.5">
          <p className={`text-[10px] font-bold uppercase tracking-wider px-1 ${
            isDarkMode ? 'text-gray-500' : 'text-gray-400'
          }`}>
            Planned Capabilities
          </p>
          {futureItems.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className={`flex items-center gap-3 p-2.5 rounded-lg ${
                isDarkMode ? 'bg-gray-700/30' : 'bg-gray-50'
              }`}>
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  isDarkMode ? 'bg-gray-700' : 'bg-gray-100'
                }`}>
                  <Icon className={`h-3.5 w-3.5 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                </div>
                <div className="min-w-0">
                  <p className={`text-xs font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{item.label}</p>
                  <p className={`text-[10px] ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>{item.description}</p>
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

const FooterStatusBar: React.FC<{
  totalContracts: number;
  totalEvents: number;
  isRefreshing: boolean;
  onRefresh: () => void;
  isDarkMode: boolean;
  brandColor: string;
}> = ({ totalContracts, totalEvents, isRefreshing, onRefresh, isDarkMode, brandColor }) => {
  const [lastRefreshed, setLastRefreshed] = useState(new Date());

  useEffect(() => {
    if (!isRefreshing) setLastRefreshed(new Date());
  }, [isRefreshing]);

  return (
    <div className={`mt-6 px-5 py-3 rounded-xl border flex items-center justify-between ${
      isDarkMode ? 'border-gray-700 bg-gray-800/50' : 'border-gray-200 bg-white'
    }`}>
      <div className={`flex items-center gap-4 text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
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
        <span className={`text-[10px] ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
          Synced {lastRefreshed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all"
          style={{
            backgroundColor: withOpacity(brandColor, isDarkMode ? 0.2 : 0.08),
            color: brandColor,
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
// D2 — REVENUE OPERATIONAL CARDS
// =================================================================

// ─── Awaiting Acceptance Card (v3 HTML style) ───────────────────

const AwaitingAcceptanceCard: React.FC<{
  contracts: Contract[];
  isLoading: boolean;
  onView: (id: string) => void;
  onResend: (id: string) => void;
  isSending: boolean;
  isDarkMode: boolean;
  brandColor: string;
}> = ({ contracts, isLoading, onView, onResend, isSending, isDarkMode, brandColor }) => {
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className={`rounded-xl border ${isDarkMode ? 'border-gray-700 bg-gray-800/50' : 'border-gray-200 bg-white'}`}>
        <div className="p-5 flex items-center justify-center py-10">
          <Loader2 className="h-5 w-5 animate-spin" style={{ color: brandColor }} />
          <span className={`ml-2 text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-xl border overflow-hidden ${
      isDarkMode ? 'border-gray-700 bg-gray-800/50' : 'border-gray-200 bg-white'
    }`}>
      {/* Header — matches v3 .acceptance-header */}
      <div className={`px-4 py-3 flex items-center justify-between border-b ${
        isDarkMode ? 'border-gray-700' : 'border-gray-200'
      }`}>
        <div className="flex items-center gap-2">
          <span className={`text-[11px] uppercase tracking-wider font-bold ${
            isDarkMode ? 'text-gray-400' : 'text-gray-500'
          }`}>
            Awaiting Acceptance
          </span>
          <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${
            isDarkMode
              ? 'bg-purple-500/10 text-purple-400 border-purple-500/30'
              : 'bg-purple-50 text-purple-600 border-purple-200'
          }`}>
            {String(contracts.length).padStart(2, '0')}
          </span>
        </div>
        <button
          onClick={() => navigate('/contracts?status=pending_acceptance')}
          className="text-[10px] font-bold hover:underline"
          style={{ color: brandColor }}
        >
          View all in Hub →
        </button>
      </div>

      {/* Body — single-line horizontal scroll */}
      <div
        className="overflow-x-auto"
        style={{ overflowY: 'hidden' }}
      >
        {contracts.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-500" />
            <p className={`text-xs font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>All caught up</p>
            <p className={`text-[10px] ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>No contracts awaiting acceptance</p>
          </div>
        ) : (
          <div className="flex gap-3 p-3" style={{ minWidth: 'max-content' }}>
            {contracts.map((contract) => {
              const status = getAcceptanceStatus(contract);
              const initials = getInitials(contract.buyer_name || contract.buyer_company);
              const avatarColor = getAvatarColor(contract.buyer_name || contract.id);
              const sentDays = contract.sent_at ? daysSince(contract.sent_at) : null;

              return (
                <div
                  key={contract.id}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors cursor-pointer flex-shrink-0 ${
                    isDarkMode
                      ? 'border-gray-700 hover:bg-gray-700/30'
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                  style={{ minWidth: '320px', maxWidth: '320px' }}
                >
                  {/* Avatar */}
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center text-xs font-extrabold text-white flex-shrink-0"
                    style={{ backgroundColor: avatarColor }}
                  >
                    {initials}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-bold truncate ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      {contract.contract_number} — {contract.title}
                    </p>
                    <p className={`text-[10px] flex items-center gap-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      {contract.buyer_name || contract.buyer_company || 'Unknown'}
                      {sentDays !== null && (
                        <span> · Sent {sentDays}d ago</span>
                      )}
                    </p>
                  </div>

                  {/* Status + Actions */}
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span
                      className={`text-[8px] font-bold uppercase tracking-wider px-2 py-1 rounded border ${
                        isDarkMode ? status.bgClass.replace('dark:', '') : status.bgClass.split(' ')[0]
                      } ${isDarkMode ? status.borderClass.replace('dark:', '') : status.borderClass.split(' ')[0]}`}
                      style={{ color: status.color }}
                    >
                      {status.label}
                    </span>
                    <button
                      onClick={(e) => { e.stopPropagation(); onView(contract.id); }}
                      className={`w-7 h-7 rounded-md border flex items-center justify-center transition-all ${
                        isDarkMode
                          ? 'border-gray-600 bg-gray-700 hover:bg-gray-600'
                          : 'border-gray-200 bg-white hover:bg-gray-50'
                      }`}
                      title="View contract"
                    >
                      <Eye className={`h-3.5 w-3.5 ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`} />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); onResend(contract.id); }}
                      disabled={isSending}
                      className={`w-7 h-7 rounded-md border flex items-center justify-center transition-all ${
                        isDarkMode
                          ? 'border-gray-600 bg-gray-700'
                          : 'border-gray-200 bg-white'
                      } group`}
                      title="Resend notification"
                      style={{ '--hover-brand': brandColor } as React.CSSProperties}
                      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = brandColor; e.currentTarget.style.borderColor = brandColor; }}
                      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = ''; e.currentTarget.style.borderColor = ''; }}
                    >
                      {isSending ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-gray-400" />
                      ) : (
                        <Send className={`h-3.5 w-3.5 ${
                          isDarkMode ? 'text-gray-300' : 'text-gray-500'
                        } group-hover:text-white`} />
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

// ─── CNAK Verification Card (expense — v3 HTML style) ───────────

const CnakVerificationCard: React.FC<{
  contracts: Contract[];
  isLoading: boolean;
  onView: (id: string) => void;
  onAccept: (id: string) => void;
  onReject: (id: string) => void;
  isProcessing: boolean;
  isDarkMode: boolean;
  brandColor: string;
}> = ({ contracts, isLoading, onView, onAccept, onReject, isProcessing, isDarkMode, brandColor }) => {
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className={`rounded-xl border ${isDarkMode ? 'border-gray-700 bg-gray-800/50' : 'border-gray-200 bg-white'}`}>
        <div className="p-5 flex items-center justify-center py-10">
          <Loader2 className="h-5 w-5 animate-spin" style={{ color: brandColor }} />
          <span className={`ml-2 text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-xl border overflow-hidden ${
      isDarkMode ? 'border-gray-700 bg-gray-800/50' : 'border-gray-200 bg-white'
    }`}>
      {/* Header — matches v3 .cnak-header */}
      <div className={`px-4 py-3 flex items-center justify-between border-b ${
        isDarkMode ? 'border-gray-700' : 'border-gray-200'
      }`}>
        <div className="flex items-center gap-2">
          <span className={`text-[11px] uppercase tracking-wider font-bold ${
            isDarkMode ? 'text-gray-400' : 'text-gray-500'
          }`}>
            CNAK Verification — Incoming Contracts
          </span>
          <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${
            isDarkMode
              ? 'bg-blue-500/10 text-blue-400 border-blue-500/30'
              : 'bg-blue-50 text-blue-600 border-blue-200'
          }`}>
            {String(contracts.length).padStart(2, '0')}
          </span>
        </div>
        <button
          onClick={() => navigate('/contracts/claim')}
          className="text-[10px] font-bold hover:underline"
          style={{ color: brandColor }}
        >
          Claim via CNAK →
        </button>
      </div>

      {/* Body — grid layout, scrollable, matches v3 .cnak-body */}
      <div className="overflow-y-auto" style={{ maxHeight: '280px' }}>
        {contracts.length === 0 ? (
          <div className="text-center py-8">
            <ShieldCheck className="h-8 w-8 mx-auto mb-2" style={{ color: brandColor }} />
            <p className={`text-xs font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>No pending verifications</p>
            <p className={`text-[10px] ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Incoming contracts will appear here</p>
          </div>
        ) : (
          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
            {contracts.map((contract) => {
              const initials = getInitials(contract.buyer_name || contract.buyer_company);
              const avatarColor = getAvatarColor(contract.buyer_name || contract.id);
              const receivedDays = contract.sent_at ? daysSince(contract.sent_at) : null;
              const cnakCode = contract.global_access_id || '—';
              const amount = contract.grand_total || contract.total_value;

              return (
                <div
                  key={contract.id}
                  className={`flex items-center gap-3 px-4 py-3.5 border-b transition-colors cursor-pointer ${
                    isDarkMode
                      ? 'border-gray-700/50 hover:bg-gray-700/30'
                      : 'border-gray-100 hover:bg-gray-50'
                  }`}
                  style={{ borderRight: '1px solid', borderRightColor: isDarkMode ? 'rgba(55,65,81,0.5)' : 'rgba(243,244,246,1)' }}
                  onClick={() => onView(contract.id)}
                >
                  {/* Avatar */}
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center text-xs font-extrabold text-white flex-shrink-0"
                    style={{ backgroundColor: avatarColor }}
                  >
                    {initials}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-bold truncate ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      {contract.contract_number} — {contract.title}
                    </p>
                    <p className={`text-[10px] ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      From: {contract.buyer_name || contract.buyer_company || 'Unknown'}
                      {receivedDays !== null && ` · ${receivedDays === 0 ? 'Today' : `${receivedDays}d ago`}`}
                      {amount != null && amount > 0 && (
                        <span className="font-bold"> · {Number(amount).toLocaleString()}</span>
                      )}
                    </p>
                  </div>

                  {/* CNAK Code + Status + Actions */}
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span className={`text-[9px] font-bold font-mono px-1.5 py-0.5 rounded ${
                      isDarkMode
                        ? 'bg-gray-700 text-blue-400'
                        : 'bg-gray-100 text-blue-600'
                    }`}>
                      {cnakCode}
                    </span>
                    <span className={`text-[8px] font-bold uppercase tracking-wider px-2 py-1 rounded border ${
                      isDarkMode
                        ? 'bg-red-500/10 text-red-400 border-red-500/30'
                        : 'bg-red-50 text-red-600 border-red-200'
                    }`}>
                      Not Reviewed
                    </span>
                    <button
                      onClick={(e) => { e.stopPropagation(); onView(contract.id); }}
                      className={`w-7 h-7 rounded-md border flex items-center justify-center transition-all ${
                        isDarkMode
                          ? 'border-gray-600 bg-gray-700 hover:bg-gray-600'
                          : 'border-gray-200 bg-white hover:bg-gray-50'
                      }`}
                      title="View contract"
                    >
                      <Eye className={`h-3.5 w-3.5 ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`} />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); onAccept(contract.id); }}
                      disabled={isProcessing}
                      className={`w-7 h-7 rounded-md border flex items-center justify-center transition-all ${
                        isDarkMode
                          ? 'border-green-500/30 bg-green-500/10 hover:bg-green-500 hover:border-green-500'
                          : 'border-green-200 bg-green-50 hover:bg-green-500 hover:border-green-500'
                      } group`}
                      title="Accept contract"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5 text-green-500 group-hover:text-white" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); onReject(contract.id); }}
                      disabled={isProcessing}
                      className={`w-7 h-7 rounded-md border flex items-center justify-center transition-all ${
                        isDarkMode
                          ? 'border-red-500/30 bg-red-500/10 hover:bg-red-500 hover:border-red-500'
                          : 'border-red-200 bg-red-50 hover:bg-red-500 hover:border-red-500'
                      } group`}
                      title="Reject contract"
                    >
                      <XCircle className="h-3.5 w-3.5 text-red-500 group-hover:text-white" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

// ─── RFQ Tracker Card (expense — themed empty state) ────────────

const RfqTrackerCard: React.FC<{
  isDarkMode: boolean;
  brandColor: string;
}> = ({ isDarkMode, brandColor }) => {
  const navigate = useNavigate();

  return (
    <div className={`rounded-xl border overflow-hidden ${
      isDarkMode ? 'border-gray-700 bg-gray-800/50' : 'border-gray-200 bg-white'
    }`}>
      {/* Header — matches v3 .rfq-header */}
      <div className={`px-4 py-3 flex items-center justify-between border-b ${
        isDarkMode ? 'border-gray-700' : 'border-gray-200'
      }`}>
        <div className="flex items-center gap-2">
          <span className={`text-[11px] uppercase tracking-wider font-bold ${
            isDarkMode ? 'text-gray-400' : 'text-gray-500'
          }`}>
            RFQ Tracker — Active Procurement
          </span>
          <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${
            isDarkMode
              ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
              : 'bg-amber-50 text-amber-600 border-amber-200'
          }`}>
            00
          </span>
        </div>
        <button
          onClick={() => navigate('/contracts?record_type=rfq')}
          className="text-[10px] font-bold hover:underline"
          style={{ color: brandColor }}
        >
          View all RFQs →
        </button>
      </div>

      {/* Empty state body */}
      <div className="py-10 text-center px-6">
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3"
          style={{ backgroundColor: withOpacity(brandColor, 0.1) }}
        >
          <FileText className="h-7 w-7" style={{ color: brandColor }} />
        </div>
        <p className={`text-sm font-semibold mb-1 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
          No Active RFQs
        </p>
        <p className={`text-xs mb-4 max-w-xs mx-auto ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          Create a Request for Quotation to start procurement from vendors
        </p>
        <button
          onClick={() => navigate('/contracts/create')}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-white transition-all"
          style={{ backgroundColor: brandColor }}
        >
          <Plus className="h-3.5 w-3.5" />
          Create Vendor Contract
        </button>
      </div>
    </div>
  );
};

// ─── Event Card (for 2-col grid) ────────────────────────────────

const EventCard: React.FC<{
  event: ContractEvent;
  onStatusChange: (eventId: string, newStatus: ContractEventStatus, version: number) => void;
  onViewContract: (contractId: string) => void;
  isUpdatingStatus: boolean;
  isDarkMode: boolean;
  brandColor: string;
}> = ({ event, onStatusChange, onViewContract, isUpdatingStatus, isDarkMode, brandColor }) => {
  const isService = event.event_type === 'service';
  const statusCfg = getEventStatusConfig(event.status);
  const StatusIcon = statusCfg.icon;
  const transitions = VALID_STATUS_TRANSITIONS[event.status] || [];

  return (
    <div
      className={`p-3 rounded-xl border transition-all cursor-pointer ${
        isDarkMode
          ? 'border-gray-700 bg-gray-800/50 hover:bg-gray-700/50'
          : 'border-gray-200 bg-white hover:bg-gray-50'
      }`}
      onClick={() => onViewContract(event.contract_id)}
    >
      <div className="flex items-start gap-2.5">
        {/* Dot indicator */}
        <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${statusCfg.dotClass}`}
          style={{ boxShadow: event.status === 'overdue' ? '0 0 6px rgba(239,68,68,0.3)' : undefined }}
        />

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className={`text-xs font-bold truncate ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            {event.block_name}
          </p>
          <p className={`text-[10px] truncate mt-0.5 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            {event.contract_title || event.contract_number || 'Contract'}
          </p>
          <div className="flex items-center gap-2 mt-1.5">
            <span className={`text-[10px] flex items-center gap-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
              <Calendar className="w-3 h-3" />
              {formatEventDate(event.scheduled_date)}
            </span>
            {event.amount != null && event.amount > 0 && (
              <span className="text-[10px] font-bold text-amber-500">
                {Number(event.amount).toLocaleString()}
              </span>
            )}
          </div>
        </div>

        {/* Right column: type + status + action */}
        <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
          <div className={`flex items-center gap-1 text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded ${
            isService
              ? isDarkMode ? 'bg-green-500/10 text-green-400' : 'bg-green-50 text-green-600'
              : isDarkMode ? 'bg-amber-500/10 text-amber-400' : 'bg-amber-50 text-amber-600'
          }`}>
            {isService ? <Wrench className="w-3 h-3" /> : <Receipt className="w-3 h-3" />}
            {isService ? 'SVC' : 'BILL'}
          </div>
          <div className="flex items-center gap-1">
            <StatusIcon className="w-3 h-3" style={{ color: statusCfg.color }} />
            <span className="text-[9px] font-semibold" style={{ color: statusCfg.color }}>
              {statusCfg.label}
            </span>
          </div>
          {transitions.length > 0 && (
            <button
              onClick={(e) => { e.stopPropagation(); onStatusChange(event.id, transitions[0] as ContractEventStatus, event.version); }}
              disabled={isUpdatingStatus}
              className="text-[9px] font-semibold px-1.5 py-0.5 rounded transition-all"
              style={{
                backgroundColor: withOpacity(brandColor, isDarkMode ? 0.2 : 0.08),
                color: brandColor,
              }}
            >
              {isUpdatingStatus ? '...' : `→ ${transitions[0]}`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Service Events Section (right side of 2-col) ───────────────

const ServiceEventsSection: React.FC<{
  events: ContractEvent[];
  isLoading: boolean;
  timeFilter: EventTimeFilter;
  typeFilter: EventTypeFilter;
  onTimeFilterChange: (f: EventTimeFilter) => void;
  onTypeFilterChange: (f: EventTypeFilter) => void;
  onStatusChange: (eventId: string, newStatus: ContractEventStatus, version: number) => void;
  isUpdatingStatus: boolean;
  onViewContract: (contractId: string) => void;
  isDarkMode: boolean;
  brandColor: string;
}> = ({
  events, isLoading, timeFilter, typeFilter,
  onTimeFilterChange, onTypeFilterChange,
  onStatusChange, isUpdatingStatus, onViewContract, isDarkMode, brandColor,
}) => {
  const filteredEvents = useMemo(() => {
    if (typeFilter === 'all') return events;
    return events.filter((e) => e.event_type === typeFilter);
  }, [events, typeFilter]);

  return (
    <div className={`rounded-xl border overflow-hidden flex flex-col ${
      isDarkMode ? 'border-gray-700 bg-gray-800/50' : 'border-gray-200 bg-white'
    }`} style={{ minHeight: '320px' }}>
      {/* Header + filters — matches v3 .section-header */}
      <div className={`px-4 py-3 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
        <div className="flex items-center justify-between mb-2">
          <span className={`text-[11px] uppercase tracking-wider font-bold ${
            isDarkMode ? 'text-gray-400' : 'text-gray-500'
          }`}>
            Service Events
          </span>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
            isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'
          }`}>
            {filteredEvents.length}
          </span>
        </div>
        <div className="flex items-center gap-0.5">
          {(['today', 'week', 'month'] as EventTimeFilter[]).map((f) => (
            <FilterPill key={f} label={f === 'today' ? 'Today' : f === 'week' ? 'This Week' : 'This Month'}
              isActive={timeFilter === f} onClick={() => onTimeFilterChange(f)} isDarkMode={isDarkMode} />
          ))}
          <div className={`w-px h-4 mx-1 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'}`} />
          {(['all', 'service', 'billing'] as EventTypeFilter[]).map((f) => (
            <FilterPill key={f} label={f === 'all' ? 'All' : f === 'service' ? 'Deliverables' : 'Invoices'}
              isActive={typeFilter === f} onClick={() => onTypeFilterChange(f)} isDarkMode={isDarkMode} />
          ))}
        </div>
      </div>

      {/* Body — 2-col event cards grid */}
      <div className="flex-1 overflow-y-auto p-3">
        {isLoading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-5 w-5 animate-spin" style={{ color: brandColor }} />
            <span className={`ml-2 text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Loading events...</span>
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="text-center py-10">
            <Calendar className={`h-8 w-8 mx-auto mb-2 ${isDarkMode ? 'text-gray-600' : 'text-gray-300'}`} />
            <p className={`text-xs font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>No events</p>
            <p className={`text-[10px] ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
              No {typeFilter !== 'all' ? typeFilter : ''} events for this period
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {filteredEvents.slice(0, 6).map((event) => (
              <EventCard
                key={event.id}
                event={event}
                onStatusChange={onStatusChange}
                onViewContract={onViewContract}
                isUpdatingStatus={isUpdatingStatus}
                isDarkMode={isDarkMode}
                brandColor={brandColor}
              />
            ))}
          </div>
        )}
        {filteredEvents.length > 6 && (
          <p className={`text-center text-[10px] pt-2 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
            +{filteredEvents.length - 6} more events
          </p>
        )}
      </div>
    </div>
  );
};

// ─── Action Queue Card ──────────────────────────────────────────

const ActionQueueCard: React.FC<{
  draftContracts: Contract[];
  overdueEvents: ContractEvent[];
  pendingContracts: Contract[];
  isLoading: boolean;
  onViewContract: (id: string) => void;
  queueFilter: QueueFilter;
  onQueueFilterChange: (f: QueueFilter) => void;
  isDarkMode: boolean;
}> = ({
  draftContracts, overdueEvents, pendingContracts,
  isLoading, onViewContract, queueFilter, onQueueFilterChange, isDarkMode,
}) => {
  const queueItems = useMemo(() => {
    const items: Array<{
      id: string; type: 'draft' | 'urgent' | 'pending';
      title: string; subtitle: string; date: string;
      color: string; icon: any; contractId: string;
    }> = [];

    draftContracts.forEach((c) => items.push({
      id: `draft-${c.id}`, type: 'draft', title: c.title,
      subtitle: `Draft · ${c.contract_number}`, date: c.updated_at,
      color: '#6B7280', icon: Edit3, contractId: c.id,
    }));

    overdueEvents.forEach((e) => items.push({
      id: `urgent-${e.id}`, type: 'urgent', title: e.block_name,
      subtitle: `Overdue · ${e.contract_title || e.contract_id}`, date: e.scheduled_date,
      color: '#EF4444', icon: AlertTriangle, contractId: e.contract_id,
    }));

    pendingContracts.forEach((c) => items.push({
      id: `pending-${c.id}`, type: 'pending', title: c.title,
      subtitle: `Pending Review · ${c.contract_number}`, date: c.updated_at,
      color: '#F59E0B', icon: Clock, contractId: c.id,
    }));

    return items;
  }, [draftContracts, overdueEvents, pendingContracts]);

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
    <div className={`rounded-xl border overflow-hidden ${
      isDarkMode ? 'border-gray-700 bg-gray-800/50' : 'border-gray-200 bg-white'
    }`}>
      {/* Header */}
      <div className={`px-4 py-3 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
        <div className="flex items-center justify-between mb-2">
          <span className={`text-[11px] uppercase tracking-wider font-bold ${
            isDarkMode ? 'text-gray-400' : 'text-gray-500'
          }`}>
            Action Queue
          </span>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
            isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'
          }`}>
            {counts.all}
          </span>
        </div>
        <div className="flex gap-1">
          {(['all', 'drafts', 'urgent', 'pending'] as QueueFilter[]).map((f) => (
            <FilterPill key={f}
              label={f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
              isActive={queueFilter === f}
              onClick={() => onQueueFilterChange(f)}
              isDarkMode={isDarkMode}
              count={counts[f]}
            />
          ))}
        </div>
      </div>

      {/* List */}
      <div className="overflow-y-auto" style={{ maxHeight: '300px' }}>
        {isLoading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
            <span className={`ml-2 text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Loading...</span>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-500" />
            <p className={`text-xs font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Queue clear</p>
            <p className={`text-[10px] ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>No actions pending</p>
          </div>
        ) : (
          filteredItems.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.id}
                className={`flex items-center gap-3 px-4 py-3 border-b transition-colors cursor-pointer ${
                  isDarkMode
                    ? 'border-gray-700/50 hover:bg-gray-700/30'
                    : 'border-gray-100 hover:bg-gray-50'
                }`}
                onClick={() => onViewContract(item.contractId)}
              >
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-bold truncate ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    {item.title}
                  </p>
                  <p className={`text-[10px] truncate ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    {item.subtitle}
                  </p>
                </div>
                <span className={`text-[10px] flex-shrink-0 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                  {formatEventDate(item.date)}
                </span>
                <ChevronRight className={`h-3 w-3 flex-shrink-0 ${isDarkMode ? 'text-gray-600' : 'text-gray-300'}`} />
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

// =================================================================
// MAIN PAGE COMPONENT
// =================================================================

const OpsCockpitPage: React.FC = () => {
  const navigate = useNavigate();
  const { isDarkMode, currentTheme } = useTheme();

  // ─── Theme colors ─────────────────────────────────────────────
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;
  const brandColor = colors.brand.primary;

  // Tenant profile — for default perspective
  const { profile, loading: profileLoading } = useTenantContext();

  // Perspective state
  const [perspective, setPerspective] = useState<Perspective | null>(null);

  useEffect(() => {
    if (perspective === null && profile?.business_type_id) {
      setPerspective(profile.business_type_id === 'buyer' ? 'expense' : 'revenue');
    }
  }, [profile?.business_type_id, perspective]);

  const activePerspective: Perspective = perspective || 'revenue';

  // ─── Quick-add contact drawer ───────────────────────────────────
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);

  // ─── Contract wizard ────────────────────────────────────────────
  const [showWizard, setShowWizard] = useState(false);
  const [wizardContractType, setWizardContractType] = useState<ContractType>('client');
  const { currentTenant, isLive } = useAuth();

  // Prefetch contacts for wizard
  useEffect(() => {
    if (!currentTenant?.id) return;
    ['client', 'vendor', 'partner'].forEach((cls) => {
      prefetchContacts(currentTenant.id, isLive, cls);
    });
  }, [currentTenant?.id, isLive]);

  // ─── Perspective-aware contract type filter ─────────────────────
  // Revenue = 'client' (they buy from us → we earn revenue)
  // Expense = 'vendor' (they sell to us → we incur expense)
  const perspectiveType = activePerspective === 'revenue' ? 'client' : 'vendor';

  // D2 filter state
  const [eventTimeFilter, setEventTimeFilter] = useState<EventTimeFilter>('week');
  const [eventTypeFilter, setEventTypeFilter] = useState<EventTypeFilter>('all');
  const [queueFilter, setQueueFilter] = useState<QueueFilter>('all');

  // D1 data hooks — stats endpoint (for footer total + by_contract_type)
  const { data: contractStats, isLoading: statsLoading, isFetching: statsFetching, refetch: refetchStats } = useContractStats();

  // D2 data hooks — ALL filtered by perspectiveType (contract_type = 'client' | 'vendor')
  const { data: pendingAcceptanceData, isLoading: acceptanceLoading } = useContracts({
    contract_type: perspectiveType as any, status: 'pending_acceptance' as any, limit: 10,
  });
  const { data: draftContractsData, isLoading: draftsLoading } = useContracts({
    contract_type: perspectiveType as any, status: 'draft' as any, limit: 10,
  });
  const { data: pendingReviewData, isLoading: pendingLoading } = useContracts({
    contract_type: perspectiveType as any, status: 'pending_review' as any, limit: 10,
  });

  // Broader perspective contracts — used to client-side filter events by perspective
  const { data: perspectiveContractsData } = useContracts({
    contract_type: perspectiveType as any, limit: 200,
  });

  // Event data — service events (time-filtered) + broad events (for schedule bucketing)
  const dateRange = useMemo(() => getDateRange(eventTimeFilter), [eventTimeFilter]);
  const { data: eventsData, isLoading: eventsLoading } = useContractEvents({
    date_from: dateRange.from, date_to: dateRange.to, per_page: 50,
    sort_by: 'scheduled_date', sort_order: 'asc',
  });
  const { data: allEventsData, isLoading: allEventsLoading, refetch: refetchEvents } = useContractEvents({
    per_page: 200, sort_by: 'scheduled_date', sort_order: 'asc',
  });

  // Mutations
  const { sendNotification, isSendingNotification, updateStatus: updateContractStatus, isChangingStatus: isChangingContractStatus } = useContractOperations();
  const { updateStatus: updateEventStatus, isChangingStatus } = useContractEventOperations();

  // Derived
  const isLoading = profileLoading || statsLoading;
  const isRefreshing = statsFetching;

  // Perspective contract IDs — for client-side event filtering
  const perspectiveContractIds = useMemo(() => {
    const items = perspectiveContractsData?.items || [];
    return new Set(items.map((c: Contract) => c.id));
  }, [perspectiveContractsData]);

  // Stats — per-perspective counts from individual queries (NOT aggregate stats endpoint)
  const stats = useMemo(() => ({
    pendingAcceptance: Number(pendingAcceptanceData?.total_count) || 0,
    drafts: Number(draftContractsData?.total_count) || 0,
    total: Number(contractStats?.by_contract_type?.[perspectiveType]) || 0,
  }), [pendingAcceptanceData, draftContractsData, contractStats, perspectiveType]);

  // Event schedule buckets — computed from perspective-filtered events
  const urgency = useMemo(() => {
    const emptyBucket = { count: 0, service_count: 0, billing_count: 0, billing_amount: 0, by_status: {} };
    const allEvents: ContractEvent[] = allEventsData?.items || [];

    // Client-side filter: only events belonging to contracts of the active perspective
    const filtered = perspectiveContractIds.size > 0
      ? allEvents.filter((e) => perspectiveContractIds.has(e.contract_id))
      : allEvents;

    if (filtered.length === 0) {
      return {
        overdue: emptyBucket, today: emptyBucket, tomorrow: emptyBucket,
        this_week: emptyBucket, next_week: emptyBucket, later: emptyBucket,
        totals: { total_events: 0, total_billing_amount: 0 },
      };
    }

    // Date boundaries for bucketing
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrowStart = new Date(todayStart);
    tomorrowStart.setDate(tomorrowStart.getDate() + 1);
    const dayAfterTomorrow = new Date(todayStart);
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);
    const endOfWeek = new Date(todayStart);
    endOfWeek.setDate(endOfWeek.getDate() + (7 - endOfWeek.getDay()));
    const endOfNextWeek = new Date(endOfWeek);
    endOfNextWeek.setDate(endOfNextWeek.getDate() + 7);

    // Classify each event into a bucket
    const bk: Record<string, ContractEvent[]> = {
      overdue: [], today: [], tomorrow: [], this_week: [], next_week: [], later: [],
    };
    for (const ev of filtered) {
      if (ev.status === 'overdue') { bk.overdue.push(ev); continue; }
      const d = new Date(ev.scheduled_date);
      if (d < todayStart) bk.overdue.push(ev);
      else if (d < tomorrowStart) bk.today.push(ev);
      else if (d < dayAfterTomorrow) bk.tomorrow.push(ev);
      else if (d <= endOfWeek) bk.this_week.push(ev);
      else if (d <= endOfNextWeek) bk.next_week.push(ev);
      else bk.later.push(ev);
    }

    const summarize = (events: ContractEvent[]) => ({
      count: events.length,
      service_count: events.filter((e) => e.event_type === 'service').length,
      billing_count: events.filter((e) => e.event_type === 'billing').length,
      billing_amount: events.filter((e) => e.event_type === 'billing').reduce((s, e) => s + (Number(e.amount) || 0), 0),
      by_status: {},
    });

    return {
      overdue: summarize(bk.overdue), today: summarize(bk.today),
      tomorrow: summarize(bk.tomorrow), this_week: summarize(bk.this_week),
      next_week: summarize(bk.next_week), later: summarize(bk.later),
      totals: {
        total_events: filtered.length,
        total_billing_amount: filtered.filter((e) => e.event_type === 'billing').reduce((s, e) => s + (Number(e.amount) || 0), 0),
      },
    };
  }, [allEventsData, perspectiveContractIds]);

  // Contract lists — already perspective-filtered from useContracts
  const pendingAcceptanceContracts = useMemo(() => pendingAcceptanceData?.items || [], [pendingAcceptanceData]);
  const draftContracts = useMemo(() => draftContractsData?.items || [], [draftContractsData]);
  const pendingReviewContracts = useMemo(() => pendingReviewData?.items || [], [pendingReviewData]);

  // Service events — client-side filtered by perspective contract IDs
  const serviceEvents = useMemo(() => {
    const items = eventsData?.items || [];
    if (perspectiveContractIds.size === 0) return items;
    return items.filter((e) => perspectiveContractIds.has(e.contract_id));
  }, [eventsData, perspectiveContractIds]);

  // Overdue events — from broad query, filtered by perspective
  const overdueEvents = useMemo(() => {
    const items = (allEventsData?.items || []).filter((e) => e.status === 'overdue');
    if (perspectiveContractIds.size === 0) return items;
    return items.filter((e) => perspectiveContractIds.has(e.contract_id));
  }, [allEventsData, perspectiveContractIds]);

  // Handlers
  const handleRefresh = useCallback(() => { refetchStats(); refetchEvents(); }, [refetchStats, refetchEvents]);
  const handleViewContract = useCallback((id: string) => { navigate(`/contracts/${id}`); }, [navigate]);
  const handleResendNotification = useCallback(async (contractId: string) => {
    try { await sendNotification({ contractId }); } catch { /* toast handled */ }
  }, [sendNotification]);
  const handleEventStatusChange = useCallback(async (eventId: string, newStatus: ContractEventStatus, version: number) => {
    try { await updateEventStatus({ eventId, newStatus, version }); } catch { /* toast handled */ }
  }, [updateEventStatus]);
  const handleAcceptContract = useCallback(async (contractId: string) => {
    try { await updateContractStatus({ contractId, statusData: { status: 'active' as any } }); } catch { /* toast handled */ }
  }, [updateContractStatus]);
  const handleRejectContract = useCallback(async (contractId: string) => {
    try { await updateContractStatus({ contractId, statusData: { status: 'cancelled' as any } }); } catch { /* toast handled */ }
  }, [updateContractStatus]);

  // CTAs — open wizard / drawer instead of navigating
  const revenueCTAs = [
    { label: 'New Contract', icon: Plus, action: () => { setWizardContractType('client'); setShowWizard(true); } },
    { label: 'Add Client', icon: Users, action: () => setIsQuickAddOpen(true) },
  ];
  const expenseCTAs = [
    { label: 'New RFQ', icon: Plus, action: () => { setWizardContractType('vendor'); setShowWizard(true); } },
    { label: 'Claim CNAK', icon: ShieldCheck, action: () => navigate('/contracts/claim') },
  ];
  const activeCTAs = activePerspective === 'revenue' ? revenueCTAs : expenseCTAs;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <VaNiLoader size="md" message="Loading Operations Cockpit..." showSkeleton skeletonVariant="card" skeletonCount={4} />
      </div>
    );
  }

  return (
    <div
      className="min-h-screen p-6 transition-colors"
      style={{ backgroundColor: colors.utility.primaryBackground }}
    >
      {/* ═══════ HEADER ═══════ */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg" style={{ backgroundColor: withOpacity(brandColor, 0.1) }}>
            <Gauge className="h-5 w-5" style={{ color: brandColor }} />
          </div>
          <div>
            <h1 style={{ color: colors.utility.primaryText }} className="text-xl font-bold">
              Operations Cockpit
            </h1>
            <p style={{ color: colors.utility.secondaryText }} className="text-xs">
              {activePerspective === 'revenue'
                ? 'Revenue operations — what needs your attention today'
                : 'Expense operations — procurement & vendor management'}
            </p>
          </div>
          {/* Perspective switcher — inline beside heading */}
          <PerspectiveSwitcher
            active={activePerspective}
            onChange={(p) => setPerspective(p)}
            isDarkMode={isDarkMode}
            brandColor={brandColor}
          />
        </div>

        {/* CTAs — right side, contacts-style buttons */}
        <div className="flex items-center gap-2">
          {activeCTAs.map((cta) => {
            const Icon = cta.icon;
            return (
              <button
                key={cta.label}
                onClick={cta.action}
                className="flex items-center gap-1.5 px-5 py-2 rounded-full hover:scale-105 transition-transform text-xs font-bold shadow-lg"
                style={{
                  backgroundColor: brandColor,
                  color: '#ffffff',
                  boxShadow: `0 10px 25px -5px ${brandColor}40`,
                }}
              >
                <Icon className="h-3.5 w-3.5" />
                {cta.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ═══════ MAIN GRID: Content + VaNi Sidebar (VaNi starts at stat level) ═══════ */}
      <div className="grid gap-6" style={{ gridTemplateColumns: '1fr 300px' }}>
        {/* Left: Main Content */}
        <div className="space-y-6">

          {/* ═══ ROW 1: STAT CARDS (3 cards) ═══ */}
          <div className="grid grid-cols-3 gap-4">
            <StatCard label="Pending Acceptance" value={stats.pendingAcceptance} icon={Send} iconColor="#F59E0B" size="sm" />
            <StatCard label="Drafts" value={stats.drafts} icon={FileText} iconColor="#6B7280" size="sm" />
            <StatCard label="Overdue Events" value={urgency.overdue.count} icon={AlertTriangle}
              iconColor={urgency.overdue.count > 0 ? '#EF4444' : '#6B7280'} size="sm" />
          </div>

          {/* ═══ ROW 2: Awaiting Acceptance (revenue) — per v3 HTML ═══ */}
          {activePerspective === 'revenue' && (
            <AwaitingAcceptanceCard
              contracts={pendingAcceptanceContracts}
              isLoading={acceptanceLoading}
              onView={handleViewContract}
              onResend={handleResendNotification}
              isSending={isSendingNotification}
              isDarkMode={isDarkMode}
              brandColor={brandColor}
            />
          )}

          {/* ═══ ROW 2: CNAK Verification (expense) — per v3 HTML ═══ */}
          {activePerspective === 'expense' && (
            <CnakVerificationCard
              contracts={pendingAcceptanceContracts}
              isLoading={acceptanceLoading}
              onView={handleViewContract}
              onAccept={handleAcceptContract}
              onReject={handleRejectContract}
              isProcessing={isChangingContractStatus}
              isDarkMode={isDarkMode}
              brandColor={brandColor}
            />
          )}

          {/* ═══ ROW 3: RFQ Tracker (expense) — themed empty state ═══ */}
          {activePerspective === 'expense' && (
            <RfqTrackerCard isDarkMode={isDarkMode} brandColor={brandColor} />
          )}

          {/* ═══ ROW 3: Event Schedule (left 35%) + Service Events (right 65%) ═══ */}
          <div className="grid gap-4" style={{ gridTemplateColumns: '35% 65%' }}>
            {/* Left: Event urgency buckets (stacked vertically) */}
            <div className={`rounded-xl border p-4 ${
              isDarkMode ? 'border-gray-700 bg-gray-800/50' : 'border-gray-200 bg-white'
            }`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" style={{ color: brandColor }} />
                  <span className={`text-[11px] uppercase tracking-wider font-bold ${
                    isDarkMode ? 'text-gray-400' : 'text-gray-500'
                  }`}>
                    Event Schedule
                  </span>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                  isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'
                }`}>
                  {urgency.totals.total_events}
                </span>
              </div>
              <div className="space-y-2">
                <BucketCard title="Overdue" count={urgency.overdue.count}
                  serviceCount={urgency.overdue.service_count} billingCount={urgency.overdue.billing_count}
                  color="#EF4444" isDarkMode={isDarkMode} isHighlighted={urgency.overdue.count > 0} />
                <BucketCard title="Today" count={urgency.today.count}
                  serviceCount={urgency.today.service_count} billingCount={urgency.today.billing_count}
                  color="#3B82F6" isDarkMode={isDarkMode} isHighlighted={urgency.today.count > 0} />
                <BucketCard title="Tomorrow" count={urgency.tomorrow.count}
                  serviceCount={urgency.tomorrow.service_count} billingCount={urgency.tomorrow.billing_count}
                  color="#8B5CF6" isDarkMode={isDarkMode} />
                <BucketCard title="This Week" count={urgency.this_week.count}
                  serviceCount={urgency.this_week.service_count} billingCount={urgency.this_week.billing_count}
                  color="#06B6D4" isDarkMode={isDarkMode} />
                <BucketCard title="Next Week" count={urgency.next_week.count}
                  serviceCount={urgency.next_week.service_count} billingCount={urgency.next_week.billing_count}
                  color="#F59E0B" isDarkMode={isDarkMode} />
                <BucketCard title="Later" count={urgency.later.count}
                  serviceCount={urgency.later.service_count} billingCount={urgency.later.billing_count}
                  color="#6B7280" isDarkMode={isDarkMode} />
              </div>
            </div>

            {/* Right: Service Events (2-col card grid) */}
            <ServiceEventsSection
              events={serviceEvents}
              isLoading={eventsLoading}
              timeFilter={eventTimeFilter}
              typeFilter={eventTypeFilter}
              onTimeFilterChange={setEventTimeFilter}
              onTypeFilterChange={setEventTypeFilter}
              onStatusChange={handleEventStatusChange}
              isUpdatingStatus={isChangingStatus}
              onViewContract={handleViewContract}
              isDarkMode={isDarkMode}
              brandColor={brandColor}
            />
          </div>

          {/* ═══ ROW 4: Action Queue (both perspectives) ═══ */}
          <ActionQueueCard
            draftContracts={draftContracts}
            overdueEvents={overdueEvents}
            pendingContracts={pendingReviewContracts}
            isLoading={draftsLoading || allEventsLoading || pendingLoading}
            onViewContract={handleViewContract}
            queueFilter={queueFilter}
            onQueueFilterChange={setQueueFilter}
            isDarkMode={isDarkMode}
          />
        </div>

        {/* Right: VaNi Sidebar */}
        <VaNiSidebar isDarkMode={isDarkMode} />
      </div>

      {/* ═══════ FOOTER ═══════ */}
      <FooterStatusBar
        totalContracts={stats.total}
        totalEvents={urgency.totals.total_events}
        isRefreshing={isRefreshing}
        onRefresh={handleRefresh}
        isDarkMode={isDarkMode}
        brandColor={brandColor}
      />

      {/* ═══════ MODALS / DRAWERS ═══════ */}
      <QuickAddContactDrawer
        isOpen={isQuickAddOpen}
        onClose={() => setIsQuickAddOpen(false)}
      />

      <ContractWizard
        isOpen={showWizard}
        onClose={() => setShowWizard(false)}
        contractType={wizardContractType}
        onComplete={() => {
          setShowWizard(false);
          handleRefresh();
        }}
      />
    </div>
  );
};

export default OpsCockpitPage;
