// src/components/contracts/EvidenceTab.tsx
// Contract Evidence Tab — shows all service evidence across the contract
// Grouped by ticket, filterable by type, expandable evidence items
// Wired to real API via useContractEvidence + useServiceTicketsForContract
// R4: Added optional `role` prop — buyer sees simplified labels, no internal assignee info

import React, { useState, useMemo } from 'react';
import {
  Camera,
  Shield,
  FileText,
  Image,
  Upload,
  Wrench,
  CheckCircle2,
  ChevronDown,
  Clock,
  Ticket,
  User,
  CalendarDays,
  Eye,
  Filter,
  Loader2,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import {
  useContractEvidence,
  useServiceTicketsForContract,
} from '@/hooks/queries/useServiceExecution';
import type { ServiceEvidence, ServiceTicket } from '@/hooks/queries/useServiceExecution';
import type { ContractRole } from '@/hooks/useContractRole';

// ═══════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════

export interface EvidenceTabProps {
  contractId: string;
  currency: string;
  colors: any;
  /** Optional role — when 'buyer', hides internal details (assignee, internal notes) */
  role?: ContractRole;
}

interface TicketEvidenceGroup {
  ticketId: string;
  ticketNumber: string;
  date: string;
  assignedTo: string;
  status: string;
  evidence: ServiceEvidence[];
}

// ═══════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const formatDate = (dateStr: string): string => {
  const d = new Date(dateStr);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
};

const formatTime = (dateStr: string): string => {
  const d = new Date(dateStr);
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
};

const EVIDENCE_ICON_MAP: Record<string, { icon: React.ElementType; color: string }> = {
  'upload-form': { icon: Image, color: '#06B6D4' },
  'otp': { icon: Shield, color: '#10B981' },
  'service-form': { icon: Wrench, color: '#8B5CF6' },
};

type EvidenceFilter = 'all' | 'upload-form' | 'otp' | 'service-form';

// ═══════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════

