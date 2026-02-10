// src/components/contracts/ServiceExecutionDrawer.tsx
// Redesigned Service Execution Drawer — 2-column layout
// Left: Event cards with inline status, add events, notes
// Right: Evidence section driven by contract evidence policy
// Responsive: 2-col on desktop, single-col stacked on mobile

import React, { useState, useCallback, useMemo } from 'react';
import {
  X,
  Play,
  Wrench,
  Package,
  DollarSign,
  ChevronDown,
  Plus,
  Loader2,
  User,
  AlertTriangle,
  ClipboardList,
  Upload,
  ShieldOff,
  FileText,
  Ticket,
  Search,
  Zap,
} from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import {
  useContractEventOperations,
} from '@/hooks/queries/useContractEventQueries';
import {
  useCreateServiceTicket,
} from '@/hooks/queries/useServiceExecution';
import { useContactsForResourceDropdown } from '@/hooks/queries/useContactsResource';
import type {
  ContractEvent,
  ContractEventStatus,
} from '@/types/contractEvents';
import type { EventStatusDefinition } from '@/types/eventStatusConfig';

// ═══════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════

export type EvidencePolicyType = 'none' | 'upload' | 'smart_form';

export interface ServiceExecutionDrawerProps {
  isOpen: boolean;
  contractId: string;
  date: string;
  events: ContractEvent[];
  allContractEvents?: ContractEvent[];
  currency: string;
  evidencePolicyType?: EvidencePolicyType;
  statusDefsByType?: Record<string, EventStatusDefinition[]>;
  transitionsByType?: Record<string, Record<string, string[]>>;
  onClose: () => void;
}

// ═══════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const formatDate = (dateStr: string): string => {
  const d = new Date(dateStr);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
};

const EVENT_TYPE_CONFIG: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  service: { icon: Wrench, color: '#8B5CF6', label: 'Service' },
  spare_part: { icon: Package, color: '#06B6D4', label: 'Spare Part' },
  billing: { icon: DollarSign, color: '#F59E0B', label: 'Billing' },
};

const FALLBACK_TRANSITIONS: Record<string, string[]> = {
  scheduled: ['in_progress'],
  in_progress: ['completed'],
  overdue: ['in_progress'],
};

// ═══════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════

