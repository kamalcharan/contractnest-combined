// src/components/contracts/EventCard.tsx
// Shared Event Card — used in Timeline, Cockpit, and anywhere events are displayed
// variant="full" (default) for detail pages, variant="compact" for grids/dashboards

import React, { useState } from 'react';
import {
  CalendarDays,
  Wrench,
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  PlayCircle,
  Loader2,
  Receipt,
  ChevronDown,
  ChevronUp,
  Package,
} from 'lucide-react';
import { getCurrencySymbol } from '@/utils/constants/currencies';
import type { ContractEvent, ContractEventStatus } from '@/types/contractEvents';
import type { EventStatusDefinition } from '@/types/eventStatusConfig';

// ─── Helpers ───

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const formatEventDate = (dateStr: string): string => {
  const d = new Date(dateStr);
  return `${d.getDate()}-${MONTHS[d.getMonth()]}-${d.getFullYear()}`;
};

const formatCurrency = (amount: number | null, currency: string): string => {
  if (amount == null) return '—';
  const sym = getCurrencySymbol(currency);
  return `${sym}${amount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
};

// Icon mapping for status icon_name from DB
const STATUS_ICON_MAP: Record<string, any> = {
  Clock,
  CalendarDays,
  UserCheck: CalendarDays,
  PlayCircle,
  PauseCircle: Clock,
  Eye: Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
};

// Fallback transitions when DB data hasn't loaded yet
const FALLBACK_TRANSITIONS: Record<string, string[]> = {
  scheduled: ['in_progress'],
  in_progress: ['completed'],
  overdue: ['in_progress'],
};

/**
 * Get status display config from dynamic DB-driven status definitions.
 * Falls back to hardcoded values when DB data is unavailable.
 */
const getStatusConfig = (
  status: ContractEventStatus,
  colors: any,
  statusDefs?: EventStatusDefinition[]
) => {
  // Look up from dynamic status definitions
  const def = statusDefs?.find(s => s.status_code === status);
  if (def) {
    const hexColor = def.hex_color || colors.utility.secondaryText;
    return {
      label: def.display_name,
      icon: (def.icon_name && STATUS_ICON_MAP[def.icon_name]) || Clock,
      bg: `${hexColor}12`,
      color: hexColor,
    };
  }

  // Fallback for statuses not in DB
  switch (status) {
    case 'overdue':
      return { label: 'Overdue', icon: AlertTriangle, bg: '#EF444412', color: '#EF4444' };
    case 'scheduled':
      return { label: 'Scheduled', icon: CalendarDays, bg: '#3B82F612', color: '#3B82F6' };
    case 'in_progress':
      return { label: 'In Progress', icon: PlayCircle, bg: '#8B5CF612', color: '#8B5CF6' };
    case 'completed':
      return { label: 'Completed', icon: CheckCircle2, bg: '#10B98112', color: '#10B981' };
    case 'cancelled':
      return { label: 'Cancelled', icon: XCircle, bg: '#9CA3AF12', color: '#9CA3AF' };
    default:
      return {
        label: status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
        icon: Clock,
        bg: `${colors.utility.secondaryText}12`,
        color: colors.utility.secondaryText,
      };
  }
};

// ─── Types ───

export interface EventCardProps {
  event: ContractEvent;
  currency?: string;
  colors: any;
  onStatusChange: (eventId: string, newStatus: ContractEventStatus, version: number) => void;
  /** @deprecated Use updatingEventId instead for per-card loading */
  isUpdating?: boolean;
  /** The event ID currently being status-changed (only that card shows spinner) */
  updatingEventId?: string | null;
  hideActions?: boolean;
  statusDefs?: EventStatusDefinition[];
  allowedTransitions?: string[];
  /** 'full' for detail pages (Timeline), 'compact' for grids (Cockpit) */
  variant?: 'full' | 'compact';
  /** Click handler for navigating to the contract (compact variant) */
  onViewContract?: (contractId: string) => void;
}

// ─── Component ───

export const EventCard: React.FC<EventCardProps> = ({
  event,
  currency = 'INR',
  colors,
  onStatusChange,
  isUpdating: isUpdatingLegacy,
  updatingEventId,
  hideActions,
  statusDefs,
  allowedTransitions,
  variant = 'full',
  onViewContract,
}) => {
  const [showActions, setShowActions] = useState(false);
  const isService = event.event_type === 'service';
  const isSparePart = event.event_type === 'spare_part';
  const isCompact = variant === 'compact';

  // Per-card updating: only THIS card shows spinner
  const isThisUpdating = updatingEventId
    ? updatingEventId === event.id
    : (isUpdatingLegacy ?? false);

  const accent = isSparePart
    ? (colors.semantic?.info || '#3B82F6')
    : isService ? (colors.semantic?.success || '#10B981') : (colors.semantic?.warning || '#F59E0B');

  const statusConfig = getStatusConfig(event.status, colors, statusDefs);
  const StatusIcon = statusConfig.icon;

  // Resolve transitions: DB-driven → fallback
  const resolvedTransitions = (allowedTransitions && allowedTransitions.length > 0)
    ? allowedTransitions
    : (FALLBACK_TRANSITIONS[event.status] || []);
  const hasActions = !hideActions && resolvedTransitions.length > 0;

  // Type icon
  const TypeIcon = isSparePart ? Package : isService ? Wrench : Receipt;
  const typeLabel = isService ? 'Service Delivery' : isSparePart ? 'Spare Part' : (event.billing_cycle_label || 'Billing');

  const handleCardClick = () => {
    if (onViewContract) {
      onViewContract(event.contract_id);
    }
  };

  // ─── COMPACT VARIANT (Cockpit grids) ───
  if (isCompact) {
    return (
      <div
        className="rounded-xl border shadow-sm hover:shadow-md transition-all"
        style={{
          borderColor: `${accent}20`,
          backgroundColor: colors.utility.secondaryBackground,
          borderLeft: `3px solid ${accent}`,
          cursor: onViewContract ? 'pointer' : undefined,
        }}
        onClick={handleCardClick}
      >
        <div className="p-3">
          {/* Header: Icon + Name */}
          <div className="flex items-center gap-2.5 mb-2">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: `linear-gradient(135deg, ${accent}20, ${accent}08)` }}
            >
              <TypeIcon className="w-4 h-4" style={{ color: accent }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold truncate" style={{ color: colors.utility.primaryText }}>
                {event.block_name}
              </p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <p className="text-[10px] truncate" style={{ color: colors.utility.secondaryText }}>
                  {event.contract_title || event.contract_number || typeLabel}
                </p>
                {event.coverage_type_name && (
                  <span
                    className="text-[9px] px-1.5 py-0.5 rounded font-medium flex-shrink-0"
                    style={{
                      backgroundColor: `${accent}10`,
                      color: accent,
                    }}
                  >
                    {event.coverage_type_name}
                  </span>
                )}
              </div>
            </div>
            {event.total_occurrences > 1 && (
              <span
                className="text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: `${accent}12`, color: accent }}
              >
                {event.sequence_number}/{event.total_occurrences}
              </span>
            )}
          </div>

          {/* Date + Amount + Status Row */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-[10px] flex items-center gap-1 flex-shrink-0" style={{ color: colors.utility.secondaryText }}>
                <CalendarDays className="w-3 h-3" />
                {formatEventDate(event.scheduled_date)}
              </span>
              {event.amount != null && event.amount > 0 && (
                <span className="text-[10px] font-bold truncate" style={{ color: colors.semantic?.warning || '#F59E0B' }}>
                  {formatCurrency(event.amount, event.currency || currency)}
                </span>
              )}
            </div>

            {/* Status badge — clickable to expand transitions */}
            <button
              onClick={(e) => { e.stopPropagation(); hasActions && setShowActions(!showActions); }}
              disabled={!hasActions || isThisUpdating}
              className={`flex items-center gap-1 text-[9px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full transition-all flex-shrink-0 ${
                hasActions ? 'cursor-pointer hover:opacity-80' : 'cursor-default'
              }`}
              style={{ backgroundColor: statusConfig.bg, color: statusConfig.color }}
            >
              {isThisUpdating ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <StatusIcon className="w-3 h-3" />
              )}
              {statusConfig.label}
              {hasActions && !isThisUpdating && (
                showActions ? <ChevronUp className="w-2.5 h-2.5" /> : <ChevronDown className="w-2.5 h-2.5" />
              )}
            </button>
          </div>

          {/* Status Actions Dropdown */}
          {showActions && hasActions && (
            <div
              className="mt-2 pt-2 border-t flex flex-wrap gap-1.5"
              style={{ borderColor: `${colors.utility.primaryText}10` }}
            >
              <span className="text-[9px] mr-1 self-center" style={{ color: colors.utility.secondaryText }}>
                Change to:
              </span>
              {resolvedTransitions.map((newStatus) => {
                const config = getStatusConfig(newStatus as ContractEventStatus, colors, statusDefs);
                const Icon = config.icon;
                return (
                  <button
                    key={newStatus}
                    onClick={(e) => {
                      e.stopPropagation();
                      onStatusChange(event.id, newStatus as ContractEventStatus, event.version);
                      setShowActions(false);
                    }}
                    className="flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-semibold transition-all hover:opacity-80"
                    style={{ backgroundColor: config.bg, color: config.color }}
                  >
                    <Icon className="w-2.5 h-2.5" />
                    {config.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ─── FULL VARIANT (Timeline detail pages) ───
  return (
    <div
      className="rounded-xl border shadow-sm hover:shadow-md transition-all"
      style={{
        borderColor: `${accent}20`,
        backgroundColor: colors.utility.secondaryBackground,
        borderLeft: `4px solid ${accent}`,
      }}
    >
      <div className="p-4">
        {/* Header: Icon + Name + Sequence */}
        <div className="flex items-center gap-3 mb-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: `linear-gradient(135deg, ${accent}20, ${accent}08)` }}
          >
            <TypeIcon className="w-5 h-5" style={{ color: accent }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold truncate" style={{ color: colors.utility.primaryText }}>
              {event.block_name}
            </p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <p className="text-xs" style={{ color: colors.utility.secondaryText }}>
                {typeLabel}
              </p>
              {event.coverage_type_name && (
                <span
                  className="text-[10px] px-1.5 py-0.5 rounded font-medium flex-shrink-0"
                  style={{
                    backgroundColor: `${accent}10`,
                    color: accent,
                  }}
                >
                  {event.coverage_type_name}
                </span>
              )}
            </div>
          </div>
          {event.total_occurrences > 1 && (
            <span
              className="text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: `${accent}12`, color: accent }}
            >
              {event.sequence_number}/{event.total_occurrences}
            </span>
          )}
        </div>

        {/* Amount (billing events) */}
        {event.amount != null && event.amount > 0 && (
          <div
            className="mb-3 px-3 py-2 rounded-lg"
            style={{ backgroundColor: `${colors.semantic?.warning || '#F59E0B'}08` }}
          >
            <span className="text-sm font-bold" style={{ color: colors.utility.primaryText }}>
              {formatCurrency(event.amount, event.currency || currency)}
            </span>
          </div>
        )}

        {/* Date + Status Row */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CalendarDays className="w-4 h-4" style={{ color: colors.brand?.secondary || accent }} />
            <span className="text-xs font-medium" style={{ color: colors.utility.primaryText }}>
              {formatEventDate(event.scheduled_date)}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Status badge with dropdown trigger */}
            <button
              onClick={() => hasActions && setShowActions(!showActions)}
              disabled={!hasActions || isThisUpdating}
              className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full transition-all ${
                hasActions ? 'cursor-pointer hover:opacity-80' : 'cursor-default'
              }`}
              style={{ backgroundColor: statusConfig.bg, color: statusConfig.color }}
            >
              {isThisUpdating ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <StatusIcon className="w-3 h-3" />
              )}
              {statusConfig.label}
              {hasActions && !isThisUpdating && (
                showActions ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
              )}
            </button>
          </div>
        </div>

        {/* Status Actions Dropdown */}
        {showActions && hasActions && (
          <div
            className="mt-3 pt-3 border-t flex flex-wrap gap-2"
            style={{ borderColor: `${colors.utility.primaryText}10` }}
          >
            <span className="text-[10px] mr-2" style={{ color: colors.utility.secondaryText }}>
              Change to:
            </span>
            {resolvedTransitions.map((newStatus) => {
              const config = getStatusConfig(newStatus as ContractEventStatus, colors, statusDefs);
              const Icon = config.icon;
              return (
                <button
                  key={newStatus}
                  onClick={() => {
                    onStatusChange(event.id, newStatus as ContractEventStatus, event.version);
                    setShowActions(false);
                  }}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold transition-all hover:opacity-80"
                  style={{ backgroundColor: config.bg, color: config.color }}
                >
                  <Icon className="w-3 h-3" />
                  {config.label}
                </button>
              );
            })}
          </div>
        )}

        {/* Notes */}
        {event.notes && (
          <div
            className="mt-3 pt-3 border-t text-xs"
            style={{
              borderColor: `${colors.utility.primaryText}10`,
              color: colors.utility.secondaryText,
            }}
          >
            {event.notes}
          </div>
        )}
      </div>
    </div>
  );
};

export default EventCard;