const EvidenceTab: React.FC<EvidenceTabProps> = ({ contractId, currency, colors, role }) => {
  const [filter, setFilter] = useState<EvidenceFilter>('all');
  const [expandedTickets, setExpandedTickets] = useState<Set<string>>(new Set());

  const isBuyerView = role === 'buyer';

  // Fetch real evidence and tickets for this contract
  const { data: evidenceData, isLoading: loadingEvidence, error, refetch } = useContractEvidence(contractId);
  const { data: ticketsData, isLoading: loadingTickets } = useServiceTicketsForContract(contractId);

  const isLoading = loadingEvidence || loadingTickets;

  // Group evidence by ticket
  const ticketGroups: TicketEvidenceGroup[] = useMemo(() => {
    if (!evidenceData?.items) return [];

    // Build ticket lookup
    const ticketMap: Record<string, ServiceTicket> = {};
    (ticketsData?.items || []).forEach((t: ServiceTicket) => {
      ticketMap[t.id] = t;
    });

    // Group evidence by ticket_id
    const byTicket: Record<string, ServiceEvidence[]> = {};
    evidenceData.items.forEach((ev: ServiceEvidence) => {
      const key = ev.ticket_id || 'unlinked';
      if (!byTicket[key]) byTicket[key] = [];
      byTicket[key].push(ev);
    });

    // Build groups
    return Object.entries(byTicket).map(([ticketId, items]) => {
      const ticket = ticketMap[ticketId];
      return {
        ticketId,
        ticketNumber: ticket?.ticket_number || (ticketId === 'unlinked' ? 'Unlinked Evidence' : ticketId.slice(0, 8)),
        date: ticket?.completed_at || ticket?.created_at || items[0]?.created_at || '',
        assignedTo: ticket?.assigned_to_name || 'Unknown',
        status: ticket?.status || 'unknown',
        evidence: items.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()),
      };
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [evidenceData, ticketsData]);

  // Summary stats
  const allEvidence = ticketGroups.flatMap(g => g.evidence);
  const totalEvidence = allEvidence.length;
  const verifiedCount = allEvidence.filter(e => e.status === 'verified').length;
  const uploadFormCount = allEvidence.filter(e => e.evidence_type === 'upload-form').length;
  const otpCount = allEvidence.filter(e => e.evidence_type === 'otp').length;
  const serviceFormCount = allEvidence.filter(e => e.evidence_type === 'service-form').length;

  const toggleTicket = (ticketId: string) => {
    setExpandedTickets(prev => {
      const next = new Set(prev);
      if (next.has(ticketId)) next.delete(ticketId);
      else next.add(ticketId);
      return next;
    });
  };

  const filters: { key: EvidenceFilter; label: string; count: number }[] = [
    { key: 'all', label: 'All', count: totalEvidence },
    { key: 'upload-form', label: isBuyerView ? 'Photos & Files' : 'Uploads', count: uploadFormCount },
    { key: 'otp', label: 'Verifications', count: otpCount },
    { key: 'service-form', label: isBuyerView ? 'Reports' : 'Forms', count: serviceFormCount },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: colors.brand.primary }} />
          <p className="text-sm" style={{ color: colors.utility.secondaryText }}>Loading evidence...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <AlertTriangle className="w-12 h-12" style={{ color: colors.semantic.error }} />
        <h3 className="text-lg font-semibold" style={{ color: colors.utility.primaryText }}>Failed to load evidence</h3>
        <p className="text-sm" style={{ color: colors.utility.secondaryText }}>
          {error instanceof Error ? error.message : 'An error occurred'}
        </p>
        <button
          onClick={() => refetch()}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors hover:opacity-80"
          style={{ backgroundColor: colors.brand.primary, color: '#ffffff' }}
        >
          <RefreshCw className="w-4 h-4" /> Try Again
        </button>
      </div>
    );
  }

  if (ticketGroups.length === 0 || totalEvidence === 0) {
    return (
      <div className="rounded-xl border p-12 text-center" style={{ backgroundColor: colors.utility.secondaryBackground, borderColor: `${colors.utility.primaryText}15` }}>
        <Camera className="h-14 w-14 mx-auto mb-4" style={{ color: `${colors.utility.secondaryText}60` }} />
        <h3 className="text-lg font-semibold mb-2" style={{ color: colors.utility.primaryText }}>
          {isBuyerView ? 'No Proof of Work Yet' : 'No Evidence Yet'}
        </h3>
        <p className="text-sm" style={{ color: colors.utility.secondaryText }}>
          {isBuyerView
            ? 'Photos, documents, and verification records from completed services will appear here.'
            : 'Evidence will appear here once service tickets are completed. Photos, documents, and verification records will be organized by ticket.'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* ─── Summary Strip ─── */}
      <div
        className="rounded-xl border px-5 py-4 flex items-center gap-6 flex-wrap"
        style={{ backgroundColor: colors.utility.secondaryBackground, borderColor: `${colors.utility.primaryText}10` }}
      >
        <div className="flex items-center gap-2">
          <Camera className="w-4 h-4" style={{ color: colors.brand.primary }} />
          <span className="text-xs font-bold" style={{ color: colors.utility.primaryText }}>
            {totalEvidence} {isBuyerView ? 'Proof Items' : 'Evidence Items'}
          </span>
        </div>
        <div className="h-4 w-px" style={{ backgroundColor: `${colors.utility.primaryText}12` }} />
        <div className="flex items-center gap-2">
          <Ticket className="w-3.5 h-3.5" style={{ color: colors.semantic?.success || '#10B981' }} />
          <span className="text-[10px]" style={{ color: colors.utility.secondaryText }}>
            {ticketGroups.length} {isBuyerView ? 'service' : 'ticket'}{ticketGroups.length !== 1 ? 's' : ''}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-3.5 h-3.5" style={{ color: colors.semantic?.success || '#10B981' }} />
          <span className="text-[10px]" style={{ color: colors.utility.secondaryText }}>
            {verifiedCount}/{totalEvidence} verified
          </span>
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-1">
          <span className="text-[10px] font-semibold mr-1" style={{ color: colors.utility.secondaryText }}>
            {totalEvidence > 0 ? Math.round((verifiedCount / totalEvidence) * 100) : 0}% coverage
          </span>
          <div className="w-20 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: `${colors.utility.primaryText}10` }}>
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${totalEvidence > 0 ? Math.round((verifiedCount / totalEvidence) * 100) : 0}%`,
                backgroundColor: colors.semantic?.success || '#10B981',
              }}
            />
          </div>
        </div>
      </div>

      {/* ─── Filter Bar ─── */}
      <div className="flex items-center gap-2">
        <Filter className="w-3.5 h-3.5" style={{ color: colors.utility.secondaryText }} />
        {filters.map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-all"
            style={{
              backgroundColor: filter === f.key ? `${colors.brand.primary}15` : 'transparent',
              color: filter === f.key ? colors.brand.primary : colors.utility.secondaryText,
              border: `1px solid ${filter === f.key ? `${colors.brand.primary}30` : `${colors.utility.primaryText}10`}`,
            }}
          >
            {f.label}
            <span className="text-[9px] opacity-70">{f.count}</span>
          </button>
        ))}
      </div>

      {/* ─── Tickets with Evidence ─── */}
      <div className="space-y-4">
        {ticketGroups.map((group) => {
          const isExpanded = expandedTickets.has(group.ticketId);
          const filteredEvidence = filter === 'all'
            ? group.evidence
            : group.evidence.filter(e => e.evidence_type === filter);

          if (filteredEvidence.length === 0) return null;

          return (
            <div
              key={group.ticketId}
              className="rounded-xl border overflow-hidden"
              style={{
                backgroundColor: colors.utility.secondaryBackground,
                borderColor: `${colors.utility.primaryText}10`,
              }}
            >
              {/* Ticket Header */}
              <button
                onClick={() => toggleTicket(group.ticketId)}
                className="w-full px-5 py-4 flex items-center gap-4 text-left hover:opacity-90 transition-opacity"
              >
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: `${colors.semantic.success}12` }}
                >
                  <Ticket className="w-4 h-4" style={{ color: colors.semantic.success }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs font-bold" style={{ color: colors.utility.primaryText }}>
                      {isBuyerView ? `Service #${group.ticketNumber}` : group.ticketNumber}
                    </span>
                    <span
                      className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                      style={{ backgroundColor: `${colors.semantic.success}12`, color: colors.semantic.success }}
                    >
                      {filteredEvidence.length} item{filteredEvidence.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-[10px]" style={{ color: colors.utility.secondaryText }}>
                    {group.date && (
                      <span className="flex items-center gap-1">
                        <CalendarDays className="w-3 h-3" />
                        {formatDate(group.date)}
                      </span>
                    )}
                    {/* Hide assignee from buyer — internal info */}
                    {!isBuyerView && (
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {group.assignedTo}
                      </span>
                    )}
                  </div>
                </div>
                <ChevronDown
                  className={`w-4 h-4 transition-transform flex-shrink-0 ${isExpanded ? 'rotate-180' : ''}`}
                  style={{ color: colors.utility.secondaryText }}
                />
              </button>

              {/* Evidence Items */}
              {isExpanded && (
                <div className="px-5 pb-4">
                  <div
                    className="border-t pt-4 space-y-2"
                    style={{ borderColor: `${colors.utility.primaryText}08` }}
                  >
                    {filteredEvidence.map((ev) => {
                      const evType = EVIDENCE_ICON_MAP[ev.evidence_type] || EVIDENCE_ICON_MAP['upload-form'];
                      const EvIcon = evType.icon;
                      const evColor = evType.color;

                      // Buyer-friendly description: no internal names
                      const getDescription = (): string => {
                        if (ev.evidence_type === 'otp') {
                          if (isBuyerView) {
                            return ev.otp_verified ? 'Verified' : 'Pending verification';
                          }
                          return ev.otp_verified ? `Verified by ${ev.otp_verified_by_name || 'Customer'}` : 'Pending verification';
                        }
                        if (ev.evidence_type === 'service-form') {
                          return isBuyerView ? 'Service report' : 'Service form data';
                        }
                        // upload-form
                        if (ev.file_size) {
                          return `${(ev.file_size / 1024 / 1024).toFixed(1)} MB`;
                        }
                        if (!isBuyerView && ev.uploaded_by_name) {
                          return ev.uploaded_by_name;
                        }
                        return '';
                      };

                      return (
                        <div
                          key={ev.id}
                          className="flex items-center gap-3 p-3 rounded-lg border transition-all hover:shadow-sm"
                          style={{
                            backgroundColor: `${colors.utility.primaryText}03`,
                            borderColor: `${colors.utility.primaryText}08`,
                          }}
                        >
                          <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                            style={{ backgroundColor: `${evColor}12` }}
                          >
                            <EvIcon className="w-4 h-4" style={{ color: evColor }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold truncate" style={{ color: colors.utility.primaryText }}>
                              {ev.file_name || ev.block_name || ev.evidence_type.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                            </p>
                            <p className="text-[10px] truncate" style={{ color: colors.utility.secondaryText }}>
                              {getDescription()}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {ev.status === 'verified' ? (
                              <CheckCircle2 className="w-3.5 h-3.5" style={{ color: colors.semantic.success }} />
                            ) : ev.status === 'pending' ? (
                              <Clock className="w-3.5 h-3.5" style={{ color: colors.semantic.warning }} />
                            ) : (
                              <Upload className="w-3.5 h-3.5" style={{ color: colors.brand.primary }} />
                            )}
                            <span className="text-[9px]" style={{ color: colors.utility.secondaryText }}>
                              {formatTime(ev.created_at)}
                            </span>
                            <button
                              className="p-1 rounded hover:opacity-70 transition-opacity"
                              title="View"
                            >
                              <Eye className="w-3 h-3" style={{ color: colors.brand.primary }} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default EvidenceTab;