const ServiceExecutionDrawer: React.FC<ServiceExecutionDrawerProps> = ({
  isOpen,
  contractId,
  date,
  events: initialEvents,
  allContractEvents = [],
  currency,
  evidencePolicyType = 'none',
  statusDefsByType = {},
  transitionsByType = {},
  onClose,
}) => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  // ─── State ───
  const [drawerEvents, setDrawerEvents] = useState<ContractEvent[]>(initialEvents);
  const [notes, setNotes] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [assigneeName, setAssigneeName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAddFromContract, setShowAddFromContract] = useState(false);
  const [showAddNew, setShowAddNew] = useState(false);
  const [statusDropdownId, setStatusDropdownId] = useState<string | null>(null);
  const [teamSearch, setTeamSearch] = useState('');

  // ─── Hooks ───
  const { options: teamMembers, isLoading: loadingTeam, error: teamError } = useContactsForResourceDropdown(teamSearch || undefined);
  const createTicket = useCreateServiceTicket();
  const { updateStatus, changingStatusEventId } = useContractEventOperations();

  // ─── Derived ───
  const deliverables = useMemo(
    () => drawerEvents.filter((e) => e.event_type === 'service' || e.event_type === 'spare_part'),
    [drawerEvents]
  );
  const billingEvents = useMemo(
    () => drawerEvents.filter((e) => e.event_type === 'billing'),
    [drawerEvents]
  );

  // Unconsumed contract events (not in this drawer already)
  const unconsumedEvents = useMemo(() => {
    const drawerIds = new Set(drawerEvents.map((e) => e.id));
    return allContractEvents.filter(
      (e) =>
        !drawerIds.has(e.id) &&
        e.status !== 'completed' &&
        e.status !== 'cancelled' &&
        (e.event_type === 'service' || e.event_type === 'spare_part')
    );
  }, [allContractEvents, drawerEvents]);

  // Filtered team members
  const filteredTeam = useMemo(() => {
    if (!teamSearch) return teamMembers;
    const q = teamSearch.toLowerCase();
    return teamMembers.filter(
      (m) => m.label.toLowerCase().includes(q) || (m.email && m.email.toLowerCase().includes(q))
    );
  }, [teamMembers, teamSearch]);

  // ─── Handlers ───
  const handleStatusChange = useCallback(
    async (eventId: string, newStatus: ContractEventStatus, version: number) => {
      try {
        await updateStatus({ eventId, newStatus, version });
        // Update local state
        setDrawerEvents((prev) =>
          prev.map((e) =>
            e.id === eventId ? { ...e, status: newStatus, version: e.version + 1 } : e
          )
        );
      } catch {
        // Error handled in hook with toast
      }
      setStatusDropdownId(null);
    },
    [updateStatus]
  );

  const handleAddFromContract = useCallback(
    (event: ContractEvent) => {
      setDrawerEvents((prev) => [...prev, event]);
      setShowAddFromContract(false);
    },
    []
  );

  const handleRemoveEvent = useCallback((eventId: string) => {
    setDrawerEvents((prev) => prev.filter((e) => e.id !== eventId));
  }, []);

  const handleSelectTeamMember = useCallback(
    (value: string, label: string) => {
      setAssigneeId(value);
      setAssigneeName(label);
      setTeamSearch('');
    },
    []
  );

  const handleCreateTicket = useCallback(async () => {
    setIsSubmitting(true);
    try {
      await createTicket.mutateAsync({
        contract_id: contractId,
        event_ids: drawerEvents.map((e) => e.id),
        assigned_to_id: assigneeId || undefined,
        assigned_to_name: assigneeName || undefined,
        notes: notes || undefined,
      });
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  }, [createTicket, contractId, drawerEvents, assigneeId, assigneeName, notes, onClose]);

  // Get available transitions for an event using props or fallback
  const getTransitions = (event: ContractEvent): string[] => {
    const typeTransitions = transitionsByType[event.event_type];
    if (typeTransitions && typeTransitions[event.status]) {
      return typeTransitions[event.status];
    }
    return FALLBACK_TRANSITIONS[event.status] || [];
  };

  const getStatusConfig = (status: string, eventType?: string) => {
    // Use status defs from props if available
    const defs = eventType ? statusDefsByType[eventType] : [];
    const def = defs?.find((s) => s.status_key === status);
    if (def) {
      return { label: def.display_name, color: def.color || '#6B7280', icon: def.icon };
    }
    const fallback: Record<string, { label: string; color: string }> = {
      scheduled: { label: 'Scheduled', color: '#3B82F6' },
      in_progress: { label: 'In Progress', color: '#F59E0B' },
      completed: { label: 'Completed', color: '#10B981' },
      cancelled: { label: 'Cancelled', color: '#EF4444' },
      overdue: { label: 'Overdue', color: '#EF4444' },
    };
    return fallback[status] || { label: status, color: '#6B7280' };
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 transition-opacity"
        style={{ backgroundColor: 'rgba(0,0,0,0.35)' }}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className="fixed top-0 right-0 bottom-0 z-50 w-full md:w-[700px] lg:w-[900px] shadow-2xl border-l flex flex-col animate-slide-in-right"
        style={{
          backgroundColor: colors.utility.mainBackground,
          borderColor: `${colors.utility.primaryText}15`,
        }}
      >
        {/* ═══ HEADER ═══ */}
        <div
          className="flex-shrink-0 px-5 py-4 border-b flex items-center gap-4"
          style={{
            backgroundColor: colors.utility.secondaryBackground,
            borderColor: `${colors.utility.primaryText}10`,
          }}
        >
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: `linear-gradient(135deg, ${colors.brand.primary}20, ${colors.brand.primary}08)` }}
          >
            <Play className="w-5 h-5" style={{ color: colors.brand.primary }} />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-bold" style={{ color: colors.utility.primaryText }}>
              Service Execution
            </h2>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[10px]" style={{ color: colors.utility.secondaryText }}>
                {formatDate(date)}
              </span>
              <span
                className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full"
                style={{ backgroundColor: `${colors.brand.primary}10`, color: colors.brand.primary }}
              >
                {drawerEvents.length} event{drawerEvents.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>

          {/* Team Member Selector */}
          <div className="relative flex-shrink-0">
            <button
              onClick={() => setShowAddNew((prev) => !prev)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium transition-all hover:shadow-sm"
              style={{
                backgroundColor: assigneeId ? `${colors.brand.primary}08` : colors.utility.secondaryBackground,
                borderColor: assigneeId ? `${colors.brand.primary}30` : `${colors.utility.primaryText}15`,
                color: assigneeId ? colors.brand.primary : colors.utility.secondaryText,
              }}
            >
              <User className="w-3.5 h-3.5" />
              {assigneeName || 'Assign'}
              <ChevronDown className="w-3 h-3" />
            </button>

            {showAddNew && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowAddNew(false)} />
                <div
                  className="absolute right-0 top-full mt-1 w-72 rounded-xl border shadow-xl z-20 overflow-hidden"
                  style={{
                    backgroundColor: colors.utility.secondaryBackground,
                    borderColor: `${colors.utility.primaryText}15`,
                  }}
                >
                  {/* Search */}
                  <div
                    className="px-3 py-2 border-b flex items-center gap-2"
                    style={{ borderColor: `${colors.utility.primaryText}08` }}
                  >
                    <Search className="w-3.5 h-3.5" style={{ color: colors.utility.secondaryText }} />
                    <input
                      type="text"
                      value={teamSearch}
                      onChange={(e) => setTeamSearch(e.target.value)}
                      placeholder="Search team members..."
                      autoFocus
                      className="flex-1 text-xs bg-transparent outline-none"
                      style={{ color: colors.utility.primaryText }}
                    />
                  </div>
                  <div className="max-h-48 overflow-y-auto">
                    {loadingTeam ? (
                      <div className="flex items-center justify-center py-6">
                        <Loader2 className="w-4 h-4 animate-spin" style={{ color: colors.brand.primary }} />
                      </div>
                    ) : teamError ? (
                      <p className="text-xs text-center py-4" style={{ color: colors.semantic.error }}>
                        Failed to load team members
                      </p>
                    ) : filteredTeam.length === 0 ? (
                      <p className="text-xs text-center py-4" style={{ color: colors.utility.secondaryText }}>
                        No team members found
                      </p>
                    ) : (
                      filteredTeam.map((member) => (
                        <button
                          key={member.value}
                          onClick={() => {
                            handleSelectTeamMember(member.value, member.label);
                            setShowAddNew(false);
                          }}
                          className="w-full px-3 py-2.5 text-left flex items-center gap-3 transition-opacity hover:opacity-80"
                          style={{
                            borderBottom: `1px solid ${colors.utility.primaryText}06`,
                            backgroundColor: member.value === assigneeId ? `${colors.brand.primary}06` : 'transparent',
                          }}
                        >
                          <div
                            className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold"
                            style={{ backgroundColor: `${colors.brand.primary}12`, color: colors.brand.primary }}
                          >
                            {member.label.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium truncate" style={{ color: colors.utility.primaryText }}>
                              {member.label}
                            </p>
                            {member.subLabel && (
                              <p className="text-[10px] truncate" style={{ color: colors.utility.secondaryText }}>
                                {member.subLabel}
                              </p>
                            )}
                          </div>
                          {member.value === assigneeId && (
                            <div className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center">
                              <span className="text-white text-[8px]">✓</span>
                            </div>
                          )}
                        </button>
                      ))
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:opacity-70 transition-opacity flex-shrink-0"
            style={{ color: colors.utility.secondaryText }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ═══ BODY — 2-Column ═══ */}
        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-0 h-full">

            {/* ══════ LEFT COLUMN: Events + Notes ══════ */}
            <div
              className="p-5 space-y-5 md:border-r md:overflow-y-auto"
              style={{ borderColor: `${colors.utility.primaryText}08` }}
            >
              {/* ─── Service Events ─── */}
              <div>
                <h3
                  className="text-[10px] font-bold uppercase tracking-wider mb-3"
                  style={{ color: colors.utility.secondaryText }}
                >
                  Service Events ({deliverables.length})
                </h3>
                <div className="space-y-2">
                  {deliverables.map((event) => {
                    const typeConf = EVENT_TYPE_CONFIG[event.event_type] || EVENT_TYPE_CONFIG.service;
                    const TypeIcon = typeConf.icon;
                    const statusConf = getStatusConfig(event.status, event.event_type);
                    const transitions = getTransitions(event);
                    const isUpdating = changingStatusEventId === event.id;
                    const isDropdownOpen = statusDropdownId === event.id;

                    return (
                      <div
                        key={event.id}
                        className="rounded-lg border p-3 transition-all"
                        style={{
                          backgroundColor: colors.utility.secondaryBackground,
                          borderColor: `${colors.utility.primaryText}10`,
                        }}
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                            style={{ backgroundColor: `${typeConf.color}12` }}
                          >
                            <TypeIcon className="w-4 h-4" style={{ color: typeConf.color }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold truncate" style={{ color: colors.utility.primaryText }}>
                              {event.block_name}
                            </p>
                            <p className="text-[10px]" style={{ color: colors.utility.secondaryText }}>
                              {typeConf.label}
                              {event.sequence_number > 0 && ` #${event.sequence_number}/${event.total_occurrences}`}
                            </p>
                          </div>

                          {/* Status dropdown */}
                          <div className="relative flex-shrink-0">
                            <button
                              onClick={() => setStatusDropdownId(isDropdownOpen ? null : event.id)}
                              disabled={isUpdating || transitions.length === 0}
                              className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-semibold transition-all disabled:opacity-60"
                              style={{
                                backgroundColor: `${statusConf.color}12`,
                                color: statusConf.color,
                                border: `1px solid ${statusConf.color}25`,
                              }}
                            >
                              {isUpdating ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <>
                                  {statusConf.label}
                                  {transitions.length > 0 && <ChevronDown className="w-3 h-3" />}
                                </>
                              )}
                            </button>

                            {isDropdownOpen && transitions.length > 0 && (
                              <>
                                <div className="fixed inset-0 z-10" onClick={() => setStatusDropdownId(null)} />
                                <div
                                  className="absolute right-0 top-full mt-1 rounded-lg border shadow-lg z-20 py-1 min-w-[140px]"
                                  style={{
                                    backgroundColor: colors.utility.secondaryBackground,
                                    borderColor: `${colors.utility.primaryText}15`,
                                  }}
                                >
                                  <p className="px-3 py-1 text-[9px] font-semibold uppercase tracking-wider" style={{ color: colors.utility.secondaryText }}>
                                    Change to
                                  </p>
                                  {transitions.map((t) => {
                                    const tConf = getStatusConfig(t, event.event_type);
                                    return (
                                      <button
                                        key={t}
                                        onClick={() => handleStatusChange(event.id, t as ContractEventStatus, event.version)}
                                        className="w-full px-3 py-2 text-left text-xs font-medium flex items-center gap-2 hover:opacity-80 transition-opacity"
                                      >
                                        <div
                                          className="w-2 h-2 rounded-full"
                                          style={{ backgroundColor: tConf.color }}
                                        />
                                        <span style={{ color: colors.utility.primaryText }}>{tConf.label}</span>
                                      </button>
                                    );
                                  })}
                                </div>
                              </>
                            )}
                          </div>

                          {/* Remove button — only for added events not originally in the group */}
                          {!initialEvents.some((ie) => ie.id === event.id) && (
                            <button
                              onClick={() => handleRemoveEvent(event.id)}
                              className="p-1 rounded hover:opacity-70 transition-opacity flex-shrink-0"
                              title="Remove"
                            >
                              <X className="w-3 h-3" style={{ color: colors.semantic.error }} />
                            </button>
                          )}
                        </div>

                        {/* Beyond scope warning */}
                        {event.contract_id !== contractId && (
                          <div
                            className="mt-2 px-2 py-1 rounded text-[9px] font-semibold flex items-center gap-1"
                            style={{ backgroundColor: `${colors.semantic.warning}10`, color: colors.semantic.warning }}
                          >
                            <AlertTriangle className="w-3 h-3" />
                            Beyond contract scope — chargeable
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {deliverables.length === 0 && (
                    <div
                      className="rounded-lg border-2 border-dashed p-6 text-center"
                      style={{ borderColor: `${colors.utility.primaryText}10` }}
                    >
                      <Wrench className="w-6 h-6 mx-auto mb-2" style={{ color: `${colors.utility.secondaryText}40` }} />
                      <p className="text-[10px]" style={{ color: colors.utility.secondaryText }}>
                        No service events — add from contract or create new
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* ─── Billing Events ─── */}
              {billingEvents.length > 0 && (
                <div>
                  <h3
                    className="text-[10px] font-bold uppercase tracking-wider mb-3"
                    style={{ color: colors.utility.secondaryText }}
                  >
                    Billing ({billingEvents.length})
                  </h3>
                  <div className="space-y-2">
                    {billingEvents.map((event) => (
                      <div
                        key={event.id}
                        className="flex items-center gap-3 p-3 rounded-lg border"
                        style={{
                          backgroundColor: colors.utility.secondaryBackground,
                          borderColor: `${colors.utility.primaryText}10`,
                        }}
                      >
                        <DollarSign className="w-4 h-4 flex-shrink-0" style={{ color: '#F59E0B' }} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold truncate" style={{ color: colors.utility.primaryText }}>
                            {event.block_name}
                          </p>
                          <p className="text-[10px]" style={{ color: colors.utility.secondaryText }}>
                            {event.billing_cycle_label || 'Billing'}
                          </p>
                        </div>
                        {event.amount != null && (
                          <span className="text-xs font-bold" style={{ color: '#F59E0B' }}>
                            {currency} {event.amount.toLocaleString()}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ─── Add Events Actions ─── */}
              <div>
                <h3
                  className="text-[10px] font-bold uppercase tracking-wider mb-3"
                  style={{ color: colors.utility.secondaryText }}
                >
                  Add Events
                </h3>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <button
                      onClick={() => {
                        setShowAddFromContract(!showAddFromContract);
                        setShowAddNew(false);
                      }}
                      disabled={unconsumedEvents.length === 0}
                      className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border text-xs font-medium transition-all hover:shadow-sm disabled:opacity-40"
                      style={{
                        borderColor: `${colors.brand.primary}25`,
                        color: colors.brand.primary,
                        backgroundColor: `${colors.brand.primary}04`,
                      }}
                    >
                      <Plus className="w-3.5 h-3.5" />
                      From Contract
                      {unconsumedEvents.length > 0 && (
                        <span
                          className="text-[9px] px-1 py-0.5 rounded-full"
                          style={{ backgroundColor: `${colors.brand.primary}15` }}
                        >
                          {unconsumedEvents.length}
                        </span>
                      )}
                    </button>

                    {/* Unconsumed events dropdown */}
                    {showAddFromContract && unconsumedEvents.length > 0 && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setShowAddFromContract(false)} />
                        <div
                          className="absolute left-0 bottom-full mb-1 w-72 rounded-xl border shadow-xl z-20 py-1 max-h-52 overflow-y-auto"
                          style={{
                            backgroundColor: colors.utility.secondaryBackground,
                            borderColor: `${colors.utility.primaryText}15`,
                          }}
                        >
                          {unconsumedEvents.map((event) => {
                            const tc = EVENT_TYPE_CONFIG[event.event_type] || EVENT_TYPE_CONFIG.service;
                            const TIcon = tc.icon;
                            return (
                              <button
                                key={event.id}
                                onClick={() => handleAddFromContract(event)}
                                className="w-full px-3 py-2.5 text-left flex items-center gap-3 transition-opacity hover:opacity-80"
                                style={{ borderBottom: `1px solid ${colors.utility.primaryText}06` }}
                              >
                                <TIcon className="w-4 h-4 flex-shrink-0" style={{ color: tc.color }} />
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-medium truncate" style={{ color: colors.utility.primaryText }}>
                                    {event.block_name}
                                  </p>
                                  <p className="text-[10px]" style={{ color: colors.utility.secondaryText }}>
                                    {tc.label} #{event.sequence_number} — {formatDate(event.scheduled_date)}
                                  </p>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </div>

                  <button
                    className="flex items-center gap-2 px-3 py-2.5 rounded-lg border text-xs font-medium transition-all hover:shadow-sm"
                    style={{
                      borderColor: `${colors.semantic.warning}25`,
                      color: colors.semantic.warning,
                      backgroundColor: `${colors.semantic.warning}04`,
                    }}
                    title="Add services beyond contract scope"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    Beyond Scope
                  </button>
                </div>
              </div>

              {/* ─── Service Notes ─── */}
              <div>
                <h3
                  className="text-[10px] font-bold uppercase tracking-wider mb-2"
                  style={{ color: colors.utility.secondaryText }}
                >
                  Service Notes
                </h3>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add notes about the service..."
                  rows={3}
                  className="w-full px-3 py-2.5 rounded-lg border text-xs resize-none"
                  style={{
                    backgroundColor: colors.utility.secondaryBackground,
                    borderColor: `${colors.utility.primaryText}15`,
                    color: colors.utility.primaryText,
                  }}
                />
              </div>
            </div>

            {/* ══════ RIGHT COLUMN: Evidence ══════ */}
            <div className="p-5 space-y-5 md:overflow-y-auto">
              <h3
                className="text-[10px] font-bold uppercase tracking-wider"
                style={{ color: colors.utility.secondaryText }}
              >
                Evidence
                <span
                  className="ml-2 text-[9px] font-semibold px-1.5 py-0.5 rounded-full normal-case tracking-normal"
                  style={{
                    backgroundColor:
                      evidencePolicyType === 'smart_form'
                        ? `${colors.brand.primary}12`
                        : evidencePolicyType === 'upload'
                        ? `${colors.semantic.info}12`
                        : `${colors.utility.primaryText}08`,
                    color:
                      evidencePolicyType === 'smart_form'
                        ? colors.brand.primary
                        : evidencePolicyType === 'upload'
                        ? colors.semantic.info
                        : colors.utility.secondaryText,
                  }}
                >
                  {evidencePolicyType === 'smart_form'
                    ? 'Smart Form'
                    : evidencePolicyType === 'upload'
                    ? 'Upload Proof'
                    : 'No Verification'}
                </span>
              </h3>

              {/* ── No Verification ── */}
              {evidencePolicyType === 'none' && (
                <div
                  className="rounded-xl border-2 border-dashed p-8 text-center"
                  style={{ borderColor: `${colors.utility.primaryText}10` }}
                >
                  <ShieldOff
                    className="w-10 h-10 mx-auto mb-3"
                    style={{ color: `${colors.utility.secondaryText}30` }}
                  />
                  <p className="text-sm font-medium" style={{ color: colors.utility.secondaryText }}>
                    No evidence required
                  </p>
                  <p className="text-xs mt-1" style={{ color: `${colors.utility.secondaryText}80` }}>
                    This contract does not require evidence capture during service execution
                  </p>
                </div>
              )}

              {/* ── Upload Proof ── */}
              {evidencePolicyType === 'upload' && (
                <div>
                  <div
                    className="rounded-xl border-2 border-dashed p-8 text-center cursor-pointer transition-all hover:shadow-sm"
                    style={{
                      borderColor: `${colors.brand.primary}25`,
                      backgroundColor: `${colors.brand.primary}03`,
                    }}
                  >
                    <Upload
                      className="w-10 h-10 mx-auto mb-3"
                      style={{ color: `${colors.brand.primary}60` }}
                    />
                    <p className="text-sm font-medium" style={{ color: colors.utility.primaryText }}>
                      Upload Evidence
                    </p>
                    <p className="text-xs mt-1" style={{ color: colors.utility.secondaryText }}>
                      Drop files here or click to browse
                    </p>
                    <p className="text-[10px] mt-2" style={{ color: `${colors.utility.secondaryText}60` }}>
                      Photos, PDFs, documents accepted
                    </p>
                  </div>
                </div>
              )}

              {/* ── Smart Form ── */}
              {evidencePolicyType === 'smart_form' && (
                <div className="space-y-4">
                  <div
                    className="flex items-start gap-3 rounded-lg border p-3"
                    style={{
                      backgroundColor: `${colors.semantic.info || '#3B82F6'}06`,
                      borderColor: `${colors.semantic.info || '#3B82F6'}20`,
                    }}
                  >
                    <ClipboardList className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: colors.semantic.info || '#3B82F6' }} />
                    <p className="text-[11px] leading-relaxed" style={{ color: colors.utility.secondaryText }}>
                      Smart forms configured for this contract will appear here.
                      Complete each form to capture the required evidence.
                    </p>
                  </div>

                  {/* Placeholder for FormRenderer integration */}
                  <div
                    className="rounded-xl border p-5"
                    style={{
                      backgroundColor: colors.utility.secondaryBackground,
                      borderColor: `${colors.utility.primaryText}10`,
                    }}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: `${colors.brand.primary}10` }}
                      >
                        <FileText className="w-4 h-4" style={{ color: colors.brand.primary }} />
                      </div>
                      <div>
                        <p className="text-xs font-semibold" style={{ color: colors.utility.primaryText }}>
                          Service Execution Forms
                        </p>
                        <p className="text-[10px]" style={{ color: colors.utility.secondaryText }}>
                          Forms from contract evidence policy
                        </p>
                      </div>
                    </div>

                    <div
                      className="rounded-lg border-2 border-dashed p-6 text-center"
                      style={{ borderColor: `${colors.utility.primaryText}10` }}
                    >
                      <ClipboardList
                        className="w-8 h-8 mx-auto mb-2"
                        style={{ color: `${colors.utility.secondaryText}30` }}
                      />
                      <p className="text-xs" style={{ color: colors.utility.secondaryText }}>
                        FormRenderer will render here based on contract evidence policy
                      </p>
                      <p className="text-[10px] mt-1" style={{ color: `${colors.utility.secondaryText}60` }}>
                        Integration with FormRenderer pending API wiring
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ═══ FOOTER ═══ */}
        <div
          className="flex-shrink-0 px-5 py-4 border-t flex items-center gap-3"
          style={{
            backgroundColor: colors.utility.secondaryBackground,
            borderColor: `${colors.utility.primaryText}10`,
          }}
        >
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="flex-1 px-4 py-2.5 rounded-lg border text-xs font-semibold transition-opacity hover:opacity-80"
            style={{
              borderColor: `${colors.utility.primaryText}20`,
              color: colors.utility.secondaryText,
              backgroundColor: 'transparent',
            }}
          >
            Cancel
          </button>
          <button
            disabled={isSubmitting || drawerEvents.length === 0}
            onClick={handleCreateTicket}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold transition-opacity hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: colors.brand.primary, color: '#ffffff' }}
          >
            {isSubmitting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Ticket className="w-3.5 h-3.5" />
            )}
            Create Ticket
          </button>
        </div>
      </div>

      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        .animate-slide-in-right {
          animation: slideInRight 0.25s ease-out;
        }
      `}</style>
    </>
  );
};

export default ServiceExecutionDrawer;
